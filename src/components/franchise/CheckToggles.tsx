'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Trophy } from 'lucide-react';

interface ToggleButtonProps {
  active: boolean;
  onToggle: () => void;
  type: 'completed' | 'mastered';
}

export function BeatGameToggle({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <div className="relative inline-flex items-center justify-center">
      <motion.button
        type="button"
        onClick={onToggle}
        whileHover={{ scale: 1.12 }}
        whileTap={{ scale: 0.88 }}
        className={`relative flex h-7 w-7 items-center justify-center rounded-lg border transition-colors cursor-pointer ${
          active
            ? 'border-white bg-white text-zinc-950 shadow-[0_0_15px_rgba(255,255,255,0.4)]'
            : 'border-white/20 bg-black/40 text-transparent hover:border-white/50'
        }`}
      >
        <AnimatePresence mode="wait">
          {active ? (
            <motion.div
              key="active-check"
              initial={{ scale: 0, rotate: -45, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            >
              <CheckCircle2 className="h-4 w-4 stroke-[3]" />
            </motion.div>
          ) : (
            <motion.div
              key="inactive-check"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.2 }}
              exit={{ opacity: 0 }}
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-zinc-500" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Partículas de destello al activar */}
      <AnimatePresence>
        {active && (
          <motion.span
            initial={{ scale: 0.6, opacity: 0.9 }}
            animate={{ scale: 1.8, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="pointer-events-none absolute inset-0 rounded-lg border border-white"
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export function MasteredToggle({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <div className="relative inline-flex items-center justify-center">
      <motion.button
        type="button"
        onClick={onToggle}
        whileHover={{ scale: 1.12 }}
        whileTap={{ scale: 0.88 }}
        className={`relative flex h-7 w-7 items-center justify-center rounded-lg border transition-colors cursor-pointer ${
          active
            ? 'border-yellow-400 bg-yellow-400 text-zinc-950 shadow-[0_0_18px_rgba(250,204,21,0.55)]'
            : 'border-white/20 bg-black/40 text-transparent hover:border-white/50'
        }`}
      >
        <AnimatePresence mode="wait">
          {active ? (
            <motion.div
              key="active-trophy"
              initial={{ scale: 0, y: 3, rotate: -15, opacity: 0 }}
              animate={{ scale: 1, y: 0, rotate: 0, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 22 }}
            >
              <Trophy className="h-4 w-4 stroke-[2.5]" />
            </motion.div>
          ) : (
            <motion.div
              key="inactive-trophy"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.2 }}
              exit={{ opacity: 0 }}
            >
              <Trophy className="h-3.5 w-3.5 text-zinc-500" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Onda expansiva dorada */}
      <AnimatePresence>
        {active && (
          <>
            <motion.span
              initial={{ scale: 0.6, opacity: 0.9 }}
              animate={{ scale: 2.1, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="pointer-events-none absolute inset-0 rounded-lg border-2 border-yellow-300"
            />
            {/* Destellos circulares cardinales */}
            {[0, 90, 180, 270].map((angle, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                animate={{
                  opacity: 0,
                  scale: 0.2,
                  x: Math.cos((angle * Math.PI) / 180) * 16,
                  y: Math.sin((angle * Math.PI) / 180) * 16,
                }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-yellow-300"
              />
            ))}
          </>
        )}
      </AnimatePresence>
    </div>
  );
}