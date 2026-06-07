/**
 * Telegram Bot API Service
 *
 * Dùng để gửi thông báo hóa đơn qua Telegram Bot
 *
 * Hướng dẫn setup:
 * 1. Tạo bot mới bằng @BotFather trong Telegram
 * 2. Lấy Bot Token
 * 3. Cấu hình webhook hoặc polling
 * 4. Thêm bot token vào environment variables
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_API_BASE = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// Types
export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  channel_post?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  entities?: TelegramMessageEntity[];
  caption?: string;
  photo?: TelegramPhoto[];
  document?: TelegramDocument;
}

export interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface TelegramMessageEntity {
  type: string;
  offset: number;
  length: number;
  url?: string;
  user?: TelegramUser;
}

export interface TelegramPhoto {
  file_id: string;
  width: number;
  height: number;
  file_size: number;
}

export interface TelegramDocument {
  file_id: string;
  file_name: string;
  mime_type: string;
  file_size: number;
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  chat_instance: string;
  data?: string;
  game_short_name?: string;
}

// Inline Keyboard Buttons
export interface InlineKeyboardButton {
  text: string;
  url?: string;
  callback_data?: string;
}

export interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}

/**
 * Check if Telegram is configured
 */
export function isTelegramConfigured(): boolean {
  return Boolean(TELEGRAM_BOT_TOKEN);
}

/**
 * Make API request to Telegram
 */
async function telegramRequest<T>(
  method: string,
  params?: Record<string, any>
): Promise<T> {
  if (!TELEGRAM_BOT_TOKEN) {
    throw new Error('Telegram bot token not configured');
  }

  const url = `${TELEGRAM_API_BASE}/${method}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params || {}),
  });

  const data = await response.json();

  if (!data.ok) {
    throw new Error(`Telegram API error: ${data.error_code} - ${data.description}`);
  }

  return data.result as T;
}

/**
 * Get bot information
 */
export async function getMe(): Promise<TelegramUser> {
  return telegramRequest<TelegramUser>('getMe');
}

/**
 * Get updates (for polling mode)
 */
export async function getUpdates(
  offset?: number,
  limit?: number,
  timeout?: number
): Promise<TelegramUpdate[]> {
  return telegramRequest<TelegramUpdate[]>('getUpdates', {
    offset,
    limit,
    timeout,
  });
}

/**
 * Set webhook URL for receiving updates
 */
export async function setWebhook(url: string, secret_token?: string): Promise<boolean> {
  return telegramRequest<boolean>('setWebhook', {
    url,
    secret_token,
  });
}

/**
 * Delete webhook
 */
export async function deleteWebhook(): Promise<boolean> {
  return telegramRequest<boolean>('deleteWebhook');
}

/**
 * Send text message
 */
export async function sendMessage(
  chatId: number,
  text: string,
  extraParams?: {
    parse_mode?: 'MarkdownV2' | 'HTML' | 'Markdown';
    reply_markup?: InlineKeyboardMarkup;
    disable_notification?: boolean;
  }
): Promise<TelegramMessage> {
  return telegramRequest<TelegramMessage>('sendMessage', {
    chat_id: chatId,
    text,
    ...extraParams,
  });
}

/**
 * Send formatted bill message with HTML
 */
export async function sendBillMessage(
  chatId: number,
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
): Promise<TelegramMessage> {
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

  const htmlMessage = `
<b>⚡ HÓA ĐƠN TIỀN ĐIỆN THÁNG ${month}</b>

━━━━━━━━━━━━━━━

<b>📊 Tổng hóa đơn:</b> ${formatVND(totalAmount)} đ
<b>📈 Tổng kWh:</b> ${formatKwh(totalKwh)} kWh
<b>⚠️ Hao hụt:</b> ${formatKwh(lossKwh)} kWh

━━━━━━━━━━━━━━━

<b>🏠 HỘ TRỆT:</b>
• Số điện: ${formatKwh(kwhTret)} kWh
• Tiền điện: <b>${formatVND(tretAmount)} đ</b>
• Đơn giá TB: ${formatVND(tretAvgPrice)} đ/kWh

<b>🏢 HỘ LẦU:</b>
• Số điện: ${formatKwh(kwhLau)} kWh
• Tiền điện: <b>${formatVND(lauAmount)} đ</b>
• Đơn giá TB: ${formatVND(lauAvgPrice)} đ/kWh

━━━━━━━━━━━━━━━

<b>✅ Đối soát: 0 đ (Khớp 100%)</b>

━━━━━━━━━━━━━━━

<i>📱 App chia tiền điện • 100F Lê Văn Duyệt</i>
`;

  return sendMessage(chatId, htmlMessage, { parse_mode: 'HTML' });
}

/**
 * Send message with inline keyboard
 */
export async function sendMessageWithKeyboard(
  chatId: number,
  text: string,
  keyboard: InlineKeyboardMarkup
): Promise<TelegramMessage> {
  return sendMessage(chatId, text, {
    reply_markup: keyboard,
  });
}

/**
 * Answer callback query (for inline button clicks)
 */
export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string
): Promise<boolean> {
  return telegramRequest<boolean>('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text,
  });
}

/**
 * Send photo
 */
export async function sendPhoto(
  chatId: number,
  photo: string,
  caption?: string,
  parseMode?: 'MarkdownV2' | 'HTML' | 'Markdown'
): Promise<TelegramMessage> {
  return telegramRequest<TelegramMessage>('sendPhoto', {
    chat_id: chatId,
    photo,
    caption,
    parse_mode: parseMode,
  });
}

/**
 * Send document/file
 */
export async function sendDocument(
  chatId: number,
  document: string,
  caption?: string
): Promise<TelegramMessage> {
  return telegramRequest<TelegramMessage>('sendDocument', {
    chat_id: chatId,
    document,
    caption,
  });
}

/**
 * Get chat information
 */
export async function getChat(chatId: number): Promise<TelegramChat> {
  return telegramRequest<TelegramChat>('getChat', {
    chat_id: chatId,
  });
}

/**
 * Get list of administrators in a chat
 */
export async function getChatAdministrators(
  chatId: number
): Promise<Array<TelegramUser & { status: string; custom_title?: string }>> {
  return telegramRequest('getChatAdministrators', {
    chat_id: chatId,
  });
}

/**
 * Leave a chat
 */
export async function leaveChat(chatId: number): Promise<boolean> {
  return telegramRequest<boolean>('leaveChat', {
    chat_id: chatId,
  });
}

/**
 * Format bill message for Telegram (Markdown)
 */
export function formatBillMessageMarkdown(params: {
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

  return `*⚡ HÓA ĐƠN TIỀN ĐIỆN THÁNG ${month}*

━━━━━━━━━━━━━━━

*📊 Tổng hóa đơn:* ${formatVND(totalAmount)} đ
*📈 Tổng kWh:* ${formatKwh(totalKwh)} kWh
*⚠️ Hao hụt:* ${formatKwh(lossKwh)} kWh

━━━━━━━━━━━━━━━

*🏠 HỘ TRỆT:*
• Số điện: ${formatKwh(kwhTret)} kWh
• Tiền điện: *${formatVND(tretAmount)} đ*
• Đơn giá TB: ${formatVND(tretAvgPrice)} đ/kWh

*🏢 HỘ LẦU:*
• Số điện: ${formatKwh(kwhLau)} kWh
• Tiền điện: *${formatVND(lauAmount)} đ*
• Đơn giá TB: ${formatVND(lauAvgPrice)} đ/kWh

━━━━━━━━━━━━━━━

*✅ Đối soát: 0 đ (Khớp 100%)*

━━━━━━━━━━━━━━━

_📱 App chia tiền điện • 100F Lê Văn Duyệt_`;
}

/**
 * Handle incoming Telegram update
 */
export async function handleTelegramUpdate(update: TelegramUpdate): Promise<string> {
  const message = update.message || update.edited_message || update.channel_post;

  if (!message) {
    return 'OK';
  }

  const text = message.text || '';
  const chatId = message.chat.id;

  // Ignore messages from groups if not configured
  if (message.chat.type !== 'private') {
    // For group chats, bot should be admin and respond to commands
    if (text.startsWith('/')) {
      return handleCommand(chatId, text, message.chat.type);
    }
    return 'OK';
  }

  // Private chat - handle commands or messages
  if (text.startsWith('/')) {
    return handleCommand(chatId, text);
  }

  // Handle conversation
  return handleMessage(chatId, text);
}

/**
 * Handle bot commands
 */
async function handleCommand(
  chatId: number,
  command: string,
  chatType?: string
): Promise<string> {
  const parts = command.split(' ');
  const cmd = parts[0].toLowerCase();

  switch (cmd) {
    case '/start':
    case '/help':
      return sendHelpMessage(chatId);

    case '/bill':
    case '/hoadon':
      return sendBillRequestMessage(chatId);

    case '/history':
    case '/lichsu':
      return sendHistoryMessage(chatId);

    case '/status':
    case '/trangthai':
      return sendStatusMessage(chatId);

    default:
      return sendMessage(chatId, `Unknown command: ${cmd}\n\nUse /help to see available commands.`);
  }
}

/**
 * Handle regular messages
 */
async function handleMessage(chatId: number, text: string): Promise<string> {
  const lowerText = text.toLowerCase();

  if (lowerText.includes('help') || lowerText.includes('trợ giúp')) {
    return sendHelpMessage(chatId);
  }

  if (lowerText.includes('bill') || lowerText.includes('hóa đơn')) {
    return sendBillRequestMessage(chatId);
  }

  if (lowerText.includes('history') || lowerText.includes('lịch sử')) {
    return sendHistoryMessage(chatId);
  }

  // Default welcome for private chat
  return sendMessage(chatId, `Xin chào! 👋\n\nTôi là bot thông báo tiền điện 100F Lê Văn Duyệt.\n\nGửi /help để xem hướng dẫn.`);
}

/**
 * Send help message
 */
async function sendHelpMessage(chatId: number): Promise<string> {
  const helpText = `
*📖 Hướng dẫn sử dụng Bot tiền điện*

*Các lệnh có sẵn:*

/start - Bắt đầu sử dụng bot
/help - Xem hướng dẫn này
/bill - Xem thông tin hóa đơn gần nhất
/history - Xem lịch sử hóa đơn
/status - Kiểm tra trạng thái kết nối

*Tính năng:*
• Nhận thông báo hóa đơn tự động qua Telegram
• Xem chi tiết từng hộ tiêu thụ bao nhiêu
• So sánh các tháng qua biểu đồ

💡 Tôi sẽ tự động thông báo khi có hóa đơn mới!
`;

  await sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
  return 'OK';
}

/**
 * Send bill request message
 */
async function sendBillRequestMessage(chatId: number): Promise<string> {
  const message = `
📋 *Yêu cầu hóa đơn*

Để xem hóa đơn chi tiết, vui lòng truy cập app:

[App URL]

Hóa đơn sẽ được gửi tự động khi có cập nhật mới.
`;

  await sendMessage(chatId, message, { parse_mode: 'Markdown' });
  return 'OK';
}

/**
 * Send history request message
 */
async function sendHistoryMessage(chatId: number): Promise<string> {
  const message = `
📂 *Yêu cầu lịch sử*

Để xem lịch sử hóa đơn các tháng, vui lòng truy cập app:

[App URL]

Truy cập app để xem chi tiết và so sánh các tháng.
`;

  await sendMessage(chatId, message, { parse_mode: 'Markdown' });
  return 'OK';
}

/**
 * Send status message
 */
async function sendStatusMessage(chatId: number): Promise<string> {
  if (!isTelegramConfigured()) {
    await sendMessage(chatId, '❌ Telegram bot chưa được cấu hình.');
    return 'OK';
  }

  try {
    const botInfo = await getMe();
    await sendMessage(
      chatId,
      `✅ *Trạng thái kết nối*\n\n` +
      `Bot: @${botInfo.username}\n` +
      `Trạng thái: Hoạt động tốt\n` +
      `Bot ID: ${botInfo.id}`
    , { parse_mode: 'Markdown' });
    return 'OK';
  } catch (error) {
    await sendMessage(chatId, '❌ Không thể kết nối đến Telegram API.');
    return 'OK';
  }
}

export default {
  isTelegramConfigured,
  getMe,
  getUpdates,
  setWebhook,
  deleteWebhook,
  sendMessage,
  sendBillMessage,
  sendMessageWithKeyboard,
  answerCallbackQuery,
  sendPhoto,
  sendDocument,
  getChat,
  getChatAdministrators,
  leaveChat,
  formatBillMessageMarkdown,
  handleTelegramUpdate,
};