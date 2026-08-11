// config.js - AUTO FILL FOR ALL STAFF - NO MANUAL SETUP NEEDED
(function(){
  const DEFAULT_PAT = 'patjxZg6G22e9OBuS.2a96ced64af7e931ee4d83f65c491adf1241813547d5d8e3a317f5bc6d9a8de7';
  const DEFAULT_BASE_ID = 'appSsn4JyQD4DnYu0';
  // Always set, override any empty
  window.AIRTABLE_PAT = DEFAULT_PAT;
  window.AIRTABLE_BASE_ID = DEFAULT_BASE_ID;
  window.DEFAULT_PAT = DEFAULT_PAT;
  window.DEFAULT_BASE_ID = DEFAULT_BASE_ID;
  try {
    localStorage.setItem('effah_api_pat', DEFAULT_PAT);
    localStorage.setItem('effah_pat', DEFAULT_PAT);
    localStorage.setItem('effah_base_id', DEFAULT_BASE_ID);
    localStorage.setItem('effah_base', DEFAULT_BASE_ID);
    localStorage.setItem('AIRTABLE_PAT', DEFAULT_PAT);
    localStorage.setItem('AIRTABLE_BASE_ID', DEFAULT_BASE_ID);
  } catch(e){}
  console.log('✅ Effah Config: Auto PAT loaded for all staff');
})();
