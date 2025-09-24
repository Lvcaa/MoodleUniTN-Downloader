chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "courseName") {
    chrome.storage.local.set({ courseName: message.text });
  }
});

// Optional: inject content.js automatically when you click the extension icon
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["content.js"],
  });
});
