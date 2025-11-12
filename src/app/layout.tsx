import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PlausibleProvider from 'next-plausible';

if (process.env.NODE_ENV === 'production') {
  if (!process.env.NEXT_PUBLIC_CVENOM_API_URL) {
    console.error('FATAL: NEXT_PUBLIC_CVENOM_API_URL environment variable is required');
    process.exit(1);
  }

  // Check all required Firebase environment variables
  const requiredFirebaseVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID'
  ];

  for (const varName of requiredFirebaseVars) {
    if (!process.env[varName]) {
      console.error(`FATAL: Missing required environment variable: ${varName}`);
      process.exit(1);
    }
  }
}
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "cVenom",
  description: "AI CV generator that hackes ATS",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <PlausibleProvider domain={process.env.NEXT_PUBLIC_DOMAIN || "studio.cvenom.com"} trackOutboundLinks>
          {children}
        </PlausibleProvider>
      </body>
    </html>
  );
}
