import React, { useState } from "react";

function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    {
      question: "How does BigBrother work?",
      answer:
        "BigBrother uses computer vision and AI to analyze recorded sessions. It detects meaningful moments, logs them in a timeline, and lets users query those moments by text or voice.",
    },
    {
      question: "Is my data secure and private?",
      answer: "Yes. Data is stored locally in your environment.",
    },
    {
      question: "Is it free to use?",
      answer: "Yes, BigBrother is currently free to use.",
    },
  ];

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <main className="flex-1">
      <section className="ps-surface-light py-16 md:py-20">
        <div className="ps-container px-1">
          <div className="mx-auto max-w-4xl">
            <h1 className="ps-display-l text-center">Frequently asked questions</h1>
            <p className="ps-body-lg mx-auto mt-4 max-w-2xl text-center">
              Quick answers about how the recording, timeline, and assistant workflow behaves.
            </p>

            <div className="mt-10 space-y-4">
              {faqs.map((faq, index) => {
                const isOpen = openIndex === index;

                return (
                  <article key={faq.question} className="ps-card overflow-hidden" style={{ borderRadius: "19px" }}>
                    <button
                      onClick={() => toggleFAQ(index)}
                      className="flex w-full items-center justify-between px-6 py-5 text-left transition"
                      style={{ background: isOpen ? "#f5f7fa" : "#ffffff" }}
                    >
                      <span className="text-lg font-medium" style={{ color: "#1f1f1f" }}>
                        {faq.question}
                      </span>
                      <span
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border text-lg font-semibold"
                        style={{ borderColor: "#cccccc", color: "#0068bd" }}
                      >
                        {isOpen ? "−" : "+"}
                      </span>
                    </button>

                    {isOpen && (
                      <div className="px-6 pb-6">
                        <p className="ps-body">{faq.answer}</p>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default FAQ;
