import { fal } from "@fal-ai/client";
export const FAL_IMAGE_MODEL = "fal-ai/nano-banana-2";
export const FAL_IMAGE_EDIT_MODEL = "fal-ai/nano-banana-2/edit";
export type FalAspectRatio = "auto" | "21:9" | "16:9" | "3:2" | "4:3" | "5:4" | "1:1" | "4:5" | "3:4" | "2:3" | "9:16";
type GenerateFalImageOptions = {
    prompt: string;
    aspectRatio?: string;
    imageUrls?: string[];
    outputFormat?: "png" | "jpeg" | "webp";
    resolution?: "0.5K" | "1K" | "2K" | "4K";
};
export class FalImageError extends Error {
    status?: number;
    detail?: string;
    constructor(message: string, options?: {
        status?: number;
        detail?: string;
    }) {
        super(message);
        this.name = "FalImageError";
        this.status = options?.status;
        this.detail = options?.detail;
    }
}
export const getFalKey = () => process.env.FAL_KEY || null;
export function normalizeFalAspectRatio(value?: string): FalAspectRatio {
    const supported = new Set<FalAspectRatio>([
        "auto",
        "21:9",
        "16:9",
        "3:2",
        "4:3",
        "5:4",
        "1:1",
        "4:5",
        "3:4",
        "2:3",
        "9:16",
    ]);
    return supported.has(value as FalAspectRatio) ? (value as FalAspectRatio) : "1:1";
}
export function extractFalImageResult(data: unknown): {
    imageUrl: string;
    description: string;
} {
    const record = data as {
        images?: Array<{
            url?: string;
        }>;
        description?: string;
    };
    const imageUrl = record?.images?.[0]?.url?.trim() || "";
    if (!imageUrl) {
        throw new FalImageError("Fal response did not contain an image URL.", {
            detail: JSON.stringify(data),
        });
    }
    return { imageUrl, description: record.description || "" };
}
export async function generateFalImage(options: GenerateFalImageOptions) {
    if (!getFalKey()) {
        throw new FalImageError("FAL_KEY is not configured.", { status: 500 });
    }
    const prompt = options.prompt?.trim();
    if (!prompt) {
        throw new FalImageError("Prompt cannot be empty.", { status: 400 });
    }
    const imageUrls = options.imageUrls?.map((url) => url.trim()).filter(Boolean);
    const model = imageUrls?.length ? FAL_IMAGE_EDIT_MODEL : FAL_IMAGE_MODEL;
    try {
        const result = await fal.subscribe(model, {
            input: {
                prompt,
                num_images: 1,
                aspect_ratio: normalizeFalAspectRatio(options.aspectRatio),
                output_format: options.outputFormat || "png",
                resolution: options.resolution || "1K",
                limit_generations: true,
                safety_tolerance: "4",
                ...(imageUrls?.length ? { image_urls: imageUrls } : {}),
            },
            logs: false,
        });
        return extractFalImageResult(result.data);
    }
    catch (error: unknown) {
        if (error instanceof FalImageError)
            throw error;
        const err = error as {
            message?: string;
            status?: number;
            body?: unknown;
        };
        throw new FalImageError(err.message || "Fal image request failed.", {
            status: err.status,
            detail: err.body ? JSON.stringify(err.body) : undefined,
        });
    }
}
