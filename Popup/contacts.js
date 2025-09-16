/**
 * Load saved contacts from storage and populate the contactSelect dropdown.
 */
export function loadContacts(contactSelect) {
    console.log("Loading contacts...");

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

/**
 * Prompt user to add a new contact, and save it to storage.
 */
export function addNewContact(refreshCallback, contactSelect) {
    const name = prompt("Enter contact name:");
    const email = prompt("Enter contact email:");

    if (!name || !email) {
        alert("Both name and email are required.");
        return;
    }

    const newContact = { name, email };

    chrome.storage.local.get({ contacts: [] }, (result) => {
        const updatedContacts = [...result.contacts, newContact];
        chrome.storage.local.set({ contacts: updatedContacts }, () => {
            if (typeof refreshCallback === 'function') {
                refreshCallback(contactSelect);
            }
        });
    });
}

/**
 * Handle the preferred number selector (dropdown for mobile/phone).
 */
export function handlePreferredNumber(contact, preferredNumberSelect, preferredNumberLabel, onChangeCallback) {
    const { contactPhone = "", contactMobile = "" } = contact;

    // Hide dropdown if no choice needed
    if (!contactPhone || contactPhone === contactMobile) {
        contact.number = contactMobile || contactPhone || "";
        preferredNumberSelect.style.display = "none";
        preferredNumberLabel.style.display = "none";
        return;
    }

    // Populate dropdown
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
        if (typeof onChangeCallback === 'function') {
            onChangeCallback();
        }
    };
}
