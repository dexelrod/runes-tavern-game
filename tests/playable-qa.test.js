import assert from 'node:assert/strict';
import test from 'node:test';
import { chooseBotAction } from '../dist/game-ai/bot.js';
import { applyAction, createInitialState, currentPlayer } from '../dist/game-engine/engine.js';

test('full playable games exercise human and bot physical-action audio events',()=>{
  const events=new Set(),actors=new Set(),winners=new Set();
  let lastCards=0,completed=0;
  for(let seed=1;seed<=180;seed++){
    let state=createInitialState({playerCount:4,humanPlayers:1,seed});
    for(let step=0;state.phase==='playing'&&step<1200;step++){
      const before=state,actor=currentPlayer(state).id,action=chooseBotAction(state);
      actors.add(`${actor}:${action.type}`);
      const logStart=state.log.length;
      state=applyAction(state,action);
      for(const entry of state.log.slice(logStart))events.add(entry.type);
      if(action.type==='playCard'&&state.players.find(player=>player.id===actor)?.hand.length===1)lastCards++;
      assert.ok(state.players.every(player=>player.hand.length>=0));
      assert.ok(state.drawPile.length>=0&&state.discardPile.length>=1);
      assert.notEqual(state,before);
    }
    assert.equal(state.phase,'finished');
    winners.add(state.winnerId);
    completed++;
  }
  assert.equal(completed,180);
  for(const event of ['play','draw','drawPenalty','stop','reverse','plus2','playAgain','takiOpened','takiClosed','color','win'])assert.ok(events.has(event),`missing ${event}`);
  for(const action of ['p0:playCard','p0:drawCard','p1:playCard','p1:drawCard'])assert.ok(actors.has(action),`missing ${action}`);
  assert.ok(lastCards>0);
  assert.ok(winners.has('p0')&&[...winners].some(id=>id!=='p0'));
});
