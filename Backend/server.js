import express from "express";
import cors from "cors";
import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import mongoose from "mongoose";
import chatRoutes from "./routes/chat.js";
import authRoutes from "./routes/auth.js";
const PORT = process.env.PORT || 8080;  

// testing the API response from gemmini using fetch

const app = express();
app.use(express.json());
app.use(cors());
app.use("/api/auth", authRoutes);
app.use("/api", chatRoutes);
app.listen(PORT , () => {
  console.log(`Server is running on port ${PORT}`);
  connectDB();
});

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI); 
       
        console.log("Connected to MongoDB");
      }
      catch (err) {
        console.error("Error connecting to MongoDB:", err);
      }
    }








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


