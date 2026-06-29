import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CollabDoc — Local-First Collaborative Editor',
  description: 'Real-time collaborative document editor that works offline',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
