(() => {
'use strict';

const NAV=[
 ['home','⌂','Home','Everything important, at a glance.'],
 ['planner','▦','Planner','Tasks, habits, focus and goals.'],
 ['notes','✎','Notes','Notes and images.'],
 ['wallet','₹','Wallet','Balance, UPI and activity.'],
 ['connect','♧','Connect','Messages and groups.'],
 ['media','♫','Media','Music and video.'],
 ['travel','⌁','Travel','Trips and places.'],
 ['discover','✦','Discover','Interests and saved finds.'],
 ['ai','◉','Liora AI','Fixed commands from your JSON list.'],
 ['settings','⚙','Settings','Appearance and controls.']
];
const TITLES=Object.fromEntries(NAV.map(x=>[x[0],x[2]]));
const SUBS=Object.fromEntries(NAV.map(x=>[x[0],x[3]]));

const DEFAULTS={
 profile:{name:''},
 tasks:[],
 habits:[],
 notes:[],
 selectedNote:null,
 wallet:{setupComplete:false,balance:0,upi:'',accounts:[
   {name:'Saving',balance:0},{name:'Current',balance:0},{name:'Cash',balance:0}
 ]},
 transactions:[],
 connect:{contacts:[],activeId:null},
 media:{items:[],currentId:null,playing:false},
 trips:[],
 savedPlaces:[],
 saved:[],
 discover:{topics:['Technology','Science','Stories']},
 goals:[],
 focus:{duration:25,remaining:1500,todaySeconds:0,day:''},
 settings:{theme:'dark',voice:true,morningBrief:true,notifications:true,sync:true},
 recent:[]
};

const KEY='liora-state-v1';
const AI_KEY='liora-ai-v1';
const $=id=>document.getElementById(id);
const uid=()=>Date.now()+'-'+Math.random().toString(16).slice(2);
const clone=v=>JSON.parse(JSON.stringify(v));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const todayKey=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const formatDateTime=value=>{
  if(!value) return 'No time set';
  const d=new Date(value); if(Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined,{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
};
const formatMoney=v=>Number(v||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
const shortDate=(d=new Date())=>d.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});
const dateLabel=(d=new Date())=>d.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'});

function mergeDefaults(saved,defaults){
  const base=clone(defaults); if(!saved||typeof saved!=='object') return base;
  for(const k of Object.keys(base)){
    if(!(k in saved)) continue;
    if(Array.isArray(base[k])) base[k]=Array.isArray(saved[k])?saved[k]:base[k];
    else if(base[k]&&typeof base[k]==='object') base[k]=mergeDefaults(saved[k],base[k]);
    else base[k]=saved[k];
  }
  for(const k of Object.keys(saved)) if(!(k in base)) base[k]=saved[k];
  return base;
}
function loadState(){try{return mergeDefaults(JSON.parse(localStorage.getItem(KEY)||'null'),DEFAULTS)}catch{return clone(DEFAULTS)}}
function saveState(){localStorage.setItem(KEY,JSON.stringify(state))}
function saveAI(){localStorage.setItem(AI_KEY,JSON.stringify(aiHistory.slice(-60)))}
function toast(m){const n=$('toast');n.textContent=m;n.classList.add('show');clearTimeout(n._t);n._t=setTimeout(()=>n.classList.remove('show'),1800)}
function timeGreeting(){const h=new Date().getHours();if(h<5)return'Good night';if(h<12)return'Good morning';if(h<17)return'Good afternoon';if(h<22)return'Good evening';return'Good night'}
function normalizeInput(s){return String(s||'').trim().toLowerCase().replace(/\s+/g,' ').replace(/[?!.,]+$/g,'')}

let state=loadState();
let current='home';
let modalOpen=false;
let selectedNoteId=state.selectedNote || null;
let pendingFocus=null;
let focusInterval=null;
let mediaInterval=null;
let aiCommands=[];
let aiHistory=JSON.parse(localStorage.getItem(AI_KEY)||'[]');
let walletPromptShown=false;
let deferredInstallPrompt=null;
let pwaRegistration=null;
let pwaReady=false;

function isStandalone(){return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone===true}
function isIOS(){return /iphone|ipad|ipod/i.test(navigator.userAgent||'')}
function updateNetworkStatus(){const el=$('networkStatus');if(!el)return;const online=navigator.onLine;el.textContent=online?(pwaReady?'Online · offline ready':'Online · preparing offline use'):'Offline · working from saved data';el.classList.toggle('offline',!online)}
function updatePwaStatus(){
 const button=$('installAppBtn'),status=$('pwaStatus');
 if(!button||!status)return;
 if(isStandalone()){button.textContent='Installed';button.disabled=true;status.textContent='Installed as an app · offline support is active when cached';return}
 button.disabled=false;
 if(deferredInstallPrompt){button.textContent='Install Liora';status.textContent='Ready to add Liora to your home screen';return}
 if(isIOS()){button.textContent='How to install';status.textContent='Use your browser Share menu, then choose Add to Home Screen';return}
 if(location.protocol!=='https:' && location.hostname!=='localhost' && location.hostname!=='127.0.0.1'){button.textContent='Open web version';status.textContent='Install and offline support become available when Liora is hosted on HTTPS';return}
 button.textContent='Install Liora';status.textContent='Your browser can install Liora when the install prompt becomes available';
}
async function installLiora(){
 if(isStandalone()){toast('Liora is already installed');return}
 if(deferredInstallPrompt){try{await deferredInstallPrompt.prompt();const choice=await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;updatePwaStatus();if(choice.outcome==='accepted')toast('Liora is being installed')}catch{toast('Install was not completed')}return}
 if(isIOS()){openModal('Install Liora',`<div class="stack"><h2 style="font-size:21px">Add Liora to your home screen</h2><div class="small muted" style="line-height:1.65">Open the browser Share menu, choose <strong>Add to Home Screen</strong>, then confirm. Liora will open in its own app window.</div><button class="btn btn-primary" data-close-modal>Done</button></div>`);return}
 if(location.protocol!=='https:'&&location.hostname!=='localhost'&&location.hostname!=='127.0.0.1'){openModal('Install Liora',`<div class="stack"><h2 style="font-size:21px">Host Liora first</h2><div class="small muted" style="line-height:1.65">Installable web apps need a proper web address. Deploy the Liora folder to HTTPS (GitHub Pages, Vercel, or another host), then use Install Liora again.</div><button class="btn btn-primary" data-close-modal>Done</button></div>`);return}
 toast('Your browser has not offered installation yet. Try the browser menu and choose Add to Home Screen.');
}
async function checkPwaUpdates(){
 if(!pwaRegistration){toast('Offline support is not available from this file address');return}
 try{await pwaRegistration.update();toast('Checked for Liora updates')}catch{toast('Could not check for updates')}
}
function initPWA(){
 updateNetworkStatus();
 window.addEventListener('online',updateNetworkStatus);window.addEventListener('offline',updateNetworkStatus);
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;updatePwaStatus();});
 window.addEventListener('appinstalled',()=>{deferredInstallPrompt=null;updatePwaStatus();toast('Liora installed');});
 if('serviceWorker' in navigator && /^https?:$/.test(location.protocol)){
  navigator.serviceWorker.register('./liora-sw.js',{scope:'./'}).then(async reg=>{pwaRegistration=reg;try{await navigator.serviceWorker.ready;pwaReady=true;updateNetworkStatus()}catch{}updatePwaStatus();}).catch(()=>updatePwaStatus());
 }else updatePwaStatus();
}

function resetDailyData(){
  const key=todayKey();
  if(state.focus.day!==key){state.focus.day=key;state.focus.todaySeconds=0}
  state.habits.forEach(h=>{if(h.completedOn!==key)h.done=false});
  saveState();
}
resetDailyData();

function applyTheme(){
  document.body.classList.toggle('light',state.settings.theme==='light');
  document.documentElement.style.colorScheme=state.settings.theme==='light'?'light':'dark';
}
applyTheme();


function openTasks(){return state.tasks.filter(t=>!t.done)}
function unreadCount(){return state.connect.contacts.reduce((sum,c)=>
  sum+(c.messages||[]).filter(m=>m.incoming&&!m.read).length,0)}
function completeTasksForGoal(goalId){return state.tasks.filter(t=>String(t.goalId)===String(goalId))}
function goalProgress(goal){
  const linked=completeTasksForGoal(goal.id);
  if(linked.length){const p=Math.round(linked.filter(t=>t.done).length/linked.length*100);goal.progress=p;return p}
  return Math.max(0,Math.min(100,Number(goal.progress)||0))
}
function allGoalProgress(){state.goals.forEach(goalProgress)}
function currentFocusMinutes(){return Math.floor((state.focus.todaySeconds||0)/60)}

function navMarkup(){
 return NAV.map(([id,icon,name,sub])=>`<button class="nav-item ${current===id?'active':''}" data-page="${id}"><span class="nav-icon">${icon}</span><span><span class="nav-label">${name}</span><span class="nav-meta">${esc(sub.split('.')[0])}</span></span></button>`).join('');
}
function renderNav(){
 $('desktopNav').innerHTML=navMarkup();
 const primary=['home','planner','notes','ai'];
 $('mobileDock').innerHTML=primary.map(id=>{const item=NAV.find(x=>x[0]===id);return`<button class="mobile-nav-item ${current===id?'active':''}" data-page="${id}"><span>${item[1]}</span><small>${esc(item[2])}</small></button>`}).join('')+`<button class="mobile-nav-item" data-action="more"><span>•••</span><small>More</small></button>`;
 $('mobileAppGrid').innerHTML=NAV.filter(n=>!primary.includes(n[0])).map(([id,icon,name,sub])=>`<button class="app-tile" data-page="${id}"><span class="tile-icon">${icon}</span><strong>${esc(name)}</strong><small>${esc(sub)}</small></button>`).join('');
}
function showPage(id,focus=null){
 if(!TITLES[id])return;
 current=id;pendingFocus=focus;
 document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
 $(id).classList.add('active');
 $('pageTitle').textContent=TITLES[id];$('pageSub').textContent=SUBS[id];
 closeSheet();closeDrawer();$('moreMenu').classList.remove('open');
 renderAll(false);
 window.scrollTo({top:0,behavior:'smooth'});
 if(focus) setTimeout(()=>focusResult(focus),80);
 if(id==='wallet'&&!state.wallet.setupComplete&&!walletPromptShown){walletPromptShown=true;setTimeout(openWalletSetup,120)}
}

function lock(){document.body.classList.add('locked')}
function unlock(){if(!modalOpen&&!$('mobileSheet').classList.contains('open')&&!$('notifDrawer').classList.contains('open'))document.body.classList.remove('locked')}
function openModal(title,html,after){
 modalOpen=true;$('modalTitle').textContent=title;$('modalBody').innerHTML=html;$('modal').classList.add('open');$('modal').setAttribute('aria-hidden','false');lock();if(after)after($('modalBody'));
}
function closeModal(){modalOpen=false;$('modal').classList.remove('open');$('modal').setAttribute('aria-hidden','true');unlock()}
function openSheet(){closeDrawer();$('mobileSheet').classList.add('open');$('mobileSheet').setAttribute('aria-hidden','false');$('overlay').classList.add('open');lock()}
function closeSheet(){if($('mobileSheet').classList.contains('open')){$('mobileSheet').classList.remove('open');$('mobileSheet').setAttribute('aria-hidden','true')}if(!$('notifDrawer').classList.contains('open')&&!modalOpen)$('overlay').classList.remove('open');unlock()}
function openDrawer(){closeSheet();updateNotifications();$('notifDrawer').classList.add('open');$('notifDrawer').setAttribute('aria-hidden','false');$('overlay').classList.add('open');lock()}
function closeDrawer(){if($('notifDrawer').classList.contains('open')){$('notifDrawer').classList.remove('open');$('notifDrawer').setAttribute('aria-hidden','true')}if(!$('mobileSheet').classList.contains('open')&&!modalOpen)$('overlay').classList.remove('open');unlock()}

/* HOME */
function renderHome(){
 const name=state.profile.name||'there';
 const tasks=openTasks().slice().sort((a,b)=>(a.time||'').localeCompare(b.time||'')).slice(0,5);
 const recentPayments=state.transactions.slice(0,4);
 $('home').innerHTML=`
  <article class="card card-hero home-hero">
    <div class="hero-copy">
      <div class="hero-greeting">${esc(timeGreeting())}, ${esc(name)}</div>
      <div class="hero-headline">${openTasks().length?esc('What is still worth doing today?'):esc('What would you like to make time for?')}</div>
      <div class="hero-body">A single place for the things you actually use: plan, write, pay, connect, play, travel and discover.</div>
      <div class="hero-actions"><button class="btn btn-primary" data-action="focus">Start focus</button><button class="btn btn-soft" data-action="newTask">Add task</button><button class="btn btn-soft" data-action="newNote">New note</button></div>
    </div>
    <div class="hero-art"><div class="hero-orb"></div><svg viewBox="0 0 420 240" style="width:min(100%,460px);height:220px">
      <defs><linearGradient id="h1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#59d9ff"/><stop offset="1" stop-color="#a884ff"/></linearGradient></defs>
      <circle cx="210" cy="120" r="82" fill="none" stroke="rgba(121,162,255,.13)" stroke-width="2"/><circle cx="210" cy="120" r="50" fill="rgba(121,162,255,.05)" stroke="rgba(121,162,255,.14)"/><circle cx="210" cy="120" r="9" fill="url(#h1)"/>
      <path d="M210 38 A82 82 0 0 1 285 135" fill="none" stroke="url(#h1)" stroke-width="5" stroke-linecap="round"/><path d="M138 154 A82 82 0 0 0 226 198" fill="none" stroke="#a884ff" stroke-opacity=".45" stroke-width="4" stroke-linecap="round"/>
    </svg></div>
  </article>

  <div class="home-grid">
    <article class="card span-12">
      <div class="row"><div><h2>Today</h2><div class="small muted" style="margin-top:4px">${esc(shortDate())}</div></div><span class="badge blue">${currentFocusMinutes()} min focused</span></div>
      <div class="today-grid section-gap">
        <button class="today-stat" data-action="focus"><span>Focused today</span><strong>${currentFocusMinutes()} min</strong></button>
        <button class="today-stat" data-page="planner"><span>Open tasks</span><strong>${openTasks().length}</strong></button>
        <button class="today-stat" data-page="planner"><span>Habits</span><strong>${state.habits.filter(h=>h.done).length}/${state.habits.length}</strong></button>
      </div>
      <div class="section-gap focus-mini"><div><div class="tiny muted">FOCUS SESSION</div><div class="focus-mini-time">${formatTime(state.focus.remaining)}</div><div class="small muted">${state.focus.duration}-minute session</div></div><div class="row"><span class="focus-chip">${state.focus.todaySeconds?`${currentFocusMinutes()} min logged`:'Ready'}</span><button class="btn btn-primary" data-action="focus">${focusRunningText()}</button></div></div>
    </article>

    <article class="card span-7">
      <div class="row"><div><h2>Upcoming</h2><div class="small muted" style="margin-top:4px">Tasks and events with a time.</div></div><button class="btn-link" data-page="planner">Open Planner →</button></div>
      <div class="simple-list section-gap">${tasks.map(t=>`<button class="simple-row" data-search-target-type="task" data-search-target="${esc(t.id)}"><span class="simple-row-main"><strong>${esc(t.text)}</strong><small>${t.time?esc(formatDateTime(t.time)):esc(t.due||'No time set')}${t.goalId?` · ${esc(state.goals.find(g=>String(g.id)===String(t.goalId))?.name||'Goal')}`:''}</small></span><span>›</span></button>`).join('')||'<div class="empty">Nothing planned yet.</div>'}</div>
    </article>

    <article class="card span-5">
      <div class="row"><div><h2>Recent payments</h2><div class="small muted" style="margin-top:4px">Latest money activity.</div></div><button class="btn-link" data-page="wallet">Wallet →</button></div>
      <div class="simple-list section-gap">${recentPayments.map(t=>`<button class="simple-row" data-search-target-type="tx" data-search-target="${esc(t.id)}"><span class="simple-row-main"><strong>${esc(t.merchant)}</strong><small>${esc(t.date||'Today')}</small></span><strong>${t.type==='credit'?'+':'−'}₹${formatMoney(t.amount)}</strong></button>`).join('')||'<div class="empty">No payments yet.</div>'}</div>
    </article>
  </div>`;
}
function focusRunningText(){return focusRunning?'Pause':'Start'}
function formatTime(total){const sec=Math.max(0,Number(total)||0);const m=Math.floor(sec/60).toString().padStart(2,'0');const s=(sec%60).toString().padStart(2,'0');return`${m}:${s}`}

/* PLANNER */
function renderPlanner(){
 allGoalProgress();
 const days=[...Array(7)].map((_,i)=>{const d=new Date();d.setDate(d.getDate()+i);return d});
 $('planner').innerHTML=`
  <div class="section-head"><div><div class="section-kicker">Plan</div><div class="section-title">Planner</div><div class="section-sub">Tasks, habits, focus and goals in one place.</div></div><div class="row"><button class="btn btn-primary" data-action="newTask">＋ Task</button><button class="btn btn-soft" data-action="event">＋ Event</button></div></div>
  <div class="planner-layout">
   <div class="stack">
    <article class="card">
      <div class="row"><div><h2>Week view</h2><div class="small muted" style="margin-top:4px">${esc(dateLabel())}</div></div><span class="badge blue">${state.tasks.filter(t=>t.done).length}/${state.tasks.length} complete</span></div>
      <div class="calendar-strip">${days.map((d,i)=>`<button class="day-pill ${i===0?'active':''}" data-select-day="${d.toISOString()}"><span>${d.toLocaleDateString(undefined,{weekday:'short'}).slice(0,3)}</span><strong>${d.getDate()}</strong></button>`).join('')}</div>
      <div class="divider"></div>
      <div class="row"><h2>Tasks</h2><button class="btn-link" data-action="newTask">Add task →</button></div>
      <div class="stack" style="margin-top:8px">${state.tasks.map(taskRow).join('')||'<div class="empty">Your task list is empty.</div>'}</div>
    </article>
    <article class="card">
      <div class="row"><div><h2>Goals</h2><div class="small muted" style="margin-top:4px">Tasks linked to a goal drive its progress automatically.</div></div><button class="btn-soft" data-action="newGoal">＋ Goal</button></div>
      <div class="stack" style="margin-top:12px">${state.goals.map(g=>goalCard(g)).join('')||'<div class="empty">Create a goal, then add tasks directly under it.</div>'}</div>
    </article>
   </div>
   <aside class="stack">
    <article class="card timer-card">
      <div class="eyebrow">Focus</div><h2 style="font-size:21px;margin-top:7px">${state.focus.duration}-minute session</h2>
      <div class="timer-ring" id="timerRing" style="--progress:${timerDegrees()}deg;margin-top:17px"><div class="timer-ring-inner"><div><div class="timer-time" id="timerTime">${formatTime(state.focus.remaining)}</div><div class="small muted">${focusRunning?'In progress':'Ready'}</div></div></div></div>
      <div class="hero-actions" style="justify-content:center"><button class="btn btn-primary" data-timer-toggle>${focusRunning?'Pause':'Start'}</button><button class="btn btn-soft" data-timer-reset>Reset</button><button class="btn btn-soft" data-action="focusTiming">Change timing</button></div>
      <div class="tiny muted" style="margin-top:10px">${currentFocusMinutes()} min focused today</div>
    </article>
    <article class="card">
      <div class="row"><div><h2>Habits</h2><div class="small muted" style="margin-top:4px">They refresh each day.</div></div><button class="btn-link" data-action="newHabit">Add habit →</button></div>
      <div class="stack" style="margin-top:9px">${state.habits.map(habitRow).join('')||'<div class="empty">No habits yet.</div>'}</div>
    </article>
   </aside>
  </div>`;
}
function taskRow(t){
 const goal=state.goals.find(g=>String(g.id)===String(t.goalId));
 return `<div class="task-row" data-item-id="task-${esc(t.id)}"><button class="check ${t.done?'done':''}" data-complete-task="${esc(t.id)}">${t.done?'✓':''}</button><div><div class="task-text ${t.done?'done':''}">${esc(t.text)}</div><div class="task-pills">${t.time?`<span class="badge blue">${esc(formatDateTime(t.time))}</span>`:'<span class="badge">No time</span>'}${goal?`<span class="badge">${esc(goal.name)}</span>`:''}</div></div><button class="icon-btn small-icon" data-delete-task="${esc(t.id)}">×</button></div>`;
}
function goalCard(g){
 const p=goalProgress(g);const linked=completeTasksForGoal(g.id);
 return `<article class="goal-card" data-item-id="goal-${esc(g.id)}">
  <div class="row"><div><strong>${esc(g.name)}</strong><div class="small muted" style="margin-top:3px">${linked.length?`${linked.filter(t=>t.done).length}/${linked.length} tasks complete`:'No tasks linked yet'}</div></div><div class="row"><span class="badge">${p}%</span><button class="icon-btn small-icon" data-delete-goal="${esc(g.id)}">×</button></div></div>
  <div class="progress" style="margin-top:10px"><span style="width:${p}%"></span></div>
  ${linked.map(t=>`<div class="goal-task"><button class="check ${t.done?'done':''}" data-complete-task="${esc(t.id)}">${t.done?'✓':''}</button><span class="small ${t.done?'muted':''}" style="${t.done?'text-decoration:line-through':''}">${esc(t.text)}</span></div>`).join('')}
  <div class="row" style="margin-top:10px"><button class="btn-link" data-action="newGoalTask" data-goal-id="${esc(g.id)}">＋ Add task</button><button class="btn-link" data-action="editGoal" data-goal-id="${esc(g.id)}">Adjust progress</button></div>
 </article>`;
}
function habitRow(h){
 return `<div class="habit-row" data-item-id="habit-${esc(h.id)}"><div><strong style="font-size:12px">${esc(h.name)}</strong><div class="small muted" style="margin-top:3px">${h.streak||0} day streak</div></div><button class="btn ${h.done?'btn-primary':'btn-soft'}" data-toggle-habit="${esc(h.id)}">${h.done?'Done':'Check'}</button><button class="icon-btn small-icon" data-delete-habit="${esc(h.id)}">×</button></div>`;
}
function timerDegrees(){const d=Math.max(1,state.focus.duration*60);return((d-state.focus.remaining)/d)*360}

/* task/event/goal/habit */
function toInputDateValue(d=new Date()){const pad=n=>String(n).padStart(2,'0');return`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`}
function openTaskModal(prefillGoal=null){
 const goals=`<option value="">No goal</option>${state.goals.map(g=>`<option value="${esc(g.id)}" ${String(prefillGoal)===String(g.id)?'selected':''}>${esc(g.name)}</option>`).join('')}`;
 openModal('New task',`<div class="stack">
  <label class="tiny muted">TASK<input class="input" id="taskText" placeholder="What needs to be done?"></label>
  <div class="grid grid-2"><label class="tiny muted">DATE & TIME<input class="input" id="taskTime" type="datetime-local" value="${toInputDateValue()}"></label><label class="tiny muted">GOAL<select class="select" id="taskGoal">${goals}</select></label></div>
  <button class="btn btn-primary" id="saveTask">Add task</button>
 </div>`,body=>{
  body.querySelector('#saveTask').onclick=()=>{const text=body.querySelector('#taskText').value.trim();if(!text){toast('Write a task first');return}state.tasks.unshift({id:uid(),text,done:false,time:body.querySelector('#taskTime').value,goalId:body.querySelector('#taskGoal').value||null});allGoalProgress();saveState();closeModal();renderAll();toast('Task added')};
  setTimeout(()=>body.querySelector('#taskText')?.focus(),20);
 });
}
function openEventModal(){
 openModal('New event',`<div class="stack"><label class="tiny muted">EVENT<input class="input" id="eventName" placeholder="Event name"></label><label class="tiny muted">DATE & TIME<input class="input" id="eventWhen" type="datetime-local" value="${toInputDateValue()}"></label><button class="btn btn-primary" id="saveEvent">Add event</button></div>`,body=>{
  body.querySelector('#saveEvent').onclick=()=>{const name=body.querySelector('#eventName').value.trim();if(!name){toast('Write an event name');return}state.tasks.unshift({id:uid(),text:name,done:false,time:body.querySelector('#eventWhen').value,goalId:null,isEvent:true});saveState();closeModal();renderAll();toast('Event added')};
 });
}
function openGoalModal(){
 openModal('New goal',`<div class="stack"><label class="tiny muted">GOAL NAME<input class="input" id="goalName" placeholder="Goal name"></label><label class="tiny muted">STARTING PROGRESS<input class="range" id="goalProgress" type="range" min="0" max="100" value="0"><div class="small muted" id="goalProgressLabel">0%</div></label><button class="btn btn-primary" id="saveGoal">Create goal</button></div>`,body=>{
  const range=body.querySelector('#goalProgress');range.oninput=()=>body.querySelector('#goalProgressLabel').textContent=range.value+'%';
  body.querySelector('#saveGoal').onclick=()=>{const n=body.querySelector('#goalName').value.trim();if(!n){toast('Write a goal name');return}state.goals.push({id:uid(),name:n,progress:Number(range.value)||0});saveState();closeModal();renderAll();toast('Goal created')};
 });
}
function openGoalTask(goalId){openTaskModal(goalId)}
function editGoal(id){
 const g=state.goals.find(x=>String(x.id)===String(id));if(!g)return;
 const linked=completeTasksForGoal(id);
 openModal('Adjust goal',`<div class="stack"><label class="tiny muted">GOAL<input class="input" value="${esc(g.name)}" id="goalEditName"></label><label class="tiny muted">PROGRESS<input class="range" id="goalEditProgress" type="range" min="0" max="100" value="${goalProgress(g)}" ${linked.length?'disabled':''}><div class="small muted" id="goalEditLabel">${goalProgress(g)}% ${linked.length?'· follows linked tasks':''}</div></label><button class="btn btn-primary" id="saveGoalEdit">Save</button></div>`,body=>{
  const range=body.querySelector('#goalEditProgress');range.oninput=()=>body.querySelector('#goalEditLabel').textContent=range.value+'%';
  body.querySelector('#saveGoalEdit').onclick=()=>{g.name=body.querySelector('#goalEditName').value.trim()||g.name;if(!linked.length)g.progress=Number(range.value)||0;allGoalProgress();saveState();closeModal();renderAll();toast('Goal updated')};
 });
}
function deleteGoal(id){state.goals=state.goals.filter(g=>String(g.id)!==String(id));state.tasks.forEach(t=>{if(String(t.goalId)===String(id))t.goalId=null});saveState();renderAll();toast('Goal deleted')}
function openHabitModal(){
 openModal('New habit',`<div class="stack"><input class="input" id="habitName" placeholder="Habit name"><button class="btn btn-primary" id="saveHabit">Add habit</button></div>`,body=>{
  body.querySelector('#saveHabit').onclick=()=>{const n=body.querySelector('#habitName').value.trim();if(!n){toast('Write a habit name');return}state.habits.push({id:uid(),name:n,done:false,streak:0,completedOn:''});saveState();closeModal();renderAll();toast('Habit added')};
 });
}
function toggleHabit(id){
 const h=state.habits.find(x=>String(x.id)===String(id));if(!h)return;
 const key=todayKey();
 if(h.done&&h.completedOn===key){h.done=false;saveState();renderAll();toast('Habit unchecked');return}
 const yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);const y=yesterday.toISOString().slice(0,10);
 h.done=true;h.completedOn=key;
 if(h.lastCompletedDate===y)h.streak=(h.streak||0)+1;else if(h.lastCompletedDate!==key)h.streak=Math.max(1,h.streak||0);
 h.lastCompletedDate=key;saveState();renderAll();toast('Habit completed');
}

/* focus */
let focusRunning=false;
function startFocusLoop(){
 if(focusInterval)clearInterval(focusInterval);
 focusRunning=true;
 focusInterval=setInterval(()=>{
  if(!focusRunning)return;
  if(state.focus.remaining>0){
    state.focus.remaining--;state.focus.todaySeconds++;
    if(state.focus.todaySeconds%15===0)saveState();
  }
  const time=$('timerTime');if(time)time.textContent=formatTime(state.focus.remaining);
  const ring=$('timerRing');if(ring)ring.style.setProperty('--progress',timerDegrees()+'deg');
  const homeMinutes=document.querySelectorAll('.focus-mini-time');homeMinutes.forEach(n=>n.textContent=formatTime(state.focus.remaining));
  if(state.focus.remaining<=0){focusRunning=false;clearInterval(focusInterval);saveState();toast('Focus session complete');pushNotification('Focus complete','Your focus session has finished.');renderAll()}
  else if(state.focus.todaySeconds%60===0){renderHome()}
 },1000);
}
function toggleFocus(){if(focusRunning){focusRunning=false;clearInterval(focusInterval);saveState();renderAll();toast('Focus paused');return}if(state.focus.remaining<=0)state.focus.remaining=state.focus.duration*60;startFocusLoop();renderAll();toast('Focus started')}
function resetFocus(){focusRunning=false;if(focusInterval)clearInterval(focusInterval);state.focus.remaining=state.focus.duration*60;saveState();renderAll();toast('Focus reset')}
function openFocusTiming(){
 openModal('Focus timing',`<div class="stack"><div class="small muted">Choose how long each focus session should run.</div><div class="grid grid-2">${[5,10,15,20,25,30,45,60].map(m=>`<button class="subtle ${m===state.focus.duration?'highlight':''}" data-focus-choice="${m}" style="text-align:left"><strong>${m} minutes</strong><div class="small muted" style="margin-top:3px">${m===state.focus.duration?'Current setting':'Set as default session'}</div></button>`).join('')}</div></div>`);
}

/* NOTES + IndexedDB */
const DB_NAME='liora-files-v1',DB_STORE='files';
let dbPromise=null;
function openDB(){
 if(dbPromise)return dbPromise;
 dbPromise=new Promise((resolve,reject)=>{
  if(!window.indexedDB){reject(new Error('IndexedDB unavailable'));return}
  const req=indexedDB.open(DB_NAME,1);
  req.onupgradeneeded=e=>e.target.result.createObjectStore(DB_STORE,{keyPath:'id'});
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error('Storage unavailable'));
 });
 return dbPromise;
}
function dbPut(id,blob){return openDB().then(db=>new Promise((res,rej)=>{const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).put({id,blob});tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)}))}
function dbGet(id){return openDB().then(db=>new Promise((res,rej)=>{const tx=db.transaction(DB_STORE,'readonly');const r=tx.objectStore(DB_STORE).get(id);r.onsuccess=()=>res(r.result?.blob||null);r.onerror=()=>rej(r.error)}))}
function dbDelete(id){return openDB().then(db=>new Promise((res,rej)=>{const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).delete(id);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)}))}
const noteObjectUrls=new Set();
async function renderNoteImages(){
 for(const url of noteObjectUrls)URL.revokeObjectURL(url);noteObjectUrls.clear();
 const imgs=[...document.querySelectorAll('img[data-file-id]')];
 for(const img of imgs){try{const blob=await dbGet(img.dataset.fileId);if(blob){const url=URL.createObjectURL(blob);noteObjectUrls.add(url);img.src=url}}catch{}}
}
function renderNotes(){
 const selected=state.notes.find(n=>String(n.id)===String(selectedNoteId))||state.notes[0];
 if(selected)selectedNoteId=selected.id;state.selectedNote=selectedNoteId;
 $('notes').innerHTML=`
  <div class="section-head"><div><div class="section-kicker">Knowledge</div><div class="section-title">Notes</div><div class="section-sub">Write freely and keep images with the note.</div></div><div class="row"><button class="btn btn-primary" data-action="newNote">＋ New note</button></div></div>
  <div class="notes-layout">
   <aside class="card card-flat"><div class="row"><h2>Library</h2><span class="badge">${state.notes.length}</span></div><div class="note-list" style="margin-top:10px">${state.notes.map(n=>`<button class="note-card ${String(n.id)===String(selected?.id)?'active':''}" data-open-note="${esc(n.id)}" data-item-id="note-${esc(n.id)}" style="width:100%;text-align:left"><div class="row"><span class="note-card-title">${esc(n.title)}</span><span class="tiny muted">${esc(n.date||'Today')}</span></div><div class="small muted" style="margin-top:5px">${esc((n.text||'').slice(0,85))}${(n.text||'').length>85?'…':''}</div></button>`).join('')||'<div class="empty">No notes yet.</div>'}</div></aside>
   <article class="card note-editor">
    <div class="row" style="padding-bottom:12px;border-bottom:1px solid var(--line)"><div class="small muted">Simple editor</div><div class="row"><button class="btn btn-soft" data-action="attachImage">＋ Image</button><button class="btn btn-soft" data-action="deleteNote">Delete</button><button class="btn btn-primary" data-action="saveNote">Save</button></div></div>
    ${selected?`<input class="input" id="noteTitle" value="${esc(selected.title)}" placeholder="Untitled note" style="margin-top:12px;font-size:17px;font-weight:850;border-color:transparent;background:transparent;padding-left:0"><textarea class="editor" id="noteEditor" placeholder="Start writing…">${esc(selected.text||'')}</textarea>${selected.attachments?.length?`<div class="image-list">${selected.attachments.map(a=>`<div class="note-image-item"><img class="note-image" alt="${esc(a.name||'Image')}" data-file-id="${esc(a.id)}"><div class="note-image-meta"><span class="note-image-name">${esc(a.name||'Image')}</span><span class="row"><button class="btn btn-soft" data-view-image="${esc(a.id)}">View full screen</button><button class="btn btn-danger" data-delete-image="${esc(a.id)}">Delete</button></span></div></div>`).join('')}</div>`:''}`:'<div class="empty" style="margin-top:14px">Create a note to start writing.</div>'}
   </article>
  </div>`;
 renderNoteImages();
}
function openNewNote(){
 openModal('New note',`<div class="stack"><input class="input" id="newNoteTitle" placeholder="Title"><textarea class="textarea" id="newNoteText" placeholder="Write anything…"></textarea><button class="btn btn-primary" id="createNote">Create note</button></div>`,body=>{
  body.querySelector('#createNote').onclick=()=>{const title=body.querySelector('#newNoteTitle').value.trim()||'Untitled note';const text=body.querySelector('#newNoteText').value.trim();const note={id:uid(),title,text,type:'note',date:'Today',attachments:[]};state.notes.unshift(note);selectedNoteId=note.id;state.selectedNote=note.id;saveState();closeModal();renderAll();toast('Note created')};
 });
}
function saveCurrentNote(){const n=state.notes.find(x=>String(x.id)===String(selectedNoteId));if(!n)return;n.title=$('noteTitle')?.value.trim()||'Untitled note';n.text=$('noteEditor')?.value||'';n.date='Today';saveState();renderNotes();toast('Note saved')}
function deleteCurrentNote(){const n=state.notes.find(x=>String(x.id)===String(selectedNoteId));if(!n)return;const ids=(n.attachments||[]).map(a=>a.id);state.notes=state.notes.filter(x=>String(x.id)!==String(n.id));ids.forEach(id=>dbDelete(id).catch(()=>{}));selectedNoteId=state.notes[0]?.id||null;state.selectedNote=selectedNoteId;saveState();renderAll();toast('Note deleted')}
function openImagePicker(){
 if(!selectedNoteId){openNewNote();return}
 const input=document.createElement('input');input.type='file';input.accept='image/*';input.multiple=true;input.hidden=true;document.body.appendChild(input);input.onchange=async()=>{try{const n=state.notes.find(x=>String(x.id)===String(selectedNoteId));if(!n)return;n.attachments=n.attachments||[];for(const file of [...input.files]){const id=uid();await dbPut(id,file);n.attachments.push({id,name:file.name,type:file.type,size:file.size})}saveState();renderNotes();toast('Image added')}catch(e){toast('Image could not be added')}finally{input.remove()}};input.click();
}
async function viewImage(id){
 const n=state.notes.find(x=>String(x.id)===String(selectedNoteId));const a=n?.attachments?.find(x=>String(x.id)===String(id));if(!a)return;
 try{const blob=await dbGet(id);if(!blob){toast('Image data is unavailable');return}const url=URL.createObjectURL(blob);$('modal').dataset.imageObjectUrl=url;openModal(a.name||'Image',`<div class="image-full-box"><img class="image-full-preview" src="${url}" alt="${esc(a.name||'Image')}"><div class="row" style="margin-top:10px"><span class="small muted" style="overflow-wrap:anywhere">${esc(a.name||'Image')}</span><button class="btn btn-danger" data-delete-image="${esc(id)}">Delete</button></div></div>`)}catch{toast('Image could not be opened')}}
async function deleteImage(id){const n=state.notes.find(x=>String(x.id)===String(selectedNoteId));if(!n)return;n.attachments=(n.attachments||[]).filter(a=>String(a.id)!==String(id));const modalUrl=$('modal').dataset.imageObjectUrl;if(modalUrl){URL.revokeObjectURL(modalUrl);$('modal').dataset.imageObjectUrl='';closeModal()}try{await dbDelete(id)}catch{}saveState();renderNotes();toast('Image removed')}

/* WALLET */
function validUpi(value){return /^[^@\s]+@[^@\s]+$/.test(String(value||'').trim())}
function openWalletSetup(){
 openModal('Set up Wallet',`<div class="stack">
  <div><h2 style="font-size:24px">Set up your Wallet</h2><div class="small muted" style="margin-top:6px">Enter the amounts you currently have in each account.</div></div>
  <div class="grid grid-3"><label class="tiny muted">SAVING<input class="input" id="wSaving" inputmode="decimal" value="${esc(state.wallet.accounts.find(a=>a.name==='Saving')?.balance||0)}" placeholder="0"></label><label class="tiny muted">CURRENT<input class="input" id="wCurrent" inputmode="decimal" value="${esc(state.wallet.accounts.find(a=>a.name==='Current')?.balance||0)}" placeholder="0"></label><label class="tiny muted">CASH<input class="input" id="wCash" inputmode="decimal" value="${esc(state.wallet.accounts.find(a=>a.name==='Cash')?.balance||0)}" placeholder="0"></label></div>
  <label class="tiny muted">YOUR UPI ID<input class="input" id="walletUpi" value="${esc(state.wallet.upi||'')}" placeholder="name@upi"></label>
  <div class="small" id="walletSetupError" style="min-height:16px;color:var(--red)"></div>
  <button class="btn btn-primary" id="saveWalletSetup">Save Wallet</button>
 </div>`,body=>{
  body.querySelector('#saveWalletSetup').onclick=()=>{
   const saving=Number(body.querySelector('#wSaving').value)||0;
   const currentBal=Number(body.querySelector('#wCurrent').value)||0;
   const cash=Number(body.querySelector('#wCash').value)||0;
   const upi=body.querySelector('#walletUpi').value.trim();
   const err=body.querySelector('#walletSetupError');
   if([saving,currentBal,cash].some(v=>!Number.isFinite(v)||v<0)){err.textContent='Enter valid account amounts';return}
   if(!validUpi(upi)){err.textContent='Enter a valid UPI ID with text before and after @';return}
   const total=saving+currentBal+cash;
   state.wallet.balance=total;
   state.wallet.accounts=[{name:'Saving',balance:saving},{name:'Current',balance:currentBal},{name:'Cash',balance:cash}];
   state.wallet.upi=upi;
   state.wallet.setupComplete=true;
   saveState();closeModal();renderAll();toast('Wallet ready');
  };
 });
}
function renderWallet(){
 const paid=state.transactions.find(t=>t.type==='debit');const received=state.transactions.find(t=>t.type==='credit');
 $('wallet').innerHTML=`
  <div class="section-head"><div><div class="section-kicker">Money</div><div class="section-title">Wallet</div><div class="section-sub">Your balance, accounts, UPI and recent activity.</div></div><button class="btn btn-primary" data-wallet-action="send">Send money</button></div>
  ${!state.wallet.setupComplete?`<article class="card card-hero"><div class="eyebrow">Get started</div><h2 style="font-size:28px;margin-top:5px">Set up your Wallet</h2><p class="card-desc" style="font-size:12px;margin-top:9px">Enter your Saving, Current and Cash balances, then add your UPI ID.</p><button class="btn btn-primary" data-action="walletSetup">Set up now</button></article>`:`
  <div class="wallet-hero">
    <article class="card balance-card"><div class="row"><span class="badge blue">Wallet</span><span class="badge green">Ready</span></div><div class="tiny muted" style="margin-top:24px">AVAILABLE BALANCE</div><div class="balance-number">₹${formatMoney(state.wallet.balance)}</div><div class="small muted" style="margin-top:6px;overflow-wrap:anywhere">UPI ID · ${esc(state.wallet.upi||'Not set')}</div><div class="wallet-actions"><button class="wallet-action" data-wallet-action="send">Send</button><button class="wallet-action" data-wallet-action="request">Request</button></div></article>
    <article class="card"><div class="row"><div><h2>At a glance</h2><div class="small muted" style="margin-top:4px">Most recent paid and received amounts.</div></div></div><div class="glance-grid section-gap"><div class="glance-box"><span>RECENT PAID</span><strong>${paid?`₹${formatMoney(paid.amount)}`:'—'}</strong></div><div class="glance-box"><span>RECENT RECEIVED</span><strong>${received?`₹${formatMoney(received.amount)}`:'—'}</strong></div></div></article>
  </div>
  <div class="wallet-detail-grid section-gap">
    <article class="card"><div class="row"><h2>Accounts</h2><button class="btn-link" data-action="walletSetup">Edit →</button></div><div class="stack" style="margin-top:9px">${state.wallet.accounts.map(a=>`<div class="subtle"><div class="row"><strong>${esc(a.name)}</strong><strong>₹${formatMoney(a.balance)}</strong></div></div>`).join('')}</div></article>
    <article class="card transaction-list"><div class="row"><h2>Transactions</h2><button class="btn-link" data-action="allTransactions">View all →</button></div><div class="stack" style="margin-top:9px">${state.transactions.slice(0,5).map(t=>`<div class="transaction-row" data-item-id="tx-${esc(t.id)}"><span class="transaction-main"><strong>${esc(t.merchant)}</strong><small>${esc(t.date||'Today')}</small></span><strong class="transaction-amount ${t.type==='credit'?'credit':'debit'}">${t.type==='credit'?'+':'−'}₹${formatMoney(t.amount)}</strong></div>`).join('')||'<div class="empty">No transactions yet.</div>'}</div></article>
  </div>`}`;
}
function walletAction(type){
 if(type==='send'){
  openModal('Send money',`<div class="stack"><label class="tiny muted">UPI ID<input class="input" id="sendUpi" value="${esc(state.wallet.upi||'')}" placeholder="name@upi"></label><label class="tiny muted">AMOUNT<input class="input" id="sendAmount" inputmode="decimal" placeholder="0.00"></label><div class="small" id="sendError" style="min-height:16px;color:var(--red)"></div><button class="btn btn-primary" id="sendNow">Send</button></div>`,body=>{
    body.querySelector('#sendNow').onclick=()=>{
      const upi=body.querySelector('#sendUpi').value.trim(),amount=Number(body.querySelector('#sendAmount').value),err=body.querySelector('#sendError');
      if(!validUpi(upi)){err.textContent='Enter a valid UPI ID with text before and after @';return}
      if(!Number.isFinite(amount)||amount<=0){err.textContent='Enter a valid amount';return}
      if(amount>state.wallet.balance){err.textContent='Not enough balance';return}
      state.wallet.upi=upi;state.wallet.balance-=amount;
      let remaining=amount;for(const acct of state.wallet.accounts.filter(a=>a.name!=='Cash')){const take=Math.min(acct.balance,remaining);acct.balance-=take;remaining-=take;if(remaining<=0)break}
      const tx={id:uid(),merchant:upi,amount,type:'debit',date:'Today'};state.transactions.unshift(tx);saveState();
      const url=`upi://pay?pa=${encodeURIComponent(upi)}&am=${amount.toFixed(2)}&cu=INR`;
      closeModal();renderAll();toast('Opening UPI');
      setTimeout(()=>{window.location.href=url},120);
    };
  });return;
 }
 if(type==='request'){
  openModal('Request money',`<div class="stack"><div><h2 style="font-size:22px">Request money</h2><div class="small muted" style="margin-top:5px">Enter the person's UPI ID and the amount you want to request.</div></div><label class="tiny muted">PAYER UPI ID<input class="input" id="reqUpi" placeholder="name@upi"></label><label class="tiny muted">AMOUNT<input class="input" id="reqAmount" inputmode="decimal" placeholder="0.00"></label><div class="notice">Liora can prepare and share the request details, but a normal <code>upi://pay</code> link is a payment intent — it does not create a UPI collect request to another person.</div><div class="row wrap"><button class="btn btn-primary" id="requestNow">Create request</button><button class="btn btn-soft" id="copyRequest" disabled>Copy</button><button class="btn btn-soft" id="shareRequest" disabled>Share</button></div><div class="small" id="requestStatus" style="min-height:18px;color:var(--muted)"></div></div>`,body=>{
   const makeRequest=()=>{const payer=body.querySelector('#reqUpi').value.trim(),amount=Number(body.querySelector('#reqAmount').value);if(!validUpi(payer)||!Number.isFinite(amount)||amount<=0)return null;return {payer,amount}};
   body.querySelector('#requestNow').onclick=()=>{const req=makeRequest(),status=body.querySelector('#requestStatus');if(!req){status.textContent='Enter a valid UPI ID and amount';status.style.color='var(--red)';return}const message=`Liora is requesting ₹${req.amount.toFixed(2)}. Pay to ${state.wallet.upi}.`;body.querySelector('#copyRequest').disabled=false;body.querySelector('#copyRequest').dataset.requestText=message;body.querySelector('#shareRequest').disabled=false;body.querySelector('#shareRequest').dataset.requestText=message;status.innerHTML=`Request prepared for <strong>${esc(req.payer)}</strong> · ₹${req.amount.toFixed(2)}<br><span class="muted">Share the request with the payer so they can approve it in their UPI app.</span>`;status.style.color='var(--green)'};
   body.querySelector('#copyRequest').onclick=async()=>{const msg=body.querySelector('#copyRequest').dataset.requestText;if(!msg)return;try{await navigator.clipboard.writeText(msg);toast('Request copied')}catch{prompt('Copy request',msg)}};
   body.querySelector('#shareRequest').onclick=async()=>{const msg=body.querySelector('#shareRequest').dataset.requestText;if(!msg)return;if(navigator.share){try{await navigator.share({title:'Liora money request',text:msg})}catch{}}else{try{await navigator.clipboard.writeText(msg);toast('Request copied')}catch{prompt('Copy request',msg)}}};
  });return;
 }
}

/* CONNECT */
function normalizePhone(value){
 const raw=String(value||'').trim();const digits=raw.replace(/\D/g,'');if(digits.length<8||digits.length>15)return '';return raw.startsWith('+')?'+'+digits:digits;
}
function cleanContactName(c){
 let name=String(c?.name||'').trim();
 if(name.length>=2&&name.length%2===0&&name.slice(0,name.length/2).toLowerCase()===name.slice(name.length/2).toLowerCase())name=name.slice(0,name.length/2);
 if(c?.type==='group'){const count=Number(c.members?.length||0);const suffix=new RegExp(`\\s*${count}\\s*members?\\s*$`,'i');name=name.replace(suffix,'').trim()}
 return name||'Unnamed contact';
}
function repairContacts(){let changed=false;state.connect.contacts.forEach(c=>{const fixed=cleanContactName(c);if(c.name!==fixed){c.name=fixed;changed=true}});if(changed)saveState()}
function activeContact(){return state.connect.contacts.find(c=>String(c.id)===String(state.connect.activeId))||null}
function contactAvatar(c){return c?.type==='group'?'G':(cleanContactName(c)[0]||'?').toUpperCase()}
function contactMeta(c){if(c?.type==='group')return `${c.members?.length||0} member${(c.members?.length||0)===1?'':'s'}`;return c?.phone||c?.handle||'Direct contact'}
function renderConnect(){
 const active=activeContact();const msgs=active?.messages||[];
 $('connect').innerHTML=`
  <div class="section-head"><div><div class="section-kicker">Communication</div><div class="section-title">Connect</div><div class="section-sub">Messages, groups and direct external messaging.</div></div><div class="row"><span class="badge ${unreadCount()?'red':'green'}">${unreadCount()} unread</span><button class="btn btn-primary" data-action="newMessage">New message</button><button class="btn btn-soft" data-action="newGroup">New group</button></div></div>
  <div class="connect-layout">
   <aside class="card connect-left"><div class="row"><h2>People</h2><span class="badge">${state.connect.contacts.length}</span></div><div class="people-list" style="margin-top:8px">${state.connect.contacts.map(c=>`<button class="contact-row" data-contact="${esc(c.id)}"><span class="avatar-wrap"><span class="avatar ${c.type==='group'?'group':''}">${esc(contactAvatar(c))}</span>${c.online?'<span class="online"></span>':''}</span><span class="contact-copy"><strong class="contact-name">${esc(cleanContactName(c))}</strong><span class="contact-meta">${esc(c.type==='group'?'Group':(c.handle||c.phone||'Direct contact'))}</span></span><span class="contact-side">${c.type==='group'?`<span class="badge">${esc(contactMeta(c))}</span>`:((c.messages||[]).some(m=>m.incoming&&!m.read)?'<span class="badge red">New</span>':'<span class="tiny muted">›</span>')}</span></button>`).join('')||'<div class="empty">No conversations yet.</div>'}</div></aside>
   <article class="card chat">
    ${active?`<div class="chat-head"><div class="row"><div class="row-start"><span class="avatar">${esc(contactAvatar(active))}</span><div><strong>${esc(cleanContactName(active))}</strong><div class="small muted">${esc(contactMeta(active))}</div></div></div>${active.type!=='group'&&active.phone?`<div class="external-actions"><button class="btn btn-soft" data-external="sms">SMS</button><button class="btn btn-soft" data-external="whatsapp">WhatsApp</button></div>`:''}</div></div><div class="chat-messages">${msgs.map(m=>`<div class="bubble ${m.incoming?'in':'out'}"><div>${esc(m.text)}</div><div class="message-time">${esc(m.time)}</div></div>`).join('')||'<div class="empty">Start the conversation.</div>'}</div><div class="composer"><input class="input" id="messageInput" placeholder="Write a message…"><button class="btn btn-primary" data-send-message>Send</button></div>`:'<div class="empty" style="margin:auto 0">Click New message to start.</div>'}
   <aside class="card connect-right"><div class="section-kicker">Connect</div><h2 style="font-size:20px;margin-top:4px">External messaging</h2><div class="small muted" style="margin-top:7px;line-height:1.5">Phone-number contacts can open SMS or WhatsApp on the device.</div><div class="stack" style="margin-top:12px"><div class="subtle"><strong>Groups</strong><div class="small muted" style="margin-top:4px">${state.connect.contacts.filter(c=>c.type==='group').length} group${state.connect.contacts.filter(c=>c.type==='group').length===1?'':'s'}</div></div><button class="btn btn-soft" data-action="newMessage">＋ New message</button><button class="btn btn-soft" data-action="newGroup">＋ New group</button></div></aside>
  </div>`;
}
function newMessageModal(){
 openModal('New message',`<div class="stack"><label class="tiny muted">USERNAME OR PHONE NUMBER<input class="input" id="recipient" placeholder="@name or +919876543210"></label><label class="tiny muted">MESSAGE<textarea class="textarea" id="firstMessage" placeholder="Write a message…"></textarea></label><button class="btn btn-primary" id="startMessage">Start conversation</button></div>`,body=>{
  body.querySelector('#startMessage').onclick=()=>{const recipient=body.querySelector('#recipient').value.trim(),msg=body.querySelector('#firstMessage').value.trim();if(!recipient){toast('Enter a username or number');return}const phone=normalizePhone(recipient);const lookupHandle=recipient.startsWith('@')?recipient:('@'+recipient).replace(/^@@/,'@');let c=state.connect.contacts.find(x=>(phone&&x.phone===phone)||(x.handle===recipient)||(x.handle===lookupHandle));if(!c){const display=phone?'New contact':(recipient.startsWith('@')?recipient.slice(1):recipient);c={id:uid(),name:display,handle:phone?'':(recipient.startsWith('@')?recipient:('@'+recipient)),phone:phone||'',type:'person',online:false,members:[],messages:[]};state.connect.contacts.unshift(c)}c.name=cleanContactName(c);state.connect.activeId=c.id;if(msg)c.messages=(c.messages||[]).concat([{text:msg,incoming:false,time:messageTime()}]);current='connect';saveState();closeModal();renderAll();toast('Conversation created');if(phone&&msg)externalMessageChoice(c,msg)};
 });
}
function newGroupModal(){
 openModal('New group',`<div class="stack"><input class="input" id="groupName" placeholder="Group name"><label class="tiny muted">MEMBERS<input class="input" id="groupMembers" placeholder="Names, usernames or numbers"></label><button class="btn btn-primary" id="createGroup">Create group</button></div>`,body=>{body.querySelector('#createGroup').onclick=()=>{const name=body.querySelector('#groupName').value.trim();const members=body.querySelector('#groupMembers').value.split(',').map(x=>x.trim()).filter(Boolean);if(!name){toast('Enter a group name');return}const c={id:uid(),name,type:'group',members,online:false,messages:[]};state.connect.contacts.unshift(c);state.connect.activeId=c.id;current='connect';saveState();closeModal();renderAll();toast('Group created')}});
}
function messageTime(){return new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}
function sendMessage(){
 const c=activeContact(),input=$('messageInput');if(!c||!input)return;const text=input.value.trim();if(!text)return;c.messages=c.messages||[];c.messages.push({text,incoming:false,time:messageTime()});saveState();renderConnect();toast('Message added');if(c.phone)externalMessageChoice(c,text)
}
function externalMessageChoice(c,msg){
 openModal('Open message app',`<div class="stack"><div class="small muted">Choose where to send this to ${esc(c.name)}.</div><div class="external-actions"><a class="btn btn-primary" target="_blank" rel="noopener" href="sms:${esc(c.phone)}?body=${encodeURIComponent(msg)}">Open SMS</a><a class="btn btn-soft" target="_blank" rel="noopener" href="https://wa.me/${esc(c.phone.replace(/\\D/g,''))}?text=${encodeURIComponent(msg)}">Open WhatsApp</a></div></div>`);
}
function openExternal(type){
 const c=activeContact();if(!c?.phone)return;const last=[...(c.messages||[])].reverse().find(m=>!m.incoming)?.text||'';if(type==='sms')window.location.href=`sms:${c.phone}?body=${encodeURIComponent(last)}`;if(type==='whatsapp')window.open(`https://wa.me/${c.phone.replace(/\\D/g,'')}?text=${encodeURIComponent(last)}`,'_blank');
}
function markActiveRead(){const c=activeContact();if(!c)return;(c.messages||[]).forEach(m=>{if(m.incoming)m.read=true});saveState()}

repairContacts();

/* MEDIA */
function randomDuration(){return Math.floor(90+Math.random()*271)}
function currentMedia(){return state.media.items.find(x=>String(x.id)===String(state.media.currentId))||null}
function mediaProgress(item){return item?Math.max(0,Math.min(100,(item.position||0)/(item.duration||1)*100)):0}
let ytPlayer=null;let ytCurrentId=null;let ytApiPromise=null;
function loadYouTubeAPI(){if(window.YT?.Player)return Promise.resolve(window.YT);if(ytApiPromise)return ytApiPromise;ytApiPromise=new Promise(resolve=>{window.onYouTubeIframeAPIReady=()=>resolve(window.YT);const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.async=true;document.head.appendChild(script)});return ytApiPromise}
function extractYouTubeId(value){const raw=String(value||'').trim();if(!raw)return'';try{const u=new URL(raw);const host=u.hostname.replace(/^www\./,'');if(host==='youtu.be')return u.pathname.split('/').filter(Boolean)[0]||'';if(host==='youtube.com'||host.endsWith('.youtube.com')){if(u.pathname==='/watch')return u.searchParams.get('v')||'';const parts=u.pathname.split('/').filter(Boolean);if(['shorts','embed','live'].includes(parts[0]))return parts[1]||''}}catch{}return''}
async function fetchYouTubeTitle(url){try{const r=await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);if(r.ok){const d=await r.json();return d.title||''}}catch{}return''}
function updateMediaReadout(item){const p=document.querySelector('.player-card .progress-line span');if(p)p.style.width=mediaProgress(item)+'%';const t=document.querySelector('.player-card .media-time');if(t)t.textContent=`${formatTime(item.position||0)} / ${formatTime(item.duration)}`}
async function setupYouTubePlayer(item,autoplay=false){
 if(!item?.youtubeId)return;
 if(!(location.protocol==='https:'||location.protocol==='http:'))return;
 ytCurrentId=item.id;
 try{
  const YT=await loadYouTubeAPI();if(String(ytCurrentId)!==String(item.id))return;if(ytPlayer?.destroy)try{ytPlayer.destroy()}catch{}
  const playerVars={playsinline:1,rel:0,enablejsapi:1,origin:location.origin};
  ytPlayer=new YT.Player('yt-player-frame',{videoId:item.youtubeId,playerVars,events:{onReady:e=>{const d=e.target.getDuration();if(d>0){item.duration=Math.round(d);item.position=Math.min(item.position||0,item.duration);saveState();updateMediaReadout(item)}if(autoplay)e.target.playVideo()},onError:e=>{if(e.data===153)toast('Serve Liora over HTTPS or localhost for YouTube playback');else toast('This YouTube video cannot be embedded')},onStateChange:e=>{const playing=e.data===YT.PlayerState.PLAYING;const ended=e.data===YT.PlayerState.ENDED;state.media.playing=playing;if(ended){item.position=item.duration||0;stopMediaLoop()}else if(playing)startMediaLoop();else stopMediaLoop();saveState();updateMediaReadout(item);const b=document.querySelector('[data-media-play]');if(b)b.textContent=playing?'Ⅱ':'▶'}}});
 }catch{toast('YouTube player could not be loaded')}
}
function renderMedia(){const m=currentMedia();if(ytPlayer?.destroy)try{ytPlayer.destroy()}catch{}ytPlayer=null;stopMediaLoop();$('media').innerHTML=`
 <div class="section-head"><div><div class="section-kicker">Media</div><div class="section-title">Media</div><div class="section-sub">Add songs or videos by title, or attach a YouTube video to play inside Liora.</div></div><div class="row"><button class="btn btn-primary" data-action="newMedia">＋ Add media</button></div></div>
 <div class="media-grid"><article class="card player-card">
 ${m?`${m.youtubeId?(location.protocol==='https:'||location.protocol==='http:'?`<div class="youtube-frame"><div id="yt-player-frame"></div></div>`:`<div class="youtube-local"><img src="https://img.youtube.com/vi/${esc(m.youtubeId)}/hqdefault.jpg" alt="YouTube thumbnail"><div class="youtube-local-overlay"><strong>YouTube playback</strong><small>Open Liora over HTTPS or localhost to play YouTube videos inside the player.</small><a class="btn btn-primary" target="_blank" rel="noopener" href="https://www.youtube.com/watch?v=${esc(m.youtubeId)}">Watch on YouTube</a></div></div>`):(m.kind==='Video'?`<div class="video-placeholder"><div class="video-unavail"><span style="display:grid;place-items:center;width:58px;height:40px;margin:0 auto 12px;border-radius:9px;background:#ff0033;color:white;font-size:18px">▶</span>Video unavailable<small>Paste a YouTube link when adding a video to play it here.</small></div></div>`:`<div class="row"><div class="album-art"><div class="album-disc"></div></div><div style="flex:1;min-width:0;padding-left:14px"><div class="section-kicker">Now playing</div><h2 class="player-title" style="font-size:30px;margin-top:5px" title="${esc(m.title)}">${esc(m.title)}</h2><div class="small muted" style="margin-top:6px">${esc(m.kind)}</div></div></div>`)}
 <div class="row media-time-row" style="margin-top:18px"><strong class="player-title" title="${esc(m.title)}">${esc(m.title)}</strong><span class="small muted media-time">${formatTime(m.position||0)} / ${formatTime(m.duration)}</span></div><div class="progress-line" data-media-scrub style="margin-top:9px"><span style="width:${mediaProgress(m)}%"></span></div><div class="transport"><button class="icon-btn" data-media-prev>‹</button><button class="play-btn" data-media-play>${state.media.playing?'Ⅱ':'▶'}</button><button class="icon-btn" data-media-next>›</button></div><div class="row wrap" style="margin-top:12px"><button class="btn-link" data-media-search="google">Search Google</button><button class="btn-link" data-media-search="youtube">Search YouTube</button><button class="btn-link" data-delete-media="${esc(m.id)}">Delete</button></div>`:'<div class="empty" style="margin-top:80px"><div style="font-size:18px;font-weight:850;color:var(--text)">Your media library is empty.</div><div class="small muted" style="margin-top:6px">Add a song or video to start.</div><button class="btn btn-primary" data-action="newMedia" style="margin-top:12px">Add media</button></div>'}</article>
 <article class="card"><div class="row"><div><div class="section-kicker">Library</div><h2 style="font-size:20px;margin-top:4px">Your media</h2></div><span class="badge">${state.media.items.length}</span></div><div class="stack" style="margin-top:9px">${state.media.items.map(x=>`<div class="media-row" data-item-id="media-${esc(x.id)}"><button style="text-align:left;min-width:0" data-play-media-id="${esc(x.id)}"><strong style="font-size:11px">${esc(x.title)}</strong><div class="tiny muted" style="margin-top:2px">${esc(x.kind)} · ${formatTime(x.duration)}${x.youtubeId?' · YouTube':''}</div></button><button class="btn-link" data-media-search="youtube" data-media-title="${esc(x.title)}">Search</button><button class="icon-btn small-icon" data-delete-media="${esc(x.id)}">×</button></div>`).join('')||'<div class="empty">Nothing saved yet.</div>'}</div></article></div>`;if(m?.youtubeId&&(location.protocol==='https:'||location.protocol==='http:'))setTimeout(()=>setupYouTubePlayer(m,state.media.playing),0);else if(state.media.playing&&m&&!m.youtubeId)startMediaLoop()}
function openMediaModal(){openModal('Add media',`<div class="stack"><label class="tiny muted">TITLE<input class="input" id="mediaTitle" placeholder="Optional — YouTube titles can be fetched automatically"></label><label class="tiny muted">YOUTUBE LINK<input class="input" id="mediaYoutube" placeholder="https://www.youtube.com/watch?v=..."></label><label class="tiny muted">TYPE<select class="select" id="mediaKind"><option>Music</option><option>Video</option></select></label><div class="small muted">A YouTube link will open inside Liora's player.</div><button class="btn btn-primary" id="saveMedia">Add to library</button></div>`,body=>{body.querySelector('#saveMedia').onclick=async()=>{const inputTitle=body.querySelector('#mediaTitle').value.trim(),yt=body.querySelector('#mediaYoutube').value.trim(),kind=body.querySelector('#mediaKind').value,ytId=extractYouTubeId(yt);if(yt&&!ytId){toast('Enter a valid YouTube link');return}let title=inputTitle;if(!title&&yt){toast('Getting video title…');title=await fetchYouTubeTitle(yt)}if(!title)title=yt?'YouTube video':'Untitled media';const item={id:uid(),title,kind:ytId?'Video':kind,duration:randomDuration(),position:0,youtubeId:ytId||''};state.media.items.unshift(item);state.media.currentId=item.id;state.media.playing=false;saveState();closeModal();renderAll();toast('Media added')}})}
function toggleMedia(){const m=currentMedia();if(!m)return;if(m.youtubeId){if(!(location.protocol==='https:'||location.protocol==='http:')){toast('Open Liora over HTTPS or localhost to play YouTube here');return}if(!ytPlayer){toast('Loading YouTube player…');state.media.playing=true;saveState();setupYouTubePlayer(m,true);const b=document.querySelector('[data-media-play]');if(b)b.textContent='Ⅱ';return}try{if(state.media.playing)ytPlayer.pauseVideo();else ytPlayer.playVideo()}catch{}return}if(m.position>=m.duration)m.position=0;state.media.playing=!state.media.playing;saveState();if(state.media.playing)startMediaLoop();else stopMediaLoop();const b=document.querySelector('[data-media-play]');if(b)b.textContent=state.media.playing?'Ⅱ':'▶'}
function startMediaLoop(){if(mediaInterval)clearInterval(mediaInterval);mediaInterval=setInterval(()=>{const m=currentMedia();if(!m)return;if(m.youtubeId&&ytPlayer){try{m.position=Math.floor(ytPlayer.getCurrentTime());const d=ytPlayer.getDuration();if(d>0)m.duration=Math.round(d)}catch{}updateMediaReadout(m);saveState();return}if(!state.media.playing)return;m.position=(m.position||0)+1;if(m.position>=m.duration){m.position=m.duration;state.media.playing=false;stopMediaLoop();saveState();renderMedia();return}updateMediaReadout(m)},1000)}
function stopMediaLoop(){if(mediaInterval){clearInterval(mediaInterval);mediaInterval=null}}
function changeMedia(dir){const idx=state.media.items.findIndex(x=>String(x.id)===String(state.media.currentId));if(idx<0||!state.media.items.length)return;const next=(idx+dir+state.media.items.length)%state.media.items.length;state.media.currentId=state.media.items[next].id;state.media.playing=false;stopMediaLoop();saveState();renderMedia()}
function deleteMedia(id){const exists=state.media.items.find(x=>String(x.id)===String(id));if(!exists)return;state.media.items=state.media.items.filter(x=>String(x.id)!==String(id));if(String(state.media.currentId)===String(id))state.media.currentId=state.media.items[0]?.id||null;state.media.playing=false;stopMediaLoop();saveState();renderMedia();toast('Media deleted')}
function searchMedia(title,where){const q=title||currentMedia()?.title||'';if(!q)return;const url=where==='google'?`https://www.google.com/search?q=${encodeURIComponent(q)}`:`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;window.open(url,'_blank','noopener')}

/* TRAVEL */
function renderTravel(){
 $('travel').innerHTML=`
  <div class="section-head"><div><div class="section-kicker">Movement</div><div class="section-title">Travel</div><div class="section-sub">Plan trips and keep a simple list of places you want to remember.</div></div><button class="btn btn-primary" data-action="trip">＋ Plan a trip</button></div>
  <article class="card card-hero travel-hero">
   <div style="display:flex;flex-direction:column;justify-content:center"><div class="section-kicker">Travel space</div><h2 style="font-size:34px;margin-top:5px;letter-spacing:-.06em">A clean place for the next trip.</h2><p class="card-desc" style="max-width:520px;font-size:12px;margin-top:10px">Choose a destination, pick a start date and keep your saved places close.</p><div class="hero-actions"><button class="btn btn-primary" data-action="trip">Plan a trip</button><button class="btn btn-soft" data-action="newPlace">＋ Saved place</button></div></div>
   <div class="map-art"><div class="map-grid"></div><div class="road" style="width:260px;left:34px;top:125px;transform:rotate(-18deg)"></div><div class="road" style="width:210px;right:20px;top:182px;transform:rotate(17deg)"></div><div class="pin" style="left:44%;top:36%"></div><div class="pin" style="left:71%;top:63%;transform:rotate(-45deg) scale(.8)"></div></div>
  </article>
  <div class="grid grid-2 section-gap">
   <article class="card"><div class="row"><div><div class="section-kicker">Trips</div><h2 style="font-size:21px;margin-top:4px">Your trips</h2></div><span class="badge blue">${state.trips.length}</span></div><div class="stack" style="margin-top:11px">${state.trips.map(tripCard).join('')||'<div class="empty">No trips planned yet.</div>'}</div></article>
   <article class="card"><div class="row"><div><div class="section-kicker">Places</div><h2 style="font-size:21px;margin-top:4px">Saved places</h2></div><button class="btn-link" data-action="newPlace">Add →</button></div><div class="stack" style="margin-top:11px">${state.savedPlaces.map(p=>`<div class="place-row" data-item-id="place-${esc(p.id)}"><strong>${esc(p.name)}</strong><button class="icon-btn small-icon" data-delete-place="${esc(p.id)}">×</button></div>`).join('')||'<div class="empty">No places saved yet.</div>'}</div></article>
  </div>`;
}
function tripCard(t){return`<button class="trip-card" data-open-trip="${esc(t.id)}" data-item-id="trip-${esc(t.id)}"><div><div class="tiny muted">${esc(t.status||'Upcoming')}</div><strong style="font-size:14px;display:block;margin-top:5px">${esc(t.dest)}</strong><div class="small muted" style="margin-top:4px">${t.days} day${t.days===1?'':'s'} · starts ${esc(formatTripDate(t.start))}</div></div><span style="font-size:20px">›</span></button>`}
function formatTripDate(s){if(!s)return'—';const d=new Date(s);return Number.isNaN(d.getTime())?s:d.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}
function planTrip(){
 openModal('Plan a trip',`<div class="stack"><label class="tiny muted">DESTINATION<input class="input" id="tripDest" placeholder="e.g. Bengaluru"></label><label class="tiny muted">NUMBER OF DAYS<input class="input" id="tripDays" type="number" min="1" value="1"></label><label class="tiny muted">START DAY<input class="input" id="tripStart" type="date"></label><button class="btn btn-primary" id="createTrip">Create trip</button></div>`,body=>{
  body.querySelector('#tripStart').value=todayKey();
  body.querySelector('#createTrip').onclick=()=>{const dest=body.querySelector('#tripDest').value.trim(),days=Math.max(1,Number(body.querySelector('#tripDays').value)||1),start=body.querySelector('#tripStart').value;if(!dest){toast('Add a destination');return}if(!start){toast('Choose a start day');return}const trip={id:uid(),dest,days,start,status:'Upcoming'};state.trips.unshift(trip);saveState();closeModal();showPage('travel',{type:'trip',id:trip.id});toast('Trip created')};
 });
}
function openTrip(id){const t=state.trips.find(x=>String(x.id)===String(id));if(!t)return;openModal(t.dest,`<div class="stack"><div class="subtle"><div class="tiny muted">START DAY</div><strong style="display:block;margin-top:4px">${esc(formatTripDate(t.start))}</strong></div><div class="subtle"><div class="tiny muted">DURATION</div><strong style="display:block;margin-top:4px">${t.days} day${t.days===1?'':'s'}</strong></div><button class="btn btn-soft" data-close-modal>Close</button></div>`)}
function newPlace(){openModal('Saved place',`<div class="stack"><input class="input" id="placeName" placeholder="Place name"><button class="btn btn-primary" id="savePlace">Save place</button></div>`,body=>{body.querySelector('#savePlace').onclick=()=>{const n=body.querySelector('#placeName').value.trim();if(!n){toast('Enter a place name');return}state.savedPlaces.unshift({id:uid(),name:n});saveState();closeModal();renderAll();toast('Place saved')}})}
function deletePlace(id){state.savedPlaces=state.savedPlaces.filter(p=>String(p.id)!==String(id));saveState();renderTravel();toast('Place deleted')}

/* DISCOVER */
const DISCOVERY_POOL=[
 {tag:'Technology',type:'read',title:'CSS reference',body:'A practical reference for building with modern web styling.',link:'https://developer.mozilla.org/en-US/docs/Web/CSS'},
 {tag:'Technology',type:'read',title:'JavaScript guide',body:'A structured guide to the language behind interactive web experiences.',link:'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide'},
 {tag:'Science',type:'watch',title:'NASA',body:'Explore missions, images, science and discoveries from NASA.',link:'https://www.nasa.gov/'},
 {tag:'Stories',type:'read',title:'The stories behind great films',body:'Browse film information, credits and plot summaries.',link:'https://www.imdb.com/'},
 {tag:'Design',type:'read',title:'Awwwards',body:'A gallery of current web design and interactive work.',link:'https://www.awwwards.com/'},
 {tag:'Learning',type:'read',title:'Khan Academy',body:'Free learning across math, computing, science and more.',link:'https://www.khanacademy.org/'},
 {tag:'Music',type:'listen',title:'Spotify',body:'Search for any song, album or artist and listen there.',link:'https://open.spotify.com/'},
 {tag:'Video',type:'watch',title:'YouTube',body:'Search for videos and open the result directly on YouTube.',link:'https://www.youtube.com/'},
 {tag:'Science',type:'read',title:'National Geographic',body:'Science, nature, exploration and stories from around the world.',link:'https://www.nationalgeographic.com/'},
 {tag:'Design',type:'read',title:'Smashing Magazine',body:'Front-end, UX and design articles for people who build on the web.',link:'https://www.smashingmagazine.com/'},
 {tag:'Stories',type:'read',title:'Project Gutenberg',body:'A large library of public-domain books and literature.',link:'https://www.gutenberg.org/'},
 {tag:'Travel',type:'read',title:'Wikivoyage',body:'Open travel guides covering places around the world.',link:'https://en.wikivoyage.org/'}
];
function shuffle(a){return a.map(v=>[Math.random(),v]).sort((x,y)=>x[0]-y[0]).map(x=>x[1])}
function discoverItems(){const topics=state.discover.topics;const filtered=DISCOVERY_POOL.filter(x=>topics.length?topics.includes(x.tag)||x.tag==='Music'||x.tag==='Video':true);return shuffle(filtered.length>=6?filtered:DISCOVERY_POOL).slice(0,6)}
function renderDiscover(){
 const items=discoverItems();
 $('discover').innerHTML=`
  <div class="section-head"><div><div class="section-kicker">Explore</div><div class="section-title">Discover</div><div class="section-sub">Tap interests to shape the next set of finds.</div></div><span class="badge blue">${state.discover.topics.length} interests</span></div>
  ${state.saved.length?`<article class="card saved-top"><div class="row"><div><div class="section-kicker">Saved for later</div><h2 style="font-size:21px;margin-top:4px">${state.saved.length} saved</h2></div></div><div class="stack" style="margin-top:10px">${state.saved.map((s,i)=>`<div class="simple-row"><span class="simple-row-main"><strong>${esc(s.title)}</strong><small>${esc(s.type||'Saved')}</small></span><span class="row"><a class="btn-link" target="_blank" rel="noopener" href="${esc(s.link)}">Open</a><button class="icon-btn small-icon" data-delete-saved="${esc(s.id||s.title)}">×</button></span></div>`).join('')}</div></article>`:''}
  <article class="card card-hero discover-hero">
   <div><div class="section-kicker">Your interests</div><h2 style="font-size:34px;max-width:590px;margin-top:6px;letter-spacing:-.06em">Choose what you want to see.</h2><p class="card-desc" style="font-size:12px;max-width:560px;margin-top:10px">Selected interests are saved instantly.</p><div class="topic-row">${['Technology','Science','Stories','Campus','Design','Learning','Travel','Games','Music','Video'].map(t=>`<button class="chip ${state.discover.topics.includes(t)?'active':''}" data-topic-toggle="${esc(t)}">${esc(t)}</button>`).join('')}</div></div>
   <svg viewBox="0 0 420 260" style="width:100%;height:220px"><defs><linearGradient id="d1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#59d9ff"/><stop offset="1" stop-color="#a884ff"/></linearGradient></defs><circle cx="210" cy="130" r="88" fill="none" stroke="rgba(121,162,255,.12)" stroke-width="2"/><circle cx="210" cy="130" r="55" fill="rgba(121,162,255,.05)" stroke="rgba(121,162,255,.14)"/><circle cx="210" cy="130" r="12" fill="url(#d1)"/><path d="M210 42 A88 88 0 0 1 286 152" fill="none" stroke="url(#d1)" stroke-width="5" stroke-linecap="round"/><path d="M132 167 A88 88 0 0 0 218 217" fill="none" stroke="#a884ff" stroke-opacity=".5" stroke-width="4" stroke-linecap="round"/></svg>
  </article>
  <div class="discovery-grid">${items.map((item,i)=>{const saved=state.saved.some(s=>s.title===item.title);return`<article class="card story-card" data-item-id="discover-${esc(item.title)}"><div class="story-visual"></div><div class="story-copy"><span class="badge blue">${esc(item.tag)} · ${esc(item.type)}</span><h2 style="font-size:17px;margin-top:8px">${esc(item.title)}</h2><div class="small muted" style="margin-top:7px;line-height:1.5">${esc(item.body)}</div><div class="hero-actions"><a class="btn btn-soft" target="_blank" rel="noopener" href="${esc(item.link)}">${item.type==='watch'?'Watch':item.type==='listen'?'Listen':'Read'}</a><button class="btn ${saved?'btn-primary':'btn-soft'}" data-save-discovery="${esc(item.title)}" data-save-link="${esc(item.link)}" data-save-type="${esc(item.type)}">${saved?'Saved':'Save for later'}</button></div></div></article>`}).join('')}</div>`;
}
function toggleTopic(t){if(state.discover.topics.includes(t))state.discover.topics=state.discover.topics.filter(x=>x!==t);else state.discover.topics.push(t);saveState();renderDiscover()}
function saveDiscovery(title,link,type){const found=state.saved.find(s=>s.title===title);if(found){state.saved=state.saved.filter(s=>s.id!==found.id);toast('Removed from saved')}else{state.saved.unshift({id:uid(),title,link,type});toast('Saved for later')}saveState();renderDiscover()}
function deleteSaved(id){state.saved=state.saved.filter(s=>String(s.id||s.title)!==String(id));saveState();renderDiscover();toast('Removed from saved')}

/* AI */
const FALLBACK_AI=[{match:['hello','hi','hey'],response:'Hello. I am Liora AI.'},{match:['open planner','show planner'],response:'Opening Planner.'},{match:['open notes','show notes'],response:'Opening Notes.'},{match:['open wallet','show wallet'],response:'Opening Wallet.'},{match:['focus','start focus'],response:'Starting focus.'},{match:['open media','show media'],response:'Opening Media.'},{match:['open travel','show travel'],response:'Opening Travel.'},{match:['open discover','show discover'],response:'Opening Discover.'},{match:['open connect','show connect'],response:'Opening Connect.'},{match:['open settings','show settings'],response:'Opening Settings.'}];
async function loadAICommands(){
 try{const r=await fetch('liora-commands.json',{cache:'no-store'});if(r.ok){const data=await r.json();if(Array.isArray(data))aiCommands=data}}
 catch{}
 if(!aiCommands.length)aiCommands=FALLBACK_AI;
}
function aiResponse(input){
 const q=normalizeInput(input);
 const hit=aiCommands.find(item=>Array.isArray(item.match)&&item.match.map(normalizeInput).includes(q));
 return hit?.response||'I do not have a saved response for that message yet.';
}
function executeAiResponse(response){
 const s=normalizeInput(response);
 if(s.includes('opening planner'))showPage('planner');
 else if(s.includes('opening notes'))showPage('notes');
 else if(s.includes('opening wallet'))showPage('wallet');
 else if(s.includes('starting focus')){showPage('home');toggleFocus()}
 else if(s.includes('opening media'))showPage('media');
 else if(s.includes('opening travel'))showPage('travel');
 else if(s.includes('opening discover'))showPage('discover');
 else if(s.includes('opening connect'))showPage('connect');
 else if(s.includes('opening settings'))showPage('settings');
}
function renderAI(){
 $('ai').innerHTML=`
  <div class="section-head"><div><div class="section-kicker">Assistant</div><div class="section-title">Liora AI</div><div class="section-sub">Fixed responses loaded from a JSON command list.</div></div><span class="badge blue">${aiCommands.length} commands</span></div>
  <article class="card" style="min-height:620px;display:flex;flex-direction:column">
   <div style="flex:1;overflow:auto;padding-right:2px" id="aiFeed">${aiHistory.length?aiHistory.map(m=>`<div class="bubble ${m.role==='user'?'out':'in'}" style="margin-bottom:10px"><div class="role tiny muted">${m.role==='user'?'You':'Liora AI'}</div><div>${esc(m.text).replace(/\\n/g,'<br>')}</div></div>`).join(''):'<div class="empty">Type a message that exists in the JSON command list.</div>'}</div>
   <div class="composer"><input class="input" id="aiInput" placeholder="Type a command…"><button class="btn btn-primary" data-send-ai>Send</button></div>
  </article>`;
 const feed=$('aiFeed');if(feed)feed.scrollTop=feed.scrollHeight;
}
function sendAI(text){const q=(text||$('aiInput')?.value||'').trim();if(!q)return;if($('aiInput'))$('aiInput').value='';aiHistory.push({role:'user',text:q});const response=aiResponse(q);aiHistory.push({role:'assistant',text:response});saveAI();renderAI();setTimeout(()=>executeAiResponse(response),20)}

/* SETTINGS */
function settingRow(title,desc,value,key){return`<div class="setting-row"><div class="setting-copy"><strong>${esc(title)}</strong><div class="small muted" style="margin-top:4px;line-height:1.5">${esc(desc)}</div></div><button class="switch ${value?'on':''}" data-setting-toggle="${esc(key)}" aria-label="${esc(title)}"><span></span></button></div>`}
function renderSettings(){
 $('settings').innerHTML=`
  <div class="section-head"><div><div class="section-kicker">System</div><div class="section-title">Settings</div><div class="section-sub">Controls that shape how Liora behaves.</div></div><span class="badge green">Ready</span></div>
  <div class="settings-grid">
   <article class="card settings-card"><div class="row"><div><h2>Core controls</h2><div class="small muted" style="margin-top:4px">Keep only the controls that matter.</div></div></div>
    ${settingRow('Short brief','A short summary every time you open Liora',state.settings.morningBrief,'morningBrief')}
    ${settingRow('Notifications','Allow Liora to send browser alerts when something needs your attention',state.settings.notifications&&('Notification' in window&&Notification.permission==='granted'),'notifications')}<div class="permission-row"><span class="small muted">${esc(notificationStatus().label)}</span><button class="btn btn-soft" data-action="requestNotifications">${esc(notificationStatus().action)}</button></div>
    ${settingRow('Cross-device sync','Keep the same state available when sync is connected',state.settings.sync,'sync')}
    ${settingRow('Voice assistant','Enable the voice setting for future integrations',state.settings.voice,'voice')}
   </article>
   <article class="card settings-card"><div class="pwa-card"><div class="pwa-card-copy"><h2>App</h2><div class="small muted" style="margin-top:4px">Liora keeps your data on this device and can work offline after the first web load.</div><div class="install-note" id="pwaStatus" style="margin-top:7px">Checking app install support…</div></div><div class="pwa-actions"><button class="btn btn-primary" id="installAppBtn" data-action="installApp">Install Liora</button><button class="btn btn-soft" data-action="checkUpdates">Check for updates</button></div></div></article>
   <article class="card settings-card"><div><h2>Appearance</h2><div class="small muted" style="margin-top:4px">Dark is the default theme.</div></div><div class="theme-switch section-gap"><button class="theme-btn ${state.settings.theme==='dark'?'active':''}" data-theme="dark">Dark</button><button class="theme-btn ${state.settings.theme==='light'?'active':''}" data-theme="light">Light</button></div></article>
   <article class="card settings-card"><div><h2>Account</h2><div class="small muted" style="margin-top:4px">Your local profile.</div></div><div class="subtle profile-card section-gap"><div class="large-avatar">${esc((state.profile.name||'L').slice(0,1).toUpperCase())}</div><div><strong>${esc(state.profile.name||'Your name')}</strong><div class="small muted" style="margin-top:3px">Liora account</div></div></div><button class="btn btn-soft" data-action="changeName" style="margin-top:10px">Change name</button></article>
   <article class="card settings-card"><div><h2>Storage & data</h2><div class="small muted" style="margin-top:4px">Notes images use browser file storage while your main state stays lightweight.</div></div><div class="grid grid-2 section-gap"><div class="subtle"><div class="tiny muted">NOTES</div><strong style="font-size:22px;display:block;margin-top:4px">${state.notes.length}</strong></div><div class="subtle"><div class="tiny muted">MEDIA</div><strong style="font-size:22px;display:block;margin-top:4px">${state.media.items.length}</strong></div><div class="subtle"><div class="tiny muted">TASKS</div><strong style="font-size:22px;display:block;margin-top:4px">${state.tasks.length}</strong></div><div class="subtle"><div class="tiny muted">TRIPS</div><strong style="font-size:22px;display:block;margin-top:4px">${state.trips.length}</strong></div></div><div class="hero-actions"><button class="btn btn-soft" data-action="exportData">Export data</button><button class="btn btn-danger" data-action="resetData">Reset data</button></div></article>
  </div>`;
}
function changeName(){openModal('Your name',`<div class="stack"><input class="input" id="nameInput" value="${esc(state.profile.name||'')}" placeholder="Your name"><button class="btn btn-primary" id="saveName">Save</button></div>`,body=>{body.querySelector('#saveName').onclick=()=>{const n=body.querySelector('#nameInput').value.trim();if(!n){toast('Enter your name');return}state.profile.name=n;saveState();closeModal();renderAll();toast('Name updated')}})}

/* search */
function openSearch(){
 openModal('Search Liora',`<div class="stack"><input class="input" id="globalSearchInput" placeholder="Search tasks, notes, messages, media, trips, places…"><div id="globalSearchResults" class="stack"></div></div>`,body=>{
  const input=body.querySelector('#globalSearchInput'),result=body.querySelector('#globalSearchResults');
  const run=()=>{const q=normalizeInput(input.value);if(!q){result.innerHTML='<div class="empty">Search across your connected spaces.</div>';return}
   const out=[];
   state.tasks.forEach(t=>{if((t.text+' '+(t.time||'')+' '+(t.due||'')).toLowerCase().includes(q))out.push({section:'Planner',title:t.text,meta:t.time?formatDateTime(t.time):'Task',page:'planner',focus:{type:'task',id:t.id}})});
   state.notes.forEach(n=>{if((n.title+' '+(n.text||'')).toLowerCase().includes(q))out.push({section:'Notes',title:n.title,meta:'Note',page:'notes',focus:{type:'note',id:n.id}})});
   state.connect.contacts.forEach(c=>{if((c.name+' '+(c.handle||'')+' '+(c.phone||'')).toLowerCase().includes(q))out.push({section:'Connect',title:c.name,meta:c.type==='group'?'Group':'Contact',page:'connect',focus:{type:'contact',id:c.id}});(c.messages||[]).forEach(m=>{if(m.text.toLowerCase().includes(q))out.push({section:'Connect',title:m.text,meta:c.name,page:'connect',focus:{type:'contact',id:c.id}})})});
   state.transactions.forEach(t=>{if((t.merchant+' '+t.amount).toLowerCase().includes(q))out.push({section:'Wallet',title:t.merchant,meta:'Transaction',page:'wallet',focus:{type:'tx',id:t.id}})});
   state.media.items.forEach(m=>{if((m.title+' '+m.kind).toLowerCase().includes(q))out.push({section:'Media',title:m.title,meta:m.kind,page:'media',focus:{type:'media',id:m.id}})});
   state.trips.forEach(t=>{if((t.dest+' '+t.start).toLowerCase().includes(q))out.push({section:'Travel',title:t.dest,meta:'Trip',page:'travel',focus:{type:'trip',id:t.id}})});
   state.savedPlaces.forEach(p=>{if(p.name.toLowerCase().includes(q))out.push({section:'Travel',title:p.name,meta:'Saved place',page:'travel',focus:{type:'place',id:p.id}})});
   state.goals.forEach(g=>{if(g.name.toLowerCase().includes(q))out.push({section:'Planner',title:g.name,meta:'Goal',page:'planner',focus:{type:'goal',id:g.id}})});
   state.saved.forEach(s=>{if((s.title+' '+(s.type||'')).toLowerCase().includes(q))out.push({section:'Discover',title:s.title,meta:'Saved',page:'discover',focus:{type:'saved',id:s.id}})});
   result.innerHTML=out.length?out.map((r,i)=>`<button class="simple-row" data-search-result-index="${i}" style="width:100%"><span class="simple-row-main"><strong>${esc(r.title)}</strong><small>${esc(r.section)} · ${esc(r.meta)}</small></span><span>›</span></button>`).join(''):'<div class="empty">Nothing found.</div>';
   result._results=out;
  };input.oninput=run;run();
  result.addEventListener('click',e=>{const b=e.target.closest('[data-search-result-index]');if(!b)return;const r=result._results?.[Number(b.dataset.searchResultIndex)];if(!r)return;closeModal();showPage(r.page,r.focus)});
 });
}
function focusResult(focus){
 if(!focus)return;
 if(focus.type==='note'){selectedNoteId=focus.id;state.selectedNote=focus.id;saveState();renderNotes();setTimeout(()=>{const n=document.querySelector(`[data-item-id="note-${CSS.escape(String(focus.id))}"]`);n?.scrollIntoView({block:'center'});n?.classList.add('highlight')},30)}
 else if(focus.type==='task'||focus.type==='goal'||focus.type==='tx'||focus.type==='media'||focus.type==='place'||focus.type==='saved'){setTimeout(()=>{const prefix={task:'task-',goal:'goal-',tx:'tx-',media:'media-',place:'place-'}[focus.type];const sel=prefix?`[data-item-id="${CSS.escape(prefix+focus.id)}"]`:`[data-item-id="discover-${CSS.escape(String(focus.id))}"]`;const n=document.querySelector(sel);n?.scrollIntoView({block:'center'});n?.classList.add('highlight')},80)}
 else if(focus.type==='contact'){state.connect.activeId=focus.id;markActiveRead();renderConnect()}
 else if(focus.type==='trip'){openTrip(focus.id)}
}

/* notifications and quick */
/* notifications and quick */
function notificationWebReady(){return ('Notification' in window) && (location.protocol==='https:' || location.protocol==='http:') && !!window.isSecureContext}
function notificationStatus(){
 if(!('Notification' in window))return {label:'Browser notifications unavailable',action:'Unavailable'};
 if(location.protocol==='file:' || location.protocol==='content:')return {label:'Open Liora from HTTPS or localhost to enable notifications',action:'Needs web address'};
 if(!window.isSecureContext)return {label:'Notifications require HTTPS (localhost is also supported)',action:'Needs HTTPS'};
 if(Notification.permission==='granted')return {label:'Browser permission granted',action:'Test notification'};
 if(Notification.permission==='denied')return {label:'Blocked by this site’s browser permission',action:'Permission blocked'};
 return {label:'Permission not granted yet',action:'Allow notifications'};
}
let notificationRegistrationPromise=null;
async function getNotificationRegistration(){
 if(!notificationWebReady() || !('serviceWorker' in navigator))return null;
 try{
  if(!notificationRegistrationPromise){notificationRegistrationPromise=navigator.serviceWorker.register('./liora-sw.js').then(()=>navigator.serviceWorker.ready)}
  return await notificationRegistrationPromise;
 }catch{return null}
}
async function showBrowserNotification(title,body){
 if(!notificationWebReady() || Notification.permission!=='granted')return false;
 try{const reg=await getNotificationRegistration();if(reg&&'showNotification' in reg){await reg.showNotification(title,{body,tag:'liora'});return true}}catch{}
 try{new Notification(title,{body});return true}catch{return false}
}
async function requestNotificationPermission(){
 if(!('Notification' in window)){toast('This browser does not support web notifications');return false}
 if(location.protocol==='file:' || location.protocol==='content:' || !window.isSecureContext || !/^https?:$/.test(location.protocol)){
  openModal('Notifications',`<div class="stack"><h2 style="font-size:21px">Open Liora from a web address</h2><div class="small muted" style="line-height:1.6">Browser notifications need a proper web origin. Open Liora over <strong>HTTPS</strong> or on <strong>localhost</strong>, then use Allow notifications again.</div><button class="btn btn-primary" data-close-modal>Done</button></div>`);
  return false;
 }
 if(Notification.permission==='denied'){toast('Notifications are blocked. Re-enable them in this site’s browser settings.');return false}
 try{
  const permission=Notification.permission==='default'?await Notification.requestPermission():Notification.permission;
  if(permission==='granted'){state.settings.notifications=true;saveState();renderSettings();await showBrowserNotification('Liora notifications are on','Browser alerts are working.');toast('Notifications enabled');return true}
  state.settings.notifications=false;saveState();renderSettings();toast(permission==='denied'?'Notifications blocked.':'Notifications not enabled.');return false;
 }catch{toast('Could not request notification permission here');return false}
}
function pushNotification(title,body){if(state.settings.notifications)showBrowserNotification(title,body)}
function shortBrief(){
 const tasksOpen=openTasks().length,habitsDone=state.habits.filter(h=>h.done&&h.completedOn===todayKey()).length,focus=currentFocusMinutes(),unread=unreadCount();
 const next=state.tasks.filter(t=>t.time&&!t.done).slice(0,3);
 const goalLines=state.goals.slice(0,3).map(g=>`${esc(g.name)} · ${goalProgress(g)}%`).join('<br>');
 const paid=state.transactions.find(t=>t.type==='debit'),received=state.transactions.find(t=>t.type==='credit');
 const lines=[
  `<div class="subtle"><strong>Today</strong><div class="small muted" style="margin-top:4px">${tasksOpen} open task${tasksOpen===1?'':'s'} · ${habitsDone}/${state.habits.length} habits done · ${focus} min focused</div></div>`,
  `<div class="subtle"><strong>On your watch</strong><div class="small muted" style="margin-top:4px">${unread} unread message${unread===1?'':'s'} · ${state.trips.length} trip${state.trips.length===1?'':'s'} · ${state.savedPlaces.length} saved place${state.savedPlaces.length===1?'':'s'}</div></div>`,
  `<div class="subtle"><strong>Goals</strong><div class="small muted" style="margin-top:4px">${goalLines||'No goals yet.'}</div></div>`,
  `<div class="subtle"><strong>Your spaces</strong><div class="small muted" style="margin-top:4px">${state.notes.length} note${state.notes.length===1?'':'s'} · ${state.media.items.length} media item${state.media.items.length===1?'':'s'} · ${state.saved.length} saved find${state.saved.length===1?'':'s'}</div></div>`,
  `<div class="subtle"><strong>Wallet</strong><div class="small muted" style="margin-top:4px">${paid?`Paid ₹${formatMoney(paid.amount)}`:'No payment yet'} · ${received?`Received ₹${formatMoney(received.amount)}`:'No receipt yet'}</div></div>`
 ];
 if(next.length)lines.push(`<div class="subtle"><strong>Next</strong><div class="small muted" style="margin-top:4px">${next.map(t=>`${esc(t.text)} · ${esc(formatDateTime(t.time))}`).join('<br>')}</div></div>`);
 const media=currentMedia();if(media)lines.push(`<div class="subtle"><strong>Media</strong><div class="small muted" style="margin-top:4px">${esc(media.title)} · ${esc(media.kind)}</div></div>`);
 openModal('Short brief',`<div class="stack">${lines.join('')}<button class="btn btn-primary" data-close-modal>Done</button></div>`)}

function updateNotifications(){
 const c=unreadCount();$('notifyDot').hidden=c===0;
 $('notifContent').innerHTML=`<div class="subtle"><div class="row"><div><strong>${c} unread message${c===1?'':'s'}</strong><div class="small muted" style="margin-top:3px">Open Connect to read and reply.</div></div><span class="badge ${c?'red':'green'}">${c}</span></div></div><button class="subtle" data-page="planner" style="width:100%;text-align:left"><div class="row"><div><strong>${openTasks().length} open task${openTasks().length===1?'':'s'}</strong><div class="small muted" style="margin-top:3px">Your current planning load.</div></div><span>›</span></div></button><button class="subtle" data-page="travel" style="width:100%;text-align:left"><div class="row"><div><strong>${state.trips.length} planned trip${state.trips.length===1?'':'s'}</strong><div class="small muted" style="margin-top:3px">Trips stay together with saved places.</div></div><span>›</span></div></button>`;
}
function quickAction(){
 openModal('Quick action',`<div class="grid grid-2"><button class="subtle" data-action="newTask"><strong>New task</strong><div class="small muted" style="margin-top:4px">Add to Planner</div></button><button class="subtle" data-action="newNote"><strong>New note</strong><div class="small muted" style="margin-top:4px">Capture a thought</div></button><button class="subtle" data-wallet-action="send"><strong>Send money</strong><div class="small muted" style="margin-top:4px">Open UPI</div></button><button class="subtle" data-action="trip"><strong>Plan a trip</strong><div class="small muted" style="margin-top:4px">Choose a date</div></button><button class="subtle" data-action="newMedia"><strong>Add media</strong><div class="small muted" style="margin-top:4px">Song or video</div></button><button class="subtle" data-action="newMessage"><strong>New message</strong><div class="small muted" style="margin-top:4px">Username or phone number</div></button></div>`)
}

/* export/reset */
function exportData(){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='liora-data.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),900);toast('Data exported')}
function resetData(){if(!confirm('Reset all Liora data?'))return;localStorage.removeItem(KEY);localStorage.removeItem(AI_KEY);location.reload()}

/* all */
function renderAll(adjustPage=true){
 allGoalProgress();
 if(adjustPage){document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===current))}
 renderNav();renderHome();renderPlanner();renderNotes();renderWallet();renderConnect();renderMedia();renderTravel();renderDiscover();renderAI();renderSettings();updateNotifications();
 $('pageTitle').textContent=TITLES[current];$('pageSub').textContent=SUBS[current];
}

/* delegated interaction */
document.addEventListener('click',event=>{
 const target=event.target.closest('button,a,[data-page],[data-action],[data-wallet-action],[data-open-note],[data-complete-task],[data-delete-task],[data-toggle-habit],[data-delete-habit],[data-delete-goal],[data-setting-toggle],[data-open-trip],[data-contact],[data-send-message],[data-send-ai],[data-focus-choice],[data-timer-toggle],[data-timer-reset],[data-delete-image],[data-view-image],[data-play-media-id],[data-media-play],[data-media-prev],[data-media-next],[data-delete-media],[data-media-search],[data-delete-place],[data-save-discovery],[data-delete-saved],[data-close-modal],[data-external],[data-topic-toggle]');
 if(!target)return;
 if(target.dataset.page){event.preventDefault();showPage(target.dataset.page);return}
 if(target.dataset.action){
  event.preventDefault();const a=target.dataset.action;
  if(a==='more')openSheet();else if(a==='quick')quickAction();else if(a==='installApp')installLiora();else if(a==='checkUpdates')checkPwaUpdates();else if(a==='newTask')openTaskModal();else if(a==='event')openEventModal();else if(a==='newGoal')openGoalModal();else if(a==='newGoalTask')openGoalTask(target.dataset.goalId);else if(a==='editGoal')editGoal(target.dataset.goalId);else if(a==='newHabit')openHabitModal();else if(a==='focus'){showPage('planner');toggleFocus();}else if(a==='focusTiming')openFocusTiming();else if(a==='newNote')openNewNote();else if(a==='saveNote')saveCurrentNote();else if(a==='deleteNote')deleteCurrentNote();else if(a==='attachImage')openImagePicker();else if(a==='walletSetup')openWalletSetup();else if(a==='allTransactions')openModal('Transactions',`<div class="stack">${state.transactions.map(t=>`<div class="simple-row"><span class="simple-row-main"><strong>${esc(t.merchant)}</strong><small>${esc(t.date||'Today')}</small></span><strong>${t.type==='credit'?'+':'−'}₹${formatMoney(t.amount)}</strong></div>`).join('')||'<div class="empty">No transactions yet.</div>'}</div>`);else if(a==='newMessage')newMessageModal();else if(a==='newGroup')newGroupModal();else if(a==='newMedia')openMediaModal();else if(a==='trip')planTrip();else if(a==='newPlace')newPlace();else if(a==='changeName')changeName();else if(a==='requestNotifications')requestNotificationPermission();else if(a==='exportData')exportData();else if(a==='resetData')resetData();else if(a==='attach')openImagePicker();return;
 }
 if(target.dataset.walletAction){walletAction(target.dataset.walletAction);return}
 if(target.dataset.openNote){selectedNoteId=target.dataset.openNote;state.selectedNote=selectedNoteId;saveState();showPage('notes',{type:'note',id:selectedNoteId});return}
 if(target.dataset.completeTask){const t=state.tasks.find(x=>String(x.id)===String(target.dataset.completeTask));if(t){t.done=!t.done;allGoalProgress();saveState();renderAll();toast(t.done?'Task completed':'Task reopened')}return}
 if(target.dataset.deleteTask){state.tasks=state.tasks.filter(t=>String(t.id)!==String(target.dataset.deleteTask));allGoalProgress();saveState();renderAll();toast('Task deleted');return}
 if(target.dataset.toggleHabit){toggleHabit(target.dataset.toggleHabit);return}
 if(target.dataset.deleteHabit){state.habits=state.habits.filter(h=>String(h.id)!==String(target.dataset.deleteHabit));saveState();renderAll();toast('Habit deleted');return}
 if(target.dataset.deleteGoal){deleteGoal(target.dataset.deleteGoal);return}
 if(target.dataset.settingToggle){const k=target.dataset.settingToggle;if(k==='notifications'){const granted='Notification' in window&&Notification.permission==='granted';if(state.settings.notifications&&granted){state.settings.notifications=false;saveState();renderSettings();updateNotifications();toast('Notifications disabled')}else{requestNotificationPermission()}return}state.settings[k]=!state.settings[k];saveState();renderSettings();toast(`${k} ${state.settings[k]?'enabled':'disabled'}`);return}
 if(target.dataset.theme){state.settings.theme=target.dataset.theme;saveState();applyTheme();renderSettings();toast(`${target.dataset.theme==='dark'?'Dark':'Light'} theme selected`);return}
 if(target.dataset.openTrip){openTrip(target.dataset.openTrip);return}
 if(target.dataset.contact){state.connect.activeId=target.dataset.contact;markActiveRead();renderConnect();return}
 if(target.dataset.sendMessage!==undefined){sendMessage();return}
 if(target.dataset.sendAi!==undefined){sendAI();return}
 if(target.dataset.focusChoice){state.focus.duration=Number(target.dataset.focusChoice);state.focus.remaining=state.focus.duration*60;focusRunning=false;if(focusInterval)clearInterval(focusInterval);saveState();closeModal();renderAll();toast(`Focus timing set to ${target.dataset.focusChoice} minutes`);return}
 if(target.dataset.timerToggle!==undefined){toggleFocus();return}
 if(target.dataset.timerReset!==undefined){resetFocus();return}
 if(target.dataset.viewImage){viewImage(target.dataset.viewImage);return}
 if(target.dataset.deleteImage){deleteImage(target.dataset.deleteImage);return}
 if(target.dataset.playMediaId){state.media.currentId=target.dataset.playMediaId;state.media.playing=false;stopMediaLoop();saveState();renderMedia();return}
 if(target.dataset.mediaPlay!==undefined){toggleMedia();return}
 if(target.dataset.mediaPrev!==undefined){changeMedia(-1);return}
 if(target.dataset.mediaNext!==undefined){changeMedia(1);return}
 if(target.dataset.deleteMedia){deleteMedia(target.dataset.deleteMedia);return}
 if(target.dataset.mediaSearch){searchMedia(target.dataset.mediaTitle,target.dataset.mediaSearch);return}
 if(target.dataset.deletePlace){deletePlace(target.dataset.deletePlace);return}
 if(target.dataset.saveDiscovery){saveDiscovery(target.dataset.saveDiscovery,target.dataset.saveLink,target.dataset.saveType);return}
 if(target.dataset.deleteSaved){deleteSaved(target.dataset.deleteSaved);return}
 if(target.dataset.external){openExternal(target.dataset.external);return}
 if(target.dataset.topicToggle){toggleTopic(target.dataset.topicToggle);return}
 if(target.dataset.closeModal!==undefined){closeModal();return}
 if(target.dataset.selectDay){document.querySelectorAll('.day-pill').forEach(x=>x.classList.remove('active'));target.classList.add('active');return}
});

document.addEventListener('click',event=>{
 const t=event.target.closest('[data-search-target-type]');
 if(t&&t.dataset.searchTargetType){const type=t.dataset.searchTargetType,id=t.dataset.searchTarget;const map={task:'planner',tx:'wallet'};showPage(map[type]||'home',{type,id});}
});

document.addEventListener('input',event=>{
 if(event.target.id==='noteEditor'){const n=state.notes.find(x=>String(x.id)===String(selectedNoteId));if(n){n.text=event.target.value;saveState()}}
 if(event.target.id==='noteTitle'){const n=state.notes.find(x=>String(x.id)===String(selectedNoteId));if(n){n.title=event.target.value;saveState()}}
});

$('searchBtn').onclick=openSearch;
$('notifyBtn').onclick=async()=>{if('Notification' in window&&Notification.permission==='default'){await requestNotificationPermission();return}if(state.settings.notifications&&(!('Notification' in window)||Notification.permission==='granted'))openDrawer();else requestNotificationPermission()};
$('moreBtn').onclick=()=>$('moreMenu').classList.toggle('open');
$('closeSheet').onclick=closeSheet;$('closeNotif').onclick=closeDrawer;$('closeModal').onclick=()=>{const u=$('modal').dataset.imageObjectUrl;if(u){URL.revokeObjectURL(u);$('modal').dataset.imageObjectUrl=''}closeModal()};$('overlay').onclick=()=>{closeSheet();closeDrawer();closeModal()};
$('modal').onclick=e=>{if(e.target===$('modal'))closeModal()};
document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('moreMenu').classList.remove('open');closeSheet();closeDrawer();closeModal()}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openSearch()}});

/* boot + profile */
function openNamePrompt(){
 if(state.profile.name)return;
 openModal('Welcome to Liora',`<div class="stack"><h2 style="font-size:24px">What’s your name?</h2><div class="small muted">Liora will use it to personalize Home.</div><input class="input" id="nameInput" autocomplete="name" placeholder="Your name"><button class="btn btn-primary" id="saveName">Continue</button></div>`,body=>{
  const save=()=>{const name=body.querySelector('#nameInput').value.trim();if(!name){toast('Enter your name');return}state.profile.name=name;saveState();closeModal();renderAll();toast(`Welcome, ${name}`);if(state.settings.morningBrief)setTimeout(shortBrief,220)};body.querySelector('#saveName').onclick=save;body.querySelector('#nameInput').onkeydown=e=>{if(e.key==='Enter')save()};setTimeout(()=>body.querySelector('#nameInput').focus(),30)
 });
}
function startApp(){initPWA();renderAll();setTimeout(()=>{$('boot')?.classList.add('hide');updatePwaStatus()},700);if(!state.profile.name)setTimeout(openNamePrompt,220);else if(state.settings.morningBrief)setTimeout(shortBrief,820)}
loadAICommands().finally(startApp);

})();
