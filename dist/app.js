import { ACTIONS, currentPlayer, getLegalCards, topCard } from './game-engine/engine.js';
import { COLORS, TYPES } from './game-engine/cards.js';
import { createDuelSession, createQuickSession, createTavernMatch, finishRound, restoreSession, standings, startNextRound } from './game-engine/match.js';
import { LocalGameTransport } from './platform/transport.js';
import { clearMatch, feedback, loadMatch, loadSettings, saveMatch, saveSettings } from './platform/storage.js';
import { audioSystem } from './platform/audio.js';
import { chooseBotAction, chooseColor } from './game-ai/bot.js';
import { cardHTML, cardLabel, sigilHTML } from './ui/card.js';
import { calculateHandLayout } from './ui/hand-layout.js';
import { DUEL_OPPONENTS, duelSpriteStyle, getDuelOpponent, localizeDuelOpponent } from './duel/opponents.js';
import { BRAMM_EXPRESSIONS, BRAMM_REACTIONS, brammExpressionURL, createBrammController, preloadBrammExpressions, resolveBrammReaction } from './duel/bramm.js';

const root=document.querySelector('#app');
const colorHex={red:'#7f2635',blue:'#465f76',green:'#36583c',yellow:'#b0832f'};
let settings=loadSettings(),session=null,state=null,transport=null,view='home',sheet=null,hint='',selected=null;
const isPaused=()=>view==='game'&&(Boolean(sheet)||document.hidden);
const isEnglish=()=>settings.language==='en';
const direction=()=>isEnglish()?'ltr':'rtl';
const colorNames={he:{red:'בורדו',blue:'צפחה',green:'יער',yellow:'זהב'},en:{red:'Burgundy',blue:'Slate',green:'Forest',yellow:'Gold'}};
const archetypeNames={he:{hunter:'הציידת',bard:'הפייטן',mercenary:'שכיר החרב',wanderer:'הנודד',scholar:'המלומד',mysterious:'הנוסע'},en:{hunter:'The Hunter',bard:'The Bard',mercenary:'The Mercenary',wanderer:'The Wanderer',scholar:'The Scholar',mysterious:'The Traveler'}};
const playerNames={you:'You',aila:'Aila',ron:'Ron',bran:'Bran',sela:'Sela',kesh:'Kesh',bramm:'Bramm',adren:'Adren',myra:'Myra',toren:'Toren',leva:'Leva',sig:'Sig',alva:'Alva',hal:'Hal',runa:'Runa',derik:'Derik',אתם:'You',איילה:'Aila',רון:'Ron',בראן:'Bran',אדרן:'Adren',מירא:'Myra',טורן:'Toren',ליבה:'Leva',סיג:'Sig',אלבה:'Alva',האל:'Hal',רונה:'Runa',דריק:'Derik',לוסיאן:'Lucien',איניגו:'Inigo',לידיה:'Lydia',וירן:'Viren',סורן:'Soren',ויילין:'Waylin'};
function colorName(color){return colorNames[settings.language]?.[color]||colorNames.he[color]||'';}
function colorRuneHTML(color,className='color-rune'){
  const paths={red:'<path d="M32 7c3 12-8 14-3 24 3-6 8-8 10-14 8 10 12 22 4 33-8 11-28 8-31-5-2-9 4-17 12-23-1 9 2 12 5 14-1-11 7-15 3-29z"/>',blue:'<path d="M8 39c10-13 20-13 30 0s20 13 28 0M8 24c10-13 20-13 30 0s20 13 28 0"/>',green:'<path d="M32 57V28M32 38C18 37 12 27 11 13c10 2 17 7 21 15m0 8c13-2 20-10 21-23-10 2-17 8-21 17"/>',yellow:'<circle cx="32" cy="32" r="12"/><path d="M32 5v11m0 32v11M5 32h11m32 0h11M13 13l8 8m22 22 8 8m0-38-8 8M21 43l-8 8"/>'};
  return `<svg class="${className}" viewBox="0 0 64 64" aria-hidden="true">${paths[color]||''}</svg>`;
}
function displayName(player){if(!player)return'';if(player.id==='p0')return isEnglish()?'You':player.name;if(!isEnglish())return player.name;const key=player.nameKey||player.duelOpponentId;return key?(playerNames[key]||localizeDuelOpponent(getDuelOpponent(key),'en')?.name||player.name):(playerNames[player.name]||player.name);}
function displayOpponent(opponent){return localizeDuelOpponent(opponent,settings.language);}
function cardOptions(options={}){return {...options,language:settings.language};}
let botTimer=null,eventTimer=null,takiTimer=null,quipTimer=null,roundEndTimer=null,duelReactionTimer=null,duelIdleTimer=null,deckAudioTimer=null,brammSlowTimer=null,musicRestoreTimer=null,eventBanner=null,quip=null,duelReaction='idle',lastDuelReactionAt=0,lastLogLength=0,lastCounts={},lastHands={},lastQuipAt=0,takiRun=0,lastRenderedTopId=null,lastActivePlayerId=null,turnCueUntil=0,drawFlights=[],flightId=0,sessionEpoch=0,roundResultVisible=false,incomingCardDelays=new Map(),propRattled=new Set(),screenReaderLine='',captionLine='',brammCaptionLine='',brammCaptionLocale='en',blockAiUntil=0,motionLocked=false,pendingAction=null,deckSettling=false,brammController=null,brammExpression='01_default_smug',brammPreviousExpression='01_default_smug',brammExpressionTimer=null,brammSwapTimer=null,brammSequenceTimers=[],pendingBotTurn=null;
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

function persist(){if(session){if(isBrammDuel()&&brammController)session.brammPersonality=brammController.snapshot();saveMatch(session);}}
function currentDuelOpponent(){return displayOpponent(getDuelOpponent(session?.opponentId||settings.duelOpponent));}
const isBrammDuel=()=>session?.mode==='duel'&&session.opponentId==='bramm';
function clearBrammTimers(){clearTimeout(brammExpressionTimer);clearTimeout(brammSwapTimer);clearTimeout(brammSlowTimer);for(const timer of brammSequenceTimers)clearTimeout(timer);brammSequenceTimers=[];brammCaptionLine='';}
function setBrammExpression(expression,duration=0){if(!BRAMM_EXPRESSIONS.includes(expression))expression=brammController?.defaultExpression()||'01_default_smug';brammPreviousExpression=brammExpression;brammExpression=expression;clearTimeout(brammExpressionTimer);clearTimeout(brammSwapTimer);render();brammSwapTimer=setTimeout(()=>{brammPreviousExpression=brammExpression;root.querySelector('.bramm-art-stage.bramm-table')?.classList.remove('is-changing');},settings.reducedMotion?0:150);if(duration>0){const epoch=sessionEpoch;brammExpressionTimer=setTimeout(()=>{if(epoch!==sessionEpoch||!brammController)return;brammPreviousExpression=brammExpression;brammExpression=brammController.defaultExpression();brammCaptionLine='';render();},settings.reducedMotion?Math.min(duration,900):duration);}}
function performBrammReaction(reaction,{voiceDelay=0}={}){
  if(!reaction||!isBrammDuel())return null;
  const localized=resolveBrammReaction(reaction,settings.language);
  setBrammExpression(localized.expression);brammCaptionLine=localized.caption||'';brammCaptionLocale=localized.locale;render();
  const epoch=sessionEpoch,finish=()=>{if(epoch!==sessionEpoch)return;const timer=setTimeout(()=>{if(epoch!==sessionEpoch)return;if(!['panic','defeated'].includes(brammController?.snapshot().state)){brammPreviousExpression=brammExpression;brammExpression=brammController?.defaultExpression()||'01_default_smug';}brammCaptionLine='';render();},settings.reducedMotion?180:650);brammSequenceTimers.push(timer);},play=()=>{if(epoch!==sessionEpoch||!isBrammDuel())return;audioSystem.setSettings(settings);if(localized.voice){void audioSystem.playVoice(localized.voice,{locale:localized.locale,priority:localized.priority,locked:localized.category==='result',onEnded:finish}).then(node=>{if(!node){const timer=setTimeout(finish,localized.duration||2400);brammSequenceTimers.push(timer);}});}else{const timer=setTimeout(finish,localized.duration||1800);brammSequenceTimers.push(timer);}render();};
  if(voiceDelay){const timer=setTimeout(play,settings.reducedMotion?80:voiceDelay);brammSequenceTimers.push(timer);}else play();
  return localized;
}
function runBramm(trigger,context={},force=false){if(view!=='game'||isPaused()||!isBrammDuel()||!brammController)return null;const visual=brammController.observe(trigger);if(visual)setBrammExpression(visual.expression,visual.duration);const reaction=brammController.react(trigger,context,force);if(!reaction)return visual;settings.brammRecentVoices=brammController.snapshot().recentVoices;saveSettings(settings);if(trigger==='loss'){setBrammExpression('29_defeated_disbelief',Math.max(1800,reaction.duration));const epoch=sessionEpoch,timer=setTimeout(()=>{if(epoch===sessionEpoch)performBrammReaction(reaction);},settings.reducedMotion?120:620);brammSequenceTimers.push(timer);return reaction;}const delay=trigger==='player_one_card'?420:trigger==='win'&&reaction.id==='win_04'?260:0;return performBrammReaction(reaction,{voiceDelay:delay});}
function brammArtHTML(opponent,{context='table'}={}){if(opponent?.id!=='bramm')return `<i class="duel-sprite" style="${duelSpriteStyle(opponent,context==='table'?duelReaction:'idle')}"></i>`;if(context==='table'&&root.querySelector('.bramm-art-stage.bramm-table'))return '<span data-bramm-stage-placeholder></span>';const expression=context==='table'?brammExpression:'01_default_smug';return `<span class="bramm-art-stage bramm-${context}"><img class="duel-sprite bramm-art bramm-art-current" src="${brammExpressionURL(expression)}" alt="" draggable="false" onerror="this.onerror=null;this.src='${brammExpressionURL('01_default_smug')}'"></span>`;}
function syncBrammStage(stage){if(!stage)return;const current=stage.querySelector('.bramm-art-current'),currentURL=brammExpressionURL(brammExpression);if(current&&current.src!==currentURL)current.src=currentURL;stage.classList.remove('is-changing');}
function scheduleDuelIdle(){clearTimeout(duelIdleTimer);if(view!=='game'||isPaused()||session?.mode!=='duel'||session.phase!=='round')return;const opponent=currentDuelOpponent(),epoch=sessionEpoch;duelIdleTimer=setTimeout(()=>{if(epoch!==sessionEpoch||view!=='game'||isPaused()||session?.mode!=='duel'||session.phase!=='round'||eventBanner)return scheduleDuelIdle();if(isBrammDuel())runBramm('idle_taunt');else setDuelReaction('drink',opponent.dialoguePools.drink.at(Math.floor(Math.random()*opponent.dialoguePools.drink.length)),true);scheduleDuelIdle();},opponent.idleFrequency+Math.random()*9000);}
function setDuelReaction(kind,text=null,force=false){if(session?.mode!=='duel'||isBrammDuel())return;const opponent=currentDuelOpponent(),weight=opponent.reactionWeights[kind]??1;if(!force&&(Date.now()-lastDuelReactionAt<4200||Math.random()>weight))return;lastDuelReactionAt=Date.now();duelReaction=kind;clearTimeout(duelReactionTimer);if(text)showQuip('p1',text,force);render();const epoch=sessionEpoch;duelReactionTimer=setTimeout(()=>{if(epoch!==sessionEpoch)return;duelReaction='idle';render();scheduleDuelIdle();},settings.reducedMotion?350:1100+Math.random()*1200);}
function duelLine(kind){const pool=currentDuelOpponent().dialoguePools[kind]||[];return pool[Math.floor(Math.random()*pool.length)];}
function recordDuelResult(){if(session?.mode!=='duel'||session.phase!=='matchFinished'||session.recorded)return;const id=session.opponentId,record=settings.duelRecords?.[id]||{played:0,won:0};settings.duelRecords={...(settings.duelRecords||{}),[id]:{played:record.played+1,won:record.won+(session.championId==='p0'?1:0)}};session.recorded=true;saveSettings(settings);}
function setSession(next){
  sessionEpoch++;clearTimeout(eventTimer);clearTimeout(quipTimer);clearTimeout(roundEndTimer);clearTimeout(duelReactionTimer);clearTimeout(duelIdleTimer);clearBrammTimers();audioSystem.stopVoice();
  quip=null;duelReaction='idle';captionLine='';roundResultVisible=next.phase!=='round';session=next;state=session.game;
  if(isBrammDuel()){brammController ||= createBrammController({initial:{...(next.brammPersonality||{}),recentVoices:next.brammPersonality?.recentVoices||settings.brammRecentVoices||[]}});brammExpression=brammController.defaultExpression();brammPreviousExpression=brammExpression;}else{brammController=null;brammExpression='01_default_smug';brammPreviousExpression=brammExpression;}
  transport?.disconnect();transport=new LocalGameTransport(state);lastLogLength=state.log.length;lastCounts=Object.fromEntries(state.players.map(p=>[p.id,p.hand.length]));lastHands=Object.fromEntries(state.players.map(p=>[p.id,p.hand.map(card=>card.id)]));lastRenderedTopId=null;lastActivePlayerId=null;turnCueUntil=0;drawFlights=[];incomingCardDelays.clear();propRattled.clear();eventBanner=null;
  transport.subscribeToState((nextState,action)=>{
    state=nextState;session.game=nextState;
    try{onState(action);}catch(error){console.error('Non-blocking game presentation error',error);screenReaderLine='';captionLine='';}
    if(nextState.phase==='finished'&&session.phase==='round'){
      session=finishRound(session);const opponentWon=session.results.at(-1)?.winnerId==='p1',finalDuel=session.mode==='duel'&&session.phase==='matchFinished';
      if(isBrammDuel()&&finalDuel){
        const humanScore=session.scores?.p0||0,brammScore=session.scores?.p1||0,spread=Math.abs(brammScore-humanScore),snapshot=brammController.snapshot();
        if(opponentWon)runBramm('win',{close:spread<=3,crushing:spread>=12,wasBehind:snapshot.flags.bramm_was_previously_behind,survivedOneCard:snapshot.flags.bramm_survived_one_card_scare},true);
        else runBramm('loss',{},true);
      }else if(session.mode==='duel'){setDuelReaction(opponentWon?'pleased':'annoyed',duelLine(opponentWon?'pleased':'annoyed'),true);}
      roundResultVisible=false;const epoch=sessionEpoch,authoredBeat=isBrammDuel()&&finalDuel;
      audioSystem.duckMusic(.08,240);
      roundEndTimer=setTimeout(()=>{if(epoch!==sessionEpoch)return;roundResultVisible=true;recordDuelResult();feedback('round',settings);persist();render();},settings.reducedMotion?(authoredBeat?900:120):(authoredBeat?1850:1050));
    }
    persist();render();scheduleGame();
  });scheduleDuelIdle();
}
function beginDeckArrival(){
  audioSystem.setSettings(settings);audioSystem.play('shuffle');clearTimeout(deckAudioTimer);
  deckAudioTimer=setTimeout(()=>{audioSystem.play('deckPutDown');deckSettling=false;root.querySelector('[data-draw-anchor]')?.classList.remove('deck-settling');},1050);
}
async function startSession(mode='tavern',saved=null){
  brammController=null;clearBrammTimers();
  const fresh=()=>mode==='tavern'?createTavernMatch({seed:Date.now()}):mode==='duel'?createDuelSession({seed:Date.now(),opponent:getDuelOpponent(settings.duelOpponent)}):createQuickSession({playerCount:settings.playerCount,seed:Date.now()});
  let next;try{next=saved?restoreSession(saved):fresh();}catch{clearMatch();next=fresh();}
  if(next.mode==='duel'&&next.opponentId==='bramm')await preloadBrammExpressions();
  setSession(next);
  view='game';sheet=null;eventBanner=null;audioSystem.setSettings(settings);if(settings.ambience)audioSystem.startAmbience();if(settings.music)audioSystem.startMusic({newRound:true});deckSettling=!saved;render();if(!saved)beginDeckArrival();if(isBrammDuel()){void audioSystem.preloadVoice(settings.language);const firstEncounter=(settings.duelRecords?.bramm?.played||0)===0;if(!saved&&firstEncounter){const epoch=sessionEpoch;const timer=setTimeout(()=>{if(epoch===sessionEpoch)runBramm('intro',{},true);},settings.reducedMotion?350:1250);brammSequenceTimers.push(timer);}}scheduleGame();scheduleDuelIdle();
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
  const front=['front','flip'].includes(mode)?`<div class="travelling-front">${card?cardHTML(card,cardOptions({activeColor:card.type===TYPES.CHANGE_COLOR?null:state.activeColor})):''}</div>`:'';
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
    {transform:`translate3d(${dx*.10}px,${dy*.08-10}px,0) rotate(-2deg) scale(1.02)`,filter:'brightness(1.04) drop-shadow(0 8px 7px #0008)',offset:.2},
    {transform:`translate3d(${dx*.44}px,${dy*.40-22}px,0) rotate(2deg) scale(${Math.max(1.02,1+(ratio-1)*.4)})`,filter:'brightness(1.07) drop-shadow(0 12px 9px #0008)',offset:.5},
    {transform:`translate3d(${dx*.84}px,${dy*.81-9}px,0) rotate(-.7deg) scale(${1+(ratio-1)*.82})`,filter:'brightness(1.03) drop-shadow(0 6px 6px #0008)',offset:.84},
    {transform:`translate3d(${dx}px,${dy}px,0) rotate(0deg) scale(${ratio})`,filter:'brightness(1)',offset:1}
  ];
  const frames=trajectory==='draw'?drawFrames:playFrames;
  return new Promise(resolve=>{setTimeout(()=>{const animation=proxy.animate(frames,{duration,easing:'cubic-bezier(.2,.72,.18,1)',fill:'forwards'});animation.finished.catch(()=>{}).finally(()=>{proxy.remove();resolve();});},delay);});
}
async function animateCardMovement(action){
  const player=state.players.find(item=>item.id===action.playerId);if(!player)return;
  const draw=action.type===ACTIONS.DRAW,card=draw?null:player.hand.find(item=>item.id===action.cardId);
  const source=draw?root.querySelector('[data-draw-anchor]'):(action.playerId==='p0'?root.querySelector(`.hand [data-card-id="${action.cardId}"]`):handAnchor(action.playerId)),destination=draw?handAnchor(action.playerId):root.querySelector('[data-discard-anchor]');
  // Opponent cards turn face-up during travel and reach the discard face-up.
  // pile after landing. This avoids mobile 3D clipping and face flashes.
  const mode=draw?'back':action.playerId!=='p0'?'flip':'front';
  const count=draw?Math.min(state.activePenalty?.amount||1,8):1,duration=draw?430:action.playerId==='p0'?430:540;
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
    if(entries.some(x=>x.type==='takiOpened'))return'Crossbow loaded';
    if(entries.some(x=>x.type==='takiClosed'))return'Crossbow fired';
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
  if(entries.some(x=>x.type==='takiOpened'))return'הקשת דרוכה';
  if(entries.some(x=>x.type==='takiClosed'))return'הקשת נורתה';
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
  const previousCounts={...lastCounts};
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
  clearTimeout(musicRestoreTimer);
  const oneCardTension=state.phase==='playing'&&state.players.some(player=>player.hand.length===1);
  if(oneCardTension)audioSystem.duckMusic(.26,420);
  else if((penalty?.amount||stack?.amount||0)>=4){audioSystem.duckMusic(.42,180);musicRestoreTimer=setTimeout(()=>audioSystem.duckMusic(1,620),900);}
  else audioSystem.duckMusic(1,620);
  const winnerId=entries.find(entry=>entry.type==='win')?.playerId||(state.phase==='finished'?state.winnerId:null);
  if(winnerId)audioSystem.play(winnerId==='p0'?'winHand':'loseHand',{delay:(stop||reverse||stack||opened||closed)?280:90});
  if(closed||opened)feedback('takiOpen',settings);else if(stop)feedback('stop',settings);else if(reverse)feedback('reverse',settings);else if(stack||penalty)feedback('penalty',settings);else if(playedCard?.type===TYPES.KING)feedback('king',settings);else if(again)feedback('plus',settings);else if(draw||action.type===ACTIONS.DRAW)feedback('draw',settings);else if(color)feedback('color',settings);else if(entries.length)feedback('play',settings);
  if(penalty?.amount>=6){propRattled.add(penalty.playerId);const epoch=sessionEpoch;setTimeout(()=>{if(epoch!==sessionEpoch)return;propRattled.delete(penalty.playerId);root.querySelector(`[data-player-id="${penalty.playerId}"]`)?.classList.remove('rattled');},520);}
  if(state.taki?.open)takiRun++;if(closed){if(takiRun>=3&&!isBrammDuel()){const watcher=state.players.find(p=>p.kind==='ai'&&p.id!==closed.playerId);showQuip(watcher?.id,botLine(watcher?.id,'penalty'));}takiRun=0;}
  if(!isBrammDuel()){
    if(stop)showQuip(stop.skipped,botLine(stop.skipped,'skip'));
    else if(penalty&&penalty.amount>=4)showQuip(penalty.playerId,botLine(penalty.playerId,'penalty'));
    else if(reverse){const speaker=state.players.find(p=>p.kind==='ai');showQuip(speaker?.id,botLine(speaker?.id,'reverse'));}
    else if(playedCard?.type===TYPES.KING){const speaker=state.players.find(p=>p.kind==='ai'&&p.id!==played.playerId);showQuip(speaker?.id,botLine(speaker?.id,'king'));}
    else if(played){const one=state.players.find(p=>p.hand.length===1&&p.id===played.playerId),speaker=state.players.find(p=>p.kind==='ai'&&p.id!==played.playerId);if(one)showQuip(speaker?.id,botLine(speaker?.id,'last'),true);else if(Math.random()<.1){const banter=isEnglish()?tavernBanterEn:tavernBanterHe;showQuip(speaker?.id,banter[Math.floor(Math.random()*banter.length)]);}}
  }
  if(session.mode==='duel'){
    const humanMove=played?.playerId==='p0',opponentMove=played?.playerId==='p1';
    if(isBrammDuel()){
      const humanCount=state.players[0].hand.length,brammCount=state.players[1].hand.length,oldHuman=previousCounts.p0??humanCount;
      if(humanCount<brammCount)brammController.setFlag('bramm_was_previously_behind');else if(brammCount<humanCount)brammController.setFlag('bramm_was_previously_ahead');
      if(oldHuman>1&&humanCount===1){
        runBramm('player_one_card',{},true);const epoch=sessionEpoch;
        for(const wait of [3400,9200]){const timer=setTimeout(()=>{if(epoch===sessionEpoch&&state?.phase==='playing'&&state.players[0]?.hand.length===1)runBramm('one_card_persist');},settings.reducedMotion?Math.min(wait,1800):wait);brammSequenceTimers.push(timer);}
      }else if(oldHuman===1&&humanCount>1){const relief=brammController.oneCardRecovered();if(relief)performBrammReaction(relief);}
      else if((penalty?.playerId==='p1'&&penalty.amount>=4)||stop?.skipped==='p1')runBramm('setback');
      else if((draw?.playerId==='p1'||penalty?.playerId==='p1'))runBramm('bramm_draw',{amount:(draw||penalty)?.amount||1});
      else if(draw?.playerId==='p0'||penalty?.playerId==='p0')runBramm('player_draw',{amount:(draw||penalty)?.amount||1});
      else if(humanMove&&(reverse||opened||stack||stop||playedCard?.type===TYPES.KING))runBramm('player_good_move');
      else if(opponentMove&&(reverse||opened||stack||stop||playedCard?.type===TYPES.KING||brammCount===1))runBramm('bramm_good_move');
      else if(humanMove)runBramm('player_neutral_move');
    }else if((penalty?.playerId==='p1'&&penalty.amount>=4)||stop?.skipped==='p1')setDuelReaction('annoyed',duelLine('annoyed'));
    else if(humanMove&&(reverse||opened||playedCard?.type===TYPES.KING||state.players[0].hand.length===1))setDuelReaction('surprised',duelLine('surprised'));
    else if(opponentMove&&(stack||opened||playedCard?.type===TYPES.KING||state.players[1].hand.length===1))setDuelReaction('pleased',duelLine('pleased'));
  }
}
function delay(){
  const active=currentPlayer(state),legal=getLegalCards(state,active.id),base=settings.difficulty==='quick'?560:settings.difficulty==='thoughtful'?1120:780;
  const obvious=legal.length===1,important=legal.some(card=>[TYPES.PLUS2,TYPES.KING,TYPES.SUPER_TAKI].includes(card.type))||active.hand.length<=2;
  const situational=obvious?-250:legal.length>=4?180:0,hesitation=important&&Math.random()<.46?260+Math.random()*320:0,jitter=(Math.random()-.5)*220;
  return Math.max(260,base+situational+hesitation+jitter);
}
function runBotTurn(playerId,epoch,scheduledTurn){
  pendingBotTurn=null;
  if(epoch!==sessionEpoch||isPaused()||!state||session.phase!=='round'||state.phase==='finished')return;
  const current=currentPlayer(state);if(current.id!==playerId||current.kind!=='ai'||state.turn!==scheduledTurn)return;
  try{submit(chooseBotAction(state));}
  catch(error){console.error('AI turn action failed',error);if(currentPlayer(state).id===playerId&&state.phase==='playing'){try{submit({type:ACTIONS.DRAW,playerId});}catch(fallbackError){console.error('AI fallback draw failed',fallbackError);}}if(state.phase!=='finished'&&currentPlayer(state).kind==='ai'){try{render();}catch(renderError){console.error('AI recovery render failed',renderError);}scheduleGame();}}
}
function scheduleGame(){
  clearTimeout(botTimer);clearTimeout(takiTimer);clearTimeout(brammSlowTimer);
  if(isPaused()||!state||session.phase!=='round'||state.phase==='finished')return;
  const active=currentPlayer(state);
  if(active.kind==='human'){if(isBrammDuel()){const epoch=sessionEpoch,turn=state.turn;brammSlowTimer=setTimeout(()=>{if(epoch===sessionEpoch&&state?.turn===turn&&currentPlayer(state)?.id==='p0')runBramm('slow_player');},11000);}return;}
  const playerId=active.id,epoch=sessionEpoch,scheduledTurn=state.turn;
  pendingBotTurn={playerId,epoch,scheduledTurn};
  botTimer=setTimeout(()=>runBotTurn(playerId,epoch,scheduledTurn),Math.max(delay(),blockAiUntil-Date.now()));
}

function homeHTML(){
  const saved=loadMatch();let savedSession=null;try{savedSession=saved?restoreSession(saved):null;if(savedSession?.mode==='quick'&&savedSession.game?.players?.length>6)savedSession=null;}catch{}
  const resumable=savedSession&&savedSession.phase!=='matchFinished';
  const savedOpponent=savedSession?.mode==='duel'?displayOpponent(getDuelOpponent(savedSession.opponentId||settings.duelOpponent)):null;
  const logo=`<img class="primary-runes-logo" src="./assets/brand/runes-white.svg?v=60" alt="${isEnglish()?'RUNES':'RUNES — רונות'}">`,brammRecord=settings.duelRecords?.bramm||{played:0,won:0},brammLosses=Math.max(0,brammRecord.played-brammRecord.won);
  if(isEnglish()){
    const continueTitle=savedSession?.mode==='duel'?'Continue Duel':savedSession?.mode==='tavern'?'Continue Tavern Game':'Continue Quick Play';
    const continueMeta=!resumable?'':savedSession.mode==='duel'?`Against ${savedOpponent.name} · Round <bdi>${savedSession.round}</bdi> of <bdi>${savedSession.totalRounds}</bdi>`:savedSession.mode==='tavern'?`Round <bdi>${savedSession.round}</bdi> of <bdi>${savedSession.totalRounds}</bdi>`:`One hand · <bdi>${savedSession.roster?.length||savedSession.game?.players?.length||settings.playerCount}</bdi> players`;
    return `<main class="app-shell elder-home ${resumable?'has-resume':'no-resume'} ${settings.reducedMotion?'reduced-motion':''}" dir="ltr">${worldSceneHTML('home')}<section class="home-scene viewport-space" data-space="viewport"><div class="home-title">${logo}</div><div class="table-choices">${resumable?`<button class="resume-marker" data-resume>${cardBackStackHTML('resume-game-token')}<span class="resume-kicker">Your game awaits</span><strong>${continueTitle}</strong><small>${continueMeta}</small><i class="resume-seal" aria-hidden="true">▶</i></button>`:''}<div class="primary-modes"><button class="mode-plaque quick-mode" data-open="quick">${cardBackStackHTML('mode-token menu-card-stack quick-card-stack')}<span class="mode-copy"><strong>Quick Play</strong><small>One hand with strangers</small></span></button><button class="mode-plaque tavern-mode" data-tavern><span class="mode-token coin-stack"><i></i><i></i><i></i><i></i><i></i></span><span class="mode-copy"><strong>Tavern Match</strong><small><bdi>5</bdi> rounds · one table</small></span></button></div><button class="duel-invite" data-duel><span class="duel-cameo">${brammArtHTML(getDuelOpponent('bramm'),{context:'cameo'})}</span><span><strong>Bramm's challenge</strong><small>“Still unbeaten.” · You <bdi>${brammRecord.won}</bdi>–<bdi>${brammLosses}</bdi></small></span><i class="invite-arrow" aria-hidden="true">›</i></button><div class="table-tools"><button data-open="rules"><i class="folded-rules"></i><span>Rules</span></button><span class="tool-divider" aria-hidden="true"></span><button data-open="settings"><i class="brass-cog"></i><span>Settings</span></button></div></div></section>${sheetHTML()}</main>`;
  }
  const continueTitle=savedSession?.mode==='duel'?'המשך דו־קרב':savedSession?.mode==='tavern'?'המשך משחק פונדק':'המשך משחק מהיר';
  const continueMeta=!resumable?'':savedSession.mode==='duel'?`מול ${savedOpponent.name} · סיבוב <bdi>${savedSession.round}</bdi> מתוך <bdi>${savedSession.totalRounds}</bdi>`:savedSession.mode==='tavern'?`סיבוב <bdi>${savedSession.round}</bdi> מתוך <bdi>${savedSession.totalRounds}</bdi>`:`יד אחת · <bdi>${savedSession.roster?.length||savedSession.game?.players?.length||settings.playerCount}</bdi> שחקנים`;
  return `<main class="app-shell elder-home ${resumable?'has-resume':'no-resume'} ${settings.reducedMotion?'reduced-motion':''}" dir="rtl">${worldSceneHTML('home')}<section class="home-scene viewport-space" data-space="viewport"><div class="home-title">${logo}</div><div class="table-choices">${resumable?`<button class="resume-marker" data-resume>${cardBackStackHTML('resume-game-token')}<span class="resume-kicker">המשחק מחכה</span><strong>${continueTitle}</strong><small>${continueMeta}</small><i class="resume-seal" aria-hidden="true">▶</i></button>`:''}<div class="primary-modes"><button class="mode-plaque quick-mode" data-open="quick">${cardBackStackHTML('mode-token menu-card-stack quick-card-stack')}<span class="mode-copy"><strong>משחק מהיר</strong><small>יד אחת עם זרים</small></span></button><button class="mode-plaque tavern-mode" data-tavern><span class="mode-token coin-stack"><i></i><i></i><i></i><i></i><i></i></span><span class="mode-copy"><strong>משחק פונדק</strong><small><bdi>5</bdi> סיבובים · שולחן אחד</small></span></button></div><button class="duel-invite" data-duel><span class="duel-cameo">${brammArtHTML(getDuelOpponent('bramm'),{context:'cameo'})}</span><span><strong>האתגר של בראם</strong><small>״עדיין בלתי־מנוצח.״ · אתם <bdi>${brammRecord.won}</bdi>–<bdi>${brammLosses}</bdi></small></span><i class="invite-arrow" aria-hidden="true">›</i></button><div class="table-tools"><button data-open="rules"><i class="folded-rules"></i><span>חוקים</span></button><span class="tool-divider" aria-hidden="true"></span><button data-open="settings"><i class="brass-cog"></i><span>הגדרות</span></button></div></div></section>${sheetHTML()}</main>`;
}
function duelSelectHTML(){const en=isEnglish();return `<main class="app-shell duel-select ${settings.reducedMotion?'reduced-motion':''}" dir="${direction()}">${worldSceneHTML('select')}<section class="viewport-space" data-space="viewport"><header><button class="rune-menu back" data-home aria-label="${en?'Back':'חזרה'}">‹</button><div><small>${en?'The regulars have kept a seat':'הקבועים שמרו מקום ליד השולחן'}</small><h1>${en?'Choose your opponent':'בחרו יריב לדו־קרב'}</h1></div></header><div class="regulars">${DUEL_OPPONENTS.map(base=>{const opponent=displayOpponent(base),record=settings.duelRecords?.[opponent.id]||{played:0,won:0},attitude=opponent.descriptor.split(' · ').at(-1);return `<button class="regular archetype-${opponent.archetype} opponent-${opponent.id} ${settings.duelOpponent===opponent.id?'chosen':''}" data-opponent="${opponent.id}" aria-label="${en?`Duel ${opponent.name}`:`דו־קרב מול ${opponent.name}`}"><span class="regular-portrait">${brammArtHTML(opponent,{context:'select'})}</span><span class="regular-copy"><b>${opponent.name}</b><small>${attitude}</small><em class="chalk-record" aria-label="${en?`${record.won} wins, ${record.played-record.won} losses`:`${record.won} ניצחונות, ${record.played-record.won} הפסדים`}"><span>${'Ⅰ'.repeat(Math.min(record.won,5))||'–'}</span><i>${'Ⅰ'.repeat(Math.min(record.played-record.won,5))||'–'}</i></em></span></button>`;}).join('')}</div></section></main>`;}
function scoreBoardHTML(){return'';}
function seatScoreHTML(player){
  if(!['tavern','duel'].includes(session.mode)||isBrammDuel())return'';
  const score=session.scores?.[player.id]||0,latest=session.results.at(-1),scored=roundResultVisible&&session.phase!=='round'&&latest?.winnerId===player.id;
  const coins=Array.from({length:Math.min(7,Math.max(score?2:0,Math.ceil(score/4)))},(_,index)=>`<i style="--coin:${index}"></i>`).join('');
  return `<span class="seat-score ${scored?'coins-arriving':''}" aria-label="${isEnglish()?`${score} points`:`${score} נקודות`}"><span class="coin-pile">${coins}</span><bdi>${score}</bdi></span>`;
}
function resultScoreHTML(winner){const total=session.scores?.[winner?.id]||0;return `<div class="score-after"><span>${isEnglish()?'Cumulative score':'ניקוד מצטבר'}</span><bdi>${total}</bdi></div>`;}
function tableEngravingHTML(){return `<svg class="table-engraving" viewBox="0 0 1000 620" preserveAspectRatio="none" aria-hidden="true"><g class="engraving-orbit"><path d="M162 323C185 169 330 91 505 91c177 0 319 77 339 231"/><path d="M842 345C811 491 671 548 501 548c-171 0-310-57-341-204"/></g><g class="engraving-inner"><path d="M229 310C255 199 363 147 501 147c140 0 248 52 273 164"/><path d="M773 360C741 456 638 496 500 496c-136 0-238-40-271-136"/></g><g class="engraving-marks"><path d="m149 324 28-29 28 29-28 29zM823 324l28-29 28 29-28 29z"/><path d="m487 91 16-20 16 20-16 20zM487 548l16-20 16 20-16 20z"/></g></svg>`;}
function cardBackStackHTML(className,count=2){const back=cardHTML(null,cardOptions({hidden:true,small:true})).replace(/ aria-label="[^"]+"/,'');return `<span class="${className}" aria-hidden="true">${back.repeat(count)}</span>`;}
function worldSceneHTML(context='game'){
  const isHome=context==='home';
  return `<div class="scene-world scene-${context}" data-space="world" aria-hidden="true"><div class="tavern-environment"></div><div class="table-body"><div class="table-surface"></div>${tableEngravingHTML()}<div class="table-wear"><i></i><i></i><i></i></div></div><div class="scene-lighting"><i class="fire-glow"></i><i class="candle-glow"></i><i class="room-haze"></i><i class="table-light"></i></div><div class="environment-props ${isHome?'home-ambience':''}">${isHome?`<i class="passing-shadow"></i><i class="cup-ring"></i>${cardBackStackHTML('abandoned-cards')}<i class="table-stain"></i>`:''}</div></div>`;
}
const propAssets=Object.freeze({
  ceramicCup:'drinks/ceramic-cup.png',darkBottle:'drinks/dark-glass-bottle.png',medievalFlask:'drinks/medieval-flask.png',pewterGoblet:'drinks/pewter-goblet.png',pewterTankard:'drinks/pewter-tankard.png',woodenTankard:'drinks/wooden-tankard.png',
  bettingToken:'gambling/carved-betting-token.png',coinPile:'gambling/coin-pile-small.png',dice:'gambling/dice-pair.png',looseCoins:'gambling/loose-coins.png',scatteredCoins:'gambling/scattered-coins.png',stackedCoins:'gambling/stacked-coins.png',
  bread:'food/bread-chunk.png',cheese:'food/cheese-wedge.png',driedMeat:'food/dried-meat.png',snack:'food/half-eaten-snack.png',nuts:'food/nuts-group.png',loaf:'food/rustic-loaf.png',
  key:'personal/iron-key.png',pouch:'personal/leather-coin-pouch.png',cork:'personal/small-cork.png',pipe:'personal/smoking-pipe.png',ring:'personal/worn-metal-ring.png',
  rune:'mystical/carved-rune-token.png',ritualToken:'mystical/ritual-token.png',amulet:'mystical/small-amulet.png',parchment:'tavern/parchment-scrap.png',figurine:'bonus/carved-figurine.png',map:'bonus/map-scrap.png'
});
const seatPropStories=Object.freeze({
  bard:Object.freeze({theme:'casual',variants:[['ceramicCup','nuts','cork'],['ceramicCup','snack','pipe']]}),
  hunter:Object.freeze({theme:'rustic',variants:[['woodenTankard','bread','pouch'],['woodenTankard','driedMeat','key']]}),
  mercenary:Object.freeze({theme:'gambler',variants:[['pewterTankard','dice','scatteredCoins'],['pewterTankard','bettingToken','looseCoins']]}),
  scholar:Object.freeze({theme:'tidy',variants:[['pewterGoblet','stackedCoins','key'],['pewterGoblet','coinPile','ring']]}),
  mysterious:Object.freeze({theme:'mystical',variants:[['medievalFlask','rune','parchment'],['medievalFlask','amulet','ritualToken']]}),
  wanderer:Object.freeze({theme:'practical',variants:[['darkBottle','cheese','map'],['darkBottle','loaf','figurine']]})
});
function propVariant(player,story){const identity=`${player.id}:${player.archetype||'wanderer'}`;const identityHash=[...identity].reduce((sum,char)=>sum+char.charCodeAt(0),0);return story.variants[Math.abs((session?.seed||0)+identityHash)%story.variants.length];}
function seatPropItemHTML(item,index){return `<img class="seat-object prop-${index+1} object-${item}" src="./assets/props/${propAssets[item]}" alt="" draggable="false">`;}
function propsHTML(player,extraClass=''){const archetype=player.archetype||'wanderer',story=seatPropStories[archetype]||seatPropStories.wanderer,fullItems=propVariant(player,story),items=['duel','tavern'].includes(session?.mode)?fullItems.slice(0,2):fullItems;return `<span class="seat-props ${extraClass} ${archetype} story-${story.theme}" data-profile="${story.theme}" data-prop-count="${items.length}" aria-hidden="true">${items.map(seatPropItemHTML).join('')}</span>`;}
function tavernCharacterHTML(player){const key=player.nameKey;if(session.mode!=='tavern'||!['aila','ron','bran','sela','kesh'].includes(key))return'';return `<span class="tavern-presence" aria-hidden="true"><img src="./assets/characters/table/${key}-seated.png" alt="" draggable="false"></span>`;}
function revealedHandHTML(player){if(session.phase==='round'||!roundResultVisible||!player.hand.length)return'';return `<span class="revealed-hand" aria-hidden="true">${player.hand.slice(0,8).map(card=>cardHTML(card,cardOptions({small:true,legal:false,highlight:false}))).join('')}</span>`;}
function playerSeatHTML(player){if(!['tavern','duel'].includes(session.mode)||isBrammDuel())return'';return `<span class="player-place" aria-hidden="true"><img class="player-mug" src="./assets/props/drinks/dark-glass-bottle.png" alt=""><img class="player-pouch" src="./assets/props/personal/leather-coin-pouch.png" alt="">${seatScoreHTML(player)}</span>`;}
function duelPropsHTML(opponent){return propsHTML(opponent,`duel-props duel-${opponent.id}`);}
function duelOpponentHTML(player){const opponent=currentDuelOpponent(),active=currentPlayer(state).id===player.id,count=Math.min(12,player.hand.length),backs=Array.from({length:count},(_,i)=>`<i style="--offset:${i-(count-1)/2}"><span>${sigilHTML()}</span></i>`).join(''),winning=session.phase!=='round'&&session.results.at(-1)?.winnerId===player.id,isBramm=opponent.id==='bramm',identity=isBramm?`<div class="bramm-identity" aria-label="${isEnglish()?'Bramm duel score and hand':'ניקוד הדו־קרב והיד של בראם'}"><b>${opponent.name}</b><small>${opponent.descriptor.split(' · ')[0]}</small><div><span>${isEnglish()?'Cards':'קלפים'} <strong><bdi>${player.hand.length}</bdi></strong></span><span>${isEnglish()?'You':'אתם'} <strong><bdi>${session.scores?.p0||0}</bdi></strong></span><span>${opponent.name} <strong><bdi>${session.scores?.p1||0}</bdi></strong></span></div></div>`:`<div class="duel-name"><b>${opponent.name}</b><small>${opponent.descriptor.split(' · ')[0]}</small><span>${cardCountHTML(player.hand.length)}</span></div>`,speech=isBramm&&settings.captions&&brammCaptionLine?`<div class="bramm-speech" lang="${brammCaptionLocale}" dir="${brammCaptionLocale==='he'?'rtl':'ltr'}" role="status" aria-live="polite">${brammCaptionLine}</div>`:'';return `<div class="duel-opponent opponent-${opponent.id} seat-space seat-top ${active?'active':''} ${propRattled.has(player.id)?'rattled':''} ${winning?'winner-seat':''} ${player.hand.length===1?'last-card':''}" data-space="seat" data-seat="top" data-player-id="${player.id}"><div class="duel-presence">${brammArtHTML(opponent,{context:'table'})}<i class="contact-shadow"></i></div><i class="duel-depth-rim" aria-hidden="true"></i>${identity}${speech}<div class="duel-fan ${opponent.cardPlayStyle}" data-hand-anchor>${backs}</div>${duelPropsHTML(opponent)}${!isBramm&&quip?.player===player.id?`<div class="speech duel-speech" role="status">${quip.text}</div>`:''}</div>`;}
function quickOpponentHTML(player){const en=isEnglish(),name=displayName(player),active=currentPlayer(state).id===player.id,stopped=eventBanner?.kind==='stop'&&eventBanner.targetId===player.id,count=Math.min(14,player.hand.length),backs=Array.from({length:count},(_,i)=>`<i style="--offset:${i-(count-1)/2};--card-order:${i}"><span>${sigilHTML()}</span></i>`).join(''),winning=session.phase!=='round'&&session.results.at(-1)?.winnerId===player.id;return `<div class="opponent quick-opponent seat-space seat-top ${active?'active':''} ${stopped?'sealed':''} ${propRattled.has(player.id)?'rattled':''} ${winning?'winner-seat':''} ${player.hand.length===1?'last-card':''}" data-space="seat" data-seat="top" data-player-id="${player.id}" role="group" aria-label="${active?(en?`It is ${name}'s turn`:`התור עכשיו אצל ${name}`):`${name}, ${cardCountLabel(player.hand.length)}`}"><div class="quick-opponent-name"><b>${name}</b><span>${player.hand.length===0?`<small>${en?'No cards':'אין קלפים'}</small>`:player.hand.length===1?`<bdi>1</bdi><small>${en?'card':'קלף'}</small>`:`<bdi>${player.hand.length}</bdi><small>${en?'cards':'קלפים'}</small>`}</span></div><div class="opponent-fan physical-fan" data-hand-anchor>${backs}</div>${propsHTML(player)}${stopped?'<span class="stop-seal shield-seal" aria-hidden="true"></span>':''}${quip?.player===player.id?`<div class="speech" role="status">${quip.text}</div>`:''}</div>`;}
function opponentHTML(player,slot){const en=isEnglish(),name=displayName(player),active=currentPlayer(state).id===player.id,stopped=eventBanner?.kind==='stop'&&eventBanner.targetId===player.id,count=Math.min(10,player.hand.length),backs=Array.from({length:count},(_,i)=>`<i style="--offset:${i-(count-1)/2}"><span>${sigilHTML()}</span></i>`).join(''),winning=session.phase!=='round'&&session.results.at(-1)?.winnerId===player.id,archetype=player.archetype||'wanderer';return `<div class="opponent seat-space seat-${slot} archetype-${archetype} house-${player.house||'blue'} ${active?'active':''} ${stopped?'sealed':''} ${propRattled.has(player.id)?'rattled':''} ${winning?'winner-seat':''} ${player.hand.length===1?'last-card':''}" data-space="seat" data-seat="${slot}" data-player-id="${player.id}" data-archetype="${archetype}" role="group" aria-label="${active?(en?`It is ${name}'s turn`:`התור עכשיו אצל ${name}`):(en?`${name}, hidden hand`:`${name}, יד נסתרת`)}">${tavernCharacterHTML(player)}<div class="seat-marker"><i class="house-pin ${player.house||''}">${colorRuneHTML(player.house,'house-rune')}</i><span>${name}</span><small>${archetypeNames[settings.language]?.[player.archetype]||(en?'Opponent':'יריב')}</small><b><i></i><bdi>${player.hand.length}</bdi></b>${seatScoreHTML(player)}</div><div class="opponent-fan" data-hand-anchor>${backs}</div>${revealedHandHTML(player)}${propsHTML(player)}${stopped?'<span class="stop-seal shield-seal" aria-hidden="true"></span>':''}${quip?.player===player.id?`<div class="speech" role="status">${quip.text}</div>`:''}</div>`;}
function opponentSeats(players){if(session.mode==='duel')return duelOpponentHTML(players[0]);if(session.mode==='quick'&&players.length===1)return quickOpponentHTML(players[0]);const layouts={1:['top'],2:['left','right'],3:['left','top','right'],4:['far-left','left','right','far-right'],5:['far-left','left','top','right','far-right']};return players.map((p,i)=>opponentHTML(p,(layouts[players.length]||layouts[5])[i]||'top')).join('');}
function statusHTML(){const en=isEnglish(),bits=[];if(state.activePenalty)bits.push(`<span class="penalty-token" aria-label="${en?`Draw ${state.activePenalty.amount} cards`:`משיכת ${state.activePenalty.amount} קלפים`}"><bdi>+${state.activePenalty.amount}</bdi><i></i></span>`);if(state.taki?.open){const human=state.taki.ownerId==='p0'&&currentPlayer(state).id==='p0',owner=displayName(state.players.find(p=>p.id===state.taki.ownerId)),color=colorName(state.taki.color);bits.push(`<div class="taki-panel ${human?'yours':'bot-taki'}" style="--taki-color:${colorHex[state.taki.color]}" role="status"><div><b>${en?'Crossbow loaded':'קשת דרוכה'} · ${color}</b><small>${human?(en?`Keep playing ${color} cards`:`אפשר להמשיך עם קלפי ${color}`):(en?`${owner} keeps playing`:`${owner} ממשיך לשחק`)}</small></div>${human?`<button class="close-taki" data-close-taki>${en?'Fire':'לירות'}</button>`:''}</div>`);}return bits.join('');}
function actionStripHTML(){
  const en=isEnglish(),active=currentPlayer(state),humanTurn=active.id==='p0'&&state.phase==='playing';
  let message='';
  if(state.activePenalty&&humanTurn)message=en?`Draw ${state.activePenalty.amount} — or answer with Curse / King`:`משכו ${state.activePenalty.amount} — או ענו בקללה / מלך`;
  else if(state.freePlay&&humanTurn)message=en?'Free play — any card':'מהלך חופשי — כל קלף';
  else if(state.mustPlayAgain&&humanTurn)message=state.players[0].hand.length? (en?'Play again — or draw':'שחקו שוב — או משכו'):(en?'Quickstep cannot finish — draw':'קוויקסטפ לא יכול לסיים — משכו');
  else if(eventBanner?.kind==='stop')message=eventBanner.targetId==='p0'?(en?'Your turn was skipped':'התור שלכם דולג'):(en?`${displayName(state.players.find(p=>p.id===eventBanner.targetId))} was skipped`:`התור של ${displayName(state.players.find(p=>p.id===eventBanner.targetId))} דולג`);
  else if(eventBanner?.kind==='reverse')message=en?'Direction reversed':'כיוון המשחק התהפך';
  else if(eventBanner?.kind==='color')message=en?`Active color: ${colorName(state.activeColor)}`:`הצבע הפעיל: ${colorName(state.activeColor)}`;
  else {const last=state.players.slice(1).find(player=>player.hand.length===1);if(last)message=en?`${displayName(last)} has one card left`:`ל${displayName(last)} נשאר קלף אחד`;}
  return message?`<div class="action-strip" role="status" aria-live="polite">${message}</div>`:'';
}
function choiceHTML(){if(state.awaitingColor?.playerId!=='p0')return'';const en=isEnglish();return `<div class="color-choice" role="dialog" aria-label="${en?'Choose a color':'בחירת צבע'}"><div class="gem-ring"><span>${en?'Choose a color':'בחרו צבע'}</span>${COLORS.map(c=>`<button class="gem ${c}" data-color="${c}" aria-label="${colorName(c)}"><i>${colorRuneHTML(c,'gem-rune')}</i></button>`).join('')}</div></div>`;}
function eventHTML(){return settings.captions&&captionLine?`<div class="table-caption" role="status" aria-live="polite">${captionLine}</div>`:'';}
function flightsHTML(){return drawFlights.map(f=>Array.from({length:f.count},(_,i)=>`<span class="card-flight to-${f.slot}" data-flight-id="${f.id}" style="--flight-delay:${i*(f.count>5?42:72)}ms;--flight-index:${i}" aria-hidden="true"></span>`).join('')).join('');}
function roundMarkerHTML(){if(session.mode==='quick')return'';return `<div class="round-marker">${isEnglish()?(session.suddenDeath?'Tie · Final hand':`${session.mode==='duel'?'Duel · ':''}Round <bdi>${session.round}</bdi> of <bdi>${session.totalRounds}</bdi>`):(session.suddenDeath?'שוויון · יד אחרונה':`${session.mode==='duel'?'דו־קרב · ':''}סיבוב <bdi>${session.round}</bdi> מתוך <bdi>${session.totalRounds}</bdi>`)}</div>`;}
function gameHTML(){
  const en=isEnglish(),human=state.players[0],active=currentPlayer(state),oneOnOne=session.mode==='quick'&&state.players.length===2,isHumanTurn=session.phase==='round'&&active.id===human.id&&!state.awaitingColor,legal=new Set(isHumanTurn?getLegalCards(state,human.id).map(c=>c.id):[]),shown=human.hand,top=topCard(state);
  if(active.id!==lastActivePlayerId){lastActivePlayerId=active.id;if(active.id===human.id)turnCueUntil=Date.now()+(settings.reducedMotion?650:1650);}
  const turnHint=hint;
  const under=state.discardPile.slice(-4,-1),fresh=top.id!==lastRenderedTopId;lastRenderedTopId=top.id;
  const arrows=`<svg class="direction-arrows" viewBox="0 0 300 300" aria-label="${en?'Direction of play':'כיוון המשחק'}"><defs><filter id="rune-waver"><feTurbulence type="fractalNoise" baseFrequency=".025" numOctaves="2" seed="8" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="2.1"/></filter></defs><g filter="url(#rune-waver)"><path class="rune-route" pathLength="100" d="M57 181A105 105 0 0 1 226 74"/><path class="rune-head" d="m219 54 9 22-24 4"/><path class="rune-route" pathLength="100" d="M243 119A105 105 0 0 1 74 226"/><path class="rune-head" d="m81 246-9-22 24-4"/></g></svg>`;
  const handCards=shown.map((card,i)=>{const incoming=incomingCardDelays.get(card.id);return cardHTML(card,cardOptions({legal:isHumanTurn&&legal.has(card.id),highlight:settings.playableHints,selected:selected===card.id,incoming:!!incoming,arrivalDelay:incoming?incoming.delay-(performance.now()-incoming.started):0,index:i,total:shown.length}));}).join('');
  const drawSuggested=isHumanTurn&&!state.taki?.open&&legal.size===0;
  const turnVars=`--active:${colorHex[state.activeColor]||'#b78b45'}`,resolvedTopColor=top.type===TYPES.CHANGE_COLOR&&state.awaitingColor?null:state.activeColor,showActiveColor=top.color==='wild'||top.type===TYPES.CHANGE_COLOR||top.type===TYPES.SUPER_TAKI||state.activeColor!==top.color;
  return `<main class="app-shell table-shell ${session.mode==='tavern'?'tavern-table':''} ${session.mode==='duel'?'duel-table':''} ${oneOnOne?'one-on-one quick-one-on-one':''} ${session.suddenDeath?'sudden-death':''} ${state.players.some(player=>player.hand.length===1)?'one-card-tension':''} ${settings.reducedMotion?'reduced-motion':''}" dir="${direction()}" style="${turnVars}">${worldSceneHTML(session.mode==='duel'?'duel':'game')}<section class="game ${isHumanTurn?'human-turn':'waiting'}"><header class="game-head viewport-space" data-space="viewport"><button class="rune-menu" data-open="pause" aria-label="${en?'Menu and pause':'תפריט והשהיה'}"><i></i><i></i><i></i></button>${roundMarkerHTML()}${scoreBoardHTML()}</header><div class="board" data-speed-bots><div class="opponents seat-layer">${opponentSeats(state.players.slice(1,6))}</div><div class="gameplay-anchors" data-space="world"><div class="direction-engraving ${state.direction<0?'counter':''} ${eventBanner?.kind==='reverse'?'lit':''} ${state.taki?.open?'taki-lit':''}">${arrows}${sigilHTML('table-sigil')}<span class="house-node red ${state.activeColor==='red'?'on':''}"></span><span class="house-node blue ${state.activeColor==='blue'?'on':''}"></span><span class="house-node green ${state.activeColor==='green'?'on':''}"></span><span class="house-node yellow ${state.activeColor==='yellow'?'on':''}"></span></div><div class="center"><div class="status-stack">${statusHTML()}</div><button class="pile draw-pile ${drawSuggested?'draw-suggested':''} ${deckSettling?'deck-settling':''}" data-draw data-draw-anchor aria-label="${en?`Draw a card. ${state.drawPile.length} cards remain`:`משיכת קלף. ${state.drawPile.length} קלפים נותרו`}" style="--deck-depth:${Math.min(8,Math.ceil(state.drawPile.length/15))}px"><span class="back-sigil">${sigilHTML()}</span><span class="deck-count"><bdi>${state.drawPile.length}</bdi></span></button><div class="pile discard ${fresh?'fresh':''}" data-discard-anchor style="--pile-turn:${((state.discardPile.length%7)-3)*.7}deg" aria-label="${en?`Top card. Active color: ${colorName(state.activeColor)||'Wild'}`:`הקלף המוביל. הצבע הפעיל: ${colorName(state.activeColor)||'חופשי'}`}"><div class="discard-under">${under.map((card,i)=>`<span class="under under-${i}">${cardHTML(card,cardOptions())}</span>`).join('')}</div>${cardHTML(top,cardOptions({activeColor:resolvedTopColor}))}${showActiveColor?`<span class="active-stone ${state.activeColor||'wild'}" title="${colorName(state.activeColor)}">${state.activeColor?colorRuneHTML(state.activeColor,'active-color-rune'):sigilHTML('active-color-rune')}</span>`:''}</div>${eventHTML()}</div>${actionStripHTML()}</div><span class="sr-only" aria-live="polite" aria-atomic="true">${screenReaderLine}</span></div><footer class="hand-area seat-space seat-bottom ${isHumanTurn?'your-active':''}" data-space="seat" data-seat="bottom">${playerSeatHTML(human)}<div class="turn-whisper ${hint?'notice':''}">${turnHint?`<span>${turnHint}</span>`:''}</div><span class="hand-browse-hint">${en?'Swipe to browse your hand':'החליקו כדי לראות את כל הקלפים'}</span><span class="hand-overflow hand-overflow-start" aria-hidden="true"></span><div class="hand ${state.taki?.open?'taki-active':''}" data-hand-anchor>${handCards}</div><span class="hand-overflow hand-overflow-end" aria-hidden="true"></span>${quip?.player==='p0'?`<div class="human-quip">${quip.text}</div>`:''}</footer></section>${choiceHTML()}${summaryHTML()}${sheetHTML()}</main>`;
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
function rawSheetHTML(){
  if(!sheet)return'';
  if(isEnglish()){
    if(sheet==='quick')return `<div class="sheet-wrap quick-wrap"><article class="tavern-sheet"><h2>Quick Play</h2><p>One hand, with no cumulative score.</p><label>Number of players</label><div class="segmented">${[2,3,4,6].map(n=>`<button data-players="${n}" class="${settings.playerCount===n?'on':''}">${n}</button>`).join('')}</div><button class="parchment-button primary" data-quick>Start</button><button class="text-link" data-close-sheet>Back</button></article></div>`;
    if(sheet==='rules')return `<div class="sheet-wrap rules-wrap"><article class="tavern-sheet rules"><h2>RUNES Rules</h2><p>Match the color, number, or symbol. A card you draw waits until your next turn. The first player to empty their hand wins.</p><h3 class="rule-heading"><span>Crossbow</span><i class="rule-card asset-rule"><img src="./assets/cards/crossbow.svg" alt=""></i></h3><p><b>Crossbow</b> opens a sequence in one color. Keep playing or close it. Only the last action card in the sequence takes effect; after <b>Quickstep</b>, you must play again.</p><h3 class="rule-heading"><span>King and Runed Crossbow</span><i class="rule-card asset-rule"><img src="./assets/cards/king.svg" alt=""></i></h3><p>The <b>King</b> cancels every restriction and grants another free play while the player still has cards. It can win as the final card. <b>Runed Crossbow</b> after a King lets you choose the sequence color.</p><h3>Tavern Duel</h3><p>Five rounds against one opponent. The winner scores one point for every card left in the loser's hand. All five rounds are played; a tie leads to a final hand.</p><h3>Tavern Game</h3><p>Five rounds against three opponents. Each hand's winner scores one point for every card left in the other hands. A tie after round five leads to a deciding hand.</p><h3>The Tavern Cards</h3><p><b>Shield</b> skips a player, <b>Turnabout</b> reverses direction, <b>Quickstep</b> grants another play, <b>Curse +2</b> stacks, and <b>Rune</b> chooses a color.</p><button class="parchment-button" data-close-sheet>Got it</button></article></div>`;
    return settingsHTML({title:sheet==='pause'?'Game paused':'Settings',language:'Language',sound:'Sound',gameSounds:'Game sounds',music:'Background music',ambience:'Tavern ambience',gameplay:'Gameplay',dialogue:'Opponent reactions',captions:'Captions & character speech',hints:'Highlight playable cards',accessibility:'Accessibility',haptics:'Haptics',motion:'Reduce motion',close:sheet==='pause'?'Return to table':'Close',leave:'Save and leave'});
  }
  if(sheet==='quick')return `<div class="sheet-wrap quick-wrap"><article class="tavern-sheet"><h2>משחק מהיר</h2><p>יד אחת, בלי ניקוד מצטבר.</p><label>מספר שחקנים</label><div class="segmented">${[2,3,4,6].map(n=>`<button data-players="${n}" class="${settings.playerCount===n?'on':''}">${n}</button>`).join('')}</div><button class="parchment-button primary" data-quick>להתחיל</button><button class="text-link" data-close-sheet>חזרה</button></article></div>`;
  if(sheet==='rules')return `<div class="sheet-wrap rules-wrap"><article class="tavern-sheet rules"><h2>חוקי רונות</h2><p>התאימו צבע, מספר או סמל. אם משכתם קלף, הוא יחכה לתור הבא. הראשון שמרוקן את היד מנצח.</p><h3 class="rule-heading"><span>קשת</span><i class="rule-card asset-rule"><img src="./assets/cards/crossbow.svg" alt=""></i></h3><p><b>קשת</b> פותחת רצף בצבע אחד. אפשר להמשיך לשחק או לסגור אותה. רק הפקודה האחרונה ברצף פועלת; אחרי <b>צעד זריז</b> חייבים לשחק שוב.</p><h3 class="rule-heading"><span>מלך וקשת רונית</span><i class="rule-card asset-rule"><img src="./assets/cards/king.svg" alt=""></i></h3><p><b>מלך</b> מבטל כל מגבלה ומעניק מהלך חופשי נוסף כל עוד נשארו לשחקן קלפים. אפשר לנצח איתו כקלף האחרון כרגיל. <b>קשת רונית</b> אחרי מלך מאפשרת לבחור את צבע הרצף.</p><h3>דו־קרב בפונדק</h3><p>חמישה סיבובים מול יריב אחד. המנצח מקבל נקודה על כל קלף שנותר בידי המפסיד. כל חמשת הסיבובים משוחקים; שוויון מוביל ליד אחרונה.</p><h3>משחק פונדק</h3><p>חמישה סיבובים מול שלושה יריבים. המנצח בכל יד מקבל נקודה על כל קלף שנותר בידי האחרים. שוויון אחרי הסיבוב החמישי מוביל ליד מכרעת.</p><h3>קלפי הפונדק</h3><p><b>מגן</b> מדלג, <b>שינוי כיוון</b> הופך את הסדר, <b>צעד זריז</b> מעניק מהלך נוסף, <b>קללה +2</b> מצטברת ו<b>רונה</b> בוחרת צבע.</p><button class="parchment-button" data-close-sheet>הבנתי</button></article></div>`;
  return settingsHTML({title:sheet==='pause'?'המשחק מושהה':'הגדרות',language:'שפה',sound:'צליל',gameSounds:'צלילי משחק',music:'מוזיקת רקע',ambience:'אווירת פונדק',gameplay:'משחק',dialogue:'תגובות יריבים',captions:'כתוביות ודיבור דמויות',hints:'הדגשת קלפים זמינים',accessibility:'נגישות',haptics:'רטט',motion:'צמצום תנועה',close:sheet==='pause'?'חזרה לשולחן':'סגור',leave:'שמירה ויציאה'});
}
function pauseHTML(){
  const en=isEnglish();
  return `<div class="sheet-wrap pause-wrap" data-sheet-backdrop><article class="tavern-sheet pause-sheet" role="dialog" aria-modal="true" aria-labelledby="pause-title"><header class="settings-head"><h2 id="pause-title">${en?'The table waits.':'השולחן ממתין.'}</h2><button class="sheet-close" data-close-sheet aria-label="${en?'Return to table':'חזרה לשולחן'}"><span aria-hidden="true">×</span></button></header><p>${en?'Your place is kept. The hand will resume exactly where it stopped.':'המקום שלכם שמור. היד תמשיך בדיוק מהמקום שבו עצרה.'}</p><button class="settings-close-action primary" data-close-sheet>${en?'Return to the table':'חזרה לשולחן'}</button><div class="pause-secondary"><button class="parchment-button" data-pause-nav="rules">${en?'House rules':'חוקי הבית'}</button><button class="parchment-button" data-pause-nav="settings">${en?'Settings':'הגדרות'}</button></div><button class="text-link" data-home>${en?'Save and leave':'שמירה ויציאה'}</button></article></div>`;
}
function rulesHTML(){
  const en=isEnglish(),cards=en?[
    ['shield.svg','Shield','Skip the next seat'],['curse-plus-2.svg','Curse','The next player draws two, unless they stack another Curse'],['riposte.svg','Turnabout','Reverse play in 3+ seats'],['quickstep.svg','Quickstep','Play one more card'],['crossbow.svg','Crossbow','Play cards of its colour in sequence; choose Fire when finished'],['rune.svg','Rune','Choose the active colour'],['king.svg','King','Clear restrictions; play freely'],['runed-crossbow.svg','Runed Crossbow','Choose a colour, then play cards of that colour in sequence']
  ]:[
    ['shield.svg','מגן','מדלג על המושב הבא'],['curse-plus-2.svg','קללה','השחקן הבא מושך שני קלפים, אלא אם הוא מוסיף קללה'],['riposte.svg','שינוי כיוון','הופך כיוון בשלושה מושבים ומעלה'],['quickstep.svg','צעד זריז','משחקים קלף נוסף'],['crossbow.svg','קשת','שחקו ברצף קלפים בצבע הקשת. לחצו לירות כשסיימתם'],['rune.svg','רונה','בוחרים את הצבע הפעיל'],['king.svg','מלך','מבטל מגבלות; משחק חופשי'],['runed-crossbow.svg','קשת רונית','בחרו צבע, ואז שחקו ברצף קלפים באותו צבע']
  ];
  return `<div class="sheet-wrap rules-wrap" data-sheet-backdrop><article class="tavern-sheet rules" role="dialog" aria-modal="true" aria-labelledby="rules-title"><header class="settings-head"><h2 id="rules-title">${en?'RUNES House Rules':'חוקי הבית של רונות'}</h2><button class="sheet-close" data-close-sheet aria-label="${en?'Close rules':'סגירת החוקים'}"><span aria-hidden="true">×</span></button></header><p>${en?'Match the colour, number, or symbol. There is no ordinary Two: Curse holds its place. A drawn card waits until your next turn. Empty your hand to win.':'התאימו צבע, מספר או סמל. אין קלף 2 רגיל: הקללה תופסת את מקומו. קלף שנמשך מחכה לתור הבא. הראשון שמרוקן את היד מנצח.'}</p><div class="rule-grid">${cards.map(([asset,name,line])=>`<section><img src="./assets/cards/${asset}" alt=""><div><h3>${name}</h3><p>${line}</p></div></section>`).join('')}</div><details><summary>${en?'Match formats and scoring':'מבנה משחק וניקוד'}</summary><p>${en?'Tavern Match and Duel last five rounds, with one point for every card left in losing hands. All five rounds are played; a tie leads to a deciding hand. Quick Play is one unscored hand for 2, 3, 4, or 6 players.':'משחק פונדק ודו־קרב נמשכים חמישה סיבובים. המנצח מקבל נקודה על כל קלף שנשאר בידי המפסידים. משחקים את כל חמשת הסיבובים; שוויון מוביל ליד מכרעת. משחק מהיר הוא יד אחת ללא ניקוד, ל־2, 3, 4 או 6 שחקנים.'}</p></details><button class="parchment-button" data-close-sheet>${en?'Return':'חזרה'}</button></article></div>`;
}
function sheetHTML(){
  if(sheet==='pause')return pauseHTML();
  if(sheet==='rules')return rulesHTML();
  return rawSheetHTML()
    .replaceAll('opens a sequence','loads a sequence')
    .replaceAll('Keep playing or close it.','Keep playing Burgundy, Forest, Gold, or Slate cards of its loaded colour, then Fire.')
    .replaceAll('פותחת רצף','דורכת רצף')
    .replaceAll('אפשר להמשיך לשחק או לסגור אותה.','אפשר להמשיך עם קלפי הצבע הדרוך ואז לירות.');
}
function settingsHTML(copy){
  const pause=sheet==='pause';
  return `<div class="sheet-wrap settings-wrap" data-sheet-backdrop><article class="tavern-sheet settings-sheet" role="dialog" aria-modal="true" aria-labelledby="settings-title"><header class="settings-head"><h2 id="settings-title">${copy.title}</h2><button class="sheet-close" data-close-sheet aria-label="${copy.close}"><span aria-hidden="true">×</span></button></header><div class="language-row"><label>${copy.language}</label><div class="segmented language-choice" role="group" aria-label="${copy.language}"><button data-language="he" aria-pressed="${settings.language==='he'}" class="${settings.language==='he'?'on':''}">עברית</button><button data-language="en" aria-pressed="${settings.language==='en'}" class="${settings.language==='en'?'on':''}">English</button></div></div><section class="settings-section" aria-labelledby="sound-settings"><h3 id="sound-settings">${copy.sound}</h3>${audioRow(copy.gameSounds,'sound','sfxVolume')}${audioRow(copy.music,'music','musicVolume')}${audioRow(copy.ambience,'ambience','ambienceVolume')}</section><section class="settings-section" aria-labelledby="gameplay-settings"><h3 id="gameplay-settings">${copy.gameplay}</h3>${toggleRow(copy.dialogue,'dialogue')}${toggleRow(copy.captions,'captions')}${toggleRow(copy.hints,'playableHints')}</section><section class="settings-section" aria-labelledby="accessibility-settings"><h3 id="accessibility-settings">${copy.accessibility}</h3>${toggleRow(copy.haptics,'haptics')}${toggleRow(copy.motion,'reducedMotion')}</section><footer class="settings-actions"><button class="settings-close-action" data-close-sheet>${copy.close}</button>${pause?`<button class="text-link" data-home>${copy.leave}</button>`:''}</footer></article></div>`;
}
function toggleRow(label,key){return `<div class="toggle-row setting-row"><label id="setting-${key}">${label}</label><button class="iron-switch ${settings[key]?'on':''}" data-toggle="${key}" aria-labelledby="setting-${key}" aria-pressed="${settings[key]}"><i></i></button></div>`;}
function audioRow(label,key,volumeKey){const value=Math.round((settings[volumeKey]??0)*100);return `<div class="audio-row setting-row"><div class="audio-label"><label id="setting-${key}">${label}</label><output for="volume-${volumeKey}">${value}%</output></div><div class="audio-controls"><input id="volume-${volumeKey}" type="range" min="0" max="100" step="1" value="${value}" data-volume="${volumeKey}" data-channel="${key}" aria-labelledby="setting-${key}"><button class="iron-switch ${settings[key]?'on':''}" data-toggle="${key}" aria-labelledby="setting-${key}" aria-pressed="${settings[key]}"><i></i></button></div></div>`;}

let handScrollLeft=0,previousHandRects=new Map();
function captureHandLayout(){const hand=root.querySelector('.hand');if(!hand)return;handScrollLeft=hand.scrollLeft;previousHandRects=new Map([...hand.querySelectorAll(':scope > .card')].map(card=>[card.dataset.cardId,card.getBoundingClientRect()]));}
function render(){captureHandLayout();const brammStage=root.querySelector('.bramm-art-stage.bramm-table');document.documentElement.lang=settings.language;document.documentElement.dir=direction();document.querySelector('meta[name="description"]')?.setAttribute('content',isEnglish()?'An ancient card game around a tavern table — five rounds, cumulative scoring, and full offline play.':'משחק קלפים עתיק סביב שולחן פונדק — חמישה סיבובים, ניקוד מצטבר ומשחק מלא גם בלי אינטרנט.');root.innerHTML=view==='home'?homeHTML():view==='duelSelect'?duelSelectHTML():gameHTML();const placeholder=root.querySelector('[data-bramm-stage-placeholder]');if(brammStage&&placeholder){placeholder.replaceWith(brammStage);syncBrammStage(brammStage);}bind();}
function pauseGameTimers({leaving=false}={}){clearTimeout(botTimer);clearTimeout(takiTimer);clearTimeout(brammSlowTimer);clearTimeout(duelIdleTimer);clearTimeout(duelReactionTimer);clearTimeout(eventTimer);clearTimeout(quipTimer);clearTimeout(roundEndTimer);clearBrammTimers();audioSystem.stopVoice({restoreMusic:!leaving});}
function resumeGameTimers(){
  if(eventBanner){const held={...eventBanner};eventTimer=setTimeout(()=>{eventBanner=null;captionLine='';render();},settings.reducedMotion?200:900);eventBanner=held;}
  if(quip)quipTimer=setTimeout(()=>{quip=null;render();},1800);
  if(session?.phase!=='round'&&!roundResultVisible)roundEndTimer=setTimeout(()=>{roundResultVisible=true;recordDuelResult();feedback('round',settings);persist();render();},settings.reducedMotion?80:700);
  scheduleGame();scheduleDuelIdle();
}
function goHome(){flushPendingAction();persist();sessionEpoch++;pauseGameTimers({leaving:true});clearTimeout(deckAudioTimer);audioSystem.stopAmbience();audioSystem.stopMusic(true);view='home';sheet=null;render();}
function layoutHand(){
  const hand=root.querySelector('.hand');if(!hand)return;
  const cards=[...hand.querySelectorAll(':scope > .card')],count=cards.length;if(!count)return;
  const cardWidth=cards[0].offsetWidth||102;
  const available=Math.max(cardWidth,hand.clientWidth-24);
  const portrait=matchMedia('(max-width:599px) and (orientation:portrait)').matches;
  const {browse,overlap,spread,lift,scale}=calculateHandLayout({count,cardWidth,available,portrait});
  hand.dataset.cardCount=String(count);
  hand.dataset.layout=browse?'browse':'fan';
  hand.parentElement.classList.toggle('hand-browsing',browse);
  cards.forEach((card,index)=>{
    const offset=index-(count-1)/2;
    card.style.setProperty('--overlap',`${overlap.toFixed(2)}px`);
    card.style.setProperty('--tilt',`${(browse?0:offset*spread).toFixed(2)}deg`);
    card.style.setProperty('--rise',`${(browse?0:Math.abs(offset)*lift).toFixed(2)}px`);
    card.style.setProperty('--hand-scale',String(scale));
  });
  const updateOverflow=()=>{const max=Math.max(0,hand.scrollWidth-hand.clientWidth),start=root.querySelector('.hand-overflow-start'),end=root.querySelector('.hand-overflow-end');if(start)start.classList.toggle('visible',browse&&hand.scrollLeft>4);if(end)end.classList.toggle('visible',browse&&hand.scrollLeft<max-4);hand.dataset.overflow=browse&&max>1?'true':'false';};
  if(browse){hand.scrollLeft=Math.min(handScrollLeft,Math.max(0,hand.scrollWidth-hand.clientWidth));hand.onscroll=updateOverflow;}else hand.onscroll=null;
  updateOverflow();
  if(!settings.reducedMotion)cards.forEach(card=>{const before=previousHandRects.get(card.dataset.cardId),after=card.getBoundingClientRect();if(!before)return;const dx=before.left-after.left,dy=before.top-after.top;if(Math.abs(dx)+Math.abs(dy)>2)card.animate([{translate:`${dx}px ${dy}px`},{translate:'0 0'}],{duration:220,easing:'cubic-bezier(.2,.75,.25,1)'});});
  previousHandRects.clear();
}
function bind(){
  root.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{sheet=b.dataset.open;if(sheet==='pause')pauseGameTimers();render();requestAnimationFrame(()=>root.querySelector('.sheet-close,[data-close-sheet]')?.focus({preventScroll:true}));});
  root.querySelectorAll('[data-close-sheet]').forEach(b=>b.onclick=closeSheet);
  root.querySelectorAll('[data-pause-nav]').forEach(b=>b.onclick=()=>{sheet=b.dataset.pauseNav;render();requestAnimationFrame(()=>root.querySelector('.sheet-close,[data-close-sheet]')?.focus({preventScroll:true}));});
  root.querySelector('[data-sheet-backdrop]')?.addEventListener('click',event=>{if(event.target===event.currentTarget&&matchMedia('(hover:hover) and (pointer:fine)').matches)closeSheet();});
  root.querySelectorAll('[data-language]').forEach(b=>b.onclick=()=>{const language=b.dataset.language;settings.language=language;hint='';screenReaderLine='';captionLine='';saveSettings(settings);if(isBrammDuel())void audioSystem.preloadVoice(language);render();requestAnimationFrame(()=>root.querySelector(`[data-language="${language}"]`)?.focus({preventScroll:true}));});
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
  root.querySelector('[data-duel]')?.addEventListener('click',()=>{view='duelSelect';sheet=null;render();void preloadBrammExpressions();});
  root.querySelectorAll('[data-opponent]').forEach(b=>b.onclick=async()=>{settings.duelOpponent=b.dataset.opponent;saveSettings(settings);clearMatch();if(b.dataset.opponent==='bramm'){b.classList.add('loading');b.setAttribute('aria-busy','true');}try{await startSession('duel');}catch(error){console.error('Unable to prepare duel assets',error);b.classList.remove('loading');b.setAttribute('aria-busy','false');}});
  root.querySelector('[data-tavern]')?.addEventListener('click',()=>{clearMatch();startSession('tavern');});
  root.querySelector('[data-quick]')?.addEventListener('click',()=>{clearMatch();startSession('quick');});
  root.querySelector('[data-resume]')?.addEventListener('click',()=>{const saved=loadMatch();startSession(saved?.mode||'tavern',saved);});
  root.querySelector('[data-next]')?.addEventListener('click',()=>{feedback('shuffle',settings);deckSettling=true;if(isBrammDuel())brammController?.beginRound();setSession(startNextRound(session));if(session.mode==='duel')setDuelReaction('drink',duelLine('drink'),true);if(settings.music)audioSystem.startMusic({newRound:true});render();beginDeckArrival();scheduleGame();});
  root.querySelector('[data-rematch]')?.addEventListener('click',()=>{clearMatch();startSession('duel');});
  root.querySelector('[data-choose-opponent]')?.addEventListener('click',()=>{clearMatch();view='duelSelect';session=null;state=null;render();});
  root.querySelectorAll('[data-home]').forEach(b=>b.onclick=goHome);
  root.querySelector('[data-draw]')?.addEventListener('click',()=>{if(currentPlayer(state).id==='p0'&&!state.taki?.open)submit({type:ACTIONS.DRAW,playerId:'p0'});});
  root.querySelector('[data-close-taki]')?.addEventListener('click',()=>submit({type:ACTIONS.END_TURN,playerId:'p0'}));
  root.querySelector('[data-speed-bots]')?.addEventListener('pointerdown',event=>{if(!pendingBotTurn||event.target.closest('button,.card,[role="dialog"]'))return;event.preventDefault();clearTimeout(botTimer);const pending=pendingBotTurn;runBotTurn(pending.playerId,pending.epoch,pending.scheduledTurn);});
  root.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>submit({type:ACTIONS.CHOOSE_COLOR,playerId:'p0',color:b.dataset.color}));
  const twoStepPlay=matchMedia('(hover:none) and (pointer:coarse)').matches||matchMedia('(max-width:599px)').matches;
  const rejectCard=()=>{hint=isEnglish()?'That card cannot be played now':'אי אפשר לשחק את הקלף הזה עכשיו';feedback('invalid',settings);render();setTimeout(()=>{hint='';render();},850);};
  const selectCard=card=>{selected=card.dataset.cardId;root.querySelectorAll('.hand .card.selected').forEach(node=>{node.classList.remove('selected');node.setAttribute('aria-pressed','false');});card.classList.add('selected');card.setAttribute('aria-pressed','true');};
  root.querySelectorAll('.hand .card').forEach(card=>{
    let startY=0,lastY=0,startTime=0,lastTime=0,peakVelocity=0,moved=false,suppressClick=false;
    const legal=card.classList.contains('legal'),play=()=>{if(legal)submit({type:ACTIONS.PLAY,playerId:'p0',cardId:card.dataset.cardId});};
    const reset=()=>{card.style.removeProperty('transform');card.classList.remove('selected');selected=null;};
    card.onclick=e=>{if(suppressClick){suppressClick=false;e.preventDefault();return;}if(!legal){rejectCard();return;}if(!twoStepPlay||selected===card.dataset.cardId)play();else selectCard(card);};
    card.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();if(!legal)rejectCard();else if(!twoStepPlay||selected===card.dataset.cardId)play();else selectCard(card);}};
    if(!legal)return;
    card.onpointerdown=e=>{startY=lastY=e.clientY;card._startX=card._gestureStartX=e.clientX;startTime=lastTime=e.timeStamp;peakVelocity=0;moved=false;suppressClick=false;};
    card.onpointermove=e=>{const dy=e.clientY-startY,dx=e.clientX-(card._startX??(card._startX=e.clientX));if(Math.abs(dx)>7&&Math.abs(dx)>Math.abs(dy)){moved=true;return;}if(Math.abs(dy)<9)return;if(!card.hasPointerCapture(e.pointerId))card.setPointerCapture(e.pointerId);const segmentTime=Math.max(1,e.timeStamp-lastTime);moved=true;peakVelocity=Math.max(peakVelocity,(lastY-e.clientY)/segmentTime);lastY=e.clientY;lastTime=e.timeStamp;card.style.transform=`translateY(${Math.min(0,dy)}px) rotate(0deg)`;};
    card.onpointerup=e=>{
      const dy=e.clientY-startY,elapsed=Math.max(1,e.timeStamp-startTime),recentElapsed=Math.max(1,e.timeStamp-lastTime),velocity=Math.max(peakVelocity,(lastY-e.clientY)/recentElapsed,(startY-e.clientY)/elapsed),discard=root.querySelector('[data-discard-anchor]')?.getBoundingClientRect(),overDiscard=discard&&e.clientX>=discard.left-28&&e.clientX<=discard.right+28&&e.clientY>=discard.top-36&&e.clientY<=discard.bottom+36,upwardFlick=dy<-22&&velocity>.28;
      if(card.hasPointerCapture(e.pointerId))card.releasePointerCapture(e.pointerId);card._startX=null;
      suppressClick=moved;
      const dx=e.clientX-(card._gestureStartX??e.clientX),verticalIntent=Math.abs(dy)>Math.abs(dx)*1.2;
      if(verticalIntent&&(dy<-52||upwardFlick||overDiscard)){e.preventDefault();play();}
      else if(moved){e.preventDefault();reset();layoutHand();}
    };
    card.onpointercancel=e=>{if(card.hasPointerCapture(e.pointerId))card.releasePointerCapture(e.pointerId);card._startX=null;suppressClick=moved;reset();layoutHand();};
  });
  root.onclick=event=>{if(selected&&!event.target.closest('.hand .card')){selected=null;root.querySelectorAll('.hand .card.selected').forEach(card=>{card.classList.remove('selected');card.setAttribute('aria-pressed','false');});}};
  layoutHand();
}

function closeSheet(){const opener=sheet;sheet=view==='game'&&['rules','settings'].includes(opener)?'pause':null;if(view==='home'){audioSystem.stopAmbience();audioSystem.stopMusic();}render();if(opener==='pause')resumeGameTimers();requestAnimationFrame(()=>root.querySelector(`[data-open="${opener}"]`)?.focus({preventScroll:true}));}
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseGameTimers();else if(view==='game'&&!sheet)resumeGameTimers();});
document.addEventListener('keydown',event=>{if(!sheet)return;if(event.key==='Escape'){event.preventDefault();closeSheet();return;}if(event.key!=='Tab')return;const dialog=root.querySelector('[role="dialog"]');if(!dialog)return;const focusable=[...dialog.querySelectorAll('button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])')];if(!focusable.length)return;const first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}});

if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
function registerWebMCP(){const context=document.modelContext;if(!context?.registerTool)return;try{void Promise.resolve(context.registerTool({name:'read_game_state',title:'Read RUNES game',description:'Read the current RUNES match status.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute(){return session?{mode:session.mode,phase:session.phase,round:session.round,totalRounds:session.totalRounds,suddenDeath:session.suddenDeath,scores:session.scores,currentPlayer:currentPlayer(state).name,activeColor:state.activeColor,humanCardCount:state.players[0].hand.length,opponents:state.players.slice(1).map(p=>({name:p.name,cardCount:p.hand.length}))}:{phase:'home'};}})).catch(()=>{});}catch{}}
window.BrammDebug=Object.freeze({
  states:()=>brammController?.snapshot()||null,
  forceState:value=>{if(!brammController)return null;brammController.setState(value);setBrammExpression(brammController.defaultExpression());return brammController.snapshot();},
  trigger:value=>{if(!brammController)return null;const found=BRAMM_REACTIONS.find(item=>item.id===value||item.voice===value);return found?performBrammReaction(brammController.force(found.id)):null;},
  expression:value=>{if(!BRAMM_EXPRESSIONS.includes(value))return false;setBrammExpression(value);return true;},
  simulateOneCard:()=>runBramm('player_one_card',{},true),
  simulateWin:()=>runBramm('win',{close:true,survivedOneCard:true},true),
  simulateLoss:()=>runBramm('loss',{},true),
  reactions:BRAMM_REACTIONS,
  expressions:BRAMM_EXPRESSIONS
});
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
