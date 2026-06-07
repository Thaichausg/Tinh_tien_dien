/**
 * Zalo OA API Service
 *
 * Dùng để gửi thông báo hóa đơn qua Zalo Official Account
 *
 * Hướng dẫn setup:
 * 1. Đăng ký OA tại https://oa.zalo.me
 * 2. Lấy App ID và Secret Key từ Zalo Dev Console
 * 3. Cấu hình webhook URL để nhận tin nhắn
 * 4. Thêm credentials vào environment variables
 */

const ZALO_APP_ID = process.env.ZALO_APP_ID || '';
const ZALO_APP_SECRET = process.env.ZALO_APP_SECRET || '';
const ZALO_OA_ID = process.env.ZALO_OA_ID || '';
const ZALO_API_BASE = 'https://openapi.zalo.me/v2.0';

// Token cache
let accessToken: string | null = null;
let tokenExpiry: number = 0;

/**
 * Get Access Token từ Zalo API
 */
async function getAccessToken(): Promise<string | null> {
  // Check cache
  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken;
  }

  try {
    const response = await fetch(`${ZALO_API_BASE}/oa/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        app_id: ZALO_APP_ID,
        app_secret: ZALO_APP_SECRET,
        grant_type: 'app_credentials',
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error('[Zalo] Get token error:', data.error);
      return null;
    }

    accessToken = data.access_token;
    // Cache for 50 minutes (token usually expires in 60 minutes)
    tokenExpiry = Date.now() + (50 * 60 * 1000);

    console.log('[Zalo] Access token refreshed');
    return accessToken;

  } catch (error) {
    console.error('[Zalo] Get token failed:', error);
    return null;
  }
}

/**
 * Format bill message cho Zalo
 */
export function formatZaloBillMessage(params: {
  month: string;
  totalAmount: number;
  totalKwh: number;
  kwhTret: number;
  kwhLau: number;
  tretAmount: number;
  lauAmount: number;
  tretAvgPrice: number;
  lauAvgPrice: number;
  lossKwh: number;
}): string {
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
  } = params;

  const formatKwh = (val: number) => val.toFixed(1);
  const formatVND = (val: number) => val.toLocaleString('vi-VN');

  return `⚡ HÓA ĐƠN TIỀN ĐIỆN THÁNG ${month}

━━━━━━━━━━━━━━━━━━

📊 Tổng hóa đơn: ${formatVND(totalAmount)} đ
📈 Tổng kWh: ${formatKwh(totalKwh)} kWh
⚠️ Hao hụt: ${formatKwh(lossKwh)} kWh

━━━━━━━━━━━━━━━━━━

🏠 HỘ TRỆT:
• Số điện: ${formatKwh(kwhTret)} kWh
• Tiền điện: ${formatVND(tretAmount)} đ
• Đơn giá TB: ${formatVND(tretAvgPrice)} đ/kWh

🏢 HỘ LẦU:
• Số điện: ${formatKwh(kwhLau)} kWh
• Tiền điện: ${formatVND(lauAmount)} đ
• Đơn giá TB: ${formatVND(lauAvgPrice)} đ/kWh

━━━━━━━━━━━━━━━━━━

✅ Đối soát: 0 đ (Khớp 100%)

━━━━━━━━━━━━━━━━━━

📱 App chia tiền điện
100F Lê Văn Duyệt`;
}

/**
 * Send text message to Zalo user
 */
export async function sendZaloMessage(userId: string, text: string): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) {
    console.error('[Zalo] No access token');
    return false;
  }

  try {
    const response = await fetch(`${ZALO_API_BASE}/oa/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        recipient: {
          user_id: userId,
        },
        message: {
          text,
        },
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error('[Zalo] Send message error:', data.error);
      return false;
    }

    console.log('[Zalo] Message sent successfully to user:', userId);
    return true;

  } catch (error) {
    console.error('[Zalo] Send message failed:', error);
    return false;
  }
}

/**
 * Send rich message với bill info cho Zalo
 */
export async function sendZaloBillNotification(
  userId: string,
  params: {
    month: string;
    totalAmount: number;
    totalKwh: number;
    kwhTret: number;
    kwhLau: number;
    tretAmount: number;
    lauAmount: number;
    tretAvgPrice: number;
    lauAvgPrice: number;
    lossKwh: number;
  }
): Promise<boolean> {
  const message = formatZaloBillMessage(params);
  return sendZaloMessage(userId, message);
}

/**
 * Gửi file attachment (image/PDF) qua Zalo
 */
export async function sendZaloAttachment(
  userId: string,
  attachmentUrl: string,
  attachmentType: 'image' | 'file' = 'image'
): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) {
    return false;
  }

  try {
    const response = await fetch(`${ZALO_API_BASE}/oa/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        recipient: {
          user_id: userId,
        },
        message: {
          attachment: {
            type: attachmentType,
            payload: {
              url: attachmentUrl,
            },
          },
        },
        action: 'send_oa_message',
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error('[Zalo] Send attachment error:', data.error);
      return false;
    }

    return true;

  } catch (error) {
    console.error('[Zalo] Send attachment failed:', error);
    return false;
  }
}

/**
 * Get user info từ Zalo
 */
export async function getZaloUserInfo(userId: string): Promise<{
  success: boolean;
  data?: {
    user_id: string;
    display_name: string;
    avatar?: string;
    phone?: string;
  };
}> {
  const token = await getAccessToken();
  if (!token) {
    return { success: false };
  }

  try {
    const response = await fetch(
      `${ZALO_API_BASE}/oa/user/${userId}?fields=display_name,avatar,phone`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (data.error) {
      console.error('[Zalo] Get user info error:', data.error);
      return { success: false };
    }

    return {
      success: true,
      data: {
        user_id: data.user_id,
        display_name: data.display_name,
        avatar: data.avatar,
        phone: data.phone,
      },
    };

  } catch (error) {
    console.error('[Zalo] Get user info failed:', error);
    return { success: false };
  }
}

/**
 * Follow OA (Theo dõi Official Account)
 */
export async function followOA(userId: string): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) {
    return false;
  }

  try {
    const response = await fetch(`${ZALO_API_BASE}/oa/user/follow`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        user_id: userId,
      }),
    });

    const data = await response.json();

    return !data.error;

  } catch (error) {
    console.error('[Zalo] Follow OA failed:', error);
    return false;
  }
}

/**
 * Check Zalo API configuration
 */
export function isZaloConfigured(): boolean {
  return Boolean(ZALO_APP_ID && ZALO_APP_SECRET && ZALO_OA_ID);
}

/**
 * Verify webhook signature từ Zalo
 */
export function verifyZaloWebhook(signature: string, body: string): boolean {
  const crypto = require('crypto');

  // Create HMAC SHA256 signature
  const hmac = crypto
    .createHmac('sha256', ZALO_APP_SECRET)
    .update(body)
    .digest('hex');

  return hmac === signature;
}

/**
 * Types cho webhook events
 */
export interface ZaloWebhookEvent {
  event_name: string;
  sender: {
    id: string;
  };
  recipient: {
    id: string;
  };
  message: {
    mid: string;
    text?: string;
    attachments?: Array<{
      type: string;
      payload: {
        url: string;
      };
    }>;
  };
  timestamp: number;
}

/**
 * Handle incoming webhook từ Zalo
 */
export async function handleZaloWebhook(event: ZaloWebhookEvent): Promise<string> {
  const { event_name, sender, message } = event;

  console.log('[Zalo Webhook] Event:', event_name, 'from user:', sender.id);

  switch (event_name) {
    case 'follow':
      // User vừa follow OA
      return 'Cảm ơn bạn đã theo dõi! 🎉\n\nTôi sẽ gửi thông báo hóa đơn tiền điện hàng tháng cho bạn.';

    case 'send_text_message':
      // User gửi tin nhắn
      const text = message.text?.toLowerCase() || '';

      if (text.includes('help') || text.includes('trợ giúp')) {
        return `📖 Hướng dẫn sử dụng:

• Gửi "bill" - Xem thông tin hóa đơn gần nhất
• Gửi "history" - Xem lịch sử hóa đơn
• Gửi "help" - Xem hướng dẫn này

💡 Tôi sẽ tự động thông báo khi có hóa đơn mới!`;
      }

      if (text.includes('bill') || text.includes('hóa đơn')) {
        return `📋 Để xem hóa đơn chi tiết, vui lòng truy cập app:
[App URL]

Hóa đơn sẽ được gửi tự động khi có cập nhật mới.`;
      }

      if (text.includes('history') || text.includes('lịch sử')) {
        return `📂 Lịch sử hóa đơn:
[App URL]

Truy cập app để xem chi tiết các tháng trước.`;
      }

      // Default response
      return `👋 Xin chào! Tôi là bot thông báo tiền điện.

Gửi "help" để xem hướng dẫn sử dụng.`;

    default:
      console.log('[Zalo Webhook] Unknown event:', event_name);
      return 'OK';
  }
}

export default {
  sendZaloMessage,
  sendZaloBillNotification,
  sendZaloAttachment,
  getZaloUserInfo,
  followOA,
  isZaloConfigured,
  verifyZaloWebhook,
  handleZaloWebhook,
  formatZaloBillMessage,
};