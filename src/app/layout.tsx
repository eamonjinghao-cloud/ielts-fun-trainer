import type { Metadata } from 'next';
import './globals.css';
import { LanguageProvider } from '@/hooks/useLanguage';
import LanguageRoot from './LanguageRoot';

export const metadata: Metadata = {
  title: 'IELTS Fun Trainer — 趣味雅思练习',
  description: '专为7-9年级学生设计的趣味雅思练习平台，每天15分钟，快速提分到6.5+',
  keywords: ['IELTS', '雅思', '英语', '练习', '学生'],
  openGraph: {
    title: 'IELTS Fun Trainer',
    description: '每天15分钟，趣味提分！',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh">
      <body>
        <LanguageProvider>
          <LanguageRoot>{children}</LanguageRoot>
        </LanguageProvider>
      </body>
    </html>
  );
}
