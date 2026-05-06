import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: '⚡ Zenith Control Center',
  description: 'Sistema de gestión integral personal',
  icons: { icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>" }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="bg-mesh min-h-screen text-white antialiased">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 ml-0 lg:ml-64 min-h-screen">
            <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'rgba(10,10,31,0.95)',
              border: '1px solid rgba(0,245,255,0.2)',
              color: '#e2e8f0',
              backdropFilter: 'blur(20px)',
              borderRadius: '12px',
            },
            success: { iconTheme: { primary: '#34d399', secondary: '#050510' } },
            error:   { iconTheme: { primary: '#fb7185', secondary: '#050510' } },
          }}
        />
      </body>
    </html>
  )
}
