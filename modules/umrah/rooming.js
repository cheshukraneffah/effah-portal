// ROOMING V23 - Print tanpa EJEN, staff NA walaupun takde bilik, font kecil 11px, box maroon, hotel rename inline, overview ikut hotel
let allRoomingRecords = [];
let allRoomingJemaah = [];
let activeLocation = localStorage.getItem('effah_active_location') || 'MEKAH';
let roomingDefaultCap = 4;
let customLocations = JSON.parse(localStorage.getItem('effah_custom_locations')||'[]');
let staffList = [];
let staffIdCounter = parseInt(localStorage.getItem('effah_staff_counter')||'1000');
let roomingSortDir = localStorage.getItem('effah_rooming_sort_dir') || 'asc'; // asc = A-Z, desc = Z-A
let roomingSortActive = localStorage.getItem('effah_rooming_sort_active') === 'true'? true : false;

function cleanTripNameForRooming(name){
  if(!name) return '';
  if(typeof cleanTripName==='function') return cleanTripName(name);
  return name.replace(/^\s*\d+\/\d+\s*\|\s*/i, '').replace(/^\s*\d+\/\d+\s*/i,'').trim();
}
function getJemaahName(f){ if(!f) return '-'; return f['NAMA'] || f['NAME'] || f['NAMA JEMAAH'] || f['NAMA PENUH'] || f['Name'] || '-'; }
function generateRoomIdFromCap(cap){ return `B${parseInt(cap)||4}`; }
function getFullboardVal(f){ return f['FULLBOARD'] || ''; }
function getPakejVal(f){ return f['PAKEJ'] || ''; }
function getInsuranVal(f){
  const v=f['INSURAN'];
  if(!v) return '';
  if(Array.isArray(v)) return v.join(', ');
  return v;
}
function getInsuranArray(f){
  const v=f['INSURAN'];
  if(!v) return [];
  if(Array.isArray(v)) return v;
  return [v];
}
function isTrainChecked(f){ return!!f['TRAIN']; }
function formatCheckbox(v){ return v? '✓' : '-'; }

document.addEventListener('DOMContentLoaded', () => {
  if(document.getElementById('modul-rooming')) renderRoomingHTML();
  setTimeout(()=>populateRoomingTripDropdown(), 600);
});

function showRoomingLoading(){
  const g=document.getElementById('roomingGrid'); const l=document.getElementById('namelistContainer');
  if(g) g.innerHTML=`<div class="col-span-2 p-6 text-center text- text-slate-400">Memuatkan bilik...</div>`;
  if(l) l.innerHTML=`<div class="p-6 text-center text- text-slate-400">Memuatkan jemaah...</div>`;
}

function renderRoomingHTML(){
  const c=document.getElementById('modul-rooming'); if(!c) return;
  c.innerHTML=`
  <div class="flex flex-col gap-2.5 p-2">
    <div class="bg-white rounded-2xl border border-slate-200 p-2.5 flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-2.5 flex-wrap">
        <span class="font-bold tracking-widest text-slate-800 text-">ROOMING LIST</span>
        <select id="roomingTripSelect" onchange="onRoomingTripChange(this.value)" class="px-2.5 py-1 border border-slate-300 rounded-full bg-white text- font-bold min-w- max-w- truncate">
          <option value="">Pilih Trip...</option>
        </select>
      </div>
      <div class="flex items-center gap-1.5 text-">
        <span id="belumAssignTop" class="px-2 py-0.5 bg-amber-100 rounded-full font-bold text-">0 Unassigned</span>
        <span id="assignedTop" class="px-2 py-0.5 bg-emerald-50 rounded-full font-bold text-">0 Assigned</span>
        <button onclick="fetchRoomingData()" class="w-6 h-6 rounded-full border bg-white hover:bg-slate-50 text-"><i class="fa-solid fa-rotate"></i></button>
      </div>
    </div>

    <div class="flex flex-col lg:flex-row gap-2.5 items-start">
      <div class="w-full lg:w-[52%] bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        <div class="p-2.5 border-b border-slate-200">
          <div class="flex items-center justify-between mb-2.5">
            <h3 class="font-bold text- tracking-widest text-slate-700">NAMELIST JEMAAH</h3>
            <div class="flex gap-1">
              <span id="belumAssignBadge" class="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text- font-bold">0 Unassigned</span>
              <span id="totalJemaahBadge" class="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-full text- font-bold">0 Total</span>
            </div>
          </div>
          <div class="flex gap-1.5">
            <div class="relative flex-1">
              <i class="fa-solid fa-magnifying-glass absolute left-2.5 top-2.5 text-slate-400 text-"></i>
              <input id="searchRoomingJemaah" onkeyup="filterRoomingNamelist()" placeholder="Cari nama jemaah..." class="w-full text- pl-7 pr-2.5 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none">
            </div>
            <select id="filterPakejRooming" onchange="filterRoomingNamelist()" class="text- border border-slate-200 rounded-xl px-2.5 py-2 bg-white font-medium"><option value="">Semua Pakej</option><option>JIMAT</option><option>EKONOMI</option><option>STANDARD</option><option>PREMIUM</option></select>
          </div>
        </div>
        <div class="px-2.5 py-1.5 bg-slate-50/70 border-b border-slate-200 grid grid-cols-12 text- font-bold text-slate-500 tracking-wider">
          <div class="col-span-1">NO</div>
          <div class="col-span-3 flex items-center gap-1 cursor-pointer hover:text-[#7A0C2E] select-none" onclick="toggleSortNama()" title="Klik untuk sort A-Z / Z-A">
            <span id="headerNamaJemaah" class="bg-[#7A0C2E] text-white px-1.5 py-0.5 rounded text-">NAMA JEMAAH</span>
            <span id="sortIcon" class="text-">↕</span>
          </div>
          <div class="col-span-2 text-center">FULLBOARD</div><div class="col-span-1 text-center">TRAIN</div><div class="col-span-3 text-center">INSURAN (TAKAFUL/ETIQA/KHAIRI)</div><div class="col-span-1 text-center">PAKEJ</div><div class="col-span-1 text-center">+</div>
        </div>
        <div id="namelistContainer" class="flex-1 overflow-y-auto max-h- divide-y divide-slate-50 bg-white min-h-"></div>
        <div class="border-t border-slate-200 bg-slate-50/50">
          <div class="p-2.5 flex items-center justify-between">
            <h4 class="font-bold text- tracking-widest text-slate-700">STAFF / EXTRA LIST</h4>
            <span id="staffTotalBadge" class="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-full text- font-bold">0 Staff</span>
          </div>
          <div class="px-2.5 pb-2.5 flex gap-1.5">
            <input id="newStaffInput" placeholder="Taip nama staff" class="flex-1 text- px-2.5 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none" onkeydown="if(event.key==='Enter'){ addNewStaff(); }">
            <button onclick="addNewStaff()" class="px-3 py-2 bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text- font-bold hover:bg-slate-200">+ Add</button>
          </div>
          <div id="staffListContainer" class="px-2 pb-2.5 max-h- overflow-y-auto space-y-1 bg-slate-50/50 min-h-"></div>
        </div>
      </div>

      <div class="w-full lg:w-[48%] flex flex-col gap-2.5">
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-2.5">
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h3 class="font-bold text- tracking-widest">ROOMING LIST</h3>
              <div class="flex items-center gap-1.5 mt-1 text-">
                <span id="roomingBiliks" class="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-full font-bold">0 Bilik</span>
                <span id="roomingOccupancy" class="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-full font-bold">0 Jemaah</span>
              </div>
            </div>
            <div class="flex items-center gap-1">
              <button onclick="openNewRoomModal()" class="px-2.5 py-1 bg-[#7A0C2E] text-white rounded-full text- font-bold">+ Bilik Baru</button>
              <button onclick="openCopyRoomsModal()" class="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-full text- font-bold">Salin Bilik</button>
              <button onclick="generateRoomingPrint()" class="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 rounded-full text- font-bold">🖨️ Cetak</button>
            </div>
          </div>
          <div id="roomingTabs" class="flex gap-1 mt-2.5 flex-wrap"></div>
          <div id="roomingOverview" class="mt-2.5 p-2 bg-slate-50 rounded-xl border border-slate-200 text-"></div>
        </div>
        <div id="roomingGrid" class="grid grid-cols-1 md:grid-cols-2 gap-2.5"></div>
      </div>
    </div>
  </div>

  <!-- MODAL BILIK BARU -->
  <div id="newRoomModal" class="hidden fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-3">
    <div class="bg-white rounded-2xl p-4 w-full max-w-">
      <h3 class="font-bold text- mb-3">BILIK BARU</h3>
      <div class="space-y-2.5">
        <div><label class="text- font-bold">LOKASI / CITY</label><select id="newRoomLokasi" class="w-full border rounded-xl px-2.5 py-2 text-"><option>MEKAH</option><option>MADINAH</option><option>TAIF</option><option>JEDDAH</option></select></div>
        <div class="flex gap-2"><div class="flex-1"><label class="text- font-bold">KAPASITI</label><div class="flex items-center gap-1 mt-1"><button onclick="changeNewRoomCap(-1)" class="w-7 h-7 rounded-full border">−</button><input id="newRoomCap" value="4" class="w-12 text-center border rounded-xl py-1.5 text-"><button onclick="changeNewRoomCap(1)" class="w-7 h-7 rounded-full border">+</button></div></div><div class="flex-1"><label class="text- font-bold">ROOM ID</label><input id="newRoomId" class="w-full border rounded-xl px-2.5 py-2 text- mt-1" readonly></div></div>
        <div><label class="text- font-bold">PAKEJ / HOTEL</label><select id="newRoomPakej" class="w-full border rounded-xl px-2.5 py-2 text-"><option>EKONOMI</option><option>PREMIUM</option><option>JIMAT</option></select></div>
        <div><label class="text- font-bold">HOTEL NAME</label><input id="newRoomHotel" placeholder="SNOOD AJYAD, M AL MOKHTARA..." class="w-full border rounded-xl px-2.5 py-2 text-"></div>
        <div><label class="text- font-bold">CATATAN BILIK</label><input id="newRoomNote" placeholder="Catatan..." class="w-full border rounded-xl px-2.5 py-2 text-"></div>
      </div>
      <div class="flex gap-2 mt-4"><button onclick="closeNewRoomModal()" class="flex-1 border rounded-full py-2 text-">Batal</button><button id="btnCiptaBilik" onclick="submitNewRoom()" class="flex-1 bg-[#7A0C2E] text-white rounded-full py-2 text- font-bold">Cipta Bilik</button></div>
    </div>
  </div>

  <!-- MODAL SALIN BILIK -->
  <div id="copyRoomsModal" class="hidden fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-3">
    <div class="bg-white rounded-2xl p-4 w-full max-w-">
      <h3 class="font-bold text- mb-3">SALIN BILIK DARI LOKASI LAIN KE <span id="copyTargetLoc">MEKAH</span></h3>
      <div class="space-y-2.5">
        <div><label class="text- font-bold">SUMBER LOKASI</label><select id="copySourceLoc" class="w-full border rounded-xl px-2.5 py-2 text-"></select></div>
        <div><label class="text- font-bold">MOD SALINAN</label><select id="copyMode" class="w-full border rounded-xl px-2.5 py-2 text-"><option value="structure">Struktur sahaja (bilik kosong)</option><option value="withJemaah">Bersama jemaah</option></select></div>
      </div>
      <div class="flex gap-2 mt-4"><button onclick="closeCopyRoomsModal()" class="flex-1 border rounded-full py-2 text-">Batal</button><button onclick="submitCopyRooms()" class="flex-1 bg-[#7A0C2E] text-white rounded-full py-2 text- font-bold">Salin Sekarang</button></div>
    </div>
  </div>
  `;
  renderLocationTabs();
  loadStaffList();
}

async function fetchRoomingData(){
  showRoomingLoading();
  const tripId = window.selectedTripRecord?.id || localStorage.getItem('effah_active_trip_id') || localStorage.getItem('selectedTripId') || localStorage.getItem('effah_last_selected_trip');
  if(!tripId){ document.getElementById('roomingGrid').innerHTML='<div class="p-6 text-center text- text-slate-400">Sila pilih trip dahulu</div>'; document.getElementById('namelistContainer').innerHTML='<div class="p-6 text-center text- text-slate-400">Sila pilih trip dahulu</div>'; return; }
  const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base')||localStorage.getItem('effah_base_id'); const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
  if(!base||!pat){ document.getElementById('roomingGrid').innerHTML='<div class="p-6 text-center text- text-red-400">Airtable config missing</div>'; return; }
  try{
    const tripFilter = encodeURIComponent(`FIND("${tripId}", ARRAYJOIN({TRIP}))`);
    let [roomingRes, jemaahRes] = await Promise.all([
      fetch(`https://api.airtable.com/v0/${base}/ROOMING%20LIST?filterByFormula=${tripFilter}&pageSize=100`, {headers:{Authorization:`Bearer ${pat}`}}).then(r=>r.json()),
      fetch(`https://api.airtable.com/v0/${base}/DATA%20JEMAAH%20UMRAH?filterByFormula=${tripFilter}&pageSize=100&fields[]=NAMA&fields[]=FULLBOARD&fields[]=TRAIN&fields[]=PAKEJ&fields[]=INSURAN`, {headers:{Authorization:`Bearer ${pat}`}}).then(r=>r.json())
    ]);
    allRoomingRecords = roomingRes.records||[];
    allRoomingJemaah = jemaahRes.records||[];
    renderRoomingGrid(); renderNamelist(); renderLocationTabs(); renderStaffList();
  }catch(e){ console.error(e); document.getElementById('roomingGrid').innerHTML=`<div class="p-6 text-center text- text-red-400">Ralat: ${e.message}</div>`; }
}

function populateRoomingTripDropdown(){
  const sel=document.getElementById('roomingTripSelect'); if(!sel) return;
  const trips = window.allTripUmrahRecords||window.allTripRecords||[];
  const activeId = localStorage.getItem('effah_active_trip_id')||localStorage.getItem('selectedTripId')||localStorage.getItem('effah_last_selected_trip');
  sel.innerHTML='<option value="">Pilih Trip...</option>' + trips.map(t=>`<option value="${t.id}" ${t.id===activeId?'selected':''}>${cleanTripNameForRooming(t.fields?.Trip||t.fields?.Name||t.id)}</option>`).join('');
  if(activeId){ const found=trips.find(t=>t.id===activeId); if(found) window.selectedTripRecord=found; fetchRoomingData(); }
}
function onRoomingTripChange(tripId){ if(!tripId) return; const trips=window.allTripUmrahRecords||window.allTripRecords||[]; const found=trips.find(t=>t.id===tripId); if(found) window.selectedTripRecord=found; localStorage.setItem('effah_active_trip_id',tripId); localStorage.setItem('selectedTripId',tripId); localStorage.setItem('effah_last_selected_trip',tripId); fetchRoomingData(); }
function isJemaahAssignedInLocation(jId, location){
  const loc = (location||activeLocation).toUpperCase();
  return allRoomingRecords.some(r=> (r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===loc && (r.fields['JEMAAH']||[]).includes(jId));
}
function isJemaahAssigned(jId){ return allRoomingRecords.some(r=>(r.fields['JEMAAH']||[]).includes(jId)); }
function isStaffAssignedInLocation(staffId, location){
  const s=staffList.find(x=>x.id===staffId); if(!s) return false;
  const loc = (location||activeLocation).toUpperCase();
  return allRoomingRecords.some(r=> (r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===loc && (r.fields['STAFF / EXTRA']||'').split(',').map(x=>x.trim()).includes(s.name));
}
function isStaffAssigned(staffId){ const s=staffList.find(x=>x.id===staffId); if(!s) return false; return allRoomingRecords.some(r=> (r.fields['STAFF / EXTRA']||'').split(',').map(x=>x.trim()).includes(s.name)); }

function renderNamelist(){
  const cont=document.getElementById('namelistContainer'); if(!cont) return;
  const q=(document.getElementById('searchRoomingJemaah')?.value||'').toLowerCase();
  const pakejFilter=(document.getElementById('filterPakejRooming')?.value||'').toUpperCase();
  let filtered=[...allRoomingJemaah];
  if(q) filtered=filtered.filter(r=>getJemaahName(r.fields).toLowerCase().includes(q));
  if(pakejFilter) filtered=filtered.filter(r=>getPakejVal(r.fields).toUpperCase()===pakejFilter);
  // SORT LOGIC - bila header NAMA JEMAAH ditekan
  if(roomingSortActive){
    filtered.sort((a,b)=>{
      const nameA=getJemaahName(a.fields).toUpperCase();
      const nameB=getJemaahName(b.fields).toUpperCase();
      if(roomingSortDir==='asc') return nameA.localeCompare(nameB);
      else return nameB.localeCompare(nameA);
    });
  }
  const total=allRoomingJemaah.length;
  const belumGlobal=allRoomingJemaah.filter(r=>!isJemaahAssigned(r.id)).length;
  const belumInLoc=allRoomingJemaah.filter(r=>!isJemaahAssignedInLocation(r.id, activeLocation)).length;
  const totalEl=document.getElementById('totalJemaahBadge'); if(totalEl) totalEl.textContent=total+' Total';
  const belumEl=document.getElementById('belumAssignBadge'); if(belumEl) belumEl.textContent=belumInLoc+' Unassigned di '+activeLocation;
  const topBelum=document.getElementById('belumAssignTop'); if(topBelum) topBelum.textContent=belumGlobal+' Unassigned';
  const topAssign=document.getElementById('assignedTop'); if(topAssign) topAssign.textContent=(total-belumGlobal)+' Assigned';
  if(total===0){ cont.innerHTML='<div class="p-6 text-center text- text-slate-400">Tiada jemaah untuk trip ini</div>'; return; }
  cont.innerHTML=filtered.map((r,i)=>{
    const name=getJemaahName(r.fields); const assignedInLoc=isJemaahAssignedInLocation(r.id, activeLocation); const assignedGlobal=isJemaahAssigned(r.id);
    const rowCls=assignedInLoc?'opacity-60 bg-slate-50':'hover:bg-slate-50';
    const drag=assignedInLoc?'':`draggable="true" ondragstart="dragJemaah(event,'${r.id}')" ondragend="dragEnd(event)"`;
    let statusIcon = assignedInLoc? `<button onclick="removeJemaahFromAnyRoom('${r.id}')" class="w-5 h-5 rounded-full border bg-white hover:bg-red-50 text- text-slate-500 hover:text-red-600" title="Keluarkan dari bilik ${activeLocation} untuk edit">✕</button>` : `<button onclick="quickAssign('${r.id}')" class="w-5 h-5 rounded-full border bg-slate-100 hover:bg-slate-200 text-">+</button>`;
    if(!assignedInLoc && assignedGlobal) statusIcon = `<button onclick="quickAssign('${r.id}')" class="w-5 h-5 rounded-full border bg-amber-100 hover:bg-amber-200 text-" title="Sudah ada di lokasi lain, boleh tambah di ${activeLocation} juga">+</button>`;
    const fb = getFullboardVal(r.fields) || '-';
    const pk = getPakejVal(r.fields) || '-';
    const trChecked = isTrainChecked(r.fields);
    const insArr = getInsuranArray(r.fields);
    let fbCls = 'bg-white border-slate-200';
    if(fb.includes('FULLBOARD (MEKAH)')) fbCls='bg-orange-100 border-orange-200 text-orange-800';
    else if(fb.includes('FULLBOARD (MADINAH)')) fbCls='bg-blue-100 border-blue-200 text-blue-800';
    else if(fb==='FULLBOARD') fbCls='bg-emerald-100 border-emerald-200 text-emerald-800';
    else if(fb==='NO FULLBOARD') fbCls='bg-slate-100 border-slate-200 text-slate-500';
    else if(fb==='-') fbCls='bg-white border-dashed border-slate-300 text-slate-400';

    // multi toggle untuk INSURAN - TAKAFUL/ETIQA/AL-KHAIRI
    const insToggle = ['TAKAFUL','ETIQA','AL-KHAIRI'].map(opt=>{
      const active = insArr.includes(opt);
      const cls = active? 'bg-[#7A0C2E] text-white border-[#7A0C2E]' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300';
      const label = opt==='TAKAFUL'?'TAK':opt==='AL-KHAIRI'?'KHAIRI':opt;
      return `<button onclick="toggleInsuran('${r.id}','${opt}')" class="px-1 py-0.5 rounded-full border text- font-bold ${cls}" title="${opt}">${label}</button>`;
    }).join('');

    return `<div ${drag} class="grid grid-cols-12 items-center px-1.5 py-1.5 text- border-b border-slate-50 ${rowCls}">
      <div class="col-span-1 text-slate-400 text-">${String(i+1).padStart(2,'0')}</div>
      <div class="col-span-3 font-medium truncate text-" title="${name}">${name}</div>
      <div class="col-span-2 flex items-center gap-0.5">
        <select onchange="updateJemaahField('${r.id}','FULLBOARD',this.value)" class="text- border rounded-full px-1 py-0.5 bg-white font-bold ${fbCls} outline-none w-full truncate" title="FULLBOARD">
          <option value="" ${!fb || fb==='-'?'selected':''}>- FB</option>
          <option value="FULLBOARD" ${fb==='FULLBOARD'?'selected':''}>FULLBOARD</option>
          <option value="FULLBOARD (MEKAH)" ${fb==='FULLBOARD (MEKAH)'?'selected':''}>FB MEKAH</option>
          <option value="FULLBOARD (MADINAH)" ${fb==='FULLBOARD (MADINAH)'?'selected':''}>FB MADINAH</option>
          <option value="NO FULLBOARD" ${fb==='NO FULLBOARD'?'selected':''}>NO FB</option>
        </select>
      </div>
      <div class="col-span-1 text-center">
        <input type="checkbox" ${trChecked?'checked':''} onchange="updateJemaahCheckbox('${r.id}','TRAIN',this.checked)" class="w-3.5 h-3.5 accent-[#7A0C2E] rounded" title="TRAIN">
      </div>
      <div class="col-span-3 flex items-center gap-0.5 flex-wrap justify-center">
        ${insToggle}
      </div>
      <div class="col-span-1 flex items-center gap-0.5">
        <select onchange="updateJemaahField('${r.id}','PAKEJ',this.value)" class="text- border rounded-full px-1 py-0.5 bg-white font-bold outline-none w-full ${pk==='-'?'border-dashed text-slate-400':'bg-slate-50'}" title="PAKEJ">
          <option value="" ${!pk || pk==='-'?'selected':''}>-</option>
          <option value="JIMAT" ${pk==='JIMAT'?'selected':''}>JIMAT</option>
          <option value="EKONOMI" ${pk==='EKONOMI'?'selected':''}>EKO</option>
          <option value="STANDARD" ${pk==='STANDARD'?'selected':''}>STD</option>
          <option value="PREMIUM" ${pk==='PREMIUM'?'selected':''}>PREM</option>
        </select>
      </div>
      <div class="col-span-1 text-center">${statusIcon}</div>
    </div>`;
  }).join('');
  // update icon sort
  const sortIconEl=document.getElementById('sortIcon');
  if(sortIconEl) sortIconEl.textContent = roomingSortActive? (roomingSortDir==='asc'?'↑ A-Z':'↓ Z-A') : '↕';
}

function toggleSortNama(){
  if(!roomingSortActive){
    roomingSortActive=true;
    roomingSortDir='asc';
  } else {
    roomingSortDir = roomingSortDir==='asc'? 'desc' : 'asc';
  }
  localStorage.setItem('effah_rooming_sort_dir', roomingSortDir);
  localStorage.setItem('effah_rooming_sort_active', 'true');
  renderNamelist();
}

function filterRoomingNamelist(){ renderNamelist(); }

function renderRoomingGrid(){
  const grid=document.getElementById('roomingGrid'); if(!grid) return;
  let rooms=[...allRoomingRecords].filter(r=>(r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===activeLocation.toUpperCase());
  rooms=getRoomOrderedList(rooms);
  const bilikEl=document.getElementById('roomingBiliks'); if(bilikEl) bilikEl.textContent=rooms.length+' Bilik';
  const totalJ=rooms.reduce((s,r)=>s+(r.fields['JEMAAH']?.length||0),0); const totalStaff=rooms.reduce((s,r)=>s+(r.fields['STAFF / EXTRA']||'').split(',').filter(Boolean).length,0);
  const occEl=document.getElementById('roomingOccupancy'); if(occEl) occEl.textContent=`${totalJ} Jemaah + ${totalStaff} Staff • ${activeLocation}`;
  renderRoomingOverview(rooms);
  if(rooms.length===0){ grid.innerHTML=`<div class="col-span-2 p-6 text-center text- border border-dashed rounded-2xl bg-white">Tiada bilik untuk <b>${activeLocation}</b><br><button onclick="openNewRoomModal()" class="mt-2.5 px-3 py-1.5 bg-[#7A0C2E] text-white rounded-full text-">+ Bilik Baru untuk ${activeLocation}</button></div>`; return; }
  grid.innerHTML=rooms.map(rec=>{
    const f=rec.fields; const roomId=f['Room ID / Nama Bilik']||generateRoomIdFromCap(f['KAPASITI']); const pakej=f['PAKEJ / HOTEL']||'EKONOMI'; const cap=f['KAPASITI']||4; const hotel=f['HOTEL NAME']||''; const staffArr=(f['STAFF / EXTRA']||'').split(',').filter(Boolean); const jIds=f['JEMAAH']||[]; const count=jIds.length+staffArr.length;
    const jSlots=jIds.map(jId=>{ const jRec=allRoomingJemaah.find(j=>j.id===jId); const jName=getJemaahName(jRec?.fields); return `<div class="flex items-center justify-between px-2.5 py-2 bg-slate-100 text-slate-800 border border-slate-200 rounded-xl text-"><span class="truncate font-medium">${jName}</span><button onclick="removeJemaahFromRoom('${rec.id}','${jId}')" class="ml-2 w-4 h-4 rounded-full bg-white hover:bg-slate-200 text-">✕</button></div>`; }).join('');
    const sSlots=staffArr.map(s=>`<div class="flex items-center justify-between px-2.5 py-2 bg-[#FADBD8] text-[#7A0C2E] border border-[#F5B7B1] rounded-xl text-"><span class="truncate">👤 ${s}</span><button onclick="removeStaff('${rec.id}','${s.replace(/'/g,"\\'")}')" class="ml-2 w-4 h-4 rounded-full bg-white/70 text-">✕</button></div>`).join('');
    const emptyCount=Math.max(0,cap-count); const emptySlots=Array.from({length:emptyCount}).map((_,i)=>`<div ondragover="allowDrop(event)" ondrop="dropJemaah(event,'${rec.id}')" class="px-2.5 py-2 border border-dashed border-slate-300 rounded-xl text- text-slate-400 text-center">Slot Kosong ${count+i+1}</div>`).join('');
    return `<div data-room-id="${rec.id}" ondragover="allowDropRoom(event)" ondragleave="handleRoomDragLeave(event)" ondrop="dropJemaah(event,'${rec.id}')" class="bg-white rounded-2xl border border-slate-200 p-2.5 shadow-sm flex flex-col gap-2 h-fit">
      <div class="flex items-center justify-between gap-1.5">
        <div class="flex items-center gap-1.5">
          <span class="font-bold text- tracking-widest">${roomId}</span>
          <span class="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-full text- font-bold">${pakej}</span>
        </div>
        <button onclick="deleteRoom('${rec.id}','${roomId}')" class="w-6 h-6 rounded-full bg-slate-50 hover:bg-red-50 border text- shrink-0"><i class="fa-solid fa-trash"></i></button>
      </div>
      <div class="flex items-center gap-1.5 text-">
        <div class="flex items-center gap-1 px-2.5 py-1 bg-slate-50 rounded-full border"><select onchange="updateRoomField('${rec.id}','PAKEJ / HOTEL',this.value)" class="bg-transparent text- font-bold outline-none"><option ${pakej==='EKONOMI'?'selected':''}>EKONOMI</option><option ${pakej==='PREMIUM'?'selected':''}>PREMIUM</option><option ${pakej==='JIMAT'?'selected':''}>JIMAT</option></select></div>
        <div class="ml-auto flex items-center gap-1 bg-slate-50 rounded-full px-1 py-0.5 border"><button onclick="updateCap('${rec.id}',-1)" class="w-5 h-5 rounded-full bg-white border text-">−</button><span class="font-bold w-4 text-center text-">${cap}</span><button onclick="updateCap('${rec.id}',1)" class="w-5 h-5 rounded-full bg-white border text-">+</button><span class="text- ml-1">${count}/${cap}</span></div>
      </div>
      <div class="space-y-1">${jSlots}${sSlots}${emptySlots}</div>
      <div class="h-1 bg-slate-100 rounded-full overflow-hidden"><div class="h-full bg-[#7A0C2E]" style="width:${Math.min(100,(count/cap)*100)}%"></div></div>
    </div>`;
  }).join('');
}
function setActiveLocation(loc){ activeLocation=loc.toUpperCase(); localStorage.setItem('effah_active_location',activeLocation); const el=document.getElementById('copyTargetLoc'); if(el) el.textContent=activeLocation; renderLocationTabs(); renderRoomingGrid(); renderNamelist(); renderStaffList(); }
function allowDrop(e){ e.preventDefault(); }
function allowDropRoom(e){ e.preventDefault(); e.currentTarget.classList.add('ring-2','ring-[#7A0C2E]/20'); }
function dragJemaah(e,jId){ if(isJemaahAssignedInLocation(jId, activeLocation)) return; e.dataTransfer.setData('text/plain',jId); const r=e.currentTarget; if(r) setTimeout(()=>r.style.opacity='0.3',0); }
function dragEnd(e){ e.currentTarget.style.opacity='1'; }
function dropJemaah(e,roomId){
  e.preventDefault(); e.currentTarget.classList.remove('ring-2','ring-[#7A0C2E]/20');
  document.querySelectorAll('[draggable="true"]').forEach(el=>el.style.opacity='1');
  const staffId=e.dataTransfer.getData('text/staff-id'); const jId=e.dataTransfer.getData('text/plain');
  const id=staffId||jId; if(!id) return;
  if(staffList.some(s=>s.id===id) || id.startsWith('staff_')){ assignStaffToRoom(id,roomId); }
  else { if(!isJemaahAssignedInLocation(id, activeLocation)) assignJemaahToRoom(id,roomId); }
}
function quickAssign(jId){ if(isJemaahAssignedInLocation(jId, activeLocation)) return; const rooms=allRoomingRecords.filter(r=>(r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===activeLocation); const target=rooms.find(r=>{ const j=r.fields['JEMAAH']?.length||0; const s=(r.fields['STAFF / EXTRA']||'').split(',').filter(Boolean).length; return (j+s)<(r.fields['KAPASITI']||4); }); if(target) assignJemaahToRoom(jId,target.id); }
async function assignJemaahToRoom(jId,roomId){ if(isJemaahAssignedInLocation(jId, activeLocation)) return; const rec=allRoomingRecords.find(r=>r.id===roomId); if(!rec) return; await updateRoomField(roomId,'JEMAAH',[...(rec.fields['JEMAAH']||[]),jId],true); }
async function removeJemaahFromRoom(roomId,jId){ const rec=allRoomingRecords.find(r=>r.id===roomId); await updateRoomField(roomId,'JEMAAH',(rec.fields['JEMAAH']||[]).filter(id=>id!==jId),true); }
async function removeJemaahFromAnyRoom(jId){
  const roomsInLoc = allRoomingRecords.filter(r=>(r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===activeLocation.toUpperCase() && (r.fields['JEMAAH']||[]).includes(jId));
  for(const rec of roomsInLoc){
    await updateRoomField(rec.id,'JEMAAH',(rec.fields['JEMAAH']||[]).filter(id=>id!==jId),false);
  }
  renderRoomingGrid(); renderNamelist(); renderLocationTabs();
}
async function updateCap(roomId,delta){
  const rec=allRoomingRecords.find(r=>r.id===roomId); if(!rec) return;
  const newCap=Math.max(1,Math.min(8,(rec.fields['KAPASITI']||4)+delta));
  const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base')||localStorage.getItem('effah_base_id'); const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
  try{
    await fetch(`https://api.airtable.com/v0/${base}/ROOMING%20LIST/${roomId}`,{method:'PATCH',headers:{Authorization:`Bearer ${pat}`,'Content-Type':'application/json'},body:JSON.stringify({fields:{'KAPASITI':newCap}})});
    rec.fields['KAPASITI']=newCap;
    renderRoomingGrid(); renderLocationTabs(); renderNamelist(); renderStaffList();
  }catch(e){ console.error(e); alert('Gagal mengemaskini kapasiti bilik: '+e.message); }
}
async function updateRoomField(roomId,field,value,doRender=true){
  const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base')||localStorage.getItem('effah_base_id'); const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
  try{
    await fetch(`https://api.airtable.com/v0/${base}/ROOMING%20LIST/${roomId}`,{method:'PATCH',headers:{Authorization:`Bearer ${pat}`,'Content-Type':'application/json'},body:JSON.stringify({fields:{[field]:value}})});
    const rec=allRoomingRecords.find(r=>r.id===roomId); if(rec) rec.fields[field]=value;
    if(doRender){ renderRoomingGrid(); renderNamelist(); renderStaffList(); renderLocationTabs(); }
  }catch(e){ console.error(e); alert('Gagal mengemaskini data bilik: '+e.message); }
}
// UPDATE JEMAAH FIELD DIRECT DARI ROOMING PAGE - PAKEJ, FULLBOARD, TRAIN, INSURAN
async function updateJemaahField(jemaahId, field, value){
  const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base')||localStorage.getItem('effah_base_id'); const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
  if(!base||!pat) return alert('Airtable config missing');
  const rec=allRoomingJemaah.find(r=>r.id===jemaahId); if(rec) rec.fields[field]=value||'';
  renderNamelist();
  try{
    const payload = value? {[field]: value} : {[field]: null};
    const res=await fetch(`https://api.airtable.com/v0/${base}/DATA%20JEMAAH%20UMRAH/${jemaahId}`,{method:'PATCH',headers:{Authorization:`Bearer ${pat}`,'Content-Type':'application/json'},body:JSON.stringify({fields: payload})});
    const data=await res.json();
    if(!data.id && data.error) throw new Error(data.error.message);
  }catch(e){ console.error(e); alert('Gagal update jemaah '+field+': '+e.message); fetchRoomingData(); }
}
async function updateJemaahCheckbox(jemaahId, field, checked){
  const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base')||localStorage.getItem('effah_base_id'); const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
  if(!base||!pat) return alert('Airtable config missing');
  const rec=allRoomingJemaah.find(r=>r.id===jemaahId); if(rec) rec.fields[field]=checked;
  renderNamelist();
  try{
    const res=await fetch(`https://api.airtable.com/v0/${base}/DATA%20JEMAAH%20UMRAH/${jemaahId}`,{method:'PATCH',headers:{Authorization:`Bearer ${pat}`,'Content-Type':'application/json'},body:JSON.stringify({fields: {[field]: checked}})});
    const data=await res.json();
    if(!data.id && data.error) throw new Error(data.error.message);
  }catch(e){ console.error(e); alert('Gagal update checkbox '+field+': '+e.message); fetchRoomingData(); }
}
async function updateJemaahInsuran(jemaahId, value){
  const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base')||localStorage.getItem('effah_base_id'); const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
  if(!base||!pat) return alert('Airtable config missing');
  const rec=allRoomingJemaah.find(r=>r.id===jemaahId);
  if(rec){ rec.fields['INSURAN'] = value? [value] : []; }
  renderNamelist();
  try{
    const payload = value? {[ 'INSURAN']: [value]} : {['INSURAN']: []};
    const res=await fetch(`https://api.airtable.com/v0/${base}/DATA%20JEMAAH%20UMRAH/${jemaahId}`,{method:'PATCH',headers:{Authorization:`Bearer ${pat}`,'Content-Type':'application/json'},body:JSON.stringify({fields: payload})});
    const data=await res.json();
    if(!data.id && data.error) throw new Error(data.error.message);
  }catch(e){ console.error(e); alert('Gagal update INSURAN: '+e.message); fetchRoomingData(); }
}
async function toggleInsuran(jemaahId, opt){
  const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base')||localStorage.getItem('effah_base_id'); const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
  if(!base||!pat) return alert('Airtable config missing');
  const rec=allRoomingJemaah.find(r=>r.id===jemaahId);
  if(!rec) return;
  let curr = getInsuranArray(rec.fields);
  if(curr.includes(opt)){ curr = curr.filter(x=>x!==opt); } else { curr.push(opt); }
  rec.fields['INSURAN'] = curr;
  renderNamelist();
  try{
    const res=await fetch(`https://api.airtable.com/v0/${base}/DATA%20JEMAAH%20UMRAH/${jemaahId}`,{method:'PATCH',headers:{Authorization:`Bearer ${pat}`,'Content-Type':'application/json'},body:JSON.stringify({fields: {'INSURAN': curr}})});
    const data=await res.json();
    if(!data.id && data.error) throw new Error(data.error.message);
  }catch(e){ console.error(e); alert('Gagal update INSURAN multi: '+e.message); fetchRoomingData(); }
}
function updateHotelInline(roomId, newName){
  const name = (newName||'').trim().toUpperCase();
  if(!name){ alert('Sila masukkan nama hotel'); return; }
  updateRoomField(roomId,'HOTEL NAME',name,true);
}
async function deleteRoom(roomId,roomName){
  if(!confirm(`Adakah anda pasti ingin memadamkan bilik ${roomName}? Semua jemaah di dalam bilik ini akan menjadi tidak ditetapkan semula untuk lokasi ${activeLocation}.`)) return;
  const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base')||localStorage.getItem('effah_base_id'); const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
  try{
    await fetch(`https://api.airtable.com/v0/${base}/ROOMING%20LIST/${roomId}`,{method:'DELETE',headers:{Authorization:`Bearer ${pat}`}});
    allRoomingRecords=allRoomingRecords.filter(r=>r.id!==roomId);
    renderRoomingGrid(); renderNamelist(); renderStaffList(); renderLocationTabs();
  }catch(e){ alert('Gagal memadamkan bilik: '+e.message); }
}
function updateNewRoomIdFromCap(){ const cap=parseInt(document.getElementById('newRoomCap').value)||4; const el=document.getElementById('newRoomId'); if(el) el.value=generateRoomIdFromCap(cap); }
function changeNewRoomCap(d){ const i=document.getElementById('newRoomCap'); let v=parseInt(i.value)||4; v=Math.max(1,Math.min(8,v+d)); i.value=v; updateNewRoomIdFromCap(); }
function openNewRoomModal(){ const m=document.getElementById('newRoomModal'); if(!m) return; m.classList.remove('hidden'); document.getElementById('newRoomLokasi').value=activeLocation; document.getElementById('newRoomCap').value=roomingDefaultCap; updateNewRoomIdFromCap(); }
function closeNewRoomModal(){ document.getElementById('newRoomModal').classList.add('hidden'); }
async function submitNewRoom(){
  const btn=document.getElementById('btnCiptaBilik'); if(btn){ btn.textContent='Mencipta...'; btn.disabled=true; }
  const lokasi=document.getElementById('newRoomLokasi').value; const pakej=document.getElementById('newRoomPakej').value;
  const hotel=document.getElementById('newRoomHotel').value.trim(); const cap=parseInt(document.getElementById('newRoomCap').value)||4;
  const note=document.getElementById('newRoomNote').value.trim(); const tripId=window.selectedTripRecord?.id||localStorage.getItem('effah_active_trip_id')||localStorage.getItem('selectedTripId')||localStorage.getItem('effah_last_selected_trip');
  if(!tripId){ alert('Sila pilih trip terlebih dahulu.'); if(btn){ btn.textContent='Cipta Bilik'; btn.disabled=false; } return; }
  const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base')||localStorage.getItem('effah_base_id'); const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
  const payload={fields:{'PAKEJ / HOTEL':pakej,'KAPASITI':cap,'HOTEL NAME':hotel||'','CATATAN BILIK':note||'','TRIP':[tripId],'LOKASI / CITY':lokasi}};
  try{
    let res=await fetch(`https://api.airtable.com/v0/${base}/ROOMING%20LIST`,{method:'POST',headers:{Authorization:`Bearer ${pat}`,'Content-Type':'application/json'},body:JSON.stringify(payload)});
    let newRec=await res.json();
    if(newRec.id){ allRoomingRecords.push(newRec); closeNewRoomModal(); renderRoomingGrid(); renderLocationTabs(); renderNamelist(); renderStaffList(); document.getElementById('newRoomHotel').value=''; document.getElementById('newRoomNote').value=''; }
    else { alert('Gagal mencipta bilik: ' + (newRec.error?.message || JSON.stringify(newRec))); }
  }catch(e){ alert('Ralat semasa mencipta bilik: '+e.message); }
  finally{ if(btn){ btn.textContent='Cipta Bilik'; btn.disabled=false; } }
}
function openAddLocationModal(){ const loc=prompt('Sila masukkan nama lokasi baharu (contoh: TAIF, JEDDAH):'); if(loc&&loc.trim()){ const up=loc.trim().toUpperCase(); if(!customLocations.includes(up)) customLocations.push(up); localStorage.setItem('effah_custom_locations',JSON.stringify(customLocations)); activeLocation=up; localStorage.setItem('effah_active_location',activeLocation); renderLocationTabs(); renderRoomingGrid(); renderNamelist(); } }
function deleteCustomLocation(loc){ if(!confirm(`Adakah anda pasti ingin memadamkan lokasi ${loc}?`)) return; customLocations=customLocations.filter(l=>l!==loc); localStorage.setItem('effah_custom_locations',JSON.stringify(customLocations)); if(activeLocation===loc) activeLocation='MEKAH'; renderLocationTabs(); renderRoomingGrid(); renderNamelist(); }

function renderLocationTabs(){
  const cont=document.getElementById('roomingTabs'); if(!cont) return;
  const baseLocs=['MEKAH','MADINAH','TAIF','JEDDAH'];
  const allLocs=[...baseLocs,...customLocations.filter(l=>!baseLocs.includes(l))];
  allRoomingRecords.forEach(r=>{ const l=(r.fields['LOKASI / CITY']||'').trim().toUpperCase(); if(l&&!allLocs.includes(l)) allLocs.push(l); });
  cont.innerHTML=allLocs.map(loc=>{
    const isActive=loc===activeLocation;
    const count=allRoomingRecords.filter(r=>(r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===loc).length;
    const isCustom=customLocations.includes(loc);
    return `<button onclick="setActiveLocation('${loc}')" class="px-2.5 py-1 rounded-full text- font-bold border ${isActive?'bg-[#7A0C2E] text-white border-[#7A0C2E]':'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}">${loc} (${count}) ${isCustom?`<span onclick="event.stopPropagation();deleteCustomLocation('${loc}')" class="ml-1">✕</span>`:''}</button>`;
  }).join('') + `<button onclick="openAddLocationModal()" class="px-2.5 py-1 rounded-full text- font-bold border bg-white border-dashed">+ Lokasi</button>`;
}
function renderRoomingOverview(rooms){
  const el=document.getElementById('roomingOverview'); if(!el) return;
  if(rooms.length===0){ el.innerHTML='<div class="text- text-slate-400">Tiada bilik di lokasi ini</div>'; return; }
  const byHotel={}; rooms.forEach(r=>{ const h=(r.fields['HOTEL NAME']||'TANPA HOTEL').trim().toUpperCase()||'TANPA HOTEL'; if(!byHotel[h]) byHotel[h]=[]; byHotel[h].push(r); });
  el.innerHTML=Object.keys(byHotel).map(hotel=>{
    const caps={}; byHotel[hotel].forEach(r=>{ const c=r.fields['KAPASITI']||4; caps[c]=(caps[c]||0)+1; });
    return `<div class="flex justify-between"><span class="font-bold">${hotel}</span><span>${Object.keys(caps).map(c=>`B${c}-${caps[c]}`).join(', ')}</span></div>`;
  }).join('');
}
function getRoomOrderedList(rooms){
  return rooms.sort((a,b)=>{
    const aId=(a.fields['Room ID / Nama Bilik']||'').toString(); const bId=(b.fields['Room ID / Nama Bilik']||'').toString();
    return aId.localeCompare(bId);
  });
}
function openCopyRoomsModal(){
  const m=document.getElementById('copyRoomsModal'); if(!m) return;
  const srcSel=document.getElementById('copySourceLoc');
  const baseLocs=['MEKAH','MADINAH','TAIF','JEDDAH'];
  const allLocs=[...baseLocs,...customLocations];
  srcSel.innerHTML=allLocs.filter(l=>l!==activeLocation).map(l=>`<option>${l}</option>`).join('');
  document.getElementById('copyTargetLoc').textContent=activeLocation;
  m.classList.remove('hidden');
}
function closeCopyRoomsModal(){ document.getElementById('copyRoomsModal').classList.add('hidden'); }
async function submitCopyRooms(){
  const src=document.getElementById('copySourceLoc').value;
  const mode=document.getElementById('copyMode').value;
  const tripId=window.selectedTripRecord?.id||localStorage.getItem('effah_active_trip_id')||localStorage.getItem('selectedTripId')||localStorage.getItem('effah_last_selected_trip');
  if(!src||!tripId){ alert('Sila pilih sumber lokasi'); return; }
  const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base')||localStorage.getItem('effah_base_id'); const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
  const roomsToCopy=allRoomingRecords.filter(r=>(r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===src.toUpperCase());
  if(roomsToCopy.length===0){ alert('Tiada bilik di lokasi sumber'); return; }
  let created=0, failed=0;
  for(const rec of roomsToCopy){
    const f=rec.fields;
    let payloadFields={
      'PAKEJ / HOTEL':f['PAKEJ / HOTEL']||'EKONOMI',
      'KAPASITI':f['KAPASITI']||4,
      'HOTEL NAME':f['HOTEL NAME']||'',
      'CATATAN BILIK':f['CATATAN BILIK']||'',
      'TRIP':[tripId],
      'LOKASI / CITY':activeLocation
    };
    if(mode==='withJemaah' && f['JEMAAH']){ payloadFields['JEMAAH']=f['JEMAAH']; }
    if(f['STAFF / EXTRA']){ payloadFields['STAFF / EXTRA']=f['STAFF / EXTRA']; }
    try{
      const res=await fetch(`https://api.airtable.com/v0/${base}/ROOMING%20LIST`,{method:'POST',headers:{Authorization:`Bearer ${pat}`,'Content-Type':'application/json'},body:JSON.stringify({fields:payloadFields})});
      const newRec=await res.json();
      if(newRec.id){ allRoomingRecords.push(newRec); created++; }
      else { failed++; console.error('Copy failed', newRec); }
    }catch(e){ failed++; console.error(e); }
  }
  closeCopyRoomsModal(); renderRoomingGrid(); renderLocationTabs(); renderNamelist(); renderStaffList();
  if(created>0) alert(`Berjaya menyalin ${created} bilik dari ${src} ke ${activeLocation} (${mode==='structure'?'struktur sahaja':'bersama jemaah'}).` + (failed>0?` ${failed} bilik gagal disalin.`:''));
  else alert('Gagal menyalin bilik. Sila cuba semula.');
}
function getStaffStorageKey(){ return `effah_staff_list_${localStorage.getItem('effah_active_trip_id')||'default'}`; }
function loadStaffList(){ staffList=JSON.parse(localStorage.getItem(getStaffStorageKey())||'[]'); renderStaffList(); }
function saveStaffList(){ localStorage.setItem(getStaffStorageKey(),JSON.stringify(staffList)); }
function addNewStaff(){ const input=document.getElementById('newStaffInput'); if(!input) return; let name=input.value.trim().toUpperCase(); if(!name) { alert('Sila masukkan nama staff.'); return; } if(!name.includes('(')) name=`${name} (EFFAH)`; const id=`staff_${Date.now()}_${++staffIdCounter}`; localStorage.setItem('effah_staff_counter',staffIdCounter); staffList.push({id,name}); saveStaffList(); renderStaffList(); }
function renderStaffList(){
  const cont=document.getElementById('staffListContainer'); const badge=document.getElementById('staffTotalBadge'); if(!cont) return; if(badge) badge.textContent=staffList.length+' Staff';
  if(staffList.length===0){ cont.innerHTML='<div class="p-2.5 text-center text- text-slate-400">Tiada staff / extra</div>'; return; }
  cont.innerHTML=staffList.map((s,idx)=>{
    const assignedInLoc=isStaffAssignedInLocation(s.id, activeLocation);
    const cls=assignedInLoc?'opacity-40 bg-slate-50 pointer-events-none':'bg-white hover:bg-slate-50 cursor-grab'; const drag=assignedInLoc?'':`draggable="true" ondragstart="dragStaff(event,'${s.id}')" ondragend="dragStaffEnd(event)"`;
    return `<div ${drag} class="flex items-center justify-between px-2.5 py-2 rounded-xl border text- ${cls}"><div class="flex gap-2"><span class="text-slate-400 text-">${String(idx+1).padStart(2,'0')}</span><span class="font-medium">${s.name}</span>${assignedInLoc?'<span class="ml-1 px-1 py-0.5 bg-slate-200 rounded text-">ASSIGNED di '+activeLocation+'</span>':''}</div><div class="flex gap-1"><button onclick="quickAssignStaff('${s.id}')" class="w-5 h-5 rounded-full border ${assignedInLoc?'opacity-30':'hover:bg-[#7A0C2E] hover:text-white'} text-">+</button><button onclick="deleteStaff('${s.id}')" class="w-5 h-5 rounded-full border hover:bg-red-50 text-"><i class="fa-solid fa-trash text-"></i></button></div></div>`;
  }).join('');
}
function deleteStaff(staffId){ if(!confirm('Adakah anda pasti ingin memadamkan staff ini?')) return; staffList=staffList.filter(s=>s.id!==staffId); saveStaffList(); renderStaffList(); renderNamelist(); }
function dragStaff(e,staffId){ if(isStaffAssignedInLocation(staffId, activeLocation)) return; e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('text/staff-id',staffId); e.dataTransfer.setData('text/plain',staffId); const row=e.currentTarget; if(row) setTimeout(()=>row.style.opacity='0.3',0); }
function dragStaffEnd(e){ e.currentTarget.style.opacity='1'; }
function quickAssignStaff(staffId){ if(isStaffAssignedInLocation(staffId, activeLocation)) return; const rooms=allRoomingRecords.filter(r=>(r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===activeLocation); const target=rooms.find(r=>{ const j=r.fields['JEMAAH']?.length||0; const s=(r.fields['STAFF / EXTRA']||'').split(',').filter(Boolean).length; return (j+s)<(r.fields['KAPASITI']||4); }); if(target) assignStaffToRoom(staffId,target.id); else alert('Tiada slot kosong di lokasi '+activeLocation+'.'); }
async function assignStaffToRoom(staffId,roomId){ const staff=staffList.find(s=>s.id===staffId); if(!staff) return; const rec=allRoomingRecords.find(r=>r.id===roomId); if(!rec) return; const cur=(rec.fields['STAFF / EXTRA']||'').trim(); const newVal=cur?cur+','+staff.name:staff.name; await updateRoomField(roomId,'STAFF / EXTRA',newVal,true); }
function removeStaff(roomId,staffName){ const rec=allRoomingRecords.find(r=>r.id===roomId); const arr=(rec.fields['STAFF / EXTRA']||'').split(',').map(s=>s.trim()).filter(s=>s&&s!==staffName); updateRoomField(roomId,'STAFF / EXTRA',arr.join(','),true); }

// V24 PRINT - Page1 namelist centered, Page2+ per lokasi, tanpa EJEN, include semua staff NA, placeholder umum
function generateRoomingPrint(){
  const tripNameRaw=window.selectedTripRecord?.fields?.Trip||document.getElementById('roomingTripSelect')?.selectedOptions[0]?.text||'Trip';
  const tripName=cleanTripNameForRooming(tripNameRaw);
  const baseLocs=['MEKAH','MADINAH','TAIF','JEDDAH'];
  const allLocs=[...baseLocs,...customLocations.filter(l=>!baseLocs.includes(l))];
  allRoomingRecords.forEach(r=>{ const l=(r.fields['LOKASI / CITY']||'').trim().toUpperCase(); if(l&&!allLocs.includes(l)) allLocs.push(l); });
  const activeLocsWithRooms = allLocs.filter(loc=> allRoomingRecords.some(r=>(r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===loc.toUpperCase()));

  const allStaffNames = staffList.map(s=>s.name);
  const staffInAnyRoom = [];
  allRoomingRecords.forEach(r=> (r.fields['STAFF / EXTRA']||'').split(',').filter(Boolean).forEach(s=>{ if(!staffInAnyRoom.includes(s)) staffInAnyRoom.push(s); }));
  const combinedStaff = [...new Set([...allStaffNames,...staffInAnyRoom])];

  // NAMELIST - baca field Airtable jika ada, fallback jika belum ada (FULLBOARD, TRAIN, PAKEJ, INSURAN) dengan highlight warna macam portal
  function getFbPrintStyle(board){
    if(board==='FULLBOARD') return 'background:#6EE7B7;color:#065F46;font-weight:bold;border:1px solid #10B981;padding:2px 6px;border-radius:10px;display:inline-block';
    if(board.includes('MEKAH')) return 'background:#FDE68A;color:#92400E;font-weight:bold;border:1px solid #F59E0B;padding:2px 6px;border-radius:10px;display:inline-block';
    if(board.includes('MADINAH')) return 'background:#93C5FD;color:#1E3A8A;font-weight:bold;border:1px solid #3B82F6;padding:2px 6px;border-radius:10px;display:inline-block';
    if(board==='NO FULLBOARD') return 'background:#E5E7EB;color:#6B7280;border:1px solid #D1D5DB;padding:2px 6px;border-radius:10px;display:inline-block';
    return 'color:#9CA3AF';
  }
  function getTrainPrintStyle(train){
    if(train==='TRAIN') return 'background:#FDE68A;color:#92400E;font-weight:bold;border:1px solid #F59E0B;padding:2px 8px;border-radius:10px;display:inline-block';
    return 'color:#9CA3AF';
  }
  function getInsuranPrintBadges(insArr){
    if(!insArr || insArr.length===0) return '<span style="color:#9CA3AF">-</span>';
    return insArr.map(opt=>{
      if(opt==='TAKAFUL') return `<span style="background:#6EE7B7;color:#065F46;font-weight:bold;border:1px solid #10B981;padding:2px 6px;border-radius:10px;margin-right:3px;display:inline-block;font-size:8px">TAKAFUL</span>`;
      if(opt==='ETIQA') return `<span style="background:#FEF08A;color:#854D0E;font-weight:bold;border:1px solid #EAB308;padding:2px 6px;border-radius:10px;margin-right:3px;display:inline-block;font-size:8px">ETIQA</span>`;
      if(opt==='AL-KHAIRI') return `<span style="background:#93C5FD;color:#1E3A8A;font-weight:bold;border:1px solid #3B82F6;padding:2px 6px;border-radius:10px;margin-right:3px;display:inline-block;font-size:8px">AL-KHAIRI</span>`;
      return `<span style="background:#E5E7EB;color:#374151;border:1px solid #D1D5DB;padding:2px 6px;border-radius:10px;margin-right:3px;display:inline-block;font-size:8px">${opt}</span>`;
    }).join('');
  }

  let namelistRows=allRoomingJemaah.map((j,idx)=>{
    const name=getJemaahName(j.fields);
    const board=getFullboardVal(j.fields) || '-';
    const train=isTrainChecked(j.fields)? 'TRAIN' : '-';
    const pakej=getPakejVal(j.fields) || '-';
    const insArr=getInsuranArray(j.fields);
    const fbStyle=getFbPrintStyle(board);
    const trainStyle=getTrainPrintStyle(train);
    const insBadges=getInsuranPrintBadges(insArr);
    const pakejStyle = pakej!=='-'? 'background:#F3F4F6;color:#111827;font-weight:bold;border:1px solid #D1D5DB;padding:2px 6px;border-radius:10px;display:inline-block' : 'color:#9CA3AF';
    return `<tr>
      <td>${idx+1}</td>
      <td>${name}</td>
      <td><span style="${fbStyle}">${board}</span></td>
      <td><span style="${trainStyle}">${train}</span></td>
      <td><span style="${pakejStyle}">${pakej}</span></td>
      <td>${insBadges}</td>
    </tr>`;
  }).join('');

  combinedStaff.forEach(sName=>{
    const cleanName=sName.replace(/\(EFFAH\)/i,'').trim();
    namelistRows+=`<tr><td>NA</td><td>${cleanName} (EFFAH)</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>`;
  });

  // Build per location pages
  let locationPages='';
  activeLocsWithRooms.forEach((loc, locIndex)=>{
    let rooms=[...allRoomingRecords].filter(r=>(r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===loc.toUpperCase());
    if(rooms.length===0) return;
    rooms=getRoomOrderedList(rooms);
    const byHotel={}; rooms.forEach(r=>{ const hotel=(r.fields['HOTEL NAME']||'TANPA HOTEL').trim().toUpperCase()||'TANPA HOTEL'; if(!byHotel[hotel]) byHotel[hotel]=[]; byHotel[hotel].push(r); });
    let overviewMini = Object.keys(byHotel).map(hotel=>{
      const capCount={}; byHotel[hotel].forEach(r=>{ const cap=r.fields['KAPASITI']||4; capCount[cap]=(capCount[cap]||0)+1; });
      return `${hotel}: ${Object.keys(capCount).map(c=>`B${c}-${capCount[c]}`).join(', ')}`;
    }).join(' | ');
    const roomBlocks=rooms.map(r=>{
      const f=r.fields; const rid=f['Room ID / Nama Bilik']||generateRoomIdFromCap(f['KAPASITI']); const pakej=f['PAKEJ / HOTEL']||'EKONOMI'; const hotel=f['HOTEL NAME']||'TANPA HOTEL'; const jIds=f['JEMAAH']||[]; const staff=(f['STAFF / EXTRA']||'').split(',').filter(Boolean);
      let rows=jIds.map((jId,idx)=>{ const rec=allRoomingJemaah.find(j=>j.id===jId); const name=getJemaahName(rec?.fields); return name && name!=='-'? `<div>${idx+1}. ${name}</div>` : ''; }).filter(Boolean).join('');
      staff.forEach((s)=>{ const clean=s.replace(/\(EFFAH\)/i,'').trim(); rows+=`<div style="color:#7A0C2E">NA ${clean} (EFFAH)</div>`; });
      return `<div style="border:1px solid #000;margin-bottom:8px;padding:6px 8px;background:#fff;break-inside:avoid"><div style="display:flex;justify-content:space-between;font-weight:bold;font-size:10px;border-bottom:1px solid #000;padding-bottom:3px;margin-bottom:4px"><span>${rid} (${pakej}) - ${hotel}</span><span>${jIds.length+staff.length}/${f['KAPASITI']||4}</span></div><div style="font-size:9px;line-height:1.6">${rows||'- Kosong -'}</div></div>`;
    }).join('');
    const icon = loc==='MEKAH'?'🕋':loc==='MADINAH'?'🕌':loc==='TAIF'?'⛰️':loc==='JEDDAH'?'🏙️':'📍';
    const totalJemaahLoc = rooms.reduce((s,r)=>s+(r.fields['JEMAAH']?.length||0),0);
    const totalStaffLoc = rooms.reduce((s,r)=>s+(r.fields['STAFF / EXTRA']||'').split(',').filter(Boolean).length,0);
    locationPages+=`
      <div class="page-break"></div>
      <div class="location-page">
        <div class="header"><span>ROOMING LIST ${tripName} - ${icon} ${loc} (${rooms.length} BILIK)</span><span>${overviewMini}</span></div>
        <div style="font-size:9px;margin-bottom:8px;background:#f5f5f5;border:1px solid #000;padding:5px 8px"><b>${icon} ${loc} OVERVIEW:</b> ${overviewMini} | Total: ${rooms.length} bilik, ${totalJemaahLoc} jemaah + ${totalStaffLoc} staff</div>
        <div style="columns:2; column-gap:12px">${roomBlocks}</div>
      </div>
    `;
  });

  const html=`<html><head><title>Rooming ${tripName}</title><style>
    body{font-family:Arial, Helvetica, sans-serif;font-size:10px;margin:12px;color:#000}
    table{border-collapse:collapse;width:100%}
    th,td{border:1px solid #000;padding:4px 6px;font-size:9px}
    th{background:#e5e5e5;font-weight:bold;text-transform:uppercase}
  .header{display:flex;justify-content:space-between;font-weight:bold;font-size:12px;border-bottom:2px solid #000;padding-bottom:6px;margin-bottom:8px}
  .page-break{page-break-before:always}
  .namelist-page{max-width:900px;margin:0 auto}
  .location-page{max-width:100%}
    @media print{
      @page{size:A4 landscape;margin:10mm}
      body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
     .page-break{page-break-before:always}
    }
  </style></head><body>
    <!-- PAGE 1: NAMELIST CENTERED -->
    <div class="namelist-page">
      <div class="header"><span>NAMELIST ${tripName}</span><span>Total: ${allRoomingJemaah.length} Jemaah + ${combinedStaff.length} Staff</span></div>
      <div style="font-size:9px;margin-bottom:8px"><b>Trip:</b> ${tripName} | <b>Tarikh Cetak:</b> ${new Date().toLocaleDateString('ms-MY')}</div>
      <table>
        <tr><th style="width:30px">NO</th><th>NAMA JEMAAH</th><th style="width:110px">FULLBOARD</th><th style="width:50px">TRAIN</th><th style="width:75px">PAKEJ</th><th style="width:70px">INSURAN</th></tr>
        ${namelistRows}
      </table>
    </div>
    ${locationPages||'<div class="page-break"></div><div style="border:1px dashed #000;padding:20px;text-align:center">Tiada bilik untuk trip ini</div>'}
    <script>window.onload=function(){setTimeout(()=>window.print(),500)}</script>
  </body></html>`;
  const w=window.open('','_blank'); if(w){ w.document.write(html); w.document.close(); }
}
async function autoAssignRooming(){ if(!confirm('Adakah anda pasti ingin menetapkan semua jemaah yang belum ditetapkan untuk lokasi '+activeLocation+' secara automatik?')) return; let rooms=[...allRoomingRecords].filter(r=>(r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===activeLocation.toUpperCase()); if(rooms.length===0) rooms=[...allRoomingRecords]; rooms=getRoomOrderedList(rooms); const unassigned=allRoomingJemaah.filter(j=>!isJemaahAssignedInLocation(j.id, activeLocation)); let idx=0; for(let room of rooms){ const cap=room.fields['KAPASITI']||roomingDefaultCap; const staffCount=(room.fields['STAFF / EXTRA']||'').split(',').filter(Boolean).length; let cur=[...(room.fields['JEMAAH']||[])]; while((cur.length+staffCount)<cap && idx<unassigned.length){ cur.push(unassigned[idx].id); idx++; } if(cur.length!==(room.fields['JEMAAH']||[]).length){ await updateRoomField(room.id,'JEMAAH',cur,false); } } setTimeout(fetchRoomingData,800); }
