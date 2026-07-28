import React, { useState, useRef, useEffect } from "react"

interface ProfileButtonProps {
  onOpenSettings?: () => void
}

export const ProfileButton: React.FC<ProfileButtonProps> = ({ onOpenSettings }) => {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const menuItemStyle: React.CSSProperties = {
    color: "var(--t-text-2)",
  }

  return (
    <div className="relative z-50" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 border px-3 py-1.5 rounded-full shadow-lg transition-colors cursor-pointer theme-transition"
        style={{
          backgroundColor: "var(--t-bg-elevated)",
          borderColor: "var(--t-border)",
          color: "var(--t-text-1)",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--t-bg-hover)" }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--t-bg-elevated)" }}
      >
        <div className="relative w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-inner">
          S
          <span
            className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2"
            style={{
              backgroundColor: "var(--t-success)",
              borderColor: "var(--t-bg-page)",
            }}
          />
        </div>
        <span className="text-xs font-medium pr-1 hidden sm:inline" style={{ color: "var(--t-text-1)" }}>
          Shudharshan
        </span>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          style={{ color: "var(--t-text-3)" }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-56 rounded-2xl shadow-2xl py-2 text-xs theme-transition"
          style={{
            backgroundColor: "var(--t-bg-elevated)",
            border: "1px solid var(--t-border)",
            color: "var(--t-text-1)",
          }}
        >
          <div
            className="px-4 py-3"
            style={{ borderBottom: "1px solid var(--t-border)" }}
          >
            <p className="font-semibold" style={{ color: "var(--t-text-1)" }}>Shudharshan</p>
            <p className="text-[11px] truncate mt-0.5" style={{ color: "var(--t-text-4)" }}>
              shudharshan@movieagent.io
            </p>
          </div>

          <div className="py-1">
            <DropdownItem
              onClick={() => { setIsOpen(false) }}
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              }
              label="View Profile"
              style={menuItemStyle}
            />
            <DropdownItem
              onClick={() => { setIsOpen(false); onOpenSettings?.() }}
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
              label="Account Settings"
              style={menuItemStyle}
            />
          </div>

          <div style={{ borderTop: "1px solid var(--t-border)", paddingTop: "4px" }}>
            <DropdownItem
              onClick={() => setIsOpen(false)}
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              }
              label="Sign Out"
              danger
            />
          </div>
        </div>
      )}
    </div>
  )
}

const DropdownItem: React.FC<{
  onClick: () => void
  icon: React.ReactNode
  label: string
  style?: React.CSSProperties
  danger?: boolean
}> = ({ onClick, icon, label, style, danger }) => (
  <button
    onClick={onClick}
    className="w-full text-left px-4 py-2 flex items-center gap-2.5 transition-colors cursor-pointer theme-transition"
    style={{
      color: danger ? "var(--t-danger)" : "var(--t-text-2)",
      ...style,
    }}
    onMouseEnter={(e) => {
      (e.currentTarget as HTMLButtonElement).style.backgroundColor = danger
        ? "rgba(248,113,113,0.08)"
        : "var(--t-bg-hover)"
    }}
    onMouseLeave={(e) => {
      (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"
    }}
  >
    {icon}
    <span>{label}</span>
  </button>
)

export default ProfileButton
