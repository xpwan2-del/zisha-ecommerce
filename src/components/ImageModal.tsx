"use client";

import React from 'react';

interface ImageModalProps {
  images: string[];
  currentIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export default function ImageModal({ images, currentIndex, onClose, onPrev, onNext }: ImageModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
      <button
        className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-70 transition-colors"
        onClick={onClose}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      
      <button
        className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-70 transition-colors"
        onClick={onPrev}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      
      <div className="max-w-4xl max-h-[90vh] relative">
        <img
          src={images[currentIndex]}
          alt={`Image ${currentIndex + 1}`}
          className="w-full h-auto max-h-[90vh] object-contain"
        />
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-50 text-white px-4 py-2 rounded-full">
          {currentIndex + 1} / {images.length}
        </div>
      </div>
      
      <button
        className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-70 transition-colors"
        onClick={onNext}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}