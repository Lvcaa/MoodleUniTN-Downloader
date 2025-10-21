/*
 * Content Script for Moodle Downloader (Debug Version - Final)
 * ------------------------------------------------------------
 * Downloads Moodle course sections with detailed console logging.
 */

(() => {
    // === GLOBALS ===
    var dictionaryTopics = {}; // section name → section element id
    const zip = new JSZip();
    let userSelectedTopics = [];
    let allSectionElements = [];
    let collectedFiles = [];

    // === HELPERS ===
    function getCourseName() {
        const header = document.querySelector(".page-header-headings");
        if (!header) return "⚠️ Course name not found";
        const h2 = header.querySelector(".h2");
        const courseName = h2 ? h2.innerText.trim() : header.innerText.trim();
        console.info("📘 Course name detected:", courseName);
        return courseName;
    }

    async function getBlobFromA(anchor) {
        try {
            console.log("⬇️ Fetching:", anchor.href);
            const res = await fetch(anchor.href, { credentials: "include" });
            const blob = await res.blob();
            console.log("   ↳ Fetched:", anchor.href, "| Type:", blob.type, "| Size:", blob.size, "bytes");
            return blob;
        } catch (error) {
            console.error("   ⚠️ Error fetching blob:", error);
            return;
        }
    }

    function getIconType(sourceElement) {
        const iconImg = sourceElement.closest("li")?.querySelector('img[class*="activityicon"]');
        if (!iconImg) {
            console.warn("⚠️ No activity icon found near:", sourceElement.outerHTML);
            return "unknown";
        }
        const src = iconImg.src?.toLowerCase() || "";

        console.log("SRC IS: ", src);
        console.log("   🔍 Icon src:", src);

        if (src.includes("pdf")) return "pdf";
        if (src.includes("folder")) return "folder";
        //TODO: Check that if it is a document treate it as a general file and give it proper extension rather than different logic
        if (src.includes("document")) return "document";
        if (src.includes("powerpoint")) return "ppt";
        if (src.includes("excel")) return "excel";
        if (src.includes("page")) return "page";
        if (src.includes("video")) return "video";
        if (src.includes("forum")) return "forum";
        return "unknown";
    }

    async function parseVideoResource(resourceAnchor) {
        console.log(" I WAS CALLED -----------------------");

        //Parse it again to get the real video link
        const nestedBlob = await fetch(resourceAnchor, { credentials: "include" }).then((res) => res.blob());

        const htmlString = await nestedBlob.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, "text/html");

        console.log("DOCUMENT OF NESTED VIDEO: ", doc.body.innerHTML + "...");

        const realVideoElement = doc.querySelector("video") || doc.querySelector("iframe");
        console.log("REAL VIDEO ELEMENT IS ", realVideoElement);
        if (!realVideoElement) {
            console.warn("⚠️ No video element found in nested HTML");
            return;
        }
        const videoSrc = realVideoElement.getAttribute("src");
        const response = await fetch(videoSrc, { credentials: "include", method: "GET" });
        if (!response.ok) {
            console.warn("⚠️ Video fetch failed:", response.status);
            return;
        }
        const videoBlob = await response.blob();
        console.log("   🎥 Fetched video blob:", videoBlob);
        collectedFiles.push(new File([videoBlob], "video_resource.mp4", { type: videoBlob.type }));
    }

    // === CORE LOGIC ===
    async function parseHtmlResource(blobContent, sourceElement) {
        console.log("CURRENT BLOB IS: ", blobContent);
        console.group("🧩 parseHtmlResource →", sourceElement.href);

        //Parse the HTML content of the wrapper containing real element
        const htmlString = await blobContent.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, "text/html");

        const iconType = getIconType(sourceElement);
        console.log("   Detected icon type:", iconType);

        switch (iconType) {
            case "word":
            case "ppt":
            case "excel":
            case "page":
            case "forum":
                console.log("FOUND A FORUM... IGNORING");
            case "pdf": {
                // Handle all document types
                console.log("   📄 Detected document type, extracting...");
                const resourceAnchor = doc.querySelector(".resourceworkaround > a") || doc.querySelector('a[href*="pluginfile.php"]');

                console.log("RESOURCE ANCHOR IS: ", resourceAnchor);
                if (!resourceAnchor) {
                    console.warn("⚠️ No resource anchor found for document");
                    break;
                }

                const nestedBlob = await getBlobFromA(resourceAnchor);
                let fileName = sourceElement.textContent.trim() || "document";
                fileName = fileName.replace("File", "").trim();

                // Determine extension based on icon type
                let extension = ".bin";
                if (iconType === "document") extension = ".docx";
                else if (iconType === "ppt") extension = ".pptx";
                else if (iconType === "excel") extension = ".xlsx";
                else if (iconType === "pdf") extension = ".pdf";
                else if (iconType === "page") extension = ".pdf";
                else if (iconType === "file") {
                    // Try to detect from blob type
                    const blobType = nestedBlob.type;
                    if (blobType.includes("pdf")) extension = ".pdf";
                    else if (blobType.includes("word") || blobType.includes("document")) extension = ".docx";
                    else if (blobType.includes("presentation")) extension = ".pptx";
                    else if (blobType.includes("sheet")) extension = ".xlsx";
                    else extension = "." + blobType.split("/").pop();
                }

                const file = new File([nestedBlob], fileName + extension, { type: nestedBlob.type });
                collectedFiles.push(file);
                console.log("   📄 Added file:", file.name, "(", file.size, "bytes )");
                break;
            }

            case "folder":
                console.log("   📁 Detected folder, parsing...");
                await parseFolderActivity(sourceElement.closest("li"), getSectionNameFromElement(sourceElement));
                break;

            case "video":
                console.log("   🎥 Detected video resource, parsing...");
                console.log(doc.body.innerHTML.substring(0, 1500) + "...");
                const videoElement = doc.querySelector("#contentframe") || doc.querySelector(".videoDisplay video");
                console.log("VIDEO ELEMENT IS ", videoElement);

                if (!videoElement) {
                    console.warn("⚠️ No video element found in HTML");
                    break;
                }

                const resourceAnchor = videoElement.getAttribute("src");
                console.log("RESOURCE ANCHOR IS: ", resourceAnchor);

                if (!resourceAnchor) {
                    console.warn("⚠️ Video src attribute is empty");
                    break;
                }

                console.log("FETCHING NESTED VIDEO RESOURCE...", resourceAnchor);

                await parseVideoResource(resourceAnchor);
                break;

            default:
                console.warn("⚠️ Unhandled icon type:", iconType);
                console.log("   Dumping HTML for inspection:");
        }
        console.groupEnd();
    }

    function getSectionNameFromElement(el) {
        const section = el.closest('[id^="section-"]');
        const title = section?.querySelector("h3")?.innerText.trim();
        return title || "Unknown Section";
    }

    async function parseHtmlResourceFolder(htmlString, sectionName) {
        console.group("📂 parseHtmlResourceFolder →", sectionName);
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

    async function parseFolderActivity(folderLi, sectionName) {
        console.group("📁 parseFolderActivity →", sectionName);
        const folderLink = folderLi.querySelector(".activityname a");
        console.log("FOLDER LINK IS: ", folderLink);
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
        console.group("📚 createZipBlobs →", sectionName);
        const folder = zip.folder(sectionName);
        console.log("List of files to zip is: ", filesToZip, "files...");
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

    // === MAIN WORKFLOW ===
    async function downloadSectionPdfs() {
        console.log("🚀 Starting section download...");
        if (userSelectedTopics.length === 0) {
            alert("⚠️ Nessuna sezione selezionata. Seleziona almeno una sezione.");
            return;
        }

        const totalSections = userSelectedTopics.length;

        for (let i = 0; i < totalSections; i++) {
            const sectionName = userSelectedTopics[i];
            console.group(`🎯 SECTION ${i + 1}/${totalSections}: ${sectionName}`);
            collectedFiles = [];

            // progress by section
            try {
                chrome.runtime.sendMessage({
                    type: "DOWNLOAD_PROGRESS",
                    section: sectionName,
                    percent: Math.round((i / totalSections) * 100),
                });
            } catch (err) {
                console.warn("⚠️ Popup closed during progress update:", err);
            }

            const materialLinks = await listSectionMaterials(sectionName);

            // per-file progress counter
            for (let j = 0; j < materialLinks.length; j++) {
                const link = materialLinks[j];
                const fileName = link.textContent.trim() || "document";

                try {
                    chrome.runtime.sendMessage({
                        type: "FILE_DOWNLOAD",
                        fileName: fileName,
                        progress: j + 1,
                        total: materialLinks.length,
                    });
                } catch (err) {
                    console.warn("⚠️ Popup closed during file update:", err);
                }

                console.log(`🔗 (${j + 1}/${materialLinks.length}) Checking link:`, link.href);
                const blob = await getBlobFromA(link);

                if (blob.type === "text/html") {
                    console.log("📄 HTML wrapper detected — parsing inner resource...");
                    await parseHtmlResource(blob, link);
                } else {
                    const cleanName = fileName + "." + blob.type.split("/").pop();
                    collectedFiles.push(new File([blob], cleanName, { type: blob.type }));
                    console.log("📎 Direct file added:", cleanName);
                }
            }

            console.log("✅ Collected", collectedFiles.length, "files for:", sectionName);
            await createZipBlobs(collectedFiles, sectionName);
            console.groupEnd();
        }

        // Final progress update
        try {
            chrome.runtime.sendMessage({
                type: "DOWNLOAD_PROGRESS",
                section: "Completato",
                percent: 100,
            });
        } catch (err) {
            console.warn("⚠️ Popup closed during final message:", err);
        }

        console.log("🎉 All sections processed, building ZIP...");

        await finalDownload();
        console.log("🏁 Download complete!");
    }

    // === TOPIC DETECTION ===
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

    // === EXPORTS ===
    window.getCourseName = getCourseName;
    window.getTopics = getTopics;
    window.downloadPDF = downloadSectionPdfs;
    window.addListTopics = (sectionName) => {
        userSelectedTopics.push(sectionName);
        console.log("✅ Added to selected topics:", sectionName);
    };
})();
