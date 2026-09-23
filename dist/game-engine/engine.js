import { COLORS, WILD, TYPES, createDeck, shuffled, cardMatches } from './cards.js';

export const ACTIONS = Object.freeze({ PLAY:'playCard', DRAW:'drawCard', CHOOSE_COLOR:'chooseColor', CLOSE_TAKI:'closeTaki', END_TURN:'endTurn', DECLARE_LAST:'declareLastCard', RESPOND_BROKEN3:'respondWithBrokenThree', RESOLVE_REACTION:'resolveReaction' });
export const clone = value => structuredClone(value);
const nextIndex = (state, from = state.currentPlayerIndex, steps = 1) => (from + state.direction * steps % state.players.length + state.players.length) % state.players.length;
export const currentPlayer = state => state.players[state.currentPlayerIndex];
export const topCard = state => state.discardPile.at(-1);
export const effectiveTopCard = state => state.discardPile[state.effectiveTopIndex ?? state.discardPile.length - 1];
const playerById = (state, id) => state.players.find(p => p.id === id);

export function createInitialState({ playerCount = 3, humanPlayers = 1, seed = Date.now(), players } = {}) {
  const count = Math.max(2, Math.min(10, playerCount));
  const roster = players || Array.from({length:count}, (_, i) => ({ id:`p${i}`, name:i < humanPlayers ? (i ? `Player ${i+1}` : 'You') : ['Milo','Lumi','Pip','Nori','Zig','Coco','Ari','Bibi','Toto'][i-1] || `Bot ${i}`, kind:i < humanPlayers ? 'human' : 'ai' }));
  const deck = shuffled(createDeck(), seed); const dealt = roster.map(p => ({...p, hand:[], declaredLastCard:false}));
  for (let n=0;n<8;n++) for (const p of dealt) p.hand.push(deck.pop());
  const opening = deck.pop();
  return { version:1, seed, phase:'playing', players:dealt, drawPile:deck, discardPile:[opening], effectiveTopIndex:0, currentPlayerIndex:0, direction:1, activeColor:opening.color === WILD ? COLORS[seed % COLORS.length] : opening.color, activePenalty:null, taki:null, freePlay:false, mustPlayAgain:false, awaitingColor:null, pendingReaction:null, lastCardWindow:null, candidateWinnerId:null, winnerId:null, turn:1, log:[{type:'start', cardId:opening.id}] };
}

export function serializeState(state) { return JSON.stringify(state); }
export function restoreState(json) { const state = JSON.parse(json); if (state.version !== 1) throw new Error('Unsupported saved game'); return state; }

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
  if (state.freePlay) return card.type !== TYPES.BROKEN3 || !state.activePenalty;
  if (state.activePenalty?.kind === 'plus2') return card.type === TYPES.PLUS2 || card.type === TYPES.PLUS3 || card.type === TYPES.KING;
  if ([TYPES.KING, TYPES.PLUS3].includes(card.type)) return true;
  if (card.type === TYPES.CHANGE_COLOR || card.type === TYPES.SUPER_TAKI) return true;
  if (card.type === TYPES.BROKEN3) return topCard(state)?.type !== TYPES.PLUS2;
  if (state.taki?.open) {
    if (card.type === TYPES.PLUS3 || card.type === TYPES.BROKEN3) return false;
    if (card.type === TYPES.KING || card.type === TYPES.CHANGE_COLOR) return true;
    if (card.type === TYPES.SUPER_TAKI) return true;
    if (card.color === state.taki.color) return true;
    return topCard(state)?.type === TYPES.TAKI && card.type === TYPES.TAKI;
  }
  if (state.activeColor && card.color === state.activeColor) return true;
  return cardMatches(card, effectiveTopCard(state));
}

export function isLegalPlay(state, playerId, cardId) {
  if (state.phase !== 'playing' || state.pendingReaction || state.awaitingColor) return false;
  if (currentPlayer(state).id !== playerId) return false;
  const card = cardFromHand(state, playerId, cardId); return !!card && baseLegal(state, card);
}
export function getLegalCards(state, playerId = currentPlayer(state).id) { return playerById(state, playerId)?.hand.filter(c => isLegalPlay(state, playerId, c.id)) || []; }

function expireLastCardWindow(state, actingPlayerId) {
  const w = state.lastCardWindow;
  if (!w || w.playerId === actingPlayerId) return;
  if (!w.declared) { drawCards(state, w.playerId, 4); state.log.push({type:'lastCardPenalty', playerId:w.playerId, amount:4}); }
  state.lastCardWindow = null;
}
function setLastCardWindow(state, player) {
  if (player.hand.length === 1) { player.declaredLastCard = false; state.lastCardWindow = {playerId:player.id, declared:false}; }
  else if (state.lastCardWindow?.playerId === player.id) state.lastCardWindow = null;
}
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
  if (card.type === TYPES.REVERSE) { if (state.players.length > 2) state.direction *= -1; advance(state); state.log.push({type:'reverse',direction:state.direction}); maybeWin(state,player,card.type); return; }
  if (card.type === TYPES.PLUS2) { state.activePenalty={kind:'plus2',amount:(state.activePenalty?.amount||0)+2}; maybeWin(state,player,card.type); advance(state); return; }
  if (card.type === TYPES.PLUS) { state.mustPlayAgain=true; state.log.push({type:'playAgain',playerId:player.id}); return; }
  if (card.type === TYPES.TAKI) { state.taki={open:true,color:card.color,ownerId:player.id,openedTurn:state.turn}; state.activeColor=card.color; maybeWin(state,player,card.type); return; }
  if (card.type === TYPES.SUPER_TAKI) { const inherited=state.activeColor || card.inheritedColor; state.taki={open:true,color:inherited,ownerId:player.id,openedTurn:state.turn}; state.activeColor=inherited; maybeWin(state,player,card.type); return; }
  if (card.type === TYPES.CHANGE_COLOR) { state.awaitingColor={playerId:player.id, next:'advance',pendingWin:player.hand.length===0}; return; }
  if (card.type === TYPES.KING) { state.activePenalty=null; state.taki=null; state.activeColor=null; if(maybeWin(state,player,card.type))return; state.freePlay=true; state.mustPlayAgain=true; return; }
  if (card.type === TYPES.PLUS3) {
    const total=(state.activePenalty?.kind==='plus2'?state.activePenalty.amount:0)+3;
    state.pendingReaction={type:'brokenPlus3',sourcePlayerId:player.id,amount:total,fromPlus2:!!state.activePenalty,eligiblePlayerIds:state.players.filter(p=>p.hand.some(c=>c.type===TYPES.BROKEN3)).map(p=>p.id),resumeIndex:nextIndex(state),underIndex:state.discardPile.length-2};
    state.effectiveTopIndex=state.pendingReaction.underIndex; return;
  }
  if (card.type === TYPES.BROKEN3) { drawCards(state,player.id,3); state.log.push({type:'voluntaryBroken3',playerId:player.id}); advance(state); return; }
  if (maybeWin(state,player,card.type)) return;
  advance(state);
}

function playCard(state, action) {
  if (!isLegalPlay(state, action.playerId, action.cardId)) throw new Error('Illegal card');
  expireLastCardWindow(state, action.playerId);
  const player=playerById(state,action.playerId); const index=player.hand.findIndex(c=>c.id===action.cardId); const [card]=player.hand.splice(index,1);
  if (card.type===TYPES.SUPER_TAKI) card.inheritedColor=state.activeColor || action.color || null;
  state.discardPile.push(card); state.log.push({type:'play',playerId:player.id,cardId:card.id}); setLastCardWindow(state,player);
  const inTaki=!!state.taki?.open;
  if (inTaki) {
    if (card.type===TYPES.TAKI && topCard(state)?.id===card.id && card.color!==state.taki.color) { state.taki.color=card.color; state.taki.ownerId=player.id; state.taki.openedTurn=state.turn; state.activeColor=card.color; }
    else if (card.type===TYPES.CHANGE_COLOR || card.type===TYPES.KING) { state.taki=null; resolveFinalEffect(state,player,card,{fromTaki:true}); }
    else { state.taki.lastCardId=card.id; state.taki.lastCardType=card.type; state.activeColor=state.taki.color; }
    return;
  }
  resolveFinalEffect(state,player,card);
}

function drawAction(state, action) {
  if (state.phase!=='playing'||state.pendingReaction||state.awaitingColor||currentPlayer(state).id!==action.playerId) throw new Error('Cannot draw');
  expireLastCardWindow(state, action.playerId); const p=currentPlayer(state);
  if (state.activePenalty?.kind==='plus2') { const amount=state.activePenalty.amount; drawCards(state,p.id,amount); state.activePenalty=null; state.log.push({type:'drawPenalty',playerId:p.id,amount}); if (state.candidateWinnerId && playerById(state,state.candidateWinnerId).hand.length===0) { state.phase='finished'; state.winnerId=state.candidateWinnerId; return; } }
  else { drawCards(state,p.id,1); state.log.push({type:'draw',playerId:p.id,amount:1}); }
  advance(state);
}

function closeTaki(state, action, passOpen=false) {
  if (!state.taki?.open || currentPlayer(state).id!==action.playerId) throw new Error('No TAKI to close');
  expireLastCardWindow(state,action.playerId); const player=currentPlayer(state); const lastId=state.taki.lastCardId; const last=lastId ? state.discardPile.find(c=>c.id===lastId) : topCard(state);
  if (passOpen || !lastId) {
    if (!lastId && !(state.taki.ownerId===player.id && state.taki.openedTurn===state.turn)) throw new Error('Draw a card to pass');
    state.taki.lastCardId=null; state.taki.lastCardType=null; advance(state); return;
  }
  state.taki=null; resolveFinalEffect(state,player,last,{fromTaki:true});
}

function chooseColor(state, action) {
  if (!state.awaitingColor || state.awaitingColor.playerId!==action.playerId || !COLORS.includes(action.color)) throw new Error('Cannot choose color');
  const pendingWin=state.awaitingColor.pendingWin; state.activeColor=action.color; state.awaitingColor=null; state.log.push({type:'color',playerId:action.playerId,color:action.color});
  if(pendingWin){state.phase='finished';state.winnerId=action.playerId;state.log.push({type:'win',playerId:action.playerId});return;} advance(state);
}

function respondBroken3(state, action) {
  const r=state.pendingReaction; if (!r || r.type!=='brokenPlus3' || !r.eligiblePlayerIds.includes(action.playerId)) throw new Error('No reaction available');
  const p=playerById(state,action.playerId); const idx=p.hand.findIndex(c=>c.id===action.cardId&&c.type===TYPES.BROKEN3); if(idx<0) throw new Error('Broken +3 required');
  const [card]=p.hand.splice(idx,1); state.discardPile.push(card); const selfCounter=p.id===r.sourcePlayerId; if(!selfCounter)drawCards(state,r.sourcePlayerId,r.amount); state.activePenalty=null; state.pendingReaction=null; state.effectiveTopIndex=r.underIndex; state.currentPlayerIndex=r.resumeIndex; state.turn++; state.log.push({type:'broken3',playerId:p.id,targetId:r.sourcePlayerId,amount:selfCounter?0:r.amount}); setLastCardWindow(state,p); if(selfCounter&&p.hand.length===0){state.phase='finished';state.winnerId=p.id;state.log.push({type:'win',playerId:p.id});}
}
function resolveReaction(state) {
  const r=state.pendingReaction; if(!r) throw new Error('No reaction'); state.pendingReaction=null;
  if(r.fromPlus2){ state.activePenalty={kind:'plus2',amount:r.amount}; state.currentPlayerIndex=r.resumeIndex; state.turn++; }
  else { for(const p of state.players) if(p.id!==r.sourcePlayerId) drawCards(state,p.id,3); state.currentPlayerIndex=r.resumeIndex; state.turn++; }
  state.effectiveTopIndex=r.underIndex; state.log.push({type:'plus3Resolved',sourcePlayerId:r.sourcePlayerId,amount:r.amount});
  const source=playerById(state,r.sourcePlayerId); if(source.hand.length===0){state.phase='finished';state.winnerId=source.id;}
}

export function applyAction(input, action) {
  const state=clone(input); if (state.phase==='finished') throw new Error('Game finished');
  switch(action.type){
    case ACTIONS.PLAY: playCard(state,action); break;
    case ACTIONS.DRAW: drawAction(state,action); break;
    case ACTIONS.CHOOSE_COLOR: chooseColor(state,action); break;
    case ACTIONS.CLOSE_TAKI: closeTaki(state,action,false); break;
    case ACTIONS.END_TURN: if(state.taki?.open) closeTaki(state,action,true); else if(state.mustPlayAgain) drawAction(state,{type:ACTIONS.DRAW,playerId:action.playerId}); else throw new Error('Cannot end turn'); break;
    case ACTIONS.DECLARE_LAST: { const p=playerById(state,action.playerId); if(!p||p.hand.length!==1||state.lastCardWindow?.playerId!==p.id) throw new Error('No declaration window'); p.declaredLastCard=true; state.lastCardWindow.declared=true; state.log.push({type:'lastCard',playerId:p.id}); break; }
    case ACTIONS.RESPOND_BROKEN3: respondBroken3(state,action); break;
    case ACTIONS.RESOLVE_REACTION: resolveReaction(state); break;
    default: throw new Error('Unknown action');
  }
  return state;
}
