"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Users,
  Send,
  Inbox,
  Clock,
  CheckCircle,
  XCircle,
  MapPin,
  Bed,
  IndianRupee,
  Calendar,
  MessageCircle,
  Eye,
  Trash2,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/api';

interface Application {
  _id: string;
  type: 'sent' | 'received';
  status: 'pending' | 'accepted' | 'rejected';
  message: string;
  studyHabits: string;
  lifestyle: string;
  createdAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
  counterparty: {
    fullName: string;
    email: string;
    phone?: string;
    collegeId?: string;
    course?: string;
    yearOfStudy?: number;
  };
  roomSharing: {
    _id: string;
    totalBeds: number;
    bedsAvailable: number;
    monthlyRent: number;
    securityDeposit: number;
    property: {
      title: string;
      location: string;
      images?: string[];
      roomType: string;
    };
  };
}

export default function RoomSharingApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Rejection modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [applicationToReject, setApplicationToReject] = useState<Application | null>(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const response = await apiClient.request('/room-sharing/applications');
      if (response.success) {
        setApplications(response.data.applications || []);
      } else {
        toast.error(response.error || 'Failed to fetch applications');
      }
    } catch (error: any) {
      console.error('Error fetching applications:', error);
      toast.error(error.message || 'Failed to fetch applications');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptApplication = async (applicationId: string) => {
    setActionLoading(applicationId);
    try {
      const response = await apiClient.request(`/room-sharing/applications/${applicationId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'accept' })
      });

      if (response.success) {
        toast.success('Application accepted successfully!');
        fetchApplications();
      } else {
        toast.error(response.error || 'Failed to accept application');
      }
    } catch (error: any) {
      console.error('Error accepting application:', error);
      toast.error(error.message || 'Failed to accept application');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectApplication = () => {
    if (!applicationToReject) return;

    setActionLoading(applicationToReject._id);
    apiClient.request(`/room-sharing/applications/${applicationToReject._id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        action: 'reject',
        rejectionReason
      })
    })
      .then((response) => {
        if (response.success) {
          toast.success('Application rejected');
          fetchApplications();
          setShowRejectModal(false);
          setRejectionReason('');
          setApplicationToReject(null);
        } else {
          toast.error(response.error || 'Failed to reject application');
        }
      })
      .catch((error: any) => {
        console.error('Error rejecting application:', error);
        toast.error(error.message || 'Failed to reject application');
      })
      .finally(() => {
        setActionLoading(null);
      });
  };

  const handleCancelApplication = async (applicationId: string) => {
    if (!confirm('Are you sure you want to cancel this application?')) return;

    setActionLoading(applicationId);
    try {
      const response = await apiClient.request(`/room-sharing/applications/${applicationId}`, {
        method: 'DELETE'
      });

      if (response.success) {
        toast.success('Application cancelled successfully');
        fetchApplications();
      } else {
        toast.error(response.error || 'Failed to cancel application');
      }
    } catch (error: any) {
      console.error('Error cancelling application:', error);
      toast.error(error.message || 'Failed to cancel application');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      accepted: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
    };

    const statusIcons: Record<string, React.ReactNode> = {
      pending: <Clock className="h-3 w-3" />,
      accepted: <CheckCircle className="h-3 w-3" />,
      rejected: <XCircle className="h-3 w-3" />,
    };

    return (
      <Badge variant="outline" className={`${statusColors[status]} flex items-center gap-1`}>
        {statusIcons[status]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const filteredApplications = applications.filter(app => {
    if (activeTab === 'sent') return app.type === 'sent';
    if (activeTab === 'received') return app.type === 'received';
    if (activeTab === 'pending') return app.status === 'pending';
    if (activeTab === 'accepted') return app.status === 'accepted';
    if (activeTab === 'rejected') return app.status === 'rejected';
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
    total: applications.length,
    sent: applications.filter(a => a.type === 'sent').length,
    received: applications.filter(a => a.type === 'received').length,
    pending: applications.filter(a => a.status === 'pending').length,
    accepted: applications.filter(a => a.status === 'accepted').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Room Sharing Applications</h1>
          <p className="text-gray-600 mt-1">Manage your room sharing applications</p>
        </div>
        <Button onClick={fetchApplications} variant="outline">
          <Loader2 className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Sent</p>
                <p className="text-2xl font-bold">{stats.sent}</p>
              </div>
              <Send className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Received</p>
                <p className="text-2xl font-bold">{stats.received}</p>
              </div>
              <Inbox className="h-8 w-8 text-purple-400" />
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
                <p className="text-sm text-gray-600">Rejected</p>
                <p className="text-2xl font-bold">{stats.rejected}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Applications List */}
      <Card>
        <CardHeader>
          <CardTitle>Applications</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
              <TabsTrigger value="sent">Sent ({stats.sent})</TabsTrigger>
              <TabsTrigger value="received">Received ({stats.received})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
              <TabsTrigger value="accepted">Accepted ({stats.accepted})</TabsTrigger>
              <TabsTrigger value="rejected">Rejected ({stats.rejected})</TabsTrigger>
            </TabsList>

            <div className="space-y-4">
              {filteredApplications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No applications found</p>
                  <p className="text-sm">Applications will appear here when available</p>
                </div>
              ) : (
                filteredApplications.map((application) => (
                  <Card key={application._id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg">
                              {application.roomSharing.property.title}
                            </h3>
                            {getStatusBadge(application.status)}
                            <Badge variant="outline" className={
                              application.type === 'sent'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-purple-50 text-purple-700 border-purple-200'
                            }>
                              {application.type === 'sent' ? 'Sent' : 'Received'}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="space-y-2 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                <span>{application.roomSharing.property.location}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Bed className="h-4 w-4" />
                                <span>{application.roomSharing.bedsAvailable} of {application.roomSharing.totalBeds} beds available</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <IndianRupee className="h-4 w-4" />
                                <span>₹{application.roomSharing.monthlyRent.toLocaleString()}/month</span>
                              </div>
                            </div>

                            <div className="space-y-2 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>Applied {new Date(application.createdAt).toLocaleDateString()}</span>
                              </div>
                              {application.type === 'received' && (
                                <div>
                                  <strong>Applicant:</strong> {application.counterparty.fullName}
                                  <br />
                                  <span className="text-xs">{application.counterparty.collegeId} • {application.counterparty.course}</span>
                                </div>
                              )}
                              {application.type === 'sent' && (
                                <div>
                                  <strong>Property Owner:</strong> {application.counterparty.fullName}
                                </div>
                              )}
                            </div>
                          </div>

                          {application.message && (
                            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-2 mb-1">
                                <MessageCircle className="h-4 w-4 text-gray-500" />
                                <span className="text-sm font-medium text-gray-700">Message</span>
                              </div>
                              <p className="text-sm text-gray-600">{application.message}</p>
                            </div>
                          )}

                          {application.rejectionReason && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                              <div className="flex items-center gap-2 mb-1">
                                <XCircle className="h-4 w-4 text-red-500" />
                                <span className="text-sm font-medium text-red-700">Rejection Reason</span>
                              </div>
                              <p className="text-sm text-red-600">{application.rejectionReason}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedApplication(application);
                              setShowApplicationModal(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
                          </Button>

                          {application.type === 'received' && application.status === 'pending' && (
                            <div className="flex flex-col gap-1">
                              <Button
                                size="sm"
                                onClick={() => handleAcceptApplication(application._id)}
                                className="bg-green-600 hover:bg-green-700"
                                disabled={actionLoading === application._id}
                              >
                                {actionLoading === application._id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                )}
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  setApplicationToReject(application);
                                  setShowRejectModal(true);
                                }}
                                disabled={actionLoading === application._id}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          )}

                          {application.type === 'sent' && application.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleCancelApplication(application._id)}
                              disabled={actionLoading === application._id}
                            >
                              {actionLoading === application._id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4 mr-1" />
                              )}
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Reject Application</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Reason (Optional)
                </label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Provide a reason for rejection..."
                  rows={4}
                  maxLength={500}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectionReason('');
                    setApplicationToReject(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleRejectApplication}
                  disabled={actionLoading === applicationToReject?._id}
                >
                  {actionLoading === applicationToReject?._id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Reject Application
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}