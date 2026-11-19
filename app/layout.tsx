import type { ReactNode } from 'react';
import './style.css';
import { SessionProvider } from '@/components/session';
import { ToastProvider } from '@/components/toast';
export const metadata = { title: 'Equipora | Deployment Foundation', description: 'Equipment Rental Platform — D0 check' };
export default function RootLayout({ children }: { children: ReactNode }) { return <html lang="en"><body><SessionProvider><ToastProvider>{children}</ToastProvider></SessionProvider></body></html>; }
