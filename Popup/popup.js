import { loadContacts, addNewContact, handlePreferredNumber } from './contacts.js';
import { loadTemplatePreview, updateTemplatePreview, defaultBody } from './template.js';
import { sendCallbackEmail } from './email.js';
import { insertAtCursor } from './utils.js';

// DOM elements
const contactSelect = document.getElementById("contactSelect");
const addContactButton = document.getElementById("addContactButton");
const sendEmailButton = document.getElementById("sendEmailButton");
const editButton = document.getElementById("editTemplateButton");
const templatePreview = document.getElementById("templatePreview");
const editorWrapper = document.getElementById("editorWrapper");
const preferredNumberSelect = document.getElementById("preferredNumberSelect");
const preferredNumberLabel = document.querySelector('label[for="preferredNumberSelect"]');
const emailBodyTextarea = document.getElementById("emailBodyTextarea");
const insertButtons = document.getElementById("insertButtons");

let isEditing = false;
let currentContactInfo = null;

document.addEventListener("DOMContentLoaded", async () => {
    loadContacts(contactSelect);
    initialiseDefaultTemplate();
    await loadTemplatePreview(templatePreview);
    loadSavedTemplate();
    setupListeners(); 
    loadContactData();
});

// Listen for contactInfo sent from content script
chrome.runtime.onMessage.addListener((request) => {
    if (request.action === "contactInfoLoaded") {
        currentContactInfo = request;
        handlePreferredNumber(currentContactInfo, preferredNumberSelect, preferredNumberLabel, () => {
            updateTemplatePreview(templatePreview, contactSelect, currentContactInfo);
        });
        updateTemplatePreview(templatePreview, contactSelect, currentContactInfo);
    }
});

// Ensure default template is initialized in storage
function initialiseDefaultTemplate() {
    chrome.storage.local.get(['emailBodyTemplate'], (result) => {
        if (!result.emailBodyTemplate) {
            // Save defaultBody to storage
            chrome.storage.local.set({ emailBodyTemplate: defaultBody }, () => {
                emailBodyTextarea.value = defaultBody;
                updateTemplatePreview(templatePreview, contactSelect, currentContactInfo);
            });
        } else {
            emailBodyTextarea.value = result.emailBodyTemplate;
            updateTemplatePreview(templatePreview, contactSelect, currentContactInfo);
        }
    });
}

function loadSavedTemplate() {
    chrome.storage.local.get('emailBodyTemplate', (result) => {
        emailBodyTextarea.value = result.emailBodyTemplate || '';
    });
}

function setupListeners() {
    // Save changes while editing
    emailBodyTextarea.addEventListener('input', () => {
        if (isEditing) {
            chrome.storage.local.set({ emailBodyTemplate: emailBodyTextarea.value });
            updateTemplatePreview(templatePreview, contactSelect, currentContactInfo);
        }
    });

    // Event listeners
    addContactButton.addEventListener("click", () => addNewContact(loadContacts, contactSelect));
    sendEmailButton.addEventListener("click", () => sendCallbackEmail(contactSelect, currentContactInfo, emailBodyTextarea));
    editButton.addEventListener("click", toggleEditMode);
    contactSelect.addEventListener("change", () => updateTemplatePreview(templatePreview, contactSelect, currentContactInfo));

    insertButtons.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            const insertText = e.target.getAttribute('data-insert');
            insertAtCursor(emailBodyTextarea, insertText);
            emailBodyTextarea.focus();
        }
    });
}

// Request contact info from content script
function loadContactData() {
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length == 0) return;

        const activeTabId = tabs[0].id;

        chrome.tabs.sendMessage(activeTabId, { action: "getContactInfo" }, (contact) => {
            if (chrome.runtime.lastError || !contact) {
                console.warn("Could not get contact info from page.");
                return;
            }

            currentContactInfo = contact;

            const numbers = contact.contactNumbers || [];
            if (numbers.length === 1) {
                currentContactInfo.number = numbers[0];
                preferredNumberSelect.style.display = "none";
                preferredNumberLabel.style.display = "none";
            } else if (numbers.length > 1) {
                preferredNumberSelect.innerHTML = "";
                numbers.forEach(number => {
                    const option = document.createElement("option");
                    option.value = number;
                    option.textContent = number;
                    preferredNumberSelect.appendChild(option);
                });
                preferredNumberSelect.style.display = "inline-block";
                preferredNumberLabel.style.display = "inline-block";
                currentContactInfo.number = numbers[0];
            }

            preferredNumberSelect.addEventListener("change", () => {
                currentContactInfo.number = preferredNumberSelect.value;
                updateTemplatePreview(templatePreview, contactSelect, currentContactInfo);
            });

            updateTemplatePreview(templatePreview, contactSelect, currentContactInfo);
        });
    });
}


// Toggle between edit and preview mode
function toggleEditMode() {
    if (isEditing) {
        const content = emailBodyTextarea.value;
        chrome.storage.local.set({ emailBodyTemplate: content }, () => {
            updateTemplatePreview(templatePreview, contactSelect, currentContactInfo);
            editorWrapper.style.display = "none";
            templatePreview.style.display = "block";
            insertButtons.style.display = "none";
            editButton.innerText = "Edit";
            sendEmailButton.style.display = "inline-block";
            isEditing = false;
        });
    } else {
        editorWrapper.style.display = "flex";
        templatePreview.style.display = "none";
        insertButtons.style.display = "flex";
        editButton.innerText = "Save";
        sendEmailButton.style.display = "none";
        isEditing = true;
    }
}
