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
    const clean = username.replace(/[^a-zA-Z0-9_]/g, '');
    const dir   = path.join(__dirname, 'database');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return path.join(dir, `db_${clean}.json`);
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

// POST /api/register
app.post('/api/register', (req, res) => {
    try {
        const { username = '', password = '' } = req.body;
        if (!/^[a-zA-Z0-9_]{3,15}$/.test(username.trim())) {
            return res.status(400).json({ error: 'Username must be 3–15 alphanumeric characters.' });
        }
        const dbPath = getUserDbPath(username.trim());
        if (fs.existsSync(dbPath)) return res.status(400).json({ error: 'Username already exists.' });

        const db = {
            username: username.trim(),
            passwordHash: hashPassword(password),
            profile: { name: username.trim(), xp: 0, completed: [] },
            history: []
        };
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
        res.json({ success: true, message: 'Account created successfully.' });
    } catch (e) {
        res.status(500).json({ error: 'Register failure: ' + e.message });
    }
});

// POST /api/login
app.post('/api/login', (req, res) => {
    try {
        const { username = '', password = '' } = req.body;
        const dbPath = getUserDbPath(username.trim());
        if (!fs.existsSync(dbPath)) return res.status(401).json({ error: 'Invalid username or password.' });

        const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        if (db.passwordHash !== hashPassword(password)) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }
        res.json({ success: true, profile: db.profile, history: db.history });
    } catch (e) {
        res.status(500).json({ error: 'Login failure: ' + e.message });
    }
});

// POST /api/user/save
app.post('/api/user/save', (req, res) => {
    try {
        const { username = '', profile, history } = req.body;
        const dbPath = getUserDbPath(username.trim());
        if (!fs.existsSync(dbPath)) return res.status(404).json({ error: 'User not found.' });

        const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        db.profile = profile;
        db.history = history;
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
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

        // Get Groq API key
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) return res.status(500).json({ error: 'No Groq API key configured on the server.' });

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

        // Call Groq API (Node 18+ has built-in fetch)
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
                max_tokens: 4096
            })
        });

        if (!groqRes.ok) {
            const err = await groqRes.json().catch(() => ({}));
            throw new Error(err?.error?.message || `Groq API returned ${groqRes.status}`);
        }

        const groqData = await groqRes.json();
        let text = groqData.choices[0].message.content;

        // Strip markdown fences if present
        const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (fenced) text = fenced[1];

        const aiResult = JSON.parse(text.trim());

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
