"use client";

import { Card } from "@/components/ui/card";
import { Info, Copy, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface DemoCredentialsProps {
  type: "student" | "owner";
}

const DEMO_CREDENTIALS = {
  student: {
    email: "demo.student@studentnest.com",
    password: "Demo@123",
    phone: "+1234567890",
  },
  owner: {
    email: "demo.owner@studentnest.com",
    password: "Demo@123",
    phone: "+1234567891",
  },
};

export function DemoCredentials({ type }: DemoCredentialsProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const credentials = DEMO_CREDENTIALS[type];

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900 p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 text-sm mb-1">
              🎯 Try Demo Account
            </h3>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Test the platform with pre-configured demo credentials
            </p>
          </div>

          <div className="space-y-2">
            {/* Email */}
            <div className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-md px-3 py-2 border border-blue-200 dark:border-blue-800">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                <p className="text-sm font-mono text-gray-900 dark:text-gray-100 truncate">
                  {credentials.email}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 ml-2"
                onClick={() => copyToClipboard(credentials.email, "email")}
              >
                {copiedField === "email" ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Password */}
            <div className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-md px-3 py-2 border border-blue-200 dark:border-blue-800">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-400">Password</p>
                <p className="text-sm font-mono text-gray-900 dark:text-gray-100">
                  {credentials.password}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 ml-2"
                onClick={() => copyToClipboard(credentials.password, "password")}
              >
                {copiedField === "password" ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Phone */}
            <div className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-md px-3 py-2 border border-blue-200 dark:border-blue-800">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
                <p className="text-sm font-mono text-gray-900 dark:text-gray-100">
                  {credentials.phone}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 ml-2"
                onClick={() => copyToClipboard(credentials.phone, "phone")}
              >
                {copiedField === "phone" ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <p className="text-xs text-blue-600 dark:text-blue-400 italic">
            💡 Click the copy icon to quickly paste credentials
          </p>
        </div>
      </div>
    </Card>
  );
}
