const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3005;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Pfade zu JSON-Dateien
const usersFile = path.join(__dirname, 'users.json');
const chatsFile = path.join(__dirname, 'chats.json');

// Hilfsfunktionen für JSON-Dateien
function readJsonFile(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, '[]');
        }
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Fehler beim Lesen von ${filePath}:`, error);
        return [];
    }
}

function writeJsonFile(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`Fehler beim Schreiben von ${filePath}:`, error);
        return false;
    }
}

// Eindeutige ID generieren
function generateId(prefix) {
    return prefix + Date.now() + Math.random().toString(36).substr(2, 9);
}

// Base64 Encoding für Passwörter
function encodePassword(password) {
    return Buffer.from(password).toString('base64');
}

function decodePassword(encodedPassword) {
    return Buffer.from(encodedPassword, 'base64').toString();
}

// Route: Registrierung
app.post('/register', (req, res) => {
    const { name, username, email, password } = req.body;

    // Validierung
    if (!name || !username || !email || !password) {
        return res.status(400).json({ success: false, message: 'Alle Felder sind erforderlich' });
    }

    const users = readJsonFile(usersFile);

    // Prüfen ob Nutzername bereits existiert
    const existingUser = users.find(user => user.username === username);
    if (existingUser) {
        return res.status(400).json({ success: false, message: 'Nutzername bereits vergeben' });
    }

    // Neuen Nutzer erstellen
    const newUser = {
        id: generateId('u'),
        name: name,
        username: username,
        email: email,
        password: encodePassword(password),
        friends: []
    };

    users.push(newUser);

    if (writeJsonFile(usersFile, users)) {
        res.json({ success: true, message: 'Registrierung erfolgreich' });
    } else {
        res.status(500).json({ success: false, message: 'Fehler beim Speichern' });
    }
});

// Route: Login
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Nutzername und Passwort erforderlich' });
    }

    const users = readJsonFile(usersFile);
    const user = users.find(u => u.username === username);

    if (!user) {
        return res.status(401).json({ success: false, message: 'Nutzer nicht gefunden' });
    }

    // Passwort prüfen
    const decodedPassword = decodePassword(user.password);
    if (decodedPassword !== password) {
        return res.status(401).json({ success: false, message: 'Falsches Passwort' });
    }

    // Login erfolgreich - Nutzerdaten ohne Passwort zurückgeben
    const { password: _, ...userWithoutPassword } = user;
    res.json({ success: true, user: userWithoutPassword });
});

// Route: Freund hinzufügen
app.post('/add-friend', (req, res) => {
    const { userId, friendUsername } = req.body;

    if (!userId || !friendUsername) {
        return res.status(400).json({ success: false, message: 'Nutzer-ID und Freund-Nutzername erforderlich' });
    }

    const users = readJsonFile(usersFile);
    const user = users.find(u => u.id === userId);
    const friend = users.find(u => u.username === friendUsername);

    if (!user) {
        return res.status(404).json({ success: false, message: 'Nutzer nicht gefunden' });
    }

    if (!friend) {
        return res.status(404).json({ success: false, message: 'Freund nicht gefunden' });
    }

    if (user.id === friend.id) {
        return res.status(400).json({ success: false, message: 'Du kannst dich nicht selbst als Freund hinzufügen' });
    }

    // Prüfen ob bereits Freunde
    if (user.friends.includes(friend.id)) {
        return res.status(400).json({ success: false, message: 'Bereits in der Freundesliste' });
    }

    // Freundschaft hinzufügen
    user.friends.push(friend.id);
    friend.friends.push(user.id);

    // Chat erstellen falls noch nicht vorhanden
    const chats = readJsonFile(chatsFile);
    const existingChat = chats.find(chat => 
        chat.participants.includes(user.id) && chat.participants.includes(friend.id)
    );

    if (!existingChat) {
        const newChat = {
            id: generateId('chat'),
            participants: [user.id, friend.id],
            messages: []
        };
        chats.push(newChat);
        writeJsonFile(chatsFile, chats);
    }

    if (writeJsonFile(usersFile, users)) {
        res.json({ success: true, message: 'Freund hinzugefügt', friend: { id: friend.id, name: friend.name, username: friend.username } });
    } else {
        res.status(500).json({ success: false, message: 'Fehler beim Speichern' });
    }
});

// Route: Freunde abrufen
app.get('/friends/:userId', (req, res) => {
    const { userId } = req.params;

    const users = readJsonFile(usersFile);
    const user = users.find(u => u.id === userId);

    if (!user) {
        return res.status(404).json({ success: false, message: 'Nutzer nicht gefunden' });
    }

    // Freunde-Details laden
    const friends = users.filter(u => user.friends.includes(u.id))
                         .map(friend => ({
                             id: friend.id,
                             name: friend.name,
                             username: friend.username
                         }));

    res.json({ success: true, friends });
});

// Route: Chat abrufen
app.get('/chat/:chatId', (req, res) => {
    const { chatId } = req.params;
    const { userId } = req.query;

    const chats = readJsonFile(chatsFile);
    const chat = chats.find(c => c.id === chatId);

    if (!chat) {
        return res.status(404).json({ success: false, message: 'Chat nicht gefunden' });
    }

    // Prüfen ob Nutzer Teil des Chats ist
    if (!chat.participants.includes(userId)) {
        return res.status(403).json({ success: false, message: 'Kein Zugriff auf diesen Chat' });
    }

    res.json({ success: true, chat });
});

// Route: Chat zwischen zwei Nutzern finden
app.get('/chat/between/:userId/:friendId', (req, res) => {
    const { userId, friendId } = req.params;

    const chats = readJsonFile(chatsFile);
    const chat = chats.find(c => 
        c.participants.includes(userId) && c.participants.includes(friendId)
    );

    if (!chat) {
        return res.status(404).json({ success: false, message: 'Chat nicht gefunden' });
    }

    res.json({ success: true, chat });
});

// Route: Nachricht senden
app.post('/chat/:chatId/send', (req, res) => {
    const { chatId } = req.params;
    const { senderId, text } = req.body;

    if (!senderId || !text) {
        return res.status(400).json({ success: false, message: 'Absender-ID und Text erforderlich' });
    }

    const chats = readJsonFile(chatsFile);
    const chat = chats.find(c => c.id === chatId);

    if (!chat) {
        return res.status(404).json({ success: false, message: 'Chat nicht gefunden' });
    }

    // Prüfen ob Nutzer Teil des Chats ist
    if (!chat.participants.includes(senderId)) {
        return res.status(403).json({ success: false, message: 'Kein Zugriff auf diesen Chat' });
    }

    // Neue Nachricht hinzufügen
    const newMessage = {
        senderId: senderId,
        text: text,
        timestamp: new Date().toISOString()
    };

    chat.messages.push(newMessage);

    if (writeJsonFile(chatsFile, chats)) {
        res.json({ success: true, message: newMessage });
    } else {
        res.status(500).json({ success: false, message: 'Fehler beim Speichern' });
    }
});

// Server starten
app.listen(PORT, () => {
    console.log(`🚀 WhatsDepp Server läuft auf http://localhost:${PORT}`);
    console.log(`📁 Statische Dateien werden aus ${path.join(__dirname, '../public')} bereitgestellt`);
    
    // Initiale JSON-Dateien erstellen falls sie nicht existieren
    readJsonFile(usersFile);
    readJsonFile(chatsFile);
});