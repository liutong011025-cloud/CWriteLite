"use client"

import React, { useEffect, useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import SpotlightCard from "@/components/ui/spotlight-card"
import { REGISTRATION_ENABLED, REGISTRATION_DISABLED_MESSAGE } from "@/lib/auth-config"

interface LoginUser {
  username: string
  role: "teacher" | "student"
  noAi?: boolean
  // 文案專用帳號標記（copywriting）
  isCopywriter?: boolean
}

interface LoginPageProps {
  onLogin: (user: LoginUser, showContinueDialog?: boolean) => void
}

// 新用户注册开关（学生 + 教师）
const TEACHER_REGISTRATION_ENABLED = true
const LOGIN_BACKGROUND_SRC = "/Background1.webp"

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [mode, setMode] = useState<"login" | "register">("login")
  const [selectedRole] = useState<"teacher" | "student" | null>("student")
  const [username, setUsername] = useState("")
  const [registerName, setRegisterName] = useState("")
  const [registerEmail, setRegisterEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [bgReady, setBgReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    const img = new window.Image()
    const markReady = () => {
      if (!cancelled) setBgReady(true)
    }
    img.onload = markReady
    img.onerror = markReady
    img.src = LOGIN_BACKGROUND_SRC
    if (img.complete && img.naturalWidth > 0) {
      markReady()
    }
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const warmAudioCache = () => {
      const audioSources = [
        "/farm-halloween-goblin-2026.mp3",
        "/soundreality-finger-snap-179180.mp3",
      ]

      audioSources.forEach((src) => {
        try {
          const audio = new Audio(src)
          audio.preload = "auto"
          audio.load?.()
        } catch {
          // ignore preload failures on unsupported browsers
        }
      })
    }

    if (typeof window === "undefined") return

    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(warmAudioCache, { timeout: 1500 })
      return () => window.cancelIdleCallback(idleId)
    }

    const timeoutId = globalThis.setTimeout(warmAudioCache, 300)
    return () => globalThis.clearTimeout(timeoutId)
  }, [])

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      toast.error("Please enter both username and password")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      })

      if (!response.ok) {
        // 如果响应不成功，尝试读取错误信息
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }))
        toast.error(errorData.error || errorData.hint || `Login failed (${response.status})`)
        return
      }

      const data = await response.json()

      if (data.success) {
        toast.success(`Welcome, ${data.user.username}!`)
        // 传递 true 表示需要显示继续作品对话框
        onLogin(data.user, true)
      } else {
        toast.error(data.error || "Login failed")
      }
    } catch (error) {
      console.error("Login error:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      toast.error(`Login failed: ${errorMessage}. Please check if the server is running.`)
    } finally {
      setIsLoading(false)
    }
  }

  const registrationAllowed =
    REGISTRATION_ENABLED && (selectedRole !== "teacher" || TEACHER_REGISTRATION_ENABLED)

  const handleRegister = async () => {
    if (!REGISTRATION_ENABLED) {
      toast.error(REGISTRATION_DISABLED_MESSAGE)
      return
    }

    if (selectedRole === "teacher" && !TEACHER_REGISTRATION_ENABLED) {
      toast.error("Teacher registration is not available.")
      return
    }

    if (!selectedRole) {
      toast.error("Please choose Teacher or Student first")
      return
    }

    if (!registerName.trim() || !registerEmail.trim() || !password.trim()) {
      toast.error("Please enter your name, email, and password")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "register",
          name: registerName,
          email: registerEmail,
          password,
          role: selectedRole,
        }),
      })

      const data = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }))

      if (!response.ok || !data.success) {
        toast.error(data.error || data.hint || `Register failed (${response.status})`)
        return
      }

      if (data.user.role !== selectedRole) {
        toast.error(
          selectedRole === "teacher"
            ? "This account was not created as a teacher account."
            : "This account was not created as a student account.",
        )
        return
      }

      toast.success(`Welcome, ${data.user.username}! Your account is ready.`)
      onLogin(data.user, false)
    } catch (error) {
      console.error("Register error:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      toast.error(`Register failed: ${errorMessage}. Please check if the server is running.`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="login-page"
      data-login-page
    >
      <style>{`
        @keyframes login-cagent-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
      `}</style>

      {!bgReady && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#8ec8ea]">
          <img
            src="/Cagentsit.webp"
            alt="Cagent"
            className="h-48 w-48 object-contain drop-shadow-lg sm:h-56 sm:w-56"
            style={{ animation: "login-cagent-bob 1.4s ease-in-out infinite" }}
            draggable={false}
          />
          <div
            className="mt-5 h-10 w-10 animate-spin rounded-full border-4 border-white/45 border-t-white"
            aria-label="Loading"
          />
        </div>
      )}

      {bgReady && (
      <div
        className="login-auth-wrap"
      >
        <SpotlightCard className="login-auth-card" spotlightColor="rgba(255, 221, 161, 0.12)">
          {(
            <>
              <div className="login-card-intro">
                <div className="login-brand">
                  <Image
                    src="/cwrite-lite-logo.webp"
                    alt="CWrite Logo"
                    width={640}
                    height={390}
                    className="login-brand-image"
                    priority
                  />
                </div>
                <h1 className="login-heading">
                  {mode === "login" ? "Log in to start writing" : "Register to begin your creative journey"}
                </h1>
              </div>

              <form className="login-auth-form" onSubmit={(event) => {
                event.preventDefault()
                if (!isLoading) void (mode === "login" ? handleLogin() : handleRegister())
              }}>
                {mode === "login" ? (
                  <>
                <div>
                  <label htmlFor="login-username" className="block text-sm font-bold mb-2 text-white">Username</label>
                  <Input
                    id="login-username"
                    name="username"
                    autoComplete="username"
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="text-base py-3 border-2 border-amber-100 focus:border-lime-700 rounded-xl bg-white/80 focus:bg-white text-gray-900"
                  />
                </div>

                <div>
                  <label htmlFor="login-password" className="block text-sm font-bold mb-2 text-white">Password</label>
                  <Input
                    id="login-password"
                    name="password"
                    autoComplete="current-password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="text-base py-3 border-2 border-amber-100 focus:border-lime-700 rounded-xl bg-white/80 focus:bg-white text-gray-900"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-[#c9a573] to-[#a77d4d] hover:from-[#d5b484] hover:to-[#b38a57] text-white border-0 shadow-xl py-6 text-lg font-bold disabled:opacity-50"
                >
                  {isLoading ? "Logging in..." : "Log in"}
                </Button>

                {registrationAllowed ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMode("register")
                      setPassword("")
                    }}
                    className="w-full rounded-xl border border-white/40 bg-white/10 py-3 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/20"
                  >
                    Create a new {selectedRole === "teacher" ? "teacher" : "student"} account
                  </button>
                ) : (
                  <p className="login-registration-notice">
                    {!REGISTRATION_ENABLED ? REGISTRATION_DISABLED_MESSAGE : "Teacher registration is not available."}
                  </p>
                )}
                  </>
                ) : (
                  <>
                <div>
                  <label htmlFor="register-email" className="block text-sm font-bold mb-2 text-white">Email</label>
                  <Input
                    id="register-email"
                    name="email"
                    autoComplete="email"
                    type="email"
                    placeholder="Enter your email"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    className="text-base py-3 border-2 border-cyan-200 focus:border-cyan-500 rounded-xl bg-white/80 focus:bg-white text-gray-900"
                  />
                </div>

                <div>
                  <label htmlFor="register-name" className="block text-sm font-bold mb-2 text-white">Name</label>
                  <Input
                    id="register-name"
                    name="name"
                    autoComplete="name"
                    type="text"
                    placeholder="Enter your name"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    className="text-base py-3 border-2 border-amber-100 focus:border-lime-700 rounded-xl bg-white/80 focus:bg-white text-gray-900"
                  />
                </div>

                <div>
                  <label htmlFor="register-password" className="block text-sm font-bold mb-2 text-white">Password</label>
                  <Input
                    id="register-password"
                    name="password"
                    autoComplete="new-password"
                    type="password"
                    placeholder="Create your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="text-base py-3 border-2 border-amber-100 focus:border-lime-700 rounded-xl bg-white/80 focus:bg-white text-gray-900"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-[#9d87b4] to-[#82689b] hover:from-[#ac97bf] hover:to-[#9177a9] text-white border-0 shadow-xl py-6 text-lg font-bold disabled:opacity-50"
                >
                  {isLoading ? "Creating account..." : "✨ Register"}
                </Button>

                <button
                  type="button"
                  onClick={() => {
                    setMode("login")
                    setUsername(registerName)
                    setPassword("")
                  }}
                  className="w-full rounded-xl border border-white/40 bg-white/10 py-3 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/20"
                >
                  Back to login
                </button>
                  </>
                )}
              </form>
            </>
          )}
        </SpotlightCard>
      </div>
      )}
    </div>
  )
}
