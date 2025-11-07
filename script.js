// ============================================
// EMOTIONAL SUPPORT CHATBOT - ENHANCED VERSION
// 28 GoEmotions + Extended Responses + Voice
// ============================================

console.log('🚀 MindfulChat AI Starting...');

// ============================================
// CONFIGURATION
// ============================================

const API_CONFIG = {
    huggingface: {
        token: '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',
        model: 'SamLowe/roberta-base-go_emotions'
    },
    gemini: {
        apiKey: 'AIzaSyDfNS3pFDaUToURP37nk-yNaFILrmQ7w4s',
        url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent',
        enabled: true
    }
};

// ============================================
// GOEMOTIONS - ALL 28 EMOTIONS
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
    
    displayMapping: {
        happy: ['joy', 'amusement', 'excitement', 'pride', 'relief'],
        sad: ['sadness', 'grief', 'disappointment', 'remorse'],
        anxious: ['fear', 'nervousness'],
        angry: ['anger', 'annoyance', 'disgust'],
        grateful: ['gratitude', 'appreciation'],
        loving: ['love', 'caring', 'admiration'],
        confused: ['confusion', 'realization'],
        embarrassed: ['embarrassment'],
        surprised: ['surprise'],
        neutral: ['neutral', 'curiosity', 'approval', 'disapproval', 'desire', 'optimism']
    },
    
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
    moodData: { 
        happy: 0, sad: 0, anxious: 0, angry: 0, 
        grateful: 0, loving: 0, confused: 0, 
        embarrassed: 0, surprised: 0, neutral: 0 
    },
    sessionData: { startTime: new Date(), messageCount: 0 },
    isListening: false,
    isSpeaking: false,
    recognition: null,
    moodChart: null,
    storedConversations: [],
    storedMoodLogs: []
};

// ============================================
// SPEECH MODULE (INTEGRATED)
// ============================================

const SpeechModule = {
    init() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            console.warn('⚠️ Speech recognition not supported in this browser');
            return false;
        }
        
        AppState.recognition = new SpeechRecognition();
        AppState.recognition.continuous = false;
        AppState.recognition.interimResults = false;
        AppState.recognition.lang = 'en-US';
        
        AppState.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            const input = document.getElementById('userInput');
            if (input) {
                input.value = transcript;
                input.style.height = 'auto';
                input.style.height = Math.min(input.scrollHeight, 120) + 'px';
            }
            this.stopListening();
        };
        
        AppState.recognition.onerror = (event) => {
            console.error('❌ Speech recognition error:', event.error);
            this.stopListening();
        };
        
        AppState.recognition.onend = () => {
            this.stopListening();
        };
        
        console.log('✅ Speech recognition initialized');
        return true;
    },
    
    startListening() {
        if (!AppState.recognition) {
            alert('Speech recognition not supported in your browser');
            return;
        }
        
        try {
            AppState.recognition.start();
            AppState.isListening = true;
            
            const micBtn = document.querySelector('[onclick="toggleVoiceInput()"]');
            if (micBtn) {
                micBtn.style.background = '#ef4444';
                micBtn.style.color = 'white';
            }
            
            console.log('🎤 Listening...');
        } catch (error) {
            console.error('❌ Error starting recognition:', error);
        }
    },
    
    stopListening() {
        if (!AppState.recognition) return;
        
        try {
            AppState.recognition.stop();
        } catch (error) {
            console.error('❌ Error stopping recognition:', error);
        }
        
        AppState.isListening = false;
        
        const micBtn = document.querySelector('[onclick="toggleVoiceInput()"]');
        if (micBtn) {
            micBtn.style.background = '';
            micBtn.style.color = '';
        }
        
        console.log('🎤 Stopped listening');
    },
    
    toggleSpeech() {
        if (!window.speechSynthesis) {
            alert('Text-to-speech not supported in your browser');
            return;
        }
        
        AppState.isSpeaking = !AppState.isSpeaking;
        
        const speakBtn = document.querySelector('[onclick="toggleSpeech()"]');
        if (speakBtn) {
            if (AppState.isSpeaking) {
                speakBtn.style.background = '#10b981';
                speakBtn.style.color = 'white';
                console.log('🔊 Speech enabled');
            } else {
                speakBtn.style.background = '';
                speakBtn.style.color = '';
                window.speechSynthesis.cancel();
                console.log('🔇 Speech disabled');
            }
        }
    }
};

// ============================================
// VOICE CONTROL FUNCTIONS
// ============================================

function toggleVoiceInput() {
    if (AppState.isListening) {
        SpeechModule.stopListening();
    } else {
        SpeechModule.startListening();
    }
}

function toggleSpeech() {
    SpeechModule.toggleSpeech();
}

// ============================================
// ENHANCED EMOTION ANALYZER
// ============================================

const EmotionAnalyzer = {
    async detectEmotion(text) {
        console.log('🧠 Analyzing emotion...');
        
        try {
            showLoading();
            
            if (API_CONFIG.huggingface.token === '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') {
                hideLoading();
                return this.keywordFallback(text);
            }
            
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
                        options: { wait_for_model: true, use_cache: false }
                    })
                }
            );
            
            if (!response.ok) {
                hideLoading();
                return this.keywordFallback(text);
            }
            
            const result = await response.json();
            
            if (result.error) {
                hideLoading();
                return this.keywordFallback(text);
            }
            
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
        
        emotions.sort((a, b) => b.score - a.score);
        
        const top = emotions.slice(0, 5).map(e => ({
            emotion: e.label.toLowerCase(),
            score: Math.round(e.score * 100)
        }));
        
        const primary = top[0];
        const secondary = top[1]?.score > 20 ? top[1] : null;
        
        const exclamations = (text.match(/!/g) || []).length;
        const caps = (text.match(/[A-Z]/g) || []).length / text.length;
        const intensity = exclamations >= 3 || caps > 0.5 ? 'high' : 
                         exclamations >= 1 || caps > 0.2 ? 'medium' : 'low';
        
        return {
            text,
            primary,
            secondary,
            allEmotions: top,
            intensity,
            hasQuestion: text.includes('?'),
            timestamp: new Date().toISOString()
        };
    },
    
    keywordFallback(text) {
        console.log('🔍 Using enhanced keyword fallback');
        
        const keywords = {
            joy: ['happy', 'joy', 'joyful', 'great', 'wonderful', 'amazing', 'fantastic', 'awesome', 'yay', 'hooray', 'excellent', 'perfect', 'brilliant'],
            excitement: ['excited', 'exciting', 'cant wait', "can't wait", 'pumped', 'hyped', 'thrilled', 'stoked', 'eager', 'psyched'],
            amusement: ['funny', 'hilarious', 'lol', 'haha', 'lmao', 'laugh', 'laughing', 'amusing', 'joke', 'humor'],
            pride: ['proud', 'accomplished', 'achieved', 'achievement', 'success', 'succeeded', 'nailed', 'crushed it', 'won'],
            relief: ['relief', 'relieved', 'finally', 'phew', 'thank god', 'glad', 'better now', 'over with'],
            gratitude: ['thank', 'thanks', 'grateful', 'appreciate', 'thankful', 'appreciate you', 'blessed', 'fortunate'],
            love: ['love', 'adore', 'cherish', 'treasure', 'devoted', 'affection', 'romance', 'romantic', 'crush'],
            caring: ['care about', 'worry about', 'concerned', 'hope youre', 'thinking of', 'miss you', 'support'],
            admiration: ['admire', 'respect', 'look up to', 'impressed', 'inspiring', 'amazing person', 'role model'],
            sadness: ['sad', 'unhappy', 'depressed', 'depression', 'down', 'blue', 'miserable', 'hurt', 'crying', 'cry', 'tears', 'heartbroken', 'devastated', 'lonely', 'alone', 'empty'],
            grief: ['loss', 'lost someone', 'death', 'died', 'passed away', 'miss them', 'mourning', 'grieving', 'funeral'],
            disappointment: ['disappointed', 'let down', 'expected more', 'fail', 'failed', 'didnt work', 'fell short', 'not good enough'],
            remorse: ['regret', 'sorry', 'shouldnt have', 'wish i hadnt', 'feel bad', 'guilty', 'my fault', 'screwed up'],
            anger: ['angry', 'mad', 'furious', 'pissed', 'hate', 'rage', 'outraged', 'livid', 'fuming', 'seething'],
            annoyance: ['annoyed', 'irritated', 'bothered', 'frustrated', 'aggravated', 'bugged', 'gets on my nerves'],
            disgust: ['disgusting', 'gross', 'sick', 'nasty', 'revolting', 'repulsive', 'cant stand', 'hate this'],
            disapproval: ['disagree', 'dont approve', 'not okay', 'wrong', 'shouldnt', 'against', 'oppose'],
            fear: ['scared', 'afraid', 'terrified', 'fear', 'fearful', 'frightened', 'nightmare', 'horror', 'panic'],
            nervousness: ['nervous', 'anxious', 'anxiety', 'stress', 'stressed', 'worried', 'worry', 'tense', 'uneasy', 'on edge'],
            embarrassment: ['embarrassed', 'ashamed', 'humiliated', 'awkward', 'mortified', 'cringe', 'uncomfortable', 'self-conscious'],
            confusion: ['confused', 'dont understand', "don't understand", 'unclear', 'lost', 'what', 'why', 'how', 'puzzled', 'baffled'],
            surprise: ['surprised', 'shocked', 'unexpected', 'wow', 'omg', 'cant believe', 'didnt expect', 'sudden', 'blown away'],
            curiosity: ['curious', 'wonder', 'wondering', 'interested', 'fascinated', 'intrigued', 'want to know'],
            optimism: ['hopeful', 'optimistic', 'looking forward', 'positive', 'things will work out', 'better tomorrow', 'bright side'],
            desire: ['want', 'wish', 'hope', 'desire', 'crave', 'need', 'dream of', 'long for'],
            realization: ['realized', 'figured out', 'makes sense', 'understand now', 'aha', 'got it', 'clicked', 'dawned on me'],
            neutral: ['ok', 'okay', 'fine', 'alright', 'hi', 'hello', 'hey', 'sup', 'whats up']
        };
        
        const lowerText = text.toLowerCase();
        const scores = {};
        
        for (const [emotion, words] of Object.entries(keywords)) {
            scores[emotion] = 0;
            for (const word of words) {
                if (lowerText.includes(word)) {
                    scores[emotion] += 2;
                }
            }
        }
        
        const sorted = Object.entries(scores)
            .filter(([, score]) => score > 0)
            .sort(([, a], [, b]) => b - a);
        
        const primary = sorted[0] || ['neutral', 1];
        const secondary = sorted[1] || null;
        
        return {
            text,
            primary: { emotion: primary[0], score: 88 },
            secondary: secondary ? { emotion: secondary[0], score: 55 } : null,
            allEmotions: sorted.slice(0, 3).map(([e, s]) => ({ emotion: e, score: Math.min(s * 15, 95) })),
            intensity: 'medium',
            hasQuestion: text.includes('?'),
            timestamp: new Date().toISOString()
        };
    }
};

// ============================================
// ENHANCED RESPONSE GENERATOR
// ============================================

const ResponseGenerator = {
    async generateResponse(emotionAnalysis) {
        console.log('💬 Generating response...');
        
        AppState.conversationHistory.push({
            text: emotionAnalysis.text,
            emotion: emotionAnalysis.primary.emotion,
            timestamp: Date.now()
        });
        
        AppState.emotionHistory.push(emotionAnalysis.primary.emotion);
        
        if (AppState.conversationHistory.length > 5) {
            AppState.conversationHistory.shift();
            AppState.emotionHistory.shift();
        }
        
        if (API_CONFIG.gemini.apiKey && API_CONFIG.gemini.apiKey !== 'AIzaSyDfNS3pFDaUToURP37nk-yNaFILrmQ7w4s') {
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
        const pattern = this.detectPattern();
        
        const recentContext = AppState.conversationHistory.slice(-3)
            .map(m => `User: "${m.text}" (${m.emotion})`)
            .join('\n');
        
        const prompt = `You're a caring friend chatting with someone who needs support.

RECENT CONVERSATION:
${recentContext || 'Just started'}

CURRENT: "${analysis.text}"

EMOTION: ${primary.emotion} (${primary.score}%), Intensity: ${intensity}
PATTERN: ${pattern}

GUIDANCE: ${this.getEmotionGuidance(primary.emotion)}

RULES:
1. Talk like a REAL FRIEND - casual, warm
2. 2-3 sentences MAX
3. Use contractions
4. NO therapist language
5. ${hasQuestion ? 'Answer their question first!' : 'Start with empathy'}

Response:`;
        
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
        
        if (!response.ok) throw new Error('Gemini failed');
        
        const data = await response.json();
        return data.candidates[0].content.parts[0].text.trim();
    },
    
    getEmotionGuidance(emotion) {
        const guidance = {
            joy: "Share their happiness! Be genuinely excited and ask what made them so happy.",
            excitement: "Match their energy! Be enthusiastic and ask what they're pumped about.",
            amusement: "Keep it light and fun. Laugh with them. Ask what's making them smile.",
            pride: "Celebrate with them! They earned it. Be genuinely proud and ask details.",
            relief: "Acknowledge their relief. The weight is off. Ask what happened.",
            gratitude: "Accept thanks warmly. Be humble. Ask how they're feeling now.",
            love: "Be warm and supportive. This is beautiful. Ask about who/what they love.",
            caring: "They care deeply. That's touching. Acknowledge their compassion.",
            admiration: "They appreciate someone. Support that. Ask what inspires them.",
            sadness: "Be gentle and caring. Don't rush to fix it. Just be there and listen.",
            grief: "Deep empathy. This is heavy. Acknowledge their pain. Be fully present.",
            disappointment: "Validate it completely. It's okay to feel disappointed. Ask what happened.",
            remorse: "Show compassion. They're being hard on themselves. Offer perspective.",
            anger: "Acknowledge frustration. Don't minimize. Validate their anger. Ask what triggered it.",
            annoyance: "Relate to it. Things are annoying sometimes. Let them vent.",
            disgust: "Validate their reaction. Some things are just wrong. Understand their perspective.",
            disapproval: "They disagree with something. Understand why. Respect their stance.",
            fear: "Reassure gently. Their fears are real and valid. Ask what's scaring them.",
            nervousness: "Be calming. Nerves are normal. Offer grounding support and encouragement.",
            embarrassment: "Be understanding and lighthearted. We've all been there. It'll pass.",
            confusion: "Help them think through it. Ask clarifying questions. Work through it together.",
            surprise: "Acknowledge the unexpectedness. Share their reaction. Ask what happened.",
            curiosity: "Engage their curiosity! Explore the topic together. Ask follow-ups.",
            optimism: "Support their positive outlook. Be encouraging. Ask what they're hopeful about.",
            desire: "They want something. Explore what and why. Support their dreams.",
            realization: "Support their insight. They figured something out! Ask them to share more.",
            neutral: "Be naturally conversational. Ask what's on their mind."
        };
        
        return guidance[emotion] || guidance.neutral;
    },
    
    detectPattern() {
        if (AppState.emotionHistory.length < 3) return 'New conversation';
        
        const recent = AppState.emotionHistory.slice(-3);
        const negative = ['sadness', 'anger', 'fear', 'grief', 'nervousness', 'disappointment', 'remorse', 'disgust', 'embarrassment'];
        const positive = ['joy', 'excitement', 'love', 'gratitude', 'pride', 'relief', 'amusement'];
        
        if (recent.every(e => negative.includes(e))) return 'Struggling consistently - extra support needed';
        if (negative.includes(recent[0]) && positive.includes(recent[2])) return 'Mood improving - celebrate the shift';
        if (positive.includes(recent[0]) && negative.includes(recent[2])) return 'Mood declined - be extra gentle';
        
        return 'Normal flow - match their energy';
    },
    
    generateTemplate(analysis) {
        const { primary } = analysis;
        const emotion = primary.emotion;
        
        const templates = {
            joy: [
                "That's awesome! I'm really happy for you! 😊 What made today so great?",
                "Love this energy! Your happiness is contagious. Tell me more!",
                "This is amazing! I'm so glad things are going well. What happened?",
                "Yes! This makes me smile too. What's making you so happy?"
            ],
            excitement: [
                "Okay now I'm excited too! 🎉 When's this happening?",
                "This sounds incredible! I'm pumped for you. What are you most excited about?",
                "Yes!! I love this energy. Tell me everything!",
                "I can feel your excitement from here! What's the big thing?"
            ],
            amusement: [
                "Haha love it! 😄 What else is making you laugh today?",
                "That's hilarious! I needed that laugh. Tell me more!",
                "You're in a good mood! What's got you smiling?",
                "I love when you're laughing! What's so funny?"
            ],
            pride: [
                "You should be SO proud! 🌟 That's incredible. How does it feel?",
                "Yes! You earned this. I'm proud of you too! Tell me about it.",
                "That's amazing! You absolutely crushed it. What did you accomplish?",
                "This is huge! You deserve to celebrate. What's the achievement?"
            ],
            relief: [
                "That must feel SO good! 😌 What finally happened?",
                "Finally! I'm glad that weight is off you. Tell me more.",
                "Phew! That's a major relief. What changed?",
                "I bet you can breathe again! What got resolved?"
            ],
            gratitude: [
                "Of course! That's what friends are for. 💛 How are you feeling now?",
                "Anytime! I'm just glad I could help. What else is going on?",
                "You don't have to thank me, but I appreciate it. 😊 How can I help more?",
                "I'm always here for you! What else do you need?"
            ],
            love: [
                "That's really sweet. ❤️ Love is beautiful! Tell me more about them!",
                "Aww, I love hearing this! Who's the lucky person?",
                "This is so wholesome. Love looks good on you! What do you love about them?",
                "That's amazing! 💕 How long have you felt this way?"
            ],
            caring: [
                "That's really touching. 💙 You have such a kind heart. Who are you thinking about?",
                "The fact that you care so much says a lot about you. Tell me more.",
                "Your compassion is beautiful. What's going on with them?",
                "It's clear you really care. How can you support them?"
            ],
            admiration: [
                "That's awesome! 🌟 Who are you admiring?",
                "I love when someone inspires us like that. What do you admire about them?",
                "That's really cool! What makes them so special to you?",
                "Admiration is powerful. Tell me what impresses you about them!"
            ],
            sadness: [
                "I'm really sorry you're going through this. 💙 I'm here for you. Want to talk about it?",
                "That sounds really hard. I'm here to listen, no judgment. What's been going on?",
                "I can tell you're hurting. You're not alone - I'm here with you. What happened?",
                "My heart goes out to you. 💔 Take your time. What's making you sad?"
            ],
            grief: [
                "I'm so, so sorry. 💔 That's incredibly painful. I'm here with you.",
                "My heart breaks for you. There are no words. Take all the time you need.",
                "I can't imagine how hard this is. Just know I'm here. Want to talk about them?",
                "This is devastating. I'm here for you, whenever you need. What can I do?"
            ],
            disappointment: [
                "That's really disappointing. I'm sorry that happened. 😔 What went down?",
                "I can totally see why you'd feel let down. That's tough. Tell me about it.",
                "It's completely okay to feel disappointed. Your feelings are valid. What happened?",
                "That sucks. I'm sorry it didn't go the way you hoped. Want to talk through it?"
            ],
            remorse: [
                "Hey, you're being really hard on yourself. 💜 We all make mistakes. What happened?",
                "It's okay to feel bad, but don't beat yourself up. What's going on?",
                "We all mess up sometimes. That's how we learn and grow. Tell me about it.",
                "Your regret shows you care. That matters. What are you feeling guilty about?"
            ],
            anger: [
                "That sounds really frustrating. 😤 I'd be upset too. What happened?",
                "Okay yeah, I can totally see why you're angry. Want to vent about it?",
                "That's not okay at all. You have every right to be mad. Tell me what happened.",
                "I hear you. That would make me furious too. What triggered this?"
            ],
            annoyance: [
                "That's annoying for sure. 😒 I get it. What's bothering you?",
                "I'd be irritated too. Some things are just frustrating. What's going on?",
                "Ugh, I feel that. Those little things add up. What happened?",
                "Yeah, that would bug me too. Want to vent about it?"
            ],
            disgust: [
                "That's awful. I don't blame you for feeling that way. 🤢 What happened?",
                "Yeah, that's really gross/wrong. I totally understand your reaction.",
                "I completely get why you're disgusted. That's not okay. Tell me more.",
                "That's revolting. Your reaction is totally valid. What did you see/hear?"
            ],
            disapproval: [
                "I hear you. You don't agree with that. Why not? Tell me your thoughts.",
                "That doesn't sit right with you, does it? What's your take on it?",
                "I get why you feel that way. What specifically bothers you about it?",
                "You have a different perspective. I respect that. What do you think instead?"
            ],
            fear: [
                "That sounds really scary. 💙 Your feelings are completely valid. What's worrying you?",
                "I hear you. Fear is so real. Want to talk through it? I'm here.",
                "That's a lot to carry. You're not alone in this. What's scaring you?",
                "Your fear makes total sense. Let's work through this together. What's going on?"
            ],
            nervousness: [
                "Nerves are the worst, but totally normal. 😰 What's coming up that's making you anxious?",
                "I get it. Being nervous just means you care. What's on your mind?",
                "You've got this! Take a deep breath. What's making you nervous?",
                "Anxiety is tough. I'm here with you. What's triggering this feeling?"
            ],
            embarrassment: [
                "We've all been there, trust me! 😅 It'll pass. What happened?",
                "That's awkward for sure, but you'll be okay. We've all had those moments!",
                "I get it. Embarrassing moments are the worst. But it's not as bad as you think!",
                "Everyone has embarrassing stories. This will be funny later! What went down?"
            ],
            confusion: [
                "That's confusing for sure. 🤔 Let's figure it out together. What's unclear?",
                "I can see why you're lost. Want to talk through it? What's the main issue?",
                "Confusion is frustrating. Let's break it down. What part doesn't make sense?",
                "Okay, let's work through this together. What are you trying to understand?"
            ],
            surprise: [
                "Whoa! 😲 That's unexpected! What happened?",
                "Didn't see that coming! Tell me more about this surprise!",
                "That's wild! 🤯 How do you feel about it?",
                "Wow! I'm surprised too! What's the story?"
            ],
            curiosity: [
                "Ooh interesting question! 🤔 Let's explore that together.",
                "I'm curious about that too now! What made you think about this?",
                "That's a great question! What specifically are you curious about?",
                "I love your curiosity! Let's dig into this. What do you want to know?"
            ],
            optimism: [
                "I love that positive outlook! ✨ What's making you feel so hopeful?",
                "That's the spirit! Your optimism is inspiring. What are you looking forward to?",
                "Yes! I'm here for this energy. What's got you feeling so positive?",
                "That's beautiful! Hope is powerful. What are you optimistic about?"
            ],
            desire: [
                "That's a great goal! What is it that you want?",
                "Dreams are important! Tell me what you're hoping for.",
                "I hear that desire. What would make you happy?",
                "What's calling to you? Tell me about this wish!"
            ],
            realization: [
                "Oh! 💡 That makes sense now, right? What did you realize?",
                "Aha moment! I love when things click. Tell me what you figured out!",
                "Yes! Those realizations are powerful. What did you discover?",
                "That's huge! What was your big realization?"
            ],
            neutral: [
                "Hey! 👋 What's on your mind today?",
                "I'm here. How are you doing? Want to chat about something?",
                "How's everything going? What's happening in your world?",
                "Hi! What brings you here today?"
            ]
        };
        
        const options = templates[emotion] || templates.neutral;
        return options[Math.floor(Math.random() * options.length)];
    }
};

// ============================================
// DATABASE (IN-MEMORY)
// ============================================

const DatabaseModule = {
    saveMessage(msg) {
        AppState.storedConversations.push(msg);
    },
    
    getConversations() {
        return AppState.storedConversations;
    },
    
    saveMoodLog(emotion, confidence) {
        AppState.storedMoodLogs.push({
            emotion,
            confidence,
            timestamp: new Date().toISOString()
        });
    },
    
    getMoodLogs() {
        return AppState.storedMoodLogs;
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
        a.download = `mindfulchat-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
};

// ============================================
// OUTPUT MODULE
// ============================================

const OutputModule = {
    displayMessage(msg) {
        const container = document.getElementById('chatMessages');
        if (!container) return;
        
        const msgEl = document.createElement('div');
        msgEl.className = `message ${msg.type}`;
        
        const content = document.createElement('div');
        content.className = 'message-content';
        
        if (msg.type === 'bot' && !msg.isQuote) {
            const header = document.createElement('div');
            header.className = 'bot-header';
            header.innerHTML = `
                <span>🤖</span>
                <span>AI Response</span>
                ${msg.emotion ? `<span>•</span><span class="capitalize">${msg.emotion}</span>` : ''}
            `;
            content.appendChild(header);
        }
        
        const text = document.createElement('div');
        text.className = 'message-text';
        text.textContent = msg.text;
        content.appendChild(text);
        
        const footer = document.createElement('div');
        footer.className = 'message-footer';
        footer.innerHTML = `
            <span>${msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            ${msg.confidence ? `<span>${msg.confidence}% confident</span>` : ''}
        `;
        content.appendChild(footer);
        
        msgEl.appendChild(content);
        container.appendChild(msgEl);
        container.scrollTop = container.scrollHeight;
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
            grateful: '🙏',
            loving: '❤️',
            confused: '🤔',
            embarrassed: '😳',
            surprised: '😲',
            neutral: '😐'
        };
        
        if (icon) icon.textContent = icons[emotion] || '😐';
        if (name) name.textContent = emotion.charAt(0).toUpperCase() + emotion.slice(1);
        if (fill) fill.style.width = `${confidence}%`;
        if (value) value.textContent = `${confidence}%`;
    }
};

// ============================================
// ANALYTICS
// ============================================

const AnalyticsModule = {
    generateMoodChart() {
        const ctx = document.getElementById('moodChart');
        if (!ctx || typeof Chart === 'undefined') return;
        
        if (AppState.moodChart) AppState.moodChart.destroy();
        
        const data = AppState.moodData;
        
        AppState.moodChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Happy', 'Sad', 'Anxious', 'Angry', 'Grateful', 'Loving', 'Confused', 'Embarrassed', 'Surprised', 'Neutral'],
                datasets: [{
                    data: [data.happy, data.sad, data.anxious, data.angry, data.grateful, data.loving, data.confused, data.embarrassed, data.surprised, data.neutral],
                    backgroundColor: ['#fbbf24', '#3b82f6', '#8b5cf6', '#ef4444', '#10b981', '#ec4899', '#f59e0b', '#f97316', '#06b6d4', '#6b7280']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    },
    
    updateMoodHistory() {
        const el = document.getElementById('moodHistory');
        if (!el) return;
        
        const logs = DatabaseModule.getMoodLogs().slice(-10).reverse();
        el.innerHTML = '';
        
        if (logs.length === 0) {
            el.innerHTML = '<p style="text-align: center; color: #6b7280;">No history yet</p>';
            return;
        }
        
        const icons = { 
            happy: '😊', sad: '😢', anxious: '😰', angry: '😠', 
            grateful: '🙏', loving: '❤️', confused: '🤔', 
            embarrassed: '😳', surprised: '😲', neutral: '😐' 
        };
        
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
            el.appendChild(entry);
        });
    },
    
    updateSessionSummary() {
        const el = document.getElementById('sessionSummary');
        if (!el) return;
        
        const duration = Math.floor((new Date() - AppState.sessionData.startTime) / 60000);
        const dominantMood = Object.keys(AppState.moodData).reduce((a, b) => 
            AppState.moodData[a] > AppState.moodData[b] ? a : b
        );
        
        el.innerHTML = `
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
// CORE CHAT FUNCTIONS
// ============================================

async function sendMessage() {
    const input = document.getElementById('userInput');
    if (!input) return;
    
    const text = input.value.trim();
    if (!text) return;
    
    input.value = '';
    input.style.height = 'auto';
    
    const userMsg = {
        type: 'user',
        text,
        timestamp: new Date()
    };
    
    AppState.messages.push(userMsg);
    OutputModule.displayMessage(userMsg);
    DatabaseModule.saveMessage(userMsg);
    
    AppState.sessionData.messageCount++;
    const countEl = document.getElementById('messageCount');
    if (countEl) countEl.textContent = AppState.sessionData.messageCount;
    
    try {
        const emotionAnalysis = await EmotionAnalyzer.detectEmotion(text);
        
        console.log('📊 Emotion Analysis:');
        console.log(`  Primary: ${emotionAnalysis.primary.emotion} (${emotionAnalysis.primary.score}%)`);
        if (emotionAnalysis.secondary) {
            console.log(`  Secondary: ${emotionAnalysis.secondary.emotion} (${emotionAnalysis.secondary.score}%)`);
        }
        
        const displayEmotion = GOEMOTIONS.getDisplayEmotion(emotionAnalysis.primary.emotion);
        
        AppState.currentEmotion = displayEmotion;
        AppState.emotionConfidence = emotionAnalysis.primary.score;
        AppState.moodData[displayEmotion]++;
        
        OutputModule.updateEmotionCard(displayEmotion, emotionAnalysis.primary.score);
        DatabaseModule.saveMoodLog(displayEmotion, emotionAnalysis.primary.score);
        
        const responseText = await ResponseGenerator.generateResponse(emotionAnalysis);
        
        console.log('💬 Bot Response:', responseText);
        
        addBotMessage(responseText, displayEmotion, emotionAnalysis.primary.score);
        
        if (AppState.isSpeaking && window.speechSynthesis) {
            const utterance = new SpeechSynthesisUtterance(responseText);
            utterance.rate = 0.9;
            window.speechSynthesis.speak(utterance);
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
        addBotMessage("Hey, I hit a snag there. Can you try again?", 'neutral', 0);
    }
}

function addBotMessage(text, emotion, confidence) {
    const botMsg = {
        type: 'bot',
        text,
        timestamp: new Date(),
        emotion,
        confidence
    };
    
    AppState.messages.push(botMsg);
    OutputModule.displayMessage(botMsg);
    DatabaseModule.saveMessage(botMsg);
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

function exportData() {
    DatabaseModule.exportData();
}

function getQuote() {
    const quotes = [
        "You are stronger than you think. 💪",
        "Healing is not linear. Be patient with yourself. 🌱",
        "Your feelings are valid. All of them. 💙",
        "Small steps forward are still progress. 🚶",
        "You deserve compassion, especially from yourself. 💛",
        "It's okay to not be okay sometimes. 🤗",
        "You're doing better than you think. ✨",
        "This too shall pass. 🌈",
        "Every storm runs out of rain. ⛈️",
        "You've survived 100% of your worst days. 🌟",
        "Be kind to yourself. You're doing your best. 💕",
        "Progress, not perfection. 🎯"
    ];
    
    const quote = quotes[Math.floor(Math.random() * quotes.length)];
    const quoteMsg = {
        type: 'bot',
        text: `💭 "${quote}"`,
        timestamp: new Date(),
        isQuote: true
    };
    
    AppState.messages.push(quoteMsg);
    OutputModule.displayMessage(quoteMsg);
}

function suggestMusic() {
    const music = {
        happy: "Uplifting Vibes Playlist 🎵 - Feel-good music to keep the energy high!",
        sad: "Healing & Comfort 🎵 - Gentle music to help you process emotions",
        anxious: "Calm & Peaceful 🎵 - Soothing sounds to ease anxiety",
        angry: "Release & Let Go 🎵 - Cathartic music to channel anger",
        grateful: "Gratitude Flow 🎵 - Music to amplify thankfulness",
        loving: "Love & Connection 🎵 - Romantic and heartwarming tunes",
        confused: "Focus & Clarity 🎵 - Music to help you think clearly",
        embarrassed: "Confidence Boost 🎵 - Music to lift your spirits",
        surprised: "Energy Boost 🎵 - Exciting and unexpected tracks",
        neutral: "Ambient Focus 🎵 - Background music for any mood"
    };
    
    const suggestion = music[AppState.currentEmotion] || music.neutral;
    addBotMessage(`🎵 Music Suggestion: ${suggestion}`, AppState.currentEmotion, 0);
}

function suggestVideo() {
    const videos = {
        happy: "5-Min Gratitude Meditation 🎬 - Amplify your joy!",
        sad: "Self-Compassion Meditation 🎬 - Be gentle with yourself",
        anxious: "4-7-8 Breathing Exercise 🎬 - Calm your nervous system",
        angry: "Progressive Muscle Relaxation 🎬 - Release tension",
        grateful: "Appreciation Meditation 🎬 - Deepen your gratitude",
        loving: "Loving-Kindness Meditation 🎬 - Spread the love",
        confused: "Clarity Meditation 🎬 - Clear your mind",
        embarrassed: "Confidence Building 🎬 - Remember your worth",
        surprised: "Grounding Exercise 🎬 - Center yourself",
        neutral: "10-Min Mindfulness 🎬 - General wellbeing"
    };
    
    const suggestion = videos[AppState.currentEmotion] || videos.neutral;
    addBotMessage(`🎬 Video Suggestion: ${suggestion}`, AppState.currentEmotion, 0);
}

function exportConversationSummary() {
    const summary = {
        sessionDuration: Math.floor((new Date() - AppState.sessionData.startTime) / 60000),
        messageCount: AppState.sessionData.messageCount,
        emotionsDetected: AppState.emotionHistory,
        dominantEmotion: Object.keys(AppState.moodData).reduce((a, b) => 
            AppState.moodData[a] > AppState.moodData[b] ? a : b
        ),
        emotionBreakdown: AppState.moodData,
        conversationHighlights: AppState.messages.filter(m => m.confidence && m.confidence > 80)
    };
    
    console.log('📊 Session Summary:', summary);
    
    const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-summary-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    console.log('✅ Summary exported!');
}

// ============================================
// INITIALIZATION
// ============================================

function initializeApp() {
    console.log('✅ Initializing Enhanced GoEmotions System...');
    
    if (API_CONFIG.huggingface.token === 'YOUR_HUGGINGFACE_TOKEN') {
        console.warn('⚠️ Hugging Face token not set - using enhanced keyword fallback');
    } else {
        console.log('✅ Hugging Face configured');
    }
    
    if (API_CONFIG.gemini.apiKey === 'YOUR_GEMINI_API_KEY') {
        console.warn('⚠️ Gemini API not set - using enhanced template responses');
    } else {
        console.log('✅ Gemini configured');
    }
    
    if (typeof Chart === 'undefined') {
        console.warn('⚠️ Chart.js not loaded - analytics unavailable');
    } else {
        console.log('✅ Chart.js loaded');
    }
    
    // Initialize speech module
    SpeechModule.init();
    
    const startEl = document.getElementById('sessionStart');
    if (startEl) startEl.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const countEl = document.getElementById('messageCount');
    if (countEl) countEl.textContent = '0';
    
    addBotMessage(
        "Hey! 👋 I'm your AI emotional support companion. I can detect 28 different emotions and respond like a real friend. How are you feeling today?",
        'neutral',
        0
    );
    
    const input = document.getElementById('userInput');
    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 120) + 'px';
        });
    }
    
    console.log('✅ System ready!');
    console.log('');
    console.log('='.repeat(70));
    console.log('ENHANCED GOEMOTIONS SYSTEM');
    console.log('='.repeat(70));
    console.log('Emotions: 28 GoEmotions labels');
    console.log('Display Categories: 10 (happy, sad, anxious, angry, grateful, loving,');
    console.log('                     confused, embarrassed, surprised, neutral)');
    console.log('Response Templates: 100+ unique responses');
    console.log('Keywords Tracked: 200+ emotional indicators');
    console.log('Voice Features: Speech Recognition + Text-to-Speech');
    console.log('='.repeat(70));
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

console.log('📝 Enhanced MindfulChat with Voice Support loaded successfully!');
