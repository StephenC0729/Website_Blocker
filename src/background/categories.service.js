/**
 * Category-based website blocking service
 * Manages websites grouped into categories with individual enable/disable controls
 */
import { get, set } from './storage.js';
import { cleanUrl } from './url-utils.js';

/**
 * Retrieve all category sites data from storage
 * @returns {Promise<Object>} Object containing all categories with their sites and settings
 */
export async function getCategorySites() {
    try {
        const result = await get(['categorySites']);
        return result.categorySites || {};
    } catch (error) {
        console.error('Error getting category sites:', error);
        return {};
    }
}

/**
 * Add a website to a specific category
 * @param {string} url - The URL to add
 * @param {string} categoryId - The category ID to add the site to
 */
export async function addCategorySite(url, categoryId) {
    try {
        const categorySites = await getCategorySites();
        const cleanedUrl = cleanUrl(url);
        
        if (!categorySites[categoryId]) {
            categorySites[categoryId] = { sites: [], enabled: true };
        }
        
        if (!categorySites[categoryId].sites.includes(cleanedUrl)) {
            categorySites[categoryId].sites.push(cleanedUrl);
            await set({ categorySites });
        }
    } catch (error) {
        console.error('Error adding category site:', error);
    }
}

/**
 * Remove a website from a specific category
 * @param {string} url - The URL to remove
 * @param {string} categoryId - The category ID to remove the site from
 */
export async function removeCategorySite(url, categoryId) {
    try {
        const categorySites = await getCategorySites();
        const cleanedUrl = cleanUrl(url);
        
        if (categorySites[categoryId]) {
            categorySites[categoryId].sites = categorySites[categoryId].sites.filter(
                site => site !== cleanedUrl
            );
            await set({ categorySites });
        }
    } catch (error) {
        console.error('Error removing category site:', error);
    }
}

/**
 * Enable or disable blocking for an entire category
 * @param {string} categoryId - The category ID to toggle
 * @param {boolean} enabled - Whether to enable or disable the category
 */
export async function toggleCategoryBlocking(categoryId, enabled) {
    try {
        const categorySites = await getCategorySites();
        
        if (categorySites[categoryId]) {
            categorySites[categoryId].enabled = enabled;
            await set({ categorySites });
        }
    } catch (error) {
        console.error('Error toggling category blocking:', error);
    }
}

/**
 * Delete an entire category and all its associated sites and metadata
 * @param {string} categoryId - The category ID to delete
 */
export async function deleteCategory(categoryId) {
    try {
        const categorySites = await getCategorySites();
        if (categorySites[categoryId]) {
            delete categorySites[categoryId];
            await set({ categorySites });
        }

        const categoryMetadata = await getCategoryMetadata();
        if (categoryMetadata[categoryId]) {
            delete categoryMetadata[categoryId];
            await set({ categoryMetadata });
        }
    } catch (error) {
        console.error('Error deleting category:', error);
    }
}

/**
 * Get a flat array of all blocked sites from enabled categories
 * @returns {Promise<string[]>} Array of blocked site URLs
 */
export async function getCategoryBlockedSites() {
    try {
        const categorySites = await getCategorySites();
        const blockedSites = [];
        
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

/**
 * Retrieve category metadata (names, descriptions, etc.) from storage
 * @returns {Promise<Object>} Object containing metadata for all categories
 */
export async function getCategoryMetadata() {
    try {
        const result = await get(['categoryMetadata']);
        return result.categoryMetadata || {};
    } catch (error) {
        console.error('Error getting category metadata:', error);
        return {};
    }
}

/**
 * Save metadata for a specific category (name, description, etc.)
 * @param {string} categoryId - The category ID to save metadata for
 * @param {Object} metadata - The metadata object to save
 */
export async function saveCategoryMetadata(categoryId, metadata) {
    try {
        const categoryMetadata = await getCategoryMetadata();
        categoryMetadata[categoryId] = metadata;
        await set({ categoryMetadata });
    } catch (error) {
        console.error('Error saving category metadata:', error);
    }
}