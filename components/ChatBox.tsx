import React, { useState, useRef, useEffect, useCallback, useMemo, useContext } from 'react';
import { GoogleGenAI, Chat, LiveServerMessage, Blob, Modality } from "@google/genai";
import { ChatMessage } from '../types';
import { encode } from '../utils/audioUtils';
import MicrophoneIcon from './icons/MicrophoneIcon';
import SendIcon from './icons/SendIcon';
import StopIcon from './icons/StopIcon';
import MarkdownRenderer from './MarkdownRenderer';
import { ApiContext } from '../contexts/ApiContext';

interface ChatBoxProps {
    itemTitle: string;
    narration: string;
    onHistoryChange: (history: ChatMessage[]) => void;
}

const sanitizeInput = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

const ChatBox: React.FC<ChatBoxProps> = ({ itemTitle, narration, onHistoryChange }) => {
    const { apiKey } = useContext(ApiContext);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    
    const ai = useMemo(() => new GoogleGenAI({ apiKey }), [apiKey]);
    const chatRef = useRef<Chat | null>(null);
    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        onHistoryChange(messages);
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, onHistoryChange]);

    const stopRecording = useCallback(() => {
        sessionPromiseRef.current?.then(session => session.close());
        processorRef.current?.disconnect();
        sourceRef.current?.disconnect();
        streamRef.current?.getTracks().forEach(track => track.stop());
        inputAudioContextRef.current?.close().catch(console.error);
        
        sessionPromiseRef.current = null;
        processorRef.current = null;
        sourceRef.current = null;
        streamRef.current = null;
        inputAudioContextRef.current = null;
        setIsRecording(false);
    }, []);

    useEffect(() => {
        const truncatedNarration = narration.length > 8000 ? narration.substring(0, 8000) + '...' : narration;
        const systemInstruction = `You are a helpful and insightful assistant. The user has just finished reading an AI-generated narration for the item titled "${itemTitle}". The full narration is provided below for your context. Your task is to answer any follow-up questions the user has about this item, based on the narration and your general knowledge. Be conversational and engaging.

--- NARRATION CONTEXT ---
${truncatedNarration}
--- END CONTEXT ---`;

        chatRef.current = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: { systemInstruction },
        });

        return () => {
            // Cleanup audio resources if component unmounts
            if (isRecording) {
                stopRecording();
            }
        };
    }, [itemTitle, narration, ai, isRecording, stopRecording]);


    const handleSend = useCallback(async () => {
        const sanitizedText = sanitizeInput(input.trim());
        if (!sanitizedText || !chatRef.current) return;
        
        if (isRecording) {
            stopRecording();
        }

        const userMessage: ChatMessage = { role: 'user', text: sanitizedText };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const stream = await chatRef.current.sendMessageStream({ message: sanitizedText });
            let modelResponse = '';
            // Add a placeholder immediately
            setMessages(prev => [...prev, { role: 'model', text: '' }]);

            for await (const chunk of stream) {
                modelResponse += chunk.text;
                setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = { role: 'model', text: modelResponse + '...' };
                    return newMessages;
                });
            }
            // Final update to remove the ellipsis
            setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = { role: 'model', text: modelResponse };
                return newMessages;
            });
        } catch (error) {
            console.error("Chat error:", error);
            setMessages(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error. Please try again." }]);
        } finally {
            setIsLoading(false);
        }
    }, [input, isRecording, stopRecording]);

    const startRecording = useCallback(async () => {
        try {
            streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            
            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => setIsRecording(true),
                    onmessage: (message: LiveServerMessage) => {
                        if (message.serverContent?.inputTranscription) {
                            const { text } = message.serverContent.inputTranscription;
                            setInput(prev => prev + text);
                        }
                    },
                    onerror: (e: ErrorEvent) => { console.error('Live API Error:', e); stopRecording(); },
                    onclose: (e: CloseEvent) => { console.log('Live session closed'); }
                },
                config: { 
                    inputAudioTranscription: {},
                    responseModalities: [Modality.AUDIO],
                },
            });
            
            sourceRef.current = inputAudioContextRef.current.createMediaStreamSource(streamRef.current);
            processorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);

            processorRef.current.onaudioprocess = (audioProcessingEvent) => {
                const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                const l = inputData.length;
                const int16 = new Int16Array(l);
                for (let i = 0; i < l; i++) {
                    int16[i] = inputData[i] * 32768;
                }
                const pcmBlob: Blob = {
                    data: encode(new Uint8Array(int16.buffer)),
                    mimeType: 'audio/pcm;rate=16000',
                };
                sessionPromiseRef.current?.then((session) => {
                    session.sendRealtimeInput({ media: pcmBlob });
                });
            };

            sourceRef.current.connect(processorRef.current);
            processorRef.current.connect(inputAudioContextRef.current.destination);

        } catch (error) {
            console.error("Failed to start recording:", error);
            alert("Could not start recording. Please ensure you have given microphone permissions.");
        }
    }, [stopRecording, ai]);

    const toggleRecording = useCallback(() => {
        if (isRecording) {
            stopRecording();
        } else {
            setInput(''); // Clear input before starting new recording
            startRecording();
        }
    }, [isRecording, stopRecording, startRecording]);
    
    const placeholderText = isRecording 
      ? "Listening..."
      : messages.length === 0 
        ? "Ask a question about the story..." 
        : "Ask a follow-up question...";

    return (
        <div className="w-full max-w-4xl mx-auto mt-12">
            <h3 className="text-2xl font-bold text-indigo-300 border-b-2 border-indigo-500/30 pb-2 mb-4">Dive Deeper</h3>
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg shadow-xl overflow-hidden flex flex-col h-[60vh]">
                <div className="flex-grow p-4 overflow-y-auto space-y-4">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xl p-3 rounded-xl ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
                                <div className="prose prose-invert prose-sm max-w-none">
                                     <MarkdownRenderer text={msg.text} />
                                </div>
                            </div>
                        </div>
                    ))}
                    {isLoading && messages[messages.length - 1]?.role !== 'model' && (
                        <div className="flex justify-start">
                             <div className="max-w-xl p-3 rounded-xl bg-gray-700 text-gray-200">
                                <span className="animate-pulse">...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                <div className="p-3 border-t border-gray-700 bg-gray-900/50">
                    <div className={`flex items-center bg-gray-800 rounded-lg transition-all ${isRecording ? 'ring-2 ring-red-500' : 'focus-within:ring-2 focus-within:ring-indigo-500'}`}>
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
                            placeholder={placeholderText}
                            className="flex-grow bg-transparent text-white placeholder-gray-400 p-3 focus:outline-none"
                            disabled={isLoading || isRecording}
                            maxLength={1000}
                        />
                        <button onClick={toggleRecording} disabled={isLoading} className="p-3 text-gray-400 hover:text-white disabled:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-full" aria-label={isRecording ? 'Stop recording' : 'Start recording'}>
                            {isRecording ? <StopIcon className="w-5 h-5 text-red-500 animate-pulse" /> : <MicrophoneIcon className="w-5 h-5" />}
                        </button>
                        <button onClick={handleSend} disabled={!input.trim() || isLoading} className="p-3 text-indigo-400 hover:text-indigo-300 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-full" aria-label="Send message">
                            <SendIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatBox;