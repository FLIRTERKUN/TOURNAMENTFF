import crypto from 'crypto';

/**
 * Validates Telegram Mini App initData according to official Telegram documentation
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * @param {string} initData - The raw initData query string from window.Telegram.WebApp.initData
 * @param {string} botToken - The Telegram bot token
 * @param {number} maxAgeSeconds - Maximum age of authentication in seconds (default 1 day = 86400s)
 * @returns {{ valid: boolean, user?: object, error?: string }}
 */
export function validateTelegramInitData(initData, botToken, maxAgeSeconds = 86400) {
  if (!initData) {
    return { valid: false, error: 'MISSING_INIT_DATA' };
  }
  if (!botToken) {
    return { valid: false, error: 'BOT_TOKEN_NOT_CONFIGURED' };
  }

  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    if (!hash) {
      return { valid: false, error: 'MISSING_HASH' };
    }

    // Sort params alphabetically excluding hash
    const dataCheckArr = [];
    const sortedKeys = Array.from(urlParams.keys()).filter(k => k !== 'hash').sort();

    for (const key of sortedKeys) {
      dataCheckArr.push(`${key}=${urlParams.get(key)}`);
    }

    const dataCheckString = dataCheckArr.join('\n');

    // Calculate secret key: HMAC_SHA256("WebAppData", botToken)
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    // Calculate signature: HMAC_SHA256(secretKey, dataCheckString)
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (calculatedHash !== hash) {
      return { valid: false, error: 'INVALID_SIGNATURE' };
    }

    // Check auth_date expiration
    const authDate = parseInt(urlParams.get('auth_date') || '0', 10);
    const now = Math.floor(Date.now() / 1000);
    if (authDate <= 0 || (now - authDate) > maxAgeSeconds) {
      return { valid: false, error: 'AUTH_EXPIRED' };
    }

    // Extract user JSON
    const userString = urlParams.get('user');
    let user = null;
    if (userString) {
      user = JSON.parse(userString);
    }

    return {
      valid: true,
      user,
      authDate: new Date(authDate * 1000),
      queryId: urlParams.get('query_id')
    };
  } catch (err) {
    return { valid: false, error: 'PARSE_ERROR', details: err.message };
  }
}

/**
 * Validate Free Fire UID (must be numeric string, 6-16 characters)
 */
export function validateFreeFireUid(uid) {
  if (!uid || typeof uid !== 'string') return false;
  const trimmed = uid.trim();
  return /^\d{6,16}$/.test(trimmed);
}

/**
 * Validate Player In-Game Name (3-30 characters, no dangerous scripts)
 */
export function validatePlayerName(name) {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  return trimmed.length >= 2 && trimmed.length <= 32;
}
