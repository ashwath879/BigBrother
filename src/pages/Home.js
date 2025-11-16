import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../firebase";

function Home() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });

    return () => unsubscribe();
  }, []);

  const handleGetStarted = async () => {
    if (user) {
      navigate("/recording");
    } else {
      const provider = new GoogleAuthProvider();
      provider.addScope("profile");
      provider.addScope("email");

      try {
        await signInWithPopup(auth, provider);
        navigate("/recording");
      } catch (error) {
        console.error("Error signing in:", error);
      }
    }
  };

  return (
    <main className="flex-1 bg-gradient-to-br from-primary-50 via-white to-primary-50">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-20">
          <div className="inline-block mb-6">
            <span className="text-primary-600 text-sm font-semibold uppercase tracking-wider bg-primary-100 px-4 py-2 rounded-full">
              AI-Powered Assistance
            </span>
          </div>
          <h1 className="text-5xl font-bold text-primary-900 mb-6 leading-tight">
            BigBrother
          </h1>
          <h2 className="text-xl font-medium text-gray-700 mb-8 max-w-3xl mx-auto leading-relaxed">
            Assisting Alzheimer's patients with everyday tasks through
            intelligent monitoring and AI-powered insights
          </h2>
          <button
            onClick={handleGetStarted}
            className="inline-flex items-center gap-2 bg-primary-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-primary-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-lg"
          >
            Get Started
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <div className="bg-white rounded-2xl p-8 mb-16 shadow-xl border border-gray-100">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-primary-900 mb-3">
              How it works
            </h3>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              A simple three-step process to help you stay organized and
              informed
            </p>
          </div>
          <div className="grid grid-cols-3 gap-8">
            <div className="text-center group">
              <div className="relative mb-6">
                <div className="bg-gradient-to-br from-primary-500 to-primary-600 text-white w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto shadow-lg group-hover:scale-110 transition-transform duration-200">
                  1
                </div>
              </div>
              <h4 className="text-xl font-bold text-primary-900 mb-3">
                Start Recording
              </h4>
              <p className="text-gray-600 leading-relaxed">
                Begin by recording your surroundings and activities with a
                simple click.
              </p>
            </div>
            <div className="text-center group">
              <div className="relative mb-6">
                <div className="bg-gradient-to-br from-primary-500 to-primary-600 text-white w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto shadow-lg group-hover:scale-110 transition-transform duration-200">
                  2
                </div>
              </div>
              <h4 className="text-xl font-bold text-primary-900 mb-3">
                Track Events
              </h4>
              <p className="text-gray-600 leading-relaxed">
                Events are automatically detected and logged on a custom
                timeline using computer vision and AI analysis.
              </p>
            </div>
            <div className="text-center group">
              <div className="relative mb-6">
                <div className="bg-gradient-to-br from-primary-500 to-primary-600 text-white w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto shadow-lg group-hover:scale-110 transition-transform duration-200">
                  3
                </div>
              </div>
              <h4 className="text-xl font-bold text-primary-900 mb-3">
                Query Assistance
              </h4>
              <p className="text-gray-600 leading-relaxed">
                Use the chat system to ask questions about past events by typing
                or using voice commands.
              </p>
            </div>
          </div>
        </div>

        <div className="text-center bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-12 shadow-2xl">
          <h3 className="text-2xl font-bold text-white mb-4">
            Try us today for free!
          </h3>
          <p className="text-primary-100 text-lg mb-8 max-w-xl mx-auto">
            Bigbrother is here to make your life easier.
          </p>
          <button
            onClick={handleGetStarted}
            className="inline-flex items-center gap-2 bg-white text-primary-700 px-8 py-4 rounded-xl font-semibold hover:bg-primary-50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-lg"
          >
            Get Started →
          </button>
        </div>
      </div>
    </main>
  );
}

export default Home;
