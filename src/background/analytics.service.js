// Analytics service: tracks timer sessions, focus time, and block events
import { get, set } from './storage.js';

// Internal helpers
function pad2(n) { return n.toString().padStart(2, '0'); }
function dayKey(ts = Date.now()) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  return `${y}-${m}-${dd}`;
}

async function getAnalytics() {
  try {
    const { analytics } = await get(['analytics']);
    if (analytics && typeof analytics === 'object') return analytics;
    return { sessions: [], byDay: {} };
  } catch {
    return { sessions: [], byDay: {} };
  }
}

async function saveAnalytics(analytics) {
  await set({ analytics });
}

function broadcastUpdate() {
  try {
    chrome.runtime.sendMessage({ action: 'analyticsUpdated' });
  } catch {}
}

function pruneData(analytics) {
  // Keep last 1000 sessions
  if (analytics.sessions.length > 1000) {
    analytics.sessions = analytics.sessions.slice(-1000);
  }
  // Keep byDay up to last 180 days
  const cutoff = Date.now() - 180 * 24 * 60 * 60 * 1000;
  for (const key of Object.keys(analytics.byDay)) {
    const [y, m, d] = key.split('-').map((s) => parseInt(s, 10));
    const ts = new Date(y, m - 1, d).getTime();
    if (ts < cutoff) delete analytics.byDay[key];
  }
}

function ensureDay(analytics, key) {
  if (!analytics.byDay[key]) {
    analytics.byDay[key] = {
      focusSeconds: 0,
      sessionsStarted: 0,
      sessionsCompleted: 0,
      sitesBlocked: 0,
    };
  }
  return analytics.byDay[key];
}

export async function logSiteBlocked(domain) {
  const analytics = await getAnalytics();
  const k = dayKey();
  const d = ensureDay(analytics, k);
  d.sitesBlocked += 1;
  await saveAnalytics(analytics);
  broadcastUpdate();
  return { success: true };
}

export async function logSessionStart({ session, duration }) {
  const analytics = await getAnalytics();
  const now = Date.now();
  const k = dayKey(now);
  if (session === 'pomodoro' || session === 'custom') {
    const d = ensureDay(analytics, k);
    d.sessionsStarted += 1;
  } else {
    ensureDay(analytics, k); // ensure day exists for consistency
  }

  analytics.sessions.push({
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    start: now,
    end: null,
    type: session,
    plannedSec: typeof duration === 'number' ? duration : null,
    actualSec: null,
    completed: false,
  });

  pruneData(analytics);
  await saveAnalytics(analytics);
  broadcastUpdate();
  return { success: true };
}

export async function logSessionComplete({ session, actualSec }) {
  const analytics = await getAnalytics();
  const now = Date.now();

  // Find the most recent incomplete session of the same type
  for (let i = analytics.sessions.length - 1; i >= 0; i--) {
    const s = analytics.sessions[i];
    if (!s.completed && s.type === session) {
      // Allow an override of actual seconds (useful for dev/test flows)
      const actual = typeof actualSec === 'number' && actualSec >= 0
        ? Math.floor(actualSec)
        : Math.max(0, Math.round((now - s.start) / 1000));
      s.end = (typeof actualSec === 'number' && actualSec >= 0)
        ? s.start + actual * 1000
        : now;
      s.actualSec = actual;
      s.completed = true;

      const k = dayKey(now);
      const d = ensureDay(analytics, k);
      if (session === 'pomodoro' || session === 'custom') {
        d.sessionsCompleted += 1;
        const credit = Math.min(s.plannedSec ?? actual, actual);
        d.focusSeconds += credit;
      }

      pruneData(analytics);
      await saveAnalytics(analytics);
      broadcastUpdate();
      return { success: true };
    }
  }

  // If no matching session found, create a completed session entry so history reflects it
  const k = dayKey(now);
  const d = ensureDay(analytics, k);
  const actual = typeof actualSec === 'number' && actualSec >= 0 ? Math.floor(actualSec) : 0;

  analytics.sessions.push({
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    start: actual > 0 ? now - actual * 1000 : now,
    end: now,
    type: session,
    plannedSec: actual > 0 ? actual : null,
    actualSec: actual,
    completed: true,
  });

  if (session === 'pomodoro' || session === 'custom') {
    d.sessionsCompleted += 1;
    if (actual > 0) {
      d.focusSeconds += actual;
    }
  }

  pruneData(analytics);
  await saveAnalytics(analytics);
  broadcastUpdate();
  return { success: true, note: 'No matching started session found; created fallback entry' };
}

export async function getMetrics() {
  const analytics = await getAnalytics();
  const today = dayKey();
  const dToday = ensureDay(analytics, today);

  // Weekly focus (last 7 days including today)
  let weeklyFocusSeconds = 0;
  for (let i = 6; i >= 0; i--) {
    const ts = Date.now() - i * 24 * 60 * 60 * 1000;
    const k = dayKey(ts);
    const d = analytics.byDay[k];
    if (d) weeklyFocusSeconds += d.focusSeconds || 0;
  }

  const started = dToday.sessionsStarted || 0;
  const completed = dToday.sessionsCompleted || 0;
  const completionRate = started === 0 ? 0 : Math.round((completed / started) * 100);

  return {
    success: true,
    todayFocusSeconds: dToday.focusSeconds || 0,
    weeklyFocusSeconds,
    sitesBlockedToday: dToday.sitesBlocked || 0,
    completionRate,
  };
}

export async function getWeeklySeries() {
  const analytics = await getAnalytics();
  const labels = [];
  const data = [];
  for (let i = 6; i >= 0; i--) {
    const ts = Date.now() - i * 24 * 60 * 60 * 1000;
    const d = new Date(ts);
    labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
    const k = dayKey(ts);
    data.push((analytics.byDay[k]?.focusSeconds) || 0);
  }
  return { success: true, labels, data };
}

export async function getSessionHistory({ limit = 20 } = {}) {
  const analytics = await getAnalytics();
  // Use completed sessions, sort by end desc
  const sessions = analytics.sessions
    .filter((s) => s.completed)
    .sort((a, b) => (b.end || 0) - (a.end || 0))
    .slice(0, limit);
  return { success: true, sessions };
}

export async function deleteSession(sessionId) {
  if (!sessionId) {
    return { success: false, error: 'Session ID is required' };
  }

  const analytics = await getAnalytics();
  const sessionIndex = analytics.sessions.findIndex(s => s.id === sessionId);
  
  if (sessionIndex === -1) {
    return { success: false, error: 'Session not found' };
  }

  const session = analytics.sessions[sessionIndex];
  
  // If the session was completed and contributed to daily metrics, subtract from them
  if (session.completed && (session.type === 'pomodoro' || session.type === 'custom')) {
    const sessionDay = dayKey(session.start);
    const dayData = analytics.byDay[sessionDay];
    
    if (dayData) {
      // Subtract the focus time that was credited
      if (session.actualSec && session.plannedSec) {
        const creditedTime = Math.min(session.plannedSec, session.actualSec);
        dayData.focusSeconds = Math.max(0, dayData.focusSeconds - creditedTime);
      } else if (session.actualSec) {
        dayData.focusSeconds = Math.max(0, dayData.focusSeconds - session.actualSec);
      }
      
      // Decrement completed sessions count
      dayData.sessionsCompleted = Math.max(0, dayData.sessionsCompleted - 1);
      
      // If session was started (has a start time), also decrement started count
      if (session.start) {
        dayData.sessionsStarted = Math.max(0, dayData.sessionsStarted - 1);
      }
    }
  }

  // Remove the session from the array
  analytics.sessions.splice(sessionIndex, 1);
  
  await saveAnalytics(analytics);
  broadcastUpdate();
  
  return { success: true };
}

export async function updateSession(sessionId, updates) {
  if (!sessionId) {
    return { success: false, error: 'Session ID is required' };
  }

  if (!updates || typeof updates !== 'object') {
    return { success: false, error: 'Updates object is required' };
  }

  const analytics = await getAnalytics();
  const sessionIndex = analytics.sessions.findIndex(s => s.id === sessionId);
  
  if (sessionIndex === -1) {
    return { success: false, error: 'Session not found' };
  }

  const session = analytics.sessions[sessionIndex];
  const originalSession = { ...session }; // Keep copy for rollback calculation

  // Validate and apply updates
  try {
    // Update session type if provided
    if (updates.type && ['pomodoro', 'short-break', 'long-break', 'custom'].includes(updates.type)) {
      session.type = updates.type;
    }

    // Update start time if provided
    if (updates.start && typeof updates.start === 'number') {
      session.start = updates.start;
    }

    // Update duration if provided (plannedSec and actualSec for completed sessions)
    if (updates.duration && typeof updates.duration === 'number') {
      session.plannedSec = updates.duration;
      if (session.completed) {
        session.actualSec = updates.duration;
        // Recalculate end time based on new start + duration
        session.end = session.start + (updates.duration * 1000);
      }
    }

    // Update daily metrics if the session was completed and contributes to metrics
    if (session.completed && (originalSession.type === 'pomodoro' || originalSession.type === 'custom' || 
                             session.type === 'pomodoro' || session.type === 'custom')) {
      
      const originalDay = dayKey(originalSession.start);
      const newDay = dayKey(session.start);
      
      // Remove old contribution
      if (originalSession.type === 'pomodoro' || originalSession.type === 'custom') {
        const oldDayData = analytics.byDay[originalDay];
        if (oldDayData) {
          const oldCredit = Math.min(originalSession.plannedSec ?? originalSession.actualSec ?? 0, originalSession.actualSec ?? 0);
          oldDayData.focusSeconds = Math.max(0, oldDayData.focusSeconds - oldCredit);
          oldDayData.sessionsCompleted = Math.max(0, oldDayData.sessionsCompleted - 1);
          if (originalSession.start) {
            oldDayData.sessionsStarted = Math.max(0, oldDayData.sessionsStarted - 1);
          }
        }
      }
      
      // Add new contribution
      if (session.type === 'pomodoro' || session.type === 'custom') {
        const newDayData = ensureDay(analytics, newDay);
        const newCredit = Math.min(session.plannedSec ?? session.actualSec ?? 0, session.actualSec ?? 0);
        newDayData.focusSeconds += newCredit;
        newDayData.sessionsCompleted += 1;
        if (session.start) {
          newDayData.sessionsStarted += 1;
        }
      }
    }

    await saveAnalytics(analytics);
    broadcastUpdate();
    
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to update session: ' + error.message };
  }
}
