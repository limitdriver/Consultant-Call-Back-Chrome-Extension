console.log("Content script loaded");

/**
 * DEBUGGING TIP: If the help desk field is still not being extracted,
 * open the browser console on the Salesforce contact page and run:
 * 
 *   document.querySelectorAll('lightning-formatted-text')
 * 
 * Inspect the results to find the element containing the help desk value.
 * Look at its attributes (especially data-* attributes) and parent elements.
 * Then add a more specific selector to the helpDeskSelectors array below.
 */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getContactInfo") {
        console.log("Extracting contact info from page...");

        // Utility to find the first visible matching element
        const getVisibleText = (selector) => {
            const elements = document.querySelectorAll(selector);
            console.log(`Checking selector "${selector}": found ${elements.length} elements`);
            for (const el of elements) {
                const style = window.getComputedStyle(el);
                if (style.display !== "none" && style.visibility !== "hidden" && el.offsetParent !== null) {
                    const text = el.textContent.trim();
                    if (text) {
                        console.log(`  → Visible text found: "${text}"`);
                        return text;
                    }
                }
            }
            return "";
        };

        const name = getVisibleText("lightning-formatted-name");
        const account = getVisibleText("a[href*='/lightning/r/Account/'] span[lwc-47ngqe6rvah]");
        const email = getVisibleText("a[lwc-6dhblsr4nda]");
        
        // Find help desk by locating the label and then finding the value in the same container
        let helpDesk = "";
        const labels = Array.from(document.querySelectorAll('.test-id__field-label, .slds-form-element__label'));
        
        for (const label of labels) {
            const labelText = label.textContent.trim();
            if (labelText === "Help Desk Expiry" || labelText.includes("Help Desk")) {
                // Found the label, now find the value in the parent container
                const container = label.closest('.slds-form-element');
                if (container) {
                    const valueElement = container.querySelector('lightning-formatted-text[data-output-element-id="output-field"]');
                    if (valueElement) {
                        helpDesk = valueElement.textContent.trim();
                        console.log(`Help desk found via label "${labelText}":`, helpDesk);
                        break;
                    }
                }
            }
        }
        
        if (!helpDesk) {
            console.warn("Help desk field not found - label 'Help Desk Expiry' not found on page");
        }

        const phoneNodes = document.querySelectorAll("lightning-formatted-phone a");
        const phoneNumbers = Array.from(phoneNodes)
            .filter(a => a.offsetParent !== null) // only visible numbers
            .map(a => a.textContent.trim())
            .filter(Boolean);

        const uniqueNumbers = [...new Set(phoneNumbers)];

        const contactInfo = {
            contactName: name,
            contactAccount: account,
            contactEmail: email,
            contactNumbers: uniqueNumbers,
            helpDesk: helpDesk
        };

        console.log("Extracted contact info:", contactInfo);
        
        sendResponse(contactInfo);
    }
});
