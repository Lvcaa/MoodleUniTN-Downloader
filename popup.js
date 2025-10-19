/**
 * Popup Script for Moodle Downloader
 * ----------------------------------
 * Builds the UI and communicates with content.js
 * Displays a live progress bar as sections download.
 */

document.addEventListener("DOMContentLoaded", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"],
    });

    // --- Update course name ---
    chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => window.getCourseName() }, (res) => {
        const courseEl = document.getElementById("course");
        if (res && res[0]) courseEl.textContent = res[0].result || "Not found";
    });

    // --- Build section buttons ---
    chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => window.getTopics() }, (res) => {
        const divButtons = document.getElementById("topicsList");
        if (!divButtons) return;
        divButtons.innerHTML = "";

        const arr = res?.[0]?.result || [];
        arr.forEach((topic) => {
            const button = document.createElement("button");
            button.textContent = topic;
            button.onclick = () => {
                button.classList.toggle("button-active");
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: (t) => window.addListTopics(t),
                    args: [topic],
                });
            };
            divButtons.appendChild(button);
        });

        const buttonDownloadAll = document.createElement("button");
        buttonDownloadAll.textContent = "Scarica le sezioni selezionate";
        buttonDownloadAll.id = "button-download";
        buttonDownloadAll.onclick = () =>
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => window.downloadPDF(),
            });
        divButtons.appendChild(buttonDownloadAll);
    });

    // --- Checkbox "Select All" ---
    const selectAll = document.getElementById("selectAllSections");
    selectAll.addEventListener("change", () => {
        const buttons = document.querySelectorAll("#topicsList button:not(#button-download)");
        buttons.forEach((btn) => {
            if (selectAll.checked && !btn.classList.contains("button-active")) btn.click();
            if (!selectAll.checked && btn.classList.contains("button-active")) btn.click();
        });
    });

    // --- Listen for progress updates ---
    chrome.runtime.onMessage.addListener((msg) => {
        if (msg.type === "DOWNLOAD_PROGRESS") {
            updateProgressBar(msg.section, msg.percent);
        }
    });
    // --- Listen for progress updates ---
    chrome.runtime.onMessage.addListener((msg) => {
        if (msg.type === "FILE_DOWNLOAD") {
            updateFileProgress(msg.fileName, msg.progress, msg.total);
        }
    });
});
function updateFileProgress(fileName, progress, total) {
    const text = document.getElementById("specific-file");
    if (text) {
        text.textContent = `📄 Scaricando: ${fileName} (${progress}/${total})`;
    }
}
function updateProgressBar(sectionName, percent) {
    const text = document.getElementById("loading-text");
    const fill = document.getElementById("progress-fill");

    if (text && fill) {
        text.textContent = `📦 Scarico: ${sectionName} (${percent}%)`;
        fill.style.width = `${percent}%`;

        if (percent >= 100) {
            text.textContent = `✅ Tutte le sezioni scaricate`;
            fill.style.background = "linear-gradient(90deg, #17ac17 0%, #159515 100%)";
        }
    }
}
