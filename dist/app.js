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
// Player-facing order of the four colours: Burgundy, Forest, Gold, Slate.
const DISPLAY_COLORS=Object.freeze(['red','green','yellow','blue']);
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
let botTimer=null,eventTimer=null,quipTimer=null,roundEndTimer=null,duelReactionTimer=null,duelIdleTimer=null,deckAudioTimer=null,brammSlowTimer=null,musicRestoreTimer=null,eventBanner=null,quip=null,duelReaction='idle',lastDuelReactionAt=0,lastLogLength=0,lastCounts={},lastHands={},lastQuipAt=0,takiRun=0,lastRenderedTopId=null,sessionEpoch=0,roundResultVisible=false,incomingCardDelays=new Map(),propRattled=new Set(),screenReaderLine='',captionLine='',brammCaptionLine='',brammCaptionLocale='en',blockAiUntil=0,motionLocked=false,pendingAction=null,deckSettling=false,brammController=null,brammExpression='01_default_smug',brammPreviousExpression='01_default_smug',brammExpressionTimer=null,brammSwapTimer=null,brammSequenceTimers=[],pendingBotTurn=null;
const dialogueHe={
  hunter:{skip:['אה, לא. תורך.','לאן אתה חושב שאתה הולך?','שב.'],penalty:['ארבעה?!','זה מסלים מהר.','אני רואה שבחרנו באלימות.'],reverse:['חוזר אליך.','הסתובבו השולחנות.'],last:['כולם עליו.','עוד לא ניצחת.'],king:['הכתר החליט.','טוב. זה משנה דברים.']},
  bard:{skip:['בחייך.','זה היה מיותר לחלוטין.'],penalty:['אה. נפלא.','בשלב הזה פשוט תן לי את הקופה.'],reverse:['תרתי משמע.','שינוי בתוכניות.'],last:['זה נהיה מעניין.','אל תחייך עדיין.'],king:['קשה להתווכח עם כתר.','בחירה אמיצה.']},
  mercenary:{skip:['אני אזכור את זה.','את זה אני מחזיר לך.'],penalty:['יש גבול.','נקמה מוגשת עם קלפים.'],reverse:['חוזר אליך.','חשבתי שנפטרתי ממך.'],last:['מישהו יעצור אותו?','לא טוב.'],king:['זה יעלה לך.','הכתר החליט.']},
  scholar:{skip:['מעניין.','זה חוקי. בדקתי.'],penalty:['כנראה שאין גבול.','אני דורש נבואה חדשה.'],reverse:['זה לא היה חלק מהנבואה.','הכוכבים לא הזהירו אותי מזה.'],last:['אני רואה את הסוף.','כל כך קרוב.'],king:['זה מרגיש כמו קסם קדום.','בטוח שזה לא קסם אפל?']}
};
const dialogueEn={
  hunter:{skip:['Oh, no. Your turn.','Where d’you think you’re going?','Sit.'],penalty:['Four?!','That escalated quickly.','So we’ve chosen violence.'],reverse:['Back to you.','The tables have turned.'],last:['Everyone on them.','You haven’t won yet.'],king:['The crown has spoken.','Well. That changes things.']},
  bard:{skip:['Come on.','That was entirely unnecessary.'],penalty:['Ah. Wonderful.','At this point, just give me the pot.'],reverse:['Quite literally.','Change of plans.'],last:['This is getting interesting.','Don’t smile yet.'],king:['Hard to argue with a crown.','Bold choice.']},
  mercenary:{skip:['I’ll remember that.','I’ll return the favour.'],penalty:['There is a limit.','Revenge is served with cards.'],reverse:['Back to you.','I thought I was rid of you.'],last:['Will someone stop them?','Not good.'],king:['That’ll cost you.','The crown has spoken.']},
  scholar:{skip:['Interesting.','It is legal. I checked.'],penalty:['Apparently there is no limit.','I demand a new prophecy.'],reverse:['That was not in the prophecy.','The stars did not warn me.'],last:['I can see the end.','So close.'],king:['This feels like ancient magic.','Sure that isn’t dark magic?']}
};
const tavernBanterHe=['יפה.','לא רע.','באמת?','כמובן.','ידעתי.','נו באמת.','זה היה אישי.','טעות.','בחירה מפוקפקת.','יש לך מזל.','עוד לא סיימתי.','היית חייב?','אני צריך עוד משקה.','הקלפים שונאים אותי.','מרשים. מעצבן, אבל מרשים.','שקט. אני חושב.','יש לי תוכנית.','לא הייתה לי תוכנית.','בדיוק לפי התוכנית.'];
const tavernBanterEn=['Nicely done.','Not bad.','Really?','Of course.','I knew it.','Come on.','That was personal.','A mistake.','Questionable choice.','Lucky.','I’m not done.','Did you have to?','I need another drink.','The cards hate me.','Impressive. Annoying, but impressive.','Quiet. I’m thinking.','I’ve got a plan.','I didn’t have a plan.','Exactly as planned.'];

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
function brammArtHTML(opponent,{context='table'}={}){if(opponent?.id!=='bramm')return `<i class="duel-sprite" style="${duelSpriteStyle(opponent,context==='table'?duelReaction:'idle')}"></i>`;if(context==='table'&&root.querySelector('.bramm-art-stage.bramm-table'))return '<span data-bramm-stage-placeholder></span>';const expression=context==='table'?brammExpression:'01_default_smug';return `<span class="bramm-art-stage bramm-${context}"><img class="bramm-art bramm-art-current" src="${brammExpressionURL(expression)}" alt="" draggable="false" onerror="this.onerror=null;this.src='${brammExpressionURL('01_default_smug')}'"></span>`;}
function syncBrammStage(stage){if(!stage)return;const current=stage.querySelector('.bramm-art-current'),currentURL=brammExpressionURL(brammExpression);if(current&&current.src!==currentURL)current.src=currentURL;stage.classList.remove('is-changing');}
function scheduleDuelIdle(){clearTimeout(duelIdleTimer);if(view!=='game'||isPaused()||session?.mode!=='duel'||session.phase!=='round')return;const opponent=currentDuelOpponent(),epoch=sessionEpoch;duelIdleTimer=setTimeout(()=>{if(epoch!==sessionEpoch||view!=='game'||isPaused()||session?.mode!=='duel'||session.phase!=='round'||eventBanner)return scheduleDuelIdle();if(isBrammDuel())runBramm('idle_taunt');else setDuelReaction('drink',opponent.dialoguePools.drink.at(Math.floor(Math.random()*opponent.dialoguePools.drink.length)),true);scheduleDuelIdle();},opponent.idleFrequency+Math.random()*9000);}
function setDuelReaction(kind,text=null,force=false){if(session?.mode!=='duel'||isBrammDuel())return;const opponent=currentDuelOpponent(),weight=opponent.reactionWeights[kind]??1;if(!force&&(Date.now()-lastDuelReactionAt<4200||Math.random()>weight))return;lastDuelReactionAt=Date.now();duelReaction=kind;clearTimeout(duelReactionTimer);if(text)showQuip('p1',text,force);render();const epoch=sessionEpoch;duelReactionTimer=setTimeout(()=>{if(epoch!==sessionEpoch)return;duelReaction='idle';render();scheduleDuelIdle();},settings.reducedMotion?350:1100+Math.random()*1200);}
function duelLine(kind){const pool=currentDuelOpponent().dialoguePools[kind]||[];return pool[Math.floor(Math.random()*pool.length)];}
function recordDuelResult(){if(session?.mode!=='duel'||session.phase!=='matchFinished'||session.recorded)return;const id=session.opponentId,record=settings.duelRecords?.[id]||{played:0,won:0};settings.duelRecords={...(settings.duelRecords||{}),[id]:{played:record.played+1,won:record.won+(session.championId==='p0'?1:0)}};session.recorded=true;saveSettings(settings);}
function setSession(next){
  sessionEpoch++;clearTimeout(eventTimer);clearTimeout(quipTimer);clearTimeout(roundEndTimer);clearTimeout(duelReactionTimer);clearTimeout(duelIdleTimer);clearBrammTimers();audioSystem.stopVoice();
  quip=null;duelReaction='idle';captionLine='';roundResultVisible=next.phase!=='round';session=next;state=session.game;
  if(isBrammDuel()){brammController ||= createBrammController({initial:{...(next.brammPersonality||{}),recentVoices:next.brammPersonality?.recentVoices||settings.brammRecentVoices||[]}});brammExpression=brammController.defaultExpression();brammPreviousExpression=brammExpression;}else{brammController=null;brammExpression='01_default_smug';brammPreviousExpression=brammExpression;}
  transport?.disconnect();transport=new LocalGameTransport(state);lastLogLength=state.log.length;lastCounts=Object.fromEntries(state.players.map(p=>[p.id,p.hand.length]));lastHands=Object.fromEntries(state.players.map(p=>[p.id,p.hand.map(card=>card.id)]));lastRenderedTopId=null;incomingCardDelays.clear();propRattled.clear();eventBanner=null;
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
      roundEndTimer=setTimeout(()=>{if(epoch!==sessionEpoch)return;revealRoundResult();},settings.reducedMotion?(authoredBeat?900:120):(authoredBeat?1850:1050));
    }
    persist();render();scheduleGame();
  });scheduleDuelIdle();
}
let coinsAnimatedFor=-1;
function revealRoundResult(){roundResultVisible=true;recordDuelResult();feedback('round',settings);persist();render();}
function startNextHand(){
  feedback('shuffle',settings);deckSettling=true;if(isBrammDuel())brammController?.beginRound();
  setSession(startNextRound(session));blockAiUntil=Date.now()+1300;
  if(session.mode==='duel')setDuelReaction('drink',duelLine('drink'),true);
  if(settings.music)audioSystem.startMusic({newRound:true});
  render();beginDeckArrival();scheduleGame();
}
// Coins physically slide from every losing seat to the winner's pile, once per result.
function animateCoinsToWinner(){
  const result=session?.results.at(-1);if(!result||coinsAnimatedFor===session.results.length)return;coinsAnimatedFor=session.results.length;
  if(session.mode==='quick'||settings.reducedMotion||!result.points)return;
  const target=[...root.querySelectorAll(`[data-score-anchor="${result.winnerId}"]`)].find(node=>node.offsetParent);if(!target)return;
  const to=target.getBoundingClientRect(),epoch=sessionEpoch;
  const sources=session.roster.filter(p=>p.id!==result.winnerId).map(p=>p.id==='p0'?root.querySelector('.hand-frame'):root.querySelector(`.seat[data-player-id="${p.id}"] .seat-plate`)).filter(Boolean);
  sources.forEach((source,seatIndex)=>{const from=source.getBoundingClientRect();for(let i=0;i<3;i++){const coin=document.createElement('i');coin.className='flying-coin';coin.setAttribute('aria-hidden','true');const sx=from.left+from.width/2+(i-1)*8,sy=from.top+from.height/2;Object.assign(coin.style,{left:`${sx}px`,top:`${sy}px`});document.body.append(coin);const dx=to.left+to.width/2-sx,dy=to.top+to.height/2-sy;coin.animate([{transform:'translate(-50%,-50%) scale(.9)',opacity:0},{transform:'translate(-50%,-50%) scale(1)',opacity:1,offset:.12},{transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.8)`,opacity:1}],{duration:620,delay:seatIndex*110+i*70,easing:'cubic-bezier(.35,.05,.25,1)',fill:'both'}).finished.catch(()=>{}).finally(()=>coin.remove());}});
  const timer=setTimeout(()=>{if(epoch===sessionEpoch)feedback('coin',settings);},620+sources.length*110);brammSequenceTimers.push(timer);
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
  setSession(next);if(!saved)blockAiUntil=Date.now()+1300;
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
  if(playerId==='p0'){
    const frame=root.querySelector('.hand-frame'),cards=[...root.querySelectorAll('.hand .card')];if(!frame||!cards.length)return frame||root.querySelector('.hand');
    const f=frame.getBoundingClientRect(),mid=f.left+f.width/2;
    return cards.reduce((best,card)=>{const r=card.getBoundingClientRect(),d=Math.abs(r.left+r.width/2-mid);return d<best.d?{card,d}:best;},{card:cards.at(-1),d:Infinity}).card;
  }
  return root.querySelector(`[data-player-id="${playerId}"] [data-hand-anchor] i:last-child`)||root.querySelector(`[data-player-id="${playerId}"] [data-hand-anchor]`);
}
// Card movement is a card sliding over wood: it leaves quickly, keeps its
// momentum, and drags to a stop on the pile with a small, final turn. No arcs,
// no overshoot.
function animateOneCard({source,destination,card,mode,duration,delay=0,index=0,trajectory='play'}){
  if(settings.reducedMotion||!source||!destination)return new Promise(resolve=>setTimeout(resolve,90+delay));
  const from=source.getBoundingClientRect(),to=destination.getBoundingClientRect();
  const startW=Math.max(24,Math.min(150,from.width||52)),startH=startW*1.4,endW=Math.max(20,Math.min(150,to.width||52)),endH=endW*1.4;
  const sx=from.left+from.width/2-startW/2,sy=from.top+from.height/2-startH/2,ex=to.left+to.width/2-endW/2,ey=to.top+to.height/2-endH/2;
  const dx=ex-sx,dy=ey-sy,ratio=endW/startW,side=index%2?1:-1;
  const proxy=cardMotionProxy(card,mode);Object.assign(proxy.style,{left:`${sx}px`,top:`${sy}px`,width:`${startW}px`,height:`${startH}px`});proxy.style.setProperty('--proxy-w',`${startW}px`);proxy.style.setProperty('--flip-ms',`${duration}ms`);
  const settleTurn=trajectory==='draw'?0:(Math.random()*2-1)*1.6;
  const frames=trajectory==='draw'
    ?[{transform:`translate(0,0) rotate(${side*1.5}deg) scale(1)`},{transform:`translate(${dx*.9}px,${dy*.9}px) rotate(${side*.6}deg) scale(${1+(ratio-1)*.9})`,offset:.72},{transform:`translate(${dx}px,${dy}px) rotate(0deg) scale(${ratio})`}]
    :[{transform:'translate(0,0) rotate(0deg) scale(1)'},{transform:`translate(${dx*.93}px,${dy*.93}px) rotate(${settleTurn*1.8}deg) scale(${(1+(ratio-1)*.93)*1.02})`,offset:.7},{transform:`translate(${dx}px,${dy}px) rotate(${settleTurn}deg) scale(${ratio})`}];
  return new Promise(resolve=>{setTimeout(()=>{const animation=proxy.animate(frames,{duration,easing:'cubic-bezier(.22,.7,.28,1)',fill:'forwards'});animation.finished.catch(()=>{}).finally(()=>{proxy.remove();resolve();});},delay);});
}
async function animateCardMovement(action){
  const player=state.players.find(item=>item.id===action.playerId);if(!player)return;
  const draw=action.type===ACTIONS.DRAW,card=draw?null:player.hand.find(item=>item.id===action.cardId);
  const source=draw?root.querySelector('[data-draw-anchor]'):(action.playerId==='p0'?root.querySelector(`.hand [data-card-id="${action.cardId}"]`):handAnchor(action.playerId)),destination=draw?handAnchor(action.playerId):root.querySelector('[data-discard-anchor]');
  // Opponent cards turn face-up during travel and reach the discard face-up.
  // pile after landing. This avoids mobile 3D clipping and face flashes.
  const mode=draw?'back':action.playerId!=='p0'?'flip':'front';
  const count=draw?Math.min(state.activePenalty?.amount||1,8):1,duration=draw?380:action.playerId==='p0'?340:480;
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
  await Promise.all(Array.from({length:count},(_,index)=>animateOneCard({source,destination,card,mode,duration,delay:index*90,index,trajectory:draw?'draw':'play'})));
  if(draw){source?.classList.remove('drawing');destination?.classList.remove('receiving-card');}
  if(!draw)source?.classList.remove('motion-source');
}
function showEvent(kind,playerId=null,amount=null,cardId=null){clearTimeout(eventTimer);eventBanner={kind,playerId,targetId:playerId,amount,cardId};const epoch=sessionEpoch;eventTimer=setTimeout(()=>{if(epoch!==sessionEpoch)return;eventBanner=null;captionLine='';if(view==='game'&&!motionLocked)render();},settings.reducedMotion?300:1100);}
function showQuip(player,text,force=false){if(!settings.dialogue||!text||(!force&&Date.now()-lastQuipAt<7800))return;lastQuipAt=Date.now();clearTimeout(quipTimer);quip={player,text};quipTimer=setTimeout(()=>{quip=null;render();},Math.min(2800,1500+text.length*42));}
function botLine(playerId,trigger){const player=state.players.find(p=>p.id===playerId),pool=(isEnglish()?dialogueEn:dialogueHe)[player?.archetype]?.[trigger]||[];return pool[Math.floor(Math.random()*pool.length)];}
function cardCountLabel(count){return isEnglish()?(count===0?'No cards':count===1?'1 card':`${count} cards`):(count===0?'אין קלפים':count===1?'קלף אחד':`${count} קלפים`);}
function cardCountHTML(count){return isEnglish()?(count===0?'No cards':count===1?'<bdi>1</bdi> card':`<bdi>${count}</bdi> cards`):(count===0?'אין קלפים':count===1?'קלף אחד':`<bdi>${count}</bdi> קלפים`);}
function announce(entries){
  const names=Object.fromEntries(state.players.map(p=>[p.id,displayName(p)])),player=id=>state.players.find(p=>p.id===id);
  const stop=entries.find(x=>x.type==='stop'),penalty=entries.find(x=>x.type==='drawPenalty'),draw=entries.find(x=>x.type==='draw'),stack=entries.find(x=>x.type==='plus2'),play=entries.findLast?.(x=>x.type==='play'),win=entries.find(x=>x.type==='win'),color=entries.find(x=>x.type==='color');
  if(isEnglish()){
    if(win)return win.playerId==='p0'?'You won the hand':`${names[win.playerId]} won the hand`;
    if(stop)return stop.skipped==='p0'?'Your turn was skipped':`${names[stop.skipped]} is skipped`;
    if(penalty)return penalty.playerId==='p0'?`You take ${penalty.amount}`:`${names[penalty.playerId]} takes ${penalty.amount}`;
    if(draw)return draw.playerId==='p0'?'You drew a card':`${names[draw.playerId]} drew a card`;
    if(entries.some(x=>x.type==='reverse'))return'Direction reversed';
    if(entries.some(x=>x.type==='takiOpened'))return'Crossbow loaded';
    if(entries.some(x=>x.type==='takiClosed'))return'Crossbow fired';
    if(entries.some(x=>x.type==='playAgain'))return currentPlayer(state).id==='p0'?'Play again':`${displayName(currentPlayer(state))} plays again`;
    if(color)return`Colour is now ${colorName(color.color)}`;
    if(stack)return`The Curse grows: +${stack.amount}`;
    if(play){const card=state.discardPile.find(c=>c.id===play.cardId),label=card?(card.type===TYPES.NUMBER?`${colorName(card.color)} ${card.value}`:cardLabel(card,'en')):'a card';return play.playerId==='p0'?`You played ${label}`:`${names[play.playerId]} played ${label}`;}
    return'';
  }
  const verb=(id,m,f)=>isFeminine(player(id))?f:m;
  if(win)return win.playerId==='p0'?'ניצחתם ביד':`${names[win.playerId]} ${verb(win.playerId,'ניצח','ניצחה')} ביד`;
  if(stop)return stop.skipped==='p0'?'התור שלכם דולג':`התור של ${names[stop.skipped]} דולג`;
  if(penalty)return penalty.playerId==='p0'?`לקחתם ${penalty.amount} קלפים`:`${names[penalty.playerId]} ${verb(penalty.playerId,'לקח','לקחה')} ${penalty.amount} קלפים`;
  if(draw)return draw.playerId==='p0'?'משכתם קלף':`${names[draw.playerId]} ${verb(draw.playerId,'משך','משכה')} קלף`;
  if(entries.some(x=>x.type==='reverse'))return'כיוון המשחק התהפך';
  if(entries.some(x=>x.type==='takiOpened'))return'הקשת דרוכה';
  if(entries.some(x=>x.type==='takiClosed'))return'הקשת נורתה';
  if(entries.some(x=>x.type==='playAgain')){const id=currentPlayer(state).id;return id==='p0'?'שחקו שוב':`${names[id]} ${verb(id,'משחק','משחקת')} שוב`;}
  if(color)return`הצבע עכשיו ${colorName(color.color)}`;
  if(stack)return`הקללה עלתה ל־+${stack.amount}`;
  if(play){const card=state.discardPile.find(c=>c.id===play.cardId),label=card?(card.type===TYPES.NUMBER?`${card.value} ${colorName(card.color)}`:cardLabel(card,'he')):'קלף';return play.playerId==='p0'?`שיחקתם ${label}`:`${names[play.playerId]} ${verb(play.playerId,'שיחק','שיחקה')} ${label}`;}
  return'';
}
function isFeminine(player){return!!player&&(['hunter','scholar'].includes(player.archetype)||['איילה','לידיה','סֶלָה'].includes(player.name));}
function winnerLine(player,unit='round'){if(!player)return'';const hand=unit==='hand';if(isEnglish())return player.id==='p0'?(hand?'You won the hand':'You won the round'):`${displayName(player)} won the ${hand?'hand':'round'}`;if(player.id==='p0')return hand?'ניצחתם ביד':'ניצחתם בסיבוב';return`${player.name} ${isFeminine(player)?'ניצחה':'ניצח'} ${hand?'ביד':'בסיבוב'}`;}
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
  if(oneCardTension)audioSystem.duckMusic(.42,420);
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
  const active=currentPlayer(state),legal=getLegalCards(state,active.id),base=settings.difficulty==='quick'?520:settings.difficulty==='thoughtful'?1100:680;
  const obvious=legal.length===1,important=legal.some(card=>[TYPES.PLUS2,TYPES.KING,TYPES.SUPER_TAKI].includes(card.type))||active.hand.length<=2;
  const situational=obvious?-220:legal.length>=4?160:0,hesitation=important&&Math.random()<.46?260+Math.random()*320:0,jitter=(Math.random()-.5)*220;
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
  clearTimeout(botTimer);clearTimeout(brammSlowTimer);
  if(isPaused()||!state||session.phase!=='round'||state.phase==='finished')return;
  const active=currentPlayer(state);
  if(active.kind==='human'){if(isBrammDuel()){const epoch=sessionEpoch,turn=state.turn;brammSlowTimer=setTimeout(()=>{if(epoch===sessionEpoch&&state?.turn===turn&&currentPlayer(state)?.id==='p0')runBramm('slow_player');},11000);}return;}
  const playerId=active.id,epoch=sessionEpoch,scheduledTurn=state.turn;
  pendingBotTurn={playerId,epoch,scheduledTurn};
  botTimer=setTimeout(()=>runBotTurn(playerId,epoch,scheduledTurn),Math.max(delay(),blockAiUntil-Date.now()));
}

/* ------------------------------------------------------------------ */
/* Screens. Every screen is: world scene (environment + table) + one   */
/* viewport layer. Layout lives in styles.css; markup stays semantic.  */
/* ------------------------------------------------------------------ */
function readSavedSession(){const saved=loadMatch();if(!saved)return null;try{const restored=restoreSession(saved);return restored.mode==='quick'&&restored.game?.players?.length>6?null:restored;}catch{return null;}}
function recordText(record){const won=record?.won||0,lost=Math.max(0,(record?.played||0)-won);return {won,lost};}
function homeHTML(){
  const en=isEnglish(),savedSession=readSavedSession(),resumable=savedSession&&savedSession.phase!=='matchFinished';
  const savedOpponent=savedSession?.mode==='duel'?displayOpponent(getDuelOpponent(savedSession.opponentId||settings.duelOpponent)):null;
  const bramm=recordText(settings.duelRecords?.bramm);
  const t=en?{
    resumeKicker:'Your seat is kept',resume:{duel:'Continue the Duel',tavern:'Continue the Tavern Match',quick:'Continue Quick Play'},
    quick:'Quick Play',quickSub:'One hand with strangers',tavern:'Tavern Match',tavernSub:'Five rounds with the regulars',
    duel:'Duel',duelSub:'Bramm waits. “Still unbeaten.”',record:`You <bdi>${bramm.won}</bdi>–<bdi>${bramm.lost}</bdi> Bramm`,rules:'Rules',settings:'Settings'
  }:{
    resumeKicker:'המקום שלכם שמור',resume:{duel:'להמשיך בדו־קרב',tavern:'להמשיך במשחק הפונדק',quick:'להמשיך במשחק המהיר'},
    quick:'משחק מהיר',quickSub:'יד אחת עם זרים',tavern:'משחק פונדק',tavernSub:'חמישה סיבובים מול הקבועים',
    duel:'דו־קרב',duelSub:'בראם מחכה. ״עדיין בלתי־מנוצח.״',record:`אתם <bdi>${bramm.won}</bdi>–<bdi>${bramm.lost}</bdi> בראם`,rules:'חוקים',settings:'הגדרות'
  };
  const resumeMeta=!resumable?'':savedSession.mode==='duel'
    ?(en?`Against ${savedOpponent.name} · Round <bdi>${savedSession.round}</bdi> of <bdi>${savedSession.totalRounds}</bdi>`:`מול ${savedOpponent.name} · סיבוב <bdi>${savedSession.round}</bdi> מתוך <bdi>${savedSession.totalRounds}</bdi>`)
    :savedSession.mode==='tavern'
      ?(en?`Round <bdi>${savedSession.round}</bdi> of <bdi>${savedSession.totalRounds}</bdi>`:`סיבוב <bdi>${savedSession.round}</bdi> מתוך <bdi>${savedSession.totalRounds}</bdi>`)
      :(en?`One hand · <bdi>${savedSession.game?.players?.length||settings.playerCount}</bdi> players`:`יד אחת · <bdi>${savedSession.game?.players?.length||settings.playerCount}</bdi> שחקנים`);
  const resume=resumable?`<button class="home-choice resume-choice" data-resume><span class="choice-object">${cardBackStackHTML('object-cards object-cards-resume',3)}</span><span class="choice-copy"><small class="choice-kicker">${t.resumeKicker}</small><strong>${t.resume[savedSession.mode]||t.resume.quick}</strong><small>${resumeMeta}</small></span><i class="choice-arrow" aria-hidden="true"></i></button>`:'';
  return `<main class="app-shell screen-home ${resumable?'has-resume':''} ${settings.reducedMotion?'reduced-motion':''}" dir="${direction()}">${worldSceneHTML('home')}<section class="home-layer">
    <h1 class="home-title"><img class="primary-runes-logo" src="./assets/brand/runes-white.svg?v=60" alt="${en?'RUNES':'RUNES — רונות'}"></h1>
    <nav class="home-choices" aria-label="${en?'Ways to play':'דרכי משחק'}">${resume}
      <button class="home-choice quick-choice" data-open="quick"><span class="choice-object">${cardBackStackHTML('object-cards',3)}</span><span class="choice-copy"><strong>${t.quick}</strong><small>${t.quickSub}</small></span><i class="choice-arrow" aria-hidden="true"></i></button>
      <button class="home-choice tavern-choice" data-tavern><span class="choice-object"><img class="object-coins" src="./assets/props/gambling/stacked-coins.png" alt="" draggable="false"></span><span class="choice-copy"><strong>${t.tavern}</strong><small>${t.tavernSub}</small></span><i class="choice-arrow" aria-hidden="true"></i></button>
      <button class="home-choice duel-choice" data-duel><span class="choice-object duel-cameo">${brammArtHTML(getDuelOpponent('bramm'),{context:'cameo'})}</span><span class="choice-copy"><strong>${t.duel}</strong><small>${t.duelSub}</small><em class="choice-record">${t.record}</em></span><i class="choice-arrow" aria-hidden="true"></i></button>
    </nav>
    <div class="home-tools"><button class="tool-button" data-open="rules"><i class="tool-icon tool-rules" aria-hidden="true"></i><span>${t.rules}</span></button><button class="tool-button" data-open="settings"><i class="tool-icon tool-settings" aria-hidden="true"></i><span>${t.settings}</span></button></div>
  </section>${sheetHTML()}</main>`;
}
function duelSelectHTML(){
  const en=isEnglish(),regulars=DUEL_OPPONENTS.filter(item=>item.id!=='bramm').map(displayOpponent),bramm=displayOpponent(getDuelOpponent('bramm'));
  const recordHTML=opponent=>{const {won,lost}=recordText(settings.duelRecords?.[opponent.id]);return `<span class="chalk-record" aria-label="${en?`${won} wins, ${lost} losses`:`${won} ניצחונות, ${lost} הפסדים`}"><bdi>${won}</bdi><i>–</i><bdi>${lost}</bdi></span>`;};
  const regular=opponent=>{const [title,attitude]=opponent.descriptor.split(' · ');return `<button class="regular opponent-${opponent.id} ${settings.duelOpponent===opponent.id?'chosen':''}" data-opponent="${opponent.id}" aria-label="${en?`Duel ${opponent.name}, ${title}`:`דו־קרב מול ${opponent.name}, ${title}`}"><span class="regular-portrait">${brammArtHTML(opponent,{context:'select'})}</span><span class="regular-copy"><b>${opponent.name}</b><small>${title}</small><em>${attitude||''}</em>${recordHTML(opponent)}</span></button>`;};
  const [brammTitle,brammAttitude]=bramm.descriptor.split(' · ');
  return `<main class="app-shell screen-select ${settings.reducedMotion?'reduced-motion':''}" dir="${direction()}">${worldSceneHTML('select')}<section class="select-layer">
    <header class="select-head"><button class="icon-button back-button" data-home aria-label="${en?'Back':'חזרה'}"><span aria-hidden="true">${en?'‹':'›'}</span></button><div><small>${en?'The regulars have kept a seat':'הקבועים שמרו לכם מקום'}</small><h1>${en?'Choose your opponent':'בחרו יריב לדו־קרב'}</h1></div></header>
    <button class="regular champion-regular opponent-bramm ${settings.duelOpponent==='bramm'?'chosen':''}" data-opponent="bramm" aria-label="${en?'Duel Bramm, The Unbeaten':'דו־קרב מול בראם, הבלתי־מנוצח'}"><span class="regular-portrait">${brammArtHTML(bramm,{context:'select'})}</span><span class="regular-copy"><small class="champion-kicker">${en?'The house champion':'אלוף הבית'}</small><b>${bramm.name}</b><small>${brammTitle}</small><em>${brammAttitude||''}</em>${recordHTML(bramm)}</span></button>
    <div class="regulars">${regulars.map(regular).join('')}</div>
    <p class="select-note">${en?'Five rounds, one opponent. Every card left in a losing hand is a point.':'חמישה סיבובים מול יריב אחד. כל קלף שנשאר ביד המפסידה שווה נקודה.'}</p>
  </section></main>`;
}
function tableEngravingHTML(){return `<svg class="table-engraving" viewBox="0 0 1000 620" preserveAspectRatio="none" aria-hidden="true"><g><path d="M162 323C185 169 330 91 505 91c177 0 319 77 339 231"/><path d="M842 345C811 491 671 548 501 548c-171 0-310-57-341-204"/></g><g class="engraving-marks"><path d="m149 324 28-29 28 29-28 29zM823 324l28-29 28 29-28 29z"/><path d="m487 91 16-20 16 20-16 20zM487 548l16-20 16 20-16 20z"/></g></svg>`;}
function cardBackStackHTML(className,count=2){const back=cardHTML(null,cardOptions({hidden:true,small:true})).replace(/ aria-label="[^"]+"/,'');return `<span class="${className}" aria-hidden="true">${back.repeat(count)}</span>`;}
function worldSceneHTML(context='game'){
  return `<div class="scene-world scene-${context}" aria-hidden="true"><div class="tavern-environment"></div><div class="table-body"><div class="table-surface"></div>${context==='home'?tableEngravingHTML():''}</div><div class="scene-lighting"><i class="fire-glow"></i><i class="candle-glow"></i><i class="table-light"></i></div></div>`;
}
const propAssets=Object.freeze({
  ceramicCup:'drinks/ceramic-cup.png',darkBottle:'drinks/dark-glass-bottle.png',medievalFlask:'drinks/medieval-flask.png',pewterGoblet:'drinks/pewter-goblet.png',pewterTankard:'drinks/pewter-tankard.png',woodenTankard:'drinks/wooden-tankard.png',
  bettingToken:'gambling/carved-betting-token.png',dice:'gambling/dice-pair.png',bread:'food/bread-chunk.png',cheese:'food/cheese-wedge.png',nuts:'food/nuts-group.png',
  key:'personal/iron-key.png',pipe:'personal/smoking-pipe.png',ring:'personal/worn-metal-ring.png',rune:'mystical/carved-rune-token.png',amulet:'mystical/small-amulet.png',map:'bonus/map-scrap.png'
});
// Two objects per seat at most: one drink (the signature) and one personal item.
const seatPropStories=Object.freeze({
  bard:[['ceramicCup','nuts'],['ceramicCup','pipe']],
  hunter:[['woodenTankard','bread'],['woodenTankard','key']],
  mercenary:[['pewterTankard','dice'],['pewterTankard','bettingToken']],
  scholar:[['pewterGoblet','ring'],['pewterGoblet','key']],
  mysterious:[['medievalFlask','rune'],['medievalFlask','amulet']],
  wanderer:[['darkBottle','cheese'],['darkBottle','map']]
});
function propsHTML(player){const archetype=player.archetype||'wanderer',variants=seatPropStories[archetype]||seatPropStories.wanderer,identity=[...`${player.id}:${archetype}`].reduce((sum,char)=>sum+char.charCodeAt(0),0),items=variants[Math.abs((session?.seed||0)+identity)%variants.length];return `<span class="seat-props" aria-hidden="true">${items.map((item,index)=>`<img class="seat-object prop-${index+1}" src="./assets/props/${propAssets[item]}" alt="" draggable="false">`).join('')}</span>`;}
let lastPenaltyShown=0,slipShownFor=-1;
function freshQuip(){if(!quip||quip.rendered)return'';quip.rendered=true;return'enter';}
const TAVERN_FIGURES=new Set(['aila','ron','bran','sela','kesh']);
// Score as coins: one coin per four points (min one), stacked four high, at most
// three stacks. The exact number always sits beside the pile.
function coinStacks(score){if(score<=0)return[];const coins=Math.min(12,1+Math.floor(score/4)),stacks=[];for(let left=coins;left>0;left-=4)stacks.push(Math.min(4,left));return stacks;}
function coinPileHTML(score,extra=''){return `<span class="coin-pile ${extra}" aria-hidden="true">${coinStacks(score).map((height,index)=>`<i style="--coins:${height};--stack:${index}"></i>`).join('')}</span>`;}
function seatScoreHTML(player){
  if(!['tavern','duel'].includes(session.mode))return'';
  const score=session.scores?.[player.id]||0,latest=session.results.at(-1),scored=roundResultVisible&&session.phase!=='round'&&latest?.winnerId===player.id;
  return `<span class="seat-score ${scored?'scored':''}" data-score-anchor="${player.id}" aria-label="${isEnglish()?`${score} points`:`${score} נקודות`}">${coinPileHTML(score)}<bdi>${score}</bdi></span>`;
}
function revealedHandHTML(player){if(session.phase==='round'||!roundResultVisible||!player.hand.length)return'';const shown=player.hand.slice(0,7),more=player.hand.length-shown.length;return `<span class="revealed-hand" aria-hidden="true">${shown.map((card,index)=>cardHTML(card,cardOptions({small:true,legal:false,highlight:false,index}))).join('')}${more>0?`<b class="revealed-more">+<bdi>${more}</bdi></b>`:''}</span>`;}
function seatFigureHTML(player){
  if(session.mode==='duel')return `<div class="seat-figure duel-figure">${brammArtHTML(currentDuelOpponent(),{context:'table'})}<i class="contact-shadow"></i></div>`;
  if(session.mode==='tavern'&&TAVERN_FIGURES.has(player.nameKey))return `<div class="seat-figure"><img src="./assets/characters/table/${player.nameKey}-seated.webp" alt="" draggable="false"></div>`;
  return'';
}
const SEAT_LAYOUTS=Object.freeze({1:['n'],2:['nw','ne'],3:['w','n','e'],4:['w','nw','ne','e'],5:['w','nw','n','ne','e']});
function seatHTML(player,position){
  const en=isEnglish(),name=displayName(player),active=state.phase==='playing'&&currentPlayer(state).id===player.id,count=player.hand.length;
  const stopped=eventBanner?.kind==='stop'&&eventBanner.targetId===player.id,winning=session.phase!=='round'&&session.results.at(-1)?.winnerId===player.id;
  const fanCount=Math.min(12,count),backs=Array.from({length:fanCount},(_,i)=>`<i style="--offset:${(i-(fanCount-1)/2).toFixed(1)}"></i>`).join('');
  const duelOpponent=session.mode==='duel'?currentDuelOpponent():null,epithet=duelOpponent?duelOpponent.descriptor.split(' · ')[0]:'';
  const house=session.mode!=='quick'&&player.house?`<i class="house-pin ${player.house}">${colorRuneHTML(player.house,'house-rune')}</i>`:'';
  const speech=duelOpponent?.id==='bramm'
    ?(settings.captions&&brammCaptionLine?`<div class="speech bramm-speech" lang="${brammCaptionLocale}" dir="${brammCaptionLocale==='he'?'rtl':'ltr'}" role="status" aria-live="polite">${brammCaptionLine}</div>`:'')
    :(quip?.player===player.id?`<div class="speech ${freshQuip()}" role="status">${quip.text}</div>`:'');
  const label=active?(en?`${name}'s turn, ${cardCountLabel(count)}`:`התור של ${name}, ${cardCountLabel(count)}`):`${name}, ${cardCountLabel(count)}`;
  return `<div class="seat seat-${position} ${seatFigureHTML(player)?'has-figure':''} ${duelOpponent?`duel-seat opponent-${duelOpponent.id}`:''} ${active?'active':''} ${count===1&&state.phase==='playing'?'last-card':''} ${stopped?'sealed':''} ${propRattled.has(player.id)?'rattled':''} ${winning?'winner-seat':''}" data-player-id="${player.id}" data-seat="${position}" role="group" aria-label="${label}">
    ${seatFigureHTML(player)}
    <div class="seat-plate">${house}<span class="seat-name"><b>${name}</b>${epithet?`<small>${epithet}</small>`:''}</span><span class="seat-count" title="${cardCountLabel(count)}"><i class="mini-back" aria-hidden="true"></i><bdi>${count}</bdi></span></div>
    ${seatScoreHTML(player)}
    <div class="seat-fan" data-hand-anchor aria-hidden="true">${backs}</div>
    ${revealedHandHTML(player)}
    ${propsHTML(player)}
    ${stopped?'<span class="stop-seal" aria-hidden="true"></span>':''}${speech}
  </div>`;
}
function seatsHTML(players){const layout=SEAT_LAYOUTS[players.length]||SEAT_LAYOUTS[5];return players.map((player,index)=>seatHTML(player,layout[index]||'n')).join('');}
function playerPlaceHTML(player){
  const scored=['tavern','duel'].includes(session.mode);
  return `<div class="player-place" aria-hidden="true">${session.mode==='duel'&&isBrammDuel()?'':`<img class="player-drink" src="./assets/props/drinks/wooden-tankard.png" alt="" draggable="false">`}${scored?seatScoreHTML(player):''}</div>`;
}
function headScoreHTML(){
  if(!['tavern','duel'].includes(session.mode))return'';
  const score=session.scores?.p0||0;
  return `<span class="head-score" aria-label="${isEnglish()?`Your score: ${score}`:`הניקוד שלכם: ${score}`}">${coinPileHTML(score,'tiny')}<bdi>${score}</bdi></span>`;
}
function statusHTML(){
  const en=isEnglish();if(!state.activePenalty){lastPenaltyShown=0;return'';}
  const enter=state.activePenalty.amount!==lastPenaltyShown?'enter':'';lastPenaltyShown=state.activePenalty.amount;
  return `<span class="penalty-token ${enter}" role="status" aria-label="${en?`Curse: draw ${state.activePenalty.amount}`:`קללה: למשוך ${state.activePenalty.amount}`}"><bdi>+${state.activePenalty.amount}</bdi></span>`;
}
function crossbowHTML(){
  if(!state.taki?.open)return'';
  const en=isEnglish(),human=state.taki.ownerId==='p0'&&currentPlayer(state).id==='p0',owner=state.players.find(p=>p.id===state.taki.ownerId),color=colorName(state.taki.color);
  const sub=human?(en?`Keep playing ${color} cards`:`אפשר להמשיך עם קלפי ${color}`):(en?`${displayName(owner)} keeps playing ${color}`:`${displayName(owner)} ${isFeminine(owner)?'ממשיכה':'ממשיך'} עם ${color}`);
  return `<div class="crossbow-panel ${human?'yours':''} ${state.taki.color}" style="--taki-color:${colorHex[state.taki.color]}" role="status">${colorRuneHTML(state.taki.color,'crossbow-rune')}<span><b>${en?'Crossbow loaded':'קשת דרוכה'}</b><small>${sub}</small></span>${human?`<button class="fire-button" data-close-taki>${en?'Fire':'לירות'}</button>`:''}</div>`;
}
function actionStripText(){
  const en=isEnglish(),active=currentPlayer(state),humanTurn=active.id==='p0'&&state.phase==='playing';
  if(state.phase!=='playing'||state.awaitingColor)return'';
  if(state.activePenalty&&humanTurn)return en?`Draw ${state.activePenalty.amount} — or answer with a Curse or King`:`למשוך ${state.activePenalty.amount} — או לענות בקללה או במלך`;
  if(state.freePlay&&humanTurn)return en?'Free play — any card':'מהלך חופשי — כל קלף';
  if(state.mustPlayAgain&&humanTurn)return state.players[0].hand.length?(en?'Play again — or draw':'שחקו שוב — או משכו'):(en?'Quickstep cannot finish a hand — draw':'צעד זריז לא יכול לסיים יד — משכו');
  if(eventBanner?.kind==='stop'){const target=state.players.find(p=>p.id===eventBanner.targetId);return eventBanner.targetId==='p0'?(en?'Your turn was skipped':'התור שלכם דולג'):(en?`${displayName(target)} is skipped`:`התור של ${displayName(target)} דולג`);}
  if(eventBanner?.kind==='reverse')return en?'Direction reversed':'כיוון המשחק התהפך';
  if(eventBanner?.kind==='color'&&state.activeColor)return en?`Colour is now ${colorName(state.activeColor)}`:`הצבע עכשיו ${colorName(state.activeColor)}`;
  if(humanTurn&&!state.taki?.open&&!getLegalCards(state,'p0').length)return en?'Nothing matches — draw a card':'אין קלף מתאים — משכו קלף';
  const last=state.players.slice(1).find(player=>player.hand.length===1);
  if(last)return en?`${displayName(last)} is down to the last card`:`ל${displayName(last)} נשאר קלף אחרון`;
  return'';
}
function choiceHTML(){if(state.awaitingColor?.playerId!=='p0')return'';const en=isEnglish();return `<div class="color-choice" role="dialog" aria-modal="true" aria-label="${en?'Choose a colour':'בחירת צבע'}"><div class="gem-ring"><span class="gem-title">${en?'Choose a colour':'בחרו צבע'}</span><div class="gems">${DISPLAY_COLORS.map(c=>`<button class="gem ${c}" data-color="${c}"><i>${colorRuneHTML(c,'gem-rune')}</i><span>${colorName(c)}</span></button>`).join('')}</div></div></div>`;}
function captionHTML(){return settings.captions&&captionLine?`<div class="table-caption" role="status">${captionLine}</div>`:'';}
function roundMarkerHTML(){
  if(session.mode==='quick')return'';
  const en=isEnglish();
  if(session.suddenDeath)return `<div class="round-marker">${en?'Tie · Deciding hand':'שוויון · יד מכרעת'}</div>`;
  return `<div class="round-marker">${session.mode==='duel'?(en?'Duel · ':'דו־קרב · '):''}${en?`Round <bdi>${session.round}</bdi> of <bdi>${session.totalRounds}</bdi>`:`סיבוב <bdi>${session.round}</bdi> מתוך <bdi>${session.totalRounds}</bdi>`}</div>`;
}
const SUIT_ORDER=Object.freeze({red:0,green:1,yellow:2,blue:3,wild:4});
const TYPE_ORDER=Object.freeze({number:0,stop:1,reverse:2,plus:3,plus2:4,taki:5,changeColor:6,superTaki:7,king:8});
// The hand is shown grouped by colour, then number, then action cards, so the
// player can scan it like a real fanned hand. Engine order is untouched.
function sortedHand(hand){return hand.map((card,order)=>({card,order})).sort((a,b)=>(SUIT_ORDER[a.card.color]??5)-(SUIT_ORDER[b.card.color]??5)||(TYPE_ORDER[a.card.type]??9)-(TYPE_ORDER[b.card.type]??9)||(a.card.value??0)-(b.card.value??0)||a.order-b.order).map(item=>item.card);}
function gameHTML(){
  const en=isEnglish(),human=state.players[0],active=currentPlayer(state),opponents=state.players.slice(1,6);
  const isHumanTurn=session.phase==='round'&&state.phase==='playing'&&active.id===human.id&&!state.awaitingColor,legal=new Set(isHumanTurn?getLegalCards(state,human.id).map(c=>c.id):[]),top=topCard(state);
  const under=state.discardPile.slice(-4,-1),fresh=top.id!==lastRenderedTopId;lastRenderedTopId=top.id;
  const shown=sortedHand(human.hand);
  const handCards=shown.map((card,i)=>{const incoming=incomingCardDelays.get(card.id);return cardHTML(card,cardOptions({legal:isHumanTurn&&legal.has(card.id),highlight:settings.playableHints,selected:selected===card.id,incoming:!!incoming,arrivalDelay:incoming?incoming.delay-(performance.now()-incoming.started):0,index:i,total:shown.length}));}).join('');
  const drawSuggested=isHumanTurn&&!state.taki?.open&&legal.size===0;
  const resolvedTopColor=top.type===TYPES.CHANGE_COLOR&&state.awaitingColor?null:state.activeColor,showActiveColor=top.color==='wild'||top.type===TYPES.CHANGE_COLOR||top.type===TYPES.SUPER_TAKI||state.activeColor!==top.color;
  const figures=session.mode==='duel'||(session.mode==='tavern'&&opponents.some(p=>TAVERN_FIGURES.has(p.nameKey)));
  const strip=actionStripText();
  const arrows=`<svg class="direction-ring ${state.direction<0?'counter':''} ${eventBanner?.kind==='reverse'?'lit':''}" viewBox="0 0 300 300" aria-hidden="true"><path class="ring-route" d="M57 181A105 105 0 0 1 226 74"/><path class="ring-head" d="m219 54 9 22-24 4"/><path class="ring-route" d="M243 119A105 105 0 0 1 74 226"/><path class="ring-head" d="m81 246-9-22 24-4"/></svg>`;
  const shellClass=['app-shell','screen-game',`mode-${session.mode}`,`seats-${opponents.length}`,figures?'with-figures':'',isBrammDuel()?'bramm-duel':'',session.suddenDeath?'sudden-death':'',state.phase==='playing'&&state.players.some(p=>p.hand.length===1)?'one-card-tension':'',session.phase!=='round'?'round-complete':'',session.phase!=='round'&&roundResultVisible?'round-over':'',settings.reducedMotion?'reduced-motion':''].filter(Boolean).join(' ');
  return `<main class="${shellClass}" dir="${direction()}" style="--active:${colorHex[state.activeColor]||'#b78b45'}">${worldSceneHTML(session.mode==='duel'?'duel':'game')}<section class="game ${isHumanTurn?'human-turn':'waiting'}">
    <header class="game-head"><button class="icon-button rune-menu" data-open="pause" aria-label="${en?'Pause and menu':'השהיה ותפריט'}"><i></i><i></i><i></i></button>${roundMarkerHTML()}${headScoreHTML()}</header>
    <div class="board" data-speed-bots>
      <div class="seats">${seatsHTML(opponents)}</div>
      <div class="center"><div class="piles">${arrows}
        <button class="pile draw-pile ${drawSuggested?'draw-suggested':''} ${deckSettling?'deck-settling':''}" data-draw data-draw-anchor aria-label="${en?`Draw a card. ${state.drawPile.length} left in the deck`:`למשוך קלף. ${state.drawPile.length} קלפים בחפיסה`}" style="--deck-depth:${Math.min(6,Math.ceil(state.drawPile.length/16))}"><span class="deck-body">${cardHTML(null,cardOptions({hidden:true}))}</span><span class="deck-count"><bdi>${state.drawPile.length}</bdi></span></button>
        <div class="pile discard ${fresh?'fresh':''}" data-discard-anchor style="--pile-turn:${((state.discardPile.length%7)-3)*.7}deg" role="img" aria-label="${en?`Top card: ${cardLabel(top,'en')||top.value}. Colour: ${colorName(state.activeColor)||'any'}`:`הקלף העליון: ${cardLabel(top,'he')||top.value}. צבע: ${colorName(state.activeColor)||'חופשי'}`}"><div class="discard-under">${under.map((card,i)=>`<span class="under under-${i}">${cardHTML(card,cardOptions())}</span>`).join('')}</div>${cardHTML(top,cardOptions({activeColor:resolvedTopColor}))}${showActiveColor&&state.activeColor?`<span class="active-stone ${state.activeColor}" title="${colorName(state.activeColor)}">${colorRuneHTML(state.activeColor,'active-color-rune')}</span>`:''}${statusHTML()}</div>
      </div></div>
      <div class="table-notes">${crossbowHTML()}${strip?`<div class="action-strip" role="status" aria-live="polite">${strip}</div>`:''}${captionHTML()}</div>
      ${summaryHTML()}
      <span class="sr-only" aria-live="polite" aria-atomic="true">${screenReaderLine}</span>
    </div>
    <footer class="hand-area ${isHumanTurn?'your-turn':''}">
      ${playerPlaceHTML(human)}
      ${hint?`<div class="turn-whisper" role="status">${hint}</div>`:''}
      ${quip?.player==='p0'?`<div class="human-quip">${quip.text}</div>`:''}
      <div class="hand-frame"><span class="hand-overflow hand-overflow-start" aria-hidden="true"></span><div class="hand ${state.taki?.open?'taki-active':''}" data-hand-anchor role="group" aria-label="${en?`Your hand, ${cardCountLabel(shown.length)}`:`היד שלכם, ${cardCountLabel(shown.length)}`}">${handCards}</div><span class="hand-overflow hand-overflow-end" aria-hidden="true"></span></div>
    </footer>
  </section>${choiceHTML()}${sheetHTML()}</main>`;
}
/* Round results stay on the table: seats reveal their hands, coins move to
   the winner's seat, and one small tally slip in the middle carries the
   numbers and the continue control. */
function summaryHTML(){
  if(!session||session.phase==='round'||!roundResultVisible)return'';
  const slipEnter=slipShownFor!==session.results.length?'enter':'';slipShownFor=session.results.length;
  const en=isEnglish(),result=session.results.at(-1),winner=session.roster?.find(p=>p.id===result?.winnerId)||state.players.find(p=>p.id===result?.winnerId);
  if(session.mode==='quick'){
    return `<div class="result-slip ${slipEnter} quick-slip" role="dialog" aria-labelledby="result-title"><small>${en?'Hand over':'סוף היד'}</small><h2 id="result-title">${winnerLine(winner,'hand')}</h2><div class="result-actions"><button class="primary-button" data-quick>${en?'Deal again':'יד נוספת'}</button><button class="text-button" data-home>${en?'Leave the table':'לצאת מהשולחן'}</button></div></div>`;
  }
  const scoreRows=standings(session).map((p,i)=>`<li class="${p.id===result.winnerId?'won':''}"><span>${displayName(p)}</span><b><bdi>${p.score}</bdi></b></li>`).join('');
  if(session.phase==='matchFinished'){
    const champion=session.roster.find(p=>p.id===session.championId);
    const title=session.mode==='duel'
      ?(session.championId==='p0'?(en?'You won the Duel':'ניצחתם בדו־קרב'):(en?`${displayName(champion)} won the Duel`:`${displayName(champion)} ${isFeminine(champion)?'ניצחה':'ניצח'} בדו־קרב`))
      :(session.championId==='p0'?(en?'You’re the Tavern Champion!':'אתם אלופי הפונדק!'):(en?`${displayName(champion)} takes the Tavern`:`${displayName(champion)} ${isFeminine(champion)?'אלופת':'אלוף'} הפונדק`));
    const actions=session.mode==='duel'
      ?`<button class="primary-button" data-rematch>${en?'Rematch':'דו־קרב חוזר'}</button><button class="secondary-button" data-choose-opponent>${en?'Another opponent':'יריב אחר'}</button><button class="text-button" data-home>${en?'Leave the table':'לצאת מהשולחן'}</button>`
      :`<button class="primary-button" data-tavern>${en?'Another evening':'ערב נוסף'}</button><button class="text-button" data-home>${en?'Leave the table':'לצאת מהשולחן'}</button>`;
    return `<div class="result-slip ${slipEnter} final-slip ${session.championId==='p0'?'you-won':''}" role="dialog" aria-labelledby="result-title"><small>${session.mode==='duel'?(en?'Final score':'תוצאה סופית'):(en?'End of the evening':'סוף הערב')}</small><h2 id="result-title">${title}</h2><ol class="standings">${scoreRows}</ol><div class="result-actions">${actions}</div></div>`;
  }
  const losers=session.roster.filter(p=>p.id!==result.winnerId);
  const breakdown=losers.map(p=>`<span><small>${displayName(p)}</small><bdi>${result.remaining[p.id]}</bdi></span>`).join('<i aria-hidden="true">+</i>');
  const nextLabel=session.suddenDeath?(en?'Play the deciding hand':'ליד המכרעת'):(en?'Next round':'לסיבוב הבא');
  const kicker=result.suddenDeath?(en?'Deciding hand':'יד מכרעת'):(en?`Round <bdi>${result.round}</bdi> of <bdi>${session.totalRounds}</bdi>`:`סיבוב <bdi>${result.round}</bdi> מתוך <bdi>${session.totalRounds}</bdi>`);
  return `<div class="result-slip ${slipEnter} round-slip" role="dialog" aria-labelledby="result-title"><small>${kicker}</small><h2 id="result-title">${winnerLine(winner)}</h2><div class="tally"><div class="tally-sum">${breakdown}</div><strong class="tally-total"><bdi>+${result.points}</bdi></strong></div>${session.suddenDeath?`<p class="tie-note">${en?'Tied at the top — one more hand decides it.':'שוויון בראש הטבלה — יד אחת נוספת תכריע.'}</p>`:''}<ol class="standings compact">${scoreRows}</ol><div class="result-actions"><button class="primary-button" data-next>${nextLabel}</button><button class="text-button" data-home>${en?'Save and leave':'לשמור ולצאת'}</button></div></div>`;
}
/* ------------------------------ Sheets ------------------------------ */
function sheetFrame(kind,titleId,title,body,{closeLabel}){return `<div class="sheet-wrap ${kind}-wrap" data-sheet-backdrop><article class="tavern-sheet ${kind}-sheet" role="dialog" aria-modal="true" aria-labelledby="${titleId}"><header class="sheet-head"><h2 id="${titleId}">${title}</h2><button class="sheet-close" data-close-sheet aria-label="${closeLabel}"><span aria-hidden="true">×</span></button></header>${body}</article></div>`;}
function quickSheetHTML(){
  const en=isEnglish();
  const body=`<p class="sheet-lede">${en?'One hand, no score. Random faces from the common room.':'יד אחת, בלי ניקוד. זרים מהאולם המשותף.'}</p><div class="field-label" id="players-label">${en?'Players at the table':'שחקנים ליד השולחן'}</div><div class="segmented player-count" role="radiogroup" aria-labelledby="players-label">${[2,3,4,6].map(n=>`<button role="radio" data-players="${n}" aria-checked="${settings.playerCount===n}" class="${settings.playerCount===n?'on':''}"><bdi>${n}</bdi></button>`).join('')}</div><div class="sheet-actions"><button class="primary-button" data-quick>${en?'Deal the cards':'לחלק קלפים'}</button><button class="text-button" data-close-sheet>${en?'Back':'חזרה'}</button></div>`;
  return sheetFrame('quick','quick-title',en?'Quick Play':'משחק מהיר',body,{closeLabel:en?'Close':'לסגור'});
}
function pauseHTML(){
  const en=isEnglish();
  const body=`<p class="sheet-lede">${en?'Nothing moves until you return.':'שום דבר לא זז עד שתחזרו.'}</p><div class="pause-actions"><button class="primary-button" data-close-sheet>${en?'Return to the table':'חזרה לשולחן'}</button><button class="secondary-button" data-pause-nav="rules">${en?'House rules':'חוקי הבית'}</button><button class="secondary-button" data-pause-nav="settings">${en?'Settings':'הגדרות'}</button><button class="text-button" data-home>${en?'Save and leave':'לשמור ולצאת'}</button></div>`;
  return sheetFrame('pause','pause-title',en?'The table waits':'השולחן ממתין',body,{closeLabel:en?'Return to the table':'חזרה לשולחן'});
}
function rulesHTML(){
  const en=isEnglish(),cards=en?[
    ['shield.svg','Shield','The next player loses their turn. In a Duel, you play again.'],
    ['curse-plus-2.svg','Curse','Takes the place of the Two. The next player draws 2 — unless they answer with a Curse (the penalty grows) or a King (it’s cancelled).'],
    ['turnabout.svg','Turnabout','Reverses the order of play. No effect in a Duel.'],
    ['quickstep.svg','Quickstep','Play one more card. It can’t be your last card.'],
    ['crossbow.svg','Crossbow','Loads its colour: keep playing cards of that colour, then Fire. Only the last action card counts.'],
    ['runed-crossbow.svg','Runed Crossbow','A Crossbow in the current colour. Played on a fresh table, you choose the colour.'],
    ['rune.svg','Rune','Play it on anything and choose the colour.'],
    ['king.svg','King','Cancels everything — even a Curse — and gives you a free play of any card.']
  ]:[
    ['shield.svg','מגן','השחקן הבא מפסיד את התור. בדו־קרב משחקים שוב.'],
    ['curse-plus-2.svg','קללה','תופסת את מקומו של ה־2. השחקן הבא לוקח 2 קלפים — אלא אם הוא עונה בקללה (והעונש גדל) או במלך (שמבטל אותו).'],
    ['turnabout.svg','שינוי כיוון','הופך את סדר המשחק. בדו־קרב אין לו השפעה.'],
    ['quickstep.svg','צעד זריז','משחקים קלף נוסף. הוא לא יכול להיות הקלף האחרון.'],
    ['crossbow.svg','קשת','דורכת את הצבע שלה: ממשיכים לשחק קלפים בצבע הזה ואז יורים. רק קלף הפעולה האחרון פועל.'],
    ['runed-crossbow.svg','קשת רונית','קשת בצבע הפעיל. על שולחן חופשי בוחרים את הצבע.'],
    ['rune.svg','רונה','אפשר לשחק אותה על כל קלף ולבחור צבע.'],
    ['king.svg','מלך','מבטל הכול — גם קללה — ומעניק מהלך חופשי עם כל קלף.']
  ];
  const body=`<p class="sheet-lede">${en?'Match the colour, number or symbol. A drawn card waits for your next turn. Empty your hand to win.':'התאימו צבע, מספר או סמל. קלף שנמשך מחכה לתור הבא. מי שמרוקן את היד ראשון — מנצח.'}</p><div class="rule-colours" aria-label="${en?'The four colours':'ארבעת הצבעים'}">${DISPLAY_COLORS.map(c=>`<span class="rule-colour ${c}">${colorRuneHTML(c,'rule-rune')}<b>${colorName(c)}</b></span>`).join('')}</div><div class="rule-grid">${cards.map(([asset,name,line])=>`<section class="rule-card"><img src="./assets/cards/${asset}" alt=""><div><h3>${name}</h3><p>${line}</p></div></section>`).join('')}</div><details class="rule-scoring"><summary>${en?'Match formats and scoring':'מבנה המשחק וניקוד'}</summary><p>${en?'Tavern Match and Duel last five rounds. The winner of each hand scores one point for every card left in the losing hands. A tie after round five is settled by one deciding hand. Quick Play is a single unscored hand for 2, 3, 4 or 6 players.':'משחק פונדק ודו־קרב נמשכים חמישה סיבובים. מנצח היד מקבל נקודה על כל קלף שנשאר בידיים המפסידות. שוויון אחרי הסיבוב החמישי מוכרע ביד אחת נוספת. משחק מהיר הוא יד אחת ללא ניקוד, ל־2, 3, 4 או 6 שחקנים.'}</p></details><div class="sheet-actions"><button class="primary-button" data-close-sheet>${en?'Back to the table':'חזרה'}</button></div>`;
  return sheetFrame('rules','rules-title',en?'House Rules':'חוקי הבית',body,{closeLabel:en?'Close rules':'לסגור את החוקים'});
}
function sheetHTML(){
  if(!sheet)return'';
  if(sheet==='pause')return pauseHTML();
  if(sheet==='rules')return rulesHTML();
  if(sheet==='quick')return quickSheetHTML();
  return settingsHTML();
}
function settingsHTML(){
  const en=isEnglish(),c=en
    ?{title:'Settings',language:'Language',sound:'Sound',gameSounds:'Game sounds',music:'Music',ambience:'Tavern ambience',gameplay:'Table',dialogue:'Character voices & reactions',captions:'Captions',hints:'Highlight playable cards',accessibility:'Comfort',haptics:'Vibration',motion:'Reduce motion',close:'Done',on:'On',off:'Off'}
    :{title:'הגדרות',language:'שפה',sound:'צליל',gameSounds:'צלילי משחק',music:'מוזיקה',ambience:'אווירת פונדק',gameplay:'שולחן',dialogue:'קולות ותגובות של דמויות',captions:'כתוביות',hints:'הדגשת קלפים שאפשר לשחק',accessibility:'נוחות',haptics:'רטט',motion:'צמצום תנועה',close:'סיום',on:'פועל',off:'כבוי'};
  const toggle=(label,key)=>`<div class="setting-row toggle-row"><span class="setting-label" id="setting-${key}">${label}</span><button class="switch ${settings[key]?'on':''}" role="switch" data-toggle="${key}" aria-labelledby="setting-${key}" aria-checked="${!!settings[key]}"><i aria-hidden="true"></i><span class="switch-state">${settings[key]?c.on:c.off}</span></button></div>`;
  const audio=(label,key,volumeKey)=>{const value=Math.round((settings[volumeKey]??0)*100);return `<div class="setting-row audio-row ${settings[key]?'':'muted'}"><span class="setting-label" id="setting-${key}">${label}</span><div class="audio-controls"><input id="volume-${volumeKey}" type="range" min="0" max="100" step="5" value="${value}" style="--value:${value}%" data-volume="${volumeKey}" data-channel="${key}" aria-labelledby="setting-${key}" aria-valuetext="${value}%"><output for="volume-${volumeKey}"><bdi>${value}%</bdi></output><button class="switch ${settings[key]?'on':''}" role="switch" data-toggle="${key}" aria-labelledby="setting-${key}" aria-checked="${!!settings[key]}"><i aria-hidden="true"></i><span class="switch-state">${settings[key]?c.on:c.off}</span></button></div></div>`;};
  const fromPause=view==='game';
  const body=`<div class="setting-row language-row"><span class="setting-label" id="setting-language">${c.language}</span><div class="segmented" role="radiogroup" aria-labelledby="setting-language"><button role="radio" data-language="he" aria-checked="${settings.language==='he'}" class="${settings.language==='he'?'on':''}" lang="he">עברית</button><button role="radio" data-language="en" aria-checked="${settings.language==='en'}" class="${settings.language==='en'?'on':''}" lang="en">English</button></div></div><section class="settings-section"><h3>${c.sound}</h3>${audio(c.gameSounds,'sound','sfxVolume')}${audio(c.music,'music','musicVolume')}${audio(c.ambience,'ambience','ambienceVolume')}</section><section class="settings-section"><h3>${c.gameplay}</h3>${toggle(c.dialogue,'dialogue')}${toggle(c.captions,'captions')}${toggle(c.hints,'playableHints')}</section><section class="settings-section"><h3>${c.accessibility}</h3>${toggle(c.haptics,'haptics')}${toggle(c.motion,'reducedMotion')}</section><div class="sheet-actions"><button class="primary-button" data-close-sheet>${fromPause?(en?'Back':'חזרה'):c.close}</button></div>`;
  return sheetFrame('settings','settings-title',c.title,body,{closeLabel:en?'Close settings':'לסגור את ההגדרות'});
}

let handScrollLeft=0,previousHandRects=new Map();
const handFrame=()=>root.querySelector('.hand-frame');
function captureHandLayout(){const frame=handFrame(),hand=root.querySelector('.hand');if(!frame||!hand)return;handScrollLeft=frame.scrollLeft;previousHandRects=new Map([...hand.querySelectorAll(':scope > .card')].map(card=>[card.dataset.cardId,card.getBoundingClientRect()]));}
function render(){
  captureHandLayout();
  const brammStage=root.querySelector('.bramm-art-stage.bramm-table');
  document.documentElement.lang=settings.language;document.documentElement.dir=direction();
  document.querySelector('meta[name="description"]')?.setAttribute('content',isEnglish()?'RUNES — a card game around a tavern table: Quick Play, a five-round Tavern Match, and Duels with the regulars.':'רונות — משחק קלפים סביב שולחן פונדק: משחק מהיר, משחק פונדק בן חמישה סיבובים ודו־קרב מול הקבועים.');
  root.innerHTML=view==='home'?homeHTML():view==='duelSelect'?duelSelectHTML():gameHTML();
  const placeholder=root.querySelector('[data-bramm-stage-placeholder]');if(brammStage&&placeholder){placeholder.replaceWith(brammStage);syncBrammStage(brammStage);}
  bind();
}
function pauseGameTimers({leaving=false}={}){clearTimeout(botTimer);clearTimeout(brammSlowTimer);clearTimeout(duelIdleTimer);clearTimeout(duelReactionTimer);clearTimeout(eventTimer);clearTimeout(quipTimer);clearTimeout(roundEndTimer);clearBrammTimers();audioSystem.stopVoice({restoreMusic:!leaving});}
function resumeGameTimers(){
  if(eventBanner)eventTimer=setTimeout(()=>{eventBanner=null;captionLine='';render();},settings.reducedMotion?200:900);
  if(quip)quipTimer=setTimeout(()=>{quip=null;render();},1800);
  if(session?.phase!=='round'&&!roundResultVisible)roundEndTimer=setTimeout(revealRoundResult,settings.reducedMotion?80:700);
  scheduleGame();scheduleDuelIdle();
}
function goHome(){flushPendingAction();persist();sessionEpoch++;pauseGameTimers({leaving:true});clearTimeout(deckAudioTimer);audioSystem.stopAmbience();audioSystem.stopMusic(true);view='home';sheet=null;selected=null;render();}
function compactLayout(){return matchMedia('(max-width:599px), (max-height:500px)').matches;}
function updateHandOverflow(){
  const frame=handFrame();if(!frame)return;
  const max=Math.max(0,frame.scrollWidth-frame.clientWidth),browse=frame.classList.contains('browsing')&&max>2;
  root.querySelector('.hand-overflow-start')?.classList.toggle('visible',browse&&frame.scrollLeft>4);
  root.querySelector('.hand-overflow-end')?.classList.toggle('visible',browse&&frame.scrollLeft<max-4);
}
function layoutHand(){
  const frame=handFrame(),hand=root.querySelector('.hand');if(!frame||!hand)return;
  const cards=[...hand.querySelectorAll(':scope > .card')],count=cards.length;
  hand.dataset.cardCount=String(count);if(!count){updateHandOverflow();return;}
  const compact=compactLayout(),cardWidth=cards[0].offsetWidth||96,available=Math.max(cardWidth,frame.clientWidth-16-(compact?0:cardWidth*.3));
  const {browse,overlap,tilt,rise}=calculateHandLayout({count,cardWidth,available,compact});
  hand.dataset.layout=browse?'browse':'fan';frame.classList.toggle('browsing',browse);
  cards.forEach((card,index)=>{const offset=index-(count-1)/2;card.style.setProperty('--overlap',`${overlap.toFixed(1)}px`);card.style.setProperty('--tilt',`${(offset*tilt).toFixed(2)}deg`);card.style.setProperty('--rise',`${(Math.abs(offset)**1.6*rise).toFixed(1)}px`);});
  if(browse){
    frame.scrollLeft=Math.min(handScrollLeft,Math.max(0,frame.scrollWidth-frame.clientWidth));
    // Keep a newly drawn card in view instead of letting it land off-screen.
    const arrived=hand.querySelector('.card.incoming');
    if(arrived){const a=arrived.getBoundingClientRect(),f=frame.getBoundingClientRect();if(a.left<f.left||a.right>f.right)frame.scrollLeft+=a.left<f.left?a.left-f.left-12:a.right-f.right+12;}
  }
  frame.onscroll=updateHandOverflow;updateHandOverflow();
  if(!settings.reducedMotion)cards.forEach(card=>{const before=previousHandRects.get(card.dataset.cardId);if(!before)return;const after=card.getBoundingClientRect(),dx=before.left-after.left;if(Math.abs(dx)>2)card.animate([{translate:`${dx}px 0`},{translate:'0 0'}],{duration:200,easing:'cubic-bezier(.2,.7,.3,1)'});});
  previousHandRects.clear();
}
function focusSheet(){requestAnimationFrame(()=>root.querySelector('.tavern-sheet .primary-button,.sheet-close')?.focus({preventScroll:true}));}
function rejectReason(card){
  const en=isEnglish();
  if(session?.phase!=='round'||state?.phase!=='playing')return en?'The hand is over':'היד הסתיימה';
  if(currentPlayer(state).id!=='p0')return en?'Wait for your turn':'חכו לתור שלכם';
  if(state.activePenalty)return en?'Only a Curse or a King answers a Curse':'רק קללה או מלך עונים לקללה';
  if(state.taki?.open)return en?`The Crossbow takes only ${colorName(state.taki.color)}`:`הקשת דרוכה ל${colorName(state.taki.color)} בלבד`;
  const top=topCard(state),wanted=top.type===TYPES.NUMBER?String(top.value):cardLabel(top,settings.language),color=colorName(state.activeColor);
  if(!color)return en?'That card doesn’t match':'הקלף הזה לא מתאים';
  return en?`Needs ${color} or ${wanted}`:`צריך ${color} או ${wanted}`;
}
function bind(){
  root.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{sheet=b.dataset.open;if(sheet==='pause')pauseGameTimers();render();focusSheet();});
  root.querySelectorAll('[data-close-sheet]').forEach(b=>b.onclick=closeSheet);
  root.querySelectorAll('[data-pause-nav]').forEach(b=>b.onclick=()=>{sheet=b.dataset.pauseNav;render();focusSheet();});
  root.querySelector('[data-sheet-backdrop]')?.addEventListener('click',event=>{if(event.target===event.currentTarget)closeSheet();});
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
    const apply=()=>{settings[input.dataset.volume]=Number(input.value)/100;input.style.setProperty('--value',`${input.value}%`);input.setAttribute('aria-valuetext',`${input.value}%`);input.closest('.audio-row')?.querySelector('output bdi')?.replaceChildren(`${input.value}%`);saveSettings(settings);audioSystem.setSettings(settings);if(input.dataset.channel==='ambience'&&settings.ambience)audioSystem.startAmbience();if(input.dataset.channel==='music'&&settings.music)audioSystem.startMusic();};
    input.oninput=apply;
    input.onchange=()=>{apply();if(input.dataset.channel==='sound'&&settings.sound)audioSystem.play('cardPlaySoft');};
  });
  root.querySelectorAll('[data-players]').forEach(b=>b.onclick=()=>{settings.playerCount=+b.dataset.players;saveSettings(settings);render();root.querySelector(`[data-players="${b.dataset.players}"]`)?.focus({preventScroll:true});});
  root.querySelector('[data-duel]')?.addEventListener('click',()=>{view='duelSelect';sheet=null;render();void preloadBrammExpressions();});
  root.querySelectorAll('[data-opponent]').forEach(b=>b.onclick=async()=>{settings.duelOpponent=b.dataset.opponent;saveSettings(settings);clearMatch();b.classList.add('loading');b.setAttribute('aria-busy','true');try{await startSession('duel');}catch(error){console.error('Unable to prepare duel assets',error);b.classList.remove('loading');b.setAttribute('aria-busy','false');}});
  root.querySelector('[data-tavern]')?.addEventListener('click',()=>{clearMatch();startSession('tavern');});
  root.querySelector('[data-quick]')?.addEventListener('click',()=>{clearMatch();startSession('quick');});
  root.querySelector('[data-resume]')?.addEventListener('click',()=>{const saved=loadMatch();startSession(saved?.mode||'tavern',saved);});
  root.querySelector('[data-next]')?.addEventListener('click',startNextHand);
  root.querySelector('[data-rematch]')?.addEventListener('click',()=>{clearMatch();startSession('duel');});
  root.querySelector('[data-choose-opponent]')?.addEventListener('click',()=>{clearMatch();goHome();view='duelSelect';render();});
  root.querySelectorAll('[data-home]').forEach(b=>b.onclick=goHome);
  root.querySelector('[data-draw]')?.addEventListener('click',()=>{if(state?.phase==='playing'&&currentPlayer(state).id==='p0'&&!state.taki?.open)submit({type:ACTIONS.DRAW,playerId:'p0'});else if(state?.taki?.open&&currentPlayer(state).id==='p0'){hint=isEnglish()?'Fire the Crossbow to end your turn':'כדי לסיים את התור — לירות בקשת';render();setTimeout(()=>{hint='';render();},1400);}});
  root.querySelector('[data-close-taki]')?.addEventListener('click',()=>submit({type:ACTIONS.END_TURN,playerId:'p0'}));
  root.querySelector('[data-speed-bots]')?.addEventListener('pointerdown',event=>{if(!pendingBotTurn||event.target.closest('button,.card,[role="dialog"]'))return;clearTimeout(botTimer);const pending=pendingBotTurn;runBotTurn(pending.playerId,pending.epoch,pending.scheduledTurn);});
  root.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>submit({type:ACTIONS.CHOOSE_COLOR,playerId:'p0',color:b.dataset.color}));
  bindHand();
  root.onclick=event=>{if(selected&&!event.target.closest('.hand .card')){selected=null;root.querySelectorAll('.hand .card.selected').forEach(card=>{card.classList.remove('selected');card.setAttribute('aria-pressed','false');});}};
  const firstGem=root.querySelector('.color-choice .gem');if(firstGem&&!root.contains(document.activeElement)||firstGem&&document.activeElement===document.body)firstGem.focus({preventScroll:true});
  layoutHand();
  if(view==='game'&&roundResultVisible&&session?.phase!=='round'){animateCoinsToWinner();const slip=root.querySelector('.result-slip.enter .primary-button');if(slip&&!sheet)slip.focus({preventScroll:true});}
}
function bindHand(){
  const twoStepPlay=matchMedia('(hover:none) and (pointer:coarse)').matches;
  let hintTimer=0;
  const rejectCard=card=>{hint=rejectReason(state.players[0].hand.find(c=>c.id===card.dataset.cardId));feedback('invalid',settings);render();clearTimeout(hintTimer);hintTimer=setTimeout(()=>{hint='';render();},1300);};
  const selectCard=card=>{selected=card.dataset.cardId;root.querySelectorAll('.hand .card.selected').forEach(node=>{node.classList.remove('selected');node.setAttribute('aria-pressed','false');});card.classList.add('selected');card.setAttribute('aria-pressed','true');};
  root.querySelectorAll('.hand .card').forEach(card=>{
    const legal=card.classList.contains('legal'),play=()=>{if(legal)submit({type:ACTIONS.PLAY,playerId:'p0',cardId:card.dataset.cardId});};
    let startX=0,startY=0,lastY=0,lastTime=0,velocity=0,dragging=false,suppressClick=false;
    card.onclick=e=>{if(suppressClick){suppressClick=false;e.preventDefault();return;}if(!legal){rejectCard(card);return;}if(!twoStepPlay||selected===card.dataset.cardId)play();else selectCard(card);};
    card.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();card.click();}};
    if(!legal)return;
    // Cards allow native horizontal panning (touch-action:pan-x) so the hand
    // scrolls under the finger; only a deliberate upward drag lifts a card.
    card.onpointerdown=e=>{startX=e.clientX;startY=lastY=e.clientY;lastTime=e.timeStamp;velocity=0;dragging=false;suppressClick=false;};
    card.onpointermove=e=>{
      if(e.buttons===0&&e.pointerType==='mouse')return;
      const dx=e.clientX-startX,dy=e.clientY-startY;
      if(!dragging){if(dy>-12||Math.abs(dx)>Math.abs(dy))return;dragging=true;card.setPointerCapture?.(e.pointerId);card.classList.add('dragging');}
      velocity=(lastY-e.clientY)/Math.max(1,e.timeStamp-lastTime);lastY=e.clientY;lastTime=e.timeStamp;
      card.style.setProperty('--drag',`${Math.min(0,dy)}px`);
    };
    const finish=(e,cancelled)=>{
      if(!dragging)return;dragging=false;suppressClick=true;card.classList.remove('dragging');card.style.removeProperty('--drag');
      if(card.hasPointerCapture?.(e.pointerId))card.releasePointerCapture(e.pointerId);
      const dy=e.clientY-startY;if(!cancelled&&(dy<-60||(dy<-24&&velocity>.35)))play();
    };
    card.onpointerup=e=>finish(e,false);
    card.onpointercancel=e=>finish(e,true);
  });
}
function closeSheet(){const opener=sheet;sheet=view==='game'&&['rules','settings'].includes(opener)?'pause':null;if(view==='home'){audioSystem.stopAmbience();audioSystem.stopMusic();}render();if(opener==='pause')resumeGameTimers();requestAnimationFrame(()=>root.querySelector(`[data-open="${opener}"]`)?.focus({preventScroll:true}));}
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseGameTimers();else if(view==='game'&&!sheet)resumeGameTimers();});
document.addEventListener('keydown',event=>{if(!sheet)return;if(event.key==='Escape'){event.preventDefault();closeSheet();return;}if(event.key!=='Tab')return;const dialog=root.querySelector('[role="dialog"]');if(!dialog)return;const focusable=[...dialog.querySelectorAll('button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])')];if(!focusable.length)return;const first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}});

if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
function registerWebMCP(){const context=document.modelContext;if(!context?.registerTool)return;try{void Promise.resolve(context.registerTool({name:'read_game_state',title:'Read RUNES game',description:'Read the current RUNES match status.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute(){return session?{mode:session.mode,phase:session.phase,round:session.round,totalRounds:session.totalRounds,suddenDeath:session.suddenDeath,scores:session.scores,currentPlayer:currentPlayer(state).name,activeColor:state.activeColor,humanCardCount:state.players[0].hand.length,opponents:state.players.slice(1).map(p=>({name:p.name,cardCount:p.hand.length}))}:{phase:'home'};}})).catch(()=>{});}catch{}}
// Read-only snapshot for automated playtests and support; it exposes no controls.
window.RunesQA=Object.freeze({snapshot:()=>({view,sheet,motionLocked,pendingAction:!!pendingAction,pendingBotTurn:!!pendingBotTurn,roundResultVisible,selected,hint,sessionPhase:session?.phase||null,turn:state?.turn??null,current:state?currentPlayer(state).id:null,blockAiUntil:Math.max(0,blockAiUntil-Date.now())})});
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
