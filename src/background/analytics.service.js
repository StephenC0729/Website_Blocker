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

  // Helper to compute credited focus seconds
  const creditedTime = Math.min(
    (session.plannedSec ?? session.actualSec ?? 0),
    (session.actualSec ?? 0)
  );

  // Adjust daily rollups using the same attribution used when logging
  // - Focus seconds and sessionsCompleted are attributed to the completion day (end)
  // - sessionsStarted is attributed to the start day
  if (session.type === 'pomodoro' || session.type === 'custom') {
    // Decrement sessionsStarted on the start day if we had counted it
    if (session.start) {
      const startDayKey = dayKey(session.start);
      const startDay = analytics.byDay[startDayKey];
      if (startDay) {
        startDay.sessionsStarted = Math.max(0, startDay.sessionsStarted - 1);
      }
    }
  }

  if (session.completed && (session.type === 'pomodoro' || session.type === 'custom')) {
    const completionTs = session.end || session.start;
    const completionDayKey = dayKey(completionTs);
    const completionDay = analytics.byDay[completionDayKey];
    if (completionDay) {
      if (creditedTime > 0) {
        completionDay.focusSeconds = Math.max(0, completionDay.focusSeconds - creditedTime);
      }
      completionDay.sessionsCompleted = Math.max(0, completionDay.sessionsCompleted - 1);
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
    // Apply field updates to session
    if (updates.type && ['pomodoro', 'short-break', 'long-break', 'custom'].includes(updates.type)) {
      session.type = updates.type;
    }
    if (updates.start && typeof updates.start === 'number') {
      session.start = updates.start;
    }
    if (updates.duration && typeof updates.duration === 'number') {
      session.plannedSec = updates.duration;
      if (session.completed) {
        session.actualSec = updates.duration;
        session.end = session.start + (updates.duration * 1000);
      }
    }

    // Determine attribution keys and credits (before and after)
    const wasContrib = originalSession.type === 'pomodoro' || originalSession.type === 'custom';
    const isContrib = session.type === 'pomodoro' || session.type === 'custom';
    const oldStartKey = originalSession.start ? dayKey(originalSession.start) : null;
    const oldCompleteKey = originalSession.completed ? dayKey(originalSession.end || originalSession.start) : null;
    const oldCredit = Math.min(
      (originalSession.plannedSec ?? originalSession.actualSec ?? 0),
      (originalSession.actualSec ?? 0)
    );

    const newStartKey = session.start ? dayKey(session.start) : null;
    const newCompleteKey = session.completed ? dayKey(session.end || session.start) : null;
    const newCredit = Math.min(
      (session.plannedSec ?? session.actualSec ?? 0),
      (session.actualSec ?? 0)
    );

    // Rollback old attribution
    if (wasContrib) {
      if (oldStartKey && analytics.byDay[oldStartKey]) {
        const d = analytics.byDay[oldStartKey];
        d.sessionsStarted = Math.max(0, d.sessionsStarted - 1);
      }
      if (originalSession.completed && oldCompleteKey && analytics.byDay[oldCompleteKey]) {
        const d = analytics.byDay[oldCompleteKey];
        if (oldCredit > 0) d.focusSeconds = Math.max(0, d.focusSeconds - oldCredit);
        d.sessionsCompleted = Math.max(0, d.sessionsCompleted - 1);
      }
    }

    // Apply new attribution
    if (isContrib) {
      if (newStartKey) {
        const d = ensureDay(analytics, newStartKey);
        d.sessionsStarted += 1;
      }
      if (session.completed && newCompleteKey) {
        const d = ensureDay(analytics, newCompleteKey);
        if (newCredit > 0) d.focusSeconds += newCredit;
        d.sessionsCompleted += 1;
      }
    }

    await saveAnalytics(analytics);
    broadcastUpdate();
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to update session: ' + error.message };
  }
}
