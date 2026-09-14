'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import { Maximize2, X } from 'lucide-react';

interface FeaturedFanArtProps {
  imageSrc: string;
  franchiseName: string;
  artistName: string;
  franchiseSlug: string;
  totalGames: number;
}

export default function FeaturedFanArt({
  imageSrc,
  franchiseName,
  artistName,
  franchiseSlug,
  totalGames,
}: FeaturedFanArtProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Aseguramos que el componente esté montado en el cliente antes de crear el Portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Control de tecla escape y bloqueo de scroll
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const openModal = () => {
    setIsOpen(true);
  };

  return (
    <>
      <div className="group relative rounded-2xl border border-white/10 bg-zinc-900/60 p-2 shadow-2xl transition hover:border-white/20">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-zinc-800">
          
          {/* 1. Capa de Fondo: Imagen (sin interacción de puntero) */}
          <Image
            src={imageSrc}
            alt={`Monthly Winning Fan Art - ${franchiseName}`}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 40vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105 pointer-events-none select-none"
          />

          {/* 2. Capa de Fondo: Gradiente (sin interacción de puntero) */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/25 to-black/20 pointer-events-none z-10" />

          {/* 3. Capa Transparente Clickeable para abrir el lightbox en toda la imagen */}
          <button
            type="button"
            onClick={openModal}
            aria-label="Expand artwork"
            className="absolute inset-0 z-20 w-full h-full cursor-pointer bg-transparent border-0 focus:outline-none"
          />

          {/* 4. Barra Superior: Badge y Botón Preview */}
          <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between pointer-events-none">
            <span className="pointer-events-auto rounded-md bg-black/75 backdrop-blur-md border border-white/10 px-2.5 py-1 text-[11px] font-medium text-zinc-200">
              Featured Franchise: {franchiseName}
            </span>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openModal();
              }}
              className="pointer-events-auto cursor-pointer flex items-center gap-1.5 rounded-md bg-black/75 backdrop-blur-md border border-white/15 px-2.5 py-1 text-[11px] font-medium text-zinc-200 transition hover:bg-white hover:text-zinc-950"
            >
              <Maximize2 className="h-3 w-3" />
              <span>Preview</span>
            </button>
          </div>

          {/* 5. Barra Inferior: Metadatos y Enlace */}
          <div className="absolute bottom-4 left-4 right-4 z-30 pointer-events-none">
            <div className="pointer-events-auto">
              <p className="text-xs text-zinc-400">Winning Artwork by</p>
              <h3 className="text-sm font-semibold text-white">{artistName}</h3>
              
              <div className="mt-2 flex items-center justify-between text-xs text-zinc-400 border-t border-white/10 pt-2">
                <span>Franchise Progress: {totalGames} Main Titles</span>
                <Link 
                  href={`/franchises/${franchiseSlug}`} 
                  className="text-white font-medium hover:underline hover:text-zinc-200"
                >
                  View Saga →
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* LIGHTBOX MONTADO EN PORTAL DIRECTO A BODY */}
      {isOpen && mounted && createPortal(
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/95 p-4 sm:p-6 backdrop-blur-md"
          onClick={() => setIsOpen(false)}
        >
          {/* Botón Cerrar */}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Close"
            className="absolute top-5 right-5 z-[100000] flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-zinc-900/90 text-white transition hover:bg-white hover:text-black cursor-pointer shadow-lg"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Contenedor del contenido */}
          <div 
            className="relative flex flex-col items-center max-w-5xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-[75vh] w-full overflow-hidden rounded-xl border border-white/10 bg-zinc-950 flex items-center justify-center shadow-2xl">
              <Image
                src={imageSrc}
                alt={`Full preview - ${franchiseName}`}
                fill
                sizes="95vw"
                className="object-contain select-none"
              />
            </div>

            <div className="mt-3 flex w-full items-center justify-between px-2 text-xs text-zinc-400">
              <p>
                <span className="text-white font-semibold">{franchiseName}</span> — Art by{' '}
                <span className="text-zinc-200">{artistName}</span>
              </p>
              <Link 
                href={`/franchises/${franchiseSlug}`} 
                onClick={() => setIsOpen(false)}
                className="text-white underline hover:text-zinc-300"
              >
                Go to Franchise Checklist →
              </Link>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}