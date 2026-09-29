import { ACTIONS, currentPlayer, getLegalCards, topCard } from './game-engine/engine.js';
import { COLORS, TYPES } from './game-engine/cards.js';
import { createDuelSession, createQuickSession, createTavernMatch, finishRound, restoreSession, standings, startNextRound } from './game-engine/match.js';
import { LocalGameTransport } from './platform/transport.js';
import { clearMatch, feedback, loadMatch, loadSettings, saveMatch, saveSettings } from './platform/storage.js';
import { audioSystem } from './platform/audio.js';
import { chooseBotAction, chooseColor } from './game-ai/bot.js';
import { cardHTML, cardLabel, sigilHTML } from './ui/card.js';
import { DUEL_OPPONENTS, duelSpriteStyle, getDuelOpponent, localizeDuelOpponent } from './duel/opponents.js';

const root=document.querySelector('#app');
const colorHex={red:'#9f2f24',blue:'#244f78',green:'#456b37',yellow:'#b58222'};
let settings=loadSettings(),session=null,state=null,transport=null,view='home',sheet=null,hint='',selected=null;
const isEnglish=()=>settings.language==='en';
const direction=()=>isEnglish()?'ltr':'rtl';
const colorNames={he:{red:'אדום',blue:'כחול',green:'ירוק',yellow:'צהוב'},en:{red:'Red',blue:'Blue',green:'Green',yellow:'Yellow'}};
const archetypeNames={he:{hunter:'הציידת',bard:'הפייטן',mercenary:'שכיר החרב',wanderer:'הנודד',scholar:'המלומד',mysterious:'הנוסע'},en:{hunter:'The Hunter',bard:'The Bard',mercenary:'The Mercenary',wanderer:'The Wanderer',scholar:'The Scholar',mysterious:'The Traveler'}};
const playerNames={אתם:'You',איילה:'Aila',רון:'Ron',בראן:'Bran',מילו:'Milo',לומי:'Lumi',פיפ:'Pip',נורי:'Nuri',זיג:'Zig',קוקו:'Koko',ארי:'Ari',ביבי:'Bibi',טוטו:'Toto',לוסיאן:'Lucien',איניגו:'Inigo',לידיה:'Lydia',וירן:'Viren',סורן:'Soren',ויילין:'Waylin'};
function colorName(color){return colorNames[settings.language]?.[color]||colorNames.he[color]||'';}
function colorRuneHTML(color,className='color-rune'){
  const paths={red:'<path d="M32 7c3 12-8 14-3 24 3-6 8-8 10-14 8 10 12 22 4 33-8 11-28 8-31-5-2-9 4-17 12-23-1 9 2 12 5 14-1-11 7-15 3-29z"/>',blue:'<path d="M8 39c10-13 20-13 30 0s20 13 28 0M8 24c10-13 20-13 30 0s20 13 28 0"/>',green:'<path d="M32 57V28M32 38C18 37 12 27 11 13c10 2 17 7 21 15m0 8c13-2 20-10 21-23-10 2-17 8-21 17"/>',yellow:'<circle cx="32" cy="32" r="12"/><path d="M32 5v11m0 32v11M5 32h11m32 0h11M13 13l8 8m22 22 8 8m0-38-8 8M21 43l-8 8"/>'};
  return `<svg class="${className}" viewBox="0 0 64 64" aria-hidden="true">${paths[color]||''}</svg>`;
}
function displayName(player){if(!player)return'';if(player.id==='p0')return isEnglish()?'You':player.name;return isEnglish()?(playerNames[player.name]||player.name):player.name;}
function displayOpponent(opponent){return localizeDuelOpponent(opponent,settings.language);}
function cardOptions(options={}){return {...options,language:settings.language};}
let botTimer=null,eventTimer=null,takiTimer=null,quipTimer=null,roundEndTimer=null,duelReactionTimer=null,duelIdleTimer=null,deckAudioTimer=null,eventBanner=null,quip=null,duelReaction='idle',lastDuelReactionAt=0,lastLogLength=0,lastCounts={},lastHands={},lastQuipAt=0,takiRun=0,lastRenderedTopId=null,lastActivePlayerId=null,turnCueUntil=0,drawFlights=[],flightId=0,sessionEpoch=0,roundResultVisible=false,incomingCardDelays=new Map(),propRattled=new Set(),screenReaderLine='',captionLine='',blockAiUntil=0,motionLocked=false,pendingAction=null,deckSettling=false;
const dialogueHe={
  hunter:{skip:['אה, לא. תורך.','לאן אתה חושב שאתה הולך?','שב.'],penalty:['ארבעה?!','זה מסלים מהר.','אני רואה שבחרנו באלימות.'],reverse:['חוזר אליך.','הסתובבו השולחנות.'],last:['כולם עליו.','עוד לא ניצחת.'],king:['הכתר החליט.','טוב. זה משנה דברים.']},
  bard:{skip:['בחייך.','זה היה מיותר לחלוטין.'],penalty:['אה. נפלא.','בשלב הזה פשוט תן לי את הקופה.'],reverse:['תרתי משמע.','שינוי בתוכניות.'],last:['זה נהיה מעניין.','אל תחייך עדיין.'],king:['קשה להתווכח עם כתר.','בחירה אמיצה.']},
  mercenary:{skip:['אני אזכור את זה.','את זה אני מחזיר לך.'],penalty:['יש גבול.','נקמה מוגשת עם קלפים.'],reverse:['חוזר אליך.','חשבתי שנפטרתי ממך.'],last:['מישהו יעצור אותו?','לא טוב.'],king:['זה יעלה לך.','הכתר החליט.']},
  scholar:{skip:['מעניין.','זה חוקי. בדקתי.'],penalty:['כנראה שאין גבול.','אני דורש נבואה חדשה.'],reverse:['זה לא היה חלק מהנבואה.','הכוכבים לא הזהירו אותי מזה.'],last:['אני רואה את הסוף.','כל כך קרוב.'],king:['זה מרגיש כמו קסם קדום.','בטוח שזה לא קסם אפל?']}
};
const dialogueEn={
  hunter:{skip:['Oh, no. Your turn.','Where do you think you are going?','Sit.'],penalty:['Four?!','That escalated quickly.','So we chose violence.'],reverse:['Back to you.','The tables have turned.'],last:['Everyone on them.','You have not won yet.'],king:['The crown has spoken.','Well. That changes things.']},
  bard:{skip:['Come on.','That was entirely unnecessary.'],penalty:['Ah. Wonderful.','At this point, just give me the pot.'],reverse:['Quite literally.','Change of plans.'],last:['This is getting interesting.','Do not smile yet.'],king:['Hard to argue with a crown.','Bold choice.']},
  mercenary:{skip:['I will remember that.','I will return the favor.'],penalty:['There is a limit.','Revenge is served with cards.'],reverse:['Back to you.','I thought I was rid of you.'],last:['Will someone stop them?','Not good.'],king:['That will cost you.','The crown has spoken.']},
  scholar:{skip:['Interesting.','It is legal. I checked.'],penalty:['Apparently there is no limit.','I demand a new prophecy.'],reverse:['That was not in the prophecy.','The stars did not warn me.'],last:['I can see the end.','So close.'],king:['This feels like ancient magic.','Are you sure that is not dark magic?']}
};
const tavernBanterHe=['יפה.','לא רע.','באמת?','כמובן.','ידעתי.','נו באמת.','זה היה אישי.','טעות.','בחירה מפוקפקת.','יש לך מזל.','עוד לא סיימתי.','היית חייב?','אני צריך עוד משקה.','הקלפים שונאים אותי.','מרשים. מעצבן, אבל מרשים.','שקט. אני חושב.','יש לי תוכנית.','לא הייתה לי תוכנית.','בדיוק לפי התוכנית.'];
const tavernBanterEn=['Nicely done.','Not bad.','Really?','Of course.','I knew it.','Come on.','That was personal.','A mistake.','Questionable choice.','You are lucky.','I am not finished.','Did you have to?','I need another drink.','The cards hate me.','Impressive. Annoying, but impressive.','Quiet. I am thinking.','I have a plan.','I did not have a plan.','Exactly as planned.'];

function persist(){if(session)saveMatch(session);}
function currentDuelOpponent(){return displayOpponent(getDuelOpponent(session?.opponentId||settings.duelOpponent));}
function scheduleDuelIdle(){clearTimeout(duelIdleTimer);if(session?.mode!=='duel'||session.phase!=='round')return;const opponent=currentDuelOpponent(),epoch=sessionEpoch;duelIdleTimer=setTimeout(()=>{if(epoch!==sessionEpoch||session?.mode!=='duel'||session.phase!=='round'||eventBanner)return scheduleDuelIdle();setDuelReaction('drink',opponent.dialoguePools.drink.at(Math.floor(Math.random()*opponent.dialoguePools.drink.length)),true);},opponent.idleFrequency+Math.random()*9000);}
function setDuelReaction(kind,text=null,force=false){if(session?.mode!=='duel')return;const opponent=currentDuelOpponent(),weight=opponent.reactionWeights[kind]??1;if(!force&&(Date.now()-lastDuelReactionAt<4200||Math.random()>weight))return;lastDuelReactionAt=Date.now();duelReaction=kind;clearTimeout(duelReactionTimer);if(text)showQuip('p1',text,force);render();const epoch=sessionEpoch;duelReactionTimer=setTimeout(()=>{if(epoch!==sessionEpoch)return;duelReaction='idle';render();scheduleDuelIdle();},settings.reducedMotion?350:1100+Math.random()*1200);}
function duelLine(kind){const pool=currentDuelOpponent().dialoguePools[kind]||[];return pool[Math.floor(Math.random()*pool.length)];}
function recordDuelResult(){if(session?.mode!=='duel'||session.phase!=='matchFinished'||session.recorded)return;const id=session.opponentId,record=settings.duelRecords?.[id]||{played:0,won:0};settings.duelRecords={...(settings.duelRecords||{}),[id]:{played:record.played+1,won:record.won+(session.championId==='p0'?1:0)}};session.recorded=true;saveSettings(settings);}
function setSession(next){sessionEpoch++;clearTimeout(eventTimer);clearTimeout(quipTimer);clearTimeout(roundEndTimer);clearTimeout(duelReactionTimer);clearTimeout(duelIdleTimer);quip=null;duelReaction='idle';captionLine='';roundResultVisible=next.phase!=='round';session=next;state=session.game;transport?.disconnect();transport=new LocalGameTransport(state);lastLogLength=state.log.length;lastCounts=Object.fromEntries(state.players.map(p=>[p.id,p.hand.length]));lastHands=Object.fromEntries(state.players.map(p=>[p.id,p.hand.map(card=>card.id)]));lastRenderedTopId=null;lastActivePlayerId=null;turnCueUntil=0;drawFlights=[];incomingCardDelays.clear();propRattled.clear();eventBanner=null;transport.subscribeToState((nextState,action)=>{state=nextState;session.game=nextState;try{onState(action);}catch(error){console.error('Non-blocking game presentation error',error);screenReaderLine='';captionLine='';}if(nextState.phase==='finished'&&session.phase==='round'){session=finishRound(session);if(session.mode==='duel'){const opponentWon=session.results.at(-1)?.winnerId==='p1';setDuelReaction(opponentWon?'pleased':'annoyed',duelLine(opponentWon?'pleased':'annoyed'),true);}roundResultVisible=false;const epoch=sessionEpoch;roundEndTimer=setTimeout(()=>{if(epoch!==sessionEpoch)return;roundResultVisible=true;recordDuelResult();feedback('round',settings);persist();render();},settings.reducedMotion?80:700);}persist();render();scheduleGame();});scheduleDuelIdle();}
function beginDeckArrival(){
  audioSystem.setSettings(settings);audioSystem.play('shuffle');clearTimeout(deckAudioTimer);
  deckAudioTimer=setTimeout(()=>{audioSystem.play('deckPutDown');deckSettling=false;root.querySelector('[data-draw-anchor]')?.classList.remove('deck-settling');},1050);
}
function startSession(mode='tavern',saved=null){
  const fresh=()=>mode==='tavern'?createTavernMatch({seed:Date.now()}):mode==='duel'?createDuelSession({seed:Date.now(),opponent:getDuelOpponent(settings.duelOpponent)}):createQuickSession({playerCount:settings.playerCount,seed:Date.now()});
  try{setSession(saved?restoreSession(saved):fresh());}
  catch{clearMatch();setSession(fresh());}
  view='game';sheet=null;eventBanner=null;audioSystem.setSettings(settings);if(settings.ambience)audioSystem.startAmbience();if(settings.music)audioSystem.startMusic({newRound:true});deckSettling=!saved;render();if(!saved)beginDeckArrival();scheduleGame();
}
function commitAction(action){const beforeTurn=state?.turn,beforeTop=state?topCard(state)?.id:null;if(action.type===ACTIONS.DRAW&&action.playerId==='p0')blockAiUntil=Date.now()+500;try{transport.submitAction(action);selected=null;}catch(error){const advanced=!!state&&(state.turn!==beforeTurn||topCard(state)?.id!==beforeTop);console.error('Game action or update failed',error);hint=advanced?'':(isEnglish()?'You cannot play that card now':'אי אפשר לשחק את הקלף הזה עכשיו');if(!advanced)feedback('invalid',settings);render();if(advanced)scheduleGame();else setTimeout(()=>{hint='';render();},850);}}
function submit(action){
  if(motionLocked)return;
  if(![ACTIONS.PLAY,ACTIONS.DRAW].includes(action.type)||state?.phase!=='playing'){commitAction(action);return;}
  motionLocked=true;
  const pending={action,committed:false};pendingAction=pending;
  animateCardMovement(action).catch(error=>console.error('Card movement animation failed',error)).finally(()=>{if(pending.committed)return;pending.committed=true;pendingAction=null;motionLocked=false;commitAction(action);});
}
function flushPendingAction(){if(!pendingAction||pendingAction.committed)return;const pending=pendingAction;pending.committed=true;pendingAction=null;motionLocked=false;commitAction(pending.action);}
function cardMotionProxy(card,mode){
  const proxy=document.createElement('div');proxy.className=`travelling-card ${mode}`;proxy.setAttribute('aria-hidden','true');
  // Face-down travel contains no hidden front at all. Some mobile WebKit
  // builds briefly paint a backface during compositing, which exposed and
  // clipped the bot's card even with backface-visibility enabled.
  const front=mode==='front'?`<div class="travelling-front">${card?cardHTML(card,cardOptions({activeColor:state.activeColor})):''}</div>`:'';
  proxy.innerHTML=`<div class="travelling-inner"><div class="travelling-back"><span>${sigilHTML()}</span></div>${front}</div>`;
  document.body.append(proxy);return proxy;
}
function handAnchor(playerId){
  if(playerId==='p0')return root.querySelector('.all-cards-grid .card:last-child,.hand .card:last-child')||root.querySelector('.hand');
  return root.querySelector(`[data-player-id="${playerId}"] [data-hand-anchor] i:last-child`)||root.querySelector(`[data-player-id="${playerId}"] [data-hand-anchor]`);
}
function animateOneCard({source,destination,card,mode,duration,delay=0,index=0,trajectory='play'}){
  if(settings.reducedMotion||!source||!destination)return new Promise(resolve=>setTimeout(resolve,90+delay));
  const from=source.getBoundingClientRect(),to=destination.getBoundingClientRect(),playing=mode!=='back';
  const startW=Math.max(30,Math.min(104,from.width||52)),startH=startW*1.4,endW=Math.max(34,Math.min(playing?104:58,to.width||52)),endH=endW*1.4;
  const sx=from.left+from.width/2-startW/2,sy=from.top+from.height/2-startH/2,ex=to.left+to.width/2-endW/2,ey=to.top+to.height/2-endH/2;
  const dx=ex-sx,dy=ey-sy,bend=Math.max(12,Math.min(30,Math.hypot(dx,dy)*.055)),ratio=endW/startW;
  const proxy=cardMotionProxy(card,mode);Object.assign(proxy.style,{left:`${sx}px`,top:`${sy}px`,width:`${startW}px`,height:`${startH}px`});
  const playFrames=[
    {transform:'translate3d(0,0,0) rotate(0deg) scale(1)',filter:'brightness(.92)',offset:0},
    {transform:`translate3d(${dx*.16}px,${dy*.16-bend*.55}px,0) rotate(${playing?-2:1}deg) scale(${1+(ratio-1)*.12})`,filter:'brightness(1.02)',offset:.16},
    {transform:`translate3d(${dx*.55}px,${dy*.55-bend}px,0) rotate(${playing?2:-2}deg) scale(${1+(ratio-1)*.54})`,filter:'brightness(1.04)',offset:.55},
    {transform:`translate3d(${dx*.88}px,${dy*.88-bend*.42}px,0) rotate(${playing?0.7:-0.7}deg) scale(${1+(ratio-1)*.88})`,filter:'brightness(1.02)',offset:.88},
    {transform:`translate3d(${dx}px,${dy}px,0) rotate(0deg) scale(${ratio})`,filter:'brightness(1)',offset:1}
  ];
  const drawFrames=[
    {transform:'translate3d(0,0,0) rotate(-1deg) scale(1)',filter:'brightness(.9)',offset:0},
    {transform:`translate3d(${dx*.08}px,${dy*.03-34}px,0) rotate(-4deg) scale(1.09)`,filter:'brightness(1.08) drop-shadow(0 18px 12px #0009)',offset:.2},
    {transform:`translate3d(${dx*.42}px,${dy*.34-72}px,0) rotate(3deg) scale(${Math.max(1.08,1+(ratio-1)*.35)})`,filter:'brightness(1.12) drop-shadow(0 24px 15px #0008)',offset:.5},
    {transform:`translate3d(${dx*.84}px,${dy*.79-24}px,0) rotate(-1deg) scale(${1+(ratio-1)*.82})`,filter:'brightness(1.06) drop-shadow(0 10px 8px #0008)',offset:.84},
    {transform:`translate3d(${dx}px,${dy}px,0) rotate(0deg) scale(${ratio})`,filter:'brightness(1)',offset:1}
  ];
  const frames=trajectory==='draw'?drawFrames:playFrames;
  return new Promise(resolve=>{setTimeout(()=>{const animation=proxy.animate(frames,{duration,easing:'cubic-bezier(.2,.72,.18,1)',fill:'forwards'});animation.finished.catch(()=>{}).finally(()=>{proxy.remove();resolve();});},delay);});
}
async function animateCardMovement(action){
  const player=state.players.find(item=>item.id===action.playerId);if(!player)return;
  const draw=action.type===ACTIONS.DRAW,card=draw?null:player.hand.find(item=>item.id===action.cardId);
  const source=draw?root.querySelector('[data-draw-anchor]'):(action.playerId==='p0'?root.querySelector(`.hand [data-card-id="${action.cardId}"]`):handAnchor(action.playerId)),destination=draw?handAnchor(action.playerId):root.querySelector('[data-discard-anchor]');
  // Opponent cards stay face-down in flight and are revealed by the discard
  // pile after landing. This avoids mobile 3D clipping and face flashes.
  const mode=draw||action.playerId!=='p0'?'back':'front';
  const count=draw?Math.min(state.activePenalty?.amount||1,8):1,duration=draw?500:action.playerId==='p0'?500:390;
  audioSystem.setSettings(settings);
  if(draw&&state.drawPile.length===0&&state.discardPile.length>1){
    source?.classList.add('deck-settling');audioSystem.play('shuffle');
    await new Promise(resolve=>setTimeout(resolve,1050));
    source?.classList.remove('deck-settling');audioSystem.play('deckPutDown');
  }
  if(draw){audioSystem.play(count>1?'drawMultiple':'cardDraw',{delay:70});source?.classList.add('drawing');destination?.classList.add('receiving-card');}
  else{
    const calmStyle=session.mode==='duel'&&action.playerId==='p1'&&['quiet','measured'].includes(currentDuelOpponent().cardPlayStyle);
    const soft=!!state.taki?.open||calmStyle||(action.playerId!=='p0'&&String(card?.id||'').split('').reduce((sum,char)=>sum+char.charCodeAt(0),0)%3===0);
    audioSystem.playCardPlacement({soft,delay:duration-20});
  }
  if(!draw)source?.classList.add('motion-source');
  await Promise.all(Array.from({length:count},(_,index)=>animateOneCard({source,destination,card,mode,duration,delay:index*110,index,trajectory:draw?'draw':'play'})));
  if(draw){source?.classList.remove('drawing');destination?.classList.remove('receiving-card');}
  if(!draw)source?.classList.remove('motion-source');
}
function showEvent(kind,playerId=null,amount=null,cardId=null){clearTimeout(eventTimer);eventBanner={kind,playerId,targetId:playerId,amount,cardId};eventTimer=setTimeout(()=>{eventBanner=null;captionLine='';root.querySelector('.direction-engraving')?.classList.remove('lit');root.querySelectorAll('.stop-seal').forEach(node=>node.remove());root.querySelectorAll('.opponent.sealed').forEach(node=>node.classList.remove('sealed'));},settings.reducedMotion?200:900);}
function showQuip(player,text,force=false){if(!settings.dialogue||!text||(!force&&Date.now()-lastQuipAt<7800))return;lastQuipAt=Date.now();clearTimeout(quipTimer);quip={player,text};quipTimer=setTimeout(()=>{quip=null;render();},Math.min(2800,1500+text.length*42));}
function botLine(playerId,trigger){const player=state.players.find(p=>p.id===playerId),pool=(isEnglish()?dialogueEn:dialogueHe)[player?.archetype]?.[trigger]||[];return pool[Math.floor(Math.random()*pool.length)];}
function cardCountLabel(count){return isEnglish()?(count===0?'No cards':count===1?'1 card':`${count} cards`):(count===0?'אין קלפים':count===1?'קלף אחד':`${count} קלפים`);}
function cardCountHTML(count){return isEnglish()?(count===0?'No cards':count===1?'<bdi>1</bdi> card':`<bdi>${count}</bdi> cards`):(count===0?'אין קלפים':count===1?'קלף אחד':`<bdi>${count}</bdi> קלפים`);}
function announce(entries){
  const names=Object.fromEntries(state.players.map(p=>[p.id,displayName(p)]));
  if(isEnglish()){
    const handOf=id=>id==='p0'?'your hand':`${names[id]}'s hand`;
    const stop=entries.find(x=>x.type==='stop'),penalty=entries.find(x=>x.type==='drawPenalty'),draw=entries.find(x=>x.type==='draw'),stack=entries.find(x=>x.type==='plus2'),play=entries.findLast?.(x=>x.type==='play');
    if(stop)return stop.skipped==='p0'?'Your turn was skipped':`${names[stop.skipped]}'s turn was skipped`;
    if(penalty)return`${penalty.amount} cards were added to ${handOf(penalty.playerId)}`;
    if(draw)return`A card was added to ${handOf(draw.playerId)}`;
    if(entries.some(x=>x.type==='reverse'))return'The direction of play was reversed';
    if(entries.some(x=>x.type==='takiOpened'))return'TAKI run opened';
    if(entries.some(x=>x.type==='takiClosed'))return'TAKI run closed';
    if(entries.some(x=>x.type==='playAgain'))return currentPlayer(state).id==='p0'?'Your turn continues':`${displayName(currentPlayer(state))}'s turn continues`;
    if(entries.some(x=>x.type==='color'))return`Active color: ${colorName(entries.find(x=>x.type==='color').color)}`;
    if(stack)return`Draw penalty increased to ${stack.amount}`;
    const win=entries.find(x=>x.type==='win');if(win)return win.playerId==='p0'?'You won the round':`${names[win.playerId]} won the round`;
    if(play){const card=state.discardPile.find(c=>c.id===play.cardId),label=card?cardLabel(card,'en'):'card';return play.playerId==='p0'?`You played ${label}`:`${names[play.playerId]}: ${label}`;}
    return'';
  }
  const handOf=id=>id==='p0'?'לידכם':`ליד של ${names[id]}`;
  const stop=entries.find(x=>x.type==='stop'),penalty=entries.find(x=>x.type==='drawPenalty'),draw=entries.find(x=>x.type==='draw'),stack=entries.find(x=>x.type==='plus2'),play=entries.findLast?.(x=>x.type==='play');
  if(stop)return stop.skipped==='p0'?'התור שלכם דולג':`התור של ${names[stop.skipped]} דולג`;
  if(penalty)return`נוספו ${penalty.amount} קלפים ${handOf(penalty.playerId)}`;
  if(draw)return`נוסף קלף ${handOf(draw.playerId)}`;
  if(entries.some(x=>x.type==='reverse'))return'כיוון המשחק התהפך';
  if(entries.some(x=>x.type==='takiOpened'))return'רצף טאקי נפתח';
  if(entries.some(x=>x.type==='takiClosed'))return'רצף טאקי נסגר';
  if(entries.some(x=>x.type==='playAgain'))return currentPlayer(state).id==='p0'?'התור שלכם ממשיך':`התור ממשיך אצל ${currentPlayer(state).name}`;
  if(entries.some(x=>x.type==='color'))return`הצבע הפעיל: ${colorName(entries.find(x=>x.type==='color').color)}`;
  if(stack)return`עונש המשיכה הצטבר ל-${stack.amount}`;
  const win=entries.find(x=>x.type==='win');if(win)return win.playerId==='p0'?'הסיבוב הסתיים בניצחון שלכם':`הסיבוב הסתיים בניצחון של ${names[win.playerId]}`;
  if(play){const card=state.discardPile.find(c=>c.id===play.cardId),label=card?cardLabel(card,'he'):'קלף';return play.playerId==='p0'?`שיחקתם ${label}`:`${names[play.playerId]}: ${label}`;}
  return'';
}
function isFeminine(player){return!!player&&(['hunter','scholar'].includes(player.archetype)||['איילה','לידיה','סֶלָה'].includes(player.name));}
function winnerLine(player){if(!player)return'';if(isEnglish())return player.id==='p0'?'You won the round':`${displayName(player)} won the round`;if(player.id==='p0')return'ניצחת בסיבוב';return`${player.name} ${isFeminine(player)?'ניצחה':'ניצח'} בסיבוב`;}
function queueDraw(playerId,amount){const player=state.players.find(p=>p.id===playerId);if(!player)return;const flight={id:++flightId,playerId,slot:player.kind==='human'?'human':(opponentSlot(player.id)),count:Math.min(amount,6),amount};drawFlights.push(flight);setTimeout(()=>{drawFlights=drawFlights.filter(item=>item.id!==flight.id);root.querySelectorAll(`[data-flight-id="${flight.id}"]`).forEach(node=>node.remove());},settings.reducedMotion?250:1450);}
function opponentSlot(playerId){const players=state.players.slice(1,6),layouts={1:['top'],2:['left','right'],3:['left','top','right'],4:['far-left','left','right','far-right'],5:['far-left','left','top','right','far-right']};return (layouts[players.length]||layouts[5])[players.findIndex(p=>p.id===playerId)]||'top';}
function onState(action){
  const entries=state.log.slice(lastLogLength);lastLogLength=state.log.length;
  const latest=entries.at(-1),stop=entries.find(e=>e.type==='stop'),reverse=entries.find(e=>e.type==='reverse'),again=entries.find(e=>e.type==='playAgain'),penalty=entries.find(e=>e.type==='drawPenalty'),color=entries.find(e=>e.type==='color'),closed=entries.find(e=>e.type==='takiClosed'),opened=entries.find(e=>e.type==='takiOpened'),draw=entries.find(e=>e.type==='draw');
  const played=entries.findLast?.(e=>e.type==='play');const playedCard=played?state.discardPile.find(c=>c.id===played.cardId):null;
  const arrived=[];for(const player of state.players){let order=0;const old=new Set(lastHands[player.id]||[]);for(const card of player.hand)if(!old.has(card.id)){incomingCardDelays.set(card.id,{delay:360+Math.min(order++,5)*72,started:performance.now()});arrived.push(card.id);}lastHands[player.id]=player.hand.map(card=>card.id);lastCounts[player.id]=player.hand.length;}
  if(arrived.length){const epoch=sessionEpoch;setTimeout(()=>{if(epoch!==sessionEpoch)return;for(const id of arrived){incomingCardDelays.delete(id);root.querySelector(`[data-card-id="${id}"]`)?.classList.remove('incoming');}},settings.reducedMotion?250:1800);}
  screenReaderLine=announce(entries);captionLine=screenReaderLine;
  const stack=entries.find(e=>e.type==='plus2');
  if(stop)showEvent('stop',stop.skipped,null,played?.cardId);else if(closed&&opened)showEvent('takiCycle',opened.playerId,null,played?.cardId);else if(closed)showEvent('takiClose',closed.playerId,null,played?.cardId);else if(opened)showEvent('takiOpen',opened.playerId,null,played?.cardId);else if(penalty)showEvent('penalty',penalty.playerId,penalty.amount);else if(draw)showEvent('draw',draw.playerId,draw.amount||1);else if(reverse)showEvent('reverse',played?.playerId,null,played?.cardId);else if(again)showEvent('plus',played?.playerId,null,played?.cardId);else if(stack)showEvent('plus2',stack.playerId,stack.amount,played?.cardId);else if(color)showEvent('color',color.playerId,null,played?.cardId);else if(playedCard?.type===TYPES.KING)showEvent('king',played.playerId,null,played.cardId);else if(played)showEvent('play',played.playerId,null,played.cardId);
  audioSystem.setSettings(settings);
  const effectDelay=played?45:0;
  if(closed&&opened){audioSystem.play('takiOpen',{delay:effectDelay});audioSystem.play('takiClose',{delay:effectDelay+250});}
  else if(closed)audioSystem.play('takiClose',{delay:effectDelay});
  else if(opened)audioSystem.play('takiOpen',{delay:effectDelay});
  if(stop)audioSystem.play('stopSkip',{delay:effectDelay});
  if(reverse)audioSystem.play('reverse',{delay:effectDelay});
  if(stack)audioSystem.play('plusCard',{delay:effectDelay});
  if(color)audioSystem.play('colorChange');
  const playedBy=played&&state.players.find(player=>player.id===played.playerId);
  if(playedBy?.hand.length===1)audioSystem.play('lastCard',{delay:(stop||reverse||stack||opened||closed)?230:90});
  const winnerId=entries.find(entry=>entry.type==='win')?.playerId||(state.phase==='finished'?state.winnerId:null);
  if(winnerId)audioSystem.play(winnerId==='p0'?'winHand':'loseHand',{delay:(stop||reverse||stack||opened||closed)?280:90});
  if(closed||opened)feedback('takiOpen',settings);else if(stop)feedback('stop',settings);else if(reverse)feedback('reverse',settings);else if(stack||penalty)feedback('penalty',settings);else if(playedCard?.type===TYPES.KING)feedback('king',settings);else if(again)feedback('plus',settings);else if(draw||action.type===ACTIONS.DRAW)feedback('draw',settings);else if(color)feedback('color',settings);else if(entries.length)feedback('play',settings);
  if(penalty?.amount>=6){propRattled.add(penalty.playerId);const epoch=sessionEpoch;setTimeout(()=>{if(epoch!==sessionEpoch)return;propRattled.delete(penalty.playerId);root.querySelector(`[data-player-id="${penalty.playerId}"]`)?.classList.remove('rattled');},520);}
  if(state.taki?.open)takiRun++;if(closed){if(takiRun>=3){const watcher=state.players.find(p=>p.kind==='ai'&&p.id!==closed.playerId);showQuip(watcher?.id,botLine(watcher?.id,'penalty'));}takiRun=0;}
  if(stop)showQuip(stop.skipped,botLine(stop.skipped,'skip'));
  else if(penalty&&penalty.amount>=4)showQuip(penalty.playerId,botLine(penalty.playerId,'penalty'));
  else if(reverse){const speaker=state.players.find(p=>p.kind==='ai');showQuip(speaker?.id,botLine(speaker?.id,'reverse'));}
  else if(playedCard?.type===TYPES.KING){const speaker=state.players.find(p=>p.kind==='ai'&&p.id!==played.playerId);showQuip(speaker?.id,botLine(speaker?.id,'king'));}
  else if(played){const one=state.players.find(p=>p.hand.length===1&&p.id===played.playerId),speaker=state.players.find(p=>p.kind==='ai'&&p.id!==played.playerId);if(one)showQuip(speaker?.id,botLine(speaker?.id,'last'),true);else if(Math.random()<.1){const banter=isEnglish()?tavernBanterEn:tavernBanterHe;showQuip(speaker?.id,banter[Math.floor(Math.random()*banter.length)]);}}
  if(session.mode==='duel'){
    const humanMove=played?.playerId==='p0',opponentMove=played?.playerId==='p1';
    if((penalty?.playerId==='p1'&&penalty.amount>=4)||stop?.skipped==='p1')setDuelReaction('annoyed',duelLine('annoyed'));
    else if(humanMove&&(reverse||opened||playedCard?.type===TYPES.KING||state.players[0].hand.length===1))setDuelReaction('surprised',duelLine('surprised'));
    else if(opponentMove&&(stack||opened||playedCard?.type===TYPES.KING||state.players[1].hand.length===1))setDuelReaction('pleased',duelLine('pleased'));
  }
}
function delay(){const base=settings.difficulty==='quick'?720:settings.difficulty==='thoughtful'?1450:1050;const archetype=currentPlayer(state)?.archetype;return base+(archetype==='hunter'?140:archetype==='bard'?-80:0);}
function scheduleGame(){
  clearTimeout(botTimer);clearTimeout(takiTimer);
  if(!state||session.phase!=='round'||state.phase==='finished')return;
  const active=currentPlayer(state);
  if(active.kind==='human')return;
  const playerId=active.id,epoch=sessionEpoch,scheduledTurn=state.turn;
  botTimer=setTimeout(()=>{
    if(epoch!==sessionEpoch||!state||session.phase!=='round'||state.phase==='finished')return;
    const current=currentPlayer(state);
    if(current.id!==playerId||current.kind!=='ai'||state.turn!==scheduledTurn)return;
    try{submit(chooseBotAction(state));}
    catch(error){
      console.error('AI turn action failed',error);
      if(currentPlayer(state).id===playerId&&state.phase==='playing'){
        try{submit({type:ACTIONS.DRAW,playerId});}
        catch(fallbackError){console.error('AI fallback draw failed',fallbackError);}
      }
      if(state.phase!=='finished'&&currentPlayer(state).kind==='ai'){try{render();}catch(renderError){console.error('AI recovery render failed',renderError);}scheduleGame();}
    }
  },Math.max(delay(),blockAiUntil-Date.now()));
}

function homeHTML(){
  const saved=loadMatch();let savedSession=null;try{savedSession=saved?restoreSession(saved):null;if(savedSession?.mode==='quick'&&savedSession.game?.players?.length>6)savedSession=null;}catch{}
  const resumable=savedSession&&savedSession.phase!=='matchFinished';
  const savedOpponent=savedSession?.mode==='duel'?displayOpponent(getDuelOpponent(savedSession.opponentId||settings.duelOpponent)):null;
  if(isEnglish()){
    const continueTitle=savedSession?.mode==='duel'?'Continue Duel':savedSession?.mode==='tavern'?'Continue Tavern Game':'Continue Quick Play';
    const continueMeta=!resumable?'':savedSession.mode==='duel'?`Against ${savedOpponent.name} · Round <bdi>${savedSession.round}</bdi> of <bdi>${savedSession.totalRounds}</bdi>`:savedSession.mode==='tavern'?`Round <bdi>${savedSession.round}</bdi> of <bdi>${savedSession.totalRounds}</bdi>`:`One hand · <bdi>${savedSession.roster?.length||savedSession.game?.players?.length||settings.playerCount}</bdi> players`;
    return `<main class="app-shell elder-home ${resumable?'has-resume':'no-resume'} ${settings.reducedMotion?'reduced-motion':''}" dir="ltr">${worldSceneHTML('home')}<section class="home-scene viewport-space" data-space="viewport"><div class="home-title">${sigilHTML('title-sigil')}<h1><span>ELDER</span><b>TAKI</b></h1></div><div class="table-choices">${resumable?`<button class="resume-marker" data-resume>${cardBackStackHTML('resume-game-token')}<span class="resume-kicker">Your game awaits</span><strong>${continueTitle}</strong><small>${continueMeta}</small><i class="resume-seal" aria-hidden="true">▶</i></button>`:''}<div class="primary-modes"><button class="mode-plaque quick-mode" data-open="quick">${cardBackStackHTML('mode-token menu-card-stack quick-card-stack')}<span class="mode-copy"><strong>Quick Play</strong><small>One hand</small></span></button><button class="mode-plaque tavern-mode" data-tavern><span class="mode-token coin-stack"><i></i><i></i><i></i><i></i><i></i></span><span class="mode-copy"><strong>Tavern Game</strong><small><bdi>5</bdi> rounds · <bdi>4</bdi> players</small></span></button></div><button class="duel-invite" data-duel><span class="duel-cameo"><i class="duel-sprite" style="${duelSpriteStyle(getDuelOpponent(settings.duelOpponent),'idle')}"></i></span><span><strong>Tavern Duel</strong><small>One opponent · <bdi>5</bdi> rounds</small></span><i class="invite-arrow" aria-hidden="true">›</i></button><div class="table-tools"><button data-open="rules"><i class="folded-rules"></i><span>Rules</span></button><span class="tool-divider" aria-hidden="true"></span><button data-open="settings"><i class="brass-cog"></i><span>Settings</span></button></div></div></section>${sheetHTML()}</main>`;
  }
  const continueTitle=savedSession?.mode==='duel'?'המשך דו־קרב':savedSession?.mode==='tavern'?'המשך משחק פונדק':'המשך משחק מהיר';
  const continueMeta=!resumable?'':savedSession.mode==='duel'?`מול ${savedOpponent.name} · סיבוב <bdi>${savedSession.round}</bdi> מתוך <bdi>${savedSession.totalRounds}</bdi>`:savedSession.mode==='tavern'?`סיבוב <bdi>${savedSession.round}</bdi> מתוך <bdi>${savedSession.totalRounds}</bdi>`:`יד אחת · <bdi>${savedSession.roster?.length||savedSession.game?.players?.length||settings.playerCount}</bdi> שחקנים`;
  return `<main class="app-shell elder-home ${resumable?'has-resume':'no-resume'} ${settings.reducedMotion?'reduced-motion':''}" dir="rtl">${worldSceneHTML('home')}<section class="home-scene viewport-space" data-space="viewport"><div class="home-title">${sigilHTML('title-sigil')}<h1><span>ELDER</span><b>TAKI</b></h1></div><div class="table-choices">${resumable?`<button class="resume-marker" data-resume>${cardBackStackHTML('resume-game-token')}<span class="resume-kicker">המשחק מחכה</span><strong>${continueTitle}</strong><small>${continueMeta}</small><i class="resume-seal" aria-hidden="true">▶</i></button>`:''}<div class="primary-modes"><button class="mode-plaque quick-mode" data-open="quick">${cardBackStackHTML('mode-token menu-card-stack quick-card-stack')}<span class="mode-copy"><strong>משחק מהיר</strong><small>יד אחת</small></span></button><button class="mode-plaque tavern-mode" data-tavern><span class="mode-token coin-stack"><i></i><i></i><i></i><i></i><i></i></span><span class="mode-copy"><strong>משחק פונדק</strong><small><bdi>5</bdi> סיבובים · <bdi>4</bdi> שחקנים</small></span></button></div><button class="duel-invite" data-duel><span class="duel-cameo"><i class="duel-sprite" style="${duelSpriteStyle(getDuelOpponent(settings.duelOpponent),'idle')}"></i></span><span><strong>דו־קרב בפונדק</strong><small>יריב אחד · <bdi>5</bdi> סיבובים</small></span><i class="invite-arrow" aria-hidden="true">›</i></button><div class="table-tools"><button data-open="rules"><i class="folded-rules"></i><span>חוקים</span></button><span class="tool-divider" aria-hidden="true"></span><button data-open="settings"><i class="brass-cog"></i><span>הגדרות</span></button></div></div></section>${sheetHTML()}</main>`;
}
function duelSelectHTML(){const en=isEnglish();return `<main class="app-shell duel-select ${settings.reducedMotion?'reduced-motion':''}" dir="${direction()}">${worldSceneHTML('select')}<section class="viewport-space" data-space="viewport"><header><button class="rune-menu back" data-home aria-label="${en?'Back':'חזרה'}">‹</button><div><small>${en?'An open table awaits':'השולחן הפנוי מחכה'}</small><h1>${en?'Who will you face?':'מול מי תשבו?'}</h1></div></header><div class="regulars">${DUEL_OPPONENTS.map(base=>{const opponent=displayOpponent(base),record=settings.duelRecords?.[opponent.id];return `<button class="regular ${settings.duelOpponent===opponent.id?'chosen':''}" data-opponent="${opponent.id}"><span class="regular-portrait"><i class="duel-sprite" style="${duelSpriteStyle(opponent,'idle')}"></i></span><span class="regular-copy"><b>${opponent.name}</b><small>${opponent.descriptor}</small>${record?.played?`<em><bdi>${record.won}</bdi> ${en?'wins out of':'ניצחונות מתוך'} <bdi>${record.played}</bdi></em>`:''}</span><span class="seat-invite">${en?'Take a seat':'לשבת מולם'}</span></button>`;}).join('')}</div></section></main>`;}
function scoreBoardHTML(){if(session.mode==='quick')return'';const latest=session.results.at(-1),scored=roundResultVisible&&session.phase!=='round'?latest?.winnerId:null,scorePending=session.phase==='betweenRounds'&&!roundResultVisible;return `<aside class="score-slate ${session.mode==='duel'?'duel-score':''}" aria-label="${isEnglish()?'Cumulative score':'ניקוד מצטבר'}">${standings(session).map(p=>{const displayScore=scorePending&&latest?.winnerId===p.id?p.score-latest.points:p.score;return `<div class="score-row ${p.id===scored?'scored':''}"><span>${displayName(p)}</span><bdi>${displayScore}</bdi></div>`;}).join('')}</aside>`;}
function resultScoreHTML(winner){const total=session.scores?.[winner?.id]||0;return `<div class="score-after"><span>${isEnglish()?'Cumulative score':'ניקוד מצטבר'}</span><bdi>${total}</bdi></div>`;}
function tableEngravingHTML(){return `<svg class="table-engraving" viewBox="0 0 1000 620" preserveAspectRatio="none" aria-hidden="true"><g class="engraving-orbit"><path d="M162 323C185 169 330 91 505 91c177 0 319 77 339 231"/><path d="M842 345C811 491 671 548 501 548c-171 0-310-57-341-204"/></g><g class="engraving-inner"><path d="M229 310C255 199 363 147 501 147c140 0 248 52 273 164"/><path d="M773 360C741 456 638 496 500 496c-136 0-238-40-271-136"/></g><g class="engraving-marks"><path d="m149 324 28-29 28 29-28 29zM823 324l28-29 28 29-28 29z"/><path d="m487 91 16-20 16 20-16 20zM487 548l16-20 16 20-16 20z"/></g></svg>`;}
function cardBackStackHTML(className,count=2){const back=cardHTML(null,cardOptions({hidden:true,small:true})).replace(/ aria-label="[^"]+"/,'');return `<span class="${className}" aria-hidden="true">${back.repeat(count)}</span>`;}
function worldSceneHTML(context='game'){
  const isHome=context==='home',isDuel=context==='duel';
  return `<div class="scene-world scene-${context}" data-space="world" aria-hidden="true"><div class="tavern-environment"></div><div class="table-body"><div class="table-surface"></div>${tableEngravingHTML()}<div class="table-wear"><i></i><i></i><i></i></div></div><div class="scene-lighting"><i class="fire-glow"></i><i class="candle-glow"></i><i class="room-haze"></i><i class="table-light"></i></div><div class="environment-props ${isHome?'home-ambience':''}"><model-viewer class="world-mug ${isDuel?'duel-world-mug':''}" src="./assets/stylized_beer_mug.glb" camera-orbit="32deg 66deg 2.8m" field-of-view="28deg" exposure="1.12" shadow-intensity="1" interaction-prompt="none" disable-zoom></model-viewer><span class="world-coins"><i></i><i></i><i></i></span>${isHome?`<i class="passing-shadow"></i><i class="cup-ring"></i>${cardBackStackHTML('abandoned-cards')}<span class="loose-coins"><i></i><i></i></span><i class="table-stain"></i>`:''}</div></div>`;
}
const seatPropStories=Object.freeze({
  bard:Object.freeze({theme:'casual',items:['goblet','snack','cork']}),
  hunter:Object.freeze({theme:'practical',items:['tankard','pouch']}),
  mercenary:Object.freeze({theme:'gambler',items:['tankard','coins','dice']}),
  scholar:Object.freeze({theme:'tidy',items:['parchment','rune']}),
  mysterious:Object.freeze({theme:'mystical',items:['bottle','rune','pouch']}),
  wanderer:Object.freeze({theme:'rustic',items:['tankard','snack']})
});
function seatPropItemHTML(item){
  if(item==='tankard')return `<model-viewer class="seat-object beer-prop object-tankard" src="./assets/stylized_beer_mug.glb" camera-orbit="35deg 67deg 2.7m" field-of-view="28deg" exposure="1.25" shadow-intensity="1" interaction-prompt="none" disable-zoom></model-viewer>`;
  if(item==='coins')return '<i class="seat-object coin-prop object-coins"><b></b><b></b><b></b></i>';
  if(item==='dice')return '<i class="seat-object object-dice"><b></b><b></b></i>';
  return `<i class="seat-object object-${item}"><b></b></i>`;
}
function propsHTML(player,extraClass=''){const archetype=player.archetype||'wanderer',story=seatPropStories[archetype]||seatPropStories.wanderer;return `<span class="seat-props ${extraClass} ${archetype} story-${story.theme}" data-prop-count="${story.items.length}" aria-hidden="true">${story.items.map(seatPropItemHTML).join('')}</span>`;}
function duelPropsHTML(opponent){return propsHTML(opponent,`duel-props duel-${opponent.id}`);}
function duelOpponentHTML(player){const opponent=currentDuelOpponent(),active=currentPlayer(state).id===player.id,count=Math.min(12,player.hand.length),backs=Array.from({length:count},(_,i)=>`<i style="--offset:${i-(count-1)/2}"><span>${sigilHTML()}</span></i>`).join(''),winning=session.phase!=='round'&&session.results.at(-1)?.winnerId===player.id;return `<div class="duel-opponent seat-space seat-top ${active?'active':''} ${propRattled.has(player.id)?'rattled':''} ${winning?'winner-seat':''}" data-space="seat" data-seat="top" data-player-id="${player.id}"><div class="duel-presence"><i class="duel-sprite" style="${duelSpriteStyle(opponent,duelReaction)}"></i><i class="contact-shadow"></i></div><i class="duel-depth-rim" aria-hidden="true"></i><div class="duel-name"><b>${opponent.name}</b><small>${opponent.descriptor.split(' · ')[0]}</small><span>${cardCountHTML(player.hand.length)}</span></div><div class="duel-fan ${opponent.cardPlayStyle}" data-hand-anchor>${backs}</div>${duelPropsHTML(opponent)}${quip?.player===player.id?`<div class="speech duel-speech" role="status">${quip.text}</div>`:''}</div>`;}
function quickOpponentHTML(player){const en=isEnglish(),name=displayName(player),active=currentPlayer(state).id===player.id,stopped=eventBanner?.kind==='stop'&&eventBanner.targetId===player.id,count=Math.min(14,player.hand.length),backs=Array.from({length:count},(_,i)=>`<i style="--offset:${i-(count-1)/2};--card-order:${i}"><span>${sigilHTML()}</span></i>`).join(''),winning=session.phase!=='round'&&session.results.at(-1)?.winnerId===player.id;return `<div class="opponent quick-opponent seat-space seat-top ${active?'active':''} ${stopped?'sealed':''} ${propRattled.has(player.id)?'rattled':''} ${winning?'winner-seat':''} ${player.hand.length===1?'last-card':''}" data-space="seat" data-seat="top" data-player-id="${player.id}" role="group" aria-label="${active?(en?`It is ${name}'s turn`:`התור עכשיו אצל ${name}`):`${name}, ${cardCountLabel(player.hand.length)}`}"><div class="quick-opponent-name"><b>${name}</b><span>${player.hand.length===0?`<small>${en?'No cards':'אין קלפים'}</small>`:player.hand.length===1?`<bdi>1</bdi><small>${en?'card':'קלף'}</small>`:`<bdi>${player.hand.length}</bdi><small>${en?'cards':'קלפים'}</small>`}</span></div><div class="opponent-fan physical-fan" data-hand-anchor>${backs}</div>${propsHTML(player)}${stopped?'<span class="stop-seal" aria-hidden="true"><svg viewBox="0 0 64 64"><path d="M24 49 12 30c-3-6 4-9 8-4l5 6V15c0-6 8-6 8 0v15-18c0-6 8-6 8 0v18-13c0-6 8-6 8 0v16-7c0-6 8-6 8 0v12c0 12-8 20-20 20-8 0-13-3-17-9z"/></svg></span>':''}${quip?.player===player.id?`<div class="speech" role="status">${quip.text}</div>`:''}</div>`;}
function opponentHTML(player,slot){const en=isEnglish(),name=displayName(player),active=currentPlayer(state).id===player.id,stopped=eventBanner?.kind==='stop'&&eventBanner.targetId===player.id,count=Math.min(10,player.hand.length),backs=Array.from({length:count},(_,i)=>`<i style="--offset:${i-(count-1)/2}"><span>${sigilHTML()}</span></i>`).join(''),winning=session.phase!=='round'&&session.results.at(-1)?.winnerId===player.id;return `<div class="opponent seat-space seat-${slot} ${active?'active':''} ${stopped?'sealed':''} ${propRattled.has(player.id)?'rattled':''} ${winning?'winner-seat':''} ${player.hand.length===1?'last-card':''}" data-space="seat" data-seat="${slot}" data-player-id="${player.id}" role="group" aria-label="${active?(en?`It is ${name}'s turn`:`התור עכשיו אצל ${name}`):(en?`${name}, hidden hand`:`${name}, יד נסתרת`)}"><div class="seat-marker"><i class="house-pin ${player.house||''}"></i><span>${name}</span><small>${archetypeNames[settings.language]?.[player.archetype]||(en?'Opponent':'יריב')}</small><b><i></i><bdi>${player.hand.length}</bdi></b></div><div class="opponent-fan" data-hand-anchor>${backs}</div>${propsHTML(player)}${stopped?'<span class="stop-seal" aria-hidden="true"><svg viewBox="0 0 64 64"><path d="M24 49 12 30c-3-6 4-9 8-4l5 6V15c0-6 8-6 8 0v15-18c0-6 8-6 8 0v18-13c0-6 8-6 8 0v16-7c0-6 8-6 8 0v12c0 12-8 20-20 20-8 0-13-3-17-9z"/></svg></span>':''}${quip?.player===player.id?`<div class="speech" role="status">${quip.text}</div>`:''}</div>`;}
function opponentSeats(players){if(session.mode==='duel')return duelOpponentHTML(players[0]);if(session.mode==='quick'&&players.length===1)return quickOpponentHTML(players[0]);const layouts={1:['top'],2:['left','right'],3:['left','top','right'],4:['far-left','left','right','far-right'],5:['far-left','left','top','right','far-right']};return players.map((p,i)=>opponentHTML(p,(layouts[players.length]||layouts[5])[i]||'top')).join('');}
function statusHTML(){const en=isEnglish(),bits=[];if(state.activePenalty)bits.push(`<span class="penalty-token" aria-label="${en?`Draw ${state.activePenalty.amount} cards`:`משיכת ${state.activePenalty.amount} קלפים`}"><bdi>+${state.activePenalty.amount}</bdi><i></i></span>`);if(state.taki?.open){const human=state.taki.ownerId==='p0'&&currentPlayer(state).id==='p0',owner=displayName(state.players.find(p=>p.id===state.taki.ownerId)),color=colorName(state.taki.color);bits.push(`<div class="taki-panel ${human?'yours':'bot-taki'}" style="--taki-color:${colorHex[state.taki.color]}" role="status"><div><b>${en?'TAKI open':'TAKI פתוח'} · ${color}</b><small>${human?(en?`You can play more ${color.toLowerCase()} cards`:`אפשר להניח עוד קלפים בצבע ${color}`):(en?`${owner} keeps playing`:`${owner} ממשיך לשחק`)}</small></div>${human?`<button class="close-taki" data-close-taki>${en?'Done — close TAKI':'סיימתי — לסגור TAKI'}</button>`:''}</div>`);}return bits.join('');}
function choiceHTML(){if(state.awaitingColor?.playerId!=='p0')return'';const en=isEnglish();return `<div class="color-choice" role="dialog" aria-label="${en?'Choose a color':'בחירת צבע'}"><div class="gem-ring"><span>${en?'Choose a color':'בחרו צבע'}</span>${COLORS.map(c=>`<button class="gem ${c}" data-color="${c}" aria-label="${colorName(c)}"><i>${colorRuneHTML(c,'gem-rune')}</i></button>`).join('')}</div></div>`;}
function eventHTML(){return settings.captions&&captionLine?`<div class="table-caption" aria-hidden="true">${captionLine}</div>`:'';}
function flightsHTML(){return drawFlights.map(f=>Array.from({length:f.count},(_,i)=>`<span class="card-flight to-${f.slot}" data-flight-id="${f.id}" style="--flight-delay:${i*(f.count>5?42:72)}ms;--flight-index:${i}" aria-hidden="true"></span>`).join('')).join('');}
function roundMarkerHTML(){if(session.mode==='quick')return'';return `<div class="round-marker">${isEnglish()?(session.suddenDeath?'Tie · Final hand':`${session.mode==='duel'?'Duel · ':''}Round <bdi>${session.round}</bdi> of <bdi>${session.totalRounds}</bdi>`):(session.suddenDeath?'שוויון · יד אחרונה':`${session.mode==='duel'?'דו־קרב · ':''}סיבוב <bdi>${session.round}</bdi> מתוך <bdi>${session.totalRounds}</bdi>`)}</div>`;}
function gameHTML(){
  const en=isEnglish(),human=state.players[0],active=currentPlayer(state),oneOnOne=session.mode==='quick'&&state.players.length===2,isHumanTurn=session.phase==='round'&&active.id===human.id&&!state.awaitingColor,legal=new Set(isHumanTurn?getLegalCards(state,human.id).map(c=>c.id):[]),shown=human.hand,top=topCard(state);
  if(active.id!==lastActivePlayerId){lastActivePlayerId=active.id;if(active.id===human.id)turnCueUntil=Date.now()+(settings.reducedMotion?650:1650);}
  const turnHint=hint||(isHumanTurn?(en?'Your turn':'התור שלך'):'');
  const under=state.discardPile.slice(-4,-1),fresh=top.id!==lastRenderedTopId;lastRenderedTopId=top.id;
  const arrows=`<svg class="direction-arrows" viewBox="0 0 300 300" aria-label="${en?'Direction of play':'כיוון המשחק'}"><defs><filter id="rune-waver"><feTurbulence type="fractalNoise" baseFrequency=".025" numOctaves="2" seed="8" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="2.1"/></filter></defs><g filter="url(#rune-waver)"><path class="rune-route" pathLength="100" d="M57 181A105 105 0 0 1 226 74"/><path class="rune-head" d="m219 54 9 22-24 4"/><path class="rune-route" pathLength="100" d="M243 119A105 105 0 0 1 74 226"/><path class="rune-head" d="m81 246-9-22 24-4"/></g></svg>`;
  const handCards=shown.map((card,i)=>{const incoming=incomingCardDelays.get(card.id);return cardHTML(card,cardOptions({legal:isHumanTurn&&legal.has(card.id),highlight:settings.playableHints,selected:selected===card.id,incoming:!!incoming,arrivalDelay:incoming?incoming.delay-(performance.now()-incoming.started):0,index:i,total:shown.length}));}).join('');
  const turnVars=`--active:${colorHex[state.activeColor]||'#b78b45'}`;
  return `<main class="app-shell table-shell ${session.mode==='tavern'?'tavern-table':''} ${session.mode==='duel'?'duel-table':''} ${oneOnOne?'quick-one-on-one':''} ${session.suddenDeath?'sudden-death':''} ${settings.reducedMotion?'reduced-motion':''}" dir="${direction()}" style="${turnVars}">${worldSceneHTML(session.mode==='duel'?'duel':'game')}<section class="game ${isHumanTurn?'human-turn':'waiting'}"><header class="game-head viewport-space" data-space="viewport"><button class="rune-menu" data-open="pause" aria-label="${en?'Menu and pause':'תפריט והשהיה'}"><i></i><i></i><i></i></button>${roundMarkerHTML()}${scoreBoardHTML()}</header><div class="board"><div class="opponents seat-layer">${opponentSeats(state.players.slice(1,6))}</div><div class="gameplay-anchors" data-space="world"><div class="direction-engraving ${state.direction<0?'counter':''} ${eventBanner?.kind==='reverse'?'lit':''} ${state.taki?.open?'taki-lit':''}">${arrows}${sigilHTML('table-sigil')}<span class="house-node red ${state.activeColor==='red'?'on':''}"></span><span class="house-node blue ${state.activeColor==='blue'?'on':''}"></span><span class="house-node green ${state.activeColor==='green'?'on':''}"></span><span class="house-node yellow ${state.activeColor==='yellow'?'on':''}"></span></div><div class="center"><div class="status-stack">${statusHTML()}</div><button class="pile draw-pile ${deckSettling?'deck-settling':''}" data-draw data-draw-anchor aria-label="${en?`Draw a card. ${state.drawPile.length} cards remain`:`משיכת קלף. ${state.drawPile.length} קלפים נותרו`}" style="--deck-depth:${Math.min(8,Math.ceil(state.drawPile.length/15))}px"><span class="back-sigil">${sigilHTML()}</span><span class="deck-count"><bdi>${state.drawPile.length}</bdi></span></button><div class="pile discard ${fresh?'fresh':''}" data-discard-anchor style="--pile-turn:${((state.discardPile.length%7)-3)*.7}deg" aria-label="${en?`Top card. Active color: ${colorName(state.activeColor)||'Wild'}`:`הקלף המוביל. הצבע הפעיל: ${colorName(state.activeColor)||'חופשי'}`}"><div class="discard-under">${under.map((card,i)=>`<span class="under under-${i}">${cardHTML(card,cardOptions())}</span>`).join('')}</div>${cardHTML(top,cardOptions({activeColor:state.activeColor}))}<span class="active-stone ${state.activeColor||'wild'}">${state.activeColor?colorRuneHTML(state.activeColor,'active-color-rune'):sigilHTML('active-color-rune')}</span></div>${eventHTML()}</div></div><span class="sr-only" aria-live="polite" aria-atomic="true">${screenReaderLine}</span></div><footer class="hand-area seat-space seat-bottom ${isHumanTurn?'your-active':''}" data-space="seat" data-seat="bottom"><div class="turn-whisper ${hint?'notice':(Date.now()<turnCueUntil?'turn-cue':'')}">${turnHint?`<span>${turnHint}</span>`:''}</div><div class="hand ${state.taki?.open?'taki-active':''}" data-hand-anchor>${handCards}</div>${quip?.player==='p0'?`<div class="human-quip">${quip.text}</div>`:''}</footer></section>${choiceHTML()}${summaryHTML()}${sheetHTML()}</main>`;
}
function summaryHTML(){
  if(!session||session.phase==='round'||(!roundResultVisible&&session.phase!=='round'))return'';
  if(isEnglish()){
    if(session.mode==='quick'){const winner=state.players.find(p=>p.id===session.championId);return `<div class="result-wrap"><article class="tally-board"><small>Round over</small><h2>${winnerLine(winner)}</h2><div class="result-actions"><button class="leather-button primary" data-quick>Play another round</button><button class="text-link" data-home>Leave the table</button></div></article></div>`;}
    if(session.mode==='duel'){
      const opponent=currentDuelOpponent(),result=session.results.at(-1),winner=session.roster.find(p=>p.id===result?.winnerId);
      if(session.phase==='matchFinished'){const humanScore=session.scores.p0||0,opponentScore=session.scores.p1||0,won=session.championId==='p0';return `<div class="result-wrap duel-result"><article class="tally-board champion"><small>Tavern Duel</small><h2>${won?'You won the duel':`${opponent.name} won`}</h2><div class="duel-final-score"><span><small>You</small><bdi>${humanScore}</bdi></span><i>:</i><span><small>${opponent.name}</small><bdi>${opponentScore}</bdi></span></div><div class="result-actions"><button class="leather-button primary" data-rematch>Rematch</button><button class="parchment-button" data-choose-opponent>Choose another opponent</button><button class="text-link" data-home>Leave the table</button></div></article></div>`;}
      const loser=session.roster.find(p=>p.id!==result.winnerId),remaining=result.remaining[loser.id];return `<div class="result-wrap table-result duel-round-result"><article class="tally-board round-tally"><small>${session.suddenDeath?'Tie · Final hand':`Round <bdi>${result.round}</bdi> of <bdi>5</bdi>`}</small><h2>${winnerLine(winner)}</h2><p>${loser.id==='p0'?'You have':`${displayName(loser)} has`} ${cardCountHTML(remaining)} left</p><div class="coin-total"><span>Round score</span><strong><bdi>+${result.points}</bdi></strong></div>${resultScoreHTML(winner)}<div class="result-actions"><button class="leather-button primary" data-next>${session.suddenDeath?'Play the final hand':'Next round'}</button><button class="text-link" data-home>Save and leave</button></div></article></div>`;
    }
    if(session.phase==='matchFinished'){const champion=session.roster.find(p=>p.id===session.championId);return `<div class="result-wrap"><article class="tally-board champion">${sigilHTML('result-sigil')}<small>Tavern Champion</small><h2>${displayName(champion)}</h2><div class="final-standing">${standings(session).map((p,i)=>`<div><b><bdi>${i+1}</bdi></b><span>${displayName(p)}</span><strong><bdi>${p.score}</bdi></strong></div>`).join('')}</div><div class="result-actions"><button class="leather-button primary" data-tavern>Another evening</button><button class="text-link" data-home>Leave the table</button></div></article></div>`;}
    const result=session.results.at(-1),winner=session.roster.find(p=>p.id===result.winnerId),losers=session.roster.filter(p=>p.id!==result.winnerId),equation=losers.map(p=>result.remaining[p.id]).join(' + ');
    return `<div class="result-wrap table-result"><article class="tally-board round-tally"><small>${session.suddenDeath?'Deciding hand':`Round <bdi>${result.round}</bdi>`}</small><h2>${winnerLine(winner)}</h2><div class="round-count">${losers.map((p,i)=>`<span style="--token-order:${i}"><small>${displayName(p)}</small><b><bdi>${result.remaining[p.id]}</bdi></b></span>`).join('')}</div><div class="coin-total"><span dir="ltr">${equation}</span><strong><bdi>+${result.points}</bdi></strong></div>${resultScoreHTML(winner)}<div class="result-actions"><button class="leather-button primary" data-next>${session.suddenDeath?'Play the deciding hand':'Next round'}</button><button class="text-link" data-home>Save and leave</button></div></article></div>`;
  }
  if(session.mode==='quick'){const winner=state.players.find(p=>p.id===session.championId);return `<div class="result-wrap"><article class="tally-board"><small>סוף הסיבוב</small><h2>${winnerLine(winner)}</h2><div class="result-actions"><button class="leather-button primary" data-quick>לסיבוב נוסף</button><button class="text-link" data-home>לצאת מהשולחן</button></div></article></div>`;}
  if(session.mode==='duel'){
    const opponent=currentDuelOpponent(),result=session.results.at(-1),winner=session.roster.find(p=>p.id===result?.winnerId);
    if(session.phase==='matchFinished'){const humanScore=session.scores.p0||0,opponentScore=session.scores.p1||0,won=session.championId==='p0';return `<div class="result-wrap duel-result"><article class="tally-board champion"><small>דו־קרב בפונדק</small><h2>${won?'ניצחתם בדו־קרב':`${opponent.name} ${isFeminine(opponent)?'ניצחה':'ניצח'}`}</h2><div class="duel-final-score"><span><small>אתם</small><bdi>${humanScore}</bdi></span><i>:</i><span><small>${opponent.name}</small><bdi>${opponentScore}</bdi></span></div><div class="result-actions"><button class="leather-button primary" data-rematch>דו־קרב חוזר</button><button class="parchment-button" data-choose-opponent>לבחור יריב אחר</button><button class="text-link" data-home>לעזוב את השולחן</button></div></article></div>`;}
    const loser=session.roster.find(p=>p.id!==result.winnerId),remaining=result.remaining[loser.id];return `<div class="result-wrap table-result duel-round-result"><article class="tally-board round-tally"><small>${session.suddenDeath?'שוויון · יד אחרונה':`סיבוב <bdi>${result.round}</bdi> מתוך <bdi>5</bdi>`}</small><h2>${winnerLine(winner)}</h2><p>${loser.id==='p0'?'נשארו לכם':`נשארו ל${loser.name}`} ${cardCountHTML(remaining)}</p><div class="coin-total"><span>ניקוד הסיבוב</span><strong><bdi>+${result.points}</bdi></strong></div>${resultScoreHTML(winner)}<div class="result-actions"><button class="leather-button primary" data-next>${session.suddenDeath?'ליד האחרונה':'לסיבוב הבא'}</button><button class="text-link" data-home>לשמור ולצאת</button></div></article></div>`;
  }
  if(session.phase==='matchFinished'){const champion=session.roster.find(p=>p.id===session.championId);return `<div class="result-wrap"><article class="tally-board champion">${sigilHTML('result-sigil')}<small>אלוף הפונדק</small><h2>${champion?.id==='p0'?'אתם':champion?.name}</h2><div class="final-standing">${standings(session).map((p,i)=>`<div><b><bdi>${i+1}</bdi></b><span>${p.name}</span><strong><bdi>${p.score}</bdi></strong></div>`).join('')}</div><div class="result-actions"><button class="leather-button primary" data-tavern>ערב נוסף</button><button class="text-link" data-home>לעזוב את השולחן</button></div></article></div>`;}
  const result=session.results.at(-1),winner=session.roster.find(p=>p.id===result.winnerId),losers=session.roster.filter(p=>p.id!==result.winnerId),equation=losers.map(p=>result.remaining[p.id]).join(' + ');
  return `<div class="result-wrap table-result"><article class="tally-board round-tally"><small>${session.suddenDeath?'יד מכרעת':`סיבוב <bdi>${result.round}</bdi>`}</small><h2>${winnerLine(winner)}</h2><div class="round-count">${losers.map((p,i)=>`<span style="--token-order:${i}"><small>${p.name}</small><b><bdi>${result.remaining[p.id]}</bdi></b></span>`).join('')}</div><div class="coin-total"><span dir="ltr">${equation}</span><strong><bdi>+${result.points}</bdi></strong></div>${resultScoreHTML(winner)}<div class="result-actions"><button class="leather-button primary" data-next>${session.suddenDeath?'ליד המכרעת':'לסיבוב הבא'}</button><button class="text-link" data-home>לשמור ולצאת</button></div></article></div>`;
}
function sheetHTML(){
  if(!sheet)return'';
  if(isEnglish()){
    if(sheet==='quick')return `<div class="sheet-wrap quick-wrap"><article class="tavern-sheet"><h2>Quick Play</h2><p>One hand, with no cumulative score.</p><label>Number of players</label><div class="segmented">${[2,3,4,6].map(n=>`<button data-players="${n}" class="${settings.playerCount===n?'on':''}">${n}</button>`).join('')}</div><button class="parchment-button primary" data-quick>Start</button><button class="text-link" data-close-sheet>Back</button></article></div>`;
    if(sheet==='rules')return `<div class="sheet-wrap rules-wrap"><article class="tavern-sheet rules"><h2>Elder Taki Rules</h2><p>Match the color, number, or symbol. A card you draw waits until your next turn. The first player to empty their hand wins.</p><h3 class="rule-heading"><span>TAKI</span><i class="rule-card taki-rule">ᛏ</i></h3><p>TAKI opens a run in one color. Keep playing or select <b>Close TAKI</b>. Only the last action card in the run takes effect; after a Plus, you must play again.</p><h3 class="rule-heading"><span>King and Super TAKI</span><i class="rule-card king-rule">♛</i></h3><p>The <b>King</b> cancels every restriction and grants another free play while the player still has cards. It can win as the final card. Super TAKI after a King lets you choose the run color.</p><h3>Tavern Duel</h3><p>Five rounds against one opponent. The winner scores one point for every card left in the loser's hand. All five rounds are played; a tie leads to a final hand.</p><h3>Tavern Game</h3><p>Five rounds against three opponents. Each hand's winner scores one point for every card left in the other hands. A tie after round five leads to a deciding hand.</p><h3 class="rule-heading"><span>The Ancient Cards</span><i class="rule-actions" aria-hidden="true"><b>⊘</b><b>↺</b><b>＋</b><b>◈</b></i></h3><p><b>Stop</b> skips a player, <b>Reverse</b> changes direction, <b>Plus</b> grants another play, <b>+2</b> stacks, and <b>Change Color</b> chooses a house.</p><button class="parchment-button" data-close-sheet>Got it</button></article></div>`;
    return settingsHTML({title:sheet==='pause'?'Game paused':'Settings',language:'Language',sound:'Sound',gameSounds:'Game sounds',music:'Background music',ambience:'Tavern ambience',gameplay:'Gameplay',dialogue:'Opponent reactions',captions:'Game-event captions',hints:'Highlight playable cards',accessibility:'Accessibility',haptics:'Haptics',motion:'Reduce motion',close:sheet==='pause'?'Return to table':'Close',leave:'Save and leave'});
  }
  if(sheet==='quick')return `<div class="sheet-wrap quick-wrap"><article class="tavern-sheet"><h2>משחק מהיר</h2><p>יד אחת, בלי ניקוד מצטבר.</p><label>מספר שחקנים</label><div class="segmented">${[2,3,4,6].map(n=>`<button data-players="${n}" class="${settings.playerCount===n?'on':''}">${n}</button>`).join('')}</div><button class="parchment-button primary" data-quick>להתחיל</button><button class="text-link" data-close-sheet>חזרה</button></article></div>`;
  if(sheet==='rules')return `<div class="sheet-wrap rules-wrap"><article class="tavern-sheet rules"><h2>חוקי Elder Taki</h2><p>התאימו צבע, מספר או סמל. אם משכתם קלף, הוא יחכה לתור הבא. הראשון שמרוקן את היד מנצח.</p><h3 class="rule-heading"><span>TAKI</span><i class="rule-card taki-rule">ᛏ</i></h3><p>TAKI פותח רצף בצבע אחד. אפשר להמשיך לשחק או ללחוץ על <b>סגירת TAKI</b>. רק הפקודה האחרונה ברצף פועלת; אחרי פלוס חייבים לשחק שוב.</p><h3 class="rule-heading"><span>מלך וסופר TAKI</span><i class="rule-card king-rule">♛</i></h3><p><b>מלך</b> מבטל כל מגבלה ומעניק מהלך חופשי נוסף כל עוד נשארו לשחקן קלפים. אפשר לנצח איתו כקלף האחרון כרגיל. סופר TAKI אחרי מלך מאפשר לבחור את צבע הרצף.</p><h3>דו־קרב בפונדק</h3><p>חמישה סיבובים מול יריב אחד. המנצח מקבל נקודה על כל קלף שנותר בידי המפסיד. כל חמשת הסיבובים משוחקים; שוויון מוביל ליד אחרונה.</p><h3>משחק פונדק</h3><p>חמישה סיבובים מול שלושה יריבים. המנצח בכל יד מקבל נקודה על כל קלף שנותר בידי האחרים. שוויון אחרי הסיבוב החמישי מוביל ליד מכרעת.</p><h3 class="rule-heading"><span>הקלפים העתיקים</span><i class="rule-actions" aria-hidden="true"><b>⊘</b><b>↺</b><b>＋</b><b>◈</b></i></h3><p><b>עצור</b> מדלג, <b>שנה כיוון</b> הופך את הסדר, <b>פלוס</b> מעניק מהלך נוסף, <b>2+</b> מצטבר ו<b>שנה צבע</b> בוחר בית.</p><button class="parchment-button" data-close-sheet>הבנתי</button></article></div>`;
  return settingsHTML({title:sheet==='pause'?'המשחק מושהה':'הגדרות',language:'שפה',sound:'צליל',gameSounds:'צלילי משחק',music:'מוזיקת רקע',ambience:'אווירת פונדק',gameplay:'משחק',dialogue:'תגובות יריבים',captions:'כתוביות לאירועי משחק',hints:'הדגשת קלפים זמינים',accessibility:'נגישות',haptics:'רטט',motion:'צמצום תנועה',close:sheet==='pause'?'חזרה לשולחן':'סגור',leave:'שמירה ויציאה'});
}
function settingsHTML(copy){
  const pause=sheet==='pause';
  return `<div class="sheet-wrap settings-wrap" data-sheet-backdrop><article class="tavern-sheet settings-sheet" role="dialog" aria-modal="true" aria-labelledby="settings-title"><header class="settings-head"><h2 id="settings-title">${copy.title}</h2><button class="sheet-close" data-close-sheet aria-label="${copy.close}"><span aria-hidden="true">×</span></button></header><div class="language-row"><label>${copy.language}</label><div class="segmented language-choice" role="group" aria-label="${copy.language}"><button data-language="he" aria-pressed="${settings.language==='he'}" class="${settings.language==='he'?'on':''}">עברית</button><button data-language="en" aria-pressed="${settings.language==='en'}" class="${settings.language==='en'?'on':''}">English</button></div></div><section class="settings-section" aria-labelledby="sound-settings"><h3 id="sound-settings">${copy.sound}</h3>${audioRow(copy.gameSounds,'sound','sfxVolume')}${audioRow(copy.music,'music','musicVolume')}${audioRow(copy.ambience,'ambience','ambienceVolume')}</section><section class="settings-section" aria-labelledby="gameplay-settings"><h3 id="gameplay-settings">${copy.gameplay}</h3>${toggleRow(copy.dialogue,'dialogue')}${toggleRow(copy.captions,'captions')}${toggleRow(copy.hints,'playableHints')}</section><section class="settings-section" aria-labelledby="accessibility-settings"><h3 id="accessibility-settings">${copy.accessibility}</h3>${toggleRow(copy.haptics,'haptics')}${toggleRow(copy.motion,'reducedMotion')}</section><footer class="settings-actions"><button class="settings-close-action" data-close-sheet>${copy.close}</button>${pause?`<button class="text-link" data-home>${copy.leave}</button>`:''}</footer></article></div>`;
}
function toggleRow(label,key){return `<div class="toggle-row setting-row"><label id="setting-${key}">${label}</label><button class="iron-switch ${settings[key]?'on':''}" data-toggle="${key}" aria-labelledby="setting-${key}" aria-pressed="${settings[key]}"><i></i></button></div>`;}
function audioRow(label,key,volumeKey){const value=Math.round((settings[volumeKey]??0)*100);return `<div class="audio-row setting-row"><div class="audio-label"><label id="setting-${key}">${label}</label><output for="volume-${volumeKey}">${value}%</output></div><div class="audio-controls"><input id="volume-${volumeKey}" type="range" min="0" max="100" step="1" value="${value}" data-volume="${volumeKey}" data-channel="${key}" aria-labelledby="setting-${key}"><button class="iron-switch ${settings[key]?'on':''}" data-toggle="${key}" aria-labelledby="setting-${key}" aria-pressed="${settings[key]}"><i></i></button></div></div>`;}

function render(){document.documentElement.lang=settings.language;document.documentElement.dir=direction();document.querySelector('meta[name="description"]')?.setAttribute('content',isEnglish()?'An ancient card game around a tavern table — five rounds, cumulative scoring, and full offline play.':'משחק קלפים עתיק סביב שולחן פונדק — חמישה סיבובים, ניקוד מצטבר ומשחק מלא גם בלי אינטרנט.');root.innerHTML=view==='home'?homeHTML():view==='duelSelect'?duelSelectHTML():gameHTML();bind();}
function goHome(){flushPendingAction();persist();clearTimeout(botTimer);clearTimeout(takiTimer);clearTimeout(eventTimer);clearTimeout(roundEndTimer);clearTimeout(duelIdleTimer);clearTimeout(deckAudioTimer);audioSystem.stopAmbience();audioSystem.stopMusic(true);view='home';sheet=null;render();}
function layoutHand(){
  const hand=root.querySelector('.hand');if(!hand)return;
  const cards=[...hand.querySelectorAll(':scope > .card')],count=cards.length;if(!count)return;
  const cardWidth=cards[0].getBoundingClientRect().width||102;
  const available=Math.max(cardWidth,hand.clientWidth-24);
  const step=count<2?0:Math.min(cardWidth+18,(available-cardWidth)/(count-1));
  const overlap=count<2?0:step-cardWidth;
  const roomy=available>620,spread=Math.max(.72,(roomy?2.35:2.8)-Math.max(0,count-7)*.2);
  const lift=Math.max(.7,(roomy?1.55:2)-Math.max(0,count-8)*.09);
  const scale=count>=13?.93:count>=11?.96:1;
  hand.dataset.cardCount=String(count);
  cards.forEach((card,index)=>{
    const offset=index-(count-1)/2;
    card.style.setProperty('--overlap',`${overlap.toFixed(2)}px`);
    card.style.setProperty('--tilt',`${(offset*spread).toFixed(2)}deg`);
    card.style.setProperty('--rise',`${(Math.abs(offset)*lift).toFixed(2)}px`);
    card.style.setProperty('--hand-scale',String(scale));
  });
}
function bind(){
  root.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{sheet=b.dataset.open;render();requestAnimationFrame(()=>root.querySelector('.sheet-close,[data-close-sheet]')?.focus({preventScroll:true}));});
  root.querySelectorAll('[data-close-sheet]').forEach(b=>b.onclick=closeSheet);
  root.querySelector('[data-sheet-backdrop]')?.addEventListener('click',event=>{if(event.target===event.currentTarget&&matchMedia('(hover:hover) and (pointer:fine)').matches)closeSheet();});
  root.querySelectorAll('[data-language]').forEach(b=>b.onclick=()=>{const language=b.dataset.language;settings.language=language;hint='';screenReaderLine='';captionLine='';saveSettings(settings);render();requestAnimationFrame(()=>root.querySelector(`[data-language="${language}"]`)?.focus({preventScroll:true}));});
  root.querySelectorAll('[data-toggle]').forEach(b=>b.onclick=()=>{
    const key=b.dataset.toggle;settings[key]=!settings[key];saveSettings(settings);audioSystem.setSettings(settings);
    if(key==='ambience'){if(settings.ambience)audioSystem.startAmbience();else audioSystem.stopAmbience();}
    if(key==='music'){if(settings.music)audioSystem.startMusic();else audioSystem.stopMusic();}
    if(key==='sound'&&settings.sound)audioSystem.play('cardPlaySoft');
    if(key==='haptics'&&settings.haptics)feedback('precise',settings);
    render();requestAnimationFrame(()=>root.querySelector(`[data-toggle="${key}"]`)?.focus({preventScroll:true}));
  });
  root.querySelectorAll('[data-volume]').forEach(input=>{
    const apply=()=>{settings[input.dataset.volume]=Number(input.value)/100;input.closest('.audio-row')?.querySelector('output')?.replaceChildren(`${input.value}%`);saveSettings(settings);audioSystem.setSettings(settings);if(input.dataset.channel==='ambience'&&settings.ambience)audioSystem.startAmbience();if(input.dataset.channel==='music'&&settings.music)audioSystem.startMusic();};
    input.oninput=apply;
    input.onchange=()=>{apply();if(input.dataset.channel==='sound'&&settings.sound)audioSystem.play('cardPlaySoft');};
  });
  root.querySelectorAll('[data-players]').forEach(b=>b.onclick=()=>{settings.playerCount=+b.dataset.players;saveSettings(settings);render();});
  root.querySelector('[data-duel]')?.addEventListener('click',()=>{view='duelSelect';sheet=null;render();});
  root.querySelectorAll('[data-opponent]').forEach(b=>b.onclick=()=>{settings.duelOpponent=b.dataset.opponent;saveSettings(settings);clearMatch();startSession('duel');});
  root.querySelector('[data-tavern]')?.addEventListener('click',()=>{clearMatch();startSession('tavern');});
  root.querySelector('[data-quick]')?.addEventListener('click',()=>{clearMatch();startSession('quick');});
  root.querySelector('[data-resume]')?.addEventListener('click',()=>{const saved=loadMatch();startSession(saved?.mode||'tavern',saved);});
  root.querySelector('[data-next]')?.addEventListener('click',()=>{feedback('shuffle',settings);deckSettling=true;setSession(startNextRound(session));if(session.mode==='duel')setDuelReaction('drink',duelLine('drink'),true);if(settings.music)audioSystem.startMusic({newRound:true});render();beginDeckArrival();scheduleGame();});
  root.querySelector('[data-rematch]')?.addEventListener('click',()=>{clearMatch();startSession('duel');});
  root.querySelector('[data-choose-opponent]')?.addEventListener('click',()=>{clearMatch();view='duelSelect';session=null;state=null;render();});
  root.querySelectorAll('[data-home]').forEach(b=>b.onclick=goHome);
  root.querySelector('[data-draw]')?.addEventListener('click',()=>{if(currentPlayer(state).id==='p0'&&!state.taki?.open)submit({type:ACTIONS.DRAW,playerId:'p0'});});
  root.querySelector('[data-close-taki]')?.addEventListener('click',()=>submit({type:ACTIONS.END_TURN,playerId:'p0'}));
  root.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>submit({type:ACTIONS.CHOOSE_COLOR,playerId:'p0',color:b.dataset.color}));
  root.querySelectorAll('.hand .card.legal').forEach(card=>{
    let startY=0,lastY=0,startTime=0,lastTime=0,peakVelocity=0,moved=false,suppressClick=false;
    const play=()=>submit({type:ACTIONS.PLAY,playerId:'p0',cardId:card.dataset.cardId});
    const reset=()=>{card.style.removeProperty('transform');card.classList.remove('selected');selected=null;};
    card.onclick=e=>{if(suppressClick){suppressClick=false;e.preventDefault();return;}play();};
    card.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();play();}};
    card.onpointerdown=e=>{startY=lastY=e.clientY;startTime=lastTime=e.timeStamp;peakVelocity=0;moved=false;suppressClick=false;card.setPointerCapture(e.pointerId);selected=card.dataset.cardId;card.classList.add('selected');};
    card.onpointermove=e=>{if(!card.hasPointerCapture(e.pointerId))return;const dy=e.clientY-startY,segmentTime=Math.max(1,e.timeStamp-lastTime);if(Math.abs(dy)>7)moved=true;peakVelocity=Math.max(peakVelocity,(lastY-e.clientY)/segmentTime);lastY=e.clientY;lastTime=e.timeStamp;card.style.transform=`translateY(${Math.min(0,dy)}px) rotate(0deg)`;};
    card.onpointerup=e=>{
      const dy=e.clientY-startY,elapsed=Math.max(1,e.timeStamp-startTime),recentElapsed=Math.max(1,e.timeStamp-lastTime),velocity=Math.max(peakVelocity,(lastY-e.clientY)/recentElapsed,(startY-e.clientY)/elapsed),discard=root.querySelector('[data-discard-anchor]')?.getBoundingClientRect(),overDiscard=discard&&e.clientX>=discard.left-28&&e.clientX<=discard.right+28&&e.clientY>=discard.top-36&&e.clientY<=discard.bottom+36,upwardFlick=dy<-22&&velocity>.28;
      if(card.hasPointerCapture(e.pointerId))card.releasePointerCapture(e.pointerId);
      suppressClick=moved;
      if(dy<-52||upwardFlick||overDiscard){e.preventDefault();play();}
      else if(moved){e.preventDefault();reset();layoutHand();}
    };
    card.onpointercancel=e=>{if(card.hasPointerCapture(e.pointerId))card.releasePointerCapture(e.pointerId);suppressClick=moved;reset();layoutHand();};
  });
  layoutHand();
}

function closeSheet(){const opener=sheet;sheet=null;if(view==='home'){audioSystem.stopAmbience();audioSystem.stopMusic();}render();requestAnimationFrame(()=>root.querySelector(`[data-open="${opener}"]`)?.focus({preventScroll:true}));}
document.addEventListener('keydown',event=>{if(!sheet)return;if(event.key==='Escape'){event.preventDefault();closeSheet();return;}if(event.key!=='Tab')return;const dialog=root.querySelector('[role="dialog"]');if(!dialog)return;const focusable=[...dialog.querySelectorAll('button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])')];if(!focusable.length)return;const first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}});

if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
function registerWebMCP(){const context=document.modelContext;if(!context?.registerTool)return;try{void Promise.resolve(context.registerTool({name:'read_game_state',title:'Read Elder Taki game',description:'Read the current Elder Taki match status.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute(){return session?{mode:session.mode,phase:session.phase,round:session.round,totalRounds:session.totalRounds,suddenDeath:session.suddenDeath,scores:session.scores,currentPlayer:currentPlayer(state).name,activeColor:state.activeColor,humanCardCount:state.players[0].hand.length,opponents:state.players.slice(1).map(p=>({name:p.name,cardCount:p.hand.length}))}:{phase:'home'};}})).catch(()=>{});}catch{}}
root.addEventListener('pointerdown',()=>audioSystem.prime(),{once:true,capture:true});
const suspendAudio=()=>audioSystem.stopAll();
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){suspendAudio();return;}
  if(view==='game'){if(settings.ambience)audioSystem.startAmbience();if(settings.music)audioSystem.startMusic();}
});
window.addEventListener('pagehide',()=>{flushPendingAction();persist();suspendAudio();});
let handLayoutFrame=0;
window.addEventListener('resize',()=>{cancelAnimationFrame(handLayoutFrame);handLayoutFrame=requestAnimationFrame(layoutHand);},{passive:true});
registerWebMCP();render();
