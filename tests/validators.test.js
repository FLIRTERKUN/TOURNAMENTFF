import test from 'node:test';
import assert from 'node:assert/strict';
import { validateTelegramInitData, validateFreeFireUid, validatePlayerName } from '../src/validators/auth.js';
import crypto from 'crypto';

test('Validator: validateFreeFireUid', () => {
  assert.equal(validateFreeFireUid('123456789'), true);
  assert.equal(validateFreeFireUid('987654321012'), true);
  assert.equal(validateFreeFireUid('123'), false); // too short
  assert.equal(validateFreeFireUid('abc123456'), false); // non-numeric
  assert.equal(validateFreeFireUid(''), false);
  assert.equal(validateFreeFireUid(null), false);
});

test('Validator: validatePlayerName', () => {
  assert.equal(validatePlayerName('RAISTAR'), true);
  assert.equal(validatePlayerName('T1'), true);
  assert.equal(validatePlayerName('A'), false); // too short
  assert.equal(validatePlayerName(''), false);
  assert.equal(validatePlayerName('   '), false);
  assert.equal(validatePlayerName('A'.repeat(40)), false); // too long
});

test('Validator: validateTelegramInitData with valid HMAC signature', () => {
  const botToken = '123456789:ABCdefGHIjklMNOpqrsTUVwxyz';
  const authDate = Math.floor(Date.now() / 1000);
  const userJson = JSON.stringify({ id: 987654321, first_name: 'ProGamer', username: 'pro_ff' });

  const dataParams = new URLSearchParams({
    auth_date: String(authDate),
    query_id: 'AAHdF6IQAAAAAN0XohAXj3kK',
    user: userJson
  });

  const sortedKeys = Array.from(dataParams.keys()).sort();
  const checkString = sortedKeys.map(k => `${k}=${dataParams.get(k)}`).join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const validHash = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex');

  dataParams.append('hash', validHash);
  const rawInitData = dataParams.toString();

  const result = validateTelegramInitData(rawInitData, botToken);
  assert.equal(result.valid, true);
  assert.equal(result.user?.id, 987654321);
  assert.equal(result.user?.first_name, 'ProGamer');
});

test('Validator: validateTelegramInitData with forged/tampered hash fails', () => {
  const botToken = '123456789:ABCdefGHIjklMNOpqrsTUVwxyz';
  const forgedInitData = 'auth_date=1600000000&user=%7B%22id%22%3A123%7D&hash=fakehash12345';

  const result = validateTelegramInitData(forgedInitData, botToken);
  assert.equal(result.valid, false);
  assert.equal(result.error, 'INVALID_SIGNATURE');
});
