import { raycastSegment } from './world.js';

const dot = (a, b) => a.x*b.x + a.y*b.y + a.z*b.z;
const pointAt = (o, d, t) => ({ x:o.x+d.x*t, y:o.y+d.y*t, z:o.z+d.z*t });

export function raycastShot(origin, direction, maxDistance, entities, colliders) {
  const end = pointAt(origin, direction, maxDistance);
  const wall = raycastSegment(origin.x, origin.z, end.x, end.z, colliders);
  let nearest = wall ? { type:'wall', point:{x:wall.x,y:origin.y+direction.y*wall.distance,z:wall.z}, distance:wall.distance } : null;
  for (const entity of entities) {
    const height = entity.height || 1.7, headRadius = entity.headRadius || .18;
    const base = entity.position;
    const axisStart = {x:base.x,y:base.y+.45,z:base.z}, axisEnd = {x:base.x,y:base.y+height-headRadius,z:base.z};
    const ba={x:axisEnd.x-axisStart.x,y:axisEnd.y-axisStart.y,z:axisEnd.z-axisStart.z};
    const oa={x:origin.x-axisStart.x,y:origin.y-axisStart.y,z:origin.z-axisStart.z};
    const baba=dot(ba,ba), bard=dot(ba,direction), baoa=dot(ba,oa), rdoa=dot(direction,oa), oaoa=dot(oa,oa);
    const aa=baba-bard*bard, bb=baba*rdoa-baoa*bard, cc=baba*oaoa-baoa*baoa-headRadius*headRadius*baba;
    const h=bb*bb-aa*cc;
    let t=Infinity, part='body';
    if(h>=0&&aa>1e-8){const candidate=(-bb-Math.sqrt(h))/aa;const y=baoa+candidate*bard;if(candidate>=0&&y>0&&y<baba)t=candidate;}
    // Head sphere at the top of the body capsule.
    const head={x:base.x,y:base.y+height-headRadius*.6,z:base.z};
    const oc={x:origin.x-head.x,y:origin.y-head.y,z:origin.z-head.z};
    const b=dot(oc,direction), c=dot(oc,oc)-headRadius*headRadius, disc=b*b-c;
    if(disc>=0){const ht=-b-Math.sqrt(disc);if(ht>=0&&ht<t){t=ht;part='head';}}
    if(t<=maxDistance&&(!nearest||t<nearest.distance)){nearest={type:'entity',entity,part,point:pointAt(origin,direction,t),distance:t};}
  }
  return nearest;
}

export function applyDamage(entity, baseDamage, part, distance, definition) {
  const range=definition.falloff;
  const falloff=distance<=range?1:Math.max(.5,1-.5*(distance-range)/range);
  let damage=baseDamage*falloff*(part==='head'?definition.headMultiplier:1);
  if(part==='head'&&entity.helmet)damage*=.5;
  if(entity.armour>0){const absorbed=Math.min(entity.armour,damage*.5);entity.armour-=absorbed;damage-=absorbed;}
  entity.health=Math.max(0,entity.health-damage);
  return {damage,headshot:part==='head',dead:entity.health<=0};
}

export function createGrenadeSimulation() {
  const active=[], clouds=[];
  return {
    active, clouds,
    add(grenade){active.push({...grenade,age:0,bounced:false});},
    update(dt,entities,colliders,events){
      for(let i=active.length-1;i>=0;i--){const g=active[i];g.age+=dt;g.fuse-=dt;g.velocity.y-=9.8*dt;g.position.x+=g.velocity.x*dt;g.position.y+=g.velocity.y*dt;g.position.z+=g.velocity.z*dt;
        const wall=raycastSegment(g.position.x-g.velocity.x*dt,g.position.z-g.velocity.z*dt,g.position.x,g.position.z,colliders);
        if(g.type==='frag'&&!g.bounced&&(g.position.y<=.12||wall)){g.position.y=Math.max(.12,g.position.y);g.velocity.y=Math.abs(g.velocity.y)*.48;g.velocity.x*=.55;g.velocity.z*=.55;g.bounced=true;}
        if(g.fuse<=0){if(g.type==='frag'){for(const e of entities){const d=Math.hypot(e.position.x-g.position.x,e.position.z-g.position.z);if(d<6){const dealt=120*Math.max(0,1-d/6);e.health=Math.max(0,e.health-dealt);}}events.push({type:'blast',x:g.position.x,y:g.position.y,z:g.position.z});}
          else if(g.type==='smoke'){clouds.push({x:g.position.x,y:g.position.y,z:g.position.z,radius:5,expires:g.age+14});events.push({type:'smoke',x:g.position.x,z:g.position.z});}
          else if(g.type==='flash'){for(const e of entities){const d=Math.hypot(e.position.x-g.position.x,e.position.z-g.position.z);if(d<25){const facing=e.facing||{x:0,z:1}, toward={x:g.position.x-e.position.x,z:g.position.z-e.position.z};const facingDot=(facing.x*toward.x+facing.z*toward.z)/(Math.hypot(toward.x,toward.z)||1);if(facingDot>0)e.blinded=Math.max(e.blinded||0,2.5*(1-d/25)*facingDot);}}events.push({type:'flash',x:g.position.x,z:g.position.z});}
          active.splice(i,1);
        }
      }
      for(let i=clouds.length-1;i>=0;i--)if(clouds[i].expires<=0)clouds.splice(i,1);else clouds[i].expires-=dt;
    },
    insideSmoke(point){return clouds.some(c=>Math.hypot(point.x-c.x,point.z-c.z)<c.radius);},
  };
}

export function insideSmoke(point, clouds){return clouds.some(c=>Math.hypot(point.x-c.x,point.z-c.z)<c.radius);}
export function hasLineOfSight(a,b,colliders){return !raycastSegment(a.x,a.z,b.x,b.z,colliders);}
