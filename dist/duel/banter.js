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

import { VEYRA_VOICE_TRIM } from './veyra.js';

const asset=(speaker,name)=>new URL(`../assets/${speaker}/voice/${name}.mp3`,import.meta.url).href;

// Dedicated banter recordings: who says them, the exact authored text (directions
// removed; Hebrew reproduced exactly), the speaker's face for the line, which takes
// exist, and the longer take in seconds.
// `look` (optional): whom the speaker addresses — a guest id, or 'player'. A character with
// `looks` in its pack (the Bounty Hunter) turns toward that guest's real seat for the line
// instead of using the pack's staging default.
const R=(voice,speaker,expression,en,he,seconds,takes=['en','he'],look=null)=>Object.freeze({voice,speaker,expression,captions:Object.freeze({en,he}),takes:Object.freeze(takes),seconds,look});
export const BANTER_RECORDINGS=Object.freeze(Object.fromEntries([
  // Veyra + Kesh 01 — she shows him the flame; he is already looking.
  R('veyra_banter_kesh_01a','veyra','banter_explaining','Kesh. Look at that.','קאש. תסתכל על זה.',2.35),
  R('kesh_banter_veyra_01b','kesh','watching_fire','I am.','אני מסתכל.',1.57),
  R('veyra_banter_kesh_01c','veyra','banter_incredulous',"And you're just sitting there?!",'ואתה פשוט יושב שם?!',2.04),
  // Veyra + Ragna — deliberately two lines. That is the whole joke.
  R('veyra_banter_ragna_01a','veyra','observing','The flame just moved.','הלהבה זזה עכשיו.',1.88),
  R('ragna_banter_veyra_01d','ragna','eyes_on_table','Focus.','פוקוס.',1.23),
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
  R('veyra_banter_gorvan_02a','veyra','banter_explaining','Why is the flame leaning away from you?','למה הלהבה נוטה ממך?',2.77,['en']),
  R('veyra_banter_gorvan_03a','veyra','silent_doubt',"You don't have a normal shadow.",'הצל שלך לא נורמלי.',2.19,['en']),
  // ── v106: thirteen new exchanges, recorded in English only (Hebrew is subtitle text for now) ──
  // Bramm + Veyra: the warning is obviously for everyone else; destiny smells of ale.
  R('veyra_banter_bramm_01a','veyra','silent_doubt','The cards are warning you.','הקלפים מנסים להזהיר אותך.',2.27,['en']),
  R('bramm_banter_veyra_01b','bramm','11_showing_off','They ought to warn the others.','שיזהירו את האחרים.',2.19,['en']),
  R('bramm_banter_veyra_02a','bramm','23_gloating',"One card. That's what destiny looks like.",'קלף אחד. ככה נראה הגורל.',3.87,['en']),
  R('veyra_banter_bramm_02b','veyra','banter_dry',"Destiny doesn't usually smell of ale.",'בדרך כלל הגורל לא מריח מבירה.',2.85,['en']),
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
  R('veyra_banter_ragna_02a','veyra','banter_correction',"You're covering the ward.",'את מכסה את סמל ההגנה.',1.96,['en']),
  R('ragna_banter_veyra_02b','ragna','default_focused','With my ale.','עם הבירה שלי.',1.80,['en']),
  R('veyra_banter_ragna_02c','veyra','banter_correction',"It's sacred.",'הוא מקודש.',1.57,['en']),
  R('ragna_banter_veyra_02d','ragna','strong_move_satisfied','So is mine.','גם היא.',1.23,['en']),
  // Veyra + Edrin 02: he moved the bones, very considerately.
  R('veyra_banter_edrin_02a','veyra','silent_doubt','Who moved the bones?','מי הזיז את העצמות?',2.12,['en']),
  R('edrin_banter_veyra_02b','edrin','drinking','I needed room for my drink.','הייתי צריך מקום לכוס שלי.',2.04,['en']),
  R('veyra_banter_edrin_02c','veyra','banter_incredulous','You moved the bones?','הזזת את העצמות?',2.04,['en']),
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
  R('veyra_banter_gorvan_04a','veyra','banter_explaining','There are seven death omens around your chair.','יש שבעה סימני מוות סביב הכיסא שלך.',3.24,['en']),
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
  R('veyra_banter_gorvan_05a','veyra','silent_doubt',"That wasn't in the prophecy.",'זה לא הופיע בנבואה.',2.04,['en']),
  R('gorvan_banter_veyra_05b','gorvan','certainty','Perhaps the prophecy should learn the rules.','אולי כדאי שהנבואה תלמד את החוקים.',3.08,['en']),
  // ── v109: Tavern Conversations Vol. 3 — longer exchanges, two of them three-handed (English recordings only) ──
  R('edrin_banter_gorvan_veyra_01a','edrin','intro_reluctant',"Gorvan, you're not planning on turning me into a vampire, are you?","גורבן, אתה לא מתכנן להפוך אותי לערפד, נכון?",4.60,['en']),
  R('gorvan_banter_edrin_veyra_01b','gorvan','silent_down',"No, Edrin.","לא, אדרין.",2.35,['en']),
  R('edrin_banter_gorvan_veyra_01c','edrin','casual_acceptance',"Oh, thank goodness. Thought I'd ask.","אה, תודה לאלים. חשבתי שכדאי לשאול.",3.32,['en']),
  R('veyra_banter_edrin_gorvan_01d','veyra','banter_explaining',"I found three little bones beneath your chair this morning. All pointing towards you.","מצאתי הבוקר שלוש עצמות קטנות מתחת לכיסא שלך. כולן הצביעו לכיוונך.",5.80,['en']),
  R('edrin_banter_gorvan_veyra_01e','edrin','oh_dear',"...I was happier worrying about the vampire.","...העדפתי לדאוג בגלל הערפד.",3.97,['en']),
  R('gorvan_banter_ragna_04a','gorvan','reminiscing',"Ah. I just remembered something I meant to tell you.","אה. בדיוק נזכרתי במשהו שרציתי לספר לכם.",3.32,['en']),
  R('ragna_banter_gorvan_04b','ragna','impatient_focus',"Then make it quick.","אז תעשה את זה קצר.",1.88,['en']),
  R('gorvan_banter_ragna_04c','gorvan','reminiscing',"It was many winters ago. I was staying at a rather peculiar inn, somewhere north of—","זה היה לפני חורפים רבים. התארחתי בפונדק משונה למדי, אי שם צפונית ל...",6.77,['en']),
  R('ragna_banter_gorvan_04d','ragna','yelling_at_tavern',"LEAVE THE BEDTIME STORIES FOR AFTER THE GAME!","את סיפורי הלילה תשמור לאחרי המשחק!",3.16,['en']),
  R('gorvan_banter_ragna_04e','gorvan','silent_down',"...It wasn't a bedtime story.","...זה לא היה סיפור לפני השינה.",2.35,['en']),
  R('ragna_banter_gorvan_04f','ragna','default_focused',"GOOD.","יופי.",1.07,['en']),
  R('bramm_banter_edrin_ragna_01a','bramm','02_intro_boast',"Bramm the Unbeaten. Still has a nice ring to it, doesn't it?","בראם הבלתי מנוצח. עדיין נשמע טוב, אה?",4.52,['en']),
  R('ragna_banter_bramm_edrin_01b','ragna','judging_wager',"You lost two rounds last night.","הפסדת שני סיבובים אתמול.",2.35,['en']),
  R('bramm_banter_edrin_ragna_01c','bramm','15_defensive_excuse',"Two rounds. Not the match.","שני סיבובים. לא את המשחק.",2.51,['en']),
  R('edrin_banter_bramm_ragna_01d','edrin','casual_acceptance',"You lost the match as well.","גם את המשחק הפסדת.",1.96,['en']),
  R('bramm_banter_edrin_ragna_01e','bramm','09_irritated_lucky',"Who asked you?","מי שאל אותך?",1.41,['en']),
  R('edrin_banter_bramm_ragna_01f','edrin','surprised',"You did, I think.","אתה, נדמה לי.",1.88,['en']),
  R('kesh_banter_gorvan_04a','kesh','close_observation',"I've heard you've been coming here longer than this tavern has stood.","שמעתי שאתה מגיע לכאן עוד מלפני שהטברנה הזאת נבנתה.",3.79,['en']),
  R('gorvan_banter_kesh_04b','gorvan','neutral',"That's true.","זה נכון.",1.23,['en']),
  R('kesh_banter_gorvan_04c','kesh','interesting_choice',"What was here before?","ומה היה כאן קודם?",1.80,['en']),
  R('gorvan_banter_kesh_04d','gorvan','pleasant',"Another tavern.","טברנה אחרת.",1.57,['en']),
  R('kesh_banter_gorvan_04e','kesh','dry_amusement',"Naturally.","כמובן.",1.41,['en']),
  R('edrin_banter_ragna_06a','edrin','idle_distracted',"Are we playing for money tonight?","אנחנו משחקים על כסף הערב?",2.51,['en']),
  R('ragna_banter_edrin_06b','ragna','judging_wager',"You've already placed your bet.","כבר שמת את ההימור שלך.",2.51,['en']),
  R('edrin_banter_ragna_06c','edrin','surprised',"Have I?","באמת?",0.99,['en']),
  R('ragna_banter_edrin_06d','ragna','wager_improved',"Twice.","פעמיים.",0.99,['en']),
  R('edrin_banter_ragna_06e','edrin','mildly_impressed',"Good heavens. I must be feeling lucky.","אלוהים אדירים. כנראה שאני מרגיש בר מזל.",3.16,['en']),
  R('ragna_banter_edrin_06f','ragna','default_focused',"Or drunk.","או שיכור.",1.31,['en']),
  R('edrin_banter_ragna_06g','edrin','drinking',"Well, that too.","כן, גם זה.",1.80,['en']),
  R('edrin_banter_kesh_04a','edrin','idle_distracted',"Do you ever get tired of staring at that stone?","לא נמאס לך להסתכל על האבן הזאת?",3.32,['en']),
  R('kesh_banter_edrin_04b','kesh','turning_rune',"Sometimes. Then I look at the cards.","לפעמים. אז אני מסתכל על הקלפים.",3.40,['en']),
  R('edrin_banter_kesh_04c','edrin','mildly_impressed',"And?","ו...?",0.68,['en']),
  R('kesh_banter_edrin_04d','kesh','dry_amusement',"The stone is more interesting.","האבן מעניינת יותר.",2.43,['en']),
  R('edrin_banter_kesh_04e','edrin','approving',"Fair enough.","נקודה טובה.",1.41,['en']),
  R('bramm_banter_veyra_03a','bramm','33_muttering',"This table's cursed. I can feel it.","השולחן הזה מקולל. אני מרגיש את זה.",3.24,['en']),
  R('veyra_banter_bramm_03b','veyra','friendly_smile',"At last. Someone who listens.","סוף סוף. מישהו שמקשיב.",3.08,['en']),
  R('bramm_banter_veyra_03c','bramm','14_blame_the_deck',"Curse only seems to hit me, mind you. Bloody unfair.","רק אותי הקללה הזאת תופסת, כן? ממש לא הוגן.",4.36,['en']),
  R('veyra_banter_bramm_03d','veyra','banter_correction',"That's not how curses work.","לא ככה קללות עובדות.",2.19,['en']),
  R('bramm_banter_veyra_03e','bramm','04_smug_challenge',"Then explain last night.","אז תסבירי את אתמול.",1.96,['en']),
  R('veyra_banter_bramm_03f','veyra','banter_dry',"...I can't.","...אני לא יכולה.",1.88,['en']),
  R('edrin_banter_gorvan_04a','edrin','intro_reluctant',"Can I ask you something?","אפשר לשאול אותך משהו?",2.51,['en']),
  R('gorvan_banter_edrin_04b','gorvan','attentive',"Of course.","כמובן.",1.07,['en']),
  R('edrin_banter_gorvan_04c','edrin','focused',"After all these years... do you remember everyone you've ever met?","אחרי כל השנים האלה... אתה זוכר את כל מי שפגשת?",5.41,['en']),
  R('gorvan_banter_edrin_04d','gorvan','reminiscing',"No. Only the interesting ones.","לא. רק את המעניינים.",2.93,['en']),
  R('edrin_banter_gorvan_04e','edrin','player_one_card_mild_concern',"Ah. Do you think you'll remember me?","אה. אתה חושב שתזכור אותי?",3.00,['en']),
  R('gorvan_banter_edrin_04f','gorvan','pleasant',"I think I shall.","אני מאמין שכן.",2.12,['en']),
  R('edrin_banter_gorvan_04g','edrin','match_win_content',"Oh. Well, that's rather nice.","אה. טוב, זה דווקא נחמד.",2.85,['en']),
  // ── v113: the Bounty Hunter — two-person exchanges with each of the cast and four rare
  // three-person sequences. English recordings only (Hebrew is subtitle text). Script
  // text verbatim; performance tags are direction, never text. ──
  R('bounty_hunter_banter_gorvan_01a','bounty_hunter','partner_left',"Are you wanted anywhere?","מחפשים אותך איפשהו?",1.88,['en'],'gorvan'),
  R('gorvan_banter_bounty_hunter_01b','gorvan','dry_amusement',"Currently?","כרגע?",1.07,['en']),
  R('bounty_hunter_banter_gorvan_01c','bounty_hunter','doubtful',"That's not reassuring.","זה לא מרגיע.",2.93,['en']),
  R('bounty_hunter_banter_gorvan_02a','bounty_hunter','partner_left',"Still don't understand why they let you in.","עדיין לא מבין למה נותנים לך להיכנס.",2.85,['en'],'gorvan'),
  R('gorvan_banter_bounty_hunter_02b','gorvan','formal',"I pay.","אני משלם.",1.49,['en']),
  R('bounty_hunter_banter_gorvan_02c','bounty_hunter','doubtful',"That's everyone's answer.","זאת התשובה של כולם.",2.04,['en']),
  R('gorvan_banter_bounty_hunter_03a','gorvan','curious',"Do I make you uncomfortable?","אני גורם לך להרגיש לא בנוח?",2.19,['en']),
  R('bounty_hunter_banter_gorvan_03b','bounty_hunter','neutral',"No.","לא.",1.15,['en']),
  R('gorvan_banter_bounty_hunter_03c','gorvan','dry_amusement',"Disappointed.","מאכזב.",1.80,['en']),
  R('bounty_hunter_banter_gorvan_03d','bounty_hunter','neutral',"You'll manage.","אתה תסתדר.",1.49,['en']),
  R('edrin_banter_bounty_hunter_01a','edrin','focused',"You ever take that thing off?","אתה מתישהו מוריד את הדבר הזה?",2.27,['en']),
  R('bounty_hunter_banter_edrin_01b','bounty_hunter','partner_right',"Yes.","כן.",1.15,['en'],'edrin'),
  R('edrin_banter_bounty_hunter_01c','edrin','focused',"Where?","איפה?",1.65,['en']),
  R('bounty_hunter_banter_edrin_01d','bounty_hunter','neutral',"Not here.","לא פה.",1.31,['en']),
  R('bounty_hunter_banter_edrin_02a','bounty_hunter','partner_left',"Does no one find that concerning?","אף אחד פה לא חושב שזה מדאיג?",2.69,['en'],'gorvan'),
  R('edrin_banter_bounty_hunter_02b','edrin','idle_distracted',"What?","מה?",1.07,['en']),
  R('bounty_hunter_banter_edrin_02c','bounty_hunter','partner_left',"The vampire.","הערפד.",1.41,['en'],'gorvan'),
  R('edrin_banter_bounty_hunter_02d','edrin','casual_acceptance',"Oh. Gorvan's alright.","אה. גורבן בסדר.",2.59,['en']),
  R('bounty_hunter_banter_edrin_02e','bounty_hunter','fixed_stare',"...Right.","...כן.",1.57,['en'],'edrin'),
  R('ragna_banter_bounty_hunter_01a','ragna','judging_wager',"You fight for coin?","אתה נלחם בשביל כסף?",2.04,['en']),
  R('bounty_hunter_banter_ragna_01b','bounty_hunter','partner_right',"I collect people for coin.","אני אוסף אנשים בשביל כסף.",2.27,['en'],'ragna'),
  R('ragna_banter_bounty_hunter_01c','ragna','more_like_it',"Better.","יותר טוב.",1.23,['en']),
  R('bounty_hunter_banter_ragna_02a','bounty_hunter','partner_left',"You trust the vampire?","את סומכת על הערפד?",1.96,['en'],'ragna'),
  R('ragna_banter_bounty_hunter_02b','ragna','default_focused',"He pays his bets.","הוא משלם כשהוא מפסיד.",1.88,['en']),
  R('bounty_hunter_banter_ragna_02c','bounty_hunter','doubtful',"That's your standard?","זה הסטנדרט שלך?",1.72,['en']),
  R('ragna_banter_bounty_hunter_02d','ragna','judging_wager',"It's a good standard.","זה סטנדרט טוב.",2.04,['en']),
  R('kesh_banter_bounty_hunter_01a','kesh','close_observation',"The road behind you feels crowded.","הדרך מאחוריך מרגישה עמוסה.",2.69,['en']),
  R('bounty_hunter_banter_kesh_01b','bounty_hunter','partner_right',"Usually is.","בדרך כלל כן.",1.57,['en'],'kesh'),
  R('kesh_banter_bounty_hunter_01c','kesh','interesting_choice',"And ahead?","ומה לפניך?",1.15,['en']),
  R('bounty_hunter_banter_kesh_01d','bounty_hunter','neutral',"Working on it.","עובד על זה.",1.49,['en']),
  R('kesh_banter_bounty_hunter_02a','kesh','close_observation',"Hard to read a man with no face.","קשה לקרוא אדם בלי פנים.",3.00,['en']),
  R('bounty_hunter_banter_kesh_02b','bounty_hunter','neutral',"That's useful.","זה שימושי.",1.49,['en']),
  R('kesh_banter_bounty_hunter_02c','kesh','dry_amusement',"I imagine so.","אני מתאר לעצמי.",1.72,['en']),
  R('veyra_banter_bounty_hunter_01a','veyra','frustrated',"Your helmet is blocking everything.","הקסדה שלך חוסמת לי הכל.",2.59,['en']),
  R('bounty_hunter_banter_veyra_01b','bounty_hunter','neutral',"Good.","טוב.",1.07,['en']),
  R('veyra_banter_bounty_hunter_01c','veyra','banter_correction',"That was not a compliment.","זאת לא הייתה מחמאה.",2.12,['en']),
  R('bounty_hunter_banter_veyra_01d','bounty_hunter','neutral',"I know.","אני יודע.",1.15,['en']),
  R('veyra_banter_bounty_hunter_02a','veyra','observing',"I can't read your face.","אני לא מצליחה לקרוא את הפנים שלך.",2.19,['en']),
  R('bounty_hunter_banter_veyra_02b','bounty_hunter','neutral',"That's the point.","זאת המטרה.",1.57,['en']),
  R('veyra_banter_bounty_hunter_02c','veyra','amused',"I can read the rest of you.","את השאר אני יכולה לקרוא.",2.35,['en']),
  R('bounty_hunter_banter_veyra_02d','bounty_hunter','rare_amusement',"Maybe later.","אולי אחר כך.",1.57,['en']),
  R('bramm_banter_bounty_hunter_01a','bramm','04_smug_challenge',"Alright, helmet. How much am I worth?","טוב, קסדה. כמה אני שווה?",4.36,['en']),
  R('bounty_hunter_banter_bramm_01b','bounty_hunter','partner_right',"Currently?","כרגע?",1.07,['en'],'bramm'),
  R('bramm_banter_bounty_hunter_01c','bramm','06_mocking_disbelief',"...Currently?","...כרגע?",1.23,['en']),
  R('bounty_hunter_banter_bramm_01d','bounty_hunter','neutral',"Not much.","לא הרבה.",1.49,['en']),
  R('bramm_banter_bounty_hunter_02a','bramm','02_intro_boast',"You know, they call me Bramm the Unbeaten.","אתה יודע, קוראים לי בראם הבלתי מנוצח.",3.71,['en']),
  R('bounty_hunter_banter_bramm_02b','bounty_hunter','doubtful',"Who does?","מי קורא לך ככה?",1.31,['en']),
  R('bramm_banter_bounty_hunter_02c','bramm','27_smug_unbeaten',"Me.","אני.",1.07,['en']),
  R('bounty_hunter_banter_bramm_02d','bounty_hunter','neutral',"Right.","כן.",1.15,['en']),
  R('bounty_hunter_chitchat_gorvan_edrin_01a','bounty_hunter','partner_left',"He's a vampire.","הוא ערפד.",1.96,['en'],'gorvan'),
  R('edrin_chitchat_bounty_hunter_gorvan_01b','edrin','casual_acceptance',"We know.","אנחנו יודעים.",1.15,['en']),
  R('bounty_hunter_chitchat_gorvan_edrin_01c','bounty_hunter','partner_right',"And no one sees a problem.","ואף אחד לא רואה פה בעיה.",2.04,['en'],'edrin'),
  R('gorvan_chitchat_bounty_hunter_edrin_01d','gorvan','silent_down',"I can hear you.","אני שומע אותך.",1.57,['en']),
  R('bounty_hunter_chitchat_gorvan_edrin_01e','bounty_hunter','partner_left',"I know.","אני יודע.",1.15,['en'],'gorvan'),
  R('veyra_chitchat_bounty_hunter_gorvan_01a','veyra','silent_doubt',"His shadow is wrong.","הצל שלו לא בסדר.",2.19,['en']),
  R('bounty_hunter_chitchat_veyra_gorvan_01b','bounty_hunter','approval',"Finally.","סוף סוף.",1.31,['en']),
  R('gorvan_chitchat_bounty_hunter_veyra_01c','gorvan','title_tired',"This again.","שוב זה.",1.49,['en']),
  R('bounty_hunter_chitchat_veyra_gorvan_01d','bounty_hunter','attention',"You see?","אתם רואים?",1.15,['en'],'player'),
  R('bramm_chitchat_bounty_hunter_ragna_01a','bramm','11_showing_off',"Ever taken down an orc?","פעם תפסת אורק?",2.04,['en']),
  R('bounty_hunter_chitchat_bramm_ragna_01b','bounty_hunter','neutral',"Yes.","כן.",1.15,['en']),
  R('bramm_chitchat_bounty_hunter_ragna_01c','bramm','33_muttering',"Big one?","גדול?",1.65,['en']),
  R('bounty_hunter_chitchat_bramm_ragna_01d','bounty_hunter','neutral',"Yes.","כן.",1.23,['en']),
  R('ragna_chitchat_bounty_hunter_bramm_01e','ragna','enjoying_challenge',"Stop asking questions, Bramm.","תפסיק לשאול שאלות, בראם.",3.40,['en']),
  R('veyra_chitchat_bounty_hunter_kesh_01a','veyra','frustrated',"Nothing. I get absolutely nothing from him.","כלום. אני לא מקבלת ממנו שום דבר.",3.87,['en']),
  R('kesh_chitchat_bounty_hunter_veyra_01b','kesh','dry_amusement',"Perhaps that is the sign.","אולי זה הסימן.",2.35,['en']),
  R('bounty_hunter_chitchat_veyra_kesh_01c','bounty_hunter','neutral',"Perhaps not.","אולי לא.",1.31,['en'])
].map(item=>[item.voice,item])));

// A banter recording as a reaction the guest seats can perform (the same shape as
// every authored line: id, voice, captions, expression, priority, duration).
export const banterReaction=voice=>{const item=BANTER_RECORDINGS[voice];if(!item)return null;return Object.freeze({id:voice,trigger:'banter',voice,caption:item.captions.en,captions:item.captions,expression:item.expression,look:item.look||null,priority:'MEDIUM',category:'banter',duration:Math.round(item.seconds*1000)+650});};
export const banterSpeaker=voice=>BANTER_RECORDINGS[voice]?.speaker||null;
export function resolveBanterVoice(name,locale='en'){
  const item=BANTER_RECORDINGS[name];if(!item)return null;const ui=locale==='he'?'he':'en';if(!item.takes.includes(ui))return null;
  const file=ui==='he'?`${name}_he`:name;
  return {name,locale:ui,audioLocale:ui,src:asset(item.speaker,file),caption:item.captions[ui],priority:'MEDIUM',gain:VEYRA_VOICE_TRIM[file]??1};
}
