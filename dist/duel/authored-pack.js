// ─────────────────────────────────────────────────────────────────────────────
// Shared building blocks for an authored character's data (v104: Veyra and
// Gorvan are built on these). A character supplies its script, its expression
// files and one rule — which recording, if any, plays for a line in each UI
// language — and gets back the reaction table, the voice library and the
// resolvers every other part of the game already expects.
//
// Language rules are per line, under one language-independent reaction id:
//   • a line with an authored take in each language plays that take;
//   • a line recorded only in English is LEFT OUT in Hebrew (no English fallback,
//     no invented translation) unless the character says otherwise;
//   • a character recorded only in English (Gorvan) plays English audio under
//     the authored Hebrew bubble text.
// ─────────────────────────────────────────────────────────────────────────────

export const normalizeLocale=locale=>locale==='he'?'he':'en';
const onLocalhost=()=>['localhost','127.0.0.1'].includes(globalThis.location?.hostname);
// The same words never come back twice running, whichever recording they are in.
export const remarkOf=text=>String(text||'').toLowerCase().replace(/[^a-z ]/g,'').replace(/\s+/g,' ').trim();

// `script` maps a line id to {en, he, s}: the exact authored text (performance
// directions already removed) and the longer take in seconds (it only sizes a
// bubble when a voice cannot play).
export function lineFactory({prefix,script}){
  return (id,trigger,expression,priority,extra={})=>{
    const text=script[id];if(!text)throw new Error(`${prefix}: no authored text for ${id}`);
    const remark=remarkOf(text.en),own=extra.weight||null;
    return Object.freeze({
      id,trigger,voice:`${prefix}_${id}`,caption:text.en,captions:Object.freeze({en:text.en,he:text.he??null}),expression,priority,remark,
      category:extra.category||trigger,duration:Math.round((text.s||2)*1000)+650,probability:extra.probability??1,cooldown:extra.cooldown??0,
      nextState:extra.nextState||null,when:extra.when||null,followUp:extra.followUp||null,tags:Object.freeze([...(extra.tags||[])]),
      // A remark heard in the last few lines is very unlikely to come back yet.
      weight:context=>(own?own(context):1)*(context.recentRemarks?.includes(remark)?.04:1)
    });
  };
}

// One table update → at most one trigger for an authored Duel opponent sitting
// at `self`. Public facts only: what was played, who drew and how many, who was
// skipped, and card counts. Trigger names are seen from the character's side:
// `own_*` happened to them, `player_*` to you; a Curse is `curse_taken` (on them)
// or `curse_landed` (theirs, on you); a Shield is `stop_taken` or `stop_given`.
export function duelEventFor({self='p1',played=null,playedCard=null,stop=null,stack=null,penalty=null,draw=null,closed=null,reverse=null,crossbowRun=0,humanCount=7,ownCount=7,oldHuman=humanCount,oldOwn=ownCount,cursedBefore=false}={}){
  const humanMove=played?.playerId==='p0',ownMove=played?.playerId===self,power=['king','plus2','superTaki'].includes(playedCard?.type);
  if(oldHuman>1&&humanCount===1)return ['player_one_card',{}];
  if(oldOwn>1&&ownCount===1)return ['own_one_card',{}];
  if(penalty?.playerId===self)return (penalty.amount||0)>=4?['own_draw',{amount:penalty.amount,forced:true,haul:true}]:['curse_taken',{amount:penalty.amount||2}];
  if(penalty?.playerId==='p0')return ['curse_landed',{amount:penalty.amount||2,haul:(penalty.amount||0)>=4}];
  if(stop?.skipped===self)return ['stop_taken',{ownCount}];
  if(stop?.skipped==='p0')return ['stop_given',{humanCount,urgent:humanCount<=2}];
  if(draw?.playerId===self)return ['own_draw',{amount:1,forced:false}];
  if(draw?.playerId==='p0')return ['player_draw',{amount:1,haul:oldHuman===1}];
  if(playedCard?.type==='king')return humanMove?['king',{own:false,broke:cursedBefore}]:['own_good_move',{big:true,king:true,ownCount}];
  if(reverse)return ['reverse',{own:ownMove}];
  if(humanMove&&((stack?.amount||0)>=4||(closed&&crossbowRun>=3)))return ['player_good_move',{big:(stack?.amount||0)>=4||crossbowRun>=4,hurt:(stack?.amount||0)>=4}];
  if(ownMove&&(stack||power||(closed&&crossbowRun>=2)))return ['own_good_move',{ownCount,big:power}];
  // The player is still hanging on one card after the character's turn.
  if(ownMove&&humanCount===1&&oldHuman===1)return ['player_one_card',{persist:true}];
  if(ownMove)return ['own_move',{}];
  if(humanMove)return ['player_neutral_move',{}];
  return null;
}

// `audioFor(voice, uiLocale)` → which take plays ('en' | 'he') or null for none.
export function createVoiceCatalog({label,folder,reactions,audioFor}){
  const asset=name=>new URL(`../assets/${folder}/voice/${name}.mp3`,import.meta.url).href;
  const missingURL=new URL(`../assets/${folder}/voice/__missing__.mp3`,import.meta.url).href;
  const debugMissing=new Set();
  const library=Object.freeze(Object.fromEntries(reactions.filter(item=>item.voice).map(item=>[item.voice,Object.freeze({
    src:asset(item.voice),sources:Object.freeze({en:asset(item.voice),he:asset(`${item.voice}_he`)}),
    caption:item.caption,captions:item.captions,priority:item.priority
  })])));
  const hasVoice=(voice,locale)=>!!library[voice]&&!!audioFor(voice,normalizeLocale(locale));
  function resolveVoice(name,locale='en'){
    const definition=library[name];if(!definition)return null;
    const ui=normalizeLocale(locale),take=audioFor(name,ui);if(!take)return null;
    return {name,locale:ui,audioLocale:take,src:debugMissing.has(name)?missingURL:definition.sources[take],caption:definition.captions[ui]??'',priority:definition.priority};
  }
  function resolveReaction(reaction,locale='en'){
    if(!reaction)return null;const ui=normalizeLocale(locale);
    const caption=reaction.captions?.[ui]??(ui==='en'?reaction.caption:null);
    // A line without text is a content bug, but it must never break the match.
    if(reaction.voice&&!caption&&onLocalhost())console.error(`[${label}] Missing bubble text`,reaction.id,ui);
    return {...reaction,voice:reaction.voice&&hasVoice(reaction.voice,ui)?reaction.voice:null,locale:ui,caption:caption||''};
  }
  return Object.freeze({
    library,hasVoice,resolveVoice,resolveReaction,
    markMissing(name,missing=true){if(missing)debugMissing.add(name);else debugMissing.delete(name);return [...debugMissing];},
    forcedMissing:()=>[...debugMissing]
  });
}
