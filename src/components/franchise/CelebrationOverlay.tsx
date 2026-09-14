'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Trophy, Sparkles } from 'lucide-react';

export type CelebrationType = 'beat' | 'mastered' | null;

interface CelebrationOverlayProps {
  type: CelebrationType;
  gameTitle: string;
  onClose: () => void;
}

export default function CelebrationOverlay({
  type,
  gameTitle,
  onClose,
}: CelebrationOverlayProps) {
  // Autocerrar después de 2.3 segundos
  useEffect(() => {
    if (!type) return;
    const timer = setTimeout(() => {
      onClose();
    }, 2300);
    return () => clearTimeout(timer);
  }, [type, onClose]);

  if (!type) return null;

  const isMastered = type === 'mastered';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[9999] flex cursor-pointer items-center justify-center overflow-hidden bg-black/85 backdrop-blur-md select-none"
      >
        {/* Glow de fondo central */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: [0.8, 1.2, 1], opacity: isMastered ? 0.35 : 0.2 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`absolute h-[550px] w-[550px] rounded-full blur-[120px] pointer-events-none ${
            isMastered ? 'bg-yellow-400' : 'bg-white'
          }`}
        />

        {/* Partículas / Confeti animado */}
        {Array.from({ length: 24 }).map((_, i) => {
          const angle = (i / 24) * 360;
          const distance = Math.floor(Math.random() * 260) + 120;
          const x = Math.cos((angle * Math.PI) / 180) * distance;
          const y = Math.sin((angle * Math.PI) / 180) * distance;

          return (
            <motion.span
              key={i}
              initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
              animate={{
                scale: [0, 1.2, 0.4],
                x,
                y,
                opacity: [1, 1, 0],
                rotate: Math.random() * 360,
              }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.05 }}
              className={`absolute h-2 w-2 rounded-sm pointer-events-none ${
                isMastered
                  ? i % 2 === 0
                    ? 'bg-yellow-400 shadow-[0_0_8px_#facc15]'
                    : 'bg-amber-200'
                  : i % 2 === 0
                  ? 'bg-white shadow-[0_0_8px_#ffffff]'
                  : 'bg-zinc-400'
              }`}
            />
          );
        })}

        {/* Contenedor central del mensaje */}
        <motion.div
          initial={{ scale: 0.7, y: 30, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 350, damping: 20 }}
          className="relative z-10 flex flex-col items-center text-center px-4"
        >
          {/* Badge de tipo de logro */}
          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1 text-xs font-semibold uppercase tracking-widest ${
              isMastered
                ? 'border-yellow-400/40 bg-yellow-400/10 text-yellow-300 shadow-[0_0_20px_rgba(250,204,21,0.2)]'
                : 'border-white/20 bg-white/10 text-zinc-200'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>{isMastered ? 'Franchise Mastery Unlocked' : 'Story Completed'}</span>
          </motion.div>

          {/* Icono central con efecto pop */}
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 450, damping: 18, delay: 0.1 }}
            className={`mt-6 flex h-24 w-24 items-center justify-center rounded-3xl border shadow-2xl ${
              isMastered
                ? 'border-yellow-300 bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-600 text-zinc-950 shadow-yellow-500/50'
                : 'border-white bg-white text-zinc-950 shadow-white/30'
            }`}
          >
            {isMastered ? (
              <Trophy className="h-12 w-12 stroke-[2.5]" />
            ) : (
              <CheckCircle2 className="h-12 w-12 stroke-[2.5]" />
            )}
          </motion.div>

          {/* Gran titular */}
          <motion.h2
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className={`mt-6 text-4xl sm:text-6xl font-black tracking-tight uppercase ${
              isMastered
                ? 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-amber-300 drop-shadow-[0_0_35px_rgba(250,204,21,0.6)]'
                : 'text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]'
            }`}
          >
            {isMastered ? '¡Wow! ¡Incredible!' : 'Congratulations!'}
          </motion.h2>

          {/* Nombre del juego completado */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-3 text-base sm:text-lg text-zinc-300 font-medium"
          >
            You completed <span className="text-white font-bold">{gameTitle}</span>
          </motion.p>

          {/* Puntos sumados */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4, type: 'spring' }}
            className="mt-4 rounded-lg border border-white/10 bg-white/5 px-4 py-1.5 font-mono text-sm font-semibold text-emerald-400"
          >
            +{isMastered ? '120' : '50'} Quest Points Earned
          </motion.div>

          <p className="mt-8 text-[11px] text-zinc-500 uppercase tracking-widest">
            Click anywhere to dismiss
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}