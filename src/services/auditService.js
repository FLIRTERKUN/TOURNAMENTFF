import { getSupabaseClient } from '../database/client.js';

export const auditService = {
  /**
   * Log administrative actions
   */
  async logAction({ adminId, action, entityType, entityId = null, details = {}, ipAddress = null }) {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('audit_logs')
      .insert({
        admin_id: adminId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        details,
        ip_address: ipAddress
      })
      .select()
      .single();

    if (error) {
      console.error('Audit log error:', error.message);
      return null;
    }
    return data;
  },

  /**
   * Fetch recent audit logs
   */
  async getRecentLogs(limit = 50) {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }
};
