let schedulerStarted = false;

const SCHEDULER_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const REVIEW_IMAGE_CLEANUP_INTERVAL_MS = 30 * 60 * 1000;

async function triggerReleaseExpired() {
  try {
    const response = await globalThis.fetch(`${SCHEDULER_BASE_URL}/api/inventory/release-expired`, {
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

async function triggerReviewImageCleanup() {
  const token = process.env.REVIEW_IMAGE_CLEANUP_TOKEN;
  if (!token) {
    return;
  }

  try {
    const response = await globalThis.fetch(`${SCHEDULER_BASE_URL}/api/admin/reviews/images/cleanup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-review-cleanup-token': token,
      },
    });

    if (!response.ok) {
      console.error('[Scheduler] Error calling review image cleanup:', response.status);
      return;
    }

    const result = await response.json();
    const deletedCount = Array.isArray(result?.data?.deleted) ? result.data.deleted.length : 0;
    const skippedCount = Array.isArray(result?.data?.skipped) ? result.data.skipped.length : 0;

    if (deletedCount > 0 || skippedCount > 0) {
      console.log(`[Scheduler] Review image cleanup deleted ${deletedCount}, skipped ${skippedCount}`);
    }
  } catch (error) {
    console.error('[Scheduler] Error calling review image cleanup:', error);
  }
}

export function register() {
  if (schedulerStarted) return;
  schedulerStarted = true;

  console.log('[Scheduler] Order expiry scanner started (every 60s)');
  console.log('[Scheduler] Review image cleanup scanner started (every 30m)');

  setInterval(() => {
    triggerReleaseExpired();
  }, 60000);

  setInterval(() => {
    triggerReviewImageCleanup();
  }, REVIEW_IMAGE_CLEANUP_INTERVAL_MS);

  triggerReleaseExpired();
  triggerReviewImageCleanup();
}
