'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Loader2, Gamepad2 } from 'lucide-react';
import { registerUser } from '@/app/actions/auth';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '');

    if (isRegister) {
      const res = await registerUser(formData);
      if (res?.error) {
        setErrorMsg(res.error);
        setLoading(false);
        return;
      }
    }

    // Login directo con el cliente de NextAuth
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setErrorMsg('Invalid email or password');
      setLoading(false);
      return;
    }

    setLoading(false);
    onClose();
    router.refresh();
  };

  // ... resto del JSX sigue exactamente igual

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl z-10"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            <Gamepad2 className="h-4 w-4 text-white" />
            <span>My Game List</span>
          </div>

          <h3 className="mt-2 text-2xl font-bold tracking-tight text-white">
            {isRegister ? 'Create your Gamer Profile' : 'Welcome Back'}
          </h3>
          <p className="mt-1 text-xs text-zinc-400">
            {isRegister
              ? 'Track completed titles, unlock rare avatars and save evidences.'
              : 'Enter your credentials to sync your franchise quests.'}
          </p>

          {errorMsg && (
            <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-2.5 text-xs text-red-400">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {isRegister && (
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Gamertag
                </label>
                <input
                  name="gamertag"
                  type="text"
                  required
                  placeholder="e.g. NEFFEL10"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-white transition"
                />
              </div>
            )}

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Email Address
              </label>
              <input
                name="email"
                type="email"
                required
                placeholder="player@retroquest.com"
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-white transition"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Password
              </label>
              <input
                name="password"
                type="password"
                required
                placeholder="••••••••"
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-white transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>{isRegister ? 'Register & Start Quest' : 'Sign In'}</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-zinc-400">
            {isRegister ? 'Already have an account?' : "Don't have a profile yet?"}{' '}
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setErrorMsg(null);
              }}
              className="font-medium text-white hover:underline ml-1"
            >
              {isRegister ? 'Sign In' : 'Register now'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}