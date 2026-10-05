"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { BackButton } from "@/components/ui/back-button"
import {
  BookOpen,
  FileText,
  Flag,
  Mail,
  MessageCircle,
  User as UserIcon,
  Settings,
  Sparkles,
  Theater,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import FarmScene from "@/components/lite/farm-scene"
import FarmGuide from "@/components/lite/farm-guide"
import {farmValueMeaning, farmValueLabel} from "@/components/lite/farm-values"
import {FARM_SAPLING_SLOTS} from "@/lib/farm-slots"

export interface WorkItem {
  id: string
  type: "story" | "review" | "letter" | "drama"
  title: string
  content: string
  timestamp: number
  interactionId?: string
}

export interface ReviewItem {
  id: string
  workType: string
  workTitle: string | null
  workContent: string | null
  reviewerUsername: string
  reviewerRole: string
  content: string
  readAt: number | null
  createdAt: number
}

/** 單棵樹的成長記錄（與 page 的 TreeGrowthDetail 一致） */
export interface TreeGrowthDetailRecord {
  workTitle: string
  workType: "story" | "review" | "letter" | "drama"
  excerpt: string
  triggerSentence?: string
  overallEvidence?: string
  reason?: string
  timestamp: number
}

interface OtherMapFlagItem {
  id: string
  x: number
  y: number
  title: string
  content?: string
  workType?: string
}

interface OtherMapChapterState {
  mapImageUrl: string
  mapFlags: OtherMapFlagItem[]
  currentPin: { x: number; y: number } | null
}

interface OtherMapChaptersState {
  activeChapterIndex: number
  chapters: OtherMapChapterState[]
}

const TREE_DIMENSION_NAMES: Record<number, string> = {
  1: "Perseverance",
  2: "Respect for Others",
  3: "Responsibility",
  4: "National Identity",
  5: "Commitment",
  6: "Integrity",
  7: "Benevolence",
  8: "Law-abidingness",
  9: "Empathy",
  10: "Diligence",
  11: "Filial Piety",
  12: "Unity",
}

interface UserProfilePageProps {
  userId: string
  userRole: string
  currentUsername?: string
  currentUserRole?: string
  avatarUrl?: string | null
  avatarEmoji?: string | null
  onBack: () => void
  onOpenSettings: () => void
  trees?: { id: number; stage: number }[] | null
  treeGrowthDetails?: Record<number, TreeGrowthDetailRecord[]>
  recentGrowthTreeId?: number | null
  recentGrowthTreeIds?: number[]
  farmEntryNonce?: number
  onVisitOthersFarm?: () => void
  onEditStory?: (storyId: string) => void
  isOtherFarm?: boolean
}

type FarmElementId = "farmbacktomap" | "farmsetting" | "farmwrittingboard" | "vistothersfarm" | "theirmap"

interface FarmElementConfig {
  id: FarmElementId
  label: string
  imageSrc: string
  baseWidthPercent?: number
  useNaturalAspect?: boolean
}

/** 與 object-cover 背景對齊的 overlay 矩形（px），overlay 內 % 即為背景圖上的相對位置/大小 */
interface CoverOverlayRect {
  width: number
  height: number
  left: number
  top: number
}

interface FarmElementState {
  x: number
  y: number
  scale: number
}

const getDefaultMapImageForChapter = (chapterIndex: number) => (chapterIndex > 0 ? "/secondmap.webp" : "/firstmap.webp")

const normalizeOtherMapFlag = (raw: unknown, index: number): OtherMapFlagItem | null => {
  if (!raw || typeof raw !== "object") return null
  const source = raw as Partial<OtherMapFlagItem>
  return {
    id: typeof source.id === "string" && source.id.trim() ? source.id : `flag-${index}`,
    x: typeof source.x === "number" ? source.x : 50,
    y: typeof source.y === "number" ? source.y : 50,
    title: typeof source.title === "string" && source.title.trim() ? source.title : "Writing Journey",
    content: typeof source.content === "string" ? source.content : undefined,
    workType: typeof source.workType === "string" ? source.workType : undefined,
  }
}

const normalizeOtherMapChapter = (raw: unknown, chapterIndex: number): OtherMapChapterState => {
  if (!raw || typeof raw !== "object") {
    return {
      mapImageUrl: getDefaultMapImageForChapter(chapterIndex),
      mapFlags: [],
      currentPin: null,
    }
  }

  const source = raw as Partial<OtherMapChapterState>
  return {
    mapImageUrl:
      typeof source.mapImageUrl === "string" && source.mapImageUrl.trim()
        ? source.mapImageUrl
        : getDefaultMapImageForChapter(chapterIndex),
    mapFlags: Array.isArray(source.mapFlags)
      ? source.mapFlags
          .map((flag, index) => normalizeOtherMapFlag(flag, index))
          .filter((flag): flag is OtherMapFlagItem => flag != null)
      : [],
    currentPin:
      source.currentPin &&
      typeof source.currentPin === "object" &&
      typeof source.currentPin.x === "number" &&
      typeof source.currentPin.y === "number"
        ? source.currentPin
        : null,
  }
}

const normalizeOtherMapState = (raw: unknown): OtherMapChaptersState => {
  if (!raw || typeof raw !== "object") {
    return {
      activeChapterIndex: 0,
      chapters: [normalizeOtherMapChapter(null, 0)],
    }
  }

  const source = raw as { activeChapterIndex?: unknown; chapters?: unknown[] }
  if (Array.isArray(source.chapters) && source.chapters.length > 0) {
    const chapters = source.chapters.map((chapter, index) => normalizeOtherMapChapter(chapter, index))
    const requestedIndex =
      typeof source.activeChapterIndex === "number" && Number.isFinite(source.activeChapterIndex)
        ? Math.max(0, Math.floor(source.activeChapterIndex))
        : 0
    return {
      activeChapterIndex: Math.min(requestedIndex, chapters.length - 1),
      chapters,
    }
  }

  return {
    activeChapterIndex: 0,
    chapters: [normalizeOtherMapChapter(raw, 0)],
  }
}

const getDefaultFarmButtonStates = (otherFarm: boolean): Record<FarmElementId, FarmElementState> => ({
  farmbacktomap: otherFarm ? { x: 74, y: 44.6, scale: 0.75 } : { x: 74, y: 40.9, scale: 0.42 },
  farmsetting: otherFarm ? { x: 34.1, y: 49.6, scale: 0.8 } : { x: 34.3, y: 49.5, scale: 0.8 },
  farmwrittingboard: otherFarm ? { x: 62.8, y: 50.5, scale: 1.1 } : { x: 62.9, y: 51, scale: 1.15 },
  vistothersfarm: otherFarm ? { x: 73.2, y: 35.4, scale: 0.81 } : { x: 72.9, y: 33.5, scale: 0.38 },
  theirmap: otherFarm ? { x: 34.5, y: 48.7, scale: 0.42 } : { x: 34.5, y: 48.7, scale: 0.42 },
})

const FARM_LAYOUT_STORAGE_PREFIX = "cwrite-farm-button-layout-v2"

const farmLayoutStorageKey = (otherFarm: boolean) =>
  `${FARM_LAYOUT_STORAGE_PREFIX}:${otherFarm ? "other" : "own"}`

const loadStoredFarmButtonStates = (otherFarm: boolean): Record<FarmElementId, FarmElementState> => {
  const defaults = getDefaultFarmButtonStates(otherFarm)
  try {
    const raw = window.localStorage.getItem(farmLayoutStorageKey(otherFarm))
    if (!raw) return defaults
    const parsed = JSON.parse(raw) as Partial<Record<FarmElementId, Partial<FarmElementState>>>
    const next = { ...defaults }
    ;(Object.keys(defaults) as FarmElementId[]).forEach((id) => {
      const item = parsed[id]
      if (!item) return
      next[id] = {
        x: typeof item.x === "number" ? item.x : defaults[id].x,
        y: typeof item.y === "number" ? item.y : defaults[id].y,
        scale: typeof item.scale === "number" ? item.scale : defaults[id].scale,
      }
    })
    return next
  } catch {
    return defaults
  }
}

const DEFAULT_TREE_LAYOUT: FarmElementState[] = [
  { x: 35.2, y: 74.1, scale: 0.4 },
  { x: 42.5, y: 73.2, scale: 0.4 },
  { x: 48.9, y: 73.8, scale: 0.4 },
  { x: 55.9, y: 73.2, scale: 0.4 },
  { x: 63.2, y: 73.5, scale: 0.4 },
  { x: 70.2, y: 73.5, scale: 0.4 },
  { x: 33.7, y: 87.5, scale: 0.4 },
  { x: 41.3, y: 87.8, scale: 0.4 },
  { x: 49.2, y: 87.8, scale: 0.4 },
  { x: 56.5, y: 88.0, scale: 0.4 },
  { x: 63.8, y: 88.1, scale: 0.4 },
  { x: 71.7, y: 87.8, scale: 0.4 },
]

// 视觉上将两排树位对调：上排显示 7-12，下排显示 1-6
const FARM_SLOT_TREE_IDS = [7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6]
const FARM_BGM_SRC = "/yoshiyuki_tatsuya-pixel-hearts-foreverwav-427383.mp3"
const FARM_HOVER_SOUND_SRC = "/soundreality-finger-snap-179180.mp3"

function FarmMuteButton({
  isMuted,
  onToggle,
}: {
  isMuted: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="farm-mute-button fixed left-5 top-5 z-50 rounded-full bg-white/90 p-3 shadow-lg backdrop-blur-sm transition hover:scale-105 hover:bg-white"
      style={{
        border: "2px solid #b89759",
        boxShadow: "0 3px 0 #85613755, 0 5px 15px rgba(0,0,0,0.12)",
      }}
      aria-label={isMuted ? "Turn sound on" : "Turn sound off"}
      title={isMuted ? "Turn sound on" : "Turn sound off"}
    >
      <img
        src={isMuted ? "/speakeroff.webp" : "/speaker on.webp"}
        alt={isMuted ? "Sound off" : "Sound on"}
        width={32}
        height={32}
        className="pointer-events-none select-none"
        draggable={false}
      />
    </button>
  )
}

const CAGENT_FARM_FONT = 'var(--font-caveat), var(--font-patrick-hand), "Patrick Hand", cursive'

function decorateFarmGuideEmojis(text: string) {
  const addOnce = (source: string, pattern: RegExp, emoji: string) => {
    if (source.includes(emoji)) return source
    return source.replace(pattern, (match) => `${match} ${emoji}`)
  }
  let next = text
  next = addOnce(next, /back[- ]arrow(?: icon)?/i, "⬅️")
  next = addOnce(next, /writing[- ]board(?: icon)?/i, "📝")
  next = addOnce(next, /\bstories\b/i, "📖")
  next = addOnce(next, /settings(?: icon)?/i, "⚙️")
  next = addOnce(next, /Visit Others'? Farm/i, "🏡")
  next = addOnce(next, /\bfriends(?:' farms)?\b/i, "👫")
  next = addOnce(next, /\bmap\b/i, "🗺️")
  next = addOnce(next, /\bfarm\b/i, "🌾")
  return next
}

function FarmCwriteWordmark() {
  return (
    <h1
      className="farm-wordmark relative inline-block font-semibold leading-none tracking-tight"
      style={{
        fontFamily: '"Berlin Sans FB Demi", "Berlin Sans FB", var(--font-baloo), sans-serif',
        fontSize: 'clamp(50px, 4.55vw, 78px)',
        letterSpacing: "-0.03em",
        filter: "drop-shadow(0 4px 6px rgba(109, 43, 92, 0.22))",
      }}
    >
      <span
        aria-hidden
        className="absolute inset-0 select-none"
        style={{ color: "#E45A97", transform: "translateY(8px)", opacity: 0.99 }}
      >
        CWrite
      </span>
      <span
        aria-hidden
        className="absolute inset-0 select-none"
        style={{
          background: "linear-gradient(180deg, #FFE85C 0%, #FFD93D 28%, #FFB25F 52%, #FF89B8 76%, #FF5FA0 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          transform: "translateY(4px)",
        }}
      >
        CWrite
      </span>
      <span
        className="relative block"
        style={{
          background: "linear-gradient(180deg, #FFF1A8 0%, #FFE45E 18%, #FFD93D 38%, #FFB85F 62%, #FF8CBB 82%, #FF679E 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        CWrite
      </span>
    </h1>
  )
}

function FarmHeroBrand() {
  return (
    <div
      className="farm-hero-brand pointer-events-none fixed z-10 text-center"
      style={{
        top: 'clamp(18px, 2vh, 26px)',
        left: '60%',
        transform: 'translateX(-50%)',
        width: 'min(610px, 50vw)',
        transformOrigin: "top center",
      }}
    >
      <FarmCwriteWordmark />
      <p
        className="farm-tagline mt-2 font-black italic"
        style={{
          color: "#FFFFFF",
          fontSize: 'clamp(16px, 1.3vw, 22px)',
          fontFamily: "var(--font-caveat), var(--font-patrick-hand), cursive",
          textShadow: "0 2px 5px rgba(7, 42, 92, 0.35)",
          letterSpacing: "0.03em",
        }}
      >
        Unleash Creativity, Empower Expression
      </p>
    </div>
  )
}

export default function UserProfilePage({
  userId,
  userRole,
  currentUsername,
  currentUserRole,
  avatarUrl,
  avatarEmoji,
  onBack,
  onOpenSettings,
  trees,
  treeGrowthDetails,
  recentGrowthTreeId,
  recentGrowthTreeIds,
  farmEntryNonce = 0,
  onVisitOthersFarm,
  onEditStory,
  isOtherFarm = false,
}: UserProfilePageProps) {
  const [works, setWorks] = useState<WorkItem[]>([])
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [selectedReview, setSelectedReview] = useState<ReviewItem | null>(null)
  const [selectedWorkForReview, setSelectedWorkForReview] = useState<WorkItem | null>(null)
  const [reviewDraft, setReviewDraft] = useState("")
  const [starRatings, setStarRatings] = useState<Record<string, 1 | 2 | 3 | 0>>({
    vocab: 0,
    grammar: 0,
    coherence: 0,
    creativity: 0,
    structure: 0,
  })
  const [dimensionTexts, setDimensionTexts] = useState<Record<string, string>>({
    vocab: "",
    grammar: "",
    coherence: "",
    creativity: "",
    structure: "",
  })
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [editingWorkId, setEditingWorkId] = useState<string | null>(null)
  const [editingWorkText, setEditingWorkText] = useState("")
  const [savingWorkId, setSavingWorkId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [forest, setForest] = useState<{ id: number; stage: number }[]>([])
  const [highlightTreeIds, setHighlightTreeIds] = useState<number[]>([])
  const [selectedTreeId, setSelectedTreeId] = useState<number | null>(null)
  const [hoveredTreeId, setHoveredTreeId] = useState<number | null>(null)
  const farmContainerRef = useRef<HTMLDivElement | null>(null)
  const [hoveredFarmElement, setHoveredFarmElement] = useState<FarmElementId | null>(null)
  const [farmElementStates, setFarmElementStates] = useState<Record<FarmElementId, FarmElementState>>(() =>
    typeof window === "undefined" ? getDefaultFarmButtonStates(isOtherFarm) : loadStoredFarmButtonStates(isOtherFarm),
  )
  const [isMuted, setIsMuted] = useState(false)
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null)
  const hoverAudioRef = useRef<HTMLAudioElement | null>(null)
  const lastHoverSoundAtRef = useRef(0)
  const [viewMode, setViewMode] = useState<"farm" | "writings">("farm")
  // 进入 farm 视图的次数：用于确保每次切回 farm 时都能重新触发闪光动画
  const [farmViewNonce, setFarmViewNonce] = useState(0)
  const [showOtherWritingMap, setShowOtherWritingMap] = useState(false)
  const [otherMapLoading, setOtherMapLoading] = useState(false)
  const [otherMapError, setOtherMapError] = useState<string | null>(null)
  const [otherMapState, setOtherMapState] = useState<OtherMapChaptersState | null>(null)
  const [otherMapChapterIndex, setOtherMapChapterIndex] = useState(0)

  useEffect(() => {
    if (!isOtherFarm && viewMode === "farm") {
      setFarmViewNonce((n) => n + 1)
    }
  }, [viewMode, isOtherFarm])

  useEffect(() => {
    try {
      if (window.localStorage.getItem("cwrite-home-muted") === "true") {
        setIsMuted(true)
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    try {
      const hoverAudio = new Audio(FARM_HOVER_SOUND_SRC)
      hoverAudio.preload = "auto"
      hoverAudio.volume = 0.45
      hoverAudio.load?.()
      hoverAudioRef.current = hoverAudio
    } catch {
      // ignore
    }

    return () => {
      hoverAudioRef.current?.pause()
      hoverAudioRef.current = null
    }
  }, [])

  useEffect(() => {
    if (isOtherFarm) return

    let isUnmounted = false
    const backgroundAudio = new Audio(FARM_BGM_SRC)
    backgroundAudio.preload = "auto"
    backgroundAudio.loop = true
    backgroundAudio.volume = 0.3
    backgroundAudio.muted = isMuted
    backgroundAudio.load?.()
    backgroundMusicRef.current = backgroundAudio

    const tryPlayBackgroundMusic = async () => {
      if (isUnmounted || isMuted) return
      try {
        await backgroundAudio.play()
      } catch {
        // Some browsers require a user gesture before audio playback.
      }
    }

    const resumeAfterInteraction = () => {
      void tryPlayBackgroundMusic()
    }

    void tryPlayBackgroundMusic()
    window.addEventListener("pointerdown", resumeAfterInteraction, { once: true })
    window.addEventListener("keydown", resumeAfterInteraction, { once: true })
    window.addEventListener("touchstart", resumeAfterInteraction, { once: true })

    return () => {
      isUnmounted = true
      window.removeEventListener("pointerdown", resumeAfterInteraction)
      window.removeEventListener("keydown", resumeAfterInteraction)
      window.removeEventListener("touchstart", resumeAfterInteraction)
      backgroundAudio.pause()
      backgroundAudio.currentTime = 0
      if (backgroundMusicRef.current === backgroundAudio) {
        backgroundMusicRef.current = null
      }
    }
  }, [isMuted, isOtherFarm])

  useEffect(() => {
    const allAudio = [backgroundMusicRef.current, hoverAudioRef.current]
    allAudio.forEach((audio) => {
      if (!audio) return
      audio.muted = isMuted
    })
    try {
      window.localStorage.setItem("cwrite-home-muted", String(isMuted))
    } catch {
      // ignore
    }
    if (isMuted) {
      backgroundMusicRef.current?.pause()
      return
    }
    void backgroundMusicRef.current?.play().catch(() => {
      // ignore autoplay restrictions until the next user gesture
    })
  }, [isMuted])

  const playFarmHoverSound = (elementId: string) => {
    if (isMuted || isOtherFarm) return
    if (hoveredFarmElement === elementId) return
    const now = Date.now()
    if (now - lastHoverSoundAtRef.current < 120) return
    lastHoverSoundAtRef.current = now
    try {
      if (!hoverAudioRef.current) return
      hoverAudioRef.current.currentTime = 0
      void hoverAudioRef.current.play()
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    setFarmElementStates(loadStoredFarmButtonStates(isOtherFarm))
    setShowOtherWritingMap(false)
  }, [isOtherFarm, userId])

  // Writing Board 界面：Cagent 僅氣泡，無小熊圖片
  const [cagentBubbleOpen, setCagentBubbleOpen] = useState(false)
  const [cagentDismissed, setCagentDismissed] = useState(false)
  const [cagentGuideText, setCagentGuideText] = useState<string | null>(null)
  const [cagentLoading, setCagentLoading] = useState(false)
  const [cagentUserInput, setCagentUserInput] = useState("")
  const [cagentSending, setCagentSending] = useState(false)
  const [cagentTriggerPosition, setCagentTriggerPosition] = useState({ x: 50, y: 42 })
  const [cagentHelloBubblePosition, setCagentHelloBubblePosition] = useState({ x: 50, y: 32 })
  const [cagentHoverTrigger, setCagentHoverTrigger] = useState(false)
  const [otherFarmBubbleStep, setOtherFarmBubbleStep] = useState<"intro" | "warning">("intro")
  const cagentBubbleRef = useRef<HTMLDivElement>(null)
  const cagentTriggerRef = useRef<HTMLButtonElement>(null)

  const closeCagent = useCallback(() => {
    setCagentBubbleOpen(false)
    setCagentDismissed(true)
  }, [])
  useEffect(() => {
    if (!cagentBubbleOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeCagent()
    }
    const closeOutside = (event: PointerEvent) => {
      const target = event.target as Node
      if (!cagentBubbleRef.current?.contains(target) && !cagentTriggerRef.current?.contains(target)) closeCagent()
    }
    window.addEventListener("keydown", closeOnEscape)
    document.addEventListener("pointerdown", closeOutside)
    return () => {
      window.removeEventListener("keydown", closeOnEscape)
      document.removeEventListener("pointerdown", closeOutside)
    }
  }, [cagentBubbleOpen, closeCagent])

  const farmElements: FarmElementConfig[] = isOtherFarm
    ? [
        { id: "farmbacktomap", label: "Start writing!", imageSrc: "/farmbacktomap.webp", baseWidthPercent: 16, useNaturalAspect: true },
        { id: "theirmap", label: "Writing Map", imageSrc: "/theirmap.webp", baseWidthPercent: 16, useNaturalAspect: true },
        { id: "farmwrittingboard", label: "Writing Board", imageSrc: "/farmwritingboard.webp" },
        { id: "vistothersfarm", label: "Visit friends' farms", imageSrc: "/visitothersfarm.webp", baseWidthPercent: 16, useNaturalAspect: true },
      ]
    : [
    { id: "farmbacktomap", label: "Start writing!", imageSrc: "/farmbacktomap.webp", baseWidthPercent: 16, useNaturalAspect: true },
    { id: "farmsetting", label: "Settings", imageSrc: "/farmsetting.webp" },
    { id: "farmwrittingboard", label: "Writing Board", imageSrc: "/farmwritingboard.webp" },
    { id: "vistothersfarm", label: "Visit friends' farms", imageSrc: "/visitothersfarm.webp", baseWidthPercent: 16, useNaturalAspect: true },
  ]

  const farmTreeStates = DEFAULT_TREE_LAYOUT
  const forestById = new Map(forest.map((tree) => [tree.id, tree] as const))

  const farmBackgroundSrc = isOtherFarm ? "/farm.webp" : "/farm-scene-cloudless.webp"
  const farmBackgroundAlt = isOtherFarm ? "Other Student Farm Background" : "My Farm Background"
  const treeCount = 12

  const farmImageRef = useRef<HTMLImageElement | null>(null)
  const [coverOverlayRect, setCoverOverlayRect] = useState<CoverOverlayRect | null>(null)

  const updateCoverOverlayRect = useCallback(() => {
    const container = farmContainerRef.current
    const img = farmImageRef.current
    if (!container || !img || !img.naturalWidth || !img.naturalHeight) return
    const cw = container.clientWidth
    const ch = container.clientHeight
    const iw = img.naturalWidth
    const ih = img.naturalHeight
    const s = Math.max(cw / iw, ch / ih) * (isOtherFarm ? 1 : 1.035)
    setCoverOverlayRect({
      width: s * iw,
      height: s * ih,
      left: -(s * iw - cw) / 2,
      top: -(s * ih - ch) / 2,
    })
  }, [isOtherFarm])

  useEffect(() => {
    const container = farmContainerRef.current
    const img = farmImageRef.current
    if (!img || !container) return
    if (img.complete && img.naturalWidth) updateCoverOverlayRect()
    img.addEventListener("load", updateCoverOverlayRect)
    window.addEventListener("resize", updateCoverOverlayRect)
    const ro = new ResizeObserver(updateCoverOverlayRect)
    ro.observe(container)
    return () => {
      img.removeEventListener("load", updateCoverOverlayRect)
      window.removeEventListener("resize", updateCoverOverlayRect)
      ro.disconnect()
    }
  }, [updateCoverOverlayRect,isOtherFarm,viewMode])


  useEffect(() => {
    if (!isOtherFarm) return
    setOtherFarmBubbleStep("intro")
    setCagentBubbleOpen(false)
  }, [isOtherFarm, userId])

  useEffect(() => {
    if (!isOtherFarm || !userId) return
    let cancelled = false

    void (async () => {
      setOtherMapLoading(true)
      setOtherMapError(null)
      try {
        const res = await fetch(`/api/user-map-state?user_id=${encodeURIComponent(userId)}`)
        if (!res.ok) {
          throw new Error(`map_state_http_${res.status}`)
        }
        const data = await res.json()
        if (cancelled) return
        const normalized = normalizeOtherMapState(data?.state)
        setOtherMapState(normalized)
        setOtherMapChapterIndex(normalized.activeChapterIndex)
      } catch (error) {
        if (cancelled) return
        console.error("Load other writing map failed:", error)
        setOtherMapState(normalizeOtherMapState(null))
        setOtherMapChapterIndex(0)
        setOtherMapError("Unable to load this writing map right now.")
      } finally {
        if (!cancelled) setOtherMapLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isOtherFarm, userId])

  useEffect(() => {
    Promise.all([
      fetch(`/api/user-works?user_id=${userId}&type=all`).then((r) => r.json()),
      fetch(`/api/reviews?user_id=${userId}`).then((r) => r.json()),
    ])
      .then(([worksRes, reviewsRes]) => {
        const list: WorkItem[] = []
        if (worksRes.stories) {
          worksRes.stories.forEach((s: any) =>
            list.push({
              id: s.id,
              type: s.workType==='drama'?'drama':'story',
              title: s.title || (s.character?.name ? `${s.character.name}'s Adventure` : "Story"),
              content: s.content || "",
              timestamp: s.timestamp ? new Date(s.timestamp).getTime() : new Date(s.updatedAt || 0).getTime(),
              interactionId: s.interactionId,
            })
          )
        }
        if (worksRes.reviews) {
          worksRes.reviews.forEach((r: any) =>
            list.push({
              id: r.id,
              type: "review",
              title: `Review: ${r.bookTitle || "Book"}`,
              content: r.content || "",
              timestamp: r.timestamp ? new Date(r.timestamp).getTime() : new Date(r.updatedAt || 0).getTime(),
              interactionId: r.interactionId,
            })
          )
        }
        if (worksRes.letters) {
          worksRes.letters.forEach((l: any) =>
            list.push({
              id: l.id,
              type: "letter",
              title: `Letter to ${l.recipient || "Someone"}`,
              content: l.content || "",
              timestamp: l.timestamp ? new Date(l.timestamp).getTime() : new Date(l.updatedAt || 0).getTime(),
              interactionId: l.interactionId,
            })
          )
        }
        list.sort((a, b) => b.timestamp - a.timestamp)
        setWorks(list)
        setReviews(reviewsRes.reviews || [])
        setUnreadCount(reviewsRes.unreadCount ?? 0)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [userId])

  // 同步来自主页的小树森林与最近成长信息（仅自己的農場）
  useEffect(() => {
    if (!isOtherFarm && trees && Array.isArray(trees)) {
      setForest(trees.slice(0, 12))
    }
  }, [isOtherFarm, trees])

  // 其他用戶農場：拉取該用戶的 12 棵價值觀樹數據並顯示
  useEffect(() => {
    if (!isOtherFarm || !userId) return
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch(`/api/user-profile?user_id=${encodeURIComponent(userId)}`)
        if (!res.ok) return
        const data = await res.json()
        const raw = data?.trees
        if (cancelled) return
        if (Array.isArray(raw) && raw.length > 0) {
          const normalized = raw
            .slice(0, 12)
            .map((item: { id?: number; stage?: number }, idx: number) => ({
              id: Number(item?.id) || idx + 1,
              stage: Math.min(4, Math.max(2, Number(item?.stage) ?? 2)),
            }))
          setForest(normalized)
        } else {
          setForest(Array.from({ length: 12 }, (_, i) => ({ id: i + 1, stage: 2 })))
        }
      } catch {
        if (!cancelled) setForest(Array.from({ length: 12 }, (_, i) => ({ id: i + 1, stage: 2 })))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isOtherFarm, userId])

  useEffect(() => {
    const requestedIds = recentGrowthTreeIds?.length
      ? recentGrowthTreeIds
      : recentGrowthTreeId
        ? [recentGrowthTreeId]
        : []
    const validIds = Array.from(new Set(requestedIds)).filter((id) => trees?.some((t) => t.id === id))
    if (validIds.length > 0) {
      // 强制“重新触发闪光”：
      // 如果这次进入 farm 的高亮树和上次相同，React 可能不会触发重新动画，
      // 所以先清空，再立刻设回去让 span 重新挂载/动画重新开始。
      setHighlightTreeIds([])
      const restart = window.setTimeout(() => {
        setHighlightTreeIds(validIds)
      }, 30)

      const timer = window.setTimeout(() => {
        setHighlightTreeIds([])
      }, 4030)

      return () => {
        clearTimeout(restart)
        clearTimeout(timer)
      }
    }
  }, [recentGrowthTreeId, recentGrowthTreeIds, trees, farmEntryNonce, farmViewNonce])

  const teacherReviews = reviews.filter((r) => r.reviewerRole === "teacher")
  const peerReviews = reviews.filter((r) => r.reviewerRole === "student")
  const currentOtherMapChapter =
    otherMapState?.chapters[
      Math.min(otherMapChapterIndex, Math.max(0, (otherMapState?.chapters.length ?? 1) - 1))
    ] ?? null

  const fetchCagentGuide = useCallback(
    async (userMessage?: string) => {
      setCagentLoading(true)
      if (!userMessage) {
        setCagentGuideText(null)
      } else {
        setCagentGuideText("Cagent is thinking... ✨")
      }
      try {
        const res = await fetch("/api/dify-cagent-guide", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stage: "userProfileFarm",
            contextSummary: "User is on the farm interface (writing board, settings, etc.).",
            user_id: userId,
            userMessage: userMessage || null,
          }),
        })
        if (!res.ok) throw new Error(`cagent_guide_http_${res.status}`)
        const data = await res.json()
        if (data.error) {
          setCagentGuideText("Oops, Cagent is resting. Try again in a bit! 🧸")
          return
        }
        setCagentGuideText(data.message || data.answer || "Keep going! You're doing great! ✨")
      } catch {
        setCagentGuideText("Something went wrong. Try again! 🌟")
      } finally {
        setCagentLoading(false)
      }
    },
    [userId]
  )

  const handleCagentOpen = useCallback(() => {
    if (isOtherFarm) {
      setOtherFarmBubbleStep("warning")
      return
    }
    if (cagentBubbleOpen) {
      closeCagent()
      return
    }
    setCagentDismissed(false)
    setCagentBubbleOpen(true)
    if (!cagentGuideText && !cagentLoading) fetchCagentGuide()
  }, [isOtherFarm, cagentBubbleOpen, closeCagent, cagentGuideText, cagentLoading, fetchCagentGuide])

  const handleCagentSend = useCallback(
    async (e?: { preventDefault: () => void }) => {
      if (e) e.preventDefault()
      const message = cagentUserInput.trim()
      if (!message || cagentSending) return
      setCagentSending(true)
      try {
        await fetchCagentGuide(message)
        setCagentUserInput("")
      } finally {
        setCagentSending(false)
      }
    },
    [cagentUserInput, cagentSending, fetchCagentGuide]
  )

  const handleReviewClick = (r: ReviewItem) => {
    setSelectedReview(r)
    fetch("/api/reviews/mark-read", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, review_ids: [r.id] }),
    })
      .then(() => {
        setUnreadCount((c) => Math.max(0, c - 1))
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("headerRefreshUserInfo"))
        }
      })
      .catch(console.error)
  }

  const resetPeerReviewForm = useCallback(() => {
    setReviewDraft("")
    setStarRatings({
      vocab: 0,
      grammar: 0,
      coherence: 0,
      creativity: 0,
      structure: 0,
    })
    setDimensionTexts({
      vocab: "",
      grammar: "",
      coherence: "",
      creativity: "",
      structure: "",
    })
  }, [])

  const handleSubmitReview = useCallback(async () => {
    if (!selectedWorkForReview || !currentUsername || !currentUserRole) return
    // 所有維度至少 1 星且有文字
    const dims = ["vocab", "grammar", "coherence", "creativity", "structure"] as const
    for (const key of dims) {
      if (!starRatings[key] || !dimensionTexts[key].trim()) {
        if (typeof window !== "undefined") {
          window.alert("Please rate all 5 dimensions and write a short comment for each one.")
        }
        return
      }
    }
    const combinedContent =
      dims
        .map((key) => {
          const label =
            key === "vocab"
              ? "Vocabulary"
              : key === "grammar"
              ? "Grammar"
              : key === "coherence"
              ? "Coherence"
              : key === "creativity"
              ? "Creativity"
              : "Structure"
          const stars = "★".repeat(starRatings[key]) + "☆".repeat(3 - starRatings[key])
          return `${label} (${stars}):\n${dimensionTexts[key].trim()}`
        })
        .join("\n\n") + (reviewDraft.trim() ? `\n\nOverall:\n${reviewDraft.trim()}` : "")
    setReviewSubmitting(true)
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          work_type: selectedWorkForReview.type,
          work_interaction_id: selectedWorkForReview.interactionId || null,
          author_username: userId,
          reviewer_username: currentUsername,
          reviewer_role: currentUserRole,
          content: combinedContent,
          work_title: selectedWorkForReview.title,
          work_content: selectedWorkForReview.content,
        }),
      })
      const data = await res.json()
      if (!res.ok || data?.error) {
        throw new Error(data?.error || "Failed to submit review")
      }
      resetPeerReviewForm()
      setSelectedWorkForReview(null)
      const refreshed = await fetch(`/api/reviews?user_id=${userId}`).then((r) => r.json())
      setReviews(refreshed.reviews || [])
      setUnreadCount(refreshed.unreadCount ?? 0)
      } catch (error) {
      console.error("Submit review failed:", error)
    } finally {
      setReviewSubmitting(false)
    }
  }, [selectedWorkForReview, reviewDraft, currentUsername, currentUserRole, userId, starRatings, dimensionTexts, resetPeerReviewForm])

  const handleStartEditWork = useCallback((work: WorkItem) => {
    if (onEditStory) { onEditStory(work.id); return }
    setEditingWorkId(work.id)
    setEditingWorkText(work.content || "")
  }, [onEditStory])

  const handleSaveWork = useCallback(
    async (work: WorkItem) => {
      if (!currentUsername || currentUsername !== userId) return
      setSavingWorkId(work.id)
      try {
        const res = await fetch("/api/user-works", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId,
            work_type: work.type,
            work_id: work.id,
            content: editingWorkText,
          }),
        })
        const data = await res.json()
        if (!res.ok || data?.error) {
          throw new Error(data?.error || "Failed to save")
        }
        setWorks((prev) => prev.map((item) => (item.id === work.id ? { ...item, content: editingWorkText } : item)))
        setEditingWorkId(null)
      } catch (error) {
        console.error("Save work failed:", error)
      } finally {
        setSavingWorkId(null)
      }
    },
    [currentUsername, userId, editingWorkText]
  )

  if (viewMode === "writings") {
    return (
      <div
        className="min-h-screen bg-gradient-to-b from-amber-50/90 via-white to-purple-50/80"
        style={{ paddingTop: "var(--stage-top-padding)", paddingBottom: "var(--stage-bottom-padding)" }}
        data-stage="userProfile"
      >
        <div className="mx-auto max-w-6xl px-4 py-6 pl-16 lg:pl-20">
          <BackButton onClick={() => setViewMode("farm")} variant="amber" aria-label="Back to Farm" />
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left: My Writings */}
            <div className="lg:col-span-2">
              <div className="rounded-2xl border-2 border-amber-200/60 bg-white/80 p-6 shadow-lg backdrop-blur-sm">
                <div className="mb-4 flex items-center gap-2">
                  <BookOpen className="h-6 w-6 text-amber-600" />
                  <h2 className="font-hand text-xl font-bold text-foreground">My Writings</h2>
                </div>
                {loading ? (
                  <p className="font-hand text-sm text-muted-foreground">Loading...</p>
                ) : works.length === 0 ? (
                  <p className="font-hand text-sm text-muted-foreground">No writings yet. Start writing from the map!</p>
                ) : (
                  <div className="space-y-4">
                    {([
                      { type: "story", label: "Stories", icon: <BookOpen className="h-4 w-4 text-amber-600" /> },
                      { type: "drama", label: "Drama scripts", icon: <Theater className="h-4 w-4 text-amber-600" /> },
                    ] as const).map((section) => {
                      const items = works.filter((w) => w.type === section.type)
                      return (
                        <div key={section.type} className="rounded-xl border border-amber-100 bg-white/70 p-3">
                          <div className="mb-2 flex items-center gap-2">
                            {section.icon}
                            <h4 className="font-hand text-sm font-bold text-foreground">{section.label}</h4>
                          </div>
                          {items.length === 0 ? (
                            <p className="font-hand text-xs text-muted-foreground">No {section.label.toLowerCase()} yet.</p>
                          ) : (
                            <ul className="space-y-2">
                              {items.map((w) => (
                                <li
                                  key={w.id}
                                  className="rounded-xl border border-amber-100 bg-amber-50/50 px-3 py-2 font-hand"
                                >
                                  <div className="mb-2 flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                      <p className="font-bold text-foreground">{w.title}</p>
                                      <p className="text-xs text-muted-foreground">{new Date(w.timestamp).toLocaleDateString("en-US")}</p>
                                    </div>
                                    {!isOtherFarm && currentUsername === userId && (
                                      <div className="flex items-center gap-2">
                                        {editingWorkId === w.id ? (
                                          <>
                                            <Button
                                              type="button"
                                              size="sm"
                                              variant="outline"
                                              onClick={() => {
                                                setEditingWorkId(null)
                                                setEditingWorkText("")
                                              }}
                                            >
                                              Cancel
                                            </Button>
                                            <Button
                                              type="button"
                                              size="sm"
                                              className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                              disabled={savingWorkId === w.id}
                                              onClick={() => handleSaveWork(w)}
                                            >
                                              {savingWorkId === w.id ? "Saving..." : "Save"}
                                            </Button>
                                          </>
                                        ) : (
                                          <Button type="button" size="sm" variant="outline" onClick={() => handleStartEditWork(w)}>
                                            Edit
                                          </Button>
                                        )}
                                      </div>
                                    )}
                                    {isOtherFarm && currentUsername && currentUsername !== userId && (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="rounded-lg border-purple-200 text-purple-700 hover:bg-purple-50"
                                        onClick={() => {
                                          setSelectedWorkForReview(w)
                                          resetPeerReviewForm()
                                        }}
                                      >
                                        Evaluate
                                      </Button>
                                    )}
                                  </div>
                                  <div className="max-h-56 overflow-y-auto rounded-lg border border-amber-200 bg-white/80 p-2">
                                    {editingWorkId === w.id && !isOtherFarm && currentUsername === userId ? (
                                      <textarea
                                        value={editingWorkText}
                                        onChange={(e) => setEditingWorkText(e.target.value)}
                                        className="min-h-[180px] w-full rounded-lg border border-amber-200 bg-white p-2 text-sm focus:outline-none"
                                      />
                                    ) : (
                                      <pre className="whitespace-pre-wrap break-words font-hand text-sm text-foreground">
                                        {w.content || "(No content)"}
                                      </pre>
                                    )}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Teacher Reviews & Peer Reviews */}
            <div className="space-y-6">
              <div className="rounded-2xl border-2 border-blue-200/60 bg-white/80 p-5 shadow-lg backdrop-blur-sm">
                <div className="mb-3 flex items-center gap-2">
                  <UserIcon className="h-5 w-5 text-blue-600" />
                  <h3 className="font-hand font-bold text-foreground">Teacher Reviews</h3>
                </div>
                {teacherReviews.length === 0 ? (
                  <p className="font-hand text-xs text-muted-foreground">No teacher reviews yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {teacherReviews.slice(0, 5).map((r) => (
                      <li key={r.id}>
                        <button
                          type="button"
                          onClick={() => handleReviewClick(r)}
                          className={`w-full rounded-xl border px-3 py-2 text-left font-hand text-sm transition hover:border-blue-300 ${
                            !r.readAt ? "border-blue-300 bg-blue-50/50 font-semibold" : "border-blue-100 bg-white"
                          }`}
                        >
                          <span className="block truncate text-foreground">{r.workTitle || "Review"}</span>
                          <span className="text-xs text-muted-foreground">by {r.reviewerUsername}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="rounded-2xl border-2 border-green-200/60 bg-white/80 p-5 shadow-lg backdrop-blur-sm">
                <div className="mb-3 flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-green-600" />
                  <h3 className="font-hand font-bold text-foreground">Peer Reviews</h3>
                </div>
                {peerReviews.length === 0 ? (
                  <p className="font-hand text-xs text-muted-foreground">No peer reviews yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {peerReviews.slice(0, 5).map((r) => (
                      <li key={r.id}>
                        <button
                          type="button"
                          onClick={() => handleReviewClick(r)}
                          className={`w-full rounded-xl border px-3 py-2 text-left font-hand text-sm transition hover:border-green-300 ${
                            !r.readAt ? "border-green-300 bg-green-50/50 font-semibold" : "border-green-100 bg-white"
                          }`}
                        >
                          <span className="block truncate text-foreground">{r.workTitle || "Review"}</span>
                          <span className="text-xs text-muted-foreground">by {r.reviewerUsername}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {selectedReview && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
              onClick={() => setSelectedReview(null)}
            >
              <div
                className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl border-2 border-primary/20 bg-white p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-hand text-lg font-bold text-foreground">{selectedReview.workTitle || "Review"}</h3>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedReview(null)} className="rounded-xl">
                    Close
                  </Button>
                </div>
                <div className="space-y-4">
                  <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                    <p className="mb-1 font-hand text-xs font-bold text-muted-foreground">Review by {selectedReview.reviewerUsername}</p>
                    <p className="whitespace-pre-wrap font-hand text-sm text-foreground">{selectedReview.content}</p>
                  </div>
                  {selectedReview.workContent && (
                    <div className="rounded-xl border border-border bg-muted/30 p-4">
                      <p className="mb-1 font-hand text-xs font-bold text-muted-foreground">Your work</p>
                      <pre className="whitespace-pre-wrap font-hand text-sm text-foreground">{selectedReview.workContent}</pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {isOtherFarm && selectedWorkForReview && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
              onClick={() => {
                resetPeerReviewForm()
                setSelectedWorkForReview(null)
              }}
            >
              <div
                className="w-full max-w-4xl rounded-3xl border-2 border-pink-200 bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 p-5 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-hand text-xl font-bold text-foreground">Evaluate: {selectedWorkForReview.title} ✨</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      resetPeerReviewForm()
                      setSelectedWorkForReview(null)
                    }}
                  >
                    Close
                  </Button>
                </div>
                <p className="mb-4 text-xs text-muted-foreground">
                  Reviewer: {currentUsername || "unknown"} / Target: {userId}. Please rate each dimension with 1-3 stars and write comments.
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    { key: "vocab", label: "Vocabulary", placeholder: "I think the vocabulary in this writing is very rich and interesting." },
                    { key: "grammar", label: "Grammar", placeholder: "The grammar in this writing is mostly correct and clear." },
                    { key: "coherence", label: "Coherence", placeholder: "The ideas are connected in a way that is easy to follow." },
                    { key: "creativity", label: "Creativity", placeholder: "The story ideas are creative and make me excited to read." },
                    { key: "structure", label: "Structure", placeholder: "The beginning, middle, and end are clear and well organized." },
                  ].map((dim) => (
                    <div key={dim.key} className={`rounded-2xl border p-3 shadow-sm transition-transform duration-200 hover:scale-[1.01] ${
                      dim.key === "vocab"
                        ? "border-pink-200 bg-pink-50/80"
                        : dim.key === "grammar"
                        ? "border-blue-200 bg-blue-50/80"
                        : dim.key === "coherence"
                        ? "border-violet-200 bg-violet-50/80"
                        : dim.key === "creativity"
                        ? "border-amber-200 bg-amber-50/80"
                        : "border-emerald-200 bg-emerald-50/80"
                    }`}>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-hand text-sm font-bold text-foreground">{dim.label}</span>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3].map((star) => (
                            <button
                              key={star}
                              type="button"
                              className={`text-xl leading-none transition-transform duration-150 hover:scale-125 ${starRatings[dim.key as keyof typeof starRatings] >= star ? "text-yellow-500" : "text-gray-300 hover:text-yellow-400"}`}
                              onClick={() =>
                                setStarRatings((prev) => ({
                                  ...prev,
                                  [dim.key]: star as 1 | 2 | 3,
                                }))
                              }
                              aria-label={`${dim.label} ${star} star`}
                            >
                              ★
                            </button>
                          ))}
                        </div>
                      </div>
                      <textarea
                        value={dimensionTexts[dim.key as keyof typeof dimensionTexts]}
                        onChange={(e) =>
                          setDimensionTexts((prev) => ({
                            ...prev,
                            [dim.key]: e.target.value,
                          }))
                        }
                        placeholder={dim.placeholder}
                        className="min-h-[56px] w-full rounded-xl border border-purple-200 bg-white/90 p-2 text-xs focus:outline-none"
                      />
                    </div>
                  ))}
                  <div className="rounded-2xl border border-purple-200 bg-white/80 p-3 md:col-span-2">
                    <p className="mb-2 text-xs font-semibold text-muted-foreground">Overall comment (optional)</p>
                    <textarea
                      value={reviewDraft}
                      onChange={(e) => setReviewDraft(e.target.value)}
                      placeholder="Write your overall feeling about this writing..."
                      className="min-h-[64px] w-full rounded-xl border border-purple-200 bg-white/90 p-2 text-xs focus:outline-none"
                    />
                  </div>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      resetPeerReviewForm()
                      setSelectedWorkForReview(null)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmitReview}
                    disabled={reviewSubmitting}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {reviewSubmitting ? "Submitting..." : "Submit Review"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
        {!isOtherFarm && (
          <FarmMuteButton isMuted={isMuted} onToggle={() => setIsMuted((prev) => !prev)} />
        )}
      </div>
    )
  }

  const cagentBubbleX = cagentHelloBubblePosition.x
  const cagentBubbleY = cagentHelloBubblePosition.y
  const cagentBubbleLeft = coverOverlayRect
    ? coverOverlayRect.left + (coverOverlayRect.width * cagentBubbleX) / 100
    : `${cagentBubbleX}%`
  const cagentBubbleTop = coverOverlayRect
    ? coverOverlayRect.top + (coverOverlayRect.height * cagentBubbleY) / 100
    : `${cagentBubbleY}%`
  const cagentGreeting = cagentHoverTrigger ? "click me!" : "Hello there!"
  const cagentGuideDisplay = decorateFarmGuideEmojis((cagentGuideText || "Loading...").replace(/\n{2,}/g, "\n"))
  const cagentAnchorTop = typeof cagentBubbleTop === "number" ? cagentBubbleTop : 160
  const cagentMaxHeight = Math.max(120, cagentAnchorTop - 12)

  return (
    <div
      className="min-h-screen bg-transparent"
      style={{ paddingTop: 0, paddingBottom: 0 }}
      data-stage="userProfile"
      {...(!isOtherFarm ? { "data-no-header": "true" } : {})}
    >
      {/* My Farm - 固定視窗鋪滿，背景 object-cover 不露 firstmap，前景用 % 鎖定相對位置 */}
      <div ref={farmContainerRef} className="fixed inset-x-0 top-0 w-full overflow-hidden" style={{bottom:'var(--cwrite-footer-height)'}}>
        {!isOtherFarm && <FarmHeroBrand />}
        <style>{`
          @keyframes farm-breathe {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.025); }
          }
          .farm-breathe {
            animation: farm-breathe 2.7s ease-in-out infinite;
            transform-origin: center center;
            will-change: transform;
          }
          .farm-breathe-fast {
            animation-duration: 1.85s;
          }
          @media (prefers-reduced-motion: reduce) {
            .farm-breathe { animation: none; }
          }
        `}</style>
        <img
          ref={farmImageRef}
          src={farmBackgroundSrc}
          alt={farmBackgroundAlt}
          className="absolute inset-0 h-full w-full object-cover object-center"
          style={{transform:isOtherFarm?undefined:'scale(1.035)'}}
          draggable={false}
        />

        {/* 與 object-cover 背景同尺度、同裁切，內層 % 即為背景圖上的相對位置與大小，不穿幫 */}
        <div
          className="absolute"
          style={
            coverOverlayRect
              ? {
                  width: coverOverlayRect.width,
                  height: coverOverlayRect.height,
                  left: coverOverlayRect.left,
                  top: coverOverlayRect.top,
                }
              : { left: 0, top: 0, right: 0, bottom: 0, width: "100%", height: "100%" }
          }
        >
            {!isOtherFarm && <FarmScene leftInset={coverOverlayRect ? Math.max(0,-coverOverlayRect.left / coverOverlayRect.width * 1920) : 0}/>}
            {Array.from({ length: treeCount }).map((_, index) => {
                const treeState = isOtherFarm ? farmTreeStates[index] || DEFAULT_TREE_LAYOUT[index] : {...FARM_SAPLING_SLOTS[index],scale:1}
                const slotTreeId = FARM_SLOT_TREE_IDS[index] ?? index + 1
                const treeData = forestById.get(slotTreeId)
                const isHighlightedTree = !!treeData && highlightTreeIds.includes(treeData.id)
                const isHoveredTree = treeData && hoveredTreeId === treeData.id
                const treeStage = Math.max(2, Math.min(4, Number(treeData?.stage ?? 2)))
                const treeImageSrc = treeStage >= 4 ? "/tree4.webp" : treeStage >= 3 ? "/tree3.webp" : "/tree2.webp"
                const treeBaseSizePercent = isOtherFarm ? (treeStage >= 4 ? 11.2 : 8) : (treeStage >= 4 ? 5.4 : 3.35)
                const treeTop = treeStage >= 4 ? treeState.y + (isOtherFarm ? 3.6 : -4) : treeState.y
                const treeLeft = treeStage >= 4 && isOtherFarm ? treeState.x + 1.2 : treeState.x
                const treeId = treeData?.id ?? slotTreeId
                const canClickTree = !isOtherFarm && treeGrowthDetails != null
                const hoverScale = isHighlightedTree ? 1.14 : isHoveredTree ? 1.08 : 1
                const Wrapper = canClickTree ? "button" : "div"
                return (
                  <Wrapper
                    key={`farm-tree-${index}`}
                    data-farm-guide={!isOtherFarm ? 'garden' : undefined}
                    type={canClickTree ? "button" : undefined}
                    className={`absolute border-0 bg-transparent p-0 ${isOtherFarm ? '-translate-x-1/2 -translate-y-1/2 focus:outline-none focus:ring-0' : 'farm-tree-target'}`}
                    style={{
                      left: `${treeLeft}%`,
                      top: `${treeTop}%`,
                      width: `${treeBaseSizePercent}%`,
                      aspectRatio: "698 / 850",
                      zIndex: isHoveredTree || isHighlightedTree ? 8 : 5,
                      cursor: canClickTree ? "pointer" : "default",
                      filter: isHighlightedTree || isHoveredTree ? "drop-shadow(0 0 18px rgba(250, 204, 21, 1)) drop-shadow(0 0 28px rgba(255, 215, 0, 0.8))" : "none",
                      transform: `translate(-50%, -50%) scale(${treeState.scale * hoverScale})`,
                      transformOrigin: "center center",
                      transition: "transform 0.25s ease, filter 0.25s ease",
                    }}
                    onClick={canClickTree ? () => setSelectedTreeId(treeId) : undefined}
                    aria-label={canClickTree ? `${TREE_DIMENSION_NAMES[treeId]}: View growth record` : undefined}
                    title={canClickTree ? `${TREE_DIMENSION_NAMES[treeId]}: ${farmValueMeaning(treeId)}` : undefined}
                    onMouseEnter={() => setHoveredTreeId(treeId)}
                    onMouseLeave={() => setHoveredTreeId((prev) => (prev === treeId ? null : prev))}
                  >
                    {isHighlightedTree && (
                      <span className="absolute inset-0 pointer-events-none rounded-full animate-pulse opacity-60" style={{ boxShadow: "inset 0 0 30px 8px rgba(255, 215, 0, 0.4)" }} aria-hidden />
                    )}
                    <img
                      src={treeImageSrc}
                      alt={`Farm tree ${index + 1}`}
                      className="farm-tree-breeze h-full w-full object-contain select-none pointer-events-none"
                      style={{animationDelay:`${-index*.37}s`,animationDuration:`${4.5+index%3*.6}s`,animationPlayState:isHoveredTree||isHighlightedTree?"paused":"running"}}
                      draggable={false}
                    />
                  </Wrapper>
                )
              })}

            {!isOtherFarm && FARM_SLOT_TREE_IDS.map((treeId,index)=><button key={`value-label-${treeId}`} data-farm-guide="garden" className="farm-soil-label" onClick={()=>setSelectedTreeId(treeId)} style={{left:`${FARM_SAPLING_SLOTS[index].x}%`,top:`${FARM_SAPLING_SLOTS[index].labelY}%`,fontSize:treeId===2?'clamp(10px,.86vw,12px)':undefined,rotate:`${index%2===0?'-.7deg':'.7deg'}`}} title={`${TREE_DIMENSION_NAMES[treeId]}: ${farmValueMeaning(treeId)}`}>{farmValueLabel(treeId)}</button>)}

            {farmElements.map((element, elementIndex) => {
              const state = farmElementStates[element.id]
              if (!state) return null
              const isHovered = hoveredFarmElement === element.id
              const enlargedSign = !isOtherFarm && (element.id === 'farmbacktomap' || element.id === 'vistothersfarm')
              // Both planks attach to the same post at x=1412 in the 1920px artwork.
              const signState = element.id === 'farmbacktomap' ? {x:73.54,y:39,scale:.58} : {x:73.54,y:25.5,scale:.53}
              const layoutState = enlargedSign ? signState : !isOtherFarm && element.id==='farmsetting' ? {x:31.25,y:43.1,scale:.96} : !isOtherFarm && element.id==='farmwrittingboard' ? {x:58.35,y:40.3,scale:1.18} : state
              const sizePercent = Math.min(70, (element.baseWidthPercent ?? 8) * layoutState.scale)
              return (
                <button
                  key={element.id}
                  data-farm-guide={!isOtherFarm ? ({farmbacktomap:'write',farmsetting:'settings',farmwrittingboard:'board',vistothersfarm:'friends',theirmap:'map'}[element.id]) : undefined}
                  type="button"
                  className={`absolute origin-center farm-scene-control ${isOtherFarm?'-translate-x-1/2 -translate-y-1/2':''} ${element.id==='farmbacktomap'&&!isOtherFarm?'farm-writing-sign':''}`}
                  style={{
                    left: `${layoutState.x}%`,
                    top: `${layoutState.y}%`,
                    width: `${sizePercent}%`,
                  aspectRatio: element.useNaturalAspect || (!isOtherFarm && element.id==='farmsetting') ? undefined : "1 / 1",
                    transform: `translate(-50%, -50%) scale(${isHovered ? (enlargedSign ? 1.035 : 1.08) : 1})`,
                    transformOrigin: "center center",
                    transition: "transform 0.25s ease-in-out",
                    cursor: "pointer",
                    // Start writing is the lower sign; keep it above Visit Others' Farm
                    // so a click on that plank always goes to the map, not the farm list.
                    zIndex:
                      element.id === "farmbacktomap"
                        ? 28
                        : element.id === "vistothersfarm"
                          ? 16
                          : 20,
                  }}
                  onMouseEnter={() => {
                    setHoveredFarmElement(element.id)
                    playFarmHoverSound(element.id)
                  }}
                  onMouseLeave={() => setHoveredFarmElement((prev) => (prev === element.id ? null : prev))}
                  onClick={() => {
                    if (element.id === "farmbacktomap") onBack()
                    else if (element.id === "farmsetting") {
                      if (!isOtherFarm) onOpenSettings()
                    } else if (element.id === "theirmap") {
                      setShowOtherWritingMap(true)
                    } else if (element.id === "farmwrittingboard") setViewMode("writings")
                    else if (element.id === "vistothersfarm") {
                      if (typeof onVisitOthersFarm === "function") onVisitOthersFarm()
                      else if (isOtherFarm) onBack()
                    }
                  }}
                >
                  <span
                    className={`${element.id==='farmbacktomap'?'farm-breathe':''} relative block h-full w-full ${
                      element.id === "farmbacktomap" ? "farm-breathe-fast" : ""
                    }`}
                    style={{
                      animationDelay: `${elementIndex * 0.35}s`,
                      animationPlayState: isHovered ? "paused" : "running",
                    }}
                  >
                    <img
                      src={element.imageSrc}
                      alt={element.label}
                      className={`block w-full object-contain select-none pointer-events-none ${
                        element.useNaturalAspect || (!isOtherFarm && element.id==='farmsetting') ? "h-auto" : "h-full"
                      }`}
                      draggable={false}
                    />
                    {element.id === "farmwrittingboard" && !isOtherFarm && unreadCount > 0 && (
                      <span
                        className="absolute right-[6%] top-[10%] h-3.5 w-3.5 rounded-full bg-red-500 ring-2 ring-white"
                        aria-label="Unread review notifications"
                      />
                    )}
                  </span>
                </button>
              )
            })}

            {/* Tree growth record modal: only on own farm when a tree is clicked */}
            {selectedTreeId != null && !isOtherFarm && (
              <div
                className="pointer-events-auto fixed inset-0 z-[100] flex items-center justify-center p-4"
                role="dialog"
                aria-modal="true"
                aria-labelledby="tree-growth-dialog-title"
              >
                <div
                  className="absolute inset-0 bg-black/40"
                  onClick={() => setSelectedTreeId(null)}
                  aria-hidden
                />
                <div
                  className="relative w-full max-w-md max-h-[85vh] overflow-hidden rounded-3xl border-2 border-amber-200/80 bg-gradient-to-b from-amber-50/98 via-orange-50/98 to-yellow-50/98 shadow-2xl shadow-amber-200/30"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between gap-3 border-b border-amber-200/60 bg-white/50 px-5 py-4">
                    <h2 id="tree-growth-dialog-title" className="text-lg font-bold text-amber-900 flex items-center gap-2">
                      <span className="text-2xl" aria-hidden>🌱</span>
                      {TREE_DIMENSION_NAMES[selectedTreeId] ?? `Tree ${selectedTreeId}`} Growth Record
                    </h2>
                    <button
                      type="button"
                      onClick={() => setSelectedTreeId(null)}
                      className="rounded-full p-2 text-amber-700 hover:bg-amber-200/60 focus:outline-none focus:ring-2 focus:ring-amber-400"
                      aria-label="Close"
                    >
                      <span className="text-xl leading-none">×</span>
                    </button>
                  </div>
                  <div className="overflow-y-auto p-4 space-y-4 max-h-[calc(85vh-4.5rem)]">
                    <p className="rounded-xl bg-white/80 px-4 py-3 text-lg font-semibold text-amber-900">{farmValueMeaning(selectedTreeId)}</p>
                    {(treeGrowthDetails?.[selectedTreeId] ?? []).length === 0 ? (
                      <p className="text-amber-800/80 text-center py-6">This little tree has no growth records yet. Keep writing to water it!</p>
                    ) : (
                      [...(treeGrowthDetails?.[selectedTreeId] ?? [])]
                        .sort((a, b) => b.timestamp - a.timestamp)
                        .map((record, i) => (
                          <div
                            key={`${record.timestamp}-${i}`}
                            className="rounded-2xl border border-amber-200/70 bg-white/80 p-4 shadow-sm"
                          >
                            <p className="font-semibold text-amber-900 mb-1 flex items-center gap-2">
                              <span className="text-base">
                                {record.workType === "story" ? "📖" : record.workType === "drama" ? "🎭" : record.workType === "review" ? "⭐" : "✉️"}
                              </span>
                              {record.workTitle}
                            </p>
                            {record.triggerSentence && (
                              <>
                                <p className="text-xs font-semibold text-amber-700 mt-2">Trigger sentence</p>
                                <p className="text-sm text-amber-900 italic border-l-2 border-amber-300/70 pl-3 mt-1">
                                  「{record.triggerSentence}」
                                </p>
                              </>
                            )}
                            {!record.triggerSentence && record.overallEvidence && (
                              <>
                                <p className="text-xs font-semibold text-amber-700 mt-2">Overall evidence</p>
                                <p className="text-sm text-amber-900 border-l-2 border-amber-300/70 pl-3 mt-1 leading-relaxed">
                                  {record.overallEvidence}
                                </p>
                              </>
                            )}
                            {record.reason && (
                              <>
                                <p className="text-xs font-semibold text-amber-700 mt-3">Why this shows {TREE_DIMENSION_NAMES[selectedTreeId] ?? "this value"}</p>
                                <p className="text-sm text-amber-800/95 leading-relaxed mt-1">
                                  {record.reason}
                                </p>
                              </>
                            )}
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Cagent: hover the bear to see “click”; Hello there stays visible otherwise */}
            <button
              ref={cagentTriggerRef}
              data-farm-guide={!isOtherFarm ? 'cagent' : undefined}
              type="button"
              className="absolute z-30 w-36 h-40 -translate-x-1/2 -translate-y-1/2 border-0 focus:outline-none bg-transparent cursor-pointer"
              style={{
                left: `${cagentTriggerPosition.x}%`,
                top: `${cagentTriggerPosition.y}%`,
                width: "7.4%",
                height: "20%",
              }}
              onMouseEnter={() => setCagentHoverTrigger(true)}
              onMouseLeave={() => setCagentHoverTrigger(false)}
              onClick={handleCagentOpen}
              aria-label="Open Cagent"
              aria-expanded={cagentBubbleOpen}
            />

            {isOtherFarm && <div
              className="pointer-events-none absolute z-20"
              style={{
                left: "49.7%",
                top: "43.7%",
                width: "1.04%",
                aspectRatio: "1",
                transform: "translate(-50%, -50%) rotate(-11deg)",
              }}
            >
              <img
                src="/whitelogo.webp"
                alt="Sweater logo"
                className="h-full w-full object-contain select-none"
                draggable={false}
              />
            </div>}
          </div>


        </div>

      <div
        ref={cagentBubbleRef}
        hidden={selectedTreeId != null || showOtherWritingMap || Boolean(selectedReview)}
        className={`farm-cagent-bubble fixed z-[80] rounded-2xl border border-amber-200/90 bg-[#fff6e4]/95 shadow-xl ${
          cagentBubbleOpen ? "w-[min(36rem,72vw)] px-4 py-2" : "max-w-xs px-4 py-2"
        } ${isOtherFarm ? "animate-pulse px-3 py-2" : ""} ${cagentBubbleOpen ? "pointer-events-auto" : "pointer-events-none"}`}
        role={cagentBubbleOpen ? "dialog" : undefined}
        aria-label={cagentBubbleOpen ? "Cagent conversation" : undefined}
        style={{
          left: !isOtherFarm && cagentBubbleOpen ? '58%' : cagentBubbleLeft,
          top: !isOtherFarm && cagentBubbleOpen ? '14%' : cagentBubbleTop,
          transform: !isOtherFarm && cagentBubbleOpen ? 'none' : "translate(-50%, -100%)",
          width: !isOtherFarm && cagentBubbleOpen ? 'min(36rem,40vw)' : undefined,
          maxHeight: isOtherFarm ? cagentMaxHeight : '65vh',
          overflowY: cagentBubbleOpen || isOtherFarm ? "auto" : undefined,
          color: "#5c3a1e",
          fontFamily: CAGENT_FARM_FONT,
        }}
      >
        {isOtherFarm ? (
          <p className="text-2xl leading-snug" style={{ fontFamily: CAGENT_FARM_FONT }}>
            {otherFarmBubbleStep === "intro"
              ? `Hello... Wait, you are not ${userId}, who are you?`
              : `You can click the writing board below to review ${userId}'s work. Leave your review and head out - ${userId} doesn't let me talk to strangers.`}
          </p>
        ) : cagentBubbleOpen ? (
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1 pr-9">
              <p className="whitespace-pre-wrap text-2xl leading-snug" style={{ fontFamily: CAGENT_FARM_FONT }}>
                {cagentLoading ? "..." : cagentGuideDisplay}
              </p>
              <form onSubmit={handleCagentSend} className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={cagentUserInput}
                  onChange={(e) => setCagentUserInput(e.target.value)}
                  placeholder="Talk to Cagent..."
                  className="flex-1 rounded-full border border-amber-300 bg-white/80 px-3 py-1.5 text-lg leading-none focus:outline-none focus:ring-0"
                  style={{ fontFamily: CAGENT_FARM_FONT }}
                />
                <button
                  type="submit"
                  onClick={handleCagentSend}
                  disabled={!cagentUserInput.trim() || cagentSending}
                  className="rounded-full bg-amber-700 px-4 py-1.5 text-lg font-semibold leading-none text-white hover:bg-amber-800 disabled:opacity-50"
                  style={{ fontFamily: CAGENT_FARM_FONT }}
                >
                  {cagentSending ? "Sending..." : "Send"}
                </button>
              </form>
            </div>
            <button
              type="button"
              onClick={(event) => { event.stopPropagation(); closeCagent() }}
              className="farm-cagent-close absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full border border-amber-200 bg-white text-xl leading-none text-amber-800 hover:bg-amber-50"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        ) : (
          <p className="leading-none" style={{ fontFamily: CAGENT_FARM_FONT, fontSize: 'clamp(16px, 1.15vw, 20px)' }}>
            {cagentGreeting}
          </p>
        )}
      </div>

      {showOtherWritingMap && (
        <div
          className="fixed inset-0 z-[130]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="other-writing-map-title"
        >
          <div className="absolute inset-0 bg-black/65" onClick={() => setShowOtherWritingMap(false)} aria-hidden />

          <div className="relative flex h-full w-full flex-col overflow-hidden">
            <img
              src={currentOtherMapChapter?.mapImageUrl || getDefaultMapImageForChapter(otherMapChapterIndex)}
              alt={`${userId}'s writing map`}
              className="absolute inset-0 h-full w-full object-cover"
              draggable={false}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/35 via-transparent to-slate-950/45" />

            <div className="relative z-10 flex items-center justify-between gap-3 px-4 py-4">
              <button
                type="button"
                onClick={() => setShowOtherWritingMap(false)}
                className="rounded-full border border-white/60 bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-white/25"
              >
                Close
              </button>

              <div className="rounded-full border border-white/60 bg-black/25 px-4 py-2 text-center text-white backdrop-blur">
                <p id="other-writing-map-title" className="text-sm font-bold">
                  {userId}&apos;s Writing Map
                </p>
                <p className="text-xs text-white/85">
                  Chapter {otherMapChapterIndex + 1} • {currentOtherMapChapter?.mapFlags.length ?? 0} flags
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOtherMapChapterIndex((prev) => Math.max(0, prev - 1))}
                  disabled={otherMapChapterIndex <= 0}
                  className="rounded-full border border-white/60 bg-white/15 px-3 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setOtherMapChapterIndex((prev) =>
                      Math.min((otherMapState?.chapters.length ?? 1) - 1, prev + 1)
                    )
                  }
                  disabled={otherMapChapterIndex >= (otherMapState?.chapters.length ?? 1) - 1}
                  className="rounded-full border border-white/60 bg-white/15 px-3 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>

            <div className="relative z-10 flex-1">
              {currentOtherMapChapter?.currentPin && (
                <div
                  className="absolute -translate-x-1/2 -translate-y-full"
                  style={{
                    left: `${currentOtherMapChapter.currentPin.x}%`,
                    top: `${currentOtherMapChapter.currentPin.y}%`,
                  }}
                >
                  <div className="flex flex-col items-center gap-1">
                    <img src="/pin.webp" alt="Start pin" className="h-12 w-12 object-contain drop-shadow-lg" draggable={false} />
                    <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-purple-700 shadow">
                      Start
                    </span>
                  </div>
                </div>
              )}

              {currentOtherMapChapter?.mapFlags.map((flag, index) => {
                const colors = [
                  "from-pink-100 to-pink-200 border-pink-300 text-pink-800",
                  "from-purple-100 to-purple-200 border-purple-300 text-purple-800",
                  "from-emerald-100 to-emerald-200 border-emerald-300 text-emerald-800",
                  "from-sky-100 to-sky-200 border-sky-300 text-sky-800",
                  "from-amber-100 to-amber-200 border-amber-300 text-amber-800",
                ]
                const colorClass = colors[index % colors.length]
                return (
                  <div
                    key={flag.id}
                    className="absolute -translate-x-1/2 -translate-y-full"
                    style={{ left: `${flag.x}%`, top: `${flag.y}%` }}
                    title={flag.content || flag.title}
                  >
                    <div className={`max-w-[180px] rounded-2xl border bg-gradient-to-r ${colorClass} px-3 py-1.5 shadow-xl`}>
                      <div className="flex items-center gap-2">
                        <Flag className="h-3.5 w-3.5 shrink-0 text-slate-800" />
                        <span className="font-hand text-xs font-extrabold leading-tight text-slate-900 [overflow-wrap:anywhere]">
                          {flag.title}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}

              {!otherMapLoading && (currentOtherMapChapter?.mapFlags.length ?? 0) === 0 && !currentOtherMapChapter?.currentPin && (
                <div className="absolute left-1/2 top-1/2 w-[min(90vw,420px)] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-white/60 bg-black/35 px-6 py-5 text-center text-white shadow-2xl backdrop-blur">
                  <p className="text-lg font-bold">No writing pins yet</p>
                  <p className="mt-2 text-sm text-white/85">
                    This student has not saved a visible writing map marker yet.
                  </p>
                </div>
              )}

              {otherMapLoading && (
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/60 bg-black/35 px-5 py-3 text-sm font-semibold text-white shadow-xl backdrop-blur">
                  Loading writing map...
                </div>
              )}

              {otherMapError && !otherMapLoading && (
                <div className="absolute bottom-5 left-1/2 w-[min(92vw,480px)] -translate-x-1/2 rounded-2xl border border-rose-200/70 bg-rose-50/95 px-4 py-3 text-sm text-rose-800 shadow-xl">
                  {otherMapError}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: selected review + work content */}
      {selectedReview && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setSelectedReview(null)}
          >
            <div
              className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl border-2 border-primary/20 bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-hand text-lg font-bold text-foreground">
                  {selectedReview.workTitle || "Review"}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedReview(null)}
                  className="rounded-xl"
                >
                  Close
                </Button>
              </div>
              <div className="space-y-4">
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                  <p className="mb-1 font-hand text-xs font-bold text-muted-foreground">Review by {selectedReview.reviewerUsername}</p>
                  <p className="whitespace-pre-wrap font-hand text-sm text-foreground">
                    {selectedReview.content}
                  </p>
                </div>
                {selectedReview.workContent && (
                  <div className="rounded-xl border border-border bg-muted/30 p-4">
                    <p className="mb-1 font-hand text-xs font-bold text-muted-foreground">Your work</p>
                    <pre className="whitespace-pre-wrap font-hand text-sm text-foreground">
                      {selectedReview.workContent}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      {!isOtherFarm && (
        <><FarmMuteButton isMuted={isMuted} onToggle={() => setIsMuted((prev) => !prev)} /><FarmGuide /></>
      )}
    </div>
  )
}
