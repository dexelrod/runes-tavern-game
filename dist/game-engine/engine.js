import { COLORS, WILD, TYPES, createDeck, shuffled, cardMatches } from './cards.js';

export const ACTIONS = Object.freeze({ PLAY:'playCard', DRAW:'drawCard', CHOOSE_COLOR:'chooseColor', END_TURN:'endTurn' });
export const clone = value => structuredClone(value);
const nextIndex = (state, from = state.currentPlayerIndex, steps = 1) => (from + state.direction * steps % state.players.length + state.players.length) % state.players.length;
export const currentPlayer = state => state.players[state.currentPlayerIndex];
export const topCard = state => state.discardPile.at(-1);
export const effectiveTopCard = state => state.discardPile[state.effectiveTopIndex ?? state.discardPile.length - 1];
const playerById = (state, id) => state.players.find(p => p.id === id);

export function createInitialState({ playerCount = 3, humanPlayers = 1, seed = Date.now(), players } = {}) {
  const count = Math.max(2, Math.min(10, playerCount));
  const roster = players || Array.from({length:count}, (_, i) => ({ id:`p${i}`, name:i < humanPlayers ? (i ? `שחקן ${i+1}` : 'אתם') : ['מילו','לומי','פיפ','נורי','זיג','קוקו','ארי','ביבי','טוטו'][i-1] || `בוט ${i}`, kind:i < humanPlayers ? 'human' : 'ai' }));
  const deck = shuffled(createDeck(), seed); const dealt = roster.map(p => ({...p, hand:[]}));
  for (let n=0;n<8;n++) for (const p of dealt) p.hand.push(deck.pop());
  // The opening card is always a number. Command cards stay in the draw pile.
  const openingIndex = deck.findLastIndex(card => card.type === TYPES.NUMBER);
  const [opening] = deck.splice(openingIndex, 1);
  return { version:4, seed, phase:'playing', players:dealt, drawPile:deck, discardPile:[opening], effectiveTopIndex:0, currentPlayerIndex:0, direction:1, activeColor:opening.color, activePenalty:null, taki:null, freePlay:false, mustPlayAgain:false, awaitingColor:null, candidateWinnerId:null, winnerId:null, turn:1, log:[{type:'start', cardId:opening.id}] };
}

export function serializeState(state) { return JSON.stringify(state); }
export function restoreState(json) {
  const state = JSON.parse(json); if (![1,2,3,4].includes(state.version)) throw new Error('Unsupported saved game');
  if(state.version<4)state.taki=null;state.effectiveTopIndex=Math.max(0,Math.min(state.effectiveTopIndex,state.discardPile.length-1));state.version=4;return state;
}

function recycle(state) {
  if (state.drawPile.length || state.discardPile.length <= 1) return;
  const effectiveId = effectiveTopCard(state)?.id;
  const keepIndexes = new Set([state.discardPile.length - 1, state.effectiveTopIndex]);
  const recycled = state.discardPile.filter((_, i) => !keepIndexes.has(i));
  state.discardPile = state.discardPile.filter((_, i) => keepIndexes.has(i));
  state.effectiveTopIndex = Math.max(0,state.discardPile.findIndex(c => c.id === effectiveId));
  state.drawPile = shuffled(recycled, state.seed + state.turn + state.log.length);
}
function drawCards(state, playerId, amount) { const p = playerById(state, playerId); for (let i=0;i<amount;i++) { recycle(state); const card=state.drawPile.pop(); if (card) p.hand.push(card); } }
function cardFromHand(state, playerId, cardId) { return playerById(state, playerId)?.hand.find(c => c.id === cardId); }

function baseLegal(state, card) {
  if (state.freePlay) return true;
  if (state.activePenalty?.kind === 'plus2') return card.type === TYPES.PLUS2 || card.type === TYPES.KING;
  if (card.type === TYPES.KING) return true;
  if (card.type === TYPES.CHANGE_COLOR || card.type === TYPES.SUPER_TAKI) return true;
  if (state.taki?.open) {
    if (card.type === TYPES.KING || card.type === TYPES.CHANGE_COLOR) return true;
    if (card.type === TYPES.SUPER_TAKI) return true;
    if (card.color === state.taki.color) return true;
    return false;
  }
  if (state.activeColor && card.color === state.activeColor) return true;
  return cardMatches(card, effectiveTopCard(state));
}

export function isLegalPlay(state, playerId, cardId) {
  if (state.phase !== 'playing' || state.awaitingColor) return false;
  if (currentPlayer(state).id !== playerId) return false;
  const card = cardFromHand(state, playerId, cardId); return !!card && baseLegal(state, card);
}
export function getLegalCards(state, playerId = currentPlayer(state).id) { return playerById(state, playerId)?.hand.filter(c => isLegalPlay(state, playerId, c.id)) || []; }

function maybeWin(state, player, cardType) {
  if (player.hand.length) return false;
  if (cardType === TYPES.PLUS) return false;
  if (cardType === TYPES.PLUS2) { state.candidateWinnerId = player.id; return false; }
  state.phase='finished'; state.winnerId=player.id; state.log.push({type:'win', playerId:player.id}); return true;
}
function advance(state, steps=1) { state.currentPlayerIndex = nextIndex(state, state.currentPlayerIndex, steps); state.turn++; state.freePlay=false; state.mustPlayAgain=false; }

function resolveFinalEffect(state, player, card, {fromTaki=false}={}) {
  state.effectiveTopIndex = state.discardPile.length - 1;
  if (card.color !== WILD) state.activeColor = card.color;
  if (card.type === TYPES.STOP) { const skipped=state.players[nextIndex(state)].id; advance(state,2); state.log.push({type:'stop',skipped}); maybeWin(state,player,card.type); return; }
  if (card.type === TYPES.REVERSE) { if (state.players.length > 2) { state.direction *= -1; state.log.push({type:'reverse',direction:state.direction}); } advance(state); maybeWin(state,player,card.type); return; }
  if (card.type === TYPES.PLUS2) { state.activePenalty={kind:'plus2',amount:(state.activePenalty?.amount||0)+2}; maybeWin(state,player,card.type); advance(state); return; }
  if (card.type === TYPES.PLUS) { state.mustPlayAgain=true; state.log.push({type:'playAgain',playerId:player.id}); return; }
  if (card.type === TYPES.TAKI) { state.taki={open:true,color:card.color,ownerId:player.id,openedTurn:state.turn,lastCardId:null,lastCardType:null}; state.activeColor=card.color; autoCloseTakiIfNeeded(state,player); return; }
  if (card.type === TYPES.SUPER_TAKI) { const inherited=state.activeColor || card.inheritedColor; state.taki={open:true,color:inherited,ownerId:player.id,openedTurn:state.turn,lastCardId:null,lastCardType:null}; state.activeColor=inherited; autoCloseTakiIfNeeded(state,player); return; }
  if (card.type === TYPES.CHANGE_COLOR) { state.awaitingColor={playerId:player.id, next:'advance',pendingWin:player.hand.length===0}; return; }
  if (card.type === TYPES.KING) { state.activePenalty=null; state.taki=null; state.activeColor=null; if(maybeWin(state,player,card.type))return; state.freePlay=true; state.mustPlayAgain=true; return; }
  if (maybeWin(state,player,card.type)) return;
  advance(state);
}

function closeTaki(state, player) {
  if (!state.taki?.open || state.taki.ownerId !== player.id || currentPlayer(state).id !== player.id) throw new Error('No TAKI sequence to finish');
  const lastId=state.taki.lastCardId;
  const last=lastId ? state.discardPile.find(c=>c.id===lastId) : topCard(state);
  const color=state.taki.color;
  state.taki=null;
  state.log.push({type:'takiClosed',playerId:player.id,color});
  if (!lastId) {
    state.effectiveTopIndex=state.discardPile.length-1;
    state.activeColor=color;
    if (!maybeWin(state,player,last.type)) advance(state);
    return;
  }
  resolveFinalEffect(state,player,last,{fromTaki:true});
}

function autoCloseTakiIfNeeded(state, player) {
  if (!state.taki?.open || state.taki.ownerId!==player.id || state.phase!=='playing') return;
  const hasContinuation=player.hand.some(card=>baseLegal(state,card));
  if (!hasContinuation) closeTaki(state,player);
}

function playCard(state, action) {
  if (!isLegalPlay(state, action.playerId, action.cardId)) throw new Error('Illegal card');
  const player=playerById(state,action.playerId); const index=player.hand.findIndex(c=>c.id===action.cardId); const [card]=player.hand.splice(index,1);
  if(player.hand.length===1)state.log.push({type:'lastCard',playerId:player.id});
  if (card.type===TYPES.SUPER_TAKI) card.inheritedColor=state.activeColor || action.color || null;
  state.discardPile.push(card); state.log.push({type:'play',playerId:player.id,cardId:card.id});
  const inTaki=!!state.taki?.open;
  if (inTaki) {
    if (card.type===TYPES.CHANGE_COLOR || card.type===TYPES.KING) { state.taki=null; resolveFinalEffect(state,player,card,{fromTaki:true}); }
    else { state.taki.lastCardId=card.id; state.taki.lastCardType=card.type; state.activeColor=state.taki.color; autoCloseTakiIfNeeded(state,player); }
    return;
  }
  resolveFinalEffect(state,player,card);
}

function drawAction(state, action) {
  if (state.phase!=='playing'||state.awaitingColor||currentPlayer(state).id!==action.playerId) throw new Error('Cannot draw');
  const p=currentPlayer(state);
  if (state.activePenalty?.kind==='plus2') { const amount=state.activePenalty.amount; drawCards(state,p.id,amount); state.activePenalty=null; state.log.push({type:'drawPenalty',playerId:p.id,amount}); if (state.candidateWinnerId && playerById(state,state.candidateWinnerId).hand.length===0) { state.phase='finished'; state.winnerId=state.candidateWinnerId; return; } }
  else { drawCards(state,p.id,1); state.log.push({type:'draw',playerId:p.id,amount:1}); }
  advance(state);
}

function chooseColor(state, action) {
  if (!state.awaitingColor || state.awaitingColor.playerId!==action.playerId || !COLORS.includes(action.color)) throw new Error('Cannot choose color');
  const pendingWin=state.awaitingColor.pendingWin; state.activeColor=action.color; state.awaitingColor=null; state.log.push({type:'color',playerId:action.playerId,color:action.color});
  if(pendingWin){state.phase='finished';state.winnerId=action.playerId;state.log.push({type:'win',playerId:action.playerId});return;} advance(state);
}

export function applyAction(input, action) {
  const state=clone(input); if (state.phase==='finished') throw new Error('Game finished');
  switch(action.type){
    case ACTIONS.PLAY: playCard(state,action); break;
    case ACTIONS.DRAW: drawAction(state,action); break;
    case ACTIONS.CHOOSE_COLOR: chooseColor(state,action); break;
    case ACTIONS.END_TURN: if(state.taki?.open) closeTaki(state,currentPlayer(state)); else if(state.mustPlayAgain) drawAction(state,{type:ACTIONS.DRAW,playerId:action.playerId}); else throw new Error('Cannot end turn'); break;
    default: throw new Error('Unknown action');
  }
  return state;
}
