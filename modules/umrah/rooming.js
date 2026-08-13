// ROOMING MODULE V4.5 - Fix trip dropdown clean + sort + remove SEMUA/Tanpa Lokasi default
let allRoomingRecords = [];
let allRoomingJemaah = [];
let activeLocation = 'MEKAH';
let roomingDefaultCap = 3;
let customLocations = [];

function cleanTripNameForRooming(name){
  if(!name) return 'TBC';
  if(typeof cleanTripName==='function') return cleanTripName(name);
  return name.replace(/^\s*\d+\/\d+\s*\|\s*/i, '').replace(/^\s*\d+\/\d+\s*/i,'').trim();
}

document.addEventListener('DOMContentLoaded', () => {
  if(document.getElementById('modul-rooming')) renderRoomingHTML();
});

function renderRoomingHTML(){
  const c = document.getElementById('modul-rooming');
  if(!c) return;
  c.innerHTML = `
  <div class="flex flex-col gap-3 p-2">
    <div class="bg-white rounded-2xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3 text-xs flex-wrap">
        <span class="font-black tracking-widest text-slate-800">ROOMING MODULE V2</span>
        <select id="roomingTripSelect" onchange="onRoomingTripChange(this.value)" class="px-3 py-1.5 border border-slate-300 rounded-full bg-white text-xs font-bold min-w-[240px] max-w-[320px] truncate">
          <option value="">Pilih Trip...</option>
        </select>
        <span id="roomingHeaderCount" class="text-slate-500 text-[11px]">0 Bilik</span>
      </div>
      <div class="flex items-center gap-2 text-xs">
        <span id="belumAssignTop" class="px-2.5 py-1 bg-amber-100 rounded-full font-bold">0 Belum</span>
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
              <span id="belumAssignBadge" class="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-[11px] font-bold">0 Belum</span>
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
          <div class="col-span-1">NO</div><div class="col-span-5">NAMA JEMAAH</div><div class="col-span-1 text-center">BOARD</div><div class="col-span-1 text-center">TRAIN</div><div class="col-span-2 text-center">PAKEJ</div><div class="col-span-1 text-center">INSUR</div><div class="col-span-1 text-center">+</div>
        </div>
        <div id="namelistContainer" class="flex-1 overflow-y-auto max-h-[78vh] divide-y divide-slate-50">
          <div class="p-8 text-center text-xs text-slate-400">Pilih Trip dari dropdown di atas</div>
        </div>
      </div>

      <div class="w-full xl:w-[48%] flex flex-col gap-3">
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-3">
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h3 class="font-extrabold text-[11px] tracking-widest">ROOMING LIST <span id="roomingTripName">-</span></h3>
              <div class="flex items-center gap-2 mt-1 text-[11px]">
                <span id="roomingBiliks" class="px-2.5 py-0.5 bg-slate-900 text-white rounded-full font-bold">0 Bilik</span>
                <span id="roomingOccupancy" class="text-slate-500">0 Jemaah + 0 Staff • Auto-save</span>
              </div>
            </div>
            <div class="flex items-center gap-1.5">
              <div class="flex items-center gap-1 px-2 py-1 bg-slate-50 rounded-full border text-xs"><span>Default</span><button onclick="changeDefaultCap(-1)" class="w-5 h-5 rounded-full bg-white border">−</button><span id="defaultCapLabel" class="font-bold w-4 text-center">3</span><button onclick="changeDefaultCap(1)" class="w-5 h-5 rounded-full bg-white border">+</button></div>
              <button onclick="autoAssignRooming()" class="px-3 py-1.5 bg-slate-900 text-white rounded-full text-xs font-bold">Auto Assign</button>
              <button onclick="openNewRoomModal()" class="px-3 py-1.5 bg-white border rounded-full text-xs font-bold">+ Bilik Baru</button>
            </div>
          </div>
          <div id="locationTabs" class="flex flex-wrap gap-1.5 mt-3">
            <!-- dynamic tabs injected by JS -->
          </div>
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

function renderLocationTabs(){
  const container = document.getElementById('locationTabs');
  if(!container) return;
  const baseLocations = ['MEKAH','MADINAH','TAIF'];
  const allLocs = [...baseLocations, ...customLocations.filter(l=>!baseLocations.includes(l))];
  // count per location
  const counts = {};
  allLocs.forEach(l=>counts[l]=0);
  allRoomingRecords.forEach(r=>{
    const l = (r.fields['LOKASI / CITY']||'').trim().toUpperCase();
    if(!l) return;
    if(counts[l]!==undefined) counts[l]++; else { counts[l]=1; if(!allLocs.includes(l)) allLocs.push(l); }
  });
  // also check customLocations from records
  allRoomingRecords.forEach(r=>{
    const l = (r.fields['LOKASI / CITY']||'').trim().toUpperCase();
    if(l && !allLocs.includes(l) && l!==''){ allLocs.push(l); counts[l]=(counts[l]||0)+1; }
  });

  let html = allLocs.map(loc=>{
    const label = loc==='MEKAH'?'🕋 MEKAH': loc==='MADINAH'?'🕌 MADINAH': loc==='TAIF'?'🏕️ TAIF': loc==='JEDDAH'?'🏙️ JEDDAH': '📍 '+loc;
    const c = counts[loc]||0;
    const active = loc===activeLocation;
    const cls = active ? 'bg-slate-900 text-white border border-slate-900' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50';
    return `<button onclick="setActiveLocation('${loc}')" data-loc="${loc}" class="loc-tab px-3 py-1 rounded-full text-[11px] font-bold ${cls}">${label} (${c})</button>`;
  }).join('');
  html += `<button onclick="openAddLocationModal()" class="px-3 py-1 rounded-full text-[11px] font-bold border-dashed border border-slate-300 text-slate-500 hover:bg-slate-50">+ Lokasi</button>`;
  container.innerHTML = html;
}

async function fetchRoomingData(){
  try{
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

    const roomUrl = `https://api.airtable.com/v0/${base}/ROOMING%20LIST?filterByFormula=SEARCH("${tripId}",ARRAYJOIN({TRIP}))&pageSize=100`;
    const jUrl = `https://api.airtable.com/v0/${base}/DATA%20JEMAAH%20UMRAH?filterByFormula=SEARCH("${tripId}",ARRAYJOIN({TRIP}))&pageSize=100`;

    const [rRes, jRes] = await Promise.all([
      fetch(roomUrl, {headers:{Authorization:`Bearer ${pat}`}}),
      fetch(jUrl, {headers:{Authorization:`Bearer ${pat}`}})
    ]);
    const rData = await rRes.json();
    const jData = await jRes.json();
    allRoomingRecords = rData.records || [];
    allRoomingJemaah = jData.records || [];

    // update customLocations from existing records that are not base
    const baseSet = ['MEKAH','MADINAH','TAIF','JEDDAH'];
    allRoomingRecords.forEach(r=>{
      const l = (r.fields['LOKASI / CITY']||'').trim().toUpperCase();
      if(l && !baseSet.includes(l) && !customLocations.includes(l)) customLocations.push(l);
    });

    const tripLabelRaw = window.selectedTripRecord?.fields?.Trip || window.selectedTripRecord?.fields?.['TRIP NAME'] || 'Trip';
    const tripLabel = cleanTripNameForRooming(tripLabelRaw);
    const elTripName = document.getElementById('roomingTripName'); if(elTripName) elTripName.textContent = tripLabel;

    renderNamelist();
    renderRoomingGrid();
    renderLocationTabs();
  }catch(e){ console.error('fetchRooming error', e); }
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
  fetchRoomingData();
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
    try{ belumAll = allRoomingJemaah.filter(r=> !isJemaahAssigned(r.id, null)).length; }catch(e){}
    const elTotal = document.getElementById('totalJemaahBadge'); if(elTotal) elTotal.textContent = total + ' Total';
    const elBelum = document.getElementById('belumAssignBadge'); if(elBelum) elBelum.textContent = belumAll + ' Belum';
    const elBelumTop = document.getElementById('belumAssignTop'); if(elBelumTop) elBelumTop.textContent = belumAll + ' Belum';
    const elAssignedTop = document.getElementById('assignedTop'); if(elAssignedTop) elAssignedTop.textContent = (total - belumAll) + ' Assigned';

    if(total===0){
      cont.innerHTML = '<div class="p-8 text-center text-xs text-slate-400">Tiada jemaah untuk trip ini<br>Check link TRIP di DATA JEMAAH UMRAH</div>';
      return;
    }

    cont.innerHTML = filtered.map((r,i)=>{
      const f = r.fields;
      const name = f['NAMA']||f['NAME']||'-';
      const boardRaw = (f['BOARD']||f['FULLBOARD']||'').toString();
      const isFB = boardRaw.toUpperCase().includes('FB') || boardRaw.toUpperCase().includes('FULL');
      const trainRaw = (f['TRAIN']||f['SPEED TRAIN']||'').toString();
      const isTR = trainRaw.toUpperCase().includes('TR') || trainRaw.toUpperCase().includes('SPEED');
      const pakej = f['PAKEJ']||'EKONOMI';
      const insur = f['INSURAN'] ? true : false;
      const pakejCls = pakej.includes('PREMIUM')?'bg-blue-50 text-blue-700 border-blue-200': pakej.includes('JIMAT')?'bg-amber-50 text-amber-700 border-amber-200':'bg-slate-100 text-slate-700 border-slate-200';
      return `<div draggable="true" ondragstart="dragJemaah(event,'${r.id}')" class="grid grid-cols-12 items-center px-3 py-2.5 hover:bg-slate-50 text-xs cursor-grab border-b border-slate-50 last:border-0">
        <div class="col-span-1 flex items-center gap-1 text-slate-400"><i class="fa-solid fa-grip text-[10px]"></i> ${String(i+1).padStart(2,'0')}</div>
        <div class="col-span-5 font-semibold truncate" title="${name}">${name}</div>
        <div class="col-span-1 text-center"><span class="inline-flex w-7 justify-center px-1.5 py-0.5 rounded-full text-[10px] border font-bold ${isFB?'bg-emerald-50 text-emerald-700 border-emerald-200':'bg-slate-50 text-slate-400 border-slate-200'}">${isFB?'FB':'-'}</span></div>
        <div class="col-span-1 text-center"><span class="inline-flex w-6 justify-center px-1.5 py-0.5 rounded-full text-[10px] border font-bold ${isTR?'bg-blue-50 text-blue-700 border-blue-200':'bg-slate-50 text-slate-400 border-slate-200'}">${isTR?'TR':'-'}</span></div>
        <div class="col-span-2 text-center"><span class="px-2 py-0.5 rounded-full text-[10px] border font-bold ${pakejCls}">${pakej}</span></div>
        <div class="col-span-1 text-center"><span class="w-5 h-5 inline-flex items-center justify-center rounded-full ${insur?'bg-slate-900 text-white':'bg-slate-100 text-slate-400'} text-[10px]">${insur?'✔':'✕'}</span></div>
        <div class="col-span-1 text-center"><button onclick="quickAssign('${r.id}')" class="w-6 h-6 rounded-full border border-slate-300 hover:bg-slate-900 hover:text-white text-[10px] font-bold">+</button></div>
      </div>`;
    }).join('') || '<div class="p-8 text-center text-slate-400 text-xs">Tiada jemaah ditemui</div>';
  }catch(e){ console.error('renderNamelist error', e); cont.innerHTML = '<div class="p-4 text-xs text-red-500">Error: '+e.message+'</div>'; }
}

function isJemaahAssigned(jId, loc){
  if(!loc || loc==='SEMUA') return allRoomingRecords.some(r=> (r.fields['JEMAAH']||[]).includes(jId));
  return allRoomingRecords.filter(r=> (r.fields['LOKASI / CITY']||'').toUpperCase()===loc.toUpperCase()).some(r=> (r.fields['JEMAAH']||[]).includes(jId));
}

function renderRoomingGrid(){
  const grid = document.getElementById('roomingGrid');
  if(!grid) return;
  let rooms = [...allRoomingRecords].filter(r=>{
    const l = (r.fields['LOKASI / CITY']||'').trim().toUpperCase();
    if(!l) return activeLocation==='MEKAH'; // default tanpa lokasi masuk MEKAH untuk elak hilang
    return l===activeLocation.toUpperCase();
  });
  const elBiliks = document.getElementById('roomingBiliks'); if(elBiliks) elBiliks.textContent = rooms.length+' Bilik';
  const totalJ = rooms.reduce((s,r)=> s+(r.fields['JEMAAH']?.length||0),0);
  const totalStaff = rooms.reduce((s,r)=> { const staff = r.fields['STAFF / EXTRA']||''; return s + (staff ? staff.split(',').filter(Boolean).length : 0); },0);
  const elOcc = document.getElementById('roomingOccupancy'); if(elOcc) elOcc.textContent = `${totalJ} Jemaah + ${totalStaff} Staff • ${activeLocation}`;

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
    const lokasi = f['LOKASI / CITY']||activeLocation;
    const staffRaw = f['STAFF / EXTRA']||'';
    const staffArr = staffRaw ? staffRaw.split(',').map(s=>s.trim()).filter(Boolean) : [];
    const jemaahIds = f['JEMAAH']||[];
    const count = jemaahIds.length;
    const status = f['STATUS BILIK']|| (count===0?'🔴 Kosong': count<cap?'🟡 Ada Slot': count===cap?'🟢 Penuh':'⚠ Overbook!');
    const statusCls = status.includes('Kosong')?'bg-slate-100 text-slate-600': status.includes('Ada Slot')?'bg-amber-50 text-amber-700 border border-amber-200': status.includes('Penuh')?'bg-emerald-50 text-emerald-700 border border-emerald-200':'bg-red-50 text-red-700 border border-red-200';
    const pakejDot = pakej==='PREMIUM'?'bg-blue-500': pakej==='JIMAT'?'bg-amber-500':'bg-slate-500';
    const slots = Array.from({length:cap}).map((_,i)=>{
      const jId = jemaahIds[i];
      if(jId){
        const jRec = allRoomingJemaah.find(j=>j.id===jId);
        const jName = jRec?.fields?.['NAMA']||jRec?.fields?.NAME||jId.slice(0,8);
        return `<div class="group flex items-center justify-between px-2.5 py-2 bg-slate-900 text-white rounded-xl text-[11px]"><span class="truncate font-medium">${jName}</span><button onclick="removeJemaahFromRoom('${rec.id}','${jId}')" class="ml-2 opacity-70 hover:opacity-100"><i class="fa-solid fa-xmark text-[10px]"></i></button></div>`;
      } else {
        return `<div ondragover="allowDrop(event)" ondrop="dropJemaah(event,'${rec.id}')" class="px-2 py-2 border border-dashed border-slate-300 rounded-xl text-[11px] text-slate-400 text-center hover:border-slate-900 hover:text-slate-900 cursor-pointer">Slot Kosong ${i+1}</div>`;
      }
    }).join('');
    return `<div class="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm flex flex-col gap-2.5 h-fit">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2"><span class="font-bold text-sm tracking-wide">${roomId}</span><button onclick="editRoomId('${rec.id}')" class="text-slate-400 hover:text-slate-900"><i class="fa-solid fa-pen text-[11px]"></i></button><span class="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold border">${pakej}</span></div>
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
        <div class="flex items-center justify-between"><span class="text-[10px] font-bold tracking-widest text-slate-600">STAFF / EXTRA</span><button onclick="addStaff('${rec.id}')" class="px-2.5 py-1 border rounded-full text-[10px] font-bold hover:bg-slate-900 hover:text-white">+ Add Staff/Custom</button></div>
        <div class="flex flex-wrap gap-1">${staffArr.map(s=>`<span class="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-[10px] font-medium">${s}<button onclick="removeStaff('${rec.id}','${s.replace(/'/g,"\\'")}')" class="w-3 h-3 rounded-full bg-amber-200 flex items-center justify-center">✕</button></span>`).join('')||'<span class="text-[10px] text-slate-400">Tiada staff</span>'}</div>
        <div class="flex items-start gap-1.5 text-[11px]"><i class="fa-regular fa-note-sticky mt-0.5 text-slate-400"></i><input id="note-${rec.id}" value="${note.replace(/"/g,'&quot;')}" onchange="updateRoomField('${rec.id}','CATATAN BILIK',this.value)" placeholder="+ Tambah catatan" class="flex-1 bg-transparent outline-none text-[11px] placeholder:text-slate-400"></div>
      </div>
      <div class="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div class="h-full bg-slate-900 transition-all" style="width:${cap>0?Math.min(100,(count/cap)*100):0}%"></div></div>
    </div>`;
  }).join('');
}

function setActiveLocation(loc){ activeLocation=loc.toUpperCase(); renderLocationTabs(); renderNamelist(); renderRoomingGrid(); }
function filterRoomingNamelist(){ renderNamelist(); }
function allowDrop(e){ e.preventDefault(); }
function dragJemaah(e,jId){ e.dataTransfer.setData('text/plain', jId); }
function dropJemaah(e,roomId){ e.preventDefault(); const jId = e.dataTransfer.getData('text/plain'); if(jId) assignJemaahToRoom(jId,roomId); }
function quickAssign(jId){
  let rooms = [...allRoomingRecords].filter(r=> (r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===activeLocation);
  if(rooms.length===0) rooms = [...allRoomingRecords];
  const target = rooms.find(r=> (r.fields['JEMAAH']||[]).length < (r.fields['KAPASITI']||roomingDefaultCap));
  if(target) assignJemaahToRoom(jId,target.id); else alert('Tiada slot kosong di ' + activeLocation + '. Tambah bilik baru.');
}
async function assignJemaahToRoom(jId, roomId){
  const rec = allRoomingRecords.find(r=>r.id===roomId);
  if(!rec) return;
  const cur = rec.fields['JEMAAH']||[];
  if(cur.includes(jId)){ alert('Jemaah sudah ada dalam bilik ini'); return; }
  if(cur.length >= (rec.fields['KAPASITI']||roomingDefaultCap) && !confirm('Bilik penuh, tambah overbook?')) return;
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
  if(!confirm(`Padam bilik ${roomName}?\nJemaah akan jadi Belum Assign.`)) return;
  const base = window.AIRTABLE_BASE_ID || window.APP_CONFIG?.AIRTABLE_BASE_ID || localStorage.getItem('effah_api_base') || localStorage.getItem('effah_base_id');
  const pat = window.AIRTABLE_PAT || window.APP_CONFIG?.AIRTABLE_PAT || localStorage.getItem('effah_api_pat');
  try{
    await fetch(`https://api.airtable.com/v0/${base}/ROOMING%20LIST/${roomId}`,{method:'DELETE',headers:{Authorization:`Bearer ${pat}`}});
    allRoomingRecords = allRoomingRecords.filter(r=>r.id!==roomId);
    renderRoomingGrid(); renderNamelist(); renderLocationTabs();
  }catch(e){ alert('Gagal padam: '+e.message); }
}
function openNewRoomModal(){ document.getElementById('newRoomModal').classList.remove('hidden'); document.getElementById('newRoomLokasi').value = activeLocation; document.getElementById('newRoomCap').value = roomingDefaultCap; }
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
  const payload = {fields:{'Room ID / Nama Bilik':roomId,'PAKEJ / HOTEL':pakej,'KAPASITI':cap,'HOTEL NAME':hotel||'','CATATAN BILIK':note||'','TRIP':[tripId],'LOKASI / CITY':lokasi}};
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
  const unassigned = allRoomingJemaah.filter(j=> !isJemaahAssigned(j.id, null));
  let idx=0;
  for(let room of rooms){
    const cap = room.fields['KAPASITI']||roomingDefaultCap;
    let cur = [...(room.fields['JEMAAH']||[])];
    while(cur.length < cap && idx < unassigned.length){ cur.push(unassigned[idx].id); idx++; }
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
    if(['MEKAH','MADINAH','TAIF','JEDDAH'].includes(upper) || confirm(`Tambah lokasi baru "${upper}"?`)){
      if(!customLocations.includes(upper)) customLocations.push(upper);
      activeLocation = upper;
      renderLocationTabs();
      renderRoomingGrid();
    }
  }
}
