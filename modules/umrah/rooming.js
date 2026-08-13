// ROOMING MODULE V6 - Fix: assigned grayed, drag handle, Airtable SORT ORDER, loading skeleton, overview Excel style
let allRoomingRecords = [];
let allRoomingJemaah = [];
let activeLocation = localStorage.getItem('effah_active_location') || 'MEKAH';
let roomingDefaultCap = 3;
let customLocations = JSON.parse(localStorage.getItem('effah_custom_locations')||'[]');
let isRoomingLoading = false;
let staffList = JSON.parse(localStorage.getItem('effah_staff_list')||'[]');
let staffIdCounter = parseInt(localStorage.getItem('effah_staff_counter')||'1000');

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
  const skeletonList = `
  <div class="p-4 space-y-3 animate-pulse">
    <div class="h-4 bg-slate-200 rounded w-3/4"></div>
    <div class="space-y-2">
      <div class="h-8 bg-slate-100 rounded-xl"></div>
      <div class="h-8 bg-slate-100 rounded-xl"></div>
      <div class="h-8 bg-slate-100 rounded-xl"></div>
      <div class="h-8 bg-slate-100 rounded-xl w-5/6"></div>
      <div class="h-8 bg-slate-100 rounded-xl"></div>
    </div>
  </div>`;
  const skeletonGrid = `
  <div class="col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-3">
    <div class="bg-white rounded-2xl border p-4 space-y-3 animate-pulse"><div class="h-5 bg-slate-200 rounded w-1/3"></div><div class="h-20 bg-slate-100 rounded-xl"></div><div class="h-10 bg-slate-100 rounded-xl"></div></div>
    <div class="bg-white rounded-2xl border p-4 space-y-3 animate-pulse"><div class="h-5 bg-slate-200 rounded w-1/3"></div><div class="h-20 bg-slate-100 rounded-xl"></div><div class="h-10 bg-slate-100 rounded-xl"></div></div>
  </div>`;
  if(grid) grid.innerHTML = skeletonGrid;
  if(list) list.innerHTML = skeletonList;
}

function renderRoomingHTML(){
  const c = document.getElementById('modul-rooming');
  if(!c) return;
  c.innerHTML = `
  <div class="flex flex-col gap-3 p-2">
    <div class="bg-white rounded-2xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3 text-xs flex-wrap">
        <span class="font-black tracking-widest text-slate-800">ROOMING LIST</span>
        <select id="roomingTripSelect" onchange="onRoomingTripChange(this.value)" class="px-3 py-1.5 border border-slate-300 rounded-full bg-white text-xs font-bold min-w-[240px] max-w-[320px] truncate">
          <option value="">Pilih Trip...</option>
        </select>
        <span id="roomingHeaderCount" class="text-slate-500 text-[11px]">0 Bilik</span>
      </div>
      <div class="flex items-center gap-2 text-xs">
        <span id="belumAssignTop" class="px-2.5 py-1 bg-amber-100 rounded-full font-bold">0 Unassigned</span>
        <span id="assignedTop" class="px-2.5 py-1 bg-emerald-50 rounded-full font-bold">0 Assigned</span>
        <button onclick="fetchRoomingData()" class="w-7 h-7 rounded-full border bg-white hover:bg-slate-50"><i class="fa-solid fa-rotate"></i></button>
      </div>
    </div>

    <div class="flex flex-col xl:flex-row gap-3">
      <div class="w-full xl:w-[52%] bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        <div class="p-3 border-b">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-extrabold text-[11px] tracking-[0.15em] text-slate-700">NAMELIST JEMAAH</h3>
            <div class="flex gap-1.5">
              <span id="belumAssignBadge" class="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-[11px] font-bold">0 Unassigned</span>
              <span id="totalJemaahBadge" class="px-2.5 py-1 bg-slate-900 text-white rounded-full text-[11px] font-bold">0 Total</span>
            </div>
          </div>
          <div class="flex gap-2">
            <div class="relative flex-1">
              <i class="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400 text-xs"></i>
              <input id="searchRoomingJemaah" onkeyup="filterRoomingNamelist()" placeholder="Cari nama jemaah..." class="w-full text-xs pl-8 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none">
            </div>
            <select id="filterPakejRooming" onchange="filterRoomingNamelist()" class="text-xs border border-slate-200 rounded-xl px-3 py-2.5 bg-white font-medium"><option value="">Semua Pakej</option><option>EKONOMI</option><option>PREMIUM</option><option>JIMAT</option></select>
          </div>
        </div>
        <div class="px-3 py-2 bg-slate-50/70 border-b grid grid-cols-12 text-[10px] font-bold text-slate-500 tracking-wider">
          <div class="col-span-1">NO</div><div class="col-span-7">NAMA JEMAAH</div><div class="col-span-1 text-center">BOARD</div><div class="col-span-2 text-center">PAKEJ</div><div class="col-span-1 text-center">+</div>
        </div>
        <div id="namelistContainer" class="flex-1 overflow-y-auto max-h-[45vh] divide-y divide-slate-50">
          <div class="p-8 text-center text-xs text-slate-400">Pilih Trip dari dropdown di atas</div>
        </div>
        <!-- STAFF LIST NEW -->
        <div class="border-t border-slate-200 bg-amber-50/30">
          <div class="p-3 flex items-center justify-between">
            <h4 class="font-extrabold text-[11px] tracking-widest text-slate-700">STAFF / EXTRA LIST</h4>
            <span id="staffTotalBadge" class="px-2.5 py-1 bg-slate-900 text-white rounded-full text-[11px] font-bold">0 Staff</span>
          </div>
          <div class="px-3 pb-3 flex gap-2">
            <input id="newStaffInput" placeholder="Taip nama staff + Enter (contoh: NORHAKIM)" class="flex-1 text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none" onkeydown="if(event.key==='Enter'){ addNewStaff(); }">
            <button onclick="addNewStaff()" class="px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold">+ Add</button>
          </div>
          <div id="staffListContainer" class="px-2 pb-3 max-h-[25vh] overflow-y-auto space-y-1"></div>
        </div>
      </div>

      <div class="w-full xl:w-[48%] flex flex-col gap-3">
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-3">
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h3 class="font-extrabold text-[11px] tracking-widest">ROOMING LIST <span id="roomingTripName" class="font-bold text-slate-900 text-[11px] ml-1">-</span></h3>
              <div class="flex items-center gap-2 mt-1 text-[11px]">
                <span id="roomingBiliks" class="px-2.5 py-0.5 bg-slate-900 text-white rounded-full font-bold">0 Bilik</span>
                <span id="roomingOccupancy" class="text-slate-500">0 Jemaah + 0 Staff • ${activeLocation}</span>
              </div>
            </div>
            <div class="flex items-center gap-1.5">
              <div class="flex items-center gap-1 px-2 py-1 bg-slate-50 rounded-full border text-xs"><span>Default</span><button onclick="changeDefaultCap(-1)" class="w-5 h-5 rounded-full bg-white border">−</button><span id="defaultCapLabel" class="font-bold w-4 text-center">3</span><button onclick="changeDefaultCap(1)" class="w-5 h-5 rounded-full bg-white border">+</button></div>
              <button onclick="generateRoomingPrint()" class="px-3 py-1.5 bg-white border border-slate-300 rounded-full text-xs font-bold hover:bg-slate-50"><i class="fa-solid fa-print mr-1"></i> Print / PDF</button>
              <button onclick="autoAssignRooming()" class="px-3 py-1.5 bg-slate-900 text-white rounded-full text-xs font-bold">Auto Assign</button>
              <button onclick="openNewRoomModal()" class="px-3 py-1.5 bg-white border rounded-full text-xs font-bold">+ Bilik Baru</button>
            </div>
          </div>
          <div id="roomingOverview" class="mt-3 p-3 bg-white border border-slate-200 rounded-xl"></div>
          <div id="locationTabs" class="flex flex-wrap gap-1.5 mt-3"></div>
        </div>
        <div id="roomingGrid" class="grid grid-cols-1 lg:grid-cols-2 gap-3 overflow-y-auto max-h-[78vh] pr-1 content-start">
          <div class="col-span-2 p-12 text-center text-slate-400 text-xs border border-dashed rounded-2xl bg-white">Pilih Trip dulu</div>
        </div>
      </div>
    </div>
  </div>

  <div id="newRoomModal" class="fixed inset-0 bg-black/50 z-50 hidden flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl">
      <h3 class="font-bold mb-4 text-sm">Tambah Bilik Baru</h3>
      <div class="space-y-3 text-xs">
        <input id="newRoomId" placeholder="Room ID (B4, M1...)" class="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none">
        <select id="newRoomLokasi" class="w-full p-2.5 border rounded-xl"><option value="MEKAH">MEKAH</option><option value="MADINAH">MADINAH</option><option value="TAIF">TAIF</option><option value="JEDDAH">JEDDAH</option></select>
        <select id="newRoomPakej" class="w-full p-2.5 border rounded-xl"><option>EKONOMI</option><option>PREMIUM</option><option>JIMAT</option></select>
        <input id="newRoomHotel" placeholder="Hotel Name (SNOOD AJYAD)" class="w-full p-2.5 border rounded-xl">
        <div class="flex gap-2"><input id="newRoomCap" type="number" value="3" min="1" max="8" class="flex-1 p-2.5 border rounded-xl"><span class="py-2.5 text-slate-500">Kapasiti</span></div>
        <textarea id="newRoomNote" placeholder="Catatan bilik..." class="w-full p-2.5 border rounded-xl h-16"></textarea>
        <div class="flex gap-2 pt-2"><button onclick="closeNewRoomModal()" class="flex-1 py-2.5 bg-slate-100 rounded-xl font-bold">Batal</button><button onclick="submitNewRoom()" class="flex-1 py-2.5 bg-slate-900 text-white rounded-xl font-bold">Cipta Bilik</button></div>
      </div>
    </div>
  </div>
  `;
  populateRoomingTripDropdown();
  renderLocationTabs();
  fetchRoomingData();
}

// Room order with Airtable persistence
function getRoomOrderKey(){ const tripId = window.selectedTripRecord?.id || localStorage.getItem('effah_active_trip_id') || 'default'; return `effah_room_order_${tripId}_${activeLocation}`; }
function getRoomOrderedList(rooms){
  // Sort by SORT ORDER field if exists, then by localStorage order
  const sortedByAirtable = [...rooms].sort((a,b)=>{
    const ao = a.fields['SORT ORDER']||a.fields['Sort Order']||a.fields['ORDER']||9999;
    const bo = b.fields['SORT ORDER']||b.fields['Sort Order']||b.fields['ORDER']||9999;
    return ao - bo;
  });
  const hasOrder = sortedByAirtable.some(r=> (r.fields['SORT ORDER']||r.fields['Sort Order']||r.fields['ORDER'])!==undefined);
  if(hasOrder){
    const withOrder = sortedByAirtable.filter(r=> r.fields['SORT ORDER']!==undefined || r.fields['Sort Order']!==undefined);
    const withoutOrder = sortedByAirtable.filter(r=> r.fields['SORT ORDER']===undefined && r.fields['Sort Order']===undefined);
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
function saveRoomOrder(ids){
  // Immediate local save
  localStorage.setItem(getRoomOrderKey(), JSON.stringify(ids));
  // Reorder in-memory allRoomingRecords to match ids for current location
  const loc = activeLocation.toUpperCase();
  const locRooms = allRoomingRecords.filter(r=> (r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===loc);
  const otherRooms = allRoomingRecords.filter(r=> (r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()!==loc);
  const map = {};
  locRooms.forEach(r=>map[r.id]=r);
  const reorderedLoc = [];
  ids.forEach(id=>{ if(map[id]){ reorderedLoc.push(map[id]); delete map[id]; } });
  Object.values(map).forEach(r=>reorderedLoc.push(r));
  allRoomingRecords = [...otherRooms, ...reorderedLoc];
  
  // Background sync to Airtable
  const base = window.AIRTABLE_BASE_ID || localStorage.getItem('effah_api_base') || localStorage.getItem('effah_base_id');
  const pat = window.AIRTABLE_PAT || localStorage.getItem('effah_api_pat');
  if(base && pat){
    (async()=>{
      try{
        for(let i=0;i<ids.length;i++){
          const roomId = ids[i];
          await fetch(`https://api.airtable.com/v0/${base}/ROOMING%20LIST/${roomId}`,{
            method:'PATCH',
            headers:{Authorization:`Bearer ${pat}`,'Content-Type':'application/json'},
            body: JSON.stringify({fields:{'SORT ORDER': i+1}})
          });
        }
      }catch(e){ console.warn('Airtable order save fail', e); }
    })();
  }
}

let draggedRoomId = null;
function handleRoomDragStart(e, roomId){
  draggedRoomId = roomId;
  e.dataTransfer.effectAllowed='move';
  e.dataTransfer.setData('text/room-id', roomId);
  const card = document.querySelector(`[data-room-id="${roomId}"]`);
  if(card){ setTimeout(()=>{ card.style.opacity='0.4'; card.style.transform='scale(0.98)'; card.classList.add('ring-2','ring-slate-900'); },0); }
}
function handleRoomDragEnd(e){
  const card = document.querySelector(`[data-room-id="${draggedRoomId}"]`);
  if(card){ card.style.opacity='1'; card.style.transform='scale(1)'; card.classList.remove('ring-2','ring-slate-900'); }
  draggedRoomId=null;
  document.querySelectorAll('[data-room-id]').forEach(c=>c.classList.remove('ring-2','ring-blue-400'));
}
function handleRoomDragOver(e){ 
  e.preventDefault(); 
  e.dataTransfer.dropEffect='move';
  const card = e.currentTarget;
  if(card && card.dataset.roomId!==draggedRoomId) card.classList.add('ring-2','ring-blue-400');
}
function handleRoomDragLeave(e){
  const card = e.currentTarget;
  if(card) card.classList.remove('ring-2','ring-blue-400');
}
function handleRoomDrop(e, targetId){
  e.preventDefault();
  const fromId = draggedRoomId || e.dataTransfer.getData('text/room-id') || e.dataTransfer.getData('text/plain');
  if(!fromId || fromId===targetId) return;
  const grid = document.getElementById('roomingGrid');
  const cards = Array.from(grid.querySelectorAll('[data-room-id]'));
  const ids = cards.map(c=>c.dataset.roomId);
  const fromIdx = ids.indexOf(fromId);
  const toIdx = ids.indexOf(targetId);
  if(fromIdx>-1 && toIdx>-1){
    ids.splice(fromIdx,1);
    ids.splice(toIdx,0,fromId);
    saveRoomOrder(ids);
    renderRoomingGrid();
  }
}
function moveRoomUp(roomId){
  const grid = document.getElementById('roomingGrid');
  const cards = Array.from(grid.querySelectorAll('[data-room-id]'));
  const ids = cards.map(c=>c.dataset.roomId);
  const idx = ids.indexOf(roomId);
  if(idx>0){ [ids[idx-1], ids[idx]]=[ids[idx], ids[idx-1]]; saveRoomOrder(ids); setTimeout(()=>renderRoomingGrid(),100); }
}
function moveRoomDown(roomId){
  const grid = document.getElementById('roomingGrid');
  const cards = Array.from(grid.querySelectorAll('[data-room-id]'));
  const ids = cards.map(c=>c.dataset.roomId);
  const idx = ids.indexOf(roomId);
  if(idx>-1 && idx<ids.length-1){ [ids[idx], ids[idx+1]]=[ids[idx+1], ids[idx]]; saveRoomOrder(ids); setTimeout(()=>renderRoomingGrid(),100); }
}

// Excel-style overview
function renderRoomingOverview(rooms){
  const el = document.getElementById('roomingOverview');
  if(!el) return;
  if(rooms.length===0){ el.innerHTML='<span class="text-[11px] text-slate-400">Tiada bilik untuk '+activeLocation+'</span>'; return; }
  
  // Group by capacity B2, B3, B4, B5
  const capCount = {};
  rooms.forEach(r=>{
    const cap = r.fields['KAPASITI']||3;
    capCount[cap] = (capCount[cap]||0)+1;
  });
  const sortedCaps = Object.keys(capCount).sort((a,b)=>a-b);
  const total = rooms.length;
  
  // For current active location
  const locLabel = activeLocation;
  let html = `<div class="space-y-1.5">`;
  html += `<div class="font-extrabold text-[11px] tracking-widest text-slate-800">BILIK DI ${locLabel} :</div>`;
  html += `<div class="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">`;
  sortedCaps.forEach(cap=>{
    const count = capCount[cap];
    html += `<div class="flex justify-between"><span>B${cap} = ${count} BILIK</span><span class="text-slate-400">${count*cap} pax</span></div>`;
  });
  html += `</div>`;
  html += `<div class="pt-1.5 mt-1.5 border-t border-slate-200 font-bold flex justify-between text-[11px]"><span>TOTAL = ${total} BILIK</span><span>${rooms.reduce((s,r)=>s+(r.fields['KAPASITI']||0),0)} pax</span></div>`;
  html += `</div>`;
  
  // Also show detailed list B4 EKONOMI (SNOOD) - 5/5
  const detailParts = rooms.map(r=>{
    const f = r.fields;
    const rid = f['Room ID / Nama Bilik']||'?';
    const pakej = f['PAKEJ / HOTEL']||'EKONOMI';
    const hotel = f['HOTEL NAME'] ? `(${f['HOTEL NAME']})` : '';
    const j = f['JEMAAH']?.length||0;
    const staff = (f['STAFF / EXTRA']||'').split(',').filter(Boolean).length;
    const cap = f['KAPASITI']||3;
    return `${rid} ${pakej} ${hotel} - ${j+staff}/${cap}`;
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
    if(!l) return;
    if(counts[l]!==undefined) counts[l]++; else { counts[l]=1; if(!allLocs.includes(l)) allLocs.push(l); }
  });
  allRoomingRecords.forEach(r=>{
    const l = (r.fields['LOKASI / CITY']||'').trim().toUpperCase();
    if(l && !allLocs.includes(l) && l!==''){ allLocs.push(l); counts[l]=(counts[l]||0)+1; }
  });

  let html = allLocs.map(loc=>{
    const label = loc==='MEKAH'?'🕋 MEKAH': loc==='MADINAH'?'🕌 MADINAH': loc==='TAIF'?'🏕️ TAIF': loc==='JEDDAH'?'🏙️ JEDDAH': '📍 '+loc;
    const c = counts[loc]||0;
    const active = loc===activeLocation;
    const cls = active ? 'bg-slate-900 text-white border border-slate-900' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50';
    const isCustom = !['MEKAH','MADINAH','TAIF'].includes(loc);
    const delBtn = isCustom ? `<button onclick="event.stopPropagation(); deleteCustomLocation('${loc}')" class="ml-1 w-4 h-4 rounded-full bg-black/10 hover:bg-red-500 hover:text-white flex items-center justify-center text-[9px]">✕</button>` : '';
    return `<div class="inline-flex items-center ${active ? 'bg-slate-900 rounded-full' : 'bg-white rounded-full border border-slate-200'}"><button onclick="setActiveLocation('${loc}')" data-loc="${loc}" class="loc-tab px-3 py-1 rounded-full text-[11px] font-bold ${active ? 'text-white' : 'text-slate-700'}">${label} (${c})</button>${delBtn}</div>`;
  }).join('');
  html += `<button onclick="openAddLocationModal()" class="px-3 py-1 rounded-full text-[11px] font-bold border-dashed border border-slate-300 text-slate-500 hover:bg-slate-50">+ Lokasi</button>`;
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
    const base = window.AIRTABLE_BASE_ID || window.APP_CONFIG?.AIRTABLE_BASE_ID || localStorage.getItem('effah_api_base') || localStorage.getItem('effah_base_id');
    const pat = window.AIRTABLE_PAT || window.APP_CONFIG?.AIRTABLE_PAT || localStorage.getItem('effah_api_pat');
    if(!base || !pat) return;

    let allRooms = [];
    let allJems = [];
    let offset = '';
    try{
      do{
        let url = `https://api.airtable.com/v0/${base}/ROOMING%20LIST?pageSize=100` + (offset?`&offset=${offset}`:'');
        const res = await fetch(url, {headers:{Authorization:`Bearer ${pat}`}});
        const data = await res.json();
        if(data.records) allRooms = allRooms.concat(data.records);
        offset = data.offset||'';
      }while(offset);
    }catch(e){ console.warn('room fetch error', e); }
    offset = '';
    try{
      do{
        let url = `https://api.airtable.com/v0/${base}/DATA%20JEMAAH%20UMRAH?pageSize=100` + (offset?`&offset=${offset}`:'');
        const res = await fetch(url, {headers:{Authorization:`Bearer ${pat}`}});
        const data = await res.json();
        if(data.records) allJems = allJems.concat(data.records);
        offset = data.offset||'';
      }while(offset);
    }catch(e){ console.warn('jemaah fetch error', e); }

    allRoomingRecords = allRooms.filter(r=>{
      const tripField = r.fields['TRIP']||[];
      return Array.isArray(tripField) ? tripField.includes(tripId) : String(tripField).includes(tripId);
    });
    allRoomingJemaah = allJems.filter(r=>{
      const tripField = r.fields['TRIP']||[];
      return Array.isArray(tripField) ? tripField.includes(tripId) : String(tripField).includes(tripId);
    });

    const baseSet = ['MEKAH','MADINAH','TAIF','JEDDAH'];
    allRoomingRecords.forEach(r=>{
      const l = (r.fields['LOKASI / CITY']||'').trim().toUpperCase();
      if(l && !baseSet.includes(l) && !customLocations.includes(l)) customLocations.push(l);
    });
    if(customLocations.length>0) localStorage.setItem('effah_custom_locations', JSON.stringify(customLocations));

    const tripLabelRaw = window.selectedTripRecord?.fields?.Trip || window.selectedTripRecord?.fields?.['TRIP NAME'] || 'Trip';
    const tripLabel = cleanTripNameForRooming(tripLabelRaw);
    const elTripName = document.getElementById('roomingTripName'); if(elTripName) elTripName.textContent = tripLabel;

    loadStaffList();
    renderNamelist();
    renderRoomingGrid();
    renderLocationTabs();
  }catch(e){ console.error('fetchRooming error', e); }
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
  trips.sort((a,b)=>{
    const aMula = a.fields?.['Mula Pakej']||'';
    const bMula = b.fields?.['Mula Pakej']||'';
    if(aMula!==bMula) return aMula.localeCompare(bMula);
    const aTamat = a.fields?.['Tamat Pakej']||'';
    const bTamat = b.fields?.['Tamat Pakej']||'';
    return aTamat.localeCompare(bTamat);
  });
  sel.innerHTML = '<option value="">Pilih Trip...</option>' + trips.map(t=>{
    const raw = t.fields?.Trip||t.fields?.['TRIP NAME']||t.fields?.Name||t.fields?.NAME||t.id;
    const clean = cleanTripNameForRooming(raw);
    return `<option value="${t.id}" ${t.id===currentId?'selected':''}>${clean}</option>`;
  }).join('');
  if(currentId) sel.value = currentId;
}

function onRoomingTripChange(tripId){
  if(!tripId) return;
  showRoomingLoading();
  const trips = window.allTripUmrahRecords || window.allTripRecords || window.allTrips || [];
  const found = trips.find(t=>t.id===tripId);
  if(found){
    window.selectedTripRecord = found;
    localStorage.setItem('effah_active_trip_id', tripId);
    localStorage.setItem('selectedTripId', tripId);
    localStorage.setItem('effah_last_selected_trip', tripId);
  } else {
    localStorage.setItem('effah_active_trip_id', tripId);
    localStorage.setItem('selectedTripId', tripId);
    window.selectedTripRecord = {id: tripId, fields:{Trip: 'Trip'}};
  }
  setTimeout(()=>{ fetchRoomingData(); }, 100);
}

function isJemaahAssigned(jId){
  return allRoomingRecords.some(r=> (r.fields['JEMAAH']||[]).includes(jId));
}

function renderNamelist(){
  const cont = document.getElementById('namelistContainer');
  if(!cont) return;
  try{
    const q = (document.getElementById('searchRoomingJemaah')?.value||'').toLowerCase();
    const fPakej = document.getElementById('filterPakejRooming')?.value||'';
    let filtered = [...allRoomingJemaah];
    if(q) filtered = filtered.filter(r=> (r.fields['NAMA']||r.fields['NAME']||'').toLowerCase().includes(q));
    if(fPakej) filtered = filtered.filter(r=> (r.fields['PAKEJ']||'').includes(fPakej));

    const total = allRoomingJemaah.length;
    let belumAll = total;
    try{ belumAll = allRoomingJemaah.filter(r=> !isJemaahAssigned(r.id)).length; }catch(e){}
    const elTotal = document.getElementById('totalJemaahBadge'); if(elTotal) elTotal.textContent = total + ' Total';
    const elBelum = document.getElementById('belumAssignBadge'); if(elBelum) elBelum.textContent = belumAll + ' Unassigned';
    const elBelumTop = document.getElementById('belumAssignTop'); if(elBelumTop) elBelumTop.textContent = belumAll + ' Unassigned';
    const elAssignedTop = document.getElementById('assignedTop'); if(elAssignedTop) elAssignedTop.textContent = (total - belumAll) + ' Assigned';

    if(total===0){
      cont.innerHTML = '<div class="p-8 text-center text-xs text-slate-400">Tiada jemaah untuk trip ini</div>';
      return;
    }

    cont.innerHTML = filtered.map((r,i)=>{
      const f = r.fields;
      const name = f['NAMA']||f['NAME']||'-';
      const assigned = isJemaahAssigned(r.id);
      const boardRaw = (f['BOARD']||'').toString();
      const isFB = boardRaw.toUpperCase().includes('FB');
      const pakej = f['PAKEJ']||'EKONOMI';
      const pakejCls = pakej.includes('PREMIUM')?'bg-blue-50 text-blue-700 border-blue-200': pakej.includes('JIMAT')?'bg-amber-50 text-amber-700 border-amber-200':'bg-slate-100 text-slate-700 border-slate-200';
      
      const rowCls = assigned ? 'opacity-40 bg-slate-50 pointer-events-none' : 'hover:bg-slate-50 cursor-grab';
      const dragAttr = assigned ? '' : `draggable="true" ondragstart="dragJemaah(event,'${r.id}')"`;
      const plusBtn = assigned ? `<span class="text-[10px] text-slate-400">✓</span>` : `<button onclick="quickAssign('${r.id}')" class="w-6 h-6 rounded-full border border-slate-300 hover:bg-slate-900 hover:text-white text-[10px] font-bold">+</button>`;
      
      return `<div ${dragAttr} class="grid grid-cols-12 items-center px-3 py-2.5 text-xs border-b border-slate-50 last:border-0 ${rowCls}">
        <div class="col-span-1 flex items-center gap-1 text-slate-400"><i class="fa-solid fa-grip text-[10px]"></i> ${String(i+1).padStart(2,'0')}</div>
        <div class="col-span-7 font-semibold truncate" title="${name}">${name} ${assigned ? '<span class="ml-1 text-[9px] bg-slate-200 px-1 rounded">ASSIGNED</span>' : ''}</div>
        <div class="col-span-1 text-center"><span class="inline-flex w-7 justify-center px-1.5 py-0.5 rounded-full text-[10px] border font-bold ${isFB?'bg-emerald-50 text-emerald-700 border-emerald-200':'bg-slate-50 text-slate-400 border-slate-200'}">${isFB?'FB':'-'}</span></div>
        <div class="col-span-2 text-center"><span class="px-2 py-0.5 rounded-full text-[10px] border font-bold ${pakejCls}">${pakej}</span></div>
        <div class="col-span-1 text-center">${plusBtn}</div>
      </div>`;
    }).join('') || '<div class="p-8 text-center text-slate-400 text-xs">Tiada jemaah ditemui</div>';
  }catch(e){ console.error('renderNamelist error', e); cont.innerHTML = '<div class="p-4 text-xs text-red-500">Error: '+e.message+'</div>'; }
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
    grid.innerHTML = `<div class="col-span-2 p-12 text-center text-slate-400 text-xs border border-dashed rounded-2xl bg-white">Tiada bilik untuk <b>${activeLocation}</b>.<br><button onclick="openNewRoomModal()" class="mt-3 px-4 py-2 bg-slate-900 text-white rounded-full text-xs">+ Bilik Baru untuk ${activeLocation}</button></div>`;
    return;
  }

  grid.innerHTML = rooms.map(rec=>{
    const f = rec.fields;
    const roomId = f['Room ID / Nama Bilik']||'?';
    const pakej = f['PAKEJ / HOTEL']||'EKONOMI';
    const cap = f['KAPASITI']||roomingDefaultCap;
    const hotel = f['HOTEL NAME']||'';
    const note = f['CATATAN BILIK']||'';
    const staffRaw = f['STAFF / EXTRA']||'';
    const staffArr = staffRaw ? staffRaw.split(',').map(s=>s.trim()).filter(Boolean) : [];
    const jemaahIds = f['JEMAAH']||[];
    const countJ = jemaahIds.length;
    const countStaff = staffArr.length;
    const count = countJ + countStaff;
    const status = f['STATUS BILIK']|| (count===0?'🔴 Kosong': count<cap?'🟡 Ada Slot': count===cap?'🟢 Penuh':'⚠ Overbook!');
    const statusCls = status.includes('Kosong')?'bg-slate-100 text-slate-600': status.includes('Ada Slot')?'bg-amber-50 text-amber-700 border border-amber-200': status.includes('Penuh')?'bg-emerald-50 text-emerald-700 border border-emerald-200':'bg-red-50 text-red-700 border border-red-200';
    const pakejDot = pakej==='PREMIUM'?'bg-blue-500': pakej==='JIMAT'?'bg-amber-500':'bg-slate-500';
    const jemaahSlots = jemaahIds.map(jId=>{
      const jRec = allRoomingJemaah.find(j=>j.id===jId);
      const jName = jRec?.fields?.['NAMA']||jRec?.fields?.NAME||jId.slice(0,8);
      return `<div class="group flex items-center justify-between px-2.5 py-2.5 bg-slate-900 text-white rounded-xl text-[11px]"><span class="truncate font-medium">${jName}</span><button onclick="removeJemaahFromRoom('${rec.id}','${jId}')" class="ml-2 opacity-70 hover:opacity-100"><i class="fa-solid fa-xmark text-[10px]"></i></button></div>`;
    });
    const staffSlots = staffArr.map(s=>`<div class="group flex items-center justify-between px-2.5 py-2.5 bg-slate-800 text-white rounded-xl text-[11px] border border-slate-700"><span class="truncate font-medium">👤 ${s}</span><button onclick="removeStaff('${rec.id}','${s.replace(/'/g,"\\'")}')" class="ml-2 opacity-70 hover:opacity-100"><i class="fa-solid fa-xmark text-[10px]"></i></button></div>`);
    const filled = [...jemaahSlots, ...staffSlots];
    const emptyCount = Math.max(0, cap - filled.length);
    const emptySlots = Array.from({length:emptyCount}).map((_,i)=>`<div ondragover="allowDrop(event)" ondrop="dropJemaah(event,'${rec.id}')" class="px-2 py-2.5 border border-dashed border-slate-300 rounded-xl text-[11px] text-slate-400 text-center hover:border-slate-900 hover:text-slate-900 cursor-pointer">Slot Kosong ${filled.length + i + 1}</div>`);
    const slots = [...filled, ...emptySlots].join('');

    return `<div data-room-id="${rec.id}" ondragover="handleRoomDragOver(event)" ondragleave="handleRoomDragLeave(event)" ondrop="handleRoomDrop(event,'${rec.id}')" class="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm flex flex-col gap-2.5 h-fit group/room transition-all">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <button class="drag-handle w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-900 hover:text-white flex items-center justify-center cursor-grab active:cursor-grabbing shadow-sm" draggable="true" ondragstart="handleRoomDragStart(event,'${rec.id}')" ondragend="handleRoomDragEnd(event)" title="Drag untuk susun"><i class="fa-solid fa-grip-lines text-[11px]"></i></button>
          <span class="font-bold text-sm tracking-wide">${roomId}</span>
          <button onclick="editRoomId('${rec.id}')" class="text-slate-400 hover:text-slate-900"><i class="fa-solid fa-pen text-[11px]"></i></button>
          <span class="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold border">${pakej}</span>
        </div>
        <div class="flex items-center gap-1.5"><span class="px-2 py-1 rounded-full text-[10px] font-bold ${statusCls}">${status.replace('🔴','').replace('🟡','').replace('🟢','').replace('⚠','').trim() || 'Kosong'}</span><button onclick="deleteRoom('${rec.id}','${roomId}')" class="w-7 h-7 rounded-full bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 border"><i class="fa-solid fa-trash text-[11px]"></i></button></div>
      </div>
      <div class="flex items-center gap-2 text-xs">
        <div class="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 rounded-full border"><span class="w-2 h-2 rounded-full ${pakejDot}"></span><select onchange="updateRoomField('${rec.id}','PAKEJ / HOTEL',this.value)" class="bg-transparent text-[11px] font-bold outline-none cursor-pointer"><option ${pakej==='EKONOMI'?'selected':''}>EKONOMI</option><option ${pakej==='PREMIUM'?'selected':''}>PREMIUM</option><option ${pakej==='JIMAT'?'selected':''}>JIMAT</option></select></div>
        <div class="flex items-center gap-1 ml-auto bg-slate-50 rounded-full px-1 py-0.5 border"><button onclick="updateCap('${rec.id}',-1)" class="w-6 h-6 rounded-full bg-white border hover:bg-slate-100">−</button><span class="font-bold text-xs w-4 text-center">${cap}</span><button onclick="updateCap('${rec.id}',1)" class="w-6 h-6 rounded-full bg-white border hover:bg-slate-100">+</button><span class="text-[10px] text-slate-500 ml-1">${count}/${cap}</span></div>
      </div>
      <div class="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50/50 border border-amber-100 rounded-xl">
        <span class="text-[11px]">🏨</span><span class="text-[11px] font-medium flex-1 truncate">${hotel||'Tanpa Hotel'}</span><button onclick="editHotel('${rec.id}')" class="text-slate-400 hover:text-slate-900"><i class="fa-solid fa-pen text-[10px]"></i></button>
      </div>
      <div class="space-y-1.5">${slots}</div>
      <div class="pt-2 border-t border-slate-100 space-y-2">
        <div class="flex items-center justify-between"><span class="text-[10px] font-bold tracking-widest text-slate-600">STAFF / EXTRA (${countStaff}) • Drag staff dari kiri</span></div>
        <div class="flex items-start gap-1.5 text-[11px]"><i class="fa-regular fa-note-sticky mt-0.5 text-slate-400"></i><input id="note-${rec.id}" value="${note.replace(/"/g,'&quot;')}" onchange="updateRoomField('${rec.id}','CATATAN BILIK',this.value)" placeholder="+ Tambah catatan" class="flex-1 bg-transparent outline-none text-[11px] placeholder:text-slate-400"></div>
      </div>
      <div class="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div class="h-full bg-slate-900 transition-all" style="width:${cap>0?Math.min(100,(count/cap)*100):0}%"></div></div>
    </div>`;
  }).join('');
}

function setActiveLocation(loc){ activeLocation=loc.toUpperCase(); localStorage.setItem('effah_active_location', activeLocation); renderLocationTabs(); renderNamelist(); renderRoomingGrid(); }
function filterRoomingNamelist(){ renderNamelist(); }
function allowDrop(e){ e.preventDefault(); }
function dragJemaah(e,jId){ 
  if(isJemaahAssigned(jId)) { e.preventDefault(); return; }
  e.dataTransfer.setData('text/plain', jId); 
}
function dropJemaah(e,roomId){ 
  e.preventDefault(); 
  const staffId = e.dataTransfer.getData('text/staff-id');
  if(staffId){ assignStaffToRoom(staffId, roomId); return; }
  const jId = e.dataTransfer.getData('text/plain'); 
  if(jId){
    if(jId.startsWith('staff_')){ assignStaffToRoom(jId, roomId); return; }
    if(!isJemaahAssigned(jId)) assignJemaahToRoom(jId,roomId);
  }
}
function quickAssign(jId){
  if(isJemaahAssigned(jId)){ alert('Jemaah sudah assigned di bilik lain'); return; }
  let rooms = [...allRoomingRecords].filter(r=> (r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===activeLocation);
  if(rooms.length===0) rooms = [...allRoomingRecords];
  const target = rooms.find(r=> {
    const j = r.fields['JEMAAH']?.length||0;
    const s = (r.fields['STAFF / EXTRA']||'').split(',').filter(Boolean).length;
    const cap = r.fields['KAPASITI']||roomingDefaultCap;
    return (j+s) < cap;
  });
  if(target) assignJemaahToRoom(jId,target.id); else alert('Tiada slot kosong di ' + activeLocation);
}
async function assignJemaahToRoom(jId, roomId){
  if(isJemaahAssigned(jId)){ alert('Jemaah sudah ada di bilik lain'); return; }
  const rec = allRoomingRecords.find(r=>r.id===roomId);
  if(!rec) return;
  const cur = rec.fields['JEMAAH']||[];
  const staffCount = (rec.fields['STAFF / EXTRA']||'').split(',').filter(Boolean).length;
  if((cur.length + staffCount) >= (rec.fields['KAPASITI']||roomingDefaultCap) && !confirm('Bilik penuh, tambah overbook?')) return;
  const newList = [...cur, jId];
  await updateRoomField(roomId,'JEMAAH',newList,true);
}
async function removeJemaahFromRoom(roomId,jId){
  const rec = allRoomingRecords.find(r=>r.id===roomId);
  if(!rec) return;
  const newList = (rec.fields['JEMAAH']||[]).filter(id=>id!==jId);
  await updateRoomField(roomId,'JEMAAH',newList,true);
}
async function updateCap(roomId,delta){
  const rec = allRoomingRecords.find(r=>r.id===roomId);
  const newCap = Math.max(1, Math.min(8, (rec.fields['KAPASITI']||roomingDefaultCap)+delta));
  await updateRoomField(roomId,'KAPASITI',newCap,true);
}
async function updateRoomField(roomId, field, value, doRender=true){
  const base = window.AIRTABLE_BASE_ID || window.APP_CONFIG?.AIRTABLE_BASE_ID || localStorage.getItem('effah_api_base') || localStorage.getItem('effah_base_id');
  const pat = window.AIRTABLE_PAT || window.APP_CONFIG?.AIRTABLE_PAT || localStorage.getItem('effah_api_pat');
  if(!base || !pat){ alert('Airtable config missing'); return; }
  const url = `https://api.airtable.com/v0/${base}/ROOMING%20LIST/${roomId}`;
  try{
    await fetch(url,{method:'PATCH',headers:{Authorization:`Bearer ${pat}`,'Content-Type':'application/json'},body:JSON.stringify({fields:{[field]:value}})});
    const rec = allRoomingRecords.find(r=>r.id===roomId);
    if(rec) rec.fields[field]=value;
    if(doRender){ renderRoomingGrid(); renderNamelist(); renderLocationTabs(); }
  }catch(e){ console.error(e); alert('Gagal update: '+e.message); }
}
function editRoomId(roomId){ const nv = prompt('Room ID baru (contoh B4, M1):'); if(nv && nv.trim()) updateRoomField(roomId,'Room ID / Nama Bilik',nv.trim(),true); }
function editHotel(roomId){ const nv = prompt('Nama Hotel:'); if(nv!==null) updateRoomField(roomId,'HOTEL NAME',nv.trim(),true); }
function addStaff(roomId){
  const name = prompt('Nama Staff / Extra:'); if(!name || !name.trim()) return;
  const rec = allRoomingRecords.find(r=>r.id===roomId);
  const cur = (rec.fields['STAFF / EXTRA']||'').trim();
  const newVal = cur ? cur + ',' + name.trim() : name.trim();
  updateRoomField(roomId,'STAFF / EXTRA',newVal,true);
}
function removeStaff(roomId, staffName){
  const rec = allRoomingRecords.find(r=>r.id===roomId);
  const arr = (rec.fields['STAFF / EXTRA']||'').split(',').map(s=>s.trim()).filter(s=>s && s!==staffName);
  updateRoomField(roomId,'STAFF / EXTRA',arr.join(','),true);
}
async function deleteRoom(roomId, roomName){
  if(!confirm(`Padam bilik ${roomName}?`)) return;
  const base = window.AIRTABLE_BASE_ID || window.APP_CONFIG?.AIRTABLE_BASE_ID || localStorage.getItem('effah_api_base') || localStorage.getItem('effah_base_id');
  const pat = window.AIRTABLE_PAT || window.APP_CONFIG?.AIRTABLE_PAT || localStorage.getItem('effah_api_pat');
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
  const capInput = document.getElementById('newRoomCap');
  capInput.value = roomingDefaultCap;
  // Auto ID = B + capacity (user request)
  document.getElementById('newRoomId').value = `B${roomingDefaultCap}`;
  capInput.oninput = function(){
    const capVal = parseInt(this.value)||roomingDefaultCap;
    document.getElementById('newRoomId').value = `B${capVal}`;
  };
}
function closeNewRoomModal(){ document.getElementById('newRoomModal').classList.add('hidden'); }
async function submitNewRoom(){
  const roomId = document.getElementById('newRoomId').value.trim();
  const lokasi = document.getElementById('newRoomLokasi').value;
  const pakej = document.getElementById('newRoomPakej').value;
  const hotel = document.getElementById('newRoomHotel').value.trim();
  const cap = parseInt(document.getElementById('newRoomCap').value)||3;
  const note = document.getElementById('newRoomNote').value.trim();
  const tripId = window.selectedTripRecord?.id || localStorage.getItem('effah_active_trip_id') || localStorage.getItem('selectedTripId') || localStorage.getItem('effah_last_selected_trip');
  if(!roomId){ alert('Isi Room ID'); return; }
  if(!tripId){ alert('Pilih Trip dulu'); return; }
  const base = window.AIRTABLE_BASE_ID || window.APP_CONFIG?.AIRTABLE_BASE_ID || localStorage.getItem('effah_api_base') || localStorage.getItem('effah_base_id');
  const pat = window.AIRTABLE_PAT || window.APP_CONFIG?.AIRTABLE_PAT || localStorage.getItem('effah_api_pat');
  const payload = {fields:{'Room ID / Nama Bilik':roomId,'PAKEJ / HOTEL':pakej,'KAPASITI':cap,'HOTEL NAME':hotel||'','CATATAN BILIK':note||'','TRIP':[tripId],'LOKASI / CITY':lokasi,'SORT ORDER': allRoomingRecords.length+1}};
  try{
    const res = await fetch(`https://api.airtable.com/v0/${base}/ROOMING%20LIST`,{method:'POST',headers:{Authorization:`Bearer ${pat}`,'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const newRec = await res.json();
    if(newRec.id){ allRoomingRecords.push(newRec); closeNewRoomModal(); renderRoomingGrid(); renderLocationTabs(); document.getElementById('newRoomId').value=''; document.getElementById('newRoomHotel').value=''; document.getElementById('newRoomNote').value=''; }
    else { alert('Gagal cipta: ' + JSON.stringify(newRec)); }
  }catch(e){ alert('Error: '+e.message); }
}
function changeDefaultCap(d){ roomingDefaultCap = Math.max(1,Math.min(8,roomingDefaultCap+d)); const el=document.getElementById('defaultCapLabel'); if(el) el.textContent=roomingDefaultCap; }
async function autoAssignRooming(){
  if(!confirm('Auto assign semua jemaah Belum Assign ke '+activeLocation+'?')) return;
  let rooms = [...allRoomingRecords].filter(r=> (r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===activeLocation.toUpperCase());
  if(rooms.length===0) rooms = [...allRoomingRecords];
  rooms = getRoomOrderedList(rooms);
  const unassigned = allRoomingJemaah.filter(j=> !isJemaahAssigned(j.id));
  let idx=0;
  for(let room of rooms){
    const cap = room.fields['KAPASITI']||roomingDefaultCap;
    const staffCount = (room.fields['STAFF / EXTRA']||'').split(',').filter(Boolean).length;
    let cur = [...(room.fields['JEMAAH']||[])];
    while((cur.length + staffCount) < cap && idx < unassigned.length){ cur.push(unassigned[idx].id); idx++; }
    if(cur.length !== (room.fields['JEMAAH']||[]).length){
      await updateRoomField(room.id,'JEMAAH',cur,false);
    }
  }
  setTimeout(fetchRoomingData,800);
}
function openAddLocationModal(){
  const loc = prompt('Nama Lokasi baru (contoh: TAIF, JEDDAH):');
  if(loc && loc.trim()){
    const upper = loc.trim().toUpperCase();
    if(upper==='SEMUA' || upper==='TANPA LOKASI'){ alert('Nama lokasi tidak dibenarkan'); return; }
    if(['MEKAH','MADINAH','TAIF','JEDDAH'].includes(upper) || confirm(`Tambah lokasi baru "${upper}"?`)){
      if(!customLocations.includes(upper)) customLocations.push(upper);
      localStorage.setItem('effah_custom_locations', JSON.stringify(customLocations));
      activeLocation = upper;
      localStorage.setItem('effah_active_location', activeLocation);
      renderLocationTabs();
      renderRoomingGrid();
    }
  }
}
function deleteCustomLocation(loc){
  if(!confirm(`Padam lokasi ${loc}?`)) return;
  customLocations = customLocations.filter(l=>l!==loc);
  localStorage.setItem('effah_custom_locations', JSON.stringify(customLocations));
  if(activeLocation===loc) activeLocation='MEKAH';
  localStorage.setItem('effah_active_location', activeLocation);
  renderLocationTabs();
  renderRoomingGrid();
}


function generateRoomingPrint(){
  const tripName = document.getElementById('roomingTripName')?.textContent || cleanTripNameForRooming(window.selectedTripRecord?.fields?.Trip||'Trip');
  const loc = activeLocation;
  const rooms = [...allRoomingRecords].filter(r=> (r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===loc.toUpperCase());
  const ordered = getRoomOrderedList(rooms);
  
  // Build namelist table
  let namelistRows = allRoomingJemaah.map((j, idx)=>{
    const f = j.fields;
    const name = f['NAMA']||f['NAME']||'-';
    const ejen = f['EJEN']||f['Ejen']||'-';
    const fullboard = f['FULLBOARD']||f['BOARD']||'NO FULLBOARD';
    const train = f['TRAIN']||'-';
    const pakej = f['PAKEJ']||'EKONOMI';
    const insuran = f['INSURAN'] ? 'TAKAFUL' : '';
    return `<tr><td>${idx+1}</td><td>${name}</td><td>${ejen}</td><td>${fullboard}</td><td>${train}</td><td>${pakej}</td><td>${insuran}</td></tr>`;
  }).join('');
  
  let roomingCols = '';
  // Split rooms into columns of 4 per location for horizontal layout
  const roomBlocks = ordered.map(r=>{
    const f = r.fields;
    const rid = f['Room ID / Nama Bilik']||'?';
    const pakej = f['PAKEJ / HOTEL']||'EKONOMI';
    const hotel = f['HOTEL NAME']||'';
    const jIds = f['JEMAAH']||[];
    const staff = (f['STAFF / EXTRA']||'').split(',').filter(Boolean);
    const cap = f['KAPASITI']||3;
    let rows = jIds.map(jId=>{
      const rec = allRoomingJemaah.find(j=>j.id===jId);
      return `<div>${rec?.fields?.['NAMA']||jId.slice(0,8)}</div>`;
    }).join('');
    staff.forEach(s=>{ rows += `<div>NA ${s}</div>`; });
    return `<div style="margin-bottom:20px"><b>${rid} (${pakej}) - ${hotel}</b><div style="margin-left:10px">${rows}</div></div>`;
  }).join('');
  
  const html = `
  <html><head><title>Rooming List ${tripName}</title>
  <style>
  body{font-family:Arial, sans-serif; font-size:10px; margin:20px;}
  table{border-collapse:collapse; width:100%;}
  th,td{border:1px solid #000; padding:4px 6px; text-align:left; font-size:9px;}
  th{background:#f0f0f0; font-weight:bold;}
  .header{display:flex; justify-content:space-between; font-weight:bold; font-size:12px; margin-bottom:10px; border-bottom:2px solid #000; padding-bottom:5px;}
  .container{display:flex; gap:20px;}
  .left{width:65%;}
  .right{width:35%;}
  @media print{ @page{size:landscape;} }
  </style></head><body>
  <div class="header"><span>NAMELIST ${tripName}</span><span>ROOMING LIST ${tripName}</span></div>
  <div class="container">
    <div class="left"><table><tr><th>NO</th><th>NAMA JEMAAH</th><th>EJEN</th><th>FULLBOARD</th><th>TRAIN</th><th>PAKEJ</th><th>INSURAN</th></tr>${namelistRows}</table></div>
    <div class="right">${roomBlocks}</div>
  </div>
  <script>window.onload=function(){ window.print(); }</script>
  </body></html>
  `;
  const w = window.open('', '_blank');
  if(w){ w.document.write(html); w.document.close(); }
}


function getStaffStorageKey(){ const tripId = window.selectedTripRecord?.id || localStorage.getItem('effah_active_trip_id') || 'default'; return `effah_staff_list_${tripId}`; }
function loadStaffList(){
  const key = getStaffStorageKey();
  staffList = JSON.parse(localStorage.getItem(key)||'[]');
  renderStaffList();
}
function saveStaffList(){
  const key = getStaffStorageKey();
  localStorage.setItem(key, JSON.stringify(staffList));
  localStorage.setItem('effah_staff_list', JSON.stringify(staffList));
}
function addNewStaff(){
  const input = document.getElementById('newStaffInput');
  if(!input) return;
  let name = input.value.trim().toUpperCase();
  if(!name) return;
  // auto tag (EFFAH) if not already tagged
  if(!name.includes('(')){
    name = `${name} (EFFAH)`;
  }
  const id = `staff_${Date.now()}_${++staffIdCounter}`;
  localStorage.setItem('effah_staff_counter', staffIdCounter);
  staffList.push({id, name, assigned:false});
  saveStaffList();
  renderStaffList();
  input.value='';
}
function renderStaffList(){
  const cont = document.getElementById('staffListContainer');
  const badge = document.getElementById('staffTotalBadge');
  if(!cont) return;
  if(badge) badge.textContent = staffList.length + ' Staff';
  if(staffList.length===0){
    cont.innerHTML = '<div class="p-3 text-center text-[11px] text-slate-400">Tiada staff. Taip nama atas & Enter</div>';
    return;
  }
  cont.innerHTML = staffList.map((s, idx)=>{
    const assigned = isStaffAssigned(s.id);
    const cls = assigned ? 'opacity-40 bg-slate-50 pointer-events-none' : 'bg-white hover:bg-amber-50 cursor-grab';
    const drag = assigned ? '' : `draggable="true" ondragstart="dragStaff(event,'${s.id}')"`;
    return `<div ${drag} class="flex items-center justify-between px-3 py-2 rounded-xl border text-[11px] ${cls}">
      <div class="flex items-center gap-2"><span class="text-slate-400">${String(idx+1).padStart(2,'0')}</span><span class="font-bold">${s.name}</span>${assigned?'<span class="ml-1 px-1.5 py-0.5 bg-slate-200 rounded text-[9px]">ASSIGNED</span>':''}</div>
      <div class="flex gap-1"><button onclick="quickAssignStaff('${s.id}')" class="w-6 h-6 rounded-full border ${assigned?'opacity-30':'hover:bg-slate-900 hover:text-white'}">+</button><button onclick="deleteStaff('${s.id}')" class="w-6 h-6 rounded-full border hover:bg-red-50 hover:text-red-600"><i class="fa-solid fa-trash text-[9px]"></i></button></div>
    </div>`;
  }).join('');
}
function isStaffAssigned(staffId){
  return allRoomingRecords.some(r=>{
    const staffRaw = r.fields['STAFF / EXTRA']||'';
    return staffRaw.split(',').map(x=>x.trim()).includes(staffList.find(s=>s.id===staffId)?.name||'') || (r.fields['STAFF_IDS']||[]).includes(staffId);
  });
}
function deleteStaff(staffId){
  if(!confirm('Padam staff ini?')) return;
  staffList = staffList.filter(s=>s.id!==staffId);
  saveStaffList();
  renderStaffList();
}
function dragStaff(e, staffId){
  e.dataTransfer.setData('text/staff-id', staffId);
  e.dataTransfer.setData('text/plain', staffId);
}
function quickAssignStaff(staffId){
  const staff = staffList.find(s=>s.id===staffId);
  if(!staff) return;
  if(isStaffAssigned(staffId)){ alert('Staff sudah assigned'); return; }
  let rooms = [...allRoomingRecords].filter(r=> (r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===activeLocation);
  if(rooms.length===0) rooms = [...allRoomingRecords];
  const target = rooms.find(r=>{
    const j = r.fields['JEMAAH']?.length||0;
    const s = (r.fields['STAFF / EXTRA']||'').split(',').filter(Boolean).length;
    const cap = r.fields['KAPASITI']||roomingDefaultCap;
    return (j+s) < cap;
  });
  if(target) assignStaffToRoom(staffId, target.id); else alert('Tiada slot kosong');
}
async function assignStaffToRoom(staffId, roomId){
  const staff = staffList.find(s=>s.id===staffId);
  if(!staff) return;
  const rec = allRoomingRecords.find(r=>r.id===roomId);
  if(!rec) return;
  const cur = (rec.fields['STAFF / EXTRA']||'').trim();
  const newVal = cur ? cur + ',' + staff.name : staff.name;
  await updateRoomField(roomId,'STAFF / EXTRA',newVal,true);
}
