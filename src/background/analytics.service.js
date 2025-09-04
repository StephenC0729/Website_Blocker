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

  // If no matching session found, still credit the day minimally
  const k = dayKey(now);
  const d = ensureDay(analytics, k);
  if (session === 'pomodoro' || session === 'custom') {
    d.sessionsCompleted += 1;
    // If an override is provided but we couldn't find a matching session,
    // still credit focusSeconds to make test/dev flows useful.
    if (typeof actualSec === 'number' && actualSec > 0) {
      d.focusSeconds += Math.floor(actualSec);
    }
  }
  await saveAnalytics(analytics);
  broadcastUpdate();
  return { success: true, note: 'No matching started session found' };
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
