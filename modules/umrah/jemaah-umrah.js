// Variable Global Simpan Data Jemaah & Trip Map
let allJemaahUmrahRecords = [];
let rawTripRecordsList = []; 
let tripMap = {}; 
let selectedTripFilter = null;
let selectedHijriFilter = null;
let isJemaahLoading = false;
let jemaahFieldOptions = {};
let ejenListCache = [];
let jemaahMetaTableId = null;
let jemaahMetaFieldsByName = {};

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
let hiddenColumns = JSON.parse(localStorage.getItem('jemaahHiddenColumns')) || {};

// Sort State Tracking
let currentSortField = 'NAME';
let currentSortDir = 'asc';

// Default Column Order - FIXED v2: susunan logik ikut screenshot + flow dokumen
const DEFAULT_COLUMN_ORDER = [
    'col-idx', 'col-name', 'col-picture', 'col-ic', 'col-passport', 
    'col-gender', 'col-age', 'col-dob', 'col-dobf', 'col-nat', 
    'col-visa', 'col-passcopy', 'col-visacopy', 'col-mofabio', 
    'col-fit', 'col-trip', 'col-issue', 'col-expire', 'col-notes',
    'col-board', 'col-train', 'col-insuran', 'col-pakej', 'col-ejen'
];
let columnOrder = [...DEFAULT_COLUMN_ORDER];

// Default Column Widths
const defaultColumnWidths = {
    'col-idx': 55,
    'col-name': 240,
    'col-picture': 90,
    'col-ic': 130,
    'col-passport': 120,
    'col-gender': 90,
    'col-age': 90,
    'col-dob': 130,
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
    'col-notes': 180,
    'col-board': 180,
    'col-train': 90,
    'col-insuran': 180,
    'col-pakej': 160,
    'col-ejen': 200
};

let columnWidths = JSON.parse(localStorage.getItem('jemaahColWidths')) || { ...defaultColumnWidths };

// === FIX V2: File Picker Binding untuk Add Jemaah Modal ===
let addModalFiles = { 'PICTURE': [], 'PASSPORT_COPY': [], 'VISA_COPY': [], 'MOFABIO': [], 'INSURAN_DOC': [] };

function setupAddModalFilePickers(){
    const fileFields = ['PICTURE','PASSPORT_COPY','VISA_COPY','MOFABIO'];
    // alias mapping untuk id yang pakai underscore
    const idMap = {
        'PICTURE': 'PICTURE',
        'PASSPORT_COPY': 'PASSPORT_COPY',
        'VISA_COPY': 'VISA_COPY',
        'MOFABIO': 'MOFABIO'
    };
    
    fileFields.forEach(field=>{
        const dropId = `addModalDropzone-${field}`;
        const inputId = `addModalFileInput-${field}`;
        const previewId = `addModalPreview-${field}`;
        const dropzone = document.getElementById(dropId);
        const fileInput = document.getElementById(inputId);
        if(!dropzone || !fileInput) return;
        
        // Reset
        addModalFiles[field] = addModalFiles[field] || [];
        
        const openPicker = (e)=>{
            if(e) e.stopPropagation();
            fileInput.click();
        };
        
        // Hapus listener lama dengan clone (simple)
        const newDrop = dropzone.cloneNode(true);
        dropzone.parentNode.replaceChild(newDrop, dropzone);
        const dz = document.getElementById(dropId);
        const fi = document.getElementById(inputId);
        const previewEl = document.getElementById(previewId);
        
        if(!dz || !fi) return;
        
        dz.addEventListener('click', (e)=>{
            // jangan trigger kalau klik pada preview delete button
            if(e.target.closest('button')) return;
            fi.click();
        });
        
        dz.addEventListener('dragover', (e)=>{
            e.preventDefault();
            dz.classList.add('border-brand-maroon','bg-rose-50','scale-[1.02]');
            dz.classList.remove('border-slate-300','bg-slate-50');
        });
        
        dz.addEventListener('dragleave', (e)=>{
            e.preventDefault();
            dz.classList.remove('border-brand-maroon','bg-rose-50','scale-[1.02]');
            dz.classList.add('border-slate-300','bg-slate-50');
        });
        
        dz.addEventListener('drop', (e)=>{
            e.preventDefault();
            dz.classList.remove('border-brand-maroon','bg-rose-50','scale-[1.02]');
            dz.classList.add('border-slate-300','bg-slate-50');
            if(e.dataTransfer.files && e.dataTransfer.files.length){
                handleAddModalFiles(field, e.dataTransfer.files);
            }
        });
        
        fi.addEventListener('change', (e)=>{
            if(e.target.files && e.target.files.length){
                handleAddModalFiles(field, e.target.files);
                // reset value supaya boleh pilih file sama lagi
                e.target.value = '';
            }
        });
    });
}

function handleAddModalFiles(field, fileList){
    const files = Array.from(fileList);
    if(!files.length) return;
    addModalFiles[field] = addModalFiles[field] || [];
    
    // Validate
    const validFiles = files.filter(f=>{
        const isValidType = f.type.startsWith('image/') || f.type==='application/pdf' || f.name.toLowerCase().endsWith('.pdf');
        const isValidSize = f.size <= 10*1024*1024;
        if(!isValidType) alert(`File ${f.name}: format tak disokong. Guna JPG/PNG/PDF`);
        if(!isValidSize) alert(`File ${f.name}: lebih 10MB`);
        return isValidType && isValidSize;
    });
    
    addModalFiles[field].push(...validFiles);
    
    // Update preview
    const previewId = `addModalPreview-${field}`;
    const previewEl = document.getElementById(previewId);
    if(previewEl){
        previewEl.innerHTML = addModalFiles[field].map((f,i)=>`
            <div class="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px]">
                <i class="fa-solid ${f.type.includes('pdf')?'fa-file-pdf text-red-500':'fa-file-image text-blue-500'}"></i>
                <span class="max-w-[120px] truncate font-bold">${f.name}</span>
                <span class="text-[10px] text-slate-400">${(f.size/1024).toFixed(0)}KB</span>
                <button type="button" onclick="removeAddModalFile('${field}',${i})" class="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200"><i class="fa-solid fa-xmark text-[10px]"></i></button>
            </div>
        `).join('');
    }
}

function removeAddModalFile(field, idx){
    if(addModalFiles[field]) {
        addModalFiles[field].splice(idx,1);
        const previewId = `addModalPreview-${field}`;
        const previewEl = document.getElementById(previewId);
        if(previewEl){
            if(addModalFiles[field].length===0){
                previewEl.innerHTML = '';
            } else {
                previewEl.innerHTML = addModalFiles[field].map((f,i)=>`
                    <div class="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px]">
                        <i class="fa-solid ${f.type.includes('pdf')?'fa-file-pdf text-red-500':'fa-file-image text-blue-500'}"></i>
                        <span class="max-w-[120px] truncate font-bold">${f.name}</span>
                        <span class="text-[10px] text-slate-400">${(f.size/1024).toFixed(0)}KB</span>
                        <button type="button" onclick="removeAddModalFile('${field}',${i})" class="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200"><i class="fa-solid fa-xmark text-[10px]"></i></button>
                    </div>
                `).join('');
            }
        }
    }
}

window.removeAddModalFile = removeAddModalFile;


// CLEANED: override removed - using global var from config.js

function cleanTripName(raw){
  if(!raw) return 'TBC';
  let s = String(raw).trim();
  // Kalau ada pipe, ambil part terakhir yang ada makna
  if(s.includes('|')){
    const parts = s.split('|').map(p=>p.trim()).filter(p=>p.length>0);
    // ambil part paling panjang / paling akhir yang mengandungi huruf
    if(parts.length>0){
      // prefer part yang ada huruf, bukan hanya tarikh 26/08
      const withAlpha = parts.filter(p=> /[A-Z]/i.test(p));
      s = (withAlpha.length>0 ? withAlpha[withAlpha.length-1] : parts[parts.length-1]);
    }
  }
  // buang prefix tarikh pendek macam "26/08" atau "07/25" di depan jika masih ada
  s = s.replace(/^\d{1,2}\/\d{1,2}\s*\|?\s*/,'').trim();
  // Normalisasi: kalau format "07 - 19 JULAI 2026" kekalkan
  // Kalau kosong lepas clean, fallback ke raw
  if(!s) return String(raw).trim() || 'TBC';
  return s.toUpperCase();
}
// CLEANED: override removed - using global var from config.js
// make brand-maroon class fallback
(function(){
  const style=document.createElement('style');
  style.textContent='.bg-brand-maroon{background:#800020}.text-brand-maroon{color:#800020}.hover\\:bg-rose-900:hover{background:#600018}';
  document.head.appendChild(style);

// Hook setup after openAddJemaahModal original
(function(){
    const _origOpenAdd = window.openAddJemaahModal;
    if(_origOpenAdd){
        const original = _origOpenAdd;
        window.openAddJemaahModal = function(){
            original.apply(this, arguments);
            setTimeout(()=>{
                const modal = document.getElementById('expandRecordModal');
                if(modal){
                    modal.classList.remove('hidden');
                    modal.style.display='flex';
                }
                setupAddModalFilePickers();
            }, 100);
        };
    } else {
        // if not yet defined, patch via event
        document.addEventListener('DOMContentLoaded', ()=>{
            const orig = window.openAddJemaahModal;
            if(orig){
                window.openAddJemaahModal = function(){
                    orig.apply(this, arguments);
                    setTimeout(()=>{
                        const modal = document.getElementById('expandRecordModal');
                        if(modal){
                            modal.classList.remove('hidden');
                            modal.style.display='flex';
                        }
                        setupAddModalFilePickers();
                    }, 100);
                };
            }
        });
    }
})();

})();


document.addEventListener('DOMContentLoaded', () => {
    const savedSort = JSON.parse(localStorage.getItem('jemaahSortSettings'));
    if (savedSort) {
        currentSortField = savedSort.field || 'NAME';
        currentSortDir = savedSort.dir || 'asc';
    }
    let savedOrder = JSON.parse(localStorage.getItem('jemaahColOrder'));
    // FIX v5: Force AGE & DOB sebelum DOBF (FOREIGNER) by default
    try{
        // kalau ada saved order lama tanpa age/dob, atau age/dob di hujung, kita migrasi
        if(savedOrder && Array.isArray(savedOrder)){
            const hasAge = savedOrder.includes('col-age');
            const hasDob = savedOrder.includes('col-dob');
            const ageIdx = savedOrder.indexOf('col-age');
            const dobIdx = savedOrder.indexOf('col-dob');
            const dobfIdx = savedOrder.indexOf('col-dobf');
            const isWrongPos = hasAge && hasDob && dobfIdx!==-1 && (ageIdx > dobfIdx || dobIdx > dobfIdx);
            if(!hasAge || !hasDob || isWrongPos){
                console.log('Migrating columnOrder to put AGE/DOB before DOBF');
                localStorage.removeItem('jemaahColOrder');
                savedOrder = null;
            }
        }
    }catch(e){}
    if (savedOrder && Array.isArray(savedOrder)) {
        // bersihkan duplicate & filter yang valid sahaja
        let base = [...new Set(savedOrder.filter(k=> DEFAULT_COLUMN_ORDER.includes(k)))];
        // buang age/dob dulu untuk insert semula di posisi betul
        base = base.filter(k=> k!=='col-age' && k!=='col-dob');
        // cari posisi DOBF
        let idxDobf = base.indexOf('col-dobf');
        if(idxDobf===-1){
            let idxGender = base.indexOf('col-gender');
            idxDobf = idxGender!==-1 ? idxGender+1 : 5;
        }
        // insert AGE, DOB sebelum DOBF
        base.splice(idxDobf, 0, 'col-age', 'col-dob');
        // tambah apa2 column missing dari default (ikut urutan default) kecuali age/dob dah handle
        DEFAULT_COLUMN_ORDER.forEach(k=>{
            if(!base.includes(k) && k!=='col-age' && k!=='col-dob'){
                base.push(k);
            }
        });
        columnOrder = base.length>0 ? base : [...DEFAULT_COLUMN_ORDER];
        if(columnOrder.length===0){
            columnOrder = [...DEFAULT_COLUMN_ORDER];
        }
        localStorage.setItem('jemaahColOrder', JSON.stringify(columnOrder));
    } else {
        columnOrder = [...DEFAULT_COLUMN_ORDER];
    }
    const savedHidden = JSON.parse(localStorage.getItem('jemaahHiddenColumns')) || {};
    // FIX v4: jangan hide AGE/DOB, paksa show sebelah GENDER
    if(savedHidden['col-age']) delete savedHidden['col-age'];
    if(savedHidden['col-dob']) delete savedHidden['col-dob'];
    localStorage.setItem('jemaahHiddenColumns', JSON.stringify(savedHidden));
    hiddenColumns = savedHidden;
    renderJemaahUmrahHTML();
});


function initHeaderDragAndDrop(){
    try{
        const headers = document.querySelectorAll('th.draggable-header');
        headers.forEach(th=>{
            th.setAttribute('draggable','true');
            th.addEventListener('dragstart', (e)=>{
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', th.dataset.col || '');
                th.classList.add('opacity-50');
                window._dragCol = th.dataset.col;
            });
            th.addEventListener('dragend', ()=>{
                th.classList.remove('opacity-50');
                document.querySelectorAll('th.drag-over').forEach(el=>el.classList.remove('drag-over'));
            });
            th.addEventListener('dragover', (e)=>{
                e.preventDefault();
                th.classList.add('drag-over');
            });
            th.addEventListener('dragleave', ()=>{
                th.classList.remove('drag-over');
            });
            th.addEventListener('drop', (e)=>{
                e.preventDefault();
                th.classList.remove('drag-over');
                const fromCol = window._dragCol;
                const toCol = th.dataset.col;
                if(fromCol && toCol && fromCol!==toCol && typeof reorderColumns==='function'){
                    reorderColumns(fromCol, toCol);
                }
            });
        });
    }catch(err){ console.warn('initHeaderDragAndDrop fail', err); }
}

function renderJemaahUmrahHTML() {
    const container = document.getElementById('modul-jemaah-umrah');
    if (!container) return;

    container.innerHTML = `
        <div class="flex flex-col lg:flex-row gap-4 min-h-[calc(100vh-140px)] relative">
            
            <div id="jemaahTripSidebar" class="w-full lg:w-72 bg-white rounded-2xl border border-slate-300 shadow-xs p-3.5 flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out">
                
                <div class="flex items-center justify-between px-2 pb-3 mb-2 border-b border-slate-200">
                    <span id="viewsFilterLabel" class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Senarai Trip</span>
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

                <!-- V46 Option B: Hijri Season tabs above searchbar - like Trip Umrah image_7d9ee0.png - fetch dari data, jangan hardcoded -->
                <div id="jemaahHijriFilterTabs" class="flex flex-wrap gap-1.5 mb-3 px-1">
                    <div class="text-[10px] text-slate-400 animate-pulse">Memuat hijri...</div>
                </div>

                <div class="relative mb-3">
                    <i class="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400 text-xs"></i>
                    <input type="text" id="searchTripViewInput" onkeyup="filterTripViewSidebar()" placeholder="Find a trip..." 
                        class="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400">
                </div>

                <div id="jemaahViewsSidebar" class="space-y-1 overflow-y-auto flex-1 max-h-[60vh] pr-1">
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
                                <i class="fa-solid fa-table-columns mr-1.5 text-slate-500"></i> Edit/Arrange Fields
                            </button>

                            <div id="hideFieldsDropdown" class="hidden absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 text-xs max-h-[420px] flex flex-col overflow-hidden">
                                <div class="p-2.5 border-b border-slate-200">
                                    <div class="relative">
                                        <i class="fa-solid fa-magnifying-glass absolute left-2.5 top-2.5 text-slate-400 text-[10px]"></i>
                                        <input type="text" id="fieldSearchInput" onkeyup="filterFieldsList()" placeholder="Find a field" class="w-full text-xs pl-7 pr-3 py-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400">
                                    </div>
                                </div>
                                <div id="fieldsToggleList" class="overflow-y-auto flex-1 p-1.5 space-y-0.5"></div>
                                <div class="p-2 border-t border-slate-200 bg-slate-50/50 flex justify-between text-[10px] text-slate-500">
                                    <span id="visibleFieldsCount">0 fields</span>
                                    <button onclick="resetFieldsToDefault()" class="font-bold text-slate-600 hover:text-brand-maroon">Reset</button>
                                </div>
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

function getJemaahHijriSeasonFromField(val){
  if(!val) return '';
  return val.toString().trim().toUpperCase(); // V50: full 26/27 • 1448H, jangan extract 1448H je
}
function cleanTripName(tripName) {
    if(!tripName) return 'TBC';
    let s = String(tripName).trim();
    if(s.includes('|')){
        const parts = s.split('|').map(p=>p.trim()).filter(p=>p.length>0);
        if(parts.length>0){
            const withAlpha = parts.filter(p=> /[A-Z]/i.test(p));
            s = (withAlpha.length>0 ? withAlpha[withAlpha.length-1] : parts[parts.length-1]);
        }
    }
    s = s.replace(/^\d{1,2}\/\d{1,2}\s*\|?\s*/,'').trim();
    if(!s) return String(tripName).trim() || 'TBC';
    return s.toUpperCase();
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
            const rawHijri = r.fields['Hijri Season'] || '';
            const hijri = getJemaahHijriSeasonFromField(rawHijri);
            tripMap[r.id] = {
                title: cleanTripName(rawName),
                mula: r.fields['Mula Pakej'] || '',
                tamat: r.fields['Tamat Pakej'] || '',
                hijri: hijri
            };
            const cleanTitle = cleanTripName(rawName);
            if(cleanTitle && cleanTitle !== 'TBC'){
              tripMap[cleanTitle] = tripMap[r.id];
            }
        });
    } catch (e) {
        console.error("Error fetching trip map:", e);
    }
}

// V51: Fetch field options dari Airtable meta API - direct fetch, tak hardcoded
let _jemaahMetaCache = null;
let _jemaahMetaFetching = false;



async function cleanBlankOptions(fieldName, auto=false){
  try{
    const base = window.AIRTABLE_BASE_ID||localStorage.getItem('effah_base_id')||'appSsn4JyQD4DnYu0';
    const pat = window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
    if(!base||!pat){ console.warn('No base/pat for clean'); return false; }
    console.log(`V87 Cleaning blank for ${fieldName}...`);
    
    // Force fresh fetch directly from API (not cache)
    const resTables = await fetch(`https://api.airtable.com/v0/meta/bases/${base}/tables`, {headers:{Authorization:`Bearer ${pat}`}});
    if(!resTables.ok){
      console.error('Failed to fetch tables for clean', resTables.status);
      return false;
    }
    const data = await resTables.json();
    const tables = data.tables||[];
    const targetTable = tables.find(t=> t.name.trim()==='DATA JEMAAH UMRAH') || tables.find(t=> t.name.toUpperCase().includes('DATA JEMAAH UMRAH')) || tables.find(t=> t.name.toUpperCase().includes('JEMAAH'));
    if(!targetTable){ console.error('Table not found for clean'); return false; }
    
    const targetField = targetTable.fields.find(f=> f.name.toUpperCase()===fieldName.toUpperCase());
    if(!targetField){ console.error(`Field ${fieldName} not found`); return false; }
    
    const choices = targetField.options?.choices||[];
    const blankChoices = choices.filter(c=> !c.name || c.name.trim()==='');
    const realChoices = choices.filter(c=> c.name && c.name.trim()!=='');
    
    console.log(`V87 ${fieldName}: total ${choices.length}, real ${realChoices.length}, blank ${blankChoices.length}`);
    console.log(`Real:`, realChoices.map(c=> `${c.name}(${c.id?.length})`));
    console.log(`Blank:`, blankChoices.map(c=> `${c.id} len ${c.id?.length}`));
    
    if(blankChoices.length===0){
      if(!auto) console.log(`No blank in ${fieldName}`);
      return true;
    }
    
    // V87: Keep ALL real choices, send id+name if id exists (any length), but ensure name trimmed and not blank
    // This will remove blank by not including it
    const dedupedMap = new Map();
    for(let c of realChoices){
      const key = c.name.trim().toUpperCase();
      if(!key) continue;
      if(!dedupedMap.has(key)){
        // Keep id if exists, even if 15 chars - Airtable will accept id+name for existing
        if(c.id){
          dedupedMap.set(key, {id: c.id, name: c.name.trim()});
        } else {
          dedupedMap.set(key, {name: c.name.trim()});
        }
      }
    }
    const deduped = Array.from(dedupedMap.values());
    console.log(`V87 Cleaning ${fieldName}: keeping ${deduped.length} real, removing ${blankChoices.length} blank`);
    console.log('Payload:', JSON.stringify({options:{choices: deduped}}, null, 2).substring(0,1000));
    
    if(deduped.length===0){
      console.error(`V87 Cannot clean ${fieldName} - no real choices`);
      return false;
    }
    
    const metaUrl = `https://api.airtable.com/v0/meta/bases/${base}/tables/${targetTable.id}/fields/${targetField.id}`;
    const res = await fetch(metaUrl, {
      method:'PATCH',
      headers:{Authorization:`Bearer ${pat}`,'Content-Type':'application/json'},
      body: JSON.stringify({options:{choices: deduped}})
    });
    const text = await res.text();
    console.log(`V87 Clean ${fieldName} result: ${res.status}`, text.substring(0,800));
    
    if(res.ok){
      console.log(`✅ V87 Cleaned ${blankChoices.length} blank from ${fieldName}`);
      // Update local caches
      _jemaahMetaCache = null;
      await fetchJemaahMetaOptionsFromMeta();
      if(typeof filterAndRenderJemaahGrid==='function') filterAndRenderJemaahGrid();
      return true;
    } else {
      console.error(`V87 Failed clean ${fieldName}:`, text);
      if(!auto) alert(`Gagal clean ${fieldName}: ${text.substring(0,300)}`);
      return false;
    }
  }catch(e){ console.error('V87 clean error', e); return false; }
}

async function cleanAllBlankOptions(){
  const fields = ['NATIONALITY','BOARD BASIS','INSURAN','PAKEJ','STATUS VISA','GENDER'];
  for(let f of fields){
    await cleanBlankOptions(f, true);
    await new Promise(r=> setTimeout(r, 700));
  }
  alert('Selesai clean semua blank. Refresh Airtable.');
}

// V87 Auto-clean on load - more aggressive
let _autoCleanDone = false;
async function autoCleanBlankOnLoad(){
  if(_autoCleanDone) return;
  _autoCleanDone = true;
  try{
    console.log('V87 Auto-clean start...');
    const fieldsToCheck = ['NATIONALITY','BOARD BASIS','INSURAN','PAKEJ','STATUS VISA'];
    for(let fname of fieldsToCheck){
      await cleanBlankOptions(fname, true);
      await new Promise(r=> setTimeout(r, 600));
    }
    console.log('V87 Auto-clean done');
  }catch(e){ console.warn('V87 auto-clean error', e); }
}
setTimeout(autoCleanBlankOnLoad, 2000);
setTimeout(autoCleanBlankOnLoad, 6000);

// Manual clean button helper - call from console
window.cleanNationalityBlank = async ()=>{ return await cleanBlankOptions('NATIONALITY', false); };
window.cleanAllBlank = cleanAllBlankOptions;


async function fetchJemaahMetaOptionsFromMeta(){
  if(_jemaahMetaFetching) return null;
  _jemaahMetaFetching = true;
  try{
    const FULL_BASE_ID = 'appSsn4JyQD4DnYu0';
    let base = window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base')||localStorage.getItem('effah_base_id')||FULL_BASE_ID;
    if(!base || base.length!==17){ base = FULL_BASE_ID; try{ localStorage.setItem('effah_base_id', FULL_BASE_ID); localStorage.setItem('effah_api_base', FULL_BASE_ID); }catch{} }
    const pat = window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
    if(!base||!pat){ 
      console.warn('Jemaah: Base atau PAT tiada'); 
      _jemaahMetaFetching=false; 
      return null; 
    }
    console.log('Jemaah V78: Fetching fresh schema from GET /meta/bases/'+base+'/tables');
    const res = await fetch(`https://api.airtable.com/v0/meta/bases/${base}/tables`, {headers:{Authorization:`Bearer ${pat}`}});
    if(!res.ok){
      console.warn('Jemaah: Gagal fetch meta', res.status, await res.text().then(t=>t.substring(0,500)));
      _jemaahMetaFetching=false;
      return null;
    }
    const data = await res.json();
    const tables = data.tables||[];
    let targetTable = tables.find(t=> (t.name||'').trim()==='DATA JEMAAH UMRAH');
    if(!targetTable) targetTable = tables.find(t=> (t.name||'').toUpperCase().includes('DATA JEMAAH UMRAH'));
    if(!targetTable) targetTable = tables.find(t=> (t.name||'').toUpperCase().includes('JEMAAH'));
    if(!targetTable){
      console.warn('Jemaah: Table DATA JEMAAH UMRAH tidak jumpa');
      _jemaahMetaFetching=false;
      return null;
    }
    _jemaahMetaCache = targetTable;
    jemaahMetaTableId = targetTable.id;
    window._jemaahMetaCache = targetTable;
    
    // Validate ID lengths
    console.log('✅ Jemaah table found:', targetTable.name, 'id:', targetTable.id, 'len', targetTable.id.length, 'fields', targetTable.fields.length);
    targetTable.fields.forEach(f=>{
      if(f.id && f.id.length!==17) console.warn(`⚠️ Field ${f.name} ID len ${f.id.length}: ${f.id}`);
      if(f.options?.choices){
        f.options.choices.forEach(c=>{
          if(c.id && c.id.length!==17) console.warn(`⚠️ Choice ${f.name} -> ${c.name} ID len ${c.id.length}: ${c.id}`);
        });
      }
    });
    
    // Build lookup like rooming.js
    jemaahMetaFieldsByName = {};
    jemaahFieldOptions = {};
    targetTable.fields.forEach(field=>{
      jemaahMetaFieldsByName[field.name] = field;
      if(field.options?.choices){
        // V84: Filter out blank options - jangan simpan blank ke portal
        const filtered = field.options.choices.filter(c=> c.name && c.name.trim()!=='');
        if(filtered.length !== field.options.choices.length){
          console.warn(`⚠️ Filtered ${field.options.choices.length - filtered.length} blank options from ${field.name}`);
        }
        jemaahFieldOptions[field.name] = filtered.map(c=> ({ id: c.id, name: c.name, color: c.color }));
      }
    });
    console.log('✅ Jemaah V78 loaded', Object.keys(jemaahMetaFieldsByName).length, 'fields');
    const p = jemaahMetaFieldsByName['PAKEJ'];
    if(p) console.log('Sample PAKEJ:', { id: p.id, id_len: p.id.length, type: p.type, choices: (p.options?.choices||[]).map(c=> ({id: c.id, len: c.id.length, name: c.name})) });
    const ins = jemaahMetaFieldsByName['INSURAN'];
    if(ins) console.log('Sample INSURAN:', { id: ins.id, id_len: ins.id.length, type: ins.type, choices: (ins.options?.choices||[]).map(c=> ({id: c.id, len: c.id.length, name: c.name})) });
    
    _jemaahMetaFetching=false;
    return jemaahFieldOptions;
  }catch(e){
    console.warn('fetchJemaahMetaOptionsFromMeta error', e);
    _jemaahMetaFetching=false;
    return null;
  }
}

// Override old fetchJemaahMetaOptions to call new one

async function cleanBlankOptions(fieldName){
  try{
    const base = window.AIRTABLE_BASE_ID||localStorage.getItem('effah_base_id')||'appSsn4JyQD4DnYu0';
    const pat = window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
    if(!base||!pat) return;
    console.log(`V84 Cleaning blank options for ${fieldName}...`);
    _jemaahMetaCache = null;
    await fetchJemaahMetaOptionsFromMeta();
    if(!_jemaahMetaCache) return;
    const targetField = _jemaahMetaCache.fields.find(f=> f.name.toUpperCase()===fieldName.toUpperCase());
    if(!targetField) return;
    const choices = targetField.options?.choices||[];
    const blankChoices = choices.filter(c=> !c.name || c.name.trim()==='');
    const realChoices = choices.filter(c=> c.name && c.name.trim()!=='');
    console.log(`Found ${blankChoices.length} blank choices in ${fieldName}:`, blankChoices.map(c=> c.id));
    console.log(`Real choices: ${realChoices.length}`, realChoices.map(c=> c.name));
    if(blankChoices.length===0){
      console.log(`No blank choices in ${fieldName} - already clean`);
      return true;
    }
    // V84: Keep only real choices with real 17-char IDs, filter out blank completely
    const realChoicesWithId = realChoices.filter(c=> c.id && c.id.length===17 && c.name && c.name.trim()!=='').map(c=> ({id: c.id, name: c.name}));
    console.log(`V84 Cleaning: keeping ${realChoicesWithId.length} real (non-blank), removing ${blankChoices.length} blank`);
    if(realChoicesWithId.length===0){
      console.error(`Cannot clean ${fieldName} - no real choices left, would delete all options`);
      return false;
    }
    const metaUrl = `https://api.airtable.com/v0/meta/bases/${base}/tables/${_jemaahMetaCache.id}/fields/${targetField.id}`;
    const res = await fetch(metaUrl, {
      method:'PATCH',
      headers:{Authorization:`Bearer ${pat}`,'Content-Type':'application/json'},
      body: JSON.stringify({options:{choices: realChoicesWithId}})
    });
    const text = await res.text();
    console.log(`V84 Clean ${fieldName} result:`, res.status, text.substring(0,500));
    if(res.ok){
      console.log(`✅ V84 Cleaned ${blankChoices.length} blank options from ${fieldName}`);
      await fetchJemaahMetaOptionsFromMeta();
      if(typeof filterAndRenderJemaahGrid==='function') filterAndRenderJemaahGrid();
      return true;
    } else {
      console.error(`Failed to clean ${fieldName}:`, text);
      return false;
    }
  }catch(e){ console.error('cleanBlankOptions V84 error', e); return false; }
}

async function cleanAllBlankOptions(){
  const fieldsToClean = ['BOARD BASIS','INSURAN','PAKEJ','NATIONALITY','STATUS VISA','GENDER'];
  for(let f of fieldsToClean){
    await cleanBlankOptions(f);
    await new Promise(r=> setTimeout(r, 800));
  }
  alert('Selesai clean blank options. Sila refresh.');
}

// Auto-clean on load if blank detected
setTimeout(async ()=>{
  try{
    // Check if any field has blank in jemaahFieldOptions
    for(let fieldName in jemaahFieldOptions){
      const opts = jemaahFieldOptions[fieldName]||[];
      const hasBlank = opts.some(o=> !o.name || o.name.trim()==='');
      if(hasBlank){
        console.warn(`Blank detected in ${fieldName}, auto-cleaning...`);
        await cleanBlankOptions(fieldName);
      }
    }
  }catch{}
}, 3000);


async function fetchJemaahMetaOptions(){
  return await fetchJemaahMetaOptionsFromMeta();
}




function buildFallbackFieldOptions(){
  const fieldsToBuild = ['NATIONALITY','STATUS VISA','BOARD BASIS','INSURAN','PAKEJ'];
  fieldsToBuild.forEach(fieldName=>{
    const values = new Set();
    (allJemaahUmrahRecords||[]).forEach(r=>{
      const v = r.fields[fieldName];
      if(!v) return;
      if(Array.isArray(v)){ v.forEach(x=> values.add(x)); } else { values.add(v); }
    });
    if(values.size>0){ jemaahFieldOptions[fieldName] = Array.from(values).map(name=>({ name, id: name })); }
  });
}
async function fetchEjenList(){
  try{
    if(typeof AIRTABLE_PAT === 'undefined' || !AIRTABLE_PAT){
      AIRTABLE_PAT = window.AIRTABLE_PAT || localStorage.getItem('effah_api_pat') || '';
      AIRTABLE_BASE_ID = window.AIRTABLE_BASE_ID || localStorage.getItem('effah_base_id') || '';
    }
    if(!AIRTABLE_PAT || !AIRTABLE_BASE_ID) return;
    let records = []; let offset = '';
    do{
      let url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/EJEN%20LIST?pageSize=100`;
      if(offset) url+=`&offset=${offset}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_PAT}` } });
      const data = await res.json();
      if(data.records) records = records.concat(data.records);
      offset = data.offset || '';
    }while(offset);
    ejenListCache = records.map(r=>({ id: r.id, name: r.fields['NAMA EJEN'] || r.fields['NAMA'] || r.fields['NAME'] || 'Unknown', status: r.fields['STATUS']||'', noTelefon: r.fields['NO TELEFON']||'', raw: r }));
  }catch(e){ console.error(e); }
}
async function addNewOptionToField(fieldName, newOptionName, triggerElement=null, recordId=null){
  let loadingBtn = null;
  let originalBtnHTML = '';
  try{
    const FULL_BASE_ID = 'appSsn4JyQD4DnYu0';
    let base = window.AIRTABLE_BASE_ID||localStorage.getItem('effah_api_base')||localStorage.getItem('effah_base_id')||FULL_BASE_ID;
    if(!base || base.length!==17){ base = FULL_BASE_ID; try{ localStorage.setItem('effah_base_id', FULL_BASE_ID); localStorage.setItem('effah_api_base', FULL_BASE_ID); }catch{} }
    const pat = window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat');
    if(!base||!pat){ alert('Konfigurasi Airtable tidak ditemui'); return false; }

    if(triggerElement){
      loadingBtn = triggerElement;
      originalBtnHTML = loadingBtn.innerHTML;
      loadingBtn.disabled = true;
      loadingBtn.innerHTML = '<span class="inline-flex items-center gap-1"><svg class="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Menambah...</span>';
      loadingBtn.classList.add('opacity-70','cursor-wait');
    }

    console.log(`\n=== V88 addNewOptionToField ${fieldName} -> ${newOptionName} ===`);

    if(!newOptionName || newOptionName.trim()===''){
      console.error('Blank name, abort');
      alert('Nama pilihan tidak boleh kosong.');
      return false;
    }
    newOptionName = newOptionName.trim().toUpperCase();

    _jemaahMetaCache = null;
    await fetchJemaahMetaOptionsFromMeta();
    if(!_jemaahMetaCache){
      if(loadingBtn){ loadingBtn.innerHTML = originalBtnHTML; loadingBtn.disabled = false; loadingBtn.classList.remove('opacity-70','cursor-wait'); }
      alert('Tidak dapat mencapai metadata Airtable.');
      return false;
    }
    const tableId = _jemaahMetaCache.id;
    const fields = _jemaahMetaCache.fields||[];
    const targetField = fields.find(f=> (f.name||'').toUpperCase()===fieldName.toUpperCase());
    if(!targetField){
      if(loadingBtn){ loadingBtn.innerHTML = originalBtnHTML; loadingBtn.disabled = false; }
      alert(`Medan ${fieldName} tidak ditemui.`);
      return false;
    }

    if(targetField.type!=='singleSelect' && targetField.type!=='multipleSelects'){
      if(targetField.type==='multipleRecordLinks' || targetField.type==='singleRecordLink' || fieldName==='EJEN' || fieldName==='TRIP'){
        const linkedTable = fieldName==='EJEN' ? 'EJEN LIST' : 'PAKEJ UMRAH';
        const linkedField = fieldName==='EJEN' ? 'NAMA EJEN' : 'NAMA PAKEJ';
        try{
          const url = `https://api.airtable.com/v0/${base}/${encodeURIComponent(linkedTable)}`;
          const res = await fetch(url, { method:'POST', headers:{ Authorization: `Bearer ${pat}`, 'Content-Type':'application/json' }, body: JSON.stringify({ fields: { [linkedField]: newOptionName } }) });
          if(loadingBtn){ loadingBtn.innerHTML = originalBtnHTML; loadingBtn.disabled = false; loadingBtn.classList.remove('opacity-70','cursor-wait'); }
          if(!res.ok){ const t=await res.text(); alert('Gagal tambah di '+linkedTable); return false; }
          await fetchJemaahMetaOptionsFromMeta();
          if(typeof filterAndRenderJemaahGrid==='function') filterAndRenderJemaahGrid();
          alert(`'${newOptionName}' berjaya ditambahkan.`);
          return true;
        }catch(e){ 
          if(loadingBtn){ loadingBtn.innerHTML = originalBtnHTML; loadingBtn.disabled = false; }
          alert('Ralat: '+e.message); return false; 
        }
      }
      if(loadingBtn){ loadingBtn.innerHTML = originalBtnHTML; loadingBtn.disabled = false; }
      alert(`Medan ${fieldName} bukan jenis pilihan.`);
      return false;
    }

    const existingChoices = (targetField.options && targetField.options.choices) ? targetField.options.choices : [];
    const existingNonBlank = existingChoices.filter(c=> c.name && c.name.trim()!=='');
    if(existingNonBlank.some(c=> (c.name||'').toUpperCase()===newOptionName.toUpperCase())){
      if(loadingBtn){ loadingBtn.innerHTML = originalBtnHTML; loadingBtn.disabled = false; loadingBtn.classList.remove('opacity-70','cursor-wait'); }
      alert(`'${newOptionName}' telah wujud.`);
      return false;
    }

    console.log('Trying typecast:true FIRST...');
    let typecastSuccess = false;
    let allRecords = [];
    try{
      allRecords = (typeof allJemaahRecords!=='undefined' && allJemaahRecords.length>0) ? allJemaahRecords : (window.allJemaahRecords||[]);
      if(allRecords.length===0 && typeof allJemaahUmrahRecords!=='undefined') allRecords = allJemaahUmrahRecords;
      if(allRecords.length===0 && window.allJemaahUmrahRecords) allRecords = window.allJemaahUmrahRecords;
    }catch{}
    
    if(allRecords.length>0){
      const first = allRecords[0];
      const isMulti = targetField.type==='multipleSelects';
      const originalVal = first.fields[fieldName];
      try{
        const typecastPayload = isMulti ? [newOptionName] : newOptionName;
        const url = `https://api.airtable.com/v0/${base}/DATA%20JEMAAH%20UMRAH/${first.id}`;
        const typecastRes = await fetch(url, {
          method:'PATCH',
          headers:{Authorization:`Bearer ${pat}`,'Content-Type':'application/json'},
          body: JSON.stringify({fields:{[fieldName]: typecastPayload}, typecast:true})
        });
        const typecastText = await typecastRes.text();
        console.log('Typecast response:', typecastRes.status, typecastText.substring(0,500));
        if(typecastRes.ok){
          typecastSuccess = true;
          setTimeout(async ()=>{
            try{
              const revertValue = isMulti ? (Array.isArray(originalVal) ? originalVal.filter(v=> v && v.trim()!=='') : []) : (originalVal || null);
              await fetch(url, {
                method:'PATCH',
                headers:{Authorization:`Bearer ${pat}`,'Content-Type':'application/json'},
                body: JSON.stringify({fields:{[fieldName]: revertValue}, typecast:true})
              });
            }catch(e){}
          }, 1000);
        }
      }catch(e){ console.warn('Typecast exception', e); }
    }

    if(typecastSuccess){
      await new Promise(r=> setTimeout(r, 1200));
      await fetchJemaahMetaOptionsFromMeta();
      
      try{
        if(recordId){
          const isMulti = targetField.type==='multipleSelects';
          const rec = allRecords.find(r=> r.id===recordId);
          if(rec){
            if(isMulti){
              let arr = Array.isArray(rec.fields[fieldName]) ? [...rec.fields[fieldName]] : (rec.fields[fieldName] ? [rec.fields[fieldName]] : []);
              arr = arr.filter(v=> v && v.trim()!=='');
              if(!arr.includes(newOptionName)) arr.push(newOptionName);
              arr = [...new Set(arr)].filter(v=> v && v.trim()!=='');
              rec.fields[fieldName] = arr;
            } else {
              rec.fields[fieldName] = newOptionName;
            }
            try{
              const payload = isMulti ? rec.fields[fieldName] : newOptionName;
              console.log(`V88 Auto-select PATCH ${recordId} ${fieldName}=`, payload);
              const res = await fetch(`https://api.airtable.com/v0/${base}/DATA%20JEMAAH%20UMRAH/${recordId}`, {
                method:'PATCH',
                headers:{Authorization:`Bearer ${pat}`,'Content-Type':'application/json'},
                body: JSON.stringify({fields:{[fieldName]: payload}, typecast:true})
              });
              const t = await res.text();
              console.log(`V88 Auto-select result ${res.status}`, t.substring(0,500));
            }catch(e){ console.warn('V88 auto-select error', e); }
          }
        }
      }catch(e){ console.warn('V88 auto-select outer', e); }

      if(loadingBtn){ loadingBtn.innerHTML = originalBtnHTML; loadingBtn.disabled = false; loadingBtn.classList.remove('opacity-70','cursor-wait'); }
      alert(`'${newOptionName}' berjaya ditambahkan.`);
      if(typeof filterAndRenderJemaahGrid==='function') filterAndRenderJemaahGrid();
      return true;
    }

    // Fallback meta PATCH - never send blank
    const realChoices = existingChoices.filter(c=> c.name && c.name.trim()!=='' && c.id);
    const dedupMap = new Map();
    for(let c of realChoices){
      const k = c.name.trim().toUpperCase();
      if(!k) continue;
      if(!dedupMap.has(k)) dedupMap.set(k, {id: c.id, name: c.name.trim()});
    }
    const choicesWithId = Array.from(dedupMap.values()).map(c=> c.id && c.id.length===17 ? {id: c.id, name: c.name} : {name: c.name});
    const newChoices = [...choicesWithId, {name: newOptionName}];
    
    console.log('Meta PATCH payload (no blank):', newChoices.length);
    
    try{
      const metaUrl = `https://api.airtable.com/v0/meta/bases/${base}/tables/${tableId}/fields/${targetField.id}`;
      const metaRes = await fetch(metaUrl, {
        method:'PATCH',
        headers:{Authorization:`Bearer ${pat}`,'Content-Type':'application/json'},
        body: JSON.stringify({options:{choices: newChoices}})
      });
      const metaText = await metaRes.text();
      console.log('Meta result:', metaRes.status, metaText.substring(0,500));
      if(loadingBtn){ loadingBtn.innerHTML = originalBtnHTML; loadingBtn.disabled = false; loadingBtn.classList.remove('opacity-70','cursor-wait'); }
      if(metaRes.ok){
        await fetchJemaahMetaOptionsFromMeta();
        if(recordId){
          try{
            const rec = allRecords.find(r=> r.id===recordId);
            if(rec){
              if(targetField.type==='multipleSelects'){
                let arr = Array.isArray(rec.fields[fieldName]) ? [...rec.fields[fieldName]] : [];
                arr = arr.filter(v=> v && v.trim()!=='');
                if(!arr.includes(newOptionName)) arr.push(newOptionName);
                rec.fields[fieldName] = arr;
              } else {
                rec.fields[fieldName] = newOptionName;
              }
              await fetch(`https://api.airtable.com/v0/${base}/DATA%20JEMAAH%20UMRAH/${recordId}`, {
                method:'PATCH',
                headers:{Authorization:`Bearer ${pat}`,'Content-Type':'application/json'},
                body: JSON.stringify({fields:{[fieldName]: rec.fields[fieldName]}, typecast:true})
              });
            }
          }catch{}
        }
        if(typeof filterAndRenderJemaahGrid==='function') filterAndRenderJemaahGrid();
        alert(`'${newOptionName}' berjaya ditambahkan.`);
        return true;
      } else {
        alert(`Gagal menambah '${newOptionName}'. Sila tambah manual di Airtable.`);
        return false;
      }
    }catch(e){
      if(loadingBtn){ loadingBtn.innerHTML = originalBtnHTML; loadingBtn.disabled = false; loadingBtn.classList.remove('opacity-70','cursor-wait'); }
      alert(`Gagal: ${e.message}`);
      return false;
    }
  }catch(e){
    console.error('V88 error', e);
    try{ if(loadingBtn){ loadingBtn.innerHTML = originalBtnHTML; loadingBtn.disabled = false; } }catch{}
    alert(`Gagal menambah "${newOptionName}".`);
    return false;
  }
}


// Helper to handle + Add new option click with loading and auto-select
function handleAddNewOptionClick(fieldName, recordId=null, btnElement=null){
  const raw = prompt(`Tambah pilihan baharu untuk ${fieldName}:`);
  if(!raw) return;
  const trimmed = raw.trim().toUpperCase();
  if(!trimmed) return;
  // Call with button element for loading
  addNewOptionToField(fieldName, trimmed, btnElement, recordId);
}














function handleAddNewOption(fieldName, selectEl, modalDropdownId){
  const newVal = prompt(`Sila masukkan pilihan baharu untuk ${fieldName}:`);
  if(!newVal){ if(selectEl) selectEl.value = selectEl.getAttribute('data-prev')||''; return; }
  const trimmed = newVal.trim().toUpperCase();
  if(!trimmed) return;
  
  let originalHTML = '';
  let originalValue = '';
  let recId = null;
  let cellEl = null;
  let isModal = false;
  
  if(selectEl){
    originalValue = selectEl.value;
    originalHTML = selectEl.innerHTML;
    cellEl = selectEl.closest('td') || selectEl.closest('div.sm\\:col-span-2') || selectEl.parentElement;
    isModal = !!selectEl.closest('#expandRecordModal') || !!selectEl.closest('#addModalForm');
    recId = selectEl.getAttribute('data-rec-id') || (selectEl.dataset ? selectEl.dataset.recId : null);
    if(!recId && !isModal){
      try{
        const tr = selectEl.closest('tr');
        if(tr) recId = tr.getAttribute('data-rec-id') || tr.getAttribute('data-id');
        if(!recId){
          const oc = selectEl.getAttribute('onchange')||'';
          const m2 = oc.match(/updateJemaahField\('([^']+)'/);
          if(m2) recId = m2[1];
        }
      }catch{}
    }
    console.log(`V89 handleAddNewOption ${fieldName} recId=${recId} isModal=${isModal} trimmed=${trimmed}`);
    if(recId && !isModal){
      try{ localStorage.setItem('effah_pending_autoselect', JSON.stringify({recId, fieldName, value: trimmed, ts: Date.now()})); }catch{}
    }
    
    // V89: Loading UI like Group box "Sedang diproses..."
    if(cellEl && !isModal){
      cellEl.dataset.originalHTML = cellEl.innerHTML;
      cellEl.innerHTML = `<div class="w-full text-xs p-2 font-bold rounded-lg border border-slate-300 bg-white flex items-center justify-center gap-2 text-slate-600"><svg class="animate-spin h-4 w-4 text-slate-500" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span>Sedang diproses...</span></div>`;
    } else if(isModal){
      // For modal, show loading in select itself
      selectEl.disabled = true;
      selectEl.innerHTML = `<option selected>⏳ Menambah ${trimmed}...</option>`;
      selectEl.classList.add('opacity-70');
    } else {
      selectEl.disabled = true;
      selectEl.innerHTML = `<option selected>⏳ Menambah ${trimmed}...</option>`;
      selectEl.classList.add('opacity-70');
    }
  }
  
  addNewOptionToField(fieldName, trimmed, selectEl, recId).then(ok=>{ 
    console.log(`V89 add result ${fieldName} ${trimmed} ok=${ok} recId=${recId} isModal=${isModal}`);
    const currentCell = cellEl || (selectEl ? selectEl.closest('td') || selectEl.closest('div.sm\\:col-span-2') || selectEl.parentElement : null);
    
    if(!ok){
      if(currentCell && currentCell.dataset.originalHTML) currentCell.innerHTML = currentCell.dataset.originalHTML;
      else if(selectEl){ selectEl.disabled=false; selectEl.classList.remove('opacity-70'); selectEl.innerHTML=originalHTML; selectEl.value=selectEl.getAttribute('data-prev')||originalValue; }
      try{ localStorage.removeItem('effah_pending_autoselect'); }catch{}
      return;
    }
    
    // Success
    if(isModal){
      // V89: For modal, rebuild select options with new value selected
      setTimeout(async ()=>{
        await fetchJemaahMetaOptionsFromMeta();
        const opts = (jemaahFieldOptions[fieldName]||[]).filter(o=> o.name && o.name.trim()!=='');
        if(selectEl){
          let html = `<option value="">${selectEl.querySelector('option[value=""]') ? selectEl.querySelector('option[value=""]').textContent : '-- Pilih --'}</option>`;
          opts.forEach(opt=>{
            const sel = opt.name===trimmed ? 'selected' : '';
            html += `<option value="${opt.name}" ${sel}>${opt.name}</option>`;
          });
          if(fieldName!=='GENDER'){
            html += `<option value="__ADD_NEW__" style="font-weight:bold;color:#800020;">+ Add new option</option>`;
          }
          selectEl.innerHTML = html;
          selectEl.disabled = false;
          selectEl.classList.remove('opacity-70');
          selectEl.value = trimmed;
          selectEl.setAttribute('data-prev', trimmed);
          console.log(`V89 Modal ${fieldName} set to ${trimmed}`);
        }
        // For BOARD BASIS and INSURAN multi in modal, update checkbox lists
        if(fieldName==='BOARD BASIS'){
          const list = document.getElementById('boardBasisList');
          if(list){
            const filtered = opts;
            list.innerHTML = filtered.map(opt=>{
              const checked = opt.name===trimmed ? 'checked' : '';
              return `<label class="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer"><input type="checkbox" value="${opt.name}" ${checked} class="board-checkbox w-4 h-4 rounded border-slate-300 text-brand-maroon"><span class="text-xs font-bold">${opt.name}</span></label>`;
            }).join('');
            document.querySelectorAll('.board-checkbox').forEach(cb=>{ cb.addEventListener('change', updateBoardBasisSelected); });
            if(typeof updateBoardBasisSelected==='function') updateBoardBasisSelected();
          }
        }
        if(fieldName==='INSURAN'){
          const list = document.getElementById('insuranList');
          if(list){
            const filtered = opts;
            list.innerHTML = filtered.map(opt=>{
              const checked = opt.name===trimmed ? 'checked' : '';
              return `<label class="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer"><input type="checkbox" value="${opt.name}" ${checked} class="insuran-checkbox w-4 h-4 rounded border-slate-300 text-brand-maroon"><span class="text-xs font-bold">${opt.name}</span></label>`;
            }).join('');
            document.querySelectorAll('.insuran-checkbox').forEach(cb=>{ cb.addEventListener('change', updateInsuranSelected); });
            if(typeof updateInsuranSelected==='function') updateInsuranSelected();
          }
        }
      }, 800);
    } else {
      // Table case - keep loading until grid refresh
      if(currentCell){
        currentCell.innerHTML = `<div class="w-full text-xs p-2 font-bold rounded-lg border border-slate-300 bg-white flex items-center justify-center gap-2 text-emerald-600"><svg class="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span>Menyimpan ${trimmed}...</span></div>`;
      }
      setTimeout(()=>{
        if(typeof filterAndRenderJemaahGrid==='function'){
          filterAndRenderJemaahGrid();
          setTimeout(()=>{
            try{
              const allRecs = window.allJemaahUmrahRecords||window.allJemaahRecords||[];
              const rec = allRecs.find(r=> r.id===recId);
              if(rec && rec.fields[fieldName]!==trimmed){
                rec.fields[fieldName]=trimmed;
                filterAndRenderJemaahGrid();
              }
            }catch{}
            setTimeout(()=>{ try{ localStorage.removeItem('effah_pending_autoselect'); }catch{} }, 2500);
          }, 400);
        }
      }, 600);
    }
  });
  
  if(modalDropdownId){
    // For modal multi dropdowns called via + Add option button in dropdown
    const options = jemaahFieldOptions[fieldName] || [];
    const filtered = options.filter(o=> o.name && o.name.trim()!=='');
    if(modalDropdownId==='boardBasisDropdown'){
      const list = document.getElementById('boardBasisList');
      if(list){
        // Will be updated after add, but show loading now
        list.innerHTML = `<div class="p-3 text-xs text-slate-500 flex items-center gap-2"><svg class="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Menambah ${trimmed}...</div>` + list.innerHTML;
      }
    } else if(modalDropdownId==='insuranDropdown'){
      const list = document.getElementById('insuranList');
      if(list){
        list.innerHTML = `<div class="p-3 text-xs text-slate-500 flex items-center gap-2"><svg class="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Menambah ${trimmed}...</div>` + list.innerHTML;
      }
    }
  }
}


function renderSingleSelectCell(recId, fieldName, currentValue){
  const options = jemaahFieldOptions[fieldName] || [];
  let safeCurrent = currentValue || '';
  
  try{
    const pendingRaw = localStorage.getItem('effah_pending_autoselect');
    if(pendingRaw){
      const pending = JSON.parse(pendingRaw);
      if(pending.recId===recId && pending.fieldName===fieldName && Date.now() - pending.ts < 10000){
        safeCurrent = pending.value;
      }
    }
  }catch{}
  
  let optsHtml = `<option value="">-- Pilih --</option>`;
  if(options.length>0){
    const filteredOpts = options.filter(opt=> opt.name && opt.name.trim()!=='');
    let allOpts = [...filteredOpts];
    if(safeCurrent && safeCurrent.trim()!=='' && !allOpts.some(o=> o.name===safeCurrent)){
      allOpts.push({name: safeCurrent});
    }
    allOpts.forEach(opt=>{ const selected = (opt.name === safeCurrent) ? 'selected' : ''; optsHtml += `<option value="${opt.name}" ${selected}>${opt.name}</option>`; });
  } else {
    if(safeCurrent && safeCurrent.trim()!==''){ optsHtml += `<option value="${safeCurrent}" selected>${safeCurrent}</option>`; }
    // Fallback for GENDER
    if(fieldName==='GENDER' && !safeCurrent){
      optsHtml += `<option value="MALE">MALE</option><option value="FEMALE">FEMALE</option>`;
    }
  }
  // V89: No + Add new option for GENDER in table too
  if(fieldName!=='GENDER'){
    optsHtml += `<option value="__ADD_NEW__" style="font-weight:bold; color:#800020;">+ Add new option</option>`;
  }
  return `<select data-prev="${safeCurrent}" data-rec-id="${recId}" onchange="if(this.value==='__ADD_NEW__'){ handleAddNewOption('${fieldName}', this); } else { updateJemaahField('${recId}', '${fieldName}', this.value); }" class="w-full text-xs p-1.5 font-bold rounded-lg border border-transparent hover:border-slate-300 focus:bg-white bg-transparent">${optsHtml}</select>`;
}


function renderMultiSelectCell(recId, fieldName, currentValues){
  const options = jemaahFieldOptions[fieldName] || [];
  const currentArr = Array.isArray(currentValues) ? currentValues : (currentValues ? [currentValues] : []);
  let pillsHtml = '';
  if(currentArr.length>0){
    currentArr.forEach(val=>{ pillsHtml += `<span class="inline-flex items-center gap-1 bg-sky-100 text-sky-800 border border-sky-200 text-[10px] font-bold px-2 py-0.5 rounded-full mr-1 mb-1">${val} <button onclick="event.stopPropagation(); removeMultiSelectValue('${recId}', '${fieldName}', '${val.replace(/'/g, "\'")}') " class="ml-1 text-sky-600 hover:text-rose-600">x</button></span>`; });
  } else { pillsHtml = `<span class="text-slate-300 text-[10px]">-</span>`; }
  let optsHtml = '';
  if(options.length>0){
    // Filter out blank options
    const filteredOpts = options.filter(opt=> opt.name && opt.name.trim()!=='');
    filteredOpts.forEach(opt=>{ const isSelected = currentArr.includes(opt.name); optsHtml += `<label class="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 cursor-pointer text-xs"><input type="checkbox" ${isSelected?'checked':''} onchange="toggleMultiSelectValue('${recId}', '${fieldName}', '${opt.name.replace(/'/g, "\'")}', this.checked)" class="w-3.5 h-3.5 rounded border-slate-300 text-brand-maroon"> <span>${opt.name}</span></label>`; });
  }
  optsHtml += `<div class="border-t border-slate-200 mt-1 pt-1"><button onclick="handleAddNewMultiOption('${fieldName}', this, '${recId}')" class="w-full text-left px-2 py-1 text-[11px] font-bold text-brand-maroon hover:bg-rose-50 rounded flex items-center gap-1"><span>+ Add new option</span></button></div>`;
  const dropdownId = `ms-dropdown-${recId}-${fieldName.replace(/\s/g,'')}`;
  return `<div class="relative cell-dropdown-wrapper"><div class="flex flex-wrap items-center gap-1 p-1 min-h-[28px] border border-transparent hover:border-slate-300 rounded-lg cursor-pointer" onclick="event.stopPropagation(); toggleCellDropdown('${dropdownId}')">${pillsHtml}<i class="fa-solid fa-chevron-down text-[10px] text-slate-400 ml-auto"></i></div><div id="${dropdownId}" data-cell-dropdown class="hidden absolute left-0 top-full mt-1 w-56 bg-white rounded-xl shadow-xl border border-slate-200 z-50 max-h-64 overflow-y-auto p-1">${optsHtml}</div></div>`;
}

function toggleMultiSelectValue(recId, fieldName, value, isChecked){
  // V84: Prevent blank values from being added
  if(!value || value.trim()===''){
    console.warn('Prevented blank value in toggleMultiSelectValue');
    return;
  }
  const rec = allJemaahUmrahRecords.find(r=> r.id===recId); if(!rec) return;
  let current = rec.fields[fieldName]; let arr = Array.isArray(current) ? [...current] : (current ? [current] : []);
  // Filter out any existing blank
  arr = arr.filter(v=> v && v.trim()!=='');
  if(isChecked){ if(!arr.includes(value)) arr.push(value); } else { arr = arr.filter(v=> v!==value); }
  // Final filter blank before sending
  arr = arr.filter(v=> v && v.trim()!=='');
  updateJemaahField(recId, fieldName, arr); rec.fields[fieldName] = arr; filterAndRenderJemaahGrid();
}
function removeMultiSelectValue(recId, fieldName, value){ toggleMultiSelectValue(recId, fieldName, value, false); }
function handleAddNewMultiOption(fieldName, btnEl=null, recId=null){
  const newVal = prompt(`Tambah pilihan baharu untuk ${fieldName}:`);
  if(!newVal) return; 
  const trimmed = newVal.trim().toUpperCase(); 
  if(!trimmed) return;
  
  let originalBtnHTML = '';
  let loadingBtn = btnEl;
  let isModal = false;
  try{
    if(!loadingBtn){
      const active = document.activeElement;
      if(active && active.textContent && active.textContent.includes('Add option')){
        loadingBtn = active;
      }
    }
    if(loadingBtn){
      isModal = !!loadingBtn.closest('#expandRecordModal') || !!loadingBtn.closest('#addModalForm');
    } else {
      // Check if we're in modal without button
      isModal = !!document.getElementById('expandRecordModal')?.classList.contains('flex') || !!document.getElementById('addModalForm');
    }
  }catch{}
  
  if(loadingBtn){
    originalBtnHTML = loadingBtn.innerHTML;
    loadingBtn.disabled = true;
    loadingBtn.innerHTML = '<span class="inline-flex items-center gap-1"><svg class="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Menambah...</span>';
    loadingBtn.classList.add('opacity-70');
  }
  
  // Show loading in dropdown list for modal multi
  let boardList = null;
  let insuranList = null;
  try{
    if(fieldName==='BOARD BASIS'){
      boardList = document.getElementById('boardBasisList');
      if(boardList){
        boardList.dataset.originalHTML = boardList.innerHTML;
        boardList.innerHTML = `<div class="p-3 text-xs text-slate-500 flex items-center gap-2"><svg class="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Menambah ${trimmed}...</div>`;
      }
    }
    if(fieldName==='INSURAN'){
      insuranList = document.getElementById('insuranList');
      if(insuranList){
        insuranList.dataset.originalHTML = insuranList.innerHTML;
        insuranList.innerHTML = `<div class="p-3 text-xs text-slate-500 flex items-center gap-2"><svg class="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Menambah ${trimmed}...</div>`;
      }
    }
  }catch{}
  
  if(!recId){
    try{
      const wrapper = loadingBtn?.closest('.cell-dropdown-wrapper');
      if(wrapper){
        const idAttr = wrapper.closest('tr')?.getAttribute('data-rec-id');
        if(idAttr) recId = idAttr;
      }
    }catch{}
  }
  
  addNewOptionToField(fieldName, trimmed, loadingBtn, recId).then(async ok=>{
    if(loadingBtn){
      loadingBtn.innerHTML = originalBtnHTML;
      loadingBtn.disabled = false;
      loadingBtn.classList.remove('opacity-70');
    }
    
    if(ok){
      // V90: For modal multi, rebuild dropdown with new option checked
      try{
        await fetchJemaahMetaOptionsFromMeta();
        const opts = (jemaahFieldOptions[fieldName]||[]).filter(o=> o.name && o.name.trim()!=='');
        
        if(fieldName==='BOARD BASIS'){
          const list = document.getElementById('boardBasisList');
          if(list){
            list.innerHTML = opts.map(opt=>{
              const checked = opt.name===trimmed ? 'checked' : '';
              return `<label class="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer"><input type="checkbox" value="${opt.name}" ${checked} class="board-checkbox w-4 h-4 rounded border-slate-300 text-brand-maroon"><span class="text-xs font-bold">${opt.name}</span></label>`;
            }).join('') + `<div class="border-t border-slate-200 mt-1 pt-1"><button onclick="handleAddNewMultiOption('BOARD BASIS', this)" class="w-full text-left px-2 py-1 text-[11px] font-bold text-brand-maroon hover:bg-rose-50 rounded">+ Add option</button></div>`;
            document.querySelectorAll('.board-checkbox').forEach(cb=>{ cb.addEventListener('change', updateBoardBasisSelected); });
            if(typeof updateBoardBasisSelected==='function') updateBoardBasisSelected();
            console.log(`V90 BOARD BASIS rebuilt with ${trimmed} checked`);
          }
        }
        if(fieldName==='INSURAN'){
          const list = document.getElementById('insuranList');
          if(list){
            list.innerHTML = opts.map(opt=>{
              const checked = opt.name===trimmed ? 'checked' : '';
              return `<label class="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer"><input type="checkbox" value="${opt.name}" ${checked} class="insuran-checkbox w-4 h-4 rounded border-slate-300 text-brand-maroon"><span class="text-xs font-bold">${opt.name}</span></label>`;
            }).join('') + `<div class="border-t border-slate-200 mt-1 pt-1"><button onclick="handleAddNewMultiOption('INSURAN', this)" class="w-full text-left px-2 py-1 text-[11px] font-bold text-brand-maroon hover:bg-rose-50 rounded">+ Add option</button></div>`;
            document.querySelectorAll('.insuran-checkbox').forEach(cb=>{ cb.addEventListener('change', updateInsuranSelected); });
            if(typeof updateInsuranSelected==='function') updateInsuranSelected();
            console.log(`V90 INSURAN rebuilt with ${trimmed} checked`);
          }
        }
      }catch(e){ console.warn('V90 rebuild error', e); }
      
      if(recId){
        setTimeout(()=>{ if(typeof filterAndRenderJemaahGrid==='function') filterAndRenderJemaahGrid(); }, 500);
      }
    } else {
      // Restore original if failed
      try{
        if(boardList && boardList.dataset.originalHTML) boardList.innerHTML = boardList.dataset.originalHTML;
        if(insuranList && insuranList.dataset.originalHTML) insuranList.innerHTML = insuranList.dataset.originalHTML;
      }catch{}
    }
  });
}
function renderEjenCell(recId, currentEjenIds){
  const ids = Array.isArray(currentEjenIds) ? currentEjenIds : (currentEjenIds ? [currentEjenIds] : []);
  let pillsHtml = '';
  if(ids.length>0){
    ids.forEach(eId=>{
      const e = ejenListCache.find(x=> x.id===eId);
      const name = e ? e.name : eId;
      pillsHtml += `<span class="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full mr-1 mb-1">${name} <button onclick="event.stopPropagation(); removeEjenLink('${recId}', '${eId}')" class="ml-1 text-emerald-600 hover:text-rose-600">x</button></span>`;
    });
  } else { pillsHtml = `<span class="text-slate-300 text-[10px]">-</span>`; }
  const dropdownId = `ejen-dropdown-${recId}`;
  let optsHtml = '';
  if(ejenListCache.length>0){
    ejenListCache.forEach(e=>{ const isSelected = ids.includes(e.id); optsHtml += `<label class="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 cursor-pointer text-xs ejen-option"><input type="checkbox" ${isSelected?'checked':''} onchange="toggleEjenLink('${recId}', '${e.id}', this.checked)" class="w-3.5 h-3.5 rounded border-slate-300 text-brand-maroon"> <div class="flex flex-col"><span class="font-bold">${e.name}</span><span class="text-[10px] text-slate-500">${e.status||''} ${e.noTelefon?'• '+e.noTelefon:''}</span></div></label>`; });
  } else { optsHtml = `<div class="text-[11px] text-slate-400 p-2">Memuat ejen... <i class="fa-solid fa-spinner fa-spin"></i></div>`; }
  return `<div class="relative cell-dropdown-wrapper"><div class="flex flex-wrap items-center gap-1 p-1 min-h-[28px] border border-transparent hover:border-slate-300 rounded-lg cursor-pointer" onclick="event.stopPropagation(); toggleCellDropdown('${dropdownId}')">${pillsHtml}<i class="fa-solid fa-chevron-down text-[10px] text-slate-400 ml-auto"></i></div><div id="${dropdownId}" data-cell-dropdown class="hidden absolute left-0 top-full mt-1 w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-[60] max-h-80 overflow-y-auto p-1"><div class="p-2"><input type="text" placeholder="Search ejen..." class="w-full text-xs p-1.5 border border-slate-200 rounded-lg" onkeyup="filterEjenDropdown('${recId}', this.value)" onclick="event.stopPropagation()"></div><div id="${dropdownId}-list">${optsHtml}</div></div></div>`;
}

function toggleCellDropdown(id){
  // Close Sort and Edit/Arrange dropdowns - fix double overlap image_e56e93.png
  const sortDrop = document.getElementById('sortDropdownMenu');
  const hideDrop = document.getElementById('hideFieldsDropdown');
  if(sortDrop) sortDrop.classList.add('hidden');
  if(hideDrop) hideDrop.classList.add('hidden');
  const all = document.querySelectorAll('[data-cell-dropdown]');
  all.forEach(d=>{ if(d.id!==id) d.classList.add('hidden'); });
  const target = document.getElementById(id);
  if(target) target.classList.toggle('hidden');
}

function closeAllCellDropdowns(){
  document.querySelectorAll('[data-cell-dropdown]').forEach(d=> d.classList.add('hidden'));
}

function toggleEjenLink(recId, ejenId, isChecked){
  const rec = allJemaahUmrahRecords.find(r=> r.id===recId); if(!rec) return;
  let current = rec.fields['EJEN']; let arr = Array.isArray(current) ? [...current] : (current ? [current] : []);
  if(isChecked){ if(!arr.includes(ejenId)) arr.push(ejenId); } else { arr = arr.filter(v=> v!==ejenId); }
  updateJemaahField(recId, 'EJEN', arr); rec.fields['EJEN'] = arr; filterAndRenderJemaahGrid();
}
function removeEjenLink(recId, ejenId){ toggleEjenLink(recId, ejenId, false); }
function filterEjenDropdown(recId, query){
  const dropdownId = `ejen-dropdown-${recId}`;
  const list = document.getElementById(dropdownId+'-list'); if(!list) return;
  const q = query.toLowerCase();
  const labels = list.querySelectorAll('label');
  labels.forEach(l=>{ const txt = l.textContent.toLowerCase(); if(txt.includes(q)) l.classList.remove('hidden'); else l.classList.add('hidden'); });
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

    // V89: Dim right table 50% and make not clickable when refresh clicked
    let loadingOverlay = null;
    let rightContainer = null;
    if(isManualClick){
      try{
        // Find right container (flex-1 with table)
        rightContainer = document.querySelector('.flex-1.flex.flex-col.space-y-3.min-w-0');
        if(!rightContainer){
          // Fallback: find by main grid table parent
          const gridTable = document.getElementById('mainJemaahGridTable');
          if(gridTable) rightContainer = gridTable.closest('.flex-1');
        }
        if(rightContainer){
          rightContainer.style.position = 'relative';
          loadingOverlay = document.createElement('div');
          loadingOverlay.id = 'jemaahTableLoadingOverlay';
          loadingOverlay.className = 'absolute inset-0 bg-white/60 backdrop-blur-[0.5px] flex flex-col items-center justify-center z-40 rounded-2xl';
          loadingOverlay.style.pointerEvents = 'auto';
          loadingOverlay.innerHTML = `
            <div class="bg-white border border-slate-300 shadow-lg rounded-2xl px-6 py-4 flex flex-col items-center gap-3">
              <svg class="animate-spin h-8 w-8 text-brand-maroon" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span class="text-xs font-bold text-slate-700">Memuat semula data jemaah...</span>
              <span class="text-[10px] text-slate-500">Sila tunggu sebentar</span>
            </div>
          `;
          rightContainer.appendChild(loadingOverlay);
          // Also dim the table itself
          const tableEl = document.getElementById('mainJemaahGridTable');
          if(tableEl){
            tableEl.style.opacity = '0.5';
            tableEl.style.pointerEvents = 'none';
          }
        }
      }catch(e){ console.warn('V89 overlay error', e); }
    }


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
    try{ renderJemaahHijriTabs(); renderViewsSidebar(); }catch(e){}
    fetchJemaahMetaOptions();
    fetchEjenList();

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
        // V89: Remove loading overlay and restore table
        try{
          const overlay = document.getElementById('jemaahTableLoadingOverlay');
          if(overlay) overlay.remove();
          const tableEl = document.getElementById('mainJemaahGridTable');
          if(tableEl){
            tableEl.style.opacity = '1';
            tableEl.style.pointerEvents = 'auto';
          }
          const rc = document.querySelector('.flex-1.flex.flex-col.space-y-3.min-w-0');
          if(rc && rc.contains){
            // Ensure no leftover overlay
            const leftover = rc.querySelector('#jemaahTableLoadingOverlay');
            if(leftover) leftover.remove();
          }
        }catch{}
    }
}

function getJemaahHijriForRecord(jemaahRec){
  // V46 Option B: fetch dari tripMap, jangan hardcoded
  const tripField = jemaahRec.fields['TRIP'];
  if(!tripField) return '';
  const rawId = Array.isArray(tripField) ? tripField[0] : tripField;
  if(!rawId) return '';
  // If tripField is recId
  if(rawId.startsWith && rawId.startsWith('rec') && tripMap[rawId]){
    return tripMap[rawId].hijri || '';
  }
  // If tripField is trip name
  const title = cleanTripName(rawId);
  if(tripMap[title]){
    return tripMap[title].hijri || '';
  }
  // Try lookup via title from tripMap values
  for(let k in tripMap){
    if(tripMap[k].title === title) return tripMap[k].hijri || '';
  }
  return '';
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

    renderJemaahHijriTabs();

    const baseViews = [
        { id: 'ALL', name: 'ALL', icon: 'fa-table' }
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

    let tripsToShow = rawTripRecordsList;
    if(selectedHijriFilter && selectedHijriFilter !== 'TBC'){
      tripsToShow = rawTripRecordsList.filter(rec=>{
        const hij = tripMap[rec.id]?.hijri || '';
        return hij === selectedHijriFilter;
      });
    } else if(selectedHijriFilter === 'TBC'){
      tripsToShow = [];
    }

    // V52: Grouped by bulan macam trip-umrah image_d21506.png - tapi nama trip sahaja
    function getMonthKeyLongJemaah(dateStr){
      if(!dateStr) return 'TBC';
      const d = new Date(dateStr);
      if(isNaN(d)) return 'TBC';
      const months = ['JANUARI','FEBRUARI','MAC','APRIL','MEI','JUN','JULAI','OGOS','SEPTEMBER','OKTOBER','NOVEMBER','DISEMBER'];
      return months[d.getMonth()] + ' ' + d.getFullYear();
    }
    const monthOrder = {'JANUARI':1,'FEBRUARI':2,'MAC':3,'APRIL':4,'MEI':5,'JUN':6,'JULAI':7,'OGOS':8,'SEPTEMBER':9,'OKTOBER':10,'NOVEMBER':11,'DISEMBER':12};
    function parseMonthKeyForSortJemaah(key){
      const parts = key.trim().split(' ');
      const monthName = parts[0];
      const year = parseInt(parts[1])||0;
      const mNum = monthOrder[monthName]||99;
      return year*100 + mNum;
    }

    const safeTrips = (tripsToShow||[]).filter(rec=> rec && rec.fields && typeof rec.fields === 'object');
    const groups = {};
    safeTrips.forEach(rec=>{
      const key = getMonthKeyLongJemaah(rec.fields['Mula Pakej']||'');
      if(!key || key==='TBC') return;
      if(!groups[key]) groups[key]=[];
      groups[key].push(rec);
    });

    const sortedGroupKeys = Object.keys(groups).sort((a,b)=> parseMonthKeyForSortJemaah(a)-parseMonthKeyForSortJemaah(b));

    if(sortedGroupKeys.length===0){
      safeTrips.forEach(rec => {
        const title = tripMap[rec.id] ? tripMap[rec.id].title : cleanTripName(rec.fields['Trip']);
        if (!title || title === 'TBC') return;
        const isActive = selectedTripFilter === title;
        const btn = document.createElement('button');
        btn.onclick = () => selectTripFilter(title, title);
        btn.className = `w-full text-left p-2 px-3 rounded-xl text-xs font-semibold transition flex items-center space-x-2.5 ${isActive ? 'bg-slate-100 text-slate-900 border border-slate-300/80 shadow-2xs' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`;
        btn.innerHTML = `<i class="fa-solid fa-list-check text-brand-maroon text-xs w-4"></i><span class="truncate">${title}</span>`;
        container.appendChild(btn);
      });
    } else {
      sortedGroupKeys.forEach(groupKey=>{
        const groupRecs = groups[groupKey];
        groupRecs.sort((a,b)=>{
          const da = new Date(a.fields['Mula Pakej']||0);
          const db = new Date(b.fields['Mula Pakej']||0);
          return da - db;
        });

        const header = document.createElement('div');
        header.className = 'flex items-center justify-between mt-4 mb-2 px-1 first:mt-0';
        header.innerHTML = `
          <div class="flex items-center gap-1.5">
            <span class="text-[11px]">📅</span>
            <span class="text-[11px] font-extrabold text-[#8B1E3F] tracking-wide uppercase">${groupKey}</span>
          </div>
          <span class="text-[10px] font-bold bg-[#FDF0F3] text-[#8B1E3F] border border-[#F5D0D9] px-2 py-0.5 rounded-full">${groupRecs.length} Trip</span>
        `;
        container.appendChild(header);

        groupRecs.forEach(rec=>{
          const title = tripMap[rec.id] ? tripMap[rec.id].title : cleanTripName(rec.fields['Trip']);
          if (!title || title === 'TBC') return;
          const isActive = selectedTripFilter === title;
          const btn = document.createElement('button');
          btn.onclick = () => selectTripFilter(title, title);
          btn.className = `w-full text-left p-2 px-3 rounded-xl text-xs font-semibold transition flex items-center space-x-2.5 mb-1 ${isActive ? 'bg-slate-100 text-slate-900 border border-slate-300/80 shadow-2xs' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`;
          btn.innerHTML = `<i class="fa-solid fa-list-check text-brand-maroon text-xs w-4"></i><span class="truncate">${title}</span>`;
          container.appendChild(btn);
        });
      });
    }

    if(tripsToShow.length===0 && selectedHijriFilter && selectedHijriFilter!=='TBC'){
      const empty = document.createElement('div');
      empty.className = "text-[11px] text-slate-400 text-center py-4";
      empty.textContent = `Tiada trip untuk ${selectedHijriFilter}`;
      container.appendChild(empty);
    }
    const filterLabel = document.getElementById('viewsFilterLabel');
    if(filterLabel && selectedHijriFilter){
      filterLabel.textContent = `Senarai Trip ${selectedHijriFilter}`;
    }
}

function renderJemaahHijriTabs(){
  const container = document.getElementById('jemaahHijriFilterTabs');
  if(!container) return;
  const jemaahCounts = {};
  const tripCounts = {};
  let tbcJemaah = 0;
  rawTripRecordsList.forEach(r=>{
    const hij = tripMap[r.id]?.hijri || '';
    if(!hij) return;
    tripCounts[hij] = (tripCounts[hij]||0)+1;
  });
  (allJemaahUmrahRecords||[]).forEach(j=>{
    const hij = getJemaahHijriForRecord(j);
    if(!hij){ tbcJemaah++; return; }
    jemaahCounts[hij] = (jemaahCounts[hij]||0)+1;
  });
  let existingHijri = Object.keys(tripCounts).filter(h=>tripCounts[h]>0);
  Object.keys(jemaahCounts).forEach(h=>{ if(!existingHijri.includes(h)) existingHijri.push(h); });
  const extractYear = (s)=>{ const m=s.match(/(\d{4})H/); return m?parseInt(m[1]):9999; };
  existingHijri.sort((a,b)=> extractYear(a)-extractYear(b));
  if(!selectedHijriFilter && existingHijri.length>0){
    selectedHijriFilter = existingHijri[0];
  }
  if(!selectedHijriFilter && tbcJemaah>0) selectedHijriFilter='TBC';
  let html = ``;
  existingHijri.forEach(h=>{
    const jc = jemaahCounts[h]||0;
    const tc = tripCounts[h]||0;
    const active = selectedHijriFilter===h;
    const isLoadingThis = isJemaahLoading && active;
    html += `<button onclick="setJemaahHijriFilter('${h.replace(/'/g, "\'")}')" class="px-3.5 py-2 rounded-2xl text-[11px] font-bold border transition flex flex-col items-start leading-none gap-0.5 ${active ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'} ${isLoadingThis?'opacity-70':''}"><span class="flex items-center gap-1.5">${isLoadingThis?'<i class="fa-solid fa-spinner fa-spin text-[10px]"></i>':''}${h}</span><span class="text-[9px] font-semibold opacity-70 tracking-wide">${tc} TRIP${jc>0?` (${jc})`:''}</span></button>`;
  });
  if(tbcJemaah>0 || selectedHijriFilter==='TBC'){
    const active = selectedHijriFilter==='TBC';
    const isLoadingThis = isJemaahLoading && active;
    if(tbcJemaah>0 || active){
      html += `<button onclick="setJemaahHijriFilter('TBC')" class="px-3.5 py-2 rounded-2xl text-[11px] font-bold border transition flex flex-col items-start leading-none gap-0.5 ${active ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'} ${isLoadingThis?'opacity-70':''}"><span class="flex items-center gap-1.5">${isLoadingThis?'<i class="fa-solid fa-spinner fa-spin text-[10px]"></i>':''}TBC</span><span class="text-[9px] font-semibold opacity-70 tracking-wide">${tbcJemaah>0?tbcJemaah+' jemaah':'TBC'}</span></button>`;
    }
  }
  container.innerHTML = html || `<div class="text-[10px] text-slate-400">Tiada musim</div>`;
}

function setJemaahHijriFilter(hijri){
  if(isJemaahLoading) return;
  if(selectedHijriFilter===hijri) return;
  selectedHijriFilter = hijri;
  isJemaahLoading = true;
  renderJemaahHijriTabs();
  const tbody = document.getElementById('jemaahTableBody');
  if(tbody){
    tbody.innerHTML = `<tr><td colspan="24" class="text-center py-16"><div class="inline-flex flex-col items-center gap-2 text-slate-500"><i class="fa-solid fa-spinner fa-spin text-xl text-slate-900"></i><span class="text-xs font-bold">Memuat ${hijri}...</span></div></td></tr>`;
  }
  const titleEl = document.getElementById('currentViewTitle');
  if(titleEl){
    if(hijri==='TBC') titleEl.textContent = 'TBC / TANPA TRIP';
    else titleEl.textContent = `JEMAAH MUSIM ${hijri}`;
  }
  const filterLabel = document.getElementById('viewsFilterLabel');
  if(filterLabel){
    filterLabel.textContent = `Senarai Trip ${hijri}`;
  }
  setTimeout(()=>{
    if(hijri==='TBC'){
      selectedTripFilter='TBC';
    } else {
      if(selectedTripFilter && selectedTripFilter!=='ALL' && selectedTripFilter!=='TBC'){
        const hijForTrip = tripMap[selectedTripFilter]?.hijri || '';
        if(hijForTrip!==hijri) selectedTripFilter=null;
      }
    }
    renderViewsSidebar();
    filterAndRenderJemaahGrid();
    isJemaahLoading=false;
    renderJemaahHijriTabs();
  }, 50);
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
        'col-age': `<th draggable="true" data-col="col-age" class="p-3 border-r border-slate-300 col-age draggable-header relative select-none overflow-hidden text-ellipsis bg-amber-50/50"><span class="inline-flex items-center gap-1"><i class="fa-solid fa-calculator text-[10px] text-amber-600"></i><span class="italic font-bold">ƒx</span> AGE</span><div class="col-resizer"></div></th>`,
        'col-dob': `<th draggable="true" data-col="col-dob" class="p-3 border-r border-slate-300 col-dob draggable-header relative select-none overflow-hidden text-ellipsis bg-amber-50/50"><span class="inline-flex items-center gap-1"><i class="fa-solid fa-calculator text-[10px] text-amber-600"></i><span class="italic font-bold">ƒx</span> DOB</span><div class="col-resizer"></div></th>`,
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
        'col-notes': `<th draggable="true" data-col="col-notes" class="p-3 border-r border-slate-300 col-notes draggable-header relative select-none overflow-hidden text-ellipsis">NOTES<div class="col-resizer"></div></th>`,
        'col-board': `<th draggable="true" data-col="col-board" class="p-3 border-r border-slate-300 col-board draggable-header relative select-none overflow-hidden text-ellipsis">BOARD BASIS<div class="col-resizer"></div></th>`,
        'col-train': `<th draggable="true" data-col="col-train" class="p-3 border-r border-slate-300 col-train draggable-header relative select-none overflow-hidden text-ellipsis">TRAIN<div class="col-resizer"></div></th>`,
        'col-insuran': `<th draggable="true" data-col="col-insuran" class="p-3 border-r border-slate-300 col-insuran draggable-header relative select-none overflow-hidden text-ellipsis">INSURAN<div class="col-resizer"></div></th>`,
        'col-pakej': `<th draggable="true" data-col="col-pakej" class="p-3 border-r border-slate-300 col-pakej draggable-header relative select-none overflow-hidden text-ellipsis">PAKEJ<div class="col-resizer"></div></th>`,
        'col-ejen': `<th draggable="true" data-col="col-ejen" class="p-3 col-ejen draggable-header relative select-none overflow-hidden text-ellipsis">EJEN<div class="col-resizer"></div></th>`
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

    if (!selectedTripFilter && !selectedHijriFilter) {
        if (tbody) {
            const thead0 = document.getElementById('jemaahTableHeaderRow'); if(thead0) thead0.style.display='none'; tbody.innerHTML = `
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
    // show header bila ada filter
    const theadShow = document.getElementById('jemaahTableHeaderRow'); if(theadShow) theadShow.style.display=''; const headerWrapShow = document.querySelector('#jemaahTableContainer thead'); if(headerWrapShow) headerWrapShow.style.display='';

    if(selectedHijriFilter){
      if(selectedHijriFilter === 'TBC'){
        filtered = filtered.filter(r=> !getJemaahHijriForRecord(r));
      } else {
        filtered = filtered.filter(r=> getJemaahHijriForRecord(r) === selectedHijriFilter);
      }
    }

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

    // V66 FIX: Proper sorting for AGE (muda-tua) - fixes Nur Dini issue
    function parseAgeToMonthsForSort(ageStr){
      if(!ageStr) return -1;
      const s = ageStr.toString().toLowerCase().trim();
      if(!s || s==='-' || s.toLowerCase()==='tbc') return -1;
      let years = 0, months = 0;
      const yMatch = s.match(/(\d+)\s*y/);
      const mMatch = s.match(/(\d+)\s*m/);
      if(yMatch) years = parseInt(yMatch[1])||0;
      if(mMatch) months = parseInt(mMatch[1])||0;
      if(!yMatch && !mMatch){
        const num = parseFloat(s)||0;
        if(num>0){
          years = Math.floor(num);
          months = Math.round((num - years)*12);
        }
      }
      return years*12 + months;
    }

    filtered.sort((a, b) => {
        let valA = a.fields[currentSortField] || '';
        let valB = b.fields[currentSortField] || '';
        
        if(currentSortField === 'AGE'){
          const monthsA = parseAgeToMonthsForSort(valA);
          const monthsB = parseAgeToMonthsForSort(valB);
          if(monthsA===-1 && monthsB===-1) return 0;
          if(monthsA===-1) return 1;
          if(monthsB===-1) return -1;
          if(monthsA < monthsB) return currentSortDir === 'asc' ? -1 : 1;
          if(monthsA > monthsB) return currentSortDir === 'asc' ? 1 : -1;
          return 0;
        }
        
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
        tbody.innerHTML = '<tr><td colspan="19" class="text-center py-16 text-slate-400"><div class="flex flex-col items-center gap-2"><i class="fa-solid fa-inbox text-3xl text-slate-300"></i><span class="text-sm font-bold">Tiada rekod jemaah untuk view ini.</span><span class="text-[11px] text-slate-400">Cuba pilih trip lain atau tambah jemaah baru</span></div></td></tr>';
        // FIX UI: hide header bila takde item - bagi nampak cantik
        const thead = document.getElementById('jemaahTableHeaderRow');
        if(thead) thead.style.display = 'none';
        const headerWrap = document.querySelector('#jemaahTableContainer thead');
        if(headerWrap) headerWrap.style.display = 'none';
        return;
    } else {
        const thead = document.getElementById('jemaahTableHeaderRow');
        if(thead) thead.style.display = '';
        const headerWrap = document.querySelector('#jemaahTableContainer thead');
        if(headerWrap) headerWrap.style.display = '';
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
            'col-age': `<td class="p-2.5 border-r border-slate-300 bg-white font-semibold text-slate-700 col-age" id="age-cell-${id}">${f['AGE'] || '-'}</td>`,
            'col-dob': `<td class="p-2.5 border-r border-slate-300 bg-white font-semibold text-slate-700 col-dob" id="dob-cell-${id}">${f['DOB'] ? (f['DOB'].includes('/') ? f['DOB'] : new Date(f['DOB']).toLocaleDateString('en-GB')) : '-'}</td>`,
            'col-dobf': `<td class="p-1 border-r border-slate-300 col-dobf"><input type="date" value="${f['DOB (FOREIGNER)'] || ''}" onchange="updateJemaahField('${id}', 'DOB (FOREIGNER)', this.value)" class="w-full text-xs p-1.5 rounded-lg border border-transparent hover:border-slate-300 focus:bg-white bg-transparent"></td>`,
            'col-nat': `<td class="p-1 border-r border-slate-300 col-nat">${renderSingleSelectCell(id, 'NATIONALITY', f['NATIONALITY'])}</td>`,
            'col-visa': `<td class="p-1 border-r border-slate-300 col-visa">${renderSingleSelectCell(id, 'STATUS VISA', f['STATUS VISA'])}</td>`,
            'col-passcopy': `<td class="p-2 border-r border-slate-300 text-center col-passcopy">${renderInlineUploadCell(id, 'PASSPORT COPY', passCopyFiles, 'Passport')}</td>`,
            'col-visacopy': `<td class="p-2 border-r border-slate-300 text-center col-visacopy">${renderInlineUploadCell(id, 'VISA COPY', visaCopyFiles, 'Visa')}</td>`,
            'col-mofabio': `<td class="p-2 border-r border-slate-300 text-center col-mofabio">${renderInlineUploadCell(id, 'MOFABIO', mofabioFiles, 'Mofabio')}</td>`,
            'col-fit': `<td class="p-2 border-r border-slate-300 text-center col-fit"><input type="checkbox" ${f['FIT TICKET'] ? 'checked' : ''} onchange="updateJemaahField('${id}', 'FIT TICKET', this.checked)" class="w-4 h-4 rounded text-brand-maroon focus:ring-brand-maroon"></td>`,
            'col-trip': `<td class="p-2.5 border-r border-slate-300 font-bold text-brand-maroon col-trip">${actualTripName}</td>`,
            'col-issue': `<td class="p-1 border-r border-slate-300 col-issue"><input type="date" value="${f['DATE OF ISSUE'] || ''}" onchange="updateJemaahField('${id}', 'DATE OF ISSUE', this.value)" class="w-full text-xs p-1.5 rounded-lg border border-transparent hover:border-slate-300 focus:bg-white bg-transparent"></td>`,
            'col-expire': `<td class="p-1 border-r border-slate-300 col-expire"><input type="date" value="${f['DATE OF EXPIRE'] || ''}" onchange="updateJemaahField('${id}', 'DATE OF EXPIRE', this.value)" class="w-full text-xs p-1.5 rounded-lg border border-transparent hover:border-slate-300 focus:bg-white bg-transparent"></td>`,
            'col-notes': `<td class="p-1 border-r border-slate-300 col-notes"><input type="text" value="${f['Notes'] || ''}" onchange="updateJemaahField('${id}', 'Notes', this.value)" class="w-full text-xs p-1.5 rounded-lg border border-transparent hover:border-slate-300 focus:bg-white bg-transparent"></td>`,
            'col-board': `<td class="p-1 border-r border-slate-300 col-board">${renderMultiSelectCell(id, 'BOARD BASIS', f['BOARD BASIS'])}</td>`,
            'col-train': `<td class="p-2 border-r border-slate-300 text-center col-train"><input type="checkbox" ${f['TRAIN'] ? 'checked' : ''} onchange="updateJemaahField('${id}', 'TRAIN', this.checked)" class="w-4 h-4 rounded text-brand-maroon focus:ring-brand-maroon"></td>`,
            'col-insuran': `<td class="p-1 border-r border-slate-300 col-insuran">${renderMultiSelectCell(id, 'INSURAN', f['INSURAN'])}</td>`,
            'col-pakej': `<td class="p-1 border-r border-slate-300 col-pakej">${renderSingleSelectCell(id, 'PAKEJ', f['PAKEJ'])}</td>`,
            'col-ejen': `<td class="p-1 col-ejen">${renderEjenCell(id, f['EJEN'])}</td>`
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
            const fileId = fileObj.id || '';
            const safeFileName = fileName.replace(/'/g, "\\'");
            const isPdf = fileUrl && (fileUrl.toLowerCase().includes('.pdf') || fileName.toLowerCase().includes('.pdf'));

            return `
                <div class="flex items-center space-x-1 my-0.5">
                    ${isPdf ? `
                        <button onclick="openPreviewModal('${fileUrl}', '${safeFileName}', {recordId:'${recId}', fieldName:'${fieldName}', attachmentId:'${fileId}', filename:'${safeFileName}'})" class="bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold px-1.5 py-0.5 rounded text-[10px] border border-rose-200 truncate max-w-[70px]" title="${fileName}">PDF</button>
                    ` : `
                        <img src="${fileUrl}" onclick="openPreviewModal('${fileUrl}', '${safeFileName}', {recordId:'${recId}', fieldName:'${fieldName}', attachmentId:'${fileId}', filename:'${safeFileName}'})" class="w-6 h-6 rounded object-cover border border-slate-300 cursor-pointer hover:scale-110 transition" title="${fileName}">
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

    // Ensure selectOptions are loaded, if not, try fetch
    if(typeof selectOptions === 'undefined' || !selectOptions){
        window.selectOptions = {hijri:[], group:[], sektor:[], penerbangan:[], musim:[], tempoh:[]};
    }

    const buildOptions = (arr, placeholder) => {
        const opts = (arr||[]).filter(Boolean).sort();
        let html = `<option value="">${placeholder}</option>`;
        opts.forEach(o=>{
            const safe = (o||'').toString().replace(/"/g,'&quot;');
            html += `<option value="${safe}">${safe}</option>`;
        });
        return html;
    };

    container.innerHTML = `
        <form id="addTripModalForm" class="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label class="block text-[11px] font-extrabold text-slate-700 mb-1 tracking-wider">Group (If relevant)</label>
                    <select name="Group (if relevant)" class="w-full p-3 font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-maroon focus:outline-none bg-slate-50 text-[13px]">
                        ${buildOptions(selectOptions.group, '-- Pilih Group --')}
                    </select>
                </div>
                <div>
                    <label class="block text-[11px] font-extrabold text-slate-700 mb-1 tracking-wider">Sektor</label>
                    <select name="Sektor" class="w-full p-3 font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-maroon focus:outline-none bg-slate-50 text-[13px]">
                        ${buildOptions(selectOptions.sektor, '-- Pilih Sektor --')}
                    </select>
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label class="block text-[11px] font-extrabold text-slate-700 mb-1 tracking-wider">MULA PAKEJ *</label>
                    <input type="date" id="addMulaPakej" name="Mula Pakej" required class="w-full p-3 font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-maroon focus:outline-none bg-slate-50 text-[13px]">
                </div>
                <div>
                    <label class="block text-[11px] font-extrabold text-slate-700 mb-1 tracking-wider">TAMAT PAKEJ *</label>
                    <input type="date" id="addTamatPakej" name="Tamat Pakej" required class="w-full p-3 font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-maroon focus:outline-none bg-slate-50 text-[13px]">
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label class="block text-[11px] font-extrabold text-slate-700 mb-1 tracking-wider">Penerbangan</label>
                    <select name="Penerbangan" class="w-full p-3 font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-maroon focus:outline-none bg-slate-50 text-[13px]">
                        ${buildOptions(selectOptions.penerbangan, '-- Pilih Penerbangan --')}
                    </select>
                </div>
                <div>
                    <label class="block text-[11px] font-extrabold text-slate-700 mb-1 tracking-wider">Musim</label>
                    <select name="Musim" class="w-full p-3 font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-maroon focus:outline-none bg-slate-50 text-[13px]">
                        ${buildOptions(selectOptions.musim, '-- Pilih Musim --')}
                    </select>
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label class="block text-[11px] font-extrabold text-slate-700 mb-1 tracking-wider">Hijri Season</label>
                    <select name="Hijri Season" class="w-full p-3 font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-maroon focus:outline-none bg-slate-50 text-[13px]">
                        ${buildOptions(selectOptions.hijri, '-- Pilih Hijri Season --')}
                    </select>
                </div>
                <div>
                    <label class="block text-[11px] font-extrabold text-slate-700 mb-1 tracking-wider">Tempoh Pakej</label>
                    <select name="Tempoh Pakej" class="w-full p-3 font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-maroon focus:outline-none bg-slate-50 text-[13px]">
                        ${buildOptions(selectOptions.tempoh, '-- Pilih Tempoh --')}
                    </select>
                </div>
            </div>

            <div>
                <label class="block text-[11px] font-extrabold text-slate-700 mb-1 tracking-wider">Total Seat</label>
                <input type="number" name="Total Seat" min="0" placeholder="Contoh: 40" class="w-full p-3 font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-maroon focus:outline-none bg-slate-50 text-[13px]">
            </div>

            
        </form>
    `;

    if (modal) modal.classList.remove('hidden');

    // V118: Date validation - Tamat tidak boleh sebelum Mula
    setTimeout(()=>{
        const mulaEl = document.getElementById('addMulaPakej');
        const tamatEl = document.getElementById('addTamatPakej');
        if(mulaEl && tamatEl){
            mulaEl.addEventListener('change', ()=>{
                if(mulaEl.value){
                    tamatEl.min = mulaEl.value;
                    if(tamatEl.value && tamatEl.value < mulaEl.value){
                        tamatEl.value = '';
                        alert('Tarikh tamat tidak boleh sebelum tarikh mula.');
                    }
                }
            });
            tamatEl.addEventListener('change', ()=>{
                if(mulaEl.value && tamatEl.value && tamatEl.value < mulaEl.value){
                    alert('Tarikh tamat tidak boleh sebelum tarikh mula. Sila pilih tarikh selepas atau sama dengan tarikh mula.');
                    tamatEl.value = '';
                }
            });
        }
    }, 100);
}

async function createNewTripFromModal() {
    const form = document.getElementById('addTripModalForm');
    if (!form) return;

    const formData = new FormData(form);
    const mulaPakej = formData.get('Mula Pakej');
    const tamatPakej = formData.get('Tamat Pakej');
    const groupVal = formData.get('Group (if relevant)');
    const sektorVal = formData.get('Sektor');
    const penerbanganVal = formData.get('Penerbangan');
    const musimVal = formData.get('Musim');
    const hijriVal = formData.get('Hijri Season');
    const tempohVal = formData.get('Tempoh Pakej');
    const totalSeatVal = formData.get('Total Seat');

    if (!mulaPakej || !tamatPakej) {
        alert("Sila masukkan Tarikh Mula dan Tarikh Tamat Pakej!");
        return;
    }

    if (tamatPakej < mulaPakej) {
        alert("Tarikh tamat tidak boleh sebelum tarikh mula. Sila betulkan tarikh.");
        return;
    }

    let payloadFields = {
        "Mula Pakej": mulaPakej,
        "Tamat Pakej": tamatPakej
    };

    // Only add if has value - exclude formula fields
    if(groupVal && groupVal.trim()!=='') payloadFields["Group (if relevant)"] = groupVal.trim();
    if(sektorVal && sektorVal.trim()!=='') payloadFields["Sektor"] = sektorVal.trim();
    if(penerbanganVal && penerbanganVal.trim()!=='') payloadFields["Penerbangan"] = penerbanganVal.trim();
    if(musimVal && musimVal.trim()!=='') payloadFields["Musim"] = musimVal.trim();
    if(hijriVal && hijriVal.trim()!=='') payloadFields["Hijri Season"] = hijriVal.trim();
    if(tempohVal && tempohVal.trim()!=='') payloadFields["Tempoh Pakej"] = tempohVal.trim();
    if(totalSeatVal && totalSeatVal.toString().trim()!==''){
        const num = parseInt(totalSeatVal);
        if(!isNaN(num) && num>=0) payloadFields["Total Seat"] = num;
    }

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
            body: JSON.stringify({ fields: payloadFields, typecast: true })
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Trip created', data);
            // Refresh data
            if(typeof fetchTripMapping === 'function') await fetchTripMapping();
            if(typeof fetchTripUmrahData === 'function') await fetchTripUmrahData(true);
            if(typeof renderViewsSidebar === 'function') renderViewsSidebar();
            closeExpandModal();
            alert('Pakej / Trip Umrah telah berjaya ditambahkan.');
        } else {
            const errData = await response.json();
            console.error('Create trip failed', errData);
            let msg = errData.error?.message || 'Gagal menambah trip baharu.';
            alert(`Gagal menambah trip baharu: ${msg}`);
        }
    } catch (e) {
        console.error("Error creating trip:", e);
        alert(`Ralat semasa menambah trip: ${e.message}`);
    } finally {
        if (saveBtn) saveBtn.innerHTML = 'Simpan Trip';
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

function closeExpandModal(){
    const modal = document.getElementById('expandRecordModal');
    if(modal){
        modal.classList.add('hidden');
        modal.style.display='none';
    }
    // clear addModalFiles
    try{ addModalFiles = { 'PICTURE': [], 'PASSPORT_COPY': [], 'VISA_COPY': [], 'MOFABIO': [], 'INSURAN_DOC': [] }; }catch(e){}
    // also reset form container
    const container = document.getElementById('expandModalFormContainer');
    if(container) container.innerHTML = '';
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

    addModalFiles = { 'PICTURE': [], 'PASSPORT_COPY': [], 'VISA_COPY': [], 'MOFABIO': [], 'INSURAN_DOC': [] };
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

    function buildSelectWithAddNew(fieldName, placeholder, isMulti=false){
        const options = jemaahFieldOptions[fieldName] || [];
        let html = '';
        if(!isMulti){
            html += `<option value="">${placeholder}</option>`;
            if(options.length>0){
                // Filter blank
                const filtered = options.filter(o=> o.name && o.name.trim()!=='');
                filtered.forEach(opt=>{
                    html += `<option value="${opt.name}">${opt.name}</option>`;
                });
            } else {
                if(fieldName==='GENDER'){
                    html += '<option value="MALE">MALE</option><option value="FEMALE">FEMALE</option>';
                }
            }
            // V89: No + Add new option for GENDER
            if(fieldName!=='GENDER'){
                html += `<option value="__ADD_NEW__" style="font-weight:bold;color:#800020;">+ Add new option</option>`;
            }
        } else {
            if(options.length>0){
                const filtered = options.filter(o=> o.name && o.name.trim()!=='');
                filtered.forEach(opt=>{
                    html += `<option value="${opt.name}">${opt.name}</option>`;
                });
            }
        }
        return html;
    }

    // Build ejen multi-select options with checkboxes
    const ejenMultiHtml = (()=> {
        let html = '';
        if(ejenListCache && ejenListCache.length>0){
            ejenListCache.forEach(e=>{
                html += `<label class="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer"><input type="checkbox" value="${e.id}" class="ejen-checkbox w-4 h-4 rounded border-slate-300 text-brand-maroon focus:ring-brand-maroon"><span class="text-xs font-bold text-slate-700">${e.name}</span><span class="text-[10px] text-slate-400 ml-auto">${e.status||'AKTIF'}</span></label>`;
            });
        } else {
            html = '<div class="p-3 text-xs text-slate-400">Tiada data ejen. Sila refresh.</div>';
        }
        return html;
    
// Hook setup after openAddJemaahModal original
(function(){
    const _origOpenAdd = window.openAddJemaahModal;
    if(_origOpenAdd){
        const original = _origOpenAdd;
        window.openAddJemaahModal = function(){
            original.apply(this, arguments);
            setTimeout(()=>{
                const modal = document.getElementById('expandRecordModal');
                if(modal){
                    modal.classList.remove('hidden');
                    modal.style.display='flex';
                }
                setupAddModalFilePickers();
            }, 100);
        };
    } else {
        // if not yet defined, patch via event
        document.addEventListener('DOMContentLoaded', ()=>{
            const orig = window.openAddJemaahModal;
            if(orig){
                window.openAddJemaahModal = function(){
                    orig.apply(this, arguments);
                    setTimeout(()=>{
                        const modal = document.getElementById('expandRecordModal');
                        if(modal){
                            modal.classList.remove('hidden');
                            modal.style.display='flex';
                        }
                        setupAddModalFilePickers();
                    }, 100);
                };
            }
        });
    }
})();

})();

    // V91: Board Basis multi - filter blank + Add option
    const boardBasisOptions = (jemaahFieldOptions['BOARD BASIS'] || []).filter(o=> o.name && o.name.trim()!=='');
    let boardBasisMultiHtml = '';
    if(boardBasisOptions.length>0){
      boardBasisMultiHtml = boardBasisOptions.map(opt=>`<label class="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer"><input type="checkbox" value="${opt.name}" class="board-checkbox w-4 h-4 rounded border-slate-300 text-brand-maroon"><span class="text-xs font-bold">${opt.name}</span></label>`).join('');
    } else {
      boardBasisMultiHtml = '<div class="p-3 text-xs text-slate-400">Tiada pilihan. Tambah baru.</div>';
    }
    boardBasisMultiHtml += `<div class="border-t border-slate-200 mt-1"><button type="button" onclick="handleAddNewMultiOption('BOARD BASIS', this)" class="w-full text-left px-3 py-2 text-[11px] font-bold text-brand-maroon hover:bg-rose-50">+ Add option</button></div>`;

    // V91: Insuran multi - filter blank + Add option
    const insuranOptions = (jemaahFieldOptions['INSURAN'] || []).filter(o=> o.name && o.name.trim()!=='');
    let insuranMultiHtml = '';
    if(insuranOptions.length>0){
      insuranMultiHtml = insuranOptions.map(opt=>`<label class="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer"><input type="checkbox" value="${opt.name}" class="insuran-checkbox w-4 h-4 rounded border-slate-300 text-brand-maroon"><span class="text-xs font-bold">${opt.name}</span></label>`).join('');
    } else {
      insuranMultiHtml = '<div class="p-3 text-xs text-slate-400">Tiada pilihan. Tambah baru.</div>';
    }
    insuranMultiHtml += `<div class="border-t border-slate-200 mt-1"><button type="button" onclick="handleAddNewMultiOption('INSURAN', this)" class="w-full text-left px-3 py-2 text-[11px] font-bold text-brand-maroon hover:bg-rose-50">+ Add option</button></div>`;

    container.innerHTML = `
        <form id="addModalForm" class="space-y-3 max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin">
            
            <div class="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <h4 class="font-bold text-[11px] text-slate-600 uppercase tracking-wider mb-3 flex items-center"><i class="fa-solid fa-user mr-1.5"></i> Maklumat Peribadi</h4>
                <div class="grid grid-cols-1 sm:grid-cols-3 items-center gap-2 mb-3">
                    <label class="font-bold text-slate-500 uppercase text-[11px]">NAME *</label>
                    <div class="sm:col-span-2">
                        <input type="text" name="NAME" required placeholder="CONTOH: AHMAD BIN ABDULLAH" class="w-full p-2.5 font-bold text-sm text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-maroon focus:outline-none uppercase">
                    </div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-3 items-center gap-2 mb-3">
                    <label class="font-bold text-slate-500 uppercase text-[11px]">IC NO.</label>
                    <div class="sm:col-span-2">
                        <input type="text" name="IC NO." placeholder="900101015555" class="w-full p-2.5 font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-maroon focus:outline-none">
                    </div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-3 items-center gap-2 mb-3">
                    <label class="font-bold text-slate-500 uppercase text-[11px]">GENDER</label>
                    <div class="sm:col-span-2">
                        <select name="GENDER" data-field="GENDER" onchange="if(this.value==='__ADD_NEW__'){ handleAddNewOption('GENDER', this); }" class="w-full p-2.5 font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-maroon focus:outline-none">
                            ${buildSelectWithAddNew('GENDER', '-- Pilih Jantina --')}
                        </select>
                    </div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-3 items-center gap-2 mb-3">
                    <label class="font-bold text-slate-500 uppercase text-[11px]">DOB (FOREIGNER)</label>
                    <div class="sm:col-span-2">
                        <input type="date" name="DOB (FOREIGNER)" class="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-maroon focus:outline-none">
                        <p class="text-[10px] text-slate-400 mt-1">Untuk jemaah warga asing sahaja</p>
                    </div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
                    <label class="font-bold text-slate-500 uppercase text-[11px]">NATIONALITY</label>
                    <div class="sm:col-span-2">
                        <select name="NATIONALITY" data-field="NATIONALITY" onchange="if(this.value==='__ADD_NEW__'){ handleAddNewOption('NATIONALITY', this); }" class="w-full p-2.5 font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-maroon focus:outline-none">
                            ${buildSelectWithAddNew('NATIONALITY', '-- Pilih Warganegara --')}
                        </select>
                    </div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-3 items-start gap-2 mt-3">
                    <label class="font-bold text-slate-500 uppercase text-[11px] mt-2"><i class="fa-solid fa-image mr-1"></i> PICTURE</label>
                    <div class="sm:col-span-2">
                        <div id="addModalDropzone-PICTURE" class="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center bg-slate-50 hover:bg-white hover:border-brand-maroon transition cursor-pointer group">
                            <input type="file" id="addModalFileInput-PICTURE" accept="image/*,.pdf,application/pdf" class="hidden" multiple>
                            <div class="flex flex-col items-center gap-2">
                                <i class="fa-solid fa-cloud-arrow-up text-2xl text-slate-400 group-hover:text-brand-maroon"></i>
                                <span class="text-[11px] font-bold text-slate-600">Drag & drop gambar/PDF atau klik untuk pilih</span>
                                <span class="text-[10px] text-slate-400">JPG, PNG, PDF max 10MB</span>
                            </div>
                            <div id="addModalPreview-PICTURE" class="mt-3 flex flex-wrap gap-2 justify-center"></div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="bg-sky-50/50 rounded-xl p-3 border border-sky-100">
                <h4 class="font-bold text-[11px] text-sky-700 uppercase tracking-wider mb-3 flex items-center"><i class="fa-solid fa-passport mr-1.5"></i> Dokumen Perjalanan</h4>
                <div class="grid grid-cols-1 sm:grid-cols-3 items-center gap-2 mb-3">
                    <label class="font-bold text-slate-500 uppercase text-[11px]">PASSPORT NO.</label>
                    <div class="sm:col-span-2">
                        <input type="text" name="PASSPORT NO." placeholder="A12345678" class="w-full p-2.5 font-mono font-bold uppercase border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-maroon focus:outline-none">
                    </div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-3 items-start gap-2 mb-3">
                    <label class="font-bold text-slate-500 uppercase text-[11px] mt-2"><i class="fa-solid fa-file-image mr-1"></i> PASSPORT COPY</label>
                    <div class="sm:col-span-2">
                        <div id="addModalDropzone-PASSPORT_COPY" class="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center bg-slate-50 hover:bg-white hover:border-brand-maroon transition cursor-pointer group">
                            <input type="file" id="addModalFileInput-PASSPORT_COPY" accept="image/*,.pdf" class="hidden" multiple>
                            <div class="flex flex-col items-center gap-2">
                                <i class="fa-solid fa-cloud-arrow-up text-2xl text-slate-400 group-hover:text-brand-maroon"></i>
                                <span class="text-[11px] font-bold text-slate-600">Drag & drop passport copy atau klik</span>
                                <span class="text-[10px] text-slate-400">JPG, PNG, PDF max 10MB</span>
                            </div>
                            <div id="addModalPreview-PASSPORT_COPY" class="mt-3 flex flex-wrap gap-2 justify-center"></div>
                        </div>
                    </div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                    <div>
                        <label class="font-bold text-slate-500 uppercase text-[11px] block mb-1">DATE OF ISSUE</label>
                        <input type="date" name="DATE OF ISSUE" class="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-maroon focus:outline-none">
                    </div>
                    <div>
                        <label class="font-bold text-slate-500 uppercase text-[11px] block mb-1">DATE OF EXPIRE</label>
                        <input type="date" name="DATE OF EXPIRE" class="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-maroon focus:outline-none">
                    </div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-3 items-center gap-2 mb-3">
                    <label class="font-bold text-slate-500 uppercase text-[11px]">STATUS VISA</label>
                    <div class="sm:col-span-2">
                        <select name="STATUS VISA" data-field="STATUS VISA" onchange="if(this.value==='__ADD_NEW__'){ handleAddNewOption('STATUS VISA', this); }" class="w-full p-2.5 font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-maroon focus:outline-none">
                            ${buildSelectWithAddNew('STATUS VISA', '-- Pilih Status Visa --')}
                        </select>
                    </div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
                    <label class="font-bold text-slate-500 uppercase text-[11px]">FIT TICKET</label>
                    <div class="sm:col-span-2">
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" name="FIT TICKET" class="w-4 h-4 rounded border-slate-300 text-brand-maroon focus:ring-brand-maroon">
                            <span class="text-xs font-bold text-slate-600">Tiket FIT</span>
                        </label>
                    </div>
                </div>
            </div>

            <div class="bg-amber-50/50 rounded-xl p-3 border border-amber-100">
                <h4 class="font-bold text-[11px] text-amber-700 uppercase tracking-wider mb-3 flex items-center"><i class="fa-solid fa-kaaba mr-1.5"></i> Maklumat Trip & Pakej</h4>
                <div class="grid grid-cols-1 sm:grid-cols-3 items-center gap-2 mb-3">
                    <label class="font-bold text-slate-500 uppercase text-[11px]">TRIP</label>
                    <div class="sm:col-span-2">
                        <select name="TRIP" class="w-full p-2.5 font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-maroon focus:outline-none">
                            <option value="">-- TBC / Tanpa Trip --</option>
                            ${tripOptionsHtml}
                        </select>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 sm:grid-cols-3 items-start gap-2 mb-3">
                    <label class="font-bold text-slate-500 uppercase text-[11px] pt-2">BOARD BASIS</label>
                    <div class="sm:col-span-2">
                        <div class="relative">
                            <button type="button" onclick="toggleModalMultiDropdown('boardBasisDropdown')" class="w-full p-2.5 font-bold border border-slate-300 rounded-xl bg-white text-left flex items-center justify-between hover:bg-slate-50">
                                <span id="boardBasisLabel" class="text-xs text-slate-500">-- Pilih Board Basis --</span>
                                <i class="fa-solid fa-chevron-down text-[10px] text-slate-400"></i>
                            </button>
                            <div id="boardBasisDropdown" class="hidden absolute left-0 right-0 mt-1 bg-white border border-slate-300 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                                <div id="boardBasisList">
                                    ${boardBasisMultiHtml}
                                </div>
                                <div class="p-2 border-t border-slate-100">
                                    <button type="button" onclick="handleAddNewOption('BOARD BASIS', null, 'boardBasisDropdown')" class="text-[11px] font-bold text-brand-maroon hover:text-rose-900">+ Add option</button>
                                </div>
                            </div>
                        </div>
                        <div id="boardBasisSelected" class="flex flex-wrap gap-1 mt-2"></div>
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 items-center gap-2 mb-3">
                    <label class="font-bold text-slate-500 uppercase text-[11px]">PAKEJ</label>
                    <div class="sm:col-span-2">
                        <select name="PAKEJ" data-field="PAKEJ" onchange="if(this.value==='__ADD_NEW__'){ handleAddNewOption('PAKEJ', this); }" class="w-full p-2.5 font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-maroon focus:outline-none">
                            ${buildSelectWithAddNew('PAKEJ', '-- Pilih Pakej --')}
                        </select>
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 items-start gap-2 mb-3">
                    <label class="font-bold text-slate-500 uppercase text-[11px] pt-2">INSURAN</label>
                    <div class="sm:col-span-2">
                        <div class="relative">
                            <button type="button" onclick="toggleModalMultiDropdown('insuranDropdown')" class="w-full p-2.5 font-bold border border-slate-300 rounded-xl bg-white text-left flex items-center justify-between hover:bg-slate-50">
                                <span id="insuranLabel" class="text-xs text-slate-500">-- Pilih Insuran --</span>
                                <i class="fa-solid fa-chevron-down text-[10px] text-slate-400"></i>
                            </button>
                            <div id="insuranDropdown" class="hidden absolute left-0 right-0 mt-1 bg-white border border-slate-300 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                                <div id="insuranList">
                                    ${insuranMultiHtml}
                                </div>
                            </div>
                        </div>
                        <div id="insuranSelected" class="flex flex-wrap gap-1 mt-2"></div>
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                    <div>
                        <label class="font-bold text-slate-500 uppercase text-[11px] block mb-1">TRAIN</label>
                        <label class="flex items-center gap-2 cursor-pointer border border-slate-300 rounded-xl p-2.5 bg-white hover:bg-slate-50">
                            <input type="checkbox" name="TRAIN" class="w-4 h-4 rounded border-slate-300 text-brand-maroon focus:ring-brand-maroon">
                            <span class="text-xs font-bold">Speed Train</span>
                        </label>
                    </div>
                    <div class="sm:col-span-1">
                        <label class="font-bold text-slate-500 uppercase text-[11px] block mb-1">EJEN</label>
                        <div class="relative">
                            <button type="button" onclick="toggleModalMultiDropdown('ejenDropdown')" class="w-full p-2.5 font-bold border border-slate-300 rounded-xl bg-white text-left flex items-center justify-between hover:bg-slate-50">
                                <span id="ejenLabel" class="text-xs text-slate-500">-- Pilih Ejen --</span>
                                <i class="fa-solid fa-chevron-down text-[10px] text-slate-400"></i>
                            </button>
                            <div id="ejenDropdown" class="hidden absolute left-0 right-0 mt-1 bg-white border border-slate-300 rounded-xl shadow-lg z-50 max-h-64 overflow-hidden flex flex-col">
                                <div class="p-2 border-b border-slate-100">
                                    <div class="relative">
                                        <i class="fa-solid fa-magnifying-glass absolute left-2.5 top-2.5 text-slate-400 text-[10px]"></i>
                                        <input type="text" id="ejenSearchModal" onkeyup="filterEjenModal(this.value)" placeholder="Search ejen..." class="w-full text-xs pl-7 pr-3 py-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-none">
                                    </div>
                                </div>
                                <div id="ejenListModal" class="overflow-y-auto flex-1">
                                    ${ejenMultiHtml}
                                </div>
                            </div>
                        </div>
                        <div id="ejenSelected" class="flex flex-wrap gap-1 mt-2"></div>
                    </div>
                </div>
            </div>

            <div class="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div class="grid grid-cols-1 sm:grid-cols-3 items-start gap-2">
                    <label class="font-bold text-slate-500 uppercase text-[11px]">NOTES</label>
                    <div class="sm:col-span-2">
                        <textarea name="NOTES" rows="3" placeholder="Catatan tambahan..." class="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-maroon focus:outline-none text-sm"></textarea>
                    </div>
                </div>
            </div>

        </form>
    `;

    if (modal) modal.classList.remove('hidden');

    // Attach listeners for multi-select checkboxes
    setTimeout(()=>{
        document.querySelectorAll('.board-checkbox').forEach(cb=>{
            cb.addEventListener('change', updateBoardBasisSelected);
        });
        document.querySelectorAll('.insuran-checkbox').forEach(cb=>{
            cb.addEventListener('change', updateInsuranSelected);
        });
        document.querySelectorAll('.ejen-checkbox').forEach(cb=>{
            cb.addEventListener('change', updateEjenSelected);
        });
    }, 100);
}

// Helper functions for modal multi-dropdowns
function toggleModalMultiDropdown(dropdownId){
    const dd = document.getElementById(dropdownId);
    if(!dd) return;
    // Close other dropdowns
    ['boardBasisDropdown','insuranDropdown','ejenDropdown'].forEach(id=>{
        if(id!==dropdownId){
            const other = document.getElementById(id);
            if(other) other.classList.add('hidden');
        }
    });
    dd.classList.toggle('hidden');
}

function updateBoardBasisSelected(){
    const checked = Array.from(document.querySelectorAll('.board-checkbox:checked')).map(cb=>cb.value);
    const label = document.getElementById('boardBasisLabel');
    const container = document.getElementById('boardBasisSelected');
    if(label){
        label.textContent = checked.length>0 ? checked.join(', ') : '-- Pilih Board Basis --';
        label.className = checked.length>0 ? 'text-xs font-bold text-slate-900' : 'text-xs text-slate-500';
    }
    if(container){
        container.innerHTML = checked.map(v=>`<span class="inline-flex items-center gap-1 bg-sky-100 text-sky-700 text-[10px] font-bold px-2 py-1 rounded-full">${v} <button type="button" onclick="uncheckBoardBasis('${v}')" class="ml-1 hover:text-sky-900">x</button></span>`).join('');
    }
}

function uncheckBoardBasis(val){
    document.querySelectorAll('.board-checkbox').forEach(cb=>{ if(cb.value===val) cb.checked=false; });
    updateBoardBasisSelected();
}

function updateInsuranSelected(){
    const checked = Array.from(document.querySelectorAll('.insuran-checkbox:checked')).map(cb=>cb.value);
    const label = document.getElementById('insuranLabel');
    const container = document.getElementById('insuranSelected');
    if(label){
        label.textContent = checked.length>0 ? checked.join(', ') : '-- Pilih Insuran --';
        label.className = checked.length>0 ? 'text-xs font-bold text-slate-900' : 'text-xs text-slate-500';
    }
    if(container){
        container.innerHTML = checked.map(v=>`<span class="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded-full">${v} <button type="button" onclick="uncheckInsuran('${v}')" class="ml-1 hover:text-emerald-900">x</button></span>`).join('');
    }
}

function uncheckInsuran(val){
    document.querySelectorAll('.insuran-checkbox').forEach(cb=>{ if(cb.value===val) cb.checked=false; });
    updateInsuranSelected();
}

function updateEjenSelected(){
    const checked = Array.from(document.querySelectorAll('.ejen-checkbox:checked'));
    const label = document.getElementById('ejenLabel');
    const container = document.getElementById('ejenSelected');
    const names = checked.map(cb=>{
        const labelEl = cb.parentElement.querySelector('span.font-bold');
        return labelEl ? labelEl.textContent : cb.value;
    });
    if(label){
        label.textContent = names.length>0 ? names.join(', ') : '-- Pilih Ejen --';
        label.className = names.length>0 ? 'text-xs font-bold text-slate-900 truncate' : 'text-xs text-slate-500';
    }
    if(container){
        container.innerHTML = checked.map(cb=>{
            const labelEl = cb.parentElement.querySelector('span.font-bold');
            const name = labelEl ? labelEl.textContent : cb.value;
            return `<span class="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-full">${name} <button type="button" onclick="uncheckEjen('${cb.value}')" class="ml-1 hover:text-amber-900">x</button></span>`;
        }).join('');
    }
}

function uncheckEjen(val){
    document.querySelectorAll('.ejen-checkbox').forEach(cb=>{ if(cb.value===val) cb.checked=false; });
    updateEjenSelected();
}

function filterEjenModal(query){
    const q = query.toLowerCase();
    document.querySelectorAll('#ejenListModal label').forEach(lbl=>{
        const text = lbl.textContent.toLowerCase();
        if(text.includes(q)) lbl.classList.remove('hidden');
        else lbl.classList.add('hidden');
    });
}

async function createNewJemaahFromModal(){
    const form = document.getElementById('addModalForm');
    if(!form){ alert('Form tidak ditemui'); return; }
    const formData = new FormData(form);
    const fields = {};
    for(let [k,v] of formData.entries()){
        if(k==='TRAIN' || k==='FIT TICKET') continue;
        if(k==='BOARD BASIS' || k==='INSURAN') continue;
        if(v && String(v).trim()!==''){
            if(k==='NAME') v = String(v).toUpperCase().trim();
            if(k==='PASSPORT NO.') v = String(v).toUpperCase().trim();
            fields[k] = v;
        }
    }
    const trainChk = form.querySelector('input[name="TRAIN"]');
    if(trainChk) fields['TRAIN'] = trainChk.checked ? true : false;
    const fitChk = form.querySelector('input[name="FIT TICKET"]');
    if(fitChk) fields['FIT TICKET'] = fitChk.checked ? true : false;
    const boardChecked = Array.from(form.querySelectorAll('.board-checkbox:checked')).map(cb=>cb.value);
    if(boardChecked.length>0) fields['BOARD BASIS'] = boardChecked;
    const insuranChecked = Array.from(form.querySelectorAll('.insuran-checkbox:checked')).map(cb=>cb.value);
    if(insuranChecked.length>0) fields['INSURAN'] = insuranChecked;
    const ejenChecked = Array.from(form.querySelectorAll('.ejen-checkbox:checked')).map(cb=>cb.value);
    if(ejenChecked.length>0) fields['EJEN'] = ejenChecked;
    const tripSel = form.querySelector('select[name="TRIP"]');
    if(tripSel && tripSel.value){ fields['TRIP'] = [tripSel.value]; }
    if(!fields['NAME']){ alert('NAME wajib isi'); return; }
    
    // === OPTIMISTIC: close modal instantly, no loading ===
    const tempId = 'temp_' + Date.now();
    const localPreviewUrls = {};
    for(let localKey in addModalFiles){
        const files = addModalFiles[localKey];
        if(!files || files.length===0) continue;
        localPreviewUrls[localKey] = files.map(f=>{
            try{ return { url: URL.createObjectURL(f), filename: f.name }; }catch(e){ return null; }
        }).filter(Boolean);
    }
    const tempFields = { ...fields };
    if(localPreviewUrls['PICTURE']) tempFields['PICTURE'] = localPreviewUrls['PICTURE'];
    if(localPreviewUrls['PASSPORT_COPY']) tempFields['PASSPORT COPY'] = localPreviewUrls['PASSPORT_COPY'];
    if(localPreviewUrls['VISA_COPY']) tempFields['VISA COPY'] = localPreviewUrls['VISA_COPY'];
    if(localPreviewUrls['MOFABIO']) tempFields['MOFABIO'] = localPreviewUrls['MOFABIO'];
    tempFields['AGE'] = '...'; // formula placeholder, akan calculate Airtable nanti
    tempFields['_optimistic'] = true;
    
    const tempRecord = { id: tempId, fields: tempFields };
    allJemaahUmrahRecords.unshift(tempRecord);
    try{ localStorage.setItem('effah_jemaah_optimistic', JSON.stringify(allJemaahUmrahRecords.slice(0,50))); }catch(e){}
    if(typeof filterAndRenderJemaahGrid==='function') filterAndRenderJemaahGrid();
    closeExpandModal();
    if(typeof App!=='undefined' && App.toast) App.toast('Jemaah ditambah - sync background...');
    
    // Background upload
    (async()=>{
        try{
            const cloudName = "dfb839ep";
            const uploadPreset = "Effah Travel";
            const uploadFieldMap = { 'PICTURE': 'PICTURE', 'PASSPORT_COPY': 'PASSPORT COPY', 'VISA_COPY': 'VISA COPY', 'MOFABIO': 'MOFABIO' };
            const finalFields = { ...fields };
            for(let localKey in addModalFiles){
                const files = addModalFiles[localKey];
                if(!files || files.length===0) continue;
                const airtableField = uploadFieldMap[localKey];
                if(!airtableField) continue;
                const uploadedUrls = [];
                for(let file of files){
                    const fd = new FormData();
                    fd.append('file', file);
                    fd.append('upload_preset', uploadPreset);
                    fd.append('folder', `effah/${localKey.toLowerCase()}`);
                    try{
                        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, { method: 'POST', body: fd });
                        const data = await res.json();
                        if(data.secure_url) uploadedUrls.push({ url: data.secure_url, filename: file.name });
                    }catch(e){ console.error('Upload fail', e); }
                }
                if(uploadedUrls.length>0) finalFields[airtableField] = uploadedUrls;
            }
            const pat = window.AIRTABLE_PAT || localStorage.getItem('effah_api_pat') || AIRTABLE_PAT;
            const base = window.AIRTABLE_BASE_ID || localStorage.getItem('effah_base_id') || AIRTABLE_BASE_ID;
            if(!pat || !base) throw new Error('PAT / Base ID belum set');
            const url = `https://api.airtable.com/v0/${base}/DATA%20JEMAAH%20UMRAH`;
            const res = await fetch(url, { method: 'POST', headers: { 'Authorization': `Bearer ${pat}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: finalFields }) });
            const result = await res.json();
            if(result.error) throw new Error(result.error.message || 'Gagal simpan Airtable');
            const idx = allJemaahUmrahRecords.findIndex(r=>r.id===tempId);
            if(idx!==-1) allJemaahUmrahRecords[idx] = result;
            if(typeof filterAndRenderJemaahGrid==='function') filterAndRenderJemaahGrid();
            // background refresh selepas 3 saat, bukan blocking
            setTimeout(()=>{ if(typeof fetchJemaahUmrahData==='function') fetchJemaahUmrahData(); }, 3000);
            if(typeof App!=='undefined' && App.toast) App.toast('Jemaah berjaya sync!');
        }catch(err){
            console.error(err);
            const rec = allJemaahUmrahRecords.find(r=>r.id===tempId);
            if(rec){ rec.fields._syncError = err.message; }
            if(typeof filterAndRenderJemaahGrid==='function') filterAndRenderJemaahGrid();
            if(typeof App!=='undefined' && App.toast) App.toast('Gagal sync background: ' + err.message);
        }
    })();
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
    { key: 'col-name', label: 'NAME', icon: 'fa-font', type: 'A' },
    { key: 'col-picture', label: 'PICTURE', icon: 'fa-image', type: '🖼️' },
    { key: 'col-ic', label: 'IC NO.', icon: 'fa-id-card', type: 'A' },
    { key: 'col-passport', label: 'PASSPORT NO.', icon: 'fa-passport', type: 'A' },
    { key: 'col-gender', label: 'GENDER', icon: 'fa-venus-mars', type: 'singleSelect' },
    { key: 'col-age', label: 'AGE', icon: 'fa-calculator', type: 'formula' },
    { key: 'col-dob', label: 'DOB', icon: 'fa-calculator', type: 'formula' },
    { key: 'col-dobf', label: 'DOB (FOREIGNER)', icon: 'fa-calendar', type: 'date' },
    { key: 'col-nat', label: 'NATIONALITY', icon: 'fa-flag', type: 'singleSelect' },
    { key: 'col-visa', label: 'STATUS VISA', icon: 'fa-file-lines', type: 'singleSelect' },
    { key: 'col-passcopy', label: 'PASSPORT COPY', icon: 'fa-file-image', type: 'attachment' },
    { key: 'col-visacopy', label: 'VISA COPY', icon: 'fa-file-image', type: 'attachment' },
    { key: 'col-mofabio', label: 'MOFABIO', icon: 'fa-file-image', type: 'attachment' },
    { key: 'col-fit', label: 'FIT TICKET', icon: 'fa-square-check', type: 'checkbox' },
    { key: 'col-trip', label: 'TRIP', icon: 'fa-link', type: 'link' },
    { key: 'col-issue', label: 'DATE OF ISSUE', icon: 'fa-calendar', type: 'date' },
    { key: 'col-expire', label: 'DATE OF EXPIRE', icon: 'fa-calendar', type: 'date' },
    { key: 'col-notes', label: 'NOTES', icon: 'fa-align-left', type: 'text' },
    { key: 'col-board', label: 'BOARD BASIS', icon: 'fa-utensils', type: 'multiSelect' },
    { key: 'col-train', label: 'TRAIN', icon: 'fa-train', type: 'checkbox' },
    { key: 'col-insuran', label: 'INSURAN', icon: 'fa-shield-halved', type: 'multiSelect' },
    { key: 'col-pakej', label: 'PAKEJ', icon: 'fa-box', type: 'singleSelect' },
    { key: 'col-ejen', label: 'EJEN', icon: 'fa-user-tie', type: 'link' }
];

function getFieldTypeIcon(type){
  const map = {
    'singleSelect': '<i class="fa-solid fa-circle-dot text-emerald-500 text-[11px]"></i>',
    'multiSelect': '<i class="fa-solid fa-list text-sky-500 text-[11px]"></i>',
    'attachment': '<i class="fa-solid fa-paperclip text-slate-400 text-[11px]"></i>',
    'date': '<i class="fa-regular fa-calendar text-slate-400 text-[11px]"></i>',
    'checkbox': '<i class="fa-regular fa-square-check text-slate-400 text-[11px]"></i>',
    'formula': '<span class="italic text-[11px] text-slate-500">ƒx</span>',
    'link': '<i class="fa-solid fa-link text-amber-500 text-[11px]"></i>',
    'text': '<i class="fa-solid fa-align-left text-slate-400 text-[11px]"></i>',
    'A': '<span class="text-[11px] font-bold text-slate-500">A</span>',
    '🖼️': '<span class="text-[11px]">🖼️</span>'
  };
  return map[type] || '<span class="text-[10px] text-slate-400">T</span>';
}

let draggedFieldKey = null;

function buildHideFieldsList() {
    const listContainer = document.getElementById('fieldsToggleList');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    const excludedFromToggle = []; // FIX v6: include AGE & DOB dalam Arrange Fields
    const orderedDefs = [];
    columnOrder.forEach(k=>{
      if(excludedFromToggle.includes(k)) return;
      const def = columnDefinitions.find(c=> c.key===k);
      if(def) orderedDefs.push(def);
    });
    const filteredColumnDefs = columnDefinitions.filter(d=> !excludedFromToggle.includes(d.key));
    filteredColumnDefs.forEach(def=>{
      if(!orderedDefs.find(d=> d.key===def.key)){
        if(def.key==='col-idx') return;
        orderedDefs.push(def);
      }
    });

    orderedDefs.forEach((col, idx) => {
        const isHidden = hiddenColumns[col.key] || false;
        const isVisible = !isHidden;
        const item = document.createElement('div');
        item.draggable = true;
        item.dataset.key = col.key;
        item.dataset.index = idx;
        item.className = `group flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition cursor-grab active:cursor-grabbing select-none border border-transparent hover:border-slate-200 ${isHidden?'opacity-60':''}`;
        item.innerHTML = `
            <div class="flex items-center gap-2 flex-1 min-w-0">
                <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" ${isVisible ? 'checked' : ''} onchange="toggleColumnVisibility('${col.key}', this.checked)" class="sr-only peer">
                    <div class="w-7 h-4 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-sky-500"></div>
                </label>
                <span class="w-4 h-4 flex items-center justify-center flex-shrink-0">${getFieldTypeIcon(col.type)}</span>
                <span class="text-slate-700 font-medium truncate text-[11px]">${col.label}</span>
            </div>
            <div class="flex items-center gap-1 opacity-60 group-hover:opacity-100">
                <span class="text-[10px] text-slate-400 font-mono">${col.type==='A'?'A':''}</span>
                <i class="fa-solid fa-grip text-[10px] text-slate-300 cursor-grab"></i>
            </div>
        `;
        item.addEventListener('dragstart', (e)=>{
          draggedFieldKey = col.key;
          e.dataTransfer.effectAllowed = 'move';
          item.classList.add('opacity-50');
        });
        item.addEventListener('dragend', ()=>{
          item.classList.remove('opacity-50');
          draggedFieldKey = null;
        });
        item.addEventListener('dragover', (e)=>{
          e.preventDefault();
          item.classList.add('bg-sky-50','border-sky-200');
        });
        item.addEventListener('dragleave', ()=>{
          item.classList.remove('bg-sky-50','border-sky-200');
        });
        item.addEventListener('drop', (e)=>{
          e.preventDefault();
          item.classList.remove('bg-sky-50','border-sky-200');
          const targetKey = col.key;
          if(draggedFieldKey && draggedFieldKey!==targetKey){
            rearrangeColumns(draggedFieldKey, targetKey);
          }
        });
        listContainer.appendChild(item);
    });

    const visibleCount = orderedDefs.filter(c=> !hiddenColumns[c.key]).length;
    const countEl = document.getElementById('visibleFieldsCount');
    if(countEl) countEl.textContent = `${visibleCount} fields visible`;
}

function rearrangeColumns(draggedKey, targetKey){
  const fromIdx = columnOrder.indexOf(draggedKey);
  const toIdx = columnOrder.indexOf(targetKey);
  if(fromIdx===-1 || toIdx===-1) return;
  const [removed] = columnOrder.splice(fromIdx,1);
  const newToIdx = columnOrder.indexOf(targetKey);
  columnOrder.splice(newToIdx, 0, removed);
  localStorage.setItem('jemaahColOrder', JSON.stringify(columnOrder));
  renderTableHeader();
  filterAndRenderJemaahGrid();
  buildHideFieldsList();
}

function filterFieldsList(){
  const q = (document.getElementById('fieldSearchInput')?.value || '').toLowerCase();
  const list = document.getElementById('fieldsToggleList');
  if(!list) return;
  Array.from(list.children).forEach(child=>{
    const label = child.textContent.toLowerCase();
    if(label.includes(q)) child.classList.remove('hidden');
    else child.classList.add('hidden');
  });
}

function resetFieldsToDefault(){
  hiddenColumns = {};
  columnOrder = [
    'col-idx', 'col-name', 'col-picture', 'col-ic', 'col-passport', 
    'col-gender', 'col-age', 'col-dob', 'col-dobf', 'col-nat', 
    'col-visa', 'col-passcopy', 'col-visacopy', 'col-mofabio', 
    'col-fit', 'col-trip', 'col-issue', 'col-expire', 'col-notes',
    'col-board', 'col-train', 'col-insuran', 'col-pakej', 'col-ejen'
  ];
  localStorage.setItem('jemaahColOrder', JSON.stringify(columnOrder));
  localStorage.setItem('jemaahHiddenColumns', JSON.stringify(hiddenColumns));
  renderTableHeader();
  filterAndRenderJemaahGrid();
  buildHideFieldsList();
  applyHiddenColumns();
}

function toggleHideFieldsDropdown() {
    const drop = document.getElementById('hideFieldsDropdown');
    if (!drop) return;
    const isHidden = drop.classList.contains('hidden');
    if (isHidden) {
      buildHideFieldsList();
      drop.classList.remove('hidden');
    } else {
      drop.classList.add('hidden');
    }
}

function toggleColumnVisibility(colClass, isVisible) {
    hiddenColumns[colClass] = !isVisible;
    localStorage.setItem('jemaahHiddenColumns', JSON.stringify(hiddenColumns));
    applyHiddenColumns();
    buildHideFieldsList();
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

// Hook setup after openAddJemaahModal original
(function(){
    const _origOpenAdd = window.openAddJemaahModal;
    if(_origOpenAdd){
        const original = _origOpenAdd;
        window.openAddJemaahModal = function(){
            original.apply(this, arguments);
            setTimeout(()=>{
                const modal = document.getElementById('expandRecordModal');
                if(modal){
                    modal.classList.remove('hidden');
                    modal.style.display='flex';
                }
                setupAddModalFilePickers();
            }, 100);
        };
    } else {
        // if not yet defined, patch via event
        document.addEventListener('DOMContentLoaded', ()=>{
            const orig = window.openAddJemaahModal;
            if(orig){
                window.openAddJemaahModal = function(){
                    orig.apply(this, arguments);
                    setTimeout(()=>{
                        const modal = document.getElementById('expandRecordModal');
                        if(modal){
                            modal.classList.remove('hidden');
                            modal.style.display='flex';
                        }
                        setupAddModalFilePickers();
                    }, 100);
                };
            }
        });
    }
})();

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

// Hook setup after openAddJemaahModal original
(function(){
    const _origOpenAdd = window.openAddJemaahModal;
    if(_origOpenAdd){
        const original = _origOpenAdd;
        window.openAddJemaahModal = function(){
            original.apply(this, arguments);
            setTimeout(()=>{
                const modal = document.getElementById('expandRecordModal');
                if(modal){
                    modal.classList.remove('hidden');
                    modal.style.display='flex';
                }
                setupAddModalFilePickers();
            }, 100);
        };
    } else {
        // if not yet defined, patch via event
        document.addEventListener('DOMContentLoaded', ()=>{
            const orig = window.openAddJemaahModal;
            if(orig){
                window.openAddJemaahModal = function(){
                    orig.apply(this, arguments);
                    setTimeout(()=>{
                        const modal = document.getElementById('expandRecordModal');
                        if(modal){
                            modal.classList.remove('hidden');
                            modal.style.display='flex';
                        }
                        setupAddModalFilePickers();
                    }, 100);
                };
            }
        });
    }
})();

})();


// PATCH V18: Robust PDF detection for Maklumat Jemaah
(function(){
  const _origOpen = window.openPreviewModal;
  window._jemaahOpenPreviewModal = function(url, title){
    const lowerUrl = (url||'').toLowerCase();
    const lowerTitle = (title||'').toLowerCase();
    let isPdf = lowerUrl.includes('.pdf') || lowerTitle.includes('.pdf');
    if(!isPdf){
      // If not image extension, treat as pdf if from Airtable docs
      const isImage = lowerUrl.match(/\.(jpg|jpeg|png|gif|webp)/);
      if(!isImage && (lowerTitle.includes('visa') || lowerTitle.includes('passport') || lowerUrl.includes('airtable'))){
        // Check if url actually serves pdf by trying to see extension hint in filename param
        // For safety, if title has .pdf, force pdf
        if(lowerTitle.includes('.pdf')) isPdf = true;
      }
    }
    const modal = document.getElementById('attachmentPreviewModal');
    if(!modal){ window.open(url,'_blank'); return; }
    const img = document.getElementById('previewImage');
    const pdf = document.getElementById('previewPdf');
    const titleEl = document.getElementById('previewTitle');
    const dlBtn = document.getElementById('downloadAttachmentBtn');
    if(titleEl) titleEl.textContent = title || 'Preview';
    if(dlBtn) dlBtn.href = url;
    if(img){ img.classList.add('hidden'); img.src=''; }
    if(pdf){ pdf.classList.add('hidden'); pdf.src=''; }
    if(isPdf){
      if(pdf){ pdf.src = url; pdf.classList.remove('hidden'); }
    } else {
      if(img){ img.src = url; img.classList.remove('hidden'); }
    }
    modal.classList.remove('hidden');
    modal.style.display='flex';
  };

// V54: Auto-close dropdowns when clicking outside - fix image_c96f0e.png double dropdown overlap
document.addEventListener('click', function(e){
  const sortDrop = document.getElementById('sortDropdownMenu');
  const hideDrop = document.getElementById('hideFieldsDropdown');
  const sortBtn = e.target.closest('[onclick*="toggleSortDropdown"]') || e.target.closest('button')?.parentElement?.querySelector('#sortDropdownMenu') ? null : null;
  // Check if click is inside dropdown or its button
  const isSortButton = e.target.closest('button[onclick="toggleSortDropdown()"]') || e.target.closest('button')?.innerHTML?.includes('Sort:');
  const isHideButton = e.target.closest('button[onclick="toggleHideFieldsDropdown()"]') || e.target.closest('button')?.innerHTML?.includes('Edit/Arrange Fields');
  const isInsideSort = sortDrop && sortDrop.contains(e.target);
  const isInsideHide = hideDrop && hideDrop.contains(e.target);
  
  // More robust: check button ancestors
  const sortButton = document.querySelector('button[onclick="toggleSortDropdown()"]');
  const hideButton = document.querySelector('button[onclick="toggleHideFieldsDropdown()"]');
  
  const clickedSortButton = sortButton && (sortButton.contains(e.target) || e.target === sortButton || e.target.closest('button') === sortButton);
  const clickedHideButton = hideButton && (hideButton.contains(e.target) || e.target === hideButton || e.target.closest('button') === hideButton);
  
  if(sortDrop && !sortDrop.classList.contains('hidden')){
    if(!isInsideSort && !clickedSortButton && !e.target.closest('#sortDropdownMenu')){
      // Only close if not clicking inside sort dropdown or its button
      const isButton = e.target.closest('button') && e.target.closest('button').getAttribute('onclick')?.includes('toggleSortDropdown');
      if(!isButton && !sortDrop.contains(e.target) && !(sortButton && sortButton.contains(e.target))){
        sortDrop.classList.add('hidden');
      }
    }
  }
  if(hideDrop && !hideDrop.classList.contains('hidden')){
    if(!isInsideHide && !clickedHideButton && !e.target.closest('#hideFieldsDropdown')){
      const isButton = e.target.closest('button') && e.target.closest('button').getAttribute('onclick')?.includes('toggleHideFieldsDropdown');
      if(!isButton && !hideDrop.contains(e.target) && !(hideButton && hideButton.contains(e.target))){
        hideDrop.classList.add('hidden');
      }
    }
  }
});

// Improved version: single handler for all dropdowns
(function(){
  const originalToggleSort = window.toggleSortDropdown;
  const originalToggleHide = window.toggleHideFieldsDropdown;
  
  window.toggleSortDropdown = function(){
    const drop = document.getElementById('sortDropdownMenu');
    const hideDrop = document.getElementById('hideFieldsDropdown');
    if(hideDrop) hideDrop.classList.add('hidden'); // Close other dropdown - fix image_c96f0e.png double
    if(drop){
      drop.classList.toggle('hidden');
    } else if(originalToggleSort){
      originalToggleSort();
    }
  };
  
  window.toggleHideFieldsDropdown = function(){
    const drop = document.getElementById('hideFieldsDropdown');
    const sortDrop = document.getElementById('sortDropdownMenu');
    if(sortDrop) sortDrop.classList.add('hidden'); // Close other dropdown - fix image_c96f0e.png double
    if(drop){
      const isHidden = drop.classList.contains('hidden');
      if(isHidden){
        if(typeof buildHideFieldsList === 'function') buildHideFieldsList();
        drop.classList.remove('hidden');
      } else {
        drop.classList.add('hidden');
      }
    } else if(originalToggleHide){
      originalToggleHide();
    }
  };
  
  // Global click outside to close all dropdowns
  document.addEventListener('click', function(event){
    const sortDrop = document.getElementById('sortDropdownMenu');
    const hideDrop = document.getElementById('hideFieldsDropdown');
    const sortBtn = document.querySelector('button[onclick="toggleSortDropdown()"]');
    const hideBtn = document.querySelector('button[onclick="toggleHideFieldsDropdown()"]');
    
    // If clicking outside both dropdowns and their buttons, close them
    const clickedInsideSort = sortDrop && (sortDrop.contains(event.target) || (sortBtn && sortBtn.contains(event.target)));
    const clickedInsideHide = hideDrop && (hideDrop.contains(event.target) || (hideBtn && hideBtn.contains(event.target)));
    
    if(!clickedInsideSort && sortDrop && !sortDrop.classList.contains('hidden')){
      sortDrop.classList.add('hidden');
    }
    if(!clickedInsideHide && hideDrop && !hideDrop.classList.contains('hidden')){
      // Don't close if clicking inside search input filtering
      if(!event.target.closest('#fieldSearchInput') && !event.target.closest('#fieldsToggleList')){
        // Check if it's not the toggle itself (already handled by contains)
        if(!(hideBtn && hideBtn.contains(event.target))){
          hideDrop.classList.add('hidden');
        }
      }
    }
  });

// Hook setup after openAddJemaahModal original
(function(){
    const _origOpenAdd = window.openAddJemaahModal;
    if(_origOpenAdd){
        const original = _origOpenAdd;
        window.openAddJemaahModal = function(){
            original.apply(this, arguments);
            setTimeout(()=>{
                const modal = document.getElementById('expandRecordModal');
                if(modal){
                    modal.classList.remove('hidden');
                    modal.style.display='flex';
                }
                setupAddModalFilePickers();
            }, 100);
        };
    } else {
        // if not yet defined, patch via event
        document.addEventListener('DOMContentLoaded', ()=>{
            const orig = window.openAddJemaahModal;
            if(orig){
                window.openAddJemaahModal = function(){
                    orig.apply(this, arguments);
                    setTimeout(()=>{
                        const modal = document.getElementById('expandRecordModal');
                        if(modal){
                            modal.classList.remove('hidden');
                            modal.style.display='flex';
                        }
                        setupAddModalFilePickers();
                    }, 100);
                };
            }
        });
    }
})();

})();



document.addEventListener('click', function(e){
  if(!e.target.closest('[data-cell-dropdown]') && !e.target.closest('.cell-dropdown-wrapper')){
    if(typeof closeAllCellDropdowns === 'function') closeAllCellDropdowns();
  }
});



// Hook setup after openAddJemaahModal original
(function(){
    const _origOpenAdd = window.openAddJemaahModal;
    if(_origOpenAdd){
        const original = _origOpenAdd;
        window.openAddJemaahModal = function(){
            original.apply(this, arguments);
            setTimeout(()=>{
                const modal = document.getElementById('expandRecordModal');
                if(modal){
                    modal.classList.remove('hidden');
                    modal.style.display='flex';
                }
                setupAddModalFilePickers();
            }, 100);
        };
    } else {
        // if not yet defined, patch via event
        document.addEventListener('DOMContentLoaded', ()=>{
            const orig = window.openAddJemaahModal;
            if(orig){
                window.openAddJemaahModal = function(){
                    orig.apply(this, arguments);
                    setTimeout(()=>{
                        const modal = document.getElementById('expandRecordModal');
                        if(modal){
                            modal.classList.remove('hidden');
                            modal.style.display='flex';
                        }
                        setupAddModalFilePickers();
                    }, 100);
                };
            }
        });
    }
})();

})();
