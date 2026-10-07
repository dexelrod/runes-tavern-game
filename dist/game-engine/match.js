import { createInitialState, restoreState, serializeState } from './engine.js';

export const MATCH_VERSION=1;
// The ordinary regulars who can sit at a Tavern Match (seeded, so a saved match
// always restores the same table).
export const TAVERN_REGULARS=Object.freeze([
  {name:'איילה',nameKey:'aila',kind:'ai',archetype:'hunter',house:'green'},
  {name:'רון',nameKey:'ron',kind:'ai',archetype:'bard',house:'red'},
  {name:'בראן',nameKey:'bran',kind:'ai',archetype:'mercenary',house:'blue'},
  {name:'סֶלָה',nameKey:'sela',kind:'ai',archetype:'scholar',house:'yellow'},
  {name:'רודריק',nameKey:'roderic',kind:'ai',archetype:'mercenary',house:'red'},
  {name:'ליאו',nameKey:'lio',kind:'ai',archetype:'bard',house:'yellow'},
  {name:'מוגרת׳',nameKey:'mograth',kind:'ai',archetype:'mercenary',house:'green'},
  {name:'הארו',nameKey:'harrow',kind:'ai',archetype:'hunter',house:'blue'},
  {name:'ראסק',nameKey:'rusk',kind:'ai',archetype:'mysterious',house:'yellow'}
]);
// The voiced cast drinks in the same tavern. Now and then one of them (rarely
// two, or three) happens to be playing tonight. Their Tavern archetypes are table-strength
// versions of their Duel play: personality comes from the voice, not a boss AI.
export const VOICED_TAVERN_GUESTS=Object.freeze([
  {name:'בראם',nameKey:'bramm',kind:'ai',archetype:'mercenary',house:'red',voiced:true},
  {name:'אדרין',nameKey:'edrin',kind:'ai',archetype:'tavern-veteran',house:'green',voiced:true},
  {name:'ראגנה',nameKey:'ragna',kind:'ai',archetype:'tavern-warrior',house:'blue',voiced:true},
  {name:'קֶשׁ',nameKey:'kesh',kind:'ai',archetype:'traveler',house:'blue',voiced:true}
]);
export const VOICED_GUEST_KEYS=Object.freeze(VOICED_TAVERN_GUESTS.map(guest=>guest.nameKey));
// Settings → "Voiced characters at the Tavern": off · sometimes (default) · often ("Every evening").
// Tuning: share of new evenings by number of voiced guests. When guests come, they
// usually come as company — a pair rather than one alone — and "Every evening"
// always seats two, now and then three.
// TAVERN_GUESTS_ENABLED is the code-level kill switch (the player's own choice is in Settings).
export const TAVERN_GUESTS_ENABLED=true;
export const TAVERN_GUEST_MODES=Object.freeze(['off','sometimes','often']);
export const TAVERN_GUEST_ODDS=Object.freeze({sometimes:Object.freeze({one:.08,two:.27,three:0}),often:Object.freeze({one:0,two:.75,three:.25})});
// How many curated banter exchanges each pair shares (duel/tavern-director.js →
// TAVERN_BANTER; a test keeps the two in step). Pairs who can trade lines are
// strongly preferred: weight 1 + 3 × exchanges, so a pair with none is rare.
export const TAVERN_GUEST_PAIRS=Object.freeze({'bramm+edrin':3,'bramm+kesh':2,'bramm+ragna':3,'edrin+kesh':0,'edrin+ragna':4,'kesh+ragna':0});
const pairKey=(a,b)=>[a,b].sort().join('+'),pairWeight=(a,b)=>1+3*(TAVERN_GUEST_PAIRS[pairKey(a,b)]||0);
const HUMAN_SEAT=Object.freeze({id:'p0',name:'אתם',nameKey:'you',kind:'human',archetype:'wanderer',house:'yellow'});
const combos=(items,k)=>k===0?[[]]:items.flatMap((item,i)=>combos(items.slice(i+1),k-1).map(rest=>[item,...rest]));
export function tavernGuestsFor(seed,{mode='sometimes',voiced=true,guests=null}={}){
  let value=(seed>>>0)||1;const next=()=>{value=Math.imul(value^(value>>>15),0x2c1b3c6d)>>>0;value=(value+0x9e3779b9)>>>0;return value;};
  const regulars=[...TAVERN_REGULARS];let seated=[];
  if(!voiced)mode='off';
  // `guests` (debug/QA) names the voiced guests outright; otherwise the evening rolls for them.
  if(guests)seated=VOICED_TAVERN_GUESTS.filter(item=>guests.slice(0,3).includes(item.nameKey));
  else if(TAVERN_GUESTS_ENABLED&&TAVERN_GUEST_ODDS[mode]){
    const odds=TAVERN_GUEST_ODDS[mode],roll=next()/2**32,count=roll<odds.three?3:roll<odds.three+odds.two?2:roll<odds.three+odds.two+odds.one?1:0;
    if(count){
      // Every possible group of that size, weighted by how many banter pairs it contains.
      const groups=combos(VOICED_TAVERN_GUESTS,count),weights=groups.map(group=>count===1?1:combos(group,2).reduce((sum,[a,b])=>sum+pairWeight(a.nameKey,b.nameKey),0));
      let pick=next()/2**32*weights.reduce((a,b)=>a+b,0),index=0;while(index<groups.length-1&&(pick-=weights[index])>=0)index++;
      seated=[...groups[index]];
    }
  }
  while(seated.length<3)seated.push(regulars.splice(next()%regulars.length,1)[0]);
  // Shuffle the seats so a guest can sit anywhere at the table.
  for(let i=seated.length-1;i>0;i--){const j=next()%(i+1);[seated[i],seated[j]]=[seated[j],seated[i]];}
  return seated;
}
export const TAVERN_ROSTER=Object.freeze([HUMAN_SEAT,...TAVERN_REGULARS.slice(0,3)].map((player,index)=>Object.freeze({...player,id:`p${index}`})));

const freshRoster=roster=>roster.map(({hand,...player})=>({...player}));
const scoreMap=roster=>Object.fromEntries(roster.map(p=>[p.id,0]));

export function createTavernMatch({seed=Date.now(),roster=null,voicedGuests=true,guestMode='sometimes',guests=null}={}){
  const players=freshRoster(roster||[HUMAN_SEAT,...tavernGuestsFor(seed,{voiced:voicedGuests,mode:guestMode,guests})].map((player,index)=>({...player,id:`p${index}`})));
  return {version:MATCH_VERSION,mode:'tavern',phase:'round',round:1,totalRounds:5,suddenDeath:false,seed,scores:scoreMap(players),roster:players,results:[],championId:null,game:createInitialState({playerCount:4,players,seed})};
}

export function createQuickSession({playerCount=3,seed=Date.now()}={}){
  const supportedCount=Math.max(2,Math.min(6,playerCount));
  return {version:MATCH_VERSION,mode:'quick',phase:'round',round:1,totalRounds:1,suddenDeath:false,seed,scores:{},roster:null,results:[],championId:null,game:createInitialState({playerCount:supportedCount,seed,firstPlayerIndex:Math.abs(Math.floor(seed/7))%supportedCount})};
}

export function createDuelSession({seed=Date.now(),opponent}={}){
  if(!opponent?.id)throw new Error('Duel opponent is required');
  const duelHouses={ron:'red',aila:'green',bran:'blue',sela:'yellow',kesh:'blue',roderic:'red',lio:'yellow',mograth:'green',harrow:'blue',rusk:'yellow',bramm:'red',edrin:'green',ragna:'blue'};
  const players=[{id:'p0',name:'אתם',nameKey:'you',kind:'human',archetype:'wanderer',house:'yellow'},{id:'p1',name:opponent.name,nameKey:opponent.id,kind:'ai',archetype:opponent.archetype,house:duelHouses[opponent.id]||'blue',duelOpponentId:opponent.id}];
  return {version:MATCH_VERSION,mode:'duel',phase:'round',round:1,totalRounds:5,suddenDeath:false,seed,opponentId:opponent.id,scores:scoreMap(players),roster:freshRoster(players),results:[],championId:null,game:createInitialState({playerCount:2,players,seed})};
}

export function calculateRoundScore(game,winnerId=game.winnerId){return game.players.filter(p=>p.id!==winnerId).reduce((sum,p)=>sum+p.hand.length,0);}

export function finishRound(input){
  const match=structuredClone(input); if(match.phase!=='round'||match.game.phase!=='finished'||!match.game.winnerId)throw new Error('Round is not finished');
  const winnerId=match.game.winnerId,points=calculateRoundScore(match.game,winnerId);
  if(match.mode==='quick'){match.phase='matchFinished';match.championId=winnerId;match.results.push({round:1,winnerId,points});return match;}
  match.scores[winnerId]=(match.scores[winnerId]||0)+points;
  match.results.push({round:match.round,winnerId,points,remaining:Object.fromEntries(match.game.players.filter(p=>p.id!==winnerId).map(p=>[p.id,p.hand.length])),suddenDeath:match.suddenDeath});
  if(match.suddenDeath){match.phase='matchFinished';match.championId=winnerId;return match;}
  if(match.round<match.totalRounds){match.phase='betweenRounds';return match;}
  const high=Math.max(...Object.values(match.scores)),leaders=Object.keys(match.scores).filter(id=>match.scores[id]===high);
  if(leaders.length===1){match.phase='matchFinished';match.championId=leaders[0];}
  else{match.phase='betweenRounds';match.suddenDeath=true;match.tiedPlayerIds=leaders;}
  return match;
}

// The opening lead rotates around the table each round (and alternates in a
// Duel) so the human does not always move first.
export function roundLeader(match){return match.results.length%Math.max(1,match.roster?.length||1);}

export function startNextRound(input){
  const match=structuredClone(input); if(!['tavern','duel'].includes(match.mode)||match.phase!=='betweenRounds')throw new Error('No next round');
  if(!match.suddenDeath)match.round++;
  match.phase='round';match.game=createInitialState({playerCount:match.roster.length,players:freshRoster(match.roster),seed:match.seed+match.results.length*9973,firstPlayerIndex:roundLeader(match)});return match;
}

export function standings(match){return match.roster.map(player=>({...player,score:match.scores[player.id]||0})).toSorted((a,b)=>b.score-a.score||a.name.localeCompare(b.name,'he'));}
export function serializeSession(match){return JSON.stringify(match);}
export function restoreSession(json){
  const raw=typeof json==='string'?JSON.parse(json):structuredClone(json);
  if(raw?.game&&raw.version===MATCH_VERSION){if(raw.mode==='quick'&&raw.game.players?.length>6)throw new Error('Unsupported quick-game player count');raw.game=restoreState(serializeState(raw.game));const keys={אתם:'you',איילה:'aila',רון:'ron',בראן:'bran','סֶלָה':'sela','קֶשׁ':'kesh',רודריק:'roderic',ליאו:'lio','מוגרת׳':'mograth',הארו:'harrow',ראסק:'rusk',בראם:'bramm',אדרין:'edrin'};for(const group of [raw.roster||[],raw.game.players||[]])for(const player of group)player.nameKey||=player.duelOpponentId||keys[player.name];return raw;}
  if(raw?.players)return createQuickSessionFromLegacy(raw);
  throw new Error('Unsupported saved session');
}
function createQuickSessionFromLegacy(game){return {version:MATCH_VERSION,mode:'quick',phase:game.phase==='finished'?'matchFinished':'round',round:1,totalRounds:1,suddenDeath:false,seed:game.seed||Date.now(),scores:{},roster:null,results:[],championId:game.winnerId||null,game:restoreState(serializeState(game))};}
