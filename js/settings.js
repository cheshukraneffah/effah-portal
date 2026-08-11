// SETTINGS.JS - CENTRAL CONFIG UNTUK EFFAH TRAVEL PORTAL
// File ni load dulu sebelum file lain - letak PAT & Base ID kat sini je

// --- HARDCODED CONFIG (untuk Netlify / GitHub Pages) ---
const DEFAULT_PAT = 'patjxZg6G22e9OBuS.2a96ced64af7e931ee4d83f65c491adf1241813547d5d8e3a317f5bc6d9a8de7';
const DEFAULT_BASE_ID = 'appSsn4JyQD4DnYu0';

// --- Load dari localStorage dulu, kalau takde guna default ---
let AIRTABLE_PAT = localStorage.getItem('effah_api_pat') || localStorage.getItem('effah_pat') || DEFAULT_PAT;
let AIRTABLE_BASE_ID = localStorage.getItem('effah_base_id') || localStorage.getItem('effah_base') || DEFAULT_BASE_ID;

// --- Expose ke window supaya semua modul boleh baca ---
window.AIRTABLE_PAT = AIRTABLE_PAT;
window.AIRTABLE_BASE_ID = AIRTABLE_BASE_ID;
window.DEFAULT_PAT = DEFAULT_PAT;
window.DEFAULT_BASE_ID = DEFAULT_BASE_ID;

// --- Save balik ke localStorage supaya Settings API nampak ada value ---
if (DEFAULT_PAT) {
    localStorage.setItem('effah_api_pat', AIRTABLE_PAT);
    localStorage.setItem('effah_pat', AIRTABLE_PAT);
}
if (DEFAULT_BASE_ID) {
    localStorage.setItem('effah_base_id', AIRTABLE_BASE_ID);
    localStorage.setItem('effah_base', AIRTABLE_BASE_ID);
}

console.log('Settings.js loaded - PAT:', AIRTABLE_PAT ? 'OK ('+AIRTABLE_PAT.substring(0,10)+'...)' : 'MISSING', 'Base:', AIRTABLE_BASE_ID);
