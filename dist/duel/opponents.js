export const DUEL_REACTIONS=Object.freeze({drink:0,pleased:1,idle:2,annoyed:3,surprised:4});

const opponent=(id,name,archetype,descriptor,row,props,aiStyle,cardPlayStyle,dialogue)=>Object.freeze({
  id,name,archetype,descriptor,row,props,aiStyle,cardPlayStyle,
  sprites:Object.freeze(Object.fromEntries(Object.entries(DUEL_REACTIONS).map(([state,column])=>[state,{row,column}]))),
  dialoguePools:Object.freeze(dialogue),reactionWeights:Object.freeze({pleased:.78,annoyed:.74,surprised:.56,drink:.34}),idleFrequency:16000+row*1900
});

export const DUEL_OPPONENTS=Object.freeze([
  opponent('ron','רון','bard','הפייטן · שובב ובלתי צפוי',0,{drink:'יין',snack:'אגוזים',token:'רצועה מעוטרת'},'playful','flick',{
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
  opponent('kesh','קֶשׁ','mysterious','הנוסע · שקט ובלתי צפוי',4,{drink:'ספל חרס',snack:'קמע',token:'אבן חרוטה'},'balanced','quiet',{
    pleased:['כך נפל הסימן.','הדרך מתקצרת.','יפה.'],annoyed:['הרוח השתנתה.','אני אזכור את זה.','באמת?'],surprised:['הסימן לא הראה זאת.','בחירה אמיצה.','מעניין.'],drink:['הלילה עוד צעיר.','האש יודעת.']
  })
]);

export function getDuelOpponent(id){return DUEL_OPPONENTS.find(item=>item.id===id)||DUEL_OPPONENTS[0];}
export function duelSpriteStyle(opponent,state='idle'){const sprite=opponent.sprites[state]||opponent.sprites.idle;return `--sprite-x:${sprite.column*25}%;--sprite-y:${sprite.row*25}%`;}
