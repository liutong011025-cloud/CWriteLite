'use client';
import { useEffect, useRef } from 'react';
import { processContext } from '@/lib/process-bus';
import type { ProcessContext } from '@/lib/process-coding';
import { startProcessClient } from '@/lib/process-client';
export default function ProcessRecorder({userId,context}:{userId:string;context:ProcessContext}) {
  const initial=useRef(context);
  useEffect(()=>{try{return startProcessClient(userId,initial.current);}catch(error){console.warn('Behavior observer unavailable:',error);return undefined;}},[userId]);
  useEffect(()=>{processContext(context);},[context.stage,context.workId,context.workType,context.sectionIndex,context.sceneId,context.characterId]);
  return null;
}
