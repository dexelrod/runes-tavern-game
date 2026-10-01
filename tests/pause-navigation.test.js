import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const close=source.match(/^function closeSheet\(\).*$/m)[0];
for(const sheet of ['rules','settings'])test(`${sheet} opened during a game returns to pause and resumes only after closing pause`,()=>{
 const context={view:'game',sheet,resumed:0,render(){},resumeGameTimers(){this.resumed++},requestAnimationFrame(){},audioSystem:{stopAmbience(){},stopMusic(){}}};
 context.resumeGameTimers=()=>context.resumed++;
 vm.createContext(context);vm.runInContext(close+';closeSheet();',context);
 assert.equal(context.sheet,'pause');assert.equal(context.resumed,0);
 vm.runInContext('closeSheet();',context);
 assert.equal(context.sheet,null);assert.equal(context.resumed,1);
});
