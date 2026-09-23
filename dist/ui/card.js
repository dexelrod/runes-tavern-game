import { TYPES, TYPE_LABEL, WILD } from '../game-engine/cards.js';
export function cardLabel(card){ return card.type===TYPES.NUMBER ? String(card.value) : TYPE_LABEL[card.type]; }
function vectorArt(card){
  if(card.type===TYPES.NUMBER)return `<span class="number-glyph">${card.value}</span>`;
  if(card.type===TYPES.PLUS2)return '<span class="plus-two"><b>+</b><strong>2</strong></span>';
  if(card.type===TYPES.STOP)return '<span class="command-word stop-word">עצור</span>';
  if(card.type===TYPES.REVERSE)return '<span class="reverse-symbol">↻</span>';
  if(card.type===TYPES.CHANGE_COLOR)return '<span class="color-wheel"><i></i><i></i><i></i><i></i></span>';
  if(card.type===TYPES.KING)return '<span class="king-symbol"><b>מלך</b><i></i></span>';
  if(card.type===TYPES.TAKI)return '<span class="taki-symbol"><b>T</b><b>A</b><b>K</b><b>I</b></span>';
  if(card.type===TYPES.SUPER_TAKI)return '<span class="super-symbol"><small>SUPER</small><strong>TAKI</strong></span>';
  return `<span class="action-symbol">${cardLabel(card)}</span>`;
}
export function cardHTML(card,{small=false,hidden=false,legal=true,selected=false,index=0,total=1}={}){
  if(hidden) return `<div class="card card-back ${small?'small':''}" aria-label="Hidden card"><span>T</span></div>`;
  const inherited=card.type===TYPES.SUPER_TAKI&&card.inheritedColor;const color=inherited?inherited:(card.color===WILD?'wild':card.color); const tilt=(index-(total-1)/2)*3.4; const rise=Math.abs(index-(total-1)/2)*2.4;const overlap=Math.max(-88,-57-Math.max(0,total-5)*6);
  return `<button class="card ${color} type-${card.type} ${inherited?'inherited':''} ${small?'small':''} ${legal?'legal':'quiet'} ${selected?'selected':''}" data-card-id="${card.id}" style="--tilt:${tilt}deg;--rise:${rise}px;--i:${index};--overlap:${overlap}px" aria-label="${cardLabel(card)}" aria-disabled="${!legal}"><span class="corner top">${cardLabel(card)}</span><span class="card-art">${vectorArt(card)}</span><span class="corner bottom">${cardLabel(card)}</span></button>`;
}
