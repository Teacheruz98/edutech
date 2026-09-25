const { spawn, exec } = require('child_process');
const path = require('path');

console.log('🚀 Starting all EdTech Platform panels...');

const rootDir = __dirname;
const backendDir = path.join(rootDir, 'backend');
const frontendDir = path.join(rootDir, 'frontend');

const processes = [];

function startProcess(name, cmd, args, cwd) {
    const proc = spawn(cmd, args, { cwd, stdio: 'inherit', shell: true });
    processes.push(proc);
    console.log(`[${name}] started (PID: ${proc.pid})`);
    return proc;
}

// 1. Backend Server (Port 5001)
startProcess('Backend', 'node', ['server.js'], backendDir);

// 2. Admin Panel (Port 5173)
startProcess('Admin (5173)', 'npm', ['run', 'dev:admin'], frontendDir);

// 3. Teacher Panel (Port 5174)
startProcess('Teacher (5174)', 'npm', ['run', 'dev:teacher'], frontendDir);

// 4. Student Panel (Port 5175)
startProcess('Student (5175)', 'npm', ['run', 'dev:student'], frontendDir);

// 5. Management Panel (Port 5176)
startProcess('Management (5176)', 'npm', ['run', 'dev:management'], frontendDir);

// Open all panels in browser after 3.5 seconds
setTimeout(() => {
    console.log('🌐 Opening all panels in separate browser tabs...');
    const urls = [
        'http://localhost:5173/?role=admin',
        'http://localhost:5174/?role=teacher',
        'http://localhost:5175/?role=student',
        'http://localhost:5176/?role=management'
    ];

    urls.forEach((url, index) => {
        setTimeout(() => {
            const openCmd = process.platform === 'darwin'
                ? `open "${url}"`
                : process.platform === 'win32'
                    ? `start "" "${url}"`
                    : `xdg-open "${url}"`;
            exec(openCmd, (err) => {
                if (err) console.error(`Failed to open ${url}:`, err.message);
                else console.log(`✅ Opened ${url}`);
            });
        }, index * 400);
    });
}, 3500);

// Cleanup on exit
function shutdown() {
    console.log('\n🛑 Stopping all panels...');
    processes.forEach(p => {
        try {
            process.kill(-p.pid);
        } catch (e) {
            try { p.kill(); } catch (err) {}
        }
    });
    process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
