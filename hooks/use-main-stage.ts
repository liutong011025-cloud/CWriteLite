"use client"

import { useEffect, useState } from "react"

function readMainStageFromDom(): string | null {
  if (typeof document === "undefined") return null
  return document.querySelector("main[data-stage]")?.getAttribute("data-stage") ?? null
}

/** Tracks `data-stage` on the inner `<main>` from `app/page.tsx` (SPA). */
export function useMainStage(): string | null {
  const [stage, setStage] = useState<string | null>(null)

  useEffect(() => {
    const read = () => {
      setStage(readMainStageFromDom())
    }

    const timeoutId = window.setTimeout(read, 50)
    read()

    const observer = new MutationObserver(read)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-stage", "data-login-page", "data-no-header", "class", "id"],
    })

    const intervalId = window.setInterval(read, 300)

    return () => {
      clearTimeout(timeoutId)
      clearInterval(intervalId)
      observer.disconnect()
    }
  }, [])

  return stage
}
