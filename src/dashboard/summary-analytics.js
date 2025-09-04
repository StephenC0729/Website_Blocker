/**
 * Summary Analytics
 * Renders weekly chart and sessions table for the Summary page
 */
(function () {
  let weeklyChart = null;
  let openMenu = null; // currently open actions menu element

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

  function typeLabel(sessionType) {
    if (sessionType === 'pomodoro') return 'Focus';
    if (sessionType === 'short-break' || sessionType === 'long-break') return 'Break';
    return 'Custom';
  }

  function renderWeeklyChart(series) {
    const canvas = document.getElementById('summaryWeeklyChart');
    if (!canvas) return;
    if (typeof Chart === 'undefined') return;
    const ctx = canvas.getContext('2d');
    if (weeklyChart) {
      weeklyChart.data.labels = series.labels;
      weeklyChart.data.datasets[0].data = series.data.map((s) => Math.round(s / 60));
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

  function closeOpenMenu() {
    if (openMenu) {
      openMenu.classList.add('hidden');
      const btn = openMenu.parentElement.querySelector('.action-menu-btn');
      if (btn) btn.setAttribute('aria-expanded', 'false');
      openMenu = null;
    }
  }

  function renderSessionsTable(sessions) {
    const tbody = document.getElementById('summarySessionsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!sessions || sessions.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = `<td colspan="6" class="px-4 py-6 text-center text-sm text-gray-500">No sessions yet</td>`;
      tbody.appendChild(row);
      return;
    }

    sessions.forEach((s, idx) => {
      const start = new Date(s.start);
      const end = new Date(s.end || s.start);
      const dateStr = start.toLocaleDateString();
      const timeStr = `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      const duration = formatDurationShort(s.actualSec ?? s.plannedSec ?? 0);

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="px-4 py-2 text-sm text-gray-500">${idx + 1}</td>
        <td class="px-4 py-2 text-sm text-gray-700">${dateStr}</td>
        <td class="px-4 py-2 text-sm text-gray-700">${timeStr}</td>
        <td class="px-4 py-2 text-sm text-gray-700">${duration}</td>
        <td class="px-4 py-2 text-sm ${s.type === 'pomodoro' ? 'text-red-600' : 'text-green-600'}">${typeLabel(s.type)}</td>
        <td class="px-4 py-2 text-center relative">
          <button class="action-menu-btn text-gray-400 hover:text-gray-600 p-2 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1" title="Actions" aria-label="Actions" aria-haspopup="true" aria-expanded="false">
            <i class="fas fa-chevron-down"></i>
          </button>
          <div class="action-menu hidden absolute right-0 bottom-full mb-1 w-32 bg-white border border-gray-200 rounded shadow-lg z-50">
            <button class="action-edit w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Edit</button>
            <button class="action-delete w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50">Delete</button>
          </div>
        </td>
      `;

      // Actions menu handlers (UI only)
      const cell = tr.querySelector('td:last-child');
      const btn = cell.querySelector('.action-menu-btn');
      const menu = cell.querySelector('.action-menu');

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        // toggle menu, closing any other open one
        if (openMenu && openMenu !== menu) {
          closeOpenMenu();
        }
        const isHidden = menu.classList.contains('hidden');
        if (isHidden) {
          menu.classList.remove('hidden');
          btn.setAttribute('aria-expanded', 'true');
          openMenu = menu;
        } else {
          menu.classList.add('hidden');
          btn.setAttribute('aria-expanded', 'false');
          openMenu = null;
        }
      });

      // Placeholder handlers for edit/delete (to be implemented later)
      const editBtn = cell.querySelector('.action-edit');
      const deleteBtn = cell.querySelector('.action-delete');
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeOpenMenu();
        alert('Edit dialog coming soon');
      });
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeOpenMenu();
        alert('Delete confirmation coming soon');
      });

      tbody.appendChild(tr);
    });
  }

  async function fetchWeeklySeries() {
    try {
      const res = await sendMessagePromise({ action: 'analyticsGetWeeklySeries' });
      if (res && res.success) return res;
    } catch (e) {
      console.error('summary fetchWeeklySeries error:', e);
    }
    return { success: true, labels: [], data: [] };
  }

  async function fetchSessions(limit = 100) {
    try {
      const res = await sendMessagePromise({ action: 'analyticsGetHistory', limit });
      if (res && res.success) return res.sessions || [];
    } catch (e) {
      console.error('summary fetchSessions error:', e);
    }
    return [];
  }

  async function refreshSummary() {
    const [series, sessions] = await Promise.all([
      fetchWeeklySeries(),
      fetchSessions(100),
    ]);
    renderWeeklyChart(series);
    renderSessionsTable(sessions);
  }

  // Expose setup function
  window.setupSummaryAnalytics = function setupSummaryAnalytics() {
    refreshSummary();
    // Close any open menu on outside click or Escape
    document.addEventListener('click', () => closeOpenMenu());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeOpenMenu();
    });
    chrome.runtime.onMessage.addListener((message) => {
      if (message && (message.action === 'analyticsUpdated' || message.action === 'timerStateUpdated')) {
        refreshSummary();
      }
    });
  };
})();
