import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import Footer from '@/components/footer';
import './legacy.css';
import './globals.css';
import {localPreviewEnabled} from '@/lib/local-preview';
export const metadata: Metadata = { title: 'CWrite lite · Your story begins here', description: 'Draw, connect, and write your own stories.', icons: { icon: '/logosmall.webp' } };
export default function RootLayout({ children }: {
    children: React.ReactNode;
}) { return <html lang="en"><body>{localPreviewEnabled()&&<div className="local-preview-banner" role="status">本地预览 · 图片和建议为演示 · 不调用真实 AI、不产生费用</div>}{children}<Footer /><Toaster position="top-center" richColors/></body></html>; }
