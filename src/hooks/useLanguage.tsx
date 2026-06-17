'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

type LanguageContextType = { lang: 'zh' | 'en'; setLang: (l: 'zh' | 'en') => void };

const LanguageContext = createContext<LanguageContextType>({ lang: 'zh', setLang: () => {} });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<'zh' | 'en'>('zh');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('lang') as 'zh' | 'en';
      if (stored === 'zh' || stored === 'en') setLang(stored);
    } catch {
      // ignore
    }
  }, []);

  const setLangWithStorage = (l: 'zh' | 'en') => {
    setLang(l);
    try { localStorage.setItem('lang', l); } catch { /* ignore */ }
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang: setLangWithStorage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
