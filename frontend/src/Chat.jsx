import "./Chat.css";
import React, { useContext, useState, useEffect } from "react";
import { MyContext } from "./MyContext.jsx";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

function Chat() {
    const {newChat, prevChats, reply} = useContext(MyContext);
    const [latestReply, setLatestReply] = useState(null);
    const [speakingIdx, setSpeakingIdx] = useState(null);

    const toggleSpeech = (text, idx) => {
        if (!('speechSynthesis' in window)) {
            alert("Text-to-speech is not supported in this browser.");
            return;
        }

        if (speakingIdx === idx) {
            window.speechSynthesis.cancel();
            setSpeakingIdx(null);
            return;
        }

        window.speechSynthesis.cancel();

        const cleanText = text
            .replace(/#/g, '')
            .replace(/\*\*/g, '')
            .replace(/\*/g, '')
            .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
            .replace(/```[\s\S]*?```/g, 'Code block omitted for reading.')
            .replace(/`([^`]+)`/g, '$1')
            .replace(/\n+/g, '. ');

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'en-US';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.lang.includes('en-US') && !v.name.includes('Google') && v.localService) 
                            || voices.find(v => v.lang.includes('en-US')) 
                            || voices.find(v => v.lang.includes('en'));
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }

        utterance.onend = () => setSpeakingIdx(null);
        utterance.onerror = (event) => {
            console.error("Speech synthesis error:", event);
            setSpeakingIdx(null);
        };

        window.speechSynthesis.speak(utterance);
        // Workaround for Chrome/macOS speech synthesis pause/freeze bug
        if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
        }
        setSpeakingIdx(idx);
    };

    useEffect(() => {
        if(reply === null) {
            setLatestReply(null); //prevchat load
            return;
        }

        if(!prevChats?.length) return;

        const replyStr = typeof reply === 'string' ? reply : String(reply ?? '');
        const content = replyStr.split(" "); //individual words

        let idx = 0;
        const interval = setInterval(() => {
            setLatestReply(content.slice(0, idx+1).join(" "));

            idx++;
            if(idx >= content.length) clearInterval(interval);
        }, 40);

        return () => clearInterval(interval);

    }, [prevChats, reply])

    return (
        <>
            {newChat && <h1>What would you like to know?</h1>}
            <div className="chats">
                {
                    prevChats?.slice(0, -1).map((chat, idx) => 
                        <div className={chat.role === "user"? "userDiv" : "gptDiv"} key={idx}>
                            {
                                chat.role === "user"? 
                                <p className="userMessage">{chat.content}</p> : 
                                <>
                                    <div className="gptHeader">
                                        <span className="gptLogo"><i className="fa-solid fa-wand-magic-sparkles"></i> SUMMARY</span>
                                        <button className={`ttsBtn ${speakingIdx === idx ? 'speaking' : ''}`} onClick={() => toggleSpeech(typeof chat.content === 'string' ? chat.content : String(chat.content ?? ''), idx)} title={speakingIdx === idx ? "Stop reading" : "Read out loud"}>
                                            <i className={`fa-solid ${speakingIdx === idx ? 'fa-circle-stop' : 'fa-volume-high'}`}></i>
                                            {speakingIdx === idx ? ' Stop' : ' Read'}
                                        </button>
                                    </div>
                                    <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{typeof chat.content === 'string' ? chat.content : String(chat.content ?? '')}</ReactMarkdown>
                                </>
                            }
                        </div>
                    )
                }

                {
                    prevChats.length > 0  && (
                        <>
                            {
                                latestReply === null ? (
                                    <div className="gptDiv" key={"non-typing"} >
                                        <div className="gptHeader">
                                            <span className="gptLogo"><i className="fa-solid fa-wand-magic-sparkles"></i> SUMMARY</span>
                                            <button className={`ttsBtn ${speakingIdx === 'last' ? 'speaking' : ''}`} onClick={() => toggleSpeech(typeof prevChats[prevChats.length-1].content === 'string' ? prevChats[prevChats.length-1].content : String(prevChats[prevChats.length-1].content ?? ''), 'last')} title={speakingIdx === 'last' ? "Stop reading" : "Read out loud"}>
                                                <i className={`fa-solid ${speakingIdx === 'last' ? 'fa-circle-stop' : 'fa-volume-high'}`}></i>
                                                {speakingIdx === 'last' ? ' Stop' : ' Read'}
                                            </button>
                                        </div>
                                        <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{typeof prevChats[prevChats.length-1].content === 'string' ? prevChats[prevChats.length-1].content : String(prevChats[prevChats.length-1].content ?? '')}</ReactMarkdown>
                                    </div>
                                ) : (
                                    <div className="gptDiv" key={"typing"} >
                                        <div className="gptHeader">
                                            <span className="gptLogo"><i className="fa-solid fa-wand-magic-sparkles"></i> SUMMARY</span>
                                        </div>
                                        <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{latestReply}</ReactMarkdown>
                                    </div>
                                )

                            }
                        </>
                    )
                }

            </div>
        </>
    )
}

export default Chat;