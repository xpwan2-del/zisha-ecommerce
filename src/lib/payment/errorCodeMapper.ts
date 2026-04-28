import { query } from '@/lib/db';

export type PaymentErrorLang = 'zh' | 'en' | 'ar';

export interface PaymentErrorIssue {
  issue: string;
  description?: string;
}

export interface PaymentErrorInput {
  platform: string;
  lang: PaymentErrorLang;
  httpStatus?: number;
  name?: string;
  issues?: PaymentErrorIssue[];
  messageEn?: string;
}

export interface PaymentErrorMapping {
  originalCode: string;
  unifiedCode: string;
  errorType: string;
  priority: number;
  messageZh?: string | null;
  messageEn?: string | null;
  messageAr?: string | null;
}

export interface PaymentErrorResolveResult {
  originalCode: string;
  unifiedCode: string;
  errorType: string;
  message: string;
}

function toOriginalCode(kind: 'ISSUE' | 'NAME', code: string): string {
  const trimmed = (code || '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('ISSUE:') || trimmed.startsWith('NAME:') || trimmed.startsWith('HTTP_')) return trimmed;
  return `${kind}:${trimmed}`;
}

function toHttpOriginalCode(httpStatus?: number): string {
  if (!httpStatus) return '';
  return `HTTP_${httpStatus}`;
}

function codeRank(originalCode: string): number {
  if (originalCode.startsWith('ISSUE:')) return 3;
  if (originalCode.startsWith('NAME:')) return 2;
  if (originalCode.startsWith('HTTP_')) return 1;
  return 0;
}

function pickMessage(mapping: PaymentErrorMapping, lang: PaymentErrorLang): string {
  const zh = mapping.messageZh || '';
  const en = mapping.messageEn || '';
  const ar = mapping.messageAr || '';
  if (lang === 'zh') return zh || en || ar || mapping.originalCode;
  if (lang === 'ar') return ar || en || zh || mapping.originalCode;
  return en || zh || ar || mapping.originalCode;
}

async function upsertFillEmpty(platform: string, originalCode: string, messageEn?: string) {
  await query(
    `INSERT INTO payment_error_codes
      (platform, original_code, unified_code, error_type, priority, message_en, is_active)
     VALUES (?, ?, ?, ?, ?, ?, 1)
     ON CONFLICT(platform, original_code) DO UPDATE SET
       message_en = CASE
         WHEN payment_error_codes.message_en IS NULL OR payment_error_codes.message_en = '' THEN excluded.message_en
         ELSE payment_error_codes.message_en
       END`,
    [platform, originalCode, 'UNKNOWN_ERROR', 'fail', 0, messageEn || null]
  );
}

async function ensureCodesExistFillEmpty(platform: string, codes: Array<{ originalCode: string; messageEn?: string }>) {
  for (const c of codes) {
    if (!c.originalCode) continue;
    await upsertFillEmpty(platform, c.originalCode, c.messageEn);
  }
}

async function fetchMappings(platform: string, originalCodes: string[]): Promise<PaymentErrorMapping[]> {
  if (originalCodes.length === 0) return [];
  const placeholders = originalCodes.map(() => '?').join(', ');
  const result = await query(
    `SELECT original_code, unified_code, error_type, priority, message_zh, message_en, message_ar
     FROM payment_error_codes
     WHERE platform = ?
       AND is_active = 1
       AND original_code IN (${placeholders})`,
    [platform, ...originalCodes]
  );

  return (result.rows || []).map((r: any) => ({
    originalCode: r.original_code,
    unifiedCode: r.unified_code,
    errorType: r.error_type,
    priority: r.priority || 0,
    messageZh: r.message_zh,
    messageEn: r.message_en,
    messageAr: r.message_ar
  }));
}

export async function getPaymentErrorMapping(platform: string, originalCode: string): Promise<PaymentErrorMapping | null> {
  if (!platform || !originalCode) return null;
  const result = await query(
    `SELECT original_code, unified_code, error_type, priority, message_zh, message_en, message_ar
     FROM payment_error_codes
     WHERE platform = ?
       AND original_code = ?
       AND is_active = 1
     LIMIT 1`,
    [platform, originalCode]
  );

  if (!result.rows || result.rows.length === 0) return null;
  const r: any = result.rows[0];
  return {
    originalCode: r.original_code,
    unifiedCode: r.unified_code,
    errorType: r.error_type,
    priority: r.priority || 0,
    messageZh: r.message_zh,
    messageEn: r.message_en,
    messageAr: r.message_ar
  };
}

function buildCandidates(input: PaymentErrorInput) {
  const codes: Array<{ originalCode: string; messageEn?: string }> = [];

  const issues = input.issues || [];
  for (const issue of issues) {
    const originalCode = toOriginalCode('ISSUE', issue.issue);
    if (!originalCode) continue;
    codes.push({ originalCode, messageEn: issue.description || input.messageEn });
  }

  if (input.name) {
    const originalCode = toOriginalCode('NAME', input.name);
    if (originalCode) {
      codes.push({ originalCode, messageEn: input.messageEn });
    }
  }

  const httpCode = toHttpOriginalCode(input.httpStatus);
  if (httpCode) {
    codes.push({ originalCode: httpCode, messageEn: input.messageEn });
  }

  return codes;
}

function pickBest(mappings: PaymentErrorMapping[], lang: PaymentErrorLang): PaymentErrorResolveResult | null {
  if (mappings.length === 0) return null;

  const best = mappings
    .slice()
    .sort((a, b) => {
      const rankDiff = codeRank(b.originalCode) - codeRank(a.originalCode);
      if (rankDiff !== 0) return rankDiff;
      const priDiff = (b.priority || 0) - (a.priority || 0);
      if (priDiff !== 0) return priDiff;
      return a.originalCode.localeCompare(b.originalCode);
    })[0];

  return {
    originalCode: best.originalCode,
    unifiedCode: best.unifiedCode,
    errorType: best.errorType || 'fail',
    message: pickMessage(best, lang)
  };
}

export async function resolvePaymentError(input: PaymentErrorInput): Promise<PaymentErrorResolveResult> {
  const candidates = buildCandidates(input);
  await ensureCodesExistFillEmpty(input.platform, candidates);
  const codes = Array.from(new Set(candidates.map(c => c.originalCode).filter(Boolean)));
  const mappings = await fetchMappings(input.platform, codes);
  const best = pickBest(mappings, input.lang);

  if (best) return best;

  const fallback = candidates.find(c => c.originalCode)?.originalCode || 'UNKNOWN_ERROR';
  return {
    originalCode: fallback,
    unifiedCode: 'UNKNOWN_ERROR',
    errorType: 'fail',
    message: input.messageEn || fallback
  };
}
