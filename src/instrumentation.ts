let schedulerStarted = false;

async function triggerReleaseExpired() {
  try {
    const response = await globalThis.fetch('http://localhost:3000/api/inventory/release-expired', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (response.ok) {
      const result = await response.json();
      if (result?.data?.releasedOrders > 0) {
        console.log(`[Scheduler] Released ${result.data.releasedOrders} expired orders`);
      }
    }
  } catch (error) {
    console.error('[Scheduler] Error calling release-expired:', error);
  }
}

export function register() {
  if (schedulerStarted) return;
  schedulerStarted = true;

  console.log('[Scheduler] Order expiry scanner started (every 60s)');

  setInterval(() => {
    triggerReleaseExpired();
  }, 60000);

  triggerReleaseExpired();
}
