'use client';
import { Component, lazy, Suspense, useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react';
import { retryPageImport } from '@/lib/retry-page-import';

type BoundaryProps = { children: ReactNode; onRetry?: () => void; silent?: boolean };
export class ScreenBoundary extends Component<BoundaryProps, { failed: boolean }> {
    state = { failed: false };
    static getDerivedStateFromError() { return { failed: true }; }
    componentDidCatch(error: Error) { console.warn('writing_screen_unavailable', error.name); }
    render() {
        if (!this.state.failed) return this.props.children;
        if (this.props.silent) return null;
        return <section className="cream-panel" role="status" style={{ padding: 32, margin: 24, textAlign: 'center' }}>
            <p>This part of the page could not open. Your draft is still here.</p>
            <button className="purple-button" onClick={() => { this.setState({ failed: false }); this.props.onRetry?.(); }}>Try again</button>
        </section>;
    }
}

/** A retry creates a fresh lazy component; React caches a rejected import on the old one. */
export function recoverableView<P extends object>(load: () => Promise<{ default: ComponentType<P> }>, silent = false) {
    return function RecoverableView(props: P) {
        const [attempt, setAttempt] = useState(0), [mounted, setMounted] = useState(false);
        useEffect(() => setMounted(true), []);
        const View = useMemo(() => lazy(() => retryPageImport(load)), [attempt]);
        const loading = silent ? null : <p role="status" style={{ padding: 24 }}>Opening your page…</p>;
        if (!mounted) return loading;
        return <ScreenBoundary key={attempt} silent={silent} onRetry={() => setAttempt(value => value + 1)}><Suspense fallback={loading}><View {...props}/></Suspense></ScreenBoundary>;
    };
}
