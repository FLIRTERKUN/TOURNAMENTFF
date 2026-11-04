const API_BASE = '/api';

function getInitData() {
  if (window.Telegram?.WebApp?.initData) {
    return window.Telegram.WebApp.initData;
  }
  return '';
}

export const api = {
  async get(endpoint) {
    const initData = getInitData();
    const headers = { 'Content-Type': 'application/json' };
    if (initData) headers['x-telegram-init-data'] = initData;

    const res = await fetch(`${API_BASE}${endpoint}`, { headers });
    return res.json();
  },

  async post(endpoint, body) {
    const initData = getInitData();
    const headers = { 'Content-Type': 'application/json' };
    if (initData) headers['x-telegram-init-data'] = initData;

    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    return res.json();
  },

  async put(endpoint, body) {
    const initData = getInitData();
    const headers = { 'Content-Type': 'application/json' };
    if (initData) headers['x-telegram-init-data'] = initData;

    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body)
    });
    return res.json();
  }
};
