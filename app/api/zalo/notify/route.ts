import { NextRequest, NextResponse } from 'next/server';
import { sendZaloBillNotification, isZaloConfigured } from '@/lib/zalo';

export async function POST(request: NextRequest) {
  try {
    // Check if Zalo is configured
    if (!isZaloConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Zalo chua duoc cau hinh. Vui long cau hinh Zalo OA trong settings.' },
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
      userIdTret,
      userIdLau,
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
    if (userIdTret) {
      try {
        const success = await sendZaloBillNotification(userIdTret, {
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
        results.push({ user: 'tret', success });
      } catch (error) {
        console.error('[Zalo API] Error sending to Tret:', error);
        results.push({ user: 'tret', success: false, error: 'Loi gui tin nhan' });
      }
    }

    // Send to Lầu user if configured
    if (userIdLau) {
      try {
        const success = await sendZaloBillNotification(userIdLau, {
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
        results.push({ user: 'lau', success });
      } catch (error) {
        console.error('[Zalo API] Error sending to Lau:', error);
        results.push({ user: 'lau', success: false, error: 'Loi gui tin nhan' });
      }
    }

    const allSuccess = results.every(r => r.success);

    return NextResponse.json({
      success: allSuccess,
      results,
      message: allSuccess
        ? 'Da gui thong bao Zalo thanh cong'
        : 'Mot so thong bao that bai',
    });

  } catch (error) {
    console.error('[Zalo API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Loi xu ly yeu cau' },
      { status: 500 }
    );
  }
}