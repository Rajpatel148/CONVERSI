# CONVERSI

A full‑stack real‑time chat application with 1:1 and group messaging, typing indicators, media sharing, presence, and built‑in voice/video calling powered by Agora. Built with Node.js/Express, MongoDB, Socket.IO, and React + Vite.

> Live chat UX with call invites, ringing, and 10‑minute call sessions. Secure authentication uses JWT (httpOnly cookies and optional Authorization header).

## Features

- Auth: Sign up, login, logout, JWT cookies, update profile, change avatar/password, delete account
- Chats: 1:1 and groups, unread counters per user, latest message preview, media messages, delete for me/everyone
- Real‑time: Typing indicator, message delivery, presence (online/offline), per‑user rooms
- Calling: Voice and video calls via Agora, invite/accept/decline/cancel, ring tone, time limit, device permission handling
- Responsive UI: React + Vite with modern components and toasts

## Tech Stack

- Backend: Node.js (ESM), Express 5, MongoDB (Mongoose), Socket.IO, JWT, bcrypt, dotenv, CORS, cookie‑parser
- Frontend: React 19, Vite, Socket.IO Client, Axios, MUI, Lucide Icons, react‑hot‑toast
- Realtime/RTC: Agora Web SDK NG
- Deployment: Vercel (frontend). Backend can be hosted on your server/VM/Render/Railway/etc.

## Monorepo structure

```
backend/
  src/
    app.js              # Express app + CORS/cookies/static
    index.js            # HTTP + Socket.IO server bootstrap
    db/index.js         # Mongo connection
    constants.js        # DB name
    middlewares/
      auth.middleware.js
    models/             # User, Chat, Message schemas
    controllers/        # user, chat, message, call
    routes/             # /api/v1/*
    socket/             # socket init + event handler
  package.json

frontend/
  src/
    api/axios.js        # Axios client
    context/Authcotext.jsx
    components/...      # Dashboard, Chat, Call boxes
    lib/agora.js
  vite.config.js
  vercel.json           # SPA rewrites
  package.json
```

## Environment variables

Create two .env files, one for backend and one for frontend.

### backend/.env

- PORT=4000
- FRONTEND_URL=http://localhost:5173
- MONGODB_URL=mongodb://127.0.0.1:27017
- ACCESS_TOKEN_SECRET=your_access_secret
- ACCESS_TOKEN_EXPIRY=7d
- REFRESH_TOKEN_SECRET=your_refresh_secret
- REFRESH_TOKEN_EXPIRY=30d
- AGORA_APP_ID=your_agora_app_id
- AGORA_APP_CERT=your_agora_app_certificate
- AGORA_TOKEN_EXPIRE=3600               # seconds
- CALL_TIME_LIMIT_MS=600000             # 10 minutes

Notes
- Cookies are set with SameSite=None; Secure=true in production. Use HTTPS for frontend to receive cookies from a different origin.
- CORS origin must match your frontend origin exactly.

### frontend/.env

- VITE_BASE_URL=http://localhost:4000           # Socket.IO server URL
- VITE_BACKEND_API_URL=http://localhost:4000/api/v1
- VITE_AGORA_APP_ID=your_agora_app_id           # Optional; backend responds with appId
- VITE_CLOUD_NAME=your_cloudinary_cloud_name
- VITE_CLOUDINARY_PRESET_NAME=unsigned_preset

## Install and run (Windows PowerShell)

From the repo root, install and start both apps in separate terminals.

Backend

```powershell
cd backend; npm install; npm start
```

Frontend

```powershell
cd frontend; npm install; npm run dev
```

- Backend defaults to http://localhost:4000
- Vite dev server defaults to http://localhost:5173

## API overview (REST)

Base URL: /api/v1

Auth (user.routes)
- GET /user/validate → 200 if cookie present
- POST /user/signup { username, fullname, email, password, avatar? }
- POST /user/login { username, email, password }
- POST /user/logout (JWT required)
- POST /user/update-account { fullname, username? } (JWT)
- POST /user/change-password { oldPassword, newPassword } (JWT)
- POST /user/change-avatar { avatar } (JWT)
- DELETE /user/me (JWT) — deletes account, cleans up chats/messages

Chats (chat.routes, JWT)
- POST /chat/create { members: [userIds], name? } — group if >2
- GET  /chat/list — chats where requester is a member (excludes self from members in response)
- GET  /chat/non-friends — users not in any 1:1 chat with requester
- GET  /chat/:id — chat details

Messages (message.routes, JWT)
- POST /message/send { chatId, senderId, text?|imageUrl? }
- GET  /message/c/:chatId — list messages; marks seen; resets unread count
- POST /message/delete { messageId, userIds } — delete for me or everyone

Calls (call.routes)
- GET  /call/token?channel=abc&uid=123 — Agora RTC token
- POST /call/start { callId, channel, callerId, calleeId } — server starts auto end‑timer
- POST /call/end { callId } — ends the call and notifies peers

## Socket events (client ↔ server)

Connection
- setup: userId → joins personal room and marks online

Presence
- user-online: userId (broadcast)
- user-offline: userId (broadcast on logout)

Chat
- join-chat { roomId, userId }
- leave-chat roomId
- send-message chatId → server emits receive-message to room and new-message-notification to members
- typing { chatId, ... }
- stop-typing { chatId, ... }
- message-deleted { messageId, chatId }

Calling (signaling)
- call-invite { to, from, callId, channel, kind: "audio"|"video" }
- call-accept { to, from, callId, channel }
- call-decline { to, from, callId }
- call-cancelled { to, from, callId }
- end-call { callId, reason } (server → clients)

## Data models (MongoDB)

User
- username, fullname, email, password (hashed), avatar, isOnline, lastSeen, refreshToken
- Methods: generateAccessToken, generateRefreshToken

Chat
- members [ObjectId<User>], isGroup, name?, groupAdmin?, latestMsg, unreadCounts [{ userId, count }]

Message
- senderId, chatId, text?|imageUrl?, reaction, seenBy [{ user, seenAt }], deletedFrom [userId], replyTo?

## Deployment notes

Frontend (Vercel)
- `vercel.json` rewrites all routes to `index.html` for SPA routing.
- Set env variables in Vercel project for VITE_* keys.

Backend
- Provide all backend .env values on your host. Expose PORT and ensure CORS FRONTEND_URL matches deployed frontend origin.
- If using HTTPS on frontend and a different domain, cookies require Secure and SameSite=None (already configured in code).

## Troubleshooting

- CORS/auth cookie not sent: Ensure FRONTEND_URL matches exactly and you are using HTTPS for cross‑site cookies. Also set VITE_BACKEND_API_URL to your /api/v1 base.
- Mongo connect fails: Check MONGODB_URL and that your Mongo service is running and reachable.
- 401 Unauthorized: Make sure you include the access token as an httpOnly cookie (server sets on login/signup) or through Authorization header (frontend helper setAuthToken does this after login).
- Agora errors or no media: Verify AGORA_APP_ID/APP_CERT. On Windows, close apps that lock the camera (Zoom/Teams/OBS). Check browser permissions and use https or localhost.
- Socket not connecting: Confirm VITE_BASE_URL points to your backend origin/port and that backend `initServer` CORS origin matches FRONTEND_URL.

## License

This project is provided under the ISC license. (Update if you prefer a different license.)
