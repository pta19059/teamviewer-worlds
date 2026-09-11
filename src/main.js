import { WORLDS, DISCOVERIES, STORAGE_KEY, loadProgress, worldProgress } from './data.js';
import { icon, logo } from './icons.js';

const app = document.querySelector('#app');
let progress = [];
try { progress = loadProgress(localStorage); } catch { /* Storage may be disabled. */ }
let scene, currentWorld = 'map', soundEnabled = false, audioContext, activeDiscovery = null, transitionTimer, lastFocus;

app.innerHTML = `
  <header class="header">
    <button class="brand" id="brand" aria-label="TeamViewer Worlds, return to the map">${logo}<span>TeamViewer<span class="brand-worlds">Worlds</span></span></button>
    <nav class="main-nav" aria-label="Main navigation">
      <button class="nav-link active" id="nav-map">The universe</button>
      <button class="nav-link" id="nav-journal">Your journey <span class="nav-dot" id="nav-dot"></span></button>
      <button class="nav-link" id="nav-guide">How to play ${icon('arrow-up-right')}</button>
    </nav>
    <button class="header-progress" id="progress-button" aria-label="Open your discovery journal">${icon('star')}<b id="total-count">0</b><span>/ 12 discoveries</span></button>
  </header>
  <main id="main">
    <div class="sky-grain" aria-hidden="true"></div>
    <div id="scene" class="scene-wrap"></div>
    <section class="hero" id="hero" aria-labelledby="hero-title">
      <div class="eyebrow"><span class="live-dot"></span> SMALL HERO. BIG CONNECTIONS.</div>
      <h1 id="hero-title">A little hero.<br>A whole world of<br><span>possibilities.</span><svg class="title-spark" viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M24 2v12m0 20v12M2 24h12m20 0h12M8 8l9 9m14 14 9 9M8 40l9-9M31 17l9-9" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg></h1>
      <p>Follow TIA beyond the familiar.<br>Explore the TeamViewer worlds and discover<br>what a great connection can do.</p>
      <button class="primary-button start-button" id="start" disabled>Getting your world ready… <span class="button-arrow">${icon('arrow-right')}</span></button>
      <div class="hero-note">${icon('gamepad-2')} A 3D adventure. Your next discovery.</div>
      <div class="hero-bottom"><span class="mini-avatar"><img src="./assets/tia-mascot.png" alt="TIA" /></span><span>YOUR EXPLORER<br><strong>TIA is ready. Are you?</strong></span><span class="tiny-stars">✦<br>✧</span></div>
    </section>
    <div class="scene-caption" id="scene-caption"><span class="live-dot"></span> A UNIVERSE TO EXPLORE <span class="caption-line"></span> 3 WORLDS. ENDLESS CONNECTIONS.</div>
    <div class="island-label label-tensor" id="label-tensor"><span class="label-number">01</span><span>TeamViewer Tensor<small>The connected kingdom</small></span></div>
    <div class="island-label label-one" id="label-one"><span class="label-number">02</span><span>TeamViewer ONE<small>The future of work</small></span></div>
    <div class="map-compass" id="map-compass">${icon('compass')}<span>LET CURIOSITY<br>BE YOUR COMPASS</span></div>
    <section class="world-selector" id="world-selector" aria-label="Choose a world">
      <div class="selector-heading"><span>YOUR NEXT HORIZON</span><span>Pick a world. Find your next possibility. ${icon('arrow-right')}</span></div>
      <div class="world-cards">
        ${Object.values(WORLDS).map(w=>`<button class="world-card ${w.id}" data-travel="${w.id}" disabled><span class="card-illustration">${icon(w.icon)}<span class="illustration-orbit"></span><span class="illustration-dot"></span></span><span class="card-copy"><span class="card-kicker">WORLD ${w.number}<span class="card-status">${w.id==='hub'?'START HERE':'6 DISCOVERIES'}</span></span><strong>${w.id==='hub'?'Every journey starts here.':w.name}</strong><span class="card-description">${w.id==='hub'?'Connection Island':w.short}</span></span><span class="card-arrow">${icon('arrow-up-right')}</span></button>`).join('')}
      </div>
    </section>
    <section class="explore-hud hidden" id="explore-hud" aria-label="Exploration">
      <div class="world-info"><button class="back-map" id="back-map">${icon('arrow-left')} All worlds</button><div class="world-kicker" id="world-kicker"></div><h1 id="world-title"></h1><p id="world-tagline"></p><div id="world-progress"></div></div>
      <aside class="quest-card" id="quest-card"><div class="quest-heading">${icon('flag')} YOUR MISSION</div><strong id="quest-title"></strong><p id="quest-description"></p><div class="quest-track" id="quest-track"></div><button class="text-button" id="next-discovery">Find my next discovery ${icon('arrow-right')}</button></aside>
      <div class="minimap" id="minimap" aria-label="Island map"><div class="minimap-top"><span>YOUR ISLAND</span>${icon('compass')}</div><div class="minimap-island" id="minimap-island"><span class="minimap-building"></span><span class="minimap-player" id="minimap-player"></span></div><span class="minimap-legend"><i></i> TIA <i></i> Discovery</span></div>
      <button class="interaction hidden" id="interaction"><kbd>E</kbd><span id="interaction-text"></span>${icon('arrow-right')}</button>
      <div class="game-controls"><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Move</span><span><kbd>SPACE</kbd> Jump</span><span><kbd>E</kbd> Discover</span><span class="click-hint">${icon('mouse-pointer-2')} Click to move</span></div>
      <div class="touch-controls" aria-label="Touch controls"><div class="dpad"><button data-key="ArrowUp" aria-label="Move forward">${icon('chevron-up')}</button><button data-key="ArrowLeft" aria-label="Move left">${icon('chevron-left')}</button><button data-key="ArrowDown" aria-label="Move backward">${icon('chevron-down')}</button><button data-key="ArrowRight" aria-label="Move right">${icon('chevron-right')}</button></div><button class="touch-jump" id="touch-jump">Jump ${icon('chevron-up')}</button></div>
    </section>
    <div class="utility-controls"><button class="icon-button" id="sound" aria-label="Enable sound" title="Enable sound">${icon('volume-x')}</button><button class="icon-button" id="fullscreen" aria-label="Full screen" title="Full screen">${icon('maximize')}</button></div>
    <div class="transition hidden" id="transition"><span class="transition-star">✦</span><p>NEXT DESTINATION</p><strong id="transition-title"></strong></div>
    <div class="toast hidden" role="status" id="toast"></div>
    <div class="error-state hidden" id="error-state"><span>${icon('compass')}</span><h2>This world needs a little 3D magic.</h2><p id="error-message">Enable hardware acceleration in your browser, then reload the page.</p><button class="primary-button" id="retry">Try again ${icon('rotate-ccw')}</button><button class="text-button" id="fallback-journal">Read the product guide ${icon('book-open')}</button></div>
  </main>
  <footer class="footer"><span>CURIOSITY CONNECTS US.</span><span>Independent interactive concept <span class="footer-divider">/</span> TeamViewer®</span><button id="sources">Sources & project ${icon('arrow-up-right')}</button></footer>
  <dialog id="dialog" aria-labelledby="dialog-title"><button class="dialog-close icon-button" id="dialog-close" aria-label="Close">${icon('x')}</button><div id="dialog-content"></div></dialog>
`;

const $ = id => document.getElementById(id);
function toast(message) { $('toast').innerHTML = `${icon('star')}<span>${message}</span>`; $('toast').classList.remove('hidden');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.add('hidden'),4000); }
function sound(type) {
  if(!soundEnabled)return;
  try {
    audioContext ||= new (window.AudioContext||window.webkitAudioContext)();audioContext.resume();
    const notes = type==='collect'?[660,880,1320]:type==='travel'?[330,440,660]:[330,550];
    notes.forEach((freq,i)=>{const osc=audioContext.createOscillator(),gain=audioContext.createGain(),t=audioContext.currentTime+i*.08;osc.type='sine';osc.frequency.setValueAtTime(freq,t);gain.gain.setValueAtTime(.055,t);gain.gain.exponentialRampToValueAtTime(.001,t+.22);osc.connect(gain);gain.connect(audioContext.destination);osc.start(t);osc.stop(t+.23);});
  } catch { soundEnabled=false; toast('Audio is unavailable in this browser.'); }
}
function updateProgress() {
  $('total-count').textContent=progress.length;$('nav-dot').classList.toggle('has-progress',progress.length>0);
  for(const id of ['tensor','one']){const count=worldProgress(progress,id);document.querySelector(`.world-card.${id} .card-status`).textContent=count?`${count} / 6 DISCOVERIES`:'6 DISCOVERIES';}
  if(currentWorld==='map')return;
  const isHub=currentWorld==='hub',count=worldProgress(progress,currentWorld);
  $('world-progress').innerHTML=isHub?`<span class="world-pill">${icon('compass')} Two portals. Choose your horizon.</span>`:`<span class="world-pill">${icon('star')} ${count} of 6 discoveries collected</span>`;
  $('quest-title').textContent=isHub?'Your adventure starts here.':count===6?'World complete!':'Follow your curiosity.';
  $('quest-description').textContent=isHub?'Walk to a glowing portal and press E to enter a new world.':count===6?'You found every discovery on this island. Another world is waiting.':'Find the golden blocks. Each one holds a new possibility.';
  $('quest-track').innerHTML=isHub?`<span class="portal-chip tensor-chip">${icon('shield-check')} Tensor</span><span class="portal-chip one-chip">${icon('sparkles')} ONE</span>`:Array.from({length:6},(_,i)=>`<span class="quest-star ${i<count?'collected':''}">${icon('star')}</span>`).join('');
  $('next-discovery').innerHTML=isHub?`Visit Tensor ${icon('arrow-right')}`:count===6?`Explore the other world ${icon('arrow-right')}`:`Find my next discovery ${icon('arrow-right')}`;
  document.querySelectorAll('.minimap-point').forEach(el=>el.classList.toggle('found',progress.includes(el.dataset.discovery)));
}
function updateMinimap(x,z) {const el=$('minimap-player');el.style.left=`${50+x/30*100}%`;el.style.top=`${50+z/30*100}%`;}
function updateWorldLabels(positions) { for(const [id,p] of Object.entries(positions)){const el=$(`label-${id}`),half=el.offsetWidth/2+10;el.style.left=`${Math.max(half,Math.min(innerWidth-half,p.x))}px`;el.style.top=`${p.y}px`;el.style.right='auto';el.style.transform='translate(-50%,-100%)';} }
function showNear(near) {
  $('interaction').classList.toggle('hidden',!near);
  if(near)$('interaction-text').textContent=near.type==='portal'?`Enter: ${WORLDS[near.target].name}`:progress.includes(near.data.id)?`Revisit: ${near.data.title}`:`Discover: ${near.data.title}`;
}
function travel(id) {
  if(!scene||!WORLDS[id])return;
  closeDialog();clearTimeout(transitionTimer);scene.setPaused(true);$('transition-title').textContent=WORLDS[id].name;$('transition').classList.remove('hidden');sound('travel');
  transitionTimer=setTimeout(()=>{
    currentWorld=id;document.body.dataset.mode='explore';document.body.dataset.world=id;window.scrollTo(0,0);
    $('hero').classList.add('hidden');$('world-selector').classList.add('hidden');$('explore-hud').classList.remove('hidden');
    ['scene-caption','label-tensor','label-one','map-compass'].forEach(id=>$(id).classList.add('hidden'));
    $('world-kicker').textContent=`WORLD ${WORLDS[id].number} / ${id==='hub'?'YOUR STARTING POINT':'YOUR EXPEDITION'}`;
    $('world-title').textContent=WORLDS[id].name;$('world-tagline').textContent=WORLDS[id].tagline;
    $('minimap-island').querySelectorAll('.minimap-point').forEach(el=>el.remove());
    DISCOVERIES.filter(d=>d.world===id).forEach(d=>{const button=document.createElement('button');button.className='minimap-point';button.dataset.discovery=d.id;button.style.left=`${50+d.position[0]/30*100}%`;button.style.top=`${50+d.position[1]/30*100}%`;button.setAttribute('aria-label',`Walk to ${d.title}`);button.title=d.title;button.addEventListener('click',()=>scene.walkTo(d));$('minimap-island').appendChild(button);});
    scene.enter(id);scene.setPaused(false);updateProgress();
    setTimeout(()=>{$('transition').classList.add('hidden');scene.renderer.domElement.focus({preventScroll:true});},450);
  },matchMedia('(prefers-reduced-motion: reduce)').matches?0:400);
}
function showMap() {
  if(!scene)return;clearTimeout(transitionTimer);closeDialog();$('transition').classList.add('hidden');currentWorld='map';document.body.dataset.mode='map';window.scrollTo(0,0);
  $('hero').classList.remove('hidden');$('world-selector').classList.remove('hidden');$('explore-hud').classList.add('hidden');
  ['scene-caption','label-tensor','label-one','map-compass'].forEach(id=>$(id).classList.remove('hidden'));scene.showMap();scene.setPaused(false);updateProgress();
}
function openDialog(html,wide=false) {
  lastFocus=document.activeElement;scene?.setPaused(true);$('dialog-content').innerHTML=html;$('dialog').classList.toggle('wide',wide);
  if(!$('dialog').open)$('dialog').showModal();$('dialog-close').focus();
}
function closeDialog() { if($('dialog').open)$('dialog').close(); }
$('dialog').addEventListener('close',()=>{scene?.setPaused(false);activeDiscovery=null;if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});});
$('dialog').addEventListener('click',e=>{if(e.target===$('dialog')){const r=$('dialog').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog();}});
$('dialog-close').onclick=closeDialog;
function discover(data,fromJournal=false) {
  activeDiscovery=data;const found=progress.includes(data.id),w=WORLDS[data.world];
  openDialog(`<div class="discovery-top ${data.world}"><div class="discovery-orbit"></div><div class="discovery-emblem">${icon(data.icon)}</div><span class="discovery-number">${w.number} / ${String(DISCOVERIES.filter(d=>d.world===data.world).findIndex(d=>d.id===data.id)+1).padStart(2,'0')}</span><span class="discovery-badge">${icon(found?'check':'sparkles')} ${found?'IN YOUR JOURNAL':'A NEW DISCOVERY'}</span></div><div class="discovery-content"><div class="eyebrow">${w.name.toUpperCase()} <span> / </span> ${data.category}</div><h2 id="dialog-title">${data.title}</h2><p class="discovery-summary">${data.summary}</p><div class="scenario"><span>${icon('sparkles')} PICTURE THIS</span><p>${data.scenario}</p></div><p class="takeaway">${data.takeaway}</p><div class="discovery-actions"><button class="primary-button" id="collect">${found?'Keep exploring':fromJournal?'Find this discovery':'Collect discovery'} ${icon(found?'arrow-right':fromJournal?'compass':'star')}</button><span class="discovery-links"><a href="${data.source}" target="_blank" rel="noopener noreferrer">${data.sourceLabel} ${icon('arrow-up-right')}</a><a href="${data.adminSource}" target="_blank" rel="noopener noreferrer">${data.adminLabel} ${icon('arrow-up-right')}</a></span></div><p class="feature-note">The first link opens the product capability. The second opens the related administrator configuration guidance. Feature availability and configuration depend on your TeamViewer offering and agreement.</p></div>`);
  activeDiscovery=data;
  $('collect').onclick=()=>{
    if(fromJournal&&!found){if(!scene){journal();return;}travel(data.world);setTimeout(()=>scene?.walkTo(data),900);return;}
    if(!found){progress.push(data.id);try{localStorage.setItem(STORAGE_KEY,JSON.stringify(progress));}catch{toast('Discovery collected. This browser does not allow permanent saving.');}scene?.collect(data.id);sound('collect');updateProgress();
      const count=worldProgress(progress,data.world);toast(progress.length===12?'12 out of 12! You explored the entire TeamViewer universe.':count===6?`${w.name} complete! Your next world is waiting.`:`${data.title}: added to your journal.`);
    }closeDialog();
  };
}
function journal() {
  openDialog(`<div class="journal-header"><span class="eyebrow">EVERY DISCOVERY COUNTS</span><h2 id="dialog-title">Your journey.</h2><p>Every possibility you found, all in one place.</p><div class="journal-progress"><span>${icon('star')} <strong>${progress.length}</strong> / 12 discoveries</span><div><i style="width:${progress.length/12*100}%"></i></div><b>${Math.round(progress.length/12*100)}%</b></div></div><div class="journal-worlds">${['tensor','one'].map(id=>`<section><div class="journal-world-title"><h3>${icon(WORLDS[id].icon)} ${WORLDS[id].name}</h3><span>${worldProgress(progress,id)} / 6</span></div><div class="journal-grid">${DISCOVERIES.filter(d=>d.world===id).map(d=>`<button class="journal-item ${progress.includes(d.id)?'found':''}" data-review="${d.id}"><span class="journal-icon">${icon(progress.includes(d.id)?d.icon:'lock-keyhole')}</span><span><small>${d.category}</small><strong>${d.title}</strong></span>${icon(progress.includes(d.id)?'check':'arrow-up-right')}</button>`).join('')}</div></section>`).join('')}</div><div class="journal-footer"><span>${progress.length===12?'✦ Universe complete. Stay curious.':'Your progress is saved in this browser.'}</span><button class="text-button" id="reset-progress">Restart your journey ${icon('rotate-ccw')}</button></div>`,true);
  document.querySelectorAll('[data-review]').forEach(el=>el.onclick=()=>discover(DISCOVERIES.find(d=>d.id===el.dataset.review),true));
  $('reset-progress').onclick=()=>{
    $('reset-progress').innerHTML=`Confirm: reset ${progress.length} discoveries ${icon('rotate-ccw')}`;
    $('reset-progress').onclick=()=>{try{localStorage.removeItem(STORAGE_KEY);}catch{}location.reload();};
  };
}
function guide() {
  openDialog(`<div class="guide-content"><span class="eyebrow">READY, EXPLORER?</span><h2 id="dialog-title">Curiosity is<br>your superpower.</h2><p>Three floating islands. Twelve discoveries. One journey through the possibilities of TeamViewer.</p><div class="guide-step"><b>01</b><div><h3>Choose your world</h3><p>Start on the central island and step through a portal, or choose Tensor or ONE from the map.</p></div>${icon('map')}</div><div class="guide-step"><b>02</b><div><h3>Follow the golden blocks</h3><p>Move with WASD or the arrow keys. Jump with Space. Click a block or minimap marker to walk to it. Drag to orbit; scroll to zoom.</p></div>${icon('gamepad-2')}</div><div class="guide-step"><b>03</b><div><h3>Collect new possibilities</h3><p>Press E near a block, read the discovery, and collect it. Find it again in your journey journal.</p></div>${icon('star')}</div><div class="guide-keys"><span><kbd>M</kbd> Map</span><span><kbd>ESC</kbd> Close / pause</span><span><kbd>SHIFT</kbd> Run</span></div><button class="primary-button" id="guide-start">Let’s go! ${icon('arrow-right')}</button></div>`);
  $('guide-start').onclick=()=>{closeDialog();if(currentWorld==='map')travel('hub');};
}
function sources() {
  openDialog(`<div class="guide-content sources-content"><span class="eyebrow">BEHIND THIS UNIVERSE</span><h2 id="dialog-title">A game. Real possibilities.</h2><p>This is an independent demonstration concept for exploring TeamViewer products in a TIA-inspired setting.</p><h3>Product sources</h3><a class="source-link" href="https://www.teamviewer.com/en-us/products/tensor/" target="_blank" rel="noopener noreferrer">TeamViewer Tensor — official website ${icon('arrow-up-right')}</a><a class="source-link" href="https://www.teamviewer.com/en/platform/one/" target="_blank" rel="noopener noreferrer">TeamViewer ONE — official website ${icon('arrow-up-right')}</a><p>Content checked on September 11, 2026. Use cases are illustrative. Individual capabilities may require specific plans, add-ons, or configurations.</p><p class="feature-note">The TIA visual asset was supplied by the project owner. TeamViewer, Tensor, and TeamViewer ONE belong to their respective owners. No affiliation or sponsorship is implied.</p></div>`);
}
$('start').onclick=()=>travel('hub');document.querySelectorAll('[data-travel]').forEach(el=>el.onclick=()=>travel(el.dataset.travel));
$('brand').onclick=showMap;$('nav-map').onclick=showMap;$('back-map').onclick=showMap;
$('nav-journal').onclick=journal;$('progress-button').onclick=journal;$('fallback-journal').onclick=journal;$('nav-guide').onclick=guide;$('sources').onclick=sources;
$('interaction').onclick=()=>scene?.interact();$('touch-jump').onclick=()=>scene?.jump();$('retry').onclick=()=>location.reload();
$('next-discovery').onclick=()=>{if(currentWorld==='hub'){travel('tensor');return;}const next=DISCOVERIES.find(d=>d.world===currentWorld&&!progress.includes(d.id));if(next){scene.walkTo(next);toast('Follow TIA to the next discovery.');}else travel(currentWorld==='tensor'?'one':'tensor');};
$('sound').onclick=()=>{soundEnabled=!soundEnabled;$('sound').innerHTML=icon(soundEnabled?'volume-2':'volume-x');$('sound').setAttribute('aria-label',soundEnabled?'Mute sound':'Enable sound');$('sound').title=soundEnabled?'Mute sound':'Enable sound';if(soundEnabled)sound('collect');};
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('Full screen is unavailable in this browser.');}};
document.querySelectorAll('[data-key]').forEach(button=>{const release=()=>scene?.keys.delete(button.dataset.key);button.onpointerdown=e=>{e.preventDefault();button.setPointerCapture(e.pointerId);scene?.keys.add(button.dataset.key);};button.onpointerup=release;button.onpointercancel=release;button.onlostpointercapture=release;});
window.addEventListener('keydown',e=>{if(e.repeat)return;if($('dialog').open)return;if(e.code==='KeyM'){e.preventDefault();showMap();}if(e.code==='Escape'&&currentWorld!=='map')guide();});
updateProgress();

async function init() {
  try {
    const { WorldScene } = await import('./scene.js?v=welcome-sign-3');
    scene=new WorldScene($('scene'),{travel,discover,near:showNear,sound,position:updateMinimap,labels:updateWorldLabels},progress);
    $('start').innerHTML=`Start exploring <span class="button-arrow">${icon('arrow-right')}</span>`;$('start').disabled=false;
    document.querySelectorAll('[data-travel]').forEach(el=>el.disabled=false);document.body.classList.add('loaded');
    scene.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();toast('3D graphics were interrupted. Reload to resume. Your discoveries are saved.');});
  } catch(error) {
    console.error('Unable to initialize the 3D world:',error);document.body.classList.add('graphics-error');$('error-state').classList.remove('hidden');$('start').textContent='3D unavailable';
  }
}
init();
