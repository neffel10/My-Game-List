'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { translate, type Locale } from '@/lib/i18n';

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (phrase: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export default function LanguageProvider({ children, initialLocale }: { children: ReactNode; initialLocale: Locale }) {
  const [locale, setLocaleState] = useState(initialLocale);
  const router = useRouter();

  const setLocale = (nextLocale: Locale) => {
    setLocaleState(nextLocale);
    document.cookie = `mgl-language=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;
    document.documentElement.lang = nextLocale;
    router.refresh();
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t: (phrase) => translate(locale, phrase) }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider.');
  return context;
}
