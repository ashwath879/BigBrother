import React from "react";

function Timeline({ events = [] }) {
  if (events.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <div className="text-gray-400 text-sm">No events yet</div>
      </div>
    );
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return "Now";
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="h-full">
      {events.map((event, idx) => (
        <div
          className="flex gap-x-3 hover:font-bold cursor-pointer"
          key={event.id || idx}
        >
          <div className="min-w-14 text-end">
            <span className="text-xs text-gray-500">
              {formatTime(event.timestamp)}
            </span>
          </div>

          <div className="relative last:after:hidden after:absolute after:top-7 after:bottom-0 after:start-3.5 after:w-px after:-translate-x-[0.5px] after:bg-gray-200">
            <div className="relative z-10 size-7 flex justify-center items-center">
              <div className="size-2 rounded-full bg-gray-400" />
            </div>
          </div>

          <div className="grow pt-0.5 pb-8">
            <h3 className="flex gap-x-1.5 font-semibold text-gray-800">
              {typeof event.title === "string" ||
              typeof event.title === "object"
                ? event.title
                : event.label || `Event ${idx + 1}`}
            </h3>

            {event.description && (
              <p className="mt-1 text-sm text-gray-600">{event.description}</p>
            )}

            {event.actor && (
              <button
                type="button"
                className="mt-1 -ms-1 p-1 inline-flex items-center gap-x-2 text-xs rounded-lg border border-transparent text-gray-500 hover:bg-gray-100 focus:outline-hidden focus:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none"
              >
                {event.actor.type === "img" ? (
                  <img
                    className="shrink-0 size-4 rounded-full"
                    src={event.actor.src}
                    alt={event.actor.name}
                  />
                ) : (
                  <span className="flex shrink-0 justify-center items-center size-4 bg-white border border-gray-200 text-[10px] font-semibold uppercase text-gray-600 rounded-full">
                    {event.actor.initial}
                  </span>
                )}
                {event.actor.name}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default Timeline;
