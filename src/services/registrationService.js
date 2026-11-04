import { getSupabaseClient } from '../database/client.js';
import { userService } from './userService.js';

export const registrationService = {
  /**
   * Register player in lobby atomically
   */
  async registerPlayer({
    lobbyId,
    telegramId,
    playerName,
    freeFireUid,
    isPaid = false,
    transactionReference = null,
    screenshotUrl = null,
    screenshotFileId = null,
    amount = 0
  }) {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    // 1. Check mandatory bot start requirement
    const user = await userService.getUserByTelegramId(telegramId);
    if (!user || !user.has_started_bot) {
      return {
        success: false,
        error: 'BOT_NOT_STARTED',
        message: 'Please start our Telegram bot first to continue.'
      };
    }

    if (user.account_status === 'banned') {
      return {
        success: false,
        error: 'ACCOUNT_BANNED',
        message: 'Your account has been banned from participating.'
      };
    }

    // Update user's player profile if newly provided
    if (playerName && freeFireUid) {
      await userService.updatePlayerProfile(telegramId, { playerName, freeFireUid });
    }

    // 2. Execute atomic database registration procedure
    const { data, error } = await supabase.rpc('register_player_atomic', {
      p_lobby_id: lobbyId,
      p_user_id: user.id,
      p_telegram_id: telegramId,
      p_player_name: playerName || user.player_name,
      p_ff_uid: freeFireUid || user.free_fire_uid,
      p_is_paid: isPaid,
      p_transaction_ref: transactionReference,
      p_screenshot_url: screenshotUrl,
      p_screenshot_file_id: screenshotFileId,
      p_amount: amount
    });

    if (error) {
      // Fallback if rpc is not present (e.g. mock test environment)
      return { success: false, error: 'DB_ERROR', message: error.message };
    }

    return data;
  },

  /**
   * Get lobby participants with filter
   */
  async getParticipants(lobbyId, { status = 'confirmed', search = '' } = {}) {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    let query = supabase
      .from('registrations')
      .select(`
        id,
        lobby_id,
        user_id,
        telegram_id,
        player_name,
        free_fire_uid,
        registration_status,
        payment_status,
        slot_number,
        registered_at,
        users (
          username,
          first_name
        )
      `)
      .eq('lobby_id', lobbyId);

    if (status) {
      query = query.eq('registration_status', status);
    }

    if (search) {
      query = query.or(`player_name.ilike.%${search}%,free_fire_uid.ilike.%${search}%`);
    }

    query = query.order('slot_number', { ascending: true, nullsFirst: false });

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  /**
   * Get registrations for a specific player across all lobbies
   */
  async getPlayerRegistrations(telegramId) {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('registrations')
      .select(`
        *,
        lobbies (
          id,
          name,
          entry_fee,
          currency,
          start_time,
          status,
          capacity,
          current_participants
        )
      `)
      .eq('telegram_id', telegramId)
      .neq('registration_status', 'cancelled')
      .order('registered_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  /**
   * Cancel or kick a player registration
   */
  async cancelRegistration(registrationId, reason = 'Admin cancelled', refunded = false) {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    // Get registration details first
    const { data: reg, error: fetchErr } = await supabase
      .from('registrations')
      .select('*')
      .eq('id', registrationId)
      .single();

    if (fetchErr || !reg) throw new Error('Registration not found');

    const wasConfirmed = reg.registration_status === 'confirmed';

    // Update status
    const { data, error } = await supabase
      .from('registrations')
      .update({
        registration_status: 'cancelled',
        cancellation_reason: reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', registrationId)
      .select()
      .single();

    if (error) throw error;

    // Decrement confirmed participant count if it was confirmed
    if (wasConfirmed) {
      await supabase.rpc('decrement_lobby_participants', { p_lobby_id: reg.lobby_id }).catch(async () => {
        // Fallback standard query
        const { data: lobby } = await supabase.from('lobbies').select('current_participants').eq('id', reg.lobby_id).single();
        if (lobby && lobby.current_participants > 0) {
          await supabase.from('lobbies').update({ current_participants: lobby.current_participants - 1 }).eq('id', reg.lobby_id);
        }
      });
    }

    return data;
  }
};
