import "./ChatWindow.css";
import Chat from "./Chat.jsx";
import { MyContext } from "./MyContext.jsx";
import { useContext, useState, useEffect, useRef } from "react";
import {ScaleLoader} from "react-spinners";
import SummaryAssistant from "./SummaryAssistant.jsx";

function ChatWindow() {
    const {prompt, setPrompt, reply, setReply, currThreadId, setPrevChats, setNewChat, token, onLogout} = useContext(MyContext);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [detectedType, setDetectedType] = useState(null); // null, 'url', 'youtube', 'file', 'audio'
    const [selectedFile, setSelectedFile] = useState(null);
    const [isListening, setIsListening] = useState(false);
    const fileInputRef = useRef(null);
    const recognitionRef = useRef(null);

    const toggleListening = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Speech recognition is not supported in this browser. Please try Chrome or Edge.");
            return;
        }

        if (isListening && recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch (e) {
                console.error("Error stopping recognition:", e);
            }
            setIsListening(false);
            return;
        }

        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            setIsListening(true);
        };

        recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(result => result[0])
                .map(result => result.transcript)
                .join('');
            
            const cleanTranscript = transcript.trim();
            const submitCommandRegex = /\s*(?:enter|send|submit|go|send message|submit prompt|hit enter|press enter|\.?\s*enter|\.?\s*send|\.?\s*submit)$/i;
            
            if (submitCommandRegex.test(cleanTranscript)) {
                const finalPrompt = cleanTranscript.replace(submitCommandRegex, '').replace(/[.,;!?]+$/, '').trim();
                const existingText = prompt || '';
                const textToSend = finalPrompt.length > 0 ? finalPrompt : existingText;
                
                if (textToSend.length > 0 || selectedFile) {
                    setPrompt(textToSend);
                    setDetectedType(detectInputType(textToSend));
                    if (recognitionRef.current) {
                        try { recognitionRef.current.stop(); } catch(e){}
                    }
                    setIsListening(false);
                    setTimeout(() => getReply(textToSend), 100);
                    return;
                }
            }

            setPrompt(transcript);
            setDetectedType(detectInputType(transcript));
        };

        recognition.onerror = (event) => {
            console.error("Speech recognition error:", event.error);
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                alert("Microphone permission denied. Please enable microphone access in your browser settings.");
            }
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        try {
            recognition.start();
        } catch (e) {
            console.error("Failed to start speech recognition:", e);
            setIsListening(false);
        }
    };

    function detectInputType(text) {
        const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)/i;
        const urlRegex = /https?:\/\/[^\s]+/i;
        if (youtubeRegex.test(text)) return 'youtube';
        if (urlRegex.test(text)) return 'url';
        return null;
    }

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
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
        
        if (!allowedTypes.includes(file.type)) {
            alert('Please upload a PDF, DOCX, TXT, MD, or Audio file (MP3/WAV/M4A/WEBM).');
            return;
        }
        
        if (file.size > 20 * 1024 * 1024) {
            alert('File size must be under 20MB.');
            return;
        }
        
        setSelectedFile(file);
        setDetectedType(file.type.startsWith('audio/') ? 'audio' : 'file');
    };

    const uploadFile = async () => {
        if (!selectedFile) return;
        
        setLoading(true);
        setNewChat(false);
        
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('threadId', currThreadId);
        
        try {
            const response = await fetch('http://localhost:8080/api/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            
            const res = await response.json();
            
            if (response.status === 401) {
                onLogout();
                return;
            }
            
            if (!response.ok) {
                throw new Error(res.error || res.message || 'Failed to upload file');
            }
            
            // Set the prompt to show what was uploaded
            setPrompt(`📄 Uploaded: ${selectedFile.name}`);
            setReply(typeof res.message === 'string' ? res.message : String(res.message ?? ''));
        } catch (err) {
            console.error(err);
            alert(err.message || 'File upload failed');
        }
        
        setSelectedFile(null);
        setDetectedType(null);
        setLoading(false);
    };

    const getReply = async (customPrompt) => {
        if (selectedFile) {
            await uploadFile();
            return;
        }
        const messageToSend = typeof customPrompt === 'string' ? customPrompt : prompt;
        if (!messageToSend || !messageToSend.trim()) return;
        
        setLoading(true);
        setNewChat(false);
        const options = {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                message: messageToSend,
                threadId: currThreadId
            })
        };

        try {
            const response = await fetch("http://localhost:8080/api/chat", options);
            const res = await response.json();

            if (response.status === 401) {
                onLogout();
                return;
            }

            if (!response.ok) {
                throw new Error(res.error || res.message || "Failed to get reply");
            }

            setReply(typeof res.message === 'string' ? res.message : String(res.message ?? ''));
        } catch(err) {
            console.error(err);
        }
        setDetectedType(null);
        setLoading(false);
    }

    //Append new chat to prevChats
    useEffect(() => {
        if(prompt && reply) {
            setPrevChats(prevChats => (
                [...prevChats, {
                    role: "user",
                    content: prompt
                },{
                    role: "assistant",
                    content: reply
                }]
            ));
        }

        setPrompt("");
    }, [reply]);


    const handleProfileClick = () => {
        setIsOpen(!isOpen);
    }

    return (
        <div className="chatWindow">
            <div className="navbar">
                <span>SUMMARY <i className="fa-solid fa-chevron-down"></i></span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div className="userIconDiv" onClick={handleProfileClick}>
                        <span className="userIcon"><i className="fa-solid fa-user"></i></span>
                    </div>
                </div>
            </div>
            {
                isOpen && 
                <div className="dropDown">
                    <div className="dropDownItem"><i className="fa-solid fa-gear"></i> Settings</div>
                    <div className="dropDownItem"><i className="fa-solid fa-cloud-arrow-up"></i> Upgrade plan</div>
                    <div className="dropDownItem" onClick={onLogout}><i className="fa-solid fa-arrow-right-from-bracket"></i> Log out</div>
                </div>
            }
            <Chat></Chat>

            <ScaleLoader color="#fff" loading={loading}>
            </ScaleLoader>
            
            {selectedFile && (
                <div className="filePreview">
                    <div className="filePreviewInfo">
                        <i className={`fa-solid ${selectedFile.type.startsWith('audio/') ? 'fa-music' : 'fa-file-lines'}`}></i>
                        <span>{selectedFile.name}</span>
                        <span className="filePreviewSize">
                            {(selectedFile.size / 1024).toFixed(0)} KB
                        </span>
                    </div>
                    <button className="filePreviewRemove" onClick={() => {
                        setSelectedFile(null);
                        setDetectedType(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                    }}>
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>
            )}
            
            <div className="chatInput">
                <div className="inputBox">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept=".pdf,.docx,.txt,.md,.mp3,.wav,.m4a,.ogg,.webm"
                        style={{ display: 'none' }}
                    />
                    <div className="attachBtn" onClick={() => fileInputRef.current?.click()} title="Upload Document or Audio">
                        <i className="fa-solid fa-paperclip"></i>
                    </div>
                    <div className={`micBtn ${isListening ? 'listening' : ''}`} onClick={toggleListening} title="Voice Input (Speech-to-Text)">
                        <i className="fa-solid fa-microphone"></i>
                    </div>
                    <input placeholder={isListening ? "Listening... Speak now!" : "Paste a URL, attach audio/doc, or ask anything..."}
                        value={prompt}
                        onChange={(e) => {
                            setPrompt(e.target.value);
                            setDetectedType(detectInputType(e.target.value));
                        }}
                        onKeyDown={(e) => e.key === 'Enter'? getReply() : ''}
                    >
                           
                    </input>
                    {detectedType && (
                        <span className="inputDetectedBadge">
                            {detectedType === 'youtube' ? '🎥 YouTube' : detectedType === 'audio' ? '🎵 Audio' : detectedType === 'file' ? '📄 Document' : '🌐 Article'}
                        </span>
                    )}
                    <div id="submit" onClick={getReply}><i className="fa-solid fa-paper-plane"></i></div>
                </div>
                <p className="info">
                    SUMMARY can make mistakes. Check important info. See Cookie Preferences.
                </p>
            </div>

            {/* Wake-Word Voice Assistant Module */}
            <SummaryAssistant onQuerySubmit={getReply} latestReply={reply} loading={loading} />
        </div>
    )
}

export default ChatWindow;