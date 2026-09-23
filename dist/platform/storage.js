const SETTINGS='taki-pocket-settings'; const MATCH='taki-pocket-match';
export const defaults={playerCount:3,difficulty:'normal',sound:true,haptics:true,reducedMotion:false,tutorial:true};
export function loadSettings(){ try{return {...defaults,...JSON.parse(localStorage.getItem(SETTINGS)||'{}')};}catch{return {...defaults};} }
export function saveSettings(value){localStorage.setItem(SETTINGS,JSON.stringify(value));}
export function saveMatch(state){localStorage.setItem(MATCH,JSON.stringify(state));}
export function loadMatch(){try{return JSON.parse(localStorage.getItem(MATCH)||'null');}catch{return null;}}
export function clearMatch(){localStorage.removeItem(MATCH);}
export function feedback(kind,settings){ if(settings.haptics&&navigator.vibrate) navigator.vibrate(kind==='special'?[18,24,28]:kind==='invalid'?[8,30,8]:8); if(!settings.sound)return; try{const a=new AudioContext();const o=a.createOscillator(),g=a.createGain();o.connect(g);g.connect(a.destination);o.frequency.value=kind==='invalid'?160:kind==='special'?520:330;g.gain.setValueAtTime(.025,a.currentTime);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+.08);o.start();o.stop(a.currentTime+.08);}catch{}}
