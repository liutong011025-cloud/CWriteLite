import { SEEDANCE_VIDEO_MODEL, ARK_VIDEO_API_BASE } from './ark-video-config';

export class ArkVideoError extends Error {
    status: number;
    code: string;
    requestId: string;
    constructor(message: string, status = 502, code = 'provider_error', requestId = '') {
        super(message);
        this.name = 'ArkVideoError';
        this.status = status;
        this.code = code;
        this.requestId = requestId;
    }
}

type ArkTask = { id?: string; status?: string; content?: { video_url?: string }; error?: { code?: string; message?: string } };

export function videoFailureMessage(error:unknown){
    if(error instanceof ArkVideoError&&error.code==='ModelNotOpen')return 'Seedance 2.5 is not enabled for the connected Ark account. Enable the model in Ark, then try again.';
    if(error instanceof ArkVideoError&&(error.status===401||error.status===403))return 'Ark did not accept the video API key or its permissions. Check the connected account and model access.';
    return 'The video service rejected this scene. Check the model access or try again.';
}

function key() {
    const value = process.env.ARK_API_KEY?.trim();
    if (!value) throw new ArkVideoError('ARK_API_KEY is not configured.', 500, 'not_configured');
    return value;
}

async function arkFetch(path: string, init: RequestInit) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), init.method === 'POST' ? 60000 : 20000);
    try {
        const response=await fetch(ARK_VIDEO_API_BASE + path, { ...init, signal: controller.signal, headers: { Authorization: `Bearer ${key()}`, 'Content-Type': 'application/json', ...init.headers } });
        const body=await response.json().catch(error=>{if(controller.signal.aborted)throw error;return {};}) as ArkTask;
        return {response,body};
    }
    catch (error) {
        if (controller.signal.aborted || error instanceof Error && error.name === 'AbortError') throw new ArkVideoError('The video service did not answer in time. Do not submit this again until the first result is checked.', 504, 'needs_confirmation');
        throw new ArkVideoError('The video service could not be reached.', 502, 'provider_error');
    }
    finally {
        clearTimeout(timer);
    }
}

/** Create one Seedance task. Callers must save the returned id before any retry. */
export async function createSeedanceTask(prompt: string, imageUrl?: string, duration = 5, model = process.env.ARK_VIDEO_MODEL?.trim() || SEEDANCE_VIDEO_MODEL, callbackUrl?:string) {
    const content: unknown[] = [{ type: 'text', text: prompt }];
    if (imageUrl && /^(https:\/\/|data:image\/(png|webp);base64,)/.test(imageUrl)) content.push({ type: 'image_url', image_url: { url: imageUrl }, role: 'first_frame' });
    const {response,body} = await arkFetch('/contents/generations/tasks', {
        method: 'POST',
        body: JSON.stringify({
            model,
            content,
            resolution: '720p',
            ratio: imageUrl ? 'adaptive' : '16:9',
            duration: Math.max(4, Math.min(15, Math.ceil(duration))),
            generate_audio: false,
            watermark: false,
            ...(callbackUrl?{callback_url:callbackUrl}:{}),
        }),
    });
    if (!response.ok || !body.id) throw new ArkVideoError(body.error?.message || 'The video service did not accept this scene.', response.ok ? 502 : response.status, body.error?.code || 'provider_error',response.headers.get('x-request-id')||'');
    return body.id;
}

export async function readSeedanceTask(taskId: string) {
    const {response,body} = await arkFetch('/contents/generations/tasks/' + encodeURIComponent(taskId), { method: 'GET' });
    if (!response.ok) throw new ArkVideoError(body.error?.message || 'The video task could not be read.', response.status, 'provider_error');
    const status = body.status === 'succeeded' ? 'succeeded' : ['failed','expired','cancelled','canceled'].includes(body.status || '') ? 'failed' : 'running';
    return { status, videoUrl: body.content?.video_url || '', error: body.error?.message || '' };
}
