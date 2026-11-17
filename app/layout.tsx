import type { ReactNode } from 'react';
import './style.css';
export const metadata = { title: 'Equipora | Deployment Foundation', description: 'Equipment Rental Platform — D0 check' };
export default function RootLayout({ children }: { children: ReactNode }) { return <html lang="en"><body>{children}</body></html>; }
