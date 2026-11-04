import express from 'express';
import { lobbyService } from '../services/lobbyService.js';
import { registrationService } from '../services/registrationService.js';
import { paymentService } from '../services/paymentService.js';
import { roomService } from '../services/roomService.js';
import { userService } from '../services/userService.js';
import { resultService } from '../services/resultService.js';
import { auditService } from '../services/auditService.js';
import { validateTelegramInitData, validateFreeFireUid, validatePlayerName } from '../validators/auth.js';
import { config } from '../config/index.js';

export const apiRouter = express.Router();

apiRouter.use(express.json({ limit: '10mb' }));

/**
 * Authentication Middleware using Telegram WebApp initData
 */
export async function authenticateTelegramUser(req, res, next) {
  const initData = req.headers['x-telegram-init-data'] || req.query.initData;

  // In test/mock mode without botToken configured, permit mock-auth if explicitly provided
  if (!config.botToken && req.headers['x-mock-telegram-id']) {
    req.telegramUser = {
      id: parseInt(req.headers['x-mock-telegram-id'], 10),
      first_name: req.headers['x-mock-first-name'] || 'Player'
    };
    return next();
  }

  if (!initData) {
    return res.status(401).json({ success: false, error: 'AUTH_REQUIRED', message: 'Telegram authentication required' });
  }

  const validation = validateTelegramInitData(initData, config.botToken);
  if (!validation.valid || !validation.user) {
    return res.status(401).json({ success: false, error: 'INVALID_AUTH', details: validation.error });
  }

  req.telegramUser = validation.user;
  next();
}

/**
 * RBAC Admin Authorization Middleware
 */
export async function requireAdmin(req, res, next) {
  if (!req.telegramUser) {
    return res.status(401).json({ success: false, error: 'AUTH_REQUIRED' });
  }

  const role = await userService.getAdminRole(req.telegramUser.id);
  if (!role) {
    return res.status(403).json({ success: false, error: 'FORBIDDEN', message: 'Admin access required' });
  }

  req.adminRole = role;
  next();
}

// ======================== PUBLIC ENDPOINTS ========================

// 1. Get lobbies
apiRouter.get('/lobbies', async (req, res) => {
  try {
    const { status, feeType } = req.query;
    const lobbies = await lobbyService.getLobbies({ status, feeType });
    res.json({ success: true, lobbies });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Get lobby details by ID
apiRouter.get('/lobbies/:id', async (req, res) => {
  try {
    const lobby = await lobbyService.getLobbyById(req.params.id);
    if (!lobby) {
      return res.status(404).json({ success: false, error: 'LOBBY_NOT_FOUND' });
    }
    res.json({ success: true, lobby });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Get UPI payment settings
apiRouter.get('/settings/upi', async (req, res) => {
  try {
    const settings = await paymentService.getUpiSettings();
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===================== AUTHENTICATED USER ENDPOINTS =====================

// 4. Get User Profile & Bot Status
apiRouter.get('/me', authenticateTelegramUser, async (req, res) => {
  try {
    const user = await userService.getUserByTelegramId(req.telegramUser.id);
    const adminRole = await userService.getAdminRole(req.telegramUser.id);

    res.json({
      success: true,
      user: user || null,
      telegramUser: req.telegramUser,
      hasStartedBot: !!user?.has_started_bot,
      adminRole: adminRole || null
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Register in a lobby
apiRouter.post('/lobbies/:id/register', authenticateTelegramUser, async (req, res) => {
  try {
    const lobbyId = req.params.id;
    const { playerName, freeFireUid, transactionReference, screenshotUrl, amount } = req.body;

    if (!validatePlayerName(playerName)) {
      return res.status(400).json({ success: false, error: 'INVALID_NAME', message: 'Name must be 2-32 characters' });
    }

    if (!validateFreeFireUid(freeFireUid)) {
      return res.status(400).json({ success: false, error: 'INVALID_UID', message: 'Free Fire UID must be 6-16 numeric digits' });
    }

    const lobby = await lobbyService.getLobbyById(lobbyId);
    if (!lobby) {
      return res.status(404).json({ success: false, error: 'LOBBY_NOT_FOUND' });
    }

    const isPaid = lobby.entry_fee > 0;

    if (isPaid && !transactionReference) {
      return res.status(400).json({ success: false, error: 'TRANSACTION_REF_REQUIRED', message: 'Transaction reference is required for paid lobbies' });
    }

    const result = await registrationService.registerPlayer({
      lobbyId,
      telegramId: req.telegramUser.id,
      playerName,
      freeFireUid,
      isPaid,
      transactionReference,
      screenshotUrl,
      amount: lobby.entry_fee
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Get my registrations
apiRouter.get('/me/registrations', authenticateTelegramUser, async (req, res) => {
  try {
    const registrations = await registrationService.getPlayerRegistrations(req.telegramUser.id);
    res.json({ success: true, registrations });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Get Room Details for Confirmed Player
apiRouter.get('/lobbies/:id/room-details', authenticateTelegramUser, async (req, res) => {
  try {
    const lobbyId = req.params.id;
    const adminRole = await userService.getAdminRole(req.telegramUser.id);
    const isAdmin = !!adminRole;

    const details = await roomService.getRoomDetails(lobbyId, req.telegramUser.id, isAdmin);
    res.json(details);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Submit Match Result
apiRouter.post('/lobbies/:id/results', authenticateTelegramUser, async (req, res) => {
  try {
    const lobbyId = req.params.id;
    const { position, kills, evidenceUrl } = req.body;
    const user = await userService.getUserByTelegramId(req.telegramUser.id);

    if (!user) {
      return res.status(400).json({ success: false, error: 'USER_NOT_FOUND' });
    }

    const result = await resultService.submitResult({
      lobbyId,
      userId: user.id,
      playerName: user.player_name || 'Player',
      freeFireUid: user.free_fire_uid || '',
      position,
      kills,
      evidenceUrl
    });

    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. Get Lobby Leaderboard
apiRouter.get('/lobbies/:id/leaderboard', async (req, res) => {
  try {
    const leaderboard = await resultService.getLobbyLeaderboard(req.params.id);
    res.json({ success: true, leaderboard });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ======================== ADMIN ENDPOINTS ========================

// 10. Admin: Create Lobby
apiRouter.post('/admin/lobbies', authenticateTelegramUser, requireAdmin, async (req, res) => {
  try {
    const lobby = await lobbyService.createLobby({
      ...req.body,
      createdBy: req.telegramUser.id
    });

    await auditService.logAction({
      adminId: req.telegramUser.id,
      action: 'CREATE_LOBBY',
      entityType: 'lobby',
      entityId: lobby.id,
      details: { name: lobby.name, fee: lobby.entry_fee }
    });

    res.json({ success: true, lobby });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 11. Admin: Update Lobby
apiRouter.put('/admin/lobbies/:id', authenticateTelegramUser, requireAdmin, async (req, res) => {
  try {
    const lobby = await lobbyService.updateLobby(req.params.id, req.body);
    await auditService.logAction({
      adminId: req.telegramUser.id,
      action: 'UPDATE_LOBBY',
      entityType: 'lobby',
      entityId: req.params.id,
      details: req.body
    });
    res.json({ success: true, lobby });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 12. Admin: Get Lobby Participants
apiRouter.get('/admin/lobbies/:id/participants', authenticateTelegramUser, requireAdmin, async (req, res) => {
  try {
    const { status, search } = req.query;
    const participants = await registrationService.getParticipants(req.params.id, { status, search });
    res.json({ success: true, participants });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 13. Admin: Kick / Cancel Player Registration
apiRouter.post('/admin/registrations/:id/cancel', authenticateTelegramUser, requireAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const cancelled = await registrationService.cancelRegistration(req.params.id, reason);
    await auditService.logAction({
      adminId: req.telegramUser.id,
      action: 'CANCEL_REGISTRATION',
      entityType: 'registration',
      entityId: req.params.id,
      details: { reason }
    });
    res.json({ success: true, registration: cancelled });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 14. Admin: Get Pending Payments
apiRouter.get('/admin/payments', authenticateTelegramUser, requireAdmin, async (req, res) => {
  try {
    const { lobbyId } = req.query;
    const payments = await paymentService.getPendingPayments(lobbyId);
    res.json({ success: true, payments });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 15. Admin: Approve Payment
apiRouter.post('/admin/payments/:id/approve', authenticateTelegramUser, requireAdmin, async (req, res) => {
  try {
    const { notes } = req.body;
    const result = await paymentService.approvePayment(req.params.id, req.telegramUser.id, notes);
    await auditService.logAction({
      adminId: req.telegramUser.id,
      action: 'APPROVE_PAYMENT',
      entityType: 'payment',
      entityId: req.params.id
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 16. Admin: Reject Payment
apiRouter.post('/admin/payments/:id/reject', authenticateTelegramUser, requireAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const result = await paymentService.rejectPayment(req.params.id, req.telegramUser.id, reason);
    await auditService.logAction({
      adminId: req.telegramUser.id,
      action: 'REJECT_PAYMENT',
      entityType: 'payment',
      entityId: req.params.id,
      details: { reason }
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 17. Admin: Publish Room Details
apiRouter.post('/admin/lobbies/:id/room-details', authenticateTelegramUser, requireAdmin, async (req, res) => {
  try {
    const saved = await roomService.saveRoomDetails({
      lobbyId: req.params.id,
      ...req.body,
      publishedBy: req.telegramUser.id
    });
    await auditService.logAction({
      adminId: req.telegramUser.id,
      action: 'PUBLISH_ROOM_DETAILS',
      entityType: 'lobby_room_details',
      entityId: saved.id
    });
    res.json({ success: true, roomDetails: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 18. Admin: Get Audit Logs
apiRouter.get('/admin/audit-logs', authenticateTelegramUser, requireAdmin, async (req, res) => {
  try {
    const logs = await auditService.getRecentLogs(req.query.limit || 50);
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
