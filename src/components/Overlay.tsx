"use client";

import { Fragment, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { about, contact, experience, hero, profile, projects, skills } from "@/data/content";
import { state } from "@/lib/state";
import { TABS, TRACK } from "@/lib/timeline";
import { TEXT_SIDE } from "@/lib/formations";
import { goToTab } from "./SmoothScroll";

// the 3D shapes inside the screen have their own WebGL canvas: client-only, loaded after the page
const ScreenShapes = dynamic(() => import("./three/ScreenShapes"), { ssr: false });

/**
 * Everything readable. The screen panel is laid exactly over the centre monitor (the camera rig writes the
 * monitor's on-screen rectangle into --sx/--sy/--sw/--sh) and is a small scrolling website of its own.
 */
export default function Overlay() {
  return (
    <>
      <div className="overlay">
        <Hero />
        <DeskCaption />
        <Screen />
      </div>
      {/* the scroll track that drives everything */}
      <div className="track" style={{ height: `${(TRACK + 1) * 100}svh` }} aria-hidden />
    </>
  );
}

function Hero() {
  return (
    <section className="copy copy-hero" aria-label="Intro">
      <p className="eyebrow">
        <span className="dot" /> {hero.eyebrow}
      </p>
      <h1 className="hero-name">
        <span className="hero-intro">{hero.intro}</span>
        {hero.headline.split(" ").map((w, i, all) => (
          <span key={w} className="hero-word">
            {w}
            {i === all.length - 1 && <span className="stop">.</span>}
          </span>
        ))}
      </h1>
      <p className="hero-tag">{hero.tagline}</p>
      <p className="scroll-hint">
        <span className="mouse" /> Scroll
      </p>
    </section>
  );
}

function DeskCaption() {
  return (
    <p className="copy copy-desk" aria-hidden>
      Keep scrolling to open the screen
    </p>
  );
}

type Vars = React.CSSProperties & Record<`--${string}`, number>;

/** A headline whose letters flip up one after another (each word stays unbroken). */
function Flip({ text, className = "" }: { text: string; className?: string }) {
  let n = 0;
  return (
    <h2 className={`flip ${className}`} aria-label={text}>
      {text.split(" ").map((w, wi, all) => (
        <Fragment key={wi}>
          <span className="w" aria-hidden>
            {[...w].map((ch, ci) => (
              <span key={ci} className="c" style={{ "--n": n++ } as Vars}>
                {ch}
              </span>
            ))}
          </span>
          {wi < all.length - 1 && " "}
        </Fragment>
      ))}
    </h2>
  );
}

/** A block that fades and rises in turn (n = its place in the section's sequence). */
function Fx({ n, className = "", children }: { n: number; className?: string; children: React.ReactNode }) {
  return (
    <div className={`fx ${className}`} style={{ "--n": n } as Vars}>
      {children}
    </div>
  );
}

/** Section scaffolding: the giant outlined number behind, a drawn line and label, then the headline. */
function Section({ i, label, title, big, children }: { i: number; label: string; title: string; big?: boolean; children: React.ReactNode }) {
  return (
    <section className="sec" data-side={TEXT_SIDE[i]}>
      <span className="sec-num" aria-hidden>
        {String(i + 1).padStart(2, "0")}
      </span>
      <div className="sec-inner">
        <p className="kicker">
          <span className="kline" aria-hidden />
          {label.replace(/^\d+\s*—\s*/, "")}
        </p>
        <Flip text={title} className={big ? "flip-xl" : ""} />
        {children}
      </div>
    </section>
  );
}

/**
 * The monitor, as a small website of its own: the sections scroll up inside it like a normal page, each one
 * scaling and flipping into place as it arrives, over a background that drifts at its own pace.
 * The outer scroll drives it (the camera is parked), so it is exactly as smooth as the rest of the page.
 */
function Screen() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const view = el.querySelector<HTMLElement>(".viewport")!;
    const page = el.querySelector<HTMLElement>(".page")!;
    const bg = el.querySelector<HTMLElement>(".screen-bg")!;
    const sections = Array.from(page.querySelectorAll<HTMLElement>(".sec"));
    const rollers = Array.from(el.querySelectorAll<HTMLElement>(".roll > span"));
    const pips = Array.from(el.querySelectorAll<HTMLElement>(".dots i"));
    const dots = Array.from(el.querySelectorAll<HTMLElement>(".dots button"));
    const bar = el.querySelector<HTMLElement>(".screen-progress span");

    let tops: number[] = [];
    let viewH = 1;
    let maxY = 0;
    const measure = () => {
      viewH = view.clientHeight || 1;
      tops = sections.map((s) => s.offsetTop);
      maxY = Math.max(0, page.scrollHeight - viewH);
      last = -1;
    };

    let last = -1;
    let active = -1;
    let raf = 0;
    const loop = () => {
      const t = Math.round(state.tab * 1000) / 1000;
      if (t !== last && tops.length) {
        last = t;
        // section index → page offset (sections can differ in height, so interpolate between their tops)
        const i = Math.min(Math.floor(t), sections.length - 1);
        const next = tops[Math.min(i + 1, tops.length - 1)];
        const y = Math.min(maxY, tops[i] + (next - tops[i]) * (t - i));
        page.style.transform = `translate3d(0,${-y}px,0)`;
        // the background drifts slower than the page: depth
        bg.style.setProperty("--y", `${y.toFixed(1)}px`);
        bg.style.setProperty("--t", t.toFixed(3));

        sections.forEach((s, k) => {
          const rel = (tops[k] - y) / viewH; // 1: just below the screen, 0: at the top, −1: scrolled past
          const on = rel < 1.1 && rel > -1.1;
          s.style.visibility = on ? "visible" : "hidden";
          if (!on) return;
          s.style.setProperty("--enter", Math.min(Math.max((1 - rel) / 0.85, 0), 1).toFixed(3));
          s.style.setProperty("--leave", Math.min(Math.max(-rel, 0), 1).toFixed(3));
        });

        rollers.forEach((r) => (r.style.transform = `translate3d(0,${(-t * 100) / TABS.length}%,0)`));
        pips.forEach((pip, k) => (pip.style.transform = `scaleX(${1 + 2 * Math.max(0, 1 - Math.abs(t - k))})`));
        if (bar) bar.style.transform = `scaleX(${t / (TABS.length - 1)})`;

        const now = Math.round(t);
        if (now !== active) {
          active = now;
          sections.forEach((s, k) => s.toggleAttribute("data-active", Math.abs(k - now) <= 0));
          dots.forEach((dot, k) => dot.setAttribute("aria-current", String(k === now)));
        }
      }
      raf = requestAnimationFrame(loop);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(view);
    ro.observe(page);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <section className="screen" aria-label="Portfolio" ref={root}>
      <header className="bar">
        <span className="bar-mark">PH</span>
        <span className="bar-count">
          <span className="roll">
            <span>
              {TABS.map((t, i) => (
                <i key={t.id}>{String(i + 1).padStart(2, "0")}</i>
              ))}
            </span>
          </span>
          <span className="bar-of">/ {String(TABS.length).padStart(2, "0")}</span>
          <span className="roll roll-name">
            <span>
              {TABS.map((t) => (
                <i key={t.id}>{t.label}</i>
              ))}
            </span>
          </span>
        </span>
        <nav className="dots" aria-label="Sections">
          {TABS.map((t, i) => (
            <button key={t.id} onClick={() => goToTab(i)} aria-label={t.label}>
              <i />
            </button>
          ))}
        </nav>
      </header>

      <div className="viewport">
        <div className="screen-bg" aria-hidden>
          <span className="orb orb-a" />
          <span className="orb orb-b" />
          <span className="orb orb-c" />
          <span className="dotgrid" />
        </div>

        <ScreenShapes />

        <div className="page">
          <Section i={0} label={about.label} title={about.title}>
            <div className="about-grid">
              <Fx n={0} className="prose">
                {about.body.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </Fx>
              <dl className="stats">
                {about.stats.map((s, i) => (
                  <Fx key={s.k} n={1 + i}>
                    <dd>{s.v}</dd>
                    <dt>{s.k}</dt>
                  </Fx>
                ))}
              </dl>
            </div>
          </Section>

          <Section i={1} label={skills.label} title={skills.title}>
            {/* the spec sheet: one card per category, every skill whole and readable */}
            <div className="specs">
              {skills.groups.map((g, i) => (
                <Fx key={g.name} n={i} className="spec">
                  <p className="spec-head">
                    <span className="spec-no">{String(i + 1).padStart(2, "0")}</span>
                    <span className="spec-name">{g.name}</span>
                    <span className="spec-count">{g.items.length}</span>
                  </p>
                  <ul className="spec-items">
                    {g.items.map((it) => (
                      <li key={it}>{it}</li>
                    ))}
                  </ul>
                </Fx>
              ))}
            </div>
          </Section>

          <Section i={2} label={projects.label} title={projects.title}>
            <ol className="index">
              {projects.items.map((p, i) => {
                const row = (
                  <>
                    <span className="index-no">{String(i + 1).padStart(2, "0")}</span>
                    <span className="index-main">
                      <span className="index-name">{p.name}</span>
                      <span className="index-blurb">{p.blurb}</span>
                    </span>
                    <span className="index-tag">{p.tag}</span>
                    <span className="index-go" aria-hidden>
                      {p.href ? "↗" : "·"}
                    </span>
                  </>
                );
                return (
                  <li key={p.name} className="fx" style={{ "--n": i } as Vars}>
                    {p.href ? (
                      <a className="index-row" href={p.href} target="_blank" rel="noreferrer">
                        {row}
                      </a>
                    ) : (
                      <div className="index-row is-private">{row}</div>
                    )}
                  </li>
                );
              })}
            </ol>
          </Section>

          <Section i={3} label={experience.label} title={experience.title}>
            <div className="line" aria-hidden>
              <span />
            </div>
            <ol className="stations">
              {[...experience.items].reverse().map((it, i) => (
                <li key={it.what + it.when} className="fx station" style={{ "--n": i } as Vars}>
                  <span className="station-dot" aria-hidden />
                  <p className="station-when">{it.when}</p>
                  <p className="station-what">{it.what}</p>
                  <p className="station-where">{it.where}</p>
                  <p className="station-point">{it.point}</p>
                </li>
              ))}
            </ol>
            <Fx n={4} className="edu">
              {experience.education}
            </Fx>
          </Section>

          <Section i={4} label={contact.label} title={contact.title} big>
            <Fx n={0} className="prose">
              <p>{contact.body}</p>
            </Fx>
            <Fx n={1} className="contact-row">
              <a className="btn" href={`mailto:${profile.email}`}>
                {profile.email}
              </a>
              {profile.links.map((l) => (
                <a key={l.label} className="link" href={l.href} target="_blank" rel="noreferrer">
                  {l.label} ↗
                </a>
              ))}
            </Fx>
          </Section>
        </div>
      </div>

      <span className="screen-progress" aria-hidden>
        <span />
      </span>
    </section>
  );
}
