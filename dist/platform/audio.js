import { BRAMM_VOICE_LIBRARY, normalizeBrammLocale, resolveBrammVoice } from '../duel/bramm.js';

const asset=name=>new URL(`../assets/audio/${name}`,import.meta.url).href;
const clamp=value=>Math.max(0,Math.min(1,value));

export const SOUND_LIBRARY=Object.freeze({
  cardPlay:{src:asset('card-play.wav'),channel:'sfx',volume:.58,cooldown:55,maxVoices:3,rateJitter:.018,volumeJitter:.035},
  cardPlayVariation1:{src:asset('card-play-variation-1.wav'),channel:'sfx',volume:.58,cooldown:45,maxVoices:3,rateJitter:.014,volumeJitter:.025},
  cardPlayVariation2:{src:asset('card-play-variation-2.wav'),channel:'sfx',volume:.58,cooldown:45,maxVoices:3,rateJitter:.014,volumeJitter:.025},
  cardPlayVariation3:{src:asset('card-play-variation-3.wav'),channel:'sfx',volume:.58,cooldown:45,maxVoices:3,rateJitter:.014,volumeJitter:.025},
  cardPlayVariation4:{src:asset('card-play-variation-4.wav'),channel:'sfx',volume:.58,cooldown:45,maxVoices:3,rateJitter:.014,volumeJitter:.025},
  cardPlayVariation5:{src:asset('card-play-variation-5.wav'),channel:'sfx',volume:.58,cooldown:45,maxVoices:3,rateJitter:.014,volumeJitter:.025},
  cardPlaySoft:{src:asset('card-play-soft.wav'),channel:'sfx',volume:.48,cooldown:45,maxVoices:3,rateJitter:.022,volumeJitter:.04},
  cardDraw:{src:asset('card-draw.wav'),channel:'sfx',volume:.68,cooldown:80,maxVoices:2,rateJitter:.014,volumeJitter:.025},
  drawMultiple:{src:asset('draw-multiple-cards.wav'),channel:'sfx',volume:.72,cooldown:500,maxVoices:1},
  shuffle:{src:asset('shuffle.wav'),channel:'sfx',volume:.58,cooldown:900,maxVoices:1},
  deckPutDown:{src:asset('deck-put-down.wav'),channel:'sfx',volume:.7,cooldown:500,maxVoices:1},
  takiOpen:{src:asset('crossbow-open.wav'),channel:'sfx',volume:.78,cooldown:180,maxVoices:1},
  takiClose:{src:asset('crossbow-close.wav'),channel:'sfx',volume:.74,cooldown:180,maxVoices:1},
  colorChange:{src:asset('color-change.wav'),channel:'sfx',volume:.7,cooldown:220,maxVoices:1},
  stopSkip:{src:asset('stop-skip.wav'),channel:'sfx',volume:.68,cooldown:220,maxVoices:1},
  kingPlay:{src:asset('king-play.wav'),channel:'sfx',volume:.66,cooldown:220,maxVoices:1},
  quickstepPlay:{src:asset('quickstep-play.wav'),channel:'sfx',volume:.64,cooldown:220,maxVoices:1},
  reverse:{src:asset('reverse.wav'),channel:'sfx',volume:.7,cooldown:220,maxVoices:1},
  plusCard:{src:asset('plus-card.wav'),channel:'sfx',volume:.72,cooldown:220,maxVoices:1},
  lastCard:{src:asset('last-card.wav'),channel:'sfx',volume:.72,cooldown:550,maxVoices:1},
  winHand:{src:asset('win-hand.wav'),channel:'sfx',volume:.82,cooldown:1800,maxVoices:1},
  loseHand:{src:asset('lose-hand.wav'),channel:'sfx',volume:.78,cooldown:1800,maxVoices:1}
});

export const CARD_PLAY_VARIATIONS=Object.freeze(['cardPlay','cardPlayVariation1','cardPlayVariation2','cardPlayVariation3','cardPlayVariation4','cardPlayVariation5']);
export const AMBIENCE_TRACKS=Object.freeze(['tavern-loop-1.wav','tavern-loop-2.wav','tavern-loop-3.wav','tavern-loop-4.wav','tavern-loop-5.wav'].map(asset));
const chunkedTrack=stem=>Object.freeze([1,2,3,4].map(part=>asset(`${stem}-part-${part}.wav`)));
export const MUSIC_TRACKS=Object.freeze([asset('runes-round.wav'),asset('gambit-by-the-hearth.m4a'),chunkedTrack('soundtrack-3'),chunkedTrack('soundtrack-4')]);
const CHANNEL_DEFAULTS={sfx:.9,ambience:.18,music:.14,voice:.92};
const VOICE_PRIORITY=Object.freeze({LOW:1,MEDIUM:2,CRITICAL:3});

export class AudioSystem{
  constructor(){
    this.enabled=true;this.channelEnabled={sfx:true,ambience:true,music:true,voice:true};this.channels={...CHANNEL_DEFAULTS};
    this.context=null;this.channelGains={};this.buffers=new Map();this.loads=new Map();this.activeSfx=new Map();this.lastPlayed=new Map();this.lastCardPlayVariation=null;this.timers=new Set();
    this.ambienceNode=null;this.ambienceRequest=0;this.ambienceIndex=Math.floor(Math.random()*AMBIENCE_TRACKS.length);
    this.musicNode=null;this.musicRequest=0;this.musicIndex=Math.floor(Math.random()*MUSIC_TRACKS.length);
    this.voiceSource=null;this.voicePriority=0;this.voiceLocked=false;this.voiceRequest=0;this.voiceOnEnded=null;
  }
  setSettings(settings={}){
    this.channelEnabled.sfx=settings.sound!==false;this.channelEnabled.ambience=settings.ambience!==false;this.channelEnabled.music=settings.music!==false;this.channelEnabled.voice=settings.sound!==false&&settings.dialogue!==false;
    this.enabled=Object.values(this.channelEnabled).some(Boolean);
    this.channels.sfx=Number.isFinite(settings.sfxVolume)?clamp(settings.sfxVolume):CHANNEL_DEFAULTS.sfx;
    this.channels.ambience=Number.isFinite(settings.ambienceVolume)?clamp(settings.ambienceVolume):CHANNEL_DEFAULTS.ambience;
    this.channels.music=Number.isFinite(settings.musicVolume)?clamp(settings.musicVolume):CHANNEL_DEFAULTS.music;
    this.channels.voice=Number.isFinite(settings.voiceVolume)?clamp(settings.voiceVolume):CHANNEL_DEFAULTS.voice;
    this.applyChannelLevels();if(!this.channelEnabled.ambience||this.channels.ambience<=0)this.stopAmbience();if(!this.channelEnabled.music||this.channels.music<=0)this.stopMusic();if(!this.channelEnabled.voice||this.channels.voice<=0)this.stopVoice();
  }
  ensureContext(){
    if(this.context){if(this.context.state==='suspended')void this.context.resume?.().catch?.(()=>{});return this.context;}
    const Context=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Context)return null;
    try{this.context=new Context({latencyHint:'interactive'});for(const name of Object.keys(CHANNEL_DEFAULTS)){const gain=this.context.createGain();gain.gain.value=this.channels[name];gain.connect(this.context.destination);this.channelGains[name]=gain;}return this.context;}catch{return null;}
  }
  applyChannelLevels(){const context=this.context;if(!context)return;for(const [name,gain] of Object.entries(this.channelGains)){const target=this.channelEnabled[name]?this.channels[name]:0;gain.gain.cancelScheduledValues?.(context.currentTime);if(gain.gain.setTargetAtTime)gain.gain.setTargetAtTime(target,context.currentTime,.04);else gain.gain.value=target;}}
  prime(){const context=this.ensureContext();if(!context)return;void Promise.allSettled(Object.values(SOUND_LIBRARY).map(sound=>this.load(sound.src)));}
  async load(url){
    if(this.buffers.has(url))return this.buffers.get(url);if(this.loads.has(url))return this.loads.get(url);const context=this.ensureContext();if(!context||typeof fetch==='undefined')return null;
    const request=fetch(url).then(response=>{if(!response.ok)throw new Error(`Audio asset unavailable: ${url}`);return response.arrayBuffer();}).then(data=>context.decodeAudioData(data)).then(buffer=>{this.buffers.set(url,buffer);this.loads.delete(url);return buffer;}).catch(()=>{this.loads.delete(url);return null;});this.loads.set(url,request);return request;
  }
  async loadTrack(track){
    if(!Array.isArray(track))return this.load(track);const key=`track:${track.join('|')}`;if(this.buffers.has(key))return this.buffers.get(key);if(this.loads.has(key))return this.loads.get(key);
    const context=this.ensureContext();if(!context)return null;const request=Promise.all(track.map(url=>this.load(url))).then(parts=>{if(parts.some(part=>!part))return null;const channels=Math.max(...parts.map(part=>part.numberOfChannels||1)),sampleRate=parts[0].sampleRate||48000,length=parts.reduce((sum,part)=>sum+(part.length||Math.round((part.duration||0)*sampleRate)),0),joined=context.createBuffer(channels,length,sampleRate);let offset=0;for(const part of parts){const partLength=part.length||Math.round((part.duration||0)*sampleRate);for(let channel=0;channel<channels;channel++){const source=part.getChannelData?.(Math.min(channel,(part.numberOfChannels||1)-1));if(source)joined.copyToChannel(source,channel,offset);}offset+=partLength;}this.buffers.set(key,joined);for(const url of track)this.buffers.delete(url);this.loads.delete(key);return joined;}).catch(()=>{this.loads.delete(key);return null;});this.loads.set(key,request);return request;
  }
  releaseTrack(track){if(!track)return;if(Array.isArray(track)){this.buffers.delete(`track:${track.join('|')}`);for(const url of track)this.buffers.delete(url);}else this.buffers.delete(track);}
  async loadVoice(name,locale='en'){
    const definition=resolveBrammVoice(name,locale);if(!definition)return null;
    const buffer=await this.load(definition.src);
    if(!buffer&&definition.locale==='he'&&['localhost','127.0.0.1'].includes(globalThis.location?.hostname))console.warn('[Bramm] Missing Hebrew voice asset; keeping the Hebrew caption without audio.',name);
    return buffer;
  }
  preloadVoice(locale='en',names=Object.keys(BRAMM_VOICE_LIBRARY)){const resolved=normalizeBrammLocale(locale);return Promise.allSettled(names.map(name=>this.loadVoice(name,resolved)));}
  makeSource(buffer,channel,{volume=1,rate=1,loop=false}={}){const context=this.ensureContext(),channelGain=this.channelGains[channel];if(!context||!channelGain)return null;const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;source.loop=loop;source.playbackRate.value=rate;gain.gain.value=clamp(volume);source.connect(gain);gain.connect(channelGain);return {source,gain,buffer,channel,loop,stopped:false,paused:false};}
  async playVoice(name,{priority='LOW',volume=1,onEnded=null,locked=false,locale='en'}={}){
    if(!this.enabled||!this.channelEnabled.voice||this.channels.voice<=0)return null;const rank=VOICE_PRIORITY[priority]||VOICE_PRIORITY.LOW;if(this.voiceSource&&(this.voiceLocked||rank<this.voicePriority))return null;
    const request=++this.voiceRequest,buffer=await this.loadVoice(name,locale);if(!buffer||request!==this.voiceRequest||!this.channelEnabled.voice)return null;if(this.voiceSource)this.stopVoice({restoreMusic:false});const node=this.makeSource(buffer,'voice',{volume});if(!node)return null;
    this.voiceSource=node;this.voicePriority=rank;this.voiceLocked=locked;this.voiceOnEnded=onEnded;this.duckMusic(.79,110);
    node.source.onended=()=>{if(this.voiceSource!==node)return;this.voiceSource=null;this.voicePriority=0;this.voiceLocked=false;const callback=this.voiceOnEnded;this.voiceOnEnded=null;this.duckMusic(1,260);callback?.(buffer.duration||0);};try{node.source.start(0);return {...node,duration:buffer.duration||0};}catch{this.voiceSource=null;this.voicePriority=0;this.voiceLocked=false;return null;}
  }
  stopVoice({restoreMusic=true}={}){this.voiceRequest++;const node=this.voiceSource;this.voiceSource=null;this.voicePriority=0;this.voiceLocked=false;this.voiceOnEnded=null;if(node){node.stopped=true;try{node.source.onended=null;node.source.stop(0);}catch{}}if(restoreMusic)this.duckMusic(1,180);}
  play(name,{delay=0,volume=1,rate=1}={}){
    if(delay>0){const timer=setTimeout(()=>{this.timers.delete(timer);void this.play(name,{volume,rate});},delay);this.timers.add(timer);return timer;}const definition=SOUND_LIBRARY[name];if(!definition||!this.enabled||!this.channelEnabled.sfx)return null;
    const stamp=globalThis.performance?.now?.()??Date.now(),last=this.lastPlayed.get(name)||-Infinity;if(stamp-last<(definition.cooldown||0))return null;const active=this.activeSfx.get(name)||new Set();for(const node of [...active])if(node.stopped)active.delete(node);if(active.size>=(definition.maxVoices||1))return null;
    this.lastPlayed.set(name,stamp);void this.playSfxBuffer(name,definition,{volume,rate},active);return {name,pending:true};
  }
  async playSfxBuffer(name,definition,{volume,rate},active){const buffer=await this.load(definition.src);if(!buffer||!this.channelEnabled.sfx)return null;const jitter=(amount=0)=>1+(Math.random()*2-1)*amount,node=this.makeSource(buffer,'sfx',{volume:definition.volume*volume*jitter(definition.volumeJitter),rate:Math.max(.75,Math.min(1.25,rate*jitter(definition.rateJitter)))});if(!node)return null;active.add(node);this.activeSfx.set(name,active);node.source.onended=()=>{node.stopped=true;active.delete(node);};try{node.source.start(0);return node;}catch{node.stopped=true;active.delete(node);return null;}}
  playCardPlacement({soft=false,delay=0,volume=1,rate=1}={}){if(soft)return this.play('cardPlaySoft',{delay,volume,rate});const choices=CARD_PLAY_VARIATIONS.filter(name=>name!==this.lastCardPlayVariation),name=choices[Math.floor(Math.random()*choices.length)];this.lastCardPlayVariation=name;return this.play(name,{delay,volume,rate});}
  async startLoop(track,channel,request){const buffer=await this.loadTrack(track);if(!buffer||request!==(channel==='music'?this.musicRequest:this.ambienceRequest)||!this.channelEnabled[channel])return null;const node=this.makeSource(buffer,channel,{volume:0,loop:true});if(!node)return null;node.track=track;node.url=Array.isArray(track)?track.join('|'):track;try{node.source.start(0);}catch{return null;}this.fadeNode(node,1,channel==='music'?1800:1500);return node;}
  async startAmbience(){if(!this.enabled||!this.channelEnabled.ambience||this.channels.ambience<=0)return null;if(this.ambienceNode&&!this.ambienceNode.stopped){this.fadeNode(this.ambienceNode,1,700);return this.ambienceNode;}const request=++this.ambienceRequest,node=await this.startLoop(AMBIENCE_TRACKS[this.ambienceIndex],'ambience',request);if(request===this.ambienceRequest)this.ambienceNode=node;return node;}
  fadeNode(node,target,duration,onDone){if(!node||node.stopped)return;const context=this.ensureContext(),param=node.gain.gain;if(!context)return;param.cancelScheduledValues?.(context.currentTime);param.setValueAtTime?.(param.value,context.currentTime);param.linearRampToValueAtTime?.(clamp(target),context.currentTime+duration/1000);if(onDone){const timer=setTimeout(()=>{this.timers.delete(timer);if(!node.stopped)onDone();},duration+25);this.timers.add(timer);}}
  fadeAmbience(target,duration,onDone){this.fadeNode(this.ambienceNode,target,duration,onDone);}
  stopNode(node){if(!node||node.stopped)return;node.stopped=true;node.paused=true;try{node.source.onended=null;node.source.stop(0);}catch{}}
  stopAmbience(){this.ambienceRequest++;const node=this.ambienceNode;this.ambienceNode=null;if(node)this.fadeNode(node,0,900,()=>this.stopNode(node));}
  async startMusic({newRound=false}={}){if(!this.enabled||!this.channelEnabled.music||this.channels.music<=0)return null;if(this.musicNode&&!newRound&&!this.musicNode.stopped){this.fadeNode(this.musicNode,1,600);return this.musicNode;}const previous=this.musicNode,request=++this.musicRequest;if(newRound)this.musicIndex=(this.musicIndex+1+Math.floor(Math.random()*(MUSIC_TRACKS.length-1)))%MUSIC_TRACKS.length;if(previous){this.musicNode=null;this.fadeNode(previous,0,450,()=>{this.stopNode(previous);this.releaseTrack(previous.track);});}const node=await this.startLoop(MUSIC_TRACKS[this.musicIndex],'music',request);if(request===this.musicRequest)this.musicNode=node;else this.releaseTrack(node?.track);return node;}
  fadeMusic(target,duration,onDone){this.fadeNode(this.musicNode,target,duration,onDone);}
  duckMusic(multiplier,duration){if(this.musicNode&&!this.musicNode.stopped)this.fadeNode(this.musicNode,multiplier,duration);}
  stopMusic(reset=false){void reset;this.musicRequest++;const node=this.musicNode;if(!node)return;this.fadeNode(node,0,900,()=>this.stopNode(node));}
  stopAll(){for(const timer of this.timers)clearTimeout(timer);this.timers.clear();for(const active of this.activeSfx.values())for(const node of active)this.stopNode(node);this.activeSfx.clear();this.stopNode(this.ambienceNode);this.ambienceNode=null;this.stopNode(this.musicNode);this.musicNode=null;this.stopVoice({restoreMusic:false});}
}

export const audioSystem=new AudioSystem();
