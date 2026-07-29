import React, { useState } from "react"
import { Loader2 } from "lucide-react"
import { loginUser, registerUser, storeSession } from "../lib/api"

interface AuthGateProps {
  onAuthenticated: (token: string, email: string) => void
  onBackToLanding?: () => void
}

export const AuthGate: React.FC<AuthGateProps> = ({ onAuthenticated, onBackToLanding }) => {
  const [mode, setMode] = useState<"login" | "register">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      if (mode === "register") {
        await registerUser({ email, password, fullName })
      }
      const token = await loginUser({ email, password })
      storeSession(token, email)
      onAuthenticated(token, email)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main
      className="min-h-screen w-full flex flex-col justify-between p-4 sm:p-6 md:p-10 theme-transition overflow-y-auto select-none"
      style={{ backgroundColor: "var(--t-bg-page)", color: "var(--t-text-1)" }}
    >
      {/* Top Header Navigation */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between py-2 mb-4">
        {onBackToLanding ? (
          <button
            onClick={onBackToLanding}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer hover:shadow-md theme-transition"
            style={{
              backgroundColor: "var(--t-bg-elevated)",
              borderColor: "var(--t-border)",
              color: "var(--t-text-2)",
            }}
          >
            <span>← Back to Home</span>
          </button>
        ) : <div />}
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm tracking-tight">Movie Agent Studio</span>
        </div>
      </header>

      {/* Main Container */}
      <div className="w-full max-w-4xl mx-auto my-auto min-h-[580px] rounded-3xl border shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 theme-transition"
        style={{ backgroundColor: "var(--t-bg-panel)", borderColor: "var(--t-border)" }}
      >
        {/* Left Visual Column */}
        <div
          className="md:col-span-5 p-8 md:p-12 flex flex-col justify-between relative overflow-hidden theme-transition"
          style={{
            backgroundColor: "var(--t-bg-surface)",
            borderRight: "1px solid var(--t-border)",
          }}
        >
          {/* Subtle Ambient Background Lighting */}
          <div
            className="absolute -top-16 -left-16 w-64 h-64 rounded-full blur-3xl opacity-10 pointer-events-none"
            style={{ backgroundColor: "var(--t-accent)" }}
          />

          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border tracking-wide uppercase"
              style={{ backgroundColor: "var(--t-bg-elevated)", borderColor: "var(--t-border)", color: "var(--t-text-2)" }}
            >
              <span>Multi-Agent AI Studio</span>
            </div>

            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight leading-tight mb-4">
                Direct your next masterpiece with AI agents
              </h2>
              <p className="text-xs md:text-sm leading-relaxed mb-6" style={{ color: "var(--t-text-3)" }}>
                Turn film ideas and loglines into complete pre-production packages — formatted screenplays, character matrices, media moodboards, and crew notices.
              </p>
            </div>
          </div>

          {/* Bottom Left Content Block */}
          <div className="relative z-10 space-y-5 pt-6 border-t" style={{ borderColor: "var(--t-border)" }}>


            <div className="p-4 rounded-2xl border text-xs leading-relaxed space-y-1"
              style={{ backgroundColor: "var(--t-bg-elevated)", borderColor: "var(--t-border)", color: "var(--t-text-2)" }}
            >
              <div className="font-bold text-xs" style={{ color: "var(--t-text-1)" }}>Complete Studio Package</div>
              <p style={{ color: "var(--t-text-3)" }}>
                Automated scene breakdown, character roster matrices, royalty-free stock asset sourcing, and crew job postings.
              </p>
            </div>

            <div className="pt-2 text-[11px]" style={{ color: "var(--t-text-4)" }}>
              Need help? Contact studio support or read system docs.
            </div>
          </div>
        </div>

        {/* Right Form Column */}
        <div className="md:col-span-7 p-8 md:p-12 flex flex-col justify-center">
          <div className="mb-6">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight mb-1">
              {mode === "login" ? "Welcome back, Director" : "Create Director Account"}
            </h1>
            <p className="text-xs md:text-sm" style={{ color: "var(--t-text-3)" }}>
              {mode === "login"
                ? "Enter your credentials to access your studio workspace."
                : "Sign up to start creating projects and dispatching agents."}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div
            className="grid grid-cols-2 gap-1 p-1 rounded-2xl mb-6"
            style={{ backgroundColor: "var(--t-bg-input)", border: "1px solid var(--t-border)" }}
          >
            {(["login", "register"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setMode(item)
                  setError(null)
                }}
                className="rounded-xl px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer"
                style={{
                  backgroundColor: mode === item ? "var(--t-bg-elevated)" : "transparent",
                  color: mode === item ? "var(--t-text-1)" : "var(--t-text-3)",
                  boxShadow: mode === item ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
                }}
              >
                {item === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-5">
            {mode === "register" && (
              <Field
                label="Full Name"
                placeholder="e.g. Christopher Nolan"
                value={fullName}
                onChange={setFullName}
                autoComplete="name"
              />
            )}
            <Field
              label="Email Address"
              type="email"
              placeholder="director@studio.com"
              value={email}
              onChange={setEmail}
              autoComplete="email"
              required
            />
            <Field
              label="Password"
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={setPassword}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
            />

            {error && (
              <div
                className="rounded-2xl px-4 py-3 text-xs border font-medium"
                style={{
                  color: "var(--t-danger)",
                  backgroundColor: "rgba(248,113,113,0.08)",
                  borderColor: "rgba(248,113,113,0.2)",
                }}
              >
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl cursor-pointer disabled:opacity-70 mt-3"
              style={{ backgroundColor: "var(--t-accent)", color: "var(--t-accent-fg)" }}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === "login" ? "Sign In to Studio" : "Create Account & Start"}
            </button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto py-2 text-center text-xs" style={{ color: "var(--t-text-4)" }}>
        © 2026 Movie Agent Platform. Secure director authentication.
      </footer>
    </main>
  )
}

const Field: React.FC<{
  label: string
  value: string
  placeholder?: string
  onChange: (value: string) => void
  type?: string
  autoComplete?: string
  required?: boolean
}> = ({ label, value, placeholder, onChange, type = "text", autoComplete, required }) => (
  <label className="block text-xs font-semibold space-y-1.5" style={{ color: "var(--t-text-2)" }}>
    <span>{label}</span>
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      autoComplete={autoComplete}
      required={required}
      className="w-full rounded-2xl px-4 py-3.5 text-sm outline-none focus:ring-2 transition-all theme-transition"
      style={{
        backgroundColor: "var(--t-bg-input)",
        border: "1px solid var(--t-border)",
        color: "var(--t-text-1)",
      }}
    />
  </label>
)

export default AuthGate