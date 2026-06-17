import type { Metadata, Viewport } from 'next';
import './globals.css';
import { LanguageProvider } from '@/hooks/useLanguage';
import LanguageRoot from './LanguageRoot';
import PwaRegister from '@/components/PwaRegister';

export const viewport: Viewport = {
  themeColor: '#7c3aed',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'IELTS Fun Trainer',
  description: '雅思趣味练习平台，每天15分钟轻松提分到6.5+',
  keywords: ['IELTS', '雅思', '英语', '练习', '学生'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'IELTS练习',
  },
  openGraph: {
    title: 'IELTS Fun Trainer',
    description: '每天15分钟，趣味提分！',
    type: 'website',
  },
  icons: [
    { rel: 'icon', url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    { rel: 'apple-touch-icon', url: '/icon-192.png', sizes: '192x192' },
  ],
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
          <PwaRegister />
        </LanguageProvider>
      </body>
    </html>
  );
}
