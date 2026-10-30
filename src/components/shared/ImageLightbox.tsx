'use client';

import { useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { Maximize2, X } from 'lucide-react';

interface ImageLightboxProps {
  src: string;
  alt: string;
  className?: string;
  imageClassName?: string;
  sizes?: string;
  watermarkText?: string;
}

export default function ImageLightbox({
  src,
  alt,
  className = '',
  imageClassName = 'object-cover',
  sizes = '100vw',
  watermarkText,
}: ImageLightboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const preventContextMenu = (event: MouseEvent<HTMLElement>) => {
    if (watermarkText) event.preventDefault();
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        onContextMenu={preventContextMenu}
        aria-label={`View full-size image: ${alt}`}
        className={`group relative block overflow-hidden ${className}`}
      >
        <Image src={src} alt={alt} fill unoptimized sizes={sizes} className={imageClassName} />
        {watermarkText && <Watermark text={watermarkText} />}
        <span className="absolute bottom-2 right-2 rounded-full bg-black/70 p-1.5 text-white opacity-0 transition group-hover:opacity-100">
          <Maximize2 className="h-4 w-4" />
        </span>
      </button>
      {isOpen && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Full-size image: ${alt}`}
          onClick={() => setIsOpen(false)}
          onContextMenu={preventContextMenu}
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/95 p-4 backdrop-blur-md sm:p-8"
        >
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Close image"
            className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-zinc-900/90 text-white hover:bg-white hover:text-black"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="relative h-[88vh] w-full max-w-7xl" onClick={(event) => event.stopPropagation()}>
            <Image src={src} alt={alt} fill unoptimized sizes="95vw" className="select-none object-contain" />
            {watermarkText && <Watermark text={watermarkText} />}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

function Watermark({ text }: { text: string }) {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 grid grid-cols-2 grid-rows-3 overflow-hidden sm:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <span key={index} className="flex items-center justify-center -rotate-[25deg] whitespace-nowrap text-xs font-black uppercase tracking-[0.3em] text-white/55 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] sm:text-sm">
          {text}
        </span>
      ))}
    </span>
  );
}
