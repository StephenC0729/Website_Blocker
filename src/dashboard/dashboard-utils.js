/**
 * Dashboard Utilities
 * Shared utility functions used across dashboard components
 */

/**
 * Escapes HTML special characters to prevent XSS
 * @param {string} str - The string to escape
 * @returns {string} - The escaped string
 */
function escapeHtml(str) {
  return str.replace(
    /[&<>"]/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        ' ': '&nbsp;',
      }[c] || c)
  );
}

/**
 * Sends a Chrome extension message and returns a Promise
 * @param {Object} msg - The message object to send
 * @returns {Promise} - Promise that resolves with the response
 */
function sendMessagePromise(msg) {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(msg, (response) => {
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError);
        }
        resolve(response);
      });
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Normalizes a domain input to a consistent format
 * @param {string} input - The domain input to normalize
 * @returns {string} - The normalized domain or empty string if invalid
 */
function normalizeDomain(input) {
  try {
    let value = input.trim();
    if (!value) return '';
    if (!/^https?:\/\//i.test(value)) {
      value = 'https://' + value; // so URL can parse
    }
    const url = new URL(value);
    return url.hostname.replace(/^www\./, '');
  } catch {
    // fallback simple domain regex
    const m = input.match(/^([a-z0-9-]+\.)+[a-z]{2,}$/i);
    return m ? input.replace(/^www\./, '').toLowerCase() : '';
  }
}

// Export functions if using modules, otherwise they're global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    escapeHtml,
    sendMessagePromise,
    normalizeDomain
  };
}