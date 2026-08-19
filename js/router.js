// ROOMING V102 - CLEAN REFACTOR - 2026-08-20
// Base: V101 + merge all fixes, remove duplicate declarations
console.log('ROOMING V102 loaded - clean refactor');

var allRoomingRecords = window.allRoomingRecords || [];
var allRoomingJemaah = window.allRoomingJemaah || [];
var activeLocation = window.activeLocation || localStorage.getItem('effah_active_location') || 'MEKAH';
var roomingDefaultCap = 4;
var customLocations = window.customLocations || JSON.parse(localStorage.getItem('effah_custom_locations')||'[]');
var staffList = window.staffList || [];
var staffIdCounter = window.staffIdCounter || parseInt(localStorage.getItem('effah_staff_counter')||'1000');
var roomingSortDir = window.roomingSortDir || localStorage.getItem('effah_rooming_sort_dir') || 'asc';
var roomingSortActive = typeof window.roomingSortActive !== 'undefined' ? window.roomingSortActive : (localStorage.getItem('effah_rooming_sort_active') === 'true');

window.allRoomingRecords = allRoomingRecords;
window.allRoomingJemaah = allRoomingJemaah;
window.activeLocation = activeLocation;
window.staffList = staffList;
window.staffIdCounter = staffIdCounter;

var _autoScrollInterval = null;
var draggedRoomId = window.draggedRoomId || null;
var _lastDragY = 0;

// ============ HELPERS ============
function getAirtableConfig(){
  const base = window.AIRTABLE_BASE_ID || localStorage.getItem('effah_api_base') || localStorage.getItem('effah_base_id');
  const pat = window.AIRTABLE_PAT || localStorage.getItem('effah_api_pat');
  return {base, pat};
}
function getStaffStorageKey(){ return `effah_staff_list_${activeLocation}_${window.selectedTripRecord?.id||localStorage.getItem('effah_active_trip_id')||'default'}`; }
function saveStaffList(){ try{ localStorage.setItem(getStaffStorageKey(), JSON.stringify(staffList)); }catch(e){} }
function getStaffById(id){ return staffList.find(s=>s.id===id||s.airtableId===id); }
function getRoomOrderKey(){ const tripId=window.selectedTripRecord?.id||localStorage.getItem('effah_active_trip_id')||'default'; return `effah_room_order_${tripId}_${activeLocation}`; }
function getRoomOrderedList(rooms){
  const key=getRoomOrderKey(); const localOrder=JSON.parse(localStorage.getItem(key)||'[]');
  if(localOrder.length>0){ const map={}; rooms.forEach(r=>map[r.id]=r); const ordered=[]; localOrder.forEach(id=>{ if(map[id]){ ordered.push(map[id]); delete map[id]; } }); Object.values(map).forEach(r=>ordered.push(r)); return ordered; }
  return [...rooms].sort((a,b)=>(a.fields['SORT ORDER']||9999)-(b.fields['SORT ORDER']||9999));
}
function saveRoomOrder(ids){ localStorage.setItem(getRoomOrderKey(), JSON.stringify(ids)); }
function cleanTripNameForRooming(name){
  if(!name) return '';
  if(typeof cleanTripName==='function') return cleanTripName(name);
  return name.replace(/^\s*\d+\/\d+\s*\|\s*/i, '').replace(/^\s*\d+\/\d+\s*/i,'').trim();
}
function getJemaahName(f){ if(!f) return '-'; return f['NAMA'] || f['NAME'] || f['NAMA JEMAAH'] || f['NAMA PENUH'] || f['Name'] || '-'; }
function getBoardArray(f){
  if(!f) return [];
  const raw = f['BOARD BASIS'] || f['BOARD'] || '';
  if(Array.isArray(raw)) return raw.filter(Boolean).map(s=>String(s).trim()).filter(Boolean);
  if(typeof raw === 'string' && raw.includes(',')) return raw.split(',').map(s=>s.trim()).filter(Boolean);
  if(raw && raw!=='-' && raw!=='' && raw!=='NO BOARD' && raw!=='NO FULLBOARD') return [String(raw).trim()];
  return [];
}
function getInsuranArray(f){
  if(!f) return [];
  const raw = f['INSURAN'] || f['INSURANCE'] || '';
  if(Array.isArray(raw)) return raw.filter(Boolean).map(s=>String(s).trim());
  if(typeof raw === 'string' && raw.includes(',')) return raw.split(',').map(s=>s.trim()).filter(Boolean);
  if(raw && raw!=='-' && raw!=='') return [String(raw).trim()];
  return [];
}
function getStaffBoardArray(s){
  if(!s) return [];
  const raw = s.boardBasis || s.fields?.['BOARD'] || s.fields?.['BOARD BASIS'] || s.board || '';
  if(Array.isArray(raw)) return raw.filter(Boolean).map(x=>String(x).trim());
  if(typeof raw === 'string' && raw.includes(',')) return raw.split(',').map(x=>x.trim()).filter(Boolean);
  if(raw && raw!=='-' && raw!=='' && raw!=='NO BOARD') return [String(raw).trim()];
  return [];
}
function getNameForAnyId(id){
  const jRec=allRoomingJemaah.find(j=>j.id===id);
  if(jRec) return getJemaahName(jRec.fields);
  const sRec=staffList.find(s=>s.id===id||s.airtableId===id);
  if(sRec) return sRec.name+' (STAFF)';
  return id.substring(0,8)+'...';
}
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
function getStaffTanpaKatilForRoom(roomId){
  try{ return JSON.parse(localStorage.getItem('effah_staff_tanpa_'+roomId)||'[]'); }catch(e){ return []; }
}
function getStaffForRoom(roomId){
  const tanpaLocal = getStaffTanpaKatilForRoom(roomId);
  const room = allRoomingRecords.find(r=>r.id===roomId);
  const tanpaFromField = room ? (room.fields['JEMAAH TANPA KATIL']||[]) : [];
  return staffList.filter(s=>{
    if(!s.roomIds || !s.roomIds.includes(roomId)) return false;
    const id = s.id||s.airtableId;
    if(tanpaLocal.includes(id) || tanpaFromField.includes(id)) return false;
    if(room && room.fields['_STAFF_TANPA_KATIL'] && room.fields['_STAFF_TANPA_KATIL'].includes(id)) return false;
    return true;
  });
}
function isJemaahAssignedAny(jId){
  return allRoomingRecords.some(r=> (r.fields['JEMAAH']||[]).includes(jId) || (r.fields['JEMAAH TANPA KATIL']||[]).includes(jId));
}

// ============ STAFF CRUD ============
async function loadStaffList(){
  try{
    const {base, pat} = getAirtableConfig();
    const tripId=window.selectedTripRecord?.id||localStorage.getItem('effah_active_trip_id')||'';
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
      id:r.id, airtableId:r.id, name:r.fields['NAME']||'',
      boardBasis:r.fields['BOARD BASIS']||r.fields['BOARD']||'',
      train:!!r.fields['TRAIN'], sortNumber:r.fields['SORT NUMBER']||9999,
      trip:r.fields['TRIP']||[], roomIds: r.fields['ROOMING LIST'] || r.fields['ROOM'] || [],
      roomLink: (r.fields['ROOMING LIST']||[])[0]||null
    }));
    staffList.sort((a,b)=>(a.sortNumber||9999)-(b.sortNumber||9999));
    if(staffList.length===0){
      const local=JSON.parse(localStorage.getItem(getStaffStorageKey())||'[]');
      if(local.length>0) staffList=local;
    }
    renderStaffList(); renderRoomingGrid();
    try{ renderRoomingOverview(allRoomingRecords.filter(r=>(r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===activeLocation.toUpperCase())); }catch(e){}
  }catch(e){
    console.error('loadStaffList failed', e);
    staffList=JSON.parse(localStorage.getItem(getStaffStorageKey())||'[]');
    renderStaffList();
  }
}
async function addNewStaff(){
  const input=document.getElementById('newStaffInput'); if(!input) return;
  let name=input.value.trim().toUpperCase();
  if(!name){ alert('Sila masukkan nama staff.'); return; }
  if(!name.includes('(')) name=`${name} (EFFAH)`;
  const {base, pat} = getAirtableConfig();
  const tripId=window.selectedTripRecord?.id||localStorage.getItem('effah_active_trip_id')||'';
  try{
    if(base&&pat){
      const fields = {'NAME': name, 'TRAIN': false, 'SORT NUMBER': staffList.length+1};
      if(tripId) fields['TRIP']=[tripId];
      const res=await fetch(`https://api.airtable.com/v0/${base}/STAFF%20LIST%20%28ROOMING%29`,{
        method:'POST', headers:{'Authorization':`Bearer ${pat}`,'Content-Type':'application/json'},
        body: JSON.stringify({fields})
      });
      const data=await res.json();
      if(data.id){
        staffList.push({id:data.id, airtableId:data.id, name, boardBasis:'', train:false, sortNumber:staffList.length+1, trip:tripId?[tripId]:[], roomIds: []});
        saveStaffList(); renderStaffList(); input.value=''; return;
      }
    }
  }catch(e){ console.error('Add staff failed', e); }
  const id=`staff_${Date.now()}_${++staffIdCounter}`;
  staffList.push({id, name, boardBasis:'', train:false, sortNumber:staffList.length+1, roomIds: []});
  saveStaffList(); renderStaffList(); input.value='';
}
async function updateStaffField(staffId, field, value){
  const s=staffList.find(x=>x.id===staffId||x.airtableId===staffId); if(!s) return;
  if(field==='boardBasis') s.boardBasis=value; else s[field]=value;
  saveStaffList(); renderStaffList();
  const {base, pat}=getAirtableConfig();
  if(!base||!pat||!s.airtableId) return;
  try{
    const airtableField = field==='boardBasis' ? 'BOARD BASIS' : field.toUpperCase();
    const bodyFields = {}; bodyFields[airtableField]= (value===''||value===null)? null : value;
    await fetch(`https://api.airtable.com/v0/${base}/STAFF%20LIST%20%28ROOMING%29/${s.airtableId}`,{
      method:'PATCH', headers:{'Authorization':`Bearer ${pat}`,'Content-Type':'application/json'},
      body: JSON.stringify({fields: bodyFields})
    });
  }catch(e){ console.error(e); }
}
function updateStaffTrain(staffId, checked){
  const s=getStaffById(staffId); if(!s) return;
  s.train=checked; if(!s.fields) s.fields={}; s.fields['TRAIN']=checked;
  saveStaffList(); renderStaffList();
  const {base, pat}=getAirtableConfig();
  if(base&&pat&&s.airtableId){
    fetch(`https://api.airtable.com/v0/${base}/STAFF%20LIST%20%28ROOMING%29/${s.airtableId}`,{
      method:'PATCH', headers:{'Authorization':`Bearer ${pat}`,'Content-Type':'application/json'},
      body: JSON.stringify({fields:{'TRAIN': checked}})
    }).catch(()=>{});
  }
}
async function deleteStaff(staffId){
  if(!confirm('Padam staff ini?')) return;
  const s=staffList.find(x=>x.id===staffId||x.airtableId===staffId);
  const {base, pat}=getAirtableConfig();
  if(base&&pat&&s?.airtableId){
    try{ await fetch(`https://api.airtable.com/v0/${base}/STAFF%20LIST%20%28ROOMING%29/${s.airtableId}`,{method:'DELETE', headers:{'Authorization':`Bearer ${pat}`}}); }catch(e){}
  }
  staffList=staffList.filter(x=>x.id!==staffId&&x.airtableId!==staffId);
  saveStaffList(); renderStaffList(); renderRoomingGrid();
}

// ============ ROOMING CORE ============
async function assignStaffToRoom(staffId, roomId){
  const staff=getStaffById(staffId); if(!staff) return;
  const rec=allRoomingRecords.find(r=>r.id===roomId); if(!rec) return;
  if(!staff.roomIds) staff.roomIds=[];
  if(!staff.roomIds.includes(roomId)) staff.roomIds.push(roomId);
  staff.roomLink = staff.roomIds[0];
  saveStaffList(); renderStaffList(); renderRoomingGrid(); renderLocationTabs();
  const {base, pat}=getAirtableConfig();
  if(!base||!pat||!staff.airtableId) return;
  try{
    let res = await fetch(`https://api.airtable.com/v0/${base}/STAFF%20LIST%20%28ROOMING%29/${staff.airtableId}`,{
      method:'PATCH', headers:{'Authorization':`Bearer ${pat}`,'Content-Type':'application/json'},
      body: JSON.stringify({fields:{'ROOMING LIST': staff.roomIds}})
    });
    let data=await res.json();
    if(data.error){
      // retry clear then set
      await fetch(`https://api.airtable.com/v0/${base}/STAFF%20LIST%20%28ROOMING%29/${staff.airtableId}`,{
        method:'PATCH', headers:{'Authorization':`Bearer ${pat}`,'Content-Type':'application/json'},
        body: JSON.stringify({fields:{'ROOMING LIST': []}})
      });
      await new Promise(r=>setTimeout(r,300));
      await fetch(`https://api.airtable.com/v0/${base}/STAFF%20LIST%20%28ROOMING%29/${staff.airtableId}`,{
        method:'PATCH', headers:{'Authorization':`Bearer ${pat}`,'Content-Type':'application/json'},
        body: JSON.stringify({fields:{'ROOMING LIST': staff.roomIds}})
      });
    }
  }catch(e){ console.error(e); }
}
async function removeStaffFromRoom(roomId, staffId){
  const staff=getStaffById(staffId);
  if(!staff){
    const rec=allRoomingRecords.find(r=>r.id===roomId);
    if(rec){
      const current=rec.fields['STAFF LIST (ROOMING)']||[];
      rec.fields['STAFF LIST (ROOMING)']=current.filter(id=>id!==staffId);
      renderRoomingGrid();
    }
    return;
  }
  staff.roomIds = (staff.roomIds||[]).filter(id=>id!==roomId);
  staff.roomLink = staff.roomIds.length? staff.roomIds[0] : null;
  saveStaffList(); renderStaffList(); renderRoomingGrid(); renderLocationTabs();
  const {base, pat}=getAirtableConfig();
  if(!base||!pat||!staff.airtableId) return;
  try{
    await fetch(`https://api.airtable.com/v0/${base}/STAFF%20LIST%20%28ROOMING%29/${staff.airtableId}`,{
      method:'PATCH', headers:{'Authorization':`Bearer ${pat}`,'Content-Type':'application/json'},
      body: JSON.stringify({fields:{'ROOMING LIST': staff.roomIds, 'ROOM': staff.roomIds}})
    });
  }catch(e){ console.error(e); }
}

// ============ MULTI SELECT LOGIC (UNIFIED) ============
function toggleBoardMulti(jId, opt){
  const rec=allRoomingJemaah.find(r=>r.id===jId); if(!rec) return;
  let arr=getBoardArray(rec.fields);
  if(arr.includes(opt)) arr=arr.filter(x=>x!==opt); else arr.push(opt);
  updateJemaahBoardMulti(jId, arr);
}
function clearBoardMulti(jId){ updateJemaahBoardMulti(jId, []); }
function toggleStaffBoardMulti(staffId, opt){
  const s=getStaffById(staffId); if(!s) return;
  let arr=getStaffBoardArray(s);
  if(arr.includes(opt)) arr=arr.filter(x=>x!==opt); else arr.push(opt);
  s.boardBasis=arr.join(', '); s.board=arr.join(', ');
  saveStaffList(); renderStaffList();
  const {base, pat}=getAirtableConfig();
  if(base&&pat&&s.airtableId){
    fetch(`https://api.airtable.com/v0/${base}/STAFF%20LIST%20%28ROOMING%29/${s.airtableId}`,{
      method:'PATCH',headers:{Authorization:`Bearer ${pat}`,'Content-Type':'application/json'},
      body:JSON.stringify({fields:{'BOARD': arr.join(', '), 'BOARD BASIS': arr}})
    }).catch(()=>{});
  }
}
function clearStaffBoardMulti(staffId){ const s=getStaffById(staffId); if(!s) return; s.boardBasis=''; s.board=''; saveStaffList(); renderStaffList(); }
function toggleInsuranMulti(jId, opt){
  const rec=allRoomingJemaah.find(r=>r.id===jId); if(!rec) return;
  let arr=getInsuranArray(rec.fields);
  if(arr.includes(opt)) arr=arr.filter(x=>x!==opt); else arr.push(opt);
  rec.fields['INSURAN']=arr;
  updateJemaahField(jId, 'INSURAN', arr);
}
function clearInsuranMulti(jId){ const rec=allRoomingJemaah.find(r=>r.id===jId); if(!rec) return; rec.fields['INSURAN']=[]; updateJemaahField(jId, 'INSURAN', []); }

function toggleBoardDropdown(id){
  const el=document.getElementById('boardDrop-'+id); if(!el) return;
  document.querySelectorAll('[id^="boardDrop-"]').forEach(d=>{ if(d.id!=='boardDrop-'+id) d.classList.add('hidden'); });
  document.querySelectorAll('[id^="staffBoardDrop-"]').forEach(d=>d.classList.add('hidden'));
  document.querySelectorAll('[id^="insuranDrop-"]').forEach(d=>d.classList.add('hidden'));
  el.classList.toggle('hidden');
}
function closeBoardDropdown(id){ document.getElementById('boardDrop-'+id)?.classList.add('hidden'); }
function toggleStaffDropdown(id){
  const el=document.getElementById('staffBoardDrop-'+id); if(!el) return;
  document.querySelectorAll('[id^="staffBoardDrop-"]').forEach(d=>{ if(d.id!=='staffBoardDrop-'+id) d.classList.add('hidden'); });
  document.querySelectorAll('[id^="boardDrop-"]').forEach(d=>d.classList.add('hidden'));
  document.querySelectorAll('[id^="insuranDrop-"]').forEach(d=>d.classList.add('hidden'));
  el.classList.toggle('hidden');
}
function closeStaffDropdown(id){ document.getElementById('staffBoardDrop-'+id)?.classList.add('hidden'); }
function toggleInsuranDropdown(id){
  const el=document.getElementById('insuranDrop-'+id); if(!el) return;
  document.querySelectorAll('[id^="insuranDrop-"]').forEach(d=>{ if(d.id!=='insuranDrop-'+id) d.classList.add('hidden'); });
  document.querySelectorAll('[id^="boardDrop-"]').forEach(d=>d.classList.add('hidden'));
  document.querySelectorAll('[id^="staffBoardDrop-"]').forEach(d=>d.classList.add('hidden'));
  el.classList.toggle('hidden');
}
function closeInsuranDropdown(id){ document.getElementById('insuranDrop-'+id)?.classList.add('hidden'); }
if(!window._boardDropListener){
  window._boardDropListener=true;
  document.addEventListener('click', (e)=>{
    const isBoard=e.target.closest('[id^="boardDrop-"]')||e.target.closest('button[onclick*="toggleBoardDropdown"]');
    const isStaff=e.target.closest('[id^="staffBoardDrop-"]')||e.target.closest('button[onclick*="toggleStaffDropdown"]');
    const isIns=e.target.closest('[id^="insuranDrop-"]')||e.target.closest('button[onclick*="toggleInsuranDropdown"]');
    if(!isBoard&&!isStaff&&!isIns){
      document.querySelectorAll('[id^="boardDrop-"]').forEach(d=>d.classList.add('hidden'));
      document.querySelectorAll('[id^="staffBoardDrop-"]').forEach(d=>d.classList.add('hidden'));
      document.querySelectorAll('[id^="insuranDrop-"]').forEach(d=>d.classList.add('hidden'));
    }
  });
}

// ============ UPDATE JEMAAH ============
async function updateJemaahField(jId, field, value){
  const {base, pat}=getAirtableConfig();
  if(!base||!pat) return;
  const rec=allRoomingJemaah.find(r=>r.id===jId); if(rec) rec.fields[field]=value;
  try{
    let payloadValue=value;
    if(field==='INSURAN'){
      if(Array.isArray(value)) payloadValue = value.length?value:[];
      else if(typeof value==='string' && value.trim()!=='') payloadValue = value.split(',').map(s=>s.trim()).filter(Boolean);
      else payloadValue=[];
    }
    if(field==='BOARD BASIS' || field==='BOARD'){
      if(Array.isArray(value)) payloadValue = value.length?value:[];
      else if(typeof value==='string' && value.includes(',')) payloadValue = value.split(',').map(s=>s.trim()).filter(Boolean);
    }
    const fieldsToSend={}; fieldsToSend[field]=payloadValue;
    const res=await fetch(`https://api.airtable.com/v0/${base}/DATA%20JEMAAH%20UMRAH/${jId}`,{
      method:'PATCH',headers:{'Authorization':`Bearer ${pat}`,'Content-Type':'application/json'},
      body:JSON.stringify({fields: fieldsToSend})
    });
    const data=await res.json();
    if(data.error) throw new Error(data.error.message);
    renderNamelist();
  }catch(e){ console.error(e); alert('Gagal update '+field+': '+e.message); fetchRoomingData(); }
}
async function updateJemaahBoardMulti(jId, arr){
  const rec=allRoomingJemaah.find(r=>r.id===jId); if(!rec) return;
  rec.fields['BOARD BASIS']=arr; rec.fields['BOARD']=arr.join(', ');
  renderNamelist();
  const {base, pat}=getAirtableConfig();
  if(!base||!pat) return;
  try{
    let res=await fetch(`https://api.airtable.com/v0/${base}/DATA%20JEMAAH%20UMRAH/${jId}`,{
      method:'PATCH',headers:{'Authorization':`Bearer ${pat}`,'Content-Type':'application/json'},
      body:JSON.stringify({fields:{'BOARD BASIS': arr.length?arr:[]}})
    });
    let data=await res.json();
    if(data.error){
      res=await fetch(`https://api.airtable.com/v0/${base}/DATA%20JEMAAH%20UMRAH/${jId}`,{
        method:'PATCH',headers:{'Authorization':`Bearer ${pat}`,'Content-Type':'application/json'},
        body:JSON.stringify({fields:{'BOARD': arr.join(', ')}})
      });
    }
  }catch(e){ console.error(e); }
}
async function updateJemaahCheckbox(jId, field, checked){
  const rec=allRoomingJemaah.find(r=>r.id===jId); if(rec) rec.fields[field]=checked;
  renderNamelist();
  const {base, pat}=getAirtableConfig();
  if(!base||!pat) return;
  try{
    await fetch(`https://api.airtable.com/v0/${base}/DATA%20JEMAAH%20UMRAH/${jId}`,{
      method:'PATCH',headers:{'Authorization':`Bearer ${pat}`,'Content-Type':'application/json'},
      body:JSON.stringify({fields:{[field]: checked}})
    });
  }catch(e){ console.error(e); }
}

// ============ DRAG & DROP ============
function _stopAutoScroll(){ if(_autoScrollInterval){ clearInterval(_autoScrollInterval); _autoScrollInterval=null; } }
function _startAutoScroll(){
  if(_autoScrollInterval) return;
  _autoScrollInterval=setInterval(()=>{
    const y=window._lastDragY||0;
    if(y<140) window.scrollBy(0,-22);
    else if(y>window.innerHeight-140) window.scrollBy(0,22);
  },30);
}
function allowDrop(e){ e.preventDefault(); window._lastDragY=e.clientY; _startAutoScroll(); e.currentTarget.classList.add('ring-2','ring-[#7A0C2E]/30'); }
function handleRoomDragLeave(e){ e.currentTarget.classList.remove('ring-2','ring-[#7A0C2E]/30'); }
function dragJemaah(e,jId){ if(isJemaahAssignedInLocation(jId, activeLocation)) return; e.dataTransfer.setData('text/plain',jId); setTimeout(()=>{ if(e.currentTarget) e.currentTarget.style.opacity='0.3'; },0); }
function dragEnd(e){ if(e.currentTarget) e.currentTarget.style.opacity='1'; _stopAutoScroll(); }
function dragStaff(e,staffId){
  e.dataTransfer.setData('text/plain', staffId);
  e.dataTransfer.setData('application/x-staff-id', staffId);
  window._draggedStaffId=staffId;
  setTimeout(()=>{ if(e.currentTarget) e.currentTarget.style.opacity='0.5'; },0);
}
function dragStaffEnd(e){ if(e.currentTarget) e.currentTarget.style.opacity='1'; window._draggedStaffId=null; _stopAutoScroll(); }

async function dropJemaah(e, roomId){
  e.preventDefault(); e.currentTarget.classList.remove('ring-2','ring-[#7A0C2E]/30'); _stopAutoScroll();
  document.querySelectorAll('[draggable="true"]').forEach(el=>el.style.opacity='1');
  const staffId=e.dataTransfer.getData('application/x-staff-id') || window._draggedStaffId;
  const jId=e.dataTransfer.getData('text/plain');
  const id=staffId||jId; if(!id) return;
  const rec=allRoomingRecords.find(r=>r.id===roomId);
  if(rec){
    const cap=rec.fields['KAPASITI']||4;
    const curCount=(rec.fields['JEMAAH']||[]).length + getStaffForRoom(rec.id).length;
    if(curCount>=cap && !staffId){
      alert('Bilik Penuh ('+curCount+'/'+cap+')');
      return;
    }
  }
  if(staffList.some(s=>s.id===id||s.airtableId===id)){ assignStaffToRoom(id,roomId); }
  else { if(!isJemaahAssignedInLocation(id, activeLocation)) assignJemaahToRoom(id,roomId); }
  window._draggedStaffId=null;
}

// ============ RENDER FUNCTIONS (SIMPLIFIED, KEEP YOUR UI) ============
// ... (renderNamelist, renderStaffList, renderRoomingGrid, renderRoomingOverview, renderLocationTabs dipendekkan untuk V102 - akan guna original logic tapi call dari file asal jika perlu)

// Placeholder untuk kau terus sambung - aku akan inject full render dari V101 yang dah clean
console.log('V102 core loaded');

// ============ TANPA KATIL ============
function assignStaffAsTanpaKatil(staffId, roomId){
  const room = allRoomingRecords.find(r=>r.id===roomId); if(!room) return;
  const existing = room.fields['JEMAAH TANPA KATIL']||[];
  if(existing.includes(staffId)) return;
  const key='effah_staff_tanpa_'+roomId;
  let list=[]; try{ list=JSON.parse(localStorage.getItem(key)||'[]'); }catch(e){}
  if(!list.includes(staffId)) list.push(staffId);
  localStorage.setItem(key, JSON.stringify(list));
  if(!room.fields['_STAFF_TANPA_KATIL']) room.fields['_STAFF_TANPA_KATIL']=[];
  if(!room.fields['_STAFF_TANPA_KATIL'].includes(staffId)) room.fields['_STAFF_TANPA_KATIL'].push(staffId);
  room.fields['JEMAAH TANPA KATIL']=[...existing.filter(id=>id!==staffId), staffId];
  renderRoomingGrid();
  const {base, pat}=getAirtableConfig();
  if(base&&pat){
    fetch(`https://api.airtable.com/v0/${base}/ROOMING%20LIST/${roomId}`,{method:'PATCH',headers:{Authorization:`Bearer ${pat}`,'Content-Type':'application/json'},body:JSON.stringify({fields:{'JEMAAH TANPA KATIL': room.fields['JEMAAH TANPA KATIL']}})}).catch(()=>{});
  }
}
function removeStaffTanpaKatilFromRoom(roomId, staffId){
  const room=allRoomingRecords.find(r=>r.id===roomId); if(!room) return;
  const key='effah_staff_tanpa_'+roomId; let list=[]; try{ list=JSON.parse(localStorage.getItem(key)||'[]'); }catch(e){}
  list=list.filter(id=>id!==staffId); localStorage.setItem(key, JSON.stringify(list));
  if(room.fields['_STAFF_TANPA_KATIL']) room.fields['_STAFF_TANPA_KATIL']=room.fields['_STAFF_TANPA_KATIL'].filter(id=>id!==staffId);
  if(room.fields['JEMAAH TANPA KATIL']) room.fields['JEMAAH TANPA KATIL']=room.fields['JEMAAH TANPA KATIL'].filter(id=>id!==staffId);
  const s=getStaffById(staffId); if(s && s.roomIds) s.roomIds=s.roomIds.filter(rid=>rid!==roomId);
  renderRoomingGrid(); renderStaffList();
}

// ============ EXPORT TO WINDOW ============
window.getBoardArray=getBoardArray;
window.getInsuranArray=getInsuranArray;
window.getStaffBoardArray=getStaffBoardArray;
window.toggleBoardMulti=toggleBoardMulti;
window.clearBoardMulti=clearBoardMulti;
window.toggleStaffBoardMulti=toggleStaffBoardMulti;
window.clearStaffBoardMulti=clearStaffBoardMulti;
window.toggleInsuranMulti=toggleInsuranMulti;
window.clearInsuranMulti=clearInsuranMulti;
window.toggleBoardDropdown=toggleBoardDropdown;
window.closeBoardDropdown=closeBoardDropdown;
window.toggleStaffDropdown=toggleStaffDropdown;
window.closeStaffDropdown=closeStaffDropdown;
window.toggleInsuranDropdown=toggleInsuranDropdown;
window.closeInsuranDropdown=closeInsuranDropdown;
window.loadStaffList=loadStaffList;
window.addNewStaff=addNewStaff;
window.deleteStaff=deleteStaff;
window.updateStaffTrain=updateStaffTrain;
window.assignStaffToRoom=assignStaffToRoom;
window.removeStaffFromRoom=removeStaffFromRoom;
window.assignStaffAsTanpaKatil=assignStaffAsTanpaKatil;
window.removeStaffTanpaKatilFromRoom=removeStaffTanpaKatilFromRoom;
window.allowDrop=allowDrop;
window.handleRoomDragLeave=handleRoomDragLeave;
window.dragJemaah=dragJemaah;
window.dragEnd=dragEnd;
window.dragStaff=dragStaff;
window.dragStaffEnd=dragStaffEnd;
window.dropJemaah=dropJemaah;
window.getStaffForRoom=getStaffForRoom;
window.getStaffTanpaKatilForRoom=getStaffTanpaKatilForRoom;
window.getStaffById=getStaffById;
window.isJemaahAssignedInLocation=isJemaahAssignedInLocation;
window.isStaffAssignedInLocation=isStaffAssignedInLocation;
