import { TYPES, TYPE_LABEL, WILD } from '../game-engine/cards.js';

const EN_TYPE_LABEL={number:'',stop:'Shield',plus2:'Curse',reverse:'Turnabout',plus:'Quickstep',taki:'Crossbow',changeColor:'Rune',superTaki:'Runed Crossbow',king:'King'};
const ART={
  [TYPES.STOP]:'shield.svg',
  [TYPES.PLUS2]:'curse-plus-2.svg',
  [TYPES.REVERSE]:'riposte.svg',
  [TYPES.PLUS]:'quickstep.svg',
  [TYPES.TAKI]:'crossbow.svg',
  [TYPES.CHANGE_COLOR]:'rune.svg',
  [TYPES.SUPER_TAKI]:'runed-crossbow.svg',
  [TYPES.KING]:'king.svg'
};
export function cardLabel(card,language='he'){ return card.type===TYPES.NUMBER ? String(card.value) : (language==='en'?EN_TYPE_LABEL:TYPE_LABEL)[card.type]; }
export function sigilHTML(className='runes-sigil'){
  return `<img class="${className}" src="./assets/brand/runes-seal.svg" alt="" aria-hidden="true">`;
}
const NATIVE_COLOR_ASSETS=new Set(['rune.svg','runed-crossbow.svg']);
const asset=(name,className='card-asset',monochrome=false)=>NATIVE_COLOR_ASSETS.has(name)&&!monochrome
  ? `<img class="${className} native-card-asset" src="./assets/cards/${name}" alt="" aria-hidden="true">`
  : `<span class="${className} masked-card-asset" style="--asset:url('./assets/cards/${name}')" aria-hidden="true"></span>`;
function vectorArt(card,activeColor=null){
  if(card.type===TYPES.NUMBER)return asset(`number-${card.value}.svg`,'card-asset number-asset');
  const name=ART[card.type];
  if(!name)return'';
  if(card.type===TYPES.SUPER_TAKI&&card.inheritedColor)return `<span class="special-asset-wrap">${asset(name,'card-asset',true)}</span>`;
  if(card.type===TYPES.CHANGE_COLOR&&activeColor)return `<span class="special-asset-wrap">${asset(name,'card-asset',true)}</span>`;
  return asset(name);
}
function cornerIndex(card,activeColor=null){
  if(card.type===TYPES.NUMBER)return asset(`number-${card.value}.svg`,'corner-asset number-corner-asset');
  const name=ART[card.type];
  if(!name)return '';
  const resolved=(card.type===TYPES.SUPER_TAKI&&card.inheritedColor)||(card.type===TYPES.CHANGE_COLOR&&activeColor);
  return asset(name,'corner-asset',!!resolved);
}
function suitRune(color,className='card-suit-rune'){
  const paths={red:'<path d="M32 7c3 12-8 14-3 24 3-6 8-8 10-14 8 10 12 22 4 33-8 11-28 8-31-5-2-9 4-17 12-23-1 9 2 12 5 14-1-11 7-15 3-29z"/>',blue:'<path d="M8 39c10-13 20-13 30 0s20 13 28 0M8 24c10-13 20-13 30 0s20 13 28 0"/>',green:'<path d="M32 57V28M32 38C18 37 12 27 11 13c10 2 17 7 21 15m0 8c13-2 20-10 21-23-10 2-17 8-21 17"/>',yellow:'<circle cx="32" cy="32" r="12"/><path d="M32 5v11m0 32v11M5 32h11m32 0h11M13 13l8 8m22 22 8 8m0-38-8 8M21 43l-8 8"/>'};
  return paths[color]?`<svg class="${className}" viewBox="0 0 64 64" aria-hidden="true">${paths[color]}</svg>`:'';
}
export function cardHTML(card,{small=false,hidden=false,legal=true,highlight=true,selected=false,incoming=false,arrivalDelay=0,index=0,total=1,activeColor=null,language='he'}={}){
  if(hidden) return `<div class="card card-back ${small?'small':''}" aria-label="${language==='en'?'Face-down RUNES card':'קלף רונות הפוך'}"><span class="back-sigil">${sigilHTML()}</span></div>`;
  const inherited=card.type===TYPES.SUPER_TAKI&&card.inheritedColor;
  const chosen=(card.type===TYPES.CHANGE_COLOR&&activeColor)?activeColor:null;
  const color=inherited||chosen||(card.color===WILD?'wild':card.color);
  const faceMark=cornerIndex(card,activeColor);
  const spokenColor=(language==='en'?{red:'burgundy',blue:'slate',green:'forest',yellow:'gold'}:{red:'בורדו',blue:'צפחה',green:'יער',yellow:'זהב'})[color]||'';
  const spokenLabel=card.type===TYPES.NUMBER?`${card.value} ${spokenColor}`:`${cardLabel(card,language)}${spokenColor?' '+spokenColor:''}`;
  const rune=color!=='wild'?suitRune(color):'';
  const watermark=card.type===TYPES.NUMBER?suitRune(color,'card-rune-watermark'):'';
  const curseTwo=card.type===TYPES.PLUS2?'<span class="curse-two" aria-hidden="true"><i></i><i></i></span>':'';
  return `<button class="card ${color} type-${card.type} ${inherited?'inherited':''} ${chosen?'chosen':''} ${small?'small':''} ${legal?'legal':'quiet'} ${legal&&highlight?'playable-hint':''} ${selected?'selected':''} ${incoming?'incoming':''}" data-card-id="${card.id}" data-hand-index="${index}" data-hand-total="${total}" style="--i:${index};--arrive-delay:${arrivalDelay}ms" aria-label="${spokenLabel}" aria-disabled="${!legal}" aria-pressed="${selected}"><span class="corner top"><span class="corner-mark">${faceMark}</span>${rune}</span>${card.type===TYPES.NUMBER?`<span class="corner bottom"><span class="corner-mark">${faceMark}</span>${rune}</span>`:''}<span class="card-art">${watermark}${vectorArt(card,activeColor)}${curseTwo}</span><span class="card-print">${cardLabel(card,language)}</span><span class="card-scratch"></span></button>`;
}
