import React, { useState } from 'react';
import { X, ShieldAlert, CheckCircle, Upload, QrCode } from 'lucide-react';
import { api } from '../services/api';

export function RegistrationModal({ lobby, upiSettings, onClose, onSuccess }) {
  const [playerName, setPlayerName] = useState('');
  const [freeFireUid, setFreeFireUid] = useState('');
  const [txRef, setTxRef] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const isPaid = Number(lobby.entry_fee) > 0;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!playerName.trim() || playerName.trim().length < 2) {
      return setError('Please enter a valid in-game name (minimum 2 chars).');
    }

    if (!/^\d{6,16}$/.test(freeFireUid.trim())) {
      return setError('Free Fire UID must be 6 to 16 numeric digits.');
    }

    if (isPaid && !txRef.trim()) {
      return setError('Please enter your UPI Transaction Reference / UTR Number.');
    }

    setLoading(true);

    try {
      const res = await api.post(`/lobbies/${lobby.id}/register`, {
        playerName: playerName.trim(),
        freeFireUid: freeFireUid.trim(),
        transactionReference: isPaid ? txRef.trim() : null,
        screenshotUrl: screenshotUrl || null
      });

      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      } else {
        if (res.error === 'BOT_NOT_STARTED') {
          setError('⚠️ You must start our Telegram Bot first before joining lobbies!');
        } else {
          setError(res.message || res.error || 'Failed to complete registration.');
        }
      }
    } catch (err) {
      setError(err.message || 'Network error occurred.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-ff-card border border-ff-border rounded-xl w-full max-w-md p-6 relative shadow-2xl my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-black text-white uppercase tracking-wider mb-1">
          Join {lobby.name}
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          Entry Fee: <span className="font-bold text-ff-orange">{isPaid ? `₹${lobby.entry_fee}` : 'FREE'}</span> | Capacity: {lobby.current_participants}/{lobby.capacity}
        </p>

        {error && (
          <div className="p-3 mb-4 bg-red-950/60 border border-red-500/50 rounded-lg text-red-200 text-sm flex items-start space-x-2">
            <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        {success ? (
          <div className="py-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-3 animate-bounce" />
            <h4 className="text-lg font-bold text-white mb-1">
              {isPaid ? 'Payment Submitted for Review!' : 'Successfully Registered!'}
            </h4>
            <p className="text-sm text-gray-400">
              {isPaid
                ? 'Your payment is being reviewed by an admin. You will receive a Telegram DM once confirmed.'
                : 'Your slot is secured. Room credentials will be sent to your Telegram DM before match time.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
                Free Fire In-Game Name (IGN)
              </label>
              <input
                type="text"
                required
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                placeholder="e.g. RAISTAR_99"
                className="w-full bg-ff-dark border border-ff-border rounded-lg px-3.5 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-ff-orange"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
                Free Fire UID (Numeric)
              </label>
              <input
                type="text"
                required
                value={freeFireUid}
                onChange={e => setFreeFireUid(e.target.value)}
                placeholder="e.g. 192837465"
                className="w-full bg-ff-dark border border-ff-border rounded-lg px-3.5 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-ff-orange font-mono"
              />
            </div>

            {isPaid && (
              <div className="p-4 bg-ff-dark/80 border border-ff-orange/30 rounded-lg space-y-3">
                <div className="flex items-center space-x-2 text-ff-yellow font-bold text-sm">
                  <QrCode className="w-4 h-4" />
                  <span>Scan & Pay ₹{lobby.entry_fee} via UPI</span>
                </div>

                <div className="bg-black/40 p-2.5 rounded border border-ff-border text-center">
                  <div className="text-xs text-gray-400">UPI ID:</div>
                  <div className="text-sm font-mono font-bold text-ff-cyan select-all">
                    {upiSettings?.upi_id || 'tournament@upi'}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Payee: {upiSettings?.payee_name || 'Free Fire Esports'}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
                    UPI Reference / UTR Number
                  </label>
                  <input
                    type="text"
                    required
                    value={txRef}
                    onChange={e => setTxRef(e.target.value)}
                    placeholder="12-digit UTR Number"
                    className="w-full bg-black/60 border border-ff-border rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-ff-orange font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
                    Payment Screenshot URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={screenshotUrl}
                    onChange={e => setScreenshotUrl(e.target.value)}
                    placeholder="https://imgur.com/... or uploaded image URL"
                    className="w-full bg-black/60 border border-ff-border rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-ff-orange text-xs"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-3 bg-gradient-to-r from-ff-orange to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-extrabold uppercase tracking-wider rounded-lg shadow-lg hover:shadow-orange-500/30 transition-all disabled:opacity-50"
            >
              {loading ? 'Processing...' : isPaid ? `Confirm & Submit (₹${lobby.entry_fee})` : 'Confirm Free Entry'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
