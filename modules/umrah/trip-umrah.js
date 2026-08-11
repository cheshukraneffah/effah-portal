// trip-umrah.js - FIXED LIST TAK MUNCUL (40) + Floating Popup + Modal + Dynamic Index
let allTripUmrahRecords = [];
let selectedTripRecord = null;
let currentTripJemaahData = [];
let selectOptions = {
    group: ['GROUP A', 'GROUP B'],
    sektor: ['KUL-JED/JED-KUL', 'KUL-JED/MED-KUL', 'KUL-MED/JED-KUL', 'KUL-MED/MED-KUL', 'KUL-TIF/MED-JED'],
    penerbangan: ['OMAN AIR', 'EMIRATES', 'QATAR AIRWAYS', 'SAUDIA'],
    musim: ['LOW SEASON', 'MID SEASON', 'HIGH SEASON'],
    tempoh: ['11H 9M', '12H 10M', '9H 7M', '13H 10M', '17H 15M', '10H 7M']
};
function cleanTripName(tripName){ if(!tripName) return 'TBC'; return tripName.replace(/^[\d\/]+\s*\|\s*/i, '').trim(); }
function normalizeDashFormat(str){ if(!str) return ''; return str.trim().toUpperCase().replace(/\//g,' - ').replace(/\s*-\s*/g,' - ').replace(/\s+/g,' ').trim(); }
document.addEventListener('DOMContentLoaded', ()=>{ renderTripUmrahHTML(); });

function renderTripUmrahHTML(){
    const container=document.getElementById('modul-pakej-umrah'); if(!container) return;
    container.innerHTML=`
        <div class="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-140px)]">
            <div class="w-full lg:w-80 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex flex-col flex-shrink-0">
                <div class="flex items-center space-x-2 mb-3">
                    <div class="relative flex-1">
                        <i class="fa-solid fa-magnifying-glass absolute left-3 top-3 text-slate-400 text-xs"></i>
                        <input type="text" id="searchTripSidebar" onkeyup="filterTripSidebar()" placeholder="Search..." class="w-full text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400">
                    </div>
                    <button onclick="openNewTripModal()" class="bg-slate-900 text-white w-8 h-8 rounded-xl flex items-center justify-center hover:bg-black transition text-xs"><i class="fa-solid fa-plus"></i></button>
                    <button onclick="fetchTripUmrahData()" class="bg-slate-100 text-slate-600 w-8 h-8 rounded-xl flex items-center justify-center hover:bg-slate-200 transition text-xs"><i class="fa-solid fa-rotate"></i></button>
                </div>
                <div id="tripSidebarContainer" class="space-y-2 overflow-y-auto flex-1 max-h-[75vh] pr-1"><div class="text-center py-10 text-slate-400 text-xs">Loading...</div></div>
            </div>
            <div class="flex-1 flex flex-col space-y-6 overflow-x-hidden" id="tripMainDetailWorkspace">
                <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-12 text-center text-slate-400 my-auto">
                    <i class="fa-solid fa-kaaba text-5xl mb-3 text-slate-200"></i>
                    <p class="text-xs font-semibold">Sila pilih trip di kiri untuk lihat perincian & data jemaah.</p>
                </div>
            </div>
        </div>
        <div id="newTripModal" class="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 hidden"><div class="bg-white rounded-3xl shadow-2xl p-6 max-w-md w-full border"><div class="flex justify-between pb-4 mb-4 border-b"><h3 class="font-extrabold">Tambah Trip Umrah Baru</h3><button onclick="closeNewTripModal()"><i class="fa-solid fa-xmark"></i></button></div><form onsubmit="submitNewTripRecord(event)" class="space-y-4 text-xs"><div><label class="font-bold">Mula Pakej *</label><input type="date" id="modalMulaPakej" onchange="handleMulaDateChange()" required class="w-full p-2.5 border rounded-xl"></div><div><label class="font-bold">Tamat Pakej *</label><input type="date" id="modalTamatPakej" required class="w-full p-2.5 border rounded-xl"></div><div class="flex gap-3 pt-3"><button type="button" onclick="closeNewTripModal()" class="flex-1 bg-slate-100 py-2.5 rounded-xl font-bold">Batal</button><button type="submit" class="flex-1 bg-slate-900 text-white py-2.5 rounded-xl font-bold">Cipta Trip</button></div></form></div></div>
        <div id="tripAddCustomerModal" class="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 hidden"><div class="bg-white rounded-3xl shadow-2xl max-w-lg w-full border max-h-[90vh] overflow-y-auto"><div class="p-6 border-b flex justify-between items-center sticky top-0 bg-white rounded-t-3xl"><div><h3 class="font-extrabold text-slate-900">TAMBAH JEMAAH BAHARU</h3><p class="text-[11px] text-slate-500 mt-1" id="tripAddCustomerSub">Trip: -</p></div><button onclick="closeTripAddCustomerModal()" class="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center hover:bg-slate-200"><i class="fa-solid fa-xmark"></i></button></div><form id="tripAddCustomerForm" class="p-6 space-y-4 text-xs" onsubmit="submitTripAddCustomer(event)"><div><label class="font-bold uppercase text-slate-500">NAME *</label><input type="text" name="NAME" required placeholder="NAMA PENUH" class="w-full p-3 border border-slate-300 rounded-xl font-bold uppercase focus:ring-2 focus:ring-slate-900 focus:outline-none"></div><div class="grid grid-cols-2 gap-3"><div><label class="font-bold uppercase text-slate-500">IC NO.</label><input type="text" name="IC NO." class="w-full p-2.5 border rounded-xl"></div><div><label class="font-bold uppercase text-slate-500">PASSPORT NO.</label><input type="text" name="PASSPORT NO." class="w-full p-2.5 border rounded-xl font-bold uppercase"></div></div><div class="grid grid-cols-2 gap-3"><div><label class="font-bold uppercase text-slate-500">GENDER</label><select name="GENDER" class="w-full p-2.5 border rounded-xl font-bold"><option value="">-- Pilih --</option><option value="MALE">MALE</option><option value="FEMALE">FEMALE</option></select></div><div><label class="font-bold uppercase text-slate-500">NATIONALITY</label><select name="NATIONALITY" class="w-full p-2.5 border rounded-xl font-bold"><option value="MALAYSIA" selected>MALAYSIA</option><option value="INDONESIA">INDONESIA</option></select></div></div><div><label class="font-bold uppercase text-slate-500">TRIP</label><input type="text" id="tripAddCustomerTripDisplay" disabled class="w-full p-2.5 bg-slate-100 border rounded-xl font-bold"><input type="hidden" id="tripAddCustomerTripId"></div><div><label class="font-bold uppercase text-slate-500">NOTES</label><textarea name="Notes" rows="2" class="w-full p-2.5 border rounded-xl"></textarea></div><button type="submit" id="btnSubmitTripCustomer" class="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-black transition"><i class="fa-solid fa-plus mr-1"></i> Tambah Jemaah</button></form></div></div>
    `;
    fetchTripUmrahData();
    ensureJemaahDataLoaded();
}

async function ensureJemaahDataLoaded(){
    if(typeof allJemaahUmrahRecords!=='undefined' && allJemaahUmrahRecords.length>0) return;
    const PAT = window.AIRTABLE_PAT || localStorage.getItem('effah_api_pat') || '';
    const BASE = window.AIRTABLE_BASE_ID || localStorage.getItem('effah_base_id') || '';
    if(!PAT||!BASE) return;
    try{
        let all=[]; let offset='';
        do{
          let url=`https://api.airtable.com/v0/${BASE}/DATA%20JEMAAH%20UMRAH?pageSize=100`+(offset?`&offset=${offset}`:'');
          const res=await fetch(url,{headers:{Authorization:`Bearer ${PAT}`}});
          const data=await res.json(); if(data.error) throw new Error(data.error.message);
          all=all.concat(data.records||[]); offset=data.offset||'';
        }while(offset);
        if(typeof allJemaahUmrahRecords==='undefined') window.allJemaahUmrahRecords=all;
        else allJemaahUmrahRecords=all;
        localStorage.setItem('cache_jemaah_records', JSON.stringify(all));
        if(selectedTripRecord) renderTripDetailForm(selectedTripRecord);
    }catch(e){ console.error('Failed to fetch jemaah for trip tab', e); }
}

async function fetchTripUmrahData(){
    const PAT = window.AIRTABLE_PAT || localStorage.getItem('effah_api_pat') || '';
    const BASE = window.AIRTABLE_BASE_ID || localStorage.getItem('effah_base_id') || '';
    try{
        let all=[]; let offset='';
        do{
          let url=`https://api.airtable.com/v0/${BASE}/PAKEJ%20UMRAH?sort[0][field]=Mula%20Pakej&sort[0][direction]=asc&pageSize=100`+(offset?`&offset=${offset}`:'');
          const res=await fetch(url,{headers:{Authorization:`Bearer ${PAT}`}});
          const data=await res.json(); if(data.error) throw new Error(data.error.message);
          all=all.concat(data.records||[]); offset=data.offset||'';
        }while(offset);
        allTripUmrahRecords=all; extractDynamicOptions(all);
        renderTripSidebarList(all); if(all.length>0 && !selectedTripRecord) renderTripDetailForm(all[0]);
    }catch(e){ const c=document.getElementById('tripSidebarContainer'); if(c) c.innerHTML='<div class="text-rose-500 text-xs text-center py-10">'+e.message+'</div>'; }
}

function renderTripSidebarList(records){
    const container=document.getElementById('tripSidebarContainer'); if(!container) return; container.innerHTML='';
    if(!records.length){ container.innerHTML='<div class="text-center py-10 text-slate-400 text-xs">Tiada rekod trip.</div>'; return; }
    records.forEach(rec=>{
        const f=rec.fields; const displayTitle=cleanTripName(f['Trip']||'TBC'); const airline=f['Penerbangan']||'N/A';
        const isSelected=selectedTripRecord && selectedTripRecord.id===rec.id;
        const card=document.createElement('div'); card.className=`p-3 rounded-xl border text-left cursor-pointer transition ${isSelected?'bg-slate-100/90 border-slate-300':'bg-slate-50/50 hover:bg-slate-100/60 border-slate-200/80'}`; card.onclick=()=>renderTripDetailForm(rec);
        card.innerHTML=`<h4 class="font-bold text-xs text-slate-900 leading-snug">${displayTitle}</h4><div class="mt-2"><span class="bg-amber-100/80 text-amber-900 border border-amber-200/60 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">${airline}</span></div>`; container.appendChild(card);
    });
}

function renderTripDetailForm(rec){
    try{
        selectedTripRecord=rec; renderTripSidebarList(allTripUmrahRecords);
        const f=rec.fields; const id=rec.id; const rawTripTitle=f['Trip']||'TBC'; const displayTitle=cleanTripName(rawTripTitle);
        const workspace=document.getElementById('tripMainDetailWorkspace'); if(!workspace) return;
        // robust trip jemaah matching: id match OR title match OR cached tripMap
        let tripJemaah=[];
        if(typeof allJemaahUmrahRecords!=='undefined' && allJemaahUmrahRecords.length){
            tripJemaah=allJemaahUmrahRecords.filter(j=>{
                if(!j.fields) return false;
                const jTripRaw=j.fields['TRIP'];
                if(!jTripRaw) return false;
                const jTripArr=Array.isArray(jTripRaw)?jTripRaw:[jTripRaw];
                return jTripArr.includes(id) || jTripArr.includes(rawTripTitle) || jTripArr.some(t=> typeof t==='string' && t.includes(displayTitle));
            });
        }
        currentTripJemaahData=tripJemaah.map((r,i)=>({ rec:r, originalIndex:i }));

        workspace.innerHTML=`
            <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 md:p-8">
                <div class="flex items-center justify-between pb-6 mb-6 border-b border-slate-100">
                    <h1 class="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">${displayTitle}</h1>
                    <button onclick="deleteTripRecord('${id}')" class="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition">Delete Trip</button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-xs font-medium text-slate-700">
                    <div><label class="block font-bold text-slate-600 mb-1">Trip</label><input type="text" value="${rawTripTitle}" disabled class="w-full p-2.5 bg-slate-50 border rounded-xl font-semibold"></div>
                    <div><label class="block font-bold text-slate-600 mb-1">Mutawwif/Pengiring</label><input type="text" value="${f['Mutawwif/Pengiring']||''}" disabled class="w-full p-2.5 bg-slate-50 border rounded-xl font-bold"></div>
                    <div><label class="block font-bold text-slate-600 mb-1">Group (if relevant)</label>${buildSelectDropdown(id,'Group (if relevant)',f['Group (if relevant)'],selectOptions.group,'group')}</div>
                    <div class="grid grid-cols-2 gap-3"><div><label class="block font-bold text-slate-600 mb-1">Mula Pakej</label><input type="date" value="${f['Mula Pakej']||''}" onchange="updateAirtableField('${id}','Mula Pakej',this.value)" class="w-full p-2 border rounded-xl"></div><div><label class="block font-bold text-slate-600 mb-1">Tamat Pakej</label><input type="date" value="${f['Tamat Pakej']||''}" onchange="updateAirtableField('${id}','Tamat Pakej',this.value)" class="w-full p-2 border rounded-xl"></div></div>
                    <div><label class="block font-bold text-slate-600 mb-1">Penerbangan</label>${buildSelectDropdown(id,'Penerbangan',f['Penerbangan'],selectOptions.penerbangan,'penerbangan')}</div>
                    <div><label class="block font-bold text-slate-600 mb-1">Musim</label>${buildSelectDropdown(id,'Musim',f['Musim'],selectOptions.musim,'musim')}</div>
                    <div><label class="block font-bold text-slate-600 mb-1">Tempoh Pakej</label>${buildSelectDropdown(id,'Tempoh Pakej',f['Tempoh Pakej'],selectOptions.tempoh,'tempoh')}</div>
                    <div><label class="block font-bold text-slate-600 mb-1">Status</label><div class="pt-1.5">${getStatusBadgeHtml(f['Status'])}</div></div>
                    <div class="md:col-span-2"><label class="block font-bold text-slate-600 mb-1">Sektor</label>${buildSelectDropdown(id,'Sektor',f['Sektor'],selectOptions.sektor,'sektor')}</div>
                </div>
            </div>
            <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 relative">
                <div class="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-3 relative">
                    <h3 class="font-extrabold text-base text-slate-900 tracking-tight">DATA JEMAAH UMRAH <span class="text-slate-400 font-normal text-xs ml-2" id="jemaahCounter">(${tripJemaah.length})</span></h3>
                    <div class="flex items-center gap-2 text-xs relative">
                        <div class="relative"><button onclick="toggleFilterPopup()" id="btnFilterPopup" class="bg-white border border-slate-200 text-slate-700 font-bold px-3.5 py-2 rounded-xl hover:bg-slate-50 transition flex items-center"><i class="fa-solid fa-filter mr-1.5 text-[10px]"></i> Filter</button><div id="filterPopup" class="hidden absolute right-0 top-11 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 z-40 p-4"><div class="flex justify-between items-center mb-3"><span class="font-bold text-slate-700 text-xs uppercase">Search Name</span><button onclick="closeFilterPopup()" class="text-slate-400 hover:text-slate-700"><i class="fa-solid fa-xmark"></i></button></div><div class="relative"><i class="fa-solid fa-magnifying-glass absolute left-3 top-3 text-slate-400 text-xs"></i><input type="text" id="nameSearchInput" onkeyup="applyNameSearch()" placeholder="Taip nama jemaah..." class="w-full text-xs pl-8 pr-3 py-2.5 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"></div><div class="flex gap-2 mt-3"><button onclick="clearNameSearch()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-xl text-xs">Clear</button><button onclick="closeFilterPopup()" class="flex-1 bg-slate-900 text-white font-bold py-2 rounded-xl text-xs">Tutup</button></div></div></div>
                        <div class="relative"><button onclick="toggleSortPopup()" id="btnSortPopup" class="bg-white border border-slate-200 text-slate-700 font-bold px-3.5 py-2 rounded-xl hover:bg-slate-50 transition flex items-center"><i class="fa-solid fa-arrow-up-wide-short mr-1.5 text-[10px]"></i> Sort</button><div id="sortPopup" class="hidden absolute right-0 top-11 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 z-40 p-2"><div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-2 border-b mb-1">Sort By</div><button onclick="applySortOption('name-asc')" class="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-100 text-xs font-medium">Nama A-Z</button><button onclick="applySortOption('name-desc')" class="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-100 text-xs font-medium">Nama Z-A</button><button onclick="applySortOption('age-asc')" class="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-100 text-xs font-medium">Umur Rendah</button><button onclick="applySortOption('age-desc')" class="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-100 text-xs font-medium">Umur Tinggi</button><button onclick="applySortOption('original')" class="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-100 text-xs font-medium text-slate-500 border-t mt-1"><i class="fa-solid fa-rotate mr-2"></i> Reset Asal</button></div></div>
                        <button onclick="openTripAddCustomerModal('${id}','${displayTitle.replace(/'/g, "\\'")}')" class="bg-slate-900 text-white font-bold px-3.5 py-2 rounded-xl hover:bg-black transition flex items-center"><i class="fa-solid fa-plus mr-1.5"></i> Add customer</button>
                    </div>
                </div>
                <div class="overflow-x-auto border border-slate-200/80 rounded-xl">
                    <table class="w-full text-left text-xs"><thead class="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b"><tr><th class="p-3 w-12 text-center">NO</th><th class="p-3">NAME</th><th class="p-3">PICTURE</th><th class="p-3">PASSPORT COPY</th><th class="p-3">PASSPORT NO.</th><th class="p-3">AGE</th><th class="p-3">GENDER</th><th class="p-3">NATIONALITY</th></tr></thead><tbody id="tripJemaahTbody" class="divide-y divide-slate-100 font-medium text-slate-800"></tbody></table>
                </div>
            </div>`;
        renderJemaahRows(tripJemaah);
        setTimeout(()=>{ document.removeEventListener('click', handleOutsideClick); document.addEventListener('click', handleOutsideClick); },100);
        // if no data, try to ensure jemaah loaded then re-render
        if(tripJemaah.length===0){
            ensureJemaahDataLoaded();
        }
    }catch(err){ console.error('renderTripDetailForm error', err); const ws=document.getElementById('tripMainDetailWorkspace'); if(ws) ws.innerHTML='<div class="p-6 text-rose-600 text-xs">Error: '+err.message+'</div>'; }
}

function handleOutsideClick(e){
    const filterPopup=document.getElementById('filterPopup'); const sortPopup=document.getElementById('sortPopup');
    const filterBtn=document.getElementById('btnFilterPopup'); const sortBtn=document.getElementById('btnSortPopup');
    if(filterPopup && !filterPopup.classList.contains('hidden')){ if(!filterPopup.contains(e.target) && !filterBtn.contains(e.target)) filterPopup.classList.add('hidden'); }
    if(sortPopup && !sortPopup.classList.contains('hidden')){ if(!sortPopup.contains(e.target) && !sortBtn.contains(e.target)) sortPopup.classList.add('hidden'); }
}

function renderJemaahRows(dataArray){
    const tbody=document.getElementById('tripJemaahTbody'); const counter=document.getElementById('jemaahCounter');
    if(!tbody) return;
    if(counter) counter.textContent=`(${dataArray.length})`;
    if(!dataArray || dataArray.length===0){
        tbody.innerHTML=`<tr><td colspan="8" class="p-8 text-center text-slate-400 font-normal">Tiada data jemaah berdaftar di bawah trip ini lagi. Klik Add customer untuk tambah.</td></tr>`;
        return;
    }
    tbody.innerHTML = dataArray.map((j, idx)=>{
        const jf=j.fields||{};
        const pic=(jf['PICTURE']&&jf['PICTURE'][0])?jf['PICTURE'][0].url:'';
        const passCopy=(jf['PASSPORT COPY']&&jf['PASSPORT COPY'][0])?jf['PASSPORT COPY'][0].url:'';
        const genderBadge=jf['GENDER']==='MALE'?'bg-sky-100/80 text-sky-800 border-sky-200':'bg-rose-100/80 text-rose-800 border-rose-200';
        return `<tr class="hover:bg-slate-50/80 transition"><td class="p-3 text-center font-bold text-slate-700">${idx+1}</td><td class="p-3 font-bold text-slate-900 uppercase">${jf['NAME']||'-'}</td><td class="p-3">${pic?`<img src="${pic}" class="w-9 h-9 rounded-lg object-cover border">`:`<div class="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400"><i class="fa-solid fa-user"></i></div>`}</td><td class="p-3">${passCopy?`<a href="${passCopy}" target="_blank" class="text-sky-600 underline font-semibold flex items-center"><i class="fa-solid fa-file-pdf mr-1"></i> View Copy</a>`:`<span class="text-slate-300">-</span>`}</td><td class="p-3 font-mono font-bold">${jf['PASSPORT NO.']||'-'}</td><td class="p-3">${jf['AGE']||'-'}</td><td class="p-3"><span class="text-[10px] font-bold px-2.5 py-0.5 rounded-md border uppercase ${genderBadge}">${jf['GENDER']||'-'}</span></td><td class="p-3"><span class="bg-sky-100/80 text-sky-900 border text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">${jf['NATIONALITY']||'MALAYSIA'}</span></td></tr>`;
    }).join('');
}

function toggleFilterPopup(){ const p=document.getElementById('filterPopup'); const s=document.getElementById('sortPopup'); if(s) s.classList.add('hidden'); if(p){ p.classList.toggle('hidden'); if(!p.classList.contains('hidden')){ document.getElementById('nameSearchInput')?.focus(); } } }
function closeFilterPopup(){ document.getElementById('filterPopup')?.classList.add('hidden'); }
function applyNameSearch(){
    const q=(document.getElementById('nameSearchInput')?.value||'').toLowerCase();
    let base=currentTripJemaahData.map(d=>d.rec);
    if(!q){ renderJemaahRows(base); return; }
    const filtered=base.filter(j=> (j.fields['NAME']||'').toLowerCase().includes(q));
    renderJemaahRows(filtered);
}
function clearNameSearch(){ const inp=document.getElementById('nameSearchInput'); if(inp) inp.value=''; applyNameSearch(); }
function toggleSortPopup(){ const p=document.getElementById('sortPopup'); const f=document.getElementById('filterPopup'); if(f) f.classList.add('hidden'); if(p) p.classList.toggle('hidden'); }
function closeSortPopup(){ document.getElementById('sortPopup')?.classList.add('hidden'); }
function applySortOption(opt){
    let sorted=[...currentTripJemaahData.map(d=>d.rec)];
    if(opt==='name-asc') sorted.sort((a,b)=>(a.fields['NAME']||'').localeCompare(b.fields['NAME']||''));
    else if(opt==='name-desc') sorted.sort((a,b)=>(b.fields['NAME']||'').localeCompare(a.fields['NAME']||''));
    else if(opt==='age-asc') sorted.sort((a,b)=>(parseInt(a.fields['AGE'])||0)-(parseInt(b.fields['AGE'])||0));
    else if(opt==='age-desc') sorted.sort((a,b)=>(parseInt(b.fields['AGE'])||0)-(parseInt(a.fields['AGE'])||0));
    else if(opt==='original') sorted=currentTripJemaahData.map(d=>d.rec);
    const q=(document.getElementById('nameSearchInput')?.value||'').toLowerCase();
    if(q) sorted=sorted.filter(j=> (j.fields['NAME']||'').toLowerCase().includes(q));
    renderJemaahRows(sorted);
    setTimeout(()=>closeSortPopup(), 300);
}
function openTripAddCustomerModal(tripId, tripTitle){
    const modal=document.getElementById('tripAddCustomerModal'); const sub=document.getElementById('tripAddCustomerSub'); const display=document.getElementById('tripAddCustomerTripDisplay'); const hidden=document.getElementById('tripAddCustomerTripId');
    if(sub) sub.textContent='Trip: '+tripTitle; if(display) display.value=tripTitle; if(hidden) hidden.value=tripId;
    if(modal) modal.classList.remove('hidden');
}
function closeTripAddCustomerModal(){ document.getElementById('tripAddCustomerModal')?.classList.add('hidden'); document.getElementById('tripAddCustomerForm')?.reset(); }
async function submitTripAddCustomer(e){
    e.preventDefault(); const form=document.getElementById('tripAddCustomerForm'); const fd=new FormData(form); const nameVal=fd.get('NAME'); if(!nameVal) return alert('Nama wajib isi'); const tripId=document.getElementById('tripAddCustomerTripId')?.value;
    let payload={}; fd.forEach((val,key)=>{ if(key==='TRIP_ID') return; if(key==='NAME'||key==='PASSPORT NO.') payload[key]=val?val.toUpperCase().trim():null; else payload[key]=val?val.trim():null; }); if(tripId) payload['TRIP']=[tripId];
    const btn=document.getElementById('btnSubmitTripCustomer'); if(btn){ btn.disabled=true; btn.innerHTML='<i class="fa-solid fa-spinner fa-spin mr-1"></i> Menambah...'; }
    try{
        const PAT=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat')||''; const BASE=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_base_id')||'';
        const url=`https://api.airtable.com/v0/${BASE}/DATA%20JEMAAH%20UMRAH`; const res=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${PAT}`,'Content-Type':'application/json'},body:JSON.stringify({fields:payload})});
        if(res.ok){ const newRec=await res.json(); if(typeof allJemaahUmrahRecords!=='undefined') allJemaahUmrahRecords.unshift(newRec); else window.allJemaahUmrahRecords=[newRec]; closeTripAddCustomerModal(); if(selectedTripRecord) renderTripDetailForm(selectedTripRecord); if(typeof fetchJemaahUmrahData==='function') fetchJemaahUmrahData(); } else { const err=await res.json(); console.error(err); alert('Gagal tambah jemaah: '+(err.error?.message||'')); }
    }catch(err){ console.error(err); alert('Ralat network'); } finally{ if(btn){ btn.disabled=false; btn.innerHTML='<i class="fa-solid fa-plus mr-1"></i> Tambah Jemaah'; } }
}
function buildSelectDropdown(recId, fieldName, currentValue, optionsArray, categoryKey){
    const unique=[]; optionsArray.forEach(opt=>{ if(!opt) return; const c=normalizeDashFormat(opt); if(c&&!unique.includes(c)) unique.push(c); });
    let html=`<option value="">-- Pilih --</option>`; const curNorm=normalizeDashFormat(currentValue);
    unique.forEach(opt=>{ html+=`<option value="${opt}" ${curNorm===opt?'selected':''}>${opt}</option>`; });
    html+=`<option value="__ADD_NEW__" class="font-bold text-rose-700">+ Add New Option...</option>`;
    return `<select onchange="handleDropdownChange('${recId}','${fieldName}',this,'${categoryKey}')" class="w-full p-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:outline-none font-semibold">${html}</select>`;
}
function handleDropdownChange(recId, fieldName, selectEl, categoryKey){
    const v=selectEl.value; if(v==='__ADD_NEW__'){ const np=prompt(`Masukkan pilihan baru untuk ${fieldName}:`); if(np&&np.trim()!==''){ const c=normalizeDashFormat(np); if(!selectOptions[categoryKey].includes(c)) selectOptions[categoryKey].push(c); selectEl.value=c; updateAirtableField(recId,fieldName,c);} else selectEl.value=''; } else updateAirtableField(recId,fieldName,v);
}
async function updateAirtableField(recId, fieldName, value){
    const PAT=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat')||''; const BASE=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_base_id')||''; if(!PAT||!BASE) return;
    const url=`https://api.airtable.com/v0/${BASE}/PAKEJ%20UMRAH/${recId}`; let fd={}; fd[fieldName]=value||null;
    try{ const res=await fetch(url,{method:'PATCH',headers:{Authorization:`Bearer ${PAT}`,'Content-Type':'application/json'},body:JSON.stringify({fields:fd})}); if(res.ok) fetchTripUmrahData(); }catch(e){ console.error(e); }
}
async function deleteTripRecord(recId){ if(!confirm('Padam trip ini?')) return; const PAT=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat')||''; const BASE=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_base_id')||''; const url=`https://api.airtable.com/v0/${BASE}/PAKEJ%20UMRAH/${recId}`; try{ const res=await fetch(url,{method:'DELETE',headers:{Authorization:`Bearer ${PAT}`}}); if(res.ok) fetchTripUmrahData(); }catch(e){ alert('Gagal padam'); } }
function getStatusBadgeHtml(status){ if(!status) return '<span class="text-slate-400 font-bold">⚪ PAST TRIP</span>'; if(status.includes('AVAILABLE')) return `<span class="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg text-xs">🟢 AVAILABLE</span>`; if(status.includes('CLOSED')) return `<span class="text-rose-700 font-bold bg-rose-50 border px-3 py-1 rounded-lg text-xs">🔴 CLOSED</span>`; if(status.includes('ONGOING')) return `<span class="text-amber-700 font-bold bg-amber-50 border px-3 py-1 rounded-lg text-xs">🟡 ONGOING</span>`; return `<span class="text-slate-700 bg-slate-100 border px-3 py-1 rounded-lg text-xs">⚪ ${status}</span>`; }
function extractDynamicOptions(records){ records.forEach(r=>{ const f=r.fields; const check=(val,arr)=>{ if(!val) return; const c=normalizeDashFormat(val); if(c&&!arr.includes(c)) arr.push(c); }; check(f['Group (if relevant)'],selectOptions.group); check(f['Sektor'],selectOptions.sektor); check(f['Penerbangan'],selectOptions.penerbangan); check(f['Musim'],selectOptions.musim); check(f['Tempoh Pakej'],selectOptions.tempoh); }); }
function filterTripSidebar(){ const q=document.getElementById('searchTripSidebar').value.toLowerCase(); const filtered=allTripUmrahRecords.filter(rec=>{ const f=rec.fields; return (f['Trip']||'').toLowerCase().includes(q)||(f['Penerbangan']||'').toLowerCase().includes(q); }); renderTripSidebarList(filtered); }
function handleMulaDateChange(){ const m=document.getElementById('modalMulaPakej'); const t=document.getElementById('modalTamatPakej'); if(m&&t&&m.value){ t.min=m.value; if(t.value&&t.value<m.value) t.value=m.value; } }
function openNewTripModal(){ document.getElementById('newTripModal')?.classList.remove('hidden'); }
function closeNewTripModal(){ document.getElementById('newTripModal')?.classList.add('hidden'); }
async function submitNewTripRecord(e){ e.preventDefault(); const mula=document.getElementById('modalMulaPakej').value; const tamat=document.getElementById('modalTamatPakej').value; if(!mula||!tamat) return alert('Isi tarikh'); if(tamat<mula) return alert('Tamat mesti selepas Mula'); const PAT=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat')||''; const BASE=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_base_id')||''; const url=`https://api.airtable.com/v0/${BASE}/PAKEJ%20UMRAH`; try{ const res=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${PAT}`,'Content-Type':'application/json'},body:JSON.stringify({fields:{'Mula Pakej':mula,'Tamat Pakej':tamat}})}); if(res.ok){ closeNewTripModal(); fetchTripUmrahData(); } else alert('Gagal'); }catch(err){ alert('Gagal'); } }
