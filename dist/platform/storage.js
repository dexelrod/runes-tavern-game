const SETTINGS='taki-pocket-settings'; const MATCH='taki-pocket-match';
export const defaults={playerCount:3,difficulty:'normal',sound:true,ambience:true,dialogue:true,captions:false,haptics:true,reducedMotion:false,playableHints:true,tutorial:true,duelOpponent:'ron',duelRecords:{}};
export function loadSettings(){ try{return {...defaults,...JSON.parse(localStorage.getItem(SETTINGS)||'{}')};}catch{return {...defaults};} }
export function saveSettings(value){localStorage.setItem(SETTINGS,JSON.stringify(value));}
export function saveMatch(state){localStorage.setItem(MATCH,JSON.stringify(state));}
export function loadMatch(){try{return JSON.parse(localStorage.getItem(MATCH)||'null');}catch{return null;}}
export function clearMatch(){localStorage.removeItem(MATCH);}
function tone(context,frequency,start,duration,gain=.018,type='triangle'){
  const oscillator=context.createOscillator(),volume=context.createGain();oscillator.type=type;oscillator.frequency.setValueAtTime(frequency,start);volume.gain.setValueAtTime(gain,start);volume.gain.exponentialRampToValueAtTime(.0001,start+duration);oscillator.connect(volume);volume.connect(context.destination);oscillator.start(start);oscillator.stop(start+duration);
}
function noise(context,start,duration,gain=.012,cutoff=950){
  const frames=Math.ceil(context.sampleRate*duration),buffer=context.createBuffer(1,frames,context.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<frames;i++)data[i]=(Math.random()*2-1)*(1-i/frames);const source=context.createBufferSource(),filter=context.createBiquadFilter(),volume=context.createGain();source.buffer=buffer;filter.type='lowpass';filter.frequency.value=cutoff;volume.gain.setValueAtTime(gain,start);volume.gain.exponentialRampToValueAtTime(.0001,start+duration);source.connect(filter);filter.connect(volume);volume.connect(context.destination);source.start(start);
}
const vibrationPatterns={special:[16,22,24],invalid:[7,26,7],clack:[20,18,9],thunk:[18],flick:[5],precise:[6],measured:[7],quiet:[5],takiOpen:[16,24,12],stop:[22,30,12],reverse:[9,18,12],penalty:[12,26,12],king:[20,24,14],round:[10,26,12,38,16],coin:[8,32,8],draw:[7],play:[7]};
export function triggerHaptic(kind,enabled,navigatorRef=globalThis.navigator){
  if(!enabled||typeof navigatorRef?.vibrate!=='function')return false;
  try{return navigatorRef.vibrate.call(navigatorRef,vibrationPatterns[kind]||7)!==false;}catch{return false;}
}
export function feedback(kind,settings){
  triggerHaptic(kind,settings.haptics);
  if(!settings.sound)return;
  try{const context=new AudioContext(),now=context.currentTime;if(kind==='play'){noise(context,now,.075,.018,720);tone(context,150,now,.07,.012);}else if(kind==='flick'){noise(context,now,.045,.012,1650);tone(context,260,now,.045,.008);}else if(kind==='thunk'){noise(context,now,.09,.026,390);tone(context,74,now,.13,.022,'square');}else if(kind==='precise'){noise(context,now,.055,.014,920);tone(context,185,now,.045,.009);}else if(kind==='measured'||kind==='quiet'){noise(context,now,.07,.01,620);tone(context,128,now,.07,.008);}else if(kind==='draw'){noise(context,now,.14,.015,1250);tone(context,210,now+.02,.06,.008);}else if(kind==='clack'){noise(context,now,.055,.026,480);tone(context,82,now,.14,.027,'square');tone(context,540,now+.018,.035,.01);}else if(kind==='takiOpen'){noise(context,now,.07,.022,700);tone(context,330,now,.08,.012);tone(context,495,now+.035,.07,.008);}else if(kind==='stop'){noise(context,now,.09,.03,560);tone(context,78,now,.17,.024,'square');tone(context,116,now+.025,.11,.014);}else if(kind==='reverse'){const sweep=context.createOscillator(),gain=context.createGain();sweep.type='triangle';sweep.frequency.setValueAtTime(110,now);sweep.frequency.exponentialRampToValueAtTime(430,now+.22);gain.gain.setValueAtTime(.016,now);gain.gain.exponentialRampToValueAtTime(.0001,now+.24);sweep.connect(gain);gain.connect(context.destination);sweep.start(now);sweep.stop(now+.25);noise(context,now,.12,.009,900);}else if(kind==='penalty'){for(let i=0;i<3;i++){tone(context,110+i*22,now+i*.07,.09,.019,'sine');noise(context,now+i*.07,.04,.012,430);}}else if(kind==='king'){tone(context,92,now,.23,.027,'triangle');tone(context,184,now+.03,.19,.015);noise(context,now,.1,.014,650);}else if(kind==='plus'){tone(context,290,now,.09,.014);tone(context,380,now+.08,.08,.011);}else if(kind==='coin'||kind==='round'){tone(context,780,now,.09,.014);tone(context,1040,now+.07,.12,.012);if(kind==='round')tone(context,620,now+.2,.2,.009);}else if(kind==='shuffle'){noise(context,now,.34,.018,1700);tone(context,120,now+.28,.08,.01);}else{tone(context,96,now,.1,.017,'sine');}setTimeout(()=>context.close(),650);}catch{}
}
let ambientContext=null,ambientGain=null;
export const ambience={
  start(settings){if(!settings.sound||!settings.ambience||ambientContext)return;try{ambientContext=new AudioContext();const length=ambientContext.sampleRate*4,buffer=ambientContext.createBuffer(1,length,ambientContext.sampleRate),data=buffer.getChannelData(0);let last=0;for(let i=0;i<length;i++){last=(last+(Math.random()*2-1)*.035)/1.035;data[i]=last*.18;}const source=ambientContext.createBufferSource(),filter=ambientContext.createBiquadFilter();ambientGain=ambientContext.createGain();source.buffer=buffer;source.loop=true;filter.type='lowpass';filter.frequency.value=430;ambientGain.gain.value=.016;source.connect(filter);filter.connect(ambientGain);ambientGain.connect(ambientContext.destination);source.start();}catch{}},
  stop(){try{ambientContext?.close();}catch{}ambientContext=null;ambientGain=null;}
};
