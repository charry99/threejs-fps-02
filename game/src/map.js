const box = (x, z, halfWidth, halfDepth, height, kind, extra = {}) => ({ x, z, halfWidth, halfDepth, height, kind, ...extra });

const colliders = [
  box(0, -20, 32, .3, 4, 'perimeter'), box(0, 20, 32, .3, 4, 'perimeter'),
  box(-32, 0, .3, 20, 4, 'perimeter'), box(32, 0, .3, 20, 4, 'perimeter'),
  // Crane Bay U, open toward the south-east.
  box(-27, -14, 4, 1, 2.9, 'container', { color: 'teal' }), box(-30, -10, 1, 3, 2.9, 'container', { color: 'rust' }),
  // Fuel Depot tanks and pipe racks.
  box(18, 9, 1.5, 1.5, 4.4, 'tank'), box(23, 9, 1.5, 1.5, 4.4, 'tank'), box(28, 9, 1.5, 1.5, 4.4, 'tank'),
  box(20, 15, 3, .7, 1.4, 'pipe'), box(27, 15, 3, .7, 1.4, 'pipe'),
  // Mid stack leaves a 2.4 metre door opening.
  box(-2.5, 0, 1.8, 1.3, 2.9, 'container', { color: 'slate' }), box(2.5, 0, 1.8, 1.3, 2.9, 'container', { color: 'amber' }),
  box(0, 0, 1.2, .45, 2.9, 'container', { color: 'weathered', upper: true }),
  // Long outer rows define the A-long and B-short lanes.
  box(-25, 1, 1.2, 7, 2.9, 'container', { color: 'weathered' }), box(-25, 13, 1.2, 4, 2.9, 'container', { color: 'teal' }),
  box(25, -2, 1.2, 8, 2.9, 'container', { color: 'rust' }), box(25, -14, 1.2, 3, 2.9, 'container', { color: 'slate' }),
  box(-10, 8, .6, .6, 1.2, 'crate'), box(-10, 8, .6, .6, 2.4, 'crate', { upper: true }), box(-17, 2, .6, .6, 1.2, 'crate'),
  box(-15, 13, .6, .6, 1.2, 'crate'), box(-5, -8, .6, .6, 1.2, 'crate'), box(9, 5, .6, .6, 1.2, 'crate'),
  box(15, 2, .6, .6, 1.2, 'crate'), box(17, -7, .6, .6, 1.2, 'crate'), box(10, 16, .6, .6, 1.2, 'crate'),
  box(-20, 6, .4, .4, .8, 'barrel'), box(-8, 15, .4, .4, .8, 'barrel'), box(8, -13, .4, .4, .8, 'barrel'), box(14, -3, .4, .4, .8, 'barrel'),
  box(6, -4, 1, 1, 6, 'watchtower'), box(14, 12, 1.1, .35, 1.2, 'forklift'),
];

const waypoints = [
  {id:'v0',x:-12,z:17,label:'spawn',edges:['v1']},{id:'v1',x:-6,z:17,label:'spawn',edges:['v0','v2']},{id:'v2',x:0,z:17,label:'spawn',edges:['v1','v3','south']},{id:'v3',x:6,z:17,label:'spawn',edges:['v2','v4']},{id:'v4',x:12,z:17,label:'spawn',edges:['v3']},
  {id:'south',x:0,z:12,label:'lane junction',edges:['v2','west','east','mid']},
  {id:'west',x:-18,z:10,label:'lane junction',edges:['south','wc1','a1','mid']},{id:'wc1',x:-18,z:5,label:'cover spot',edges:['west','wc2']},{id:'wc2',x:-18,z:-2,label:'cover spot',edges:['wc1','a1']},
  {id:'a1',x:-23,z:-7,label:'site entrance',edges:['west','wc2','a2','a']},{id:'a2',x:-17,z:-12,label:'site entrance',edges:['a1','a']},{id:'a',x:-22,z:-13,label:'site',edges:['a1','a2']},
  {id:'mid',x:0,z:5,label:'mid',edges:['south','east','west','m1','north']},{id:'m1',x:8,z:5,label:'cover spot',edges:['mid','m2']},{id:'m2',x:14,z:5,label:'cover spot',edges:['m1','east']},
  {id:'east',x:19,z:8,label:'lane junction',edges:['south','mid','m2','b1']},{id:'b1',x:20,z:12,label:'site entrance',edges:['east','b']},{id:'b',x:22,z:13,label:'site',edges:['b1','b2']},{id:'b2',x:27,z:12,label:'site entrance',edges:['b','e1']},
  {id:'e1',x:18,z:-2,label:'lane junction',edges:['b2','ec1']},{id:'ec1',x:18,z:-6,label:'cover spot',edges:['e1','ec2']},{id:'ec2',x:18,z:-13,label:'cover spot',edges:['ec1','south']},
  {id:'north',x:0,z:-10,label:'lane junction',edges:['mid','nw','ne']},{id:'nw',x:-10,z:-15,label:'cover spot',edges:['north','a']},{id:'ne',x:10,z:-15,label:'cover spot',edges:['north','ec2']},
];

export const MAP = Object.freeze({
  name:'Kestrel Yard', bounds:Object.freeze({minX:-32,maxX:32,minZ:-20,maxZ:20}), perimeter:Object.freeze({height:4,thickness:.6,baseHeight:.55}),
  colliders:Object.freeze(colliders.map(Object.freeze)),
  spawns:Object.freeze({ vanguard:Object.freeze([{x:-12,z:17,yaw:0},{x:-6,z:17,yaw:0},{x:0,z:17,yaw:0},{x:6,z:17,yaw:0},{x:12,z:17,yaw:0}]), sentinel:Object.freeze([{x:-24,z:-7,yaw:Math.PI},{x:-18,z:-9,yaw:Math.PI},{x:20,z:7,yaw:Math.PI},{x:27,z:8,yaw:Math.PI},{x:0,z:-13,yaw:Math.PI}]) }),
  sites:Object.freeze([{id:'A',name:'Crane Bay',x:-22,z:-13,radius:5,entrances:['a1','a2']},{id:'B',name:'Fuel Depot',x:22,z:13,radius:5,entrances:['b1','b2']}]),
  waypoints:Object.freeze(waypoints.map(node=>Object.freeze({...node,edges:Object.freeze(node.edges)}))),
  props:Object.freeze([{kind:'floodlight',x:-29,z:-17,height:7},{kind:'floodlight',x:29,z:-17,height:7},{kind:'floodlight',x:-29,z:17,height:7},{kind:'floodlight',x:29,z:17,height:7},{kind:'floodlight',x:-10,z:-18,height:7},{kind:'floodlight',x:10,z:-18,height:7},{kind:'reel',x:-12,z:4},{kind:'reel',x:12,z:-9},{kind:'arrow',x:-18,z:16,rotation:0},{kind:'arrow',x:18,z:16,rotation:0},{kind:'warning',x:-23,z:-7},{kind:'warning',x:22,z:8},{kind:'gantry',x:0,z:-19,height:18}].map(Object.freeze)),
  names:Object.freeze({sites:Object.freeze(['Crane Bay','Fuel Depot']),teams:Object.freeze(['Vanguard','Sentinel']),charge:'Ember Charge'}),
});

export function findPath(startId, goalId) {
  const byId = new Map(MAP.waypoints.map(node=>[node.id,node]));
  if (!byId.has(startId) || !byId.has(goalId)) return [];
  const queue=[startId], previous=new Map([[startId,null]]);
  while(queue.length){const id=queue.shift();if(id===goalId)break;for(const next of byId.get(id).edges)if(!previous.has(next)){previous.set(next,id);queue.push(next);}}
  if(!previous.has(goalId))return[];const path=[];for(let id=goalId;id!==null;id=previous.get(id))path.push(id);return path.reverse();
}
