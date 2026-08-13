// ROOMING LIST MODULE - V22 FULL REBUILD + AUTO ROOM ID = B + KAPASITI + FIX LOADING DROPDOWN
let allRoomingTrips = [];
let selectedRoomingTripId = null;
let allRoomingJemaah = [];
let allRoomingBilik = [];

document.addEventListener('DOMContentLoaded', () => {
    const mod = document.getElementById('modul-rooming');
    if(mod){
        renderRoomingHTML();
    }
});

function renderRoomingHTML(){
    const container = document.getElementById('modul-rooming');
    if(!container) return;
    container.innerHTML = `
        <div class="flex flex-col lg:flex-row gap-4 min-h-[calc(100vh-140px)]">
            <!-- LEFT: Senarai Jemaah -->
            <div class="w-full lg:w-[38%] bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                <div class="p-4 border-b border-slate-200 flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2">
                        <span class="text-[11px] font-bold text-slate-600 uppercase">Melist Jemaah</span>
                        <span id="roomingTotalBadge" class="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full">0 Total</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span id="roomingUnassignedBadge" class="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">0 Unassigned</span>
                    </div>
                </div>
                <div class="p-3 border-b border-slate-100 flex gap-2">
                    <div class="relative flex-1">
                        <i class="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400 text-xs"></i>
                        <input type="text" id="roomingSearchJemaah" onkeyup="filterRoomingJemaah()" placeholder="Cari nama jemaah..." class="w-full text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-300">
                    </div>
                    <select id="roomingTripFilter" onchange="onRoomingTripChange(this.value)" class="text-xs border border-slate-200 rounded-xl px-2 py-2 bg-slate-50 font-semibold max-w-[130px]">
                        <option value="">Semua Pakej</option>
                        <option value="__loading">Loading...</option>
                    </select>
                </div>
                <div id="roomingJemaahList" class="flex-1 overflow-y-auto p-2 space-y-1 max-h-[70vh]">
                    <div class="text-center py-10 text-slate-400 text-xs"><i class="fa-solid fa-spinner fa-spin mr-1"></i> Memuat jemaah...</div>
                </div>
            </div>
            <!-- RIGHT: Rooming List -->
            <div class="flex-1 flex flex-col gap-4">
                <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                    <div class="flex items-center justify-between mb-3">
                        <h3 class="font-extrabold text-sm text-slate-900">ROOMING LIST</h3>
                        <div class="flex gap-1.5">
                            <button onclick="printRooming()" class="text-[11px] bg-white border border-slate-200 px-2.5 py-1 rounded-full font-bold hover:bg-slate-50"><i class="fa-solid fa-print mr-1"></i> Print / PDF</button>
                            <button onclick="copyBilik()" class="text-[11px] bg-white border border-slate-200 px-2.5 py-1 rounded-full font-bold hover:bg-slate-50"><i class="fa-solid fa-copy mr-1"></i> Copy Bilik</button>
                            <button onclick="autoAssignBilik()" class="text-[11px] bg-slate-900 text-white px-2.5 py-1 rounded-full font-bold hover:bg-black">Auto Assign</button>
                            <button onclick="openAddBilikModal()" class="text-[11px] bg-white border border-slate-200 px-2.5 py-1 rounded-full font-bold hover:bg-slate-50">+ Bilik Baru</button>
                        </div>
                    </div>
                    <div id="roomingSummary" class="text-xs text-slate-600 space-y-1 border-b border-slate-100 pb-3 mb-3">
                        <div class="font-bold">BILIK DI MEKAH : <span id="roomingMekahSummary">B5 = 0 BILIK | B6 = 0 BILIK</span></div>
                        <div class="flex justify-between font-black"><span>TOTAL = <span id="roomingTotalBilik">0</span> BILIK</span><span id="roomingTotalPax">0 pax</span></div>
                    </div>
                    <div class="flex gap-2 mb-2">
                        <button class="bg-slate-900 text-white text-xs px-3 py-1.5 rounded-full font-bold">🛏️ MEKAH (<span id="mekahCount">0</span>)</button>
                        <button class="bg-white border border-slate-200 text-xs px-3 py-1.5 rounded-full font-bold">🕌 MADINAH (0)</button>
                        <button class="bg-white border border-slate-200 text-xs px-3 py-1.5 rounded-full font-bold">👜 TAIF (0)</button>
                        <button class="bg-white border border-slate-200 text-xs px-3 py-1.5 rounded-full font-bold">+ Lokasi</button>
                    </div>
                </div>
                <div id="roomingBilikContainer" class="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[65vh] overflow-y-auto">
                    <div class="text-center py-10 text-slate-400 text-xs col-span-2">Pilih trip untuk lihat bilik. Kapasiti 4 auto jadi B4, edit 6 jadi B6.</div>
                </div>
            </div>
        </div>

    <!-- MODAL TAMBAH BILIK BARU - AUTO ROOM ID -->
    <div id="addBilikModal" class="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 hidden">
        <div class="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-slate-100">
            <h3 class="font-black text-sm mb-4">Tambah Bilik Baru</h3>
            <form onsubmit="submitNewBilik(event)" class="space-y-3 text-xs">
                <div>
                    <label class="block font-bold mb-1 text-slate-600">Room ID (Auto ikut Kapasiti)</label>
                    <input type="text" id="bilikRoomId" readonly placeholder="B4, B6..." class="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl font-black text-slate-800 cursor-not-allowed">
                    <p class="text-[10px] text-slate-400 mt-1">Formula: B + Kapasiti. Contoh: Kapasiti 4 → B4, 6 → B6</p>
                </div>
                <div>
                    <label class="block font-bold mb-1">Lokasi</label>
                    <select id="bilikLokasi" class="w-full p-2.5 border border-slate-200 rounded-xl bg-white"><option value="MEKAH">MEKAH</option><option value="MADINAH">MADINAH</option><option value="TAIF">TAIF</option></select>
                </div>
                <div>
                    <label class="block font-bold mb-1">Jenis Bilik</label>
                    <select id="bilikJenis" class="w-full p-2.5 border border-slate-200 rounded-xl bg-white"><option value="EKONOMI">EKONOMI</option><option value="PREMIUM">PREMIUM</option><option value="VIP">VIP</option></select>
                </div>
                <div>
                    <label class="block font-bold mb-1">Hotel Name</label>
                    <input type="text" id="bilikHotel" placeholder="Hotel Name" class="w-full p-2.5 border border-slate-200 rounded-xl">
                </div>
                <div class="flex gap-2 items-end">
                    <div class="flex-1">
                        <label class="block font-bold mb-1">Kapasiti *</label>
                        <input type="number" id="bilikKapasiti" min="1" max="10" value="4" required oninput="updateRoomIdPreview()" onchange="updateRoomIdPreview()" class="w-full p-2.5 border border-slate-200 rounded-xl font-bold">
                    </div>
                    <span class="text-[11px] text-slate-500 pb-3">Kapasiti</span>
                </div>
                <div>
                    <label class="block font-bold mb-1">Catatan bilik</label>
                    <textarea id="bilikCatatan" placeholder="Catatan bilik..." class="w-full p-2.5 border border-slate-200 rounded-xl min-h-[60px]"></textarea>
                </div>
                <div class="flex gap-2 pt-2">
                    <button type="button" onclick="closeAddBilikModal()" class="flex-1 bg-slate-100 py-2.5 rounded-xl font-bold">Batal</button>
                    <button type="submit" class="flex-1 bg-slate-900 text-white py-2.5 rounded-xl font-bold">Cipta Bilik</button>
                </div>
            </form>
        </div>
    </div>
    `;
    fetchRoomingTrips();
}

// === AUTO ROOM ID LOGIC - CORE REQUEST ===
function updateRoomIdPreview(){
    const capInput = document.getElementById('bilikKapasiti');
    const roomIdInput = document.getElementById('bilikRoomId');
    if(!capInput || !roomIdInput) return;
    const cap = parseInt(capInput.value) || 0;
    if(cap > 0){
        roomIdInput.value = 'B' + cap;
    } else {
        roomIdInput.value = '';
    }
}

async function fetchRoomingTrips(){
    const dropdown = document.getElementById('roomingTripFilter');
    if(!dropdown) return;
    dropdown.innerHTML = '<option value="">Loading trips...</option>';
    try{
        const pat = window.AIRTABLE_PAT || localStorage.getItem('effah_api_pat') || window.DEFAULT_PAT || 'patjxZg6G22e9OBuS.2a96ced64af7e931ee4d83f65c491adf1241813547d5d8e3a317f5bc6d9a8de7';
        const base = window.AIRTABLE_BASE_ID || localStorage.getItem('effah_base_id') || window.DEFAULT_BASE_ID || 'appSsn4JyQD4DnYu0';
        const url = `https://api.airtable.com/v0/${base}/PAKEJ%20UMRAH?sort[0][field]=Mula%20Pakej&sort[0][direction]=asc`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${pat}` } });
        if(!res.ok) throw new Error('Failed');
        const data = await res.json();
        allRoomingTrips = (data.records || []).filter(r=>{
            const t = (r.fields['Trip'] || r.fields['NAME'] || '').toString().toUpperCase();
            return t !== 'TBC' && !t.startsWith('TBC') && r.fields['Mula Pakej'];
        });
        let html = '<option value="">Semua Pakej</option>';
        allRoomingTrips.forEach(rec=>{
            const raw = rec.fields['Trip'] || rec.fields['NAME'] || 'Trip';
            const clean = raw.replace(/^[\d\/]+\s*\|\s*/i,'').trim();
            html += `<option value="${rec.id}">${clean}</option>`;
        });
        dropdown.innerHTML = html;
        // Auto select last selected trip or first
        const lastTrip = localStorage.getItem('effah_last_selected_trip') || (allRoomingTrips[0]?.id);
        if(lastTrip){
            dropdown.value = lastTrip;
            selectedRoomingTripId = lastTrip;
            fetchRoomingJemaah(lastTrip);
        }
    } catch(e){
        console.error('fetchRoomingTrips error', e);
        if(dropdown) dropdown.innerHTML = '<option value="">Gagal load - Retry</option><option value="">Semua Pakej</option>';
    }
}

function onRoomingTripChange(tripId){
    selectedRoomingTripId = tripId || null;
    if(tripId) localStorage.setItem('effah_last_selected_trip', tripId);
    fetchRoomingJemaah(tripId);
}

async function fetchRoomingJemaah(tripId){
    const listEl = document.getElementById('roomingJemaahList');
    if(listEl) listEl.innerHTML = '<div class="text-center py-8 text-slate-400 text-xs"><i class="fa-solid fa-spinner fa-spin mr-1"></i> Memuat...</div>';
    try{
        const pat = window.AIRTABLE_PAT || localStorage.getItem('effah_api_pat');
        const base = window.AIRTABLE_BASE_ID || localStorage.getItem('effah_base_id');
        let records = [];
        if(typeof allJemaahUmrahRecords !== 'undefined' && allJemaahUmrahRecords.length>0){
            records = allJemaahUmrahRecords;
        } else {
            const url = `https://api.airtable.com/v0/${base}/DATA%20JEMAAH%20UMRAH?maxRecords=200`;
            const res = await fetch(url, { headers: { Authorization: `Bearer ${pat}` } });
            const data = await res.json();
            records = data.records || [];
        }
        let filtered = records;
        if(tripId){
            filtered = records.filter(j=>{
                const jTripRaw = j.fields['TRIP'];
                const jTrip = Array.isArray(jTripRaw) ? jTripRaw[0] : jTripRaw;
                return jTrip === tripId;
            });
        }
        allRoomingJemaah = filtered;
        document.getElementById('roomingTotalBadge').textContent = filtered.length + ' Total';
        document.getElementById('roomingUnassignedBadge').textContent = filtered.length + ' Unassigned';
        if(listEl){
            if(filtered.length===0){
                listEl.innerHTML = '<div class="text-center py-10 text-slate-400 text-xs">Tiada jemaah</div>';
            } else {
                listEl.innerHTML = filtered.map(j=>{
                    const name = (j.fields['NAME'] || '-').toUpperCase();
                    const pakej = j.fields['PAKEJ'] || 'EKONOMI';
                    return `<div class="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 text-[11px]" data-name="${name}">
                        <div class="flex-1 min-w-0"><div class="font-bold text-slate-800 truncate">${name}</div><div class="text-[10px] text-slate-400">UNASSIGNED</div></div>
                        <div class="flex items-center gap-1"><span class="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">${pakej}</span><button class="w-5 h-5 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px]">+</button></div>
                    </div>`;
                }).join('');
            }
        }
        // Fetch bilik for this trip
        await fetchBilikForTrip(tripId);
    } catch(e){
        console.error('fetch jemaah rooming failed', e);
        if(listEl) listEl.innerHTML = '<div class="text-center py-8 text-rose-400 text-xs">Gagal load jemaah</div>';
    }
}

async function fetchBilikForTrip(tripId){
    const pat = window.AIRTABLE_PAT || localStorage.getItem('effah_api_pat');
    const base = window.AIRTABLE_BASE_ID || localStorage.getItem('effah_base_id');
    let bilikRecords = [];
    const possibleTables = ['ROOMING LIST', 'BILIK', 'ROOMING'];
    for(let tName of possibleTables){
        try{
            let url = `https://api.airtable.com/v0/${base}/${encodeURIComponent(tName)}`;
            if(tripId) url += `?filterByFormula=SEARCH("${tripId}", ARRAYJOIN({TRIP}&""))`;
            const res = await fetch(url, { headers: { Authorization: `Bearer ${pat}` } });
            if(res.ok){
                const data = await res.json();
                if(data.records && data.records.length>0){ bilikRecords = data.records; break; }
            }
        }catch(_){}
    }
    allRoomingBilik = bilikRecords;
    renderBilikGrid();
}

function renderBilikGrid(){
    const container = document.getElementById('roomingBilikContainer');
    const totalBilikEl = document.getElementById('roomingTotalBilik');
    const totalPaxEl = document.getElementById('roomingTotalPax');
    const mekahSummary = document.getElementById('roomingMekahSummary');
    const mekahCount = document.getElementById('mekahCount');
    if(!container) return;

    if(allRoomingBilik.length===0){
        container.innerHTML = `<div class="col-span-2 text-center py-10 text-slate-400 text-xs">Tiada bilik. Klik + Bilik Baru. Kapasiti 4 auto jadi B4, edit jadi 6 auto jadi B6 (formula Airtable).</div>`;
        if(totalBilikEl) totalBilikEl.textContent = '0';
        if(totalPaxEl) totalPaxEl.textContent = '0 pax';
        if(mekahCount) mekahCount.textContent = '0';
        if(mekahSummary) mekahSummary.textContent = 'B5 = 0 BILIK | B6 = 0 BILIK';
        return;
    }

    let totalPax = 0;
    const b5Count = allRoomingBilik.filter(b=> (b.fields['Kapasiti']||0)==5).length;
    const b6Count = allRoomingBilik.filter(b=> (b.fields['Kapasiti']||0)==6).length;
    const b4Count = allRoomingBilik.filter(b=> (b.fields['Kapasiti']||0)==4).length;

    container.innerHTML = allRoomingBilik.map(b=>{
        const f=b.fields;
        const cap = f['Kapasiti'] || f['Capacity'] || 4;
        const roomId = f['Room ID'] || f['ROOM ID'] || ('B'+cap); // Formula field will auto show B+cap
        const jenis = f['Jenis'] || f['Type'] || 'EKONOMI';
        const hotel = f['Hotel'] || f['Hotel Name'] || 'Tanpa Hotel';
        totalPax += parseInt(cap)||0;
        return `
        <div class="bg-white rounded-xl border border-slate-200 p-3">
            <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                    <span class="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-bold">=</span>
                    <span class="font-black text-xs">${roomId}</span>
                    <button onclick="editBilikKapasiti('${b.id}', ${cap})" class="text-slate-400 hover:text-slate-600"><i class="fa-solid fa-pen text-[10px]"></i></button>
                    <span class="bg-slate-100 border border-slate-200 text-[10px] px-2 py-0.5 rounded-full font-bold">${jenis}</span>
                </div>
                <button onclick="deleteBilik('${b.id}')" class="w-6 h-6 bg-slate-50 rounded-full flex items-center justify-center"><i class="fa-solid fa-trash text-[10px] text-slate-400"></i></button>
            </div>
            <div class="flex items-center gap-2 mb-2">
                <span class="text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded-full">● ${jenis}</span>
                <div class="flex items-center gap-1 bg-white border border-slate-200 rounded-full px-2 py-0.5">
                    <button onclick="updateBilikKapasiti('${b.id}', ${cap-1})" class="text-[10px] w-4">-</button>
                    <span class="text-[10px] font-bold px-1">${cap}</span>
                    <button onclick="updateBilikKapasiti('${b.id}', ${cap+1})" class="text-[10px] w-4">+</button>
                    <span class="text-[10px] ml-1">${cap}/${cap}</span>
                </div>
            </div>
            <div class="bg-amber-50 border border-amber-100 rounded-lg p-2 text-xs font-bold flex items-center justify-between mb-2"><span>🎁 ${hotel}</span><i class="fa-solid fa-pen text-[10px] text-slate-400"></i></div>
            <div class="text-[11px] text-slate-400 text-center py-3">Kosong - ${cap} kekosongan (Room ID auto B${cap})</div>
        </div>`;
    }).join('');

    if(totalBilikEl) totalBilikEl.textContent = allRoomingBilik.length;
    if(totalPaxEl) totalPaxEl.textContent = totalPax + ' pax';
    if(mekahCount) mekahCount.textContent = allRoomingBilik.length;
    if(mekahSummary) mekahSummary.textContent = `B5 = ${b5Count} BILIK (${b5Count*5} pax) • B4 = ${b4Count} BILIK • B6 = ${b6Count} BILIK (${b6Count*6} pax)`;
}

function filterRoomingJemaah(){
    const q = (document.getElementById('roomingSearchJemaah')?.value || '').toLowerCase();
    document.querySelectorAll('#roomingJemaahList [data-name]').forEach(el=>{
        const name = el.getAttribute('data-name').toLowerCase();
        el.style.display = name.includes(q) ? '' : 'none';
    });
}

// MODAL LOGIC
function openAddBilikModal(){
    const modal = document.getElementById('addBilikModal');
    if(!modal) return;
    document.getElementById('bilikRoomId').value = '';
    document.getElementById('bilikKapasiti').value = '4';
    document.getElementById('bilikHotel').value = '';
    document.getElementById('bilikCatatan').value = '';
    updateRoomIdPreview();
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
}
function closeAddBilikModal(){
    const modal = document.getElementById('addBilikModal');
    if(!modal) return;
    modal.classList.add('hidden');
    modal.style.display = 'none';
}
async function submitNewBilik(e){
    e.preventDefault();
    const pat = window.AIRTABLE_PAT || localStorage.getItem('effah_api_pat');
    const base = window.AIRTABLE_BASE_ID || localStorage.getItem('effah_base_id');
    if(!pat || !base){ alert('API not set'); return; }
    const lokasi = document.getElementById('bilikLokasi').value;
    const jenis = document.getElementById('bilikJenis').value;
    const hotel = document.getElementById('bilikHotel').value.trim();
    const kapasiti = parseInt(document.getElementById('bilikKapasiti').value) || 4;
    const catatan = document.getElementById('bilikCatatan').value.trim();
    const roomId = 'B' + kapasiti; // Auto
    const fields = {
        'Kapasiti': kapasiti,
        'Lokasi': lokasi,
        'Jenis': jenis,
        'Hotel': hotel || null,
        'Catatan': catatan || null,
        'TRIP': selectedRoomingTripId ? [selectedRoomingTripId] : [],
        'Room ID': roomId, // If field is formula, Airtable will ignore this and use formula
        'ROOM ID': roomId
    };
    try{
        let res = await fetch(`https://api.airtable.com/v0/${base}/${encodeURIComponent('ROOMING LIST')}`, {
            method: 'POST', headers: { Authorization: `Bearer ${pat}`, 'Content-Type':'application/json' },
            body: JSON.stringify({ fields })
        });
        if(!res.ok){
            res = await fetch(`https://api.airtable.com/v0/${base}/${encodeURIComponent('BILIK')}`, {
                method:'POST', headers:{ Authorization:`Bearer ${pat}`, 'Content-Type':'application/json' },
                body: JSON.stringify({ fields })
            });
        }
        if(res.ok){
            closeAddBilikModal();
            await fetchBilikForTrip(selectedRoomingTripId);
        } else {
            const err = await res.json();
            alert('Gagal cipta bilik: ' + (err.error?.message||'unknown'));
        }
    }catch(err){ console.error(err); alert('Error network'); }
}

async function updateBilikKapasiti(bilikId, newCap){
    if(newCap < 1 || newCap > 10){ alert('Kapasiti 1-10 sahaja'); return; }
    const pat = window.AIRTABLE_PAT || localStorage.getItem('effah_api_pat');
    const base = window.AIRTABLE_BASE_ID || localStorage.getItem('effah_base_id');
    const newRoomId = 'B' + newCap;
    try{
        let res = await fetch(`https://api.airtable.com/v0/${base}/${encodeURIComponent('ROOMING LIST')}/${bilikId}`, {
            method:'PATCH', headers:{ Authorization:`Bearer ${pat}`, 'Content-Type':'application/json' },
            body: JSON.stringify({ fields: { 'Kapasiti': newCap, 'Room ID': newRoomId } })
        });
        if(!res.ok){
            res = await fetch(`https://api.airtable.com/v0/${base}/${encodeURIComponent('BILIK')}/${bilikId}`, {
                method:'PATCH', headers:{ Authorization:`Bearer ${pat}`, 'Content-Type':'application/json' },
                body: JSON.stringify({ fields: { 'Kapasiti': newCap, 'Room ID': newRoomId } })
            });
        }
        if(res.ok){
            const b = allRoomingBilik.find(x=>x.id===bilikId);
            if(b){ b.fields['Kapasiti']=newCap; b.fields['Room ID']=newRoomId; }
            renderBilikGrid();
        }
    }catch(e){ console.error(e); }
}

function editBilikKapasiti(bilikId, currentCap){
    const newCapStr = prompt('Edit Kapasiti (Room ID akan auto jadi B + Kapasiti):\nContoh: 4 → B4, 6 → B6', currentCap);
    if(newCapStr===null) return;
    const capNum = parseInt(newCapStr);
    if(isNaN(capNum) || capNum<1){ alert('Kapasiti tidak sah'); return; }
    updateBilikKapasiti(bilikId, capNum);
}

async function deleteBilik(bilikId){
    if(!confirm('Padam bilik ini?')) return;
    const pat = window.AIRTABLE_PAT || localStorage.getItem('effah_api_pat');
    const base = window.AIRTABLE_BASE_ID || localStorage.getItem('effah_base_id');
    try{
        let res = await fetch(`https://api.airtable.com/v0/${base}/${encodeURIComponent('ROOMING LIST')}/${bilikId}`, { method:'DELETE', headers:{ Authorization:`Bearer ${pat}` } });
        if(!res.ok){
            res = await fetch(`https://api.airtable.com/v0/${base}/${encodeURIComponent('BILIK')}/${bilikId}`, { method:'DELETE', headers:{ Authorization:`Bearer ${pat}` } });
        }
        if(res.ok){ allRoomingBilik = allRoomingBilik.filter(b=>b.id!==bilikId); renderBilikGrid(); }
    }catch(e){ console.error(e); }
}

function printRooming(){ window.print(); }
function copyBilik(){ alert('Copy bilik - coming soon'); }
function autoAssignBilik(){ alert('Auto assign akan bahagikan jemaah ikut kapasiti bilik'); }

document.addEventListener('click', function(e){
    const modal = document.getElementById('addBilikModal');
    if(modal && !modal.classList.contains('hidden') && e.target===modal) closeAddBilikModal();
});

window.renderRoomingHTML = renderRoomingHTML;
window.fetchRoomingTrips = fetchRoomingTrips;
window.onRoomingTripChange = onRoomingTripChange;
window.openAddBilikModal = openAddBilikModal;
window.closeAddBilikModal = closeAddBilikModal;
window.updateRoomIdPreview = updateRoomIdPreview;
