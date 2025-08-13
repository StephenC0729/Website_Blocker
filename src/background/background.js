class AppBlockerService {
    constructor() {
        this.init();
    }

    init() {
        this.setupMessageListener();
        this.setupWebNavigation();
        this.initializeStorage();
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
            return true;
        });
    }

    setupWebNavigation() {
        chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
            if (details.frameId === 0) {
                await this.checkAndBlockUrl(details.url, details.tabId);
            }
        });
    }

    async initializeStorage() {
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
                        timeLeft: 25 * 60, // 25 minutes in seconds
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

    async handleMessage(request, sender, sendResponse) {
        try {
            switch (request.action) {
                case 'getBlockedSites':
                    const sites = await this.getBlockedSites();
                    sendResponse({ success: true, sites });
                    break;
                
                case 'addBlockedSite':
                    await this.addBlockedSite(request.url);
                    sendResponse({ success: true });
                    break;
                
                case 'removeBlockedSite':
                    await this.removeBlockedSite(request.url);
                    sendResponse({ success: true });
                    break;
                
                case 'updateBlockedSite':
                    await this.updateBlockedSite(request.oldUrl, request.newUrl);
                    sendResponse({ success: true });
                    break;
                
                // Category-based blocking system (separate from simple blocked sites)
                case 'getCategorySites':
                    const categorySites = await this.getCategorySites();
                    sendResponse({ success: true, sites: categorySites });
                    break;

                case 'addCategorySite':
                    await this.addCategorySite(request.url, request.categoryId);
                    sendResponse({ success: true });
                    break;

                case 'removeCategorySite':
                    await this.removeCategorySite(request.url, request.categoryId);
                    sendResponse({ success: true });
                    break;

                case 'toggleCategoryBlocking':
                    await this.toggleCategoryBlocking(request.categoryId, request.enabled);
                    sendResponse({ success: true });
                    break;

                case 'deleteCategory':
                    await this.deleteCategory(request.categoryId);
                    sendResponse({ success: true });
                    break;
                
                // Timer synchronization actions
                case 'timerStarted':
                    await this.handleTimerStart(request);
                    sendResponse({ success: true });
                    break;
                
                case 'timerStopped':
                    await this.handleTimerStop();
                    sendResponse({ success: true });
                    break;
                
                case 'timerReset':
                    await this.handleTimerReset(request);
                    sendResponse({ success: true });
                    break;
                
                case 'timerComplete':
                    await this.handleTimerComplete(request);
                    sendResponse({ success: true });
                    break;
                
                case 'switchSession':
                    await this.handleSessionSwitch(request);
                    sendResponse({ success: true });
                    break;
                
                case 'getTimerState':
                    const timerState = await this.getTimerState();
                    sendResponse({ success: true, timerState });
                    break;
                
                default:
                    sendResponse({ error: 'Unknown action' });
            }
        } catch (error) {
            console.error('Background message handler error:', error);
            sendResponse({ error: error.message });
        }
    }

    async getBlockedSites() {
        try {
            const result = await chrome.storage.local.get(['blockedSites']);
            return result.blockedSites || [];
        } catch (error) {
            console.error('Error getting blocked sites:', error);
            return [];
        }
    }

    async addBlockedSite(url) {
        try {
            const sites = await this.getBlockedSites();
            const cleanUrl = this.cleanUrl(url);
            
            if (!sites.includes(cleanUrl)) {
                sites.push(cleanUrl);
                await chrome.storage.local.set({ blockedSites: sites });
            }
        } catch (error) {
            console.error('Error adding blocked site:', error);
        }
    }

    async removeBlockedSite(url) {
        try {
            const sites = await this.getBlockedSites();
            const cleanUrl = this.cleanUrl(url);
            const updatedSites = sites.filter(site => site !== cleanUrl);
            await chrome.storage.local.set({ blockedSites: updatedSites });
        } catch (error) {
            console.error('Error removing blocked site:', error);
        }
    }

    async updateBlockedSite(oldUrl, newUrl) {
        try {
            const sites = await this.getBlockedSites();
            const cleanOldUrl = this.cleanUrl(oldUrl);
            const cleanNewUrl = this.cleanUrl(newUrl);
            
            const index = sites.indexOf(cleanOldUrl);
            if (index !== -1) {
                sites[index] = cleanNewUrl;
                await chrome.storage.local.set({ blockedSites: sites });
            }
        } catch (error) {
            console.error('Error updating blocked site:', error);
        }
    }

    cleanUrl(url) {
        return url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
    }

    // Category-based blocking system (separate from simple blocking)
    async getCategorySites() {
        try {
            const result = await chrome.storage.local.get(['categorySites']);
            return result.categorySites || {};
        } catch (error) {
            console.error('Error getting category sites:', error);
            return {};
        }
    }

    async addCategorySite(url, categoryId) {
        try {
            const categorySites = await this.getCategorySites();
            const cleanUrl = this.cleanUrl(url);
            
            if (!categorySites[categoryId]) {
                categorySites[categoryId] = { sites: [], enabled: true };
            }
            
            if (!categorySites[categoryId].sites.includes(cleanUrl)) {
                categorySites[categoryId].sites.push(cleanUrl);
                await chrome.storage.local.set({ categorySites });
            }
        } catch (error) {
            console.error('Error adding category site:', error);
        }
    }

    async removeCategorySite(url, categoryId) {
        try {
            const categorySites = await this.getCategorySites();
            const cleanUrl = this.cleanUrl(url);
            
            if (categorySites[categoryId]) {
                categorySites[categoryId].sites = categorySites[categoryId].sites.filter(
                    site => site !== cleanUrl
                );
                await chrome.storage.local.set({ categorySites });
            }
        } catch (error) {
            console.error('Error removing category site:', error);
        }
    }

    async toggleCategoryBlocking(categoryId, enabled) {
        try {
            const categorySites = await this.getCategorySites();
            
            if (categorySites[categoryId]) {
                categorySites[categoryId].enabled = enabled;
                await chrome.storage.local.set({ categorySites });
            }
        } catch (error) {
            console.error('Error toggling category blocking:', error);
        }
    }

    async deleteCategory(categoryId) {
        try {
            const categorySites = await this.getCategorySites();
            
            if (categorySites[categoryId]) {
                delete categorySites[categoryId];
                await chrome.storage.local.set({ categorySites });
            }
        } catch (error) {
            console.error('Error deleting category:', error);
        }
    }

    async getCategoryBlockedSites() {
        try {
            const categorySites = await this.getCategorySites();
            const blockedSites = [];
            
            // Collect all sites from enabled categories
            for (const [categoryId, categoryData] of Object.entries(categorySites)) {
                if (categoryData.enabled) {
                    blockedSites.push(...categoryData.sites);
                }
            }
            
            return blockedSites;
        } catch (error) {
            console.error('Error getting category blocked sites:', error);
            return [];
        }
    }

    async checkAndBlockUrl(url, tabId) {
        try {
            // Get both simple blocked sites and category blocked sites
            const simpleSites = await this.getBlockedSites();
            const categorySites = await this.getCategoryBlockedSites();
            const cleanUrl = this.cleanUrl(url);
            
            // Check if URL is blocked by simple blocking system
            const isSimpleBlocked = simpleSites.some(site => {
                return cleanUrl.includes(site) || site.includes(cleanUrl);
            });
            
            // Check if URL is blocked by category blocking system
            const isCategoryBlocked = categorySites.some(site => {
                return cleanUrl.includes(site) || site.includes(cleanUrl);
            });
            
            // Block if either system has the site blocked
            if (isSimpleBlocked || isCategoryBlocked) {
                const blockingSystem = isSimpleBlocked ? 'simple' : 'category';
                chrome.tabs.update(tabId, {
                    url: chrome.runtime.getURL('src/pages/blocked.html') + 
                         '?blocked=' + encodeURIComponent(url) + 
                         '&system=' + blockingSystem
                });
            }
        } catch (error) {
            console.error('Error checking blocked URL:', error);
        }
    }

    // Timer Management Methods
    async getTimerState() {
        try {
            const result = await chrome.storage.local.get(['timerState']);
            return result.timerState;
        } catch (error) {
            console.error('Error getting timer state:', error);
            return null;
        }
    }

    async updateTimerState(updates) {
        try {
            const currentState = await this.getTimerState();
            const newState = { ...currentState, ...updates };
            await chrome.storage.local.set({ timerState: newState });
            
            // Notify all tabs about timer state change
            chrome.runtime.sendMessage({
                action: 'timerStateUpdated',
                timerState: newState
            }).catch(() => {
                // Ignore errors if no listeners
            });
        } catch (error) {
            console.error('Error updating timer state:', error);
        }
    }

    async handleTimerStart(request) {
        try {
            const now = Date.now();
            await this.updateTimerState({
                isRunning: true,
                startTimestamp: now,
                currentSession: request.session || 'pomodoro',
                totalTime: request.duration || 25 * 60,
                timeLeft: request.timeLeft || request.duration || 25 * 60
            });
        } catch (error) {
            console.error('Error handling timer start:', error);
        }
    }

    async handleTimerStop() {
        try {
            const timerState = await this.getTimerState();
            if (timerState.isRunning && timerState.startTimestamp) {
                const elapsed = Math.floor((Date.now() - timerState.startTimestamp) / 1000);
                const newTimeLeft = Math.max(0, timerState.timeLeft - elapsed);
                
                await this.updateTimerState({
                    isRunning: false,
                    timeLeft: newTimeLeft,
                    startTimestamp: null
                });
            }
        } catch (error) {
            console.error('Error handling timer stop:', error);
        }
    }

    async handleTimerReset(request) {
        try {
            const timerState = await this.getTimerState();
            const session = request.session || timerState.currentSession;
            const duration = timerState.sessions[session]?.duration || 25 * 60;
            
            await this.updateTimerState({
                isRunning: false,
                timeLeft: duration,
                totalTime: duration,
                startTimestamp: null,
                currentSession: session
            });
        } catch (error) {
            console.error('Error handling timer reset:', error);
        }
    }

    async handleTimerComplete(request) {
        try {
            const timerState = await this.getTimerState();
            let updates = {
                isRunning: false,
                timeLeft: 0,
                startTimestamp: null
            };

            // Handle Pomodoro technique logic
            if (request.session === 'pomodoro') {
                const newPomodoroCount = timerState.pomodoroCount + 1;
                const newSessionCount = timerState.sessionCount + 1;
                
                // Switch to appropriate break after pomodoro
                let nextSession;
                let nextDuration;
                if (newPomodoroCount % 4 === 0) {
                    nextSession = 'long-break';
                    nextDuration = timerState.sessions['long-break'].duration;
                } else {
                    nextSession = 'short-break';
                    nextDuration = timerState.sessions['short-break'].duration;
                }

                updates = {
                    ...updates,
                    pomodoroCount: newPomodoroCount,
                    sessionCount: newSessionCount,
                    currentSession: nextSession,
                    timeLeft: nextDuration,
                    totalTime: nextDuration
                };
            } else if (request.session !== 'custom') {
                // After break, return to pomodoro
                const duration = timerState.sessions.pomodoro.duration;
                updates = {
                    ...updates,
                    sessionCount: timerState.sessionCount + 1,
                    currentSession: 'pomodoro',
                    timeLeft: duration,
                    totalTime: duration
                };
            }

            await this.updateTimerState(updates);
        } catch (error) {
            console.error('Error handling timer complete:', error);
        }
    }

    async handleSessionSwitch(request) {
        try {
            const timerState = await this.getTimerState();
            const session = request.session;
            let duration = timerState.sessions[session]?.duration;
            
            // Handle custom session duration
            if (session === 'custom' && request.customDuration) {
                duration = request.customDuration;
                // Update custom session duration in storage
                const sessions = { ...timerState.sessions };
                sessions.custom.duration = duration;
                
                await this.updateTimerState({
                    sessions,
                    currentSession: session,
                    timeLeft: duration,
                    totalTime: duration,
                    isRunning: false,
                    startTimestamp: null
                });
            } else if (duration) {
                await this.updateTimerState({
                    currentSession: session,
                    timeLeft: duration,
                    totalTime: duration,
                    isRunning: false,
                    startTimestamp: null
                });
            }
        } catch (error) {
            console.error('Error handling session switch:', error);
        }
    }
}

chrome.runtime.onStartup.addListener(() => {
    console.log('App Blocker extension startup');
});

chrome.runtime.onInstalled.addListener((details) => {
    console.log('App Blocker extension installed/updated:', details.reason);
});

const appBlockerService = new AppBlockerService();