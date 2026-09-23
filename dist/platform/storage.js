const SETTINGS='taki-pocket-settings'; const MATCH='taki-pocket-match';
export const defaults={playerCount:3,difficulty:'normal',sound:true,ambience:true,dialogue:true,haptics:true,reducedMotion:false,tutorial:true};
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
export function feedback(kind,settings){
  if(settings.haptics&&navigator.vibrate)navigator.vibrate(kind==='special'?[16,22,24]:kind==='invalid'?[7,26,7]:kind==='clack'?[20,18,9]:kind==='coin'?[8,32,8]:7);
  if(!settings.sound)return;
  try{const context=new AudioContext(),now=context.currentTime;if(kind==='play'){noise(context,now,.075,.018,720);tone(context,150,now,.07,.012);}else if(kind==='draw'){noise(context,now,.14,.015,1250);tone(context,210,now+.02,.06,.008);}else if(kind==='clack'){noise(context,now,.055,.026,480);tone(context,82,now,.14,.027,'square');tone(context,540,now+.018,.035,.01);}else if(kind==='special'){tone(context,145,now,.15,.018);tone(context,218,now+.035,.14,.012);}else if(kind==='coin'){tone(context,780,now,.09,.014);tone(context,1040,now+.07,.12,.012);}else if(kind==='shuffle'){noise(context,now,.34,.018,1700);tone(context,120,now+.28,.08,.01);}else{tone(context,96,now,.1,.017,'sine');}setTimeout(()=>context.close(),550);}catch{}
}
let ambientContext=null,ambientGain=null;
export const ambience={
  start(settings){if(!settings.sound||!settings.ambience||ambientContext)return;try{ambientContext=new AudioContext();const length=ambientContext.sampleRate*4,buffer=ambientContext.createBuffer(1,length,ambientContext.sampleRate),data=buffer.getChannelData(0);let last=0;for(let i=0;i<length;i++){last=(last+(Math.random()*2-1)*.035)/1.035;data[i]=last*.18;}const source=ambientContext.createBufferSource(),filter=ambientContext.createBiquadFilter();ambientGain=ambientContext.createGain();source.buffer=buffer;source.loop=true;filter.type='lowpass';filter.frequency.value=430;ambientGain.gain.value=.016;source.connect(filter);filter.connect(ambientGain);ambientGain.connect(ambientContext.destination);source.start();}catch{}},
  stop(){try{ambientContext?.close();}catch{}ambientContext=null;ambientGain=null;}
};
