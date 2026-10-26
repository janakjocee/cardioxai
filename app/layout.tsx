import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CardioXAI | Explainable AI & Late-Fusion CVD Decision Support",
  description: "Early-Stage Cardiovascular Disease Prediction Using a Late-Fusion Integration of Clinical and Lifestyle Data with Explainable Machine Learning System - Sarjan Bahadur Thapa, York St John University",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
