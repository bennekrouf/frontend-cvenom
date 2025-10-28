'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ThemeProviderProps } from 'next-themes';
import { AuthProvider } from '@/contexts/AuthContext';

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [mounted, setMounted] = React.useState(false);

  // Environment validation - runs once when app starts
  // React.useEffect(() => {
  //   const requiredVars = [
  //     'NEXT_PUBLIC_API0_BASE_URL',
  //     'NEXT_PUBLIC_API0_API_KEY'
  //   ];
  //
  //   const missing = requiredVars.filter(key => !process.env[key]);
  //
  //   if (missing.length > 0) {
  //     const error = `❌ FATAL: Missing environment variables: ${missing.join(', ')}`;
  //     console.error(error);
  //     alert(`App configuration error: ${missing.join(', ')} not set`);
  //     throw new Error(error); // This will crash the React app
  //   }
  //
  //   console.log('✅ Environment variables validated at runtime');
  // }, []); // Empty dependency array = runs only once

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <AuthProvider>
        {children}
      </AuthProvider>
    );
  }

  return (
    <NextThemesProvider {...props}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </NextThemesProvider>
  );
}
