/**
 * Background Script for Moodle Downloader
 * ---------------------------------------
 * Handles background events and communication for the extension.
 *
 * Responsibilities:
 * - Listens for messages from content scripts or the popup.
 * - Stores the current course name in Chrome local storage.
 * - Optionally injects `content.js` into the active tab when the user clicks the extension icon.
 *
 * Environment: Chrome Extension Service Worker / Background Script
 * Dependencies: Chrome Extension APIs (`chrome.runtime`, `chrome.storage`, `chrome.scripting`, `chrome.action`)
 *
 * Version 1.0
 */

/**
 * Listener for messages coming from content scripts or popup.js.
 * Stores the course name in local storage when received.
 *
 * @param {Object} message - Message object sent via chrome.runtime.sendMessage.
 * @param {string} message.type - The message type identifier.
 * @param {string} [message.text] - The course name text, if applicable.
 */
chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "courseName") {
        chrome.storage.local.set({ courseName: message.text });
    }
});

/**
 * Optional listener for when the user clicks the extension’s icon in the browser toolbar.
 * Automatically injects the content script (`content.js`) into the active tab.
 *
 * @param {chrome.tabs.Tab} tab - The currently active tab object.
 * @returns {Promise<void>} Resolves once the content script has been injected.
 */
chrome.action.onClicked.addListener(async (tab) => {
    await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"],
    });
});
