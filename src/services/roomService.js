import { getSupabaseClient } from '../database/client.js';

export const roomService = {
  /**
   * Get room details for a specific lobby
   * STRICT ACCESS CHECK: Only confirmed participants or admins may view!
   */
  async getRoomDetails(lobbyId, telegramId = null, isAdmin = false) {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    if (!isAdmin && telegramId) {
      // Verify that this user is a confirmed participant in THIS lobby
      const { data: reg, error: regErr } = await supabase
        .from('registrations')
        .select('registration_status')
        .eq('lobby_id', lobbyId)
        .eq('telegram_id', telegramId)
        .eq('registration_status', 'confirmed')
        .maybeSingle();

      if (regErr || !reg) {
        return {
          authorized: false,
          error: 'UNAUTHORIZED_OR_NOT_CONFIRMED',
          message: 'Room details are only visible to confirmed participants of this lobby.'
        };
      }
    } else if (!isAdmin && !telegramId) {
      return {
        authorized: false,
        error: 'AUTH_REQUIRED',
        message: 'Authentication required to view room credentials.'
      };
    }

    const { data, error } = await supabase
      .from('lobby_room_details')
      .select('*')
      .eq('lobby_id', lobbyId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return { authorized: true, roomDetails: null };

    return {
      authorized: true,
      roomDetails: data
    };
  },

  /**
   * Save or update room details for a lobby
   */
  async saveRoomDetails({
    lobbyId,
    tournamentId,
    roomId,
    password,
    mapName = 'Bermuda',
    matchTime = '',
    customMessage = '',
    instructions = '',
    publishedBy
  }) {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('lobby_room_details')
      .upsert(
        {
          lobby_id: lobbyId,
          tournament_id: tournamentId,
          room_id: roomId,
          password: password,
          map_name: mapName,
          match_time: matchTime,
          custom_message: customMessage,
          instructions: instructions,
          published_by: publishedBy,
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        { onConflict: 'lobby_id' }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get confirmed participants of this EXACT lobby for DM delivery
   * CRITICAL PRIVACY: Only confirmed participants of lobby_id!
   */
  async getConfirmedLobbyRecipients(lobbyId) {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('registrations')
      .select(`
        id,
        lobby_id,
        user_id,
        telegram_id,
        player_name,
        free_fire_uid,
        slot_number
      `)
      .eq('lobby_id', lobbyId)
      .eq('registration_status', 'confirmed');

    if (error) throw error;
    return data;
  },

  /**
   * Record room message delivery attempt
   */
  async recordDelivery({
    lobbyId,
    userId,
    telegramId,
    messageType = 'room_credentials',
    messageContent,
    messageId = null,
    status,
    errorMessage = null
  }) {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('room_message_deliveries')
      .insert({
        lobby_id: lobbyId,
        user_id: userId,
        telegram_id: telegramId,
        message_type: messageType,
        message_content: messageContent,
        message_id: messageId,
        status: status,
        error_message: errorMessage,
        sent_at: status === 'sent' ? new Date().toISOString() : null
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get delivery report for a lobby
   */
  async getDeliveryReport(lobbyId) {
    const supabase = getSupabaseClient();
    if (!supabase) return { total: 0, sent: 0, failed: 0, blocked: 0 };

    const { data, error } = await supabase
      .from('room_message_deliveries')
      .select('status')
      .eq('lobby_id', lobbyId);

    if (error) throw error;

    const summary = {
      total: data.length,
      sent: data.filter(d => d.status === 'sent').length,
      failed: data.filter(d => d.status === 'failed').length,
      blocked: data.filter(d => d.status === 'blocked').length
    };

    return summary;
  }
};
