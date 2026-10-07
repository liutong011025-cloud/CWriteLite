import { NextResponse } from 'next/server';

// Temporary front-door maintenance mode. Remove this file to reopen the platform.
// API and asset routes stay reachable so open writing tabs can save and deliver queued records.
const maintenanceHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <meta name="theme-color" content="#eed6af">
  <title>CWriteLite · Taking a short break</title>
  <link rel="preload" as="image" href="/maintenance-cagent.webp">
  <style>
    *{box-sizing:border-box}html,body{margin:0;min-height:100%;background:#eed6af}
    body{font-family:Arial,sans-serif;color:#55381e}
    main{min-height:100svh;display:flex;flex-direction:column;justify-content:center;align-items:center;background:linear-gradient(180deg,#c9d9eb 0%,#f6dfb2 55%,#c4cf8e 100%)}
    img{display:block;width:100%;height:100svh;object-fit:contain}
    .notice{position:fixed;bottom:0;left:0;right:0;margin:0;padding:13px 20px;text-align:center;background:rgba(255,249,230,.94);font-size:15px;line-height:1.5}
    .notice strong{font-weight:700}.notice span{display:block;font-size:13px}
    .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
    @media(max-width:700px){img{height:auto;max-height:75svh;object-fit:contain}.notice{position:static;margin-top:24px;background:transparent;font-size:18px;padding:16px 22px}.notice span{font-size:15px}}
  </style>
</head>
<body><main>
  <h1 class="sr-only">CWriteLite is temporarily closed for maintenance</h1>
  <img src="/maintenance-cagent.webp" width="1672" height="941" alt="Cagent the bear beside a wooden sign: CWriteLite — Temporarily Closed. We're taking a short break. Thank you for your patience.">
  <p class="notice"><strong>We’re making a few improvements. Please visit us again later.</strong><span lang="zh-Hans">平台正在维护中，暂时暂停开放。感谢你的耐心与理解。</span></p>
</main></body>
</html>`;

export function proxy() {
  return new NextResponse(maintenanceHtml, {
    status: 503,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
      'Retry-After': '3600',
      'X-Robots-Tag': 'noindex, nofollow',
      'X-CWrite-Maintenance': 'front-door',
    },
  });
}

export const config = { matcher: ['/'] };
