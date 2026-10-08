// Authored duel characters share one framework: a reaction table and controller
// per character, plus a single expression stage, speech bubble and in-game Web
// Audio voice channel in app.js. Each entry here describes only what is
// different about that character's staging; nothing is duplicated per language.
import { BRAMM_EXPRESSIONS, BRAMM_REACTIONS, BRAMM_VOICE_LIBRARY, brammExpressionURL, createBrammController, preloadBrammExpressions, resolveBrammReaction, resolveBrammVoice } from './bramm.js';
import { RAGNA_EXPRESSIONS, RAGNA_REACTIONS, RAGNA_VOICE_LIBRARY, createRagnaController, preloadRagnaExpressions, ragnaExpressionURL, resolveRagnaReaction, resolveRagnaVoice } from './ragna.js';
import { KESH_EXPRESSIONS, KESH_REACTIONS, KESH_VOICE_LIBRARY, createKeshController, keshExpressionURL, preloadKeshExpressions, resolveKeshReaction, resolveKeshVoice } from './kesh.js';
import { EDRIN_EXPRESSIONS, EDRIN_REACTIONS, EDRIN_VOICE_LIBRARY, createEdrinController, edrinExpressionURL, preloadEdrinExpressions, resolveEdrinReaction, resolveEdrinVoice } from './edrin.js';
import { VEYRA_EXPRESSIONS, VEYRA_REACTIONS, VEYRA_VOICE_LIBRARY, createVeyraController, preloadVeyraExpressions, resolveVeyraReaction, resolveVeyraVoice, veyraExpressionURL } from './veyra.js';
import { GORVAN_EXPRESSIONS, GORVAN_REACTIONS, GORVAN_VOICE_LIBRARY, createGorvanController, gorvanExpressionURL, preloadGorvanExpressions, resolveGorvanReaction, resolveGorvanVoice } from './gorvan.js';
import { BOUNTY_HUNTER_EXPRESSIONS, BOUNTY_HUNTER_LOOKS, BOUNTY_HUNTER_REACTIONS, BOUNTY_HUNTER_VOICE_LIBRARY, bountyHunterEventFor, bountyHunterExpressionURL, createBountyHunterController, preloadBountyHunterExpressions, resolveBountyHunterReaction, resolveBountyHunterVoice } from './bounty-hunter.js';
import { banterSpeaker, resolveBanterVoice } from './banter.js';

const bramm=Object.freeze({
  id:'bramm',label:'Bramm',
  expressions:BRAMM_EXPRESSIONS,defaultExpression:'01_default_smug',expressionURL:brammExpressionURL,preload:preloadBrammExpressions,
  reactions:BRAMM_REACTIONS,voiceLibrary:BRAMM_VOICE_LIBRARY,resolveReaction:resolveBrammReaction,resolveVoice:resolveBrammVoice,
  createController:({initial,settings})=>createBrammController({initial:{...(initial||{}),recentVoices:initial?.recentVoices||settings?.characterRecentVoices?.bramm||settings?.brammRecentVoices||[]}}),
  holdsExpression:controller=>['panic','defeated'].includes(controller?.snapshot().state),
  // A short visual beat before certain lines land.
  lead(trigger,reaction){
    if(trigger==='match_loss')return {expression:'29_defeated_disbelief',hold:Math.max(1800,reaction.duration),delay:620};
    if(trigger==='player_one_card')return {expression:'36_mug_stops_midair',delay:700};
    if(trigger==='win'&&reaction.id==='win_04')return {voiceDelay:260};
    return null;
  },
  idleTriggers:({ahead})=>[['idle_quiet',{}],['idle_taunt',{ahead}]],
  idleFallback:(controller,{ahead})=>({expression:ahead?'34_drinking_relaxed':'35_drinking_nervous',duration:2800}),
  slowPlayerAfter:11000,
  finalResultBeat:1850,activeClock:false,
  introDelay:1250
});

const edrin=Object.freeze({
  id:'edrin',label:'Edrin',
  expressions:EDRIN_EXPRESSIONS,defaultExpression:'default',expressionURL:edrinExpressionURL,preload:preloadEdrinExpressions,
  reactions:EDRIN_REACTIONS,voiceLibrary:EDRIN_VOICE_LIBRARY,resolveReaction:resolveEdrinReaction,resolveVoice:resolveEdrinVoice,
  createController:({initial,settings,now})=>createEdrinController({now,initial:{...(initial||{}),recentVoices:initial?.recentVoices||settings?.characterRecentVoices?.edrin||[]}}),
  holdsExpression:controller=>!!controller?.holdsExpression?.(),
  lead(trigger){
    // His face gets there first; the words, if any, follow a beat later.
    if(trigger==='player_one_card')return {delay:650};
    if(trigger==='brutal_move'||trigger==='edrin_one_card')return {delay:520};
    return null;
  },
  idleTriggers:()=>[['idle_quiet',{}]],
  idleFallback:(controller,{concerned})=>controller?.observe('idle_beat',{concerned}),
  finalResultBeat:1500,activeClock:true,
  introDelay:1400
});

const ragna=Object.freeze({
  id:'ragna',label:'Ragna',
  expressions:RAGNA_EXPRESSIONS,defaultExpression:'default_focused',expressionURL:ragnaExpressionURL,preload:preloadRagnaExpressions,
  reactions:RAGNA_REACTIONS,voiceLibrary:RAGNA_VOICE_LIBRARY,resolveReaction:resolveRagnaReaction,resolveVoice:resolveRagnaVoice,
  createController:({initial,settings,now})=>createRagnaController({now,initial:{...(initial||{}),recentVoices:initial?.recentVoices||settings?.characterRecentVoices?.ragna||[]}}),
  holdsExpression:controller=>!!controller?.holdsExpression?.(),
  lead(trigger){
    // Her face hits first — a fast flash — and the words land right behind it.
    if(trigger==='player_one_card')return {delay:480};
    if(trigger==='ragna_one_card'||trigger==='self_mistake')return {delay:420};
    return null;
  },
  idleTriggers:()=>Math.random()<.5?[['idle_quiet',{}],['tavern_outburst',{}]]:[['tavern_outburst',{}],['idle_quiet',{}]],
  idleFallback:(controller,{concerned})=>controller?.observe('idle_beat',{concerned}),
  // A player who sits on a decision gets "Concentrate." / "Eyes on the table." (sometimes just the look).
  slowPlayerAfter:10000,
  finalResultBeat:1600,activeClock:true,
  introDelay:1300
});

const kesh=Object.freeze({
  id:'kesh',label:'Kesh',
  expressions:KESH_EXPRESSIONS,defaultExpression:'default_observant',expressionURL:keshExpressionURL,preload:preloadKeshExpressions,
  reactions:KESH_REACTIONS,voiceLibrary:KESH_VOICE_LIBRARY,resolveReaction:resolveKeshReaction,resolveVoice:resolveKeshVoice,
  createController:({initial,settings,now})=>createKeshController({now,initial:{...(initial||{}),recentVoices:initial?.recentVoices||settings?.characterRecentVoices?.kesh||[]}}),
  holdsExpression:controller=>!!controller?.holdsExpression?.(),
  lead(trigger){
    // He looks first and takes his time; the words, when there are any, come after.
    if(trigger==='player_one_card')return {delay:720};
    if(trigger==='kesh_one_card'||trigger==='omen_failed')return {delay:560};
    return null;
  },
  idleTriggers:()=>[['idle_quiet',{}]],
  idleFallback:(controller,{concerned})=>controller?.observe('idle_beat',{concerned}),
  // A player who sits on a decision for a long while may get a dry "Still here, then." (once a match).
  slowPlayerAfter:15000,
  finalResultBeat:1700,activeClock:true,
  introDelay:1500
});

// Veyra and Gorvan (v104) are data-driven packs (duel/authored-pack.js). Their Duel
// dispatch is generic: the shared classifier (duelEventFor) names the moment from
// the character's side, `eventContext` adds what only they care about, and
// `resultContext` feeds their round / match lines. Nothing here is per-language.
const veyra=Object.freeze({
  id:'veyra',label:'Veyra',
  expressions:VEYRA_EXPRESSIONS,defaultExpression:'default',expressionURL:veyraExpressionURL,preload:preloadVeyraExpressions,
  reactions:VEYRA_REACTIONS,voiceLibrary:VEYRA_VOICE_LIBRARY,resolveReaction:resolveVeyraReaction,resolveVoice:resolveVeyraVoice,
  createController:({initial,settings,now})=>createVeyraController({now,initial:{...(initial||{}),recentVoices:initial?.recentVoices||settings?.characterRecentVoices?.veyra||[]}}),
  holdsExpression:controller=>!!controller?.holdsExpression?.(),
  lead(trigger){
    // Her face reacts first; the words, if any, a beat later.
    if(trigger==='player_one_card')return {delay:480};
    if(trigger==='own_one_card')return {delay:420};
    return null;
  },
  idleTriggers:()=>[['idle_quiet',{}]],
  idleFallback:(controller,context)=>controller?.observe('idle_beat',context),
  // v111: a round result may pass with only a look (each repeat of a round line is
  // rarer still); the match result always gets its line.
  resultVoiceChance:trigger=>trigger==='round_win'?.7:trigger==='round_loss'?.6:1,
  resultFaces:Object.freeze({round_win:'round_win',round_loss:'round_loss'}),
  slowPlayerAfter:13000,
  finalResultBeat:1700,activeClock:true,
  introDelay:1300,
  generic:true
});

const gorvan=Object.freeze({
  id:'gorvan',label:'Gorvan',
  expressions:GORVAN_EXPRESSIONS,defaultExpression:'neutral',expressionURL:gorvanExpressionURL,preload:preloadGorvanExpressions,
  reactions:GORVAN_REACTIONS,voiceLibrary:GORVAN_VOICE_LIBRARY,resolveReaction:resolveGorvanReaction,resolveVoice:resolveGorvanVoice,
  createController:({initial,settings,now})=>createGorvanController({now,initial:{...(initial||{}),recentVoices:initial?.recentVoices||settings?.characterRecentVoices?.gorvan||[]}}),
  holdsExpression:controller=>!!controller?.holdsExpression?.(),
  lead(trigger){
    // He looks first, unhurried; the words, if any, a beat later.
    if(trigger==='player_one_card')return {delay:760};
    if(trigger==='own_one_card'||trigger==='curse_taken')return {delay:600};
    return null;
  },
  idleTriggers:()=>[['idle_quiet',{}]],
  idleFallback:(controller,context)=>controller?.observe('idle_beat',context),
  slowPlayerAfter:14000,
  finalResultBeat:1800,activeClock:true,
  introDelay:1700,
  generic:true
});

// The Bounty Hunter (v113): the third data-driven pack. `refineEvent` names the few cards he
// has lines for (his own Curse, Crossbow, Runed Crossbow, King) on top of the shared
// classifier; `looks` turns his helmet toward whoever is actually speaking at a Tavern table.
const bounty_hunter=Object.freeze({
  id:'bounty_hunter',label:'The Bounty Hunter',
  expressions:BOUNTY_HUNTER_EXPRESSIONS,defaultExpression:'neutral',expressionURL:bountyHunterExpressionURL,preload:preloadBountyHunterExpressions,
  reactions:BOUNTY_HUNTER_REACTIONS,voiceLibrary:BOUNTY_HUNTER_VOICE_LIBRARY,resolveReaction:resolveBountyHunterReaction,resolveVoice:resolveBountyHunterVoice,
  createController:({initial,settings,now})=>createBountyHunterController({now,initial:{...(initial||{}),recentVoices:initial?.recentVoices||settings?.characterRecentVoices?.bounty_hunter||[]}}),
  holdsExpression:controller=>!!controller?.holdsExpression?.(),
  lead(trigger){
    // The helmet turns first; the words, if any, come after a pause. Stillness is the performance.
    if(trigger==='player_one_card')return {delay:820};
    if(trigger==='own_one_card'||trigger==='curse_taken')return {delay:640};
    return null;
  },
  refineEvent:bountyHunterEventFor,
  looks:BOUNTY_HUNTER_LOOKS,
  idleTriggers:()=>[['idle_quiet',{}]],
  idleFallback:(controller,context)=>controller?.observe('idle_beat',context),
  // Round results: almost no celebration, immediate acceptance — often just the look.
  resultVoiceChance:trigger=>trigger==='round_win'?.5:trigger==='round_loss'?.5:1,
  resultFaces:Object.freeze({round_win:'neutral',round_loss:'neutral'}),
  slowPlayerAfter:15000,
  finalResultBeat:1600,activeClock:true,
  introDelay:1400,
  generic:true
});

export const AUTHORED_CHARACTERS=Object.freeze({bramm,edrin,ragna,kesh,veyra,gorvan,bounty_hunter});
// The voiced opponents offered at the duel table, in their canonical order.
export const VOICED_OPPONENTS=Object.freeze(['bramm','edrin','ragna','kesh','veyra','gorvan','bounty_hunter']);
export const authoredCharacter=id=>AUTHORED_CHARACTERS[id]||null;
export function characterForVoice(name=''){return Object.values(AUTHORED_CHARACTERS).find(pack=>pack.voiceLibrary[name])||AUTHORED_CHARACTERS[banterSpeaker(name)]||null;}
// Ordinary lines resolve through their character; dedicated banter recordings through the banter catalog.
export function resolveCharacterVoice(name,locale='en'){const pack=Object.values(AUTHORED_CHARACTERS).find(item=>item.voiceLibrary[name]);return pack?pack.resolveVoice(name,locale):resolveBanterVoice(name,locale);}
