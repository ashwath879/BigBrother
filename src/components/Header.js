import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/faq", label: "FAQ" },
  { to: "/recording", label: "Recording" },
];

function Header() {
  const [isWorking, setIsWorking] = useState(false);
  const [authError, setAuthError] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, isAuthReady, signInWithGoogle, signOutUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const isActive = (path) => location.pathname === path;

  const handleAuthClick = async () => {
    setAuthError("");
    setIsWorking(true);

    try {
      if (user) {
        await signOutUser();
        navigate("/");
      } else {
        await signInWithGoogle();
      }
    } catch (error) {
      setAuthError("Authentication failed. Please try again.");
      console.error("Authentication error:", error);
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-black ps-divider-bottom" style={{ borderColor: "#1f1f1f" }}>
      <div className="ps-container">
        <div className="flex items-center justify-between gap-4 py-3">
          <Link to="/" className="inline-flex items-center rounded-full px-1.5 py-1 transition-opacity hover:opacity-90">
            <span className="text-lg font-medium tracking-wide text-white">BigBrother</span>
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`ps-nav-link ${isActive(item.to) ? "ps-nav-link--active" : ""}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            {user && (
              <span className="ps-chip" style={{ background: "rgba(255, 255, 255, 0.12)", color: "#ffffff" }}>
                Signed in as {user.displayName?.split(" ")[0] || "User"}
              </span>
            )}
            <button
              onClick={handleAuthClick}
              disabled={isWorking || !isAuthReady}
              className="ps-button ps-button--primary ps-button--small"
            >
              {isWorking ? "Working..." : user ? "Sign out" : "Sign in"}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border text-white transition hover:border-white hover:text-blue-300 md:hidden"
            style={{ borderColor: "rgba(255, 255, 255, 0.3)" }}
            aria-expanded={isMenuOpen}
            aria-label="Toggle navigation"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {authError && (
          <p className="pb-2 text-sm" style={{ color: "#ff9aa6" }}>
            {authError}
          </p>
        )}

        {isMenuOpen && (
          <div className="md:hidden">
            <div
              className="mb-4 rounded-3xl border px-5 py-5 shadow-2xl"
              style={{
                borderColor: "rgba(255, 255, 255, 0.2)",
                background: "rgba(0, 0, 0, 0.9)",
              }}
            >
              <nav className="flex flex-col gap-4">
                {NAV_LINKS.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`text-base font-medium transition hover:text-blue-300 ${
                      isActive(item.to) ? "text-white" : "text-gray-300"
                    }`}
                    style={
                      isActive(item.to)
                        ? {
                            textDecoration: "underline",
                            textDecorationThickness: "2px",
                            textDecorationColor: "#0070cc",
                          }
                        : undefined
                    }
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              {user && (
                <p className="mt-5 ps-caption" style={{ color: "#d7e6f5" }}>
                  Signed in as {user.displayName?.split(" ")[0] || "User"}
                </p>
              )}

              <button
                onClick={handleAuthClick}
                disabled={isWorking || !isAuthReady}
                className="ps-button ps-button--primary mt-4 w-full"
              >
                {isWorking ? "Working..." : user ? "Sign out" : "Sign in"}
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;
