import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { ScanlineOverlay } from '@/components/layout/ScanlineOverlay';

export const metadata: Metadata = {
  title: 'NextOSINT — AI-Powered Intelligence Platform',
  description:
    'Open-source intelligence platform aggregating public data sources with AI-powered threat analysis. Detect breaches, track digital footprints, and synthesize intelligence reports.',
  keywords: ['OSINT', 'threat intelligence', 'cybersecurity', 'breach detection', 'AI analysis'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-cyber-bg text-cyber-text antialiased">
        {/* Background grid */}
        <div className="fixed inset-0 bg-cyber-grid pointer-events-none z-0" />

        {/* Scanline + noise overlays */}
        <ScanlineOverlay />

        {/* App shell */}
        <div className="relative z-10 flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto p-6 lg:p-8">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
