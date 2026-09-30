export function calculateHandLayout({count,cardWidth,available,portrait=false}){
  const minimumCorner=portrait?Math.min(58,Math.max(46,cardWidth*.56)):Math.min(58,Math.max(40,cardWidth*.42));
  const browse=count>=8&&cardWidth+Math.max(0,count-1)*minimumCorner>available;
  const step=count<2?0:browse?minimumCorner:Math.min(cardWidth+18,Math.max(minimumCorner,(available-cardWidth)/(count-1)));
  const roomy=available>620;
  return Object.freeze({
    browse,
    step,
    overlap:count<2?0:step-cardWidth,
    spread:Math.max(.72,(roomy?2.35:2.8)-Math.max(0,count-7)*.2),
    lift:Math.max(.7,(roomy?1.55:2)-Math.max(0,count-8)*.09),
    scale:portrait?1:count>=13?.93:count>=11?.96:1,
    contentWidth:count?cardWidth+Math.max(0,count-1)*step:0
  });
}
