// ==================== GLOBAL VARIABLES ====================
let messageCount = 1;
let allNotes = [];
let allReminders = [];
const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const voiceBtn = document.getElementById('voiceBtn');
const notesList = document.getElementById('notesList');
const notesModal = document.getElementById('notesModal');
const modalClose = document.querySelector('.modal-close');

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    loadNotes();
    updateStats();
});

// ==================== EVENT LISTENERS ====================
function initializeEventListeners() {
    // Send message on button click
    sendBtn.addEventListener('click', sendMessage);
    
    // Send message on Enter key
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // Voice button
    voiceBtn.addEventListener('click', handleVoiceCommand);
    
    // Quick action buttons
    document.querySelectorAll('.quick-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const command = e.target.dataset.command;
            userInput.value = command;
            sendMessage();
        });
    });
    
    // Modal close
    modalClose.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target === notesModal) {
            closeModal();
        }
    });
    
    // Notes list click to open modal
    notesList.addEventListener('click', () => {
        if (allNotes.length > 0) {
            showAllNotes();
        }
    });
}

// ==================== MESSAGE HANDLING ====================
async function sendMessage() {
    const message = userInput.value.trim();
    
    if (!message) return;
    
    // Clear input
    userInput.value = '';
    
    // Add user message to chat
    addMessageToChat(message, 'user');
    messageCount++;
    
    try {
        // Send to backend
        const response = await fetch('/api/process', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: message })
        });
        
        if (!response.ok) throw new Error('Network response was not ok');
        
        const data = await response.json();
        const assistantResponse = data.response;
        
        // Add assistant message to chat
        addMessageToChat(assistantResponse, 'assistant');
        messageCount++;
        
        // Handle special commands
        handleSpecialCommands(message, assistantResponse);
        
    } catch (error) {
        console.error('Error:', error);
        addMessageToChat('Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.', 'assistant');
    }
    
    updateStats();
}

function addMessageToChat(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    const now = new Date();
    const timeStr = now.toLocaleTimeString('tr-TR', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    messageDiv.innerHTML = `
        <div class="message-content">${escapeHtml(text)}</div>
        <span class="message-time">${timeStr}</span>
    `;
    
    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    chatMessages.parentElement.scrollTop = chatMessages.parentElement.scrollHeight;
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// ==================== SPECIAL COMMANDS ====================
function handleSpecialCommands(message, response) {
    const lowerMsg = message.toLowerCase();
    
    // Handle note addition
    if (lowerMsg.includes('not ekle') || lowerMsg.includes('not al')) {
        const noteText = message
            .replace(/not ekle/gi, '')
            .replace(/not al/gi, '')
            .trim();
        
        if (noteText) {
            addNote(noteText);
        }
    }
    
    // Handle reminder addition
    if (lowerMsg.includes('hatırlat') || lowerMsg.includes('reminder')) {
        const reminderText = message
            .replace(/hatırlat/gi, '')
            .replace(/reminder.*ekle/gi, '')
            .trim();
        
        if (reminderText) {
            addReminder(reminderText);
        }
    }
}

// ==================== NOTES MANAGEMENT ====================
function addNote(noteText) {
    const note = {
        id: Date.now(),
        text: noteText,
        date: new Date().toLocaleString('tr-TR')
    };
    
    allNotes.push(note);
    saveNotes();
    updateNotesList();
}

function addReminder(reminderText) {
    const reminder = {
        id: Date.now(),
        text: reminderText,
        date: new Date().toLocaleString('tr-TR')
    };
    
    allReminders.push(reminder);
    saveNotes();
    updateNotesList();
}

function saveNotes() {
    localStorage.setItem('jarvis_notes', JSON.stringify(allNotes));
    localStorage.setItem('jarvis_reminders', JSON.stringify(allReminders));
}

function loadNotes() {
    const notesData = localStorage.getItem('jarvis_notes');
    const remindersData = localStorage.getItem('jarvis_reminders');
    
    allNotes = notesData ? JSON.parse(notesData) : [];
    allReminders = remindersData ? JSON.parse(remindersData) : [];
    
    updateNotesList();
}

function updateNotesList() {
    const combinedItems = [
        ...allNotes.map(n => ({ ...n, type: 'note' })),
        ...allReminders.map(r => ({ ...r, type: 'reminder' }))
    ].sort((a, b) => b.id - a.id).slice(0, 5);
    
    if (combinedItems.length === 0) {
        notesList.innerHTML = '<p class="empty-message">Henüz not yok</p>';
    } else {
        notesList.innerHTML = combinedItems.map(item => `
            <div class="note-item" title="${item.text}">
                ${item.type === 'reminder' ? '⏰' : '📝'} ${item.text.substring(0, 25)}...
            </div>
        `).join('');
    }
}

function showAllNotes() {
    const fullNotesList = document.getElementById('fullNotesList');
    const combinedItems = [
        ...allNotes.map(n => ({ ...n, type: 'note' })),
        ...allReminders.map(r => ({ ...r, type: 'reminder' }))
    ].sort((a, b) => b.id - a.id);
    
    if (combinedItems.length === 0) {
        fullNotesList.innerHTML = '<p class="empty-message">Henüz not yok</p>';
    } else {
        fullNotesList.innerHTML = combinedItems.map(item => `
            <div class="full-note-item">
                <div class="full-note-item-text">
                    ${item.type === 'reminder' ? '⏰' : '📝'} ${item.text}
                </div>
                <div class="full-note-item-date">${item.date}</div>
            </div>
        `).join('');
    }
    
    notesModal.classList.add('active');
}

function closeModal() {
    notesModal.classList.remove('active');
}

// ==================== VOICE COMMAND ====================
async function handleVoiceCommand() {
    // Check browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        addMessageToChat('Tarayıcınız sesli komutları desteklemiyor.', 'assistant');
        return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.lang = 'tr-TR';
    
    voiceBtn.classList.add('listening');
    voiceBtn.textContent = '🎤 Dinleniyor...';
    
    recognition.onstart = () => {
        console.log('Dinleme başladı...');
    };
    
    recognition.onresult = (event) => {
        let transcript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
        }
        
        console.log('Tanınan metin:', transcript);
        userInput.value = transcript.toLowerCase();
        sendMessage();
    };
    
    recognition.onerror = (event) => {
        console.error('Ses tanıma hatası:', event.error);
        addMessageToChat(`Sesli komut hatası: ${event.error}`, 'assistant');
    };
    
    recognition.onend = () => {
        voiceBtn.classList.remove('listening');
        voiceBtn.textContent = '🎤 Sesli Komut';
    };
    
    try {
        recognition.start();
    } catch (error) {
        console.error('Ses tanıma başlatma hatası:', error);
        voiceBtn.classList.remove('listening');
        voiceBtn.textContent = '🎤 Sesli Komut';
    }
}

// ==================== STATISTICS ====================
function updateStats() {
    const totalNotes = allNotes.length;
    const totalReminders = allReminders.length;
    const totalMessages = document.querySelectorAll('.message').length;
    
    document.getElementById('totalNotes').textContent = totalNotes;
    document.getElementById('totalReminders').textContent = totalReminders;
    document.getElementById('totalMessages').textContent = totalMessages;
}

// ==================== UTILITIES ====================
function formatTime(date) {
    return date.toLocaleTimeString('tr-TR', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

// ==================== AUTO-SCROLL ==================== 
const observer = new MutationObserver(() => {
    chatMessages.parentElement.scrollTop = chatMessages.parentElement.scrollHeight;
});

observer.observe(chatMessages, { childList: true });

// Focus on input field
userInput.focus();
