"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  CreditCard,
  Loader2,
  CheckCircle2,
  Building2,
  Calendar,
  Home,
  Shield,
  Lock,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/api';

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = params.id as string;
  const paymentMethod = searchParams.get('method') || 'online';

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Payment form state
  const [paymentData, setPaymentData] = useState({
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: '',
    upiId: '',
    selectedMethod: 'card' // card, upi, netbanking
  });

  useEffect(() => {
    fetchBooking();
  }, [bookingId]);

  const fetchBooking = async () => {
    try {
      const response = await apiClient.request(`/bookings/${bookingId}`);
      if (response.success) {
        setBooking(response.data);
      } else {
        toast.error('Failed to load booking details');
        router.push('/dashboard/bookings');
      }
    } catch (error) {
      toast.error('Error loading booking');
      router.push('/dashboard/bookings');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    setProcessing(true);

    try {
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Call payment API
      const response = await apiClient.request(`/bookings/${bookingId}/payment`, {
        method: 'POST',
        body: JSON.stringify({
          paymentMethod: 'online',
          paymentDetails: {
            transactionId: `TXN${Date.now()}`,
            method: paymentData.selectedMethod === 'card' ? 'Card' :
              paymentData.selectedMethod === 'upi' ? 'UPI' : 'Net Banking',
            amount: booking.totalAmount
          }
        })
      });

      if (response.success) {
        setPaymentSuccess(true);
        toast.success('Payment successful!', {
          description: 'Your booking has been confirmed automatically.'
        });

        // Redirect after 3 seconds
        setTimeout(() => {
          router.push('/dashboard/bookings');
        }, 3000);
      } else {
        toast.error(response.error || 'Payment failed');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Payment processing failed');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-white">Payment Successful!</h2>
              <p className="text-zinc-400">
                Your booking has been confirmed. You will be redirected shortly.
              </p>
              <Button
                onClick={() => router.push('/dashboard/bookings')}
                className="w-full"
              >
                Go to Bookings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4 text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-white mb-2">Complete Payment</h1>
          <p className="text-zinc-400">Secure payment for your booking</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Payment Form */}
          <div className="lg:col-span-2 space-y-4">
            {/* Payment Method Selection */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Select Payment Method</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <button
                  onClick={() => setPaymentData({ ...paymentData, selectedMethod: 'card' })}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${paymentData.selectedMethod === 'card'
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-zinc-700 hover:border-zinc-600'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-blue-500" />
                    <div className="text-left">
                      <div className="font-medium text-white">Credit/Debit Card</div>
                      <div className="text-sm text-zinc-400">Visa, Mastercard, RuPay</div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setPaymentData({ ...paymentData, selectedMethod: 'upi' })}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${paymentData.selectedMethod === 'upi'
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-zinc-700 hover:border-zinc-600'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-purple-500" />
                    <div className="text-left">
                      <div className="font-medium text-white">UPI</div>
                      <div className="text-sm text-zinc-400">Google Pay, PhonePe, Paytm</div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setPaymentData({ ...paymentData, selectedMethod: 'netbanking' })}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${paymentData.selectedMethod === 'netbanking'
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-zinc-700 hover:border-zinc-600'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-green-500" />
                    <div className="text-left">
                      <div className="font-medium text-white">Net Banking</div>
                      <div className="text-sm text-zinc-400">All major banks supported</div>
                    </div>
                  </div>
                </button>
              </CardContent>
            </Card>

            {/* Payment Details Form */}
            {paymentData.selectedMethod === 'card' && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white">Card Details</CardTitle>
                  <CardDescription>Enter your card information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="cardNumber" className="text-white">Card Number</Label>
                    <Input
                      id="cardNumber"
                      placeholder="1234 5678 9012 3456"
                      value={paymentData.cardNumber}
                      onChange={(e) => setPaymentData({ ...paymentData, cardNumber: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-white"
                      maxLength={19}
                    />
                  </div>

                  <div>
                    <Label htmlFor="cardName" className="text-white">Cardholder Name</Label>
                    <Input
                      id="cardName"
                      placeholder="John Doe"
                      value={paymentData.cardName}
                      onChange={(e) => setPaymentData({ ...paymentData, cardName: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="expiry" className="text-white">Expiry Date</Label>
                      <Input
                        id="expiry"
                        placeholder="MM/YY"
                        value={paymentData.expiryDate}
                        onChange={(e) => setPaymentData({ ...paymentData, expiryDate: e.target.value })}
                        className="bg-zinc-800 border-zinc-700 text-white"
                        maxLength={5}
                      />
                    </div>
                    <div>
                      <Label htmlFor="cvv" className="text-white">CVV</Label>
                      <Input
                        id="cvv"
                        type="password"
                        placeholder="123"
                        value={paymentData.cvv}
                        onChange={(e) => setPaymentData({ ...paymentData, cvv: e.target.value })}
                        className="bg-zinc-800 border-zinc-700 text-white"
                        maxLength={3}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {paymentData.selectedMethod === 'upi' && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white">UPI Details</CardTitle>
                  <CardDescription>Enter your UPI ID</CardDescription>
                </CardHeader>
                <CardContent>
                  <Label htmlFor="upiId" className="text-white">UPI ID</Label>
                  <Input
                    id="upiId"
                    placeholder="yourname@upi"
                    value={paymentData.upiId}
                    onChange={(e) => setPaymentData({ ...paymentData, upiId: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </CardContent>
              </Card>
            )}

            {paymentData.selectedMethod === 'netbanking' && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white">Net Banking</CardTitle>
                  <CardDescription>You will be redirected to your bank</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-zinc-400 text-sm">
                    After clicking "Pay Now", you will be redirected to your bank's secure payment gateway.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Security Notice */}
            <div className="flex items-start gap-3 p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
              <Shield className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <div className="font-medium text-white mb-1">Secure Payment</div>
                <p className="text-sm text-zinc-400">
                  Your payment information is encrypted and secure. We never store your card details.
                </p>
              </div>
            </div>
          </div>

          {/* Booking Summary */}
          <div className="lg:col-span-1">
            <Card className="bg-zinc-900 border-zinc-800 sticky top-6">
              <CardHeader>
                <CardTitle className="text-white">Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Home className="w-4 h-4 text-zinc-400" />
                    <span className="text-sm text-zinc-400">Property</span>
                  </div>
                  <p className="font-medium text-white">{booking?.room?.title || 'Room'}</p>
                </div>

                <Separator className="bg-zinc-800" />

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-zinc-400" />
                    <span className="text-sm text-zinc-400">Move-in Date</span>
                  </div>
                  <p className="font-medium text-white">
                    {booking?.moveInDate ? new Date(booking.moveInDate).toLocaleDateString() : '-'}
                  </p>
                </div>

                <Separator className="bg-zinc-800" />

                <div className="space-y-2">
                  <div className="flex justify-between text-zinc-400">
                    <span>Monthly Rent</span>
                    <span>₹{booking?.monthlyRent?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Security Deposit</span>
                    <span>₹{booking?.securityDeposit?.toLocaleString()}</span>
                  </div>
                  <Separator className="bg-zinc-800" />
                  <div className="flex justify-between text-xl font-bold text-white">
                    <span>Total</span>
                    <span>₹{booking?.totalAmount?.toLocaleString()}</span>
                  </div>
                </div>

                <Button
                  onClick={handlePayment}
                  disabled={processing}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  size="lg"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Pay ₹{booking?.totalAmount?.toLocaleString()}
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-zinc-500">
                  By completing this payment, you agree to our terms and conditions
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
