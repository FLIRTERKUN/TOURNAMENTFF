import { roomService } from '../services/roomService.js';

/**
 * Resilient selective room credential transmitter
 * Sends ONLY to confirmed participants of lobbyId
 * Never leaks to group chats or other lobby participants!
 */
export async function sendRoomDetailsToLobby(bot, lobbyId, messageText, adminId) {
  if (!bot) throw new Error('Bot instance is required');

  const recipients = await roomService.getConfirmedLobbyRecipients(lobbyId);

  const report = {
    total: recipients.length,
    sent: 0,
    failed: 0,
    blocked: 0,
    failures: []
  };

  for (const player of recipients) {
    try {
      const sentMessage = await bot.api.sendMessage(player.telegram_id, messageText, {
        parse_mode: 'HTML'
      });

      await roomService.recordDelivery({
        lobbyId,
        userId: player.user_id,
        telegramId: player.telegram_id,
        messageType: 'room_credentials',
        messageContent: messageText,
        messageId: sentMessage.message_id,
        status: 'sent'
      });

      report.sent++;
    } catch (err) {
      const isBlocked = err.description?.includes('blocked') || err.error_code === 403;
      const status = isBlocked ? 'blocked' : 'failed';

      await roomService.recordDelivery({
        lobbyId,
        userId: player.user_id,
        telegramId: player.telegram_id,
        messageType: 'room_credentials',
        messageContent: messageText,
        status: status,
        errorMessage: err.message
      });

      if (isBlocked) {
        report.blocked++;
      } else {
        report.failed++;
      }

      report.failures.push({
        telegramId: player.telegram_id,
        playerName: player.player_name,
        error: err.message
      });
    }

    // Small delay to respect Telegram rate limits
    await new Promise(r => setTimeout(r, 40));
  }

  return report;
}
