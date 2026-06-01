const { Server } = require('socket.io');
const { spawn } = require('child_process');
const path = require('path');

// ---------- Configuration ----------
const PORT = 5002;

// Use the Python launcher (usually available)
const PYTHON_CMD = 'py';

// Full path to your mt5_stream.py inside PropFirm-Pro/mt5_bridge
const SCRIPT_PATH = path.join(__dirname, '..', 'mt5_bridge', 'mt5_stream.py');

// ---------- Socket.IO server ----------
const io = new Server(PORT, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

console.log(`🚀 WebSocket server running on http://localhost:${PORT}`);

// ---------- Spawn Python process ----------
let pythonProcess = null;

function startPythonProcess() {
    if (pythonProcess) {
        pythonProcess.kill();
    }

    console.log(`Starting Python script: ${SCRIPT_PATH}`);
    pythonProcess = spawn(PYTHON_CMD, [SCRIPT_PATH], {
        cwd: path.dirname(SCRIPT_PATH)
    });

    pythonProcess.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
            if (line.trim()) {
                try {
                    const state = JSON.parse(line);
                    io.emit('account_update', state);
                } catch (err) {
                    console.error('JSON parse error:', err.message);
                }
            }
        }
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`[Python stderr]: ${data}`);
    });

    pythonProcess.on('close', (code) => {
        console.log(`Python process exited with code ${code}. Restarting in 2 seconds...`);
        setTimeout(startPythonProcess, 2000);
    });
}

startPythonProcess();

io.on('connection', (socket) => {
    console.log(`✅ Client connected: ${socket.id}`);
    socket.on('disconnect', () => {
        console.log(`❌ Client disconnected: ${socket.id}`);
    });
});

process.on('SIGINT', () => {
    console.log('\nShutting down...');
    if (pythonProcess) pythonProcess.kill();
    process.exit();
});