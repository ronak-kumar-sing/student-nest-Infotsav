'use client';

import { useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

export default function AuthInitializer({ children }: { children: ReactNode }) {
  const { initializeAuth, loading } = useAuth();

  useEffect(() => {
    // Check if auth refresh is needed (from middleware)
    if (typeof window !== 'undefined') {
      const refreshNeeded = document.querySelector('meta[name="auth-refresh-needed"]');

      if (refreshNeeded) {
        console.log('Authentication refresh needed, initializing...');
        initializeAuth();
      }
    }
  }, [initializeAuth]);

  useEffect(() => {
    // Auto-refresh auth every 30 minutes to keep session active
    const interval = setInterval(() => {
      if (typeof window !== 'undefined') {
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        if (isLoggedIn === 'true') {
          console.log('Auto-refreshing authentication...');
          initializeAuth();
        }
      }
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(interval);
  }, [initializeAuth]);

  // Show loading only for initial auth check
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <div className="text-gray-600 dark:text-gray-400 font-medium">Checking authentication...</div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
