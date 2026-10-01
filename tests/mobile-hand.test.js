import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateHandLayout } from '../dist/ui/hand-layout.js';

for(const count of [1,2,5,8,10,12,15,20,25,30])test(`portrait hand keeps ${count} cards identifiable and reachable`,()=>{
  const layout=calculateHandLayout({count,cardWidth:86,available:366,portrait:true});
  if(count>1)assert.ok(layout.step>=46,'visible corner is too narrow');
  assert.equal(layout.scale,1,'portrait cards must not collapse as the hand grows');
  if(count>=8){assert.equal(layout.browse,true);assert.ok(layout.contentWidth>366,'large hand must overflow for browsing');}
  else{assert.equal(layout.browse,false);assert.ok(layout.contentWidth<=390,'small hand should remain a compact fan');}
});

test('desktop and tablet hands keep their existing measured fan behavior',()=>{
  const layout=calculateHandLayout({count:15,cardWidth:102,available:850,portrait:false});
  assert.equal(layout.browse,false);assert.equal(layout.scale,.93);assert.ok(layout.overlap<0);
});
