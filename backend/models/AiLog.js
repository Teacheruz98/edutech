const mongoose = require('mongoose');

const AiLogSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    username: String,
    role: String,
    prompt: String,
    question: String,
    responseSnippet: String,
    responseLength: Number,
    tokensUsed: { type: Number, default: 0 },
    language: { type: String, default: 'uz' },
    modelUsed: String,
    timestamp: { type: Date, default: Date.now },
    status: { type: String, enum: ['success', 'fallback', 'rate_limited'], default: 'success' }
});

module.exports = mongoose.model('AiLog', AiLogSchema);
