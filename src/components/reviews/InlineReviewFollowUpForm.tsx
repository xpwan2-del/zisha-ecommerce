'use client';

import { useState } from 'react';
import ReviewImageUploader from './ReviewImageUploader';
import { useUITranslations } from '@/lib/hooks/useUITranslations';
import { useTheme } from '@/components/ThemeProvider';

interface InlineReviewFollowUpFormProps {
  reviewId: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function InlineReviewFollowUpForm({
  reviewId,
  onSuccess,
  onCancel,
}: InlineReviewFollowUpFormProps) {
  const { t: uiT } = useUITranslations();
  const { themeColors } = useTheme();
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedContent, setSubmittedContent] = useState('');
  const [submittedImages, setSubmittedImages] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedContent = content.trim();

    if (!trimmedContent) {
      setErrorMessage(uiT('reviews.feedback.followup_required', '请输入追评内容。'));
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/reviews/${reviewId}/follow-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: trimmedContent, images }),
      });

      const data = await response.json();
      if (data.success) {
        setSubmittedContent(trimmedContent);
        setSubmittedImages(images);
        setIsSubmitted(true);
        onSuccess();
        return;
      }

      setErrorMessage(data.error || uiT('reviews.followup_failed', '提交追评失败'));
    } catch (error) {
      console.error('Submit follow-up error:', error);
      setErrorMessage(uiT('reviews.followup_failed', '提交追评失败'));
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
              <h4 className="font-semibold text-[var(--text)]">{uiT('reviews.feedback.followup_submitted', '追评已提交')}</h4>
              <p className="mt-1 text-sm text-[var(--text-muted)]">{uiT('reviews.feedback.followup_success_hint', '您的追评已追加到原评价下方。')}</p>
            </div>
          </div>
          <span
            className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold"
            style={{
              backgroundColor: themeColors.reviewFeedbackBadgeBg || 'var(--accent)',
              color: themeColors.reviewFeedbackBadgeText || '#ffffff',
            }}
          >
            {uiT('reviews.feedback.followed_up', '已追评')}
          </span>
        </div>
        <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 text-sm text-[var(--text)]">
          <div className="mb-1 text-xs font-medium text-[var(--text-muted)]">{uiT('reviews.feedback.submitted_content', '已提交内容')}</div>
          <p className="whitespace-pre-line leading-relaxed">{submittedContent}</p>
          {submittedImages.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {submittedImages.map((image, index) => (
                <img
                  key={`${image}-${index}`}
                  src={image}
                  alt={uiT('reviews.feedback.image_alt', '已提交的评价图片')}
                  className="h-16 w-16 rounded-lg border border-[var(--border)] object-cover"
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 p-4 border border-[var(--border)] rounded-xl bg-[var(--background-alt)] animate-in fade-in slide-in-from-top-1 duration-200 shadow-sm">
      <div className="space-y-3">
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          className="w-full h-24 p-3 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text)] focus:ring-2 focus:ring-[var(--accent)] outline-none transition-all resize-none text-sm"
          placeholder={uiT('reviews.followup_placeholder', '追加您的使用评价...')}
          autoFocus
        />
        <div>
          <label className="block text-xs font-medium mb-2 text-[var(--text-muted)]">
            {uiT('reviews.add_images', '上传追加图片')}
          </label>
          <ReviewImageUploader images={images} onChange={setImages} maxCount={3} disabled={isSubmitting} />
        </div>
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
            {isSubmitting ? uiT('common.submitting', '提交中...') : uiT('reviews.followup_submit', '提交追评')}
          </button>
        </div>
      </div>
    </form>
  );
}
