import { getSupabaseClient } from '../database/client.js';

export const resultService = {
  /**
   * Submit or update a match result
   */
  async submitResult({
    lobbyId,
    userId = null,
    playerName,
    freeFireUid,
    position,
    kills,
    placementPoints = 0,
    evidenceFileId = null,
    evidenceUrl = null,
    approvedBy = null
  }) {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    // Formula: Total Points = Placement Points + Kills (1 point per kill)
    const points = Number(placementPoints) + Number(kills);

    const { data, error } = await supabase
      .from('results')
      .insert({
        lobby_id: lobbyId,
        user_id: userId,
        player_name: playerName,
        free_fire_uid: freeFireUid,
        position: Number(position),
        kills: Number(kills),
        points: points,
        evidence_file_id: evidenceFileId,
        evidence_url: evidenceUrl,
        status: approvedBy ? 'approved' : 'submitted',
        approved_by: approvedBy
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get leaderboard for a specific lobby
   */
  async getLobbyLeaderboard(lobbyId) {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('results')
      .select('*')
      .eq('lobby_id', lobbyId)
      .eq('status', 'approved')
      .order('points', { ascending: false })
      .order('position', { ascending: true });

    if (error) throw error;
    return data;
  },

  /**
   * Approve a result entry
   */
  async approveResult(resultId, adminTelegramId) {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('results')
      .update({
        status: 'approved',
        approved_by: adminTelegramId,
        updated_at: new Date().toISOString()
      })
      .eq('id', resultId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
