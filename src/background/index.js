import { initializeStorage } from './storage.js';
import { handleMessage } from './messaging.js';

chrome.runtime.onStartup.addListener(() => {
    console.log('App Blocker extension startup');
});

chrome.runtime.onInstalled.addListener((details) => {
    console.log('App Blocker extension installed/updated:', details.reason);
    initializeStorage();
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    handleMessage(request, sender, sendResponse);
    return true;
});