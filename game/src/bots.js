import * as THREE from 'three';
import { findPath } from './map.js';
import { pointCollides } from './world.js';
import { createWeaponState, tryFire, updateReload } from './weapons.js';
import { hasLineOfSight } from './combat.js';

const botSpecs=[['Ash','vanguard'],['Brink','vanguard'],['Cinder','vanguard'],['Dusk','vanguard'],['Frost','sentinel'],['Gale','sentinel'],['Haven','sentinel'],['Iris','sentinel'],['Juno','sentinel']];
const colors={vanguard:0xd18b39,sentinel:0x39a99f};

export function createBots(scene,map,config,rng){
  const geometry=new THREE.BoxGeometry(1,1,1), bots=[];
  const mats={body:new THREE.MeshStandardMaterial({color:0x53585a,roughness:.8}),head:new THREE.MeshStandardMaterial({color:0x9b8777}),gun:new THREE.MeshStandardMaterial({color:0x24292d,metalness:.5}),trim:{}};
  function makeBot(name,team,spawn,index){
    const group=new THREE.Group();group.position.set(spawn.x,0,spawn.z);scene.add(group);
    const trim=new THREE.MeshStandardMaterial({color:colors[team],emissive:colors[team],emissiveIntensity:.72,roughness:.38});mats.trim[team]=trim;
    const parts=[];const box=(y,x,z,sx,sy,sz,mat)=>{const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;group.add(m);parts.push(m);return m;};
    box(1.02,0,0,.62,.78,.34,mats.body);box(1.62,0,0,.4,.42,.38,mats.head);box(1.64,0,-.198,.34,.09,.025,trim);
    for(const x of [-.2,.2]){box(.39,x,0,.23,.7,.29,mats.body);box(1.1,x*2.7,0,.2,.68,.25,mats.body);}
    box(1.03,.27,-.22,.12,.1,.56,mats.gun);
    return {name,team,position:group.position,yaw:spawn.yaw||0,pitch:0,health:100,armour:0,helmet:false,weapon:createWeaponState(config.weapons[index%4===0?1:index%4===1?2:0]),state:'route',path:[],pathIndex:0,holdPosition:{x:spawn.x,z:spawn.z},holdYaw:spawn.yaw||0,target:null,lastSeen:null,lastHeard:null,reaction:0,reactionTime:rng.range(config.bots.reactionMin,config.bots.reactionMax)/1000,aimError:rng.range(0,config.bots.aimError),burst:0,burstPause:0,blind:0,team,group,parts,spawn:{...spawn},height:1.85,headRadius:.2,alive:true,charge:false,routeGoal:null,plantProgress:0,defuseProgress:0,seenAt:0,money:800,lookSweep:rng.range(0,6.28),stride:0};
  }
  const v=map.spawns.vanguard,s=map.spawns.sentinel;
  for(let i=0;i<4;i++)bots.push(makeBot(botSpecs[i][0],botSpecs[i][1],v[i+1],i));
  for(let i=0;i<5;i++)bots.push(makeBot(botSpecs[i+4][0],botSpecs[i+4][1],s[i],i+1));
  bots[0].charge=true;
  function setRoute(bot,goal){bot.routeGoal=goal;bot.path=findPath(nearestWaypoint(map,bot.position),goal);bot.pathIndex=Math.min(1,bot.path.length-1);bot.state='route';}
  for(let i=0;i<4;i++)setRoute(bots[i],i<3?'a':i===3?'b':'mid');
  // Stagger the second attack route through mid.
  setRoute(bots[3],'mid');
  const defenderGoals=['a','a','b','b','mid'];for(let i=0;i<5;i++){setRoute(bots[4+i],defenderGoals[i]);bots[4+i].holdPosition={x:map.waypoints.find(n=>n.id===defenderGoals[i]).x+(i%2?1.5:-1.5),z:map.waypoints.find(n=>n.id===defenderGoals[i]).z};bots[4+i].holdYaw=i<2?0:Math.PI;}
  const squad={
    bots,
    update(dt,entities,colliders,events,options={}){
      if(options.frozen)return;
      const now=options.time||0;
      for(const bot of bots){if(!bot.alive)continue;bot.blind=Math.max(0,bot.blind-dt);updateReload(bot.weapon,now*1000);
        for(const ev of events)if(ev.type==='shot'&&ev.team!==bot.team&&Math.hypot(ev.x-bot.position.x,ev.z-bot.position.z)<config.bots.hearing){bot.lastHeard={x:ev.x,z:ev.z};if(bot.state==='engage'&&bot.burst===0)bot.state='investigate';}
        const enemies=entities.filter(e=>e.alive!==false&&e.team!==bot.team&&e.health>0);
        let visible=null,closest=Infinity;
        for(const enemy of enemies){const dx=enemy.position.x-bot.position.x,dz=enemy.position.z-bot.position.z,d=Math.hypot(dx,dz);const angle=Math.atan2(-dx,-dz);const delta=Math.atan2(Math.sin(angle-bot.yaw),Math.cos(angle-bot.yaw));if(d<config.bots.vision&&Math.abs(delta)<config.bots.halfAngle*Math.PI/180&&d<closest&&hasLineOfSight({x:bot.position.x,y:1.4,z:bot.position.z},{x:enemy.position.x,y:1.4,z:enemy.position.z},colliders)){visible=enemy;closest=d;}}
        if(visible){bot.target=visible;bot.lastSeen={x:visible.position.x,z:visible.position.z};bot.seenAt=now;if(bot.state!=='engage'){bot.reaction+=dt;if(bot.reaction>=bot.reactionTime)bot.state='engage';}}else if(bot.state!=='engage')bot.reaction=0;
        if(bot.state==='route'||bot.state==='retake'){
          const target=bot.state==='retake'&&options.planted?options.planted:waypoint(map,bot.path[bot.pathIndex]);if(target){move(bot,target,dt,colliders,bots,config.bots.walk);if(Math.hypot(target.x-bot.position.x,target.z-bot.position.z)<.7){if(bot.pathIndex<bot.path.length-1)bot.pathIndex++;else if(bot.team==='sentinel')bot.state='hold';else if(bot.charge)bot.state='plant';else bot.state='peek';}}
          if(options.planted&&bot.team==='sentinel'){bot.state='retake';if(Math.hypot(bot.position.x-options.planted.x,bot.position.z-options.planted.z)<1.1)bot.state='defuse';}
        }else if(bot.state==='hold'||bot.state==='peek'){
          bot.lookSweep+=dt*.35;bot.yaw=bot.holdYaw+Math.sin(bot.lookSweep)*.45;
          if(bot.team==='vanguard'&&bot.charge&&options.phase==='live'&&options.site)bot.state='plant';
        }else if(bot.state==='engage'){
          if(!visible){if(now-bot.seenAt>1.5){bot.state='investigate';bot.target=null;}continue;}
          const dx=visible.position.x-bot.position.x,dz=visible.position.z-bot.position.z,dist=Math.hypot(dx,dz);bot.yaw=Math.atan2(-dx,-dz);bot.pitch=Math.atan2((visible.position.y||0)+1.3-(bot.position.y+1.45),dist);
          if(bot.burstPause>0){bot.burstPause-=dt;continue;}
          if(bot.burst<=0)bot.burst=rng.integer(config.bots.burstMin,config.bots.burstMax+1);
          const shot=tryFire(bot.weapon,now*1000,{moving:false,airborne:false,crouched:false},rng);
          if(shot){bot.burst--;events.push({type:'shot',team:bot.team,shooter:bot.name,x:bot.position.x,y:1.5,z:bot.position.z,weapon:bot.weapon.definition.name});const err=(bot.aimError*Math.min(1,dist/30))*Math.PI/180;const aim={x:-Math.sin(bot.yaw)+rng.gaussian()*err,y:Math.sin(bot.pitch)+rng.gaussian()*err,z:-Math.cos(bot.yaw)+rng.gaussian()*err};const length=Math.hypot(aim.x,aim.y,aim.z);for(const k of ['x','y','z'])aim[k]/=length;events.push({type:'bot-shot',team:bot.team,shooter:bot.name,ox:bot.position.x,oy:1.5,oz:bot.position.z,dx:aim.x,dy:aim.y,dz:aim.z,damage:bot.weapon.definition.damage,range:bot.weapon.definition.falloff});}
          if(bot.burst===0)bot.burstPause=rng.range(config.bots.pauseMin,config.bots.pauseMax)/1000;
        }else if(bot.state==='investigate'){
          const goal=bot.lastHeard||bot.lastSeen;if(goal&&Math.hypot(goal.x-bot.position.x,goal.z-bot.position.z)>.8)move(bot,goal,dt,colliders,bots,config.bots.walk);else{bot.lookSweep+=dt;if(bot.lookSweep>2){bot.lookSweep=0;bot.state=bot.team==='sentinel'?'hold':'route';}}
        }else if(bot.state==='plant'&&bot.charge&&options.use&&options.site&&Math.hypot(bot.position.x-options.site.x,bot.position.z-options.site.z)<options.site.radius){bot.plantProgress+=dt;if(bot.plantProgress>=config.rounds.plant){bot.charge=false;events.push({type:'plant',actor:bot.name,site:options.site.id});}}
        else if(bot.state==='defuse'&&options.planted){bot.defuseProgress+=dt;if(bot.defuseProgress>=config.rounds.defuse)events.push({type:'defuse',actor:bot.name});}
      }
    },
    entities(player){return [player,...bots.filter(b=>b.alive)];},
    reset(){for(const b of bots){b.group.position.set(b.spawn.x,0,b.spawn.z);b.group.rotation.set(0,0,0);b.yaw=b.spawn.yaw||0;b.health=100;b.armour=0;b.helmet=false;b.alive=true;b.state='route';const roll=rng.next(),choice=roll<.7?config.weapons[1]:roll<.9?config.weapons[2]:config.weapons[4];if((b.money||0)>=choice.price){b.money-=choice.price;b.weapon=createWeaponState(choice);}else{const fallback=config.weapons[0];b.weapon=createWeaponState(fallback);}if(b.money>=config.armour.vest.price&&rng.next()<.55){b.money-=config.armour.vest.price;b.armour=50;}b.burst=0;b.plantProgress=0;b.defuseProgress=0;b.target=null;b.pathIndex=0;b.parts.forEach(p=>p.visible=true);if(b.team==='vanguard'){const goal=b===bots[3]?'mid':b.charge?'a':'b';b.charge=b.name==='Ash';setRoute(b,goal);}else setRoute(b,'a');}},
    kill(bot,events){if(!bot.alive)return;bot.alive=false;bot.health=0;bot.state='dead';bot.group.rotation.z=Math.PI/2;bot.group.position.y=-.22;events.push({type:'death',victim:bot.name,team:bot.team});if(bot.charge){const carrier=bots.find(other=>other.alive&&other.team==='vanguard');if(carrier)carrier.charge=true;}},
  };
  return squad;
}

function nearestWaypoint(map,p){let best=map.waypoints[0],d=Infinity;for(const n of map.waypoints){const nd=(n.x-p.x)**2+(n.z-p.z)**2;if(nd<d){best=n;d=nd;}}return best.id;}
function waypoint(map,id){const n=map.waypoints.find(w=>w.id===id);return n?{x:n.x,z:n.z}:null;}
function move(bot,target,dt,colliders,bots,speed){let dx=target.x-bot.position.x,dz=target.z-bot.position.z,d=Math.hypot(dx,dz)||1;dx/=d;dz/=d;for(const other of bots){if(other===bot||!other.alive)continue;const sx=bot.position.x-other.position.x,sz=bot.position.z-other.position.z,sd=Math.hypot(sx,sz);if(sd<.8&&sd>.001){dx+=sx/sd*.6;dz+=sz/sd*.6;}}const l=Math.hypot(dx,dz)||1;dx/=l;dz/=l;const nx=bot.position.x+dx*speed*dt,nz=bot.position.z+dz*speed*dt;if(!pointCollides(nx,bot.position.z,.3,colliders))bot.position.x=nx;if(!pointCollides(bot.position.x,nz,.3,colliders))bot.position.z=nz;bot.yaw=Math.atan2(-dx,-dz);}
