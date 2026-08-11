// config.js - CENTRAL CONFIG (load FIRST)
const DEFAULT_PAT = 'patjxZg6G22e9OBuS.2a96ced64af7e931ee4d83f65c491adf1241813547d5d8e3a317f5bc6d9a8de7';
const DEFAULT_BASE_ID = 'appSsn4JyQD4DnYu0';
let AIRTABLE_PAT = localStorage.getItem('effah_api_pat') || localStorage.getItem('effah_pat') || DEFAULT_PAT;
let AIRTABLE_BASE_ID = localStorage.getItem('effah_base_id') || localStorage.getItem('effah_base') || DEFAULT_BASE_ID;
window.AIRTABLE_PAT = AIRTABLE_PAT;
window.AIRTABLE_BASE_ID = AIRTABLE_BASE_ID;
window.DEFAULT_PAT = DEFAULT_PAT;
window.DEFAULT_BASE_ID = DEFAULT_BASE_ID;
if (DEFAULT_PAT) {
    localStorage.setItem('effah_api_pat', AIRTABLE_PAT);
    localStorage.setItem('effah_pat', AIRTABLE_PAT);
}
if (DEFAULT_BASE_ID) {
    localStorage.setItem('effah_base_id', AIRTABLE_BASE_ID);
    localStorage.setItem('effah_base', AIRTABLE_BASE_ID);
}
