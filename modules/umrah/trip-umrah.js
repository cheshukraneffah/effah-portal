// Variable Global Simpan Data & Options
let allTripUmrahRecords = [];
let selectedTripRecord = null;

// Dynamic Single Select Options (STANDARD GUNA DASH '-')
let selectOptions = {
    group: ['GROUP A', 'GROUP B'],
    sektor: ['KUL-JED/JED-KUL', 'KUL-JED/MED-KUL', 'KUL-MED/JED-KUL', 'KUL-MED/MED-KUL', 'KUL-TIF/MED-JED'],
    penerbangan: ['OMAN AIR', 'EMIRATES', 'QATAR AIRWAYS', 'SAUDIA'],
    musim: ['LOW SEASON', 'MID SEASON', 'HIGH SEASON'],
    tempoh: ['11H 9M', '12H 10M', '9H 7M', '13H 10M', '17H 15M', '10H 7M']
};

document.addEventListener('DOMContentLoaded', () => {
    renderTripUmrahHTML();
});

function renderTripUmrahHTML() {
    const container = document.getElementById('modul-pakej-umrah');
    if (!container) return;

    container.innerHTML = `
        <div class="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-140px)]">
            
            <!-- 1. SIDEBAR KIRI: SENARAI TRIP -->
            <div class="w-full lg:w-80 bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 flex flex-col flex-shrink-0">
                
                <!-- Search & Action Header -->
                <div class="flex items-center space-x-2 mb-3">
                    <div class="relative flex-1">
                        <i class="fa-solid fa-magnifying-glass absolute left-3 top-3 text-slate-400 text-xs"></i>
                        <input type="text" id="searchTripSidebar" onkeyup="filterTripSidebar()" placeholder="Search..." 
                            class="w-full text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400">
                    </div>
                    <button onclick="openNewTripModal()" class="bg-slate-900 text-white w-8 h-8 rounded-xl flex items-center justify-center hover:bg-black transition text-xs shadow-2xs" title="Tambah Trip">
                        <i class="fa-solid fa-plus"></i>
                    </button>
                    <button onclick="fetchTripUmrahData()" class="bg-slate-100 text-slate-600 w-8 h-8 rounded-xl flex items-center justify-center hover:bg-slate-200 transition text-xs" title="Refresh">
                        <i class="fa-solid fa-rotate"></i>
                    </button>
                </div>

                <!-- List Container -->
                <div id="tripSidebarContainer" class="space-y-2 overflow-y-auto flex-1 max-h-[75vh] pr-1">
                    <div class="text-center py-10 text-slate-400 text-xs">Sila klik 'Refresh' untuk muat turun trip...</div>
                </div>
            </div>

            <!-- 2. KANAN: DETAIL FORM & TABLE DATA JEMAAH -->
            <div class="flex-1 flex flex-col space-y-6 overflow-x-hidden" id="tripMainDetailWorkspace">
                <div class="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-12 text-center text-slate-400 my-auto">
                    <i class="fa-solid fa-kaaba text-5xl mb-3 text-slate-200"></i>
                    <p class="text-xs font-semibold">Sila pilih mana-mana trip di senarai belah kiri untuk melihat perincian & data jemaah.</p>
                </div>
            </div>

        </div>

        <!-- POPUP MODAL TAMBAH TRIP BARU -->
        <div id="newTripModal" class="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 hidden">
            <div class="bg-white rounded-3xl shadow-2xl p-6 md:p-8 max-w-md w-full border border-slate-100 animate-in fade-in zoom-in duration-150">
                <div class="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                    <div class="flex items-center space-x-2.5">
                        <div class="w-9 h-9 bg-rose-50 text-brand-maroon rounded-xl flex items-center justify-center font-bold text-sm">
                            <i class="fa-solid fa-calendar-plus"></i>
                        </div>
                        <h3 class="font-extrabold text-slate-900 text-base">Tambah Trip Umrah Baru</h3>
                    </div>
                    <button onclick="closeNewTripModal()" class="text-slate-400 hover:text-slate-700 p-1">
                        <i class="fa-solid fa-xmark text-lg"></i>
                    </button>
                </div>

                <form onsubmit="submitNewTripRecord(event)" class="space-y-4 text-xs font-medium text-slate-700">
                    <div>
                        <label class="block font-bold text-slate-800 mb-1.5">Tarikh Mula Pakej (Fly) *</label>
                        <input type="date" id="modalMulaPakej" onchange="handleMulaDateChange()" required
                            class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-slate-400 focus:outline-none font-semibold text-slate-800">
                        <span class="text-[10px] text-slate-400 mt-1 block">Format European: DD/MM/YYYY</span>
                    </div>

                    <div>
                        <label class="block font-bold text-slate-800 mb-1.5">Tarikh Tamat Pakej (Balik) *</label>
                        <input type="date" id="modalTamatPakej" required
                            class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-slate-400 focus:outline-none font-semibold text-slate-800">
                        <span class="text-[10px] text-slate-400 mt-1 block">Format European: DD/MM/YYYY</span>
                    </div>

                    <div class="flex items-center space-x-3 pt-3">
                        <button type="button" onclick="closeNewTripModal()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition">
                            Batal
                        </button>
                        <button type="submit" class="flex-1 bg-slate-900 hover:bg-black text-white font-bold py-2.5 rounded-xl transition shadow-xs">
                            Cipta Trip
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

// Helper: Bersihkan Prefix Kod (contoh: "26/07 | ")
function cleanTripName(tripName) {
    if (!tripName) return 'TBC';
    return tripName.replace(/^[\d\/]+\s*\|\s*/i, '').trim();
}

// Helper: Tukar format KUL JED/JED KUL -> KUL-JED/JED-KUL (Format Ber-dash Sahaja)
function normalizeDashFormat(str) {
    if (!str) return '';
    // Jika Sektor (ada KUL, JED, MED, TIF dll), paksa letak dash
    return str.trim().toUpperCase()
        .replace(/KUL\s+/g, 'KUL-')
        .replace(/\s+JED/g, '-JED')
        .replace(/\s+MED/g, '-MED')
        .replace(/\s+KUL/g, '-KUL')
        .replace(/\s+TIF/g, '-TIF')
        .replace(/--+/g, '-'); // Elak double dash
}

// Fetch Data dari Airtable dengan Sorting
async function fetchTripUmrahData() {
    // AUTO-FILL PAT FINAL - takde alert lagi
    try{
      if(typeof AIRTABLE_PAT === 'undefined' || !AIRTABLE_PAT){
        AIRTABLE_PAT = window.AIRTABLE_PAT || localStorage.getItem('effah_api_pat') || window.DEFAULT_PAT || 'patjxZg6G22e9OBuS.2a96ced64af7e931ee4d83f65c491adf1241813547d5d8e3a317f5bc6d9a8de7';
        AIRTABLE_BASE_ID = window.AIRTABLE_BASE_ID || localStorage.getItem('effah_base_id') || window.DEFAULT_BASE_ID || 'appSsn4JyQD4DnYu0';
      }
      // sync dari window/default
      AIRTABLE_PAT = window.AIRTABLE_PAT || localStorage.getItem('effah_api_pat') || AIRTABLE_PAT || window.DEFAULT_PAT || 'patjxZg6G22e9OBuS.2a96ced64af7e931ee4d83f65c491adf1241813547d5d8e3a317f5bc6d9a8de7';
      AIRTABLE_BASE_ID = window.AIRTABLE_BASE_ID || localStorage.getItem('effah_base_id') || AIRTABLE_BASE_ID || window.DEFAULT_BASE_ID || 'appSsn4JyQD4DnYu0';
      window.AIRTABLE_PAT = AIRTABLE_PAT;
      window.AIRTABLE_BASE_ID = AIRTABLE_BASE_ID;
      localStorage.setItem('effah_api_pat', AIRTABLE_PAT);
      localStorage.setItem('effah_base_id', AIRTABLE_BASE_ID);
      if(typeof updateApiStatusBadge === 'function') updateApiStatusBadge();
      if(typeof setApiOnline === 'function') setApiOnline();
    }catch(e){ console.warn('PAT auto-fill warning', e); }
    if (!AIRTABLE_PAT || !AIRTABLE_BASE_ID) {
        console.warn('PAT/Base missing, abort fetchTrip');
        return;
    }

    const container = document.getElementById('tripSidebarContainer');
    if (container) container.innerHTML = '<div class="text-center py-10 text-slate-400 text-xs"><i class="fa-solid fa-spinner fa-spin mr-1"></i> Memuat data...</div>';

    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/PAKEJ%20UMRAH?sort[0][field]=Mula%20Pakej&sort[0][direction]=asc&sort[1][field]=Tamat%20Pakej&sort[1][direction]=asc`;

    try {
        const response = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_PAT}` } });
        const data = await response.json();
        allTripUmrahRecords = data.records || [];

        extractDynamicOptions(allTripUmrahRecords);

        // --- 📊 UPDATE KAD OVERVIEW INDEX (EXCLUDE TBC) ---
        // Filter trip yang sah sahaja (Trip bukan 'TBC' dan ada Mula Pakej)
        const validTrips = allTripUmrahRecords.filter(rec => {
            const f = rec.fields;
            const tripTitle = (f['Trip'] || f['NAME'] || '').trim().toUpperCase();
            // Abaikan jika tajuk ada TBC atau Mula Pakej kosong
            return tripTitle !== 'TBC' && !tripTitle.startsWith('TBC') && f['Mula Pakej'];
        });

        // Kemaskini nombor pada stat card di Overview
        const statUmrah = document.getElementById('statUmrahCount');
        if (statUmrah) statUmrah.textContent = validTrips.length;
        // ---------------------------------------------------

        renderTripSidebarList(allTripUmrahRecords);

        if (allTripUmrahRecords.length > 0) {
            renderTripDetailForm(allTripUmrahRecords[0]);
        }
    } catch (err) {
        if (container) container.innerHTML = '<div class="text-center py-10 text-rose-500 text-xs">Gagal muat data. Semak API Key.</div>';
    }
}

// Render Senarai Sidebar Kiri
function renderTripSidebarList(records) {
    const container = document.getElementById('tripSidebarContainer');
    if (!container) return;
    container.innerHTML = '';

    if (records.length === 0) {
        container.innerHTML = '<div class="text-center py-10 text-slate-400 text-xs">Tiada rekod trip.</div>';
        return;
    }

    records.forEach(rec => {
        const f = rec.fields;
        const rawTripTitle = f['Trip'] || f['NAME'] || 'TBC';
        const displayTitle = cleanTripName(rawTripTitle);
        const airline = f['Penerbangan'] || 'N/A';

        const isSelected = selectedTripRecord && selectedTripRecord.id === rec.id;

        const card = document.createElement('div');
        card.className = `p-3 rounded-xl border text-left cursor-pointer transition ${isSelected ? 'bg-slate-100/90 border-slate-300 shadow-2xs' : 'bg-slate-50/50 hover:bg-slate-100/60 border-slate-200/80'}`;
        card.onclick = () => renderTripDetailForm(rec);

        card.innerHTML = `
            <h4 class="font-bold text-xs text-slate-900 leading-snug">${displayTitle}</h4>
            <div class="mt-2">
                <span class="bg-amber-100/80 text-amber-900 border border-amber-200/60 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide">
                    ${airline}
                </span>
            </div>
        `;
        container.appendChild(card);
    });
}

// Render Form Utama & Table Data Jemaah Umrah
function renderTripDetailForm(rec) {
    selectedTripRecord = rec;
    renderTripSidebarList(allTripUmrahRecords);

    const f = rec.fields;
    const id = rec.id;
    const rawTripTitle = f['Trip'] || f['NAME'] || 'TBC';
    const displayTitle = cleanTripName(rawTripTitle);
    
    const workspace = document.getElementById('tripMainDetailWorkspace');

    // FIX: Filter jemaah lebih flexible - match ID, raw title, cleaned title, dan trip name tanpa prefix
    const tripJemaah = (typeof allJemaahUmrahRecords !== 'undefined') ? allJemaahUmrahRecords.filter(j => {
        const jTripRaw = j.fields['TRIP'];
        const jTrip = Array.isArray(jTripRaw) ? jTripRaw[0] : jTripRaw;
        const jTripName = j.fields['Trip Name'] || j.fields['TRIP_NAME'] || '';
        // Check multiple match possibilities
        return jTrip === id || 
               jTrip === rawTripTitle || 
               jTrip === displayTitle ||
               jTripName === rawTripTitle ||
               jTripName === displayTitle ||
               (typeof cleanTripName === 'function' && cleanTripName(jTrip) === displayTitle) ||
               (typeof cleanTripName === 'function' && cleanTripName(jTripName) === displayTitle);
    }) : [];
    console.log('Trip', displayTitle, 'found', tripJemaah.length, 'jemaah');

    workspace.innerHTML = `
        <!-- FORM UTAMA DETAIL TRIP -->
        <div class="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 md:p-8">
            
            <div class="flex items-center justify-between pb-6 mb-6 border-b border-slate-100">
                <h1 class="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">${displayTitle}</h1>
                <button onclick="deleteTripRecord('${id}')" class="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-2xs flex items-center">
                    Delete Trip
                </button>
            </div>

            <!-- Form Grid Fields -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-xs font-medium text-slate-700">
                
                <div>
                    <label class="block font-bold text-slate-600 mb-1">Trip</label>
                    <input type="text" value="${rawTripTitle}" disabled class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-600 cursor-not-allowed">
                </div>

                <div>
                    <label class="block font-bold text-slate-600 mb-1">Mutawwif/Pengiring</label>
                    <input type="text" value="${f['Mutawwif/Pengiring'] || ''}" disabled class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 cursor-not-allowed">
                </div>

                <div>
                    <label class="block font-bold text-slate-600 mb-1">Group (if relevant)</label>
                    ${buildSelectDropdown(id, 'Group (if relevant)', f['Group (if relevant)'], selectOptions.group, 'group')}
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block font-bold text-slate-600 mb-1">Mula Pakej</label>
                        <input type="date" value="${f['Mula Pakej'] || ''}" onchange="updateAirtableField('${id}', 'Mula Pakej', this.value)"
                            class="w-full p-2 border border-slate-200 rounded-xl focus:ring-1 focus:ring-slate-400 focus:outline-none">
                    </div>
                    <div>
                        <label class="block font-bold text-slate-600 mb-1">Tamat Pakej</label>
                        <input type="date" value="${f['Tamat Pakej'] || ''}" onchange="updateAirtableField('${id}', 'Tamat Pakej', this.value)"
                            class="w-full p-2 border border-slate-200 rounded-xl focus:ring-1 focus:ring-slate-400 focus:outline-none">
                    </div>
                </div>

                <div>
                    <label class="block font-bold text-slate-600 mb-1">Penerbangan</label>
                    ${buildSelectDropdown(id, 'Penerbangan', f['Penerbangan'], selectOptions.penerbangan, 'penerbangan')}
                </div>

                <div>
                    <label class="block font-bold text-slate-600 mb-1">Musim</label>
                    ${buildSelectDropdown(id, 'Musim', f['Musim'], selectOptions.musim, 'musim')}
                </div>

                <div>
                    <label class="block font-bold text-slate-600 mb-1">Tempoh Pakej</label>
                    ${buildSelectDropdown(id, 'Tempoh Pakej', f['Tempoh Pakej'], selectOptions.tempoh, 'tempoh')}
                </div>

                <div>
                    <label class="block font-bold text-slate-600 mb-1">Status</label>
                    <div class="pt-1.5">${getStatusBadgeHtml(f['Status'])}</div>
                </div>

                <div>
                    <label class="block font-bold text-slate-600 mb-1">Occupied Seat</label>
                    <input type="text" value="${f['Occupied seat'] || 0}" disabled class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 cursor-not-allowed">
                </div>

                <div>
                    <label class="block font-bold text-slate-600 mb-1">Total Seat</label>
                    <input type="number" value="${f['Total Seat'] || 0}" onchange="updateAirtableField('${id}', 'Total Seat', parseInt(this.value))"
                        class="w-full p-2.5 border border-slate-200 rounded-xl font-bold focus:ring-1 focus:ring-slate-400 focus:outline-none">
                </div>

                <div>
                    <label class="block font-bold text-slate-600 mb-1">Available Seat</label>
                    <input type="text" value="${f['Available Seat'] || 0}" disabled class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 cursor-not-allowed">
                </div>

                <div>
                    <label class="block font-bold text-slate-600 mb-1">Total Jemaah</label>
                    <input type="text" value="${f['Total Jemaah'] || 0}" disabled class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 cursor-not-allowed">
                </div>

                <div>
                    <label class="block font-bold text-slate-600 mb-1">FIT Tickets</label>
                    <input type="text" value="${f['FIT Tickets'] || 0}" disabled class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 cursor-not-allowed">
                </div>

                <div>
                    <label class="block font-bold text-slate-600 mb-1">Last Payment</label>
                    <input type="text" value="${f['Last Payment'] || '-'}" disabled class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 cursor-not-allowed">
                </div>

                <div class="md:col-span-2">
                    <label class="block font-bold text-slate-600 mb-1">Sektor</label>
                    ${buildSelectDropdown(id, 'Sektor', f['Sektor'], selectOptions.sektor, 'sektor')}
                </div>

            </div>
        </div>

        <!-- TABLE DATA JEMAAH UMRAH -->
        <div class="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 md:p-8">
            <div class="flex flex-col sm:flex-row justify-between sm:items-center mb-5 gap-3">
                <h3 class="font-extrabold text-base text-slate-900 tracking-tight">DATA JEMAAH UMRAH</h3>
                <div class="flex items-center gap-2">
                        <div class="relative">
                            <i class="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400 text-[10px]"></i>
                            <input type="text" onkeyup="if(typeof filterTripDetailJemaah==='function'){filterTripDetailJemaah(this.value)} else { const v=this.value.toLowerCase(); document.querySelectorAll('#tripJemaahTableBody tr').forEach(tr=>{ tr.style.display = tr.textContent.toLowerCase().includes(v) ? '' : 'none'; }); }" placeholder="Search..." class="pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-300 w-32 md:w-48">
                        </div>
                        <button onclick="if(typeof openAddJemaahModal==='function'){ openAddJemaahModal(selectedTripRecord ? selectedTripRecord.fields['Trip'] : null); } else { alert('Buka tab Maklumat Jemaah sekali untuk load modal'); switchTab('jemaah-umrah'); }" class="bg-slate-900 text-white font-bold px-3.5 py-2 rounded-xl hover:bg-black transition text-xs flex items-center shadow-xs">
                            <i class="fa-solid fa-plus mr-1.5"></i> Add customer
                        </button>
                    </div>
            </div>

            <div class="overflow-x-auto border border-slate-200/80 rounded-xl">
                <table class="w-full text-left text-xs">
                    <thead class="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200/80">
                        <tr>
                            <th class="p-3 w-12 text-center">NO ↑</th>
                            <th class="p-3">NAME</th>
                            <th class="p-3">PICTURE</th>
                            <th class="p-3">PASSPORT COPY</th>
                            <th class="p-3">PASSPORT NO.</th>
                            <th class="p-3">AGE</th>
                            <th class="p-3">GENDER</th>
                            <th class="p-3">NATIONALITY</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 font-medium text-slate-800">
                        ${tripJemaah.length === 0 ? `
                            <tr><td colspan="8" class="p-8 text-center text-slate-400 font-normal">Tiada data jemaah berdaftar di bawah trip ini lagi.</td></tr>
                        ` : tripJemaah.map((j, idx) => {
                            const jf = j.fields;
                            const pic = (jf['PICTURE'] && jf['PICTURE'][0]) ? jf['PICTURE'][0].url : '';
                            const passCopy = (jf['PASSPORT COPY'] && jf['PASSPORT COPY'][0]) ? jf['PASSPORT COPY'][0].url : '';
                            
                            const genderBadge = jf['GENDER'] === 'MALE' ? 'bg-sky-100/80 text-sky-800 border-sky-200' : 'bg-rose-100/80 text-rose-800 border-rose-200';

                            return `
                                <tr class="hover:bg-slate-50/80 transition">
                                    <td class="p-3 text-center text-slate-400 font-bold">${idx + 1}</td>
                                    <td class="p-3 font-bold text-slate-900 uppercase">${jf['NAME'] || '-'}</td>
                                    <td class="p-3">
                                        ${pic ? `<img src="${pic}" class="w-9 h-9 rounded-lg object-cover border border-slate-200">` : `<div class="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400"><i class="fa-solid fa-user"></i></div>`}
                                    </td>
                                    <td class="p-3">
                                        ${passCopy ? `<a href="${passCopy}" target="_blank" class="text-sky-600 underline font-semibold flex items-center"><i class="fa-solid fa-file-pdf mr-1"></i> View Copy</a>` : `<span class="text-slate-300">-</span>`}
                                    </td>
                                    <td class="p-3 font-mono font-bold text-slate-700">${jf['PASSPORT NO.'] || '-'}</td>
                                    <td class="p-3 text-slate-600">${jf['AGE'] || '-'}</td>
                                    <td class="p-3">
                                        <span class="text-[10px] font-bold px-2.5 py-0.5 rounded-md border uppercase ${genderBadge}">${jf['GENDER'] || '-'}</span>
                                    </td>
                                    <td class="p-3">
                                        <span class="bg-sky-100/80 text-sky-900 border border-sky-200 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">${jf['NATIONALITY'] || 'MALAYSIA'}</span>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// LOGIC MODAL CONTROL & DATE VALIDATION
function handleMulaDateChange() {
    const mulaInput = document.getElementById('modalMulaPakej');
    const tamatInput = document.getElementById('modalTamatPakej');

    if (mulaInput && tamatInput && mulaInput.value) {
        tamatInput.min = mulaInput.value;
        if (tamatInput.value && tamatInput.value < mulaInput.value) {
            tamatInput.value = mulaInput.value;
        }
    }
}

function openNewTripModal() {
    const modal = document.getElementById('newTripModal');
    const mulaInput = document.getElementById('modalMulaPakej');
    const tamatInput = document.getElementById('modalTamatPakej');

    if (mulaInput) {
        mulaInput.value = '';
        mulaInput.removeAttribute('min');
    }
    if (tamatInput) {
        tamatInput.value = '';
        tamatInput.removeAttribute('min');
    }

    if (modal) modal.classList.remove('hidden');
}

function closeNewTripModal() {
    const modal = document.getElementById('newTripModal');
    if (modal) modal.classList.add('hidden');
}

// Submit Form Tambah Trip Baru
async function submitNewTripRecord(e) {
    if (e) e.preventDefault();
    if (!AIRTABLE_PAT || !AIRTABLE_BASE_ID) return;

    const mulaDate = document.getElementById('modalMulaPakej').value;
    const tamatDate = document.getElementById('modalTamatPakej').value;

    if (!mulaDate || !tamatDate) {
        alert('Sila masukkan kedua-dua tarikh Mula Pakej dan Tamat Pakej.');
        return;
    }

    if (tamatDate < mulaDate) {
        alert('⚠️ Ralat Tarikh!\n\nTarikh Tamat Pakej (Balik) mesti dipilih selepas atau pada tarikh Mula Pakej (Fly).');
        document.getElementById('modalTamatPakej').focus();
        return;
    }

    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/PAKEJ%20UMRAH`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${AIRTABLE_PAT}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fields: {
                    "Mula Pakej": mulaDate,
                    "Tamat Pakej": tamatDate
                }
            })
        });

        if (response.ok) {
            closeNewTripModal();
            fetchTripUmrahData();
        } else {
            const errData = await response.json();
            console.error("Error creating trip:", errData);
            alert("Gagal menambah trip baru.");
        }
    } catch (err) {
        alert('Gagal menambah trip baru.');
    }
}

// Reusable Builder Dropdown (HANYA SIMPAN FORMAT DASH '-')
function buildSelectDropdown(recId, fieldName, currentValue, optionsArray, categoryKey) {
    const uniqueOptions = [];
    
    optionsArray.forEach(opt => {
        if (!opt) return;
        // Normalise ke format ber-dash
        const cleanOpt = normalizeDashFormat(opt);
        if (cleanOpt && !uniqueOptions.includes(cleanOpt)) {
            uniqueOptions.push(cleanOpt);
        }
    });

    let optionsHtml = `<option value="">-- Pilih --</option>`;
    
    // Convert nilai semasa ke format ber-dash untuk perbandingan pilihan
    const currentNormalized = normalizeDashFormat(currentValue);

    uniqueOptions.forEach(opt => {
        const isSelected = currentNormalized === opt;
        optionsHtml += `<option value="${opt}" ${isSelected ? 'selected' : ''}>${opt}</option>`;
    });
    
    optionsHtml += `<option value="__ADD_NEW__" class="font-bold text-brand-maroon">+ Add New Option...</option>`;

    return `
        <select onchange="handleDropdownChange('${recId}', '${fieldName}', this, '${categoryKey}')" 
            class="w-full p-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-slate-400 focus:outline-none font-semibold text-slate-800">
            ${optionsHtml}
        </select>
    `;
}

function handleDropdownChange(recId, fieldName, selectEl, categoryKey) {
    const selectedVal = selectEl.value;

    if (selectedVal === '__ADD_NEW__') {
        const newOption = prompt(`Masukkan nama pilihan baru untuk ${fieldName}:`);
        if (newOption && newOption.trim() !== '') {
            const cleanOpt = normalizeDashFormat(newOption);
            if (!selectOptions[categoryKey].includes(cleanOpt)) {
                selectOptions[categoryKey].push(cleanOpt);
            }
            selectEl.value = cleanOpt;
            updateAirtableField(recId, fieldName, cleanOpt);
        } else {
            selectEl.value = '';
        }
    } else {
        updateAirtableField(recId, fieldName, selectedVal);
    }
}

// Direct Update ke Airtable API
async function updateAirtableField(recId, fieldName, value) {
    if (!AIRTABLE_PAT || !AIRTABLE_BASE_ID) return;

    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/PAKEJ%20UMRAH/${recId}`;
    let fieldsData = {};

    fieldsData[fieldName] = (value === '' || value === undefined) ? null : value;

    try {
        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${AIRTABLE_PAT}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fields: fieldsData })
        });

        if (response.ok) {
            fetchTripUmrahData();
        } else {
            const errData = await response.json();
            console.error("Airtable Update Error:", errData);
            alert('Gagal mengemaskini field di Airtable.');
        }
    } catch (err) {
        console.error("Error updating Airtable:", err);
    }
}

// Padam Record Trip
async function deleteTripRecord(recId) {
    if (!confirm('Adakah anda pasti nak padam rekod Trip ini dari Airtable?')) return;

    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/PAKEJ%20UMRAH/${recId}`;

    try {
        const response = await fetch(url, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${AIRTABLE_PAT}` }
        });

        if (response.ok) {
            fetchTripUmrahData();
        }
    } catch (err) {
        alert('Gagal memadam rekod.');
    }
}

// Status Badge Format
function getStatusBadgeHtml(status) {
    if (!status) return '<span class="text-slate-400 font-bold">⚪ PAST TRIP</span>';
    
    if (status.includes('AVAILABLE')) {
        return `<span class="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg text-xs">🟢 AVAILABLE</span>`;
    } else if (status.includes('CLOSED')) {
        return `<span class="text-rose-700 font-bold bg-rose-50 border border-rose-200 px-3 py-1 rounded-lg text-xs">🔴 CLOSED</span>`;
    } else if (status.includes('ONGOING')) {
        return `<span class="text-amber-700 font-bold bg-amber-50 border border-amber-200 px-3 py-1 rounded-lg text-xs">🟡 ONGOING</span>`;
    } else {
        return `<span class="text-slate-700 font-bold bg-slate-100 border border-slate-200 px-3 py-1 rounded-lg text-xs">⚪ ${status}</span>`;
    }
}

// Extract Options dari Data (AUTO CONVERT KE DASH)
function extractDynamicOptions(records) {
    records.forEach(r => {
        const f = r.fields;
        
        const checkAndPush = (val, targetArray) => {
            if (!val) return;
            const clean = normalizeDashFormat(val);
            if (clean && !targetArray.includes(clean)) {
                targetArray.push(clean);
            }
        };

        checkAndPush(f['Group (if relevant)'], selectOptions.group);
        checkAndPush(f['Sektor'], selectOptions.sektor);
        checkAndPush(f['Penerbangan'], selectOptions.penerbangan);
        checkAndPush(f['Musim'], selectOptions.musim);
        checkAndPush(f['Tempoh Pakej'], selectOptions.tempoh);
    });
}

// Filter Carian Sidebar
function filterTripSidebar() {
    const query = document.getElementById('searchTripSidebar').value.toLowerCase();
    const filtered = allTripUmrahRecords.filter(rec => {
        const f = rec.fields;
        const rawTrip = (f['Trip'] || '').toLowerCase();
        const cleanTrip = cleanTripName(rawTrip).toLowerCase();
        const airline = (f['Penerbangan'] || '').toLowerCase();
        return rawTrip.includes(query) || cleanTrip.includes(query) || airline.includes(query);
    });
    renderTripSidebarList(filtered);
}


// FIX: Search & Add customer integration for Trip Umrah detail
function filterTripDetailJemaah(q){
  const query = (q||'').toLowerCase();
  const rows = document.querySelectorAll('#tripJemaahTableBody tr, #jemaahTableBody tr');
  rows.forEach(tr=>{
    const txt = tr.textContent.toLowerCase();
    tr.style.display = txt.includes(query) ? '' : 'none';
  });
}
function searchTripJemaah(q){ filterTripDetailJemaah(q); }

// Ensure openAddJemaahModal can prefill trip if passed
(function(){
  const orig = window.openAddJemaahModal;
  if(orig && !orig._patched){
    window.openAddJemaahModal = function(prefillTrip){
      orig();
      if(prefillTrip){
        setTimeout(()=>{
          const tripInput = document.querySelector('[name="Trip"], #jemaahTripInput, input[placeholder*="Trip"]');
          if(tripInput) tripInput.value = prefillTrip;
          // try select
          const selects = document.querySelectorAll('select');
          selects.forEach(sel=>{
            const opts = Array.from(sel.options);
            const match = opts.find(o=> o.textContent.trim().toLowerCase() === String(prefillTrip).trim().toLowerCase() || o.value.trim().toLowerCase() === String(prefillTrip).trim().toLowerCase());
            if(match) sel.value = match.value;
          });
        }, 300);
      }
    };
    window.openAddJemaahModal._patched = true;
  }
})();
