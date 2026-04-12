// d:/Dico Fon/api-node/server.js
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3002;
const DB_FILE = path.join(__dirname, 'db.json');

// Initial Data
const initialDB = {
    users: [
        { 
            id: 1, name: "Admin Gbe Tche", email: "eudesjohn650@gmail.com", password: "Johnson40", 
            role: "admin", pseudo: "AdminZ", nationality: "Béninoise", ethnicity: "Fon", avatar: null 
        }
    ],
    words: [
        { id: 1, french: 'bonjour', fon: 'kɔ́kú', category: 'salutations', example: 'Kɔ́kú, à ní cɛ ɖé?', phonetic: 'ko-koo', status: 'approved', author: 'Admin' },
        { id: 2, french: 'merci', fon: 'à wá', category: 'salutations', example: 'À wá kpɛ́dé', phonetic: 'a-wa', status: 'approved', author: 'Admin' },
        { id: 3, french: 'eau', fon: 'sin', category: 'nature', example: 'Sin ɖé mɛ', phonetic: 'sin', status: 'approved', author: 'Admin' }
    ],
    favorites: []
};

if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify(initialDB, null, 2));

const server = http.createServer((req, res) => {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
        const db = JSON.parse(fs.readFileSync(DB_FILE));
        const url = new URL(req.url, `http://localhost:${PORT}`);
        const pathParts = url.pathname.split('/').filter(p => p);
        
        // Router
        if (pathParts[1] === 'auth' && pathParts[2] === 'login') {
            const { email, password } = JSON.parse(body);
            const user = db.users.find(u => u.email === email && u.password === password);
            if (user) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, user, token: "mock-token-" + Date.now() }));
            } else {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: "Identifiants incorrects." }));
            }
        } 
        else if (pathParts[1] === 'auth' && pathParts[2] === 'register') {
            const newUser = JSON.parse(body);
            newUser.id = db.users.length + 1;
            newUser.role = 'user';
            db.users.push(newUser);
            fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        }
        else if (pathParts[1] === 'auth' && pathParts[2] === 'profile-update') {
            const updatedUser = JSON.parse(body);
            const index = db.users.findIndex(u => u.id === updatedUser.id);
            if (index !== -1) {
                db.users[index] = { ...db.users[index], ...updatedUser };
                fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, user: db.users[index] }));
            } else { res.writeHead(404); res.end(); }
        }
        else if (pathParts[1] === 'dictionary' && pathParts[2] === 'search') {
            const q = (url.searchParams.get('q') || '').toLowerCase();
            const results = db.words.filter(w => w.status === 'approved' && (w.french.toLowerCase().includes(q) || w.fon.toLowerCase().includes(q)));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(results));
        }
        else if (pathParts[1] === 'dictionary' && pathParts[2] === 'admin-pending') {
            const results = db.words.filter(w => w.status === 'pending');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(results));
        }
        else if (pathParts[1] === 'dictionary' && pathParts[2] === 'update') {
            const updatedWord = JSON.parse(body);
            const index = db.words.findIndex(w => w.id === updatedWord.id);
            if (index !== -1) {
                db.words[index] = { ...db.words[index], ...updatedWord };
                fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } else {
                res.writeHead(404); res.end();
            }
        }
        else if (pathParts[1] === 'dictionary' && pathParts[2] === 'admin-approve') {
            const { id } = JSON.parse(body);
            const index = db.words.findIndex(w => w.id === id);
            if (index !== -1) {
                db.words[index].status = 'approved';
                fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } else { res.writeHead(404); res.end(); }
        }
        else {
            res.writeHead(404); res.end();
        }
    });
});

server.listen(PORT, () => {
    console.log(`Fallback API running at http://localhost:${PORT}`);
    console.log(`Ready for communication with frontend!`);
});
