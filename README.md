A **Google Meet + VS Code** inspired **real-time collaborative code editor** with built-in **chat**, **voice**, and **GitHub integration**.

---

## 🚀 Features

- ✨ Real-time collaborative code editing (single file, live updates)
- 🔐 Room-based sessions (join with Room ID and username)
- 🧠 Language selection: JavaScript, Python, Java, C++
- ⚙️ Run and compile code with output/error display (via Judge0 API)
- ↩️ Undo/Redo code changes
- 📂 Upload and download code files
- 🌐 GitHub OAuth Integration (connect GitHub and push code)
- 💾 Persistent data (code, username, room ID restored after reload or GitHub login)
- 👥 User list with mic status
- 🎤 Voice chat with mic toggle (WebRTC)
- 💬 Real-time chat panel
- 🔔 Popup notifications on user join/leave
- ✍️ Typing indicator

---

## 🛠 Tech Stack

**Frontend**  
- React  
- Monaco Editor  
- Socket.io-client  
- React Icons  
- React Avatar  

**Backend**  
- Node.js  
- Express  
- Socket.io  

**Code Execution**  
- Judge0 API  

**Voice Communication**  
- WebRTC (via `simple-peer`)

**Authentication**  
- GitHub OAuth

---

## 📦 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/real-time-editor.git
cd real-time-editor
