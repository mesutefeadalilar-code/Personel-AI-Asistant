#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Jarvis - Personal AI Assistant
A voice-controlled AI assistant for learning and productivity
"""

import os
import json
import datetime
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import pyttsx3
import speech_recognition as sr
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Initialize text-to-speech engine
engine = pyttsx3.init()
engine.setProperty('rate', 150)  # Speed
engine.setProperty('volume', 0.9)  # Volume

# Initialize speech recognizer
recognizer = sr.Recognizer()

# Data storage
NOTES_FILE = 'data/notes.json'
os.makedirs('data', exist_ok=True)


class Jarvis:
    """Main Jarvis Assistant Class"""
    
    def __init__(self):
        self.name = "Jarvis"
        self.notes = self.load_notes()
        self.user_name = "Student"
    
    def load_notes(self):
        """Load notes from file"""
        if os.path.exists(NOTES_FILE):
            with open(NOTES_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {"notes": [], "reminders": []}
    
    def save_notes(self):
        """Save notes to file"""
        with open(NOTES_FILE, 'w', encoding='utf-8') as f:
            json.dump(self.notes, f, ensure_ascii=False, indent=2)
    
    def speak(self, text):
        """Convert text to speech"""
        try:
            engine.say(text)
            engine.runAndWait()
        except Exception as e:
            print(f"Speak error: {e}")
    
    def listen(self):
        """Listen to user voice"""
        try:
            with sr.Microphone() as source:
                recognizer.adjust_for_ambient_noise(source)
                audio = recognizer.listen(source, timeout=5)
                text = recognizer.recognize_google(audio, language='tr-TR')
                return text.lower()
        except sr.UnknownValueError:
            return None
        except sr.RequestError:
            return None
    
    def process_command(self, command):
        """Process user command"""
        
        # Greetings
        if any(word in command for word in ['merhaba', 'selam', 'hey', 'jarvis']):
            response = f"Merhaba! Ben Jarvis, senin kişisel asistanın. Sana nasıl yardımcı olabilirim?"
            return response
        
        # Add note
        if 'not ekle' in command or 'not al' in command:
            note_text = command.replace('not ekle', '').replace('not al', '').strip()
            self.notes['notes'].append({
                'text': note_text,
                'date': datetime.datetime.now().strftime('%Y-%m-%d %H:%M')
            })
            self.save_notes()
            response = f"Notun kaydedildi: {note_text}"
            return response
        
        # View notes
        if 'notlarımı göster' in command or 'notları listele' in command:
            if not self.notes['notes']:
                response = "Henüz hiç notun yok."
            else:
                notes_list = '\n'.join([f"- {note['text']}" for note in self.notes['notes']])
                response = f"Senin notların:\n{notes_list}"
            return response
        
        # Add reminder
        if 'hatırlat' in command or 'reminder ekle' in command:
            reminder_text = command.replace('hatırlat', '').replace('reminder ekle', '').strip()
            self.notes['reminders'].append({
                'text': reminder_text,
                'date': datetime.datetime.now().strftime('%Y-%m-%d %H:%M')
            })
            self.save_notes()
            response = f"Hatırlatman kaydedildi: {reminder_text}"
            return response
        
        # Study help
        if 'konuyu aç' in command or 'öğret' in command or 'anlat' in command:
            topic = command.replace('konuyu aç', '').replace('öğret', '').replace('anlat', '').strip()
            response = f"{topic} konusu hakkında daha fazla bilgi için okulun kaynaklarını kontrol et. Ben sana rehberlik edebilirim!"
            return response
        
        # Time
        if 'saat' in command or 'zaman' in command:
            current_time = datetime.datetime.now().strftime('%H:%M')
            response = f"Şu anki saat: {current_time}"
            return response
        
        # Help
        if 'yardım' in command or 'ne yapabilirim' in command:
            response = """Yapabileceğim şeyler:
- "merhaba" - Selamlaş
- "not ekle [metin]" - Not ekle
- "notlarımı göster" - Notları listele
- "hatırlat [metin]" - Hatırlatma ekle
- "konuyu aç [konu]" - Konuyla ilgili yardım
- "saat kaç" - Saati söyle"""
            return response
        
        # Default response
        response = f"Anladığım komut: {command}. Lütfen 'yardım' yazarak yapabileceğim şeyleri öğren."
        return response


# Initialize Jarvis
jarvis = Jarvis()


# Routes
@app.route('/')
def index():
    """Main page"""
    return render_template('index.html')


@app.route('/api/process', methods=['POST'])
def process():
    """Process user input"""
    data = request.json
    user_input = data.get('message', '').lower()
    
    if not user_input:
        return jsonify({'error': 'No input provided'}), 400
    
    response = jarvis.process_command(user_input)
    
    return jsonify({
        'response': response,
        'timestamp': datetime.datetime.now().isoformat()
    })


@app.route('/api/voice', methods=['POST'])
def voice_command():
    """Process voice command"""
    text = jarvis.listen()
    
    if not text:
        return jsonify({'error': 'Could not understand audio'}), 400
    
    response = jarvis.process_command(text)
    jarvis.speak(response)
    
    return jsonify({
        'input': text,
        'response': response,
        'timestamp': datetime.datetime.now().isoformat()
    })


@app.route('/api/notes', methods=['GET'])
def get_notes():
    """Get all notes"""
    return jsonify(jarvis.notes)


@app.route('/api/notes', methods=['POST'])
def add_note():
    """Add new note"""
    data = request.json
    note_text = data.get('text', '')
    
    if not note_text:
        return jsonify({'error': 'Note text is required'}), 400
    
    jarvis.notes['notes'].append({
        'text': note_text,
        'date': datetime.datetime.now().strftime('%Y-%m-%d %H:%M')
    })
    jarvis.save_notes()
    
    return jsonify({'success': True, 'note': note_text})


if __name__ == '__main__':
    app.run(debug=True, port=5000)
