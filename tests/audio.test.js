import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { AMBIENCE_TRACKS, AudioSystem, CARD_PLAY_VARIATIONS, MUSIC_TRACKS, SOUND_LIBRARY } from '../dist/platform/audio.js';

const expectedSounds=['cardPlay','cardPlayVariation1','cardPlayVariation2','cardPlayVariation3','cardPlayVariation4','cardPlayVariation5','cardPlaySoft','cardDraw','drawMultiple','shuffle','deckPutDown','takiOpen','takiClose','colorChange','stopSkip','kingPlay','quickstepPlay','reverse','plusCard','lastCard','winHand','loseHand','gorvanEntrance','gorvanPulse','gorvanAccent','gorvanCurse'];

class Param{constructor(value=1){this.value=value;}cancelScheduledValues(){}setTargetAtTime(value){this.value=value;}setValueAtTime(value){this.value=value;}linearRampToValueAtTime(value){this.value=value;}}
class Gain{constructor(){this.gain=new Param();}connect(){} }
class Source{constructor(){this.loop=false;this.playbackRate={value:1};this.started=false;this.stopped=false;this.onended=null;}connect(){}start(){this.started=true;}stop(){this.stopped=true;this.onended?.();}}
class Context{constructor(){this.destination={};this.currentTime=0;this.state='running';this.sources=[];}createGain(){return new Gain();}createBufferSource(){const source=new Source();this.sources.push(source);return source;}createBuffer(numberOfChannels,length,sampleRate){const data=Array.from({length:numberOfChannels},()=>new Float32Array(length));return{numberOfChannels,length,sampleRate,duration:length/sampleRate,getChannelData:channel=>data[channel],copyToChannel:(source,channel,offset)=>data[channel].set(source,offset)};}decodeAudioData(){const length=480;return Promise.resolve({duration:.01,length,numberOfChannels:2,sampleRate:48000,getChannelData:()=>new Float32Array(length)});}resume(){return Promise.resolve();}}
const withWebAudio=async callback=>{const Native=globalThis.AudioContext,nativeFetch=globalThis.fetch;globalThis.AudioContext=Context;globalThis.fetch=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)});try{return await callback();}finally{globalThis.AudioContext=Native;globalThis.fetch=nativeFetch;}};

test('custom sound library exposes every gameplay cue, five ambience loops and four soundtrack entries',()=>{assert.deepEqual(Object.keys(SOUND_LIBRARY),expectedSounds);assert.equal(AMBIENCE_TRACKS.length,5);assert.equal(MUSIC_TRACKS.length,4);assert.equal(CARD_PLAY_VARIATIONS.length,6);const musicFiles=MUSIC_TRACKS.flat();assert.equal(musicFiles.length,10);assert.equal(new Set([...Object.values(SOUND_LIBRARY).map(sound=>sound.src),...AMBIENCE_TRACKS,...musicFiles]).size,41);});

test('every registered sound is a readable audio asset',()=>{for(const url of [...Object.values(SOUND_LIBRARY).map(sound=>sound.src),...AMBIENCE_TRACKS,...MUSIC_TRACKS.flat()]){const bytes=fs.readFileSync(fileURLToPath(url));assert.ok(bytes.length>44);if(url.endsWith('.wav')){assert.equal(bytes.subarray(0,4).toString(),'RIFF');assert.equal(bytes.subarray(8,12).toString(),'WAVE');}else if(url.endsWith('.mp3')){assert.ok(bytes.subarray(0,3).toString()==='ID3'||(bytes[0]===0xff&&(bytes[1]&0xe0)===0xe0),url);}else{assert.ok(url.endsWith('.m4a'));assert.equal(bytes.subarray(4,8).toString(),'ftyp');}}});

test('all channels use Web Audio without constructing HTMLAudioElement',async()=>withWebAudio(async()=>{const system=new AudioSystem();system.prime();await system.playSfxBuffer('cardPlay',SOUND_LIBRARY.cardPlay,{volume:1,rate:1},new Set());await system.startMusic();await system.startAmbience();assert.ok(system.context instanceof Context);assert.equal(system.musicNode.source.started,true);assert.equal(system.musicNode.loop,true);assert.equal(system.ambienceNode.source.started,true);assert.equal(system.context.sources.length>=3,true);}));

test('card placement rotates variations and rapid duplicates are rejected',async()=>withWebAudio(async()=>{const random=Math.random;Math.random=()=>0;try{const system=new AudioSystem(),first=system.playCardPlacement(),firstName=system.lastCardPlayVariation,second=system.playCardPlacement(),secondName=system.lastCardPlayVariation,soft=system.playCardPlacement({soft:true});assert.ok(first&&second&&soft);assert.notEqual(firstName,secondName);const draw=system.play('cardDraw');assert.ok(draw);assert.equal(system.play('cardDraw'),null);system.setSettings({sound:false});assert.equal(system.play('cardPlay'),null);}finally{Math.random=random;}}));

test('music, ambience, sfx, and voice have independent gain channels',async()=>withWebAudio(async()=>{const system=new AudioSystem();system.setSettings({sound:true,music:true,ambience:true,sfxVolume:.5,musicVolume:.24,ambienceVolume:.1,voiceVolume:.7});system.prime();assert.equal(system.channelGains.sfx.gain.value,.5);assert.equal(system.channelGains.music.gain.value,.24);assert.equal(system.channelGains.ambience.gain.value,.1);assert.equal(system.channelGains.voice.gain.value,.7);await system.startMusic();system.setSettings({sound:true,music:false,ambience:true});assert.equal(system.channelGains.music.gain.value,0);assert.ok(system.play('cardPlay'));}));

test('new rounds rotate across the four-track roster and join chunked soundtracks into one Web Audio buffer',async()=>withWebAudio(async()=>{const random=Math.random;Math.random=()=>0;try{const system=new AudioSystem();system.musicIndex=0;await system.startMusic();const first=system.musicNode.track;await system.startMusic({newRound:true});assert.notEqual(system.musicNode.track,first);const chunked=new AudioSystem();chunked.musicIndex=2;await chunked.startMusic();assert.equal(Array.isArray(chunked.musicNode.track),true);assert.equal(chunked.musicNode.track.length,4);assert.equal(chunked.musicNode.buffer.duration,.04);system.stopAll();chunked.stopAll();assert.equal(system.musicNode,null);assert.equal(system.ambienceNode,null);}finally{Math.random=random;}}));

test('round rotation releases decoded music chunks and stale tracks',async()=>withWebAudio(async()=>{const random=Math.random,NativeTimeout=globalThis.setTimeout;Math.random=()=>0;globalThis.setTimeout=(fn)=>{queueMicrotask(fn);return 1;};try{const system=new AudioSystem();system.musicIndex=1;await system.startMusic();for(let round=0;round<5;round++)await system.startMusic({newRound:true});await Promise.resolve();const musicKeys=[...system.buffers.keys()].filter(key=>MUSIC_TRACKS.flat().includes(key)||key.startsWith('track:'));assert.equal(musicKeys.length,1);assert.equal(musicKeys[0],Array.isArray(system.musicNode.track)?`track:${system.musicNode.track.join('|')}`:system.musicNode.track);}finally{Math.random=random;globalThis.setTimeout=NativeTimeout;}}));

test('Bramm preloads only the requested locale through Web Audio',async()=>{
  const Native=globalThis.AudioContext,nativeFetch=globalThis.fetch,requested=[];globalThis.AudioContext=Context;globalThis.fetch=async url=>{requested.push(String(url));return{ok:true,arrayBuffer:async()=>new ArrayBuffer(8)};};
  try{const system=new AudioSystem();await system.preloadVoice('he',['bramm_intro_01','bramm_loss_01']);assert.equal(requested.length,2);assert.ok(requested.every(url=>url.endsWith('_he.mp3')));assert.ok(requested.every(url=>!url.endsWith('/bramm_intro_01.mp3')));}
  finally{globalThis.AudioContext=Native;globalThis.fetch=nativeFetch;}
});

test('a missing Hebrew Bramm file is excluded without requesting it or falling back to English',async()=>{
  const Native=globalThis.AudioContext,nativeFetch=globalThis.fetch,requested=[];globalThis.AudioContext=Context;globalThis.fetch=async url=>{requested.push(String(url));return{ok:false,arrayBuffer:async()=>new ArrayBuffer(0)};};
  try{const system=new AudioSystem();system.setSettings({sound:true,dialogue:true});assert.equal(await system.playVoice('bramm_win_05',{locale:'he'}),null);assert.deepEqual(requested,[]);}
  finally{globalThis.AudioContext=Native;globalThis.fetch=nativeFetch;}
});

test('Gorvan\'s presence cues are SFX, quieter than the card sounds they accompany, and never repeat quickly',()=>{
  for(const name of ['gorvanEntrance','gorvanPulse','gorvanAccent','gorvanCurse']){const sound=SOUND_LIBRARY[name];assert.equal(sound.channel,'sfx',`${name} belongs under SFX, not voice`);assert.equal(sound.maxVoices,1);assert.ok(sound.cooldown>=3500,`${name} cannot stack`);assert.match(sound.src,/assets\/gorvan\/sfx\/gorvan_sfx_/);}
  assert.ok(SOUND_LIBRARY.gorvanCurse.volume<SOUND_LIBRARY.plusCard.volume,'his Curse layers under the ordinary Curse sound');
  assert.ok(SOUND_LIBRARY.gorvanPulse.volume<.5&&SOUND_LIBRARY.gorvanEntrance.volume<=.5);
  // The filename the owner asked to keep.
  assert.match(SOUND_LIBRARY.gorvanAccent.src,/gorvan_sfx_brutal_card_accent\.mp3$/);
});
