// Authored duel characters share one framework: a reaction table and controller
// per character, plus a single expression stage, speech bubble and in-game Web
// Audio voice channel in app.js. Each entry here describes only what is
// different about that character's staging; nothing is duplicated per language.
import { BRAMM_EXPRESSIONS, BRAMM_REACTIONS, BRAMM_VOICE_LIBRARY, brammExpressionURL, createBrammController, preloadBrammExpressions, resolveBrammReaction, resolveBrammVoice } from './bramm.js';
import { EDRIN_EXPRESSIONS, EDRIN_REACTIONS, EDRIN_VOICE_LIBRARY, createEdrinController, edrinExpressionURL, preloadEdrinExpressions, resolveEdrinReaction, resolveEdrinVoice } from './edrin.js';

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

export const AUTHORED_CHARACTERS=Object.freeze({bramm,edrin});
export const authoredCharacter=id=>AUTHORED_CHARACTERS[id]||null;
export function characterForVoice(name=''){return Object.values(AUTHORED_CHARACTERS).find(pack=>pack.voiceLibrary[name])||null;}
export function resolveCharacterVoice(name,locale='en'){return characterForVoice(name)?.resolveVoice(name,locale)||null;}
