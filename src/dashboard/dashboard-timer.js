/**
 * DashboardTimer Class
 * Mirrors popup Pomodoro behavior for the dashboard UI.
 * Wires start/pause/reset, updates display/progress, and syncs with background timer state.
 */
(function () {
  class DashboardTimer {
    constructor() {
      // Session configurations
      this.sessions = {
        pomodoro: { duration: 25 * 60, label: 'Time to focus!' },
        'short-break': { duration: 5 * 60, label: 'Time for a short break!' },
        'long-break': { duration: 15 * 60, label: 'Time for a long break!' },
        custom: { duration: 30 * 60, label: 'Custom timer session' },
      };

      // State
      this.currentSession = 'pomodoro';
      this.timeLeft = this.sessions[this.currentSession].duration;
      this.totalTime = this.sessions[this.currentSession].duration;
      this.isRunning = false;
      this.sessionCount = 1;
      this.pomodoroCount = 0;
      this.intervalId = null;
      this._alignTimeout = null;

      // Initialize
      this.init();
    }

    async init() {
      this.cacheDom();
      this.setupEventListeners();
      this.setupStorageListener();
      await this.syncWithBackground();
    }

    cacheDom() {
      this.$start = document.getElementById('startButton');
      this.$pause = document.getElementById('pauseButton');
      this.$reset = document.getElementById('resetButton');
      this.$display = document.getElementById('timerDisplay');
      this.$sessionType = document.getElementById('sessionType');
      this.$progress = document.getElementById('progressBar');

      // Tabs (focus first on Pomodoro)
      this.$tabPomodoro = document.getElementById('pomodoroTab');
      this.$tabShort = document.getElementById('shortBreakTab');
      this.$tabLong = document.getElementById('longBreakTab');
      this.$tabCustom = document.getElementById('customTab');

      // Custom inputs / placeholder
      this.$customTimerInput = document.getElementById('customTimerInput');
      this.$placeholderSpace = document.getElementById('placeholderSpace');
      this.$customMinutes = document.getElementById('customMinutes');
      this.$customSeconds = document.getElementById('customSeconds');
      this.$setCustomTimer = document.getElementById('setCustomTimer');
    }

    setupEventListeners() {
      if (this.$start)
        this.$start.addEventListener('click', () => this.startTimer());
      if (this.$pause)
        this.$pause.addEventListener('click', () => this.stopTimer());
      if (this.$reset)
        this.$reset.addEventListener('click', () => this.resetTimer());

      // Tabs - support pomodoro, breaks, and custom
      if (this.$tabPomodoro)
        this.$tabPomodoro.addEventListener('click', () =>
          this.switchSession('pomodoro')
        );
      if (this.$tabShort)
        this.$tabShort.addEventListener('click', () =>
          this.switchSession('short-break')
        );
      if (this.$tabLong)
        this.$tabLong.addEventListener('click', () =>
          this.switchSession('long-break')
        );
      if (this.$tabCustom)
        this.$tabCustom.addEventListener('click', () =>
          this.switchSession('custom')
        );

      // Set custom timer from inputs (persist via background)
      if (this.$setCustomTimer)
        this.$setCustomTimer.addEventListener('click', () =>
          this.applyCustomDurationFromInputs()
        );
    }

    applyCustomDurationFromInputs() {
      // Read and clamp inputs
      const minutes = Math.max(
        0,
        Math.min(999, parseInt(this.$customMinutes?.value || '0', 10) || 0)
      );
      const seconds = Math.max(
        0,
        Math.min(59, parseInt(this.$customSeconds?.value || '0', 10) || 0)
      );
      let total = minutes * 60 + seconds;
      if (!total || total <= 0) total = 60; // minimum 1 minute for UI

      // Persist via background and let state sync flow update UI
      this.switchSession('custom', { customDuration: total });
    }

    setupStorageListener() {
      try {
        chrome.runtime.onMessage.addListener((message) => {
          if (
            message &&
            message.action === 'timerStateUpdated' &&
            message.timerState
          ) {
            this.applyTimerState(message.timerState);
          }
        });
      } catch (e) {
        // Ignore if runtime not available
      }

      try {
        chrome.storage.onChanged.addListener((changes, areaName) => {
          if (
            areaName === 'local' &&
            changes.timerState &&
            changes.timerState.newValue
          ) {
            this.applyTimerState(changes.timerState.newValue);
          }
        });
      } catch (e) {
        // Ignore if storage not available
      }
    }

    async switchSession(sessionType, options = {}) {
      try {
        chrome.runtime.sendMessage({
          action: 'switchSession',
          session: sessionType,
          customDuration:
            sessionType === 'custom' &&
            typeof options.customDuration === 'number'
              ? options.customDuration
              : undefined,
        });
      } catch (e) {}
    }

    async startTimer() {
      // Optional unified mode start
      try {
        const settings = await this.getSettings();
        if (settings.unifiedModeEnabled && this.currentSession === 'pomodoro') {
          chrome.runtime.sendMessage({
            action: 'focusStart',
            sessionId: Date.now().toString(),
            session: this.currentSession,
            duration: this.totalTime,
          });
        }
      } catch (e) {}

      try {
        chrome.runtime.sendMessage({
          action: 'timerStarted',
          session: this.currentSession,
          duration: this.totalTime,
          timeLeft: this.timeLeft,
        });
      } catch (e) {}
    }

    async stopTimer() {
      // Optional unified mode stop
      try {
        const settings = await this.getSettings();
        if (settings.unifiedModeEnabled && this.currentSession === 'pomodoro') {
          chrome.runtime.sendMessage({ action: 'focusStop' });
        }
      } catch (e) {}

      try {
        chrome.runtime.sendMessage({ action: 'timerStopped' });
      } catch (e) {}
    }

    async resetTimer() {
      try {
        chrome.runtime.sendMessage({
          action: 'timerReset',
          session: this.currentSession,
        });
      } catch (e) {}
    }

    async timerComplete() {
      await this.stopTimer();
      try {
        chrome.runtime.sendMessage({
          action: 'timerComplete',
          session: this.currentSession,
          pomodoroCount: this.pomodoroCount,
        });
      } catch (e) {}

      // Re-sync from background which may handle session switching
      await this.syncWithBackground();
    }

    updateDisplay() {
      const minutes = Math.floor(this.timeLeft / 60);
      const seconds = this.timeLeft % 60;
      const display = `${minutes.toString().padStart(2, '0')}:${seconds
        .toString()
        .padStart(2, '0')}`;
      if (this.$display) this.$display.textContent = display;
    }

    updateProgress() {
      if (!this.$progress || !this.totalTime) return;
      const pct = Math.max(
        0,
        Math.min(100, ((this.totalTime - this.timeLeft) / this.totalTime) * 100)
      );
      this.$progress.style.width = `${pct}%`;
    }

    updateSessionInfo() {
      if (!this.$sessionType) return;
      const label =
        this.sessions[this.currentSession]?.label ||
        this.sessions['pomodoro'].label;
      this.$sessionType.textContent = label;

      // Sync custom inputs with current custom duration
      if (
        this.currentSession === 'custom' &&
        this.$customMinutes &&
        this.$customSeconds
      ) {
        const total = typeof this.totalTime === 'number' ? this.totalTime : 0;
        const mins = Math.floor(total / 60);
        const secs = total % 60;
        try {
          this.$customMinutes.value = String(mins);
          this.$customSeconds.value = String(secs);
        } catch (e) {}
      }
    }

    updateButtons() {
      if (!this.$start || !this.$pause) return;
      if (this.isRunning) {
        this.$start.classList.add('hidden');
        this.$pause.classList.remove('hidden');
      } else {
        this.$pause.classList.add('hidden');
        this.$start.classList.remove('hidden');
      }
    }

    updateSessionTabs() {
      const map = {
        pomodoro: this.$tabPomodoro,
        'short-break': this.$tabShort,
        'long-break': this.$tabLong,
        custom: this.$tabCustom,
      };
      const allTabs = [
        this.$tabPomodoro,
        this.$tabShort,
        this.$tabLong,
        this.$tabCustom,
      ].filter(Boolean);

      const activeEl = map[this.currentSession];
      const activeColorMap = {
        pomodoro: { bg: 'bg-red-100', text: 'text-red-800' },
        'short-break': { bg: 'bg-green-100', text: 'text-green-800' },
        'long-break': { bg: 'bg-purple-100', text: 'text-purple-800' },
        custom: { bg: 'bg-blue-100', text: 'text-blue-800' },
      };
      const removeColors = [
        'bg-red-100',
        'text-red-800',
        'bg-green-100',
        'text-green-800',
        'bg-purple-100',
        'text-purple-800',
        'bg-gray-100',
        'text-gray-700',
        'bg-blue-100',
        'text-blue-800',
      ];

      allTabs.forEach((el) => {
        el.classList.remove('active');
        removeColors.forEach((c) => el.classList.remove(c));
        // default inactive appearance
        el.classList.add('bg-gray-100', 'text-gray-700');
        el.setAttribute('aria-selected', 'false');
      });

      if (activeEl) {
        const colors =
          activeColorMap[this.currentSession] || activeColorMap.pomodoro;
        activeEl.classList.add('active');
        activeEl.classList.remove('bg-gray-100', 'text-gray-700');
        activeEl.classList.add(colors.bg, colors.text);
        activeEl.setAttribute('aria-selected', 'true');
      }
    }

    updateThemeForSession() {
      if (!this.$progress) return;
      const progressColors = [
        'bg-red-600',
        'bg-green-600',
        'bg-purple-600',
        'bg-blue-600',
      ];
      progressColors.forEach((c) => this.$progress.classList.remove(c));

      const colorMap = {
        pomodoro: 'bg-red-600',
        'short-break': 'bg-green-600',
        'long-break': 'bg-purple-600',
        custom: 'bg-blue-600',
      };
      const chosen = colorMap[this.currentSession] || colorMap.pomodoro;
      this.$progress.classList.add(chosen);
    }

    updateCustomInputsVisibility() {
      const isCustom = this.currentSession === 'custom';
      if (this.$customTimerInput)
        this.$customTimerInput.classList.toggle('hidden', !isCustom);
      if (this.$placeholderSpace)
        this.$placeholderSpace.classList.toggle('hidden', isCustom);
    }

    startLocalTimer() {
      if (this.intervalId) return;

      const endTs = Date.now() + this.timeLeft * 1000;
      const updateFromEndTs = () => {
        const remainingMs = Math.max(0, endTs - Date.now());
        this.timeLeft = Math.ceil(remainingMs / 1000);
        this.updateDisplay();
        this.updateProgress();
        if (remainingMs <= 0) this.timerComplete();
      };

      // Align to whole-second boundary
      const firstDelay = (endTs - Date.now()) % 1000 || 1000;
      this.stopLocalTimer();
      this._alignTimeout = setTimeout(() => {
        updateFromEndTs();
        this.intervalId = setInterval(updateFromEndTs, 1000);
      }, firstDelay);
    }

    stopLocalTimer() {
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
      if (this._alignTimeout) {
        clearTimeout(this._alignTimeout);
        this._alignTimeout = null;
      }
    }

    async syncWithBackground() {
      try {
        const local = await chrome.storage.local.get(['timerState']);
        if (local && local.timerState) {
          this.applyTimerState(local.timerState);
          return;
        }
      } catch (e) {}

      try {
        const response = await chrome.runtime.sendMessage({
          action: 'getTimerState',
        });
        if (response && response.success && response.timerState) {
          this.applyTimerState(response.timerState);
        } else {
          // Ensure UI renders with defaults
          this.updateDisplay();
          this.updateSessionInfo();
          this.updateProgress();
          this.updateButtons();
          this.updateSessionTabs();
          this.updateThemeForSession();
          this.updateCustomInputsVisibility();
        }
      } catch (e) {
        this.updateDisplay();
        this.updateSessionInfo();
        this.updateProgress();
        this.updateButtons();
        this.updateSessionTabs();
        this.updateThemeForSession();
        this.updateCustomInputsVisibility();
      }
    }

    applyTimerState(state) {
      const wasRunning = this.isRunning;

      this.currentSession = state.currentSession || this.currentSession;
      this.totalTime =
        typeof state.totalTime === 'number' ? state.totalTime : this.totalTime;
      this.sessionCount =
        typeof state.sessionCount === 'number'
          ? state.sessionCount
          : this.sessionCount;
      this.pomodoroCount =
        typeof state.pomodoroCount === 'number'
          ? state.pomodoroCount
          : this.pomodoroCount;

      if (state.isRunning && state.endTimestamp) {
        this.timeLeft = Math.max(
          0,
          Math.ceil((state.endTimestamp - Date.now()) / 1000)
        );
      } else if (typeof state.timeLeft === 'number') {
        this.timeLeft = state.timeLeft;
      }

      this.isRunning = !!state.isRunning;

      // Start/stop local aligned countdown based on background state
      if (this.isRunning && !wasRunning) {
        this.startLocalTimer();
      } else if (!this.isRunning && wasRunning) {
        this.stopLocalTimer();
      }

      this.updateDisplay();
      this.updateSessionInfo();
      this.updateProgress();
      this.updateButtons();
      this.updateSessionTabs();
      this.updateThemeForSession();
      this.updateCustomInputsVisibility();
    }

    async getSettings() {
      try {
        const response = await chrome.runtime.sendMessage({
          action: 'getSettings',
        });
        if (response && response.success) return response.settings || {};
      } catch (e) {}
      return { unifiedModeEnabled: false };
    }

    cleanup() {
      this.stopLocalTimer();
    }
  }

  // Expose setup function
  window.setupDashboardFunctionality = function () {
    if (
      window.dashboardTimer &&
      typeof window.dashboardTimer.cleanup === 'function'
    ) {
      window.dashboardTimer.cleanup();
    }
    window.dashboardTimer = new DashboardTimer();
  };
})();
