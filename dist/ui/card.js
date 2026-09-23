import { TYPES, TYPE_LABEL, WILD } from '../game-engine/cards.js';
const ASSET={
  [TYPES.PLUS2]:'60px-TAKI-Plus2.png',[TYPES.PLUS]:'TAKI-Plus.PNG',[TYPES.STOP]:'60px-TAKI-Stop.png',[TYPES.REVERSE]:'TAKI-Dir.PNG',[TYPES.CHANGE_COLOR]:'60px-TAKI-Color.png',[TYPES.KING]:'TAKI-Crown.PNG',[TYPES.TAKI]:'60px-TAKI-TAKI.png',[TYPES.SUPER_TAKI]:'TAKI-Super.PNG',[TYPES.PLUS3]:'TAKI-Plus3.PNG',[TYPES.BROKEN3]:'TAKI-Break3.PNG'
};
const SOURCE_COLOR={ [TYPES.PLUS2]:'yellow',[TYPES.PLUS]:'red',[TYPES.STOP]:'red',[TYPES.REVERSE]:'blue',[TYPES.TAKI]:'green' };
function filterFor(type,color){ const source=SOURCE_COLOR[type]; if(!source||source===color)return''; const map={red:{blue:'hue-rotate(210deg)',green:'hue-rotate(95deg)',yellow:'hue-rotate(45deg)'},blue:{red:'hue-rotate(145deg)',green:'hue-rotate(270deg)',yellow:'hue-rotate(200deg)'},green:{red:'hue-rotate(255deg)',blue:'hue-rotate(105deg)',yellow:'hue-rotate(310deg)'},yellow:{red:'hue-rotate(320deg)',blue:'hue-rotate(145deg)',green:'hue-rotate(75deg)'}}; return map[source]?.[color]||''; }
export function cardLabel(card){ return card.type===TYPES.NUMBER ? String(card.value) : TYPE_LABEL[card.type]; }
export function cardHTML(card,{small=false,hidden=false,legal=true,selected=false,index=0,total=1}={}){
  if(hidden) return `<div class="card card-back ${small?'small':''}" aria-label="Hidden card"><span>T</span></div>`;
  const asset=ASSET[card.type]; const art=asset?`<img src="./assets/cards/${asset}" alt="" style="filter:${filterFor(card.type,card.color)}">`:`<span class="number-glyph">${card.value}</span>`;
  const color=card.color===WILD?'wild':card.color; const tilt=(index-(total-1)/2)*3.2; const rise=Math.abs(index-(total-1)/2)*1.4;
  return `<button class="card ${color} ${small?'small':''} ${legal?'legal':'quiet'} ${selected?'selected':''}" data-card-id="${card.id}" style="--tilt:${tilt}deg;--rise:${rise}px;--i:${index}" aria-label="${color} ${cardLabel(card)}" aria-disabled="${!legal}"><span class="corner top">${cardLabel(card)}</span><span class="card-art">${art}</span><span class="corner bottom">${cardLabel(card)}</span></button>`;
}
