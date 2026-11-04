import { getSupabaseClient } from '../database/client.js';

export const lobbyService = {
  /**
   * List all lobbies, optionally filtered by status
   */
  async getLobbies({ status, feeType } = {}) {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    let query = supabase
      .from('lobbies')
      .select('*')
      .order('start_time', { ascending: true });

    if (status) {
      if (Array.isArray(status)) {
        query = query.in('status', status);
      } else {
        query = query.eq('status', status);
      }
    } else {
      // Default: don't show archived
      query = query.neq('status', 'archived');
    }

    if (feeType) {
      query = query.eq('fee_type', feeType);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  /**
   * Get single lobby by ID
   */
  async getLobbyById(lobbyId) {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('lobbies')
      .select('*')
      .eq('id', lobbyId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * Create new lobby
   */
  async createLobby({
    name,
    description,
    entryFee = 0,
    currency = 'INR',
    capacity = 48,
    registrationDeadline,
    startTime,
    rules,
    prizePool,
    createdBy
  }) {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const fee = Number(entryFee);
    const feeType = fee > 0 ? 'paid' : 'free';

    const { data, error } = await supabase
      .from('lobbies')
      .insert({
        name,
        description,
        entry_fee: fee,
        currency,
        fee_type: feeType,
        capacity: Number(capacity),
        current_participants: 0,
        registration_deadline: new Date(registrationDeadline).toISOString(),
        start_time: new Date(startTime).toISOString(),
        status: 'open',
        rules,
        prize_pool: prizePool,
        created_by: createdBy
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update lobby
   */
  async updateLobby(lobbyId, updates) {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    if (updates.entry_fee !== undefined) {
      updates.fee_type = Number(updates.entry_fee) > 0 ? 'paid' : 'free';
    }
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('lobbies')
      .update(updates)
      .eq('id', lobbyId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Pause or resume registration
   */
  async setLobbyStatus(lobbyId, status) {
    return this.updateLobby(lobbyId, { status });
  }
};
