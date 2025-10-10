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
  Building,
  AlertCircle,
  Home
} from "lucide-react";
import { toast } from "sonner";

export default function OwnerVerificationPage() {
  const [step, setStep] = useState(1);
  const [verified, setVerified] = useState(false);
  const [documents, setDocuments] = useState({
    aadhaar: null,
    pan: null,
    propertyDocs: null,
    photo: null
  });

  const handleFileUpload = (type: string, file: File | null) => {
    setDocuments(prev => ({
      ...prev,
      [type]: file
    }));
    const names: Record<string, string> = {
      aadhaar: 'Aadhaar Card',
      pan: 'PAN Card',
      propertyDocs: 'Property Documents',
      photo: 'Profile Photo'
    };
    toast.success(`${names[type]} uploaded successfully`);
  };

  const handleSubmit = () => {
    if (!documents.aadhaar || !documents.pan || !documents.propertyDocs || !documents.photo) {
      toast.error('Please upload all required documents');
      return;
    }

    // Mock verification
    setVerified(true);
    toast.success('Verification submitted successfully! Your documents will be reviewed within 24-48 hours.');
    setStep(4);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="border-b pb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-orange-600" />
            Property Owner Verification
          </h1>
          <p className="text-muted-foreground mt-2">
            Verify your identity and ownership to list properties and connect with students
          </p>
        </div>

        {/* Status Badge */}
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              {verified ? (
                <>
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-800">Verification Submitted</p>
                    <p className="text-sm text-green-700">Your documents are under review</p>
                  </div>
                  <Badge className="ml-auto" variant="outline">Verified Owner</Badge>
                </>
              ) : (
                <>
                  <AlertCircle className="h-6 w-6 text-orange-600" />
                  <div>
                    <p className="font-semibold text-orange-800">Verification Required</p>
                    <p className="text-sm text-orange-700">Complete verification to start listing properties</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className={step >= 1 ? 'border-orange-500' : ''}>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <FileText className={`h-10 w-10 mb-3 ${step >= 1 ? 'text-orange-600' : 'text-muted-foreground'}`} />
                <h3 className="font-semibold mb-1">Step 1</h3>
                <p className="text-sm text-muted-foreground">Aadhaar</p>
                {documents.aadhaar && (
                  <CheckCircle className="h-5 w-5 text-green-600 mt-2" />
                )}
              </div>
            </CardContent>
          </Card>

          <Card className={step >= 2 ? 'border-orange-500' : ''}>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <FileText className={`h-10 w-10 mb-3 ${step >= 2 ? 'text-orange-600' : 'text-muted-foreground'}`} />
                <h3 className="font-semibold mb-1">Step 2</h3>
                <p className="text-sm text-muted-foreground">PAN Card</p>
                {documents.pan && (
                  <CheckCircle className="h-5 w-5 text-green-600 mt-2" />
                )}
              </div>
            </CardContent>
          </Card>

          <Card className={step >= 3 ? 'border-orange-500' : ''}>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <Home className={`h-10 w-10 mb-3 ${step >= 3 ? 'text-orange-600' : 'text-muted-foreground'}`} />
                <h3 className="font-semibold mb-1">Step 3</h3>
                <p className="text-sm text-muted-foreground">Property Docs</p>
                {documents.propertyDocs && (
                  <CheckCircle className="h-5 w-5 text-green-600 mt-2" />
                )}
              </div>
            </CardContent>
          </Card>

          <Card className={step >= 4 ? 'border-orange-500' : ''}>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <Building className={`h-10 w-10 mb-3 ${step >= 4 ? 'text-orange-600' : 'text-muted-foreground'}`} />
                <h3 className="font-semibold mb-1">Step 4</h3>
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
              <CardTitle>Upload Verification Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Aadhaar Card */}
              <div className="space-y-2">
                <Label htmlFor="aadhaar">Aadhaar Card *</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="aadhaar"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileUpload('aadhaar', e.target.files?.[0] || null)}
                  />
                  {documents.aadhaar && (
                    <Badge variant="secondary">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Uploaded
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Upload a clear copy of your Aadhaar card for identity verification
                </p>
              </div>

              {/* PAN Card */}
              <div className="space-y-2">
                <Label htmlFor="pan">PAN Card *</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="pan"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileUpload('pan', e.target.files?.[0] || null)}
                  />
                  {documents.pan && (
                    <Badge variant="secondary">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Uploaded
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  PAN card for tax and business verification
                </p>
              </div>

              {/* Property Documents */}
              <div className="space-y-2">
                <Label htmlFor="propertyDocs">Property Ownership Documents *</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="propertyDocs"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileUpload('propertyDocs', e.target.files?.[0] || null)}
                  />
                  {documents.propertyDocs && (
                    <Badge variant="secondary">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Uploaded
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Property papers, registry, or rental agreement as proof of ownership
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
                  A professional photo for your owner profile
                </p>
              </div>

              <Button
                onClick={handleSubmit}
                className="w-full bg-orange-600 hover:bg-orange-700"
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
              <div className="bg-white rounded-lg p-4 mb-6">
                <h3 className="font-semibold mb-2">What happens next?</h3>
                <ul className="text-sm text-left space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    <span>Our team reviews your documents (24-48 hours)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    <span>You'll receive email confirmation once approved</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    <span>Your profile gets a "Verified Owner" badge</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    <span>You can start listing properties immediately</span>
                  </li>
                </ul>
              </div>
              <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => window.location.href = '/owner/bookings'}>
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
