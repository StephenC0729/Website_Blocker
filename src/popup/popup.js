/**
 * PomodoroTimer Class
 * Manages the Pomodoro technique timer with three session types:
 * - Pomodoro (25min work sessions)
 * - Short Break (5min breaks)
 * - Long Break (15min breaks after 4 pomodoros)
 */
class PomodoroTimer {
  constructor() {
    // Session configurations with duration in seconds and display labels
    this.sessions = {
      pomodoro: { duration: 25 * 60, label: 'Time to focus!' },
      'short-break': { duration: 5 * 60, label: 'Time for a short break!' },
      'long-break': { duration: 15 * 60, label: 'Time for a long break!' },
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
    // Initialize the timer interface
    this.init();
  }

  /**
   * Initialize the timer interface
   * Sets up event listeners and syncs with background state
   */
  async init() {
    this.setupEventListeners();
    this.setupStorageListener();
    await this.syncWithBackground();
    // UI updates now happen in applyTimerState after sync completes
  }

  /**
   * Set up event listeners for user interface interactions
   * Binds session tabs, start/pause, and reset buttons
   */
  setupEventListeners() {
    const sessionTabs = document.querySelectorAll('.session-tab');
    const startBtn = document.getElementById('startBtn');
    const resetBtn = document.getElementById('resetBtn');

    // Session tab switching - allows user to select Pomodoro/Break types
    sessionTabs.forEach((tab) => {
      tab.addEventListener('click', () =>
        this.switchSession(tab.dataset.session)
      );
    });

    // Timer control buttons
    startBtn.addEventListener('click', () => this.toggleTimer());
    resetBtn.addEventListener('click', () => this.resetTimer());
  }

  /**
   * Switch between session types (Pomodoro, Short Break, Long Break)
   * Updates timer state, UI appearance, and syncs with background
   * @param {string} sessionType - The session type to switch to
   */
  async switchSession(sessionType) {
    // Stop timer if currently running
    if (this.isRunning) {
      await this.stopTimer();
    }

    // Notify background script about session switch
    chrome.runtime.sendMessage({
      action: 'switchSession',
      session: sessionType,
    });

    // Update local state (will be synced from background)
    this.currentSession = sessionType;
    this.timeLeft = this.sessions[sessionType].duration;
    this.totalTime = this.sessions[sessionType].duration;

    // Update tab visual states - remove active from all, add to current
    document.querySelectorAll('.session-tab').forEach((tab) => {
      tab.classList.remove('active');
    });
    document
      .querySelector(`[data-session="${sessionType}"]`)
      .classList.add('active');

    // Change background color theme based on session type
    document.body.className = sessionType;

    // Update all display elements
    this.updateDisplay();
    this.updateSessionInfo();
    this.updateProgress();
  }

  /**
   * Toggle timer between start and pause states
   * Changes button text and calls appropriate start/stop methods
   */
  async toggleTimer() {
    if (this.isRunning) {
      await this.stopTimer();
    } else {
      await this.startTimer();
    }
  }

  /**
   * Start the countdown timer
   * Syncs with background script for cross-interface synchronization
   */
  async startTimer() {
    // Notify background script that timer started
    chrome.runtime.sendMessage({
      action: 'timerStarted',
      session: this.currentSession,
      duration: this.totalTime,
      timeLeft: this.timeLeft,
    });

    // Update local state
    this.isRunning = true;
    document.getElementById('startBtn').textContent = 'Pause';

    // Start local countdown for smooth UI updates
    this.intervalId = setInterval(() => {
      this.timeLeft--;
      this.updateDisplay();
      this.updateProgress();

      // Check if timer completed
      if (this.timeLeft <= 0) {
        this.timerComplete();
      }
    }, 1000);
  }

  /**
   * Stop/Pause the countdown timer
   * Syncs pause state with background script
   */
  async stopTimer() {
    // Notify background script that timer stopped
    chrome.runtime.sendMessage({
      action: 'timerStopped',
    });

    // Update local state
    this.isRunning = false;
    document.getElementById('startBtn').textContent = 'Start';

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

  /**
   * Reset timer to the beginning of current session
   * Syncs reset state with background script
   */
  async resetTimer() {
    await this.stopTimer();

    // Notify background script about timer reset
    chrome.runtime.sendMessage({
      action: 'timerReset',
      session: this.currentSession,
    });

    // Update local state (will be synced from background)
    this.timeLeft = this.sessions[this.currentSession].duration;
    this.totalTime = this.sessions[this.currentSession].duration;
    this.updateDisplay();
    this.updateProgress();
  }

  /**
   * Handle timer completion - automatic session switching
   * Syncs completion with background script
   */
  async timerComplete() {
    await this.stopTimer();

    // Notify background script about timer completion
    chrome.runtime.sendMessage({
      action: 'timerComplete',
      session: this.currentSession,
      pomodoroCount: this.pomodoroCount,
    });

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

  /**
   * Update the main timer display (MM:SS format)
   * Also updates the browser tab title for visibility when minimized
   */
  updateDisplay() {
    const minutes = Math.floor(this.timeLeft / 60);
    const seconds = this.timeLeft % 60;
    const display = `${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;

    // Update main timer display
    document.getElementById('timerDisplay').textContent = display;
    // Update browser tab title so timer is visible even when tab is not active
    document.title = `${display} - Pomodoro Timer`;
  }

  /**
   * Update the progress bar based on session completion percentage
   * Visual indicator of how much time has elapsed in current session
   */
  updateProgress() {
    const progress = ((this.totalTime - this.timeLeft) / this.totalTime) * 100;
    document.getElementById('progressFill').style.width = `${progress}%`;
  }

  /**
   * Update session information text
   * Shows current session number and motivational message
   */
  updateSessionInfo() {
    document.getElementById('sessionCount').textContent = this.sessionCount;
    document.getElementById('sessionType').textContent =
      this.sessions[this.currentSession].label;
  }

  /**
   * Play browser notification when session completes
   * Only shows if user has granted notification permission
   */
  playNotification(messageOverride) {
    // Play audio notification (always, regardless of browser notification permission)
    this.playAudioNotification();
  }


  playAudioNotification() {
    try {
      const audioUrl = chrome.runtime.getURL(
        'src/assets/sounds/notification.mp3'
      );
      const audio = new Audio(audioUrl);
      audio.volume = 0.7; // Adjust volume (0.0 to 1.0)
      audio.play().catch((error) => {
        console.log(
          'Audio notification failed (user interaction may be required):',
          error
        );
      });
    } catch (error) {
      console.error('Error playing audio notification:', error);
    }
  }

  /**
   * Synchronization Methods for Background Communication
   */

  /**
   * Sync local state with optimized strategy: storage first, then background fallback
   */
  async syncWithBackground() {
    try {
      // Strategy: Try storage first (faster), then background as fallback
      const result = await chrome.storage.local.get(['timerState']);
      if (result.timerState) {
        console.log('Popup syncing with storage state:', result.timerState);
        this.applyTimerState(result.timerState);
        return;
      }

      // Fallback: get from background script if storage is empty
      const response = await chrome.runtime.sendMessage({
        action: 'getTimerState',
      });

      if (response && response.success && response.timerState) {
        console.log(
          'Popup syncing with background state:',
          response.timerState
        );
        this.applyTimerState(response.timerState);
      }
    } catch (error) {
      console.error('Error syncing with background/storage:', error);
      // If all fails, ensure UI still renders with default state
      this.updateDisplay();
      this.updateSessionInfo();
    }
  }

  /**
   * Apply timer state from background script
   */
  applyTimerState(timerState) {
    const wasRunning = this.isRunning;

    console.log('Popup applying timer state:', {
      wasRunning,
      newIsRunning: timerState.isRunning,
      currentSession: timerState.currentSession,
      timeLeft: timerState.timeLeft,
      endTimestamp: timerState.endTimestamp,
    });

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
      console.log(
        'Timer running - calculated timeLeft:',
        this.timeLeft,
        'from endTimestamp:',
        timerState.endTimestamp
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
      console.log('Starting local timer from sync');
      this.startLocalTimer();
    } else if (!this.isRunning && wasRunning) {
      // Timer was stopped from another interface - stop local countdown
      console.log('Stopping local timer from sync');
      this.stopLocalTimer();
    }

    // Update UI to reflect current state
    this.updateDisplay();
    this.updateSessionInfo();
    this.updateProgress();
    this.updateSessionTabs();
    this.updateTimerButton();

    // Immediate tick after state applied - eliminates waiting for first interval
    this.immediateDisplayUpdate();
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

    // Also listen for Chrome Storage changes directly
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && changes.timerState) {
        this.applyTimerState(changes.timerState.newValue);
      }
    });
  }

  /**
   * Update session tabs visual state
   */
  updateSessionTabs() {
    document.querySelectorAll('.session-tab').forEach((tab) => {
      tab.classList.remove('active');
    });

    const activeTab = document.querySelector(
      `[data-session="${this.currentSession}"]`
    );
    if (activeTab) {
      activeTab.classList.add('active');
    }

    // Update body theme
    document.body.className = this.currentSession;
  }

  /**
   * Update timer button state
   */
  updateTimerButton() {
    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
      startBtn.textContent = this.isRunning ? 'Pause' : 'Start';
    }
  }

  /**
   * Start local timer countdown with whole-second boundary alignment
   */
  startLocalTimer() {
    if (this.intervalId) return; // Already running

    document.getElementById('startBtn').textContent = 'Pause';

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
    document.getElementById('startBtn').textContent = 'Start';
  }

  /**
   * Immediate display update after state sync - eliminates tick wait
   */
  immediateDisplayUpdate() {
    if (this.isRunning) {
      // For running timers, ensure display shows exact current time
      this.updateDisplay();
      this.updateProgress();
    }
  }

  /**
   * Cleanup when popup closes
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

  /**
   * Placeholder for settings functionality
   * Will be implemented when settings panel is created
   */
  openSettings() {
    alert('Settings feature coming soon!');
  }
}

/**
 * Initialize popup when DOM is fully loaded
 * Sets up notification permissions and dashboard navigation
 */
document.addEventListener('DOMContentLoaded', () => {

  // Dashboard button navigation - opens full dashboard in new tab
  document
    .getElementById('dashboardBtn')
    .addEventListener('click', function () {
      chrome.tabs.create({
        url: chrome.runtime.getURL('src/dashboard/index.html'),
      });
    });

  // Initialize the Pomodoro Timer
  const timer = new PomodoroTimer();

  // Cleanup when popup is closed/hidden
  window.addEventListener('beforeunload', () => {
    timer.cleanup();
  });

  // Cleanup when popup loses focus (Chrome extension specific)
  window.addEventListener('blur', () => {
    timer.cleanup();
  });
});
