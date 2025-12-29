import mongoose from 'mongoose';

const profileSchema = new mongoose.Schema({
    address: { type: String, required: true, unique: true, lowercase: true },
    name: { type: String },
    bio: { type: String },
    skills: { type: String },
    totalEarned: { type: Number, default: 0 },
    completedJobs: { type: Number, default: 0 },
    nonce: { type: String },
}, { timestamps: true });

export const Profile = mongoose.model('Profile', profileSchema);
