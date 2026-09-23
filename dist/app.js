import { ACTIONS, currentPlayer, getLegalCards, topCard } from './game-engine/engine.js';
import { COLORS, TYPES } from './game-engine/cards.js';
import { createQuickSession, createTavernMatch, finishRound, restoreSession, standings, startNextRound } from './game-engine/match.js';
import { LocalGameTransport } from './platform/transport.js';
import { ambience, clearMatch, feedback, loadMatch, loadSettings, saveMatch, saveSettings } from './platform/storage.js';
import { chooseColor, runBotStep } from './game-ai/bot.js';
import { cardHTML, sigilHTML } from './ui/card.js';

const root=document.querySelector('#app');
const colorHex={red:'#9f2f24',blue:'#244f78',green:'#456b37',yellow:'#b58222'};
const colorName={red:'אדום',blue:'כחול',green:'ירוק',yellow:'צהוב'};
const archetypeName={hunter:'הציידת',bard:'הפייטן',mercenary:'שכיר החרב',wanderer:'הנודד'};
let settings=loadSettings(),session=null,state=null,transport=null,view='home',sheet=null,hint='',selected=null;
let botTimer=null,eventTimer=null,takiTimer=null,quipTimer=null,eventBanner=null,quip=null,lastLogLength=0,lastCounts={},lastQuipAt=0,takiRun=0,lastRenderedTopId=null;
const dialogue={
  hunter:{skip:['צפוי.','חבל.'],penalty:['באמת?','יותר מדי.'],reverse:['משנה מסלול.'],last:['נשאר לי אחד.'],king:['ידעתי ששמרת אותו.']},
  bard:{skip:['יפה.','זה היה מיותר.'],penalty:['עוד שניים?!','טוב...'],reverse:['לא ראיתי את זה בא.'],last:['אחד אחרון.'],king:['כניסה מרשימה.']},
  mercenary:{skip:['נהדר.','אני אזכור את זה.'],penalty:['באמת?','עוד חשבון לסגור.'],reverse:['אז בכיוון השני.'],last:['נשאר אחד.'],king:['מהלך טוב.']}
};

function persist(){if(session)saveMatch(session);}
function setSession(next){session=next;state=session.game;transport?.disconnect();transport=new LocalGameTransport(state);lastLogLength=state.log.length;lastCounts=Object.fromEntries(state.players.map(p=>[p.id,p.hand.length]));lastRenderedTopId=null;transport.subscribeToState((nextState,action)=>{state=nextState;session.game=nextState;onState(action);if(nextState.phase==='finished'&&session.phase==='round'){session=finishRound(session);feedback('coin',settings);}persist();render();scheduleGame();});}
function startSession(mode='tavern',saved=null){
  try{setSession(saved?restoreSession(saved):mode==='tavern'?createTavernMatch({seed:Date.now()}):createQuickSession({playerCount:settings.playerCount,seed:Date.now()}));}
  catch{clearMatch();setSession(mode==='tavern'?createTavernMatch({seed:Date.now()}):createQuickSession({playerCount:settings.playerCount,seed:Date.now()}));}
  view='game';sheet=null;eventBanner=null;ambience.start(settings);render();scheduleGame();
}
function submit(action){try{transport.submitAction(action);selected=null;}catch{hint='המהלך הזה אינו חוקי';feedback('invalid',settings);render();setTimeout(()=>{hint='';render();},850);}}
function showEvent(title,kind=''){clearTimeout(eventTimer);eventBanner={title,kind};eventTimer=setTimeout(()=>{eventBanner=null;render();},settings.reducedMotion?120:560);}
function showQuip(player,text,force=false){if(!settings.dialogue||!text||(!force&&Date.now()-lastQuipAt<6500))return;lastQuipAt=Date.now();clearTimeout(quipTimer);quip={player,text};quipTimer=setTimeout(()=>{quip=null;render();},Math.min(3000,1600+text.length*45));}
function botLine(playerId,trigger){const player=state.players.find(p=>p.id===playerId),pool=dialogue[player?.archetype]?.[trigger]||[];return pool[Math.floor(Math.random()*pool.length)];}
function onState(action){
  const entries=state.log.slice(lastLogLength);lastLogLength=state.log.length;
  const latest=entries.at(-1),stop=entries.find(e=>e.type==='stop'),reverse=entries.find(e=>e.type==='reverse'),again=entries.find(e=>e.type==='playAgain'),penalty=entries.find(e=>e.type==='drawPenalty'),color=entries.find(e=>e.type==='color'),closed=entries.find(e=>e.type==='takiClosed'),lastCard=entries.find(e=>e.type==='lastCard');
  if(stop)showEvent('חותם העצירה נסגר','stop');
  else if(reverse)showEvent('החריטה משנה כיוון','reverse');
  else if(again)showEvent('מהלך נוסף','again');
  else if(penalty)showEvent(`${penalty.amount}+ נמשכו מן הקופה`,'penalty');
  else if(color)showEvent(`בית ${colorName[color.color]}`,'color');
  else if(closed)showEvent('CLACK','taki');
  if(closed)feedback('clack',settings);else if(entries.length)feedback(['stop','reverse','playAgain','drawPenalty'].includes(latest?.type)?'special':'play',settings);
  if(action.type===ACTIONS.DRAW)feedback('draw',settings);
  const played=entries.findLast?.(e=>e.type==='play');const playedCard=played?state.discardPile.find(c=>c.id===played.cardId):null;
  if(state.taki?.open)takiRun++;if(closed){if(takiRun>=3){const watcher=state.players.find(p=>p.kind==='ai'&&p.id!==closed.playerId);showQuip(watcher?.id,botLine(watcher?.id,'penalty'));}takiRun=0;}
  if(stop)showQuip(stop.skipped,botLine(stop.skipped,'skip'));
  else if(penalty&&penalty.amount>=4)showQuip(penalty.playerId,botLine(penalty.playerId,'penalty'));
  else if(lastCard&&lastCard.playerId!=='p0')showQuip(lastCard.playerId,botLine(lastCard.playerId,'last'),true);
  else if(reverse){const speaker=state.players.find(p=>p.kind==='ai');showQuip(speaker?.id,botLine(speaker?.id,'reverse'));}
  else if(playedCard?.type===TYPES.KING){const speaker=state.players.find(p=>p.kind==='ai'&&p.id!==played.playerId);showQuip(speaker?.id,botLine(speaker?.id,'king'));}
  for(const player of state.players)lastCounts[player.id]=player.hand.length;
}
function delay(){const base=settings.difficulty==='quick'?620:settings.difficulty==='thoughtful'?1350:900;const archetype=currentPlayer(state)?.archetype;return base+(archetype==='hunter'?180:archetype==='bard'?-90:0);}
function scheduleGame(){
  clearTimeout(botTimer);clearTimeout(takiTimer);
  if(!state||session.phase!=='round'||state.phase==='finished')return;
  const active=currentPlayer(state);
  if(active.kind==='human'&&state.taki?.open&&state.taki.ownerId===active.id){takiTimer=setTimeout(()=>submit({type:ACTIONS.END_TURN,playerId:active.id}),settings.reducedMotion?500:1450);return;}
  if(active.kind!=='ai')return;
  botTimer=setTimeout(()=>{try{const next=runBotStep(state);transport.state=next;transport.listeners.forEach(fn=>fn(next,{type:'bot'}));}catch{submit({type:ACTIONS.DRAW,playerId:active.id});}},delay());
}

function homeHTML(){
  const saved=loadMatch();let savedSession=null;try{savedSession=saved?restoreSession(saved):null;}catch{}
  const resumable=savedSession&&savedSession.phase!=='matchFinished';
  return `<main class="app-shell elder-home" dir="rtl"><section class="home-scene"><div class="home-title">${sigilHTML('title-sigil')}<h1><span>ELDER</span><b>TAKI</b></h1></div><div class="table-choices">${resumable?'<button class="resume-marker" data-resume>חזרה לשולחן</button>':''}<button class="mode-object tavern-mode" data-tavern><span class="coin-stack"><i></i><i></i><i></i><i></i><i></i></span><span><b>משחק פונדק</b><small><bdi>5</bdi> סיבובים · <bdi>4</bdi> שחקנים</small></span></button><button class="mode-object quick-mode" data-open="quick"><span class="single-card">${sigilHTML()}</span><b>משחק מהיר</b></button><div class="table-tools"><button data-open="rules"><i class="folded-rules"></i><span>חוקים</span></button><button data-open="settings"><i class="brass-cog"></i><span>הגדרות</span></button></div></div></section>${sheetHTML()}</main>`;
}
function scoreBoardHTML(){if(session.mode!=='tavern')return'';return `<aside class="score-slate" aria-label="ניקוד מצטבר">${standings(session).map(p=>`<div class="score-row"><span>${p.name}</span><b>${p.score}</b></div>`).join('')}</aside>`;}
function opponentHTML(player,slot){const active=currentPlayer(state).id===player.id,stopped=state.log.at(-1)?.type==='stop'&&state.log.at(-1).skipped===player.id,count=Math.min(10,player.hand.length),backs=Array.from({length:count},(_,i)=>`<i style="--offset:${i-(count-1)/2}"><span>${sigilHTML()}</span></i>`).join('');return `<div class="opponent seat-${slot} ${active?'active':''} ${stopped?'sealed':''} ${player.hand.length===1?'last-card':''}"><div class="seat-marker"><i class="house-pin ${player.house||''}"></i><span>${player.name}</span><small>${archetypeName[player.archetype]||'יריב'}</small><b><i></i><bdi>${player.hand.length}</bdi></b></div><div class="opponent-fan">${backs}</div><span class="seat-token token-${player.archetype||'guest'}"></span>${quip?.player===player.id?`<div class="speech" role="status">${quip.text}</div>`:''}</div>`;}
function opponentSeats(players){const layouts={1:['top'],2:['left','right'],3:['left','top','right'],4:['far-left','left','right','far-right'],5:['far-left','left','top','right','far-right']};return players.map((p,i)=>opponentHTML(p,(layouts[players.length]||layouts[5])[i]||'top')).join('');}
function statusHTML(){const bits=[];if(state.activePenalty)bits.push(`<span class="curse-counter"><bdi>+${state.activePenalty.amount}</bdi></span>`);if(state.taki?.open)bits.push(`<span class="taki-clasp"><i style="--taki-color:${colorHex[state.taki.color]}"></i>TAKI פתוח</span>`);if(state.freePlay)bits.push('<span class="brass-token">מהלך חופשי</span>');return bits.join('');}
function choiceHTML(){if(state.awaitingColor?.playerId!=='p0')return'';return `<div class="color-choice" role="dialog" aria-label="בחירת בית צבע"><div class="gem-ring"><span>בחרו בית</span>${COLORS.map(c=>`<button class="gem ${c}" data-color="${c}" aria-label="${colorName[c]}"><i></i></button>`).join('')}</div></div>`;}
function eventHTML(){return eventBanner?`<div class="table-event ${eventBanner.kind}"><i></i><span>${eventBanner.title}</span></div>`:'';}
function roundMarkerHTML(){if(session.mode!=='tavern')return'<div class="round-marker">משחק מהיר</div>';return `<div class="round-marker">${session.suddenDeath?'יד מכרעת':`סיבוב <bdi>${session.round}</bdi> מתוך <bdi>${session.totalRounds}</bdi>`}</div>`;}
function gameHTML(){
  const human=state.players[0],active=currentPlayer(state),isHumanTurn=session.phase==='round'&&active.id===human.id&&!state.awaitingColor,legal=new Set(isHumanTurn?getLegalCards(state,human.id).map(c=>c.id):[]),shown=human.hand.slice(0,13),more=human.hand.length-shown.length,top=topCard(state);
  const turnHint=hint||(state.activePenalty&&isHumanTurn?`2+ או מלך · משיכה: ${state.activePenalty.amount}`:state.taki?.open&&isHumanTurn?`TAKI ${colorName[state.taki.color]}`:state.mustPlayAgain&&isHumanTurn?'מהלך נוסף':isHumanTurn?'התור שלכם':'');
  const under=state.discardPile.slice(-4,-1),fresh=top.id!==lastRenderedTopId;lastRenderedTopId=top.id;
  return `<main class="app-shell table-shell" dir="rtl" style="--active:${colorHex[state.activeColor]||'#b78b45'}"><section class="game ${isHumanTurn?'human-turn':'waiting'}"><header class="game-head"><button class="rune-menu" data-open="pause" aria-label="תפריט והשהיה"><i></i><i></i><i></i></button>${roundMarkerHTML()}${scoreBoardHTML()}</header><div class="board"><div class="direction-engraving ${state.direction<0?'counter':''} ${eventBanner?.kind==='reverse'?'lit':''} ${state.taki?.open?'taki-lit':''}">${sigilHTML('table-sigil')}<span class="house-node red ${state.activeColor==='red'?'on':''}"></span><span class="house-node blue ${state.activeColor==='blue'?'on':''}"></span><span class="house-node green ${state.activeColor==='green'?'on':''}"></span><span class="house-node yellow ${state.activeColor==='yellow'?'on':''}"></span></div><div class="opponents">${opponentSeats(state.players.slice(1,6))}</div><div class="center"><div class="status-stack">${statusHTML()}</div><button class="pile draw-pile" data-draw aria-label="משיכת קלף. ${state.drawPile.length} קלפים נותרו" style="--deck-depth:${Math.min(8,Math.ceil(state.drawPile.length/15))}px"><span class="back-sigil">${sigilHTML()}</span><span class="deck-count"><bdi>${state.drawPile.length}</bdi></span></button><div class="pile discard ${fresh?'fresh':''}" style="--pile-turn:${((state.discardPile.length%7)-3)*.7}deg" aria-label="הקלף המוביל. הצבע הפעיל: ${colorName[state.activeColor]||'חופשי'}"><div class="discard-under">${under.map((card,i)=>`<span class="under under-${i}">${cardHTML(card)}</span>`).join('')}</div>${cardHTML(top)}<span class="active-stone ${state.activeColor||'wild'}"></span></div>${eventHTML()}</div></div><footer class="hand-area"><div class="turn-whisper">${turnHint}</div><div class="hand ${state.taki?.open?'taki-active':''}">${shown.map((card,i)=>cardHTML(card,{legal:isHumanTurn&&legal.has(card.id),selected:selected===card.id,index:i,total:shown.length})).join('')}</div>${more>0?`<span class="more-cards">+${more}</span>`:''}${quip?.player==='p0'?`<div class="human-quip">${quip.text}</div>`:''}</footer></section>${choiceHTML()}${summaryHTML()}${sheetHTML()}</main>`;
}
function summaryHTML(){
  if(!session||session.phase==='round')return'';
  if(session.mode==='quick'){const winner=state.players.find(p=>p.id===session.championId);return `<div class="result-wrap"><article class="tally-board"><small>היד הסתיימה</small><h2>${winner?.id==='p0'?'ניצחתם':`${winner?.name} ניצח`}</h2><div class="result-actions"><button class="leather-button primary" data-quick>יד נוספת</button><button class="text-link" data-home>לעזוב את השולחן</button></div></article></div>`;}
  if(session.phase==='matchFinished'){const champion=session.roster.find(p=>p.id===session.championId);return `<div class="result-wrap"><article class="tally-board champion">${sigilHTML('result-sigil')}<small>אלוף הפונדק</small><h2>${champion?.id==='p0'?'אתם':champion?.name}</h2><div class="final-standing">${standings(session).map((p,i)=>`<div><b><bdi>${i+1}</bdi></b><span>${p.name}</span><strong><bdi>${p.score}</bdi></strong></div>`).join('')}</div><div class="result-actions"><button class="leather-button primary" data-tavern>ערב נוסף</button><button class="text-link" data-home>לעזוב את השולחן</button></div></article></div>`;}
  const result=session.results.at(-1),winner=session.roster.find(p=>p.id===result.winnerId),losers=session.roster.filter(p=>p.id!==result.winnerId),equation=losers.map(p=>result.remaining[p.id]).join(' + ');
  return `<div class="result-wrap"><article class="tally-board"><small>${session.suddenDeath?'שוויון · יד אחת אחרונה':`סיבוב <bdi>${result.round}</bdi> הסתיים`}</small><h2>${winner.id==='p0'?'ניצחתם ביד':`${winner.name} ניצח ביד`}</h2><div class="round-count">${losers.map(p=>`<span>${p.name}<b><bdi>${result.remaining[p.id]}</bdi></b></span>`).join('')}</div><div class="coin-total"><span dir="ltr">${equation}</span><strong><bdi>+${result.points}</bdi></strong></div><div class="result-actions"><button class="leather-button primary" data-next>${session.suddenDeath?'ליד המכרעת':'לסיבוב הבא'}</button><button class="text-link" data-home>שמירה ויציאה</button></div></article></div>`;
}
function sheetHTML(){
  if(!sheet)return'';
  if(sheet==='quick')return `<div class="sheet-wrap"><article class="tavern-sheet"><h2>משחק מהיר</h2><p>יד אחת, בלי ניקוד מצטבר.</p><label>מספר שחקנים</label><div class="segmented">${[2,3,4,6,8,10].map(n=>`<button data-players="${n}" class="${settings.playerCount===n?'on':''}">${n}</button>`).join('')}</div><button class="parchment-button primary" data-quick>להתחיל</button><button class="text-link" data-close-sheet>חזרה</button></article></div>`;
  if(sheet==='rules')return `<div class="sheet-wrap"><article class="tavern-sheet rules"><h2>חוקי Elder Taki</h2><p>התאימו צבע, מספר או סמל. אם משכתם קלף, הוא יחכה לתור הבא. הראשון שמרוקן את היד מנצח.</p><h3>TAKI</h3><p>TAKI פותח רצף בצבע אחד עבור מי שהניח אותו. הרצף נסגר מעצמו כשמפסיקים או כשאין המשך חוקי. רק הפקודה האחרונה ברצף פועלת.</p><h3>משחק פונדק</h3><p>חמישה סיבובים מול שלושה יריבים. המנצח בכל יד מקבל נקודה על כל קלף שנותר בידי האחרים. שוויון אחרי הסיבוב החמישי מוביל ליד מכרעת.</p><h3>הקלפים העתיקים</h3><p><b>עצור</b> מדלג, <b>שנה כיוון</b> הופך את הסדר, <b>פלוס</b> מעניק מהלך נוסף, <b>2+</b> מצטבר, <b>שנה צבע</b> בוחר בית, <b>סופר TAKI</b> יורש את הצבע ו<b>מלך</b> מבטל מגבלה.</p><button class="parchment-button" data-close-sheet>הבנתי</button></article></div>`;
  return `<div class="sheet-wrap"><article class="tavern-sheet"><h2>${sheet==='pause'?'המשחק מושהה':'הגדרות'}</h2>${toggleRow('צלילי משחק','sound')}${toggleRow('אווירת פונדק','ambience')}${toggleRow('דברי יריבים','dialogue')}${toggleRow('רטט','haptics')}${toggleRow('צמצום תנועה','reducedMotion')}<button class="parchment-button" data-close-sheet>${sheet==='pause'?'לחזור לשולחן':'סיום'}</button>${sheet==='pause'?'<button class="text-link" data-home>שמירה ויציאה</button>':''}</article></div>`;
}
function toggleRow(label,key){return `<div class="toggle-row"><label>${label}</label><button class="iron-switch ${settings[key]?'on':''}" data-toggle="${key}" aria-pressed="${settings[key]}"><i></i></button></div>`;}

function render(){root.innerHTML=view==='home'?homeHTML():gameHTML();bind();}
function goHome(){clearTimeout(botTimer);clearTimeout(takiTimer);clearTimeout(eventTimer);ambience.stop();view='home';sheet=null;render();}
function bind(){
  root.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{sheet=b.dataset.open;render();});
  root.querySelectorAll('[data-close-sheet]').forEach(b=>b.onclick=()=>{sheet=null;render();});
  root.querySelectorAll('[data-toggle]').forEach(b=>b.onclick=()=>{settings[b.dataset.toggle]=!settings[b.dataset.toggle];saveSettings(settings);if(b.dataset.toggle==='ambience'||b.dataset.toggle==='sound'){ambience.stop();ambience.start(settings);}render();});
  root.querySelectorAll('[data-players]').forEach(b=>b.onclick=()=>{settings.playerCount=+b.dataset.players;saveSettings(settings);render();});
  root.querySelector('[data-tavern]')?.addEventListener('click',()=>{clearMatch();startSession('tavern');});
  root.querySelector('[data-quick]')?.addEventListener('click',()=>{clearMatch();startSession('quick');});
  root.querySelector('[data-resume]')?.addEventListener('click',()=>startSession('tavern',loadMatch()));
  root.querySelector('[data-next]')?.addEventListener('click',()=>{feedback('shuffle',settings);setSession(startNextRound(session));render();scheduleGame();});
  root.querySelectorAll('[data-home]').forEach(b=>b.onclick=goHome);
  root.querySelector('[data-draw]')?.addEventListener('click',()=>{if(currentPlayer(state).id==='p0'&&!state.taki?.open)submit({type:ACTIONS.DRAW,playerId:'p0'});});
  root.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>submit({type:ACTIONS.CHOOSE_COLOR,playerId:'p0',color:b.dataset.color}));
  root.querySelectorAll('.hand .card.legal').forEach(card=>{let startY=0,moved=false;card.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();submit({type:ACTIONS.PLAY,playerId:'p0',cardId:card.dataset.cardId});}};card.onpointerdown=e=>{startY=e.clientY;moved=false;card.setPointerCapture(e.pointerId);selected=card.dataset.cardId;card.classList.add('selected');};card.onpointermove=e=>{if(!card.hasPointerCapture(e.pointerId))return;const dy=e.clientY-startY;if(Math.abs(dy)>7)moved=true;card.style.transform=`translateY(${Math.min(0,dy)}px) rotate(0deg)`;};card.onpointerup=e=>{const dy=e.clientY-startY;card.releasePointerCapture(e.pointerId);if(dy<-58||!moved)submit({type:ACTIONS.PLAY,playerId:'p0',cardId:card.dataset.cardId});else render();};});
}

if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
function registerWebMCP(){const context=document.modelContext;if(!context?.registerTool)return;try{void Promise.resolve(context.registerTool({name:'read_game_state',title:'Read Elder Taki game',description:'Read the current Elder Taki match status.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute(){return session?{mode:session.mode,phase:session.phase,round:session.round,totalRounds:session.totalRounds,suddenDeath:session.suddenDeath,scores:session.scores,currentPlayer:currentPlayer(state).name,activeColor:state.activeColor,humanCardCount:state.players[0].hand.length,opponents:state.players.slice(1).map(p=>({name:p.name,cardCount:p.hand.length}))}:{phase:'home'};}})).catch(()=>{});}catch{}}
registerWebMCP();render();
