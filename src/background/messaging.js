// Central messaging handler for browser extension background script
// Coordinates communication between content scripts, popup, and dashboard with backend services
import * as categoriesService from './categories.service.js';
import * as timerService from './timer.service.js';
import * as settingsService from './settings.service.js';
import * as unifiedOrchestrator from './unified-orchestrator.js';
import * as analyticsService from './analytics.service.js';

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
    GET_ACTIVE_CATEGORY: 'getActiveCategory',
    SET_ACTIVE_CATEGORY: 'setActiveCategory',
    GET_ACTIVE_CATEGORY_SITES: 'getActiveCategorySites',
    MIGRATE_CATEGORY_DATA: 'migrateCategoryData',
    CATEGORIES_APPLY: 'categoriesApply',
    CATEGORIES_RELEASE: 'categoriesRelease',
    
    // Timer actions - handle focus/break session management
    TIMER_STARTED: 'timerStarted',
    TIMER_STOPPED: 'timerStopped',
    TIMER_RESET: 'timerReset',
    TIMER_COMPLETE: 'timerComplete',
    SWITCH_SESSION: 'switchSession',
    GET_TIMER_STATE: 'getTimerState',
    FOCUS_START: 'focusStart',
    FOCUS_STOP: 'focusStop',
    
    // Analytics actions - session tracking and metrics
    ANALYTICS_LOG_START: 'analyticsLogStart',
    ANALYTICS_LOG_COMPLETE: 'analyticsLogComplete',
    ANALYTICS_SITE_BLOCKED: 'analyticsSiteBlocked',
    ANALYTICS_GET_METRICS: 'analyticsGetMetrics',
    ANALYTICS_GET_WEEKLY: 'analyticsGetWeeklySeries',
    ANALYTICS_GET_HISTORY: 'analyticsGetHistory',
    
    // Dev/Test actions
    TEST_COMPLETE_POMODORO: 'testCompletePomodoro',
    
    // Settings actions - unified mode configuration
    GET_UNIFIED_MODE: 'getUnifiedMode',
    SET_UNIFIED_MODE: 'setUnifiedMode',
    GET_SETTINGS: 'getSettings',
    SET_SETTINGS: 'setSettings'
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

            case ACTIONS.GET_ACTIVE_CATEGORY:
                const activeCategory = await categoriesService.getActiveCategory();
                sendResponse({ success: true, activeCategory });
                break;

            case ACTIONS.SET_ACTIVE_CATEGORY:
                await categoriesService.setActiveCategory(request.categoryId);
                sendResponse({ success: true });
                break;

            case ACTIONS.GET_ACTIVE_CATEGORY_SITES:
                const activeCategorySites = await categoriesService.getActiveCategorySites();
                sendResponse({ success: true, sites: activeCategorySites });
                break;

            case ACTIONS.MIGRATE_CATEGORY_DATA:
                await categoriesService.migrateCategoryData();
                sendResponse({ success: true });
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
            
            // Analytics cases
            case ACTIONS.ANALYTICS_LOG_START:
                await analyticsService.logSessionStart({ session: request.session, duration: request.duration });
                sendResponse({ success: true });
                break;
            
            case ACTIONS.ANALYTICS_LOG_COMPLETE:
                await analyticsService.logSessionComplete({ session: request.session });
                sendResponse({ success: true });
                break;
            
            case ACTIONS.ANALYTICS_SITE_BLOCKED:
                await analyticsService.logSiteBlocked(request.domain);
                sendResponse({ success: true });
                break;
            
            case ACTIONS.ANALYTICS_GET_METRICS:
                const metrics = await analyticsService.getMetrics();
                sendResponse(metrics);
                break;
            
            case ACTIONS.ANALYTICS_GET_WEEKLY:
                const weekly = await analyticsService.getWeeklySeries();
                sendResponse(weekly);
                break;
            
            case ACTIONS.ANALYTICS_GET_HISTORY:
                const history = await analyticsService.getSessionHistory({ limit: request.limit || 20 });
                sendResponse(history);
                break;

            // Dev/Test: Fast-complete current running Pomodoro with full credit
            case ACTIONS.TEST_COMPLETE_POMODORO:
                const result = await timerService.testCompletePomodoro();
                sendResponse(result);
                break;
            
            // Unified mode and settings cases
            case ACTIONS.GET_SETTINGS:
                const settings = await settingsService.getSettings();
                sendResponse({ success: true, settings });
                break;
            
            case ACTIONS.SET_SETTINGS:
                const oldSettings = await settingsService.getSettings();
                await settingsService.setSettings(request.settings);
                
                // Handle mode switch if unified mode changed
                if (oldSettings.unifiedModeEnabled !== request.settings.unifiedModeEnabled) {
                    await unifiedOrchestrator.handleModeSwitch(request.settings.unifiedModeEnabled);
                }
                sendResponse({ success: true });
                break;
            
            case ACTIONS.GET_UNIFIED_MODE:
                const unifiedMode = await settingsService.getUnifiedMode();
                sendResponse({ success: true, unifiedMode });
                break;
            
            case ACTIONS.SET_UNIFIED_MODE:
                const currentSettings = await settingsService.getSettings();
                await settingsService.setUnifiedMode(request.enabled);
                
                // Handle mode switch
                if (currentSettings.unifiedModeEnabled !== request.enabled) {
                    await unifiedOrchestrator.handleModeSwitch(request.enabled);
                }
                sendResponse({ success: true });
                break;
            
            // Unified orchestrator cases
            case ACTIONS.FOCUS_START:
                await unifiedOrchestrator.handleFocusStart(request);
                sendResponse({ success: true });
                break;
            
            case ACTIONS.FOCUS_STOP:
                await unifiedOrchestrator.handleFocusStop();
                sendResponse({ success: true });
                break;
            
            case ACTIONS.CATEGORIES_APPLY:
                await unifiedOrchestrator.applyCategory(request.categoryId);
                sendResponse({ success: true });
                break;
            
            case ACTIONS.CATEGORIES_RELEASE:
                await unifiedOrchestrator.releaseCategory();
                sendResponse({ success: true });
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
