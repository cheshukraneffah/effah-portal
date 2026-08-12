// Variable Global Simpan Data Jemaah & Trip Map
let allJemaahUmrahRecords = [];
let rawTripRecordsList = []; 
let tripMap = {}; 
let selectedTripFilter = null;

 // AUTO-FILL GLOBAL PAT - FINAL
try{
  if(typeof AIRTABLE_PAT === 'undefined' || !AIRTABLE_PAT){
    var AIRTABLE_PAT = window.AIRTABLE_PAT || localStorage.getItem('effah_api_pat') || window.DEFAULT_PAT || 'patjxZg6G22e9OBuS.2a96ced64af7e931ee4d83f65c491adf1241813547d5d8e3a317f5bc6d9a8de7';
    var AIRTABLE_BASE_ID = window.AIRTABLE_BASE_ID || localStorage.getItem('effah_base_id') || window.DEFAULT_BASE_ID || 'appSsn4JyQD4DnYu0';
  }
  AIRTABLE_PAT = window.AIRTABLE_PAT || AIRTABLE_PAT || '';
  AIRTABLE_BASE_ID = window.AIRTABLE_BASE_ID || AIRTABLE_BASE_ID || '';
  window.AIRTABLE_PAT = AIRTABLE_PAT;
  window.AIRTABLE_BASE_ID = AIRTABLE_BASE_ID;
}catch(e){}

// Selected Jemaah Checkbox Tracking
let selectedJemaahIds = new Set();

// Hidden Fields Tracking
let hiddenColumns = {};

// Sort State Tracking
let currentSortField = 'NAME';
let currentSortDir = 'asc';

// Default Column Order
let columnOrder = [
    'col-idx', 'col-name', 'col-picture', 'col-ic', 'col-passport', 
    'col-gender', 'col-age', 'col-dob', 'col-dobf', 'col-nat', 
    'col-visa', 'col-passcopy', 'col-visacopy', 'col-mofabio', 
    'col-fit', 'col-trip', 'col-issue', 'col-expire', 'col-notes'
];

// Default Column Widths
const defaultColumnWidths = {
    'col-idx': 55,
    'col-name': 240,
    'col-picture': 90,
    'col-ic': 130,
    'col-passport': 120,
    'col-gender': 100,
    'col-age': 90,
    'col-dob': 100,
    'col-dobf': 160,
    'col-nat': 110,
    'col-visa': 140,
    'col-passcopy': 140,
    'col-visacopy': 140,
    'col-mofabio': 140,
    'col-fit': 90,
    'col-trip': 200,
    'col-issue': 110,
    'col-expire': 110,
    'col-notes': 180
};

let columnWidths = JSON.parse(localStorage.getItem('jemaahColWidths')) || { ...defaultColumnWidths };

// CLEANED: override removed - using global var from config.js

function cleanTripName(raw){
  if(!raw) return 'TBC';
  let s = String(raw);
  // buang pattern "26/08 |" atau "26/08 | 16 - 25 OGOS 2026"
  if(s.includes('|')) s = s.split('|').pop();
  return s.trim();
}
// CLEANED: override removed - using global var from config.js
// make brand-maroon class fallback
(function(){
  const style=document.createElement('style');
  style.textContent='.bg-brand-maroon{background:#800020}.text-brand-maroon{color:#800020}.hover\\:bg-rose-900:hover{background:#600018}';
  document.head.appendChild(style);
})();


document.addEventListener('DOMContentLoaded', () => {
    const savedSort = JSON.parse(localStorage.getItem('jemaahSortSettings'));
    if (savedSort) {
        currentSortField = savedSort.field || 'NAME';
        currentSortDir = savedSort.dir || 'asc';
    }
    const savedOrder = JSON.parse(localStorage.getItem('jemaahColOrder'));
    if (savedOrder && Array.isArray(savedOrder)) {
        columnOrder = savedOrder;
    }
    renderJemaahUmrahHTML();
});

function renderJemaahUmrahHTML() {
    const container = document.getElementById('modul-jemaah-umrah');
    if (!container) return;

    container.innerHTML = `
        <div class="flex flex-col lg:flex-row gap-4 min-h-[calc(100vh-140px)] relative">
            
            <div id="jemaahTripSidebar" class="w-full lg:w-72 bg-white rounded-2xl border border-slate-300 shadow-xs p-3.5 flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out">
                
                <div class="flex items-center justify-between px-2 pb-3 mb-2 border-b border-slate-200">
                    <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Views / Filter Trip</span>
                    <div class="flex items-center space-x-1">
                        <button onclick="openAddTripModal()" class="bg-brand-maroon hover:bg-rose-900 text-white font-bold px-2.5 py-1 rounded-lg text-[10px] transition flex items-center shadow-2xs" title="Tambah Trip Baharu">
                            <i class="fa-solid fa-plus mr-1"></i> Trip
                        </button>
                        <button id="btnRefreshSidebarJemaah" onclick="fetchJemaahUmrahData(true)" class="text-slate-500 hover:text-slate-900 text-xs p-1" title="Refresh Data">
                            <i id="iconRefreshJemaah" class="fa-solid fa-rotate"></i>
                        </button>
                        <button onclick="toggleTripSidebar()" class="text-slate-500 hover:text-brand-maroon text-xs p-1 rounded-lg hover:bg-slate-100 transition" title="Sorok Panel Trip">
                            <i class="fa-solid fa-angles-left"></i>
                        </button>
                    </div>
                </div>

                <div class="relative mb-3">
                    <i class="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400 text-xs"></i>
                    <input type="text" id="searchTripViewInput" onkeyup="filterTripViewSidebar()" placeholder="Find a view..." 
                        class="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400">
                </div>

                <div id="jemaahViewsSidebar" class="space-y-1 overflow-y-auto flex-1 max-h-[72vh] pr-1">
                    <div class="text-center py-8 text-slate-400 text-xs"><i class="fa-solid fa-spinner fa-spin mr-1"></i> Memuat views...</div>
                </div>
            </div>

            <div class="flex-1 flex flex-col space-y-3 min-w-0">
                
                <div class="bg-white p-3 px-4 rounded-2xl border border-slate-300 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div class="flex items-center space-x-2.5">
                        <button id="showTripSidebarBtn" onclick="toggleTripSidebar()" class="hidden bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2.5 py-1.5 rounded-xl transition text-xs border border-slate-300" title="Tunjukkan Panel Trip">
                            <i class="fa-solid fa-angles-right"></i>
                        </button>

                        <i class="fa-solid fa-table-cells text-brand-maroon"></i>
                        <span id="currentViewTitle" class="font-extrabold text-slate-900 text-sm">SILA PILIH TRIP</span>
                        <span id="jemaahCountBadge" class="bg-slate-100 text-slate-700 font-bold px-2.5 py-0.5 rounded-full text-[10px] border border-slate-200">0 records</span>
                    </div>

                    <div class="flex items-center space-x-2">
                        <button onclick="openAddJemaahModal()" class="bg-brand-maroon hover:bg-rose-900 text-white font-bold px-3 py-1.5 rounded-xl transition text-xs flex items-center shadow-xs">
                            <i class="fa-solid fa-plus mr-1.5"></i> Add Jemaah
                        </button>

                        <div class="relative">
                            <button onclick="toggleSortDropdown()" class="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl transition text-xs flex items-center border border-slate-300">
                                <i class="fa-solid fa-arrow-down-short-wide mr-1.5 text-brand-maroon"></i> 
                                <span id="sortBtnLabel">Sorted</span>
                            </button>

                            <div id="sortDropdownMenu" class="hidden absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-300 z-50 p-3 text-xs space-y-3">
                                <div class="font-bold text-slate-400 text-[10px] uppercase border-b border-slate-200 pb-1">Susun Mengikut Field</div>
                                <div>
                                    <label class="block font-bold text-slate-700 mb-1">Pilih Field:</label>
                                    <select id="sortFieldSelect" class="w-full p-2 border border-slate-300 rounded-xl bg-slate-50 font-semibold text-slate-800 focus:outline-none">
                                        <option value="NAME">NAME</option>
                                        <option value="IC NO.">IC NO.</option>
                                        <option value="PASSPORT NO.">PASSPORT NO.</option>
                                        <option value="GENDER">GENDER</option>
                                        <option value="AGE">AGE</option>
                                        <option value="DOB">DOB</option>
                                        <option value="STATUS VISA">STATUS VISA</option>
                                        <option value="NATIONALITY">NATIONALITY</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block font-bold text-slate-700 mb-1">Arah Susunan:</label>
                                    <select id="sortDirSelect" class="w-full p-2 border border-slate-300 rounded-xl bg-slate-50 font-semibold text-slate-800 focus:outline-none">
                                        <option value="asc">Ascending (A ➔ Z / Awal ➔ Akhir)</option>
                                        <option value="desc">Descending (Z ➔ A / Akhir ➔ Awal)</option>
                                    </select>
                                </div>
                                <button onclick="applySortSettings()" class="w-full bg-slate-900 text-white font-bold py-2 rounded-xl hover:bg-black transition">
                                    Terapkan Sort
                                </button>
                            </div>
                        </div>

                        <div class="relative">
                            <button onclick="toggleHideFieldsDropdown()" class="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl transition text-xs flex items-center border border-slate-300">
                                <i class="fa-solid fa-eye-slash mr-1.5 text-slate-500"></i> Hide fields
                            </button>

                            <div id="hideFieldsDropdown" class="hidden absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-300 z-50 p-3 text-xs space-y-2 max-h-80 overflow-y-auto">
                                <div class="font-bold text-slate-400 text-[10px] uppercase border-b border-slate-200 pb-1">Tunjukkan / Sorok Column</div>
                                <div id="fieldsToggleList" class="space-y-1.5"></div>
                            </div>
                        </div>

                        <div class="relative">
                            <i class="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400 text-xs"></i>
                            <input type="text" id="searchJemaahInput" onkeyup="filterJemaahTable()" placeholder="Cari Nama / IC / Passport..." 
                                class="text-xs pl-8 pr-3 py-1.5 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 w-44 sm:w-60">
                        </div>
                    </div>
                </div>

                <div class="bg-white rounded-2xl border border-slate-300 shadow-xs overflow-hidden flex-1 relative">
                    <div class="overflow-x-auto max-h-[72vh]">
                        <table class="w-full text-left text-xs border-collapse whitespace-nowrap table-fixed border-slate-300" id="mainJemaahGridTable">
                            <thead class="bg-slate-100 text-slate-700 font-extrabold uppercase tracking-wider sticky top-0 z-20 border-b-2 border-slate-300">
                                <tr id="jemaahTableHeaderRow">
                                    </tr>
                            </thead>
                            <tbody id="jemaahTableBody" class="divide-y divide-slate-300 font-medium text-slate-800">
                                <tr>
                                    <td colspan="19" class="text-center py-24 text-slate-400">
                                        <i class="fa-solid fa-hand-pointer text-3xl mb-3 text-brand-maroon animate-bounce"></i>
                                        <p class="font-bold text-sm text-slate-700">Sila pilih trip di sebelah kiri untuk memaparkan senarai jemaah.</p>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

        </div>

        <div id="bulkActionBar" class="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl z-50 flex items-center space-x-4 border border-slate-700 hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
            <span class="text-xs font-bold text-slate-200"><span id="selectedCountText">0</span> jemaah dipilih</span>
            <div class="h-4 w-[1px] bg-slate-700"></div>
            <button id="btnBulkDelete" onclick="bulkDeleteJemaah()" class="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center">
                <i class="fa-solid fa-trash-can mr-1.5"></i> Padam Rekod
            </button>
            <button onclick="clearJemaahSelection()" class="text-xs text-slate-400 hover:text-white font-semibold">
                Batal
            </button>
        </div>

        <div id="expandRecordModal" class="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 hidden">
            <div class="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
                
                <div class="bg-slate-50 border-b border-slate-200 p-4 px-6 flex items-center justify-between">
                    <div class="flex items-center space-x-2">
                        <i class="fa-solid fa-address-card text-brand-maroon text-base"></i>
                        <span id="expandModalTitle" class="font-extrabold text-slate-800 text-sm">EXPAND RECORD</span>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button id="modalDeleteBtn" onclick="" class="text-rose-600 hover:bg-rose-50 font-bold text-xs px-3 py-1.5 rounded-xl border border-rose-200 transition">
                            <i class="fa-solid fa-trash-can mr-1"></i> Padam
                        </button>
                        <button onclick="closeExpandModal()" class="text-slate-400 hover:text-slate-900 text-lg p-1.5 rounded-xl hover:bg-slate-200/60 transition">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                </div>

                <div class="flex-1 overflow-y-auto p-6 sm:p-8 space-y-5 text-xs text-slate-700" id="expandModalFormContainer">
                </div>

                <div class="bg-slate-50 border-t border-slate-200 p-4 px-6 flex items-center justify-end space-x-3">
                    <button onclick="closeExpandModal()" class="px-4 py-2 font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition">
                        Tutup
                    </button>
                    <button id="modalSaveBtn" onclick="" class="bg-slate-900 hover:bg-black text-white font-bold px-5 py-2 rounded-xl shadow-xs transition">
                        Simpan Perubahan
                    </button>
                </div>

            </div>
        </div>

        <div id="attachmentPreviewModal" class="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 hidden">
            <div class="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-700 animate-in fade-in zoom-in duration-150">
                <div class="bg-slate-900 text-white p-4 px-6 flex items-center justify-between">
                    <div class="flex items-center space-x-2">
                        <i class="fa-solid fa-file-image text-emerald-400"></i>
                        <span id="previewTitle" class="font-bold text-xs truncate max-w-md">Attachment Preview</span>
                    </div>
                    <div class="flex items-center space-x-3">
                        <a id="downloadAttachmentBtn" href="#" target="_blank" download class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition flex items-center">
                            <i class="fa-solid fa-download mr-1.5"></i> Download
                        </a>
                        <button onclick="closePreviewModal()" class="text-slate-400 hover:text-white text-lg p-1">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                </div>

                <div class="flex-1 bg-slate-950 p-4 flex items-center justify-center overflow-auto min-h-[450px]">
                    <img id="previewImage" src="" class="max-h-[75vh] max-w-full object-contain rounded-lg hidden shadow-2xl">
                    <iframe id="previewPdf" src="" class="w-full h-[75vh] rounded-lg hidden border-0"></iframe>
                </div>
            </div>
        </div>
    `;

    renderTableHeader();
    buildHideFieldsList();
    initColumnResizers();
    initHeaderDragAndDrop();
    applySavedColumnWidths();
    updateSortBtnLabel();
    fetchJemaahUmrahData(); 
}

function toggleTripSidebar() {
    const sidebar = document.getElementById('jemaahTripSidebar');
    const showBtn = document.getElementById('showTripSidebarBtn');

    if (!sidebar) return;

    if (sidebar.classList.contains('hidden')) {
        sidebar.classList.remove('hidden');
        if (showBtn) showBtn.classList.add('hidden');
    } else {
        sidebar.classList.add('hidden');
        if (showBtn) showBtn.classList.remove('hidden');
    }
}

function injectResizerStyles() {
    if (document.getElementById('resizerStyles')) return;
    const style = document.createElement('style');
    style.id = 'resizerStyles';
    style.innerHTML = `
        .col-resizer {
            position: absolute;
            right: 0;
            top: 0;
            bottom: 0;
            width: 6px;
            cursor: col-resize;
            user-select: none;
            z-index: 40;
        }
        .col-resizer:hover, .col-resizer.resizing {
            background-color: #be123c;
        }
        .idx-cell .idx-num { display: inline-block; }
        .idx-cell .idx-check { display: none; }
        .idx-cell .idx-expand { display: none; }
        
        .idx-cell:hover .idx-num { display: none; }
        .idx-cell:hover .idx-check { display: inline-block; }
        .idx-cell:hover .idx-expand { display: inline-block; }

        .idx-cell.is-checked .idx-num { display: none; }
        .idx-cell.is-checked .idx-check { display: inline-block; }
        .idx-cell.is-checked .idx-expand { display: inline-block; }

        th.draggable-header {
            cursor: grab;
        }
        th.draggable-header:active {
            cursor: grabbing;
        }
        th.drag-over {
            border-left: 3px solid #be123c !important;
            background-color: #ffe4e6 !important;
        }
    `;
    document.head.appendChild(style);
}

function cleanTripName(tripName) {
    if (!tripName) return 'TBC';
    return tripName.replace(/^[\d\/]+\s*\|\s*/i, '').trim();
}

async function fetchTripMapping() {
    try{
      if (typeof AIRTABLE_PAT === 'undefined' || !AIRTABLE_PAT) {
        AIRTABLE_PAT = window.AIRTABLE_PAT || localStorage.getItem('effah_api_pat') || window.DEFAULT_PAT || 'patjxZg6G22e9OBuS.2a96ced64af7e931ee4d83f65c491adf1241813547d5d8e3a317f5bc6d9a8de7';
        AIRTABLE_BASE_ID = window.AIRTABLE_BASE_ID || localStorage.getItem('effah_base_id') || window.DEFAULT_BASE_ID || 'appSsn4JyQD4DnYu0';
      }
    }catch(e){}
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/PAKEJ%20UMRAH?sort[0][field]=Mula%20Pakej&sort[0][direction]=asc&sort[1][field]=Tamat%20Pakej&sort[1][direction]=asc`;
    try {
        const response = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_PAT}` } });
        const data = await response.json();
        rawTripRecordsList = data.records || [];
        
        tripMap = {};
        rawTripRecordsList.forEach(r => {
            const rawName = r.fields['Trip'] || r.fields['NAME'] || 'TBC';
            tripMap[r.id] = {
                title: cleanTripName(rawName),
                mula: r.fields['Mula Pakej'] || '',
                tamat: r.fields['Tamat Pakej'] || ''
            };
        });
    } catch (e) {
        console.error("Error fetching trip map:", e);
    }
}

async function fetchJemaahUmrahData(isManualClick = false) {
    try{
      if (typeof AIRTABLE_PAT === 'undefined' || !AIRTABLE_PAT) {
        AIRTABLE_PAT = window.AIRTABLE_PAT || localStorage.getItem('effah_api_pat') || window.DEFAULT_PAT || 'patjxZg6G22e9OBuS.2a96ced64af7e931ee4d83f65c491adf1241813547d5d8e3a317f5bc6d9a8de7';
        AIRTABLE_BASE_ID = window.AIRTABLE_BASE_ID || localStorage.getItem('effah_base_id') || window.DEFAULT_BASE_ID || 'appSsn4JyQD4DnYu0';
      }
    }catch(e){}

    const icon = document.getElementById('iconRefreshJemaah');
    if (icon) icon.classList.add('fa-spin');

    const cachedData = localStorage.getItem('cache_jemaah_records');
    if (cachedData && allJemaahUmrahRecords.length === 0) {
        try {
            allJemaahUmrahRecords = JSON.parse(cachedData);
            const statJemaah = document.getElementById('statJemaahUmrahCount');
            if (statJemaah) statJemaah.textContent = allJemaahUmrahRecords.length;
            renderViewsSidebar();
        } catch (e) {
            console.error("Cache parse error:", e);
        }
    }

    await fetchTripMapping();

    let newFetchedRecords = [];
    let offset = '';

    try {
        do {
            let url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/DATA%20JEMAAH%20UMRAH?pageSize=100`;
            if (offset) url += `&offset=${offset}`;

            const response = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_PAT}` } });
            const data = await response.json();

            if (data.records) {
                newFetchedRecords = newFetchedRecords.concat(data.records);
            }
            offset = data.offset || '';
        } while (offset);

        allJemaahUmrahRecords = newFetchedRecords;
        localStorage.setItem('cache_jemaah_records', JSON.stringify(allJemaahUmrahRecords));

        const statJemaah = document.getElementById('statJemaahUmrahCount');
        if (statJemaah) statJemaah.textContent = allJemaahUmrahRecords.length;

        renderViewsSidebar();
        filterAndRenderJemaahGrid();
    } catch (err) {
        console.error("Background sync error:", err);
    } finally {
        if (icon) icon.classList.remove('fa-spin');
    }
}

function getResolvedTripName(tripField) {
    if (!tripField) return 'TBC';
    let rawVal = Array.isArray(tripField) ? tripField[0] : tripField;
    if (!rawVal) return 'TBC';

    if (rawVal.startsWith('rec') && tripMap[rawVal]) {
        return tripMap[rawVal].title;
    }
    return cleanTripName(rawVal);
}

function renderViewsSidebar() {
    const container = document.getElementById('jemaahViewsSidebar');
    if (!container) return;
    container.innerHTML = '';

    const baseViews = [
        { id: 'ALL', name: 'ALL JEMAAH', icon: 'fa-table' },
        { id: 'TBC', name: 'TBC / TANPA TRIP', icon: 'fa-folder-open' }
    ];

    baseViews.forEach(v => {
        const isActive = selectedTripFilter === v.id;
        const btn = document.createElement('button');
        btn.onclick = () => selectTripFilter(v.id, v.name);
        btn.className = `w-full text-left p-2 px-3 rounded-xl text-xs font-bold transition flex items-center space-x-2.5 ${isActive ? 'bg-slate-100 text-slate-900 border border-slate-300/80 shadow-2xs' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`;
        btn.innerHTML = `<i class="fa-solid ${v.icon} text-slate-400 text-xs w-4"></i><span class="truncate">${v.name}</span>`;
        container.appendChild(btn);
    });

    const hr = document.createElement('div');
    hr.className = "my-2 border-t border-slate-200";
    container.appendChild(hr);

    rawTripRecordsList.forEach(rec => {
        const title = tripMap[rec.id] ? tripMap[rec.id].title : cleanTripName(rec.fields['Trip']);
        if (!title || title === 'TBC') return;

        const isActive = selectedTripFilter === title;

        const btn = document.createElement('button');
        btn.onclick = () => selectTripFilter(title, title);
        btn.className = `w-full text-left p-2 px-3 rounded-xl text-xs font-semibold transition flex items-center space-x-2.5 ${isActive ? 'bg-slate-100 text-slate-900 border border-slate-300/80 shadow-2xs' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`;
        btn.innerHTML = `<i class="fa-solid fa-list-check text-brand-maroon text-xs w-4"></i><span class="truncate">${title}</span>`;
        container.appendChild(btn);
    });
}

function selectTripFilter(tripId, displayTitle) {
    selectedTripFilter = tripId;
    const titleEl = document.getElementById('currentViewTitle');
    if (titleEl) titleEl.textContent = displayTitle.toUpperCase();

    renderViewsSidebar();
    filterAndRenderJemaahGrid();
}

function renderTableHeader() {
    const tr = document.getElementById('jemaahTableHeaderRow');
    if (!tr) return;
    tr.innerHTML = '';

    const headersMap = {
        'col-idx': `<th class="p-2 border-r border-slate-300 text-center sticky left-0 z-30 bg-slate-100 col-idx relative select-none"><input type="checkbox" id="masterJemaahCheckbox" onchange="toggleSelectAllJemaah(this.checked)" class="w-3.5 h-3.5 rounded border-slate-300 text-brand-maroon focus:ring-brand-maroon cursor-pointer"><div class="col-resizer"></div></th>`,
        'col-name': `<th draggable="true" data-col="col-name" class="p-3 border-r border-slate-300 sticky left-[55px] z-30 bg-slate-100 col-name draggable-header relative select-none shadow-[3px_0_6px_-2px_rgba(0,0,0,0.15)] overflow-hidden text-ellipsis">NAME<div class="col-resizer"></div></th>`,
        'col-picture': `<th draggable="true" data-col="col-picture" class="p-3 border-r border-slate-300 text-center col-picture draggable-header relative select-none overflow-hidden text-ellipsis">PICTURE<div class="col-resizer"></div></th>`,
        'col-ic': `<th draggable="true" data-col="col-ic" class="p-3 border-r border-slate-300 col-ic draggable-header relative select-none overflow-hidden text-ellipsis">IC NO.<div class="col-resizer"></div></th>`,
        'col-passport': `<th draggable="true" data-col="col-passport" class="p-3 border-r border-slate-300 col-passport draggable-header relative select-none overflow-hidden text-ellipsis">PASSPORT NO.<div class="col-resizer"></div></th>`,
        'col-gender': `<th draggable="true" data-col="col-gender" class="p-3 border-r border-slate-300 col-gender draggable-header relative select-none overflow-hidden text-ellipsis">GENDER<div class="col-resizer"></div></th>`,
        'col-age': `<th draggable="true" data-col="col-age" class="p-3 border-r border-slate-300 col-age draggable-header relative select-none overflow-hidden text-ellipsis">🔒 AGE<div class="col-resizer"></div></th>`,
        'col-dob': `<th draggable="true" data-col="col-dob" class="p-3 border-r border-slate-300 col-dob draggable-header relative select-none overflow-hidden text-ellipsis">🔒 DOB<div class="col-resizer"></div></th>`,
        'col-dobf': `<th draggable="true" data-col="col-dobf" class="p-3 border-r border-slate-300 col-dobf draggable-header relative select-none overflow-hidden text-ellipsis">DOB (FOREIGNER)<div class="col-resizer"></div></th>`,
        'col-nat': `<th draggable="true" data-col="col-nat" class="p-3 border-r border-slate-300 col-nat draggable-header relative select-none overflow-hidden text-ellipsis">NATIONALITY<div class="col-resizer"></div></th>`,
        'col-visa': `<th draggable="true" data-col="col-visa" class="p-3 border-r border-slate-300 col-visa draggable-header relative select-none overflow-hidden text-ellipsis">STATUS VISA<div class="col-resizer"></div></th>`,
        'col-passcopy': `<th draggable="true" data-col="col-passcopy" class="p-3 border-r border-slate-300 col-passcopy draggable-header relative select-none overflow-hidden text-ellipsis">PASSPORT COPY<div class="col-resizer"></div></th>`,
        'col-visacopy': `<th draggable="true" data-col="col-visacopy" class="p-3 border-r border-slate-300 col-visacopy draggable-header relative select-none overflow-hidden text-ellipsis">VISA COPY<div class="col-resizer"></div></th>`,
        'col-mofabio': `<th draggable="true" data-col="col-mofabio" class="p-3 border-r border-slate-300 col-mofabio draggable-header relative select-none overflow-hidden text-ellipsis">MOFABIO<div class="col-resizer"></div></th>`,
        'col-fit': `<th draggable="true" data-col="col-fit" class="p-3 border-r border-slate-300 text-center col-fit draggable-header relative select-none overflow-hidden text-ellipsis">FIT TICKET<div class="col-resizer"></div></th>`,
        'col-trip': `<th draggable="true" data-col="col-trip" class="p-3 border-r border-slate-300 col-trip draggable-header relative select-none overflow-hidden text-ellipsis">TRIP<div class="col-resizer"></div></th>`,
        'col-issue': `<th draggable="true" data-col="col-issue" class="p-3 border-r border-slate-300 col-issue draggable-header relative select-none overflow-hidden text-ellipsis">DATE OF ISSUE<div class="col-resizer"></div></th>`,
        'col-expire': `<th draggable="true" data-col="col-expire" class="p-3 border-r border-slate-300 col-expire draggable-header relative select-none overflow-hidden text-ellipsis">DATE OF EXPIRE<div class="col-resizer"></div></th>`,
        'col-notes': `<th draggable="true" data-col="col-notes" class="p-3 col-notes draggable-header relative select-none overflow-hidden text-ellipsis">NOTES<div class="col-resizer"></div></th>`
    };

    columnOrder.forEach(colKey => {
        if (headersMap[colKey]) {
            tr.insertAdjacentHTML('beforeend', headersMap[colKey]);
        }
    });
}

function filterAndRenderJemaahGrid() {
    const tbody = document.getElementById('jemaahTableBody');
    const countBadge = document.getElementById('jemaahCountBadge');

    if (!selectedTripFilter) {
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="19" class="text-center py-24 text-slate-400">
                        <i class="fa-solid fa-hand-pointer text-3xl mb-3 text-brand-maroon animate-bounce"></i>
                        <p class="font-bold text-sm text-slate-700">Sila pilih trip di sebelah kiri untuk memaparkan senarai jemaah.</p>
                    </td>
                </tr>
            `;
        }
        if (countBadge) countBadge.textContent = '0 records';
        return;
    }

    let filtered = [...allJemaahUmrahRecords];

    if (selectedTripFilter === 'TBC') {
        filtered = filtered.filter(j => {
            const tName = getResolvedTripName(j.fields['TRIP']);
            return tName === 'TBC';
        });
    } else if (selectedTripFilter !== 'ALL') {
        filtered = filtered.filter(j => {
            const tName = getResolvedTripName(j.fields['TRIP']);
            return tName === selectedTripFilter;
        });
    }

    const query = (document.getElementById('searchJemaahInput')?.value || '').toLowerCase();
    if (query) {
        filtered = filtered.filter(rec => {
            const f = rec.fields;
            const name = (f['NAME'] || '').toLowerCase();
            const ic = (f['IC NO.'] || '').toLowerCase();
            const passport = (f['PASSPORT NO.'] || '').toLowerCase();
            return name.includes(query) || ic.includes(query) || passport.includes(query);
        });
    }

    filtered.sort((a, b) => {
        let valA = a.fields[currentSortField] || '';
        let valB = b.fields[currentSortField] || '';

        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return currentSortDir === 'asc' ? -1 : 1;
        if (valA > valB) return currentSortDir === 'asc' ? 1 : -1;
        return 0;
    });

    if (countBadge) countBadge.textContent = `${filtered.length} records`;

    renderJemaahRows(filtered);
}

function renderJemaahRows(records) {
    const tbody = document.getElementById('jemaahTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="19" class="text-center py-12 text-slate-400">Tiada rekod jemaah untuk view ini.</td></tr>';
        return;
    }

    records.forEach((rec, idx) => {
        const f = rec.fields;
        const id = rec.id;

        const isChecked = selectedJemaahIds.has(id);
        const pictureFiles = getAttachmentArray(f['PICTURE']);
        const passCopyFiles = getAttachmentArray(f['PASSPORT COPY']);
        const visaCopyFiles = getAttachmentArray(f['VISA COPY']);
        const mofabioFiles = getAttachmentArray(f['MOFABIO']);
        const actualTripName = getResolvedTripName(f['TRIP']);

        const tr = document.createElement('tr');
        tr.className = `hover:bg-slate-50 transition group ${isChecked ? 'bg-amber-50/60' : ''}`;
        tr.id = `jemaah-row-${id}`;

        const cellRenderers = {
            'col-idx': `<td class="p-2 border-r border-slate-300 text-center font-bold text-slate-500 bg-slate-50 sticky left-0 z-10 group-hover:bg-slate-100 col-idx idx-cell ${isChecked ? 'is-checked' : ''}"><span class="idx-num">${idx + 1}</span><div class="inline-flex items-center space-x-1"><input type="checkbox" ${isChecked ? 'checked' : ''} onchange="toggleSelectJemaahRow('${id}', this.checked)" class="idx-check w-3.5 h-3.5 rounded border-slate-300 text-brand-maroon focus:ring-brand-maroon cursor-pointer"><button type="button" onclick="openExpandModal('${id}')" class="idx-expand text-[10px] bg-white border border-slate-300 text-slate-600 rounded p-0.5 hover:bg-slate-100 shadow-2xs" title="Expand Record">⤢</button></div></td>`,
            'col-name': `<td class="p-1 border-r border-slate-300 sticky left-[55px] z-10 ${isChecked ? 'bg-amber-50/80' : 'bg-white'} group-hover:bg-slate-50 col-name shadow-[3px_0_6px_-2px_rgba(0,0,0,0.15)]"><div class="flex items-center justify-between group/name"><input type="text" value="${f['NAME'] || ''}" onchange="updateJemaahField('${id}', 'NAME', this.value)" class="w-full text-xs p-1.5 font-bold uppercase rounded-lg border border-transparent hover:border-slate-300 focus:border-brand-maroon focus:bg-white bg-transparent"><button onclick="openExpandModal('${id}')" class="text-slate-400 hover:text-brand-maroon px-1 hidden group-hover/name:block" title="Buka Detail Modal"><i class="fa-solid fa-up-right-and-down-left-from-center text-[10px]"></i></button></div></td>`,
            'col-picture': `<td class="p-2 border-r border-slate-300 text-center col-picture">${renderInlineUploadCell(id, 'PICTURE', pictureFiles, 'Pic')}</td>`,
            'col-ic': `<td class="p-1 border-r border-slate-300 col-ic"><input type="text" value="${f['IC NO.'] || ''}" onchange="updateJemaahField('${id}', 'IC NO.', this.value)" class="w-full text-xs p-1.5 font-mono rounded-lg border border-transparent hover:border-slate-300 focus:border-brand-maroon focus:bg-white bg-transparent"></td>`,
            'col-passport': `<td class="p-1 border-r border-slate-300 col-passport"><input type="text" value="${f['PASSPORT NO.'] || ''}" onchange="updateJemaahField('${id}', 'PASSPORT NO.', this.value)" class="w-full text-xs p-1.5 font-mono font-bold uppercase rounded-lg border border-transparent hover:border-slate-300 focus:border-brand-maroon focus:bg-white bg-transparent"></td>`,
            'col-gender': `<td class="p-1 border-r border-slate-300 col-gender"><select onchange="updateJemaahField('${id}', 'GENDER', this.value)" class="w-full text-xs p-1.5 font-bold rounded-lg border border-transparent hover:border-slate-300 focus:bg-white bg-transparent"><option value="">--</option><option value="MALE" ${f['GENDER'] === 'MALE' ? 'selected' : ''}>MALE</option><option value="FEMALE" ${f['GENDER'] === 'FEMALE' ? 'selected' : ''}>FEMALE</option></select></td>`,
            'col-age': `<td class="p-2.5 border-r border-slate-300 bg-slate-50/50 font-semibold text-slate-600 col-age" id="age-cell-${id}">${f['AGE'] || '-'}</td>`,
            'col-dob': `<td class="p-2.5 border-r border-slate-300 bg-slate-50/50 font-semibold text-slate-600 col-dob" id="dob-cell-${id}">${f['DOB'] || '-'}</td>`,
            'col-dobf': `<td class="p-1 border-r border-slate-300 col-dobf"><input type="date" value="${f['DOB (FOREIGNER)'] || ''}" onchange="updateJemaahField('${id}', 'DOB (FOREIGNER)', this.value)" class="w-full text-xs p-1.5 rounded-lg border border-transparent hover:border-slate-300 focus:bg-white bg-transparent"></td>`,
            'col-nat': `<td class="p-1 border-r border-slate-300 col-nat"><select onchange="updateJemaahField('${id}', 'NATIONALITY', this.value)" class="w-full text-xs p-1.5 font-bold rounded-lg border border-transparent hover:border-slate-300 focus:bg-white bg-transparent"><option value="MALAYSIA" ${(!f['NATIONALITY'] || f['NATIONALITY'] === 'MALAYSIA') ? 'selected' : ''}>MALAYSIA</option><option value="INDONESIA" ${f['NATIONALITY'] === 'INDONESIA' ? 'selected' : ''}>INDONESIA</option><option value="THAILAND" ${f['NATIONALITY'] === 'THAILAND' ? 'selected' : ''}>THAILAND</option><option value="INDIA" ${f['NATIONALITY'] === 'INDIA' ? 'selected' : ''}>INDIA</option><option value="BANGLADESH" ${f['NATIONALITY'] === 'BANGLADESH' ? 'selected' : ''}>BANGLADESH</option></select></td>`,
            'col-visa': `<td class="p-1 border-r border-slate-300 col-visa"><select onchange="updateJemaahField('${id}', 'STATUS VISA', this.value)" class="w-full text-xs p-1.5 font-bold rounded-lg border border-transparent hover:border-slate-300 focus:bg-white bg-transparent"><option value="">-- Pilih --</option><option value="TOURIST" ${f['STATUS VISA'] === 'TOURIST' ? 'selected' : ''}>TOURIST</option><option value="TOURIST (VALID)" ${f['STATUS VISA'] === 'TOURIST (VALID)' ? 'selected' : ''}>TOURIST (VALID)</option><option value="UMRAH" ${f['STATUS VISA'] === 'UMRAH' ? 'selected' : ''}>UMRAH</option><option value="UMRAH (VALID)" ${f['STATUS VISA'] === 'UMRAH (VALID)' ? 'selected' : ''}>UMRAH (VALID)</option><option value="IQAMA (VALID)" ${f['STATUS VISA'] === 'IQAMA (VALID)' ? 'selected' : ''}>IQAMA (VALID)</option></select></td>`,
            'col-passcopy': `<td class="p-2 border-r border-slate-300 text-center col-passcopy">${renderInlineUploadCell(id, 'PASSPORT COPY', passCopyFiles, 'Passport')}</td>`,
            'col-visacopy': `<td class="p-2 border-r border-slate-300 text-center col-visacopy">${renderInlineUploadCell(id, 'VISA COPY', visaCopyFiles, 'Visa')}</td>`,
            'col-mofabio': `<td class="p-2 border-r border-slate-300 text-center col-mofabio">${renderInlineUploadCell(id, 'MOFABIO', mofabioFiles, 'Mofabio')}</td>`,
            'col-fit': `<td class="p-2 border-r border-slate-300 text-center col-fit"><input type="checkbox" ${f['FIT TICKET'] ? 'checked' : ''} onchange="updateJemaahField('${id}', 'FIT TICKET', this.checked)" class="w-4 h-4 rounded text-brand-maroon focus:ring-brand-maroon"></td>`,
            'col-trip': `<td class="p-2.5 border-r border-slate-300 font-bold text-brand-maroon col-trip">${actualTripName}</td>`,
            'col-issue': `<td class="p-1 border-r border-slate-300 col-issue"><input type="date" value="${f['DATE OF ISSUE'] || ''}" onchange="updateJemaahField('${id}', 'DATE OF ISSUE', this.value)" class="w-full text-xs p-1.5 rounded-lg border border-transparent hover:border-slate-300 focus:bg-white bg-transparent"></td>`,
            'col-expire': `<td class="p-1 border-r border-slate-300 col-expire"><input type="date" value="${f['DATE OF EXPIRE'] || ''}" onchange="updateJemaahField('${id}', 'DATE OF EXPIRE', this.value)" class="w-full text-xs p-1.5 rounded-lg border border-transparent hover:border-slate-300 focus:bg-white bg-transparent"></td>`,
            'col-notes': `<td class="p-1 col-notes"><input type="text" value="${f['Notes'] || ''}" onchange="updateJemaahField('${id}', 'Notes', this.value)" class="w-full text-xs p-1.5 rounded-lg border border-transparent hover:border-slate-300 focus:bg-white bg-transparent"></td>`
        };

        columnOrder.forEach(colKey => {
            if (cellRenderers[colKey]) {
                tr.insertAdjacentHTML('beforeend', cellRenderers[colKey]);
            }
        });

        tbody.appendChild(tr);
    });

    applyHiddenColumns();
    applySavedColumnWidths();
    updateBulkActionBar();
}

// 📁 RENDER CELL UNTUK DIRECT INLINE MULTIPLE UPLOAD WITH ANIMATED LOADING INDICATOR
function renderInlineUploadCell(recId, fieldName, fileList, labelName) {
    const files = Array.isArray(fileList) ? fileList : [];
    const cellBoxId = `cell-upload-${recId}-${fieldName.replace(/\s+/g, '_')}`;

    let filesListHtml = '';
    if (files.length > 0) {
        filesListHtml = files.map((fileObj, idx) => {
            const fileUrl = fileObj.url;
            const fileName = fileObj.filename || `${labelName} ${idx + 1}`;
            const isPdf = fileUrl && (fileUrl.toLowerCase().includes('.pdf') || fileUrl.toLowerCase().includes('/pdf/'));

            return `
                <div class="flex items-center space-x-1 my-0.5">
                    ${isPdf ? `
                        <button onclick="openPreviewModal('${fileUrl}', '${fileName}')" class="bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold px-1.5 py-0.5 rounded text-[10px] border border-rose-200 truncate max-w-[70px]" title="${fileName}">PDF</button>
                    ` : `
                        <img src="${fileUrl}" onclick="openPreviewModal('${fileUrl}', '${fileName}')" class="w-6 h-6 rounded object-cover border border-slate-300 cursor-pointer hover:scale-110 transition" title="${fileName}">
                    `}
                    <button onclick="confirmDeleteAttachment('${recId}', '${fieldName}', ${idx})" class="text-slate-400 hover:text-rose-600 p-0.5" title="Padam Fail Ini"><i class="fa-solid fa-xmark text-[10px]"></i></button>
                </div>
            `;
        }).join('');
    }

    return `
        <div id="${cellBoxId}" class="inline-flex flex-wrap items-center justify-center gap-1 w-full group/cell relative p-1 rounded-lg transition" 
             ondragover="event.preventDefault(); this.classList.add('bg-rose-50', 'border-brand-maroon');" 
             ondragleave="this.classList.remove('bg-rose-50', 'border-brand-maroon');"
             ondrop="event.preventDefault(); this.classList.remove('bg-rose-50', 'border-brand-maroon'); if(event.dataTransfer.files) handleInlineFileUpload('${recId}', '${fieldName}', event.dataTransfer.files, '${cellBoxId}')">
            
            ${filesListHtml}

            <label class="cursor-pointer bg-slate-100 hover:bg-brand-maroon hover:text-white text-slate-600 px-2 py-1 rounded text-[10px] font-bold transition flex items-center shadow-2xs" title="Klik atau Drop fail banyak di sini">
                <i class="fa-solid fa-cloud-arrow-up ${files.length > 0 ? 'mr-0' : 'mr-1'}"></i>
                <span class="${files.length > 0 ? 'hidden' : 'inline'}">Upload</span>
                <input type="file" multiple class="hidden" accept="image/*,application/pdf" onchange="if(this.files.length) handleInlineFileUpload('${recId}', '${fieldName}', this.files, '${cellBoxId}')">
            </label>
        </div>
    `;
}

// 📤 PROSES UPLOAD BANYAK FAIL TERUS DARI TABLE WITH CELL LOADING INDICATOR
async function handleInlineFileUpload(recId, fieldName, fileList, cellBoxId) {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    const cellContainer = document.getElementById(cellBoxId);
    if (cellContainer) {
        cellContainer.innerHTML = `
            <div class="flex items-center space-x-1 bg-rose-50 text-brand-maroon font-bold text-[10px] px-2 py-1 rounded border border-rose-200 animate-pulse">
                <i class="fa-solid fa-spinner fa-spin text-xs"></i>
                <span>Uploading (${files.length})...</span>
            </div>
        `;
    }

    try {
        const cloudName = "dfb839ep"; 
        const uploadPreset = "Effah Travel";  

        // 1. Upload semua fail ke Cloudinary secara selari
        const uploadPromises = files.map(async (file) => {
            const uploadFormData = new FormData();
            uploadFormData.append("file", file);
            uploadFormData.append("upload_preset", uploadPreset);

            const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
                method: "POST",
                body: uploadFormData
            });

            const cloudData = await cloudRes.json();
            if (!cloudRes.ok || !cloudData || !cloudData.secure_url) {
                throw new Error(`Gagal muat naik: ${file.name}`);
            }

            return {
                url: cloudData.secure_url,
                filename: file.name
            };
        });

        const newUploadedFiles = await Promise.all(uploadPromises);

        // 2. Gabungkan fail sedia ada dengan fail baharu (Append)
        const targetRec = allJemaahUmrahRecords.find(r => r.id === recId);
        let currentAttachments = [];
        if (targetRec && targetRec.fields[fieldName] && Array.isArray(targetRec.fields[fieldName])) {
            currentAttachments = targetRec.fields[fieldName].map(att => ({ id: att.id, url: att.url, filename: att.filename }));
        }

        const updatedAttachments = [...currentAttachments, ...newUploadedFiles];

        // 3. Kemaskini ke Airtable
        const airtableUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/DATA%20JEMAAH%20UMRAH/${recId}`;
        const airtableRes = await fetch(airtableUrl, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_PAT}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fields: {
                    [fieldName]: updatedAttachments
                }
            })
        });

        const resultJson = await airtableRes.json();

        if (airtableRes.ok) {
            if (targetRec) {
                targetRec.fields[fieldName] = resultJson.fields[fieldName];
            }
            filterAndRenderJemaahGrid();
        } else {
            alert("Gagal simpan ke Airtable.");
            filterAndRenderJemaahGrid();
        }
    } catch (err) {
        console.error("Inline upload exception:", err);
        alert("Ralat semasa upload fail.");
        filterAndRenderJemaahGrid();
    }
}

function toggleSelectJemaahRow(id, isChecked) {
    if (isChecked) {
        selectedJemaahIds.add(id);
    } else {
        selectedJemaahIds.delete(id);
    }

    const row = document.getElementById(`jemaah-row-${id}`);
    if (row) {
        const idxCell = row.querySelector('.idx-cell');
        if (isChecked) {
            row.classList.add('bg-amber-50/60');
            if (idxCell) idxCell.classList.add('is-checked');
        } else {
            row.classList.remove('bg-amber-50/60');
            if (idxCell) idxCell.classList.remove('is-checked');
        }
    }

    updateBulkActionBar();
}

function toggleSelectAllJemaah(isChecked) {
    const visibleCheckboxes = document.querySelectorAll('.idx-check');
    visibleCheckboxes.forEach(cb => {
        cb.checked = isChecked;
        const row = cb.closest('tr');
        if (row && row.id) {
            const recId = row.id.replace('jemaah-row-', '');
            if (isChecked) {
                selectedJemaahIds.add(recId);
            } else {
                selectedJemaahIds.delete(recId);
            }
        }
    });

    filterAndRenderJemaahGrid();
}

function updateBulkActionBar() {
    const bar = document.getElementById('bulkActionBar');
    const countText = document.getElementById('selectedCountText');
    const masterCb = document.getElementById('masterJemaahCheckbox');

    if (!bar) return;

    if (selectedJemaahIds.size > 0) {
        bar.classList.remove('hidden');
        if (countText) countText.textContent = selectedJemaahIds.size;
    } else {
        bar.classList.add('hidden');
        if (masterCb) masterCb.checked = false;
    }
}

function clearJemaahSelection() {
    selectedJemaahIds.clear();
    const masterCb = document.getElementById('masterJemaahCheckbox');
    if (masterCb) masterCb.checked = false;
    filterAndRenderJemaahGrid();
}

async function bulkDeleteJemaah() {
    if (selectedJemaahIds.size === 0) return;

    if (!confirm(`Adakah anda pasti nak padam ${selectedJemaahIds.size} rekod jemaah yang dipilih dari Airtable?`)) return;

    const idsToDelete = Array.from(selectedJemaahIds);
    const delBtn = document.getElementById('btnBulkDelete');

    if (delBtn) {
        delBtn.disabled = true;
        delBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1.5"></i> Memadam...';
    }

    allJemaahUmrahRecords = allJemaahUmrahRecords.filter(r => !selectedJemaahIds.has(r.id));
    selectedJemaahIds.clear();

    filterAndRenderJemaahGrid();
    updateBulkActionBar();

    try {
        const deletePromises = idsToDelete.map(recId => {
            const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/DATA%20JEMAAH%20UMRAH/${recId}`;
            return fetch(url, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${AIRTABLE_PAT}` }
            });
        });

        await Promise.all(deletePromises);
    } catch (e) {
        console.error("Error bulk deleting from Airtable:", e);
    } finally {
        if (delBtn) {
            delBtn.disabled = false;
            delBtn.innerHTML = '<i class="fa-solid fa-trash-can mr-1.5"></i> Padam Rekod';
        }
    }
}

function openAddTripModal() {
    const modal = document.getElementById('expandRecordModal');
    const container = document.getElementById('expandModalFormContainer');
    const titleEl = document.getElementById('expandModalTitle');
    const delBtn = document.getElementById('modalDeleteBtn');
    const saveBtn = document.getElementById('modalSaveBtn');

    if (titleEl) titleEl.textContent = 'TAMBAH PAKEJ / TRIP UMRAH';
    if (delBtn) delBtn.classList.add('hidden');
    if (saveBtn) {
        saveBtn.innerHTML = 'Simpan Trip';
        saveBtn.onclick = createNewTripFromModal;
    }

    container.innerHTML = `
        <form id="addTripModalForm" class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label class="block font-extrabold text-slate-700 mb-1">MULA PAKEJ *</label>
                    <input type="date" name="Mula Pakej" required class="w-full p-3 font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-maroon focus:outline-none bg-slate-50">
                </div>
                <div>
                    <label class="block font-extrabold text-slate-700 mb-1">TAMAT PAKEJ *</label>
                    <input type="date" name="Tamat Pakej" required class="w-full p-3 font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-maroon focus:outline-none bg-slate-50">
                </div>
            </div>
            <p class="text-[11px] text-slate-400 italic mt-1">* Nota: Nama trip akan dijana secara automatik oleh Airtable berdasarkan tarikh di atas.</p>
        </form>
    `;

    if (modal) modal.classList.remove('hidden');
}

async function createNewTripFromModal() {
    const form = document.getElementById('addTripModalForm');
    if (!form) return;

    const formData = new FormData(form);
    const mulaPakej = formData.get('Mula Pakej');
    const tamatPakej = formData.get('Tamat Pakej');

    if (!mulaPakej || !tamatPakej) {
        alert("Sila masukkan Tarikh Mula dan Tarikh Tamat Pakej!");
        return;
    }

    let payloadFields = {
        "Mula Pakej": mulaPakej,
        "Tamat Pakej": tamatPakej
    };

    const saveBtn = document.getElementById('modalSaveBtn');
    if (saveBtn) saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Menyimpan...';

    try {
        const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/PAKEJ%20UMRAH`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${AIRTABLE_PAT}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fields: payloadFields })
        });

        if (response.ok) {
            await fetchTripMapping();
            renderViewsSidebar();
            closeExpandModal();
        } else {
            alert("Gagal menambah trip baharu.");
        }
    } catch (e) {
        console.error("Error creating trip:", e);
    } finally {
        if (saveBtn) saveBtn.innerHTML = 'Simpan Perubahan';
    }
}

function openExpandModal(recId) {
    const rec = allJemaahUmrahRecords.find(r => r.id === recId);
    if (!rec) return;

    const f = rec.fields;
    const modal = document.getElementById('expandRecordModal');
    const container = document.getElementById('expandModalFormContainer');
    const titleEl = document.getElementById('expandModalTitle');
    const delBtn = document.getElementById('modalDeleteBtn');
    const saveBtn = document.getElementById('modalSaveBtn');

    if (titleEl) titleEl.textContent = f['NAME'] || 'EXPAND RECORD';
    if (delBtn) {
        delBtn.classList.remove('hidden');
        delBtn.onclick = () => deleteJemaahFromModal(recId);
    }
    if (saveBtn) {
        saveBtn.innerHTML = 'Simpan Perubahan';
        saveBtn.onclick = () => saveJemaahFromModal(recId);
    }

    const tripOptionsHtml = rawTripRecordsList.map(t => {
        const title = tripMap[t.id] ? tripMap[t.id].title : cleanTripName(t.fields['Trip']);
        const currentTripId = Array.isArray(f['TRIP']) ? f['TRIP'][0] : f['TRIP'];
        const selected = (currentTripId === t.id || currentTripId === title) ? 'selected' : '';
        return `<option value="${t.id}" ${selected}>${title}</option>`;
    }).join('');

    container.innerHTML = `
        <form id="expandModalForm" class="space-y-4">
            
            <div class="grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
                <label class="font-bold text-slate-500 uppercase">NAME</label>
                <div class="sm:col-span-2">
                    <input type="text" name="NAME" value="${f['NAME'] || ''}" class="w-full p-2.5 font-bold text-sm text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-maroon focus:outline-none uppercase">
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 items-start gap-2 border-t border-slate-100 pt-3">
                <label class="font-bold text-slate-500 uppercase mt-2"><i class="fa-solid fa-image mr-1"></i> PICTURE</label>
                <div class="sm:col-span-2">
                    ${renderDropZoneHtml(recId, 'PICTURE', getAttachmentArray(f['PICTURE']))}
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 items-center gap-2 border-t border-slate-100 pt-3">
                <label class="font-bold text-slate-500 uppercase">IC NO.</label>
                <div class="sm:col-span-2">
                    <input type="text" name="IC NO." value="${f['IC NO.'] || ''}" class="w-full p-2.5 font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-maroon focus:outline-none">
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 items-center gap-2 border-t border-slate-100 pt-3">
                <label class="font-bold text-slate-500 uppercase">PASSPORT NO.</label>
                <div class="sm:col-span-2">
                    <input type="text" name="PASSPORT NO." value="${f['PASSPORT NO.'] || ''}" class="w-full p-2.5 font-mono font-bold uppercase border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-maroon focus:outline-none">
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 items-center gap-2 border-t border-slate-100 pt-3">
                <label class="font-bold text-slate-500 uppercase">GENDER</label>
                <div class="sm:col-span-2">
                    <select name="GENDER" class="w-full p-2.5 font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-maroon focus:outline-none">
                        <option value="">-- Pilih --</option>
                        <option value="MALE" ${f['GENDER'] === 'MALE' ? 'selected' : ''}>MALE</option>
                        <option value="FEMALE" ${f['GENDER'] === 'FEMALE' ? 'selected' : ''}>FEMALE</option>
                    </select>
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 items-center gap-2 border-t border-slate-100 pt-3">
                <label class="font-bold text-slate-400 uppercase">🔒 AGE (Formula)</label>
                <div class="sm:col-span-2">
                    <input type="text" disabled value="${f['AGE'] || '-'}" class="w-full p-2.5 font-semibold bg-slate-100 border border-slate-200 text-slate-500 rounded-xl">
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 items-center gap-2 border-t border-slate-100 pt-3">
                <label class="font-bold text-slate-400 uppercase">🔒 DOB (Formula)</label>
                <div class="sm:col-span-2">
                    <input type="text" disabled value="${f['DOB'] || '-'}" class="w-full p-2.5 font-semibold bg-slate-100 border border-slate-200 text-slate-500 rounded-xl">
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 items-center gap-2 border-t border-slate-100 pt-3">
                <label class="font-bold text-slate-500 uppercase">DOB (FOREIGNER)</label>
                <div class="sm:col-span-2">
                    <input type="date" name="DOB (FOREIGNER)" value="${f['DOB (FOREIGNER)'] || ''}" class="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-maroon focus:outline-none">
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 items-center gap-2 border-t border-slate-100 pt-3">
                <label class="font-bold text-slate-500 uppercase">NATIONALITY</label>
                <div class="sm:col-span-2">
                    <select name="NATIONALITY" class="w-full p-2.5 font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-maroon focus:outline-none">
                        <option value="MALAYSIA" ${(!f['NATIONALITY'] || f['NATIONALITY'] === 'MALAYSIA') ? 'selected' : ''}>MALAYSIA</option>
                        <option value="INDONESIA" ${f['NATIONALITY'] === 'INDONESIA' ? 'selected' : ''}>INDONESIA</option>
                        <option value="THAILAND" ${f['NATIONALITY'] === 'THAILAND' ? 'selected' : ''}>THAILAND</option>
                        <option value="INDIA" ${f['NATIONALITY'] === 'INDIA' ? 'selected' : ''}>INDIA</option>
                        <option value="BANGLADESH" ${f['NATIONALITY'] === 'BANGLADESH' ? 'selected' : ''}>BANGLADESH</option>
                    </select>
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 items-center gap-2 border-t border-slate-100 pt-3">
                <label class="font-bold text-slate-500 uppercase">STATUS VISA</label>
                <div class="sm:col-span-2">
                    <select name="STATUS VISA" class="w-full p-2.5 font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-maroon focus:outline-none">
                        <option value="">-- Pilih Status --</option>
                        <option value="TOURIST" ${f['STATUS VISA'] === 'TOURIST' ? 'selected' : ''}>TOURIST</option>
                        <option value="TOURIST (VALID)" ${f['STATUS VISA'] === 'TOURIST (VALID)' ? 'selected' : ''}>TOURIST (VALID)</option>
                        <option value="UMRAH" ${f['STATUS VISA'] === 'UMRAH' ? 'selected' : ''}>UMRAH</option>
                        <option value="UMRAH (VALID)" ${f['STATUS VISA'] === 'UMRAH (VALID)' ? 'selected' : ''}>UMRAH (VALID)</option>
                        <option value="IQAMA (VALID)" ${f['STATUS VISA'] === 'IQAMA (VALID)' ? 'selected' : ''}>IQAMA (VALID)</option>
                    </select>
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 items-start gap-2 border-t border-slate-100 pt-3">
                <label class="font-bold text-slate-500 uppercase mt-2"><i class="fa-solid fa-file-pdf mr-1"></i> PASSPORT COPY</label>
                <div class="sm:col-span-2">
                    ${renderDropZoneHtml(recId, 'PASSPORT COPY', getAttachmentArray(f['PASSPORT COPY']))}
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 items-start gap-2 border-t border-slate-100 pt-3">
                <label class="font-bold text-slate-500 uppercase mt-2"><i class="fa-solid fa-file-pdf mr-1"></i> VISA COPY</label>
                <div class="sm:col-span-2">
                    ${renderDropZoneHtml(recId, 'VISA COPY', getAttachmentArray(f['VISA COPY']))}
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 items-start gap-2 border-t border-slate-100 pt-3">
                <label class="font-bold text-slate-500 uppercase mt-2"><i class="fa-solid fa-file-pdf mr-1"></i> MOFABIO</label>
                <div class="sm:col-span-2">
                    ${renderDropZoneHtml(recId, 'MOFABIO', getAttachmentArray(f['MOFABIO']))}
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 items-center gap-2 border-t border-slate-100 pt-3">
                <label class="font-bold text-slate-500 uppercase">FIT TICKET</label>
                <div class="sm:col-span-2">
                    <label class="inline-flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" name="FIT TICKET" ${f['FIT TICKET'] ? 'checked' : ''} class="w-4 h-4 rounded text-brand-maroon focus:ring-brand-maroon">
                        <span class="font-semibold text-slate-700">Ya, Sah</span>
                    </label>
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 items-center gap-2 border-t border-slate-100 pt-3">
                <label class="font-bold text-slate-500 uppercase">TRIP</label>
                <div class="sm:col-span-2">
                    <select name="TRIP" class="w-full p-2.5 font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-maroon focus:outline-none">
                        <option value="">-- TBC / Tanpa Trip --</option>
                        ${tripOptionsHtml}
                    </select>
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 items-center gap-2 border-t border-slate-100 pt-3">
                <label class="font-bold text-slate-500 uppercase">DATE OF ISSUE</label>
                <div class="sm:col-span-2">
                    <input type="date" name="DATE OF ISSUE" value="${f['DATE OF ISSUE'] || ''}" class="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-maroon focus:outline-none">
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 items-center gap-2 border-t border-slate-100 pt-3">
                <label class="font-bold text-slate-500 uppercase">DATE OF EXPIRE</label>
                <div class="sm:col-span-2">
                    <input type="date" name="DATE OF EXPIRE" value="${f['DATE OF EXPIRE'] || ''}" class="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-maroon focus:outline-none">
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 items-center gap-2 border-t border-slate-100 pt-3">
                <label class="font-bold text-slate-500 uppercase">NOTES</label>
                <div class="sm:col-span-2">
                    <textarea name="Notes" rows="2" class="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-maroon focus:outline-none">${f['Notes'] || ''}</textarea>
                </div>
            </div>

        </form>
    `;

    setupDropZones(recId);
    if (modal) modal.classList.remove('hidden');
}

function closeExpandModal() {
    const modal = document.getElementById('expandRecordModal');
    if (modal) modal.classList.add('hidden');
}

function renderDropZoneHtml(recId, fieldName, currentFiles) {
    const files = Array.isArray(currentFiles) ? currentFiles : [];

    let listHtml = '';
    if (files.length > 0) {
        listHtml = files.map((fileObj, idx) => {
            const fileUrl = fileObj.url;
            const fileName = fileObj.filename || `${fieldName} ${idx + 1}`;
            return `
                <div class="flex items-center justify-between bg-slate-50 p-2 px-3 rounded-xl border border-slate-200 mb-1">
                    <span class="font-semibold text-slate-600 text-[11px] truncate max-w-xs" title="${fileName}">${fileName}</span>
                    <div class="flex items-center space-x-2">
                        <button type="button" onclick="openPreviewModal('${fileUrl}', '${fileName}')" class="text-brand-maroon hover:underline font-bold text-[11px]">
                            Preview / Download
                        </button>
                        <button type="button" onclick="confirmDeleteAttachment('${recId}', '${fieldName}', ${idx})" class="text-rose-600 hover:text-rose-800 p-1 rounded-lg hover:bg-rose-50 transition" title="Padam Fail Ini">
                            <i class="fa-solid fa-trash-can text-xs"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    return `
        <div class="space-y-2">
            ${listHtml}
            <div id="dropzone-${fieldName}" class="border-2 border-dashed border-slate-300 hover:border-brand-maroon rounded-2xl p-4 text-center cursor-pointer bg-slate-50 hover:bg-rose-50/30 transition group">
                <i class="fa-solid fa-cloud-arrow-up text-xl text-slate-400 group-hover:text-brand-maroon mb-1"></i>
                <p class="font-semibold text-slate-600 text-xs">Drop files here or click to browse (Multiple supported)</p>
                <p class="text-[10px] text-slate-400">PDF, JPG, PNG (Max 10MB per file)</p>
                <input type="file" id="fileinput-${fieldName}" multiple class="hidden" accept="image/*,application/pdf">
            </div>
        </div>
    `;
}

async function confirmDeleteAttachment(recId, fieldName, indexToDelete = null) {
    if (!confirm(`Adakah anda pasti mahu memadam fail ${fieldName} ini?`)) {
        return;
    }

    const targetRec = allJemaahUmrahRecords.find(r => r.id === recId);
    let updatedList = [];

    if (targetRec && targetRec.fields[fieldName] && Array.isArray(targetRec.fields[fieldName])) {
        if (indexToDelete !== null) {
            updatedList = targetRec.fields[fieldName].filter((_, idx) => idx !== indexToDelete);
        }
    }

    try {
        const airtableUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/DATA%20JEMAAH%20UMRAH/${recId}`;
        const res = await fetch(airtableUrl, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_PAT}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fields: {
                    [fieldName]: updatedList
                }
            })
        });

        if (res.ok) {
            if (targetRec) targetRec.fields[fieldName] = updatedList;
            filterAndRenderJemaahGrid();
            const modal = document.getElementById('expandRecordModal');
            if (modal && !modal.classList.contains('hidden')) {
                openExpandModal(recId);
            }
        } else {
            alert("Gagal memadam fail.");
        }
    } catch (e) {
        console.error("Error deleting attachment:", e);
        alert("Ralat sambungan rangkaian.");
    }
}

function setupDropZones(recId) {
    const fields = ['PICTURE', 'PASSPORT COPY', 'VISA COPY', 'MOFABIO'];

    fields.forEach(fName => {
        const zone = document.getElementById(`dropzone-${fName}`);
        const input = document.getElementById(`fileinput-${fName}`);

        if (!zone || !input) return;

        zone.onclick = () => input.click();

        zone.ondragover = (e) => {
            e.preventDefault();
            zone.classList.add('border-brand-maroon', 'bg-rose-50/50');
        };

        zone.ondragleave = () => {
            zone.classList.remove('border-brand-maroon', 'bg-rose-50/50');
        };

        zone.ondrop = (e) => {
            e.preventDefault();
            zone.classList.remove('border-brand-maroon', 'bg-rose-50/50');
            if (e.dataTransfer.files && e.dataTransfer.files.length) {
                handleFileUpload(recId, fName, e.dataTransfer.files, zone);
            }
        };

        input.onchange = (e) => {
            if (e.target.files && e.target.files.length) {
                handleFileUpload(recId, fName, e.target.files, zone);
            }
        };
    });
}

async function handleFileUpload(recId, fieldName, fileList, zoneEl) {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    zoneEl.innerHTML = `<i class="fa-solid fa-spinner fa-spin text-brand-maroon text-lg mb-1"></i><p class="font-bold text-xs text-slate-700">Uploading ${files.length} fail... [1/2]</p>`;

    try {
        const cloudName = "dfb839ep"; 
        const uploadPreset = "Effah Travel";  

        const uploadPromises = files.map(async (file) => {
            const uploadFormData = new FormData();
            uploadFormData.append("file", file);
            uploadFormData.append("upload_preset", uploadPreset);

            const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
                method: "POST",
                body: uploadFormData
            });

            const cloudData = await cloudRes.json();
            if (!cloudRes.ok || !cloudData || !cloudData.secure_url) {
                throw new Error("Gagal upload Cloudinary");
            }

            return {
                url: cloudData.secure_url,
                filename: file.name
            };
        });

        const newUploadedFiles = await Promise.all(uploadPromises);

        zoneEl.innerHTML = `<i class="fa-solid fa-spinner fa-spin text-brand-maroon text-lg mb-1"></i><p class="font-bold text-xs text-slate-700">Menyimpan ke Airtable... [2/2]</p>`;

        const targetRec = allJemaahUmrahRecords.find(r => r.id === recId);
        let currentAttachments = [];
        if (targetRec && targetRec.fields[fieldName] && Array.isArray(targetRec.fields[fieldName])) {
            currentAttachments = targetRec.fields[fieldName].map(att => ({ id: att.id, url: att.url, filename: att.filename }));
        }

        const updatedAttachments = [...currentAttachments, ...newUploadedFiles];

        const airtableUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/DATA%20JEMAAH%20UMRAH/${recId}`;
        const airtableRes = await fetch(airtableUrl, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_PAT}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fields: {
                    [fieldName]: updatedAttachments
                }
            })
        });

        const resultJson = await airtableRes.json();

        if (airtableRes.ok) {
            if (targetRec) {
                targetRec.fields[fieldName] = resultJson.fields[fieldName];
            }

            zoneEl.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-600 text-lg mb-1"></i><p class="font-bold text-xs text-emerald-700">Berjaya Disimpan!</p>`;
            
            setTimeout(() => {
                filterAndRenderJemaahGrid();
                openExpandModal(recId);
            }, 1000);
        } else {
            console.error("Airtable Error Detail:", resultJson);
            zoneEl.innerHTML = `<p class="text-rose-600 font-bold">Airtable Error: ${resultJson.error?.message || 'Gagal dikemaskini'}</p>`;
        }

    } catch (err) {
        console.error("Upload process exception:", err);
        zoneEl.innerHTML = `<p class="text-rose-600 font-bold">Ralat muat naik fail.</p>`;
    }
}

async function saveJemaahFromModal(recId) {
    const form = document.getElementById('expandModalForm');
    if (!form) return;

    const formData = new FormData(form);
    let updatedFields = {};

    formData.forEach((val, key) => {
        if (key === 'NAME' || key === 'PASSPORT NO.') {
            updatedFields[key] = val ? val.toUpperCase().trim() : null;
        } else if (key === 'FIT TICKET') {
            updatedFields[key] = true;
        } else if (key === 'TRIP') {
            updatedFields[key] = val ? [val] : null;
        } else {
            updatedFields[key] = val === '' ? null : val;
        }
    });

    if (!formData.has('FIT TICKET')) {
        updatedFields['FIT TICKET'] = false;
    }

    const saveBtn = document.getElementById('modalSaveBtn');
    if (saveBtn) saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Menyimpan...';

    const targetRec = allJemaahUmrahRecords.find(r => r.id === recId);
    if (targetRec) {
        Object.assign(targetRec.fields, updatedFields);
    }

    filterAndRenderJemaahGrid();

    try {
        const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/DATA%20JEMAAH%20UMRAH/${recId}`;
        const res = await fetch(url, {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${AIRTABLE_PAT}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fields: updatedFields })
        });

        if (res.ok) {
            const data = await res.json();
            if (targetRec && data.fields) {
                targetRec.fields['AGE'] = data.fields['AGE'];
                targetRec.fields['DOB'] = data.fields['DOB'];
            }
            filterAndRenderJemaahGrid();
            closeExpandModal();
        }
    } catch (e) {
        console.error("Error saving modal:", e);
    } finally {
        if (saveBtn) saveBtn.innerHTML = 'Simpan Perubahan';
    }
}

async function deleteJemaahFromModal(recId) {
    if (!confirm("Adakah anda pasti nak padam rekod jemaah ini?")) return;

    allJemaahUmrahRecords = allJemaahUmrahRecords.filter(r => r.id !== recId);
    filterAndRenderJemaahGrid();
    closeExpandModal();

    try {
        const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/DATA%20JEMAAH%20UMRAH/${recId}`;
        await fetch(url, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${AIRTABLE_PAT}` }
        });
    } catch (e) {
        console.error("Error deleting record:", e);
    }
}

function openAddJemaahModal() {
    const modal = document.getElementById('expandRecordModal');
    const container = document.getElementById('expandModalFormContainer');
    const titleEl = document.getElementById('expandModalTitle');
    const delBtn = document.getElementById('modalDeleteBtn');
    const saveBtn = document.getElementById('modalSaveBtn');

    if (titleEl) titleEl.textContent = 'TAMBAH JEMAAH BAHARU';
    if (delBtn) delBtn.classList.add('hidden');
    if (saveBtn) {
        saveBtn.innerHTML = '<i class="fa-solid fa-plus mr-1"></i> Tambah Jemaah';
        saveBtn.onclick = createNewJemaahFromModal;
    }

    const tripOptionsHtml = rawTripRecordsList.map(t => {
        const title = tripMap[t.id] ? tripMap[t.id].title : cleanTripName(t.fields['Trip']);
        const isCurrentActiveTrip = (selectedTripFilter !== 'ALL' && selectedTripFilter !== 'TBC' && selectedTripFilter === title);
        const selected = isCurrentActiveTrip ? 'selected' : '';
        return `<option value="${t.id}" ${selected}>${title}</option>`;
    }).join('');

    container.innerHTML = `
        <form id="addModalForm" class="space-y-4">
            
            <div class="grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
                <label class="font-bold text-slate-500 uppercase">NAME *</label>
                <div class="sm:col-span-2">
                    <input type="text" name="NAME" required placeholder="Contoh: AHMAD BIN ABDULLAH" class="w-full p-2.5 font-bold text-sm text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-maroon focus:outline-none uppercase">
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 items-center gap-2 border-t border-slate-100 pt-3">
                <label class="font-bold text-slate-500 uppercase">IC NO.</label>
                <div class="sm:col-span-2">
                    <input type="text" name="IC NO." placeholder="900101015555" class="w-full p-2.5 font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-maroon focus:outline-none">
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 items-center gap-2 border-t border-slate-100 pt-3">
                <label class="font-bold text-slate-500 uppercase">PASSPORT NO.</label>
                <div class="sm:col-span-2">
                    <input type="text" name="PASSPORT NO." placeholder="A12345678" class="w-full p-2.5 font-mono font-bold uppercase border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-maroon focus:outline-none">
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 items-center gap-2 border-t border-slate-100 pt-3">
                <label class="font-bold text-slate-500 uppercase">GENDER</label>
                <div class="sm:col-span-2">
                    <select name="GENDER" class="w-full p-2.5 font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-maroon focus:outline-none">
                        <option value="">-- Pilih --</option>
                        <option value="MALE">MALE</option>
                        <option value="FEMALE">FEMALE</option>
                    </select>
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 items-center gap-2 border-t border-slate-100 pt-3">
                <label class="font-bold text-slate-500 uppercase">STATUS VISA</label>
                <div class="sm:col-span-2">
                    <select name="STATUS VISA" class="w-full p-2.5 font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-maroon focus:outline-none">
                        <option value="">-- Pilih --</option>
                        <option value="TOURIST">TOURIST</option>
                        <option value="TOURIST (VALID)">TOURIST (VALID)</option>
                        <option value="UMRAH">UMRAH</option>
                        <option value="UMRAH (VALID)">UMRAH (VALID)</option>
                    </select>
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 items-center gap-2 border-t border-slate-100 pt-3">
                <label class="font-bold text-slate-500 uppercase">TRIP</label>
                <div class="sm:col-span-2">
                    <select name="TRIP" class="w-full p-2.5 font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-maroon focus:outline-none">
                        <option value="">-- TBC / Tanpa Trip --</option>
                        ${tripOptionsHtml}
                    </select>
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 items-center gap-2 border-t border-slate-100 pt-3">
                <label class="font-bold text-slate-500 uppercase">NOTES</label>
                <div class="sm:col-span-2">
                    <textarea name="Notes" rows="2" class="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-maroon focus:outline-none"></textarea>
                </div>
            </div>

        </form>
    `;

    if (modal) modal.classList.remove('hidden');
}

async function createNewJemaahFromModal() {
    const form = document.getElementById('addModalForm');
    if (!form) return;

    const formData = new FormData(form);
    const nameVal = formData.get('NAME');

    if (!nameVal) {
        alert("Sila masukkan NAMA Jemaah!");
        return;
    }

    let payloadFields = {};
    formData.forEach((val, key) => {
        if (key === 'NAME' || key === 'PASSPORT NO.') {
            payloadFields[key] = val ? val.toUpperCase().trim() : null;
        } else if (key === 'TRIP') {
            payloadFields[key] = val ? [val] : null;
        } else {
            payloadFields[key] = val === '' ? null : val;
        }
    });

    const saveBtn = document.getElementById('modalSaveBtn');
    if (saveBtn) saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Menambah...';

    try {
        const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/DATA%20JEMAAH%20UMRAH`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${AIRTABLE_PAT}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fields: payloadFields })
        });

        if (response.ok) {
            const newRecord = await response.json();
            allJemaahUmrahRecords.unshift(newRecord);
            filterAndRenderJemaahGrid();
            closeExpandModal();
        } else {
            alert("Gagal menambah jemaah baharu.");
        }
    } catch (e) {
        console.error("Error creating jemaah:", e);
    } finally {
        if (saveBtn) saveBtn.innerHTML = '<i class="fa-solid fa-plus mr-1"></i> Tambah Jemaah';
    }
}

function initHeaderDragAndDrop() {
    let draggedCol = null;
    const headers = document.querySelectorAll('#jemaahTableHeaderRow th.draggable-header');

    headers.forEach(th => {
        th.addEventListener('dragstart', (e) => {
            draggedCol = th.getAttribute('data-col');
            e.dataTransfer.effectAllowed = 'move';
            th.classList.add('opacity-50');
        });

        th.addEventListener('dragend', () => {
            th.classList.remove('opacity-50');
            headers.forEach(h => h.classList.remove('drag-over'));
        });

        th.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            th.classList.add('drag-over');
        });

        th.addEventListener('dragleave', () => {
            th.classList.remove('drag-over');
        });

        th.addEventListener('drop', (e) => {
            e.preventDefault();
            th.classList.remove('drag-over');

            const targetCol = th.getAttribute('data-col');
            if (draggedCol && targetCol && draggedCol !== targetCol) {
                const fromIndex = columnOrder.indexOf(draggedCol);
                const toIndex = columnOrder.indexOf(targetCol);

                if (fromIndex !== -1 && toIndex !== -1) {
                    columnOrder.splice(fromIndex, 1);
                    columnOrder.splice(toIndex, 0, draggedCol);

                    localStorage.setItem('jemaahColOrder', JSON.stringify(columnOrder));

                    renderTableHeader();
                    filterAndRenderJemaahGrid();
                    initColumnResizers();
                    initHeaderDragAndDrop();
                }
            }
        });
    });
}

function toggleSortDropdown() {
    const drop = document.getElementById('sortDropdownMenu');
    if (drop) drop.classList.toggle('hidden');
}

function applySortSettings() {
    const fieldSel = document.getElementById('sortFieldSelect');
    const dirSel = document.getElementById('sortDirSelect');

    if (fieldSel && dirSel) {
        currentSortField = fieldSel.value;
        currentSortDir = dirSel.value;

        localStorage.setItem('jemaahSortSettings', JSON.stringify({
            field: currentSortField,
            dir: currentSortDir
        }));

        updateSortBtnLabel();
        toggleSortDropdown();
        filterAndRenderJemaahGrid();
    }
}

function updateSortBtnLabel() {
    const label = document.getElementById('sortBtnLabel');
    if (label) {
        label.textContent = `Sort: ${currentSortField} (${currentSortDir.toUpperCase()})`;
    }
}

function initColumnResizers() {
    injectResizerStyles();
    const headers = document.querySelectorAll('#jemaahTableHeaderRow th');

    headers.forEach(th => {
        const resizer = th.querySelector('.col-resizer');
        if (!resizer) return;

        let startX, startWidth, colClass;

        const classList = Array.from(th.classList);
        colClass = classList.find(c => c.startsWith('col-'));

        resizer.addEventListener('mousedown', (e) => {
            e.preventDefault();
            startX = e.pageX;
            startWidth = th.offsetWidth;
            resizer.classList.add('resizing');

            const onMouseMove = (e) => {
                const newWidth = Math.max(40, startWidth + (e.pageX - startX));
                if (colClass) {
                    columnWidths[colClass] = newWidth;
                    applySingleColumnWidth(colClass, newWidth);
                }
            };

            const onMouseUp = () => {
                resizer.classList.remove('resizing');
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);

                if (colClass === 'col-idx') {
                    const idxWidth = columnWidths['col-idx'] || 55;
                    updateStickyNameLeftOffset(idxWidth);
                }

                localStorage.setItem('jemaahColWidths', JSON.stringify(columnWidths));
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    });
}

function applySingleColumnWidth(colClass, width) {
    const elements = document.querySelectorAll(`.${colClass}`);
    elements.forEach(el => {
        el.style.width = `${width}px`;
        el.style.minWidth = `${width}px`;
        el.style.maxWidth = `${width}px`;
    });
}

function applySavedColumnWidths() {
    Object.keys(columnWidths).forEach(colClass => {
        applySingleColumnWidth(colClass, columnWidths[colClass]);
    });
    const idxWidth = columnWidths['col-idx'] || 55;
    updateStickyNameLeftOffset(idxWidth);
}

function updateStickyNameLeftOffset(idxWidth) {
    const nameCols = document.querySelectorAll('.col-name');
    nameCols.forEach(el => {
        el.style.left = `${idxWidth}px`;
    });
}

const columnDefinitions = [
    { key: 'col-name', label: 'NAME' },
    { key: 'col-picture', label: 'PICTURE' },
    { key: 'col-ic', label: 'IC NO.' },
    { key: 'col-passport', label: 'PASSPORT NO.' },
    { key: 'col-gender', label: 'GENDER' },
    { key: 'col-age', label: 'AGE' },
    { key: 'col-dob', label: 'DOB' },
    { key: 'col-dobf', label: 'DOB (FOREIGNER)' },
    { key: 'col-nat', label: 'NATIONALITY' },
    { key: 'col-visa', label: 'STATUS VISA' },
    { key: 'col-passcopy', label: 'PASSPORT COPY' },
    { key: 'col-visacopy', label: 'VISA COPY' },
    { key: 'col-mofabio', label: 'MOFABIO' },
    { key: 'col-fit', label: 'FIT TICKET' },
    { key: 'col-trip', label: 'TRIP' },
    { key: 'col-issue', label: 'DATE OF ISSUE' },
    { key: 'col-expire', label: 'DATE OF EXPIRE' },
    { key: 'col-notes', label: 'NOTES' }
];

function buildHideFieldsList() {
    const listContainer = document.getElementById('fieldsToggleList');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    columnDefinitions.forEach(col => {
        const isHidden = hiddenColumns[col.key] || false;
        const item = document.createElement('label');
        item.className = "flex items-center space-x-2 p-1 hover:bg-slate-50 rounded cursor-pointer select-none";
        item.innerHTML = `
            <input type="checkbox" ${!isHidden ? 'checked' : ''} onchange="toggleColumnVisibility('${col.key}', this.checked)" class="rounded text-brand-maroon focus:ring-brand-maroon w-3.5 h-3.5">
            <span class="text-slate-700 font-medium">${col.label}</span>
        `;
        listContainer.appendChild(item);
    });
}

function toggleHideFieldsDropdown() {
    const drop = document.getElementById('hideFieldsDropdown');
    if (drop) drop.classList.toggle('hidden');
}

function toggleColumnVisibility(colClass, isVisible) {
    hiddenColumns[colClass] = !isVisible;
    applyHiddenColumns();
}

function applyHiddenColumns() {
    columnDefinitions.forEach(col => {
        const elements = document.querySelectorAll(`.${col.key}`);
        const isHidden = hiddenColumns[col.key] || false;
        elements.forEach(el => {
            if (isHidden) {
                el.classList.add('hidden');
            } else {
                el.classList.remove('hidden');
            }
        });
    });
}

// 📦 Dapatkan Array Fail Attachment dari Airtable
function getAttachmentArray(attachmentField) {
    if (attachmentField && Array.isArray(attachmentField)) {
        return attachmentField;
    }
    return [];
}

// ==========================================
// 👁️ MODAL PREVIEW PDF & IMAGE (FIXED CLOSE & OUTSIDE CLICK)
// ==========================================

function openPreviewModal(fileUrl, title) {
    const modal = document.getElementById('attachmentPreviewModal');
    const imgEl = document.getElementById('previewImage');
    const pdfEl = document.getElementById('previewPdf');
    const titleEl = document.getElementById('previewTitle');
    const downloadBtn = document.getElementById('downloadAttachmentBtn');

    if (!modal || !fileUrl) {
        console.error("Modal atau URL fail tidak dijumpai!");
        return;
    }

    // Setkan Tajuk dan Pautan Muat Turun
    if (titleEl) titleEl.textContent = title || 'Pratonton Lampiran';
    if (downloadBtn) {
        downloadBtn.href = fileUrl;
        downloadBtn.setAttribute('download', title || 'fail_lampiran');
        downloadBtn.setAttribute('target', '_blank');
    }

    // Semak sama ada fail ini PDF atau Gambar
    const lowerUrl = fileUrl.toLowerCase();
    const lowerTitle = (title || '').toLowerCase();
    
    const isPdf = lowerUrl.endsWith('.pdf') || 
                  lowerTitle.endsWith('.pdf') || 
                  lowerUrl.includes('/pdf/') || 
                  lowerUrl.includes('application/pdf') ||
                  lowerUrl.includes('pdf');

    if (isPdf) {
        if (imgEl) {
            imgEl.src = '';
            imgEl.classList.add('hidden');
        }
        if (pdfEl) {
            pdfEl.src = fileUrl;
            pdfEl.classList.remove('hidden');
        }
    } else {
        if (pdfEl) {
            pdfEl.src = '';
            pdfEl.classList.add('hidden');
        }
        if (imgEl) {
            imgEl.src = fileUrl;
            imgEl.classList.remove('hidden');
        }
    }

    // Paparkan Modal
    modal.classList.remove('hidden');
}

/**
 * Menutup Modal Preview dan mengosongkan sumber fail
 */
function closePreviewModal() {
    const modal = document.getElementById('attachmentPreviewModal');
    const imgEl = document.getElementById('previewImage');
    const pdfEl = document.getElementById('previewPdf');

    // Resetkan src supaya fail/PDF berhenti dimuatkan
    if (pdfEl) pdfEl.src = '';
    if (imgEl) imgEl.src = '';

    if (modal) {
        modal.classList.add('hidden');
    }
}

// 🎯 TUTUP MODAL BILA KLIK LUAR KOTAK (CLICK OUTSIDE BACKDROP)
document.addEventListener('click', function (event) {
    const modal = document.getElementById('attachmentPreviewModal');
    const modalContainer = document.getElementById('previewModalContainer');

    // Jika modal sedang terbuka (tiada class hidden)
    if (modal && !modal.classList.contains('hidden')) {
        // Jika tempat yang diklik ialah background modal (di luar modalContainer)
        if (event.target === modal) {
            closePreviewModal();
        }
    }
});

// ⌨️ TUTUP MODAL BILA TEKAN KEKUNCI 'ESC'
document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
        closePreviewModal();
    }
});

async function updateJemaahField(recId, fieldName, value) {
    try{
      if (typeof AIRTABLE_PAT === 'undefined' || !AIRTABLE_PAT) {
        AIRTABLE_PAT = window.AIRTABLE_PAT || localStorage.getItem('effah_api_pat') || window.DEFAULT_PAT || 'patjxZg6G22e9OBuS.2a96ced64af7e931ee4d83f65c491adf1241813547d5d8e3a317f5bc6d9a8de7';
        AIRTABLE_BASE_ID = window.AIRTABLE_BASE_ID || localStorage.getItem('effah_base_id') || window.DEFAULT_BASE_ID || 'appSsn4JyQD4DnYu0';
      }
    }catch(e){}

    let processedValue = value;
    if (typeof processedValue === 'string' && (fieldName === 'NAME' || fieldName === 'PASSPORT NO.')) {
        processedValue = processedValue.toUpperCase().trim();
    }

    const targetRec = allJemaahUmrahRecords.find(r => r.id === recId);
    if (targetRec) {
        targetRec.fields[fieldName] = (processedValue === '' || processedValue === undefined) ? null : processedValue;
    }

    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/DATA%20JEMAAH%20UMRAH/${recId}`;
    let fieldsData = {};
    fieldsData[fieldName] = (processedValue === '' || processedValue === undefined) ? null : processedValue;

    try {
        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_PAT}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fields: fieldsData })
        });

        if (response.ok) {
            const updatedRecord = await response.json();
            
            if (targetRec && updatedRecord.fields) {
                targetRec.fields['AGE'] = updatedRecord.fields['AGE'] || null;
                targetRec.fields['DOB'] = updatedRecord.fields['DOB'] || null;

                const ageCell = document.getElementById(`age-cell-${recId}`);
                const dobCell = document.getElementById(`dob-cell-${recId}`);

                if (ageCell) ageCell.textContent = updatedRecord.fields['AGE'] || '-';
                if (dobCell) dobCell.textContent = updatedRecord.fields['DOB'] || '-';
            }
        }
    } catch (err) {
        console.error("Error updating jemaah in Airtable:", err);
    }
}

function filterTripViewSidebar() {
    const query = document.getElementById('searchTripViewInput').value.toLowerCase();
    const buttons = document.querySelectorAll('#jemaahViewsSidebar button');
    
    buttons.forEach(btn => {
        const text = btn.textContent.toLowerCase();
        if (text.includes(query)) {
            btn.classList.remove('hidden');
        } else {
            btn.classList.add('hidden');
        }
    });
}

function filterJemaahTable() {
    filterAndRenderJemaahGrid();
}

// PATCH CSS FLOAT - ensure dropdowns float
(function(){
  const style=document.createElement('style');
  style.textContent=`
  #sortDropdownMenu, #hideFieldsPanel{position:absolute !important; right:0; top:42px; z-index:50;}
  #jemaahTripSidebar{max-height:calc(100vh - 100px);}
  #modul-maklumat-jemaah{overflow:auto;}
  `;
  document.head.appendChild(style);
})();


// ensure init called for new portal id
(function(){
  const origSwitch = window.Router && Router.switchTab ? Router.switchTab.bind(Router) : null;
  if(origSwitch){
    Router.switchTab = function(tabId,skip){
      origSwitch(tabId,skip);
      if(tabId==='maklumat-jemaah'){
        renderJemaahUmrahHTML();
        fetchJemaahUmrahData();
      }
    };
  }
  // auto render if already on that tab
  setTimeout(()=>{
    if(document.getElementById('modul-maklumat-jemaah') && !document.getElementById('modul-maklumat-jemaah').classList.contains('hidden')){
      renderJemaahUmrahHTML();
      fetchJemaahUmrahData();
    }
  },500);
})();
