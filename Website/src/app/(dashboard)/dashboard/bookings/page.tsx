"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import apiClient from '@/lib/api';
import {
  Calendar,
  MapPin,
  Clock,
  DollarSign,
  Eye,
  X,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

interface Booking {
  id: string;
  roomTitle: string;
  roomAddress: string;
  monthlyRent: number;
  moveInDate: string;
  duration: number;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  securityDeposit: number;
  createdAt: string;
  roomId: string;
}

export default function StudentBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getBookings();

      if (response.success) {
        const bookingsData = response.data?.bookings || [];
        const validBookings = bookingsData
          .filter((booking: any) => booking && (booking._id || booking.id))
          .map((booking: any) => ({
            id: booking._id || booking.id,
            roomTitle: booking.room?.title || booking.propertyTitle || 'Property',
            roomAddress: booking.room?.location?.address || booking.room?.address || 'Address not available',
            monthlyRent: booking.financial?.monthlyRent || booking.monthlyRent || 0,
            moveInDate: booking.moveInDate || booking.startDate,
            duration: booking.duration || 1,
            status: booking.status || 'pending',
            paymentStatus: booking.financial?.paymentStatus || booking.paymentStatus || 'pending',
            totalAmount: booking.financial?.totalAmount || booking.totalAmount || 0,
            securityDeposit: booking.financial?.securityDeposit || booking.securityDeposit || 0,
            createdAt: booking.timeline?.createdAt || booking.createdAt,
            roomId: booking.room?._id || booking.roomId || booking.propertyId,
          }));
        setBookings(validBookings);
      } else {
        toast.error(response.error || 'Failed to fetch bookings');
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleViewRoom = (roomId: string) => {
    router.push(`/dashboard/rooms/${roomId}`);
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    try {
      const response = await apiClient.updateBookingStatus(bookingId, 'cancelled');

      if (response.success) {
        await fetchBookings();
        toast.success('Booking cancelled successfully');
      } else {
        toast.error(response.error || 'Failed to cancel booking');
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast.error('Failed to cancel booking');
    }
  };

  const isBookingExpired = (booking: Booking) => {
    const createdAt = new Date(booking.createdAt);
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    return booking.status?.toLowerCase() === 'pending' &&
      booking.paymentStatus !== 'paid' &&
      createdAt < twoDaysAgo;
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
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    active: bookings.filter(b => b.status === 'active').length,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="border-b pb-6">
        <h1 className="text-3xl font-bold">My Bookings</h1>
        <p className="text-muted-foreground mt-2">
          View and manage your property bookings
        </p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground mt-1">Total Bookings</div>
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
              <div className="text-2xl font-bold text-green-600">{stats.confirmed}</div>
              <div className="text-sm text-muted-foreground mt-1">Confirmed</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.active}</div>
              <div className="text-sm text-muted-foreground mt-1">Active</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bookings List */}
      <div className="space-y-4">
        {bookings.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">No bookings yet</p>
              <Button onClick={() => router.push('/dashboard')}>
                Browse Rooms
              </Button>
            </CardContent>
          </Card>
        ) : (
          bookings.map((booking) => (
            <Card key={booking.id}>
              <CardContent className="pt-6">
                {isBookingExpired(booking) && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <p className="text-sm text-red-600">
                      This booking request has expired. Please create a new booking.
                    </p>
                  </div>
                )}

                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{booking.roomTitle}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <MapPin className="h-4 w-4" />
                      <span>{booking.roomAddress}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={getStatusColor(booking.status)}>
                      {booking.status}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      Payment: {booking.paymentStatus}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Move-in Date</p>
                    <p className="font-medium">{formatDate(booking.moveInDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="font-medium">{booking.duration} months</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Monthly Rent</p>
                    <p className="font-medium text-green-600">₹{booking.monthlyRent.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="font-medium">₹{booking.totalAmount.toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewRoom(booking.roomId)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View Room
                  </Button>
                  {booking.status === 'pending' && !isBookingExpired(booking) && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleCancelBooking(booking.id)}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
