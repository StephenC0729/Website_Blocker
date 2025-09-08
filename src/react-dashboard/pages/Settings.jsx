import React, { useCallback, useEffect, useMemo, useState } from 'react';

function send(msg) {
  if (
    typeof window !== 'undefined' &&
    typeof window.sendMessagePromise === 'function'
  ) {
    return window.sendMessagePromise(msg);
  }
  return Promise.resolve({ success: true });
}

export default function Settings() {
  const [settings, setSettings] = useState({
    syncEnabled: true,
    unifiedModeEnabled: false,
    darkModeEnabled: false,
    soundNotificationsEnabled: true,
    notificationVolume: 50,
    focusCategoryId: 'general',
    breakCategoryId: '',
  });
  const [syncStatus, setSyncStatus] = useState({
    isRunning: false,
    lastPullAt: null,
    lastPushAt: null,
  });
  const [categories, setCategories] = useState({});
  const categoryOptions = useMemo(() => {
    const base = { general: { name: 'General' } };
    return { ...base, ...categories };
  }, [categories]);

  const refresh = useCallback(async () => {
    try {
      const [res, metaRes] = await Promise.all([
        send({ action: 'getSettings' }),
        send({ action: 'getCategoryMetadata' }),
      ]);
      const s = (res && res.settings) || {};
      setSettings((prev) => ({ ...prev, ...s }));
      setCategories((metaRes && metaRes.categories) || {});
      try {
        document.documentElement.classList.toggle('dark', !!s.darkModeEnabled);
      } catch {}
    } catch (e) {
      console.warn('Failed to load settings:', e);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const persist = useCallback(
    async (patch) => {
      setSettings((prev) => ({ ...prev, ...patch }));
      try {
        await send({
          action: 'setSettings',
          settings: { ...settings, ...patch },
        });
      } catch (e) {
        console.error('Failed to save settings:', e);
      }
    },
    [settings]
  );

  const testSound = useCallback(async () => {
    try {
      const audioUrl = chrome.runtime.getURL(
        'src/assets/sounds/notification.mp3'
      );
      const audio = new Audio(audioUrl);
      const v = Math.max(
        0,
        Math.min(1, (settings.notificationVolume || 0) / 100)
      );
      audio.volume = v;
      await audio.play();
    } catch (err) {
      console.warn('Test sound failed:', err);
    }
  }, [settings.notificationVolume]);

  return (
    <div className="flex-1 p-6 overflow-auto min-h-full">
      {/* Cloud Sync */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6 theme-transition">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          <i className="fas fa-cloud text-blue-500 mr-2"></i>
          Cloud Sync
        </h3>
        <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Enable Cloud Sync
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Back up settings, categories, and analytics to your account
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={!!settings.syncEnabled}
              onChange={async (e) => {
                const enabled = !!e.target.checked;
                await persist({ syncEnabled: enabled });
                try {
                  const auth =
                    (window.firebaseAuth && window.firebaseAuth.currentUser) ||
                    null;
                  if (auth && auth.emailVerified) {
                    if (
                      enabled &&
                      window.SyncService &&
                      typeof window.SyncService.startSync === 'function'
                    ) {
                      window.SyncService.startSync(auth.uid);
                    }
                    if (
                      !enabled &&
                      window.SyncService &&
                      typeof window.SyncService.stopSync === 'function'
                    ) {
                      window.SyncService.stopSync();
                    }
                  }
                  if (
                    window.SyncService &&
                    typeof window.SyncService.getStatus === 'function'
                  ) {
                    setSyncStatus(window.SyncService.getStatus());
                  }
                } catch {}
              }}
            />
            <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        <div className="flex items-center justify-between py-3">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            Status: {syncStatus.isRunning ? 'On' : 'Off'} • Last pull:{' '}
            {syncStatus.lastPullAt
              ? new Date(syncStatus.lastPullAt).toLocaleString()
              : '—'}{' '}
            • Last push:{' '}
            {syncStatus.lastPushAt
              ? new Date(syncStatus.lastPushAt).toLocaleString()
              : '—'}
          </div>
          <div className="space-x-2">
            <button
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-md transition-colors"
              onClick={async () => {
                try {
                  if (
                    window.SyncService &&
                    typeof window.SyncService.pullAll === 'function'
                  ) {
                    const uid =
                      (window.firebaseAuth &&
                        window.firebaseAuth.currentUser &&
                        window.firebaseAuth.currentUser.uid) ||
                      null;
                    if (uid) await window.SyncService.pullAll(uid);
                  }
                  if (
                    window.SyncService &&
                    typeof window.SyncService.getStatus === 'function'
                  ) {
                    setSyncStatus(window.SyncService.getStatus());
                  }
                } catch {}
              }}
            >
              Sync now
            </button>
          </div>
        </div>
      </div>
      {/* Core Blocking Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6 theme-transition">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          <i className="fas fa-shield-alt text-red-500 mr-2"></i>
          Core Blocking Settings
        </h3>

        {/* Unified Mode Toggle */}
        <div className="flex items-center justify-between py-3">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Unified Mode
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Integrate timer and blocking functionality for focused sessions
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={!!settings.unifiedModeEnabled}
              onChange={(e) =>
                persist({ unifiedModeEnabled: !!e.target.checked })
              }
            />
            <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Unified Mode Categories */}
        <div className={`mt-2 ${settings.unifiedModeEnabled ? '' : 'hidden'}`}>
          <div className="py-3 border-t border-gray-200 dark:border-gray-700">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
              Focus Category
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Applied during Pomodoro (focus) sessions
            </p>
            <select
              value={settings.focusCategoryId || 'general'}
              onChange={(e) =>
                persist({ focusCategoryId: e.target.value || 'general' })
              }
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              {Object.entries(categoryOptions).map(([id, meta]) => (
                <option key={id} value={id}>
                  {meta.name || id}
                </option>
              ))}
            </select>
          </div>
          <div className="py-3 border-t border-gray-200 dark:border-gray-700">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
              Break Category
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Optional category to use during breaks; leave None to restore
              previous
            </p>
            <select
              value={settings.breakCategoryId || ''}
              onChange={(e) =>
                persist({ breakCategoryId: e.target.value || null })
              }
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="">None (restore previous)</option>
              {Object.entries(categoryOptions).map(([id, meta]) => (
                <option key={id} value={id}>
                  {meta.name || id}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Notification & Audio Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6 theme-transition">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          <i className="fas fa-bell text-yellow-500 mr-2"></i>
          Notification & Audio Settings
        </h3>
        <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Sound Notifications
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Play audio alerts for blocked sites and timer events
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={!!settings.soundNotificationsEnabled}
              onChange={(e) =>
                persist({ soundNotificationsEnabled: !!e.target.checked })
              }
            />
            <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        <div className="py-3 border-b border-gray-200 dark:border-gray-700">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
            Notification Volume
          </label>
          <div className="flex items-center space-x-3">
            <i className="fas fa-volume-down text-gray-400"></i>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.notificationVolume || 50}
              onChange={(e) =>
                persist({
                  notificationVolume: Math.max(
                    0,
                    Math.min(100, Number(e.target.value) || 0)
                  ),
                })
              }
              className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <i className="fas fa-volume-up text-gray-400"></i>
            <span className="text-sm text-gray-600 dark:text-gray-400 w-8">
              {Math.max(
                0,
                Math.min(100, Number(settings.notificationVolume) || 0)
              )}
              %
            </span>
            <button
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-md transition-colors"
              onClick={testSound}
            >
              <i className="fas fa-play mr-1"></i>
              Test sound
            </button>
          </div>
        </div>
      </div>

      {/* Interface & Appearance */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6 theme-transition">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          <i className="fas fa-paint-brush text-purple-500 mr-2"></i>
          Interface & Appearance
        </h3>
        <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Dark Mode
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Switch between light and dark interface themes
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={!!settings.darkModeEnabled}
              onChange={(e) => {
                const enabled = !!e.target.checked;
                try {
                  document.documentElement.classList.toggle('dark', enabled);
                } catch {}
                persist({ darkModeEnabled: enabled });
              }}
            />
            <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        <div className="py-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
            Analytics Data Retention
          </label>
          <select
            value={String(settings.analyticsRetentionDays || 30)}
            onChange={(e) =>
              persist({ analyticsRetentionDays: Number(e.target.value) })
            }
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
            <option value="365">1 year</option>
            <option value="-1">Keep all data</option>
          </select>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            How long to keep blocking and timer analytics data
          </p>
        </div>
      </div>

      {/* Privacy & Data Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6 theme-transition">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          <i className="fas fa-user-shield text-green-500 mr-2"></i>
          Privacy & Data Settings
        </h3>
        <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Clear Analytics Data
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Remove all stored blocking and timer statistics
            </p>
          </div>
          <button
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-md transition-colors"
            onClick={() => {
              const ok = confirm('Delete analytics data from this device?');
              if (!ok) return;
              chrome.storage.local.remove(['analytics']).then(() => {
                try {
                  chrome.runtime.sendMessage({ action: 'analyticsUpdated' });
                } catch {}
              });
            }}
          >
            <i className="fas fa-trash-alt mr-1"></i>
            Clear Data
          </button>
        </div>
        <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Export Data
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Download your sessions history as a JSON file
            </p>
          </div>
          <button
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
            onClick={async () => {
              try {
                const result = await chrome.storage.local.get(['analytics']);
                const analytics = (result && result.analytics) || {
                  sessions: [],
                  byDay: {},
                };
                const sessions = Array.isArray(analytics.sessions)
                  ? analytics.sessions
                  : [];
                const payload = {
                  schema: 'app-blocker.sessions.v1',
                  exportedAt: new Date().toISOString(),
                  count: sessions.length,
                  sessions,
                };
                const blob = new Blob([JSON.stringify(payload, null, 2)], {
                  type: 'application/json',
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                const date = new Date().toISOString().slice(0, 10);
                a.href = url;
                a.download = `app-blocker-sessions-${date}.json`;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }, 0);
              } catch (err) {
                console.error('Failed to export sessions data:', err);
              }
            }}
          >
            <i className="fas fa-file-export mr-1"></i>
            Export data
          </button>
        </div>
      </div>
    </div>
  );
}
