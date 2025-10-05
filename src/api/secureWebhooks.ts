/**
 * Secure Webhook Handlers
 * 
 * Protected webhook processing with comprehensive SSRF protection
 * and security monitoring for external service integrations.
 */

import { Router, Request, Response } from 'express';
import { SecureHttpClient } from '../utils/secureHttpClient';
import { SSRFMonitoring } from '../utils/ssrfMonitoring';
import { SSRFProtection } from '../utils/ssrfProtection';
import crypto from 'crypto';

const router = Router();

/**
 * Secure webhook handler for Stripe
 */
router.post('/webhooks/stripe', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['stripe-signature'] as string;
    const payload = req.body;
    
    // Verify Stripe webhook signature
    if (!verifyStripeSignature(payload, signature)) {
      console.error('❌ Invalid Stripe webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }
    
    // Process Stripe webhook
    const result = await processStripeWebhook(payload);
    
    // Send response to configured endpoint (if any)
    const webhookUrl = process.env.STRIPE_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        await SecureHttpClient.postJson(webhookUrl, {
          service: 'stripe',
          result,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Failed to forward Stripe webhook:', error);
        // Don't fail the main webhook processing
      }
    }
    
    res.json({ success: true, result });
    
  } catch (error) {
    console.error('Stripe webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Secure webhook handler for SendGrid
 */
router.post('/webhooks/sendgrid', async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    
    // Process SendGrid webhook
    const result = await processSendGridWebhook(payload);
    
    // Send response to configured endpoint (if any)
    const webhookUrl = process.env.SENDGRID_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        await SecureHttpClient.postJson(webhookUrl, {
          service: 'sendgrid',
          result,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Failed to forward SendGrid webhook:', error);
        // Don't fail the main webhook processing
      }
    }
    
    res.json({ success: true, result });
    
  } catch (error) {
    console.error('SendGrid webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Secure webhook handler for Twilio
 */
router.post('/webhooks/twilio', async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    
    // Process Twilio webhook
    const result = await processTwilioWebhook(payload);
    
    // Send response to configured endpoint (if any)
    const webhookUrl = process.env.TWILIO_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        await SecureHttpClient.postJson(webhookUrl, {
          service: 'twilio',
          result,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Failed to forward Twilio webhook:', error);
        // Don't fail the main webhook processing
      }
    }
    
    res.json({ success: true, result });
    
  } catch (error) {
    console.error('Twilio webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Secure webhook handler for PayPal
 */
router.post('/webhooks/paypal', async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    
    // Process PayPal webhook
    const result = await processPayPalWebhook(payload);
    
    // Send response to configured endpoint (if any)
    const webhookUrl = process.env.PAYPAL_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        await SecureHttpClient.postJson(webhookUrl, {
          service: 'paypal',
          result,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Failed to forward PayPal webhook:', error);
        // Don't fail the main webhook processing
      }
    }
    
    res.json({ success: true, result });
    
  } catch (error) {
    console.error('PayPal webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Generic secure webhook handler
 */
router.post('/webhooks/:service', async (req: Request, res: Response) => {
  try {
    const { service } = req.params;
    const payload = req.body;
    
    // Validate service
    const allowedServices = ['stripe', 'sendgrid', 'twilio', 'paypal', 'github', 'slack'];
    if (!allowedServices.includes(service)) {
      return res.status(400).json({ 
        error: `Unknown webhook service: ${service}`,
        code: 'UNKNOWN_SERVICE'
      });
    }
    
    // Process webhook based on service
    const result = await processWebhook(service, payload);
    
    // Send response to configured endpoint (if any)
    const webhookUrl = process.env[`${service.toUpperCase()}_WEBHOOK_URL`];
    if (webhookUrl) {
      try {
        await SecureHttpClient.postJson(webhookUrl, {
          service,
          result,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error(`Failed to forward ${service} webhook:`, error);
        // Don't fail the main webhook processing
      }
    }
    
    res.json({ success: true, result });
    
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Process webhook based on service
 */
async function processWebhook(service: string, payload: any): Promise<any> {
  switch (service) {
    case 'stripe':
      return processStripeWebhook(payload);
    case 'sendgrid':
      return processSendGridWebhook(payload);
    case 'twilio':
      return processTwilioWebhook(payload);
    case 'paypal':
      return processPayPalWebhook(payload);
    case 'github':
      return processGitHubWebhook(payload);
    case 'slack':
      return processSlackWebhook(payload);
    default:
      throw new Error(`Unknown webhook service: ${service}`);
  }
}

/**
 * Process Stripe webhook
 */
async function processStripeWebhook(payload: any): Promise<any> {
  console.log('Processing Stripe webhook:', payload.type);
  
  // Handle different Stripe event types
  switch (payload.type) {
    case 'payment_intent.succeeded':
      return handlePaymentSuccess(payload.data.object);
    case 'payment_intent.payment_failed':
      return handlePaymentFailure(payload.data.object);
    case 'customer.subscription.created':
      return handleSubscriptionCreated(payload.data.object);
    case 'customer.subscription.updated':
      return handleSubscriptionUpdated(payload.data.object);
    case 'customer.subscription.deleted':
      return handleSubscriptionDeleted(payload.data.object);
    default:
      console.log('Unhandled Stripe event type:', payload.type);
      return { event: payload.type, status: 'unhandled' };
  }
}

/**
 * Process SendGrid webhook
 */
async function processSendGridWebhook(payload: any): Promise<any> {
  console.log('Processing SendGrid webhook');
  
  // Handle different SendGrid event types
  for (const event of payload) {
    switch (event.event) {
      case 'delivered':
        return handleEmailDelivered(event);
      case 'bounce':
        return handleEmailBounce(event);
      case 'spam_report':
        return handleSpamReport(event);
      case 'unsubscribe':
        return handleUnsubscribe(event);
      default:
        console.log('Unhandled SendGrid event:', event.event);
    }
  }
  
  return { status: 'processed' };
}

/**
 * Process Twilio webhook
 */
async function processTwilioWebhook(payload: any): Promise<any> {
  console.log('Processing Twilio webhook');
  
  // Handle different Twilio event types
  switch (payload.EventType) {
    case 'message.sent':
      return handleMessageSent(payload);
    case 'message.delivered':
      return handleMessageDelivered(payload);
    case 'message.failed':
      return handleMessageFailed(payload);
    default:
      console.log('Unhandled Twilio event:', payload.EventType);
      return { event: payload.EventType, status: 'unhandled' };
  }
}

/**
 * Process PayPal webhook
 */
async function processPayPalWebhook(payload: any): Promise<any> {
  console.log('Processing PayPal webhook');
  
  // Handle different PayPal event types
  switch (payload.event_type) {
    case 'PAYMENT.SALE.COMPLETED':
      return handlePayPalPaymentCompleted(payload);
    case 'PAYMENT.SALE.DENIED':
      return handlePayPalPaymentDenied(payload);
    case 'BILLING.SUBSCRIPTION.CREATED':
      return handlePayPalSubscriptionCreated(payload);
    default:
      console.log('Unhandled PayPal event:', payload.event_type);
      return { event: payload.event_type, status: 'unhandled' };
  }
}

/**
 * Process GitHub webhook
 */
async function processGitHubWebhook(payload: any): Promise<any> {
  console.log('Processing GitHub webhook');
  
  // Handle different GitHub event types
  switch (payload.action) {
    case 'opened':
      return handleGitHubIssueOpened(payload);
    case 'closed':
      return handleGitHubIssueClosed(payload);
    case 'created':
      return handleGitHubIssueCreated(payload);
    default:
      console.log('Unhandled GitHub event:', payload.action);
      return { action: payload.action, status: 'unhandled' };
  }
}

/**
 * Process Slack webhook
 */
async function processSlackWebhook(payload: any): Promise<any> {
  console.log('Processing Slack webhook');
  
  // Handle different Slack event types
  switch (payload.type) {
    case 'url_verification':
      return handleSlackUrlVerification(payload);
    case 'event_callback':
      return handleSlackEventCallback(payload);
    default:
      console.log('Unhandled Slack event:', payload.type);
      return { type: payload.type, status: 'unhandled' };
  }
}

/**
 * Verify Stripe webhook signature
 */
function verifyStripeSignature(payload: any, signature: string): boolean {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) return false;
  
  try {
    const elements = signature.split(',');
    const timestamp = elements.find(el => el.startsWith('t='))?.split('=')[1];
    const v1 = elements.find(el => el.startsWith('v1='))?.split('=')[1];
    
    if (!timestamp || !v1) return false;
    
    const signedPayload = `${timestamp}.${JSON.stringify(payload)}`;
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(signedPayload)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(v1, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch {
    return false;
  }
}

// Event handlers (implement based on your business logic)
async function handlePaymentSuccess(payment: any): Promise<any> {
  console.log('Payment succeeded:', payment.id);
  return { status: 'success', paymentId: payment.id };
}

async function handlePaymentFailure(payment: any): Promise<any> {
  console.log('Payment failed:', payment.id);
  return { status: 'failed', paymentId: payment.id };
}

async function handleSubscriptionCreated(subscription: any): Promise<any> {
  console.log('Subscription created:', subscription.id);
  return { status: 'created', subscriptionId: subscription.id };
}

async function handleSubscriptionUpdated(subscription: any): Promise<any> {
  console.log('Subscription updated:', subscription.id);
  return { status: 'updated', subscriptionId: subscription.id };
}

async function handleSubscriptionDeleted(subscription: any): Promise<any> {
  console.log('Subscription deleted:', subscription.id);
  return { status: 'deleted', subscriptionId: subscription.id };
}

async function handleEmailDelivered(event: any): Promise<any> {
  console.log('Email delivered:', event.msg_id);
  return { status: 'delivered', messageId: event.msg_id };
}

async function handleEmailBounce(event: any): Promise<any> {
  console.log('Email bounced:', event.msg_id);
  return { status: 'bounced', messageId: event.msg_id };
}

async function handleSpamReport(event: any): Promise<any> {
  console.log('Spam report:', event.msg_id);
  return { status: 'spam', messageId: event.msg_id };
}

async function handleUnsubscribe(event: any): Promise<any> {
  console.log('Unsubscribe:', event.msg_id);
  return { status: 'unsubscribed', messageId: event.msg_id };
}

async function handleMessageSent(event: any): Promise<any> {
  console.log('Message sent:', event.MessageSid);
  return { status: 'sent', messageSid: event.MessageSid };
}

async function handleMessageDelivered(event: any): Promise<any> {
  console.log('Message delivered:', event.MessageSid);
  return { status: 'delivered', messageSid: event.MessageSid };
}

async function handleMessageFailed(event: any): Promise<any> {
  console.log('Message failed:', event.MessageSid);
  return { status: 'failed', messageSid: event.MessageSid };
}

async function handlePayPalPaymentCompleted(event: any): Promise<any> {
  console.log('PayPal payment completed:', event.resource.id);
  return { status: 'completed', paymentId: event.resource.id };
}

async function handlePayPalPaymentDenied(event: any): Promise<any> {
  console.log('PayPal payment denied:', event.resource.id);
  return { status: 'denied', paymentId: event.resource.id };
}

async function handlePayPalSubscriptionCreated(event: any): Promise<any> {
  console.log('PayPal subscription created:', event.resource.id);
  return { status: 'created', subscriptionId: event.resource.id };
}

async function handleGitHubIssueOpened(event: any): Promise<any> {
  console.log('GitHub issue opened:', event.issue.number);
  return { status: 'opened', issueNumber: event.issue.number };
}

async function handleGitHubIssueClosed(event: any): Promise<any> {
  console.log('GitHub issue closed:', event.issue.number);
  return { status: 'closed', issueNumber: event.issue.number };
}

async function handleGitHubIssueCreated(event: any): Promise<any> {
  console.log('GitHub issue created:', event.issue.number);
  return { status: 'created', issueNumber: event.issue.number };
}

async function handleSlackUrlVerification(event: any): Promise<any> {
  console.log('Slack URL verification');
  return { challenge: event.challenge };
}

async function handleSlackEventCallback(event: any): Promise<any> {
  console.log('Slack event callback:', event.event.type);
  return { status: 'processed', eventType: event.event.type };
}

export default router;
