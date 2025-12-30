// src/chambers/FlowToyChamber.ts
import type { EngineTick, GesturePoint} from "@/types/Core";
import { GestureCapture } from "@/input/GestureCapture";
import { analyzeGesture } from "@/input/analyzeGesture";

type Vec2 = { x: number; y: number };

type Centre = {
    id: string;
    p: Vec2;         // position (px)
    w: number;       // weight (loudness)
    spin: number;    // tangential strength
    radial: number;  // inward (-) / outward (+)
    sigma: number;   // reach (px)
    phase: number;   // 0..1 phase offset (optional / later)
};

type Dot = {
    p: Vec2;
    v: Vec2;
};

type GestureMod = {
  p: { x: number; y: number };
  radius: number;       // px
  spinDelta: number;    // signed, e.g. -0.6..+0.6 (multiplier-ish)
  softenRadial: number; // 0..1 (optional lens)
  ttl: number;          // seconds remaining
  tMax: number;         // initial ttl
};


function clamp01(x: number) { return Math.max(0, Math.min(1, x)); }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function add(a: Vec2, b: Vec2): Vec2 { return { x: a.x + b.x, y: a.y + b.y }; }
function sub(a: Vec2, b: Vec2): Vec2 { return { x: a.x - b.x, y: a.y - b.y }; }
function mul(a: Vec2, k: number): Vec2 { return { x: a.x * k, y: a.y * k }; }
function len(a: Vec2): number { return Math.hypot(a.x, a.y); }
function norm(a: Vec2): Vec2 {
    const l = len(a);
    return l > 1e-6 ? { x: a.x / l, y: a.y / l } : { x: 0, y: 0 };
}
function perp(a: Vec2): Vec2 { return { x: -a.y, y: a.x }; }

function smoothstep(e0: number, e1: number, x: number) {
    const t = clamp01((x - e0) / (e1 - e0));
    return t * t * (3 - 2 * t);
}

// Soft Gaussian-ish falloff: 1 near centre, decays with distance
function falloff(d: number, sigma: number) {
    const s = Math.max(8, sigma);
    const x = d / s;
    return Math.exp(-x * x);
}

export class FlowToyChamber extends HTMLElement {
    private canvas!: HTMLCanvasElement;
    private ctx!: CanvasRenderingContext2D;

    private w = 0;
    private h = 0;
    private dpr = 1;

    private centres: Centre[] = [];
    private dots: Dot[] = [];

    private pointer: Vec2 | null = null;
    private pointerDown = false;

    // tuning
    private readonly DOTS = 48;
    private readonly DRAG = 0.988;       // velocity decay
    private readonly SPEED_LIMIT = 420;  // px/s cap (safety)
    private readonly INPUT_RADIUS = 240; // px, how local the re-weighting feels

    // Breath “vegetal” behaviour:
    // inhale (0) slightly increases inwardness; exhale (1) relaxes toward neutral.
    private breath01 = 0.5;

    private readonly INPUT_LENS_RADIUS = 260;  // how big the “focus” area is
    private readonly LENS_STRENGTH = 0.55;     // 0..1, how much it neutralises radial


    constructor() {
        super();
        const shadow = this.attachShadow({ mode: "open" });
        shadow.innerHTML = `
      <style>
        :host { display:block; width:100%; height:100%; }
        canvas { width:100%; height:100%; display:block; }
      </style>
      <canvas></canvas>
    `;
        this.canvas = shadow.querySelector("canvas") as HTMLCanvasElement;
        const ctx = this.canvas.getContext("2d");
        if (!ctx) throw new Error("2D canvas not supported");
        this.ctx = ctx;
    }

    connectedCallback() {
        this.installPointer();
        this.resizeToHost();
        this.resetWorld();
    }

    disconnectedCallback() {
        // nothing to clean up yet; pointer listeners are attached to this element
    }

    /** Called by EngineRoot (preferred fast path) */
    update(tick: EngineTick) {
        this.breath01 = clamp01(tick.breath?.value ?? 0.5);
        this.step(tick.dt);
        this.render();
    }

    private installPointer() {
        const toLocal = (e: PointerEvent): Vec2 => {
            const r = this.getBoundingClientRect();
            return { x: (e.clientX - r.left), y: (e.clientY - r.top) };
        };

        this.addEventListener("pointerdown", (e) => {
            this.pointerDown = true;
            this.pointer = toLocal(e);
            this.setPointerCapture?.(e.pointerId);
        }, { passive: true });

        this.addEventListener("pointermove", (e) => {
            this.pointer = toLocal(e);
        }, { passive: true });

        const end = (e: PointerEvent) => {
            this.pointerDown = false;
            this.releasePointerCapture?.(e.pointerId);
            // keep last pointer position as “attention”, or null it out:
            // this.pointer = null;
        };
        this.addEventListener("pointerup", end, { passive: true });
        this.addEventListener("pointercancel", end, { passive: true });

        // Resize observer is ideal, but simplest: listen to window resize
        window.addEventListener("resize", () => this.resizeToHost());
    }

    private resizeToHost() {
        const r = this.getBoundingClientRect();
        this.w = Math.max(1, Math.floor(r.width));
        this.h = Math.max(1, Math.floor(r.height));
        this.dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));

        this.canvas.width = this.w * this.dpr;
        this.canvas.height = this.h * this.dpr;
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    private resetWorld() {
        // centres arranged loosely around the middle (vegetal: no dominant sun)
        const cx = this.w * 0.5;
        const cy = this.h * 0.5;

        const minAxis = Math.min(this.w, this.h);

        // Aspect-aware radii:
        // - Rx based on width
        // - Ry slightly smaller vs height to avoid portrait “top band” bias
        const Rx = this.w * 0.22;
        const Ry = this.h * 0.18;

        // Sigma (reach): clamp so portrait doesn't become overly global
        const sigmaLong = Math.max(220, Math.min(460, minAxis * 0.55));
        const sigmaMid = Math.max(180, Math.min(420, minAxis * 0.45));

        this.centres = [
            // Rooting (slightly inward)
            { id: "root", p: { x: cx - Rx, y: cy + Ry * 0.4 }, w: 1.0, spin: 0.70, radial: -0.10, sigma: sigmaLong, phase: 0.00 },
            // Shoots (slightly outward)
            { id: "shoot", p: { x: cx + Rx * 0.9, y: cy - Ry * 0.5 }, w: 1.0, spin: -0.45, radial: +0.10, sigma: sigmaLong, phase: 0.33 },
            // Branching (neutral)
            { id: "branch", p: { x: cx + Rx * 0.1, y: cy + Ry * 0.9 }, w: 0.9, spin: 0.80, radial: 0.00, sigma: sigmaMid, phase: 0.66 },
            // Weaving (slightly inward, lower spin)
            { id: "weave", p: { x: cx - Rx * 0.2, y: cy - Ry * 0.9 }, w: 0.9, spin: 0.60, radial: -0.05, sigma: sigmaMid, phase: 0.85 },
        ];

        // dots near centre with tiny random velocity
        this.dots = [];
        for (let i = 0; i < this.DOTS; i++) {
            const a = Math.random() * Math.PI * 2;
            const rr = Math.random() * (minAxis * 0.06);
            const p = { x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr };
            const v = { x: (Math.random() - 0.5) * 10, y: (Math.random() - 0.5) * 10 };
            this.dots.push({ p, v });
        }
    }


    /** Core: field is sum of centre contributions (plus gentle input reweight) */
    private fieldAt(p: Vec2): Vec2 {
        let v: Vec2 = { x: 0, y: 0 };
        // 0 far away, 1 near pointer (so it affects the local space you’re touching)
        let lens = 0;
        if (this.pointer) {
            const d = len(sub(this.pointer, p));
            lens = 1.0 - smoothstep(this.INPUT_LENS_RADIUS * 0.35, this.INPUT_LENS_RADIUS, d);
            if (this.pointerDown) lens = Math.min(1, lens * 1.35);
        }


        // Breath as “hydration”: inhale pulls slightly more inward; exhale relaxes.
        // b=0 (inhale) => bias -0.06 ; b=1 (exhale) => bias 0
        const breathInwardBias = lerp(-0.06, 0.0, this.breath01);

        for (const c of this.centres) {
            const dp = sub(c.p, p);     // toward centre
            const d = len(dp);
            const R = norm(dp);
            const T = perp(R);

            // base influence with soft falloff
            let w = c.w * falloff(d, c.sigma);

            // user input re-weights nearby centres (attention, not selection)
            // proximity to pointer increases influence gently, more so when pointer is down
            if (this.pointer) {
                const pd = len(sub(this.pointer, c.p));
                const attn = 1.0 - smoothstep(this.INPUT_RADIUS * 0.35, this.INPUT_RADIUS, pd);
                const downBoost = this.pointerDown ? 0.45 : 0.18;
                w *= (1.0 + attn * downBoost);
            }

            // Tangential (spin) + radial (drift)
            // Vegetal: keep radial small; let breath bias inward slightly.
            const spin = c.spin;
            const radialBase = c.radial + breathInwardBias;

            // Lens makes radial less “confident” near pointer (toward 0), revealing braids.
            const radial = lerp(radialBase, 0.0, lens * this.LENS_STRENGTH);


            v = add(v, mul(T, spin * w));
            v = add(v, mul(R, radial * w));
        }

        return v;
    }

    private step(dt: number) {
        const dtSec = Math.max(0, dt);
        if (dtSec <= 0) return;

        for (const d of this.dots) {
            // Sample field as acceleration-like term (scaled)
            const a = this.fieldAt(d.p);

            // Accumulate into velocity; the scale is your main “feel” knob
            d.v = add(d.v, mul(a, 220 * dtSec));

            // drag
            d.v = mul(d.v, Math.pow(this.DRAG, dtSec * 60));

            // limit speed
            const sp = len(d.v);
            if (sp > this.SPEED_LIMIT) d.v = mul(d.v, this.SPEED_LIMIT / sp);

            // integrate
            d.p = add(d.p, mul(d.v, dtSec));

            // soft wrap (torus) keeps it toy-like
            if (d.p.x < 0) d.p.x += this.w;
            if (d.p.x > this.w) d.p.x -= this.w;
            if (d.p.y < 0) d.p.y += this.h;
            if (d.p.y > this.h) d.p.y -= this.h;
        }
    }

    private render() {
        const ctx = this.ctx;

        // subtle fade to leave short trails (toy!)
        ctx.fillStyle = "rgba(7,10,15,0.14)";
        ctx.fillRect(0, 0, this.w, this.h);

        // centres (faint)
        for (const c of this.centres) {
            ctx.beginPath();
            ctx.arc(c.p.x, c.p.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(220, 230, 255, 0.25)";
            ctx.fill();
        }

        // dots
        for (const d of this.dots) {
            ctx.beginPath();
            ctx.arc(d.p.x, d.p.y, 1.6, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(240, 245, 255, 0.75)";
            ctx.fill();
        }

        // pointer (optional)
        if (this.pointer) {
            ctx.beginPath();
            ctx.arc(this.pointer.x, this.pointer.y, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = this.pointerDown ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.25)";
            ctx.fill();
        }
        if (this.pointerDown && this.pointer) {
            ctx.beginPath();
            ctx.arc(this.pointer.x, this.pointer.y, this.INPUT_LENS_RADIUS, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(255,255,255,0.04)";
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }
}

if (!customElements.get("flow-toy-chamber")) {
    customElements.define("flow-toy-chamber", FlowToyChamber);
}
declare global {
    interface HTMLElementTagNameMap {
        "flow-toy-chamber": FlowToyChamber;
    }
}
