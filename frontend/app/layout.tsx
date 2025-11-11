import type { Metadata } from 'next'
import './globals.css'
import { SentryProvider } from '../components/SentryProvider'

export const metadata: Metadata = {
  title: 'Project Tutwiler',
  description: 'Project Tutwiler Frontend',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <SentryProvider>{children}</SentryProvider>
      </body>
    </html>
  )
}

