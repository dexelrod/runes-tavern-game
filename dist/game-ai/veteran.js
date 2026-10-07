import { ACTIONS, applyAction, crossbowAwaitsPickup, currentPlayer, effectiveTopCard, getLegalCards } from '../game-engine/engine.js';
import { COLORS, TYPES, cardMatches, createDeck } from '../game-engine/cards.js';

// ─────────────────────────────────────────────────────────────────────────────
// The veteran profile (Edrin). Thirty years of tavern RUNES, no tricks:
// it reads only its own hand, the face-up discard pile, the table log and how
// many cards each opponent holds. It never looks at hidden hands or the deck.
// Strength comes from planning: keeping wild cards for the finish, saving
// Curses for when they matter, emptying a colour with the Crossbow, finishing a
// volley on its most punishing card, and switching to colours the opponent has
// already shown they cannot follow.
// ─────────────────────────────────────────────────────────────────────────────

export const VETERAN_PROFILE=Object.freeze({
  followWeight:4,          // value of each card left that can follow the colour we set
  holdWild:14,             // reluctance to spend a Rune (change colour) early
  holdKing:10,             // reluctance to spend a King early
  holdCurse:6,             // reluctance to spend a Curse while the opponent is far from out
  curseDanger:26,          // urge to Curse when the opponent is on one or two cards
  curseMidgame:8,
  crossbowPerCard:6,       // value of each extra card a Crossbow volley would empty
  missingColour:5,         // bonus for setting a colour the opponent has failed to follow
  mistakeRate:.1,          // occasional reasonable second-best choice…
  mistakeWindow:6,         // …only when the two options are genuinely close
  jitter:1.5,
  actionTempo:0,           // pressure profiles: extra appetite for tempo cards…
  pressure:0,              // …and for punishing a short hand
  planNodes:0,planDepth:8,shedWeight:10,penaltyWeight:3,endFollow:2,endGap:6,wildKept:3,curseKept:2,strandedQuickstep:12,priorWeight:.2,stuckWeight:12,penaltyStuck:6,dangerStuck:1.5,
  samples:10,minSamples:4,thinkBudgetMs:35,lateHand:5,lateOpp:4,rolloutPlies:14,rolloutScale:8,searchPrior:.004,searchMistakeWindow:.04
});

const WILD_TYPES=new Set([TYPES.CHANGE_COLOR,TYPES.SUPER_TAKI,TYPES.KING]);
const isWild=card=>WILD_TYPES.has(card.type);
const ACTION_RANK={[TYPES.PLUS2]:5,[TYPES.STOP]:4,[TYPES.PLUS]:2,[TYPES.REVERSE]:1,[TYPES.NUMBER]:0,[TYPES.TAKI]:0};

// Public card identity: every card id carries its colour (s0-red-5, s1-blue-stop).
const colourOfId=id=>COLORS.find(colour=>id?.includes(`-${colour}-`))||null;

// Colours each opponent has visibly failed to follow (they drew instead of
// playing on that colour, and have not played it since).
export function observedGaps(state,meId){
  const gaps=new Map();let colour=colourOfId(state.log.find(e=>e.type==='start')?.cardId)||null,penalty=false;
  for(const entry of state.log){
    if(entry.type==='play'){const c=colourOfId(entry.cardId);if(c){colour=c;if(entry.playerId!==meId)gaps.get(entry.playerId)?.delete(c);}}
    else if(entry.type==='color'||entry.type==='takiOpened'){if(entry.color)colour=entry.color;}
    else if(entry.type==='plus2')penalty=true;
    else if(entry.type==='drawPenalty')penalty=false;
    else if(entry.type==='draw'&&entry.playerId!==meId&&colour&&!penalty){if(!gaps.has(entry.playerId))gaps.set(entry.playerId,new Set());gaps.get(entry.playerId).add(colour);}
  }
  return gaps;
}

// Kesh's omen for the hand: the colour of the first card turned up (or, if that
// was a wild, the first colour anyone played). Public, fixed for the whole hand —
// a superstition, not information.
export function omenColour(state){
  const start=colourOfId(state.log.find(e=>e.type==='start')?.cardId);if(start)return start;
  for(const entry of state.log){if(entry.type==='play'){const c=colourOfId(entry.cardId);if(c)return c;}if(entry.type==='color'&&entry.color)return entry.color;}
  return null;
}

function tableView(state,me,P=null){
  const others=state.players.filter(p=>p.id!==me.id),opp=Math.min(...others.map(p=>p.hand.length));
  const threat=others.find(p=>p.hand.length===opp),gaps=observedGaps(state,me.id).get(threat?.id)||new Set();
  // Who plays next, and who would play next if the order turned (public card counts only).
  const n=state.players.length,index=state.players.findIndex(p=>p.id===me.id),dir=state.direction||1;
  const nextCount=state.players[(index+dir+n)%n]?.hand.length??opp,prevCount=state.players[(index-dir+n)%n]?.hand.length??opp;
  return {opp,gaps,twoPlayer:n===2,danger:opp<=2,nextCount,prevCount,omen:P?.omenBias?omenColour(state):null};
}

function colourCounts(cards){const counts=Object.fromEntries(COLORS.map(c=>[c,0]));for(const card of cards)if(counts[card.color]!==undefined)counts[card.color]++;return counts;}

export function veteranColour(hand,state,me,{avoid=null,profile=null}={}){
  const view=tableView(state,me,profile),counts=colourCounts(hand),actions=colourCounts(hand.filter(card=>card.type!==TYPES.NUMBER));
  // A superstitious player leans toward the hand's omen colour when naming one —
  // about one card's worth, never against an empty colour.
  const omen=colour=>view.omen===colour&&counts[colour]>0?profile.omenPick:0;
  const score=colour=>counts[colour]*10+actions[colour]*2+(view.gaps.has(colour)?(view.danger?12:4):0)-(colour===avoid?1:0)+omen(colour);
  return COLORS.toSorted((a,b)=>score(b)-score(a))[0];
}

function scoreCard(card,state,me,view,P){
  const hand=me.hand,after=hand.filter(c=>c.id!==card.id),n=after.length;
  if(n===0)return card.type===TYPES.PLUS?-40:1000;
  let score=0;
  const setColour=card.color!=='wild'?card.color:null;
  const follow=setColour?after.filter(c=>c.color===setColour).length:0;
  const wildsLeft=after.filter(isWild).length;
  const canFollow=setColour?after.some(c=>c.color===setColour||isWild(c)||(c.type===card.type&&card.type!==TYPES.NUMBER)||(c.type===TYPES.NUMBER&&card.type===TYPES.NUMBER&&c.value===card.value)):true;
  if(setColour)score+=follow*P.followWeight+(view.gaps.has(setColour)?P.missingColour*(view.danger?2:1):0);
  // Omen profiles (Kesh) like to keep the table on the hand's omen colour.
  if(P.omenBias&&setColour&&setColour===view.omen)score+=P.omenBias;
  switch(card.type){
    case TYPES.NUMBER:score+=2;break;
    case TYPES.REVERSE:score+=view.twoPlayer?2:3;break;
    case TYPES.STOP:score+=canFollow?(view.twoPlayer?8:6)+(view.danger?6:0):3;break;
    case TYPES.PLUS:score+=canFollow?7:-15;break;
    case TYPES.PLUS2:score+=view.danger?P.curseDanger:view.opp<=4?P.curseMidgame:n<=2?4:-P.holdCurse;break;
    case TYPES.TAKI:score+=follow*P.crossbowPerCard-(follow===0?4:0);break;
    case TYPES.SUPER_TAKI:{const run=state.activeColor?after.filter(c=>c.color===state.activeColor).length:Math.max(...Object.values(colourCounts(after)));score+=run*P.crossbowPerCard-10;break;}
    case TYPES.CHANGE_COLOR:score+=-P.holdWild+(view.danger?10:0)-(n<=2?6:0);break;
    case TYPES.KING:score+=(n<=2&&after.some(c=>c.type!==TYPES.PLUS)?12:-P.holdKing)+(view.danger?6:0);break;
  }
  // Pressure profiles (Ragna) keep the tempo up and punish a short hand.
  if(P.actionTempo&&[TYPES.STOP,TYPES.PLUS,TYPES.PLUS2,TYPES.TAKI].includes(card.type)&&canFollow)score+=P.actionTempo;
  if(P.pressure&&view.opp<=3&&[TYPES.STOP,TYPES.PLUS2,TYPES.TAKI,TYPES.SUPER_TAKI].includes(card.type))score+=P.pressure*(view.opp<=1?1.5:1);
  // Control profiles (Veyra, Gorvan) keep their answers — a Shield, a Curse, a King —
  // for the moment that needs one, then spend them without hesitation.
  if(P.holdStop&&card.type===TYPES.STOP&&!view.danger&&view.opp>3)score-=P.holdStop;
  if(P.disrupt&&view.opp<=2&&[TYPES.STOP,TYPES.PLUS2,TYPES.KING].includes(card.type))score+=P.disrupt*(view.opp<=1?1.4:1);
  // At a busy table a Turnabout sends the turn away from a player about to go out.
  if(P.redirect&&card.type===TYPES.REVERSE&&!view.twoPlayer)score+=view.nextCount<=2&&view.prevCount>2?P.redirect:view.nextCount>3?-P.redirect*.3:0;
  // Plan the finish: never strand a lone Quickstep, and keep a wild as the closer.
  if(n===1&&after[0].type===TYPES.PLUS)score-=20;
  if(!isWild(card)&&n<=2&&wildsLeft)score+=5;
  return score;
}

function pickWithJudgement(cards,score,random,P,note){
  const ranked=cards.map(card=>({card,score:score(card)+random()*P.jitter})).toSorted((a,b)=>b.score-a.score);
  // A reasonable human slip: now and then take the close second option.
  if(ranked.length>1&&ranked[0].score<500&&ranked[0].score-ranked[1].score<P.mistakeWindow&&random()<P.mistakeRate){if(note)note.slip=true;return ranked[1].card;}
  return ranked[0].card;
}

// Inside one's own loaded Crossbow: empty the colour, keep the most punishing
// card for the end (its effect is the one that resolves), then fire.
function crossbowStep(state,me,legal,view,random){
  if(me.hand.length===1&&legal.length&&legal[0].type!==TYPES.PLUS)return legal[0];
  const inColour=legal.filter(card=>card.color===state.taki.color);
  if(!inColour.length){
    // Only wilds can continue. Fire unless a wild finishes the round.
    if(legal.length===me.hand.length&&legal.length===1)return legal[0];
    return null;
  }
  const rank=card=>{const effect=ACTION_RANK[card.type]??0;
    // Save Curse/Shield for last; when the opponent is close, the Curse finishes the volley.
    const finisher=card.type===TYPES.PLUS2?(view.danger?6:5):effect;
    return -finisher*10+random();};
  return inColour.toSorted((a,b)=>rank(b)-rank(a))[0];
}

// How likely is the opponent to be unable to answer? Estimated from the cards
// Edrin has not seen (full deck minus his hand minus the face-up discards) —
// counting, not peeking. A colour they have already failed to follow is
// treated as absent from their hand.
const FULL_DECK=createDeck();
export function stuckChance(state,meId,gaps=new Set()){
  const me=state.players.find(p=>p.id===meId),opp=Math.min(...state.players.filter(p=>p.id!==meId).map(p=>p.hand.length));
  const seen=new Set([...me.hand,...state.discardPile].map(card=>card.id));
  const top=effectiveTopCard(state),colour=state.activeColor;
  const answers=card=>{
    if(state.activePenalty?.kind==='plus2')return card.type===TYPES.PLUS2||card.type===TYPES.KING;
    if(top?.type===TYPES.KING&&!colour)return true;
    if(isWild(card))return true;
    if(colour&&card.color===colour)return !gaps.has(colour);
    return cardMatches(card,top);
  };
  let unseen=0,matching=0;for(const card of FULL_DECK){if(seen.has(card.id))continue;unseen++;if(answers(card))matching++;}
  let p=1;for(let i=0;i<opp;i++)p*=Math.max(0,unseen-matching-i)/Math.max(1,unseen-i);
  return p;
}

// Whole-turn planning. Every card in a turn is Edrin's own, so he can look
// ahead through Shield / Quickstep / King / Crossbow chains with no hidden
// information at all, and judge where each line leaves the table.
function evaluateTurnEnd(state,meId,startCards,P){
  const me=state.players.find(p=>p.id===meId),others=state.players.filter(p=>p.id!==meId);
  if(state.phase==='finished')return state.winnerId===meId?10000:-10000;
  const opp=Math.min(...others.map(p=>p.hand.length)),gaps=observedGaps(state,meId).get(others.find(p=>p.hand.length===opp)?.id)||new Set();
  let score=(startCards-me.hand.length)*P.shedWeight-me.hand.length*0;
  if(state.activePenalty&&currentPlayer(state).id!==meId)score+=state.activePenalty.amount*P.penaltyWeight;
  const colour=state.activeColor;
  if(colour)score+=me.hand.filter(c=>c.color===colour).length*P.endFollow;
  if(currentPlayer(state).id!==meId){const stuck=stuckChance(state,meId,gaps);score+=stuck*(state.activePenalty?state.activePenalty.amount*P.penaltyStuck:P.stuckWeight)*(opp<=2?P.dangerStuck:1);}
  score+=me.hand.filter(isWild).length*P.wildKept;
  score+=me.hand.filter(c=>c.type===TYPES.PLUS2).length*(opp<=2?0:P.curseKept);
  if(me.hand.length===1&&me.hand[0].type===TYPES.PLUS)score-=P.strandedQuickstep;
  return score;
}
function planTurn(state,me,P,random,note){
  const meId=me.id,start=me.hand.length;let nodes=0;
  const options=s=>{
    const player=currentPlayer(s);
    if(s.awaitingColor?.playerId===player.id)return [{type:ACTIONS.CHOOSE_COLOR,playerId:player.id,color:veteranColour(player.hand,s,player,{avoid:s.awaitingColor.next==='openTaki'?null:s.activeColor,profile:P})}];
    if(s.taki?.open&&s.taki.ownerId===player.id){const view=tableView(s,player),card=crossbowStep(s,player,getLegalCards(s,player.id),view,()=>.5);return [card?{type:ACTIONS.PLAY,playerId:player.id,cardId:card.id}:{type:ACTIONS.END_TURN,playerId:player.id}];}
    const legal=getLegalCards(s,player.id);
    if(!legal.length)return [{type:ACTIONS.DRAW,playerId:player.id}];
    if(s.activePenalty){const curse=legal.find(c=>c.type===TYPES.PLUS2);return [{type:ACTIONS.PLAY,playerId:player.id,cardId:(curse||legal[0]).id}];}
    return legal.map(card=>({type:ACTIONS.PLAY,playerId:player.id,cardId:card.id}));
  };
  const search=(s,depth)=>{
    if(s.phase!=='playing'||currentPlayer(s).id!==meId||depth>=P.planDepth||nodes>=P.planNodes)return evaluateTurnEnd(s,meId,start,P);
    let best=-Infinity;
    for(const action of options(s)){if(nodes>=P.planNodes)break;nodes++;let next;try{next=applyAction(s,action);}catch{continue;}best=Math.max(best,search(next,depth+1));}
    return best===-Infinity?evaluateTurnEnd(s,meId,start,P):best;
  };
  const first=options(state);if(first.length<=1)return null;
  const view=tableView(state,me);
  const scored=first.map(action=>{nodes++;let next;try{next=applyAction(state,action);}catch{return {action,score:-Infinity};}
    const card=me.hand.find(c=>c.id===action.cardId);
    return {action,score:search(next,1)+(card?scoreCard(card,state,me,view,P)*P.priorWeight:0)+random()*P.jitter};}).toSorted((a,b)=>b.score-a.score);
  if(scored.length>1&&scored[0].score<5000&&scored[0].score-scored[1].score<P.mistakeWindow&&random()<P.mistakeRate){if(note)note.slip=true;return scored[1].action;}
  return scored[0].action;
}

// Sampled look-ahead. Edrin imagines plausible hands for the opponent drawn
// only from cards he has not seen (never the real ones), plays each candidate
// forward a few turns with ordinary tavern play, and keeps what tends to work.
// Thirty years of watching hands, not second sight.
const jsonClone=value=>JSON.parse(JSON.stringify(value));
function shuffleInPlace(items,random){for(let i=items.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[items[i],items[j]]=[items[j],items[i]];}return items;}
function imagineTable(state,meId,random,gaps){
  const s=jsonClone(state);s.log=[];
  const me=s.players.find(p=>p.id===meId),seen=new Set([...me.hand,...s.discardPile].map(card=>card.id));
  const pool=shuffleInPlace(FULL_DECK.filter(card=>!seen.has(card.id)).map(card=>({...card})),random);
  for(const player of s.players){
    // Rollouts use plain tavern play for everyone, including Edrin himself.
    player.archetype=player.id===meId?'scholar':'mercenary';
    if(player.id===meId)continue;
    const want=player.hand.length,hand=[];
    // Respect what the table has shown: a colour they could not follow is unlikely in hand.
    for(let i=0;i<pool.length&&hand.length<want;){if(gaps.has(pool[i].color)&&random()<.85){i++;continue;}hand.push(...pool.splice(i,1));}
    while(hand.length<want&&pool.length)hand.push(pool.pop());
    player.hand=hand;
  }
  s.drawPile=pool.slice(0,state.drawPile.length);
  return s;
}
function rollout(state,meId,random,P){
  let s=state;
  for(let ply=0;ply<P.rolloutPlies&&s.phase==='playing';ply++){
    let action;try{action=chooseRolloutAction(s);s=applyAction(s,action);}catch{break;}
  }
  const me=s.players.find(p=>p.id===meId),opp=Math.min(...s.players.filter(p=>p.id!==meId).map(p=>p.hand.length));
  if(s.phase==='finished')return s.winnerId===meId?1+opp*.03:-1-me.hand.length*.03;
  return Math.max(-1,Math.min(1,(opp-me.hand.length)/P.rolloutScale));
}
let chooseRolloutAction=null;
export function setRolloutPolicy(policy){chooseRolloutAction=policy;}
function sampledChoice(state,me,actions,random,P,note){
  if(!chooseRolloutAction||actions.length<2)return null;
  const view=tableView(state,me),totals=actions.map(()=>0);
  const native=globalThis.structuredClone;globalThis.structuredClone=jsonClone;
  const clock=()=>globalThis.performance?.now?.()??Date.now(),started=clock();let samples=0;
  try{
    // A fixed think budget: a fast device imagines more hands, a slow one fewer.
    for(let k=0;k<P.samples&&(k<P.minSamples||clock()-started<P.thinkBudgetMs);k++){samples++;
      const imagined=imagineTable(state,me.id,random,view.gaps);
      const seed=Math.floor(random()*2**31);
      actions.forEach((action,index)=>{
        let next;try{next=applyAction(imagined,action);}catch{totals[index]-=99;return;}
        // Same imagined future for every candidate, so they are compared fairly.
        const saved=Math.random;let x=seed;Math.random=()=>((x=(Math.imul(x,1103515245)+12345)>>>0)/4294967296);
        try{totals[index]+=rollout(next,me.id,random,P);}finally{Math.random=saved;}
      });
    }
  }finally{globalThis.structuredClone=native;}
  const ranked=actions.map((action,index)=>{const card=me.hand.find(c=>c.id===action.cardId);return {action,score:totals[index]/Math.max(1,samples)+(card?scoreCard(card,state,me,view,P)*P.searchPrior:0)+random()*.01};}).toSorted((a,b)=>b.score-a.score);
  if(ranked.length>1&&ranked[0].score-ranked[1].score<P.searchMistakeWindow&&random()<P.mistakeRate){if(note)note.slip=true;return ranked[1].action;}
  return ranked[0].action;
}

// `note` (optional) is filled with {slip:true} when the choice was a knowing
// second-best: the only time a character may honestly blame herself for a card.
export function chooseVeteranAction(state,{random=Math.random,profile=VETERAN_PROFILE,note=null}={}){
  const me=currentPlayer(state),view=tableView(state,me,profile);
  if(state.awaitingColor?.playerId===me.id)return {type:ACTIONS.CHOOSE_COLOR,playerId:me.id,color:veteranColour(me.hand,state,me,{avoid:state.awaitingColor.next==='openTaki'?null:state.activeColor,profile})};
  const legal=getLegalCards(state,me.id);
  // An open Crossbow handed over by the previous player: empty its colour if
  // we hold any, otherwise decide as on any ordinary turn.
  const pickup=crossbowAwaitsPickup(state)&&state.taki.ownerId===me.id;
  if(pickup){const card=crossbowStep(state,me,legal,view,random);if(card&&card.color===state.taki.color)return {type:ACTIONS.PLAY,playerId:me.id,cardId:card.id};}
  if(state.taki?.open&&!pickup){
    if(state.taki.ownerId===me.id){const card=crossbowStep(state,me,legal,view,random);return card?{type:ACTIONS.PLAY,playerId:me.id,cardId:card.id}:{type:ACTIONS.END_TURN,playerId:me.id};}
    if(legal.length)return {type:ACTIONS.PLAY,playerId:me.id,cardId:pickWithJudgement(legal,card=>scoreCard(card,state,me,view,profile),random,profile,note).id};
    return {type:ACTIONS.DRAW,playerId:me.id};
  }
  if(!legal.length)return {type:ACTIONS.DRAW,playerId:me.id};
  if(state.activePenalty){
    // Pass the Curse back rather than spend the King, unless the King is all we have.
    const curse=legal.find(card=>card.type===TYPES.PLUS2);if(curse)return {type:ACTIONS.PLAY,playerId:me.id,cardId:curse.id};
    return {type:ACTIONS.PLAY,playerId:me.id,cardId:legal[0].id};
  }
  // Sampled look-ahead only where it matters: the late game, or a real choice between strong cards.
  const lateGame=me.hand.length<=profile.lateHand||view.opp<=profile.lateOpp;
  if(profile.samples>0&&lateGame){const sampled=sampledChoice(state,me,legal.map(card=>({type:ACTIONS.PLAY,playerId:me.id,cardId:card.id})),random,profile,note);if(sampled)return sampled;}
  if(profile.planNodes>0){const planned=planTurn(state,me,profile,random,note);if(planned)return planned;}
  const best=pickWithJudgement(legal,card=>scoreCard(card,state,me,view,profile),random,profile,note);
  return {type:ACTIONS.PLAY,playerId:me.id,cardId:best.id};
}

// Ragna: the same fair, public-information planner, tuned for pressure. She
// spends Curses and Stops to keep the tempo, punishes a short hand hard, and
// hoards less than Edrin. Fewer slips: she is a disciplined player.
export const PRESSURE_PROFILE=Object.freeze({
  ...VETERAN_PROFILE,
  holdWild:9,holdKing:7,holdCurse:1,curseMidgame:14,curseDanger:32,crossbowPerCard:7,
  actionTempo:4,pressure:9,mistakeRate:.07,lateOpp:5
});

// Kesh: the same fair, public-information judgement, without the look-ahead.
// Balanced and patient: he keeps a Curse or a King for when it matters, spends
// Runes readily (he likes to change the colour), and leans toward the hand's
// omen colour — the first card turned up. That superstition costs him a little
// now and then; it is never a blunder and never a hidden-card advantage.
// Variable rather than sharp: more jitter, and a rare (~4%) close second choice.
export const OMEN_PROFILE=Object.freeze({
  ...VETERAN_PROFILE,
  samples:0,
  holdWild:7,holdKing:9,holdCurse:4,curseMidgame:9,curseDanger:24,
  jitter:2.5,mistakeRate:.04,mistakeWindow:6,
  omenBias:3,omenPick:9
});

// Voiced guests at a Tavern table play table-strength versions of their Duel AI:
// the same fair judgement and personality weights, without the look-ahead, and a
// few more human slips. Personality, not a boss fight in one seat.
export const TAVERN_VETERAN_PROFILE=Object.freeze({...VETERAN_PROFILE,samples:0,mistakeRate:.12});
export const TAVERN_PRESSURE_PROFILE=Object.freeze({...PRESSURE_PROFILE,samples:0,mistakeRate:.1});

// Veyra: control. The same fair, public-information planner, tuned to disrupt
// momentum: she keeps a Shield, a Curse or a King back while the table is calm and
// spends them hard when someone gets close; at a busy table she turns the order
// away from a player about to go out. A competent, calm player — her chaos is in
// how she reads the table, never in the cards she chooses. A short look-ahead
// (fewer imagined hands than Edrin), a rare close second choice.
export const CONTROL_PROFILE=Object.freeze({
  ...VETERAN_PROFILE,
  samples:6,minSamples:3,thinkBudgetMs:28,
  holdWild:12,holdKing:13,holdCurse:9,curseMidgame:6,curseDanger:30,
  holdStop:5,disrupt:10,redirect:7,
  jitter:1.8,mistakeRate:.06,mistakeWindow:5
});
// Gorvan: patient. He is comfortable waiting: the most reluctant of the cast to spend
// a Rune, a King or a Curse early, and the least likely to panic. When a hand gets
// dangerous he answers it, precisely. Steady rather than sharp; very few slips.
export const PATIENT_PROFILE=Object.freeze({
  ...VETERAN_PROFILE,
  samples:8,minSamples:4,thinkBudgetMs:30,
  holdWild:17,holdKing:15,holdCurse:10,curseMidgame:4,curseDanger:29,
  holdStop:4,disrupt:8,redirect:4,
  jitter:1,mistakeRate:.05,mistakeWindow:5
});
// At a Tavern table: their judgement without the look-ahead, and a few more slips.
export const TAVERN_CONTROL_PROFILE=Object.freeze({...CONTROL_PROFILE,samples:0,mistakeRate:.1});
export const TAVERN_PATIENT_PROFILE=Object.freeze({...PATIENT_PROFILE,samples:0,mistakeRate:.09});
