import React, { useRef, useState, useEffect } from "react";

function CameraRecorder({ onRecordingStart, onRecordingStop, isRecording }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: true,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setError("Could not access camera or microphone");
        console.error(err);
      }
    };

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = streamRef.current;
      if (!stream) {
        setError("No camera stream available");
        return;
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp8,opus",
      });

      const chunks = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        if (onRecordingStop) {
          onRecordingStop(blob);
        }
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;

      if (onRecordingStart) {
        onRecordingStart();
      }
    } catch (err) {
      setError("Could not start recording");
      console.error(err);
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
  };

  useEffect(() => {
    if (
      isRecording &&
      (!mediaRecorderRef.current ||
        mediaRecorderRef.current.state === "inactive")
    ) {
      startRecording();
    } else if (
      !isRecording &&
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      stopRecording();
    }
  }, [isRecording]);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
      <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl overflow-hidden shadow-2xl border-2 border-gray-700 w-full h-full flex items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-contain"
        />
        {isRecording && (
          <div className="absolute top-4 left-4 flex items-center space-x-2 bg-red-600/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg z-10">
            <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></div>
            <span className="text-white font-semibold text-sm">REC</span>
          </div>
        )}
      </div>
      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm font-medium">
          {error}
        </div>
      )}
    </div>
  );
}

export default CameraRecorder;
