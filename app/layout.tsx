import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import Footer from '@/components/footer';
import './legacy.css';
import './globals.css';
export const metadata: Metadata = { title: 'CWrite lite · Your story begins here', description: 'Draw, connect, and write your own stories.', icons: { icon: '/logosmall.webp' } };
export default function RootLayout({ children }: {
    children: React.ReactNode;
}) { return <html lang="en"><body>{children}<Footer /><Toaster position="top-center" richColors/></body></html>; }
