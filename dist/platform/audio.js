const asset=name=>new URL(`../assets/audio/${name}`,import.meta.url).href;

export const SOUND_LIBRARY=Object.freeze({
  cardPlay:{src:asset('card-play.wav'),channel:'sfx',volume:.58,cooldown:55,maxVoices:3,rateJitter:.018,volumeJitter:.035},
  cardPlaySoft:{src:asset('card-play-soft.wav'),channel:'sfx',volume:.48,cooldown:45,maxVoices:3,rateJitter:.022,volumeJitter:.04},
  cardDraw:{src:asset('card-draw.wav'),channel:'sfx',volume:.68,cooldown:80,maxVoices:2,rateJitter:.014,volumeJitter:.025},
  drawMultiple:{src:asset('draw-multiple-cards.wav'),channel:'sfx',volume:.72,cooldown:500,maxVoices:1},
  shuffle:{src:asset('shuffle.wav'),channel:'sfx',volume:.58,cooldown:900,maxVoices:1},
  deckPutDown:{src:asset('deck-put-down.wav'),channel:'sfx',volume:.7,cooldown:500,maxVoices:1},
  takiOpen:{src:asset('taki-open.wav'),channel:'sfx',volume:.78,cooldown:180,maxVoices:1},
  takiClose:{src:asset('taki-close.wav'),channel:'sfx',volume:.74,cooldown:180,maxVoices:1},
  colorChange:{src:asset('color-change.wav'),channel:'sfx',volume:.7,cooldown:220,maxVoices:1},
  stopSkip:{src:asset('stop-skip.wav'),channel:'sfx',volume:.68,cooldown:220,maxVoices:1},
  reverse:{src:asset('reverse.wav'),channel:'sfx',volume:.7,cooldown:220,maxVoices:1},
  plusCard:{src:asset('plus-card.wav'),channel:'sfx',volume:.72,cooldown:220,maxVoices:1},
  lastCard:{src:asset('last-card.wav'),channel:'sfx',volume:.72,cooldown:550,maxVoices:1},
  winHand:{src:asset('win-hand.wav'),channel:'sfx',volume:.82,cooldown:1800,maxVoices:1},
  loseHand:{src:asset('lose-hand.wav'),channel:'sfx',volume:.78,cooldown:1800,maxVoices:1}
});

export const AMBIENCE_TRACKS=Object.freeze(['tavern-loop-1.wav','tavern-loop-2.wav','tavern-loop-3.wav','tavern-loop-4.wav'].map(asset));
export const MUSIC_TRACK=asset('elder-taki-round.wav');
const CHANNEL_DEFAULTS={sfx:.9,ambience:.18,music:.14};

export class AudioSystem{
  constructor(){
    this.enabled=true;
    this.channels={...CHANNEL_DEFAULTS};
    this.pools=new Map();
    this.lastPlayed=new Map();
    this.timers=new Set();
    this.ambienceNode=null;
    this.ambienceFrame=0;
    this.ambienceIndex=Math.floor(Math.random()*AMBIENCE_TRACKS.length);
    this.musicNode=null;
    this.musicFrame=0;
  }
  setSettings(settings={}){
    this.enabled=settings.sound!==false;
    this.channels.sfx=Number.isFinite(settings.sfxVolume)?Math.max(0,Math.min(1,settings.sfxVolume)):CHANNEL_DEFAULTS.sfx;
    this.channels.ambience=Number.isFinite(settings.ambienceVolume)?Math.max(0,Math.min(1,settings.ambienceVolume)):CHANNEL_DEFAULTS.ambience;
    const requestedMusic=Number.isFinite(settings.musicVolume)?Math.max(0,settings.musicVolume):CHANNEL_DEFAULTS.music;
    this.channels.music=Math.min(CHANNEL_DEFAULTS.music,requestedMusic);
    if(!this.enabled){this.stopAmbience();this.stopMusic();}
    else{
      if(this.ambienceNode&&!this.ambienceNode.paused)this.fadeAmbience(this.channels.ambience,350);
      if(this.musicNode&&!this.musicNode.paused)this.fadeMusic(this.channels.music,350);
    }
  }
  prime(){
    if(typeof Audio==='undefined')return;
    for(const [name,definition] of Object.entries(SOUND_LIBRARY)){
      if(this.pools.has(name))continue;
      const node=new Audio(definition.src);node.preload='auto';this.pools.set(name,[node]);
    }
    if(!this.musicNode){this.musicNode=new Audio(MUSIC_TRACK);this.musicNode.loop=true;this.musicNode.preload='auto';}
  }
  play(name,{delay=0,volume=1,rate=1}={}){
    if(delay>0){
      const timer=setTimeout(()=>{this.timers.delete(timer);this.play(name,{volume,rate});},delay);
      this.timers.add(timer);return timer;
    }
    const definition=SOUND_LIBRARY[name];
    if(!definition||!this.enabled||typeof Audio==='undefined')return null;
    const now=performance.now(),last=this.lastPlayed.get(name)||-Infinity;
    if(now-last<(definition.cooldown||0))return null;
    const pool=this.pools.get(name)||[],active=pool.filter(node=>!node.paused&&!node.ended);
    if(active.length>=(definition.maxVoices||1))return null;
    let node=pool.find(item=>item.paused||item.ended);
    if(!node){node=new Audio(definition.src);node.preload='auto';pool.push(node);this.pools.set(name,pool);}
    const jitter=(amount=0)=>1+(Math.random()*2-1)*amount;
    node.currentTime=0;
    node.playbackRate=Math.max(.75,Math.min(1.25,rate*jitter(definition.rateJitter)));
    node.volume=Math.max(0,Math.min(1,definition.volume*volume*jitter(definition.volumeJitter)*this.channels[definition.channel]));
    this.lastPlayed.set(name,now);
    const promise=node.play();if(promise?.catch)promise.catch(()=>{});
    return node;
  }
  startAmbience(){
    if(!this.enabled||this.channels.ambience<=0||typeof Audio==='undefined')return;
    if(this.ambienceNode&&!this.ambienceNode.paused){this.fadeAmbience(this.channels.ambience,700);return;}
    if(!this.ambienceNode){
      this.ambienceNode=new Audio(AMBIENCE_TRACKS[this.ambienceIndex]);
      this.ambienceNode.loop=true;this.ambienceNode.preload='auto';
    }
    this.ambienceNode.volume=0;
    const promise=this.ambienceNode.play();if(promise?.catch)promise.catch(()=>{});
    this.fadeAmbience(this.channels.ambience,1500);
  }
  fadeAmbience(target,duration,onDone){
    cancelAnimationFrame(this.ambienceFrame);
    const node=this.ambienceNode;if(!node)return;
    const from=node.volume,start=performance.now();
    const tick=now=>{
      const progress=Math.min(1,(now-start)/duration);
      node.volume=Math.max(0,Math.min(1,from+(target-from)*(1-Math.pow(1-progress,3))));
      if(progress<1)this.ambienceFrame=requestAnimationFrame(tick);else onDone?.();
    };
    this.ambienceFrame=requestAnimationFrame(tick);
  }
  stopAmbience(){
    const node=this.ambienceNode;if(!node)return;
    this.fadeAmbience(0,900,()=>{node.pause();node.currentTime=0;this.ambienceNode=null;});
  }
  startMusic(){
    if(!this.enabled||this.channels.music<=0||typeof Audio==='undefined')return;
    if(!this.musicNode){this.musicNode=new Audio(MUSIC_TRACK);this.musicNode.loop=true;this.musicNode.preload='auto';}
    if(!this.musicNode.paused){this.fadeMusic(this.channels.music,600);return;}
    this.musicNode.volume=0;
    const promise=this.musicNode.play();if(promise?.catch)promise.catch(()=>{});
    this.fadeMusic(this.channels.music,1800);
  }
  fadeMusic(target,duration,onDone){
    cancelAnimationFrame(this.musicFrame);
    const node=this.musicNode;if(!node)return;
    const from=node.volume,start=performance.now();
    const tick=now=>{
      const progress=Math.min(1,(now-start)/duration);
      node.volume=Math.max(0,Math.min(1,from+(target-from)*(1-Math.pow(1-progress,3))));
      if(progress<1)this.musicFrame=requestAnimationFrame(tick);else onDone?.();
    };
    this.musicFrame=requestAnimationFrame(tick);
  }
  stopMusic(reset=false){
    const node=this.musicNode;if(!node)return;
    this.fadeMusic(0,900,()=>{node.pause();if(reset)node.currentTime=0;});
  }
  stopAll(){
    for(const timer of this.timers)clearTimeout(timer);this.timers.clear();
    for(const pool of this.pools.values())for(const node of pool){node.pause();node.currentTime=0;}
    cancelAnimationFrame(this.ambienceFrame);cancelAnimationFrame(this.musicFrame);
    if(this.ambienceNode){this.ambienceNode.pause();this.ambienceNode.currentTime=0;this.ambienceNode=null;}
    if(this.musicNode){this.musicNode.pause();this.musicNode.currentTime=0;}
  }
}

export const audioSystem=new AudioSystem();
