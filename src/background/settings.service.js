/**
 * Settings service for unified mode configuration
 * Manages timer-blocking integration settings
 */
import { get, set } from './storage.js';

/**
 * Get current settings including unified mode configuration
 * @returns {Promise<Object>} Settings object
 */
export async function getSettings() {
    try {
        const result = await get(['settings']);
        return result.settings || {
            unifiedModeEnabled: false,
            focusCategoryId: 'general',
            breakCategoryId: null
        };
    } catch (error) {
        console.error('Error getting settings:', error);
        return {
            unifiedModeEnabled: false,
            focusCategoryId: 'general',
            breakCategoryId: null
        };
    }
}

/**
 * Update settings
 * @param {Object} newSettings - Settings to update
 */
export async function setSettings(newSettings) {
    try {
        const currentSettings = await getSettings();
        const updatedSettings = { ...currentSettings, ...newSettings };
        await set({ settings: updatedSettings });
    } catch (error) {
        console.error('Error setting settings:', error);
    }
}

/**
 * Get unified mode status
 * @returns {Promise<boolean>} Whether unified mode is enabled
 */
export async function getUnifiedMode() {
    try {
        const settings = await getSettings();
        return settings.unifiedModeEnabled;
    } catch (error) {
        console.error('Error getting unified mode:', error);
        return false;
    }
}

/**
 * Set unified mode status
 * @param {boolean} enabled - Whether to enable unified mode
 */
export async function setUnifiedMode(enabled) {
    try {
        await setSettings({ unifiedModeEnabled: enabled });
    } catch (error) {
        console.error('Error setting unified mode:', error);
    }
}