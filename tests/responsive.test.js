import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const css=await readFile(new URL('../dist/styles.css',import.meta.url),'utf8');
const app=await readFile(new URL('../dist/app.js',import.meta.url),'utf8');
const card=await readFile(new URL('../dist/ui/card.js',import.meta.url),'utf8');

test('presentation defines compact-safe roomy portrait, landscape, wide, and short-window layouts',()=>{
  for(const condition of ['(min-width:600px) and (orientation:portrait)','(min-width:760px) and (min-aspect-ratio:11/10)','(min-width:1180px) and (min-aspect-ratio:13/10)','(min-width:760px) and (max-height:590px)']){
    assert.ok(css.includes(condition),`missing responsive condition ${condition}`);
  }
  assert.match(css,/\.app-shell\{max-width:none;container-type:inline-size/);
});

test('hand spacing is measured from the live container and recalculated after resize',()=>{
  assert.match(app,/function layoutHand\(\)/);
  assert.match(app,/hand\.clientWidth/);
  assert.match(app,/getBoundingClientRect\(\)\.width/);
  assert.match(app,/window\.addEventListener\('resize'/);
  assert.doesNotMatch(card,/Math\.min\(432/);
});

test('the live hand always renders every card and compresses them to fit',()=>{
  assert.match(app,/shown=human\.hand,top=topCard\(state\)/);
  assert.doesNotMatch(app,/human\.hand\.slice\(0,10\)/);
  assert.doesNotMatch(app,/data-show-all/);
  assert.match(app,/calculateHandLayout\(\{count,cardWidth,available,portrait\}\)/);
});

test('card travel resolves source and destination anchors from the live DOM',()=>{
  assert.match(app,/source\.getBoundingClientRect\(\),to=destination\.getBoundingClientRect\(\)/);
  assert.match(app,/data-draw-anchor/);
  assert.match(app,/data-discard-anchor/);
  assert.match(app,/data-hand-anchor/);
  assert.match(app,/root\.querySelector\(`\.hand \[data-card-id="\$\{action\.cardId\}"\]`\)/);
});

test('mobile cards support a velocity-aware upward flick',()=>{
  assert.match(app,/upwardFlick=dy<-22&&velocity>\.28/);
  assert.match(app,/card\.onpointercancel=/);
  assert.match(css,/\.hand \.card\{touch-action:none\}/);
});

test('scene uses independent world, seat and viewport coordinate layers',()=>{
  for(const layer of ['tavern-environment','table-body','table-surface','table-engraving','scene-lighting','environment-props','seat-layer','gameplay-anchors','viewport-space']){
    assert.ok(app.includes(layer)||css.includes(layer),`missing scene layer ${layer}`);
  }
  for(const space of ['data-space="world"','data-space="seat"','data-space="viewport"'])assert.ok(app.includes(space),`missing ${space}`);
  assert.match(css,/tavern-environment-v37\.jpg/);
  assert.match(css,/table-wood-v37\.jpg/);
  assert.doesNotMatch(css,/elder-tavern-table\.jpg/);
});

test('decorative opponent layer cannot intercept draw pile taps',()=>{
  assert.match(css,/\.seat-layer\{z-index:20;pointer-events:none\}/);
  assert.match(app,/<button class="pile draw-pile [^`]*data-draw data-draw-anchor/);
});

test('landscape camera crops the table as furniture instead of framing a board',()=>{
  assert.match(css,/camera-over-furniture composition/);
  assert.match(css,/\.table-body\{\s*border:0;/);
  assert.match(css,/--table-left:-12%;--table-right:-12%;--table-top:18%;--table-bottom:-72%/);
  assert.match(css,/\.scene-home\{--table-left:-10%;--table-right:-10%;--table-top:32%;--table-bottom:-58%\}/);
});

test('duel character is composited behind a physical far rim',()=>{
  assert.match(app,/class="duel-depth-rim"/);
  assert.match(css,/\.duel-depth-rim\{/);
  assert.match(css,/\.duel-presence \.duel-sprite\{[\s\S]*mask-image:radial-gradient/);
});

test('Bramm keeps one fixed two-layer image stage across game renders',()=>{
  assert.match(app,/data-bramm-stage-placeholder/);
  assert.match(app,/placeholder\.replaceWith\(brammStage\)/);
  assert.match(app,/function syncBrammStage\(stage\)/);
  assert.match(css,/\.bramm-art-stage \.bramm-art-previous/);
  assert.match(css,/\.bramm-art-stage \.bramm-art-current/);
});

test('compact art direction stays layered, deterministic, and safe-area aware',()=>{
  for(const variable of ['--scene-density','--engraving-opacity','--ambient-light-strength','--seat-spacing','--prop-scale','--mobile-hand-zone'])assert.ok(css.includes(variable),`missing ${variable}`);
  assert.match(css,/@media \(max-width:599px\)/);
  assert.match(css,/height:100dvh/);
  assert.match(css,/min-height:100svh/);
  assert.match(css,/env\(safe-area-inset-bottom\)/);
  assert.match(app,/class="seat-object prop-\$\{index\+1\} object-\$\{item\}"/);
  assert.match(app,/const seatPropStories=Object\.freeze/);
  assert.match(css,/\.seat-props \.seat-object/);
});

test('finish pass shares one physical depth language without restoring turn narration',()=>{
  for(const token of ['--physical-shadow-card','--physical-shadow-raised','--physical-shadow-prop','--physical-shadow-plaque']){
    assert.ok(css.includes(token),`missing physical depth token ${token}`);
  }
  assert.match(css,/\.opponent\.active:after,\.duel-opponent\.active:after\{content:none\}/);
  assert.match(css,/\.hand \.card\.selected\{[^}]*scale\(1\.015\)/);
  assert.match(app,/cardBackStackHTML\('resume-game-token'\)/);
});

test('environmental refinement uses real cards and removes the old generic mug and coins',()=>{
  assert.match(app,/cardBackStackHTML\('mode-token menu-card-stack quick-card-stack'\)/);
  assert.match(app,/cardBackStackHTML\('abandoned-cards'\)/);
  assert.match(css,/\.card\.card-back\{background:var\(--oxblood\)/);
  assert.doesNotMatch(app,/stylized_beer_mug|world-mug|world-coins|coin-prop/);
  assert.doesNotMatch(app,/<model-viewer/);
  assert.match(app,/\.\/assets\/props\//);
  assert.match(css,/radial-gradient\(circle at 8px 50%/);
});

test('mode-specific framing refines mobile and portrait tablet compositions',()=>{
  assert.match(app,/session\.mode==='tavern'\?'tavern-table'/);
  assert.match(css,/\.tavern-table \.center\{scale:\.93/);
  assert.match(css,/@media \(min-width:600px\) and \(max-width:899px\) and \(orientation:portrait\)/);
  assert.match(css,/\.quick-opponent \.physical-fan\{translate:-50% 0/);
});

test('refinement pass communicates state through table objects and motion',()=>{
  assert.match(app,/function colorRuneHTML/);
  assert.match(app,/active-color-rune/);
  assert.match(app,/gem-rune/);
  assert.match(app,/trajectory==='draw'\?drawFrames:playFrames/);
  assert.match(app,/classList\.add\('receiving-card'\)/);
  assert.doesNotMatch(app,/class="extra-turn-token"/);
  assert.match(app,/\{browse,overlap,spread,lift,scale\}=calculateHandLayout/);
  assert.match(app,/resultScoreHTML\(winner\)/);
  assert.match(css,/\.result-wrap\.table-result\{inset:0/);
  assert.match(css,/\.waiting \.hand\{filter:saturate\(\.94\) brightness\(\.96\);transform:none\}/);
});

test('direction engraving stays full-size, quiet at rest, and surges only for Reverse',()=>{
  assert.match(css,/v47: quiet direction engraving at rest/);
  assert.match(css,/\.direction-engraving\{[\s\S]*?opacity:\.34;[\s\S]*?filter:saturate\(\.58\) blur\(\.12px\)/);
  assert.match(css,/\.direction-engraving\.lit\{[\s\S]*?opacity:\.96;[\s\S]*?drop-shadow/);
  assert.match(css,/@keyframes direction-surge/);
  assert.doesNotMatch(css,/v47:[\s\S]*?\.direction-engraving\{[^}]*width:/);
});

test('seat props use a deterministic curated story with one to three objects',()=>{
  for(const theme of ['casual','practical','gambler','tidy','mystical','rustic'])assert.ok(app.includes(`theme:'${theme}'`));
  for(const object of ['woodenTankard','pewterGoblet','scatteredCoins','dice','snack','pouch','parchment','rune','darkBottle','cork'])assert.ok(app.includes(`'${object}'`));
  assert.match(app,/data-prop-count="\$\{items\.length\}"/);
  assert.match(app,/items\.map\(seatPropItemHTML\)/);
  assert.match(app,/\['duel','tavern'\]\.includes\(session\?\.mode\)\?fullItems\.slice\(0,2\):fullItems/);
  assert.match(app,/session\?\.seed/);
  assert.doesNotMatch(app,/Math\.random\(\).*seatProp/);
  assert.match(css,/Curated seat stories: supplied PNG assets only/);
  assert.match(css,/\.seat-props \.prop-3\{display:none\}/);
  assert.match(css,/\.tavern-table \.seat-props \.prop-2,\.tavern-table \.seat-props \.prop-3\{display:none\}/);
  assert.match(css,/\.duel-opponent \.duel-props \.prop-2,\.duel-opponent \.duel-props \.prop-3\{display:none\}/);
  assert.match(app,/propsHTML\(opponent,`duel-props duel-\$\{opponent\.id\}`\)/);
});

test('Tavern props emphasize one signature and one subordinate seat-owned object',()=>{
  assert.match(css,/v51: Tavern props read as seat-owned signatures/);
  assert.match(css,/\.tavern-table \.seat-props\{width:122px;height:94px;scale:1\.18/);
  assert.match(css,/\.tavern-table \.seat-props \.prop-1\{width:78px;height:88px/);
  assert.match(css,/\.tavern-table \.seat-props \.prop-2\{width:54px;height:43px/);
  assert.match(css,/\.tavern-table \.seat-props \.prop-2\{display:none\}/);
});

test('mobile polish keeps the table calm while improving seat identity and scanability',()=>{
  assert.match(app,/archetype-\$\{archetype\}/);
  assert.match(app,/data-archetype="\$\{archetype\}"/);
  assert.match(css,/v48: mobile polish without reopening the established table composition/);
  assert.match(css,/\.direction-engraving\{opacity:\.27;filter:saturate\(\.5\) blur\(\.18px\)\}/);
  assert.match(css,/\.turn-whisper span\{min-width:92px;padding:4px 13px 5px;font-size:13px/);
  for(const archetype of ['hunter','bard','mercenary','scholar','mysterious'])assert.match(css,new RegExp(`archetype-${archetype} \\.opponent-fan`));
  assert.match(css,/\.table-shell:not\(\.duel-table\) \.score-slate\{[^}]*width:98px/);
  assert.match(css,/\.deck-count:after\{content:"";[^}]*height:10px/);
  assert.match(css,/\.elder-home \.duel-invite\{width:94%;min-height:62px/);
  assert.match(css,/\.elder-home \.table-tools button\{min-width:82px;min-height:44px/);
});

test('opponent turn motion is a slow micro-tilt and central play state wins overlaps',()=>{
  assert.match(css,/\.gameplay-anchors\{z-index:24\}/);
  assert.match(css,/animation:opponent-presence-sway 3\.8s ease-in-out infinite alternate/);
  assert.match(css,/@keyframes opponent-presence-sway\{from\{rotate:-\.65deg\}to\{rotate:\.65deg\}\}/);
  assert.doesNotMatch(css,/@keyframes opponent-presence-sway[^}]*transform:/);
  assert.match(css,/\.tavern-table \.seat-right \.opponent-fan,[^{]*\{translate:16px 0\}/);
  assert.match(css,/\.taki-panel\{position:relative;z-index:36\}/);
});
