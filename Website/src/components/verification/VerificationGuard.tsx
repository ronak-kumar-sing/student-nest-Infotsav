'use client';

import { useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import VerificationPrompt from '@/components/verification/VerificationPrompt';

interface VerificationGuardProps {
  children: ReactNode;
  requireVerification?: boolean;
  userRole?: string | null;
  showPrompt?: boolean;
}

interface VerificationData {
  user: {
    role: string;
    isIdentityVerified: boolean;
    identityVerificationSkipped?: boolean;
  };
  requirements: {
    verificationRequired: boolean;
    mustVerify?: boolean;
  };
}

interface VerificationStatusHook {
  verificationStatus: VerificationData | null;
  loading: boolean;
  refreshStatus: () => void;
  isVerified: boolean;
  isOwner: boolean;
  canSkip: boolean;
  mustVerify: boolean;
}

// Component to enforce verification requirements
export default function VerificationGuard({
  children,
  requireVerification = false,
  userRole = null,
  showPrompt = true
}: VerificationGuardProps) {
  const [verificationStatus, setVerificationStatus] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showVerificationPrompt, setShowVerificationPrompt] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Routes that don't need verification check
  const skipRoutes = [
    '/auth',
    '/verification',
    '/student/profile/verification',
    '/owner/profile/verification'
  ];

  const shouldSkipCheck = skipRoutes.some(route => pathname?.startsWith(route));

  useEffect(() => {
    if (shouldSkipCheck) {
      setLoading(false);
      return;
    }

    checkVerificationRequirements();
  }, [shouldSkipCheck]);

  const checkVerificationRequirements = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch('/api/verify/requirements', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (result.success) {
        setVerificationStatus(result.data);

        const { user, requirements } = result.data;
        const isOwner = user.role.toLowerCase() === 'owner';

        // Check if verification is required but not completed
        if (requirements.verificationRequired && !user.isIdentityVerified) {
          if (isOwner) {
            // Owners must verify - redirect to verification page
            router.push('/owner/profile/verification');
            return;
          } else if (showPrompt && !user.identityVerificationSkipped) {
            // Students can choose - show prompt
            setShowVerificationPrompt(true);
          }
        }

        // Check if specific route requires verification
        if (requireVerification && !user.isIdentityVerified) {
          setShowVerificationPrompt(true);
        }
      }
    } catch (error) {
      console.error('Error checking verification requirements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationSkip = () => {
    setShowVerificationPrompt(false);
  };

  const handleVerificationProceed = (verificationPath: string) => {
    router.push(verificationPath);
  };

  const handlePromptClose = () => {
    setShowVerificationPrompt(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (showVerificationPrompt) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <VerificationPrompt
          userRole={verificationStatus?.user?.role || userRole || ''}
          onSkip={handleVerificationSkip}
          onProceed={handleVerificationProceed}
          onClose={handlePromptClose}
          showInDashboard={true}
        />
      </div>
    );
  }

  return <>{children}</>;
}

// Hook to get verification status
export function useVerificationStatus(): VerificationStatusHook {
  const [verificationStatus, setVerificationStatus] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVerificationStatus();
  }, []);

  const fetchVerificationStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch('/api/verify/requirements', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (result.success) {
        setVerificationStatus(result.data);
      }
    } catch (error) {
      console.error('Error fetching verification status:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshStatus = () => {
    setLoading(true);
    fetchVerificationStatus();
  };

  return {
    verificationStatus,
    loading,
    refreshStatus,
    isVerified: verificationStatus?.user?.isIdentityVerified || false,
    isOwner: verificationStatus?.user?.role?.toLowerCase() === 'owner',
    canSkip: !verificationStatus?.requirements?.verificationRequired,
    mustVerify: verificationStatus?.requirements?.mustVerify || false
  };
}
