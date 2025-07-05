import type { Metadata } from "next"
import { Toaster } from "@/components/ui/toaster"
import { UserProvider } from "@/hooks/use-user"
import NextAuthSessionProvider from "@/components/providers/session-provider"
import "./globals.css"

export const metadata: Metadata = {
  title: "Hands On Labor - Workforce Management",
  description: "Mobile-first workforce management for construction teams",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "HoliTime",
  },
  manifest: "/manifest.json",
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#2563eb",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased touch-manipulation">
        <NextAuthSessionProvider>
          <UserProvider>
            {children}
            <Toaster />
          </UserProvider>
        </NextAuthSessionProvider>
      </body>
    </html>
  )
}
