export const DUEL_REACTIONS=Object.freeze({drink:0,pleased:1,idle:2,annoyed:3,surprised:4});

const opponent=(id,name,archetype,descriptor,row,props,aiStyle,cardPlayStyle,dialogue)=>Object.freeze({
  id,name,archetype,descriptor,row,props,aiStyle,cardPlayStyle,
  sprites:Object.freeze(Object.fromEntries(Object.entries(DUEL_REACTIONS).map(([state,column])=>[state,{row,column}]))),
  dialoguePools:Object.freeze(dialogue),reactionWeights:Object.freeze({pleased:.76,annoyed:.72,surprised:.54,drink:.24}),idleFrequency:36000+row*2400
});

export const DUEL_OPPONENTS=Object.freeze([
  opponent('ron','רון','bard','הפייטן · שובב ומשעשע',0,{drink:'יין',snack:'אגוזים',token:'רצועה מעוטרת'},'playful','flick',{
    pleased:['ידעתי שתעריך את המהלך.','אל תחייך עדיין.','הדרן?'],annoyed:['באמת?','זה היה אישי.','אני צריך עוד משקה.'],surprised:['בחירה אמיצה.','יפה.','לא ראיתי את זה מגיע.'],drink:['לחיי ההחלטות הרעות.','עוד יד, עוד סיפור.']
  }),
  opponent('aila','איילה','hunter','הציידת · סבלנית וחדת עין',1,{drink:'כוס עץ',snack:'כפפה',token:'נוצה'},'conservative','precise',{
    pleased:['צפוי.','חיכיתי לזה.','נקי.'],annoyed:['אני אזכור את זה.','לא רע. מעצבן, אבל לא רע.','באמת?'],surprised:['כמעט הסתרת את זה.','יפה.','שינית עקבות.'],drink:['שקט. אני חושבת.','עוד לא נגמר.']
  }),
  opponent('bran','בראן','mercenary','שכיר החרב · ישיר ותחרותי',2,{drink:'ספל כבד',snack:'לחם',token:'אסימון ברזל'},'aggressive','thunk',{
    pleased:['ככה מניחים קלף.','שלי.','עוד אחד.'],annoyed:['את זה אני מחזיר לך.','יש גבול.','באמת?'],surprised:['יפה.','לא רע.','זה משנה דברים.'],drink:['הספל קל מדי.','לא סיימנו.']
  }),
  opponent('sela','סֶלָה','scholar','המלומדת · יבשה ומחושבת',3,{drink:'תה צמחים',snack:'קלף ספר',token:'כתם דיו'},'patient','measured',{
    pleased:['בהתאם לחישוב.','מסקנה מתבקשת.','לא מפתיע.'],annoyed:['אעדכן את ההשערה.','זה חוקי. בדקתי.','באמת?'],surprised:['חריגה מעניינת.','בחירה אמיצה.','רשמתי לפניי.'],drink:['התה לפחות עקבי.','עוד נתון אחד.']
  }),
  opponent('kesh','קֶשׁ','mysterious','הנוסע · שקט ומסתורי',4,{drink:'ספל חרס',snack:'קמע',token:'אבן חרוטה'},'balanced','quiet',{
    pleased:['כך נפל הסימן.','הדרך מתקצרת.','יפה.'],annoyed:['הרוח השתנתה.','אני אזכור את זה.','באמת?'],surprised:['הסימן לא הראה זאת.','בחירה אמיצה.','מעניין.'],drink:['הלילה עוד צעיר.','האש יודעת.']
  }),
  Object.freeze({id:'bramm',name:'בראם',archetype:'mercenary',descriptor:'הבלתי־מנוצח · רברבן, תחרותי וקולני',row:2,props:{drink:'ספל כבד',snack:'לחם',token:'אסימון ברזל'},aiStyle:'aggressive',cardPlayStyle:'thunk',artMode:'expressions',sprites:{},dialoguePools:Object.freeze({pleased:[],annoyed:[],surprised:[],drink:[]}),reactionWeights:Object.freeze({pleased:0,annoyed:0,surprised:0,drink:0}),idleFrequency:26000})
]);

export function getDuelOpponent(id){return DUEL_OPPONENTS.find(item=>item.id===id)||DUEL_OPPONENTS[0];}
const DUEL_EN=Object.freeze({
  ron:{name:'Ron',descriptor:'The Bard · Playful and charming',dialoguePools:{pleased:['Knew you’d appreciate that.','Don’t smile yet.','Encore?'],annoyed:['Really?','That was personal.','I need another drink.'],surprised:['Bold choice.','Nicely done.','Didn’t see that coming.'],drink:['To bad decisions.','Another hand, another story.']}},
  aila:{name:'Aila',descriptor:'The Hunter · Patient and sharp-eyed',dialoguePools:{pleased:['Predictable.','I was waiting for that.','Clean.'],annoyed:['I’ll remember that.','Not bad. Annoying, but not bad.','Really?'],surprised:['You almost hid that.','Nicely done.','You changed tracks.'],drink:['Quiet. I’m thinking.','This isn’t over.']}},
  bran:{name:'Bran',descriptor:'The Mercenary · Direct and competitive',dialoguePools:{pleased:['That’s how you play a card.','Mine.','Another one.'],annoyed:['I’ll return the favour.','There’s a limit.','Really?'],surprised:['Nicely done.','Not bad.','That changes things.'],drink:['This mug’s too light.','We’re not finished.']}},
  sela:{name:'Sela',descriptor:'The Scholar · Dry and calculating',dialoguePools:{pleased:['As calculated.','The obvious conclusion.','Unsurprising.'],annoyed:['I will revise the hypothesis.','It is legal. I checked.','Really?'],surprised:['An interesting deviation.','Bold choice.','Noted.'],drink:['At least the tea is consistent.','One more data point.']}},
  kesh:{name:'Kesh',descriptor:'The Traveler · Quiet and mysterious',dialoguePools:{pleased:['So the sign has fallen.','The road grows shorter.','Nicely done.'],annoyed:['The wind has changed.','I’ll remember that.','Really?'],surprised:['The sign did not show this.','Bold choice.','Interesting.'],drink:['The night is still young.','The fire knows.']}},
  bramm:{name:'Bramm',descriptor:'The Unbeaten · Boastful, competitive, and loud',dialoguePools:{pleased:[],annoyed:[],surprised:[],drink:[]}}
});
export function localizeDuelOpponent(opponent,language='he'){return language==='en'?{...opponent,...DUEL_EN[opponent.id]}:opponent;}
export function duelSpriteStyle(opponent,state='idle'){const sprite=opponent.sprites[state]||opponent.sprites.idle;if(!sprite)return'';return `--sprite-x:${sprite.column*25}%;--sprite-y:${sprite.row*25}%`;}
