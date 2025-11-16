import React from "react";

function About() {
  return (
    <main className="flex-1 bg-background">
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <h1 className="text-5xl font-bold text-primary-800 mb-8 text-center mt-20">
          About BigBrother
        </h1>
        <div className="bg-white rounded-lg p-8 shadow-md border border-gray-100">
          <p className="text-lg text-gray-700 leading-relaxed">
            BigBrother is an app that enables individuals with Alzheimer's
            disease to quickly and effectively recall various events they've
            experienced. Our custom computer vision system detects any action or
            event and logs it into a timeline. Additionally, event summaries are
            provided for each event node that can be referenced at any time.
            Finally, users can query the data using the chatbox or voice
            detection, where Gemini will analyze and return the most relevant
            event.
          </p>
        </div>
      </div>
    </main>
  );
}

export default About;
