"use client";

import { useEffect, useState } from "react";
import { about, contact, experience, hero, jarvis as jarvisCopy, profile, projects, skills } from "@/data/content";
import { jarvis } from "@/lib/jarvis";
import { STOP_INDEX, TRACK } from "@/lib/timeline";
import { goTo } from "./SmoothScroll";

/**
 * Everything readable. The screen panels are laid exactly over the monitor the camera has landed on
 * (the rig writes the monitor's on-screen rectangle into --sx/--sy/--sw/--sh), styled as the same app
 * the monitor is running, so the text is crisp, selectable and clickable "on" the 3D screen.
 */
export default function Overlay() {
  return (
    <>
      <div className="overlay">
        <Hero />
        <Welcome />
        <AboutPanel />
        <SkillsPanel />
        <WorkPanel />
        <JourneyPanel />
        <Contact />
      </div>
      {/* the scroll track that drives the camera */}
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
        <span className="mouse" /> Scroll to step inside
      </p>
    </section>
  );
}

function Welcome() {
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => jarvis.on((e) => setSpeaking(e.speaking)), []);
  return (
    <section className={`copy copy-welcome ${speaking ? "is-speaking" : ""}`} aria-label="Welcome">
      <div className="jv-wave" aria-hidden>
        {Array.from({ length: 24 }, (_, i) => (
          <i key={i} style={{ animationDelay: `${(i % 7) * -0.13}s` }} />
        ))}
      </div>
      <p className="jv-name">J.A.R.V.I.S</p>
      <p className="jv-line">{jarvisCopy.line}</p>
      <ul className="jv-status">
        {jarvisCopy.status.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
    </section>
  );
}

function Chrome({ tabs, active, title, onTab }: { tabs: string[]; active: number | "page"; title?: string; onTab?: (i: number) => void }) {
  return (
    <div className="chrome">
      <span className="lights" aria-hidden>
        <i />
        <i />
        <i />
      </span>
      <div className="tabs" role={onTab ? "tablist" : undefined}>
        {tabs.map((t, i) =>
          onTab ? (
            <button key={t} role="tab" className="tab" data-i={i} onClick={() => onTab(i)}>
              {t}
            </button>
          ) : (
            <span key={t} className={`tab ${i === active ? "is-on" : ""}`}>
              {t}
            </span>
          ),
        )}
      </div>
      {title && <span className="chrome-title">{title}</span>}
    </div>
  );
}

function AboutPanel() {
  return (
    <section className="panel panel-about" data-app="code" aria-label="About">
      <Chrome tabs={["about.tsx", "journey.log", "globals.css"]} active={0} title="portfolio — VS Code" />
      <div className="panel-body">
        <p className="comment">{`// ${about.label}`}</p>
        <h2 className="panel-title">{about.title}</h2>
        {about.body.map((p) => (
          <p key={p} className="panel-text">
            {p}
          </p>
        ))}
        <dl className="stats">
          {about.stats.map((s) => (
            <div key={s.k}>
              <dt>{s.k}</dt>
              <dd>{s.v}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="statusbar">⎇ main · ✓ 0 problems · TypeScript React</div>
    </section>
  );
}

function SkillsPanel() {
  return (
    <section className="panel panel-skills" data-app="terminal" aria-label="Skills">
      <Chrome tabs={["~/portfolio", "htop"]} active={0} title="zsh — 120×40" />
      <div className="panel-body">
        <p className="prompt">
          <span className="ps1">prabal@workstation ~/portfolio $</span> npx skills --list
        </p>
        <p className="comment"># {skills.label} · {skills.title}</p>
        <div className="skill-groups">
          {skills.groups.map((g) => (
            <div key={g.name} className="skill-group">
              <p className="skill-head">▸ {g.name}</p>
              <ul>
                {g.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="prompt">
          <span className="ps1">prabal@workstation ~/portfolio $</span> <span className="caret" />
        </p>
      </div>
    </section>
  );
}

function WorkPanel() {
  const stop = STOP_INDEX.work;
  return (
    <section className="panel panel-work" data-app="browser" aria-label="Work">
      <Chrome tabs={projects.items.map((p) => p.name.split(" ")[0])} active="page" onTab={(i) => goTo(stop, i)} />
      <div className="panel-body">
        {projects.items.map((p, i) => (
          <article key={p.name} className="work-item" data-i={i}>
            <p className="url">🔒 {(p.href ?? "localhost:3000/meditrack").replace(/^https?:\/\//, "").replace(/\/$/, "")}</p>
            <p className="comment">
              {projects.label} · {String(i + 1).padStart(2, "0")} / {String(projects.items.length).padStart(2, "0")}
            </p>
            <p className="work-tag">{p.tag}</p>
            <h2 className="panel-title">{p.name}</h2>
            <p className="panel-text">{p.blurb}</p>
            {p.href ? (
              <a className="btn" href={p.href} target="_blank" rel="noreferrer">
                Visit the site →
              </a>
            ) : (
              <span className="btn is-muted">Private build</span>
            )}
          </article>
        ))}
        <p className="tab-hint">Scroll to switch tabs</p>
      </div>
    </section>
  );
}

function JourneyPanel() {
  const stop = STOP_INDEX.journey;
  return (
    <section className="panel panel-journey" data-app="git" aria-label="Journey">
      <Chrome tabs={["about.tsx", "journey.log", "globals.css"]} active={1} title="portfolio — VS Code" />
      <div className="panel-body">
        <p className="prompt">
          <span className="ps1">$</span> git log --graph career <span className="comment">{`// ${experience.label}`}</span>
        </p>
        <ol className="commits">
          {experience.items.map((it, i) => (
            <li key={it.what + it.when} className="commit" data-i={i}>
              <button className="commit-head" onClick={() => goTo(stop, i)}>
                <span className="hash">{((i + 7) * 2654435761).toString(16).slice(0, 7)}</span>
                <span className="what">{it.what}</span>
                <span className="when">{it.when}</span>
              </button>
              <div className="commit-body">
                <div>
                  <p className="where">{it.where}</p>
                  <p className="panel-text">{it.point}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
        <p className="edu">🎓 {experience.education}</p>
      </div>
    </section>
  );
}

function Contact() {
  return (
    <section className="copy copy-contact" aria-label="Contact">
      <p className="eyebrow">
        <span className="dot" /> {contact.label}
      </p>
      <h2 className="contact-title">
        {contact.title.replace(/\.$/, "")}
        <span className="stop">.</span>
      </h2>
      <p className="hero-tag">{contact.body}</p>
      <div className="contact-row">
        <a className="btn btn-big" href={`mailto:${profile.email}`}>
          {profile.email}
        </a>
        <div className="links">
          {profile.links.map((l) => (
            <a key={l.label} href={l.href} target="_blank" rel="noreferrer">
              {l.label} ↗
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
