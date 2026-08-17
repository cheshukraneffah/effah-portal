// ROOMING V24 - Fix grayed still editable + print highlight (TAKAFUL hijau, ETIQA kuning, KHAIRI biru, TRAIN kuning)
// Base: V23 exact layout, only 2 patches
var allRoomingRecords = window.allRoomingRecords || [];
var allRoomingJemaah = window.allRoomingJemaah || [];
var activeLocation = window.activeLocation || localStorage.getItem('effah_active_location') || 'MEKAH';
var roomingDefaultCap = 4;
var customLocations = window.customLocations || JSON.parse(localStorage.getItem('effah_custom_locations')||'[]');
var staffList = window.staffList || [];

var staffIdCounter = window.staffIdCounter || parseInt(localStorage.getItem('effah_staff_counter')||'1000');
var roomingSortDir = window.roomingSortDir || localStorage.getItem('effah_rooming_sort_dir') || 'asc';
var roomingSortActive = typeof window.roomingSortActive !== 'undefined' ? window.roomingSortActive : (localStorage.getItem('effah_rooming_sort_active') === 'true' ? true : false);
window.allRoomingRecords = allRoomingRecords;
window.allRoomingJemaah = allRoomingJemaah;
window.activeLocation = activeLocation;
window.staffList = staffList;
window.staffIdCounter = staffIdCounter;
function getStaffStorageKey(){ return `effah_staff_list_${activeLocation}_${window.selectedTripRecord?.id||localStorage.getItem('effah_active_trip_id')||'default'}`; }
function saveStaffList(){ try{ localStorage.setItem(getStaffStorageKey(), JSON.stringify(staffList)); localStorage.setItem('effah_staff_board_'+activeLocation, JSON.stringify(staffList)); }catch(e){} }

async function loadStaffList(){
  try{
    const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base')||localStorage.getItem('effah_base_id');
    const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
    const tripId=window.selectedTripRecord?.id||localStorage.getItem('effah_active_trip_id')||localStorage.getItem('selectedTripId')||'';
    if(!base||!pat){ staffList=JSON.parse(localStorage.getItem(getStaffStorageKey())||'[]'); renderStaffList(); return; }
    let allStaff=[],offset='';
    do{
      const res=await fetch(`https://api.airtable.com/v0/${base}/STAFF%20LIST%20%28ROOMING%29?pageSize=100${offset?`&offset=${offset}`:''}`,{headers:{Authorization:`Bearer ${pat}`}});
      const data=await res.json();
      if(data.records) allStaff=allStaff.concat(data.records);
      offset=data.offset||'';
    }while(offset);
    let filtered=allStaff;
    if(tripId){
      filtered=allStaff.filter(r=>{
        const tf=r.fields['TRIP']||[];
        if(Array.isArray(tf)) return tf.includes(tripId);
        return String(tf).includes(tripId);
      });
    }
    staffList=filtered.map(r=>({
      id:r.id,
      airtableId:r.id,
      name:r.fields['NAME']||'',
      boardBasis:r.fields['BOARD BASIS']||'',
      train:!!r.fields['TRAIN'],
      sortNumber:r.fields['SORT NUMBER']||9999,
      trip:r.fields['TRIP']||[],
      roomIds: r.fields['ROOMING LIST'] || r.fields['ROOM'] || r.fields['BILIK'] || [],
      roomLink: (r.fields['ROOMING LIST']||[])[0]||null
    }));
    staffList.sort((a,b)=>(a.sortNumber||9999)-(b.sortNumber||9999));
    if(staffList.length===0){
      const local=JSON.parse(localStorage.getItem(getStaffStorageKey())||'[]');
      if(local.length>0) staffList=local;
    }
    renderStaffList();
    renderRoomingGrid();
    try{ renderRoomingOverview(allRoomingRecords.filter(r=>(r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===activeLocation.toUpperCase())); }catch(e){}
  }catch(e){
    console.error('loadStaffList Airtable failed', e);
    staffList=JSON.parse(localStorage.getItem(getStaffStorageKey())||'[]');
    renderStaffList();
  }
}

async function addNewStaff(){
  const input=document.getElementById('newStaffInput'); if(!input) return;
  let name=input.value.trim().toUpperCase();
  if(!name){ alert('Sila masukkan nama staff.'); return; }
  if(!name.includes('(')) name=`${name} (EFFAH)`;
  const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base')||localStorage.getItem('effah_base_id');
  const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
  const tripId=window.selectedTripRecord?.id||localStorage.getItem('effah_active_trip_id')||'';
  try{
    if(base&&pat){
      const res=await fetch(`https://api.airtable.com/v0/${base}/STAFF%20LIST%20%28ROOMING%29`,{
        method:'POST',
        headers:{'Authorization':`Bearer ${pat}`,'Content-Type':'application/json'},
        body: JSON.stringify({fields:{'NAME': name, 'BOARD BASIS':'', 'TRAIN': false, 'TRIP': tripId?[tripId]:[], 'SORT NUMBER': staffList.length+1}})
      });
      const data=await res.json();
      if(data.id){
        staffList.push({id:data.id, airtableId:data.id, name, boardBasis:'', train:false, sortNumber:staffList.length+1, trip:tripId?[tripId]:[]});
        saveStaffList(); renderStaffList(); input.value=''; return;
      }
    }
  }catch(e){ console.error('Add staff Airtable failed', e); }
  const id=`staff_${Date.now()}_${++staffIdCounter}`;
  staffList.push({id, name, boardBasis:'', train:false, sortNumber:staffList.length+1});
  saveStaffList(); renderStaffList(); input.value='';
}

async function updateStaffField(staffId, field, value){
  const s=staffList.find(x=>x.id===staffId||x.airtableId===staffId); if(!s) return;
  if(field==='boardBasis') s.boardBasis=value; else s[field]=value;
  saveStaffList(); renderStaffList();
  const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base')||localStorage.getItem('effah_base_id');
  const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
  if(!base||!pat||!s.airtableId) return;
  try{
    const airtableField = field==='boardBasis' ? 'BOARD BASIS' : field.toUpperCase();
    await fetch(`https://api.airtable.com/v0/${base}/STAFF%20LIST%20%28ROOMING%29/${s.airtableId}`,{
      method:'PATCH',
      headers:{'Authorization':`Bearer ${pat}`,'Content-Type':'application/json'},
      body: JSON.stringify({fields:{[airtableField]: value}})
    });
  }catch(e){ console.error('updateStaffField failed', e); }
}

async function updateStaffTrain(staffId, checked){
  const s=staffList.find(x=>x.id===staffId||x.airtableId===staffId); if(!s) return;
  s.train=checked; saveStaffList(); renderStaffList();
  const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base')||localStorage.getItem('effah_base_id');
  const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
  if(!base||!pat||!s.airtableId) return;
  try{
    await fetch(`https://api.airtable.com/v0/${base}/STAFF%20LIST%20%28ROOMING%29/${s.airtableId}`,{
      method:'PATCH',
      headers:{'Authorization':`Bearer ${pat}`,'Content-Type':'application/json'},
      body: JSON.stringify({fields:{'TRAIN': checked}})
    });
  }catch(e){ console.error('updateStaffTrain failed', e); }
}

async function assignStaffToRoom(staffId,roomId){
  const staff=staffList.find(s=>s.id===staffId||s.airtableId===staffId); if(!staff) return;
  const rec=allRoomingRecords.find(r=>r.id===roomId); if(!rec) return;
  staff.roomIds = [roomId];
  staff.roomLink = roomId;
  saveStaffList(); renderStaffList(); renderRoomingGrid(); renderLocationTabs();
  const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base')||localStorage.getItem('effah_base_id');
  const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
  if(!base||!pat||!staff.airtableId) return;
  try{
    let fieldName = 'ROOMING LIST';
    let res = await fetch(`https://api.airtable.com/v0/${base}/STAFF%20LIST%20%28ROOMING%29/${staff.airtableId}`,{
      method:'PATCH',
      headers:{'Authorization':`Bearer ${pat}`,'Content-Type':'application/json'},
      body: JSON.stringify({fields:{[fieldName]: [roomId]}})
    });
    let data = await res.json();
    if(data.error){
      fieldName = 'ROOM';
      await fetch(`https://api.airtable.com/v0/${base}/STAFF%20LIST%20%28ROOMING%29/${staff.airtableId}`,{
        method:'PATCH',
        headers:{'Authorization':`Bearer ${pat}`,'Content-Type':'application/json'},
        body: JSON.stringify({fields:{[fieldName]: [roomId]}})
      });
    }
  }catch(e){ console.error('assignStaffToRoom link failed', e); }
}
async function removeStaffFromRoom(roomId, staffId){
  const staff=staffList.find(s=>s.id===staffId||s.airtableId===staffId); if(!staff) return;
  staff.roomIds = [];
  staff.roomLink = null;
  saveStaffList(); renderStaffList(); renderRoomingGrid(); renderLocationTabs();
  const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base')||localStorage.getItem('effah_base_id');
  const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
  if(!base||!pat||!staff.airtableId) return;
  try{
    await fetch(`https://api.airtable.com/v0/${base}/STAFF%20LIST%20%28ROOMING%29/${staff.airtableId}`,{
      method:'PATCH',
      headers:{'Authorization':`Bearer ${pat}`,'Content-Type':'application/json'},
      body: JSON.stringify({fields:{'ROOMING LIST': [], 'ROOM': []}})
    });
  }catch(e){ console.error('removeStaffFromRoom failed', e); }
}
function removeStaff(roomId,staffName){
  const s=staffList.find(x=>x.id===staffName||x.airtableId===staffName||x.name===staffName);
  if(s){ removeStaffFromRoom(roomId, s.id); return; }
  const rec=allRoomingRecords.find(r=>r.id===roomId); if(!rec) return;
  const arr=(rec.fields['STAFF / EXTRA']||'').split(',').map(x=>x.trim()).filter(x=>x&&x!==staffName);
  updateRoomField(roomId,'STAFF / EXTRA',arr.join(','),true);
}

async function deleteStaff(staffId){
  const s=staffList.find(x=>x.id===staffId||x.airtableId===staffId);
  const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base')||localStorage.getItem('effah_base_id');
  const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
  if(base&&pat&&s?.airtableId){
    try{ await fetch(`https://api.airtable.com/v0/${base}/STAFF%20LIST%20%28ROOMING%29/${s.airtableId}`,{method:'DELETE', headers:{'Authorization':`Bearer ${pat}`}}); }catch(e){ console.error(e); }
  }
  staffList=staffList.filter(x=>x.id!==staffId&&x.airtableId!==staffId);
  saveStaffList(); renderStaffList();
}

function renderStaffList(){
  const cont=document.getElementById('staffListContainer'); const badge=document.getElementById('staffTotalBadge'); if(!cont) return; if(badge) badge.textContent=staffList.length+' Staff';
  if(staffList.length===0){ cont.innerHTML='<div class="p-2.5 text-center text-[11px] text-slate-400">Tiada staff / extra</div>'; return; }
  cont.innerHTML=staffList.map((s,idx)=>{
    const assignedInLoc=isStaffAssignedInLocation(s.id, activeLocation); 
    const cls=assignedInLoc?'opacity-50 bg-slate-50':'bg-white hover:bg-slate-50 cursor-grab'; const drag=assignedInLoc?'':`draggable="true" ondragstart="dragStaff(event,'${s.id}')" ondragend="dragStaffEnd(event)"`;
    const boardVal=s.boardBasis||'';
    let boardCls='bg-white border-slate-200';
    if(boardVal==='FULLBOARD (MEKAH)' || boardVal==='BB (MEKAH)') boardCls='bg-orange-100 border-orange-200 text-orange-800';
    else if(boardVal==='FULLBOARD (MADINAH)' || boardVal==='BB (MADINAH)') boardCls='bg-blue-100 border-blue-200 text-blue-800';
    else if(boardVal==='FULLBOARD') boardCls='bg-emerald-100 border-emerald-200 text-emerald-800';
    return `<div ${drag} class="flex flex-col gap-1 px-2.5 py-2 rounded-xl border text-[11px] ${cls}">
      <div class="flex items-center justify-between">
        <div class="flex gap-2 items-center"><span class="text-slate-400 text-[10px]">${String(idx+1).padStart(2,'0')}</span><span class="font-medium truncate max-w-[120px]">${s.name}</span>${assignedInLoc?'<span class="ml-1 px-1 py-0.5 bg-slate-200 rounded text-[8px]">ASSIGNED di '+activeLocation+'</span>':''}</div>
        <div class="flex gap-1"><button onclick="quickAssignStaff('${s.id}')" class="w-5 h-5 rounded-full border ${assignedInLoc?'opacity-30':'hover:bg-[#7A0C2E] hover:text-white'} text-[10px]">+</button><button onclick="deleteStaff('${s.id}')" class="w-5 h-5 rounded-full border hover:bg-red-50 text-[10px]"><i class="fa-solid fa-trash text-[9px]"></i></button></div>
      </div>
      <div class="flex items-center gap-1">
        <select onchange="updateStaffField('${s.id}','boardBasis',this.value)" class="text-[8px] border rounded-full px-1.5 py-0.5 font-bold ${boardCls} outline-none flex-1">
          <option value="" ${!boardVal?'selected':''}>- BOARD</option>
          <option value="FULLBOARD" ${boardVal==='FULLBOARD'?'selected':''}>FULLBOARD</option>
          <option value="FULLBOARD (MEKAH)" ${boardVal==='FULLBOARD (MEKAH)'?'selected':''}>FULLBOARD (MEKAH)</option>
          <option value="FULLBOARD (MADINAH)" ${boardVal==='FULLBOARD (MADINAH)'?'selected':''}>FULLBOARD (MADINAH)</option>
          <option value="BB (MEKAH)" ${boardVal==='BB (MEKAH)'?'selected':''}>BB (MEKAH)</option>
          <option value="BB (MADINAH)" ${boardVal==='BB (MADINAH)'?'selected':''}>BB (MADINAH)</option>
        </select>
        <label class="flex items-center gap-1 text-[8px] border rounded-full px-1.5 py-0.5 bg-white cursor-pointer"><input type="checkbox" ${s.train?'checked':''} onchange="updateStaffTrain('${s.id}',this.checked)" class="w-3 h-3"> TRAIN</label>
      </div>
    </div>`;
  }).join('');
}


function cleanTripNameForRooming(name){
  if(!name) return '';
  if(typeof cleanTripName==='function') return cleanTripName(name);
  return name.replace(/^\s*\d+\/\d+\s*\|\s*/i, '').replace(/^\s*\d+\/\d+\s*/i,'').trim();
}
function getJemaahName(f){ if(!f) return '-'; return f['NAMA'] || f['NAME'] || f['NAMA JEMAAH'] || f['NAMA PENUH'] || f['Name'] || '-'; }
function generateRoomIdFromCap(cap){ return `B${parseInt(cap)||4}`; }
function getFullboardVal(f){ return f['BOARD BASIS'] || f['BOARD'] || ''; }
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
function isTrainChecked(f){ return !!f['TRAIN']; }
function formatCheckbox(v){ return v ? '✓' : '-'; }

document.addEventListener('DOMContentLoaded', () => {
  if(document.getElementById('modul-rooming')) renderRoomingHTML();
  setTimeout(()=>populateRoomingTripDropdown(), 600);
});

function showRoomingLoading(){
  const g=document.getElementById('roomingGrid'); const l=document.getElementById('namelistContainer');
  const spinner = `<div class="flex flex-col items-center justify-center gap-3 py-10"><div class="w-8 h-8 border-[3px] border-slate-200 border-t-[#7A0C2E] rounded-full animate-spin"></div><div class="text-[11px] text-slate-600 font-medium">Memuatkan jemaah...</div></div>`;
  const spinnerBilik = `<div class="col-span-2 flex flex-col items-center justify-center gap-3 py-16"><div class="w-8 h-8 border-[3px] border-slate-200 border-t-[#7A0C2E] rounded-full animate-spin"></div><div class="text-[11px] text-slate-600 font-medium">Memuatkan bilik...</div></div>`;
  const skeletonRooms = Array.from({length:4}).map(()=>`<div class="bg-white rounded-2xl border border-slate-200 p-3 animate-pulse"><div class="h-4 bg-slate-100 rounded-full w-1/3 mb-3"></div><div class="h-3 bg-slate-100 rounded-full w-2/3 mb-4"></div><div class="space-y-2"><div class="h-9 bg-slate-50 rounded-xl"></div><div class="h-9 bg-slate-50 rounded-xl"></div><div class="h-9 bg-slate-100 rounded-xl border border-dashed"></div></div></div>`).join('');
  const skeletonList = Array.from({length:6}).map(()=>`<div class="px-2.5 py-3 flex gap-2 animate-pulse"><div class="w-6 h-3 bg-slate-100 rounded"></div><div class="flex-1 h-3 bg-slate-100 rounded-full"></div><div class="w-16 h-5 bg-slate-50 rounded-full"></div></div>`).join('');
  if(g) g.innerHTML=`${spinnerBilik}<div class="grid grid-cols-1 gap-2.5 mt-2">${skeletonRooms}</div>`;
  if(l) l.innerHTML=`${spinner}<div class="divide-y divide-slate-50 border-t mt-2">${skeletonList}</div>`;
  const overview=document.getElementById('roomingOverview');
  if(overview) overview.innerHTML=`<div class="flex items-center gap-2 text-[11px]"><div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Memuatkan ${activeLocation}...</div>`;
}

function renderRoomingHTML(){
  const c=document.getElementById('modul-rooming'); if(!c) return;
  c.innerHTML=`
  <div class="flex flex-col gap-2.5 p-2">
    <div class="bg-white rounded-2xl border border-slate-200 p-2.5 flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-2.5 flex-wrap">
        <span class="font-bold tracking-widest text-slate-800 text-[11px]">ROOMING LIST</span>
        <select id="roomingTripSelect" onchange="onRoomingTripChange(this.value)" class="px-2.5 py-1 border border-slate-300 rounded-full bg-white text-[11px] font-bold min-w-[240px] max-w-[320px] truncate">
          <option value="">Pilih Trip...</option>
        </select>
      </div>
      <div class="flex items-center gap-1.5 text-[11px]">
        <span id="belumAssignTop" class="px-2 py-0.5 bg-amber-100 rounded-full font-bold text-[10px]">0 Unassigned</span>
        <span id="assignedTop" class="px-2 py-0.5 bg-emerald-50 rounded-full font-bold text-[10px]">0 Assigned</span>
        <button onclick="fetchRoomingData()" class="w-6 h-6 rounded-full border bg-white hover:bg-slate-50 text-[10px]"><i class="fa-solid fa-rotate"></i></button>
      </div>
    </div>

    <div class="flex flex-col lg:flex-row gap-2.5 items-start">
      <div class="w-full lg:w-[52%] bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        <div class="p-2.5 border-b border-slate-200">
          <div class="flex items-center justify-between mb-2.5">
            <h3 class="font-bold text-[11px] tracking-widest text-slate-700">NAMELIST JEMAAH</h3>
            <div class="flex gap-1">
              <span id="belumAssignBadge" class="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px] font-bold">0 Unassigned</span>
              <span id="totalJemaahBadge" class="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-full text-[10px] font-bold">0 Total</span>
            </div>
          </div>
          <div class="flex gap-1.5">
            <div class="relative flex-1">
              <i class="fa-solid fa-magnifying-glass absolute left-2.5 top-2.5 text-slate-400 text-[10px]"></i>
              <input id="searchRoomingJemaah" onkeyup="filterRoomingNamelist()" placeholder="Cari nama jemaah..." class="w-full text-[11px] pl-7 pr-2.5 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none">
            </div>
            <select id="filterPakejRooming" onchange="filterRoomingNamelist()" class="text-[11px] border border-slate-200 rounded-xl px-2.5 py-2 bg-white font-medium"><option value="">Semua Pakej</option><option>JIMAT</option><option>EKONOMI</option><option>STANDARD</option><option>PREMIUM</option></select>
          </div>
        </div>
        <div class="px-2.5 py-1.5 bg-slate-50/70 border-b border-slate-200 grid grid-cols-12 text-[9px] font-bold text-slate-500 tracking-wider">
          <div class="col-span-1">NO</div>
          <div class="col-span-3 flex items-center gap-1 cursor-pointer hover:text-[#7A0C2E] select-none" onclick="toggleSortNama()" title="Klik untuk sort A-Z / Z-A">
            <span id="headerNamaJemaah" class="bg-[#7A0C2E] text-white px-1.5 py-0.5 rounded text-[9px]">NAMA JEMAAH</span>
            <span id="sortIcon" class="text-[10px]">${roomingSortActive ? (roomingSortDir==='asc'?'↑':'↓') : '↕'}</span>
          </div>
          <div class="col-span-2 text-center">BOARD BASIS</div><div class="col-span-1 text-center">TRAIN</div><div class="col-span-3 text-center">INSURAN (TAKAFUL/ETIQA/KHAIRI)</div><div class="col-span-1 text-center">PAKEJ</div><div class="col-span-1 text-center">+</div>
        </div>
        <div id="namelistContainer" class="flex-1 overflow-y-auto max-h-[42vh] divide-y divide-slate-50 bg-white min-h-[180px]"></div>
        <div class="border-t border-slate-200 bg-slate-50/50">
          <div class="p-2.5 flex items-center justify-between">
            <h4 class="font-bold text-[11px] tracking-widest text-slate-700">STAFF / EXTRA LIST</h4>
            <span id="staffTotalBadge" class="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-full text-[10px] font-bold">0 Staff</span>
          </div>
          <div class="px-2.5 pb-2.5 flex gap-1.5">
            <input id="newStaffInput" placeholder="Taip nama staff" class="flex-1 text-[11px] px-2.5 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none" onkeydown="if(event.key==='Enter'){ addNewStaff(); }">
            <button onclick="addNewStaff()" class="px-3 py-2 bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-[11px] font-bold hover:bg-slate-200">+ Add</button>
          </div>
          <div id="staffListContainer" class="px-2 pb-2.5 max-h-[22vh] overflow-y-auto space-y-1 bg-slate-50/50 min-h-[70px]"></div>
        </div>
      </div>

      <div class="w-full lg:w-[48%] flex flex-col gap-2.5">
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-2.5">
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h3 class="font-bold text-[11px] tracking-widest">ROOMING LIST</h3>
              <div class="flex items-center gap-1.5 mt-1 text-[10px]">
                <span id="roomingBiliks" class="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-full font-bold">0 Bilik</span>
                <span id="roomingOccupancy" class="text-slate-500">0 Jemaah + 0 Staff • ${activeLocation}</span>
              </div>
            </div>
            <div class="flex items-center gap-1 flex-wrap">
              <button onclick="generateRoomingPrint()" class="px-2.5 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-bold hover:bg-slate-50">Print / PDF</button>
              <button onclick="openCopyRoomsModal()" class="px-2.5 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-bold hover:bg-slate-50">Copy Bilik</button>
              <button onclick="autoAssignRooming()" class="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-full text-[10px] font-bold hover:bg-slate-200">Auto Assign</button>
              <button onclick="openNewRoomModal()" class="px-2.5 py-1 bg-[#7A0C2E] text-white rounded-full text-[10px] font-bold hover:bg-[#5a0922]">+ Bilik Baru</button>
            </div>
          </div>
          <div id="roomingOverview" class="mt-2.5 p-2.5 bg-[#7A0C2E] text-white rounded-xl text-[11px]"></div>
          <div id="locationTabs" class="flex flex-wrap gap-1 mt-2.5"></div>
        </div>
        <div id="roomingGrid" class="grid grid-cols-1 lg:grid-cols-2 gap-2.5 overflow-y-auto max-h-[78vh] pr-1 content-start min-h-[280px]"></div>
      </div>
    </div>
  </div>

  <div id="newRoomModal" class="fixed inset-0 bg-black/50 z-50 hidden flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl p-4 max-w-sm w-full shadow-2xl">
      <h3 class="font-bold mb-3 text-[11px]">Tambah Bilik Baru</h3>
      <div class="space-y-2.5 text-[11px]">
        <div>
          <label class="text-[9px] font-bold text-slate-500">ROOM ID (Auto)</label>
          <input id="newRoomId" readonly class="w-full p-2 border border-slate-200 rounded-xl bg-slate-100 font-bold text-slate-700 text-[11px]" value="B4">
          <p class="text-[9px] text-slate-400 mt-0.5">Dijana automatik: B + Kapasiti</p>
        </div>
        <select id="newRoomLokasi" class="w-full p-2 border border-slate-200 rounded-xl bg-white text-[11px]"><option value="MEKAH">MEKAH</option><option value="MADINAH">MADINAH</option><option value="TAIF">TAIF</option><option value="JEDDAH">JEDDAH</option></select>
        <select id="newRoomPakej" class="w-full p-2 border border-slate-200 rounded-xl bg-white text-[11px]"><option>JIMAT</option><option>EKONOMI</option><option>STANDARD</option><option>PREMIUM</option></select>
        <input id="newRoomHotel" placeholder="Nama Hotel" class="w-full p-2 border border-slate-200 rounded-xl bg-white text-[11px]">
        <div class="flex gap-2 items-center">
          <input id="newRoomCap" type="number" value="4" min="1" max="8" oninput="updateNewRoomIdFromCap()" class="flex-1 p-2 border border-slate-200 rounded-xl font-bold bg-white text-[11px]">
          <span class="py-2 text-slate-500 font-bold text-[10px]">Kapasiti</span>
          <button type="button" onclick="changeNewRoomCap(-1)" class="w-7 h-7 rounded-full bg-slate-100 border text-[11px]">−</button>
          <button type="button" onclick="changeNewRoomCap(1)" class="w-7 h-7 rounded-full bg-slate-100 border text-[11px]">+</button>
        </div>
        <textarea id="newRoomNote" placeholder="Catatan bilik..." class="w-full p-2 border border-slate-200 rounded-xl h-14 bg-white text-[11px]"></textarea>
        <div class="flex gap-2 pt-1">
          <button onclick="closeNewRoomModal()" class="flex-1 py-2 bg-slate-100 border border-slate-200 rounded-xl font-bold text-[11px]">Batal</button>
          <button onclick="submitNewRoom()" id="btnCiptaBilik" class="flex-1 py-2 bg-[#7A0C2E] text-white rounded-xl font-bold text-[11px]">Cipta Bilik</button>
        </div>
      </div>
    </div>
  </div>

  <div id="copyRoomsModal" class="fixed inset-0 bg-black/50 z-50 hidden flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl p-4 max-w-md w-full shadow-2xl">
      <h3 class="font-bold mb-2 text-[11px]">Salin Bilik Dari Lokasi Lain</h3>
      <p class="text-[10px] text-slate-500 mb-2.5">Salin bilik ke <b id="copyTargetLoc">${activeLocation}</b></p>
      <div class="mb-2.5 p-2.5 bg-slate-50 rounded-xl border">
        <div class="text-[9px] font-bold text-slate-600 mb-1.5">Pilihan Salinan:</div>
        <label class="flex items-start gap-2 p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 cursor-pointer">
          <input type="radio" name="copyMode" value="structure" checked class="mt-0.5">
          <div><div class="text-[11px] font-bold">Struktur bilik sahaja</div><div class="text-[9px] text-slate-500">Hanya kapasiti, pakej & hotel.</div></div>
        </label>
        <label class="flex items-start gap-2 p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 cursor-pointer mt-1.5">
          <input type="radio" name="copyMode" value="withJemaah" class="mt-0.5">
          <div><div class="text-[11px] font-bold">Struktur + Jemaah & Staff</div><div class="text-[9px] text-slate-500">Bilik beserta penghuni akan disalin.</div></div>
        </label>
      </div>
      <div id="copySourceList" class="space-y-1.5 mb-3 max-h-[30vh] overflow-y-auto"></div>
      <div class="flex gap-2"><button onclick="closeCopyRoomsModal()" class="flex-1 py-2 bg-slate-100 border rounded-xl font-bold text-[11px]">Batal</button><button onclick="executeCopyRooms()" class="flex-1 py-2 bg-[#7A0C2E] text-white rounded-xl font-bold text-[11px]">Salin Sekarang</button></div>
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

var draggedRoomId = window.draggedRoomId || null;
function handleRoomDragStart(e, roomId){ draggedRoomId=roomId; e.dataTransfer.effectAllowed='move'; e.target.closest('[data-room-id]')?.classList.add('opacity-50'); }
function handleRoomDragEnd(e){ e.target.closest('[data-room-id]')?.classList.remove('opacity-50'); draggedRoomId=null; }
function allowDropRoom(e){ e.preventDefault(); e.currentTarget.classList.add('ring-2','ring-[#7A0C2E]/30'); }
function handleRoomDragLeave(e){ e.currentTarget.classList.remove('ring-2','ring-[#7A0C2E]/30'); }
async function dropRoomReorder(e, targetRoomId){
  e.preventDefault(); e.currentTarget.classList.remove('ring-2','ring-[#7A0C2E]/30');
  if(!draggedRoomId || draggedRoomId===targetRoomId) return;
  const rooms=[...allRoomingRecords].filter(r=>(r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===activeLocation.toUpperCase());
  const ordered=getRoomOrderedList(rooms);
  const draggedIdx=ordered.findIndex(r=>r.id===draggedRoomId);
  const targetIdx=ordered.findIndex(r=>r.id===targetRoomId);
  if(draggedIdx===-1 || targetIdx===-1) return;
  const moved=ordered.splice(draggedIdx,1)[0];
  ordered.splice(targetIdx,0,moved);
  // Update local sort order
  ordered.forEach((r,i)=>{ r.fields['SORT ORDER']=i+1; });
  // Re-render immediately without refresh
  renderRoomingGrid();
  // Auto update Airtable in background
  for(let i=0;i<ordered.length;i++){
    const rec=ordered[i];
    try{
      const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base')||localStorage.getItem('effah_base_id'); const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
      await fetch(`https://api.airtable.com/v0/${base}/ROOMING%20LIST/${rec.id}`,{
        method:'PATCH',
        headers:{'Authorization':`Bearer ${pat}`,'Content-Type':'application/json'},
        body: JSON.stringify({fields:{'SORT ORDER': i+1}})
      });
    }catch(err){ console.error('Sort update failed', rec.id, err); }
  }
}
async function updateRoomCatatan(roomId, value){
  const rec=allRoomingRecords.find(r=>r.id===roomId);
  if(!rec) return;
  rec.fields['CATATAN']=value;
  try{
    const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base')||localStorage.getItem('effah_base_id'); const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
  await fetch(`https://api.airtable.com/v0/${base}/ROOMING%20LIST/${roomId}`,{
      method:'PATCH',
      headers:{'Authorization':`Bearer ${pat}`,'Content-Type':'application/json'},
      body: JSON.stringify({fields:{'CATATAN': value}})
    });
  }catch(e){ console.error('Catatan update failed', e); }
}

document.addEventListener('dragover',e=>{ const g=document.getElementById('roomingGrid'); if(!g) return; const r=g.getBoundingClientRect(); if(e.clientY>r.bottom-100) g.scrollTop+=14; if(e.clientY<r.top+100) g.scrollTop-=14; });

function renderRoomingOverview(rooms){
  const el=document.getElementById('roomingOverview'); if(!el) return;
  if(rooms.length===0){ el.innerHTML='<div class="flex items-center gap-2 text-[11px] opacity-70"><span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Tiada bilik untuk '+activeLocation+'</div>'; return; }
  const byHotel = {};
  rooms.forEach(r=>{
    const hotel = (r.fields['HOTEL NAME']||'TANPA HOTEL').trim().toUpperCase() || 'TANPA HOTEL';
    if(!byHotel[hotel]) byHotel[hotel]={};
    const cap=r.fields['KAPASITI']||4;
    byHotel[hotel][cap]=(byHotel[hotel][cap]||0)+1;
  });
  // count FB per hotel
  function countFBForHotel(hotelRooms, locUpper){
    let cnt=0;
    hotelRooms.forEach(r=>{
      const jIds=[...(r.fields['JEMAAH']||[]), ...(r.fields['JEMAAH TANPA KATIL']||[])];
      jIds.forEach(jId=>{
        const jRec=allRoomingJemaah.find(j=>j.id===jId);
        const fb=(jRec?.fields?.['BOARD']||'').toUpperCase();
        if(!fb || fb==='-' || fb==='NO BOARD') return;
        if(locUpper==='MEKAH'){ if(fb.includes('MEKAH')||fb==='BOARD') cnt++; }
        else if(locUpper==='MADINAH'){ if(fb.includes('MADINAH')||fb==='BOARD') cnt++; }
        else cnt++;
      });
    });
    return cnt;
  }
  let fbCount=0; const loc=activeLocation.toUpperCase();
  allRoomingJemaah.forEach(j=>{
    const fb=(j.fields['BOARD']||'').toUpperCase(); if(!fb || fb==='-' || fb==='NO BOARD') return;
    const assigned = rooms.some(r=> (r.fields['JEMAAH']||[]).includes(j.id) || (r.fields['JEMAAH TANPA KATIL']||[]).includes(j.id));
    if(!assigned) return;
    if(loc==='MEKAH'){ if(fb.includes('MEKAH')||fb==='BOARD') fbCount++; }
    else if(loc==='MADINAH'){ if(fb.includes('MADINAH')||fb==='BOARD') fbCount++; }
    else fbCount++;
  });
  const totalBilik=rooms.length;
  const totalJ=rooms.reduce((s,r)=>s+(r.fields['JEMAAH']?.length||0),0);
  const totalBaby=rooms.reduce((s,r)=>s+(r.fields['JEMAAH TANPA KATIL']?.length||0),0);
  const totalStaff=rooms.reduce((s,r)=>s+(r.fields['STAFF / EXTRA']||'').split(',').filter(Boolean).length,0);

  let hotelBlocks = Object.keys(byHotel).sort().map(hotel=>{
    const caps=byHotel[hotel];
    const hotelRooms = allRoomingRecords.filter(r=> (r.fields['HOTEL NAME']||'TANPA HOTEL').toUpperCase()===hotel && (r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===loc);
    const fbHotel = countFBForHotel(hotelRooms, loc);
    const capsList = Object.keys(caps).sort((a,b)=>b-a).map(cap=>{
      const cnt=caps[cap];
      return `<span class="inline-flex items-center gap-1 bg-white/15 px-2 py-0.5 rounded-full text-[10px] mr-1 mb-1"><span>Bilik ber-${cap}</span><span class="font-bold">(${cnt})</span></span>`;
    }).join('');
    return `<div class="flex flex-col gap-1 py-2 border-b border-white/10 last:border-0"><div class="flex items-center justify-between"><span class="font-bold text-[11px] truncate">${hotel}</span>${fbHotel?`<span class="text-[9px] bg-white/20 px-1.5 py-0.5 rounded-full">${fbHotel} Board Basis</span>`:''}</div><div class="flex flex-wrap">${capsList}</div></div>`;
  }).join('');

  let html=`<div class="space-y-2">
    <div class="flex items-center justify-between">
      <div class="font-bold text-[13px] tracking-widest">${activeLocation} • ${totalBilik} Bilik</div>
      <div class="flex items-center gap-1.5">
        <span class="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">${totalJ} J+${totalBaby} I+${totalStaff} S</span>
        ${fbCount?`<span class="text-[10px] bg-emerald-400/90 text-emerald-900 px-2 py-0.5 rounded-full font-bold">${fbCount} Board Basis</span>`:''}
      </div>
    </div>
    <div class="bg-white/10 rounded-xl p-2.5 max-h-[22vh] overflow-y-auto">
      ${hotelBlocks||'<div class="opacity-70 text-[11px]">Tiada data hotel</div>'}
    </div>
    <div class="flex justify-between text-[9px] opacity-80 px-1">
      <span>Total ${totalBilik} bilik</span>
      <span>${totalJ} jemaah${totalBaby?` + ${totalBaby} infant`:''} + ${totalStaff} staff</span>
    </div>
  </div>`;
  el.innerHTML=html;
}

function renderLocationTabs(){
  const container=document.getElementById('locationTabs'); if(!container) return;
  const base=['MEKAH','MADINAH','TAIF']; const all=[...base,...customLocations.filter(l=>!base.includes(l))];
  const counts={}; all.forEach(l=>counts[l]=0); allRoomingRecords.forEach(r=>{ const l=(r.fields['LOKASI / CITY']||'').trim().toUpperCase(); if(counts[l]!==undefined) counts[l]++; else if(l){ counts[l]=1; if(!all.includes(l)) all.push(l); } });
  let html=all.map(loc=>{
    const label=loc; // V24.6 no emoji
    const c=counts[loc]||0; const active=loc===activeLocation; const isCustom=!['MEKAH','MADINAH','TAIF'].includes(loc);
    const delBtn=isCustom?`<button onclick="event.stopPropagation(); deleteCustomLocation('${loc}')" class="ml-1 w-4 h-4 rounded-full bg-white/20 hover:bg-red-500 hover:text-white flex items-center justify-center text-[9px]">✕</button>`:'';
    const wrapCls=active?'bg-[#7A0C2E] rounded-full':'bg-white rounded-full border border-slate-200';
    return `<div class="inline-flex items-center ${wrapCls}"><button onclick="setActiveLocation('${loc}')" class="px-2.5 py-1 rounded-full text-[11px] font-bold ${active?'text-white':'text-slate-700'}">${label} (${c})</button>${delBtn}</div>`;
  }).join('');
  html+=`<button onclick="openAddLocationModal()" class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200">+ Lokasi</button>`;
  container.innerHTML=html;
}
async function fetchRoomingData(){
  try{
    showRoomingLoading(); populateRoomingTripDropdown();
    const tripId=window.selectedTripRecord?.id||localStorage.getItem('effah_active_trip_id')||localStorage.getItem('effah_last_selected_trip')||localStorage.getItem('selectedTripId');
    if(!tripId){ document.getElementById('namelistContainer').innerHTML='<div class="p-6 text-center text-[11px] text-slate-400">Sila pilih trip terlebih dahulu</div>'; return; }
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
    sel.innerHTML='<option value="">Memuatkan senarai trip...</option>';
    let retries=parseInt(sel.dataset.retries||'0'); if(retries<10){ sel.dataset.retries=retries+1; setTimeout(()=>{ if(typeof fetchTripUmrahData==='function') fetchTripUmrahData(); populateRoomingTripDropdown(); }, 900); }
    return;
  }
  trips.sort((a,b)=>(a.fields?.['Mula Pakej']||'').localeCompare(b.fields?.['Mula Pakej']||''));
  sel.innerHTML='<option value="">Pilih Trip...</option>'+trips.map(t=>{ const raw=t.fields?.Trip||t.fields?.['TRIP NAME']||t.id; const clean=cleanTripNameForRooming(raw); return `<option value="${t.id}" ${t.id===currentId?'selected':''}>${clean}</option>`; }).join('');
  if(currentId) sel.value=currentId; else if(trips.length>0){ sel.value=trips[0].id; onRoomingTripChange(trips[0].id); }
}
function onRoomingTripChange(tripId){ if(!tripId) return; const trips=window.allTripUmrahRecords||window.allTripRecords||[]; const found=trips.find(t=>t.id===tripId); if(found) window.selectedTripRecord=found; localStorage.setItem('effah_active_trip_id',tripId); localStorage.setItem('selectedTripId',tripId); localStorage.setItem('effah_last_selected_trip',tripId); fetchRoomingData(); }
function isJemaahAssignedInLocation(jId, location){
  const loc = (location||activeLocation).toUpperCase();
  return allRoomingRecords.some(r=> (r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===loc && (r.fields['JEMAAH']||[]).includes(jId));
}
function isStaffAssignedInLocation(staffId, location){
  const s=staffList.find(x=>x.id===staffId||x.airtableId===staffId); if(!s) return false;
  if(!s.roomIds || s.roomIds.length===0) return false;
  const loc = (location||activeLocation).toUpperCase();
  return allRoomingRecords.some(r=> (r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===loc && s.roomIds.includes(r.id));
}
function getStaffForRoom(roomId){
  return staffList.filter(s=> s.roomIds && s.roomIds.includes(roomId));
}
function isJemaahAssigned(jId){ return allRoomingRecords.some(r=>(r.fields['JEMAAH']||[]).includes(jId)); }

function isJemaahAssignedTanpaKatil(jId){
  try{ return allRoomingRecords.some(r=>{ const arr=r.fields['JEMAAH TANPA KATIL']||r.fields['INFANT']||[]; return arr.includes(jId); }); }catch(e){ return false; }
}
function isJemaahAssignedAny(jId){
  return isJemaahAssigned(jId) || isJemaahAssignedTanpaKatil(jId);
}

function isStaffAssigned(staffId){ const s=staffList.find(x=>x.id===staffId); if(!s) return false; return allRoomingRecords.some(r=> (r.fields['STAFF / EXTRA']||'').split(',').map(x=>x.trim()).includes(s.name)); }

function renderNamelist(){
  const cont=document.getElementById('namelistContainer'); if(!cont) return;
  const q=(document.getElementById('searchRoomingJemaah')?.value||'').toLowerCase();
  const pakejFilter=(document.getElementById('filterPakejRooming')?.value||'').toUpperCase();
  let filtered=[...allRoomingJemaah];
  if(q) filtered=filtered.filter(r=>getJemaahName(r.fields).toLowerCase().includes(q));
  if(pakejFilter) filtered=filtered.filter(r=>getPakejVal(r.fields).toUpperCase()===pakejFilter);
  if(roomingSortActive){
    filtered.sort((a,b)=>{
      const nameA=getJemaahName(a.fields).toUpperCase();
      const nameB=getJemaahName(b.fields).toUpperCase();
      if(roomingSortDir==='asc') return nameA.localeCompare(nameB);
      else return nameB.localeCompare(nameA);
    });
  }
  const total=allRoomingJemaah.length;
  const belumGlobal=allRoomingJemaah.filter(r=>!isJemaahAssignedAny(r.id)).length;
  // V24.16: belumInLoc kira termasuk tanpa katil juga
  const belumInLoc=allRoomingJemaah.filter(r=>{
    const assignedNormal = isJemaahAssignedInLocation(r.id, activeLocation);
    const assignedTanpa = allRoomingRecords.some(rec=> (rec.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===activeLocation.toUpperCase() && ((rec.fields['JEMAAH TANPA KATIL']||[]).includes(r.id)));
    return !assignedNormal && !assignedTanpa;
  }).length;
  const totalEl=document.getElementById('totalJemaahBadge'); if(totalEl) totalEl.textContent=total+' Total';
  const belumEl=document.getElementById('belumAssignBadge'); if(belumEl) belumEl.textContent=belumInLoc+' Unassigned di '+activeLocation;
  const topBelum=document.getElementById('belumAssignTop'); if(topBelum) topBelum.textContent=belumGlobal+' Unassigned';
  const topAssign=document.getElementById('assignedTop'); if(topAssign) topAssign.textContent=(total-belumGlobal)+' Assigned';
  if(total===0){ cont.innerHTML='<div class="p-6 text-center text-[11px] text-slate-400">Tiada jemaah untuk trip ini</div>'; return; }
  cont.innerHTML=filtered.map((r,i)=>{
        const name=getJemaahName(r.fields);
    const assignedNormalInLoc=isJemaahAssignedInLocation(r.id, activeLocation);
    const assignedTanpaInLoc=allRoomingRecords.some(rec=> (rec.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===activeLocation.toUpperCase() && ((rec.fields['JEMAAH TANPA KATIL']||[]).includes(r.id)));
    const assignedInLoc = assignedNormalInLoc || assignedTanpaInLoc;
    const assignedGlobal=isJemaahAssignedAny(r.id);
    // FIX #1: buang pointer-events-none supaya masih boleh edit inline walau dah assigned
    const rowCls=assignedInLoc?'opacity-60 bg-slate-50':'hover:bg-slate-50';
    const drag=assignedInLoc?'':`draggable="true" ondragstart="dragJemaah(event,'${r.id}')" ondragend="dragEnd(event)"`;
    let statusIcon = assignedInLoc? `<button onclick="removeJemaahFromCurrentLoc('${r.id}')" class="w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-[10px]" title="Keluarkan dari ${activeLocation}">✕</button>` : `<button onclick="quickAssign('${r.id}')" class="w-5 h-5 rounded-full border bg-slate-100 hover:bg-slate-200 text-[10px]">+</button>`;
    if(!assignedInLoc && assignedGlobal) statusIcon = `<button onclick="quickAssign('${r.id}')" class="w-5 h-5 rounded-full border bg-amber-100 hover:bg-amber-200 text-[10px]" title="Sudah ada di lokasi lain, boleh tambah di ${activeLocation} juga">+</button>`;
    const fb = getFullboardVal(r.fields) || '-';
    const pk = getPakejVal(r.fields) || '-';
    const trChecked = isTrainChecked(r.fields);
    const insArr = getInsuranArray(r.fields);
    let fbCls = 'bg-white border-slate-200';
    if(fb==='FULLBOARD (MEKAH)' || fb==='BB (MEKAH)') fbCls='bg-orange-100 border-orange-200 text-orange-800';
    else if(fb==='FULLBOARD (MADINAH)' || fb==='BB (MADINAH)') fbCls='bg-blue-100 border-blue-200 text-blue-800';
    else if(fb==='FULLBOARD') fbCls='bg-emerald-100 border-emerald-200 text-emerald-800';
    else if(fb==='NO FULLBOARD' || fb==='' ) fbCls='bg-white border-dashed border-slate-300 text-slate-400';
    else if(fb==='-' || fb==='' ) fbCls='bg-white border-dashed border-slate-300 text-slate-400';

    const insToggle = ['TAKAFUL','ETIQA','AL-KHAIRI'].map(opt=>{
      const active = insArr.includes(opt);
      let cls = 'bg-white text-slate-400 border-slate-200 hover:border-slate-300';
      if(active){
        if(opt==='TAKAFUL') cls='bg-emerald-500 text-white border-emerald-600';
        else if(opt==='ETIQA') cls='bg-amber-300 text-amber-900 border-amber-400';
        else if(opt==='AL-KHAIRI') cls='bg-blue-400 text-white border-blue-500';
      }
      const label = opt==='TAKAFUL'?'TAK':opt==='AL-KHAIRI'?'KHAIRI':opt;
      return `<button onclick="toggleInsuran('${r.id}','${opt}')" class="px-1 py-0.5 rounded-full border text-[7px] font-bold ${cls}" title="${opt}">${label}</button>`;
    }).join('');

    return `<div ${drag} class="grid grid-cols-12 items-center px-1.5 py-1.5 text-[11px] border-b border-slate-50 ${rowCls}">
      <div class="col-span-1 text-slate-400 text-[10px]">${String(i+1).padStart(2,'0')}</div>
      <div class="col-span-3 font-medium truncate text-[10px] ${assignedInLoc?'text-slate-500 italic':''}" title="${name}">${name}</div>
      <div class="col-span-2 flex items-center gap-0.5">
        <select onchange="updateJemaahField('${r.id}','BOARD BASIS',this.value)" class="text-[8px] border rounded-full px-1 py-0.5 bg-white font-bold ${fbCls} outline-none w-full truncate" title="BOARD BASIS">
          <option value="" ${!fb || fb==='-' || fb==='NO FULLBOARD'?'selected':''}>- BOARD</option>
          <option value="FULLBOARD" ${fb==='FULLBOARD'?'selected':''}>FULLBOARD</option>
          <option value="FULLBOARD (MEKAH)" ${fb==='FULLBOARD (MEKAH)'?'selected':''}>FULLBOARD (MEKAH)</option>
          <option value="FULLBOARD (MADINAH)" ${fb==='FULLBOARD (MADINAH)'?'selected':''}>FULLBOARD (MADINAH)</option>
          <option value="BB (MEKAH)" ${fb==='BB (MEKAH)'?'selected':''}>BB (MEKAH)</option>
          <option value="BB (MADINAH)" ${fb==='BB (MADINAH)'?'selected':''}>BB (MADINAH)</option>
        </select>
      </div>
      <div class="col-span-1 text-center">
        <input type="checkbox" ${trChecked?'checked':''} onchange="updateJemaahCheckbox('${r.id}','TRAIN',this.checked)" class="w-3.5 h-3.5 accent-[#7A0C2E] rounded" title="TRAIN">
      </div>
      <div class="col-span-3 flex items-center gap-0.5 flex-wrap justify-center">
        ${insToggle}
      </div>
      <div class="col-span-1 flex items-center gap-0.5">
        <select onchange="updateJemaahField('${r.id}','PAKEJ',this.value)" class="text-[7px] border rounded-full px-1 py-0.5 bg-white font-bold outline-none w-full ${pk==='-'?'border-dashed text-slate-400':'bg-slate-50'}" title="PAKEJ">
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
  makeNamelistSticky();
  const sortIconEl=document.getElementById('sortIcon');
  if(sortIconEl) sortIconEl.textContent = roomingSortActive ? (roomingSortDir==='asc'?'↑ A-Z':'↓ Z-A') : '↕';
}

function toggleSortNama(){
  if(!roomingSortActive){
    roomingSortActive=true;
    roomingSortDir='asc';
  } else {
    roomingSortDir = roomingSortDir==='asc' ? 'desc' : 'asc';
  }
  localStorage.setItem('effah_rooming_sort_dir', roomingSortDir);
  localStorage.setItem('effah_rooming_sort_active', 'true');
  renderNamelist();
}


function makeNamelistSticky(){
  try{
    const leftWrapper = document.getElementById('namelistContainer')?.parentElement;
    if(!leftWrapper) return;
    // Find the grid parent that contains namelist and rooming
    const mainGrid = leftWrapper.closest('.grid-cols-12') || leftWrapper.closest('.grid') || document.querySelector('.grid');
    if(leftWrapper){
      leftWrapper.style.position='sticky';
      leftWrapper.style.top='12px';
      leftWrapper.style.maxHeight='calc(100vh - 16px)';
      leftWrapper.style.overflowY='auto';
      leftWrapper.style.alignSelf='start';
      leftWrapper.style.zIndex='20';
      leftWrapper.setAttribute('data-left-col','true');
    }
    const nl = document.getElementById('namelistContainer');
    if(nl){
      nl.style.maxHeight='calc(100vh - 240px)';
      nl.style.overflowY='auto';
    }
    const staffCont = document.getElementById('staffListContainer');
    if(staffCont){
      staffCont.style.maxHeight='22vh';
    }
  }catch(e){}
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
  if(rooms.length===0){ grid.innerHTML=`<div class="col-span-2 p-6 text-center text-[11px] border border-dashed rounded-2xl bg-white">Tiada bilik untuk <b>${activeLocation}</b><br><button onclick="openNewRoomModal()" class="mt-2.5 px-3 py-1.5 bg-[#7A0C2E] text-white rounded-full text-[11px]">+ Bilik Baru untuk ${activeLocation}</button></div>`; return; }
  grid.innerHTML=rooms.map(rec=>{
    const f=rec.fields; const roomId=f['Room ID / Nama Bilik']||generateRoomIdFromCap(f['KAPASITI']); const pakej=f['PAKEJ / HOTEL']||'EKONOMI'; const cap=f['KAPASITI']||4; const hotel=f['HOTEL NAME']||''; const staffForRoom=getStaffForRoom(rec.id); const staffArr=staffForRoom.map(s=>s.name); const jIds=f['JEMAAH']||[]; const count=jIds.length+staffArr.length;
    const jSlots=jIds.map(jId=>{ 
      const jRec=allRoomingJemaah.find(j=>j.id===jId); 
      const jName=getJemaahName(jRec?.fields);
      const fb=(jRec?.fields?.['BOARD']||'').trim();
      const roomLoc = (f['LOKASI / CITY']||activeLocation||'').toUpperCase();
      let fbBadge='';
      if(fb && fb!=='-' && fb.toUpperCase()!=='NO FULLBOARD' && fb!==''){
        const up=fb.toUpperCase();
        const raw=fb;
        if(roomLoc==='MEKAH'){
          if(up.includes('MEKAH')) fbBadge=`<span class="ml-1 px-1.5 py-0.5 bg-amber-200 text-amber-900 border border-amber-300 rounded-full text-[8px] font-bold">${raw}</span>`;
          else if(up==='FULLBOARD') fbBadge=`<span class="ml-1 px-1.5 py-0.5 bg-emerald-200 text-emerald-900 border border-emerald-300 rounded-full text-[8px] font-bold">FULLBOARD</span>`;
        } else if(roomLoc==='MADINAH'){
          if(up.includes('MADINAH')) fbBadge=`<span class="ml-1 px-1.5 py-0.5 bg-blue-200 text-blue-900 border border-blue-300 rounded-full text-[8px] font-bold">${raw}</span>`;
          else if(up==='FULLBOARD') fbBadge=`<span class="ml-1 px-1.5 py-0.5 bg-emerald-200 text-emerald-900 border border-emerald-300 rounded-full text-[8px] font-bold">FULLBOARD</span>`;
        } else {
          if(up.includes('MEKAH') || up.includes('MADINAH') || up==='FULLBOARD') fbBadge=`<span class="ml-1 px-1.5 py-0.5 bg-emerald-200 text-emerald-900 border border-emerald-300 rounded-full text-[8px] font-bold">${raw}</span>`;
          else if(up.startsWith('BB')) fbBadge=`<span class="ml-1 px-1.5 py-0.5 bg-orange-100 text-orange-800 border border-orange-200 rounded-full text-[8px] font-bold">${raw}</span>`;
        }
      }
      return `<div class="flex items-center justify-between px-2.5 py-2 bg-slate-100 text-slate-800 border border-slate-200 rounded-xl text-[11px]"><span class="truncate font-medium flex items-center">${jName}${fbBadge}</span><button onclick="removeJemaahFromRoom('${rec.id}','${jId}')" class="ml-2 w-4 h-4 rounded-full bg-white hover:bg-slate-200 text-[10px]">✕</button></div>`; 
    }).join('');
    const sSlots=staffArr.map(s=>`<div class="flex items-center justify-between px-2.5 py-2 bg-[#FADBD8] text-[#7A0C2E] border border-[#F5B7B1] rounded-xl text-[11px]"><span class="truncate">👤 ${s}</span><button onclick="removeStaff('${rec.id}','${s.replace(/'/g,"\\'")}')" class="ml-2 w-4 h-4 rounded-full bg-white/70 text-[10px]">✕</button></div>`).join('');
    const tanpaKatilIds = f['JEMAAH TANPA KATIL'] || f['INFANT'] || [];
    const tanpaKatilSlots = tanpaKatilIds.map(tId=>{ const tRec=allRoomingJemaah.find(j=>j.id===tId); const tName=tRec?getJemaahName(tRec.fields):'Unknown'; return `<div class="flex items-center justify-between px-2.5 py-2 bg-amber-50 text-amber-900 border border-amber-200 rounded-xl text-[11px] border-dashed"><span class="truncate">INFANT ${tName}</span><button onclick="removeTanpaKatilFromRoom('${rec.id}','${tId}')" class="ml-2 w-4 h-4 rounded-full bg-white text-[10px]">✕</button></div>`; }).join('');
    const emptyCount=Math.max(0,cap-count); const emptySlots=Array.from({length:emptyCount}).map((_,i)=>`<div ondragover="allowDrop(event)" ondrop="dropJemaah(event,'${rec.id}')" class="px-2.5 py-2 border border-dashed border-slate-300 rounded-xl text-[10px] text-slate-400 text-center">Slot Kosong ${count+i+1}</div>`).join('');
    const catatanVal = f['CATATAN'] || f['NOTES'] || f['REMARK'] || '';
    const catatanField = `<div class="mt-1"><textarea id="catatan-${rec.id}" placeholder="Catatan bilik..." onchange="updateRoomCatatan('${rec.id}', this.value)" class="w-full text-[10px] px-2 py-1.5 border border-slate-200 rounded-lg bg-amber-50/50 focus:bg-white focus:outline-none resize-none" rows="2">${catatanVal}</textarea></div>`;
    return `<div data-room-id="${rec.id}" data-sort="${f['SORT ORDER']||0}" ondragover="allowDropRoom(event)" ondragleave="handleRoomDragLeave(event)" ondrop="dropJemaah(event,'${rec.id}'); dropRoomReorder(event,'${rec.id}')" class="bg-white rounded-2xl border border-slate-200 p-2.5 shadow-sm flex flex-col gap-2 h-fit">
      <div class="flex items-center justify-between gap-1.5">
        <div class="flex items-center gap-1.5 flex-1 min-w-0">
          <button class="w-6 h-6 rounded-full bg-slate-100 border flex items-center justify-center cursor-grab shrink-0" draggable="true" ondragstart="handleRoomDragStart(event,'${rec.id}')" ondragend="handleRoomDragEnd(event)"><i class="fa-solid fa-grip-lines text-[9px]"></i></button>
          <span class="font-bold text-[11px] shrink-0">${roomId}</span>
          <input id="hotelInput-${rec.id}" value="${hotel}" placeholder="Nama Hotel" onchange="updateHotelInline('${rec.id}', this.value)" onfocus="this.select()" class="flex-1 min-w-0 px-2 py-1 bg-slate-50 border border-slate-200 rounded-full text-[11px] font-bold truncate focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#7A0C2E]/30" title="Klik untuk tukar nama hotel">
        </div>
        <button onclick="deleteRoom('${rec.id}','${roomId}')" class="w-6 h-6 rounded-full bg-slate-50 hover:bg-red-50 border text-[10px] shrink-0"><i class="fa-solid fa-trash"></i></button>
      </div>
      <div class="flex items-center gap-1.5 text-[10px]">
        <div class="flex items-center gap-1 px-2.5 py-1 bg-slate-50 rounded-full border"><select onchange="updateRoomField('${rec.id}','PAKEJ / HOTEL',this.value)" class="bg-transparent text-[10px] font-bold outline-none"><option ${pakej==='JIMAT'?'selected':''}>JIMAT</option><option ${pakej==='EKONOMI'?'selected':''}>EKONOMI</option><option ${pakej==='STANDARD'?'selected':''}>STANDARD</option><option ${pakej==='PREMIUM'?'selected':''}>PREMIUM</option></select></div>
        <div class="ml-auto flex items-center gap-1 bg-slate-50 rounded-full px-1 py-0.5 border"><button onclick="updateCap('${rec.id}',-1)" class="w-5 h-5 rounded-full bg-white border text-[10px]">−</button><span class="font-bold w-4 text-center text-[11px]">${cap}</span><button onclick="updateCap('${rec.id}',1)" class="w-5 h-5 rounded-full bg-white border text-[10px]">+</button><span class="text-[9px] ml-1">${count}/${cap}</span></div>
      </div>
      <div class="space-y-1">${jSlots}${sSlots}${emptySlots}${tanpaKatilSlots?`<div class="pt-2 mt-2 border-t border-dashed border-amber-300"><div class="text-[8px] font-bold text-amber-700 mb-1">TANPA KATIL / INFANT</div>${tanpaKatilSlots}</div>`:''}</div>
      <button onclick="openTanpaKatilModal('${rec.id}')" class="mt-2 w-full py-2 bg-amber-50 hover:bg-amber-100 border border-amber-300 border-dashed text-amber-800 rounded-xl text-[10px] font-bold">+ Kanak-kanak / Infant (Tanpa Katil)</button>
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
function removeJemaahFromCurrentLoc(jId){
  const rec = allRoomingRecords.find(r=>(r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===activeLocation && (r.fields['JEMAAH']||[]).includes(jId));
  if(rec) removeJemaahFromRoom(rec.id, jId);
}
async function assignJemaahToRoom(jId,roomId){ if(isJemaahAssignedInLocation(jId, activeLocation)) return; const rec=allRoomingRecords.find(r=>r.id===roomId); if(!rec) return; await updateRoomField(roomId,'JEMAAH',[...(rec.fields['JEMAAH']||[]),jId],true); }
async function removeJemaahFromRoom(roomId,jId){ const rec=allRoomingRecords.find(r=>r.id===roomId); await updateRoomField(roomId,'JEMAAH',(rec.fields['JEMAAH']||[]).filter(id=>id!==jId),true); }
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
async function updateJemaahField(jemaahId, field, value){
  const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base')||localStorage.getItem('effah_base_id'); const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
  if(!base||!pat) return alert('Airtable config missing');
  const rec=allRoomingJemaah.find(r=>r.id===jemaahId); if(rec) rec.fields[field]=value||'';
  renderNamelist();
  try{
    const payload = value ? {[field]: value} : {[field]: null};
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
  if(rec){
    rec.fields['INSURAN'] = value ? [value] : [];
  }
  renderNamelist();
  try{
    const payload = value ? {[ 'INSURAN']: [value]} : {['INSURAN']: []};
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
  if(curr.includes(opt)){
    curr = curr.filter(x=>x!==opt);
  } else {
    curr.push(opt);
  }
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
    else {
      const msg=newRec.error?.message||JSON.stringify(newRec);
      if(msg.includes('Insufficient permissions to create new select option') || msg.toLowerCase().includes('select option')){
        alert('Gagal: Lokasi "'+lokasi+'" belum ada dalam Airtable.\n\nBuka Airtable > ROOMING LIST > LOKASI / CITY > Add option: '+lokasi+'\n\nSementara tu sistem cuba cipta sebagai MEKAH.');
        payload.fields['LOKASI / CITY']='MEKAH';
        let res2=await fetch(`https://api.airtable.com/v0/${base}/ROOMING%20LIST`,{method:'POST',headers:{Authorization:`Bearer ${pat}`,'Content-Type':'application/json'},body:JSON.stringify(payload)});
        let newRec2=await res2.json();
        if(newRec2.id){ allRoomingRecords.push(newRec2); closeNewRoomModal(); renderRoomingGrid(); renderLocationTabs(); renderNamelist(); renderStaffList(); }
        else alert('Gagal fallback MEKAH: '+(newRec2.error?.message||JSON.stringify(newRec2)));
      } else {
        alert('Gagal mencipta bilik: '+msg);
      }
    }
  }catch(e){ alert('Ralat semasa mencipta bilik: '+e.message); }
  finally{ if(btn){ btn.textContent='Cipta Bilik'; btn.disabled=false; } }
}
function openAddLocationModal(){ const loc=prompt('Sila masukkan nama lokasi baharu (contoh: TAIF, JEDDAH, KL):'); if(loc&&loc.trim()){ const up=loc.trim().toUpperCase(); if(!customLocations.includes(up)) customLocations.push(up); localStorage.setItem('effah_custom_locations',JSON.stringify(customLocations)); const sel=document.getElementById('newRoomLokasi'); if(sel){ const exists=[...sel.options].some(o=>o.value===up); if(!exists){ const opt=document.createElement('option'); opt.value=up; opt.textContent=up; sel.appendChild(opt); } } activeLocation=up; localStorage.setItem('effah_active_location',activeLocation); renderLocationTabs(); renderRoomingGrid(); renderNamelist(); alert('Lokasi "'+up+'" ditambah. PENTING: Tambah option "'+up+'" dalam Airtable > ROOMING LIST > LOKASI / CITY sekali sahaja.'); } }
function deleteCustomLocation(loc){ if(!confirm(`Adakah anda pasti ingin memadamkan lokasi ${loc}?`)) return; customLocations=customLocations.filter(l=>l!==loc); localStorage.setItem('effah_custom_locations',JSON.stringify(customLocations)); if(activeLocation===loc) activeLocation='MEKAH'; renderLocationTabs(); renderRoomingGrid(); renderNamelist(); }
function openCopyRoomsModal(){
  const m=document.getElementById('copyRoomsModal'); if(!m) return; const list=document.getElementById('copySourceList');
  const allLocs=['MEKAH','MADINAH','TAIF','JEDDAH',...customLocations].filter(l=>l!==activeLocation);
  const counts={}; allRoomingRecords.forEach(r=>{ const l=(r.fields['LOKASI / CITY']||'MEKAH').toUpperCase(); counts[l]=(counts[l]||0)+1; });
  if(allLocs.length===0 || allLocs.every(l=>(counts[l]||0)===0)){
    list.innerHTML='<div class="text-[11px] text-slate-400 p-2.5 border border-dashed rounded-xl">Tiada bilik di lokasi lain untuk disalin.</div>';
  } else {
    list.innerHTML=allLocs.map(loc=>{
      const c=counts[loc]||0; const disabled=c===0?'opacity-40 pointer-events-none':'';
      return `<label class="flex items-center justify-between gap-2 p-2.5 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 ${disabled}"><div class="flex items-center gap-2"><input type="radio" name="copySource" value="${loc}" ${c===0?'disabled':''}><span class="text-[11px] font-bold">${loc} (${c} bilik)</span></div><span class="text-[10px] text-slate-400">${c>0?'Sedia disalin':'Tiada bilik'}</span></label>`;
    }).join('');
  }
  document.getElementById('copyTargetLoc').textContent=activeLocation; m.classList.remove('hidden');
}
function closeCopyRoomsModal(){ document.getElementById('copyRoomsModal').classList.add('hidden'); }
async function executeCopyRooms(){
  const sel=document.querySelector('input[name="copySource"]:checked'); if(!sel) return alert('Sila pilih lokasi sumber untuk disalin.');
  const modeEl=document.querySelector('input[name="copyMode"]:checked'); const mode=modeEl?modeEl.value:'structure';
  const src=sel.value; const srcRooms=allRoomingRecords.filter(r=>(r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===src);
  if(srcRooms.length===0) return alert('Tiada bilik di lokasi '+src+' untuk disalin.');
  const modeText=mode==='withJemaah'?'bilik beserta jemaah & staff':'struktur bilik sahaja tanpa jemaah';
  if(!confirm(`Adakah anda pasti ingin menyalin ${srcRooms.length} bilik dari ${src} ke ${activeLocation}?\n\nPilihan: ${modeText}`)) return;
  const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base')||localStorage.getItem('effah_base_id'); const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat'); const tripId=localStorage.getItem('effah_active_trip_id')||localStorage.getItem('selectedTripId')||localStorage.getItem('effah_last_selected_trip');
  if(!tripId) return alert('Sila pilih trip terlebih dahulu.');
  let created=0; let failed=0;
  for(let r of srcRooms){
    const f=r.fields; const cap=f['KAPASITI']||4;
    const payload={fields:{'PAKEJ / HOTEL':f['PAKEJ / HOTEL']||'EKONOMI','KAPASITI':cap,'HOTEL NAME':f['HOTEL NAME']||'','CATATAN BILIK':f['CATATAN BILIK']||'','TRIP':[tripId],'LOKASI / CITY':activeLocation}};
    if(mode==='withJemaah'){
      if(f['JEMAAH'] && f['JEMAAH'].length>0) payload.fields['JEMAAH']=f['JEMAAH'];
      if(f['STAFF / EXTRA']) payload.fields['STAFF / EXTRA']=f['STAFF / EXTRA'];
    }
    try{
      const res=await fetch(`https://api.airtable.com/v0/${base}/ROOMING%20LIST`,{method:'POST',headers:{Authorization:`Bearer ${pat}`,'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const newRec=await res.json();
      if(newRec.id){ allRoomingRecords.push(newRec); created++; }
      else { failed++; console.error('Copy failed', newRec); }
    }catch(e){ failed++; console.error(e); }
  }
  closeCopyRoomsModal(); renderRoomingGrid(); renderLocationTabs(); renderNamelist(); renderStaffList();
  if(created>0) alert(`Berjaya menyalin ${created} bilik dari ${src} ke ${activeLocation} (${modeText}).` + (failed>0?` ${failed} bilik gagal disalin.`:''));
  else alert('Gagal menyalin bilik. Sila cuba semula.');
}

function dragStaff(e,staffId){ if(isStaffAssignedInLocation(staffId, activeLocation)) return; e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('text/staff-id',staffId); e.dataTransfer.setData('text/plain',staffId); const row=e.currentTarget; if(row) setTimeout(()=>row.style.opacity='0.3',0); }
function dragStaffEnd(e){ e.currentTarget.style.opacity='1'; }
function quickAssignStaff(staffId){ if(isStaffAssignedInLocation(staffId, activeLocation)) return; const rooms=allRoomingRecords.filter(r=>(r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===activeLocation); const target=rooms.find(r=>{ const j=r.fields['JEMAAH']?.length||0; const s=(r.fields['STAFF / EXTRA']||'').split(',').filter(Boolean).length; return (j+s)<(r.fields['KAPASITI']||4); }); if(target) assignStaffToRoom(staffId,target.id); else alert('Tiada slot kosong di lokasi '+activeLocation+'.'); }
async function addTanpaKatilToRoom(roomId, jId){
  const rec=allRoomingRecords.find(r=>r.id===roomId);
  if(!rec) return;
  const cur = rec.fields['JEMAAH TANPA KATIL'] || [];
  if(cur.includes(jId)) return;
  const newVal=[...cur, jId];
  rec.fields['JEMAAH TANPA KATIL']=newVal;
  renderRoomingGrid();
  renderNamelist();
  const b=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base')||localStorage.getItem('effah_base_id');
  const p=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
  try{
    const res=await fetch(`https://api.airtable.com/v0/${b}/ROOMING%20LIST/${roomId}`,{method:'PATCH',headers:{Authorization:`Bearer ${p}`,'Content-Type':'application/json'},body:JSON.stringify({fields:{'JEMAAH TANPA KATIL':newVal}})});
    const d=await res.json();
    if(d.error) console.warn('Airtable save warning', d.error);
  }catch(e){ console.error(e); }
}
async function removeTanpaKatilFromRoom(roomId, jId){
  const rec=allRoomingRecords.find(r=>r.id===roomId);
  if(!rec) return;
  const cur = rec.fields['JEMAAH TANPA KATIL'] || rec.fields['INFANT'] || [];
  const newVal=cur.filter(x=>x!==jId);
  rec.fields['JEMAAH TANPA KATIL']=newVal;
  renderRoomingGrid();
  renderNamelist();
  const b=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base')||localStorage.getItem('effah_base_id');
  const p=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
  try{ await fetch(`https://api.airtable.com/v0/${b}/ROOMING%20LIST/${roomId}`,{method:'PATCH',headers:{Authorization:`Bearer ${p}`,'Content-Type':'application/json'},body:JSON.stringify({fields:{'JEMAAH TANPA KATIL':newVal}})}); }catch(e){}
}



function generateRoomingPrint(){
  try{
    const tripNameRaw=window.selectedTripRecord?.fields?.Trip||document.getElementById('roomingTripSelect')?.selectedOptions[0]?.text||'Trip';
    const tripName=cleanTripNameForRooming(tripNameRaw);
    const baseLocs=['MEKAH','MADINAH','TAIF','JEDDAH'];
    const allLocs=[...baseLocs,...customLocations.filter(l=>!baseLocs.includes(l))];
    allRoomingRecords.forEach(r=>{ const l=(r.fields['LOKASI / CITY']||'').trim().toUpperCase(); if(l&&!allLocs.includes(l)) allLocs.push(l); });
    const activeLocsWithRooms = allLocs.filter(loc=> allRoomingRecords.some(r=>(r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===loc.toUpperCase()));
    const allStaffNames = staffList.map(s=>s.name);
    const staffInAnyRoom = [];
    allRoomingRecords.forEach(r=> (r.fields['STAFF / EXTRA']||'').split(',').filter(Boolean).forEach(s=>{ if(!staffInAnyRoom.includes(s)) staffInAnyRoom.push(s); }));
    const combinedStaff = [...new Set([...allStaffNames, ...staffInAnyRoom])];

    function fbPrintCell(val){
      if(!val || val==='-' || val==='- FB' || val.toUpperCase()==='NO FULLBOARD' || val.toUpperCase()==='NO BOARD') return `<span style="color:#999">-</span>`;
      const up=val.toUpperCase(); let style='';
      if(up.includes('BB') && up.includes('MEKAH')) style='background:#FFF7ED;color:#9A3412;border:1px dashed #EA580C;font-weight:bold;padding:2px 7px;border-radius:10px;font-size:8px;'; // BB MEKAH - dashed orange
      else if(up.includes('BB') && up.includes('MADINAH')) style='background:#EFF6FF;color:#1E40AF;border:1px dashed #3B82F6;font-weight:bold;padding:2px 7px;border-radius:10px;font-size:8px;'; // BB MADINAH - dashed blue
      else if(up.includes('MEKAH')) style='background:#FDE68A;color:#92400E;border:1px solid #92400E;font-weight:bold;padding:2px 7px;border-radius:10px;font-size:8px;';
      else if(up.includes('MADINAH')) style='background:#BFDBFE;color:#1E40AF;border:1px solid #1E40AF;font-weight:bold;padding:2px 7px;border-radius:10px;font-size:8px;';
      else if(up==='BOARD' || up.includes('BOARD')) style='background:#BBF7D0;color:#065F46;border:1px solid #065F46;font-weight:bold;padding:2px 7px;border-radius:10px;font-size:8px;';
      else style='background:#E5E7EB;color:#000;font-weight:bold;padding:2px 7px;border-radius:10px;font-size:8px;';
      return `<span style="${style}">${val}</span>`;
    }
    function trainPrintCell(checked){
      if(!checked) return `<span style="color:#999">-</span>`;
      return `<span style="background:#FDE68A;color:#92400E;border:1px solid #92400E;font-weight:bold;padding:2px 8px;border-radius:10px;font-size:8px;">TRAIN</span>`;
    }
    function insuranPrintCell(arr){
      if(!arr || arr.length===0) return `<span style="color:#999">-</span>`;
      return arr.map(v=>{
        const up=v.toUpperCase();
        if(up.includes('TAKAFUL') || up==='TAK') return `<span style="background:#BBF7D0;color:#065F46;border:1px solid #065F46;padding:1px 5px;border-radius:10px;font-weight:bold;font-size:8px;margin-right:2px;display:inline-block;">${v}</span>`;
        if(up.includes('ETIQA')) return `<span style="background:#FEF08A;color:#854D0E;border:1px solid #854D0E;padding:1px 5px;border-radius:10px;font-weight:bold;font-size:8px;margin-right:2px;display:inline-block;">${v}</span>`;
        if(up.includes('KHAIRI') || up.includes('KHAIR')) return `<span style="background:#BFDBFE;color:#1E40AF;border:1px solid #1E40AF;padding:1px 5px;border-radius:10px;font-weight:bold;font-size:8px;margin-right:2px;display:inline-block;">${v}</span>`;
        return `<span style="background:#E5E7EB;padding:1px 5px;border-radius:10px;font-size:8px;margin-right:2px;">${v}</span>`;
      }).join('');
    }

    let namelistRows=allRoomingJemaah.map((j,idx)=>{
      const name=getJemaahName(j.fields);
      const board=getFullboardVal(j.fields)||'-';
      const train=isTrainChecked(j.fields);
      const pakej=getPakejVal(j.fields)||'-';
      const insArr=getInsuranArray(j.fields);
      return `<tr><td>${idx+1}</td><td style="font-weight:600">${name}</td><td style="text-align:center">${fbPrintCell(board)}</td><td style="text-align:center">${trainPrintCell(train)}</td><td style="text-align:center">${pakej==='-'?'<span style="color:#999">-</span>':`<b>${pakej}</b>`}</td><td style="text-align:center">${insuranPrintCell(insArr)}</td></tr>`;
    }).join('');
    combinedStaff.forEach(sName=>{ const cleanName=sName.replace(/\(EFFAH\)/i,'').trim(); namelistRows+=`<tr><td>NA</td><td>${cleanName} (EFFAH)</td><td style="text-align:center"><span style="color:#999">-</span></td><td style="text-align:center"><span style="color:#999">-</span></td><td style="text-align:center"><span style="color:#999">-</span></td><td style="text-align:center"><span style="color:#999">-</span></td></tr>`; });

    function countFBForRooms(roomList, locUpper){
      let cnt=0;
      roomList.forEach(r=>{
        const jIds=[...(r.fields['JEMAAH']||[]), ...(r.fields['JEMAAH TANPA KATIL']||[]), ...(r.fields['INFANT']||[])];
        jIds.forEach(jId=>{
          const jRec=allRoomingJemaah.find(j=>j.id===jId);
          const fb=(jRec?.fields?.['BOARD']||'').toUpperCase();
          if(!fb || fb==='-' || fb==='NO BOARD') return; // BB now included
          if(locUpper==='MEKAH'){ if(fb.includes('MEKAH')||fb==='BOARD') cnt++; }
          else if(locUpper==='MADINAH'){ if(fb.includes('MADINAH')||fb==='BOARD') cnt++; }
          else cnt++;
        });
      });
      return cnt;
    }

    let locationPages='';
    activeLocsWithRooms.forEach((loc)=>{
      let rooms=[...allRoomingRecords].filter(r=>(r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===loc.toUpperCase());
      if(rooms.length===0) return;
      rooms=getRoomOrderedList(rooms);
      const byHotel={}; rooms.forEach(r=>{ const hotel=(r.fields['HOTEL NAME']||'TANPA HOTEL').trim().toUpperCase()||'TANPA HOTEL'; if(!byHotel[hotel]) byHotel[hotel]=[]; byHotel[hotel].push(r); });
      // Professional overview - table format
      let overviewTableRows = Object.keys(byHotel).sort().map(hotel=>{
        const capCount={}; byHotel[hotel].forEach(r=>{ const cap=r.fields['KAPASITI']||4; capCount[cap]=(capCount[cap]||0)+1; });
        const fbHotel = countFBForRooms(byHotel[hotel], loc.toUpperCase());
        const capsDetail = Object.keys(capCount).sort((a,b)=>b-a).map(c=>`Bilik ber-${c} (${capCount[c]})`).join(', ');
        return {hotel, capsDetail, fbHotel, total: Object.values(capCount).reduce((a,b)=>a+b,0)};
      });
      let overviewMini = overviewTableRows.map(r=>`${r.hotel}: ${Object.keys(byHotel[r.hotel]).length? Object.keys(byHotel[r.hotel]).map(c=>`B${c}-${byHotel[r.hotel].filter(x=> (x.fields['KAPASITI']||4)==c).length}`).join(', '):''}${r.fbHotel?` (${r.fbHotel} FB)`:''}`).join(' | ');
      let overviewProfessionalHTML = `
        <table style="width:100%;border-collapse:collapse;font-size:9px;margin:0">
          <tr style="background:#f8f8f8;font-weight:bold"><th style="border:1px solid #000;padding:3px 6px;text-align:left">HOTEL</th><th style="border:1px solid #000;padding:3px 6px;text-align:center">BILIK</th><th style="border:1px solid #000;padding:3px 6px;text-align:center">BOARD</th><th style="border:1px solid #000;padding:3px 6px;text-align:center">JUMLAH</th></tr>
          ${overviewTableRows.map(r=>`<tr><td style="border:1px solid #000;padding:3px 6px;font-weight:bold">${r.hotel}</td><td style="border:1px solid #000;padding:3px 6px;text-align:center">${r.capsDetail}</td><td style="border:1px solid #000;padding:3px 6px;text-align:center">${r.fbHotel? r.fbHotel+' FB' : '-'}</td><td style="border:1px solid #000;padding:3px 6px;text-align:center">${r.total} bilik</td></tr>`).join('')}
        </table>
      `;

      const fbTotalLoc = countFBForRooms(rooms, loc.toUpperCase());
      const roomBlocks=rooms.map(r=>{
        const f=r.fields; const rid=f['Room ID / Nama Bilik']||generateRoomIdFromCap(f['KAPASITI']); const pakej=f['PAKEJ / HOTEL']||'EKONOMI'; const hotel=f['HOTEL NAME']||'TANPA HOTEL'; const jIds=f['JEMAAH']||[]; const staff=(f['STAFF / EXTRA']||'').split(',').filter(Boolean);
        const roomLocPrint=(f['LOKASI / CITY']||loc||'').toUpperCase();
        const tanpaKatilPrintIds = f['JEMAAH TANPA KATIL'] || f['INFANT'] || [];
        let tanpaKatilPrintRows = tanpaKatilPrintIds.map(tId=>{
          const tRec=allRoomingJemaah.find(j=>j.id===tId); const tName=tRec?getJemaahName(tRec.fields):'-';
          return tName && tName!=='-'? `<div style="color:#92400E;font-style:italic">+ ${tName} (TANPA KATIL / INFANT)</div>` : '';
        }).filter(Boolean).join('');
        let rows=jIds.map((jId,idx)=>{
          const rec=allRoomingJemaah.find(j=>j.id===jId); const name=getJemaahName(rec?.fields); if(!name||name==='-') return '';
          const fb=(rec?.fields?.['BOARD']||'').trim(); let fbNote='';
          if(fb && fb!=='NO BOARD' && fb!=='-'){
            const up=fb.toUpperCase();
            if(roomLocPrint==='MEKAH'){ if(up.includes('MEKAH')) fbNote=` <span style="background:#FDE68A;border:1px solid #92400E;padding:0 4px;border-radius:8px;font-size:7px;font-weight:bold;">FB MEKAH</span>`; else if(up==='BOARD') fbNote=` <span style="background:#6EE7B7;border:1px solid #064E3B;padding:0 4px;border-radius:8px;font-size:7px;font-weight:bold;">FB</span>`; }
            else if(roomLocPrint==='MADINAH'){ if(up.includes('MADINAH')) fbNote=` <span style="background:#BFDBFE;border:1px solid #1E40AF;padding:0 4px;border-radius:8px;font-size:7px;font-weight:bold;">FB MADINAH</span>`; else if(up==='BOARD') fbNote=` <span style="background:#6EE7B7;border:1px solid #064E3B;padding:0 4px;border-radius:8px;font-size:7px;font-weight:bold;">FB</span>`; }
            else { if(up.includes('MEKAH')) fbNote=` <span style="background:#FDE68A;border:1px solid #92400E;padding:0 4px;border-radius:8px;font-size:7px;font-weight:bold;">FB MEKAH</span>`; else if(up.includes('MADINAH')) fbNote=` <span style="background:#BFDBFE;border:1px solid #1E40AF;padding:0 4px;border-radius:8px;font-size:7px;font-weight:bold;">FB MADINAH</span>`; else if(fb) fbNote=` <span style="background:#6EE7B7;border:1px solid #064E3B;padding:0 4px;border-radius:8px;font-size:7px;font-weight:bold;">FB</span>`; }
          }
          return `<div>${idx+1}. ${name}${fbNote}</div>`;
        }).filter(Boolean).join('');
        staff.forEach((s)=>{ const clean=s.replace(/\(EFFAH\)/i,'').trim(); rows+=`<div style="color:#7A0C2E;font-weight:bold">NA ${clean} (EFFAH)</div>`; });
        return `<div style="border:1px solid #000;margin-bottom:8px;padding:6px 8px;background:#fff;break-inside:avoid"><div style="display:flex;justify-content:space-between;font-weight:bold;font-size:10px;border-bottom:1px solid #000;padding-bottom:3px;margin-bottom:4px"><span>${rid} (${pakej}) - ${hotel}</span><span>${jIds.length+staff.length}/${f['KAPASITI']||4}${tanpaKatilPrintIds.length?` + ${tanpaKatilPrintIds.length} infant`:''}</span></div><div style="font-size:9px;line-height:1.6">${rows||'- Kosong -'}${tanpaKatilPrintRows?`<div style='margin-top:4px;border-top:1px dashed #92400E;padding-top:3px'>${tanpaKatilPrintRows}</div>`:''}</div></div>`;
      }).join('');
      const totalJemaahLoc=rooms.reduce((s,r)=>s+(r.fields['JEMAAH']?.length||0),0);
      const totalStaffLoc=rooms.reduce((s,r)=>s+(r.fields['STAFF / EXTRA']||'').split(',').filter(Boolean).length,0);
      const totalBabyLoc=rooms.reduce((s,r)=>s+(r.fields['JEMAAH TANPA KATIL']?.length||0),0);
      // === FB LIST PER HOTEL SORTED ===
      let fbListForLoc = [];
      rooms.forEach(r=>{
        const jIds=[...(r.fields['JEMAAH']||[]), ...(r.fields['JEMAAH TANPA KATIL']||[])];
        jIds.forEach(jId=>{
          const jRec=allRoomingJemaah.find(j=>j.id===jId);
          if(!jRec) return;
          const fb=(jRec.fields['BOARD BASIS']||jRec.fields['BOARD']||'').toUpperCase().trim();
          if(!fb || fb==='-' || fb==='NO BOARD') return; // BB now included in BOARD list
          let match=false;
          if(loc.toUpperCase()==='MEKAH'){ if(fb.includes('MEKAH')||fb==='BOARD') match=true; }
          else if(loc.toUpperCase()==='MADINAH'){ if(fb.includes('MADINAH')||fb==='BOARD') match=true; }
          else match=true;
          if(match){
            fbListForLoc.push({name:getJemaahName(jRec.fields), fbRaw:jRec.fields['BOARD']||'BOARD', hotel: r.fields['HOTEL NAME']||'TANPA HOTEL', room: r.fields['Room ID / Nama Bilik']||''});
          }
        });
      });
      fbListForLoc.sort((a,b)=>{ const hA=(a.hotel||'').toUpperCase(); const hB=(b.hotel||'').toUpperCase(); if(hA<hB) return -1; if(hA>hB) return 1; return a.name.localeCompare(b.name); });
      let fbTableHTML = '';
      if(fbListForLoc.length>0){
        // Group by hotel for display
        const grouped={};
        fbListForLoc.forEach(item=>{ if(!grouped[item.hotel]) grouped[item.hotel]=[]; grouped[item.hotel].push(item); });
        fbTableHTML = `
          <div style="margin-top:14px;border:1px solid #000;break-inside:avoid">
            <div style="background:#065F46;color:#fff;padding:5px 8px;font-weight:bold;font-size:10px;display:flex;justify-content:space-between">
              <span>${loc} - SENARAI PAKEJ MAKAN (${fbListForLoc.length} orang) - Sorted ikut Hotel</span>
              <span style="background:#fff;color:#065F46;padding:1px 6px;border-radius:10px;font-size:9px">${fbListForLoc.length} Board Basis</span>
            </div>
            ${Object.keys(grouped).sort().map(hotelName=>`
              <div style="border-bottom:1px solid #000">
                <div style="background:#f0fdf4;padding:3px 8px;font-weight:bold;font-size:9px;border-bottom:1px solid #ddd">${hotelName} (${grouped[hotelName].length} FB)</div>
                <table style="width:100%;border-collapse:collapse;font-size:9px">
                  <tr style="background:#f8f8f8;font-weight:bold"><th style="border:1px solid #ddd;padding:3px 6px;width:30px">NO</th><th style="border:1px solid #ddd;padding:3px 6px;text-align:left">NAMA JEMAAH</th><th style="border:1px solid #ddd;padding:3px 6px;text-align:center">BOARD BASIS</th><th style="border:1px solid #ddd;padding:3px 6px;text-align:center">BILIK</th></tr>
                  ${grouped[hotelName].map((fb,i)=>{
                    let badge='';
                    const up=fb.fbRaw.toUpperCase();
                    if(up.includes('MEKAH')) badge=`<span style="background:#FDE68A;border:1px solid #92400E;padding:1px 6px;border-radius:10px;font-weight:bold;font-size:8px">${fb.fbRaw}</span>`;
                    else if(up.includes('MADINAH')) badge=`<span style="background:#BFDBFE;border:1px solid #1E40AF;padding:1px 6px;border-radius:10px;font-weight:bold;font-size:8px">${fb.fbRaw}</span>`;
                    else badge=`<span style="background:#BBF7D0;border:1px solid #065F46;padding:1px 6px;border-radius:10px;font-weight:bold;font-size:8px">${fb.fbRaw}</span>`;
                    return `<tr><td style="border:1px solid #ddd;padding:3px 6px;text-align:center">${i+1}</td><td style="border:1px solid #ddd;padding:3px 6px;font-weight:600">${fb.name}${fb.type==='STAFF'?' <span style="background:#FADBD8;color:#7A0C2E;padding:1px 4px;border-radius:6px;font-size:7px">STAFF</span>':''}</td><td style="border:1px solid #ddd;padding:3px 6px;text-align:center">${badge}</td><td style="border:1px solid #ddd;padding:3px 6px;text-align:center;font-size:8px">${fb.room}</td></tr>`;
                  }).join('')}
                </table>
              </div>
            `).join('')}
          </div>
        `;
      } else {
        fbTableHTML = `<div style="margin-top:12px;border:1px dashed #000;padding:8px;text-align:center;font-size:9px;color:#666">Tiada jemaah Pakej Makan di ${loc}</div>`;
      }

      locationPages+=`<div style="page-break-before:always">
        <div style="display:flex;justify-content:space-between;align-items:center;font-weight:bold;font-size:13px;border-bottom:2px solid #000;padding-bottom:6px;margin-bottom:8px">
          <span>ROOMING LIST ${tripName} - ${loc} (${rooms.length} BILIK)</span>
          <span style="font-size:9px;font-weight:normal;background:#7A0C2E;color:#fff;padding:3px 8px;border-radius:10px">${totalJemaahLoc} jemaah${totalBabyLoc?` + ${totalBabyLoc} infant`:''} + ${totalStaffLoc} staff${fbTotalLoc?` • ${fbTotalLoc} FB`:''}</span>
        </div>
        <div style="margin-bottom:10px;border:1px solid #000;padding:0;background:#fff">
          <div style="background:#7A0C2E;color:#fff;padding:4px 8px;font-weight:bold;font-size:10px">${loc} OVERVIEW - ${rooms.length} Bilik</div>
          ${overviewProfessionalHTML}
          <div style="background:#f5f5f5;padding:5px 8px;font-size:9px;border-top:1px solid #000;display:flex;justify-content:space-between">
            <span><b>Total:</b> ${rooms.length} bilik</span>
            <span>${totalJemaahLoc} jemaah${totalBabyLoc?` + ${totalBabyLoc} infant`:''} + ${totalStaffLoc} staff</span>
            <span style="font-weight:bold">${fbTotalLoc? fbTotalLoc+' BOARD' : '0 PAKEJ MAKAN'}</span>
          </div>
        </div>
        <div style="columns:2; column-gap:12px">${roomBlocks}</div>
        ${fbTableHTML}
      </div>`;
    });

    const html=`<html><head><title>Rooming ${tripName}</title><style>body{font-family:Arial,Helvetica,sans-serif;font-size:10px;margin:12px;color:#000}table{border-collapse:collapse;width:100%}th,td{border:1px solid #000;padding:4px 6px;font-size:9px}th{background:#7A0C2E;color:#fff;font-weight:bold;text-transform:uppercase}.header{display:flex;justify-content:space-between;font-weight:bold;font-size:12px;border-bottom:2px solid #000;padding-bottom:6px;margin-bottom:8px}.page-break{page-break-before:always}.namelist-page{max-width:900px;margin:0 auto}.location-page{max-width:100%}@media print{@page{size:A4 landscape;margin:10mm}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.page-break{page-break-before:always}}</style></head><body>
      <div class="namelist-page"><div class="header"><span>NAMELIST ${tripName}</span><span>Total: ${allRoomingJemaah.length} Jemaah + ${combinedStaff.length} Staff</span></div><div style="font-size:9px;margin-bottom:8px"><b>Trip:</b> ${tripName} | <b>Tarikh Cetak:</b> ${new Date().toLocaleDateString('ms-MY')}</div><table><tr><th style="width:30px">NO</th><th>NAMA JEMAAH</th><th style="width:130px">BOARD</th><th style="width:60px">TRAIN</th><th style="width:70px">PAKEJ</th><th style="width:190px">INSURAN</th></tr>${namelistRows}</table></div>
      ${locationPages||'<div style="page-break-before:always"><div style="border:1px dashed #000;padding:20px;text-align:center">Tiada bilik untuk trip ini</div></div>'}
      <script>window.onload=function(){setTimeout(()=>window.print(),600)}; window.onafterprint=function(){window.close();}; setTimeout(()=>{try{window.close();}catch(e){}},2500);<\/script>
    </body></html>`;
    const w=window.open('','_blank');
    if(!w){ alert('Popup blocked! Sila allow popup untuk print.'); return; }
    w.document.write(html);
    w.document.close();
  }catch(e){
    console.error(e);
    alert('Gagal generate print: '+e.message+'\n'+e.stack);
  }
}
async function autoAssignRooming(){ if(!confirm('Adakah anda pasti ingin menetapkan semua jemaah yang belum ditetapkan untuk lokasi '+activeLocation+' secara automatik?')) return; let rooms=[...allRoomingRecords].filter(r=>(r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===activeLocation.toUpperCase()); if(rooms.length===0) rooms=[...allRoomingRecords]; rooms=getRoomOrderedList(rooms); const unassigned=allRoomingJemaah.filter(j=>!isJemaahAssignedInLocation(j.id, activeLocation)); let idx=0; for(let room of rooms){ const cap=room.fields['KAPASITI']||roomingDefaultCap; const staffCount=(room.fields['STAFF / EXTRA']||'').split(',').filter(Boolean).length; let cur=[...(room.fields['JEMAAH']||[])]; while((cur.length+staffCount)<cap && idx<unassigned.length){ cur.push(unassigned[idx].id); idx++; } if(cur.length!==(room.fields['JEMAAH']||[]).length){ await updateRoomField(room.id,'JEMAAH',cur,false); } } setTimeout(fetchRoomingData,800); }
