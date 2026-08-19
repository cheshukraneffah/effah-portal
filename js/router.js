
const STORAGE_TAB_KEY='effah_active_tab';
const STORAGE_TIME_KEY='effah_last_active_time';
const IDLE_LIMIT_MS=15*60*1000;
document.addEventListener('DOMContentLoaded',()=>{
  const inside=document.getElementById('sidebarCollapseInside');
  const outside=document.getElementById('sidebarCollapseOutside');
  if(inside) inside.onclick=toggleSidebar;
  if(outside) outside.onclick=toggleSidebar;
  if(typeof fetchTripUmrahData==='function') fetchTripUmrahData();
  if(typeof fetchJemaahUmrahData==='function') fetchJemaahUmrahData();
  if(typeof fetchRoomingData==='function') setTimeout(fetchRoomingData, 800);
  const last=localStorage.getItem(STORAGE_TIME_KEY);
  const saved=localStorage.getItem(STORAGE_TAB_KEY);
  let target='home';
  if(last){ const e=Date.now()-parseInt(last,10); if(e< IDLE_LIMIT_MS && saved) target=saved; }
  switchTab(target,false);
});
function switchTab(tabName,saveState=true){
  document.querySelectorAll('.tab-content').forEach(el=>el.classList.add('hidden'));
  document.querySelectorAll('.nav-link').forEach(el=>{ el.classList.remove('text-white','bg-slate-800/80','font-bold'); el.classList.add('text-slate-400'); });
  const activeTab=document.getElementById('modul-'+tabName);
  const activeNav=document.getElementById('nav-'+tabName);
  if(activeTab) activeTab.classList.remove('hidden');
  if(activeNav){ activeNav.classList.remove('text-slate-400'); activeNav.classList.add('text-white','bg-slate-800/80','font-bold'); }
  const bc=document.getElementById('breadcrumbCurrent');
  if(bc){ const names={'home':'Overview','pakej-umrah':'Trip Umrah','jemaah-umrah':'Maklumat Jemaah Umrah','trip-luar':'Trip Luar Negara','peserta-luar':'Maklumat Peserta Luar','rooming':'Rooming List','ejen':'Ejen Tracker','settings':'Settings API'}; bc.textContent=names[tabName]||'Overview'; }
  if(tabName==='rooming'){
    if(typeof renderRoomingHTML==='function') renderRoomingHTML();
    if(typeof fetchRoomingData==='function') fetchRoomingData();
  }
  if(window.innerWidth<768){ const sb=document.getElementById('sidebar'); if(sb) sb.classList.add('-translate-x-full'); }
  if(saveState) try{localStorage.setItem(STORAGE_TAB_KEY,tabName);}catch(e){}
  try{localStorage.setItem(STORAGE_TIME_KEY,Date.now());}catch(e){}
}
let sidebarCollapsed=false;
function toggleSidebar(){
  const sidebar=document.getElementById('sidebar');
  const outside=document.getElementById('sidebarCollapseOutside');
  const inside=document.getElementById('sidebarCollapseInside');
  if(!sidebar) { console.log('sidebar not found'); return; }
  sidebarCollapsed=!sidebarCollapsed;
  console.log('toggleSidebar collapsed:',sidebarCollapsed);
  if(window.innerWidth>=768){
    if(sidebarCollapsed){
      sidebar.style.marginLeft='-16rem';
      sidebar.style.opacity='0';
      sidebar.style.pointerEvents='none';
      if(outside) outside.classList.remove('hidden');
      if(inside) inside.classList.add('hidden');
    }else{
      sidebar.style.marginLeft='0';
      sidebar.style.opacity='1';
      sidebar.style.pointerEvents='auto';
      if(outside) outside.classList.add('hidden');
      if(inside) inside.classList.remove('hidden');
    }
  }else{
    // mobile
    sidebar.classList.toggle('-translate-x-full');
    if(outside) outside.classList.add('hidden');
  }
}
