const SETTINGS='taki-pocket-settings'; const MATCH='taki-pocket-match';
export const defaults={language:'he',playerCount:3,difficulty:'normal',sound:true,ambience:true,music:true,sfxVolume:.9,ambienceVolume:.18,musicVolume:.14,dialogue:true,captions:false,haptics:true,reducedMotion:false,playableHints:true,hideTableMessages:true,tutorial:true,duelOpponent:'ron',duelRecords:{}};
export function loadSettings(){try{const loaded={...defaults,...JSON.parse(localStorage.getItem(SETTINGS)||'{}')};if(![2,3,4,6].includes(loaded.playerCount))loaded.playerCount=defaults.playerCount;if(!['he','en'].includes(loaded.language))loaded.language=defaults.language;return loaded;}catch{return {...defaults};}}
export function saveSettings(value){localStorage.setItem(SETTINGS,JSON.stringify(value));}
export function saveMatch(state){localStorage.setItem(MATCH,JSON.stringify(state));}
export function loadMatch(){try{return JSON.parse(localStorage.getItem(MATCH)||'null');}catch{return null;}}
export function clearMatch(){localStorage.removeItem(MATCH);}
const vibrationPatterns={special:[16,22,24],invalid:[7,26,7],clack:[20,18,9],thunk:[18],flick:[5],precise:[6],measured:[7],quiet:[5],takiOpen:[16,24,12],stop:[22,30,12],reverse:[9,18,12],penalty:[12,26,12],king:[20,24,14],round:[10,26,12,38,16],coin:[8,32,8],draw:[7],play:[7]};
// iPhone Safari has no Vibration API. Since iOS 17.4 a native switch control
// (<input type="checkbox" switch>) gives a system haptic tick when toggled, so
// on iOS we tap a hidden one. It only fires during or right after a user
// gesture, which covers the player's own moves.
let iosSwitch=null;
const isIOS=nav=>/iP(hone|ad|od)/.test(nav?.userAgent||'')||(nav?.platform==='MacIntel'&&nav?.maxTouchPoints>1);
function iosTick(){
  if(!iosSwitch){const label=document.createElement('label'),input=document.createElement('input');label.setAttribute('aria-hidden','true');label.style.cssText='position:fixed;left:-200px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none';input.type='checkbox';input.setAttribute('switch','');input.tabIndex=-1;label.append(input);document.body.append(label);iosSwitch=label;}
  iosSwitch.click();
}
export function triggerHaptic(kind,enabled,navigatorRef=globalThis.navigator){
  if(!enabled||!navigatorRef)return false;
  const pattern=vibrationPatterns[kind]||[7];
  if(typeof navigatorRef.vibrate==='function'){try{return navigatorRef.vibrate.call(navigatorRef,pattern)!==false;}catch{return false;}}
  if(!isIOS(navigatorRef)||typeof document==='undefined')return false;
  // A pattern [on,off,on,…] becomes one tick per pulse (at most three), at the same offsets.
  try{let at=0;pattern.forEach((ms,i)=>{if(i%2===0&&i<6){if(at===0)iosTick();else setTimeout(iosTick,at);}at+=ms;});return true;}catch{return false;}
}
export function feedback(kind,settings){
  triggerHaptic(kind,settings.haptics);
}
