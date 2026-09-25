/**
 * AI Routes — /api/ai/* and /api/admin/ai-*
 */
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const { askAIHelper, getSmartLocalResponse } = require('../utils/aiHelper');
const AiLog = require('../models/AiLog');
const SystemSetting = require('../models/SystemSetting');

// POST /api/ai/generate-announcement or /api/generate-announcement
router.post(['/generate-announcement', '/ai/generate-announcement'], authMiddleware, async (req, res) => {
    try {
        const { topic, language } = req.body;
        if (!topic) return res.status(400).json({ message: "Mavzu kiritilmadi" });
        const langText = language === 'ru' ? 'Rus tilida' : language === 'en' ? 'Ingliz tilida' : "O'zbek tilida";
        const prompt = `Ta'lim platformasi uchun e'lon tayyorlang. Mavzu: "${topic}". Til: ${langText}. E'lon qisqa, tushunarli va chiroyli bo'lsin.`;
        const text = await askAIHelper(req.user, prompt, language);
        res.json({ text });
    } catch (error) {
        res.json({ text: getSmartLocalResponse(req.body.topic, req.body.language) });
    }
});

// POST /api/ai/chat or /api/chat
router.post(['/chat', '/ai/chat'], authMiddleware, async (req, res) => {
    try {
        const { question, language } = req.body;
        if (!question) return res.status(400).json({ message: "Savol kiritilmadi" });
        const text = await askAIHelper(req.user, question, language);
        res.json({ text });
    } catch (error) {
        res.json({ text: getSmartLocalResponse(req.body.question, req.body.language) });
    }
});

// GET /api/admin/ai-stats or /api/admin/stats or /api/ai-stats
router.get(['/admin/stats', '/admin/ai-stats', '/ai-stats', '/stats'], authMiddleware, adminOnly, async (req, res) => {
    try {
        const totalLogs = await AiLog.countDocuments();
        const successCount = await AiLog.countDocuments({ status: 'success' });
        const fallbackCount = await AiLog.countDocuments({ status: 'fallback' });
        const tokenAgg = await AiLog.aggregate([{ $group: { _id: null, totalTokens: { $sum: "$tokensUsed" } } }]);
        const totalTokens = tokenAgg[0]?.totalTokens || 0;
        const modelStats = await AiLog.aggregate([{ $group: { _id: "$modelUsed", count: { $sum: 1 }, tokens: { $sum: "$tokensUsed" } } }, { $sort: { count: -1 } }]);
        const userStats = await AiLog.aggregate([{ $group: { _id: "$username", count: { $sum: 1 }, role: { $first: "$role" }, tokens: { $sum: "$tokensUsed" } } }, { $sort: { count: -1 } }, { $limit: 8 }]);

        const openRouterKeySetting = await SystemSetting.findOne({ key: 'custom_openrouter_api_key' });
        const geminiKeySetting = await SystemSetting.findOne({ key: 'custom_gemini_api_key' });
        const genericKeySetting = await SystemSetting.findOne({ key: 'custom_generic_api_key' });
        const genericEndpointSetting = await SystemSetting.findOne({ key: 'custom_generic_endpoint' });
        const genericModelSetting = await SystemSetting.findOne({ key: 'custom_generic_model' });
        const effectiveOpenRouterKey = openRouterKeySetting?.value || process.env.OPENROUTER_API_KEY;

        let keyBalanceInfo = { activeProvider: 'System Default (.env)', hasCustomKey: false, creditsLeft: `Usage: ${totalTokens.toLocaleString()} tokens`, limitDetails: 'High Availability (Local AI Fallback)' };

        if (genericKeySetting?.value) {
            keyBalanceInfo.hasCustomKey = true;
            const endpointUrl = genericEndpointSetting?.value || '';
            const modelName = genericModelSetting?.value || 'Custom Model';
            let providerTitle = `Custom Gateway (${modelName})`;
            if (endpointUrl.includes('groq.com')) providerTitle = `⚡ Groq AI (${modelName})`;
            else if (endpointUrl.includes('deepseek.com')) providerTitle = `🧠 DeepSeek AI (${modelName})`;
            else if (endpointUrl.includes('openai.com')) providerTitle = `🤖 OpenAI Direct (${modelName})`;
            keyBalanceInfo.activeProvider = providerTitle;
            keyBalanceInfo.creditsLeft = `⚡ ${totalTokens.toLocaleString()} tokens sarflandi`;
            keyBalanceInfo.limitDetails = endpointUrl.includes('groq.com') ? `Limit: 500,000 Token/Kun (Bepul)` : `Active Endpoint: ${endpointUrl.substring(0, 35)}...`;
        } else if (effectiveOpenRouterKey?.trim()) {
            keyBalanceInfo.hasCustomKey = !!openRouterKeySetting?.value;
            keyBalanceInfo.activeProvider = openRouterKeySetting?.value ? 'Custom OpenRouter Key' : 'OpenRouter Free (.env)';
            try {
                const keyRes = await axios.get('https://openrouter.ai/api/v1/auth/key', { headers: { 'Authorization': `Bearer ${effectiveOpenRouterKey.trim()}` }, timeout: 5000 });
                if (keyRes.data?.data) {
                    const usage = keyRes.data.data.usage || 0;
                    const limit = keyRes.data.data.limit === null ? 'Unlimited' : (keyRes.data.data.limit || 'Unlimited');
                    keyBalanceInfo.creditsLeft = `$${Number(usage).toFixed(4)} USD used`;
                    keyBalanceInfo.limitDetails = `Limit: ${limit} | ${keyRes.data.data.is_free_tier ? 'Free Tier' : 'Paid'}`;
                }
            } catch (e) { keyBalanceInfo.creditsLeft = `$0.0000 USD (${totalTokens.toLocaleString()} tokens)`; }
        } else if (geminiKeySetting?.value || process.env.GEMINI_API_KEY) {
            keyBalanceInfo.hasCustomKey = !!geminiKeySetting?.value;
            keyBalanceInfo.activeProvider = geminiKeySetting?.value ? 'Custom Google Gemini Key' : 'Google Gemini (.env)';
            keyBalanceInfo.creditsLeft = `Usage: ${totalTokens.toLocaleString()} tokens`;
            keyBalanceInfo.limitDetails = 'Quota: 15 RPM / 1,000,000 TPM Free Tier';
        }

        res.json({
            totalRequests: totalLogs, successCount, fallbackCount,
            successRate: totalLogs > 0 ? ((successCount / totalLogs) * 100).toFixed(1) : '100',
            totalTokens, modelStats, topUsers: userStats, keyBalanceInfo,
            customKeys: {
                openrouter: openRouterKeySetting?.value ? '••••••••' + openRouterKeySetting.value.slice(-6) : '',
                gemini: geminiKeySetting?.value ? '••••••••' + geminiKeySetting.value.slice(-6) : '',
                genericKey: genericKeySetting?.value ? '••••••••' + genericKeySetting.value.slice(-6) : '',
                genericEndpoint: genericEndpointSetting?.value || '',
                genericModel: genericModelSetting?.value || ''
            }
        });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/admin/ai-logs or /api/admin/logs or /api/ai-logs
router.get(['/admin/logs', '/admin/ai-logs', '/ai-logs', '/logs'], authMiddleware, adminOnly, async (req, res) => {
    try {
        const { search, limit = 50 } = req.query;
        let query = {};
        if (search) {
            query = { $or: [{ username: { $regex: search, $options: 'i' } }, { question: { $regex: search, $options: 'i' } }, { modelUsed: { $regex: search, $options: 'i' } }] };
        }
        const logs = await AiLog.find(query).sort({ timestamp: -1 }).limit(Number(limit));
        res.json(logs);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/admin/ai-logs/:id or /api/admin/logs/:id
router.delete(['/admin/logs/:id', '/admin/ai-logs/:id', '/ai-logs/:id', '/logs/:id'], authMiddleware, adminOnly, async (req, res) => {
    try {
        await AiLog.findByIdAndDelete(req.params.id);
        res.json({ message: "Log o'chirildi" });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/admin/ai-logs-clear or /api/admin/logs-clear
router.delete(['/admin/logs-clear', '/admin/ai-logs-clear', '/ai-logs-clear', '/logs-clear'], authMiddleware, adminOnly, async (req, res) => {
    try {
        await AiLog.deleteMany({});
        res.json({ message: "Barcha AI loglari tozalandi" });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/admin/ai-key or /api/admin/key
router.post(['/admin/key', '/admin/ai-key', '/ai-key', '/key'], authMiddleware, adminOnly, async (req, res) => {
    try {
        const { openRouterKey, geminiKey, genericKey, genericEndpoint, genericModel } = req.body;
        const upsertSetting = async (key, value) => {
            if (value !== undefined) {
                await SystemSetting.findOneAndUpdate(
                    { key },
                    { value: value.trim(), updatedBy: req.user.username, updatedAt: new Date() },
                    { upsert: true }
                );
            }
        };
        await upsertSetting('custom_openrouter_api_key', openRouterKey);
        await upsertSetting('custom_gemini_api_key', geminiKey);
        await upsertSetting('custom_generic_api_key', genericKey);
        await upsertSetting('custom_generic_endpoint', genericEndpoint);
        await upsertSetting('custom_generic_model', genericModel);
        res.json({ message: "AI API Kalitlari muvaffaqiyatli saqlandi! 🔑" });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/admin/ai-key/test or /api/admin/key/test
router.post(['/admin/key/test', '/admin/ai-key/test', '/ai-key/test', '/key/test'], authMiddleware, adminOnly, async (req, res) => {
    try {
        const { apiKey, provider, endpoint, model } = req.body;
        if (!apiKey?.trim()) return res.status(400).json({ message: "API key kiritilmadi" });
        const cleanKey = apiKey.trim();
        if (provider === 'openrouter') {
            const testRes = await axios.post('https://openrouter.ai/api/v1/chat/completions', { model: 'openrouter/auto', messages: [{ role: 'user', content: 'Say hello in Uzbek' }] }, { headers: { 'Authorization': `Bearer ${cleanKey}`, 'Content-Type': 'application/json' }, timeout: 8000 });
            const reply = testRes.data?.choices?.[0]?.message?.content || 'Ping success';
            return res.json({ success: true, message: `OpenRouter faol! Javob: "${reply.substring(0, 50)}..."` });
        } else if (['custom', 'groq', 'deepseek', 'openai'].includes(provider)) {
            const targetUrl = endpoint || 'https://api.groq.com/openai/v1/chat/completions';
            const targetModel = model || 'llama-3.3-70b-versatile';
            const testRes = await axios.post(targetUrl, { model: targetModel, messages: [{ role: 'user', content: 'Say hello in Uzbek' }] }, { headers: { 'Authorization': `Bearer ${cleanKey}`, 'Content-Type': 'application/json' }, timeout: 8000 });
            const reply = testRes.data?.choices?.[0]?.message?.content || 'Ping success';
            return res.json({ success: true, message: `Custom Gateway faol! Javob: "${reply.substring(0, 50)}..."` });
        } else if (provider === 'gemini') {
            const genAI = new GoogleGenerativeAI(cleanKey);
            const modelInstance = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await modelInstance.generateContent('Say hello in Uzbek');
            const resText = (await result.response).text();
            return res.json({ success: true, message: `Google Gemini ishlamoqda! Javob: "${resText.substring(0, 50)}..."` });
        }
        return res.json({ success: true, message: "API kaliti qabul qilindi!" });
    } catch (err) {
        res.status(400).json({ success: false, message: "API kaliti ulanishida xatolik: " + (err.response?.data?.error?.message || err.message) });
    }
});

module.exports = router;
