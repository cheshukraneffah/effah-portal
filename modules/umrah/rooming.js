// ROOMING V17 FINAL - fix staff grayed realtime, copy bilik, delete grayed, font standard
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
function getJemaahName(f){ if(!f) return '-'; return f['NAMA'] || f['NAME'] || f['NAMA JEMAAH'] || f['NAMA PENUH'] || f['Name'] || '-'; }
function generateRoomIdFromCap(cap){ return `B${parseInt(cap)||4}`; }

document.addEventListener('DOMContentLoaded', () => {
  if(document.getElementById('modul-rooming')) renderRoomingHTML();
  setTimeout(()=>populateRoomingTripDropdown(), 700);
});

function showRoomingLoading(){
  const g=document.getElementById('roomingGrid'); const l=document.getElementById('namelistContainer');
  if(g) g.innerHTML=`<div class="col-span-2 p-8 text-center text- text-slate-400">Loading bilik...</div>`;
  if(l) l.innerHTML=`<div class="p-8 text-center text- text-slate-400">Loading jemaah...</div>`;
}

function renderRoomingHTML(){
  const c=document.getElementById('modul-rooming'); if(!c) return;
  c.innerHTML=`
  <div class="flex flex-col gap-3 p-2">
    <div class="bg-white rounded-2xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3 text-xs flex-wrap">
        <span class="font-bold tracking-widest text-slate-800 text-">ROOMING LIST</span>
        <select id="roomingTripSelect" onchange="onRoomingTripChange(this.value)" class="px-3 py-1.5 border border-slate-300 rounded-full bg-white text-xs font-bold min-w- max-w- truncate">
          <option value="">Pilih Trip...</option>
        </select>
      </div>
      <div class="flex items-center gap-2 text-">
        <span id="belumAssignTop" class="px-2.5 py-1 bg-amber-100 rounded-full font-bold">0 Unassigned</span>
        <span id="assignedTop" class="px-2.5 py-1 bg-emerald-50 rounded-full font-bold">0 Assigned</span>
        <button onclick="fetchRoomingData()" class="w-7 h-7 rounded-full border bg-white hover:bg-slate-50 text-"><i class="fa-solid fa-rotate"></i></button>
      </div>
    </div>

    <div class="flex flex-col lg:flex-row gap-3 items-start">
      <div class="w-full lg:w-[52%] bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        <div class="p-3 border-b border-slate-200">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-bold text- tracking-widest text-slate-700">NAMELIST JEMAAH</h3>
            <div class="flex gap-1.5">
              <span id="belumAssignBadge" class="px-2 py-1 bg-amber-100 text-amber-800 rounded-full text- font-bold">0 Unassigned</span>
              <span id="totalJemaahBadge" class="px-2 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-full text- font-bold">0 Total</span>
            </div>
          </div>
          <div class="flex gap-2">
            <div class="relative flex-1">
              <i class="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400 text-"></i>
              <input id="searchRoomingJemaah" onkeyup="filterRoomingNamelist()" placeholder="Cari nama jemaah..." class="w-full text- pl-8 pr-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none">
            </div>
            <select id="filterPakejRooming" onchange="filterRoomingNamelist()" class="text- border border-slate-200 rounded-xl px-3 py-2 bg-white font-medium"><option value="">Semua Pakej</option><option>EKONOMI</option><option>PREMIUM</option><option>JIMAT</option></select>
          </div>
        </div>
        <div class="px-3 py-2 bg-slate-50/70 border-b border-slate-200 grid grid-cols-12 text- font-bold text-slate-500 tracking-wider">
          <div class="col-span-1">NO</div><div class="col-span-7">NAMA JEMAAH</div><div class="col-span-1 text-center">BOARD</div><div class="col-span-2 text-center">PAKEJ</div><div class="col-span-1 text-center">+</div>
        </div>
        <div id="namelistContainer" class="flex-1 overflow-y-auto max-h- divide-y divide-slate-50 bg-white min-h-"></div>
        <div class="border-t border-slate-200 bg-slate-50/50">
          <div class="p-3 flex items-center justify-between">
            <h4 class="font-bold text- tracking-widest text-slate-700">STAFF / EXTRA LIST</h4>
            <span id="staffTotalBadge" class="px-2 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-full text- font-bold">0 Staff</span>
          </div>
          <div class="px-3 pb-3 flex gap-2">
            <input id="newStaffInput" placeholder="Taip nama staff" class="flex-1 text- px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none" onkeydown="if(event.key==='Enter'){ addNewStaff(); }">
            <button onclick="addNewStaff()" class="px-3 py-2 bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text- font-bold hover:bg-slate-200">+ Add</button>
          </div>
          <div id="staffListContainer" class="px-2 pb-3 max-h- overflow-y-auto space-y-1 bg-slate-50/50 min-h-"></div>
        </div>
      </div>

      <div class="w-full lg:w-[48%] flex flex-col gap-3">
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-3">
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h3 class="font-bold text- tracking-widest">ROOMING LIST</h3>
              <div class="flex items-center gap-2 mt-1 text-">
                <span id="roomingBiliks" class="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-full font-bold">0 Bilik</span>
                <span id="roomingOccupancy" class="text-slate-500">0 Jemaah + 0 Staff • ${activeLocation}</span>
              </div>
            </div>
            <div class="flex items-center gap-1.5 flex-wrap">
              <button onclick="generateRoomingPrint()" class="px-2.5 py-1 bg-white border border-slate-200 rounded-full text- font-bold hover:bg-slate-50"><i class="fa-solid fa-print mr-1"></i> Print / PDF</button>
              <button onclick="openCopyRoomsModal()" class="px-2.5 py-1 bg-white border border-slate-200 rounded-full text- font-bold hover:bg-slate-50"><i class="fa-solid fa-copy mr-1"></i> Copy Bilik</button>
              <button onclick="autoAssignRooming()" class="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-full text- font-bold hover:bg-slate-200">Auto Assign</button>
              <button onclick="openNewRoomModal()" class="px-2.5 py-1 bg-slate-900 text-white rounded-full text- font-bold hover:bg-black">+ Bilik Baru</button>
            </div>
          </div>
          <div id="roomingOverview" class="mt-3 p-2.5 bg-white border border-slate-200 rounded-xl text-"></div>
          <div id="locationTabs" class="flex flex-wrap gap-1.5 mt-3"></div>
        </div>
        <div id="roomingGrid" class="grid grid-cols-1 lg:grid-cols-2 gap-3 overflow-y-auto max-h- pr-1 content-start min-h-"></div>
      </div>
    </div>
  </div>

  <div id="newRoomModal" class="fixed inset-0 bg-black/50 z-50 hidden flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl">
      <h3 class="font-bold mb-4 text-">Tambah Bilik Baru - Auto B + Kapasiti</h3>
      <div class="space-y-3 text-">
        <div>
          <label class="text- font-bold text-slate-500">ROOM ID (Auto)</label>
          <input id="newRoomId" readonly class="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-100 font-bold text-slate-700 text-" value="B4">
          <p class="text- text-slate-400 mt-1">Auto ikut kapasiti: 4=B4, 6=B6</p>
        </div>
        <select id="newRoomLokasi" class="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-"><option value="MEKAH">MEKAH</option><option value="MADINAH">MADINAH</option><option value="TAIF">TAIF</option><option value="JEDDAH">JEDDAH</option></select>
        <select id="newRoomPakej" class="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-"><option>EKONOMI</option><option>PREMIUM</option><option>JIMAT</option></select>
        <input id="newRoomHotel" placeholder="Hotel Name" class="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-">
        <div class="flex gap-2 items-center">
          <input id="newRoomCap" type="number" value="4" min="1" max="8" oninput="updateNewRoomIdFromCap()" onchange="updateNewRoomIdFromCap()" class="flex-1 p-2.5 border border-slate-200 rounded-xl font-bold bg-white text-">
          <span class="py-2.5 text-slate-500 font-bold text-">Kapasiti</span>
          <button type="button" onclick="changeNewRoomCap(-1)" class="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 hover:bg-slate-200 text-">−</button>
          <button type="button" onclick="changeNewRoomCap(1)" class="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 hover:bg-slate-200 text-">+</button>
        </div>
        <textarea id="newRoomNote" placeholder="Catatan bilik..." class="w-full p-2.5 border border-slate-200 rounded-xl h-16 bg-white text-"></textarea>
        <div class="flex gap-2 pt-2">
          <button onclick="closeNewRoomModal()" class="flex-1 py-2.5 bg-slate-100 border border-slate-200 rounded-xl font-bold hover:bg-slate-200 text-">Batal</button>
          <button onclick="submitNewRoom()" id="btnCiptaBilik" class="flex-1 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-black text-">Cipta Bilik</button>
        </div>
      </div>
    </div>
  </div>

  <div id="copyRoomsModal" class="fixed inset-0 bg-black/50 z-50 hidden flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl">
      <h3 class="font-bold mb-2 text-">Copy Bilik dari Lokasi Lain</h3>
      <p class="text- text-slate-500 mb-4">Pilih lokasi sumber untuk copy ke <b id="copyTargetLoc">${activeLocation}</b></p>
      <div id="copySourceList" class="space-y-2 mb-4"></div>
      <div class="flex gap-2"><button onclick="closeCopyRoomsModal()" class="flex-1 py-2.5 bg-slate-100 border border-slate-200 rounded-xl font-bold text- hover:bg-slate-200">Batal</button><button onclick="executeCopyRooms()" class="flex-1 py-2.5 bg-slate-900 text-white rounded-xl font-bold text- hover:bg-black">Copy Sekarang</button></div>
    </div>
  </div>
  `;
  populateRoomingTripDropdown();
  renderLocationTabs();
  fetchRoomingData();
}

function getRoomOrderKey(){ const tripId=window.selectedTripRecord?.id||localStorage.getItem('effah_active_trip_id')||'default'; return `effah_room_order_${tripId}_${activeLocation}`; }
function getRoomOrderedList(rooms){
  const key=getRoomOrderKey(); const localOrder=JSON.parse(localStorage.getItem(key)||'[]');
  if(localOrder.length>0){ const map={}; rooms.forEach(r=>map[r.id]=r); const ordered=[]; localOrder.forEach(id=>{ if(map[id]){ ordered.push(map[id]); delete map[id]; } }); Object.values(map).forEach(r=>ordered.push(r)); return ordered; }
  return [...rooms].sort((a,b)=>(a.fields['SORT ORDER']||9999)-(b.fields['SORT ORDER']||9999));
}
function saveRoomOrder(ids){ localStorage.setItem(getRoomOrderKey(), JSON.stringify(ids)); }
let draggedRoomId=null;
function handleRoomDragStart(e,roomId){ draggedRoomId=roomId; e.dataTransfer.setData('text/plain',roomId); const c=document.querySelector(`[data-room-id="${roomId}"]`); if(c) setTimeout(()=>c.style.opacity='0.4',0); }
function handleRoomDragEnd(e){ const c=document.querySelector(`[data-room-id="${draggedRoomId}"]`); if(c) c.style.opacity='1'; draggedRoomId=null; document.querySelectorAll('[data-room-id]').forEach(x=>x.classList.remove('ring-2','ring-slate-200')); }
function handleRoomDragOver(e){ e.preventDefault(); e.currentTarget.classList.add('ring-2','ring-slate-200'); }
function handleRoomDragLeave(e){ e.currentTarget.classList.remove('ring-2','ring-slate-200'); }
function handleRoomDrop(e,targetId){
  e.preventDefault(); const fromId=draggedRoomId||e.dataTransfer.getData('text/plain');
  if(!fromId||fromId===targetId) return; const grid=document.getElementById('roomingGrid'); const ids=Array.from(grid.querySelectorAll('[data-room-id]')).map(c=>c.dataset.roomId);
  const f=ids.indexOf(fromId); const t=ids.indexOf(targetId); if(f>-1&&t>-1){ ids.splice(f,1); ids.splice(t,0,fromId); saveRoomOrder(ids); renderRoomingGrid(); }
}
document.addEventListener('dragover',e=>{ const g=document.getElementById('roomingGrid'); if(!g) return; const r=g.getBoundingClientRect(); if(e.clientY>r.bottom-100) g.scrollTop+=14; if(e.clientY<r.top+100) g.scrollTop-=14; });

function renderRoomingOverview(rooms){
  const el=document.getElementById('roomingOverview'); if(!el) return;
  if(rooms.length===0){ el.innerHTML='<span class="text- text-slate-400">Tiada bilik untuk '+activeLocation+'</span>'; return; }
  const capCount={}; rooms.forEach(r=>{ const cap=r.fields['KAPASITI']||4; capCount[cap]=(capCount[cap]||0)+1; });
  let html=`<div class="space-y-1"><div class="font-bold text- tracking-widest">BILIK DI ${activeLocation} :</div>`;
  Object.keys(capCount).sort((a,b)=>a-b).forEach(cap=>{ html+=`<div class="flex justify-between text-"><span>B${cap} = ${capCount[cap]} BILIK</span><span class="text-slate-400">${capCount[cap]*cap} pax</span></div>`; });
  html+=`</div>`; el.innerHTML=html;
}
function renderLocationTabs(){
  const container=document.getElementById('locationTabs'); if(!container) return;
  const base=['MEKAH','MADINAH','TAIF']; const all=[...base,...customLocations.filter(l=>!base.includes(l))];
  const counts={}; all.forEach(l=>counts[l]=0); allRoomingRecords.forEach(r=>{ const l=(r.fields['LOKASI / CITY']||'').trim().toUpperCase(); if(counts[l]!==undefined) counts[l]++; else if(l){ counts[l]=1; if(!all.includes(l)) all.push(l); } });
  let html=all.map(loc=>{
    const label=loc==='MEKAH'?'🕋 MEKAH':loc==='MADINAH'?'🕌 MADINAH':loc==='TAIF'?'⛰️ TAIF':loc==='JEDDAH'?'🏙️ JEDDAH':'📍 '+loc;
    const c=counts[loc]||0; const active=loc===activeLocation; const isCustom=!['MEKAH','MADINAH','TAIF'].includes(loc);
    const delBtn=isCustom?`<button onclick="event.stopPropagation(); deleteCustomLocation('${loc}')" class="ml-1 w-4 h-4 rounded-full bg-black/10 hover:bg-red-500 hover:text-white flex items-center justify-center text-">✕</button>`:'';
    const wrapCls=active?'bg-slate-800 rounded-full':'bg-white rounded-full border border-slate-200';
    return `<div class="inline-flex items-center ${wrapCls}"><button onclick="setActiveLocation('${loc}')" class="px-3 py-1 rounded-full text- font-bold ${active?'text-white':'text-slate-700'}">${label} (${c})</button>${delBtn}</div>`;
  }).join('');
  html+=`<button onclick="openAddLocationModal()" class="px-3 py-1 rounded-full text- font-bold bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200">+ Lokasi</button>`;
  container.innerHTML=html;
}
async function fetchRoomingData(){
  try{
    showRoomingLoading(); populateRoomingTripDropdown();
    const tripId=window.selectedTripRecord?.id||localStorage.getItem('effah_active_trip_id')||localStorage.getItem('effah_last_selected_trip')||localStorage.getItem('selectedTripId');
    if(!tripId){ document.getElementById('namelistContainer').innerHTML='<div class="p-8 text-center text- text-slate-400">Pilih Trip dulu</div>'; return; }
    const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base')||localStorage.getItem('effah_base_id'); const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
    if(!base||!pat) return;
    let allRooms=[],allJems=[],offset='';
    do{ const res=await fetch(`https://api.airtable.com/v0/${base}/ROOMING%20LIST?pageSize=100${offset?`&offset=${offset}`:''}`,{headers:{Authorization:`Bearer ${pat}`}}); const data=await res.json(); if(data.records) allRooms=allRooms.concat(data.records); offset=data.offset||''; }while(offset);
    offset=''; do{ const res=await fetch(`https://api.airtable.com/v0/${base}/DATA%20JEMAAH%20UMRAH?pageSize=100${offset?`&offset=${offset}`:''}`,{headers:{Authorization:`Bearer ${pat}`}}); const data=await res.json(); if(data.records) allJems=allJems.concat(data.records); offset=data.offset||''; }while(offset);
    allRoomingRecords=allRooms.filter(r=>{ const tf=r.fields['TRIP']||[]; return Array.isArray(tf)?tf.includes(tripId):String(tf).includes(tripId); });
    allRoomingJemaah=allJems.filter(r=>{ const tf=r.fields['TRIP']||[]; return Array.isArray(tf)?tf.includes(tripId):String(tf).includes(tripId); });
    loadStaffList(); renderNamelist(); renderRoomingGrid(); renderLocationTabs();
  }catch(e){ console.error(e); }
}
function populateRoomingTripDropdown(){
  const sel=document.getElementById('roomingTripSelect'); if(!sel) return;
  let trips=[...(window.allTripUmrahRecords||window.allTripRecords||window.allTrips||[])];
  const currentId=window.selectedTripRecord?.id||localStorage.getItem('effah_active_trip_id')||localStorage.getItem('effah_last_selected_trip')||localStorage.getItem('selectedTripId')||'';
  if(trips.length===0){
    sel.innerHTML='<option value="">Loading trips...</option>';
    let retries=parseInt(sel.dataset.retries||'0'); if(retries<10){ sel.dataset.retries=retries+1; setTimeout(()=>{ if(typeof fetchTripUmrahData==='function') fetchTripUmrahData(); populateRoomingTripDropdown(); }, 900); }
    return;
  }
  trips.sort((a,b)=>(a.fields?.['Mula Pakej']||'').localeCompare(b.fields?.['Mula Pakej']||''));
  sel.innerHTML='<option value="">Pilih Trip...</option>'+trips.map(t=>{ const raw=t.fields?.Trip||t.fields?.['TRIP NAME']||t.id; const clean=cleanTripNameForRooming(raw); return `<option value="${t.id}" ${t.id===currentId?'selected':''}>${clean}</option>`; }).join('');
  if(currentId) sel.value=currentId; else if(trips.length>0){ sel.value=trips[0].id; onRoomingTripChange(trips[0].id); }
}
function onRoomingTripChange(tripId){ if(!tripId) return; const trips=window.allTripUmrahRecords||window.allTripRecords||[]; const found=trips.find(t=>t.id===tripId); if(found) window.selectedTripRecord=found; localStorage.setItem('effah_active_trip_id',tripId); localStorage.setItem('selectedTripId',tripId); localStorage.setItem('effah_last_selected_trip',tripId); fetchRoomingData(); }
function isJemaahAssigned(jId){ return allRoomingRecords.some(r=>(r.fields['JEMAAH']||[]).includes(jId)); }
function renderNamelist(){
  const cont=document.getElementById('namelistContainer'); if(!cont) return;
  const q=(document.getElementById('searchRoomingJemaah')?.value||'').toLowerCase();
  let filtered=[...allRoomingJemaah]; if(q) filtered=filtered.filter(r=>getJemaahName(r.fields).toLowerCase().includes(q));
  const total=allRoomingJemaah.length; const belum=allRoomingJemaah.filter(r=>!isJemaahAssigned(r.id)).length;
  const totalEl=document.getElementById('totalJemaahBadge'); if(totalEl) totalEl.textContent=total+' Total';
  const belumEl=document.getElementById('belumAssignBadge'); if(belumEl) belumEl.textContent=belum+' Unassigned';
  const topBelum=document.getElementById('belumAssignTop'); if(topBelum) topBelum.textContent=belum+' Unassigned';
  const topAssign=document.getElementById('assignedTop'); if(topAssign) topAssign.textContent=(total-belum)+' Assigned';
  if(total===0){ cont.innerHTML='<div class="p-8 text-center text- text-slate-400">Tiada jemaah</div>'; return; }
  cont.innerHTML=filtered.map((r,i)=>{
    const name=getJemaahName(r.fields); const assigned=isJemaahAssigned(r.id);
    const rowCls=assigned?'opacity-40 bg-slate-50 pointer-events-none':'hover:bg-slate-50 cursor-grab'; const drag=assigned?'':`draggable="true" ondragstart="dragJemaah(event,'${r.id}')" ondragend="dragEnd(event)"`;
    const plus=assigned?'<span class="text- text-slate-400">✓</span>':`<button onclick="quickAssign('${r.id}')" class="w-6 h-6 rounded-full border bg-slate-100 hover:bg-slate-200 text-">+</button>`;
    return `<div ${drag} class="grid grid-cols-12 items-center px-3 py-2 text- border-b border-slate-50 ${rowCls}"><div class="col-span-1 text-slate-400">${String(i+1).padStart(2,'0')}</div><div class="col-span-7 font-medium truncate">${name}</div><div class="col-span-1 text-center">-</div><div class="col-span-2 text-center"><span class="px-2 py-0.5 rounded-full border text-">${r.fields['PAKEJ']||'EKONOMI'}</span></div><div class="col-span-1 text-center">${plus}</div></div>`;
  }).join('');
}
function renderRoomingGrid(){
  const grid=document.getElementById('roomingGrid'); if(!grid) return;
  let rooms=[...allRoomingRecords].filter(r=>(r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===activeLocation.toUpperCase());
  rooms=getRoomOrderedList(rooms);
  const bilikEl=document.getElementById('roomingBiliks'); if(bilikEl) bilikEl.textContent=rooms.length+' Bilik';
  const totalJ=rooms.reduce((s,r)=>s+(r.fields['JEMAAH']?.length||0),0); const totalStaff=rooms.reduce((s,r)=>s+(r.fields['STAFF / EXTRA']||'').split(',').filter(Boolean).length,0);
  const occEl=document.getElementById('roomingOccupancy'); if(occEl) occEl.textContent=`${totalJ} Jemaah + ${totalStaff} Staff • ${activeLocation}`;
  renderRoomingOverview(rooms);
  if(rooms.length===0){ grid.innerHTML=`<div class="col-span-2 p-8 text-center text- border border-dashed rounded-2xl bg-white">Tiada bilik untuk <b>${activeLocation}</b><br><button onclick="openNewRoomModal()" class="mt-3 px-4 py-2 bg-slate-900 text-white rounded-full text-">+ Bilik Baru untuk ${activeLocation}</button></div>`; return; }
  grid.innerHTML=rooms.map(rec=>{
    const f=rec.fields; const roomId=f['Room ID / Nama Bilik']||generateRoomIdFromCap(f['KAPASITI']); const pakej=f['PAKEJ / HOTEL']||'EKONOMI'; const cap=f['KAPASITI']||4; const hotel=f['HOTEL NAME']||'Tanpa Hotel'; const staffArr=(f['STAFF / EXTRA']||'').split(',').filter(Boolean); const jIds=f['JEMAAH']||[]; const count=jIds.length+staffArr.length;
    const jSlots=jIds.map(jId=>{ const jRec=allRoomingJemaah.find(j=>j.id===jId); const jName=getJemaahName(jRec?.fields); return `<div class="flex items-center justify-between px-2.5 py-2 bg-slate-100 text-slate-800 border border-slate-200 rounded-xl text-"><span class="truncate font-medium">${jName}</span><button onclick="removeJemaahFromRoom('${rec.id}','${jId}')" class="ml-2 w-5 h-5 rounded-full bg-white hover:bg-slate-200 text-">✕</button></div>`; }).join('');
    const sSlots=staffArr.map(s=>`<div class="flex items-center justify-between px-2.5 py-2 bg-[#FADBD8] text-[#7A0C2E] border border-[#F5B7B1] rounded-xl text-"><span class="truncate">👤 ${s}</span><button onclick="removeStaff('${rec.id}','${s.replace(/'/g,"\\'")}')" class="ml-2 w-5 h-5 rounded-full bg-white/70 text-">✕</button></div>`).join('');
    const emptyCount=Math.max(0,cap-count); const emptySlots=Array.from({length:emptyCount}).map((_,i)=>`<div ondragover="allowDrop(event)" ondrop="dropJemaah(event,'${rec.id}')" class="px-2 py-2 border border-dashed border-slate-300 rounded-xl text- text-slate-400 text-center">Slot Kosong ${count+i+1}</div>`).join('');
    return `<div data-room-id="${rec.id}" ondragover="allowDropRoom(event)" ondragleave="handleRoomDragLeave(event)" ondrop="dropJemaah(event,'${rec.id}')" class="bg-white rounded-2xl border border-slate-200 p-2.5 shadow-sm flex flex-col gap-2 h-fit">
      <div class="flex items-center justify-between"><div class="flex items-center gap-2"><button class="w-6 h-6 rounded-full bg-slate-100 border flex items-center justify-center cursor-grab" draggable="true" ondragstart="handleRoomDragStart(event,'${rec.id}')" ondragend="handleRoomDragEnd(event)"><i class="fa-solid fa-grip-lines text-"></i></button><span class="font-bold text-">${roomId}</span><span class="px-2 py-0.5 rounded-full bg-slate-100 text- border">${pakej}</span></div><button onclick="deleteRoom('${rec.id}','${roomId}')" class="w-6 h-6 rounded-full bg-slate-50 hover:bg-red-50 border text-"><i class="fa-solid fa-trash"></i></button></div>
      <div class="flex items-center gap-2 text-"><div class="flex items-center gap-1 px-2 py-1 bg-slate-50 rounded-full border"><select onchange="updateRoomField('${rec.id}','PAKEJ / HOTEL',this.value)" class="bg-transparent text- font-bold outline-none"><option ${pakej==='EKONOMI'?'selected':''}>EKONOMI</option><option ${pakej==='PREMIUM'?'selected':''}>PREMIUM</option><option ${pakej==='JIMAT'?'selected':''}>JIMAT</option></select></div><div class="ml-auto flex items-center gap-1 bg-slate-50 rounded-full px-1 py-0.5 border"><button onclick="updateCap('${rec.id}',-1)" class="w-5 h-5 rounded-full bg-white border text-">−</button><span class="font-bold w-4 text-center text-">${cap}</span><button onclick="updateCap('${rec.id}',1)" class="w-5 h-5 rounded-full bg-white border text-">+</button><span class="text- ml-1">${count}/${cap}</span></div></div>
      <div class="space-y-1">${jSlots}${sSlots}${emptySlots}</div>
      <div class="h-1 bg-slate-100 rounded-full overflow-hidden"><div class="h-full bg-slate-300" style="width:${Math.min(100,(count/cap)*100)}%"></div></div>
    </div>`;
  }).join('');
}
function setActiveLocation(loc){ activeLocation=loc.toUpperCase(); localStorage.setItem('effah_active_location',activeLocation); const el=document.getElementById('copyTargetLoc'); if(el) el.textContent=activeLocation; renderLocationTabs(); renderRoomingGrid(); }
function filterRoomingNamelist(){ renderNamelist(); }
function allowDrop(e){ e.preventDefault(); }
function allowDropRoom(e){ e.preventDefault(); e.currentTarget.classList.add('ring-2','ring-slate-200'); }
function dragJemaah(e,jId){ if(isJemaahAssigned(jId)) return; e.dataTransfer.setData('text/plain',jId); const r=e.currentTarget; if(r) setTimeout(()=>r.style.opacity='0.3',0); }
function dragEnd(e){ e.currentTarget.style.opacity='1'; }
function dropJemaah(e,roomId){
  e.preventDefault(); e.currentTarget.classList.remove('ring-2','ring-slate-200');
  document.querySelectorAll('[draggable="true"]').forEach(el=>el.style.opacity='1');
  const staffId=e.dataTransfer.getData('text/staff-id'); const jId=e.dataTransfer.getData('text/plain');
  const id=staffId||jId; if(!id) return;
  if(staffList.some(s=>s.id===id) || id.startsWith('staff_')){ assignStaffToRoom(id,roomId); }
  else { if(!isJemaahAssigned(id)) assignJemaahToRoom(id,roomId); }
}
function quickAssign(jId){ if(isJemaahAssigned(jId)) return; const rooms=allRoomingRecords.filter(r=>(r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===activeLocation); const target=rooms.find(r=>{ const j=r.fields['JEMAAH']?.length||0; const s=(r.fields['STAFF / EXTRA']||'').split(',').filter(Boolean).length; return (j+s)<(r.fields['KAPASITI']||4); }); if(target) assignJemaahToRoom(jId,target.id); }
async function assignJemaahToRoom(jId,roomId){ if(isJemaahAssigned(jId)) return; const rec=allRoomingRecords.find(r=>r.id===roomId); if(!rec) return; await updateRoomField(roomId,'JEMAAH',[...(rec.fields['JEMAAH']||[]),jId],true); }
async function removeJemaahFromRoom(roomId,jId){ const rec=allRoomingRecords.find(r=>r.id===roomId); await updateRoomField(roomId,'JEMAAH',(rec.fields['JEMAAH']||[]).filter(id=>id!==jId),true); }
async function updateCap(roomId,delta){
  const rec=allRoomingRecords.find(r=>r.id===roomId); if(!rec) return;
  const newCap=Math.max(1,Math.min(8,(rec.fields['KAPASITI']||4)+delta)); const newRoomId=generateRoomIdFromCap(newCap);
  const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base')||localStorage.getItem('effah_base_id'); const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
  try{
    let res=await fetch(`https://api.airtable.com/v0/${base}/ROOMING%20LIST/${roomId}`,{method:'PATCH',headers:{Authorization:`Bearer ${pat}`,'Content-Type':'application/json'},body:JSON.stringify({fields:{'KAPASITI':newCap,'Room ID / Nama Bilik':newRoomId}})});
    let data=await res.json();
    if(data.error && data.error.message.includes('not writable')){
      res=await fetch(`https://api.airtable.com/v0/${base}/ROOMING%20LIST/${roomId}`,{method:'PATCH',headers:{Authorization:`Bearer ${pat}`,'Content-Type':'application/json'},body:JSON.stringify({fields:{'KAPASITI':newCap}})});
      data=await res.json();
    }
    rec.fields['KAPASITI']=newCap; rec.fields['Room ID / Nama Bilik']=newRoomId;
    renderRoomingGrid(); renderLocationTabs(); renderNamelist(); renderStaffList();
  }catch(e){ console.error(e); }
}
async function updateRoomField(roomId,field,value,doRender=true){
  const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base')||localStorage.getItem('effah_base_id'); const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
  try{
    await fetch(`https://api.airtable.com/v0/${base}/ROOMING%20LIST/${roomId}`,{method:'PATCH',headers:{Authorization:`Bearer ${pat}`,'Content-Type':'application/json'},body:JSON.stringify({fields:{[field]:value}})});
    const rec=allRoomingRecords.find(r=>r.id===roomId); if(rec) rec.fields[field]=value;
    if(doRender){ renderRoomingGrid(); renderNamelist(); renderStaffList(); renderLocationTabs(); }
  }catch(e){ console.error(e); }
}
function editRoomId(roomId){ const nv=prompt('Room ID baru:'); if(nv&&nv.trim()) updateRoomField(roomId,'Room ID / Nama Bilik',nv.trim(),true); }
function editHotel(roomId){ const nv=prompt('Hotel Name:'); if(nv!==null) updateRoomField(roomId,'HOTEL NAME',nv.trim(),true); }
async function deleteRoom(roomId,roomName){
  if(!confirm(`Padam ${roomName}? Semua jemaah dalam bilik tu akan jadi unassigned balik.`)) return;
  const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base')||localStorage.getItem('effah_base_id'); const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
  try{
    await fetch(`https://api.airtable.com/v0/${base}/ROOMING%20LIST/${roomId}`,{method:'DELETE',headers:{Authorization:`Bearer ${pat}`}});
    allRoomingRecords=allRoomingRecords.filter(r=>r.id!==roomId);
    // FIX: after delete, clear grayed out
    renderRoomingGrid(); renderNamelist(); renderStaffList(); renderLocationTabs();
  }catch(e){ alert('Gagal padam: '+e.message); }
}
function updateNewRoomIdFromCap(){ const cap=parseInt(document.getElementById('newRoomCap').value)||4; const el=document.getElementById('newRoomId'); if(el) el.value=generateRoomIdFromCap(cap); }
function changeNewRoomCap(d){ const i=document.getElementById('newRoomCap'); let v=parseInt(i.value)||4; v=Math.max(1,Math.min(8,v+d)); i.value=v; updateNewRoomIdFromCap(); }
function openNewRoomModal(){ const m=document.getElementById('newRoomModal'); if(!m) return; m.classList.remove('hidden'); document.getElementById('newRoomLokasi').value=activeLocation; document.getElementById('newRoomCap').value=roomingDefaultCap; updateNewRoomIdFromCap(); }
function closeNewRoomModal(){ document.getElementById('newRoomModal').classList.add('hidden'); }
async function submitNewRoom(){
  const btn=document.getElementById('btnCiptaBilik'); if(btn){ btn.textContent='Creating...'; btn.disabled=true; }
  const roomId=document.getElementById('newRoomId').value.trim(); const lokasi=document.getElementById('newRoomLokasi').value; const pakej=document.getElementById('newRoomPakej').value;
  const hotel=document.getElementById('newRoomHotel').value.trim(); const cap=parseInt(document.getElementById('newRoomCap').value)||4;
  const note=document.getElementById('newRoomNote').value.trim(); const tripId=window.selectedTripRecord?.id||localStorage.getItem('effah_active_trip_id')||localStorage.getItem('selectedTripId')||localStorage.getItem('effah_last_selected_trip');
  if(!tripId){ alert('Pilih Trip dulu'); if(btn){ btn.textContent='Cipta Bilik'; btn.disabled=false; } return; }
  const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base')||localStorage.getItem('effah_base_id'); const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
  const payload={fields:{'Room ID / Nama Bilik':roomId,'PAKEJ / HOTEL':pakej,'KAPASITI':cap,'HOTEL NAME':hotel||'','CATATAN BILIK':note||'','TRIP':[tripId],'LOKASI / CITY':lokasi,'SORT ORDER':allRoomingRecords.length+1}};
  try{
    let res=await fetch(`https://api.airtable.com/v0/${base}/ROOMING%20LIST`,{method:'POST',headers:{Authorization:`Bearer ${pat}`,'Content-Type':'application/json'},body:JSON.stringify(payload)});
    let newRec=await res.json();
    if(newRec.error && newRec.error.message.includes('not writable')){
      delete payload.fields['Room ID / Nama Bilik'];
      const res2=await fetch(`https://api.airtable.com/v0/${base}/ROOMING%20LIST`,{method:'POST',headers:{Authorization:`Bearer ${pat}`,'Content-Type':'application/json'},body:JSON.stringify(payload)});
      newRec=await res2.json();
    }
    if(newRec.id){ allRoomingRecords.push(newRec); closeNewRoomModal(); renderRoomingGrid(); renderLocationTabs(); renderNamelist(); renderStaffList(); document.getElementById('newRoomHotel').value=''; document.getElementById('newRoomNote').value=''; }
    else alert('Gagal: '+JSON.stringify(newRec));
  }catch(e){ alert('Error: '+e.message); }
  finally{ if(btn){ btn.textContent='Cipta Bilik'; btn.disabled=false; } }
}
function openAddLocationModal(){ const loc=prompt('Nama Lokasi baru:'); if(loc&&loc.trim()){ const up=loc.trim().toUpperCase(); if(!customLocations.includes(up)) customLocations.push(up); localStorage.setItem('effah_custom_locations',JSON.stringify(customLocations)); activeLocation=up; localStorage.setItem('effah_active_location',activeLocation); renderLocationTabs(); renderRoomingGrid(); } }
function deleteCustomLocation(loc){ if(!confirm(`Padam ${loc}?`)) return; customLocations=customLocations.filter(l=>l!==loc); localStorage.setItem('effah_custom_locations',JSON.stringify(customLocations)); if(activeLocation===loc) activeLocation='MEKAH'; renderLocationTabs(); renderRoomingGrid(); }
function openCopyRoomsModal(){
  const m=document.getElementById('copyRoomsModal'); if(!m) return; const list=document.getElementById('copySourceList');
  const allLocs=['MEKAH','MADINAH','TAIF','JEDDAH',...customLocations].filter(l=>l!==activeLocation);
  const counts={}; allRoomingRecords.forEach(r=>{ const l=(r.fields['LOKASI / CITY']||'MEKAH').toUpperCase(); counts[l]=(counts[l]||0)+1; });
  list.innerHTML=allLocs.map(loc=>`<label class="flex items-center gap-2 p-2 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50"><input type="radio" name="copySource" value="${loc}"><span class="text- font-bold">📍 ${loc} (${counts[loc]||0} bilik)</span></label>`).join('')||'<div class="text- text-slate-400">Tiada lokasi</div>';
  document.getElementById('copyTargetLoc').textContent=activeLocation; m.classList.remove('hidden');
}
function closeCopyRoomsModal(){ document.getElementById('copyRoomsModal').classList.add('hidden'); }
async function executeCopyRooms(){
  const sel=document.querySelector('input[name="copySource"]:checked'); if(!sel) return alert('Pilih sumber');
  const src=sel.value; const srcRooms=allRoomingRecords.filter(r=>(r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===src);
  if(srcRooms.length===0) return alert('Tiada bilik di '+src);
  if(!confirm(`Copy ${srcRooms.length} bilik dari ${src} ke ${activeLocation}?`)) return;
  const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base')||localStorage.getItem('effah_base_id'); const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat'); const tripId=localStorage.getItem('effah_active_trip_id')||localStorage.getItem('selectedTripId')||localStorage.getItem('effah_last_selected_trip');
  let created=0;
  for(let r of srcRooms){
    const f=r.fields; const cap=f['KAPASITI']||4; const newRoomId=generateRoomIdFromCap(cap);
    const payload={fields:{'Room ID / Nama Bilik':newRoomId,'PAKEJ / HOTEL':f['PAKEJ / HOTEL']||'EKONOMI','KAPASITI':cap,'HOTEL NAME':f['HOTEL NAME']||'','CATATAN BILIK':f['CATATAN BILIK']||'','TRIP':[tripId],'LOKASI / CITY':activeLocation,'SORT ORDER':allRoomingRecords.length+1+created}};
    try{
      let res=await fetch(`https://api.airtable.com/v0/${base}/ROOMING%20LIST`,{method:'POST',headers:{Authorization:`Bearer ${pat}`,'Content-Type':'application/json'},body:JSON.stringify(payload)});
      let newRec=await res.json();
      if(newRec.error && (newRec.error.message.includes('not writable') || newRec.error.message.includes('INVALID_VALUE'))){
        delete payload.fields['Room ID / Nama Bilik'];
        const res2=await fetch(`https://api.airtable.com/v0/${base}/ROOMING%20LIST`,{method:'POST',headers:{Authorization:`Bearer ${pat}`,'Content-Type':'application/json'},body:JSON.stringify(payload)});
        newRec=await res2.json();
      }
      if(newRec.id){ allRoomingRecords.push(newRec); created++; }
    }catch(e){ console.error(e); }
  }
  closeCopyRoomsModal(); renderRoomingGrid(); renderLocationTabs(); renderNamelist(); renderStaffList();
  alert(`Berjaya copy ${created} bilik ke ${activeLocation}`);
}
function getStaffStorageKey(){ return `effah_staff_list_${localStorage.getItem('effah_active_trip_id')||'default'}`; }
function loadStaffList(){ staffList=JSON.parse(localStorage.getItem(getStaffStorageKey())||'[]'); renderStaffList(); }
function saveStaffList(){ localStorage.setItem(getStaffStorageKey(),JSON.stringify(staffList)); }
function addNewStaff(){ const input=document.getElementById('newStaffInput'); if(!input) return; let name=input.value.trim().toUpperCase(); if(!name) return; if(!name.includes('(')) name=`${name} (EFFAH)`; const id=`staff_${Date.now()}_${++staffIdCounter}`; localStorage.setItem('effah_staff_counter',staffIdCounter); staffList.push({id,name}); saveStaffList(); renderStaffList(); input.value=''; }
function renderStaffList(){
  const cont=document.getElementById('staffListContainer'); const badge=document.getElementById('staffTotalBadge'); if(!cont) return; if(badge) badge.textContent=staffList.length+' Staff';
  if(staffList.length===0){ cont.innerHTML='<div class="p-3 text-center text- text-slate-400">Tiada staff</div>'; return; }
  cont.innerHTML=staffList.map((s,idx)=>{
    const assigned=isStaffAssigned(s.id); const cls=assigned?'opacity-40 bg-slate-50 pointer-events-none':'bg-white hover:bg-slate-50 cursor-grab'; const drag=assigned?'':`draggable="true" ondragstart="dragStaff(event,'${s.id}')" ondragend="dragStaffEnd(event)"`;
    return `<div ${drag} class="flex items-center justify-between px-3 py-2 rounded-xl border text- ${cls}"><div class="flex gap-2"><span class="text-slate-400">${String(idx+1).padStart(2,'0')}</span><span class="font-medium">${s.name}</span>${assigned?'<span class="ml-1 px-1.5 py-0.5 bg-slate-200 rounded text-">ASSIGNED</span>':''}</div><div class="flex gap-1"><button onclick="quickAssignStaff('${s.id}')" class="w-5 h-5 rounded-full border ${assigned?'opacity-30':'hover:bg-slate-900 hover:text-white'} text-">+</button><button onclick="deleteStaff('${s.id}')" class="w-5 h-5 rounded-full border hover:bg-red-50 text-"><i class="fa-solid fa-trash text-"></i></button></div></div>`;
  }).join('');
}
function isStaffAssigned(staffId){ const s=staffList.find(x=>x.id===staffId); if(!s) return false; return allRoomingRecords.some(r=>(r.fields['STAFF / EXTRA']||'').split(',').map(x=>x.trim()).includes(s.name)); }
function deleteStaff(staffId){ if(!confirm('Padam?')) return; staffList=staffList.filter(s=>s.id!==staffId); saveStaffList(); renderStaffList(); }
function dragStaff(e,staffId){ e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('text/staff-id',staffId); e.dataTransfer.setData('text/plain',staffId); const row=e.currentTarget; if(row) setTimeout(()=>row.style.opacity='0.3',0); }
function dragStaffEnd(e){ e.currentTarget.style.opacity='1'; }
function quickAssignStaff(staffId){ const rooms=allRoomingRecords.filter(r=>(r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===activeLocation); const target=rooms.find(r=>{ const j=r.fields['JEMAAH']?.length||0; const s=(r.fields['STAFF / EXTRA']||'').split(',').filter(Boolean).length; return (j+s)<(r.fields['KAPASITI']||4); }); if(target) assignStaffToRoom(staffId,target.id); }
async function assignStaffToRoom(staffId,roomId){ const staff=staffList.find(s=>s.id===staffId); if(!staff) return; const rec=allRoomingRecords.find(r=>r.id===roomId); if(!rec) return; const cur=(rec.fields['STAFF / EXTRA']||'').trim(); const newVal=cur?cur+','+staff.name:staff.name; await updateRoomField(roomId,'STAFF / EXTRA',newVal,true); }
function removeStaff(roomId,staffName){ const rec=allRoomingRecords.find(r=>r.id===roomId); const arr=(rec.fields['STAFF / EXTRA']||'').split(',').map(s=>s.trim()).filter(s=>s&&s!==staffName); updateRoomField(roomId,'STAFF / EXTRA',arr.join(','),true); }
function generateRoomingPrint(){
  const tripNameRaw=window.selectedTripRecord?.fields?.Trip||document.getElementById('roomingTripSelect')?.selectedOptions[0]?.text||'Trip';
  const tripName=cleanTripNameForRooming(tripNameRaw);
  const rooms=getRoomOrderedList([...allRoomingRecords].filter(r=>(r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===activeLocation.toUpperCase()));
  let namelistRows=allRoomingJemaah.map((j,idx)=>{ const name=getJemaahName(j.fields); const ejen=j.fields['EJEN']||'-'; const board=j.fields['BOARD']||'NO FULLBOARD'; const pakej=j.fields['PAKEJ']||'EKONOMI'; return `<tr><td>${idx+1}</td><td>${name}</td><td>${ejen}</td><td>${board}</td><td>-</td><td>${pakej}</td><td></td></tr>`; }).join('');
  const staffInRooms=[]; rooms.forEach(r=>(r.fields['STAFF / EXTRA']||'').split(',').filter(Boolean).forEach(s=>{ if(!staffInRooms.includes(s)) staffInRooms.push(s); }));
  staffInRooms.forEach(sName=>{ const cleanName=sName.replace(/\(EFFAH\)/i,'').trim(); namelistRows+=`<tr><td>NA</td><td>${cleanName} (EFFAH)</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>`; });
  const roomBlocks=rooms.map(r=>{
    const f=r.fields; const rid=f['Room ID / Nama Bilik']||generateRoomIdFromCap(f['KAPASITI']); const pakej=f['PAKEJ / HOTEL']||'EKONOMI'; const hotel=f['HOTEL NAME']||''; const jIds=f['JEMAAH']||[]; const staff=(f['STAFF / EXTRA']||'').split(',').filter(Boolean);
    let rows=jIds.map((jId,idx)=>{ const rec=allRoomingJemaah.find(j=>j.id===jId); const name=getJemaahName(rec?.fields); return name && name!=='-'? `<div>${idx+1}. ${name}</div>` : ''; }).filter(Boolean).join('');
    staff.forEach((s)=>{ const clean=s.replace(/\(EFFAH\)/i,'').trim(); rows+=`<div>NA ${clean} (EFFAH)</div>`; });
    return `<div style="margin-bottom:18px"><b>${rid} (${pakej}) - ${hotel}</b><div style="margin-left:8px; margin-top:4px; line-height:1.6">${rows||'- Kosong -'}</div></div>`;
  }).join('');
  const html=`<html><head><title>Rooming ${tripName}</title><style>body{font-family:Arial;font-size:10px;margin:15px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #000;padding:3px 5px;font-size:9px}th{background:#eee}.header{display:flex;justify-content:space-between;font-weight:bold;font-size:13px;border-bottom:2px solid #000;padding-bottom:6px;margin-bottom:12px}.container{display:flex;gap:15px}.left{width:68%}.right{width:32%;border-left:1px solid #000;padding-left:10px}@media print{@page{size:A4 landscape;margin:10mm}}</style></head><body><div class="header"><span>NAMELIST ${tripName}</span><span>ROOMING LIST ${tripName}</span></div><div class="container"><div class="left"><table><tr><th>NO</th><th>NAMA JEMAAH</th><th>EJEN</th><th>FULLBOARD</th><th>TRAIN</th><th>PAKEJ</th><th>INSURAN</th></tr>${namelistRows}</table></div><div class="right">${roomBlocks}</div></div><script>window.onload=function(){setTimeout(()=>window.print(),300)}</script></body></html>`;
  const w=window.open('','_blank'); if(w){ w.document.write(html); w.document.close(); }
}
async function autoAssignRooming(){ if(!confirm('Auto assign semua jemaah Belum Assign ke '+activeLocation+'?')) return; let rooms=[...allRoomingRecords].filter(r=>(r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===activeLocation.toUpperCase()); if(rooms.length===0) rooms=[...allRoomingRecords]; rooms=getRoomOrderedList(rooms); const unassigned=allRoomingJemaah.filter(j=>!isJemaahAssigned(j.id)); let idx=0; for(let room of rooms){ const cap=room.fields['KAPASITI']||roomingDefaultCap; const staffCount=(room.fields['STAFF / EXTRA']||'').split(',').filter(Boolean).length; let cur=[...(room.fields['JEMAAH']||[])]; while((cur.length+staffCount)<cap && idx<unassigned.length){ cur.push(unassigned[idx].id); idx++; } if(cur.length!==(room.fields['JEMAAH']||[]).length){ await updateRoomField(room.id,'JEMAAH',cur,false); } } setTimeout(fetchRoomingData,800); }
