"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  AlertCircle,
  LogOut,
} from "lucide-react";

interface SetupCredentialsFormProps {
  admin: {
    id: string;
    employee_id: string;
    company_email: string;
    full_name: string;
    username: string;
  };
}

export default function SetupCredentialsForm({
  admin,
}: SetupCredentialsFormProps) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Live checklist evaluations
  const hasMinLength = password.length >= 8;
  const hasCase = /[A-Z]/.test(password) && /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const isPasswordValid = hasMinLength && hasCase && hasNumber && hasSpecial;

  const passwordsMatch =
    password.length > 0 &&
    confirmPassword.length > 0 &&
    password === confirmPassword;

  // Form validity for button enable
  const isUsernameValid = /^[a-z0-9.]{4,}$/.test(username.trim());
  const canSubmit = isUsernameValid && isPasswordValid && passwordsMatch;

  // Initials for avatar
  const initials = admin.full_name
    ? admin.full_name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "AD";

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await fetch("/api/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      router.push("/login");
    } finally {
      setIsSigningOut(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/setup-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.message || "Unable to save credentials.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setErrorMessage("Network error. Please try again.");
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
      <header className="w-full bg-white border-b border-[#e5e7eb] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              style={{ backgroundColor: "#15803d", borderRadius: "8px" }}
              className="w-10 h-10 flex items-center justify-center shadow-sm"
            >
              <svg
                className="w-6 h-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ffffff"
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

          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold text-[#1f1a17] hidden sm:inline">
              {admin.full_name} (IT Admin)
            </span>
            <div className="w-8 h-8 rounded-full bg-[#006e2e] text-white flex items-center justify-center font-mono text-xs font-bold">
              {initials}
            </div>
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="text-xs text-[#b91c1c] hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Form Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-[680px] shadow-xl rounded-2xl overflow-hidden border border-[#b9c4bb]">
          {/* Amber Requirement Banner */}
          <div className="bg-[#fffbeb] border-b border-[#fed7aa] p-5 flex items-start gap-3.5">
            <div className="w-9 h-9 rounded bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-[#78350f]">
                FIRST-TIME LOGIN SECURITY REQUIREMENT
              </h2>
              <p className="text-xs text-[#78350f]/90 mt-1 leading-relaxed">
                You are currently logged in with a single-use temporary password. Please establish your permanent credentials to activate full terminal access.
              </p>
            </div>
          </div>

          {/* Form Body */}
          <div className="bg-white p-6 sm:p-10">
            <div>
              <h3 className="text-2xl font-bold font-sans text-[#1f1a17]">
                Update Admin Credentials
              </h3>
              <p className="text-xs text-[#57534e] mt-1">
                Configure your personal administrator username and password.
              </p>
            </div>

            <div className="border-t border-[#e8dfda] my-6" />

            {errorMessage && (
              <div className="mb-6 p-3 rounded bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* New Permanent Username */}
              <div>
                <label
                  htmlFor="new-username"
                  className="block text-xs font-mono font-bold uppercase tracking-wider text-[#44403c] mb-1.5"
                >
                  NEW PERMANENT USERNAME <span className="text-red-600">*</span>
                </label>
                <input
                  id="new-username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="e.g. jdavis_admin"
                  className="w-full px-3.5 py-2.5 bg-[#fbf7f4] border border-[#d6cfca] rounded text-sm text-[#1f1a17] placeholder:text-neutral-400 focus:outline-none focus:border-[#006e2e] focus:ring-1 focus:ring-[#006e2e] font-sans"
                />
                <p className="text-[11px] text-[#78716c] mt-1.5">
                  Username must be at least 4 characters and contain only lowercase letters, numbers, or periods.
                </p>
              </div>

              {/* New Permanent Password */}
              <div>
                <label
                  htmlFor="new-password"
                  className="block text-xs font-mono font-bold uppercase tracking-wider text-[#44403c] mb-1.5"
                >
                  NEW PERMANENT PASSWORD <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new permanent password"
                    className="w-full pl-3.5 pr-10 py-2.5 bg-[#fbf7f4] border border-[#d6cfca] rounded text-sm text-[#1f1a17] placeholder:text-neutral-400 focus:outline-none focus:border-[#006e2e] focus:ring-1 focus:ring-[#006e2e]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Live Checklist */}
                <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {/* Left Column */}
                  <div className="space-y-2">
                    <div
                      className={`flex items-center gap-2 ${
                        hasMinLength ? "text-[#006e2e]" : "text-[#78716c]"
                      }`}
                    >
                      <Check
                        className={`w-4 h-4 ${
                          hasMinLength ? "stroke-[2.5]" : "stroke-[1.5] text-neutral-400"
                        }`}
                      />
                      <span>At least 8 characters</span>
                    </div>

                    <div
                      className={`flex items-center gap-2 ${
                        hasNumber ? "text-[#006e2e]" : "text-[#78716c]"
                      }`}
                    >
                      <Check
                        className={`w-4 h-4 ${
                          hasNumber ? "stroke-[2.5]" : "stroke-[1.5] text-neutral-400"
                        }`}
                      />
                      <span>Contains a number (0-9)</span>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-2">
                    <div
                      className={`flex items-center gap-2 ${
                        hasCase ? "text-[#006e2e]" : "text-[#78716c]"
                      }`}
                    >
                      <Check
                        className={`w-4 h-4 ${
                          hasCase ? "stroke-[2.5]" : "stroke-[1.5] text-neutral-400"
                        }`}
                      />
                      <span>Uppercase &amp; lowercase letters</span>
                    </div>

                    <div
                      className={`flex items-center gap-2 ${
                        hasSpecial ? "text-[#006e2e]" : "text-[#78716c]"
                      }`}
                    >
                      <Check
                        className={`w-4 h-4 ${
                          hasSpecial ? "stroke-[2.5]" : "stroke-[1.5] text-neutral-400"
                        }`}
                      />
                      <span>Special character (!@#$)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label
                  htmlFor="confirm-password"
                  className="block text-xs font-mono font-bold uppercase tracking-wider text-[#44403c] mb-1.5"
                >
                  CONFIRM NEW PASSWORD <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new permanent password"
                    className={`w-full pl-3.5 pr-10 py-2.5 bg-[#fbf7f4] border rounded text-sm text-[#1f1a17] placeholder:text-neutral-400 focus:outline-none transition-colors ${
                      passwordsMatch
                        ? "border-[#006e2e] ring-1 ring-[#006e2e]"
                        : confirmPassword.length > 0 && !passwordsMatch
                        ? "border-red-400 focus:border-red-500"
                        : "border-[#d6cfca] focus:border-[#006e2e]"
                    }`}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1.5">
                    {passwordsMatch && (
                      <Check className="w-4 h-4 text-[#006e2e] stroke-[2.5]" />
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="text-neutral-400 hover:text-neutral-600"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Match Status Message */}
                {passwordsMatch && (
                  <p className="text-xs text-[#006e2e] mt-1.5 font-medium flex items-center gap-1">
                    Passwords match successfully.
                  </p>
                )}
                {confirmPassword.length > 0 && !passwordsMatch && (
                  <p className="text-xs text-red-600 mt-1.5">
                    Passwords do not match.
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!canSubmit || isSubmitting}
                className="w-full py-3.5 bg-[#006e2e] hover:bg-[#005a24] text-white font-mono text-xs font-semibold uppercase tracking-wider rounded flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Saving Permanent Credentials...</span>
                ) : (
                  <>
                    <span>Save Credentials &amp; Launch Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Card Footer */}
          <div className="bg-[#fbf7f4] px-6 sm:px-10 py-4 border-t border-[#e8dfda] flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-[#78716c] gap-2">
            <div>Logistics Vault Policy: Passwords expire every 90 days.</div>
            <div>
              Security Audit: <span className="font-bold text-[#1f1a17]">ENFORCED</span>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Footer */}
      <footer className="w-full bg-white border-t border-[#e5e7eb] px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-[#78716c] gap-3">
          <div>
            BorrowBox &copy; 2024 University IT Logistics System. All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <span className="hover:underline cursor-pointer">Security Policy</span>
            <span>&bull;</span>
            <span className="hover:underline cursor-pointer">IT Access Compliance</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
