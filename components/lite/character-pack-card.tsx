'use client';
import {Trash2} from 'lucide-react';
import type {Character} from '@/lib/types';
import {PortraitCard} from './common';

export default function CharacterPackCard({character,selected,onClick,onDelete}:{character:Character;selected?:boolean;onClick:()=>void;onDelete?:()=>void}){
    return <div className="character-pack-card"><PortraitCard character={character} selected={selected} onClick={onClick}/>{onDelete&&<button type="button" className="character-pack-delete" aria-label={`Delete ${character.name} from my character pack`} onClick={onDelete}><Trash2 size={17}/>Delete</button>}</div>;
}
