/*
 * Content Script for Moodle Downloader (Refactored)
 * -------------------------------------------------
 * This script runs inside a Moodle course page.
 * It extracts the course name and section topics, lets users select sections,
 * fetches downloadable resources (PDFs, folders, etc.), and bundles them into a ZIP file.
 *
 * Dependencies: JSZip (for zipping)
 * Exported to: popup.js (browser extension)
 *
 * Version 1.2 — with progress updates
 */

(() => {
    var dictionaryTopics = {};

    // --- Helpers ---
    function getCourseName() {
        const header = document.querySelector(".page-header-headings");
        if (!header) return "⚠️ Course name not found";

        const h2 = header.querySelector(".h2");
        const courseName = h2 ? h2.innerText.trim() : header.innerText.trim();
        console.info("📌 Course name:", courseName);
        return courseName;
    }

    async function getBlobFromA(anchor) {
        const res = await fetch(anchor.href, { credentials: "include" });
        return await res.blob();
    }

    function getIconType(sourceElement) {
        const iconImg = sourceElement.closest("li")?.querySelector("img.activityicon");
        if (!iconImg) return "unknown";

        const alt = iconImg.alt?.toLowerCase() || "";
        if (alt.includes("file")) return "file";
        if (alt.includes("folder")) return "folder";
        if (alt.includes("word")) return "word";
        if (alt.includes("powerpoint")) return "ppt";
        if (alt.includes("excel")) return "excel";
        if (alt.includes("page")) return "page";
        return "unknown";
    }

    // --- Global state ---
    const zip = new JSZip();
    let userSelectedTopics = [];
    let allSectionElements = [];
    let collectedFiles = [];

    // --- Core logic ---
    async function parseHtmlResource(blobContent, sourceElement) {
        const htmlString = await blobContent.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, "text/html");
        const resourceAnchor = doc.querySelector(".resourceworkaround > a");
        if (!resourceAnchor) return;

        const iconType = getIconType(sourceElement);

        switch (iconType) {
            case "pdf":
            case "word":
            case "ppt":
            case "excel":
            case "file": {
                const nestedBlob = await getBlobFromA(resourceAnchor);
                const fileName = sourceElement.textContent.trim() || "document";
                const extension = iconType === "word" ? ".docx" : iconType === "ppt" ? ".pptx" : iconType === "excel" ? ".xlsx" : iconType === "file" ? ".pdf" : ".bin";
                const file = new File([nestedBlob], fileName + extension, { type: nestedBlob.type });
                collectedFiles.push(file);
                break;
            }

            case "folder": {
                await parseFolderActivity(sourceElement.closest("li"), getSectionNameFromElement(sourceElement));
                break;
            }
        }
    }

    function getSectionNameFromElement(el) {
        const section = el.closest('[id^="section-"]');
        const title = section?.querySelector("h3")?.innerText.trim();
        return title || "Unknown Section";
    }

    async function parseHtmlResourceFolder(htmlString, sectionName) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, "text/html");
        const tree = doc.querySelector('[class*="foldertree"]');
        if (!tree) return;

        const anchors = tree.querySelectorAll("a");
        const sectionFolder = zip.folder(sectionName);
        const folderTitle = doc.querySelector("h1")?.innerText?.trim() || "Untitled Folder";
        const subFolder = sectionFolder.folder(folderTitle);

        for (const anchor of anchors) {
            const blob = await getBlobFromA(anchor);
            const fileName = anchor.textContent.trim() || "document";
            subFolder.file(fileName, blob);
        }
    }

    async function addListTopics(sectionName) {
        userSelectedTopics.push(sectionName);
    }

    async function parseFolderActivity(folderLi, sectionName) {
        const folderLink = folderLi.querySelector(".activityname a");
        if (!folderLink) return;
        const res = await fetch(folderLink.href, { credentials: "include" });
        if (!res.ok) return;
        const htmlFolder = await res.text();
        await parseHtmlResourceFolder(htmlFolder, sectionName);
    }

    async function listSectionMaterials(sectionName) {
        const sectionId = dictionaryTopics[sectionName];
        const sectionElement = document.getElementById(sectionId);
        const materialItems = sectionElement.querySelectorAll('li[class^="activity"]');
        const materialLinks = [];
        for (const li of materialItems) {
            const anchor = li.querySelector(".activityname > a");
            if (anchor) materialLinks.push(anchor);
        }
        return materialLinks;
    }

    async function createZipBlobs(filesToZip, sectionName) {
        const folder = zip.folder(sectionName);
        filesToZip.forEach((file) => folder.file(file.name, file));
    }

    async function finalDownload() {
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const downloadLink = document.createElement("a");
        downloadLink.href = URL.createObjectURL(zipBlob);
        downloadLink.download = getCourseName() + ".zip";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        downloadLink.remove();
    }

    async function downloadSectionPdfs() {
        if (userSelectedTopics.length === 0) {
            alert("⚠️ Nessuna sezione selezionata. Seleziona almeno una sezione.");
            return;
        }

        const total = userSelectedTopics.length;

        for (let i = 0; i < total; i++) {
            const sectionName = userSelectedTopics[i];
            collectedFiles = [];

            // Notify popup
            chrome.runtime.sendMessage({
                type: "DOWNLOAD_PROGRESS",
                section: sectionName,
                percent: Math.round((i / total) * 100),
            });

            const materialLinks = await listSectionMaterials(sectionName);
            for (const link of materialLinks) {
                const blob = await getBlobFromA(link);
                if (blob.type === "text/html") {
                    await parseHtmlResource(blob, link);
                }
            }

            await createZipBlobs(collectedFiles, sectionName);
        }

        // Notify completion
        chrome.runtime.sendMessage({
            type: "DOWNLOAD_PROGRESS",
            section: "Completato",
            percent: 100,
        });

        await finalDownload();
    }

    function getTopics() {
        const topicsContainer = document.querySelector(".topics");
        if (!topicsContainer) return [];
        allSectionElements = topicsContainer.querySelectorAll('[id*="section-"]');
        const sectionTitles = [];
        allSectionElements.forEach((section) => {
            const h3 = section.querySelector("h3");
            if (h3) {
                const text = h3.innerText.trim();
                if (text) {
                    sectionTitles.push(text);
                    dictionaryTopics[text] = section.id;
                }
            }
        });
        return sectionTitles;
    }

    // --- Export ---
    window.getCourseName = getCourseName;
    window.getTopics = getTopics;
    window.downloadPDF = downloadSectionPdfs;
    window.addListTopics = addListTopics;
})();
