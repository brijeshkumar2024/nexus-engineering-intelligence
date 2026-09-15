import './globals.css';
import type { ReactNode } from 'react';
export const metadata = { title: 'NEXUS — Engineering Intelligence', description: 'Understand your codebase before it becomes a problem.' };
export default function RootLayout({children}:{children:ReactNode}) { return <html lang="en"><body>{children}</body></html>; }