import "./ChatWindow.css";
import Chat from "./Chat.jsx";
import { MyContext } from "./MyContext.jsx";
import { useContext, useState, useEffect, useRef } from "react";
import {ScaleLoader} from "react-spinners";

function ChatWindow() {
    const {prompt, setPrompt, reply, setReply, currThreadId, setPrevChats, setNewChat, token, onLogout} = useContext(MyContext);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [detectedType, setDetectedType] = useState(null); // null, 'url', 'youtube'
    const [selectedFile, setSelectedFile] = useState(null);
    const fileInputRef = useRef(null);

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
            'text/markdown'
        ];
        
        if (!allowedTypes.includes(file.type)) {
            alert('Please upload a PDF, DOCX, TXT, or MD file.');
            return;
        }
        
        if (file.size > 20 * 1024 * 1024) {
            alert('File size must be under 20MB.');
            return;
        }
        
        setSelectedFile(file);
        setDetectedType('file');
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
            setReply(res.message);
        } catch (err) {
            console.error(err);
            alert(err.message || 'File upload failed');
        }
        
        setSelectedFile(null);
        setDetectedType(null);
        setLoading(false);
    };

    const getReply = async () => {
        if (selectedFile) {
            await uploadFile();
            return;
        }
        setLoading(true);
        setNewChat(false);
        const options = {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                message: prompt,
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

            setReply(res.message);
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
                <div className="userIconDiv" onClick={handleProfileClick}>
                    <span className="userIcon"><i className="fa-solid fa-user"></i></span>
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
                        <i className="fa-solid fa-file-lines"></i>
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
                        accept=".pdf,.docx,.txt,.md"
                        style={{ display: 'none' }}
                    />
                    <div className="attachBtn" onClick={() => fileInputRef.current?.click()}>
                        <i className="fa-solid fa-paperclip"></i>
                    </div>
                    <input placeholder="Paste a URL, or ask anything..."
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
                            {detectedType === 'youtube' ? '🎥 YouTube' : detectedType === 'file' ? '📄 Document' : '🌐 Article'}
                        </span>
                    )}
                    <div id="submit" onClick={getReply}><i className="fa-solid fa-paper-plane"></i></div>
                </div>
                <p className="info">
                    SUMMARY can make mistakes. Check important info. See Cookie Preferences.
                </p>
            </div>
        </div>
    )
}

export default ChatWindow;