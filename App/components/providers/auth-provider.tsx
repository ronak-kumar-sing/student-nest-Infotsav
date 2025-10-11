import React, { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '@store/auth.store';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const segments = useSegments() as string[];
  const router = useRouter();
  const { isAuthenticated, isLoading, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inLandingGroup = segments[0] === '(landing)';
    const user = useAuthStore.getState().user;

    const navigate = async () => {
      try {
        if (!isAuthenticated && !inAuthGroup && !inLandingGroup) {
          // Redirect to the landing page if not authenticated
          await router.replace('/(landing)');
        } else if (isAuthenticated && (inAuthGroup || inLandingGroup)) {
          // Role-based redirection
          if (user?.role === 'student') {
            console.log('Navigating to student explore page...');
            await router.replace('/(tabs)');
            await router.replace('/(tabs)/explore');
          } else if (user?.role === 'owner') {
            console.log('Navigating to owner room sharing page...');
            await router.replace('/(tabs)');
            await router.replace('/(tabs)/room-sharing');
          }
        }
      } catch (error) {
        console.error('Navigation error:', error);
      }
    };

    navigate();
  }, [isAuthenticated, segments, isLoading, router]);

  return <>{children}</>;
}