'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Shield,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
  User
} from 'lucide-react';
import Link from 'next/link';

interface VerificationWidgetProps {
  userRole?: string;
  compact?: boolean;
}

interface SimpleSteps {
  document?: string;
  selfie?: string;
  review?: string;
}

interface VerificationData {
  completedSteps?: string[];
  simpleSteps?: SimpleSteps;
}

interface UserData {
  isIdentityVerified: boolean;
  identityVerificationSkipped?: boolean;
}

interface Requirements {
  verificationRequired: boolean;
}

interface VerificationStatus {
  user: UserData;
  verification?: VerificationData;
  requirements: Requirements;
}

export default function VerificationWidget({ userRole, compact = false }: VerificationWidgetProps) {
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState<boolean | string>(true);

  const isOwner = userRole?.toLowerCase() === 'owner';

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVerificationStatus();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const fetchVerificationStatus = async () => {
    if (loading === 'fetching') return;

    try {
      setLoading('fetching');
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch('/api/verify/requirements', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        console.log('Authentication failed for verification requirements');
        setLoading(false);
        return;
      }

      const result = await response.json();

      if (result.success) {
        setVerificationStatus(result.data);
      } else {
        console.log('Verification requirements fetch failed:', result.error);
      }
    } catch (error) {
      console.error('Error fetching verification status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className={compact ? 'h-32' : 'h-40'}>
        <CardContent className="p-4 flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </CardContent>
      </Card>
    );
  }

  if (!verificationStatus) {
    return null;
  }

  const { user, verification, requirements } = verificationStatus;

  if (user.isIdentityVerified || (!isOwner && user.identityVerificationSkipped)) {
    return compact ? null : (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-full">
              <ShieldCheck className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-green-900">Identity Verified</h4>
              <p className="text-sm text-green-700">Your identity has been verified successfully</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const verificationPath = isOwner ? '/owner/profile/verification' : '/student/profile/verification';

  const totalSteps = 3;
  const completedSteps = verification?.completedSteps?.length || 0;

  const isStepCompleted = (stepName: string) => {
    if (verification?.simpleSteps) {
      return verification.simpleSteps[stepName as keyof SimpleSteps] === 'completed';
    }
    return verification?.completedSteps?.includes(stepName) || false;
  };

  let actualProgress = completedSteps;
  if (verification?.simpleSteps) {
    const simple = verification.simpleSteps;
    actualProgress = Object.values(simple).filter(status => status === 'completed').length;
  }

  const progress = (actualProgress / totalSteps) * 100;

  let statusIcon, statusColor, statusText, urgency;

  if (isOwner && !user.isIdentityVerified) {
    statusIcon = AlertTriangle;
    statusColor = 'text-red-600 bg-red-100 border-red-200';
    statusText = 'Verification Required';
    urgency = 'high';
  } else if (verification && completedSteps > 0) {
    statusIcon = Clock;
    statusColor = 'text-yellow-600 bg-yellow-100 border-yellow-200';
    statusText = 'In Progress';
    urgency = 'medium';
  } else if (requirements.verificationRequired) {
    statusIcon = Shield;
    statusColor = 'text-blue-600 bg-blue-100 border-blue-200';
    statusText = 'Recommended';
    urgency = 'low';
  } else {
    statusIcon = User;
    statusColor = 'text-gray-600 bg-gray-100 border-gray-200';
    statusText = 'Optional';
    urgency = 'low';
  }

  const StatusIcon = statusIcon;

  if (compact) {
    return (
      <Card className="border-2">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100">
                <StatusIcon className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-sm">Identity Verification</h4>
                <Badge variant="outline" className="text-xs mt-1">
                  {statusText}
                </Badge>
              </div>
            </div>
            <Link href={verificationPath}>
              <Button size="sm" variant="outline">
                <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>
          {verification && completedSteps > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span>Progress</span>
                <span>{completedSteps}/{totalSteps} steps</span>
              </div>
              <Progress value={progress} className="h-1" />
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-2 ${statusColor.includes('red') ? 'border-red-200 bg-red-50' :
        statusColor.includes('yellow') ? 'border-yellow-200 bg-yellow-50' :
          statusColor.includes('blue') ? 'border-blue-200 bg-blue-50' :
            'border-gray-200 bg-gray-50'
      }`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-100">
              <StatusIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Identity Verification</CardTitle>
              <Badge
                variant={urgency === 'high' ? 'destructive' : urgency === 'medium' ? 'default' : 'secondary'}
                className="mt-1"
              >
                {statusText}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {verification && actualProgress > 0 ? (
          <>
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-medium">Verification Progress</span>
                <span className="text-gray-600">{actualProgress}/{totalSteps} steps completed</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className={`p-2 rounded text-center ${isStepCompleted('document') ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                <CheckCircle className={`w-3 h-3 mx-auto mb-1 ${isStepCompleted('document') ? 'text-green-600' : 'text-gray-400'
                  }`} />
                Document
              </div>
              <div className={`p-2 rounded text-center ${isStepCompleted('selfie') ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                <CheckCircle className={`w-3 h-3 mx-auto mb-1 ${isStepCompleted('selfie') ? 'text-green-600' : 'text-gray-400'
                  }`} />
                Selfie
              </div>
              <div className={`p-2 rounded text-center ${isStepCompleted('review') ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                <CheckCircle className={`w-3 h-3 mx-auto mb-1 ${isStepCompleted('review') ? 'text-green-600' : 'text-gray-400'
                  }`} />
                Review
              </div>
            </div>

            <p className="text-sm text-gray-600">
              Continue your verification process to secure your account.
            </p>

            <Link href={verificationPath}>
              <Button className="w-full">
                Continue Verification
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-600">
              {isOwner
                ? 'Complete identity verification to list your properties and gain user trust.'
                : 'Verify your identity to access premium features and build trust with property owners.'}
            </p>

            <div className="text-xs text-gray-500">
              <div className="flex items-center gap-1 mb-1">
                <CheckCircle className="w-3 h-3 text-gray-400" />
                Upload government ID (5 mins)
              </div>
              <div className="flex items-center gap-1 mb-1">
                <CheckCircle className="w-3 h-3 text-gray-400" />
                Take verification selfie (2 mins)
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-gray-400" />
                Instant verification result
              </div>
            </div>

            <Link href={verificationPath}>
              <Button
                className={`w-full ${urgency === 'high' ? 'bg-red-600 hover:bg-red-700' : ''}`}
              >
                {isOwner ? 'Start Required Verification' : 'Verify Identity'}
                <Shield className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}
