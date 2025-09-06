/**
 * Dashboard Timer Functionality
 * Handles Pomodoro timer functionality for the dashboard interface
 */

/**
 * Dashboard Pomodoro Timer Class
 * Enhanced timer functionality for the dashboard interface
 */
class DashboardTimer {
  constructor() {
    // Session configurations with duration in seconds and display labels
    this.sessions = {
      pomodoro: { duration: 25 * 60, label: 'Time to focus!' },
      'short-break': { duration: 5 * 60, label: 'Time for a short break!' },
      'long-break': { duration: 15 * 60, label: 'Time for a long break!' },
      custom: { duration: 30 * 60, label: 'Custom timer session' },
    };

    // Timer state variables - will be synced with Chrome Storage
    this.currentSession = 'pomodoro';
    this.timeLeft = this.sessions[this.currentSession].duration;
    this.totalTime = this.sessions[this.currentSession].duration;
    this.isRunning = false;
    this.sessionCount = 1;
    this.pomodoroCount = 0;
    this.intervalId = null;
    this._alignTimeout = null;
    this.init();
  }

  async init() {
    this.setupEventListeners();
    this.setupStorageListener();
    await this.syncWithBackground();
    this.updateDisplay();
    this.updateSessionInfo();
    this.setupDebugControls();
  }

  setupEventListeners() {
    // Session tabs
    const sessionTabs = {
      pomodoroTab: 'pomodoro',
      shortBreakTab: 'short-break',
      longBreakTab: 'long-break',
      customTab: 'custom',
    };

    Object.entries(sessionTabs).forEach(([tabId, sessionType]) => {
      const tab = document.getElementById(tabId);
      if (tab) {
        tab.addEventListener('click', () => this.switchSession(sessionType));
      }
    });

    // Timer control buttons
    const startBtn = document.getElementById('startButton');
    const pauseBtn = document.getElementById('pauseButton');
    const resetBtn = document.getElementById('resetButton');

    if (startBtn) startBtn.addEventListener('click', () => this.toggleTimer());
    if (pauseBtn) pauseBtn.addEventListener('click', () => this.toggleTimer());
    if (resetBtn) resetBtn.addEventListener('click', () => this.resetTimer());

    // Custom timer functionality
    const setCustomBtn = document.getElementById('setCustomTimer');
    if (setCustomBtn) {
      setCustomBtn.addEventListener('click', () => this.setCustomDuration());
    }

    // Developer test button
    const devTestBtn = document.getElementById('devTestButton');
    if (devTestBtn) {
      devTestBtn.addEventListener('click', () => this.generateTestData());
    }
  }

  async switchSession(sessionType) {
    if (this.isRunning) {
      await this.stopTimer();
    }

    // Notify background script about session switch
    const customDuration =
      sessionType === 'custom' ? this.getCustomDurationFromInputs() : undefined;

    chrome.runtime.sendMessage({
      action: 'switchSession',
      session: sessionType,
      customDuration: customDuration,
    });

    // Update local state (will be synced from background)
    this.currentSession = sessionType;
    this.timeLeft = customDuration || this.sessions[sessionType].duration;
    this.totalTime = this.timeLeft;

    // Update UI elements
    this.updateSessionTabs();
    this.updateCustomInputVisibility();
    this.updateDisplay();
    this.updateSessionInfo();
    this.updateProgress();
  }

  setCustomDuration() {
    const minutes =
      parseInt(document.getElementById('customMinutes').value) || 30;
    const seconds =
      parseInt(document.getElementById('customSeconds').value) || 0;
    const totalSeconds = minutes * 60 + seconds;

    if (totalSeconds > 0) {
      this.sessions.custom.duration = totalSeconds;
      if (this.currentSession === 'custom') {
        this.timeLeft = totalSeconds;
        this.totalTime = totalSeconds;
        this.updateDisplay();
        this.updateProgress();
      }
    }
  }

  toggleTimer() {
    if (this.isRunning) {
      this.stopTimer();
    } else {
      this.startTimer();
    }
  }

  async startTimer() {
    // Notify background script that timer started (await to avoid race with completion)
    try {
      if (typeof sendMessagePromise === 'function') {
        await sendMessagePromise({
          action: 'timerStarted',
          session: this.currentSession,
          duration: this.totalTime,
          timeLeft: this.timeLeft,
        });
      } else {
        // Fallback if utility isn't available
        chrome.runtime.sendMessage({
          action: 'timerStarted',
          session: this.currentSession,
          duration: this.totalTime,
          timeLeft: this.timeLeft,
        });
      }
    } catch (e) {
      console.warn('Failed to send timerStarted message before start:', e);
    }

    // Update local state
    this.isRunning = true;
    const startBtn = document.getElementById('startButton');
    const pauseBtn = document.getElementById('pauseButton');

    if (startBtn) startBtn.classList.add('hidden');
    if (pauseBtn) pauseBtn.classList.remove('hidden');

    // Start local countdown for smooth UI updates
    this.intervalId = setInterval(() => {
      this.timeLeft--;
      this.updateDisplay();
      this.updateProgress();

      if (this.timeLeft <= 0) {
        this.timerComplete();
      }
    }, 1000);
  }

  async stopTimer() {
    // Notify background script that timer stopped
    try {
      if (typeof sendMessagePromise === 'function') {
        await sendMessagePromise({ action: 'timerStopped' });
      } else {
        chrome.runtime.sendMessage({ action: 'timerStopped' });
      }
    } catch (e) {
      console.warn('Failed to send timerStopped message:', e);
    }

    // Update local state
    this.isRunning = false;
    const startBtn = document.getElementById('startButton');
    const pauseBtn = document.getElementById('pauseButton');

    if (startBtn) startBtn.classList.remove('hidden');
    if (pauseBtn) pauseBtn.classList.add('hidden');

    // Clear the local update interval and alignment timeout
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this._alignTimeout) {
      clearTimeout(this._alignTimeout);
      this._alignTimeout = null;
    }
  }

  async resetTimer() {
    await this.stopTimer();

    // Notify background script about timer reset
    try {
      if (typeof sendMessagePromise === 'function') {
        await sendMessagePromise({
          action: 'timerReset',
          session: this.currentSession,
        });
      } else {
        chrome.runtime.sendMessage({
          action: 'timerReset',
          session: this.currentSession,
        });
      }
    } catch (e) {
      console.warn('Failed to send timerReset message:', e);
    }

    // Update local state (will be synced from background)
    this.timeLeft = this.sessions[this.currentSession].duration;
    this.totalTime = this.sessions[this.currentSession].duration;
    this.updateDisplay();
    this.updateProgress();
  }

  async timerComplete() {
    // Stop only the local UI timer to avoid clearing startTimestamp in background
    this.stopLocalTimer();

    // Notify background script about timer completion (await to ensure analytics records)
    try {
      if (typeof sendMessagePromise === 'function') {
        await sendMessagePromise({
          action: 'timerComplete',
          session: this.currentSession,
          pomodoroCount: this.pomodoroCount,
        });
      } else {
        chrome.runtime.sendMessage({
          action: 'timerComplete',
          session: this.currentSession,
          pomodoroCount: this.pomodoroCount,
        });
      }
    } catch (e) {
      console.warn('Failed to send timerComplete message:', e);
    }

    // Determine next session label for a more accurate notification
    let nextLabel = null;
    if (this.currentSession === 'pomodoro') {
      const nextIsLong = (this.pomodoroCount + 1) % 4 === 0;
      const nextKey = nextIsLong ? 'long-break' : 'short-break';
      nextLabel = this.sessions[nextKey]?.label || 'Break time!';
    } else if (this.currentSession !== 'custom') {
      nextLabel = this.sessions['pomodoro']?.label || 'Time to focus!';
    }

    // Play notification (use next session message when available)
    this.playNotification(nextLabel);

    // Sync state from background (which handles the session switching logic)
    await this.syncWithBackground();
  }

  updateDisplay() {
    const minutes = Math.floor(this.timeLeft / 60);
    const seconds = this.timeLeft % 60;
    const display = `${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;

    const timerDisplay = document.getElementById('timerDisplay');
    if (timerDisplay) {
      timerDisplay.textContent = display;
    }

    document.title = `${display} - Productivity Dashboard`;
  }

  updateProgress() {
    const progress = ((this.totalTime - this.timeLeft) / this.totalTime) * 100;
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
      progressBar.style.width = `${progress}%`;
    }
  }

  updateSessionInfo() {
    const sessionCountEl = document.getElementById('sessionCount');
    const completedPomodorosEl = document.getElementById('completedPomodoros');
    const sessionTypeEl = document.getElementById('sessionType');

    if (sessionCountEl) sessionCountEl.textContent = this.sessionCount;
    if (completedPomodorosEl)
      completedPomodorosEl.textContent = this.pomodoroCount;
    if (sessionTypeEl)
      sessionTypeEl.textContent = this.sessions[this.currentSession].label;
  }

  playNotification(messageOverride) {
    // Play audio notification (always, regardless of browser notification permission)
    this.playAudioNotification();
  }

  async playAudioNotification() {
    try {
      let volumePct = 70;
      let enabled = true;
      try {
        const res = await sendMessagePromise({ action: 'getSettings' });
        const s = (res && res.settings) || {};
        if (typeof s.notificationVolume === 'number') volumePct = s.notificationVolume;
        if (typeof s.soundNotificationsEnabled === 'boolean') enabled = s.soundNotificationsEnabled;
      } catch (_) {}

      if (!enabled) return;

      const audioUrl = chrome.runtime.getURL('src/assets/sounds/notification.mp3');
      const audio = new Audio(audioUrl);
      audio.volume = Math.max(0, Math.min(1, (Number(volumePct) || 0) / 100));
      audio.play().catch((error) => {
        console.log('Audio notification failed (user interaction may be required):', error);
      });
    } catch (error) {
      console.error('Error playing audio notification:', error);
    }
  }

  /**
   * Debug-only: inject a fast-forward button when enabled via localStorage
   * Enable with: localStorage.setItem('DEBUG_TIMER', 'true')
   */
  setupDebugControls() {
    try {
      const debugEnabled = localStorage.getItem('DEBUG_TIMER') === 'true';
      if (!debugEnabled) return;

      const buttonsRow = document.querySelector(
        '.flex.space-x-4.justify-center'
      );
      if (!buttonsRow || document.getElementById('fastForwardButton')) return;

      const ffBtn = document.createElement('button');
      ffBtn.id = 'fastForwardButton';
      ffBtn.className =
        'bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors';
      ffBtn.innerHTML = '<i class="fas fa-forward mr-2"></i>FF';
      ffBtn.title = 'Fast-forward to session end (debug)';
      ffBtn.addEventListener('click', () => this.fastForwardToEnd());

      buttonsRow.appendChild(ffBtn);
    } catch (error) {
      console.error('Error setting up dashboard debug controls:', error);
    }
  }

  /**
   * Debug-only: immediately complete the current session (triggers notification)
   */
  async fastForwardToEnd() {
    try {
      this.timeLeft = 0;
      await this.timerComplete();
    } catch (error) {
      console.error('Error fast-forwarding dashboard timer:', error);
    }
  }

  /**
   * Synchronization Methods for Background Communication
   */

  /**
   * Sync local state with background script
   */
  async syncWithBackground() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getTimerState',
      });

      if (response.success && response.timerState) {
        this.applyTimerState(response.timerState);
      }
    } catch (error) {
      console.error('Error syncing with background:', error);
    }
  }

  /**
   * Apply timer state from background script
   */
  applyTimerState(timerState) {
    const wasRunning = this.isRunning;

    this.currentSession = timerState.currentSession;
    this.totalTime = timerState.totalTime;
    this.sessionCount = timerState.sessionCount;
    this.pomodoroCount = timerState.pomodoroCount;

    // Calculate current time if timer is running in background using endTimestamp
    if (timerState.isRunning && timerState.endTimestamp) {
      this.timeLeft = Math.max(
        0,
        Math.ceil((timerState.endTimestamp - Date.now()) / 1000)
      );
    } else {
      this.timeLeft = timerState.timeLeft;
    }

    this.isRunning = timerState.isRunning;

    // Update sessions if they exist in the state
    if (timerState.sessions) {
      this.sessions = timerState.sessions;
    }

    // Start or stop local timer based on background state
    if (this.isRunning && !wasRunning) {
      // Timer was started from another interface - start local countdown
      this.startLocalTimer();
    } else if (!this.isRunning && wasRunning) {
      // Timer was stopped from another interface - stop local countdown
      this.stopLocalTimer();
    }

    // Update UI to reflect current state
    this.updateDisplay();
    this.updateSessionInfo();
    this.updateProgress();
    this.updateSessionTabs();
    this.updateTimerButtons();
    this.updateCustomInputVisibility();
  }

  /**
   * Update from background periodically when timer is running
   */
  async updateFromBackground() {
    if (this.isRunning) {
      try {
        const response = await chrome.runtime.sendMessage({
          action: 'getTimerState',
        });

        if (response.success && response.timerState) {
          const state = response.timerState;

          // Calculate current time based on endTimestamp
          if (state.endTimestamp && state.isRunning) {
            const currentTimeLeft = Math.max(
              0,
              Math.ceil((state.endTimestamp - Date.now()) / 1000)
            );

            this.timeLeft = currentTimeLeft;
            this.updateDisplay();
            this.updateProgress();

            // Check if timer completed
            if (currentTimeLeft <= 0) {
              this.timerComplete();
            }
          } else if (!state.isRunning) {
            // Timer was stopped from another interface
            this.applyTimerState(state);
          }
        }
      } catch (error) {
        console.error('Error updating from background:', error);
      }
    }
  }

  /**
   * Setup storage change listener
   */
  setupStorageListener() {
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'timerStateUpdated') {
        this.applyTimerState(message.timerState);
      }
    });
  }

  /**
   * Update session tabs visual state
   */
  updateSessionTabs() {
    document.querySelectorAll('.session-tab').forEach((tab) => {
      tab.className =
        'session-tab bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm font-medium';
    });

    // Set active tab styling based on session type
    const activeTab = document.getElementById(
      this.currentSession === 'pomodoro'
        ? 'pomodoroTab'
        : this.currentSession === 'short-break'
        ? 'shortBreakTab'
        : this.currentSession === 'long-break'
        ? 'longBreakTab'
        : 'customTab'
    );

    if (activeTab) {
      const color =
        this.currentSession === 'pomodoro'
          ? 'red'
          : this.currentSession === 'short-break'
          ? 'green'
          : this.currentSession === 'long-break'
          ? 'blue'
          : 'purple';
      activeTab.className = `session-tab active bg-${color}-100 text-${color}-800 px-4 py-2 rounded-md text-sm font-medium`;
    }
  }

  /**
   * Update timer button states
   */
  updateTimerButtons() {
    const startBtn = document.getElementById('startButton');
    const pauseBtn = document.getElementById('pauseButton');

    if (this.isRunning) {
      if (startBtn) startBtn.classList.add('hidden');
      if (pauseBtn) pauseBtn.classList.remove('hidden');
    } else {
      if (startBtn) startBtn.classList.remove('hidden');
      if (pauseBtn) pauseBtn.classList.add('hidden');
    }
  }

  /**
   * Update custom input visibility
   */
  updateCustomInputVisibility() {
    const customInput = document.getElementById('customTimerInput');
    const placeholderSpace = document.getElementById('placeholderSpace');

    if (this.currentSession === 'custom') {
      // Show custom input, hide placeholder
      if (customInput) customInput.classList.remove('hidden');
      if (placeholderSpace) placeholderSpace.classList.add('hidden');

      // Update input values to match current session
      const minutes = Math.floor(this.totalTime / 60);
      const seconds = this.totalTime % 60;
      const minutesInput = document.getElementById('customMinutes');
      const secondsInput = document.getElementById('customSeconds');
      if (minutesInput) minutesInput.value = minutes;
      if (secondsInput) secondsInput.value = seconds;
    } else {
      // Show placeholder, hide custom input
      if (customInput) customInput.classList.add('hidden');
      if (placeholderSpace) placeholderSpace.classList.remove('hidden');
    }
  }

  /**
   * Get custom duration from input fields
   */
  getCustomDurationFromInputs() {
    const minutes =
      parseInt(document.getElementById('customMinutes').value) || 30;
    const seconds =
      parseInt(document.getElementById('customSeconds').value) || 0;
    return minutes * 60 + seconds;
  }

  /**
   * Start local timer countdown with whole-second boundary alignment
   * Does NOT send background messages - only manages local interval
   */
  startLocalTimer() {
    if (this.intervalId) return; // Already running

    const startBtn = document.getElementById('startButton');
    const pauseBtn = document.getElementById('pauseButton');

    if (startBtn) startBtn.classList.add('hidden');
    if (pauseBtn) pauseBtn.classList.remove('hidden');

    // Calculate endTimestamp from current state
    const endTs = Date.now() + this.timeLeft * 1000;

    const updateFromEndTs = () => {
      const remainingMs = Math.max(0, endTs - Date.now());
      this.timeLeft = Math.ceil(remainingMs / 1000);
      this.updateDisplay();
      this.updateProgress();
      if (remainingMs <= 0) this.timerComplete();
    };

    // Align to the next whole-second boundary
    const firstDelay = (endTs - Date.now()) % 1000 || 1000;
    this.stopLocalTimer(); // clear any interval/timeout
    this._alignTimeout = setTimeout(() => {
      updateFromEndTs(); // immediate tick on boundary
      this.intervalId = setInterval(updateFromEndTs, 1000);
    }, firstDelay);
  }

  /**
   * Stop local timer countdown (for sync from other interfaces)
   * Does NOT send background messages - only clears local interval and alignment timeout
   */
  stopLocalTimer() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this._alignTimeout) {
      clearTimeout(this._alignTimeout);
      this._alignTimeout = null;
    }

    const startBtn = document.getElementById('startButton');
    const pauseBtn = document.getElementById('pauseButton');

    if (startBtn) startBtn.classList.remove('hidden');
    if (pauseBtn) pauseBtn.classList.add('hidden');
  }

  /**
   * Test helper: fast-complete the current running session and credit full duration
   */
  async generateTestData() {
    // Require a running session
    if (!this.isRunning) {
      alert('Start a session first, then press Test Data.');
      return;
    }

    // Immediately stop local countdown to prevent UI from continuing
    // while background processes the fast-complete request
    this.stopLocalTimer();

    // Ask background to fast-complete the current session
    let res;
    try {
      if (typeof sendMessagePromise === 'function') {
        res = await sendMessagePromise({
          action: 'testCompleteSession',
          session: this.currentSession,
        });
      } else {
        res = await chrome.runtime.sendMessage({
          action: 'testCompleteSession',
          session: this.currentSession,
        });
      }
    } catch (e) {
      console.error('Error generating test data (message failed):', e);
      alert('Error generating test data. Check console for details.');
      return;
    }

    if (!(res && res.success)) {
      console.error('Error generating test data (background error):', res && res.error);
      alert('Error generating test data. Check console for details.');
      return;
    }

    // Success path: show credited notice and refresh UI/state
    const type = this.currentSession;
    const pretty =
      type === 'pomodoro'
        ? 'Pomodoro'
        : type === 'short-break'
        ? 'Short break'
        : type === 'long-break'
        ? 'Long break'
        : 'Custom';
    const minutes = Math.floor((this.totalTime || 0) / 60);
    console.log(`${pretty} fast-completed with full credit.`);
    alert(`Credited one full ${pretty}${minutes ? ` (${minutes} minutes)` : ''}.`);

    // Sync with background to reflect next session (break/focus) state
    try { await this.syncWithBackground(); } catch (_) {}
    // Refresh today's counters (defensive)
    try { await this.updateTodayCounters(); } catch (_) {}
  }

  /**
   * Cleanup when dashboard is closed
   */
  cleanup() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this._alignTimeout) {
      clearTimeout(this._alignTimeout);
      this._alignTimeout = null;
    }
  }
}

// Global dashboard timer instance
let dashboardTimer = null;

/**
 * Setup Dashboard Functionality
 * Initializes dashboard-specific features after content loads
 */
function setupDashboardFunctionality() {
  // Initialize the dashboard timer
  dashboardTimer = new DashboardTimer();

  // Settings button toggle functionality
  const settingsButton = document.getElementById('settingsButton');
  if (settingsButton) {
    settingsButton.addEventListener('click', function () {
      const settingsPanel = document.getElementById('settingsPanel');
      if (settingsPanel) {
        settingsPanel.classList.toggle('hidden');
      }
    });
  }
}

// Export functions if using modules, otherwise they're global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DashboardTimer,
    setupDashboardFunctionality,
    dashboardTimer,
  };
}
