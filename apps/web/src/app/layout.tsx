import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Heliora | Hibaro-5',
  description: 'A sci-fi idle RPG set in the corporate-controlled solar system of Hibaro-5',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-heliora-dark">{children}</body>
    </html>
  )
}
