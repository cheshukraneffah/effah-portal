// ROOMING MODULE V7 - Print/PDF + Soft Colors + Copy Bilik + Scroll Drag + Light UI
let allRoomingRecords = [];
let allRoomingJemaah = [];
let activeLocation = localStorage.getItem('effah_active_location') || 'MEKAH';
let roomingDefaultCap = 3;
let customLocations = JSON.parse(localStorage.getItem('effah_custom_locations')||'[]');
let isRoomingLoading = false;

function getRoomingCreds(){
  const pat = window.AIRTABLE_PAT || window.APP_CONFIG?.AIRTABLE_PAT || localStorage.getItem('effah_api_pat');
  const base = window.AIRTABLE_BASE_ID || window.APP_CONFIG?.AIRTABLE_BASE_ID || localStorage.getItem('effah_base_id') || localStorage.getItem('effah_api_base');
  return {pat, base};
}
function escHtml(s){ if(!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function cleanStaffName(name){
  if(!name) return '';
  let n = String(name).trim();
  if(n.toUpperCase().startsWith('NA ')) n = n.substring(3).trim();
  if(n.toUpperCase().startsWith('NA-')) n = n.substring(3).trim();
  return n;
}
function isStaffName(name){
  const n = (name||'').toUpperCase();
  return n.includes('(EFFAH)') || n.includes('(MUTAWIF)') || n.includes('EFFAH') || n.startsWith('NA ');
}
function cleanTripNameForRooming(name){
  if(!name) return 'TBC';
  if(typeof cleanTripName==='function') return cleanTripName(name);
  return name.replace(/^\s*\d+\/\d+\s*\|\s*/i, '').replace(/^\s*\d+\/\d+\s*/i,'').trim();
}
document.addEventListener('DOMContentLoaded', () => {
  if(document.getElementById('modul-rooming')) renderRoomingHTML();
});
function showRoomingLoading(){
  isRoomingLoading = true;
  const grid = document.getElementById('roomingGrid');
  const list = document.getElementById('namelistContainer');
  const skeleton = `
  <div class="flex flex-col items-center justify-center py-16 gap-5">
    <div class="relative">
      <div class="w-10 h-10 border-[3px] border-slate-200 rounded-full"></div>
      <div class="absolute top-0 left-0 w-10 h-10 border-[3px] border-slate-700 border-t-transparent rounded-full animate-spin"></div>
    </div>
    <div class="flex flex-col items-center gap-1">
      <span class="text-[11px] font-bold text-slate-600 tracking-[0.15em]">LOADING ROOMING</span>
      <span class="text-[10px] text-slate-400">Susun bilik ${activeLocation}...</span>
    </div>
    <div class="w-full max-w-[320px] space-y-2 mt-2">
      <div class="h-2.5 bg-slate-100 rounded-full animate-pulse"></div>
      <div class="h-2.5 bg-slate-100 rounded-full w-5/6 animate-pulse"></div>
      <div class="h-2.5 bg-slate-100 rounded-full w-4/6 animate-pulse"></div>
    </div>
  </div>`;
  const gridSkeleton = `
  <div class="col-span-2 bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
    <div class="grid grid-cols-2 gap-3">
      ${Array(4).fill(0).map(()=>`<div class="border border-slate-100 rounded-2xl p-3 space-y-3 animate-pulse"><div class="h-4 bg-slate-100 rounded-full w-1/3"></div><div class="h-10 bg-slate-100 rounded-xl"></div></div>`).join('')}
    </div>
  </div>`;
  if(grid) grid.innerHTML = gridSkeleton;
  if(list) list.innerHTML = skeleton;
}
function renderRoomingHTML(){
  const c = document.getElementById('modul-rooming');
  if(!c) return;
  c.innerHTML = `
  <div class="flex flex-col gap-3 p-2">
    <div class="bg-white rounded-2xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-20">
      <div class="flex items-center gap-3 text-xs flex-wrap">
        <span class="font-black tracking-widest text-slate-800">ROOMING LIST</span>
        <select id="roomingTripSelect" onchange="onRoomingTripChange(this.value)" class="px-3 py-1.5 border border-slate-300 rounded-full bg-white text-xs font-bold min-w-[240px] max-w-[320px] truncate">
          <option value="">Pilih Trip...</option>
        </select>
        <span id="roomingHeaderCount" class="text-slate-500 text-[11px]">0 Bilik</span>
      </div>
      <div class="flex items-center gap-2 text-xs">
        <span id="belumAssignTop" class="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-bold">0 Belum</span>
        <span id="assignedTop" class="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold">0 Assigned</span>
        <button onclick="fetchRoomingData()" class="w-7 h-7 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600"><i class="fa-solid fa-rotate"></i></button>
      </div>
    </div>

    <div class="flex flex-col xl:flex-row gap-3">
      <div class="w-full xl:w-[52%] bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        <div class="p-3 border-b">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-extrabold text-[11px] tracking-[0.15em] text-slate-700">NAMELIST JEMAAH</h3>
            <div class="flex gap-1.5">
              <span id="belumAssignBadge" class="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[11px] font-bold">0 Belum</span>
              <span id="totalJemaahBadge" class="px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-full text-[11px] font-bold">0 Total</span>
            </div>
          </div>
          <div class="flex gap-2">
            <div class="relative flex-1">
              <i class="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400 text-xs"></i>
              <input id="searchRoomingJemaah" onkeyup="filterRoomingNamelist()" placeholder="Cari nama jemaah..." class="w-full text-xs pl-8 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-300">
            </div>
            <select id="filterPakejRooming" onchange="filterRoomingNamelist()" class="text-xs border border-slate-200 rounded-xl px-3 py-2.5 bg-white font-medium"><option value="">Semua Pakej</option><option>EKONOMI</option><option>PREMIUM</option><option>JIMAT</option></select>
          </div>
        </div>
        <div class="px-3 py-2 bg-slate-50/70 border-b grid grid-cols-12 text-[10px] font-bold text-slate-500 tracking-wider">
          <div class="col-span-1">NO</div><div class="col-span-5">NAMA JEMAAH</div><div class="col-span-1 text-center">BOARD</div><div class="col-span-1 text-center">TRAIN</div><div class="col-span-2 text-center">PAKEJ</div><div class="col-span-1 text-center">INSUR</div><div class="col-span-1 text-center">+</div>
        </div>
        <div id="namelistContainer" class="flex-1 overflow-y-auto max-h-[78vh] divide-y divide-slate-50">
          <div class="p-8 text-center text-xs text-slate-400">Pilih Trip dari dropdown di atas</div>
        </div>
        <div id="staffExtraSection" class="border-t border-slate-200 p-3 bg-slate-50/50">
          <div class="flex items-center justify-between mb-2">
            <h4 class="font-extrabold text-[11px] tracking-widest text-slate-700">STAFF / EXTRA LIST</h4>
            <span id="staffCountBadge" class="px-2.5 py-1 bg-[#fff1f2] text-[#881337] border border-[#fecdd3] rounded-full text-[11px] font-bold">0 Staff</span>
          </div>
          <div class="flex gap-2 mb-3">
            <input id="staffExtraInput" placeholder="Taip nama staff + Enter" onkeydown="if(event.key==='Enter') addStaffExtraFromInput()" class="flex-1 text-xs px-3 py-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-[#fecdd3]">
            <button onclick="addStaffExtraFromInput()" class="px-4 py-2.5 bg-[#881337] hover:bg-[#9f1239] text-white rounded-xl text-xs font-bold">+ Add</button>
          </div>
          <div id="staffExtraContainer" class="space-y-1.5 max-h-[30vh] overflow-y-auto"></div>
        </div>
      </div>

      <div class="w-full xl:w-[48%] flex flex-col gap-3">
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-3">
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h3 class="font-extrabold text-[11px] tracking-widest">ROOMING LIST <span id="roomingTripName">-</span></h3>
              <div class="flex items-center gap-2 mt-1 text-[11px]">
                <span id="roomingBiliks" class="px-2.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-full font-bold">0 Bilik</span>
                <span id="roomingOccupancy" class="text-slate-500">0 Jemaah + 0 Staff • ${activeLocation}</span>
              </div>
            </div>
            <div class="flex items-center gap-1.5 flex-wrap">
              <div class="flex items-center gap-1 px-2.5 py-1 bg-slate-50 rounded-full border border-slate-200 text-xs"><span>Default</span><button onclick="changeDefaultCap(-1)" class="w-5 h-5 rounded-full bg-white border border-slate-200 hover:bg-slate-100">−</button><span id="defaultCapLabel" class="font-bold w-4 text-center">3</span><button onclick="changeDefaultCap(1)" class="w-5 h-5 rounded-full bg-white border border-slate-200 hover:bg-slate-100">+</button></div>
              <button onclick="printRoomingPDF()" class="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-full text-xs font-bold hover:bg-slate-50"><i class="fa-solid fa-print mr-1"></i> Print / PDF</button>
              <button onclick="autoAssignRooming()" class="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-full text-xs font-bold hover:bg-slate-50">Auto Assign</button>
              <button onclick="openNewRoomModal()" class="px-3 py-1.5 bg-[#881337] hover:bg-[#9f1239] text-white rounded-full text-xs font-bold">+ Bilik Baru</button>
            </div>
          </div>
          <div id="locationTabs" class="flex flex-wrap gap-1.5 mt-3"></div>
          <div id="roomingOverview" class="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs"></div>
        </div>
        <div id="roomingGrid" class="grid grid-cols-1 lg:grid-cols-2 gap-3 overflow-y-auto max-h-[78vh] pr-1 content-start">
          <div class="col-span-2 p-12 text-center text-slate-400 text-xs border border-dashed rounded-2xl bg-white">Pilih Trip dulu</div>
        </div>
      </div>
    </div>
  </div>

  <div id="newRoomModal" class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl">
      <h3 class="font-bold mb-4 text-sm">Tambah Bilik Baru</h3>
      <div class="space-y-3 text-xs">
        <input id="newRoomId" placeholder="Room ID (B4, M1...)" class="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-300">
        <select id="newRoomLokasi" class="w-full p-2.5 border border-slate-200 rounded-xl bg-white"><option value="MEKAH">MEKAH</option><option value="MADINAH">MADINAH</option><option value="TAIF">TAIF</option><option value="JEDDAH">JEDDAH</option></select>
        <select id="newRoomPakej" class="w-full p-2.5 border border-slate-200 rounded-xl bg-white"><option>EKONOMI</option><option>PREMIUM</option><option>JIMAT</option></select>
        <input id="newRoomHotel" placeholder="Hotel Name" class="w-full p-2.5 border border-slate-200 rounded-xl">
        <div class="flex gap-2"><input id="newRoomCap" type="number" value="3" min="1" max="8" class="flex-1 p-2.5 border border-slate-200 rounded-xl"><span class="py-2.5 text-slate-500">Kapasiti</span></div>
        <textarea id="newRoomNote" placeholder="Catatan bilik..." class="w-full p-2.5 border border-slate-200 rounded-xl h-16"></textarea>
        <div class="flex gap-2 pt-2"><button onclick="closeNewRoomModal()" class="flex-1 py-2.5 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-700">Batal</button><button onclick="submitNewRoom()" class="flex-1 py-2.5 bg-[#881337] hover:bg-[#9f1239] text-white rounded-xl font-bold">Cipta Bilik</button></div>
      </div>
    </div>
  </div>

  <div id="copyBilikModal" class="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] hidden flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl">
      <h3 class="font-bold mb-1 text-sm">Copy Bilik dari Lokasi Lain</h3>
      <p class="text-[11px] text-slate-500 mb-4">Salin struktur bilik (tanpa jemaah) dari lokasi lain ke <b id="copyTargetLabel">MEKAH</b></p>
      <div id="copySourceOptions" class="space-y-2 mb-4"></div>
      <div class="flex gap-2"><button onclick="closeCopyBilikModal()" class="flex-1 py-2.5 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-700 text-xs">Batal</button><button onclick="executeCopyBilik()" class="flex-1 py-2.5 bg-[#881337] text-white rounded-xl font-bold text-xs">Copy Sekarang</button></div>
    </div>
  </div>
  `;
  populateRoomingTripDropdown();
  renderLocationTabs();
  fetchRoomingData();
  enableDragAutoScroll();
}

// --- DRAG SCROLL ---
function enableDragAutoScroll(){
  const grid = document.getElementById('roomingGrid');
  if(!grid) return;
  let scrollInterval = null;
  document.addEventListener('dragover', (e)=>{
    const threshold = 120;
    const y = e.clientY;
    const winH = window.innerHeight;
    if(y < threshold){
      if(!scrollInterval) scrollInterval = setInterval(()=>{ window.scrollBy(0,-12); grid.scrollBy(0,-12); }, 16);
    } else if(y > winH - threshold){
      if(!scrollInterval) scrollInterval = setInterval(()=>{ window.scrollBy(0,12); grid.scrollBy(0,12); }, 16);
    } else {
      if(scrollInterval){ clearInterval(scrollInterval); scrollInterval=null; }
    }
  });
  document.addEventListener('dragend', ()=>{ if(scrollInterval){ clearInterval(scrollInterval); scrollInterval=null; } });
  document.addEventListener('drop', ()=>{ if(scrollInterval){ clearInterval(scrollInterval); scrollInterval=null; } });
}

function getRoomOrderKey(){ const tripId = window.selectedTripRecord?.id || localStorage.getItem('effah_active_trip_id') || 'default'; return `effah_room_order_${tripId}_${activeLocation}`; }
function getRoomOrderedList(rooms){
  const sortedByAirtable = [...rooms].sort((a,b)=>{
    const ao = a.fields['SORT ORDER']||9999;
    const bo = b.fields['SORT ORDER']||9999;
    return ao - bo;
  });
  const hasOrder = sortedByAirtable.some(r=> r.fields['SORT ORDER']!==undefined);
  if(hasOrder){
    const withOrder = sortedByAirtable.filter(r=> r.fields['SORT ORDER']!==undefined);
    const withoutOrder = sortedByAirtable.filter(r=> r.fields['SORT ORDER']===undefined);
    return [...withOrder, ...withoutOrder];
  }
  const key = getRoomOrderKey();
  const order = JSON.parse(localStorage.getItem(key)||'[]');
  if(order.length===0) return rooms;
  const map = {}; rooms.forEach(r=>map[r.id]=r);
  const ordered = [];
  order.forEach(id=>{ if(map[id]){ ordered.push(map[id]); delete map[id]; } });
  Object.values(map).forEach(r=>ordered.push(r));
  return ordered;
}
async function saveRoomOrder(ids){
  localStorage.setItem(getRoomOrderKey(), JSON.stringify(ids));
  const {base, pat} = getRoomingCreds();
  if(!base || !pat) return;
  try{
    for(let i=0;i<ids.length;i++){
      await fetch(`https://api.airtable.com/v0/${base}/ROOMING%20LIST/${ids[i]}`,{
        method:'PATCH',
        headers:{Authorization:`Bearer ${pat}`,'Content-Type':'application/json'},
        body: JSON.stringify({fields:{'SORT ORDER': i+1}})
      });
      await new Promise(r=>setTimeout(r, 220));
    }
  }catch(e){ console.warn('Failed save order', e); }
}
let draggedRoomId = null;
function handleRoomDragStart(e, roomId){ draggedRoomId = roomId; e.dataTransfer.effectAllowed='move'; setTimeout(()=>{ e.target.style.opacity='0.4'; },0); }
function handleRoomDragEnd(e){ e.target.style.opacity='1'; draggedRoomId=null; }
function handleRoomDragOver(e){ e.preventDefault(); e.dataTransfer.dropEffect='move'; }
function handleRoomDrop(e, targetId){
  e.preventDefault();
  if(!draggedRoomId || draggedRoomId===targetId) return;
  const grid = document.getElementById('roomingGrid');
  const cards = Array.from(grid.querySelectorAll('[data-room-id]'));
  const ids = cards.map(c=>c.dataset.roomId);
  const fromIdx = ids.indexOf(draggedRoomId);
  const toIdx = ids.indexOf(targetId);
  if(fromIdx>-1 && toIdx>-1){
    ids.splice(fromIdx,1);
    ids.splice(toIdx,0,draggedRoomId);
    saveRoomOrder(ids);
    renderRoomingGrid();
  }
}
function renderRoomingOverview(rooms){
  const el = document.getElementById('roomingOverview');
  if(!el) return;
  if(rooms.length===0){ el.innerHTML='<span class="text-[11px] text-slate-400">Tiada bilik untuk '+activeLocation+'</span>'; return; }
  const capCount = {};
  rooms.forEach(r=>{ const cap = r.fields['KAPASITI']||3; capCount[cap] = (capCount[cap]||0)+1; });
  const sortedCaps = Object.keys(capCount).sort((a,b)=>a-b);
  const total = rooms.length;
  let html = `<div class="space-y-1.5">`;
  html += `<div class="font-extrabold text-[11px] tracking-widest text-slate-800">BILIK DI ${activeLocation} :</div>`;
  html += `<div class="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">`;
  sortedCaps.forEach(cap=>{
    const count = capCount[cap];
    html += `<div class="flex justify-between"><span>B${cap} = ${count} BILIK</span><span class="text-slate-400">${count*cap} pax</span></div>`;
  });
  html += `</div>`;
  html += `<div class="pt-1.5 mt-1.5 border-t border-slate-200 font-bold flex justify-between text-[11px]"><span>TOTAL = ${total} BILIK</span><span>${rooms.reduce((s,r)=>s+(r.fields['KAPASITI']||0),0)} pax</span></div>`;
  html += `</div>`;
  const detailParts = rooms.map(r=>{
    const f = r.fields;
    const rid = f['Room ID / Nama Bilik']||'?';
    const pakej = f['PAKEJ / HOTEL']||'EKONOMI';
    const hotel = f['HOTEL NAME'] ? `(${escHtml(f['HOTEL NAME'])})` : '';
    const j = f['JEMAAH']?.length||0;
    const staff = (f['STAFF / EXTRA']||'').split(',').filter(Boolean).length;
    const cap = f['KAPASITI']||3;
    return `${escHtml(rid)} ${escHtml(pakej)} ${hotel} - ${j+staff}/${cap}`;
  });
  html += `<div class="mt-2 pt-2 border-t border-dashed border-slate-200 text-[10px] text-slate-500 leading-relaxed">${detailParts.join(' • ')}</div>`;
  el.innerHTML = html;
}
function renderLocationTabs(){
  const container = document.getElementById('locationTabs');
  if(!container) return;
  const baseLocations = ['MEKAH','MADINAH','TAIF'];
  const allLocs = [...baseLocations, ...customLocations.filter(l=>!baseLocations.includes(l))];
  const counts = {};
  allLocs.forEach(l=>counts[l]=0);
  allRoomingRecords.forEach(r=>{
    const l = (r.fields['LOKASI / CITY']||'').trim().toUpperCase();
    if(l && counts[l]!==undefined) counts[l]++; else if(l){ if(!allLocs.includes(l)) allLocs.push(l); counts[l]=(counts[l]||0)+1; }
  });
  let html = allLocs.map(loc=>{
    const label = loc==='MEKAH'?'🕋 MEKAH': loc==='MADINAH'?'🕌 MADINAH': loc==='TAIF'?'🏕️ TAIF': loc==='JEDDAH'?'🏙️ JEDDAH': '📍 '+loc;
    const c = counts[loc]||0;
    const active = loc===activeLocation;
    const cls = active ? 'bg-slate-800 text-white border border-slate-800' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50';
    const isCustom = !['MEKAH','MADINAH','TAIF'].includes(loc);
    const delBtn = isCustom ? `<button onclick="event.stopPropagation(); deleteCustomLocation('${loc}')" class="ml-1 w-4 h-4 rounded-full bg-black/10 hover:bg-red-500 hover:text-white flex items-center justify-center text-[9px]">✕</button>` : '';
    return `<div class="inline-flex items-center ${active ? 'bg-slate-800 rounded-full' : 'bg-white rounded-full border border-slate-200'}"><button onclick="setActiveLocation('${loc}')" class="px-3 py-1 rounded-full text-[11px] font-bold ${active ? 'text-white' : 'text-slate-600'}">${label} (${c})</button>${delBtn}</div>`;
  }).join('');
  html += `<button onclick="openAddLocationModal()" class="px-3 py-1 rounded-full text-[11px] font-bold border-dashed border border-slate-300 text-slate-500 hover:bg-slate-50">+ Lokasi</button>`;
  // Copy Bilik button visible when current location has 0 but other has >0
  const hasOther = Object.keys(counts).some(k=>k!==activeLocation && counts[k]>0);
  if(hasOther){
    html += `<button onclick="openCopyBilikModal()" class="ml-2 px-3 py-1 rounded-full text-[11px] font-bold bg-[#fff1f2] border border-[#fecdd3] text-[#881337] hover:bg-[#ffe4e6]"><i class="fa-solid fa-copy mr-1"></i>Copy Bilik</button>`;
  }
  container.innerHTML = html;
}
async function fetchRoomingData(){
  try{
    showRoomingLoading();
    populateRoomingTripDropdown();
    const tripId = window.selectedTripRecord?.id || localStorage.getItem('effah_active_trip_id') || localStorage.getItem('selectedTripId') || localStorage.getItem('effah_last_selected_trip');
    if(!tripId){
      const el = document.getElementById('namelistContainer');
      if(el) el.innerHTML='<div class="p-8 text-center text-xs text-slate-400">Pilih Trip dari dropdown di atas</div>';
      return;
    }
    const {base, pat} = getRoomingCreds();
    if(!base || !pat) return;
    let allRooms = [];
    let allJems = [];
    let offset = '';
    const tripFormula = `FIND("${tripId}", ARRAYJOIN({TRIP}))`;
    try{
      do{
        let url = `https://api.airtable.com/v0/${base}/ROOMING%20LIST?pageSize=100&filterByFormula=${encodeURIComponent(tripFormula)}` + (offset?`&offset=${offset}`:'');
        const res = await fetch(url, {headers:{Authorization:`Bearer ${pat}`}});
        const data = await res.json();
        if(data.records) allRooms = allRooms.concat(data.records);
        offset = data.offset||'';
      }while(offset);
    }catch(e){ console.warn(e); }
    offset = '';
    try{
      do{
        let url = `https://api.airtable.com/v0/${base}/DATA%20JEMAAH%20UMRAH?pageSize=100&filterByFormula=${encodeURIComponent(tripFormula)}` + (offset?`&offset=${offset}`:'');
        const res = await fetch(url, {headers:{Authorization:`Bearer ${pat}`}});
        const data = await res.json();
        if(data.records) allJems = allJems.concat(data.records);
        offset = data.offset||'';
      }while(offset);
    }catch(e){ console.warn(e); }
    allRoomingRecords = allRooms;
    allRoomingJemaah = allJems;
    const baseSet = ['MEKAH','MADINAH','TAIF','JEDDAH'];
    allRoomingRecords.forEach(r=>{
      const l = (r.fields['LOKASI / CITY']||'').trim().toUpperCase();
      if(l && !baseSet.includes(l) && !customLocations.includes(l)) customLocations.push(l);
    });
    if(customLocations.length>0) localStorage.setItem('effah_custom_locations', JSON.stringify(customLocations));
    const tripLabelRaw = window.selectedTripRecord?.fields?.Trip || window.selectedTripRecord?.fields?.['TRIP NAME'] || 'Trip';
    const tripLabel = cleanTripNameForRooming(tripLabelRaw);
    const elTripName = document.getElementById('roomingTripName'); if(elTripName) elTripName.textContent = tripLabel;
    renderNamelist();
    renderStaffExtraList();
    renderRoomingGrid();
    renderLocationTabs();
  }catch(e){ console.error(e); }
  finally{ isRoomingLoading = false; }
}
function populateRoomingTripDropdown(){
  const sel = document.getElementById('roomingTripSelect');
  if(!sel) return;
  let trips = [...(window.allTripUmrahRecords || window.allTripRecords || window.allTrips || [])];
  const currentId = window.selectedTripRecord?.id || localStorage.getItem('effah_active_trip_id') || localStorage.getItem('effah_last_selected_trip') || '';
  if(trips.length===0){
    sel.innerHTML = '<option value="">Loading trips...</option>';
    if(typeof fetchTripUmrahData==='function'){
      fetchTripUmrahData().then(()=>{ setTimeout(populateRoomingTripDropdown, 600); });
    }
    return;
  }
  trips.sort((a,b)=> (a.fields?.['Mula Pakej']||'').localeCompare(b.fields?.['Mula Pakej']||''));
  sel.innerHTML = '<option value="">Pilih Trip...</option>' + trips.map(t=>{
    const raw = t.fields?.Trip||t.fields?.['TRIP NAME']||t.id;
    const clean = cleanTripNameForRooming(raw);
    return `<option value="${t.id}" ${t.id===currentId?'selected':''}>${escHtml(clean)}</option>`;
  }).join('');
  if(currentId) sel.value = currentId;
}
function onRoomingTripChange(tripId){
  if(!tripId) return;
  showRoomingLoading();
  const trips = window.allTripUmrahRecords || [];
  const found = trips.find(t=>t.id===tripId);
  if(found){ window.selectedTripRecord = found; }
  localStorage.setItem('effah_active_trip_id', tripId);
  localStorage.setItem('selectedTripId', tripId);
  localStorage.setItem('effah_last_selected_trip', tripId);
  setTimeout(()=>{ fetchRoomingData(); }, 100);
}
function isJemaahAssigned(jId){ return allRoomingRecords.some(r=> (r.fields['JEMAAH']||[]).includes(jId)); }

// STAFF EXTRA
let staffExtraList = JSON.parse(localStorage.getItem('effah_staff_extra')||'[]');
function renderStaffExtraList(){
  const cont = document.getElementById('staffExtraContainer');
  const badge = document.getElementById('staffCountBadge');
  if(!cont) return;
  if(badge) badge.textContent = staffExtraList.length + ' Staff';
  if(staffExtraList.length===0){
    cont.innerHTML = '<div class="text-[11px] text-slate-400 p-2 border border-dashed rounded-xl text-center">Tiada staff/extra</div>';
    return;
  }
  cont.innerHTML = staffExtraList.map((name, idx)=>{
    const clean = escHtml(name);
    const assigned = allRoomingRecords.some(r=> (r.fields['STAFF / EXTRA']||'').split(',').map(s=>s.trim()).includes(name));
    return `<div draggable="true" ondragstart="dragStaff(event,'${escHtml(name).replace(/'/g,"\\'")}')" class="flex items-center justify-between px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs ${assigned?'opacity-50':''}">
      <div class="flex items-center gap-2"><span class="text-[10px] text-slate-400">0${idx+1}</span><span class="font-medium text-slate-700">${clean}</span>${assigned?'<span class="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded-full">ASSIGNED</span>':''}</div>
      <div class="flex gap-1"><button onclick="quickAssignStaff('${escHtml(name).replace(/'/g,"\\'")}')" class="w-6 h-6 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-[10px]">+</button><button onclick="removeStaffExtra(${idx})" class="w-6 h-6 rounded-full bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500"><i class="fa-solid fa-trash text-[10px]"></i></button></div>
    </div>`;
  }).join('');
}
function addStaffExtraFromInput(){
  const inp = document.getElementById('staffExtraInput');
  if(!inp) return;
  const val = inp.value.trim();
  if(!val) return;
  if(!staffExtraList.includes(val)) staffExtraList.push(val);
  localStorage.setItem('effah_staff_extra', JSON.stringify(staffExtraList));
  inp.value='';
  renderStaffExtraList();
}
function removeStaffExtra(idx){
  staffExtraList.splice(idx,1);
  localStorage.setItem('effah_staff_extra', JSON.stringify(staffExtraList));
  renderStaffExtraList();
}
function dragStaff(e, name){ e.dataTransfer.setData('text/staff', name); }
function quickAssignStaff(name){
  let rooms = [...allRoomingRecords].filter(r=> (r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===activeLocation);
  if(rooms.length===0) rooms = [...allRoomingRecords];
  const target = rooms.find(r=>{
    const j = r.fields['JEMAAH']?.length||0;
    const s = (r.fields['STAFF / EXTRA']||'').split(',').filter(Boolean).length;
    return (j+s) < (r.fields['KAPASITI']||roomingDefaultCap);
  });
  if(target) addStaffToRoom(target.id, name);
  else alert('Tiada slot kosong di '+activeLocation);
}
function addStaffToRoom(roomId, name){
  const rec = allRoomingRecords.find(r=>r.id===roomId);
  if(!rec) return;
  const cur = (rec.fields['STAFF / EXTRA']||'').split(',').map(s=>s.trim()).filter(Boolean);
  if(cur.includes(name)){ alert('Staff sudah ada'); return; }
  cur.push(name);
  updateRoomField(roomId,'STAFF / EXTRA', cur.join(','), true);
}

function renderNamelist(){
  const cont = document.getElementById('namelistContainer');
  if(!cont) return;
  try{
    const q = (document.getElementById('searchRoomingJemaah')?.value||'').toLowerCase();
    const fPakej = document.getElementById('filterPakejRooming')?.value||'';
    let filtered = [...allRoomingJemaah];
    // exclude staff-like names from jemaah list
    filtered = filtered.filter(r=>{
      const nm = r.fields['NAMA']||r.fields['NAME']||'';
      return !isStaffName(nm);
    });
    if(q) filtered = filtered.filter(r=> (r.fields['NAMA']||'').toLowerCase().includes(q));
    if(fPakej) filtered = filtered.filter(r=> (r.fields['PAKEJ']||'').includes(fPakej));
    const total = filtered.length;
    const totalAll = allRoomingJemaah.length;
    let belumAll = filtered.filter(r=> !isJemaahAssigned(r.id)).length;
    const elTotal = document.getElementById('totalJemaahBadge'); if(elTotal) elTotal.textContent = totalAll + ' Total';
    const elBelum = document.getElementById('belumAssignBadge'); if(elBelum) elBelum.textContent = belumAll + ' Belum';
    const elBelumTop = document.getElementById('belumAssignTop'); if(elBelumTop) elBelumTop.textContent = belumAll + ' Belum';
    const elAssignedTop = document.getElementById('assignedTop'); if(elAssignedTop) elAssignedTop.textContent = (total - belumAll) + ' Assigned';
    if(total===0){
      cont.innerHTML = '<div class="p-8 text-center text-xs text-slate-400">Tiada jemaah untuk trip ini</div>';
      return;
    }
    cont.innerHTML = filtered.map((r,i)=>{
      const f = r.fields;
      const name = escHtml(f['NAMA']||'-');
      const assigned = isJemaahAssigned(r.id);
      const boardRaw = (f['BOARD']||'').toString();
      const isFB = boardRaw.toUpperCase().includes('FB');
      const pakej = escHtml(f['PAKEJ']||'EKONOMI');
      const pakejCls = pakej.includes('PREMIUM')?'bg-blue-50 text-blue-700 border-blue-200': pakej.includes('JIMAT')?'bg-amber-50 text-amber-700 border-amber-200':'bg-slate-50 text-slate-600 border-slate-200';
      const rowCls = assigned ? 'opacity-40 bg-slate-50' : 'hover:bg-slate-50';
      const dragAttr = assigned ? '' : `draggable="true" ondragstart="dragJemaah(event,'${r.id}')"`;
      const plusBtn = assigned ? `<span class="text-[10px] text-slate-400">✓ Assigned</span>` : `<button onclick="quickAssign('${r.id}')" class="w-6 h-6 rounded-full border border-slate-200 bg-white hover:bg-slate-800 hover:text-white text-[10px] font-bold">+</button>`;
      return `<div ${dragAttr} class="grid grid-cols-12 items-center px-3 py-2.5 text-xs border-b border-slate-50 last:border-0 ${rowCls} cursor-grab">
        <div class="col-span-1 flex items-center gap-1 text-slate-400"><i class="fa-solid fa-grip text-[10px] opacity-50"></i> ${String(i+1).padStart(2,'0')}</div>
        <div class="col-span-5 font-medium truncate text-slate-700" title="${name}">${name}</div>
        <div class="col-span-1 text-center"><span class="inline-flex w-6 justify-center px-1.5 py-0.5 rounded-full text-[10px] border ${isFB?'bg-emerald-50 text-emerald-700 border-emerald-200':'bg-slate-50 text-slate-400 border-slate-200'}">${isFB?'FB':'-'}</span></div>
        <div class="col-span-1 text-center">-</div>
        <div class="col-span-2 text-center"><span class="px-2 py-0.5 rounded-full text-[10px] border font-bold ${pakejCls}">${pakej}</span></div>
        <div class="col-span-1 text-center"><span class="w-5 h-5 inline-flex items-center justify-center rounded-full bg-slate-100 text-slate-400 text-[10px]">✓</span></div>
        <div class="col-span-1 text-center">${plusBtn}</div>
      </div>`;
    }).join('');
  }catch(e){ console.error(e); cont.innerHTML = '<div class="p-4 text-xs text-red-500">Error: '+e.message+'</div>'; }
}

function renderRoomingGrid(){
  const grid = document.getElementById('roomingGrid');
  if(!grid) return;
  let rooms = [...allRoomingRecords].filter(r=>{
    const l = (r.fields['LOKASI / CITY']||'').trim().toUpperCase();
    if(!l) return activeLocation==='MEKAH';
    return l===activeLocation.toUpperCase();
  });
  rooms = getRoomOrderedList(rooms);
  const elBiliks = document.getElementById('roomingBiliks'); if(elBiliks) elBiliks.textContent = rooms.length+' Bilik';
  const totalJ = rooms.reduce((s,r)=> s+(r.fields['JEMAAH']?.length||0),0);
  const totalStaff = rooms.reduce((s,r)=> { const staff = r.fields['STAFF / EXTRA']||''; return s + (staff ? staff.split(',').filter(Boolean).length : 0); },0);
  const elOcc = document.getElementById('roomingOccupancy'); if(elOcc) elOcc.textContent = `${totalJ} Jemaah + ${totalStaff} Staff • ${activeLocation}`;
  renderRoomingOverview(rooms);
  if(rooms.length===0){
    grid.innerHTML = `<div class="col-span-2 p-12 text-center text-slate-400 text-xs border border-dashed rounded-2xl bg-white">Tiada bilik untuk <b>${activeLocation}</b>.<br><div class="flex gap-2 justify-center mt-3"><button onclick="openNewRoomModal()" class="px-4 py-2 bg-[#881337] text-white rounded-full text-xs font-bold">+ Bilik Baru untuk ${activeLocation}</button><button onclick="openCopyBilikModal()" class="px-4 py-2 bg-white border border-slate-200 rounded-full text-xs">Copy dari lokasi lain</button></div></div>`;
    return;
  }
  grid.innerHTML = rooms.map(rec=>{
    const f = rec.fields;
    const roomId = escHtml(f['Room ID / Nama Bilik']||'?');
    const pakej = escHtml(f['PAKEJ / HOTEL']||'EKONOMI');
    const cap = f['KAPASITI']||roomingDefaultCap;
    const hotel = escHtml(f['HOTEL NAME']||'');
    const note = f['CATATAN BILIK']||'';
    const staffRaw = f['STAFF / EXTRA']||'';
    const staffArr = staffRaw ? staffRaw.split(',').map(s=>s.trim()).filter(Boolean) : [];
    const jemaahIds = f['JEMAAH']||[];
    const count = jemaahIds.length + staffArr.length;
    const pakejDot = pakej==='PREMIUM'?'bg-blue-500': pakej==='JIMAT'?'bg-amber-500':'bg-slate-400';
    const jemaahSlots = jemaahIds.map(jId=>{
      const jRec = allRoomingJemaah.find(j=>j.id===jId);
      const jNameRaw = jRec?.fields?.['NAMA']||jId.slice(0,8);
      const jName = escHtml(cleanStaffName(jNameRaw));
      return `<div class="group flex items-center justify-between px-3 py-2.5 bg-white border border-slate-200 text-slate-800 rounded-xl text-[11px] shadow-sm hover:border-slate-300"><span class="truncate font-medium">${jName}</span><button onclick="removeJemaahFromRoom('${rec.id}','${jId}')" class="ml-2 w-5 h-5 rounded-full bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 flex items-center justify-center"><i class="fa-solid fa-xmark text-[10px]"></i></button></div>`;
    });
    const staffSlots = staffArr.map(s=>{
      const sClean = escHtml(cleanStaffName(s));
      return `<div class="group flex items-center justify-between px-3 py-2.5 bg-[#fff1f2] border border-[#fecdd3] text-[#881337] rounded-xl text-[11px]"><span class="truncate font-medium">👤 ${sClean}</span><button onclick="removeStaff('${rec.id}','${escHtml(s).replace(/'/g,"\\'")}')" class="ml-2 w-5 h-5 rounded-full bg-white/60 hover:bg-white text-[#881337] flex items-center justify-center"><i class="fa-solid fa-xmark text-[10px]"></i></button></div>`;
    });
    const filled = [...jemaahSlots, ...staffSlots];
    const emptyCount = Math.max(0, cap - filled.length);
    const emptySlots = Array.from({length:emptyCount}).map((_,i)=>`<div ondragover="allowDrop(event)" ondrop="dropJemaah(event,'${rec.id}')" ondrop="dropStaff(event,'${rec.id}')" class="px-2 py-2.5 border border-dashed border-slate-300 rounded-xl text-[11px] text-slate-400 text-center hover:border-slate-400 hover:text-slate-600 cursor-pointer bg-slate-50/50">Slot Kosong ${filled.length + i + 1}</div>`);
    const slots = [...filled, ...emptySlots].join('');
    return `<div data-room-id="${rec.id}" class="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm flex flex-col gap-2.5 h-fit">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <button class="drag-handle w-6 h-6 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center cursor-grab" draggable="true" ondragstart="handleRoomDragStart(event,'${rec.id}')" ondragend="handleRoomDragEnd(event)" ondragover="handleRoomDragOver(event)" ondrop="handleRoomDrop(event,'${rec.id}')"><i class="fa-solid fa-grip-lines text-[10px] text-slate-500"></i></button>
          <span class="font-bold text-sm tracking-wide text-slate-800">${roomId}</span>
          <button onclick="editRoomId('${rec.id}')" class="text-slate-400 hover:text-slate-700"><i class="fa-solid fa-pen text-[11px]"></i></button>
          <span class="px-2 py-0.5 rounded-full bg-slate-50 text-[10px] font-bold border border-slate-200 text-slate-600">${pakej}</span>
        </div>
        <button onclick="deleteRoom('${rec.id}','${roomId}')" class="w-7 h-7 rounded-full bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 border border-slate-200"><i class="fa-solid fa-trash text-[11px]"></i></button>
      </div>
      <div class="flex items-center gap-2 text-xs">
        <div class="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 rounded-full border border-slate-200"><span class="w-2 h-2 rounded-full ${pakejDot}"></span><select onchange="updateRoomField('${rec.id}','PAKEJ / HOTEL',this.value)" class="bg-transparent text-[11px] font-bold outline-none cursor-pointer text-slate-700"><option ${pakej==='EKONOMI'?'selected':''}>EKONOMI</option><option ${pakej==='PREMIUM'?'selected':''}>PREMIUM</option><option ${pakej==='JIMAT'?'selected':''}>JIMAT</option></select></div>
        <div class="flex items-center gap-1 ml-auto bg-slate-50 rounded-full px-1 py-0.5 border border-slate-200"><button onclick="updateCap('${rec.id}',-1)" class="w-6 h-6 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-slate-600">−</button><span class="font-bold text-xs w-4 text-center text-slate-700">${cap}</span><button onclick="updateCap('${rec.id}',1)" class="w-6 h-6 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-slate-600">+</button><span class="text-[10px] text-slate-500 ml-1">${count}/${cap}</span></div>
      </div>
      <div class="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50/60 border border-amber-100 rounded-xl">
        <span class="text-[11px]">🏨</span><span class="text-[11px] font-medium flex-1 truncate text-slate-700">${hotel||'Tanpa Hotel'}</span><button onclick="editHotel('${rec.id}')" class="text-slate-400 hover:text-slate-700"><i class="fa-solid fa-pen text-[10px]"></i></button>
      </div>
      <div class="space-y-1.5">${slots}</div>
      <div class="pt-2 border-t border-slate-100 space-y-2">
        <div class="flex items-center justify-between"><span class="text-[10px] font-bold tracking-widest text-slate-500">STAFF / EXTRA (${staffArr.length}) • Drag staff dari kiri</span></div>
        <div class="flex items-start gap-1.5 text-[11px]"><i class="fa-regular fa-note-sticky mt-0.5 text-slate-400"></i><input id="note-${rec.id}" value="${escHtml(note).replace(/"/g,'&quot;')}" onchange="updateRoomField('${rec.id}','CATATAN BILIK',this.value)" placeholder="+ Tambah catatan" class="flex-1 bg-transparent outline-none text-[11px] placeholder:text-slate-400 text-slate-600"></div>
      </div>
      <div class="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div class="h-full bg-slate-700 transition-all" style="width:${cap>0?Math.min(100,(count/cap)*100):0}%"></div></div>
    </div>`;
  }).join('');
}
function setActiveLocation(loc){ activeLocation=loc.toUpperCase(); localStorage.setItem('effah_active_location', activeLocation); renderLocationTabs(); renderNamelist(); renderRoomingGrid(); }
function filterRoomingNamelist(){ renderNamelist(); }
function allowDrop(e){ e.preventDefault(); }
function dragJemaah(e,jId){ if(isJemaahAssigned(jId)) { e.preventDefault(); return; } e.dataTransfer.setData('text/plain', jId); }
function dropJemaah(e,roomId){ e.preventDefault(); const jId = e.dataTransfer.getData('text/plain'); if(jId && !isJemaahAssigned(jId)) assignJemaahToRoom(jId,roomId); }
function dropStaff(e,roomId){ e.preventDefault(); const sName = e.dataTransfer.getData('text/staff'); if(sName) addStaffToRoom(roomId, sName); }
function quickAssign(jId){
  if(isJemaahAssigned(jId)){ alert('Jemaah sudah assigned'); return; }
  let rooms = [...allRoomingRecords].filter(r=> (r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===activeLocation);
  if(rooms.length===0) rooms = [...allRoomingRecords];
  const target = rooms.find(r=> (r.fields['JEMAAH']?.length||0) + (r.fields['STAFF / EXTRA']||'').split(',').filter(Boolean).length < (r.fields['KAPASITI']||roomingDefaultCap));
  if(target) assignJemaahToRoom(jId,target.id); else alert('Tiada slot kosong di ' + activeLocation);
}
async function assignJemaahToRoom(jId, roomId){
  if(isJemaahAssigned(jId)){ alert('Jemaah sudah ada di bilik lain'); return; }
  const rec = allRoomingRecords.find(r=>r.id===roomId);
  if(!rec) return;
  const cur = rec.fields['JEMAAH']||[];
  if((cur.length + (rec.fields['STAFF / EXTRA']||'').split(',').filter(Boolean).length) >= (rec.fields['KAPASITI']||roomingDefaultCap) && !confirm('Bilik penuh, tambah overbook?')) return;
  await updateRoomField(roomId,'JEMAAH',[...cur, jId],true);
}
async function removeJemaahFromRoom(roomId,jId){
  const rec = allRoomingRecords.find(r=>r.id===roomId);
  if(!rec) return;
  await updateRoomField(roomId,'JEMAAH',(rec.fields['JEMAAH']||[]).filter(id=>id!==jId),true);
}
async function updateCap(roomId,delta){
  const rec = allRoomingRecords.find(r=>r.id===roomId);
  const newCap = Math.max(1, Math.min(8, (rec.fields['KAPASITI']||roomingDefaultCap)+delta));
  await updateRoomField(roomId,'KAPASITI',newCap,true);
}
async function updateRoomField(roomId, field, value, doRender=true){
  const {base, pat} = getRoomingCreds();
  if(!base || !pat){ alert('Airtable config missing'); return; }
  try{
    await fetch(`https://api.airtable.com/v0/${base}/ROOMING%20LIST/${roomId}`,{method:'PATCH',headers:{Authorization:`Bearer ${pat}`,'Content-Type':'application/json'},body:JSON.stringify({fields:{[field]:value}})});
    const rec = allRoomingRecords.find(r=>r.id===roomId);
    if(rec) rec.fields[field]=value;
    if(doRender){ renderRoomingGrid(); renderNamelist(); renderLocationTabs(); renderStaffExtraList(); }
  }catch(e){ alert('Gagal update: '+e.message); }
}
function editRoomId(roomId){ const nv = prompt('Room ID baru:'); if(nv && nv.trim()) updateRoomField(roomId,'Room ID / Nama Bilik',nv.trim(),true); }
function editHotel(roomId){ const nv = prompt('Nama Hotel:'); if(nv!==null) updateRoomField(roomId,'HOTEL NAME',nv.trim(),true); }
function addStaff(roomId){
  const name = prompt('Nama Staff / Extra:'); if(!name || !name.trim()) return;
  const rec = allRoomingRecords.find(r=>r.id===roomId);
  const cur = (rec.fields['STAFF / EXTRA']||'').split(',').map(s=>s.trim()).filter(Boolean);
  if(cur.includes(name.trim())){ alert('Sudah ada'); return; }
  cur.push(name.trim());
  if(!staffExtraList.includes(name.trim())){ staffExtraList.push(name.trim()); localStorage.setItem('effah_staff_extra', JSON.stringify(staffExtraList)); }
  updateRoomField(roomId,'STAFF / EXTRA',cur.join(','),true);
}
function removeStaff(roomId, staffName){
  const rec = allRoomingRecords.find(r=>r.id===roomId);
  const arr = (rec.fields['STAFF / EXTRA']||'').split(',').map(s=>s.trim()).filter(s=>s && s!==staffName);
  updateRoomField(roomId,'STAFF / EXTRA',arr.join(','),true);
}
async function deleteRoom(roomId, roomName){
  if(!confirm(`Padam bilik ${roomName}?`)) return;
  const {base, pat} = getRoomingCreds();
  try{
    await fetch(`https://api.airtable.com/v0/${base}/ROOMING%20LIST/${roomId}`,{method:'DELETE',headers:{Authorization:`Bearer ${pat}`}});
    allRoomingRecords = allRoomingRecords.filter(r=>r.id!==roomId);
    renderRoomingGrid(); renderNamelist(); renderLocationTabs();
  }catch(e){ alert('Gagal padam: '+e.message); }
}
function openNewRoomModal(){
  const modal = document.getElementById('newRoomModal');
  if(!modal) return;
  modal.classList.remove('hidden');
  document.getElementById('newRoomLokasi').value = activeLocation;
  document.getElementById('newRoomCap').value = roomingDefaultCap;
  const existing = allRoomingRecords.filter(r=> (r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===activeLocation.toUpperCase());
  let maxNum = 0;
  existing.forEach(r=>{ const m = (r.fields['Room ID / Nama Bilik']||'').match(/B(\d+)/i); if(m) maxNum = Math.max(maxNum, parseInt(m[1])||0); });
  document.getElementById('newRoomId').value = `B${maxNum+1 || existing.length+1}`;
}
function closeNewRoomModal(){ document.getElementById('newRoomModal').classList.add('hidden'); }
async function submitNewRoom(){
  const roomId = document.getElementById('newRoomId').value.trim();
  const lokasi = document.getElementById('newRoomLokasi').value;
  const pakej = document.getElementById('newRoomPakej').value;
  const hotel = document.getElementById('newRoomHotel').value.trim();
  const cap = parseInt(document.getElementById('newRoomCap').value)||3;
  const note = document.getElementById('newRoomNote').value.trim();
  const tripId = window.selectedTripRecord?.id || localStorage.getItem('effah_active_trip_id');
  if(!roomId){ alert('Isi Room ID'); return; }
  if(!tripId){ alert('Pilih Trip dulu'); return; }
  const {base, pat} = getRoomingCreds();
  const payload = {fields:{'Room ID / Nama Bilik':roomId,'PAKEJ / HOTEL':pakej,'KAPASITI':cap,'HOTEL NAME':hotel||'','CATATAN BILIK':note||'','TRIP':[tripId],'LOKASI / CITY':lokasi,'SORT ORDER': allRoomingRecords.length+1}};
  try{
    const res = await fetch(`https://api.airtable.com/v0/${base}/ROOMING%20LIST`,{method:'POST',headers:{Authorization:`Bearer ${pat}`,'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const newRec = await res.json();
    if(newRec.id){ allRoomingRecords.push(newRec); closeNewRoomModal(); renderRoomingGrid(); renderLocationTabs(); }
    else { alert('Gagal: '+JSON.stringify(newRec)); }
  }catch(e){ alert('Error: '+e.message); }
}
function changeDefaultCap(d){ roomingDefaultCap = Math.max(1,Math.min(8,roomingDefaultCap+d)); const el=document.getElementById('defaultCapLabel'); if(el) el.textContent=roomingDefaultCap; }
async function autoAssignRooming(){
  if(!confirm('Auto assign semua Belum Assign ke '+activeLocation+'?')) return;
  let rooms = [...allRoomingRecords].filter(r=> (r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===activeLocation.toUpperCase());
  if(rooms.length===0) rooms = [...allRoomingRecords];
  rooms = getRoomOrderedList(rooms);
  const unassigned = allRoomingJemaah.filter(j=> !isStaffName(j.fields['NAMA']||'') && !isJemaahAssigned(j.id));
  let idx=0;
  for(let room of rooms){
    const cap = room.fields['KAPASITI']||roomingDefaultCap;
    const staffCount = (room.fields['STAFF / EXTRA']||'').split(',').filter(Boolean).length;
    let cur = [...(room.fields['JEMAAH']||[])];
    while((cur.length + staffCount) < cap && idx < unassigned.length){ cur.push(unassigned[idx].id); idx++; }
    if(cur.length !== (room.fields['JEMAAH']||[]).length){
      await updateRoomField(room.id,'JEMAAH',cur,false);
      await new Promise(r=>setTimeout(r,200));
    }
  }
  setTimeout(fetchRoomingData,800);
}
function openAddLocationModal(){
  const loc = prompt('Nama Lokasi baru:');
  if(loc && loc.trim()){
    const upper = loc.trim().toUpperCase();
    if(!customLocations.includes(upper)) customLocations.push(upper);
    localStorage.setItem('effah_custom_locations', JSON.stringify(customLocations));
    activeLocation = upper;
    localStorage.setItem('effah_active_location', activeLocation);
    renderLocationTabs(); renderRoomingGrid();
  }
}
function deleteCustomLocation(loc){
  if(!confirm(`Padam lokasi ${loc}?`)) return;
  customLocations = customLocations.filter(l=>l!==loc);
  localStorage.setItem('effah_custom_locations', JSON.stringify(customLocations));
  if(activeLocation===loc) activeLocation='MEKAH';
  localStorage.setItem('effah_active_location', activeLocation);
  renderLocationTabs(); renderRoomingGrid();
}

// --- COPY BILIK ---
let copySourceLoc = null;
function openCopyBilikModal(){
  const modal = document.getElementById('copyBilikModal');
  const label = document.getElementById('copyTargetLabel');
  const opts = document.getElementById('copySourceOptions');
  if(!modal) return;
  if(label) label.textContent = activeLocation;
  const locs = [...new Set(allRoomingRecords.map(r=> (r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()))].filter(l=>l!==activeLocation);
  const allBase = ['MEKAH','MADINAH','TAIF','JEDDAH',...customLocations];
  const available = allBase.filter(l=> l!==activeLocation && allRoomingRecords.some(r=> (r.fields['LOKASI / CITY']||'').toUpperCase()===l));
  if(available.length===0){ alert('Tiada bilik di lokasi lain untuk di-copy'); return; }
  opts.innerHTML = available.map(l=>{
    const cnt = allRoomingRecords.filter(r=> (r.fields['LOKASI / CITY']||'').toUpperCase()===l).length;
    return `<label class="flex items-center justify-between p-3 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer"><div class="flex items-center gap-2"><input type="radio" name="copySrc" value="${l}" class="accent-[#881337]"><span class="text-xs font-bold">${l}</span><span class="text-[11px] text-slate-500">(${cnt} bilik)</span></div><i class="fa-solid fa-copy text-slate-400 text-xs"></i></label>`;
  }).join('');
  modal.classList.remove('hidden');
}
function closeCopyBilikModal(){ document.getElementById('copyBilikModal').classList.add('hidden'); }
async function executeCopyBilik(){
  const sel = document.querySelector('input[name="copySrc"]:checked');
  if(!sel){ alert('Pilih lokasi sumber'); return; }
  const src = sel.value;
  const tripId = window.selectedTripRecord?.id || localStorage.getItem('effah_active_trip_id');
  const {base, pat} = getRoomingCreds();
  if(!base || !pat){ alert('Config missing'); return; }
  const srcRooms = allRoomingRecords.filter(r=> (r.fields['LOKASI / CITY']||'').toUpperCase()===src);
  if(srcRooms.length===0){ alert('Tiada bilik'); return; }
  if(!confirm(`Copy ${srcRooms.length} bilik dari ${src} ke ${activeLocation}? Jemaah tidak akan di-copy, hanya struktur bilik.`)) return;
  closeCopyBilikModal();
  showRoomingLoading();
  for(let i=0;i<srcRooms.length;i++){
    const r = srcRooms[i];
    const payload = {fields:{
      'Room ID / Nama Bilik': r.fields['Room ID / Nama Bilik']||`B${i+1}`,
      'PAKEJ / HOTEL': r.fields['PAKEJ / HOTEL']||'EKONOMI',
      'KAPASITI': r.fields['KAPASITI']||3,
      'HOTEL NAME': r.fields['HOTEL NAME']||'',
      'CATATAN BILIK': r.fields['CATATAN BILIK']||'',
      'TRIP': [tripId],
      'LOKASI / CITY': activeLocation,
      'SORT ORDER': allRoomingRecords.length + i + 1
    }};
    try{
      const res = await fetch(`https://api.airtable.com/v0/${base}/ROOMING%20LIST`,{method:'POST',headers:{Authorization:`Bearer ${pat}`,'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const newRec = await res.json();
      if(newRec.id) allRoomingRecords.push(newRec);
      await new Promise(r=>setTimeout(r,250));
    }catch(e){ console.warn(e); }
  }
  fetchRoomingData();
}

// --- PRINT / PDF ---
function printRoomingPDF(){
  const tripName = document.getElementById('roomingTripName')?.textContent||activeLocation;
  const rooms = getRoomOrderedList([...allRoomingRecords].filter(r=> (r.fields['LOKASI / CITY']||'').toUpperCase()===activeLocation.toUpperCase()));
  if(rooms.length===0){ alert('Tiada bilik untuk '+activeLocation); return; }

  // Build per-bilik HTML like image_c26367
  let bilikHtml = rooms.map(rec=>{
    const f = rec.fields;
    const roomId = escHtml(f['Room ID / Nama Bilik']||'?');
    const pakej = escHtml(f['PAKEJ / HOTEL']||'');
    const hotel = escHtml(f['HOTEL NAME']||'');
    const jIds = f['JEMAAH']||[];
    const staffArr = (f['STAFF / EXTRA']||'').split(',').map(s=>s.trim()).filter(Boolean);
    let jemaahList = jIds.map(jId=>{
      const jRec = allRoomingJemaah.find(j=>j.id===jId);
      const raw = jRec?.fields?.['NAMA']||jId;
      return escHtml(cleanStaffName(raw));
    });
    // Exclude staff from numbering
    let html = `<div style="margin-bottom:18px; page-break-inside:avoid;"><div style="font-weight:800; font-size:12px; margin-bottom:6px;">${roomId} (${pakej})${hotel?' - '+hotel:''}</div>`;
    let num = 1;
    jemaahList.forEach(name=>{
      if(isStaffName(name)) return;
      html += `<div style="font-size:11px; line-height:1.6; padding-left:10px;">${num}. ${name}</div>`;
      num++;
    });
    staffArr.forEach(s=>{
      const sClean = cleanStaffName(s);
      html += `<div style="font-size:11px; line-height:1.6; padding-left:10px; color:#881337;">STAFF: ${escHtml(sClean)}</div>`;
    });
    html += `</div>`;
    return html;
  }).join('');

  // Namelist with proper numbering excluding staff
  let allJ = allRoomingJemaah.filter(r=> !isStaffName(r.fields['NAMA']||''));
  let staffJ = allRoomingJemaah.filter(r=> isStaffName(r.fields['NAMA']||'')).concat(staffExtraList.map(n=>({fields:{NAMA:n}})));
  let namelistRows = '';
  let no = 1;
  allJ.forEach(r=>{
    const raw = r.fields['NAMA']||'';
    const name = escHtml(cleanStaffName(raw));
    if(!name) return;
    namelistRows += `<tr><td style="border:1px solid #ccc; padding:4px 8px; font-size:11px;">${no}</td><td style="border:1px solid #ccc; padding:4px 8px; font-size:11px;">${name}</td></tr>`;
    no++;
  });
  // Staff rows with S prefix in NO column, name without NA
  staffJ.forEach(r=>{
    const raw = r.fields ? r.fields['NAMA'] : r;
    const name = escHtml(cleanStaffName(typeof raw==='string'?raw:raw));
    if(!name) return;
    // Determine label for NO: S1, S2 or NA
    namelistRows += `<tr><td style="border:1px solid #ccc; padding:4px 8px; font-size:11px; background:#fff1f2; color:#881337;">S${no - allJ.length}</td><td style="border:1px solid #ccc; padding:4px 8px; font-size:11px; background:#fff1f2; color:#881337;">${name}</td></tr>`;
  });

  const printHtml = `
  <html><head><title>Rooming List ${escHtml(tripName)} - ${activeLocation}</title>
  <style>
    @media print{ @page{ margin:15mm; } body{ -webkit-print-color-adjust:exact; } }
    body{ font-family: Arial, sans-serif; color:#111; }
    h2{ font-size:14px; margin:0 0 10px 0; }
    h3{ font-size:12px; margin:20px 0 8px 0; border-bottom:1px solid #ddd; padding-bottom:4px; }
  </style></head><body>
  <h2>ROOMING LIST ${escHtml(tripName)} - ${activeLocation}</h2>
  <div style="font-size:11px; color:#555; margin-bottom:12px;">${rooms.length} Bilik • ${allJ.length} Jemaah + ${staffJ.length} Staff</div>
  <div style="columns:2; column-gap:24px;">${bilikHtml}</div>
  <div style="page-break-before:always;"></div>
  <h2>NAMELIST ${escHtml(tripName)}</h2>
  <table style="border-collapse:collapse; width:100%; max-width:600px;"><thead><tr><th style="border:1px solid #ccc; padding:4px 8px; font-size:11px; background:#f5f5f5; text-align:left;">NO</th><th style="border:1px solid #ccc; padding:4px 8px; font-size:11px; background:#f5f5f5; text-align:left;">NAMA JEMAAH</th></tr></thead><tbody>${namelistRows}</tbody></table>
  <script>window.onload=()=>{ window.print(); }</script>
  </body></html>
  `;
  const w = window.open('', '_blank');
  w.document.write(printHtml);
  w.document.close();
}
