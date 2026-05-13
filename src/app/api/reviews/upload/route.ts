import { NextRequest, NextResponse } from 'next/server';
import { mkdir, unlink, writeFile } from 'fs/promises';
import path from 'path';
import { requireAuth } from '@/lib/auth';
import { logMonitor } from '@/lib/utils/logger';

const MAX_FILE_SIZE = 3 * 1024 * 1024;
const MAX_FILES = 6;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};
const REVIEW_UPLOAD_URL_PREFIX = '/uploads/reviews/';
const REVIEW_UPLOAD_DIR = path.join(process.cwd(), 'public/uploads/reviews');

function createErrorResponse(error: string, status: number = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

function createSuccessResponse(data: any) {
  return NextResponse.json({ success: true, data });
}

function safeReviewImageUrl(url: string) {
  if (!url.startsWith(REVIEW_UPLOAD_URL_PREFIX)) return null;
  const fileName = path.basename(url);
  if (!fileName || fileName !== url.slice(REVIEW_UPLOAD_URL_PREFIX.length)) return null;
  return path.join(REVIEW_UPLOAD_DIR, fileName);
}

export async function POST(request: NextRequest) {
  logMonitor('PRODUCTS', 'REQUEST', {
    method: 'POST',
    path: '/api/reviews/upload',
  });

  try {
    const authResult = requireAuth(request);
    if (authResult.response) {
      logMonitor('PRODUCTS', 'AUTH_FAILED', {
        reason: 'Unauthorized review image upload',
      });
      return authResult.response;
    }

    const formData = await request.formData();
    const files = formData.getAll('images').filter((item): item is File => item instanceof File);

    if (files.length === 0) {
      logMonitor('PRODUCTS', 'VALIDATION_FAILED', {
        reason: 'No review images provided',
      });
      return createErrorResponse('MISSING_PARAMS', 400);
    }

    if (files.length > MAX_FILES) {
      logMonitor('PRODUCTS', 'VALIDATION_FAILED', {
        reason: 'Too many review images',
        count: files.length,
      });
      return createErrorResponse('TOO_MANY_FILES', 400);
    }

    const uploadDir = REVIEW_UPLOAD_DIR;
    await mkdir(uploadDir, { recursive: true });

    const userId = Number(authResult.user.userId);
    const urls: string[] = [];

    for (const file of files) {
      if (!ALLOWED_TYPES.has(file.type)) {
        logMonitor('PRODUCTS', 'VALIDATION_FAILED', {
          reason: 'Invalid review image type',
          type: file.type,
        });
        return createErrorResponse('INVALID_FILE_TYPE', 400);
      }

      if (file.size > MAX_FILE_SIZE) {
        logMonitor('PRODUCTS', 'VALIDATION_FAILED', {
          reason: 'Review image too large',
          size: file.size,
        });
        return createErrorResponse('FILE_TOO_LARGE', 400);
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const extension = EXTENSIONS[file.type];
      const fileName = `${Date.now()}-${userId}-${crypto.randomUUID()}.${extension}`;
      const filePath = path.join(uploadDir, fileName);
      await writeFile(filePath, buffer);
      urls.push(`/uploads/reviews/${fileName}`);
    }

    logMonitor('PRODUCTS', 'SUCCESS', {
      action: 'UPLOAD_REVIEW_IMAGES',
      userId,
      count: urls.length,
    });

    return createSuccessResponse({ urls });
  } catch (error) {
    logMonitor('PRODUCTS', 'ERROR', {
      action: 'UPLOAD_REVIEW_IMAGES',
      error: String(error),
    });
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}

export async function DELETE(request: NextRequest) {
  logMonitor('PRODUCTS', 'REQUEST', {
    method: 'DELETE',
    path: '/api/reviews/upload',
  });

  try {
    const authResult = requireAuth(request);
    if (authResult.response) {
      logMonitor('PRODUCTS', 'AUTH_FAILED', {
        reason: 'Unauthorized review image cleanup',
      });
      return authResult.response;
    }

    const body = await request.json();
    const urls = Array.isArray(body.urls) ? body.urls : [body.url].filter(Boolean);
    if (urls.length === 0) {
      logMonitor('PRODUCTS', 'VALIDATION_FAILED', {
        reason: 'No review image urls provided for cleanup',
      });
      return createErrorResponse('MISSING_PARAMS', 400);
    }

    const deleted: string[] = [];
    const skipped: string[] = [];

    for (const url of urls) {
      if (typeof url !== 'string') {
        skipped.push(String(url));
        continue;
      }
      const filePath = safeReviewImageUrl(url);
      if (!filePath) {
        skipped.push(url);
        continue;
      }
      try {
        await unlink(filePath);
        deleted.push(url);
      } catch {
        skipped.push(url);
      }
    }

    logMonitor('PRODUCTS', 'SUCCESS', {
      action: 'CLEANUP_REVIEW_IMAGES',
      userId: Number(authResult.user.userId),
      deletedCount: deleted.length,
      skippedCount: skipped.length,
    });

    return createSuccessResponse({ deleted, skipped });
  } catch (error) {
    logMonitor('PRODUCTS', 'ERROR', {
      action: 'CLEANUP_REVIEW_IMAGES',
      error: String(error),
    });
    return createErrorResponse('INTERNAL_ERROR', 500);
  }
}
