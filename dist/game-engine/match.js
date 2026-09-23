import { createInitialState, restoreState, serializeState } from './engine.js';

export const MATCH_VERSION=1;
export const TAVERN_ROSTER=Object.freeze([
  {id:'p0',name:'אתם',kind:'human',archetype:'wanderer',house:'sun'},
  {id:'p1',name:'איילה',kind:'ai',archetype:'hunter',house:'stag'},
  {id:'p2',name:'רון',kind:'ai',archetype:'bard',house:'raven'},
  {id:'p3',name:'בראן',kind:'ai',archetype:'mercenary',house:'dragon'}
]);

const freshRoster=roster=>roster.map(({hand,...player})=>({...player}));
const scoreMap=roster=>Object.fromEntries(roster.map(p=>[p.id,0]));

export function createTavernMatch({seed=Date.now(),roster=TAVERN_ROSTER}={}){
  const players=freshRoster(roster);
  return {version:MATCH_VERSION,mode:'tavern',phase:'round',round:1,totalRounds:5,suddenDeath:false,seed,scores:scoreMap(players),roster:players,results:[],championId:null,game:createInitialState({playerCount:4,players,seed})};
}

export function createQuickSession({playerCount=3,seed=Date.now()}={}){
  return {version:MATCH_VERSION,mode:'quick',phase:'round',round:1,totalRounds:1,suddenDeath:false,seed,scores:{},roster:null,results:[],championId:null,game:createInitialState({playerCount,seed})};
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
  const match=structuredClone(input); if(match.mode!=='tavern'||match.phase!=='betweenRounds')throw new Error('No next round');
  if(!match.suddenDeath)match.round++;
  match.phase='round';match.game=createInitialState({playerCount:4,players:freshRoster(match.roster),seed:match.seed+match.results.length*9973});return match;
}

export function standings(match){return match.roster.map(player=>({...player,score:match.scores[player.id]||0})).toSorted((a,b)=>b.score-a.score||a.name.localeCompare(b.name,'he'));}
export function serializeSession(match){return JSON.stringify(match);}
export function restoreSession(json){
  const raw=typeof json==='string'?JSON.parse(json):structuredClone(json);
  if(raw?.game&&raw.version===MATCH_VERSION){raw.game=restoreState(serializeState(raw.game));return raw;}
  if(raw?.players)return createQuickSessionFromLegacy(raw);
  throw new Error('Unsupported saved session');
}
function createQuickSessionFromLegacy(game){return {version:MATCH_VERSION,mode:'quick',phase:game.phase==='finished'?'matchFinished':'round',round:1,totalRounds:1,suddenDeath:false,seed:game.seed||Date.now(),scores:{},roster:null,results:[],championId:game.winnerId||null,game:restoreState(serializeState(game))};}
