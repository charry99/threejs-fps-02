export function createMatch(config,player,squad,map){
  let activeEvents=[];
  const match={round:1,phase:'freeze',timer:config.rounds.freeze,scores:{vanguard:0,sentinel:0},lossStreak:{vanguard:0,sentinel:0},bomb:'carried',carrier:player,plantedSite:null,plantProgress:0,defuseProgress:0,fuse:0,buyWindow:config.rounds.freeze+15};
  match.update=(dt,entities,events)=>{
    activeEvents=events;
    if(match.phase==='matchEnd')return;
    for(const event of events){if(event.type==='plant'&&event.actor!=='You'&&match.bomb==='carried'){match.bomb='planted';match.plantedSite=map.sites.find(s=>s.id===event.site)||map.sites[0];match.fuse=config.rounds.fuse;}if(event.type==='defuse'&&event.actor!=='You'&&match.bomb==='planted'){match.bomb='defused';finish('sentinel','Charge defused');}}
    if(match.phase==='freeze'){match.timer-=dt;if(match.timer<=0){match.phase='live';match.timer=config.rounds.duration;events.push({type:'round-live',round:match.round});}return;}
    if(match.phase==='ended'){match.timer-=dt;if(match.timer<=0){if(match.scores.vanguard>=config.rounds.wins||match.scores.sentinel>=config.rounds.wins||match.round>=config.rounds.maximum){match.phase='matchEnd';events.push({type:'match-end',vanguard:match.scores.vanguard,sentinel:match.scores.sentinel});}else{match.round++;match.phase='freeze';match.timer=config.rounds.freeze;match.bomb='carried';match.carrier=player;match.plantedSite=null;match.plantProgress=match.defuseProgress=0;match.fuse=0;events.push({type:'round-start',round:match.round});}}return;}
    if(match.phase!=='live')return;
    const alive=entities.filter(e=>e.alive!==false&&e.health>0), attackers=alive.filter(e=>e.team==='vanguard'), defenders=alive.filter(e=>e.team==='sentinel');
    if(!defenders.length)return finish('vanguard','Eliminated');if(!attackers.length)return finish('sentinel','Eliminated');
    match.timer-=dt;
    if(match.bomb==='planted'){match.fuse-=dt;if(match.fuse<=0)return finish('vanguard','Charge detonated');}
    const interrupted=events.some(event=>event.type==='shot'&&event.team==='vanguard');
    if(match.carrier&&match.carrier.alive!==false&&match.bomb==='carried'&&player.useHeld&&!interrupted){const site=map.sites.find(s=>Math.hypot(player.position.x-s.x,player.position.z-s.z)<s.radius);if(site){match.plantProgress+=dt;if(match.plantProgress>=config.rounds.plant){match.bomb='planted';match.plantedSite=site;match.fuse=config.rounds.fuse;player.money=Math.min(config.economy.maximum,player.money+config.economy.plant);events.push({type:'plant',actor:'You',site:site.id});}}else match.plantProgress=0;}else if(match.bomb==='carried')match.plantProgress=0;
    if(match.bomb==='planted'&&player.team==='sentinel'&&player.useHeld&&Math.hypot(player.position.x-match.plantedSite.x,player.position.z-match.plantedSite.z)<match.plantedSite.radius){match.defuseProgress+=dt;if(match.defuseProgress>=config.rounds.defuse){match.bomb='defused';player.money=Math.min(config.economy.maximum,player.money+config.economy.defuse);events.push({type:'defuse',actor:'You'});finish('sentinel','Charge defused');}}else if(match.bomb==='planted')match.defuseProgress=0;
    if(match.bomb!=='planted'&&match.timer<=0)finish('sentinel','Time expired');
  };
  match.finish=(team,reason)=>finish(team,reason);
  match.buy=(combatant,item)=>{
    if(!(match.phase==='freeze'||match.phase==='live'&&match.timer>config.rounds.duration-15))return false;
    const data=match.item(item);if(!data||combatant.money<data.price||data.owned)return false;
    combatant.money-=data.price;
    if(data.kind==='weapon'){combatant.weapons ||= [];if(!combatant.weapons.some(w=>w.name===data.definition.name))combatant.weapons.push(data.definition);}
    else if(data.kind==='grenade')combatant.grenades[item]=(combatant.grenades[item]||0)+1;
    else if(item==='vest')combatant.armour=50;else if(item==='helmet')combatant.helmet=true;
    return true;
  };
  match.buyData=(combatant)=>[
    ...config.weapons.map(d=>({name:d.name,key:d.name,kind:'weapon',price:d.price,description:`${d.magazine} rounds · ${d.damage} body damage`,affordable:combatant.money>=d.price,owned:(combatant.weapons||[]).some(w=>w.name===d.name)})),
    ...Object.entries(config.grenades).map(([key,d])=>({name:d.name,key,kind:'grenade',price:d.price,description:'Tactical grenade',affordable:combatant.money>=d.price,owned:false})),
    {name:'Armour vest',key:'vest',kind:'armour',price:config.armour.vest.price,description:'50 points of damage protection',affordable:combatant.money>=config.armour.vest.price,owned:combatant.armour>=50},
    {name:'Helmet',key:'helmet',kind:'armour',price:config.armour.helmet.price,description:'Reduces headshot damage',affordable:combatant.money>=config.armour.helmet.price,owned:combatant.helmet},
  ];
  match.item=(key)=>{for(const d of config.weapons)if(d.name===key)return{kind:'weapon',price:d.price,definition:d,owned:player.weapons.some(w=>w.name===d.name)};for(const [kind,d]of Object.entries(config.grenades))if(kind===key)return{kind:'grenade',price:d.price};if(key==='vest')return{kind:'armour',price:config.armour.vest.price};if(key==='helmet')return{kind:'armour',price:config.armour.helmet.price};return null;};
  match.awardKill=(killer)=>{killer.money=Math.min(config.economy.maximum,(killer.money||0)+config.economy.kill);};
  function finish(team,reason){if(match.phase!=='live')return;const other=team==='vanguard'?'sentinel':'vanguard';match.phase='ended';match.timer=4;match.scores[team]++;match.lossStreak[team]=0;match.lossStreak[other]++;const bonus=Math.min(3,match.lossStreak[other])*config.economy.lossStreak;for(const e of [player,...squad.bots])if(e.team===team)e.money=Math.min(config.economy.maximum,(e.money||0)+config.economy.win);else e.money=Math.min(config.economy.maximum,(e.money||0)+config.economy.loss+bonus);eventsPush({type:'round-end',team,reason,round:match.round});}
  function eventsPush(event){activeEvents.push(event);}
  return match;
}
