/**
 * Popup Script for Moodle Downloader
 * ----------------------------------
 * Runs when the browser extension popup is opened.
 * Communicates with the active tab (Moodle course page) and injects `content.js` if needed.
 *
 * Responsibilities:
 * - Load the content script into the current active tab.
 * - Retrieve and display the course name.
 * - Retrieve the list of topics/sections and create buttons for them in the popup.
 * - Allow users to select sections and start the download process.
 *
 * Dependencies: Chrome Extension APIs (`chrome.tabs`, `chrome.scripting`)
 * Related Files: content.js (injected content script)
 *
 * Version 1.0
 */

document.addEventListener("DOMContentLoaded", async () => {
    /**
     * Get the active tab in the current Chrome window.
     * @type {[chrome.tabs.Tab]} Active tab array (first item is current tab)
     */
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    /**
     * Inject the content script (`content.js`) into the current active tab
     * so that its functions (getCourseName, getTopics, etc.) become available.
     */
    await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"],
    });

    /**
     * --- Update the course name in the popup ---
     * Executes the `getCourseName()` function from content.js
     * and updates the popup UI with the course title.
     */
    chrome.scripting.executeScript(
        {
            target: { tabId: tab.id },
            func: () => window.getCourseName(),
        },
        (res) => {
            const courseEl = document.getElementById("course");
            if (!courseEl) return;
            if (res && res[0]) courseEl.textContent = res[0].result || "Not found";
        }
    );

    /**
     * --- Build topic buttons dynamically in the popup ---
     * Executes the `getTopics()` function from content.js to retrieve section names.
     * Creates one button per topic, allowing the user to select which to download.
     */
    chrome.scripting.executeScript(
        {
            target: { tabId: tab.id },
            func: () => window.getTopics(),
        },
        (res) => {
            const divButtons = document.getElementById("topicsList");
            if (!divButtons) return;
            divButtons.innerHTML = "";

            // If topics were found, create one button per topic
            if (res && res[0] && Array.isArray(res[0].result)) {
                const arr = res[0].result;

                for (let i = 0; i < arr.length; i++) {
                    /**
                     * Create and configure the button for each topic.
                     * @type {HTMLButtonElement}
                     */
                    const button = document.createElement("button");
                    button.textContent = arr[i];

                    /**
                     * Toggle the button’s active state on click and
                     * notify the content script of the selected topic.
                     */
                    button.onclick = () => {
                        const topic = button.textContent;
                        button.classList.toggle("button-active");

                        chrome.scripting.executeScript({
                            target: { tabId: tab.id },
                            func: (t) => window.addListTopics(t),
                            args: [topic],
                        });
                    };

                    divButtons.appendChild(button);
                }
            }

            /**
             * --- Create the "Download Selected Sections" button ---
             * When clicked, it calls `downloadPDF()` inside content.js
             * to start the ZIP creation and download process.
             */
            let buttonDownloadAll = document.createElement("button");
            buttonDownloadAll.textContent = "Scarica le sezioni selezionate";
            buttonDownloadAll.id = "button-download";

            buttonDownloadAll.onclick = () => {
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: () => window.downloadPDF(),
                });
            };

            divButtons.appendChild(buttonDownloadAll);
        }
    );
});
