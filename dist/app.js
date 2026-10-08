import { ACTIONS, crossbowAwaitsPickup, currentPlayer, getLegalCards, topCard } from './game-engine/engine.js';
import { COLORS, TYPES } from './game-engine/cards.js';
import { VOICED_GUEST_KEYS, createDuelSession, createQuickSession, createTavernMatch, finishRound, restoreSession, standings, startNextRound } from './game-engine/match.js';
import { LocalGameTransport } from './platform/transport.js';
import { clearMatch, feedback, loadMatch, loadSettings, saveMatch, saveSettings, tapFeedback } from './platform/storage.js';
import { audioSystem } from './platform/audio.js';
import { chooseBotAction, chooseColor, lastBotDecision } from './game-ai/bot.js';
import { cardHTML, cardLabel, sigilHTML } from './ui/card.js';
import { runeSVG } from './ui/runes.js';
import { calculateHandLayout } from './ui/hand-layout.js';
import { DUEL_OPPONENTS, duelSpriteStyle, getDuelOpponent, localizeDuelOpponent } from './duel/opponents.js';
import { AUTHORED_CHARACTERS, VOICED_OPPONENTS, authoredCharacter, resolveCharacterVoice } from './duel/characters.js';
import { debugMarkEdrinVoiceMissing, edrinEventFor } from './duel/edrin.js';
import { RAGNA_DOUBLE_LINES, debugMarkRagnaVoiceMissing, ragnaEventFor } from './duel/ragna.js';
import { debugMarkKeshVoiceMissing, keshDebugMissingVoices, keshDecisionIsMajor, keshEventFor, keshExpressionURL, keshTellFor, keshUnrecorded } from './duel/kesh.js';
import { allTavernVoices, createTavernDirector } from './duel/tavern-director.js';
import { duelEventFor } from './duel/authored-pack.js';
import { createVeyraOmenBook, debugMarkVeyraVoiceMissing, veyraDebugMissingVoices, veyraOmenEvent, VEYRA_ENGLISH_ONLY } from './duel/veyra.js';
import { debugMarkGorvanVoiceMissing } from './duel/gorvan.js';

const root=document.querySelector('#app');
// iOS home-screen web apps can leave the document scrolled (after rotation, the
// keyboard or a focus change), sliding the whole game up under the clock with a
// black band below. The page is position:fixed in CSS; if anything still moves it,
// put it straight back.
function pinPage(){if(scrollX||scrollY)scrollTo(0,0);if(document.scrollingElement&&(document.scrollingElement.scrollTop||document.scrollingElement.scrollLeft)){document.scrollingElement.scrollTop=0;document.scrollingElement.scrollLeft=0;}}
for(const type of ['scroll','resize','orientationchange','pageshow'])addEventListener(type,()=>{pinPage();setTimeout(pinPage,300);},{passive:true});
window.visualViewport?.addEventListener('resize',pinPage,{passive:true});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(pinPage,60);});
const APP_VERSION=new URL(import.meta.url).searchParams.get('v')||'dev';
// Player-facing order of the four colours: Burgundy, Forest, Gold, Slate.
const DISPLAY_COLORS=Object.freeze(['red','green','yellow','blue']);
// The four inks live in styles.css (:root, and .hc-cards for High Card Contrast).
const colorHex={red:'var(--red)',blue:'var(--blue)',green:'var(--green)',yellow:'var(--yellow)'};
let settings=loadSettings(),session=null,state=null,transport=null,view='home',sheet=null,hint='',selected=null;
const isPaused=()=>view==='game'&&(Boolean(sheet)||document.hidden);
const isEnglish=()=>settings.language==='en';
const direction=()=>isEnglish()?'ltr':'rtl';
const colorNames={he:{red:'בורדו',blue:'צפחה',green:'יער',yellow:'זהב'},en:{red:'Burgundy',blue:'Slate',green:'Forest',yellow:'Gold'}};
const archetypeNames={he:{hunter:'הציידת',bard:'הפייטן',mercenary:'שכיר החרב',wanderer:'הנודד',scholar:'המלומד',mysterious:'הסוחר',traveler:'הנוסע'},en:{hunter:'The Hunter',bard:'The Bard',mercenary:'The Mercenary',wanderer:'The Wanderer',scholar:'The Scholar',mysterious:'The Trader',traveler:'The Traveler'}};
const playerNames={you:'You',ragna:'Ragna',edrin:'Edrin',veyra:'Veyra',gorvan:'Gorvan',ויירה:'Veyra',גורבן:'Gorvan',aila:'Aila',ron:'Ron',bran:'Bran',sela:'Sela',kesh:'Kesh',roderic:'Roderic',lio:'Lio',mograth:'Mograth',harrow:'Harrow',rusk:'Rusk',bramm:'Bramm',adren:'Adren',myra:'Myra',toren:'Toren',leva:'Leva',sig:'Sig',alva:'Alva',hal:'Hal',runa:'Runa',derik:'Derik',lucien:'Lucien',inigo:'Inigo',lydia:'Lydia',viren:'Viren',soren:'Soren',waylin:'Waylin',אתם:'You',איילה:'Aila',רון:'Ron',בראן:'Bran',אדרן:'Adren',מירא:'Myra',טורן:'Toren',ליבה:'Leva',סיג:'Sig',אלבה:'Alva',האל:'Hal',רונה:'Runa',דריק:'Derik',לוסיאן:'Lucien',איניגו:'Inigo',לידיה:'Lydia',וירן:'Viren',סורן:'Soren',ויילין:'Waylin'};
function colorName(color){return colorNames[settings.language]?.[color]||colorNames.he[color]||'';}
function colorRuneHTML(color,className='color-rune'){return runeSVG(color,className);}

function displayName(player){if(!player)return'';if(player.id==='p0')return isEnglish()?'You':player.name;if(!isEnglish())return player.name;const key=player.nameKey||player.duelOpponentId;return key?(playerNames[key]||localizeDuelOpponent(getDuelOpponent(key),'en')?.name||player.name):(playerNames[player.name]||player.name);}
function displayOpponent(opponent){return localizeDuelOpponent(opponent,settings.language);}
function cardOptions(options={}){return {...options,language:settings.language};}
let botTimer=null,eventTimer=null,quipTimer=null,roundEndTimer=null,duelReactionTimer=null,duelIdleTimer=null,deckAudioTimer=null,characterSlowTimer=null,musicRestoreTimer=null,eventBanner=null,quip=null,duelReaction='idle',lastDuelReactionAt=0,lastLogLength=0,lastCounts={},lastHands={},lastQuipAt=0,takiRun=0,lastRenderedTopId=null,sessionEpoch=0,roundResultVisible=false,landingCards=new Map(),propRattled=new Set(),screenReaderLine='',captionLine='',characterCaptionLine='',characterCaptionLocale='en',blockAiUntil=0,motionLocked=false,pendingAction=null,deckSettling=false,characterController=null,characterExpression='01_default_smug',characterPreviousExpression='01_default_smug',characterExpressionTimer=null,characterSwapTimer=null,characterSequenceTimers=[],characterControllerFor=null,edrinConsideredTurn=null,pendingBotTurn=null;
const dialogueHe={
  hunter:{skip:['אה, לא. תורך.','לאן אתה חושב שאתה הולך?','שב.'],penalty:['ארבעה?!','זה מסלים מהר.','אני רואה שבחרנו באלימות.'],reverse:['חוזר אליך.','הסתובבו השולחנות.'],last:['כולם עליו.','עוד לא ניצחת.'],king:['הכתר החליט.','טוב. זה משנה דברים.']},
  bard:{skip:['בחייך.','זה היה מיותר לחלוטין.'],penalty:['אה. נפלא.','בשלב הזה פשוט תן לי את הקופה.'],reverse:['תרתי משמע.','שינוי בתוכניות.'],last:['זה נהיה מעניין.','אל תחייך עדיין.'],king:['קשה להתווכח עם כתר.','בחירה אמיצה.']},
  mercenary:{skip:['אני אזכור את זה.','את זה אני מחזיר לך.'],penalty:['יש גבול.','נקמה מוגשת עם קלפים.'],reverse:['חוזר אליך.','חשבתי שנפטרתי ממך.'],last:['מישהו יעצור אותו?','לא טוב.'],king:['זה יעלה לך.','הכתר החליט.']},
  // Rusk the trader. Kesh's sayings (wind, fire, roads, signs) belong to Kesh alone (duel/kesh.js).
  mysterious:{skip:['רשמתי.','זה יעלה לך.'],penalty:['עסקה גרועה.','מישהו ישלם על זה.'],reverse:['הממ.','אוזניים למעלה.'],last:['שימו עין.','העסקה כמעט נסגרה.'],king:['קלף יקר.','מעניין.']},
  scholar:{skip:['מעניין.','זה חוקי. בדקתי.'],penalty:['כנראה שאין גבול.','אני דורש נבואה חדשה.'],reverse:['זה לא היה חלק מהנבואה.','הכוכבים לא הזהירו אותי מזה.'],last:['אני רואה את הסוף.','כל כך קרוב.'],king:['זה מרגיש כמו קסם קדום.','בטוח שזה לא קסם אפל?']}
};
const dialogueEn={
  hunter:{skip:['Oh, no. Your turn.','Where d’you think you’re going?','Sit.'],penalty:['Four?!','That escalated quickly.','So we’ve chosen violence.'],reverse:['Back to you.','The tables have turned.'],last:['Everyone on them.','You haven’t won yet.'],king:['The crown has spoken.','Well. That changes things.']},
  bard:{skip:['Come on.','That was entirely unnecessary.'],penalty:['Ah. Wonderful.','At this point, just give me the pot.'],reverse:['Quite literally.','Change of plans.'],last:['This is getting interesting.','Don’t smile yet.'],king:['Hard to argue with a crown.','Bold choice.']},
  mercenary:{skip:['I’ll remember that.','I’ll return the favour.'],penalty:['There is a limit.','Revenge is served with cards.'],reverse:['Back to you.','I thought I was rid of you.'],last:['Will someone stop them?','Not good.'],king:['That’ll cost you.','The crown has spoken.']},
  mysterious:{skip:['Noted.','That will cost you.'],penalty:['Bad trade.','Someone will pay for that.'],reverse:['Hm.','Ears up.'],last:['Watch that one.','Nearly a done deal.'],king:['Expensive card.','Interesting.']},
  scholar:{skip:['Interesting.','It is legal. I checked.'],penalty:['Apparently there is no limit.','I demand a new prophecy.'],reverse:['That was not in the prophecy.','The stars did not warn me.'],last:['I can see the end.','So close.'],king:['This feels like ancient magic.','Sure that isn’t dark magic?']}
};
const tavernBanterHe=['יפה.','לא רע.','באמת?','כמובן.','ידעתי.','נו באמת.','זה היה אישי.','טעות.','בחירה מפוקפקת.','יש לך מזל.','עוד לא סיימתי.','היית חייב?','אני צריך עוד משקה.','הקלפים שונאים אותי.','מרשים. מעצבן, אבל מרשים.','שקט. אני חושב.','יש לי תוכנית.','לא הייתה לי תוכנית.','בדיוק לפי התוכנית.'];
const tavernBanterEn=['Nicely done.','Not bad.','Really?','Of course.','I knew it.','Come on.','That was personal.','A mistake.','Questionable choice.','Lucky.','I’m not done.','Did you have to?','I need another drink.','The cards hate me.','Impressive. Annoying, but impressive.','Quiet. I’m thinking.','I’ve got a plan.','I didn’t have a plan.','Exactly as planned.'];

function persist(){if(session){if(isAuthoredDuel()&&characterController)session.characterPersonality=characterController.snapshot();if(tavernGuests)session.tavernDirector=tavernGuests.director.snapshot();if(veyraOmens)session.veyraOmens=veyraOmens.snapshot();saveMatch(session);}}
function currentDuelOpponent(){return displayOpponent(getDuelOpponent(session?.opponentId||settings.duelOpponent));}
// One framework for every authored duel character (Bramm, Edrin): the pack in
// duel/characters.js says what differs; staging, bubbles and voice are shared.
const authoredPack=()=>session?.mode==='duel'?authoredCharacter(session.opponentId):null;
const isAuthoredDuel=()=>!!authoredPack();
const isBrammDuel=()=>authoredPack()?.id==='bramm';
const isEdrinDuel=()=>authoredPack()?.id==='edrin';
const isRagnaDuel=()=>authoredPack()?.id==='ragna';
const isKeshDuel=()=>authoredPack()?.id==='kesh';
// Data-driven packs (Veyra, Gorvan): one generic Duel dispatch, no per-character branch.
const isGenericDuel=()=>!!authoredPack()?.generic;
const isVeyraDuel=()=>authoredPack()?.id==='veyra';
const isGorvanDuel=()=>authoredPack()?.id==='gorvan';
// Voiced guests at a Tavern table (duel/tavern-director.js): their seats and faces,
// and ONE table-wide director deciding whether anybody speaks. Null when no guest sits.
let tavernGuests=null,tavernIdleTimer=null;
// v105: the ordinary regulars' table chatter after a plain card (was 0.1).
const TABLE_BANTER_CHANCE=.18;
// v105: when a Shield skips you, a seal slams down over your hand for a moment ("Blocked").
// Re-renders rebuild the DOM, so the animation is resumed from its start time, not restarted.
const SHIELD_BLOCK_MS=1700;
let shieldBlock=null,shieldBlockTimer=null;
function startShieldBlock(by){clearTimeout(shieldBlockTimer);shieldBlock={by:by||null,at:performance.now()};const epoch=sessionEpoch;shieldBlockTimer=setTimeout(()=>{if(epoch!==sessionEpoch)return;shieldBlock=null;if(view==='game'&&!motionLocked)render();},settings.reducedMotion?1200:SHIELD_BLOCK_MS);}
function shieldBlockHTML(){
  if(!shieldBlock)return'';const elapsed=performance.now()-shieldBlock.at;if(elapsed>SHIELD_BLOCK_MS+50)return'';
  const en=isEnglish(),by=state.players.find(p=>p.id===shieldBlock.by),name=by&&by.id!=='p0'?displayName(by):'';
  const title=en?'Blocked':'נחסמתם',sub=name?(en?`${name}’s Shield`:`המגן של ${name}`):(en?'Shield':'מגן');
  return `<div class="shield-block" aria-hidden="true"><span class="shield-block-seal"></span><span class="shield-block-label"><b>${title}</b><small>${sub}</small></span></div>`;
}
const isVoicedGuest=player=>!!player&&VOICED_GUEST_KEYS.includes(player.nameKey);
const guestSeatOf=id=>tavernGuests?Object.keys(tavernGuests.seats).find(seat=>tavernGuests.seats[seat].id===id)||null:null;
const guestsMuted=()=>settings.tavernGuestMode==='off'||!settings.dialogue;
// The rune-stone tell is decided together with his real decision, before he plays.
// `keshTellPending`: he consulted the stone before his last move and the table has
// not answered yet. `keshPenaltyOnHuman`: the player faced a Curse when they acted.
let keshPlan=null,keshTellPending=false,keshPenaltyOnHuman=false;
const keshTellMemory={turnsSince:99,thisRound:0,toldThisRound:false};
function resetKeshTellMemory(round=false){keshPlan=null;keshTellPending=false;keshPenaltyOnHuman=false;keshTellMemory.thisRound=0;keshTellMemory.toldThisRound=false;if(!round)keshTellMemory.turnsSince=99;}
const keshSeatId=()=>isKeshDuel()?'p1':guestSeatOf('kesh');
// Veyra's omen book: one per match, wherever she sits (the Duel stage or a Tavern seat).
// Presentation only — it reads public events and never touches the game.
let veyraOmens=null,veyraOmensFor=null;
const veyraSeatId=()=>isVeyraDuel()?'p1':guestSeatOf('veyra');
const gorvanSeatId=()=>isGorvanDuel()?'p1':guestSeatOf('gorvan');
function setupVeyraOmens(){const seat=veyraSeatId();if(!seat){veyraOmens=null;veyraOmensFor=null;return;}const key=`${session.mode}:${session.seed}`;if(veyraOmens&&veyraOmensFor===key)return;veyraOmens=createVeyraOmenBook({mode:session.mode==='duel'?'duel':'tavern',now:activeNow,initial:session.veyraOmens||null});veyraOmensFor=key;}
// Whether a Curse was waiting when the last update began (a King that follows breaks it).
let tablePenaltyBefore=false,penaltyOnHumanBefore=false;
// Gorvan's sound accents: when each last played, so none ever repeats or stacks.
const gorvanSfx={curseAt:-Infinity,accentHand:-1,pulseAt:-Infinity,pulsed:new Set(),entranceAt:-Infinity,tavernEntrance:false};
// Ragna owns a mistake only when her own planner knowingly took a second-best card.
let ragnaSlip=false,ragnaStakesRaised=false;
// Gameplay time only: paused sheets and a hidden tab never count as "quiet".
let activeClockTotal=0,activeClockSince=null;
const activeNow=()=>activeClockTotal+(activeClockSince===null?0:performance.now()-activeClockSince);
function runActiveClock(on){if(on&&activeClockSince===null)activeClockSince=performance.now();else if(!on&&activeClockSince!==null){activeClockTotal+=performance.now()-activeClockSince;activeClockSince=null;}}
let characterSpeaking=null;
function clearCharacterTimers(){clearTimeout(characterExpressionTimer);clearTimeout(characterSwapTimer);clearTimeout(characterSlowTimer);for(const timer of characterSequenceTimers)clearTimeout(timer);characterSequenceTimers=[];characterCaptionLine='';characterSpeaking=null;}
function restingExpression(pack=authoredPack()){return characterController?.defaultExpression()||pack?.defaultExpression||'01_default_smug';}
function setCharacterExpression(expression,duration=0){const pack=authoredPack();if(!pack)return;if(!pack.expressions.includes(expression))expression=restingExpression(pack);characterPreviousExpression=characterExpression;characterExpression=expression;clearTimeout(characterExpressionTimer);clearTimeout(characterSwapTimer);render();characterSwapTimer=setTimeout(()=>{characterPreviousExpression=characterExpression;root.querySelector('.character-art-stage.character-table')?.classList.remove('is-changing');},settings.reducedMotion?0:150);if(duration>0){const epoch=sessionEpoch;characterExpressionTimer=setTimeout(()=>{if(epoch!==sessionEpoch||!characterController||characterSpeaking)return;characterPreviousExpression=characterExpression;characterExpression=restingExpression();characterCaptionLine='';render();},settings.reducedMotion?Math.min(duration,900):duration);}}
// Shared performance order: localized transcript → mapped expression → voice →
// bubble → hold through the line → hide bubble → settle back to baseline.
function performCharacterReaction(reaction,{voiceDelay=0}={}){
  const pack=authoredPack();if(!reaction||!pack)return null;
  // A result line owns the stage: nothing lesser replaces its face or bubble, and
  // a gameplay line still waiting on its lead beat is dropped once the hand is over.
  if(reaction.priority!=='CRITICAL'&&(characterSpeaking?.priority==='CRITICAL'||session?.phase!=='round'))return null;
  const localized=pack.resolveReaction(reaction,settings.language);
  setCharacterExpression(localized.expression);characterCaptionLine=localized.caption||'';characterCaptionLocale=localized.locale;characterSpeaking=localized.caption||localized.voice?{priority:localized.priority,id:localized.id}:null;const speaking=characterSpeaking;render();
  // A result line is a moment: the character leans in over the table rail for a beat.
  if(localized.category==='result'&&!settings.reducedMotion){const stage=root.querySelector('.character-art-stage.character-table');if(stage)stage.animate([{transform:'none'},{transform:'translateY(-1.8%) scale(1.008)',offset:.35},{transform:'translateY(-1.8%) scale(1.008)',offset:.7},{transform:'none'}],{duration:2400,easing:'ease-in-out'});}
  const epoch=sessionEpoch,finish=()=>{if(epoch!==sessionEpoch)return;const timer=setTimeout(()=>{if(epoch!==sessionEpoch)return;
    // Another line (a result) has taken the stage since: it owns the face and the bubble now.
    if(speaking&&characterSpeaking!==speaking)return;characterSpeaking=null;if(!pack.holdsExpression(characterController)){characterPreviousExpression=characterExpression;characterExpression=restingExpression(pack);}characterCaptionLine='';render();if(!localized.followUp)retryVeyraHit();},settings.reducedMotion?180:650);characterSequenceTimers.push(timer);if(localized.followUp)scheduleFollowUp(localized.followUp,epoch);},play=()=>{if(epoch!==sessionEpoch||!isAuthoredDuel())return;if(localized.voice){void speakCharacterVoice(localized,{locked:localized.category==='result',onEnded:finish}).then(node=>{if(!node){const timer=setTimeout(finish,localized.duration||2400);characterSequenceTimers.push(timer);}});}else{const timer=setTimeout(finish,localized.duration||1800);characterSequenceTimers.push(timer);}render();};
  if(voiceDelay){const timer=setTimeout(play,settings.reducedMotion?80:voiceDelay);characterSequenceTimers.push(timer);}else play();
  return localized;
}
// The one in-game voice path for every authored character, at a Duel or a Tavern
// table: Web Audio game sound, never a media element (no Now Playing, no takeover).
function speakCharacterVoice(localized,{locked=false,onEnded=null}={}){audioSystem.setSettings(settings);return audioSystem.playVoice(localized.voice,{locale:localized.locale,priority:localized.priority,locked,onEnded});}
// A two-beat authored gag (Ragna: "QUIET! THERE'S A GAME ON!" … "Thank you.") is one
// performance, not two triggers: the callback skips cooldowns but never talks over anyone.
function scheduleFollowUp(followUp,epoch){const timer=setTimeout(()=>{if(epoch!==sessionEpoch||view!=='game'||isPaused()||session?.phase!=='round'||characterSpeaking||audioSystem.voiceSource||!characterController)return;const next=characterController.force(followUp.id);if(next)performCharacterReaction(next);},(settings.reducedMotion?200:650)+(followUp.delay||0));characterSequenceTimers.push(timer);}
const VOICE_RANK=Object.freeze({LOW:1,MEDIUM:2,HIGH:3,CRITICAL:4});
function runCharacter(trigger,context={},force=false){
  const pack=authoredPack();if(view!=='game'||isPaused()||!pack||!characterController)return null;
  const busyRank=Math.max(audioSystem.voiceSource?audioSystem.voicePriority:0,characterSpeaking?VOICE_RANK[characterSpeaking.priority]||1:0);
  const visual=characterController.observe(trigger,context);
  // A face may react silently, but never over a line that is still being spoken.
  if(visual&&!characterSpeaking)setCharacterExpression(visual.expression,visual.duration);
  const reaction=characterController.react(trigger,{...context,locale:settings.language,busyRank},force);if(!reaction)return visual;
  settings.characterRecentVoices={...(settings.characterRecentVoices||{}),[pack.id]:characterController.snapshot().recentVoices};if(pack.id==='bramm')settings.brammRecentVoices=settings.characterRecentVoices.bramm;saveSettings(settings);
  // A result never cuts a line off mid-word: it waits for the voice to finish (a moment at most).
  if(reaction.category==='result'&&audioSystem.voiceSource&&audioSystem.voicePriority<VOICE_RANK.CRITICAL){const epoch=sessionEpoch,started=performance.now(),wait=()=>{if(epoch!==sessionEpoch)return;if(audioSystem.voiceSource&&performance.now()-started<2600){const timer=setTimeout(wait,120);characterSequenceTimers.push(timer);return;}performCharacterReaction(reaction);};wait();return reaction;}
  const lead=pack.lead(trigger,reaction);
  if(lead?.delay){if(lead.expression&&(!characterSpeaking||reaction.priority==='CRITICAL'))setCharacterExpression(lead.expression,lead.hold||0);const epoch=sessionEpoch,timer=setTimeout(()=>{if(epoch===sessionEpoch)performCharacterReaction(reaction);},settings.reducedMotion?120:lead.delay);characterSequenceTimers.push(timer);return reaction;}
  return performCharacterReaction(reaction,{voiceDelay:lead?.voiceDelay||0});
}
function characterArtHTML(opponent,{context='table'}={}){const pack=authoredCharacter(opponent?.id);if(!pack)return `<i class="duel-sprite sheet-${opponent?.sheet||'a'}" style="${duelSpriteStyle(opponent,context==='table'?duelReaction:'idle')}"></i>`;if(context==='table'&&root.querySelector(`.character-art-stage.character-table[data-character="${pack.id}"]`))return '<span data-character-stage-placeholder></span>';const expression=context==='table'&&pack.expressions.includes(characterExpression)?characterExpression:pack.defaultExpression;return `<span class="character-art-stage character-${context} character-${pack.id}" data-character="${pack.id}"><img class="character-art character-art-current" src="${pack.expressionURL(expression)}" alt="" draggable="false" onerror="this.onerror=null;this.src='${pack.expressionURL(pack.defaultExpression)}'"></span>`;}
function syncCharacterStage(stage){const pack=authoredPack();if(!stage||!pack)return;const current=stage.querySelector('.character-art-current'),currentURL=pack.expressionURL(pack.expressions.includes(characterExpression)?characterExpression:pack.defaultExpression);
  // Only a new face fades in. The stage is re-inserted on every render, so an always-on animation would replay (and dim the figure) every turn.
  if(current&&current.src!==currentURL){current.src=currentURL;if(!settings.reducedMotion)current.animate([{opacity:.75},{opacity:1}],{duration:200,easing:'ease-out'});}stage.classList.remove('is-changing');}
function scheduleDuelIdle(){clearTimeout(duelIdleTimer);if(view!=='game'||isPaused()||session?.mode!=='duel'||session.phase!=='round')return;const opponent=currentDuelOpponent(),epoch=sessionEpoch;duelIdleTimer=setTimeout(()=>{if(epoch!==sessionEpoch||view!=='game'||isPaused()||session?.mode!=='duel'||session.phase!=='round'||eventBanner)return scheduleDuelIdle();const pack=authoredPack();if(pack){const cards=state.players.map(p=>p.hand.length),ahead=cards[1]<=cards[0],concerned=cards[0]===1,quiet=state.phase==='playing'&&!concerned&&!motionLocked&&!audioSystem.voiceSource&&!characterCaptionLine&&!characterSpeaking;let spoke=false;if(quiet)for(const [trigger,context] of pack.idleTriggers({ahead})){if(runCharacter(trigger,{...context,playerOnOneCard:concerned})?.voice){spoke=true;break;}}if(!spoke&&!characterSpeaking){const beat=pack.idleFallback(characterController,{ahead,concerned,omen:veyraOmens?.active||null});if(beat)setCharacterExpression(beat.expression,settings.reducedMotion?Math.min(1400,beat.duration):beat.duration);}}else setDuelReaction('drink',opponent.dialoguePools.drink.at(Math.floor(Math.random()*opponent.dialoguePools.drink.length)),true);scheduleDuelIdle();},opponent.idleFrequency+Math.random()*9000);}
function setDuelReaction(kind,text=null,force=false){if(session?.mode!=='duel'||isAuthoredDuel())return;const opponent=currentDuelOpponent(),weight=opponent.reactionWeights[kind]??1;if(!force&&(Date.now()-lastDuelReactionAt<4200||Math.random()>weight))return;lastDuelReactionAt=Date.now();duelReaction=kind;clearTimeout(duelReactionTimer);if(text)showQuip('p1',text,force);render();const epoch=sessionEpoch;duelReactionTimer=setTimeout(()=>{if(epoch!==sessionEpoch)return;duelReaction='idle';render();scheduleDuelIdle();},settings.reducedMotion?350:1100+Math.random()*1200);}
function duelLine(kind){const pool=currentDuelOpponent().dialoguePools[kind]||[];return pool[Math.floor(Math.random()*pool.length)];}
function recordDuelResult(){if(session?.mode!=='duel'||session.phase!=='matchFinished'||session.recorded)return;const id=session.opponentId,record=settings.duelRecords?.[id]||{played:0,won:0};settings.duelRecords={...(settings.duelRecords||{}),[id]:{played:record.played+1,won:record.won+(session.championId==='p0'?1:0)}};session.recorded=true;saveSettings(settings);}
function setSession(next){
  sessionEpoch++;clearTimeout(eventTimer);clearTimeout(quipTimer);clearTimeout(roundEndTimer);clearTimeout(duelReactionTimer);clearTimeout(duelIdleTimer);clearCharacterTimers();audioSystem.stopVoice();
  quip=null;duelReaction='idle';captionLine='';roundResultVisible=next.phase!=='round';session=next;state=session.game;ragnaSlip=false;
  const pack=authoredPack();
  setupTavernGuests();setupVeyraOmens();keshPlan=null;keshTellPending=false;
  if(pack){if(!characterController||characterControllerFor!==pack.id){characterController=pack.createController({initial:next.characterPersonality||next.brammPersonality||null,settings,now:pack.activeClock?activeNow:undefined});characterControllerFor=pack.id;}characterExpression=characterController.defaultExpression();characterPreviousExpression=characterExpression;}else{characterController=null;characterControllerFor=null;characterExpression='01_default_smug';characterPreviousExpression=characterExpression;}
  transport?.disconnect();transport=new LocalGameTransport(state);lastLogLength=state.log.length;lastCounts=Object.fromEntries(state.players.map(p=>[p.id,p.hand.length]));lastHands=Object.fromEntries(state.players.map(p=>[p.id,p.hand.map(card=>card.id)]));lastRenderedTopId=null;landingCards.clear();propRattled.clear();eventBanner=null;shieldBlock=null;clearTimeout(shieldBlockTimer);
  transport.subscribeToState((nextState,action)=>{
    state=nextState;session.game=nextState;
    try{onState(action);}catch(error){console.error('Non-blocking game presentation error',error);screenReaderLine='';captionLine='';}
    if(nextState.phase==='finished'&&session.phase==='round'){
      session=finishRound(session);const opponentWon=session.results.at(-1)?.winnerId==='p1',finalDuel=session.mode==='duel'&&session.phase==='matchFinished';
      // An omen still open when the hand ends simply lapses (the result line owns this moment).
      veyraOmens?.endRound();
      // An authored character speaks exactly one result line, chosen from the real match state:
      // round win / round loss while the match continues, match win / match loss at the end.
      if(isBrammDuel()&&finalDuel){
        const humanScore=session.scores?.p0||0,brammScore=session.scores?.p1||0,spread=Math.abs(brammScore-humanScore),snapshot=characterController.snapshot();
        if(opponentWon)runCharacter('win',{close:spread<=3,crushing:spread>=12,wasBehind:snapshot.flags.bramm_was_previously_behind,survivedOneCard:snapshot.flags.bramm_survived_one_card_scare},true);
        else runCharacter('match_loss',{},true);
      }else if(isBrammDuel())runCharacter(opponentWon?'round_win':'round_loss',{},true);
      else if(isEdrinDuel())runCharacter(finalDuel?(opponentWon?'match_win':'match_loss'):(opponentWon?'round_win':'round_loss'),{},true);
      else if(isRagnaDuel()){
        // Ragna: the match result replaces the round result, never both. "That's it?" leans on easy wins.
        const points=session.results.at(-1)?.points||0,spread=Math.abs((session.scores?.p1||0)-(session.scores?.p0||0));
        runCharacter(finalDuel?(opponentWon?'match_win':'match_loss'):(opponentWon?'round_win':'round_loss'),finalDuel?{close:spread<=6}:{easy:opponentWon&&points>=8,close:!opponentWon&&points<=2},true);
      }
      else if(isKeshDuel()){
        // Kesh: one result line, round or match, never both. "I misread that one." is earned by a hand where he consulted the stone.
        const points=session.results.at(-1)?.points||0,spread=Math.abs((session.scores?.p1||0)-(session.scores?.p0||0));
        runCharacter(finalDuel?(opponentWon?'match_win':'match_loss'):(opponentWon?'round_win':'round_loss'),{close:finalDuel?spread<=6:points<=3,told:keshTellMemory.toldThisRound},true);
      }
      else if(isGenericDuel()){
        // Veyra, Gorvan: one result line, round or match, never both, from the real match state.
        // Veyra's lines lean on her omens: "Unless losing was the sign." after signs that failed her.
        const points=session.results.at(-1)?.points||0,spread=Math.abs((session.scores?.p1||0)-(session.scores?.p0||0)),lead=(session.scores?.p1||0)>(session.scores?.p0||0);
        runCharacter(finalDuel?(opponentWon?'match_win':'match_loss'):(opponentWon?'round_win':'round_loss'),{close:finalDuel?spread<=6:points<=3,lead,...(veyraOmens?.story()||{})},true);
      }
      else if(session.mode==='duel'){setDuelReaction(opponentWon?'pleased':'annoyed',duelLine(opponentWon?'pleased':'annoyed'),true);}
      else if(session.mode==='tavern'&&tavernGuests){const result=session.results.at(-1);tavernEvent(session.phase==='matchFinished'?'match_end':'round_end',session.phase==='matchFinished'?{champion:session.championId}:{winner:result?.winnerId});}
      roundResultVisible=false;const epoch=sessionEpoch,authoredBeat=isAuthoredDuel()&&finalDuel?authoredPack().finalResultBeat:0;
      audioSystem.duckMusic(.08,240);
      roundEndTimer=setTimeout(()=>{if(epoch!==sessionEpoch)return;revealRoundResult();},settings.reducedMotion?(authoredBeat?900:120):(authoredBeat||1050));
    }
    noteKeshTable();persist();render();scheduleGame();
  });scheduleDuelIdle();
}
let coinsAnimatedFor=-1;
function revealRoundResult(){roundResultVisible=true;recordDuelResult();feedback('round',settings);persist();render();}
function startNextHand(){
  feedback('shuffle',settings);deckSettling=true;if(isAuthoredDuel())characterController?.beginRound();resetKeshTellMemory(true);veyraOmens?.beginRound();veyraPendingHit=null;veyraCursers.clear();gorvanSfx.pulsed.clear();
  setSession(startNextRound(session));blockAiUntil=Date.now()+1300;if(tavernGuests){tavernGuests.director.beginRound();for(const seat of Object.keys(tavernGuests.seats))setGuestFace(seat,null);}
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
  const timer=setTimeout(()=>{if(epoch===sessionEpoch)feedback('coin',settings);},620+sources.length*110);characterSequenceTimers.push(timer);
}
function beginDeckArrival(){
  audioSystem.setSettings(settings);audioSystem.play('shuffle');clearTimeout(deckAudioTimer);
  deckAudioTimer=setTimeout(()=>{audioSystem.play('deckPutDown');deckSettling=false;root.querySelector('[data-draw-anchor]')?.classList.remove('deck-settling');},1050);
}
// Expressions decode before a character sits down, but a slow or failed asset never
// holds the table hostage: after a few seconds the match starts anyway and any
// missing face falls back to the character's default.
const preloadWithin=(promise,ms=5000)=>Promise.race([promise.catch(()=>null),new Promise(resolve=>setTimeout(resolve,ms))]);
// Voices warm in the background: the introductions first (the first line must never hitch), then
// the rest a few at a time, so a phone is not asked to fetch and decode fifty files at once.
async function warmVoices(names){const language=settings.language,first=names.filter(name=>/_intro_|_title_0/.test(name)),rest=names.filter(name=>!first.includes(name));await audioSystem.preloadVoice(language,first);for(let i=0;i<rest.length;i+=6){if(settings.language!==language)return;await audioSystem.preloadVoice(language,rest.slice(i,i+6));}}
async function startSession(mode='tavern',saved=null,{guests=null}={}){
  characterController=null;tavernGuests=null;veyraOmens=null;veyraOmensFor=null;veyraPendingHit=null;veyraCursers.clear();resetKeshTellMemory();clearCharacterTimers();
  const fresh=()=>mode==='tavern'?createTavernMatch({seed:Date.now(),guestMode:settings.tavernGuestMode,guests}):mode==='duel'?createDuelSession({seed:Date.now(),opponent:getDuelOpponent(settings.duelOpponent)}):createQuickSession({playerCount:settings.playerCount,seed:Date.now()});
  let next;try{next=saved?restoreSession(saved):fresh();}catch{clearMatch();next=fresh();}
  // Expressions decode before the character sits down; voices warm in the background.
  if(next.mode==='duel'&&authoredCharacter(next.opponentId))await preloadWithin(authoredCharacter(next.opponentId).preload());
  // Voiced Tavern guests: faces decode before they sit down; their Tavern lines warm in the background.
  const tavernGuestIds=next.mode==='tavern'?[...new Set((next.roster||next.game?.players||[]).filter(isVoicedGuest).map(p=>p.nameKey))]:[];
  if(tavernGuestIds.length)await preloadWithin(Promise.all(tavernGuestIds.map(id=>AUTHORED_CHARACTERS[id].preload())));
  setSession(next);if(!saved)blockAiUntil=Date.now()+1300;
  view='game';sheet=null;eventBanner=null;audioSystem.setSettings(settings);if(settings.ambience)audioSystem.startAmbience();if(settings.music)audioSystem.startMusic({newRound:true});deckSettling=!saved;render();if(!saved)beginDeckArrival();runActiveClock(true);if(tavernGuestIds.length){void warmVoices(tavernGuestIds.flatMap(allTavernVoices));if(!saved){const epoch=sessionEpoch,timer=setTimeout(()=>{if(epoch===sessionEpoch)tavernEvent('intro',{});},settings.reducedMotion?500:1900);characterSequenceTimers.push(timer);
  // Gorvan at a Tavern table: his presence cue once an app session, never at every table.
  if(tavernGuestIds.includes('gorvan')&&!gorvanSfx.tavernEntrance){gorvanSfx.tavernEntrance=true;audioSystem.play('gorvanEntrance',{delay:settings.reducedMotion?150:1150,volume:.8});}}scheduleTavernIdle();}const pack=authoredPack();if(pack){void warmVoices(Object.keys(pack.voiceLibrary));
// Every new match against Bramm opens with his voiced introduction. Edrin says one
// line the first time you meet him; after that he may just glance up, or not.
if(!saved){const epoch=sessionEpoch,firstEncounter=!settings.charactersMet?.[pack.id];
  // Gorvan: one restrained presence cue as he sits down (not on a restore, not again on a quick rematch);
  // and on a later meeting, now and then, he corrects the house's "Lord" — a little more tiredly each time.
  const sting=pack.id==='gorvan'&&performance.now()-gorvanSfx.entranceAt>480000,titleStep=pack.id==='gorvan'&&!firstEncounter&&(settings.gorvanTitleStep||0)<4&&Math.random()<.35?(settings.gorvanTitleStep||0)+1:0;
  if(sting){gorvanSfx.entranceAt=performance.now();audioSystem.play('gorvanEntrance',{delay:settings.reducedMotion?150:1100});}
  const timer=setTimeout(()=>{if(epoch!==sessionEpoch)return;if(isBrammDuel())runCharacter('intro',{},true);else{const spoken=runCharacter('intro',{firstEncounter,titleStep,raised:isRagnaDuel()&&ragnaStakesRaised},true);ragnaStakesRaised=false;settings.charactersMet={...(settings.charactersMet||{}),[pack.id]:true};if(titleStep&&String(spoken?.id||'').startsWith('title_'))settings.gorvanTitleStep=titleStep;saveSettings(settings);}},settings.reducedMotion?350:pack.introDelay+(sting?900:0));characterSequenceTimers.push(timer);}}scheduleGame();scheduleDuelIdle();
}
function commitAction(action){const beforeTurn=state?.turn,beforeTop=state?topCard(state)?.id:null;if(action.type===ACTIONS.DRAW&&action.playerId==='p0')blockAiUntil=Date.now()+500;try{transport.submitAction(action);selected=null;}catch(error){const advanced=!!state&&(state.turn!==beforeTurn||topCard(state)?.id!==beforeTop);console.error('Game action or update failed',error);hint=advanced?'':(isEnglish()?'You cannot play that card now':'אי אפשר לשחק את הקלף הזה עכשיו');if(!advanced)feedback('invalid',settings);render();if(advanced)scheduleGame();else setTimeout(()=>{hint='';render();},850);}}
function submit(action){
  if(motionLocked)return;
  if(![ACTIONS.PLAY,ACTIONS.DRAW].includes(action.type)||state?.phase!=='playing'){commitAction(action);return;}
  motionLocked=true;
  const pending={action,committed:false};pendingAction=pending;
  // Your own draw is committed first so the card can travel to the exact slot it will occupy in your sorted hand.
  (action.type===ACTIONS.DRAW&&action.playerId==='p0'?prepareHumanDraw():animateCardMovement(action)).catch(error=>console.error('Card movement animation failed',error)).finally(()=>{if(pending.committed)return;pending.committed=true;pendingAction=null;motionLocked=false;commitAction(action);});
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
const motionReduced=()=>settings.reducedMotion||matchMedia('(prefers-reduced-motion: reduce)').matches;
function handAnchor(playerId){
  return root.querySelector(`[data-player-id="${playerId}"] [data-hand-anchor] i:last-child`)||root.querySelector(`[data-player-id="${playerId}"] [data-hand-anchor]`);
}
// Card movement is a card sliding over wood: it leaves quickly, keeps its
// momentum, and drags to a stop on the pile with a small, final turn. No arcs,
// no overshoot.
function animateOneCard({source,destination,card,mode,duration,delay=0,index=0,trajectory='play'}){
  if(motionReduced()||!source||!destination)return new Promise(resolve=>setTimeout(resolve,90+delay));
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
  const draw=action.type===ACTIONS.DRAW,card=draw?null:player.hand.find(item=>item.id===action.cardId);// draws here are opponents' (yours: prepareHumanDraw)
  const source=draw?root.querySelector('[data-draw-anchor]'):(action.playerId==='p0'?root.querySelector(`.hand [data-card-id="${action.cardId}"]`):handAnchor(action.playerId)),destination=draw?handAnchor(action.playerId):root.querySelector('[data-discard-anchor]');
  // Opponent cards turn face-up during travel and reach the discard face-up.
  // pile after landing. This avoids mobile 3D clipping and face flashes.
  const mode=draw?'back':action.playerId!=='p0'?'flip':'front';
  const count=draw?Math.min(state.activePenalty?.amount||1,8):1,duration=draw?380:action.playerId==='p0'?340:480;
  audioSystem.setSettings(settings);
  if(draw)await reshuffleIfEmpty(source);
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
// An empty deck is gathered and squared from the discard before anyone can draw from it.
async function reshuffleIfEmpty(deck){
  if(state.drawPile.length||state.discardPile.length<=1)return;
  deck?.classList.add('deck-settling');audioSystem.play('shuffle');
  await new Promise(resolve=>setTimeout(resolve,1050));
  deck?.classList.remove('deck-settling');audioSystem.play('deckPutDown');
}
async function prepareHumanDraw(){
  audioSystem.setSettings(settings);await reshuffleIfEmpty(root.querySelector('[data-draw-anchor]'));
  audioSystem.play((state.activePenalty?.amount||1)>1?'drawMultiple':'cardDraw',{delay:70});
}
// Deck → drawn card → your hand. The hand has already opened the card's sorted slot (FLIP in layoutHand);
// a proxy leaves the deck face-down, turns face-up on the way, and settles exactly into that slot, at its tilt
// and lighting, before the real card takes its place. Several cards (a Curse) follow one another.
function flyLandingCards(){
  if(view!=='game'||!landingCards.size)return;
  const deck=root.querySelector('[data-draw-anchor] .card'),reduce=motionReduced()||!deck;let index=0,last=0;
  for(const [id,entry] of landingCards){
    if(entry.launched)continue;
    const target=root.querySelector(`.hand [data-card-id="${id}"]`),card=state.players[0].hand.find(item=>item.id===id);
    if(!target||!card){landingCards.delete(id);continue;}
    entry.launched=true;
    const land=()=>{if(landingCards.get(id)!==entry)return;landingCards.delete(id);root.querySelector(`.hand [data-card-id="${id}"]`)?.classList.remove('landing');};
    if(reduce){land();target.animate([{opacity:0},{opacity:1}],{duration:180,easing:'ease-out'});continue;}
    const delay=index++*110;last=delay+FLIGHT_MS;flyToHand(deck,target,card,delay).then(land);
  }
  if(last)blockAiUntil=Math.max(blockAiUntil,Date.now()+last+120);
}
const FLIGHT_MS=460;
function flyToHand(deck,target,card,delay){
  const t=target.getBoundingClientRect(),d=deck.getBoundingClientRect(),w=target.offsetWidth,h=target.offsetHeight;
  // A slot scrolled out of view in a long hand: the card tucks in at the hand's edge instead of sailing off-screen.
  const f=root.querySelector('.hand-frame')?.getBoundingClientRect(),cx=t.left+t.width/2,edge=f?Math.min(Math.max(cx,f.left+w*.35),f.right-w*.35):cx,tuck=Math.abs(edge-cx)>2;
  const left=edge-w/2,top=t.top+t.height/2-h/2,dx=d.left+d.width/2-(left+w/2),dy=d.top+d.height/2-(top+h/2),from=deck.offsetWidth/w;
  const tilt=parseFloat(target.style.getPropertyValue('--tilt'))||0,lit=getComputedStyle(target).filter;
  const proxy=document.createElement('div');proxy.className='travelling-card reveal';proxy.setAttribute('aria-hidden','true');
  proxy.innerHTML=`<div class="travelling-inner"><div class="travelling-back"><span>${sigilHTML()}</span></div><div class="travelling-front">${cardHTML(card,cardOptions({highlight:false}))}</div></div>`;
  Object.assign(proxy.style,{left:`${left}px`,top:`${top}px`,width:`${w}px`,height:`${h}px`,visibility:'hidden'});proxy.style.setProperty('--proxy-w',`${w}px`);
  document.body.append(proxy);
  const inner=proxy.querySelector('.travelling-inner'),front=proxy.querySelector('.travelling-front'),timing={duration:FLIGHT_MS,delay,fill:'both'};
  // Leaves the deck at the deck's angle, rises a touch as it turns over, and drags to a stop in the slot.
  const flight=proxy.animate([
    {transform:`translate(${dx}px,${dy}px) rotate(-2.5deg) scale(${from})`,filter:'none'},
    {transform:`translate(${dx*.45}px,${dy*.45-h*.08}px) rotate(${tilt*.5-1}deg) scale(${(from+1)/2*1.05})`,filter:'none',opacity:1,offset:.45},
    {transform:`rotate(${tilt}deg)`,filter:lit==='none'?'none':lit,opacity:tuck?0:1}
  ],{...timing,easing:'cubic-bezier(.3,.6,.25,1)'});
  // The turn is a 2D squeeze (no 3D backface), so no WebKit build can flash or clip it.
  inner.animate([{transform:'scaleX(1)'},{transform:'scaleX(1)',offset:.22},{transform:'scaleX(.02)',offset:.46},{transform:'scaleX(1)',offset:.7}],timing);
  front.animate([{opacity:0},{opacity:0,offset:.46},{opacity:1,offset:.46},{opacity:1}],timing);
  proxy.style.visibility='';
  return flight.finished.catch(()=>{}).then(()=>{requestAnimationFrame(()=>proxy.remove());});
}
function showEvent(kind,playerId=null,amount=null,cardId=null){clearTimeout(eventTimer);eventBanner={kind,playerId,targetId:playerId,amount,cardId,at:performance.now()};const epoch=sessionEpoch;eventTimer=setTimeout(()=>{if(epoch!==sessionEpoch)return;eventBanner=null;captionLine='';if(view==='game'&&!motionLocked)render();},settings.reducedMotion?300:1100);}
const FEMININE_HE=[['אני צריך','אני צריכה'],['אני חושב','אני חושבת'],['אני מחזיר','אני מחזירה']];
function voicedLine(playerId,text){if(!text||isEnglish()||!isFeminine(state?.players?.find(p=>p.id===playerId)))return text;return FEMININE_HE.reduce((line,[m,f])=>line.replace(m,f),text);}
function showQuip(player,text,force=false){text=voicedLine(player,text);if(!player||!settings.dialogue||!text||(!force&&Date.now()-lastQuipAt<(tavernGuests?16000:7800)))return;
  // With voiced guests at the table the ordinary regulars' text quips come half as often: the table stays readable.
  // A voiced guest owns the moment: no generic quip cuts across their line or bubble.
  if(tavernGuests&&(audioSystem.voiceSource||tavernGuests.speaking||tavernGuests.seats[quip?.player]))return;lastQuipAt=Date.now();clearTimeout(quipTimer);quip={player,text};quipTimer=setTimeout(()=>{quip=null;render();},Math.min(2800,1500+text.length*42));}
function botLine(playerId,trigger){const player=state.players.find(p=>p.id===playerId);if(isVoicedGuest(player))return null;const pool=(isEnglish()?dialogueEn:dialogueHe)[player?.archetype]?.[trigger]||[];return pool[Math.floor(Math.random()*pool.length)];}
// Game-event haptics use the full vibration pattern where the browser has one (Android).
// iPhone haptics come only from the player's own taps (tapFeedback), the one moment iOS allows.
function eventFeedback(kind){if(typeof navigator.vibrate==='function')feedback(kind,settings);}
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
    const curseHold=entries.find(x=>x.type==='curseHold');if(curseHold)return curseHold.playerId==='p0'?`Not won yet — ${names[curseHold.nextId]} can return the Curse`:`${names[curseHold.playerId]} is out — unless the Curse comes back`;
    const leftOpen=entries.find(x=>x.type==='crossbowLeftOpen');if(leftOpen)return leftOpen.nextId==='p0'?'The Crossbow is open for you':`The Crossbow is open for ${names[leftOpen.nextId]}`;
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
  const curseHold=entries.find(x=>x.type==='curseHold');if(curseHold)return curseHold.playerId==='p0'?`עוד לא ניצחתם — ל${names[curseHold.nextId]} יש קללה להחזיר`:`ל${names[curseHold.playerId]} נגמרו הקלפים — אלא אם הקללה תחזור`;
  const leftOpen=entries.find(x=>x.type==='crossbowLeftOpen');if(leftOpen)return leftOpen.nextId==='p0'?'הקשת נשארה פתוחה בשבילכם':`הקשת נשארה פתוחה ל${names[leftOpen.nextId]}`;
  if(entries.some(x=>x.type==='takiOpened'))return'הקשת דרוכה';
  if(entries.some(x=>x.type==='takiClosed'))return'הקשת נורתה';
  if(entries.some(x=>x.type==='playAgain')){const id=currentPlayer(state).id;return id==='p0'?'שחקו שוב':`${names[id]} ${verb(id,'משחק','משחקת')} שוב`;}
  if(color)return`הצבע עכשיו ${colorName(color.color)}`;
  if(stack)return`הקללה עלתה ל־+${stack.amount}`;
  if(play){const card=state.discardPile.find(c=>c.id===play.cardId),label=card?(card.type===TYPES.NUMBER?`${card.value} ${colorName(card.color)}`:cardLabel(card,'he')):'קלף';return play.playerId==='p0'?`שיחקתם ${label}`:`${names[play.playerId]} ${verb(play.playerId,'שיחק','שיחקה')} ${label}`;}
  return'';
}
const CHARACTER_GENDER={ragna:'f',edrin:'m',veyra:'f',gorvan:'m',aila:'f',sela:'f',ron:'f',bran:'f',kesh:'m',roderic:'m',lio:'m',mograth:'m',harrow:'m',rusk:'m',bramm:'m'};
function isFeminine(player){if(!player)return false;const known=player.gender||CHARACTER_GENDER[player.nameKey||player.duelOpponentId];if(known)return known==='f';return(['hunter','scholar'].includes(player.archetype)||['איילה','לידיה','סֶלָה','מירא','ליבה','אלבה','רונה'].includes(player.name));}
function winnerLine(player,unit='round'){if(!player)return'';const hand=unit==='hand';if(isEnglish())return player.id==='p0'?(hand?'You won the hand':'You won the round'):`${displayName(player)} won the ${hand?'hand':'round'}`;if(player.id==='p0')return hand?'ניצחתם ביד':'ניצחתם בסיבוב';return`${player.name} ${isFeminine(player)?'ניצחה':'ניצח'} ${hand?'ביד':'בסיבוב'}`;}
function onState(action){
  const previousCounts={...lastCounts};
  const entries=state.log.slice(lastLogLength);lastLogLength=state.log.length;
  const latest=entries.at(-1),stop=entries.find(e=>e.type==='stop'),reverse=entries.find(e=>e.type==='reverse'),again=entries.find(e=>e.type==='playAgain'),penalty=entries.find(e=>e.type==='drawPenalty'),color=entries.find(e=>e.type==='color'),closed=entries.find(e=>e.type==='takiClosed'),opened=entries.find(e=>e.type==='takiOpened'),draw=entries.find(e=>e.type==='draw');
  const played=entries.findLast?.(e=>e.type==='play');const playedCard=played?state.discardPile.find(c=>c.id===played.cardId):null;
  // A card that joins your hand keeps its sorted slot empty until it has travelled there from the deck (flyLandingCards).
  for(const player of state.players){const old=new Set(lastHands[player.id]||[]);if(player.id==='p0')for(const card of player.hand)if(!old.has(card.id))landingCards.set(card.id,{launched:false});lastHands[player.id]=player.hand.map(card=>card.id);lastCounts[player.id]=player.hand.length;}
  if(reverse&&state.players.length>2)ringTurnAt=performance.now();
  screenReaderLine=announce(entries);captionLine=screenReaderLine;
  const stack=entries.find(e=>e.type==='plus2');
  if(stop&&stop.skipped==='p0')startShieldBlock(played?.playerId);
  if(stop)showEvent('stop',stop.skipped,null,played?.cardId);else if(closed&&opened)showEvent('takiCycle',opened.playerId,null,played?.cardId);else if(closed)showEvent('takiClose',closed.playerId,null,played?.cardId);else if(opened)showEvent('takiOpen',opened.playerId,null,played?.cardId);else if(penalty)showEvent('penalty',penalty.playerId,penalty.amount);else if(draw)showEvent('draw',draw.playerId,draw.amount||1);else if(reverse)showEvent('reverse',played?.playerId,null,played?.cardId);else if(again)showEvent('plus',played?.playerId,null,played?.cardId);else if(stack)showEvent('plus2',stack.playerId,stack.amount,played?.cardId);else if(color)showEvent('color',color.playerId,null,played?.cardId);else if(playedCard?.type===TYPES.KING)showEvent('king',played.playerId,null,played.cardId);else if(played)showEvent('play',played.playerId,null,played.cardId);
  audioSystem.setSettings(settings);
  const effectDelay=played?45:0;
  if(closed&&opened){audioSystem.play('takiOpen',{delay:effectDelay});audioSystem.play('takiClose',{delay:effectDelay+250});}
  else if(closed)audioSystem.play('takiClose',{delay:effectDelay});
  else if(opened)audioSystem.play('takiOpen',{delay:effectDelay});
  if(stop)audioSystem.play('stopSkip',{delay:effectDelay});
  if(reverse)audioSystem.play('reverse',{delay:effectDelay});
  if(stack)audioSystem.play('plusCard',{delay:effectDelay});
  if(again)audioSystem.play('quickstepPlay',{delay:effectDelay});
  if(playedCard?.type===TYPES.KING)audioSystem.play('kingPlay',{delay:effectDelay});
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
  if(closed||opened)eventFeedback('takiOpen',settings);else if(stop)eventFeedback('stop',settings);else if(reverse)eventFeedback('reverse',settings);else if(stack||penalty)eventFeedback('penalty',settings);else if(playedCard?.type===TYPES.KING)eventFeedback('king',settings);else if(again)eventFeedback('plus',settings);else if(draw||action.type===ACTIONS.DRAW)eventFeedback('draw',settings);else if(color)eventFeedback('color',settings);else if(entries.length)eventFeedback('play',settings);
  if(penalty?.amount>=6){propRattled.add(penalty.playerId);const epoch=sessionEpoch;setTimeout(()=>{if(epoch!==sessionEpoch)return;propRattled.delete(penalty.playerId);root.querySelector(`[data-player-id="${penalty.playerId}"]`)?.classList.remove('rattled');},520);}
  if(state.taki?.open)takiRun++;const crossbowRun=takiRun;
  // Voiced Tavern guests speak only their own allowlisted lines, and only one voice owns a moment.
  // Veyra's omen book reads the same public update, at a Duel or a Tavern table (even the winning card).
  const omenOutcome=veyraOmens?observeVeyraOmen({played,playedCard,stop,stack,penalty,draw,reverse,closed,previousCounts}):null;
  gorvanAccents({played,playedCard,stack,stop,previousCounts,effectDelay});
  const keshSpoke=tavernGuests&&state.phase!=='finished'?tavernObserve({played,playedCard,stop,stack,penalty,draw,reverse,closed,crossbowRun,previousCounts,omenOutcome}):false;
  if(tavernGuests&&!keshSpoke&&state.phase==='playing')maybeDeclareVeyraOmen();
  if(closed){if(takiRun>=3&&!isAuthoredDuel()&&!keshSpoke){const watcher=state.players.find(p=>p.kind==='ai'&&p.id!==closed.playerId&&!isVoicedGuest(p));showQuip(watcher?.id,botLine(watcher?.id,'penalty'));}takiRun=0;}
  // Generic table banter never plays over an authored character.
  if(!isAuthoredDuel()&&!keshSpoke){
    if(stop)showQuip(stop.skipped,botLine(stop.skipped,'skip'));
    else if(penalty&&penalty.amount>=4)showQuip(penalty.playerId,botLine(penalty.playerId,'penalty'));
    else if(reverse){const speaker=state.players.find(p=>p.kind==='ai'&&!isVoicedGuest(p));showQuip(speaker?.id,botLine(speaker?.id,'reverse'));}
    else if(playedCard?.type===TYPES.KING){const speaker=state.players.find(p=>p.kind==='ai'&&p.id!==played.playerId&&!isVoicedGuest(p));showQuip(speaker?.id,botLine(speaker?.id,'king'));}
    else if(played){const one=state.players.find(p=>p.hand.length===1&&p.id===played.playerId),speaker=state.players.find(p=>p.kind==='ai'&&p.id!==played.playerId&&!isVoicedGuest(p));if(one)showQuip(speaker?.id,botLine(speaker?.id,'last'),true);else if(Math.random()<TABLE_BANTER_CHANCE){const banter=isEnglish()?tavernBanterEn:tavernBanterHe;showQuip(speaker?.id,banter[Math.floor(Math.random()*banter.length)]);}}
  }
  if(session.mode==='duel'){
    const humanMove=played?.playerId==='p0',opponentMove=played?.playerId==='p1';
    if(isBrammDuel()&&state.phase!=='finished'){
      const humanCount=state.players[0].hand.length,brammCount=state.players[1].hand.length,oldHuman=previousCounts.p0??humanCount;
      if(humanCount<brammCount)characterController.setFlag('bramm_was_previously_behind');else if(brammCount<humanCount)characterController.setFlag('bramm_was_previously_ahead');
      if(oldHuman>1&&humanCount===1){
        runCharacter('player_one_card',{brammCards:brammCount},true);const epoch=sessionEpoch;
        for(const wait of [9500]){const timer=setTimeout(()=>{if(epoch===sessionEpoch&&state?.phase==='playing'&&state.players[0]?.hand.length===1)runCharacter('one_card_persist');},settings.reducedMotion?Math.min(wait,1800):wait);characterSequenceTimers.push(timer);}
      }else if(oldHuman===1&&humanCount>1){const relief=characterController.oneCardRecovered();if(relief)performCharacterReaction(relief);}
      else if((penalty?.playerId==='p1'&&penalty.amount>=4)||stop?.skipped==='p1')runCharacter('setback');
      else if((draw?.playerId==='p1'||penalty?.playerId==='p1')&&humanCount===1)runCharacter('one_card_persist');
      else if((draw?.playerId==='p1'||penalty?.playerId==='p1'))runCharacter('bramm_draw',{amount:(draw||penalty)?.amount||1});
      else if(draw?.playerId==='p0'||penalty?.playerId==='p0')runCharacter('player_draw',{amount:(draw||penalty)?.amount||1});
      else if(humanMove&&(reverse||opened||stack||stop||playedCard?.type===TYPES.KING))runCharacter('player_good_move');
      else if(opponentMove&&(reverse||opened||stack||stop||playedCard?.type===TYPES.KING||brammCount===1))runCharacter('bramm_good_move');
      else if(humanMove)runCharacter('player_neutral_move');
    }else if(isEdrinDuel()&&state.phase!=='finished'){
      // Edrin: one trigger per table update. His face carries most of it; the
      // controller decides (rarely) whether he also says something.
      const humanCount=state.players[0].hand.length,edrinCount=state.players[1].hand.length,oldHuman=previousCounts.p0??humanCount,oldEdrin=previousCounts.p1??edrinCount;
      if(oldHuman===1&&humanCount>1){const settle=characterController.oneCardRecovered();if(settle&&!characterSpeaking)setCharacterExpression(settle.expression,settle.duration);}
      const event=edrinEventFor({played,playedCard,stop,stack,penalty,draw,closed,crossbowRun,humanCount,edrinCount,oldHuman,oldEdrin});
      if(event)runCharacter(event[0],{...event[1],playerOnOneCard:humanCount===1,ownTurn:currentPlayer(state).id==='p1',playerStillToPlay:currentPlayer(state).id==='p0'});
    }else if(isRagnaDuel()&&state.phase!=='finished'){
      // Ragna: one trigger per table update; her face does most of the work.
      const humanCount=state.players[0].hand.length,ragnaCount=state.players[1].hand.length,oldHuman=previousCounts.p0??humanCount,oldRagna=previousCounts.p1??ragnaCount;
      if(oldHuman===1&&humanCount>1){const settle=characterController.oneCardRecovered();if(settle&&!characterSpeaking)setCharacterExpression(settle.expression,settle.duration);}
      const shown=characterExpression,before=characterController.snapshot().state;characterController.observeTable({humanCount,ragnaCount});const after=characterController.snapshot().state;
      const slipBefore=ragnaSlip;if(draw?.playerId==='p1'||penalty?.playerId==='p1')ragnaSlip=false;
      const event=ragnaEventFor({played,playedCard,stop,stack,penalty,draw,closed,crossbowRun,humanCount,ragnaCount,oldHuman,oldRagna,slipBefore});
      if(event)runCharacter(event[0],{...event[1],playerOnOneCard:humanCount===1,ownTurn:currentPlayer(state).id==='p1',playerStillToPlay:currentPlayer(state).id==='p0'});
      if(after==='close'&&before==='default'&&characterExpression===shown&&!characterSpeaking)runCharacter('close_game');
      if(after!==before&&characterExpression===shown&&!characterSpeaking)setCharacterExpression(restingExpression());
    }else if(isKeshDuel()&&state.phase!=='finished'){
      // Kesh: one trigger per table update. He notices nearly everything and says very little.
      const humanCount=state.players[0].hand.length,keshCount=state.players[1].hand.length,oldHuman=previousCounts.p0??humanCount,oldKesh=previousCounts.p1??keshCount;
      if(oldHuman===1&&humanCount>1){const settle=characterController.oneCardRecovered();if(settle&&!characterSpeaking)setCharacterExpression(settle.expression,settle.duration);}
      const shown=characterExpression,before=characterController.snapshot().state;characterController.observeTable({humanCount,keshCount});const after=characterController.snapshot().state;
      // The table's answer to a move he had checked the stone for.
      const answered=keshTellPending&&(played?.playerId==='p0'||draw?.playerId==='p0'||!!penalty||stop?.skipped==='p1');
      const event=keshEventFor({played,playedCard,stop,stack,penalty,draw,closed,reverse,color,crossbowRun,humanCount,keshCount,oldHuman,oldKesh,tellPending:answered,cursedBefore:keshPenaltyOnHuman});
      if(answered)keshTellPending=false;
      if(played?.playerId==='p1'&&keshPlan?.told&&!keshPlan.consumed){keshPlan.consumed=true;keshTellPending=true;}
      if(event)runCharacter(event[0],{...event[1],keshCount,playerOnOneCard:humanCount===1,ownTurn:currentPlayer(state).id==='p1',playerStillToPlay:currentPlayer(state).id==='p0'});
      if(after==='attentive'&&before==='default'&&characterExpression===shown&&!characterSpeaking)runCharacter('close_game');
      if(after!==before&&characterExpression===shown&&!characterSpeaking)setCharacterExpression(restingExpression());
    }else if(isGenericDuel()&&state.phase!=='finished'){
      genericDuelUpdate({played,playedCard,stop,stack,penalty,draw,closed,reverse,crossbowRun,previousCounts,omenOutcome});
    }else if(isAuthoredDuel());
    else if((penalty?.playerId==='p1'&&penalty.amount>=4)||stop?.skipped==='p1')setDuelReaction('annoyed',duelLine('annoyed'));
    else if(humanMove&&(reverse||opened||playedCard?.type===TYPES.KING||state.players[0].hand.length===1))setDuelReaction('surprised',duelLine('surprised'));
    else if(opponentMove&&(stack||opened||playedCard?.type===TYPES.KING||state.players[1].hand.length===1))setDuelReaction('pleased',duelLine('pleased'));
  }
}
function noteKeshTable(){tablePenaltyBefore=!!state?.activePenalty&&state.phase==='playing';penaltyOnHumanBefore=tablePenaltyBefore&&currentPlayer(state).id==='p0';if(keshSeatId())keshPenaltyOnHuman=penaltyOnHumanBefore;if(tavernGuests){tavernGuests.penaltyBefore=!!state?.activePenalty&&state.phase==='playing';if(!state?.activePenalty)tavernGuests.curseBy=null;}}
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
  try{const plan=keshPlan&&keshPlan.playerId===playerId&&keshPlan.turn===scheduledTurn&&keshPlan.state===state?keshPlan:null,action=plan?plan.action:chooseBotAction(state);if(plan?.tell&&plan.shown)plan.told=true;if(isRagnaDuel()&&playerId==='p1'&&action.type===ACTIONS.PLAY&&lastBotDecision.playerId===playerId)ragnaSlip=lastBotDecision.slip;if(tavernGuests?.seats[playerId]&&action.type===ACTIONS.PLAY&&lastBotDecision.playerId===playerId)tavernGuests.slip[playerId]=lastBotDecision.slip;submit(action);}
  catch(error){console.error('AI turn action failed',error);if(currentPlayer(state).id===playerId&&state.phase==='playing'){try{submit({type:ACTIONS.DRAW,playerId});}catch(fallbackError){console.error('AI fallback draw failed',fallbackError);}}if(state.phase!=='finished'&&currentPlayer(state).kind==='ai'){try{render();}catch(renderError){console.error('AI recovery render failed',renderError);}scheduleGame();}}
}
function scheduleGame(){
  clearTimeout(botTimer);clearTimeout(characterSlowTimer);
  if(isPaused()||!state||session.phase!=='round'||state.phase==='finished')return;
  const active=currentPlayer(state);
  if(active.kind==='human'&&tavernGuests){const epoch=sessionEpoch,turn=state.turn;characterSlowTimer=setTimeout(()=>{if(epoch===sessionEpoch&&state?.turn===turn&&currentPlayer(state)?.id==='p0'&&!motionLocked)tavernEvent('slow',{current:'p0'});},12000);return;}
  if(active.kind==='human'){const pack=authoredPack();if(pack?.slowPlayerAfter){const epoch=sessionEpoch,turn=state.turn;characterSlowTimer=setTimeout(()=>{if(epoch===sessionEpoch&&state?.turn===turn&&currentPlayer(state)?.id==='p0'&&!motionLocked)runCharacter('slow_player',{playerOnOneCard:state.players[0].hand.length===1});},pack.slowPlayerAfter);}return;}
  const playerId=active.id,epoch=sessionEpoch,scheduledTurn=state.turn;
  // Edrin's eyes sharpen only for decisions that matter, and only now and then.
  if(isEdrinDuel()&&playerId==='p1'&&edrinConsideredTurn!==scheduledTurn){edrinConsideredTurn=scheduledTurn;const legal=getLegalCards(state,playerId),human=state.players[0].hand.length,mine=active.hand.length,weighty=legal.some(card=>[TYPES.PLUS2,TYPES.KING,TYPES.STOP,TYPES.SUPER_TAKI,TYPES.CHANGE_COLOR].includes(card.type));if(!state.taki?.open&&legal.length>=2&&(human<=2||(mine<=3&&weighty)))runCharacter('edrin_considering');}
  pendingBotTurn={playerId,epoch,scheduledTurn};
  const kesh=playerId===keshSeatId()?planKeshTurn(playerId,scheduledTurn):null;let wait=Math.max(kesh?kesh.wait:delay(),blockAiUntil-Date.now());
  if(kesh)stageKeshTell(kesh,epoch,wait);
  // Now and then Edrin, at a Tavern table, is simply not paying attention: a long turn the table may remark on.
  // Gorvan, too, is in no hurry: now and then he takes his time over a card (no faster, no slower to decide).
  // Kesh (v106) now and then sits over his stone a while (Ragna: "Is the stone playing for you?").
  const dawdle={edrin:.07,gorvan:.06,kesh:.05}[tavernGuests?.seats[playerId]?.id]||0;
  if(dawdle&&tavernGuests.dawdled!==scheduledTurn&&Math.random()<dawdle){tavernGuests.dawdled=scheduledTurn;wait+=2800;const timer=setTimeout(()=>{if(epoch===sessionEpoch&&state?.turn===scheduledTurn&&!isPaused())tavernEvent('slow',{current:playerId});},1800);characterSequenceTimers.push(timer);}
  botTimer=setTimeout(()=>runBotTurn(playerId,epoch,scheduledTurn),wait);
}

// ── Kesh: a reading rhythm and the rune-stone tell ─────────────────────────────
// His decision is made once per turn (the same fair planner either way); the
// tell and the pause come from that real decision. Some turns are quick, some
// get a pause, a few get the stone. Never a glow, never a guaranteed warning.
function planKeshTurn(playerId,turn){
  if(keshPlan&&keshPlan.playerId===playerId&&keshPlan.turn===turn&&keshPlan.state===state)return keshPlan;
  const me=currentPlayer(state),legal=getLegalCards(state,playerId),action=chooseBotAction(state),card=action.type===ACTIONS.PLAY?me.hand.find(c=>c.id===action.cardId):null;
  const others=state.players.filter(p=>p.id!==playerId).map(p=>p.hand.length),nearest=Math.min(...others),humanCount=state.players[0].hand.length;
  const free=!state.taki?.open&&!state.awaitingColor&&action.type===ACTIONS.PLAY;
  const major=free&&keshDecisionIsMajor({cardType:card?.type,humanCount:session.mode==='duel'?humanCount:nearest,keshCount:me.hand.length,nextCount:nearest,penalty:state.activePenalty?.amount||0});
  const tell=free?keshTellFor({major,choices:legal.length,turnsSinceTell:keshTellMemory.turnsSince,tellsThisRound:keshTellMemory.thisRound}):null;
  keshTellMemory.turnsSince++;if(tell){keshTellMemory.turnsSince=0;keshTellMemory.thisRound++;keshTellMemory.toldThisRound=true;}
  const r=Math.random(),quick=action.type!==ACTIONS.PLAY||legal.length<=1||!!state.taki?.open||!!state.awaitingColor;
  // Ordinary and forced turns keep the table's usual pace; only weighty decisions get his longer look.
  let wait=quick?480+r*220:major?1250+r*900:620+r*330;
  if(settings.difficulty==='quick')wait*=.75;
  if(tell)wait=Math.max(wait,tell.lead+420);
  keshPlan={playerId,turn,state,action,tell,major,wait:Math.min(2400,wait),shown:false,told:false,consumed:false};
  return keshPlan;
}
function stageKeshTell(plan,epoch,wait){
  if(!plan.tell||plan.shown)return;
  const show=()=>{
    if(epoch!==sessionEpoch||isPaused()||state?.turn!==plan.turn||plan.state!==state)return;plan.shown=true;const tell=plan.tell,phase=tell.after==='omen_reading'?'reading':tell.after==='omen_realization'?'realization':'touch';
    // Touch → the card → (sometimes) reading or the small "of course" → calm again.
    keshFace(tell.touch,tell.lead+620);if(tell.speak&&phase==='touch')keshOmenLine('touch');
    if(tell.after){const timer=setTimeout(()=>{if(epoch!==sessionEpoch||isPaused())return;if(keshFaceIs(tell.touch)||keshFaceIs(null))keshFace(tell.after,1500);if(tell.speak&&phase!=='touch')keshOmenLine(phase);},tell.lead+560);characterSequenceTimers.push(timer);}
  };
  const timer=setTimeout(show,Math.max(0,wait-plan.tell.lead));characterSequenceTimers.push(timer);
}
// One face for Kesh wherever he sits: the duel stage, or his seat at a Tavern table.
function keshFace(expression,duration){if(isKeshDuel()){if(!characterSpeaking)setCharacterExpression(expression,duration);}else{const seat=guestSeatOf('kesh');if(seat&&!tavernGuests.speaking)setGuestFace(seat,expression,duration);}}
function keshFaceIs(expression){const seat=guestSeatOf('kesh'),current=isKeshDuel()?characterExpression:tavernGuests?.seats[seat]?.face,rest=isKeshDuel()?restingExpression():AUTHORED_CHARACTERS.kesh.defaultExpression;return expression===null?current===rest:current===expression;}
function keshOmenLine(phase){if(isKeshDuel())runCharacter('omen',{phase});else if(guestSeatOf('kesh'))tavernEvent('omen',{actor:guestSeatOf('kesh'),phase});}
// ── Veyra and Gorvan at the Duel table: the generic authored dispatch ──────────
// One trigger per table update from the shared classifier (duel/authored-pack.js),
// read from the character's side. Veyra's omen story takes precedence: a sign that
// lands is her biggest moment, a sign that runs out gets argued with. Then, now and
// then, a quiet moment becomes a new omen.
function genericDuelUpdate({played,playedCard,stop,stack,penalty,draw,closed,reverse,crossbowRun,previousCounts,omenOutcome}){
  const humanCount=state.players[0].hand.length,ownCount=state.players[1].hand.length,oldHuman=previousCounts.p0??humanCount,oldOwn=previousCounts.p1??ownCount;
  if(oldHuman===1&&humanCount>1){const settle=characterController.oneCardRecovered();if(settle&&!characterSpeaking)setCharacterExpression(settle.expression,settle.duration);}
  const shown=characterExpression,before=characterController.snapshot().state;characterController.observeTable({humanCount,ownCount});const after=characterController.snapshot().state;
  const event=duelEventFor({played,playedCard,stop,stack,penalty,draw,closed,reverse,crossbowRun,humanCount,ownCount,oldHuman,oldOwn,cursedBefore:penaltyOnHumanBefore});
  const context={playerOnOneCard:humanCount===1,ownTurn:currentPlayer(state).id==='p1',playerStillToPlay:currentPlayer(state).id==='p0',...(veyraOmens?.story()||{})};
  const urgent=event&&['player_one_card','own_one_card'].includes(event[0]);
  if(omenOutcome?.result==='hit')veyraPendingHit={kind:omenOutcome.kind,until:performance.now()+8000};
  if(veyraPendingHit&&deliverVeyraHit());
  else if(veyraPendingHit){if(!characterSpeaking)setCharacterExpression('omen_hit_pointing',1600);}
  else if(omenOutcome?.result==='miss'&&!urgent)runCharacter('omen_miss',{...context,kind:omenOutcome.kind});
  else if(event)runCharacter(event[0],{...event[1],...context});
  if(after==='attentive'&&before==='default'&&characterExpression===shown&&!characterSpeaking)runCharacter('close_game');
  if(after!==before&&characterExpression===shown&&!characterSpeaking)setCharacterExpression(restingExpression());
  if(isVeyraDuel())maybeDeclareVeyraOmen();
}
// A sign that lands is her biggest moment, so it is never lost to bad timing: if she
// (or anyone) is mid-line, the payoff waits for the voice to end — a few seconds at most.
let veyraPendingHit=null;
function deliverVeyraHit(){
  const hit=veyraPendingHit;if(!hit)return false;
  if(performance.now()>hit.until||session?.phase!=='round'||state?.phase!=='playing'){veyraPendingHit=null;return false;}
  if(view!=='game'||isPaused()||audioSystem.voiceSource)return false;
  if(isVeyraDuel()){if(characterSpeaking)return false;veyraPendingHit=null;return !!runCharacter('omen_hit',{...(veyraOmens?.story()||{}),kind:hit.kind},true);}
  const seat=guestSeatOf('veyra');if(!seat||tavernGuests?.speaking)return false;veyraPendingHit=null;return tavernEvent('omen_hit',{actor:seat,kind:hit.kind,force:true,first:(veyraOmens?.story().hits||0)<=1});
}
const retryVeyraHit=()=>{if(!veyraPendingHit)return;const epoch=sessionEpoch,timer=setTimeout(()=>{if(epoch===sessionEpoch)deliverVeyraHit();},settings.reducedMotion?150:380);characterSequenceTimers.push(timer);};
// The book watches public facts only: a Curse taken (and its colour), a Shield and its
// colour, a Turnabout, a Curse thrown back, a King breaking a Curse.
const veyraCursers=new Set();
function observeVeyraOmen({played,playedCard,stop,stack,penalty,draw,reverse,closed,previousCounts}){
  if(stack&&played)veyraCursers.add(played.playerId);
  if(played||draw||penalty)veyraOmens.tick();
  const top=topCard(state),counts=Object.fromEntries(state.players.map(p=>[p.id,p.hand.length]));
  return veyraOmens.observe(veyraOmenEvent({mode:veyraOmens.mode,played,playedCard,stop,stack,penalty,draw,reverse,closed,topColor:top?.type===TYPES.PLUS2?top.color:null,activeColor:state.activeColor,counts,previousCounts,penaltyBefore:tablePenaltyBefore,cursers:[...veyraCursers]}));
}
// Now and then, in a quiet moment, she declares an omen. It is remembered only if
// the table actually heard (or read) it.
function maybeDeclareVeyraOmen(){
  if(!veyraOmens||state?.phase!=='playing'||view!=='game'||isPaused())return false;
  const kind=veyraOmens.wantsToDeclare({activeColor:state.activeColor,cursePending:!!state.activePenalty,tension:state.players.some(p=>p.hand.length<=1)});if(!kind)return false;
  let spoke=false;
  if(isVeyraDuel()){if(characterSpeaking||audioSystem.voiceSource)return false;const reaction=runCharacter('omen',{kind,...veyraOmens.story()});spoke=reaction?.trigger==='omen';}
  else{const seat=guestSeatOf('veyra');if(seat&&!guestsMuted())spoke=tavernEvent('omen_declare',{actor:seat,kind});}
  if(spoke)veyraOmens.declare(kind);
  return spoke;
}
// Gorvan's accents: presentation, under SFX, well below the card sounds. His own Curse
// is a touch colder; one weighty King or Shield a hand gets a restrained accent; in a
// Duel, one low pulse when either hand reaches its last card. Never stacked.
function gorvanAccents({played,playedCard,stack,stop,previousCounts,effectDelay}){
  const seat=gorvanSeatId();if(!seat||!state)return;
  const mine=played?.playerId===seat,now=performance.now(),nearest=Math.min(...state.players.filter(p=>p.id!==seat).map(p=>p.hand.length));
  audioSystem.setSettings(settings);
  if(mine&&stack&&playedCard?.type===TYPES.PLUS2){if(now-gorvanSfx.curseAt>3500){gorvanSfx.curseAt=now;audioSystem.play('gorvanCurse',{delay:effectDelay+150});}return;}
  if(mine&&gorvanSfx.accentHand!==session.results.length&&((playedCard?.type===TYPES.KING&&(tablePenaltyBefore||nearest<=2))||(playedCard?.type===TYPES.STOP&&stop&&nearest<=2))){gorvanSfx.accentHand=session.results.length;audioSystem.play('gorvanAccent',{delay:effectDelay+220});return;}
  // A crowded Tavern table has enough going on: the pulse is a Duel-only cue.
  if(session.mode!=='duel'||state.phase!=='playing')return;
  for(const id of ['p0','p1']){const count=state.players.find(p=>p.id===id)?.hand.length;if(count===1&&(previousCounts[id]??count)>1&&!gorvanSfx.pulsed.has(id)&&now-gorvanSfx.pulseAt>9000){gorvanSfx.pulsed.add(id);gorvanSfx.pulseAt=now;audioSystem.play('gorvanPulse',{delay:480});break;}}
}
// ── Voiced guests at a Tavern table ────────────────────────────────────────────
// Bramm, Edrin, Ragna or Kesh sometimes happens to be playing. Their faces are their
// seat portraits; ONE director (duel/tavern-director.js) decides whether anyone
// speaks. Lines play one at a time through the shared voice path; a banter's second
// line waits for the first to finish. Most moments stay silent.
function setupTavernGuests(){
  clearTimeout(tavernIdleTimer);
  const guests=session.mode==='tavern'?state.players.filter(isVoicedGuest):[];
  if(!guests.length){if(tavernGuests)for(const seat of Object.values(tavernGuests.seats))clearTimeout(seat.timer);tavernGuests=null;return;}
  const key=`${session.seed}:${guests.map(p=>`${p.id}=${p.nameKey}`).join(',')}`;
  if(tavernGuests?.key===key){tavernGuests.speaking=false;return;}
  const seats=Object.fromEntries(guests.map(p=>[p.id,p.nameKey]));
  tavernGuests={key,director:createTavernDirector({seats,now:activeNow,locale:()=>settings.language,captions:()=>!!settings.captions,heard:settings.heardBanter||[],initial:session.tavernDirector||null}),seats:Object.fromEntries(guests.map(p=>[p.id,{id:p.nameKey,face:AUTHORED_CHARACTERS[p.nameKey].defaultExpression,timer:null}])),speaking:false,slip:{},curseBy:null,penaltyBefore:false,dawdled:null};
}
function setGuestFace(seatId,expression,duration=1700){
  const seat=tavernGuests?.seats[seatId];if(!seat)return;const pack=AUTHORED_CHARACTERS[seat.id],rest=pack.defaultExpression;
  clearTimeout(seat.timer);seat.face=expression&&pack.expressions.includes(expression)?expression:rest;render();
  // duration 0 holds the face (a result) until the next hand.
  if(expression&&duration>0){const epoch=sessionEpoch;seat.timer=setTimeout(()=>{if(epoch!==sessionEpoch||tavernGuests?.seats[seatId]!==seat)return;seat.face=rest;render();},settings.reducedMotion?Math.min(duration,900):duration);}
}
function tavernEvent(type,context={}){
  if(!tavernGuests||view!=='game'||isPaused())return false;
  const plan=tavernGuests.director.event(type,{...context,busy:tavernGuests.speaking||!!audioSystem.voiceSource,muted:guestsMuted()});
  for(const face of plan.faces)if(!(tavernGuests.speaking&&tavernGuests.speakingSeat===face.seat))setGuestFace(face.seat,face.expression,face.duration);
  if(plan.lines.length){performGuestLines(plan.lines,{result:type==='round_end'||type==='match_end',after:plan.after||[]});if(plan.banter)rememberBanter(plan.banter);persist();return true;}
  return false;
}
// A dedicated banter recording, in the player's language (no take in that language: words only).
function resolveBanterLine(reaction){const locale=settings.language==='he'?'he':'en',voice=resolveCharacterVoice(reaction.voice,locale);return {...reaction,locale,caption:reaction.captions?.[locale]||'',voice:voice?reaction.voice:null};}
// A running joke needs to remember earlier evenings ("We are not doing this again.").
function rememberBanter(id){const heard=new Set(settings.heardBanter||[]);if(heard.has(id))return;heard.add(id);settings.heardBanter=[...heard];saveSettings(settings);}
// Lines play one at a time; a banter holds the table's one voice until its last line ends.
// A `silent` line (an English-only exchange in Hebrew) shows its authored words without a voice.
function performGuestLines(lines,{result=false,after=[]}={}){
  const guests=tavernGuests,epoch=sessionEpoch;if(!guests)return;guests.speaking=true;lastQuipAt=Date.now();
  const step=index=>{
    if(epoch!==sessionEpoch||tavernGuests!==guests)return;
    // v107: once an exchange about the player ends, a listener may glance at them (silent face, then back).
    if(index>=lines.length){guests.speaking=false;guests.speakingSeat=null;for(const look of after)if(look.seat)setGuestFace(look.seat,look.expression,look.duration);retryVeyraHit();return;}
    const line=lines[index],pack=AUTHORED_CHARACTERS[line.guest],resolved=line.reaction.category==='banter'?resolveBanterLine(line.reaction):pack.resolveReaction(line.reaction,settings.language),localized=line.silent?{...resolved,voice:null}:resolved;
    guests.speakingSeat=line.seat;setGuestFace(line.seat,localized.expression,0);
    let done=false;const finish=()=>{if(done||epoch!==sessionEpoch)return;done=true;const timer=setTimeout(()=>{if(epoch!==sessionEpoch||tavernGuests!==guests)return;if(quip?.player===line.seat){quip=null;}if(!result)setGuestFace(line.seat,null);render();const next=lines[index+1];const gap=setTimeout(()=>step(index+1),next?(settings.reducedMotion?250:next.pause||700):0);characterSequenceTimers.push(gap);},settings.reducedMotion?150:450);characterSequenceTimers.push(timer);};
    const bubble=()=>{if(epoch!==sessionEpoch||tavernGuests!==guests)return;clearTimeout(quipTimer);quip={player:line.seat,text:localized.caption,lang:localized.locale,guest:true};lastQuipAt=Date.now();render();};
    // Captions on: the bubble shows the exact line. Captions off: voice only — unless the voice cannot play, then the words still reach the table.
    if(localized.voice)void speakCharacterVoice(localized,{locked:result,onEnded:finish}).then(node=>{if(!node){if(!settings.captions)bubble();const timer=setTimeout(finish,localized.duration||2400);characterSequenceTimers.push(timer);}});
    else{const timer=setTimeout(finish,localized.duration||2400);characterSequenceTimers.push(timer);}
    if(settings.captions||!localized.voice)bubble();
    lastQuipAt=Date.now();
  };
  step(0);
}
// v108 chatter: every 16–24 s of play the table gets a chance to talk about nothing in particular — not only in a lull.
// A card in flight does not cancel the chance: it waits a moment for the voice to be free, then tries.
const TAVERN_CHATTER_MS=[16000,8000];
function scheduleTavernIdle(delay=null){
  clearTimeout(tavernIdleTimer);if(!tavernGuests||view!=='game'||isPaused()||session?.phase!=='round')return;const epoch=sessionEpoch;
  tavernIdleTimer=setTimeout(()=>{if(epoch!==sessionEpoch)return;
    const free=state?.phase==='playing'&&!audioSystem.voiceSource&&!tavernGuests?.speaking&&!(quip&&tavernGuests.seats[quip.player]);
    if(state?.phase==='playing'&&!free){scheduleTavernIdle(1200+Math.random()*1300);return;}
    if(free)tavernEvent('idle',{current:currentPlayer(state).id});scheduleTavernIdle();},delay??TAVERN_CHATTER_MS[0]+Math.random()*TAVERN_CHATTER_MS[1]);
}
// Turn one table update into at most one table event, with who did it and to whom.
function tavernObserve({played,playedCard,stop,stack,penalty,draw,reverse,closed,crossbowRun,previousCounts,omenOutcome=null}){
  const guests=tavernGuests;if(!guests)return false;
  const counts=Object.fromEntries(state.players.map(p=>[p.id,p.hand.length])),kesh=guestSeatOf('kesh');let spoke=false;const say=(type,context)=>{spoke=tavernEvent(type,context)||spoke;};
  if(stack&&played)guests.curseBy=played.playerId;
  // Kesh's tell: the table answered a move he had checked the stone for.
  const answered=keshTellPending&&kesh&&((played&&played.playerId!==kesh)||(draw&&draw.playerId!==kesh)||!!penalty||stop?.skipped===kesh);
  if(answered){keshTellPending=false;if(penalty?.playerId===kesh||stop?.skipped===kesh)say('omen_failed',{actor:kesh});}
  if(played?.playerId===kesh&&keshPlan?.told&&!keshPlan.consumed){keshPlan.consumed=true;keshTellPending=true;}
  // Veyra's omen landed, or ran out: her moment comes first; the table's own event still shows on faces.
  const veyra=guestSeatOf('veyra');
  if(omenOutcome&&veyra){if(omenOutcome.result==='hit'){veyraPendingHit={kind:omenOutcome.kind,until:performance.now()+9000};if(deliverVeyraHit())spoke=true;else if(!tavernGuests.speaking)setGuestFace(veyra,'omen_hit_pointing',1800);}else say('omen_miss',{actor:veyra,kind:omenOutcome.kind});}
  const reached=Object.keys(counts).find(id=>counts[id]===1&&(previousCounts[id]??counts[id])>1);
  if(reached)say('one_card',{actor:reached});
  else if(penalty){say('penalty',{victim:penalty.playerId,amount:penalty.amount||2,source:guests.curseBy,victimCount:counts[penalty.playerId]});delete guests.slip[penalty.playerId];guests.curseBy=null;}
  else if(stop){const victim=stop.skipped,shielder=guests.seats[played?.playerId]?.id;if(guests.seats[victim]||shielder==='veyra'||shielder==='gorvan')say('skip',{actor:played?.playerId,victim});else say((counts[victim]??9)<=2?'good_move':'move',{actor:played?.playerId,victim});}
  else if(playedCard?.type===TYPES.KING){const broke=guests.penaltyBefore;say('king',{actor:played.playerId,victim:broke?guests.curseBy:null});if(broke)guests.curseBy=null;}
  else if(reverse)say('reverse',{actor:played?.playerId});
  else if(draw){say('draw',{actor:draw.playerId,slip:!!guests.slip[draw.playerId]});delete guests.slip[draw.playerId];}
  else if(played){const next=state.phase==='playing'?currentPlayer(state).id:null,big=(stack?.amount||0)>=4||(closed&&crossbowRun>=3)||(!!stack&&(counts[next]??9)<=2);say(big?'good_move':'move',{actor:played.playerId,victim:stack?next:null});}
  return spoke;
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
  const featured=displayOpponent(getDuelOpponent(featuredDuelOpponent())),featuredRecord=recordText(settings.duelRecords?.[featured.id]);
  const t=en?{
    resumeKicker:'Your seat is kept',resume:{duel:'Continue the Duel',tavern:'Continue the Tavern Match',quick:'Continue Quick Play'},
    quick:'Quick Play',quickSub:'One hand with strangers',tavern:'Tavern Match',tavernSub:'Five rounds with the regulars',
    duel:'Duel',duelSub:DUEL_HOME_LINES.en[featured.id],record:`You <bdi>${featuredRecord.won}</bdi> · ${featured.name} <bdi>${featuredRecord.lost}</bdi>`,rules:'House rules',settings:'Settings'
  }:{
    resumeKicker:'המקום שלכם שמור',resume:{duel:'להמשיך בדו־קרב',tavern:'להמשיך במשחק הפונדק',quick:'להמשיך במשחק המהיר'},
    quick:'משחק מהיר',quickSub:'יד אחת עם זרים',tavern:'משחק פונדק',tavernSub:'חמישה סיבובים מול הקבועים',
    duel:'דו־קרב',duelSub:DUEL_HOME_LINES.he[featured.id],record:`אתם <bdi>${featuredRecord.won}</bdi> · ${featured.name} <bdi>${featuredRecord.lost}</bdi>`,rules:'חוקי הבית',settings:'הגדרות'
  };
  const resumeMeta=!resumable?'':savedSession.mode==='duel'
    ?(en?`${savedOpponent.name} is waiting · Round <bdi>${savedSession.round}</bdi> of <bdi>${savedSession.totalRounds}</bdi>`:`${savedOpponent.name} מחכה · סיבוב <bdi>${savedSession.round}</bdi> מתוך <bdi>${savedSession.totalRounds}</bdi>`)
    :savedSession.mode==='tavern'
      ?(en?`The regulars are waiting · Round <bdi>${savedSession.round}</bdi> of <bdi>${savedSession.totalRounds}</bdi>`:`הקבועים מחכים · סיבוב <bdi>${savedSession.round}</bdi> מתוך <bdi>${savedSession.totalRounds}</bdi>`)
      :(en?`One hand · <bdi>${savedSession.game?.players?.length||settings.playerCount}</bdi> players`:`יד אחת · <bdi>${savedSession.game?.players?.length||settings.playerCount}</bdi> שחקנים`);
  // A game in progress is not a fourth way to play: it is your seat, kept on a slip of paper above the three.
  const resume=resumable?`<button class="resume-seat" data-resume><span class="resume-cards">${cardBackStackHTML('object-cards object-cards-resume',3)}</span><span class="resume-copy"><small class="choice-kicker">${t.resumeKicker}</small><strong>${t.resume[savedSession.mode]||t.resume.quick}</strong><small>${resumeMeta}</small></span></button>`:'';
  return `<main class="app-shell screen-home ${resumable?'has-resume':''} ${settings.reducedMotion?'reduced-motion':''}" dir="${direction()}">${worldSceneHTML('home')}<section class="home-layer">
    <h1 class="home-title"><span class="tavern-sign"><img class="sign-board" src="./assets/brand/tavern-sign.webp" alt="" draggable="false"><img class="primary-runes-logo" src="./assets/brand/runes-wordmark.svg" alt="${en?'RUNES':'RUNES — רונות'}" draggable="false"></span></h1>
    <nav class="home-choices" aria-label="${en?'Ways to play':'דרכי משחק'}">${resume}
      <button class="home-choice duel-choice" data-duel><span class="choice-object duel-cameo"><span class="portrait-card">${characterArtHTML(featured,{context:'cameo'})}</span></span><span class="choice-copy"><strong>${t.duel}</strong><small>${t.duelSub}</small><em class="choice-record">${t.record}</em></span></button>
      <button class="home-choice tavern-choice" data-tavern><span class="choice-object"><img class="object-coins" src="./assets/props/gambling/stacked-coins.png" alt="" draggable="false"></span><span class="choice-copy"><strong>${t.tavern}</strong><small>${t.tavernSub}</small></span></button>
      <button class="home-choice quick-choice" data-open="quick"><span class="choice-object">${cardBackStackHTML('object-cards',3)}</span><span class="choice-copy"><strong>${t.quick}</strong><small>${t.quickSub}</small></span></button>
    </nav>
    <div class="home-tools"><button class="tool-button" data-open="rules">${t.rules}</button><i aria-hidden="true">·</i><button class="tool-button" data-open="settings">${t.settings}</button></div>
  </section>${sheetHTML()}</main>`;
}
// The duel table: the four voiced regulars, one at a time, sitting across from
// you. Swipe (or use the arrows/keys) to see the others; which one is waiting
// first changes every visit. The other nine regulars are a random draw.
const DUEL_KICKERS=Object.freeze({
  en:{bramm:'The house champion',edrin:'Thirty years at this table',ragna:'Wants more gold on the table',kesh:'Reads the table by its signs',veyra:'The bones have opinions',gorvan:'The house insists on “Lord”'},
  he:{bramm:'אלוף הבית',edrin:'שלושים שנה ליד השולחן הזה',ragna:'רוצה יותר זהב על השולחן',kesh:'קורא את השולחן לפי הסימנים',veyra:'לעצמות יש דעות',gorvan:'הבית מתעקש על ״לורד״'}
});
const DUEL_HOME_LINES=Object.freeze({
  en:{bramm:'Bramm waits. “Still unbeaten.”',edrin:'Edrin has saved you a seat.',ragna:'Ragna waits. “Sit straight.”',kesh:'Kesh waits. “The signs are quiet tonight.”',veyra:'Veyra waits. “Something is wrong already.”',gorvan:'Gorvan waits. “Shall we?”'},
  he:{bramm:'בראם מחכה. ״עדיין בלתי־מנוצח.״',edrin:'אדרין שמר לכם מקום.',ragna:'ראגנה מחכה. ״לשבת ישר.״',kesh:'קֶשׁ מחכה. ״הסימנים שקטים הלילה.״',veyra:'ויירה מחכה. ״כבר משהו לא בסדר..״',gorvan:'גורבן מחכה. ״שנתחיל?״'}
});
let duelIndex=Math.floor(Math.random()*VOICED_OPPONENTS.length);
const featuredDuelOpponent=()=>VOICED_OPPONENTS[duelIndex]||VOICED_OPPONENTS[0];
function rerollDuelFeature(){duelIndex=Math.floor(Math.random()*VOICED_OPPONENTS.length);}
function duelRecordHTML(opponent){const en=isEnglish(),{won,lost}=recordText(settings.duelRecords?.[opponent.id]);return `<span class="chalk-record" aria-label="${en?`${won} wins, ${lost} losses`:`${won} ניצחונות, ${lost} הפסדים`}"><bdi>${won}</bdi><i>–</i><bdi>${lost}</bdi></span>`;}
function duelSitLabel(opponent){return isEnglish()?`Sit down with ${opponent.name}`:`לשבת מול ${opponent.name}`;}
function duelSelectHTML(){
  const en=isEnglish(),cast=VOICED_OPPONENTS.map(id=>displayOpponent(getDuelOpponent(id))),current=cast[duelIndex]||cast[0];
  const slide=(opponent,index)=>{const [title,attitude]=opponent.descriptor.split(' · ');return `<article class="duel-slide opponent-${opponent.id}" data-slide="${index}" aria-roledescription="${en?'slide':'שקופית'}" aria-label="${opponent.name}" ${index===duelIndex?'':'aria-hidden="true" inert'}>
      <div class="duel-slide-art">${characterArtHTML(opponent,{context:'select'})}</div>
      <div class="duel-plate"><small class="champion-kicker">${DUEL_KICKERS[en?'en':'he'][opponent.id]||''}</small><b>${opponent.name}</b><span class="duel-plate-title">${title}${attitude?`<span class="duel-plate-attitude"> · <em>${attitude}</em></span>`:''}</span>${duelRecordHTML(opponent)}</div>
    </article>`;};
  const dots=cast.map((opponent,index)=>`<button class="duel-dot ${index===duelIndex?'is-current':''}" data-duel-go="${index}" aria-label="${opponent.name}" ${index===duelIndex?'aria-current="true"':''}></button>`).join('');
  return `<main class="app-shell screen-select screen-duel ${settings.reducedMotion?'reduced-motion':''}" dir="${direction()}">${worldSceneHTML('select')}<section class="duel-layer">
    <header class="select-head"><button class="icon-button back-button" data-home aria-label="${en?'Back':'חזרה'}"><span aria-hidden="true">${en?'‹':'›'}</span></button><div><small>${en?'The regulars have kept a seat':'הקבועים שמרו לכם מקום'}</small><h1>${en?'Who sits across from you?':'מי יישב מולכם?'}</h1></div></header>
    <div class="duel-carousel" data-carousel role="region" aria-roledescription="${en?'carousel':'קרוסלה'}" aria-label="${en?'Opponents':'יריבים'}">
      <div class="duel-track" style="--index:${duelIndex}">${cast.map(slide).join('')}</div>
      <button class="duel-arrow duel-prev" data-duel-step="-1" aria-label="${en?'Previous opponent':'היריב הקודם'}"><span aria-hidden="true">‹</span></button>
      <button class="duel-arrow duel-next" data-duel-step="1" aria-label="${en?'Next opponent':'היריב הבא'}"><span aria-hidden="true">›</span></button>
    </div>
    <div class="duel-controls">
      <div class="duel-dots" role="group" aria-label="${en?'Choose an opponent':'בחירת יריב'}">${dots}</div>
      <button class="primary-button duel-sit" data-opponent="${current.id}">${duelSitLabel(current)}</button>
      <button class="random-regular" data-random-opponent><img src="./assets/props/gambling/dice-pair.png" alt="" draggable="false"><span>${en?'Or a random regular':'או יריב אקראי מהקבועים'}</span></button>
      <p class="select-note">${en?'Five rounds, one opponent. Every card left in a losing hand is a point.':'חמישה סיבובים מול יריב אחד. כל קלף שנשאר ביד המפסידה שווה נקודה.'}</p>
    </div>
  </section></main>`;
}
function bindDuelCarousel(){
  const carousel=root.querySelector('[data-carousel]');if(!carousel)return;
  const track=carousel.querySelector('.duel-track'),count=VOICED_OPPONENTS.length,sign=direction()==='rtl'?1:-1;
  const sync=(dx=0,animate=true)=>{
    track.classList.toggle('dragging',!animate);track.style.setProperty('--index',duelIndex);track.style.setProperty('--drag',`${dx}px`);
    track.querySelectorAll('.duel-slide').forEach((node,index)=>{const on=index===duelIndex;node.toggleAttribute('inert',!on);if(on)node.removeAttribute('aria-hidden');else node.setAttribute('aria-hidden','true');});
    root.querySelectorAll('[data-duel-go]').forEach((dot,index)=>{dot.classList.toggle('is-current',index===duelIndex);if(index===duelIndex)dot.setAttribute('aria-current','true');else dot.removeAttribute('aria-current');});
    const opponent=displayOpponent(getDuelOpponent(VOICED_OPPONENTS[duelIndex])),sit=root.querySelector('.duel-sit');if(sit){sit.dataset.opponent=opponent.id;sit.textContent=duelSitLabel(opponent);}
  };
  const go=index=>{duelIndex=(index+count)%count;sync();void authoredCharacter(VOICED_OPPONENTS[duelIndex])?.preload();};
  root.querySelectorAll('[data-duel-step]').forEach(button=>button.onclick=()=>{tapFeedback('play',settings);go(duelIndex+Number(button.dataset.duelStep));});
  root.querySelectorAll('[data-duel-go]').forEach(button=>button.onclick=()=>go(Number(button.dataset.duelGo)));
  let startX=0,startY=0,dx=0,dragging=false,pointer=null,startTime=0;
  carousel.onpointerdown=event=>{if(event.target.closest('button'))return;pointer=event.pointerId;startX=event.clientX;startY=event.clientY;dx=0;dragging=false;startTime=event.timeStamp;};
  carousel.onpointermove=event=>{if(event.pointerId!==pointer)return;const mx=event.clientX-startX,my=event.clientY-startY;if(!dragging){if(Math.abs(mx)<8||Math.abs(mx)<Math.abs(my))return;dragging=true;carousel.setPointerCapture?.(event.pointerId);}dx=mx;sync(dx,false);};
  const end=event=>{if(event.pointerId!==pointer)return;pointer=null;if(!dragging){return;}dragging=false;const width=carousel.clientWidth||1,fast=Math.abs(dx)/Math.max(1,event.timeStamp-startTime)>.45;
    // Finger left in LTR (right in RTL) brings the next opponent in.
    if(Math.abs(dx)>width*.18||(fast&&Math.abs(dx)>24))go(duelIndex+(dx*sign>0?1:-1));else sync();};
  carousel.onpointerup=end;carousel.onpointercancel=end;
  sync();
}
function startDuelWith(id,button){if(root.querySelector('[data-opponent].loading,[data-random-opponent].loading'))return;settings.duelOpponent=id;saveSettings(settings);clearMatch();button?.classList.add('loading');button?.setAttribute('aria-busy','true');return startSession('duel').catch(error=>{console.error('Unable to prepare duel assets',error);button?.classList.remove('loading');button?.setAttribute('aria-busy','false');});}
function tableEngravingHTML(){return `<svg class="table-engraving" viewBox="0 0 1000 620" preserveAspectRatio="none" aria-hidden="true"><g><path d="M162 323C185 169 330 91 505 91c177 0 319 77 339 231"/><path d="M842 345C811 491 671 548 501 548c-171 0-310-57-341-204"/></g><g class="engraving-marks"><path d="m149 324 28-29 28 29-28 29zM823 324l28-29 28 29-28 29z"/><path d="m487 91 16-20 16 20-16 20zM487 548l16-20 16 20-16 20z"/></g></svg>`;}
function cardBackStackHTML(className,count=2){const back=cardHTML(null,cardOptions({hidden:true,small:true})).replace(/ aria-label="[^"]+"/,'');return `<span class="${className}" aria-hidden="true">${back.repeat(count)}</span>`;}
// Living tavern: flickering light sources, rising embers and drifting dust over the painted room.
// Positions are in % of tavern-environment-v37.jpg; .life-art reproduces the background's cover crop.
const TAVERN_LIGHT_KINDS=Object.freeze({
  candle:{c:'#ffbe6e80',e:'#ff964626',t:[2.2,3.8]},far:{c:'#ffb4644d',e:'#ff8c3c14',t:[2.2,3.8]},lantern:{c:'#ffc47a70',e:'#ff964624',t:[2.6,4]},
  'fire-halo':{c:'#ff7a2a48',e:'#ff6a201a',t:[3.2,4.4]},'fire-wall':{c:'#ff8c3c2c',e:'#ff78280e',t:[2.4,3.2]},
  'fire-core':{c:'#ffd08c8c',e:'#ff823230',t:[1.4,2.1],r:.62,k:'life-flame'},'fire-floor':{c:'#ff823238',e:'#ff6e1e10',t:[2.6,3.4],r:3.2}
});
const TAVERN_LIGHTS=Object.freeze([
  ['fire-halo',89.5,33,34],['fire-wall',87,22,20],['fire-core',90.5,38,8],['fire-floor',87,62,32],
  ['candle',6.6,32.4,5],['candle',7.8,30.8,4.5],['lantern',16.9,16.5,7.5],
  ['candle',38.7,2.2,4],['candle',45.4,1.2,4],['candle',51.3,2.2,4],['candle',50,4.2,3],
  ['far',31.4,22,3],['far',40.7,33.2,3.4],['far',54.8,27.8,2.6],['far',63.5,35,2.8],['far',73,25.3,2.4],['far',77,32.6,2.6]
]);
function tavernLifeHTML(){
  let seed=7;const rnd=(a,b)=>{seed=(seed*16807)%2147483647;return a+(b-a)*((seed-1)/2147483646);},f=n=>n.toFixed(2);
  const lights=TAVERN_LIGHTS.map(([kind,x,y,s])=>{const k=TAVERN_LIGHT_KINDS[kind],d=rnd(...k.t);return `<i style="--x:${x}%;--y:${y}%;--s:${s}%;--c:${k.c};--e:${k.e};${k.r?`--r:${k.r};`:''}${k.k?`--k:${k.k};`:''}--d:${f(d)}s;--o:${f(-rnd(0,d))}s"></i>`;}).join('');
  let embers='';for(let i=0;i<16;i++){const d=rnd(2.6,4.6);embers+=`<i class="l-ember" style="--x:${f(rnd(88.4,92.6))}%;--y:${f(rnd(39.5,43))}%;--s:.3%;--c:#fff0c0;--e:#ffa040;--k:life-ember;--dx:${f(rnd(-2.2,1.6))}cqw;--d:${f(d)}s;--o:${f(-rnd(0,d*1.6))}s"></i>`;}
  const moteZones=[[3,14,18,38],[3,14,18,38],[22,58,6,34],[22,58,6,34],[22,58,6,34],[30,52,4,28],[60,80,20,36],[60,80,20,36]];
  const motes=moteZones.map(([x1,x2,y1,y2])=>{const d=rnd(16,28);return `<i class="l-mote" style="--x:${f(rnd(x1,x2))}%;--y:${f(rnd(y1,y2))}%;--s:.2%;--c:#ffe2b0;--e:#ffe2b040;--k:life-mote;--dx:${f(rnd(-3,3))}cqw;--dy:${f(rnd(-4,2))}cqh;--a:${f(rnd(.25,.5))};--d:${f(d)}s;--o:${f(-rnd(0,d))}s"></i>`;}).join('');
  return `<div class="tavern-life"><div class="life-art">${lights}${embers}${motes}</div></div>`;
}
let tavernLifeMarkup='';
// Old marks in the table wood. Each evening's table gets one of a few layouts so the
// texture never reads as a repeating tile. x/y are % of the visible table, s in vmin.
const TABLE_MARK_LAYOUTS=Object.freeze([
  [['mug-ring',14,20,17,.75,-12],['scratches',82,60,19,.5,8],['ale-stain',72,10,30,.45,40]],
  [['mug-ring',86,28,15,.7,30],['ale-stain',9,58,34,.42,-20],['scratches',63,8,14,.4,80]],
  [['scratches',17,72,21,.5,-25],['mug-ring',78,48,16,.7,70],['ale-stain',24,14,24,.38,15]],
  [['ale-stain',88,66,30,.42,110],['scratches',40,9,17,.45,5],['mug-ring',8,34,16,.72,-40]]
]);
function tableMarksHTML(context){
  const layout=context==='home'?[['mug-ring',89,56,15,.6,20],['ale-stain',10,26,26,.36,0],['scratches',14,82,20,.42,-15]]:TABLE_MARK_LAYOUTS[context==='select'?1:Math.abs(session?.seed||0)%TABLE_MARK_LAYOUTS.length];
  return `<div class="table-marks">${layout.map(([m,x,y,size,o,r])=>`<i style="--m:url('./assets/table/mark-${m}.webp');--x:${x}%;--y:${y}%;--s:${size}vmin;--o:${o};--r:${r}deg"></i>`).join('')}</div>`;
}
function worldSceneHTML(context='game'){
  const life=context==='home'||context==='select'?(tavernLifeMarkup||=tavernLifeHTML()):'';
  return `<div class="scene-world scene-${context}" aria-hidden="true"><div class="tavern-environment"></div>${life}<div class="table-body"><div class="table-surface"></div>${tableMarksHTML(context)}${context==='home'?tableEngravingHTML():''}</div><div class="scene-lighting"><i class="fire-glow"></i><i class="candle-glow"></i><i class="table-light"></i></div></div>`;
}
const propAssets=Object.freeze({
  ceramicCup:'drinks/ceramic-cup.png',darkBottle:'drinks/dark-glass-bottle.png',medievalFlask:'drinks/medieval-flask.png',pewterGoblet:'drinks/pewter-goblet.png',pewterTankard:'drinks/pewter-tankard.png',woodenTankard:'drinks/wooden-tankard.png',
  bettingToken:'gambling/carved-betting-token.png',dice:'gambling/dice-pair.png',bread:'food/bread-chunk.png',cheese:'food/cheese-wedge.png',nuts:'food/nuts-group.png',
  key:'personal/iron-key.png',pipe:'personal/smoking-pipe.png',ring:'personal/worn-metal-ring.png',rune:'mystical/carved-rune-token.png',amulet:'mystical/small-amulet.png',map:'bonus/map-scrap.png',
  purse:'personal/coin-purse.png',arrowhead:'personal/arrowhead-herbs.png',flute:'personal/wooden-flute.png',whetstone:'personal/whetstone.png',inkpot:'personal/inkpot-quill.png',horn:'drinks/drinking-horn.png'
});
// Each regular keeps the same things in front of them every evening, so an empty seat still says who sits there.
// Kesh keeps only his clay cup on the table: his rune stone stays in his hand. Edrin has no drink (he keeps looking for it).
// Veyra's bones and candle are in her hands, never on the table; Gorvan has "the usual".
const SEAT_SIGNATURES=Object.freeze({
  aila:['woodenTankard','arrowhead'],ron:['ceramicCup','flute'],bran:['pewterTankard','whetstone'],sela:['pewterGoblet','inkpot'],kesh:['ceramicCup'],bramm:['bread'],ragna:['pewterTankard'],edrin:[],veyra:['darkBottle'],gorvan:['pewterGoblet'],
  roderic:['pewterTankard','dice'],lio:['ceramicCup','purse'],mograth:['horn','bread'],harrow:['woodenTankard','pipe'],rusk:['medievalFlask','map']
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
function propsHTML(player){const archetype=player.archetype||'wanderer',variants=seatPropStories[archetype]||seatPropStories.wanderer,identity=[...`${player.id}:${archetype}`].reduce((sum,char)=>sum+char.charCodeAt(0),0),items=SEAT_SIGNATURES[player.nameKey]||variants[Math.abs((session?.seed||0)+identity)%variants.length];return `<span class="seat-props" aria-hidden="true">${items.map((item,index)=>`<img class="seat-object prop-${index+1}" src="./assets/props/${propAssets[item]}" alt="" draggable="false">`).join('')}</span>`;}
let lastPenaltyShown=0,slipShownFor=-1;
function freshQuip(){if(!quip||quip.rendered)return'';quip.rendered=true;return'enter';}
const TAVERN_FIGURES=new Set(['aila','ron','bran','sela','kesh','roderic','lio','mograth','harrow','rusk']),TAVERN_SPRITES=new Set();
// Score as coins: one coin per four points (min one), stacked four high, at most
// three stacks. The exact number always sits beside the pile.
function coinStacks(score){if(score<=0)return[];const coins=Math.min(12,1+Math.floor(score/4)),stacks=[];for(let left=coins;left>0;left-=4)stacks.push(Math.min(4,left));return stacks;}
function coinPileHTML(score,extra=''){return `<span class="coin-pile ${extra}" aria-hidden="true">${coinStacks(score).map((height,index)=>`<i style="--coins:${height};--stack:${index}"></i>`).join('')}</span>`;}
function seatScoreHTML(player){
  if(!['tavern','duel'].includes(session.mode))return'';
  const score=session.scores?.[player.id]||0,latest=session.results.at(-1),scored=roundResultVisible&&session.phase!=='round'&&latest?.winnerId===player.id&&slipShownFor!==session.results.length;
  return `<span class="seat-score ${scored?'scored':''} ${score?'':'empty'}" data-score-anchor="${player.id}" aria-label="${isEnglish()?`${score} points`:`${score} נקודות`}">${coinPileHTML(score)}<bdi>${score}</bdi></span>`;
}
function revealedHandHTML(player){if(session.phase==='round'||!roundResultVisible||!player.hand.length)return'';const shown=player.hand.slice(0,compactLayout()?4:7),more=player.hand.length-shown.length;return `<span class="revealed-hand" aria-hidden="true">${shown.map((card,index)=>cardHTML(card,cardOptions({small:true,legal:false,highlight:false,index}))).join('')}${more>0?`<b class="revealed-more">+<bdi>${more}</bdi></b>`:''}</span>`;}
function seatFigureHTML(player){
  if(session.mode==='duel')return `<div class="seat-figure duel-figure">${characterArtHTML(currentDuelOpponent(),{context:'table'})}<i class="contact-shadow"></i></div>`;
  // A voiced guest's seat is their live expression art (the same poses as their Duel), so faces — and Kesh's stone tell — work at the Tavern too.
  if(session.mode==='tavern'&&isVoicedGuest(player)){const pack=AUTHORED_CHARACTERS[player.nameKey],face=tavernGuests?.seats[player.id]?.face||pack.defaultExpression;return `<div class="seat-figure guest-figure guest-${pack.id}"><img src="${pack.expressionURL(face)}" alt="" draggable="false" onerror="this.onerror=null;this.src='${pack.expressionURL(pack.defaultExpression)}'"></div>`;}
  if(session.mode==='tavern'&&TAVERN_FIGURES.has(player.nameKey))return `<div class="seat-figure"><img src="./assets/characters/table/${player.nameKey}-seated.webp" alt="" draggable="false"></div>`;
  if(session.mode==='tavern'&&TAVERN_SPRITES.has(player.nameKey))return `<div class="seat-figure sprite-figure"><i class="duel-sprite sheet-b" style="${duelSpriteStyle(getDuelOpponent(player.nameKey),'idle')}"></i></div>`;
  return'';
}
const SEAT_LAYOUTS=Object.freeze({1:['n'],2:['nw','ne'],3:['w','n','e'],4:['w','nw','ne','e'],5:['w','nw','n','ne','e']});
function seatHTML(player,position){
  const en=isEnglish(),name=displayName(player),active=state.phase==='playing'&&currentPlayer(state).id===player.id,count=player.hand.length;
  const stopped=eventBanner?.kind==='stop'&&eventBanner.targetId===player.id,winning=session.phase!=='round'&&session.results.at(-1)?.winnerId===player.id;
  const fanCount=Math.min(12,count),backs=Array.from({length:fanCount},(_,i)=>`<i style="--offset:${(i-(fanCount-1)/2).toFixed(1)}"></i>`).join('');
  const duelOpponent=session.mode==='duel'?currentDuelOpponent():null,epithet=duelOpponent?duelOpponent.descriptor.split(' · ')[0]:'';
  const house=session.mode!=='quick'&&player.house?`<i class="house-pin ${player.house}">${colorRuneHTML(player.house,'house-rune')}</i>`:'';
  const speech=duelOpponent&&authoredCharacter(duelOpponent.id)
    ?(settings.captions&&characterCaptionLine?`<div class="speech character-speech" lang="${characterCaptionLocale}" dir="${characterCaptionLocale==='he'?'rtl':'ltr'}" role="status" aria-live="polite">${characterCaptionLine}</div>`:'')
    :(quip?.player===player.id?`<div class="speech ${freshQuip()} ${quip.guest?'guest-speech':''}" role="status" ${quip.lang?`lang="${quip.lang}" dir="${quip.lang==='he'?'rtl':'ltr'}"`:''}>${quip.text}</div>`:'');
  const label=active?(en?`${name}'s turn, ${cardCountLabel(count)}`:`התור של ${name}, ${cardCountLabel(count)}`):`${name}, ${cardCountLabel(count)}`;
  return `<div class="seat seat-${position} ${seatFigureHTML(player)?'has-figure':''} ${duelOpponent?`duel-seat opponent-${duelOpponent.id}`:''} ${active?'active':''} ${count===1&&state.phase==='playing'?'last-card':''} ${stopped?'sealed':''} ${propRattled.has(player.id)?'rattled':''} ${winning?'winner-seat':''}" data-player-id="${player.id}" data-seat="${position}" role="group" aria-label="${label}">
    ${seatFigureHTML(player)}
    <div class="seat-plate">${house}<span class="seat-name"><b>${name}</b>${epithet?`<small>${epithet}</small>`:''}</span><span class="seat-count" title="${cardCountLabel(count)}"><i class="mini-back" aria-hidden="true"></i><bdi>${count}</bdi></span></div>
    ${seatScoreHTML(player)}
    <div class="seat-fan" data-hand-anchor aria-hidden="true">${backs}</div>
    ${revealedHandHTML(player)}
    ${propsHTML(player)}
    ${stopped?`<span class="stop-seal" style="animation-delay:${-Math.round(performance.now()-(eventBanner.at||performance.now()))}ms" aria-hidden="true"></span>`:''}${speech}
  </div>`;
}
function seatsHTML(players){const layout=SEAT_LAYOUTS[players.length]||SEAT_LAYOUTS[5];return players.map((player,index)=>seatHTML(player,layout[index]||'n')).join('');}
function playerPlaceHTML(player){
  const scored=['tavern','duel'].includes(session.mode);
  return `<div class="player-place" aria-hidden="true">${session.mode==='duel'&&isAuthoredDuel()?'':`<img class="player-drink" src="./assets/props/drinks/wooden-tankard.png" alt="" draggable="false">`}${scored?seatScoreHTML(player):''}</div>`;
}
function headScoreHTML(){
  if(!['tavern','duel'].includes(session.mode))return'';
  const score=session.scores?.p0||0;
  return `<span class="head-score ${score?'':'zero'}" aria-label="${isEnglish()?`Your score: ${score}`:`הניקוד שלכם: ${score}`}">${coinPileHTML(score,'tiny')}<bdi>${score}</bdi></span>`;
}
function statusHTML(){
  const en=isEnglish();if(!state.activePenalty){lastPenaltyShown=0;return'';}
  const enter=state.activePenalty.amount!==lastPenaltyShown?'enter':'';lastPenaltyShown=state.activePenalty.amount;
  return `<span class="penalty-token ${enter}" role="status" aria-label="${en?`Curse: draw ${state.activePenalty.amount}`:`קללה: למשוך ${state.activePenalty.amount}`}"><bdi>+${state.activePenalty.amount}</bdi></span>`;
}
function crossbowHTML(){
  if(!state.taki?.open)return'';
  const en=isEnglish(),human=state.taki.ownerId==='p0'&&currentPlayer(state).id==='p0',owner=state.players.find(p=>p.id===state.taki.ownerId),color=colorName(state.taki.color);
  const pickup=crossbowAwaitsPickup(state);
  const sub=pickup?(human?(en?`Play all your ${color} cards — or draw`:`אפשר לשים את כל קלפי ה${color} — או למשוך`):(en?`Left open for ${displayName(owner)}`:`נשארה פתוחה ל${displayName(owner)}`))
    :human?(en?`Keep playing ${color} cards`:`אפשר להמשיך עם קלפי ${color}`):(en?`${displayName(owner)} keeps playing ${color}`:`${displayName(owner)} ${isFeminine(owner)?'ממשיכה':'ממשיך'} עם ${color}`);
  const title=pickup?(en?'Crossbow left open':'הקשת נשארה פתוחה'):(en?'Crossbow loaded':'קשת דרוכה');
  return `<div class="crossbow-panel ${human?'yours':''} ${state.taki.color}" style="--taki-color:${colorHex[state.taki.color]}" role="status">${colorRuneHTML(state.taki.color,'crossbow-rune')}<span><b>${title}</b><small>${sub}</small></span>${human&&!pickup?`<button class="fire-button" data-close-taki>${en?'Fire':'לירות'}</button>`:''}</div>`;
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
  if(humanTurn&&(!state.taki?.open||crossbowAwaitsPickup(state))&&!getLegalCards(state,'p0').length)return en?'Nothing matches — draw a card':'אין קלף מתאים — משכו קלף';
  const last=state.players.slice(1).find(player=>player.hand.length===1);
  if(last)return en?`${displayName(last)} is down to the last card`:`ל${displayName(last)} נשאר קלף אחרון`;
  return'';
}
let choiceShown=false;
function choiceHTML(){if(state.awaitingColor?.playerId!=='p0'){choiceShown=false;return'';}const en=isEnglish(),enter=choiceShown?'':'enter';choiceShown=true;return `<div class="color-choice ${enter}" role="dialog" aria-modal="true" aria-label="${en?'Choose a colour':'בחירת צבע'}"><div class="gem-ring"><span class="gem-title">${en?'Name the colour':'בחרו צבע'}</span><div class="gems">${DISPLAY_COLORS.map((c,n)=>`<button class="gem ${c}" data-color="${c}" style="--n:${n}"><i>${colorRuneHTML(c,'gem-rune')}</i><span>${colorName(c)}</span></button>`).join('')}</div></div></div>`;}
function captionHTML(){return settings.captions&&!settings.hideTableMessages&&captionLine?`<div class="table-caption" role="status">${captionLine}</div>`:'';}
function roundMarkerHTML(){
  if(session.mode==='quick')return'';
  const en=isEnglish();
  const notches=`<span class="round-notches" aria-hidden="true">${Array.from({length:session.totalRounds},(_,i)=>`<i class="${i+1<session.round||session.suddenDeath?'done':i+1===session.round?'now':''}"></i>`).join('')}</span>`;
  if(session.suddenDeath)return `<div class="round-marker">${notches}<span>${en?'Tied · one deciding hand':'שוויון · יד מכרעת'}</span></div>`;
  return `<div class="round-marker">${notches}<span>${en?`Round <bdi>${session.round}</bdi> of <bdi>${session.totalRounds}</bdi>`:`סיבוב <bdi>${session.round}</bdi> מתוך <bdi>${session.totalRounds}</bdi>`}</span></div>`;
}
const SUIT_ORDER=Object.freeze({red:0,green:1,yellow:2,blue:3,wild:4});
const TYPE_ORDER=Object.freeze({number:0,stop:1,reverse:2,plus:3,plus2:4,taki:5,changeColor:6,superTaki:7,king:8});
// The hand is shown grouped by colour, then number, then action cards, so the
// player can scan it like a real fanned hand. Engine order is untouched.
function sortedHand(hand){return hand.map((card,order)=>({card,order})).sort((a,b)=>(SUIT_ORDER[a.card.color]??5)-(SUIT_ORDER[b.card.color]??5)||(TYPE_ORDER[a.card.type]??9)-(TYPE_ORDER[b.card.type]??9)||(a.card.value??0)-(b.card.value??0)||a.order-b.order).map(item=>item.card);}
// The order of play is carved into the table around the piles and inlaid with worn brass: two arcs that
// chase each other clockwise (or, mirrored, counter-clockwise). Two players have no direction, so no ring.
const RING_ARCS='<path class="ring-route" d="M40.2 97.9A168 104 0 0 1 345.5 78"/><path class="ring-head" d="M359.1 92.6 333.3 83.9 347.5 80.2 352.3 66.2Z"/><path class="ring-route" d="M359.8 162.1A168 104 0 0 1 54.5 182"/><path class="ring-head" d="M40.9 167.4 66.7 176.1 52.5 179.8 47.7 193.8Z"/>';
let ringTurnAt=-1e9;
function directionRingHTML(){
  if(state.players.length<3)return'';
  const lit=performance.now()-ringTurnAt<1700;
  return `<svg class="direction-ring ${state.direction<0?'counter':''} ${lit?'lit':''}" viewBox="0 0 400 260" aria-hidden="true"><g class="ring-groove">${RING_ARCS}</g><g class="ring-inlay">${RING_ARCS}</g><g class="ring-glint"><path pathLength="100" d="M40.2 97.9A168 104 0 0 1 345.5 78"/><path pathLength="100" d="M359.8 162.1A168 104 0 0 1 54.5 182"/></g></svg>`;
}
// When a Turnabout reverses play, the ring turns over to its new direction and a glint runs along the
// grooves the new way round. Re-renders resume the same animation where it was, so it always completes.
function animateDirectionRing(){
  const ring=root.querySelector('.direction-ring'),elapsed=performance.now()-ringTurnAt;if(!ring||elapsed>1400||motionReduced())return;
  const now=ring.classList.contains('counter')?-1:1;
  ring.animate([{scale:`${-now} 1`},{scale:`${now*.02} 1.05`,offset:.45},{scale:`${now} 1`}],{duration:620,easing:'cubic-bezier(.45,0,.25,1)'}).currentTime=elapsed;
  ring.querySelectorAll('.ring-glint path').forEach(path=>{path.animate([{strokeDashoffset:14,opacity:0},{opacity:1,offset:.15},{opacity:1,offset:.8},{strokeDashoffset:-100,opacity:0}],{duration:820,delay:420,easing:'cubic-bezier(.4,0,.3,1)'}).currentTime=elapsed;});
  if(elapsed<1700){const epoch=sessionEpoch;setTimeout(()=>{if(epoch===sessionEpoch&&view==='game'&&!motionLocked)root.querySelector('.direction-ring.lit')?.classList.remove('lit');},1700-elapsed);}
}
function gameHTML(){
  const en=isEnglish(),human=state.players[0],active=currentPlayer(state),opponents=state.players.slice(1,6);
  const isHumanTurn=session.phase==='round'&&state.phase==='playing'&&active.id===human.id&&!state.awaitingColor,legal=new Set(isHumanTurn?getLegalCards(state,human.id).map(c=>c.id):[]),top=topCard(state);
  const under=state.discardPile.slice(-4,-1),fresh=top.id!==lastRenderedTopId;lastRenderedTopId=top.id;
  const shown=sortedHand(human.hand);
  const handCards=shown.map((card,i)=>cardHTML(card,cardOptions({legal:isHumanTurn&&legal.has(card.id),highlight:settings.playableHints,selected:selected===card.id,landing:landingCards.has(card.id),index:i,total:shown.length}))).join('');
  const drawSuggested=isHumanTurn&&(!state.taki?.open||crossbowAwaitsPickup(state))&&legal.size===0;
  const resolvedTopColor=top.type===TYPES.CHANGE_COLOR&&state.awaitingColor?null:state.activeColor,showActiveColor=top.color==='wild'||top.type===TYPES.CHANGE_COLOR||top.type===TYPES.SUPER_TAKI||state.activeColor!==top.color;
  const figures=session.mode==='duel'||(session.mode==='tavern'&&opponents.some(p=>TAVERN_FIGURES.has(p.nameKey)||TAVERN_SPRITES.has(p.nameKey)||isVoicedGuest(p)));
  // Play-by-play notes ("Bramm takes 2", "Nothing matches — draw a card") are optional; on by default they stay hidden.
  const strip=settings.hideTableMessages?'':actionStripText();
  const arrows=directionRingHTML();
  const shellClass=['app-shell','screen-game',`mode-${session.mode}`,`seats-${opponents.length}`,figures?'with-figures':'',isAuthoredDuel()?`character-duel ${authoredPack().id}-duel`:'',session.suddenDeath?'sudden-death':'',state.taki?.open?'crossbow-armed':'',state.phase==='playing'&&state.players.some(p=>p.hand.length===1)?'one-card-tension':'',session.phase!=='round'?'round-complete':'',session.phase!=='round'&&roundResultVisible?'round-over':'',settings.reducedMotion?'reduced-motion':''].filter(Boolean).join(' ');
  return `<main class="${shellClass}" dir="${direction()}" style="--active:${colorHex[state.activeColor]||'#b78b45'};--taki-color:${colorHex[state.taki?.color]||'#b0832f'}">${worldSceneHTML(session.mode==='duel'?'duel':'game')}<section class="game ${isHumanTurn?'human-turn':'waiting'}">
    <header class="game-head"><button class="icon-button rune-menu" data-open="pause" aria-label="${en?'Pause and menu':'השהיה ותפריט'}"><i></i><i></i><i></i></button>${roundMarkerHTML()}${headScoreHTML()}</header>
    <div class="board" data-speed-bots>
      <div class="seats">${seatsHTML(opponents)}</div>
      <div class="center"><div class="piles">${arrows}
        <button class="pile draw-pile ${drawSuggested?'draw-suggested':''} ${deckSettling?'deck-settling':''}" data-draw data-draw-anchor aria-label="${en?`Draw a card. ${state.drawPile.length} left in the deck`:`למשוך קלף. ${state.drawPile.length} קלפים בחפיסה`}" style="--deck-depth:${Math.min(6,Math.ceil(state.drawPile.length/16))}"><span class="deck-body">${cardHTML(null,cardOptions({hidden:true}))}</span><span class="deck-count"><i class="mini-back" aria-hidden="true"></i><bdi>${state.drawPile.length}</bdi></span></button>
        <div class="pile discard ${fresh?'fresh':''}" data-discard-anchor style="--pile-turn:${((state.discardPile.length%7)-3)*.7}deg" role="img" aria-label="${en?`Top card: ${cardLabel(top,'en')||top.value}. Colour: ${colorName(state.activeColor)||'any'}`:`הקלף העליון: ${cardLabel(top,'he')||top.value}. צבע: ${colorName(state.activeColor)||'חופשי'}`}"><div class="discard-under">${under.map((card,i)=>`<span class="under under-${i}">${cardHTML(card,cardOptions())}</span>`).join('')}</div>${cardHTML(top,cardOptions({activeColor:resolvedTopColor}))}${showActiveColor&&state.activeColor?`<span class="active-stone ${state.activeColor}" title="${colorName(state.activeColor)}">${colorRuneHTML(state.activeColor,'active-color-rune')}</span>`:''}${statusHTML()}</div>
      </div></div>
      <div class="table-notes">${crossbowHTML()}${strip?`<div class="action-strip" role="status" aria-live="polite">${strip}</div>`:''}${captionHTML()}</div>
      <span class="sr-only" aria-live="polite" aria-atomic="true">${screenReaderLine}</span>
    </div>
    <footer class="hand-area ${isHumanTurn?'your-turn':''} ${shieldBlock?'shield-blocked':''}"${shieldBlock?` style="--sb-t:${-Math.round(performance.now()-shieldBlock.at)}ms"`:''}>
      ${playerPlaceHTML(human)}
      ${shieldBlockHTML()}
      ${hint?`<div class="turn-whisper" role="status">${hint}</div>`:''}
      ${quip?.player==='p0'?`<div class="human-quip">${quip.text}</div>`:''}
      <div class="hand-frame"><span class="hand-overflow hand-overflow-start" aria-hidden="true"></span><div class="hand ${state.taki?.open?'taki-active':''} ${settings.playableHints?'hints':''}" data-hand-anchor role="group" aria-label="${en?`Your hand, ${cardCountLabel(shown.length)}`:`היד שלכם, ${cardCountLabel(shown.length)}`}">${handCards}</div><span class="hand-overflow hand-overflow-end" aria-hidden="true"></span></div>
    </footer>
    ${resultStageHTML()}
  </section>${choiceHTML()}${sheetHTML()}</main>`;
}
/* Round results stay on the table: seats reveal their hands, coins move to
   the winner's seat, and one small tally slip in the middle carries the
   numbers and the continue control. */
// The slip lies over the table below the seats (the open hands stay visible) and may cover your own hand, which is idle between rounds.
function resultStageHTML(){const slip=summaryHTML();return slip?`<div class="result-stage">${slip}</div>`:'';}
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
let lastSheetShown=null;
function sheetFrame(kind,titleId,title,body,{closeLabel}){const enter=lastSheetShown!==kind?'enter':'';lastSheetShown=kind;return `<div class="sheet-wrap ${kind}-wrap ${enter}" data-sheet-backdrop><article class="tavern-sheet ${kind}-sheet" role="dialog" aria-modal="true" aria-labelledby="${titleId}"><header class="sheet-head"><h2 id="${titleId}">${title}</h2><button class="sheet-close" data-close-sheet aria-label="${closeLabel}"><span aria-hidden="true">×</span></button></header>${body}</article></div>`;}
function miniTableHTML(n){return `<span class="mini-table" aria-hidden="true">${Array.from({length:n},(_,i)=>{const a=Math.PI/2+i*2*Math.PI/n,x=(50+44*Math.cos(a)).toFixed(1),y=(50+40*Math.sin(a)).toFixed(1),r=((a*180/Math.PI)-90).toFixed(0);return `<i class="${i?'':'you'}" style="--x:${x};--y:${y};--r:${r}deg"></i>`;}).join('')}</span>`;}
function quickSheetHTML(){
  const en=isEnglish();
  const body=`<p class="sheet-lede" id="players-label">${en?'One hand, no score, strangers from the common room. How crowded is the table?':'יד אחת, בלי ניקוד, זרים מהאולם המשותף. כמה צפוף השולחן?'}</p><div class="table-choice player-count" role="radiogroup" aria-labelledby="players-label">${[2,3,4,6].map(n=>`<button role="radio" data-players="${n}" aria-checked="${settings.playerCount===n}" aria-label="${en?`${n} players`:`${n} שחקנים`}" class="${settings.playerCount===n?'on':''}">${miniTableHTML(n)}<bdi>${n}</bdi></button>`).join('')}</div><div class="sheet-actions"><button class="primary-button" data-quick>${en?'Deal the cards':'לחלק קלפים'}</button></div>`;
  return sheetFrame('quick','quick-title',en?'Quick Play':'משחק מהיר',body,{closeLabel:en?'Close':'לסגור'});
}
function pauseHTML(){
  const en=isEnglish();
  const body=`<div class="pause-actions"><button class="primary-button" data-close-sheet>${en?'Back to the table':'חזרה לשולחן'}</button><div class="pause-links"><button class="secondary-button" data-pause-nav="rules">${en?'House rules':'חוקי הבית'}</button><i aria-hidden="true">·</i><button class="secondary-button" data-pause-nav="settings">${en?'Settings':'הגדרות'}</button></div><button class="text-button" data-home>${en?'Save and leave the table':'לשמור ולקום מהשולחן'}</button></div>`;
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
  const ruleColors={'shield.svg':'blue','curse-plus-2.svg':'red','turnabout.svg':'green','quickstep.svg':'yellow','crossbow.svg':'red'},ruleTypes={'shield.svg':'stop','curse-plus-2.svg':'plus2','turnabout.svg':'reverse','quickstep.svg':'plus','crossbow.svg':'taki','runed-crossbow.svg':'superTaki','rune.svg':'changeColor','king.svg':'king'};
  const ruleCard=asset=>cardHTML({id:`rule-${asset}`,type:ruleTypes[asset],color:ruleColors[asset]||'wild',value:null},cardOptions({highlight:false})).replace(/^<button/,'<span').replace(/<\/button>$/,'</span>').replace(/ aria-label="[^"]*"/,' aria-hidden="true"');
  const body=`<p class="sheet-lede">${en?'Match the colour, number or symbol. A drawn card waits for your next turn. Empty your hand to win.':'התאימו צבע, מספר או סמל. קלף שנמשך מחכה לתור הבא. מי שמרוקן את היד ראשון — מנצח.'}</p><div class="rule-colours" aria-label="${en?'The four colours':'ארבעת הצבעים'}">${DISPLAY_COLORS.map(c=>`<span class="rule-colour ${c}"><i>${colorRuneHTML(c,'rule-rune')}</i><b>${colorName(c)}</b></span>`).join('')}</div><div class="rule-grid">${cards.map(([asset,name,line])=>`<section class="rule-card">${ruleCard(asset)}<div><h3>${name}</h3><p>${line}</p></div></section>`).join('')}</div><section class="rule-scoring"><h3>${en?'Matches and scoring':'מבנה המשחק וניקוד'}</h3><p>${en?'Tavern Match and Duel last five rounds. The winner of each hand scores one point for every card left in the losing hands. A tie after round five is settled by one deciding hand. Quick Play is a single unscored hand for 2, 3, 4 or 6 players.':'משחק פונדק ודו־קרב נמשכים חמישה סיבובים. מנצח היד מקבל נקודה על כל קלף שנשאר בידיים המפסידות. שוויון אחרי הסיבוב החמישי מוכרע ביד אחת נוספת. משחק מהיר הוא יד אחת ללא ניקוד, ל־2, 3, 4 או 6 שחקנים.'}</p></section><div class="sheet-actions"><button class="primary-button" data-close-sheet>${view==='game'?(en?'Back to the table':'חזרה לשולחן'):(en?'Got it':'הבנתי')}</button></div>`;
  return sheetFrame('rules','rules-title',en?'House Rules':'חוקי הבית',body,{closeLabel:en?'Close rules':'לסגור את החוקים'});
}
function sheetHTML(){
  if(!sheet){lastSheetShown=null;return'';}
  if(sheet==='pause')return pauseHTML();
  if(sheet==='rules')return rulesHTML();
  if(sheet==='quick')return quickSheetHTML();
  return settingsHTML();
}
function settingsHTML(){
  const en=isEnglish(),c=en
    ?{title:'Settings',language:'Language',sound:'Sound',gameSounds:'Game sounds',music:'Music',ambience:'Tavern ambience',gameplay:'Table',dialogue:'Character voices & reactions',tavernGuests:'Voiced characters at the Tavern',guestModes:{off:'Off',sometimes:'Sometimes',often:'Every evening'},captions:'Captions',hints:'Highlight playable cards',tableMessages:'Hide table messages',accessibility:'Comfort',haptics:'Vibration',motion:'Reduce motion',contrast:'High card contrast',close:'Done',on:'On',off:'Off'}
    :{title:'הגדרות',language:'שפה',sound:'צליל',gameSounds:'צלילי משחק',music:'מוזיקה',ambience:'אווירת פונדק',gameplay:'שולחן',dialogue:'קולות ותגובות של דמויות',tavernGuests:'דמויות מדברות במשחק הפונדק',guestModes:{off:'כבוי',sometimes:'לפעמים',often:'בכל ערב'},captions:'כתוביות',hints:'הדגשת קלפים שאפשר לשחק',tableMessages:'הסתרת הודעות שולחן',accessibility:'נוחות',haptics:'רטט',motion:'צמצום תנועה',contrast:'ניגודיות גבוהה בקלפים',close:'סיום',on:'פועל',off:'כבוי'};
  const toggle=(label,key)=>`<div class="setting-row toggle-row"><span class="setting-label" id="setting-${key}">${label}</span><button class="switch ${settings[key]?'on':''}" role="switch" data-toggle="${key}" aria-labelledby="setting-${key}" aria-checked="${!!settings[key]}"><i aria-hidden="true"></i><span class="switch-state">${settings[key]?c.on:c.off}</span></button></div>`;
  const audio=(label,key,volumeKey)=>{const value=Math.round((settings[volumeKey]??0)*100);return `<div class="setting-row audio-row ${settings[key]?'':'muted'}"><span class="setting-label" id="setting-${key}">${label}</span><div class="audio-controls"><input id="volume-${volumeKey}" type="range" min="0" max="100" step="5" value="${value}" style="--value:${value}%" data-volume="${volumeKey}" data-channel="${key}" aria-labelledby="setting-${key}" aria-valuetext="${value}%"><output for="volume-${volumeKey}"><bdi>${value}%</bdi></output><button class="switch ${settings[key]?'on':''}" role="switch" data-toggle="${key}" aria-labelledby="setting-${key}" aria-checked="${!!settings[key]}"><i aria-hidden="true"></i><span class="switch-state">${settings[key]?c.on:c.off}</span></button></div></div>`;};
  const fromPause=view==='game';
  // Off · Sometimes · Every evening — how often the voiced cast sits in at a Tavern Match.
  const guestModeRow=`<div class="setting-row choice-row guest-mode-row"><span class="setting-label" id="setting-guest-mode">${c.tavernGuests}</span><div class="ink-choice" role="radiogroup" aria-labelledby="setting-guest-mode">${['off','sometimes','often'].map(mode=>`<button role="radio" data-guest-mode="${mode}" aria-checked="${settings.tavernGuestMode===mode}" class="${settings.tavernGuestMode===mode?'on':''}">${c.guestModes[mode]}</button>`).join('<i aria-hidden="true">·</i>')}</div></div>`;
  const body=`<div class="setting-row language-row"><span class="setting-label" id="setting-language">${c.language}</span><div class="ink-choice" role="radiogroup" aria-labelledby="setting-language"><button role="radio" data-language="he" aria-checked="${settings.language==='he'}" class="${settings.language==='he'?'on':''}" lang="he">עברית</button><i aria-hidden="true">·</i><button role="radio" data-language="en" aria-checked="${settings.language==='en'}" class="${settings.language==='en'?'on':''}" lang="en">English</button></div></div><section class="settings-section"><h3>${c.sound}</h3>${audio(c.gameSounds,'sound','sfxVolume')}${audio(c.music,'music','musicVolume')}${audio(c.ambience,'ambience','ambienceVolume')}</section><section class="settings-section"><h3>${c.gameplay}</h3>${toggle(c.dialogue,'dialogue')}${guestModeRow}${toggle(c.captions,'captions')}${toggle(c.hints,'playableHints')}${toggle(c.tableMessages,'hideTableMessages')}</section><section class="settings-section"><h3>${c.accessibility}</h3>${toggle(c.haptics,'haptics')}${toggle(c.motion,'reducedMotion')}${toggle(c.contrast,'highContrastCards')}</section><p class="build-mark">RUNES v${APP_VERSION}</p><div class="sheet-actions"><button class="secondary-button" data-close-sheet>${fromPause?(en?'Back to the pause menu':'חזרה לתפריט'):c.close}</button></div>`;
  return sheetFrame('settings','settings-title',c.title,body,{closeLabel:en?'Close settings':'לסגור את ההגדרות'});
}

let handScrollLeft=0,previousHandRects=new Map(),lastRenderedView=null;
const handFrame=()=>root.querySelector('.hand-frame');
function captureHandLayout(){const frame=handFrame(),hand=root.querySelector('.hand');if(!frame||!hand)return;handScrollLeft=frame.scrollLeft;previousHandRects=new Map([...hand.querySelectorAll(':scope > .card')].map(card=>[card.dataset.cardId,{rect:card.getBoundingClientRect(),tilt:parseFloat(card.style.getPropertyValue('--tilt'))||0}]));}
function render(){
  captureHandLayout();
  const characterStage=root.querySelector('.character-art-stage.character-table');
  document.documentElement.lang=settings.language;document.documentElement.dir=direction();document.documentElement.classList.toggle('hc-cards',!!settings.highContrastCards);
  document.querySelector('meta[name="description"]')?.setAttribute('content',isEnglish()?'RUNES — a card game around a tavern table: Quick Play, a five-round Tavern Match, and Duels with the regulars.':'רונות — משחק קלפים סביב שולחן פונדק: משחק מהיר, משחק פונדק בן חמישה סיבובים ודו־קרב מול הקבועים.');
  const openSheet=root.querySelector('.tavern-sheet'),sheetScroll=openSheet?{kind:openSheet.className,top:openSheet.scrollTop}:null;
  root.innerHTML=view==='home'?homeHTML():view==='duelSelect'?duelSelectHTML():gameHTML();
  // Changing screens is a change of light, not a page load: the new view comes up out of the dark.
  if(view!==lastRenderedView){root.firstElementChild?.classList.add('screen-enter');lastRenderedView=view;}
  // Re-rendering while a sheet is open (a toggle, a language switch) keeps its scroll position.
  const reopened=root.querySelector('.tavern-sheet');if(sheetScroll&&reopened&&reopened.className===sheetScroll.kind)reopened.scrollTop=sheetScroll.top;
  const placeholder=root.querySelector('[data-character-stage-placeholder]');if(characterStage&&placeholder){placeholder.replaceWith(characterStage);syncCharacterStage(characterStage);}
  bind();
}
function pauseGameTimers({leaving=false}={}){clearTimeout(tavernIdleTimer);if(tavernGuests)tavernGuests.speaking=false;clearTimeout(botTimer);clearTimeout(characterSlowTimer);clearTimeout(duelIdleTimer);clearTimeout(duelReactionTimer);clearTimeout(eventTimer);clearTimeout(quipTimer);clearTimeout(roundEndTimer);clearCharacterTimers();audioSystem.stopVoice({restoreMusic:!leaving});runActiveClock(false);}
function resumeGameTimers(){
  if(eventBanner)eventTimer=setTimeout(()=>{eventBanner=null;captionLine='';render();},settings.reducedMotion?200:900);
  if(quip)quipTimer=setTimeout(()=>{quip=null;render();},1800);
  if(session?.phase!=='round'&&!roundResultVisible)roundEndTimer=setTimeout(revealRoundResult,settings.reducedMotion?80:700);
  runActiveClock(true);scheduleGame();scheduleDuelIdle();scheduleTavernIdle();
}
function goHome(){rerollDuelFeature();flushPendingAction();persist();sessionEpoch++;pauseGameTimers({leaving:true});clearTimeout(deckAudioTimer);audioSystem.stopAmbience();audioSystem.stopMusic(true);view='home';sheet=null;selected=null;render();}
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
  const compact=compactLayout(),cardWidth=cards[0].offsetWidth||96,frameStyle=getComputedStyle(frame),inner=frame.clientWidth-parseFloat(frameStyle.paddingLeft)-parseFloat(frameStyle.paddingRight),available=Math.max(cardWidth,inner-(compact?0:cardWidth*.3));
  const {browse,overlap,tilt,rise}=calculateHandLayout({count,cardWidth,available,compact});
  hand.dataset.layout=browse?'browse':'fan';frame.classList.toggle('browsing',browse);
  cards.forEach((card,index)=>{const offset=index-(count-1)/2;card.style.setProperty('--overlap',`${overlap.toFixed(1)}px`);card.style.setProperty('--tilt',`${(offset*tilt).toFixed(2)}deg`);card.style.setProperty('--rise',`${(Math.abs(offset)**1.6*rise).toFixed(1)}px`);});
  if(browse){
    frame.scrollLeft=Math.min(handScrollLeft,Math.max(0,frame.scrollWidth-frame.clientWidth));
    // Keep a newly drawn card in view instead of letting it land off-screen.
    const arrived=hand.querySelector('.card.landing');
    if(arrived){const a=arrived.getBoundingClientRect(),f=frame.getBoundingClientRect();if(a.left<f.left||a.right>f.right)frame.scrollLeft+=a.left<f.left?a.left-f.left-12:a.right-f.right+12;}
  }
  frame.onscroll=updateHandOverflow;updateHandOverflow();
  // Cards slide to their new places (making room for an arriving card, closing a gap) instead of jumping.
  if(!motionReduced())cards.forEach(card=>{const before=previousHandRects.get(card.dataset.cardId);if(!before)return;const after=card.getBoundingClientRect(),dx=before.rect.left+before.rect.width/2-after.left-after.width/2,dy=before.rect.top+before.rect.height/2-after.top-after.height/2,turn=before.tilt-(parseFloat(card.style.getPropertyValue('--tilt'))||0);if(Math.abs(dx)>1.5||Math.abs(dy)>1.5||Math.abs(turn)>.2)card.animate([{translate:`${dx}px ${dy}px`,rotate:`${turn}deg`},{translate:'0 0',rotate:'0deg'}],{duration:320,easing:'cubic-bezier(.25,.7,.3,1)'});});
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
  root.querySelectorAll('[data-guest-mode]').forEach(b=>b.onclick=()=>{const mode=b.dataset.guestMode;settings.tavernGuestMode=mode;saveSettings(settings);if(mode==='off'&&tavernGuests?.speaking)audioSystem.stopVoice();render();requestAnimationFrame(()=>root.querySelector(`[data-guest-mode="${mode}"]`)?.focus({preventScroll:true}));});
  root.querySelectorAll('[data-language]').forEach(b=>b.onclick=()=>{const language=b.dataset.language;settings.language=language;hint='';screenReaderLine='';captionLine='';saveSettings(settings);if(isAuthoredDuel())void audioSystem.preloadVoice(language,Object.keys(authoredPack().voiceLibrary));render();requestAnimationFrame(()=>root.querySelector(`[data-language="${language}"]`)?.focus({preventScroll:true}));});
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
  root.querySelector('[data-duel]')?.addEventListener('click',()=>{view='duelSelect';sheet=null;render();void authoredCharacter(featuredDuelOpponent())?.preload();});
  root.querySelectorAll('[data-opponent]').forEach(b=>b.onclick=()=>startDuelWith(b.dataset.opponent,b));
  // A random regular: one of the ten unvoiced opponents, never the same twice running.
  root.querySelector('[data-random-opponent]')?.addEventListener('click',event=>{const pool=DUEL_OPPONENTS.filter(item=>!AUTHORED_CHARACTERS[item.id]).map(item=>item.id),fresh=pool.filter(id=>id!==settings.lastRandomOpponent),id=fresh[Math.floor(Math.random()*fresh.length)];settings.lastRandomOpponent=id;startDuelWith(id,event.currentTarget);});
  bindDuelCarousel();
  root.querySelector('[data-tavern]')?.addEventListener('click',()=>{clearMatch();startSession('tavern');});
  root.querySelector('[data-quick]')?.addEventListener('click',()=>{clearMatch();startSession('quick');});
  root.querySelector('[data-resume]')?.addEventListener('click',event=>{const button=event.currentTarget;if(button.classList.contains('loading'))return;button.classList.add('loading');button.setAttribute('aria-busy','true');const saved=loadMatch();startSession(saved?.mode||'tavern',saved);});
  root.querySelector('[data-next]')?.addEventListener('click',startNextHand);
  root.querySelector('[data-rematch]')?.addEventListener('click',()=>{ragnaStakesRaised=isRagnaDuel()&&RAGNA_DOUBLE_LINES.includes(characterController?.snapshot().history.at(-1)?.voice);clearMatch();startSession('duel');});
  root.querySelector('[data-choose-opponent]')?.addEventListener('click',()=>{clearMatch();goHome();view='duelSelect';render();});
  root.querySelectorAll('[data-home]').forEach(b=>b.onclick=goHome);
  root.querySelector('[data-draw]')?.addEventListener('click',()=>{if(state?.phase==='playing'&&currentPlayer(state).id==='p0'&&(!state.taki?.open||crossbowAwaitsPickup(state))){tapFeedback('draw',settings);submit({type:ACTIONS.DRAW,playerId:'p0'});}else if(state?.taki?.open&&currentPlayer(state).id==='p0'){hint=isEnglish()?'Fire the Crossbow to end your turn':'כדי לסיים את התור — לירות בקשת';render();setTimeout(()=>{hint='';render();},1400);}});
  root.querySelector('[data-close-taki]')?.addEventListener('click',()=>{tapFeedback('takiOpen',settings);submit({type:ACTIONS.END_TURN,playerId:'p0'});});
  root.querySelector('[data-speed-bots]')?.addEventListener('pointerdown',event=>{if(!pendingBotTurn||event.target.closest('button,.card,[role="dialog"]'))return;clearTimeout(botTimer);const pending=pendingBotTurn;runBotTurn(pending.playerId,pending.epoch,pending.scheduledTurn);});
  root.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>{tapFeedback('color',settings);submit({type:ACTIONS.CHOOSE_COLOR,playerId:'p0',color:b.dataset.color});});
  bindHand();
  const firstGem=root.querySelector('.color-choice .gem');if(firstGem&&!root.contains(document.activeElement)||firstGem&&document.activeElement===document.body)firstGem.focus({preventScroll:true});
  layoutHand();flyLandingCards();animateDirectionRing();
  if(view==='game'&&roundResultVisible&&session?.phase!=='round'){animateCoinsToWinner();const slip=root.querySelector('.result-slip.enter .primary-button');if(slip&&!sheet)slip.focus({preventScroll:true});}
}
function bindHand(){
  let hintTimer=0;
  const rejectCard=card=>{hint=rejectReason(state.players[0].hand.find(c=>c.id===card.dataset.cardId));feedback('invalid',settings);render();clearTimeout(hintTimer);hintTimer=setTimeout(()=>{hint='';render();},1300);};
  root.querySelectorAll('.hand .card').forEach(card=>{
    const legal=card.classList.contains('legal'),play=()=>{if(legal&&!motionLocked){tapFeedback('play',settings);submit({type:ACTIONS.PLAY,playerId:'p0',cardId:card.dataset.cardId});}};
    let startX=0,startY=0,lastY=0,lastTime=0,velocity=0,dragging=false,suppressClick=false;
    card.onclick=e=>{if(suppressClick){suppressClick=false;e.preventDefault();return;}if(!legal){rejectCard(card);return;}play();};
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
window.RunesQA=Object.freeze({snapshot:()=>({view,sheet,motionLocked,pendingAction:!!pendingAction,pendingBotTurn:!!pendingBotTurn,roundResultVisible,selected,hint,sessionPhase:session?.phase||null,turn:state?.turn??null,current:state?currentPlayer(state).id:null,blockAiUntil:Math.max(0,blockAiUntil-Date.now()),voice:audioSystem.voiceName||null,voiceInterruptions:audioSystem.voiceInterruptions||0,guests:tavernGuests?Object.fromEntries(Object.entries(tavernGuests.seats).map(([seat,item])=>[seat,item.id])):null,guestFaces:tavernGuests?Object.fromEntries(Object.entries(tavernGuests.seats).map(([seat,item])=>[seat,item.face])):null,guestSpeaking:!!tavernGuests?.speaking,characterExpression:isAuthoredDuel()?characterExpression:null,characterCaption:characterCaptionLine||null,quip:quip?{player:quip.player,text:quip.text,guest:!!quip.guest}:null,omen:veyraOmens?.snapshot()||null})});
// Developer hooks (console only). Each acts only while that character is at the table.
function characterDebug(id,extra={}){
  const pack=AUTHORED_CHARACTERS[id],active=()=>authoredPack()?.id===id&&characterController;
  return Object.freeze({
    states:()=>active()?characterController.snapshot():null,
    forceState:value=>{if(!active())return null;characterController.setState(value);setCharacterExpression(characterController.defaultExpression());return characterController.snapshot();},
    trigger:value=>{if(!active())return null;const found=pack.reactions.find(item=>item.id===value||item.voice===value);return found?performCharacterReaction(characterController.force(found.id)):null;},
    expression:value=>{if(!active()||!pack.expressions.includes(value))return false;setCharacterExpression(value);return true;},
    simulateOneCard:()=>active()?runCharacter('player_one_card',{},true):null,
    simulateRoundWin:()=>active()?runCharacter('round_win',{},true):null,
    simulateRoundLoss:()=>active()?runCharacter('round_loss',{},true):null,
    simulateLoss:()=>active()?runCharacter('match_loss',{},true):null,
    simulateIdle:()=>active()?runCharacter('idle_quiet'):null,
    reactions:pack.reactions,
    expressions:pack.expressions,
    ...extra
  });
}
window.BrammDebug=characterDebug('bramm',{simulateWin:()=>isBrammDuel()?runCharacter('win',{close:true,survivedOneCard:true},true):null});
window.EdrinDebug=characterDebug('edrin',{
  simulateWin:()=>isEdrinDuel()?runCharacter('match_win',{},true):null,
  simulateEdrinOneCard:()=>isEdrinDuel()?runCharacter('edrin_one_card',{},true):null,
  simulateBrutal:()=>isEdrinDuel()?runCharacter('brutal_move',{},true):null,
  // Walk the expression set one at a time (default 1.6 s each) to check anchoring.
  previewExpressions:(ms=1600)=>{if(!isEdrinDuel())return null;AUTHORED_CHARACTERS.edrin.expressions.forEach((name,index)=>{const timer=setTimeout(()=>setCharacterExpression(name),index*ms);characterSequenceTimers.push(timer);});return AUTHORED_CHARACTERS.edrin.expressions.length;},
  history:()=>isEdrinDuel()?characterController.snapshot().history:null,
  cooldown:()=>isEdrinDuel()?characterController.cooldown():null,
  setLanguage:language=>{settings.language=language==='he'?'he':'en';saveSettings(settings);if(isEdrinDuel())void audioSystem.preloadVoice(settings.language,Object.keys(AUTHORED_CHARACTERS.edrin.voiceLibrary));render();return settings.language;},
  // Point a voice at a file that does not exist to check the silent fallback.
  markVoiceMissing:(voice,missing=true)=>debugMarkEdrinVoiceMissing(voice,missing)
});
window.RagnaDebug=characterDebug('ragna',{
  simulateWin:()=>isRagnaDuel()?runCharacter('match_win',{close:true},true):null,
  simulateEasyRoundWin:()=>isRagnaDuel()?runCharacter('round_win',{easy:true},true):null,
  simulateRagnaOneCard:()=>isRagnaDuel()?runCharacter('ragna_one_card',{},true):null,
  simulatePlayerDraw:()=>isRagnaDuel()?runCharacter('player_draw',{amount:4,longer:true},true):null,
  simulateRagnaDraw:(forced=true)=>isRagnaDuel()?runCharacter('ragna_draw',{amount:forced?2:1,forced},true):null,
  simulateSelfMistake:()=>isRagnaDuel()?runCharacter('self_mistake',{drew:true},true):null,
  simulateSlowPlayer:()=>isRagnaDuel()?runCharacter('slow_player',{},true):null,
  simulateNoise:()=>{if(!isRagnaDuel())return null;const r=characterController.force('noise_01');return performCharacterReaction(r);},
  // The deliberate two-beat gag: 04, a beat of tavern silence, then 05.
  simulateTavernGag:()=>{if(!isRagnaDuel())return null;const r=characterController.force('idle_04');return performCharacterReaction({...r,followUp:{id:'idle_05',delay:900}});},
  previewExpressions:(ms=1600)=>{if(!isRagnaDuel())return null;AUTHORED_CHARACTERS.ragna.expressions.forEach((name,index)=>{const timer=setTimeout(()=>setCharacterExpression(name),index*ms);characterSequenceTimers.push(timer);});return AUTHORED_CHARACTERS.ragna.expressions.length;},
  history:()=>isRagnaDuel()?characterController.snapshot().history:null,
  cooldown:()=>isRagnaDuel()?characterController.cooldown():null,
  setLanguage:language=>{settings.language=language==='he'?'he':'en';saveSettings(settings);if(isRagnaDuel())void audioSystem.preloadVoice(settings.language,Object.keys(AUTHORED_CHARACTERS.ragna.voiceLibrary));render();return settings.language;},
  markVoiceMissing:(voice,missing=true)=>debugMarkRagnaVoiceMissing(voice,missing)
});
// Kesh: QA can force every line (in either language), every face, the stone tell and
// each game situation, and read back the scheduler and any missing asset.
window.KeshDebug=characterDebug('kesh',{
  simulateWin:()=>isKeshDuel()?runCharacter('match_win',{close:true},true):null,
  simulateKeshOneCard:()=>isKeshDuel()?runCharacter('kesh_one_card',{},true):null,
  simulatePlayerOneCard:()=>isKeshDuel()?runCharacter('player_one_card',{},true):null,
  simulateCurse:(amount=2)=>isKeshDuel()?runCharacter('curse',{amount,haul:amount>=4},true):null,
  simulateSkip:()=>isKeshDuel()?runCharacter('skip',{},true):null,
  simulateReverse:()=>isKeshDuel()?runCharacter('reverse',{},true):null,
  simulateKing:(broke=false)=>isKeshDuel()?runCharacter('king',{broke},true):null,
  simulateOmenFailure:()=>isKeshDuel()?runCharacter('omen_failed',{told:true},true):null,
  simulateSetback:(haul=false)=>isKeshDuel()?runCharacter('setback',{haul},true):null,
  simulatePlayerDraw:()=>isKeshDuel()?runCharacter('player_draw',{amount:4,haul:true},true):null,
  simulateKeshDraw:(forced=true)=>isKeshDuel()?runCharacter('kesh_draw',{amount:forced?2:1,forced},true):null,
  simulatePlayerGoodMove:(big=true)=>isKeshDuel()?runCharacter('player_good_move',{big},true):null,
  simulateKeshGoodMove:()=>isKeshDuel()?runCharacter('kesh_good_move',{keshCount:3},true):null,
  simulateSlowPlayer:()=>isKeshDuel()?runCharacter('slow_player',{},true):null,
  // The silent stone beat as it plays before a weighty card. after: null | 'omen_reading' | 'omen_realization'.
  simulateRuneTell:({speak=false,after=null}={})=>{if(!keshSeatId()||!state)return null;const plan={playerId:keshSeatId(),turn:state.turn,state,tell:{touch:'omen_touch',after,lead:620,speak},shown:false};stageKeshTell(plan,sessionEpoch,620);return plan.tell;},
  previewExpressions:(ms=1600)=>{if(!isKeshDuel())return null;AUTHORED_CHARACTERS.kesh.expressions.forEach((name,index)=>{const timer=setTimeout(()=>setCharacterExpression(name),index*ms);characterSequenceTimers.push(timer);});return AUTHORED_CHARACTERS.kesh.expressions.length;},
  history:()=>isKeshDuel()?characterController.snapshot().history:tavernGuests?.director.snapshot().log.filter(item=>item.guest==='kesh')||null,
  cooldown:()=>isKeshDuel()?characterController.cooldown():tavernGuests?.director.cooldown()||null,
  locale:()=>settings.language,
  setLanguage:language=>{settings.language=language==='he'?'he':'en';saveSettings(settings);if(keshSeatId())void audioSystem.preloadVoice(settings.language,Object.keys(AUTHORED_CHARACTERS.kesh.voiceLibrary));render();return settings.language;},
  // Play one line in a given language, then restore the player's language.
  triggerIn:(id,language='he')=>{if(!isKeshDuel())return null;const previous=settings.language;settings.language=language==='he'?'he':'en';const found=AUTHORED_CHARACTERS.kesh.reactions.find(item=>item.id===id||item.voice===id);const result=found?performCharacterReaction(characterController.force(found.id)):null;settings.language=previous;return result;},
  markVoiceMissing:(voice,missing=true)=>debugMarkKeshVoiceMissing(voice,missing),
  // Every expression and every voice file for the active language, checked over the network.
  missingAssets:async()=>{const pack=AUTHORED_CHARACTERS.kesh,locale=settings.language,urls=[...pack.expressions.map(name=>[`expression:${name}`,keshExpressionURL(name)]),...Object.keys(pack.voiceLibrary).map(voice=>[`voice:${voice}:${locale}`,pack.resolveVoice(voice,locale)?.src]).filter(([,url])=>url)];const missing=[];await Promise.all(urls.map(async([label,url])=>{try{const response=await fetch(url,{method:'HEAD',cache:'no-store'});if(!response.ok)missing.push(label);}catch{missing.push(label);}}));return {locale,checked:urls.length,missing:missing.sort(),unrecorded:keshUnrecorded(),forcedMissing:keshDebugMissingVoices()};},
  plan:()=>keshPlan?{turn:keshPlan.turn,major:keshPlan.major,wait:Math.round(keshPlan.wait),tell:keshPlan.tell,shown:keshPlan.shown}:null,
  tellMemory:()=>({...keshTellMemory,pending:keshTellPending})
});
// Veyra and Gorvan share one set of console hooks (they share one data-driven pack shape).
function packDebug(id,markMissing){
  const pack=AUTHORED_CHARACTERS[id],active=()=>authoredPack()?.id===id&&characterController,seat=()=>active()?'p1':guestSeatOf(id);
  return {
    simulateWin:()=>active()?runCharacter('match_win',{close:true,...(veyraOmens?.story()||{})},true):null,
    simulatePlayerOneCard:()=>active()?runCharacter('player_one_card',{},true):null,
    simulateOwnOneCard:()=>active()?runCharacter('own_one_card',{},true):null,
    simulateCurseTaken:(amount=2)=>active()?runCharacter('curse_taken',{amount},true):null,
    simulateCurseLanded:(amount=2)=>active()?runCharacter('curse_landed',{amount,haul:amount>=4},true):null,
    simulateStopTaken:()=>active()?runCharacter('stop_taken',{},true):null,
    simulateStopGiven:(urgent=true)=>active()?runCharacter('stop_given',{urgent},true):null,
    simulateKing:(broke=false)=>active()?runCharacter('king',{own:false,broke},true):null,
    simulatePlayerDraw:(haul=true)=>active()?runCharacter('player_draw',{amount:haul?4:1,haul},true):null,
    simulateOwnDraw:(forced=true)=>active()?runCharacter('own_draw',{amount:forced?2:1,forced},true):null,
    simulatePlayerGoodMove:(big=true)=>active()?runCharacter('player_good_move',{big,hurt:big},true):null,
    simulateOwnGoodMove:()=>active()?runCharacter('own_good_move',{ownCount:3},true):null,
    simulateSlowPlayer:()=>active()?runCharacter('slow_player',{},true):null,
    previewExpressions:(ms=1600)=>{if(!active())return null;pack.expressions.forEach((name,index)=>{const timer=setTimeout(()=>setCharacterExpression(name),index*ms);characterSequenceTimers.push(timer);});return pack.expressions.length;},
    history:()=>active()?characterController.snapshot().history:tavernGuests?.director.snapshot().log.filter(item=>item.guest===id)||null,
    cooldown:()=>active()?characterController.cooldown():tavernGuests?.director.cooldown()||null,
    seat,locale:()=>settings.language,
    setLanguage:language=>{settings.language=language==='he'?'he':'en';saveSettings(settings);if(seat())void audioSystem.preloadVoice(settings.language,Object.keys(pack.voiceLibrary));render();return settings.language;},
    // Play one line in a given language, then restore the player's language.
    triggerIn:(lineId,language='he')=>{if(!active())return null;const previous=settings.language;settings.language=language==='he'?'he':'en';const found=pack.reactions.find(item=>item.id===lineId||item.voice===lineId);const result=found&&pack.resolveVoice(found.voice,settings.language)!==null?performCharacterReaction(characterController.force(found.id)):null;settings.language=previous;return result;},
    markVoiceMissing:(voice,missing=true)=>markMissing(voice,missing),
    // Every expression and every voice file for the active language, checked over the network.
    missingAssets:async()=>{const locale=settings.language,urls=[...pack.expressions.map(name=>[`expression:${name}`,pack.expressionURL(name)]),...Object.keys(pack.voiceLibrary).map(voice=>[`voice:${voice}:${locale}`,pack.resolveVoice(voice,locale)?.src]).filter(([,url])=>url)];const missing=[];await Promise.all(urls.map(async([label,url])=>{try{const response=await fetch(url,{method:'HEAD',cache:'no-store'});if(!response.ok)missing.push(label);}catch{missing.push(label);}}));return {locale,checked:urls.length,missing:missing.sort(),excluded:Object.keys(pack.voiceLibrary).filter(voice=>!pack.resolveVoice(voice,locale))};}
  };
}
// Veyra: every line in either language, every face, and the omen book — declare, land, miss.
window.VeyraDebug=characterDebug('veyra',{
  ...packDebug('veyra',debugMarkVeyraVoiceMissing),
  englishOnly:VEYRA_ENGLISH_ONLY,
  omens:()=>veyraOmens?.snapshot()||null,
  // Declare a given omen now (draw · red · turn · regret), as if she had just read it.
  declareOmen:(kind='draw')=>{if(!veyraOmens)return null;const line=`veyra_${{draw:'omen_01',red:'omen_02',turn:'omen_03',regret:'omen_04'}[kind]}`;if(isVeyraDuel()){const reaction=AUTHORED_CHARACTERS.veyra.reactions.find(item=>item.voice===line);performCharacterReaction(characterController.force(reaction.id));}else if(tavernGuests){const plan=tavernGuests.director.force(line);if(plan)performGuestLines(plan.lines);}return veyraOmens.declare(kind);},
  simulateOmenHit:()=>isVeyraDuel()?runCharacter('omen_hit',{...veyraOmens?.story()},true):tavernEvent('omen_hit',{actor:guestSeatOf('veyra')}),
  simulateOmenMiss:()=>isVeyraDuel()?runCharacter('omen_miss',{...veyraOmens?.story()},true):tavernEvent('omen_miss',{actor:guestSeatOf('veyra')}),
  missingFallbacks:veyraDebugMissingVoices
});
// Gorvan: his lines (English voice; Hebrew bubbles), faces, title progression and sound accents.
window.GorvanDebug=characterDebug('gorvan',{
  ...packDebug('gorvan',debugMarkGorvanVoiceMissing),
  // The intro as a later meeting would play it, at a given step of the title joke (1–4).
  simulateTitle:(step=1)=>isGorvanDuel()?runCharacter('intro',{titleStep:Math.max(1,Math.min(4,step))},true):null,
  titleStep:()=>settings.gorvanTitleStep||0,
  sfx:name=>{const key={entrance:'gorvanEntrance',pulse:'gorvanPulse',accent:'gorvanAccent',curse:'gorvanCurse'}[name];if(!key)return null;audioSystem.setSettings(settings);return audioSystem.play(key);},
  sfxMemory:()=>({...gorvanSfx,pulsed:[...gorvanSfx.pulsed]})
});
// Voiced Tavern guests (console). startWith(['bramm','ragna']) seats chosen guests at a fresh
// Tavern Match; say/banter/face force a line, an exchange or a face; event(type,context)
// replays a table event through the director exactly as play would.
window.TavernDebug=Object.freeze({
  startWith:(ids=[])=>{clearMatch();return startSession('tavern',null,{guests:ids.slice(0,3)});},
  guests:()=>tavernGuests?Object.fromEntries(Object.entries(tavernGuests.seats).map(([seat,item])=>[seat,{id:item.id,face:item.face}])):null,
  state:()=>tavernGuests?{...tavernGuests.director.snapshot(),speaking:tavernGuests.speaking,muted:guestsMuted(),locale:settings.language}:null,
  cooldown:()=>tavernGuests?.director.cooldown()||null,
  event:(type,context={})=>tavernEvent(type,context),
  say:voice=>{if(!tavernGuests)return null;const plan=tavernGuests.director.force(voice);if(plan)performGuestLines(plan.lines);return plan?.lines.map(line=>line.voice)||null;},
  banter:id=>{if(!tavernGuests)return null;const plan=tavernGuests.director.forceBanter(id);if(plan)performGuestLines(plan.lines);return plan?.lines.map(line=>line.voice)||null;},
  face:(seat,expression,ms=2400)=>{if(!tavernGuests?.seats[seat])return false;setGuestFace(seat,expression,ms);return tavernGuests.seats[seat].face;},
  setLanguage:language=>{settings.language=language==='he'?'he':'en';saveSettings(settings);if(tavernGuests)void audioSystem.preloadVoice(settings.language,[...new Set(Object.values(tavernGuests.seats).map(item=>item.id))].flatMap(allTavernVoices));render();return settings.language;},
  // Every face and every allowlisted Tavern voice of the seated guests, for the active language.
  missingAssets:async()=>{if(!tavernGuests)return null;const locale=settings.language,ids=[...new Set(Object.values(tavernGuests.seats).map(item=>item.id))],urls=ids.flatMap(id=>{const pack=AUTHORED_CHARACTERS[id];return [...pack.expressions.map(name=>[`${id}:face:${name}`,pack.expressionURL(name)]),...allTavernVoices(id).map(voice=>[`${id}:voice:${voice}:${locale}`,pack.resolveVoice(voice,locale)?.src]).filter(([,url])=>url)];});const missing=[];await Promise.all(urls.map(async([label,url])=>{try{const response=await fetch(url,{method:'HEAD',cache:'no-store'});if(!response.ok)missing.push(label);}catch{missing.push(label);}}));return {locale,checked:urls.length,missing:missing.sort()};}
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
// Warm the card-face artwork so masked SVGs never paint blank on first use.
for(const name of ['number-1','number-3','number-4','number-5','number-6','number-7','number-8','number-9','shield','curse-plus-2','turnabout','quickstep','crossbow','runed-crossbow','rune','king']){const image=new Image();image.decoding='async';image.src=`./assets/cards/${name}.svg`;}
registerWebMCP();render();
