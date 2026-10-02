import { createInitialState, restoreState, serializeState } from './engine.js';

export const MATCH_VERSION=1;
// The five regulars who can sit at a Tavern Match. Each evening three of them
// take the seats (seeded, so a saved match always restores the same table).
export const TAVERN_REGULARS=Object.freeze([
  {name:'איילה',nameKey:'aila',kind:'ai',archetype:'hunter',house:'green'},
  {name:'רון',nameKey:'ron',kind:'ai',archetype:'bard',house:'red'},
  {name:'בראן',nameKey:'bran',kind:'ai',archetype:'mercenary',house:'blue'},
  {name:'סֶלָה',nameKey:'sela',kind:'ai',archetype:'scholar',house:'yellow'},
  {name:'קֶשׁ',nameKey:'kesh',kind:'ai',archetype:'mysterious',house:'blue'},
  {name:'רודריק',nameKey:'roderic',kind:'ai',archetype:'mercenary',house:'red'},
  {name:'ליאו',nameKey:'lio',kind:'ai',archetype:'bard',house:'yellow'},
  {name:'מוגרת׳',nameKey:'mograth',kind:'ai',archetype:'mercenary',house:'green'},
  {name:'הארו',nameKey:'harrow',kind:'ai',archetype:'hunter',house:'blue'},
  {name:'ראסק',nameKey:'rusk',kind:'ai',archetype:'mysterious',house:'yellow'}
]);
const HUMAN_SEAT=Object.freeze({id:'p0',name:'אתם',nameKey:'you',kind:'human',archetype:'wanderer',house:'yellow'});
export function tavernGuestsFor(seed){
  const pool=[...TAVERN_REGULARS],guests=[];let value=(seed>>>0)||1;
  while(guests.length<3){value=Math.imul(value^(value>>>15),0x2c1b3c6d)>>>0;value=(value+0x9e3779b9)>>>0;guests.push(pool.splice(value%pool.length,1)[0]);}
  return guests;
}
export const TAVERN_ROSTER=Object.freeze([HUMAN_SEAT,...TAVERN_REGULARS.slice(0,3)].map((player,index)=>Object.freeze({...player,id:`p${index}`})));

const freshRoster=roster=>roster.map(({hand,...player})=>({...player}));
const scoreMap=roster=>Object.fromEntries(roster.map(p=>[p.id,0]));

export function createTavernMatch({seed=Date.now(),roster=null}={}){
  const players=freshRoster(roster||[HUMAN_SEAT,...tavernGuestsFor(seed)].map((player,index)=>({...player,id:`p${index}`})));
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
