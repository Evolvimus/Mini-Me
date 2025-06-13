// Globale Variablen
let currentUser = null;
let currentChat = null;
let friends = [];

// Beim Laden der Seite prüfen ob eingeloggt
window.addEventListener('load', () => {
    initializeApp();
});

// App initialisieren
function initializeApp() {
    // Prüfen ob Nutzer eingeloggt ist
    const savedUser = sessionStorage.getItem('currentUser');
    
    if (!savedUser) {
        // Nicht eingeloggt - zur Login-Seite weiterleiten
        window.location.href = 'index.html';
        return;
    }
    
    currentUser = JSON.parse(savedUser);
    
    // Nutzerinformationen anzeigen
    document.getElementById('currentUserName').textContent = currentUser.name;
    
    // Freunde laden
    loadFriends();
    
    // Event Listener für Freund hinzufügen
    document.getElementById('addFriendForm').addEventListener('submit', addFriend);
}

// Freunde laden
async function loadFriends() {
    try {
        const response = await fetch(`/friends/${currentUser.id}`);
        const data = await response.json();
        
        if (data.success) {
            friends = data.friends;
            displayFriends();
        } else {
            console.error('Fehler beim Laden der Freunde:', data.message);
        }
    } catch (error) {
        console.error('Verbindungsfehler beim Laden der Freunde:', error);
    }
}

// Freundesliste anzeigen
function displayFriends() {
    const friendsList = document.getElementById('friendsList');
    
    if (friends.length === 0) {
        friendsList.innerHTML = '<p>Noch keine Freunde hinzugefügt.</p>';
        return;
    }
    
    let html = '';
    friends.forEach(friend => {
        html += `
            <div style="padding: 10px; border: 1px solid #ddd; margin-bottom: 5px; cursor: pointer; border-radius: 5px;" 
                 onclick="openChat('${friend.id}', '${friend.name}')"
                 onmouseover="this.style.backgroundColor='#f0f0f0'" 
                 onmouseout="this.style.backgroundColor='white'">
                <strong>${friend.name}</strong><br>
                <small>@${friend.username}</small>
            </div>
        `;
    });
    
    friendsList.innerHTML = html;
}

// Freund hinzufügen
async function addFriend(e) {
    e.preventDefault();
    
    const friendUsername = document.getElementById('friendUsername').value.trim();
    const messageDiv = document.getElementById('addFriendMessage');
    
    if (!friendUsername) {
        messageDiv.innerHTML = '<p style="color: red;">Bitte Nutzername eingeben!</p>';
        return;
    }
    
    try {
        const response = await fetch('/add-friend', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentUser.id,
                friendUsername: friendUsername
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            messageDiv.innerHTML = `<p style="color: green;">Freund ${data.friend.name} hinzugefügt!</p>`;
            document.getElementById('friendUsername').value = '';
            
            // Freundesliste neu laden
            loadFriends();
            
            // Nachricht nach 3 Sekunden ausblenden
            setTimeout(() => {
                messageDiv.innerHTML = '';
            }, 3000);
        } else {
            messageDiv.innerHTML = `<p style="color: red;">${data.message}</p>`;
        }
    } catch (error) {
        console.error('Fehler beim Hinzufügen des Freundes:', error);
        messageDiv.innerHTML = '<p style="color: red;">Verbindungsfehler. Bitte versuche es erneut.</p>';
    }
}

// Chat öffnen
async function openChat(friendId, friendName) {
    try {
        // Chat zwischen den beiden Nutzern finden
        const response = await fetch(`/chat/between/${currentUser.id}/${friendId}`);
        const data = await response.json();
        
        if (data.success) {
            currentChat = data.chat;
            displayChat(friendName);
        } else {
            console.error('Fehler beim Laden des Chats:', data.message);
        }
    } catch (error) {
        console.error('Verbindungsfehler beim Laden des Chats:', error);
    }
}

// Chat anzeigen
function displayChat(friendName) {
    const chatArea = document.getElementById('chatArea');
    
    let html = `
        <div>
            <h3>💬 Chat mit ${friendName}</h3>
            <div id="chatMessages" style="height: 400px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; margin-bottom: 10px; background-color: #fafafa; border-radius: 5px;">
                ${displayMessages()}
            </div>
            <form id="sendMessageForm" style="display: flex; gap: 10px;">
                <input type="text" id="messageInput" placeholder="Nachricht eingeben..." style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 5px;" required>
                <button type="submit" style="padding: 8px 15px; background-color: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">Senden</button>
            </form>
        </div>
    `;
    
    chatArea.innerHTML = html;
    
    // Event Listener für Nachricht senden
    document.getElementById('sendMessageForm').addEventListener('submit', sendMessage);
    
    // Focus auf Eingabefeld setzen
    document.getElementById('messageInput').focus();
    
    // Enter-Taste zum Senden
    document.getElementById('messageInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            document.getElementById('sendMessageForm').dispatchEvent(new Event('submit'));
        }
    });
    
    // Zum Ende der Nachrichten scrollen
    scrollToBottom();
}

// Nachrichten anzeigen
function displayMessages() {
    if (!currentChat || !currentChat.messages || currentChat.messages.length === 0) {
        return '<p style="color: #666; text-align: center; margin-top: 50px;">Noch keine Nachrichten. Schreibe die erste Nachricht! 🚀</p>';
    }
    
    let html = '';
    currentChat.messages.forEach(message => {
        const isOwnMessage = message.senderId === currentUser.id;
        const timestamp = new Date(message.timestamp).toLocaleString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        html += `
            <div style="margin-bottom: 15px; text-align: ${isOwnMessage ? 'right' : 'left'};">
                <div style="display: inline-block; max-width: 70%; padding: 10px; border-radius: 15px; 
                           background-color: ${isOwnMessage ? '#007bff' : '#e9ecef'}; 
                           color: ${isOwnMessage ? 'white' : 'black'};
                           box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <div style="word-wrap: break-word;">${escapeHtml(message.text)}</div>
                    <div style="font-size: 0.75em; opacity: 0.8; margin-top: 5px;">
                        ${timestamp}
                    </div>
                </div>
            </div>
        `;
    });
    
    return html;
}

// HTML escapen für Sicherheit
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Zum Ende der Nachrichten scrollen
function scrollToBottom() {
    setTimeout(() => {
        const messagesDiv = document.getElementById('chatMessages');
        if (messagesDiv) {
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
    }, 100);
}

// Nachricht senden
async function sendMessage(e) {
    e.preventDefault();
    
    const messageInput = document.getElementById('messageInput');
    const messageText = messageInput.value.trim();
    
    if (!messageText) {
        return;
    }
    
    // Eingabefeld sofort leeren für bessere UX
    messageInput.value = '';
    
    try {
        const response = await fetch(`/chat/${currentChat.id}/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                senderId: currentUser.id,
                text: messageText
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Nachricht zur aktuellen Chat-Ansicht hinzufügen
            currentChat.messages.push(data.message);
            
            // Chat-Ansicht aktualisieren
            const messagesDiv = document.getElementById('chatMessages');
            messagesDiv.innerHTML = displayMessages();
            
            // Zum Ende scrollen
            scrollToBottom();
            
            // Focus zurück auf Eingabefeld
            messageInput.focus();
        } else {
            console.error('Fehler beim Senden der Nachricht:', data.message);
            alert('Fehler beim Senden der Nachricht: ' + data.message);
            // Text wieder ins Eingabefeld setzen bei Fehler
            messageInput.value = messageText;
        }
    } catch (error) {
        console.error('Verbindungsfehler beim Senden der Nachricht:', error);
        alert('Verbindungsfehler. Bitte versuche es erneut.');
        // Text wieder ins Eingabefeld setzen bei Fehler
        messageInput.value = messageText;
    }
}

// Logout-Funktion
function logout() {
    if (confirm('Möchtest du dich wirklich abmelden?')) {
        // Session-Daten löschen
        sessionStorage.removeItem('currentUser');
        
        // Zur Login-Seite weiterleiten
        window.location.href = 'index.html';
    }
}

// Automatisches Aktualisieren der Nachrichten alle 5 Sekunden
let autoUpdateInterval = setInterval(async () => {
    if (currentChat) {
        try {
            const response = await fetch(`/chat/${currentChat.id}?userId=${currentUser.id}`);
            const data = await response.json();
            
            if (data.success) {
                // Prüfen ob neue Nachrichten vorhanden sind
                if (data.chat.messages.length > currentChat.messages.length) {
                    const messagesDiv = document.getElementById('chatMessages');
                    const wasAtBottom = messagesDiv && (messagesDiv.scrollTop + messagesDiv.clientHeight >= messagesDiv.scrollHeight - 50);
                    
                    currentChat = data.chat;
                    
                    // Chat-Ansicht aktualisieren
                    if (messagesDiv) {
                        messagesDiv.innerHTML = displayMessages();
                        
                        // Nur automatisch scrollen wenn der Nutzer bereits am Ende war
                        if (wasAtBottom) {
                            scrollToBottom();
                        }
                    }
                }
            }
        } catch (error) {
            // Stille Behandlung von Verbindungsfehlern beim automatischen Update
            console.log('Automatisches Update fehlgeschlagen:', error);
        }
    }
}, 5000); // Alle 5 Sekunden

// Cleanup beim Verlassen der Seite
window.addEventListener('beforeunload', () => {
    if (autoUpdateInterval) {
        clearInterval(autoUpdateInterval);
    }
});

// Benachrichtigung über neue Nachrichten (falls Browser-Tab nicht aktiv)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Tab ist nicht sichtbar - könnte für Push-Benachrichtigungen genutzt werden
        console.log('Tab ist nicht aktiv');
    } else {
        // Tab ist wieder aktiv
        console.log('Tab ist wieder aktiv');
    }
});