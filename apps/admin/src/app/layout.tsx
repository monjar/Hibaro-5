import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Heliora Admin | Hibaro-5',
  description: 'Simulation and economy control plane for Hibaro-5',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
