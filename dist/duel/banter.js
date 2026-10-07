// ─────────────────────────────────────────────────────────────────────────────
// Tavern banter: authored multi-line exchanges between voiced guests.
//
// A banter is ONE performance: an ordered list of lines, each spoken by a seated
// guest, with a small natural pause between them. The director (tavern-director.js)
// reserves the table's single voice channel for the whole exchange, so nobody
// talks over it, and the face of whoever is speaking follows the line.
//
// Lines are either a guest's ordinary recording (reused on purpose — Gorvan answers
// with lines he already has) or a dedicated banter recording listed in
// BANTER_RECORDINGS below. File names carry the order: `veyra_banter_kesh_01a`,
// `kesh_banter_veyra_01b`, `veyra_banter_kesh_01c`. To add an exchange, add its
// recordings here and one entry to TAVERN_BANTER in tavern-director.js.
//
// Audio policy per exchange:
//   'all'  every line plays in the player's language (Hebrew takes exist);
//   'en'   recorded in English only (every Gorvan conversation): in English it is
//          voiced; in Hebrew it runs as authored Hebrew text only, every line
//          silent — never one voiced half — and only when bubbles are on.
// ─────────────────────────────────────────────────────────────────────────────

const asset=(speaker,name)=>new URL(`../assets/${speaker}/voice/${name}.mp3`,import.meta.url).href;

// Dedicated banter recordings: who says them, the exact authored text (directions
// removed; Hebrew reproduced exactly), the speaker's face for the line, which takes
// exist, and the longer take in seconds.
const R=(voice,speaker,expression,en,he,seconds,takes=['en','he'])=>Object.freeze({voice,speaker,expression,captions:Object.freeze({en,he}),takes:Object.freeze(takes),seconds});
export const BANTER_RECORDINGS=Object.freeze(Object.fromEntries([
  // Veyra + Kesh 01 — she shows him the flame; he is already looking.
  R('veyra_banter_kesh_01a','veyra','banter_kesh_look','Kesh. Look at that.','קאש. תסתכל על זה.',2.35),
  R('kesh_banter_veyra_01b','kesh','watching_fire','I am.','אני מסתכל.',1.57),
  R('veyra_banter_kesh_01c','veyra','banter_kesh_incredulous',"And you're just sitting there?!",'ואתה פשוט יושב שם?!',2.04),
  // Veyra + Kesh 02 — he finds it curious; she finds it screaming.
  R('kesh_banter_veyra_02a','kesh','omen_reading','A curious omen.','סימן מעניין.',2.04),
  R('veyra_banter_kesh_02b','veyra','banter_kesh_correcting',"Curious? It's screaming.",'מעניין? הוא צורח.',2.51),
  R('kesh_banter_veyra_02c','kesh','dry_amusement','You often say that.','את אומרת את זה הרבה.',1.88),
  // Veyra + Ragna — deliberately two lines. That is the whole joke.
  R('veyra_banter_ragna_01a','veyra','banter_ragna_flame','The flame just moved.','הלהבה זזה עכשיו.',1.88),
  R('ragna_banter_veyra_01d','ragna','eyes_on_table','Focus.','פוקוס.',1.23),
  // Veyra + Edrin — a great deal of signs; no idea; neither does she.
  R('veyra_banter_edrin_01a','veyra','banter_edrin_explaining','Three bones crossed, the flame bent east, and then the King appeared. Do you understand?','שלוש עצמות הצטלבו, הלהבה נטתה מזרחה ואז הופיע המלך. ברור מה זה אומר?',5.88),
  R('edrin_banter_veyra_01b','edrin','casual_acceptance','No idea, Veyra.','אין לי מושג מה זה אומר.',2.43),
  R('veyra_banter_edrin_01c','veyra','banter_edrin_exasperated','Good. Neither do I.','יופי. גם לי לא.',2.12),
  // Gorvan's partners (English recordings only; Hebrew is subtitle text).
  R('bramm_banter_gorvan_01a','bramm','04_smug_challenge','Lord Gorvan.','לורד גורבן.',1.88,['en']),
  R('bramm_banter_gorvan_02a','bramm','12_mock_generous','What, too noble to drink with the rest of us?','מה, אצילי מדי בשביל לשתות עם כולנו?',4.28,['en']),
  R('bramm_banter_gorvan_03a','bramm','02_intro_boast','My lord.','אדוני.',1.96,['en']),
  R('edrin_banter_gorvan_01a','edrin','mildly_impressed','Do you always sound like that?','אתה תמיד נשמע ככה?',2.27,['en']),
  R('edrin_banter_gorvan_02a','edrin','idle_distracted','You ever relax?','אתה מתישהו נרגע?',1.65,['en']),
  R('ragna_banter_gorvan_01a','ragna','judging_wager','Lord Gorvan.','לורד גורבן.',2.19,['en']),
  R('ragna_banter_gorvan_02a','ragna','impatient_focus','Are you going to play before sunrise?','אתה מתכוון לשחק לפני הזריחה?',2.51,['en']),
  R('kesh_banter_gorvan_01a','kesh','close_observation','The night sits comfortably around you.','הלילה יושב סביבך בנוחות.',2.85,['en']),
  R('kesh_banter_gorvan_02a','kesh','interesting_choice','You are very patient.','יש לך הרבה סבלנות.',1.88,['en']),
  R('veyra_banter_gorvan_01a','veyra','banter_kesh_correcting','You are making the signs difficult.','אתה מקשה על הסימנים.',2.93,['en']),
  R('veyra_banter_gorvan_02a','veyra','banter_ragna_flame','Why is the flame leaning away from you?','למה הלהבה נוטה ממך?',2.77,['en']),
  R('veyra_banter_gorvan_03a','veyra','omen_uneasy',"You don't have a normal shadow.",'הצל שלך לא נורמלי.',2.19,['en'])
].map(item=>[item.voice,item])));

// A banter recording as a reaction the guest seats can perform (the same shape as
// every authored line: id, voice, captions, expression, priority, duration).
export const banterReaction=voice=>{const item=BANTER_RECORDINGS[voice];if(!item)return null;return Object.freeze({id:voice,trigger:'banter',voice,caption:item.captions.en,captions:item.captions,expression:item.expression,priority:'MEDIUM',category:'banter',duration:Math.round(item.seconds*1000)+650});};
export const banterSpeaker=voice=>BANTER_RECORDINGS[voice]?.speaker||null;
export function resolveBanterVoice(name,locale='en'){
  const item=BANTER_RECORDINGS[name];if(!item)return null;const ui=locale==='he'?'he':'en';if(!item.takes.includes(ui))return null;
  return {name,locale:ui,audioLocale:ui,src:asset(item.speaker,ui==='he'?`${name}_he`:name),caption:item.captions[ui],priority:'MEDIUM'};
}
