import { createInitialState, restoreState, serializeState } from './engine.js';
import { mulberry32 } from './cards.js';

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
  {name:'קֶשׁ',nameKey:'kesh',kind:'ai',archetype:'traveler',house:'blue',voiced:true},
  {name:'ויירה',nameKey:'veyra',kind:'ai',archetype:'tavern-witch',house:'green',voiced:true},
  {name:'גורבן',nameKey:'gorvan',kind:'ai',archetype:'tavern-noble',house:'red',voiced:true},
  {name:'צייד הראשים',nameKey:'bounty_hunter',kind:'ai',archetype:'tavern-bounty',house:'blue',voiced:true}
]);
export const VOICED_GUEST_KEYS=Object.freeze(VOICED_TAVERN_GUESTS.map(guest=>guest.nameKey));
// Settings → "Voiced characters at the Tavern": on (default) · off.
// v116: the unvoiced regulars no longer sit at a Tavern table. With voiced characters on, every
// Tavern Match seats three of the voiced cast; the regulars only fill the table when they are off.
// ('often' is the stored value for on; an older 'sometimes' means on as well.)
// TAVERN_GUESTS_ENABLED is the code-level kill switch (the player's own choice is in Settings).
export const TAVERN_GUESTS_ENABLED=true;
export const TAVERN_GUEST_MODES=Object.freeze(['off','often']);
export const TAVERN_GUEST_SEATS=3;
// How many curated banter exchanges each pair shares (duel/tavern-director.js →
// TAVERN_BANTER; a test keeps the two in step). Pairs who can trade lines are
// strongly preferred: weight 1 + 3 × exchanges, so a pair with none is rare.
export const TAVERN_GUEST_PAIRS=Object.freeze({'bramm+edrin':4,'bramm+kesh':2,'bramm+ragna':4,'edrin+kesh':4,'edrin+ragna':7,'kesh+ragna':2,
  'kesh+veyra':1,'ragna+veyra':2,'edrin+veyra':1,'bramm+veyra':3,
  'bramm+gorvan':4,'edrin+gorvan':4,'gorvan+ragna':4,'gorvan+kesh':4,'gorvan+veyra':4,
  'bounty_hunter+gorvan':3,'bounty_hunter+edrin':3,'bounty_hunter+ragna':2,'bounty_hunter+kesh':2,'bounty_hunter+veyra':2,'bounty_hunter+bramm':2});
// A little extra weight for established chemistry the owner especially wants heard (Veyra and Kesh).
export const TAVERN_PAIR_CHEMISTRY=Object.freeze({'kesh+veyra':1.6});
const pairKey=(a,b)=>[a,b].sort().join('+'),pairWeight=(a,b)=>(1+3*(TAVERN_GUEST_PAIRS[pairKey(a,b)]||0))*(TAVERN_PAIR_CHEMISTRY[pairKey(a,b)]||1);
const HUMAN_SEAT=Object.freeze({id:'p0',name:'אתם',nameKey:'you',kind:'human',archetype:'wanderer',house:'yellow'});
const combos=(items,k)=>k===0?[[]]:items.flatMap((item,i)=>combos(items.slice(i+1),k-1).map(rest=>[item,...rest]));
export function tavernGuestsFor(seed,{mode='often',voiced=true,guests=null}={}){
  let value=(seed>>>0)||1;const next=()=>{value=Math.imul(value^(value>>>15),0x2c1b3c6d)>>>0;value=(value+0x9e3779b9)>>>0;return value;};
  const regulars=[...TAVERN_REGULARS];let seated=[];
  const on=TAVERN_GUESTS_ENABLED&&voiced&&mode!=='off';
  // `guests` (the company picker, debug/QA) names voiced guests outright; the evening fills any empty seat.
  if(guests)seated=VOICED_TAVERN_GUESTS.filter(item=>guests.slice(0,TAVERN_GUEST_SEATS).includes(item.nameKey));
  if(on&&seated.length<TAVERN_GUEST_SEATS){
    // Every possible company for the empty seats, weighted by the banter pairs the whole table shares.
    const pool=VOICED_TAVERN_GUESTS.filter(item=>!seated.includes(item)),groups=combos(pool,TAVERN_GUEST_SEATS-seated.length);
    const weights=groups.map(group=>{const table=[...seated,...group];return table.length<2?1:combos(table,2).reduce((sum,[a,b])=>sum+pairWeight(a.nameKey,b.nameKey),0);});
    let pick=next()/2**32*weights.reduce((a,b)=>a+b,0),index=0;while(index<groups.length-1&&(pick-=weights[index])>=0)index++;
    seated=[...seated,...groups[index]];
  }
  // Voiced characters off: the unvoiced regulars keep the table.
  while(seated.length<3)seated.push(regulars.splice(next()%regulars.length,1)[0]);
  // Shuffle the seats so a guest can sit anywhere at the table.
  for(let i=seated.length-1;i>0;i--){const j=next()%(i+1);[seated[i],seated[j]]=[seated[j],seated[i]];}
  return seated;
}
export const TAVERN_ROSTER=Object.freeze([HUMAN_SEAT,...TAVERN_REGULARS.slice(0,3)].map((player,index)=>Object.freeze({...player,id:`p${index}`})));

const freshRoster=roster=>roster.map(({hand,...player})=>({...player}));
const scoreMap=roster=>Object.fromEntries(roster.map(p=>[p.id,0]));

export function createTavernMatch({seed=Date.now(),roster=null,voicedGuests=true,guestMode='often',guests=null}={}){
  const players=freshRoster(roster||[HUMAN_SEAT,...tavernGuestsFor(seed,{voiced:voicedGuests,mode:guestMode,guests})].map((player,index)=>({...player,id:`p${index}`})));
  return {version:MATCH_VERSION,mode:'tavern',phase:'round',round:1,totalRounds:5,suddenDeath:false,seed,scores:scoreMap(players),roster:players,results:[],championId:null,game:createInitialState({playerCount:4,players,seed})};
}

// v105: Quick Play strangers are drawn at random from every name the tavern knows: the
// quick-table names, the older guest names, the ordinary regulars and the voiced cast.
// Names only — Quick Play stays unvoiced: no archetype, house, portrait or voice comes along,
// and every voiced hook is tied to a Duel or Tavern seat, never to a name.
const QUICK_TABLE_NAMES=[['אדרן','adren','m'],['מירא','myra','f'],['טורן','toren','m'],['ליבה','leva','f'],['סיג','sig','m'],['אלבה','alva','f'],['האל','hal','m'],['רונה','runa','f'],['דריק','derik','m'],
  ['לוסיאן','lucien','m'],['איניגו','inigo','m'],['לידיה','lydia','f'],['וירן','viren','m'],['סורן','soren','m'],['ויילין','waylin','m']];
const QUICK_GENDER={aila:'f',ron:'f',bran:'f',sela:'f',ragna:'f',veyra:'f'};
// The Bounty Hunter is the exception: he has no name to lend a stranger, and nothing generic
// may ever speak through him, so he never sits at a Quick Play table.
export const QUICK_NAME_EXCLUDED=Object.freeze(['bounty_hunter']);
export const QUICK_NAME_POOL=Object.freeze([...QUICK_TABLE_NAMES.map(([name,nameKey,gender])=>({name,nameKey,gender})),
  ...[...TAVERN_REGULARS,...VOICED_TAVERN_GUESTS].filter(({nameKey})=>!QUICK_NAME_EXCLUDED.includes(nameKey)).map(({name,nameKey})=>({name,nameKey,gender:QUICK_GENDER[nameKey]||'m'}))].map(Object.freeze));
export function quickRosterFor(seed,playerCount){
  const random=mulberry32(((seed>>>0)^0x51ed27a3)>>>0),pool=[...QUICK_NAME_POOL];
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
  return [{id:'p0',name:'אתם',nameKey:null,kind:'human'},...pool.slice(0,playerCount-1).map((item,index)=>({id:`p${index+1}`,name:item.name,nameKey:item.nameKey,gender:item.gender,kind:'ai'}))];
}
export function createQuickSession({playerCount=3,seed=Date.now()}={}){
  const supportedCount=Math.max(2,Math.min(6,playerCount));
  return {version:MATCH_VERSION,mode:'quick',phase:'round',round:1,totalRounds:1,suddenDeath:false,seed,scores:{},roster:null,results:[],championId:null,game:createInitialState({playerCount:supportedCount,players:quickRosterFor(seed,supportedCount),seed,firstPlayerIndex:Math.abs(Math.floor(seed/7))%supportedCount})};
}

export function createDuelSession({seed=Date.now(),opponent}={}){
  if(!opponent?.id)throw new Error('Duel opponent is required');
  const duelHouses={ron:'red',aila:'green',bran:'blue',sela:'yellow',kesh:'blue',roderic:'red',lio:'yellow',mograth:'green',harrow:'blue',rusk:'yellow',bramm:'red',edrin:'green',ragna:'blue',veyra:'green',gorvan:'red',bounty_hunter:'blue'};
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
  if(raw?.game&&raw.version===MATCH_VERSION){if(raw.mode==='quick'&&raw.game.players?.length>6)throw new Error('Unsupported quick-game player count');raw.game=restoreState(serializeState(raw.game));const keys={אתם:'you',איילה:'aila',רון:'ron',בראן:'bran','סֶלָה':'sela','קֶשׁ':'kesh',רודריק:'roderic',ליאו:'lio','מוגרת׳':'mograth',הארו:'harrow',ראסק:'rusk',בראם:'bramm',אדרין:'edrin',ראגנה:'ragna',ויירה:'veyra',גורבן:'gorvan','צייד הראשים':'bounty_hunter'};for(const group of [raw.roster||[],raw.game.players||[]])for(const player of group)player.nameKey||=player.duelOpponentId||keys[player.name];return raw;}
  if(raw?.players)return createQuickSessionFromLegacy(raw);
  throw new Error('Unsupported saved session');
}
function createQuickSessionFromLegacy(game){return {version:MATCH_VERSION,mode:'quick',phase:game.phase==='finished'?'matchFinished':'round',round:1,totalRounds:1,suddenDeath:false,seed:game.seed||Date.now(),scores:{},roster:null,results:[],championId:game.winnerId||null,game:restoreState(serializeState(game))};}
