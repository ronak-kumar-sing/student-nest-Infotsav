"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  RotateCcw,
  MessageSquare,
  Calculator,
  Percent,
  ArrowRight,
  User,
  GraduationCap,
  Phone,
  Mail,
  Loader2,
  AlertCircle,
  Calendar,
  IndianRupee,
  Eye,
  ExternalLink,
  Home
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/api';

interface Negotiation {
  _id: string;
  userRole: 'student' | 'owner';
  status: 'pending' | 'accepted' | 'rejected' | 'countered' | 'withdrawn';
  originalPrice: number;
  proposedPrice: number;
  counterOffer?: number;
  finalPrice?: number;
  message?: string;
  ownerResponse?: string;
  counterMessage?: string;
  createdAt: string;
  responseDate?: string;
  expiresAt?: string;
  isExpired?: boolean;
  discountPercentage?: number;
  savingsAmount?: number;
  room: {
    _id: string;
    title: string;
    price: number;
    location: string | {
      address?: string;
      city?: string;
      state?: string;
      pincode?: string;
      nearbyUniversities?: any[];
      nearbyFacilities?: any[];
    };
    images?: string[];
    roomType: string;
  };
  counterparty: {
    fullName: string;
    email: string;
    phone?: string;
    collegeId?: string;
    course?: string;
    yearOfStudy?: number;
  };
}

export default function OwnerNegotiationsPage() {
  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('pending');

  // Response modals
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [selectedNegotiation, setSelectedNegotiation] = useState<Negotiation | null>(null);
  const [responseAction, setResponseAction] = useState<'accept' | 'reject' | 'counter'>('accept');
  const [ownerResponse, setOwnerResponse] = useState('');
  const [counterOffer, setCounterOffer] = useState('');
  const [counterMessage, setCounterMessage] = useState('');

  useEffect(() => {
    fetchNegotiations();
  }, []);

  const fetchNegotiations = async () => {
    setLoading(true);
    try {
      const response = await apiClient.request('/negotiations?role=owner');
      if (response.success) {
        setNegotiations(response.data.negotiations || []);
      } else {
        toast.error(response.error || 'Failed to fetch negotiations');
      }
    } catch (error: any) {
      console.error('Error fetching negotiations:', error);
      toast.error(error.message || 'Failed to fetch negotiations');
    } finally {
      setLoading(false);
    }
  };

  const handleRespondToNegotiation = async () => {
    if (!selectedNegotiation) return;

    // Validation
    if (responseAction === 'counter') {
      const counterAmount = parseFloat(counterOffer);
      if (!counterAmount || counterAmount <= 0) {
        toast.error('Please enter a valid counter offer');
        return;
      }
      if (counterAmount < selectedNegotiation.proposedPrice || counterAmount > selectedNegotiation.originalPrice) {
        toast.error('Counter offer must be between the proposed price and original price');
        return;
      }
    }

    setActionLoading(selectedNegotiation._id);
    try {
      const requestBody: any = { action: responseAction };

      if (responseAction === 'counter') {
        requestBody.counterOffer = parseFloat(counterOffer);
        if (counterMessage.trim()) requestBody.counterMessage = counterMessage.trim();
      } else if (ownerResponse.trim()) {
        requestBody.ownerResponse = ownerResponse.trim();
      }

      const response = await apiClient.request(`/negotiations/${selectedNegotiation._id}`, {
        method: 'PATCH',
        body: JSON.stringify(requestBody)
      });

      if (response.success) {
        toast.success(`Negotiation ${responseAction}${responseAction === 'accept' ? 'ed' : responseAction === 'reject' ? 'ed' : 'ed'} successfully!`);
        setShowResponseModal(false);
        setSelectedNegotiation(null);
        setOwnerResponse('');
        setCounterOffer('');
        setCounterMessage('');
        fetchNegotiations();
      } else {
        toast.error(response.error || `Failed to ${responseAction} negotiation`);
      }
    } catch (error: any) {
      console.error(`Error ${responseAction}ing negotiation:`, error);
      toast.error(error.message || `Failed to ${responseAction} negotiation`);
    } finally {
      setActionLoading(null);
    }
  };

  const openResponseModal = (negotiation: Negotiation, action: 'accept' | 'reject' | 'counter') => {
    setSelectedNegotiation(negotiation);
    setResponseAction(action);
    setOwnerResponse('');
    setCounterOffer(action === 'counter' ? Math.round((negotiation.proposedPrice + negotiation.originalPrice) / 2).toString() : '');
    setCounterMessage('');
    setShowResponseModal(true);
  };

  const getStatusBadge = (negotiation: Negotiation) => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      pending: {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: <Clock className="h-3 w-3" />,
        label: 'Needs Response'
      },
      countered: {
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: <RotateCcw className="h-3 w-3" />,
        label: 'Counter Offered'
      },
      accepted: {
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: <CheckCircle className="h-3 w-3" />,
        label: 'Accepted'
      },
      rejected: {
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: <XCircle className="h-3 w-3" />,
        label: 'Rejected'
      },
      withdrawn: {
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: <XCircle className="h-3 w-3" />,
        label: 'Withdrawn by Student'
      }
    };

    const config = statusConfig[negotiation.status] || statusConfig.pending;

    return (
      <Badge variant="outline" className={`${config.color} flex items-center gap-1`}>
        {config.icon}
        {config.label}
        {negotiation.isExpired && ' (Expired)'}
      </Badge>
    );
  };

  const calculatePriceDetails = (negotiation: Negotiation) => {
    const currentOffer = negotiation.counterOffer || negotiation.proposedPrice;
    const reduction = negotiation.originalPrice - currentOffer;
    const reductionPercentage = Math.round((reduction / negotiation.originalPrice) * 100);

    return { currentOffer, reduction, reductionPercentage };
  };

  const filteredNegotiations = negotiations.filter(neg => {
    if (activeTab === 'pending') return neg.status === 'pending' || neg.status === 'countered';
    if (activeTab === 'accepted') return neg.status === 'accepted';
    if (activeTab === 'completed') return neg.status === 'rejected' || neg.status === 'withdrawn';
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const stats = {
    total: negotiations.length,
    pending: negotiations.filter(n => n.status === 'pending' || n.status === 'countered').length,
    accepted: negotiations.filter(n => n.status === 'accepted').length,
    completed: negotiations.filter(n => n.status === 'rejected' || n.status === 'withdrawn').length,
    avgNegotiatedPrice: negotiations.filter(n => n.status === 'accepted').length > 0
      ? Math.round(negotiations
        .filter(n => n.status === 'accepted')
        .reduce((sum, n, _, arr) => sum + (n.finalPrice || n.proposedPrice) / arr.length, 0))
      : 0,
    totalRevenueLoss: negotiations
      .filter(n => n.status === 'accepted')
      .reduce((sum, n) => sum + (n.originalPrice - (n.finalPrice || n.proposedPrice)), 0)
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Price Negotiations</h1>
          <p className="text-gray-600 mt-1">Manage negotiation requests from students</p>
        </div>
        <Button onClick={fetchNegotiations} variant="outline">
          <Loader2 className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Accepted</p>
                <p className="text-2xl font-bold">{stats.accepted}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Price</p>
                <p className="text-2xl font-bold">₹{stats.avgNegotiatedPrice.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Revenue Impact</p>
                <p className="text-2xl font-bold text-red-600">-₹{stats.totalRevenueLoss.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Negotiations List */}
      <Card>
        <CardHeader>
          <CardTitle>Negotiation Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
              <TabsTrigger value="accepted">Accepted ({stats.accepted})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({stats.completed})</TabsTrigger>
            </TabsList>

            <div className="space-y-4">
              {filteredNegotiations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No negotiations found</p>
                  <p className="text-sm">Negotiation requests will appear here</p>
                </div>
              ) : (
                filteredNegotiations.map((negotiation) => {
                  const { currentOffer, reduction, reductionPercentage } = calculatePriceDetails(negotiation);

                  return (
                    <Card key={negotiation._id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="flex items-center gap-2 flex-1">
                                <Home className="h-5 w-5 text-gray-500" />
                                <Link
                                  href={`/dashboard/rooms/${negotiation.room._id}`}
                                  className="font-semibold text-lg text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                                >
                                  {negotiation.room.title}
                                </Link>
                                <ExternalLink className="h-4 w-4 text-gray-400" />
                              </div>
                              {getStatusBadge(negotiation)}
                              {negotiation.isExpired && (
                                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Expired
                                </Badge>
                              )}
                            </div>

                            <div className="bg-gray-50 p-3 rounded-lg mb-4 border border-gray-200">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Location:</span>
                                <span className="font-medium text-gray-900">
                                  {typeof negotiation.room.location === 'string'
                                    ? negotiation.room.location
                                    : `${negotiation.room.location?.address || ''}, ${negotiation.room.location?.city || ''}`
                                  }
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-sm mt-1">
                                <span className="text-gray-600">Room Type:</span>
                                <span className="font-medium text-gray-900">{negotiation.room.roomType}</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                              {/* Student Information */}
                              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  Student Details
                                </h4>
                                <div className="space-y-1 text-sm">
                                  <p><strong>Name:</strong> {negotiation.counterparty.fullName}</p>
                                  <p><strong>Email:</strong> {negotiation.counterparty.email}</p>
                                  {negotiation.counterparty.collegeId && (
                                    <p><strong>College ID:</strong> {negotiation.counterparty.collegeId}</p>
                                  )}
                                  {negotiation.counterparty.course && (
                                    <p><strong>Course:</strong> {negotiation.counterparty.course}</p>
                                  )}
                                  {negotiation.counterparty.yearOfStudy && (
                                    <p><strong>Year:</strong> {negotiation.counterparty.yearOfStudy}</p>
                                  )}
                                </div>
                              </div>

                              {/* Pricing Information */}
                              <div className="space-y-3">
                                <div className="flex items-center justify-between bg-slate-100 p-3 rounded-lg border border-slate-200">
                                  <span className="text-sm text-slate-700 font-medium">Original Price</span>
                                  <span className="font-semibold text-slate-900">₹{negotiation.originalPrice.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-200">
                                  <span className="text-sm text-blue-700 font-medium">Student's Offer</span>
                                  <span className="font-semibold text-blue-800">₹{negotiation.proposedPrice.toLocaleString()}</span>
                                </div>
                                {negotiation.counterOffer && (
                                  <div className="flex items-center justify-between bg-purple-50 p-3 rounded-lg border border-purple-200">
                                    <span className="text-sm text-purple-700 font-medium">Your Counter</span>
                                    <span className="font-semibold text-purple-800">₹{negotiation.counterOffer.toLocaleString()}</span>
                                  </div>
                                )}
                              </div>

                              {/* Impact Analysis */}
                              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                                <h4 className="font-medium text-yellow-900 mb-2 flex items-center gap-2">
                                  <Calculator className="h-4 w-4" />
                                  Financial Impact
                                </h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span>Revenue Loss:</span>
                                    <span className="font-semibold text-red-600">₹{reduction.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Discount:</span>
                                    <span className="font-semibold text-red-600">{reductionPercentage}%</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>New Price:</span>
                                    <span className="font-semibold text-green-600">₹{currentOffer.toLocaleString()}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Messages */}
                            {negotiation.message && (
                              <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                <div className="flex items-center gap-2 mb-1">
                                  <MessageSquare className="h-4 w-4 text-slate-600" />
                                  <span className="text-sm font-medium text-slate-800">Student's Message</span>
                                </div>
                                <p className="text-sm text-slate-700 leading-relaxed">{negotiation.message}</p>
                              </div>
                            )}

                            {negotiation.ownerResponse && (
                              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex items-center gap-2 mb-1">
                                  <MessageSquare className="h-4 w-4 text-blue-600" />
                                  <span className="text-sm font-medium text-blue-800">Your Response</span>
                                </div>
                                <p className="text-sm text-blue-700 leading-relaxed">{negotiation.ownerResponse}</p>
                              </div>
                            )}

                            {negotiation.counterMessage && (
                              <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                                <div className="flex items-center gap-2 mb-1">
                                  <RotateCcw className="h-4 w-4 text-purple-600" />
                                  <span className="text-sm font-medium text-purple-800">Counter Message</span>
                                </div>
                                <p className="text-sm text-purple-700 leading-relaxed">{negotiation.counterMessage}</p>
                              </div>
                            )}

                            <div className="text-sm text-gray-500">
                              Submitted {new Date(negotiation.createdAt).toLocaleDateString()} •
                              {negotiation.expiresAt && ` Expires ${new Date(negotiation.expiresAt).toLocaleDateString()}`}
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 ml-4">
                            {(negotiation.status === 'pending' || negotiation.status === 'countered') && !negotiation.isExpired && (
                              <div className="flex flex-col gap-1">
                                <Button
                                  size="sm"
                                  onClick={() => openResponseModal(negotiation, 'accept')}
                                  className="bg-green-600 hover:bg-green-700"
                                  disabled={actionLoading === negotiation._id}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => openResponseModal(negotiation, 'counter')}
                                  className="bg-blue-600 hover:bg-blue-700"
                                  disabled={actionLoading === negotiation._id}
                                >
                                  <RotateCcw className="h-4 w-4 mr-1" />
                                  Counter
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => openResponseModal(negotiation, 'reject')}
                                  disabled={actionLoading === negotiation._id}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Response Modal */}
      {showResponseModal && selectedNegotiation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg mx-4">
            <CardHeader>
              <CardTitle>
                {responseAction === 'accept' && 'Accept Negotiation'}
                {responseAction === 'reject' && 'Reject Negotiation'}
                {responseAction === 'counter' && 'Make Counter Offer'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Negotiation Summary</h4>
                <div className="text-sm space-y-1">
                  <p><strong>Property:</strong> {selectedNegotiation.room.title}</p>
                  <p><strong>Original Price:</strong> ₹{selectedNegotiation.originalPrice.toLocaleString()}</p>
                  <p><strong>Student's Offer:</strong> ₹{selectedNegotiation.proposedPrice.toLocaleString()}</p>
                  <p><strong>Student:</strong> {selectedNegotiation.counterparty.fullName}</p>
                </div>
              </div>

              {responseAction === 'counter' && (
                <div>
                  <Label htmlFor="counterOffer" className="block text-sm font-medium text-gray-700 mb-2">
                    Counter Offer Amount (₹) *
                  </Label>
                  <Input
                    id="counterOffer"
                    type="number"
                    value={counterOffer}
                    onChange={(e) => setCounterOffer(e.target.value)}
                    placeholder="Enter counter offer"
                    min={selectedNegotiation.proposedPrice}
                    max={selectedNegotiation.originalPrice}
                  />
                  <div className="mt-1 text-xs text-gray-500">
                    Must be between ₹{selectedNegotiation.proposedPrice.toLocaleString()} and ₹{selectedNegotiation.originalPrice.toLocaleString()}
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="response" className="block text-sm font-medium text-gray-700 mb-2">
                  {responseAction === 'counter' ? 'Message (Optional)' : 'Response Message (Optional)'}
                </Label>
                <Textarea
                  id="response"
                  value={responseAction === 'counter' ? counterMessage : ownerResponse}
                  onChange={(e) => {
                    if (responseAction === 'counter') {
                      setCounterMessage(e.target.value);
                    } else {
                      setOwnerResponse(e.target.value);
                    }
                  }}
                  placeholder={`Add a ${responseAction === 'counter' ? 'message for your counter offer' : 'message for your response'}...`}
                  rows={3}
                  maxLength={1000}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowResponseModal(false);
                    setSelectedNegotiation(null);
                    setOwnerResponse('');
                    setCounterOffer('');
                    setCounterMessage('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRespondToNegotiation}
                  disabled={actionLoading === selectedNegotiation._id || (responseAction === 'counter' && !counterOffer)}
                  className={
                    responseAction === 'accept'
                      ? 'bg-green-600 hover:bg-green-700'
                      : responseAction === 'counter'
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : 'bg-red-600 hover:bg-red-700'
                  }
                >
                  {actionLoading === selectedNegotiation._id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <>
                      {responseAction === 'accept' && <CheckCircle className="h-4 w-4 mr-2" />}
                      {responseAction === 'reject' && <XCircle className="h-4 w-4 mr-2" />}
                      {responseAction === 'counter' && <RotateCcw className="h-4 w-4 mr-2" />}
                    </>
                  )}
                  {responseAction === 'accept' && 'Accept Offer'}
                  {responseAction === 'reject' && 'Reject Offer'}
                  {responseAction === 'counter' && 'Send Counter Offer'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}