export const DUEL_REACTIONS=Object.freeze({drink:0,pleased:1,idle:2,annoyed:3,surprised:4});

export const DUEL_SHEETS=Object.freeze({a:'./assets/duel-opponents.png',b:'./assets/duel-opponents-2.webp'});
const opponent=(id,name,archetype,descriptor,row,props,aiStyle,cardPlayStyle,dialogue,{sheet='a',gender='m'}={})=>Object.freeze({
  id,name,archetype,descriptor,row,sheet,gender,props,aiStyle,cardPlayStyle,
  sprites:Object.freeze(Object.fromEntries(Object.entries(DUEL_REACTIONS).map(([state,column])=>[state,{row,column,sheet}]))),
  dialoguePools:Object.freeze(dialogue),reactionWeights:Object.freeze({pleased:.76,annoyed:.72,surprised:.54,drink:.24}),idleFrequency:36000+row*2400
});

export const DUEL_OPPONENTS=Object.freeze([
  opponent('ron','רון','bard','הפייטנית · שובבה ומשעשעת',0,{drink:'יין',snack:'אגוזים',token:'רצועה מעוטרת'},'playful','flick',{
    pleased:['ידעתי שתעריך את המהלך.','אל תחייך עדיין.','הדרן?'],annoyed:['באמת?','זה היה אישי.','אני צריכה עוד משקה.'],surprised:['בחירה אמיצה.','יפה.','לא ראיתי את זה מגיע.'],drink:['לחיי ההחלטות הרעות.','עוד יד, עוד סיפור.']
  },{gender:'f'}),
  opponent('aila','איילה','hunter','הציידת · סבלנית וחדת עין',1,{drink:'כוס עץ',snack:'כפפה',token:'נוצה'},'conservative','precise',{
    pleased:['צפוי.','חיכיתי לזה.','נקי.'],annoyed:['אני אזכור את זה.','לא רע. מעצבן, אבל לא רע.','באמת?'],surprised:['כמעט הסתרת את זה.','יפה.','שינית עקבות.'],drink:['שקט. אני חושבת.','עוד לא נגמר.']
  },{gender:'f'}),
  opponent('bran','בראן','mercenary','שכירת החרב · ישירה ותחרותית',2,{drink:'ספל כבד',snack:'לחם',token:'אסימון ברזל'},'aggressive','thunk',{
    pleased:['ככה מניחים קלף.','שלי.','עוד אחד.'],annoyed:['את זה אני מחזירה לך.','יש גבול.','באמת?'],surprised:['יפה.','לא רע.','זה משנה דברים.'],drink:['הספל קל מדי.','לא סיימנו.']
  },{gender:'f'}),
  opponent('sela','סֶלָה','scholar','המלומדת · יבשה ומחושבת',3,{drink:'תה צמחים',snack:'קלף ספר',token:'כתם דיו'},'patient','measured',{
    pleased:['בהתאם לחישוב.','מסקנה מתבקשת.','לא מפתיע.'],annoyed:['אעדכן את ההשערה.','זה חוקי. בדקתי.','באמת?'],surprised:['חריגה מעניינת.','בחירה אמיצה.','רשמתי לפניי.'],drink:['התה לפחות עקבי.','עוד נתון אחד.']
  },{gender:'f'}),
  opponent('kesh','קֶשׁ','mysterious','הנוסע · שקט ומסתורי',4,{drink:'ספל חרס',snack:'קמע',token:'אבן חרוטה'},'balanced','quiet',{
    pleased:['כך נפל הסימן.','הדרך מתקצרת.','יפה.'],annoyed:['הרוח השתנתה.','אני אזכור את זה.','באמת?'],surprised:['הסימן לא הראה זאת.','בחירה אמיצה.','מעניין.'],drink:['הלילה עוד צעיר.','האש יודעת.']
  }),
  opponent('roderic','רודריק','mercenary','שכיר החרב · מחוספס ושחצן',0,{drink:'ספל פח',snack:'נקניק',token:'מטבע זר'},'aggressive','thunk',{
    pleased:['שולם במלואו.','זה מה שקורה כשמשלמים לי.','כמו שחשבתי.'],annoyed:['זה יעלה לך ביוקר.','מישהו כאן מרמה. אולי אני.','נו, באמת.'],surprised:['הממ. יש לך שיניים.','לא ציפיתי לזה ממך.','טוב, זה כבר מעניין.'],drink:['על החשבון שלך.','עוד סיבוב, עוד מטבע.']
  },{sheet:'b'}),
  opponent('lio','ליאו','bard','הנגן · מהמר חסר בושה',1,{drink:'יין מתוק',snack:'תאנים',token:'מפרט עץ'},'playful','flick',{
    pleased:['ראיתם? ראיתם?!','זה ייכנס לשיר.','מזל? לא. כישרון.'],annoyed:['זה לא נחשב, לא הייתי מוכן.','אני משנה את סוף השיר.','אכזרי. אכזרי ממש.'],surprised:['וואו. אוקיי. וואו.','מי לימד אותך את זה?','זה היה כמעט אמנותי.'],drink:['לחיי הקהל!','עוד כוס ואני מנצח.']
  },{sheet:'b'}),
  opponent('mograth','מוגרת׳','mercenary','האורק · רועש ושונא להפסיד',2,{drink:'כד ענק',snack:'עצם',token:'ניב חרוט'},'aggressive','thunk',{
    pleased:['הא! מוגרת׳ מנצח!','קטן. קטן מאוד.','עוד! תביא עוד!'],annoyed:['מה?! לא! זה לא הוגן!','מוגרת׳ זוכר פרצופים.','אני אשבור את השולחן.'],surprised:['מה זה היה?!','איך?! איך?!','חתיכת קלף…'],drink:['שותים! כולם שותים!','הספל ריק. שוב.']
  },{sheet:'b'}),
  opponent('harrow','הארו','hunter','הוותיק · יבש ולא מתרשם',3,{drink:'שיכר כהה',snack:'מקטרת',token:'כפתור נחושת'},'conservative','measured',{
    pleased:['כצפוי.','ראיתי את זה לפני שלושים שנה.','ככה זה עובד, ילד.'],annoyed:['נהדר. פשוט נהדר.','הייתי צעיר מכדי להתרגז על זה.','אהם.'],surprised:['טוב. זה חדש.','לא רע. לא טוב, אבל לא רע.','הא.'],drink:['זה כבר היה פעם.','הברך שלי יודעת שיבוא גשם.']
  },{sheet:'b'}),
  opponent('rusk','ראסק','mysterious','הסוחר · שקט וחשדני',4,{drink:'חלב חם',snack:'דג מיובש',token:'משקולות סוחר'},'balanced','quiet',{
    pleased:['…','כמובן.','סחורה טובה.'],annoyed:['רשמתי.','זה יעלה לך.','הממ.'],surprised:['מעניין.','לא רע בכלל.','אוזניים למעלה.'],drink:['אני רק מסתכל.','הלילה ארוך.']
  },{sheet:'b'}),
  // Edrin is an authored character like Bramm: expression art, voiced lines and
  // speech bubbles come from duel/edrin.js, so generic pools stay empty.
  Object.freeze({id:'edrin',name:'אדרין',gender:'m',archetype:'veteran',descriptor:'הקבוע הוותיק · ידידותי, קצת שתוי',row:3,props:{drink:'ספל פיוטר',snack:'',token:''},aiStyle:'veteran',cardPlayStyle:'quiet',artMode:'expressions',sprites:{},dialoguePools:Object.freeze({pleased:[],annoyed:[],surprised:[],drink:[]}),reactionWeights:Object.freeze({pleased:0,annoyed:0,surprised:0,drink:0}),idleFrequency:21000}),
  Object.freeze({id:'bramm',name:'בראם',gender:'m',archetype:'mercenary',descriptor:'הבלתי־מנוצח · רברבן, תחרותי וקולני',row:2,props:{drink:'ספל כבד',snack:'לחם',token:'אסימון ברזל'},aiStyle:'aggressive',cardPlayStyle:'thunk',artMode:'expressions',sprites:{},dialoguePools:Object.freeze({pleased:[],annoyed:[],surprised:[],drink:[]}),reactionWeights:Object.freeze({pleased:0,annoyed:0,surprised:0,drink:0}),idleFrequency:26000})
]);

export function getDuelOpponent(id){return DUEL_OPPONENTS.find(item=>item.id===id)||DUEL_OPPONENTS[0];}
const DUEL_EN=Object.freeze({
  ron:{name:'Ron',descriptor:'The Bard · Playful and charming',dialoguePools:{pleased:['Knew you’d appreciate that.','Don’t smile yet.','Encore?'],annoyed:['Really?','That was personal.','I need another drink.'],surprised:['Bold choice.','Nicely done.','Didn’t see that coming.'],drink:['To bad decisions.','Another hand, another story.']}},
  aila:{name:'Aila',descriptor:'The Hunter · Patient and sharp-eyed',dialoguePools:{pleased:['Predictable.','I was waiting for that.','Clean.'],annoyed:['I’ll remember that.','Not bad. Annoying, but not bad.','Really?'],surprised:['You almost hid that.','Nicely done.','You changed tracks.'],drink:['Quiet. I’m thinking.','This isn’t over.']}},
  bran:{name:'Bran',descriptor:'The Mercenary · Direct and competitive',dialoguePools:{pleased:['That’s how you play a card.','Mine.','Another one.'],annoyed:['I’ll return the favour.','There’s a limit.','Really?'],surprised:['Nicely done.','Not bad.','That changes things.'],drink:['This mug’s too light.','We’re not finished.']}},
  sela:{name:'Sela',descriptor:'The Scholar · Dry and calculating',dialoguePools:{pleased:['As calculated.','The obvious conclusion.','Unsurprising.'],annoyed:['I will revise the hypothesis.','It is legal. I checked.','Really?'],surprised:['An interesting deviation.','Bold choice.','Noted.'],drink:['At least the tea is consistent.','One more data point.']}},
  kesh:{name:'Kesh',descriptor:'The Traveler · Quiet and mysterious',dialoguePools:{pleased:['So the sign has fallen.','The road grows shorter.','Nicely done.'],annoyed:['The wind has changed.','I’ll remember that.','Really?'],surprised:['The sign did not show this.','Bold choice.','Interesting.'],drink:['The night is still young.','The fire knows.']}},
  roderic:{name:'Roderic',descriptor:'The Sellsword · Rugged and smug',dialoguePools:{pleased:['Paid in full.','That’s what you get when you hire me.','Just as I figured.'],annoyed:['That’ll cost you.','Someone here is cheating. Might be me.','Oh, come on.'],surprised:['Huh. You’ve got teeth.','Didn’t expect that from you.','Now it’s getting interesting.'],drink:['On your tab.','Another round, another coin.']}},
  lio:{name:'Lio',descriptor:'The Bard · A shameless gambler',dialoguePools:{pleased:['Did you see that? Did you SEE that?','That’s going in the song.','Luck? No. Talent.'],annoyed:['That doesn’t count, I wasn’t ready.','I’m changing how the song ends.','Brutal. Truly brutal.'],surprised:['Wow. Okay. Wow.','Who taught you that?','That was almost artistic.'],drink:['To the audience!','One more cup and I’ll win.']}},
  mograth:{name:'Mograth',descriptor:'The Orc · Loud and a sore loser',dialoguePools:{pleased:['HA! Mograth wins!','Small. Very small.','More! Bring more!'],annoyed:['What?! No! Not fair!','Mograth remembers faces.','I will break this table.'],surprised:['What was THAT?!','How?! HOW?!','Stupid card…'],drink:['Drink! Everyone drinks!','Mug is empty. Again.']}},
  harrow:{name:'Harrow',descriptor:'The Veteran · Dry and unimpressed',dialoguePools:{pleased:['As expected.','Saw that thirty years ago.','That’s how it works, kid.'],annoyed:['Wonderful. Just wonderful.','I’m too old to be annoyed by this.','Hm.'],surprised:['Well. That’s new.','Not bad. Not good. But not bad.','Huh.'],drink:['Been here before.','My knee says rain.']}},
  rusk:{name:'Rusk',descriptor:'The Trader · Quiet and watchful',dialoguePools:{pleased:['…','Naturally.','Good merchandise.'],annoyed:['Noted.','That will cost you.','Hm.'],surprised:['Interesting.','Not bad at all.','Ears up.'],drink:['Just watching.','Long night.']}},
  edrin:{name:'Edrin',descriptor:'The Old Regular · Friendly, a little tipsy',dialoguePools:{pleased:[],annoyed:[],surprised:[],drink:[]}},
  bramm:{name:'Bramm',descriptor:'The Unbeaten · Boastful, competitive, and loud',dialoguePools:{pleased:[],annoyed:[],surprised:[],drink:[]}}
});
export function localizeDuelOpponent(opponent,language='he'){return language==='en'?{...opponent,...DUEL_EN[opponent.id]}:opponent;}
export function duelSpriteStyle(opponent,state='idle'){const sprite=opponent.sprites[state]||opponent.sprites.idle;if(!sprite)return'';return `--sprite-x:${sprite.column*25}%;--sprite-y:${sprite.row*25}%${sprite.sheet==='b'?`;--sprite-sheet:url('${DUEL_SHEETS.b}')`:''}`;}
