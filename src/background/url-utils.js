/**
 * URL utility functions for the Website Blocker extension
 */

/**
 * Normalizes URLs by removing protocols, www prefix, and paths
 * Example: "https://www.example.com/path" → "example.com"
 * @param {string} url - The URL to clean
 * @returns {string} - Normalized domain name
 */
export function cleanUrl(url) {
  return url
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '');
}