import React, { useState, useRef, useEffect } from "react";

function Chat({ onSendMessage }) {
  const [message, setMessage] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef("");
  const isProcessingRef = useRef(false);

  useEffect(() => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onstart = () => {
        finalTranscriptRef.current = "";
        isProcessingRef.current = false;
      };

      recognitionRef.current.onresult = (event) => {
        if (isProcessingRef.current) {
          return;
        }
        isProcessingRef.current = true;

        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscriptRef.current += transcript + " ";
          } else {
            interimTranscript += transcript;
          }
        }

        setMessage(finalTranscriptRef.current + interimTranscript);

        isProcessingRef.current = false;
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        isProcessingRef.current = false;
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        isProcessingRef.current = false;
        if (finalTranscriptRef.current) {
          setMessage(finalTranscriptRef.current.trim());
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const handleMicrophoneClick = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in your browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      finalTranscriptRef.current = "";
      setMessage("");
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && onSendMessage) {
      onSendMessage(message.trim());
      setMessage("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3 md:flex-row md:items-center">
      <div className="relative flex-1">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask a question about a recorded event..."
          className="ps-input"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleMicrophoneClick}
          className={`ps-button ps-button--small ${
            isListening ? "ps-button--danger" : "ps-button--ghost"
          }`}
          title={isListening ? "Stop recording" : "Start voice input"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          </svg>
          <span>{isListening ? "Listening" : "Voice"}</span>
        </button>

        <button
          type="submit"
          disabled={!message.trim()}
          className="ps-button ps-button--primary ps-button--small"
          title="Send message"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14 5l7 7m0 0l-7 7m7-7H3"
            />
          </svg>
          <span>Send</span>
        </button>
      </div>
    </form>
  );
}

export default Chat;
