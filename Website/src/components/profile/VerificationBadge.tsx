"use client";

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, XCircle, AlertCircle, Mail, Phone, GraduationCap, CreditCard, Shield } from 'lucide-react';

const VerificationBadge = ({ status, type, size = "sm", showLabel = true }) => {
  const statusConfig = {
    verified: {
      color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
      icon: CheckCircle,
      text: 'Verified'
    },
    pending: {
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
      icon: Clock,
      text: 'Pending'
    },
    in_review: {
      color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
      icon: AlertCircle,
      text: 'In Review'
    },
    rejected: {
      color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
      icon: XCircle,
      text: 'Rejected'
    },
    not_verified: {
      color: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
      icon: XCircle,
      text: 'Not Verified'
    }
  };

  const typeConfig = {
    email: { icon: Mail, label: 'Email' },
    phone: { icon: Phone, label: 'Phone' },
    college_id: { icon: GraduationCap, label: 'College ID' },
    collegeId: { icon: GraduationCap, label: 'College ID' },
    aadhaar: { icon: Shield, label: 'Aadhaar' },
    identity: { icon: Shield, label: 'Identity' },
    pan: { icon: CreditCard, label: 'PAN' },
    digilocker: { icon: Shield, label: 'DigiLocker' }
  };

  const statusInfo = statusConfig[status] || statusConfig.not_verified;
  const typeInfo = typeConfig[type] || { icon: Shield, label: type };

  const StatusIcon = statusInfo.icon;
  const TypeIcon = typeInfo.icon;

  const iconSize = size === "lg" ? 16 : size === "md" ? 14 : 12;

  return (
    <Badge
      variant="outline"
      className={`inline-flex items-center gap-1.5 ${statusInfo.color} ${size === "lg" ? "px-3 py-1.5 text-sm" :
          size === "md" ? "px-2.5 py-1 text-xs" :
            "px-2 py-0.5 text-xs"
        }`}
    >
      <TypeIcon size={iconSize} className="flex-shrink-0" />
      {showLabel && (
        <span className="font-medium">
          {typeInfo.label}
        </span>
      )}
      <StatusIcon size={iconSize} className="flex-shrink-0" />
      <span className={size === "lg" ? "font-semibold" : "font-medium"}>
        {statusInfo.text}
      </span>
    </Badge>
  );
};

export default VerificationBadge;
