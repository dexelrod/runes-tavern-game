import { ACTIONS, applyAction, currentPlayer, getLegalCards } from '../game-engine/engine.js';
import { COLORS, TYPES } from '../game-engine/cards.js';

export function chooseColor(hand){ const counts=Object.fromEntries(COLORS.map(c=>[c,0])); for(const card of hand) if(counts[card.color]!==undefined) counts[card.color]++; return COLORS.toSorted((a,b)=>counts[b]-counts[a])[0]; }
function scoreCard(card, state, hand){
  let score=10;
  if(card.type===TYPES.TAKI) score += hand.filter(c=>c.color===card.color).length*8;
  if(card.type===TYPES.PLUS2 && state.activePenalty) score+=50;
  if(card.type===TYPES.KING) score+=state.activePenalty?70:-12;
  if(card.type===TYPES.PLUS3) score+=hand.length<4?18:-8;
  if(card.type===TYPES.CHANGE_COLOR) score+=hand.length<4?8:-6;
  if([TYPES.STOP,TYPES.PLUS,TYPES.REVERSE].includes(card.type)) score+=5;
  if(card.type===TYPES.NUMBER) score+=4;
  return score+Math.random()*2;
}
export function chooseBotAction(state){
  const player=currentPlayer(state);
  if(state.awaitingColor?.playerId===player.id) return {type:ACTIONS.CHOOSE_COLOR,playerId:player.id,color:chooseColor(player.hand)};
  if(state.taki?.open){
    const legal=getLegalCards(state,player.id);
    if(legal.length) return {type:ACTIONS.PLAY,playerId:player.id,cardId:legal.toSorted((a,b)=>scoreCard(b,state,player.hand)-scoreCard(a,state,player.hand))[0].id};
    if(state.taki.lastCardId || (state.taki.ownerId===player.id&&state.taki.openedTurn===state.turn)) return {type:ACTIONS.CLOSE_TAKI,playerId:player.id};
    return {type:ACTIONS.DRAW,playerId:player.id};
  }
  const legal=getLegalCards(state,player.id);
  if(!legal.length) return {type:ACTIONS.DRAW,playerId:player.id};
  const best=legal.toSorted((a,b)=>scoreCard(b,state,player.hand)-scoreCard(a,state,player.hand))[0];
  return {type:ACTIONS.PLAY,playerId:player.id,cardId:best.id};
}

export function runBotStep(state){
  const player=currentPlayer(state); let next=state;
  if(state.lastCardWindow?.playerId===player.id && player.hand.length===1 && Math.random()>.025) next=applyAction(next,{type:ACTIONS.DECLARE_LAST,playerId:player.id});
  next=applyAction(next,chooseBotAction(next));
  const updated=next.players.find(p=>p.id===player.id);
  if(next.phase==='playing'&&next.lastCardWindow?.playerId===player.id&&!next.lastCardWindow.declared&&updated?.hand.length===1&&player.kind==='ai'&&Math.random()>.025) next=applyAction(next,{type:ACTIONS.DECLARE_LAST,playerId:player.id});
  return next;
}
