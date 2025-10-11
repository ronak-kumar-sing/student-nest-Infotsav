import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../lib/db/connection';
import Transaction from '../../../../lib/models/Transaction';
import { verifyWebhookSignature } from '../../../../lib/utils/razorpay';

// POST: Handle Razorpay webhooks
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Get raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    if (!signature) {
      return NextResponse.json(
        { success: false, error: 'No signature provided' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
    const isValid = verifyWebhookSignature(body, signature, webhookSecret);

    if (!isValid) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { success: false, error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Parse the event
    const event = JSON.parse(body);
    const { event: eventType, payload } = event;

    console.log('Razorpay webhook event:', eventType);

    // Handle different event types
    switch (eventType) {
      case 'payment.authorized':
        await handlePaymentAuthorized(payload.payment.entity);
        break;

      case 'payment.captured':
        await handlePaymentCaptured(payload.payment.entity);
        break;

      case 'payment.failed':
        await handlePaymentFailed(payload.payment.entity);
        break;

      case 'refund.created':
        await handleRefundCreated(payload.refund.entity);
        break;

      case 'refund.processed':
        await handleRefundProcessed(payload.refund.entity);
        break;

      default:
        console.log('Unhandled webhook event:', eventType);
    }

    return NextResponse.json({ success: true, received: true });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Handle payment authorized event
async function handlePaymentAuthorized(payment: any) {
  try {
    await Transaction.findOneAndUpdate(
      { orderId: payment.order_id },
      {
        paymentId: payment.id,
        status: 'authorized',
        method: payment.method,
        updatedAt: new Date(),
      }
    );

    console.log('Payment authorized:', payment.id);
  } catch (error) {
    console.error('Error handling payment authorized:', error);
  }
}

// Handle payment captured event
async function handlePaymentCaptured(payment: any) {
  try {
    await Transaction.findOneAndUpdate(
      { orderId: payment.order_id },
      {
        paymentId: payment.id,
        status: 'captured',
        method: payment.method,
        updatedAt: new Date(),
      }
    );

    console.log('Payment captured:', payment.id);

    // TODO: Update booking status, send confirmation email, etc.
  } catch (error) {
    console.error('Error handling payment captured:', error);
  }
}

// Handle payment failed event
async function handlePaymentFailed(payment: any) {
  try {
    await Transaction.findOneAndUpdate(
      { orderId: payment.order_id },
      {
        paymentId: payment.id,
        status: 'failed',
        method: payment.method,
        errorCode: payment.error_code,
        errorDescription: payment.error_description,
        updatedAt: new Date(),
      }
    );

    console.log('Payment failed:', payment.id);

    // TODO: Send failure notification
  } catch (error) {
    console.error('Error handling payment failed:', error);
  }
}

// Handle refund created event
async function handleRefundCreated(refund: any) {
  try {
    await Transaction.findOneAndUpdate(
      { paymentId: refund.payment_id },
      {
        refundId: refund.id,
        refundAmount: refund.amount,
        refundStatus: 'created',
        updatedAt: new Date(),
      }
    );

    console.log('Refund created:', refund.id);
  } catch (error) {
    console.error('Error handling refund created:', error);
  }
}

// Handle refund processed event
async function handleRefundProcessed(refund: any) {
  try {
    await Transaction.findOneAndUpdate(
      { paymentId: refund.payment_id },
      {
        refundId: refund.id,
        refundAmount: refund.amount,
        refundStatus: 'processed',
        status: 'refunded',
        updatedAt: new Date(),
      }
    );

    console.log('Refund processed:', refund.id);

    // TODO: Send refund confirmation
  } catch (error) {
    console.error('Error handling refund processed:', error);
  }
}
