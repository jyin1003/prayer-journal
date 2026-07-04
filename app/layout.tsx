import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
    title: 'Prayer Tracker',
    description: 'Keep track of your prayer points',
    manifest: '/manifest.json',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'Prayer Tracker',
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
            <body className="bg-gray-50 min-h-screen font-sans antialiased">
                {children}
            </body>
        </html>
    )
}