/** Selected deployment target. This module does not submit or bill a video task. */
export const SEEDANCE_VIDEO_MODEL = 'doubao-seedance-2-5-260628';
export const ARK_VIDEO_API_BASE = 'https://ark.cn-beijing.volces.com/api/v3';

export type DramaVideoTarget = {
    provider:'volcengine-ark';
    model:string;
    createTaskUrl:string;
    getTaskUrlTemplate:string;
    status:'planned';
};

export function arkVideoTarget(model=SEEDANCE_VIDEO_MODEL):DramaVideoTarget {
    return {
        provider:'volcengine-ark',
        model:model.trim()||SEEDANCE_VIDEO_MODEL,
        createTaskUrl:ARK_VIDEO_API_BASE+'/contents/generations/tasks',
        getTaskUrlTemplate:ARK_VIDEO_API_BASE+'/contents/generations/tasks/{id}',
        status:'planned',
    };
}
