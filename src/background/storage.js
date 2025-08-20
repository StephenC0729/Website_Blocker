/**
 * Retrieve data from Chrome extension local storage
 * @param {string|string[]|Object} keys - Keys to retrieve from storage
 * @returns {Promise<Object>} Retrieved data object
 */
export async function get(keys) {
    try {
        return await chrome.storage.local.get(keys);
    } catch (error) {
        console.error('Storage get error:', error);
        return {};
    }
}

/**
 * Store data in Chrome extension local storage
 * @param {Object} data - Data object to store
 */
export async function set(data) {
    try {
        await chrome.storage.local.set(data);
    } catch (error) {
        console.error('Storage set error:', error);
    }
}


/**
 * Initialize extension storage with default values for timerState and settings
 * Sets up default pomodoro timer configuration and unified mode settings
 */
export async function initializeStorage() {
    try {
        const result = await chrome.storage.local.get(['timerState', 'settings']);
        
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

        if (!result.settings) {
            await chrome.storage.local.set({
                settings: {
                    unifiedModeEnabled: false,
                    focusCategoryId: 'general',
                    breakCategoryId: null
                }
            });
        }
    } catch (error) {
        console.error('Error initializing storage:', error);
    }
}