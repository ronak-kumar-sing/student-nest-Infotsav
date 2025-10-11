import Razorpay from 'razorpay';
import crypto from 'crypto';

// Initialize Razorpay instance
export const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

export interface CreateOrderOptions {
  amount: number; // Amount in smallest currency unit (paise for INR)
  currency?: string;
  receipt?: string;
  notes?: Record<string, any>;
}

export interface VerifyPaymentOptions {
  orderId: string;
  paymentId: string;
  signature: string;
}

/**
 * Create a Razorpay order
 */
export async function createRazorpayOrder(options: CreateOrderOptions) {
  try {
    const order = await razorpayInstance.orders.create({
      amount: options.amount,
      currency: options.currency || 'INR',
      receipt: options.receipt || `receipt_${Date.now()}`,
      notes: options.notes || {},
    });

    return {
      success: true,
      data: order,
    };
  } catch (error: any) {
    console.error('Razorpay order creation error:', error);
    return {
      success: false,
      error: error.message || 'Failed to create order',
    };
  }
}

/**
 * Verify Razorpay payment signature
 * This ensures the payment is authentic and not tampered with
 */
export function verifyRazorpaySignature(options: VerifyPaymentOptions): boolean {
  try {
    const { orderId, paymentId, signature } = options;

    // Create the expected signature
    const text = `${orderId}|${paymentId}`;
    const secret = process.env.RAZORPAY_KEY_SECRET || '';
    
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(text)
      .digest('hex');

    // Compare signatures
    return generatedSignature === signature;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Verify Razorpay webhook signature
 */
export function verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    return expectedSignature === signature;
  } catch (error) {
    console.error('Webhook signature verification error:', error);
    return false;
  }
}

/**
 * Fetch payment details from Razorpay
 */
export async function fetchPaymentDetails(paymentId: string) {
  try {
    const payment = await razorpayInstance.payments.fetch(paymentId);
    return {
      success: true,
      data: payment,
    };
  } catch (error: any) {
    console.error('Fetch payment error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch payment details',
    };
  }
}

/**
 * Capture a payment (for authorized payments)
 */
export async function capturePayment(paymentId: string, amount: number, currency: string = 'INR') {
  try {
    const payment = await razorpayInstance.payments.capture(paymentId, amount, currency);
    return {
      success: true,
      data: payment,
    };
  } catch (error: any) {
    console.error('Capture payment error:', error);
    return {
      success: false,
      error: error.message || 'Failed to capture payment',
    };
  }
}

/**
 * Create a refund
 */
export async function createRefund(paymentId: string, amount?: number, notes?: Record<string, any>) {
  try {
    const refundData: any = {
      payment_id: paymentId,
    };

    if (amount) {
      refundData.amount = amount;
    }

    if (notes) {
      refundData.notes = notes;
    }

    const refund = await razorpayInstance.payments.refund(paymentId, refundData);
    return {
      success: true,
      data: refund,
    };
  } catch (error: any) {
    console.error('Create refund error:', error);
    return {
      success: false,
      error: error.message || 'Failed to create refund',
    };
  }
}

/**
 * Fetch refund details
 */
export async function fetchRefund(refundId: string) {
  try {
    const refund = await razorpayInstance.refunds.fetch(refundId);
    return {
      success: true,
      data: refund,
    };
  } catch (error: any) {
    console.error('Fetch refund error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch refund details',
    };
  }
}

/**
 * Convert amount to paise (smallest currency unit)
 */
export function amountToPaise(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Convert paise to rupees
 */
export function paiseToAmount(paise: number): number {
  return paise / 100;
}
