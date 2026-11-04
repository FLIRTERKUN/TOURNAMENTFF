import React, { useState, useEffect } from 'react';
import { Trophy, Flame, Users, Calendar, Shield, ExternalLink, Key, Check } from 'lucide-react';
import { CountdownTimer } from './components/CountdownTimer';
import { RegistrationModal } from './components/RegistrationModal';
import { AdminPanel } from './pages/AdminPanel';
import { api } from './services/api';

export function App() {
  const [currentView, setCurrentView] = useState('lobbies'); // lobbies, my_lobbies, admin
  const [lobbies, setLobbies] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [upiSettings, setUpiSettings] = useState(null);
  const [selectedLobbyForReg, setSelectedLobbyForReg] = useState(null);
  const [roomDetailsMap, setRoomDetailsMap] = useState({});
  const [filter, setFilter] = useState('all'); // all, free, paid
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Notify Telegram WebApp ready
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [lobbiesRes, profileRes, upiRes] = await Promise.all([
        api.get('/lobbies'),
        api.get('/me'),
        api.get('/settings/upi')
      ]);

      if (lobbiesRes.lobbies) setLobbies(lobbiesRes.lobbies);
      if (profileRes.user || profileRes.telegramUser) setUserProfile(profileRes);
      if (upiRes.settings) setUpiSettings(upiRes.settings);

      // If authenticated, load user registrations
      if (profileRes.user) {
        const regRes = await api.get('/me/registrations');
        if (regRes.registrations) setMyRegistrations(regRes.registrations);
      }
    } catch (err) {
      console.error('Data load error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchRoomCredentials(lobbyId) {
    try {
      const res = await api.get(`/lobbies/${lobbyId}/room-details`);
      if (res.roomDetails) {
        setRoomDetailsMap(prev => ({ ...prev, [lobbyId]: res.roomDetails }));
      } else if (!res.authorized) {
        alert(res.message || 'Room details only visible to confirmed participants.');
      } else {
        alert('Room credentials have not been posted by admin yet.');
      }
    } catch (err) {
      alert(err.message);
    }
  }

  const filteredLobbies = lobbies.filter(l => {
    if (filter === 'free') return Number(l.entry_fee) === 0;
    if (filter === 'paid') return Number(l.entry_fee) > 0;
    return true;
  });

  const isAdmin = !!userProfile?.adminRole;

  return (
    <div className="min-h-screen bg-ff-dark text-gray-100 flex flex-col max-w-2xl mx-auto pb-20 shadow-2xl">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-ff-card/90 backdrop-blur-md border-b border-ff-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-ff-orange to-red-600 flex items-center justify-center font-black text-white text-lg shadow-md shadow-orange-500/30">
            FF
          </div>
          <div>
            <h1 className="text-sm font-black tracking-wider text-white uppercase flex items-center space-x-1">
              <span>FREE FIRE ARENA</span>
              <Flame className="w-3.5 h-3.5 text-ff-orange" />
            </h1>
            <p className="text-[10px] text-gray-400 font-mono">MULTI-LOBBY ESPORTS</p>
          </div>
        </div>

        {/* Mandatory Bot Check Pill */}
        {userProfile && !userProfile.hasStartedBot && (
          <a
            href="https://t.me/FreeFireTournamentBot?start=webapp"
            target="_blank"
            rel="noreferrer"
            className="text-[10px] bg-red-950 border border-red-500 text-red-200 px-2 py-1 rounded font-bold uppercase animate-pulse flex items-center space-x-1"
          >
            <span>Start Bot First</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </header>

      {/* Navigation Bar */}
      <nav className="flex border-b border-ff-border bg-ff-card/50 text-xs font-bold uppercase tracking-wider">
        <button
          onClick={() => setCurrentView('lobbies')}
          className={`flex-1 py-3 text-center transition-colors border-b-2 ${
            currentView === 'lobbies'
              ? 'border-ff-orange text-ff-orange'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Lobbies
        </button>
        <button
          onClick={() => {
            setCurrentView('my_lobbies');
            loadData();
          }}
          className={`flex-1 py-3 text-center transition-colors border-b-2 ${
            currentView === 'my_lobbies'
              ? 'border-ff-orange text-ff-orange'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          My Matches ({myRegistrations.length})
        </button>
        {isAdmin && (
          <button
            onClick={() => setCurrentView('admin')}
            className={`flex-1 py-3 text-center transition-colors border-b-2 ${
              currentView === 'admin'
                ? 'border-ff-orange text-ff-orange'
                : 'border-transparent text-ff-cyan hover:text-cyan-300'
            }`}
          >
            Admin Panel
          </button>
        )}
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 p-4">
        {/* VIEW 1: LOBBIES LIST */}
        {currentView === 'lobbies' && (
          <div className="space-y-4">
            {/* Filter Pills */}
            <div className="flex space-x-2">
              {['all', 'free', 'paid'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-xs px-3 py-1.5 rounded-full font-bold uppercase tracking-wider transition-all ${
                    filter === f
                      ? 'bg-ff-orange text-white'
                      : 'bg-ff-card border border-ff-border text-gray-400 hover:text-white'
                  }`}
                >
                  {f === 'all' ? 'All Lobbies' : f === 'free' ? 'Free (₹0)' : 'Paid Lobbies'}
                </button>
              ))}
            </div>

            {/* Lobby Cards */}
            <div className="space-y-3">
              {filteredLobbies.map(lobby => {
                const isPaid = Number(lobby.entry_fee) > 0;
                const isFull = lobby.current_participants >= lobby.capacity;

                return (
                  <div
                    key={lobby.id}
                    className="bg-ff-card border border-ff-border rounded-xl p-4 transition-all hover:border-ff-orange/50 shadow-lg"
                  >
                    <div className="flex justify-between items-start mb-2.5">
                      <div>
                        <span className={`text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                          isPaid
                            ? 'bg-orange-950/60 border-ff-orange/50 text-ff-orange'
                            : 'bg-green-950/60 border-green-500/50 text-green-400'
                        }`}>
                          {isPaid ? `Entry: ₹${lobby.entry_fee}` : 'FREE ENTRY'}
                        </span>
                        <h3 className="text-base font-extrabold text-white mt-1.5 tracking-wide">
                          {lobby.name}
                        </h3>
                      </div>
                      <CountdownTimer targetDate={lobby.start_time} />
                    </div>

                    {/* Meta Info */}
                    <div className="grid grid-cols-2 gap-2 my-3 text-xs text-gray-300 bg-ff-dark/50 p-2.5 rounded-lg border border-ff-border/50">
                      <div className="flex items-center space-x-1.5">
                        <Users className="w-4 h-4 text-ff-cyan" />
                        <span>Slots: <strong className="text-white font-mono">{lobby.current_participants}/{lobby.capacity}</strong></span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <Calendar className="w-4 h-4 text-ff-yellow" />
                        <span>Starts: <strong className="text-white">{new Date(lobby.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>
                      </div>
                    </div>

                    {/* Join / Status Button */}
                    <button
                      onClick={() => setSelectedLobbyForReg(lobby)}
                      disabled={isFull || lobby.status !== 'open'}
                      className={`w-full py-2.5 rounded-lg font-black uppercase tracking-wider text-xs transition-all flex items-center justify-center space-x-1.5 shadow-md ${
                        isFull
                          ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-ff-orange to-red-600 hover:from-orange-500 hover:to-red-500 text-white shadow-orange-500/20'
                      }`}
                    >
                      <span>{isFull ? 'LOBBY FULL' : isPaid ? `JOIN FOR ₹${lobby.entry_fee}` : 'JOIN LOBBY FOR FREE'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 2: MY REGISTRATIONS */}
        {currentView === 'my_lobbies' && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-300">
              My Registered Lobbies
            </h2>

            {myRegistrations.length === 0 ? (
              <div className="p-8 text-center bg-ff-card border border-ff-border rounded-xl">
                <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-400">You have not registered for any upcoming lobbies yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myRegistrations.map(reg => {
                  const room = roomDetailsMap[reg.lobby_id];
                  const isConfirmed = reg.registration_status === 'confirmed';

                  return (
                    <div key={reg.id} className="bg-ff-card border border-ff-border rounded-xl p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-xs text-ff-orange font-bold uppercase">
                            {reg.lobbies?.name || 'Tournament Lobby'}
                          </div>
                          <div className="text-sm font-extrabold text-white">
                            Player: {reg.player_name} ({reg.free_fire_uid})
                          </div>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase ${
                          isConfirmed ? 'bg-green-950 text-green-400 border border-green-500' : 'bg-yellow-950 text-yellow-400 border border-yellow-500'
                        }`}>
                          {reg.registration_status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs bg-ff-dark p-2 rounded">
                        <div>Slot Assigned: <span className="text-ff-cyan font-bold font-mono">#{reg.slot_number || 'Pending'}</span></div>
                        <div>Payment: <span className="uppercase font-bold">{reg.payment_status}</span></div>
                      </div>

                      {/* Room Credentials Section */}
                      {isConfirmed && (
                        <div className="pt-2 border-t border-ff-border">
                          {room ? (
                            <div className="bg-black/60 border border-ff-orange/50 p-3 rounded-lg space-y-1.5 text-xs font-mono">
                              <div className="text-ff-yellow font-black flex items-center space-x-1">
                                <Key className="w-3.5 h-3.5" />
                                <span>ROOM CREDENTIALS</span>
                              </div>
                              <div>Room ID: <strong className="text-white text-sm select-all">{room.room_id}</strong></div>
                              <div>Password: <strong className="text-white text-sm select-all">{room.password}</strong></div>
                              <div>Map: <span className="text-gray-300">{room.map_name || 'Bermuda'}</span></div>
                              {room.custom_message && (
                                <div className="text-gray-400 text-[11px] font-sans italic mt-1">
                                  Note: {room.custom_message}
                                </div>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => fetchRoomCredentials(reg.lobby_id)}
                              className="w-full py-2 bg-ff-dark hover:bg-ff-border border border-ff-cyan/40 rounded-lg text-xs font-bold text-ff-cyan flex items-center justify-center space-x-1"
                            >
                              <Key className="w-3.5 h-3.5" />
                              <span>Reveal Room ID & Password</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: ADMIN PANEL */}
        {currentView === 'admin' && isAdmin && (
          <AdminPanel />
        )}
      </main>

      {/* Registration Modal Popup */}
      {selectedLobbyForReg && (
        <RegistrationModal
          lobby={selectedLobbyForReg}
          upiSettings={upiSettings}
          onClose={() => setSelectedLobbyForReg(null)}
          onSuccess={() => {
            loadData();
          }}
        />
      )}
    </div>
  );
}
