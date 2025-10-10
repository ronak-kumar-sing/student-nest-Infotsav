"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  User,
  Settings,
  Shield,
  Heart,
  Building2,
  Briefcase,
  Bell,
  Lock,
  ShieldCheck,
  AlertTriangle,
  Clock
} from 'lucide-react';

const ProfileNavigation = ({ userType = "student" }) => {
  const pathname = usePathname();
  const [verificationStatus, setVerificationStatus] = useState(null);

  useEffect(() => {
    fetchVerificationStatus();
  }, []);

  const fetchVerificationStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

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
    }
  };

  const getVerificationBadge = () => {
    if (!verificationStatus) return null;

    const { user, verification } = verificationStatus;
    const isOwner = userType === 'owner';

    if (user.isIdentityVerified) {
      return <Badge className="ml-2 bg-green-600 hover:bg-green-700 text-xs">Verified</Badge>;
    }

    if (verification && verification.completedSteps.length > 0) {
      return <Badge variant="secondary" className="ml-2 text-xs">In Progress</Badge>;
    }

    if (isOwner) {
      return <Badge variant="destructive" className="ml-2 text-xs">Required</Badge>;
    }

    if (user.identityVerificationSkipped) {
      return <Badge variant="outline" className="ml-2 text-xs">Skipped</Badge>;
    }

    return <Badge variant="outline" className="ml-2 text-xs">Optional</Badge>;
  };

  const studentNavItems = [
    {
      label: "Profile",
      href: "/student/profile",
      icon: User,
      description: "Personal information and bio"
    },
    {
      label: "Preferences",
      href: "/student/profile/preferences",
      icon: Heart,
      description: "Room preferences and budget"
    },
    {
      label: "Verification",
      href: "/student/profile/verification",
      icon: Shield,
      description: "Account verification status"
    },
    {
      label: "Settings",
      href: "/student/profile/settings",
      icon: Settings,
      description: "Account and privacy settings"
    }
  ];

  const ownerNavItems = [
    {
      label: "Profile",
      href: "/owner/profile",
      icon: User,
      description: "Personal information and bio"
    },
    {
      label: "Business",
      href: "/owner/profile/business",
      icon: Briefcase,
      description: "Business details and experience"
    },
    {
      label: "Verification",
      href: "/owner/profile/verification",
      icon: Shield,
      description: "Identity verification status"
    },
    {
      label: "Settings",
      href: "/owner/profile/settings",
      icon: Settings,
      description: "Account and privacy settings"
    }
  ];

  const navItems = userType === "student" ? studentNavItems : ownerNavItems;

  const isActivePath = (href) => {
    if (href === `/${userType}/profile`) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <Card className="bg-white dark:bg-gray-800 shadow-sm">
      <CardContent className="p-0">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isActivePath(item.href);

            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={`w-full justify-start h-auto p-4 ${isActive
                    ? "bg-blue-50 text-blue-700 border-r-2 border-blue-500 dark:bg-blue-900/20 dark:text-blue-400"
                    : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                    }`}
                >
                  <div className="flex items-center space-x-3 w-full">
                    <Icon
                      size={20}
                      className={isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"}
                    />
                    <div className="text-left flex-1">
                      <div className="font-medium flex items-center">
                        {item.label}
                        {item.label === "Verification" && getVerificationBadge()}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {item.description}
                      </div>
                    </div>
                  </div>
                </Button>
              </Link>
            );
          })}
        </nav>
      </CardContent>
    </Card>
  );
};

export default ProfileNavigation;
