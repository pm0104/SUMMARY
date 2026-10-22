import express from "express";
import cors from "cors";
import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import mongoose from "mongoose";
import chatRoutes from "./routes/chat.js";
import authRoutes from "./routes/auth.js";
import uploadRoutes from './routes/upload.js';
import summaryRoutes from './routes/summary.js';
const PORT = process.env.PORT || 8080;  

const app = express();
app.use(express.json());
app.use(cors());

let isConnected = false;
const connectDB = async () => {
  if (isConnected || mongoose.connection.readyState === 1) {
    return;
  }
  try {
    const db = await mongoose.connect(process.env.MONGODB_URI);
    isConnected = db.connections[0].readyState === 1;
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
  }
};

// Ensure database connection before handling requests (especially for serverless)
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

app.use("/api/auth", authRoutes);
app.use("/api", chatRoutes);
app.use("/api", uploadRoutes);
app.use("/api", summaryRoutes);

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    connectDB();
  });
}

export default app;








    /*  app.post("/test", async (req, res) => {
  console.log(req.body);
    console.log(req.body.message);
const  options = {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
       "x-goog-api-key": process.env.X_GOOGLE_API_KEY,
  },
  
  body: JSON.stringify({
    model: "gemini-3.1-flash-lite",
  contents: [
  {
    parts: [
      {
        text: req.body.message,
      },
    ],
  },
],
  }),
};
  try{
   const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent", options);  
   const data = await response.json();
console.log(data);
//const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
console.log(text);

res.send(text);
  }
  catch (err) {
    console.error(err);
  
  }
}); */


