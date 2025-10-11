'use client';

import { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Loader2, CreditCard, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface RazorpayCheckoutProps {
  amount: number; // Amount in rupees (will be converted to paise)
  bookingId?: string;
  propertyId?: string;
  description?: string;
  onSuccess?: (response: any) => void;
  onFailure?: (error: any) => void;
  buttonText?: string;
  buttonVariant?: 'default' | 'outline' | 'secondary';
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function RazorpayCheckout({
  amount,
  bookingId,
  propertyId,
  description = 'Payment',
  onSuccess,
  onFailure,
  buttonText = 'Pay Now',
  buttonVariant = 'default',
}: RazorpayCheckoutProps) {
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    try {
      setLoading(true);
      setPaymentStatus('processing');

      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay SDK');
      }

      // Create order on backend
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      if (!token) {
        throw new Error('Please login to continue');
      }

      const orderResponse = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount,
          bookingId,
          propertyId,
          description,
        }),
      });

      const orderResult = await orderResponse.json();

      if (!orderResult.success) {
        throw new Error(orderResult.error || 'Failed to create order');
      }

      const { orderId, amount: orderAmount, currency, keyId } = orderResult.data;

      // Get user info from localStorage
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      // Razorpay checkout options
      const options = {
        key: keyId,
        amount: orderAmount,
        currency,
        name: 'StudentNest',
        description,
        order_id: orderId,
        prefill: {
          name: user?.fullName || user?.name || '',
          email: user?.email || '',
          contact: user?.phone || user?.phoneNumber || '',
        },
        theme: {
          color: '#3b82f6',
        },
        handler: async (response: any) => {
          // Payment successful - verify signature
          try {
            const verifyResponse = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              }),
            });

            const verifyResult = await verifyResponse.json();

            if (verifyResult.success) {
              setPaymentStatus('success');
              toast.success('Payment successful!');
              onSuccess?.(verifyResult.data);
            } else {
              throw new Error(verifyResult.error || 'Payment verification failed');
            }
          } catch (error: any) {
            console.error('Payment verification error:', error);
            setPaymentStatus('failed');
            toast.error(error.message || 'Payment verification failed');
            onFailure?.(error);
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            setPaymentStatus('idle');
            toast.info('Payment cancelled');
          },
        },
      };

      // Open Razorpay checkout
      const razorpay = new window.Razorpay(options);
      razorpay.on('payment.failed', (response: any) => {
        console.error('Payment failed:', response.error);
        setPaymentStatus('failed');
        toast.error(response.error.description || 'Payment failed');
        onFailure?.(response.error);
        setLoading(false);
      });

      razorpay.open();
    } catch (error: any) {
      console.error('Payment error:', error);
      setPaymentStatus('failed');
      toast.error(error.message || 'Payment initiation failed');
      onFailure?.(error);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button
        onClick={handlePayment}
        disabled={loading}
        variant={buttonVariant}
        size="lg"
        className="w-full"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-5 w-5" />
            {buttonText} - ₹{amount.toLocaleString('en-IN')}
          </>
        )}
      </Button>

      {paymentStatus === 'success' && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-green-700 dark:text-green-400">
              <CheckCircle className="h-5 w-5" />
              <p className="font-medium">Payment completed successfully!</p>
            </div>
          </CardContent>
        </Card>
      )}

      {paymentStatus === 'failed' && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-700 dark:text-red-400">
              <XCircle className="h-5 w-5" />
              <p className="font-medium">Payment failed. Please try again.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Example usage component
export function CheckoutExample() {
  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Complete Payment</CardTitle>
        <CardDescription>
          Secure payment powered by Razorpay
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RazorpayCheckout
          amount={5000}
          description="Booking Payment"
          onSuccess={(response) => {
            console.log('Payment successful:', response);
            // Redirect to success page or update booking status
          }}
          onFailure={(error) => {
            console.error('Payment failed:', error);
            // Show error message or redirect
          }}
        />
      </CardContent>
    </Card>
  );
}
