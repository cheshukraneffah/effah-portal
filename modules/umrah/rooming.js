// ROOMING V12 FINAL FIXED - side-by-side lg, no more ke bawah, blank - fix, light grey + soft maroon
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
  const grid=document.getElementById('roomingGrid'); const list=document.getElementById('namelistContainer');
  grid.innerHTML=`<div class="col-span-2 p-4">Loading...</div>`; list.innerHTML=`<div class="p-4">Loading...</div>`;
}
function renderRoomingHTML(){
  const c=document.getElementById('modul-rooming'); if(!c) return;
  c.innerHTML=`
  <div class="flex flex-col gap-3 p-2">
    <div class="bg-white rounded-2xl border p-3 flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3 text-xs flex-wrap">
        <span class="font-black tracking-widest">ROOMING LIST</span>
        <select id="roomingTripSelect" onchange="onRoomingTripChange(this.value)" class="px-3 py-1.5 border rounded-full bg-white text-xs font-bold min-w-"><option value="">Pilih Trip...</option></select>
        <span id="roomingHeaderCount" class="text-slate-500 text-">0 Bilik</span>
      </div>
      <div class="flex items-center gap-2 text-xs">
        <span id="belumAssignTop" class="px-2.5 py-1 bg-amber-100 rounded-full font-bold">0 Unassigned</span>
        <span id="assignedTop" class="px-2.5 py-1 bg-emerald-50 rounded-full font-bold">0 Assigned</span>
        <button onclick="fetchRoomingData()" class="w-7 h-7 rounded-full border bg-white"><i class="fa-solid fa-rotate"></i></button>
      </div>
    </div>
    <div class="flex flex-col lg:flex-row gap-3">
      <div class="w-full lg:w-[52%] bg-white rounded-2xl border shadow-sm flex flex-col overflow-hidden">
        <div class="p-3 border-b">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-extrabold text- tracking-widest">NAMELIST JEMAAH</h3>
            <div class="flex gap-1.5">
              <span id="belumAssignBadge" class="px-2.5 py-1 bg-amber-100 rounded-full text- font-bold">0 Unassigned</span>
              <span id="totalJemaahBadge" class="px-2.5 py-1 bg-slate-100 border text-slate-700 rounded-full text- font-bold">0 Total</span>
            </div>
          <div class="flex gap-2">
            <div class="relative flex-1">
              <input id="searchRoomingJemaah" onkeyup="filterRoomingNamelist()" placeholder="Cari nama jemaah..." class="w-full text-xs pl-8 pr-3 py-2.5 border rounded-xl bg-slate-50 focus:bg-white">
            </div>
            <select id="filterPakejRooming" onchange="filterRoomingNamelist()" class="text-xs border rounded-xl px-3 py-2.5 bg-white"><option value="">Semua Pakej</option><option>EKONOMI</option><option>PREMIUM</option><option>JIMAT</option></select>
          </div>
        </div>
        <div class="px-3 py-2 bg-slate-50 border-b grid grid-cols-12 text- font-bold text-slate-500"><div class="col-span-1">NO</div><div class="col-span-7">NAMA JEMAAH</div><div class="col-span-1 text-center">BOARD</div><div class="col-span-2 text-center">PAKEJ</div><div class="col-span-1 text-center">+</div></div>
        <div id="namelistContainer" class="flex-1 overflow-y-auto max-h- divide-y"></div>
        <div class="border-t bg-slate-50/50">
          <div class="p-3 flex items-center justify-between"><h4 class="font-extrabold text- tracking-widest">STAFF / EXTRA LIST</h4><span id="staffTotalBadge" class="px-2.5 py-1 bg-slate-100 border text-slate-700 rounded-full text- font-bold">0 Staff</span></div>
          <div class="px-3 pb-3 flex gap-2"><input id="newStaffInput" placeholder="Taip nama staff" class="flex-1 text-xs px-3 py-2 border rounded-xl bg-white"><button onclick="addNewStaff()" class="px-3 py-2 bg-slate-100 border text-slate-700 rounded-xl text-xs font-bold">+ Add</button></div>
          <div id="staffListContainer" class="px-2 pb-3 max-h- overflow-y-auto space-y-1"></div>
        </div>
      </div>
      <div class="w-full lg:w-[48%] flex flex-col gap-3">
        <div class="bg-white rounded-2xl border shadow-sm p-3">
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <div><h3 class="font-extrabold text- tracking-widest">ROOMING LIST</h3><div class="flex items-center gap-2 mt-1 text-"><span id="roomingBiliks" class="px-2.5 py-0.5 bg-slate-100 border text-slate-700 rounded-full font-bold">0 Bilik</span><span id="roomingOccupancy" class="text-slate-500">0 Jemaah + 0 Staff • ${activeLocation}</span></div></div>
            <div class="flex items-center gap-1.5 flex-wrap"><button onclick="generateRoomingPrint()" class="px-3 py-1.5 bg-white border rounded-full text-xs font-bold">Print / PDF</button><button onclick="openCopyRoomsModal()" class="px-3 py-1.5 bg-white border rounded-full text-xs font-bold">Copy Bilik</button><button onclick="autoAssignRooming()" class="px-3 py-1.5 bg-slate-100 border text-slate-700 rounded-full text-xs font-bold">Auto Assign</button><button onclick="openNewRoomModal()" class="px-3 py-1.5 bg-slate-100 border text-slate-700 rounded-full text-xs font-bold">+ Bilik Baru</button></div>
          </div>
          <div id="roomingOverview" class="mt-3 p-3 bg-white border rounded-xl"></div>
          <div id="locationTabs" class="flex flex-wrap gap-1.5 mt-3"></div>
        </div>
        <div id="roomingGrid" class="grid grid-cols-1 lg:grid-cols-2 gap-3 overflow-y-auto max-h- pr-1 content-start"></div>
      </div>
    </div>
  <div id="newRoomModal" class="fixed inset-0 bg-black/50 z-50 hidden flex items-center justify-center p-4"><div class="bg-white rounded-2xl p-5 max-w-sm w-full"><h3 class="font-bold mb-4 text-sm">Tambah Bilik Baru</h3><div class="space-y-3 text-xs"><input id="newRoomId" placeholder="Room ID" class="w-full p-2.5 border rounded-xl"><select id="newRoomLokasi" class="w-full p-2.5 border rounded-xl"><option>MEKAH</option><option>MADINAH</option><option>TAIF</option><option>JEDDAH</option></select><select id="newRoomPakej" class="w-full p-2.5 border rounded-xl"><option>EKONOMI</option><option>PREMIUM</option><option>JIMAT</option></select><input id="newRoomHotel" placeholder="Hotel Name" class="w-full p-2.5 border rounded-xl"><div class="flex gap-2"><input id="newRoomCap" type="number" value="4" class="flex-1 p-2.5 border rounded-xl"><span class="py-2.5">Kapasiti</span></div><textarea id="newRoomNote" placeholder="Catatan..." class="w-full p-2.5 border rounded-xl h-16"></textarea><div class="flex gap-2 pt-2"><button onclick="closeNewRoomModal()" class="flex-1 py-2.5 bg-slate-100 border rounded-xl font-bold">Batal</button><button onclick="submitNewRoom()" class="flex-1 py-2.5 bg-slate-100 border rounded-xl font-bold">Cipta Bilik</button></div></div></div></div>
  <div id="copyRoomsModal" class="fixed inset-0 bg-black/50 z-50 hidden flex items-center justify-center p-4"><div class="bg-white rounded-2xl p-5 max-w-sm w-full"><h3 class="font-bold mb-2 text-sm">Copy Bilik dari Lokasi Lain</h3><p class="text- text-slate-500 mb-4">Copy ke <b id="copyTargetLoc">${activeLocation}</b></p><div id="copySourceList" class="space-y-2 mb-4"></div><div class="flex gap-2"><button onclick="closeCopyRoomsModal()" class="flex-1 py-2.5 bg-slate-100 border rounded-xl font-bold text-xs">Batal</button><button onclick="executeCopyRooms()" class="flex-1 py-2.5 bg-slate-100 border rounded-xl font-bold text-xs">Copy</button></div></div></div>
  `;
  populateRoomingTripDropdown(); renderLocationTabs(); fetchRoomingData();
}
//... (semua function lain sama, cuma ganti getJemaahName dan warna + drag scroll)
function getRoomOrderKey(){ return `effah_room_order_${localStorage.getItem('effah_active_trip_id')||'default'}_${activeLocation}`; }
function getRoomOrderedList(rooms){ return [...rooms].sort((a,b)=>(a.fields['SORT ORDER']||9999)-(b.fields['SORT ORDER']||9999)); }
function saveRoomOrder(ids){ localStorage.setItem(getRoomOrderKey(), JSON.stringify(ids)); }
function setActiveLocation(loc){ activeLocation=loc.toUpperCase(); localStorage.setItem('effah_active_location', activeLocation); renderLocationTabs(); renderRoomingGrid(); }
function renderLocationTabs(){
  const container=document.getElementById('locationTabs'); if(!container) return;
  const base=['MEKAH','MADINAH','TAIF']; const all=[...base,...customLocations.filter(l=>!base.includes(l))];
  const counts={}; all.forEach(l=>counts[l]=0); allRoomingRecords.forEach(r=>{ const l=(r.fields['LOKASI / CITY']||'').toUpperCase(); if(counts[l]!==undefined) counts[l]++; });
  let html=all.map(loc=>{
    const active=loc===activeLocation; const c=counts[loc]||0; const label=loc==='MEKAH'?'🕋 MEKAH':loc==='MADINAH'?'🕌 MADINAH':loc==='TAIF'?'⛰️ TAIF':'📍 '+loc;
    const wrap=active?'bg-slate-800 rounded-full':'bg-white rounded-full border border-slate-200';
    return `<div class="inline-flex items-center ${wrap}"><button onclick="setActiveLocation('${loc}')" class="px-3 py-1 rounded-full text- font-bold ${active?'text-white':'text-slate-700'}">${label} (${c})</button></div>`;
  }).join('');
  html+=`<button onclick="openAddLocationModal()" class="px-3 py-1 rounded-full text- font-bold bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200">+ Lokasi</button>`;
  container.innerHTML=html;
}
//... fetch, renderNamelist guna getJemaahName, renderRoomingGrid warna light grey #F5 + staff #FADBD8, drag scroll, copy, print NA fix sama seperti V11
