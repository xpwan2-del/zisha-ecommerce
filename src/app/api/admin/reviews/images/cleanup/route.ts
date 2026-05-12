import { NextRequest } from 'next/server';
import { readdir, stat, unlink } from 'fs/promises';
import path from 'path';
import { query } from '@/lib/db';
import { checkAdminAuth, createErrorResponse, createSuccessResponse, logApiError, logApiRequest, logApiSuccess } from '@/lib/admin-helpers';

const REVIEW_UPLOAD_URL_PREFIX = '/uploads/reviews/';
const REVIEW_UPLOAD_DIR = path.join(process.cwd(), 'public/uploads/reviews');
const MIN_ORPHAN_IMAGE_AGE_MS = 30 * 60 * 1000;
const REVIEW_IMAGE_CLEANUP_TOKEN_HEADER = 'x-review-cleanup-token';

function isInternalCleanupRequest(request: NextRequest) {
  const token = process.env.REVIEW_IMAGE_CLEANUP_TOKEN;
  if (!token) return false;
  return request.headers.get(REVIEW_IMAGE_CLEANUP_TOKEN_HEADER) === token;
}

function parseImageList(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }

  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function getReferencedFileNames(urls: string[]) {
  return urls
    .filter((url) => url.startsWith(REVIEW_UPLOAD_URL_PREFIX))
    .map((url) => path.basename(url))
    .filter(Boolean);
}

export async function POST(request: NextRequest) {
  logApiRequest('PRODUCTS', 'POST', '/api/admin/reviews/images/cleanup');
  const isInternalRequest = isInternalCleanupRequest(request);
  const auth = isInternalRequest ? null : checkAdminAuth(request);
  if (auth?.response) return auth.response;

  try {
    const now = Date.now();
    const [reviewRows, followUpRows] = await Promise.all([
      query('SELECT reviews.images FROM reviews WHERE reviews.images IS NOT NULL AND reviews.images != ""'),
      query('SELECT review_follow_ups.images FROM review_follow_ups WHERE review_follow_ups.images IS NOT NULL AND review_follow_ups.images != ""'),
    ]);

    const referenced = new Set<string>([
      ...reviewRows.rows.flatMap((row: any) => getReferencedFileNames(parseImageList(row.images))),
      ...followUpRows.rows.flatMap((row: any) => getReferencedFileNames(parseImageList(row.images))),
    ]);

    const entries = await readdir(REVIEW_UPLOAD_DIR, { withFileTypes: true }).catch(() => []);
    const deleted: string[] = [];
    const skipped: string[] = [];

    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (referenced.has(entry.name)) continue;

      const filePath = path.join(REVIEW_UPLOAD_DIR, entry.name);
      const fileStat = await stat(filePath).catch(() => null);
      if (!fileStat) {
        skipped.push(entry.name);
        continue;
      }

      const olderThan = now - fileStat.mtimeMs;
      if (olderThan < MIN_ORPHAN_IMAGE_AGE_MS) {
        skipped.push(entry.name);
        continue;
      }

      await unlink(filePath);
      deleted.push(`${REVIEW_UPLOAD_URL_PREFIX}${entry.name}`);
    }

    logApiSuccess('PRODUCTS', 'CLEANUP_ORPHAN_REVIEW_IMAGES', {
      deletedCount: deleted.length,
      skippedCount: skipped.length,
      referencedCount: referenced.size,
      trigger: isInternalRequest ? 'scheduler' : 'admin',
      adminUserId: auth ? Number(auth.user.userId) : null,
    });

    return createSuccessResponse({
      deleted,
      skipped,
      thresholdMinutes: MIN_ORPHAN_IMAGE_AGE_MS / 60000,
    });
  } catch (error) {
    logApiError('PRODUCTS', 'CLEANUP_ORPHAN_REVIEW_IMAGES', error);
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
