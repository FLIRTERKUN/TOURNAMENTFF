# FREE FIRE MULTI-LOBBY TOURNAMENT PLATFORM

Production-ready Free Fire Tournament Multi-Lobby Management Platform built with Node.js, Telegram Bot API, Supabase PostgreSQL, and modern React + Tailwind CSS WebApp / Telegram Mini App.

---

## 🌟 Key Features

1. **Multi-Lobby Booking System:**
   - Unlimited independent tournament lobbies (Free ₹0, ₹15, ₹50, ₹100, custom).
   - Real-time countdown timers, synchronized between WebApp and Telegram Bot.
   - Atomic database slot reservations preventing overbooking and race conditions.
   - Duplicate prevention within the same lobby while allowing players to participate across multiple lobbies.

2. **Compulsory Bot Start Enforcement:**
   - Enforces that every player must have started the Telegram bot (`has_started_bot`) before registering.
   - Provides deep-link `https://t.me/YOUR_BOT_USERNAME?start=webapp` if user opens the webapp first.

3. **Manual UPI Verification System:**
   - Displays UPI ID and QR code details.
   - Submits 12-digit UTR/Txn reference numbers & screenshot verification.
   - Immediate Telegram Bot alert with interactive approval/rejection inline buttons.
   - Dedicated review queue in the modern Web Admin Dashboard.

4. **Private Room Details Distribution:**
   - Command `/senddetails` and Mini App Room Publisher.
   - **Critical Privacy Isolation:** Room credentials (ID, Password, Map, Notes) are strictly dispatched ONLY to confirmed participants of that specific lobby via private Telegram DM.
   - Prevents credential leak to groups, pending payment users, or other lobbies.

5. **Neat & Clean Esports Admin Panel (Telegram Bot & Mini App):**
   - Sleek esports dark theme with quick tabs.
   - Lobby creation, capacity management, status toggles.
   - One-click payment approvals & rejections.
   - Participant lists with FF UID search and player removal.
   - Audit activity logging.

---

## 🛠️ Tech Stack & Setup

- **Backend:** Node.js (ES Modules), Express, Grammy (Telegram Bot API)
- **Database:** Supabase PostgreSQL with atomic stored procedures
- **Frontend:** React 18, Vite, Tailwind CSS, Lucide icons, Telegram WebApp SDK
- **Serverless Ready:** Fully compatible with TG Cloud Serverless webhook handlers

### Environment Variables (`.env.example`)

```env
PORT=3000
NODE_ENV=production
BOT_TOKEN=your_telegram_bot_token
BOT_USERNAME=FreeFireTournamentBot
OWNER_TELEGRAM_ID=123456789
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_ANON_KEY=your_supabase_anon_key
WEBHOOK_URL=https://your-app.tgcloud.io/api/webhook/telegram
WEBAPP_URL=https://your-app.tgcloud.io
```

### Running Locally

```bash
# Install root backend dependencies
npm install

# Run automated tests
npm test

# Build frontend WebApp
cd webapp && npm install && npm run build && cd ..

# Start platform server
npm start
```
