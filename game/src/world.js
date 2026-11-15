import * as THREE from 'three';
import { PALETTE } from './palette.js';

const shared = new Map();
function material(color, options={}) { const key=`${color}:${options.metalness||0}:${options.roughness??.8}:${options.emissive||0}`;if(!shared.has(key))shared.set(key,new THREE.MeshStandardMaterial({color,roughness:.8,...options}));return shared.get(key); }
function canvasTexture(draw, width=512, height=512) { const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;draw(canvas.getContext('2d'),width,height);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;return texture; }
const asphaltTexture=canvasTexture((ctx,w,h)=>{ctx.fillStyle='#3a3d3e';ctx.fillRect(0,0,w,h);let seed=8;for(let i=0;i<12000;i++){seed=(seed*1664525+1013904223)>>>0;const x=seed%w;seed=(seed*1664525+1013904223)>>>0;const y=seed%h;ctx.fillStyle=(seed&1)?'rgba(235,220,190,.07)':'rgba(0,0,0,.09)';ctx.fillRect(x,y,1+(seed%2),1);}ctx.strokeStyle='rgba(196,169,95,.48)';ctx.lineWidth=5;ctx.setLineDash([50,35]);ctx.beginPath();ctx.moveTo(w*.5,0);ctx.lineTo(w*.5,h);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.arc(w*.5,h*.5,45,0,Math.PI*2);ctx.stroke();});
const containerTextures=new Map();
function containerTexture(code,color){const key=`${code}:${color}`;if(!containerTextures.has(key))containerTextures.set(key,canvasTexture((ctx,w,h)=>{ctx.fillStyle=color;ctx.fillRect(0,0,w,h);for(let x=0;x<w;x+=18){ctx.fillStyle=x%36?'rgba(0,0,0,.13)':'rgba(255,255,255,.09)';ctx.fillRect(x,0,5,h);}ctx.fillStyle='rgba(236,224,196,.78)';ctx.font='bold 22px monospace';ctx.fillText(code,30,h-35);ctx.strokeStyle='rgba(238,232,220,.32)';ctx.strokeRect(8,8,w-16,h-16);}));return containerTextures.get(key);}

export function buildWorld(scene, MAP) {
  scene.background=new THREE.Color(PALETTE.skyTop);scene.fog=new THREE.Fog(PALETTE.fog,58,125);
  const root=new THREE.Group();scene.add(root);const boxGeometry=new THREE.BoxGeometry(1,1,1), cylinderGeometry=new THREE.CylinderGeometry(.5,.5,1,16), sphereGeometry=new THREE.SphereGeometry(1,24,12);
  const colliders=MAP.colliders, siteMarkers=[], lampPositions=[];
  const addBox=(x,y,z,sx,sy,sz,mat,rotation=0)=>{const mesh=new THREE.Mesh(boxGeometry,mat);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.rotation.y=rotation;mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh;};
  const addCylinder=(x,y,z,r,h,mat,rotation=0)=>{const mesh=new THREE.Mesh(cylinderGeometry,mat);mesh.position.set(x,y,z);mesh.scale.set(r*2,h,r*2);mesh.rotation.z=rotation;mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh;};
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(64,40),new THREE.MeshStandardMaterial({map:asphaltTexture,roughness:.94}));ground.rotation.x=-Math.PI/2;ground.position.y=-.03;ground.receiveShadow=true;root.add(ground);
  const sky=new THREE.Mesh(new THREE.SphereGeometry(180,32,20),new THREE.MeshBasicMaterial({side:THREE.BackSide,vertexColors:true}));const colors=[];const pos=sky.geometry.attributes.position;for(let i=0;i<pos.count;i++){const t=THREE.MathUtils.clamp((pos.getY(i)/180+.15)*1.4,0,1);const c=new THREE.Color(PALETTE.skyHorizon).lerp(new THREE.Color(PALETTE.skyTop),t);colors.push(c.r,c.g,c.b);}sky.geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));root.add(sky);
  const sun=new THREE.Mesh(sphereGeometry,new THREE.MeshBasicMaterial({color:PALETTE.sun}));sun.position.set(-55,14,-28);sun.scale.setScalar(6);root.add(sun);
  for(let i=0;i<7;i++){const cloud=new THREE.Mesh(new THREE.CircleGeometry(1,12),new THREE.MeshBasicMaterial({color:0xd4a58a,transparent:true,opacity:.09,side:THREE.DoubleSide}));cloud.position.set(-28+i*9,17+(i%3),-38);cloud.scale.set(5,1.3,1);root.add(cloud);}
  const hemi=new THREE.HemisphereLight(PALETTE.hemisphereSky,PALETTE.hemisphereGround,1.65);scene.add(hemi);
  const sunLight=new THREE.DirectionalLight(0xffc28a,2.0);sunLight.position.set(-30,24,12);sunLight.castShadow=true;sunLight.shadow.mapSize.set(2048,2048);sunLight.shadow.camera.left=-36;sunLight.shadow.camera.right=36;sunLight.shadow.camera.top=24;sunLight.shadow.camera.bottom=-24;scene.add(sunLight);
  // Perimeter steel panels and continuous concrete footings.
  for(const c of colliders.filter(c=>c.kind==='perimeter')){addBox(c.x, c.height/2,c.z,c.halfWidth*2,c.height,c.halfDepth*2,material(PALETTE.wall,{metalness:.25}));if(Math.abs(c.z)>10)addBox(c.x,.275,c.z,c.halfWidth*2,.55,c.halfDepth*2,material(PALETTE.wallBase));}
  for(const c of colliders.filter(c=>c.kind!=='perimeter')){
    if(c.kind==='container'){const palette={teal:PALETTE.containerTeal,rust:PALETTE.containerRust,amber:PALETTE.containerAmber,slate:PALETTE.containerSlate,weathered:PALETTE.containerWeathered};const color=palette[c.color||'teal'];const height=c.upper?2.9:Math.min(c.height,2.9);const mesh=addBox(c.x,height/2+(c.upper?2.9:0),c.z,c.halfWidth*2,height,c.halfDepth*2,new THREE.MeshStandardMaterial({map:containerTexture(`KY-${String(Math.abs(Math.round(c.x*10))).padStart(3,'0')}`,`#${color.toString(16).padStart(6,'0')}`),roughness:.84,metalness:.18}),c.upper?.025:0);mesh.castShadow=true;}
    else if(c.kind==='crate'){addBox(c.x,c.height/2,c.z,c.halfWidth*2,c.height,c.halfDepth*2,material(PALETTE.crate));const trim=material(0x382d25);addBox(c.x,c.height*.48,c.z,c.halfWidth*2+.03,.07,.08,trim);}
    else if(c.kind==='barrel'){const m=material(PALETTE.barrelRust);addCylinder(c.x,c.height/2,c.z,.4,c.height,m);}
    else if(c.kind==='tank'){addCylinder(c.x,c.height/2,c.z,1.5,c.height,material(PALETTE.containerWeathered,{metalness:.48}));addCylinder(c.x,c.height-.08,c.z,1.57,.16,material(PALETTE.pipe,{metalness:.5}));addCylinder(c.x,c.height*.55,c.z,1.51,.38,material(PALETTE.barrelRust));}
    else if(c.kind==='pipe'){for(let i=0;i<3;i++)addCylinder(c.x,c.height*.35+i*.44,c.z, .34,c.halfWidth*2,material(PALETTE.pipe,{metalness:.55}),Math.PI/2);}
    else if(c.kind==='watchtower'){for(const dx of [-.8,.8])for(const dz of [-.8,.8])addBox(c.x+dx,3,c.z+dz,.16,6,.16,material(PALETTE.crane));addBox(c.x,3,c.z,2, .2,2,material(PALETTE.crane));for(let i=0;i<4;i++){const angle=i*Math.PI/2;const rail=addBox(c.x,4.1,c.z,2,.12,.12,material(PALETTE.crane));rail.rotation.y=angle;}}
    else if(c.kind==='forklift'){addBox(c.x, .55,c.z,2.2,1.1,.7,material(PALETTE.containerAmber));addBox(c.x+.8,1.4,c.z,.12,1.8,.12,material(PALETTE.crane));addBox(c.x+1.3,.18,c.z,.9,.12,.1,material(PALETTE.crane));}
  }
  // Crane gantry and hanging hook.
  const craneMat=material(PALETTE.crane,{metalness:.55});addBox(0,17,-19,54,.35,.4,craneMat);for(const x of [-25,25]){addBox(x,9,-19,.55,18,.55,craneMat);addBox(x,17,-19,1,.45,1,craneMat);}addBox(6,14,-18,.35,6,.35,craneMat);addBox(6,11,-18,1,.8,1,craneMat);
  // Floodlights, warm fixtures and pools of light.
  for(const p of MAP.props.filter(p=>p.kind==='floodlight')){addBox(p.x,p.height/2,p.z,.22,p.height,.22,craneMat);addBox(p.x,p.height,p.z,.72,.32,.38,material(PALETTE.floodlight,{emissive:PALETTE.floodlight,emissiveIntensity:1.8}));lampPositions.push(new THREE.Vector3(p.x,p.height,p.z));}
  for(const p of lampPositions.slice(0,3)){const light=new THREE.PointLight(0xffbf83,90,24,2);light.position.copy(p);scene.add(light);}
  // Painted site rounds and entrances.
  for(const [i,site] of MAP.sites.entries()){const glyph=canvasTexture((ctx,w,h)=>{ctx.strokeStyle='#d9c47b';ctx.lineWidth=12;ctx.beginPath();ctx.arc(w/2,h/2,w*.38,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#d9c47b';ctx.font='bold 210px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(site.id,w/2,h/2+5);},256,256);const marker=new THREE.Mesh(new THREE.PlaneGeometry(7,7),new THREE.MeshBasicMaterial({map:glyph,transparent:true,depthWrite:false}));marker.rotation.x=-Math.PI/2;marker.position.set(site.x,.012,site.z);root.add(marker);siteMarkers.push(marker);}
  for(const p of MAP.props.filter(p=>p.kind==='warning'))for(let i=0;i<8;i++)addBox(p.x-2.2+i*.62,.018,p.z,.32,.025,.65,material(i%2?0x1a1b1b:PALETTE.site));
  for(const p of MAP.props.filter(p=>p.kind==='reel')){addCylinder(p.x,.32,p.z,.62,.64,material(PALETTE.crate));addCylinder(p.x,.32,p.z,.2,.68,material(PALETTE.crane));}
  // Puddles and planks enrich the ground without adding update-time work.
  const puddleMat=new THREE.MeshStandardMaterial({color:0x202d35,metalness:.55,roughness:.2,transparent:true,opacity:.75});for(const p of [[-14,-5],[11,2],[3,14],[-7,-13]]){const puddle=new THREE.Mesh(new THREE.CircleGeometry(1,16),puddleMat);puddle.rotation.x=-Math.PI/2;puddle.position.set(p[0],.006,p[1]);puddle.scale.set(1.8,.65,1);root.add(puddle);}for(const p of [[-7,3],[12,-11],[3,10]])addBox(p[0],.07,p[1],1.5,.12,.25,material(PALETTE.crate),.25);
  const placeProp=(name,position)=>{const prop=new THREE.Group();prop.name=name;prop.position.set(position.x||0,position.y||0,position.z||0);root.add(prop);return prop;};
  return {colliders,siteMarkers,lampPositions,placeProp};
}

export function pointCollides(x,z,radius,colliders){for(const c of colliders){const dx=Math.max(Math.abs(x-c.x)-c.halfWidth,0),dz=Math.max(Math.abs(z-c.z)-c.halfDepth,0);if(dx*dx+dz*dz<radius*radius)return c;}return null;}

export function raycastSegment(ax,az,bx,bz,colliders){const dx=bx-ax,dz=bz-az,length=Math.hypot(dx,dz);if(!length)return null;let nearest=null;for(const c of colliders){let tMin=0,tMax=1;for(const [origin,delta,min,max] of [[ax,dx,c.x-c.halfWidth,c.x+c.halfWidth],[az,dz,c.z-c.halfDepth,c.z+c.halfDepth]]){if(Math.abs(delta)<1e-9){if(origin<min||origin>max){tMin=2;break;}}else{let a=(min-origin)/delta,b=(max-origin)/delta;if(a>b)[a,b]=[b,a];tMin=Math.max(tMin,a);tMax=Math.min(tMax,b);}}if(tMin<=tMax&&tMin>=0&&tMin<=1&&(!nearest||tMin*length<nearest.distance))nearest={distance:tMin*length,collider:c,x:ax+dx*tMin,z:az+dz*tMin};}return nearest;}
