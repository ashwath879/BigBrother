import React, { useRef, useState, useEffect } from "react";

function CameraRecorder({ onRecordingStart, onRecordingStop, isRecording, motionDetected = false, isCurrentlyRecording = false }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState(null);

  // Start camera preview (for visual feedback only)
  // The actual recording is handled by the backend camera_module
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

  // Notify parent component when recording state changes
  useEffect(() => {
    if (isRecording && onRecordingStart) {
      onRecordingStart();
    } else if (!isRecording && onRecordingStop) {
      // Backend handles stopping, so we just notify
      onRecordingStop(null);
    }
  }, [isRecording, onRecordingStart, onRecordingStop]);

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
        
        {/* Camera On Indicator */}
        {isRecording && (
          <div className="absolute top-4 left-4 flex items-center space-x-2 bg-green-600/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg z-10">
            <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
            <span className="text-white font-semibold text-sm">CAMERA ON</span>
          </div>
        )}
        
        {/* Motion Detected Indicator */}
        {isRecording && motionDetected && (
          <div className="absolute top-4 right-4 flex items-center space-x-2 bg-yellow-600/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg z-10">
            <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></div>
            <span className="text-white font-semibold text-sm">MOTION</span>
          </div>
        )}
        
        {/* Recording Indicator (when actively recording video) */}
        {isRecording && isCurrentlyRecording && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-2 bg-red-600/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg z-10">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
            <span className="text-white font-semibold text-sm">RECORDING</span>
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
