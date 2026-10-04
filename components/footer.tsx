"use client"

import Image from "next/image"
import { usePathname } from "next/navigation"
import { useMainStage } from "@/hooks/use-main-stage"

export default function Footer() {
  const pathname = usePathname()
  const stage = useMainStage()

  // Hide footer on admin routes
  if (pathname?.startsWith('/admin')) {
    return null
  }

  // Login / 教师工作台：与沉浸式页面一致，隐藏底部 EdUHK 横条
  if (stage === "login" || stage === "dashboard") {
    return null
  }

  return (
    <footer
      className="site-footer"
    >
      <Image
        src="/footer.webp"
        alt="Strategic Plan Start-up Project @EdUHK footer"
        width={12000}
        height={1444}
        className="absolute inset-x-[-1px] bottom-[-1px] block h-full w-[calc(100%+2px)]"
        priority={false}
      />
      <div className="footer-content">
        <div className="footer-logos">
          <Image
            src="/EdUHK_Signature_RGBWhite@4x-1-1024x336.webp"
            alt="The Education University of Hong Kong logo"
            width={280}
            height={92}
            className="footer-eduhk"
            priority={false}
          />
          <Image
            src="/MIT_Logo2-1024x290.webp"
            alt="MIT logo"
            width={210}
            height={60}
            className="footer-mit"
            priority={false}
          />
        </div>

        <div className="footer-credit">
          <p>
            Strategic Plan Start-up Project @EdUHK
          </p>
          <p>
            Copyright © 2026 The Education University of Hong Kong. All Rights Reserved.
          </p>
        </div>
        <details className="footer-notice">
          <summary>AI notice</summary>
          <p>
            <strong>Disclaimer:</strong>
            {" "}This website uses AI to help you learn and create. Sometimes AI may make mistakes or give incorrect information.
            Please think carefully, check important information, and ask a teacher or parent if you are unsure.
            <br />
            By using this website, you understand that AI is not always perfect.
          </p>
        </details>
      </div>
    </footer>
  )
}


