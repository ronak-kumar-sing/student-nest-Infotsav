"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  MapPin,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  Loader2,
  UserPlus,
  RefreshCw,
  ExternalLink
} from "lucide-react";
import apiClient from '@/lib/api';
import { toast } from 'sonner';

interface RoomSharingRequest {
  id: string;
  roomTitle: string;
  roomAddress: string;
  propertyId?: string;
  property?: {
    _id: string;
    id: string;
  };
  requestedBy: string;
  requestedByEmail: string;
  requestedByPhone: string;
  preferences: {
    budget?: string;
    lifestyle?: string;
    studyHabits?: string;
  };
  status: string;
  createdAt: string;
  message?: string;
  maxParticipants?: number;
  currentParticipants?: number;
  availableSlots?: number;
}

export default function SharedRoomsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<RoomSharingRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRoomSharingRequests();
  }, []);

  const fetchRoomSharingRequests = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getRoomSharingRequests();

      if (response.success && response.data) {
        // Check if data.requests exists or if we have shares array
        const sharesData = response.data.requests || response.data.shares || response.data || [];

        const requestsData = sharesData.map((share: any) => ({
          id: share._id || share.id,
          roomTitle: share.property?.title || share.room?.title || 'Shared Room',
          roomAddress: share.property?.location?.address || share.room?.location?.address ||
            `${share.property?.location?.city || 'City'}, ${share.property?.location?.state || 'State'}`,
          requestedBy: share.initiator?.fullName || share.initiator?.name || share.student?.fullName || 'Student',
          requestedByEmail: share.initiator?.email || share.student?.email || 'N/A',
          requestedByPhone: share.initiator?.phone || share.student?.phone || 'N/A',
          preferences: {
            budget: share.costSharing?.rentPerPerson ? `₹${share.costSharing.rentPerPerson}/person` : 'Not specified',
            lifestyle: share.requirements?.lifestyle?.join(', ') || 'Not specified',
            studyHabits: share.requirements?.preferences?.join(', ') || 'Not specified'
          },
          status: share.status || 'active',
          createdAt: share.createdAt || share.availableFrom,
          message: share.description || share.message || share.notes,
          maxParticipants: share.maxParticipants || 2,
          currentParticipants: share.currentParticipants?.length || 1,
          availableSlots: (share.maxParticipants || 2) - (share.currentParticipants?.length || 1)
        }));
        setRequests(requestsData);
      } else {
        toast.error('Failed to load room sharing requests');
      }
    } catch (error) {
      console.error('Error fetching room sharing requests:', error);
      toast.error('Failed to load room sharing requests');
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (requestId: string, status: 'accepted' | 'rejected') => {
    try {
      const response = await apiClient.respondToRoomSharingRequest(requestId, status);

      if (response.success) {
        toast.success(`Request ${status} successfully`);
        fetchRoomSharingRequests();
      } else {
        toast.error(response.error || `Failed to ${status} request`);
      }
    } catch (error) {
      console.error('Error responding to request:', error);
      toast.error(`Failed to ${status} request`);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return colors[status.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    accepted: requests.filter(r => r.status === 'accepted').length,
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold">Room Sharing Network</h1>
          <p className="text-muted-foreground mt-2">
            Find verified students to share rooms with
          </p>
        </div>
        <Button onClick={fetchRoomSharingRequests} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground mt-1">Total Requests</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-sm text-muted-foreground mt-1">Pending</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.accepted}</div>
              <div className="text-sm text-muted-foreground mt-1">Accepted</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {requests.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">No room sharing requests yet</p>
              <p className="text-sm text-muted-foreground">
                Create a request to find compatible roommates
              </p>
            </CardContent>
          </Card>
        ) : (
          requests.map((request) => (
            <Card
              key={request.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => router.push(`/dashboard/room-sharing/${request.id}`)}
            >
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{request.roomTitle}</h3>
                      {(request.property?._id || request.property?.id || request.propertyId) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            const roomId = request.property?._id || request.property?.id || request.propertyId;
                            router.push(`/dashboard/rooms/${roomId}`);
                          }}
                          title="View room details"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <MapPin className="h-4 w-4" />
                      <span>{request.roomAddress}</span>
                    </div>
                  </div>
                  <Badge className={getStatusColor(request.status)}>
                    {request.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <UserPlus className="h-4 w-4 text-muted-foreground" />
                      <span>{request.requestedBy}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{request.requestedByEmail}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{request.requestedByPhone}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {request.preferences.budget && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Budget: </span>
                        <span className="font-medium">{request.preferences.budget}</span>
                      </div>
                    )}
                    {request.preferences.lifestyle && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Lifestyle: </span>
                        <span className="font-medium">{request.preferences.lifestyle}</span>
                      </div>
                    )}
                    {request.preferences.studyHabits && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Study Habits: </span>
                        <span className="font-medium">{request.preferences.studyHabits}</span>
                      </div>
                    )}
                    {request.maxParticipants && request.availableSlots !== undefined && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Slots: </span>
                        <span className="font-medium">
                          {request.availableSlots} available of {request.maxParticipants}
                        </span>
                      </div>
                    )}
                    <div className="text-sm">
                      <span className="text-muted-foreground">Posted: </span>
                      <span className="font-medium">{formatDate(request.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {request.message && (
                  <div className="mb-4 p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Message:</p>
                    <p className="text-sm">{request.message}</p>
                  </div>
                )}

                {request.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleResponse(request.id, 'accepted')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleResponse(request.id, 'rejected')}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Decline
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

