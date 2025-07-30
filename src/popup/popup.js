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

    // Timer state variables
    this.currentSession = 'pomodoro'; // Current session type
    this.timeLeft = this.sessions[this.currentSession].duration; // Remaining time in seconds
    this.totalTime = this.sessions[this.currentSession].duration; // Total session duration for progress calculation
    this.isRunning = false; // Timer running state
    this.sessionCount = 1; // Total sessions completed
    this.pomodoroCount = 0; // Completed pomodoro sessions (for long break calculation)
    this.intervalId = null; // setInterval reference for cleanup

    // Initialize the timer interface
    this.init();
  }

  /**
   * Initialize the timer interface
   * Sets up event listeners and displays initial state
   */
  init() {
    this.setupEventListeners();
    this.updateDisplay();
    this.updateSessionInfo();
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
   * Updates timer state, UI appearance, and resets countdown
   * @param {string} sessionType - The session type to switch to
   */
  switchSession(sessionType) {
    // Stop timer if currently running
    if (this.isRunning) {
      this.stopTimer();
    }

    // Update session state
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
  toggleTimer() {
    if (this.isRunning) {
      this.stopTimer();
    } else {
      this.startTimer();
    }
  }

  /**
   * Start the countdown timer
   * Sets up 1-second interval for countdown updates
   * Sends message to background script for cross-tab synchronization
   */
  startTimer() {
    this.isRunning = true;
    document.getElementById('startBtn').textContent = 'Pause';

    // Set up countdown interval - updates every second
    this.intervalId = setInterval(() => {
      this.timeLeft--;
      this.updateDisplay(); // Update MM:SS display
      this.updateProgress(); // Update progress bar

      // Check if session is complete
      if (this.timeLeft <= 0) {
        this.timerComplete();
      }
    }, 1000);

    // Notify background script that timer started (for website blocking)
    chrome.runtime.sendMessage({
      action: 'timerStarted',
      session: this.currentSession,
      duration: this.totalTime,
    });
  }

  /**
   * Stop/Pause the countdown timer
   * Clears the interval and resets button text
   * Notifies background script that timer stopped
   */
  stopTimer() {
    this.isRunning = false;
    document.getElementById('startBtn').textContent = 'Start';

    // Clear the countdown interval
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Notify background script that timer stopped
    chrome.runtime.sendMessage({
      action: 'timerStopped',
    });
  }

  /**
   * Reset timer to the beginning of current session
   * Stops timer and restores full duration
   */
  resetTimer() {
    this.stopTimer();
    this.timeLeft = this.sessions[this.currentSession].duration;
    this.totalTime = this.sessions[this.currentSession].duration;
    this.updateDisplay();
    this.updateProgress();
  }

  /**
   * Handle timer completion - automatic session switching
   * Implements Pomodoro technique: 4 work sessions, then long break
   * Plays notification and updates session counters
   */
  timerComplete() {
    this.stopTimer();

    // Pomodoro technique logic for automatic session switching
    if (this.currentSession === 'pomodoro') {
      this.pomodoroCount++;
      this.sessionCount++;

      // After 4 pomodoros, take a long break; otherwise short break
      if (this.pomodoroCount % 4 === 0) {
        this.switchSession('long-break');
      } else {
        this.switchSession('short-break');
      }
    } else {
      // After any break, return to pomodoro
      this.switchSession('pomodoro');
      this.sessionCount++;
    }

    // Notify user and update display
    this.playNotification();
    this.updateSessionInfo();

    // Send completion data to background script for analytics
    chrome.runtime.sendMessage({
      action: 'timerComplete',
      session: this.currentSession,
      pomodoroCount: this.pomodoroCount,
    });
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
  playNotification() {
    if (Notification.permission === 'granted') {
      const sessionLabel = this.sessions[this.currentSession].label;
      new Notification('Pomodoro Timer', {
        body: sessionLabel,
        icon: '/icon.png',
      });
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
  // Request notification permission if not already granted or denied
  if (
    Notification.permission !== 'granted' &&
    Notification.permission !== 'denied'
  ) {
    Notification.requestPermission();
  }

  // Dashboard button navigation - opens full dashboard in new tab
  document.getElementById('dashboardBtn').addEventListener('click', function() {
    chrome.tabs.create({url: chrome.runtime.getURL('frontend/index.html')});
  });

  // Initialize the Pomodoro Timer
  new PomodoroTimer();
});
