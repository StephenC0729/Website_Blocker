import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

function send(msg) {
  if (
    typeof window !== 'undefined' &&
    typeof window.sendMessagePromise === 'function'
  ) {
    return window.sendMessagePromise(msg);
  }
  return Promise.resolve({ success: true });
}

function formatDurationShort(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

function getCreditedDuration(session) {
  const planned = session.plannedSec || 0;
  const actual = session.actualSec || 0;
  if (planned > 0 && actual > 0) return Math.min(planned, actual);
  return actual || planned || 0;
}

function typeLabel(sessionType) {
  if (sessionType === 'pomodoro') return 'Focus';
  if (sessionType === 'short-break' || sessionType === 'long-break')
    return 'Break';
  return 'Custom';
}

export default function Summary() {
  const [weekly, setWeekly] = useState({ labels: [], data: [] });
  const [sessions, setSessions] = useState([]);
  const [page, setPage] = useState(1);
  const [perPage] = useState(20);
  const [selection, setSelection] = useState(() => new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [deleteSession, setDeleteSession] = useState(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editSession, setEditSession] = useState(null);
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const [openMenuId, setOpenMenuId] = useState(null);

  const totalPages = useMemo(
    () => Math.ceil(sessions.length / perPage) || 1,
    [sessions.length, perPage]
  );
  const visible = useMemo(() => {
    const start = (page - 1) * perPage;
    return sessions.slice(start, start + perPage);
  }, [sessions, page, perPage]);

  const refresh = useCallback(async () => {
    const [w, hist] = await Promise.all([
      send({ action: 'analyticsGetWeeklySeries' }),
      send({ action: 'analyticsGetHistory', limit: 1000 }),
    ]);
    setWeekly({ labels: (w && w.labels) || [], data: (w && w.data) || [] });
    setSessions((hist && hist.sessions) || []);
    setSelection((prev) => {
      const next = new Set(prev);
      const ids = new Set(((hist && hist.sessions) || []).map((s) => s.id));
      for (const id of Array.from(next)) {
        if (!ids.has(id)) next.delete(id);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    refresh();
    const handler = (message) => {
      if (
        message &&
        (message.action === 'analyticsUpdated' ||
          message.action === 'timerStateUpdated')
      ) {
        refresh();
      }
    };
    try {
      chrome.runtime.onMessage.addListener(handler);
    } catch {}
    return () => {
      try {
        chrome.runtime.onMessage.removeListener(handler);
      } catch {}
    };
  }, [refresh]);

  useEffect(() => {
    const canvas = chartRef.current;
    if (!canvas || typeof Chart === 'undefined') return;
    const ctx = canvas.getContext('2d');
    const minutes = weekly.data.map((s) => Math.round((s || 0) / 60));
    if (chartInstanceRef.current) {
      chartInstanceRef.current.data.labels = weekly.labels;
      chartInstanceRef.current.data.datasets[0].data = minutes;
      chartInstanceRef.current.update();
      return;
    }
    chartInstanceRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: weekly.labels,
        datasets: [
          {
            label: 'Focus (minutes)',
            data: minutes,
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99,102,241,0.15)',
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
    return () => {
      if (chartInstanceRef.current) {
        try {
          chartInstanceRef.current.destroy();
        } catch {}
        chartInstanceRef.current = null;
      }
    };
  }, [weekly]);

  const toggleSelectionMode = useCallback(() => {
    if (!selectionMode) setSelectionMode(true);
    else setSelectionMode(false);
  }, [selectionMode]);

  const toggleSelectVisible = useCallback(
    (checked) => {
      setSelection((prev) => {
        const next = new Set(prev);
        if (checked) visible.forEach((s) => next.add(s.id));
        else visible.forEach((s) => next.delete(s.id));
        return next;
      });
    },
    [visible]
  );

  const onConfirmDelete = useCallback(async () => {
    if (!deleteSession) return;
    await send({
      action: 'analyticsDeleteSession',
      sessionId: deleteSession.id,
    });
    setDeleteSession(null);
    await refresh();
  }, [deleteSession, refresh]);

  const onConfirmBulkDelete = useCallback(async () => {
    const ids = Array.from(selection);
    for (const id of ids) {
      try {
        await send({ action: 'analyticsDeleteSession', sessionId: id });
      } catch {}
    }
    setBulkOpen(false);
    setSelection(new Set());
    setSelectionMode(false);
    await refresh();
  }, [selection, refresh]);

  const [editForm, setEditForm] = useState({
    type: 'pomodoro',
    date: '',
    time: '',
    durationMin: 25,
  });
  useEffect(() => {
    if (!editSession) return;
    const start = new Date(editSession.start);
    setEditForm({
      type: editSession.type,
      date: start.toISOString().split('T')[0],
      time: start.toTimeString().slice(0, 5),
      durationMin: Math.round(getCreditedDuration(editSession) / 60),
    });
  }, [editSession]);

  const onConfirmEdit = useCallback(async () => {
    if (!editSession) return;
    const startTimestamp = new Date(
      `${editForm.date}T${editForm.time}`
    ).getTime();
    const updates = {
      type: editForm.type,
      start: startTimestamp,
      duration: Number(editForm.durationMin) * 60,
    };
    await send({
      action: 'analyticsUpdateSession',
      sessionId: editSession.id,
      updates,
    });
    setEditSession(null);
    await refresh();
  }, [editSession, editForm, refresh]);

  const headerChecked = useMemo(() => {
    if (!selectionMode) return false;
    if (visible.length === 0) return false;
    const selectedCount = visible.reduce(
      (acc, s) => acc + (selection.has(s.id) ? 1 : 0),
      0
    );
    return selectedCount === visible.length && selectedCount > 0;
  }, [selectionMode, selection, visible]);

  const headerIndeterminate = useMemo(() => {
    if (!selectionMode) return false;
    const selectedCount = visible.reduce(
      (acc, s) => acc + (selection.has(s.id) ? 1 : 0),
      0
    );
    return selectedCount > 0 && selectedCount < visible.length;
  }, [selectionMode, selection, visible]);

  // Close action menu on outside click or Escape
  useEffect(() => {
    const onDocClick = () => setOpenMenuId(null);
    const onKey = (e) => {
      if (e.key === 'Escape') setOpenMenuId(null);
    };
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <div className="flex-1 p-6 overflow-auto min-h-full">
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          <i className="fas fa-chart-line text-indigo-500 mr-2"></i>
          Weekly Productivity
        </h3>
        <canvas
          ref={chartRef}
          id="summaryWeeklyChart"
          width="400"
          height="200"
        ></canvas>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            <i className="fas fa-list text-blue-500 mr-2"></i>
            Sessions
          </h3>
          <div className="flex items-center space-x-3">
            <div className="hidden sm:block text-sm text-gray-500">
              Last 100 sessions
            </div>
            <button
              id="bulkDeleteBtn"
              className="px-3 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
              onClick={() => {
                if (!selectionMode) setSelectionMode(true);
                else if (selection.size > 0) setBulkOpen(true);
                else setSelectionMode(false);
              }}
            >
              {selectionMode ? 'Delete Selected' : 'Delete'}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-fixed divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  id="selectColHeader"
                  className={`w-10 px-2 py-2 text-center ${
                    selectionMode ? '' : 'hidden'
                  }`}
                >
                  <input
                    id="selectAllSessions"
                    type="checkbox"
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                    checked={headerChecked}
                    ref={(el) => {
                      if (el) el.indeterminate = headerIndeterminate;
                    }}
                    onChange={(e) => toggleSelectVisible(e.target.checked)}
                  />
                </th>
                <th className="w-16 px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  No.
                </th>
                <th className="w-24 px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="w-40 px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Time
                </th>
                <th className="w-20 px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Duration
                </th>
                <th className="w-20 px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Type
                </th>
                <th className="w-20 px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody
              id="summarySessionsTableBody"
              className="bg-white divide-y divide-gray-100"
            >
              {visible.length === 0 && (
                <tr>
                  <td
                    className="px-4 py-6 text-center text-sm text-gray-500"
                    colSpan={selectionMode ? 7 : 6}
                  >
                    No sessions yet
                  </td>
                </tr>
              )}
              {visible.map((s, idx) => {
                const globalIndex = (page - 1) * perPage + idx;
                const start = new Date(s.start);
                const end = new Date(s.end || s.start);
                const duration = formatDurationShort(getCreditedDuration(s));
                const selected = selection.has(s.id);
                return (
                  <tr key={s.id}>
                    {selectionMode && (
                      <td className="px-2 py-2 text-center">
                        <input
                          type="checkbox"
                          className="session-select h-4 w-4 text-indigo-600 border-gray-300 rounded"
                          checked={selected}
                          onChange={(e) => {
                            setSelection((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(s.id);
                              else next.delete(s.id);
                              return next;
                            });
                          }}
                        />
                      </td>
                    )}
                    <td className="px-4 py-2 text-sm text-gray-500">
                      {globalIndex + 1}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700">
                      {start.toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700">
                      {start.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      –{' '}
                      {end.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700">
                      {duration}
                    </td>
                    <td
                      className={`px-4 py-2 text-sm ${
                        s.type === 'pomodoro'
                          ? 'text-red-600'
                          : s.type === 'short-break' || s.type === 'long-break'
                          ? 'text-green-600'
                          : 'text-blue-600'
                      }`}
                    >
                      {typeLabel(s.type)}
                    </td>
                    <td className="px-4 py-2 text-center relative">
                      <button
                        className="action-menu-btn text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100 p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
                        title="Actions"
                        aria-haspopup="true"
                        aria-expanded={openMenuId === s.id ? 'true' : 'false'}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId((id) => (id === s.id ? null : s.id));
                        }}
                      >
                        <i className="fas fa-ellipsis-v"></i>
                      </button>
                      <div
                        className={`action-menu ${
                          openMenuId === s.id ? '' : 'hidden'
                        } absolute top-full right-0 mt-1 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg`}
                        style={{ zIndex: 10000 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          className="action-edit w-full text-left px-4 py-2 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                          onClick={() => {
                            setOpenMenuId(null);
                            setEditSession(s);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="action-delete w-full text-left px-4 py-2 text-sm bg-white dark:bg-gray-800 text-red-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                          onClick={() => {
                            setOpenMenuId(null);
                            setDeleteSession(s);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <button
              id="prevPageBtn"
              className="p-2 rounded-md border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            <div className="flex items-center space-x-1">
              <span
                id="currentPageDisplay"
                className="px-3 py-2 text-sm font-medium text-gray-900 bg-indigo-50 border border-indigo-200 rounded-md"
              >
                {page}
              </span>
            </div>
            <button
              id="nextPageBtn"
              className="p-2 rounded-md border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Delete Modal */}
      {bulkOpen && (
        <div
          id="bulkDeleteConfirmModal"
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setBulkOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Delete Selected Sessions
              </h3>
              <button
                id="closeBulkDeleteModal"
                className="text-gray-400 hover:text-gray-600"
                onClick={() => setBulkOpen(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="mb-6">
              <p className="text-gray-600" id="bulkDeleteSummary">
                Are you sure you want to delete the selected sessions?
              </p>
              <p className="text-sm text-red-600 mt-3">
                This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                id="cancelBulkDelete"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                onClick={() => setBulkOpen(false)}
              >
                Cancel
              </button>
              <button
                id="confirmBulkDelete"
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
                onClick={onConfirmBulkDelete}
              >
                <span id="bulkDeleteButtonText">Delete</span>
                <i
                  id="bulkDeleteButtonSpinner"
                  className="fas fa-spin fa-circle-notch hidden ml-2"
                ></i>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteSession && (
        <div
          id="deleteConfirmModal"
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setDeleteSession(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Delete Session
              </h3>
              <button
                id="closeDeleteModal"
                className="text-gray-400 hover:text-gray-600"
                onClick={() => setDeleteSession(null)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="mb-6">
              <p className="text-gray-600 mb-3">
                Are you sure you want to delete this session?
              </p>
              <div
                id="sessionToDelete"
                className="bg-gray-50 rounded-lg p-3 text-sm"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-gray-700">Date:</span>
                  <span id="deleteSessionDate" className="text-gray-600">
                    {new Date(deleteSession.start).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-gray-700">Time:</span>
                  <span id="deleteSessionTime" className="text-gray-600">
                    {new Date(deleteSession.start).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700">Duration:</span>
                  <span id="deleteSessionDuration" className="text-gray-600">
                    {formatDurationShort(getCreditedDuration(deleteSession))}
                  </span>
                </div>
              </div>
              <p className="text-sm text-red-600 mt-3">
                This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                id="cancelDelete"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                onClick={() => setDeleteSession(null)}
              >
                Cancel
              </button>
              <button
                id="confirmDelete"
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
                onClick={onConfirmDelete}
              >
                <span id="deleteButtonText">Delete</span>
                <i
                  id="deleteButtonSpinner"
                  className="fas fa-spin fa-circle-notch hidden ml-2"
                ></i>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editSession && (
        <div
          id="editSessionModal"
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setEditSession(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Edit Session
              </h3>
              <button
                id="closeEditModal"
                className="text-gray-400 hover:text-gray-600"
                onClick={() => setEditSession(null)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form
              id="editSessionForm"
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                onConfirmEdit();
              }}
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Session Type
                </label>
                <select
                  value={editForm.type}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, type: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="pomodoro">Focus</option>
                  <option value="short-break">Short Break</option>
                  <option value="long-break">Long Break</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={editForm.date}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, date: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={editForm.time}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, time: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="1440"
                  value={editForm.durationMin}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, durationMin: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3 mt-4 pt-4 border-t border-gray-200">
                <button
                  id="cancelEdit"
                  type="button"
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  onClick={() => setEditSession(null)}
                >
                  Cancel
                </button>
                <button
                  id="confirmEdit"
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
