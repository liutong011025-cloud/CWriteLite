import { readFile } from "node:fs/promises";
import path from "node:path";
import type { NextRequest } from "next/server";
import { fal } from "@fal-ai/client";
import { FAL_IMAGE_EDIT_MODEL, FAL_IMAGE_MODEL, getFalKey, } from "@/lib/fal-images";
export const FAL_NANO_BANANA_MODEL = FAL_IMAGE_MODEL;
export const FAL_NANO_BANANA_EDIT_MODEL = FAL_IMAGE_EDIT_MODEL;
type FalUploadResult = string | {
    url?: string;
} | null | undefined;
export { getFalKey };
const normalizeUploadedUrl = (value: FalUploadResult) => {
    if (typeof value === "string")
        return value;
    if (value && typeof value === "object" && typeof value.url === "string")
        return value.url;
    return "";
};
const isLocalHostname = (hostname: string) => {
    const h = hostname.toLowerCase();
    return h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h.endsWith(".local");
};
const mimeFromPathname = (pathname: string) => {
    const lower = pathname.toLowerCase();
    if (lower.endsWith(".png"))
        return "image/png";
    if (lower.endsWith(".jpg") || lower.endsWith(".jpeg"))
        return "image/jpeg";
    if (lower.endsWith(".webp"))
        return "image/webp";
    return "image/webp";
};
async function uploadBufferToFal(buffer: Buffer, mime: string): Promise<string | null> {
    const blob = new Blob([new Uint8Array(buffer)], { type: mime });
    const uploadResult = (await fal.storage.upload(blob as Blob)) as FalUploadResult;
    const url = normalizeUploadedUrl(uploadResult);
    return url && /^https?:\/\//i.test(url) ? url : null;
}
/** Fal needs a public URL — upload local / data images to fal storage. */
export function normalizeAbsoluteImageUrl(request: NextRequest, raw: string) {
    const trimmed = raw.trim();
    if (!trimmed)
        return "";
    if (/^https?:\/\//i.test(trimmed))
        return trimmed;
    if (trimmed.startsWith("/")) {
        const envBase = (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "").trim();
        if (envBase)
            return `${envBase.replace(/\/$/, "")}${trimmed}`;
        const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
        const proto = request.headers.get("x-forwarded-proto") || "http";
        if (host)
            return `${proto}://${host}${trimmed}`;
    }
    return "";
}
export async function resolveMapImageUrlForFal(request: NextRequest, imageRef: string): Promise<string | null> {
    const trimmed = imageRef.trim();
    if (!trimmed)
        return null;
    if (/^data:image\/[a-z0-9.+-]+;base64,/i.test(trimmed)) {
        const match = trimmed.match(/^data:(.*?);base64,(.+)$/i);
        if (!match)
            return null;
        const mime = match[1] || "image/png";
        const buf = Buffer.from((match[2] || "").replace(/\s+/g, ""), "base64");
        return uploadBufferToFal(buf, mime);
    }
    const absolute = normalizeAbsoluteImageUrl(request, trimmed);
    if (!absolute)
        return null;
    let url: URL;
    try {
        url = new URL(absolute);
    }
    catch {
        return null;
    }
    if (!isLocalHostname(url.hostname)) {
        return absolute;
    }
    const pathname = decodeURIComponent(url.pathname);
    if (pathname.startsWith("/") && !pathname.includes("..")) {
        try {
            const filePath = path.join(process.cwd(), "public", pathname.replace(/^\//, ""));
            const buf = await readFile(filePath);
            return uploadBufferToFal(buf, mimeFromPathname(pathname));
        }
        catch {
            // fall through
        }
    }
    try {
        const res = await fetch(absolute, { signal: AbortSignal.timeout(20000) });
        if (!res.ok)
            return null;
        const buf = Buffer.from(await res.arrayBuffer());
        const mime = res.headers.get("content-type")?.split(";")[0]?.trim() || mimeFromPathname(pathname);
        return uploadBufferToFal(buf, mime);
    }
    catch {
        return null;
    }
}
export function extractFalImageUrl(data: unknown): string | null {
    const record = data as {
        images?: Array<{
            url?: string;
        }>;
        description?: string;
    };
    const url = record?.images?.[0]?.url;
    return typeof url === "string" && url.trim() ? url : null;
}
