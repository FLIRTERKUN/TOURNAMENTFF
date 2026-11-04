import { getSupabaseClient } from '../database/client.js';
import { config } from '../config/index.js';

export const userService = {
  /**
   * Find user by Telegram ID
   */
  async getUserByTelegramId(telegramId) {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * Find user by UUID
   */
  async getUserById(id) {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * Upsert user when /start is issued in Telegram
   */
  async recordBotStart(telegramUser) {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { id: telegram_id, first_name, last_name, username } = telegramUser;

    const { data, error } = await supabase
      .from('users')
      .upsert(
        {
          telegram_id,
          first_name: first_name || null,
          last_name: last_name || null,
          username: username || null,
          has_started_bot: true,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'telegram_id' }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update player profile (Name and Free Fire UID)
   */
  async updatePlayerProfile(telegramId, { playerName, freeFireUid }) {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('users')
      .update({
        player_name: playerName,
        free_fire_uid: freeFireUid,
        updated_at: new Date().toISOString()
      })
      .eq('telegram_id', telegramId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Check if user is authorized admin and return admin role
   */
  async getAdminRole(telegramId) {
    if (config.ownerTelegramId && Number(telegramId) === Number(config.ownerTelegramId)) {
      return 'owner';
    }

    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('admins')
      .select('role, status')
      .eq('telegram_id', telegramId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) return null;
    return data?.role || null;
  }
};
