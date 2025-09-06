/**
 * Settings Page Functionality
 * Wires up notifications & audio settings and persists them via background messaging
 */

async function loadSettingsIntoUI() {
  try {
    const res = await sendMessagePromise({ action: 'getSettings' });
    const s = (res && res.settings) || {};

    const soundToggle = document.getElementById('soundNotificationsToggle');
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeValue = document.getElementById('volumeValue');
    const blockAlertsToggle = document.getElementById('blockAlertsToggle');

    if (soundToggle) soundToggle.checked = !!s.soundNotificationsEnabled;
    if (typeof s.notificationVolume === 'number' && volumeSlider) {
      const v = Math.max(0, Math.min(100, s.notificationVolume));
      volumeSlider.value = String(v);
      if (volumeValue) volumeValue.textContent = `${v}%`;
    }
    if (blockAlertsToggle) blockAlertsToggle.checked = !!s.blockAttemptAlertsEnabled;
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
  // Initial populate
  loadSettingsIntoUI();

  // Controls
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
    volumeSlider.addEventListener('change', (e) => updateVolume(e.target.value));
  }

  const blockAlertsToggle = document.getElementById('blockAlertsToggle');
  if (blockAlertsToggle) {
    blockAlertsToggle.addEventListener('change', (e) => {
      persistSettings({ blockAttemptAlertsEnabled: !!e.target.checked });
    });
  }

  const testBtn = document.getElementById('testSoundBtn');
  if (testBtn) {
    testBtn.addEventListener('click', async () => {
      try {
        const volumeSlider = document.getElementById('volumeSlider');
        const val = volumeSlider ? Number(volumeSlider.value) : 70;
        const v = Math.max(0, Math.min(100, isNaN(val) ? 70 : val));
        const audioUrl = chrome.runtime.getURL('src/assets/sounds/notification.mp3');
        const audio = new Audio(audioUrl);
        audio.volume = Math.max(0, Math.min(1, v / 100));
        await audio.play();
      } catch (err) {
        console.warn('Test sound failed:', err);
      }
    });
  }
}

// Export for tests if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { setupSettingsFunctionality };
}
