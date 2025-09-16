export function ReplacePlaceholders(text, consultantName, contactName, contactAccount, contactEmail, contactNumber, helpDesk) {
    return text
        .replaceAll("{consultant}", consultantName)
        .replaceAll("{name}", contactName)
        .replaceAll("{account}", contactAccount)
        .replaceAll("{email}", contactEmail)
        .replaceAll("{number}", contactNumber)
        .replaceAll("{helpDesk}", helpDesk);
}
export function insertAtCursor(textarea, text) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = textarea.value.substring(0, start);
    const after = textarea.value.substring(end);
    textarea.value = before + text + after;
    const cursorPos = start + text.length;
    textarea.selectionStart = textarea.selectionEnd = cursorPos;
}