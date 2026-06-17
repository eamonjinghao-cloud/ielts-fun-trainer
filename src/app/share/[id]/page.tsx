import type { Metadata } from 'next';
import SharePageClient from './SharePageClient';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'IELTS Fun Trainer — 查看成绩',
    description: '查看我的雅思练习成绩！',
    openGraph: {
      title: '🎓 我的雅思练习成绩',
      description: '用IELTS Fun Trainer练习雅思，每天15分钟快速提分！',
      type: 'website',
    },
  };
}

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SharePageClient encodedId={id} />;
}
