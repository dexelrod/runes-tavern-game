import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { AMBIENCE_TRACKS, AudioSystem, CARD_PLAY_VARIATIONS, MUSIC_TRACKS, SOUND_LIBRARY } from '../dist/platform/audio.js';

const expectedSounds=[
  'cardPlay','cardPlayVariation1','cardPlayVariation2','cardPlayVariation3','cardPlayVariation4','cardPlayVariation5','cardPlaySoft','cardDraw','drawMultiple','shuffle','deckPutDown',
  'takiOpen','takiClose','colorChange','stopSkip','reverse','plusCard',
  'lastCard','winHand','loseHand'
];

test('custom sound library exposes every gameplay cue',()=>{
  assert.deepEqual(Object.keys(SOUND_LIBRARY),expectedSounds);
  assert.equal(AMBIENCE_TRACKS.length,4);
  assert.equal(MUSIC_TRACKS.length,2);
  assert.equal(CARD_PLAY_VARIATIONS.length,6);
  assert.equal(new Set([...Object.values(SOUND_LIBRARY).map(sound=>sound.src),...AMBIENCE_TRACKS,...MUSIC_TRACKS]).size,26);
});

test('card placement rotates physical variations without immediate repeats and preserves soft play',()=>{
  const NativeAudio=globalThis.Audio,random=Math.random;
  globalThis.Audio=class{
    constructor(src){this.src=src;this.paused=true;this.ended=false;this.currentTime=0;this.volume=1;this.playbackRate=1;}
    play(){this.paused=false;return Promise.resolve();}
    pause(){this.paused=true;}
  };
  Math.random=()=>0;
  try{
    const system=new AudioSystem();
    const first=system.playCardPlacement(),second=system.playCardPlacement(),soft=system.playCardPlacement({soft:true});
    assert.ok(first&&second&&soft);
    assert.notEqual(first.src,second.src);
    assert.equal(soft.src,SOUND_LIBRARY.cardPlaySoft.src);
  }finally{globalThis.Audio=NativeAudio;Math.random=random;}
});

test('every registered sound is a readable audio asset',()=>{
  for(const url of [...Object.values(SOUND_LIBRARY).map(sound=>sound.src),...AMBIENCE_TRACKS,...MUSIC_TRACKS]){
    const bytes=fs.readFileSync(fileURLToPath(url));
    assert.ok(bytes.length>44);
    if(url.endsWith('.wav')){assert.equal(bytes.subarray(0,4).toString(),'RIFF');assert.equal(bytes.subarray(8,12).toString(),'WAVE');}
    else{assert.ok(url.endsWith('.m4a'));assert.equal(bytes.subarray(4,8).toString(),'ftyp');}
  }
});

test('audio system applies channel volume and rejects accidental rapid duplicates',()=>{
  const NativeAudio=globalThis.Audio;
  globalThis.Audio=class{
    constructor(src){this.src=src;this.paused=true;this.ended=false;this.currentTime=0;this.volume=1;this.playbackRate=1;}
    play(){this.paused=false;return Promise.resolve();}
    pause(){this.paused=true;}
  };
  try{
    const system=new AudioSystem();system.setSettings({sound:true,sfxVolume:.5,ambienceVolume:.1,musicVolume:.4});
    const first=system.play('cardDraw');
    assert.ok(first);
    assert.ok(first.volume<=.35&&first.volume>=.32);
    assert.equal(system.play('cardDraw'),null);
    system.setSettings({sound:false});
    assert.equal(system.play('cardPlay'),null);
  }finally{globalThis.Audio=NativeAudio;}
});

test('round soundtrack loops on the music channel and can be stopped independently',()=>{
  const NativeAudio=globalThis.Audio,raf=globalThis.requestAnimationFrame,caf=globalThis.cancelAnimationFrame,random=Math.random;
  globalThis.Audio=class{
    constructor(src){this.src=src;this.paused=true;this.ended=false;this.currentTime=0;this.volume=1;this.loop=false;}
    play(){this.paused=false;return Promise.resolve();}
    pause(){this.paused=true;}
  };
  globalThis.requestAnimationFrame=callback=>{callback(performance.now()+5000);return 1;};
  globalThis.cancelAnimationFrame=()=>{};
  Math.random=()=>.99;
  try{
    const system=new AudioSystem();system.setSettings({sound:true,musicVolume:.24});
    system.startMusic({newRound:true});
    assert.equal(system.musicNode.src,MUSIC_TRACKS[1]);
    assert.equal(system.musicNode.loop,true);
    assert.equal(system.musicNode.paused,false);
    assert.equal(system.musicNode.volume,.14);
    system.stopMusic();
    assert.equal(system.musicNode.paused,true);
  }finally{
    globalThis.Audio=NativeAudio;
    globalThis.requestAnimationFrame=raf;
    globalThis.cancelAnimationFrame=caf;
    Math.random=random;
  }
});
