// Main background script entry point for the App Blocker extension
// Handles extension lifecycle events and message passing between components

import { initializeStorage } from './storage.js';
import { handleMessage } from './messaging.js';

// Extension installation/update event - fires on first install or version updates
chrome.runtime.onInstalled.addListener((details) => {
    console.log('App Blocker extension installed/updated:', details.reason);
    // Initialize default storage values for new installations
    initializeStorage();
});

// Message listener for communication between extension components (popup, content scripts, etc.)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Delegate message handling to centralized messaging module
    handleMessage(request, sender, sendResponse);
    // Return true to indicate we will send a response asynchronously
    return true;
});