export async function get(keys) {
    try {
        return await chrome.storage.local.get(keys);
    } catch (error) {
        console.error('Storage get error:', error);
        return {};
    }
}

export async function set(data) {
    try {
        await chrome.storage.local.set(data);
    } catch (error) {
        console.error('Storage set error:', error);
    }
}

export async function merge(data) {
    try {
        const existing = await chrome.storage.local.get(Object.keys(data));
        const merged = { ...existing, ...data };
        await chrome.storage.local.set(merged);
    } catch (error) {
        console.error('Storage merge error:', error);
    }
}

export async function initializeStorage() {
    try {
        const result = await chrome.storage.local.get(['blockedSites', 'timerState']);
        
        if (!result.blockedSites) {
            await chrome.storage.local.set({ blockedSites: [] });
        }
        
        if (!result.timerState) {
            await chrome.storage.local.set({ 
                timerState: {
                    isRunning: false,
                    currentSession: 'pomodoro',
                    timeLeft: 25 * 60,
                    totalTime: 25 * 60,
                    startTimestamp: null,
                    sessionCount: 1,
                    pomodoroCount: 0,
                    sessions: {
                        pomodoro: { duration: 25 * 60, label: 'Time to focus!' },
                        'short-break': { duration: 5 * 60, label: 'Time for a short break!' },
                        'long-break': { duration: 15 * 60, label: 'Time for a long break!' },
                        custom: { duration: 30 * 60, label: 'Custom timer session' }
                    }
                }
            });
        }
    } catch (error) {
        console.error('Error initializing storage:', error);
    }
}