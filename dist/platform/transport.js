import { applyAction } from '../game-engine/engine.js';
export class GameTransport { submitAction() { throw new Error('Not implemented'); } subscribeToState() { throw new Error('Not implemented'); } disconnect() {} }
export class LocalGameTransport extends GameTransport {
  constructor(state){ super(); this.state=state; this.listeners=new Set(); }
  submitAction(action){ this.state=applyAction(this.state,action); this.listeners.forEach(fn=>fn(this.state,action)); return this.state; }
  subscribeToState(fn){ this.listeners.add(fn); fn(this.state,{type:'init'}); return ()=>this.listeners.delete(fn); }
  disconnect(){ this.listeners.clear(); }
}
