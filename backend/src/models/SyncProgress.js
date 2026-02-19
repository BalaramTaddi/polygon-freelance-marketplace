import mongoose from 'mongoose';

const syncProgressSchema = new mongoose.Schema({
    contractName: { type: String, required: true, unique: true },
    lastBlock: { type: Number, required: true, default: 0 }
}, { timestamps: true });

export const SyncProgress = mongoose.model('SyncProgress', syncProgressSchema);
