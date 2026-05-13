'use client';

import { useState } from 'react';
import { useUITranslations } from '@/lib/hooks/useUITranslations';
import { useTheme } from '@/components/ThemeProvider';

interface InlineReviewReplyFormProps {
  reviewId: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function InlineReviewReplyForm({
  reviewId,
  onSuccess,
  onCancel,
}: InlineReviewReplyFormProps) {
  const { t: uiT } = useUITranslations();
  const { themeColors } = useTheme();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedContent, setSubmittedContent] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedContent = content.trim();

    if (!trimmedContent) {
      setErrorMessage(uiT('reviews.feedback.reply_required', '请输入回复内容。'));
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/reviews/${reviewId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: trimmedContent }),
      });

      const data = await response.json();
      if (data.success) {
        setSubmittedContent(trimmedContent);
        setIsSubmitted(true);
        onSuccess();
        return;
      }

      setErrorMessage(data.error || uiT('reviews.reply_failed', '回复提交失败'));
    } catch (error) {
      console.error('Submit reply error:', error);
      setErrorMessage(uiT('reviews.reply_failed', '回复提交失败'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div
        className="success-feedback mt-3 p-4 border rounded-xl animate-in fade-in slide-in-from-top-1 duration-200"
        style={{
          backgroundColor: themeColors.reviewFeedbackSuccessBg || 'var(--background-alt)',
          borderColor: themeColors.reviewFeedbackSuccessBorder || 'var(--border)',
          color: themeColors.reviewFeedbackSuccessText || 'var(--text)',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span
              className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
              style={{
                backgroundColor: themeColors.reviewFeedbackIconBg || 'var(--accent)',
                color: themeColors.reviewFeedbackIconText || '#ffffff',
              }}
            >
              ✓
            </span>
            <div>
              <h4 className="font-semibold text-[var(--text)]">{uiT('reviews.feedback.reply_submitted', '回复已提交')}</h4>
              <p className="mt-1 text-sm text-[var(--text-muted)]">{uiT('reviews.feedback.reply_success_hint', '您的回复已展示在这条评价下方。')}</p>
            </div>
          </div>
          <span
            className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold"
            style={{
              backgroundColor: themeColors.reviewFeedbackBadgeBg || 'var(--accent)',
              color: themeColors.reviewFeedbackBadgeText || '#ffffff',
            }}
          >
            {uiT('reviews.feedback.replied', '已回复')}
          </span>
        </div>
        <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 text-sm text-[var(--text)]">
          <div className="mb-1 text-xs font-medium text-[var(--text-muted)]">{uiT('reviews.feedback.submitted_content', '已提交内容')}</div>
          <p className="whitespace-pre-line leading-relaxed">{submittedContent}</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 p-4 border border-[var(--border)] rounded-xl bg-[var(--background-alt)] animate-in fade-in slide-in-from-top-1 duration-200">
      <div className="space-y-3">
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          className="w-full h-24 p-3 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text)] focus:ring-2 focus:ring-[var(--accent)] outline-none transition-all resize-none text-sm"
          placeholder={uiT('reviews.reply_placeholder', '写下您的回复...')}
          autoFocus
        />
        {errorMessage && (
          <div
            className="rounded-lg border px-3 py-2 text-sm"
            style={{
              backgroundColor: themeColors.reviewFeedbackErrorBg || 'var(--background)',
              borderColor: themeColors.reviewFeedbackErrorBorder || 'var(--border)',
              color: themeColors.reviewFeedbackErrorText || 'var(--text)',
            }}
          >
            <div className="font-medium">{uiT('reviews.feedback.error_title', '请检查后再提交')}</div>
            <div className="mt-0.5">{errorMessage}</div>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] text-[var(--text)] hover:bg-[var(--background)] transition-colors disabled:opacity-50"
          >
            {uiT('common.cancel', '取消')}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-1.5 text-xs rounded-lg bg-[var(--accent)] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isSubmitting ? uiT('common.submitting', '提交中...') : uiT('reviews.reply_submit', '提交回复')}
          </button>
        </div>
      </div>
    </form>
  );
}
