/**
 * Dashboard Analytics
 * Fetches analytics from background and updates dashboard UI.
 */

(function () {
  let weeklyChart = null;

  function formatHM(seconds) {
    const s = Math.max(0, Math.floor(seconds || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${h}h ${m}m`;
  }

  function formatDurationShort(seconds) {
    const s = Math.max(0, Math.floor(seconds || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m`;
    return `${s}s`;
  }

  async function fetchMetrics() {
    try {
      const res = await sendMessagePromise({ action: 'analyticsGetMetrics' });
      if (res && res.success) return res;
    } catch (e) {
      console.error('fetchMetrics error:', e);
    }
    return {
      success: true,
      todayFocusSeconds: 0,
      weeklyFocusSeconds: 0,
      sitesBlockedToday: 0,
      completionRate: 0,
    };
  }

  async function fetchWeeklySeries() {
    try {
      const res = await sendMessagePromise({ action: 'analyticsGetWeeklySeries' });
      if (res && res.success) return res;
    } catch (e) {
      console.error('fetchWeeklySeries error:', e);
    }
    return { success: true, labels: [], data: [] };
  }

  async function fetchHistory() {
    try {
      const res = await sendMessagePromise({ action: 'analyticsGetHistory', limit: 8 });
      if (res && res.success) return res.sessions || [];
    } catch (e) {
      console.error('fetchHistory error:', e);
    }
    return [];
  }

  function renderMetricsUI(metrics) {
    const todayEl = document.getElementById('todayFocusTime');
    const weekEl = document.getElementById('weeklyFocusTime');
    const blockedEl = document.getElementById('sitesBlockedToday');
    const completionEl = document.getElementById('completionRate');
    if (todayEl) todayEl.textContent = formatHM(metrics.todayFocusSeconds);
    if (weekEl) weekEl.textContent = formatHM(metrics.weeklyFocusSeconds);
    if (blockedEl) blockedEl.textContent = metrics.sitesBlockedToday || 0;
    if (completionEl) completionEl.textContent = `${metrics.completionRate || 0}%`;
  }

  function renderHistoryUI(sessions) {
    const container = document.getElementById('sessionHistory');
    if (!container) return;
    container.innerHTML = '';
    if (!sessions || sessions.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'text-sm text-gray-500';
      empty.textContent = 'No sessions yet';
      container.appendChild(empty);
      return;
    }
    sessions.forEach((s) => {
      const item = document.createElement('div');
      item.className = 'flex items-center justify-between bg-gray-50 px-3 py-2 rounded';
      const date = new Date(s.end || s.start);
      const when = `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      const typeLabel = s.type === 'pomodoro' ? 'Focus' : (s.type === 'short-break' || s.type === 'long-break') ? 'Break' : 'Custom';
      item.innerHTML = `
        <div class="flex items-center space-x-2">
          <i class="fas ${s.type === 'pomodoro' ? 'fa-fire text-red-500' : 'fa-coffee text-green-600'}"></i>
          <span class="text-sm text-gray-700">${typeLabel}</span>
          <span class="text-xs text-gray-400">${when}</span>
        </div>
        <div class="text-sm text-gray-600">${formatDurationShort(s.actualSec ?? s.plannedSec ?? 0)}</div>
      `;
      container.appendChild(item);
    });
  }

  function renderWeeklyChart(series) {
    const canvas = document.getElementById('weeklyChart');
    if (!canvas) return;
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js not available; skipping chart render.');
      return;
    }
    const ctx = canvas.getContext('2d');
    if (weeklyChart) {
      weeklyChart.data.labels = series.labels;
      weeklyChart.data.datasets[0].data = series.data.map((s) => Math.round(s / 60)); // minutes
      weeklyChart.update();
      return;
    }
    weeklyChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: series.labels,
        datasets: [
          {
            label: 'Focus (minutes)',
            data: series.data.map((s) => Math.round(s / 60)),
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.15)',
            tension: 0.3,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: true } },
        scales: { y: { beginAtZero: true } },
      },
    });
  }

  async function refreshAll() {
    const [metrics, series, history] = await Promise.all([
      fetchMetrics(),
      fetchWeeklySeries(),
      fetchHistory(),
    ]);
    renderMetricsUI(metrics);
    renderWeeklyChart(series);
    renderHistoryUI(history);
  }

  // Expose setup function globally to be called after dashboard content loads
  window.setupDashboardAnalytics = function setupDashboardAnalytics() {
    // Initial load
    refreshAll();

    // Listen for live updates
    chrome.runtime.onMessage.addListener((message) => {
      if (message && (message.action === 'analyticsUpdated' || message.action === 'timerStateUpdated')) {
        // Re-render metrics on analytics changes or timer state changes
        refreshAll();
      }
    });
  };
})();
