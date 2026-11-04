-- Supabase PostgreSQL Migration for Free Fire Multi-Lobby Tournament Platform
-- Migration: 001_initial_schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telegram_id BIGINT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    username TEXT,
    player_name TEXT,
    free_fire_uid TEXT,
    has_started_bot BOOLEAN DEFAULT FALSE,
    account_status TEXT DEFAULT 'active' CHECK (account_status IN ('active', 'banned', 'suspended')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_ff_uid ON users(free_fire_uid);

-- 2. ADMINS TABLE
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telegram_id BIGINT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'moderator' CHECK (role IN ('owner', 'superadmin', 'moderator', 'support', 'result_manager')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    added_by BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admins_telegram_id ON admins(telegram_id);

-- 3. LOBBIES TABLE
CREATE TABLE IF NOT EXISTS lobbies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    entry_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    currency TEXT DEFAULT 'INR',
    fee_type TEXT DEFAULT 'free' CHECK (fee_type IN ('free', 'paid')),
    capacity INTEGER NOT NULL DEFAULT 48 CHECK (capacity > 0),
    current_participants INTEGER NOT NULL DEFAULT 0 CHECK (current_participants >= 0),
    registration_deadline TIMESTAMPTZ NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('draft', 'upcoming', 'open', 'paused', 'closed', 'live', 'completed', 'cancelled', 'archived')),
    rules TEXT,
    prize_pool TEXT,
    created_by BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lobbies_status ON lobbies(status);
CREATE INDEX IF NOT EXISTS idx_lobbies_start_time ON lobbies(start_time);

-- 4. REGISTRATIONS TABLE
CREATE TABLE IF NOT EXISTS registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lobby_id UUID NOT NULL REFERENCES lobbies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    telegram_id BIGINT NOT NULL,
    player_name TEXT NOT NULL,
    free_fire_uid TEXT NOT NULL,
    registration_status TEXT NOT NULL DEFAULT 'confirmed' CHECK (registration_status IN ('pending_payment', 'confirmed', 'cancelled', 'kicked')),
    payment_status TEXT NOT NULL DEFAULT 'free' CHECK (payment_status IN ('free', 'pending', 'approved', 'rejected', 'refunded')),
    slot_number INTEGER,
    cancellation_reason TEXT,
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_lobby_user UNIQUE (lobby_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_registrations_lobby_id ON registrations(lobby_id);
CREATE INDEX IF NOT EXISTS idx_registrations_user_id ON registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations(lobby_id, registration_status);
CREATE INDEX IF NOT EXISTS idx_registrations_tg_id ON registrations(telegram_id);

-- 5. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lobby_id UUID NOT NULL REFERENCES lobbies(id) ON DELETE CASCADE,
    registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    telegram_id BIGINT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    transaction_reference TEXT UNIQUE NOT NULL,
    screenshot_url TEXT,
    screenshot_file_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'refunded')),
    reviewed_by BIGINT,
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_tx_ref ON payments(transaction_reference);
CREATE INDEX IF NOT EXISTS idx_payments_lobby ON payments(lobby_id);

-- 6. LOBBY ROOM DETAILS TABLE
CREATE TABLE IF NOT EXISTS lobby_room_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lobby_id UUID UNIQUE NOT NULL REFERENCES lobbies(id) ON DELETE CASCADE,
    tournament_id TEXT,
    room_id TEXT NOT NULL,
    password TEXT NOT NULL,
    map_name TEXT DEFAULT 'Bermuda',
    match_time TEXT,
    custom_message TEXT,
    instructions TEXT,
    published_by BIGINT NOT NULL,
    published_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_room_details_lobby ON lobby_room_details(lobby_id);

-- 7. ROOM MESSAGE DELIVERIES TABLE
CREATE TABLE IF NOT EXISTS room_message_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lobby_id UUID NOT NULL REFERENCES lobbies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    telegram_id BIGINT NOT NULL,
    message_type TEXT DEFAULT 'room_credentials' CHECK (message_type IN ('room_credentials', 'announcement', 'custom')),
    message_content TEXT NOT NULL,
    message_id BIGINT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'blocked')),
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deliveries_lobby_status ON room_message_deliveries(lobby_id, status);
CREATE INDEX IF NOT EXISTS idx_deliveries_telegram_id ON room_message_deliveries(telegram_id);

-- 8. NOTIFICATIONS QUEUE TABLE
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lobby_id UUID REFERENCES lobbies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    telegram_id BIGINT NOT NULL,
    title TEXT,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);

-- 9. RESULTS & LEADERBOARDS TABLE
CREATE TABLE IF NOT EXISTS results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lobby_id UUID NOT NULL REFERENCES lobbies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    player_name TEXT NOT NULL,
    free_fire_uid TEXT NOT NULL,
    position INTEGER NOT NULL CHECK (position >= 1),
    kills INTEGER NOT NULL DEFAULT 0 CHECK (kills >= 0),
    points INTEGER NOT NULL DEFAULT 0,
    evidence_file_id TEXT,
    evidence_url TEXT,
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'rejected')),
    approved_by BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_results_lobby ON results(lobby_id);

-- 10. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id BIGINT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- 11. TELEGRAM GROUPS TABLE
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telegram_chat_id BIGINT UNIQUE NOT NULL,
    title TEXT,
    username TEXT,
    bot_status TEXT DEFAULT 'active' CHECK (bot_status IN ('active', 'kicked', 'restricted')),
    settings JSONB DEFAULT '{}'::jsonb,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_groups_chat_id ON groups(telegram_chat_id);

-- 12. APP SETTINGS TABLE
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default Settings Insert
INSERT INTO app_settings (key, value, description)
VALUES
    ('upi_settings', '{"upi_id": "tournament@upi", "payee_name": "Free Fire Esports", "qr_image_url": "", "instructions": "Pay entry fee via UPI and enter UTR / Txn Reference ID"}'::jsonb, 'UPI Payment Configuration'),
    ('tournament_rules', '{"rules": ["1. Hackers / Script users will be banned immediately.", "2. Team teaming up in solo will lead to disqualification.", "3. Room ID & Password will be sent 10 minutes prior.", "4. Emulator players are prohibited unless specified."]}'::jsonb, 'General Tournament Rules'),
    ('system_config', '{"allow_duplicate_uid_across_accounts": false, "require_bot_start": true, "auto_close_on_full": true}'::jsonb, 'Platform Rules & Safety Flags')
ON CONFLICT (key) DO NOTHING;

-- 13. ATOMIC REGISTRATION FUNCTIONS
-- Function to atomically register a player in a lobby to avoid race conditions & overbooking
CREATE OR REPLACE FUNCTION register_player_atomic(
    p_lobby_id UUID,
    p_user_id UUID,
    p_telegram_id BIGINT,
    p_player_name TEXT,
    p_ff_uid TEXT,
    p_is_paid BOOLEAN,
    p_transaction_ref TEXT DEFAULT NULL,
    p_screenshot_url TEXT DEFAULT NULL,
    p_screenshot_file_id TEXT DEFAULT NULL,
    p_amount NUMERIC DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_lobby RECORD;
    v_existing_reg RECORD;
    v_new_reg_id UUID;
    v_new_payment_id UUID;
    v_slot INTEGER;
    v_reg_status TEXT;
    v_pay_status TEXT;
BEGIN
    -- 1. Lock the lobby row for update
    SELECT * INTO v_lobby FROM lobbies WHERE id = p_lobby_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'LOBBY_NOT_FOUND', 'message', 'Lobby not found');
    END IF;

    -- 2. Verify lobby status
    IF v_lobby.status NOT IN ('upcoming', 'open') THEN
        RETURN jsonb_build_object('success', false, 'error', 'LOBBY_NOT_OPEN', 'message', 'Registration for this lobby is closed or not open');
    END IF;

    -- 3. Verify deadline
    IF NOW() > v_lobby.registration_deadline THEN
        RETURN jsonb_build_object('success', false, 'error', 'DEADLINE_PASSED', 'message', 'Registration deadline has passed');
    END IF;

    -- 4. Check existing registration
    SELECT * INTO v_existing_reg FROM registrations
    WHERE lobby_id = p_lobby_id AND user_id = p_user_id;

    IF FOUND THEN
        IF v_existing_reg.registration_status IN ('confirmed', 'pending_payment') THEN
            RETURN jsonb_build_object('success', false, 'error', 'ALREADY_REGISTERED', 'message', 'You are already registered for this lobby');
        END IF;
    END IF;

    -- 5. Check capacity
    IF v_lobby.current_participants >= v_lobby.capacity THEN
        RETURN jsonb_build_object('success', false, 'error', 'LOBBY_FULL', 'message', 'Lobby is full');
    END IF;

    -- 6. Determine slot and initial status
    IF p_is_paid THEN
        v_reg_status := 'pending_payment';
        v_pay_status := 'pending';
        v_slot := NULL; -- slot assigned on payment approval or pre-reserved
    ELSE
        v_reg_status := 'confirmed';
        v_pay_status := 'free';
        v_slot := v_lobby.current_participants + 1;

        -- Increment confirmed participant count atomically
        UPDATE lobbies
        SET current_participants = current_participants + 1,
            updated_at = NOW()
        WHERE id = p_lobby_id;
    END IF;

    -- 7. Insert or update registration
    IF FOUND AND v_existing_reg.registration_status IN ('cancelled', 'kicked') THEN
        UPDATE registrations
        SET player_name = p_player_name,
            free_fire_uid = p_ff_uid,
            registration_status = v_reg_status,
            payment_status = v_pay_status,
            slot_number = v_slot,
            cancellation_reason = NULL,
            registered_at = NOW(),
            updated_at = NOW()
        WHERE id = v_existing_reg.id
        RETURNING id INTO v_new_reg_id;
    ELSE
        INSERT INTO registrations (
            lobby_id, user_id, telegram_id, player_name, free_fire_uid,
            registration_status, payment_status, slot_number
        )
        VALUES (
            p_lobby_id, p_user_id, p_telegram_id, p_player_name, p_ff_uid,
            v_reg_status, v_pay_status, v_slot
        )
        RETURNING id INTO v_new_reg_id;
    END IF;

    -- 8. If paid, create payment record
    IF p_is_paid AND p_transaction_ref IS NOT NULL THEN
        INSERT INTO payments (
            lobby_id, registration_id, user_id, telegram_id, amount,
            transaction_reference, screenshot_url, screenshot_file_id, status
        )
        VALUES (
            p_lobby_id, v_new_reg_id, p_user_id, p_telegram_id, p_amount,
            p_transaction_ref, p_screenshot_url, p_screenshot_file_id, 'pending'
        )
        RETURNING id INTO v_new_payment_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'registration_id', v_new_reg_id,
        'status', v_reg_status,
        'payment_status', v_pay_status,
        'slot_number', v_slot,
        'lobby_id', p_lobby_id
    );
END;
$$;

-- Function to atomically approve payment and confirm slot
CREATE OR REPLACE FUNCTION approve_payment_atomic(
    p_payment_id UUID,
    p_admin_tg_id BIGINT,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_payment RECORD;
    v_lobby RECORD;
    v_reg RECORD;
    v_next_slot INTEGER;
BEGIN
    -- 1. Fetch and lock payment
    SELECT * INTO v_payment FROM payments WHERE id = p_payment_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'PAYMENT_NOT_FOUND', 'message', 'Payment record not found');
    END IF;

    IF v_payment.status = 'approved' THEN
        RETURN jsonb_build_object('success', false, 'error', 'ALREADY_APPROVED', 'message', 'Payment is already approved');
    END IF;

    -- 2. Lock lobby
    SELECT * INTO v_lobby FROM lobbies WHERE id = v_payment.lobby_id FOR UPDATE;
    IF v_lobby.current_participants >= v_lobby.capacity THEN
        RETURN jsonb_build_object('success', false, 'error', 'LOBBY_FULL', 'message', 'Cannot approve: lobby is already full');
    END IF;

    -- 3. Calculate next slot
    v_next_slot := v_lobby.current_participants + 1;

    -- 4. Update lobby
    UPDATE lobbies
    SET current_participants = current_participants + 1,
        updated_at = NOW()
    WHERE id = v_lobby.id;

    -- 5. Update registration
    UPDATE registrations
    SET registration_status = 'confirmed',
        payment_status = 'approved',
        slot_number = v_next_slot,
        updated_at = NOW()
    WHERE id = v_payment.registration_id;

    -- 6. Update payment
    UPDATE payments
    SET status = 'approved',
        reviewed_by = p_admin_tg_id,
        reviewed_at = NOW(),
        admin_notes = p_notes,
        updated_at = NOW()
    WHERE id = p_payment_id;

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', p_payment_id,
        'registration_id', v_payment.registration_id,
        'lobby_id', v_payment.lobby_id,
        'user_id', v_payment.user_id,
        'telegram_id', v_payment.telegram_id,
        'slot_number', v_next_slot
    );
END;
$$;
