import React, { useState, useEffect } from 'react';
import {
  PlusCircle, Users, CheckCircle, XCircle, Send, Award, Settings,
  FileText, RefreshCw, Eye, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { api } from '../services/api';

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState('lobbies');
  const [lobbies, setLobbies] = useState([]);
  const [payments, setPayments] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [selectedLobby, setSelectedLobby] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  // Room details form state
  const [roomData, setRoomData] = useState({
    roomId: '',
    password: '',
    tournamentId: '',
    mapName: 'Bermuda',
    matchTime: '',
    customMessage: ''
  });

  // New lobby form state
  const [newLobby, setNewLobby] = useState({
    name: '',
    entryFee: 0,
    capacity: 48,
    registrationDeadline: '',
    startTime: '',
    rules: 'Standard Free Fire Battle Royale solo/squad rules. Emulators not allowed.'
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    setLoading(true);
    try {
      const [lobbiesRes, paymentsRes, logsRes] = await Promise.all([
        api.get('/lobbies'),
        api.get('/admin/payments'),
        api.get('/admin/audit-logs')
      ]);

      if (lobbiesRes.lobbies) setLobbies(lobbiesRes.lobbies);
      if (paymentsRes.payments) setPayments(paymentsRes.payments);
      if (logsRes.logs) setAuditLogs(logsRes.logs);
    } catch (err) {
      showMessage(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  function showMessage(text, type = 'success') {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), 4000);
  }

  // Handle Create Lobby
  async function handleCreateLobby(e) {
    e.preventDefault();
    try {
      const res = await api.post('/admin/lobbies', newLobby);
      if (res.success) {
        showMessage('✅ Lobby created successfully!');
        setNewLobby({
          name: '',
          entryFee: 0,
          capacity: 48,
          registrationDeadline: '',
          startTime: '',
          rules: ''
        });
        fetchInitialData();
        setActiveTab('lobbies');
      } else {
        showMessage(res.error || 'Failed to create lobby', 'error');
      }
    } catch (err) {
      showMessage(err.message, 'error');
    }
  }

  // Handle View Participants
  async function handleViewParticipants(lobby) {
    setSelectedLobby(lobby);
    setActiveTab('participants');
    try {
      const res = await api.get(`/admin/lobbies/${lobby.id}/participants`);
      if (res.participants) setParticipants(res.participants);
    } catch (err) {
      showMessage(err.message, 'error');
    }
  }

  // Handle Kick / Cancel Player
  async function handleKickPlayer(regId) {
    if (!confirm('Are you sure you want to remove this player?')) return;
    try {
      const res = await api.post(`/admin/registrations/${regId}/cancel`, {
        reason: 'Removed by tournament admin'
      });
      if (res.success) {
        showMessage('Player removed.');
        handleViewParticipants(selectedLobby);
      }
    } catch (err) {
      showMessage(err.message, 'error');
    }
  }

  // Handle Payment Review
  async function handlePaymentAction(paymentId, action) {
    try {
      const endpoint = action === 'approve'
        ? `/admin/payments/${paymentId}/approve`
        : `/admin/payments/${paymentId}/reject`;

      const res = await api.post(endpoint, {
        notes: action === 'approve' ? 'Approved in Admin Panel' : undefined,
        reason: action === 'reject' ? 'Invalid reference ID or screenshot' : undefined
      });

      if (res.success) {
        showMessage(`Payment ${action}d successfully!`);
        fetchInitialData();
      } else {
        showMessage(res.error || 'Action failed', 'error');
      }
    } catch (err) {
      showMessage(err.message, 'error');
    }
  }

  // Handle Send Room Details
  async function handlePublishRoomDetails(e) {
    e.preventDefault();
    if (!selectedLobby) return showMessage('Select a lobby first', 'error');

    try {
      const res = await api.post(`/admin/lobbies/${selectedLobby.id}/room-details`, roomData);
      if (res.success) {
        showMessage('✅ Room credentials saved & ready for delivery!');
        setRoomData({
          roomId: '',
          password: '',
          tournamentId: '',
          mapName: 'Bermuda',
          matchTime: '',
          customMessage: ''
        });
      }
    } catch (err) {
      showMessage(err.message, 'error');
    }
  }

  return (
    <div className="space-y-6">
      {/* Admin Top Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-ff-border">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-6 h-6 text-ff-orange" />
          <h2 className="text-xl font-black tracking-wide text-white">ADMIN MANAGEMENT</h2>
        </div>
        <button
          onClick={fetchInitialData}
          className="flex items-center space-x-1 text-xs bg-ff-card hover:bg-ff-border px-3 py-1.5 rounded-lg border border-ff-border text-gray-300"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {msg.text && (
        <div className={`p-3 rounded-lg text-sm font-semibold ${msg.type === 'error' ? 'bg-red-900/60 border border-red-500 text-red-200' : 'bg-green-900/60 border border-green-500 text-green-200'}`}>
          {msg.text}
        </div>
      )}

      {/* Admin Tab Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {[
          { id: 'lobbies', label: 'All Lobbies', icon: Users },
          { id: 'create_lobby', label: 'Create Lobby', icon: PlusCircle },
          { id: 'payments', label: `Payments (${payments.length})`, icon: CheckCircle },
          { id: 'room_sender', label: 'Send Details', icon: Send },
          { id: 'audit', label: 'Audit Logs', icon: FileText }
        ].map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all ${
                active
                  ? 'bg-ff-orange text-white border-ff-orange shadow-lg shadow-orange-500/20'
                  : 'bg-ff-card text-gray-400 border-ff-border hover:bg-ff-dark hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: ALL LOBBIES */}
      {activeTab === 'lobbies' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lobbies.map(l => (
              <div key={l.id} className="bg-ff-card border border-ff-border rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs px-2 py-0.5 rounded font-black uppercase bg-ff-dark text-ff-cyan border border-ff-border">
                      {Number(l.entry_fee) === 0 ? 'FREE' : `₹${l.entry_fee}`}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${l.status === 'open' ? 'bg-green-900/50 text-green-400 border border-green-500/40' : 'bg-red-900/50 text-red-400 border border-red-500/40'}`}>
                      {l.status}
                    </span>
                  </div>
                  <h4 className="text-lg font-bold text-white mb-1">{l.name}</h4>
                  <div className="text-xs text-gray-400 space-y-1 mb-4">
                    <div>Capacity: <span className="text-white font-mono">{l.current_participants}/{l.capacity}</span></div>
                    <div>Start: <span className="text-white">{new Date(l.start_time).toLocaleString()}</span></div>
                  </div>
                </div>

                <div className="flex space-x-2 pt-2 border-t border-ff-border/50">
                  <button
                    onClick={() => handleViewParticipants(l)}
                    className="flex-1 py-1.5 bg-ff-dark hover:bg-ff-border rounded-lg text-xs font-bold text-white flex items-center justify-center space-x-1"
                  >
                    <Users className="w-3.5 h-3.5 text-ff-cyan" />
                    <span>Participants</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedLobby(l);
                      setActiveTab('room_sender');
                    }}
                    className="flex-1 py-1.5 bg-ff-dark hover:bg-ff-border rounded-lg text-xs font-bold text-white flex items-center justify-center space-x-1"
                  >
                    <Send className="w-3.5 h-3.5 text-ff-orange" />
                    <span>Send Details</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: CREATE LOBBY */}
      {activeTab === 'create_lobby' && (
        <div className="bg-ff-card border border-ff-border rounded-xl p-6 max-w-xl mx-auto">
          <h3 className="text-lg font-black text-white uppercase tracking-wider mb-4 flex items-center space-x-2">
            <PlusCircle className="w-5 h-5 text-ff-orange" />
            <span>Create New Tournament Lobby</span>
          </h3>
          <form onSubmit={handleCreateLobby} className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-300 mb-1">Lobby Name</label>
              <input
                type="text"
                required
                value={newLobby.name}
                onChange={e => setNewLobby({ ...newLobby, name: e.target.value })}
                placeholder="e.g. Bermuda Solo Rush #15"
                className="w-full bg-ff-dark border border-ff-border rounded-lg px-3 py-2 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-300 mb-1">Entry Fee (₹)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={newLobby.entryFee}
                  onChange={e => setNewLobby({ ...newLobby, entryFee: e.target.value })}
                  className="w-full bg-ff-dark border border-ff-border rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-300 mb-1">Max Capacity</label>
                <input
                  type="number"
                  min="2"
                  max="48"
                  required
                  value={newLobby.capacity}
                  onChange={e => setNewLobby({ ...newLobby, capacity: e.target.value })}
                  className="w-full bg-ff-dark border border-ff-border rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-300 mb-1">Start Time</label>
                <input
                  type="datetime-local"
                  required
                  value={newLobby.startTime}
                  onChange={e => setNewLobby({ ...newLobby, startTime: e.target.value })}
                  className="w-full bg-ff-dark border border-ff-border rounded-lg px-3 py-2 text-white text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-300 mb-1">Registration Deadline</label>
                <input
                  type="datetime-local"
                  required
                  value={newLobby.registrationDeadline}
                  onChange={e => setNewLobby({ ...newLobby, registrationDeadline: e.target.value })}
                  className="w-full bg-ff-dark border border-ff-border rounded-lg px-3 py-2 text-white text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-300 mb-1">Tournament Rules</label>
              <textarea
                rows="3"
                value={newLobby.rules}
                onChange={e => setNewLobby({ ...newLobby, rules: e.target.value })}
                className="w-full bg-ff-dark border border-ff-border rounded-lg px-3 py-2 text-white text-xs"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-ff-orange hover:bg-orange-500 text-white font-extrabold uppercase tracking-wider rounded-lg"
            >
              Publish Lobby
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: PAYMENTS REVIEW */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300">
            Pending UPI Payments ({payments.length})
          </h3>
          {payments.length === 0 ? (
            <div className="p-8 text-center text-gray-500 bg-ff-card border border-ff-border rounded-xl">
              No pending payments to review.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {payments.map(p => (
                <div key={p.id} className="bg-ff-card border border-ff-border rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-xs text-ff-cyan font-bold">{p.lobbies?.name}</div>
                      <div className="text-base font-extrabold text-white">Amount: ₹{p.amount}</div>
                    </div>
                    <span className="text-xs bg-yellow-950 text-yellow-400 border border-yellow-700/50 px-2 py-0.5 rounded font-bold uppercase">
                      Pending
                    </span>
                  </div>

                  <div className="bg-ff-dark p-2.5 rounded text-xs space-y-1 font-mono">
                    <div>Player: <span className="text-white font-sans">{p.registrations?.player_name}</span></div>
                    <div>FF UID: <span className="text-ff-orange">{p.registrations?.free_fire_uid}</span></div>
                    <div>UTR / Txn Ref: <span className="text-ff-cyan">{p.transaction_reference}</span></div>
                  </div>

                  {p.screenshot_url && (
                    <a
                      href={p.screenshot_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-400 hover:underline flex items-center space-x-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Screenshot</span>
                    </a>
                  )}

                  <div className="flex space-x-2 pt-2 border-t border-ff-border">
                    <button
                      onClick={() => handlePaymentAction(p.id, 'approve')}
                      className="flex-1 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-xs font-bold text-white flex items-center justify-center space-x-1"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => handlePaymentAction(p.id, 'reject')}
                      className="flex-1 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-xs font-bold text-white flex items-center justify-center space-x-1"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: ROOM DETAILS SENDER */}
      {activeTab === 'room_sender' && (
        <div className="bg-ff-card border border-ff-border rounded-xl p-6 max-w-xl mx-auto space-y-4">
          <h3 className="text-lg font-black text-white uppercase tracking-wider flex items-center space-x-2">
            <Send className="w-5 h-5 text-ff-orange" />
            <span>Publish & Send Room Details</span>
          </h3>

          <div className="p-3 bg-ff-dark border border-ff-border rounded-lg text-xs text-gray-300">
            Selected Lobby: <span className="font-bold text-ff-cyan">{selectedLobby?.name || 'Please select a lobby from All Lobbies first'}</span>
          </div>

          {selectedLobby && (
            <form onSubmit={handlePublishRoomDetails} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-300 mb-1">Room ID</label>
                  <input
                    type="text"
                    required
                    value={roomData.roomId}
                    onChange={e => setRoomData({ ...roomData, roomId: e.target.value })}
                    placeholder="e.g. 87654321"
                    className="w-full bg-ff-dark border border-ff-border rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-300 mb-1">Password</label>
                  <input
                    type="text"
                    required
                    value={roomData.password}
                    onChange={e => setRoomData({ ...roomData, password: e.target.value })}
                    placeholder="e.g. FF123"
                    className="w-full bg-ff-dark border border-ff-border rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-300 mb-1">Map</label>
                  <input
                    type="text"
                    value={roomData.mapName}
                    onChange={e => setRoomData({ ...roomData, mapName: e.target.value })}
                    placeholder="Bermuda"
                    className="w-full bg-ff-dark border border-ff-border rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-300 mb-1">Match Time</label>
                  <input
                    type="text"
                    value={roomData.matchTime}
                    onChange={e => setRoomData({ ...roomData, matchTime: e.target.value })}
                    placeholder="8:30 PM"
                    className="w-full bg-ff-dark border border-ff-border rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-300 mb-1">Instructions / Note</label>
                <textarea
                  rows="2"
                  value={roomData.customMessage}
                  onChange={e => setRoomData({ ...roomData, customMessage: e.target.value })}
                  placeholder="Join 10 minutes prior to match."
                  className="w-full bg-ff-dark border border-ff-border rounded-lg px-3 py-2 text-white text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-ff-orange to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-extrabold uppercase tracking-wider rounded-lg shadow-lg"
              >
                Publish Credentials for Confirmed Players
              </button>
            </form>
          )}
        </div>
      )}

      {/* TAB 5: PARTICIPANTS VIEW */}
      {activeTab === 'participants' && selectedLobby && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-white uppercase">
              Participants: {selectedLobby.name} ({participants.length})
            </h3>
            <button
              onClick={() => setActiveTab('lobbies')}
              className="text-xs text-gray-400 hover:text-white"
            >
              Back to Lobbies
            </button>
          </div>

          <div className="bg-ff-card border border-ff-border rounded-xl overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-ff-dark uppercase text-gray-400 border-b border-ff-border">
                <tr>
                  <th className="p-3">Slot</th>
                  <th className="p-3">Player IGN</th>
                  <th className="p-3">Free Fire UID</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ff-border">
                {participants.map(p => (
                  <tr key={p.id} className="hover:bg-ff-dark/40">
                    <td className="p-3 font-mono font-bold text-ff-cyan">#{p.slot_number || '-'}</td>
                    <td className="p-3 font-bold text-white">{p.player_name}</td>
                    <td className="p-3 font-mono text-gray-400">{p.free_fire_uid}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${p.registration_status === 'confirmed' ? 'bg-green-900/50 text-green-400' : 'bg-yellow-900/50 text-yellow-400'}`}>
                        {p.registration_status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleKickPlayer(p.id)}
                        className="text-red-400 hover:text-red-300 font-bold"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="bg-ff-card border border-ff-border rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300">
            Recent Admin Audit Activity
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {auditLogs.map(log => (
              <div key={log.id} className="p-2.5 bg-ff-dark rounded border border-ff-border text-xs flex justify-between items-center">
                <div>
                  <span className="font-bold text-ff-orange">{log.action}</span>
                  <span className="text-gray-400 ml-2">by Admin {log.admin_id}</span>
                </div>
                <div className="text-gray-500 text-[10px]">
                  {new Date(log.created_at).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
