import { TYPES, TYPE_LABEL, WILD } from '../game-engine/cards.js';

const EN_TYPE_LABEL={number:'',stop:'Shield',plus2:'Curse +2',reverse:'Riposte',plus:'Quickstep',taki:'Crossbow',changeColor:'Rune',superTaki:'Runed Crossbow',king:'King'};
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
export function cardHTML(card,{small=false,hidden=false,legal=true,highlight=true,selected=false,incoming=false,arrivalDelay=0,index=0,total=1,activeColor=null,language='he'}={}){
  if(hidden) return `<div class="card card-back ${small?'small':''}" aria-label="${language==='en'?'Face-down RUNES card':'קלף רונות הפוך'}"><span class="back-sigil">${sigilHTML()}</span></div>`;
  const inherited=card.type===TYPES.SUPER_TAKI&&card.inheritedColor;
  const chosen=(card.type===TYPES.CHANGE_COLOR&&activeColor)?activeColor:null;
  const color=inherited||chosen||(card.color===WILD?'wild':card.color);
  const faceMark=cornerIndex(card,activeColor);
  const spokenColor=(language==='en'?{red:'burgundy',blue:'slate',green:'forest',yellow:'gold'}:{red:'בורדו',blue:'צפחה',green:'יער',yellow:'זהב'})[color]||'';
  const spokenLabel=card.type===TYPES.NUMBER?`${card.value} ${spokenColor}`:cardLabel(card,language);
  return `<button class="card ${color} type-${card.type} ${inherited?'inherited':''} ${chosen?'chosen':''} ${small?'small':''} ${legal?'legal':'quiet'} ${legal&&highlight?'playable-hint':''} ${selected?'selected':''} ${incoming?'incoming':''}" data-card-id="${card.id}" data-hand-index="${index}" data-hand-total="${total}" style="--i:${index};--arrive-delay:${arrivalDelay}ms" aria-label="${spokenLabel}" aria-disabled="${!legal}" aria-pressed="${selected}"><span class="corner top">${faceMark}</span>${card.type===TYPES.NUMBER?`<span class="corner bottom">${faceMark}</span>`:''}<span class="card-art">${vectorArt(card,activeColor)}</span><span class="card-print">${cardLabel(card,language)}</span><span class="card-scratch"></span></button>`;
}
