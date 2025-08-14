import { get, set } from './storage.js';
import { cleanUrl } from './blocklist.service.js';

export async function getCategorySites() {
    try {
        const result = await get(['categorySites']);
        return result.categorySites || {};
    } catch (error) {
        console.error('Error getting category sites:', error);
        return {};
    }
}

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

export async function getCategoryMetadata() {
    try {
        const result = await get(['categoryMetadata']);
        return result.categoryMetadata || {};
    } catch (error) {
        console.error('Error getting category metadata:', error);
        return {};
    }
}

export async function saveCategoryMetadata(categoryId, metadata) {
    try {
        const categoryMetadata = await getCategoryMetadata();
        categoryMetadata[categoryId] = metadata;
        await set({ categoryMetadata });
    } catch (error) {
        console.error('Error saving category metadata:', error);
    }
}