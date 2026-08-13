// ROOMING V11 - Fix Trip word, colors, copy rooms, print NA, placeholder, drag realtime
let allRoomingRecords = [];
let allRoomingJemaah = [];
let activeLocation = localStorage.getItem('effah_active_location') || 'MEKAH';
let roomingDefaultCap = 4;
let customLocations = JSON.parse(localStorage.getItem('effah_custom_locations')||'[]');
let staffList = [];
let staffIdCounter = parseInt(localStorage.getItem('effah_staff_counter')||'1000');

function cleanTripNameForRooming(name){
  if(!name) return '';
  if(typeof cleanTripName==='function') return cleanTripName(name);
  return name.replace(/^\s*\d+\/\d+\s*\|\s*/i, '').replace(/^\s*\d+\/\d+\s*/i,'').trim();
}

document.addEventListener('DOMContentLoaded', () => {
  if(document.getElementById('modul-rooming')) renderRoomingHTML();
});

function showRoomingLoading(){
  const grid = document.getElementById('roomingGrid');
  const list = document.getElementById('namelistContainer');
  const skeletonList = `<div class="p-4 space-y-3 animate-pulse"><div class="h-4 bg-slate-200 rounded w-3/4"></div><div class="space-y-2"><div class="h-8 bg-slate-100 rounded-xl"></div><div class="h-8 bg-slate-100 rounded-xl"></div><div class="h-8 bg-slate-100 rounded-xl"></div></div></div>`;
  const skeletonGrid = `<div class="col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-3"><div class="bg-white rounded-2xl border p-4 space-y-3 animate-pulse"><div class="h-5 bg-slate-200 rounded w-1/3"></div><div class="h-20 bg-slate-100 rounded-xl"></div></div><div class="bg-white rounded-2xl border p-4 space-y-3 animate-pulse"><div class="h-5 bg-slate-200 rounded w-1/3"></div><div class="h-20 bg-slate-100 rounded-xl"></div></div></div>`;
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
        <div id="namelistContainer" class="flex-1 overflow-y-auto max-h-[40vh] divide-y divide-slate-50"></div>
        <div class="border-t border-slate-200 bg-amber-50/30">
          <div class="p-3 flex items-center justify-between">
            <h4 class="font-extrabold text-[11px] tracking-widest text-slate-700">STAFF / EXTRA LIST</h4>
            <span id="staffTotalBadge" class="px-2.5 py-1 bg-slate-900 text-white rounded-full text-[11px] font-bold">0 Staff</span>
          </div>
          <div class="px-3 pb-3 flex gap-2">
            <input id="newStaffInput" placeholder="Taip nama staff" class="flex-1 text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none" onkeydown="if(event.key==='Enter'){ addNewStaff(); }">
            <button onclick="addNewStaff()" class="px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold">+ Add</button>
          </div>
          <div id="staffListContainer" class="px-2 pb-3 max-h-[25vh] overflow-y-auto space-y-1"></div>
        </div>
      </div>

      <div class="w-full xl:w-[48%] flex flex-col gap-3">
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-3">
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h3 id="roomingListHeader" class="font-extrabold text-[11px] tracking-widest">ROOMING LIST</h3>
              <div class="flex items-center gap-2 mt-1 text-[11px]">
                <span id="roomingBiliks" class="px-2.5 py-0.5 bg-slate-900 text-white rounded-full font-bold">0 Bilik</span>
                <span id="roomingOccupancy" class="text-slate-500">0 Jemaah + 0 Staff • ${activeLocation}</span>
              </div>
            </div>
            <div class="flex items-center gap-1.5 flex-wrap">
              <button onclick="generateRoomingPrint()" class="px-3 py-1.5 bg-white border border-slate-300 rounded-full text-xs font-bold hover:bg-slate-50"><i class="fa-solid fa-print mr-1"></i> Print / PDF</button>
              <button onclick="openCopyRoomsModal()" class="px-3 py-1.5 bg-white border border-slate-300 rounded-full text-xs font-bold hover:bg-slate-50"><i class="fa-solid fa-copy mr-1"></i> Copy Bilik</button>
              <button onclick="autoAssignRooming()" class="px-3 py-1.5 bg-slate-900 text-white rounded-full text-xs font-bold">Auto Assign</button>
              <button onclick="openNewRoomModal()" class="px-3 py-1.5 bg-white border rounded-full text-xs font-bold">+ Bilik Baru</button>
            </div>
          </div>
          <div id="roomingOverview" class="mt-3 p-3 bg-white border border-slate-200 rounded-xl"></div>
          <div id="locationTabs" class="flex flex-wrap gap-1.5 mt-3"></div>
        </div>
        <div id="roomingGrid" class="grid grid-cols-1 lg:grid-cols-2 gap-3 overflow-y-auto max-h-[78vh] pr-1 content-start"></div>
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
        <input id="newRoomHotel" placeholder="Hotel Name" class="w-full p-2.5 border rounded-xl">
        <div class="flex gap-2"><input id="newRoomCap" type="number" value="4" min="1" max="8" class="flex-1 p-2.5 border rounded-xl"><span class="py-2.5 text-slate-500">Kapasiti</span></div>
        <textarea id="newRoomNote" placeholder="Catatan bilik..." class="w-full p-2.5 border rounded-xl h-16"></textarea>
        <div class="flex gap-2 pt-2"><button onclick="closeNewRoomModal()" class="flex-1 py-2.5 bg-slate-100 rounded-xl font-bold">Batal</button><button onclick="submitNewRoom()" class="flex-1 py-2.5 bg-slate-900 text-white rounded-xl font-bold">Cipta Bilik</button></div>
      </div>
    </div>
  </div>

  <div id="copyRoomsModal" class="fixed inset-0 bg-black/50 z-50 hidden flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl">
      <h3 class="font-bold mb-2 text-sm">Copy Bilik dari Lokasi Lain</h3>
      <p class="text-[11px] text-slate-500 mb-4">Pilih lokasi sumber untuk copy ke <b id="copyTargetLoc">${activeLocation}</b></p>
      <div id="copySourceList" class="space-y-2 mb-4"></div>
      <div class="flex gap-2"><button onclick="closeCopyRoomsModal()" class="flex-1 py-2.5 bg-slate-100 rounded-xl font-bold text-xs">Batal</button><button onclick="executeCopyRooms()" class="flex-1 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs">Copy Sekarang</button></div>
    </div>
  </div>
  `;
  populateRoomingTripDropdown();
  renderLocationTabs();
  fetchRoomingData();
}

function getRoomOrderKey(){ const tripId = window.selectedTripRecord?.id || localStorage.getItem('effah_active_trip_id') || 'default'; return `effah_room_order_${tripId}_${activeLocation}`; }
function getRoomOrderedList(rooms){
  const key = getRoomOrderKey();
  const localOrder = JSON.parse(localStorage.getItem(key)||'[]');
  if(localOrder.length>0){
    const map = {}; rooms.forEach(r=>map[r.id]=r);
    const ordered = [];
    localOrder.forEach(id=>{ if(map[id]){ ordered.push(map[id]); delete map[id]; } });
    Object.values(map).forEach(r=>ordered.push(r));
    return ordered;
  }
  const sorted = [...rooms].sort((a,b)=>{
    const ao = a.fields['SORT ORDER']||9999;
    const bo = b.fields['SORT ORDER']||9999;
    return ao-bo;
  });
  return sorted;
}
function saveRoomOrder(ids){
  localStorage.setItem(getRoomOrderKey(), JSON.stringify(ids));
  const base = window.AIRTABLE_BASE_ID || localStorage.getItem('effah_api_base') || localStorage.getItem('effah_base_id');
  const pat = window.AIRTABLE_PAT || localStorage.getItem('effah_api_pat');
  if(base && pat){
    (async()=>{
      try{
        for(let i=0;i<ids.length;i++){
          await fetch(`https://api.airtable.com/v0/${base}/ROOMING%20LIST/${ids[i]}`,{
            method:'PATCH',
            headers:{Authorization:`Bearer ${pat}`,'Content-Type':'application/json'},
            body: JSON.stringify({fields:{'SORT ORDER': i+1}})
          });
        }
      }catch(e){ console.warn(e); }
    })();
  }
}


// Auto-scroll while dragging jemaah/staff
let autoScrollInterval = null;
function startAutoScroll(){
  if(autoScrollInterval) return;
  autoScrollInterval = setInterval(()=>{
    const grid = document.getElementById('roomingGrid');
    if(!grid) return;
    // will be driven by last mouse position
  }, 16);
}
function stopAutoScroll(){
  if(autoScrollInterval){ clearInterval(autoScrollInterval); autoScrollInterval=null; }
}
let lastMouseY = 0;
document.addEventListener('dragover', (e)=>{
  lastMouseY = e.clientY;
  const grid = document.getElementById('roomingGrid');
  if(!grid) return;
  const rect = grid.getBoundingClientRect();
  const threshold = 120;
  const speed = 12;
  if(e.clientY > rect.bottom - threshold){
    grid.scrollTop += speed;
    // also scroll window if near bottom
    if(window.innerHeight - e.clientY < 80) window.scrollBy(0, speed);
  } else if(e.clientY < rect.top + threshold){
    grid.scrollTop -= speed;
    if(e.clientY < 80) window.scrollBy(0, -speed);
  }
});
document.addEventListener('dragend', stopAutoScroll);
document.addEventListener('drop', stopAutoScroll);

let draggedRoomId = null;
function handleRoomDragStart(e, roomId){
  draggedRoomId = roomId;
  e.dataTransfer.effectAllowed='move';
  e.dataTransfer.setData('text/plain', roomId);
  startAutoScroll();
  const card = document.querySelector(`[data-room-id="${roomId}"]`);
  if(card) setTimeout(()=>{ card.style.opacity='0.4'; },0);
}
function handleRoomDragEnd(e){
  stopAutoScroll();
  const card = document.querySelector(`[data-room-id="${draggedRoomId}"]`);
  if(card) card.style.opacity='1';
  draggedRoomId=null;
  document.querySelectorAll('[data-room-id]').forEach(c=>c.classList.remove('ring-2','ring-blue-400'));
  document.querySelectorAll('[draggable="true"]').forEach(el=>el.style.opacity='1');
}
function handleRoomDragOver(e){ e.preventDefault(); const card=e.currentTarget; if(card&&card.dataset.roomId!==draggedRoomId) card.classList.add('ring-2','ring-blue-400'); }
function handleRoomDragLeave(e){ e.currentTarget.classList.remove('ring-2','ring-blue-400'); }
function handleRoomDrop(e, targetId){
  e.preventDefault();
  const fromId = draggedRoomId || e.dataTransfer.getData('text/plain');
  if(!fromId || fromId===targetId) return;
  const grid = document.getElementById('roomingGrid');
  const ids = Array.from(grid.querySelectorAll('[data-room-id]')).map(c=>c.dataset.roomId);
  const fromIdx = ids.indexOf(fromId);
  const toIdx = ids.indexOf(targetId);
  if(fromIdx>-1 && toIdx>-1){
    ids.splice(fromIdx,1);
    ids.splice(toIdx,0,fromId);
    saveRoomOrder(ids);
    // reorder in memory
    const loc = activeLocation.toUpperCase();
    const locRooms = allRoomingRecords.filter(r=> (r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===loc);
    const otherRooms = allRoomingRecords.filter(r=> (r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()!==loc);
    const map={}; locRooms.forEach(r=>map[r.id]=r);
    const reordered=[]; ids.forEach(id=>{ if(map[id]){ reordered.push(map[id]); delete map[id]; } }); Object.values(map).forEach(r=>reordered.push(r));
    allRoomingRecords=[...otherRooms, ...reordered];
    renderRoomingGrid();
  }
}

function renderRoomingOverview(rooms){
  const el = document.getElementById('roomingOverview');
  if(!el) return;
  if(rooms.length===0){ el.innerHTML='<span class="text-[11px] text-slate-400">Tiada bilik untuk '+activeLocation+'</span>'; return; }
  const capCount = {};
  rooms.forEach(r=>{ const cap=r.fields['KAPASITI']||4; capCount[cap]=(capCount[cap]||0)+1; });
  const sortedCaps = Object.keys(capCount).sort((a,b)=>a-b);
  let html = `<div class="space-y-1.5"><div class="font-extrabold text-[11px] tracking-widest">BILIK DI ${activeLocation} :</div><div class="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">`;
  sortedCaps.forEach(cap=>{ const count=capCount[cap]; html+=`<div class="flex justify-between"><span>B${cap} = ${count} BILIK</span><span class="text-slate-400">${count*cap} pax</span></div>`; });
  html+=`</div><div class="pt-1.5 mt-1.5 border-t font-bold flex justify-between text-[11px]"><span>TOTAL = ${rooms.length} BILIK</span><span>${rooms.reduce((s,r)=>s+(r.fields['KAPASITI']||0),0)} pax</span></div></div>`;
  const detailParts = rooms.map(r=>{
    const f=r.fields; const rid=f['Room ID / Nama Bilik']||'?'; const pakej=f['PAKEJ / HOTEL']||'EKONOMI'; const hotel=f['HOTEL NAME']?`(${f['HOTEL NAME']})`:''; const j=f['JEMAAH']?.length||0; const staff=(f['STAFF / EXTRA']||'').split(',').filter(Boolean).length; const cap=f['KAPASITI']||4; return `${rid} ${pakej} ${hotel} - ${j+staff}/${cap}`;
  });
  html+=`<div class="mt-2 pt-2 border-t border-dashed text-[10px] text-slate-500 leading-relaxed">${detailParts.join(' • ')}</div>`;
  el.innerHTML=html;
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
  let html = allLocs.map(loc=>{
    const label = loc==='MEKAH'?'🕋 MEKAH': loc==='MADINAH'?'🕌 MADINAH': loc==='TAIF'?'🏕️ TAIF': loc==='JEDDAH'?'🏙️ JEDDAH': '📍 '+loc;
    const c = counts[loc]||0;
    const active = loc===activeLocation;
    const cls = active ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 border';
    const isCustom = !['MEKAH','MADINAH','TAIF'].includes(loc);
    const delBtn = isCustom ? `<button onclick="event.stopPropagation(); deleteCustomLocation('${loc}')" class="ml-1 w-4 h-4 rounded-full bg-black/10 hover:bg-red-500 hover:text-white flex items-center justify-center text-[9px]">✕</button>` : '';
    return `<div class="inline-flex items-center ${active?'bg-slate-900 rounded-full':'bg-white rounded-full border'}"><button onclick="setActiveLocation('${loc}')" class="px-3 py-1 rounded-full text-[11px] font-bold ${active?'text-white':''}">${label} (${c})</button>${delBtn}</div>`;
  }).join('');
  html+=`<button onclick="openAddLocationModal()" class="px-3 py-1 rounded-full text-[11px] font-bold border-dashed border text-slate-500">+ Lokasi</button>`;
  container.innerHTML=html;
}

async function fetchRoomingData(){
  try{
    showRoomingLoading();
    populateRoomingTripDropdown();
    const tripId = window.selectedTripRecord?.id || localStorage.getItem('effah_active_trip_id') || localStorage.getItem('effah_last_selected_trip');
    if(!tripId) return;
    const base = window.AIRTABLE_BASE_ID || localStorage.getItem('effah_api_base') || localStorage.getItem('effah_base_id');
    const pat = window.AIRTABLE_PAT || localStorage.getItem('effah_api_pat');
    if(!base||!pat) return;
    let allRooms=[], allJems=[], offset='';
    do{ const res=await fetch(`https://api.airtable.com/v0/${base}/ROOMING%20LIST?pageSize=100${offset?`&offset=${offset}`:''}`,{headers:{Authorization:`Bearer ${pat}`}}); const data=await res.json(); if(data.records) allRooms=allRooms.concat(data.records); offset=data.offset||''; }while(offset);
    offset=''; do{ const res=await fetch(`https://api.airtable.com/v0/${base}/DATA%20JEMAAH%20UMRAH?pageSize=100${offset?`&offset=${offset}`:''}`,{headers:{Authorization:`Bearer ${pat}`}}); const data=await res.json(); if(data.records) allJems=allJems.concat(data.records); offset=data.offset||''; }while(offset);
    allRoomingRecords = allRooms.filter(r=> (r.fields['TRIP']||[]).includes(tripId));
    allRoomingJemaah = allJems.filter(r=> (r.fields['TRIP']||[]).includes(tripId));
    const baseSet=['MEKAH','MADINAH','TAIF','JEDDAH'];
    allRoomingRecords.forEach(r=>{ const l=(r.fields['LOKASI / CITY']||'').trim().toUpperCase(); if(l&&!baseSet.includes(l)&&!customLocations.includes(l)) customLocations.push(l); });
    if(customLocations.length>0) localStorage.setItem('effah_custom_locations', JSON.stringify(customLocations));
    const tripLabelRaw = window.selectedTripRecord?.fields?.Trip || 'Trip';
    const tripLabel = cleanTripNameForRooming(tripLabelRaw);
    const elTripName = document.getElementById('roomingListHeader'); if(elTripName) elTripName.textContent = tripLabel ? `ROOMING LIST ${tripLabel}` : 'ROOMING LIST';
    loadStaffList();
    renderNamelist();
    renderRoomingGrid();
    renderLocationTabs();
  }catch(e){ console.error(e); }
}

function populateRoomingTripDropdown(){
  const sel=document.getElementById('roomingTripSelect');
  if(!sel) return;
  let trips=[...(window.allTripUmrahRecords||[])];
  const currentId=window.selectedTripRecord?.id||localStorage.getItem('effah_active_trip_id')||'';
  if(trips.length===0){ sel.innerHTML='<option>Loading...</option>'; return; }
  trips.sort((a,b)=> (a.fields['Mula Pakej']||'').localeCompare(b.fields['Mula Pakej']||''));
  sel.innerHTML='<option value="">Pilih Trip...</option>'+trips.map(t=>{
    const raw=t.fields?.Trip||t.id; const clean=cleanTripNameForRooming(raw);
    return `<option value="${t.id}" ${t.id===currentId?'selected':''}>${clean}</option>`;
  }).join('');
}

function onRoomingTripChange(tripId){
  if(!tripId) return;
  showRoomingLoading();
  const found=(window.allTripUmrahRecords||[]).find(t=>t.id===tripId);
  if(found){ window.selectedTripRecord=found; localStorage.setItem('effah_active_trip_id', tripId); localStorage.setItem('effah_last_selected_trip', tripId); }
  setTimeout(()=>fetchRoomingData(),100);
}

function isJemaahAssigned(jId){ return allRoomingRecords.some(r=> (r.fields['JEMAAH']||[]).includes(jId)); }

function renderNamelist(){
  const cont=document.getElementById('namelistContainer');
  if(!cont) return;
  const q=(document.getElementById('searchRoomingJemaah')?.value||'').toLowerCase();
  const fPakej=document.getElementById('filterPakejRooming')?.value||'';
  let filtered=[...allRoomingJemaah];
  if(q) filtered=filtered.filter(r=> (r.fields['NAMA']||'').toLowerCase().includes(q));
  if(fPakej) filtered=filtered.filter(r=> (r.fields['PAKEJ']||'').includes(fPakej));
  const total=allRoomingJemaah.length;
  const belum= allRoomingJemaah.filter(r=>!isJemaahAssigned(r.id)).length;
  document.getElementById('totalJemaahBadge').textContent=total+' Total';
  document.getElementById('belumAssignBadge').textContent=belum+' Unassigned';
  document.getElementById('belumAssignTop').textContent=belum+' Unassigned';
  document.getElementById('assignedTop').textContent=(total-belum)+' Assigned';
  if(total===0){ cont.innerHTML='<div class="p-8 text-center text-xs text-slate-400">Tiada jemaah</div>'; return; }
  cont.innerHTML=filtered.map((r,i)=>{
    const f=r.fields; const name=f['NAMA']||'-'; const assigned=isJemaahAssigned(r.id);
    const board=(f['BOARD']||'').includes('FB')?'FB':'-';
    const pakej=f['PAKEJ']||'EKONOMI';
    const rowCls=assigned?'opacity-40 bg-slate-50 pointer-events-none':'hover:bg-slate-50 cursor-grab';
    const drag=assigned?'':`draggable="true" ondragstart="dragJemaah(event,'${r.id}')"`;
    const plus=assigned?'<span class="text-[10px] text-slate-400">✓</span>':`<button onclick="quickAssign('${r.id}')" class="w-6 h-6 rounded-full border hover:bg-slate-900 hover:text-white">+</button>`;
    return `<div ${drag} class="grid grid-cols-12 items-center px-3 py-2.5 text-xs border-b border-slate-50 ${rowCls}"><div class="col-span-1 text-slate-400">${String(i+1).padStart(2,'0')}</div><div class="col-span-7 font-semibold truncate">${name} ${assigned?'<span class="ml-1 text-[9px] bg-slate-200 px-1 rounded">ASSIGNED</span>':''}</div><div class="col-span-1 text-center"><span class="px-1.5 py-0.5 rounded-full border text-[10px]">${board}</span></div><div class="col-span-2 text-center"><span class="px-2 py-0.5 rounded-full border text-[10px]">${pakej}</span></div><div class="col-span-1 text-center">${plus}</div></div>`;
  }).join('');
}

function renderRoomingGrid(){
  const grid=document.getElementById('roomingGrid');
  if(!grid) return;
  let rooms=[...allRoomingRecords].filter(r=> (r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===activeLocation.toUpperCase());
  rooms=getRoomOrderedList(rooms);
  document.getElementById('roomingBiliks').textContent=rooms.length+' Bilik';
  const totalJ=rooms.reduce((s,r)=>s+(r.fields['JEMAAH']?.length||0),0);
  const totalStaff=rooms.reduce((s,r)=>s+(r.fields['STAFF / EXTRA']||'').split(',').filter(Boolean).length,0);
  document.getElementById('roomingOccupancy').textContent=`${totalJ} Jemaah + ${totalStaff} Staff • ${activeLocation}`;
  renderRoomingOverview(rooms);
  if(rooms.length===0){ grid.innerHTML=`<div class="col-span-2 p-12 text-center text-xs border border-dashed rounded-2xl bg-white">Tiada bilik untuk <b>${activeLocation}</b><br><button onclick="openNewRoomModal()" class="mt-3 px-4 py-2 bg-slate-900 text-white rounded-full text-xs">+ Bilik Baru</button></div>`; return; }
  grid.innerHTML=rooms.map(rec=>{
    const f=rec.fields; const roomId=f['Room ID / Nama Bilik']||'?'; const pakej=f['PAKEJ / HOTEL']||'EKONOMI'; const cap=f['KAPASITI']||4; const hotel=f['HOTEL NAME']||'Tanpa Hotel'; const note=f['CATATAN BILIK']||''; const staffRaw=f['STAFF / EXTRA']||''; const staffArr=staffRaw.split(',').filter(Boolean); const jIds=f['JEMAAH']||[]; const count=jIds.length+staffArr.length;
    const jSlots=jIds.map(jId=>{
      const jRec=allRoomingJemaah.find(j=>j.id===jId); const jName=jRec?.fields?.['NAMA']||'';
      return `<div class="flex items-center justify-between px-2.5 py-2.5 bg-[#0F172A] text-white rounded-xl text-[11px]"><span class="truncate">${jName}</span><button onclick="removeJemaahFromRoom('${rec.id}','${jId}')" class="ml-2 opacity-70">✕</button></div>`;
    }).join('');
    const sSlots=staffArr.map(s=>`<div class="flex items-center justify-between px-2.5 py-2.5 bg-[#800020] text-white rounded-xl text-[11px] border border-[#800020]"><span class="truncate">👤 ${s}</span><button onclick="removeStaff('${rec.id}','${s.replace(/'/g,"\\'")}')" class="ml-2 opacity-70">✕</button></div>`).join('');
    const emptyCount=Math.max(0,cap-(jIds.length+staffArr.length));
    const emptySlots=Array.from({length:emptyCount}).map((_,i)=>`<div ondragover="allowDrop(event)" ondrop="dropJemaah(event,'${rec.id}')" class="px-2 py-2.5 border border-dashed rounded-xl text-[11px] text-slate-400 text-center">Slot Kosong ${jIds.length+staffArr.length+i+1}</div>`).join('');
    return `<div data-room-id="${rec.id}" ondragover="handleRoomDragOver(event)" ondragleave="handleRoomDragLeave(event)" ondrop="handleRoomDrop(event,'${rec.id}')" class="bg-white rounded-2xl border p-3 shadow-sm flex flex-col gap-2.5">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2"><button class="drag-handle w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-900 hover:text-white flex items-center justify-center cursor-grab" draggable="true" ondragstart="handleRoomDragStart(event,'${rec.id}')" ondragend="handleRoomDragEnd(event)"><i class="fa-solid fa-grip-lines text-[11px]"></i></button><span class="font-bold text-sm">${roomId}</span><button onclick="editRoomId('${rec.id}')" class="text-slate-400"><i class="fa-solid fa-pen text-[10px]"></i></button><span class="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] border">${pakej}</span></div>
        <button onclick="deleteRoom('${rec.id}','${roomId}')" class="w-7 h-7 rounded-full bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 border"><i class="fa-solid fa-trash text-[11px]"></i></button>
      </div>
      <div class="flex items-center gap-2 text-xs"><div class="flex items-center gap-1 px-2.5 py-1 bg-slate-50 rounded-full border"><span class="w-2 h-2 rounded-full bg-slate-500"></span><select onchange="updateRoomField('${rec.id}','PAKEJ / HOTEL',this.value)" class="bg-transparent text-[11px] font-bold outline-none"><option ${pakej==='EKONOMI'?'selected':''}>EKONOMI</option><option ${pakej==='PREMIUM'?'selected':''}>PREMIUM</option><option ${pakej==='JIMAT'?'selected':''}>JIMAT</option></select></div><div class="ml-auto flex items-center gap-1 bg-slate-50 rounded-full px-1 py-0.5 border"><button onclick="updateCap('${rec.id}',-1)" class="w-6 h-6 rounded-full bg-white border">−</button><span class="font-bold w-4 text-center">${cap}</span><button onclick="updateCap('${rec.id}',1)" class="w-6 h-6 rounded-full bg-white border">+</button><span class="text-[10px] ml-1">${count}/${cap}</span></div></div>
      <div class="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50/50 border rounded-xl"><span class="text-[11px]">🏨</span><span class="text-[11px] flex-1 truncate">${hotel}</span><button onclick="editHotel('${rec.id}')" class="text-slate-400"><i class="fa-solid fa-pen text-[10px]"></i></button></div>
      <div class="space-y-1.5">${jSlots}${sSlots}${emptySlots}</div>
      <div class="pt-2 border-t space-y-2"><div class="flex justify-between text-[10px] font-bold text-slate-600"><span>STAFF / EXTRA (${staffArr.length}) • Drag staff dari kiri</span></div><div class="flex gap-1.5 text-[11px]"><i class="fa-regular fa-note-sticky mt-0.5 text-slate-400"></i><input value="${note.replace(/"/g,'&quot;')}" onchange="updateRoomField('${rec.id}','CATATAN BILIK',this.value)" placeholder="+ Tambah catatan" class="flex-1 bg-transparent outline-none"></div></div>
      <div class="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div class="h-full bg-slate-900" style="width:${Math.min(100,(count/cap)*100)}%"></div></div>
    </div>`;
  }).join('');
}

function setActiveLocation(loc){ activeLocation=loc.toUpperCase(); localStorage.setItem('effah_active_location', activeLocation); document.getElementById('copyTargetLoc').textContent=activeLocation; renderLocationTabs(); renderRoomingGrid(); }
function filterRoomingNamelist(){ renderNamelist(); }
function allowDrop(e){ e.preventDefault(); }
function dragJemaah(e,jId){ 
  if(isJemaahAssigned(jId)) return; 
  e.dataTransfer.effectAllowed='move';
  e.dataTransfer.setData('text/plain', jId); 
  startAutoScroll();
  const row = e.currentTarget;
  if(row){ setTimeout(()=>{ row.style.opacity='0.3'; },0); }
}

function dropJemaah(e,roomId){
  e.preventDefault();
  stopAutoScroll();
  // clear all drag opacities
  document.querySelectorAll('[draggable="true"]').forEach(el=>el.style.opacity='1');
  const staffId=e.dataTransfer.getData('text/staff-id');
  if(staffId){ assignStaffToRoom(staffId, roomId); return; }
  const jId=e.dataTransfer.getData('text/plain');
  if(!jId) return;
  if(jId.startsWith('staff_')){ assignStaffToRoom(jId, roomId); return; }
  if(!isJemaahAssigned(jId)) assignJemaahToRoom(jId, roomId);
}
function quickAssign(jId){ if(isJemaahAssigned(jId)) return; let rooms=allRoomingRecords.filter(r=> (r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===activeLocation); const target=rooms.find(r=>{ const j=r.fields['JEMAAH']?.length||0; const s=(r.fields['STAFF / EXTRA']||'').split(',').filter(Boolean).length; return (j+s)<(r.fields['KAPASITI']||4); }); if(target) assignJemaahToRoom(jId,target.id); }
async function assignJemaahToRoom(jId, roomId){
  if(isJemaahAssigned(jId)) return;
  const rec=allRoomingRecords.find(r=>r.id===roomId); if(!rec) return;
  const newList=[...(rec.fields['JEMAAH']||[]), jId];
  await updateRoomField(roomId,'JEMAAH',newList,true);
}
async function removeJemaahFromRoom(roomId,jId){
  const rec=allRoomingRecords.find(r=>r.id===roomId); const newList=(rec.fields['JEMAAH']||[]).filter(id=>id!==jId); await updateRoomField(roomId,'JEMAAH',newList,true);
}
async function updateCap(roomId,delta){
  const rec=allRoomingRecords.find(r=>r.id===roomId); const newCap=Math.max(1,Math.min(8,(rec.fields['KAPASITI']||4)+delta)); await updateRoomField(roomId,'KAPASITI',newCap,true);
}
async function updateRoomField(roomId, field, value, doRender=true){
  const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base')||localStorage.getItem('effah_base_id'); const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
  try{
    await fetch(`https://api.airtable.com/v0/${base}/ROOMING%20LIST/${roomId}`,{method:'PATCH',headers:{Authorization:`Bearer ${pat}`,'Content-Type':'application/json'},body:JSON.stringify({fields:{[field]:value}})});
    const rec=allRoomingRecords.find(r=>r.id===roomId); if(rec) rec.fields[field]=value;
    if(doRender){ renderRoomingGrid(); renderNamelist(); renderLocationTabs(); renderStaffList(); }
  }catch(e){ console.error(e); }
}
function editRoomId(roomId){ const nv=prompt('Room ID baru:'); if(nv&&nv.trim()) updateRoomField(roomId,'Room ID / Nama Bilik',nv.trim(),true); }
function editHotel(roomId){ const nv=prompt('Nama Hotel:'); if(nv!==null) updateRoomField(roomId,'HOTEL NAME',nv.trim(),true); }
async function deleteRoom(roomId, roomName){
  if(!confirm(`Padam ${roomName}?`)) return;
  const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base'); const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
  await fetch(`https://api.airtable.com/v0/${base}/ROOMING%20LIST/${roomId}`,{method:'DELETE',headers:{Authorization:`Bearer ${pat}`}});
  allRoomingRecords=allRoomingRecords.filter(r=>r.id!==roomId); renderRoomingGrid(); renderLocationTabs();
}
function openNewRoomModal(){ document.getElementById('newRoomModal').classList.remove('hidden'); document.getElementById('newRoomLokasi').value=activeLocation; document.getElementById('newRoomCap').value=roomingDefaultCap; document.getElementById('newRoomId').value=`B${roomingDefaultCap}`; document.getElementById('newRoomCap').oninput=function(){ document.getElementById('newRoomId').value=`B${this.value||4}`; }; }
function closeNewRoomModal(){ document.getElementById('newRoomModal').classList.add('hidden'); }
async function submitNewRoom(){
  const roomId=document.getElementById('newRoomId').value.trim(); const lokasi=document.getElementById('newRoomLokasi').value; const pakej=document.getElementById('newRoomPakej').value; const hotel=document.getElementById('newRoomHotel').value.trim(); const cap=parseInt(document.getElementById('newRoomCap').value)||4; const note=document.getElementById('newRoomNote').value.trim(); const tripId=localStorage.getItem('effah_active_trip_id'); if(!roomId||!tripId) return;
  const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base'); const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
  const payload={fields:{'Room ID / Nama Bilik':roomId,'PAKEJ / HOTEL':pakej,'KAPASITI':cap,'HOTEL NAME':hotel,'CATATAN BILIK':note,'TRIP':[tripId],'LOKASI / CITY':lokasi,'SORT ORDER':allRoomingRecords.length+1}};
  const res=await fetch(`https://api.airtable.com/v0/${base}/ROOMING%20LIST`,{method:'POST',headers:{Authorization:`Bearer ${pat}`,'Content-Type':'application/json'},body:JSON.stringify(payload)}); const newRec=await res.json(); if(newRec.id){ allRoomingRecords.push(newRec); closeNewRoomModal(); renderRoomingGrid(); renderLocationTabs(); }
}
function changeDefaultCap(d){ roomingDefaultCap=Math.max(1,Math.min(8,roomingDefaultCap+d)); }
async function autoAssignRooming(){
  if(!confirm('Auto assign ke '+activeLocation+'?')) return;
  let rooms=allRoomingRecords.filter(r=> (r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===activeLocation); rooms=getRoomOrderedList(rooms);
  const unassigned=allRoomingJemaah.filter(j=>!isJemaahAssigned(j.id)); let idx=0;
  for(let room of rooms){ const cap=room.fields['KAPASITI']||4; const staff=(room.fields['STAFF / EXTRA']||'').split(',').filter(Boolean).length; let cur=[...(room.fields['JEMAAH']||[])]; while((cur.length+staff)<cap && idx<unassigned.length){ cur.push(unassigned[idx].id); idx++; } if(cur.length!==(room.fields['JEMAAH']||[]).length) await updateRoomField(room.id,'JEMAAH',cur,false); }
  setTimeout(fetchRoomingData,600);
}
function openAddLocationModal(){
  const loc=prompt('Nama Lokasi baru:'); if(loc&&loc.trim()){ const upper=loc.trim().toUpperCase(); if(!customLocations.includes(upper)) customLocations.push(upper); localStorage.setItem('effah_custom_locations', JSON.stringify(customLocations)); activeLocation=upper; localStorage.setItem('effah_active_location', activeLocation); renderLocationTabs(); renderRoomingGrid(); }
}
function deleteCustomLocation(loc){ if(!confirm('Padam '+loc+'?')) return; customLocations=customLocations.filter(l=>l!==loc); localStorage.setItem('effah_custom_locations', JSON.stringify(customLocations)); if(activeLocation===loc) activeLocation='MEKAH'; renderLocationTabs(); renderRoomingGrid(); }

// COPY ROOMS FEATURE
let copySourceLoc = null;
function openCopyRoomsModal(){
  const modal=document.getElementById('copyRoomsModal'); if(!modal) return;
  const list=document.getElementById('copySourceList');
  const allLocs=['MEKAH','MADINAH','TAIF',...customLocations].filter(l=>l!==activeLocation);
  const counts={}; allRoomingRecords.forEach(r=>{ const l=(r.fields['LOKASI / CITY']||'MEKAH').toUpperCase(); counts[l]=(counts[l]||0)+1; });
  list.innerHTML=allLocs.map(loc=>{
    const c=counts[loc]||0;
    return `<label class="flex items-center gap-2 p-2 border rounded-xl cursor-pointer hover:bg-slate-50"><input type="radio" name="copySource" value="${loc}"><span class="text-xs font-bold">${loc} (${c} bilik)</span></label>`;
  }).join('') || '<div class="text-xs text-slate-400">Tiada lokasi lain</div>';
  document.getElementById('copyTargetLoc').textContent=activeLocation;
  modal.classList.remove('hidden');
}
function closeCopyRoomsModal(){ document.getElementById('copyRoomsModal').classList.add('hidden'); }
async function executeCopyRooms(){
  const selected=document.querySelector('input[name="copySource"]:checked');
  if(!selected){ alert('Pilih lokasi sumber'); return; }
  const src=selected.value;
  const srcRooms=allRoomingRecords.filter(r=> (r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===src);
  if(srcRooms.length===0){ alert('Tiada bilik di '+src); return; }
  if(!confirm(`Copy ${srcRooms.length} bilik dari ${src} ke ${activeLocation}?`)) return;
  const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base'); const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat'); const tripId=localStorage.getItem('effah_active_trip_id');
  for(let r of srcRooms){
    const f=r.fields;
    const payload={fields:{'Room ID / Nama Bilik':f['Room ID / Nama Bilik'],'PAKEJ / HOTEL':f['PAKEJ / HOTEL']||'EKONOMI','KAPASITI':f['KAPASITI']||4,'HOTEL NAME':f['HOTEL NAME']||'','CATATAN BILIK':f['CATATAN BILIK']||'','TRIP':[tripId],'LOKASI / CITY':activeLocation,'SORT ORDER':allRoomingRecords.length+1}};
    try{
      const res=await fetch(`https://api.airtable.com/v0/${base}/ROOMING%20LIST`,{method:'POST',headers:{Authorization:`Bearer ${pat}`,'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const newRec=await res.json(); if(newRec.id) allRoomingRecords.push(newRec);
    }catch(e){ console.error(e); }
  }
  closeCopyRoomsModal(); renderRoomingGrid(); renderLocationTabs();
}

function getStaffStorageKey(){ const tripId=localStorage.getItem('effah_active_trip_id')||'default'; return `effah_staff_list_${tripId}`; }
function loadStaffList(){ const key=getStaffStorageKey(); staffList=JSON.parse(localStorage.getItem(key)||'[]'); renderStaffList(); }
function saveStaffList(){ const key=getStaffStorageKey(); localStorage.setItem(key, JSON.stringify(staffList)); }
function addNewStaff(){
  const input=document.getElementById('newStaffInput'); if(!input) return; let name=input.value.trim().toUpperCase(); if(!name) return;
  if(!name.includes('(')) name=`${name} (EFFAH)`;
  const id=`staff_${Date.now()}_${++staffIdCounter}`; localStorage.setItem('effah_staff_counter', staffIdCounter);
  staffList.push({id,name}); saveStaffList(); renderStaffList(); input.value='';
}
function renderStaffList(){
  const cont=document.getElementById('staffListContainer'); const badge=document.getElementById('staffTotalBadge');
  if(!cont) return; if(badge) badge.textContent=staffList.length+' Staff';
  if(staffList.length===0){ cont.innerHTML='<div class="p-3 text-center text-[11px] text-slate-400">Tiada staff</div>'; return; }
  cont.innerHTML=staffList.map((s,idx)=>{
    const assigned=isStaffAssigned(s.id);
    const cls=assigned?'opacity-40 bg-slate-50 pointer-events-none':'bg-white hover:bg-amber-50 cursor-grab';
    const drag=assigned?'':`draggable="true" ondragstart="dragStaff(event,'${s.id}')"`;
    return `<div ${drag} class="flex items-center justify-between px-3 py-2 rounded-xl border text-[11px] ${cls}"><div class="flex gap-2"><span class="text-slate-400">${String(idx+1).padStart(2,'0')}</span><span class="font-bold">${s.name}</span>${assigned?'<span class="ml-1 px-1.5 py-0.5 bg-slate-200 rounded text-[9px]">ASSIGNED</span>':''}</div><div class="flex gap-1"><button onclick="quickAssignStaff('${s.id}')" class="w-6 h-6 rounded-full border ${assigned?'opacity-30':'hover:bg-slate-900 hover:text-white'}">+</button><button onclick="deleteStaff('${s.id}')" class="w-6 h-6 rounded-full border hover:bg-red-50"><i class="fa-solid fa-trash text-[9px]"></i></button></div></div>`;
  }).join('');
}
function isStaffAssigned(staffId){
  const s=staffList.find(x=>x.id===staffId); if(!s) return false;
  return allRoomingRecords.some(r=> (r.fields['STAFF / EXTRA']||'').split(',').map(x=>x.trim()).includes(s.name));
}
function deleteStaff(staffId){ if(!confirm('Padam?')) return; staffList=staffList.filter(s=>s.id!==staffId); saveStaffList(); renderStaffList(); }
function dragStaff(e, staffId){ 
  e.dataTransfer.effectAllowed='move';
  e.dataTransfer.setData('text/staff-id', staffId); 
  e.dataTransfer.setData('text/plain', staffId); 
  startAutoScroll();
  const row = e.currentTarget;
  if(row){ setTimeout(()=>{ row.style.opacity='0.3'; },0); }
}
function quickAssignStaff(staffId){ const rooms=allRoomingRecords.filter(r=> (r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===activeLocation); const target=rooms.find(r=>{ const j=r.fields['JEMAAH']?.length||0; const s=(r.fields['STAFF / EXTRA']||'').split(',').filter(Boolean).length; return (j+s)<(r.fields['KAPASITI']||4); }); if(target) assignStaffToRoom(staffId,target.id); }
async function assignStaffToRoom(staffId, roomId){
  const staff=staffList.find(s=>s.id===staffId); if(!staff) return;
  const rec=allRoomingRecords.find(r=>r.id===roomId); if(!rec) return;
  const cur=(rec.fields['STAFF / EXTRA']||'').trim(); const newVal=cur?cur+','+staff.name:staff.name;
  await updateRoomField(roomId,'STAFF / EXTRA',newVal,true);
}
function removeStaff(roomId, staffName){
  const rec=allRoomingRecords.find(r=>r.id===roomId); const arr=(rec.fields['STAFF / EXTRA']||'').split(',').map(s=>s.trim()).filter(s=>s&&s!==staffName); updateRoomField(roomId,'STAFF / EXTRA',arr.join(','),true);
}
function generateRoomingPrint(){
  const tripNameRaw=window.selectedTripRecord?.fields?.Trip||document.getElementById('roomingTripSelect')?.selectedOptions[0]?.text||'Trip';
  const tripName=cleanTripNameForRooming(tripNameRaw);
  const rooms=getRoomOrderedList([...allRoomingRecords].filter(r=> (r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===activeLocation.toUpperCase()));
  let namelistRows=allRoomingJemaah.map((j,idx)=>{
    const name=j.fields['NAMA']||'-'; const ejen=j.fields['EJEN']||'-'; const board=j.fields['BOARD']||'NO FULLBOARD'; const pakej=j.fields['PAKEJ']||'EKONOMI';
    return `<tr><td>${idx+1}</td><td>${name}</td><td>${ejen}</td><td>${board}</td><td>-</td><td>${pakej}</td><td></td></tr>`;
  }).join('');
  const staffInRooms=[]; rooms.forEach(r=> (r.fields['STAFF / EXTRA']||'').split(',').filter(Boolean).forEach(s=>{ if(!staffInRooms.includes(s)) staffInRooms.push(s); }));
  staffInRooms.forEach((sName,idx)=>{
    const cleanName=sName.replace(/\\(EFFAH\\)/i,'').trim();
    namelistRows+=`<tr><td>NA</td><td>${cleanName} (EFFAH)</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>`;
  });
  const roomBlocks=rooms.map(r=>{
    const f=r.fields; const rid=f['Room ID / Nama Bilik']||'?'; const pakej=f['PAKEJ / HOTEL']||'EKONOMI'; const hotel=f['HOTEL NAME']||''; const jIds=f['JEMAAH']||[]; const staff=(f['STAFF / EXTRA']||'').split(',').filter(Boolean);
    let rows=jIds.map((jId,idx)=>{
      const rec=allRoomingJemaah.find(j=>j.id===jId); const name=rec?.fields?.['NAMA']||'';
      return name?`<div>${idx+1}. ${name}</div>`:'';
    }).filter(Boolean).join('');
    staff.forEach((s,i)=>{ const clean=s.replace(/\\(EFFAH\\)/i,'').trim(); rows+=`<div>${jIds.length+i+1}. NA ${clean} (EFFAH)</div>`; });
    return `<div style="margin-bottom:18px"><b>${rid} (${pakej}) - ${hotel}</b><div style="margin-left:8px; margin-top:4px; line-height:1.6">${rows||'- Kosong -'}</div></div>`;
  }).join('');
  const html=`<html><head><title>Rooming ${tripName}</title><style>body{font-family:Arial;font-size:10px;margin:15px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #000;padding:3px 5px;font-size:9px}th{background:#eee} .header{display:flex;justify-content:space-between;font-weight:bold;font-size:13px;border-bottom:2px solid #000;padding-bottom:6px;margin-bottom:12px} .container{display:flex;gap:15px} .left{width:68%} .right{width:32%;border-left:1px solid #000;padding-left:10px} @media print{ @page{size:A4 landscape; margin:10mm} }</style></head><body><div class="header"><span>NAMELIST ${tripName}</span><span>ROOMING LIST ${tripName}</span></div><div class="container"><div class="left"><table><tr><th>NO</th><th>NAMA JEMAAH</th><th>EJEN</th><th>FULLBOARD</th><th>TRAIN</th><th>PAKEJ</th><th>INSURAN</th></tr>${namelistRows}</table></div><div class="right">${roomBlocks}</div></div><script>window.onload=function(){setTimeout(()=>window.print(),300)}</script></body></html>`;
  const w=window.open('','_blank'); if(w){ w.document.write(html); w.document.close(); }
}
