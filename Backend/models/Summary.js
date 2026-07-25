import mongoose from 'mongoose';

const summarySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    threadId: { type: String, required: true },
    type: { type: String, enum: ['url', 'youtube', 'file', 'chat', 'audio'], required: true },
    title: { type: String, required: true },
    source: { type: String, default: '' }, // URL, filename, etc.
    summary: { type: String, required: true },
    metadata: {
        wordCount: { type: Number, default: 0 },
        pageCount: { type: Number, default: 0 },
        duration: { type: String, default: '' },
        channel: { type: String, default: '' },
        thumbnailUrl: { type: String, default: '' },
        domain: { type: String, default: '' }
    }
}, { timestamps: true });

summarySchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('Summary', summarySchema);
