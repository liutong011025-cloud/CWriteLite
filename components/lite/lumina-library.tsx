'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Star, ArrowLeft, ArrowRight, X, Send } from 'lucide-react';
import { canUseLuminaLibrary, LIBRARY_STORIES, BONUS_LIBRARY_STORY } from '@/lib/lumina-library-demo';
import './lumina-library.css';

type Comment = { text: string; rating: number };

export default function LuminaLibrary({ username, open = false, onClose = () => {} }: { username?: string; open?: boolean; onClose?: () => void }) {
  if (!open || !canUseLuminaLibrary(username)) return null;
  return <LibraryRoom key={username} username={username!} onClose={onClose} />;
}

function LibraryRoom({ username, onClose }: { username: string; onClose: () => void }) {
  const books = [...LIBRARY_STORIES.filter(book => book.author !== username), { ...BONUS_LIBRARY_STORY, author: username === 'inno1' ? 'inno2' : 'inno1' }];
  const [selected, setSelected] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [draft, setDraft] = useState('');
  const [rating, setRating] = useState(0);
  const [notice, setNotice] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const shelf = useRef<HTMLDivElement>(null);
  const [shelfEdges, setShelfEdges] = useState({ start: true, end: false });
  const book = books.find(item => item.title === selected);

  function updateShelfEdges() {
    const node = shelf.current;
    if (node) setShelfEdges({ start: node.scrollLeft < 2, end: node.scrollLeft + node.clientWidth >= node.scrollWidth - 2 });
  }
  function slide(direction: number) {
    const node = shelf.current;
    node?.scrollBy({ left: direction * node.clientWidth * .8, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }
  useEffect(() => {
    const node = shelf.current;
    if (!node) return;
    updateShelfEdges();
    const observer = new ResizeObserver(updateShelfEdges);
    observer.observe(node);
    return () => observer.disconnect();
  }, [selected]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const node = dialog.current;
    node?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { node?.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  useEffect(() => { title.current?.focus(); }, [selected]);
  function select(storyTitle: string | null) { setSelected(storyTitle); setDraft(''); setRating(0); setNotice(''); }

  return createPortal(<dialog ref={dialog} className="lumina-dialog" aria-labelledby="lumina-heading" data-process-ignore="true" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="lumina-room">
      <header className="lumina-header">
        <img src="/lumina-library.svg" alt="" width="76" height="68" />
        <div><p>INNO CARNIVAL · READING CORNER</p><h1 id="lumina-heading">LuminAI Library</h1></div>
        <button className="lumina-close" onClick={onClose} aria-label="Back to My Farm"><X size={24}/></button>
      </header>
      <div className="lumina-content">
        {book ? <>
          <button className="lumina-back" onClick={() => select(null)}><ArrowLeft size={17}/> Back to the bookshelf</button>
          <div className="lumina-reading">
            <article className="lumina-paper"><span className="lumina-byline">STORY BY {book.author.toUpperCase()} · SAMPLE STORY</span><h2 ref={title} tabIndex={-1}>{book.title}</h2><p className="lumina-theme">{book.theme}</p>{book.paragraphs.map((paragraph, i) => <p key={i}>{paragraph}</p>)}<BookOpen className="lumina-end" aria-hidden="true"/></article>
            <aside className="lumina-feedback"><h3>A note for the writer</h3><p>What did you enjoy? What could happen next?</p>
              <form onSubmit={event => { event.preventDefault(); if (!draft.trim()) return; setComments(current => ({ ...current, [book.title]: [...(current[book.title] || []), { text: draft.trim(), rating }] })); setDraft(''); setRating(0); setNotice('Your note has been added for this visit.'); }}>
                <fieldset><legend>Your rating <small>(optional)</small></legend><div className="lumina-stars">{[1,2,3,4,5].map(value => <label key={value}><input type="radio" name="lumina-rating" value={value} checked={rating === value} onChange={() => setRating(value)} aria-label={`${value} ${value === 1 ? 'star' : 'stars'}`}/><Star size={25} fill={value <= rating ? 'currentColor' : 'none'}/></label>)}</div></fieldset>
                <label htmlFor="lumina-comment">Your comment</label><textarea id="lumina-comment" value={draft} maxLength={500} onChange={event => setDraft(event.target.value)} placeholder="I liked the part where…" rows={5}/><small>{draft.length}/500</small>
                <button className="lumina-send" type="submit" disabled={!draft.trim()}><Send size={16}/> Add my note</button>
              </form>
              <p className="lumina-notice" role="status">{notice}</p>
              {(comments[book.title] || []).map((comment, index) => <div className="lumina-note" key={index}><b>{username}</b>{comment.rating > 0 && <span aria-label={`${comment.rating} out of 5 stars`}>{'★'.repeat(comment.rating)}</span>}<p>{comment.text}</p></div>)}
              <p className="lumina-demo-note">Exhibition preview · Notes stay only for this visit and clear when you leave the library.</p>
            </aside>
          </div>
        </> : <>
          <h2 ref={title} tabIndex={-1}>A little shelf of big ideas</h2><p className="lumina-intro">Explore stories from the other INNO readers. Open a book and leave a kind note.</p>
          <div className="lumina-shelf-toolbar"><span>5 stories · Scroll to explore</span><div><button aria-label="Previous books" aria-controls="lumina-bookshelf" disabled={shelfEdges.start} onClick={() => slide(-1)}><ArrowLeft size={20}/></button><button aria-label="Next books" aria-controls="lumina-bookshelf" disabled={shelfEdges.end} onClick={() => slide(1)}><ArrowRight size={20}/></button></div></div>
          <div ref={shelf} id="lumina-bookshelf" className="lumina-books" role="region" aria-label="Story bookshelf" onScroll={updateShelfEdges}>{books.map((item, index) => <button key={item.title} className={`lumina-book lumina-book-${index}`} onClick={() => select(item.title)}><div className="lumina-cover"><img src={item.art} alt=""/><BookOpen size={24} aria-hidden="true"/><h3>{item.title}</h3><span>{item.author.toUpperCase()}</span></div><p>{item.theme}</p><b>Read story →</b></button>)}</div>
          <p className="lumina-demo-note">INNO Carnival sample collection · Prewritten stories for this exhibition experience.</p>
        </>}
      </div>
    </div>
  </dialog>, document.body);
}
