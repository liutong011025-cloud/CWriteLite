'use client';
import { useEffect, useState } from 'react';
import { LoaderCircle } from 'lucide-react';

export default function PageTransition({ message }: { message: string }) {
    const [takingLonger, setTakingLonger] = useState(false);
    useEffect(() => {
        const timer = setTimeout(() => setTakingLonger(true), 8000);
        return () => clearTimeout(timer);
    }, []);
    return <div className="page-transition-backdrop">
        <div className="page-transition-status" role="status" aria-live="polite">
            <LoaderCircle size={28} aria-hidden="true"/>
            <b>{message}</b>
            <small>{takingLonger ? 'This is taking a little longer. Your writing is still here.' : 'Please wait a moment.'}</small>
        </div>
    </div>;
}
