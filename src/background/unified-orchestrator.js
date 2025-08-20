/**
 * Unified Timer-Blocking Orchestrator
 * Coordinates timer sessions with category blocking when unified mode is enabled
 */
import * as settingsService from './settings.service.js';
import * as categoriesService from './categories.service.js';
import * as timerService from './timer.service.js';

/**
 * Session state for unified mode
 */
let sessionState = {
    mode: 'independent',
    phase: 'idle',
    activeCategoryId: null,
    timerSessionId: null,
    previousActiveCategory: null
};

/**
 * Handle focus session start in unified mode
 * @param {Object} timerData - Timer session data
 */
export async function handleFocusStart(timerData) {
    try {
        const settings = await settingsService.getSettings();
        
        if (!settings.unifiedModeEnabled) {
            return;
        }

        // Store previous active category to restore later
        sessionState.previousActiveCategory = await categoriesService.getActiveCategory();
        
        // Apply focus category if configured
        if (settings.focusCategoryId) {
            try {
                await categoriesService.setActiveCategory(settings.focusCategoryId);
                sessionState.activeCategoryId = settings.focusCategoryId;
                
                // Show notification about unified mode activation
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'src/assets/icons/Icon.png',
                    title: 'Focus Session Started',
                    message: `Blocking category "${await getCategoryName(settings.focusCategoryId)}" activated for focus session`
                });
            } catch (categoryError) {
                console.error('Failed to apply focus category:', categoryError);
                // Fallback to independent mode for this session
                sessionState.mode = 'independent';
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'src/assets/icons/Icon.png',
                    title: 'Focus Session Started',
                    message: 'Focus session started in independent mode due to category error'
                });
                return;
            }
        }

        // Update session state
        sessionState.mode = 'unified';
        sessionState.phase = 'focus';
        sessionState.timerSessionId = timerData.sessionId || Date.now().toString();

        console.log('Unified mode: Focus session started with category:', settings.focusCategoryId);
    } catch (error) {
        console.error('Error handling unified focus start:', error);
        // Fallback to independent mode for this session
        sessionState.mode = 'independent';
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'src/assets/icons/Icon.png',
            title: 'Focus Session Started',
            message: 'Focus session started in independent mode due to an error'
        });
    }
}

/**
 * Handle focus session stop in unified mode
 */
export async function handleFocusStop() {
    try {
        const settings = await settingsService.getSettings();
        
        if (!settings.unifiedModeEnabled || sessionState.mode !== 'unified') {
            return;
        }

        // Apply break category if configured, otherwise restore previous
        if (settings.breakCategoryId) {
            try {
                await categoriesService.setActiveCategory(settings.breakCategoryId);
                sessionState.activeCategoryId = settings.breakCategoryId;
                sessionState.phase = 'break';
                
                // Show notification about break mode
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'src/assets/icons/Icon.png',
                    title: 'Break Time!',
                    message: `Switched to break category "${await getCategoryName(settings.breakCategoryId)}"`
                });
            } catch (categoryError) {
                console.error('Failed to apply break category:', categoryError);
                // Fallback to restoring previous category
                if (sessionState.previousActiveCategory) {
                    await categoriesService.setActiveCategory(sessionState.previousActiveCategory);
                }
                sessionState.phase = 'idle';
                sessionState.mode = 'independent';
                
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'src/assets/icons/Icon.png',
                    title: 'Break Time!',
                    message: 'Break started - reverted to previous category due to error'
                });
            }
        } else {
            // Restore previous active category
            if (sessionState.previousActiveCategory) {
                await categoriesService.setActiveCategory(sessionState.previousActiveCategory);
            }
            sessionState.phase = 'idle';
            sessionState.mode = 'independent';
            
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'src/assets/icons/Icon.png',
                title: 'Focus Complete!',
                message: 'Focus session ended - category restored'
            });
        }

        console.log('Unified mode: Focus session stopped, switched to:', sessionState.phase);
    } catch (error) {
        console.error('Error handling unified focus stop:', error);
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'src/assets/icons/Icon.png',
            title: 'Focus Session Ended',
            message: 'Focus session ended with errors - check console'
        });
    }
}

/**
 * Handle break session complete - return to idle state
 */
export async function handleBreakComplete() {
    try {
        if (sessionState.mode !== 'unified') {
            return;
        }

        // Restore previous active category
        if (sessionState.previousActiveCategory) {
            try {
                await categoriesService.setActiveCategory(sessionState.previousActiveCategory);
                
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'src/assets/icons/Icon.png',
                    title: 'Break Complete!',
                    message: `Restored to "${await getCategoryName(sessionState.previousActiveCategory)}" category`
                });
            } catch (categoryError) {
                console.error('Failed to restore previous category:', categoryError);
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'src/assets/icons/Icon.png',
                    title: 'Break Complete!',
                    message: 'Break ended - could not restore previous category'
                });
            }
        } else {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'src/assets/icons/Icon.png',
                title: 'Break Complete!',
                message: 'Break session ended'
            });
        }

        // Reset session state
        sessionState.mode = 'independent';
        sessionState.phase = 'idle';
        sessionState.activeCategoryId = null;
        sessionState.timerSessionId = null;
        sessionState.previousActiveCategory = null;

        console.log('Unified mode: Break complete, returned to idle state');
    } catch (error) {
        console.error('Error handling unified break complete:', error);
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'src/assets/icons/Icon.png',
            title: 'Break Complete!',
            message: 'Break ended with errors - check console'
        });
    }
}

/**
 * Apply a specific category (for manual category application)
 * @param {string} categoryId - Category to apply
 */
export async function applyCategory(categoryId) {
    try {
        await categoriesService.setActiveCategory(categoryId);
        console.log('Applied category:', categoryId);
    } catch (error) {
        console.error('Error applying category:', error);
        throw error;
    }
}

/**
 * Release current category (restore previous if in unified session)
 */
export async function releaseCategory() {
    try {
        if (sessionState.mode === 'unified' && sessionState.previousActiveCategory) {
            await categoriesService.setActiveCategory(sessionState.previousActiveCategory);
        } else {
            // Set to general category as default
            await categoriesService.setActiveCategory('general');
        }
        console.log('Released category, restored previous state');
    } catch (error) {
        console.error('Error releasing category:', error);
        throw error;
    }
}

/**
 * Get current session state
 * @returns {Object} Current session state
 */
export function getSessionState() {
    return { ...sessionState };
}

/**
 * Check if currently in unified mode session
 * @returns {boolean} Whether in unified mode
 */
export function isUnifiedSession() {
    return sessionState.mode === 'unified';
}

/**
 * Handle mode switch - if switching mid-session, end current session
 * @param {boolean} newUnifiedMode - New unified mode setting
 */
export async function handleModeSwitch(newUnifiedMode) {
    try {
        if (sessionState.mode === 'unified' && !newUnifiedMode) {
            // Switching from unified to independent mid-session
            console.log('Switching from unified to independent mode, ending current session');
            
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'src/assets/icons/Icon.png',
                title: 'Mode Switched',
                message: 'Unified mode disabled - ending current session'
            });
            
            await handleBreakComplete();
        } else if (!sessionState.mode && newUnifiedMode) {
            // Switching to unified mode
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'src/assets/icons/Icon.png',
                title: 'Mode Switched',
                message: 'Unified mode enabled - timer and categories will sync'
            });
        }
    } catch (error) {
        console.error('Error handling mode switch:', error);
    }
}

/**
 * Get category name from metadata
 * @param {string} categoryId - Category ID
 * @returns {Promise<string>} Category display name
 */
async function getCategoryName(categoryId) {
    try {
        const metadata = await categoriesService.getCategoryMetadata();
        return metadata[categoryId]?.name || categoryId;
    } catch (error) {
        console.error('Error getting category name:', error);
        return categoryId;
    }
}

/**
 * Validate if a category exists and has sites
 * @param {string} categoryId - Category ID to validate
 * @returns {Promise<boolean>} Whether category is valid
 */
async function validateCategory(categoryId) {
    try {
        const metadata = await categoriesService.getCategoryMetadata();
        const sites = await categoriesService.getCategorySites();
        
        return metadata[categoryId] && sites[categoryId]?.sites?.length > 0;
    } catch (error) {
        console.error('Error validating category:', error);
        return false;
    }
}