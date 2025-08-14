import * as blocklistService from './blocklist.service.js';
import * as categoriesService from './categories.service.js';
import * as timerService from './timer.service.js';

export const ACTIONS = {
    // Blocklist actions
    GET_BLOCKED_SITES: 'getBlockedSites',
    ADD_BLOCKED_SITE: 'addBlockedSite',
    REMOVE_BLOCKED_SITE: 'removeBlockedSite',
    UPDATE_BLOCKED_SITE: 'updateBlockedSite',
    
    // Category actions
    GET_CATEGORY_SITES: 'getCategorySites',
    ADD_CATEGORY_SITE: 'addCategorySite',
    REMOVE_CATEGORY_SITE: 'removeCategorySite',
    TOGGLE_CATEGORY_BLOCKING: 'toggleCategoryBlocking',
    DELETE_CATEGORY: 'deleteCategory',
    SAVE_CATEGORY_METADATA: 'saveCategoryMetadata',
    GET_CATEGORY_METADATA: 'getCategoryMetadata',
    
    // Timer actions
    TIMER_STARTED: 'timerStarted',
    TIMER_STOPPED: 'timerStopped',
    TIMER_RESET: 'timerReset',
    TIMER_COMPLETE: 'timerComplete',
    SWITCH_SESSION: 'switchSession',
    GET_TIMER_STATE: 'getTimerState'
};

export async function handleMessage(request, sender, sendResponse) {
    try {
        switch (request.action) {
            case ACTIONS.GET_BLOCKED_SITES:
                const sites = await blocklistService.getBlockedSites();
                sendResponse({ success: true, sites });
                break;
            
            case ACTIONS.ADD_BLOCKED_SITE:
                await blocklistService.addBlockedSite(request.url);
                sendResponse({ success: true });
                break;
            
            case ACTIONS.REMOVE_BLOCKED_SITE:
                await blocklistService.removeBlockedSite(request.url);
                sendResponse({ success: true });
                break;
            
            case ACTIONS.UPDATE_BLOCKED_SITE:
                await blocklistService.updateBlockedSite(request.oldUrl, request.newUrl);
                sendResponse({ success: true });
                break;
            
            case ACTIONS.GET_CATEGORY_SITES:
                const categorySites = await categoriesService.getCategorySites();
                sendResponse({ success: true, sites: categorySites });
                break;

            case ACTIONS.ADD_CATEGORY_SITE:
                await categoriesService.addCategorySite(request.url, request.categoryId);
                sendResponse({ success: true });
                break;

            case ACTIONS.REMOVE_CATEGORY_SITE:
                await categoriesService.removeCategorySite(request.url, request.categoryId);
                sendResponse({ success: true });
                break;

            case ACTIONS.TOGGLE_CATEGORY_BLOCKING:
                await categoriesService.toggleCategoryBlocking(request.categoryId, request.enabled);
                sendResponse({ success: true });
                break;

            case ACTIONS.DELETE_CATEGORY:
                await categoriesService.deleteCategory(request.categoryId);
                sendResponse({ success: true });
                break;

            case ACTIONS.SAVE_CATEGORY_METADATA:
                await categoriesService.saveCategoryMetadata(request.categoryId, request.metadata);
                sendResponse({ success: true });
                break;

            case ACTIONS.GET_CATEGORY_METADATA:
                const categoryMetadata = await categoriesService.getCategoryMetadata();
                sendResponse({ success: true, categories: categoryMetadata });
                break;
            
            case ACTIONS.TIMER_STARTED:
                await timerService.handleTimerStart(request);
                sendResponse({ success: true });
                break;
            
            case ACTIONS.TIMER_STOPPED:
                await timerService.handleTimerStop();
                sendResponse({ success: true });
                break;
            
            case ACTIONS.TIMER_RESET:
                await timerService.handleTimerReset(request);
                sendResponse({ success: true });
                break;
            
            case ACTIONS.TIMER_COMPLETE:
                await timerService.handleTimerComplete(request);
                sendResponse({ success: true });
                break;
            
            case ACTIONS.SWITCH_SESSION:
                await timerService.handleSessionSwitch(request);
                sendResponse({ success: true });
                break;
            
            case ACTIONS.GET_TIMER_STATE:
                const timerState = await timerService.getTimerState();
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