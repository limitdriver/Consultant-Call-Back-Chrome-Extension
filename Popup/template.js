import { ReplacePlaceholders } from "./utils.js";

export const defaultSubject = "Help Desk Callback: {name}";
export const defaultBody = `Hi {consultant},

Please call back {name} on {number}.

ACCOUNT: {account}
EMAIL: {email}
HELP DESK EXPIRY: {helpDesk}

Cheers,
NAME`;

// Load the initial template preview
export function loadTemplatePreview(templatePreview) {
    return new Promise((resolve) => {
        chrome.storage.local.get(['emailBodyTemplate', 'emailSubjectTemplate'], (result) => {
            const body = result.emailBodyTemplate || defaultBody;
            const previewText = ReplacePlaceholders(
                body,
                "Consultant Name",
                "Contact Name",
                "Account Name",
                "email@example.com",
                "0123 456 789",
                "01/01/1980"
            );
            templatePreview.innerText = previewText;
            resolve();
        });
    });
}

// Update preview using currentContactInfo and stored template
export function updateTemplatePreview(templatePreview, contactSelect, currentContactInfo) {
    chrome.storage.local.get(['emailSubjectTemplate', 'emailBodyTemplate'], (result) => {
        const bodyTemplate = result.emailBodyTemplate || defaultBody;

        const selectedIndex = contactSelect.selectedIndex;
        const consultantName = selectedIndex > 0 ? contactSelect.options[selectedIndex].text : "";

        if (!currentContactInfo) return;

        const {
            contactName = "",
            contactAccount = "",
            contactEmail = "",
            number = "",
            helpDesk = ""
        } = currentContactInfo;

        const previewText = ReplacePlaceholders(
            bodyTemplate,
            consultantName,
            contactName,
            contactAccount,
            contactEmail,
            number,
            helpDesk
        );

        templatePreview.innerText = previewText;
    });
}
