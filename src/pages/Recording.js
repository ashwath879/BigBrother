import React, { useState } from "react";
import CameraRecorder from "../components/CameraRecorder";
import Timeline from "../components/Timeline";
import Chat from "../components/Chat";

const eventTitles = [
  "event1",
  "event2",
  "event3",
  "event4",
  "event5",
  "event6",
  "event7",
  "event8",
  "event9",
  "event10",
  "event11",
  "event12",
  "event13",
  "event14",
  "event15",
  "event16",
  "event17",
  "event18",
  "event19",
];

function Recording() {
  const [isRecording, setIsRecording] = useState(false);
  const [events, setEvents] = useState([]);
  const [eventIdCounter, setEventIdCounter] = useState(0);
  const [index, setIndex] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const addEvent = () => {
    if (index >= eventTitles.length) {
      return;
    }
    const newEvent = {
      id: eventIdCounter,
      title: eventTitles[index],
      timestamp: new Date(),
      summary: `Summary for ${eventTitles[index]} wkfugasbjfhgaifuyagsifa`,
    };
    setEvents((prev) => [...prev, newEvent]);
    setEventIdCounter((prev) => prev + 1);
    setIndex((prev) => prev + 1);
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
  };

  const closeEventModal = () => {
    setSelectedEvent(null);
  };

  const handleStartRecording = () => {
    setIsRecording(true);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
  };

  const handleRecordingStart = () => {
    console.log("Recording started");
  };

  const handleRecordingStop = (blob) => {
    console.log("Recording stopped", blob);
  };

  return (
    <main className="flex-1 bg-gradient-to-br from-primary-50 via-white to-primary-50 min-h-screen">
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-3 gap-6 mb-6 items-stretch">
          <div className="col-span-2 flex flex-col">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 flex flex-col h-full">
              <div className="mb-4 w-3/4 h-[25vh] flex items-center justify-center flex-shrink-0 mx-auto">
                <div className="w-full h-full">
                  <CameraRecorder
                    onRecordingStart={handleRecordingStart}
                    onRecordingStop={handleRecordingStop}
                    isRecording={isRecording}
                  />
                </div>
              </div>

              <div className="flex flex-row items-center justify-center gap-4 flex-shrink-0">
                <button
                  onClick={handleStartRecording}
                  disabled={isRecording}
                  className={`inline-flex items-center gap-2 px-8 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg ${
                    isRecording
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-primary-600 text-white hover:bg-primary-700 hover:shadow-xl transform hover:-translate-y-0.5"
                  }`}
                >
                  Start Recording
                </button>
                <button
                  onClick={handleStopRecording}
                  disabled={!isRecording}
                  className={`inline-flex items-center gap-2 px-8 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg ${
                    !isRecording
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-red-600 text-white hover:bg-red-700 hover:shadow-xl transform hover:-translate-y-0.5"
                  }`}
                >
                  Stop Recording
                </button>
              </div>
            </div>
          </div>

          <div className="col-span-1 flex flex-col">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 flex flex-col h-full">
              <div className="mb-3 flex-shrink-0">
                <h2 className="text-xl font-bold text-primary-900 mb-1">
                  Event Timeline
                </h2>
                <p className="text-sm text-gray-600">
                  {events.length} {events.length === 1 ? "event" : "events"}{" "}
                  recorded
                </p>
              </div>

              <div className="flex-1 min-h-0 mb-3" style={{ height: "25vh" }}>
                <Timeline events={events} onEventClick={handleEventClick} />
              </div>

              <button
                onClick={addEvent}
                disabled={index >= eventTitles.length}
                className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all duration-200 shadow-md flex-shrink-0 ${
                  index >= eventTitles.length
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-primary-600 text-white hover:bg-primary-700 hover:shadow-lg transform hover:-translate-y-0.5"
                }`}
              >
                Add Event
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-primary-900 mb-1">
              AI Assistant
            </h2>
            <p className="text-sm text-gray-600">
              Ask questions about recorded events
            </p>
          </div>
          <Chat onSendMessage={(message) => console.log("Message:", message)} />
        </div>
      </div>

      {selectedEvent && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={closeEventModal}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div>
                <h2 className="text-2xl font-bold text-primary-900">
                  {selectedEvent.title}
                </h2>
                {selectedEvent.timestamp && (
                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(selectedEvent.timestamp).toLocaleString()}
                  </p>
                )}
              </div>
              <button
                onClick={closeEventModal}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Event Summary
              </h3>
              <div className="prose max-w-none">
                <p className="text-gray-700 leading-relaxed">
                  {selectedEvent.summary ||
                    "No summary available for this event."}
                </p>
              </div>
              {selectedEvent.details && (
                <div className="mt-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-2">
                    Additional Details
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                      {JSON.stringify(selectedEvent.details, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default Recording;
