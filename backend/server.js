require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const cors    = require('cors');
const crypto  = require('crypto');
const fs      = require('fs');
const path    = require('path');
const { spawnSync } = require('child_process');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ─── Serve Frontend Static Files ────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../frontend')));

// ─── Helpers ─────────────────────────────────────────────────────────────────
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

function getUserDbPath(username) {
    const clean = username.trim().replace(/[^a-zA-Z0-9_.-]/g, '_');
    const dir   = path.join(__dirname, 'database');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    // Case-insensitive file lookup for existing databases
    const targetName = `db_${clean.toLowerCase()}.json`;
    const files = fs.readdirSync(dir);
    const existing = files.find(f => f.toLowerCase() === targetName);
    if (existing) {
        return path.join(dir, existing);
    }
    
    return path.join(dir, `db_${clean.toLowerCase()}.json`);
}

function readUserDb(username) {
    const dbPath = getUserDbPath(username);
    if (!fs.existsSync(dbPath)) return null;
    try {
        const raw = fs.readFileSync(dbPath, 'utf8');
        if (!raw || !raw.trim()) return null;
        return JSON.parse(raw);
    } catch (e) {
        console.error(`Error reading database file for user ${username}:`, e.message);
        return null;
    }
}

function writeUserDb(username, data) {
    const dbPath = getUserDbPath(username);
    const tmpPath = `${dbPath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmpPath, dbPath);
}

function executeCode(code, language, input = '') {
    const tmpDir = path.join(__dirname, 'temp_execution');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const start = Date.now();

    try {
        // ── Python ──────────────────────────────────────────────────────────
        if (language === 'python') {
            const filePath = path.join(tmpDir, 'temp.py');
            fs.writeFileSync(filePath, code);
            let r = spawnSync('python3', [filePath], { input: input, timeout: 5000, encoding: 'utf8' });
            if (r.error) {
                r = spawnSync('python', [filePath], { input: input, timeout: 5000, encoding: 'utf8' });
            }
            if (r.error?.code === 'ETIMEDOUT') return { status: 'Timeout',            error: 'Execution timed out.' };
            if (r.error)                        return { status: 'Compiler Not Found', error: 'Python not found on this system.' };
            return { status: r.status === 0 ? 'Success' : 'Runtime Error', stdout: r.stdout, stderr: r.stderr, execTimeMs: Date.now() - start };
        }

        // ── JavaScript ──────────────────────────────────────────────────────
        if (language === 'javascript') {
            const filePath = path.join(tmpDir, 'temp.js');
            fs.writeFileSync(filePath, code);
            const r = spawnSync('node', [filePath], { input: input, timeout: 5000, encoding: 'utf8' });
            if (r.error?.code === 'ETIMEDOUT') return { status: 'Timeout',            error: 'Execution timed out.' };
            if (r.error)                        return { status: 'Compiler Not Found', error: 'Node.js not found on this system.' };
            return { status: r.status === 0 ? 'Success' : 'Runtime Error', stdout: r.stdout, stderr: r.stderr, execTimeMs: Date.now() - start };
        }

        // ── Java ─────────────────────────────────────────────────────────────
        if (language === 'java') {
            let src = code;
            const classMatch = code.match(/public\s+class\s+(\w+)/);
            if (classMatch) src = code.replace(`public class ${classMatch[1]}`, 'public class Temp');
            const filePath = path.join(tmpDir, 'Temp.java');
            fs.writeFileSync(filePath, src);

            const compile = spawnSync('javac', [filePath], { timeout: 10000, encoding: 'utf8' });
            if (compile.error)       return { status: 'Compiler Not Found', error: 'Java (javac) not found on this system.' };
            if (compile.status !== 0) return { status: 'Compilation Error', error: compile.stderr };

            const run = spawnSync('java', ['-cp', tmpDir, 'Temp'], { input: input, timeout: 5000, encoding: 'utf8' });
            return { status: run.status === 0 ? 'Success' : 'Runtime Error', stdout: run.stdout, stderr: run.stderr, execTimeMs: Date.now() - start };
        }

        // ── C++ ──────────────────────────────────────────────────────────────
        if (language === 'cpp') {
            const filePath = path.join(tmpDir, 'temp.cpp');
            const outPath  = path.join(tmpDir, process.platform === 'win32' ? 'temp_out.exe' : 'temp_out');
            fs.writeFileSync(filePath, code);

            const compile = spawnSync('g++', [filePath, '-o', outPath, '-std=c++17'], { timeout: 10000, encoding: 'utf8' });
            if (compile.error)        return { status: 'Compiler Not Found', error: 'g++ not found on this system.' };
            if (compile.status !== 0)  return { status: 'Compilation Error', error: compile.stderr };

            const run = spawnSync(outPath, [], { input: input, timeout: 5000, encoding: 'utf8' });
            return { status: run.status === 0 ? 'Success' : 'Runtime Error', stdout: run.stdout, stderr: run.stderr, execTimeMs: Date.now() - start };
        }

        // ── Go ───────────────────────────────────────────────────────────────
        if (language === 'go') {
            const filePath = path.join(tmpDir, 'temp.go');
            fs.writeFileSync(filePath, code);
            const r = spawnSync('go', ['run', filePath], { input: input, timeout: 5000, encoding: 'utf8' });
            if (r.error?.code === 'ETIMEDOUT') return { status: 'Timeout',            error: 'Execution timed out.' };
            if (r.error)                        return { status: 'Compiler Not Found', error: 'Go (go) not found on this system.' };
            return { status: r.status === 0 ? 'Success' : 'Runtime Error', stdout: r.stdout, stderr: r.stderr, execTimeMs: Date.now() - start };
        }

        // ── Rust ─────────────────────────────────────────────────────────────
        if (language === 'rust') {
            const filePath = path.join(tmpDir, 'temp.rs');
            const outPath  = path.join(tmpDir, process.platform === 'win32' ? 'temp_rs_out.exe' : 'temp_rs_out');
            fs.writeFileSync(filePath, code);

            const compile = spawnSync('rustc', [filePath, '-O', '-o', outPath], { timeout: 10000, encoding: 'utf8' });
            if (compile.error)        return { status: 'Compiler Not Found', error: 'rustc not found on this system.' };
            if (compile.status !== 0)  return { status: 'Compilation Error', error: compile.stderr };

            const run = spawnSync(outPath, [], { input: input, timeout: 5000, encoding: 'utf8' });
            return { status: run.status === 0 ? 'Success' : 'Runtime Error', stdout: run.stdout, stderr: run.stderr, execTimeMs: Date.now() - start };
        }

        return { status: 'Unsupported Language', error: `Language '${language}' is not supported for local execution.` };
    } catch (e) {
        return { status: 'Execution Failed', error: e.message };
    }
}

// ─── API Routes ───────────────────────────────────────────────────────────────

// GET /api/status
app.get('/api/status', (req, res) => {
    const key = process.env.GROQ_API_KEY;
    res.json({ live: !!(key && key.length > 10) });
});

// GET /api/user/data
app.get('/api/user/data', (req, res) => {
    try {
        const username = (req.query.username || '').trim();
        if (!username) {
            return res.status(400).json({ error: 'Missing username parameter.' });
        }
        const db = readUserDb(username);
        if (!db) {
            return res.status(404).json({ error: 'User not found.' });
        }
        res.json({
            success: true,
            username: db.username || username,
            profile: db.profile || { name: username, xp: 0, completed: [] },
            history: db.history || []
        });
    } catch (e) {
        res.status(500).json({ error: 'Data fetch failure: ' + e.message });
    }
});

// POST /api/register
app.post('/api/register', (req, res) => {
    try {
        const { username = '', password = '' } = req.body;
        const trimmedUser = username.trim();
        const trimmedPass = password.trim();
        if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(trimmedUser)) {
            return res.status(400).json({ error: 'Username must be 3–30 alphanumeric characters.' });
        }
        if (!/^\d{4}$/.test(trimmedPass)) {
            return res.status(400).json({ error: 'Password must be exactly 4 numeric digits (0–9).' });
        }
        
        const existingDb = readUserDb(trimmedUser);
        if (existingDb) {
            return res.status(400).json({ error: 'Account already exists. Please sign in instead.' });
        }

        const newDb = {
            username: trimmedUser,
            passwordHash: hashPassword(trimmedPass),
            profile: { name: trimmedUser, xp: 0, completed: [] },
            history: []
        };
        writeUserDb(trimmedUser, newDb);
        res.json({ success: true, message: 'Account registered successfully! Please sign in.' });
    } catch (e) {
        res.status(500).json({ error: 'Register failure: ' + e.message });
    }
});

// POST /api/login
app.post('/api/login', (req, res) => {
    try {
        const { username = '', password = '' } = req.body;
        const trimmedUser = username.trim();
        const trimmedPass = password.trim();
        if (!trimmedUser) {
            return res.status(400).json({ error: 'Please enter a username.' });
        }
        if (!/^\d{4}$/.test(trimmedPass)) {
            return res.status(400).json({ error: 'Password must be exactly 4 numeric digits (0–9).' });
        }

        const db = readUserDb(trimmedUser);
        if (!db) {
            return res.status(404).json({ error: 'Account does not exist. Please sign up first.' });
        }

        if (db.passwordHash && db.passwordHash !== hashPassword(trimmedPass)) {
            return res.status(401).json({ error: 'Incorrect 4-digit PIN. Please try again.' });
        }

        if (!db.passwordHash) {
            db.passwordHash = hashPassword(trimmedPass);
            writeUserDb(trimmedUser, db);
        }

        res.json({
            success: true,
            username: db.username || trimmedUser,
            profile: db.profile || { name: trimmedUser, xp: 0, completed: [] },
            history: db.history || []
        });
    } catch (e) {
        res.status(500).json({ error: 'Login failure: ' + e.message });
    }
});

// POST /api/user/save
app.post('/api/user/save', (req, res) => {
    try {
        const { username = '', profile, history } = req.body;
        const trimmedUser = username.trim();
        if (!trimmedUser) return res.status(400).json({ error: 'Missing username.' });

        let db = readUserDb(trimmedUser);
        if (!db) {
            db = {
                username: trimmedUser,
                passwordHash: '',
                profile: profile || { name: trimmedUser, xp: 0, completed: [] },
                history: history || []
            };
        }

        if (profile) db.profile = profile;
        if (history) db.history = history;

        writeUserDb(trimmedUser, db);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Save failure: ' + e.message });
    }
});

// POST /api/review
app.post('/api/review', async (req, res) => {
    try {
        const { code, language, input = '' } = req.body;
        if (!code || !language) return res.status(400).json({ error: 'Missing code or language.' });

        // Run local compiler first
        const execution = executeCode(code, language, input);

        // Get API key from env or from frontend header (frontend sends it as X-Gemini-API-Key)
        const apiKey = process.env.GROQ_API_KEY || req.headers['x-gemini-api-key'];
        if (!apiKey) return res.status(500).json({ error: 'No Groq API key configured on the server and none provided by client.' });

        const prompt = `You are a high-performance software engineering code reviewer.

User Code Language: ${language}
User Source Code:
${code}

Return ONLY a valid JSON object with NO extra text, markdown, or explanation:
{
  "efficiencyScore": <integer 0-100>,
  "timeComplexityOriginal": "<e.g. O(N^2)>",
  "timeComplexityOptimized": "<e.g. O(N)>",
  "spaceComplexityOriginal": "<e.g. O(1)>",
  "spaceComplexityOptimized": "<e.g. O(N)>",
  "compilerInfo": "<compiler name and version>",
  "optimizedCode": "<complete optimized code>"
}`;

        // Fetch available models dynamically or use prioritized list
        let models = ['openai/gpt-oss-120b', 'qwen/qwen3.6-27b', 'groq/compound', 'openai/gpt-oss-20b', 'groq/compound-mini'];
        
        try {
            const listRes = await fetch('https://api.groq.com/openai/v1/models', {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            if (listRes.ok) {
                const listData = await listRes.json();
                if (Array.isArray(listData.data)) {
                    const activeIds = listData.data
                        .map(m => m.id)
                        .filter(id => !id.includes('whisper') && !id.includes('orpheus') && !id.includes('guard'));
                    if (activeIds.length > 0) {
                        models = [...new Set([...models, ...activeIds])];
                    }
                }
            }
        } catch (err) {
            console.warn('Failed to fetch dynamic Groq model list:', err.message);
        }

        let lastError = null;
        let aiResult = null;

        for (const model of models) {
            try {
                const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [{ role: 'user', content: prompt }],
                        temperature: 0.3,
                        max_tokens: 4096
                    })
                });

                if (!groqRes.ok) {
                    const err = await groqRes.json().catch(() => ({}));
                    const msg = err?.error?.message || `Groq API returned ${groqRes.status} for model ${model}`;
                    console.warn(`Model ${model} failed: ${msg}`);
                    lastError = new Error(msg);
                    continue; // try next model
                }

                const groqData = await groqRes.json();
                let text = groqData.choices[0].message.content;

                // Strip markdown fences if present
                const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                if (fenced) text = fenced[1];

                aiResult = JSON.parse(text.trim());
                break; // successfully received response
            } catch (err) {
                lastError = err;
                console.warn(`Attempt with model ${model} threw error:`, err.message);
            }
        }

        if (!aiResult) {
            throw lastError || new Error('All Groq model requests failed.');
        }

        res.json({ aiResult, execution });
    } catch (e) {
        console.error('Review error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// ─── Catch-all: return index.html for SPA routing ────────────────────────────
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`✅ AI Code Reviewer running at http://localhost:${PORT}`);
});
