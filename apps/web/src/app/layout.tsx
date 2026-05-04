import type { Metadata } from 'next';
import './globals.css';
import { SessionProvider } from '@/lib/session-context';
import { ThemeProvider } from '@/lib/theme-context';
import { Nav } from '@/components/Nav';
import { AppBackground } from '@/components/AppBackground';
import { StatusBar } from '@/components/StatusBar';

export const metadata: Metadata = {
  title: 'Heliora | Hibaro-5',
  description: 'A sci-fi idle RPG set in the corporate-controlled solar system of Hibaro-5',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-mode="dark" data-theme="cyan">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Rajdhani:wght@500;600;700&display=swap"
        />
      </head>
      <body className="min-h-screen">
        <ThemeProvider>
          <SessionProvider>
            <AppBackground />
            <div className="hib-shell">
              <Nav />
              {children}
            </div>
            <StatusBar />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
