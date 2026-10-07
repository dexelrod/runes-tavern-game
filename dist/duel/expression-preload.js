// Shared decode-once preloader for authored character expression sheets.
// Every expression is decoded before the character sits down, so swaps never
// flash an empty frame. A failed image never blocks the match: it resolves to
// null and the stage falls back to the character's default expression.
// A character with a large pack (Veyra: 61 poses) may name a `critical` set —
// the resting face and the reactions that come first. Those decode before she
// sits down; the rest decode straight after, in the background, a few at a time.
export function createExpressionPreloader({names,urlFor,label='Character',critical=null}){
  const cache=new Map();let all=null,first=null,ready=false;
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
  const rest=async()=>{const queue=names.filter(name=>!cache.has(name));for(let i=0;i<queue.length;i+=4)await Promise.all(queue.slice(i,i+4).map(load));};
  const everything=()=>{all ||= (async()=>{if(first)await first;await rest();await Promise.all(names.map(load));ready=true;})();return all;};
  return Object.freeze({
    preload(){
      if(typeof Image==='undefined')return Promise.resolve([]);
      if(!critical){all ||= Promise.all(names.map(load)).then(images=>{ready=true;return images;});return all;}
      first ||= Promise.all(critical.filter(name=>names.includes(name)).map(load));
      void everything();return first;
    },
    ready:()=>ready
  });
}
