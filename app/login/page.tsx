"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Check,
  Key,
  Zap,
  ChevronRight,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlUsername = searchParams.get("username") || "";
  const isActivated = searchParams.get("activated") === "1";

  const [username, setUsername] = useState(urlUsername);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [trustedWorkstation, setTrustedWorkstation] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);

  useEffect(() => {
    if (urlUsername && !username) {
      setUsername(urlUsername);
    }
  }, [urlUsername, username]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMessage("Please enter both username and password.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.message || "Invalid username or password.");
        return;
      }

      if (data.mustChangeCredentials) {
        router.push("/setup-credentials");
      } else {
        router.push("/dashboard");
      }
      router.refresh();
    } catch {
      setErrorMessage("Unable to connect to login service. Please check your network.");
    } finally {
      setIsLoading(false);
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
        </div>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-[940px] bg-white rounded-2xl shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-12 border border-[#b9c4bb]">
          {/* Left Column: Dark Slate Overview */}
          <div className="md:col-span-5 bg-[#18181b] p-8 md:p-10 flex flex-col justify-between text-white">
            <div>
              {/* Administrator Access Pill */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#005a24]/60 border border-[#4caf6e]/40 text-[#99f6b4] text-xs font-mono font-medium tracking-wide">
                <Lock className="w-3.5 h-3.5" />
                <span>ADMINISTRATOR ACCESS</span>
              </div>

              <h2 className="text-2xl font-bold font-sans mt-6 leading-snug">
                University IT Logistics &amp; Equipment Vault
              </h2>
              <p className="text-xs text-neutral-300 mt-3 leading-relaxed">
                Secure terminal for IT officers to manage asset checkout, active borrows, hardware reservations, and faculty returns.
              </p>

              <div className="mt-8 space-y-4 text-xs">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                    <Check className="w-3 h-3" />
                  </div>
                  <div>
                    <span className="font-semibold text-white">Pre-provisioned Accounts: </span>
                    <span className="text-neutral-300">All staff are registered by HR with an Employee ID.</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                    <Key className="w-3 h-3" />
                  </div>
                  <div>
                    <span className="font-semibold text-white">First-time Login: </span>
                    <span className="text-neutral-300">Activate with your Employee ID to receive your temporary credentials.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-neutral-800 pt-6 mt-8 flex items-center justify-between text-xs font-mono text-neutral-400">
              <div>
                Terminal ID: <span className="text-neutral-200">HUB-W04</span>
              </div>
              <div className="px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-300">
                v2.4.1
              </div>
            </div>
          </div>

          {/* Right Column: Form Container */}
          <div className="md:col-span-7 p-8 md:p-10 bg-white flex flex-col justify-between">
            <div>
              <h2 className="text-2xl font-bold text-[#1f1a17] font-sans">
                Sign in to your account
              </h2>
              <p className="text-xs text-[#57534e] mt-1">
                Enter your assigned username and password to proceed to the logistics dashboard.
              </p>

              {isActivated && (
                <div
                  style={{
                    backgroundColor: "#eafff1",
                    borderColor: "#99f6b4",
                    color: "#003d18",
                  }}
                  className="mt-4 p-3.5 rounded border text-xs flex items-start gap-2.5 shadow-xs"
                >
                  <Check
                    style={{ color: "#006e2e" }}
                    className="w-4 h-4 shrink-0 mt-0.5"
                  />
                  <div>
                    <strong
                      style={{ color: "#002d10" }}
                      className="block font-semibold"
                    >
                      Account Activated!
                    </strong>
                    <span>
                      Please enter the single-use temporary password from your email to sign in. You will immediately be directed to setup your permanent credentials.
                    </span>
                  </div>
                </div>
              )}

              {errorMessage && (
                <div className="mt-4 p-3 rounded bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="mt-6 space-y-4">
                {/* Username */}
                <div>
                  <label
                    htmlFor="username"
                    className="block text-xs font-mono font-bold uppercase tracking-wider text-[#44403c] mb-1.5"
                  >
                    USERNAME / ADMIN ID
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="username"
                      type="text"
                      autoComplete="username"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. IT-2026-001 or jdavis"
                      className="w-full pl-9 pr-3 py-2.5 bg-[#fbf7f4] border border-[#d6cfca] rounded text-sm text-[#1f1a17] placeholder:text-neutral-400 focus:outline-none focus:border-[#006e2e] focus:ring-1 focus:ring-[#006e2e] transition-colors"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="password"
                      className="block text-xs font-mono font-bold uppercase tracking-wider text-[#44403c]"
                    >
                      PASSWORD
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(true)}
                      className="text-xs text-[#006e2e] hover:underline font-medium"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full pl-9 pr-10 py-2.5 bg-[#fbf7f4] border border-[#d6cfca] rounded text-sm text-[#1f1a17] placeholder:text-neutral-400 focus:outline-none focus:border-[#006e2e] focus:ring-1 focus:ring-[#006e2e] transition-colors"
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
                </div>

                {/* Trusted workstation */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    id="trusted"
                    type="checkbox"
                    checked={trustedWorkstation}
                    onChange={(e) => setTrustedWorkstation(e.target.checked)}
                    className="w-4 h-4 text-[#006e2e] rounded border-neutral-300 focus:ring-[#006e2e]"
                  />
                  <label htmlFor="trusted" className="text-xs text-[#57534e]">
                    Keep this workstation trusted (8 hours)
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-[#006e2e] hover:bg-[#005a24] text-white font-mono text-xs font-semibold uppercase tracking-wider rounded flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                >
                  {isLoading ? (
                    <span>Authenticating Terminal...</span>
                  ) : (
                    <>
                      <span>Sign In to Terminal</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="relative my-6 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#e8dfda]" />
                </div>
                <div className="relative flex justify-center text-[10px] font-mono tracking-widest uppercase">
                  <span className="bg-white px-3 text-[#78716c]">
                    NEW STAFF ADMINISTRATOR?
                  </span>
                </div>
              </div>

              {/* Activation Box */}
              <div className="p-4 rounded-lg bg-[#fffbeb] border border-[#fed7aa]">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-[#78350f]">
                          ACTIVATE PRE-PROVISIONED ACCOUNT
                        </span>
                        <span className="bg-amber-200/80 text-amber-900 text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase">
                          FIRST-TIME SETUP
                        </span>
                      </div>
                      <p className="text-xs text-[#78350f]/90 mt-1.5 leading-relaxed">
                        Your account is automatically created in the university directory. Verify your Employee ID &amp; company email to receive temporary login credentials.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-3.5 pl-11">
                  <Link
                    href="/activate"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#006e2e] text-[#006e2e] hover:bg-[#eafff1] rounded font-mono text-xs font-semibold tracking-wide transition-colors"
                  >
                    <span>Activate Account via Employee ID</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-neutral-200">
            <div className="flex items-center gap-3 text-amber-800">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <HelpCircle className="w-5 h-5 text-amber-700" />
              </div>
              <h3 className="font-sans font-bold text-lg text-[#1f1a17]">
                Password Reset Policy
              </h3>
            </div>
            <p className="text-xs text-[#3d4640] mt-3 leading-relaxed">
              In accordance with university IT security protocols, self-service password resets are disabled for administrative terminal accounts.
            </p>
            <p className="text-xs text-[#3d4640] mt-2 leading-relaxed">
              If you have lost access to your account or your temporary credentials have expired, please contact the IT Systems Administrator or Human Resources to request a manual credential re-provision.
            </p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="px-4 py-2 bg-[#006e2e] hover:bg-[#005a24] text-white font-mono text-xs uppercase tracking-wider rounded font-medium transition-colors"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Footer */}
      <footer className="w-full bg-white border-t border-[#e5e7eb] px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-[#78716c] gap-3">
          <div>
            BorrowBox &copy; 2024 University IT Logistics System. All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <span className="hover:underline cursor-pointer">Security Policy</span>
            <span>&bull;</span>
            <span className="hover:underline cursor-pointer">Asset Circulation Protocol</span>
            <span>&bull;</span>
            <span className="hover:underline cursor-pointer">IT Operations Dept</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{ backgroundColor: "#e0d8d2" }}
          className="min-h-screen flex items-center justify-center font-mono text-sm text-[#57534e]"
        >
          Loading login portal...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
