// Central messaging handler for browser extension background script
// Coordinates communication between content scripts, popup, and dashboard with backend services
import * as categoriesService from './categories.service.js';
import * as timerService from './timer.service.js';

// Action constants for message routing - defines all supported message types
export const ACTIONS = {
    
    // Category actions - manage grouped site blocking by categories
    GET_CATEGORY_SITES: 'getCategorySites',
    ADD_CATEGORY_SITE: 'addCategorySite',
    REMOVE_CATEGORY_SITE: 'removeCategorySite',
    TOGGLE_CATEGORY_BLOCKING: 'toggleCategoryBlocking',
    DELETE_CATEGORY: 'deleteCategory',
    SAVE_CATEGORY_METADATA: 'saveCategoryMetadata',
    GET_CATEGORY_METADATA: 'getCategoryMetadata',
    
    // Timer actions - handle focus/break session management
    TIMER_STARTED: 'timerStarted',
    TIMER_STOPPED: 'timerStopped',
    TIMER_RESET: 'timerReset',
    TIMER_COMPLETE: 'timerComplete',
    SWITCH_SESSION: 'switchSession',
    GET_TIMER_STATE: 'getTimerState'
};

/**
 * Main message handler for browser extension runtime messages
 * Routes messages from content scripts, popup, and dashboard to appropriate services
 * @param {Object} request - Message object containing action and payload data
 * @param {Object} sender - Sender information (tab, frame, etc.)
 * @param {Function} sendResponse - Callback function to send response back to sender
 */
export async function handleMessage(request, _sender, sendResponse) {
    try {
        switch (request.action) {
            
            // Category management cases
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
            
            // Timer management cases
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
            
            // Fallback for unrecognized actions
            default:
                sendResponse({ error: 'Unknown action' });
        }
    } catch (error) {
        // Log errors and send error response back to sender
        console.error('Background message handler error:', error);
        sendResponse({ error: error.message });
    }
}