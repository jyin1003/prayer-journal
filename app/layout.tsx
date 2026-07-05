import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
    title: 'Pocket Prayer',
    description: 'Keep track of your prayer points',
    manifest: '/manifest.json',
    icons: {
        apple: '/logo_full-192.png',
        icon: '/logo_full-512.png',
    },
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'Pocket Prayer',
    },
}

export const viewport: Viewport = {
    themeColor: '#ffffff',
    width: 'device-width',
    initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
            </head>
            <body className="bg-gray-50 dark:bg-gray-900 min-h-screen font-sans antialiased">
                {children}
            </body>
        </html>
    )
}