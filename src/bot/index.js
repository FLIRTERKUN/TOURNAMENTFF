import { Bot } from 'grammy';
import { config } from '../config/index.js';
import { userService } from '../services/userService.js';
import { lobbyService } from '../services/lobbyService.js';
import { registrationService } from '../services/registrationService.js';
import { paymentService } from '../services/paymentService.js';
import { roomService } from '../services/roomService.js';
import { sendRoomDetailsToLobby } from '../services/notificationService.js';
import {
  getMainMenuKeyboard,
  getLobbiesListKeyboard,
  getLobbyDetailKeyboard,
  getAdminPanelKeyboard,
  getPaymentApprovalKeyboard
} from './keyboards/index.js';

let botInstance = null;

// Temporary user conversation state store for multi-step prompts in bot
// (In production serverless, fallback state or WebApp UI handles this smoothly)
const userStates = new Map();

export function getBot() {
  return botInstance;
}

export function initBot() {
  if (!config.botToken) {
    console.warn('BOT_TOKEN is not configured. Telegram bot features running in passive mode.');
    return null;
  }

  if (botInstance) return botInstance;

  const bot = new Bot(config.botToken);
  botInstance = bot;

  // 1. /start command
  bot.command('start', async ctx => {
    try {
      const from = ctx.from;
      if (!from) return;

      // Compulsory Bot Start Recording in Supabase
      const user = await userService.recordBotStart(from);
      const adminRole = await userService.getAdminRole(from.id);
      const isAdmin = !!adminRole;

      const welcomeText =
        `🔥 <b>WELCOME TO FREE FIRE ESPORTS TOURNAMENTS</b> 🔥\n\n` +
        `Hello <b>${from.first_name}</b>!\n` +
        `Ready to drop into Bermuda and dominate the lobby?\n\n` +
        `✅ <b>Account Status:</b> Verified & Registered\n` +
        `🆔 <b>Telegram ID:</b> <code>${from.id}</code>\n` +
        `${user?.free_fire_uid ? `🎮 <b>Free Fire UID:</b> <code>${user.free_fire_uid}</code>\n` : `⚠️ <i>Free Fire UID not linked yet.</i>\n`}\n` +
        `Choose an option below to browse lobbies or open the high-speed Mini App:`;

      await ctx.reply(welcomeText, {
        parse_mode: 'HTML',
        reply_markup: getMainMenuKeyboard(isAdmin)
      });
    } catch (err) {
      console.error('Error handling /start:', err);
      await ctx.reply('⚠️ An error occurred while initializing. Please try again later.');
    }
  });

  // 2. /lobbies command
  bot.command('lobbies', async ctx => {
    try {
      const lobbies = await lobbyService.getLobbies();
      const text = `🏆 <b>AVAILABLE TOURNAMENT LOBBIES</b>\n\nSelect any lobby to view prize pool, entry fee, schedule and slot availability:`;
      await ctx.reply(text, {
        parse_mode: 'HTML',
        reply_markup: getLobbiesListKeyboard(lobbies)
      });
    } catch (err) {
      await ctx.reply(`⚠️ Could not fetch lobbies: ${err.message}`);
    }
  });

  // 3. /admin command
  bot.command('admin', async ctx => {
    try {
      const role = await userService.getAdminRole(ctx.from.id);
      if (!role) {
        return ctx.reply('🚫 <b>Access Denied:</b> You do not have administrator permissions.', { parse_mode: 'HTML' });
      }

      await ctx.reply(
        `⚡ <b>TOURNAMENT ADMIN PANEL</b> ⚡\n\n` +
        `Role: <b>${role.toUpperCase()}</b>\n\n` +
        `Manage lobbies, verify UPI payments, send room credentials, and broadcast match notifications.\n\n` +
        `<i>Tip: You can also use the neat and clean Web Admin Dashboard inside the Mini App!</i>`,
        {
          parse_mode: 'HTML',
          reply_markup: getAdminPanelKeyboard()
        }
      );
    } catch (err) {
      await ctx.reply(`⚠️ Error: ${err.message}`);
    }
  });

  // 4. /senddetails command
  bot.command('senddetails', async ctx => {
    try {
      const role = await userService.getAdminRole(ctx.from.id);
      if (!role) {
        return ctx.reply('🚫 Unauthorized.');
      }

      const lobbies = await lobbyService.getLobbies({ status: ['open', 'upcoming', 'live'] });
      if (!lobbies || lobbies.length === 0) {
        return ctx.reply('ℹ️ No active lobbies found to send room details.');
      }

      const keyboard = getLobbiesListKeyboard(lobbies);
      await ctx.reply(
        `🔑 <b>SELECT LOBBY FOR ROOM CREDENTIALS</b>\n\n` +
        `⚠️ <b>PRIVACY NOTICE:</b> Room credentials will ONLY be delivered privately to confirmed participants of the selected lobby.\n\n` +
        `Select the target lobby:`,
        {
          parse_mode: 'HTML',
          reply_markup: keyboard
        }
      );
    } catch (err) {
      await ctx.reply(`Error: ${err.message}`);
    }
  });

  // 5. /payments command
  bot.command('payments', async ctx => {
    try {
      const role = await userService.getAdminRole(ctx.from.id);
      if (!role) return ctx.reply('🚫 Unauthorized.');

      const pending = await paymentService.getPendingPayments();
      if (!pending || pending.length === 0) {
        return ctx.reply('✅ No pending payments for review.');
      }

      for (const p of pending.slice(0, 5)) {
        const text =
          `💳 <b>PENDING PAYMENT REVIEW</b>\n\n` +
          `Lobby: <b>${p.lobbies?.name || 'Tournament'}</b>\n` +
          `Amount: <b>₹${p.amount}</b>\n` +
          `Player: <b>${p.registrations?.player_name}</b>\n` +
          `FF UID: <code>${p.registrations?.free_fire_uid}</code>\n` +
          `Txn Ref / UTR: <code>${p.transaction_reference}</code>\n` +
          `User TG ID: <code>${p.telegram_id}</code>`;

        if (p.screenshot_file_id) {
          await ctx.replyWithPhoto(p.screenshot_file_id, {
            caption: text,
            parse_mode: 'HTML',
            reply_markup: getPaymentApprovalKeyboard(p.id)
          });
        } else {
          await ctx.reply(text, {
            parse_mode: 'HTML',
            reply_markup: getPaymentApprovalKeyboard(p.id)
          });
        }
      }
    } catch (err) {
      await ctx.reply(`Error: ${err.message}`);
    }
  });

  // Inline callback queries router
  bot.on('callback_query:data', async ctx => {
    const data = ctx.callbackQuery.data;
    const fromId = ctx.from.id;

    try {
      if (data === 'action_main_menu') {
        const adminRole = await userService.getAdminRole(fromId);
        await ctx.editMessageText('🎮 <b>MAIN MENU</b>\n\nSelect an option below:', {
          parse_mode: 'HTML',
          reply_markup: getMainMenuKeyboard(!!adminRole)
        });
      } else if (data === 'action_browse_lobbies') {
        const lobbies = await lobbyService.getLobbies();
        await ctx.editMessageText('🏆 <b>AVAILABLE TOURNAMENT LOBBIES</b>\n\nClick a lobby to view details & join:', {
          parse_mode: 'HTML',
          reply_markup: getLobbiesListKeyboard(lobbies)
        });
      } else if (data.startsWith('view_lobby_')) {
        const lobbyId = data.replace('view_lobby_', '');
        const lobby = await lobbyService.getLobbyById(lobbyId);
        if (!lobby) {
          return ctx.answerCallbackQuery({ text: 'Lobby not found!' });
        }

        const feeText = Number(lobby.entry_fee) === 0 ? 'FREE' : `₹${lobby.entry_fee}`;
        const adminRole = await userService.getAdminRole(fromId);

        // Check if user is registered
        const participants = await registrationService.getParticipants(lobbyId);
        const isRegistered = participants.some(p => Number(p.telegram_id) === Number(fromId));

        const text =
          `🔥 <b>${lobby.name.toUpperCase()}</b> 🔥\n\n` +
          `💰 <b>Entry Fee:</b> ${feeText}\n` +
          `👥 <b>Slots Filled:</b> ${lobby.current_participants}/${lobby.capacity}\n` +
          `🕒 <b>Match Start:</b> ${new Date(lobby.start_time).toLocaleString()}\n` +
          `⏳ <b>Deadline:</b> ${new Date(lobby.registration_deadline).toLocaleString()}\n` +
          `📊 <b>Status:</b> ${lobby.status.toUpperCase()}\n\n` +
          `📝 <b>Rules:</b>\n${lobby.rules || 'Standard Free Fire Esports rules apply.'}\n\n` +
          `${isRegistered ? '✅ <b>You are registered in this lobby!</b>' : ''}`;

        await ctx.editMessageText(text, {
          parse_mode: 'HTML',
          reply_markup: getLobbyDetailKeyboard(lobby, isRegistered, !!adminRole)
        });
      } else if (data.startsWith('pay_approve_')) {
        const paymentId = data.replace('pay_approve_', '');
        const adminRole = await userService.getAdminRole(fromId);
        if (!adminRole) {
          return ctx.answerCallbackQuery({ text: 'Unauthorized!', show_alert: true });
        }

        const result = await paymentService.approvePayment(paymentId, fromId);
        await ctx.answerCallbackQuery({ text: 'Payment approved & slot confirmed!' });
        await ctx.editMessageCaption({
          caption: `✅ <b>PAYMENT APPROVED</b>\nSlot #${result.slot_number} assigned. Player notified.`,
          parse_mode: 'HTML'
        });

        // Notify player privately
        try {
          await bot.api.sendMessage(
            result.telegram_id,
            `🎉 <b>Payment Approved!</b>\n\nYour registration has been confirmed! Your assigned slot is <b>#${result.slot_number}</b>.\nRoom details will be sent prior to match time.`,
            { parse_mode: 'HTML' }
          );
        } catch (_) {}
      } else if (data.startsWith('pay_reject_')) {
        const paymentId = data.replace('pay_reject_', '');
        const adminRole = await userService.getAdminRole(fromId);
        if (!adminRole) {
          return ctx.answerCallbackQuery({ text: 'Unauthorized!', show_alert: true });
        }

        const result = await paymentService.rejectPayment(paymentId, fromId);
        await ctx.answerCallbackQuery({ text: 'Payment rejected.' });
        await ctx.editMessageCaption({
          caption: `❌ <b>PAYMENT REJECTED</b>\nRegistration marked as rejected.`,
          parse_mode: 'HTML'
        });

        try {
          await bot.api.sendMessage(
            result.telegramId,
            `❌ <b>Payment Not Verified</b>\n\nYour payment for the lobby could not be verified. Please check your transaction details or contact support.`,
            { parse_mode: 'HTML' }
          );
        } catch (_) {}
      }

      await ctx.answerCallbackQuery();
    } catch (err) {
      console.error('Callback error:', err);
      await ctx.answerCallbackQuery({ text: `Error: ${err.message}`, show_alert: true });
    }
  });

  return bot;
}

export async function handleBotWebhookUpdate(update) {
  const bot = getBot() || initBot();
  if (bot && update) {
    await bot.handleUpdate(update);
  }
}
