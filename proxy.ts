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
  <link rel="preload" as="image" href="/maintenance-cagent.webp" media="(min-aspect-ratio: 1/1)">
  <link rel="preload" as="image" href="/maintenance-cagent-portrait.webp" media="(max-aspect-ratio: 1/1)">
  <style>
    *{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#eed6af}
    body{font-family:Arial,sans-serif;color:#55381e}
    main{position:fixed;inset:0;width:100vw;height:100svh}
    picture,img{display:block;width:100%;height:100%}
    img{object-fit:cover;object-position:center}
    .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
  </style>
</head>
<body><main>
  <h1 class="sr-only">CWriteLite is temporarily closed for maintenance</h1>
  <picture>
    <source media="(max-aspect-ratio: 1/1)" srcset="/maintenance-cagent-portrait.webp">
    <img src="/maintenance-cagent.webp" width="1672" height="941" alt="Cagent the bear beside a wooden sign: CWriteLite — Temporarily Closed. We're taking a short break. Thank you for your patience.">
  </picture>
  <p class="sr-only" lang="zh-Hans">平台正在维护中，暂时暂停开放。感谢你的耐心与理解。</p>
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
