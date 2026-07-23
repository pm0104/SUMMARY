import "./App.css";
import Sidebar from "./Sidebar.jsx";
import ChatWindow from "./ChatWindow.jsx";
import { MyContext } from "./MyContext.jsx";
import { useState } from "react";
import { v1 as uuidv1 } from "uuid";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";

function App() {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [authView, setAuthView] = useState("login");
  const [prompt, setPrompt] = useState("");
  const [reply, setReply] = useState(null);
  const [currThreadId, setCurrThreadId] = useState(uuidv1());
  const [prevChats, setPrevChats] = useState([]);
  const [newChat, setNewChat] = useState(true);
  const [allThreads, setAllThreads] = useState([]);

  const resetChatState = () => {
    setPrompt("");
    setReply(null);
    setCurrThreadId(uuidv1());
    setPrevChats([]);
    setNewChat(true);
    setAllThreads([]);
  };

  const handleLogin = (newToken) => {
    localStorage.setItem("token", newToken);
    resetChatState();
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    resetChatState();
    setToken(null);
    setAuthView("login");
  };

  if (!token) {
    return authView === "login" ? (
      <Login
        onLogin={handleLogin}
        onSwitchToRegister={() => setAuthView("register")}
      />
    ) : (
      <Register
        onLogin={handleLogin}
        onSwitchToLogin={() => setAuthView("login")}
      />
    );
  }

  const providerValues = {
    prompt,
    setPrompt,
    reply,
    setReply,
    currThreadId,
    setCurrThreadId,
    newChat,
    setNewChat,
    prevChats,
    setPrevChats,
    allThreads,
    setAllThreads,
    token,
    onLogout: handleLogout,
  };

  return (
    <div className="app" key={token}>
      <MyContext.Provider value={providerValues}>
        <Sidebar />
        <ChatWindow />
      </MyContext.Provider>
    </div>
  );
}

export default App;
