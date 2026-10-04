import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import { currentUser } from "@/lib/session";
export const maxDuration = 120;
import { extractFalImageUrl, FAL_NANO_BANANA_EDIT_MODEL, getFalKey, resolveMapImageUrlForFal, } from "@/lib/fal-map";
type MapUpdateRequestBody = {
    userId: string;
    title: string;
    topic: string;
    mapX?: number;
    mapY?: number;
    /** Header / New Writing path: no pin, so Fal may place the new element anywhere. */
    freePlacement?: boolean;
    previousMapImageUrl: string;
    storySummary?: {
        characterName?: string | null;
        species?: string | null;
        setting?: string | null;
        conflict?: string | null;
        goal?: string | null;
        plotSummary?: string | null;
        structureType?: string | null;
    } | null;
    mapPrompt?: string;
};
const clampPercent = (value: unknown, fallback: number) => {
    if (typeof value !== "number" || Number.isNaN(value))
        return fallback;
    return Math.max(0, Math.min(100, value));
};
export async function POST(request: NextRequest) {
    if (!await currentUser())
        return NextResponse.json({ error: "Please log in." }, { status: 401 });
    try {
        if (!getFalKey() && !(process.env.NODE_ENV==='development'&&process.env.CWRITE_LOCAL_MOCK_IMAGES==='true')) {
            console.error("[map-update] FAL_KEY not configured");
            return NextResponse.json({ error: "map_unavailable", message: "Map is resting. Try again later." }, { status: 200 });
        }
        const body = (await request.json()) as MapUpdateRequestBody;
        const { userId, title, topic, mapX, mapY, previousMapImageUrl, storySummary, mapPrompt } = body;
        const freePlacement = Boolean(body.freePlacement);
        const safeMapX = clampPercent(mapX, 50);
        const safeMapY = clampPercent(mapY, 50);
        const safeTopic = (topic || "").trim();
        const safeTitle = (title || "Untitled").trim();
        if (!userId || !safeTopic || !previousMapImageUrl) {
            return NextResponse.json({ error: "bad_request", message: "Missing userId, topic, or previousMapImageUrl." }, { status: 400 });
        }
        if(process.env.NODE_ENV==='development'&&process.env.CWRITE_LOCAL_MOCK_IMAGES==='true') return NextResponse.json({imageUrl:previousMapImageUrl,mock:true,mapX:safeMapX,mapY:safeMapY,title:safeTitle});
        const resolvedImageUrl = await resolveMapImageUrlForFal(request, previousMapImageUrl);
        if (!resolvedImageUrl) {
            console.error("[map-update] Could not resolve base map for Fal edit.", { previousMapImageUrl });
            return NextResponse.json({
                error: "map_unavailable",
                message: "Could not load the current map for editing. Your old map is unchanged.",
            }, { status: 200 });
        }
        const characterName = storySummary?.characterName || null;
        const species = storySummary?.species || null;
        const detailedSetting = storySummary?.setting || null;
        const detailedConflict = storySummary?.conflict || null;
        const detailedGoal = storySummary?.goal || null;
        const plotSummary = storySummary?.plotSummary || null;
        const structureType = storySummary?.structureType || null;
        const extraPrompt = (mapPrompt || "").trim();
        const writingContext = `
Student's new writing step:
- Title: "${safeTitle}"
- Character: "${characterName || "Unknown hero"}" (species: "${species || "unknown creature"}")
- Topic / Setting: "${safeTopic}"

Story details (for inspiration only, do not render text):
- Setting detail: "${detailedSetting || safeTopic || "unspecified"}"
- Conflict detail: "${detailedConflict || "unspecified"}"
- Goal detail: "${detailedGoal || "unspecified"}"
- Plot summary: "${plotSummary || "unspecified"}"
- Story structure (if any): "${structureType || "unspecified"}"
`.trim();
        const pinnedPlacementTask = `
Coordinate system (very important for placement):
- Treat the map as a 2D canvas where (0, 0) is the TOP-LEFT corner and (100, 100) is the BOTTOM-RIGHT corner.
- The student's new step is centered near (${safeMapX}, ${safeMapY}) in this normalized coordinate system. Place the MAIN new visual focus close to this point.

Task:
- Focus your main new visual content on a **tiny local patch** centered exactly under the student's existing pin at (${safeMapX}, ${safeMapY}), roughly a circle with radius about 1.5-2% of the map width. The strongest new shapes and colors must stay inside this tiny patch.
- Treat (${safeMapX}, ${safeMapY}) as the center of the writing marker area from the previous map. The new writing-related element should appear directly at that pin location, not in a nearby region and not shifted to another landmark.
- Inside this small area, add or modify only compact terrain details, tiny paths, miniature buildings, small plants, tiny props, or very small environmental storytelling cues that reflect this new topic, the plot, and the character species. Keep them smaller and quieter than before.
- Avoid oversized landmarks, giant buildings, huge forests, large terrain blocks, or any bold focal object. New elements must feel subtle and map-scale, not poster-scale.
- Outside the local patch, the map should remain almost completely unchanged at a glance.
`.trim();
        const freePlacementTask = `
Placement (no pin / no coordinate):
- The student started writing without placing a flag on the map, so there is NO target location.
- Do NOT mention, invent, or follow any pin, flag, or (x, y) coordinate.
- Add a tiny new visual element that reflects this writing anywhere that already fits the existing world.

Task:
- Choose any suitable quiet spot on the map. The new marks may appear anywhere; do not cluster them at the center unless that already looks natural.
- Add or modify only compact terrain details, tiny paths, miniature buildings, small plants, tiny props, or very small environmental storytelling cues that reflect this new topic, the plot, and the character species.
- Avoid oversized landmarks, giant buildings, huge forests, large terrain blocks, or any bold focal object. New elements must feel subtle and map-scale, not poster-scale.
- The rest of the map should remain almost completely unchanged at a glance.
`.trim();
        const prompt = `
You are updating a student's personal writing adventure map using image editing.

Base image:
- Use the provided previous map image strictly as the base. Preserve its overall style, camera angle and layout.

${writingContext}

${freePlacement ? freePlacementTask : pinnedPlacementTask}

Very important:
- This MUST look like a natural evolution of the previous map, not a brand-new style.
- Keep the same overall palette, camera angle, and rendering style as the base image.
- Do NOT add UI, text labels, or logos. Leave space so the interface can overlay flags or titles later.
- ${extraPrompt || (freePlacement
            ? "Do not invent a whole new region; just evolve the existing map carefully, placing the new hint anywhere that fits."
            : "Do not invent a whole new region; just evolve the existing map carefully.")}
`.trim();
        console.info("[map-update] fal image-to-image", {
            model: FAL_NANO_BANANA_EDIT_MODEL,
            baseUrl: resolvedImageUrl.slice(0, 80),
            freePlacement,
            mapX: freePlacement ? null : safeMapX,
            mapY: freePlacement ? null : safeMapY,
        });
        const result = await fal.subscribe(FAL_NANO_BANANA_EDIT_MODEL, {
            input: {
                prompt,
                image_urls: [resolvedImageUrl],
                resolution: "1K",
                output_format: "webp",
                num_images: 1,
                limit_generations: true,
                safety_tolerance: 4,
            },
            logs: false,
        });
        const imageUrl = extractFalImageUrl(result.data);
        if (!imageUrl) {
            console.error("[map-update] Fal response missing image URL", result.data);
            return NextResponse.json({ error: "map_unavailable", message: "Could not update map image." }, { status: 200 });
        }
        const data = result.data as {
            description?: string;
        };
        return NextResponse.json({
            imageUrl,
            description: data?.description || "",
            topic: safeTopic,
            title: safeTitle,
            mapX: safeMapX,
            mapY: safeMapY,
            userId,
        });
    }
    catch (error) {
        console.error("[map-update] Error:", {
            message: (error as {
                message?: string;
            })?.message || "unknown",
            status: (error as {
                status?: number;
            })?.status,
            body: (error as {
                body?: unknown;
            })?.body,
        });
        return NextResponse.json({ error: "map_unavailable", message: "Something went wrong updating the map." }, { status: 200 });
    }
}
