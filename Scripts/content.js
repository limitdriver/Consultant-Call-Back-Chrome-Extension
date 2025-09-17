console.log("Content script loaded");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getContactInfo") {
        console.log("Extracting contact info from page...");

        // Utility to find the first visible matching element
        const getVisibleText = (selector) => {
            const elements = document.querySelectorAll(selector);
            for (const el of elements) {
                const style = window.getComputedStyle(el);
                if (style.display !== "none" && style.visibility !== "hidden" && el.offsetParent !== null) {
                    return el.textContent.trim();
                }
            }
            return "";
        };

        const name = getVisibleText("lightning-formatted-name");
        const account = getVisibleText("a[href*='/lightning/r/Account/'] span[lwc-47ngqe6rvah]");
        const email = getVisibleText("a[lwc-6dhblsr4nda]");
        const helpDesk = getVisibleText('lightning-formatted-text[data-output-element-id="output-field"]');

        const phoneNodes = document.querySelectorAll("lightning-formatted-phone a");
        const phoneNumbers = Array.from(phoneNodes)
            .filter(a => a.offsetParent !== null) // only visible numbers
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
