// Optional browser smoke test (not part of `npm test`).
//   npx playwright install chromium   (once, if Playwright is not available)
//   npm run serve &                    (serves dist/ on :4173)
//   node tests/e2e/smoke.mjs [baseURL]
// Plays real rounds through the UI at phone and desktop sizes and checks the
// invariants that screenshots alone miss: pause really pauses, resize keeps the
// table inside the viewport, reload resumes the exact turn, and scores add up.
import { chromium } from 'playwright';
const BASE=process.argv[2]||'http://localhost:4173/';
const failures=[];const check=(ok,message)=>{if(!ok){failures.push(message);console.log('  ✗',message);}else console.log('  ✓',message);};
const browser=await chromium.launch();
async function open(viewport,settings={},mobile=false){
  const context=await browser.newContext({viewport,hasTouch:mobile,isMobile:mobile,serviceWorkers:'block'});
  const page=await context.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.addInitScript(s=>{if(!sessionStorage.getItem('e2e')){sessionStorage.setItem('e2e','1');localStorage.clear();localStorage.setItem('taki-pocket-settings',JSON.stringify(s));}},{language:'he',difficulty:'quick',reducedMotion:true,playerCount:4,...settings});
  await page.goto(BASE);await page.waitForTimeout(500);return {page,context,errors};
}
const snapshot=page=>page.evaluate(()=>window.RunesQA.snapshot());
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('taki-pocket-match')||'null'));
async function humanStep(page){
  return page.evaluate(()=>{
    const q=s=>document.querySelector(s);
    if(q('.result-slip'))return 'result';
    const gem=q('.color-choice .gem');if(gem){gem.click();return 'color';}
    if(!q('.game.human-turn'))return 'wait';
    const legal=q('.hand .card.legal');
    if(legal){legal.click();if(legal.classList.contains('selected'))legal.click();return 'play';}
    const fire=q('[data-close-taki]');if(fire){fire.click();return 'fire';}
    q('[data-draw]').click();return 'draw';
  });
}
async function playRound(page){
  for(let i=0;i<2500;i++){const step=await humanStep(page);if(step==='result')return true;if(step==='wait')await page.mouse.click(8,(await page.viewportSize()).height*.55);await page.waitForTimeout(step==='wait'?120:60);}
  return false;
}
async function fitsViewport(page){return page.evaluate(()=>{const w=innerWidth,h=innerHeight;const out=[...document.querySelectorAll('.seat-plate,.piles,.hand-frame,.game-head')].filter(n=>{const r=n.getBoundingClientRect();return r.left<-1||r.right>w+1||r.top<-1||r.bottom>h+1;});return {ok:out.length===0&&document.scrollingElement.scrollWidth<=w,out:out.map(n=>n.className)};});}

console.log('Home');
{const {page,context,errors}=await open({width:390,height:844},{},true);
  check(await page.locator('[data-tavern]').isVisible(),'home shows Tavern Match');
  check(await page.locator('[data-duel]').isVisible(),'home shows Duel');
  await page.click('[data-open="quick"]');check(await page.locator('.quick-sheet').isVisible(),'Quick Play sheet opens');
  const bg=await page.locator('.tavern-sheet').evaluate(n=>getComputedStyle(n).backgroundImage);check(bg.includes('gradient'),'Quick Play sheet is opaque parchment');
  check(errors.length===0,`no console errors (${errors.join(' | ')})`);await context.close();}

console.log('Quick Play: pause, resize, reload');
{const {page,context,errors}=await open({width:390,height:844},{reducedMotion:false},true);
  await page.click('[data-open="quick"]');await page.click('.quick-sheet [data-quick]');await page.waitForTimeout(400);
  for(let i=0;i<200&&(await snapshot(page)).current==='p0';i++){await humanStep(page);await page.waitForTimeout(150);}
  await page.click('[data-open="pause"]');const before=(await saved(page)).game.turn;await page.waitForTimeout(4000);
  check((await saved(page)).game.turn===before,'nothing moves while paused');
  await page.click('.pause-sheet .primary-button');await page.waitForTimeout(3500);
  const snap=await snapshot(page);check(snap.sheet===null&&((await saved(page)).game.turn!==before||snap.current==='p0'),'play resumes after closing pause');
  for(const size of [{width:1366,height:768},{width:820,height:1180},{width:844,height:390},{width:320,height:568},{width:1920,height:1080}]){await page.setViewportSize(size);await page.waitForTimeout(300);const fit=await fitsViewport(page);check(fit.ok,`table fits ${size.width}×${size.height} after resize ${fit.out.join(',')}`);}
  await page.click('[data-open="pause"]');await page.waitForTimeout(300);const turn=(await saved(page)).game.turn;await page.reload();await page.waitForTimeout(500);check((await saved(page)).game.turn===turn,'the save survives a reload');await page.click('[data-resume]');
  check((await snapshot(page)).turn===turn,'reload resumes the exact turn');
  check(errors.length===0,`no console errors (${errors.join(' | ')})`);await context.close();}

console.log('Tavern Match: two scored rounds');
{const {page,context,errors}=await open({width:1366,height:768});
  await page.click('[data-tavern]');let total=0;
  for(let round=1;round<=2;round++){
    check(await playRound(page),`round ${round} reaches the result slip`);
    const match=await saved(page),result=match.results.at(-1);
    total=Object.values(match.scores).reduce((a,b)=>a+b,0);
    check(result.points===Object.values(result.remaining).reduce((a,b)=>a+b,0),`round ${round} points equal the cards left in losing hands`);
    const shown=await page.locator(`[data-score-anchor="${result.winnerId}"] bdi`).first().textContent();
    check(Number(shown)===match.scores[result.winnerId],`winner's table score shows ${match.scores[result.winnerId]}`);
    await page.click('[data-next]');await page.waitForTimeout(400);
  }
  check(total===(await saved(page)).results.reduce((a,r)=>a+r.points,0),'cumulative scores persist between rounds');
  check(errors.length===0,`no console errors (${errors.join(' | ')})`);await context.close();}

console.log('Duel vs Bramm: one round, English');
{const {page,context,errors}=await open({width:390,height:844},{language:'en'},true);
  await page.click('[data-duel]');await page.click('[data-duel-go="0"]');await page.click('.duel-sit[data-opponent="bramm"]');await page.waitForSelector('.duel-seat.opponent-bramm .character-art',{timeout:10000}).catch(()=>{});
  check(await page.locator('.duel-seat.opponent-bramm .character-art').isVisible(),'Bramm sits at the table');
  check(await playRound(page),'duel round reaches the result slip');
  check(errors.length===0,`no console errors (${errors.join(' | ')})`);await context.close();}

console.log('Duel vs Edrin: one round, Hebrew');
{const {page,context,errors}=await open({width:390,height:844},{language:'he'},true);
  await page.click('[data-duel]');await page.click('[data-duel-go="1"]');await page.click('.duel-sit[data-opponent="edrin"]');await page.waitForTimeout(1500);
  check(await page.locator('.duel-seat.opponent-edrin .character-art').isVisible(),'Edrin sits at the table');
  check(await page.locator('.duel-seat .speech:not(.character-speech)').count()===0,'no generic bot bubble at Edrin\'s seat');
  check(await playRound(page),'duel round reaches the result slip');
  check(errors.length===0,`no console errors (${errors.join(' | ')})`);await context.close();}

console.log('Duel select: six voiced regulars, swipe, random regular');
{const {page,context,errors}=await open({width:390,height:844},{language:'en'},true);
  check(await page.evaluate(()=>[...document.querySelectorAll('.home-choice')].map(n=>n.classList[1]).join())==='duel-choice,tavern-choice,quick-choice','home order: Duel, Tavern Match, Quick Play');
  await page.click('[data-duel]');await page.waitForTimeout(300);
  check(await page.locator('.duel-slide').count()===7,'exactly seven voiced regulars at the duel table');
  const first=await page.getAttribute('.duel-sit','data-opponent');
  const box=await page.locator('.duel-carousel').boundingBox();
  await page.mouse.move(box.x+box.width*.8,box.y+box.height*.3);await page.mouse.down();await page.mouse.move(box.x+box.width*.2,box.y+box.height*.3,{steps:8});await page.mouse.up();await page.waitForTimeout(300);
  check(await page.getAttribute('.duel-sit','data-opponent')!==first,'a swipe brings the next opponent');
  await page.click('[data-random-opponent]');await page.waitForTimeout(1500);
  const id=(await saved(page))?.opponentId;check(!!id&&!['bramm','edrin','ragna','kesh','veyra','gorvan'].includes(id),`random regular is one of the unvoiced nine (${id})`);
  check(errors.length===0,`no console errors (${errors.join(' | ')})`);await context.close();}

console.log('Duel vs Ragna: one round, Hebrew and English');
for(const language of ['he','en']){const {page,context,errors}=await open({width:390,height:844},{language,captions:true},true);
  await page.click('[data-duel]');await page.click('[data-duel-go="2"]');await page.click('.duel-sit[data-opponent="ragna"]');await page.waitForSelector('.duel-seat.opponent-ragna .character-art',{timeout:10000}).catch(()=>{});
  check(await page.locator('.duel-seat.opponent-ragna .character-art').isVisible(),'Ragna sits at the table');
  await page.waitForTimeout(800);const bubble=await page.locator('.character-speech').first();
  check(await bubble.count()===1&&(await bubble.getAttribute('dir'))===(language==='he'?'rtl':'ltr'),'her intro bubble shows in the active language');
  check(!/\[|\]/.test(await bubble.textContent()),'no acting directions in the bubble');
  check(await page.locator('.duel-seat .speech:not(.character-speech)').count()===0,'no generic bot bubble at Ragna\'s seat');
  check(await playRound(page),'duel round reaches the result slip');
  check(errors.length===0,`no console errors (${errors.join(' | ')})`);await context.close();}

console.log('Duel vs Kesh: one round, Hebrew and English');
for(const language of ['he','en']){const {page,context,errors}=await open({width:390,height:844},{language,captions:true},true);
  await page.click('[data-duel]');await page.click('[data-duel-go="3"]');await page.click('.duel-sit[data-opponent="kesh"]');await page.waitForSelector('.duel-seat.opponent-kesh .character-art',{timeout:10000}).catch(()=>{});
  check(await page.locator('.duel-seat.opponent-kesh .character-art').isVisible(),'Kesh sits at the table');
  check(/\/assets\/kesh\/expressions\/kesh_\d\d_/.test(await page.getAttribute('.duel-seat.opponent-kesh .character-art','src')),'his new expression art, not the old sprite');
  await page.waitForTimeout(800);const bubble=page.locator('.character-speech').first();
  check(await bubble.count()===1&&(await bubble.getAttribute('dir'))===(language==='he'?'rtl':'ltr'),'his first-meeting intro bubble shows in the active language');
  check(!/\[|\]/.test(await bubble.textContent()),'no acting directions in the bubble');
  check(await page.locator('.duel-seat .speech:not(.character-speech)').count()===0,'no generic bot bubble at Kesh\'s seat');
  check(await playRound(page),'duel round reaches the result slip');
  const said=await page.evaluate(()=>window.KeshDebug.history().map(item=>item.voice));check(said.every(voice=>/^kesh_/.test(voice)),'only his own authored lines');
  check(errors.length===0,`no console errors (${errors.join(' | ')})`);await context.close();}

// v104: Veyra (Hebrew takes, two lines English-only) and Gorvan (English voice, Hebrew bubbles).
// v113: the Bounty Hunter (English voice, Hebrew bubbles; a first meeting is always "Hello.").
for(const [who,index] of [['veyra',4],['gorvan',5],['bounty_hunter',6]]){
  console.log(`Duel vs ${who}: one round, Hebrew and English`);
  for(const language of ['he','en']){const {page,context,errors}=await open({width:390,height:844},{language,captions:true},true);
    await page.click('[data-duel]');await page.click(`[data-duel-go="${index}"]`);await page.click(`.duel-sit[data-opponent="${who}"]`);await page.waitForSelector(`.duel-seat.opponent-${who} .character-art`,{timeout:10000}).catch(()=>{});
    check(await page.locator(`.duel-seat.opponent-${who} .character-art`).isVisible(),`${who} sits at the table`);
    check(new RegExp(`/assets/${who}/expressions/${who}_\\d\\d_`).test(await page.getAttribute(`.duel-seat.opponent-${who} .character-art`,'src')),'expression art from the character pack');
    await page.waitForTimeout(who==='gorvan'?2600:who==='bounty_hunter'?800:1200);const bubble=page.locator('.character-speech').first();
    check(await bubble.count()===1&&(await bubble.getAttribute('dir'))===(language==='he'?'rtl':'ltr'),'the first-meeting intro bubble shows in the active language');
    const text=await bubble.textContent().catch(()=>'');check(!/\[|\]/.test(text),'no acting directions in the bubble');
    if(language==='he')check(!/[A-Za-z]/.test(text),`a Hebrew bubble (${text})`);
    check(await page.locator('.duel-seat .speech:not(.character-speech)').count()===0,'no generic bot bubble at the seat');
    const voices=new Set();const watch=setInterval(async()=>{try{const v=(await snapshot(page)).voice;if(v)voices.add(v);}catch{}},150);
    check(await playRound(page),'duel round reaches the result slip');clearInterval(watch);
    check([...voices].every(v=>v.startsWith(`${who}_`)),`only their own authored lines (${[...voices].join(', ')})`);
    if(language==='he')check(![...voices].some(v=>['veyra_intro_02','veyra_player_good_move_01'].includes(v)),'English-only lines never play in Hebrew');
    check(errors.length===0,`no console errors (${errors.join(' | ')})`);await context.close();}
}
console.log('Tavern Match: Veyra and Gorvan at one table');
{const {page,context,errors}=await open({width:390,height:844},{language:'en',captions:true},true);
  await page.evaluate(()=>window.TavernDebug.startWith(['veyra','gorvan']));await page.waitForTimeout(1500);
  check(await page.locator('.seat-figure.guest-veyra img').isVisible()&&await page.locator('.seat-figure.guest-gorvan img').isVisible(),'both sit with their live faces');
  const lines=await page.evaluate(()=>window.TavernDebug.banter('gorvan_veyra_flame'));check(JSON.stringify(lines)==='["veyra_banter_gorvan_02a","gorvan_idle_03"]','their exchange plays as one authored sequence');
  await page.waitForTimeout(800);check(await page.locator('.guest-speech').count()===1,'one bubble at a time');
  check(await playRound(page),'a round with them reaches the result slip');
  check((await snapshot(page)).voiceInterruptions===0,'no voice ever cut across another');
  check(errors.length===0,`no console errors (${errors.join(' | ')})`);await context.close();}

console.log('Tavern Match: the Bounty Hunter with Gorvan and Edrin (English, then Hebrew text-only)');
for(const language of ['en','he']){const {page,context,errors}=await open({width:390,height:844},{language,captions:true},true);
  await page.evaluate(()=>window.TavernDebug.startWith(['bounty_hunter','gorvan','edrin']));await page.waitForTimeout(1500);
  // A forced exchange skips the table's scheduling, so wait for any opening line to finish first.
  for(let i=0;i<40&&((await snapshot(page)).voice||(await snapshot(page)).guestSpeaking);i++)await page.waitForTimeout(200);
  check(await page.locator('.seat-figure.guest-bounty_hunter img').isVisible(),'the Hunter sits with his live body language');
  const lines=await page.evaluate(()=>window.TavernDebug.banter('hunter_vampire_trio'));check(lines?.length===5,'the three-person sequence plays whole');
  const voices=new Set();let bubbles=0;for(let i=0;i<70;i++){const s=await snapshot(page);if(s.voice)voices.add(s.voice);if(s.quip?.guest)bubbles++;await page.waitForTimeout(200);}
  if(language==='he')check(voices.size===0&&bubbles>0,'Hebrew: the English-only exchange runs as text, never one voiced half');else check(voices.size>=4,`English: voiced (${voices.size} takes heard)`);
  check(await playRound(page),'a round with him reaches the result slip');
  check((await snapshot(page)).voiceInterruptions===0,'no voice ever cut across another');
  check(errors.length===0,`no console errors (${errors.join(' | ')})`);await context.close();}

console.log('Tavern Match: voiced guests, and the Settings switch');
{const {page,context,errors}=await open({width:1366,height:768},{language:'en',captions:true});
  await page.evaluate(()=>window.TavernDebug.startWith(['ragna','kesh']));await page.waitForSelector('.seat-figure.guest-ragna img',{timeout:10000}).catch(()=>{});
  check(await page.locator('.seat-figure.guest-ragna img').count()===1&&await page.locator('.seat-figure.guest-kesh img').count()===1,'two guests sit at the table with their live faces');
  check(await playRound(page),'a round with guests reaches the result slip');
  const log=await page.evaluate(()=>window.TavernDebug.state().log.map(item=>item.voice));check(log.every(voice=>/^(ragna|kesh)_/.test(voice)),`only the seated guests speak (${log.join(', ')})`);
  check((await snapshot(page)).voiceInterruptions===0,'no voice ever cut across another');
  check(errors.length===0,`no console errors (${errors.join(' | ')})`);await context.close();}
{const {page,context,errors}=await open({width:1366,height:768},{language:'en',tavernGuestMode:'off'});let any=false;
  for(let i=0;i<6;i++){await page.click('[data-tavern]');await page.waitForTimeout(700);if(await page.locator('.guest-figure').count())any=true;await page.click('[data-open="pause"]');await page.click('.pause-sheet [data-home]');await page.waitForTimeout(300);}
  check(!any,'with the Settings choice "Off", no voiced guest sits down');
  check(errors.length===0,`no console errors (${errors.join(' | ')})`);await context.close();}

await browser.close();
console.log(failures.length?`\n${failures.length} check(s) failed`:'\nAll smoke checks passed');
process.exit(failures.length?1:0);
