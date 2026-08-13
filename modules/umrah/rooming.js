// ROOMING MODULE V4.1 - Final with Multi-Location, Delete, Compact Namelist
// Airtable ROOMING LIST Fields:
// - Room ID / Nama Bilik (text), JEMAAH (link DATA JEMAAH UMRAH), PAKEJ / HOTEL (select EKONOMI/PREMIUM/JIMAT)
// - KAPASITI (number), JUMLAH JEMAAH (count), STATUS BILIK (formula)
// - TRIP (link PAKEJ UMRAH), LOKASI / CITY (select MEKAH/MADINAH/TAIF/JEDDAH), HOTEL NAME (text), CATATAN BILIK (long), STAFF / EXTRA (long)

let allRoomingRecords = [];
let allRoomingJemaah = [];
let activeLocation = 'TANPA'; // default show Tanpa Lokasi dulu sebab user biar kosong
let roomingDefaultCap = 4;

document.addEventListener('DOMContentLoaded', () => {
  if(document.getElementById('modul-rooming')) renderRoomingHTML();
  // hook to trip change
  window.addEventListener('tripChanged', fetchRoomingData);
});

function renderRoomingHTML(){
  const c = document.getElementById('modul-rooming');
  if(!c) return;
  c.innerHTML = `
  <div class="flex flex-col gap-3 p-2">
    <div class="bg-white rounded-2xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-2 text-xs">
        <span class="font-black tracking-widest text-slate-800">ROOMING MODULE V2</span>
        <span id="roomingTripLabel" class="text-slate-500">07-19 JULAI 2026 • 22 Jemaah • <span id="roomingHeaderCount">6 Bilik</span></span>
      </div>
      <div class="flex items-center gap-2 text-xs">
        <span id="belumAssignTop" class="px-2.5 py-1 bg-amber-100 rounded-full font-bold">12 Belum Assign</span>
        <span id="assignedTop" class="px-2.5 py-1 bg-emerald-50 rounded-full font-bold">0 Assigned</span>
        <button onclick="fetchRoomingData()" class="w-7 h-7 rounded-full border bg-white"><i class="fa-solid fa-rotate"></i></button>
        <span class="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold">OP</span>
      </div>
    </div>

    <div class="flex flex-col xl:flex-row gap-3">
      <!-- LEFT NAMELIST COMPACT -->
      <div class="w-full xl:w-[52%] bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        <div class="p-3 border-b">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-extrabold text-[11px] tracking-[0.15em] text-slate-700">NAMELIST JEMAAH</h3>
            <div class="flex gap-1.5">
              <span id="belumAssignBadge" class="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-[11px] font-bold">12 Belum</span>
              <span id="totalJemaahBadge" class="px-2.5 py-1 bg-slate-900 text-white rounded-full text-[11px] font-bold">12 Total</span>
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
          <div class="p-8 text-center text-xs text-slate-400">Pilih Trip dulu...</div>
        </div>
      </div>

      <!-- RIGHT ROOMING GRID 2 COLS -->
      <div class="w-full xl:w-[48%] flex flex-col gap-3">
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-3">
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h3 class="font-extrabold text-[11px] tracking-widest">ROOMING LIST <span id="roomingTripName">07-19 JULAI 2026</span></h3>
              <div class="flex items-center gap-2 mt-1 text-[11px]">
                <span id="roomingBiliks" class="px-2.5 py-0.5 bg-slate-900 text-white rounded-full font-bold">5 Bilik</span>
                <span id="roomingOccupancy" class="text-slate-500">0 Jemaah + 0 Staff • Auto-save local</span>
              </div>
            </div>
            <div class="flex items-center gap-1.5">
              <div class="flex items-center gap-1 px-2 py-1 bg-slate-50 rounded-full border text-xs"><span>Default</span><button onclick="changeDefaultCap(-1)" class="w-5 h-5 rounded-full bg-white border">−</button><span id="defaultCapLabel" class="font-bold w-4 text-center">3</span><button onclick="changeDefaultCap(1)" class="w-5 h-5 rounded-full bg-white border">+</button></div>
              <button onclick="autoAssignRooming()" class="px-3 py-1.5 bg-slate-900 text-white rounded-full text-xs font-bold">Auto Assign</button>
              <button onclick="openNewRoomModal()" class="px-3 py-1.5 bg-white border rounded-full text-xs font-bold">+ Bilik Baru</button>
            </div>
          </div>
          <div id="locationTabs" class="flex flex-wrap gap-1.5 mt-3">
            <button onclick="setActiveLocation('SEMUA')" data-loc="SEMUA" class="loc-tab px-3 py-1 rounded-full text-[11px] font-bold bg-white border">SEMUA</button>
            <button onclick="setActiveLocation('TANPA')" data-loc="TANPA" class="loc-tab px-3 py-1 rounded-full text-[11px] font-bold bg-slate-900 text-white">Tanpa Lokasi (0)</button>
            <button onclick="setActiveLocation('MEKAH')" data-loc="MEKAH" class="loc-tab px-3 py-1 rounded-full text-[11px] font-bold bg-white border">🕋 MEKAH (0)</button>
            <button onclick="setActiveLocation('MADINAH')" data-loc="MADINAH" class="loc-tab px-3 py-1 rounded-full text-[11px] font-bold bg-white border">🕌 MADINAH (0)</button>
            <button onclick="setActiveLocation('TAIF')" data-loc="TAIF" class="loc-tab px-3 py-1 rounded-full text-[11px] font-bold bg-white border">⛰️ TAIF</button>
            <button onclick="openAddLocationModal()" class="px-3 py-1 rounded-full text-[11px] font-bold border-dashed border text-slate-500">+ Lokasi</button>
          </div>
        </div>
        <div id="roomingGrid" class="grid grid-cols-1 lg:grid-cols-2 gap-3 overflow-y-auto max-h-[78vh] pr-1 content-start">
          <div class="col-span-2 p-12 text-center text-slate-400 text-xs border border-dashed rounded-2xl">Tiada bilik. Klik + Bilik Baru</div>
        </div>
      </div>
    </div>
  </div>

  <!-- New Room Modal -->
  <div id="newRoomModal" class="fixed inset-0 bg-black/50 z-50 hidden flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl">
      <h3 class="font-bold mb-4 text-sm">Tambah Bilik Baru</h3>
      <div class="space-y-3 text-xs">
        <input id="newRoomId" placeholder="Room ID (B4, M1...)" class="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none">
        <select id="newRoomLokasi" class="w-full p-2.5 border rounded-xl"><option value="">Tanpa Lokasi (default kosong)</option><option>MEKAH</option><option>MADINAH</option><option>TAIF</option><option>JEDDAH</option></select>
        <select id="newRoomPakej" class="w-full p-2.5 border rounded-xl"><option>EKONOMI</option><option>PREMIUM</option><option>JIMAT</option></select>
        <input id="newRoomHotel" placeholder="Hotel Name (SNOOD AJYAD)" class="w-full p-2.5 border rounded-xl">
        <div class="flex gap-2"><input id="newRoomCap" type="number" value="4" min="1" max="8" class="flex-1 p-2.5 border rounded-xl"><span class="py-2.5 text-slate-500">Kapasiti</span></div>
        <textarea id="newRoomNote" placeholder="Catatan bilik..." class="w-full p-2.5 border rounded-xl h-16"></textarea>
        <div class="flex gap-2 pt-2"><button onclick="closeNewRoomModal()" class="flex-1 py-2.5 bg-slate-100 rounded-xl font-bold">Batal</button><button onclick="submitNewRoom()" class="flex-1 py-2.5 bg-slate-900 text-white rounded-xl font-bold">Cipta Bilik</button></div>
      </div>
    </div>
  </div>
  `;
  fetchRoomingData();
}

async function fetchRoomingData(){
  try{
    const tripId = window.selectedTripRecord?.id || localStorage.getItem('effah_active_trip_id') || localStorage.getItem('selectedTripId');
    if(!tripId){
      document.getElementById('namelistContainer').innerHTML='<div class="p-8 text-center text-xs text-slate-400">Pilih Trip di Pakej Umrah dulu</div>';
      return;
    }
    const base = window.AIRTABLE_BASE_ID || window.APP_CONFIG?.AIRTABLE_BASE_ID || localStorage.getItem('effah_api_base') || localStorage.getItem('effah_base_id');
    const pat = window.AIRTABLE_PAT || window.APP_CONFIG?.AIRTABLE_PAT || localStorage.getItem('effah_api_pat');
    if(!base || !pat){ console.warn('Airtable config missing'); return; }

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

    const tripLabel = window.selectedTripRecord?.fields?.['TRIP NAME'] || window.selectedTripRecord?.fields?.Trip || 'Current Trip';
    document.getElementById('roomingTripName').textContent = tripLabel;
    document.getElementById('roomingTripLabel').textContent = tripLabel + ' • ' + allRoomingJemaah.length + ' Jemaah • ' + allRoomingRecords.length + ' Bilik';
    document.getElementById('roomingHeaderCount').textContent = allRoomingRecords.length + ' Bilik';

    renderNamelist();
    renderRoomingGrid();
    updateLocationTabs();
  }catch(e){ console.error('fetchRooming error', e); }
}

function renderNamelist(){
  const cont = document.getElementById('namelistContainer');
  if(!cont) return;
  const q = (document.getElementById('searchRoomingJemaah')?.value||'').toLowerCase();
  const fPakej = document.getElementById('filterPakejRooming')?.value||'';
  let filtered = allRoomingJemaah;
  if(q) filtered = filtered.filter(r=> (r.fields['NAMA']||r.fields['NAME']||'').toLowerCase().includes(q));
  if(fPakej) filtered = filtered.filter(r=> (r.fields['PAKEJ']||'').includes(fPakej));

  const total = allRoomingJemaah.length;
  const belumAll = allRoomingJemaah.filter(r=> !isJemaahAssigned(r.id, null)).length;
  document.getElementById('totalJemaahBadge').textContent = total + ' Total';
  document.getElementById('belumAssignBadge').textContent = belumAll + ' Belum';
  document.getElementById('belumAssignTop').textContent = belumAll + ' Belum Assign';
  document.getElementById('assignedTop').textContent = (total - belumAll) + ' Assigned';

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
    const assignedInfo = getJemaahLocationBadges(r.id);
    const isAssignedLoc = activeLocation==='SEMUA' ? !isJemaahAssigned(r.id,null) : !isJemaahAssigned(r.id, activeLocation);

    return `<div draggable="true" ondragstart="dragJemaah(event,'${r.id}')" class="grid grid-cols-12 items-center px-3 py-2.5 hover:bg-slate-50 text-xs cursor-grab ${!isAssignedLoc ? 'opacity-60' : ''}">
      <div class="col-span-1 flex items-center gap-1 text-slate-400"><i class="fa-solid fa-grip text-[10px]"></i> ${String(i+1).padStart(2,'0')}</div>
      <div class="col-span-5 font-semibold truncate" title="${name}">${name}</div>
      <div class="col-span-1 text-center"><span class="inline-flex w-7 justify-center px-1.5 py-0.5 rounded-full text-[10px] border font-bold ${isFB?'bg-emerald-50 text-emerald-700 border-emerald-200':'bg-slate-50 text-slate-400 border-slate-200'}">${isFB?'FB':'-'}</span></div>
      <div class="col-span-1 text-center"><span class="inline-flex w-6 justify-center px-1.5 py-0.5 rounded-full text-[10px] border font-bold ${isTR?'bg-blue-50 text-blue-700 border-blue-200':'bg-slate-50 text-slate-400 border-slate-200'}">${isTR?'TR':'-'}</span></div>
      <div class="col-span-2 text-center"><span class="px-2 py-0.5 rounded-full text-[10px] border font-bold ${pakejCls}">${pakej}</span></div>
      <div class="col-span-1 text-center"><span class="w-5 h-5 inline-flex items-center justify-center rounded-full ${insur?'bg-slate-900 text-white':'bg-slate-100 text-slate-400'} text-[10px]">${insur?'✔':'✕'}</span></div>
      <div class="col-span-1 text-center"><button onclick="quickAssign('${r.id}')" class="w-6 h-6 rounded-full border border-slate-300 hover:bg-slate-900 hover:text-white text-[10px] font-bold">+</button></div>
    </div>`;
  }).join('') || '<div class="p-8 text-center text-slate-400 text-xs">Tiada jemaah ditemui</div>';
}

function getJemaahLocationBadges(jId){
  const rooms = allRoomingRecords.filter(rec=> (rec.fields['JEMAAH']||[]).includes(jId));
  if(!rooms.length) return '';
  return rooms.map(r=> `${r.fields['LOKASI / CITY']||'Tanpa'}:${r.fields['Room ID / Nama Bilik']||'?'}`).join(' ');
}
function isJemaahAssigned(jId, loc){
  if(!loc || loc==='SEMUA') return allRoomingRecords.some(r=> (r.fields['JEMAAH']||[]).includes(jId));
  if(loc==='TANPA') return allRoomingRecords.filter(r=> !r.fields['LOKASI / CITY']).some(r=> (r.fields['JEMAAH']||[]).includes(jId));
  return allRoomingRecords.filter(r=> (r.fields['LOKASI / CITY']||'')===loc).some(r=> (r.fields['JEMAAH']||[]).includes(jId));
}

function renderRoomingGrid(){
  const grid = document.getElementById('roomingGrid');
  if(!grid) return;
  let rooms = [...allRoomingRecords];
  if(activeLocation!=='SEMUA'){
    if(activeLocation==='TANPA') rooms = rooms.filter(r=> !r.fields['LOKASI / CITY']);
    else rooms = rooms.filter(r=> (r.fields['LOKASI / CITY']||'')===activeLocation);
  }
  document.getElementById('roomingBiliks').textContent = rooms.length+' Bilik';
  const totalJ = rooms.reduce((s,r)=> s+(r.fields['JEMAAH']?.length||0),0);
  const totalStaff = rooms.reduce((s,r)=> {
    const staff = r.fields['STAFF / EXTRA']||''; return s + (staff ? staff.split(',').filter(Boolean).length : 0);
  },0);
  document.getElementById('roomingOccupancy').textContent = `${totalJ} Jemaah + ${totalStaff} Staff • Auto-save`;

  grid.innerHTML = rooms.map(rec=>{
    const f = rec.fields;
    const roomId = f['Room ID / Nama Bilik']||'?';
    const pakej = f['PAKEJ / HOTEL']||'EKONOMI';
    const cap = f['KAPASITI']||roomingDefaultCap;
    const hotel = f['HOTEL NAME']||'';
    const note = f['CATATAN BILIK']||'';
    const lokasi = f['LOKASI / CITY']||'';
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
        return `<div ondragover="allowDrop(event)" ondrop="dropJemaah(event,'${rec.id}',${i})" class="px-2 py-2 border border-dashed border-slate-300 rounded-xl text-[11px] text-slate-400 text-center hover:border-slate-900 hover:text-slate-900 cursor-pointer">Slot Kosong ${i+1}</div>`;
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
        <select onchange="updateRoomField('${rec.id}','LOKASI / CITY',this.value)" class="ml-1 px-1.5 py-0.5 rounded-full text-[10px] border bg-white"><option value="" ${!lokasi?'selected':''}>Tanpa</option><option ${lokasi==='MEKAH'?'selected':''}>MEKAH</option><option ${lokasi==='MADINAH'?'selected':''}>MADINAH</option><option ${lokasi==='TAIF'?'selected':''}>TAIF</option><option ${lokasi==='JEDDAH'?'selected':''}>JEDDAH</option></select>
      </div>
      <div class="space-y-1.5">${slots}</div>
      <div class="pt-2 border-t border-slate-100 space-y-2">
        <div class="flex items-center justify-between"><span class="text-[10px] font-bold tracking-widest text-slate-600">STAFF / EXTRA</span><button onclick="addStaff('${rec.id}')" class="px-2.5 py-1 border rounded-full text-[10px] font-bold hover:bg-slate-900 hover:text-white">+ Add Staff/Custom</button></div>
        <div class="flex flex-wrap gap-1">${staffArr.map(s=>`<span class="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-[10px] font-medium">${s}<button onclick="removeStaff('${rec.id}','${s.replace(/'/g,"\\'")}')" class="w-3 h-3 rounded-full bg-amber-200 flex items-center justify-center">✕</button></span>`).join('')||'<span class="text-[10px] text-slate-400">Tiada staff</span>'}</div>
        <div class="flex items-start gap-1.5 text-[11px]"><i class="fa-regular fa-note-sticky mt-0.5 text-slate-400"></i><input id="note-${rec.id}" value="${note.replace(/"/g,'&quot;')}" onchange="updateRoomField('${rec.id}','CATATAN BILIK',this.value)" placeholder="+ Tambah catatan" class="flex-1 bg-transparent outline-none text-[11px] placeholder:text-slate-400"></div>
      </div>
      <div class="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div class="h-full bg-slate-900 transition-all" style="width:${cap>0?Math.min(100,(count/cap)*100):0}%"></div></div>
    </div>`;
  }).join('') || `<div class="col-span-2 p-12 text-center text-slate-400 text-xs border border-dashed rounded-2xl bg-white">Tiada bilik untuk <b>${activeLocation}</b>.<br><button onclick="openNewRoomModal()" class="mt-3 px-4 py-2 bg-slate-900 text-white rounded-full text-xs">+ Bilik Baru untuk ${activeLocation}</button></div>`;
}

function updateLocationTabs(){
  const counts = {MEKAH:0,MADINAH:0,TAIF:0,JEDDAH:0,TANPA:0,SEMUA:allRoomingRecords.length};
  allRoomingRecords.forEach(r=>{ const l = (r.fields['LOKASI / CITY']||'').trim(); if(!l) counts.TANPA++; else if(counts[l]!==undefined) counts[l]++; else counts[l]= (counts[l]||0)+1; });
  document.querySelectorAll('.loc-tab').forEach(btn=>{
    const loc = btn.dataset.loc;
    if(!loc) return;
    const baseTxt = loc==='SEMUA'?'SEMUA': loc==='TANPA'?'Tanpa Lokasi': loc==='MEKAH'?'🕋 MEKAH': loc==='MADINAH'?'🕌 MADINAH': loc==='TAIF'?'⛰️ TAIF':'🏨 '+loc;
    const c = counts[loc]||0;
    btn.innerHTML = `${baseTxt} (${c})`;
    if(loc===activeLocation){ btn.classList.add('bg-slate-900','text-white'); btn.classList.remove('bg-white','text-slate-700'); } else { btn.classList.remove('bg-slate-900','text-white'); btn.classList.add('bg-white'); }
  });
}

function setActiveLocation(loc){ activeLocation=loc; document.querySelectorAll('.loc-tab').forEach(b=>{ b.classList.remove('bg-slate-900','text-white'); if(b.dataset.loc===loc) b.classList.add('bg-slate-900','text-white'); }); renderNamelist(); renderRoomingGrid(); }
function filterRoomingNamelist(){ renderNamelist(); }
function allowDrop(e){ e.preventDefault(); }
function dragJemaah(e,jId){ e.dataTransfer.setData('text/plain', jId); }
function dropJemaah(e,roomId){ e.preventDefault(); const jId = e.dataTransfer.getData('text/plain'); if(jId) assignJemaahToRoom(jId,roomId); }
function quickAssign(jId){
  let rooms = [...allRoomingRecords];
  if(activeLocation!=='SEMUA'){
    if(activeLocation==='TANPA') rooms = rooms.filter(r=> !r.fields['LOKASI / CITY']);
    else rooms = rooms.filter(r=> (r.fields['LOKASI / CITY']||'')===activeLocation);
  }
  const target = rooms.find(r=> (r.fields['JEMAAH']||[]).length < (r.fields['KAPASITI']||4));
  if(target) assignJemaahToRoom(jId,target.id); else alert('Tiada slot kosong di ' + activeLocation + '. Tambah bilik baru.');
}
async function assignJemaahToRoom(jId, roomId){
  const rec = allRoomingRecords.find(r=>r.id===roomId);
  if(!rec) return;
  const cur = rec.fields['JEMAAH']||[];
  if(cur.includes(jId)){ alert('Jemaah sudah ada dalam bilik ini'); return; }
  if(cur.length >= (rec.fields['KAPASITI']||4) && !confirm('Bilik penuh ('+cur.length+'/'+rec.fields['KAPASITI']+'), tambah overbook?')) return;
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
  const newCap = Math.max(1, Math.min(8, (rec.fields['KAPASITI']||4)+delta));
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
    if(doRender){ renderRoomingGrid(); renderNamelist(); updateLocationTabs(); }
  }catch(e){ console.error(e); alert('Gagal update: '+e.message); }
}
function editRoomId(roomId){ const nv = prompt('Room ID baru (contoh B4, M1):'); if(nv && nv.trim()) updateRoomField(roomId,'Room ID / Nama Bilik',nv.trim(),true); }
function editHotel(roomId){ const nv = prompt('Nama Hotel (SNOOD AJYAD, SAFWAH TOWER...):'); if(nv!==null) updateRoomField(roomId,'HOTEL NAME',nv.trim(),true); }
function addStaff(roomId){
  const name = prompt('Nama Staff / Extra (taip bebas, contoh: HAKIM NAWAWI):'); if(!name || !name.trim()) return;
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
  if(!confirm(`Padam bilik ${roomName}?\\nJemaah dalam bilik akan jadi Belum Assign.\\n\\nConfirm delete?`)) return;
  const base = window.AIRTABLE_BASE_ID || window.APP_CONFIG?.AIRTABLE_BASE_ID || localStorage.getItem('effah_api_base') || localStorage.getItem('effah_base_id');
  const pat = window.AIRTABLE_PAT || window.APP_CONFIG?.AIRTABLE_PAT || localStorage.getItem('effah_api_pat');
  try{
    await fetch(`https://api.airtable.com/v0/${base}/ROOMING%20LIST/${roomId}`,{method:'DELETE',headers:{Authorization:`Bearer ${pat}`}});
    allRoomingRecords = allRoomingRecords.filter(r=>r.id!==roomId);
    renderRoomingGrid(); renderNamelist(); updateLocationTabs();
  }catch(e){ alert('Gagal padam: '+e.message); }
}
function openNewRoomModal(){ document.getElementById('newRoomModal').classList.remove('hidden'); document.getElementById('newRoomLokasi').value = activeLocation==='TANPA' || activeLocation==='SEMUA' ? '' : activeLocation; document.getElementById('newRoomCap').value = roomingDefaultCap; }
function closeNewRoomModal(){ document.getElementById('newRoomModal').classList.add('hidden'); }
async function submitNewRoom(){
  const roomId = document.getElementById('newRoomId').value.trim();
  const lokasi = document.getElementById('newRoomLokasi').value;
  const pakej = document.getElementById('newRoomPakej').value;
  const hotel = document.getElementById('newRoomHotel').value.trim();
  const cap = parseInt(document.getElementById('newRoomCap').value)||4;
  const note = document.getElementById('newRoomNote').value.trim();
  const tripId = window.selectedTripRecord?.id || localStorage.getItem('effah_active_trip_id') || localStorage.getItem('selectedTripId');
  if(!roomId){ alert('Isi Room ID'); return; }
  if(!tripId){ alert('Pilih Trip dulu'); return; }
  const base = window.AIRTABLE_BASE_ID || window.APP_CONFIG?.AIRTABLE_BASE_ID || localStorage.getItem('effah_api_base') || localStorage.getItem('effah_base_id');
  const pat = window.AIRTABLE_PAT || window.APP_CONFIG?.AIRTABLE_PAT || localStorage.getItem('effah_api_pat');
  const payload = {fields:{'Room ID / Nama Bilik':roomId,'PAKEJ / HOTEL':pakej,'KAPASITI':cap,'HOTEL NAME':hotel||'','CATATAN BILIK':note||'','TRIP':[tripId]}};
  if(lokasi) payload.fields['LOKASI / CITY']=lokasi;
  try{
    const res = await fetch(`https://api.airtable.com/v0/${base}/ROOMING%20LIST`,{method:'POST',headers:{Authorization:`Bearer ${pat}`,'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const newRec = await res.json();
    if(newRec.id){ allRoomingRecords.push(newRec); closeNewRoomModal(); renderRoomingGrid(); updateLocationTabs(); document.getElementById('newRoomId').value=''; document.getElementById('newRoomHotel').value=''; document.getElementById('newRoomNote').value=''; }
    else { alert('Gagal cipta: ' + JSON.stringify(newRec)); }
  }catch(e){ alert('Error: '+e.message); }
}
function changeDefaultCap(d){ roomingDefaultCap = Math.max(1,Math.min(8,roomingDefaultCap+d)); const el=document.getElementById('defaultCapLabel'); if(el) el.textContent=roomingDefaultCap; }
async function autoAssignRooming(){
  if(!confirm('Auto assign semua jemaah Belum Assign ke slot kosong di lokasi '+activeLocation+'?')) return;
  let rooms = [...allRoomingRecords];
  if(activeLocation!=='SEMUA'){
    if(activeLocation==='TANPA') rooms = rooms.filter(r=> !r.fields['LOKASI / CITY']);
    else rooms = rooms.filter(r=> (r.fields['LOKASI / CITY']||'')===activeLocation);
  }
  const unassigned = allRoomingJemaah.filter(j=> {
    if(activeLocation==='SEMUA') return !isJemaahAssigned(j.id, null);
    return !isJemaahAssigned(j.id, activeLocation);
  });
  let idx=0;
  for(let room of rooms){
    const cap = room.fields['KAPASITI']||4;
    let cur = [...(room.fields['JEMAAH']||[])];
    while(cur.length < cap && idx < unassigned.length){ cur.push(unassigned[idx].id); idx++; }
    if(cur.length !== (room.fields['JEMAAH']||[]).length){
      await updateRoomField(room.id,'JEMAAH',cur,false);
    }
  }
  setTimeout(fetchRoomingData,800);
}
function openAddLocationModal(){ const loc = prompt('Nama Lokasi baru (contoh: TAIF, JEDDAH, MEDAN):'); if(loc && loc.trim()){ activeLocation = loc.trim().toUpperCase(); renderRoomingGrid(); renderNamelist(); updateLocationTabs(); } }
