import { ACTIONS, applyAction, currentPlayer, getLegalCards } from '../game-engine/engine.js';
import { COLORS, TYPES } from '../game-engine/cards.js';
import { OMEN_PROFILE, PRESSURE_PROFILE, chooseVeteranAction, setRolloutPolicy } from './veteran.js';

// What the last planned decision was, for presentation only (never read by the engine).
export const lastBotDecision={playerId:null,turn:null,slip:false};

export function chooseColor(hand, avoid=null){ const counts=Object.fromEntries(COLORS.map(c=>[c,0])); for(const card of hand) if(counts[card.color]!==undefined) counts[card.color]++; const ranked=COLORS.toSorted((a,b)=>counts[b]-counts[a]);return ranked.find(color=>color!==avoid&&counts[color]>0)||ranked.find(color=>color!==avoid)||ranked[0]; }
function scoreCard(card, state, hand){
  let score=10;
  if(card.type===TYPES.TAKI) score += hand.filter(c=>c.color===card.color).length*8;
  if(card.type===TYPES.PLUS2 && state.activePenalty) score+=50;
  if(card.type===TYPES.KING) score+=state.activePenalty?70:-12;
  if(card.type===TYPES.CHANGE_COLOR) score+=hand.length<4?8:-6;
  if([TYPES.STOP,TYPES.PLUS,TYPES.REVERSE].includes(card.type)) score+=5;
  if(card.type===TYPES.NUMBER) score+=4;
  const personality=currentPlayer(state).archetype;
  if(personality==='mercenary'&&[TYPES.STOP,TYPES.PLUS,TYPES.PLUS2,TYPES.REVERSE].includes(card.type))score+=7;
  if(personality==='hunter'&&[TYPES.KING,TYPES.CHANGE_COLOR].includes(card.type)&&hand.length>3)score-=5;
  if(personality==='bard'){if([TYPES.STOP,TYPES.REVERSE,TYPES.CHANGE_COLOR].includes(card.type))score+=3;score+=Math.random()*4;}
  if(personality==='scholar'&&[TYPES.KING,TYPES.CHANGE_COLOR].includes(card.type)&&hand.length>3)score-=7;
  if(personality==='mysterious')score+=Math.random()*3;
  return score+Math.random()*2;
}
export function chooseBotAction(state){
  const player=currentPlayer(state);
  // Personality profiles that need more than card weights get their own planner.
  if(player.archetype==='veteran')return chooseVeteranAction(state);
  // Kesh plays his own way in every mode (Duel, Tavern). Older saves still list him as `mysterious`.
  if(player.archetype==='traveler'||(player.archetype==='mysterious'&&player.nameKey==='kesh')){const note={slip:false},action=chooseVeteranAction(state,{profile:OMEN_PROFILE,note});Object.assign(lastBotDecision,{playerId:player.id,turn:state.turn,slip:note.slip,type:action.type});return action;}
  if(player.archetype==='warrior'){const note={slip:false},action=chooseVeteranAction(state,{profile:PRESSURE_PROFILE,note});Object.assign(lastBotDecision,{playerId:player.id,turn:state.turn,slip:note.slip,type:action.type});return action;}
  if(state.awaitingColor?.playerId===player.id) return {type:ACTIONS.CHOOSE_COLOR,playerId:player.id,color:chooseColor(player.hand,state.activeColor)};
  if(state.taki?.open){
    const legal=getLegalCards(state,player.id);
    if(legal.length) return {type:ACTIONS.PLAY,playerId:player.id,cardId:legal.toSorted((a,b)=>scoreCard(b,state,player.hand)-scoreCard(a,state,player.hand))[0].id};
    if(state.taki.ownerId===player.id) return {type:ACTIONS.END_TURN,playerId:player.id};
    return {type:ACTIONS.DRAW,playerId:player.id};
  }
  const legal=getLegalCards(state,player.id);
  if(!legal.length) return {type:ACTIONS.DRAW,playerId:player.id};
  const best=legal.toSorted((a,b)=>scoreCard(b,state,player.hand)-scoreCard(a,state,player.hand))[0];
  return {type:ACTIONS.PLAY,playerId:player.id,cardId:best.id};
}

export function runBotStep(state){
  return applyAction(state,chooseBotAction(state));
}

// The veteran imagines the rest of the hand played out by ordinary tavern bots.
setRolloutPolicy(chooseBotAction);
