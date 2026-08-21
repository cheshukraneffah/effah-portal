(function(){
'use strict';
// Security PIN Utama - Effah Travel - AUTO LOCK 3 JAM + 5 MINIT WARNING - V3 NO CLASH
const DEFAULT_PIN = "5822";
let _memLogin = false;

// Config - unique name to avoid clash with router.js
const EFFAH_IDLE_LIMIT = 3 * 60 * 60 * 1000; // 3 jam
const EFFAH_WARN_DURATION = 5 * 60 * 1000; // 5 minit

let idleTimer = null;
let warnTimer = null;
let countdownInterval = null;
let lastActivityTime = Date.now();

function safeSet(key,val){
  try{ sessionStorage.setItem(key,val); }catch(e){}
  try{ localStorage.setItem(key,val); }catch(e){}
  if(key==='effah_logged_in' && val==='true'){
    try{ localStorage.setItem('effah_last_activity', String(Date.now())); }catch(e){}
    try{ sessionStorage.setItem('effah_last_activity', String(Date.now())); }catch(e){}
  }
  _memLogin = true;
}
function safeGet(key){
  if(key==='effah_logged_in'){
    let lastAct = 0;
    try{ lastAct = parseInt(localStorage.getItem('effah_last_activity')||'0'); }catch(e){}
    if(!lastAct){
      try{ lastAct = parseInt(sessionStorage.getItem('effah_last_activity')||'0'); }catch(e){}
    }
    if(lastAct){
      const diff = Date.now() - lastAct;
      if(diff > EFFAH_IDLE_LIMIT){
        try{ localStorage.removeItem('effah_logged_in'); }catch(e){}
        try{ sessionStorage.removeItem('effah_logged_in'); }catch(e){}
        try{ localStorage.removeItem('effah_last_activity'); }catch(e){}
        try{ sessionStorage.removeItem('effah_last_activity'); }catch(e){}
        _memLogin = false;
        return false;
      }
    }
  }
  try{ if(sessionStorage.getItem(key)==='true') return true; }catch(e){}
  try{ if(localStorage.getItem(key)==='1' || localStorage.getItem(key)==='true') return true; }catch(e){}
  return _memLogin;
}

function updateLastActivity(){
  lastActivityTime = Date.now();
  try{ localStorage.setItem('effah_last_activity', String(lastActivityTime)); }catch(e){}
  try{ sessionStorage.setItem('effah_last_activity', String(lastActivityTime)); }catch(e){}
}

document.addEventListener('DOMContentLoaded', () => {
    if (safeGet('effah_logged_in')) {
        unlockPortal();
        startIdleWatcher();
    } else {
        lockPortal();
    }
});

function verifyPin(e) {
    if (e) e.preventDefault();
    const inputEl = document.getElementById('pinInput');
    const pinInput = (inputEl?.value || '').trim();
    const errorMsg = document.getElementById('pinErrorMsg');
    if (pinInput === DEFAULT_PIN || pinInput === "5822") {
        safeSet('effah_logged_in','true');
        updateLastActivity();
        if(errorMsg) errorMsg.classList.add('hidden');
        unlockPortal();
        startIdleWatcher();
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
    updateLastActivity();
    if (typeof loadApiSettings === 'function') loadApiSettings();
}

function lockPortal(){
    const loginOverlay = document.getElementById('loginOverlay');
    const mainPortalWrapper = document.getElementById('mainPortalWrapper');
    if (loginOverlay) loginOverlay.classList.remove('hidden');
    if (mainPortalWrapper) mainPortalWrapper.classList.add('hidden');
    const pinInput = document.getElementById('pinInput');
    if(pinInput) pinInput.value='';
    hideIdleWarning();
}

function logoutPortal() {
    try{ sessionStorage.removeItem('effah_logged_in'); }catch(e){}
    try{ localStorage.removeItem('effah_logged_in'); }catch(e){}
    try{ sessionStorage.removeItem('effah_last_activity'); }catch(e){}
    try{ localStorage.removeItem('effah_last_activity'); }catch(e){}
    _memLogin=false;
    stopIdleWatcher();
    location.reload();
}

document.addEventListener('keydown', (e)=>{
  if(e.key==='Enter'){
    const overlay=document.getElementById('loginOverlay');
    if(overlay && !overlay.classList.contains('hidden')){
      verifyPin(e);
    }
  }
});

function startIdleWatcher(){
  stopIdleWatcher();
  lastActivityTime = Date.now();
  ['mousemove','mousedown','keydown','touchstart','scroll','click'].forEach(evt=>{
    document.addEventListener(evt, onUserActivity, {passive:true});
  });
  idleTimer = setInterval(checkIdle, 30000);
}

function stopIdleWatcher(){
  if(idleTimer){ clearInterval(idleTimer); idleTimer=null; }
  if(warnTimer){ clearTimeout(warnTimer); warnTimer=null; }
  if(countdownInterval){ clearInterval(countdownInterval); countdownInterval=null; }
  ['mousemove','mousedown','keydown','touchstart','scroll','click'].forEach(evt=>{
    document.removeEventListener(evt, onUserActivity);
  });
}

function onUserActivity(){
  const warnOverlay = document.getElementById('idleWarningOverlay');
  if(warnOverlay && !warnOverlay.classList.contains('hidden')){ return; }
  const now = Date.now();
  if(now - lastActivityTime > 60000){ updateLastActivity(); }
  lastActivityTime = now;
}

function checkIdle(){
  const diff = Date.now() - lastActivityTime;
  if(diff >= EFFAH_IDLE_LIMIT){ showIdleWarning(); }
}

function showIdleWarning(){
  stopIdleWatcher();
  let overlay = document.getElementById('idleWarningOverlay');
  if(!overlay){
    overlay = document.createElement('div');
    overlay.id = 'idleWarningOverlay';
    overlay.className = 'fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4';
    overlay.innerHTML = `
      <div class="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center border border-slate-100">
        <div class="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200">
          <i class="fa-solid fa-clock text-2xl text-amber-600"></i>
        </div>
        <h3 class="text-lg font-extrabold text-slate-900">Sesi Hampir Tamat</h3>
        <p class="text-xs text-slate-500 mt-2 mb-1">Tiada aktiviti dikesan selama 3 jam.</p>
        <p class="text-xs text-slate-500 mb-4">Anda ingin meneruskan sesi?</p>
        <div class="bg-slate-100 rounded-xl py-2 mb-5">
          <p class="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Auto-lock dalam</p>
          <p id="idleCountdown" class="text-2xl font-black text-rose-600 tracking-widest">05:00</p>
        </div>
        <div class="flex gap-2">
          <button onclick="window.effahContinueSession()" class="flex-1 bg-rose-900 text-white font-bold py-3 rounded-xl hover:bg-rose-800 transition text-sm">Teruskan Sesi</button>
          <button onclick="window.effahLogoutPortal()" class="flex-1 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-200 transition text-sm">Lock Sekarang</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  } else {
    overlay.classList.remove('hidden');
  }
  let remaining = EFFAH_WARN_DURATION;
  const countdownEl = document.getElementById('idleCountdown');
  function updateCountdown(){
    const m = Math.floor(remaining/60000);
    const s = Math.floor((remaining%60000)/1000);
    if(countdownEl) countdownEl.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }
  updateCountdown();
  countdownInterval = setInterval(()=>{
    remaining -= 1000;
    updateCountdown();
    if(remaining <= 0){ clearInterval(countdownInterval); forceLock(); }
  }, 1000);
}

function hideIdleWarning(){
  const overlay = document.getElementById('idleWarningOverlay');
  if(overlay) overlay.classList.add('hidden');
  if(countdownInterval){ clearInterval(countdownInterval); countdownInterval=null; }
}

function continueSession(){
  hideIdleWarning();
  updateLastActivity();
  startIdleWatcher();
}

function forceLock(){
  hideIdleWarning();
  try{ localStorage.removeItem('effah_logged_in'); }catch(e){}
  try{ sessionStorage.removeItem('effah_logged_in'); }catch(e){}
  try{ localStorage.removeItem('effah_last_activity'); }catch(e){}
  try{ sessionStorage.removeItem('effah_last_activity'); }catch(e){}
  _memLogin=false;
  lockPortal();
  stopIdleWatcher();
  const pinInput = document.getElementById('pinInput');
  if(pinInput) pinInput.placeholder='Sesi tamat - Masuk PIN semula';
}

// Expose to global for HTML onclick
window.verifyPin = verifyPin;
window.unlockPortal = unlockPortal;
window.logoutPortal = logoutPortal;
window.effahLogoutPortal = logoutPortal;
window.effahContinueSession = continueSession;
window.continueSession = continueSession;
window.forceLock = forceLock;

})();
