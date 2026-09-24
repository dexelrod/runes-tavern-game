const SETTINGS='taki-pocket-settings'; const MATCH='taki-pocket-match';
export const defaults={playerCount:3,difficulty:'normal',sound:true,ambience:true,music:true,sfxVolume:.9,ambienceVolume:.18,musicVolume:.32,dialogue:true,captions:false,haptics:true,reducedMotion:false,playableHints:true,tutorial:true,duelOpponent:'ron',duelRecords:{}};
export function loadSettings(){ try{return {...defaults,...JSON.parse(localStorage.getItem(SETTINGS)||'{}')};}catch{return {...defaults};} }
export function saveSettings(value){localStorage.setItem(SETTINGS,JSON.stringify(value));}
export function saveMatch(state){localStorage.setItem(MATCH,JSON.stringify(state));}
export function loadMatch(){try{return JSON.parse(localStorage.getItem(MATCH)||'null');}catch{return null;}}
export function clearMatch(){localStorage.removeItem(MATCH);}
const vibrationPatterns={special:[16,22,24],invalid:[7,26,7],clack:[20,18,9],thunk:[18],flick:[5],precise:[6],measured:[7],quiet:[5],takiOpen:[16,24,12],stop:[22,30,12],reverse:[9,18,12],penalty:[12,26,12],king:[20,24,14],round:[10,26,12,38,16],coin:[8,32,8],draw:[7],play:[7]};
export function triggerHaptic(kind,enabled,navigatorRef=globalThis.navigator){
  if(!enabled||typeof navigatorRef?.vibrate!=='function')return false;
  try{return navigatorRef.vibrate.call(navigatorRef,vibrationPatterns[kind]||7)!==false;}catch{return false;}
}
export function feedback(kind,settings){
  triggerHaptic(kind,settings.haptics);
}
