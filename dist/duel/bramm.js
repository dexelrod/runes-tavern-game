const expressionAsset=name=>new URL(`../assets/bramm/expressions/bramm_${name}.webp`,import.meta.url).href;
const voiceAsset=name=>new URL(`../assets/bramm/voice/${name}.mp3`,import.meta.url).href;

const BRAMM_HE_CAPTIONS=Object.freeze({
  bramm_intro_01:'בראם. בראם הבלתי מנוצח.',
  bramm_intro_02:'היי! בואו לראות. זה לא ייקח הרבה זמן.',
  bramm_taunt_01:'נו, נראה אם יש פה משהו מרשים.',
  bramm_taunt_02:'מתישהו היום? הבירה מתחממת.',
  bramm_mock_move_01:'באמת? זה המהלך?',
  bramm_mock_move_02:'אה, זה מוצא חן בעיניי. כל הביטחון הזה, בלי שום סיבה.',
  bramm_player_good_move_01:'מזל של מתחילים.',
  bramm_player_good_move_02:'שוב מזל.',
  bramm_bramm_good_move_01:'הנה. ככה עושים את זה.',
  bramm_bramm_good_move_02:'כולם ראו את זה? ברור שכולם ראו את זה.',
  bramm_player_draw_01:'עוד קלף. יופי. למה לעצור כאן?',
  bramm_bramm_draw_01:'שצ',
  bramm_bramm_draw_02:'קלפים זבל. ידעתי מהרגע שהתיישבתי.',
  bramm_excuse_01:'זה לא נחשב.',
  bramm_excuse_02:'זה.. חוק חדש. לא הרבה מכירים.',
  bramm_player_one_card_01:'אוי לא..',
  bramm_player_one_card_03:'חייב פלוס שתיים.. או קשת.. או מלך.. כל דבר.',
  bramm_loss_01:'לא נחשב.. עוד פעם.',
  bramm_win_01:'הנה זה! בראם הבלתי מנוצח!',
  bramm_win_02:'אמרתי או לא אמרתי?! אמרתי או לא?!',
  bramm_win_03:'מי המלך? אני.',
  bramm_win_04:'איזה מודאג, מה מודאג.. הייתי רגוע כל המשחק.',
  bramm_win_05:'כבר היה נראה שזה אבוד, אה?',
  bramm_win_06:'מישהו חשב שזה ייגמר אחרת?!',
  bramm_win_07:'אוי, זה היה מגעיל. עוד סיבוב?',
  bramm_win_08:'משחק טוב. יחסית.',
  bramm_win_09:'מישהו שיביא עוד בירה! ניצחון עושה צמא!',
  bramm_win_10:'בלתי מנוצח.',
  bramm_player_one_card_05:'אין סיבה להילחץ... למה שאני אילחץ?',
  bramm_player_one_card_06:'נו באמת. איך הגענו למצב הזה?',
  bramm_player_one_card_07:'לא להסתכל עליי! הכול בשליטה!',
  bramm_round_win_01:'הנה. הסדר חזר על כנו.',
  bramm_round_win_02:'עוד נקודה של בראם. תזכרו את זה.',
  bramm_round_win_03:'כולם ראו, כן? יופי.',
  bramm_round_win_04:'לא רע. בשביל חימום.',
  bramm_match_loss_01:'טוב. משחק אחד. זה לא אומר כלום.',
  bramm_match_loss_02:'אפשר ליהנות מהרגע. זה לא קורה הרבה.',
  bramm_match_loss_03:'שאף אחד לא ירשום את זה!!',
  bramm_idle_01:'הממ. יכול להיות גרוע יותר. יכול להיות הרבה יותר טוב.',
  bramm_idle_02:'בירה טובה, טברנה גרועה..'
});

export const normalizeBrammLocale=locale=>locale==='he'?'he':'en';

export const BRAMM_STATES=Object.freeze(['swaggering','competitive','irritated','rattled','panic','relief','defeated']);
export const BRAMM_STATE_EXPRESSIONS=Object.freeze({
  swaggering:'01_default_smug',competitive:'10_satisfied_good_move',irritated:'09_irritated_lucky',
  rattled:'33_muttering',panic:'20_one_card_panic',relief:'22_fake_calm_after_panic',defeated:'30_defeated_sulk'
});

export const BRAMM_EXPRESSIONS=Object.freeze([
  '01_default_smug','02_intro_boast','03_calling_to_tavern','04_smug_challenge','05_impatient','06_mocking_disbelief','07_belly_laugh','08_dismissive_lucky','09_irritated_lucky','10_satisfied_good_move','11_showing_off','12_mock_generous','13_dont_say_anything','14_blame_the_deck','15_defensive_excuse','16_rules_lawyer','17_one_card_sober_shock','18_one_card_denial','19_one_card_desperate','20_one_card_panic','21_sudden_relief','22_fake_calm_after_panic','23_gloating','24_big_victory','25_victory_to_tavern','26_close_win_relief','27_smug_unbeaten','28_good_game_almost_sincere','29_defeated_disbelief','30_defeated_sulk','31_again','32_angry_at_spectators','33_muttering','34_drinking_relaxed','35_drinking_nervous','36_mug_stops_midair','37_not_finished'
]);
export const brammExpressionURL=(name='01_default_smug')=>expressionAsset(BRAMM_EXPRESSIONS.includes(name)?name:'01_default_smug');

const brammImageCache=new Map();
let brammPreloadPromise=null;
let brammReady=false;
function loadDecodedImage(name){
  if(brammImageCache.has(name))return brammImageCache.get(name);
  const promise=new Promise((resolve,reject)=>{
    const image=new Image();let settled=false;
    const src=brammExpressionURL(name);
    image.decoding='async';
    image.onload=async()=>{
      if(settled)return;settled=true;
      try{if(typeof image.decode==='function')await image.decode();}
      catch(error){if(!image.complete||!image.naturalWidth){reject(error);return;}}
      resolve(image);
    };
    image.onerror=()=>{if(settled)return;settled=true;reject(new Error(`Unable to preload Bramm expression: ${name}`));};
    image.src=src;
    if(image.complete&&image.naturalWidth)image.onload();
  });
  brammImageCache.set(name,promise);return promise;
}
export function preloadBrammExpressions(){
  if(typeof Image==='undefined')return Promise.resolve([]);
  brammPreloadPromise ||= Promise.all(BRAMM_EXPRESSIONS.map(loadDecodedImage)).then(images=>{brammReady=true;return images;});
  return brammPreloadPromise;
}
export function brammExpressionsReady(){return brammReady;}

const line=(id,trigger,voice,caption,expression,priority='MEDIUM',extra={})=>Object.freeze({id,trigger,voice,caption,captions:Object.freeze({en:caption,he:BRAMM_HE_CAPTIONS[voice]}),expression,priority,duration:extra.duration||2400,probability:extra.probability??1,cooldown:extra.cooldown??4200,...extra});

export const BRAMM_REACTIONS=Object.freeze([
  line('intro_01','intro','bramm_intro_01','Bramm. Bramm the Unbeaten.','02_intro_boast','CRITICAL',{category:'intro',oncePerMatch:true,nextState:'swaggering'}),
  line('intro_02','intro','bramm_intro_02',"Oi! Come watch this. Won't take long.",'03_calling_to_tavern','CRITICAL',{category:'intro',oncePerMatch:true,nextState:'swaggering',setFlags:['bramm_has_addressed_tavern']}),
  line('taunt_01','idle_taunt','bramm_taunt_01','Go on, then. Impress me.','04_smug_challenge','LOW',{category:'taunt',probability:.12,cooldown:10000}),
  line('taunt_02','slow_player','bramm_taunt_02',"Any day now. Ale's getting warm.",'05_impatient','LOW',{category:'taunt',probability:.18,cooldown:12000}),
  line('mock_01','player_neutral_move','bramm_mock_move_01',"That's what you're going with?",'06_mocking_disbelief','LOW',{category:'mock',probability:.14,cooldown:8500}),
  line('mock_02','player_neutral_move','bramm_mock_move_02',"Oh, I like you. You're confident for no reason.",'07_belly_laugh','LOW',{category:'mock',probability:.1,cooldown:9500}),
  line('player_good_01','player_good_move','bramm_player_good_move_01','Lucky.','08_dismissive_lucky','MEDIUM',{category:'player_good',probability:.26,nextState:'competitive',setFlags:['bramm_was_countered_after_boast']}),
  line('player_good_02','player_good_move_callback','bramm_player_good_move_02','Still lucky.','09_irritated_lucky','MEDIUM',{category:'player_good',probability:.62,nextState:'irritated'}),
  line('bramm_good_01','bramm_good_move','bramm_bramm_good_move_01',"There. That's how it's done.",'10_satisfied_good_move','MEDIUM',{category:'bramm_good',probability:.2,nextState:'swaggering',setFlags:['bramm_claimed_control']}),
  line('bramm_good_02','bramm_good_move','bramm_bramm_good_move_02','Did you SEE that? Course you did.','11_showing_off','MEDIUM',{category:'bramm_good',probability:.2,nextState:'swaggering',setFlags:['bramm_claimed_control','bramm_has_addressed_tavern']}),
  line('player_draw_01','player_draw','bramm_player_draw_01','Take another. Treat yourself.','12_mock_generous','MEDIUM',{category:'draw',probability:.18,setFlags:['bramm_has_mocked_player_draw']}),
  line('bramm_draw_01','bramm_draw_callback','bramm_bramm_draw_01',"Don't.",'13_dont_say_anything','MEDIUM',{category:'draw',probability:.65,nextState:'irritated',setFlags:['bramm_has_been_forced_to_draw_after_mock']}),
  line('bramm_draw_02','bramm_draw','bramm_bramm_draw_02','Bad deck. Knew it the moment I sat down.','14_blame_the_deck','MEDIUM',{category:'draw',nextState:'rattled',probability:.22}),
  line('excuse_01','setback','bramm_excuse_01',"That doesn't count.",'15_defensive_excuse','MEDIUM',{category:'excuse',probability:.18,nextState:'irritated',setFlags:['bramm_has_used_excuse']}),
  line('excuse_02','setback','bramm_excuse_02','House rule.','16_rules_lawyer','MEDIUM',{category:'excuse',probability:.18,nextState:'irritated',setFlags:['bramm_has_used_excuse']}),
  // Player reaches one card. One immediate reaction, chosen by context weight
  // (see ONE_CARD_WEIGHTS) and the shared recent-voice anti-repeat.
  line('one_card_01','player_one_card','bramm_player_one_card_01','...No.','17_one_card_sober_shock','CRITICAL',{category:'one_card',cooldown:0,nextState:'panic',setFlags:['bramm_has_seen_player_one_card'],duration:3000}),
  line('one_card_05','player_one_card','bramm_player_one_card_05','Right. Nobody panic. Especially me.','22_fake_calm_after_panic','CRITICAL',{category:'one_card',cooldown:0,nextState:'panic',setFlags:['bramm_has_seen_player_one_card'],duration:4500}),
  line('one_card_06','player_one_card','bramm_player_one_card_06','Oh, come on. How did we get here?','18_one_card_denial','CRITICAL',{category:'one_card',cooldown:0,nextState:'panic',setFlags:['bramm_has_seen_player_one_card'],duration:4100}),
  line('one_card_07','player_one_card','bramm_player_one_card_07',"Stop looking over here! I've got this!",'32_angry_at_spectators','CRITICAL',{category:'one_card',cooldown:0,nextState:'panic',setFlags:['bramm_has_seen_player_one_card','bramm_has_addressed_tavern'],duration:4100}),
  // Later, while the player is still on one card and Bramm is hunting for an answer.
  line('one_card_03','one_card_persist','bramm_player_one_card_03','Come on. Curse. Curse. Give me something horrible.','19_one_card_desperate','MEDIUM',{category:'one_card',probability:.6,cooldown:8000,nextState:'panic',duration:3800}),
  // Round results while the match continues.
  line('loss_01','round_loss','bramm_loss_01','...Again.','31_again','CRITICAL',{category:'result',cooldown:0,nextState:'irritated',duration:3800}),
  line('round_win_01','round_win','bramm_round_win_01','There. Order restored.','10_satisfied_good_move','CRITICAL',{category:'result',cooldown:0,nextState:'swaggering',duration:3600}),
  line('round_win_02','round_win','bramm_round_win_02',"That's one more. Keep count.",'27_smug_unbeaten','CRITICAL',{category:'result',cooldown:0,nextState:'swaggering',duration:3700}),
  line('round_win_03','round_win','bramm_round_win_03','Everybody saw that, right? Good.','03_calling_to_tavern','CRITICAL',{category:'result',cooldown:0,nextState:'swaggering',setFlags:['bramm_has_addressed_tavern'],duration:3800}),
  line('round_win_04','round_win','bramm_round_win_04','Not bad. For a warm-up.','34_drinking_relaxed','CRITICAL',{category:'result',cooldown:0,nextState:'swaggering',duration:3500}),
  // Final result: Bramm loses the whole match.
  line('match_loss_01','match_loss','bramm_match_loss_01','Fine. One match. Means nothing.','29_defeated_disbelief','CRITICAL',{category:'result',cooldown:0,nextState:'defeated',duration:4900}),
  line('match_loss_02','match_loss','bramm_match_loss_02',"Enjoy it. This doesn't happen often.",'30_defeated_sulk','CRITICAL',{category:'result',cooldown:0,nextState:'defeated',duration:4400}),
  line('match_loss_03','match_loss','bramm_match_loss_03','Nobody writes this down!','32_angry_at_spectators','CRITICAL',{category:'result',cooldown:0,nextState:'defeated',duration:3700}),
  // Rare lines for a genuinely quiet stretch (see the idle gate in pick()).
  line('idle_01','idle_quiet','bramm_idle_01','Hm. Could be worse. Could be much better.','33_muttering','LOW',{category:'idle',probability:.35,cooldown:18000,duration:5100}),
  line('idle_02','idle_quiet','bramm_idle_02','Good ale. Terrible company.','34_drinking_relaxed','LOW',{category:'idle',probability:.35,cooldown:18000,duration:4000}),
  line('win_01','win_general','bramm_win_01','There it is! Bramm the Unbeaten!','24_big_victory','CRITICAL',{category:'result',cooldown:0,duration:3600}),
  line('win_02','win_boast','bramm_win_02','Did I not say it? DID I NOT SAY IT?','25_victory_to_tavern','CRITICAL',{category:'result',cooldown:0,duration:3900}),
  line('win_03','win_comfortable','bramm_win_03','Go on. Tell them who beat you.','23_gloating','CRITICAL',{category:'result',cooldown:0,duration:3400}),
  line('win_04','win_close','bramm_win_04','Never in doubt.','26_close_win_relief','CRITICAL',{category:'result',cooldown:0,duration:3000}),
  line('win_05','win_survived','bramm_win_05','HA! You thought you had me!','21_sudden_relief','CRITICAL',{category:'result',cooldown:0,duration:3600}),
  line('win_06','win_comeback','bramm_win_06',"That's the trouble with hope. Makes the losing worse.",'23_gloating','CRITICAL',{category:'result',cooldown:0,duration:4300}),
  line('win_07','win_crushing','bramm_win_07','Oh, that was awful. Again?','07_belly_laugh','CRITICAL',{category:'result',cooldown:0,duration:3400}),
  line('win_08','win_close','bramm_win_08','Good game. For you.','28_good_game_almost_sincere','CRITICAL',{category:'result',cooldown:0,duration:3400}),
  line('win_09','win_theatrical','bramm_win_09',"Someone get me another ale! Victory's thirsty work!",'25_victory_to_tavern','CRITICAL',{category:'result',cooldown:0,duration:4500}),
  line('win_10','win_quiet','bramm_win_10','Unbeaten.','27_smug_unbeaten','CRITICAL',{category:'result',cooldown:0,duration:2600})
]);

export const BRAMM_VOICE_LIBRARY=Object.freeze(Object.fromEntries(BRAMM_REACTIONS.map(item=>[item.voice,Object.freeze({
  src:voiceAsset(item.voice),
  sources:Object.freeze({en:voiceAsset(item.voice),he:voiceAsset(`${item.voice}_he`)}),
  caption:item.caption,
  captions:item.captions,
  priority:item.priority
})])));
export function resolveBrammReaction(reaction,locale='en'){
  if(!reaction)return null;const resolvedLocale=normalizeBrammLocale(locale);
  const missingLocalizedVoice=resolvedLocale==='he'&&reaction.voice==='bramm_win_05';
  return {...reaction,voice:missingLocalizedVoice?null:reaction.voice,locale:resolvedLocale,caption:reaction.captions?.[resolvedLocale]??reaction.caption};
}
export function resolveBrammVoice(name,locale='en'){
  const definition=BRAMM_VOICE_LIBRARY[name];if(!definition)return null;
  const resolvedLocale=normalizeBrammLocale(locale);
  if(resolvedLocale==='he'&&name==='bramm_win_05')return null;
  return {name,locale:resolvedLocale,src:definition.sources[resolvedLocale],caption:definition.captions[resolvedLocale],priority:definition.priority};
}
const byId=Object.freeze(Object.fromEntries(BRAMM_REACTIONS.map(item=>[item.id,item])));

// Context weights for the immediate one-card reaction. First scare of the
// match favours the quiet shock; later scares lean on the audience and talking
// himself down. (one_card_02, "You've got two…", is retired at the owner's request.) Anti-repeat still removes his last three voices.
const ONE_CARD_WEIGHTS=Object.freeze({
  one_card_01:({oneCardScares})=>oneCardScares===0?3:1,
  one_card_05:({brammCards=0})=>brammCards>=5?2:1,
  one_card_06:({flags})=>flags.bramm_was_previously_ahead?2:1,
  one_card_07:({flags,oneCardScares})=>flags.bramm_has_addressed_tavern||oneCardScares>0?2:1
});

export function createBrammController({random=Math.random,now=()=>Date.now(),initial=null}={}){
  let state=BRAMM_STATES.includes(initial?.state)?initial.state:'swaggering',lastSpokenAt=Number.isFinite(initial?.lastSpokenAt)?initial.lastSpokenAt:-Infinity,spoken=[...(initial?.spoken||[])],recentVoices=[...(initial?.recentVoices||[])].slice(0,3),recentCategories=[...(initial?.recentCategories||[])],goodMoveStreak=initial?.counters?.goodMoveStreak||0,oneCardScares=initial?.counters?.oneCardScares||0,eventsSinceSpoken=initial?.counters?.eventsSinceSpoken||0,nonCriticalThisRound=initial?.counters?.nonCriticalThisRound||0;
  const flags={bramm_has_mocked_player_draw:false,bramm_has_been_forced_to_draw_after_mock:false,bramm_claimed_control:false,bramm_was_countered_after_boast:false,bramm_has_seen_player_one_card:false,bramm_survived_one_card_scare:false,bramm_has_used_excuse:false,bramm_has_addressed_tavern:false,bramm_was_previously_ahead:false,bramm_was_previously_behind:false,...(initial?.flags||{})};
  const choose=items=>items[Math.floor(random()*items.length)];
  const chooseWeighted=(items,weight)=>{const weights=items.map(item=>Math.max(0,weight(item))),total=weights.reduce((sum,value)=>sum+value,0);if(!total)return choose(items);let roll=random()*total;for(let i=0;i<items.length;i++){roll-=weights[i];if(roll<0)return items[i];}return items.at(-1);};
  let idleThisRound=0,eventsThisRound=0;
  const remember=reaction=>{
    spoken.push(reaction.id);recentVoices=[reaction.voice,...recentVoices.filter(value=>value!==reaction.voice)].slice(0,3);
    recentCategories=[reaction.category,...recentCategories].slice(0,4);lastSpokenAt=now();
    eventsSinceSpoken=0;if(reaction.priority!=='CRITICAL')nonCriticalThisRound++;
    for(const key of reaction.setFlags||[])flags[key]=true;for(const key of reaction.clearFlags||[])flags[key]=false;
    if(reaction.nextState)state=reaction.nextState;
  };
  function pick(trigger,context={},force=false){
    let resolved=trigger;
    if(trigger==='player_good_move'){resolved=goodMoveStreak>0?'player_good_move_callback':'player_good_move';goodMoveStreak++;}
    else if(trigger!=='player_neutral_move')goodMoveStreak=Math.max(0,goodMoveStreak-1);
    if(trigger==='bramm_draw'&&flags.bramm_has_mocked_player_draw&&!flags.bramm_has_been_forced_to_draw_after_mock)resolved='bramm_draw_callback';
    if(trigger==='win'){
      if(context.survivedOneCard||flags.bramm_survived_one_card_scare)resolved='win_survived';
      else if(context.wasBehind)resolved='win_comeback';
      else if(context.close)resolved='win_close';
      else if(context.crushing)resolved='win_crushing';
      else if(flags.bramm_has_addressed_tavern&&random()<.48)resolved='win_theatrical';
      else if(flags.bramm_claimed_control&&random()<.52)resolved='win_boast';
      else resolved=random()<.22?'win_quiet':random()<.48?'win_comfortable':'win_general';
    }
    // "...Again." is Bramm's round-loss line. If he lost the previous round
    // too, he reaches for an excuse instead of saying it twice in a row.
    if(resolved==='round_loss'&&recentVoices.includes('bramm_loss_01'))resolved='setback';
    if(resolved==='idle_quiet'&&(idleThisRound>=2||(idleThisRound===1&&eventsThisRound<45)))return null;
    let candidates=BRAMM_REACTIONS.filter(item=>item.trigger===resolved&&!recentVoices.includes(item.voice)&&(!item.oncePerMatch||!spoken.includes(item.id)));
    if(!candidates.length)candidates=BRAMM_REACTIONS.filter(item=>item.trigger===resolved&&item.voice!==recentVoices[0]&&(!item.oncePerMatch||!spoken.includes(item.id)));
    if(!candidates.length)return null;
    const reaction=resolved==='player_one_card'?chooseWeighted(candidates,item=>ONE_CARD_WEIGHTS[item.id]?.({flags,oneCardScares,...context})??1):choose(candidates);
    if(!force&&reaction.priority!=='CRITICAL'){
      if(nonCriticalThisRound>=3||eventsSinceSpoken<2||now()-lastSpokenAt<Math.max(8000,reaction.cooldown))return null;
      if(recentCategories[0]===reaction.category&&random()<.7)return null;
      if(random()>reaction.probability)return null;
    }
    if(reaction.category==='idle')idleThisRound++;
    remember(reaction);return {...reaction,state};
  }
  return Object.freeze({
    react:pick,
    observe(trigger,context={}){eventsSinceSpoken++;eventsThisRound++;if(trigger==='bramm_draw'&&(context.amount||0)>=4)return {expression:'32_angry_at_spectators',duration:1800};const visual={player_good_move:'08_dismissive_lucky',player_good_move_callback:'09_irritated_lucky',bramm_good_move:'10_satisfied_good_move',player_draw:'12_mock_generous',bramm_draw:'14_blame_the_deck',bramm_draw_callback:'13_dont_say_anything',setback:'15_defensive_excuse',player_neutral_move:'06_mocking_disbelief',slow_player:'05_impatient',one_card_persist:'20_one_card_panic'}[trigger];return visual?{expression:visual,duration:1200}:null;},
    beginRound(){nonCriticalThisRound=0;eventsSinceSpoken=0;idleThisRound=0;eventsThisRound=0;},
    force(id){const reaction=byId[id];if(!reaction)return null;remember(reaction);return {...reaction,state};},
    setState(next){if(BRAMM_STATES.includes(next))state=next;return state;},
    setFlag(key,value=true){if(key in flags)flags[key]=!!value;},
    oneCardRecovered(){if(state!=='panic')return null;flags.bramm_survived_one_card_scare=true;oneCardScares++;state='relief';return {id:'one_card_relief',trigger:'one_card_recovered',voice:null,caption:null,expression:'21_sudden_relief',priority:'CRITICAL',duration:1900,state};},
    defaultExpression(){return BRAMM_STATE_EXPRESSIONS[state]||BRAMM_STATE_EXPRESSIONS.swaggering;},
    snapshot(){return {state,flags:{...flags},counters:{goodMoveStreak,oneCardScares,eventsSinceSpoken,nonCriticalThisRound},lastSpokenAt,recentVoices:[...recentVoices],recentCategories:[...recentCategories],spoken:[...spoken]};}
  });
}
