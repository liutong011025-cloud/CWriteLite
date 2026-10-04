"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { BackButton } from "@/components/ui/back-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Upload, Sparkles, Loader2 } from "lucide-react"
import { toast } from "sonner"

const EMOJI_OPTIONS = ["😊", "🐻", "🦊", "🐱", "🐶", "🦁", "🐰", "🐸", "🦄", "🌟", "🌸", "🌈", "📚", "✏️", "🎨", "🎭"]

interface UserSettingsPageProps {
  userId: string
  onBack: () => void
  onProfileUpdated?: (profile: { avatarUrl?: string | null; avatarEmoji?: string | null }) => void
  /** Back button label, e.g. "Back to Farm" */
  backLabel?: string
}

export default function UserSettingsPage({
  userId,
  onBack,
  onProfileUpdated,
  backLabel = "Back",
}: UserSettingsPageProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarEmoji, setAvatarEmoji] = useState<string | null>(null)
  const [birthday, setBirthday] = useState("")
  const [email, setEmail] = useState("")
  const [grade, setGrade] = useState("")
  const [gender, setGender] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [aiPrompt, setAiPrompt] = useState("")
  const [aiLoading, setAiLoading] = useState(false)

  useEffect(() => {
    fetch(`/api/user-profile?user_id=${userId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) {
          setAvatarUrl(data.avatarUrl ?? null)
          setAvatarEmoji(data.avatarEmoji ?? null)
          setBirthday(data.birthday ?? "")
          setEmail(data.email ?? "")
          setGrade(data.grade ?? "")
          setGender(data.gender ?? "")
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [userId])

  const saveProfile = async (updates: Record<string, string | null>) => {
    setSaving(true)
    try {
      const res = await fetch("/api/user-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, ...updates }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to save")
      if (updates.avatarUrl !== undefined || updates.avatarEmoji !== undefined) {
        onProfileUpdated?.({ avatarUrl: data.avatarUrl ?? undefined, avatarEmoji: data.avatarEmoji ?? undefined })
      }
      if (data?.degraded) {
        toast.warning("Settings saved partially. Database migration is still in progress.")
      } else {
        toast.success("Settings saved!")
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const handleEmojiSelect = (emoji: string) => {
    setAvatarEmoji(emoji)
    setAvatarUrl(null)
    saveProfile({ avatarEmoji: emoji, avatarUrl: null })
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith("image/")) {
      toast.error("Please choose an image file.")
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setAvatarUrl(dataUrl)
      setAvatarEmoji(null)
      saveProfile({ avatarUrl: dataUrl, avatarEmoji: null })
    }
    reader.readAsDataURL(file)
  }

  const handleAiGenerate = async () => {
    const prompt = (aiPrompt || "friendly cartoon avatar, cute character, profile picture").trim()
    setAiLoading(true)
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "image", description: `${prompt}, portrait, face only, avatar style, square, no text`,
          aspect_ratio: "1:1",
          stage: "character",
          user_id: userId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to generate")
      const url = data.imageUrl
      if (url) {
        setAvatarUrl(url)
        setAvatarEmoji(null)
        await saveProfile({ avatarUrl: url, avatarEmoji: null })
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to generate avatar")
    } finally {
      setAiLoading(false)
    }
  }

  const handleSaveForm = () => {
    saveProfile({ birthday: birthday || null, email: email || null, grade: grade || null, gender: gender || null })
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-amber-50 to-purple-50" style={{ paddingTop: "var(--stage-top-padding)" }}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-amber-50/90 via-white to-purple-50/80"
      style={{ paddingTop: "var(--stage-top-padding)", paddingBottom: "var(--stage-bottom-padding)" }}
      data-stage="userSettings"
    >
      <div className="mx-auto max-w-2xl px-4 py-8 pl-16 lg:pl-20">
        <BackButton onClick={onBack} variant="amber" aria-label={backLabel} />

        <div className="space-y-8 rounded-2xl border-2 border-amber-200/60 bg-white/90 p-6 shadow-lg">
          {/* Avatar */}
          <div>
            <Label className="mb-3 block font-hand text-base font-bold text-foreground">Avatar</Label>
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
              <Avatar className="h-24 w-24 rounded-2xl border-2 border-primary/20 shadow-lg">
                <AvatarImage src={avatarUrl || undefined} alt={userId} />
                <AvatarFallback className="rounded-2xl bg-primary/10 text-3xl text-primary">
                  {avatarEmoji || userId.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-4">
                <p className="font-hand text-sm text-muted-foreground">Choose emoji</p>
                <div className="flex flex-wrap gap-2">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleEmojiSelect(emoji)}
                      className={`rounded-xl border-2 p-2 text-2xl transition hover:scale-110 ${
                        avatarEmoji === emoji ? "border-primary bg-primary/10" : "border-amber-200 bg-amber-50/50"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <div>
                  <p className="mb-2 font-hand text-sm text-muted-foreground">Upload image</p>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border-2 border-amber-200 bg-amber-50/50 px-4 py-2 font-hand text-sm transition hover:border-amber-300">
                    <Upload className="h-4 w-4" />
                    Choose file
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                  </label>
                </div>
                <div>
                  <p className="mb-2 font-hand text-sm text-muted-foreground">AI generate (Fal.ai)</p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. cute panda avatar"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      className="rounded-xl border-amber-200 font-hand"
                    />
                    <Button
                      size="sm"
                      onClick={handleAiGenerate}
                      disabled={aiLoading}
                      className="gap-1.5 rounded-xl font-hand"
                    >
                      {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      Generate
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Birthday, Email, Grade, Gender */}
          <div className="space-y-4">
            <Label className="font-hand text-base font-bold text-foreground">Profile</Label>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="mb-1 block font-hand text-sm text-muted-foreground">Birthday</Label>
                <Input
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  className="rounded-xl border-amber-200 font-hand"
                />
              </div>
              <div>
                <Label className="mb-1 block font-hand text-sm text-muted-foreground">Email</Label>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-xl border-amber-200 font-hand"
                />
              </div>
              <div>
                <Label className="mb-1 block font-hand text-sm text-muted-foreground">Grade</Label>
                <Input
                  placeholder="e.g. Grade 5"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="rounded-xl border-amber-200 font-hand"
                />
              </div>
              <div>
                <Label className="mb-1 block font-hand text-sm text-muted-foreground">Gender</Label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 font-hand text-sm"
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <Button onClick={handleSaveForm} disabled={saving} className="mt-2 rounded-xl font-hand">
              {saving ? "Saving..." : "Save profile"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
