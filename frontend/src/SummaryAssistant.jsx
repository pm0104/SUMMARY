import React, { useState, useEffect, useRef, useCallback } from 'react';
import './SummaryAssistant.css';

const WAKE_WORD_REGEX = /hey\s+sum|hi\s+sum|ok(ay)?\s+sum|a\s+sum|hey\s+sam/i;
const STOP_WORD_REGEX = /^\s*(stop|stop\s+speaking|end|cancel|quiet|shut\s+up|stop\s+it|end\s+chat|bye|goodbye|thank\s+you|that'?s?\s+all|done)\s*$/i;

function SummaryAssistant({ onQuerySubmit, latestReply, loading }) {
    const [status, setStatus] = useState('off'); // 'off' | 'standby' | 'listening' | 'processing' | 'speaking'
    const [queryTranscript, setQueryTranscript] = useState('');
    const [spokenText, setSpokenText] = useState('');
    const [errorMsg, setErrorMsg] = useState(null);
    const [isExpanded, setIsExpanded] = useState(false);

    const recognitionRef = useRef(null);
    const silenceTimerRef = useRef(null);
    const idleTimeoutRef = useRef(null);
    const lastReplyRef = useRef('');
    const statusRef = useRef(status);
    statusRef.current = status;

    // Helper: Play Web Audio API Chimes (No external sound files required!)
    const playChime = useCallback((type) => {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            if (type === 'wake') {
                // Two-tone rising chime (D5 -> A5)
                osc.type = 'sine';
                osc.frequency.setValueAtTime(587.33, ctx.currentTime);
                osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
                gain.gain.setValueAtTime(0.3, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.35);
            } else if (type === 'submit') {
                // Single crisp confirmation chime (C6)
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(1046.50, ctx.currentTime);
                gain.gain.setValueAtTime(0.2, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.25);
            }
        } catch (e) {
            console.warn("Audio chime playback failed:", e);
        }
    }, []);

    // Stop speech recognition cleanly
    const stopRecognition = useCallback(() => {
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
        }
        if (idleTimeoutRef.current) {
            clearTimeout(idleTimeoutRef.current);
            idleTimeoutRef.current = null;
        }
        if (recognitionRef.current) {
            try {
                recognitionRef.current.onend = null;
                recognitionRef.current.onerror = null;
                recognitionRef.current.onresult = null;
                recognitionRef.current.stop();
            } catch (err) {
                // Ignore stop errors if already stopped
            }
            recognitionRef.current = null;
        }
    }, []);

    // Submit recorded query to AI
    const submitQuery = useCallback((textToSubmit) => {
        const finalQuery = (textToSubmit || queryTranscript).trim();
        if (!finalQuery) {
            setStatus('standby');
            return;
        }

        playChime('submit');
        setStatus('processing');
        stopRecognition();
        setIsExpanded(true);
        
        // Pass query to ChatWindow handler
        if (onQuerySubmit) {
            onQuerySubmit(finalQuery);
        }
    }, [queryTranscript, playChime, stopRecognition, onQuerySubmit]);

    // Start recognition loop (in either standby wake-word mode, active listening mode, or speaking stop-word mode)
    const startRecognition = useCallback((targetMode = 'standby') => {
        stopRecognition();

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setErrorMsg("Web Speech API is not supported in this browser. Please use Google Chrome or Microsoft Edge.");
            setStatus('off');
            return;
        }

        try {
            const rec = new SpeechRecognition();
            rec.continuous = true;
            rec.interimResults = true;
            rec.lang = 'en-US';

            // If entering continuous listening mode, start 15s idle timer
            if (targetMode === 'listening') {
                if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
                idleTimeoutRef.current = setTimeout(() => {
                    if (statusRef.current === 'listening') {
                        console.log("Idle timeout: No speech for 15s in continuous mode. Returning to standby.");
                        setStatus('standby');
                        startRecognition('standby');
                    }
                }, 15000);
            }

            rec.onstart = () => {
                setErrorMsg(null);
            };

            rec.onerror = (event) => {
                console.warn("Speech recognition error:", event.error);
                if (event.error === 'not-allowed') {
                    setErrorMsg("Microphone permission denied. Please allow mic access in your browser address bar.");
                    setStatus('off');
                    stopRecognition();
                } else if (event.error === 'network' || event.error === 'no-speech') {
                    // Automatically restart if network blink or silence
                    if (statusRef.current === 'standby' || statusRef.current === 'listening' || statusRef.current === 'speaking') {
                        setTimeout(() => startRecognition(statusRef.current), 500);
                    }
                }
            };

            rec.onend = () => {
                // If we are still in standby, listening, or speaking, automatically restart continuous loop
                if (statusRef.current === 'standby' || statusRef.current === 'listening' || statusRef.current === 'speaking') {
                    setTimeout(() => startRecognition(statusRef.current), 300);
                }
            };

            rec.onresult = (event) => {
                let currentTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    currentTranscript += event.results[i][0].transcript;
                }
                currentTranscript = currentTranscript.trim();

                if (statusRef.current === 'standby') {
                    // Check for wake word
                    if (WAKE_WORD_REGEX.test(currentTranscript)) {
                        playChime('wake');
                        setQueryTranscript('');
                        setStatus('listening');
                        setIsExpanded(true);
                        // Clear wake word from recognition buffer by restarting in active mode
                        startRecognition('listening');
                    }
                } else if (statusRef.current === 'listening') {
                    // Check if user says "stop", "bye", or "thank you" while in conversation loop
                    if (STOP_WORD_REGEX.test(currentTranscript)) {
                        playChime('submit');
                        setQueryTranscript('');
                        setStatus('standby');
                        startRecognition('standby');
                        return;
                    }

                    // Reset 15s idle timer since user is speaking
                    if (idleTimeoutRef.current) {
                        clearTimeout(idleTimeoutRef.current);
                        idleTimeoutRef.current = setTimeout(() => {
                            if (statusRef.current === 'listening') {
                                setStatus('standby');
                                startRecognition('standby');
                            }
                        }, 15000);
                    }

                    setQueryTranscript(currentTranscript);

                    // Reset silence auto-submit timer (submit after 2.5s of speech pause)
                    if (silenceTimerRef.current) {
                        clearTimeout(silenceTimerRef.current);
                    }
                    if (currentTranscript.length > 2) {
                        silenceTimerRef.current = setTimeout(() => {
                            submitQuery(currentTranscript);
                        }, 2500);
                    }
                } else if (statusRef.current === 'speaking') {
                    // While girl voice is speaking, listen for "Stop", "End", "Cancel", "Quiet", "Bye"
                    if (/stop|end|cancel|quiet|bye/i.test(currentTranscript)) {
                        console.log("Voice stop command heard! Stopping speech.");
                        if (window.speechSynthesis) {
                            window.speechSynthesis.cancel();
                        }
                        setStatus('standby');
                        startRecognition('standby');
                    }
                }
            };

            recognitionRef.current = rec;
            rec.start();
        } catch (err) {
            console.error("Failed to start speech recognition:", err);
            setErrorMsg("Could not access microphone.");
            setStatus('off');
        }
    }, [stopRecognition, playChime, submitQuery]);

    // Handle Power ON / OFF toggle
    const toggleAssistant = () => {
        if (status === 'off') {
            setStatus('standby');
            setIsExpanded(false);
            startRecognition('standby');
        } else {
            setStatus('off');
            stopRecognition();
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
        }
    };

    // Manual Push-to-Talk (bypass wake word)
    const handleManualListen = () => {
        if (status === 'listening') {
            submitQuery();
        } else {
            playChime('wake');
            setQueryTranscript('');
            setStatus('listening');
            setIsExpanded(true);
            startRecognition('listening');
        }
    };

    // Clean text for natural TTS speaking
    const stripMarkdown = (md) => {
        if (!md || typeof md !== 'string') return '';
        return md
            .replace(/```[\s\S]*?```/g, "Code block omitted for speech.")
            .replace(/`.*?`/g, "")
            .replace(/[*#_~>|-]/g, "")
            .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
            .replace(/https?:\/\/\S+/g, "link")
            .replace(/\s+/g, ' ')
            .trim();
    };

    // Speak AI Response using Text-to-Speech with Female / Girl Voice
    const speakResponse = useCallback((text) => {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel(); // Stop previous speech

        const cleanText = stripMarkdown(text);
        if (!cleanText) {
            setStatus('standby');
            startRecognition('standby');
            return;
        }

        setSpokenText(cleanText);
        setIsExpanded(true);

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 1.02;
        utterance.pitch = 1.15; // Slightly higher pitch for a friendly, natural girl voice tone

        // Explicitly prioritize known female / girl voice names across Chrome, Edge, Safari, Windows, macOS, Android, iOS
        const voices = window.speechSynthesis.getVoices();
        const femaleKeywords = ['samantha', 'victoria', 'karen', 'zira', 'susan', 'hazel', 'moira', 'tessa', 'fiona', 'veena', 'female', 'woman', 'girl', 'google us english', 'google uk english female', 'microsoft zira', 'microsoft jenny', 'microsoft aria', 'microsoft natasha', 'kyoko', 'yuri'];
        
        let preferredVoice = voices.find(v => {
            const nameLow = v.name.toLowerCase();
            return v.lang.startsWith('en') && femaleKeywords.some(kw => nameLow.includes(kw));
        });
        if (!preferredVoice) {
            preferredVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
        }
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }

        utterance.onend = () => {
            if (statusRef.current !== 'off') {
                // Continuous Conversation Mode: Automatically return to 'listening' so user doesn't have to repeat wake word!
                playChime('wake');
                setQueryTranscript('');
                setStatus('listening');
                startRecognition('listening');
            }
        };

        utterance.onerror = (e) => {
            console.warn("TTS speaking error:", e);
            if (statusRef.current !== 'off') {
                setStatus('standby');
                startRecognition('standby');
            }
        };

        window.speechSynthesis.speak(utterance);
        // Chrome macOS workaround for paused synthesis bug
        if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
        }

        // Simultaneously start recognition in 'speaking' mode so user can say "Stop" out loud to interrupt!
        startRecognition('speaking');
    }, [startRecognition, playChime]);

    // Stop speaking response manually
    const stopSpeaking = () => {
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        setStatus('standby');
        startRecognition('standby');
    };

    // Monitor AI reply arriving from backend when in processing state
    useEffect(() => {
        if (status === 'processing' && !loading && latestReply && latestReply !== lastReplyRef.current) {
            lastReplyRef.current = latestReply;
            setStatus('speaking');
            speakResponse(latestReply);
        }
    }, [status, loading, latestReply, speakResponse]);

    // Ensure speech synthesis voices are loaded
    useEffect(() => {
        if (window.speechSynthesis && window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = () => {
                window.speechSynthesis.getVoices();
            };
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopRecognition();
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
        };
    }, [stopRecognition]);

    return (
        <div className={`summary-assistant-container ${status} ${isExpanded ? 'expanded' : ''}`}>
            {errorMsg && (
                <div className="assistant-error-tooltip">
                    <i className="fa-solid fa-triangle-exclamation"></i> {errorMsg}
                </div>
            )}

            {/* Expanded Transcript / Status Bubble */}
            {isExpanded && status !== 'off' && (
                <div className="assistant-bubble">
                    <div className="bubble-header">
                        <span className="bubble-title">
                            <i className="fa-solid fa-wand-magic-sparkles"></i> Summary Assistant
                        </span>
                        <button className="bubble-close-btn" onClick={() => setIsExpanded(false)} title="Minimize">
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    </div>

                    <div className="bubble-content">
                        {status === 'standby' && (
                            <p className="standby-text">
                                <span className="pulse-dot violet"></span> Listening for wake word <strong>"Hey Summary"</strong>...
                            </p>
                        )}
                        {status === 'listening' && (
                            <div className="listening-display">
                                <p className="live-transcript">
                                    {queryTranscript || <em>Speak your query now... (Say "Stop" to cancel)</em>}
                                </p>
                                <div className="audio-wave-bars">
                                    <span></span><span></span><span></span><span></span><span></span>
                                </div>
                                <div className="listening-actions-row">
                                    <button className="cancel-listen-btn" onClick={stopSpeaking} title="Cancel">
                                        <i className="fa-solid fa-xmark"></i> Cancel
                                    </button>
                                    <button className="submit-now-btn" onClick={() => submitQuery()} title="Send Query">
                                        <i className="fa-solid fa-paper-plane"></i> Send
                                    </button>
                                </div>
                            </div>
                        )}
                        {status === 'processing' && (
                            <p className="processing-text">
                                <i className="fa-solid fa-circle-notch fa-spin"></i> Analyzing query and generating summary...
                            </p>
                        )}
                        {status === 'speaking' && (
                            <div className="speaking-display">
                                <div className="speaking-header-row">
                                    <p className="speaking-text">
                                        <i className="fa-solid fa-volume-high wave-icon"></i> <strong>Girl Voice Reading:</strong>
                                    </p>
                                    <button className="stop-speech-btn" onClick={stopSpeaking} title="Or say 'Stop' out loud to end">
                                        <i className="fa-solid fa-volume-xmark"></i> Stop (Say "Stop")
                                    </button>
                                </div>
                                <div className="spoken-subtitles-box">
                                    {spokenText}
                                </div>
                                <div className="audio-wave-bars green">
                                    <span></span><span></span><span></span><span></span><span></span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Main Floating Orb Widget */}
            <div className="assistant-orb-bar">
                <button 
                    className={`assistant-power-btn ${status !== 'off' ? 'active' : ''}`} 
                    onClick={toggleAssistant}
                    title={status !== 'off' ? "Turn Assistant OFF" : "Turn Assistant ON (Say 'Hey Summary')"}
                >
                    <i className="fa-solid fa-robot"></i>
                </button>

                {status !== 'off' && (
                    <div className="assistant-status-pill" onClick={() => setIsExpanded(!isExpanded)}>
                        {status === 'standby' && (
                            <span className="status-label standby">
                                <span className="pulse-dot violet"></span> Hey Summary
                            </span>
                        )}
                        {status === 'listening' && (
                            <span className="status-label listening">
                                <span className="pulse-dot cyan"></span> Listening...
                            </span>
                        )}
                        {status === 'processing' && (
                            <span className="status-label processing">
                                <i className="fa-solid fa-spinner fa-spin"></i> Thinking...
                            </span>
                        )}
                        {status === 'speaking' && (
                            <span className="status-label speaking">
                                <span className="pulse-dot green"></span> Speaking... (Say Stop)
                            </span>
                        )}
                    </div>
                )}

                {status !== 'off' && status !== 'processing' && status !== 'speaking' && (
                    <button 
                        className={`manual-talk-btn ${status === 'listening' ? 'recording' : ''}`} 
                        onClick={handleManualListen}
                        title={status === 'listening' ? "Submit Query" : "Tap to Speak without Wake Word"}
                    >
                        <i className={`fa-solid ${status === 'listening' ? 'fa-check' : 'fa-microphone'}`}></i>
                    </button>
                )}
            </div>
        </div>
    );
}

export default SummaryAssistant;
