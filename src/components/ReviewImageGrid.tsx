'use client';

import Image from 'next/image';

interface ReviewImageGridProps {
  images: string[];
  altPrefix?: string;
  showRemove?: boolean;
  onOpen?: (index: number) => void;
  onRemove?: (index: number) => void;
  className?: string;
}

export default function ReviewImageGrid({
  images,
  altPrefix = '评价图片',
  showRemove = false,
  onOpen,
  onRemove,
  className = '',
}: ReviewImageGridProps) {
  if (!images.length) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {images.map((image, index) => (
        <div key={`${image}-${index}`} className="relative h-20 w-20 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
          <button
            type="button"
            className="relative h-full w-full"
            onClick={() => onOpen?.(index)}
          >
            <Image
              src={image}
              alt={`${altPrefix}${index + 1}`}
              fill
              sizes="80px"
              className="object-cover"
              unoptimized={image.startsWith('data:')}
            />
          </button>
          {showRemove && onRemove && (
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 py-0.5 text-xs text-white"
            >
              ×
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
