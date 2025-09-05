/**
 * Summary Analytics
 * Renders weekly chart and sessions table for the Summary page
 */
(function () {
  let weeklyChart = null;
  let openMenu = null; // currently open actions menu element
  let openMenuBtn = null; // track trigger for a11y and cleanup
  
  // Pagination state
  let allSessions = [];
  let currentPage = 1;
  let sessionsPerPage = 20;
  // Selection state for bulk actions
  const selectedSessionIds = new Set();
  let selectionMode = false;
  
  // Modal state
  let currentSessionToDelete = null;
  let currentSessionToEdit = null;

  function formatDurationShort(seconds) {
    const s = Math.max(0, Math.floor(seconds || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m`;
    return `${s}s`;
  }

  function getCreditedDuration(session) {
    // Use same logic as focus time calculation: Math.min(plannedSec, actualSec)
    const planned = session.plannedSec || 0;
    const actual = session.actualSec || 0;
    if (planned > 0 && actual > 0) {
      return Math.min(planned, actual);
    }
    return actual || planned || 0;
  }

  function typeLabel(sessionType) {
    if (sessionType === 'pomodoro') return 'Focus';
    if (sessionType === 'short-break' || sessionType === 'long-break') return 'Break';
    return 'Custom';
  }

  function getTotalPages() {
    return Math.ceil(allSessions.length / sessionsPerPage);
  }

  function getCurrentPageSessions() {
    const startIndex = (currentPage - 1) * sessionsPerPage;
    const endIndex = startIndex + sessionsPerPage;
    return allSessions.slice(startIndex, endIndex);
  }

  function updatePaginationControls() {
    const totalPages = getTotalPages();
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    const pageDisplay = document.getElementById('currentPageDisplay');

    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
    if (pageDisplay) pageDisplay.textContent = totalPages > 0 ? currentPage : '1';
  }

  function updateBulkControls() {
    const bulkBtn = document.getElementById('bulkDeleteBtn');
    const headerTh = document.getElementById('selectColHeader');
    if (bulkBtn) {
      if (selectionMode) {
        bulkBtn.textContent = 'Delete Selected';
        // Keep enabled in selection mode; action depends on selection size
      } else {
        bulkBtn.textContent = 'Delete';
      }
    }
    if (headerTh) {
      if (selectionMode) headerTh.classList.remove('hidden'); else headerTh.classList.add('hidden');
    }
    updateHeaderSelectCheckbox();
  }

  function updateHeaderSelectCheckbox() {
    const headerCb = document.getElementById('selectAllSessions');
    if (!headerCb) return;
    if (!selectionMode) {
      headerCb.checked = false;
      headerCb.indeterminate = false;
      return;
    }
    const visible = getCurrentPageSessions();
    if (!visible.length) {
      headerCb.checked = false;
      headerCb.indeterminate = false;
      return;
    }
    const selectedCount = visible.reduce((acc, s) => acc + (selectedSessionIds.has(s.id) ? 1 : 0), 0);
    headerCb.checked = selectedCount === visible.length && selectedCount > 0;
    headerCb.indeterminate = selectedCount > 0 && selectedCount < visible.length;
  }

  // Modal management functions
  function showDeleteConfirmation(session) {
    currentSessionToDelete = session;
    const modal = document.getElementById('deleteConfirmModal');
    const dateEl = document.getElementById('deleteSessionDate');
    const timeEl = document.getElementById('deleteSessionTime');
    const durationEl = document.getElementById('deleteSessionDuration');

    if (!modal || !dateEl || !timeEl || !durationEl) return;

    const start = new Date(session.start);
    const end = new Date(session.end || session.start);
    const dateStr = start.toLocaleDateString();
    const timeStr = `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const duration = formatDurationShort(getCreditedDuration(session));

    dateEl.textContent = dateStr;
    timeEl.textContent = `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    durationEl.textContent = duration;

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
  }

  function hideDeleteConfirmation() {
    const modal = document.getElementById('deleteConfirmModal');
    if (modal) {
      modal.classList.add('hidden');
      document.body.style.overflow = ''; // Restore scrolling
    }
    currentSessionToDelete = null;
    
    // Reset button state
    const deleteBtn = document.getElementById('confirmDelete');
    const btnText = document.getElementById('deleteButtonText');
    const spinner = document.getElementById('deleteButtonSpinner');
    if (deleteBtn && btnText && spinner) {
      deleteBtn.disabled = false;
      btnText.textContent = 'Delete';
      spinner.classList.add('hidden');
    }
  }

  async function confirmDelete() {
    if (!currentSessionToDelete) return;

    const deleteBtn = document.getElementById('confirmDelete');
    const btnText = document.getElementById('deleteButtonText');
    const spinner = document.getElementById('deleteButtonSpinner');

    if (!deleteBtn || !btnText || !spinner) return;

    // Show loading state
    deleteBtn.disabled = true;
    btnText.textContent = 'Deleting...';
    spinner.classList.remove('hidden');

    try {
      const result = await sendMessagePromise({
        action: 'analyticsDeleteSession',
        sessionId: currentSessionToDelete.id
      });

      if (result && result.success) {
        // Remove session from local array
        allSessions = allSessions.filter(s => s.id !== currentSessionToDelete.id);
        // Remove from selection if selected
        selectedSessionIds.delete(currentSessionToDelete.id);
        
        // Check if current page is now empty and adjust if needed
        const totalPages = getTotalPages();
        if (currentPage > totalPages && totalPages > 0) {
          currentPage = totalPages;
        } else if (totalPages === 0) {
          currentPage = 1;
        }
        
        // Re-render the table
        renderSessionsTable();
        
        // Hide modal
        hideDeleteConfirmation();
        
        // Immediate UI refresh for chart/series as a fallback to broadcast timing
        try { await refreshSummary(); } catch (_) {}

        // Show success message (could be enhanced with a toast notification)
        console.log('Session deleted successfully');
      } else {
        throw new Error(result?.error || 'Failed to delete session');
      }
    } catch (error) {
      console.error('Delete session error:', error);
      alert('Failed to delete session. Please try again.');
      
      // Reset button state on error
      deleteBtn.disabled = false;
      btnText.textContent = 'Delete';
      spinner.classList.add('hidden');
    }
  }

  // Bulk delete modal helpers
  function showBulkDeleteModal() {
    const count = selectedSessionIds.size;
    if (count === 0) return;
    const modal = document.getElementById('bulkDeleteConfirmModal');
    const summary = document.getElementById('bulkDeleteSummary');
    if (!modal || !summary) return;
    summary.textContent = `Are you sure you want to delete ${count} selected session${count === 1 ? '' : 's'}?`;
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function hideBulkDeleteModal() {
    const modal = document.getElementById('bulkDeleteConfirmModal');
    if (modal) {
      modal.classList.add('hidden');
      document.body.style.overflow = '';
    }
    const btn = document.getElementById('confirmBulkDelete');
    const text = document.getElementById('bulkDeleteButtonText');
    const spin = document.getElementById('bulkDeleteButtonSpinner');
    if (btn && text && spin) {
      btn.disabled = false;
      text.textContent = 'Delete';
      spin.classList.add('hidden');
    }
  }

  async function confirmBulkDelete() {
    const ids = Array.from(selectedSessionIds);
    if (ids.length === 0) return;

    const btn = document.getElementById('confirmBulkDelete');
    const text = document.getElementById('bulkDeleteButtonText');
    const spin = document.getElementById('bulkDeleteButtonSpinner');
    if (!btn || !text || !spin) return;

    btn.disabled = true;
    text.textContent = 'Deleting...';
    spin.classList.remove('hidden');

    const deleted = new Set();
    const failed = [];
    try {
      // Delete sequentially to be safe with storage updates
      for (const id of ids) {
        try {
          const res = await sendMessagePromise({ action: 'analyticsDeleteSession', sessionId: id });
          if (res && res.success) {
            deleted.add(id);
          } else {
            failed.push(id);
          }
        } catch (e) {
          failed.push(id);
        }
      }

      if (deleted.size > 0) {
        // Remove from local list
        allSessions = allSessions.filter(s => !deleted.has(s.id));
        // Clear selection for deleted ones
        for (const id of deleted) selectedSessionIds.delete(id);

        // Adjust pagination
        const totalPages = getTotalPages();
        if (currentPage > totalPages && totalPages > 0) {
          currentPage = totalPages;
        } else if (totalPages === 0) {
          currentPage = 1;
        }

        renderSessionsTable();
        try { await refreshSummary(); } catch (_) {}
      }

      hideBulkDeleteModal();
      // Exit selection mode after completing bulk delete
      exitSelectionMode();

      if (failed.length > 0) {
        alert(`Failed to delete ${failed.length} session(s). Please try again.`);
      }
    } catch (e) {
      console.error('Bulk delete error:', e);
      alert('Failed to delete selected sessions. Please try again.');
      btn.disabled = false;
      text.textContent = 'Delete';
      spin.classList.add('hidden');
    }
  }

  function enterSelectionMode() {
    selectionMode = true;
    updateBulkControls();
    renderSessionsTable();
  }

  function exitSelectionMode() {
    selectionMode = false;
    selectedSessionIds.clear();
    updateBulkControls();
    renderSessionsTable();
  }

  // Edit modal management functions
  function showEditModal(session) {
    currentSessionToEdit = session;
    const modal = document.getElementById('editSessionModal');
    const typeSelect = document.getElementById('editSessionType');
    const dateInput = document.getElementById('editSessionDate');
    const timeInput = document.getElementById('editSessionTime');
    const durationInput = document.getElementById('editSessionDuration');

    if (!modal || !typeSelect || !dateInput || !timeInput || !durationInput) return;

    // Populate form with current session values
    typeSelect.value = session.type;
    
    const startDate = new Date(session.start);
    dateInput.value = startDate.toISOString().split('T')[0]; // YYYY-MM-DD format
    timeInput.value = startDate.toTimeString().slice(0, 5); // HH:MM format
    
    const duration = getCreditedDuration(session);
    durationInput.value = Math.round(duration / 60); // Convert seconds to minutes

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function hideEditModal() {
    const modal = document.getElementById('editSessionModal');
    if (modal) {
      modal.classList.add('hidden');
      document.body.style.overflow = '';
    }
    currentSessionToEdit = null;
    
    // Reset form
    const form = document.getElementById('editSessionForm');
    if (form) form.reset();
    
    // Reset button state
    const editBtn = document.getElementById('confirmEdit');
    const btnText = document.getElementById('editButtonText');
    const spinner = document.getElementById('editButtonSpinner');
    if (editBtn && btnText && spinner) {
      editBtn.disabled = false;
      btnText.textContent = 'Save Changes';
      spinner.classList.add('hidden');
    }
  }

  async function confirmEdit() {
    if (!currentSessionToEdit) return;

    const typeSelect = document.getElementById('editSessionType');
    const dateInput = document.getElementById('editSessionDate');
    const timeInput = document.getElementById('editSessionTime');
    const durationInput = document.getElementById('editSessionDuration');
    const editBtn = document.getElementById('confirmEdit');
    const btnText = document.getElementById('editButtonText');
    const spinner = document.getElementById('editButtonSpinner');

    if (!typeSelect || !dateInput || !timeInput || !durationInput || !editBtn || !btnText || !spinner) return;

    // Basic validation
    if (!dateInput.value || !timeInput.value || !durationInput.value) {
      alert('Please fill in all required fields.');
      return;
    }

    const duration = parseInt(durationInput.value);
    if (duration < 1 || duration > 1440) {
      alert('Duration must be between 1 and 1440 minutes.');
      return;
    }

    // Show loading state
    editBtn.disabled = true;
    btnText.textContent = 'Saving...';
    spinner.classList.remove('hidden');

    try {
      // Create new start timestamp
      const dateStr = dateInput.value;
      const timeStr = timeInput.value;
      const startTimestamp = new Date(`${dateStr}T${timeStr}`).getTime();

      if (isNaN(startTimestamp)) {
        throw new Error('Invalid date or time');
      }

      const updates = {
        type: typeSelect.value,
        start: startTimestamp,
        duration: duration * 60 // Convert minutes to seconds
      };

      const result = await sendMessagePromise({
        action: 'analyticsUpdateSession',
        sessionId: currentSessionToEdit.id,
        updates: updates
      });

      if (result && result.success) {
        // Update local session data
        const sessionIndex = allSessions.findIndex(s => s.id === currentSessionToEdit.id);
        if (sessionIndex !== -1) {
          allSessions[sessionIndex] = {
            ...allSessions[sessionIndex],
            type: updates.type,
            start: updates.start,
            plannedSec: updates.duration,
            actualSec: allSessions[sessionIndex].completed ? updates.duration : allSessions[sessionIndex].actualSec,
            end: allSessions[sessionIndex].completed ? updates.start + (updates.duration * 1000) : allSessions[sessionIndex].end
          };
        }
        
        // Re-render the table
        renderSessionsTable();
        
        // Hide modal
        hideEditModal();
        
        // Immediate UI refresh for chart/series as a fallback to broadcast timing
        try { await refreshSummary(); } catch (_) {}

        // Show success message
        console.log('Session updated successfully');
      } else {
        throw new Error(result?.error || 'Failed to update session');
      }
    } catch (error) {
      console.error('Update session error:', error);
      alert('Failed to update session. Please try again.');
      
      // Reset button state on error
      editBtn.disabled = false;
      btnText.textContent = 'Save Changes';
      spinner.classList.add('hidden');
    }
  }

  function renderWeeklyChart(series) {
    const canvas = document.getElementById('summaryWeeklyChart');
    if (!canvas) return;
    if (typeof Chart === 'undefined') return;

    // If we already have a chart tied to a different canvas (due to page reload), destroy it
    if (weeklyChart) {
      const chartCanvas = weeklyChart.canvas || (weeklyChart.ctx && weeklyChart.ctx.canvas);
      if (chartCanvas !== canvas) {
        try { weeklyChart.destroy(); } catch (_) {}
        weeklyChart = null;
      }
    }

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
      if (openMenuBtn) openMenuBtn.setAttribute('aria-expanded', 'false');
      openMenu = null;
      openMenuBtn = null;
    }
  }

  function renderSessionsTable() {
    const tbody = document.getElementById('summarySessionsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const sessions = getCurrentPageSessions();
    if (!sessions || sessions.length === 0) {
      const row = document.createElement('tr');
      const colspan = selectionMode ? 7 : 6;
      row.innerHTML = `<td colspan="${colspan}" class="px-4 py-6 text-center text-sm text-gray-500">No sessions yet</td>`;
      tbody.appendChild(row);
      updatePaginationControls();
      updateBulkControls();
      return;
    }

    sessions.forEach((s, idx) => {
      const globalIndex = (currentPage - 1) * sessionsPerPage + idx;
      const start = new Date(s.start);
      const end = new Date(s.end || s.start);
      const dateStr = start.toLocaleDateString();
      const timeStr = `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      const duration = formatDurationShort(getCreditedDuration(s));

      const tr = document.createElement('tr');
      const selectCol = selectionMode ? `
        <td class=\"px-2 py-2 text-center\">
          <input type=\"checkbox\" class=\"session-select h-4 w-4 text-indigo-600 border-gray-300 rounded\" data-id=\"${s.id}\">
        </td>` : '';
      tr.innerHTML = `
        ${selectCol}
        <td class="px-4 py-2 text-sm text-gray-500">${globalIndex + 1}</td>
        <td class="px-4 py-2 text-sm text-gray-700">${dateStr}</td>
        <td class="px-4 py-2 text-sm text-gray-700">${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
        <td class="px-4 py-2 text-sm text-gray-700">${duration}</td>
        <td class="px-4 py-2 text-sm ${
          s.type === 'pomodoro' ? 'text-red-600'
          : (s.type === 'short-break' || s.type === 'long-break') ? 'text-green-600'
          : 'text-blue-600'
        }">${typeLabel(s.type)}</td>
        <td class="px-4 py-2 text-center relative">
          <button class="action-menu-btn text-gray-400 hover:text-gray-600 p-2 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1" title="Actions" aria-label="Actions" aria-haspopup="true" aria-expanded="false">
            <i class="fas fa-ellipsis-v"></i>
          </button>
          <div class="action-menu hidden absolute top-full right-0 mt-1 w-36 bg-white border border-gray-200 rounded shadow-lg z-[9999]">
            <button class="action-edit w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Edit</button>
            <button class="action-delete w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50">Delete</button>
          </div>
        </td>
      `;

      // Initialize selection checkbox state and handler
      if (selectionMode) {
        const cb = tr.querySelector('input.session-select');
        if (cb) {
          cb.checked = selectedSessionIds.has(s.id);
          cb.addEventListener('change', (e) => {
            if (e.target.checked) selectedSessionIds.add(s.id); else selectedSessionIds.delete(s.id);
            updateBulkControls();
          });
        }
      }

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
          // Show and portal to body for robust positioning
          menu.classList.remove('hidden');
          if (!menu.dataset.portaled) {
            document.body.appendChild(menu);
            menu.dataset.portaled = '1';
          }
          // Position as fixed under the button, right-aligned
          const rect = btn.getBoundingClientRect();
          menu.style.position = 'fixed';
          menu.style.top = `${Math.round(rect.bottom + 6)}px`;
          const menuWidth = menu.offsetWidth || 144; // w-36 ≈ 144px
          const left = Math.max(8, Math.round(rect.right - menuWidth));
          menu.style.left = `${left}px`;
          menu.style.zIndex = '9999';

          btn.setAttribute('aria-expanded', 'true');
          openMenu = menu;
          openMenuBtn = btn;
        } else {
          menu.classList.add('hidden');
          btn.setAttribute('aria-expanded', 'false');
          openMenu = null;
          openMenuBtn = null;
        }
      });

      // Placeholder handlers for edit/delete (to be implemented later)
      const editBtn = cell.querySelector('.action-edit');
      const deleteBtn = cell.querySelector('.action-delete');
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeOpenMenu();
        showEditModal(s);
      });
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeOpenMenu();
        showDeleteConfirmation(s);
      });

      tbody.appendChild(tr);
    });
    
    updatePaginationControls();
    updateBulkControls();
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
      fetchSessions(1000), // Fetch more sessions to support pagination
    ]);
    allSessions = sessions;
    // Drop selections for sessions that no longer exist
    const ids = new Set(allSessions.map(s => s.id));
    for (const id of Array.from(selectedSessionIds)) {
      if (!ids.has(id)) selectedSessionIds.delete(id);
    }
    renderWeeklyChart(series);
    renderSessionsTable();
  }

  // Pagination navigation functions
  function goToPage(page) {
    const totalPages = getTotalPages();
    if (page >= 1 && page <= totalPages) {
      currentPage = page;
      renderSessionsTable();
    }
  }

  function goToPreviousPage() {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  }

  function goToNextPage() {
    const totalPages = getTotalPages();
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  }

  // Expose setup function
  window.setupSummaryAnalytics = function setupSummaryAnalytics() {
    refreshSummary();
    
    // Pagination event listeners
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    
    if (prevBtn) {
      prevBtn.addEventListener('click', goToPreviousPage);
    }
    
    if (nextBtn) {
      nextBtn.addEventListener('click', goToNextPage);
    }

    // Header select-all checkbox
    const headerCb = document.getElementById('selectAllSessions');
    if (headerCb) {
      headerCb.addEventListener('change', (e) => {
        const visible = getCurrentPageSessions();
        if (e.target.checked) {
          visible.forEach(s => selectedSessionIds.add(s.id));
        } else {
          visible.forEach(s => selectedSessionIds.delete(s.id));
        }
        renderSessionsTable();
      });
    }

    // Bulk delete button: toggle selection mode / confirm bulk delete
    const bulkBtn = document.getElementById('bulkDeleteBtn');
    if (bulkBtn) {
      bulkBtn.addEventListener('click', () => {
        if (!selectionMode) {
          enterSelectionMode();
        } else {
          if (selectedSessionIds.size > 0) {
            showBulkDeleteModal();
          } else {
            // No selection -> exit selection mode
            exitSelectionMode();
          }
        }
      });
    }
    
    // Modal event listeners
    const modal = document.getElementById('deleteConfirmModal');
    const closeModalBtn = document.getElementById('closeDeleteModal');
    const cancelBtn = document.getElementById('cancelDelete');
    const confirmBtn = document.getElementById('confirmDelete');
    
    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', hideDeleteConfirmation);
    }
    
    if (cancelBtn) {
      cancelBtn.addEventListener('click', hideDeleteConfirmation);
    }
    
    if (confirmBtn) {
      confirmBtn.addEventListener('click', confirmDelete);
    }
    
    // Close modal on backdrop click
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          hideDeleteConfirmation();
        }
      });
    }
    
    // Edit modal event listeners
    const editModal = document.getElementById('editSessionModal');
    const closeEditModalBtn = document.getElementById('closeEditModal');
    const cancelEditBtn = document.getElementById('cancelEdit');
    const confirmEditBtn = document.getElementById('confirmEdit');
    
    if (closeEditModalBtn) {
      closeEditModalBtn.addEventListener('click', hideEditModal);
    }
    
    if (cancelEditBtn) {
      cancelEditBtn.addEventListener('click', hideEditModal);
    }
    
    if (confirmEditBtn) {
      confirmEditBtn.addEventListener('click', confirmEdit);
    }
    
    // Close edit modal on backdrop click
    if (editModal) {
      editModal.addEventListener('click', (e) => {
        if (e.target === editModal) {
          hideEditModal();
        }
      });
    }
    
    // Close any open menu on outside click or Escape
    document.addEventListener('click', () => closeOpenMenu());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        // Close modals first if open, then menu
        if (currentSessionToDelete) {
          hideDeleteConfirmation();
        } else if (currentSessionToEdit) {
          hideEditModal();
        } else {
          closeOpenMenu();
        }
      }
    });
    // Bulk modal events
    const bulkModal = document.getElementById('bulkDeleteConfirmModal');
    const closeBulkBtn = document.getElementById('closeBulkDeleteModal');
    const cancelBulkBtn = document.getElementById('cancelBulkDelete');
    const confirmBulkBtn = document.getElementById('confirmBulkDelete');
    if (closeBulkBtn) closeBulkBtn.addEventListener('click', hideBulkDeleteModal);
    if (cancelBulkBtn) cancelBulkBtn.addEventListener('click', hideBulkDeleteModal);
    if (confirmBulkBtn) confirmBulkBtn.addEventListener('click', confirmBulkDelete);
    if (bulkModal) {
      bulkModal.addEventListener('click', (e) => {
        if (e.target === bulkModal) hideBulkDeleteModal();
      });
    }
    chrome.runtime.onMessage.addListener((message) => {
      if (message && (message.action === 'analyticsUpdated' || message.action === 'timerStateUpdated')) {
        refreshSummary();
      }
    });
  };
})();
