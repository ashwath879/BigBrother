import React, { useState } from "react";

function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    {
      question: "How does BigBrother work?",
      answer:
        "BigBrother uses computer vision and AI to analyze video recordings of events. It automatically detects and logs them on a timeline, and allows users to query past events through a chat system using text or voice commands.",
    },
    {
      question: "Is my data secure and private?",
      answer: "Yes, all data is stored locally.",
    },
    {
      question: "Is it free to use?",
      answer: "Yes, it is free to use.",
    },
  ];

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <main className="flex-1 bg-background">
      <div className="container mx-auto px-6 py-12 max-w-4xl mt-20">
        <h1 className="text-5xl font-bold text-primary-800 mb-12 text-center">
          Frequently asked questions
        </h1>
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
              >
                <span className="text-lg font-semibold text-primary-800">
                  {faq.question}
                </span>
                <svg
                  className={`w-5 h-5 text-primary-500 transition-transform duration-200 ${
                    openIndex === index ? "transform rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {openIndex === index && (
                <div className="px-6 pb-4">
                  <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

export default FAQ;
