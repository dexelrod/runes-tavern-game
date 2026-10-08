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
  R('veyra_banter_gorvan_03a','veyra','omen_uneasy',"You don't have a normal shadow.",'הצל שלך לא נורמלי.',2.19,['en']),
  // ── v106: thirteen new exchanges, recorded in English only (Hebrew is subtitle text for now) ──
  // Bramm + Veyra: the warning is obviously for everyone else; destiny smells of ale.
  R('veyra_banter_bramm_01a','veyra','omen_uneasy','The cards are warning you.','הקלפים מנסים להזהיר אותך.',2.27,['en']),
  R('bramm_banter_veyra_01b','bramm','11_showing_off','They ought to warn the others.','שיזהירו את האחרים.',2.19,['en']),
  R('bramm_banter_veyra_02a','bramm','23_gloating',"One card. That's what destiny looks like.",'קלף אחד. ככה נראה הגורל.',3.87,['en']),
  R('veyra_banter_bramm_02b','veyra','banter_edrin_exasperated',"Destiny doesn't usually smell of ale.",'בדרך כלל הגורל לא מריח מבירה.',2.85,['en']),
  R('bramm_banter_veyra_02c','bramm','34_drinking_relaxed','Mine does.','שלי כן.',1.23,['en']),
  // Edrin + Kesh: the stone does not know who is winning; sometimes it is just strategy.
  R('edrin_banter_kesh_01a','edrin','idle_distracted',"Does that stone know who's winning?",'האבן הזאת יודעת מי מנצח?',2.35,['en']),
  R('kesh_banter_edrin_01b','kesh','turning_rune','No.','לא.',0.99,['en']),
  R('edrin_banter_kesh_01c','edrin','casual_acceptance','Lovely. Neither do I.','יופי. גם אני לא.',2.27,['en']),
  R('edrin_banter_kesh_02a','edrin','mildly_impressed','Was that part of the prophecy?','זה היה חלק מהנבואה?',2.04,['en']),
  R('kesh_banter_edrin_02b','kesh','good_move_satisfaction','No. That was strategy.','לא. זו הייתה אסטרטגיה.',2.43,['en']),
  R('edrin_banter_kesh_02c','edrin','oh_dear','Ah. Dangerous stuff.','אה. עסק מסוכן.',2.51,['en']),
  // Ragna + Kesh: she has started to recognise his routine, and is not impressed.
  R('ragna_banter_kesh_01a','ragna','impatient_focus','Is the stone playing for you?','האבן משחקת במקומך?',2.04,['en']),
  R('kesh_banter_ragna_01b','kesh','close_observation',"I'm thinking.",'אני חושב.',1.23,['en']),
  R('ragna_banter_kesh_01c','ragna','eyes_on_table','Then think faster.','אז תחשוב מהר יותר.',1.80,['en']),
  R('kesh_banter_ragna_02a','kesh','reverse_observation',"You've changed the course.",'שינית את הכיוון.',1.88,['en']),
  R('ragna_banter_kesh_02b','ragna','default_focused',"That's what the card does.",'בשביל זה הקלף.',1.72,['en']),
  R('kesh_banter_ragna_02c','kesh','dry_amusement','I meant something else.','התכוונתי למשהו אחר.',1.96,['en']),
  R('ragna_banter_kesh_02d','ragna','calm_after_outburst','Of course you did.','ברור שהתכוונת.',1.57,['en']),
  // Veyra + Ragna 02: the ward is sacred; so is the ale.
  R('veyra_banter_ragna_02a','veyra','intro_something_wrong',"You're covering the ward.",'את מכסה את סמל ההגנה.',1.96,['en']),
  R('ragna_banter_veyra_02b','ragna','default_focused','With my ale.','עם הבירה שלי.',1.80,['en']),
  R('veyra_banter_ragna_02c','veyra','curse_offended',"It's sacred.",'הוא מקודש.',1.57,['en']),
  R('ragna_banter_veyra_02d','ragna','strong_move_satisfied','So is mine.','גם היא.',1.23,['en']),
  // Veyra + Edrin 02: he moved the bones, very considerately.
  R('veyra_banter_edrin_02a','veyra','intro_bones','Who moved the bones?','מי הזיז את העצמות?',2.12,['en']),
  R('edrin_banter_veyra_02b','edrin','drinking','I needed room for my drink.','הייתי צריך מקום לכוס שלי.',2.04,['en']),
  R('veyra_banter_edrin_02c','veyra','draw_no_no_no','You moved the bones?','הזזת את העצמות?',2.04,['en']),
  R('edrin_banter_veyra_02d','edrin','casual_acceptance','Very carefully.','בזהירות רבה.',2.04,['en']),
  // Gorvan, in his own words at last: dry, unhurried, almost sincere.
  R('gorvan_banter_bramm_04a','gorvan','dry_amusement',"One curse, and you're already giving a speech.",'קללה אחת, וכבר התחלת לנאום.',3.47,['en']),
  R('bramm_banter_gorvan_04b','bramm','32_angry_at_spectators','IT WAS FOUR CARDS!','זה היה ארבעה קלפים!',2.12,['en']),
  R('gorvan_banter_bramm_04c','gorvan','pleasant','An impressive speech, then.','נאום מרשים, אם כך.',2.19,['en']),
  R('ragna_banter_gorvan_03a','ragna','impatient_focus','Do you ever hurry?','אתה ממהר לפעמים?',1.65,['en']),
  R('gorvan_banter_ragna_03b','gorvan','reminiscing','I did once.','פעם אחת.',1.96,['en']),
  R('ragna_banter_gorvan_03c','ragna','game_gets_interesting','And?','ו...?',0.99,['en']),
  R('gorvan_banter_ragna_03d','gorvan','neutral',"Didn't suit me.",'לא התאים לי.',1.41,['en']),
  R('edrin_banter_gorvan_03a','edrin','good_move_casual','Would you like some wine?','רוצה קצת יין?',1.57,['en']),
  R('gorvan_banter_edrin_03b','gorvan','formal','No, thank you.','לא, תודה.',1.65,['en']),
  R('edrin_banter_gorvan_03c','edrin','casual_acceptance',"Good. It's awful.",'יופי. הוא נורא.',2.19,['en']),
  R('kesh_banter_gorvan_03a','kesh','rune_was_wrong','I cannot read your future.','אני לא מצליח לקרוא את העתיד שלך.',2.59,['en']),
  R('gorvan_banter_kesh_03b','gorvan','pleasant','How refreshing.','איזו הקלה.',1.57,['en']),
  R('veyra_banter_gorvan_04a','veyra','omen_sudden_certainty','There are seven death omens around your chair.','יש שבעה סימני מוות סביב הכיסא שלך.',3.24,['en']),
  R('gorvan_banter_veyra_04b','gorvan','dry_amusement','That seems excessive.','קצת מוגזם, לא?',1.96,['en']),
  // ── v107: the player joins the conversation (English recordings only; Hebrew is subtitle text) ──
  // Whoever addresses the player looks out at them; the other keeps to the speaker.
  R('bramm_banter_ragna_04a','bramm','08_dismissive_lucky','Lucky.','מזל.',1.31,['en']),
  R('ragna_banter_bramm_04b','ragna','judging_wager',"That's the third time you've said that.",'זאת הפעם השלישית שאתה אומר את זה.',2.35,['en']),
  R('bramm_banter_ragna_04c','bramm','15_defensive_excuse','Long streak.','רצף ארוך.',1.57,['en']),
  R('ragna_banter_edrin_05a','ragna','impatient_focus',"The cards won't play themselves.",'הקלפים לא ישחקו מעצמם.',2.12,['en']),
  R('edrin_banter_ragna_05b','edrin','casual_acceptance',"I've tried. They really won't.",'ניסיתי. הם באמת לא.',2.69,['en']),
  R('kesh_banter_edrin_03a','kesh','player_one_card','One card left. The balance shifts.','נשאר שם קלף אחד. האיזון משתנה.',3.63,['en']),
  R('edrin_banter_kesh_03b','edrin','player_one_card_mild_concern','Should we stop that?','כדאי לעצור את זה?',1.72,['en']),
  R('kesh_banter_edrin_03c','kesh','player_one_card_signs','It would be wise.','זה יהיה נבון.',1.65,['en']),
  R('veyra_banter_gorvan_05a','veyra','king_suspicious',"That wasn't in the prophecy.",'זה לא הופיע בנבואה.',2.04,['en']),
  R('gorvan_banter_veyra_05b','gorvan','certainty','Perhaps the prophecy should learn the rules.','אולי כדאי שהנבואה תלמד את החוקים.',3.08,['en'])
].map(item=>[item.voice,item])));

// A banter recording as a reaction the guest seats can perform (the same shape as
// every authored line: id, voice, captions, expression, priority, duration).
export const banterReaction=voice=>{const item=BANTER_RECORDINGS[voice];if(!item)return null;return Object.freeze({id:voice,trigger:'banter',voice,caption:item.captions.en,captions:item.captions,expression:item.expression,priority:'MEDIUM',category:'banter',duration:Math.round(item.seconds*1000)+650});};
export const banterSpeaker=voice=>BANTER_RECORDINGS[voice]?.speaker||null;
export function resolveBanterVoice(name,locale='en'){
  const item=BANTER_RECORDINGS[name];if(!item)return null;const ui=locale==='he'?'he':'en';if(!item.takes.includes(ui))return null;
  return {name,locale:ui,audioLocale:ui,src:asset(item.speaker,ui==='he'?`${name}_he`:name),caption:item.captions[ui],priority:'MEDIUM'};
}
