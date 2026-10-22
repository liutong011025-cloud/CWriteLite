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

  // Keep the teacher workspace immersive; the login page has a project information footer.
  if (stage === "dashboard" || stage === null) {
    return null
  }

  const isPortal = stage === "login"

  const logos = (
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
  )

  const notice = (
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
  )

  if (isPortal) {
    return (
      <footer className="site-footer portal-footer" aria-label="Project information">
        <div className="portal-footer-content">
          {logos}
          <div className="portal-footer-copy">
            <p className="portal-project-name">Strategic Plan Start-up Project @EdUHK</p>
            <address className="portal-contact">
              <span>Contact PI</span>
              <a href="mailto:yyin@eduhk.hk">
                <strong>Yang Yin Nicole</strong>
                <span>yyin@eduhk.hk</span>
              </a>
            </address>
            <p className="portal-copyright">
              Copyright © 2026 The Education University of Hong Kong. All Rights Reserved.
            </p>
            {notice}
          </div>
        </div>
      </footer>
    )
  }

  return (
    <footer
      className="site-footer"
      aria-label="Project information"
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
        {logos}

        <div className="footer-credit">
          <p>
            Strategic Plan Start-up Project @EdUHK
          </p>
          <p>
            Copyright © 2026 The Education University of Hong Kong. All Rights Reserved.
          </p>
        </div>
        {notice}
      </div>
    </footer>
  )
}


