class ContentBlocker {
    constructor() {
        this.init();
    }

    async init() {
        await this.checkIfBlockedSite();
    }

    async checkIfBlockedSite() {
        try {
            const currentUrl = window.location.hostname;
            const response = await chrome.runtime.sendMessage({ 
                action: 'getBlockedSites' 
            });
            
            if (response.success && response.sites) {
                const cleanCurrentUrl = this.cleanUrl(currentUrl);
                const isBlocked = response.sites.some(site => {
                    return cleanCurrentUrl.includes(site) || site.includes(cleanCurrentUrl);
                });
                
                if (isBlocked) {
                    this.redirectToBlockedPage();
                }
            }
        } catch (error) {
            console.error('Error checking blocked sites:', error);
        }
    }

    redirectToBlockedPage() {
        const blockedPageUrl = chrome.runtime.getURL('blocked.html') + '?blocked=' + encodeURIComponent(window.location.href);
        window.location.replace(blockedPageUrl);
    }

    cleanUrl(url) {
        return url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new ContentBlocker();
    });
} else {
    new ContentBlocker();
}