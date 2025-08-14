import { get, set } from './storage.js';

export function cleanUrl(url) {
  return url
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '');
}

export async function getBlockedSites() {
  try {
    const result = await get(['blockedSites']);
    return result.blockedSites || [];
  } catch (error) {
    console.error('Error getting blocked sites:', error);
    return [];
  }
}

export async function addBlockedSite(url) {
  try {
    const sites = await getBlockedSites();
    const cleanedUrl = cleanUrl(url);

    if (!sites.includes(cleanedUrl)) {
      sites.push(cleanedUrl);
      await set({ blockedSites: sites });
    }
  } catch (error) {
    console.error('Error adding blocked site:', error);
  }
}

export async function removeBlockedSite(url) {
  try {
    const sites = await getBlockedSites();
    const cleanedUrl = cleanUrl(url);
    const updatedSites = sites.filter((site) => site !== cleanedUrl);
    await set({ blockedSites: updatedSites });
  } catch (error) {
    console.error('Error removing blocked site:', error);
  }
}

export async function updateBlockedSite(oldUrl, newUrl) {
  try {
    const sites = await getBlockedSites();
    const cleanOldUrl = cleanUrl(oldUrl);
    const cleanNewUrl = cleanUrl(newUrl);

    const index = sites.indexOf(cleanOldUrl);
    if (index !== -1) {
      sites[index] = cleanNewUrl;
      await set({ blockedSites: sites });
    }
  } catch (error) {
    console.error('Error updating blocked site:', error);
  }
}
