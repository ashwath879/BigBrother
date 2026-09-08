import React from "react";
import { Link } from "react-router-dom";

function About() {
  return (
    <main className="flex-1">
      <section className="ps-surface-dark py-16 md:py-24">
        <div className="ps-container px-1">
          <p className="ps-caption" style={{ color: "#abd0eb" }}>
            About BigBrother
          </p>
          <h1 className="ps-display-xl mt-3 max-w-3xl text-white">
            A memory support system designed for calm daily confidence.
          </h1>
          <p className="ps-body-lg mt-5 max-w-3xl" style={{ color: "#d3dbe3" }}>
            BigBrother helps people living with memory loss recover context by capturing meaningful activity and turning it into an organized, searchable timeline.
          </p>
        </div>
      </section>

      <section className="ps-surface-light py-16 md:py-20">
        <div className="ps-container px-1">
          <article className="ps-card mx-auto max-w-4xl p-8 md:p-12">
            <h2 className="ps-display-s">What the platform does</h2>
            <p className="ps-body-lg mt-4">
              BigBrother uses a custom computer vision pipeline to detect meaningful events and log them as timeline nodes. Each node receives an AI-generated summary and can include transcript, video, and audio references. Users can then ask questions by text or voice, and the system retrieves the most relevant event with linked context.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/recording" className="ps-button ps-button--primary">
                Open recording
              </Link>
              <Link to="/faq" className="ps-button ps-button--secondary">
                View FAQs
              </Link>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}

export default About;
