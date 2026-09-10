// ejen.js V2.5c - FIX DUPLICATE PLACEHOLDER + CLEAN DROPDOWN
console.log('EJEN V2.5c - FIX DUPLICATE');

var allEjenRecords = window.allEjenRecords || [];
var allEjenJemaahRecords = window.allEjenJemaahRecords || [];
var ejenMode = window.ejenMode || localStorage.getItem('effah_ejen_mode') || 'senarai';
var ejenTripCache = window.ejenTripCache || [];
var ejenActiveTripId = window.ejenActiveTripId || localStorage.getItem('effah_ejen_active_trip') || '';
var ejenSearchQuery = '';

var AIRTABLE_PAT = window.AIRTABLE_PAT || localStorage.getItem('effah_api_pat') || window.DEFAULT_PAT;
var AIRTABLE_BASE_ID = window.AIRTABLE_BASE_ID || localStorage.getItem('effah_base_id') || window.DEFAULT_BASE_ID;
window.AIRTABLE_PAT = AIRTABLE_PAT;
window.AIRTABLE_BASE_ID = AIRTABLE_BASE_ID;

function setEjenMode(mode){
  ejenMode = mode;
  window.ejenMode = mode;
  try{ localStorage.setItem('effah_ejen_mode', mode); }catch(e){}
  renderEjenHTML();
  if(mode==='senarai') fetchEjenData();
  if(mode==='tracker'){ fetchTripForEjenDropdown(); if(ejenActiveTripId) fetchJemaahForEjenTracker(ejenActiveTripId); }
}

function renderEjenHTML(){
  const container = document.getElementById('modul-ejen');
  if(!container) return;
  const isTracker = ejenMode === 'tracker';
  container.innerHTML = `
    <div class="flex flex-col space-y-3 min-h-[calc(100vh-140px)]">
      <div class="bg-white p-3 px-4 rounded-2xl border border-slate-300 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <div class="flex bg-slate-100 rounded-xl p-1 border border-slate-200">
            <button onclick="setEjenMode('senarai')" class="px-4 py-1.5 rounded-lg text-xs font-bold ${!isTracker ? 'bg-slate-900 text-white shadow' : 'text-slate-500'}"><i class="fa-solid fa-list mr-1.5"></i> SENARAI EJEN</button>
            <button onclick="setEjenMode('tracker')" class="px-4 py-1.5 rounded-lg text-xs font-bold ${isTracker ? 'bg-slate-900 text-white shadow' : 'text-slate-500'}"><i class="fa-solid fa-user-tag mr-1.5"></i> EJEN TRACKER</button>
          </div>
          <span id="ejenCountBadge" class="text-[11px] bg-slate-100 border px-2.5 py-1 rounded-full font-bold">${allEjenRecords.length} Ejen</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="relative"><i class="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400 text-[11px]"></i><input id="searchEjenInput" type="text" value="${ejenSearchQuery}" onkeyup="handleEjenSearch(this.value)" placeholder="${isTracker?'Cari jemaah...':'Cari ejen...'}" class="w-64 text-xs pl-8 pr-3 py-2 border border-slate-300 rounded-xl bg-slate-50"></div>
          ${!isTracker ? `<button onclick="openAddEjenModal()" class="bg-brand-maroon text-white font-bold px-4 py-2 rounded-xl text-xs"><i class="fa-solid fa-plus mr-1.5"></i> Tambah Ejen</button>` : ''}
          <button onclick="${isTracker ? 'fetchJemaahForEjenTracker(ejenActiveTripId,true)' : 'fetchEjenData(true)'}" class="p-2 border rounded-xl bg-white"><i id="iconRefreshEjen" class="fa-solid fa-rotate"></i></button>
        </div>
      </div>
      ${isTracker ? `
        <div class="bg-white p-3 px-4 rounded-2xl border border-slate-300 flex items-center gap-3 text-xs">
          <span class="font-bold"><i class="fa-solid fa-plane mr-1 text-brand-maroon"></i> Pilih Trip:</span>
          <select id="ejenTripSelect" onchange="onEjenTripChange(this.value)" class="min-w-[500px] border border-slate-300 rounded-xl px-3 py-2.5 text-xs bg-white font-bold text-slate-900"><option value="">-- Pilih Trip Umrah --</option></select>
          <span id="ejenTrackerStats" class="ml-auto text-[11px] text-slate-500"></span>
        </div>
        <div id="ejenTrackerContainer" class="bg-white rounded-2xl border border-slate-300 overflow-hidden"><div class="p-8 text-center text-slate-400 text-xs"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Pilih trip...</div></div>
      ` : `
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div class="bg-white rounded-2xl border p-3.5"><div class="text-[10px] font-bold text-slate-500 uppercase">Total Ejen</div><div class="text-xl font-extrabold">${allEjenRecords.length}</div></div>
          <div class="bg-white rounded-2xl border p-3.5"><div class="text-[10px] font-bold uppercase">Aktif</div><div class="text-xl font-extrabold text-emerald-600">${allEjenRecords.filter(r=>(r.fields['STATUS']||'').toUpperCase()==='AKTIF').length}</div></div>
          <div class="bg-white rounded-2xl border p-3.5"><div class="text-[10px] font-bold uppercase">Tidak Aktif</div><div class="text-xl font-extrabold">${allEjenRecords.filter(r=>(r.fields['STATUS']||'').toUpperCase()!=='AKTIF').length}</div></div>
          <div class="bg-white rounded-2xl border p-3.5"><div class="text-[10px] font-bold uppercase">Jumlah Jemaah</div><div class="text-xl font-extrabold text-brand-maroon">${allEjenRecords.reduce((s,r)=>s+(parseInt(r.fields['JUMLAH JEMAAH'])||0),0)}</div></div>
        </div>
        <div id="ejenListContainer" class="bg-white rounded-2xl border overflow-hidden"><div class="p-8 text-center text-slate-400 text-xs">Memuat ejen...</div></div>
      `}
    </div>
    <div id="ejenModal" class="hidden fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4"><div class="bg-white rounded-2xl border shadow-2xl w-full max-w-md overflow-hidden"><div class="p-4 border-b flex justify-between"><h3 id="ejenModalTitle" class="font-bold text-sm">Tambah Ejen</h3><button onclick="closeEjenModal()"><i class="fa-solid fa-xmark"></i></button></div><div class="p-4 space-y-3"><div><label class="text-[11px] font-bold uppercase">Nama Ejen *</label><input id="ejenInputNama" type="text" class="w-full mt-1 border rounded-xl px-3 py-2 text-xs"></div><div><label class="text-[11px] font-bold uppercase">No Telefon</label><input id="ejenInputPhone" type="text" class="w-full mt-1 border rounded-xl px-3 py-2 text-xs"></div><div><label class="text-[11px] font-bold uppercase">Status</label><select id="ejenInputStatus" class="w-full mt-1 border rounded-xl px-3 py-2 text-xs bg-white"><option value="AKTIF">AKTIF</option><option value="TIDAK AKTIF">TIDAK AKTIF</option></select></div><div><label class="text-[11px] font-bold uppercase">Catatan</label><textarea id="ejenInputCatatan" rows="3" class="w-full mt-1 border rounded-xl px-3 py-2 text-xs"></textarea></div><input type="hidden" id="ejenInputId"></div><div class="p-3 bg-slate-50 border-t flex justify-end gap-2"><button onclick="closeEjenModal()" class="px-4 py-2 rounded-xl text-xs font-bold border bg-white">Batal</button><button onclick="saveEjen()" class="px-5 py-2 rounded-xl text-xs font-bold bg-brand-maroon text-white">Simpan</button></div></div></div>
  `;
  populateEjenTripDropdown();
  if(ejenActiveTripId){ const sel=document.getElementById('ejenTripSelect'); if(sel) sel.value=ejenActiveTripId; }
  if(!isTracker) renderSenaraiEjenGrid();
  else if(allEjenJemaahRecords.length>0) renderEjenTrackerGrid();
}

function handleEjenSearch(v){ ejenSearchQuery=(v||'').toLowerCase(); if(ejenMode==='senarai') renderSenaraiEjenGrid(); else renderEjenTrackerGrid(); }

async function fetchEjenData(){
  try{
    const base=window.AIRTABLE_BASE_ID, pat=window.AIRTABLE_PAT;
    let all=[],off='';
    do{
      const res=await fetch(`https://api.airtable.com/v0/${base}/EJEN%20LIST?pageSize=100${off?`&offset=${off}`:''}`,{headers:{Authorization:`Bearer ${pat}`}});
      const data=await res.json();
      if(data.error) throw new Error(data.error.message);
      if(data.records) all=all.concat(data.records);
      off=data.offset||'';
    }while(off);
    allEjenRecords=all; window.allEjenRecords=all;
    renderSenaraiEjenGrid();
  }catch(e){ console.error(e); }
}

function renderSenaraiEjenGrid(){
  const c=document.getElementById('ejenListContainer'); if(!c) return;
  let f=[...allEjenRecords];
  if(ejenSearchQuery) f=f.filter(r=>{ const name = String(r.fields['NAMA EJEN']||'').toLowerCase(); const catatan = String(r.fields['CATATAN']||'').toLowerCase(); return name.includes(ejenSearchQuery) || catatan.includes(ejenSearchQuery); });
  f.sort((a,b)=>String(a.fields['NAMA EJEN']||'').localeCompare(String(b.fields['NAMA EJEN']||'')));
  if(!f.length){ c.innerHTML=`<div class="p-10 text-center text-slate-400 text-xs">Tiada ejen.</div>`; return; }
  let h=`<div class="overflow-x-auto"><table class="w-full text-xs"><thead class="bg-slate-50 border-b text-[10px] font-bold uppercase tracking-wide"><tr><th class="text-left px-4 py-3 w-10">#</th><th class="text-left px-4 py-3">NAMA EJEN</th><th class="text-left px-4 py-3 w-[140px]">NO TELEFON</th><th class="text-left px-4 py-3 w-[90px]">STATUS</th><th class="text-left px-4 py-3 w-[70px]">JEMAAH</th><th class="text-left px-4 py-3 w-[180px]">CATATAN</th><th class="text-right px-4 py-3 w-[110px]">TINDAKAN</th></tr></thead><tbody>`;
  f.forEach((r,i)=>{
    const d=r.fields||{};
    const status = (d['STATUS']||'AKTIF').toUpperCase();
    const statusClass = status==='AKTIF' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200';
    const catatan = d['CATATAN'] || '-';
    h+=`<tr class="border-b hover:bg-slate-50 transition">
      <td class="px-4 py-3 text-slate-500">${i+1}</td>
      <td class="px-4 py-3 font-bold text-slate-900">${escapeHtml(d['NAMA EJEN']||'-')}</td>
      <td class="px-4 py-3 text-slate-700">${escapeHtml(d['NO TELEFON']||'-')}</td>
      <td class="px-4 py-3"><span class="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusClass}">${escapeHtml(status)}</span></td>
      <td class="px-4 py-3 font-bold text-brand-maroon text-center">${d['JUMLAH JEMAAH']||0}</td>
      <td class="px-4 py-3 text-slate-600 max-w-[180px] truncate" title="${escapeHtml(catatan)}">${escapeHtml(catatan)}</td>
      <td class="px-4 py-3 text-right">
        <div class="inline-flex gap-1.5">
          <button onclick="openEditEjenModal('${r.id}')" class="inline-flex items-center gap-1 px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 text-[11px] font-semibold"><i class="fa-solid fa-pen text-[10px]"></i> Edit</button>
          <button onclick="deleteEjen('${r.id}')" class="inline-flex items-center gap-1 px-2.5 py-1.5 border border-red-200 rounded-lg bg-white hover:bg-red-50 text-red-600 text-[11px] font-semibold"><i class="fa-solid fa-trash text-[10px]"></i> Padam</button>
        </div>
      </td>
    </tr>`;
  });
  h+=`</tbody></table></div>`; c.innerHTML=h;
}

function openAddEjenModal(){ document.getElementById('ejenInputId').value=''; document.getElementById('ejenInputNama').value=''; document.getElementById('ejenInputPhone').value=''; document.getElementById('ejenInputStatus').value='AKTIF'; document.getElementById('ejenInputCatatan').value=''; document.getElementById('ejenModalTitle').textContent='Tambah Ejen'; document.getElementById('ejenModal').classList.remove('hidden'); }
function openEditEjenModal(id){ const r=allEjenRecords.find(x=>x.id===id); if(!r) return; const f=r.fields; document.getElementById('ejenInputId').value=r.id; document.getElementById('ejenInputNama').value=f['NAMA EJEN']||''; document.getElementById('ejenInputPhone').value=f['NO TELEFON']||''; document.getElementById('ejenInputStatus').value=(f['STATUS']||'AKTIF').toUpperCase(); document.getElementById('ejenInputCatatan').value=f['CATATAN']||''; document.getElementById('ejenModalTitle').textContent='Edit Ejen'; document.getElementById('ejenModal').classList.remove('hidden'); }
function closeEjenModal(){ document.getElementById('ejenModal').classList.add('hidden'); }
async function saveEjen(){ const id=document.getElementById('ejenInputId').value.trim(); const nama=document.getElementById('ejenInputNama').value.trim().toUpperCase(); const phone=document.getElementById('ejenInputPhone').value.trim(); const status=document.getElementById('ejenInputStatus').value; const catatan=document.getElementById('ejenInputCatatan').value.trim(); if(!nama){ alert('Nama wajib'); return; } const base=window.AIRTABLE_BASE_ID, pat=window.AIRTABLE_PAT; const fields={'NAMA EJEN':nama,'NO TELEFON':phone||null,'STATUS':status,'CATATAN':catatan||null}; let url=`https://api.airtable.com/v0/${base}/EJEN%20LIST`, method='POST', body={fields}; if(id){ url+=`/${id}`; method='PATCH'; } const res=await fetch(url,{method,headers:{Authorization:`Bearer ${pat}`,'Content-Type':'application/json'},body:JSON.stringify(id?{fields}:body)}); const d=await res.json(); if(d.error){ alert(d.error.message); return; } closeEjenModal(); fetchEjenData(); }
async function deleteEjen(id){ if(!confirm('Padam ejen ini?')) return; const base=window.AIRTABLE_BASE_ID, pat=window.AIRTABLE_PAT; await fetch(`https://api.airtable.com/v0/${base}/EJEN%20LIST/${id}`,{method:'DELETE',headers:{Authorization:`Bearer ${pat}`}}); allEjenRecords=allEjenRecords.filter(r=>r.id!==id); renderSenaraiEjenGrid(); }

function cleanTripName(raw){ if(!raw) return ''; let s = String(raw).trim(); s = s.replace(/^\d{1,2}\/\d{1,2}\s*\|\s*/,'').trim(); return s || raw; }
function parseTripDateForSort(record){
  const f=record.fields||{};
  const dateFields = ['Mula Pakej','TRIP DATE','DATE','TARIKH','Tamat Pakej'];
  for(const key of dateFields){ let d = f[key]; if(d && typeof d === 'string'){ const parsed = new Date(d); if(!isNaN(parsed.getTime()) && parsed.getFullYear()>2020) return parsed.getTime(); } }
  const tripName = f['Trip'] || '';
  const yearMatch = tripName.match(/(202[5-9]|203\d)/);
  const year = yearMatch ? parseInt(yearMatch[0]) : 0;
  const months = {'JANUARI':1,'FEBRUARI':2,'MAC':3,'APRIL':4,'MEI':5,'JUN':6,'JULAI':7,'OGOS':8,'SEPTEMBER':9,'OKTOBER':10,'NOVEMBER':11,'DISEMBER':12};
  let month = 0; const upper = tripName.toUpperCase(); for(const [k,v] of Object.entries(months)){ if(upper.includes(k)){ month=v; break; } }
  const dayMatch = tripName.match(/^(\d{1,2})\s*-/) || tripName.match(/(\d{1,2})\s*-\s*\d{1,2}/);
  const day = dayMatch ? parseInt(dayMatch[1]) : 1;
  if(year && month) return new Date(year, month-1, day).getTime();
  if(tripName.toUpperCase().includes('TBC')) return 9999999999999;
  return 0;
}
async function fetchTripForEjenDropdown(){
  try{
    const base=window.AIRTABLE_BASE_ID, pat=window.AIRTABLE_PAT;
    let all=[],off='';
    do{
      const res=await fetch(`https://api.airtable.com/v0/${base}/PAKEJ%20UMRAH?pageSize=100${off?`&offset=${off}`:''}`,{headers:{Authorization:`Bearer ${pat}`}});
      const data=await res.json();
      if(data.error) throw new Error(data.error.message);
      if(data.records) all=all.concat(data.records);
      off=data.offset||'';
    }while(off);
    if(all.length>0){ all.sort((a,b)=>parseTripDateForSort(a)-parseTripDateForSort(b)); ejenTripCache=all; window.ejenTripCache=all; }
    populateEjenTripDropdown();
  }catch(e){ console.error(e); }
}
function populateEjenTripDropdown(){
  const sel=document.getElementById('ejenTripSelect'); if(!sel) return;
  const trips=ejenTripCache||[];
  if(!trips.length){ sel.innerHTML=`<option value="">-- Tiada trip --</option>`; return; }
  const bestKey = 'Trip';
  let html = `<option value="">-- Pilih Trip Umrah (${trips.length} trip) --</option>`;
  trips.forEach(t=>{
    const f=t.fields||{};
    let raw = f[bestKey] || f['Trip'] || '';
    if(!raw) raw = t.id;
    let clean = cleanTripName(raw);
    html += `<option value="${t.id}">${escapeHtml(String(clean)).substring(0,150)}</option>`;
  });
  sel.innerHTML = html;
  if(ejenActiveTripId) sel.value=ejenActiveTripId;
}
function onEjenTripChange(tripId){
  ejenActiveTripId=tripId; window.ejenActiveTripId=tripId;
  try{ localStorage.setItem('effah_ejen_active_trip', tripId); }catch(e){}
  if(!tripId){ document.getElementById('ejenTrackerContainer').innerHTML=`<div class="p-8 text-center text-slate-400 text-xs">Pilih trip...</div>`; return; }
  fetchJemaahForEjenTracker(tripId);
}
async function fetchJemaahForEjenTracker(tripId){
  const container=document.getElementById('ejenTrackerContainer');
  if(container) container.innerHTML=`<div class="p-8 text-center text-slate-400 text-xs"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Memuatkan jemaah...</div>`;
  try{
    const base=window.AIRTABLE_BASE_ID, pat=window.AIRTABLE_PAT;
    let allJemaah = [];
    if((window.allJemaahUmrahRecords?.length||0) > 100){
      allJemaah = window.allJemaahUmrahRecords;
    } else {
      let all=[],off='';
      do{
        const url=`https://api.airtable.com/v0/${base}/DATA%20JEMAAH%20UMRAH?pageSize=100${off?`&offset=${off}`:''}`;
        const res=await fetch(url,{headers:{Authorization:`Bearer ${pat}`}});
        const data=await res.json();
        if(data.error) throw new Error(data.error.message);
        if(data.records) all=all.concat(data.records);
        off=data.offset||'';
      }while(off);
      allJemaah = all;
      window.allJemaahUmrahRecords = all;
    }
    const filtered = allJemaah.filter(j=>{
      const f=j.fields||{};
      const tripField = f['TRIP'] || f['PAKEJ UMRAH'] || f['PAKEJ'] || [];
      if(Array.isArray(tripField)) return tripField.includes(tripId);
      return false;
    });
    allEjenJemaahRecords = filtered.sort((a,b)=>String(a.fields['NAME']||'').localeCompare(String(b.fields['NAME']||'')));
    window.allEjenJemaahRecords = allEjenJemaahRecords;
    if(allEjenRecords.length===0) await fetchEjenData();
    renderEjenTrackerGrid();
  }catch(e){
    console.error(e);
    if(container) container.innerHTML=`<div class="p-6 text-xs text-red-500">${e.message}</div>`;
  }
}

function getEjenNamesForJemaah(jemaah){
  const linked = jemaah.fields['EJEN'] || [];
  if(!Array.isArray(linked) || linked.length===0) return [];
  return linked.map(id=>{
    const rec = allEjenRecords.find(r=>r.id===id);
    return rec ? {id, name: rec.fields['NAMA EJEN']||id} : {id, name: id};
  });
}

function renderEjenTrackerGrid(){
  const container=document.getElementById('ejenTrackerContainer'); const statsEl=document.getElementById('ejenTrackerStats');
  if(!container) return;
  let filtered=[...allEjenJemaahRecords];
  if(ejenSearchQuery) filtered=filtered.filter(r=>String(r.fields['NAME']||'').toLowerCase().includes(ejenSearchQuery));
  
  const ejenMap={}; const unassigned=[]; const sharedList=[];
  filtered.forEach(j=>{
    const linked=j.fields['EJEN'] || [];
    if(!Array.isArray(linked) || linked.length===0){
      unassigned.push(j);
    } else if(linked.length>=2){
      sharedList.push(j);
      linked.forEach(eid=>{ if(!ejenMap[eid]) ejenMap[eid]=[]; ejenMap[eid].push(j); });
    } else {
      const eid = linked[0];
      if(!ejenMap[eid]) ejenMap[eid]=[];
      ejenMap[eid].push(j);
    }
  });

  if(statsEl){ statsEl.textContent=`${filtered.length} Jemaah | ${filtered.length-unassigned.length-sharedList.length} Single | ${sharedList.length} Joint | ${unassigned.length} Tiada Ejen`; }

  // BUILD PURE EJEN LIST - NO PLACEHOLDER
  const aktifEjen=allEjenRecords.filter(r=>(r.fields['STATUS']||'').toUpperCase()==='AKTIF').sort((a,b)=>String(a.fields['NAMA EJEN']||'').localeCompare(String(b.fields['NAMA EJEN']||'')));
  const ejenListOptions = aktifEjen.map(e=>`<option value="${e.id}">${escapeHtml(e.fields['NAMA EJEN']||'')}</option>`).join('');

  let html=`<div class="overflow-x-auto"><table class="w-full text-xs"><thead class="bg-slate-50 border-b text-[10px] font-bold uppercase sticky top-0"><tr><th class="text-left px-4 py-2.5 w-12">#</th><th class="text-left px-4 py-2.5">Nama Jemaah</th><th class="text-left px-4 py-2.5 w-[340px]">Ejen</th></tr></thead><tbody>`;
  let idx=1;

  if(sharedList.length>0){
    html+=`<tr class="bg-indigo-50 border-y border-indigo-200"><td colspan="3" class="px-4 py-2.5 font-extrabold text-indigo-900 tracking-wide"><i class="fa-solid fa-handshake mr-2 text-indigo-600"></i>JOINT AGENTS <span class="ml-2 bg-white border border-indigo-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold">${sharedList.length} org</span> <span class="ml-2 text-[10px] font-normal text-indigo-700">— komisen dikongsi bersama</span></td></tr>`;
    sharedList.forEach(j=>{
      const ejenList = getEjenNamesForJemaah(j);
      const badges = ejenList.map(e=>`<span class="inline-flex items-center gap-1 bg-indigo-600 text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold">${escapeHtml(e.name)} <button onclick="removeEjenFromJemaah('${j.id}','${e.id}')" class="ml-1 w-3.5 h-3.5 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30">×</button></span>`).join(' ');
      html+=`<tr class="border-b bg-indigo-50/20 hover:bg-indigo-50/40"><td class="px-4 py-2.5">${idx++}</td><td class="px-4 py-2.5 font-semibold">${escapeHtml(j.fields['NAME']||'-')} <span class="ml-2 bg-indigo-600 text-white text-[9px] px-2 py-0.5 rounded-full font-bold">JOINT</span></td><td class="px-4 py-2.5"><div class="flex flex-wrap items-center gap-1.5 mb-2">${badges}</div><select onchange="addEjenToJemaah('${j.id}',this.value); this.value=''" class="w-full border border-indigo-200 rounded-lg px-2.5 py-1.5 text-[11px] bg-white"><option value="">+ Tambah ejen lain...</option>${ejenListOptions}</select></td></tr>`;
    });
  }

  Object.entries(ejenMap).sort((a,b)=>String(allEjenRecords.find(r=>r.id===a[0])?.fields['NAMA EJEN']||'').localeCompare(String(allEjenRecords.find(r=>r.id===b[0])?.fields['NAMA EJEN']||''))).forEach(([eid,list])=>{
    const ename=allEjenRecords.find(r=>r.id===eid)?.fields['NAMA EJEN']||'EJEN';
    const singleList = list.filter(j=> (j.fields['EJEN']||[]).length===1 );
    if(singleList.length===0 && sharedList.length>0) return;
    html+=`<tr class="bg-slate-100 border-y"><td colspan="3" class="px-4 py-2.5 font-extrabold"><i class="fa-solid fa-user-tag mr-2 text-brand-maroon"></i>${escapeHtml(ename)} <span class="ml-2 bg-white border px-2.5 py-0.5 rounded-full text-[10px]">${singleList.length} org</span></td></tr>`;
    singleList.forEach(j=>{
      const ejenList = getEjenNamesForJemaah(j);
      const badges = ejenList.map(e=>`<span class="inline-flex items-center gap-1 bg-slate-900 text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold">${escapeHtml(e.name)} <button onclick="removeEjenFromJemaah('${j.id}','${e.id}')" class="ml-1 w-3.5 h-3.5 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30">×</button></span>`).join(' ');
      html+=`<tr class="border-b hover:bg-slate-50"><td class="px-4 py-2.5">${idx++}</td><td class="px-4 py-2.5 font-semibold">${escapeHtml(j.fields['NAME']||'-')}</td><td class="px-4 py-2.5"><div class="flex flex-wrap items-center gap-1.5 mb-2">${badges}</div><select onchange="addEjenToJemaah('${j.id}',this.value); this.value=''" class="w-full border rounded-lg px-2.5 py-1.5 text-[11px] bg-white"><option value="">+ Tambah ejen berkongsi...</option>${ejenListOptions}</select></td></tr>`;
    });
  });

  if(unassigned.length>0){
    html+=`<tr class="bg-amber-50 border-y border-amber-200"><td colspan="3" class="px-4 py-2.5 font-extrabold text-amber-800 tracking-wide">TIADA EJEN <span class="ml-2 bg-white border px-2.5 py-0.5 rounded-full text-[10px]">${unassigned.length} org</span></td></tr>`;
    unassigned.forEach(j=>{
      html+=`<tr class="border-b hover:bg-amber-50/50"><td class="px-4 py-2.5">${idx++}</td><td class="px-4 py-2.5 font-semibold">${escapeHtml(j.fields['NAME']||'-')}</td><td class="px-4 py-2.5"><select onchange="addEjenToJemaah('${j.id}',this.value)" class="w-full border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs bg-white"><option value="">-- Assign Ejen --</option>${ejenListOptions}</select></td></tr>`;
    });
  }
  if(!filtered.length) html+=`<tr><td colspan="3" class="p-10 text-center text-slate-400">Tiada jemaah untuk trip ini.</td></tr>`;
  html+=`</tbody></table></div>`; container.innerHTML=html;
}

async function addEjenToJemaah(jId,eId){
  if(!eId) return;
  const base=window.AIRTABLE_BASE_ID, pat=window.AIRTABLE_PAT;
  const eField = 'EJEN';
  const rec=allEjenJemaahRecords.find(r=>r.id===jId);
  let current = rec ? (rec.fields[eField]||[]) : [];
  if(!Array.isArray(current)) current=[];
  if(current.includes(eId)){ alert('Ejen ini telah ditugaskan kepada jemaah tersebut.'); return; }
  current = [...current, eId];
  if(rec) rec.fields[eField]=current;
  try{
    const url=`https://api.airtable.com/v0/${base}/DATA%20JEMAAH%20UMRAH/${jId}`;
    const fields = {[eField]: current};
    const res=await fetch(url,{method:'PATCH',headers:{Authorization:`Bearer ${pat}`,'Content-Type':'application/json'},body:JSON.stringify({fields})});
    const data=await res.json();
    if(data.error) throw new Error(data.error.message);
    renderEjenTrackerGrid();
  }catch(e){ console.error(e); alert('Gagal menyimpan: '+e.message+'\n\nPastikan field EJEN dalam DATA JEMAAH UMRAH telah diaktifkan "Allow linking to multiple records".'); }
}

async function removeEjenFromJemaah(jId,eId){
  if(!confirm('Adakah anda pasti untuk membuang ejen ini daripada jemaah tersebut?')) return;
  const base=window.AIRTABLE_BASE_ID, pat=window.AIRTABLE_PAT;
  const eField = 'EJEN';
  const rec=allEjenJemaahRecords.find(r=>r.id===jId);
  let current = rec ? (rec.fields[eField]||[]) : [];
  current = current.filter(id=>id!==eId);
  if(rec) rec.fields[eField]=current;
  try{
    const url=`https://api.airtable.com/v0/${base}/DATA%20JEMAAH%20UMRAH/${jId}`;
    const fields = {[eField]: current};
    const res=await fetch(url,{method:'PATCH',headers:{Authorization:`Bearer ${pat}`,'Content-Type':'application/json'},body:JSON.stringify({fields})});
    const data=await res.json();
    if(data.error) throw new Error(data.error.message);
    renderEjenTrackerGrid();
  }catch(e){ console.error(e); alert('Gagal membuang: '+e.message); }
}

async function updateJemaahEjen(jId,eId){ return addEjenToJemaah(jId,eId); }
function viewJemaahByEjen(id){ const l=allEjenRecords.find(r=>r.id===id); alert(`Ejen ${l?.fields['NAMA EJEN']} - ${l?.fields['JUMLAH JEMAAH']||0} jemaah`); setEjenMode('tracker'); }
function escapeHtml(s){ if(!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

document.addEventListener('DOMContentLoaded',()=>{ setTimeout(()=>{ if(document.getElementById('modul-ejen')){ renderEjenHTML(); fetchEjenData(); fetchTripForEjenDropdown(); } },1200); });

window.renderEjenHTML=renderEjenHTML; window.fetchEjenData=fetchEjenData; window.fetchTripForEjenDropdown=fetchTripForEjenDropdown; window.populateEjenTripDropdown=populateEjenTripDropdown; window.fetchJemaahForEjenTracker=fetchJemaahForEjenTracker; window.setEjenMode=setEjenMode; window.updateJemaahEjen=updateJemaahEjen; window.addEjenToJemaah=addEjenToJemaah; window.removeEjenFromJemaah=removeEjenFromJemaah; window.handleEjenSearch=handleEjenSearch; window.onEjenTripChange=onEjenTripChange; window.openAddEjenModal=openAddEjenModal; window.openEditEjenModal=openEditEjenModal; window.closeEjenModal=closeEjenModal; window.saveEjen=saveEjen; window.deleteEjen=deleteEjen; window.viewJemaahByEjen=viewJemaahByEjen;
