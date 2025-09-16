import { defaultSubject, defaultBody } from './template.js';
import { ReplacePlaceholders } from "./utils.js";

/**
 * Sends the callback email using the selected contact and filled-in template.
 * Opens the user's default email client via a mailto: link.
 */
export function sendCallbackEmail(contactSelect, currentContactInfo, emailBodyTextarea) {
    const consultantEmail = contactSelect.value;
    const selectedIndex = contactSelect.selectedIndex;
    const consultantName = selectedIndex > 0 ? contactSelect.options[selectedIndex].text : "";

    if (!consultantEmail) {
        alert("Please select a contact.");
        return;
    }

    if (!currentContactInfo) {
        alert("Contact info is not loaded.");
        return;
    }

    const { contactName, contactAccount, contactEmail, number, helpDesk } = currentContactInfo;

    // Save this consultant as the last contacted
    chrome.storage.local.set({ lastContacted: consultantEmail });

    chrome.storage.local.get(["emailSubjectTemplate", "emailBodyTemplate"], (result) => {
        // Use stored templates or fallback to defaults
        let subjectTemplate = result.emailSubjectTemplate || defaultSubject;
        let bodyTemplate = emailBodyTextarea.value || result.emailBodyTemplate || defaultBody;

        // Replace placeholders with actual values
        const subject = ReplacePlaceholders(
            subjectTemplate,
            consultantName,
            contactName,
            contactAccount,
            contactEmail,
            number,
            helpDesk
        );

        const body = ReplacePlaceholders(
            bodyTemplate,
            consultantName,
            contactName,
            contactAccount,
            contactEmail,
            number,
            helpDesk
        );

        // Open email client
        const mailtoLink = `mailto:${consultantEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailtoLink;
    });
}
