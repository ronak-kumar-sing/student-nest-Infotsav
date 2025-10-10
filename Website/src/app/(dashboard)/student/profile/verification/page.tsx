"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Shield,
  Upload,
  CheckCircle,
  FileText,
  Camera,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";

export default function StudentVerificationPage() {
  const [step, setStep] = useState(1);
  const [verified, setVerified] = useState(false);
  const [documents, setDocuments] = useState({
    idCard: null,
    collegeLetter: null,
    photo: null
  });

  const handleFileUpload = (type: string, file: File | null) => {
    setDocuments(prev => ({
      ...prev,
      [type]: file
    }));
    toast.success(`${type === 'idCard' ? 'ID Card' : type === 'collegeLetter' ? 'College Letter' : 'Photo'} uploaded successfully`);
  };

  const handleSubmit = () => {
    if (!documents.idCard || !documents.collegeLetter || !documents.photo) {
      toast.error('Please upload all required documents');
      return;
    }

    // Mock verification
    setVerified(true);
    toast.success('Verification submitted successfully! Your profile will be reviewed within 24-48 hours.');
    setStep(3);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="border-b pb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-blue-600" />
            Student Verification
          </h1>
          <p className="text-muted-foreground mt-2">
            Verify your identity to access premium features and build trust with property owners
          </p>
        </div>

        {/* Status Badge */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              {verified ? (
                <>
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-800">Verification Submitted</p>
                    <p className="text-sm text-green-700">Your documents are under review</p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="h-6 w-6 text-blue-600" />
                  <div>
                    <p className="font-semibold text-blue-800">Verification Required</p>
                    <p className="text-sm text-blue-700">Complete verification to unlock all features</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className={step >= 1 ? 'border-blue-500' : ''}>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <FileText className={`h-10 w-10 mb-3 ${step >= 1 ? 'text-blue-600' : 'text-muted-foreground'}`} />
                <h3 className="font-semibold mb-1">Step 1</h3>
                <p className="text-sm text-muted-foreground">ID Card Upload</p>
                {documents.idCard && (
                  <CheckCircle className="h-5 w-5 text-green-600 mt-2" />
                )}
              </div>
            </CardContent>
          </Card>

          <Card className={step >= 2 ? 'border-blue-500' : ''}>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <FileText className={`h-10 w-10 mb-3 ${step >= 2 ? 'text-blue-600' : 'text-muted-foreground'}`} />
                <h3 className="font-semibold mb-1">Step 2</h3>
                <p className="text-sm text-muted-foreground">College Letter</p>
                {documents.collegeLetter && (
                  <CheckCircle className="h-5 w-5 text-green-600 mt-2" />
                )}
              </div>
            </CardContent>
          </Card>

          <Card className={step >= 3 ? 'border-blue-500' : ''}>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <Camera className={`h-10 w-10 mb-3 ${step >= 3 ? 'text-blue-600' : 'text-muted-foreground'}`} />
                <h3 className="font-semibold mb-1">Step 3</h3>
                <p className="text-sm text-muted-foreground">Profile Photo</p>
                {documents.photo && (
                  <CheckCircle className="h-5 w-5 text-green-600 mt-2" />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {!verified && (
          <Card>
            <CardHeader>
              <CardTitle>Upload Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* ID Card Upload */}
              <div className="space-y-2">
                <Label htmlFor="idCard">Student ID Card *</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="idCard"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileUpload('idCard', e.target.files?.[0] || null)}
                  />
                  {documents.idCard && (
                    <Badge variant="secondary">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Uploaded
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Upload a clear photo or scan of your college ID card
                </p>
              </div>

              {/* College Letter */}
              <div className="space-y-2">
                <Label htmlFor="collegeLetter">College Enrollment Letter *</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="collegeLetter"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileUpload('collegeLetter', e.target.files?.[0] || null)}
                  />
                  {documents.collegeLetter && (
                    <Badge variant="secondary">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Uploaded
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Official letter or certificate from your college
                </p>
              </div>

              {/* Profile Photo */}
              <div className="space-y-2">
                <Label htmlFor="photo">Profile Photo *</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="photo"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload('photo', e.target.files?.[0] || null)}
                  />
                  {documents.photo && (
                    <Badge variant="secondary">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Uploaded
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  A clear photo of your face for identity verification
                </p>
              </div>

              <Button
                onClick={handleSubmit}
                className="w-full"
                size="lg"
              >
                Submit for Verification
              </Button>
            </CardContent>
          </Card>
        )}

        {verified && (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-6 text-center">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-green-800 mb-2">Verification Submitted!</h2>
              <p className="text-green-700 mb-6">
                Your documents have been submitted successfully. Our team will review them within 24-48 hours.
              </p>
              <p className="text-sm text-green-600">
                You'll receive a notification once your verification is complete.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
