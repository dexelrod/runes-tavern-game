import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { AMBIENCE_TRACKS, AudioSystem, SOUND_LIBRARY } from '../dist/platform/audio.js';

const expectedSounds=[
  'cardPlay','cardPlaySoft','cardDraw','drawMultiple','shuffle','deckPutDown',
  'takiOpen','takiClose','colorChange','stopSkip','reverse','plusCard',
  'lastCard','winHand','loseHand'
];

test('custom sound library exposes every gameplay cue',()=>{
  assert.deepEqual(Object.keys(SOUND_LIBRARY),expectedSounds);
  assert.equal(AMBIENCE_TRACKS.length,4);
  assert.equal(new Set([...Object.values(SOUND_LIBRARY).map(sound=>sound.src),...AMBIENCE_TRACKS]).size,19);
});

test('every registered sound is a readable WAV asset',()=>{
  for(const url of [...Object.values(SOUND_LIBRARY).map(sound=>sound.src),...AMBIENCE_TRACKS]){
    const bytes=fs.readFileSync(fileURLToPath(url));
    assert.equal(bytes.subarray(0,4).toString(),'RIFF');
    assert.equal(bytes.subarray(8,12).toString(),'WAVE');
    assert.ok(bytes.length>44);
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
