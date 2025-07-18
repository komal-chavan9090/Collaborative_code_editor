# 🧑‍💻 Real-Time Collaborative Code Editor

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

### Frontend
- React  
- Monaco Editor  
- Socket.io-client  
- React Icons  
- React Avatar  

### Backend
- Node.js  
- Express  
- Socket.io  

### Code Execution
- Judge0 API  

### Voice Communication
- WebRTC (via `simple-peer`)

### Authentication
- GitHub OAuth

---

## 📦 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/real-time-editor.git
cd real-time-editor
```

### 2. Install Dependencies

#### Backend

```bash
cd server
npm install
```

#### Frontend

```bash
cd client
npm install
```

### 3. Start the Servers

#### Backend

```bash
cd server
npm run dev
```

#### Frontend (in a new terminal)

```bash
cd client
npm run dev
```

### 4. Open the App

Visit [http://localhost:5173](http://localhost:5173) in your browser.

---

## ⚙️ Configuration

### Judge0 API

The backend uses Judge0 for code execution. You can use the public API or set up your own instance.

### GitHub OAuth

You’ll need to set up a GitHub OAuth app and configure the backend with your client ID and secret.

---

## 📝 Usage

### Join a Room

Enter a Room ID and your name to join or create a collaborative session.

### Edit Code

Write code in the Monaco editor. All users in the room see changes in real time.

### Run/Compile

Use the toolbar to run or compile code and see the output.

### Chat & Voice

Use the chat panel for text chat and toggle your mic for voice chat.

### GitHub

Connect your GitHub account and push code directly to your repositories.

---

## 🔮 Future Scope

- 🗂 Multi-file & folder support (like VS Code)
- 🖱️ Live cursor & selection sharing
- 🧠 Real-time code linting & suggestions
- 🖥️ Integrated terminal
- 📹 Video chat integration
- 🗨️ Code commenting & annotations
- 🧰 Project templates & snippets
- 👥 User roles & permissions
- ☁️ Persistent projects (cloud storage)
- 📱 Mobile/tablet responsive UI
- 🔗 Third-party integrations (Google Drive, Slack, etc.)
- 🔀 Advanced Git features (branches, PRs, diffs)

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

---

## 📄 License

MIT

---

> Happy coding! 🚀

