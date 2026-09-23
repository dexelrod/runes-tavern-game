import { createInitialState, restoreState, ACTIONS, currentPlayer, getLegalCards, topCard } from './game-engine/engine.js';
import { COLORS, TYPES } from './game-engine/cards.js';
import { LocalGameTransport } from './platform/transport.js';
import { defaults, loadSettings, saveSettings, saveMatch, loadMatch, clearMatch, feedback } from './platform/storage.js';
import { runBotStep, chooseColor } from './game-ai/bot.js';
import { cardHTML, cardLabel } from './ui/card.js';

const root=document.querySelector('#app');
let settings=loadSettings(), transport=null, state=null, view='home', sheet=null, selected=null, hint='', botTimer=null, lastLogLength=0;
const colorHex={red:'#ef5546',blue:'#3697e8',green:'#45ae65',yellow:'#f4cf34'};

function startGame(saved=null){
  state=saved?restoreState(JSON.stringify(saved)):createInitialState({playerCount:settings.playerCount,seed:Date.now()});
  transport?.disconnect(); transport=new LocalGameTransport(state); view='game'; sheet=null;
  transport.subscribeToState((next,action)=>{state=next; saveMatch(state); onState(action); render(); scheduleGame();});
}
function submit(action){ try{transport.submitAction(action);selected=null;}catch(error){hint=error.message;feedback('invalid',settings);render();setTimeout(()=>{hint='';render();},900);} }
function onState(action){
  const latest=state.log.at(-1); if(state.log.length>lastLogLength){lastLogLength=state.log.length;if(['broken3','reverse','stop','playAgain'].includes(latest?.type))feedback('special',settings);else if(action.type!==ACTIONS.DECLARE_LAST)feedback('play',settings);}
  if(action.type===ACTIONS.DRAW)feedback('draw',settings);
}
function delay(){ return settings.difficulty==='quick'?280:settings.difficulty==='thoughtful'?760:500; }
function scheduleGame(){
  clearTimeout(botTimer); if(!state||state.phase==='finished')return;
  botTimer=setTimeout(()=>{
    if(state.pendingReaction){
      const botId=state.pendingReaction.eligiblePlayerIds.find(id=>state.players.find(p=>p.id===id)?.kind==='ai');
      if(botId){const bot=state.players.find(p=>p.id===botId),card=bot.hand.find(c=>c.type===TYPES.BROKEN3);submit({type:ACTIONS.RESPOND_BROKEN3,playerId:botId,cardId:card.id});}
      else if(!state.pendingReaction.eligiblePlayerIds.includes('p0'))submit({type:ACTIONS.RESOLVE_REACTION});
      return;
    }
    const active=currentPlayer(state);
    if(state.awaitingColor&&active.kind==='ai'){submit({type:ACTIONS.CHOOSE_COLOR,playerId:active.id,color:chooseColor(active.hand)});return;}
    if(active.kind==='ai'){
      try{let next=runBotStep(state);transport.state=next;state=next;transport.listeners.forEach(fn=>fn(state,{type:'bot'}));}catch(error){console.warn(error);submit({type:ACTIONS.DRAW,playerId:active.id});}
    }
  },delay());
}

function homeHTML(){const saved=loadMatch();return `<main class="app-shell"><section class="home"><div class="home-top"><button class="icon-btn" data-open="settings" aria-label="Settings"><span class="gear"></span></button></div><div class="brand"><div class="brand-mark" aria-label="TAKI"><span>T</span><span>A</span><span>K</span><span>I</span></div><p>pocket card party</p></div><div class="setup-card">${saved&&saved.phase!=='finished'?'<button class="primary resume" data-resume>RESUME GAME</button>':''}<div class="setup-row"><label>Players</label><div class="segmented" role="group" aria-label="Number of players">${[2,3,4,6,8,10].map(n=>`<button data-players="${n}" class="${settings.playerCount===n?'on':''}">${n}</button>`).join('')}</div></div><div class="setup-row"><label for="difficulty">Bot pace</label><select id="difficulty" class="select"><option value="quick" ${settings.difficulty==='quick'?'selected':''}>Quick</option><option value="normal" ${settings.difficulty==='normal'?'selected':''}>Natural</option><option value="thoughtful" ${settings.difficulty==='thoughtful'?'selected':''}>Thoughtful</option></select></div><button class="primary" data-play>PLAY</button><button class="text-btn" data-open="rules">How to play</button></div></section>${sheetHTML()}</main>`}

function opponentHTML(player,index){const active=currentPlayer(state).id===player.id;const initials=player.name.slice(0,1).toUpperCase();const stopped=state.log.at(-1)?.type==='stop'&&state.log.at(-1).skipped===player.id;return `<div class="opponent ${active?'active':''} ${stopped?'skipped':''}"><div class="op-avatar">${initials}<span class="count-pill">${player.hand.length}</span><span class="mini-cards"><i style="--n:0"></i><i style="--n:1"></i></span></div><div class="op-name">${player.name}</div></div>`}
function statusHTML(){const items=[];if(state.activePenalty)items.push(`<span class="status-pill penalty">+${state.activePenalty.amount}</span>`);if(state.taki?.open)items.push(`<span class="status-pill taki">TAKI OPEN · ${state.taki.color.toUpperCase()}</span>`);if(state.freePlay)items.push('<span class="status-pill">FREE PLAY</span>');if(state.mustPlayAgain&&!state.taki)items.push('<span class="status-pill">PLAY AGAIN</span>');return items.join('')}
function humanControls(){const human=state.players[0],isTurn=currentPlayer(state).id===human.id;const parts=[];
  if(state.lastCardWindow?.playerId===human.id&&!state.lastCardWindow.declared)parts.push('<button class="action-chip alert" data-last>LAST CARD!</button>');
  if(isTurn&&state.taki?.open&&(state.taki.lastCardId||(state.taki.ownerId===human.id&&state.taki.openedTurn===state.turn))){parts.push(`<button class="action-chip dark" data-close>${state.taki.lastCardId?'CLOSE TAKI':'LEAVE OPEN'}</button>`);}
  if(isTurn&&state.mustPlayAgain&&!state.taki&&getLegalCards(state,human.id).length===0)parts.push('<button class="action-chip" data-end>DRAW + END</button>');
  return parts.length?`<div class="floating-actions">${parts.join('')}</div>`:'';
}
function reactionHTML(){
  if(state.awaitingColor?.playerId==='p0')return `<div class="reaction"><div class="reaction-card"><h2>Choose a color</h2><p>Pick the color that leads the next turn.</p><div class="color-picker">${COLORS.map(c=>`<button class="${c}" data-color="${c}" aria-label="${c}"></button>`).join('')}</div></div></div>`;
  const r=state.pendingReaction;if(r&&r.eligiblePlayerIds.includes('p0')){const card=state.players[0].hand.find(c=>c.type===TYPES.BROKEN3),self=r.sourcePlayerId==='p0';return `<div class="reaction"><div class="reaction-card"><h2>Break the +3?</h2><p>${self?'Pair both cards and cancel the attack.':`Counter now and send ${r.amount} cards back.`}</p><button class="primary" data-break="${card.id}">PLAY BROKEN +3</button><button class="text-btn" data-pass-reaction>Let it land</button></div></div>`;}
  return '';
}
function gameHTML(){
  const human=state.players[0],active=currentPlayer(state),legal=new Set(getLegalCards(state,human.id).map(c=>c.id)),isHumanTurn=active.id===human.id&&!state.pendingReaction&&!state.awaitingColor;
  const shown=human.hand.slice(0,18); const more=human.hand.length-shown.length; const top=topCard(state); const turnHint=hint||(state.activePenalty&&isHumanTurn?`Play +2, +3 or King — or draw ${state.activePenalty.amount}`:state.taki?.open&&isHumanTurn?'Keep playing the TAKI color, or close it':isHumanTurn?'Match color or symbol':'Waiting for '+active.name);
  const visibleOpponents=state.players.slice(1,6),hiddenOpponents=Math.max(0,state.players.length-1-visibleOpponents.length);
  return `<main class="app-shell" style="--active:${colorHex[state.activeColor]||'#292925'}"><section class="game"><header class="game-head"><button class="icon-btn" data-home aria-label="Back to home">‹</button><div class="round"><span class="turn-dot"></span>${active.id==='p0'?'Your':active.name+"'s"} turn</div><button class="icon-btn" data-open="pause" aria-label="Pause">Ⅱ</button></header><div class="board"><div class="opponents">${visibleOpponents.map(opponentHTML).join('')}${hiddenOpponents?`<div class="opponent compact"><div class="op-avatar">+${hiddenOpponents}</div><div class="op-name">more</div></div>`:''}</div><div class="center"><div class="direction"><span style="--dir:${state.direction}">➜</span></div><div class="status-stack">${statusHTML()}</div><button class="pile draw-pile" data-draw aria-label="Draw a card"><span class="brand-mini">TAKI</span><span class="pile-label">DRAW · ${state.drawPile.length}</span></button><div class="pile discard">${cardHTML(top,{small:false})}<span class="pile-label">${state.activeColor?.toUpperCase()||'FREE'}</span></div></div></div><footer class="hand-area"><div class="hand-meta"><span class="hint">${turnHint}</span>${more?`<span class="hint">+${more} more</span>`:''}</div><div class="hand">${shown.map((c,i)=>cardHTML(c,{legal:isHumanTurn&&legal.has(c.id),selected:selected===c.id,index:i,total:shown.length})).join('')}</div></footer></section>${humanControls()}${reactionHTML()}${state.phase==='finished'?winHTML():''}${sheetHTML()}</main>`;
}
function winHTML(){const w=state.players.find(p=>p.id===state.winnerId);return `<div class="win"><div class="win-card"><div class="win-burst">TAKI!</div><h1>${w?.id==='p0'?'You win!':w?.name+' wins'}</h1><p>${state.turn} turns · ${state.log.filter(x=>x.type==='play').length} cards played</p><button class="primary" data-rematch>PLAY AGAIN</button><button class="text-btn" data-home>HOME</button></div></div>`}
function sheetHTML(){if(!sheet)return'';if(sheet==='rules')return `<div class="sheet-wrap" data-dismiss><article class="sheet"><div class="grab"></div><h2>How to play</h2><p>Match the leading card by color, number or symbol. If you draw, that card waits until your next turn. First empty hand wins.</p><h3>TAKI</h3><p>Open a run and play as many cards of its color as you like. Only the final command takes effect. Close it deliberately—or leave it open for the next player.</p><h3>Special cards</h3><p><b>Stop</b> skips the next player. <b>Reverse</b> changes direction. <b>Plus</b> gives another turn. <b>+2</b> stacks until someone draws. <b>Change Color</b> picks the next color. <b>Super TAKI</b> inherits the leading color.</p><p><b>King</b> cancels the current restriction and opens a free play. <b>+3</b> targets everyone, while <b>Broken +3</b> can interrupt from any seat and send the penalty back.</p><h3>Last card</h3><p>Tap LAST CARD before the next player completes an action. Miss it and draw four.</p><button class="primary" data-close-sheet>GOT IT</button></article></div>`;
  return `<div class="sheet-wrap" data-dismiss><article class="sheet"><div class="grab"></div><h2>${sheet==='pause'?'Game paused':'Settings'}</h2>${toggleRow('Sound','sound')}${toggleRow('Haptics','haptics')}${toggleRow('Reduced motion','reducedMotion')}${sheet==='pause'?'<button class="primary" data-close-sheet>KEEP PLAYING</button><button class="text-btn" data-home>Save & go home</button>':'<button class="primary" data-close-sheet>DONE</button>'}</article></div>`}
function toggleRow(label,key){return `<div class="setup-row"><label>${label}</label><button class="switch ${settings[key]?'on':''}" data-toggle="${key}" aria-pressed="${settings[key]}"></button></div>`}

function render(){root.innerHTML=view==='home'?homeHTML():gameHTML();bind();}
function bind(){
  root.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{sheet=b.dataset.open;render()});root.querySelectorAll('[data-close-sheet]').forEach(b=>b.onclick=()=>{sheet=null;render()});
  root.querySelectorAll('[data-toggle]').forEach(b=>b.onclick=()=>{settings[b.dataset.toggle]=!settings[b.dataset.toggle];saveSettings(settings);document.documentElement.style.setProperty('scroll-behavior',settings.reducedMotion?'auto':'smooth');render()});
  root.querySelectorAll('[data-players]').forEach(b=>b.onclick=()=>{settings.playerCount=+b.dataset.players;saveSettings(settings);render()});
  const diff=root.querySelector('#difficulty');if(diff)diff.onchange=()=>{settings.difficulty=diff.value;saveSettings(settings)};
  root.querySelector('[data-play]')?.addEventListener('click',()=>{clearMatch();startGame()});root.querySelector('[data-resume]')?.addEventListener('click',()=>startGame(loadMatch()));
  root.querySelectorAll('[data-home]').forEach(b=>b.onclick=()=>{clearTimeout(botTimer);view='home';sheet=null;render()});root.querySelector('[data-rematch]')?.addEventListener('click',()=>{clearMatch();startGame()});
  root.querySelector('[data-draw]')?.addEventListener('click',()=>{if(currentPlayer(state).id==='p0')submit({type:ACTIONS.DRAW,playerId:'p0'})});
  root.querySelector('[data-last]')?.addEventListener('click',()=>submit({type:ACTIONS.DECLARE_LAST,playerId:'p0'}));root.querySelector('[data-close]')?.addEventListener('click',()=>submit({type:ACTIONS.CLOSE_TAKI,playerId:'p0'}));root.querySelector('[data-end]')?.addEventListener('click',()=>submit({type:ACTIONS.END_TURN,playerId:'p0'}));
  root.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>submit({type:ACTIONS.CHOOSE_COLOR,playerId:'p0',color:b.dataset.color}));root.querySelector('[data-break]')?.addEventListener('click',e=>submit({type:ACTIONS.RESPOND_BROKEN3,playerId:'p0',cardId:e.currentTarget.dataset.break}));root.querySelector('[data-pass-reaction]')?.addEventListener('click',()=>submit({type:ACTIONS.RESOLVE_REACTION}));
  root.querySelectorAll('.hand .card').forEach(card=>{let y=0,moved=false;card.onclick=e=>{if(e.detail===0)submit({type:ACTIONS.PLAY,playerId:'p0',cardId:card.dataset.cardId})};card.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();submit({type:ACTIONS.PLAY,playerId:'p0',cardId:card.dataset.cardId})}};card.onpointerdown=e=>{y=e.clientY;moved=false;card.setPointerCapture(e.pointerId);selected=card.dataset.cardId;card.classList.add('selected')};card.onpointermove=e=>{if(!card.hasPointerCapture(e.pointerId))return;const dy=e.clientY-y;if(Math.abs(dy)>8)moved=true;card.style.transform=`translateY(${Math.min(0,dy)}px) rotate(0)`};card.onpointerup=e=>{const dy=e.clientY-y;card.releasePointerCapture(e.pointerId);if(dy<-72)submit({type:ACTIONS.PLAY,playerId:'p0',cardId:card.dataset.cardId});else if(!moved){if(selected===card.dataset.cardId)submit({type:ACTIONS.PLAY,playerId:'p0',cardId:card.dataset.cardId});else{selected=card.dataset.cardId;render()}}else render()};});
}
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
function registerWebMCP(){
  const context=document.modelContext;if(!context?.registerTool)return;
  const register=tool=>{try{void Promise.resolve(context.registerTool(tool)).catch(()=>{});}catch{}}
  register({name:'read_game_state',title:'Read TAKI game',description:'Read the current visible match status without changing it.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute(){return state?{phase:state.phase,currentPlayer:currentPlayer(state).name,activeColor:state.activeColor,humanCardCount:state.players[0].hand.length,opponents:state.players.slice(1).map(p=>({name:p.name,cardCount:p.hand.length})),takiOpen:!!state.taki,penalty:state.activePenalty?.amount||0}: {phase:'home'};}});
  register({name:'start_new_game',title:'Start new TAKI game',description:'Start a new offline match with 2 to 10 players and show the game board.',inputSchema:{type:'object',properties:{playerCount:{type:'integer',minimum:2,maximum:10}},required:['playerCount'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(!Number.isInteger(input?.playerCount)||input.playerCount<2||input.playerCount>10)throw new Error('playerCount must be an integer from 2 to 10');settings.playerCount=input.playerCount;saveSettings(settings);clearMatch();startGame();return{started:true,playerCount:input.playerCount};}});
  register({name:'draw_card',title:'Draw a card',description:'Draw for the human player when it is their turn.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(){if(!state||currentPlayer(state).id!=='p0')throw new Error('It is not the human turn');transport.submitAction({type:ACTIONS.DRAW,playerId:'p0'});return{drawn:true,cardCount:state.players[0].hand.length};}});
}
registerWebMCP();
render();
