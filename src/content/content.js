/**
 * ContentBlocker class handles website blocking functionality by checking if the current site
 * should be blocked and displaying a blocking overlay when necessary.
 */
class ContentBlocker {
    constructor() {
        this.overlayCreated = false;
        this.init();
    }

    /**
     * Initialize the content blocker by checking category-based blocking
     */
    async init() {
        await this.checkCategoryBlockedSite();
    }


    /**
     * Check if the current site is blocked by the active category and show overlay if blocked
     */
    async checkCategoryBlockedSite() {
        try {
            const currentUrl = window.location.hostname;
            const response = await chrome.runtime.sendMessage({ 
                action: 'getActiveCategorySites' 
            });
            
            if (response.success && response.sites) {
                const cleanCurrentUrl = this.cleanUrl(currentUrl);
                
                // Check if current site is in the active category's blocked sites
                const isBlocked = response.sites.some(site => {
                    // Either exact match or current URL is a subdomain of blocked site
                    return cleanCurrentUrl === site || 
                           (cleanCurrentUrl.endsWith('.' + site) && !site.includes('.'));
                });
                
                if (isBlocked && !this.overlayCreated) {
                    this.showBlockingOverlay();
                }
            }
        } catch (error) {
            console.error('Error checking category blocked sites:', error);
        }
    }

    /**
     * Display a full-screen blocking overlay with motivational message and focus icon
     */
    showBlockingOverlay() {
        // Prevent multiple overlays
        if (this.overlayCreated) return;
        this.overlayCreated = true;

        // Create overlay container
        const overlay = document.createElement('div');
        overlay.id = 'website-blocker-overlay';
        overlay.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            background: rgba(0, 0, 0, 0.8) !important;
            z-index: 2147483647 !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            color: white !important;
            text-align: center !important;
        `;

        // Create content container
        const content = document.createElement('div');
        content.style.cssText = `
            max-width: 500px !important;
            padding: 40px !important;
        `;

        // Create motivational message
        const message = document.createElement('h1');
        message.textContent = 'Stay focused on your goals...';
        message.style.cssText = `
            font-size: 2.5rem !important;
            font-weight: 300 !important;
            margin-bottom: 40px !important;
            line-height: 1.2 !important;
        `;

        // Create tree/focus icon
        const iconContainer = document.createElement('div');
        iconContainer.style.cssText = `
            width: 120px !important;
            height: 120px !important;
            margin: 0 auto 40px auto !important;
            background: rgba(255, 255, 255, 0.1) !important;
            border-radius: 50% !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            border: 3px solid rgba(255, 255, 255, 0.2) !important;
        `;

        const icon = document.createElement('div');
        icon.innerHTML = '🎯';
        icon.style.cssText = `
            font-size: 4rem !important;
        `;

        // Create timer display (optional - could sync with actual timer)
        const timerDisplay = document.createElement('div');
        timerDisplay.textContent = 'Focus session in progress';
        timerDisplay.style.cssText = `
            font-size: 1.2rem !important;
            margin-bottom: 40px !important;
            opacity: 0.8 !important;
        `;


        // Assemble the overlay
        iconContainer.appendChild(icon);
        content.appendChild(message);
        content.appendChild(iconContainer);
        content.appendChild(timerDisplay);
        overlay.appendChild(content);

        // Add blocked site info
        const siteInfo = document.createElement('div');
        siteInfo.textContent = `Blocked: ${window.location.hostname}`;
        siteInfo.style.cssText = `
            position: absolute !important;
            bottom: 20px !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            font-size: 0.9rem !important;
            opacity: 0.6 !important;
        `;
        overlay.appendChild(siteInfo);

        // Add to page
        document.body.appendChild(overlay);

        // Prevent scrolling on the underlying page
        document.body.style.overflow = 'hidden';

        // Disable interaction with the underlying page
        this.disablePageInteraction();

        // Log analytics site blocked event (once per page load)
        try {
            const domain = this.cleanUrl(window.location.hostname);
            chrome.runtime.sendMessage({ action: 'analyticsSiteBlocked', domain });
        } catch (e) {
            console.warn('Failed to send analyticsSiteBlocked message:', e);
        }
    }

    /**
     * Disable all user interaction with the underlying webpage while keeping overlay functional
     */
    disablePageInteraction() {
        // Add event listeners to capture and prevent interaction
        const preventEvent = (e) => {
            if (e.target.closest('#website-blocker-overlay')) {
                return; // Allow interaction with overlay
            }
            e.preventDefault();
            e.stopPropagation();
            return false;
        };

        // Prevent various interactions
        document.addEventListener('click', preventEvent, true);
        document.addEventListener('keydown', preventEvent, true);
        document.addEventListener('keyup', preventEvent, true);
        document.addEventListener('keypress', preventEvent, true);
        document.addEventListener('mousedown', preventEvent, true);
        document.addEventListener('mouseup', preventEvent, true);
        document.addEventListener('touchstart', preventEvent, true);
        document.addEventListener('touchend', preventEvent, true);
    }


    /**
     * Clean and normalize URL for comparison by removing protocol, www, and path
     * @param {string} url - The URL to clean
     * @returns {string} The cleaned URL (domain only)
     */
    cleanUrl(url) {
        return url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
    }
}

// Initialize ContentBlocker when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new ContentBlocker();
    });
} else {
    new ContentBlocker();
}
