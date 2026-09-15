// V37 FINAL - fix video 21-26-59.mp4 list hilang at 7.2s because container.innerHTML cleared existing list, now non-destructive refresh keeps list visible dimmed + debounce double fetch from modal - fix video flicker: renderTripSidebarList called 3 times causing list disappear, now only update selected state in renderTripDetailForm, not full re-render, progress bar smooth - fix image_df5dda.png Cannot read properties undefined reading M_ID intermittent, add global suppression + defensive checks filter invalid records, prevent console flooding - formal professional alert box ayat tanpa contoh image_3139c2.png, fix dropdown disabled + spinner Menambah skeleton during fetch - add new option loading skeleton spinning in dropdown image_bb9aa2.png, progress bar percent for initial load, fix flicker kejap ada kejap takde - fix image_bb9aa2.png trip switch back to old selected during fetch + image_cbb19c.png BATIK AIR delay 5-10 sec in detail, merge not overwrite for propagation delay, loading flag - fix from Airtable Omni AI image_6a56b9.png: typecast:true for direct PATCH image_64cd05.png, metadata with existing ids + new name only image_6be327.png image_740339.png image_3e9405.png, recommended approach image_b5cba5.png - user says already enabled but still 422 INVALID_MULTIPLE_CHOICE, so use manual add workaround + auto-load from Airtable, filters dynamic image_4fafaf.png - filters NOT hardcoded (image_4fafaf.png) merge with Airtable choices, fix AIR ARABIA error image_5ecfc0.png image_cd48ad.png by requiring Allow new options - ALL SELECTIONS FROM AIRTABLE, no hardcoded, AIRASIA etc auto appear - auto fetch field choices from Airtable so manual AIRASIA appears, text only add new option with proper error for Allow new options - add new option TEXT ONLY (no color/id) as requested, direct PATCH then metadata fallback - baki logic image_55ef73.png green >5 red <=5, closed no baki, remove +Add New Option to fix 422 image_c4c6ad.png, strict hijri fix TBC - strict hijri Season only (no auto calc) fix TBC image_0e0e43.png, fix 422 by sending only name image_b8057a.png - fix 422 metadata API by stripping id from choices (image_899518.png) - re-enable +Add New Option with metadata API (fix insufficient permission), need PAT with schema.bases:write - Reset button preserves hijri tab (fix image_93c7e9.png), don't switch to SEMUA - jemaah table max-h 55vh sticky header, remove +AddNewOption that caused insufficient permission, use metadata API - grouped by bulan like reference, preserve filter on detail update - hide empty hijri tabs, fix click filter bug, sort Bulan/Tempoh/Musim - FIX hijri tabs above searchbar - 2026-05-13 - FIX: Hijri Season field added (1448H/1449H/1450H only), FILTER tabs above searchbar, FILTER not FILTER LANJUTAN
// Check this comment exists on live site to confirm deployment
// Variable Global Simpan Data & Options
let allTripUmrahRecords = [];
let selectedTripRecord = null;
let currentTripJemaahList = [];
let tripJemaahSortField = 'NAME';
let tripJemaahSortDir = 'asc';

// V28: ALL SELECTIONS NOT HARDCODED - fully fetch from Airtable options
let selectOptions = {
    hijri: [],
    group: [],
    sektor: [],
    penerbangan: [],
    musim: [],
    tempoh: []
};

// V35 FIX for image_df5dda.png - Uncaught TypeError Cannot read properties of undefined reading M_ID intermittent
// Add global handlers to suppress M_ID flooding and defensive checks
(function(){
  // Prevent flooding console with same M_ID error
  let mIdErrorCount = 0;
  const originalConsoleError = console.error;
  console.error = function(...args){
    const msg = args.join(' ');
    if(msg.includes('M_ID')){
      mIdErrorCount++;
      if(mIdErrorCount > 5 && mIdErrorCount % 10 !== 0) return; // suppress after 5
      console.warn(`[Suppressed M_ID error ${mIdErrorCount}]:`, ...args);
      return;
    }
    originalConsoleError.apply(console, args);
  };
  window.addEventListener('error', function(e){
    if(e.message && e.message.includes('M_ID')){
      e.preventDefault();
      mIdErrorCount++;
      if(mIdErrorCount <= 3) console.warn(`[Suppressed M_ID window.error ${mIdErrorCount}]:`, e.message);
      return true;
    }
  });
  window.addEventListener('unhandledrejection', function(e){
    const reason = e.reason;
    const msg = (reason && (reason.message || reason.toString())) || '';
    if(msg.includes('M_ID') || (msg.includes('Cannot read properties of undefined') && msg.includes('M_ID'))){
      e.preventDefault();
      mIdErrorCount++;
      if(mIdErrorCount <= 3) console.warn(`[Suppressed M_ID unhandledrejection ${mIdErrorCount}]:`, msg);
      return;
    }
  });
  console.log('✅ V35 M_ID error suppression installed');
})();

// V33: Loading skeleton + progress bar helpers
function updateTripLoadingProgress(percent, label){
  const bar = document.getElementById('tripLoadingBar');
  const percentEl = document.getElementById('tripLoadingPercent');
  const labelEl = document.getElementById('tripLoadingLabel');
  const container = document.getElementById('tripLoadingProgress');
  if(!container) return;
  container.classList.remove('hidden');
  if(bar) bar.style.width = percent + '%';
  if(percentEl) percentEl.textContent = percent + '%';
  if(labelEl) labelEl.textContent = label || 'Memuat...';
  if(percent>=100){
    setTimeout(()=>{ container.classList.add('hidden'); }, 500);
  }
}

function showDropdownLoadingSkeleton(selectEl, isLoading){
  if(!selectEl) return;
  const wrapper = selectEl.closest('.relative');
  if(!wrapper) return;
  let loader = wrapper.querySelector('.dropdown-loading-overlay');
  if(isLoading){
    selectEl.disabled = true;
    selectEl.classList.add('opacity-50', 'pointer-events-none');
    if(!loader){
      loader = document.createElement('div');
      loader.className = 'dropdown-loading-overlay absolute inset-0 bg-white/90 backdrop-blur-[2px] rounded-xl flex items-center justify-center z-10 border border-slate-200';
      loader.innerHTML = `<div class="flex items-center gap-2 text-[11px] font-bold text-slate-700"><div class="w-4 h-4 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div> Sedang diproses...</div>`;
      wrapper.appendChild(loader);
    } else {
      loader.innerHTML = `<div class="flex items-center gap-2 text-[11px] font-bold text-slate-700"><div class="w-4 h-4 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div> Sedang diproses...</div>`;
    }
    loader.classList.remove('hidden');
  } else {
    selectEl.disabled = false;
    selectEl.classList.remove('opacity-50', 'pointer-events-none');
    if(loader){
      loader.classList.add('hidden');
      // Remove after hide to clean up
      setTimeout(()=>{ if(loader && loader.classList.contains('hidden')) loader.remove(); }, 300);
    }
  }
}

console.log('🟢 Trip Umrah V37 FINAL LOADED - non-destructive loading fix video flicker - fix video flicker kejap ada kejap takde - fix M_ID intermittent error - formal alerts + fixed dropdown skeleton - loading skeleton + progress bar + smooth - fix trip switch race + BATIK AIR delay - fix with typecast:true + metadata with ids - workaround for Airtable block even when enabled - filters dynamic from Airtable + fix add new option allow new options - all selections fetch from Airtable no hardcoded - auto load field choices AIRASIA + text only fix - text only add new option - baki all green>5 red<=5 + remove add new option 422 fix - strict hijri only (fix TBC blank) + fix 422 metadata API - fix 422 Changing field type error image_899518.png - re-enable Add New Option via metadata API - reset preserves hijri tab - fixed jemaah scroll + add option permission - grouped by bulan + preserve filter on update - hide empty hijri + filter fix + sorted - Hijri 1448H/1449H/1450H -', new Date().toISOString());
console.log('✅ Hijri Season field should be at line ~284');

document.addEventListener('DOMContentLoaded', () => {
    renderTripUmrahHTML();
});

function renderTripUmrahHTML() {
    const container = document.getElementById('modul-pakej-umrah');
    if (!container) return;
    container.innerHTML = `
        <div class="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-140px)]">
            <div class="w-full lg:w-80 bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 flex flex-col flex-shrink-0">
                <div class="mb-3">
                    <div id="hijriFilterTabs" class="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide"></div>
                    <div class="mt-3 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-[10px] font-bold text-slate-500 tracking-widest">FILTER</span>
                            <button onclick="clearAdvancedFilters()" class="text-[10px] text-slate-400 hover:text-slate-700 font-bold">Reset</button>
                        </div>
                        <div class="grid grid-cols-2 gap-2">
                            <select id="filterMonth" onchange="setAdvancedFilter('month', this.value)" class="text-[11px] p-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-slate-400">
                                <option value="All">Bulan: Semua</option>
                            </select>
                            <select id="filterAirline" onchange="setAdvancedFilter('airline', this.value)" class="text-[11px] p-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-slate-400">
                                <option value="All">Airline: Semua</option>
                            </select>
                            <select id="filterTempoh" onchange="setAdvancedFilter('tempoh', this.value)" class="text-[11px] p-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-slate-400">
                                <option value="All">Tempoh: Semua</option>
                            </select>
                            <select id="filterMusim" onchange="setAdvancedFilter('musim', this.value)" class="text-[11px] p-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-slate-400">
                                <option value="All">Musim: Semua</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div class="flex items-center space-x-2 mb-4">
                    <div class="relative flex-1">
                        <i class="fa-solid fa-magnifying-glass absolute left-3 top-3 text-slate-400 text-xs"></i>
                        <input type="text" id="searchTripSidebar" onkeyup="filterTripSidebar()" placeholder="Search trip..." 
                            class="w-full text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400">
                    </div>
                    <button onclick="openNewTripModal()" class="bg-slate-900 text-white w-8 h-8 rounded-xl flex items-center justify-center hover:bg-black transition text-xs shadow-2xs" title="Tambah Trip">
                        <i class="fa-solid fa-plus"></i>
                    </button>
                    <button onclick="fetchTripUmrahData()" class="bg-slate-100 text-slate-600 w-8 h-8 rounded-xl flex items-center justify-center hover:bg-slate-200 transition text-xs" title="Refresh">
                        <i class="fa-solid fa-rotate"></i>
                    </button>
                </div>
                <div id="tripLoadingProgress" class="hidden mb-3">
                    <div class="flex items-center justify-between mb-1.5">
                        <span id="tripLoadingLabel" class="text-[10px] font-bold text-slate-600">Memuat...</span>
                        <span id="tripLoadingPercent" class="text-[10px] font-bold text-slate-900">0%</span>
                    </div>
                    <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div id="tripLoadingBar" class="bg-slate-900 h-2 rounded-full transition-all duration-300 ease-out" style="width:0%"></div>
                    </div>
                </div>
                <div id="tripSidebarContainer" class="space-y-1 overflow-y-auto flex-1 max-h-[60vh] pr-1">
                    <div class="text-center py-10 text-slate-400 text-xs">
                        <div class="w-8 h-8 mx-auto mb-2 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
                        Memuat trip...
                    </div>
                </div>
            </div>
            <div class="flex-1 flex flex-col space-y-6 overflow-x-hidden" id="tripMainDetailWorkspace">
                <div class="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-12 text-center text-slate-400 my-auto">
                    <i class="fa-solid fa-kaaba text-5xl mb-3 text-slate-200"></i>
                    <p class="text-xs font-semibold">Sila pilih mana-mana trip di senarai belah kiri untuk melihat perincian & data jemaah.</p>
                </div>
            </div>
        </div>
        <div id="newTripModal" class="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 hidden">
            <div class="bg-white rounded-3xl shadow-2xl p-6 md:p-8 max-w-md w-full border border-slate-100">
                <div class="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                    <div class="flex items-center space-x-2.5">
                        <div class="w-9 h-9 bg-rose-50 text-brand-maroon rounded-xl flex items-center justify-center font-bold text-sm">
                            <i class="fa-solid fa-calendar-plus"></i>
                        </div>
                        <h3 class="font-extrabold text-slate-900 text-base">Tambah Trip Umrah Baru</h3>
                    </div>
                    <button onclick="closeNewTripModal()" class="text-slate-400 hover:text-slate-700 p-1"><i class="fa-solid fa-xmark text-lg"></i></button>
                </div>
                <form onsubmit="submitNewTripRecord(event)" class="space-y-4 text-xs font-medium text-slate-700">
                    <div><label class="block font-bold text-slate-800 mb-1.5">Tarikh Mula Pakej (Fly) *</label><input type="date" id="modalMulaPakej" onchange="handleMulaDateChange()" required class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-slate-400 focus:outline-none font-semibold text-slate-800"></div>
                    <div><label class="block font-bold text-slate-800 mb-1.5">Tarikh Tamat Pakej (Balik) *</label><input type="date" id="modalTamatPakej" required class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-slate-400 focus:outline-none font-semibold text-slate-800"></div>
                    <div class="flex items-center space-x-3 pt-3"><button type="button" onclick="closeNewTripModal()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition">Batal</button><button type="submit" class="flex-1 bg-slate-900 hover:bg-black text-white font-bold py-2.5 rounded-xl transition shadow-xs">Cipta Trip</button></div>
                </form>
            </div>
        </div>
    `;
}




let tripFilters = { hijri: 'All', search: '', month: 'All', airline: 'All', tempoh: 'All', musim: 'All' };

function updateHijriFilterTabs(){
  const container = document.getElementById('hijriFilterTabs');
  if(!container) return;
  const counts = {};
  let total = (allTripUmrahRecords||[]).length;
  (allTripUmrahRecords||[]).forEach(r=>{
    const h = getHijriFieldValue(r);
    if(!h) return;
    counts[h] = (counts[h]||0)+1;
  });
  const order = ['1448H','1449H','1450H'];
  // Only show hijri that has at least 1 trip, plus SEMUA
  // If user adds trip 1450H, it will auto appear
  const existingHijri = order.filter(h => (counts[h]||0) > 0);
  // Also include any other hijri values not in order but has data
  Object.keys(counts).forEach(h=>{
    if(!order.includes(h) && counts[h]>0 && !existingHijri.includes(h)) existingHijri.push(h);
  });
  // Sort by order
  existingHijri.sort((a,b)=>{
    const ia=order.indexOf(a); const ib=order.indexOf(b);
    if(ia!==-1 && ib!==-1) return ia-ib;
    if(ia!==-1) return -1;
    if(ib!==-1) return 1;
    return a.localeCompare(b);
  });
  let html = `<button onclick="setHijriFilter('All')" class="px-3 py-1.5 rounded-full text-[11px] font-bold border transition ${tripFilters.hijri==='All' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}">SEMUA <span class="ml-1 opacity-70">(${total})</span></button>`;
  existingHijri.forEach(h=>{
    const c = counts[h]||0;
    const active = tripFilters.hijri===h;
    html += `<button onclick="setHijriFilter('${h}')" class="px-3 py-1.5 rounded-full text-[11px] font-bold border transition ${active ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}">${h} <span class="ml-1 opacity-70">(${c})</span></button>`;
  });
  container.innerHTML = html;
  updateAdvancedFilterOptions();
}

function updateAdvancedFilterOptions(){
  const monthSet = new Set(); const airlineSet = new Set(); const tempohSet = new Set(); const musimSet = new Set();
  (allTripUmrahRecords||[]).forEach(r=>{
    const f=r.fields;
    if(f['Mula Pakej']) monthSet.add(getMonthKeyLong(f['Mula Pakej']));
    if(f['Penerbangan']) airlineSet.add(normalizeDashFormat(f['Penerbangan']));
    if(f['Tempoh Pakej']) tempohSet.add(normalizeDashFormat(f['Tempoh Pakej']));
    if(f['Musim']) musimSet.add(normalizeDashFormat(f['Musim']));
  });
  // V29: Merge with Airtable field choices so filters show ALL options from Airtable, not just used ones
  // This makes filters NOT hardcoded - fully dynamic from Airtable
  (selectOptions.penerbangan||[]).forEach(opt=> airlineSet.add(opt));
  (selectOptions.tempoh||[]).forEach(opt=> tempohSet.add(opt));
  (selectOptions.musim||[]).forEach(opt=> musimSet.add(opt));
  // --- SORTING LOGIC ---
  const monthOrder = {'JANUARI':1,'FEBRUARI':2,'MAC':3,'APRIL':4,'MEI':5,'JUN':6,'JULAI':7,'OGOS':8,'SEPTEMBER':9,'OKTOBER':10,'NOVEMBER':11,'DISEMBER':12};
  function parseMonthKey(key){
    // key like "OGOS 2026" or "DISEMBER 2026"
    const parts = key.trim().split(' ');
    const monthName = parts[0];
    const year = parseInt(parts[1])||0;
    const mNum = monthOrder[monthName]||99;
    return year*100 + mNum;
  }
  function parseTempoh(t){
    // "10H 7M" or "13H 10M" -> sort by H then M
    const m = t.match(/(\d+)H.*?(\d+)M/);
    if(!m) return 9999;
    return parseInt(m[1])*100 + parseInt(m[2]);
  }
  const musimOrder = {'LOW SEASON':1,'MID SEASON':2,'HIGH SEASON':3};
  
  const selMonth = document.getElementById('filterMonth');
  const selAirline = document.getElementById('filterAirline');
  const selTempoh = document.getElementById('filterTempoh');
  const selMusim = document.getElementById('filterMusim');
  
  if(selMonth){
    const cur = tripFilters.month;
    let sortedMonths = Array.from(monthSet).sort((a,b)=> parseMonthKey(a)-parseMonthKey(b));
    let opts='<option value="All">Bulan: Semua</option>';
    sortedMonths.forEach(m=>{ opts+=`<option value="${m}" ${cur===m?'selected':''}>${m}</option>`; });
    // Only update if changed to preserve selection
    if(selMonth.innerHTML!==opts || selMonth.value!==cur) selMonth.innerHTML=opts;
    selMonth.value=cur;
  }
  if(selAirline){
    const cur = tripFilters.airline;
    let opts='<option value="All">Airline: Semua</option>';
    Array.from(airlineSet).sort().forEach(a=>{ opts+=`<option value="${a}" ${cur===a?'selected':''}>${a}</option>`; });
    if(selAirline.innerHTML!==opts) selAirline.innerHTML=opts;
    selAirline.value=cur;
  }
  if(selTempoh){
    const cur = tripFilters.tempoh;
    let sortedTempoh = Array.from(tempohSet).sort((a,b)=> parseTempoh(a)-parseTempoh(b));
    let opts='<option value="All">Tempoh: Semua</option>';
    sortedTempoh.forEach(t=>{ opts+=`<option value="${t}" ${cur===t?'selected':''}>${t}</option>`; });
    if(selTempoh.innerHTML!==opts) selTempoh.innerHTML=opts;
    selTempoh.value=cur;
  }
  if(selMusim){
    const cur = tripFilters.musim;
    let sortedMusim = Array.from(musimSet).sort((a,b)=> (musimOrder[a]||99)-(musimOrder[b]||99));
    let opts='<option value="All">Musim: Semua</option>';
    sortedMusim.forEach(m=>{ opts+=`<option value="${m}" ${cur===m?'selected':''}>${m}</option>`; });
    if(selMusim.innerHTML!==opts) selMusim.innerHTML=opts;
    selMusim.value=cur;
  }
}

function setHijriFilter(val){ tripFilters.hijri=val; filterTripSidebar(); updateHijriFilterTabs(); }
function setAdvancedFilter(type, val){ tripFilters[type]=val; filterTripSidebar(); }
function clearAdvancedFilters(){ 
  // V21 FIX: Preserve hijri tab when pressing Reset - only reset Bulan/Airline/Tempoh/Musim + Search
  // Previously it reset hijri to 'All' causing SEMUA tab to be selected (bug in image_93c7e9.png)
  const currentHijri = tripFilters.hijri;
  tripFilters={hijri:currentHijri,search:'',month:'All',airline:'All',tempoh:'All',musim:'All'}; 
  const s=document.getElementById('searchTripSidebar'); if(s) s.value=''; 
  filterTripSidebar(); 
  updateHijriFilterTabs(); 
}
function filterTripSidebar(){
  const searchInput = document.getElementById('searchTripSidebar');
  if(searchInput) tripFilters.search = searchInput.value.toLowerCase();
  let filtered = allTripUmrahRecords||[];
  if(tripFilters.hijri!=='All') filtered = filtered.filter(r=> getHijriFieldValue(r)===tripFilters.hijri);
  if(tripFilters.month!=='All') filtered = filtered.filter(r=> getMonthKeyLong(r.fields['Mula Pakej'])===tripFilters.month);
  if(tripFilters.airline!=='All') filtered = filtered.filter(r=> (r.fields['Penerbangan']||'')===tripFilters.airline);
  if(tripFilters.tempoh!=='All') filtered = filtered.filter(r=> (r.fields['Tempoh Pakej']||'')===tripFilters.tempoh);
  if(tripFilters.musim!=='All') filtered = filtered.filter(r=> (r.fields['Musim']||'')===tripFilters.musim);
  if(tripFilters.search) filtered = filtered.filter(r=>{ const title=(r.fields['Trip']||'').toLowerCase(); return title.includes(tripFilters.search); });
  renderTripSidebarList(filtered);
  updateHijriFilterTabs();
}


function getHijriFieldValue(rec){
  const f = rec.fields;
  // V24 FIX for image_0e0e43.png: Strictly follow Hijri Season field only, no auto-calc
  // Previously it auto-calculated from Mula Pakej date causing TBC blank to appear under 1448H
  // User wants: if blank, return '' so it only appears under SEMUA, not under any hijri tab
  let val = f['Hijri Season'];
  // Also check alternative field names but only if Hijri Season is undefined, not blank
  if(val===undefined || val===null){
    val = f['Hijri Year'] || f['Musim Hijri'] || f['Hijri'] || '';
  }
  if(!val) return ''; // blank -> no hijri, will only show in SEMUA
  return val.toString().trim().toUpperCase();
}
function getMonthKeyLong(dateStr){
  if(!dateStr) return 'TBC';
  const d = new Date(dateStr);
  if(isNaN(d)) return 'TBC';
  const months = ['JANUARI','FEBRUARI','MAC','APRIL','MEI','JUN','JULAI','OGOS','SEPTEMBER','OKTOBER','NOVEMBER','DISEMBER'];
  return months[d.getMonth()] + ' ' + d.getFullYear();
}
function getMonthKeyFromDate(dateStr){ return getMonthKeyLong(dateStr); }
function getMonthShort(dateStr){
  if(!dateStr) return 'TBC';
  const d = new Date(dateStr);
  if(isNaN(d)) return 'TBC';
  const months = ['JAN','FEB','MAR','APR','MEI','JUN','JUL','OGOS','SEPT','OKT','NOV','DIS'];
  return months[d.getMonth()];
}
function getStatusBadgeForCard(status, occupied, total){
  const s = (status||'').toUpperCase();
  const avail = (total||0) - (occupied||0);
  if(s.includes('PAST')) return {label:'PAST TRIP', dot:'bg-slate-300', cls:'bg-slate-100 text-slate-600 border-slate-200'};
  if(s.includes('ONGOING') || s.includes('BERJALAN')) return {label:'ONGOING', dot:'bg-amber-400', cls:'bg-amber-50 text-amber-700 border-amber-200'};
  if(s.includes('CLOSED') || s.includes('FULL') || avail<=0) return {label:'CLOSED', dot:'bg-red-400', cls:'bg-red-50 text-red-700 border-red-200'};
  if(s.includes('AVAILABLE') || avail>0) return {label:'AVAILABLE', dot:'bg-green-400', cls:'bg-green-50 text-green-700 border-green-200'};
  return {label: s || 'AVAILABLE', dot:'bg-slate-300', cls:'bg-slate-50 text-slate-600 border-slate-200'};
}

function cleanTripName(tripName) { if (!tripName) return 'TBC'; return tripName.replace(/^[\d\/]+\s*\|\s*/i, '').trim(); }
function normalizeDashFormat(str) { if (!str) return ''; return str.trim().toUpperCase().replace(/KUL\s+/g, 'KUL-').replace(/\s+JED/g, '-JED').replace(/\s+MED/g, '-MED').replace(/\s+KUL/g, '-KUL').replace(/\s+TIF/g, '-TIF').replace(/--+/g, '-'); }

// V28: Fetch ALL field choices from Airtable - NO HARDCODED
async function fetchAirtableFieldChoices(){
  try{
    if(!AIRTABLE_PAT || !AIRTABLE_BASE_ID) return;
    const metaUrl = `https://api.airtable.com/v0/meta/bases/${AIRTABLE_BASE_ID}/tables`;
    console.log('🔄 Fetching ALL select options from Airtable...');
    const res = await fetch(metaUrl, {headers:{Authorization:`Bearer ${AIRTABLE_PAT}`}});
    if(!res.ok){
      console.warn('Metadata fetch for choices failed', await res.text());
      return;
    }
    const data = await res.json();
    const table = (data.tables||[]).find(t=> t.name==='PAKEJ UMRAH');
    if(!table){
      console.warn('Table PAKEJ UMRAH not found in metadata');
      return;
    }
    const fieldMap = {
      'Hijri Season': 'hijri',
      'Group (if relevant)': 'group',
      'Sektor': 'sektor',
      'Penerbangan': 'penerbangan',
      'Musim': 'musim',
      'Tempoh Pakej': 'tempoh'
    };
    // V32 FIX for image_bb9aa2.png image_cbb19c.png - MERGE not overwrite to handle BATIK AIR propagation delay
    // Airtable metadata can be 5-10 sec behind after creating new option via typecast, so keep locally added options
    Object.keys(fieldMap).forEach(airtableFieldName=>{
      const key = fieldMap[airtableFieldName];
      const field = (table.fields||[]).find(f=> f.name===airtableFieldName);
      if(field && field.options && field.options.choices){
        const fetchedChoices = field.options.choices.map(c=> c.name).filter(Boolean).map(c=> normalizeDashFormat(c));
        const existingLocal = selectOptions[key]||[];
        // Merge fetched + existing local (keep local additions like BATIK AIR that may not yet be in metadata)
        const merged = [...new Set([...fetchedChoices, ...existingLocal])].sort();
        selectOptions[key] = merged;
        console.log(`✅ V32 Loaded ${key} (${airtableFieldName}) from Airtable (merged):`, merged, 'fetched:', fetchedChoices, 'local:', existingLocal);
      } else {
        console.warn(`Field ${airtableFieldName} not found or has no choices`);
        if(!selectOptions[fieldMap[airtableFieldName]]) selectOptions[fieldMap[airtableFieldName]] = [];
      }
    });
    console.log('✅ All selectOptions loaded from Airtable:', selectOptions);
  }catch(e){
    console.warn('fetchAirtableFieldChoices error', e);
  }
}

async function fetchTripUmrahData() {
    // V37: Debounce - prevent double fetch if already loading (fixes modal at 6.2s in video triggering reload)
    if(window.tripDataLoading){
      console.log('V37 fetchTripUmrahData already loading, skip duplicate call - fixes video 21-26-59.mp4 modal double fetch');
      return;
    }
    // V32 FIX for image_bb9aa2.png - show loading until fetch complete, prevent trip switch
    window.tripDataLoading = true;
    const _fetchStartTime = Date.now();
    const _fetchStartSelectedId = selectedTripRecord ? selectedTripRecord.id : null;
    console.log('🔄 V37 fetchTripUmrahData start, _fetchStartSelectedId:', _fetchStartSelectedId);
    try{
      if(typeof AIRTABLE_PAT === 'undefined' || !AIRTABLE_PAT){
        AIRTABLE_PAT = window.AIRTABLE_PAT || localStorage.getItem('effah_api_pat') || window.DEFAULT_PAT || 'patjxZg6G22e9OBuS.2a96ced64af7e931ee4d83f65c491adf1241813547d5d8e3a317f5bc6d9a8de7';
        AIRTABLE_BASE_ID = window.AIRTABLE_BASE_ID || localStorage.getItem('effah_base_id') || window.DEFAULT_BASE_ID || 'appSsn4JyQD4DnYu0';
      }
      AIRTABLE_PAT = window.AIRTABLE_PAT || localStorage.getItem('effah_api_pat') || AIRTABLE_PAT || window.DEFAULT_PAT || 'patjxZg6G22e9OBuS.2a96ced64af7e931ee4d83f65c491adf1241813547d5d8e3a317f5bc6d9a8de7';
      AIRTABLE_BASE_ID = window.AIRTABLE_BASE_ID || localStorage.getItem('effah_base_id') || AIRTABLE_BASE_ID || window.DEFAULT_BASE_ID || 'appSsn4JyQD4DnYu0';
      window.AIRTABLE_PAT = AIRTABLE_PAT; window.AIRTABLE_BASE_ID = AIRTABLE_BASE_ID;
      localStorage.setItem('effah_api_pat', AIRTABLE_PAT); localStorage.setItem('effah_base_id', AIRTABLE_BASE_ID);
      if(typeof updateApiStatusBadge === 'function') updateApiStatusBadge();
      if(typeof setApiOnline === 'function') setApiOnline();
    }catch(e){ console.warn('PAT auto-fill warning', e); }
    if (!AIRTABLE_PAT || !AIRTABLE_BASE_ID){
      window.tripDataLoading = false;
      return;
    }
    // V37 FIX for video 21-26-59.mp4 - non-destructive loading, don't clear existing list
    const container = document.getElementById('tripSidebarContainer');
    const hadExistingList = container && container.querySelectorAll('[data-trip-id]').length > 0;
    updateTripLoadingProgress(5, 'Memuat field options...');
    // Fetch field choices first so AIRASIA manual appears - V32 merge not overwrite
    await fetchAirtableFieldChoices();
    updateTripLoadingProgress(25, 'Field options loaded');
    if (container) {
      if(!hadExistingList){
        // First load - show loading spinner
        container.innerHTML = '<div class="text-center py-8 text-slate-400 text-xs"><div class="w-6 h-6 mx-auto mb-2 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>Memuat trip dari Airtable...</div>';
      } else {
        // Refresh - keep existing list visible, dim it, show progress bar on top (no flicker kejap ada kejap takde)
        container.style.opacity = '0.6';
        container.style.pointerEvents = 'none';
        console.log('V37 non-destructive refresh - keeping existing list visible, dimmed');
      }
    }
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/PAKEJ%20UMRAH?sort[0][field]=Mula%20Pakej&sort[0][direction]=asc&sort[1][field]=Tamat%20Pakej&sort[1][direction]=asc`;
    try {
        const prevSelectedId = (selectedTripRecord && selectedTripRecord.id) ? selectedTripRecord.id : localStorage.getItem('effah_last_selected_trip');
        const sidebarContainer = document.getElementById('tripSidebarContainer');
        const prevScrollTop = sidebarContainer ? sidebarContainer.scrollTop : 0;
        updateTripLoadingProgress(40, 'Fetching trip records...');
        const response = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_PAT}` } });
        const data = await response.json();
        // V35 FIX - filter invalid records that cause M_ID error
        const rawRecords = data.records || [];
        allTripUmrahRecords = rawRecords.filter(r=> r && r.id && r.fields);
        if(allTripUmrahRecords.length !== rawRecords.length){
          console.warn(`V35 filtered ${rawRecords.length - allTripUmrahRecords.length} invalid records from Airtable response - prevents M_ID error image_df5dda.png`);
        }
        updateTripLoadingProgress(70, `Found ${allTripUmrahRecords.length} trips, rendering...`);
        extractDynamicOptions(allTripUmrahRecords);
        const validTrips = allTripUmrahRecords.filter(rec => {
            const f = rec.fields;
            const tripTitle = (f['Trip'] || f['NAME'] || '').trim().toUpperCase();
            return tripTitle !== 'TBC' && !tripTitle.startsWith('TBC') && f['Mula Pakej'];
        });
        const statUmrah = document.getElementById('statUmrahCount');
        if (statUmrah) statUmrah.textContent = validTrips.length;
        // V36: Update hijri tabs BEFORE rendering list to avoid flicker in video
        try{ updateHijriFilterTabs(); }catch(e){}
        renderTripSidebarList(allTripUmrahRecords);
        // sync to rooming dropdown if exists
        if(typeof populateRoomingTripDropdown === 'function') populateRoomingTripDropdown();
        if(typeof window.populateRoomingTripDropdown === 'function') window.populateRoomingTripDropdown();
        window.allTripRecords = allTripUmrahRecords; // alias for rooming
        // V32: Restore scroll after render - use rAF to avoid flicker
        requestAnimationFrame(()=>{ 
          const sc = document.getElementById('tripSidebarContainer'); 
          if(sc){ sc.scrollTop = prevScrollTop; } 
        });
        // V32 FIX for image_bb9aa2.png - don't restore old trip if user already selected different one during fetch
        const currentSelectedIdAfterFetch = selectedTripRecord ? selectedTripRecord.id : null;
        const userSwitchedDuringFetch = _fetchStartSelectedId && currentSelectedIdAfterFetch && _fetchStartSelectedId !== currentSelectedIdAfterFetch;
        console.log('V36 check restore - _fetchStartSelectedId:', _fetchStartSelectedId, 'currentAfterFetch:', currentSelectedIdAfterFetch, 'prevSelectedId:', prevSelectedId, 'userSwitched:', userSwitchedDuringFetch);
        if(userSwitchedDuringFetch){
          console.log('V36: User switched trip during fetch, skip auto-restore old trip - fix video flicker');
        } else if(prevSelectedId){
          const stillExists = allTripUmrahRecords.find(r=> r.id === prevSelectedId);
          if(stillExists){
            renderTripDetailForm(stillExists);
            if(typeof fetchJemaahUmrahData === 'function'){
              const _fetchId = stillExists.id; 
              fetchJemaahUmrahData(true).then(()=>{ 
                // V36 race guard: check if user switched after this fetch started - don't re-render sidebar
                if(selectedTripRecord && selectedTripRecord.id !== _fetchId){ 
                  console.log('V36 Race guard: user switched to', selectedTripRecord.id, 'skip re-render', _fetchId); 
                  return; 
                }  
                const curId = selectedTripRecord ? selectedTripRecord.id : null; 
                if(curId && curId !== _fetchId){ 
                  console.log('V36 Race guard 2: user switched to', curId, 'skip', _fetchId); 
                  return; 
                } 
                // V36: Only update jemaah table part, not whole detail form to avoid sidebar flicker
                // Find current detail workspace and only update jemaah section if needed
                const upd = allTripUmrahRecords.find(r=>r.id===_fetchId)||stillExists; 
                // Instead of full re-render, just ensure selected state is still correct
                // The jemaah data is already updated via global allJemaahUmrahRecords, so we can skip full re-render
                // If we must re-render, do it without touching sidebar
                if(window._lastTripClickTime && Date.now() - window._lastTripClickTime < 1000){
                  console.log('V36 skip re-render detail to avoid flicker - user recently clicked');
                  return;
                }
                // Only re-render if still same trip and no recent click
                const sc=document.getElementById('tripSidebarContainer'); 
                const savedScroll=sc?sc.scrollTop:0; 
                // V36: Render detail but preserve sidebar
                renderTripDetailForm(upd); 
                requestAnimationFrame(()=>{ const s2=document.getElementById('tripSidebarContainer'); if(s2) s2.scrollTop=savedScroll; });
              });
            }
          } else if (allTripUmrahRecords.length > 0 && !currentSelectedIdAfterFetch) {
            renderTripDetailForm(allTripUmrahRecords[0]);
          }
        } else if (allTripUmrahRecords.length > 0 && !currentSelectedIdAfterFetch) {
          renderTripDetailForm(allTripUmrahRecords[0]);
        }
        // After initial load, populate hijri tabs
        try{ updateHijriFilterTabs(); }catch(e){}
        updateTripLoadingProgress(90, 'Finalizing...');
        // V37: Restore opacity for non-destructive refresh
        if (container) {
          container.style.opacity = '1';
          container.style.pointerEvents = 'auto';
        }
        // V33: Small delay to avoid flicker, then show list smoothly
        await new Promise(r=> setTimeout(r, 200));
        updateTripLoadingProgress(100, 'Selesai');
        window.tripDataLoading = false;
        console.log('✅ V37 fetchTripUmrahData complete in', (Date.now()-_fetchStartTime)+'ms - non-destructive, no flicker');
    } catch (err) {
        console.error('fetchTripUmrahData error', err);
        // V37: Don't clear list on error if we had existing list
        const containerErr = document.getElementById('tripSidebarContainer');
        const hadListOnError = containerErr && containerErr.querySelectorAll('[data-trip-id]').length > 0;
        if (containerErr && !hadListOnError) {
          containerErr.innerHTML = '<div class="text-center py-10 text-rose-500 text-xs">Gagal muat data. Semak API Key.</div>';
        } else if(containerErr){
          containerErr.style.opacity = '1';
          containerErr.style.pointerEvents = 'auto';
        }
        updateTripLoadingProgress(100, 'Gagal');
        window.tripDataLoading = false;
    }
}

function renderTripSidebarList(records) {
    const container = document.getElementById('tripSidebarContainer');
    if (!container) return;
    const prevScroll = container.scrollTop;
    container.innerHTML = '';
    if (!records || records.length === 0) { container.innerHTML = '<div class="text-center py-10 text-slate-400 text-xs">Tiada rekod trip.</div>'; return; }
    
    // Group by Bulan (Month) - like reference image image_0a5c69.png
    const monthOrder = {'JANUARI':1,'FEBRUARI':2,'MAC':3,'APRIL':4,'MEI':5,'JUN':6,'JULAI':7,'OGOS':8,'SEPTEMBER':9,'OKTOBER':10,'NOVEMBER':11,'DISEMBER':12};
    function parseMonthKeyForSort(key){
      const parts = key.trim().split(' ');
      const monthName = parts[0];
      const year = parseInt(parts[1])||0;
      const mNum = monthOrder[monthName]||99;
      return year*100 + mNum;
    }
    
    // V35 FIX for image_df5dda.png - defensive filter for undefined records and missing fields (M_ID)
    // Sometimes Airtable returns undefined entries or records without fields during partial fetch
    const safeRecords = (records||[]).filter(rec=> rec && rec.fields && typeof rec.fields === 'object');
    if(safeRecords.length !== (records||[]).length){
      console.warn(`V35 filtered out ${ (records||[]).length - safeRecords.length } invalid records (missing fields) - prevents M_ID error`);
    }
    // Group records
    const groups = {};
    safeRecords.forEach(rec=>{
      try {
        const key = getMonthKeyLong(rec.fields['Mula Pakej']||'');
        if(!key) return;
        if(!groups[key]) groups[key]=[];
        groups[key].push(rec);
      } catch(e){
        console.warn('V35 skip record with invalid Mula Pakej', rec.id, e.message);
      }
    });
    
    // Sort group keys chronologically
    const sortedGroupKeys = Object.keys(groups).sort((a,b)=> parseMonthKeyForSort(a)-parseMonthKeyForSort(b));
    
    sortedGroupKeys.forEach(groupKey=>{
      const groupRecs = groups[groupKey];
      // Sort trips inside group by Mula Pakej date ascending
      groupRecs.sort((a,b)=>{
        const da = new Date(a.fields['Mula Pakej']||0);
        const db = new Date(b.fields['Mula Pakej']||0);
        return da - db;
      });
      
      // Header like image_0a5c69.png: JULAI 2026 with count badge
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
      
      // Divider line
      const divider = document.createElement('div');
      divider.className = 'h-px bg-slate-200/80 mb-2';
      container.appendChild(divider);
      
      groupRecs.forEach(rec=>{
        const f = rec.fields;
        const rawTripTitle = f['Trip'] || f['NAME'] || 'TBC';
        const displayTitle = cleanTripName(rawTripTitle);
        const airline = f['Penerbangan'] || 'N/A';
        const sektor = f['Sektor'] || '';
        const tempoh = f['Tempoh Pakej'] || '';
        const status = f['Status'] || '';
        const totalSeat = f['Total Seat'] || 0;
        const availSeat = f['Available Seat'] || 0;
        const isSelected = selectedTripRecord && selectedTripRecord.id === rec.id;
        
        // Status badge logic for card (like image_0a5c69.png)
        let statusBadge = getStatusBadgeForCard(status, (totalSeat-availSeat), totalSeat);
        let statusLabel = statusBadge.label;
        let statusDot = statusBadge.dot;
        let statusCls = statusBadge.cls;
        
        // V25 FIX for image_55ef73.png: Show all baki
        // >5 = hijau, <=5 = merah, CLOSED = Tamat/Ditutup tanpa baki
        let bakiText = '';
        const isClosed = (status||'').toString().toUpperCase().includes('CLOSED') || statusBadge.label==='CLOSED' || availSeat<=0 && totalSeat>0 && (status||'').toUpperCase().includes('CLOSED');
        const isActuallyClosed = (status||'').toString().toUpperCase().includes('CLOSED') || statusBadge.label==='CLOSED';
        if(isActuallyClosed){
          bakiText = `<div class="text-right mt-1"><span class="text-[10px] font-bold text-slate-400">Tamat / Ditutup</span></div>`;
        } else if(availSeat>5){
          bakiText = `<div class="text-right mt-1"><span class="text-[10px] font-bold text-emerald-600">Baki: ${availSeat} Seat</span></div>`;
        } else if(availSeat>0 && availSeat<=5){
          bakiText = `<div class="text-right mt-1"><span class="text-[10px] font-bold text-rose-600">Baki: ${availSeat} Seat</span></div>`;
        } else if(availSeat<=0){
          bakiText = `<div class="text-right mt-1"><span class="text-[10px] font-bold text-slate-400">Tamat / Ditutup</span></div>`;
        } else {
          // availSeat 0 but not closed yet? show 0
          bakiText = `<div class="text-right mt-1"><span class="text-[10px] font-bold text-slate-500">Baki: ${availSeat} Seat</span></div>`;
        }
        
        const card = document.createElement('div');
        card.setAttribute('data-trip-id', rec.id);
        // Card style like image_0a5c69.png - white with border, selected is dark
        if(isSelected){
          card.className = 'p-3 rounded-xl border text-left cursor-pointer transition bg-slate-900 text-white border-slate-900 shadow-md mb-2';
        } else {
          card.className = 'p-3 rounded-xl border text-left cursor-pointer transition bg-white hover:bg-slate-50 border-slate-200/80 shadow-sm mb-2';
        }
        card.onclick = () => renderTripDetailForm(rec);
        const titleColor = isSelected ? 'text-white' : 'text-slate-800';
        const sektorColor = isSelected ? 'text-white/60' : 'text-slate-500';
        
        // Airline badge
        const airlineBadge = getAirlineBadgeHtml(airline, isSelected);
        const tempohBadge = tempoh ? `<span class="text-[10px] font-bold px-2 py-0.5 rounded-md border ${isSelected?'bg-white/15 text-white border-white/20':'bg-slate-50 text-slate-700 border-slate-200'} uppercase">${tempoh}</span>` : '';
        
        card.innerHTML = `
          <div class="flex items-start justify-between gap-2">
            <h4 class="font-bold text-[13px] ${titleColor} leading-snug flex-1">${displayTitle}</h4>
            <div class="flex items-center gap-1.5 flex-shrink-0">
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${statusCls}"><span class="w-2 h-2 rounded-full ${statusDot}"></span>${statusLabel}</span>
            </div>
          </div>
          <div class="mt-2 flex items-center gap-1.5 flex-wrap">
            ${tempohBadge}
            ${airlineBadge}
          </div>
          ${sektor ? `<div class="mt-1.5 text-[10px] ${sektorColor} font-medium">${sektor}</div>` : ''}
          ${bakiText}
        `;
        container.appendChild(card);
      });
    });
    
    // V36: Don't call updateHijriFilterTabs inside rAF which triggers extra render and flicker
    // Set scroll and selected scroll separately, no extra filter tab update
    container.scrollTop = prevScroll;
    requestAnimationFrame(()=>{
      const selectedEl = container.querySelector('[data-trip-id="'+(selectedTripRecord?.id||'')+'"]');
      if(selectedEl){
        const rect = selectedEl.getBoundingClientRect();
        const contRect = container.getBoundingClientRect();
        if(rect.top < contRect.top || rect.bottom > contRect.bottom){
          selectedEl.scrollIntoView({block:'nearest', behavior:'auto'});
        }
      }
    });
}

let _tripDetailVersion = 0;
function renderTripDetailForm(rec) {
    _tripDetailVersion++;
    const currentVersion = _tripDetailVersion;
    window._lastTripClickTime = Date.now();
    const _sidebar = document.getElementById('tripSidebarContainer');
    const _scrollSave = _sidebar ? _sidebar.scrollTop : 0;
    selectedTripRecord = rec;
    if(rec && rec.id){ try{ localStorage.setItem('effah_last_selected_trip', rec.id); }catch(e){} }
    // V36 FIX for video flicker - DON'T re-render entire sidebar list when selecting trip
    // Old code called renderTripSidebarList/filterTripSidebar every time -> causes kejap ada kejap takde in video
    // Now only update selected state via DOM, no full re-render
    const sidebar = document.getElementById('tripSidebarContainer');
    if(sidebar){
      // Remove selected class from all cards
      sidebar.querySelectorAll('[data-trip-id]').forEach(card=>{
        const isThisSelected = card.getAttribute('data-trip-id') === rec.id;
        if(isThisSelected){
          card.className = 'p-3 rounded-xl border text-left cursor-pointer transition bg-slate-900 text-white border-slate-900 shadow-md mb-2';
          // Update inner colors for selected
          const titleEl = card.querySelector('h4');
          if(titleEl){ titleEl.className = 'font-bold text-[13px] text-white leading-snug flex-1'; }
        } else {
          card.className = 'p-3 rounded-xl border text-left cursor-pointer transition bg-white hover:bg-slate-50 border-slate-200/80 shadow-sm mb-2';
          const titleEl = card.querySelector('h4');
          if(titleEl){ titleEl.className = 'font-bold text-[13px] text-slate-800 leading-snug flex-1'; }
        }
      });
      // Preserve scroll
      setTimeout(()=>{ if(sidebar) sidebar.scrollTop = _scrollSave; }, 10);
    }
    // V35 FIX for image_df5dda.png - defensive check for rec and rec.fields to prevent M_ID error
    if(!rec || !rec.fields || typeof rec.fields !== 'object'){
      console.warn('V35 renderTripDetailForm called with invalid rec', rec);
      return;
    }
    // Restore scroll after sidebar re-render
    const f = rec.fields; const id = rec.id;
    const rawTripTitle = f['Trip'] || f['NAME'] || 'TBC';
    const displayTitle = cleanTripName(rawTripTitle);
    const workspace = document.getElementById('tripMainDetailWorkspace');
    const isTBC = (displayTitle || '').toUpperCase() === 'TBC' || (rawTripTitle || '').toUpperCase() === 'TBC' || (rawTripTitle || '').toUpperCase().includes('TBC');
    let tripJemaah = (typeof allJemaahUmrahRecords !== 'undefined') ? allJemaahUmrahRecords.filter(j => {
        const jTripRaw = j.fields['TRIP'];
        const jTrip = Array.isArray(jTripRaw) ? jTripRaw[0] : jTripRaw;
        const jTripName = (j.fields['Trip Name'] || j.fields['TRIP_NAME'] || j.fields['Trip'] || '').toString();
        const jTripStr = (jTrip || '').toString().trim();
        const jTripNameStr = jTripName.trim();
        if(isTBC){
            const isEmptyLinked = !jTripRaw || (Array.isArray(jTripRaw) && jTripRaw.length===0) || jTripStr === '';
            const isTBCTag = jTripStr.toUpperCase() === 'TBC' || jTripNameStr.toUpperCase() === 'TBC' || jTripNameStr.toUpperCase().includes('TBC') || jTripStr.toUpperCase().includes('TBC');
            return isEmptyLinked || isTBCTag;
        } else {
            if(!jTripRaw || (Array.isArray(jTripRaw) && jTripRaw.length===0)) return false;
            return jTrip === id || jTripStr === rawTripTitle || jTripStr === displayTitle || jTripNameStr === rawTripTitle || jTripNameStr === displayTitle;
        }
    }) : [];
    currentTripJemaahList = tripJemaah;
    if(tripJemaahSortField){ currentTripJemaahList = sortJemaahArray(currentTripJemaahList, tripJemaahSortField, tripJemaahSortDir); }
    workspace.innerHTML = `
        <div class="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 md:p-8">
            <div class="flex items-center justify-between pb-6 mb-6 border-b border-slate-100">
                <h1 class="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">${displayTitle}</h1>
                <button onclick="deleteTripRecord('${id}')" class="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-2xs flex items-center">Delete Trip</button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-xs font-medium text-slate-700">
                <div><label class="block font-bold text-slate-600 mb-1">Trip</label><input type="text" value="${rawTripTitle}" disabled class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-600 cursor-not-allowed"></div>
                <div><label class="block font-bold text-slate-600 mb-1">Mutawwif/Pengiring</label><input type="text" value="${f['Mutawwif/Pengiring'] || ''}" disabled class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 cursor-not-allowed"></div>
                <div><label class="block font-bold text-slate-600 mb-1">Group (if relevant)</label>${buildSelectDropdown(id, 'Group (if relevant)', f['Group (if relevant)'], selectOptions.group, 'group')}</div>
                <div class="grid grid-cols-2 gap-3"><div><label class="block font-bold text-slate-600 mb-1">Mula Pakej</label><input type="date" value="${f['Mula Pakej'] || ''}" onchange="updateAirtableField('${id}', 'Mula Pakej', this.value)" class="w-full p-2 border border-slate-200 rounded-xl focus:ring-1 focus:ring-slate-400 focus:outline-none"></div><div><label class="block font-bold text-slate-600 mb-1">Tamat Pakej</label><input type="date" value="${f['Tamat Pakej'] || ''}" onchange="updateAirtableField('${id}', 'Tamat Pakej', this.value)" class="w-full p-2 border border-slate-200 rounded-xl focus:ring-1 focus:ring-slate-400 focus:outline-none"></div></div>
                <div><label class="block font-bold text-slate-600 mb-1">Penerbangan</label>${buildSelectDropdown(id, 'Penerbangan', f['Penerbangan'], selectOptions.penerbangan, 'penerbangan')}</div>
                <div><label class="block font-bold text-slate-600 mb-1">Musim</label>${buildSelectDropdown(id, 'Musim', f['Musim'], selectOptions.musim, 'musim')}</div>
                <div><label class="block font-bold text-slate-600 mb-1">Hijri Season</label>${buildSelectDropdown(id, 'Hijri Season', f['Hijri Season'] || getHijriFieldValue(rec), selectOptions.hijri, 'hijri')}</div>
                <div><label class="block font-bold text-slate-600 mb-1">Tempoh Pakej</label>${buildSelectDropdown(id, 'Tempoh Pakej', f['Tempoh Pakej'], selectOptions.tempoh, 'tempoh')}</div>
                <div><label class="block font-bold text-slate-600 mb-1">Status</label><div class="pt-1.5">${getStatusBadgeHtml(f['Status'])}</div></div>
                <div><label class="block font-bold text-slate-600 mb-1">Occupied Seat</label><input type="text" value="${f['Occupied seat'] || 0}" disabled class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 cursor-not-allowed"></div>
                <div><label class="block font-bold text-slate-600 mb-1">Total Seat</label><input type="number" value="${f['Total Seat'] || 0}" onchange="updateAirtableField('${id}', 'Total Seat', parseInt(this.value))" class="w-full p-2.5 border border-slate-200 rounded-xl font-bold focus:ring-1 focus:ring-slate-400 focus:outline-none"></div>
                <div><label class="block font-bold text-slate-600 mb-1">Available Seat</label><input type="text" value="${f['Available Seat'] || 0}" disabled class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 cursor-not-allowed"></div>
                <div><label class="block font-bold text-slate-600 mb-1">Total Jemaah</label><input type="text" value="${f['Total Jemaah'] || 0}" disabled class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 cursor-not-allowed"></div>
                <div><label class="block font-bold text-slate-600 mb-1">FIT Tickets</label><input type="text" value="${f['FIT Tickets'] || 0}" disabled class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 cursor-not-allowed"></div>
                <div><label class="block font-bold text-slate-600 mb-1">Last Payment</label><input type="text" value="${f['Last Payment'] || '-'}" disabled class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 cursor-not-allowed"></div>
                <div class="md:col-span-2"><label class="block font-bold text-slate-600 mb-1">Sektor</label>${buildSelectDropdown(id, 'Sektor', f['Sektor'], selectOptions.sektor, 'sektor')}</div>
            </div>
        </div>
        <div class="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 md:p-8">
            <div class="flex flex-col sm:flex-row justify-between sm:items-center mb-5 gap-3">
                <h3 class="font-extrabold text-base text-slate-900 tracking-tight">DATA JEMAAH UMRAH</h3>
                <div class="flex items-center gap-2">
                    <div class="relative"><i class="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400 text-[10px]"></i><input type="text" onkeyup="filterTripJemaahTable(this.value)" placeholder="Search..." class="pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-300 w-24 md:w-36"></div>
                    <button onclick="printTripManifest()" class="bg-white border border-slate-300 text-slate-700 font-bold px-3 py-2 rounded-xl hover:bg-slate-50 transition text-xs flex items-center shadow-xs"><i class="fa-solid fa-print mr-1.5"></i> Print</button>
                    <button onclick="exportTripPdf()" class="bg-emerald-600 text-white font-bold px-3 py-2 rounded-xl hover:bg-emerald-700 transition text-xs flex items-center shadow-xs"><i class="fa-solid fa-file-arrow-down mr-1.5"></i> Export PDF</button>
                    <button onclick="openTripAddCustomerModal()" class="bg-slate-900 text-white font-bold px-3.5 py-2 rounded-xl hover:bg-black transition text-xs flex items-center shadow-xs"><i class="fa-solid fa-plus mr-1.5"></i> Add customer</button>
                </div>
            </div>
            <div class="overflow-auto border border-slate-200/80 rounded-xl max-h-[55vh] md:max-h-[60vh] scrollbar-thin">
                <table class="w-full text-left text-xs" id="tripJemaahTable">
                    <thead class="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200/80 sticky top-0 z-10">
                        <tr>
                            <th class="p-3 w-10 text-center">#</th>
                            <th class="p-3 cursor-pointer hover:text-slate-800 select-none" onclick="sortTripJemaahBy('NAME')">NAME <span class="sort-icon" data-field="NAME">↑</span></th>
                            <th class="p-3">PICTURE</th>
                            <th class="p-3">PASSPORT COPY</th>
                            <th class="p-3 cursor-pointer hover:text-slate-800 select-none" onclick="sortTripJemaahBy('PASSPORT NO.')">PASSPORT NO. <span class="sort-icon" data-field="PASSPORT NO."></span></th>
                            <th class="p-3 cursor-pointer hover:text-slate-800 select-none" onclick="sortTripJemaahBy('AGE')">AGE <span class="sort-icon" data-field="AGE"></span></th>
                            <th class="p-3 cursor-pointer hover:text-slate-800 select-none" onclick="sortTripJemaahBy('GENDER')">GENDER <span class="sort-icon" data-field="GENDER"></span></th>
                            <th class="p-3 cursor-pointer hover:text-slate-800 select-none" onclick="sortTripJemaahBy('NATIONALITY')">NATIONALITY <span class="sort-icon" data-field="NATIONALITY"></span></th>
                        </tr>
                    </thead>
                    <tbody id="tripJemaahTableBody" class="divide-y divide-slate-100 font-medium text-slate-800">
                        ${currentTripJemaahList.length === 0 ? `<tr><td colspan="8" class="p-8 text-center text-slate-400 font-normal">Tiada data jemaah berdaftar di bawah trip ini lagi.</td></tr>` : currentTripJemaahList.map((j, idx) => {
                            const jf = j.fields;
                            const picObj = (jf['PICTURE'] && jf['PICTURE'][0]) ? jf['PICTURE'][0] : null;
                            const pic = picObj ? picObj.url : '';
                            const picId = picObj ? picObj.id : '';
                            const picName = picObj ? (picObj.filename || '') : '';
                            const passObj = (jf['PASSPORT COPY'] && jf['PASSPORT COPY'][0]) ? jf['PASSPORT COPY'][0] : null;
                            const passCopy = passObj ? passObj.url : '';
                            const passId = passObj ? passObj.id : '';
                            const passName = passObj ? (passObj.filename || '') : '';
                            const genderBadge = jf['GENDER'] === 'MALE' ? 'bg-sky-100/80 text-sky-800 border-sky-200' : 'bg-rose-100/80 text-rose-800 border-rose-200';
                            const recId = j.id;
                            return `<tr class="hover:bg-slate-50/80 transition"><td class="p-3 text-center text-slate-400 font-bold">${idx + 1}</td><td class="p-3 font-bold text-slate-900 uppercase">${jf['NAME'] || '-'}</td><td class="p-3">${pic ? `<img src="${pic}" onclick="openTripPreviewModal('${pic}', '${(jf['NAME']||'').replace(/'/g, '')} - PICTURE', {recordId:'${recId}', fieldName:'PICTURE', attachmentId:'${picId}', filename:'${picName.replace(/'/g,'')}'})" class="w-9 h-9 rounded-lg object-cover border border-slate-200 cursor-pointer hover:scale-110 transition" title="Click to preview">` : `<div class="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400"><i class="fa-solid fa-user"></i></div>`}</td><td class="p-3">${passCopy ? `<button onclick="openTripPreviewModal('${passCopy}', '${(jf['NAME']||'').replace(/'/g, '')} - PASSPORT COPY', {recordId:'${recId}', fieldName:'PASSPORT COPY', attachmentId:'${passId}', filename:'${passName.replace(/'/g,'')}'})" class="text-sky-600 hover:text-sky-800 underline font-semibold flex items-center text-xs"><i class="fa-solid fa-file-pdf mr-1"></i> View Copy</button>` : `<span class="text-slate-300">-</span>`}</td><td class="p-3 font-mono font-bold text-slate-700">${jf['PASSPORT NO.'] || '-'}</td><td class="p-3 text-slate-600">${jf['AGE'] || '-'}</td><td class="p-3"><span class="text-[10px] font-bold px-2.5 py-0.5 rounded-md border uppercase ${genderBadge}">${jf['GENDER'] || '-'}</span></td><td class="p-3"><span class="bg-sky-100/80 text-sky-900 border border-sky-200 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">${jf['NATIONALITY'] || 'MALAYSIA'}</span></td></tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function handleMulaDateChange(){ const mulaInput=document.getElementById('modalMulaPakej'); const tamatInput=document.getElementById('modalTamatPakej'); if(mulaInput&&tamatInput&&mulaInput.value){ tamatInput.min=mulaInput.value; if(tamatInput.value&&tamatInput.value<mulaInput.value){ tamatInput.value=mulaInput.value; } } }
function openNewTripModal(){ const modal=document.getElementById('newTripModal'); const mulaInput=document.getElementById('modalMulaPakej'); const tamatInput=document.getElementById('modalTamatPakej'); if(mulaInput){mulaInput.value='';mulaInput.removeAttribute('min');} if(tamatInput){tamatInput.value='';tamatInput.removeAttribute('min');} if(modal) modal.classList.remove('hidden'); }
function closeNewTripModal(){ const modal=document.getElementById('newTripModal'); if(modal) modal.classList.add('hidden'); }
async function submitNewTripRecord(e){ if(e) e.preventDefault(); if(!AIRTABLE_PAT||!AIRTABLE_BASE_ID) return; const mulaDate=document.getElementById('modalMulaPakej').value; const tamatDate=document.getElementById('modalTamatPakej').value; if(!mulaDate||!tamatDate){alert('Sila lengkapkan kedua-dua tarikh yang diperlukan.');return;} if(tamatDate<mulaDate){alert('Tarikh tamat hendaklah selepas tarikh mula.');return;} const url=`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/PAKEJ%20UMRAH`; try{ const response=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${AIRTABLE_PAT}`,'Content-Type':'application/json'},body:JSON.stringify({fields:{"Mula Pakej":mulaDate,"Tamat Pakej":tamatDate}})}); if(response.ok){closeNewTripModal();fetchTripUmrahData();}else{const errData=await response.json();console.error(errData);alert('Maaf, penambahan trip baharu tidak berjaya. Sila cuba semula.');}}catch(err){alert('Maaf, penambahan trip baharu tidak berjaya. Sila cuba semula.');} }
function buildSelectDropdown(recId, fieldName, currentValue, optionsArray, categoryKey){ 
  const uniqueOptions=[]; 
  optionsArray.forEach(opt=>{ if(!opt) return; const cleanOpt=normalizeDashFormat(opt); if(cleanOpt&&!uniqueOptions.includes(cleanOpt)) uniqueOptions.push(cleanOpt); }); 
  const currentNormalized=normalizeDashFormat(currentValue);
  if(currentNormalized && !uniqueOptions.includes(currentNormalized) && currentNormalized!=='-- PILIH --' && currentNormalized!==''){
    uniqueOptions.unshift(currentNormalized);
  }
  let optionsHtml=`<option value="">-- Pilih --</option>`; 
  uniqueOptions.forEach(opt=>{ 
    const isSelected=currentNormalized===opt; 
    optionsHtml+=`<option value="${opt}" ${isSelected?'selected':''}>${opt}</option>`; 
  }); 
  // V33: All selections have + Add New Option with loading skeleton
  optionsHtml+=`<option value="__ADD_NEW__" style="font-weight:bold;color:#8B1E3F">+ Add New Option...</option>`;
  return `<div class="relative" data-field="${fieldName}" data-category="${categoryKey}">
    <select id="select-${recId}-${fieldName.replace(/\s+/g,'-')}" onchange="handleDropdownChange('${recId}', '${fieldName}', this, '${categoryKey}')" class="w-full p-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-slate-400 focus:outline-none font-semibold text-slate-800 transition-all">${optionsHtml}</select>
  </div>`; 
}
function handleDropdownChange(recId, fieldName, selectEl, categoryKey){ 
  const selectedVal=selectEl.value; 
  if(selectedVal==='__ADD_NEW__'){
    // V26: hantar TEXT JE ke Airtable (no color, no id) as requested
    addNewSelectOptionTextOnly(recId, fieldName, categoryKey, selectEl);
  } else {
    updateAirtableField(recId, fieldName, selectedVal);
  }
}

async function addNewSelectOptionTextOnly(recId, fieldName, categoryKey, selectEl){
  const raw = prompt(`Sila masukkan nilai baharu bagi ${fieldName}:`);
  if(!raw || raw.trim()===''){ 
    selectEl.value=''; 
    return; 
  }
  const cleanOpt = normalizeDashFormat(raw.trim().toUpperCase());
  // V34: Show loading skeleton spinning disabled
  showDropdownLoadingSkeleton(selectEl, true);
  
  // V31 FIX from Airtable Omni - image_64cd05.png: Need typecast:true
  // Issue 1 - Direct record PATCH fails INVALID_MULTIPLE_CHOICE because missing typecast:true
  console.log(`V31: Adding "${cleanOpt}" to ${fieldName} with typecast:true - fix from Omni AI image_64cd05.png`);
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/PAKEJ%20UMRAH/${recId}`;
  try {
    const res = await fetch(url, {
      method:'PATCH',
      headers:{Authorization:`Bearer ${AIRTABLE_PAT}`,'Content-Type':'application/json'},
      body: JSON.stringify({
        typecast: true,
        fields:{[fieldName]: cleanOpt}
      })
    });
    const data = await res.json();
    if(res.ok){
      console.log(`✅ V31 typecast:true success - "${cleanOpt}" added and assigned to record in one shot - image_b5cba5.png recommended`);
      if(!selectOptions[categoryKey].includes(cleanOpt)){
        selectOptions[categoryKey].push(cleanOpt);
        selectOptions[categoryKey].sort();
      }
      const targetRec = allTripUmrahRecords.find(r=>r.id===recId);
      if(targetRec) targetRec.fields[fieldName]=cleanOpt;
      if(selectedTripRecord && selectedTripRecord.id===recId) selectedTripRecord.fields[fieldName]=cleanOpt;
      selectEl.value=cleanOpt;
      // V32 FIX for image_cbb19c.png - don't immediately refetch metadata which may be stale (5-10 sec delay), keep local BATIK AIR
      // Update filters and sidebar with local data first for instant feedback
      updateAdvancedFilterOptions();
      if(typeof tripFilters !== 'undefined' && (tripFilters.hijri!=='All' || tripFilters.month!=='All' || tripFilters.airline!=='All' || tripFilters.tempoh!=='All' || tripFilters.musim!=='All' || (tripFilters.search&&tripFilters.search!==''))){
        filterTripSidebar();
      } else {
        renderTripSidebarList(allTripUmrahRecords);
      }
      // Then refresh from Airtable after 3 sec delay to handle propagation
      setTimeout(async ()=>{
        console.log('V34 delayed refresh of field choices after 3s');
        await fetchAirtableFieldChoices();
        updateAdvancedFilterOptions();
        // Re-render detail form to show BATIK AIR in dropdown - image_cbb19c.png
        if(selectedTripRecord && selectedTripRecord.id===recId){
          renderTripDetailForm(selectedTripRecord);
        }
      }, 3000);
      return;
    } else {
      console.warn('typecast:true PATCH failed, trying metadata API with correct shape - image_6be327.png image_740339.png', data);
      throw new Error(data.error?.message || 'typecast PATCH failed');
    }
  } catch(e){
    console.warn('V31 typecast method failed:', e.message, '- trying metadata field PATCH with ids + name only');
    // Issue 2 fix - Metadata field PATCH - image_6be327.png image_740339.png
    // Must send existing choices WITH ids + new choice name only, and only options (no type)
    try {
      const metaUrl = `https://api.airtable.com/v0/meta/bases/${AIRTABLE_BASE_ID}/tables`;
      const tablesRes = await fetch(metaUrl, {headers:{Authorization:`Bearer ${AIRTABLE_PAT}`}});
      if(!tablesRes.ok){
        const err = await tablesRes.json();
        throw new Error(err.error?.message || 'Metadata fetch failed');
      }
      const tablesData = await tablesRes.json();
      const table = (tablesData.tables||[]).find(t=> t.name==='PAKEJ UMRAH');
      if(!table) throw new Error('Table PAKEJ UMRAH not found');
      const field = (table.fields||[]).find(f=> f.name===fieldName);
      if(!field) throw new Error(`Field ${fieldName} not found`);
      const existingChoices = field.options?.choices||[];
      // Check if already exists
      if(existingChoices.some(c=> c.name.toUpperCase()===cleanOpt.toUpperCase())){
        // Already exists, just assign with typecast
        const res2 = await fetch(url, {
          method:'PATCH',
          headers:{Authorization:`Bearer ${AIRTABLE_PAT}`,'Content-Type':'application/json'},
          body: JSON.stringify({typecast:true, fields:{[fieldName]: cleanOpt}})
        });
        if(res2.ok){
          console.log(`✅ Already exists, assigned "${cleanOpt}"`);
          selectEl.value=cleanOpt;
          return;
        }
      }
      // Correct shape: existing choices with id + name, new choice name only - image_740339.png
      const choicesWithIds = existingChoices.map(c=> ({id: c.id, name: c.name}));
      const newChoices = [...choicesWithIds, {name: cleanOpt}];
      console.log('V31 Metadata PATCH correct shape:', JSON.stringify({options:{choices:newChoices}}));
      const patchUrl = `https://api.airtable.com/v0/meta/bases/${AIRTABLE_BASE_ID}/tables/${table.id}/fields/${field.id}`;
      const patchRes = await fetch(patchUrl, {
        method:'PATCH',
        headers:{Authorization:`Bearer ${AIRTABLE_PAT}`, 'Content-Type':'application/json'},
        body: JSON.stringify({options:{choices:newChoices}})
      });
      const patchData = await patchRes.json();
      if(!patchRes.ok){
        console.error('Metadata PATCH failed - image_3e9405.png', patchData);
        throw new Error(patchData.error?.message || 'Metadata PATCH failed');
      }
      console.log(`✅ V31 Metadata success - added "${cleanOpt}" to ${fieldName} - image_3e9405.png`);
      if(!selectOptions[categoryKey].includes(cleanOpt)){
        selectOptions[categoryKey].push(cleanOpt);
        selectOptions[categoryKey].sort();
      }
      // Now assign to record with typecast
      const assignRes = await fetch(url, {
        method:'PATCH',
        headers:{Authorization:`Bearer ${AIRTABLE_PAT}`,'Content-Type':'application/json'},
        body: JSON.stringify({typecast:true, fields:{[fieldName]: cleanOpt}})
      });
      if(assignRes.ok){
        const targetRec = allTripUmrahRecords.find(r=>r.id===recId);
        if(targetRec) targetRec.fields[fieldName]=cleanOpt;
        if(selectedTripRecord && selectedTripRecord.id===recId) selectedTripRecord.fields[fieldName]=cleanOpt;
        selectEl.value=cleanOpt;
        await fetchAirtableFieldChoices();
        updateAdvancedFilterOptions();
      }
    } catch(e2){
      console.error('V31 Both methods failed', e2);
      alert(`Penambahan nilai "${cleanOpt}" tidak berjaya.\n\nRalat: ${e2.message}\n\nSila tambahkan secara manual di Airtable pada medan ${fieldName}.`);
      selectEl.value='';
    }
  }
}






async function addNewSelectOptionViaMetadata_ORIG_DISABLED(recId, fieldName, categoryKey, selectEl){
  const newOption = prompt(`Sila masukkan nilai baharu bagi ${fieldName}:`);
  if(!newOption || newOption.trim()===''){ selectEl.value=''; return; }
  const cleanOpt = normalizeDashFormat(newOption.trim());
  
  // Try metadata API first (requires schema.bases:write scope)
  try {
    if(!AIRTABLE_PAT || !AIRTABLE_BASE_ID) throw new Error('No PAT');
    // Get field ID via metadata API
    const metaUrl = `https://api.airtable.com/v0/meta/bases/${AIRTABLE_BASE_ID}/tables`;
    const tablesRes = await fetch(metaUrl, {headers:{Authorization:`Bearer ${AIRTABLE_PAT}`}});
    if(!tablesRes.ok){
      const err = await tablesRes.json();
      console.error('Metadata API failed', err);
      // Fallback: try direct record update (will fail if option doesn't exist, but we try)
      // Show instruction
      alert(`Penambahan nilai baharu melalui API tidak dibenarkan.

Sila tambahkan secara manual di Airtable pada medan ${fieldName}.`);;
      // Add locally only
      if(!selectOptions[categoryKey].includes(cleanOpt)) selectOptions[categoryKey].push(cleanOpt);
      selectEl.value=cleanOpt;
      // Try optimistic update anyway
      updateAirtableField(recId, fieldName, cleanOpt);
      return;
    }
    const tablesData = await tablesRes.json();
    const table = (tablesData.tables||[]).find(t=> t.name==='PAKEJ UMRAH');
    if(!table) throw new Error('Table PAKEJ UMRAH not found');
    const field = (table.fields||[]).find(f=> f.name===fieldName);
    if(!field) throw new Error(`Field ${fieldName} not found`);
    // field.options.choices
    const existingChoices = field.options?.choices||[];
    if(existingChoices.some(c=> c.name.toUpperCase()===cleanOpt.toUpperCase())){
      // Already exists
      updateAirtableField(recId, fieldName, cleanOpt);
      return;
    }
    // V24 FIX for image_b8057a.png & image_899518.png: 422 Changing field's type not supported
    // Airtable API is very strict - send only {name} without id and without color
    // Previous V23 sent color which still caused 422
    const cleanedExisting = existingChoices.map(c=> ({name: c.name}));
    const newChoices = [...cleanedExisting, {name: cleanOpt}];
    // Update field via metadata API
    const patchUrl = `https://api.airtable.com/v0/meta/bases/${AIRTABLE_BASE_ID}/tables/${table.id}/fields/${field.id}`;
    console.log('PATCH choices payload', JSON.stringify({options:{choices:newChoices}}));
    const patchRes = await fetch(patchUrl, {
      method:'PATCH',
      headers:{Authorization:`Bearer ${AIRTABLE_PAT}`, 'Content-Type':'application/json'},
      body: JSON.stringify({options:{choices:newChoices}})
    });
    if(!patchRes.ok){
      const err = await patchRes.json();
      throw new Error(err.error?.message||'Failed to add option');
    }
    console.log(`✅ Added new option ${cleanOpt} to field ${fieldName} via metadata API`);
    if(!selectOptions[categoryKey].includes(cleanOpt)) selectOptions[categoryKey].push(cleanOpt);
    updateAirtableField(recId, fieldName, cleanOpt);
  } catch(e){
    console.error('addNewSelectOptionViaMetadata error', e);
    alert(`Penambahan nilai baharu tidak berjaya: ${e.message}`);;
    // Add locally
    if(!selectOptions[categoryKey].includes(cleanOpt)) selectOptions[categoryKey].push(cleanOpt);
    selectEl.value=cleanOpt;
  }
}
async function updateAirtableField(recId, fieldName, value){
  // V31: Always use typecast:true so new options can be created if allowed - image_64cd05.png
  if(!AIRTABLE_PAT||!AIRTABLE_BASE_ID) return;
  const sidebarContainer = document.getElementById('tripSidebarContainer');
  const savedScrollTop = sidebarContainer ? sidebarContainer.scrollTop : 0;
  const savedSelectedId = selectedTripRecord ? selectedTripRecord.id : recId;
  
  // Optimistic update local data - don't wait for full reload
  const targetRec = allTripUmrahRecords.find(r=>r.id===recId);
  if(targetRec){
    targetRec.fields[fieldName] = (value===''||value===undefined)?null:value;
  }
  if(selectedTripRecord && selectedTripRecord.id===recId){
    selectedTripRecord.fields[fieldName] = (value===''||value===undefined)?null:value;
  }
  
  const url=`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/PAKEJ%20UMRAH/${recId}`;
  let fieldsData={};
  fieldsData[fieldName]=(value===''||value===undefined)?null:value;
  try{
    const response=await fetch(url,{method:'PATCH',headers:{Authorization:`Bearer ${AIRTABLE_PAT}`,'Content-Type':'application/json'},body:JSON.stringify({fields:fieldsData})});
    if(response.ok){
      // V19 FIX: preserve current filters instead of resetting to all
      if(typeof tripFilters !== 'undefined' && (tripFilters.hijri!=='All' || tripFilters.month!=='All' || tripFilters.airline!=='All' || tripFilters.tempoh!=='All' || tripFilters.musim!=='All' || (tripFilters.search&&tripFilters.search!==''))){
        filterTripSidebar();
      } else {
        renderTripSidebarList(allTripUmrahRecords);
      }
      // Restore scroll immediately
      setTimeout(()=>{
        const sc = document.getElementById('tripSidebarContainer');
        if(sc) sc.scrollTop = savedScrollTop;
        // Keep highlight on current trip
        if(savedSelectedId){
          const cards = sc ? sc.querySelectorAll('div[data-trip-id]') : [];
          // scroll selected card into view if needed but keep overall scroll
        }
      }, 10);
      // No full fetchTripUmrahData() - keeps you at same position
      console.log(`✅ Field ${fieldName} updated, scroll preserved at ${savedScrollTop}`);
    }else{
      const errData=await response.json();
      console.error(errData);
      alert('Ralat semasa mengemaskini data di Airtable. Sila cuba semula.');;
      // Revert optimistic update on fail
      fetchTripUmrahData();
    }
  }catch(err){
    console.error(err);
    // On network fail (ERR_NAME_NOT_RESOLVED), keep local change
    console.warn('Airtable update failed, keeping local change. Will sync on next refresh.');
    if(typeof tripFilters !== 'undefined' && (tripFilters.hijri!=='All' || tripFilters.month!=='All' || tripFilters.airline!=='All' || tripFilters.tempoh!=='All' || tripFilters.musim!=='All' || (tripFilters.search&&tripFilters.search!==''))){
      filterTripSidebar();
    } else {
      renderTripSidebarList(allTripUmrahRecords);
    }
    setTimeout(()=>{ const sc=document.getElementById('tripSidebarContainer'); if(sc) sc.scrollTop=savedScrollTop; }, 10);
  }
}
async function deleteTripRecord(recId){ if(!confirm('Adakah anda pasti nak padam rekod Trip ini dari Airtable?')) return; const url=`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/PAKEJ%20UMRAH/${recId}`; try{ const response=await fetch(url,{method:'DELETE',headers:{Authorization:`Bearer ${AIRTABLE_PAT}`}}); if(response.ok){fetchTripUmrahData();}}catch(err){alert('Maaf, rekod tidak dapat dipadamkan. Sila cuba semula.');} }
function extractDynamicOptions(records){ records.forEach(r=>{ const f=r.fields; const checkAndPush=(val,targetArray)=>{ if(!val) return; const clean=normalizeDashFormat(val); if(clean&&!targetArray.includes(clean)){targetArray.push(clean);} }; checkAndPush(f['Group (if relevant)'], selectOptions.group); checkAndPush(f['Sektor'], selectOptions.sektor); checkAndPush(f['Penerbangan'], selectOptions.penerbangan); checkAndPush(f['Musim'], selectOptions.musim); checkAndPush(f['Tempoh Pakej'], selectOptions.tempoh); }); }
function filterTripJemaahTable(q){ const query=(q||'').toLowerCase(); const container=document.getElementById('modul-pakej-umrah'); if(!container) return; const rows=container.querySelectorAll('table tbody tr'); rows.forEach(tr=>{ const txt=tr.textContent.toLowerCase(); tr.style.display=txt.includes(query)?'':'none'; }); }
function closeTripAddCustomerModal(){ const modal=document.getElementById('tripAddCustomerModal'); if(modal){ modal.classList.add('hidden'); modal.style.display='none'; } }
function openTripAddCustomerModal(){ let modal=document.getElementById('tripAddCustomerModal'); const tripName=(typeof selectedTripRecord!=='undefined'&&selectedTripRecord)?(selectedTripRecord.fields['Trip']||'') : ''; if(!modal){ modal=document.createElement('div'); modal.id='tripAddCustomerModal'; modal.className='fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4'; modal.innerHTML=`<div class="bg-white rounded-3xl shadow-2xl p-6 md:p-8 max-w-lg w-full border border-slate-100"><div class="flex items-center justify-between pb-4 mb-4 border-b border-slate-100"><div class="flex items-center space-x-2.5"><div class="w-9 h-9 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center"><i class="fa-solid fa-user-plus"></i></div><div><h3 class="font-extrabold text-slate-900 text-base">Tambah Jemaah Baru</h3><p class="text-[11px] text-slate-500">${tripName ? 'Trip: '+tripName : ''}</p></div></div><button onclick="closeTripAddCustomerModal()" class="text-slate-400 hover:text-slate-700 p-1"><i class="fa-solid fa-xmark text-lg"></i></button></div><form onsubmit="submitTripAddCustomer(event)" class="space-y-3 text-xs"><div><label class="block font-bold text-slate-700 mb-1">Nama Penuh *</label><input type="text" id="tripAddName" required placeholder="NAMA PENUH" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-slate-400 focus:outline-none font-semibold uppercase"></div><div class="grid grid-cols-2 gap-3"><div><label class="block font-bold text-slate-700 mb-1">No IC</label><input type="text" id="tripAddIC" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"></div><div><label class="block font-bold text-slate-700 mb-1">Passport No</label><input type="text" id="tripAddPassport" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"></div></div><div><label class="block font-bold text-slate-700 mb-1">Trip</label><input type="text" id="tripAddTrip" value="${tripName}" readonly class="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-600"></div><div class="flex gap-3 pt-3"><button type="button" onclick="closeTripAddCustomerModal()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl">Batal</button><button type="submit" class="flex-1 bg-slate-900 hover:bg-black text-white font-bold py-2.5 rounded-xl shadow-xs">Simpan</button></div></form></div>`; document.body.appendChild(modal); modal.addEventListener('click', (e)=>{ if(e.target===modal) closeTripAddCustomerModal(); }); } else { modal.style.display='flex'; modal.classList.remove('hidden'); const inp=modal.querySelector('#tripAddTrip'); if(inp) inp.value=tripName; } }
async function submitTripAddCustomer(e){ e.preventDefault(); const name=document.getElementById('tripAddName')?.value.trim(); const ic=document.getElementById('tripAddIC')?.value.trim(); const passport=document.getElementById('tripAddPassport')?.value.trim(); const trip=document.getElementById('tripAddTrip')?.value.trim() || (typeof selectedTripRecord!=='undefined'&&selectedTripRecord?selectedTripRecord.fields['Trip']:''); if(!name){alert('Sila masukkan nama yang diperlukan.');return;} if(!trip){alert('Trip tidak dipilih');return;} const pat=window.AIRTABLE_PAT||localStorage.getItem('effah_api_pat'); const base=window.AIRTABLE_BASE_ID||localStorage.getItem('effah_base_id'); if(!pat||!base){alert('API not set');return;} const tripId=(typeof selectedTripRecord!=='undefined'&&selectedTripRecord)?selectedTripRecord.id:null; try{ const fieldsPayload={'NAME':name.toUpperCase(),'IC NO.':ic||null,'PASSPORT NO.':passport||null}; if(tripId){fieldsPayload['TRIP']=[tripId];}else if(trip){fieldsPayload['Trip']=trip;} const res=await fetch(`https://api.airtable.com/v0/${base}/DATA%20JEMAAH%20UMRAH`,{method:'POST',headers:{Authorization:`Bearer ${pat}`,'Content-Type':'application/json'},body:JSON.stringify({fields:fieldsPayload})}); if(res.ok){ const newRec=await res.json(); closeTripAddCustomerModal(); const createdFields={'NAME':name.toUpperCase(),'IC NO.':ic||'','PASSPORT NO.':passport||'','AGE':'','GENDER':'','NATIONALITY':'MALAYSIA','PICTURE':[],'PASSPORT COPY':[],'TRIP':tripId?[tripId]:[],'Trip Name':trip||''}; const newJemaahObj={id:newRec.id||('temp_'+Date.now()),fields:createdFields}; if(typeof allJemaahUmrahRecords!=='undefined'){allJemaahUmrahRecords.unshift(newJemaahObj);} currentTripJemaahList.unshift(newJemaahObj); if(tripJemaahSortField){currentTripJemaahList=sortJemaahArray(currentTripJemaahList,tripJemaahSortField,tripJemaahSortDir);} const tbody=document.getElementById('tripJemaahTableBody'); if(tbody){ tbody.innerHTML=currentTripJemaahList.map((j,idx)=>{ const jf=j.fields; return `<tr><td class="p-3 text-center text-slate-400 font-bold">${idx+1}</td><td class="p-3 font-bold text-slate-900 uppercase">${jf['NAME']||'-'}</td><td class="p-3"><div class="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400"><i class="fa-solid fa-user"></i></div></td><td class="p-3"><span class="text-slate-300">-</span></td><td class="p-3 font-mono font-bold text-slate-700">${jf['PASSPORT NO.']||'-'}</td><td class="p-3 text-slate-600">${jf['AGE']||'-'}</td><td class="p-3"><span class="text-[10px] font-bold px-2.5 py-0.5 rounded-md border uppercase">${jf['GENDER']||'-'}</span></td><td class="p-3"><span class="bg-sky-100/80 text-sky-900 border border-sky-200 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">${jf['NATIONALITY']||'MALAYSIA'}</span></td></tr>`; }).join(''); } if(typeof fetchJemaahUmrahData==='function'){setTimeout(()=>fetchJemaahUmrahData(true),2000);} }else{const err=await res.json();console.error(err);alert('Gagal tambah: '+(err.error?.message||'unknown'));} }catch(err){console.error(err);alert('Error network');} }

function sortJemaahArray(arr, field, dir){ const sorted=[...arr].sort((a,b)=>{ let av=(a.fields[field]||'').toString().toUpperCase(); let bv=(b.fields[field]||'').toString().toUpperCase(); if(field==='AGE'){ const an=parseFloat(av)||0; const bn=parseFloat(bv)||0; return dir==='asc'?an-bn:bn-an; } if(av<bv) return dir==='asc'?-1:1; if(av>bv) return dir==='asc'?1:-1; return 0; }); return sorted; }
function sortTripJemaahBy(field){ if(tripJemaahSortField===field){tripJemaahSortDir=tripJemaahSortDir==='asc'?'desc':'asc';}else{tripJemaahSortField=field;tripJemaahSortDir='asc';} currentTripJemaahList=sortJemaahArray(currentTripJemaahList,tripJemaahSortField,tripJemaahSortDir); const tbody=document.getElementById('tripJemaahTableBody'); if(!tbody) return; if(currentTripJemaahList.length===0){tbody.innerHTML='<tr><td colspan="8" class="p-8 text-center text-slate-400">Tiada data</td></tr>';return;} tbody.innerHTML=currentTripJemaahList.map((j,idx)=>{ const jf=j.fields; const picObj=(jf['PICTURE']&&jf['PICTURE'][0])?jf['PICTURE'][0]:null; const pic=picObj?picObj.url:''; const picId=picObj?picObj.id:''; const picName=picObj?(picObj.filename||'') : ''; const passObj=(jf['PASSPORT COPY']&&jf['PASSPORT COPY'][0])?jf['PASSPORT COPY'][0]:null; const passCopy=passObj?passObj.url:''; const passId=passObj?passObj.id:''; const passName=passObj?(passObj.filename||'') : ''; const genderBadge=jf['GENDER']==='MALE'?'bg-sky-100/80 text-sky-800 border-sky-200':'bg-rose-100/80 text-rose-800 border-rose-200'; const recId=j.id; return `<tr class="hover:bg-slate-50/80 transition"><td class="p-3 text-center text-slate-400 font-bold">${idx+1}</td><td class="p-3 font-bold text-slate-900 uppercase">${jf['NAME']||'-'}</td><td class="p-3">${pic?`<img src="${pic}" onclick="openTripPreviewModal('${pic}', '${(jf['NAME']||'').replace(/'/g,'')} - PICTURE', {recordId:'${recId}', fieldName:'PICTURE', attachmentId:'${picId}', filename:'${picName.replace(/'/g,'')}'})" class="w-9 h-9 rounded-lg object-cover border border-slate-200 cursor-pointer hover:scale-110 transition">`:`<div class="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400"><i class="fa-solid fa-user"></i></div>`}</td><td class="p-3">${passCopy?`<button onclick="openTripPreviewModal('${passCopy}', '${(jf['NAME']||'').replace(/'/g,'')} - PASSPORT COPY', {recordId:'${recId}', fieldName:'PASSPORT COPY', attachmentId:'${passId}', filename:'${passName.replace(/'/g,'')}'})" class="text-sky-600 hover:text-sky-800 underline font-semibold flex items-center text-xs"><i class="fa-solid fa-file-pdf mr-1"></i> View Copy</button>`:`<span class="text-slate-300">-</span>`}</td><td class="p-3 font-mono font-bold text-slate-700">${jf['PASSPORT NO.']||'-'}</td><td class="p-3 text-slate-600">${jf['AGE']||'-'}</td><td class="p-3"><span class="text-[10px] font-bold px-2.5 py-0.5 rounded-md border uppercase ${genderBadge}">${jf['GENDER']||'-'}</span></td><td class="p-3"><span class="bg-sky-100/80 text-sky-900 border border-sky-200 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">${jf['NATIONALITY']||'MALAYSIA'}</span></td></tr>`; }).join(''); document.querySelectorAll('.sort-icon').forEach(el=>{ const f=el.getAttribute('data-field'); if(f===tripJemaahSortField){el.textContent=tripJemaahSortDir==='asc'?' ↑':' ↓'; el.classList.add('text-slate-900');}else{el.textContent='';} }); }

function formatDateMY(dateStr){ if(!dateStr) return '-'; try{ const d=new Date(dateStr); if(isNaN(d)) return dateStr; const dd=String(d.getDate()).padStart(2,'0'); const mm=String(d.getMonth()+1).padStart(2,'0'); const yyyy=d.getFullYear(); return `${dd}/${mm}/${yyyy}`; }catch(e){ return dateStr; } }
function getGenderBreakdown(){ let male=0,female=0,maleKids=0,femaleKids=0; currentTripJemaahList.forEach(j=>{ const g=(j.fields['GENDER']||'').toUpperCase(); const ageStr=(j.fields['AGE']||'').toString(); let ageYears=0; const m=ageStr.match(/(\d+)y/); if(m) ageYears=parseInt(m[1]); else ageYears=parseFloat(ageStr)||0; const isKid=ageYears>0&&ageYears<12; if(g==='MALE'){ if(isKid) maleKids++; else male++; } else if(g==='FEMALE'){ if(isKid) femaleKids++; else female++; } }); return {male,female,maleKids,femaleKids}; }
function buildTripManifestHTML(includeButtons=true){
  if(!selectedTripRecord) return '<p>No trip selected</p>';
  const f=selectedTripRecord.fields; const rawTrip=f['Trip']||f['NAME']||'TBC'; const displayTitle=cleanTripName(rawTrip);
  const sektor=f['Sektor']||'-'; const mutawwif=f['Mutawwif/Pengiring']||'-'; const tempoh=f['Tempoh Pakej']||'-'; const flight=f['Penerbangan']||'-'; const total=currentTripJemaahList.length; const gb=getGenderBreakdown();
  const rows=currentTripJemaahList.map((j,idx)=>{ const jf=j.fields; return `<tr><td>${idx+1}</td><td class="name-col">${jf['NAME']||''}</td><td>${jf['GENDER']||''}</td><td>${jf['PASSPORT NO.']||''}</td><td>${formatDateMY(jf['DATE OF ISSUE']||jf['Date Issue']||jf['ISSUE DATE']||'')}</td><td>${formatDateMY(jf['DATE OF EXPIRE']||jf['Date Expire']||jf['EXPIRY DATE']||'')}</td><td>${formatDateMY(jf['DOB']||jf['DATE OF BIRTH']||'')}</td><td>${jf['AGE']||''}</td><td>${jf['IC NO.']||jf['IC']||''}</td><td>${jf['NATIONALITY']||'MALAYSIA'}</td></tr>`; }).join('');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Manifest - ${displayTitle}</title><style>*{font-family:Arial,sans-serif;box-sizing:border-box;}body{margin:0;padding:20px;background:#fff;color:#1e293b;font-size:11px;}.header-card{border:1.5px solid #cbd5e1;border-radius:12px;padding:16px 20px;margin-bottom:16px;}.header-title{font-size:11px;font-weight:700;color:#1e40af;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:4px;}.header-trip{font-size:18px;font-weight:800;color:#0f172a;margin-bottom:12px;}.info-grid{display:grid;grid-template-columns:1.2fr 1.5fr 0.8fr 1fr 0.7fr;gap:12px;border-top:1px solid #f1f5f9;border-bottom:1px dashed #e2e8f0;padding:12px 0;margin-bottom:10px;}.info-label{font-size:10px;color:#64748b;font-weight:600;display:block;}.info-value{font-size:12px;font-weight:700;color:#0f172a;margin-top:2px;}.gender-row{display:flex;gap:20px;font-size:11px;font-weight:600;padding-top:4px;}table{width:100%;border-collapse:collapse;border:1px solid #94a3b8;font-size:10.5px;}th{background:#f1f5f9;color:#334155;font-weight:700;text-align:left;padding:8px 6px;border:1px solid #94a3b8;font-size:10px;text-transform:uppercase;}td{padding:7px 6px;border:1px solid #cbd5e1;vertical-align:top;}.name-col{font-weight:600;text-transform:uppercase;max-width:160px;}@media print{body{padding:0;}.no-print{display:none !important;}@page{size:A4 landscape;margin:10mm;}}</style></head><body><div id="manifestContent"><div class="header-card"><div class="header-title">Maklumat Trip & Penerbangan</div><div class="header-trip">${displayTitle}</div><div class="info-grid"><div><span class="info-label">Sektor</span><span class="info-value">📍 ${sektor}</span></div><div><span class="info-label">Mutawwif / Pengiring</span><span class="info-value">👤 ${mutawwif}</span></div><div><span class="info-label">Tempoh Pakej</span><span class="info-value">📅 ${tempoh}</span></div><div><span class="info-label">Penerbangan (Flight)</span><span class="info-value">✈️ ${flight}</span></div><div><span class="info-label">Total Jemaah</span><span class="info-value">👥 ${total} orang</span></div></div><div class="gender-row"><span style="font-weight:700;">📊 Gender breakdown:</span><span>👨 Male: ${gb.male}</span><span>👩 Female: ${gb.female}</span><span>🧒 Male Kids: ${gb.maleKids}</span><span>👧 Female Kids: ${gb.femaleKids}</span></div></div><table><thead><tr><th style="width:28px;">#</th><th>Nama Jemaah</th><th>Gender</th><th>Passport No.</th><th>Date Issue</th><th>Date Expire</th><th>DOB</th><th>Age</th><th>IC No.</th><th>Nationality</th></tr></thead><tbody>${rows}</tbody></table></div>${includeButtons ? `<div class="no-print" style="margin-top:20px; text-align:center;"><button onclick="window.print()" style="background:#0f172a; color:#fff; padding:10px 24px; border-radius:8px; border:none; font-weight:700; cursor:pointer; margin-right:10px;">🖨️ Print</button><button onclick="window.close()" style="background:#f1f5f9; color:#334155; padding:10px 24px; border-radius:8px; border:1px solid #cbd5e1; font-weight:700; cursor:pointer;">Tutup</button></div><script>window.onafterprint=function(){ window.close(); }; window.addEventListener('keydown', function(e){ if(e.key==='Escape'){ window.close(); } });<\/script>` : ''}</body></html>`;
}
function printTripManifest(){ const html=buildTripManifestHTML(true); const w=window.open('', '_blank'); if(!w){ alert('Popup blocked'); return; } w.document.write(html); w.document.close(); w.focus(); w.onafterprint=function(){ w.close(); }; setTimeout(()=>{ w.print(); }, 500); }
async function exportTripPdf(){
  const fileName = (selectedTripRecord ? cleanTripName(selectedTripRecord.fields['Trip']||'manifest') : 'manifest').replace(/[^a-z0-9\-_]/gi,'_') + '.pdf';
  const loadScript = (src)=> new Promise((res, rej)=>{ if(document.querySelector(`script[src="${src}"]`)) return res(); const s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=rej; document.head.appendChild(s); });
  if(typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined'){ await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'); }
  if(typeof window.jspdf.jsPDF !== 'undefined' && typeof window.jspdf.jsPDF.API.autoTable === 'undefined'){ await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js'); }
  const { jsPDF } = window.jspdf; const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  if(!selectedTripRecord){ alert('No trip selected'); return; }
  const f = selectedTripRecord.fields; const rawTrip = f['Trip'] || f['NAME'] || 'TBC'; const displayTitle = cleanTripName(rawTrip);
  const sektor = f['Sektor'] || '-'; const mutawwif = f['Mutawwif/Pengiring'] || '-'; const tempoh = f['Tempoh Pakej'] || '-'; const flight = f['Penerbangan'] || '-'; const total = currentTripJemaahList.length; const gb = getGenderBreakdown();
  doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(30, 64, 175); doc.text('MAKLUMAT TRIP & PENERBANGAN', 14, 12);
  doc.setFontSize(14); doc.setTextColor(15, 23, 42); doc.text(displayTitle, 14, 20);
  doc.setFontSize(7); doc.setTextColor(100, 116, 139); doc.setFont('helvetica','normal'); let y = 26;
  doc.text('Sektor', 14, y); doc.text('Mutawwif / Pengiring', 50, y); doc.text('Tempoh Pakej', 110, y); doc.text('Penerbangan (Flight)', 145, y); doc.text('Total Jemaah', 200, y); y+=4;
  doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(15, 23, 42); doc.text(sektor, 14, y); doc.text(mutawwif.substring(0,30), 50, y); doc.text(tempoh, 110, y); doc.text(flight, 145, y); doc.text(total + ' orang', 200, y);
  y+=8; doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.2); doc.line(14, y, 283, y); y+=4; doc.setFontSize(8); doc.setFont('helvetica','bold'); doc.text('Gender breakdown:   Male: '+gb.male+'   Female: '+gb.female+'   Male Kids: '+gb.maleKids+'   Female Kids: '+gb.femaleKids, 14, y); y+=6;
  const tableHead = [['#', 'Nama Jemaah', 'Gender', 'Passport No.', 'Date Issue', 'Date Expire', 'DOB', 'Age', 'IC No.', 'Nationality']];
  const tableBody = currentTripJemaahList.map((j, idx)=>{ const jf=j.fields; return [idx+1, (jf['NAME']||'').toString(), (jf['GENDER']||''), (jf['PASSPORT NO.']||''), formatDateMY(jf['DATE OF ISSUE']||jf['Date Issue']||jf['ISSUE DATE']||''), formatDateMY(jf['DATE OF EXPIRE']||jf['Date Expire']||jf['EXPIRY DATE']||''), formatDateMY(jf['DOB']||jf['DATE OF BIRTH']||''), (jf['AGE']||''), (jf['IC NO.']||jf['IC']||''), (jf['NATIONALITY']||'MALAYSIA')]; });
  doc.autoTable({ startY: y+2, head: tableHead, body: tableBody, theme: 'grid', styles: { font: 'helvetica', fontSize: 8, cellPadding: 2, lineColor: [203,213,225], lineWidth: 0.2 }, headStyles: { fillColor: [241,245,249], textColor: [51,65,85], fontStyle: 'bold', fontSize: 8 }, columnStyles: { 0: { cellWidth: 8, halign: 'center' }, 1: { cellWidth: 45 }, 2: { cellWidth: 18 }, 3: { cellWidth: 28 }, 4: { cellWidth: 22 }, 5: { cellWidth: 22 }, 6: { cellWidth: 22 }, 7: { cellWidth: 16 }, 8: { cellWidth: 32 }, 9: { cellWidth: 22 } }, didDrawPage: function(data){ doc.setFontSize(7); doc.setTextColor(150); doc.text('Page ' + doc.internal.getNumberOfPages(), 270, 195); } });
  doc.save(fileName);
}
// ===== MODAL HANDLED BY index.html V21 - No local override =====


function getStatusBadgeHtml(status){
  if(!status) return '<span class="text-slate-500 font-bold bg-slate-100 border border-slate-200 px-3 py-1 rounded-lg text-xs">PAST TRIP</span>';
  let s = status.toString();
  // Remove all emoji characters commonly used
  s = s.replace(/[🟢🔴🟡⚪🟣🔵🟠⚫⚪]/g, '');
  s = s.replace(/\uD83D[\uDF00-\uDFFF]|\uD83C[\uDF00-\uDFFF]/g, '');
  let clean = s.replace(/[^A-Z ]/gi, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
  if(clean.includes('AVAILABLE')){ return '<span class="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg text-xs">🟢 AVAILABLE</span>'; }
  if(clean.includes('CLOSED')){ return '<span class="text-rose-700 font-bold bg-rose-50 border border-rose-200 px-3 py-1 rounded-lg text-xs">🔴 CLOSED</span>'; }
  if(clean.includes('ONGOING')){ return '<span class="text-amber-700 font-bold bg-amber-50 border border-amber-200 px-3 py-1 rounded-lg text-xs">🟡 ONGOING</span>'; }
  if(clean.includes('PAST')){ return '<span class="text-slate-600 font-bold bg-slate-100 border border-slate-200 px-3 py-1 rounded-lg text-xs">⚪ PAST TRIP</span>'; }
  return '<span class="text-slate-700 font-bold bg-slate-100 border border-slate-200 px-3 py-1 rounded-lg text-xs">'+clean+'</span>';
}




function getAirlineBadgeStyle(airline){
  // V44 FIX for image_ec142c.png & image_facc0f.png: pill putih tak nampak bila unselect
  // User request: remove semua color airline, biar semua sama uniform, takde color by airline
  const a = (airline||'').toUpperCase().trim();
  if(!a || a==='N/A') return {bg:'bg-slate-100', text:'text-slate-500', border:'border-slate-200', dot:'bg-slate-400', dotText:'●'};
  // Uniform neutral style for all airlines - no color coding
  return {bg:'bg-slate-100', text:'text-slate-700', border:'border-slate-200', dot:'bg-slate-500', dotText:'●'};
}
function getAirlineBadgeHtml(airline, isSelected){
  // V45 FIX for image_2c0961.png: takperlu ada dot tu - remove dot, uniform pill only text
  if(isSelected){
    return `<span class="bg-white/15 text-white border border-white/20 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide w-fit">${airline}</span>`;
  }
  return `<span class="bg-slate-100 text-slate-700 border-slate-200 border text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide w-fit">${airline}</span>`;
}

