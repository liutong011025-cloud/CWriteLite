'use client';
import type {Story} from '@/lib/types';
import {draftRecap} from '@/lib/draft-recap';
import {Modal} from './common';

export default function DiscardDraft({work,busy,onClose,onConfirm}:{work:Story;busy:boolean;onClose:()=>void;onConfirm:()=>void}) {
    const recap=draftRecap(work);
    return <Modal title="Delete this unfinished writing?" onClose={()=>{if(!busy)onClose();}}>
        <section className="draft-recap"><span className="draft-recap-type">{recap.type} · {recap.progress}</span><h3>{work.title}</h3>
            <dl><div><dt>Characters</dt><dd>{recap.cast}</dd></div>{recap.setting&&<div><dt>Setting</dt><dd>{recap.setting}</dd></div>}</dl>
            {recap.excerpt?<blockquote>{recap.excerpt}</blockquote>:<p>You haven’t written any lines yet. Your plan is saved here.</p>}
        </section>
        <p>This deletes this draft and its map pin. Your character pack stays safe. You cannot undo this.</p>
        <div className="draft-delete-actions"><button className="outline-button" disabled={busy} onClick={onClose}>Keep my writing</button><button className="danger-button" disabled={busy} onClick={onConfirm}>{busy?'Deleting…':'Yes, delete this draft'}</button></div>
    </Modal>;
}
