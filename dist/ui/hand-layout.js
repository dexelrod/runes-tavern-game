// Pure hand geometry. The hand is a left-to-right row of overlapping cards:
// each card covers the right part of the previous one, so every card keeps its
// top-left corner index visible. When even the minimum visible strip does not
// fit, the row becomes a horizontal scroller ("browse") instead of shrinking
// cards below a readable, tappable size.
export function calculateHandLayout({count,cardWidth,available,compact=false}){
  const gap=compact?4:12;
  // A visible strip must show the corner glyph and rune and stay tappable.
  const minimumStep=compact?Math.max(29,cardWidth*.38):Math.max(40,cardWidth*.42);
  const naturalStep=cardWidth+gap;
  let step=count<2?0:Math.min(naturalStep,(available-cardWidth)/(count-1));
  const browse=count>1&&step<minimumStep;
  if(browse)step=minimumStep;
  // Compact screens keep the row flat so taps land where the eye expects;
  // roomy screens get a restrained fan that flattens as the hand grows.
  const tilt=compact||browse?0:Math.max(.3,Math.min(2,14/Math.max(1,count)));
  const rise=compact||browse?0:Math.max(.12,Math.min(.9,6/Math.max(1,count)));
  return Object.freeze({
    browse,
    step,
    overlap:count<2?0:step-cardWidth,
    tilt,
    rise,
    contentWidth:count?cardWidth+Math.max(0,count-1)*step:0
  });
}
