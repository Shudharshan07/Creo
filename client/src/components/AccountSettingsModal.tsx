import React, { useState, useEffect, useCallback } from "react"
import {
  X,
  User,
  Palette,
  Shield,
  Keyboard,
  Moon,
  Sun,
  Monitor,
  LogOut,
  Camera,
  Bell,
} from "lucide-react"
import { useTheme, type Theme } from "../context/ThemeContext"

interface AccountSettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

type Section = "profile" | "appearance" | "notifications" | "privacy" | "shortcuts"

const NAV_ITEMS: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: "profile", label: "Profile", icon: <User className="w-4 h-4" /> },
  { id: "appearance", label: "Appearance", icon: <Palette className="w-4 h-4" /> },
  { id: "notifications", label: "Notifications", icon: <Bell className="w-4 h-4" /> },
  { id: "privacy", label: "Privacy & Security", icon: <Shield className="w-4 h-4" /> },
  { id: "shortcuts", label: "Keyboard Shortcuts", icon: <Keyboard className="w-4 h-4" /> },
]

const SHORTCUTS = [
  { keys: ["Ctrl", "K"], desc: "Open command palette" },
  { keys: ["Ctrl", "Z"], desc: "Undo last action" },
  { keys: ["Ctrl", "Shift", "Z"], desc: "Redo" },
  { keys: ["Space"], desc: "Pan canvas (hold)" },
  { keys: ["Ctrl", "+"], desc: "Zoom in" },
  { keys: ["Ctrl", "-"], desc: "Zoom out" },
  { keys: ["Ctrl", "0"], desc: "Reset zoom" },
  { keys: ["Escape"], desc: "Close / deselect" },
]

export const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [section, setSection] = useState<Section>("appearance")
  const { theme, setTheme } = useTheme()

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [isOpen, onClose])

  // Trap scroll
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden"
    else document.body.style.overflow = ""
    return () => { document.body.style.overflow = "" }
  }, [isOpen])

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose()
    },
    [onClose]
  )

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={handleBackdropClick}
    >
      {/* Modal container */}
      <div
        className="relative w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex theme-transition"
        style={{
          backgroundColor: "var(--t-bg-page)",
          border: "1px solid var(--t-border)",
          maxHeight: "min(680px, 90vh)",
          height: "min(680px, 90vh)",
        }}
      >
        {/* ── Left Sidebar ── */}
        <aside
          className="w-56 flex-shrink-0 flex flex-col py-6 px-3 theme-transition"
          style={{
            backgroundColor: "var(--t-bg-panel)",
            borderRight: "1px solid var(--t-border)",
          }}
        >
          {/* Header */}
          <div className="px-3 mb-6">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--t-text-4)" }}>
              Settings
            </p>
          </div>

          {/* Nav */}
          <nav className="flex-1 space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const active = section === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setSection(item.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer theme-transition"
                  style={{
                    backgroundColor: active ? "var(--t-bg-selected)" : "transparent",
                    color: active ? "var(--t-text-1)" : "var(--t-text-3)",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--t-bg-hover)"
                  }}
                  onMouseLeave={(e) => {
                    if (!active) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"
                  }}
                >
                  {item.icon}
                  {item.label}
                </button>
              )
            })}
          </nav>

          {/* Sign out */}
          <button
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer mt-4"
            style={{ color: "var(--t-danger)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--t-bg-hover)" }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent" }}
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </aside>

        {/* ── Right Content ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top bar with close */}
          <div
            className="flex items-center justify-between px-8 py-5 flex-shrink-0 theme-transition"
            style={{ borderBottom: "1px solid var(--t-border)" }}
          >
            <h2 className="text-base font-semibold" style={{ color: "var(--t-text-1)" }}>
              {NAV_ITEMS.find((n) => n.id === section)?.label}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer theme-transition"
              style={{ color: "var(--t-text-3)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--t-bg-hover)" }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent" }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-6">
            {section === "profile" && <ProfileSection />}
            {section === "appearance" && <AppearanceSection theme={theme} setTheme={setTheme} />}
            {section === "notifications" && <NotificationsSection />}
            {section === "privacy" && <PrivacySection />}
            {section === "shortcuts" && <ShortcutsSection />}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Profile Section ────────────────────────────────────────────────── */
const ProfileSection: React.FC = () => {
  const [displayName, setDisplayName] = useState("Shudharshan")
  const [email] = useState("shudharshan@movieagent.io")
  const [bio, setBio] = useState("")

  return (
    <div className="space-y-8">
      {/* Avatar */}
      <div className="flex items-center gap-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
            S
          </div>
          <button
            className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full flex items-center justify-center shadow-lg transition-colors cursor-pointer theme-transition"
            style={{ backgroundColor: "var(--t-bg-elevated)", border: "1px solid var(--t-border)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--t-bg-hover)" }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--t-bg-elevated)" }}
          >
            <Camera className="w-3.5 h-3.5" style={{ color: "var(--t-text-3)" }} />
          </button>
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--t-text-1)" }}>{displayName}</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--t-text-4)" }}>{email}</p>
          <p className="text-xs mt-2" style={{ color: "var(--t-text-3)" }}>Click the camera to upload a new photo</p>
        </div>
      </div>

      {/* Fields */}
      <div className="space-y-4">
        <Field label="Display Name">
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none theme-transition"
            style={{
              backgroundColor: "var(--t-bg-input)",
              border: "1px solid var(--t-border)",
              color: "var(--t-text-1)",
            }}
          />
        </Field>
        <Field label="Email Address">
          <input
            value={email}
            readOnly
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none cursor-not-allowed opacity-60 theme-transition"
            style={{
              backgroundColor: "var(--t-bg-input)",
              border: "1px solid var(--t-border)",
              color: "var(--t-text-1)",
            }}
          />
        </Field>
        <Field label="Bio">
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder="Tell us about yourself..."
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none theme-transition"
            style={{
              backgroundColor: "var(--t-bg-input)",
              border: "1px solid var(--t-border)",
              color: "var(--t-text-1)",
            }}
          />
        </Field>
      </div>

      <SaveButton />
    </div>
  )
}

/* ─── Appearance Section ─────────────────────────────────────────────── */
const AppearanceSection: React.FC<{ theme: Theme; setTheme: (t: Theme) => void }> = ({
  theme,
  setTheme,
}) => {
  const themes: { id: Theme; label: string; icon: React.ReactNode; preview: string }[] = [
    {
      id: "dark",
      label: "Dark",
      icon: <Moon className="w-4 h-4" />,
      preview: "dark",
    },
    {
      id: "light",
      label: "Light",
      icon: <Sun className="w-4 h-4" />,
      preview: "light",
    },
    {
      id: "system",
      label: "System",
      icon: <Monitor className="w-4 h-4" />,
      preview: "system",
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--t-text-1)" }}>
          Theme
        </h3>
        <p className="text-xs mb-5" style={{ color: "var(--t-text-4)" }}>
          Choose how Movie Agent looks to you.
        </p>

        <div className="grid grid-cols-3 gap-3">
          {themes.map((t) => {
            const active = theme === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className="flex flex-col gap-3 rounded-2xl p-3 cursor-pointer transition-all theme-transition"
                style={{
                  border: active
                    ? "2px solid var(--t-accent)"
                    : "2px solid var(--t-border)",
                  backgroundColor: "var(--t-bg-elevated)",
                }}
              >
                {/* Mini preview */}
                <div
                  className="w-full h-20 rounded-xl overflow-hidden flex-shrink-0"
                  style={{
                    backgroundColor:
                      t.preview === "dark"
                        ? "#0B0C10"
                        : t.preview === "light"
                        ? "#f0f2f5"
                        : "linear-gradient(135deg, #0B0C10 50%, #f0f2f5 50%)",
                    background:
                      t.preview === "system"
                        ? "linear-gradient(135deg, #0B0C10 50%, #f0f2f5 50%)"
                        : undefined,
                  }}
                >
                  {/* Mock UI inside preview */}
                  <div className="p-2 h-full flex flex-col gap-1.5">
                    <div
                      className="h-2 rounded-full w-3/4"
                      style={{
                        backgroundColor: t.preview === "dark" ? "#1e1f23" : t.preview === "light" ? "#ffffff" : "#1e1f23",
                        opacity: 0.9,
                      }}
                    />
                    <div
                      className="h-1.5 rounded-full w-1/2"
                      style={{
                        backgroundColor: t.preview === "dark" ? "#28292d" : t.preview === "light" ? "#eaecf0" : "#28292d",
                        opacity: 0.7,
                      }}
                    />
                    <div className="flex-1" />
                    <div
                      className="h-4 rounded-lg w-full"
                      style={{
                        backgroundColor: t.preview === "dark" ? "#1e1f23" : t.preview === "light" ? "#ffffff" : "#1e1f23",
                        opacity: 0.8,
                      }}
                    />
                  </div>
                </div>

                {/* Label */}
                <div className="flex items-center gap-2">
                  <span style={{ color: active ? "var(--t-accent)" : "var(--t-text-3)" }}>
                    {t.icon}
                  </span>
                  <span
                    className="text-xs font-medium"
                    style={{ color: active ? "var(--t-text-1)" : "var(--t-text-3)" }}
                  >
                    {t.label}
                  </span>
                  {active && (
                    <span
                      className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: "var(--t-accent)", color: "var(--t-accent-fg)" }}
                    >
                      ON
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Accent info */}
      <div
        className="rounded-2xl p-4 theme-transition"
        style={{ backgroundColor: "var(--t-bg-elevated)", border: "1px solid var(--t-border)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex-shrink-0"
            style={{ backgroundColor: "var(--t-accent)" }}
          />
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--t-text-1)" }}>
              Accent Color
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--t-text-4)" }}>
              Used for highlights, active states, and focus rings.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Notifications Section ──────────────────────────────────────────── */
const NotificationsSection: React.FC = () => {
  const [prefs, setPrefs] = useState({
    projectUpdates: true,
    teamMentions: true,
    systemAlerts: false,
    weeklyDigest: true,
  })

  const toggle = (key: keyof typeof prefs) =>
    setPrefs((p) => ({ ...p, [key]: !p[key] }))

  const items = [
    { key: "projectUpdates" as const, label: "Project updates", desc: "When a collaborator makes changes" },
    { key: "teamMentions" as const, label: "Team mentions", desc: "When someone @mentions you" },
    { key: "systemAlerts" as const, label: "System alerts", desc: "Maintenance and downtime notices" },
    { key: "weeklyDigest" as const, label: "Weekly digest", desc: "Summary of your activity" },
  ]

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.key}
          className="flex items-center justify-between p-4 rounded-2xl theme-transition"
          style={{ backgroundColor: "var(--t-bg-elevated)", border: "1px solid var(--t-border)" }}
        >
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--t-text-1)" }}>{item.label}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--t-text-4)" }}>{item.desc}</p>
          </div>
          <Toggle active={prefs[item.key]} onToggle={() => toggle(item.key)} />
        </div>
      ))}
    </div>
  )
}

/* ─── Privacy Section ────────────────────────────────────────────────── */
const PrivacySection: React.FC = () => {
  const [publicProfile, setPublicProfile] = useState(false)
  const [analyticsConsent, setAnalyticsConsent] = useState(true)

  return (
    <div className="space-y-5">
      <div
        className="flex items-center justify-between p-4 rounded-2xl theme-transition"
        style={{ backgroundColor: "var(--t-bg-elevated)", border: "1px solid var(--t-border)" }}
      >
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--t-text-1)" }}>Public Profile</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--t-text-4)" }}>Others can find and view your profile</p>
        </div>
        <Toggle active={publicProfile} onToggle={() => setPublicProfile((v) => !v)} />
      </div>

      <div
        className="flex items-center justify-between p-4 rounded-2xl theme-transition"
        style={{ backgroundColor: "var(--t-bg-elevated)", border: "1px solid var(--t-border)" }}
      >
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--t-text-1)" }}>Usage Analytics</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--t-text-4)" }}>Help improve Movie Agent with anonymous data</p>
        </div>
        <Toggle active={analyticsConsent} onToggle={() => setAnalyticsConsent((v) => !v)} />
      </div>

      {/* Danger zone */}
      <div
        className="p-4 rounded-2xl space-y-3 theme-transition"
        style={{ backgroundColor: "var(--t-bg-elevated)", border: "1px solid var(--t-border)" }}
      >
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--t-danger)" }}>
          Danger Zone
        </p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--t-text-1)" }}>Delete Account</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--t-text-4)" }}>Permanently delete your account and all data</p>
          </div>
          <button
            className="px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            style={{
              backgroundColor: "rgba(248, 113, 113, 0.1)",
              color: "var(--t-danger)",
              border: "1px solid rgba(248, 113, 113, 0.3)",
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Shortcuts Section ──────────────────────────────────────────────── */
const ShortcutsSection: React.FC = () => (
  <div className="space-y-2">
    {SHORTCUTS.map((s, i) => (
      <div
        key={i}
        className="flex items-center justify-between py-3 px-4 rounded-xl theme-transition"
        style={{
          backgroundColor: i % 2 === 0 ? "var(--t-bg-elevated)" : "transparent",
          border: "1px solid transparent",
        }}
      >
        <span className="text-sm" style={{ color: "var(--t-text-2)" }}>{s.desc}</span>
        <div className="flex items-center gap-1">
          {s.keys.map((k, j) => (
            <React.Fragment key={j}>
              <kbd
                className="px-2 py-1 rounded-lg text-xs font-mono font-semibold theme-transition"
                style={{
                  backgroundColor: "var(--t-bg-input)",
                  border: "1px solid var(--t-border)",
                  color: "var(--t-text-1)",
                }}
              >
                {k}
              </kbd>
              {j < s.keys.length - 1 && (
                <span className="text-xs" style={{ color: "var(--t-text-4)" }}>+</span>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    ))}
  </div>
)

/* ─── Shared UI Atoms ────────────────────────────────────────────────── */
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--t-text-3)" }}>
      {label}
    </label>
    {children}
  </div>
)

const SaveButton: React.FC = () => (
  <button
    className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
    style={{ backgroundColor: "var(--t-accent)", color: "var(--t-accent-fg)" }}
  >
    Save Changes
  </button>
)

const Toggle: React.FC<{ active: boolean; onToggle: () => void }> = ({ active, onToggle }) => (
  <button
    onClick={onToggle}
    className="relative w-11 h-6 rounded-full flex-shrink-0 transition-colors cursor-pointer"
    style={{ backgroundColor: active ? "var(--t-accent)" : "var(--t-bg-hover)" }}
  >
    <span
      className="absolute top-0.5 w-5 h-5 rounded-full shadow transition-all"
      style={{
        left: active ? "calc(100% - 1.375rem)" : "0.125rem",
        backgroundColor: active ? "var(--t-accent-fg)" : "var(--t-text-3)",
      }}
    />
  </button>
)

export default AccountSettingsModal
