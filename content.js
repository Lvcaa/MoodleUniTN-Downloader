/*
 * Content Script for Moodle Downloader (Refactored)
 * -------------------------------------------------
 * This script runs inside a Moodle course page.
 * It extracts the course name and section topics, lets users select sections,
 * fetches downloadable resources (PDFs, folders, etc.), and bundles them into a ZIP file.
 *
 * Dependencies: JSZip (for zipping), Axios (optional)
 * Exported to: popup.js (browser extension)
 *
 * Version 1.1
 */

(() => {
    console.info("📥 Content script loaded. Axios available?", typeof axios);
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

        //Written text
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

        if (!resourceAnchor) {
            console.warn("⚠️ No resource link found in .resourceworkaround");
            return;
        }

        // Check icon type before deciding how to fetch
        const iconType = getIconType(sourceElement);
        console.info(`🔍 Detected icon type: ${iconType}`);

        switch (iconType) {
            case "pdf": {
                const nestedBlob = await getBlobFromA(resourceAnchor);
                const file = new File([nestedBlob], sourceElement.textContent.trim() || "document.pdf", { type: nestedBlob.type });
                collectedFiles.push(file);
                console.info("📄 Added PDF file:", file.name);
                break;
            }

            case "word":
            case "ppt":
            case "excel":
            case "file": {
                const nestedBlob = await getBlobFromA(resourceAnchor);
                const fileName = sourceElement.textContent.trim() || "document";
                const extension = iconType === "word" ? ".docx" : iconType === "ppt" ? ".pptx" : iconType === "excel" ? ".xlsx" : ".bin";
                console.info("🗂️ Detected file type:", nestedBlob);
                const file = new File([nestedBlob], fileName + extension, { type: nestedBlob.type });
                collectedFiles.push(file);
                console.info("📁 Added file:", file.name);
                break;
            }

            case "folder": {
                console.info("📂 Folder icon detected, delegating to parseFolderActivity...");
                await parseFolderActivity(sourceElement.closest("li"), getSectionNameFromElement(sourceElement));
                break;
            }

            default:
                console.warn("⚠️ Unknown or unsupported resource type:", iconType);
        }
    }

    // Helper to extract section name from element context
    function getSectionNameFromElement(el) {
        const section = el.closest('[id^="section-"]');
        const title = section?.querySelector("h3")?.innerText.trim();
        return title || "Unknown Section";
    }

    // --- Folder parsing ---
    async function parseHtmlResourceFolder(htmlString, sectionName) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, "text/html");

        const tree = doc.querySelector('[class*="foldertree"]');
        if (!tree) {
            console.warn("⚠️ Folder tree not found in section:", sectionName);
            return;
        }

        const anchors = tree.querySelectorAll("a");
        console.log("📂 Found anchors in folder:", anchors);

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
        const sectionId = dictionaryTopics[sectionName];
        userSelectedTopics.push(sectionName);
        console.log("✅ User selected topic:", sectionId);
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

            if (li.querySelector('img[alt*="Folder"]')) {
                await parseFolderActivity(li, sectionName);
            }
        }

        return materialLinks;
    }

    async function createZipBlobs(filesToZip, sectionName) {
        const folder = zip.folder(sectionName);
        filesToZip.forEach((file) => {
            if (file.type === "application/pdf") {
                const cleanName = file.name.replace(/\s+\S{2,}$/g, "") + ".pdf";
                folder.file(cleanName, file);
            } else {
                folder.file(file.name, file);
            }
        });
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

        for (const sectionName of userSelectedTopics) {
            collectedFiles = [];
            const materialLinks = await listSectionMaterials(sectionName);

            for (const link of materialLinks) {
                const blob = await getBlobFromA(link);
                if (blob.type === "text/html") {
                    await parseHtmlResource(blob, link);
                }
            }

            await createZipBlobs(collectedFiles, sectionName);
        }

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

    // --- Export functions to window ---
    window.getCourseName = getCourseName;
    window.getTopics = getTopics;
    window.downloadPDF = downloadSectionPdfs;
    window.addListTopics = addListTopics;
})();
