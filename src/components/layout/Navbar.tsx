'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import { Gamepad2, Search, Trophy, Compass, LogIn, Menu, X, User, LogOut, ShieldCheck } from 'lucide-react';
import AuthModal from '@/components/auth/AuthModal';

export default function Navbar() {
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const currentUser = session?.user;

  const handleSignOut = async () => {
    setUserMenuOpen(false);
    await signOut({ redirect: false });
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-[#0b0f19]/85 backdrop-blur-md transition-all">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 text-white transition-opacity hover:opacity-90">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/5 shadow-inner">
                <Gamepad2 className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-semibold tracking-tight">
                MyGame<span className="text-zinc-400">List</span>
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-400">
              <Link href="/franchises" className="transition-colors hover:text-white flex items-center gap-1.5">
                <Compass className="h-4 w-4" />
                Franchises
              </Link>
              <Link href="/rewards" className="transition-colors hover:text-white flex items-center gap-1.5">
                <Trophy className="h-4 w-4" />
                Rewards
              </Link>
              <Link href="/fan-art" className="transition-colors hover:text-white">
                Fan Art Contest
              </Link>
              <Link href="/community" className="transition-colors hover:text-white">
                Community
              </Link>
            </nav>
          </div>

          {/* Right Section: Search & Auth */}
          <div className="flex items-center gap-3">
            {/* Quick Search */}
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search franchises, games..."
                className="h-9 w-52 rounded-full border border-white/10 bg-white/[0.03] pl-9 pr-4 text-xs text-white placeholder-zinc-500 focus:border-white/30 focus:bg-white/[0.06] focus:outline-none transition-all"
              />
            </div>

            {/* User Session State or Sign In Button */}
            <div className="flex items-center gap-2">
              <Link
                href="/admin/content"
                className="hidden items-center gap-1.5 rounded-full border border-violet-400/40 bg-violet-500/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-100 transition hover:bg-violet-500/15 sm:inline-flex"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Admin Hub
              </Link>

              {currentUser ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10 transition-all cursor-pointer"
                  >
                    <div className="relative h-5 w-5 overflow-hidden rounded-full border border-white/20 bg-zinc-800">
                      <Image
                        src={currentUser.image || '/images/avatars/default.png'}
                        alt="User Avatar"
                        fill
                        sizes="20px"
                        className="object-cover"
                      />
                    </div>
                    <span className="max-w-[110px] truncate">{currentUser.name || 'Gamer'}</span>
                  </button>

                  {/* Dropdown Menu de Usuario */}
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 rounded-xl border border-white/10 bg-zinc-950 p-1 shadow-2xl z-50 text-xs">
                      <Link
                        href="/profile"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-zinc-300 hover:bg-white/10 hover:text-white transition"
                      >
                        <User className="h-3.5 w-3.5" />
                        <span>My Profile</span>
                      </Link>
                      <Link
                        href="/admin/content"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-violet-200 hover:bg-violet-500/10 transition"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>Admin Hub</span>
                      </Link>
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-red-400 hover:bg-red-500/10 transition text-left cursor-pointer"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAuthModalOpen(true)}
                  className="flex items-center gap-2 rounded-full border border-white/15 bg-white text-zinc-950 px-4 py-1.5 text-xs font-semibold hover:bg-zinc-200 transition-all cursor-pointer shadow-sm"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Sign In</span>
                </button>
              )}
            </div>

            {/* Mobile hamburger button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg p-1.5 text-zinc-400 hover:text-white md:hidden cursor-pointer"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="border-b border-white/10 bg-[#0b0f19] px-4 py-4 md:hidden">
            <nav className="flex flex-col gap-3 text-sm text-zinc-300">
              <Link href="/franchises" onClick={() => setMobileMenuOpen(false)} className="py-1 hover:text-white">
                Franchises
              </Link>
              <Link href="/rewards" onClick={() => setMobileMenuOpen(false)} className="py-1 hover:text-white">
                Rewards
              </Link>
              <Link href="/fan-art" onClick={() => setMobileMenuOpen(false)} className="py-1 hover:text-white">
                Fan Art Contest
              </Link>
              <Link href="/admin/content" onClick={() => setMobileMenuOpen(false)} className="py-1 text-violet-200 hover:text-violet-100">
                Admin Hub
              </Link>
              <Link href="/community" onClick={() => setMobileMenuOpen(false)} className="py-1 hover:text-white">
                Community
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* Modal de Autenticación */}
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
}