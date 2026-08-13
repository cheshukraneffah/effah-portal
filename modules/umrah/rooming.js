// ROOMING V12 FINAL - FIX layout ke bawah + blank - + +Lokasi light grey + light colors + soft maroon
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
  let c = name.replace(/^\s*\d+\/\d+\s*\|\s*/i, '').replace(/^\s*\d+\/\d+\s*/i,'').trim();
  if(c.toLowerCase()==='trip' || c.toLowerCase()==='pilih trip...') return '';
  return c;
}
function getJemaahName(f){
  if(!f) return '-';
  return f['NAMA'] || f['NAME'] || f['NAMA JEMAAH'] || f['NAMA PENUH'] || f['Name'] || '-';
}

document.addEventListener('DOMContentLoaded', () => {
  if(document.getElementById('modul-rooming')) renderRoomingHTML();
});

function showRoomingLoading(){
  const grid = document.getElementById('roomingGrid');
  const list = document.getElementById('namelistContainer');
  const skeletonList = `<div class="p-4 space-y-3 animate-pulse"><div class="h-4 bg-slate-200 rounded w-3/4"></div><div class="space-y-2"><div class="h-8 bg-slate-100 rounded-xl"></div></div></div>`;
  const skeletonGrid = `<div class="col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-3"><div class="bg-white rounded-2xl border p-4 space-y-3 animate-pulse"><div class="h-5 bg-slate-200 rounded w-1/3"></div><div class="h-20 bg-slate-100 rounded-xl"></div></div></div>`;
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
        <select id="roomingTripSelect" onchange="onRoomingTripChange(this.value)" class="px-3 py-1.5 border border-slate-300 rounded-full bg-white text-xs font-bold min-w- max-w- truncate">
          <option value="">Pilih Trip...</option>
        </select>
        <span id="roomingHeaderCount" class="text-slate-500 text-">0 Bilik</span>
      </div>
      <div class="flex items-center gap-2 text-xs">
        <span id="belumAssignTop" class="px-2.5 py-1 bg-amber-100 rounded-full font-bold">0 Unassigned</span>
        <span id="assignedTop" class="px-2.5 py-1 bg-emerald-50 rounded-full font-bold">0 Assigned</span>
        <button onclick="fetchRoomingData()" class="w-7 h-7 rounded-full border bg-white hover:bg-slate-50"><i class="fa-solid fa-rotate"></i></button>
      </div>
    </div>

    <!-- FIX: lg:flex-row bukan xl, biar side-by-side terus -->
    <div class="flex flex-col lg:flex-row gap-3">
      <div class="w-full lg:w-[52%] bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        <div class="p-3 border-b">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-extrabold text- tracking-[0.15em] text-slate-700">NAMELIST JEMAAH</h3>
            <div class="flex gap-1.5">
              <span id="belumAssignBadge" class="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text- font-bold">0 Unassigned</span>
              <span id="totalJemaahBadge" class="px-2.5 py-1 bg-slate-100 border text-slate-700 rounded-full text- font-bold">0 Total</span>
            </div>
          </div>
          <div class="flex gap-2">
            <div class="relative flex-1">
              <i class="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400 text-xs"></i>
              <input id="searchRoomingJemaah" onkeyup="filterRoomingNamelist()" placeholder="Cari nama jemaah..." class="w-full text-xs pl-8 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none">
            </div>
            <select id="filterPakejRooming" onchange="filterRoomingNamelist()" class="text-xs border border-slate-200 rounded-xl px-3 py-2.5 bg-white font-medium"><option value="">Semua Pakej</option><option>EKONOMI</option><option>PREMIUM</option><option>JIMAT</option></select>
          </div>
        <div class="px-3 py-2 bg-slate-50/70 border-b grid grid-cols-12 text- font-bold text-slate-500 tracking-wider">
          <div class="col-span-1">NO</div><div class="col-span-7">NAMA JEMAAH</div><div class="col-span-1 text-center">BOARD</div><div class="col-span-2 text-center">PAKEJ</div><div class="col-span-1 text-center">+</div>
        </div>
        <div id="namelistContainer" class="flex-1 overflow-y-auto max-h- divide-y divide-slate-50"></div>
        <div class="border-t border-slate-200 bg-slate-50/50">
          <div class="p-3 flex items-center justify-between">
            <h4 class="font-extrabold text- tracking-widest text-slate-700">STAFF / EXTRA LIST</h4>
            <span id="staffTotalBadge" class="px-2.5 py-1 bg-slate-100 border text-slate-700 rounded-full text- font-bold">0 Staff</span>
          </div>
          <div class="px-3 pb-3 flex gap-2">
            <input id="newStaffInput" placeholder="Taip nama staff" class="flex-1 text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none" onkeydown="if(event.key==='Enter'){ addNewStaff(); }">
            <button onclick="addNewStaff()" class="px-3 py-2 bg-slate-100 border text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200">+ Add</button>
          </div>
          <div id="staffListContainer" class="px-2 pb-3 max-h- overflow-y-auto space-y-1"></div>
        </div>
      </div>

      <div class="w-full lg:w-[48%] flex flex-col gap-3">
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-3">
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h3 id="roomingListHeader" class="font-extrabold text- tracking-widest">ROOMING LIST</h3>
              <div class="flex items-center gap-2 mt-1 text-">
                <span id="roomingBiliks" class="px-2.5 py-0.5 bg-slate-100 border text-slate-700 rounded-full font-bold">0 Bilik</span>
                <span id="roomingOccupancy" class="text-slate-500">0 Jemaah + 0 Staff • ${activeLocation}</span>
              </div>
            </div>
            <div class="flex items-center gap-1.5 flex-wrap">
              <button onclick="generateRoomingPrint()" class="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-bold hover:bg-slate-50">Print / PDF</button>
              <button onclick="openCopyRoomsModal()" class="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-bold hover:bg-slate-50">Copy Bilik</button>
              <button onclick="autoAssignRooming()" class="px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-full text-xs font-bold hover:bg-slate-200">Auto Assign</button>
              <button onclick="openNewRoomModal()" class="px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-full text-xs font-bold hover:bg-slate-200">+ Bilik Baru</button>
            </div>
          <div id="roomingOverview" class="mt-3 p-3 bg-white border border-slate-200 rounded-xl"></div>
          <div id="locationTabs" class="flex flex-wrap gap-1.5 mt-3"></div>
        </div>
        <div id="roomingGrid" class="grid grid-cols-1 lg:grid-cols-2 gap-3 overflow-y-auto max-h- pr-1 content-start"></div>
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
        <div class="flex gap-2 pt-2"><button onclick="closeNewRoomModal()" class="flex-1 py-2.5 bg-slate-100 border rounded-xl font-bold">Batal</button><button onclick="submitNewRoom()" class="flex-1 py-2.5 bg-slate-100 border text-slate-700 rounded-xl font-bold hover:bg-slate-200">Cipta Bilik</button></div>
      </div>
    </div>
  </div>

  <div id="copyRoomsModal" class="fixed inset-0 bg-black/50 z-50 hidden flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl">
      <h3 class="font-bold mb-2 text-sm">Copy Bilik dari Lokasi Lain</h3>
      <p class="text- text-slate-500 mb-4">Pilih lokasi sumber untuk copy ke <b id="copyTargetLoc">${activeLocation}</b></p>
      <div id="copySourceList" class="space-y-2 mb-4"></div>
      <div class="flex gap-2"><button onclick="closeCopyRoomsModal()" class="flex-1 py-2.5 bg-slate-100 border rounded-xl font-bold text-xs">Batal</button><button onclick="executeCopyRooms()" class="flex-1 py-2.5 bg-slate-100 border text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-200">Copy Sekarang</button></div>
    </div>
  </div>
  `;
  populateRoomingTripDropdown();
  renderLocationTabs();
  fetchRoomingData();
}

// --- ORDER + DRAG SCROLL ---
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
  return [...rooms].sort((a,b)=> (a.fields['SORT ORDER']||9999)-(b.fields['SORT ORDER']||9999));
}
function saveRoomOrder(ids){
  localStorage.setItem(getRoomOrderKey(), JSON.stringify(ids));
}
let draggedRoomId = null;
function handleRoomDragStart(e, roomId){ draggedRoomId = roomId; e.dataTransfer.setData('text/plain', roomId); const card=document.querySelector(`[data-room-id="${roomId}"]`); if(card) setTimeout(()=>card.style.opacity='0.4',0); }
function handleRoomDragEnd(e){ const card=document.querySelector(`[data-room-id="${draggedRoomId}"]`); if(card) card.style.opacity='1'; draggedRoomId=null; document.querySelectorAll('[data-room-id]').forEach(c=>c.classList.remove('ring-2')); }
function handleRoomDragOver(e){ e.preventDefault(); e.currentTarget.classList.add('ring-2','ring-slate-200'); }
function handleRoomDragLeave(e){ e.currentTarget.classList.remove('ring-2','ring-slate-200'); }
function handleRoomDrop(e, targetId){
  e.preventDefault();
  const fromId = draggedRoomId || e.dataTransfer.getData('text/plain');
  if(!fromId || fromId===targetId) return;
  const grid = document.getElementById('roomingGrid');
  const ids = Array.from(grid.querySelectorAll('[data-room-id]')).map(c=>c.dataset.roomId);
  const fromIdx = ids.indexOf(fromId); const toIdx = ids.indexOf(targetId);
  if(fromIdx>-1 && toIdx>-1){ ids.splice(fromIdx,1); ids.splice(toIdx,0,fromId); saveRoomOrder(ids); renderRoomingGrid(); }
}
document.addEventListener('dragover', (e)=>{
  const grid = document.getElementById('roomingGrid');
  if(!grid) return;
  const rect = grid.getBoundingClientRect();
  if(e.clientY > rect.bottom - 100) grid.scrollTop += 12;
  if(e.clientY < rect.top + 100) grid.scrollTop -= 12;
});
function setActiveLocation(loc){ activeLocation=loc.toUpperCase(); localStorage.setItem('effah_active_location', activeLocation); document.getElementById('copyTargetLoc').textContent=activeLocation; renderLocationTabs(); renderRoomingGrid(); }
function renderLocationTabs(){
  const container = document.getElementById('locationTabs');
  if(!container) return;
  const baseLocations = ['MEKAH','MADINAH','TAIF'];
  const allLocs = [...baseLocations,...customLocations.filter(l=>!baseLocations.includes(l))];
  const counts = {}; allLocs.forEach(l=>counts[l]=0);
  allRoomingRecords.forEach(r=>{ const l=(r.fields['LOKASI / CITY']||'').trim().toUpperCase(); if(counts[l]!==undefined) counts[l]++; else if(l){ counts[l]=1; if(!allLocs.includes(l)) allLocs.push(l); } });
  let html = allLocs.map(loc=>{
    const label = loc==='MEKAH'?'🕋 MEKAH': loc==='MADINAH'?'🕌 MADINAH': loc==='TAIF'?'⛰️ TAIF': '📍 '+loc;
    const c = counts[loc]||0; const active = loc===activeLocation;
    const isCustom =!['MEKAH','MADINAH','TAIF'].includes(loc);
    const delBtn = isCustom? `<button onclick="event.stopPropagation(); deleteCustomLocation('${loc}')" class="ml-1 w-4 h-4 rounded-full bg-black/10 hover:bg-red-500 hover:text-white flex items-center justify-center text-">✕</button>` : '';
    const wrapCls = active? 'bg-slate-800 rounded-full' : 'bg-white rounded-full border border-slate-200';
    return `<div class="inline-flex items-center ${wrapCls}"><button onclick="setActiveLocation('${loc}')" class="px-3 py-1 rounded-full text- font-bold ${active?'text-white':'text-slate-700'}">${label} (${c})</button>${delBtn}</div>`;
  }).join('');
  html+=`<button onclick="openAddLocationModal()" class="px-3 py-1 rounded-full text- font-bold bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200">+ Lokasi</button>`;
  container.innerHTML=html;
}
async function fetchRoomingData(){ /* same as V11 */
  try{
    showRoomingLoading(); populateRoomingTripDropdown();
    const tripId = window.selectedTripRecord?.id || localStorage.getItem('effah_active_trip_id') || localStorage.getItem('effah_last_selected_trip');
    if(!tripId) return;
    const base = window.AIRTABLE_BASE_ID || localStorage.getItem('effah_api_base') || localStorage.getItem('effah_base_id');
    const pat = window.AIRTABLE_PAT || localStorage.getItem('effah_api_pat');
    if(!base||!pat) return;
    let allRooms=[], allJems=[], offset='';
    do{ const res=await fetch(`https://api.airtable.com/v0/${base}/ROOMING%20LIST?pageSize=100${offset?`&offset=${offset}`:''}`,{headers:{Authorization:`Bearer ${pat}`}}); const data=await res.json(); if(data.records) allRooms=allRooms.concat(data.records); offset=data.offset||''; }while(offset);
    offset=''; do{ const res=await fetch(`https://api.airtable.com/v0/${base}/DATA%20JEMAAH%20UMRAH?pageSize=100${offset?`&offset=${offset}`:''}`,{headers:{Authorization:`Bearer ${pat}`}}); const data=await res.json(); if(data.records) allJems=allJems.concat(data.records); offset=data.offset||''; }while(offset);
    allRoomingRecords = allRooms.filter(r=>{ const tf=r.fields['TRIP']||[]; return Array.isArray(tf)? tf.includes(tripId) : String(tf).includes(tripId); });
    allRoomingJemaah = allJems.filter(r=>{ const tf=r.fields['TRIP']||[]; return Array.isArray(tf)? tf.includes(tripId) : String(tf).includes(tripId); });
    loadStaffList(); renderNamelist(); renderRoomingGrid(); renderLocationTabs();
  }catch(e){ console.error(e); }
}
function populateRoomingTripDropdown(){
  const sel = document.getElementById('roomingTripSelect'); if(!sel) return;
  let trips = [...(window.allTripUmrahRecords || window.allTripRecords || [])];
  const currentId = window.selectedTripRecord?.id || localStorage.getItem('effah_active_trip_id') || '';
  if(trips.length===0){ sel.innerHTML='<option>Loading...</option>'; return; }
  sel.innerHTML='<option value="">Pilih Trip...</option>'+trips.map(t=>{ const raw=t.fields?.Trip||t.id; const clean=cleanTripNameForRooming(raw); return `<option value="${t.id}" ${t.id===currentId?'selected':''}>${clean}</option>`; }).join('');
}
function onRoomingTripChange(tripId){ if(!tripId) return; const trips=window.allTripUmrahRecords||[]; const found=trips.find(t=>t.id===tripId); if(found) window.selectedTripRecord=found; localStorage.setItem('effah_active_trip_id',tripId); fetchRoomingData(); }
function isJemaahAssigned(jId){ return allRoomingRecords.some(r=> (r.fields['JEMAAH']||[]).includes(jId)); }
function renderNamelist(){
  const cont=document.getElementById('namelistContainer'); if(!cont) return;
  const q=(document.getElementById('searchRoomingJemaah')?.value||'').toLowerCase();
  let filtered=[...allRoomingJemaah];
  if(q) filtered=filtered.filter(r=> getJemaahName(r.fields).toLowerCase().includes(q));
  const total=allRoomingJemaah.length; const belum=allRoomingJemaah.filter(r=>!isJemaahAssigned(r.id)).length;
  document.getElementById('totalJemaahBadge').textContent=total+' Total';
  document.getElementById('belumAssignBadge').textContent=belum+' Unassigned';
  document.getElementById('belumAssignTop').textContent=belum+' Unassigned';
  document.getElementById('assignedTop').textContent=(total-belum)+' Assigned';
  if(total===0){ cont.innerHTML='<div class="p-8 text-center text-xs text-slate-400">Tiada jemaah</div>'; return; }
  cont.innerHTML=filtered.map((r,i)=>{
    const name=getJemaahName(r.fields); const assigned=isJemaahAssigned(r.id);
    const rowCls=assigned?'opacity-40 bg-slate-50 pointer-events-none':'hover:bg-slate-50 cursor-grab';
    const drag=assigned?'':`draggable="true" ondragstart="dragJemaah(event,'${r.id}')"`;
    const plus=assigned?'<span class="text- text-slate-400">✓</span>':`<button onclick="quickAssign('${r.id}')" class="w-6 h-6 rounded-full border bg-slate-100 hover:bg-slate-200">+</button>`;
    return `<div ${drag} class="grid grid-cols-12 items-center px-3 py-2.5 text-xs border-b ${rowCls}"><div class="col-span-1 text-slate-400">${String(i+1).padStart(2,'0')}</div><div class="col-span-7 font-semibold truncate">${name}</div><div class="col-span-1 text-center">-</div><div class="col-span-2 text-center"><span class="px-2 py-0.5 rounded-full border text-">${r.fields['PAKEJ']||'EKONOMI'}</span></div><div class="col-span-1 text-center">${plus}</div></div>`;
  }).join('');
}
function renderRoomingGrid(){
  const grid=document.getElementById('roomingGrid'); if(!grid) return;
  let rooms=[...allRoomingRecords].filter(r=> (r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===activeLocation.toUpperCase());
  rooms=getRoomOrderedList(rooms);
  document.getElementById('roomingBiliks').textContent=rooms.length+' Bilik';
  document.getElementById('roomingOccupancy').textContent=`${rooms.reduce((s,r)=>s+(r.fields['JEMAAH']?.length||0),0)} Jemaah + ${rooms.reduce((s,r)=>s+(r.fields['STAFF / EXTRA']||'').split(',').filter(Boolean).length,0)} Staff • ${activeLocation}`;
  renderRoomingOverview(rooms);
  if(rooms.length===0){ grid.innerHTML=`<div class="col-span-2 p-12 text-center text-xs border border-dashed rounded-2xl bg-white">Tiada bilik<br><button onclick="openNewRoomModal()" class="mt-3 px-4 py-2 bg-slate-100 border rounded-full text-xs">+ Bilik Baru</button></div>`; return; }
  grid.innerHTML=rooms.map(rec=>{
    const f=rec.fields; const roomId=f['Room ID / Nama Bilik']||'?'; const pakej=f['PAKEJ / HOTEL']||'EKONOMI'; const cap=f['KAPASITI']||4; const hotel=f['HOTEL NAME']||'Tanpa Hotel'; const staffArr=(f['STAFF / EXTRA']||'').split(',').filter(Boolean); const jIds=f['JEMAAH']||[]; const count=jIds.length+staffArr.length;
    const jSlots=jIds.map(jId=>{
      const jRec=allRoomingJemaah.find(j=>j.id===jId); const jName=getJemaahName(jRec?.fields);
      return `<div class="flex items-center justify-between px-2.5 py-2.5 bg-slate-100 text-slate-800 border border-slate-200 rounded-xl text-"><span class="truncate">${jName}</span><button onclick="removeJemaahFromRoom('${rec.id}','${jId}')" class="ml-2 w-5 h-5 rounded-full bg-white hover:bg-slate-200">✕</button></div>`;
    }).join('');
    const sSlots=staffArr.map(s=>`<div class="flex items-center justify-between px-2.5 py-2.5 bg-[#FADBD8] text-[#7A0C2E] border border-[#F5B7B1] rounded-xl text-"><span class="truncate">👤 ${s}</span><button onclick="removeStaff('${rec.id}','${s.replace(/'/g,"\\'")}')" class="ml-2 w-5 h-5 rounded-full bg-white/70">✕</button></div>`).join('');
    const emptyCount=Math.max(0,cap-count);
    const emptySlots=Array.from({length:emptyCount}).map((_,i)=>`<div ondragover="allowDrop(event)" ondrop="dropJemaah(event,'${rec.id}')" class="px-2 py-2.5 border border-dashed rounded-xl text- text-slate-400 text-center">Slot Kosong ${count+i+1}</div>`).join('');
    return `<div data-room-id="${rec.id}" ondragover="handleRoomDragOver(event)" ondragleave="handleRoomDragLeave(event)" ondrop="handleRoomDrop(event,'${rec.id}')" class="bg-white rounded-2xl border p-3 shadow-sm flex flex-col gap-2.5">
      <div class="flex items-center justify-between"><div class="flex items-center gap-2"><button class="drag-handle w-7 h-7 rounded-full bg-slate-100 border hover:bg-slate-200 flex items-center justify-center cursor-grab" draggable="true" ondragstart="handleRoomDragStart(event,'${rec.id}')" ondragend="handleRoomDragEnd(event)"><i class="fa-solid fa-grip-lines text-"></i></button><span class="font-bold text-sm">${roomId}</span><span class="px-2 py-0.5 rounded-full bg-slate-100 text- border">${pakej}</span></div><button onclick="deleteRoom('${rec.id}','${roomId}')" class="w-7 h-7 rounded-full bg-slate-50 hover:bg-red-50 border"><i class="fa-solid fa-trash text-"></i></button></div>
      <div class="space-y-1.5">${jSlots}${sSlots}${emptySlots}</div>
    </div>`;
  }).join('');
}
// copy, staff, print, etc same as V11...
function filterRoomingNamelist(){ renderNamelist(); }
function dragJemaah(e,jId){ e.dataTransfer.setData('text/plain', jId); }
function allowDrop(e){ e.preventDefault(); }
function dropJemaah(e,roomId){ e.preventDefault(); const jId=e.dataTransfer.getData('text/plain'); if(jId) assignJemaahToRoom(jId,roomId); }
function quickAssign(jId){ const rooms=allRoomingRecords.filter(r=> (r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===activeLocation); const target=rooms.find(r=> (r.fields['JEMAAH']?.length||0)+(r.fields['STAFF / EXTRA']||'').split(',').filter(Boolean).length < (r.fields['KAPASITI']||4)); if(target) assignJemaahToRoom(jId,target.id); }
async function assignJemaahToRoom(jId,roomId){ const rec=allRoomingRecords.find(r=>r.id===roomId); if(!rec) return; const cur=rec.fields['JEMAAH']||[]; await updateRoomField(roomId,'JEMAAH',[...cur,jId],true); }
async function removeJemaahFromRoom(roomId,jId){ const rec=allRoomingRecords.find(r=>r.id===roomId); const newList=(rec.fields['JEMAAH']||[]).filter(id=>id!==jId); await updateRoomField(roomId,'JEMAAH',newList,true); }
async function updateRoomField(roomId,field,value){ const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base'); const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat'); await fetch(`https://api.airtable.com/v0/${base}/ROOMING%20LIST/${roomId}`,{method:'PATCH',headers:{Authorization:`Bearer ${pat}`,'Content-Type':'application/json'},body:JSON.stringify({fields:{[field]:value}})}); const rec=allRoomingRecords.find(r=>r.id===roomId); if(rec) rec.fields[field]=value; renderRoomingGrid(); renderNamelist(); renderLocationTabs(); }
function renderRoomingOverview(rooms){ const el=document.getElementById('roomingOverview'); if(!el) return; if(rooms.length===0){ el.innerHTML='<span class="text- text-slate-400">Tiada bilik</span>'; return; } el.innerHTML=`<div class="text-"><b>BILIK DI ${activeLocation} :</b> ${rooms.length} Bilik • ${rooms.reduce((s,r)=>s+(r.fields['KAPASITI']||0),0)} pax</div>`; }
function openAddLocationModal(){ const loc=prompt('Nama Lokasi:'); if(loc){ const up=loc.trim().toUpperCase(); if(!customLocations.includes(up)) customLocations.push(up); localStorage.setItem('effah_custom_locations', JSON.stringify(customLocations)); activeLocation=up; localStorage.setItem('effah_active_location', activeLocation); renderLocationTabs(); renderRoomingGrid(); } }
function deleteCustomLocation(loc){ if(!confirm(`Padam ${loc}?`)) return; customLocations=customLocations.filter(l=>l!==loc); localStorage.setItem('effah_custom_locations', JSON.stringify(customLocations)); if(activeLocation===loc) activeLocation='MEKAH'; renderLocationTabs(); renderRoomingGrid(); }
function openCopyRoomsModal(){ const modal=document.getElementById('copyRoomsModal'); const list=document.getElementById('copySourceList'); const allLocs=['MEKAH','MADINAH','TAIF','JEDDAH',...customLocations].filter(l=>l!==activeLocation); const counts={}; allRoomingRecords.forEach(r=>{ const l=(r.fields['LOKASI / CITY']||'MEKAH').toUpperCase(); counts[l]=(counts[l]||0)+1; }); list.innerHTML=allLocs.map(loc=>`<label class="flex items-center gap-2 p-2 border rounded-xl cursor-pointer hover:bg-slate-50"><input type="radio" name="copySource" value="${loc}"><span class="text-xs font-bold">📍 ${loc} (${counts[loc]||0} bilik)</span></label>`).join('')||'<div class="text-xs text-slate-400">Tiada lokasi</div>'; document.getElementById('copyTargetLoc').textContent=activeLocation; modal.classList.remove('hidden'); }
function closeCopyRoomsModal(){ document.getElementById('copyRoomsModal').classList.add('hidden'); }
async function executeCopyRooms(){ const sel=document.querySelector('input[name="copySource"]:checked'); if(!sel) return alert('Pilih sumber'); const src=sel.value; const srcRooms=allRoomingRecords.filter(r=> (r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===src); const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base'); const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat'); const tripId=localStorage.getItem('effah_active_trip_id'); for(let r of srcRooms){ const f=r.fields; const payload={fields:{'Room ID / Nama Bilik':f['Room ID / Nama Bilik'],'PAKEJ / HOTEL':f['PAKEJ / HOTEL']||'EKONOMI','KAPASITI':f['KAPASITI']||4,'HOTEL NAME':f['HOTEL NAME']||'','TRIP':[tripId],'LOKASI / CITY':activeLocation,'SORT ORDER':allRoomingRecords.length+1}}; try{ const res=await fetch(`https://api.airtable.com/v0/${base}/ROOMING%20LIST`,{method:'POST',headers:{Authorization:`Bearer ${pat}`,'Content-Type':'application/json'},body:JSON.stringify(payload)}); const nr=await res.json(); if(nr.id) allRoomingRecords.push(nr); }catch(e){} } closeCopyRoomsModal(); renderRoomingGrid(); renderLocationTabs(); }
function getStaffStorageKey(){ return `effah_staff_list_${localStorage.getItem('effah_active_trip_id')||'default'}`; }
function loadStaffList(){ staffList=JSON.parse(localStorage.getItem(getStaffStorageKey())||'[]'); renderStaffList(); }
function saveStaffList(){ localStorage.setItem(getStaffStorageKey(), JSON.stringify(staffList)); }
function addNewStaff(){ const input=document.getElementById('newStaffInput'); if(!input) return; let name=input.value.trim().toUpperCase(); if(!name) return; if(!name.includes('(')) name=`${name} (EFFAH)`; const id=`staff_${Date.now()}_${++staffIdCounter}`; staffList.push({id,name}); saveStaffList(); renderStaffList(); input.value=''; }
function renderStaffList(){ const cont=document.getElementById('staffListContainer'); const badge=document.getElementById('staffTotalBadge'); if(!cont) return; if(badge) badge.textContent=staffList.length+' Staff'; if(staffList.length===0){ cont.innerHTML='<div class="p-3 text-center text- text-slate-400">Tiada staff</div>'; return; } cont.innerHTML=staffList.map((s,idx)=>`<div class="flex items-center justify-between px-3 py-2 rounded-xl border text- bg-white"><span>${String(idx+1).padStart(2,'0')} ${s.name}</span><button onclick="deleteStaff('${s.id}')" class="w-6 h-6 rounded-full border">✕</button></div>`).join(''); }
function deleteStaff(id){ staffList=staffList.filter(s=>s.id!==id); saveStaffList(); renderStaffList(); }
function isStaffAssigned(){ return false; }
function openNewRoomModal(){ document.getElementById('newRoomModal').classList.remove('hidden'); document.getElementById('newRoomLokasi').value=activeLocation; }
function closeNewRoomModal(){ document.getElementById('newRoomModal').classList.add('hidden'); }
async function submitNewRoom(){ const roomId=document.getElementById('newRoomId').value.trim(); const lokasi=document.getElementById('newRoomLokasi').value; const pakej=document.getElementById('newRoomPakej').value; const hotel=document.getElementById('newRoomHotel').value.trim(); const cap=parseInt(document.getElementById('newRoomCap').value)||4; const tripId=localStorage.getItem('effah_active_trip_id'); if(!roomId) return alert('Isi Room ID'); const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base'); const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat'); const payload={fields:{'Room ID / Nama Bilik':roomId,'PAKEJ / HOTEL':pakej,'KAPASITI':cap,'HOTEL NAME':hotel,'TRIP':[tripId],'LOKASI / CITY':lokasi,'SORT ORDER':allRoomingRecords.length+1}}; const res=await fetch(`https://api.airtable.com/v0/${base}/ROOMING%20LIST`,{method:'POST',headers:{Authorization:`Bearer ${pat}`,'Content-Type':'application/json'},body:JSON.stringify(payload)}); const nr=await res.json(); if(nr.id){ allRoomingRecords.push(nr); closeNewRoomModal(); renderRoomingGrid(); renderLocationTabs(); } }
function generateRoomingPrint(){
  const tripNameRaw=window.selectedTripRecord?.fields?.Trip||document.getElementById('roomingTripSelect')?.selectedOptions[0]?.text||'Trip';
  const tripName=cleanTripNameForRooming(tripNameRaw);
  const rooms=[...allRoomingRecords].filter(r=> (r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===activeLocation.toUpperCase());
  let namelistRows=allRoomingJemaah.map((j,idx)=>`<tr><td>${idx+1}</td><td>${getJemaahName(j.fields)}</td><td>-</td><td>-</td><td>-</td><td>${j.fields['PAKEJ']||''}</td><td></td></tr>`).join('');
  const staffInRooms=[]; rooms.forEach(r=> (r.fields['STAFF / EXTRA']||'').split(',').filter(Boolean).forEach(s=>{ if(!staffInRooms.includes(s)) staffInRooms.push(s); }));
  staffInRooms.forEach(s=>{ const clean=s.replace(/\(EFFAH\)/i,'').trim(); namelistRows+=`<tr><td>NA</td><td>${clean} (EFFAH)</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>`; });
  const roomBlocks=rooms.map(r=>{
    const f=r.fields; const rid=f['Room ID / Nama Bilik']||'?'; const pakej=f['PAKEJ / HOTEL']||'EKONOMI'; const hotel=f['HOTEL NAME']||''; const jIds=f['JEMAAH']||[]; const staff=(f['STAFF / EXTRA']||'').split(',').filter(Boolean);
    let rows=jIds.map((jId,idx)=>{ const rec=allRoomingJemaah.find(j=>j.id===jId); return `<div>${idx+1}. ${getJemaahName(rec?.fields)}</div>`; }).join('');
    staff.forEach(s=>{ const clean=s.replace(/\(EFFAH\)/i,'').trim(); rows+=`<div>NA ${clean} (EFFAH)</div>`; });
    return `<div style="margin-bottom:12px"><b>${rid} (${pakej}) - ${hotel}</b><div style="margin-left:8px">${rows}</div></div>`;
  }).join('');
  const html=`<html><head><style>body{font-family:Arial;font-size:10px} table{border-collapse:collapse;width:100%} th,td{border:1px solid #000;padding:3px;font-size:9px}.header{display:flex;justify-content:space-between;font-weight:bold;border-bottom:2px solid #000;padding-bottom:6px;margin-bottom:12px}.container{display:flex;gap:15px}.left{width:68%}.right{width:32%;border-left:1px solid #000;padding-left:10px} @media print{ @page{size:A4 landscape} }</style></head><body><div class="header"><span>NAMELIST ${tripName}</span><span>ROOMING LIST ${tripName}</span></div><div class="container"><div class="left"><table><tr><th>NO</th><th>NAMA JEMAAH</th><th>EJEN</th><th>FULLBOARD</th><th>TRAIN</th><th>PAKEJ</th><th>INSURAN</th></tr>${namelistRows}</table></div><div class="right">${roomBlocks}</div></div><script>window.print()</script></body></html>`;
  const w=window.open('','_blank'); if(w){ w.document.write(html); w.document.close(); }
}
function autoAssignRooming(){ /* same */ }
function changeDefaultCap(){}
function editRoomId(){}
function editHotel(){}
function addStaff(){}
function removeStaff(){}
function deleteRoom(){}
