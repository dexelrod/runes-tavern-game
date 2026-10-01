import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateHandLayout } from '../dist/ui/hand-layout.js';

// Phone portrait: 78px cards in a ~358px row.
for(const count of [1,3,5,7,10,15,20,26])test(`phone hand of ${count} keeps every card identifiable and reachable`,()=>{
  const cardWidth=78,available=358,layout=calculateHandLayout({count,cardWidth,available,compact:true});
  assert.equal(layout.tilt,0,'compact hands stay flat so taps land where the eye expects');
  if(count>1)assert.ok(layout.step>=29,`visible strip ${layout.step}px must keep the corner index readable and tappable`);
  if(count<=10){assert.equal(layout.browse,false,'up to ten cards fit without scrolling');assert.ok(layout.contentWidth<=available+0.01);}
  else{assert.equal(layout.browse,true,'larger hands scroll instead of shrinking cards');assert.ok(layout.contentWidth>available);}
});

test('roomy hands fan gently and never overlap below the readable strip',()=>{
  for(const count of [5,10,20,30]){
    const layout=calculateHandLayout({count,cardWidth:130,available:1500,compact:false});
    assert.ok(layout.step>=130*.42||layout.browse);
    assert.ok(layout.tilt*((count-1)/2)<=7.5,'outermost card turns at most ~7°');
  }
  const small=calculateHandLayout({count:4,cardWidth:120,available:1400,compact:false});
  assert.equal(small.overlap,12,'small hands are spaced, not overlapped');
});
