const SETTINGS='taki-pocket-settings'; const MATCH='taki-pocket-match';
export const defaults={language:'en',playerCount:3,difficulty:'normal',sound:true,ambience:true,music:true,sfxVolume:.9,ambienceVolume:.18,musicVolume:.14,dialogue:true,tavernGuestMode:'often',captions:true,haptics:true,reducedMotion:false,highContrastCards:false,playableHints:true,hideTableMessages:true,tutorial:true,duelOpponent:'ron',duelRecords:{},tavernPickGuests:false,tavernPicks:[],settingsRevision:110};
export function loadSettings(){try{const loaded={...defaults,...JSON.parse(localStorage.getItem(SETTINGS)||'{}')};if(![2,3,4,6].includes(loaded.playerCount))loaded.playerCount=defaults.playerCount;if(!['he','en'].includes(loaded.language))loaded.language=defaults.language;
  // v103: the on/off switch became off · sometimes · often. An older "off" stays off.
  // v116: back to on/off — every Tavern table is voiced unless they are off ("sometimes" → on).
  if(loaded.tavernGuestMode==='sometimes')loaded.tavernGuestMode='often';
  if(!['off','often'].includes(loaded.tavernGuestMode))loaded.tavernGuestMode=defaults.tavernGuestMode;if(loaded.tavernGuests===false&&!JSON.parse(localStorage.getItem(SETTINGS)||'{}').tavernGuestMode)loaded.tavernGuestMode='off';delete loaded.tavernGuests;
  // v111: "Every evening" and captions on are the new defaults. Settings saved before then still carry the old
  // defaults (every key is saved at once), so move those over once; a choice made after this is kept.
  const stored=JSON.parse(localStorage.getItem(SETTINGS)||'{}');
  if(Object.keys(stored).length&&!(stored.settingsRevision>=110)){if(loaded.tavernGuestMode==='sometimes')loaded.tavernGuestMode='often';if(loaded.captions===false)loaded.captions=true;loaded.settingsRevision=110;}
  return loaded;}catch{return {...defaults};}}
export function saveSettings(value){localStorage.setItem(SETTINGS,JSON.stringify(value));}
export function saveMatch(state){localStorage.setItem(MATCH,JSON.stringify(state));}
export function loadMatch(){try{return JSON.parse(localStorage.getItem(MATCH)||'null');}catch{return null;}}
export function clearMatch(){localStorage.removeItem(MATCH);}
const vibrationPatterns={special:[16,22,24],invalid:[7,26,7],clack:[20,18,9],thunk:[18],flick:[5],precise:[6],measured:[7],quiet:[5],takiOpen:[16,24,12],stop:[22,30,12],reverse:[9,18,12],penalty:[12,26,12],king:[20,24,14],round:[10,26,12,38,16],coin:[8,32,8],draw:[7],play:[7]};
// iPhone Safari has no Vibration API. Since iOS 17.4 a native switch control
// (<input type="checkbox" switch>) gives a system haptic tick when its label is
// clicked. iOS honours it only inside the user's own tap, synchronously, so
// iPhone haptics are fired from the tap handlers through tapFeedback().
const isIOS=nav=>/iP(hone|ad|od)/.test(nav?.userAgent||'')||(nav?.platform==='MacIntel'&&nav?.maxTouchPoints>1);
function iosTick(){
  const label=document.createElement('label'),input=document.createElement('input');
  label.setAttribute('aria-hidden','true');label.style.display='none';input.type='checkbox';input.setAttribute('switch','');
  label.append(input);document.head.append(label);label.click();label.remove();
}
export function triggerHaptic(kind,enabled,navigatorRef=globalThis.navigator){
  if(!enabled||!navigatorRef)return false;
  const pattern=vibrationPatterns[kind]||[7];
  if(typeof navigatorRef.vibrate==='function'){try{return navigatorRef.vibrate.call(navigatorRef,pattern)!==false;}catch{return false;}}
  if(!isIOS(navigatorRef)||typeof document==='undefined')return false;
  try{iosTick();return true;}catch{return false;}
}
export function feedback(kind,settings){
  triggerHaptic(kind,settings.haptics);
}
// Called synchronously from a tap. On iPhone this is the only moment a haptic
// can fire; elsewhere the richer pattern follows from the game event itself.
export function tapFeedback(kind,settings,navigatorRef=globalThis.navigator){
  if(!navigatorRef||typeof navigatorRef.vibrate==='function')return false;
  return triggerHaptic(kind,settings.haptics,navigatorRef);
}
