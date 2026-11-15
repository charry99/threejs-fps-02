import * as THREE from 'three';

export function createViewmodel(camera, definitions) {
  const root=new THREE.Group();root.position.set(0,0,-.5);camera.add(root);
  const gunmetal=new THREE.MeshStandardMaterial({color:0x66747a,metalness:.62,roughness:.32});
  const dark=new THREE.MeshStandardMaterial({color:0x343d42,metalness:.48,roughness:.42});
  const amber=new THREE.MeshStandardMaterial({color:0xe0a044,emissive:0x704018,emissiveIntensity:.48,metalness:.38,roughness:.4});
  const geometry={box:new THREE.BoxGeometry(1,1,1),cylinder:new THREE.CylinderGeometry(.5,.5,1,12)};
  let parts=[], muzzle=null, muzzleLight=null, recoil=0, reload=0, bob=0, swayX=0,swayY=0, definition=definitions[0];
  let baseFov=camera.fov;
  function clear(){for(const p of parts)root.remove(p);parts=[];if(muzzle)root.remove(muzzle);muzzle=null;}
  function addBox(x,y,z,sx,sy,sz,mat){const m=new THREE.Mesh(geometry.box,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);root.add(m);parts.push(m);return m;}
  function show(next){definition=next;clear();const long=next.name.includes('Longbow'),shotgun=next.name.includes('Breacher'),smg=next.name.includes('Hornet'),sidearm=next.name.includes('P9');const barrel=long?.82:shotgun?.62:smg?.34:sidearm?.38:.58;addBox(.28,-.22,-.62,.32,.28,.7,gunmetal);addBox(.28,-.22,-1.02,.13,.14,barrel,dark);addBox(.28,-.42,-.55,.23,.38,.2,dark);addBox(.28,-.15,-.28,.18,.16,.5,gunmetal);addBox(.28,-.08,-.52,.035,.035,.55,amber);addBox(.28,-.055,-.28,.06,.08,.07,amber);if(long){const scope=new THREE.Mesh(geometry.cylinder,gunmetal);scope.position.set(.28,-.035,-.65);scope.rotation.x=Math.PI/2;scope.scale.set(.09,.36,.09);root.add(scope);parts.push(scope);}if(shotgun){const tube=new THREE.Mesh(geometry.cylinder,dark);tube.position.set(.28,-.21,-1.02);tube.rotation.x=Math.PI/2;tube.scale.set(.09,.62,.09);root.add(tube);parts.push(tube);} }
  root.scale.setScalar(.67);
  show(definition);
  return {
    switchWeapon(next){show(next);},
    recoilKick(){recoil=Math.min(.18,recoil+.12);},
    muzzleFlash(){if(muzzle)root.remove(muzzle);muzzle=new THREE.Mesh(new THREE.PlaneGeometry(.22,.22),new THREE.MeshBasicMaterial({color:0xffcb71,transparent:true,opacity:.95,side:THREE.DoubleSide}));muzzle.position.set(.28,-.22,-(definition.name.includes('Longbow')?1.43:1.05));root.add(muzzle);if(!muzzleLight){muzzleLight=new THREE.PointLight(0xffa74f,0,3);root.add(muzzleLight);}muzzleLight.position.set(.28,-.22,-(definition.name.includes('Longbow')?1.43:1.05));muzzleLight.intensity=4;},
    reloadDip(){reload=.25;},
    update(dt,options={}){bob+=(options.speed||0)*dt*3;recoil=Math.max(0,recoil-dt*1.4);reload=Math.max(0,reload-dt*2.4);swayX+=(options.mouseX||0)*-.00008;swayY+=(options.mouseY||0)*.00006;swayX*=.9;swayY*=.9;const aiming=!!options.aiming;const targetFov=aiming?baseFov-(definition.scoped?26:8):baseFov;camera.fov+=(targetFov-camera.fov)*Math.min(1,dt*12);camera.updateProjectionMatrix();root.position.set((aiming?-.08:0)+swayX,Math.sin(bob)*.012+reload*.5+swayY-(aiming?.04:0),-.5-recoil);root.rotation.set(reload*.7+swayY,swayX,Math.sin(bob)*.012);if(muzzle){muzzle.material.opacity-=dt*25;if(muzzle.material.opacity<=0){root.remove(muzzle);muzzle.geometry.dispose();muzzle.material.dispose();muzzle=null;}if(muzzleLight)muzzleLight.intensity=Math.max(0,muzzleLight.intensity-dt*100);}},
  };
}
