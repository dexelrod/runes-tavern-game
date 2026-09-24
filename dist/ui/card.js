import { TYPES, TYPE_LABEL, WILD } from '../game-engine/cards.js';

export function cardLabel(card){ return card.type===TYPES.NUMBER ? String(card.value) : TYPE_LABEL[card.type]; }
export function sigilHTML(className='elder-sigil'){
  return `<svg class="${className}" viewBox="0 0 64 64" aria-hidden="true"><path d="M32 7 43 20 57 32 43 44 32 57 21 44 7 32 21 20zM32 7v50M7 32h50M21 20l22 24M43 20 21 44"/><circle cx="32" cy="32" r="8"/><path d="M32 16c7 0 12 3 16 8M48 32c0 7-3 12-8 16M32 48c-7 0-12-3-16-8M16 32c0-7 3-12 8-16"/></svg>`;
}
const crest={
  green:`<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 52V28M32 35C19 34 13 25 12 13c9 2 16 7 20 15m0 6c12-1 19-9 20-21-9 2-16 7-20 15"/></svg>`,
  blue:`<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M10 42c15-24 29-30 44-26-9 4-15 10-19 18 8-2 14-1 19 1-13 2-23 8-31 17 1-6 0-11-3-15z"/></svg>`,
  red:`<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M36 7c3 12-8 14-3 24 3-6 8-8 10-14 8 10 12 22 4 33-8 11-28 8-31-5-2-9 4-17 12-23-1 9 2 12 5 14-1-11 7-15 3-29z"/></svg>`,
  yellow:`<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="12"/><path d="M32 5v11m0 32v11M5 32h11m32 0h11M13 13l8 8m22 22 8 8m0-38-8 8M21 43l-8 8"/></svg>`
};
const icon=(name,body)=>`<svg class="special-icon ${name}" viewBox="0 0 80 80" aria-hidden="true">${body}</svg>`;
function vectorArt(card,activeColor=null){
  if(card.type===TYPES.NUMBER)return `<span class="card-crest">${crest[card.color]||''}</span><span class="number-glyph">${card.value}</span>`;
  if(card.type===TYPES.PLUS2)return `<span class="plus-two"><b>+</b><strong>2</strong></span>`;
  if(card.type===TYPES.STOP)return icon('stop-icon','<path d="M25 65 14 42c-3-7 6-11 10-4l3 5V17c0-8 10-8 10 0v19-21c0-8 10-8 10 0v21-17c0-8 10-8 10 0v22-10c0-8 10-8 10 0v16c0 17-11 25-25 25-8 0-13-2-17-7z"/>');
  if(card.type===TYPES.REVERSE)return icon('reverse-icon','<path d="M18 33c5-15 22-23 37-15l7 4m0 0-3-12m3 12-12 3M62 47c-5 15-22 23-37 15l-7-4m0 0 3 12m-3-12 12-3"/>');
  if(card.type===TYPES.PLUS)return icon('plus-icon','<path d="M33 11h14v22h22v14H47v22H33V47H11V33h22z"/>');
  if(card.type===TYPES.CHANGE_COLOR&&activeColor)return `<span class="chosen-color ${activeColor}">${crest[activeColor]||''}</span>`;
  if(card.type===TYPES.CHANGE_COLOR)return '<span class="gem-wheel"><i></i><i></i><i></i><i></i><b></b></span>';
  if(card.type===TYPES.KING)return icon('king-icon','<path d="M11 57h58l-5 12H16zm5-7-4-30 17 14 11-23 11 23 17-14-4 30z"/>');
  if(card.type===TYPES.TAKI)return `<span class="taki-banner"><small>ᛏ</small><strong>TAKI</strong><i>${crest[card.color]||''}</i></span>`;
  if(card.type===TYPES.SUPER_TAKI&&card.inheritedColor)return `<span class="chosen-color super-chosen ${card.inheritedColor}" aria-hidden="true">${crest[card.inheritedColor]||''}<b>ᛏ</b></span>`;
  if(card.type===TYPES.SUPER_TAKI)return `<span class="super-banner" aria-hidden="true"><i></i><i></i><i></i><i></i><b>ᛏ</b></span>`;
  return `<span class="action-symbol">${cardLabel(card)}</span>`;
}
export function cardHTML(card,{small=false,hidden=false,legal=true,highlight=true,selected=false,incoming=false,arrivalDelay=0,index=0,total=1,activeColor=null}={}){
  if(hidden) return `<div class="card card-back ${small?'small':''}" aria-label="קלף הפוך"><span class="back-sigil">${sigilHTML()}</span></div>`;
  const inherited=card.type===TYPES.SUPER_TAKI&&card.inheritedColor;
  const chosen=(card.type===TYPES.CHANGE_COLOR&&activeColor)?activeColor:null;
  const color=inherited||chosen||(card.color===WILD?'wild':card.color);
  const spread=Math.max(1.55,3.1-Math.max(0,total-7)*.24);
  const tilt=(index-(total-1)/2)*spread;
  const rise=Math.abs(index-(total-1)/2)*Math.max(1.35,2.2-Math.max(0,total-8)*.1);
  const handWidth=Math.min(432,Math.max(304,(globalThis.innerWidth||390)-40));
  const overlap=total<2?0:Math.max(-84,(handWidth-102)/(total-1)-102);
  const faceMark=card.type===TYPES.NUMBER?String(card.value):card.type===TYPES.PLUS2?'+2':'';
  const spokenColor={red:'אדום',blue:'כחול',green:'ירוק',yellow:'צהוב'}[color]||'';
  const spokenLabel=card.type===TYPES.NUMBER?`${card.value} ${spokenColor}`:cardLabel(card);
  return `<button class="card ${color} type-${card.type} ${inherited?'inherited':''} ${chosen?'chosen':''} ${small?'small':''} ${legal?'legal':'quiet'} ${legal&&highlight?'playable-hint':''} ${selected?'selected':''} ${incoming?'incoming':''}" data-card-id="${card.id}" style="--tilt:${tilt}deg;--rise:${rise}px;--i:${index};--overlap:${overlap}px;--arrive-delay:${arrivalDelay}ms" aria-label="${spokenLabel}" aria-disabled="${!legal}"><span class="corner top">${faceMark}</span><span class="card-art">${vectorArt(card,activeColor)}</span><span class="card-print">${card.type===TYPES.TAKI?'':cardLabel(card)}</span><span class="card-scratch"></span></button>`;
}
