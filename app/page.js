"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.push("/dashboard");
  }, [status, router]);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center px-6">
      {/* Header */}
      <header className="w-full max-w-5xl flex justify-between items-center py-6">
        <h1 className="text-3xl font-bold text-purple-500">AttendEase</h1>
        <nav>
          <a href="/login" className="px-4 py-2 bg-purple-600 rounded hover:bg-purple-700 transition">
            Login
          </a>
          <a href="/register" className="ml-4 px-4 py-2 border border-purple-500 rounded hover:bg-purple-500 transition">
            Sign Up
          </a>
        </nav>
      </header>

      {/* Hero Section */}
      <div className="text-center mt-12">
        <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-tight">
          AI & GPS-Based <span className="text-purple-400">Attendance Monitoring</span>
        </h2>
        <p className="text-gray-400 mt-4 max-w-2xl mx-auto">
          Automate employee attendance with real-time tracking and AI-powered verification.
        </p>
        <a href="/login" className="mt-6 inline-block px-6 py-3 bg-purple-600 text-lg rounded hover:bg-purple-700 transition">
          Get Started
        </a>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-5xl">
        <div className="p-6 bg-gray-800 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold text-purple-400">GPS-Based Tracking</h3>
          <p className="text-gray-400 mt-2">Ensure employees are present at the right location with real-time GPS monitoring.</p>
        </div>
        <div className="p-6 bg-gray-800 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold text-purple-400">AI-Powered Face Recognition</h3>
          <p className="text-gray-400 mt-2">Verify attendance using AI-based face recognition for maximum accuracy.</p>
        </div>
        <div className="p-6 bg-gray-800 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold text-purple-400">Automated Reports</h3>
          <p className="text-gray-400 mt-2">Generate detailed attendance reports and analytics with a single click.</p>
        </div>
      </div>
    </div>
  );
}
