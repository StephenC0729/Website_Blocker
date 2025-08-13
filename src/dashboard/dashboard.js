/**
 * Dashboard Application Logic
 * Handles dynamic content loading, navigation, and page management
 */

/**
 * Page Configuration Object
 * Defines available pages with their titles and content files
 */
const pageConfig = {
  dashboard: {
    title:
      '<i class="fas fa-chart-line text-blue-500 mr-2"></i>Productivity Dashboard',
    file: 'components/dashboard-content.html',
  },
  blocklist: {
    title:
      '<i class="fas fa-ban text-red-500 mr-2"></i>Blocklist Set Management',
    file: 'components/blocklist-content.html',
  },
  about: {
    title:
      '<i class="fas fa-info-circle text-blue-500 mr-2"></i>About App Blocker',
    file: 'components/about-content.html',
  },
  faq: {
    title:
      '<i class="fas fa-question-circle text-blue-500 mr-2"></i>Frequently Asked Questions',
    file: 'components/faq-content.html',
  },
};

// Current active page state
let currentPage = 'dashboard';

/**
 * Load Content Function
 * Dynamically loads page content from separate HTML files
 * @param {string} page - The page identifier to load
 */
async function loadContent(page) {
  try {
    const config = pageConfig[page];
    if (!config) return;

    // Fetch the content file
    const response = await fetch(config.file);
    const contentHTML = await response.text();

    // Update DOM with new content
    document.getElementById('content-container').innerHTML = contentHTML;
    document.getElementById('pageTitle').innerHTML = config.title;

    // Cleanup previous page if it was dashboard
    if (currentPage === 'dashboard' && dashboardTimer) {
      dashboardTimer.cleanup();
      dashboardTimer = null;
    }

    // Initialize page-specific functionality
    if (page === 'dashboard') {
      setupDashboardFunctionality();
    } else if (page === 'faq') {
      setupFAQFunctionality();
    } else if (page === 'blocklist') {
      setupSimpleBlocklist();
    }

    currentPage = page;
  } catch (error) {
    console.error('Error loading content:', error);
  }
}

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
    this.init();
  }

  async init() {
    this.setupEventListeners();
    this.setupStorageListener();
    await this.syncWithBackground();
    this.updateDisplay();
    this.updateSessionInfo();
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
    // Notify background script that timer started
    chrome.runtime.sendMessage({
      action: 'timerStarted',
      session: this.currentSession,
      duration: this.totalTime,
      timeLeft: this.timeLeft,
    });

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
    chrome.runtime.sendMessage({
      action: 'timerStopped',
    });

    // Update local state
    this.isRunning = false;
    const startBtn = document.getElementById('startButton');
    const pauseBtn = document.getElementById('pauseButton');

    if (startBtn) startBtn.classList.remove('hidden');
    if (pauseBtn) pauseBtn.classList.add('hidden');

    // Clear the local update interval
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

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

  async timerComplete() {
    await this.stopTimer();

    // Notify background script about timer completion
    chrome.runtime.sendMessage({
      action: 'timerComplete',
      session: this.currentSession,
      pomodoroCount: this.pomodoroCount,
    });

    // Play notification
    this.playNotification();

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

  playNotification() {
    if (Notification.permission === 'granted') {
      const sessionLabel = this.sessions[this.currentSession].label;
      new Notification('Productivity Timer', {
        body: sessionLabel,
        icon: '/src/assets/icons/Icon.png',
      });
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
    this.currentSession = timerState.currentSession;
    this.timeLeft = timerState.timeLeft;
    this.totalTime = timerState.totalTime;
    this.isRunning = timerState.isRunning;
    this.sessionCount = timerState.sessionCount;
    this.pomodoroCount = timerState.pomodoroCount;

    // Update sessions if they exist in the state
    if (timerState.sessions) {
      this.sessions = timerState.sessions;
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

          // Calculate current time based on timestamp
          if (state.startTimestamp && state.isRunning) {
            const elapsed = Math.floor(
              (Date.now() - state.startTimestamp) / 1000
            );
            const currentTimeLeft = Math.max(0, state.timeLeft - elapsed);

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
   * Cleanup when dashboard is closed
   */
  cleanup() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
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

  // Request notification permission
  if (
    Notification.permission !== 'granted' &&
    Notification.permission !== 'denied'
  ) {
    Notification.requestPermission();
  }
}

/**
 * Setup FAQ Functionality
 * Initializes accordion behavior for FAQ questions
 */
function setupFAQFunctionality() {
  // FAQ Accordion functionality
  document.querySelectorAll('.faq-question').forEach((button) => {
    button.addEventListener('click', () => {
      const answer = button.nextElementSibling;
      const icon = button.querySelector('i');

      // Close other FAQ items (accordion behavior)
      document.querySelectorAll('.faq-answer').forEach((otherAnswer) => {
        if (otherAnswer !== answer) {
          otherAnswer.classList.remove('open');
          const otherIcon =
            otherAnswer.previousElementSibling.querySelector('i');
          otherIcon.style.transform = 'rotate(0deg)';
        }
      });

      // Toggle current FAQ item
      answer.classList.toggle('open');

      // Rotate chevron icon for visual feedback
      if (answer.classList.contains('open')) {
        icon.style.transform = 'rotate(180deg)';
      } else {
        icon.style.transform = 'rotate(0deg)';
      }
    });
  });
}

/**
 * Update Navigation Active State
 * Updates visual state of navigation links to show current page
 * @param {string} activePage - The currently active page
 */
function updateNavigation(activePage) {
  document.querySelectorAll('.nav-link').forEach((link) => {
    const page = link.getAttribute('data-page');
    if (page === activePage) {
      // Active state styling with dark mode support
      link.className = 'nav-link nav-link-active';
    } else {
      // Default state styling with dark mode support
      link.className = 'nav-link nav-link-inactive';
    }
  });
}

/**
 * Load Navigation
 * Loads sidebar navigation and sets up event listeners
 */
async function loadNavigation() {
  try {
    // Fetch and load navigation HTML
    const response = await fetch('navigation.html');
    const navigationHTML = await response.text();
    document.getElementById('navigation-container').innerHTML = navigationHTML;

    // Setup authentication button (placeholder functionality)
    document
      .getElementById('authButton')
      .addEventListener('click', function () {
        alert('Authentication feature coming soon!');
      });

    // Setup navigation link click handlers
    document.querySelectorAll('.nav-link').forEach((link) => {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        const page = this.getAttribute('data-page');
        loadContent(page);
        updateNavigation(page);
      });
    });

    // Load default content (dashboard)
    loadContent('dashboard');
  } catch (error) {
    console.error('Error loading navigation:', error);
  }
}

/**
 * Dark Mode Toggle Functionality
 * Handles theme switching between light and dark modes
 */
function initializeDarkMode() {
  const darkModeToggle = document.getElementById('darkModeToggle');

  // Check for saved theme preference or default to light mode
  const savedTheme = localStorage.getItem('theme') || 'light';

  // Apply saved theme
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  // Toggle dark mode on button click
  darkModeToggle.addEventListener('click', function () {
    document.documentElement.classList.toggle('dark');

    if (document.documentElement.classList.contains('dark')) {
      localStorage.setItem('theme', 'dark');
    } else {
      localStorage.setItem('theme', 'light');
    }
  });
}

/**
 * Application Initialization
 * Loads navigation and sets up the dashboard when DOM is ready
 */
document.addEventListener('DOMContentLoaded', function () {
  loadNavigation();
  initializeDarkMode();
});

/**
 * Cleanup when dashboard window is closed
 */
window.addEventListener('beforeunload', () => {
  if (dashboardTimer) {
    dashboardTimer.cleanup();
    dashboardTimer = null;
  }
});

/**
 * Simple Blocklist (MVP) Logic
 * Uses existing background actions: getBlockedSites, addBlockedSite, removeBlockedSite
 */
function setupSimpleBlocklist() {
  const form = document.getElementById('addBlockedSiteForm');
  const input = document.getElementById('addSiteInput');
  const listEl = document.getElementById('blockedSitesList');
  const emptyEl = document.getElementById('blockedSitesEmpty');
  const feedbackEl = document.getElementById('blocklistFeedback');

  if (!form || !input || !listEl) return; // UI not present

  // Load existing sites
  refreshBlockedSites();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const raw = (input.value || '').trim();
    if (!raw) return showFeedback('Please enter a site.', 'error');
    const normalized = normalizeDomain(raw);
    if (!normalized) return showFeedback('Invalid domain.', 'error');
    try {
      await sendMessagePromise({ action: 'addBlockedSite', url: normalized });
      input.value = '';
      showFeedback(`Added ${normalized}`, 'success');
      refreshBlockedSites();
    } catch (err) {
      showFeedback('Error adding site.', 'error');
      console.error(err);
    }
  });

  async function refreshBlockedSites() {
    try {
      const res = await sendMessagePromise({ action: 'getBlockedSites' });
      if (!res || !res.success) throw new Error('Failed');
      const sites = res.sites || [];
      listEl.innerHTML = '';
      if (!sites.length) {
        emptyEl && emptyEl.classList.remove('hidden');
      } else {
        emptyEl && emptyEl.classList.add('hidden');
      }
      sites.sort((a, b) => a.localeCompare(b, 'en')); // deterministic order
      sites.forEach((site) => {
        const li = document.createElement('li');
        li.className = 'flex items-center justify-between py-2';
        li.innerHTML = `
                    <div class="flex items-center gap-2">
                        <span class="text-sm text-gray-800">${escapeHtml(
                          site
                        )}</span>
                    </div>
                    <button data-site="${site}" class="text-red-500 hover:text-red-700 text-xs font-medium remove-blocked-site">Remove</button>
                `;
        listEl.appendChild(li);
      });
      // Attach remove handlers
      listEl.querySelectorAll('.remove-blocked-site').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const site = btn.getAttribute('data-site');
          try {
            await sendMessagePromise({
              action: 'removeBlockedSite',
              url: site,
            });
            showFeedback(`Removed ${site}`, 'success');
            refreshBlockedSites();
          } catch (err) {
            console.error(err);
            showFeedback('Error removing site.', 'error');
          }
        });
      });
    } catch (err) {
      console.error('Error loading blocked sites', err);
      showFeedback('Error loading blocked sites.', 'error');
    }
  }

  function showFeedback(message, type) {
    if (!feedbackEl) return;
    feedbackEl.textContent = message;
    feedbackEl.className =
      'text-sm mb-3 ' +
      (type === 'success' ? 'text-green-600' : 'text-red-600');
    feedbackEl.classList.remove('hidden');
    clearTimeout(showFeedback._t);
    showFeedback._t = setTimeout(
      () => feedbackEl.classList.add('hidden'),
      3500
    );
  }

  function normalizeDomain(input) {
    try {
      let value = input.trim();
      if (!value) return '';
      if (!/^https?:\/\//i.test(value)) {
        value = 'https://' + value; // so URL can parse
      }
      const url = new URL(value);
      return url.hostname.replace(/^www\./, '');
    } catch {
      // fallback simple domain regex
      const m = input.match(/^([a-z0-9-]+\.)+[a-z]{2,}$/i);
      return m ? input.replace(/^www\./, '').toLowerCase() : '';
    }
  }

  function escapeHtml(str) {
    return str.replace(
      /[&<>"] /g,
      (c) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          ' ': '&nbsp;',
        }[c] || c)
    );
  }

  function sendMessagePromise(msg) {
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage(msg, (response) => {
          if (chrome.runtime.lastError) {
            return reject(chrome.runtime.lastError);
          }
          resolve(response);
        });
      } catch (e) {
        reject(e);
      }
    });
  }
}
