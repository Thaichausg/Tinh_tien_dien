import { NextRequest, NextResponse } from 'next/server';
import { handleZaloWebhook, verifyZaloWebhook } from '@/lib/zalo';

export async function GET(request: NextRequest) {
  // Handle webhook verification from Zalo
  const searchParams = request.nextUrl.searchParams;
  const challenge = searchParams.get('challenge');
  const verify_token = searchParams.get('verify_token');

  // This is for Zalo webhook verification
  // Zalo will send a GET request with challenge parameter
  // to verify that your webhook URL is valid
  if (challenge) {
    console.log('[Zalo Webhook] Verification challenge received');

    // Return the challenge as per Zalo's requirement
    return NextResponse.text(challenge);
  }

  // If no challenge, return OK
  return NextResponse.json({ status: 'ok' });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-zalo-signature') || '';

    // Verify webhook signature (optional but recommended)
    // Uncomment if you have set up webhook secret in Zalo Dev Console
    // if (!verifyZaloWebhook(signature, body)) {
    //   console.error('[Zalo Webhook] Invalid signature');
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    // }

    const event = JSON.parse(body);

    console.log('[Zalo Webhook] Received event:', event.event_name);

    // Handle the webhook event
    const responseMessage = await handleZaloWebhook(event);

    return NextResponse.text(responseMessage);

  } catch (error) {
    console.error('[Zalo Webhook] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}