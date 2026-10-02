// Shared decode-once preloader for authored character expression sheets.
// Every expression is decoded before the character sits down, so swaps never
// flash an empty frame. A failed image never blocks the match: it resolves to
// null and the stage falls back to the character's default expression.
export function createExpressionPreloader({names,urlFor,label='Character'}){
  const cache=new Map();let all=null,ready=false;
  const load=name=>{
    if(cache.has(name))return cache.get(name);
    const promise=new Promise(resolve=>{
      const image=new Image();let settled=false;
      const done=value=>{if(settled)return;settled=true;resolve(value);};
      image.decoding='async';
      image.onload=async()=>{try{if(typeof image.decode==='function')await image.decode();}catch{}done(image);};
      image.onerror=()=>{if(['localhost','127.0.0.1'].includes(globalThis.location?.hostname))console.warn(`[${label}] Missing expression asset`,name);done(null);};
      image.src=urlFor(name);
      if(image.complete&&image.naturalWidth)image.onload();
    });
    cache.set(name,promise);return promise;
  };
  return Object.freeze({
    preload(){if(typeof Image==='undefined')return Promise.resolve([]);all ||= Promise.all(names.map(load)).then(images=>{ready=true;return images;});return all;},
    ready:()=>ready
  });
}
