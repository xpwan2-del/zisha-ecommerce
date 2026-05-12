'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useUITranslations } from '@/lib/hooks/useUITranslations';
import { useTheme } from '@/components/ThemeProvider';

interface ReviewImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxCount?: number;
  disabled?: boolean;
}

export default function ReviewImageUploader({
  images,
  onChange,
  maxCount = 6,
  disabled = false,
}: ReviewImageUploaderProps) {
  const { t: uiT } = useUITranslations();
  const { themeColors } = useTheme();
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > maxCount) {
      setErrorMessage(
        uiT('reviews.feedback.max_images_exceeded', `最多只能上传 ${maxCount} 张图片`).replace('{maxCount}', String(maxCount))
      );
      return;
    }

    setErrorMessage('');
    setIsUploading(true);
    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append('images', file));

    try {
      const response = await fetch('/api/reviews/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const data = await response.json();
      if (data.success && data.data?.urls) {
        onChange([...images, ...data.data.urls].slice(0, maxCount));
      } else {
        setErrorMessage(data.error || uiT('reviews.feedback.upload_failed', '上传图片失败'));
      }
    } catch (error) {
      console.error('Upload error:', error);
      setErrorMessage(uiT('reviews.feedback.upload_failed', '上传图片失败'));
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (index: number) => {
    const nextImages = [...images];
    nextImages.splice(index, 1);
    onChange(nextImages);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {images.map((image, index) => (
          <div key={index} className="relative w-20 h-20 rounded-lg overflow-hidden border border-[var(--border)]">
            <Image
              src={image}
              alt={`Review upload ${index + 1}`}
              fill
              className="object-cover"
              unoptimized={image.startsWith('data:')}
            />
            {!disabled && (
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-black/80 transition-colors"
              >
                ×
              </button>
            )}
          </div>
        ))}
        {images.length < maxCount && !disabled && (
          <label
            className={`w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-[var(--border)] rounded-lg cursor-pointer hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-all ${
              isUploading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            {isUploading ? (
              <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span className="text-xl text-[var(--text-muted)]">+</span>
                <span className="text-[10px] text-[var(--text-muted)] mt-1">{uiT('reviews.add_images', '添加图片')}</span>
              </>
            )}
          </label>
        )}
      </div>
      <p className="text-xs text-[var(--text-muted)]">
        {uiT('reviews.image_limit_hint', `最多上传 ${maxCount} 张图片`)}
      </p>
      {errorMessage && (
        <div
          className="rounded-lg border px-3 py-2 text-xs"
          style={{
            backgroundColor: themeColors.reviewFeedbackErrorBg || 'var(--background)',
            borderColor: themeColors.reviewFeedbackErrorBorder || 'var(--border)',
            color: themeColors.reviewFeedbackErrorText || 'var(--text)',
          }}
        >
          {errorMessage}
        </div>
      )}
    </div>
  );
}
