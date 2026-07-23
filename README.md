# ✦ SUMMARY — AI-Powered Conversation Hub

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![React](https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite_8-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Gemini_AI-8E75B2?style=for-the-badge&logo=google&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)

**A full-stack AI chat application powered by Google Gemini, with persistent threads, user authentication, and a premium glassmorphism UI.**

[Features](#-features) • [Architecture](./ARCHITECTURE.md) • [Getting Started](#-getting-started) • [API Reference](#-api-reference) • [Tech Stack](#-tech-stack)

</div>

---

## ✨ Features

- 🤖 **AI Chat** — Conversational AI powered by Google Gemini (gemini-3.1-flash-lite)
- 💬 **Persistent Threads** — Chat history saved to MongoDB, resume any conversation
- 🔐 **Authentication** — Secure JWT-based login/register with bcrypt password hashing
- ⚡ **Typing Animation** — Word-by-word streaming effect for AI responses
- 📝 **Markdown Rendering** — AI responses rendered with full Markdown + syntax highlighting
- 🎨 **Premium UI** — Glassmorphism login, animated gradients, floating particles
- 🗑️ **Thread Management** — Create, switch between, and delete conversation threads
- 📱 **Responsive** — Works on desktop, tablet, and mobile

---

## 📸 Screenshots

### Login Page
Premium glassmorphism design with animated mesh gradient and floating particles.

### Chat Interface
Clean dark theme with sidebar thread management and markdown-rendered AI responses.

---

## 🏗️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 19, Vite 8 | UI framework & build tool |
| **Styling** | Vanilla CSS | Glassmorphism, animations, responsive layout |
| **Backend** | Node.js, Express | REST API server |
| **Database** | MongoDB, Mongoose | User & thread persistence |
| **AI** | Google Gemini API | Natural language generation |
| **Auth** | JWT, bcryptjs | Token-based authentication |
| **Markdown** | react-markdown, rehype-highlight | Rich text rendering with code highlighting |
| **Icons** | Font Awesome 7 | UI iconography |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **MongoDB** (local or [MongoDB Atlas](https://www.mongodb.com/atlas))
- **Google Gemini API Key** ([Get one here](https://aistudio.google.com/apikey))

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/SUMMARY.git
cd SUMMARY
```

### 2. Set up the Backend

```bash
cd Backend
npm install
```

Create a `.env` file in the `Backend/` directory:

```env
PORT=8080
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/summary
JWT_SECRET=your_jwt_secret_key_here
X_GOOGLE_API_KEY=your_google_gemini_api_key_here
```

Start the backend server:

```bash
npm start
```

The API will be running at `http://localhost:8080`.

### 3. Set up the Frontend

```bash
cd frontend
npm install
npm run dev
```

The app will be running at `http://localhost:5173`.

### 4. Open in browser

Navigate to `http://localhost:5173`, register an account, and start chatting!

---

## 📡 API Reference

### Authentication

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/register` | `{ name, email, password }` | Register a new user |
| `POST` | `/api/auth/login` | `{ email, password }` | Login and get JWT token |

### Chat (🔒 Requires `Authorization: Bearer <token>`)

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| `POST` | `/api/chat` | `{ threadId, message }` | Send a message and get AI response |
| `GET` | `/api/threads` | — | Get all threads for the user |
| `GET` | `/api/threads/:threadId` | — | Get a specific thread with messages |
| `DELETE` | `/api/threads/:threadId` | — | Delete a thread |

---

## 📁 Project Structure

```
SUMMARY/
├── Backend/
│   ├── server.js              # Express app entry point
│   ├── controllers/
│   │   └── authControllers.js # Register & login logic
│   ├── routes/
│   │   ├── auth.js            # Auth route definitions
│   │   └── chat.js            # Chat & thread routes + logic
│   ├── models/
│   │   ├── User.js            # User schema (name, email, password)
│   │   └── thread.js          # Thread schema (messages, title)
│   ├── middleware/
│   │   └── auth.js            # JWT verification middleware
│   ├── utilities/
│   │   └── genimi.js          # Google Gemini API helper
│   └── package.json
│
├── frontend/
│   ├── index.html             # HTML entry with font imports
│   ├── src/
│   │   ├── main.jsx           # React root
│   │   ├── App.jsx            # App shell, auth routing, context
│   │   ├── App.css            # Global styles
│   │   ├── MyContext.jsx      # React Context for shared state
│   │   ├── Sidebar.jsx        # Thread list, create/delete threads
│   │   ├── Sidebar.css
│   │   ├── ChatWindow.jsx     # Chat input, navbar, message send
│   │   ├── ChatWindow.css
│   │   ├── Chat.jsx           # Message display, typing animation
│   │   ├── Chat.css
│   │   └── pages/
│   │       ├── Login.jsx      # Login page (glassmorphism UI)
│   │       ├── Register.jsx   # Register page
│   │       └── Auth.css       # Shared auth page styles
│   ├── vite.config.js
│   └── package.json
│
├── ARCHITECTURE.md            # System architecture documentation
└── README.md                  # This file
```

---

## 🔐 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: `8080`) |
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Secret key for JWT signing |
| `X_GOOGLE_API_KEY` | Yes | Google Gemini API key |

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<div align="center">

Made with ♥ by **Praneet**

</div>
