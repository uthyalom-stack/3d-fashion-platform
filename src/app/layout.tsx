import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '3D Fashion Platform',
  description: 'A clean, lightweight 3D fashion visualization platform foundation.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, overflowX: 'hidden' }}>{children}</body>
    </html>
  );
}
