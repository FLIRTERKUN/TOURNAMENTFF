import test from 'node:test';
import assert from 'node:assert/strict';
import { setSupabaseClient } from '../src/database/client.js';
import { registrationService } from '../src/services/registrationService.js';
import { roomService } from '../src/services/roomService.js';
import { userService } from '../src/services/userService.js';

test('Mandatory Bot Start check rejects user who has not started bot', async () => {
  // Mock Supabase client returning user with has_started_bot = false
  const mockClient = {
    from(tableName) {
      return {
        select() {
          return {
            eq(col, val) {
              return {
                maybeSingle: async () => ({
                  data: { id: 'uuid-1', telegram_id: 111, has_started_bot: false },
                  error: null
                })
              };
            }
          };
        }
      };
    }
  };

  setSupabaseClient(mockClient);

  const res = await registrationService.registerPlayer({
    lobbyId: 'lobby-uuid-1',
    telegramId: 111,
    playerName: 'Killer',
    freeFireUid: '123456789'
  });

  assert.equal(res.success, false);
  assert.equal(res.error, 'BOT_NOT_STARTED');
  assert.match(res.message, /Please start our Telegram bot first/);
});

test('Room Details Isolation: Unconfirmed user cannot view room credentials', async () => {
  const mockClient = {
    from(tableName) {
      return {
        select() {
          return {
            eq(col, val) {
              return this;
            },
            maybeSingle: async () => {
              // Simulating registration not found / not confirmed
              return { data: null, error: null };
            }
          };
        }
      };
    }
  };

  setSupabaseClient(mockClient);

  const res = await roomService.getRoomDetails('lobby-uuid-1', 999999, false);
  assert.equal(res.authorized, false);
  assert.equal(res.error, 'UNAUTHORIZED_OR_NOT_CONFIRMED');
});
