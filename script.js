// ============================================
// EMOTIONAL SUPPORT CHATBOT - GOEMOTIONS BERT + LLM
// Complete Ready-to-Use Version
// ============================================

console.log('🚀 MindfulChat AI Starting...');

// ============================================
// CONFIGURATION - ADD YOUR API KEYS HERE
// ============================================

const API_CONFIG = {
    // Hugging Face API (GoEmotions BERT Model)
    huggingface: {
        token: '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', // Get from: https://huggingface.co/settings/tokens
        model: 'SamLowe/roberta-base-go_emotions' // GoEmotions fine-tuned BERT
    },
    
    // Google Gemini API (for LLM responses)
    gemini: {
        apiKey: 'AIzaSyB_VjQO7ntJqDGegkvwAtq5Kb1s_RoHJbI', // Get from: https://makersuite.google.com/app/apikey
        url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent'
    }
};

// ============================================
// GOEMOTIONS - 28 EMOTION LABELS
// ============================================

const GOEMOTIONS = {
    labels: [
        'admiration', 'amusement', 'anger', 'annoyance', 'approval',
        'caring', 'confusion', 'curiosity', 'desire', 'disappointment',
        'disapproval', 'disgust', 'embarrassment', 'excitement', 'fear',
        'gratitude', 'grief', 'joy', 'love', 'nervousness',
        'optimism', 'pride', 'realization', 'relief', 'remorse',
        'sadness', 'surprise', 'neutral'
    ],
    
    // Group emotions for UI display (map 28 → 5)
    displayMapping: {
        happy: ['joy', 'amusement', 'excitement', 'love', 'gratitude', 'optimism', 'pride', 'relief', 'admiration', 'approval', 'caring', 'desire'],
        sad: ['sadness', 'grief', 'disappointment', 'embarrassment', 'remorse'],
        anxious: ['fear', 'nervousness', 'confusion'],
        angry: ['anger', 'annoyance', 'disgust', 'disapproval'],
        neutral: ['neutral', 'curiosity', 'realization', 'surprise']
    },
    
    // Map display category back to emotion
    getDisplayEmotion(emotion) {
        for (const [display, emotions] of Object.entries(this.displayMapping)) {
            if (emotions.includes(emotion)) return display;
        }
        return 'neutral';
    }
};

// ============================================
// STATE MANAGEMENT
// ============================================

const AppState = {
    messages: [],
    conversationHistory: [],
    emotionHistory: [],
    currentEmotion: 'neutral',
    emotionConfidence: 0,
    moodData: { happy: 0, sad: 0, anxious: 0, angry: 0, neutral: 0 },
    sessionData: { startTime: new Date(), messageCount: 0 },
    isListening: false,
    isSpeaking: false,
    recognition: null,
    moodChart: null
};

// ============================================
// GOEMOTIONS BERT EMOTION ANALYZER
// ============================================

const EmotionAnalyzer = {
    async detectEmotion(text) {
        console.log('🧠 Analyzing emotion with GoEmotions BERT...');
        
        try {
            showLoading();
            
            // Call Hugging Face API
            const response = await fetch(
                `https://api-inference.huggingface.co/models/${API_CONFIG.huggingface.model}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${API_CONFIG.huggingface.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        inputs: text,
                        options: {
                            wait_for_model: true,
                            use_cache: false
                        }
                    })
                }
            );
            
            if (!response.ok) {
                console.warn('⚠️ BERT API failed, using fallback');
                hideLoading();
                return this.keywordFallback(text);
            }
            
            const result = await response.json();
            console.log('📊 BERT Response:', result);
            
            // Check for errors
            if (result.error) {
                console.warn('⚠️ API Error:', result.error);
                hideLoading();
                return this.keywordFallback(text);
            }
            
            // Parse BERT output
            const analysis = this.parseBERTOutput(result, text);
            
            hideLoading();
            console.log(`✅ Detected: ${analysis.primary.emotion} (${analysis.primary.score}%)`);
            
            return analysis;
            
        } catch (error) {
            console.error('❌ Error:', error);
            hideLoading();
            return this.keywordFallback(text);
        }
    },
    
    parseBERTOutput(result, text) {
        // Handle different response formats
        let emotions = [];
        
        if (Array.isArray(result) && result.length > 0) {
            emotions = Array.isArray(result[0]) ? result[0] : result;
        } else if (result.labels && result.scores) {
            emotions = result.labels.map((label, i) => ({
                label: label,
                score: result.scores[i]
            }));
        } else {
            emotions = result;
        }
        
        // Sort by score
        emotions.sort((a, b) => b.score - a.score);
        
        // Get top emotions
        const top = emotions.slice(0, 5).map(e => ({
            emotion: e.label.toLowerCase(),
            score: Math.round(e.score * 100)
        }));
        
        const primary = top[0];
        const secondary = top[1]?.score > 20 ? top[1] : null;
        
        // Detect intensity
        const exclamations = (text.match(/!/g) || []).length;
        const caps = (text.match(/[A-Z]/g) || []).length / text.length;
        const intensity = exclamations >= 3 || caps > 0.5 ? 'high' : 
                         exclamations >= 1 || caps > 0.2 ? 'medium' : 'low';
        
        return {
            text: text,
            primary: primary,
            secondary: secondary,
            allEmotions: top,
            intensity: intensity,
            hasQuestion: text.includes('?'),
            timestamp: new Date().toISOString()
        };
    },
    
    keywordFallback(text) {
        console.log('🔍 Using keyword-based fallback');
        
        const keywords = {
            joy: ['happy', 'joy', 'joyful', 'great', 'wonderful', 'amazing', 'fantastic', 'awesome', 'love', 'yay'],
            excitement: ['excited', 'exciting', 'cant wait', "can't wait", 'pumped', 'hyped', 'thrilled', 'stoked'],
            sadness: ['sad', 'unhappy', 'depressed', 'down', 'blue', 'miserable', 'hurt', 'crying', 'cry'],
            anger: ['angry', 'mad', 'furious', 'pissed', 'hate', 'rage', 'annoyed'],
            fear: ['scared', 'afraid', 'terrified', 'fear', 'fearful', 'frightened'],
            nervousness: ['nervous', 'anxious', 'anxiety', 'stress', 'stressed', 'worried', 'worry', 'panic'],
            gratitude: ['thank', 'thanks', 'grateful', 'appreciate', 'thankful'],
            love: ['love', 'adore', 'cherish', 'care about'],
            disappointment: ['disappointed', 'let down', 'expected more'],
            grief: ['loss', 'lost', 'death', 'died', 'miss', 'missing'],
            pride: ['proud', 'accomplished', 'achieved', 'achievement'],
            confusion: ['confused', 'dont understand', "don't understand", 'unclear', 'what'],
            neutral: ['ok', 'okay', 'fine', 'alright', 'hi', 'hello', 'hey']
        };
        
        const lowerText = text.toLowerCase();
        const scores = {};
        
        // Count matches
        for (const [emotion, words] of Object.entries(keywords)) {
            scores[emotion] = 0;
            for (const word of words) {
                if (lowerText.includes(word)) {
                    scores[emotion]++;
                }
            }
        }
        
        // Find top emotion
        const sorted = Object.entries(scores)
            .filter(([, score]) => score > 0)
            .sort(([, a], [, b]) => b - a);
        
        const primary = sorted[0] || ['neutral', 1];
        const secondary = sorted[1] || null;
        
        return {
            text: text,
            primary: { emotion: primary[0], score: 70 },
            secondary: secondary ? { emotion: secondary[0], score: 50 } : null,
            allEmotions: sorted.slice(0, 3).map(([e, s]) => ({ emotion: e, score: s * 20 })),
            intensity: 'medium',
            hasQuestion: text.includes('?'),
            timestamp: new Date().toISOString()
        };
    }
};

// ============================================
// LLM RESPONSE GENERATOR (FRIEND-LIKE)
// ============================================

const ResponseGenerator = {
    async generateResponse(emotionAnalysis) {
        console.log('💬 Generating friend-like response...');
        
        // Add to history
        AppState.conversationHistory.push({
            text: emotionAnalysis.text,
            emotion: emotionAnalysis.primary.emotion,
            timestamp: Date.now()
        });
        
        AppState.emotionHistory.push(emotionAnalysis.primary.emotion);
        
        // Keep last 5
        if (AppState.conversationHistory.length > 5) {
            AppState.conversationHistory.shift();
            AppState.emotionHistory.shift();
        }
        
        // Try Gemini first
        if (API_CONFIG.gemini.apiKey && API_CONFIG.gemini.apiKey !== 'YOUR_GEMINI_API_KEY') {
            try {
                return await this.generateWithGemini(emotionAnalysis);
            } catch (error) {
                console.warn('⚠️ Gemini failed, using templates');
                return this.generateTemplate(emotionAnalysis);
            }
        }
        
        return this.generateTemplate(emotionAnalysis);
    },
    
    async generateWithGemini(analysis) {
        const { primary, secondary, intensity, hasQuestion } = analysis;
        
        // Detect conversation pattern
        const pattern = this.detectPattern();
        
        // Build context
        const recentContext = AppState.conversationHistory.slice(-3)
            .map(m => `User: "${m.text}" (${m.emotion})`)
            .join('\n');
        
        // Build prompt
        const prompt = `You're a caring friend chatting casually with someone who needs emotional support.

RECENT CONVERSATION:
${recentContext || 'Just started chatting'}

CURRENT MESSAGE: "${analysis.text}"

EMOTION DETECTED:
- Primary: ${primary.emotion} (${primary.score}% confidence)
${secondary ? `- Secondary: ${secondary.emotion} (${secondary.score}%)` : ''}
- Intensity: ${intensity}

CONVERSATION PATTERN: ${pattern}

HOW TO RESPOND TO ${primary.emotion.toUpperCase()}:
${this.getEmotionGuidance(primary.emotion)}

STRICT RULES:
1. Talk like a REAL FRIEND - casual, warm, natural
2. Use contractions: "I'm", "you're", "that's", "don't"
3. Keep it SHORT: 2-3 sentences MAXIMUM
4. Ask ONE good follow-up question
5. NO therapist talk - avoid "I validate", "I hear you saying"
6. NO corporate language - avoid "I appreciate you sharing"
7. Match their energy - ${intensity === 'high' ? 'be enthusiastic!' : 'keep it chill'}
8. ${hasQuestion ? 'They asked a question - ANSWER IT FIRST!' : 'Start with empathy'}
9. Remember what they said before
10. Be supportive but keep it natural and casual

Generate your friend response (2-3 sentences max):`;
        
        // Call Gemini
        const response = await fetch(
            `${API_CONFIG.gemini.url}?key=${API_CONFIG.gemini.apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.9,
                        maxOutputTokens: 150,
                        topP: 0.95
                    }
                })
            }
        );
        
        if (!response.ok) {
            throw new Error('Gemini API failed');
        }
        
        const data = await response.json();
        return data.candidates[0].content.parts[0].text.trim();
    },
    
    getEmotionGuidance(emotion) {
        const guidance = {
            joy: "Share their happiness! Be genuinely excited. Ask what made them so happy.",
            excitement: "Match their energy! Be enthusiastic. Ask what they're pumped about.",
            amusement: "Keep it light and fun. Maybe add something playful.",
            love: "Be warm and supportive. Ask about what/who they love.",
            gratitude: "Accept thanks warmly. Be humble but appreciative.",
            pride: "Celebrate with them! They earned it. Be genuinely proud.",
            relief: "Acknowledge their relief. The weight is off. Ask what happened.",
            optimism: "Support their positive outlook. Be encouraging.",
            admiration: "They appreciate someone/something. Be supportive.",
            caring: "They care deeply. That's touching. Ask about them.",
            approval: "They agree. Acknowledge their perspective.",
            desire: "They want something. Explore what and why.",
            
            sadness: "Be gentle and caring. Don't rush to fix it. Just be there.",
            grief: "Deep empathy. This is heavy. Acknowledge their pain.",
            disappointment: "Validate it. It's okay to be disappointed. What happened?",
            embarrassment: "Be understanding. We've all been there. It'll pass.",
            remorse: "Show compassion. They're being hard on themselves.",
            
            anger: "Acknowledge frustration. Don't minimize. What triggered this?",
            annoyance: "Relate to it. Things are annoying sometimes.",
            disgust: "Validate their reaction. Some things are just wrong/gross.",
            disapproval: "They disagree. Understand why.",
            
            fear: "Reassure gently. Their fears are real. What's scaring them?",
            nervousness: "Be calming. Nerves are normal. Offer grounding support.",
            confusion: "Help them think through it. Ask clarifying questions.",
            
            curiosity: "Engage their curiosity! Explore it together.",
            surprise: "Acknowledge the unexpectedness. Ask what happened.",
            realization: "Support their insight. They figured something out!",
            
            neutral: "Be naturally conversational. Ask what's on their mind."
        };
        
        return guidance[emotion] || guidance.neutral;
    },
    
    detectPattern() {
        if (AppState.emotionHistory.length < 3) {
            return 'New conversation - be welcoming';
        }
        
        const recent = AppState.emotionHistory.slice(-3);
        const negative = ['sadness', 'anger', 'fear', 'grief', 'nervousness', 'disappointment'];
        const positive = ['joy', 'excitement', 'love', 'gratitude', 'pride'];
        
        
        if (recent.every(e => negative.includes(e))) {
            return 'Struggling consistently - show extra support';
        }
        
        if (negative.includes(recent[0]) && positive.includes(recent[2])) {
            return 'Mood improving - acknowledge the shift';
        }
        
        if (positive.includes(recent[0]) && negative.includes(recent[2])) {
            return 'Mood declined - be empathetic';
        }
        
        return 'Normal flow - match their energy';
    },
    
    generateTemplate(analysis) {
        const { primary, intensity } = analysis;
        const emotion = primary.emotion;
        
        const templates = {
            joy: [
                "That's awesome! I'm really happy for you. 😊 What made today so great?",
                "Love this energy! Tell me more about what's going on.",
                "This is amazing! Your happiness is contagious."
            ],
            excitement: [
                "Okay now I'm excited too! When's this happening?",
                "This sounds incredible! What are you most pumped about?",
                "Yes!! I love this for you. Tell me everything!"
            ],
            amusement: [
                "Haha love it! What else is making you laugh today?",
                "That's hilarious! Tell me more.",
                "You're in a good mood! What's got you smiling?"
            ],
            love: [
                "That's really sweet. ❤️ Tell me more!",
                "Aww, I love hearing this. Who/what are you loving?",
                "This is so wholesome. I'm here for it!"
            ],
            gratitude: [
                "Of course! That's what friends are for. 💛 How are you feeling now?",
                "Anytime! I'm just glad I could help.",
                "You don't have to thank me, but I appreciate it. 😊"
            ],
            pride: [
                "You should be proud! That's incredible. 🌟 How does it feel?",
                "Yes! You earned this. I'm proud of you too!",
                "That's amazing! Celebrate yourself!"
            ],
            relief: [
                "That must feel so good! What happened?",
                "Finally! I'm glad that weight is off you. Tell me more.",
                "Phew! That's a relief for sure. What changed?"
            ],
            optimism: [
                "I love that outlook! What's making you feel so positive?",
                "That's the spirit! What are you looking forward to?",
                "Your positivity is refreshing! Tell me more."
            ],
            
            sadness: [
                "I'm really sorry you're going through this. 💙 Want to talk about it?",
                "That sounds really hard. I'm here for you.",
                "I can tell you're hurting. You're not alone in this."
            ],
            grief: [
                "I'm so sorry. 💔 That's incredibly painful. I'm here with you.",
                "My heart breaks for you. Take all the time you need.",
                "There are no words for this pain. Just know I'm here."
            ],
            disappointment: [
                "That's disappointing for sure. I'm sorry. What happened?",
                "I can understand why you feel let down. That's tough.",
                "It's okay to be disappointed. Those feelings are valid."
            ],
            embarrassment: [
                "We've all been there, trust me. It'll pass. What happened?",
                "That's awkward for sure, but it's okay. You'll be alright.",
                "I get it. Embarrassing moments are the worst."
            ],
            remorse: [
                "Hey, you're being really hard on yourself. What happened?",
                "It's okay to feel bad, but don't beat yourself up.",
                "We all make mistakes. That's how we learn."
            ],
            
            anger: [
                "That sounds really frustrating. I'd be upset too. What happened?",
                "Okay yeah, I can see why you're angry. Want to vent?",
                "That's not okay. You have every right to be mad."
            ],
            annoyance: [
                "That's annoying for sure. I get it. What's bothering you?",
                "I'd be irritated too. Some things are just frustrating.",
                "Ugh, I feel that. What happened?"
            ],
            disgust: [
                "That's gross/wrong. I don't blame you for feeling that way.",
                "Yeah, that's not okay. What happened?",
                "I totally understand your reaction. That's awful."
            ],
            disapproval: [
                "I hear you. You don't agree with that. Why not?",
                "That doesn't sit right with you. Tell me more.",
                "I get why you feel that way. What's your perspective?"
            ],
            
            fear: [
                "That sounds scary. Your feelings are valid. 💙 What's worrying you?",
                "I hear you. Fear is real. Want to talk through it?",
                "That's a lot to carry. You're not alone. I'm here."
            ],
            nervousness: [
                "Nerves are the worst but totally normal. What's coming up?",
                "I get it. Being nervous just means you care. What's on your mind?",
                "You've got this. Take a breath. What's making you anxious?"
            ],
            confusion: [
                "That's confusing for sure. Let's figure it out together. What's unclear?",
                "I can see why you're lost. Want to talk through it?",
                "Confusion is frustrating. What's the main thing you're stuck on?"
            ],
            
            curiosity: [
                "Ooh interesting question! Let's explore that together.",
                "I'm curious too now! What made you think about this?",
                "That's a great question. What do you think?"
            ],
            surprise: [
                "Whoa! That's unexpected. What happened?",
                "Didn't see that coming! Tell me more.",
                "That's a surprise for sure! How do you feel about it?"
            ],
            realization: [
                "Oh! That makes sense now, right? What did you realize?",
                "Aha moment! Tell me what clicked for you.",
                "Love when things suddenly make sense. What did you figure out?"
            ],
            
            neutral: [
                "Hey! What's on your mind today?",
                "I'm here. What's going on?",
                "How's everything? Want to chat?"
            ]
        };
        
        const options = templates[emotion] || templates.neutral;
        let response = options[Math.floor(Math.random() * options.length)];
        
        // Add emphasis for high intensity
        if (intensity === 'high') {
            response = response.replace(/!/, '!!');
        }
        
        return response;
    }
};

// ============================================
// DATABASE MODULE
// ============================================

const DatabaseModule = {
    saveMessage(message) {
        try {
            const conversations = this.getConversations();
            conversations.push(message);
            localStorage.setItem('conversations', JSON.stringify(conversations));
        } catch (error) {
            console.error('Save error:', error);
        }
    },
    
    getConversations() {
        try {
            const data = localStorage.getItem('conversations');
            return data ? JSON.parse(data) : [];
        } catch (error) {
            return [];
        }
    },
    
    saveMoodLog(emotion, confidence) {
        try {
            const logs = this.getMoodLogs();
            logs.push({
                emotion,
                confidence,
                timestamp: new Date().toISOString()
            });
            localStorage.setItem('moodLogs', JSON.stringify(logs));
        } catch (error) {
            console.error('Mood save error:', error);
        }
    },
    
    getMoodLogs() {
        try {
            const data = localStorage.getItem('moodLogs');
            return data ? JSON.parse(data) : [];
        } catch (error) {
            return [];
        }
    },
    
    exportData() {
        const data = {
            conversations: this.getConversations(),
            moodLogs: this.getMoodLogs(),
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mindfulchat-export-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        alert('✅ Data exported!');
    }
};

// ============================================
// OUTPUT MODULE
// ============================================

const OutputModule = {
    displayMessage(message) {
        const container = document.getElementById('chatMessages');
        if (!container) return;
        
        const messageEl = document.createElement('div');
        messageEl.className = `message ${message.type}`;
        if (message.isQuote) messageEl.classList.add('quote');
        
        const contentEl = document.createElement('div');
        contentEl.className = 'message-content';
        
        if (message.type === 'bot' && !message.isQuote) {
            const headerEl = document.createElement('div');
            headerEl.className = 'bot-header';
            headerEl.innerHTML = `
                <span>🤖</span>
                <span>AI Response</span>
                ${message.emotion ? `<span>•</span><span class="capitalize">${message.emotion}</span>` : ''}
            `;
            contentEl.appendChild(headerEl);
        }
        
        const textEl = document.createElement('div');
        textEl.className = 'message-text';
        textEl.textContent = message.text;
        contentEl.appendChild(textEl);
        
        const footerEl = document.createElement('div');
        footerEl.className = 'message-footer';
        footerEl.innerHTML = `
            <span>${message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            ${message.confidence ? `<span>${message.confidence}% confident</span>` : ''}
        `;
        contentEl.appendChild(footerEl);
        
        messageEl.appendChild(contentEl);
        container.appendChild(messageEl);
        container.scrollTop = container.scrollHeight;
    },
    
    speak(text) {
        if (!AppState.isSpeaking) return;
        
        const synth = window.speechSynthesis;
        synth.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        synth.speak(utterance);
    },
    
    updateEmotionCard(emotion, confidence) {
        const card = document.getElementById('emotionCard');
        const icon = document.getElementById('emotionIcon');
        const name = document.getElementById('emotionName');
        const fill = document.getElementById('confidenceFill');
        const value = document.getElementById('confidenceValue');
        
        if (!card) return;
        
        card.className = `emotion-card ${emotion}`;
        
        const icons = {
            happy: '😊',
            sad: '😢',
            anxious: '😰',
            angry: '😠',
            neutral: '😐'
        };
        
        if (icon) icon.textContent = icons[emotion] || '😐';
        if (name) name.textContent = emotion.charAt(0).toUpperCase() + emotion.slice(1);
        if (fill) fill.style.width = `${confidence}%`;
        if (value) value.textContent = `${confidence}%`;
    }
};

// ============================================
// ANALYTICS MODULE
// ============================================

const AnalyticsModule = {
    generateMoodChart() {
        const ctx = document.getElementById('moodChart');
        if (!ctx) return;
        
        if (AppState.moodChart) {
            AppState.moodChart.destroy();
        }
        
        const data = AppState.moodData;
        
        AppState.moodChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Happy', 'Sad', 'Anxious', 'Angry', 'Neutral'],
                datasets: [{
                    data: [data.happy, data.sad, data.anxious, data.angry, data.neutral],
                    backgroundColor: ['#fbbf24', '#3b82f6', '#8b5cf6', '#ef4444', '#6b7280']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    },
    
    updateMoodHistory() {
        const historyEl = document.getElementById('moodHistory');
        if (!historyEl) return;
        
        const logs = DatabaseModule.getMoodLogs().slice(-10).reverse();
        historyEl.innerHTML = '';
        
        if (logs.length === 0) {
            historyEl.innerHTML = '<p style="text-align: center; color: #6b7280;">No history yet</p>';
            return;
        }
        
        const icons = { happy: '😊', sad: '😢', anxious: '😰', angry: '😠', neutral: '😐' };
        
        logs.forEach(log => {
            const entry = document.createElement('div');
            entry.className = 'mood-entry';
            entry.innerHTML = `
                <div class="mood-entry-icon">${icons[log.emotion]}</div>
                <div class="mood-entry-details">
                    <div class="mood-entry-emotion">${log.emotion}</div>
                    <div class="mood-entry-time">${new Date(log.timestamp).toLocaleString()}</div>
                </div>
            `;
            historyEl.appendChild(entry);
        });
    },
    
    updateSessionSummary() {
        const summaryEl = document.getElementById('sessionSummary');
        if (!summaryEl) return;
        
        const duration = Math.floor((new Date() - AppState.sessionData.startTime) / 60000);
        const dominantMood = Object.keys(AppState.moodData).reduce((a, b) => 
            AppState.moodData[a] > AppState.moodData[b] ? a : b
        );
        
        summaryEl.innerHTML = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span>Duration:</span>
                <span>${duration} min</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span>Messages:</span>
                <span>${AppState.sessionData.messageCount}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span>Dominant Mood:</span>
                <span style="text-transform: capitalize;">${dominantMood}</span>
            </div>
        `;
    }
};

// ============================================
// CORE FUNCTIONS
// ============================================

async function sendMessage() {
    const input = document.getElementById('userInput');
    if (!input) return;
    
    const text = input.value.trim();
    if (!text) return;
    
    console.log('📨 Sending message:', text);
    
    input.value = '';
    input.style.height = 'auto';
    
    // Add user message
    const userMessage = {
        type: 'user',
        text: text,
        timestamp: new Date()
    };
    
    AppState.messages.push(userMessage);
    OutputModule.displayMessage(userMessage);
    DatabaseModule.saveMessage(userMessage);
    
    // Update count
    AppState.sessionData.messageCount++;
    const countEl = document.getElementById('messageCount');
    if (countEl) countEl.textContent = AppState.sessionData.messageCount;
    
    try {
        // Step 1: Analyze emotion with GoEmotions BERT
        const emotionAnalysis = await EmotionAnalyzer.detectEmotion(text);
        
        console.log('📊 Emotion Analysis:');
        console.log(`  Primary: ${emotionAnalysis.primary.emotion} (${emotionAnalysis.primary.score}%)`);
        if (emotionAnalysis.secondary) {
            console.log(`  Secondary: ${emotionAnalysis.secondary.emotion} (${emotionAnalysis.secondary.score}%)`);
        }
        
        // Map to display emotion (28 emotions → 5 categories)
        const displayEmotion = GOEMOTIONS.getDisplayEmotion(emotionAnalysis.primary.emotion);
        
        // Update state
        AppState.currentEmotion = displayEmotion;
        AppState.emotionConfidence = emotionAnalysis.primary.score;
        AppState.moodData[displayEmotion]++;
        
        // Update UI
        OutputModule.updateEmotionCard(displayEmotion, emotionAnalysis.primary.score);
        
        // Save to database
        DatabaseModule.saveMoodLog(displayEmotion, emotionAnalysis.primary.score);
        
        // Step 2: Generate friend-like LLM response
        const responseText = await ResponseGenerator.generateResponse(emotionAnalysis);
        
        console.log('💬 Bot Response:', responseText);
        
        // Add bot message
        addBotMessage(responseText, displayEmotion, emotionAnalysis.primary.score);
        
        // Speak if enabled
        if (AppState.isSpeaking) {
            OutputModule.speak(responseText);
        }
        
    } catch (error) {
        console.error('❌ Error processing message:', error);
        addBotMessage("Hey, I hit a snag there. Can you try that again?", 'neutral', 0);
    }
}

function addBotMessage(text, emotion, confidence) {
    const botMessage = {
        type: 'bot',
        text: text,
        timestamp: new Date(),
        emotion: emotion,
        confidence: confidence
    };
    
    AppState.messages.push(botMessage);
    OutputModule.displayMessage(botMessage);
    DatabaseModule.saveMessage(botMessage);
}

// ============================================
// SPEECH & UI FUNCTIONS
// ============================================

function initializeSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.log('Speech not supported');
        return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    AppState.recognition = new SpeechRecognition();
    
    AppState.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const input = document.getElementById('userInput');
        if (input) input.value = transcript;
    };
    
    AppState.recognition.onend = () => {
        AppState.isListening = false;
        const btn = document.getElementById('voiceBtn');
        if (btn) btn.classList.remove('active');
    };
}

function toggleVoiceInput() {
    if (!AppState.recognition) {
        alert('Speech recognition not supported');
        return;
    }
    
    const btn = document.getElementById('voiceBtn');
    
    if (AppState.isListening) {
        AppState.recognition.stop();
        AppState.isListening = false;
        if (btn) btn.classList.remove('active');
    } else {
        AppState.recognition.start();
        AppState.isListening = true;
        if (btn) btn.classList.add('active');
    }
}

function toggleSpeaker() {
    AppState.isSpeaking = !AppState.isSpeaking;
    const btn = document.getElementById('speakerBtn');
    
    if (btn) {
        btn.classList.toggle('active', AppState.isSpeaking);
        btn.textContent = AppState.isSpeaking ? '🔊' : '🔇';
    }
    
    if (!AppState.isSpeaking) {
        window.speechSynthesis.cancel();
    }
}

function showLoading() {
    const loader = document.getElementById('loadingIndicator');
    if (loader) loader.classList.add('active');
}

function hideLoading() {
    const loader = document.getElementById('loadingIndicator');
    if (loader) loader.classList.remove('active');
}

function toggleAnalytics() {
    const panel = document.getElementById('analyticsPanel');
    if (!panel) return;
    
    panel.classList.toggle('active');
    
    if (panel.classList.contains('active')) {
        AnalyticsModule.generateMoodChart();
        AnalyticsModule.updateMoodHistory();
        AnalyticsModule.updateSessionSummary();
    }
}

function toggleArchitecture() {
    const modal = document.getElementById('architectureModal');
    if (modal) modal.classList.toggle('active');
}

function exportData() {
    DatabaseModule.exportData();
}

function getQuote() {
    const quotes = [
        "You are stronger than you think.",
        "Healing is not linear. Be patient with yourself.",
        "Your feelings are valid.",
        "Small steps forward are still progress.",
        "You deserve compassion, especially from yourself.",
        "It's okay to not be okay sometimes.",
        "You're doing better than you think.",
        "This too shall pass."
    ];
    
    const quote = quotes[Math.floor(Math.random() * quotes.length)];
    const quoteMessage = {
        type: 'bot',
        text: `💭 "${quote}"`,
        timestamp: new Date(),
        isQuote: true
    };
    
    AppState.messages.push(quoteMessage);
    OutputModule.displayMessage(quoteMessage);
}

function suggestMusic() {
    const music = {
        happy: "Uplifting Vibes Playlist",
        sad: "Healing & Comfort",
        anxious: "Calm & Peaceful",
        angry: "Release & Let Go",
        neutral: "Ambient Focus"
    };
    
    const suggestion = music[AppState.currentEmotion] || music.neutral;
    addBotMessage(`🎵 Music Suggestion: ${suggestion}`, AppState.currentEmotion, 0);
}

function suggestVideo() {
    const videos = {
        happy: "5-Min Gratitude Meditation",
        sad: "Self-Compassion Meditation",
        anxious: "4-7-8 Breathing Exercise",
        angry: "Progressive Muscle Relaxation",
        neutral: "10-Min Mindfulness"
    };
    
    const suggestion = videos[AppState.currentEmotion] || videos.neutral;
    addBotMessage(`🎬 Video Suggestion: ${suggestion}`, AppState.currentEmotion, 0);
}

function autoResizeTextarea() {
    const textarea = document.getElementById('userInput');
    if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
}

function initializeApp() {
    console.log('✅ Initializing GoEmotions BERT System...');
    
    // Check API keys
    if (API_CONFIG.huggingface.token === 'YOUR_HUGGINGFACE_TOKEN') {
        console.warn('⚠️ WARNING: Hugging Face token not configured!');
        console.warn('Get your token from: https://huggingface.co/settings/tokens');
    }
    
    if (API_CONFIG.gemini.apiKey === 'YOUR_GEMINI_API_KEY') {
        console.warn('⚠️ WARNING: Gemini API key not configured!');
        console.warn('Get your key from: https://makersuite.google.com/app/apikey');
        console.log('📋 Will use template responses as fallback');
    }
    
    const startTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const startEl = document.getElementById('sessionStart');
    if (startEl) startEl.textContent = startTime;
    
    addBotMessage(
        "Hey! I'm your AI emotional support companion. I use GoEmotions BERT to understand how you're feeling and respond like a real friend. How are you today?",
        'neutral',
        0
    );
    
    initializeSpeechRecognition();
    
    const input = document.getElementById('userInput');
    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        input.addEventListener('input', autoResizeTextarea);
    }
    
    console.log('✅ System ready!');
    console.log('');
    console.log('='.repeat(60));
    console.log('GOEMOTIONS BERT SYSTEM CONFIGURATION');
    console.log('='.repeat(60));
    console.log('Emotion Model: SamLowe/roberta-base-go_emotions');
    console.log('Emotions Detected: 28 (GoEmotions dataset)');
    console.log('Response Generator: Google Gemini Pro');
    console.log('Fallback: Template-based responses');
    console.log('='.repeat(60));
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('architectureModal');
        if (modal && modal.classList.contains('active')) {
            toggleArchitecture();
        }
        
        const panel = document.getElementById('analyticsPanel');
        if (panel && panel.classList.contains('active')) {
            toggleAnalytics();
        }
    }
});

// ============================================
// INITIALIZE ON LOAD
// ============================================

window.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Starting MindfulChat AI with GoEmotions BERT...');
    initializeApp();
});

console.log('📝 GoEmotions BERT Script loaded!');
function exportConversationSummary() {
    const summary = {
        sessionDuration: Math.floor((new Date() - AppState.sessionData.startTime) / 60000),
        messageCount: AppState.sessionData.messageCount,
        emotionsDetected: AppState.emotionHistory,
        dominantEmotion: Object.keys(AppState.moodData).reduce((a, b) => 
            AppState.moodData[a] > AppState.moodData[b] ? a : b
        ),
        emotionBreakdown: AppState.moodData,
        conversationHighlights: AppState.messages.filter(m => m.confidence > 80)
    };
    
    console.log('📊 Session Summary:', summary);
    
    // Download as JSON
    const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-summary-${Date.now()}.json`;
    a.click();
}
