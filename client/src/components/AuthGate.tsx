import React, { useState } from "react"
import { Clapperboard, Loader2 } from "lucide-react"
import { loginUser, registerUser, storeSession } from "../lib/api"

interface AuthGateProps {
  onAuthenticated: (token: string, email: string) => void
}

export const AuthGate: React.FC<AuthGateProps> = ({ onAuthenticated }) => {
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
      className="min-h-screen w-screen flex items-center justify-center px-4 theme-transition"
      style={{ backgroundColor: "var(--t-bg-page)", color: "var(--t-text-1)" }}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border p-6 shadow-2xl theme-transition"
        style={{ backgroundColor: "var(--t-bg-panel)", borderColor: "var(--t-border)" }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: "var(--t-accent)", color: "var(--t-accent-fg)" }}
          >
            <Clapperboard className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">Movie Agent</h1>
            <p className="text-xs" style={{ color: "var(--t-text-3)" }}>
              {mode === "login" ? "Sign in to your studio" : "Create your director account"}
            </p>
          </div>
        </div>

        <div
          className="grid grid-cols-2 gap-1 p-1 rounded-full mb-5"
          style={{ backgroundColor: "var(--t-bg-input)" }}
        >
          {(["login", "register"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => { setMode(item); setError(null) }}
              className="rounded-full px-3 py-2 text-xs font-semibold transition-colors"
              style={{
                backgroundColor: mode === item ? "var(--t-bg-elevated)" : "transparent",
                color: mode === item ? "var(--t-text-1)" : "var(--t-text-3)",
              }}
            >
              {item === "login" ? "Sign In" : "Register"}
            </button>
          ))}
        </div>

        {mode === "register" && (
          <Field
            label="Full name"
            value={fullName}
            onChange={setFullName}
            autoComplete="name"
          />
        )}
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          required
        />
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
        />

        {error && (
          <div
            className="rounded-xl px-3 py-2 text-xs mb-4"
            style={{ color: "var(--t-danger)", backgroundColor: "rgba(248,113,113,0.08)" }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-11 rounded-full text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-70"
          style={{ backgroundColor: "var(--t-accent)", color: "var(--t-accent-fg)" }}
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {mode === "login" ? "Enter Studio" : "Create Account"}
        </button>
      </form>
    </main>
  )
}

const Field: React.FC<{
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  autoComplete?: string
  required?: boolean
}> = ({ label, value, onChange, type = "text", autoComplete, required }) => (
  <label className="block mb-4 text-xs font-semibold" style={{ color: "var(--t-text-2)" }}>
    <span className="block mb-1.5">{label}</span>
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      autoComplete={autoComplete}
      required={required}
      className="w-full rounded-xl px-3 py-2.5 outline-none focus:ring-2"
      style={{
        backgroundColor: "var(--t-bg-input)",
        border: "1px solid var(--t-border)",
        color: "var(--t-text-1)",
      }}
    />
  </label>
)

export default AuthGate