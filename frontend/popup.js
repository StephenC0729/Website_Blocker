class PomodoroTimer {
    constructor() {
        this.sessions = {
            pomodoro: { duration: 25 * 60, label: 'Time to focus!' },
            'short-break': { duration: 5 * 60, label: 'Time for a short break!' },
            'long-break': { duration: 15 * 60, label: 'Time for a long break!' }
        };
        
        this.currentSession = 'pomodoro';
        this.timeLeft = this.sessions[this.currentSession].duration;
        this.totalTime = this.sessions[this.currentSession].duration;
        this.isRunning = false;
        this.sessionCount = 1;
        this.pomodoroCount = 0;
        this.intervalId = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateDisplay();
        this.updateSessionInfo();
    }

    setupEventListeners() {
        const sessionTabs = document.querySelectorAll('.session-tab');
        const startBtn = document.getElementById('startBtn');
        const resetBtn = document.getElementById('resetBtn');
        const settingsBtn = document.getElementById('settingsBtn');

        sessionTabs.forEach(tab => {
            tab.addEventListener('click', () => this.switchSession(tab.dataset.session));
        });

        startBtn.addEventListener('click', () => this.toggleTimer());
        resetBtn.addEventListener('click', () => this.resetTimer());
        settingsBtn.addEventListener('click', () => this.openSettings());
    }

    switchSession(sessionType) {
        if (this.isRunning) {
            this.stopTimer();
        }

        this.currentSession = sessionType;
        this.timeLeft = this.sessions[sessionType].duration;
        this.totalTime = this.sessions[sessionType].duration;
        
        document.querySelectorAll('.session-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-session="${sessionType}"]`).classList.add('active');
        
        document.body.className = sessionType;
        
        this.updateDisplay();
        this.updateSessionInfo();
        this.updateProgress();
    }

    toggleTimer() {
        if (this.isRunning) {
            this.stopTimer();
        } else {
            this.startTimer();
        }
    }

    startTimer() {
        this.isRunning = true;
        document.getElementById('startBtn').textContent = 'Pause';
        
        this.intervalId = setInterval(() => {
            this.timeLeft--;
            this.updateDisplay();
            this.updateProgress();
            
            if (this.timeLeft <= 0) {
                this.timerComplete();
            }
        }, 1000);
        
        chrome.runtime.sendMessage({
            action: 'timerStarted',
            session: this.currentSession,
            duration: this.totalTime
        });
    }

    stopTimer() {
        this.isRunning = false;
        document.getElementById('startBtn').textContent = 'Start';
        
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        chrome.runtime.sendMessage({
            action: 'timerStopped'
        });
    }

    resetTimer() {
        this.stopTimer();
        this.timeLeft = this.sessions[this.currentSession].duration;
        this.totalTime = this.sessions[this.currentSession].duration;
        this.updateDisplay();
        this.updateProgress();
    }

    timerComplete() {
        this.stopTimer();
        
        if (this.currentSession === 'pomodoro') {
            this.pomodoroCount++;
            this.sessionCount++;
            
            if (this.pomodoroCount % 4 === 0) {
                this.switchSession('long-break');
            } else {
                this.switchSession('short-break');
            }
        } else {
            this.switchSession('pomodoro');
            this.sessionCount++;
        }
        
        this.playNotification();
        this.updateSessionInfo();
        
        chrome.runtime.sendMessage({
            action: 'timerComplete',
            session: this.currentSession,
            pomodoroCount: this.pomodoroCount
        });
    }

    updateDisplay() {
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        document.getElementById('timerDisplay').textContent = display;
        document.title = `${display} - Pomodoro Timer`;
    }

    updateProgress() {
        const progress = ((this.totalTime - this.timeLeft) / this.totalTime) * 100;
        document.getElementById('progressFill').style.width = `${progress}%`;
    }

    updateSessionInfo() {
        document.getElementById('sessionCount').textContent = this.sessionCount;
        document.getElementById('sessionType').textContent = this.sessions[this.currentSession].label;
    }

    playNotification() {
        if (Notification.permission === 'granted') {
            const sessionLabel = this.sessions[this.currentSession].label;
            new Notification('Pomodoro Timer', {
                body: sessionLabel,
                icon: '/icon.png'
            });
        }
    }

    openSettings() {
        alert('Settings feature coming soon!');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
    }
    
    new PomodoroTimer();
});