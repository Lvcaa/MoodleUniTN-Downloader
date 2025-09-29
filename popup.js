document.addEventListener("DOMContentLoaded", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"],
    });

    // Update course name in popup
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

    // Build topic buttons in popup
    chrome.scripting.executeScript(
        {
            target: { tabId: tab.id },
            func: () => window.getTopics(),
        },
        (res) => {
            const divButtons = document.getElementById("topicsList");
            if (!divButtons) return;
            divButtons.innerHTML = "";

            if (res && res[0] && Array.isArray(res[0].result)) {
                const arr = res[0].result;
                for (let i = 0; i < arr.length; i++) {
                    const button = document.createElement("button");
                    button.textContent = arr[i];

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
            let buttonDownloadAll = document.createElement("button");
            buttonDownloadAll.textContent = "Scarica le sezioni selezionate";
            buttonDownloadAll.id = "button-download";
            //Scarica tutte le sezioni selezionate
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
