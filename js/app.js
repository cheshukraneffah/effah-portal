const App = {
  init(){
    Router.init();
    this.checkApiStatus();
    this.bindActivity();
    this.idleWatcher();
    if(localStorage.getItem('effah_active_tab')==='trip-umrah'){ TripUmrah.fetch(); }
    // nanti load stats dari Airtable sini
    // contoh: document.getElementById('statTripUmrah').textContent = data.length
  },
  checkApiStatus(){
    const pat = localStorage.getItem('effah_api_pat');
    const base = localStorage.getItem('effah_base_id');
    const badge = document.getElementById('apiStatusBadge');
    if(pat && base){
      badge.textContent='Online';
      badge.className='text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/20';
    }else{
      badge.textContent='Offline';
      badge.className='text-[11px] px-2.5 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/20';
    }
  },
  bindActivity(){
    ['click','mousemove','keydown','scroll'].forEach(evt=>{
      window.addEventListener(evt, ()=>{
        localStorage.setItem('effah_last_activity', Date.now().toString());
      }, {passive:true});
    });
  },
  idleWatcher(){
    setInterval(()=>{
      const last = parseInt(localStorage.getItem('effah_last_activity')||'0');
      if(last && (Date.now()-last) > 15*60*1000){
        // auto balik homepage selepas 15min idle
        if(localStorage.getItem('effah_active_tab')!== 'utama-overview'){
          Router.switchTab('utama-overview');
          this.toast('Idle 15 min - kembali ke Overview');
        }
      }
    }, 60*1000);
  },
  toast(msg){
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    setTimeout(()=>t.classList.add('hidden'), 3000);
  }
};
document.addEventListener('DOMContentLoaded', ()=>App.init());