'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Building,
  X,
  ArrowRight,
  Info
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface VerificationPromptProps {
  userRole: string;
  onSkip?: () => void;
  onProceed?: (path: string) => void;
  onClose?: () => void;
  showInDashboard?: boolean;
}

interface VerificationRequirements {
  user: {
    isIdentityVerified: boolean;
    identityVerificationSkipped?: boolean;
  };
  requirements: {
    message: string;
    verificationRequired?: boolean;
  };
  verification?: {
    completedSteps: string[];
  };
}

export default function VerificationPrompt({
  userRole,
  onSkip,
  onProceed,
  onClose,
  showInDashboard = false
}: VerificationPromptProps) {
  const [requirements, setRequirements] = useState<VerificationRequirements | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const isOwner = userRole?.toLowerCase() === 'owner';

  useEffect(() => {
    fetchVerificationRequirements();
  }, []);

  const fetchVerificationRequirements = async () => {
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
        setRequirements(result.data);
      } else {
        console.error('Failed to fetch verification requirements:', result.error);
      }
    } catch (error) {
      console.error('Error fetching verification requirements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSkipVerification = async () => {
    if (isOwner) {
      toast.error('Property owners must complete identity verification');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/verify/requirements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'skip' })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Identity verification skipped. You can enable it later from your profile.');
        onSkip?.();
      } else {
        toast.error(result.error || 'Failed to skip verification');
      }
    } catch (error) {
      console.error('Error skipping verification:', error);
      toast.error('Failed to skip verification');
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToVerification = () => {
    const verificationPath = isOwner
      ? '/owner/profile/verification'
      : '/student/profile/verification';

    if (showInDashboard) {
      router.push(verificationPath);
    } else {
      onProceed?.(verificationPath);
    }
  };

  if (loading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading verification requirements...</p>
        </CardContent>
      </Card>
    );
  }

  // Don't show if user has already completed or skipped verification
  if (requirements?.user?.isIdentityVerified ||
    (requirements?.user?.identityVerificationSkipped && !isOwner)) {
    return null;
  }

  return (
    <Card className="w-full max-w-2xl mx-auto border-2 border-blue-200 shadow-lg">
      <CardHeader className="text-center pb-4">
        <div className="flex justify-center mb-4">
          <div className={`p-3 rounded-full ${isOwner ? 'bg-red-100' : 'bg-blue-100'}`}>
            {isOwner ? (
              <Building className="w-8 h-8 text-red-600" />
            ) : (
              <Shield className="w-8 h-8 text-blue-600" />
            )}
          </div>
        </div>

        <CardTitle className="text-xl">
          {isOwner ? 'Identity Verification Required' : 'Secure Your Account'}
        </CardTitle>

        <div className="flex justify-center mt-2">
          <Badge
            variant={isOwner ? "destructive" : "secondary"}
            className="text-sm"
          >
            {isOwner ? 'Required for Property Owners' : 'Optional but Recommended'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Verification Status */}
        {requirements?.verification && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Verification in progress: {requirements.verification.completedSteps.length} of 3 steps completed
            </AlertDescription>
          </Alert>
        )}

        {/* Requirements Message */}
        <Alert className={isOwner ? 'border-red-200 bg-red-50' : 'border-blue-200 bg-blue-50'}>
          <Info className="h-4 w-4" />
          <AlertDescription className={isOwner ? 'text-red-800' : 'text-blue-800'}>
            {requirements?.requirements?.message}
          </AlertDescription>
        </Alert>

        {/* Benefits */}
        <div>
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Benefits of Identity Verification
          </h4>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Enhanced account security and trust</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>{isOwner ? 'List properties with verified owner badge' : 'Access verified properties and premium features'}</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Priority support and faster dispute resolution</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Protection against fraud and fake accounts</span>
            </li>
          </ul>
        </div>

        {/* Verification Steps */}
        <div>
          <h4 className="font-semibold mb-3">Verification Process (5-10 minutes)</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">1</div>
              <p className="text-sm font-medium">Upload Document</p>
              <p className="text-xs text-gray-600">Aadhaar, PAN, or DL</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">2</div>
              <p className="text-sm font-medium">Selfie Verification</p>
              <p className="text-xs text-gray-600">Face matching</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">3</div>
              <p className="text-sm font-medium">Review & Approve</p>
              <p className="text-xs text-gray-600">Instant verification</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <Button
            onClick={handleProceedToVerification}
            className="w-full"
            disabled={loading}
          >
            <Shield className="w-4 h-4 mr-2" />
            {isOwner ? 'Complete Required Verification' : 'Verify My Identity Now'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>

          {!isOwner && (
            <Button
              variant="outline"
              onClick={handleSkipVerification}
              className="w-full"
              disabled={loading}
            >
              Skip for Now (Can enable later)
            </Button>
          )}

          {onClose && !isOwner && (
            <Button
              variant="ghost"
              onClick={onClose}
              className="w-full"
              size="sm"
            >
              <X className="w-4 h-4 mr-2" />
              Maybe Later
            </Button>
          )}
        </div>

        {/* Additional Info for Students */}
        {!isOwner && (
          <div className="text-center text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg">
            <AlertTriangle className="w-4 h-4 inline mr-1 text-yellow-600" />
            You can always enable identity verification later from your profile settings
          </div>
        )}
      </CardContent>
    </Card>
  );
}
