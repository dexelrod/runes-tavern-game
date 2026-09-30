import { createInitialState, restoreState, serializeState } from './engine.js';

export const MATCH_VERSION=1;
export const TAVERN_ROSTER=Object.freeze([
  {id:'p0',name:'אתם',nameKey:'you',kind:'human',archetype:'wanderer',house:'yellow'},
  {id:'p1',name:'איילה',nameKey:'aila',kind:'ai',archetype:'hunter',house:'green'},
  {id:'p2',name:'רון',nameKey:'ron',kind:'ai',archetype:'bard',house:'red'},
  {id:'p3',name:'בראן',nameKey:'bran',kind:'ai',archetype:'mercenary',house:'blue'}
]);
export const NPC_EASTER_EGGS=Object.freeze(['לוסיאן','איניגו','לידיה','וירן','סורן','ויילין']);

function tavernGuests(roster,seed){
  return roster.map((player,index)=>{
    if(player.kind!=='ai')return {...player};
    const roll=Math.imul(((seed>>>0)+index*0x9e3779b9)>>>0,0x85ebca6b)>>>0;
    return roll%31===0?{...player,name:NPC_EASTER_EGGS[Math.floor(roll/31)%NPC_EASTER_EGGS.length],nameKey:null}:{...player};
  });
}

const freshRoster=roster=>roster.map(({hand,...player})=>({...player}));
const scoreMap=roster=>Object.fromEntries(roster.map(p=>[p.id,0]));

export function createTavernMatch({seed=Date.now(),roster=TAVERN_ROSTER}={}){
  const players=freshRoster(tavernGuests(roster,seed));
  return {version:MATCH_VERSION,mode:'tavern',phase:'round',round:1,totalRounds:5,suddenDeath:false,seed,scores:scoreMap(players),roster:players,results:[],championId:null,game:createInitialState({playerCount:4,players,seed})};
}

export function createQuickSession({playerCount=3,seed=Date.now()}={}){
  const supportedCount=Math.max(2,Math.min(6,playerCount));
  return {version:MATCH_VERSION,mode:'quick',phase:'round',round:1,totalRounds:1,suddenDeath:false,seed,scores:{},roster:null,results:[],championId:null,game:createInitialState({playerCount:supportedCount,seed})};
}

export function createDuelSession({seed=Date.now(),opponent}={}){
  if(!opponent?.id)throw new Error('Duel opponent is required');
  const duelHouses={ron:'red',aila:'green',bran:'blue',sela:'yellow',kesh:'blue',bramm:'red'};
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

export function startNextRound(input){
  const match=structuredClone(input); if(!['tavern','duel'].includes(match.mode)||match.phase!=='betweenRounds')throw new Error('No next round');
  if(!match.suddenDeath)match.round++;
  match.phase='round';match.game=createInitialState({playerCount:match.roster.length,players:freshRoster(match.roster),seed:match.seed+match.results.length*9973});return match;
}

export function standings(match){return match.roster.map(player=>({...player,score:match.scores[player.id]||0})).toSorted((a,b)=>b.score-a.score||a.name.localeCompare(b.name,'he'));}
export function serializeSession(match){return JSON.stringify(match);}
export function restoreSession(json){
  const raw=typeof json==='string'?JSON.parse(json):structuredClone(json);
  if(raw?.game&&raw.version===MATCH_VERSION){if(raw.mode==='quick'&&raw.game.players?.length>6)throw new Error('Unsupported quick-game player count');raw.game=restoreState(serializeState(raw.game));const keys={אתם:'you',איילה:'aila',רון:'ron',בראן:'bran','סֶלָה':'sela','קֶשׁ':'kesh',בראם:'bramm'};for(const group of [raw.roster||[],raw.game.players||[]])for(const player of group)player.nameKey||=player.duelOpponentId||keys[player.name];return raw;}
  if(raw?.players)return createQuickSessionFromLegacy(raw);
  throw new Error('Unsupported saved session');
}
function createQuickSessionFromLegacy(game){return {version:MATCH_VERSION,mode:'quick',phase:game.phase==='finished'?'matchFinished':'round',round:1,totalRounds:1,suddenDeath:false,seed:game.seed||Date.now(),scores:{},roster:null,results:[],championId:game.winnerId||null,game:restoreState(serializeState(game))};}
