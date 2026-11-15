import * as THREE from 'three';
import { CONFIG } from './config.js';
import { PALETTE } from './palette.js';
import { MAP } from './map.js';
import { buildWorld } from './world.js';
import { createInput } from './input.js';
import { createPlayer } from './player.js';
import { createWeaponState, tryFire, startReload, updateReload, switchWeapon, currentSpread, muzzlePosition, throwGrenade } from './weapons.js';
import { raycastShot, applyDamage, createGrenadeSimulation } from './combat.js';
import { createViewmodel } from './viewmodel.js';
import { createRng, hashSeed } from './rng.js';
import { createBots } from './bots.js';
import { createMatch } from './rounds.js';
import { createAudio } from './audio.js';
import { createHud } from './hud.js';
import { createShotStage } from './shots.js';

const game = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
game.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(PALETTE.skyTop);
scene.fog = new THREE.Fog(PALETTE.fog, 58, 125);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 300);
scene.add(camera);
const world = buildWorld(scene, MAP);
const input = createInput(renderer.domElement);
input.attach();
const player = createPlayer(MAP, CONFIG, input);
player.team = 'vanguard'; player.alive = true;
const squad = createBots(scene, MAP, CONFIG, createRng(hashSeed(`${MAP.name}:bots`)));
const match = createMatch(CONFIG, player, squad, MAP);
const hud = createHud(document, MAP, CONFIG);
const audio = createAudio();
const weaponStates = player.weapons.map(createWeaponState);
const viewmodel = createViewmodel(camera, CONFIG.weapons);
const grenadeSimulation = createGrenadeSimulation();
const random = createRng(hashSeed(MAP.name));
const shotStage = createShotStage({ document, map: MAP, config: CONFIG, player, squad, match, scene, camera, hud, world, viewmodel, weaponStates });
while(weaponStates.length<player.weapons.length)weaponStates.push(createWeaponState(player.weapons[weaponStates.length]));
if(shotStage.name==='cover'||shotStage.name==='action'){weaponStates[player.currentWeapon].magazine=shotStage.name==='cover'?24:30;weaponStates[player.currentWeapon].reserve=90;}
const state = { map: MAP.name, shot: shotStage.name, player, frame: 0, elapsed: 0, accumulator: 0, step: CONFIG.simulation.step, maxSteps: CONFIG.simulation.maxSteps, staged: shotStage.isStaged(), events: [] };
window.gameState = state;
let gameStarted = false;
let everPointerLocked = false;
function requestPointerLockSafely(){try{const result=input.requestPointerLock();if(result&&typeof result.catch==='function')result.catch(()=>{});}catch{}}

const poses = {
  cover: { position: [-24, 1.62, 17], target: [-24, 1.5, -10] },
  buy: { position: [0, 1.62, 17], target: [0, 1.5, -8] },
  action: { position: [-8, 1.62, 5], target: [14, 1.5, 0] },
  site: { position: [-22, 1.62, -13], target: [-22, 1, -13] },
};
function update(dt) {
  if (!gameStarted || !document.getElementById('pauseOverlay').classList.contains('hidden')) return;
  state.elapsed += dt;
  if (shotStage.isStaged()) return;
  const now = state.elapsed * 1000;
  let activeWeapon = weaponStates[player.currentWeapon];
  if (match.phase === 'live') {
    player.useHeld = input.held('KeyE');
    if(player.alive)player.update(dt, world.colliders);
    const movement = Math.hypot(player.velocity.x, player.velocity.z);
    if (input.held('KeyR') && !state.reloadHeld && startReload(activeWeapon, now)) { viewmodel.reloadDip(); state.events.push({type:'reload',weapon:activeWeapon.definition.name}); }
    state.reloadHeld=input.held('KeyR');
    if(updateReload(activeWeapon,now))state.events.push({type:'reload-finished',weapon:activeWeapon.definition.name});
    for(let i=0;i<5;i++){const held=input.held(`Digit${i+1}`);if(held&&!state.digitHeld?.[i]){const d=switchWeapon(player,i);if(d){while(weaponStates.length<player.weapons.length)weaponStates.push(createWeaponState(player.weapons[weaponStates.length]));viewmodel.switchWeapon(d);activeWeapon=weaponStates[player.currentWeapon];}}if(!state.digitHeld)state.digitHeld=[];state.digitHeld[i]=held;}
    if(player.alive&&input.primary&&(!activeWeapon.definition.automatic||!state.primaryHeld)){
      const shot=tryFire(activeWeapon,now,{moving:movement>.2,airborne:!player.onGround,crouched:player.crouched},random);
      if(shot){const spread=shot.spread*Math.PI/180;const direction=new THREE.Vector3(-Math.sin(player.yaw),Math.tan(player.pitch),-Math.cos(player.yaw)).normalize();direction.x+=random.gaussian()*spread;direction.y+=random.gaussian()*spread;direction.z+=random.gaussian()*spread;direction.normalize();const origin=new THREE.Vector3(player.position.x,player.position.y+player.eyeHeight,player.position.z);const targets=squad.bots.filter(b=>b.alive&&b.team==='sentinel');const hit=raycastShot(origin,direction,100,targets,world.colliders);const end=hit?.point||origin.clone().addScaledVector(direction,100);const muzzle=muzzlePosition(origin,direction,activeWeapon.definition);const geo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(muzzle.x,muzzle.y,muzzle.z),new THREE.Vector3(end.x,end.y,end.z)]);const line=new THREE.Line(geo,new THREE.LineBasicMaterial({color:PALETTE.site,transparent:true,opacity:.72}));scene.add(line);state.tracers||=[];state.tracers.push({object:line,life:.08});viewmodel.recoilKick();viewmodel.muzzleFlash();state.events.push({type:'shot',team:'vanguard',x:origin.x,y:origin.y,z:origin.z,weapon:activeWeapon.definition.name});if(hit?.type==='entity'){const result=applyDamage(hit.entity,activeWeapon.definition.damage,hit.part,hit.distance,activeWeapon.definition);hud.hit({headshot:result.headshot,kill:result.dead});state.events.push({type:'hit',damage:result.damage,headshot:result.headshot?1:0,dead:result.dead?1:0,victim:hit.entity.name});if(result.dead){match.awardKill(player);squad.kill(hit.entity,state.events);state.events.push({type:'kill',killer:'You',victim:hit.entity.name,weapon:activeWeapon.definition.name,headshot:result.headshot?1:0});}}}
    }
    state.primaryHeld=input.primary;
    if(player.alive&&input.held('KeyG')&&!state.grenadeHeld){const dir=new THREE.Vector3(-Math.sin(player.yaw),Math.sin(player.pitch),-Math.cos(player.yaw)).normalize();const g=throwGrenade(player,'frag',{x:player.position.x,y:player.position.y+player.eyeHeight,z:player.position.z},{x:dir.x,y:dir.y,z:dir.z},random);if(g){grenadeSimulation.add(g);state.events.push({type:'grenade-thrown',grenade:'frag'});}}
    state.grenadeHeld=input.held('KeyG');
    grenadeSimulation.update(dt,squad.entities(player),world.colliders,state.events);
    squad.update(dt,squad.entities(player),world.colliders,state.events,{time:state.elapsed,phase:match.phase,planted:match.bomb==='planted'?match.plantedSite:null,site:MAP.sites[0],use:true});
    for(const ev of state.events.filter(e=>e.type==='bot-shot')){const shooter=squad.bots.find(b=>b.name===ev.shooter);const targets=squad.entities(player).filter(e=>e!==shooter&&e.team!==ev.team&&e.health>0);const hit=raycastShot({x:ev.ox,y:ev.oy,z:ev.oz},{x:ev.dx,y:ev.dy,z:ev.dz},ev.range*2,targets,world.colliders);if(hit?.type==='entity'){if(hit.entity===player){const died=player.damage(ev.damage,hit.part);hud.damage(Math.atan2(player.position.z-ev.oz,player.position.x-ev.ox));state.events.push({type:'player-damage',damage:ev.damage,headshot:hit.part==='head'?1:0});if(died){player.alive=false;state.events.push({type:'spectate',text:'YOU ARE DOWN — SPECTATING'});}}else{const result=applyDamage(hit.entity,ev.damage,hit.part,hit.distance,shooter.weapon.definition);if(result.dead){match.awardKill(shooter);squad.kill(hit.entity,state.events);state.events.push({type:'kill',killer:shooter.name,victim:hit.entity.name,weapon:shooter.weapon.definition.name,headshot:result.headshot?1:0});}}}}
    viewmodel.update(dt,{speed:movement,aiming:input.secondary,mouseX:player.mouseDelta?.x||0,mouseY:player.mouseDelta?.y||0});
    if(state.tracers)for(let i=state.tracers.length-1;i>=0;i--){const t=state.tracers[i];t.life-=dt;if(t.life<=0){scene.remove(t.object);t.object.geometry.dispose();t.object.material.dispose();state.tracers.splice(i,1);}}
  }
  match.update(dt,squad.entities(player),state.events);
  const roundStart=state.events.some(e=>e.type==='round-start');
  if(roundStart){player.reset(MAP.spawns.vanguard[0]);player.alive=true;squad.reset();for(const w of weaponStates){w.magazine=w.definition.magazine;w.reserve=w.definition.reserve;w.reloading=false;}state.events.push({type:'round-banner',text:`ROUND ${match.round}`});}
  if(state.events.some(e=>e.type==='round-end')){const e=state.events.find(v=>v.type==='round-end');hud.setBanner(`${e.team.toUpperCase()} WIN · ${e.reason}`,4);}
  camera.position.set(player.position.x,player.position.y+player.eyeHeight,player.position.z);camera.rotation.order='YXZ';camera.rotation.set(player.pitch,player.yaw,0);
  if(!player.alive){const teammate=squad.bots.find(b=>b.alive&&b.team==='vanguard');if(teammate){camera.position.set(teammate.position.x,1.55,teammate.position.z);camera.rotation.set(teammate.pitch,teammate.yaw,0);}}
  const events=state.events.splice(0);
  for(const event of events){if(event.type==='shot')audio.gunshot(event.weapon==='Breacher-12'?'shotgun':event.weapon==='Longbow .308'?'longshot':event.weapon==='P9 Sparrow'?'pistol':'rifle');else if(event.type==='reload')audio.reload();else if(event.type==='hit')audio.hit();else if(event.type==='kill'){audio.kill();hud.addKill(event.killer,event.victim,event.weapon,!!event.headshot);}else if(event.type==='blast')audio.explosion();else if(event.type==='plant')audio.plantBeep();else if(event.type==='defuse')audio.defuse();else if(event.type==='round-end'){event.team==='vanguard'?audio.roundWin():audio.roundLoss();}else if(event.type==='round-banner'||event.type==='spectate')hud.setBanner(event.text);else if(event.type==='match-end')hud.showEnd(`${event.vanguard} — ${event.sentinel}`);}
  state.renderEvents=events;
}
let previous = performance.now();
function frame(now) {
  const elapsed = Math.min((now - previous) / 1000, 0.1);
  previous = now;
  state.accumulator += elapsed;
  let steps = 0;
  while (state.accumulator >= state.step && steps < state.maxSteps) {
    update(state.step);
    state.accumulator -= state.step;
    steps++;
  }
  if (steps === state.maxSteps) state.accumulator = Math.min(state.accumulator, state.step);
  state.frame++;
  const active=weaponStates[player.currentWeapon];
  hud.update({player,match,weapon:active,spread:active?active.definition.spread:0,entities:squad.entities(player),clouds:grenadeSimulation.clouds,time:state.elapsed});
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
document.getElementById('playButton').addEventListener('click', () => {
  gameStarted=true;audio.init();
  document.getElementById('startOverlay').classList.add('hidden');
  requestPointerLockSafely();
});
renderer.domElement.addEventListener('click', () => { if (!document.getElementById('startOverlay').classList.contains('hidden')) return; if (!input.pointerLocked) requestPointerLockSafely(); });
document.addEventListener('pointerlockchange',()=>{if(input.pointerLocked)everPointerLocked=true;else if(gameStarted&&everPointerLocked&&match.phase==='live')hud.showPause(true);});
document.getElementById('resumeButton').addEventListener('click',()=>{audio.init();requestPointerLockSafely();hud.showPause(false);});
document.getElementById('restartButton').addEventListener('click',()=>location.reload());
document.getElementById('pauseRestartButton').addEventListener('click',()=>location.reload());
document.getElementById('buyDone').addEventListener('click',()=>hud.showBuy(false));
document.addEventListener('keydown',event=>{if(event.code==='Escape'&&gameStarted&&match.phase==='live')hud.showPause(true);if(event.code==='KeyM')audio.toggleMute();if(event.code==='KeyB'&&(match.phase==='freeze'||match.phase==='live'&&match.timer>CONFIG.rounds.duration-15)){const renderBuy=()=>hud.menu(match.buyData(player),player.money,key=>{if(match.buy(player,key)){while(weaponStates.length<player.weapons.length)weaponStates.push(createWeaponState(player.weapons[weaponStates.length]));renderBuy();audio.buy();}});renderBuy();hud.showBuy(true);}});
input.attach();
requestAnimationFrame(frame);

// Later turns add the player controller, weapons, combat, bots, rounds, HUD, audio and screenshot staging.
