import { NextRequest, NextResponse } from 'next/server';
import { sendBillMessage, isTelegramConfigured } from '@/lib/telegram';

export async function POST(request: NextRequest) {
  try {
    // Check if Telegram is configured
    if (!isTelegramConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Telegram bot chua duoc cau hinh. Vui long cau hinh TELEGRAM_BOT_TOKEN.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      month,
      totalAmount,
      totalKwh,
      kwhTret,
      kwhLau,
      tretAmount,
      lauAmount,
      tretAvgPrice,
      lauAvgPrice,
      lossKwh,
      chatIdTret,
      chatIdLau,
    } = body;

    // Validate required fields
    if (!month || !totalAmount || !kwhTret || !kwhLau) {
      return NextResponse.json(
        { success: false, error: 'Thieu thong tin bat buoc' },
        { status: 400 }
      );
    }

    const results = [];

    // Send to Trệt user if configured
    if (chatIdTret) {
      try {
        const message = await sendBillMessage(Number(chatIdTret), {
          month,
          totalAmount,
          totalKwh,
          kwhTret,
          kwhLau,
          tretAmount: tretAmount || 0,
          lauAmount: lauAmount || 0,
          tretAvgPrice: tretAvgPrice || 0,
          lauAvgPrice: lauAvgPrice || 0,
          lossKwh: lossKwh || 0,
        });
        results.push({ user: 'tret', success: true, messageId: message.message_id });
      } catch (error) {
        console.error('[Telegram API] Error sending to Tret:', error);
        results.push({ user: 'tret', success: false, error: 'Loi gui tin nhan' });
      }
    }

    // Send to Lầu user if configured
    if (chatIdLau) {
      try {
        const message = await sendBillMessage(Number(chatIdLau), {
          month,
          totalAmount,
          totalKwh,
          kwhTret,
          kwhLau,
          tretAmount: tretAmount || 0,
          lauAmount: lauAmount || 0,
          tretAvgPrice: tretAvgPrice || 0,
          lauAvgPrice: lauAvgPrice || 0,
          lossKwh: lossKwh || 0,
        });
        results.push({ user: 'lau', success: true, messageId: message.message_id });
      } catch (error) {
        console.error('[Telegram API] Error sending to Lau:', error);
        results.push({ user: 'lau', success: false, error: 'Loi gui tin nhan' });
      }
    }

    const allSuccess = results.every(r => r.success);

    return NextResponse.json({
      success: allSuccess,
      results,
      message: allSuccess
        ? 'Da gui thong bao Telegram thanh cong'
        : 'Mot so thong bao that bai',
    });

  } catch (error) {
    console.error('[Telegram API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Loi xu ly yeu cau' },
      { status: 500 }
    );
  }
}