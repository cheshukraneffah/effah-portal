
let SETTINGS_UNLOCKED = false;
document.addEventListener('DOMContentLoaded', () => { setTimeout(renderSettingsHTML, 500); });
function renderSettingsHTML(){
    const container = document.getElementById('modul-settings');
    if(!container) return;
    const currentPat = window.AIRTABLE_PAT || localStorage.getItem('effah_api_pat') || '';
    const currentBase = window.AIRTABLE_BASE_ID || localStorage.getItem('effah_base_id') || '';
    const isOnline = currentPat && currentBase;
    container.innerHTML = `
        <div class="max-w-2xl bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 md:p-8">
            <div class="flex items-center space-x-3 pb-6 mb-6 border-b border-slate-100">
                <div class="w-12 h-12 bg-rose-50 text-rose-700 rounded-2xl flex items-center justify-center text-xl"><i class="fa-solid fa-key"></i></div>
                <div><h2 class="text-lg font-bold text-slate-900">Tetapan Sambungan Airtable API</h2><p class="text-xs text-slate-500">Masukkan PAT & Base ID</p></div>
            </div>
            <div id="settingsLockScreen" class="${SETTINGS_UNLOCKED ? 'hidden' : 'block'} text-center py-8 px-4 bg-slate-50 rounded-2xl border border-dashed">
                <h3 class="text-sm font-bold mb-1">Akses Dilindungi</h3>
                <p class="text-xs text-slate-500 mb-4">Masukkan Security PIN</p>
                <form onsubmit="unlockSettingsForm(event)" class="max-w-xs mx-auto space-y-3">
                    <input type="password" id="settingsPinInput" maxlength="6" placeholder="••••••" required class="w-full text-center text-xl font-bold tracking-widest border border-slate-300 rounded-xl p-2.5">
                    <p id="settingsPinError" class="text-xs text-rose-600 hidden font-bold">Security PIN Salah!</p>
                    <button type="submit" class="w-full bg-rose-900 text-white font-bold py-2.5 rounded-xl text-xs">Buka Tetapan API</button>
                </form>
            </div>
            <div id="settingsFormContent" class="${SETTINGS_UNLOCKED ? 'block' : 'hidden'} space-y-5">
                <div class="flex items-center justify-between p-3 rounded-xl ${isOnline ? 'bg-emerald-50 border border-emerald-200 text-emerald-900' : 'bg-rose-50 border border-rose-200 text-rose-900'} text-xs font-semibold">
                    <span>Status API: ${isOnline ? 'Online' : 'Offline'}</span><span class="text-[10px]">${currentPat ? currentPat.substring(0,15)+'...' : 'No PAT'}</span>
                </div>
                <div><label class="text-xs font-bold">PAT</label><input id="settingsPatInput" type="password" value="${currentPat}" class="mt-1 w-full border rounded-xl p-3 text-xs font-mono"></div>
                <div><label class="text-xs font-bold">Base ID</label><input id="settingsBaseInput" type="text" value="${currentBase}" class="mt-1 w-full border rounded-xl p-3 text-xs font-mono"></div>
                <div class="flex gap-3 pt-2"><button onclick="saveSettingsAPI()" class="flex-1 bg-slate-900 text-white font-bold py-3 rounded-xl text-xs">Simpan & Uji</button><button onclick="lockSettingsForm()" class="px-4 bg-slate-100 rounded-xl text-xs"><i class="fa-solid fa-lock"></i></button></div>
                <p id="settingsSaveMsg" class="text-xs text-center hidden font-bold mt-2"></p>
            </div>
        </div>`;
}
function unlockSettingsForm(e){ if(e) e.preventDefault(); const pin=document.getElementById('settingsPinInput')?.value; if(pin==='5822'){ SETTINGS_UNLOCKED=true; renderSettingsHTML(); } else { document.getElementById('settingsPinError')?.classList.remove('hidden'); } }
function lockSettingsForm(){ SETTINGS_UNLOCKED=false; renderSettingsHTML(); }
function saveSettingsAPI(){ const pat=document.getElementById('settingsPatInput')?.value.trim(); const base=document.getElementById('settingsBaseInput')?.value.trim(); if(!pat||!base) return; localStorage.setItem('effah_api_pat',pat); localStorage.setItem('effah_pat',pat); localStorage.setItem('effah_base_id',base); localStorage.setItem('effah_base',base); window.AIRTABLE_PAT=pat; window.AIRTABLE_BASE_ID=base; const msg=document.getElementById('settingsSaveMsg'); if(msg){ msg.textContent='Berjaya! Reload...'; msg.className='text-xs text-center font-bold mt-2 text-emerald-600'; msg.classList.remove('hidden'); } setTimeout(()=>location.reload(),1200); }
