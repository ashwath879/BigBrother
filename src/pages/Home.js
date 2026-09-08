import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const METRICS = [
  { label: "Hands-free support", value: "24/7" },
  { label: "Search response speed", value: "< 3s" },
  { label: "One-tap setup", value: "Simple" },
];

const FEATURES = [
  {
    title: "Capture daily moments",
    description:
      "BigBrother monitors activity and detects meaningful moments automatically, so users can stay present instead of taking notes.",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M4 7a3 3 0 013-3h2l1-1h4l1 1h2a3 3 0 013 3v9a3 3 0 01-3 3H7a3 3 0 01-3-3V7z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    title: "Build a living timeline",
    description:
      "Events are organized into a chronological memory feed with summaries, making it easy to revisit what happened and when.",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 6h16M8 12h8M10 18h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Ask natural questions",
    description:
      "Type or speak a question and get context-rich answers from recent events, with linked media for confidence and clarity.",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M8 10h8M8 14h5m-7 6l2.5-3H18a3 3 0 003-3V7a3 3 0 00-3-3H6a3 3 0 00-3 3v7a3 3 0 003 3h2.5L8 20z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

const STEPS = [
  {
    title: "Start monitoring",
    body: "Launch recording and let BigBrother detect meaningful activity in real time.",
  },
  {
    title: "Review detected events",
    body: "Every relevant moment gets timestamped and summarized into a searchable timeline.",
  },
  {
    title: "Get context instantly",
    body: "Ask by voice or text to recover details about what happened, where, and when.",
  },
];

function Home() {
  const [isWorking, setIsWorking] = useState(false);
  const [authError, setAuthError] = useState("");
  const navigate = useNavigate();
  const { user, isAuthReady, signInWithGoogle } = useAuth();

  const handleGetStarted = async () => {
    setAuthError("");
    setIsWorking(true);

    try {
      if (!user) {
        await signInWithGoogle();
      }
      navigate("/recording");
    } catch (error) {
      setAuthError("Sign in failed. Please try again.");
      console.error("Error signing in:", error);
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <main className="flex-1">
      <section className="ps-surface-dark ps-hero-backdrop relative overflow-hidden">
        <div className="hero-grid-overlay absolute inset-0 opacity-70" />
        <div className="pointer-events-none absolute -left-24 top-12 h-72 w-72 rounded-full animate-float" style={{ background: "rgba(0, 112, 204, 0.25)", filter: "blur(65px)" }} />
        <div className="pointer-events-none absolute -right-16 bottom-16 h-80 w-80" style={{ background: "rgba(30, 174, 219, 0.2)", filter: "blur(80px)", borderRadius: "100%" }} />

        <div className="ps-container relative grid gap-12 px-1 pb-20 pt-16 lg:grid-cols-2 lg:items-end lg:pt-24">
          <div className="animate-fade-up">
            <span className="ps-chip" style={{ background: "rgba(255,255,255,0.08)", color: "#dfefff", border: "1px solid rgba(255,255,255,0.22)" }}>
              Assistive memory intelligence
            </span>

            <h1 className="ps-display-xl mt-6 max-w-3xl text-white">
              Rebuild daily confidence for memory care.
            </h1>
            <p className="ps-body-lg mt-6 max-w-2xl" style={{ color: "#d2d7dc" }}>
              BigBrother helps people with memory loss recover context from everyday life with real-time event capture, AI summaries, and natural-language recall.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                onClick={handleGetStarted}
                disabled={isWorking || !isAuthReady}
                className="ps-button ps-button--primary"
              >
                {isWorking
                  ? "Starting..."
                  : user
                  ? "Open recording dashboard"
                  : "Start with Google"}
              </button>

              <Link to="/about" className="ps-button ps-button--secondary">
                Learn more
              </Link>
            </div>

            {authError && (
              <p className="mt-5 text-sm" style={{ color: "#ff95ab" }}>
                {authError}
              </p>
            )}

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {METRICS.map((metric, idx) => (
                <article
                  key={metric.label}
                  className="ps-card--dark animate-fade-up p-4"
                  style={{ animationDelay: `${idx * 120 + 140}ms` }}
                >
                  <p className="ps-display-s text-white">{metric.value}</p>
                  <p className="ps-caption mt-1" style={{ color: "#c4d5e5" }}>
                    {metric.label}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div className="animate-fade-up" style={{ animationDelay: "180ms" }}>
            <article className="ps-card--dark p-7">
              <p className="ps-caption" style={{ color: "#d6e8f9" }}>
                Live session snapshot
              </p>

              <div className="mt-5 space-y-3">
                <div
                  className="rounded-2xl border p-4"
                  style={{ borderColor: "rgba(255, 255, 255, 0.15)", background: "rgba(0, 0, 0, 0.35)" }}
                >
                  <p className="ps-caption" style={{ color: "#bacde1" }}>
                    Current status
                  </p>
                  <p className="mt-2 text-base font-semibold text-white">Monitoring active</p>
                </div>

                <div
                  className="rounded-2xl border p-4"
                  style={{ borderColor: "rgba(255, 255, 255, 0.15)", background: "rgba(0, 0, 0, 0.35)" }}
                >
                  <p className="ps-caption" style={{ color: "#bacde1" }}>
                    Last event
                  </p>
                  <p className="mt-2 text-base font-semibold text-white">
                    Kitchen routine detected at 8:14 AM
                  </p>
                </div>

                <div
                  className="rounded-2xl border p-4"
                  style={{ borderColor: "rgba(255, 255, 255, 0.15)", background: "rgba(0, 0, 0, 0.35)" }}
                >
                  <p className="ps-caption" style={{ color: "#bacde1" }}>
                    Suggested prompt
                  </p>
                  <p className="mt-2 text-base font-semibold" style={{ color: "#8cd4ff" }}>
                    Where did I leave my medication this morning?
                  </p>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="ps-surface-light py-20 md:py-24">
        <div className="ps-container px-1">
          <div className="mb-12 text-center">
            <h2 className="ps-display-l">Built for calm, clarity, and trust</h2>
            <p className="ps-body-lg mx-auto mt-4 max-w-2xl">
              A landing experience that explains value quickly, with gallery-paced spacing and one clear next action in each panel.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {FEATURES.map((feature, idx) => (
              <article
                key={feature.title}
                className="ps-tile animate-fade-up p-7"
                style={{ animationDelay: `${idx * 120}ms` }}
              >
                <span
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{ background: "#e8f2fb", color: "#0068bd" }}
                >
                  {feature.icon}
                </span>
                <h3 className="ps-display-s mt-4">{feature.title}</h3>
                <p className="ps-body mt-3">{feature.description}</p>
                <div className="mt-5">
                  <Link to="/recording" className="ps-button ps-button--primary ps-button--mini">
                    Explore feature
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="ps-surface-dark py-20 md:py-24" style={{ borderTop: "1px solid #1f1f1f" }}>
        <div className="ps-container px-1">
          <div className="mb-12 flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="ps-caption" style={{ color: "#a9c8e0" }}>
                How it works
              </p>
              <h2 className="ps-display-l mt-2 text-white">Three steps, zero confusion</h2>
            </div>
            <Link to="/faq" className="ps-button ps-button--secondary ps-button--small">
              Read FAQs
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {STEPS.map((step, idx) => (
              <article key={step.title} className="ps-card--dark p-6">
                <span
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold"
                  style={{ background: "#ffffff", color: "#0070cc" }}
                >
                  {idx + 1}
                </span>
                <h3 className="ps-display-s mt-4 text-white">{step.title}</h3>
                <p className="ps-body mt-2" style={{ color: "#ced8df" }}>
                  {step.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="ps-surface-white py-16 md:py-20">
        <div className="ps-container px-1">
          <article
            className="ps-card p-8 text-center md:p-12"
            style={{ background: "linear-gradient(180deg, #ffffff 0%, #f5f7fa 100%)" }}
          >
            <h3 className="ps-display-m">Ready to try BigBrother?</h3>
            <p className="ps-body-lg mx-auto mt-3 max-w-2xl">
              Start free and open the recording dashboard in under a minute.
            </p>
            <button
              onClick={handleGetStarted}
              disabled={isWorking || !isAuthReady}
              className="ps-button ps-button--commerce mt-7"
            >
              {isWorking ? "Preparing..." : "Launch BigBrother"}
            </button>
          </article>
        </div>
      </section>
    </main>
  );
}

export default Home;
