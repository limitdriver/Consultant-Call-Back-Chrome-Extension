const contactSelect = document.getElementById("contactSelect");
const addContactButton = document.getElementById("addContactButton");
const sendEmailButton = document.getElementById("sendEmailButton");
const editButton = document.getElementById("editTemplateButton");
const templatePreview = document.getElementById("templatePreview");
const editorWrapper = document.getElementById("editorWrapper");
const preferredNumberSelect = document.getElementById("preferredNumberSelect");
const preferredNumberLabel = document.querySelector('label[for="preferredNumberSelect"]');
const emailBodyTextarea = document.getElementById("emailBodyTextarea");
const insertButtons = document.getElementById('insertButtons');
const textarea = document.getElementById('emailBodyTextarea');

let isEditing = false;
let currentContactInfo = null;

const defaultSubject = "Help Desk Callback: {name}";
const defaultBody = `Hi {consultant},

Please call back {name} on {number}.

ACCOUNT: {account}
EMAIL: {email}
HELP DESK EXPIRY: {helpDesk}

Cheers,
NAME`;

document.addEventListener("DOMContentLoaded", async () => {
    loadContacts();
    await loadTemplatePreview();

    // Load saved body into textarea
    chrome.storage.local.get('emailBodyTemplate', (result) => {
        emailBodyTextarea.value = result.emailBodyTemplate || defaultBody;
    });

    // Save changes on input only if editing
    emailBodyTextarea.addEventListener('input', () => {
        if (isEditing) {
            chrome.storage.local.set({ emailBodyTemplate: emailBodyTextarea.value });
            updateTemplatePreview();
        }
    });

    // Button listeners
    addContactButton.addEventListener("click", addNewContact);
    sendEmailButton.addEventListener("click", sendCallbackEmail);
    editButton.addEventListener("click", toggleEditMode);

    contactSelect.addEventListener("change", () => {
        updateTemplatePreview();
    });

    // Request contact info from content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTabId = tabs[0].id;
        chrome.tabs.sendMessage(activeTabId, { action: "getContactInfo" }, (contact) => {
            if (chrome.runtime.lastError || !contact) {
                console.warn("Could not get contact info from page.");
                return;
            }

            console.log("Contact info received:", contact);

            currentContactInfo = contact;

            // Select preferred number logic
            const numbers = contact.contactNumbers || [];
            if (numbers.length === 1) {
                currentContactInfo.number = numbers[0];
                preferredNumberSelect.style.display = "none";
                preferredNumberLabel.style.display = "none";
            } else if (numbers.length > 1) {
                preferredNumberSelect.innerHTML = ""; // Clear
                numbers.forEach(number => {
                    const option = document.createElement("option");
                    option.value = number;
                    option.textContent = number;
                    preferredNumberSelect.appendChild(option);
                });
                preferredNumberSelect.style.display = "inline-block";
                preferredNumberLabel.style.display = "inline-block";
                // Set default selection
                currentContactInfo.number = numbers[0];
            }

            preferredNumberSelect.addEventListener("change", () => {
                currentContactInfo.number = preferredNumberSelect.value;
                updateTemplatePreview();
            });

            updateTemplatePreview();
        });
    });
});

insertButtons.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
        const insertText = e.target.getAttribute('data-insert');
        insertAtCursor(textarea, insertText);
        textarea.focus();  // Keep focus on textarea
    }
});

function insertAtCursor(textarea, text) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = textarea.value.substring(0, start);
    const after = textarea.value.substring(end);
    textarea.value = before + text + after;
    const cursorPos = start + text.length;
    textarea.selectionStart = textarea.selectionEnd = cursorPos;
}

// Listen for async message from content script (in case popup is already open)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "contactInfoLoaded") {
        console.log("Contact info received:", request);
        currentContactInfo = request;
        handlePreferredNumber(currentContactInfo);
        updateTemplatePreview();
    }
});



// Toggle between preview and edit mode
function toggleEditMode() {
    if (isEditing) {
        // Save textarea content and switch to preview mode
        const content = emailBodyTextarea.value;
        chrome.storage.local.set({ emailBodyTemplate: content }, () => {
            updateTemplatePreview();
            editorWrapper.style.display = "none";
            templatePreview.style.display = "block";
            insertButtons.style.display = "none";
            editButton.innerText = "Edit";
            sendEmailButton.style.display = "inline-block"; // Show send button
            isEditing = false;
        });
    } else {
        editorWrapper.style.display = "flex";
        templatePreview.style.display = "none";
        insertButtons.style.display = "flex";
        editButton.innerText = "Save";
        sendEmailButton.style.display = "none"; // Hide send button while editing
        isEditing = true;
    }
}


// Load the initial template preview
function loadTemplatePreview() {
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
function updateTemplatePreview() {
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

// Replace template placeholders
function ReplacePlaceholders(text, consultantName, contactName, contactAccount, contactEmail, contactNumber, helpDesk) {
    return text
        .replaceAll("{consultant}", consultantName)
        .replaceAll("{name}", contactName)
        .replaceAll("{account}", contactAccount)
        .replaceAll("{email}", contactEmail)
        .replaceAll("{number}", contactNumber)
        .replaceAll("{helpDesk}", helpDesk);
}

// Load stored contacts
function loadContacts() {
    chrome.storage.local.get({ contacts: [], lastContacted: null }, (result) => {
        contactSelect.innerHTML = '<option value="">Select a contact</option>';
        result.contacts.forEach((contact) => {
            const option = document.createElement("option");
            option.value = contact.email;
            option.textContent = contact.name;

            if (contact.email === result.lastContacted) {
                option.selected = true;
            }

            contactSelect.appendChild(option);
        });
    });
}

// Add new contact to local storage
function addNewContact() {
    const name = prompt("Enter contact name:");
    const email = prompt("Enter contact email:");

    if (!name || !email) {
        alert("Both name and email are required.");
        return;
    }

    const newContact = { name, email };

    chrome.storage.local.get({ contacts: [] }, (result) => {
        const updatedContacts = [...result.contacts, newContact];
        chrome.storage.local.set({ contacts: updatedContacts }, loadContacts);
    });
}

// Send callback email
function sendCallbackEmail() {
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

    chrome.storage.local.set({ lastContacted: consultantEmail });

    chrome.storage.local.get(["emailSubjectTemplate", "emailBodyTemplate"], (result) => {
        let subjectTemplate = result.emailSubjectTemplate || defaultSubject;
        let bodyTemplate = emailBodyTextarea.value || result.emailBodyTemplate || defaultBody;

        subjectTemplate = ReplacePlaceholders(subjectTemplate, consultantName, contactName, contactAccount, contactEmail, number, helpDesk);
        bodyTemplate = ReplacePlaceholders(bodyTemplate, consultantName, contactName, contactAccount, contactEmail, number, helpDesk);

        const subject = encodeURIComponent(subjectTemplate);
        const body = encodeURIComponent(bodyTemplate);

        const mailtoLink = `mailto:${consultantEmail}?subject=${subject}&body=${body}`;
        window.location.href = mailtoLink;
    });
}

// Reusable function to handle preferred number dropdown
function handlePreferredNumber(contact) {
    const { contactPhone = "", contactMobile = "" } = contact;

    if (!contactPhone || contactPhone === contactMobile) {
        contact.number = contactMobile || contactPhone || "";
        preferredNumberSelect.style.display = "none";
        preferredNumberLabel.style.display = "none";
        return;
    }

    preferredNumberSelect.innerHTML = "";

    const mobileOption = document.createElement("option");
    mobileOption.value = contactMobile;
    mobileOption.text = `Mobile: ${contactMobile}`;

    const phoneOption = document.createElement("option");
    phoneOption.value = contactPhone;
    phoneOption.text = `Phone: ${contactPhone}`;

    preferredNumberSelect.appendChild(mobileOption);
    preferredNumberSelect.appendChild(phoneOption);
    preferredNumberSelect.style.display = "inline-block";
    preferredNumberLabel.style.display = "inline-block";

    preferredNumberSelect.value = contactMobile;
    contact.number = contactMobile;

    preferredNumberSelect.onchange = () => {
        contact.number = preferredNumberSelect.value;
        updateTemplatePreview();
    };
}
