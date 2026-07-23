# 🏗️ SUMMARY — System Architecture

This document describes the technical architecture of the SUMMARY application, a full-stack AI chat platform.

---

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                        │
│                                                                 │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  Login /      │  │    Sidebar       │  │   ChatWindow     │  │
│  │  Register     │  │  (Thread List)   │  │  (Messages +     │  │
│  │  (Auth.css)   │  │                  │  │   Input)         │  │
│  └──────┬───────┘  └────────┬─────────┘  └────────┬─────────┘  │
│         │                   │                      │            │
│         └───────────────────┼──────────────────────┘            │
│                             │                                   │
│                    React Context (MyContext)                     │
│                     State Management                            │
└─────────────────────────────┬───────────────────────────────────┘
                              │ HTTP (fetch)
                              │ JWT in Authorization header
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SERVER (Node.js + Express)                 │
│                                                                 │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  Auth Routes  │  │  Chat Routes     │  │  Thread Routes   │  │
│  │  /api/auth/*  │  │  POST /api/chat  │  │  /api/threads/*  │  │
│  └──────┬───────┘  └────────┬─────────┘  └────────┬─────────┘  │
│         │                   │                      │            │
│         ▼                   ▼                      ▼            │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ Auth          │  │ JWT Middleware   │  │ JWT Middleware   │  │
│  │ Controller    │  │ (auth.js)        │  │ (auth.js)        │  │
│  │ (bcrypt+JWT)  │  └────────┬─────────┘  └────────┬─────────┘  │
│  └──────┬───────┘           │                      │            │
│         │                   ▼                      │            │
│         │          ┌──────────────────┐            │            │
│         │          │ Gemini API Call  │            │            │
│         │          │ (utilities/      │            │            │
│         │          │  genimi.js)      │            │            │
│         │          └────────┬─────────┘            │            │
│         │                   │                      │            │
│         └───────────────────┼──────────────────────┘            │
│                             ▼                                   │
│                    Mongoose ODM Layer                            │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │    MongoDB Atlas    │
                   │                     │
                   │  ┌───────────────┐  │
                   │  │ Users         │  │
                   │  │ Collection    │  │
                   │  └───────────────┘  │
                   │  ┌───────────────┐  │
                   │  │ Threads       │  │
                   │  │ Collection    │  │
                   │  └───────────────┘  │
                   └─────────────────────┘
```

---

## Component Architecture

### Frontend (React 19 + Vite 8)

```
App.jsx
├── Auth Guard (token check)
│   ├── Login.jsx ──────── Auth.css (glassmorphism UI)
│   └── Register.jsx ──── Auth.css
│
└── Authenticated Shell
    ├── MyContext.Provider (shared state)
    │   ├── Sidebar.jsx
    │   │   ├── New Chat button
    │   │   ├── Thread list (GET /api/threads)
    │   │   └── Delete thread (DELETE /api/threads/:id)
    │   │
    │   └── ChatWindow.jsx
    │       ├── Navbar (brand + user menu + logout)
    │       ├── Chat.jsx
    │       │   ├── Previous messages (Markdown rendered)
    │       │   └── Latest reply (typing animation)
    │       └── Input bar (POST /api/chat)
    │
    └── Styles: App.css, Sidebar.css, ChatWindow.css, Chat.css
```

### State Management

The app uses **React Context** (`MyContext`) instead of a state library. A single `Provider` in `App.jsx` shares:

| State | Type | Purpose |
|-------|------|---------|
| `token` | `string` | JWT auth token (persisted in `localStorage`) |
| `currThreadId` | `string` | Active thread UUID |
| `prevChats` | `array` | Messages in the current thread |
| `allThreads` | `array` | Thread list for the sidebar |
| `prompt` | `string` | Current user input |
| `reply` | `string` | Latest AI response |
| `newChat` | `boolean` | Whether the current view is a fresh chat |

---

## Backend Architecture (Node.js + Express)

### Request Flow

```
Client Request
    │
    ▼
Express Server (server.js)
    │
    ├── cors() middleware
    ├── express.json() parser
    │
    ├── /api/auth/* ──► auth.js routes ──► authControllers.js
    │                                         ├── register()
    │                                         │   ├── Validate unique email
    │                                         │   ├── Hash password (bcrypt, salt 10)
    │                                         │   ├── Save User to MongoDB
    │                                         │   └── Sign & return JWT (7d expiry)
    │                                         └── login()
    │                                             ├── Find user by email
    │                                             ├── Compare password hash
    │                                             └── Sign & return JWT (7d expiry)
    │
    └── /api/* ──► chat.js routes
                    │
                    ├── JWT Middleware (verify token, attach req.user)
                    │
                    ├── GET  /threads      ──► Find all threads by userId
                    ├── GET  /threads/:id  ──► Find thread by threadId + userId
                    ├── DELETE /threads/:id ──► Delete thread by threadId + userId
                    │
                    └── POST /chat
                        ├── Find or create Thread
                        ├── Append user message
                        ├── Call Google Gemini API (genimi.js)
                        ├── Append assistant response
                        ├── Save thread to MongoDB
                        └── Return response to client
```

### Database Schema

```
┌─────────────────────────────────┐
│           User                  │
├─────────────────────────────────┤
│ _id        : ObjectId (PK)     │
│ name       : String (required)  │
│ email      : String (unique)    │
│ password   : String (hashed)    │
│ createdAt  : Date              │
│ updatedAt  : Date              │
└──────────────┬──────────────────┘
               │ 1:N
               ▼
┌─────────────────────────────────┐
│          Thread                 │
├─────────────────────────────────┤
│ _id        : ObjectId (PK)     │
│ userId     : ObjectId (FK→User)│
│ threadId   : String (unique)    │
│ title      : String (auto)      │
│ messages   : [MessageSchema]    │
│   ├── role    : "user"|"assistant"│
│   ├── content : String          │
│   └── timestamp: Date           │
│ createdAt  : Date              │
│ updatedAt  : Date              │
└─────────────────────────────────┘
```

---

## Authentication Flow

```
┌────────┐                    ┌────────┐                    ┌────────┐
│ Client │                    │ Server │                    │MongoDB │
└───┬────┘                    └───┬────┘                    └───┬────┘
    │                             │                             │
    │  POST /api/auth/register    │                             │
    │  {name, email, password}    │                             │
    ├────────────────────────────►│                             │
    │                             │  Check email uniqueness     │
    │                             ├────────────────────────────►│
    │                             │◄────────────────────────────┤
    │                             │                             │
    │                             │  Hash password (bcrypt)     │
    │                             │  Create User document       │
    │                             ├────────────────────────────►│
    │                             │◄────────────────────────────┤
    │                             │                             │
    │                             │  Sign JWT (7 day expiry)    │
    │  { token, user }            │                             │
    │◄────────────────────────────┤                             │
    │                             │                             │
    │  Store token in localStorage│                             │
    │                             │                             │
    │  GET /api/threads           │                             │
    │  Authorization: Bearer <t>  │                             │
    ├────────────────────────────►│                             │
    │                             │  Verify JWT (middleware)    │
    │                             │  Decode { id } → req.user   │
    │                             │  Query threads by userId    │
    │                             ├────────────────────────────►│
    │  threads[]                  │◄────────────────────────────┤
    │◄────────────────────────────┤                             │
```

---

## External Services

| Service | Usage | Configuration |
|---------|-------|---------------|
| **Google Gemini API** | AI text generation (`gemini-3.1-flash-lite`) | `X_GOOGLE_API_KEY` env var |
| **MongoDB Atlas** | User and thread persistence | `MONGODB_URI` env var |

---

## Security Measures

- **Password Hashing**: bcrypt with salt round 10 (never stored in plain text)
- **JWT Tokens**: Signed with `JWT_SECRET`, 7-day expiration
- **Route Protection**: All `/api/chat` and `/api/threads` routes require valid JWT
- **Auto-Logout**: Frontend detects 401 responses and clears token
- **CORS**: Enabled via `cors()` middleware

---

## Deployment Architecture

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────┐
│   Vercel / CDN   │     │ Railway / Render  │     │ MongoDB Atlas│
│   (Frontend)     │────►│ (Backend API)     │────►│ (Database)   │
│                  │     │                   │     │              │
│  React + Vite    │     │  Node.js Express  │     │  Cloud DB    │
│  Static Assets   │     │  REST API         │     │              │
└──────────────────┘     └──────────────────┘     └──────────────┘
         ▲                        ▲
         │                        │
         └────── Browser ─────────┘
```

For deployment instructions, see the [README](./README.md).
