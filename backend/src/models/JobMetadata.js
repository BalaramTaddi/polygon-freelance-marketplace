import mongoose from 'mongoose';

const jobMetadataSchema = new mongoose.Schema({
    jobId: { type: Number, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String },
    tags: { type: String },
    ipfsHash: { type: String }, // Link to immutable contract details
    review: { type: String },
    rating: { type: Number },
    milestones: [{
        amount: String,
        description: String,
        isReleased: { type: Boolean, default: false }
    }]
}, { timestamps: true });

export const JobMetadata = mongoose.model('JobMetadata', jobMetadataSchema);
