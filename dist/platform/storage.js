const SETTINGS='taki-pocket-settings'; const MATCH='taki-pocket-match';
export const defaults={playerCount:3,difficulty:'normal',sound:true,ambience:true,dialogue:true,haptics:true,reducedMotion:false,tutorial:true};
export function loadSettings(){ try{return {...defaults,...JSON.parse(localStorage.getItem(SETTINGS)||'{}')};}catch{return {...defaults};} }
export function saveSettings(value){localStorage.setItem(SETTINGS,JSON.stringify(value));}
export function saveMatch(state){localStorage.setItem(MATCH,JSON.stringify(state));}
export function loadMatch(){try{return JSON.parse(localStorage.getItem(MATCH)||'null');}catch{return null;}}
export function clearMatch(){localStorage.removeItem(MATCH);}
export function feedback(kind,settings){
  if(settings.haptics&&navigator.vibrate)navigator.vibrate(kind==='special'?[16,22,24]:kind==='invalid'?[7,26,7]:kind==='clack'?[20,18,9]:7);
  if(!settings.sound)return;
  try{const a=new AudioContext(),o=a.createOscillator(),g=a.createGain();o.connect(g);g.connect(a.destination);o.type=kind==='clack'?'square':'triangle';o.frequency.value=kind==='invalid'?105:kind==='special'?185:kind==='clack'?94:240;g.gain.setValueAtTime(kind==='clack'?.032:.018,a.currentTime);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+(kind==='clack'?.13:.075));o.start();o.stop(a.currentTime+(kind==='clack'?.14:.08));}catch{}
}
let ambientContext=null,ambientGain=null;
export const ambience={
  start(settings){if(!settings.sound||!settings.ambience||ambientContext)return;try{ambientContext=new AudioContext();const o=ambientContext.createOscillator(),f=ambientContext.createBiquadFilter();ambientGain=ambientContext.createGain();o.type='sine';o.frequency.value=58;f.type='lowpass';f.frequency.value=130;ambientGain.gain.value=.006;o.connect(f);f.connect(ambientGain);ambientGain.connect(ambientContext.destination);o.start();}catch{}},
  stop(){try{ambientContext?.close();}catch{}ambientContext=null;ambientGain=null;}
};
