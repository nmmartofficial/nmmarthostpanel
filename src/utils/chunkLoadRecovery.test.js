import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CHUNK_RELOAD_COOLDOWN_MS,
  CHUNK_RELOAD_QUERY_PARAM,
  installChunkLoadRecovery
} from './chunkLoadRecovery.js';

const makeWindow = (href) => {
  const listeners = new Map();
  const timers = [];
  const replacements = [];
  const historyUpdates = [];
  const windowObject = {
    location: {
      href,
      replace(url) {
        replacements.push(url);
      }
    },
    history: {
      state: { route: 'dashboard' },
      replaceState(...args) {
        historyUpdates.push(args);
      }
    },
    addEventListener(name, listener) {
      listeners.set(name, listener);
    },
    setTimeout(callback, delay) {
      timers.push({ callback, delay });
    }
  };
  return { historyUpdates, listeners, replacements, timers, windowObject };
};

test('reloads once after a lazy asset preload fails and preserves the current route', () => {
  const { listeners, replacements, windowObject } = makeWindow('https://example.test/purchase?filter=active#items');
  installChunkLoadRecovery(windowObject);
  let prevented = false;
  listeners.get('vite:preloadError')({ preventDefault: () => { prevented = true; } });

  assert.equal(prevented, true);
  const replacement = new URL(replacements[0]);
  assert.equal(replacement.pathname, '/purchase');
  assert.equal(replacement.searchParams.get('filter'), 'active');
  assert.equal(replacement.searchParams.get(CHUNK_RELOAD_QUERY_PARAM), '1');
  assert.equal(replacement.hash, '#items');
});

test('does not loop when the recovered page still cannot load an asset', () => {
  const href = `https://example.test/purchase?${CHUNK_RELOAD_QUERY_PARAM}=1`;
  const { listeners, replacements, timers, windowObject } = makeWindow(href);
  installChunkLoadRecovery(windowObject);
  listeners.get('vite:preloadError')({ preventDefault() {} });

  assert.equal(replacements.length, 0);
  assert.equal(timers.length, 1);
  assert.equal(timers[0].delay, CHUNK_RELOAD_COOLDOWN_MS);
});

test('removes the recovery marker after the retry cooldown', () => {
  const href = `https://example.test/purchase?${CHUNK_RELOAD_QUERY_PARAM}=1`;
  const { historyUpdates, timers, windowObject } = makeWindow(href);
  installChunkLoadRecovery(windowObject);
  timers[0].callback();

  assert.equal(historyUpdates.length, 1);
  assert.equal(historyUpdates[0][0], windowObject.history.state);
  assert.equal(historyUpdates[0][2], '/purchase');
});
