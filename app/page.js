"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (status === "authenticated") router.push("/dashboard");
  }, [status, router]);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center px-6">
      {/* Header */}
      <header className="w-full max-w-6xl flex justify-between items-center py-6">
        <h1 className="text-3xl font-bold text-purple-500">AttendEase</h1>

        {/* Dropdown Menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-white focus:outline-none"
          >
            &#8942; {/* Three Dots */}
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded shadow-lg">
              {status === "authenticated" ? (
                <>
                  <a
                    href="/dashboard"
                    className="block px-4 py-2 hover:bg-gray-700"
                  >
                    Dashboard
                  </a>
                  <a
                    href="/profile"
                    className="block px-4 py-2 hover:bg-gray-700"
                  >
                    Profile
                  </a>
                </>
              ) : (
                <>
                  <a
                    href="/login"
                    className="block px-4 py-2 hover:bg-gray-700"
                  >
                    Login
                  </a>
                  <a
                    href="/register"
                    className="block px-4 py-2 hover:bg-gray-700"
                  >
                    Sign Up
                  </a>
                  <a
                    href="/dashboard"
                    className="block px-4 py-2 hover:bg-gray-700"
                  >
                    Dashboard
                  </a>
                  <a
                    href="/profile"
                    className="block px-4 py-2 hover:bg-gray-700"
                  >
                    Profile
                  </a>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <div className="text-center mt-12">
        <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-tight">
          AI & GPS-Based <span className="text-purple-400">Attendance Monitoring</span>
        </h2>
        <p className="text-gray-400 mt-4 max-w-2xl mx-auto">
          Automate employee attendance with real-time tracking and AI-powered verification.
        </p>
        <a
          href="/login"
          className="mt-6 inline-block px-6 py-3 bg-purple-600 text-lg rounded hover:bg-purple-700 transition"
        >
          Get Started
        </a>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-12 max-w-6xl w-full">
        <FeatureCard
          title="GPS-Based Tracking"
          description="Ensure employees are present at the right location with real-time GPS monitoring."
        />
        <FeatureCard
          title="AI-Powered Face Recognition"
          description="Verify attendance using AI-based face recognition for maximum accuracy."
        />
        <FeatureCard
          title="Automated Reports"
          description="Generate detailed attendance reports and analytics with a single click."
        />
      </div>
    </div>
  );
}

// Feature Card Component
const FeatureCard = ({ title, description }) => (
  <div className="p-6 bg-gray-800 rounded-lg shadow-lg">
    <h3 className="text-xl font-semibold text-purple-400">{title}</h3>
    <p className="text-gray-400 mt-2">{description}</p>
  </div>
);
