// ─────────────────────────────────────────────────────────────────────────────
// Shared controller for authored duel characters (Edrin, Ragna).
// One scheduler for every character: reaction choice, anti-repetition on the
// base reaction id (EN and HE are the same reaction), result cycling, casual
// cooldowns measured in actions and active seconds, per-round budgets, priority
// gating so lines never stack, fatigue on repeated remarks, and silent
// expression beats. A character supplies only data and a few small rules.
// ─────────────────────────────────────────────────────────────────────────────

export const AUTHORED_PRIORITY_RANK=Object.freeze({LOW:1,MEDIUM:2,HIGH:3,CRITICAL:4});

export function createAuthoredController(spec,{random=Math.random,now=()=>Date.now(),initial=null}={}){
  const {reactions,visuals={},uncounted=new Set(),persistentStates=['default','result'],stateExpressions={},defaultExpression='default'}=spec;
  const T={visualGap:2400,casualGap:11000,casualEvents:3,highGap:4000,highBudget:3,idleQuiet:18000,...(spec.timing||{})};
  const hasVoice=spec.hasVoice||(()=>true);
  const roundBudget=c=>spec.roundBudget?spec.roundBudget(c):(c.eventsThisRound>=40?3:2);
  let baseState=persistentStates.includes(initial?.state)?initial.state:'default',transient=null;
  let lastSpokenAt=-Infinity,lastVisualAt=-Infinity,roundStartedAt=now();
  let recentVoices=[...(initial?.recentVoices||[])].slice(0,3),history=[...(initial?.history||[])].slice(-12);
  const counters={eventsSinceSpoken:0,eventsThisRound:0,nonCriticalThisRound:0,idleThisRound:0,...(spec.counters||{}),...(initial?.counters||{})};
  let introPlan=null;const usage={...(initial?.usage||{})};
  const choose=items=>items[Math.floor(random()*items.length)];
  const chooseWeighted=(items,context)=>{const weights=items.map(item=>Math.max(0,item.weight?item.weight(context):1)),total=weights.reduce((a,b)=>a+b,0);if(!total)return choose(items);let roll=random()*total;for(let i=0;i<items.length;i++){roll-=weights[i];if(roll<0)return items[i];}return items.at(-1);};
  const probabilityOf=(reaction,context)=>spec.probabilityOf?spec.probabilityOf(reaction,context):reaction.probability;
  const state=()=>transient&&now()<transient.until?transient.state:baseState;
  const setBase=next=>{baseState=next;transient=null;};
  const remember=reaction=>{
    recentVoices=[reaction.voice,...recentVoices.filter(v=>v!==reaction.voice)].slice(0,3);usage[reaction.voice]=(usage[reaction.voice]||0)+1;
    history=[...history,{id:reaction.id,voice:reaction.voice,trigger:reaction.trigger,at:Math.round(now())}].slice(-12);
    lastSpokenAt=now();counters.eventsSinceSpoken=0;
    if(reaction.priority!=='CRITICAL')counters.nonCriticalThisRound++;
    if(reaction.category==='idle')counters.idleThisRound++;
    if(reaction.category==='intro')counters.intros=(counters.intros||0)+1;
    spec.onRemember?.(reaction,counters);
    if(reaction.nextState){baseState=reaction.nextState;transient=null;}
  };
  function react(trigger,context={},force=false){
    if(trigger==='intro'&&spec.planIntro){
      if(!introPlan)introPlan=spec.planIntro(context,random);
      const plan=introPlan;introPlan=null;if(plan!=='voice')return null;
    }
    const quiet=now()-lastSpokenAt;
    if(!force&&spec.suppress?.(trigger,context,{counters,quiet,state:baseState}))return null;
    if(spec.enrich)context=spec.enrich(trigger,context,counters);
    const locale=context.locale;
    const pool=reactions.filter(item=>item.trigger===trigger&&(!locale||hasVoice(item.voice,locale))&&(!spec.eligible||spec.eligible(item,context,counters,random)));
    let candidates=pool.filter(item=>!recentVoices.includes(item.voice));
    // Result lines cycle through the whole set within a match before any returns.
    if(pool[0]?.category==='result'){const fresh=candidates.filter(item=>!usage[item.voice]);if(fresh.length)candidates=fresh;}
    if(!candidates.length)candidates=pool.filter(item=>item.voice!==recentVoices[0]);
    if(!candidates.length)return null;
    const reaction=chooseWeighted(candidates,context),rank=AUTHORED_PRIORITY_RANK[reaction.priority]||1;
    if(!force&&reaction.priority!=='CRITICAL'){
      // Never stack dialogue: a line only cuts in above what is already playing.
      if((context.busyRank||0)>=rank)return null;
      if(reaction.priority==='HIGH'){if(quiet<T.highGap||counters.nonCriticalThisRound>=T.highBudget)return null;}
      else{
        if(counters.eventsSinceSpoken<T.casualEvents||quiet<Math.max(T.casualGap,reaction.cooldown)||counters.nonCriticalThisRound>=roundBudget(counters))return null;
        if(spec.idleGate&&spec.idleGate(reaction,context,{counters,sinceQuiet:now()-Math.max(lastSpokenAt,roundStartedAt),timing:T}))return null;
      }
      // The same remark wears thin: each repeat within a match halves its chance.
      if(random()>probabilityOf(reaction,context)*.5**(usage[reaction.voice]||0))return null;
    }
    spec.onSpoken?.(trigger,counters);
    remember(reaction);
    const extra=spec.decorate?.(reaction,context,random)||null;
    return {...reaction,...(extra||{}),state:state()};
  }
  function observe(trigger,context={}){
    if(!uncounted.has(trigger)){counters.eventsSinceSpoken++;counters.eventsThisRound++;}
    spec.onObserve?.(trigger,context,{setBase,state:()=>baseState,counters});
    if(trigger==='intro'&&spec.planIntro){
      introPlan=spec.planIntro(context,random);
      if(introPlan!=='expression'||!spec.introLook)return null;
      lastVisualAt=now();return spec.introLook(random);
    }
    const visual=visuals[trigger];if(!visual)return null;
    if(!visual.always&&now()-lastVisualAt<T.visualGap)return null;
    const p=typeof visual.p==='function'?visual.p(context):visual.p;if(random()>p)return null;
    const expression=visual.pick(context,random),duration=typeof visual.duration==='function'?visual.duration(context):visual.duration;lastVisualAt=now();
    const next=spec.transientFor?.(trigger,expression,context);if(next)transient={state:next,until:now()+duration};
    return {expression,duration};
  }
  return Object.freeze({
    react,observe,
    beginRound(){roundStartedAt=now();counters.nonCriticalThisRound=0;counters.eventsSinceSpoken=0;counters.eventsThisRound=0;counters.idleThisRound=0;spec.onBeginRound?.(counters);baseState='default';transient=null;},
    force(id){const reaction=reactions.find(item=>item.id===id||item.voice===id);if(!reaction)return null;remember(reaction);return {...reaction,state:state()};},
    setState(next){if((spec.states||[]).includes(next)){if(persistentStates.includes(next)){baseState=next;transient=null;}else transient={state:next,until:now()+4000};}return state();},
    setFlag(){},
    // The table changed shape (card counts): some characters hold a different baseline face.
    observeTable(table){if(!spec.baseFromTable||baseState==='result')return state();const next=spec.baseFromTable(table,baseState);if(next&&next!==baseState){baseState=next;}return state();},
    // The player drew off their last card: the character settles back.
    oneCardRecovered(){
      const r=spec.recovery;if(!r||baseState!==r.from)return null;baseState=r.to;transient=null;
      const visual=observe(r.visual);const base={id:r.visual,trigger:'one_card_recovered',voice:null,caption:null,priority:'LOW',category:'visual'};
      return visual?{...base,...visual,state:state()}:{...base,expression:defaultExpression,duration:600,state:state()};
    },
    defaultExpression(){return stateExpressions[state()]||defaultExpression;},
    holdsExpression(){return baseState==='result';},
    cooldown(){const q=now()-lastSpokenAt,finite=Number.isFinite(q);return {quietMs:finite?Math.round(q):null,casualReadyInMs:Math.max(0,Math.round(T.casualGap-(finite?q:T.casualGap))),eventsSinceSpoken:counters.eventsSinceSpoken,eventsNeeded:Math.max(0,T.casualEvents-counters.eventsSinceSpoken),roundBudgetUsed:counters.nonCriticalThisRound,roundBudget:roundBudget(counters),idleThisRound:counters.idleThisRound};},
    snapshot(){return {state:baseState,presentation:state(),recentVoices:[...recentVoices],history:history.map(item=>({...item})),counters:{...counters},usage:{...usage}};}
  });
}
