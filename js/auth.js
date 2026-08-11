
// Security PIN Utama - Effah Travel - FIX FILE:// STORAGE BLOCK
const DEFAULT_PIN = "5822";
let _memLogin = false;

function safeSet(key,val){
  try{ sessionStorage.setItem(key,val); }catch(e){}
  try{ localStorage.setItem(key,val); }catch(e){}
  _memLogin = true;
}
function safeGet(key){
  try{ if(sessionStorage.getItem(key)==='true') return true; }catch(e){}
  try{ if(localStorage.getItem(key)==='1' || localStorage.getItem(key)==='true') return true; }catch(e){}
  return _memLogin;
}

document.addEventListener('DOMContentLoaded', () => {
    if (safeGet('effah_logged_in')) {
        unlockPortal();
    }
});

function verifyPin(e) {
    if (e) e.preventDefault();
    const inputEl = document.getElementById('pinInput');
    const pinInput = (inputEl?.value || '').trim();
    const errorMsg = document.getElementById('pinErrorMsg');
    //
    if (pinInput === DEFAULT_PIN || pinInput === "5822") {
        safeSet('effah_logged_in','true');
        if(errorMsg) errorMsg.classList.add('hidden');
        unlockPortal();
        if (typeof loadApiSettings === 'function') loadApiSettings();
        if (typeof fetchTripUmrahData === 'function') fetchTripUmrahData();
        if (typeof fetchJemaahUmrahData === 'function') fetchJemaahUmrahData();
    } else {
        if (errorMsg) errorMsg.classList.remove('hidden');
        if(inputEl) inputEl.value='';
        if(inputEl) inputEl.placeholder='PIN Salah! Cuba semula';
    }
}

function unlockPortal() {
    const loginOverlay = document.getElementById('loginOverlay');
    const mainPortalWrapper = document.getElementById('mainPortalWrapper');
    if (loginOverlay) loginOverlay.classList.add('hidden');
    if (mainPortalWrapper) mainPortalWrapper.classList.remove('hidden');
    if (typeof loadApiSettings === 'function') loadApiSettings();
}

function logoutPortal() {
    try{ sessionStorage.removeItem('effah_logged_in'); }catch(e){}
    try{ localStorage.removeItem('effah_logged_in'); }catch(e){}
    _memLogin=false;
    location.reload();
}

// bypass for file:// - allow Enter key
document.addEventListener('keydown', (e)=>{
  if(e.key==='Enter'){
    const overlay=document.getElementById('loginOverlay');
    if(overlay && !overlay.classList.contains('hidden')){
      verifyPin(e);
    }
  }
});
