import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/lib/providers/theme-provider';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/hooks/useAuth';
import AuthInitializer from '@/components/auth/AuthInitializer';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Student Nest - Find Your Perfect Student Accommodation',
  description: 'Discover safe, affordable, and convenient student housing near your college with Student Nest.',
  icons: {
    icon: [
      { url: '/favicon.svg', sizes: '32x32' },
      { url: '/logo.png', sizes: '192x192', type: 'image/png' }
    ],
    apple: { url: '/logo.png', type: 'image/png' },
    shortcut: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <AuthInitializer>
              {children}
            </AuthInitializer>
          </AuthProvider>
          <Toaster
            richColors
            closeButton
            position="top-center"
            toastOptions={{
              className: 'font-sans',
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
