import { ACTIONS, applyAction, currentPlayer, effectiveTopCard, getLegalCards } from '../game-engine/engine.js';
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

function tableView(state,me){
  const others=state.players.filter(p=>p.id!==me.id),opp=Math.min(...others.map(p=>p.hand.length));
  const threat=others.find(p=>p.hand.length===opp),gaps=observedGaps(state,me.id).get(threat?.id)||new Set();
  return {opp,gaps,twoPlayer:state.players.length===2,danger:opp<=2};
}

function colourCounts(cards){const counts=Object.fromEntries(COLORS.map(c=>[c,0]));for(const card of cards)if(counts[card.color]!==undefined)counts[card.color]++;return counts;}

export function veteranColour(hand,state,me,{avoid=null}={}){
  const view=tableView(state,me),counts=colourCounts(hand),actions=colourCounts(hand.filter(card=>card.type!==TYPES.NUMBER));
  const score=colour=>counts[colour]*10+actions[colour]*2+(view.gaps.has(colour)?(view.danger?12:4):0)-(colour===avoid?1:0);
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
  // Plan the finish: never strand a lone Quickstep, and keep a wild as the closer.
  if(n===1&&after[0].type===TYPES.PLUS)score-=20;
  if(!isWild(card)&&n<=2&&wildsLeft)score+=5;
  return score;
}

function pickWithJudgement(cards,score,random,P){
  const ranked=cards.map(card=>({card,score:score(card)+random()*P.jitter})).toSorted((a,b)=>b.score-a.score);
  // A reasonable human slip: now and then take the close second option.
  if(ranked.length>1&&ranked[0].score<500&&ranked[0].score-ranked[1].score<P.mistakeWindow&&random()<P.mistakeRate)return ranked[1].card;
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
function planTurn(state,me,P,random){
  const meId=me.id,start=me.hand.length;let nodes=0;
  const options=s=>{
    const player=currentPlayer(s);
    if(s.awaitingColor?.playerId===player.id)return [{type:ACTIONS.CHOOSE_COLOR,playerId:player.id,color:veteranColour(player.hand,s,player,{avoid:s.awaitingColor.next==='openTaki'?null:s.activeColor})}];
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
  if(scored.length>1&&scored[0].score<5000&&scored[0].score-scored[1].score<P.mistakeWindow&&random()<P.mistakeRate)return scored[1].action;
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
function sampledChoice(state,me,actions,random,P){
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
  if(ranked.length>1&&ranked[0].score-ranked[1].score<P.searchMistakeWindow&&random()<P.mistakeRate)return ranked[1].action;
  return ranked[0].action;
}

export function chooseVeteranAction(state,{random=Math.random,profile=VETERAN_PROFILE}={}){
  const me=currentPlayer(state),view=tableView(state,me);
  if(state.awaitingColor?.playerId===me.id)return {type:ACTIONS.CHOOSE_COLOR,playerId:me.id,color:veteranColour(me.hand,state,me,{avoid:state.awaitingColor.next==='openTaki'?null:state.activeColor})};
  const legal=getLegalCards(state,me.id);
  if(state.taki?.open){
    if(state.taki.ownerId===me.id){const card=crossbowStep(state,me,legal,view,random);return card?{type:ACTIONS.PLAY,playerId:me.id,cardId:card.id}:{type:ACTIONS.END_TURN,playerId:me.id};}
    if(legal.length)return {type:ACTIONS.PLAY,playerId:me.id,cardId:pickWithJudgement(legal,card=>scoreCard(card,state,me,view,profile),random,profile).id};
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
  if(profile.samples>0&&lateGame){const sampled=sampledChoice(state,me,legal.map(card=>({type:ACTIONS.PLAY,playerId:me.id,cardId:card.id})),random,profile);if(sampled)return sampled;}
  if(profile.planNodes>0){const planned=planTurn(state,me,profile,random);if(planned)return planned;}
  const best=pickWithJudgement(legal,card=>scoreCard(card,state,me,view,profile),random,profile);
  return {type:ACTIONS.PLAY,playerId:me.id,cardId:best.id};
}
