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

    /**
     * Extracts the course name from the Moodle page header.
     * @returns {string} The course name, or a warning string if not found.
     */
    function getCourseName() {
        const header = document.querySelector(".page-header-headings");
        if (!header) return "⚠️ Course name not found";

        const h2 = header.querySelector(".h2");
        const courseName = h2 ? h2.innerText.trim() : header.innerText.trim();
        console.info("📌 Course name:", courseName);
        return courseName;
    }

    // --- Initialize JSZip and variables ---
    /** @type {JSZip} */
    var zip = new JSZip();

    /** @type {string[]} User-selected topic names */
    let userSelectedTopics = [];

    /** @type {HTMLElement[]} All section elements found on the page */
    let allSectionElements = [];

    /** @type {File[]} Temporarily collected files before zipping */
    let collectedFiles = [];

    /**
     * Fetches the file blob from a given anchor element's href.
     * @async
     * @param {HTMLAnchorElement} anchorUrl - The anchor element containing the resource URL.
     * @returns {Promise<Blob>} The fetched file blob.
     */
    async function getBlobFromA(anchorUrl) {
        let resourceUrl = anchorUrl.href;
        const res = await fetch(resourceUrl);
        const blob = await res.blob();
        return blob;
    }

    /**
     * Parses a Moodle HTML resource page to extract the actual downloadable link.
     * Adds the found file to `collectedFiles`.
     * @async
     * @param {Blob} blobContent - The HTML blob of the Moodle resource page.
     * @param {HTMLElement} sourceElement - The original link element for naming purposes.
     * @returns {Promise<void>}
     */
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

    /**
     * Parses an HTML page representing a Moodle folder resource.
     * Currently logs diagnostic information about the folder structure.
     * @async
     * @param {Blob} blobContent - The HTML blob representing the folder contents page.
     * @returns {Promise<void>}
     */
    async function parseHtmlResourceFolder(blobContent) {
        const htmlString = await blobContent.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, "text/html");
        console.log("FOUND DOCUMENT: ", doc);

        const allIds = Array.from(doc.querySelectorAll("[id]")).map((el) => el.id);
        console.log("All IDs in parsed doc:", allIds);
        console.log("TITLE: ", doc.querySelectorAll("table"));
        console.log("THE PARENT FOLDER OF ALL IS: ", doc.getElementById("ygtv1"));
    }

    /**
     * Adds a selected section/topic to the list of topics to be downloaded.
     * @async
     * @param {string} sectionName - The name of the section chosen by the user.
     * @returns {Promise<void>}
     */
    async function addListTopics(sectionName) {
        let sectionId = dictionaryTopics[sectionName];
        userSelectedTopics.push(sectionName);
        console.log("User selected topic: ", sectionId);
        console.log("Current list: ", userSelectedTopics);
    }

    /**
     * Parses a "Folder" type Moodle activity and fetches its HTML content.
     * @async
     * @param {HTMLElement} folderLi - The list item representing the folder activity.
     * @returns {Promise<void>}
     */
    async function parseFolderActivity(folderLi) {
        let folderLink = folderLi.querySelector(".activityname > a");
        let folderUrl = folderLink.href;
        const res = await fetch(folderUrl);
        const folderBlob = await res.blob();

        if (folderBlob.type === "text/html") {
            await parseHtmlResourceFolder(folderBlob, folderLi);
        } else {
            console.warn("⚠️ Skipping download, unexpected file type:", folderBlob.type);
        }
    }

    /**
     * Lists all material links (PDFs, resources, folders) from a given section.
     * @async
     * @param {string} sectionName - The section name to extract materials from.
     * @returns {Promise<HTMLAnchorElement[]>} Array of anchor links for downloadable materials.
     */
    async function listSectionMaterials(sectionName) {
        let materialLinks = [];
        let sectionId = dictionaryTopics[sectionName];
        console.log("Looking for section: ", sectionName);
        console.log("Clicked dictionary: ", sectionId);

        let sectionElement = document.getElementById(sectionId);
        let materialListContainer = sectionElement.querySelector("ul");
        let materialItems = materialListContainer.querySelectorAll('li[class^="activity"]');

        materialItems.forEach((materialLi) => {
            const anchor = materialLi.querySelector(".activityname > a");
            if (anchor) {
                materialLinks.push(anchor);
            } else {
                console.warn("No .activityname > a inside", materialLi);
            }
        });

        // Handle folder-type activities
        for (const materialLi of materialItems) {
            if (materialLi.querySelector('img[alt="Folder icon"]')) {
                console.log("FOLDER FOUND...");
                await parseFolderActivity(materialLi);
            }
        }

        return materialLinks;
    }

    /**
     * Generates and triggers the final ZIP download.
     * @async
     * @returns {Promise<void>}
     */
    async function finalDownload() {
        const zipBlob = await zip.generateAsync({ type: "blob" });

        const downloadLink = document.createElement("a");
        downloadLink.href = URL.createObjectURL(zipBlob);
        downloadLink.download = getCourseName() + ".zip";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        downloadLink.remove();
        console.info("Zip file created and downloaded!");
    }

    /**
     * Main orchestrator function.
     * Iterates through user-selected sections, collects PDFs, and triggers ZIP creation.
     * @async
     * @returns {Promise<void>}
     */
    async function downloadSectionPdfs() {
        console.log("I WAS CALLED");
        console.log("USER SELECTED TOPICS: ", userSelectedTopics);

        if (userSelectedTopics.length == 0) {
            alert("⚠️ Nessuna sezione selezionata. Seleziona almeno una sezione.");
            return;
        }

        for (const sectionName of userSelectedTopics) {
            collectedFiles = [];

            let materialLinks = await listSectionMaterials(sectionName);
            for (const materialLink of materialLinks) {
                const blob = await getBlobFromA(materialLink);
                if (blob.type === "text/html") {
                    await parseHtmlResource(blob, materialLink);
                } else {
                    console.warn("⚠️ Skipping download, unexpected file type:", blob.type);
                }
            }

            await createZipBlobs(collectedFiles, sectionName);
        }

        await finalDownload();
    }

    /**
     * Creates zip folders and files based on the collected PDF files for each section.
     * @async
     * @param {File[]} filesToZip - Array of PDF files to include.
     * @param {string} sectionName - The section name used as the folder name in the ZIP.
     * @returns {Promise<void>}
     */
    async function createZipBlobs(filesToZip, sectionName) {
        filesToZip.forEach((pdfFile) => {
            if (pdfFile.type === "application/pdf") {
                const nameParts = pdfFile.name.split(" ");
                const nameWithoutLastTwoParts = nameParts.slice(0, nameParts.length - 2);

                // Build filename (remove last two parts)
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

    /**
     * Extracts all section topics from the page and maps them to IDs.
     * @returns {string[]} An array of section titles.
     */
    function getTopics() {
        const topicsContainer = document.querySelector(".topics");
        if (!topicsContainer) {
            console.warn("⚠️ No .topics element found on page.");
            return [];
        }

        allSectionElements = topicsContainer.querySelectorAll('[id*="section-"]');
        console.info(`📚 Found ${allSectionElements.length} section(s).`);

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

    // --- Export functions to be callable from popup.js ---
    /** @type {() => string} */
    window.getCourseName = getCourseName;

    /** @type {() => string[]} */
    window.getTopics = getTopics;

    /** @type {() => Promise<void>} */
    window.downloadPDF = downloadSectionPdfs;

    /** @type {(sectionName: string) => Promise<void>} */
    window.addListTopics = addListTopics;
})();
