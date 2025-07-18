import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import axios from 'axios';
import cors from 'cors';

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  }
});

const rooms = new Map();

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  let currentRoom = null;
  let currentUser = null;

  // When a user joins
  socket.on("join", ({ roomId, userName }) => {
    if (currentRoom) {
      socket.leave(currentRoom);
      if (rooms.has(currentRoom)) {
        rooms.get(currentRoom).delete(currentUser);
        io.to(currentRoom).emit("userJoined", Array.from(rooms.get(currentRoom)));
      }
    }
    currentRoom = roomId;
    currentUser = userName;

    socket.join(roomId);

    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    rooms.get(roomId).add(userName);
    io.to(roomId).emit("userJoined", Array.from(rooms.get(roomId)), userName);
  });

  socket.on("codeChange", ({ roomId, code }) => {
    socket.to(roomId).emit("codeUpdate", code);
  });

  socket.on("shareOutput", ({ roomId, output }) => {
    io.to(roomId).emit("outputUpdate", output);
  });

  socket.on("chatMessage", ({ roomId, userName, message }) => {
    io.to(roomId).emit("chatMessage", { userName, message, time: new Date().toISOString() });
  });

  // When a user leaves
  socket.on("leaveRoom", () => {
    if (currentRoom && currentUser && rooms.has(currentRoom)) {
      rooms.get(currentRoom).delete(currentUser);
      io.to(currentRoom).emit("userLeft", Array.from(rooms.get(currentRoom)), currentUser); // <-- FIXED
      socket.leave(currentRoom);
      currentRoom = null;
      currentUser = null;
    }
  });

  socket.on("typing", ({ roomId, userName }) => {
    socket.to(roomId).emit("userTyping", userName);
  });

  socket.on("languageChange", ({ roomId, lang }) => {
    socket.to(roomId).emit("languageUpdate", lang);
  });

  // GOOD: Everyone in the room (including sender) gets the update
  socket.on("voiceStatusChange", ({ roomId, userName, isVoiceActive }) => {
    io.to(roomId).emit("voiceStatusUpdate", { userName, isVoiceActive });
  });

  socket.on("voiceStatusUpdate", ({ userName, isVoiceActive }) => {
    setVoiceStatus(prev => ({ ...prev, [userName]: isVoiceActive }));
  });

  // On disconnect
  socket.on("disconnect", () => {
    if (currentRoom && currentUser && rooms.has(currentRoom)) {
      rooms.get(currentRoom).delete(currentUser);
      io.to(currentRoom).emit("userLeft", Array.from(rooms.get(currentRoom)), currentUser); // <-- FIXED
    }
    console.log("A user disconnected", socket.id);
  });
});
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

app.use(express.json());
app.use(cors());

// Judge0 API endpoint
app.post('/run', async (req, res) => {
  const { source_code, language_id, stdin } = req.body;
  try {
    const { data: submission } = await axios.post(
      'https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true', // <-- Use https and rapidapi endpoint
      {
        source_code,
        language_id,
        stdin: stdin || "",
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-RapidAPI-Key': '93dbba50eemsh097ba8126ec24d0p1691bfjsnac89e3bcde6b', // <-- Replace with your RapidAPI key
          'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
        }
      }
    );
    res.json(submission);
  } catch (err) {
    console.error("Judge0 error:", err?.response?.data || err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/compile', async (req, res) => {
  try {
    const { source_code, language_id } = req.body;
    const { data: result } = await axios.post(
      'https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true',
      {
        source_code,
        language_id,
        stdin: "",
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-RapidAPI-Key': '9967ef57dfmsh183fe0f49df8944p1f2215jsn9fcdbaaeea9b', // Replace with your key
          'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
        }
      }
    );
    res.json({ output: result, status: "success" });
  } catch (err) {
    // Send the actual error output
    res.json({
      output: err.stderr || err.message || "Unknown error",
      status: "error"
    });
  }
});

// 1. Redirect user to GitHub OAuth
app.get('/auth/github', (req, res) => {
  const redirect_uri = 'http://localhost:4000/auth/github/callback';
  const client_id = process.env.GITHUB_CLIENT_ID;
  res.redirect(`https://github.com/login/oauth/authorize?client_id=${client_id}&redirect_uri=${redirect_uri}&scope=repo`);
});

// 2. GitHub OAuth callback
app.get('/auth/github/callback', async (req, res) => {
  const code = req.query.code;
  const client_id = process.env.GITHUB_CLIENT_ID;
  const client_secret = process.env.GITHUB_CLIENT_SECRET;
  if (!code) {
    return res.status(400).send('No code provided');
  }
  try {
    // Exchange code for access token
    const tokenRes = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id,
        client_secret,
        code,
      },
      {
        headers: { Accept: 'application/json' },
      }
    );
    const access_token = tokenRes.data.access_token;
    if (!access_token) {
      return res.status(400).send('No access token received');
    }
    // Redirect to your frontend with the token
    res.redirect(`http://localhost:5173/?token=${access_token}`);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send('GitHub Auth Failed');
  }
});

app.post('/push-to-github', async (req, res) => {
  const { token, repo, path, content, message } = req.body;
  try {
    // Get the SHA if file exists (for update)
    let sha = undefined;
    try {
      const fileRes = await axios.get(
        `https://api.github.com/repos/${repo}/contents/${path}`,
        { headers: { Authorization: `token ${token}` } }
      );
      sha = fileRes.data.sha;
    } catch (e) { /* File does not exist, so it's a create */ }

    // Create or update file
    await axios.put(
      `https://api.github.com/repos/${repo}/contents/${path}`,
      {
        message,
        content: Buffer.from(content).toString('base64'),
        sha
      },
      { headers: { Authorization: `token ${token}` } }
    );
    res.json({ success: true });
  } catch (err) {
    console.error("GitHub push error:", err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

const port = process.env.PORT || 4000;
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

