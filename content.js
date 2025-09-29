(() => {
    console.info("📥 Content script loaded. Axios available?", typeof axios);
    var dictionaryTopics = {};

    // --- Extract course name from the page ---
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

    // --- Utility: Parse and format text content ---
    async function parseHtmlResource(blobContent, sourceElement) {
        const htmlString = await blobContent.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, "text/html");

        // console.log("HERE's the document: ", doc);

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

    // async function parseHtmlResourceFolder(blobContent) {
    //     const htmlString = await blobContent.text();

    //     const parser = new DOMParser();
    //     const doc = parser.parseFromString(htmlString, "text/html");
    //     console.log("FOUND DOCUMENT: ", doc);

    //     //Search for download all button
    //     let buttonDownloadAll = doc.querySelector('[id^="single_button"].btn.btn-secondary');
    //     console.log("BUTTON DOWNLOAD ALL: ", buttonDownloadAll);
    // }

    async function addListTopics(sectionName) {
        let sectionId = dictionaryTopics[sectionName];
        userSelectedTopics.push(sectionName);
        console.log("User selected topic: ", sectionId);
        console.log("Current list: ", userSelectedTopics);
    }

    // async function parseFolderActivity(folderLi) {
    //     let folderLink = folderLi.querySelector(".activityname > a");
    //     let folderUrl = folderLink.href;
    //     const res = await fetch(folderUrl);
    //     const folderBlob = await res.blob();

    //     // Check if href contains another href
    //     if (folderBlob.type === "text/html") {
    //         await parseHtmlResourceFolder(folderBlob, folderLi);
    //     } else {
    //         console.warn("⚠️ Skipping download, unexpected file type:", folderBlob.type);
    //     }
    // }

    async function listSectionMaterials(sectionName) {
        let materialLinks = [];
        let sectionId = dictionaryTopics[sectionName];
        console.log("Looking for section: ", sectionName);

        console.log("Clicked dictionary: ", sectionId);

        //Search for all materials in "section-*"
        let sectionElement = document.getElementById(sectionId);

        // Container containing list of sections
        let materialListContainer = sectionElement.querySelector("ul");

        // Single sections
        let materialItems = materialListContainer.querySelectorAll('li[class^="activity"]');

        console.log(sectionElement);
        console.log(materialListContainer);
        console.log("Li list: ", materialItems);

        materialItems.forEach((materialLi) => {
            const anchor = materialLi.querySelector(".activityname > a");
            console.log(anchor);
            if (anchor) {
                materialLinks.push(anchor);
            } else {
                console.warn("No .activityname > a inside", materialLi);
            }
        });
        console.log(materialLinks);

        // //Check if there is any subfolder inside the selected section
        // for (const materialLi of materialItems) {
        //     if (materialLi.querySelector('img[alt="Folder icon"]')) {
        //         console.log("FOLDER FOUND...");
        //         await parseFolderActivity(materialLi);
        //     }
        // }

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
        console.info("Zip file created and downloaded! ");
    }
    async function downloadSectionPdfs() {
        console.log("I WAS CALLED");

        console.log("USER SELECTED TOPICS: ", userSelectedTopics);

        if (userSelectedTopics.length == 0) {
            alert("⚠️ Nessuna sezione selezionata. Seleziona almeno una sezione.");
            return;
        } else {
            if (userSelectedTopics.length > 0) {
                console.log("Comincio download...");
                console.log(dictionaryTopics);

                //Loop over sections selected by user
                for (const sectionName of userSelectedTopics) {
                    collectedFiles = [];

                    let materialLinks = await listSectionMaterials(sectionName);
                    console.log(materialLinks);
                    for (const materialLink of materialLinks) {
                        const blob = await getBlobFromA(materialLink);
                        // Check if href contains another href
                        if (blob.type === "text/html") {
                            await parseHtmlResource(blob, materialLink);
                        } else {
                            console.warn("⚠️ Skipping download, unexpected file type:", blob.type);
                        }
                    }

                    console.log(collectedFiles);
                    await createZipBlobs(collectedFiles, sectionName);
                }
                finalDownload();
            }
        }
    }

    async function createZipBlobs(filesToZip, sectionName) {
        filesToZip.forEach((pdfFile) => {
            // PDF case
            if (pdfFile.type == "application/pdf") {
                const nameParts = pdfFile.name.split(" ");
                const nameWithoutLastTwoParts = nameParts.slice(0, nameParts.length - 2);
                // Build filename
                console.log(nameWithoutLastTwoParts);

                let baseFileName = "";
                for (let i = 0; i < nameWithoutLastTwoParts.length; i++) {
                    baseFileName += nameParts[i];
                    if (!(i == nameWithoutLastTwoParts.length - 1)) {
                        baseFileName += " ";
                    }
                }
                const fileName = baseFileName + ".pdf";
                console.log(fileName);
                zip.folder(sectionName).file(fileName, pdfFile);
            }
        });
    }

    // --- Extract topics from the page ---
    function getTopics() {
        const topicsContainer = document.querySelector(".topics");
        if (!topicsContainer) {
            console.warn("⚠️ No .topics element found on page.");
            return [];
        }

        allSectionElements = topicsContainer.querySelectorAll('[id*="section-"]');
        console.info(`📚 Found ${allSectionElements.length} section(s).`);

        const sectionTitles = [];

        console.group("📖 Section Titles");
        for (let i = 0; i < allSectionElements.length; i++) {
            const h3 = allSectionElements[i].querySelector("h3");
            if (h3) {
                const text = h3.innerText.trim();
                if (text !== "") {
                    console.log(`Section ${i + 1}:`, text);
                    sectionTitles.push(text);
                    dictionaryTopics[text] = allSectionElements[i].id;
                }
            }
        }
        console.log(dictionaryTopics);
        console.groupEnd();

        return sectionTitles;
    }

    // --- Export functions to be callable from popup.js ---
    window.getCourseName = getCourseName;
    window.getTopics = getTopics;
    window.downloadPDF = downloadSectionPdfs;
    window.addListTopics = addListTopics;
})();
