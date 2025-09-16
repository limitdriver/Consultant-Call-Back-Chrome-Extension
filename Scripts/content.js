console.log("Content script loaded");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getContactInfo") {
        const name = document.querySelector("lightning-formatted-name")?.textContent.trim() || "";
        const account = document.querySelector("span[lwc-47ngqe6rvah]")?.textContent.trim() || "";
        const email = document.querySelector("a[lwc-6dhblsr4nda]")?.textContent.trim() || "";
        const helpDesk = document.querySelector('lightning-formatted-text[data-output-element-id="output-field"]')?.textContent.trim() || "";

        const phoneNodes = document.querySelectorAll("lightning-formatted-phone a");
        const phoneNumbers = Array.from(phoneNodes)
            .map(a => a.textContent.trim())
            .filter(Boolean);

        const uniqueNumbers = [...new Set(phoneNumbers)];

        sendResponse({
            contactName: name,
            contactAccount: account,
            contactEmail: email,
            contactNumbers: uniqueNumbers,
            helpDesk: helpDesk
        });
    }
});
