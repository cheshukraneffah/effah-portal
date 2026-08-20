// ROOMING V102 SUPER CLEAN - All history comments removed - Functional code only
console.log('ROOMING V102 SUPER CLEAN loaded');
// ROOMING V102 FIX TAB CLICK - FIX async STRAY + _origDropJemaahToRoom DUPLICATE + _autoScrollInterval
console.log('ROOMING V102 FIX TAB CLICK loaded - all tabs should work now');
var _autoScrollInterval = window._autoScrollInterval || null; // V102 FIX SINGLE
window._autoScrollInterval = _autoScrollInterval;



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
      const fields = {'NAME': name, 'TRAIN': false, 'SORT NUMBER': staffList.length+1};
      if(tripId) fields['TRIP']=[tripId];
      const res=await fetch(`https://api.airtable.com/v0/${base}/STAFF%20LIST%20%28ROOMING%29`,{
        method:'POST',
        headers:{'Authorization':`Bearer ${pat}`,'Content-Type':'application/json'},
        body: JSON.stringify({fields})
      });
      const data=await res.json();
      if(data.id){
        staffList.push({id:data.id, airtableId:data.id, name, boardBasis:'', train:false, sortNumber:staffList.length+1, trip:tripId?[tripId]:[], roomIds: [], roomLink: null});
        saveStaffList(); renderStaffList(); input.value=''; return;
      }
    }
  }catch(e){ console.error('Add staff Airtable failed', e); }
  const id=`staff_${Date.now()}_${++staffIdCounter}`;
  staffList.push({id, name, boardBasis:'', train:false, sortNumber:staffList.length+1, roomIds: [], roomLink: null});
  saveStaffList(); renderStaffList(); input.value='';
}

async function updateStaffField(staffId, field, value){
  const s=staffList.find(x=>x.id===staffId||x.airtableId===staffId); if(!s) return;
  if(field==='boardBasis') s.boardBasis=value; else s[field]=value;
  saveStaffList(); renderStaffList();
  // if clearing board, set value to null for Airtable to clear

  const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base')||localStorage.getItem('effah_base_id');
  const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
  if(!base||!pat||!s.airtableId) return;
  try{
    const airtableField = field==='boardBasis' ? 'BOARD BASIS' : field.toUpperCase();
    const payloadValue = (value==='' || value===null) ? null : value;
    const bodyFields = {};
    if(payloadValue===null){ bodyFields[airtableField]=null; } else { bodyFields[airtableField]=value; }
    await fetch(`https://api.airtable.com/v0/${base}/STAFF%20LIST%20%28ROOMING%29/${s.airtableId}`,{
      method:'PATCH',
      headers:{'Authorization':`Bearer ${pat}`,'Content-Type':'application/json'},
      body: JSON.stringify({fields: bodyFields})
    });
  }catch(e){ console.error('updateStaffField failed', e); }
}

async function assignStaffToRoom(staffId,roomId){
  const staff=staffList.find(s=>s.id===staffId||s.airtableId===staffId); if(!staff) return;
  const rec=allRoomingRecords.find(r=>r.id===roomId); if(!rec) return;
  // FIX: allow  rooms linking - append not overwrite
  if(!staff.roomIds) staff.roomIds=[];
  if(!staff.roomIds.includes(roomId)) staff.roomIds.push(roomId);
  staff.roomLink = staff.roomIds[0];
  saveStaffList(); renderStaffList(); renderRoomingGrid(); renderLocationTabs();
  const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base')||localStorage.getItem('effah_base_id');
  const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
  if(!base||!pat||!staff.airtableId) return;
  console.log('Assigning staff', staffId, 'to rooms', staff.roomIds);
  try{
    let fieldName = 'ROOMING LIST';
    let res = await fetch(`https://api.airtable.com/v0/${base}/STAFF%20LIST%20%28ROOMING%29/${staff.airtableId}`,{
      method:'PATCH',
      headers:{'Authorization':`Bearer ${pat}`,'Content-Type':'application/json'},
      body: JSON.stringify({fields:{[fieldName]: staff.roomIds}})
    });
    let data = await res.json();
    if(data.error){
      console.error('ROOMING LIST link error 422 details:', data.error);
      // If 422, try to link rooms one by one to see which fails, keep at least first
      // Airtable sometimes rejects if field is still single-link - try overwrite with full array again after clearing
      if(data.error.type==='INVALID_VALUE_FOR_COLUMN' || data.error.message?.includes('422')){
        // Attempt to clear then set
        await fetch(`https://api.airtable.com/v0/${base}/STAFF%20LIST%20%28ROOMING%29/${staff.airtableId}`,{
          method:'PATCH',
          headers:{'Authorization':`Bearer ${pat}`,'Content-Type':'application/json'},
          body: JSON.stringify({fields:{[fieldName]: []}})
        });
        await new Promise(r=>setTimeout(r,300));
        res = await fetch(`https://api.airtable.com/v0/${base}/STAFF%20LIST%20%28ROOMING%29/${staff.airtableId}`,{
          method:'PATCH',
          headers:{'Authorization':`Bearer ${pat}`,'Content-Type':'application/json'},
          body: JSON.stringify({fields:{[fieldName]: staff.roomIds}})
        });
        data = await res.json();
        if(data.error){
          console.error('Still fails after clear:', data.error);
          // fallback to ROOM field
          fieldName = 'ROOM';
          await fetch(`https://api.airtable.com/v0/${base}/STAFF%20LIST%20%28ROOMING%29/${staff.airtableId}`,{
            method:'PATCH',
            headers:{'Authorization':`Bearer ${pat}`,'Content-Type':'application/json'},
            body: JSON.stringify({fields:{[fieldName]: staff.roomIds}})
          });
        }
      } else {
        fieldName = 'ROOM';
        await fetch(`https://api.airtable.com/v0/${base}/STAFF%20LIST%20%28ROOMING%29/${staff.airtableId}`,{
          method:'PATCH',
          headers:{'Authorization':`Bearer ${pat}`,'Content-Type':'application/json'},
          body: JSON.stringify({fields:{[fieldName]: staff.roomIds}})
        });
      }
    }
  }catch(e){ console.error('assignStaffToRoom link failed', e); }

}
function removeStaff(roomId,staffName, evt){ if(evt){ evt.stopPropagation(); evt.preventDefault(); }
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





function cleanTripNameForRooming(name){
  if(!name) return '';
  if(typeof cleanTripName==='function') return cleanTripName(name);
  return name.replace(/^\s*\d+\/\d+\s*\|\s*/i, '').replace(/^\s*\d+\/\d+\s*/i,'').trim();
}
function getJemaahName(f){ if(!f) return '-'; return f['NAMA'] || f['NAME'] || f['NAMA JEMAAH'] || f['NAMA PENUH'] || f['Name'] || '-'; }
function generateRoomIdFromCap(cap){ return `B${parseInt(cap)||4}`; }
function getBoardArray(f){
  if(!f) return [];
  const raw = f['BOARD BASIS'] || f['BOARD'] || '';
  if(Array.isArray(raw)) return raw.filter(Boolean).map(s=>String(s).trim()).filter(Boolean);
  if(typeof raw === 'string' && raw.includes(',')) return raw.split(',').map(s=>s.trim()).filter(Boolean);
  if(raw && raw!=='-' && raw!=='' && raw!=='NO BOARD' && raw!=='NO FULLBOARD') return [String(raw).trim()];
  return [];
}
function getNameForAnyId(id){
  const jRec=allRoomingJemaah.find(j=>j.id===id);
  if(jRec) return getJemaahName(jRec.fields);
  const sRec=staffList.find(s=>s.id===id||s.airtableId===id);
  if(sRec) return sRec.name+' (STAFF TANPA KATIL)';
  return id.substring(0,8)+'... (Unknown)';
}

function getStaffBoardArray(s){
  if(!s) return [];
  const raw = s.boardBasis || s.fields?.['BOARD'] || s.fields?.['BOARD BASIS'] || s.board || '';
  if(Array.isArray(raw)) return raw.filter(Boolean).map(x=>String(x).trim());
  if(typeof raw === 'string' && raw.includes(',')) return raw.split(',').map(x=>x.trim()).filter(Boolean);
  if(raw && raw!=='-' && raw!=='' && raw!=='NO BOARD') return [String(raw).trim()];
  return [];
}
function renderInsuranCell(jId, insArr){
  var opts=['TAKAFUL','ETIQA','AL-KHAIRI'];
  var display=insArr.length? insArr.join(', ') : '-';
  var cls=insArr.length? 'bg-emerald-100 border-emerald-200 text-emerald-800' : 'bg-white border-slate-200';
  var html='<div class="relative"><button onclick="toggleInsuranDropdown(\''+jId+'\')" class="w-full text-[8px] border rounded-full px-2.5 py-1.5 font-bold '+cls+' text-left flex items-center justify-between opacity-100"><span class="truncate">'+display+'</span><span>▼</span></button><div id="insuranDrop-'+jId+'" class="hidden absolute z-[9999] mt-1 w-48 bg-white border border-slate-300 rounded-xl shadow-2xl p-1 opacity-100" style="background:white; opacity:1;">';
  for(var i=0;i<opts.length;i++){
    var o=opts[i];
    var checked=insArr.includes(o)?'checked':'';
    html+='<label class="flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-50 cursor-pointer text-[11px]"><input type="checkbox" '+checked+' onchange="toggleInsuranMulti(\''+jId+'\',\''+o+'\')" class="w-3.5 h-3.5 accent-[#7A0C2E]"> '+o+'</label>';
  }
  html+='<div class="flex justify-between gap-1 mt-1 pt-1 border-t bg-white"><button onclick="clearInsuranMulti(\''+jId+'\'); closeInsuranDropdown(\''+jId+'\')" class="text-[9px] px-3 py-1 rounded-full bg-slate-100">Clear</button><button onclick="closeInsuranDropdown(\''+jId+'\')" class="text-[9px] px-3 py-1 rounded-full bg-[#7A0C2E] text-white">OK</button></div></div></div>';
  return html;
}
function toggleInsuranMulti(jId, opt){
  var rec=allRoomingJemaah.find(function(r){return r.id===jId;});
  if(!rec) return;
  var arr=getInsuranArray(rec.fields);
  if(arr.includes(opt)) arr=arr.filter(function(x){return x!==opt;}); else arr.push(opt);
  rec.fields['INSURAN']=arr;
  if(typeof updateJemaahField==='function') updateJemaahField(jId, 'INSURAN', arr);
}
function clearInsuranMulti(jId){
  var rec=allRoomingJemaah.find(function(r){return r.id===jId;});
  if(!rec) return;
  rec.fields['INSURAN']=[];
  if(typeof updateJemaahField==='function') updateJemaahField(jId, 'INSURAN', []);
}

function getInsuranArrayV2(f){
  if(!f) return [];
  const raw = f['INSURAN'] || f['INSURANCE'] || '';
  if(Array.isArray(raw)) return raw.filter(Boolean).map(s=>String(s).trim());
  if(typeof raw === 'string' && raw.includes(',')) return raw.split(',').map(s=>s.trim()).filter(Boolean);
  if(raw && raw!=='-' && raw!=='') return [String(raw).trim()];
  return [];
}
function getStaffById(id){ return staffList.find(s=>s.id===id||s.airtableId===id); }
function toggleBoardMulti(jemaahId, option){
  const rec=allRoomingJemaah.find(r=>r.id===jemaahId); if(!rec) return;
  let arr=getBoardArray(rec.fields);
  if(arr.includes(option)) arr=arr.filter(x=>x!==option); else arr.push(option);
  updateJemaahBoardMulti(jemaahId, arr);
}
function clearBoardMulti(jemaahId){ updateJemaahBoardMulti(jemaahId, []); }
function toggleStaffBoardMulti(staffId, option){
  const s=getStaffById(staffId); if(!s) return;
  let arr=getStaffBoardArray(s);
  if(arr.includes(option)) arr=arr.filter(x=>x!==option); else arr.push(option);
  s.boardBasis=arr; s.board=arr.join(', '); if(s.fields) s.fields['BOARD']=arr.join(', ');
  saveStaffList(); if(typeof renderStaffList==='function') renderStaffList();
  const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base')||localStorage.getItem('effah_base_id'); const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
  if(base&&pat&&s.airtableId){ fetch(`https://api.airtable.com/v0/${base}/STAFF%20LIST%20%28ROOMING%29/${s.airtableId}`,{method:'PATCH',headers:{Authorization:`Bearer ${pat}`,'Content-Type':'application/json'},body:JSON.stringify({fields:{'BOARD': arr.join(', ')}})}).catch(()=>{}); }
}
function clearStaffBoardMulti(staffId){ const s=getStaffById(staffId); if(!s) return; s.boardBasis=[]; s.board=''; if(s.fields) s.fields['BOARD']=''; saveStaffList(); if(typeof renderStaffList==='function') renderStaffList(); }
function toggleInsuranMulti(jemaahId, option){
  const rec=allRoomingJemaah.find(r=>r.id===jemaahId); if(!rec) return;
  let arr=getInsuranArrayV2(rec.fields);
  if(arr.includes(option)) arr=arr.filter(x=>x!==option); else arr.push(option);
  rec.fields['INSURAN']=arr;
  if(typeof updateJemaahField==='function') updateJemaahField(jemaahId, 'INSURAN', arr.length?arr.join(', '):'');
  if(typeof renderNamelist==='function') renderNamelist();
}
function clearInsuranMulti(jemaahId){ const rec=allRoomingJemaah.find(r=>r.id===jemaahId); if(!rec) return; rec.fields['INSURAN']=[]; if(typeof updateJemaahField==='function') updateJemaahField(jemaahId, 'INSURAN', []); if(typeof renderNamelist==='function') renderNamelist(); }
function toggleBoardDropdown(id){ const el=document.getElementById('boardDrop-'+id); if(!el) return; document.querySelectorAll('[id^="boardDrop-"]').forEach(d=>{ if(d.id!=='boardDrop-'+id) d.classList.add('hidden'); }); document.querySelectorAll('[id^="staffBoardDrop-"]').forEach(d=>d.classList.add('hidden')); document.querySelectorAll('[id^="insuranDrop-"]').forEach(d=>d.classList.add('hidden')); el.classList.toggle('hidden'); }
function closeBoardDropdown(id){ const el=document.getElementById('boardDrop-'+id); if(el) el.classList.add('hidden'); }
function toggleStaffDropdown(id){ const el=document.getElementById('staffBoardDrop-'+id); if(!el) return; document.querySelectorAll('[id^="staffBoardDrop-"]').forEach(d=>{ if(d.id!=='staffBoardDrop-'+id) d.classList.add('hidden'); }); document.querySelectorAll('[id^="boardDrop-"]').forEach(d=>d.classList.add('hidden')); document.querySelectorAll('[id^="insuranDrop-"]').forEach(d=>d.classList.add('hidden')); el.classList.toggle('hidden'); }
function closeStaffDropdown(id){ const el=document.getElementById('staffBoardDrop-'+id); if(el) el.classList.add('hidden'); }
function toggleInsuranDropdown(id){ const el=document.getElementById('insuranDrop-'+id); if(!el) return; document.querySelectorAll('[id^="insuranDrop-"]').forEach(d=>{ if(d.id!=='insuranDrop-'+id) d.classList.add('hidden'); }); document.querySelectorAll('[id^="boardDrop-"]').forEach(d=>d.classList.add('hidden')); document.querySelectorAll('[id^="staffBoardDrop-"]').forEach(d=>d.classList.add('hidden')); el.classList.toggle('hidden'); }
function closeInsuranDropdown(id){ const el=document.getElementById('insuranDrop-'+id); if(el) el.classList.add('hidden'); }
if(!window._boardDropListener){ window._boardDropListener=true; document.addEventListener('click', (e)=>{ const isBoard=e.target.closest('[id^="boardDrop-"]')||e.target.closest('button[onclick*="toggleBoardDropdown"]'); const isStaff=e.target.closest('[id^="staffBoardDrop-"]')||e.target.closest('button[onclick*="toggleStaffDropdown"]'); const isIns=e.target.closest('[id^="insuranDrop-"]')||e.target.closest('button[onclick*="toggleInsuranDropdown"]'); if(!isBoard&&!isStaff&&!isIns){ document.querySelectorAll('[id^="boardDrop-"]').forEach(d=>d.classList.add('hidden')); document.querySelectorAll('[id^="staffBoardDrop-"]').forEach(d=>d.classList.add('hidden')); document.querySelectorAll('[id^="insuranDrop-"]').forEach(d=>d.classList.add('hidden')); } }); }

function getFullboardVal(f){ 
  const arr=getBoardArray(f);
  return arr[0]||'';
}
function getFullboardDisplay(f){
  const arr=getBoardArray(f);
  if(arr.length===0) return '-';
  return arr.join(', ');
}
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
            <select id="filterPakejRooming" onchange="filterRoomingNamelist()" class="text-[11px] border border-slate-200 rounded-xl px-2.5 py-2 bg-white font-medium"><option value="">Semua Pakej</option><option value="JIMAT STANDARD">JIMAT STANDARD</option><option value="JIMAT PREMIUM">JIMAT PREMIUM</option><option value="EKONOMI LITE">EKONOMI LITE</option><option value="EKONOMI">EKONOMI</option><option value="STANDARD">STANDARD</option><option value="PREMIUM">PREMIUM</option><option value="PREMIUM PLUS">PREMIUM PLUS</option></select>
          </div>
        </div>
        <div class="px-2.5 py-1.5 bg-slate-50/70 border-b border-slate-200 grid grid-cols-12 text-[9px] font-bold text-slate-500 tracking-wider">
          <div class="col-span-1">NO</div>
          <div class="col-span-3 flex items-center gap-1 cursor-pointer hover:text-[#7A0C2E] select-none" onclick="toggleSortNama()" title="Klik untuk sort A-Z / Z-A">
            <span id="headerNamaJemaah" class="bg-[#7A0C2E] text-white px-1.5 py-0.5 rounded text-[9px]">NAMA JEMAAH</span>
            <span id="sortIcon" class="text-[10px]">${roomingSortActive ? (roomingSortDir==='asc'?'↑':'↓') : '↕'}</span>
          </div>
          <div class="col-span-2 text-center">BOARD BASIS</div><div class="col-span-1 text-center">TRAIN</div><div class="col-span-3 text-center">INSURAN</div><div class="col-span-1 text-center">PAKEJ</div><div class="col-span-1 text-center">+</div>
        </div>
        <div id="namelistContainer" class="flex-1 overflow-y-auto max-h-[58vh] divide-y divide-slate-100 bg-white min-h-[180px] relative"></div>
        <div class="border-t-2 border-slate-200 bg-white relative">
          <div class="p-2.5 flex items-center justify-between">
            <h4 class="font-bold text-[11px] tracking-widest text-slate-700">STAFF / EXTRA LIST</h4>
            <span id="staffTotalBadge" class="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-full text-[10px] font-bold">0 Staff</span>
          </div>
          <div class="px-2.5 pb-2.5 flex gap-1.5">
            <input id="newStaffInput" placeholder="Taip nama staff" class="flex-1 text-[11px] px-2.5 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none" onkeydown="if(event.key==='Enter'){ addNewStaff(); }">
            <button onclick="addNewStaff()" class="px-3 py-2 bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-[11px] font-bold hover:bg-slate-200">+ Add</button>
          </div>
          <div id="staffListContainer" class="px-2 pb-2.5 max-h-[34vh] overflow-y-auto space-y-1 bg-white min-h-[70px] relative"></div>
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
              <div class="hidden" id="roomingBadgesHidden"></div>
            </div>
            <div class="flex items-center gap-1 flex-wrap">
              <div class="flex gap-1"><button onclick="generateRoomingPrint('landscape')" class="px-2.5 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-bold hover:bg-slate-50">Print Landscape</button><button onclick="generateRoomingPrint('portrait')" class="px-2.5 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-bold hover:bg-slate-50">Print Portrait</button></div>
              <button onclick="openCopyRoomsModal()" class="px-2.5 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-bold hover:bg-slate-50">Copy Bilik</button>
              <button onclick="autoAssignRooming()" class="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-full text-[10px] font-bold hover:bg-slate-200">Auto Assign</button>
              <button onclick="openNewRoomModal()" class="px-2.5 py-1 bg-[#7A0C2E] text-white rounded-full text-[10px] font-bold hover:bg-[#5a0922]">+ Bilik Baru</button>
            </div>
          </div>
          <div id="roomingOverview" class="mt-2.5 p-2.5 bg-[#7A0C2E] text-white rounded-xl text-[11px]"></div>
          <div id="locationTabs" class="flex flex-wrap gap-1 mt-2.5"></div>
        </div>
        <div id="roomingGrid" class="grid grid-cols-1 lg:grid-cols-2 gap-2.5 content-start min-h-[280px]"></div>
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
        <select id="newRoomPakej" class="w-full p-2 border border-slate-200 rounded-xl bg-white text-[11px] font-bold"><option value="JIMAT STANDARD">JIMAT STANDARD</option><option value="JIMAT PREMIUM">JIMAT PREMIUM</option><option value="EKONOMI LITE">EKONOMI LITE</option><option value="EKONOMI">EKONOMI</option><option value="STANDARD">STANDARD</option><option value="PREMIUM">PREMIUM</option><option value="PREMIUM PLUS">PREMIUM PLUS</option></select>
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
  // Update local sort order and save to localStorage
  ordered.forEach((r,i)=>{ r.fields['SORT ORDER']=i+1; });
  saveRoomOrder(ordered.map(r=>r.id));
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
  rec.fields['CATATAN BILIK']=value;
  rec.fields['CATATAN']=value;
  rec.fields['NOTES']=value;
  console.log('V87 updateRoomCatatan', roomId, value);
  try{
    const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base')||localStorage.getItem('effah_base_id'); const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
    if(!base||!pat) throw new Error('Airtable config missing');
    // Try field names in order: CATATAN BILIK, CATATAN, NOTES, REMARK
    const fieldNames = ['CATATAN BILIK','CATATAN','NOTES','REMARK','Catatan Bilik','Catatan'];
    let lastError=null;
    for(let fieldName of fieldNames){
      try{
        const res=await fetch(`https://api.airtable.com/v0/${base}/ROOMING%20LIST/${roomId}`,{method:'PATCH',
          headers:{'Authorization':`Bearer ${pat}`,'Content-Type':'application/json'},
          body: JSON.stringify({fields:{[fieldName]: value}})
        });
        const data=await res.json();
        if(data.error){
          console.warn('Catatan field', fieldName, 'failed', data.error);
          lastError=data.error;
          continue; // try next field name
        } else {
          console.log('Catatan saved to field', fieldName, 'value', value);
          // Also save to local for instant persistence
          try{
            const key='effah_room_notes_'+roomId;
            localStorage.setItem(key, value);
          }catch(e){}
          return;
        }
      }catch(e){
        console.warn('Catatan field', fieldName, 'exception', e);
        lastError=e;
      }
    }
    throw lastError||new Error('All catatan field names failed');
  }catch(e){ console.error('Catatan update failed', e); alert('Gagal save catatan bilik: '+e.message+'\n\nField CATATAN BILIK tak wujud di Airtable? Check nama field.'); }
}
function loadLocalCatatan(roomId){
  try{
    const key='effah_room_notes_'+roomId;
    return localStorage.getItem(key)||'';
  }catch(e){ return ''; }
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
        const fbArr=getBoardArray(jRec?.fields||{});
        const fb=fbArr.join(', ').toUpperCase();
        if(!fb || fb==='-' || fb==='NO BOARD') return;
        if(locUpper==='MEKAH'){ if(fb.includes('MEKAH')||fb==='FULLBOARD'&&!fb.includes('MADINAH')||fb==='BOARD') cnt++; }
        else if(locUpper==='MADINAH'){ if(fb.includes('MADINAH')||fb==='FULLBOARD'&&!fb.includes('MEKAH')||fb==='BOARD') cnt++; }
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
  // FIX: count staff from both text field and linked staffList (same as renderRoomingGrid)
  const staffFromText = rooms.reduce((s,r)=>s+(r.fields['STAFF / EXTRA']||'').split(',').filter(Boolean).length,0);
  const staffFromLinked = rooms.reduce((s,r)=>{ try{ return s+getStaffForRoom(r.id).length; }catch(e){ return s; } },0);
  const totalStaff = staffFromText + staffFromLinked;
  const totalJemaahFull = totalJ + totalBaby; // infant masuk dalam jemaah count

  let hotelBlocks = Object.keys(byHotel).sort().map(hotel=>{
    const caps=byHotel[hotel];
    const hotelRooms = allRoomingRecords.filter(r=> (r.fields['HOTEL NAME']||'TANPA HOTEL').toUpperCase()===hotel && (r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===loc);
    const fbHotel = countFBForHotel(hotelRooms, loc);
    const capsList = Object.keys(caps).sort((a,b)=>b-a).map(cap=>{
      const cnt=caps[cap];
      return `<span class="inline-flex items-center gap-1 bg-white/15 px-2 py-0.5 rounded-full text-[10px] mr-1 mb-1"><span>Bilik ber-${cap}</span><span class="font-bold">(${cnt})</span></span>`;
    }).join('');
    return `<div class="flex flex-col gap-1 py-2 border-b border-white/10 last:border-0"><div class="flex items-center justify-between"><span class="font-bold text-[11px] truncate">${hotel}</span>${fbHotel?``:''}</div><div class="flex flex-wrap">${capsList}</div></div>`;
  }).join('');

  let html=`<div class="space-y-2">
    <div class="flex items-center justify-between">
      <div class="font-bold text-[13px] tracking-widest">${activeLocation} • ${totalBilik} Bilik</div>
      <div class="flex items-center gap-1.5">
        <span class="text-[10px] bg-white/20 px-2.5 py-1 rounded-full font-bold">${totalJemaahFull} Jemaah + ${totalStaff} Staff</span>
        ${fbCount?``:''}
      </div>
    </div>
    <div class="bg-white/10 rounded-xl p-2.5 max-h-[26vh] overflow-y-auto">
      ${hotelBlocks||'<div class="opacity-70 text-[11px]">Tiada data hotel</div>'}
    </div>
  </div>`;
  el.innerHTML=html;
}

function renderLocationTabs(){
  const container=document.getElementById('locationTabs'); if(!container) return;
  const base=['MEKAH','MADINAH','TAIF']; 
  const all=[...base,...customLocations.filter(l=>!base.includes(l))];
  // collect all distinct locations from records
  const allLocFromRecords = new Set();
  allRoomingRecords.forEach(r=>{ const l=(r.fields['LOKASI / CITY']||'').trim().toUpperCase(); if(l) allLocFromRecords.add(l); });
  allLocFromRecords.forEach(l=>{ if(!all.includes(l)) all.push(l); });
  const counts={}; all.forEach(l=>counts[l]=0); 
  allRoomingRecords.forEach(r=>{ 
    let l=(r.fields['LOKASI / CITY']||'').trim().toUpperCase(); 
    if(!l) l='MEKAH'; // default
    if(counts[l]!==undefined) counts[l]++; 
    else { counts[l]=1; if(!all.includes(l)) all.push(l); } 
  });
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
    showRoomingLoading(); 
    populateRoomingTripDropdown();
    let tripId=window.selectedTripRecord?.id||localStorage.getItem('effah_active_trip_id')||localStorage.getItem('effah_last_selected_trip')||localStorage.getItem('selectedTripId')||'';
    // Fallback: try to get from dropdown if localStorage blocked by Tracking Prevention
    if(!tripId){
      const sel=document.getElementById('roomingTripSelect');
      if(sel && sel.value) tripId=sel.value;
    }
    if(!tripId){ 
      document.getElementById('namelistContainer').innerHTML='<div class="p-6 text-center text-[11px] text-slate-400">Sila pilih trip di atas (16-25 OGOS 2026).<br>Jika tracking prevention block storage, pilih manual.</div>'; 
      if(typeof hideRoomingLoading==='function') hideRoomingLoading();
      return; 
    }
    const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base')||localStorage.getItem('effah_base_id'); 
    const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
    if(!base||!pat){ 
      document.getElementById('namelistContainer').innerHTML='<div class="p-6 text-center text-[11px] text-red-400">Airtable config missing</div>';
      if(typeof hideRoomingLoading==='function') hideRoomingLoading();
      return;
    }
    let allRooms=[],allJems=[],offset='';
    // Fetch ROOMING LIST with retry
    try{
      do{ 
        const res=await fetch(`https://api.airtable.com/v0/${base}/ROOMING%20LIST?pageSize=100${offset?`&offset=${offset}`:''}`,{headers:{Authorization:`Bearer ${pat}`}}); 
        if(!res.ok){ console.warn('ROOMING LIST fetch failed', res.status); break; }
        const data=await res.json(); 
        if(data.records) allRooms=allRooms.concat(data.records); 
        offset=data.offset||''; 
      }while(offset);
    }catch(e){ console.error('ROOMING LIST error', e); }
    offset='';
    // Fetch JEMAAH with retry - ignore 410 attachment errors (they are not API errors, but data contains expired urls)
    try{
      do{ 
        const res=await fetch(`https://api.airtable.com/v0/${base}/DATA%20JEMAAH%20UMRAH?pageSize=100${offset?`&offset=${offset}`:''}`,{headers:{Authorization:`Bearer ${pat}`}}); 
        if(!res.ok){ 
          const txt=await res.text();
          console.warn('JEMAAH fetch failed', res.status, txt);
          if(res.status===429){ await new Promise(r=>setTimeout(r, 2000)); continue; }
          break; 
        }
        const data=await res.json(); 
        if(data.records) allJems=allJems.concat(data.records); 
        offset=data.offset||''; 
      }while(offset);
    }catch(e){ console.error('JEMAAH error', e); }
    console.log('fetchRoomingData done: rooms', allRooms.length, 'jemaah', allJems.length);
    allRoomingRecords=allRooms.filter(r=>{ const tf=r.fields['TRIP']||[]; return Array.isArray(tf)?tf.includes(tripId):String(tf).includes(tripId); });
    allRoomingJemaah=allJems.filter(r=>{ const tf=r.fields['TRIP']||[]; return Array.isArray(tf)?tf.includes(tripId):String(tf).includes(tripId); });
    console.log('filtered for trip', tripId, 'rooms', allRoomingRecords.length, 'jemaah', allRoomingJemaah.length);
    try{ await loadStaffList(); }catch(e){ console.warn('staff list fail', e); }
    renderNamelist(); 
    renderRoomingGrid(); 
    renderLocationTabs();
    if(typeof hideRoomingLoading==='function') hideRoomingLoading();
  }catch(e){ 
    console.error('fetchRoomingData fatal', e); 
    const cont=document.getElementById('namelistContainer');
    if(cont) cont.innerHTML='<div class="p-6 text-center text-[11px] text-red-400">Ralat memuatkan jemaah: '+e.message+'<br><button onclick="fetchRoomingData()" class="mt-2 px-3 py-1 bg-[#7A0C2E] text-white rounded-full text-[10px]">Retry</button></div>';
    if(typeof hideRoomingLoading==='function') hideRoomingLoading();
  }
}
function hideRoomingLoading(){
  const el=document.querySelector('.rooming-loading, #roomingLoading');
  if(el) el.style.display='none';
  const cont=document.getElementById('namelistContainer');
  // If still shows loading spinner, replace
  if(cont && cont.innerHTML.includes('Memuatkan jemaah')){
    // Will be overwritten by renderNamelist, but if no data, show empty
    if(allRoomingJemaah.length===0){
      cont.innerHTML='<div class="p-6 text-center text-[11px] text-slate-400">Tiada jemaah untuk trip ini</div>';
    }
  }
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
  const tanpaLocal = (typeof getStaffTanpaKatilForRoom==='function'? getStaffTanpaKatilForRoom(roomId) : []);
  const room = allRoomingRecords.find(r=>r.id===roomId);
  const tanpaFromField = room ? (room.fields['JEMAAH TANPA KATIL']||[]) : [];
  return staffList.filter(s=>{
    if(!s.roomIds || !s.roomIds.includes(roomId)) return false;
    const id = s.id||s.airtableId;
    // If staff is in tanpa katil list (local or field), don't count as regular staff
    if(tanpaLocal.includes(id) || tanpaFromField.includes(id)) return false;
    // Also check _STAFF_TANPA_KATIL
    if(room && room.fields['_STAFF_TANPA_KATIL'] && room.fields['_STAFF_TANPA_KATIL'].includes(id)) return false;
    return true;
  });
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
  const totalEl=document.getElementById('totalJemaahBadge'); if(totalEl) { totalEl.textContent=total+' Total'; totalEl.style.display='none'; }
  const belumEl=document.getElementById('belumAssignBadge'); if(belumEl) { belumEl.textContent=belumInLoc+' Unassigned di '+activeLocation; belumEl.style.display='none'; }
  const topBelum=document.getElementById('belumAssignTop'); if(topBelum) { topBelum.textContent=belumGlobal+' Unassigned'; topBelum.style.display='none'; }
  const topAssign=document.getElementById('assignedTop'); if(topAssign) { topAssign.textContent=(total-belumGlobal)+' Assigned'; topAssign.style.display='none'; }
  const topUnassignedBadge=document.getElementById('topUnassignedBadge'); if(topUnassignedBadge) topUnassignedBadge.style.display='none';
  const topAssignedBadge=document.getElementById('topAssignedBadge'); if(topAssignedBadge) topAssignedBadge.style.display='none';
  if(total===0){ cont.innerHTML='<div class="p-6 text-center text-[11px] text-slate-400">Tiada jemaah untuk trip ini</div>'; return; }
  cont.innerHTML=filtered.map((r,i)=>{
        const name=getJemaahName(r.fields);
    const assignedNormalInLoc=isJemaahAssignedInLocation(r.id, activeLocation);
    const assignedTanpaInLoc=allRoomingRecords.some(rec=> (rec.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===activeLocation.toUpperCase() && ((rec.fields['JEMAAH TANPA KATIL']||[]).includes(r.id)));
    const assignedInLoc = assignedNormalInLoc || assignedTanpaInLoc;
    const assignedGlobal=isJemaahAssignedAny(r.id);
    // FIX ghost dropdown: jangan guna opacity-60 sebab child dropdown ikut transparent, guna bg saja
    const rowCls=assignedInLoc?'bg-slate-100 text-slate-500':'hover:bg-slate-50';
    const drag=assignedInLoc?'':`draggable="true" ondragstart="dragJemaah(event,'${r.id}')" ondragend="dragEnd(event)"`;
    let statusIcon = assignedInLoc? `<button onclick="removeJemaahFromCurrentLoc('${r.id}')" class="w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-[10px]" title="Keluarkan dari ${activeLocation}">✕</button>` : `<button onclick="quickAssign('${r.id}')" class="w-5 h-5 rounded-full border bg-slate-100 hover:bg-slate-200 text-[10px]">+</button>`;
    if(!assignedInLoc && assignedGlobal) statusIcon = `<button onclick="quickAssign('${r.id}')" class="w-5 h-5 rounded-full border bg-amber-100 hover:bg-amber-200 text-[10px]" title="Sudah ada di lokasi lain, boleh tambah di ${activeLocation} juga">+</button>`;
    const fbArr = getBoardArray(r.fields);
    const fb = fbArr[0] || '-';
    const fbDisplay = fbArr.length ? fbArr.join(', ') : '-';
    const pk = getPakejVal(r.fields) || '-';
    const trChecked = isTrainChecked(r.fields);
    const insArr = getInsuranArray(r.fields);
    let fbCls = 'bg-white border-slate-200';
    // Determine class based on first or combined
    if(fbArr.some(x=>x.includes('MEKAH'))) fbCls='bg-orange-100 border-orange-200 text-orange-800';
    else if(fbArr.some(x=>x.includes('MADINAH'))) fbCls='bg-blue-100 border-blue-200 text-blue-800';
    else if(fbArr.includes('FULLBOARD')) fbCls='bg-emerald-100 border-emerald-200 text-emerald-800';
    else if(fbArr.length===0) fbCls='bg-white border-dashed border-slate-300 text-slate-400';
    const boardOptions = ['FULLBOARD','FULLBOARD (MEKAH)','BB (MEKAH)','FULLBOARD (MADINAH)','BB (MADINAH)'];
    const boardCheckboxes = boardOptions.map(opt=>{
      const checked = fbArr.includes(opt);
      return `<label class="flex items-center gap-1.5 px-2 py-1 hover:bg-slate-50 rounded text-[10px] cursor-pointer"><input type="checkbox" ${checked?'checked':''} onchange="toggleBoardMulti('${r.id}','${opt}')" class="w-3 h-3 accent-[#7A0C2E]"> ${opt}</label>`;
    }).join('');
    

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
      <div class="col-span-2 flex items-center gap-0.5 relative">
        <div class="relative w-full">
          <button onclick="event.stopPropagation(); toggleBoardDropdown('${r.id}')" class="text-[8px] border rounded-full px-2 py-1 font-bold ${fbCls} outline-none w-full truncate text-left flex items-center justify-between bg-white opacity-100" style="opacity:1; isolation:isolate;" title="BOARD BASIS - klik untuk pilih 2">
            <span class="truncate">${fbDisplay}</span><span class="ml-1">▼</span>
          </button>
          <div id="boardDrop-${r.id}" class="hidden absolute left-0 top-full mt-1 w-[190px] bg-white border border-slate-200 rounded-xl shadow-xl z-[9999] p-1" style="background:#ffffff !important; opacity:1 !important; isolation:isolate;">
            ${boardCheckboxes}
            <div class="border-t border-slate-100 mt-1 pt-1 flex justify-between">
              <button onclick="clearBoardMulti('${r.id}'); closeBoardDropdown('${r.id}')" class="text-[8px] px-2 py-0.5 rounded-full bg-slate-100">Clear</button>
              <button onclick="closeBoardDropdown('${r.id}')" class="text-[8px] px-2 py-0.5 rounded-full bg-[#7A0C2E] text-white">OK</button>
            </div>
            <div class="text-[7px] text-slate-400 px-2 mt-1">Boleh pilih 2: BB (MEKAH) + FB (MADINAH)</div>
          </div>
        </div>
      </div>
      <div class="col-span-1 text-center">
        <input type="checkbox" ${trChecked?'checked':''} onchange="updateJemaahCheckbox('${r.id}','TRAIN',this.checked)" class="w-3.5 h-3.5 accent-[#7A0C2E] rounded" title="TRAIN">
      </div>
      <div class="col-span-3 flex items-center gap-0.5 flex-wrap justify-center">
        ${insToggle}
      </div>
      <div class="col-span-1 flex items-center gap-0.5" id="pakejCellWrapper-${r.id}">
        <div id="pakejCell-${r.id}" class="w-full"></div><select style="display:none" onchange="updateJemaahField('${r.id}','PAKEJ',this.value)" class="text-[9px] border border-slate-200 rounded-full px-2 py-1 bg-white">
          <option value="-" ${pk==='-'?'selected':''}>-</option>
          <option value="JIMAT STANDARD" ${pk==='JIMAT STANDARD'?'selected':''}>JIMAT STANDARD</option>
          <option value="JIMAT PREMIUM" ${pk==='JIMAT PREMIUM'?'selected':''}>JIMAT PREMIUM</option>
          <option value="EKONOMI LITE" ${pk==='EKONOMI LITE'?'selected':''}>EKONOMI LITE</option>
          <option value="EKONOMI" ${pk==='EKONOMI'?'selected':''}>EKONOMI</option>
          <option value="STANDARD" ${pk==='STANDARD'?'selected':''}>STANDARD</option>
          <option value="PREMIUM" ${pk==='PREMIUM'?'selected':''}>PREMIUM</option>
          <option value="PREMIUM PLUS" ${pk==='PREMIUM PLUS'?'selected':''}>PREMIUM PLUS</option>
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
    const nl = document.getElementById('namelistContainer');
    if(!nl) return;
    // Find left card - the 52% width card
    let leftCard = nl.closest('[class*="lg:w-"]');
    if(!leftCard) leftCard = nl.parentElement;
    // The outer left column wrapper is the parent of leftCard's parent? Actually structure: flex-col lg:flex-row > w-[52%] card
    if(leftCard){
      leftCard.style.position='sticky';
      leftCard.style.top='12px';
      leftCard.style.alignSelf='flex-start';
      leftCard.style.zIndex='20';
      leftCard.style.display='flex';
      leftCard.style.flexDirection='column';
      leftCard.style.backgroundColor='#ffffff';
      leftCard.style.maxHeight='calc(100vh - 16px)';
      leftCard.style.overflow='hidden';
      leftCard.style.borderRadius='16px';
    }
    nl.style.flex='1 1 auto';
    nl.style.maxHeight='48vh';
    nl.style.minHeight='220px';
    nl.style.overflowY='auto';
    nl.style.overflowX='hidden';
    nl.style.backgroundColor='#ffffff';
    const staffSec = document.getElementById('staffListContainer')?.parentElement;
    if(staffSec){
      staffSec.style.flex='0 0 auto';
      staffSec.style.backgroundColor='#ffffff';
      staffSec.style.borderTop='2px solid #e2e8f0';
      staffSec.style.display='flex';
      staffSec.style.flexDirection='column';
      staffSec.style.maxHeight='38vh';
      staffSec.style.overflow='hidden';
    }
    const staffCont = document.getElementById('staffListContainer');
    if(staffCont){
      staffCont.style.flex='1';
      staffCont.style.overflowY='auto';
      staffCont.style.overflowX='hidden';
      staffCont.style.backgroundColor='#ffffff';
    }
    const rg=document.getElementById('roomingGrid');
    if(rg){
      rg.style.overflow='visible';
      rg.style.maxHeight='none';
    }
    // Ensure parent flex row allows sticky
    const flexRow = leftCard?.parentElement;
    if(flexRow){
      flexRow.style.alignItems='flex-start';
    }
  }catch(e){ console.error('sticky fail', e); }
}


function filterRoomingNamelist(){ renderNamelist(); }

function renderRoomingGrid(){
  const grid=document.getElementById('roomingGrid'); if(!grid) return;
  let rooms=[...allRoomingRecords].filter(r=>(r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===activeLocation.toUpperCase());
  rooms=getRoomOrderedList(rooms);
  const bilikEl=document.getElementById('roomingBiliks'); if(bilikEl) bilikEl.textContent=rooms.length+' Bilik';
  const totalJ=rooms.reduce((s,r)=>s+(r.fields['JEMAAH']?.length||0),0);
  const totalBaby=rooms.reduce((s,r)=>s+(r.fields['JEMAAH TANPA KATIL']?.length||0),0);
  const totalJFull = totalJ + totalBaby;
  // Fix: count staff from both STAFF/EXTRA text field AND staffList linked records
  const staffFromText = rooms.reduce((s,r)=>s+(r.fields['STAFF / EXTRA']||'').split(',').filter(Boolean).length,0);
  const staffFromLinked = rooms.reduce((s,r)=>{ try{ return s+getStaffForRoom(r.id).length; }catch(e){ return s; } },0);
  const totalStaff = staffFromText + staffFromLinked;
  const occEl=document.getElementById('roomingOccupancy'); if(occEl) occEl.textContent=`${totalJFull} Jemaah + ${totalStaff} Staff • ${activeLocation}`;
  renderRoomingOverview(rooms);
  if(rooms.length===0){ grid.innerHTML=`<div class="col-span-2 p-6 text-center text-[11px] border border-dashed rounded-2xl bg-white">Tiada bilik untuk <b>${activeLocation}</b><br><button onclick="openNewRoomModal()" class="mt-2.5 px-3 py-1.5 bg-[#7A0C2E] text-white rounded-full text-[11px]">+ Bilik Baru untuk ${activeLocation}</button></div>`; return; }
  grid.innerHTML=rooms.map((rec, roomIdx)=>{
    const f=rec.fields; const roomId=f['Room ID / Nama Bilik']||generateRoomIdFromCap(f['KAPASITI']); const pakej=f['PAKEJ / HOTEL']||'EKONOMI'; const cap=f['KAPASITI']||4; const hotel=f['HOTEL NAME']||''; const staffForRoom=getStaffForRoom(rec.id); const staffArr=staffForRoom.map(s=>s.name); const jIds=f['JEMAAH']||[]; const count=jIds.length+staffArr.length;
    const jSlots=jIds.map(jId=>{ 
      const jRec=allRoomingJemaah.find(j=>j.id===jId); 
      const jName=getJemaahName(jRec?.fields);
      const fbArr=getBoardArray(jRec?.fields||{});
      const fb=fbArr.join(', ');
      const roomLoc = (f['LOKASI / CITY']||activeLocation||'').toUpperCase();
      let fbBadge='';
      if(fbArr.length>0){
        fbArr.forEach(raw=>{
          const up=raw.toUpperCase();
          let badge='';
          if(roomLoc==='MEKAH'){
            if(up.includes('MEKAH')) badge=`<span style="background:#FDE68A;border:1px solid #92400E;padding:2px 6px;border-radius:10px;font-weight:bold;font-size:7px;display:inline-block;margin:1px 2px;white-space:nowrap;">${raw}</span>`;
            else if(up==='FULLBOARD') badge=`<span style="background:#BBF7D0;border:1px solid #065F46;padding:2px 6px;border-radius:10px;font-weight:bold;font-size:7px;display:inline-block;margin:1px 2px;white-space:nowrap;" font-bold">FULLBOARD</span>`;
          } else if(roomLoc==='MADINAH'){
            if(up.includes('MADINAH')) badge=`<span style="background:#BFDBFE;border:1px solid #1E40AF;padding:2px 6px;border-radius:10px;font-weight:bold;font-size:7px;display:inline-block;margin:1px 2px;white-space:nowrap;" text-blue-900 border border-blue-300 rounded-full text-[8px] font-bold">${raw}</span>`;
            else if(up==='FULLBOARD') badge=`<span style="background:#BBF7D0;border:1px solid #065F46;padding:2px 6px;border-radius:10px;font-weight:bold;font-size:7px;display:inline-block;margin:1px 2px;white-space:nowrap;" font-bold">FULLBOARD</span>`;
          } else {
            if(up.includes('MEKAH') || up.includes('MADINAH') || up==='FULLBOARD') badge=`<span style="background:#BBF7D0;border:1px solid #065F46;padding:2px 6px;border-radius:10px;font-weight:bold;font-size:7px;display:inline-block;margin:1px 2px;white-space:nowrap;" font-bold">${raw}</span>`;
            else if(up.startsWith('BB')) badge=`<span class="ml-1 px-1.5 py-0.5 bg-orange-100 text-orange-800 border border-orange-200 rounded-full text-[8px] font-bold">${raw}</span>`;
          }
          fbBadge+=badge;
        });
      }
      return `<div class="flex items-center justify-between px-2.5 py-2 bg-slate-100 text-slate-800 border border-slate-200 rounded-xl text-[11px]"><span class="truncate font-medium flex items-center">${jName}${fbBadge}</span><button onclick="removeJemaahFromRoom('${rec.id}','${jId}')" class="ml-2 w-4 h-4 rounded-full bg-white hover:bg-slate-200 text-[10px]">✕</button></div>`; 
    }).join('');
    const sSlots=staffArr.map(s=>`<div class="flex items-center justify-between px-2.5 py-2 bg-[#FADBD8] text-[#7A0C2E] border border-[#F5B7B1] rounded-xl text-[11px]"><span class="truncate">👤 ${s}</span><button onclick="removeStaff('${rec.id}','${s.replace(/'/g,"\\'")}', event)" class="ml-2 w-4 h-4 rounded-full bg-white/70 text-[10px]">✕</button></div>`).join('');
    const jTanpaRaw = f['JEMAAH TANPA KATIL']||f['INFANT']||[];
    const staffTanpaLocal = (typeof getStaffTanpaKatilForRoom==='function'? getStaffTanpaKatilForRoom(rec.id) : (f['_STAFF_TANPA_KATIL']||[]));
    const combinedTanpa = [...new Set([...jTanpaRaw, ...staffTanpaLocal])];
    const tanpaKatilSlots = combinedTanpa.map(tId=>{
      const sRec = (typeof getStaffById==='function'? getStaffById(tId) : staffList.find(s=>s.id===tId||s.airtableId===tId));
      if(sRec){
        const sName=sRec.name||'Staff Unknown';
        return `<div class="flex items-center justify-between px-2.5 py-2 bg-[#FADBD8] text-[#7A0C2E] border border-[#F5B7B1] rounded-xl text-[11px] mt-1"><span class="truncate font-medium flex items-center gap-1">👤 ${sName} <span class="text-[8px] bg-white/50 px-1.5 py-0.5 rounded-full">STAFF TANPA KATIL</span></span><button onclick="removeStaffTanpaKatilFromRoom('${rec.id}','${tId}')" class="ml-2 w-4 h-4 rounded-full bg-white hover:bg-red-50 text-[10px]">✕</button></div>`;
      } else {
        const jRec=allRoomingJemaah.find(j=>j.id===tId);
        const jName=jRec? getJemaahName(jRec.fields) : null;
        if(!jName){
          return `<div class="flex items-center justify-between px-2.5 py-2 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-[11px] mt-1"><span class="truncate font-medium">⚠️ ID ${tId.substring(0,8)}... tak jumpa </span><button onclick="removeTanpaKatilFromRoom('${rec.id}','${tId}')" class="ml-2 w-4 h-4 rounded-full bg-white hover:bg-slate-200 text-[10px]">✕</button></div>`;
        }
        return `<div class="flex items-center justify-between px-2.5 py-2 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-[11px] mt-1"><span class="truncate font-medium">👶 ${jName}</span><button onclick="removeTanpaKatilFromRoom('${rec.id}','${tId}')" class="ml-2 w-4 h-4 rounded-full bg-white hover:bg-slate-200 text-[10px]">✕</button></div>`;
      }
    }).join('');
const emptyCount=Math.max(0,cap-count); const emptySlots=Array.from({length:emptyCount}).map((_,i)=>`<div ondragover="allowDrop(event)" ondrop="dropJemaah(event,'${rec.id}')" class="px-2.5 py-2 border border-dashed border-slate-300 rounded-xl text-[10px] text-slate-400 text-center">Slot Kosong ${count+i+1}</div>`).join('');
    const localCatatan = (typeof loadLocalCatatan==='function'? loadLocalCatatan(rec.id) : '') || '';
    const catatanVal = f['CATATAN BILIK'] || f['CATATAN'] || f['NOTES'] || f['REMARK'] || localCatatan || '';
    const catatanField = `<div class="mt-2"><div class="text-[8px] font-bold text-slate-500 mb-1">CATATAN BILIK</div><textarea id="catatan-${rec.id}" placeholder="Catatan bilik..." onblur="updateRoomCatatan('${rec.id}', this.value)" oninput="clearTimeout(window._catatanTimer); window._catatanTimer=setTimeout(()=>updateRoomCatatan('${rec.id}', this.value), 1000)" class="w-full text-[10px] px-2.5 py-1.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-[#7A0C2E]/30 resize-none" rows="2">${catatanVal}</textarea></div>`;
    return `<div data-room-id="${rec.id}" data-sort="${f['SORT ORDER']||0}" ondragover="allowDropRoom(event)" ondragleave="handleRoomDragLeave(event)" ondrop="dropJemaah(event,'${rec.id}'); dropRoomReorder(event,'${rec.id}')" class="bg-white rounded-2xl border border-slate-200 p-2.5 shadow-sm flex flex-col gap-2 h-fit">
      <div class="flex items-center justify-between gap-1.5">
        <div class="flex items-center gap-1.5 flex-1 min-w-0">
          <button class="w-6 h-6 rounded-full bg-slate-100 border flex items-center justify-center cursor-grab shrink-0" draggable="true" ondragstart="handleRoomDragStart(event,'${rec.id}')" ondragend="handleRoomDragEnd(event)"><i class="fa-solid fa-grip-lines text-[9px]"></i></button>
          <span class="flex items-center gap-1.5 shrink-0"><span class="w-5 h-5 rounded-full bg-[#7A0C2E] text-white flex items-center justify-center text-[9px] font-bold">${roomIdx+1}</span><span class="font-bold text-[11px]">${roomId}</span></span>
          <input id="hotelInput-${rec.id}" value="${hotel}" placeholder="Nama Hotel" onchange="updateHotelInline('${rec.id}', this.value)" onfocus="this.select()" class="flex-1 min-w-0 px-2 py-1 bg-slate-50 border border-slate-200 rounded-full text-[11px] font-bold truncate focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#7A0C2E]/30" title="Klik untuk tukar nama hotel">
        </div>
        <button onclick="deleteRoom('${rec.id}','${roomId}')" class="w-6 h-6 rounded-full bg-slate-50 hover:bg-red-50 border text-[10px] shrink-0"><i class="fa-solid fa-trash"></i></button>
      </div>
      <div class="flex items-center gap-1.5 text-[10px]">
        <div class="flex items-center gap-1 px-2.5 py-1 bg-slate-50 rounded-full border"><div id="hotelPakejContainer-${rec.id}" data-pakej="${pakej}" class="hotelPakejWrapper"></div><select style="display:none" onchange="updateRoomField('${rec.id}','PAKEJ / HOTEL',this.value)" class="text-[10px] border border-slate-200 rounded-full px-2 py-1 bg-white font-bold">
          <option value="JIMAT STANDARD" ${pakej==='JIMAT STANDARD'?'selected':''}>JIMAT STANDARD</option>
          <option value="JIMAT PREMIUM" ${pakej==='JIMAT PREMIUM'?'selected':''}>JIMAT PREMIUM</option>
          <option value="EKONOMI LITE" ${pakej==='EKONOMI LITE'?'selected':''}>EKONOMI LITE</option>
          <option value="EKONOMI" ${pakej==='EKONOMI'?'selected':''}>EKONOMI</option>
          <option value="STANDARD" ${pakej==='STANDARD'?'selected':''}>STANDARD</option>
          <option value="PREMIUM" ${pakej==='PREMIUM'?'selected':''}>PREMIUM</option>
          <option value="PREMIUM PLUS" ${pakej==='PREMIUM PLUS'?'selected':''}>PREMIUM PLUS</option>
        </select></div>
        <div class="ml-auto flex items-center gap-1 bg-slate-50 rounded-full px-1 py-0.5 border"><button onclick="updateCap('${rec.id}',-1)" class="w-5 h-5 rounded-full bg-white border text-[10px]">−</button><span class="font-bold w-4 text-center text-[11px]">${cap}</span><button onclick="updateCap('${rec.id}',1)" class="w-5 h-5 rounded-full bg-white border text-[10px]">+</button><span class="text-[9px] ml-1">${count}/${cap}</span></div>
      </div>
      <div class="space-y-1">${jSlots}${sSlots}${emptySlots}${tanpaKatilSlots?`<div class="pt-2 mt-2 border-t border-dashed border-amber-300"><div class="text-[8px] font-bold text-amber-700 mb-1">TANPA KATIL / INFANT</div>${tanpaKatilSlots}</div>`:''}</div>
      <button onclick="openTanpaKatilModal('${rec.id}')" class="mt-2 w-full py-2 bg-amber-50 hover:bg-amber-100 border border-amber-300 border-dashed text-amber-800 rounded-xl text-[10px] font-bold">+ Kanak-kanak / Infant (Tanpa Katil)</button>
      ${catatanField}
      <div class="h-1 bg-slate-100 rounded-full overflow-hidden mt-2"><div class="h-full bg-[#7A0C2E]" style="width:${Math.min(100,(count/cap)*100)}%"></div></div>
    </div>`;
  }).join('');
}



function renderStaffList(){
  const cont=document.getElementById('staffListContainer'); const badge=document.getElementById('staffTotalBadge'); if(!cont) return; if(badge) badge.textContent=staffList.length+' Staff';
  if(staffList.length===0){ cont.innerHTML='<div class="p-2.5 text-center text-[11px] text-slate-400">Tiada staff / extra</div>'; return; }
  cont.innerHTML=staffList.map((s,idx)=>{
    const assignedInLoc=isStaffAssignedInLocation(s.id, activeLocation);
    const cls=assignedInLoc?'bg-slate-100 text-slate-400 border-slate-200':'bg-white hover:bg-slate-50 cursor-grab border-slate-200'; // V102 FIX GHOST - no opacity
    const drag=assignedInLoc?'':`draggable="true" ondragstart="dragStaff(event,'${s.id}')" ondragend="dragStaffEnd(event)"`;
    const boardArr=(typeof getStaffBoardArray==='function'? getStaffBoardArray(s) : []);
    const boardDisplay = boardArr.length? boardArr.join(', ') : '- BOARD';
    const boardCls = boardArr.length? 'bg-emerald-100 border-emerald-200 text-emerald-800' : 'bg-white border-slate-200';
    const trainChecked = !!(s.train||s.fields?.TRAIN);
    const trainCls = trainChecked ? 'bg-amber-300 border-amber-600 text-amber-900' : 'bg-white border-slate-300';
    const staffId = s.id||s.airtableId;
    const boardOptions = ['FULLBOARD','FULLBOARD (MEKAH)','FULLBOARD (MADINAH)','BB (MEKAH)','BB (MADINAH)'];
    const boardDropHtml = boardOptions.map(opt=>`<label class="flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-50 cursor-pointer text-[11px]"><input type="checkbox" ${boardArr.includes(opt)?'checked':''} onchange="toggleStaffBoardMulti('${staffId}','${opt}')" class="w-3.5 h-3.5 accent-[#7A0C2E]"> ${opt}</label>`).join('');
    return `<div ${drag} class="flex flex-col gap-1.5 px-2.5 py-2 rounded-xl border text-[11px] ${cls} relative">
      <div class="flex items-center justify-between">
        <div class="flex gap-2 items-center"><span class="text-slate-400 text-[10px]">${String(idx+1).padStart(2,'0')}</span><span class="font-medium truncate max-w-[120px]">${s.name}</span>${assignedInLoc?'<span class="ml-1 px-1 py-0.5 bg-slate-200 rounded text-[8px]">ASSIGNED di '+activeLocation+'</span>':''}</div>
        <div class="flex gap-1"><button onclick="quickAssignStaff('${staffId}')" class="w-5 h-5 rounded-full border ${assignedInLoc?'opacity-30 pointer-events-none':'hover:bg-[#7A0C2E] hover:text-white'} text-[10px]">+</button><button onclick="deleteStaff('${staffId}')" class="w-5 h-5 rounded-full border hover:bg-red-50 text-[10px]"><i class="fa-solid fa-trash text-[9px]"></i></button></div>
      </div>
      <div class="flex items-center gap-2">
        <div class="relative flex-1">
          <button onclick="toggleStaffDropdown('${staffId}')" class="w-full text-[8px] border rounded-full px-2.5 py-1.5 font-bold ${boardCls} text-left flex items-center justify-between opacity-100"><span class="truncate">${boardDisplay}</span><span class="ml-1">▼</span></button>
          <div id="staffBoardDrop-${staffId}" class="hidden absolute z-[9999] mt-1 w-56 bg-white border border-slate-300 rounded-xl shadow-2xl p-1 max-h-52 overflow-auto" style="background:#ffffff !important; opacity:1 !important; isolation:isolate;">
            ${boardDropHtml}
            <div class="flex justify-between gap-1 mt-1 pt-1 border-t bg-white"><button onclick="clearStaffBoardMulti('${staffId}'); closeStaffDropdown('${staffId}')" class="text-[9px] px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200">Clear</button><button onclick="closeStaffDropdown('${staffId}')" class="text-[9px] px-3 py-1 rounded-full bg-[#7A0C2E] text-white hover:bg-[#9d174d]">OK</button></div>
          </div>
        </div>
        <label class="flex items-center gap-1 text-[8px] border rounded-full px-2.5 py-1.5 cursor-pointer font-bold ${trainCls} shrink-0 opacity-100"><input type="checkbox" ${trainChecked?'checked':''} onchange="updateStaffTrain('${staffId}',this.checked)" class="w-3.5 h-3.5 accent-amber-600"> TRAIN</label>
      </div>
    </div>`;
  }).join('');
}





function setActiveLocation(loc){ activeLocation=loc.toUpperCase(); localStorage.setItem('effah_active_location',activeLocation); const el=document.getElementById('copyTargetLoc'); if(el) el.textContent=activeLocation; renderLocationTabs(); renderRoomingGrid(); renderNamelist(); renderStaffList(); }
function _stopAutoScroll(){ if(_autoScrollInterval){ clearInterval(_autoScrollInterval); _autoScrollInterval=null; } }
function _startAutoScroll(){
  if(_autoScrollInterval) return;
  _autoScrollInterval=setInterval(()=>{
    const y=window._lastDragY||0;
    if(y<140){ window.scrollBy(0, -22); document.documentElement.scrollTop-=22; }
    else if(y>window.innerHeight-140){ window.scrollBy(0, 22); document.documentElement.scrollTop+=22; }
    // also scroll left panels if near edge
    const nl=document.getElementById('namelistContainer');
    const sl=document.getElementById('staffListContainer');
    const grid=document.getElementById('roomingGrid');
    if(nl){
      const rect=nl.getBoundingClientRect();
      if(y>rect.top && y<rect.bottom){
        if(y-rect.top<80) nl.scrollBy(0,-12);
        else if(rect.bottom-y<80) nl.scrollBy(0,12);
      }
    }
    if(grid){
      const rect=grid.getBoundingClientRect();
      if(y>rect.top){
        if(y>window.innerHeight-140) grid.scrollBy ? grid.scrollBy(0,10) : null;
      }
    }
  }, 30);
}
function allowDrop(e){ e.preventDefault(); window._lastDragY=e.clientY; _startAutoScroll(); }
document.addEventListener('dragover', (e)=>{ window._lastDragY=e.clientY; _startAutoScroll(); });
document.addEventListener('dragend', ()=>{ _stopAutoScroll(); });
document.addEventListener('drop', ()=>{ _stopAutoScroll(); });
function dragJemaah(e,jId){ if(isJemaahAssignedInLocation(jId, activeLocation)) return; e.dataTransfer.setData('text/plain',jId); const r=e.currentTarget; if(r) setTimeout(()=>r.style.opacity='0.3',0); }
function dragEnd(e){ e.currentTarget.style.opacity='1'; }

function dragRoom(e,roomId){
  e.dataTransfer.setData('text/room-id', roomId);
  e.dataTransfer.effectAllowed='move';
  const el=e.currentTarget.closest('[data-room-id]');
  if(el) setTimeout(()=>el.style.opacity='0.4',0);
}
function dragStaff(e, staffId){
  e.dataTransfer.setData('text/plain', staffId);
  e.dataTransfer.setData('application/x-staff-id', staffId);
  e.dataTransfer.effectAllowed='move';
  window._draggedStaffId=staffId;
  if(e.target) e.target.style.opacity='0.5';
  console.log('dragStaff', staffId);
}
function dropStaffToRoom(e, roomId, isTanpaKatil){
  e.preventDefault();
  const staffId = e.dataTransfer.getData('application/x-staff-id') || e.dataTransfer.getData('text/plain') || window._draggedStaffId;
  console.log('dropStaffToRoom', staffId, 'to', roomId, 'tanpa', isTanpaKatil);
  if(!staffId) return;
  // Check if it's actually staff (exists in staffList)
  const isStaff = staffList.some(s=>s.id===staffId||s.airtableId===staffId);
  if(isStaff){
    if(isTanpaKatil){
      assignStaffAsTanpaKatil(staffId, roomId);
    } else {
      quickAssignStaffToRoom(staffId, roomId);
    }
  } else {
    // Might be jemaah dropped as staff? Handle as jemaah
    const jemaahId=staffId;
    if(isTanpaKatil) assignJemaahAsTanpaKatil(jemaahId, roomId);
    else quickAssignToRoom(jemaahId, roomId);
  }
  window._draggedStaffId=null;
}
function assignStaffAsTanpaKatil(staffId, roomId){
  const room = allRoomingRecords.find(r=>r.id===roomId);
  if(!room) return;
  const existingJTanpa = room.fields['JEMAAH TANPA KATIL']||[];
  const existingStaff = room.fields['STAFF LIST (ROOMING)']||[];
  const existingStaffText = room.fields['STAFF / EXTRA']||'';
  
  if(existingJTanpa.includes(staffId)){
    console.log('Staff already tanpa katil in this room', staffId);
    return; // already there
  }
  // FIX V90: If staff already exists as regular staff in same room, move him to tanpa katil (allow many staff per room)
  if(existingStaff.includes(staffId)){
    console.log('Staff already regular in this room, moving to tanpa katil', staffId);
    // Remove from regular staff list
    room.fields['STAFF LIST (ROOMING)'] = existingStaff.filter(id=>id!==staffId);
    // Also update staffList roomIds
    const s=getStaffById(staffId);
    if(s && s.roomIds) s.roomIds = s.roomIds.filter(rid=>rid!==roomId);
    // Continue to add as tanpa katil (don't block)
  }
  // Also check if staff name exists in STAFF / EXTRA text field
  if(existingStaffText.includes(staffId)){
    // try to remove from text field
    room.fields['STAFF / EXTRA'] = existingStaffText.split(',').filter(x=>x.trim()!==staffId).join(',');
  }
  
  // Store in local mapping for tanpa katil staff (allows many staff per room)
  const key='effah_staff_tanpa_'+roomId;
  let staffTanpaList=[];
  try{ staffTanpaList=JSON.parse(localStorage.getItem(key)||'[]'); }catch(e){ staffTanpaList=[]; }
  if(!staffTanpaList.includes(staffId)) staffTanpaList.push(staffId);
  try{ localStorage.setItem(key, JSON.stringify(staffTanpaList)); }catch(e){}
  
  if(!room.fields['_STAFF_TANPA_KATIL']) room.fields['_STAFF_TANPA_KATIL']=[];
  if(!room.fields['_STAFF_TANPA_KATIL'].includes(staffId)) room.fields['_STAFF_TANPA_KATIL'].push(staffId);
  
  const newList = [...existingJTanpa.filter(id=>id!==staffId), staffId];
  room.fields['JEMAAH TANPA KATIL']=newList;
  renderRoomingGrid();
  
  const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base')||localStorage.getItem('effah_base_id'); const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
  if(base&&pat){
    // Save both regular staff removal and tanpa katil addition
    const payload={};
    payload['STAFF LIST (ROOMING)']=room.fields['STAFF LIST (ROOMING)']||[];
    // Try JEMAAH TANPA KATIL first
    payload['JEMAAH TANPA KATIL']=newList;
    fetch(`https://api.airtable.com/v0/${base}/ROOMING%20LIST/${roomId}`,{method:'PATCH',headers:{Authorization:`Bearer ${pat}`,'Content-Type':'application/json'},body:JSON.stringify({fields: payload})}).then(r=>r.json()).then(data=>{
      console.log('V90 staff moved to tanpa katil', data);
      if(data.error){
        console.warn('JEMAAH TANPA KATIL cannot accept staff ID, saving to STAFF TANPA KATIL field');
        // Save to custom field STAFF TANPA KATIL
        fetch(`https://api.airtable.com/v0/${base}/ROOMING%20LIST/${roomId}`,{method:'PATCH',headers:{Authorization:`Bearer ${pat}`,'Content-Type':'application/json'},body:JSON.stringify({fields:{'STAFF TANPA KATIL': staffTanpaList, 'STAFF LIST (ROOMING)': room.fields['STAFF LIST (ROOMING)']||[]}})}).then(r=>r.json()).then(d2=>{ console.log('saved to STAFF TANPA KATIL', d2); });
      }
    }).catch(err=>{ console.error(err); });
  }
  const s=getStaffById(staffId);
  if(s){ 
    if(!s.roomIds) s.roomIds=[];
    if(!s.roomIds.includes(roomId)) s.roomIds.push(roomId);
  }
  console.log('V90 Staff assigned as tanpa katil (many staff per room allowed)', staffId, 'to', roomId);
}
function getStaffTanpaKatilForRoom(roomId){
  try{
    const key='effah_staff_tanpa_'+roomId;
    return JSON.parse(localStorage.getItem(key)||'[]');
  }catch(e){ return []; }
}
function removeStaffTanpaKatilFromRoom(roomId, staffId){
  const room=allRoomingRecords.find(r=>r.id===roomId);
  if(room){
    const key='effah_staff_tanpa_'+roomId;
    let list=[];
    try{ list=JSON.parse(localStorage.getItem(key)||'[]'); }catch(e){ list=[]; }
    list=list.filter(id=>id!==staffId);
    try{ localStorage.setItem(key, JSON.stringify(list)); }catch(e){}
    if(room.fields['_STAFF_TANPA_KATIL']) room.fields['_STAFF_TANPA_KATIL']=room.fields['_STAFF_TANPA_KATIL'].filter(id=>id!==staffId);
    if(room.fields['JEMAAH TANPA KATIL']) room.fields['JEMAAH TANPA KATIL']=room.fields['JEMAAH TANPA KATIL'].filter(id=>id!==staffId);
    // FIX V91: Also remove from staffList roomIds so staff becomes unassigned, not move to regular
    const sRec = (typeof getStaffById==='function'? getStaffById(staffId) : staffList.find(s=>s.id===staffId||s.airtableId===staffId));
    if(sRec && sRec.roomIds){
      sRec.roomIds = sRec.roomIds.filter(rid=>rid!==roomId);
      // Also remove from ROOMING LIST STAFF LIST field if exists
      if(room.fields['STAFF LIST (ROOMING)']) room.fields['STAFF LIST (ROOMING)']=room.fields['STAFF LIST (ROOMING)'].filter(id=>id!==staffId);
    }
    renderRoomingGrid();
    renderStaffList();
    const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base')||localStorage.getItem('effah_base_id'); const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
    if(base&&pat){
      fetch(`https://api.airtable.com/v0/${base}/ROOMING%20LIST/${roomId}`,{method:'PATCH',headers:{Authorization:`Bearer ${pat}`,'Content-Type':'application/json'},body:JSON.stringify({fields:{'JEMAAH TANPA KATIL': room.fields['JEMAAH TANPA KATIL']||[], 'STAFF LIST (ROOMING)': room.fields['STAFF LIST (ROOMING)']||[], 'STAFF TANPA KATIL': list}})}).catch(()=>{});
    }
  }
}
function removeTanpaKatilFromRoom(roomId, jId){
  const room=allRoomingRecords.find(r=>r.id===roomId);
  if(!room) return;
  const current=room.fields['JEMAAH TANPA KATIL']||[];
  const newList=current.filter(id=>id!==jId);
  room.fields['JEMAAH TANPA KATIL']=newList;
  renderRoomingGrid();
  const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base')||localStorage.getItem('effah_base_id'); const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
  if(base&&pat){
    fetch(`https://api.airtable.com/v0/${base}/ROOMING%20LIST/${roomId}`,{method:'PATCH',headers:{Authorization:`Bearer ${pat}`,'Content-Type':'application/json'},body:JSON.stringify({fields:{'JEMAAH TANPA KATIL': newList}})}).catch(()=>{});
  }
}


function quickAssignStaffToRoom(staffId, roomId){
  // Existing quickAssignStaff but with specific room
  if(typeof quickAssignStaff==='function' && !roomId){
    return quickAssignStaff(staffId);
  }
  const room = allRoomingRecords.find(r=>r.id===roomId);
  if(!room) return;
  // Add to STAFF / EXTRA or linked staff field
  // Try to use linked staff field if exists
  const staffField = (room.fields['STAFF LIST (ROOMING)']!==undefined) ? 'STAFF LIST (ROOMING)' : 'STAFF / EXTRA';
  if(staffField==='STAFF LIST (ROOMING)'){
    const current = room.fields[staffField]||[];
    if(current.includes(staffId)) { console.log('staff already in this room', staffId); return; }
    const newList=[...current, staffId];
    room.fields[staffField]=newList;
    renderRoomingGrid();
    const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base')||localStorage.getItem('effah_base_id'); const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
    if(base&&pat){
      fetch(`https://api.airtable.com/v0/${base}/ROOMING%20LIST/${roomId}`,{method:'PATCH',headers:{Authorization:`Bearer ${pat}`,'Content-Type':'application/json'},body:JSON.stringify({fields:{[staffField]: newList}})}).catch(()=>{});
    }
  } else {
    // Fallback to quickAssignStaff which auto finds room
    if(typeof quickAssignStaff==='function') quickAssignStaff(staffId);
  }
}
// Override drop handlers to accept staff
var _origDropJemaahToRoom = window._origDropJemaahToRoom || (typeof dropJemaahToRoom==='function'? dropJemaahToRoom : null);
function dropJemaahToRoom(e, roomId, isTanpaKatil){
  const staffId = e.dataTransfer.getData('application/x-staff-id') || window._draggedStaffId;
  if(staffId){
    return dropStaffToRoom(e, roomId, isTanpaKatil);
  }
  if(_origDropJemaahToRoom) return _origDropJemaahToRoom(e, roomId, isTanpaKatil);
  // Fallback original logic
  e.preventDefault();
  const jemaahId = e.dataTransfer.getData('text/plain') || window._draggedJemaahId;
  if(!jemaahId) return;
  if(isTanpaKatil) assignJemaahAsTanpaKatil(jemaahId, roomId);
  else quickAssignToRoom(jemaahId, roomId);
}

function dragRoomEnd(e){
  const el=e.currentTarget.closest('[data-room-id]');
  if(el) el.style.opacity='1';
  _stopAutoScroll();
}
function allowDropRoom(e){ e.preventDefault(); window._lastDragY=e.clientY; _startAutoScroll(); e.currentTarget.classList.add('ring-2','ring-amber-300'); }
function leaveDropRoom(e){ e.currentTarget.classList.remove('ring-2','ring-amber-300'); }
async function dropRoom(e,targetRoomId){
  e.preventDefault();
  e.currentTarget.classList.remove('ring-2','ring-amber-300');
  _stopAutoScroll();
  const srcId=e.dataTransfer.getData('text/room-id');
  if(!srcId || srcId===targetRoomId) return;
  // Swap SORT ORDER
  const srcRec=allRoomingRecords.find(r=>r.id===srcId);
  const tgtRec=allRoomingRecords.find(r=>r.id===targetRoomId);
  if(!srcRec||!tgtRec) return;
  const srcOrder=srcRec.fields['SORT ORDER']||0;
  const tgtOrder=tgtRec.fields['SORT ORDER']||0;
  // Optimistic UI
  srcRec.fields['SORT ORDER']=tgtOrder;
  tgtRec.fields['SORT ORDER']=srcOrder;
  renderRoomingGrid();
  // Save to Airtable
  const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base')||localStorage.getItem('effah_base_id');
  const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
  try{
    await fetch(`https://api.airtable.com/v0/${base}/ROOMING%20LIST/${srcId}`,{method:'PATCH',headers:{Authorization:`Bearer ${pat}`,'Content-Type':'application/json'},body:JSON.stringify({fields:{'SORT ORDER':tgtOrder}})});
    await fetch(`https://api.airtable.com/v0/${base}/ROOMING%20LIST/${targetRoomId}`,{method:'PATCH',headers:{Authorization:`Bearer ${pat}`,'Content-Type':'application/json'},body:JSON.stringify({fields:{'SORT ORDER':srcOrder}})});
  }catch(err){ console.error('swap room order failed',err); }
}

function dropJemaah(e,roomId){
  e.preventDefault(); e.currentTarget.classList.remove('ring-2','ring-[#7A0C2E]/20');
  document.querySelectorAll('[draggable="true"]').forEach(el=>el.style.opacity='1');
  const staffId=e.dataTransfer.getData('text/staff-id'); const jId=e.dataTransfer.getData('text/plain');
  const id=staffId||jId; if(!id) return;
  const rec=allRoomingRecords.find(r=>r.id===roomId);
  if(rec){
    const cap=rec.fields['KAPASITI']||4;
    const curCount=(rec.fields['JEMAAH']||[]).length + getStaffForRoom(rec.id).length;
    if(curCount>=cap && !staffId){
      alert('Bilik Penuh\n\nBilik '+(rec.fields['Room ID / Nama Bilik']||roomId)+' telah mencapai kapasiti maksimum ('+curCount+'/'+cap+').\nSila pilih bilik lain.');
      const el=document.querySelector(`[data-room-id="${roomId}"]`);
      if(el){ el.classList.add('ring-2','ring-red-400'); setTimeout(()=>el.classList.remove('ring-2','ring-red-400'),800); }
      return;
    }
  }
  if(staffList.some(s=>s.id===id) || id.startsWith('staff_')){ assignStaffToRoom(id,roomId); }
  else { if(!isJemaahAssignedInLocation(id, activeLocation)) assignJemaahToRoom(id,roomId); }
}
function quickAssign(jId){ if(isJemaahAssignedInLocation(jId, activeLocation)) return; const rooms=allRoomingRecords.filter(r=>(r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===activeLocation); const target=rooms.find(r=>{ const j=r.fields['JEMAAH']?.length||0; const s=(r.fields['STAFF / EXTRA']||'').split(',').filter(Boolean).length; return (j+s)<(r.fields['KAPASITI']||4); }); if(target) assignJemaahToRoom(jId,target.id); }
function removeJemaahFromCurrentLoc(jId){
  const rec = allRoomingRecords.find(r=>(r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===activeLocation && (r.fields['JEMAAH']||[]).includes(jId));
  if(rec) removeJemaahFromRoom(rec.id, jId);
}
async function assignJemaahToRoom(jId,roomId){ 
  if(isJemaahAssignedInLocation(jId, activeLocation)) return; 
  const rec=allRoomingRecords.find(r=>r.id===roomId); if(!rec) return;
  const cap=rec.fields['KAPASITI']||4;
  const curCount=(rec.fields['JEMAAH']||[]).length + getStaffForRoom(rec.id).length;
  if(curCount>=cap){ 
    alert('Bilik '+ (rec.fields['Room ID / Nama Bilik']||rec.id) +' sudah penuh ('+curCount+'/'+cap+'). Tidak boleh tambah jemaah lagi.');
    // shake animation
    const el=document.querySelector(`[data-room-id="${roomId}"]`);
    if(el){ el.classList.add('ring-2','ring-red-400'); setTimeout(()=>el.classList.remove('ring-2','ring-red-400'),800); }
    return; 
  }
  await updateRoomField(roomId,'JEMAAH',[...(rec.fields['JEMAAH']||[]),jId],true); 
}
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
  const rec=allRoomingJemaah.find(r=>r.id===jemaahId);
  if(rec){ rec.fields[field]=value; }
  // Optimistic UI already updated
  try{
    let payloadValue = value;
    // FIX for Airtable Multiple Select fields: INSURAN, BOARD BASIS, BOARD
    if(field==='INSURAN'){
      if(Array.isArray(value)) payloadValue = value.length?value:null;
      else if(typeof value==='string' && value.trim()!==''){
        payloadValue = value.split(',').map(s=>s.trim()).filter(Boolean);
        if(payloadValue.length===0) payloadValue=null;
      } else payloadValue=null;
    }
    if(field==='BOARD BASIS' || field==='BOARD'){
      if(Array.isArray(value)) payloadValue = value.length?value:null;
      else if(typeof value==='string' && value.includes(',')){
        payloadValue = value.split(',').map(s=>s.trim()).filter(Boolean);
      }
    }
    // If null, send empty array for  select to clear? Airtable needs null to clear  select
    const fieldsToSend = {};
    if(payloadValue===null || (Array.isArray(payloadValue) && payloadValue.length===0)){
      // For  select, sending [] or null clears, but Airtable docs: use [] to clear? Use null
      fieldsToSend[field] = field==='INSURAN' || field==='BOARD BASIS' ? [] : '';
    } else {
      fieldsToSend[field] = payloadValue;
    }
    console.log('V83 updateJemaahField', jemaahId, field, '->', fieldsToSend[field]);
    const res=await fetch(`https://api.airtable.com/v0/${base}/DATA%20JEMAAH%20UMRAH/${jemaahId}`,{method:'PATCH',headers:{Authorization:`Bearer ${pat}`,'Content-Type':'application/json'},body:JSON.stringify({fields: fieldsToSend})});
    const data=await res.json();
    if(data.error){
      console.error('Airtable update error', data.error);
      throw new Error(data.error.message + ' (field: '+field+', type: '+data.error.type+')');
    }
  }catch(e){ console.error(e); alert('Gagal update jemaah '+field+': '+e.message+'\n\nPastikan field '+field+' di Airtable adalah Multiple Select (bukan Single Select). Jika Single Select, tukar ke Multiple Select dulu.'); if(typeof fetchRoomingData==='function') fetchRoomingData(); }
}


async function updateJemaahBoardMulti(jemaahId, selectedArr){
  const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base')||localStorage.getItem('effah_base_id'); const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
  if(!base||!pat) return alert('Airtable config missing');
  const rec=allRoomingJemaah.find(r=>r.id===jemaahId); if(!rec) return;
  rec.fields['BOARD BASIS']=selectedArr;
  rec.fields['BOARD']=selectedArr.join(', ');
  renderNamelist();
  try{
    // Try save as array (for  select field)
    let res=await fetch(`https://api.airtable.com/v0/${base}/DATA%20JEMAAH%20UMRAH/${jemaahId}`,{method:'PATCH',headers:{Authorization:`Bearer ${pat}`,'Content-Type':'application/json'},body:JSON.stringify({fields: {'BOARD BASIS': selectedArr.length?selectedArr:null}})});
    let data=await res.json();
    if(data.error){
      console.warn('BOARD BASIS array save failed, trying string', data.error);
      // Fallback save as string in BOARD field
      res=await fetch(`https://api.airtable.com/v0/${base}/DATA%20JEMAAH%20UMRAH/${jemaahId}`,{method:'PATCH',headers:{Authorization:`Bearer ${pat}`,'Content-Type':'application/json'},body:JSON.stringify({fields: {'BOARD': selectedArr.join(', ')}})});
      data=await res.json();
      if(data.error) throw new Error(data.error.message);
    }
  }catch(e){ console.error(e); alert('Gagal update BOARD: '+e.message+'\n\nPastikan field BOARD BASIS di Airtable sudah tukar ke Multiple Select, bukan Single Select.'); fetchRoomingData(); }
}
function toggleBoardMulti(jemaahId, option){
  const rec=allRoomingJemaah.find(r=>r.id===jemaahId); if(!rec) return;
  let arr=getBoardArray(rec.fields);
  if(arr.includes(option)){
    arr=arr.filter(x=>x!==option);
  } else {
    // Allow max 2, but allow more
    arr.push(option);
  }
  // If selects FULLBOARD generic, remove specific ones? Keep simple allow combo
  updateJemaahBoardMulti(jemaahId, arr);
}
function toggleBoardDropdown(jemaahId){ const el=document.getElementById('boardDrop-'+jemaahId); if(!el) return; // close others
  document.querySelectorAll('[id^="boardDrop-"]').forEach(d=>{ if(d.id!=='boardDrop-'+jemaahId) d.classList.add('hidden'); });
  el.classList.toggle('hidden'); }
function closeBoardDropdown(jemaahId){ const el=document.getElementById('boardDrop-'+jemaahId); if(el) el.classList.add('hidden'); }
// Close on outside click
if(!window._boardDropListener){ window._boardDropListener=true; document.addEventListener('click', (e)=>{ if(!e.target.closest('[id^="boardDrop-"]') && !e.target.closest('button[onclick*="toggleBoardDropdown"]')){ document.querySelectorAll('[id^="boardDrop-"]').forEach(d=>d.classList.add('hidden')); } }); }
function clearBoardMulti(jemaahId){
  updateJemaahBoardMulti(jemaahId, []);
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
function openTanpaKatilModal(roomId){
  try{
    const targetRec = allRoomingRecords.find(r=>r.id===roomId);
    const currentTripId = window.selectedTripRecord?.id || localStorage.getItem('effah_active_trip_id') || '';
    console.log('openTanpaKatil FILTER UNASSIGNED IN LOC', currentTripId, activeLocation, 'total', allRoomingJemaah.length);
    const available = allRoomingJemaah.filter(j=>{
      const nameUpper = (getJemaahName(j.fields)||'').toUpperCase();
      if(nameUpper.includes('MUTAWIF') || nameUpper.includes('EFFAH')) return false;
      // Only show jemaah belum assign bilik dalam lokasi ini (activeLocation)
      const assignedNormalInLoc = isJemaahAssignedInLocation(j.id, activeLocation);
      const alreadyTanpaInLoc = allRoomingRecords.some(r=> (r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===activeLocation.toUpperCase() && ((r.fields['JEMAAH TANPA KATIL']||r.fields['INFANT']||[]).includes(j.id)));
      if(assignedNormalInLoc) return false;
      if(alreadyTanpaInLoc) return false;
      if(targetRec && (targetRec.fields['JEMAAH TANPA KATIL']||[]).includes(j.id)) return false;
      if(targetRec && (targetRec.fields['JEMAAH']||[]).includes(j.id)) return false;
      return true;
    });
    console.log('available tanpa katil (BELUM ASSIGN IN LOC) list:', available.map(j=>getJemaahName(j.fields)));
    // Include unassigned STAFF as well
    const availableStaff = staffList.filter(s=>{
      const assigned = isStaffAssignedInLocation(s.id||s.airtableId, activeLocation);
      return !assigned;
    });
    console.log('available staff count', availableStaff.length);
    const combinedAvailable = [...available.map(j=>({type:'jemaah', data:j})), ...availableStaff.map(s=>({type:'staff', data:s}))];
    console.log('combined available count for', activeLocation, combinedAvailable.length);
    if(combinedAvailable.length===0){
      alert('Tiada Baki Jemaah/Staff\n\nSemua jemaah dan staff telah ada bilik di ' + activeLocation + '. Tiada baki belum assign untuk ditambah sebagai Tanpa Katil.');
      return;
    }
    const availableForModal = combinedAvailable;
    if(availableForModal.length===0){
      alert('Tiada Baki');
      return;
    }
    let existingModal = document.getElementById('tanpaKatilSelectorModal');
    if(existingModal) existingModal.remove();
    const modalHtml = `<div id="tanpaKatilSelectorModal" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px">
      <div style="background:#fff;border-radius:16px;max-width:420px;width:100%;max-height:75vh;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.2)">
        <div style="padding:12px 16px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center">
          <span style="font-weight:bold;font-size:12px">Pilih Infant / Tanpa Katil - ${activeLocation} (${combinedAvailable.length} baki belum assign)</span>
          <button onclick="document.getElementById('tanpaKatilSelectorModal').remove()" style="w-6 h-6 rounded-full bg-slate-100">X</button>
        </div>
        <div style="padding:6px 8px;background:#fffbe6;border-bottom:1px solid #fde68a;font-size:9px;color:#92400e">Hanya jemaah yang belum ada bilik di ${activeLocation} sahaja. Infant tidak kira kapasiti.</div>
        <div style="padding:8px;max-height:50vh;overflow-y:auto" id="tanpaKatilList">
          <input type="text" id="tanpaKatilSearch" placeholder="Cari nama..." style="width:100%;padding:6px 10px;border:1px solid #ddd;border-radius:20px;font-size:11px;margin-bottom:8px" oninput="filterTanpaKatilList(this.value)">
          <div id="tanpaKatilOptions">
            ${combinedAvailable.map((item, idx)=>{ const isStaff = item.type==='staff'; const id = isStaff ? (item.data.id||item.data.airtableId) : item.data.id; const name = isStaff ? (item.data.name||'Staff') : getJemaahName(item.data.fields); const badge = isStaff ? '<span style="background:#FADBD8;color:#7A0C2E;padding:1px 6px;border-radius:10px;font-size:8px">STAFF</span>' : '<span style="background:#7A0C2E;color:#fff;padding:1px 6px;border-radius:10px;font-size:8px">JEMAAH</span>'; const onclick = isStaff ? `addStaffTanpaKatilToRoom('${roomId}','${id}');` : `addTanpaKatilToRoom('${roomId}','${id}');`; return `<button onclick="${onclick} document.getElementById('tanpaKatilSelectorModal').remove()" style="width:100%;text-align:left;padding:6px 10px;border-bottom:1px solid #f0f0f0;font-size:11px;display:flex;justify-content:space-between;align-items:center"><span>${idx+1}. ${name}</span><span style="display:flex;gap:4px;align-items:center">${badge}<span style="background:#7A0C2E;color:#fff;padding:1px 6px;border-radius:10px;font-size:8px">+</span></span></button>`; }).join('')}
          </div>
        </div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    window._tanpaKatilAvailable = available;
    window._tanpaKatilRoomId = roomId;
  }catch(e){ alert('Error openTanpaKatil: '+e.message); console.error(e); }
}


function filterTanpaKatilList(q){
  const list = document.getElementById('tanpaKatilOptions');
  if(!list || !window._tanpaKatilAvailable) return;
  const low = (q||'').toLowerCase().trim();
  const roomId = window._tanpaKatilRoomId;
  let filtered = window._tanpaKatilAvailable;
  if(low){
    filtered = window._tanpaKatilAvailable.filter(j=>{
      const name = (getJemaahName(j.fields)||'').toLowerCase();
      const raw = (j.fields['NAMA JEMAAH']||j.fields['NAMA']||'').toLowerCase();
      return name.includes(low) || raw.includes(low);
    });
  }
  console.log('filter tanpa katil q=', low, 'available', window._tanpaKatilAvailable.length, 'filtered', filtered.length, 'names', filtered.map(j=>getJemaahName(j.fields)));
  list.innerHTML = filtered.map((j, idx)=>`<button onclick="addTanpaKatilToRoom('${roomId}','${j.id}'); document.getElementById('tanpaKatilSelectorModal').remove()" style="width:100%;text-align:left;padding:8px 10px;border:1px solid #eee;border-radius:10px;margin-bottom:4px;font-size:11px;background:#fff" class="hover:bg-amber-50">${idx+1}. ${getJemaahName(j.fields)}</button>`).join('') || '<div style="padding:8px;text-align:center;color:#999;font-size:11px">Tiada carian ditemui ('+low+') - ada '+window._tanpaKatilAvailable.length+' calon<br>'+window._tanpaKatilAvailable.map(j=>getJemaahName(j.fields)).join(', ')+'</div>';
}


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
function addStaffTanpaKatilToRoom(roomId, staffId){
  if(typeof assignStaffAsTanpaKatil==='function') assignStaffAsTanpaKatil(staffId, roomId);
  else alert('Function assignStaffAsTanpaKatil not found');
}
function filterTanpaKatilList(q){
  const opts=document.querySelectorAll('#tanpaKatilOptions button');
  opts.forEach(btn=>{
    const txt=btn.textContent.toLowerCase();
    btn.style.display = txt.includes(q.toLowerCase()) ? 'flex' : 'none';
  });
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
function quickAssignStaff(staffId){ if(isStaffAssignedInLocation(staffId, activeLocation)) return; const rooms=allRoomingRecords.filter(r=>(r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===activeLocation); const target=rooms.find(r=>{ const j=r.fields['JEMAAH']?.length||0; const s=getStaffForRoom(r.id).length; return (j+s)<(r.fields['KAPASITI']||4); }); if(target) assignStaffToRoom(staffId,target.id); else alert('Tiada slot kosong di lokasi '+activeLocation+'.'); }
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




function generateRoomingPrint(orientation){ orientation = orientation || 'landscape';
  try{
    const tripDropdownText = document.getElementById('roomingTripSelect')?.selectedOptions?.[0]?.textContent || '';
    const tripNameRaw = window.selectedTripRecord?.fields?.['TRIP NAME'] || window.selectedTripRecord?.fields?.Trip || window.selectedTripRecord?.fields?.Name || tripDropdownText || localStorage.getItem('effah_active_trip_name') || localStorage.getItem('effah_last_selected_trip_name') || 'TRIP';
    const tripName = cleanTripNameForRooming(tripNameRaw) || tripNameRaw || 'TRIP';
    const allLocations = ['MEKAH','MADINAH','TAIF','JEDDAH',...customLocations];
    const tripId = window.selectedTripRecord?.id || localStorage.getItem('effah_active_trip_id') || '';
    
    // NAMELIST ROWS - keep existing logic but ensure board badge shows actual value
    let combinedStaff = [...staffList];
    let namelistRows = allRoomingJemaah.map((r,i)=>{
      const f=r.fields;
      const name=getJemaahName(f);
      const fbArr=getBoardArray(f);
      let fbBadge = '-';
      if(fbArr.length>0){
        fbBadge=fbArr.map(raw=>{
          const up=raw.toUpperCase();
          let bg='#BBF7D0', border='#065F46';
          if(up.includes('MEKAH')){ bg='#FDE68A'; border='#92400E'; }
          else if(up.includes('MADINAH')){ bg='#BFDBFE'; border='#1E40AF'; }
          else if(up.includes('FULLBOARD')){ bg='#BBF7D0'; border='#065F46'; }
          else if(up.includes('BB')){ bg='#FDE68A'; border='#92400E'; }
          return `<span style="background:${bg};border:1px solid ${border};padding:2px 6px;border-radius:10px;font-weight:bold;font-size:7px;display:inline-block;margin:1px 2px;white-space:nowrap;">${raw}</span>`;
        }).join('');
      }
      const train = isTrainChecked(f) ? '<span style="background:#FEF3C7;padding:1px 6px;border-radius:10px;font-size:8px">TRAIN</span>' : '-';
      const pakej = getPakejVal(f) || '-';
            const insArr = getInsuranArray(f);
      let insHtml = '-';
      if(insArr.length>0){
        insHtml=insArr.map(ins=>{
          const up=ins.toUpperCase();
          let bg='#BBF7D0', border='#065F46', color='#065F46';
          if(up==='TAKAFUL'){ bg='#BBF7D0'; border='#065F46'; color='#065F46'; }
          else if(up==='ETIQA'){ bg='#FEF3C7'; border='#92400E'; color='#92400E'; }
          else if(up.includes('KHAIRI')){ bg='#BFDBFE'; border='#1E40AF'; color='#1E40AF'; }
          return `<span style="background:${bg};border:1px solid ${border};color:${color};padding:2px 6px;border-radius:10px;font-weight:bold;font-size:7px;display:inline-block;margin:1px 2px;white-space:nowrap;">${ins}</span>`;
        }).join('');
      }
      
      return `<tr><td style="border:1px solid #ddd;padding:3px 6px;text-align:center">${i+1}</td><td style="border:1px solid #ddd;padding:3px 6px;font-weight:600">${name}</td><td style="border:1px solid #ddd;padding:3px 6px;text-align:center">${fbBadge}</td><td style="border:1px solid #ddd;padding:3px 6px;text-align:center">${train}</td><td style="border:1px solid #ddd;padding:3px 6px;text-align:center">${pakej}</td><td style="border:1px solid #ddd;padding:3px 6px;text-align:center">${insHtml}</td></tr>`;
    }).join('');
    // --- STAFF IN NAMELIST (S1, S2...) ---
    const allStaffForPrint = [];
    const staffMap = {};
    if(typeof staffList!=='undefined') staffList.forEach(s=>{ if(s.name && !allStaffForPrint.includes(s.name)){ allStaffForPrint.push(s.name); staffMap[s.name]=s; } });
    if(typeof allRoomingRecords!=='undefined') allRoomingRecords.forEach(r=>{ (r.fields['STAFF / EXTRA']||'').split(',').filter(Boolean).forEach(sn=>{ const c=sn.trim(); if(c && !allStaffForPrint.includes(c)){ allStaffForPrint.push(c); if(!staffMap[c]) staffMap[c]={name:c, board:'', train:false}; } }); });
    if(typeof combinedStaff!=='undefined') combinedStaff.forEach(n=>{ const c=(typeof n==='string'?n:n.name||'').trim(); if(c && !allStaffForPrint.includes(c)){ allStaffForPrint.push(c); staffMap[c]= (typeof n==='object'?n:{name:c}); } });
    allStaffForPrint.forEach((sName, sIdx)=>{ const sObj = staffMap[sName]||{name:sName}; const cleanName=sName.replace(/\(EFFAH\)/i,'').trim(); if(!cleanName) return; const sBoardRaw = sObj.boardBasis||sObj.fields?.['BOARD']||sObj.board||''; const sBoard = sBoardRaw.toString().toUpperCase(); let sBoardBadge='-'; if(sBoardRaw){ const up=sBoardRaw.toString().toUpperCase(); if(up.includes('MEKAH')){ if(up.includes('BB')) sBoardBadge=`<span style="background:#FDE68A;border:1px solid #92400E;padding:1px 6px;border-radius:10px;font-weight:bold;font-size:8px">${sBoardRaw}</span>`; else sBoardBadge=`<span style="background:#FDE68A;border:1px solid #92400E;padding:1px 6px;border-radius:10px;font-weight:bold;font-size:8px">${sBoardRaw}</span>`; } else if(up.includes('MADINAH')){ if(up.includes('BB')) sBoardBadge=`<span style="background:#BFDBFE;border:1px solid #1E40AF;padding:1px 6px;border-radius:10px;font-weight:bold;font-size:8px">${sBoardRaw}</span>`; else sBoardBadge=`<span style="background:#BFDBFE;border:1px solid #1E40AF;padding:1px 6px;border-radius:10px;font-weight:bold;font-size:8px">${sBoardRaw}</span>`; } else if(up.includes('FULLBOARD')){ sBoardBadge=`<span style="background:#BBF7D0;border:1px solid #065F46;padding:1px 6px;border-radius:10px;font-weight:bold;font-size:8px">${sBoardRaw}</span>`; } else sBoardBadge=sBoardRaw; } const sTrain = sObj.train||sObj.fields?.TRAIN||false; const sTrainBadge = sTrain ? '<span style="background:#FEF3C7;padding:1px 6px;border-radius:10px;font-size:8px">TRAIN</span>' : '-'; namelistRows+=`<tr style="background:#FDF2F4"><td style="border:1px solid #ddd;padding:3px 6px;text-align:center;background:#F9D5D9;font-weight:bold;color:#7A0C2E">S${sIdx+1}</td><td style="border:1px solid #ddd;padding:3px 6px;font-weight:700;background:#FDF2F4;color:#7A0C2E">${cleanName} (EFFAH)</td><td style="border:1px solid #ddd;padding:3px 6px;text-align:center;background:#FDF2F4">${sBoardBadge}</td><td style="border:1px solid #ddd;padding:3px 6px;text-align:center;background:#FDF2F4">${sTrainBadge}</td><td style="border:1px solid #ddd;padding:3px 6px;text-align:center;background:#FDF2F4"><span style="color:#999">-</span></td><td style="border:1px solid #ddd;padding:3px 6px;text-align:center;background:#FDF2F4"><span style="color:#999">-</span></td></tr>`; });

    let locationPages = '';
    allLocations.forEach(loc=>{
      let rooms = allRoomingRecords.filter(r=>(r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===loc.toUpperCase());
      if(rooms.length===0) return;
      // Sort by SORT ORDER for print
      rooms = [...rooms].sort((a,b)=>(a.fields['SORT ORDER']||9999)-(b.fields['SORT ORDER']||9999));
      
      // FIXED LOGIC: Determine board makan per location - INCLUDING STAFF
      function isStaffBoardMatch(sObj, locUpper){
        const fbRawRaw = sObj.boardBasis||sObj.fields?.['BOARD']||sObj.board||''; const fbRaw = (Array.isArray(fbRawRaw)? fbRawRaw.join(', ') : fbRawRaw).toString().trim();
        if(!fbRaw) return false;
        const up=(Array.isArray(fbRaw)? (fbRaw[0]||'') : fbRaw).toString().toUpperCase();
        if(up==='-'||up==='NO BOARD') return false;
        if(locUpper==='MEKAH') return up.includes('MEKAH')||up==='FULLBOARD'||up==='BOARD'||up.includes('FULLBOARD');
        if(locUpper==='MADINAH') return up.includes('MADINAH')||up==='FULLBOARD'||up==='BOARD'||up.includes('FULLBOARD');
        return up.includes('FULLBOARD')||up==='FULLBOARD'||up==='BOARD';
      }
      let fbListForLoc = [];
      function jHasBoardForLoc(r, locUp){
        const arr=getBoardArray(r.fields).map(x=>x.toUpperCase());
        if(arr.length===0) return false;
        if(locUp==='MEKAH'){
          return arr.some(x=> x==='FULLBOARD' || x==='FULLBOARD (MEKAH)' || x==='BB (MEKAH)' || (x.includes('MEKAH') && (x.includes('FULLBOARD')||x.includes('BB'))));
        } else if(locUp==='MADINAH'){
          return arr.some(x=> x==='FULLBOARD' || x==='FULLBOARD (MADINAH)' || x==='BB (MADINAH)' || (x.includes('MADINAH') && (x.includes('FULLBOARD')||x.includes('BB'))));
        } else {
          return arr.some(x=> x==='FULLBOARD');
        }
      }
      if(loc==='MEKAH'){
        fbListForLoc = allRoomingJemaah.filter(r=> jHasBoardForLoc(r,'MEKAH'));
      } else if(loc==='MADINAH'){
        fbListForLoc = allRoomingJemaah.filter(r=> jHasBoardForLoc(r,'MADINAH'));
      } else if(loc==='TAIF'){
        fbListForLoc = allRoomingJemaah.filter(r=> jHasBoardForLoc(r,'TAIF'));
      } else {
        fbListForLoc = allRoomingJemaah.filter(r=> jHasBoardForLoc(r,loc));
      }
      // Add STAFF with FULLBOARD in this location
      const staffFB = staffList.filter(s=> isStaffBoardMatch(s, loc.toUpperCase()) && s.roomIds && s.roomIds.some(rid=> rooms.some(r=>r.id===rid)));
      // Convert staff to same shape as jemaah for grouping
      staffFB.forEach(s=>{ fbListForLoc.push({ id:s.id, fields:{'NAMA JEMAAH':s.name, 'BOARD': s.boardBasis||s.fields?.['BOARD']||s.board||'FULLBOARD', 'IS_STAFF':true, 'STAFF_OBJ':s}, _isStaff:true, boardBasis:s.boardBasis }); });

      // Staff linked to rooms in this location
      const staffInLoc = staffList.filter(s=> s.roomIds && s.roomIds.some(rid=> rooms.some(r=>r.id===rid)));
      
      // Build overview - FIXED BOARD count
      const sortedRoomsForPrintEarly = [...rooms].sort((a,b)=>(a.fields['SORT ORDER']||9999)-(b.fields['SORT ORDER']||9999));
      let overviewRows = '';
      // Group by hotel
      const hotels = {};
      rooms.forEach(r=>{
        const h=r.fields['HOTEL NAME']||'TANPA HOTEL';
        if(!hotels[h]) hotels[h]=[];
        hotels[h].push(r);
      });
      
      // For overview BOARD column: show breakdown
      let boardSummary = '';
      function hasBoard(r, target){
        const arr=getBoardArray(r.fields).map(x=>x.toUpperCase());
        return arr.includes(target);
      }
      function hasBoardIncludes(r, inc){
        const arr=getBoardArray(r.fields).map(x=>x.toUpperCase());
        return arr.some(x=>x.includes(inc));
      }
      if(loc==='MEKAH'){
        const countFB = allRoomingJemaah.filter(r=> hasBoard(r,'FULLBOARD')).length;
        const countFBMekah = allRoomingJemaah.filter(r=> hasBoard(r,'FULLBOARD (MEKAH)')).length;
        const countBBMekah = allRoomingJemaah.filter(r=> hasBoard(r,'BB (MEKAH)')).length;
        boardSummary = `FULLBOARD: ${countFB}, FULLBOARD MEKAH: ${countFBMekah}, BB MEKAH: ${countBBMekah}`;
        if(fbListForLoc.length>0) boardSummary = `${fbListForLoc.length} orang (FULLBOARD: ${countFB} + FULLBOARD (MEKAH): ${countFBMekah} + BB (MEKAH): ${countBBMekah})`;
        else boardSummary = '-';
      } else if(loc==='MADINAH'){
        const countFB = allRoomingJemaah.filter(r=> hasBoard(r,'FULLBOARD')).length;
        const countFBMad = allRoomingJemaah.filter(r=> hasBoard(r,'FULLBOARD (MADINAH)')).length;
        const countBBMad = allRoomingJemaah.filter(r=> hasBoard(r,'BB (MADINAH)')).length;
        if(fbListForLoc.length>0) boardSummary = `${fbListForLoc.length} orang (FULLBOARD: ${countFB} + FULLBOARD (MADINAH): ${countFBMad} + BB (MADINAH): ${countBBMad})`;
        else boardSummary = '-';
      } else if(loc==='TAIF'){
        boardSummary = fbListForLoc.length>0 ? `${fbListForLoc.length} FULLBOARD` : '-';
      } else {
        boardSummary = fbListForLoc.length>0 ? `${fbListForLoc.length} FULLBOARD` : '-';
      }
      
      Object.keys(hotels).forEach(hotelName=>{
        const hRooms = hotels[hotelName];
        const capCounts = {};
        hRooms.forEach(r=>{ const c=r.fields['KAPASITI']||4; capCounts[c]=(capCounts[c]||0)+1; });
        const bilikStr = Object.keys(capCounts).map(c=>`Bilik ber-${c} (${capCounts[c]})`).join(', ');
        // --- FIX: board basis per hotel, include staff ---
        const hJemaahIds = [];
        hRooms.forEach(r=>{ (r.fields['JEMAAH']||[]).forEach(id=>hJemaahIds.push(id)); });
        const hJemaahRecs = allRoomingJemaah.filter(j=> hJemaahIds.includes(j.id));
        function countBoardForHotel(fbFilter){
          let cnt=0;
          hJemaahRecs.forEach(j=>{ const fb=(getFullboardVal(j.fields)||'').toUpperCase().trim(); if(fbFilter(fb)) cnt++; });
          // staff in this hotel
          const staffInHotel = staffList.filter(s=> s.roomIds && s.roomIds.some(rid=> hRooms.some(hr=>hr.id===rid)));
          staffInHotel.forEach(s=>{
            const fbRawRaw=s.boardBasis||s.fields?.['BOARD']||s.board||''; const fbRaw=(Array.isArray(fbRawRaw)? fbRawRaw.join(', ') : fbRawRaw).toString().toUpperCase().trim();
            if(fbFilter(fbRaw)) cnt++;
          });
          return cnt;
        }
        let boardSummaryHotel='';
        if(loc==='MEKAH'){
          const cFB = countBoardForHotel(fb=>fb==='FULLBOARD');
          const cFBM = countBoardForHotel(fb=>fb==='FULLBOARD (MEKAH)');
          const cBBM = countBoardForHotel(fb=>fb==='BB (MEKAH)' || (fb.includes('MEKAH') && fb.includes('BB')));
          const totalHotelBoard = cFB + cFBM + cBBM;
          if(totalHotelBoard>0) boardSummaryHotel = `${totalHotelBoard} orang (FULLBOARD: ${cFB} + FULLBOARD (MEKAH): ${cFBM} + BB (MEKAH): ${cBBM})`;
          else boardSummaryHotel='-';
        } else if(loc==='MADINAH'){
          const cFB = countBoardForHotel(fb=>fb==='FULLBOARD');
          const cFBMad = countBoardForHotel(fb=>fb==='FULLBOARD (MADINAH)');
          const cBBMad = countBoardForHotel(fb=>fb==='BB (MADINAH)' || (fb.includes('MADINAH') && fb.includes('BB')));
          const totalHotelBoard = cFB + cFBMad + cBBMad;
          if(totalHotelBoard>0) boardSummaryHotel = `${totalHotelBoard} orang (FULLBOARD: ${cFB} + FULLBOARD (MADINAH): ${cFBMad} + BB (MADINAH): ${cBBMad})`;
          else boardSummaryHotel='-';
        } else {
          const cFB = countBoardForHotel(fb=>fb==='FULLBOARD');
          boardSummaryHotel = cFB>0 ? `${cFB} FULLBOARD` : '-';
        }
        overviewRows += `<tr><td style="border:1px solid #ddd;padding:4px 6px;font-weight:bold">${hotelName}</td><td style="border:1px solid #ddd;padding:4px 6px;text-align:center">${bilikStr}</td><td style="border:1px solid #ddd;padding:4px 6px;text-align:center">${boardSummaryHotel}</td><td style="border:1px solid #ddd;padding:4px 6px;text-align:center">${hRooms.length} bilik</td></tr>`;
      });
      
      let overviewProfessionalHTML = `<table style="width:100%;border-collapse:collapse;font-size:9px"><tr style="background:#f8f8f8;font-weight:bold"><th style="border:1px solid #ddd;padding:4px 6px;text-align:left">HOTEL</th><th style="border:1px solid #ddd;padding:4px 6px;text-align:center">BILIK</th><th style="border:1px solid #ddd;padding:4px 6px;text-align:center">BOARD BASIS</th><th style="border:1px solid #ddd;padding:4px 6px;text-align:center">JUMLAH</th></tr>${overviewRows}</table>`;
      
      const totalJemaahLoc = rooms.reduce((sum,r)=> sum + (r.fields['JEMAAH']||[]).length, 0);
      const totalBabyLoc = rooms.reduce((sum,r)=> sum + (r.fields['JEMAAH TANPA KATIL']||[]).length, 0);
      const totalStaffLoc = rooms.reduce((sum,r)=> sum + getStaffForRoom(r.id).length, 0);
      const fbTotalLoc = fbListForLoc.length;

      // Room blocks - smaller for portrait
      const isPortrait = orientation==='portrait';
      // Ensure rooms sorted by SORT ORDER for print
      const sortedRoomsForPrint = sortedRoomsForPrintEarly;
      const roomBlocks = sortedRoomsForPrint.map((rec, idx)=>{
        const f=rec.fields;
        const roomName = f['Room ID / Nama Bilik'] || f['ROOM ID'] || `B${f['KAPASITI']||4}-${idx+1}`;
        const pakej = f['PAKEJ / HOTEL']||'';
        const hotel = f['HOTEL NAME']||'';
        const cap = f['KAPASITI']||4;
        const jIds = f['JEMAAH']||[];
        const babyIdsRaw = f['JEMAAH TANPA KATIL']||[];
        const staffTanpaLocal = (typeof getStaffTanpaKatilForRoom==='function'? getStaffTanpaKatilForRoom(rec.id) : (f['_STAFF_TANPA_KATIL']||[]));
        const babyIds = [...new Set([...babyIdsRaw, ...staffTanpaLocal])];
        const staffForRoom = getStaffForRoom(rec.id);
        
        let jemaahHtml = jIds.map((jid, jIdx)=>{
          const jRec = allRoomingJemaah.find(r=>r.id===jid);
          const name = jRec ? getJemaahName(jRec.fields) : jid;
          return `<div style="font-size:${isPortrait ? '7.5px' : '8.5px'};padding:${isPortrait ? '1px 0' : '2px 0'};border-bottom:1px dotted #ddd">${jIdx+1}. ${name}</div>`;
        }).join('');
        
        // FIX V93: Separate jemaah infant (NA) and staff tanpa katil (S numbering)
        const babyJemaahIds = [];
        const babyStaffIds = [];
        babyIds.forEach(bId=>{
          const isStaff = staffList.some(s=>s.id===bId||s.airtableId===bId) || (typeof getStaffById==='function' && getStaffById(bId));
          if(isStaff) babyStaffIds.push(bId);
          else babyJemaahIds.push(bId);
        });
        let babyHtml = babyJemaahIds.length ? babyJemaahIds.map((jid, jIdx)=>{
          const jRec = allRoomingJemaah.find(r=>r.id===jid);
          const name = jRec ? getJemaahName(jRec.fields) : (typeof getNameForAnyId==='function'? getNameForAnyId(jid) : jid);
          return `<div style="font-size:${isPortrait ? '7.5px' : '8.5px'};padding:${isPortrait ? '1px 0' : '2px 0'};border-bottom:1px dotted #92400E;color:#92400E;background:#FEF3C7;font-weight:600">NA. ${name} (Tanpa Katil)</div>`;
        }).join('') : '';
        // Staff tanpa katil will be appended to staffHtml as S numbering
        const staffTanpaIdsForPrint = babyStaffIds;

        
        let staffHtml = staffForRoom.length ? staffForRoom.map((s, sIdx)=>{
          return `<div style="font-size:${isPortrait ? '7.5px' : '8.5px'};padding:${isPortrait ? '1px 0' : '2px 0'};border-bottom:1px dotted #ddd;color:#7A0C2E;background:#FDF2F4">S${sIdx+1}. ${s.name.replace(/\(EFFAH\)/i,'').trim()} (EFFAH)</div>`;
        }).join('') : '';
        let staffTanpaHtml = staffTanpaIdsForPrint.length ? staffTanpaIdsForPrint.map((sid, stIdx)=>{
          const sRec = staffList.find(s=>s.id===sid||s.airtableId===sid) || (typeof getStaffById==='function'? getStaffById(sid) : null);
          const sName = sRec ? sRec.name : (typeof getNameForAnyId==='function'? getNameForAnyId(sid) : sid);
          const sNum = staffForRoom.length + stIdx + 1;
          return `<div style="font-size:${isPortrait ? '7.5px' : '8.5px'};padding:${isPortrait ? '1px 0' : '2px 0'};border-bottom:1px dotted #e8a838;background:#fffbe6;color:#92400E;font-weight:600">S${sNum}. ${sName.replace(/\(EFFAH\)/i,'').trim()} (Tanpa Katil)</div>`;
        }).join('') : '';
        // Combine staff regular + staff tanpa katil for display count
        const combinedStaffHtml = staffHtml + staffTanpaHtml;

        
        const catatanBilik = (f['CATATAN BILIK'] || f['CATATAN'] || '').trim();
        const catatanPrint = catatanBilik ? ` (${catatanBilik})` : '';
        return `<div style="border:1px solid #000;margin-bottom:${isPortrait ? '4px' : '6px'};background:#fff;break-inside:avoid" data-room-card="${rec.id}" ondragover="allowDropRoom(event)" ondragleave="leaveDropRoom(event)" ondrop="dropRoom(event,'${rec.id}')">
          <div draggable="true" ondragstart="dragRoom(event,'${rec.id}')" ondragend="dragRoomEnd(event)" style="background:#fff;border-bottom:1px solid #000;padding:${isPortrait ? '2px 4px' : '3px 6px'};display:flex;justify-content:space-between;align-items:center;cursor:grab" title="Drag untuk susun bilik">
            <span style="font-weight:bold;font-size:${isPortrait ? '8px' : '9px'}">${idx+1}. ${roomName} ${pakej ? '('+pakej+')' : ''} ${hotel ? '- '+hotel : ''}${catatanPrint}</span>
            <span style="font-size:${isPortrait ? '7px' : '8px'};font-weight:bold">${jIds.length + staffForRoom.length}/${cap}</span>
          </div>
          <div style="padding:${isPortrait ? '3px 4px' : '4px 6px'}">
            ${jemaahHtml}
            ${babyHtml}
            ${combinedStaffHtml}
          </div>
        </div>`;
      }).join('');

      // FB Table with actual board basis badges
      let fbTableHTML = '';
      if(fbListForLoc.length>0){
        // Group by hotel for FB list - with room number
        const roomNumberMap = {};
        sortedRoomsForPrintEarly.forEach((r, idx)=>{ roomNumberMap[r.id]=idx+1; });
        rooms.forEach((r, idx)=>{ if(!roomNumberMap[r.id]) roomNumberMap[r.id]=idx+1; });
        const grouped = {};
        fbListForLoc.forEach(jRec=>{
          let room=null;
          if(jRec._isStaff){
            const sObj=jRec.fields.STAFF_OBJ;
            room = rooms.find(r=> sObj.roomIds && sObj.roomIds.includes(r.id));
          } else {
            room = rooms.find(r=> (r.fields['JEMAAH']||[]).includes(jRec.id));
          }
          const hotel = room ? (room.fields['HOTEL NAME']||'TANPA HOTEL') : 'TANPA BILIK';
          const roomNo = room ? (roomNumberMap[room.id]||'-') : '-';
          const roomName = room ? (room.fields['Room ID / Nama Bilik']||room.fields['ROOM ID']||'B?') : '-';
          if(!grouped[hotel]) grouped[hotel]=[];
          grouped[hotel].push({rec:jRec, room:roomNo, roomLabel:roomName});
        });
        
        const fbJemaahCount = fbListForLoc.filter(x=>!x._isStaff).length;
        const fbStaffCount = fbListForLoc.filter(x=>x._isStaff).length;
        const fbBadgeText = fbStaffCount>0 ? `${fbJemaahCount} Jemaah + ${fbStaffCount} Staff` : `${fbJemaahCount} Jemaah`;
        fbTableHTML = `
          <div style="margin-top:10px;border:1px solid #000">
            <div style="background:#064E3B;color:#fff;padding:4px 8px;font-weight:bold;font-size:9px;display:flex;justify-content:space-between">
              <span>${loc} - SENARAI PAKEJ MAKAN</span>
              <span style="background:#fff;color:#065F46;padding:1px 6px;border-radius:10px;font-size:9px">${fbBadgeText}</span>
            </div>
            ${Object.keys(grouped).sort().map(hotelName=>{
              const allItems = grouped[hotelName];
              const jemaahOnly = allItems.filter(x=>!x.rec._isStaff).sort((a,b)=>{ const na=parseInt(a.room)||9999; const nb=parseInt(b.room)||9999; return na-nb; });
              const staffOnly = allItems.filter(x=>x.rec._isStaff).sort((a,b)=>{ const na=parseInt(a.room)||9999; const nb=parseInt(b.room)||9999; return na-nb; });
              const sortedItems = [...jemaahOnly, ...staffOnly];
              const totalPax = allItems.length;
              return '<div style="border-bottom:1px solid #000"><div style="background:#f0fdf4;padding:3px 8px;font-weight:bold;font-size:9px;border-bottom:1px solid #ddd">'+hotelName+' ('+totalPax+' pax)</div><table style="width:100%;border-collapse:collapse;font-size:9px"><tr style="background:#f8f8f8;font-weight:bold"><th style="border:1px solid #ddd;padding:3px 6px;width:30px">NO</th><th style="border:1px solid #ddd;padding:3px 6px;text-align:left">NAMA JEMAAH</th><th style="border:1px solid #ddd;padding:3px 6px;text-align:center">BOARD BASIS</th><th style="border:1px solid #ddd;padding:3px 6px;text-align:center">BILIK</th></tr>'+ sortedItems.map((item,i)=>{
                    const isStaffRow = item.rec._isStaff;
                    let rawStaffName = (item.rec.fields['NAMA JEMAAH']||'');
                    rawStaffName = rawStaffName.replace(/\s*\(EFFAH\)\s*/gi,'').trim();
                    rawStaffName = rawStaffName.replace(/\(EFFAH\)/i,'').trim();
                    const displayName = isStaffRow ? rawStaffName + ' (EFFAH)' : getJemaahName(item.rec.fields);
                    const fbRaw = isStaffRow ? (item.rec.fields['BOARD']||'FULLBOARD') : (getFullboardVal(item.rec.fields)||'');
                    const up=(Array.isArray(fbRaw)? (fbRaw[0]||'') : (fbRaw||'')).toString().toUpperCase();
                    let badge='';
                    if(up.includes('MEKAH')) badge='<span style="background:#FDE68A;border:1px solid #92400E;padding:1px 6px;border-radius:10px;font-weight:bold;font-size:8px">'+fbRaw+'</span>';
                    else if(up.includes('MADINAH')) badge='<span style="background:#BFDBFE;border:1px solid #1E40AF;padding:1px 6px;border-radius:10px;font-weight:bold;font-size:8px">'+fbRaw+'</span>';
                    else badge='<span style="background:#BBF7D0;border:1px solid #065F46;padding:1px 6px;border-radius:10px;font-weight:bold;font-size:8px">'+fbRaw+'</span>';
                    let rowNo='';
                    if(isStaffRow){
                      const staffSorted = grouped[hotelName].filter(x=>x.rec._isStaff).sort((a,b)=>{ const na=parseInt(a.room)||9999; const nb=parseInt(b.room)||9999; return na-nb; });
                      const pos = staffSorted.findIndex(x=>x.rec.id===item.rec.id);
                      rowNo = 'S'+(pos+1);
                    } else {
                      rowNo = ''+(i+1);
                    }
                    const rowStyle = isStaffRow ? ' style="background:#FDF2F4"' : '';
                    const cellStyle = isStaffRow ? 'background:#F9D5D9;font-weight:bold;color:#7A0C2E' : '';
                    const nameStyle = isStaffRow ? 'color:#7A0C2E' : '';
                    return '<tr'+rowStyle+'><td style="border:1px solid #ddd;padding:3px 6px;text-align:center;'+cellStyle+'">'+rowNo+'</td><td style="border:1px solid #ddd;padding:3px 6px;font-weight:600;'+nameStyle+'">'+displayName+'</td><td style="border:1px solid #ddd;padding:3px 6px;text-align:center">'+badge+'</td><td style="border:1px solid #ddd;padding:3px 6px;text-align:center;font-size:8px">'+item.room+'</td></tr>';
                  }).join('') + '</table></div>';
            }).join('')}
          </div>
        `;
      } else {
        fbTableHTML = `<div style="margin-top:12px;border:1px dashed #000;padding:8px;text-align:center;font-size:9px;color:#666">Tiada jemaah Pakej Makan di ${loc} (Kriteria: ${loc==='TAIF' ? 'FULLBOARD sahaja' : loc+' = FULLBOARD + FULLBOARD ('+loc+') + BB ('+loc+')'})</div>`;
      }

      locationPages+=`<div style="page-break-before:always">
        <div style="display:flex;justify-content:space-between;align-items:center;font-weight:bold;font-size:13px;border-bottom:2px solid #000;padding-bottom:6px;margin-bottom:8px">
          <span>ROOMING LIST ${tripName} - ${loc} (${rooms.length} BILIK)</span>
        </div>
        <div style="margin-bottom:10px;border:1px solid #000;padding:0;background:#fff">
          <div style="background:#7A0C2E;color:#fff;padding:4px 8px;font-weight:bold;font-size:10px">${loc} OVERVIEW - ${rooms.length} Bilik</div>
          ${overviewProfessionalHTML}
          <div style="background:#f5f5f5;padding:5px 8px;font-size:9px;border-top:1px solid #000;display:flex;justify-content:space-between">
            <span><b>Total:</b> ${rooms.length} bilik</span>
            <span>${totalJemaahLoc+totalBabyLoc} jemaah + ${totalStaffLoc} staff</span>
          </div>
        </div>
        <div style="display:grid; grid-template-columns:${orientation==='portrait' ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)'}; gap:${orientation==='portrait' ? '6px' : '8px'}; align-items:start">${roomBlocks}</div>
        ${fbTableHTML}
      </div>`;
    });

    // --- NAMELIST OVERVIEW: Speedtrain & Insuran unique ---
    const trainCount = allRoomingJemaah.filter(j=> { try{ return isTrainChecked(j.fields); }catch(e){ return !!j.fields['TRAIN']; } }).length;
    const insuranUnique = allRoomingJemaah.filter(j=> { try{ return getInsuranArray(j.fields).length>0; }catch(e){ const v=j.fields['INSURAN']; return Array.isArray(v) ? v.length>0 : !!v; } }).length;
    const totalInsuranUnique = insuranUnique;
    const namelistOverviewHTML = '<div style="margin-top:12px;border:1px solid #000;padding:8px 10px;background:#f9fafb"><div style="font-weight:bold;font-size:10px;margin-bottom:6px">RINGKASAN NAMELIST</div><div style="display:flex;gap:20px;font-size:9px"><div><b>Bilangan Speedtrain:</b> ' + trainCount + ' orang</div><div><b>Bilangan Insuran:</b> ' + totalInsuranUnique + ' orang</div><div><b>Total Jemaah:</b> ' + allRoomingJemaah.length + '</div></div></div>';

    const html=`<html><head><title>Rooming ${tripName} - ${orientation}</title><style>body{font-family:Arial,Helvetica,sans-serif;font-size:10px;margin:12px;color:#000}table{border-collapse:collapse;width:100%}th,td{border:1px solid #000;padding:4px 6px;font-size:9px}th{background:#7A0C2E;color:#fff;font-weight:bold;text-transform:uppercase}.header{display:flex;justify-content:space-between;font-weight:bold;font-size:12px;border-bottom:2px solid #000;padding-bottom:6px;margin-bottom:8px}.page-break{page-break-before:always}.namelist-page{max-width:900px;margin:0 auto}.location-page{max-width:100%}@media print{@page{size:A4 ${orientation};margin:${orientation==='portrait' ? '8mm' : '10mm'}}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.page-break{page-break-before:always}}</style></head><body>
      <div class="namelist-page"><div class="header"><span>NAMELIST ${tripName}</span><span>Total: ${allRoomingJemaah.length} Jemaah + ${combinedStaff.length} Staff</span></div><div style="font-size:9px;margin-bottom:8px"><b>Trip:</b> ${tripName} | <b>Tarikh Cetak:</b> ${new Date().toLocaleDateString('ms-MY')} | <b>Orientasi:</b> ${orientation.toUpperCase()}</div><table style="table-layout:fixed"><colgroup><col style="width:32px"><col style="width:44%"><col style="width:110px"><col style="width:52px"><col style="width:62px"><col style="width:90px"></colgroup><tr><th>NO</th><th style="text-align:left">NAMA JEMAAH</th><th>BOARD</th><th>TRAIN</th><th>PAKEJ</th><th>INSURAN</th></tr>${namelistRows}</table>${namelistOverviewHTML}</div>
      ${locationPages||'<div style="page-break-before:always"><div style="border:1px dashed #000;padding:20px;text-align:center">Tiada bilik untuk trip ini</div></div>'}
      <script>window.onload=function(){setTimeout(()=>window.print(),600)}; window.onafterprint=function(){window.close();}; setTimeout(()=>{try{window.close();}catch(e){}},3500);<\/script>
    </body></html>`;
    const w=window.open('','_blank');
    if(!w){ alert('Popup blocked! Sila allow popup untuk print.'); return; }
    w.document.write(html);
    w.document.close();
  }catch(e){
    console.error(e);
    alert('Gagal generate print: '+e.message);
  }
}

async function autoAssignRooming(){ if(!confirm('Adakah anda pasti ingin menetapkan semua jemaah yang belum ditetapkan untuk lokasi '+activeLocation+' secara automatik?')) return; let rooms=[...allRoomingRecords].filter(r=>(r.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===activeLocation.toUpperCase()); if(rooms.length===0) rooms=[...allRoomingRecords]; rooms=getRoomOrderedList(rooms); const unassigned=allRoomingJemaah.filter(j=>!isJemaahAssignedInLocation(j.id, activeLocation)); let idx=0; for(let room of rooms){ const cap=room.fields['KAPASITI']||roomingDefaultCap; const staffCount=(room.fields['STAFF / EXTRA']||'').split(',').filter(Boolean).length; let cur=[...(room.fields['JEMAAH']||[])]; while((cur.length+staffCount)<cap && idx<unassigned.length){ cur.push(unassigned[idx].id); idx++; } if(cur.length!==(room.fields['JEMAAH']||[]).length){ await updateRoomField(room.id,'JEMAAH',cur,false); } } setTimeout(fetchRoomingData,800); }
 // V80 OVERRIDE - Staff multi + Insuran multi (keeps original 1767 lines intact, overrides at end)
function renderStaffList_V80(){
  const cont=document.getElementById('staffListContainer'); if(!cont) return;
  const q=(document.getElementById('searchStaff')?.value||'').toLowerCase();
  let filtered=[...staffList];
  if(q) filtered=filtered.filter(s=>(s.name||'').toLowerCase().includes(q));
  const boardOptions = ['FULLBOARD','FULLBOARD (MEKAH)','BB (MEKAH)','FULLBOARD (MADINAH)','BB (MADINAH)'];
  cont.innerHTML=filtered.map((s, idx)=>{
    const staffId=s.id||s.airtableId||'staff-'+idx;
    const fbArr=getStaffBoardArray(s);
    const fbDisplay=fbArr.length?fbArr.join(', '):'- BOARD';
    let fbCls='bg-white border-slate-200 text-slate-400';
    if(fbArr.some(x=>x.includes('MEKAH'))) fbCls='bg-orange-100 border-orange-200 text-orange-800';
    else if(fbArr.some(x=>x.includes('MADINAH'))) fbCls='bg-blue-100 border-blue-200 text-blue-800';
    else if(fbArr.includes('FULLBOARD')) fbCls='bg-emerald-100 border-emerald-200 text-emerald-800';
    const boardCheckboxes=boardOptions.map(opt=>{
      const checked=fbArr.includes(opt);
      return `<label class="flex items-center gap-1.5 px-2 py-1 hover:bg-slate-50 rounded text-[10px] cursor-pointer"><input type="checkbox" ${checked?'checked':''} onchange="toggleStaffBoardMulti('${staffId}','${opt}')" class="w-3 h-3 accent-[#7A0C2E]"> ${opt}</label>`;
    }).join('');
    const assigned=isStaffAssignedInLocation(staffId, activeLocation);
    const trainChecked = !!(s.train||s.fields?.TRAIN||s.board?.includes?.('TRAIN'));

    const rowCls=assigned?'bg-slate-50 text-slate-500':'bg-white hover:bg-slate-50';
    const dragStaff = assigned ? '' : `draggable="true" ondragstart="dragStaff(event,'${staffId}')" ondragend="dragEnd(event)"`;
    return `<div ${dragStaff} class="flex items-center gap-2 p-2 border-b border-slate-100 text-[11px] ${rowCls} ${!assigned?'cursor-grab active:cursor-grabbing hover:bg-amber-50':''}">
      <span class="w-5 h-5 flex items-center justify-center text-[10px] text-slate-300">${!assigned?'≡':''}</span>
      <span class="w-6 text-[9px] text-slate-400">${String(idx+1).padStart(2,'0')}</span>
      <span class="flex-1 truncate font-medium">${s.name||'-'}</span>
      <span class="text-[7px] px-1 rounded ${assigned?'bg-slate-200':''}">${assigned?'ASSIGNED di '+activeLocation:''}</span>
      <div class="relative w-[150px]">
        <button onclick="event.stopPropagation(); toggleStaffDropdown('${staffId}')" class="text-[8px] border rounded-full px-2 py-1 font-bold ${fbCls} w-full text-left flex justify-between items-center bg-white" style="opacity:1;"><span class="truncate">${fbDisplay}</span><span>▼</span></button>
        <div id="staffBoardDrop-${staffId}" class="hidden absolute right-0 top-full mt-1 w-[190px] bg-white border border-slate-200 rounded-xl shadow-xl z-[9999] p-1">
          ${boardCheckboxes}
          <div class="border-t border-slate-100 mt-1 pt-1 flex justify-between"><button onclick="clearStaffBoardMulti('${staffId}'); closeStaffDropdown('${staffId}')" class="text-[8px] px-2 py-0.5 rounded-full bg-slate-100">Clear</button><button onclick="closeStaffDropdown('${staffId}')" class="text-[8px] px-2 py-0.5 rounded-full bg-[#7A0C2E] text-white">OK</button></div>
          <div class="text-[7px] text-slate-400 px-2 mt-1">Boleh pilih 2: BB (MEKAH) + FB (MADINAH)</div>
        </div>
      </div>
      <label class="flex items-center gap-1 text-[8px] border rounded-full px-2.5 py-1.5 cursor-pointer font-bold ${trainChecked ? 'bg-amber-300 border-amber-600 text-amber-900' : 'bg-white border-slate-300'} shrink-0" style="background:${trainChecked ? '#FDE68A' : '#fff'} !important; opacity:1 !important;">
        <input type="checkbox" ${trainChecked?'checked':''} onchange="updateStaffTrain('${staffId}',this.checked)" class="w-3.5 h-3.5 accent-amber-600"> TRAIN
      </label>
      <button onclick="quickAssignStaff('${staffId}')" class="w-5 h-5 rounded-full bg-slate-100 text-[10px]">+</button>
      <button onclick="removeStaff('${staffId}')" class="w-5 h-5 rounded-full bg-red-50 text-red-400 text-[10px]">🗑</button>
    </div>`;
  }).join('') || '<div class="p-4 text-center text-[11px] text-slate-400">Tiada staff</div>';
}
// Override original
renderStaffList = renderStaffList_V80;

// Patch renderNamelist to use insuran multi dropdown
const _origRenderNamelist_V80 = renderNamelist;
renderNamelist = function(){
  // Inject insuran multi vars into the original function's scope by patching its HTML generation
  // We will call original, then post-process its output to replace old insuran badges with multi dropdown
  // For simplicity, we recreate the row logic with multi insuran
  try{
    const cont=document.getElementById('namelistContainer');
    if(!cont){ return _origRenderNamelist_V80.apply(this, arguments); }
    // Use original logic but with our helpers for board and insuran multi
    const q=(document.getElementById('searchNamelist')?.value||'').toLowerCase();
    let filtered=[...allRoomingJemaah];
    if(q) filtered=filtered.filter(r=> (getJemaahName(r.fields)||'').toLowerCase().includes(q));
    // Sort if active
    if(roomingSortActive){
      filtered.sort((a,b)=>{
        const na=(getJemaahName(a.fields)||'').toLowerCase();
        const nb=(getJemaahName(b.fields)||'').toLowerCase();
        return roomingSortDir==='asc'? na.localeCompare(nb) : nb.localeCompare(na);
      });
    }
    const boardOptions = ['FULLBOARD','FULLBOARD (MEKAH)','BB (MEKAH)','FULLBOARD (MADINAH)','BB (MADINAH)'];
    cont.innerHTML=filtered.map((r,i)=>{
      const name=getJemaahName(r.fields);
      const assignedNormalInLoc=isJemaahAssignedInLocation(r.id, activeLocation);
      const assignedTanpaInLoc=allRoomingRecords.some(rec=> (rec.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===activeLocation.toUpperCase() && ((rec.fields['JEMAAH TANPA KATIL']||[]).includes(r.id)));
      const assignedInLoc = assignedNormalInLoc || assignedTanpaInLoc;
      const assignedGlobal=isJemaahAssignedAny(r.id);
      const rowCls=assignedInLoc?'bg-slate-100 text-slate-500':'hover:bg-slate-50';
      const drag=assignedInLoc?'':`draggable="true" ondragstart="dragJemaah(event,'${r.id}')" ondragend="dragEnd(event)"`;
      let statusIcon = assignedInLoc? `<button onclick="removeJemaahFromCurrentLoc('${r.id}')" class="w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-[10px]" title="Keluarkan dari ${activeLocation}">✕</button>` : `<button onclick="quickAssign('${r.id}')" class="w-5 h-5 rounded-full border bg-slate-100 hover:bg-slate-200 text-[10px]">+</button>`;
      if(!assignedInLoc && assignedGlobal) statusIcon = `<button onclick="quickAssign('${r.id}')" class="w-5 h-5 rounded-full border bg-amber-100 hover:bg-amber-200 text-[10px]" title="Sudah ada di lokasi lain">+</button>`;
      const fbArr = getBoardArray(r.fields);
      const fbDisplay = fbArr.length ? fbArr.join(', ') : '-';
      const pk = typeof getPakejVal==='function'? (getPakejVal(r.fields) || '-') : '-';
      const trChecked = typeof isTrainChecked==='function'? isTrainChecked(r.fields) : false;
      let fbCls='bg-white border-slate-200';
      if(fbArr.some(x=>x.includes('MEKAH'))) fbCls='bg-orange-100 border-orange-200 text-orange-800';
      else if(fbArr.some(x=>x.includes('MADINAH'))) fbCls='bg-blue-100 border-blue-200 text-blue-800';
      else if(fbArr.includes('FULLBOARD')) fbCls='bg-emerald-100 border-emerald-200 text-emerald-800';
      else if(fbArr.length===0) fbCls='bg-white border-dashed border-slate-300 text-slate-400';
      const boardCheckboxes=boardOptions.map(opt=>{
        const checked=fbArr.includes(opt);
        return `<label class="flex items-center gap-1.5 px-2 py-1 hover:bg-slate-50 rounded text-[10px] cursor-pointer"><input type="checkbox" ${checked?'checked':''} onchange="toggleBoardMulti('${r.id}','${opt}')" class="w-3 h-3 accent-[#7A0C2E]"> ${opt}</label>`;
      }).join('');
      const insArr = getInsuranArrayV2(r.fields);
      const insDisplay = insArr.length ? insArr.join(', ') : '- INSURAN';
      const insuranOptions = ['TAKAFUL','ETIQA','AL-KHAIRI'];
      const insCheckboxes = insuranOptions.map(opt=>{
        const checked = insArr.includes(opt);
        const color = opt==='TAKAFUL'?'bg-emerald-100':opt==='ETIQA'?'bg-amber-100':opt==='AL-KHAIRI'?'bg-blue-100':'bg-slate-100';
        return `<label class="flex items-center gap-1.5 px-2 py-1 hover:bg-slate-50 rounded text-[10px] cursor-pointer"><input type="checkbox" ${checked?'checked':''} onchange="toggleInsuranMulti('${r.id}','${opt}')" class="w-3 h-3 accent-[#7A0C2E]"> <span class="px-1.5 py-0.5 rounded-full text-[8px] ${color}">${opt}</span></label>`;
      }).join('');
      return `<div ${drag} class="grid grid-cols-12 items-center px-1.5 py-1.5 text-[11px] border-b border-slate-50 ${rowCls}">
        <div class="col-span-1 text-slate-400 text-[10px]">${String(i+1).padStart(2,'0')}</div>
        <div class="col-span-3 font-medium truncate text-[10px] ${assignedInLoc?'text-slate-500 italic':''}" title="${name}">${name}</div>
        <div class="col-span-2 flex items-center gap-0.5 relative">
          <div class="relative w-full">
            <button onclick="event.stopPropagation(); toggleBoardDropdown('${r.id}')" class="text-[8px] border rounded-full px-2 py-1 font-bold ${fbCls} outline-none w-full truncate text-left flex items-center justify-between bg-white opacity-100" style="opacity:1; isolation:isolate;" title="BOARD BASIS - klik untuk pilih 2">
              <span class="truncate">${fbDisplay}</span><span class="ml-1">▼</span>
            </button>
            <div id="boardDrop-${r.id}" class="hidden absolute left-0 top-full mt-1 w-[190px] bg-white border border-slate-200 rounded-xl shadow-xl z-[9999] p-1" style="background:#ffffff !important; opacity:1 !important; isolation:isolate;">
              ${boardCheckboxes}
              <div class="border-t border-slate-100 mt-1 pt-1 flex justify-between"><button onclick="clearBoardMulti('${r.id}'); closeBoardDropdown('${r.id}')" class="text-[8px] px-2 py-0.5 rounded-full bg-slate-100">Clear</button><button onclick="closeBoardDropdown('${r.id}')" class="text-[8px] px-2 py-0.5 rounded-full bg-[#7A0C2E] text-white">OK</button></div>
              <div class="text-[7px] text-slate-400 px-2 mt-1">Boleh pilih 2: BB (MEKAH) + FB (MADINAH)</div>
            </div>
          </div>
        </div>
        <div class="col-span-1 text-center"><input type="checkbox" ${trChecked?'checked':''} onchange="updateJemaahCheckbox('${r.id}','TRAIN',this.checked)" class="w-3.5 h-3.5 accent-[#7A0C2E] rounded" title="TRAIN"></div>
        <div class="col-span-3 flex items-center gap-0.5 relative">
          <div class="relative w-full">
            <button onclick="event.stopPropagation(); toggleInsuranDropdown('${r.id}')" class="text-[8px] border rounded-full px-2 py-1 bg-white font-bold w-full text-left flex justify-between items-center ${insArr.length? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-white border-slate-200 text-slate-400'}" style="opacity:1;">
              <span class="truncate">${insDisplay}</span><span>▼</span>
            </button>
            <div id="insuranDrop-${r.id}" class="hidden absolute left-0 top-full mt-1 w-[170px] bg-white border border-slate-200 rounded-xl shadow-xl z-[9999] p-1">
              ${insCheckboxes}
              <div class="border-t border-slate-100 mt-1 pt-1 flex justify-between"><button onclick="clearInsuranMulti('${r.id}'); closeInsuranDropdown('${r.id}')" class="text-[8px] px-2 py-0.5 rounded-full bg-slate-100">Clear</button><button onclick="closeInsuranDropdown('${r.id}')" class="text-[8px] px-2 py-0.5 rounded-full bg-[#7A0C2E] text-white">OK</button></div>
            </div>
          </div>
        </div>
        <div class="col-span-1 flex items-center gap-0.5">
          <select onchange="updateJemaahField('${r.id}','PAKEJ',this.value)" class="text-[9px] border border-slate-200 rounded-full px-2 py-1 bg-white">
          <option value="-" ${pk==='-'?'selected':''}>-</option>
          <option value="JIMAT STANDARD" ${pk==='JIMAT STANDARD'?'selected':''}>JIMAT STANDARD</option>
          <option value="JIMAT PREMIUM" ${pk==='JIMAT PREMIUM'?'selected':''}>JIMAT PREMIUM</option>
          <option value="EKONOMI LITE" ${pk==='EKONOMI LITE'?'selected':''}>EKONOMI LITE</option>
          <option value="EKONOMI" ${pk==='EKONOMI'?'selected':''}>EKONOMI</option>
          <option value="STANDARD" ${pk==='STANDARD'?'selected':''}>STANDARD</option>
          <option value="PREMIUM" ${pk==='PREMIUM'?'selected':''}>PREMIUM</option>
          <option value="PREMIUM PLUS" ${pk==='PREMIUM PLUS'?'selected':''}>PREMIUM PLUS</option>
        </select>
        </div>
        <div class="col-span-1 text-center">${statusIcon}</div>
      </div>`;
    }).join('');
    if(typeof makeNamelistSticky==='function') makeNamelistSticky();
  }catch(e){ console.error('V80 renderNamelist override error', e); return _origRenderNamelist_V80.apply(this, arguments); }
};

function findRoomingContainers(){
  const selectors={namelist:['#namelistContainer','#namelist-container','[data-testid="namelist"]','.namelist-container','#jemaahList','#jemaahListContainer'],grid:['#roomingGrid','#roomingGridContainer','#rooming-grid','.rooming-grid','#bilikGrid','#roomingListGrid']};
  let namelist=null,grid=null;
  for(let sel of selectors.namelist){ const el=document.querySelector(sel); if(el){ namelist=el; break; } }
  for(let sel of selectors.grid){ const el=document.querySelector(sel); if(el){ grid=el; break; } }
  return {namelist,grid};
}
function createMissingRoomingStructure(){
  const modul=document.getElementById('modul-rooming');
  if(!modul) return false;
  const hasNamelist=modul.querySelector('#namelistContainer');
  const hasGrid=modul.querySelector('#roomingGrid')||modul.querySelector('#roomingGridContainer');
  if(!hasNamelist || !hasGrid || modul.innerHTML.trim().length<100){
    console.log('V80 creating missing rooming structure, modul innerLen', modul.innerHTML.length);
    const existingHTML=modul.innerHTML;
    modul.innerHTML=`
      <div id="roomingHeader" class="p-4 border-b bg-white">
        <div class="flex justify-between items-center">
          <h2 class="text-sm font-bold">Rooming List - V80 Auto-Created (Full Base)</h2>
          <div class="flex gap-2">
            <select id="roomingTripSelect" class="text-[11px] border rounded px-2 py-1"></select>
            <button onclick="fetchRoomingData()" class="text-[11px] bg-[#7A0C2E] text-white px-3 py-1 rounded-full">Reload</button>
          </div>
        </div>
        <div id="locationTabs" class="flex gap-2 mt-3"></div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
        <div class="lg:col-span-1">
          <div class="bg-white rounded-xl border">
            <div class="p-3 border-b flex justify-between items-center">
              <span class="text-[11px] font-bold">NAMELIST JEMAAH</span>
              <span id="topUnassignedBadge" class="text-[9px] bg-amber-100 px-2 py-0.5 rounded-full">0</span>
            </div>
            <div class="p-2"><input id="searchNamelist" placeholder="Cari jemaah..." class="w-full text-[11px] border rounded-full px-3 py-1.5 mb-2" oninput="renderNamelist()"></div>
            <div id="namelistContainer" class="max-h-[60vh] overflow-y-auto"><div class="p-6 text-center text-[11px] text-slate-400">Memuatkan jemaah...</div></div>
          </div>
          <div class="bg-white rounded-xl border mt-4">
            <div class="p-3 border-b flex justify-between"><span class="text-[11px] font-bold">STAFF / EXTRA</span><span id="staffTotalBadge" class="text-[9px] bg-slate-100 px-2 py-0.5 rounded-full">0</span></div>
            <div class="p-2"><input id="searchStaff" placeholder="Cari staff..." class="w-full text-[11px] border rounded-full px-3 py-1.5 mb-2" oninput="renderStaffList()"></div>
            <div id="staffListContainer" class="max-h-[30vh] overflow-y-auto"></div>
          </div>
        </div>
        <div class="lg:col-span-2"><div id="roomingGrid" class="grid gap-3"></div><div id="roomingGridContainer" class="hidden"></div></div>
      </div>
      <div id="v80-existing" style="display:none;">${existingHTML}</div>
    `;
    setTimeout(()=>{ if(typeof populateRoomingTripDropdown==='function') populateRoomingTripDropdown(); if(typeof fetchRoomingData==='function') fetchRoomingData(); }, 500);
    return true;
  }
  return false;
}
setTimeout(()=>{
  const modul=document.getElementById('modul-rooming');
  console.log('V80 inspect modul-rooming exists:', !!modul, 'len', modul?.innerHTML.length, 'children', modul?.children.length);
  const {namelist,grid}=findRoomingContainers();
  console.log('V80 containers found:', !!namelist, !!grid);
  if(!namelist||!grid){ createMissingRoomingStructure(); } else { if(typeof fetchRoomingData==='function') fetchRoomingData(); }
}, 1500);

function updateStaffTrain(staffId, checked){
  const s=staffList.find(x=>x.id===staffId||x.airtableId===staffId);
  if(!s){ console.warn('updateStaffTrain staff not found', staffId); return; }
  s.train=checked;
  if(!s.fields) s.fields={};
  s.fields['TRAIN']=checked;
  if(typeof saveStaffList==='function') saveStaffList();
  renderStaffList();
  const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base')||localStorage.getItem('effah_base_id');
  const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
  if(base&&pat&&s.airtableId){
    fetch(`https://api.airtable.com/v0/${base}/STAFF%20LIST%20%28ROOMING%29/${s.airtableId}`,{
      method:'PATCH',
      headers:{'Authorization':`Bearer ${pat}`,'Content-Type':'application/json'},
      body: JSON.stringify({fields:{'TRAIN': checked}})
    }).then(r=>r.json()).then(d=>console.log('V98 staff train saved', d)).catch(e=>console.error(e));
  } else {
    console.log('V98 staff train local only', staffId, checked);
  }
}

// ===== V102 RACE FIX - QUEUE PER STAFF ID =====
window._staffPatchQueue = window._staffPatchQueue || {};
window._staffPatchRunning = window._staffPatchRunning || {};

async function _patchStaffRoomIdsQueued(staffId, roomIds){
  if(!window._staffPatchQueue[staffId]) window._staffPatchQueue[staffId] = [];
  return new Promise((resolve, reject)=>{
    window._staffPatchQueue[staffId].push({roomIds, resolve, reject});
    _processStaffQueue(staffId);
  });
}
async function _processStaffQueue(staffId){
  if(window._staffPatchRunning[staffId]) return;
  window._staffPatchRunning[staffId] = true;
  const {base, pat} = (typeof getAirtableConfig==='function'? getAirtableConfig() : {base: window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base'), pat: window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat')});
  while(window._staffPatchQueue[staffId] && window._staffPatchQueue[staffId].length>0){
    const task = window._staffPatchQueue[staffId].shift();
    const staff = (typeof getStaffById==='function'? getStaffById(staffId) : staffList.find(s=>s.id===staffId||s.airtableId===staffId));
    if(!staff || !base || !pat || !staff.airtableId){ task.resolve(); continue; }
    try{
      // Always use latest roomIds from staff object at time of processing, not task.roomIds stale
      const latestIds = staff.roomIds || [];
      let res = await fetch(`https://api.airtable.com/v0/${base}/STAFF%20LIST%20%28ROOMING%29/${staff.airtableId}`,{
        method:'PATCH', headers:{'Authorization':`Bearer ${pat}`,'Content-Type':'application/json'},
        body: JSON.stringify({fields:{'ROOMING LIST': latestIds}})
      });
      let data = await res.json();
      if(data.error){
        console.warn('Staff patch 422 retry', staffId, data.error);
        // retry once after 400ms with latest
        await new Promise(r=>setTimeout(r,400));
        res = await fetch(`https://api.airtable.com/v0/${base}/STAFF%20LIST%20%28ROOMING%29/${staff.airtableId}`,{
          method:'PATCH', headers:{'Authorization':`Bearer ${pat}`,'Content-Type':'application/json'},
          body: JSON.stringify({fields:{'ROOMING LIST': latestIds}})
        });
        data = await res.json();
      }
      task.resolve(data);
    }catch(e){
      console.error('Staff queue patch failed', e);
      task.resolve();
    }
    await new Promise(r=>setTimeout(r,250)); // small gap to avoid Airtable rate limit 422
  }
  window._staffPatchRunning[staffId] = false;
}

async function assignStaffToRoom_FIXED(staffId, roomId){
  const staff = (typeof getStaffById==='function'? getStaffById(staffId) : staffList.find(s=>s.id===staffId||s.airtableId===staffId)); 
  if(!staff) return;
  const rec = allRoomingRecords.find(r=>r.id===roomId); if(!rec) return;
  if(!staff.roomIds) staff.roomIds=[];
  if(!staff.roomIds.includes(roomId)) staff.roomIds.push(roomId);
  staff.roomLink = staff.roomIds[0];
  if(typeof saveStaffList==='function') saveStaffList(); 
  if(typeof renderStaffList==='function') renderStaffList(); 
  if(typeof renderRoomingGrid==='function') renderRoomingGrid(); 
  if(typeof renderLocationTabs==='function') renderLocationTabs();
  // Queue Airtable update, don't await blocking UI
  _patchStaffRoomIdsQueued(staffId, staff.roomIds);
}

async function removeStaffFromRoom_FIXED(roomId, staffId){
  const staff = (typeof getStaffById==='function'? getStaffById(staffId) : staffList.find(s=>s.id===staffId||s.airtableId===staffId));
  if(!staff){
    // fallback: only update local room field if no staff object
    const rec = allRoomingRecords.find(r=>r.id===roomId);
    if(rec && rec.fields['STAFF LIST (ROOMING)']){
      rec.fields['STAFF LIST (ROOMING)'] = (rec.fields['STAFF LIST (ROOMING)']||[]).filter(id=>id!==staffId);
      if(typeof renderRoomingGrid==='function') renderRoomingGrid();
    }
    return;
  }
  const prevLen = (staff.roomIds||[]).length;
  staff.roomIds = (staff.roomIds||[]).filter(id=>id!==roomId);
  staff.roomLink = staff.roomIds.length? staff.roomIds[0] : null;
  console.log(`V102 RACE FIX remove ${staffId} from ${roomId}: ${prevLen} -> ${staff.roomIds.length}`);
  if(typeof saveStaffList==='function') saveStaffList();
  if(typeof renderStaffList==='function') renderStaffList();
  if(typeof renderRoomingGrid==='function') renderRoomingGrid();
  if(typeof renderLocationTabs==='function') renderLocationTabs();
  _patchStaffRoomIdsQueued(staffId, staff.roomIds);
}

// Override original functions
window.assignStaffToRoom = assignStaffToRoom_FIXED;
window.removeStaffFromRoom = removeStaffFromRoom_FIXED;

console.log('V102 RACE FIX loaded - queue per staff');


// V106 SKIP STAFF SIDE
async function removeStaffFromRoom_V106(roomId, staffIdOrName){
  const room = (window.allRoomingRecords||[]).find(r=>r.id===roomId);
  let staff = (window.staffList||[]).find(s=>s.id===staffIdOrName||s.airtableId===staffIdOrName);
  if(!staff){
    const np = staffIdOrName.toString().toUpperCase().split('(')[0].trim();
    staff = (window.staffList||[]).find(s=> (s.name||'').toUpperCase().includes(np));
  }
  const namePart = staff ? (staff.name||'').split('(')[0].trim().toUpperCase() : staffIdOrName.toString().toUpperCase().split('(')[0].trim();
  if(room && room.fields){
    ['STAFF / EXTRA','STAFF TANPA KATIL'].forEach(key=>{
      const val = room.fields[key];
      if(!val) return;
      if(Array.isArray(val)){
        room.fields[key]=val.filter(v=>{ if(typeof v==='string' && namePart && v.toUpperCase().includes(namePart)) return false; return v!==staffIdOrName && v!==staff?.id && v!==staff?.airtableId; });
      } else if(typeof val==='string'){
        room.fields[key]=val.split(',').map(x=>x.trim()).filter(p=>!p.toUpperCase().includes(namePart)).join(', ');
      }
    });
  }
  if(staff && staff.roomIds) staff.roomIds = staff.roomIds.filter(id=>id!==roomId);
  renderRoomingGrid(); renderStaffList();
  const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base');
  const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
  if(base&&pat&&room){
    await fetch(`https://api.airtable.com/v0/${base}/ROOMING%20LIST/${roomId}`,{
      method:'PATCH', headers:{'Authorization':`Bearer ${pat}`,'Content-Type':'application/json'},
      body: JSON.stringify({fields:{'STAFF / EXTRA': room.fields['STAFF / EXTRA']||'', 'STAFF TANPA KATIL': room.fields['STAFF TANPA KATIL']||[]}})
    }).then(r=>console.log('V106 remove room', r.status));
  }
  console.log('V106 skip staff ROOMING LIST patch to avoid 422');
}
window.removeStaffFromRoom = removeStaffFromRoom_V106;
window.removeStaff = (r,s)=>removeStaffFromRoom_V106(r,s);
async function removeStaffTanpaKatilFromRoom_V106(roomId, staffIdOrName){
  const room = (window.allRoomingRecords||[]).find(r=>r.id===roomId);
  let staff = (window.staffList||[]).find(s=>s.id===staffIdOrName||s.airtableId===staffIdOrName);
  if(!staff){
    const np = staffIdOrName.toString().toUpperCase().split('(')[0].trim();
    staff = (window.staffList||[]).find(s=> (s.name||'').toUpperCase().includes(np));
  }
  const aid = staff ? staff.airtableId : staffIdOrName;
  if(room && room.fields && Array.isArray(room.fields['STAFF TANPA KATIL'])){
    room.fields['STAFF TANPA KATIL']=room.fields['STAFF TANPA KATIL'].filter(v=> v!==aid && v!==staffIdOrName && v!==staff?.id);
  }
  if(staff && staff.roomIds) staff.roomIds = staff.roomIds.filter(id=>id!==roomId);
  renderRoomingGrid(); renderStaffList();
  const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base');
  const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
  if(base&&pat&&room){
    await fetch(`https://api.airtable.com/v0/${base}/ROOMING%20LIST/${roomId}`,{
      method:'PATCH', headers:{'Authorization':`Bearer ${pat}`,'Content-Type':'application/json'},
      body: JSON.stringify({fields:{'STAFF TANPA KATIL': room.fields['STAFF TANPA KATIL']||[]}})
    }).then(r=>console.log('V106 remove tanpa', r.status));
  }
}
window.removeStaffTanpaKatilFromRoom = removeStaffTanpaKatilFromRoom_V106;
window.removeTanpaKatilFromRoom = async function(roomId, jId){
  const room = (window.allRoomingRecords||[]).find(r=>r.id===roomId);
  if(room && room.fields && Array.isArray(room.fields['JEMAAH TANPA KATIL'])){
    room.fields['JEMAAH TANPA KATIL']=room.fields['JEMAAH TANPA KATIL'].filter(id=>id!==jId);
  }
  renderRoomingGrid(); renderNamelist(); renderStaffList();
  const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base');
  const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
  if(base&&pat&&room){
    await fetch(`https://api.airtable.com/v0/${base}/ROOMING%20LIST/${roomId}`,{
      method:'PATCH', headers:{'Authorization':`Bearer ${pat}`,'Content-Type':'application/json'},
      body: JSON.stringify({fields:{'JEMAAH TANPA KATIL': room.fields['JEMAAH TANPA KATIL']||[]}})
    });
  }
};
async function clearStaffBoard_V106(staffId){
  const staff = (window.staffList||[]).find(s=>s.id===staffId||s.airtableId===staffId);
  if(!staff) return;
  staff.board = staff.train ? ['TRAIN'] : [];
  staff.boardBasis = [];
  try{ localStorage.setItem('effah_staff_board_'+staffId, JSON.stringify(staff.board)); }catch(e){}
  if(typeof saveStaffList==='function') try{saveStaffList();}catch(e){}
  renderStaffList();
  const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base');
  const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
  if(base&&pat&&staff.airtableId){
    const res = await fetch(`https://api.airtable.com/v0/${base}/STAFF%20LIST%20%28ROOMING%29/${staff.airtableId}`,{
      method:'PATCH', headers:{'Authorization':`Bearer ${pat}`,'Content-Type':'application/json'},
      body: JSON.stringify({fields:{'BOARD BASIS': []}})
    });
    console.log('V106 board cleared', res.status);
  }
}
window.clearBoardMulti = clearStaffBoard_V106;
window.clearStaffBoardMulti = clearStaffBoard_V106;
async function updateStaffBoard_V106(staffId, value){
  const staff = (window.staffList||[]).find(s=>s.id===staffId||s.airtableId===staffId);
  if(!staff) return;
  if(value==='-'||value.startsWith('-')) staff.board = staff.train ? ['TRAIN'] : [];
  else staff.board = staff.train ? [value,'TRAIN'] : [value];
  staff.boardBasis = staff.board.filter(b=>b!=='TRAIN');
  try{ localStorage.setItem('effah_staff_board_'+staffId, JSON.stringify(staff.board)); }catch(e){}
  if(typeof saveStaffList==='function') try{saveStaffList();}catch(e){}
  renderStaffList();
  const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base');
  const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
  if(base&&pat&&staff.airtableId){
    const boardToSave = staff.board.filter(b=>b!=='TRAIN');
    await fetch(`https://api.airtable.com/v0/${base}/STAFF%20LIST%20%28ROOMING%29/${staff.airtableId}`,{
      method:'PATCH', headers:{'Authorization':`Bearer ${pat}`,'Content-Type':'application/json'},
      body: JSON.stringify({fields:{'BOARD BASIS': boardToSave}})
    }).then(r=>console.log('V106 board update', r.status, boardToSave));
  }
}
window.updateStaffBoardSingle = updateStaffBoard_V106;
window.toggleStaffBoardMulti = async function(staffId, boardVal){
  const staff = (window.staffList||[]).find(s=>s.id===staffId||s.airtableId===staffId);
  if(!staff) return;
  if(!staff.board) staff.board=[];
  const idx = staff.board.indexOf(boardVal);
  if(idx>=0) staff.board.splice(idx,1); else staff.board.push(boardVal);
  staff.boardBasis = staff.board.filter(b=>b!=='TRAIN');
  try{ localStorage.setItem('effah_staff_board_'+staffId, JSON.stringify(staff.board)); }catch(e){}
  renderStaffList();
  const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base');
  const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
  if(base&&pat&&staff.airtableId){
    const boardToSave = staff.board.filter(b=>b!=='TRAIN');
    await fetch(`https://api.airtable.com/v0/${base}/STAFF%20LIST%20%28ROOMING%29/${staff.airtableId}`,{
      method:'PATCH', headers:{'Authorization':`Bearer ${pat}`,'Content-Type':'application/json'},
      body: JSON.stringify({fields:{'BOARD BASIS': boardToSave}})
    }).then(r=>console.log('V106 toggle', r.status, boardToSave));
  }
};
async function addStaffTanpaKatil_V106(roomId, staffId){
  const room = (window.allRoomingRecords||[]).find(r=>r.id===roomId);
  let staff = (window.staffList||[]).find(s=>s.id===staffId||s.airtableId===staffId);
  const aid = staff ? staff.airtableId : staffId;
  if(!room) return;
  if(!room.fields['STAFF TANPA KATIL']) room.fields['STAFF TANPA KATIL']=[];
  if(!room.fields['STAFF TANPA KATIL'].includes(aid)) room.fields['STAFF TANPA KATIL'].push(aid);
  renderRoomingGrid(); renderStaffList();
  const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base');
  const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
  if(base&&pat){
    await fetch(`https://api.airtable.com/v0/${base}/ROOMING%20LIST/${roomId}`,{
      method:'PATCH', headers:{'Authorization':`Bearer ${pat}`,'Content-Type':'application/json'},
      body: JSON.stringify({fields:{'STAFF TANPA KATIL': room.fields['STAFF TANPA KATIL']}})
    }).then(r=>console.log('V106 assign tanpa', r.status));
  }
}
window.addTanpaKatilToRoom = async function(roomId, jemaahId){
  const isStaff = (window.staffList||[]).some(s=>s.id===jemaahId||s.airtableId===jemaahId);
  if(isStaff) return addStaffTanpaKatil_V106(roomId, jemaahId);
  const room = (window.allRoomingRecords||[]).find(r=>r.id===roomId);
  if(room){
    if(!room.fields['JEMAAH TANPA KATIL']) room.fields['JEMAAH TANPA KATIL']=[];
    if(!room.fields['JEMAAH TANPA KATIL'].includes(jemaahId)) room.fields['JEMAAH TANPA KATIL'].push(jemaahId);
    renderRoomingGrid(); renderNamelist();
    const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base');
    const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
    if(base&&pat){
      await fetch(`https://api.airtable.com/v0/${base}/ROOMING%20LIST/${roomId}`,{
        method:'PATCH', headers:{'Authorization':`Bearer ${pat}`,'Content-Type':'application/json'},
        body: JSON.stringify({fields:{'JEMAAH TANPA KATIL': room.fields['JEMAAH TANPA KATIL']}})
      });
    }
  }
};
console.log('V106 LOADED');

// ===== V107 FINAL - PAKEJ CUSTOM SINGLE SELECT + BOARD CLEAR STAY OPEN =====

const PAKEJ_ORDER_V107 = ['JIMAT EKONOMI','JIMAT STANDARD','JIMAT PREMIUM','EKONOMI LITE','EKONOMI','STANDARD','PREMIUM','PREMIUM PLUS'];
const PAKEJ_COLORS_V107 = {
  'JIMAT EKONOMI': '#E8E8E8',
  'JIMAT STANDARD': '#FFF8DC',
  'JIMAT PREMIUM': '#FFE4D6',
  'EKONOMI LITE': '#FFD6E7',
  'EKONOMI': '#DBEAFE',
  'STANDARD': '#D1FAE5',
  'PREMIUM': '#BFDBFE',
  'PREMIUM PLUS': '#F3E8FF'
};

function closeAllDropdowns_V107(){
  document.querySelectorAll('[id^="boardDrop-"]').forEach(el=>el.classList.add('hidden'));
  document.querySelectorAll('[id^="staffBoardDrop-"]').forEach(el=>el.classList.add('hidden'));
  document.querySelectorAll('[id^="insuranDrop-"]').forEach(el=>el.classList.add('hidden'));
  document.querySelectorAll('[id^="pakejDrop-"]').forEach(el=>el.classList.add('hidden'));
  document.querySelectorAll('[id^="hotelPakejDrop-"]').forEach(el=>el.classList.add('hidden'));
}

function toggleBoardDropdown_V107(jId){
  const drop = document.getElementById('boardDrop-'+jId);
  const isHidden = drop ? drop.classList.contains('hidden') : true;
  closeAllDropdowns_V107();
  if(drop && isHidden) drop.classList.remove('hidden');
}
window.toggleBoardDropdown = toggleBoardDropdown_V107;
function closeBoardDropdown(jId){
  const drop = document.getElementById('boardDrop-'+jId);
  if(drop) drop.classList.add('hidden');
}
window.closeBoardDropdown = closeBoardDropdown;

function clearBoardMulti_V107(jId){
  const jRec = (window.allRoomingJemaah||[]).find(j=>j.id===jId);
  if(jRec){
    jRec.fields['BOARD BASIS'] = [];
  }
  const sRec = (window.staffList||[]).find(s=>s.id===jId||s.airtableId===jId);
  if(sRec){
    sRec.board = sRec.train ? ['TRAIN'] : [];
    sRec.boardBasis = [];
    try{ localStorage.setItem('effah_staff_board_'+jId, JSON.stringify(sRec.board)); }catch(e){}
    if(typeof saveStaffList==='function') try{saveStaffList();}catch(e){}
  }
  renderNamelist(); renderStaffList();
  // Stay open
  const drop = document.getElementById('boardDrop-'+jId);
  if(drop) drop.classList.remove('hidden');
  const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base');
  const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
  if(base&&pat){
    const idToPatch = jRec ? jId : (sRec?.airtableId||jId);
    const table = jRec ? 'JEMAAH' : 'STAFF%20LIST%20%28ROOMING%29';
    fetch(`https://api.airtable.com/v0/${base}/${table}/${idToPatch}`,{
      method:'PATCH', headers:{'Authorization':`Bearer ${pat}`,'Content-Type':'application/json'},
      body: JSON.stringify({fields:{'BOARD BASIS': []}})
    }).then(r=>console.log('V107 clear board', r.status));
  }
}
window.clearBoardMulti = clearBoardMulti_V107;

function toggleBoardMulti_V107(jId, boardVal){
  const jRec = (window.allRoomingJemaah||[]).find(j=>j.id===jId);
  if(jRec){
    if(!jRec.fields['BOARD BASIS']) jRec.fields['BOARD BASIS']=[];
    if(!Array.isArray(jRec.fields['BOARD BASIS'])) jRec.fields['BOARD BASIS']=[jRec.fields['BOARD BASIS']].filter(Boolean);
    const idx = jRec.fields['BOARD BASIS'].indexOf(boardVal);
    if(idx>=0) jRec.fields['BOARD BASIS'].splice(idx,1); else jRec.fields['BOARD BASIS'].push(boardVal);
    renderNamelist();
    const drop = document.getElementById('boardDrop-'+jId);
    if(drop) drop.classList.remove('hidden'); // stay open
    const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base');
    const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
    if(base&&pat){
      fetch(`https://api.airtable.com/v0/${base}/JEMAAH/${jId}`,{
        method:'PATCH', headers:{'Authorization':`Bearer ${pat}`,'Content-Type':'application/json'},
        body: JSON.stringify({fields:{'BOARD BASIS': jRec.fields['BOARD BASIS']}})
      });
    }
  } else {
    const sRec = (window.staffList||[]).find(s=>s.id===jId||s.airtableId===jId);
    if(sRec){
      if(!sRec.board) sRec.board=[];
      const idx = sRec.board.indexOf(boardVal);
      if(idx>=0) sRec.board.splice(idx,1); else sRec.board.push(boardVal);
      sRec.boardBasis = sRec.board.filter(b=>b!=='TRAIN');
      try{ localStorage.setItem('effah_staff_board_'+jId, JSON.stringify(sRec.board)); }catch(e){}
      renderStaffList();
      const drop = document.getElementById('boardDrop-'+jId);
      if(drop) drop.classList.remove('hidden');
      const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base');
      const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
      if(base&&pat&&sRec.airtableId){
        fetch(`https://api.airtable.com/v0/${base}/STAFF%20LIST%20%28ROOMING%29/${sRec.airtableId}`,{
          method:'PATCH', headers:{'Authorization':`Bearer ${pat}`,'Content-Type':'application/json'},
          body: JSON.stringify({fields:{'BOARD BASIS': sRec.boardBasis}})
        });
      }
    }
  }
}
window.toggleBoardMulti = toggleBoardMulti_V107;

// PAKEJ DROPDOWN
function togglePakejDropdown_V107(jId){
  const drop = document.getElementById('pakejDrop-'+jId);
  const isHidden = drop ? drop.classList.contains('hidden') : true;
  closeAllDropdowns_V107();
  if(drop && isHidden) drop.classList.remove('hidden');
}
window.togglePakejDropdown = togglePakejDropdown_V107;

function closePakejDropdown_V107(jId){
  const drop = document.getElementById('pakejDrop-'+jId);
  if(drop) drop.classList.add('hidden');
}
window.closePakejDropdown = closePakejDropdown_V107;

function selectPakej_V107(jId, pakej){
  const jRec = (window.allRoomingJemaah||[]).find(j=>j.id===jId);
  if(jRec){
    jRec.fields['PAKEJ'] = pakej;
  }
  // Keep dropdown open, only update UI
  const btn = document.querySelector(`button[onclick="togglePakejDropdown_V107('${jId}')"]`) || document.getElementById('pakejBtn-'+jId);
  // Re-render to update colors but keep dropdown open
  const drop = document.getElementById('pakejDrop-'+jId);
  const wasOpen = drop && !drop.classList.contains('hidden');
  renderNamelist();
  const newDrop = document.getElementById('pakejDrop-'+jId);
  if(newDrop && wasOpen) newDrop.classList.remove('hidden');
  const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base');
  const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
  if(base&&pat&&jRec){
    fetch(`https://api.airtable.com/v0/${base}/JEMAAH/${jId}`,{
      method:'PATCH', headers:{'Authorization':`Bearer ${pat}`,'Content-Type':'application/json'},
      body: JSON.stringify({fields:{'PAKEJ': pakej}})
    }).then(r=>console.log('pakej saved', r.status, pakej));
  }
}
window.selectPakej = selectPakej_V107;

function clearPakej_V107(jId){
  const jRec = (window.allRoomingJemaah||[]).find(j=>j.id===jId);
  if(jRec) jRec.fields['PAKEJ']='';
  const drop = document.getElementById('pakejDrop-'+jId);
  const wasOpen = drop && !drop.classList.contains('hidden');
  renderNamelist();
  const newDrop = document.getElementById('pakejDrop-'+jId);
  if(newDrop && wasOpen) newDrop.classList.remove('hidden');
  const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base');
  const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
  if(base&&pat){
    fetch(`https://api.airtable.com/v0/${base}/JEMAAH/${jId}`,{
      method:'PATCH', headers:{'Authorization':`Bearer ${pat}`,'Content-Type':'application/json'},
      body: JSON.stringify({fields:{'PAKEJ': ''}})
    });
  }
}
window.clearPakej = clearPakej_V107;

// HOTEL PAKEJ
function toggleHotelPakejDropdown_V107(roomId){
  const drop = document.getElementById('hotelPakejDrop-'+roomId);
  const isHidden = drop ? drop.classList.contains('hidden') : true;
  closeAllDropdowns_V107();
  if(drop && isHidden) drop.classList.remove('hidden');
}
window.toggleHotelPakejDropdown = toggleHotelPakejDropdown_V107;

function closeHotelPakejDropdown_V107(roomId){
  const drop = document.getElementById('hotelPakejDrop-'+roomId);
  if(drop) drop.classList.add('hidden');
}
window.closeHotelPakejDropdown = closeHotelPakejDropdown_V107;

function selectHotelPakej_V107(roomId, pakej){
  const room = (window.allRoomingRecords||[]).find(r=>r.id===roomId);
  if(room) room.fields['PAKEJ / HOTEL'] = pakej;
  const drop = document.getElementById('hotelPakejDrop-'+roomId);
  const wasOpen = drop && !drop.classList.contains('hidden');
  renderRoomingGrid();
  const newDrop = document.getElementById('hotelPakejDrop-'+roomId);
  if(newDrop && wasOpen) newDrop.classList.remove('hidden');
  const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base');
  const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
  if(base&&pat&&room){
    fetch(`https://api.airtable.com/v0/${base}/ROOMING%20LIST/${roomId}`,{
      method:'PATCH', headers:{'Authorization':`Bearer ${pat}`,'Content-Type':'application/json'},
      body: JSON.stringify({fields:{'PAKEJ / HOTEL': pakej}})
    }).then(r=>console.log('hotel pakej saved', r.status));
  }
}
window.selectHotelPakej = selectHotelPakej_V107;

function clearHotelPakej_V107(roomId){
  const room = (window.allRoomingRecords||[]).find(r=>r.id===roomId);
  if(room) room.fields['PAKEJ / HOTEL']='';
  renderRoomingGrid();
  const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base');
  const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
  if(base&&pat&&room){
    fetch(`https://api.airtable.com/v0/${base}/ROOMING%20LIST/${roomId}`,{
      method:'PATCH', headers:{'Authorization':`Bearer ${pat}`,'Content-Type':'application/json'},
      body: JSON.stringify({fields:{'PAKEJ / HOTEL': ''}})
    });
  }
}
window.clearHotelPakej = clearHotelPakej_V107;

// Click outside to close, but click inside stays open
document.removeEventListener('click', window._v107OutsideHandler);
window._v107OutsideHandler = function(e){
  const isBtn = e.target.closest('button[onclick*="toggleBoardDropdown"]') || e.target.closest('button[onclick*="togglePakejDropdown"]') || e.target.closest('button[onclick*="toggleHotelPakejDropdown"]') || e.target.closest('button[onclick*="toggleInsuranDropdown"]');
  const isInside = e.target.closest('[id^="boardDrop-"]') || e.target.closest('[id^="pakejDrop-"]') || e.target.closest('[id^="hotelPakejDrop-"]') || e.target.closest('[id^="insuranDrop-"]') || e.target.closest('[id^="staffBoardDrop-"]');
  if(!isBtn && !isInside){
    closeAllDropdowns_V107();
  }
};
document.addEventListener('click', window._v107OutsideHandler);

// Override renderNamelist to use custom pakej dropdown
const origRenderNamelist_V107 = window.renderNamelist;
window.renderNamelist = function(){
  const cont=document.getElementById('namelistContainer'); if(!cont) return;
  const q=(document.getElementById('searchRoomingJemaah')?.value||'').toLowerCase();
  const pakejFilter=(document.getElementById('filterPakejRooming')?.value||'').toUpperCase();
  let filtered=[...allRoomingJemaah];
  if(q) filtered=filtered.filter(r=> (typeof getJemaahName==='function'? getJemaahName(r.fields) : '').toLowerCase().includes(q));
  if(pakejFilter) filtered=filtered.filter(r=> (r.fields['PAKEJ']||'').toUpperCase()===pakejFilter);
  if(typeof roomingSortActive!=='undefined' && roomingSortActive){
    filtered.sort((a,b)=>{
      const nameA=(typeof getJemaahName==='function'? getJemaahName(a.fields) : '').toUpperCase();
      const nameB=(typeof getJemaahName==='function'? getJemaahName(b.fields) : '').toUpperCase();
      if((typeof roomingSortDir!=='undefined'? roomingSortDir : 'asc')==='asc') return nameA.localeCompare(nameB);
      else return nameB.localeCompare(nameA);
    });
  }
  if(filtered.length===0 && allRoomingJemaah.length===0){ cont.innerHTML='<div class="p-6 text-center text-[11px] text-slate-400">Tiada jemaah untuk trip ini</div>'; return; }
  cont.innerHTML=filtered.map((r,i)=>{
    const name=typeof getJemaahName==='function'? getJemaahName(r.fields) : '-';
    const assignedNormalInLoc=typeof isJemaahAssignedInLocation==='function'? isJemaahAssignedInLocation(r.id, activeLocation) : false;
    const assignedTanpaInLoc=allRoomingRecords.some(rec=> (rec.fields['LOKASI / CITY']||'MEKAH').toUpperCase()===(typeof activeLocation!=='undefined'? activeLocation : 'MEKAH').toUpperCase() && ((rec.fields['JEMAAH TANPA KATIL']||[]).includes(r.id)));
    const assignedInLoc = assignedNormalInLoc || assignedTanpaInLoc;
    const assignedGlobal=typeof isJemaahAssignedAny==='function'? isJemaahAssignedAny(r.id) : false;
    const rowCls=assignedInLoc?'bg-slate-100 text-slate-500':'hover:bg-slate-50';
    const drag=assignedInLoc?'':`draggable="true" ondragstart="dragJemaah(event,'${r.id}')" ondragend="dragEnd(event)"`;
    let statusIcon = assignedInLoc? `<button onclick="removeJemaahFromCurrentLoc('${r.id}')" class="w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-[10px]">✕</button>` : `<button onclick="quickAssign('${r.id}')" class="w-5 h-5 rounded-full border bg-slate-100 text-[10px]">+</button>`;
    if(!assignedInLoc && assignedGlobal) statusIcon = `<button onclick="quickAssign('${r.id}')" class="w-5 h-5 rounded-full border bg-amber-100 text-[10px]" title="Sudah ada di lokasi lain">+</button>`;
    const fbArr = typeof getBoardArray==='function'? getBoardArray(r.fields) : [];
    const fbDisplay = fbArr.length ? fbArr.join(', ') : '-';
    let fbCls='bg-white border-slate-200';
    if(fbArr.some(x=>x.includes('MEKAH'))) fbCls='bg-orange-100 border-orange-200 text-orange-800';
    else if(fbArr.some(x=>x.includes('MADINAH'))) fbCls='bg-blue-100 border-blue-200 text-blue-800';
    else if(fbArr.includes('FULLBOARD')) fbCls='bg-emerald-100 border-emerald-200 text-emerald-800';
    else if(fbArr.length===0) fbCls='bg-white border-dashed border-slate-300 text-slate-400';
    const boardOptions = ['FULLBOARD','FULLBOARD (MEKAH)','BB (MEKAH)','FULLBOARD (MADINAH)','BB (MADINAH)'];
    const boardCheckboxes = boardOptions.map(opt=>{
      const checked=fbArr.includes(opt);
      return `<label class="flex items-center gap-1.5 px-2 py-1 hover:bg-slate-50 rounded text-[10px] cursor-pointer" onclick="event.stopPropagation()"><input type="checkbox" ${checked?'checked':''} onchange="toggleBoardMulti_V107('${r.id}','${opt}')" class="w-3 h-3 accent-[#7A0C2E]"> ${opt}</label>`;
    }).join('');
    const insArr = typeof getInsuranArray==='function'? getInsuranArray(r.fields) : [];
    const insToggle = ['TAKAFUL','ETIQA','AL-KHAIRI'].map(opt=>{
      const active = insArr.includes(opt);
      let cls = 'bg-white text-slate-400 border-slate-200';
      if(active){
        if(opt==='TAKAFUL') cls='bg-emerald-500 text-white border-emerald-600';
        else if(opt==='ETIQA') cls='bg-amber-300 text-amber-900 border-amber-400';
        else if(opt==='AL-KHAIRI') cls='bg-blue-400 text-white border-blue-500';
      }
      const label = opt==='TAKAFUL'?'TAK':opt==='AL-KHAIRI'?'KHAIRI':opt;
      return `<button onclick="toggleInsuran('${r.id}','${opt}')" class="px-1 py-0.5 rounded-full border text-[7px] font-bold ${cls}">${label}</button>`;
    }).join('');
    const pk = r.fields['PAKEJ'] || '';
    const pkColor = PAKEJ_COLORS_V107[pk] || '#FFFFFF';
    const pkDisplay = pk || 'EKONOMI';
    // PAKEJ CUSTOM DROPDOWN - single select with colors like image 2
    const pakejDropdown = `<div class="relative"><button id="pakejBtn-${r.id}" onclick="event.stopPropagation(); togglePakejDropdown_V107('${r.id}')" class="w-full text-[9px] border rounded-full px-2.5 py-1.5 font-bold text-left flex items-center justify-between" style="background:${pkColor}; border-color:${pkColor}; color:#1F2937"><span class="truncate">${pkDisplay}</span><span>▼</span></button><div id="pakejDrop-${r.id}" class="hidden absolute z-[9999] mt-1 w-48 bg-white border border-slate-300 rounded-xl shadow-2xl p-1" onclick="event.stopPropagation()">${PAKEJ_ORDER_V107.map(o=>{
      const c = PAKEJ_COLORS_V107[o];
      const isSel = pk===o;
      return `<div onclick="selectPakej_V107('${r.id}','${o}')" class="flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-50 cursor-pointer text-[11px] rounded-lg ${isSel?'bg-slate-100 font-bold':''}"><span class="w-4 h-4 rounded-full flex items-center justify-center text-[9px] border" style="background:${c}; border-color:${c}">${isSel?'✓':''}</span> ${o} <span class="ml-auto text-slate-400">${isSel?'':''}×</span></div>`;
    }).join('')}<div class="flex justify-between gap-1 mt-1 pt-1 border-t bg-white"><button onclick="clearPakej_V107('${r.id}')" class="text-[9px] px-3 py-1 rounded-full bg-slate-100">Clear</button><button onclick="closePakejDropdown_V107('${r.id}')" class="text-[9px] px-3 py-1 rounded-full bg-[#7A0C2E] text-white">OK</button></div></div></div>`;

    const trChecked = typeof isTrainChecked==='function'? isTrainChecked(r.fields) : false;
    return `<div ${drag} class="grid grid-cols-12 items-center px-1.5 py-1.5 text-[11px] border-b border-slate-50 ${rowCls}">
      <div class="col-span-1 text-slate-400 text-[10px]">${String(i+1).padStart(2,'0')}</div>
      <div class="col-span-3 font-medium truncate text-[10px] ${assignedInLoc?'text-slate-500 italic':''}" title="${name}">${name}</div>
      <div class="col-span-2 flex items-center gap-0.5 relative">
        <div class="relative w-full">
          <button onclick="event.stopPropagation(); toggleBoardDropdown_V107('${r.id}')" class="text-[8px] border rounded-full px-2 py-1 font-bold ${fbCls} outline-none w-full truncate text-left flex items-center justify-between bg-white" style="opacity:1;">
            <span class="truncate">${fbDisplay}</span><span class="ml-1">▼</span>
          </button>
          <div id="boardDrop-${r.id}" class="hidden absolute left-0 top-full mt-1 w-[190px] bg-white border border-slate-200 rounded-xl shadow-xl z-[9999] p-1" onclick="event.stopPropagation()">
            ${boardCheckboxes}
            <div class="border-t border-slate-100 mt-1 pt-1 flex justify-between">
              <button onclick="clearBoardMulti_V107('${r.id}')" class="text-[8px] px-2 py-0.5 rounded-full bg-slate-100">Clear</button>
              <button onclick="closeBoardDropdown('${r.id}')" class="text-[8px] px-2 py-0.5 rounded-full bg-[#7A0C2E] text-white">OK</button>
            </div>
            <div class="text-[7px] text-slate-400 px-2 mt-1">Boleh pilih 2: BB (MEKAH) + FB (MADINAH)</div>
          </div>
        </div>
      </div>
      <div class="col-span-1 text-center">
        <input type="checkbox" ${trChecked?'checked':''} onchange="updateJemaahCheckbox('${r.id}','TRAIN',this.checked)" class="w-3.5 h-3.5 accent-[#7A0C2E] rounded">
      </div>
      <div class="col-span-3 flex items-center gap-0.5 flex-wrap justify-center">
        ${insToggle}
      </div>
      <div class="col-span-1 flex items-center gap-0.5">
        ${pakejDropdown}
      </div>
      <div class="col-span-1 flex justify-center">${statusIcon}</div>
    </div>`;
  }).join('');
};

// Also patch hotel pakej in room grid - need to override renderRoomingGrid partially
const origRenderRoomingGrid = window.renderRoomingGrid;
window.renderRoomingGrid = function(){
  if(origRenderRoomingGrid) origRenderRoomingGrid();
  // Now replace hotel pakej selects with custom dropdowns
  setTimeout(()=>{
    (window.allRoomingRecords||[]).forEach(room=>{
      const container = document.getElementById('hotelPakejContainer-'+room.id);
      if(!container) return;
      const current = room.fields['PAKEJ / HOTEL'] || 'EKONOMI';
      const color = PAKEJ_COLORS_V107[current] || '#FFFFFF';
      container.innerHTML = `<div class="relative"><button onclick="event.stopPropagation(); toggleHotelPakejDropdown_V107('${room.id}')" class="w-full text-[10px] border rounded-full px-3 py-1.5 font-bold flex items-center justify-between" style="background:${color}; border-color:${color}"><span>${current}</span><span>▼</span></button><div id="hotelPakejDrop-${room.id}" class="hidden absolute z-[9999] mt-1 w-48 bg-white border border-slate-300 rounded-xl shadow-2xl p-1" onclick="event.stopPropagation()">${PAKEJ_ORDER_V107.map(o=>{
        const c = PAKEJ_COLORS_V107[o];
        const isSel = current===o;
        return `<div onclick="selectHotelPakej_V107('${room.id}','${o}')" class="flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-50 cursor-pointer text-[11px] rounded-lg ${isSel?'bg-slate-100 font-bold':''}"><span class="w-4 h-4 rounded-full border" style="background:${c}; border-color:${c}"></span> ${o} <span class="ml-auto">${isSel?'✓':'×'}</span></div>`;
      }).join('')}<div class="flex justify-between gap-1 mt-1 pt-1 border-t"><button onclick="clearHotelPakej_V107('${room.id}')" class="text-[9px] px-3 py-1 rounded-full bg-slate-100">Clear</button><button onclick="closeHotelPakejDropdown_V107('${room.id}')" class="text-[9px] px-3 py-1 rounded-full bg-[#7A0C2E] text-white">OK</button></div></div></div>`;
    });
  }, 50);
};

console.log('V107 FINAL LOADED - pakej custom + board clear stay open + outside click');
