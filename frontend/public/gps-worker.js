// GPS Keep-Alive Web Worker
// Web Workers are NOT throttled by browsers when the tab is in background.
// This worker sends periodic "tick" messages to the main thread,
// which then checks if a GPS capture is needed.

let intervalId = null;
let tickInterval = 30000; // 30 seconds default

self.addEventListener('message', (event) => {
  const { type, interval } = event.data;

  if (type === 'START') {
    if (intervalId) clearInterval(intervalId);
    tickInterval = interval || 30000;

    console.log(`[GPS-Worker] Started with ${tickInterval / 1000}s interval`);

    // Send immediate tick
    self.postMessage({ type: 'TICK', timestamp: Date.now() });

    // Then periodic ticks
    intervalId = setInterval(() => {
      self.postMessage({ type: 'TICK', timestamp: Date.now() });
    }, tickInterval);
  }

  if (type === 'STOP') {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    console.log('[GPS-Worker] Stopped');
  }

  if (type === 'UPDATE_INTERVAL') {
    tickInterval = interval || 30000;
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = setInterval(() => {
        self.postMessage({ type: 'TICK', timestamp: Date.now() });
      }, tickInterval);
    }
    console.log(`[GPS-Worker] Interval updated to ${tickInterval / 1000}s`);
  }
});
