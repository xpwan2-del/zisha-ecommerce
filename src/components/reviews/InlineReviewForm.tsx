'use client';

import { useState } from 'react';
import ReviewImageUploader from './ReviewImageUploader';
import { useUITranslations } from '@/lib/hooks/useUITranslations';
import { useTheme } from '@/components/ThemeProvider';

interface InlineReviewFormProps {
  orderId: number;
  orderItemId: number;
  productId: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function InlineReviewForm({
  orderId,
  orderItemId,
  productId,
  onSuccess,
  onCancel,
}: InlineReviewFormProps) {
  const { t: uiT } = useUITranslations();
  const { themeColors } = useTheme();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedComment, setSubmittedComment] = useState('');
  const [submittedImages, setSubmittedImages] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedComment = comment.trim();

    if (!trimmedComment) {
      setErrorMessage(uiT('reviews.feedback.comment_required', '请输入评价内容。'));
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          order_id: orderId,
          order_item_id: orderItemId,
          product_id: productId,
          rating,
          comment: trimmedComment,
          images,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSubmittedComment(trimmedComment);
        setSubmittedImages(images);
        setIsSubmitted(true);
        onSuccess();
        return;
      }

      setErrorMessage(data.error || uiT('reviews.submit_failed', '提交评价失败'));
    } catch (error) {
      console.error('Submit review error:', error);
      setErrorMessage(uiT('reviews.submit_failed', '提交评价失败'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div
        className="success-feedback mt-4 p-5 border rounded-xl animate-in fade-in slide-in-from-top-2 duration-300"
        style={{
          backgroundColor: themeColors.reviewFeedbackSuccessBg || 'var(--background-alt)',
          borderColor: themeColors.reviewFeedbackSuccessBorder || 'var(--border)',
          color: themeColors.reviewFeedbackSuccessText || 'var(--text)',
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span
              className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
              style={{
                backgroundColor: themeColors.reviewFeedbackIconBg || 'var(--accent)',
                color: themeColors.reviewFeedbackIconText || '#ffffff',
              }}
            >
              ✓
            </span>
            <div>
              <h4 className="font-semibold text-[var(--text)]">{uiT('reviews.feedback.submitted', '评价已提交')}</h4>
              <p className="mt-1 text-sm text-[var(--text-muted)]">{uiT('reviews.feedback.success_hint', '已保存到当前商品评价中')}</p>
            </div>
          </div>
          <span
            className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold"
            style={{
              backgroundColor: themeColors.reviewFeedbackBadgeBg || 'var(--accent)',
              color: themeColors.reviewFeedbackBadgeText || '#ffffff',
            }}
          >
            {uiT('reviews.feedback.reviewed', '已评价')}
          </span>
        </div>
        <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 text-sm text-[var(--text)]">
          <div className="mb-2 text-lg" style={{ color: themeColors.reviewStarActive || 'var(--accent)' }}>
            {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
          </div>
          <p className="whitespace-pre-line leading-relaxed">{submittedComment}</p>
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
    <form onSubmit={handleSubmit} className="mt-4 p-5 border border-[var(--border)] rounded-xl bg-[var(--background-alt)] animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2 text-[var(--text)]">
            {uiT('reviews.rating', '评分')}
          </label>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="focus:outline-none transition-transform hover:scale-110"
                aria-label={`${star} star`}
              >
                <span className={`text-2xl ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}>★</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-[var(--text)]">
            {uiT('reviews.content', '评价内容')}
          </label>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            className="w-full h-28 p-3 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text)] focus:ring-2 focus:ring-[var(--accent)] outline-none transition-all resize-none text-sm"
            placeholder={uiT('reviews.content_placeholder', '分享您的使用感受...')}
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-[var(--text)]">
            {uiT('reviews.add_images', '上传图片')}
          </label>
          <ReviewImageUploader images={images} onChange={setImages} maxCount={6} disabled={isSubmitting} />
        </div>

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

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm rounded-lg border border-[var(--border)] text-[var(--text)] hover:bg-[var(--background)] transition-colors disabled:opacity-50"
          >
            {uiT('common.cancel', '取消')}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 text-sm rounded-lg bg-[var(--accent)] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isSubmitting ? uiT('common.submitting', '提交中...') : uiT('reviews.submit', '提交评价')}
          </button>
        </div>
      </div>
    </form>
  );
}
