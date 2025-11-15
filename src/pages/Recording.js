import React, { useState } from "react";
import CameraRecorder from "../components/CameraRecorder";
import Timeline from "../components/Timeline";

const randomNames = [
  "Morning Routine",
  "Medication Time",
  "Exercise Session",
  "Meal Preparation",
  "Memory Exercise",
  "Daily Check-in",
  "Activity Break",
  "Safety Check",
  "Social Time",
  "Evening Routine",
  "Health Monitoring",
  "Task Reminder",
  "Care Check",
  "Wellness Activity",
  "Reminder Alert",
];

function Recording() {
  const [isRecording, setIsRecording] = useState(false);
  const [events, setEvents] = useState([]);
  const [eventIdCounter, setEventIdCounter] = useState(0);

  const getRandomName = () => {
    return randomNames[Math.floor(Math.random() * randomNames.length)];
  };

  const addEvent = () => {
    const newEvent = {
      id: eventIdCounter,
      title: getRandomName(),
      timestamp: new Date(),
    };
    setEvents((prev) => [...prev, newEvent]);
    setEventIdCounter((prev) => prev + 1);
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
    <main className="flex-1 bg-primary-50 flex items-center justify-center p-8">
      <div className="flex w-full max-w-7xl gap-8">
        <div className="flex-1 flex flex-col items-center justify-center">
          <CameraRecorder
            onRecordingStart={handleRecordingStart}
            onRecordingStop={handleRecordingStop}
            isRecording={isRecording}
          />
          <div className="mt-6 flex space-x-4">
            <button
              onClick={handleStartRecording}
              disabled={isRecording}
              className={`px-6 py-3 rounded-lg font-medium transition-colors duration-200 shadow-sm ${
                isRecording
                  ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                  : "bg-primary-600 text-white hover:bg-primary-700"
              }`}
            >
              Start Recording
            </button>
            <button
              onClick={handleStopRecording}
              disabled={!isRecording}
              className={`px-6 py-3 rounded-lg font-medium transition-colors duration-200 shadow-sm ${
                !isRecording
                  ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                  : "bg-red-600 text-white hover:bg-red-700"
              }`}
            >
              Stop Recording
            </button>
          </div>
        </div>
        <div className="w-96 flex flex-col items-start">
          <div className="w-full h-[70vh] max-h-[70vh] overflow-y-auto">
            <Timeline events={events} />
          </div>
          <button
            onClick={addEvent}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors duration-200 shadow-sm text-sm"
          >
            Add Event
          </button>
        </div>
      </div>
    </main>
  );
}

export default Recording;
