import express from 'express';
import multer from 'multer';
import auth from '../middleware/auth.js';
import { parseFile } from '../utilities/fileParser.js';
import GoogleGenAIResponse from '../utilities/genimi.js';
import Thread from '../models/thread.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/markdown'
    ];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PDF, DOCX, TXT, and MD are allowed.'), false);
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
