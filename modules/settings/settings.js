// modules/settings/settings.js - FINAL CLEAN
// Jangan guna let AIRTABLE_PAT lagi, baca dari window/global var dari config.js

function loadApiSettings(){
  var patInput = document.getElementById('apiPatInput');
  var baseInput = document.getElementById('apiBaseInput');
  var pat = window.AIRTABLE_PAT || localStorage.getItem('effah_api_pat') || window.DEFAULT_PAT || '';
  var base = window.AIRTABLE_BASE_ID || localStorage.getItem('effah_base_id') || window.DEFAULT_BASE_ID || '';
  if(patInput) patInput.value = pat;
  if(baseInput) baseInput.value = base;
  updateApiStatusBadge();
}

function saveApiSettings(){
  var patInput = document.getElementById('apiPatInput');
  var baseInput = document.getElementById('apiBaseInput');
  var pat = patInput ? patInput.value.trim() : '';
  var base = baseInput ? baseInput.value.trim() : '';
  if(!pat || !base){ alert('Sila isi PAT dan Base ID'); return; }
  localStorage.setItem('effah_api_pat', pat);
  localStorage.setItem('effah_base_id', pat); // legacy compat handled below
  localStorage.setItem('effah_api_pat', pat);
  localStorage.setItem('effah_base_id', base);
  localStorage.setItem('effah_pat', pat);
  localStorage.setItem('effah_base', base);
  window.AIRTABLE_PAT = pat;
  window.AIRTABLE_BASE_ID = base;
  // sync global var if exists
  try{ AIRTABLE_PAT = pat; AIRTABLE_BASE_ID = base; }catch(e){}
  updateApiStatusBadge();
  alert('Settings disimpan! Reload data...');
  if(typeof fetchTripUmrahData === 'function') fetchTripUmrahData();
  if(typeof fetchJemaahUmrahData === 'function') fetchJemaahUmrahData();
}

function updateApiStatusBadge(){
  var badge = document.getElementById('apiStatusBadge');
  if(!badge) return;
  var pat = window.AIRTABLE_PAT || localStorage.getItem('effah_api_pat') || '';
  var base = window.AIRTABLE_BASE_ID || localStorage.getItem('effah_base_id') || '';
  if(pat && base){
    badge.textContent = 'Online';
    badge.className = 'text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
    badge.style.background = '#dcfce7';
    badge.style.color = '#16a34a';
    badge.style.borderColor = '#86efac';
  } else {
    badge.textContent = 'Offline';
    badge.className = 'text-[10px] px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30';
  }
}

document.addEventListener('DOMContentLoaded', function(){
  loadApiSettings();
  setTimeout(updateApiStatusBadge, 300);
  setTimeout(updateApiStatusBadge, 1000);
});
