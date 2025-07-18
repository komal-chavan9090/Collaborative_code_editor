import { useState, useEffect, useRef } from 'react';
import './App.css';
import io from 'socket.io-client';
import Editor from '@monaco-editor/react';
import { FaPlay, FaTools, FaRegCopy, FaCheck, FaUpload, FaDownload, FaUndo, FaRedo, FaMicrophone, FaMicrophoneSlash } from "react-icons/fa";
import Avatar from 'react-avatar';
import { RiGitBranchFill } from "react-icons/ri";
import { FiSend } from "react-icons/fi";
import { BsChatDotsFill } from "react-icons/bs";
import Peer from "simple-peer";

const socket = io("http://localhost:4000", {
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

const languageMap = {
  javascript: 63,
  python: 71,
  java: 62,
  "c++": 54
};

const App = () => {
  const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [userName, setUserName] = useState("");
  const [lang, setLang] = useState("javascript");
  const [code, setCode] = useState("");
  const [users, setUsers] = useState([]);
  const [typingUser, setTypingUser] = useState("");
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [stdin, setStdin] = useState("");
  const [outputStatus, setOutputStatus] = useState("success");
  const [copied, setCopied] = useState(false);
  const [githubToken, setGithubToken] = useState("");
  const [showGitHubModal, setShowGitHubModal] = useState(false);
  const [ghUsername, setGhUsername] = useState("");
  const [ghRepo, setGhRepo] = useState("");
  const [ghPath, setGhPath] = useState("main.cpp");
  const [ghMessage, setGhMessage] = useState("Commit from collaborative editor");
  const [codeHistory, setCodeHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const historyTimeout = useRef(null);
  const [popupMessage, setPopupMessage] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef(null);
  const [showChat, setShowChat] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const localStreamRef = useRef(null);
  const peerRef = useRef(null);
  const [voiceStatus, setVoiceStatus] = useState({});

  useEffect(() => {
    socket.on("userJoined", (users, joinedUser) => {
      setUsers(users);
      if (joinedUser && joinedUser !== userName) {
        setPopupMessage(`${joinedUser} joined the room`);
        setShowPopup(true);
        setTimeout(() => setShowPopup(false), 3000);
      }
    });

    socket.on("userLeft", (users, leftUser) => {
      setUsers(users);
      if (leftUser && leftUser !== userName) {
        setPopupMessage(`${leftUser} left the room`);
        setShowPopup(true);
        setTimeout(() => setShowPopup(false), 3000);
      }
    });

    socket.on("codeUpdate", (code) => setCode(code));
    socket.on("userTyping", (userName) => {
      setTypingUser(`${userName} is typing...`);
      setTimeout(() => setTypingUser(""), 2000);
    });
    socket.on("outputUpdate", (output) => setOutput(output));
    socket.on("languageUpdate", (lang) => setLang(lang));
    socket.on("chatMessage", (msg) => setChatMessages((prev) => [...prev, msg]));
    socket.on("voiceStatusUpdate", ({ userName, isVoiceActive }) => {
      setVoiceStatus(prev => ({ ...prev, [userName]: isVoiceActive }));
    });

    return () => {
      socket.off("userJoined");
      socket.off("userLeft");
      socket.off("codeUpdate");
      socket.off("userTyping");
      socket.off("outputUpdate");
      socket.off("languageUpdate");
      socket.off("chatMessage");
      socket.off("voiceStatusUpdate");
    };
  }, [userName]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      setGithubToken(token);
      fetch('https://api.github.com/user', {
        headers: { Authorization: `token ${token}` }
      })
        .then(res => res.json())
        .then(data => setGhUsername(data.login));
    }
  }, []);

  // Restore code from localStorage on mount
  useEffect(() => {
    const savedCode = localStorage.getItem('code');
    if (savedCode) setCode(savedCode);
  }, []);

  // Save code to localStorage on every change
  useEffect(() => {
    localStorage.setItem('code', code);
  }, [code]);

  // Save userName and roomId to localStorage on every change
  useEffect(() => {
    localStorage.setItem('userName', userName);
  }, [userName]);

  useEffect(() => {
    localStorage.setItem('roomId', roomId);
  }, [roomId]);

  useEffect(() => {
    const savedUserName = localStorage.getItem('userName');
    const savedRoomId = localStorage.getItem('roomId');
    if (savedUserName) setUserName(savedUserName);
    if (savedRoomId) setRoomId(savedRoomId);
  }, []);

  const joinRoom = () => {
    if (roomId && userName) {
      socket.emit("join", { roomId, userName });
      setJoined(true);
    }
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 5000);
  };

  const handleCodeChange = (value) => {
    setCode(value);
    if (historyTimeout.current) clearTimeout(historyTimeout.current);
    historyTimeout.current = setTimeout(() => {
      if (codeHistory[historyIndex] !== value) {
        const newHistory = codeHistory.slice(0, historyIndex + 1).concat(value);
        setCodeHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
      }
    }, 500);
    socket.emit("codeChange", { roomId, code: value });
    socket.emit("typing", { roomId, userName });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setCode(event.target.result);
      socket.emit("codeChange", { roomId, code: event.target.result });
    };
    reader.readAsText(file);
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `code-${roomId || "session"}.${lang === "c++" ? "cpp" : lang}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const isErrorOutput = (result) => {
    if (!result) return true;
    return /error|exception|traceback|failed|not defined|undefined|syntax|compilation/i.test(result);
  };

  const handleRun = async () => {
    setIsRunning(true);
    setOutput("Running...");
    setOutputStatus("success");
    try {
      const response = await fetch("http://localhost:4000/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_code: code,
          language_id: languageMap[lang],
          stdin: stdin || ""
        })
      });
      const data = await response.json();
      const result =
        data.stdout && data.stdout.trim() !== ""
          ? data.stdout
          : data.stderr && data.stderr.trim() !== ""
            ? data.stderr
            : data.compile_output && data.compile_output.trim() !== ""
              ? data.compile_output
              : "No output";
      setOutput(data.output || "No output");
      setOutputStatus(data.status);
      socket.emit("shareOutput", { roomId, output: result });
    } catch (err) {
      setOutput("Error: " + err.message);
      setOutputStatus("error");
      socket.emit("shareOutput", { roomId, output: "Error: " + err.message });
    }
    setIsRunning(false);
  };

  const handleCompile = async () => {
    setIsRunning(true);
    setOutput("Compiling...");
    setOutputStatus("success");
    try {
      const response = await fetch("http://localhost:4000/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_code: code,
          language_id: languageMap[lang],
        })
      });
      const data = await response.json();
      const result =
        data.stdout && data.stdout.trim() !== ""
          ? data.stdout
          : data.stderr && data.stderr.trim() !== ""
            ? data.stderr
            : data.compile_output && data.compile_output.trim() !== ""
              ? data.compile_output
              : "No output";
      setOutput(result);
      if (isErrorOutput(result)) {
        setOutputStatus("error");
      } else {
        setOutputStatus("success");
      }
      socket.emit("shareOutput", { roomId, output: result });
    } catch (err) {
      setOutput("Error: " + err.message);
      setOutputStatus("error");
      socket.emit("shareOutput", { roomId, output: "Error: " + err.message });
    }
    setIsRunning(false);
  };

  const handleLeaveRoom = () => {
    socket.emit("leaveRoom");
    setJoined(false);
    setRoomId("");
    setUserName("");
    setLang("javascript");
    setCode("");
    setUsers([]);
    setOutput("");
    setTypingUser("");
    setOutputStatus("success");
    setGithubToken("");
    setGhUsername("");
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setCode(codeHistory[historyIndex - 1]);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const handleRedo = () => {
    if (historyIndex < codeHistory.length - 1) {
      setCode(codeHistory[historyIndex + 1]);
      setHistoryIndex(historyIndex + 1);
    }
  };

  const sendChatMessage = () => {
    if (chatInput.trim()) {
      socket.emit("chatMessage", { roomId, userName, message: chatInput });
      setChatInput("");
    }
  };

  const toggleVoice = async () => {
    const newStatus = !voiceStatus[userName];
    setVoiceStatus(prev => ({ ...prev, [userName]: newStatus }));
    socket.emit("voiceStatusChange", { roomId, userName, isVoiceActive: newStatus });
  };

  if (!joined) {
    return (
      <div className='join-container'>
        <div className="join-form">
          <h1>Join Code Room</h1>
          <input
            type="text"
            value={roomId || ""}
            onChange={e => setRoomId(e.target.value)}
            placeholder="Room ID"
          />
          <input
            type="text"
            value={userName || ""}
            onChange={e => setUserName(e.target.value)}
            placeholder="Your Name"
          />
          <button onClick={joinRoom}>Join Room</button>
          <p className="subtitle">Don't have a room ID?  <a href="">Create one</a> </p>
        </div>
      </div>
    )
  }

  return (
    <div className="editor-container">
      <div className="sidebar">
        <div className="sidebar-content">
          <div className="room-info">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              Code Room : {roomId}
              {copied ? (
                <FaCheck className="copy-room-id-icon" style={{ color: "#27ae60", fontSize: '1.1em' }} title="Copied!" />
              ) : (
                <FaRegCopy className="copy-room-id-icon" style={{ cursor: 'pointer', fontSize: '1.1em' }} onClick={copyRoomId} title="Copy Room ID" />
              )}
            </h2>
          </div>
          <input
            type="file"
            accept=".js,.jsx,.ts,.tsx,.py,.java,.cpp,.txt"
            style={{ display: 'none' }}
            id="file-upload"
            onChange={handleFileUpload}
          />
          <button className="copy-btn file-btn" onClick={() => document.getElementById('file-upload').click()}>
            <FaUpload style={{ marginRight: 8 }} />
            Upload Code
          </button>
          <button className="copy-btn file-btn" onClick={handleDownload}>
            <FaDownload style={{ marginRight: 8 }} />
            Download Code
          </button>
          <h3>People in Room:</h3>
          <ul id="user-list">
            {users.map((user, index) => (
              <li key={index} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Avatar className="avatar" name={user} size="32" textSizeRatio={3} />
                <span>{user}</span>
                <button
                  className={`chat-voice-btn${voiceStatus[user] ? " active" : ""}`}
                  disabled={user !== userName}
                  onClick={user === userName ? toggleVoice : undefined}
                  title={
                    user === userName
                      ? (voiceStatus[user] ? "Stop Voice" : "Start Voice")
                      : (voiceStatus[user] ? "Mic On" : "Mic Off")
                  }
                  style={{ marginLeft: 'auto', opacity: user === userName ? 1 : 0.7, cursor: user === userName ? "pointer" : "default" }}
                >
                  {voiceStatus[user] ? <FaMicrophone /> : <FaMicrophoneSlash />}
                </button>
              </li>
            ))}
          </ul>
          <p className='typing-indicator'>{typingUser}</p>
          <select
            className='lang-selector'
            value={lang}
            onChange={e => {
              setLang(e.target.value);
              socket.emit("languageChange", { roomId, lang: e.target.value });
            }}
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="c++">C++</option>
          </select>
          {githubToken ? (
            <div style={{ color: "#27ae60", margin: "10px 0" }}>
              <b>GitHub Connected</b>
            </div>
          ) : (
            <button
              className="connect-github-btn copy-btn file-btn"
              style={{ background: "#24292f", color: "#fff", marginTop: "10px" }}
              onClick={() => window.open('http://localhost:4000/auth/github', '_blank')}
            >
              <svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor" style={{marginRight: 6}}>
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38
                0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52
                -.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2
                -3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82A7.65
                7.65 0 018 4.77c.68.003 1.36.092 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08
                2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01
                1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
              </svg>
              Connect GitHub
            </button>
          )}
          <button
            className="copy-btn file-btn connect-github-btn"
            style={{ background: "#24292f", color: "#fff", marginTop: "10px" }}
            onClick={() => setShowGitHubModal(true)}
            disabled={!githubToken}
          >
            <RiGitBranchFill style={{ marginRight: 6 }} />
            Push to GitHub
          </button>
        </div>
        <button
          className="leave-room-btn"
          onClick={() => {
            if (window.confirm("Are you sure you want to leave the room? Unsaved changes may be lost.")) {
              handleLeaveRoom();
            }
          }}
        >
          Leave room
        </button>
      </div>
      <div className="editor-wrapper">
        <div className="editor-toolbar" style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 18px", background: "#23272f", borderBottom: "1.5px solid #23272f" }}>
          <button className="copy-btn file-btn undo-btn" onClick={handleUndo} disabled={historyIndex <= 0}>
            <FaUndo style={{ marginRight: 6 }} />
          </button>
          <button className="copy-btn file-btn redo-btn" onClick={handleRedo} disabled={historyIndex >= codeHistory.length - 1}>
            <FaRedo style={{ marginRight: 6 }} />
          </button>
          <button className="copy-btn file-btn" onClick={handleRun} disabled={isRunning}>
            <FaPlay style={{ marginRight: 6 }} />
            Run Code
          </button>
          <button className="copy-btn file-btn" onClick={handleCompile} disabled={isRunning}>
            <FaTools style={{ marginRight: 6 }} />
            Compile
          </button>
          <input
            type="text"
            placeholder="Custom Input (stdin)"
            value={stdin}
            onChange={e => setStdin(e.target.value)}
            style={{ marginLeft: 16, flex: 1, background: "#181c22", color: "#fff", border: "1px solid #444", borderRadius: 6, padding: "6px 10px" }}
          />
        </div>
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <Editor
            height="100%"
            defaultLanguage={lang}
            language={lang}
            value={code}
            onChange={handleCodeChange}
            theme='vs-dark'
            options={{
              miniMap: { enabled: false },
              fontSize: 18,
              fontFamily: 'Consolas, "Courier New", monospace',
              'editor.foreground': '#FFFFFF',
            }}
          />
        </div>
        <div className={`output-sticky ${outputStatus === "error" ? "output-error" : "output-success"}`}>
          <h3>Output:</h3>
          <pre>
            {output ? output : (outputStatus === "error" ? "Error occurred" : "No output")}
          </pre>
        </div>
      </div>
      {showGitHubModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>Push to GitHub</h2>
            <input
              type="text"
              placeholder="Repository Name (username/reponame)"
              value={ghRepo}
              onChange={e => setGhRepo(e.target.value)}
              style={{ marginBottom: 8 }}
            />
            <input
              type="text"
              placeholder="File Path (e.g., main.cpp)"
              value={ghPath}
              onChange={e => setGhPath(e.target.value)}
              style={{ marginBottom: 8 }}
            />
            <input
              type="text"
              placeholder="Commit Message"
              value={ghMessage}
              onChange={e => setGhMessage(e.target.value)}
              style={{ marginBottom: 8 }}
            />
            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <button
                className="copy-btn file-btn"
                style={{ background: "#27ae60", color: "#fff" }}
                onClick={async () => {
                  const res = await fetch('http://localhost:4000/push-to-github', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      token: githubToken,
                      repo: `${ghUsername}/${ghRepo}`,
                      path: ghPath,
                      content: code,
                      message: ghMessage
                    })
                  });
                  const data = await res.json();
                  if (data.success) {
                    alert("Pushed to GitHub!");
                    setShowGitHubModal(false);
                  } else {
                    alert("GitHub push failed: " + (data.error?.message || JSON.stringify(data.error)));
                  }
                }}
              >
                Push
              </button>
              <button
                className="copy-btn file-btn"
                style={{ background: "#e74c3c", color: "#fff" }}
                onClick={() => setShowGitHubModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {showPopup && (
        <div style={{
          position: "fixed",
          bottom: 30,
          left: 30,
          background: "#23272f",
          color: "#fff",
          padding: "14px 32px",
          borderRadius: 10,
          boxShadow: "0 4px 24px rgba(39,174,96,0.18)",
          zIndex: 9999,
          fontWeight: 500,
          fontSize: "1.08rem",
          letterSpacing: "0.2px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          minWidth: 220,
          borderLeft: "5px solid #27ae60",
          animation: "slideInLeft 0.4s"
        }}>
          <svg width="22" height="22" fill="#27ae60" style={{marginRight: 8}} viewBox="0 0 24 24"><path d="M12 0C5.371 0 0 5.371 0 12c0 6.629 5.371 12 12 12s12-5.371 12-12C24 5.371 18.629 0 12 0zm-1 17.414l-5.707-5.707 1.414-1.414L11 14.586l6.293-6.293 1.414 1.414L11 17.414z"/></svg>
          {popupMessage}
        </div>
      )}
      {showChat && (
        <div className="chat-panel">
          <h4>
            Chat
            <button
              className="chat-close-btn"
              onClick={() => setShowChat(false)}
              title="Close Chat"
            >
              ×
            </button>
          </h4>
          <div className="chat-messages">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`chat-msg${msg.userName === userName ? " own-msg" : ""}`}
              >
                <span className="chat-user">{msg.userName}:</span>
                <span className="chat-text">{msg.message}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="chat-input-row">
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendChatMessage()}
              placeholder="Type a message..."
              className="chat-input"
            />
            <button onClick={sendChatMessage} className="chat-send-btn" title="Send">
              <FiSend size={22} />
            </button>
            <button
              className={`chat-voice-btn${voiceStatus[userName] ? " active" : ""}`}
              onClick={toggleVoice}
              title={voiceStatus[userName] ? "Stop Voice" : "Start Voice"}
              style={{ marginLeft: 'auto' }}
            >
              {voiceStatus[userName] ? <FaMicrophone /> : <FaMicrophoneSlash />}
            </button>
          </div>
        </div>
      )}
      {!showChat && (
        <button
          className="chat-fab"
          onClick={() => setShowChat(true)}
          title="Open Chat"
        >
          <BsChatDotsFill size={28}/>
        </button>
      )}
    </div>
  );
};

export default App;