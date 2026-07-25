import express from 'express';
import multer from 'multer';
import auth from '../middleware/auth.js';
import { parseFile } from '../utilities/fileParser.js';
import GoogleGenAIResponse, { GoogleGenAIMultimodalResponse } from '../utilities/genimi.js';
import Thread from '../models/thread.js';
import { v4 as uuidv4 } from 'uuid';
import Summary from '../models/Summary.js';

const router = express.Router();

const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/markdown',
        'audio/mpeg',
        'audio/wav',
        'audio/mp4',
        'audio/x-m4a',
        'audio/ogg',
        'audio/webm'
    ];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PDF, DOCX, TXT, MD, and Audio (MP3/WAV/M4A/WEBM) are allowed.'), false);
    }
};

const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
    fileFilter
});

router.post('/upload', auth, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded or invalid file type.' });
        }
        
        const threadId = req.body.threadId || uuidv4();

        if (req.file.mimetype.startsWith('audio/')) {
            const base64Audio = req.file.buffer.toString('base64');
            const audioPrompt = `Listen to this audio recording (${req.file.originalname}) and provide a structured summary using markdown:

## 🎵 ${req.file.originalname}
**Audio Recording Summary & Transcription**

Please provide:
1. **📋 Overview** — a clear summary of what is discussed in this audio
2. **🗣️ Key Topics & Highlights** — the main subjects covered with details
3. **📝 Detailed Transcription Summary** — a thorough breakdown of the dialogue/narrative
4. **💡 Actionable Takeaways / Next Steps** — important conclusions or items to remember
5. **❓ Suggested Follow-up Questions** — 2-3 questions about the content`;

            const summary = await GoogleGenAIMultimodalResponse(audioPrompt, base64Audio, req.file.mimetype);

            let thread = await Thread.findOne({ threadId, userId: req.user._id || req.user.id });
            if (!thread) {
                thread = new Thread({ threadId, userId: req.user._id || req.user.id, title: `🎵 ${req.file.originalname}`, messages: [] });
            }

            thread.messages.push({ role: 'user', content: `🎵 Uploaded Audio: ${req.file.originalname}` });
            thread.messages.push({ role: 'assistant', content: summary });
            await thread.save();

            try {
                const summaryDoc = new Summary({
                    userId: req.user._id || req.user.id,
                    threadId,
                    type: 'audio',
                    title: req.file.originalname,
                    source: req.file.originalname,
                    summary,
                    metadata: { wordCount: summary.split(/\s+/).length }
                });
                await summaryDoc.save();
            } catch (e) {
                console.error('Failed to save audio summary:', e);
            }

            return res.status(200).json({
                message: summary,
                threadId,
                fileName: req.file.originalname,
                type: 'audio'
            });
        }

        const parsedFile = await parseFile(req.file.buffer, req.file.mimetype, req.file.originalname);
        
        if (parsedFile.error || !parsedFile.content) {
            return res.status(400).json({ error: parsedFile.error || 'Failed to parse file or file is empty.' });
        }
        
        let summary = '';
        const summarizePrompt = `Summarize the following document in a structured format using markdown:

## 📄 ${parsedFile.fileName}
**Pages:** ${parsedFile.pageCount} | **Words:** ~${parsedFile.wordCount}

Please provide:
1. **📋 Document Overview** — what this document is about (1 paragraph)
2. **📌 Key Sections** — main sections/chapters with brief descriptions
3. **📝 Summary** — a clear 2-3 paragraph summary
4. **💡 Key Findings/Takeaways** — the most important points
5. **❓ Suggested Follow-up Questions** — 2-3 questions the reader might want to explore

---

**Document Content:**
`;
        
        if (parsedFile.chunks.length === 1) {
            summary = await GoogleGenAIResponse(summarizePrompt + parsedFile.chunks[0]);
        } else {
            const partialSummaries = [];
            for (const chunk of parsedFile.chunks) {
                const chunkPrompt = `Summarize this section concisely:\n\n${chunk}`;
                const partialSummary = await GoogleGenAIResponse(chunkPrompt);
                partialSummaries.push(partialSummary);
            }
            
            const combinedContent = partialSummaries.join('\n\n---\n\n');
            summary = await GoogleGenAIResponse(summarizePrompt + combinedContent);
        }
        
        // Save to thread
        let thread = await Thread.findOne({ threadId, userId: req.user._id || req.user.id });
        if (!thread) {
            thread = new Thread({ threadId, userId: req.user._id || req.user.id, title: `📄 ${parsedFile.fileName}`, messages: [] });
        }
        
        thread.messages.push({
            role: 'user',
            content: `📄 Uploaded: ${parsedFile.fileName}`
        });
        
        thread.messages.push({
            role: 'assistant',
            content: summary
        });
        
        await thread.save();
        
        try {
            const summaryDoc = new Summary({
                userId: req.user._id || req.user.id,
                threadId,
                type: 'file',
                title: parsedFile.fileName,
                source: parsedFile.fileName,
                summary,
                metadata: {
                    wordCount: parsedFile.wordCount,
                    pageCount: parsedFile.pageCount
                }
            });
            await summaryDoc.save();
        } catch (e) {
            console.error('Failed to save summary:', e);
        }
        
        res.status(200).json({
            message: summary,
            threadId,
            fileName: parsedFile.fileName,
            wordCount: parsedFile.wordCount,
            pageCount: parsedFile.pageCount
        });
        
    } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});

export default router;
