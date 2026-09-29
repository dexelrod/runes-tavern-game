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
  assert.match(app,/const overlap=count<2\?0:step-cardWidth/);
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

test('compact art direction stays layered, deterministic, and safe-area aware',()=>{
  for(const variable of ['--scene-density','--engraving-opacity','--ambient-light-strength','--seat-spacing','--prop-scale','--mobile-hand-zone'])assert.ok(css.includes(variable),`missing ${variable}`);
  assert.match(css,/@media \(max-width:599px\)/);
  assert.match(css,/height:100dvh/);
  assert.match(css,/min-height:100svh/);
  assert.match(css,/env\(safe-area-inset-bottom\)/);
  assert.match(app,/class="seat-object object-\$\{item\}"/);
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

test('environmental refinement uses real cards, seat-local prop stories, and an opaque menu mug',()=>{
  assert.match(app,/cardBackStackHTML\('mode-token menu-card-stack quick-card-stack'\)/);
  assert.match(app,/cardBackStackHTML\('abandoned-cards'\)/);
  assert.match(css,/\.card\.card-back\{background:var\(--oxblood\)/);
  assert.match(css,/\.scene-home \.world-mug\{[^}]*opacity:1/);
  assert.match(css,/\.scene-home \.world-coins\{display:none!important\}/);
  assert.match(css,/\.seat-props\.bard \.beer-prop,\.seat-props\.scholar \.beer-prop\{display:none\}/);
  assert.match(css,/\.seat-left \.seat-props\{left:-47px/);
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
  assert.match(app,/const scale=count>=13\?\.93:count>=11\?\.96:1/);
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
  for(const object of ['tankard','goblet','coins','dice','snack','pouch','parchment','rune','bottle','cork'])assert.ok(app.includes(`'${object}'`));
  assert.match(app,/data-prop-count="\$\{story\.items\.length\}"/);
  assert.match(app,/story\.items\.map\(seatPropItemHTML\)/);
  assert.doesNotMatch(app,/Math\.random\(\).*seatProp/);
  assert.match(css,/Curated seat stories: 1–3 restrained objects/);
  assert.match(app,/propsHTML\(opponent,`duel-props duel-\$\{opponent\.id\}`\)/);
});
