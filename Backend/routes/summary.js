import express from 'express';
import mongoose from 'mongoose';
import Summary from '../models/Summary.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Get all summaries for the user, with optional type filter and search
router.get('/summaries', auth, async (req, res) => {
    try {
        const { type, search, limit = 20, page = 1 } = req.query;
        const query = { userId: req.user.id };
        
        if (type && type !== 'all') {
            query.type = type;
        }
        
        if (search) {
            query.title = { $regex: search, $options: 'i' };
        }
        
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const summaries = await Summary.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .select('-summary'); // Don't send full summary in list view
        
        const total = await Summary.countDocuments(query);
        
        res.json({ summaries, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch summaries' });
    }
});

// Get single summary by ID
router.get('/summaries/:id', auth, async (req, res) => {
    try {
        const summary = await Summary.findOne({ _id: req.params.id, userId: req.user.id });
        if (!summary) return res.status(404).json({ error: 'Summary not found' });
        res.json(summary);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch summary' });
    }
});

// Delete a summary
router.delete('/summaries/:id', auth, async (req, res) => {
    try {
        const deleted = await Summary.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
        if (!deleted) return res.status(404).json({ error: 'Summary not found' });
        res.json({ message: 'Summary deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete summary' });
    }
});

// Get summary counts by type
router.get('/summaries-stats', auth, async (req, res) => {
    try {
        const stats = await Summary.aggregate([
            { $match: { userId: req.user._id || new mongoose.Types.ObjectId(req.user.id) } },
            { $group: { _id: '$type', count: { $sum: 1 } } }
        ]);
        
        const total = stats.reduce((acc, s) => acc + s.count, 0);
        const byType = {};
        stats.forEach(s => { byType[s._id] = s.count; });
        
        res.json({ total, byType });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

export default router;
