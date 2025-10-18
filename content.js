/*
 * Content Script for Moodle Downloader
 * ------------------------------------
 * This script runs inside a Moodle course page.
 * It extracts the course name and section topics, lets users select sections,
 * fetches downloadable resources (PDFs, folders, etc.), and bundles them into a ZIP file.
 *
 * Dependencies: JSZip (for zipping), Axios (optional)
 * Exported to: popup.js (browser extension)
 *
 * Version 1.0
 */

(() => {
    console.info("📥 Content script loaded. Axios available?", typeof axios);
    var dictionaryTopics = {};

    function getCourseName() {
        const header = document.querySelector(".page-header-headings");
        if (!header) return "⚠️ Course name not found";

        const h2 = header.querySelector(".h2");
        const courseName = h2 ? h2.innerText.trim() : header.innerText.trim();
        console.info("📌 Course name:", courseName);
        return courseName;
    }

    var zip = new JSZip();
    let userSelectedTopics = [];
    let allSectionElements = [];
    let collectedFiles = [];

    async function getBlobFromA(anchorUrl) {
        let resourceUrl = anchorUrl.href;
        const res = await fetch(resourceUrl);
        const blob = await res.blob();
        return blob;
    }

    async function parseHtmlResource(blobContent, sourceElement) {
        const htmlString = await blobContent.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, "text/html");
        const resourceAnchor = doc.querySelector(".resourceworkaround > a");
        console.info("🔗 Extracted PDF link:", resourceAnchor);

        if (resourceAnchor) {
            const nestedBlob = await getBlobFromA(resourceAnchor);
            const nestedFile = new File([nestedBlob], sourceElement.textContent.trim() || "document.pdf", { type: nestedBlob.type });
            collectedFiles.push(nestedFile);
        } else {
            console.warn("⚠️ No resource link found in .resourceworkaround");
        }
    }

    // --- KEEPING LOGS ONLY INSIDE THIS FUNCTION ---
    async function parseHtmlResourceFolder(htmlString, sectionName) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, "text/html");

        const tree = doc.querySelector('[class*="foldertree"]');
        console.log("TREE STRUCTURE: ", tree);

        const anchors = tree.querySelectorAll("a");
        console.log("ALL ANCHORS IN THE TREE: ", anchors);

        //Add folder to zip
        const sectionFolder = zip.folder(sectionName);

        for (const anchor of anchors) {
            const blob = await getBlobFromA(anchor);
            const file = new File([blob], anchor.textContent.trim() || "document.pdf", { type: blob.type });
            const subFolder = sectionFolder.folder(doc.querySelector("h1").innerHTML); // Nested folder
            subFolder.file(file.name, file);
        }
    }

    async function addListTopics(sectionName) {
        let sectionId = dictionaryTopics[sectionName];
        userSelectedTopics.push(sectionName);
        console.log("User selected topic: ", sectionId);
        console.log("Current list: ", userSelectedTopics);
    }

    async function parseFolderActivity(folderLi, sectionName) {
        let folderLink = folderLi.querySelector(".activityname a");
        let folderUrl = folderLink.href;

        const res = await fetch(folderUrl, { credentials: "include" });
        const htmlFolder = await res.text();

        if (res) {
            await parseHtmlResourceFolder(htmlFolder, sectionName);
        } else {
            console.warn("⚠️ Skipping download, unexpected file type");
        }
    }

    async function listSectionMaterials(sectionName) {
        let materialLinks = [];
        let sectionId = dictionaryTopics[sectionName];

        let sectionElement = document.getElementById(sectionId);
        let materialListContainer = sectionElement.querySelector("ul");
        let materialItems = materialListContainer.querySelectorAll('li[class^="activity"]');

        materialItems.forEach((materialLi) => {
            const anchor = materialLi.querySelector(".activityname > a");
            if (anchor) {
                materialLinks.push(anchor);
            }
        });

        for (const materialLi of materialItems) {
            if (materialLi.querySelector('img[alt="Folder icon"]')) {
                await parseFolderActivity(materialLi, sectionName);
            }
        }

        return materialLinks;
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
        if (userSelectedTopics.length == 0) {
            alert("⚠️ Nessuna sezione selezionata. Seleziona almeno una sezione.");
            return;
        }

        for (const sectionName of userSelectedTopics) {
            // Reset collected files for the new section
            collectedFiles = [];

            let materialLinks = await listSectionMaterials(sectionName);
            for (const materialLink of materialLinks) {
                const blob = await getBlobFromA(materialLink);
                if (blob.type === "text/html") {
                    await parseHtmlResource(blob, materialLink);
                }
            }

            await createZipBlobs(collectedFiles, sectionName);
        }

        await finalDownload();
    }

    async function createZipBlobs(filesToZip, sectionName) {
        filesToZip.forEach((pdfFile) => {
            if (pdfFile.type === "application/pdf") {
                const nameParts = pdfFile.name.split(" ");
                const nameWithoutLastTwoParts = nameParts.slice(0, nameParts.length - 2);
                let baseFileName = "";
                for (let i = 0; i < nameWithoutLastTwoParts.length; i++) {
                    baseFileName += nameParts[i];
                    if (!(i === nameWithoutLastTwoParts.length - 1)) {
                        baseFileName += " ";
                    }
                }
                const fileName = baseFileName + ".pdf";
                zip.folder(sectionName).file(fileName, pdfFile);
            }
        });
    }

    function getTopics() {
        const topicsContainer = document.querySelector(".topics");
        if (!topicsContainer) return [];

        allSectionElements = topicsContainer.querySelectorAll('[id*="section-"]');
        const sectionTitles = [];

        for (let i = 0; i < allSectionElements.length; i++) {
            const h3 = allSectionElements[i].querySelector("h3");
            if (h3) {
                const text = h3.innerText.trim();
                if (text !== "") {
                    sectionTitles.push(text);
                    dictionaryTopics[text] = allSectionElements[i].id;
                }
            }
        }

        return sectionTitles;
    }

    window.getCourseName = getCourseName;
    window.getTopics = getTopics;
    window.downloadPDF = downloadSectionPdfs;
    window.addListTopics = addListTopics;
})();
