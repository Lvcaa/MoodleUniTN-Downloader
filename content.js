(() => {
    console.info("📥 Content script loaded. Axios available?", typeof axios);
    var dictionaryTopics = {};

    // --- Extract course name from the page ---
    function getCourseName() {
        const header = document.querySelector(".page-header-headings");
        if (!header) return "⚠️ Course name not found";

        const h2 = header.querySelector(".h2");
        const name = h2 ? h2.innerText.trim() : header.innerText.trim();
        console.info("📌 Course name:", name);
        return name;
    }

    let sectionTopics = [];

    // --- Utility: Parse and format text content ---
    function parseTextContent(content) {
        if (!content) {
            console.error("❌ No text content provided to parser:", content);
            return;
        }

        const divText = content.querySelector(".no-overflow");
        const divTextElements = divText?.querySelectorAll("p") || [];

        console.group("📝 Parsed Text Content");
        divTextElements.forEach((p, i) => {
            console.log(`Paragraph ${i + 1}:`, p.innerText.trim());
        });
        console.groupEnd();
    }

    async function listMaterial(section) {
        let listHrefsMaterials = [];
        let idSection = dictionaryTopics[section];
        console.log("Clicked dictionary: ", idSection);

        //Search for all materials in "section-*"
        let liSection = document.getElementById(idSection);

        // Container containing list of sections
        let materialWrapper = liSection.querySelector("ul");

        // Single sections
        let materialList = materialWrapper.querySelectorAll('li[class^="activity"]');

        console.log(liSection);
        console.log(materialWrapper);
        console.log("Li list: ", materialList);

        materialList.forEach((link) => {
            console.log(link.querySelector(".activityname > a"));
            listHrefsMaterials.push(link.querySelector(".activityname > a"));
        });
        console.log(listHrefsMaterials);
        return listHrefsMaterials;
    }

    async function downloadPDF(section) {
        console.log(section);
        let list = await listMaterial(section);
        let listBlobs = [];
        console.log(list);
        for (const element of list) {
            url = element.href;
            const res = await fetch(url);
            const blob = await res.blob();
            const file = new File([blob], "document", { type: blob.type });

            // Check if href contains another href
            if (file.type === "text/html") {
                const htmlString = await blob.text();

                const parser = new DOMParser();
                const doc = parser.parseFromString(htmlString, "text/html");

                const ahref = doc.querySelector(".resourceworkaround > a")?.href;
                console.info("🔗 Extracted PDF link:", ahref);

                if (ahref) {
                    const res2 = await fetch(ahref);
                    const blob2 = await res2.blob();
                    const realFile = new File([blob2], element.textContent.trim() || file.pdf, { type: blob2.type });
                    listBlobs.push(realFile);
                } else {
                    console.warn("⚠️ No resource link found in .resourceworkaround");
                }
            } else {
                console.warn("⚠️ Skipping download, unexpected file type:", file.type);
            }
        }

        console.log(listBlobs);

        await createZipBlobs(listBlobs, section);
        // const url = "https://didatticaonline.unitn.it/dol/mod/resource/view.php?id=1363650";
        // fetch(url)
        //     .then((res) => res.blob())
        //     .then((blob) => {
        //         const file = new File([blob], "document", { type: blob.type });
        //         console.info("📂 Download attempt - file type:", file.type);

        //         // Check if href contains another href
        //         if (file.type === "text/html") {
        //             file.text().then((htmlString) => {
        //                 const parser = new DOMParser();
        //                 const doc = parser.parseFromString(htmlString, "text/html");

        //                 const ahref = doc.querySelector(".resourceworkaround > a")?.href;
        //                 console.info("🔗 Extracted PDF link:", ahref);

        //                 if (ahref) {
        //                     const downloadLink = document.createElement("a");
        //                     downloadLink.href = ahref;
        //                     downloadLink.download = "Prova.pdf";
        //                     document.body.appendChild(downloadLink);
        //                     downloadLink.click();
        //                     console.info("✅ Triggered download for Prova.pdf");
        //                 } else {
        //                     console.warn("⚠️ No resource link found in .resourceworkaround");
        //                 }
        //             });
        //         } else {
        //             console.warn("⚠️ Skipping download, unexpected file type:", file.type);
        //         }
        //     });
    }
    async function createZipBlobs(listBlobs, section) {
        var zip = new JSZip();
        listBlobs.forEach((file) => {
            // PDF case
            if (file.type == "application/pdf") {
                const nameSplit = file.name.split(" ");
                const lastName = nameSplit.slice(0, nameSplit.length - 2);
                // Build filename
                console.log(lastName);

                let progressiveName = "";
                for (let i = 0; i < lastName.length; i++) {
                    //Append next word from split
                    progressiveName += nameSplit[i];
                    // Prevent adding last space
                    if (!(i == lastName.length - 1)) {
                        progressiveName += " ";
                    }
                }
                const fileName = progressiveName + ".pdf";
                console.log("HERE");
                console.log(fileName);
                zip.file(fileName, file);
            }
        });

        const content = await zip.generateAsync({ type: "blob" });

        const link = document.createElement("a");
        link.href = URL.createObjectURL(content);
        link.download = section + ".zip";
        document.body.appendChild(link);
        link.click();
        link.remove();
        console.info("Zip file created and downloaded! ");
    }

    // --- Extract topics from the page ---
    function getTopics() {
        const topics = document.querySelector(".topics");
        if (!topics) {
            console.warn("⚠️ No .topics element found on page.");
            return [];
        }

        sectionTopics = topics.querySelectorAll('[id*="section-"]');
        console.info(`📚 Found ${sectionTopics.length} section(s).`);

        const result = [];

        console.group("📖 Section Titles");
        for (let i = 0; i < sectionTopics.length; i++) {
            const h3 = sectionTopics[i].querySelector("h3");
            if (h3) {
                const text = h3.innerText.trim();
                if (text !== "") {
                    console.log(`Section ${i + 1}:`, text);
                    result.push(text);
                    dictionaryTopics[text] = sectionTopics[i].id;
                }
            }
        }
        console.log(dictionaryTopics);
        console.groupEnd();

        // // Example: extract content from the third section (index 2)
        // const linkElement = sectionTopics[2]?.querySelector('[class*="aalink"]');
        // if (linkElement && linkElement.href) {
        //     const hrefToParse = linkElement.href;
        //     console.info("🔎 Fetching section link:", hrefToParse);

        //     fetch(hrefToParse)
        //         .then((res) => res.text())
        //         .then((html) => {
        //             const parser = new DOMParser();
        //             const doc = parser.parseFromString(html, "text/html");

        //             const title = doc.querySelector(".h2")?.innerText;
        //             const content = doc.querySelector(".box.py-3.generalbox.center.clearfix");

        //             console.group("📦 Section Content Page");
        //             console.log("Title:", title || "❌ Not found");
        //             console.log("Box content element:", content || "❌ None");
        //             console.groupEnd();

        //             downloadPDF();
        //             parseTextContent(content);
        //         })
        //         .catch((err) => {
        //             console.error("❌ Error fetching linked page:", err);
        //         });
        // } else {
        //     console.warn("⚠️ No link element found in third section.");
        // }

        return result;
    }

    // --- Export functions to be callable from popup.js ---
    window.getCourseName = getCourseName;
    window.getTopics = getTopics;
    window.downloadPDF = downloadPDF;
})();
