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
            const result = await chrome.storage.local.get(['blockedSites']);
            if (!result.blockedSites) {
                await chrome.storage.local.set({ blockedSites: [] });
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

    async checkAndBlockUrl(url, tabId) {
        try {
            const sites = await this.getBlockedSites();
            const cleanUrl = this.cleanUrl(url);
            
            const isBlocked = sites.some(site => {
                return cleanUrl.includes(site) || site.includes(cleanUrl);
            });
            
            if (isBlocked) {
                chrome.tabs.update(tabId, {
                    url: chrome.runtime.getURL('blocked.html') + '?blocked=' + encodeURIComponent(url)
                });
            }
        } catch (error) {
            console.error('Error checking blocked URL:', error);
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