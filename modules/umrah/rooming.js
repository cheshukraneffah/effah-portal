// ROOMING V11 - Fixed Trip Matching & Unassigned Jemaah Display
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
  const skeletonGrid = `<div class="col-span-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse"><div class="h-44 bg-slate-100 rounded-2xl border border-slate-200 p-4 space-y-3"><div class="h-5 bg-slate-200 rounded w-1/3"></div><div class="h-4 bg-slate-200 rounded w-2/3"></div><div class="h-10 bg-slate-200 rounded"></div></div><div class="h-44 bg-slate-100 rounded-2xl border border-slate-200 p-4 space-y-3"><div class="h-5 bg-slate-200 rounded w-1/3"></div><div class="h-4 bg-slate-200 rounded w-2/3"></div><div class="h-10 bg-slate-200 rounded"></div></div></div>`;
  if(list) list.innerHTML = skeletonList;
  if(grid) grid.innerHTML = skeletonGrid;
}

function renderRoomingHTML(){
  const container = document.getElementById('modul-rooming');
  if(!container) return;

  container.innerHTML = `
    <div class="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto p-4 sm:p-6 font-sans">
      <div class="w-full lg:w-80 shrink-0 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[calc(100vh-100px)] sticky top-4">
        <div class="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3">
          <div class="flex items-center justify-between">
            <h2 class="font-bold text-slate-800 text-lg flex items-center gap-2">
              <i class="fa-solid fa-users text-emerald-600"></i> Senarai Jemaah
            </h2>
            <span id="unassignedBadge" class="bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full">0 Belum Berbilik</span>
          </div>
          <div class="relative">
            <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
            <input type="text" id="searchRoomingNamelist" oninput="filterRoomingNamelist()" placeholder="Cari nama / passport / ic..." class="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">
          </div>
          <div class="flex items-center justify-between text-xs text-slate-500 gap-1 pt-1">
            <button onclick="filterNamelistTab('all')" id="tabAllJemaah" class="flex-1 py-1 px-2 rounded-lg bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 text-center">Semua</button>
            <button onclick="filterNamelistTab('unassigned')" id="tabUnassignedJemaah" class="flex-1 py-1 px-2 rounded-lg bg-white border border-slate-200 text-center">Belum</button>
            <button onclick="filterNamelistTab('assigned')" id="tabAssignedJemaah" class="flex-1 py-1 px-2 rounded-lg bg-white border border-slate-200 text-center">Sudah</button>
          </div>
        </div>

        <div id="namelistContainer" class="flex-1 overflow-y-auto p-3 space-y-2">
          </div>

        <div class="p-3 border-t border-slate-100 bg-slate-50/50 space-y-2">
          <button onclick="autoAssignJemaah()" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-sm">
            <i class="fa-solid fa-wand-magic-sparkles"></i> Auto Assign Jemaah
          </button>
        </div>
      </div>

      <div class="flex-1 space-y-5">
        <div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-center gap-3 min-w-[280px]">
            <i class="fa-solid fa-plane-departure text-emerald-600 text-xl"></i>
            <div class="flex-1">
              <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pilih Trip Umrah</label>
              <select id="roomingTripSelect" onchange="fetchRoomingData()" class="w-full text-sm font-semibold text-slate-700 bg-transparent focus:outline-none cursor-pointer">
                <option value="">-- Pilih Trip --</option>
              </select>
            </div>
          </div>

          <div class="flex items-center gap-2 flex-wrap">
            <button onclick="addNewRoomModal()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-sm">
              <i class="fa-solid fa-plus"></i> Tambah Bilik
            </button>
            <button onclick="copyRoomsFromLocation()" class="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all">
              <i class="fa-solid fa-copy"></i> Salin Bilik
            </button>
            <button onclick="openPrintPreview()" class="bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-sm">
              <i class="fa-solid fa-print"></i> Cetak / Preview
            </button>
          </div>
        </div>

        <div class="flex items-center justify-between border-b border-slate-200 pb-2 overflow-x-auto gap-2" id="locationTabsContainer">
          </div>

        <div id="roomingGrid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          </div>
      </div>
    </div>
  `;

  populateRoomingTripSelect();
}

function populateRoomingTripSelect(){
  const select = document.getElementById('roomingTripSelect');
  if(!select) return;
  
  let trips = [];
  if(typeof allTripsData !== 'undefined' && Array.isArray(allTripsData)){
    trips = allTripsData;
  } else {
    try { trips = JSON.parse(localStorage.getItem('effah_trips_cache') || '[]'); } catch(e){}
  }

  select.innerHTML = '<option value="">-- Pilih Trip --</option>';
  trips.forEach(t => {
    const rawName = t.fields['NAMA TRIP'] || t.fields['TRIP'] || t.id;
    const cleanName = cleanTripNameForRooming(rawName);
    select.innerHTML += `<option value="${rawName}">${cleanName}</option>`;
  });
}

// FIX UTAMA: Fungsi Fetch Data Rooming & Jemaah
async function fetchRoomingData(){
  const tripSelect = document.getElementById('roomingTripSelect');
  if(!tripSelect || !tripSelect.value){
    allRoomingRecords = [];
    allRoomingJemaah = [];
    renderRoomingGrid();
    renderNamelist();
    return;
  }

  showRoomingLoading();

  const selectedTripRaw = tripSelect.value;
  const selectedTripClean = cleanTripNameForRooming(selectedTripRaw).toUpperCase();

  try {
    const [roomsRes, jemaahRes] = await Promise.all([
      fetch(`${AIRTABLE_BASE_URL}/${AIRTABLE_ROOMING_TABLE}?view=Grid%20view`, { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } }),
      fetch(`${AIRTABLE_BASE_URL}/${AIRTABLE_JEMAAH_TABLE}?view=Grid%20view`, { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } })
    ]);

    const roomsData = await roomsRes.json();
    const jemaahData = await jemaahRes.json();

    // 1. Filter Bilik mengikut Trip yang dipilih
    allRoomingRecords = (roomsData.records || []).filter(r => {
      const t = r.fields['TRIP'] || r.fields['TRIP UMRAH'] || '';
      const rawTrip = Array.isArray(t) ? t.join(' ') : String(t);
      const roomTripClean = cleanTripNameForRooming(rawTrip).toUpperCase();
      return roomTripClean === selectedTripClean || roomTripClean.includes(selectedTripClean) || selectedTripClean.includes(roomTripClean);
    });

    // 2. Filter Jemaah mengikut Trip yang dipilih (matching fleksibel)
    allRoomingJemaah = (jemaahData.records || []).filter(j => {
      const t = j.fields['TRIP'] || j.fields['TRIP UMRAH'] || j.fields['TRIP / PAKEJ'] || '';
      const rawTrip = Array.isArray(t) ? t.join(' ') : String(t);
      if(!rawTrip) return false;
      
      const jTrip = cleanTripNameForRooming(rawTrip).toUpperCase();
      return jTrip === selectedTripClean || jTrip.includes(selectedTripClean) || selectedTripClean.includes(jTrip);
    });

    renderLocationTabs();
    renderRoomingGrid();
    renderNamelist();

  } catch(e) {
    console.error('Ralat memuatkan data rooming:', e);
    const grid = document.getElementById('roomingGrid');
    if(grid) grid.innerHTML = `<div class="col-span-full p-8 text-center text-red-500 font-medium bg-red-50 rounded-2xl border border-red-200">Gagal memuatkan data. Sila pastikan tetapan API Airtable diset dengan betul.</div>`;
  }
}

function renderLocationTabs(){
  const container = document.getElementById('locationTabsContainer');
  if(!container) return;

  const defaultLocs = ['MEKAH', 'MADINAH', 'TAIF', 'JEDDAH'];
  const locs = Array.from(new Set([...defaultLocs, ...customLocations]));

  let html = `<div class="flex items-center gap-2">`;
  locs.forEach(loc => {
    const isActive = activeLocation === loc;
    html += `
      <button onclick="switchLocation('${loc}')" class="px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
        isActive 
          ? 'bg-slate-800 text-white shadow-sm' 
          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
      }">
        ${loc}
      </button>
    `;
  });
  html += `</div>`;

  html += `
    <button onclick="openAddLocationModal()" class="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-all shrink-0">
      <i class="fa-solid fa-plus-circle"></i> Lokasi Baru
    </button>
  `;

  container.innerHTML = html;
}

function switchLocation(loc){
  activeLocation = loc;
  localStorage.setItem('effah_active_location', activeLocation);
  renderLocationTabs();
  renderRoomingGrid();
}

function renderNamelist(filter = 'all', searchQuery = ''){
  const container = document.getElementById('namelistContainer');
  if(!container) return;

  // Dapatkan ID semua jemaah yang dah ada dalam mana-mana bilik
  const assignedJemaahIds = new Set();
  allRoomingRecords.forEach(r => {
    const ids = r.fields['JEMAAH'] || [];
    ids.forEach(id => assignedJemaahIds.add(id));
  });

  let list = allRoomingJemaah.filter(j => {
    const isAssigned = assignedJemaahIds.has(j.id);
    if(filter === 'unassigned') return !isAssigned;
    if(filter === 'assigned') return isAssigned;
    return true;
  });

  if(searchQuery){
    const q = searchQuery.toLowerCase();
    list = list.filter(j => {
      const name = (j.fields['NAMA JEMAAH'] || j.fields['NAMA'] || '').toLowerCase();
      const ic = (j.fields['NO IC'] || '').toLowerCase();
      const pass = (j.fields['NO PASSPORT'] || '').toLowerCase();
      return name.includes(q) || ic.includes(q) || pass.includes(q);
    });
  }

  const unassignedCount = allRoomingJemaah.filter(j => !assignedJemaahIds.has(j.id)).length;
  const badge = document.getElementById('unassignedBadge');
  if(badge) badge.innerText = `${unassignedCount} Belum Berbilik`;

  if(list.length === 0){
    container.innerHTML = `<div class="p-8 text-center text-xs text-slate-400">Tiada jemaah dijumpai.</div>`;
    return;
  }

  container.innerHTML = list.map(j => {
    const name = j.fields['NAMA JEMAAH'] || j.fields['NAMA'] || 'Tanpa Nama';
    const gender = j.fields['GENDER'] || j.fields['JANTINA'] || '';
    const isAssigned = assignedJemaahIds.has(j.id);
    const genderBadge = gender.toUpperCase().startsWith('L') 
      ? `<span class="bg-blue-50 text-blue-600 text-[10px] px-1.5 py-0.5 rounded font-bold">L</span>` 
      : gender.toUpperCase().startsWith('P') 
        ? `<span class="bg-pink-50 text-pink-600 text-[10px] px-1.5 py-0.5 rounded font-bold">P</span>` 
        : '';

    return `
      <div class="p-2.5 rounded-xl border ${isAssigned ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-slate-200 hover:border-emerald-300'} transition-all flex items-center justify-between text-xs gap-2">
        <div class="flex items-center gap-2 overflow-hidden">
          ${genderBadge}
          <span class="font-semibold text-slate-700 truncate">${name}</span>
        </div>
        <div>
          ${isAssigned 
            ? `<span class="text-[10px] text-slate-400 font-medium">Ada Bilik</span>` 
            : `<button onclick="quickAssignJemaah('${j.id}')" class="text-emerald-600 hover:bg-emerald-50 px-2 py-1 rounded-lg text-[11px] font-bold transition-all">+ Add</button>`
          }
        </div>
      </div>
    `;
  }).join('');
}

let activeNamelistTab = 'all';
function filterNamelistTab(tab){
  activeNamelistTab = tab;
  ['All', 'Unassigned', 'Assigned'].forEach(t => {
    const btn = document.getElementById(`tab${t}Jemaah`);
    if(btn){
      if(t.toLowerCase() === tab){
        btn.className = 'flex-1 py-1 px-2 rounded-lg bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 text-center';
      } else {
        btn.className = 'flex-1 py-1 px-2 rounded-lg bg-white border border-slate-200 text-center text-slate-600';
      }
    }
  });
  filterRoomingNamelist();
}

function filterRoomingNamelist(){
  const searchInput = document.getElementById('searchRoomingNamelist');
  const query = searchInput ? searchInput.value : '';
  renderNamelist(activeNamelistTab, query);
}

function renderRoomingGrid(){
  const grid = document.getElementById('roomingGrid');
  if(!grid) return;

  // Filter bilik mengikut lokasi aktif
  const roomsInLocation = allRoomingRecords.filter(r => {
    const loc = (r.fields['LOKASI'] || r.fields['HOTEL LOKASI'] || 'MEKAH').toUpperCase();
    return loc === activeLocation.toUpperCase();
  });

  if(roomsInLocation.length === 0){
    grid.innerHTML = `
      <div class="col-span-full p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300 space-y-3">
        <i class="fa-solid fa-bed text-3xl text-slate-300"></i>
        <p class="text-sm font-medium text-slate-500">Tiada bilik didaftarkan untuk lokasi ${activeLocation}.</p>
        <button onclick="addNewRoomModal()" class="bg-emerald-600 text-white text-xs px-4 py-2 rounded-xl font-semibold hover:bg-emerald-700 transition-all">
          + Tambah Bilik Sekarang
        </button>
      </div>
    `;
    return;
  }

  grid.innerHTML = roomsInLocation.map(room => {
    const roomNo = room.fields['NO BILIK'] || room.fields['ROOM NO'] || 'TBC';
    const capacity = parseInt(room.fields['KAPASITI'] || roomingDefaultCap);
    const jemaahIds = room.fields['JEMAAH'] || [];
    const roomType = room.fields['JENIS BILIK'] || `BILIK ${capacity}`;
    
    // Tarik maklumat jemaah
    const roomJemaah = allRoomingJemaah.filter(j => jemaahIds.includes(j.id));

    return `
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col">
        <div class="p-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div>
            <span class="text-xs font-bold text-slate-800 uppercase tracking-wider block">Bilik ${roomNo}</span>
            <span class="text-[10px] text-slate-500 font-medium">${roomType} (${roomJemaah.length}/${capacity})</span>
          </div>
          <div class="flex items-center gap-1">
            <button onclick="deleteRoomRecord('${room.id}')" class="text-slate-400 hover:text-red-600 p-1 rounded-lg text-xs transition-all">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>

        <div class="p-3 flex-1 space-y-2 min-h-[100px]">
          ${roomJemaah.length === 0 
            ? `<div class="h-full flex items-center justify-center text-[11px] text-slate-400 italic py-6">Bilik Kosong</div>`
            : roomJemaah.map(j => {
                const name = j.fields['NAMA JEMAAH'] || j.fields['NAMA'] || 'Jemaah';
                return `
                  <div class="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <span class="font-medium text-slate-700 truncate">${name}</span>
                    <button onclick="removeJemaahFromRoom('${room.id}', '${j.id}')" class="text-slate-400 hover:text-red-500 text-xs">
                      <i class="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                `;
              }).join('')
          }
        </div>

        <div class="p-2.5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs">
          <span class="text-[10px] text-slate-400">${capacity - roomJemaah.length} Kekosongan</span>
          <button onclick="openSelectJemaahModal('${room.id}')" class="text-emerald-600 hover:text-emerald-700 font-bold text-xs flex items-center gap-1">
            <i class="fa-solid fa-user-plus"></i> Tambah
          </button>
        </div>
      </div>
    `;
  }).join('');
}

async function quickAssignJemaah(jemaahId){
  // Cari bilik pertama yang belum penuh
  const room = allRoomingRecords.find(r => {
    const loc = (r.fields['LOKASI'] || r.fields['HOTEL LOKASI'] || 'MEKAH').toUpperCase();
    if(loc !== activeLocation.toUpperCase()) return false;
    const cap = parseInt(r.fields['KAPASITI'] || roomingDefaultCap);
    const cur = (r.fields['JEMAAH'] || []).length;
    return cur < cap;
  });

  if(!room){
    alert(`Tiada bilik kosong di ${activeLocation}. Sila tambah bilik baru dahulu.`);
    return;
  }

  const currentJemaah = room.fields['JEMAAH'] || [];
  const updatedJemaah = [...currentJemaah, jemaahId];

  await updateRoomField(room.id, 'JEMAAH', updatedJemaah);
}

async function removeJemaahFromRoom(roomId, jemaahId){
  const room = allRoomingRecords.find(r => r.id === roomId);
  if(!room) return;

  const currentJemaah = room.fields['JEMAAH'] || [];
  const updatedJemaah = currentJemaah.filter(id => id !== jemaahId);

  await updateRoomField(roomId, 'JEMAAH', updatedJemaah);
}

async function updateRoomField(roomId, fieldName, value){
  try {
    const res = await fetch(`${AIRTABLE_BASE_URL}/${AIRTABLE_ROOMING_TABLE}/${roomId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: { [fieldName]: value }
      })
    });

    if(res.ok){
      fetchRoomingData();
    } else {
      alert('Gagal mengemas kini bilik.');
    }
  } catch(e) {
    console.error(e);
  }
}

function openAddLocationModal(){
  const loc = prompt('Nama Lokasi baru (contoh: TAIF, JEDDAH):');
  if(loc && loc.trim()){
    const upper = loc.trim().toUpperCase();
    if(!customLocations.includes(upper)){
      customLocations.push(upper);
      localStorage.setItem('effah_custom_locations', JSON.stringify(customLocations));
      activeLocation = upper;
      localStorage.setItem('effah_active_location', activeLocation);
      renderLocationTabs();
      renderRoomingGrid();
    }
  }
}

async function addNewRoomModal(){
  const roomNo = prompt('Masukkan Nombor Bilik (contoh: 101, 202):');
  if(!roomNo) return;

  const tripSelect = document.getElementById('roomingTripSelect');
  if(!tripSelect || !tripSelect.value){
    alert('Sila pilih trip terlebih dahulu.');
    return;
  }

  try {
    const res = await fetch(`${AIRTABLE_BASE_URL}/${AIRTABLE_ROOMING_TABLE}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          'NO BILIK': roomNo,
          'LOKASI': activeLocation,
          'TRIP': [tripSelect.value],
          'KAPASITI': roomingDefaultCap
        }
      })
    });

    if(res.ok){
      fetchRoomingData();
    }
  } catch(e) {
    console.error(e);
  }
}

async function deleteRoomRecord(roomId){
  if(!confirm('Adakah anda pasti untuk memadam bilik ini?')) return;
  try {
    await fetch(`${AIRTABLE_BASE_URL}/${AIRTABLE_ROOMING_TABLE}/${roomId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }
    });
    fetchRoomingData();
  } catch(e){
    console.error(e);
  }
}

function openPrintPreview(){
  window.print();
}
