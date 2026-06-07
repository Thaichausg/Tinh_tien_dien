import { NextRequest, NextResponse } from 'next/server';
import { handleTelegramUpdate, isTelegramConfigured } from '@/lib/telegram';
import crypto from 'crypto';

// Verify Telegram webhook signature
function verifyTelegramSignature(token: string, body: string, signature: string): boolean {
  const secret = crypto.createHash('sha256').update(token).digest();
  const hash = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return hash === signature;
}

export async function GET(request: NextRequest) {
  // Handle webhook verification
  const searchParams = request.nextUrl.searchParams;
  const challenge = searchParams.get('hub.challenge'); // For Facebook compatibility
  const secret = searchParams.get('secret');

  // Telegram webhook verification
  if (searchParams.get('getMe')) {
    try {
      const { getMe } = await import('@/lib/telegram');
      const botInfo = await getMe();
      return NextResponse.json({
        ok: true,
        bot: {
          id: botInfo.id,
          username: botInfo.username,
          first_name: botInfo.first_name,
        }
      });
    } catch (error) {
      return NextResponse.json({ ok: false, error: 'Bot not configured' }, { status: 400 });
    }
  }

  if (challenge) {
    // Return challenge for verification
    return NextResponse.text(challenge);
  }

  return NextResponse.json({ status: 'ok' });
}

export async function POST(request: NextRequest) {
  try {
    // Verify bot token is configured
    if (!isTelegramConfigured()) {
      console.error('[Telegram Webhook] Bot token not configured');
      return NextResponse.json({ error: 'Bot not configured' }, { status: 400 });
    }

    const body = await request.text();

    // Verify signature if provided
    const signature = request.headers.get('x-telegram-bot-api-secret-token');
    const botToken = process.env.TELEGRAM_BOT_TOKEN || '';

    if (signature && !verifyTelegramSignature(botToken, body, signature)) {
      console.error('[Telegram Webhook] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const update = JSON.parse(body);

    console.log('[Telegram Webhook] Received update:', update.update_id);

    // Handle the update
    const response = await handleTelegramUpdate(update);

    return NextResponse.text(response);

  } catch (error) {
    console.error('[Telegram Webhook] Error processing update:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}