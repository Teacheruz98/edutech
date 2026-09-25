/**
 * EduTech AI Helper Utilities
 * Extracted from server.js for modular architecture
 */
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const AiLog = require('../models/AiLog');
const SystemSetting = require('../models/SystemSetting');

// ── Sliding Window Rate Limiter ───────────────────────────────────────────────
const userAiRateLimits = new Map();
const checkAiRateLimit = (userId) => {
    const now = Date.now();
    const windowMs = 15 * 60 * 1000;
    const maxRequests = 40;
    if (!userAiRateLimits.has(userId)) userAiRateLimits.set(userId, []);
    const timestamps = userAiRateLimits.get(userId).filter(ts => now - ts < windowMs);
    if (timestamps.length >= maxRequests) return false;
    timestamps.push(now);
    userAiRateLimits.set(userId, timestamps);
    return true;
};

// ── Local Knowledge Engine ─────────────────────────────────────────────────────
const getSmartLocalResponse = (prompt, lang = 'uz') => {
    const origPrompt = (prompt || '').trim();
    const p = origPrompt.toLowerCase();

    if (p.includes('cambridge') || p.includes('igcse') || p.includes('as level') || p.includes('a level') || p.includes('a-level') || p.includes('as-level') || p.includes('syllabus') || p.includes('9618') || p.includes('0478') || p.includes('9709') || p.includes('0580') || p.includes('9702') || p.includes('0625') || p.includes('past paper') || p.includes('mark scheme') || p.includes('threshold')) {
        if (p.includes('9618') || (p.includes('computer science') && (p.includes('a level') || p.includes('as level') || p.includes('a-level')))) {
            return `**Cambridge International AS & A Level Computer Science (Syllabus Code: 9618)** 🎓💻\n\n### 📘 AS LEVEL:\n- Paper 1: Theory Fundamentals (1h30m)\n- Paper 2: Problem-Solving & Programming (2h)\n\n### 📙 A LEVEL:\n- Paper 3: Advanced Theory (1h30m)\n- Paper 4: Practical Programming (2h30m)\n\n💡 *EduTech platformasida 9618 silabusi va Paper 4 amaliy Python topshiriqlari mavjud!*`;
        }
        if (p.includes('0478') || p.includes('computer science') || p.includes('informatika')) {
            return `**Cambridge IGCSE Computer Science (0478/0984)** 🎓💻\n\n### PAPER 1: Computer Systems\n1. Data Representation: Binary, Hexadecimal, ASCII/Unicode\n2. Hardware & Software: CPU Architecture, RAM vs ROM\n3. Security & Internet: Malware, Encryption, SSL/TLS\n\n### PAPER 2: Algorithms, Programming & Logic\n1. Pseudocode, Flowcharts, Trace Tables\n2. Logic Gates: AND, OR, NOT, NAND, NOR, XOR`;
        }
        return `**Cambridge Assessment International Education (CAIE)** 🎓\n\nEduTech platformasi Cambridge IGCSE, AS & A Level standartlarini to'liq qo'llab-quvvatlaydi.\n\n💡 *Istalgan Cambridge fan kodi bo'yicha savolingizni yuboring!*`;
    }

    if (p.includes('binary') || p.includes('ikkilik') || p.includes('bit') || p.includes('byte')) {
        return `**Ikkilik Sanoq Tizimi (Binary)** 🔢\n\nBinary faqat 0 va 1 raqamlaridan iborat. 13 → Binary: 1101₂\n\n💡 Cambridge IGCSE CS Paper 1 asosiy mavzusi.`;
    }

    if (p.includes('python')) {
        return `**Python Dasturlash** 🐍\n\n\`\`\`python\ndef process(data):\n    return [x * 2 for x in data if isinstance(x, (int, float))]\nprint(process([1, 5, 10]))  # [2, 10, 20]\n\`\`\`\n\n💡 Aniq topshiriq yuboring — to'liq yechim taqdim etiladi!`;
    }

    if (p.includes('javascript') || p.includes('react') || p.includes('html') || p.includes('css')) {
        return `**JavaScript/React Yechimi** 💻\n\n\`\`\`javascript\nasync function fetchData(url) {\n    const res = await fetch(url);\n    return await res.json();\n}\n\`\`\`\n\n💡 React components, state va API bo'yicha yordam beraman!`;
    }

    const cleanConcept = origPrompt.replace(/nima\??/gi, '').replace(/what is/gi, '').trim() || origPrompt;
    return `**EduTech AI Ta'lim Yordamchisi** 🤖\n\nSizning savolingiz: **"${origPrompt}"**\n\n---\n\n📚 Mavzu bo'yicha tahlil va tushuntirish uchun aniq savol yoki kod namunasini yuboring.\n\n💡 *EduTech AI 24/7 yordam berishga tayyor!*`;
};

// ── Enterprise AI Gateway ──────────────────────────────────────────────────────
const askAIHelper = async (user, prompt, lang = 'uz') => {
    let actualUser = user, actualPrompt = prompt, actualLang = lang;
    if (typeof user === 'string') {
        actualUser = { id: 'system', username: 'Foydalanuvchi', role: 'student' };
        actualPrompt = user;
        actualLang = prompt || 'uz';
    }

    const userId = actualUser?.userId || actualUser?.id || actualUser?._id || 'anonymous';
    const username = actualUser?.username || 'Foydalanuvchi';
    const role = actualUser?.role || 'student';

    if (!checkAiRateLimit(userId)) {
        try { await AiLog.create({ userId, username, role, prompt: actualPrompt, question: actualPrompt, responseSnippet: 'Rate limit hit', responseLength: 0, tokensUsed: 0, language: actualLang, modelUsed: 'Rate Limiter', status: 'rate_limited' }); } catch (e) {}
        return `⚠️ **Sizning 15 minutlik AI so'rovlar limitingiz tugadi (Maksimum: 40 ta).**\n\nIltimos, biroz kuting.`;
    }

    const openRouterKeySetting = await SystemSetting.findOne({ key: 'custom_openrouter_api_key' }).catch(() => null);
    const geminiKeySetting = await SystemSetting.findOne({ key: 'custom_gemini_api_key' }).catch(() => null);
    const genericKeySetting = await SystemSetting.findOne({ key: 'custom_generic_api_key' }).catch(() => null);
    const genericEndpointSetting = await SystemSetting.findOne({ key: 'custom_generic_endpoint' }).catch(() => null);
    const genericModelSetting = await SystemSetting.findOne({ key: 'custom_generic_model' }).catch(() => null);

    const apiKey = openRouterKeySetting?.value || process.env.OPENROUTER_API_KEY || geminiKeySetting?.value || process.env.GEMINI_API_KEY;

    const text = actualPrompt.trim();
    const isEnglishText = /\b(what|how|is|are|the|can|you|do|does|did|will|would|could|should|weather|today|date|time|hello|hi|please|this|that|for|me|my|where|why|who|which|help|want|need|give|tell|show|explain|code|write|create|about|with|without|from|into)\b/i.test(text);
    const isRussianText = /[а-яА-ЯЁё]/i.test(text) || actualLang === 'ru';
    const isUzbekText = /[o'g'shch]|(nima|qanday|bor|yo'q|qachon|nechta|sana|haqida|bormi|kerak|bugun|men|siz|bilan|bo'lsin|yordam|rahmat|assalom|salom)/i.test(text);

    let targetLang = 'uz';
    if (isEnglishText && !isUzbekText && !isRussianText) targetLang = 'en';
    else if (isRussianText) targetLang = 'ru';
    else if (isUzbekText) targetLang = 'uz';
    else targetLang = actualLang || 'uz';

    let languageDirective = "MANDATORY LANGUAGE RULE: You MUST respond 100% in O'zbek tilida (Uzbek language).";
    if (targetLang === 'ru') languageDirective = "MANDATORY LANGUAGE RULE: You MUST respond 100% in Russian language.";
    else if (targetLang === 'en') languageDirective = "MANDATORY LANGUAGE RULE: You MUST respond 100% in English language.";

    let responseText = null;
    let selectedModelUsed = 'EduTech Master Local AI Engine';
    let status = 'fallback';

    // Custom Generic Gateway
    if (genericKeySetting?.value && genericEndpointSetting?.value) {
        try {
            const customUrl = genericEndpointSetting.value.trim();
            const customModelName = genericModelSetting?.value?.trim() || 'custom-model';
            const customRes = await axios.post(customUrl, { model: customModelName, max_tokens: 1800, messages: [{ role: 'system', content: `You are EduTech AI. ${languageDirective}` }, { role: 'user', content: actualPrompt }] }, { headers: { 'Authorization': `Bearer ${genericKeySetting.value.trim()}`, 'Content-Type': 'application/json' }, timeout: 10000 });
            if (customRes.data?.choices?.[0]?.message?.content) {
                responseText = customRes.data.choices[0].message.content;
                selectedModelUsed = `Custom Router (${customModelName})`;
                status = 'success';
            }
        } catch (err) { console.log('Custom gateway failed:', err.message); }
    }

    // OpenRouter Multi-Model Cascade
    if (!responseText && apiKey && apiKey.trim() && apiKey !== 'AI_KEY') {
        const models = [
            { name: 'openrouter/auto', label: 'OpenRouter Auto (Optimal)' },
            { name: 'openrouter/free', label: 'OpenRouter Free' },
            { name: 'meta-llama/llama-3.2-3b-instruct:free', label: 'Meta Llama 3.2 3B' },
            { name: 'qwen/qwen3.8-27b:free', label: 'Qwen 3.8 27B' },
            { name: 'google/gemma-4-31b-it:free', label: 'Google Gemma 4 31B' }
        ];
        for (const m of models) {
            try {
                const r = await axios.post(
                    'https://openrouter.ai/api/v1/chat/completions',
                    {
                        model: m.name,
                        max_tokens: 1800,
                        messages: [
                            { role: 'system', content: `You are EduTech AI, an intelligent, helpful academic tutor for the platform. ${languageDirective}` },
                            { role: 'user', content: actualPrompt }
                        ]
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${apiKey.trim()}`,
                            'Content-Type': 'application/json',
                            'HTTP-Referer': 'http://localhost:5173',
                            'X-Title': 'EduTech Platform'
                        },
                        timeout: 9000
                    }
                );
                if (r.data?.choices?.[0]?.message?.content) {
                    responseText = r.data.choices[0].message.content;
                    selectedModelUsed = m.label;
                    status = 'success';
                    break;
                }
            } catch (e) {
                console.log(`${m.label} failed:`, e.response?.data?.error?.message || e.message);
            }
        }

        // Direct Gemini fallback (only if key starts with AIza)
        const geminiKey = (geminiKeySetting?.value?.startsWith('AIza') ? geminiKeySetting.value : null)
            || (process.env.GEMINI_API_KEY?.startsWith('AIza') ? process.env.GEMINI_API_KEY : null);
        if (!responseText && geminiKey) {
            try {
                const genAI = new GoogleGenerativeAI(geminiKey.trim());
                const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
                const result = await model.generateContent(`${languageDirective}\n\n${actualPrompt}`);
                const resText = (await result.response).text();
                if (resText) { responseText = resText; selectedModelUsed = 'Google Gemini 1.5 Flash'; status = 'success'; }
            } catch (e) { console.log('Gemini direct failed:', e.message); }
        }
    }

    if (!responseText) {
        responseText = getSmartLocalResponse(actualPrompt, actualLang);
        selectedModelUsed = 'EduTech Local AI Engine';
        status = 'fallback';
    }

    const estimatedTokens = Math.ceil((actualPrompt.length + responseText.length) / 4);
    try {
        await AiLog.create({ userId, username, role, prompt: actualPrompt, question: actualPrompt, responseSnippet: responseText.substring(0, 350), responseLength: responseText.length, tokensUsed: estimatedTokens, language: targetLang, modelUsed: selectedModelUsed, status });
    } catch (e) { console.error('AI Log error:', e.message); }

    return responseText;
};

module.exports = { getSmartLocalResponse, askAIHelper };
