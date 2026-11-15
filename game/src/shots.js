import * as THREE from 'three';

const stagedNames=new Set(['cover','buy','action','site']);
export function createShotStage({document:doc,map,config,player,squad,match,scene,camera,hud,world,viewmodel,weaponStates}){
  const params=new URLSearchParams(location.search),name=params.get('shot');let staged=false;
  if(!name||!stagedNames.has(name))return{isStaged:()=>false,name:'',apply(){}};
  const seed=Number(params.get('seed')||1)>>>0;let n=seed||1;const rand=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
  const poses={cover:{p:[-20,1.62,16],t:[-22,1.5,-10]},buy:{p:[0,1.62,17],t:[0,1,-8]},action:{p:[-7,1.62,4],t:[18,1,3]},site:{p:[-22,1.62,-6],t:[-22,1,-13]}};
  function apply(){staged=true;for(const id of ['startOverlay','buyOverlay','pauseOverlay','matchEndOverlay'])doc.getElementById(id).classList.add('hidden');const pose=poses[name];camera.position.set(...pose.p);camera.lookAt(...pose.t);player.position.x=pose.p[0];player.position.y=0;player.position.z=pose.p[2];player.health=name==='action'?76:100;player.armour=name==='cover'?25:0;player.money=4150;player.team='vanguard';player.alive=true;const rifle=config.weapons[1];if(!player.weapons.some(w=>w.name===rifle.name))player.weapons.push(rifle);player.currentWeapon=(name==='cover'||name==='action')?player.weapons.findIndex(w=>w.name===rifle.name):0;for(const w of weaponStates){w.magazine=w.definition.magazine;w.reserve=w.definition.reserve;}while(weaponStates.length<player.weapons.length){const definition=player.weapons[weaponStates.length];weaponStates.push({definition,magazine:definition.magazine,reserve:definition.reserve,lastShot:-Infinity,reloading:false,reloadEnd:0,bloom:0});}if(name==='cover'){weaponStates[player.currentWeapon].magazine=24;weaponStates[player.currentWeapon].reserve=90;}match.round=name==='cover'?4:name==='action'?6:name==='site'?7:1;match.scores=name==='cover'?{vanguard:3,sentinel:2}:name==='action'?{vanguard:4,sentinel:1}:name==='site'?{vanguard:4,sentinel:2}:{vanguard:0,sentinel:0};match.timer=name==='cover'?83:name==='action'?47:name==='site'?58:5;match.phase=name==='buy'?'freeze':'live';match.bomb=name==='site'?'planted':'carried';match.plantedSite=name==='site'?map.sites[0]:null;match.fuse=name==='site'?18:0;match.carrier=player;
    for(let i=0;i<squad.bots.length;i++){const b=squad.bots[i];b.alive=true;b.health=100;b.armour=0;b.group.rotation.set(0,0,0);b.group.position.set(-11+i*4+(rand()-.5)*.5,0,i%2?-4:-8);b.state='hold';b.seenAt=name==='cover'&&b.team==='sentinel'?match.timer:0;}
    if(name==='buy')for(const b of squad.bots.filter(b=>b.team==='vanguard'))b.group.position.set((rand()-.5)*5,0,18+rand()*2);
    if(name==='cover'){const enemy=squad.bots.find(b=>b.team==='sentinel');enemy.group.position.set(-22,0,-3);}
    if(name==='action'){const enemy=squad.bots.find(b=>b.team==='sentinel');enemy.group.position.set(6,0,3);enemy.health=56;}
    if(name==='site'){const defender=squad.bots.find(b=>b.team==='sentinel');defender.group.position.set(-21,0,-13);defender.group.rotation.set(0,0,0);defender.group.scale.y=.64;const guard=squad.bots.find(b=>b.team==='vanguard');guard.group.position.set(-26,0,-10);guard.yaw=Math.atan2(-(-22-guard.position.x),-(-13-guard.position.z));guard.group.rotation.y=guard.yaw;}
    if(name==='cover'||name==='action')viewmodel.switchWeapon(rifle);
    if(name==='action'){viewmodel.muzzleFlash();const flash=new THREE.Mesh(new THREE.PlaneGeometry(.38,.32),new THREE.MeshBasicMaterial({color:0xffd47b,transparent:true,opacity:.98,side:THREE.DoubleSide,depthWrite:false}));flash.position.set(.3,-.2,-1.35);camera.add(flash);const trace=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-7,1.5,3.5),new THREE.Vector3(4,1.5,3)]);const line=new THREE.Line(trace,new THREE.LineBasicMaterial({color:0xffd27c}));scene.add(line);const cloud=new THREE.Mesh(new THREE.SphereGeometry(3,12,8),new THREE.MeshBasicMaterial({color:0xa6a9a6,transparent:true,opacity:.15,depthWrite:false}));cloud.scale.y=.28;cloud.position.set(1,.72,1);scene.add(cloud);}
    if(name==='site'){const charge=new THREE.Mesh(new THREE.BoxGeometry(.32,.16,.48),new THREE.MeshStandardMaterial({color:0xd88e39,emissive:0xf08a25,emissiveIntensity:1.5}));charge.position.set(-22,.12,-13);scene.add(charge);}
    if(name==='buy'){hud.showBuy(true);hud.menu(match.buyData(player),player.money,()=>{});}
    if(name==='action')hud.addKill('Ash','Gale','VK-7 Carbine',false);
    hud.update({player,match,weapon:weaponStates[player.currentWeapon],spread:1,entities:[player,...squad.bots],clouds:[],time:match.timer});
  }
  apply();
  return{isStaged:()=>staged,name,seed,apply};
}
