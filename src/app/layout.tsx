import type { Metadata } from 'next';
import NextAuthSessionProvider from '@/components/providers/session-provider';
import { MantineProvider } from '@/components/providers/mantine-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';
import '@mantine/core/styles.css';
import { Notifications } from '@mantine/notifications';

export const metadata: Metadata = {
  title: 'Hands On Labor - Workforce Management',
  description: 'Workforce management solution by Hands On Labor',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style>
          {`
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
            }
          `}
        </style>
      </head>
      <body>
        <NextAuthSessionProvider>
          <ThemeProvider>
            <MantineProvider>
              <Notifications />
              {children}
            </MantineProvider>
          </ThemeProvider>
        </NextAuthSessionProvider>
      </body>
    </html>
  );
}
