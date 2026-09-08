import React, { useState, useEffect } from "react";
import CameraRecorder from "../components/CameraRecorder";
import Timeline from "../components/Timeline";
import Chat from "../components/Chat";
import ReactMarkdown from "react-markdown";

const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000/api";
const API_SERVER_URL = API_BASE_URL.replace(/\/api\/?$/, "");

function Recording() {
  const [isRecording, setIsRecording] = useState(false);
  const [motionDetected, setMotionDetected] = useState(false);
  const [isCurrentlyRecording, setIsCurrentlyRecording] = useState(false);
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isGeneratingAnswer, setIsGeneratingAnswer] = useState(false);

  useEffect(() => {
    if (selectedEvent) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [selectedEvent]);

  const fetchMemoryNodes = async () => {
    try {
      try {
        await fetch(`${API_BASE_URL}/memory-nodes/cleanup`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });
      } catch (cleanupError) {
        console.debug("Cleanup failed (non-critical):", cleanupError);
      }

      const response = await fetch(
        `${API_BASE_URL}/memory-nodes?file_type=recording`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        console.error("Failed to fetch memory nodes:", response.status);
        return;
      }

      const data = await response.json();
      const memoryNodes = data.memory_nodes || [];

      const convertedEvents = memoryNodes.map((node) => {
        let metadata = {};
        try {
          metadata =
            typeof node.metadata === "string"
              ? JSON.parse(node.metadata)
              : node.metadata || {};
        } catch (e) {
          console.error("Error parsing metadata:", e);
        }

        const summaryText = metadata.summary;
        const isSummaryLoading = summaryText === "Loading Summary...";
        const fullSummary = isSummaryLoading
          ? "Loading Summary..."
          : summaryText && summaryText.trim() !== ""
          ? summaryText
          : "No summary available";

        let eventTitle = metadata.title;

        if (!eventTitle || eventTitle.trim() === "") {
          const timestamp = node.timestamp || new Date().toISOString();

          let utcTimestamp = timestamp;
          if (
            !utcTimestamp.endsWith("Z") &&
            !utcTimestamp.includes("+") &&
            !utcTimestamp.includes("-", 10)
          ) {
            utcTimestamp = utcTimestamp.replace(/\.\d{3,6}/, "") + "Z";
          }

          const date = new Date(utcTimestamp);

          const formatter = new Intl.DateTimeFormat("en-US", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
            timeZone: "America/New_York",
          });

          eventTitle = formatter.format(date);
        }

        return {
          id: node.id,
          title: eventTitle,
          timestamp: node.timestamp || new Date().toISOString(),
          summary: fullSummary,
          transcript: metadata.transcript || null,
          video_path: metadata.video_path || node.file_path,
          audio_path: metadata.audio_path || null,
          transcript_path: metadata.transcript_path || null,
          thumbnail_path: metadata.thumbnail_path || null,
          objects_detected: metadata.objects_detected || [],
        };
      });

      convertedEvents.sort((a, b) => {
        const dateA = new Date(a.timestamp);
        const dateB = new Date(b.timestamp);
        return dateA - dateB;
      });

      setEvents(convertedEvents);
    } catch (error) {
      console.error("Error fetching memory nodes:", error);
    }
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
  };

  const closeEventModal = () => {
    setSelectedEvent(null);
  };

  const getFileUrl = (filePath) => {
    if (!filePath) return null;

    if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
      return filePath;
    }

    let relativePath = filePath;

    if (filePath.includes("data/")) {
      const dataIndex = filePath.indexOf("data/");
      relativePath = filePath.substring(dataIndex + 5);
    } else if (
      filePath.startsWith("recordings/") ||
      filePath.startsWith("audio/") ||
      filePath.startsWith("images/") ||
      filePath.startsWith("transcripts/")
    ) {
      relativePath = filePath;
    } else if (filePath.includes("/recordings/")) {
      const recordingsIndex = filePath.lastIndexOf("/recordings/");
      relativePath = "recordings/" + filePath.substring(recordingsIndex + 12);
    } else if (filePath.includes("/audio/")) {
      const audioIndex = filePath.lastIndexOf("/audio/");
      relativePath = "audio/" + filePath.substring(audioIndex + 7);
    } else if (filePath.includes("/images/")) {
      const imagesIndex = filePath.lastIndexOf("/images/");
      relativePath = "images/" + filePath.substring(imagesIndex + 8);
    } else if (filePath.includes("/transcripts/")) {
      const transcriptsIndex = filePath.lastIndexOf("/transcripts/");
      relativePath = "transcripts/" + filePath.substring(transcriptsIndex + 13);
    }

    return `${API_BASE_URL}/files/${relativePath}`;
  };

  const getVideoUrl = (videoPath) => {
    return getFileUrl(videoPath);
  };

  const getAudioUrl = (audioPath) => {
    return getFileUrl(audioPath);
  };

  const handleStartRecording = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${API_BASE_URL}/camera/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          camera_index: 0,
          fps: 10.0,
          min_area: 2000,
          inactivity_timeout: 5.0,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = {
            error: `Server error: ${response.status} ${response.statusText}`,
          };
        }
        console.error("Failed to start camera:", errorData);
        alert(
          `Failed to start camera: ${
            errorData.error || `Server error (${response.status})`
          }`
        );
        return;
      }

      const data = await response.json();

      if (data.error) {
        console.error("Failed to start camera:", data);
        alert(`Failed to start camera: ${data.error}`);
      } else {
        setIsRecording(true);
        console.log("Camera started:", data);
      }
    } catch (error) {
      console.error("Error starting camera:", error);

      if (error.name === "AbortError") {
        alert(
          "Connection timeout. Please make sure the backend server is running:\n\npython3 Backend/app.py"
        );
      } else if (
        error.message === "Load failed" ||
        error.message.includes("fetch") ||
        error.message.includes("NetworkError") ||
        error.message.includes("Failed to fetch") ||
        error instanceof TypeError
      ) {
        alert(
          "Could not connect to the backend server.\n\n" +
            "Please make sure the server is running:\n" +
            "python3 Backend/app.py\n\n" +
            `The server should be running on: ${API_SERVER_URL}`
        );
      } else {
        alert(`Error starting camera: ${error.message || "Unknown error"}`);
      }
    }
  };

  const handleStopRecording = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${API_BASE_URL}/camera/stop`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = {
            error: `Server error: ${response.status} ${response.statusText}`,
          };
        }
        console.error("Failed to stop camera:", errorData);
        alert(
          `Failed to stop camera: ${
            errorData.error || `Server error (${response.status})`
          }`
        );
        return;
      }

      const data = await response.json();

      if (data.error) {
        console.error("Failed to stop camera:", data);
        alert(`Failed to stop camera: ${data.error}`);
      } else {
        setIsRecording(false);
        setMotionDetected(false);
        setIsCurrentlyRecording(false);
        console.log("Camera stopped:", data);
      }
    } catch (error) {
      console.error("Error stopping camera:", error);

      if (error.name === "AbortError") {
        alert(
          "Connection timeout. Please make sure the backend server is running:\n\npython3 Backend/app.py"
        );
      } else if (
        error.message === "Load failed" ||
        error.message.includes("fetch") ||
        error.message.includes("NetworkError") ||
        error.message.includes("Failed to fetch") ||
        error instanceof TypeError
      ) {
        alert(
          "Could not connect to the backend server.\n\n" +
            "Please make sure the server is running:\n" +
            "python3 Backend/app.py\n\n" +
            `The server should be running on: ${API_SERVER_URL}`
        );
      } else {
        alert(`Error stopping camera: ${error.message || "Unknown error"}`);
      }
    }
  };

  useEffect(() => {
    const fetchAndRefresh = async () => {
      await fetchMemoryNodes();
    };

    fetchAndRefresh();

    const refreshInterval = setInterval(fetchAndRefresh, 5000);

    return () => {
      clearInterval(refreshInterval);
    };
  }, []);

  useEffect(() => {
    if (!isRecording) {
      const timeoutId = setTimeout(() => {
        fetchMemoryNodes();
      }, 3000);

      return () => clearTimeout(timeoutId);
    }
  }, [isRecording]);

  useEffect(() => {
    if (selectedEvent) {
      const updatedEvent = events.find((e) => e.id === selectedEvent.id);
      if (updatedEvent) {
        const summaryChanged = updatedEvent.summary !== selectedEvent.summary;
        const transcriptChanged =
          updatedEvent.transcript !== selectedEvent.transcript;

        if (summaryChanged || transcriptChanged) {
          setSelectedEvent(updatedEvent);
        }
      }
    }
  }, [events, selectedEvent]);

  useEffect(() => {
    let intervalId = null;

    if (!isRecording) {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      return;
    }

    const checkCameraStatus = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        const response = await fetch(`${API_BASE_URL}/camera/status`, {
          signal: controller.signal,
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }).catch(() => null);

        clearTimeout(timeoutId);

        if (!response || !response.ok) {
          return;
        }

        try {
          const data = await response.json();

          if (data.motion_detected !== undefined) {
            setMotionDetected(data.motion_detected);
          }
          if (data.is_currently_recording !== undefined) {
            setIsCurrentlyRecording(data.is_currently_recording);
          }

          if (data.is_running === false) {
            setIsRecording(false);
            setMotionDetected(false);
            setIsCurrentlyRecording(false);
          }
        } catch (e) {}
      } catch (error) {}
    };

    checkCameraStatus();
    intervalId = setInterval(checkCameraStatus, 1000);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isRecording]);

  const handleRecordingStart = () => {
    console.log("Recording started");
  };

  const handleRecordingStop = (blob) => {
    console.log("Recording stopped", blob);
  };

  const generateAndPlayAnswer = async (
    query,
    summary,
    videoPath,
    audioPath
  ) => {
    if (!query || !summary) {
      return;
    }

    setIsGeneratingAnswer(true);

    try {
      const response = await fetch(`${API_BASE_URL}/generate-answer-audio`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: query,
          summary: summary,
          video_path: videoPath || null,
          audio_path: audioPath || null,
        }),
      });

      if (!response.ok) {
        console.error("Failed to generate answer audio:", response.status);
        setIsGeneratingAnswer(false);
        return;
      }

      const contentType = response.headers.get("content-type");

      if (contentType && contentType.includes("audio/mpeg")) {
        const answerText = response.headers.get("X-Answer-Text");
        if (answerText) {
          console.log("Answer:", answerText);
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        audio.play().catch((error) => {
          console.error("Error playing audio:", error);
          setIsGeneratingAnswer(false);
        });

        audio.addEventListener("play", () => {
          setIsGeneratingAnswer(false);
        });

        audio.addEventListener("ended", () => {
          URL.revokeObjectURL(audioUrl);
        });
      } else {
        const data = await response.json();
        if (data.answer) {
          console.log("Answer:", data.answer);
          if ("speechSynthesis" in window) {
            const utterance = new SpeechSynthesisUtterance(data.answer);

            utterance.onstart = () => {
              setIsGeneratingAnswer(false);
            };

            utterance.onerror = () => {
              setIsGeneratingAnswer(false);
            };

            window.speechSynthesis.speak(utterance);
          } else {
            setIsGeneratingAnswer(false);
          }
        } else {
          setIsGeneratingAnswer(false);
        }
      }
    } catch (error) {
      console.error("Error generating answer audio:", error);
      setIsGeneratingAnswer(false);
    }
  };

  const saveEventToJSON = async (event) => {
    const eventData = {
      title: event.title || null,
      timestamp: event.timestamp || null,
      summary: event.summary || null,
      transcript: event.transcript || null,
      video_path: event.video_path || null,
      audio_path: event.audio_path || null,
      transcript_path: event.transcript_path || null,
      thumbnail_path: event.thumbnail_path || null,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/save-event`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventData),
      });

      if (!response.ok) {
        console.error("Failed to save event data:", response.status);
      } else {
        console.log("Event data saved to target.json");
      }
    } catch (error) {
      console.error("Error saving event data:", error);
    }
  };

  const handleChatMessage = async (message) => {
    if (!message || !message.trim()) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/memory-nodes/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: message.trim(),
          max_results: 1,
        }),
      });

      if (!response.ok) {
        console.error("Failed to search memory nodes:", response.status);
        alert("Failed to search events. Please try again.");
        return;
      }

      const data = await response.json();
      const results = data.memory_nodes || [];

      if (results.length > 0) {
        const mostRelevantNode = results[0];

        let metadata = {};
        try {
          metadata =
            typeof mostRelevantNode.metadata === "string"
              ? JSON.parse(mostRelevantNode.metadata)
              : mostRelevantNode.metadata || {};
        } catch (e) {
          console.error("Error parsing metadata:", e);
        }

        const summaryText = metadata.summary;
        const isSummaryLoading = summaryText === "Loading Summary...";
        const fullSummary = isSummaryLoading
          ? "Loading Summary..."
          : summaryText && summaryText.trim() !== ""
          ? summaryText
          : "No summary available";

        let eventTitle = metadata.title;
        if (!eventTitle || eventTitle.trim() === "") {
          const timestamp =
            mostRelevantNode.timestamp || new Date().toISOString();
          let utcTimestamp = timestamp;
          if (
            !utcTimestamp.endsWith("Z") &&
            !utcTimestamp.includes("+") &&
            !utcTimestamp.includes("-", 10)
          ) {
            utcTimestamp = utcTimestamp.replace(/\.\d{3,6}/, "") + "Z";
          }

          const date = new Date(utcTimestamp);
          const formatter = new Intl.DateTimeFormat("en-US", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
            timeZone: "America/New_York",
          });
          eventTitle = formatter.format(date);
        }

        const event = {
          id: mostRelevantNode.id,
          title: eventTitle,
          timestamp: mostRelevantNode.timestamp || new Date().toISOString(),
          summary: fullSummary,
          transcript: metadata.transcript || null,
          video_path: metadata.video_path || mostRelevantNode.file_path,
          audio_path: metadata.audio_path || null,
          transcript_path: metadata.transcript_path || null,
          thumbnail_path: metadata.thumbnail_path || null,
          objects_detected: metadata.objects_detected || [],
        };

        saveEventToJSON(event);

        setSelectedEvent(event);

        generateAndPlayAnswer(
          message.trim(),
          fullSummary,
          event.video_path,
          event.audio_path
        );
      } else {
        alert("No relevant events found for your query.");
      }
    } catch (error) {
      console.error("Error searching memory nodes:", error);
      alert(
        "Failed to search events. Please make sure the backend server is running."
      );
    }
  };

  return (
    <main className="flex-1 ps-surface-light py-8 md:py-10">
      <div className="ps-container px-1">
        <div
          className="mb-6 flex flex-wrap items-center gap-3 px-4 py-3 ps-glass-bar"
          style={{ borderRadius: "36px" }}
        >
          <span className="ps-chip" style={{ background: "#ffffff", color: "#000000" }}>
            {isRecording ? "Camera monitoring is active" : "Camera is idle"}
          </span>
          <span className="ps-chip" style={{ background: "#ffffff", color: "#000000" }}>
            {events.length} {events.length === 1 ? "event" : "events"} captured
          </span>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <section className="ps-card p-6 md:col-span-2 md:p-8">
            <div className="mb-6">
              <h1 className="ps-display-m">Recording console</h1>
              <p className="ps-body mt-2">
                Start monitoring to collect events automatically and keep your memory timeline updated in real time.
              </p>
            </div>

            <div className="mx-auto w-full max-w-4xl" style={{ height: "46vh", minHeight: "380px" }}>
              <CameraRecorder
                onRecordingStart={handleRecordingStart}
                onRecordingStop={handleRecordingStop}
                isRecording={isRecording}
                motionDetected={motionDetected}
                isCurrentlyRecording={isCurrentlyRecording}
              />
            </div>

            <div className="mt-7 flex flex-wrap justify-center gap-4">
              <button
                onClick={handleStartRecording}
                disabled={isRecording}
                className="ps-button ps-button--primary"
              >
                Start recording
              </button>
              <button
                onClick={handleStopRecording}
                disabled={!isRecording}
                className="ps-button ps-button--danger"
              >
                Stop recording
              </button>
            </div>
          </section>

          <section className="ps-card p-6 md:p-7 xl:col-span-1">
            <div className="mb-3">
              <h2 className="ps-display-s">Event timeline</h2>
              <p className="ps-caption mt-1">
                Tap an event card to inspect media, summary, and transcript.
              </p>
            </div>

            <div style={{ height: "40vh", minHeight: "320px" }}>
              <Timeline events={events} onEventClick={handleEventClick} />
            </div>
          </section>
        </div>

        <section className="ps-card mt-6 p-6 md:p-8">
          <div className="mb-4">
            <h2 className="ps-display-s">AI assistant</h2>
            <p className="ps-body mt-2">
              Ask a question about recent activity and BigBrother will pull the most relevant event.
            </p>
          </div>
          <Chat onSendMessage={handleChatMessage} />
        </section>
      </div>

      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 ps-modal-scrim"
          onClick={closeEventModal}
        >
          <div
            className="relative w-full max-w-6xl overflow-y-auto border bg-white"
            style={{
              borderColor: "#f3f3f3",
              boxShadow: "0 5px 9px 0 rgba(0, 0, 0, 0.8)",
              borderRadius: "24px",
              maxHeight: "86vh",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="sticky top-0 flex items-start justify-between gap-3 px-6 py-4"
              style={{
                background: "linear-gradient(180deg, #ffffff 0%, #f5f7fa 100%)",
                borderBottom: "1px solid #f3f3f3",
                borderTopLeftRadius: "24px",
                borderTopRightRadius: "24px",
              }}
            >
              <div>
                <h2 className="ps-display-s">{selectedEvent.title}</h2>
                {selectedEvent.timestamp && (
                  <p className="ps-caption mt-1">
                    {(() => {
                      let utcTimestamp = selectedEvent.timestamp;
                      if (
                        !utcTimestamp.endsWith("Z") &&
                        !utcTimestamp.includes("+") &&
                        !utcTimestamp.includes("-", 10)
                      ) {
                        utcTimestamp =
                          utcTimestamp.replace(/\.\d{3,6}/, "") + "Z";
                      }

                      const date = new Date(utcTimestamp);
                      const formatter = new Intl.DateTimeFormat("en-US", {
                        month: "2-digit",
                        day: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: true,
                        timeZone: "America/New_York",
                      });
                      return formatter.format(date);
                    })()}
                  </p>
                )}
              </div>

              <button
                onClick={closeEventModal}
                className="ps-button ps-button--ghost ps-button--small"
              >
                Close
              </button>
            </div>

            <div className="p-6">
              <div className="grid gap-6 lg:grid-cols-2">
                {(selectedEvent.video_path || selectedEvent.audio_path) && (
                  <section className="space-y-6">
                    {selectedEvent.video_path && (
                      <article>
                        <h3 className="ps-title-sm mb-3">Video recording</h3>
                        <div
                          className="overflow-hidden bg-black ps-elevation-hero"
                          style={{ borderRadius: "19px" }}
                        >
                          <video
                            key={selectedEvent.video_path}
                            controls
                            className="h-auto w-full"
                            poster={selectedEvent.thumbnail_path ? getFileUrl(selectedEvent.thumbnail_path) : undefined}
                            src={getVideoUrl(selectedEvent.video_path)}
                          >
                            Your browser does not support the video tag.
                          </video>
                        </div>
                      </article>
                    )}

                    {selectedEvent.audio_path && (
                      <article>
                        <h3 className="ps-title-sm mb-3">Audio recording</h3>
                        <div
                          className="border p-4"
                          style={{ borderColor: "#f3f3f3", background: "#f5f7fa", borderRadius: "19px" }}
                        >
                          <audio
                            controls
                            className="w-full"
                            src={getAudioUrl(selectedEvent.audio_path)}
                          >
                            Your browser does not support the audio tag.
                          </audio>
                        </div>
                      </article>
                    )}
                  </section>
                )}

                <section>
                  <h3 className="ps-title-sm mb-3">Event summary</h3>
                  <div
                    className="border bg-white p-4"
                    style={{
                      borderColor: "#f3f3f3",
                      maxHeight: "36vh",
                      overflowY: "auto",
                      borderRadius: "19px",
                    }}
                  >
                    {selectedEvent.summary === "Loading Summary..." ? (
                      <div className="flex items-center gap-2">
                        <svg
                          className="h-5 w-5 animate-spin"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          style={{ color: "#0070cc" }}
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        <p className="ps-body italic">Loading summary...</p>
                      </div>
                    ) : (
                      <div className="ps-markdown ps-body break-words" style={{ color: "#1f1f1f" }}>
                        <ReactMarkdown
                          components={{
                            h1: ({ node, children, ...props }) => (
                              <h1 className="ps-display-s" {...props}>
                                {children}
                              </h1>
                            ),
                            h2: ({ node, children, ...props }) => (
                              <h2 className="text-xl font-light" {...props}>
                                {children}
                              </h2>
                            ),
                            h3: ({ node, children, ...props }) => (
                              <h3 className="text-lg font-medium" {...props}>
                                {children}
                              </h3>
                            ),
                            p: ({ node, ...props }) => (
                              <p className="mb-2" {...props} />
                            ),
                            strong: ({ node, ...props }) => (
                              <strong className="font-semibold" {...props} />
                            ),
                            ul: ({ node, ...props }) => (
                              <ul className="mb-2 list-disc space-y-1 pl-5" {...props} />
                            ),
                            ol: ({ node, ...props }) => (
                              <ol className="mb-2 list-decimal space-y-1 pl-5" {...props} />
                            ),
                            li: ({ node, ...props }) => <li {...props} />,
                          }}
                        >
                          {selectedEvent.summary ||
                            "No summary available for this event."}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>

                  {selectedEvent.transcript && (
                    <div className="mt-6">
                      <h4 className="ps-title-sm mb-2">Transcript</h4>
                      <div
                        className="border p-4"
                        style={{ borderColor: "#f3f3f3", background: "#f5f7fa", borderRadius: "13px" }}
                      >
                        <p className="whitespace-pre-wrap text-sm" style={{ color: "#1f1f1f" }}>
                          {selectedEvent.transcript}
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedEvent.objects_detected &&
                    selectedEvent.objects_detected.length > 0 && (
                      <div className="mt-6">
                        <h4 className="ps-title-sm mb-2">Objects detected</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedEvent.objects_detected.map((obj, idx) => (
                            <span
                              key={idx}
                              className="rounded-full px-3 py-1 text-sm font-medium"
                              style={{
                                background: "#ffffff",
                                border: "1px solid #f3f3f3",
                                color: "#0068bd",
                              }}
                            >
                              {obj}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                </section>
              </div>
            </div>

            {isGeneratingAnswer && (
              <div
                className="absolute bottom-4 left-4 z-10 flex items-center gap-2 border px-3 py-2 text-sm"
                style={{
                  background: "rgba(255, 255, 255, 0.95)",
                  borderColor: "#f3f3f3",
                  color: "#1f1f1f",
                  borderRadius: "12px",
                }}
              >
                <svg
                  className="h-4 w-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  style={{ color: "#0070cc" }}
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>Generating answer...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

export default Recording;
