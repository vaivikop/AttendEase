"use client"; // Ensure this is a Client Component if using Next.js 13+ with the App Router

import Providers from "./providers";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 5000, // Default duration for toasts
              style: {
                background: "#363636",
                color: "#fff",
              },
              success: {
                style: {
                  background: "green",
                },
              },
              error: {
                style: {
                  background: "red",
                },
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}