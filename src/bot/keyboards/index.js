import { InlineKeyboard } from 'grammy';
import { config } from '../../config/index.js';

export function getMainMenuKeyboard(isAdmin = false) {
  const keyboard = new InlineKeyboard()
    .webApp('🎮 OPEN TOURNAMENT APP', config.webappUrl).row()
    .text('🏆 Browse Lobbies', 'action_browse_lobbies')
    .text('📋 My Registrations', 'action_my_registrations').row()
    .text('👤 My Profile', 'action_profile')
    .text('ℹ️ Help & Rules', 'action_help');

  if (isAdmin) {
    keyboard.row()
      .webApp('⚡ ADMIN DASHBOARD', `${config.webappUrl}/admin`)
      .text('⚙️ Admin Bot Menu', 'action_admin_menu');
  }

  return keyboard;
}

export function getLobbiesListKeyboard(lobbies) {
  const keyboard = new InlineKeyboard();

  if (!lobbies || lobbies.length === 0) {
    keyboard.text('🔄 Refresh', 'action_browse_lobbies').row();
    keyboard.text('🔙 Back to Menu', 'action_main_menu');
    return keyboard;
  }

  lobbies.forEach(lobby => {
    const feeText = Number(lobby.entry_fee) === 0 ? 'FREE' : `₹${lobby.entry_fee}`;
    const statusIcon = lobby.current_participants >= lobby.capacity ? '🔴 FULL' : '🟢 OPEN';
    keyboard.text(
      `[${feeText}] ${lobby.name} (${lobby.current_participants}/${lobby.capacity}) ${statusIcon}`,
      `view_lobby_${lobby.id}`
    ).row();
  });

  keyboard.text('🔙 Main Menu', 'action_main_menu');
  return keyboard;
}

export function getLobbyDetailKeyboard(lobby, isRegistered = false, isAdmin = false) {
  const keyboard = new InlineKeyboard();

  if (!isRegistered && lobby.current_participants < lobby.capacity && lobby.status === 'open') {
    keyboard.text('⚔️ JOIN THIS LOBBY', `join_lobby_${lobby.id}`).row();
  } else if (isRegistered) {
    keyboard.text('🔑 VIEW ROOM DETAILS', `room_details_${lobby.id}`).row();
  }

  keyboard.webApp('📱 Open in Mini App', `${config.webappUrl}/lobby/${lobby.id}`).row();

  if (isAdmin) {
    keyboard.text('📢 Send Room Details', `admin_send_details_${lobby.id}`).row();
  }

  keyboard.text('🔙 All Lobbies', 'action_browse_lobbies');
  return keyboard;
}

export function getAdminPanelKeyboard() {
  return new InlineKeyboard()
    .webApp('🖥️ Open Web Admin Panel', `${config.webappUrl}/admin`).row()
    .text('➕ Create New Lobby', 'admin_create_lobby')
    .text('💳 Review Payments', 'admin_review_payments').row()
    .text('🔑 Send Room Details', 'admin_lobbies_for_details')
    .text('📢 Broadcast Announcement', 'admin_announce').row()
    .text('📊 Platform Stats', 'admin_stats')
    .text('🔙 Main Menu', 'action_main_menu');
}

export function getPaymentApprovalKeyboard(paymentId) {
  return new InlineKeyboard()
    .text('✅ Approve Payment', `pay_approve_${paymentId}`)
    .text('❌ Reject Payment', `pay_reject_${paymentId}`);
}
