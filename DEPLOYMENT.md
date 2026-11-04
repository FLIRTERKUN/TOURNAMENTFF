# 🚀 FREE FIRE TOURNAMENT PLATFORM DEPLOYMENT GUIDE
(TG Cloud Serverless, Supabase & Telegram Bot)

Yeh guide aapko step-by-step explain karegi ki platform ko live production me kaise deploy karna hai.

---

## 📋 PRE-REQUISITES (Zaroori Cheezein)

1. **Telegram Account** (Bot banane ke liye)
2. **Supabase Account** (Database & Auth ke liye: https://supabase.com)
3. **TG Cloud** ya koi bhi Node.js / Serverless hosting provider (Render / Railway / Vercel)
4. **Node.js 18+** installed

---

## STEP 1: SUPABASE DATABASE SETUP

1. **Supabase par jao:** [https://supabase.com](https://supabase.com) aur naya project create karo (jaise `freefire-tournaments`).
2. **Database Password** note kar lo.
3. **SQL Migration Run Karo:**
   - Left sidebar me **SQL Editor** par click karo (`>_`).
   - `New query` open karo.
   - Project ke andar file `supabase/migrations/001_initial_schema.sql` ka poora content copy karke SQL Editor me paste karo.
   - **Run** button par click karo.
   - Isse sabhi tables (`users`, `lobbies`, `registrations`, `payments`, `lobby_room_details`, `admins`, etc.) aur atomic booking stored procedures create ho jayenge.
4. **API Credentials Copy Karo:**
   - Left sidebar me **Project Settings** (gear icon) -> **API** me jao.
   - Note karo:
     - **Project URL** (e.g. `https://xyzcompany.supabase.co`)
     - **anon public key** (`SUPABASE_ANON_KEY`)
     - **service_role secret key** (`SUPABASE_SERVICE_ROLE_KEY`)

---

## STEP 2: TELEGRAM BOT SETUP (@BotFather)

1. Telegram me `@BotFather` open karo.
2. Naya bot banane ke liye command bhejo:
   ```text
   /newbot
   ```
3. Bot ka Display Name enter karo (e.g., `Free Fire Esports Arena`).
4. Bot ka Username enter karo (jo `bot` par khatam hota ho, e.g., `FreeFireArenaTournamentBot`).
5. BotFather aapko **HTTP API Token** dega. Is token ko safe rakho (`BOT_TOKEN`).
6. **Commands set karo:**
   BotFather ko `/setcommands` bhejo, apna bot select karo aur ye paste karo:
   ```text
   start - 🎮 Open Main Menu & Register Profile
   lobbies - 🏆 Browse Tournament Lobbies
   admin - ⚡ Open Admin Management Panel
   senddetails - 🔑 Send Room ID & Password to Lobby
   payments - 💳 Review Pending UPI Payments
   ```
7. **Mini App Menu Button setup karo:**
   - BotFather me `/setmenubutton` bhejo.
   - Apna bot select karo.
   - Button text daalo: `🎮 PLAY ESPORTS`
   - Mini App URL daalo: `https://your-domain.tgcloud.io` (Deployment ke baad milega).

---

## STEP 3: ENVIRONMENT VARIABLES CONFIGURATION

Hosting dashboard (TG Cloud / Serverless platform) ke Environment Settings me jaake ye variables configure karo:

| Variable Name | Description | Example Value |
|---|---|---|
| `PORT` | Web server port | `3000` |
| `NODE_ENV` | Environment mode | `production` |
| `BOT_TOKEN` | Telegram Bot Token from @BotFather | `7123456789:AA...` |
| `BOT_USERNAME` | Bot username without @ | `FreeFireArenaTournamentBot` |
| `OWNER_TELEGRAM_ID` | Aapka apna numerical Telegram User ID | `987654321` |
| `SUPABASE_URL` | Supabase Project URL | `https://yourproject.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Secret Key | `eyJhbGciOiJI...` |
| `SUPABASE_ANON_KEY` | Supabase Anon Key | `eyJhbGciOiJI...` |
| `WEBAPP_URL` | Aapka WebApp live URL | `https://your-domain.tgcloud.io` |
| `WEBHOOK_URL` | Telegram Webhook endpoint URL | `https://your-domain.tgcloud.io/api/webhook/telegram` |
| `TG_CLOUD_SERVERLESS` | Serverless runtime flag | `true` |

*(Aap apna Telegram ID `@userinfobot` ya `@raw_data_bot` par message bhej kar jaan sakte hain).*

---

## STEP 4: FRONTEND & BACKEND BUILD / DEPLOY

### Option A: TG Cloud / Standard Server Deployment
Terminal me commands run karein:
```bash
# 1. Root dependencies install karein
npm install

# 2. WebApp frontend build karein
cd webapp
npm install
npm run build
cd ..

# 3. Server start karein
npm start
```
Isse Express server backend REST API, Bot Webhook, aur built React Mini App dono ko ek hi port / URL par serve karega!

### Option B: Telegram Webhook Registration
Production domain live hone ke baad Telegram Bot ko webhook se connect karne ke liye browser ya terminal se ek baar hit karein:
```bash
curl -F "url=https://your-domain.tgcloud.io/api/webhook/telegram" https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook
```
Aapko response milega:
```json
{"ok": true, "result": true, "description": "Webhook was set"}
```

---

## STEP 5: FIRST TIME ADMIN SETUP & TESTING

1. Telegram me apne bot par jao aur `/start` bhejo.
2. Bot aapka user profile Supabase me create kar dega.
3. Agar aapne `OWNER_TELEGRAM_ID` me apna ID daala hai, toh aapko turant **Full Owner & Admin Access** mil jayega!
4. Mini App open karne ke liye bot me **"🎮 OPEN TOURNAMENT APP"** ya menu button click karo.
5. Mini App ke andar **Admin Panel** tab par click karo:
   - **Create Lobby:** Naya Free ya Paid lobby create karo.
   - **Send Details:** Match time se 10 min pehle Room ID & Password dalkar bhej do (sirf us lobby ke confirmed players ko DM me jayega).
   - **Payments:** Players ke UPI UTR / Screenshot check karke 1-click Approve ya Reject karo.
