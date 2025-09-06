/**
 * Settings Page Functionality
 * Wires up notifications & audio settings and persists them via background messaging
 */

async function loadSettingsIntoUI() {
  try {
    const res = await sendMessagePromise({ action: 'getSettings' });
    const s = (res && res.settings) || {};

    // Unified Mode Toggle
    const unifiedToggle = document.getElementById('unifiedModeToggle');
    // Dark Mode Toggle
    const darkModeToggle = document.getElementById('darkModeToggle');

    // Notification settings
    const soundToggle = document.getElementById('soundNotificationsToggle');
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeValue = document.getElementById('volumeValue');
    // Block Attempt Alerts toggle removed from UI

    if (unifiedToggle) unifiedToggle.checked = !!s.unifiedModeEnabled;
    if (darkModeToggle) darkModeToggle.checked = !!s.darkModeEnabled;
    // Apply theme based on saved setting
    try { document.documentElement.classList.toggle('dark', !!s.darkModeEnabled); } catch {}
    if (soundToggle) soundToggle.checked = !!s.soundNotificationsEnabled;
    if (typeof s.notificationVolume === 'number' && volumeSlider) {
      const v = Math.max(0, Math.min(100, s.notificationVolume));
      volumeSlider.value = String(v);
      if (volumeValue) volumeValue.textContent = `${v}%`;
    }
    // No block attempt alerts control in UI anymore
  } catch (e) {
    console.warn('Failed to load settings into UI:', e);
  }
}

async function persistSettings(patch) {
  try {
    await sendMessagePromise({ action: 'setSettings', settings: patch });
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

function setupSettingsFunctionality() {
  console.log('🔧 Initializing settings functionality...');

  // Initial populate
  loadSettingsIntoUI();

  // Unified Mode Toggle
  const unifiedToggle = document.getElementById('unifiedModeToggle');
  if (unifiedToggle) {
    unifiedToggle.addEventListener('change', (e) => {
      console.log('🔄 Unified mode toggled:', e.target.checked);
      persistSettings({ unifiedModeEnabled: !!e.target.checked });
    });
  }

  // Dark Mode Toggle
  const darkModeToggle = document.getElementById('darkModeToggle');
  if (darkModeToggle) {
    darkModeToggle.addEventListener('change', (e) => {
      const enabled = !!e.target.checked;
      try { document.documentElement.classList.toggle('dark', enabled); } catch {}
      persistSettings({ darkModeEnabled: enabled });
    });
  }

  // Notification Controls
  const soundToggle = document.getElementById('soundNotificationsToggle');
  if (soundToggle) {
    soundToggle.addEventListener('change', (e) => {
      persistSettings({ soundNotificationsEnabled: !!e.target.checked });
    });
  }

  const volumeSlider = document.getElementById('volumeSlider');
  const volumeValue = document.getElementById('volumeValue');
  if (volumeSlider) {
    const updateVolume = (val) => {
      const v = Math.max(0, Math.min(100, Number(val) || 0));
      if (volumeValue) volumeValue.textContent = `${v}%`;
      persistSettings({ notificationVolume: v });
    };
    volumeSlider.addEventListener('input', (e) => updateVolume(e.target.value));
    volumeSlider.addEventListener('change', (e) =>
      updateVolume(e.target.value)
    );
  }

  // Block Attempt Alerts toggle removed

  const testBtn = document.getElementById('testSoundBtn');
  if (testBtn) {
    testBtn.addEventListener('click', async () => {
      try {
        const volumeSlider = document.getElementById('volumeSlider');
        const val = volumeSlider ? Number(volumeSlider.value) : 70;
        const v = Math.max(0, Math.min(100, isNaN(val) ? 70 : val));
        const audioUrl = chrome.runtime.getURL(
          'src/assets/sounds/notification.mp3'
        );
        const audio = new Audio(audioUrl);
        audio.volume = Math.max(0, Math.min(1, v / 100));
        await audio.play();
      } catch (err) {
        console.warn('Test sound failed:', err);
      }
    });
  }

  // Export Data (Sessions) button
  const exportDataBtn = document.getElementById('exportDataBtn');
  if (exportDataBtn) {
    exportDataBtn.addEventListener('click', async () => {
      try {
        // Read analytics from extension local storage
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
    });
  }

  // Clear Analytics Data flow
  const clearBtn = document.getElementById('clearAnalyticsBtn');
  const modal = document.getElementById('clearAnalyticsModal');
  const closeModal = document.getElementById('closeClearAnalyticsModal');
  const cancelModal = document.getElementById('cancelClearAnalytics');
  const confirmClear = document.getElementById('confirmClearAnalytics');
  const btnText = document.getElementById('clearAnalyticsButtonText');
  const btnSpinner = document.getElementById('clearAnalyticsButtonSpinner');

  const hideModal = () => {
    if (modal) modal.classList.add('hidden');
  };
  const showModal = () => {
    if (modal) modal.classList.remove('hidden');
  };

  if (clearBtn && modal) {
    clearBtn.addEventListener('click', showModal);
  }
  if (closeModal) closeModal.addEventListener('click', hideModal);
  if (cancelModal) cancelModal.addEventListener('click', hideModal);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) hideModal();
    });
  }

  if (confirmClear && btnText && btnSpinner) {
    confirmClear.addEventListener('click', async () => {
      try {
        confirmClear.disabled = true;
        btnText.textContent = 'Deleting...';
        btnSpinner.classList.remove('hidden');

        // Clear analytics object entirely
        await chrome.storage.local.remove(['analytics']);

        // Broadcast update so Summary views can refresh if open
        try {
          chrome.runtime.sendMessage({ action: 'analyticsUpdated' });
        } catch {}

        hideModal();
      } catch (err) {
        console.error('Failed to clear analytics:', err);
        alert('Failed to clear analytics. Please try again.');
      } finally {
        confirmClear.disabled = false;
        btnText.textContent = 'Delete';
        btnSpinner.classList.add('hidden');
      }
    });
  }
}

// Export for tests if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { setupSettingsFunctionality };
}
