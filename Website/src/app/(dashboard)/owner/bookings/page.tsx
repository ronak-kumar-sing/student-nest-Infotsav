"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  DollarSign,
  Calendar,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  XCircle,
  Clock,
  Loader2
} from 'lucide-react';
import apiClient from '@/lib/api';
import { toast } from 'sonner';

interface Booking {
  id: string;
  studentName: string;
  propertyTitle: string;
  monthlyRent: number;
  startDate: string;
  endDate: string;
  status: string;
  paymentStatus: string;
  paymentMethod?: string;
  paymentDetails?: {
    paymentMethod?: string;
    transactionId?: string;
    paymentDate?: Date;
    totalPaid?: number;
  };
  studentPhone: string;
  studentEmail: string;
  duration: number;
  bookingDate: string;
  studentId: string;
}

export default function OwnerBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getBookings();

      if (response.success && response.data?.bookings) {
        const bookingsData = response.data.bookings.map((booking: any) => ({
          id: booking._id || booking.id,
          studentName: booking.student?.fullName || booking.student?.name || 'Student',
          propertyTitle: booking.room?.title || booking.propertyTitle || 'Property',
          monthlyRent: booking.monthlyRent || booking.totalAmount || 0,
          startDate: booking.startDate || booking.moveInDate || booking.createdAt,
          endDate: booking.endDate || booking.moveOutDate,
          status: booking.status || 'pending',
          paymentStatus: booking.paymentStatus || 'pending',
          paymentMethod: booking.paymentMethod || 'pending_selection',
          paymentDetails: booking.paymentDetails || null,
          studentPhone: booking.student?.phone || 'N/A',
          studentEmail: booking.student?.email || 'N/A',
          duration: booking.duration || 1,
          bookingDate: booking.createdAt,
          studentId: booking.student?.studentId || 'N/A',
        }));
        setBookings(bookingsData);
      } else {
        toast.error('Failed to load bookings');
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (bookingId: string, newStatus: string) => {
    try {
      const response = await apiClient.updateBookingStatus(bookingId, newStatus);

      if (response.success) {
        toast.success(`Booking ${newStatus} successfully`);
        fetchBookings(); // Refresh the list
      } else {
        toast.error(response.error || 'Failed to update booking');
      }
    } catch (error) {
      console.error('Error updating booking:', error);
      toast.error('Failed to update booking');
    }
  };

  const handlePaymentConfirmation = async (bookingId: string) => {
    try {
      const response = await apiClient.request(`/bookings/${bookingId}/payment`, {
        method: 'PATCH'
      });

      if (response.success) {
        toast.success('Offline payment confirmed successfully', {
          description: 'Booking status updated to confirmed'
        });
        fetchBookings(); // Refresh the list
      } else {
        toast.error(response.error || 'Failed to confirm payment');
      }
    } catch (error: any) {
      console.error('Error confirming payment:', error);
      toast.error(error.message || 'Failed to confirm payment');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      active: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800',
      completed: 'bg-gray-100 text-gray-800',
    };
    return statusColors[status.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  const filterBookings = (status: string) => {
    if (status === 'all') return bookings;
    return bookings.filter(b => b.status.toLowerCase() === status);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
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
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed' || b.status === 'active').length,
    revenue: bookings.reduce((sum, b) => sum + b.monthlyRent, 0),
  };

  return (
    <div className="p-6 space-y-6">
      <div className="border-b pb-6">
        <h1 className="text-3xl font-bold">Bookings Management</h1>
        <p className="text-muted-foreground mt-2">
          View and manage property bookings from students
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Bookings</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Confirmed</p>
                <p className="text-2xl font-bold">{stats.confirmed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">₹{stats.revenue.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bookings List */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Bookings</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 mt-4">
          {filterBookings(activeTab === 'all' ? 'all' : activeTab).length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">No bookings found</p>
              </CardContent>
            </Card>
          ) : (
            filterBookings(activeTab === 'all' ? 'all' : activeTab).map((booking) => (
              <Card key={booking.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{booking.propertyTitle}</h3>
                      <p className="text-sm text-muted-foreground">Booking ID: {booking.id}</p>
                    </div>
                    <Badge className={getStatusBadge(booking.status)}>
                      {booking.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{booking.studentName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{booking.studentEmail}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{booking.studentPhone}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{formatDate(booking.startDate)} - {formatDate(booking.endDate)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span>₹{booking.monthlyRent.toLocaleString()}/month</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Duration: </span>
                        <span className="font-medium">{booking.duration} months</span>
                      </div>
                      {booking.paymentMethod && booking.paymentMethod !== 'pending_selection' && (
                        <div className="flex items-center gap-2">
                          <Badge variant={booking.paymentMethod === 'online' ? 'default' : 'secondary'}>
                            {booking.paymentDetails?.paymentMethod === 'online' ? '💳 Online' : '💰 Offline'}
                          </Badge>
                          <Badge variant={booking.paymentStatus === 'paid' ? 'default' : 'secondary'}>
                            {booking.paymentStatus === 'paid' ? '✓ Paid' : '⏳ ' + booking.paymentStatus}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Show payment confirmation for offline payments */}
                  {booking.paymentDetails?.paymentMethod === 'cash' && booking.paymentStatus === 'pending' && (
                    <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-sm text-orange-800 mb-2 font-medium">
                        ⚠️ Offline Payment Selected
                      </p>
                      <p className="text-sm text-orange-700 mb-3">
                        The student has chosen to pay directly. Please confirm once you receive the payment.
                      </p>
                      <Button
                        size="sm"
                        onClick={() => handlePaymentConfirmation(booking.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Confirm Payment Received
                      </Button>
                    </div>
                  )}

                  {booking.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleStatusUpdate(booking.id, 'confirmed')}
                        className="bg-green-600 hover:bg-green-700"
                        disabled={booking.paymentDetails?.paymentMethod === 'cash' && booking.paymentStatus !== 'paid'}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Confirm Booking
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleStatusUpdate(booking.id, 'cancelled')}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
