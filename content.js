/*
 * Content Script for Moodle Downloader (Debug Version)
 * ----------------------------------------------------
 * Adds detailed console logging for each step.
 */

(() => {
    var dictionaryTopics = {};

    // --- Helpers ---
    function getCourseName() {
        const header = document.querySelector(".page-header-headings");
        if (!header) return "⚠️ Course name not found";

        const h2 = header.querySelector(".h2");
        const courseName = h2 ? h2.innerText.trim() : header.innerText.trim();
        console.info("📘 Course name detected:", courseName);
        return courseName;
    }

    async function getBlobFromA(anchor) {
        console.log("⬇️ Fetching:", anchor.href);
        const res = await fetch(anchor.href, { credentials: "include" });
        const blob = await res.blob();
        console.log("   ↳ Fetched:", anchor.href, "| Type:", blob.type, "| Size:", blob.size, "bytes");
        return blob;
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
        console.groupCollapsed("🧩 parseHtmlResource →", sourceElement.href);
        const htmlString = await blobContent.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, "text/html");
        const resourceAnchor = doc.querySelector(".resourceworkaround > a") || doc.querySelector('a[href*="pluginfile.php"]') || doc.querySelector("a");

        if (!resourceAnchor) {
            console.warn("⚠️ No downloadable anchor found in resource page:", sourceElement.href);
            console.groupEnd();
            return;
        }

        console.log("   ✅ Found nested anchor:", resourceAnchor.href);
        const iconType = getIconType(sourceElement);
        console.log("   🔎 Detected icon type:", iconType);

        switch (iconType) {
            case "pdf":
            case "word":
            case "ppt":
            case "excel":
            case "page":
            case "file": {
                const nestedBlob = await getBlobFromA(resourceAnchor);
                const fileName = sourceElement.textContent.trim() || "document";
                const extension = iconType === "word" ? ".docx" : iconType === "ppt" ? ".pptx" : iconType === "excel" ? ".xlsx" : iconType === "page" ? ".pdf" : ".bin";
                const file = new File([nestedBlob], fileName + extension, { type: nestedBlob.type });
                collectedFiles.push(file);
                console.log("   📄 Added file:", file.name, "(", file.size, "bytes )");
                break;
            }

            case "folder": {
                console.log("   📁 Detected folder, parsing...");
                await parseFolderActivity(sourceElement.closest("li"), getSectionNameFromElement(sourceElement));
                break;
            }

            default:
                console.warn("⚠️ Unhandled icon type:", iconType);
        }
        console.groupEnd();
    }

    function getSectionNameFromElement(el) {
        const section = el.closest('[id^="section-"]');
        const title = section?.querySelector("h3")?.innerText.trim();
        return title || "Unknown Section";
    }

    async function parseHtmlResourceFolder(htmlString, sectionName) {
        console.groupCollapsed("📂 parseHtmlResourceFolder →", sectionName);
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, "text/html");
        const tree = doc.querySelector('[class*="foldertree"]');
        if (!tree) {
            console.warn("⚠️ No foldertree found in folder HTML for section", sectionName);
            console.groupEnd();
            return;
        }

        const anchors = tree.querySelectorAll("a");
        console.log("   Found", anchors.length, "items in folder.");
        const sectionFolder = zip.folder(sectionName);
        const folderTitle = doc.querySelector("h1")?.innerText?.trim() || "Untitled Folder";
        const subFolder = sectionFolder.folder(folderTitle);

        for (const anchor of anchors) {
            const blob = await getBlobFromA(anchor);
            const fileName = anchor.textContent.trim() || "document";
            subFolder.file(fileName, blob);
            console.log("   📎 Added folder file:", fileName);
        }
        console.groupEnd();
    }

    async function addListTopics(sectionName) {
        userSelectedTopics.push(sectionName);
        console.log("✅ Added to selected topics:", sectionName);
    }

    async function parseFolderActivity(folderLi, sectionName) {
        console.groupCollapsed("📁 parseFolderActivity →", sectionName);
        const folderLink = folderLi.querySelector(".activityname a");
        if (!folderLink) {
            console.warn("⚠️ Folder link missing in section:", sectionName);
            console.groupEnd();
            return;
        }
        console.log("   Fetching folder page:", folderLink.href);
        const res = await fetch(folderLink.href, { credentials: "include" });
        if (!res.ok) {
            console.warn("⚠️ Folder fetch failed:", res.status);
            console.groupEnd();
            return;
        }
        const htmlFolder = await res.text();
        await parseHtmlResourceFolder(htmlFolder, sectionName);
        console.groupEnd();
    }

    async function listSectionMaterials(sectionName) {
        const sectionId = dictionaryTopics[sectionName];
        const sectionElement = document.getElementById(sectionId);
        if (!sectionElement) {
            console.warn("⚠️ Section element not found for:", sectionName);
            return [];
        }

        const materialItems = sectionElement.querySelectorAll('li[class^="activity"]');
        const materialLinks = [];
        for (const li of materialItems) {
            const anchor = li.querySelector(".activityname > a");
            if (anchor) materialLinks.push(anchor);
        }
        console.log("📦 Section", sectionName, "has", materialLinks.length, "materials");
        return materialLinks;
    }

    async function createZipBlobs(filesToZip, sectionName) {
        console.groupCollapsed("📚 createZipBlobs →", sectionName);
        const folder = zip.folder(sectionName);
        filesToZip.forEach((file) => {
            folder.file(file.name, file);
            console.log("   ✅ Added to ZIP:", file.name);
        });
        console.groupEnd();
    }

    async function finalDownload() {
        console.log("🧾 Generating ZIP file...");
        const zipBlob = await zip.generateAsync({ type: "blob" });
        console.log("✅ ZIP generated, size:", zipBlob.size, "bytes");
        const downloadLink = document.createElement("a");
        downloadLink.href = URL.createObjectURL(zipBlob);
        downloadLink.download = getCourseName() + ".zip";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        downloadLink.remove();
        console.log("💾 Download triggered!");
    }

    async function downloadSectionPdfs() {
        console.log("🚀 Starting section download...");
        if (userSelectedTopics.length === 0) {
            alert("⚠️ Nessuna sezione selezionata. Seleziona almeno una sezione.");
            return;
        }

        const total = userSelectedTopics.length;

        for (let i = 0; i < total; i++) {
            const sectionName = userSelectedTopics[i];
            console.group(`🎯 SECTION ${i + 1}/${total}: ${sectionName}`);
            collectedFiles = [];

            chrome.runtime.sendMessage({
                type: "DOWNLOAD_PROGRESS",
                section: sectionName,
                percent: Math.round((i / total) * 100),
            });

            const materialLinks = await listSectionMaterials(sectionName);

            for (const link of materialLinks) {
                console.log("🔗 Checking link:", link.href);
                const blob = await getBlobFromA(link);
                if (blob.type === "text/html") {
                    console.log("📄 HTML wrapper detected — parsing inner resource...");
                    await parseHtmlResource(blob, link);
                } else {
                    // Direct file
                    const fileName = (link.textContent.trim() || "document") + "." + blob.type.split("/").pop();
                    collectedFiles.push(new File([blob], fileName, { type: blob.type }));
                    console.log("📎 Direct file added:", fileName);
                }
            }

            console.log("✅ Collected", collectedFiles.length, "files for section:", sectionName);
            await createZipBlobs(collectedFiles, sectionName);
            console.groupEnd();
        }

        chrome.runtime.sendMessage({
            type: "DOWNLOAD_PROGRESS",
            section: "Completato",
            percent: 100,
        });

        console.log("🎉 All sections processed, building ZIP...");
        await finalDownload();
        console.log("🏁 Download complete!");
    }

    function getTopics() {
        const topicsContainer = document.querySelector(".topics");
        if (!topicsContainer) {
            console.warn("⚠️ Topics container not found");
            return [];
        }
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
        console.info("📚 Sections detected:", sectionTitles);
        return sectionTitles;
    }

    // --- Export ---
    window.getCourseName = getCourseName;
    window.getTopics = getTopics;
    window.downloadPDF = downloadSectionPdfs;
    window.addListTopics = addListTopics;
})();
