import React, { useRef, useEffect } from "react";

function Timeline({ events = [], onEventClick }) {
  const scrollContainerRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    if (scrollContainerRef.current && contentRef.current && events.length > 0) {
      scrollContainerRef.current.scrollTop =
        scrollContainerRef.current.scrollHeight;
    }
  }, [events.length]);

  if (events.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center py-8 text-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="mb-3 h-12 w-12"
          fill="none"
          viewBox="0 0 24 24"
          stroke="#cccccc"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m-6 0V8m6 0l-3 3m0 0l3 3m-3-3H9"
          />
        </svg>
        <div className="text-sm font-medium" style={{ color: "#6b6b6b" }}>
          No events yet
        </div>
        <div className="mt-1 text-xs" style={{ color: "#6b6b6b" }}>
          Events will appear here
        </div>
      </div>
    );
  }

  const getEventTitle = (event) => {
    if (typeof event.title === "string") return event.title;
    if (typeof event.title === "object") return String(event.title);
    return event.label || "Event";
  };

  const handleEventClick = (event) => {
    if (onEventClick) {
      onEventClick(event);
    }
  };

  return (
    <div ref={scrollContainerRef} className="relative h-full overflow-y-auto pr-1">
      <div ref={contentRef} className="relative flex w-full flex-col items-start gap-3 pb-2 pt-2">
        <div className="absolute bottom-0 left-5 top-0 w-0.5" style={{ background: "#0070cc" }} />

        {events.map((event, idx) => {
          const title = getEventTitle(event);

          return (
            <div key={event.id || idx} className="group relative flex w-full items-center">
              <div
                className="absolute left-5 top-1/2 z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
                style={{ background: "#0070cc" }}
              />

              <div className="ml-9 flex-1 min-w-0">
                <button
                  onClick={() => handleEventClick(event)}
                  className="w-full cursor-pointer border px-3 py-2 text-left transition"
                  style={{
                    borderColor: "#f3f3f3",
                    background: "#ffffff",
                    boxShadow: "0 5px 9px 0 rgba(0, 0, 0, 0.06)",
                    borderRadius: "12px",
                  }}
                >
                  <div className="truncate text-sm font-semibold" style={{ color: "#1f1f1f" }}>
                    {title}
                  </div>
                  {event.timestamp && (
                    <div className="mt-0.5 text-xs" style={{ color: "#6b6b6b" }}>
                      {(() => {
                        let utcTimestamp = event.timestamp;
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
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                          timeZone: "America/New_York",
                        });
                        return formatter.format(date);
                      })()}
                    </div>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Timeline;
