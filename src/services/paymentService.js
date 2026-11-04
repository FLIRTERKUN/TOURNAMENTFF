import { getSupabaseClient } from '../database/client.js';

export const paymentService = {
  /**
   * Get pending payments for review
   */
  async getPendingPayments(lobbyId = null) {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    let query = supabase
      .from('payments')
      .select(`
        *,
        lobbies (
          id,
          name,
          entry_fee,
          currency
        ),
        registrations (
          player_name,
          free_fire_uid
        ),
        users (
          username,
          first_name
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (lobbyId) {
      query = query.eq('lobby_id', lobbyId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  /**
   * Approve a payment atomically
   */
  async approvePayment(paymentId, adminTelegramId, notes = '') {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Database not connected');

    const { data, error } = await supabase.rpc('approve_payment_atomic', {
      p_payment_id: paymentId,
      p_admin_tg_id: adminTelegramId,
      p_notes: notes
    });

    if (error) {
      throw error;
    }

    return data;
  },

  /**
   * Reject a payment
   */
  async rejectPayment(paymentId, adminTelegramId, rejectionReason = 'Invalid reference ID or screenshot') {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Database not connected');

    // 1. Fetch payment to find registration
    const { data: payment, error: pErr } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (pErr || !payment) throw new Error('Payment not found');

    // 2. Mark payment as rejected
    const { data, error } = await supabase
      .from('payments')
      .update({
        status: 'rejected',
        reviewed_by: adminTelegramId,
        reviewed_at: new Date().toISOString(),
        rejection_reason: rejectionReason,
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentId)
      .select()
      .single();

    if (error) throw error;

    // 3. Mark registration payment_status as rejected
    await supabase
      .from('registrations')
      .update({
        payment_status: 'rejected',
        registration_status: 'cancelled',
        cancellation_reason: `Payment rejected: ${rejectionReason}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', payment.registration_id);

    return {
      success: true,
      payment: data,
      registrationId: payment.registration_id,
      telegramId: payment.telegram_id,
      lobbyId: payment.lobby_id
    };
  },

  /**
   * Get UPI settings
   */
  async getUpiSettings() {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return {
        upi_id: 'tournament@upi',
        payee_name: 'Free Fire Esports',
        qr_image_url: '',
        instructions: 'Pay entry fee via UPI and enter UTR / Txn Reference ID'
      };
    }

    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'upi_settings')
      .maybeSingle();

    if (error || !data) {
      return {
        upi_id: 'tournament@upi',
        payee_name: 'Free Fire Esports',
        qr_image_url: '',
        instructions: 'Pay entry fee via UPI and enter UTR / Txn Reference ID'
      };
    }

    return data.value;
  },

  /**
   * Update UPI settings
   */
  async updateUpiSettings(newSettings) {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('app_settings')
      .upsert({
        key: 'upi_settings',
        value: newSettings,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
