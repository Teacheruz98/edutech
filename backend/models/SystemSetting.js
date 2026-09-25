const mongoose = require('mongoose');

const SystemSettingSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    updatedBy: String,
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.SystemSetting || mongoose.model('SystemSetting', SystemSettingSchema);
