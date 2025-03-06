"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
      <h1 className="text-3xl font-bold">Welcome, {session?.user?.name}!</h1>
      <p className="text-gray-400">Email: {session?.user?.email}</p>
      <button onClick={() => signOut()} className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-600 rounded">
        Logout
      </button>
    </div>
  );
}
