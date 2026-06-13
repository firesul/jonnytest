import React, { useEffect, useRef } from 'react';

// --- SELF-CONTAINED 3D PERLIN NOISE ENGINE ---
class PerlinNoise {
  constructor() {
    this.p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) this.p[i] = i;
    
    // Shuffle the permutation table randomly
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = this.p[i];
      this.p[i] = this.p[j];
      this.p[j] = tmp;
    }
    
    this.perm = new Uint8Array(512);
    this.grad3 = [
      [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
      [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
      [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
    ];
    
    for (let i = 0; i < 512; i++) {
      this.perm[i] = this.p[i & 255];
    }
  }

  dot(g, x, y, z) {
    return g[0] * x + g[1] * y + g[2] * z;
  }

  mix(a, b, t) {
    return (1 - t) * a + t * b;
  }

  fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  noise(x, y, z) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;

    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);

    const u = this.fade(x);
    const v = this.fade(y);
    const w = this.fade(z);

    const A = this.perm[X] + Y;
    const AA = this.perm[A] + Z;
    const AB = this.perm[A + 1] + Z;
    const B = this.perm[X + 1] + Y;
    const BA = this.perm[B] + Z;
    const BB = this.perm[B + 1] + Z;

    const gAA = this.grad3[this.perm[AA] % 12];
    const gBA = this.grad3[this.perm[BA] % 12];
    const gAB = this.grad3[this.perm[AB] % 12];
    const gBB = this.grad3[this.perm[BB] % 12];
    const gAA1 = this.grad3[this.perm[AA + 1] % 12];
    const gBA1 = this.grad3[this.perm[BA + 1] % 12];
    const gAB1 = this.grad3[this.perm[AB + 1] % 12];
    const gBB1 = this.grad3[this.perm[BB + 1] % 12];

    return this.mix(
      this.mix(
        this.mix(this.dot(gAA, x, y, z), this.dot(gBA, x - 1, y, z), u),
        this.mix(this.dot(gAB, x, y - 1, z), this.dot(gBB, x - 1, y - 1, z), u),
        v
      ),
      this.mix(
        this.mix(this.dot(gAA1, x, y, z - 1), this.dot(gBA1, x - 1, y, z - 1), u),
        this.mix(this.dot(gAB1, x, y - 1, z - 1), this.dot(gBB1, x - 1, y - 1, z - 1), u),
        v
      ),
      w
    );
  }
}

// --- VIBE DECORATION PALETTES & SETTINGS ---
const VIBE_CONFIGS = {
  chill: {
    colors: [
      { r: 220, g: 235, b: 255, a: 0.65 }, // Light Ice Blue
      { r: 80, g: 140, b: 220, a: 0.45 },  // Medium Cyan Blue
      { r: 40, g: 30, b: 120, a: 0.25 }    // Deep Blue-Purple
    ],
    speed: 0.9,
    scale: 0.0013,
    trail: 0.94,
    particles: 2200
  },
  energy: {
    colors: [
      { r: 255, g: 80, b: 180, a: 0.70 },  // Electric Pink
      { r: 0, g: 230, b: 255, a: 0.55 },   // Electric Cyan
      { r: 120, g: 0, b: 240, a: 0.35 }    // Electric Violet
    ],
    speed: 2.2,
    scale: 0.0028,
    trail: 0.88,
    particles: 3000
  },
  vibrant: {
    colors: [
      { r: 255, g: 215, b: 0, a: 0.70 },   // Shiny Gold
      { r: 255, g: 110, b: 0, a: 0.50 },   // Warm Sun Orange
      { r: 255, g: 20, b: 120, a: 0.40 }   // Hot Pinkish Red
    ],
    speed: 1.6,
    scale: 0.0020,
    trail: 0.91,
    particles: 2600
  },
  intense: {
    colors: [
      { r: 255, g: 190, b: 80, a: 0.75 },  // Fire Yellow-Orange
      { r: 230, g: 15, b: 40, a: 0.50 },   // Intense Crimson
      { r: 70, g: 15, b: 15, a: 0.30 }     // Dark Blood Red
    ],
    speed: 2.8,
    scale: 0.0035,
    trail: 0.85,
    particles: 3500
  },
  ethereal: {
    colors: [
      { r: 255, g: 255, b: 255, a: 0.70 }, // Pure White
      { r: 195, g: 205, b: 215, a: 0.45 }, // Soft Platinum Silver
      { r: 140, g: 150, b: 200, a: 0.25 }  // Whispering Pale Lavender
    ],
    speed: 0.4,
    scale: 0.0008,
    trail: 0.96,
    particles: 1600
  }
};

export default function Background({ vibe = 'chill', isPlaying = false }) {
  const canvasRef = useRef(null);
  
  // Keep interpolation values in refs for frame-by-frame updates without triggers
  const targetConfig = useRef(VIBE_CONFIGS[vibe] || VIBE_CONFIGS.chill);
  const currentConfig = useRef({
    colors: JSON.parse(JSON.stringify(targetConfig.current.colors)),
    speed: targetConfig.current.speed,
    scale: targetConfig.current.scale,
    trail: targetConfig.current.trail,
    particles: targetConfig.current.particles
  });
  
  const isPlayingRef = useRef(isPlaying);
  const currentVibeName = useRef(vibe);

  // Sync refs when props change
  useEffect(() => {
    const config = VIBE_CONFIGS[vibe] || VIBE_CONFIGS.chill;
    targetConfig.current = config;
    currentVibeName.current = vibe;
  }, [vibe]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d', { alpha: false });
    let animationId = null;
    let t = 0;
    
    const noiseEngine = new PerlinNoise();
    let particles = [];
    
    // Set canvas dimensions
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    // Particle trace definition
    class FlowParticle {
      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.px = this.x;
        this.py = this.y;
        this.age = 0;
        this.maxAge = 60 + Math.random() * 120;
        // Assign a color index (0, 1, or 2)
        this.colorIdx = Math.random() > 0.65 ? 0 : Math.random() > 0.4 ? 1 : 2;
      }

      update(speed, scale) {
        // Sample noise in 3D (x, y, time)
        const angle = noiseEngine.noise(
          this.x * scale,
          this.y * scale,
          t * 0.0003
        ) * Math.PI * 3.8;

        this.px = this.x;
        this.py = this.y;

        this.x += Math.cos(angle) * speed;
        this.y += Math.sin(angle) * speed;
        this.age++;

        // Reset if boundary hit or aged out
        if (
          this.x < 0 || this.x > canvas.width ||
          this.y < 0 || this.y > canvas.height ||
          this.age > this.maxAge
        ) {
          this.reset();
        }
      }

      draw(colors, widthMultiplier) {
        const lifeRatio = 1 - this.age / this.maxAge;
        const colorSource = colors[this.colorIdx];
        if (!colorSource) return;

        // Apply visual properties
        ctx.strokeStyle = `rgba(${colorSource.r}, ${colorSource.g}, ${colorSource.b}, ${lifeRatio * colorSource.a})`;
        ctx.lineWidth = 0.65 * widthMultiplier;
        ctx.beginPath();
        ctx.moveTo(this.px, this.py);
        ctx.lineTo(this.x, this.y);
        ctx.stroke();
      }
    }

    const initParticles = () => {
      particles = [];
      const count = currentConfig.current.particles;
      for (let i = 0; i < count; i++) {
        const p = new FlowParticle();
        // Warm up coordinates so particles aren't clustered at start
        p.x = Math.random() * canvas.width;
        p.y = Math.random() * canvas.height;
        p.px = p.x;
        p.py = p.y;
        particles.push(p);
      }
    };

    // Initialize dimensions and initial setup
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Smooth frame render loop
    const render = () => {
      animationId = requestAnimationFrame(render);
      
      // 1. Interpolate configuration parameters (Lerp) towards Target Config
      const target = targetConfig.current;
      const current = currentConfig.current;
      const lerpFactor = 0.035; // smooth transitions (approx 2-3s to blend)

      current.speed += (target.speed - current.speed) * lerpFactor;
      current.scale += (target.scale - current.scale) * lerpFactor;
      current.trail += (target.trail - current.trail) * lerpFactor;
      
      // Interpolate target color arrays (RGB channels)
      for (let i = 0; i < 3; i++) {
        current.colors[i].r += (target.colors[i].r - current.colors[i].r) * lerpFactor;
        current.colors[i].g += (target.colors[i].g - current.colors[i].g) * lerpFactor;
        current.colors[i].b += (target.colors[i].b - current.colors[i].b) * lerpFactor;
        current.colors[i].a += (target.colors[i].a - current.colors[i].a) * lerpFactor;
      }

      // Adjust particle count slowly if target differs
      if (Math.abs(target.particles - particles.length) > 50) {
        if (target.particles > particles.length) {
          // Birth more particles
          for (let i = 0; i < 15; i++) {
            particles.push(new FlowParticle());
          }
        } else {
          // Prune particles
          particles.splice(0, 15);
        }
      }

      // 2. Audio reaction / simulated pulse calculation
      let beatPulse = 0;
      if (isPlayingRef.current) {
        const timeSecs = Date.now() / 1000;
        // Frequency changes depending on vibe
        let pulseFreq = 1.6;
        if (currentVibeName.current === 'intense') pulseFreq = 2.8;
        else if (currentVibeName.current === 'energy') pulseFreq = 2.2;
        else if (currentVibeName.current === 'vibrant') pulseFreq = 1.8;
        else if (currentVibeName.current === 'ethereal') pulseFreq = 0.8;

        // Peak mathematical expression for a crisp heartbeat pulse: (sin(x) * 0.5 + 0.5) ^ 5
        beatPulse = Math.pow(Math.sin(timeSecs * pulseFreq * Math.PI) * 0.5 + 0.5, 5);
      }

      const activeSpeed = current.speed * (1 + beatPulse * 0.45);
      const activeWidth = 1.0 + beatPulse * 0.6;

      // 3. Clear trail overlay
      // By drawing a semi-transparent dark rectangle, we create the wave tail
      ctx.globalAlpha = 1 - current.trail;
      ctx.fillStyle = '#060907'; // Match CSS --bg-color
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1.0;

      // 4. Update and Draw Flow Particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.update(activeSpeed, current.scale);
        p.draw(current.colors, activeWidth);
      }

      t += 1.5; // Increment timeline
    };

    // Kick off animation loop
    render();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        pointerEvents: 'none',
        display: 'block',
        backgroundColor: '#060907'
      }}
      id="flowFieldCanvas"
    />
  );
}
