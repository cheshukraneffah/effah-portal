// Settings API - Auto Online green
function loadApiSettings(){
  var patInput = document.getElementById('apiPatInput');
  var baseInput = document.getElementById('apiBaseInput');
  if(patInput) patInput.value = window.AIRTABLE_PAT || localStorage.getItem('effah_api_pat') || '';
  if(baseInput) baseInput.value = window.AIRTABLE_BASE_ID || localStorage.getItem('effah_base_id') || '';
  updateApiStatusBadge();
}
function updateApiStatusBadge(){
  var badge = document.getElementById('apiStatusBadge');
  if(!badge) return;
  var pat = window.AIRTABLE_PAT || localStorage.getItem('effah_api_pat');
  var base = window.AIRTABLE_BASE_ID || localStorage.getItem('effah_base_id');
  if(pat && base){
    badge.textContent = 'Online';
    badge.style.background = '#dcfce7';
    badge.style.color = '#16a34a';
    badge.style.borderColor = '#86efac';
    badge.style.borderWidth = '1px';
    badge.style.borderStyle = 'solid';
  } else {
    badge.textContent = 'Offline';
    badge.style.background = '#fee2e2';
    badge.style.color = '#dc2626';
  }
}
function saveApiSettings(){
  var pat = document.getElementById('apiPatInput')?.value?.trim();
  var base = document.getElementById('apiBaseInput')?.value?.trim();
  if(pat){ localStorage.setItem('effah_api_pat', pat); window.AIRTABLE_PAT = pat; }
  if(base){ localStorage.setItem('effah_base_id', base); window.AIRTABLE_BASE_ID = base; }
  updateApiStatusBadge();
}
function testApiConnection(){
  updateApiStatusBadge();
  var pat = window.AIRTABLE_PAT || localStorage.getItem('effah_api_pat');
  var base = window.AIRTABLE_BASE_ID || localStorage.getItem('effah_base_id');
  if(!pat || !base){ alert('PAT atau Base ID tiada'); return; }
  fetch(`https://api.airtable.com/v0/${base}/PAKEJ%20UMRAH?maxRecords=1`, { headers: { Authorization: `Bearer ${pat}` } })
  .then(r => { if(r.ok){ alert('✅ Online - API OK'); updateApiStatusBadge(); } else { alert('❌ Failed'); } })
  .catch(() => alert('❌ Network Error'));
}
document.addEventListener('DOMContentLoaded', () => { setTimeout(updateApiStatusBadge, 500); });
