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
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  RotateCcw,
  MessageSquare,
  Calculator,
  Percent,
  ArrowRight,
  Send,
  Trash2,
  Eye,
  Loader2,
  AlertCircle,
  Calendar,
  IndianRupee,
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
  };
}

export default function StudentNegotiationsPage() {
  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  // New negotiation form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [proposedPrice, setProposedPrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [message, setMessage] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    fetchNegotiations();
  }, []);

  const fetchNegotiations = async () => {
    setLoading(true);
    try {
      const response = await apiClient.request('/negotiations?role=student');
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

  const handleCreateNegotiation = async () => {
    if (!selectedRoomId || !proposedPrice || !originalPrice) {
      toast.error('Please fill in all required fields');
      return;
    }

    const proposedAmount = parseFloat(proposedPrice);
    const originalAmount = parseFloat(originalPrice);

    if (proposedAmount <= 0 || originalAmount <= 0) {
      toast.error('Please enter valid prices');
      return;
    }

    if (proposedAmount >= originalAmount) {
      toast.error('Proposed price must be lower than original price');
      return;
    }

    setCreateLoading(true);
    try {
      const response = await apiClient.request('/negotiations', {
        method: 'POST',
        body: JSON.stringify({
          roomId: selectedRoomId,
          proposedPrice: proposedAmount,
          message: message.trim()
        })
      });

      if (response.success) {
        toast.success('Negotiation submitted successfully!');
        setShowCreateModal(false);
        setSelectedRoomId('');
        setProposedPrice('');
        setOriginalPrice('');
        setMessage('');
        fetchNegotiations();
      } else {
        toast.error(response.error || 'Failed to create negotiation');
      }
    } catch (error: any) {
      console.error('Error creating negotiation:', error);
      toast.error(error.message || 'Failed to create negotiation');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleWithdrawNegotiation = async (negotiationId: string) => {
    if (!confirm('Are you sure you want to withdraw this negotiation?')) return;

    setActionLoading(negotiationId);
    try {
      const response = await apiClient.request(`/negotiations/${negotiationId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'withdraw' })
      });

      if (response.success) {
        toast.success('Negotiation withdrawn successfully');
        fetchNegotiations();
      } else {
        toast.error(response.error || 'Failed to withdraw negotiation');
      }
    } catch (error: any) {
      console.error('Error withdrawing negotiation:', error);
      toast.error(error.message || 'Failed to withdraw negotiation');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (negotiation: Negotiation) => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      pending: {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: <Clock className="h-3 w-3" />,
        label: 'Pending Response'
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
        icon: <Trash2 className="h-3 w-3" />,
        label: 'Withdrawn'
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

  const calculateSavings = (original: number, proposed: number, counter?: number) => {
    const finalPrice = counter || proposed;
    const savings = original - finalPrice;
    const percentage = Math.round((savings / original) * 100);
    return { savings, percentage };
  };

  const filteredNegotiations = negotiations.filter(neg => {
    if (activeTab === 'pending') return neg.status === 'pending' || neg.status === 'countered';
    if (activeTab === 'accepted') return neg.status === 'accepted';
    if (activeTab === 'rejected') return neg.status === 'rejected' || neg.status === 'withdrawn';
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
    rejected: negotiations.filter(n => n.status === 'rejected' || n.status === 'withdrawn').length,
    totalSavings: negotiations
      .filter(n => n.status === 'accepted')
      .reduce((sum, n) => sum + (n.originalPrice - (n.finalPrice || n.proposedPrice)), 0),
    avgDiscount: negotiations.filter(n => n.status === 'accepted').length > 0
      ? Math.round(negotiations
        .filter(n => n.status === 'accepted')
        .reduce((sum, n, _, arr) => {
          const discount = ((n.originalPrice - (n.finalPrice || n.proposedPrice)) / n.originalPrice) * 100;
          return sum + discount / arr.length;
        }, 0))
      : 0
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Price Negotiations</h1>
          <p className="text-gray-600 mt-1">Negotiate better prices for your preferred rooms</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchNegotiations} variant="outline">
            <Loader2 className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateModal(true)} className="bg-blue-600 hover:bg-blue-700">
            <Send className="h-4 w-4 mr-2" />
            New Negotiation
          </Button>
        </div>
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
                <p className="text-sm text-gray-600">Total Savings</p>
                <p className="text-2xl font-bold">₹{stats.totalSavings.toLocaleString()}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Discount</p>
                <p className="text-2xl font-bold">{stats.avgDiscount}%</p>
              </div>
              <Percent className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Negotiations List */}
      <Card>
        <CardHeader>
          <CardTitle>My Negotiations</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
              <TabsTrigger value="accepted">Accepted ({stats.accepted})</TabsTrigger>
              <TabsTrigger value="rejected">Rejected ({stats.rejected})</TabsTrigger>
            </TabsList>

            <div className="space-y-4">
              {filteredNegotiations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No negotiations found</p>
                  <p className="text-sm">Start negotiating to get better prices!</p>
                </div>
              ) : (
                filteredNegotiations.map((negotiation) => {
                  const { savings, percentage } = calculateSavings(
                    negotiation.originalPrice,
                    negotiation.proposedPrice,
                    negotiation.counterOffer
                  );

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

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                              <div className="space-y-3">
                                <div className="flex items-center justify-between bg-slate-100 p-3 rounded-lg border border-slate-200">
                                  <span className="text-sm text-slate-700 font-medium">Original Price</span>
                                  <span className="font-semibold text-slate-900">₹{negotiation.originalPrice.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-200">
                                  <span className="text-sm text-blue-700 font-medium">Your Proposal</span>
                                  <span className="font-semibold text-blue-800">₹{negotiation.proposedPrice.toLocaleString()}</span>
                                </div>
                                {negotiation.counterOffer && (
                                  <div className="flex items-center justify-between bg-purple-50 p-3 rounded-lg border border-purple-200">
                                    <span className="text-sm text-purple-700 font-medium">Counter Offer</span>
                                    <span className="font-semibold text-purple-800">₹{negotiation.counterOffer.toLocaleString()}</span>
                                  </div>
                                )}
                              </div>

                              <div className="space-y-3">
                                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200 shadow-sm">
                                  <div className="text-2xl font-bold text-green-700">₹{savings.toLocaleString()}</div>
                                  <div className="text-sm text-green-600 font-medium">Potential Savings ({percentage}%)</div>
                                </div>

                                <div className="text-sm text-gray-600 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    <span>Submitted {new Date(negotiation.createdAt).toLocaleDateString()}</span>
                                  </div>
                                  {negotiation.expiresAt && (
                                    <div className="flex items-center gap-2">
                                      <Clock className="h-4 w-4" />
                                      <span>Expires {new Date(negotiation.expiresAt).toLocaleDateString()}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {negotiation.message && (
                              <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                <div className="flex items-center gap-2 mb-1">
                                  <MessageSquare className="h-4 w-4 text-slate-600" />
                                  <span className="text-sm font-medium text-slate-800">Your Message</span>
                                </div>
                                <p className="text-sm text-slate-700 leading-relaxed">{negotiation.message}</p>
                              </div>
                            )}

                            {negotiation.ownerResponse && (
                              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex items-center gap-2 mb-1">
                                  <MessageSquare className="h-4 w-4 text-blue-600" />
                                  <span className="text-sm font-medium text-blue-800">Owner Response</span>
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
                          </div>

                          <div className="flex flex-col gap-2 ml-4">
                            {negotiation.status === 'pending' && !negotiation.isExpired && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleWithdrawNegotiation(negotiation._id)}
                                disabled={actionLoading === negotiation._id}
                              >
                                {actionLoading === negotiation._id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4 mr-1" />
                                )}
                                Withdraw
                              </Button>
                            )}

                            {negotiation.status === 'accepted' && (
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => window.location.href = `/dashboard/rooms/${negotiation.room._id}/book?price=${negotiation.finalPrice || negotiation.proposedPrice}`}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Book Now
                              </Button>
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

      {/* Create Negotiation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Start New Negotiation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="roomId" className="block text-sm font-medium text-gray-700 mb-2">
                  Room ID *
                </Label>
                <Input
                  id="roomId"
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  placeholder="Enter room ID"
                />
              </div>

              <div>
                <Label htmlFor="originalPrice" className="block text-sm font-medium text-gray-700 mb-2">
                  Original Price (₹/month) *
                </Label>
                <Input
                  id="originalPrice"
                  type="number"
                  value={originalPrice}
                  onChange={(e) => setOriginalPrice(e.target.value)}
                  placeholder="Enter current room price"
                />
              </div>

              <div>
                <Label htmlFor="proposedPrice" className="block text-sm font-medium text-gray-700 mb-2">
                  Your Proposed Price (₹/month) *
                </Label>
                <Input
                  id="proposedPrice"
                  type="number"
                  value={proposedPrice}
                  onChange={(e) => setProposedPrice(e.target.value)}
                  placeholder="Enter your proposed price"
                />
                {proposedPrice && originalPrice && (
                  <div className="mt-2 text-sm">
                    <span className="text-green-600">
                      Potential savings: ₹{(parseFloat(originalPrice) - parseFloat(proposedPrice)).toLocaleString()}
                      ({Math.round(((parseFloat(originalPrice) - parseFloat(proposedPrice)) / parseFloat(originalPrice)) * 100)}%)
                    </span>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                  Message (Optional)
                </Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Explain why you deserve this price..."
                  rows={3}
                  maxLength={1000}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    setSelectedRoomId('');
                    setProposedPrice('');
                    setOriginalPrice('');
                    setMessage('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateNegotiation}
                  disabled={createLoading || !selectedRoomId || !proposedPrice || !originalPrice}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {createLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Submit Negotiation
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}