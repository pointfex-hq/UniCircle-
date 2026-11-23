import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ItemVisual } from './visuals.jsx';

const heroItems = [
  { id: 'item-1', category: 'Books' },
  { id: 'item-0', category: 'Electronics' },
  { id: 'item-2', category: 'Study Supplies' },
];

export function HeroCollage() {
  const art = useRef(null);
  const running = useRef([]);

  function stop() {
    running.current.forEach(animation => animation.cancel());
    running.current = [];
  }

  function play() {
    stop();
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const [book, calculator, tools] = art.current.children;
    const center = card => [
      card.offsetLeft + card.offsetWidth / 2,
      card.offsetTop + card.offsetHeight / 2,
    ];
    const [bookX, bookY] = center(book);
    const easing = 'cubic-bezier(.23,.8,.25,1)';

    function fan(card, angle, delay, duration) {
      const [x, y] = center(card);
      return card.animate([
        { translate: (bookX - x) + 'px ' + (bookY - y) + 'px', rotate: angle + 'deg', scale: .8 },
        { translate: '0 0', rotate: '0deg', scale: 1 },
      ], { delay, duration, easing, fill: 'backwards' });
    }

    running.current = [
      book.animate([
        { translate: '0 7px', rotate: '5deg', scale: .985 },
        { translate: '0 0', rotate: '0deg', scale: 1 },
      ], { duration: 1300, easing }),
      fan(calculator, -14, 250, 1600),
      fan(tools, -10, 500, 1700),
    ];
  }

  useLayoutEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const onPreference = event => { if (event.matches) stop(); };
    preference.addEventListener('change', onPreference);
    play();
    return () => {
      preference.removeEventListener('change', onPreference);
      stop();
    };
  }, []);

  return <>
    <div className="hero-visual" aria-hidden="true" ref={art}>
      {heroItems.map((item, index) => <div key={item.id} className={'hero-image hero-image-' + 'abc'[index]}>
        <ItemVisual item={item} />
      </div>)}
    </div>
    <button type="button" className="hero-replay" aria-label="Replay collage animation" title="Replay animation" onClick={play}>
      <span aria-hidden="true">↻</span>
    </button>
  </>;
}

export function CategoryRail({ category, onSelect, categories }) {
  const rail = useRef(null);
  const indicator = useRef(null);
  const drag = useRef(null);
  const suppressClick = useRef(false);
  const [paused, setPaused] = useState(false);

  function placePill() {
    const node = rail.current;
    const selected = node.querySelector('button[aria-pressed="true"]');
    if (!selected) return;
    const marker = indicator.current;
    marker.style.transform = 'translate(' + selected.offsetLeft + 'px, ' + selected.offsetTop + 'px)';
    marker.style.width = selected.offsetWidth + 'px';
    marker.style.height = selected.offsetHeight + 'px';
    node.dataset.ready = '';
    node.toggleAttribute('data-overflow', node.scrollWidth > node.parentElement.clientWidth + 2);
  }

  useLayoutEffect(() => {
    const node = rail.current;
    const frame = requestAnimationFrame(() => { node.dataset.motion = ''; });
    const observer = new ResizeObserver(placePill);
    observer.observe(node);
    node.querySelectorAll('button').forEach(button => observer.observe(button));
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);
  useLayoutEffect(placePill, [category]);
  useEffect(() => {
    if (paused) return;
    const node = rail.current;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const canHover = matchMedia('(hover: hover) and (pointer: fine)');
    let frame;
    let previous = 0;
    let begin = performance.now() + 1000;
    let end = null;
    let position = node.scrollLeft;

    function advance(now) {
      const elapsed = previous ? Math.min(now - previous, 40) : 0;
      previous = now;
      frame = requestAnimationFrame(advance);
      if (reduced.matches || document.hidden || !node.hasAttribute('data-overflow') ||
          (canHover.matches && node.parentElement.matches(':hover')) || node.matches(':focus-within')) {
        position = node.scrollLeft;
        end = null;
        return;
      }
      if (now < begin) return;
      const max = node.scrollWidth - node.clientWidth;
      if (position >= max) {
        end ??= now;
        if (now - end >= 1300) {
          node.scrollLeft = position = 0;
          begin = now + 850;
          end = null;
        }
        return;
      }
      position = Math.min(max, position + elapsed * .028);
      node.scrollLeft = position;
    }
    frame = requestAnimationFrame(advance);
    return () => cancelAnimationFrame(frame);
  }, [paused]);

  function startDrag(event) {
    setPaused(true);
    suppressClick.current = false;
    const node = event.currentTarget;
    if (event.pointerType !== 'mouse' || event.button !== 0 || !node.hasAttribute('data-overflow')) return;
    drag.current = {id:event.pointerId, x:event.clientX, scroll:node.scrollLeft, moved:false};
  }
  function moveDrag(event) {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    const delta = event.clientX - current.x;
    const node = event.currentTarget;
    if (!current.moved) {
      if (Math.abs(delta) < 6) return;
      current.moved = true;
      if (event.isTrusted) node.setPointerCapture(event.pointerId);
      node.dataset.dragging = '';
    }
    node.scrollLeft = current.scroll - delta;
  }
  function finishDrag(event) {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    suppressClick.current = current.moved;
    drag.current = null;
    delete event.currentTarget.dataset.dragging;
  }

  function suppressDraggedClick(event) {
    if (!suppressClick.current || event.detail === 0) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClick.current = false;
  }

  return <div className="category-wrap">
    <div className="category-rail" role="group" aria-label="Campus categories" ref={rail}
      onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={finishDrag} onPointerCancel={finishDrag}
      onLostPointerCapture={finishDrag} onWheel={() => setPaused(true)} onClickCapture={suppressDraggedClick}
      onPointerLeave={event => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) finishDrag(event);
      }}>
      <span className="category-indicator" aria-hidden="true" ref={indicator} />
      {[{ code: '', name: 'All categories' }, ...categories].map(({ code, name }) => <button type="button" key={code}
        aria-pressed={category === code} onClick={() => { setPaused(true); onSelect(code); }}>{name}</button>)}
    </div>
    <button type="button" className="category-auto-toggle"
      aria-label={paused ? 'Play automatic category scroll' : 'Pause automatic category scroll'}
      onClick={() => setPaused(current => !current)}>
      <span aria-hidden="true">{paused ? '▶' : 'Ⅱ'}</span>
    </button>
  </div>;
}

const pointfex = 'https://pointfex.com/';

export function Footer() {
  const help = useRef(null);
  const about = useRef(null);

  return <>
    <footer className="site-footer">
      <div className="footer-inner">
        <span className="footer-brand">UniCircle · <a className="company-link" href={pointfex} target="_blank" rel="noopener noreferrer">
          by Pointfex <span aria-hidden="true">↗</span>
        </a></span>
        <nav className="footer-links" aria-label="Footer">
          <a href="/marketplace">Marketplace</a>
          <a href="/post">Post an item</a>
          <a href="/activity">My Activity</a>
          <button type="button" className="footer-link" onClick={() => help.current.showModal()}>Help</button>
          <button type="button" className="footer-link" onClick={() => about.current.showModal()}>About</button>
        </nav>
      </div>
    </footer>
    <dialog className="footer-dialog" ref={help} aria-labelledby="footer-help-title">
      <h2 id="footer-help-title">How it works</h2>
      <p>Request an item and check pickup details in My Activity once the owner accepts.</p>
      <a href="/marketplace" onClick={() => help.current.close()}>Browse listings</a>
      <form method="dialog"><button>Close</button></form>
    </dialog>
    <dialog className="footer-dialog" ref={about} aria-labelledby="footer-about-title">
      <h2 id="footer-about-title">About UniCircle</h2>
      <p>A marketplace for verified university members.</p>
      <a href={pointfex} target="_blank" rel="noopener noreferrer">Visit Pointfex</a>
      <form method="dialog"><button>Close</button></form>
    </dialog>
  </>;
}
