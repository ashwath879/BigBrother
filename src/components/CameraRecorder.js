import React, { useRef, useState, useEffect } from "react";

function CameraRecorder({
  onRecordingStart,
  onRecordingStop,
  isRecording,
  motionDetected = false,
  isCurrentlyRecording = false,
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
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

  useEffect(() => {
    if (isRecording && onRecordingStart) {
      onRecordingStart();
    } else if (!isRecording && onRecordingStop) {
      onRecordingStop(null);
    }
  }, [isRecording, onRecordingStart, onRecordingStop]);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      <div
        className="relative flex h-full w-full items-center justify-center overflow-hidden border"
        style={{
          background: "linear-gradient(180deg, #121314 0%, #000000 100%)",
          borderColor: "rgba(255, 255, 255, 0.28)",
          boxShadow: "0 5px 9px 0 rgba(0, 0, 0, 0.8)",
          borderRadius: "24px",
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="h-full w-full object-cover"
          style={{ transform: "scaleX(-1)" }}
        />

        {isRecording && (
          <div className="absolute left-4 top-4 ps-hud-pill z-10">
            <div className="ps-status-dot" />
            <span>Camera on</span>
          </div>
        )}

        {isRecording && motionDetected && (
          <div
            className="absolute right-4 top-4 z-10 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold"
            style={{
              background: "rgba(30, 174, 219, 0.2)",
              border: "1px solid rgba(30, 174, 219, 0.5)",
              color: "#ffffff",
            }}
          >
            <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-white" />
            <span>Motion detected</span>
          </div>
        )}

        {isRecording && isCurrentlyRecording && (
          <div
            className="absolute bottom-4 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"
            style={{
              background: "rgba(200, 27, 58, 0.88)",
              color: "#ffffff",
              boxShadow: "0 5px 9px 0 rgba(0, 0, 0, 0.8)",
            }}
          >
            <div className="h-3 w-3 animate-pulse rounded-full bg-white" />
            <span>Recording</span>
          </div>
        )}
      </div>

      {error && (
        <div
          className="mt-4 border px-4 py-2 text-sm font-medium"
          style={{
            borderColor: "#c81b3a",
            background: "rgba(200, 27, 58, 0.08)",
            color: "#c81b3a",
            borderRadius: "12px",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

export default CameraRecorder;
