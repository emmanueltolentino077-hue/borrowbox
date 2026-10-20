"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ShieldCheck, Contact2, AtSign } from "lucide-react";

export default function ActivatePage() {
  const [employeeId, setEmployeeId] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!employeeId.trim() || !email.trim()) {
      setIsError(true);
      setMessage("Please fill in both Employee ID and Institutional Email.");
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    setIsError(false);

    try {
      const res = await fetch("/api/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: employeeId.trim(),
          email: email.trim().toLowerCase(),
        }),
      });

      const data = await res.json();

      if (res.status === 429) {
        setIsError(true);
        setMessage(data.message || "Too many attempts. Try again later.");
      } else if (!res.ok && res.status !== 200) {
        setIsError(true);
        setMessage(data.message || "Unable to process activation right now.");
      } else {
        setIsError(false);
        setIsSuccess(true);
        setMessage(
          data.message ||
            "If these details match a pending account, sign-in details have been sent to the registered email. If nothing arrives, contact the system administrator."
        );
      }
    } catch {
      setIsError(true);
      setMessage("Unable to process request. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      style={{ backgroundColor: "#e0d8d2", color: "#3d4640", minHeight: "100vh" }}
      className="flex flex-col justify-between selection:bg-primary-100"
    >
      {/* Top Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            style={{ backgroundColor: "#14532d", borderRadius: "8px" }}
            className="w-10 h-10 flex items-center justify-center shadow-sm"
          >
            {/* Box logo matching HorizontalBorder.svg and BorrowBox-Account Activation.png */}
            <svg
              className="w-6 h-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#95f8a7"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
          <div>
            <h1
              style={{ color: "#1f1a17" }}
              className="font-sans font-bold text-lg leading-tight"
            >
              BorrowBox
            </h1>
            <p
              style={{ color: "#565e74" }}
              className="font-mono text-[11px] uppercase tracking-wider"
            >
              Campus IT Equipment Dispatch &amp; Logistics
            </p>
          </div>
        </div>

        <Link
          href="/login"
          style={{
            borderColor: "#b9c4bb",
            color: "#1f1a17",
            backgroundColor: "transparent",
            borderRadius: "4px",
          }}
          className="inline-flex items-center gap-2 px-4 py-2 border font-mono text-xs font-medium hover:bg-neutral-200 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to Login</span>
        </Link>
      </header>

      {/* Main Activation Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div
          style={{
            backgroundColor: "#f5ede6",
            borderRadius: "16px",
            borderColor: "rgba(185, 196, 187, 0.4)",
          }}
          className="w-full max-w-xl p-8 sm:p-10 shadow-sm border"
        >
          {/* Tag Pill */}
          <div
            style={{
              backgroundColor: "#eafff1",
              color: "#006e2e",
              borderRadius: "999px",
            }}
            className="inline-flex items-center gap-2 px-3 py-1 font-mono text-xs font-semibold mb-6 tracking-wide"
          >
            <span
              style={{ backgroundColor: "#006e2e" }}
              className="w-2 h-2 rounded-full inline-block"
            />
            <span>DIRECTORY MATCHING</span>
          </div>

          <h2
            style={{ color: "#1f1a17" }}
            className="text-3xl font-bold font-sans tracking-tight mb-2"
          >
            Activate Admin Account
          </h2>
          <p
            style={{ color: "#57534e" }}
            className="text-sm font-sans mb-7 leading-relaxed"
          >
            All IT administrators are pre-provisioned in the system. Enter your registered Employee ID and institutional email to request temporary activation credentials.
          </p>

          {isSuccess ? (
            <div className="space-y-6">
              <div
                style={{
                  backgroundColor: "#eafff1",
                  borderColor: "#99f6b4",
                  borderRadius: "8px",
                }}
                className="border p-5 text-[#003d18]"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    style={{ backgroundColor: "#006e2e" }}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 shadow-sm"
                  >
                    <ShieldCheck size={22} />
                  </div>
                  <div>
                    <h3
                      style={{ color: "#002d10" }}
                      className="font-bold text-base font-sans"
                    >
                      Activation Dispatched!
                    </h3>
                    <p
                      style={{ color: "#005523" }}
                      className="text-xs font-sans"
                    >
                      Single-use credentials sent to <strong>{email}</strong>
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.9)",
                    borderColor: "#b9c4bb",
                  }}
                  className="border rounded p-3 text-xs font-mono mb-4 text-[#1f1a17]"
                >
                  <div className="flex justify-between py-1 border-b border-[#e5e7eb]">
                    <span style={{ color: "#57534e" }}>Temporary Username:</span>
                    <strong style={{ color: "#006e2e" }}>{employeeId}</strong>
                  </div>
                  <div className="flex justify-between py-1 pt-2">
                    <span style={{ color: "#57534e" }}>Single-Use Password:</span>
                    <span style={{ color: "#15803d" }} className="font-semibold">
                      Check Email Inbox
                    </span>
                  </div>
                </div>

                <div
                  style={{ color: "#003d18" }}
                  className="text-xs space-y-2 mb-2 font-sans leading-relaxed"
                >
                  <p>
                    <strong>Next Step:</strong> Click the button below to create your permanent username and password on the <strong>Setup Credentials</strong> screen.
                  </p>
                  <p className="text-[11px] text-[#005523]">
                    A backup 1-click activation link has also been dispatched to your email at <strong>{email}</strong>.
                  </p>
                </div>
              </div>

              {/* Direct Proceed Button to Setup Credentials */}
              <Link
                href="/setup-credentials"
                style={{
                  backgroundColor: "#006e2e",
                  borderRadius: "4px",
                }}
                className="w-full h-12 inline-flex items-center justify-center gap-2 text-white font-mono text-sm font-semibold transition-colors hover:bg-primary-800 shadow-sm"
              >
                <span>Proceed to Setup Credentials</span>
                <ArrowRight size={17} />
              </Link>

              <button
                type="button"
                onClick={() => {
                  setIsSuccess(false);
                  setEmployeeId("");
                  setEmail("");
                  setMessage(null);
                }}
                style={{ color: "#57534e" }}
                className="w-full text-center text-xs font-mono hover:text-[#1f1a17] transition-colors py-1 cursor-pointer"
              >
                &larr; Activate another account
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Employee ID */}
              <div>
                <label
                  htmlFor="employeeId"
                  style={{ color: "#1f1a17" }}
                  className="block font-mono text-xs uppercase font-semibold mb-2 tracking-wide"
                >
                  EMPLOYEE / STAFF ID NUMBER <span style={{ color: "#b91c1c" }}>*</span>
                </label>
                <div className="relative">
                  <Contact2
                    style={{ color: "#78716c" }}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"
                    size={19}
                    strokeWidth={1.5}
                  />
                  <input
                    id="employeeId"
                    type="text"
                    required
                    placeholder="EMP-2024-9104"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    style={{
                      backgroundColor: "#efe5df",
                      borderColor: "#b9c4bb",
                      borderRadius: "4px",
                      color: "#1f1a17",
                    }}
                    className="w-full h-12 pl-11 pr-3 border placeholder:text-neutral-500 font-mono text-sm focus:outline-none"
                  />
                </div>
                <p style={{ color: "#78716c" }} className="text-xs mt-1.5 font-sans">
                  Found on your university faculty/staff badge or HR employment contract.
                </p>
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  style={{ color: "#1f1a17" }}
                  className="block font-mono text-xs uppercase font-semibold mb-2 tracking-wide"
                >
                  INSTITUTIONAL EMAIL ADDRESS <span style={{ color: "#b91c1c" }}>*</span>
                </label>
                <div className="relative">
                  <AtSign
                    style={{ color: "#78716c" }}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"
                    size={19}
                    strokeWidth={1.5}
                  />
                  <input
                    id="email"
                    type="email"
                    required
                    placeholder="jack.davis@uni.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      backgroundColor: "#efe5df",
                      borderColor: "#b9c4bb",
                      borderRadius: "4px",
                      color: "#1f1a17",
                    }}
                    className="w-full h-12 pl-11 pr-3 border placeholder:text-neutral-500 font-sans text-sm focus:outline-none"
                  />
                </div>
                <p style={{ color: "#78716c" }} className="text-xs mt-1.5 font-sans">
                  Must match the verified official email on file with campus HR.
                </p>
              </div>

              {/* Security Check Banner */}
              <div
                style={{
                  backgroundColor: "#eafff1",
                  borderColor: "#99f6b4",
                  borderRadius: "4px",
                }}
                className="border p-4 flex items-start gap-3 text-sm"
              >
                <ShieldCheck
                  style={{ color: "#006e2e" }}
                  className="shrink-0 mt-0.5"
                  size={20}
                  strokeWidth={1.75}
                />
                <p style={{ color: "#003d18" }} className="text-xs sm:text-sm leading-normal">
                  <strong style={{ color: "#002d10" }} className="font-semibold">
                    Security Check:
                  </strong>{" "}
                  Upon match, our system immediately sends an automated dispatch with your default username and temporary single-use password.
                </p>
              </div>

              {/* Status Feedback Message */}
              {message && (
                <div
                  style={{
                    backgroundColor: isError ? "#fee2e2" : "#eafff1",
                    borderColor: isError ? "#b91c1c" : "#006e2e",
                    color: isError ? "#b91c1c" : "#006e2e",
                    borderRadius: "4px",
                  }}
                  className="p-3.5 text-xs sm:text-sm border"
                >
                  {message}
                </div>
              )}

              {/* Action Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  backgroundColor: "#006e2e",
                  borderRadius: "4px",
                }}
                className="w-full h-12 inline-flex items-center justify-center gap-2 text-white font-mono text-sm font-medium transition-colors hover:bg-primary-800 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
              >
                <span>
                  {isSubmitting
                    ? "Verifying & Sending..."
                    : "Verify & Send Activation Email"}
                </span>
                <ArrowRight size={17} />
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{ borderColor: "rgba(185, 196, 187, 0.6)", color: "#57534e" }}
        className="w-full max-w-7xl mx-auto px-6 py-6 border-t flex flex-col sm:flex-row items-center justify-between text-xs gap-3"
      >
        <p>
          BorrowBox &copy; 2024 University IT Logistics System. All rights reserved.
        </p>
        <div className="flex items-center gap-4">
          <span className="hover:text-black cursor-pointer">Security Policy</span>
          <span>&bull;</span>
          <span className="hover:text-black cursor-pointer">
            Identity &amp; Access Management (IAM)
          </span>
        </div>
      </footer>
    </div>
  );
}
