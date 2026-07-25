import express, { response } from "express";
import Thread from "../models/thread.js";
import GoogleGenAIResponse from "../utilities/genimi.js";
import auth from "../middleware/auth.js";
import { v4 as uuidv4 } from "uuid";
import { scrapeURL } from '../utilities/scraper.js';
import { getYouTubeData } from '../utilities/youtube.js';
import Summary from '../models/Summary.js';

function isYouTubeURL(text) {
    return /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)/i.test(text);
}

function extractURL(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const match = text.match(urlRegex);
  return match ? match[0] : null;
}

const router = express.Router();

//test 
router.post("/test", async(req, res) => {
try{
   // const thread = new Thread({
     //   threadId  :" xyz",
       // title : "test thread"
   // });
 
    res.send(response);
} catch (err) {
    console.log(err);
    res.status(500).json({
        error: "Failed to create thread"
    });
}
});
//Get all threads
router.get("/threads", auth , async (req, res) => {
    try {
const threads = await Thread.find({
    userId: req.user.id
}).sort({ updatedAt: -1 });//updatedAt descending order
        res.json(threads);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch threads" });
    }
});

router.get("/threads/:threadId", auth ,async (req, res) => {
    const { threadId } = req.params;
    try {
const thread = await Thread.findOne({
    threadId,
    userId: req.user.id
});
        if (!thread) {
            return res.status(404).json({ error: "Thread not found" });
        }
        res.json(thread);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch thread" });
    }
});

router.delete("/threads/:threadId",auth ,async (req, res) => {
    const { threadId } = req.params;
    try {
        const deletedThread = await Thread.findOneAndDelete ({ threadId, userId: req.user.id });
     if (!deletedThread) {
            return res.status(404).json({ error: "Thread not found" });
        }
        res.status(200).json({ message: "Thread deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to delete thread" });
    }
});    


router.post("/chat", auth ,async (req, res) => {
 
let { threadId, message } = req.body;

if(!message) {
    return res.status(400).json({ error: "message is required" });
}

let aiPrompt = message;
const url = extractURL(message);
let ytData = null;
let scrapedData = null;

if (url && isYouTubeURL(url)) {
    ytData = await getYouTubeData(url);
    if (ytData && ytData.transcript) {
        aiPrompt = `Summarize this YouTube video in a structured format using markdown:

## 🎥 ${ytData.title || 'Untitled Video'}
**Channel:** ${ytData.channel || 'Unknown'} | **Duration:** ${ytData.duration || 'Unknown'}

Please provide:
1. **📋 Overview** — what this video is about (1 paragraph)
2. **⏱️ Key Topics with Timestamps** — main topics discussed (estimate timestamps)
3. **📝 Summary** — a clear 2-3 paragraph summary
4. **💡 Main Takeaways** — the most important points to remember

---

**Video Transcript:**
${ytData.transcript.substring(0, 25000)}`;
    }
} else if (url) {
    scrapedData = await scrapeURL(url);
    if (scrapedData && scrapedData.content) {
        aiPrompt = `Summarize the following webpage in a structured format using markdown:

## 📰 ${scrapedData.title || 'Untitled'}
**Source:** ${url}

Please provide:
1. **📌 Key Points** — the most important facts/arguments (bullet list)
2. **📝 Summary** — a clear 2-3 paragraph summary
3. **💡 Key Takeaways** — actionable insights or conclusions
4. **⏱️ Reading Stats** — Original: ~${scrapedData.wordCount} words

---

**Article Content:**
${scrapedData.content}`;
    }
}

if(!threadId){
    threadId = uuidv4();
}
try{
let thread = await Thread.findOne({
    threadId,
    userId: req.user.id
}); ////////
   if (!thread) {
    thread = new Thread({
        userId: req.user.id,
        threadId,
        title: message.length > 40
            ? message.substring(0, 40) + "..."
            : message,
        messages: [
            {
                role: "user",
                content: message
            }
        ]
    });
    }else{
        thread.messages.push({role: "user", content: message});
    }
const response =  await GoogleGenAIResponse(aiPrompt);

// Save to summaries collection if it was a URL or YouTube summarization
if (url) {
    try {
        const summaryDoc = new Summary({
            userId: req.user.id,
            threadId,
            type: isYouTubeURL(url) ? 'youtube' : 'url',
            title: isYouTubeURL(url) 
                ? (ytData?.title || 'YouTube Video') 
                : (scrapedData?.title || url),
            source: url,
            summary: response,
            metadata: isYouTubeURL(url) 
                ? { duration: ytData?.duration || '', channel: ytData?.channel || '', thumbnailUrl: ytData?.thumbnailUrl || '' }
                : { wordCount: scrapedData?.wordCount || 0, domain: new URL(url).hostname }
        });
        await summaryDoc.save();
    } catch (e) {
        console.error('Failed to save summary:', e);
    }
}

    thread.messages.push({role: "assistant", content: response});
    thread.updatedAt = new Date();
    await thread.save();
    res.json({ message: response });
}
catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to process chat" });
   
}  
});

    export default router;