import express, { response } from "express";
import Thread from "../models/thread.js";
import GoogleGenAIResponse from "../utilities/genimi.js";
import auth from "../middleware/auth.js";
import { v4 as uuidv4 } from "uuid";


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
const response =  await GoogleGenAIResponse(message);
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