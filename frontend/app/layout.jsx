import './globals.css'
import { SentryProvider } from '../components/SentryProvider'

export const metadata = {
  title: 'Project Tutwiler',
  description: 'Project Tutwiler Frontend',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SentryProvider>{children}</SentryProvider>
      </body>
    </html>
  )
}

