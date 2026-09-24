const PRESENTATION_MANIFEST = "data/presentation.json";
const DATA_VERSION = "20260706-07";

const contrastThemes = [
  { id: "default", label: "Default color" },
  { id: "dark", label: "Projector dark" },
  { id: "light", label: "Projector light" },
];

const backgroundStates = {
  hero: { amp: 0.032, speed: 0.34, pointAlpha: 0.4, lineAlpha: 0.055, warm: 0.3, fluid: 0.92, blur: 0, opacity: 1, brightness: 1.08 },
  calm: { amp: 0.018, speed: 0.18, pointAlpha: 0.3, lineAlpha: 0.04, warm: 0.18, fluid: 0.68, blur: 0.8, opacity: 0.96, brightness: 1 },
  dense: { amp: 0.056, speed: 0.54, pointAlpha: 0.54, lineAlpha: 0.075, warm: 0.44, fluid: 1, blur: 0, opacity: 1, brightness: 1.08 },
  focus: { amp: 0.022, speed: 0.2, pointAlpha: 0.28, lineAlpha: 0.04, warm: 0.22, fluid: 0.8, blur: 1.6, opacity: 0.98, brightness: 0.98 },
  blurred: { amp: 0.014, speed: 0.14, pointAlpha: 0.22, lineAlpha: 0.03, warm: 0.14, fluid: 0.64, blur: 4.5, opacity: 0.92, brightness: 0.92 },
  final: { amp: 0.034, speed: 0.24, pointAlpha: 0.38, lineAlpha: 0.055, warm: 0.54, fluid: 0.9, blur: 0.8, opacity: 1, brightness: 1.04 },
};

const iconMap = {
  doc: `<svg viewBox="0 0 24 24"><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v5h5" /><path d="M10 13h6" /><path d="M10 17h4" /></svg>`,
  bot: `<svg viewBox="0 0 24 24"><path d="M12 3a4 4 0 0 0-4 4v1a4 4 0 0 0 8 0V7a4 4 0 0 0-4-4Z" /><path d="M6 10a3 3 0 1 0 0 6h1" /><path d="M18 10a3 3 0 1 1 0 6h-1" /><path d="M8 20v-4" /><path d="M16 20v-4" /><path d="M9 12h6" /></svg>`,
  code: `<svg viewBox="0 0 24 24"><path d="m8 8-4 4 4 4" /><path d="m16 8 4 4-4 4" /><path d="m14 5-4 14" /></svg>`,
  check: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" /><path d="m8.5 12.5 2.2 2.2 4.8-5.2" /></svg>`,
  rocket: `<svg viewBox="0 0 24 24"><path d="M5 19c2.5-6.5 6.3-11 14-14-.5 7.7-4.8 11.5-11 14" /><path d="M9 15 5 19" /><path d="m13 7 4 4" /></svg>`,
  file: `<svg viewBox="0 0 24 24"><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v5h5" /></svg>`,
  preview: `<svg viewBox="0 0 24 24"><path d="M2.5 12s3.3-6 9.5-6 9.5 6 9.5 6-3.3 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.6" /></svg>`,
};

class ParticleField {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext("webgl", { alpha: true, antialias: true, depth: false, stencil: false });

    if (!this.gl) {
      document.body.classList.add("no-webgl");
      return;
    }

    this.state = { ...backgroundStates.hero };
    this.target = { ...backgroundStates.hero };
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.start = performance.now();
    this.createPrograms();
    this.createGeometry();
    this.resize();
    window.addEventListener("resize", () => this.resize());
    requestAnimationFrame((time) => this.render(time));
  }

  createPrograms() {
    const gl = this.gl;
    this.fluidProgram = this.linkProgram(
      `
      attribute vec2 aPosition;
      varying vec2 vUv;
      void main() {
        vUv = aPosition * 0.5 + 0.5;
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }`,
      `
      precision mediump float;
      uniform float uTime;
      uniform float uIntensity;
      uniform float uWarm;
      uniform float uAspect;
      varying vec2 vUv;
      mat2 rotate(float a) {
        float s = sin(a);
        float c = cos(a);
        return mat2(c, -s, s, c);
      }
      void main() {
        vec2 p = vUv - 0.5;
        p.x *= uAspect;
        float t = uTime * 0.16;
        vec2 q = rotate(0.18 * sin(t)) * p;
        q += 0.16 * vec2(sin(p.y * 4.2 + t * 3.1), cos(p.x * 3.6 - t * 2.4));
        float flowA = sin(q.x * 5.4 + q.y * 2.2 + t * 4.2);
        float flowB = cos(q.y * 6.2 - q.x * 2.6 - t * 3.4);
        float flowC = sin((q.x + q.y) * 4.8 + flowA * 1.2 + t * 2.2);
        float ribbon = smoothstep(0.05, 0.86, flowA * 0.48 + flowB * 0.32 + flowC * 0.28);
        float soft = smoothstep(0.04, 0.88, sin(length(q) * 7.4 - t * 4.8) * 0.5 + 0.5);
        float amberRibbon = smoothstep(0.38, 0.96, sin(q.x * 3.2 - q.y * 4.6 + flowB + t * 2.6) * 0.5 + 0.5);
        float glassRibbon = smoothstep(0.28, 0.98, cos(q.x * 4.8 + q.y * 3.2 + flowC - t * 2.8) * 0.5 + 0.5);
        float haze = smoothstep(0.0, 1.0, 1.0 - length(p) * 0.56);
        vec3 paper = vec3(0.86, 1.0, 0.96);
        vec3 aqua = vec3(0.09, 0.95, 0.88);
        vec3 blue = vec3(0.20, 0.48, 0.82);
        vec3 amber = vec3(1.0, 0.69, 0.26);
        vec3 glass = vec3(0.72, 0.96, 1.0);
        vec3 ink = vec3(0.02, 0.09, 0.10);
        vec3 color = mix(paper, aqua, 0.24 + ribbon * 0.58);
        color = mix(color, glass, glassRibbon * 0.34 * uIntensity);
        color = mix(color, blue, (0.12 + soft * 0.24) * uIntensity);
        color = mix(color, amber, clamp(uWarm * (0.1 + amberRibbon * 0.46), 0.0, 0.62));
        color = mix(color, ink, 0.08 + (1.0 - haze) * 0.3);
        color += vec3(0.12, 0.24, 0.2) * ribbon * uIntensity;
        gl_FragColor = vec4(color, 1.0);
      }`,
    );

    this.pointProgram = this.linkProgram(
      `
      attribute vec2 aPosition;
      attribute float aPhase;
      attribute float aStrength;
      attribute float aWarm;
      uniform float uTime;
      uniform float uAmp;
      uniform float uSpeed;
      uniform float uDpr;
      varying float vStrength;
      varying float vWarm;
      void main() {
        vec2 pos = aPosition;
        float t = uTime * uSpeed;
        float wave = sin((pos.x * 4.4) + t + aPhase) + cos((pos.y * 5.2) - t * 0.72 + aPhase);
        pos.x += cos(t * 0.38 + aPhase) * uAmp * 0.38 * aStrength;
        pos.y += wave * uAmp * 0.42 * aStrength;
        gl_Position = vec4(pos, 0.0, 1.0);
        gl_PointSize = (1.2 + 3.4 * aStrength) * uDpr;
        vStrength = aStrength;
        vWarm = aWarm;
      }`,
      `
      precision mediump float;
      uniform float uAlpha;
      uniform float uIsPoints;
      uniform float uWarm;
      varying float vStrength;
      varying float vWarm;
      void main() {
        float alpha = 1.0;
        if (uIsPoints > 0.5) {
          float dist = length(gl_PointCoord - vec2(0.5));
          alpha = smoothstep(0.5, 0.05, dist);
        }
        vec3 cool = vec3(0.24, 0.96, 0.88);
        vec3 warm = vec3(1.0, 0.66, 0.28);
        vec3 color = mix(cool, warm, clamp(vWarm * uWarm, 0.0, 1.0));
        gl_FragColor = vec4(color, alpha * uAlpha * (0.42 + vStrength * 0.58));
      }`,
    );

    this.fluid = {
      position: gl.getAttribLocation(this.fluidProgram, "aPosition"),
      time: gl.getUniformLocation(this.fluidProgram, "uTime"),
      intensity: gl.getUniformLocation(this.fluidProgram, "uIntensity"),
      warm: gl.getUniformLocation(this.fluidProgram, "uWarm"),
      aspect: gl.getUniformLocation(this.fluidProgram, "uAspect"),
    };

    this.points = {
      position: gl.getAttribLocation(this.pointProgram, "aPosition"),
      phase: gl.getAttribLocation(this.pointProgram, "aPhase"),
      strength: gl.getAttribLocation(this.pointProgram, "aStrength"),
      warm: gl.getAttribLocation(this.pointProgram, "aWarm"),
      time: gl.getUniformLocation(this.pointProgram, "uTime"),
      amp: gl.getUniformLocation(this.pointProgram, "uAmp"),
      speed: gl.getUniformLocation(this.pointProgram, "uSpeed"),
      dpr: gl.getUniformLocation(this.pointProgram, "uDpr"),
      alpha: gl.getUniformLocation(this.pointProgram, "uAlpha"),
      isPoints: gl.getUniformLocation(this.pointProgram, "uIsPoints"),
      warmAmount: gl.getUniformLocation(this.pointProgram, "uWarm"),
    };
  }

  linkProgram(vertexSource, fragmentSource) {
    const gl = this.gl;
    const program = gl.createProgram();
    gl.attachShader(program, this.compileShader(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, this.compileShader(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || "Could not link WebGL program.");
    }

    return program;
  }

  compileShader(type, source) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader) || "Could not compile WebGL shader.");
    }

    return shader;
  }

  createGeometry() {
    const gl = this.gl;
    const columns = 56;
    const rows = 30;
    const data = [];
    const indices = [];

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const index = row * columns + column;
        const x = -1.18 + (column / (columns - 1)) * 2.36;
        const y = -1.06 + (row / (rows - 1)) * 2.12;
        data.push(x, y, Math.random() * Math.PI * 2, 0.24 + Math.random() * 0.76, Math.random() > 0.88 ? 1 : 0);
        if (column < columns - 1) indices.push(index, index + 1);
        if (row < rows - 1) indices.push(index, index + columns);
      }
    }

    this.pointCount = columns * rows;
    this.indexCount = indices.length;
    this.fluidBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.fluidBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    this.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);

    this.indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
  }

  resize() {
    if (!this.gl) return;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.floor(window.innerWidth * this.dpr);
    const height = Math.floor(window.innerHeight * this.dpr);
    this.canvas.width = width;
    this.canvas.height = height;
    this.gl.viewport(0, 0, width, height);
  }

  setState(name) {
    this.target = { ...(backgroundStates[name] || backgroundStates.hero) };
    document.documentElement.style.setProperty("--bg-blur", `${this.target.blur}px`);
    document.documentElement.style.setProperty("--bg-opacity", String(this.target.opacity));
    document.documentElement.style.setProperty("--bg-brightness", String(this.target.brightness));
  }

  render(now) {
    const gl = this.gl;
    if (!gl) return;

    for (const key of ["amp", "speed", "pointAlpha", "lineAlpha", "warm", "fluid"]) {
      this.state[key] += (this.target[key] - this.state[key]) * 0.045;
    }

    const time = (now - this.start) / 1000;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.disable(gl.BLEND);
    gl.useProgram(this.fluidProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.fluidBuffer);
    gl.enableVertexAttribArray(this.fluid.position);
    gl.vertexAttribPointer(this.fluid.position, 2, gl.FLOAT, false, 0, 0);
    gl.uniform1f(this.fluid.time, time);
    gl.uniform1f(this.fluid.intensity, this.state.fluid);
    gl.uniform1f(this.fluid.warm, this.state.warm);
    gl.uniform1f(this.fluid.aspect, this.canvas.width / Math.max(1, this.canvas.height));
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.useProgram(this.pointProgram);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

    const stride = 5 * Float32Array.BYTES_PER_ELEMENT;
    gl.enableVertexAttribArray(this.points.position);
    gl.vertexAttribPointer(this.points.position, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(this.points.phase);
    gl.vertexAttribPointer(this.points.phase, 1, gl.FLOAT, false, stride, 2 * Float32Array.BYTES_PER_ELEMENT);
    gl.enableVertexAttribArray(this.points.strength);
    gl.vertexAttribPointer(this.points.strength, 1, gl.FLOAT, false, stride, 3 * Float32Array.BYTES_PER_ELEMENT);
    gl.enableVertexAttribArray(this.points.warm);
    gl.vertexAttribPointer(this.points.warm, 1, gl.FLOAT, false, stride, 4 * Float32Array.BYTES_PER_ELEMENT);

    gl.uniform1f(this.points.time, time);
    gl.uniform1f(this.points.amp, this.state.amp);
    gl.uniform1f(this.points.speed, this.state.speed);
    gl.uniform1f(this.points.dpr, this.dpr);
    gl.uniform1f(this.points.warmAmount, this.state.warm);
    gl.uniform1f(this.points.isPoints, 0);
    gl.uniform1f(this.points.alpha, this.state.lineAlpha);
    gl.drawElements(gl.LINES, this.indexCount, gl.UNSIGNED_SHORT, 0);
    gl.uniform1f(this.points.isPoints, 1);
    gl.uniform1f(this.points.alpha, this.state.pointAlpha);
    gl.drawArrays(gl.POINTS, 0, this.pointCount);

    requestAnimationFrame((frameTime) => this.render(frameTime));
  }
}

class AIPresentationFramework {
  constructor() {
    this.deck = document.getElementById("deck");
    this.background = new ParticleField(document.getElementById("webgl-background"));
    this.current = 0;
    this.presentation = null;
    this.demoStates = new Map();
    this.revealStates = new Map();
    this.attachments = new Map();
    this.activeTooltip = null;
    this.contrastThemeIndex = 0;
    this.transcriptMode = new URLSearchParams(window.location.search).get("transcript") === "full" ? "full" : "compact";

    this.progressFill = document.getElementById("progress-fill");
    this.slideCount = document.getElementById("slide-count");
    this.sectionMap = document.getElementById("section-map");
    this.sections = [];
    this.drawer = document.getElementById("attachment-drawer");
    this.drawerTitle = document.getElementById("attachment-title");
    this.drawerMeta = document.getElementById("attachment-meta");
    this.drawerBody = document.getElementById("attachment-body");
    this.drawerOpen = document.getElementById("attachment-open");
    this.messagePreview = document.getElementById("message-preview-modal");
    this.messagePreviewTitle = document.getElementById("message-preview-title");
    this.messagePreviewMeta = document.getElementById("message-preview-meta");
    this.messagePreviewBody = document.getElementById("message-preview-body");
    this.messagePreviewClose = document.getElementById("message-preview-close");
    this.messagePreviewReturnFocus = null;
    this.contrastIndicator = this.createContrastIndicator();

    document.body.dataset.transcriptMode = this.transcriptMode;
    this.bindEvents();
  }

  async init() {
    try {
      this.presentation = await loadJSON(PRESENTATION_MANIFEST);
      await this.loadTranscripts();
      document.title = this.presentation.meta?.title || "AI Presentation Framework";
      this.applyContrastTheme(0, { announce: false });
      this.renderSlides();
      this.goTo(this.presentation.settings?.startSlide || 0);
    } catch (error) {
      this.renderError(error);
    }
  }

  async loadTranscripts() {
    const slides = this.presentation.slides || [];

    for (const slide of slides) {
      if (slide.video?.path) {
        this.attachments.set(slide.video.path, slide.video);
      }

      if (this.getRevealStepsForSlide(slide).length) {
        this.revealStates.set(slide.id, this.createRevealState(slide));
      }

      this.registerBlockAttachments(slide.blocks || []);

      if (slide.type !== "ai-demo" || !slide.transcript) continue;
      slide.transcriptData = await loadJSON(slide.transcript);
      this.demoStates.set(slide.id, this.createDemoState());

      for (const message of slide.transcriptData.messages || []) {
        for (const attachment of message.attachments || []) {
          this.attachments.set(attachment.path, attachment);
        }
      }
    }
  }

  bindEvents() {
    document.getElementById("next-slide").addEventListener("click", () => this.next());
    document.getElementById("prev-slide").addEventListener("click", () => this.previous());
    document.getElementById("fullscreen-toggle").addEventListener("click", () => this.toggleFullscreen());
    document.getElementById("attachment-close").addEventListener("click", () => this.closeAttachment());
    this.messagePreviewClose?.addEventListener("click", () => this.closeMessagePreview());

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        if (this.drawer.classList.contains("is-open")) {
          this.closeAttachment();
          return;
        }

        if (this.isMessagePreviewOpen()) {
          this.closeMessagePreview();
          return;
        }
      }

      if (this.isMessagePreviewOpen()) {
        event.preventDefault();
        return;
      }

      if (event.target.closest("button, a, input, textarea, select")) return;

      if (event.key === "ArrowRight" || event.key === " " || event.key === "PageDown") {
        event.preventDefault();
        this.next();
      }

      if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        this.previous();
      }

      if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        this.toggleFullscreen();
      }

      if (event.key.toLowerCase() === "b") {
        event.preventDefault();
        this.cycleContrastTheme();
      }

      if (event.key.toLowerCase() === "t") {
        event.preventDefault();
        this.toggleTranscriptMode();
      }
    });

    document.addEventListener("wheel", (event) => this.handleScrollableWheel(event), { passive: false });

    document.addEventListener("click", (event) => {
      const closePreview = event.target.closest("[data-message-preview-close]");
      if (closePreview) {
        event.preventDefault();
        this.closeMessagePreview();
        return;
      }

      const sectionJump = event.target.closest("[data-section-jump]");
      if (sectionJump) {
        event.preventDefault();
        this.jumpToSection(sectionJump.dataset.sectionJump);
        return;
      }

      const storyNext = event.target.closest("[data-story-next]");
      if (storyNext) {
        this.nextStoryStep(storyNext.closest(".slide"));
        return;
      }

      const transcriptToggle = event.target.closest("[data-transcript-toggle]");
      if (transcriptToggle) {
        event.preventDefault();
        this.toggleTranscriptMode();
        return;
      }

      const reset = event.target.closest("[data-demo-reset]");
      if (reset) {
        this.resetDemo(reset.closest(".slide"));
        return;
      }

      const attachment = event.target.closest("[data-attachment-path]");
      if (attachment) {
        event.preventDefault();
        this.openAttachment({
          title: attachment.dataset.attachmentTitle,
          type: attachment.dataset.attachmentType,
          path: attachment.dataset.attachmentPath,
          poster: attachment.dataset.attachmentPoster,
        });
        return;
      }

      const messagePreview = event.target.closest("[data-message-preview]");
      if (messagePreview) {
        event.preventDefault();
        const messageNode = messagePreview.closest("[data-message-id]");
        const demoSlide = messagePreview.closest("[data-demo-id]");
        this.openMessagePreview(messageNode?.dataset.messageId || messagePreview.dataset.messagePreview, demoSlide, messagePreview);
        return;
      }
    });
  }

  handleScrollableWheel(event) {
    if (event.ctrlKey || event.metaKey) return;

    const pane = event.target.closest("[data-chat-log], .attachment-body, .message-preview-body, .csv-table-wrap");
    if (!pane) return;

    const maxY = Math.max(0, pane.scrollHeight - pane.clientHeight);
    const maxX = Math.max(0, pane.scrollWidth - pane.clientWidth);
    if (maxY <= 1 && maxX <= 1) return;

    const unit = event.deltaMode === 1 ? 18 : event.deltaMode === 2 ? pane.clientHeight : 1;
    const deltaY = event.deltaY * unit;
    const deltaX = event.deltaX * unit;
    const nextY = maxY > 1 ? clampNumber(pane.scrollTop + deltaY, 0, maxY) : pane.scrollTop;
    const nextX = maxX > 1 ? clampNumber(pane.scrollLeft + deltaX, 0, maxX) : pane.scrollLeft;
    const changed = nextY !== pane.scrollTop || nextX !== pane.scrollLeft;

    if (changed) {
      pane.scrollTop = nextY;
      pane.scrollLeft = nextX;
      event.preventDefault();
    }

    event.stopPropagation();
  }

  renderSlides() {
    this.deck.innerHTML = this.presentation.slides.map((slide) => this.renderSlide(slide)).join("");
    this.slides = Array.from(this.deck.querySelectorAll(".slide"));
    this.sections = this.getSectionDefinitions();
    this.renderSectionMap();
  }

  renderSlide(slide) {
    const bg = escapeAttribute(slide.background || this.presentation.settings?.defaultBackground || "hero");
    const id = escapeAttribute(slide.id);

    if (slide.type === "compose" || slide.blocks?.length) {
      return this.renderComposeSlide(slide, bg, id);
    }

    if (slide.type === "title") {
      return `
        <section class="slide slide-title" data-slide-id="${id}" data-bg="${bg}" data-title="${escapeAttribute(slide.title)}">
          <div class="title-grid">
            <div class="title-copy">
              ${slide.showVersion && this.presentation.meta?.version ? `<span class="version-badge">Version ${escapeHTML(this.presentation.meta.version)}</span>` : ""}
              <h1>${formatDisplayText(slide.title)}</h1>
              <p>${escapeHTML(slide.body || "")}</p>
            </div>
            <div class="workflow-rail" aria-label="Presentation workflow">
              ${(slide.workflow || []).map((item, index) => this.renderWorkflowStep(item, index)).join("")}
            </div>
          </div>
        </section>`;
    }

    if (slide.type === "text") {
      return `
        <section class="slide slide-text" data-slide-id="${id}" data-bg="${bg}" data-title="${escapeAttribute(slide.title)}">
          <div class="content-narrow">
            <h2>${escapeHTML(slide.title)}</h2>
            ${(slide.paragraphs || []).map((paragraph) => `<p>${escapeHTML(paragraph)}</p>`).join("")}
          </div>
        </section>`;
    }

    if (slide.type === "cards") {
      const revealId = this.getRevealStepsForSlide(slide).length ? `data-reveal-id="${id}"` : "";
      return `
        <section class="slide slide-bullets" data-slide-id="${id}" data-bg="${bg}" data-title="${escapeAttribute(slide.title)}" ${revealId}>
          <div class="content-wide">
            <h2>${escapeHTML(slide.title)}</h2>
            <div class="bullet-grid">
              ${(slide.cards || []).map((card, index) => this.renderCard(card, `${id}-card-${index}`)).join("")}
            </div>
          </div>
        </section>`;
    }

    if (slide.type === "about") {
      return this.renderAboutSlide(slide, bg, id);
    }

    if (slide.type === "agenda") {
      return this.renderAgendaSlide(slide, bg, id);
    }

    if (slide.type === "use-case") {
      return this.renderUseCaseSlide(slide, bg, id);
    }

    if (slide.type === "comparison") {
      return this.renderComparisonSlide(slide, bg, id);
    }

    if (slide.type === "prompt-anatomy") {
      return this.renderPromptAnatomySlide(slide, bg, id);
    }

    if (slide.type === "tool-map") {
      return this.renderToolMapSlide(slide, bg, id);
    }

    if (slide.type === "verification") {
      return this.renderVerificationSlide(slide, bg, id);
    }

    if (slide.type === "artifact-gallery") {
      return this.renderArtifactGallerySlide(slide, bg, id);
    }

    if (slide.type === "impact") {
      return this.renderImpactSlide(slide, bg, id);
    }

    if (slide.type === "playbook") {
      return this.renderPlaybookSlide(slide, bg, id);
    }

    if (slide.type === "resources") {
      return this.renderResourcesSlide(slide, bg, id);
    }

    if (slide.type === "ai-demo") {
      return this.renderDemoSlide(slide, bg, id);
    }

    if (slide.type === "video" || slide.type === "video-demo") {
      return this.renderVideoSlide(slide, bg, id);
    }

    if (slide.type === "final") {
      return `
        <section class="slide slide-final" data-slide-id="${id}" data-bg="${bg}" data-title="${escapeAttribute(slide.title)}">
          <div class="final-copy">
            <h2>${escapeHTML(slide.title)}</h2>
            <p>${escapeHTML(slide.body || "")}</p>
            ${slide.link ? `<a class="final-link" href="${escapeAttribute(slide.link.href)}" target="_blank" rel="noreferrer">${escapeHTML(slide.link.label)}</a>` : ""}
          </div>
        </section>`;
    }

    return `
      <section class="slide slide-text" data-slide-id="${id}" data-bg="${bg}" data-title="${escapeAttribute(slide.title || "Untitled")}">
        <div class="content-narrow">
          <h2>${escapeHTML(slide.title || "Untitled slide")}</h2>
          <p>Unsupported slide type: ${escapeHTML(slide.type || "missing")}</p>
        </div>
      </section>`;
  }

  renderWorkflowStep(item, index) {
    return `
      <div class="workflow-step ${index === 0 ? "is-active" : ""} ${index === 4 ? "is-warm" : ""}">
        <span class="step-icon" aria-hidden="true">${iconMap[item.icon] || iconMap.doc}</span>
        <strong>${escapeHTML(item.title)}</strong>
        <span>${escapeHTML(item.body)}</span>
      </div>`;
  }

  renderCard(card, fallbackId = "card") {
    const attrs = this.templateItemAttrs(card, card.id || fallbackId);
    return `
      <article ${attrs}>
        <span>${escapeHTML(card.number || "")}</span>
        <h3>${escapeHTML(card.title)}</h3>
        <p>${escapeHTML(card.body || "")}</p>
      </article>`;
  }

  renderComposeSlide(slide, bg, id) {
    const layout = escapeAttribute(slide.layout || "stack");
    const revealId = this.getRevealStepsForSlide(slide).length ? `data-reveal-id="${id}"` : "";

    return `
      <section class="slide slide-compose slide-compose-${layout}" data-slide-id="${id}" data-bg="${bg}" data-title="${escapeAttribute(slide.title || "Composable slide")}" ${revealId}>
        <div class="compose-layout is-${layout}">
          ${(slide.blocks || []).map((block, index) => this.renderBlock(block, `block-${index}`)).join("")}
        </div>
      </section>`;
  }

  renderBlock(block = {}, fallbackId = "block") {
    const type = block.type || "text";
    const id = block.id || fallbackId;
    const attrs = this.blockAttrs(block, id, `block-${type}`);

    if (type === "heading") {
      const level = Math.max(1, Math.min(3, Number(block.level || 2)));
      return `<h${level} ${attrs}>${escapeHTML(block.text || block.title || "")}</h${level}>`;
    }

    if (type === "text") {
      const paragraphs = block.paragraphs || [block.body || block.text || ""].filter(Boolean);
      return `
        <div ${attrs}>
          ${paragraphs.map((paragraph) => `<p>${escapeHTML(paragraph)}</p>`).join("")}
        </div>`;
    }

    if (type === "list" || type === "bullets") {
      return `
        <div ${attrs}>
          ${block.title ? `<strong>${escapeHTML(block.title)}</strong>` : ""}
          <ul class="compose-list">
            ${(block.items || []).map((item, index) => this.renderListItem(item, `${id}-item-${index}`)).join("")}
          </ul>
        </div>`;
    }

    if (type === "cards") {
      const columns = Math.max(1, Math.min(5, Number(block.columns || block.cards?.length || 3)));
      return `
        <div ${attrs} style="--compose-columns: ${columns}">
          ${(block.cards || []).map((card, index) => this.renderCardBlock(card, `${id}-card-${index}`)).join("")}
        </div>`;
    }

    if (type === "metrics") {
      const columns = Math.max(1, Math.min(5, Number(block.columns || block.items?.length || 3)));
      return `
        <div ${attrs} style="--compose-columns: ${columns}">
          ${(block.items || block.metrics || []).map((metric, index) => `
            <article class="compose-metric ${index === 0 && block.primaryFirst ? "is-primary" : ""}">
              <strong>${escapeHTML(metric.value || "")}</strong>
              <span>${escapeHTML(metric.label || "")}</span>
            </article>`).join("")}
        </div>`;
    }

    if (type === "callout") {
      return `
        <article ${attrs}>
          ${block.label ? `<span>${escapeHTML(block.label)}</span>` : ""}
          ${block.title ? `<strong>${escapeHTML(block.title)}</strong>` : ""}
          ${block.body ? `<p>${escapeHTML(block.body)}</p>` : ""}
        </article>`;
    }

    if (type === "quote") {
      return `
        <blockquote ${attrs}>
          <p>${escapeHTML(block.text || block.body || "")}</p>
          ${block.source ? `<cite>${escapeHTML(block.source)}</cite>` : ""}
        </blockquote>`;
    }

    if (type === "prompt") {
      return `
        <div ${attrs}>
          <div class="prompt-toolbar">
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
            <strong>${escapeHTML(block.label || "Prompt")}</strong>
          </div>
          <pre>${escapeHTML(block.text || block.prompt || "")}</pre>
        </div>`;
    }

    if (type === "artifacts") {
      return `
        <div ${attrs}>
          ${(block.items || block.artifacts || []).map((artifact, index) => this.renderArtifactCard(artifact, index)).join("")}
        </div>`;
    }

    if (type === "timeline") {
      return `
        <div ${attrs}>
          ${(block.items || []).map((item, index) => `
            <article class="compose-timeline-item">
              <span>${escapeHTML(item.label || String(index + 1).padStart(2, "0"))}</span>
              <strong>${escapeHTML(item.title || "")}</strong>
              <p>${escapeHTML(item.body || "")}</p>
            </article>`).join("")}
        </div>`;
    }

    if (type === "video") {
      const video = block.video || block;
      return `
        <figure ${attrs}>
          <video controls playsinline preload="metadata" ${video.poster ? `poster="${escapeAttribute(video.poster)}"` : ""}>
            <source src="${escapeAttribute(video.path || "")}" type="${videoMime(video.path || "")}" />
            Your browser does not support this video.
          </video>
          ${(video.title || video.caption) ? `<figcaption><strong>${escapeHTML(video.title || "")}</strong><span>${escapeHTML(video.caption || video.type || "")}</span></figcaption>` : ""}
        </figure>`;
    }

    if (type === "image") {
      return `
        <figure ${attrs}>
          <img src="${escapeAttribute(block.src || block.path || "")}" alt="${escapeAttribute(block.alt || block.title || "")}" />
          ${(block.title || block.caption) ? `<figcaption><strong>${escapeHTML(block.title || "")}</strong><span>${escapeHTML(block.caption || "")}</span></figcaption>` : ""}
        </figure>`;
    }

    if (type === "columns" || type === "grid" || type === "group") {
      const columns = Math.max(1, Math.min(5, Number(block.columns || block.blocks?.length || 2)));
      return `
        <div ${attrs} style="--compose-columns: ${columns}">
          ${(block.blocks || []).map((child, index) => this.renderBlock(child, `${id}-${index}`)).join("")}
        </div>`;
    }

    if (type === "link") {
      return `
        <div ${attrs}>
          <a class="block-link-button" href="${escapeAttribute(block.href || "#")}" target="_blank" rel="noreferrer">${escapeHTML(block.label || "Open")} <span aria-hidden="true">↗</span></a>
          ${block.caption ? `<span class="block-link-caption">${escapeHTML(block.caption)}</span>` : ""}
        </div>`;
    }

    if (type === "process") {
      const steps = block.steps || [];
      const n = steps.length || 1;
      const loop = block.loop
        ? `<div class="process-loop" style="grid-column: ${Number(block.loop.to || 1)} / ${Number(block.loop.from || n) + 1}">
            <span>↺ ${escapeHTML(block.loop.label || "Feedback loop")}</span>
          </div>`
        : "";
      return `
        <div ${attrs} style="--process-steps: ${n}">
          <ol class="process-track">
            ${steps.map((step, index) => {
              const stepAttrs = this.blockAttrs(step, step.id || `${id}-step-${index}`, [
                "process-node",
                step.goal ? "is-goal" : "",
                block.active && Number(block.active) === index + 1 ? "is-current" : "",
                block.active && Number(block.active) > index + 1 ? "is-done" : "",
              ].join(" "));
              return `
              <li ${stepAttrs}>
                <span class="process-num">${escapeHTML(step.number || (step.goal ? "★" : String(index + 1).padStart(2, "0")))}</span>
                <strong>${escapeHTML(step.title || "")}</strong>
                ${step.body && !block.compact ? `<p>${escapeHTML(step.body)}</p>` : ""}
              </li>`;
            }).join("")}
          </ol>
          ${block.compact ? "" : loop}
        </div>`;
    }

    if (type === "spacer") {
      return `<div ${attrs} aria-hidden="true"></div>`;
    }

    return `
      <article ${attrs}>
        ${block.label ? `<span>${escapeHTML(block.label)}</span>` : ""}
        ${block.title ? `<strong>${escapeHTML(block.title)}</strong>` : ""}
        ${block.body || block.text ? `<p>${escapeHTML(block.body || block.text)}</p>` : ""}
      </article>`;
  }

  blockAttrs(block, id, className = "") {
    const revealMode = block.reveal === "collapse" ? "collapse" : "reserve";
    const revealable = block.reveal || block.visible === false;
    const hidden = revealable ? "is-revealable is-reveal-hidden" : "";
    const collapsed = revealMode === "collapse" && revealable ? "is-collapsed" : "";
    const variant = block.variant ? `is-${escapeAttribute(block.variant)}` : "";
    const extra = block.className ? escapeAttribute(block.className) : "";

    return [
      `class="compose-block ${className} ${variant} ${extra} ${hidden} ${collapsed}"`,
      `data-block-id="${escapeAttribute(id)}"`,
      revealable ? `data-reveal-mode="${escapeAttribute(revealMode)}"` : "",
    ].filter(Boolean).join(" ");
  }

  templateItemAttrs(item = {}, id = "item", className = "") {
    const revealMode = item.reveal === "collapse" ? "collapse" : "reserve";
    const revealable = item.reveal || item.visible === false;
    const hidden = revealable ? "is-revealable is-reveal-hidden" : "";
    const collapsed = revealMode === "collapse" && revealable ? "is-collapsed" : "";
    const extra = item.className ? escapeAttribute(item.className) : "";
    const classes = [className, extra, hidden, collapsed].filter(Boolean).join(" ");

    return [
      classes ? `class="${classes}"` : "",
      `data-block-id="${escapeAttribute(id)}"`,
      revealable ? `data-reveal-mode="${escapeAttribute(revealMode)}"` : "",
    ].filter(Boolean).join(" ");
  }

  renderListItem(item, fallbackId) {
    if (typeof item === "string") {
      return `<li>${escapeHTML(item)}</li>`;
    }

    const attrs = item.id || item.reveal || item.visible === false
      ? this.blockAttrs(item, item.id || fallbackId, "compose-list-item")
      : `class="compose-list-item"`;

    return `<li ${attrs}>${escapeHTML(item.text || item.body || item.title || "")}</li>`;
  }

  renderCardBlock(card = {}, fallbackId) {
    const openable = card.path
      ? ` data-attachment-path="${escapeAttribute(card.path)}" data-attachment-title="${escapeAttribute(card.pathTitle || card.label || card.title || "")}" data-attachment-type="${escapeAttribute(card.pathType || "Excerpt")}" role="button" tabindex="0"`
      : "";
    const attrs = this.blockAttrs(card, card.id || fallbackId, `compose-card${card.path ? " is-openable" : ""}`) + openable;
    return `
      <article ${attrs}>
        ${card.label || card.number ? `<span>${escapeHTML(card.label || card.number)}</span>` : ""}
        ${card.title ? `<strong>${escapeHTML(card.title)}</strong>` : ""}
        ${card.body ? `<p>${escapeHTML(card.body)}</p>` : ""}
        ${this.renderProsCons(card)}
        ${card.path ? `<em class="card-open-hint">${escapeHTML(card.openLabel || "Open the real file")} ↗</em>` : ""}
      </article>`;
  }

  renderProsCons(card = {}) {
    const group = (items, kind, label) => Array.isArray(items) && items.length
      ? `<div class="card-procon is-${kind}">
          <em>${escapeHTML(label)}</em>
          <ul>${items.map((item) => `<li>${escapeHTML(item)}</li>`).join("")}</ul>
        </div>`
      : "";
    return group(card.pros, "pro", card.prosLabel || "Good for")
      + group(card.cons, "con", card.consLabel || "Breaks")
      + group(card.todo, "todo", card.todoLabel || "What we need to do")
      + group(card.notes, "note", card.notesLabel || "From our projects");
  }

  renderArtifactCard(artifact = {}, index = 0) {
    return `
      <a
        class="artifact-card ${index === 0 ? "is-featured" : ""}"
        href="${escapeAttribute(artifact.path || "#")}"
        target="_blank"
        rel="noreferrer"
        data-attachment-path="${escapeAttribute(artifact.path || "")}"
        data-attachment-title="${escapeAttribute(artifact.title || "")}"
        data-attachment-type="${escapeAttribute(artifact.type || "Artifact")}"
        ${artifact.poster ? `data-attachment-poster="${escapeAttribute(artifact.poster)}"` : ""}
      >
        <span>${escapeHTML(artifact.type || "Artifact")}</span>
        <strong>${escapeHTML(artifact.title || fileName(artifact.path || ""))}</strong>
        <p>${escapeHTML(artifact.body || "")}</p>
        ${artifact.meta ? `<em>${escapeHTML(artifact.meta)}</em>` : ""}
      </a>`;
  }

  renderAboutSlide(slide, bg, id) {
    const photo = slide.photo || {};
    const initials = getInitials(slide.name || this.presentation.meta?.speaker || "YN");
    const portrait = photo.src
      ? `<img src="${escapeAttribute(photo.src)}" alt="${escapeAttribute(photo.alt || `${slide.name || "Speaker"} profile photo`)}" />`
      : `<span>${escapeHTML(initials)}</span>`;
    const contactLinks = [slide.linkedin, slide.email].filter(Boolean);

    return `
      <section class="slide slide-about" data-slide-id="${id}" data-bg="${bg}" data-title="${escapeAttribute(slide.title || "About me")}">
        <div class="about-layout">
          <div class="profile-card">
            <figure class="portrait-mark">
              ${portrait}
            </figure>
            <div class="profile-links">
              ${contactLinks.map((link) => this.renderContactLink(link)).join("")}
            </div>
          </div>
          <div class="about-copy">
            <h2>${escapeHTML(slide.title || "About me")}</h2>
            <p class="about-name">${escapeHTML(slide.name || this.presentation.meta?.speaker || "Your name")}</p>
            ${slide.role ? `<p class="about-role">${escapeHTML(slide.role)}</p>` : ""}
            <dl class="about-list">
              ${(slide.bullets || []).map((item) => this.renderAboutItem(item)).join("")}
            </dl>
          </div>
        </div>
      </section>`;
  }

  renderContactLink(link) {
    return `
      <a href="${escapeAttribute(link.href)}" target="_blank" rel="noreferrer">
        <span>${escapeHTML(link.label)}</span>
      </a>`;
  }

  renderAboutItem(item) {
    const content = Array.isArray(item.points) && item.points.length
      ? `<ul>${item.points.map((point) => `<li>${escapeHTML(point)}</li>`).join("")}</ul>`
      : escapeHTML(item.body || "");

    return `
      <div>
        <dt>${escapeHTML(item.title || "")}</dt>
        <dd>${content}</dd>
      </div>`;
  }

  renderTemplateIntro(slide) {
    return `
      <div class="template-intro">
        <h2>${escapeHTML(slide.title || "Untitled")}</h2>
        ${slide.body ? `<p>${escapeHTML(slide.body)}</p>` : ""}
      </div>`;
  }

  renderAgendaSlide(slide, bg, id) {
    const revealId = this.getRevealStepsForSlide(slide).length ? `data-reveal-id="${id}"` : "";
    return `
      <section class="slide slide-template slide-agenda" data-slide-id="${id}" data-bg="${bg}" data-title="${escapeAttribute(slide.title)}" ${revealId}>
        <div class="template-layout">
          ${this.renderTemplateIntro(slide)}
          <div class="agenda-track">
            ${(slide.items || []).map((item, index) => `
              <article ${this.templateItemAttrs(item, item.id || `${id}-agenda-${index}`, "agenda-item")}>
                <span>${String(index + 1).padStart(2, "0")}</span>
                <strong>${escapeHTML(item.title)}</strong>
                <p>${escapeHTML(item.body || "")}</p>
              </article>`).join("")}
          </div>
        </div>
      </section>`;
  }

  renderUseCaseSlide(slide, bg, id) {
    const revealId = this.getRevealStepsForSlide(slide).length ? `data-reveal-id="${id}"` : "";
    const successReveal = {
      id: slide.successId || `${id}-success`,
      reveal: slide.successReveal,
    };
    return `
      <section class="slide slide-template slide-use-case" data-slide-id="${id}" data-bg="${bg}" data-title="${escapeAttribute(slide.title)}" ${revealId}>
        <div class="template-layout">
          ${this.renderTemplateIntro(slide)}
          <div class="case-board">
            <div class="setup-grid">
              ${(slide.items || []).map((item, index) => `
                <article ${this.templateItemAttrs(item, item.id || `${id}-case-${index}`)}>
                  <span>${escapeHTML(item.label || `Input ${index + 1}`)}</span>
                  <strong>${escapeHTML(item.title || "")}</strong>
                  <p>${escapeHTML(item.body || "")}</p>
                </article>`).join("")}
            </div>
            ${slide.success ? `<div ${this.templateItemAttrs(successReveal, successReveal.id, "template-outcome")}><span>${escapeHTML(slide.successLabel || "Success looks like")}</span><strong>${escapeHTML(slide.success)}</strong></div>` : ""}
          </div>
        </div>
      </section>`;
  }

  renderComparisonSlide(slide, bg, id) {
    return `
      <section class="slide slide-template slide-comparison" data-slide-id="${id}" data-bg="${bg}" data-title="${escapeAttribute(slide.title)}">
        <div class="template-layout">
          ${this.renderTemplateIntro(slide)}
          <div class="comparison-flow">
            <div class="comparison-bridge" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M4 12h14" /><path d="m13 6 6 6-6 6" /></svg>
            </div>
            <div class="comparison-grid">
            ${(slide.columns || []).map((column) => `
              <article class="comparison-card ${column.variant ? `is-${escapeAttribute(column.variant)}` : ""}">
                <span>${escapeHTML(column.label || "")}</span>
                <h3>${escapeHTML(column.title || "")}</h3>
                <ul>${(column.items || []).map((item) => `<li>${escapeHTML(item)}</li>`).join("")}</ul>
              </article>`).join("")}
            </div>
          </div>
        </div>
      </section>`;
  }

  renderPromptAnatomySlide(slide, bg, id) {
    return `
      <section class="slide slide-template slide-prompt" data-slide-id="${id}" data-bg="${bg}" data-title="${escapeAttribute(slide.title)}">
        <div class="template-layout prompt-layout">
          ${this.renderTemplateIntro(slide)}
          <div class="prompt-panel">
            <div class="prompt-toolbar">
              <span aria-hidden="true"></span>
              <span aria-hidden="true"></span>
              <span aria-hidden="true"></span>
              <strong>${escapeHTML(slide.promptLabel || "Reusable prompt")}</strong>
            </div>
            <pre>${escapeHTML(slide.prompt || "")}</pre>
          </div>
          <div class="prompt-parts">
            ${(slide.parts || []).map((part, index) => `
              <article>
                <span>${escapeHTML(part.label || String(index + 1).padStart(2, "0"))}</span>
                <strong>${escapeHTML(part.title || "")}</strong>
                <p>${escapeHTML(part.body || "")}</p>
              </article>`).join("")}
          </div>
        </div>
      </section>`;
  }

  renderToolMapSlide(slide, bg, id) {
    return `
      <section class="slide slide-template slide-tool-map" data-slide-id="${id}" data-bg="${bg}" data-title="${escapeAttribute(slide.title)}">
        <div class="template-layout">
          ${this.renderTemplateIntro(slide)}
          <div class="tool-map">
            <article class="tool-center">
              <span>${escapeHTML(slide.center?.label || "AI assistant")}</span>
              <strong>${escapeHTML(slide.center?.title || "ChatGPT / Claude / Codex")}</strong>
              <p>${escapeHTML(slide.center?.body || "")}</p>
            </article>
            <div class="tool-nodes">
              ${(slide.nodes || []).map((node, index) => `
                <article>
                  <span>${escapeHTML(node.label || `Tool ${index + 1}`)}</span>
                  <strong>${escapeHTML(node.title || "")}</strong>
                  <p>${escapeHTML(node.body || "")}</p>
                </article>`).join("")}
            </div>
          </div>
        </div>
      </section>`;
  }

  renderVerificationSlide(slide, bg, id) {
    return `
      <section class="slide slide-template slide-verification" data-slide-id="${id}" data-bg="${bg}" data-title="${escapeAttribute(slide.title)}">
        <div class="template-layout">
          ${this.renderTemplateIntro(slide)}
          <div class="verification-boundary">${escapeHTML(slide.boundary || "Trust boundary")}</div>
          <div class="verification-grid">
            <article>
              <span>${escapeHTML(slide.ai?.label || "AI can help")}</span>
              <ul>${(slide.ai?.items || []).map((item) => `<li>${escapeHTML(item)}</li>`).join("")}</ul>
            </article>
            <article class="is-human">
              <span>${escapeHTML(slide.human?.label || "Human must verify")}</span>
              <ul>${(slide.human?.items || []).map((item) => `<li>${escapeHTML(item)}</li>`).join("")}</ul>
            </article>
          </div>
        </div>
      </section>`;
  }

  renderArtifactGallerySlide(slide, bg, id) {
    const revealId = this.getRevealStepsForSlide(slide).length ? `data-reveal-id="${id}"` : "";
    return `
      <section class="slide slide-template slide-artifacts" data-slide-id="${id}" data-bg="${bg}" data-title="${escapeAttribute(slide.title)}" ${revealId}>
        <div class="template-layout">
          ${this.renderTemplateIntro(slide)}
          <div class="artifact-grid">
            ${(slide.artifacts || []).map((artifact, index) => `
              <a
                ${this.templateItemAttrs(artifact, artifact.id || `${id}-artifact-${index}`, `artifact-card ${index === 0 ? "is-featured" : ""}`)}
                href="${escapeAttribute(artifact.path || "#")}"
                target="_blank"
                rel="noreferrer"
                data-attachment-path="${escapeAttribute(artifact.path || "")}"
                data-attachment-title="${escapeAttribute(artifact.title || "")}"
                data-attachment-type="${escapeAttribute(artifact.type || "Artifact")}"
                ${artifact.poster ? `data-attachment-poster="${escapeAttribute(artifact.poster)}"` : ""}
              >
                <span>${escapeHTML(artifact.type || "Artifact")}</span>
                <strong>${escapeHTML(artifact.title || fileName(artifact.path || ""))}</strong>
                <p>${escapeHTML(artifact.body || "")}</p>
                ${artifact.meta ? `<em>${escapeHTML(artifact.meta)}</em>` : ""}
              </a>`).join("")}
          </div>
        </div>
      </section>`;
  }

  renderImpactSlide(slide, bg, id) {
    return `
      <section class="slide slide-template slide-impact" data-slide-id="${id}" data-bg="${bg}" data-title="${escapeAttribute(slide.title)}">
        <div class="template-layout">
          ${this.renderTemplateIntro(slide)}
          <div class="impact-metrics">
            ${(slide.metrics || []).map((metric, index) => `<article class="${index === 0 ? "is-primary" : ""}"><strong>${escapeHTML(metric.value)}</strong><span>${escapeHTML(metric.label)}</span></article>`).join("")}
          </div>
          <div class="impact-list">
            ${(slide.points || []).map((point) => `<p>${escapeHTML(point)}</p>`).join("")}
          </div>
        </div>
      </section>`;
  }

  renderPlaybookSlide(slide, bg, id) {
    const revealId = this.getRevealStepsForSlide(slide).length ? `data-reveal-id="${id}"` : "";
    return `
      <section class="slide slide-template slide-playbook" data-slide-id="${id}" data-bg="${bg}" data-title="${escapeAttribute(slide.title)}" ${revealId}>
        <div class="template-layout">
          ${this.renderTemplateIntro(slide)}
          <div class="playbook-steps">
            ${(slide.steps || []).map((step, index) => `
              <article ${this.templateItemAttrs(step, step.id || `${id}-step-${index}`)}>
                <span>${String(index + 1).padStart(2, "0")}</span>
                <strong>${escapeHTML(step.title || "")}</strong>
                <p>${escapeHTML(step.body || "")}</p>
              </article>`).join("")}
          </div>
        </div>
      </section>`;
  }

  renderResourcesSlide(slide, bg, id) {
    return `
      <section class="slide slide-template slide-resources" data-slide-id="${id}" data-bg="${bg}" data-title="${escapeAttribute(slide.title)}">
        <div class="resources-layout">
          ${this.renderTemplateIntro(slide)}
          <div class="resource-links">
            ${(slide.links || []).map((link) => `
              <a href="${escapeAttribute(link.href || "#")}" target="_blank" rel="noreferrer">
                <strong>${escapeHTML(link.label || "")}</strong>
                <span>${escapeHTML(link.body || link.href || "")}</span>
              </a>`).join("")}
          </div>
          ${slide.qr?.src ? `
            <figure class="resource-qr">
              <img class="qr-code" src="${escapeAttribute(slide.qr.src)}" alt="${escapeAttribute(slide.qr.alt || "QR code")}" />
              <figcaption>${escapeHTML(slide.qr.caption || "Scan or replace with your hosted deck link.")}</figcaption>
            </figure>` : ""}
        </div>
      </section>`;
  }

  renderDemoSlide(slide, bg, id) {
    const transcript = slide.transcriptData || {};
    const wide = slide.layout === "wide-chat-left";
    const metrics = transcript.metrics || [];

    const intro = `
      <div class="chat-intro">
        <h2>${escapeHTML(slide.title)}</h2>
        <p>${escapeHTML(slide.body || transcript.context || "")}</p>
        <div class="metric-strip" aria-label="Demo metrics">
          ${metrics.map((metric) => `<div><strong>${escapeHTML(metric.value)}</strong><span>${escapeHTML(metric.label)}</span></div>`).join("")}
        </div>
        <div class="story-caption" data-story-caption>
          <span>Step</span>
          <strong>Press Next to start.</strong>
        </div>
      </div>`;

    const chat = `
      <div class="chat-shell ${wide ? "chat-shell-wide" : ""}" aria-label="${escapeAttribute(transcript.title || "AI demo transcript")}">
        <header class="chat-header">
          <div>
            <strong>${escapeHTML(transcript.title || "AI demo")}</strong>
          </div>
          <div class="chat-header-actions">
            <button
              class="transcript-toggle"
              type="button"
              data-transcript-toggle
              aria-pressed="${this.isCompactTranscriptMode() ? "true" : "false"}"
              title="Toggle compact/full transcript (T)"
            >
              ${escapeHTML(this.getTranscriptToggleLabel())}
            </button>
            <button class="icon-button" type="button" data-demo-reset aria-label="Reset demo" title="Reset demo">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.3-5.7" /><path d="M4 4v6h6" /></svg>
            </button>
          </div>
        </header>
        <div class="chat-log" data-chat-log>
          <div class="chat-empty">Press Next to send the first message.</div>
        </div>
      </div>`;

    return `
      <section class="slide slide-chat ${wide ? "slide-chat-wide" : ""}" data-slide-id="${id}" data-bg="${bg}" data-title="${escapeAttribute(slide.title)}" data-demo-id="${id}">
        ${wide ? `${chat}<div class="callout-panel"><h2>${escapeHTML(slide.title)}</h2><p>${escapeHTML(slide.body || "")}</p><div class="story-caption" data-story-caption><span>Step</span><strong>Press Next to start.</strong></div></div>` : `${intro}${chat}`}
      </section>`;
  }

  renderVideoSlide(slide, bg, id) {
    const video = slide.video || {};
    const title = video.title || slide.title || "Video demo";

    return `
      <section class="slide slide-video" data-slide-id="${id}" data-bg="${bg}" data-title="${escapeAttribute(slide.title)}">
        <div class="video-layout">
          <div class="video-copy">
            <h2>${escapeHTML(slide.title)}</h2>
            <p>${escapeHTML(slide.body || "")}</p>
            <div class="video-notes">
              ${(slide.notes || []).map((note) => `<div>${escapeHTML(note)}</div>`).join("")}
            </div>
          </div>
          <figure class="video-frame">
            <video controls playsinline preload="metadata" ${video.poster ? `poster="${escapeAttribute(video.poster)}"` : ""}>
              <source src="${escapeAttribute(video.path || "")}" type="${videoMime(video.path)}" />
              Your browser does not support this video.
            </video>
            <figcaption>
              <strong>${escapeHTML(title)}</strong>
              <span>${escapeHTML(video.caption || video.type || "Video artifact")}</span>
            </figcaption>
            <button
              class="video-open"
              type="button"
              data-attachment-path="${escapeAttribute(video.path || "")}"
              data-attachment-title="${escapeAttribute(title)}"
              data-attachment-type="${escapeAttribute(video.type || "Video")}"
              ${video.poster ? `data-attachment-poster="${escapeAttribute(video.poster)}"` : ""}
            >
              Open in artifact drawer
            </button>
          </figure>
        </div>
      </section>`;
  }

  goTo(index) {
    if (!this.presentation) return;
    this.current = Math.max(0, Math.min(index, this.slides.length - 1));
    this.closeMessagePreview({ restoreFocus: false });
    this.clearTooltip();

    this.slides.forEach((slide, slideIndex) => {
      slide.classList.toggle("is-active", slideIndex === this.current);
      slide.classList.toggle("is-before", slideIndex < this.current);
      slide.classList.toggle("is-after", slideIndex > this.current);
    });

    const active = this.slides[this.current];
    this.background.setState(active?.dataset.bg || "hero");
    this.renderActiveDemo();
    this.renderActiveReveal();
    this.updateChrome();
  }

  next() {
    const active = this.slides[this.current];
    if (this.nextStoryStep(active)) return;
    if (this.nextRevealStep(active)) return;

    if (this.current < this.slides.length - 1) {
      this.closeAttachment();
      this.closeMessagePreview({ restoreFocus: false });
      this.clearTooltip();
      this.goTo(this.current + 1);
    }
  }

  previous() {
    const active = this.slides[this.current];
    if (this.previousStoryStep(active)) return;
    if (this.previousRevealStep(active)) return;

    if (this.current > 0) {
      this.closeAttachment();
      this.closeMessagePreview({ restoreFocus: false });
      this.clearTooltip();
      this.goTo(this.current - 1);
    }
  }

  nextStoryStep(slide) {
    const demo = this.getDemoForSlide(slide);
    if (!demo) return false;

    const state = this.demoStates.get(demo.slide.id);
    const steps = demo.transcript.steps || [];

    if (state.stepIndex >= steps.length - 1) {
      return false;
    }

    state.stepIndex += 1;
    state.activeTooltip = null;
    this.clearTooltip();

    const step = steps[state.stepIndex];
    state.caption = step.caption || `Step ${state.stepIndex + 1}`;

    for (const action of step.actions || []) {
      this.applyStoryAction(action, demo, state, { performSideEffects: true });
    }

    this.demoStates.set(demo.slide.id, state);
    this.renderDemoState(slide, demo, state);
    return true;
  }

  previousStoryStep(slide) {
    const demo = this.getDemoForSlide(slide);
    if (!demo) return false;

    const currentState = this.demoStates.get(demo.slide.id);
    if (!currentState || currentState.stepIndex < 0) {
      return false;
    }

    const state = this.rebuildDemoState(demo, currentState.stepIndex - 1);
    this.demoStates.set(demo.slide.id, state);
    this.clearTooltip();
    this.renderDemoState(slide, demo, state);
    this.syncAttachmentState(state);
    return true;
  }

  nextRevealStep(slideElement) {
    const reveal = this.getRevealForSlide(slideElement);
    if (!reveal) return false;

    const state = this.revealStates.get(reveal.slide.id) || this.createRevealState(reveal.slide);
    const steps = this.getRevealStepsForSlide(reveal.slide);

    if (state.stepIndex >= steps.length - 1) {
      return false;
    }

    state.stepIndex += 1;
    state.activeTooltip = null;
    this.clearTooltip();

    const step = steps[state.stepIndex];
    state.caption = step.caption || `Reveal ${state.stepIndex + 1}`;

    for (const action of step.actions || []) {
      this.applyRevealAction(action, reveal, state, { performSideEffects: true });
    }

    this.revealStates.set(reveal.slide.id, state);
    this.renderRevealState(slideElement, reveal, state);
    return true;
  }

  previousRevealStep(slideElement) {
    const reveal = this.getRevealForSlide(slideElement);
    if (!reveal) return false;

    const currentState = this.revealStates.get(reveal.slide.id);
    if (!currentState || currentState.stepIndex < 0) {
      return false;
    }

    const state = this.rebuildRevealState(reveal, currentState.stepIndex - 1);
    this.revealStates.set(reveal.slide.id, state);
    this.clearTooltip();
    this.renderRevealState(slideElement, reveal, state);
    this.syncAttachmentState(state);
    return true;
  }

  applyRevealAction(action, reveal, state, options = {}) {
    const performSideEffects = options.performSideEffects !== false;
    const targets = action.targets || (action.target ? [action.target] : []);

    if (action.type === "showBlock" || action.type === "showBlocks") {
      for (const target of targets) {
        if (!state.visibleBlockIds.includes(target)) {
          state.visibleBlockIds.push(target);
        }
      }
    }

    if (action.type === "hideBlock" || action.type === "hideBlocks") {
      state.visibleBlockIds = state.visibleBlockIds.filter((id) => !targets.includes(id));
    }

    if (action.type === "toggleBlock") {
      for (const target of targets) {
        if (state.visibleBlockIds.includes(target)) {
          state.visibleBlockIds = state.visibleBlockIds.filter((id) => id !== target);
        } else {
          state.visibleBlockIds.push(target);
        }
      }
    }

    if (action.type === "openArtifact" && action.path) {
      const attachment = this.attachments.get(action.path) || { path: action.path, title: fileName(action.path), type: "Attachment" };
      state.openAttachmentPath = action.path;
      if (performSideEffects) {
        this.openAttachment(attachment);
      }
    }

    if (action.type === "closeArtifact") {
      state.openAttachmentPath = null;
      if (performSideEffects) {
        this.closeAttachment();
      }
    }

    if (action.type === "showTooltip" && action.target) {
      state.activeTooltip = {
        target: action.target,
        title: action.title,
        body: action.body || action.text,
        placement: action.placement,
      };
    }

    if (action.type === "clearTooltip") {
      state.activeTooltip = null;
      if (performSideEffects) {
        this.clearTooltip();
      }
    }
  }

  applyStoryAction(action, demo, state, options = {}) {
    const performSideEffects = options.performSideEffects !== false;

    if (action.type === "appendMessage" && action.messageId && !state.visibleMessageIds.includes(action.messageId)) {
      state.visibleMessageIds.push(action.messageId);

      if (action.showTooltip) {
        const message = this.findTranscriptMessage(demo, action.messageId);
        if (message?.tooltip) {
          state.activeTooltip = { target: `message:${message.id}`, ...message.tooltip };
        }
      }
    }

    if (action.type === "openArtifact" && action.path) {
      const attachment = this.attachments.get(action.path) || { path: action.path, title: fileName(action.path), type: "Attachment" };
      state.openAttachmentPath = action.path;
      if (performSideEffects) {
        this.openAttachment(attachment);
      }
    }

    if (action.type === "closeArtifact") {
      state.openAttachmentPath = null;
      if (performSideEffects) {
        this.closeAttachment();
      }
    }

    if (action.type === "showTooltip" && action.target) {
      state.activeTooltip = {
        target: action.target,
        title: action.title,
        body: action.body || action.text,
        placement: action.placement,
      };
    }

    if (action.type === "clearTooltip") {
      state.activeTooltip = null;
      if (performSideEffects) {
        this.clearTooltip();
      }
    }
  }

  resetDemo(slide) {
    const demo = this.getDemoForSlide(slide);
    if (!demo) return;

    const state = this.createDemoState();
    this.demoStates.set(demo.slide.id, state);
    this.closeAttachment();
    this.closeMessagePreview({ restoreFocus: false });
    this.clearTooltip();
    this.renderDemoState(slide, demo, state);
  }

  isCompactTranscriptMode() {
    return this.transcriptMode !== "full";
  }

  getTranscriptToggleLabel() {
    return this.isCompactTranscriptMode() ? "Full transcript" : "Compact view";
  }

  toggleTranscriptMode() {
    this.transcriptMode = this.isCompactTranscriptMode() ? "full" : "compact";
    document.body.dataset.transcriptMode = this.transcriptMode;

    const active = this.slides?.[this.current];
    const demo = this.getDemoForSlide(active);
    if (demo) {
      const state = this.demoStates.get(demo.slide.id);
      this.renderDemoState(active, demo, state, { forceRender: true });
    }

    this.updateTranscriptToggleLabels();
  }

  updateTranscriptToggleLabels() {
    const label = this.getTranscriptToggleLabel();
    for (const button of document.querySelectorAll("[data-transcript-toggle]")) {
      button.textContent = label;
      button.setAttribute("aria-pressed", this.isCompactTranscriptMode() ? "true" : "false");
    }
  }

  renderActiveDemo() {
    const active = this.slides[this.current];
    const demo = this.getDemoForSlide(active);
    if (!demo) return;

    const state = this.demoStates.get(demo.slide.id);
    this.renderDemoState(active, demo, state);
    this.syncAttachmentState(state);
  }

  renderActiveReveal() {
    const active = this.slides[this.current];
    const reveal = this.getRevealForSlide(active);
    if (!reveal) return;

    const state = this.revealStates.get(reveal.slide.id) || this.createRevealState(reveal.slide);
    this.renderRevealState(active, reveal, state);
    this.syncAttachmentState(state);
  }

  renderRevealState(slideElement, reveal, state) {
    const visible = new Set(state.visibleBlockIds || []);
    const totalSteps = this.getRevealStepsForSlide(reveal.slide).length;
    const caption = slideElement.querySelector("[data-reveal-caption] strong");
    const progress = slideElement.querySelector("[data-reveal-progress]");

    for (const node of slideElement.querySelectorAll("[data-block-id].is-revealable")) {
      const isVisible = visible.has(node.dataset.blockId);
      const collapseMode = node.dataset.revealMode === "collapse";
      const wasVisible = node.classList.contains("is-revealed") && !node.classList.contains("is-reveal-hidden");

      window.clearTimeout(Number(node.dataset.revealTimer || 0));

      if (isVisible) {
        node.classList.remove("is-collapsed", "is-reveal-hidden", "is-reveal-exiting");
        if (wasVisible) {
          node.classList.add("is-revealed");
          node.classList.remove("is-reveal-entering");
          delete node.dataset.revealTimer;
          continue;
        }

        node.classList.remove("is-reveal-entering");
        void node.offsetWidth;
        node.classList.add("is-revealed", "is-reveal-entering");
        node.dataset.revealTimer = String(window.setTimeout(() => {
          node.classList.remove("is-reveal-entering");
          delete node.dataset.revealTimer;
        }, 420));
        continue;
      }

      if (wasVisible) {
        node.classList.remove("is-revealed", "is-reveal-entering");
        node.classList.add("is-reveal-exiting");
        node.dataset.revealTimer = String(window.setTimeout(() => {
          node.classList.remove("is-reveal-exiting");
          node.classList.add("is-reveal-hidden");
          if (collapseMode) node.classList.add("is-collapsed");
          delete node.dataset.revealTimer;
        }, 260));
        continue;
      }

      node.classList.remove("is-revealed", "is-reveal-entering", "is-reveal-exiting");
      node.classList.add("is-reveal-hidden");
      node.classList.toggle("is-collapsed", collapseMode);
    }

    if (caption) caption.textContent = state.caption || "Press Next to reveal.";
    if (progress) progress.textContent = `Step ${Math.max(0, state.stepIndex + 1)} / ${totalSteps}`;

    requestAnimationFrame(() => this.renderTooltip(slideElement, state.activeTooltip));
  }

  renderDemoState(slideElement, demo, state, options = {}) {
    const messagesById = new Map((demo.transcript.messages || []).map((message) => [message.id, message]));
    const visibleMessages = state.visibleMessageIds.map((id) => messagesById.get(id)).filter(Boolean);
    const log = slideElement.querySelector("[data-chat-log]");
    const caption = slideElement.querySelector("[data-story-caption] strong");
    const nextButton = slideElement.querySelector("[data-story-next]");
    const totalSteps = demo.transcript.steps?.length || 0;

    const chatChanged = this.syncChatLog(log, visibleMessages, options);

    if (caption) caption.textContent = state.caption || "Press Next to start.";
    if (nextButton) nextButton.disabled = state.stepIndex >= totalSteps - 1;
    this.updateTranscriptToggleLabels();

    requestAnimationFrame(() => {
      if (chatChanged) {
        const lastMessage = visibleMessages[visibleMessages.length - 1];
        const lastNode = lastMessage ? this.findRenderedMessage(log, lastMessage.id) : null;
        if (this.isCompactTranscriptMode()) {
          this.alignCompactChatLog(log, lastNode);
        } else if (lastNode && lastNode.offsetHeight > log.clientHeight * 0.72) {
          const alignTallMessage = () => {
            const logTop = log.getBoundingClientRect().top;
            const nodeTop = lastNode.getBoundingClientRect().top;
            log.scrollTop = Math.max(0, log.scrollTop + nodeTop - logTop - 14);
          };
          alignTallMessage();
          requestAnimationFrame(alignTallMessage);
        } else {
          log.scrollTop = log.scrollHeight;
        }
      }
      this.renderTooltip(slideElement, state.activeTooltip);
    });
  }

  alignCompactChatLog(log, lastNode) {
    if (!lastNode) {
      log.scrollTop = log.scrollHeight;
      return;
    }

    log.scrollTop = log.scrollHeight;
    const messages = Array.from(log.querySelectorAll(".message"));
    const clipped = messages.find((node) => node.offsetTop < log.scrollTop && node.offsetTop + node.offsetHeight > log.scrollTop);

    if (!clipped) return;

    const alignedTop = Math.max(0, clipped.offsetTop - 8);
    const keepsBottomVisible = alignedTop + log.clientHeight >= log.scrollHeight - 4;
    log.scrollTop = keepsBottomVisible ? alignedTop : Math.max(0, lastNode.offsetTop - 8);
  }

  syncChatLog(log, visibleMessages, options = {}) {
    const desiredIds = visibleMessages.map((message) => message.id);
    let changed = false;

    if (!desiredIds.length) {
      const hasOnlyEmpty = log.children.length === 1 && log.firstElementChild?.classList.contains("chat-empty");
      if (!hasOnlyEmpty) {
        log.innerHTML = `<div class="chat-empty">Press Next to send the first message.</div>`;
        changed = true;
      }
      return changed;
    }

    const empty = log.querySelector(".chat-empty");
    if (empty) {
      empty.remove();
      changed = true;
    }

    for (const node of Array.from(log.querySelectorAll("[data-message-id]"))) {
      if (!desiredIds.includes(node.dataset.messageId)) {
        node.remove();
        changed = true;
      }
    }

    for (const [index, message] of visibleMessages.entries()) {
      let node = this.findRenderedMessage(log, message.id);
      if (node && (options.forceRender || node.dataset.transcriptMode !== this.transcriptMode)) {
        const nextNode = this.renderMessageNode(message);
        node.replaceWith(nextNode);
        node = nextNode;
        changed = true;
      }

      if (!node) {
        node = this.renderMessageNode(message);
        changed = true;
      }

      const current = log.children[index];
      if (current !== node) {
        log.insertBefore(node, current || null);
        changed = true;
      }
    }

    return changed;
  }

  findRenderedMessage(log, messageId) {
    return Array.from(log.querySelectorAll("[data-message-id]")).find((node) => node.dataset.messageId === messageId);
  }

  renderMessageNode(message) {
    const template = document.createElement("template");
    template.innerHTML = this.renderMessage(message).trim();
    return template.content.firstElementChild;
  }

  renderMessage(message, options = {}) {
    const compactMode = options.compactMode ?? this.isCompactTranscriptMode();
    const previewMode = options.preview === true;
    const transcriptMode = compactMode ? "compact" : "full";
    const hasRichContent = Array.isArray(message.contentBlocks) && message.contentBlocks.length > 0;
    const attachments = message.attachments?.length
      ? `<div class="attachment-list">${message.attachments.map((attachment) => this.renderAttachmentChip(attachment)).join("")}</div>`
      : "";
    const role = message.role || "assistant";
    const kind = message.kind || (role === "system" || role === "tool" ? role : "chat");
    const serviceMeta = [message.service, message.event, message.status].filter(Boolean);
    const service = serviceMeta.length
      ? `<div class="message-service">${serviceMeta.map((item) => `<span>${escapeHTML(item)}</span>`).join("")}</div>`
      : "";
    const thinking = compactMode ? "" : this.renderMessageThinking(message.thinking);
    const content = compactMode ? this.renderCompactMessageContent(message) : this.renderMessageContent(message);

    return `
      <article
        class="message is-${escapeAttribute(role)} is-kind-${escapeAttribute(kind)}${hasRichContent ? " has-rich-content" : ""}${message.thinking && !compactMode ? " has-thinking" : ""}${compactMode ? " is-compact-message" : ""}"
        ${previewMode ? ` data-preview-message="true"` : ""}
        data-message-id="${escapeAttribute(message.id || "")}"
        data-message-kind="${escapeAttribute(kind)}"
        data-transcript-mode="${escapeAttribute(transcriptMode)}"
      >
        <div class="message-meta">
          <strong>${escapeHTML(message.name || role || "Assistant")}</strong>
          <span>${escapeHTML(message.time || "")}</span>
        </div>
        <div class="message-bubble">
          ${service}
          ${thinking}
          ${role === "user" && !compactMode ? attachments : ""}
          ${content}
          ${role === "user" && !compactMode ? "" : attachments}
        </div>
      </article>`;
  }

  renderCompactMessageContent(message) {
    const compact = this.getCompactMessageData(message);
    const items = compact.items.length
      ? `<ul class="compact-message-list">${compact.items.slice(0, 4).map((item) => `<li>${escapeHTML(item)}</li>`).join("")}</ul>`
      : "";
    const previewLabel = message.role === "user" ? "Preview full prompt" : "Preview full message";
    const previewButton = message.id
      ? `
        <button
          class="compact-message-preview"
          type="button"
          data-message-preview="${escapeAttribute(message.id)}"
          aria-haspopup="dialog"
          aria-label="${escapeAttribute(previewLabel)}"
          title="${escapeAttribute(previewLabel)}"
        >
          ${iconMap.preview}
          <span>Full</span>
        </button>`
      : "";

    if (message.role === "user") {
      return `
        <div class="compact-message-card is-prompt-card">
          <span class="compact-message-eyebrow">${escapeHTML(compact.label)}</span>
          <strong class="compact-message-title">${escapeHTML(compact.title)}</strong>
          ${previewButton}
          <div class="compact-prompt-content">${this.renderCompactPromptBody(message, compact)}</div>
        </div>`;
    }

    return `
      <div class="compact-message-card">
        <span class="compact-message-eyebrow">${escapeHTML(compact.label)}</span>
        <strong class="compact-message-title">${escapeHTML(compact.title)}</strong>
        ${previewButton}
        ${compact.summary ? `<p class="compact-message-summary">${escapeHTML(compact.summary)}</p>` : ""}
        ${items}
      </div>`;
  }

  renderCompactPromptBody(message, compact = {}) {
    if (Array.isArray(message.contentBlocks) && message.contentBlocks.length) {
      return this.renderRichContentBlocks(message.contentBlocks);
    }

    const prompt = message.text || compact.summary || "";
    return prompt ? `<p class="rich-paragraph">${escapeHTML(prompt)}</p>` : "";
  }

  getCompactMessageData(message) {
    const explicit = message.compact || {};
    return {
      label: explicit.label || this.getCompactRoleLabel(message),
      title: explicit.title || this.extractCompactTitle(message),
      summary: explicit.summary || this.extractCompactSummary(message),
      items: Array.isArray(explicit.items) && explicit.items.length
        ? explicit.items.map((item) => this.normalizeCompactItem(item)).filter(Boolean)
        : this.extractCompactItems(message),
    };
  }

  getCompactRoleLabel(message) {
    if (message.compact?.label) return message.compact.label;
    if (message.role === "user") return "Ask";
    if (message.role === "tool") return message.name || "Work";
    if (message.role === "system") return "System";
    return "Result";
  }

  extractCompactTitle(message) {
    const blocks = message.contentBlocks || [];
    const titledBlock = blocks.find((block) => block.title || block.label || block.text);
    const title = message.text || titledBlock?.title || titledBlock?.label || titledBlock?.text || message.name || message.role || "Message";
    return this.trimCompactText(title, 76);
  }

  extractCompactSummary(message) {
    const blocks = message.contentBlocks || [];
    const paragraph = blocks.find((block) => block.type === "paragraph" || block.type === "text");
    const summary = paragraph?.text || paragraph?.body || message.thinking?.summary || "";
    return this.trimCompactText(summary, 128);
  }

  extractCompactItems(message) {
    const items = [];
    for (const block of message.contentBlocks || []) {
      if ((block.type === "bullets" || block.type === "list" || block.type === "numbered") && block.title) {
        items.push(block.title);
      }
      if (block.type === "table" && block.title) {
        items.push(block.title);
      }
    }

    if (Array.isArray(message.thinking?.items)) {
      items.push(...message.thinking.items);
    }

    if (Array.isArray(message.attachments) && message.attachments.length) {
      items.push(`${message.attachments.length} artifact${message.attachments.length === 1 ? "" : "s"} ready`);
    }

    return items.map((item) => this.normalizeCompactItem(item)).filter(Boolean).slice(0, 4);
  }

  normalizeCompactItem(item) {
    if (typeof item === "string") return this.trimCompactText(item, 58);
    return this.trimCompactText([item?.title, item?.body || item?.text].filter(Boolean).join(": "), 58);
  }

  trimCompactText(value, maxLength) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (text.length <= maxLength) return text;
    return `${text.slice(0, Math.max(0, maxLength - 1)).trim()}...`;
  }

  renderMessageContent(message) {
    if (Array.isArray(message.contentBlocks) && message.contentBlocks.length) {
      return `<div class="message-content">${this.renderRichContentBlocks(message.contentBlocks)}</div>`;
    }

    const paragraphs = Array.isArray(message.paragraphs)
      ? message.paragraphs
      : String(message.text || "").split(/\n{2,}/).filter(Boolean);

    return paragraphs.map((paragraph) => `<p>${escapeHTML(paragraph)}</p>`).join("");
  }

  renderMessageThinking(thinking) {
    if (!thinking) return "";

    const data = typeof thinking === "string" ? { summary: thinking } : thinking;
    if (!data || data.visible === false) return "";

    const title = data.title || data.label || "Thinking";
    const status = data.status || data.mode || "summary";
    const summary = data.summary || data.text || data.body || "";
    const items = Array.isArray(data.items) && data.items.length
      ? `<ul>${data.items.map((item) => `<li>${escapeHTML(typeof item === "string" ? item : item.text || item.body || item.title || "")}</li>`).join("")}</ul>`
      : "";
    const blocks = Array.isArray(data.blocks) && data.blocks.length
      ? this.renderRichContentBlocks(data.blocks)
      : "";
    const open = data.open === false ? "" : " open";

    return `
      <details class="message-thinking"${open}>
        <summary>
          <span>${escapeHTML(title)}</span>
          <em>${escapeHTML(status)}</em>
        </summary>
        <div class="thinking-body">
          ${summary ? `<p>${escapeHTML(summary)}</p>` : ""}
          ${items}
          ${blocks}
        </div>
      </details>`;
  }

  renderRichContentBlocks(blocks = []) {
    return blocks.map((block) => this.renderRichContentBlock(block)).join("");
  }

  renderRichContentBlock(block = {}) {
    const type = block.type || "paragraph";

    if (type === "paragraph" || type === "text") {
      const text = block.text || block.body || "";
      return text ? `<p class="rich-paragraph">${escapeHTML(text)}</p>` : "";
    }

    if (type === "heading") {
      return `<strong class="rich-heading">${escapeHTML(block.text || block.title || "")}</strong>`;
    }

    if (type === "bullets" || type === "list" || type === "numbered") {
      const ordered = type === "numbered" || block.ordered === true;
      const tag = ordered ? "ol" : "ul";
      const title = block.title || block.label;
      return `
        <div class="rich-list-block">
          ${title ? `<strong>${escapeHTML(title)}</strong>` : ""}
          <${tag} class="rich-list">${this.renderRichListItems(block.items || [], ordered)}</${tag}>
        </div>`;
    }

    if (type === "table") {
      return this.renderRichTable(block);
    }

    if (type === "email") {
      return this.renderRichEmail(block);
    }

    if (type === "quote") {
      return `
        <blockquote class="rich-quote">
          <p>${escapeHTML(block.text || block.body || "")}</p>
          ${block.source ? `<cite>${escapeHTML(block.source)}</cite>` : ""}
        </blockquote>`;
    }

    if (type === "code") {
      return `
        <pre class="rich-code"${block.language ? ` data-language="${escapeAttribute(block.language)}"` : ""}><code>${escapeHTML(block.code || block.text || "")}</code></pre>`;
    }

    if (type === "callout") {
      const tone = block.tone || "note";
      const items = Array.isArray(block.items) && block.items.length
        ? `<ul>${this.renderRichListItems(block.items)}</ul>`
        : "";
      return `
        <div class="rich-callout is-${escapeAttribute(tone)}">
          ${block.title ? `<strong>${escapeHTML(block.title)}</strong>` : ""}
          ${block.body || block.text ? `<p>${escapeHTML(block.body || block.text)}</p>` : ""}
          ${items}
        </div>`;
    }

    return block.text || block.body ? `<p class="rich-paragraph">${escapeHTML(block.text || block.body)}</p>` : "";
  }

  renderRichListItems(items = []) {
    return items.map((item) => {
      if (typeof item === "string") return `<li>${escapeHTML(item)}</li>`;

      const nested = Array.isArray(item.items) && item.items.length
        ? `<ul>${this.renderRichListItems(item.items)}</ul>`
        : "";
      const body = item.body ? `<span>${escapeHTML(item.body)}</span>` : "";
      const title = item.title ? `<strong>${escapeHTML(item.title)}</strong>` : "";
      const text = item.text ? escapeHTML(item.text) : "";
      return `<li>${title}${text}${body}${nested}</li>`;
    }).join("");
  }

  renderRichTable(block = {}) {
    const columns = this.normalizeTableColumns(block.columns || block.headers || [], block.rows || []);
    if (!columns.length) return "";

    const rows = block.rows || [];
    const head = columns.map((column) => `<th${column.align ? ` class="is-${escapeAttribute(column.align)}"` : ""}>${escapeHTML(column.label)}</th>`).join("");
    const body = rows.map((row) => {
      const data = row && typeof row === "object" && !Array.isArray(row) ? row : {};
      const cells = Array.isArray(row) ? row : data.cells || data.values || columns.map((column) => data[column.key] ?? data[column.label] ?? "");
      const className = data.emphasis || data.total ? " class=\"is-emphasis\"" : data.muted ? " class=\"is-muted\"" : "";
      return `<tr${className}>${columns.map((column, index) => `<td${column.align ? ` class="is-${escapeAttribute(column.align)}"` : ""}>${escapeHTML(cells[index] ?? "")}</td>`).join("")}</tr>`;
    }).join("");

    return `
      <div class="rich-table-block">
        ${block.title ? `<strong>${escapeHTML(block.title)}</strong>` : ""}
        <div class="rich-table-wrap">
          <table>
            ${block.caption ? `<caption>${escapeHTML(block.caption)}</caption>` : ""}
            <thead><tr>${head}</tr></thead>
            <tbody>${body}</tbody>
          </table>
        </div>
      </div>`;
  }

  normalizeTableColumns(columns = [], rows = []) {
    if (columns.length) {
      return columns.map((column, index) => {
        if (typeof column === "string") {
          return { key: column, label: column, index };
        }
        return {
          key: column.key || column.field || column.label || String(index),
          label: column.label || column.title || column.key || column.field || String(index + 1),
          align: column.align,
          index,
        };
      });
    }

    const firstRow = rows.find(Boolean);
    if (Array.isArray(firstRow)) {
      return firstRow.map((_, index) => ({ key: String(index), label: `Column ${index + 1}`, index }));
    }
    if (firstRow && typeof firstRow === "object") {
      const keys = Object.keys(firstRow).filter((key) => !["cells", "values", "emphasis", "total", "muted"].includes(key));
      return keys.map((key, index) => ({ key, label: key, index }));
    }
    return [];
  }

  renderRichEmail(block = {}) {
    const meta = [
      block.to ? `To: ${block.to}` : "",
      block.from ? `From: ${block.from}` : "",
      block.cc ? `Cc: ${block.cc}` : "",
    ].filter(Boolean);
    const bodyBlocks = Array.isArray(block.body)
      ? block.body.map((item) => typeof item === "string" ? { type: "paragraph", text: item } : item)
      : String(block.body || block.text || "").split(/\n{2,}/).filter(Boolean).map((text) => ({ type: "paragraph", text }));

    return `
      <section class="rich-email">
        <div class="rich-email-toolbar">
          <span>${escapeHTML(block.label || "Email")}</span>
          ${block.status ? `<em>${escapeHTML(block.status)}</em>` : ""}
        </div>
        ${block.subject ? `<strong class="rich-email-subject">${escapeHTML(block.subject)}</strong>` : ""}
        ${meta.length ? `<div class="rich-email-meta">${meta.map((item) => `<span>${escapeHTML(item)}</span>`).join("")}</div>` : ""}
        <div class="rich-email-body">${this.renderRichContentBlocks(bodyBlocks)}</div>
      </section>`;
  }

  renderTooltip(slideElement, tooltip) {
    this.clearTooltip();
    if (!tooltip?.target) return;

    const target = this.findTooltipTarget(slideElement, tooltip.target);
    if (!target) return;

    target.classList.add("is-spotlit");
    const node = document.createElement("div");
    node.className = `story-tooltip is-${tooltip.placement || "top"}`;
    node.innerHTML = `
      ${tooltip.title ? `<strong>${escapeHTML(tooltip.title)}</strong>` : ""}
      ${tooltip.body ? `<span>${escapeHTML(tooltip.body)}</span>` : ""}
    `;
    document.body.append(node);
    this.activeTooltip = node;

    requestAnimationFrame(() => this.positionTooltip(node, target, tooltip.placement || "top"));
  }

  findTooltipTarget(slideElement, target) {
    const [kind, ...rest] = String(target).split(":");
    const value = rest.join(":");

    if (kind === "message") {
      return Array.from(slideElement.querySelectorAll("[data-message-id]")).find((item) => item.dataset.messageId === value);
    }

    if (kind === "attachment") {
      return Array.from(slideElement.querySelectorAll("[data-attachment-path]")).find((item) => item.dataset.attachmentPath === value);
    }

    if (kind === "block") {
      return Array.from(slideElement.querySelectorAll("[data-block-id]")).find((item) => item.dataset.blockId === value);
    }

    if (kind === "selector" && value) {
      return slideElement.querySelector(value);
    }

    return null;
  }

  positionTooltip(node, target, placement) {
    const gap = 14;
    const margin = 20;
    const targetRect = target.getBoundingClientRect();
    const tooltipRect = node.getBoundingClientRect();
    const controlsRect = document.querySelector(".deck-controls")?.getBoundingClientRect();
    const bottomLimit = controlsRect ? controlsRect.top - gap : window.innerHeight - margin;
    let left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
    let top = targetRect.top - tooltipRect.height - gap;

    if (placement === "bottom") {
      top = targetRect.bottom + gap;
    }

    if (placement === "right") {
      left = targetRect.right + gap;
      top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
    }

    if (placement === "left") {
      left = targetRect.left - tooltipRect.width - gap;
      top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
    }

    left = Math.max(margin, Math.min(left, window.innerWidth - tooltipRect.width - margin));
    top = Math.max(margin, Math.min(top, bottomLimit - tooltipRect.height));
    node.style.left = `${left}px`;
    node.style.top = `${top}px`;
  }

  clearTooltip() {
    if (this.activeTooltip) {
      this.activeTooltip.remove();
      this.activeTooltip = null;
    }

    document.querySelectorAll(".story-tooltip").forEach((tooltip) => tooltip.remove());
    document.querySelectorAll(".is-spotlit").forEach((target) => target.classList.remove("is-spotlit"));
  }

  createDemoState() {
    return {
      stepIndex: -1,
      visibleMessageIds: [],
      caption: "Press Next to start.",
      activeTooltip: null,
      openAttachmentPath: null,
    };
  }

  createRevealState() {
    return {
      stepIndex: -1,
      visibleBlockIds: [],
      caption: "Press Next to reveal.",
      activeTooltip: null,
      openAttachmentPath: null,
    };
  }

  rebuildDemoState(demo, targetStepIndex) {
    const state = this.createDemoState();
    const steps = demo.transcript.steps || [];

    for (let index = 0; index <= targetStepIndex; index += 1) {
      const step = steps[index];
      state.stepIndex = index;
      state.caption = step?.caption || `Step ${index + 1}`;
      state.activeTooltip = null;

      for (const action of step?.actions || []) {
        this.applyStoryAction(action, demo, state, { performSideEffects: false });
      }
    }

    return state;
  }

  rebuildRevealState(reveal, targetStepIndex) {
    const state = this.createRevealState(reveal.slide);
    const steps = this.getRevealStepsForSlide(reveal.slide);

    for (let index = 0; index <= targetStepIndex; index += 1) {
      const step = steps[index];
      state.stepIndex = index;
      state.caption = step?.caption || `Reveal ${index + 1}`;
      state.activeTooltip = null;

      for (const action of step?.actions || []) {
        this.applyRevealAction(action, reveal, state, { performSideEffects: false });
      }
    }

    return state;
  }

  syncAttachmentState(state) {
    if (state?.openAttachmentPath) {
      const attachment = this.attachments.get(state.openAttachmentPath) || {
        path: state.openAttachmentPath,
        title: fileName(state.openAttachmentPath),
        type: "Attachment",
      };
      this.openAttachment(attachment);
      return;
    }

    this.closeAttachment();
  }

  findTranscriptMessage(demo, messageId) {
    return (demo.transcript.messages || []).find((message) => message.id === messageId);
  }

  findTranscriptMessageAnywhere(messageId) {
    for (const slide of this.presentation?.slides || []) {
      const message = (slide.transcriptData?.messages || []).find((item) => item.id === messageId);
      if (message) return { message, slide, transcript: slide.transcriptData };
    }
    return null;
  }

  isMessagePreviewOpen() {
    return this.messagePreview?.classList.contains("is-open") || false;
  }

  openMessagePreview(messageId, slideElement, trigger) {
    if (!messageId || !this.messagePreview) return;

    const demo = this.getDemoForSlide(slideElement);
    const fallback = demo ? null : this.findTranscriptMessageAnywhere(messageId);
    const message = demo ? this.findTranscriptMessage(demo, messageId) : fallback?.message;
    if (!message) return;

    this.closeAttachment();

    const compact = this.getCompactMessageData(message);
    const messageType = message.role === "user" ? "Full prompt" : "Full message";
    const meta = [
      messageType,
      message.name || message.role,
      message.time,
    ].filter(Boolean);

    this.messagePreviewReturnFocus = trigger || document.activeElement;
    this.messagePreviewTitle.textContent = compact.title || messageType;
    this.messagePreviewMeta.textContent = meta.join(" · ");
    this.messagePreviewBody.innerHTML = `
      <div class="message-preview-message">
        ${this.renderMessage(message, { compactMode: false, preview: true })}
      </div>`;
    this.messagePreview.classList.add("is-open");
    this.messagePreview.setAttribute("aria-hidden", "false");
    requestAnimationFrame(() => this.messagePreviewClose?.focus());
  }

  closeMessagePreview(options = {}) {
    if (!this.messagePreview) return;
    const wasOpen = this.isMessagePreviewOpen();
    this.messagePreview.classList.remove("is-open");
    this.messagePreview.setAttribute("aria-hidden", "true");
    this.messagePreviewBody.innerHTML = "";

    if (wasOpen && options.restoreFocus !== false && this.messagePreviewReturnFocus?.isConnected) {
      this.messagePreviewReturnFocus.focus();
    }
    this.messagePreviewReturnFocus = null;
  }

  renderAttachmentChip(attachment) {
    return `
      <a
        class="attachment-chip"
        href="${escapeAttribute(attachment.path)}"
        target="_blank"
        rel="noreferrer"
        data-attachment-path="${escapeAttribute(attachment.path)}"
        data-attachment-title="${escapeAttribute(attachment.title)}"
        data-attachment-type="${escapeAttribute(attachment.type || "Attachment")}"
        ${attachment.poster ? `data-attachment-poster="${escapeAttribute(attachment.poster)}"` : ""}
      >
        ${iconMap.file}
        <span>${escapeHTML(attachment.title || fileName(attachment.path))}</span>
      </a>`;
  }

  getDemoForSlide(slideElement) {
    const demoId = slideElement?.dataset.demoId;
    if (!demoId) return null;

    const slide = this.presentation.slides.find((item) => item.id === demoId);
    if (!slide?.transcriptData) return null;
    return { slide, transcript: slide.transcriptData };
  }

  getRevealForSlide(slideElement) {
    const revealId = slideElement?.dataset.revealId;
    if (!revealId) return null;

    const slide = this.presentation.slides.find((item) => item.id === revealId);
    if (!slide || !this.getRevealStepsForSlide(slide).length) return null;
    return { slide };
  }

  getRevealStepsForSlide(slide = {}) {
    return slide.revealSteps || [];
  }

  registerBlockAttachments(blocks = []) {
    for (const block of blocks) {
      if (block.path) {
        this.attachments.set(block.path, block);
      }

      if (block.video?.path) {
        this.attachments.set(block.video.path, block.video);
      }

      for (const artifact of block.artifacts || block.items || []) {
        if (artifact?.path) {
          this.attachments.set(artifact.path, artifact);
        }
      }

      if (block.blocks?.length) {
        this.registerBlockAttachments(block.blocks);
      }

      if (block.cards?.length) {
        this.registerBlockAttachments(block.cards);
      }
    }
  }

  getSectionDefinitions() {
    const rawSections = Array.isArray(this.presentation.sections) ? this.presentation.sections : [];
    const slides = this.presentation.slides || [];

    return rawSections
      .map((section, index) => {
        const slideIndex = slides.findIndex((slide) => slide.id === section.slideId);
        return {
          id: section.id || `section-${index + 1}`,
          label: section.label || section.title || `Part ${index + 1}`,
          title: section.title || section.label || `Part ${index + 1}`,
          slideId: section.slideId,
          slideIndex,
        };
      })
      .filter((section) => section.slideIndex >= 0)
      .sort((a, b) => a.slideIndex - b.slideIndex);
  }

  renderSectionMap() {
    if (!this.sectionMap) return;

    if (!this.sections.length) {
      this.sectionMap.hidden = true;
      return;
    }

    this.sectionMap.hidden = false;
    this.sectionMap.style.setProperty("--section-count", String(this.sections.length));
    this.sectionMap.innerHTML = this.sections.map((section, index) => `
      <button
        class="section-map-item"
        type="button"
        data-section-jump="${escapeAttribute(section.id)}"
        title="${escapeAttribute(section.title)}"
      >
        <span>${String(index + 1).padStart(2, "0")}</span>
        <strong>${escapeHTML(section.label)}</strong>
      </button>
    `).join("");
  }

  jumpToSection(sectionId) {
    const section = this.sections.find((item) => item.id === sectionId);
    if (!section) return;
    this.closeAttachment();
    this.clearTooltip();
    this.goTo(section.slideIndex);
  }

  getCurrentSectionIndex() {
    if (!this.sections.length) return -1;

    let currentSectionIndex = 0;
    for (const [index, section] of this.sections.entries()) {
      if (section.slideIndex <= this.current) {
        currentSectionIndex = index;
      }
    }
    return currentSectionIndex;
  }

  updateSectionMap() {
    if (!this.sectionMap || !this.sections.length) return;
    const currentSectionIndex = this.getCurrentSectionIndex();

    for (const [index, button] of Array.from(this.sectionMap.querySelectorAll("[data-section-jump]")).entries()) {
      const isActive = index === currentSectionIndex;
      button.classList.toggle("is-active", isActive);
      button.classList.toggle("is-complete", index < currentSectionIndex);
      button.setAttribute("aria-current", isActive ? "step" : "false");
    }
  }

  updateChrome() {
    const progress = ((this.current + 1) / this.slides.length) * 100;
    this.progressFill.style.width = `${progress}%`;
    this.slideCount.textContent = `${this.current + 1} / ${this.slides.length}`;
    this.updateSectionMap();
  }

  createContrastIndicator() {
    const indicator = document.createElement("div");
    indicator.className = "contrast-mode-indicator";
    indicator.setAttribute("role", "status");
    indicator.setAttribute("aria-live", "polite");
    document.body.append(indicator);
    return indicator;
  }

  cycleContrastTheme() {
    this.applyContrastTheme((this.contrastThemeIndex + 1) % contrastThemes.length);
  }

  applyContrastTheme(index, options = {}) {
    const theme = contrastThemes[index] || contrastThemes[0];
    this.contrastThemeIndex = index;
    document.body.dataset.contrastTheme = theme.id;
    document.body.dataset.contrastThemeName = theme.label;

    if (this.contrastIndicator) {
      this.contrastIndicator.textContent = theme.label;
      this.contrastIndicator.classList.remove("is-visible");
      void this.contrastIndicator.offsetWidth;
      if (options.announce !== false) {
        this.contrastIndicator.classList.add("is-visible");
      }
    }
  }

  async openAttachment(attachment) {
    this.drawer.classList.add("is-open");
    this.drawer.setAttribute("aria-hidden", "false");
    this.drawerTitle.textContent = attachment.title || fileName(attachment.path);
    this.drawerMeta.textContent = attachment.type || "Preview";
    this.drawerOpen.href = attachment.path;
    this.highlightOpenAttachment(attachment.path);
    this.drawerBody.innerHTML = `<pre>Loading ${escapeHTML(attachment.title || "attachment")}...</pre>`;

    if (isVideoPath(attachment.path)) {
      this.drawerBody.innerHTML = `
        <div class="video-preview">
          <video controls playsinline preload="metadata" ${attachment.poster ? `poster="${escapeAttribute(attachment.poster)}"` : ""}>
            <source src="${escapeAttribute(attachment.path)}" type="${videoMime(attachment.path)}" />
            Your browser does not support this video.
          </video>
        </div>`;
      return;
    }

    if (isArchivePath(attachment.path)) {
      this.drawerBody.innerHTML = this.renderDownloadAttachment(attachment, "This archive cannot be previewed inside the presentation. Open it to download or inspect the source files.");
      return;
    }

    if (attachment.path.endsWith(".svg") || isHtmlPath(attachment.path)) {
      this.drawerBody.innerHTML = `<iframe src="${escapeAttribute(attachment.path)}" title="${escapeAttribute(attachment.title || "Attachment")}"></iframe>`;
      return;
    }

    if (isImagePath(attachment.path)) {
      this.drawerBody.innerHTML = `<img src="${escapeAttribute(attachment.path)}" alt="${escapeAttribute(attachment.title || "Attachment")}" />`;
      return;
    }

    if (isBinaryPath(attachment.path)) {
      this.drawerBody.innerHTML = this.renderDownloadAttachment(attachment, "This file format is best opened in its native application.");
      return;
    }

    try {
      const response = await fetch(attachment.path);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      if (isCsvPath(attachment.path)) {
        this.drawerBody.innerHTML = this.renderCsvAttachment(text, attachment);
        return;
      }
      if (isMarkdownPath(attachment.path)) {
        this.drawerBody.innerHTML = this.renderMarkdownAttachment(text, attachment);
        return;
      }
      this.drawerBody.innerHTML = `<pre>${escapeHTML(text)}</pre>`;
    } catch (error) {
      this.drawerBody.innerHTML = `
        <div class="attachment-error">
          Preview unavailable in this browser context. Open the file in a new tab from the preview header.
        </div>`;
    }
  }

  closeAttachment() {
    this.drawer.classList.remove("is-open");
    this.drawer.setAttribute("aria-hidden", "true");
    this.highlightOpenAttachment(null);
  }

  highlightOpenAttachment(path) {
    document.querySelectorAll(".is-open-artifact").forEach((target) => target.classList.remove("is-open-artifact"));
    if (!path) return;

    const selector = `[data-attachment-path="${cssEscape(path)}"]`;
    document.querySelectorAll(selector).forEach((target) => target.classList.add("is-open-artifact"));
  }

  renderCsvAttachment(text, attachment) {
    const rows = parseCSV(text);
    if (!rows.length) {
      return this.renderDownloadAttachment(attachment, "This CSV file is empty or could not be parsed for table preview.");
    }

    const [headers, ...bodyRows] = rows;
    const previewRows = bodyRows.slice(0, 250);
    const truncated = bodyRows.length > previewRows.length;

    return `
      <div class="csv-preview">
        <header>
          <div>
            <strong>${escapeHTML(attachment.title || fileName(attachment.path))}</strong>
            <span>${previewRows.length}${truncated ? ` of ${bodyRows.length}` : ""} rows shown</span>
          </div>
          <a href="${escapeAttribute(attachment.path)}" target="_blank" rel="noreferrer" aria-label="Download CSV">${downloadIcon()}<span>Download</span></a>
        </header>
        <div class="csv-table-wrap">
          <table>
            <thead>
              <tr>${headers.map((header) => `<th>${escapeHTML(header)}</th>`).join("")}</tr>
            </thead>
            <tbody>
              ${previewRows.map((row) => `
                <tr>${headers.map((_, index) => `<td>${escapeHTML(row[index] ?? "")}</td>`).join("")}</tr>`).join("")}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  renderMarkdownAttachment(text, attachment) {
    return `
      <article class="markdown-preview">
        <header>
          <div>
            <strong>${escapeHTML(attachment.title || fileName(attachment.path))}</strong>
            <span>Markdown preview</span>
          </div>
          <a href="${escapeAttribute(attachment.path)}" target="_blank" rel="noreferrer" aria-label="Open Markdown">${externalIcon()}<span>Open</span></a>
        </header>
        <div class="markdown-document">
          ${renderMarkdown(text)}
        </div>
      </article>`;
  }

  renderDownloadAttachment(attachment, body) {
    return `
      <div class="attachment-download">
        <div class="download-glyph" aria-hidden="true">${downloadIcon()}</div>
        <strong>${escapeHTML(attachment.title || fileName(attachment.path))}</strong>
        <p>${escapeHTML(body)}</p>
        <a href="${escapeAttribute(attachment.path)}" target="_blank" rel="noreferrer">${downloadIcon()}<span>Open / download</span></a>
      </div>`;
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      return;
    }

    document.exitFullscreen?.();
  }

  renderError(error) {
    this.deck.innerHTML = `
      <section class="slide slide-text is-active">
        <div class="content-narrow">
          <h2>Could not load presentation</h2>
          <p>${escapeHTML(error.message)}</p>
          <p>Run the deck through a local or hosted static server so JSON files can be loaded.</p>
        </div>
      </section>`;
  }
}

async function loadJSON(path) {
  const separator = path.includes("?") ? "&" : "?";
  const response = await fetch(`${path}${separator}v=${DATA_VERSION}`, { cache: "no-cache" });
  if (!response.ok) throw new Error(`Failed to load ${path}: HTTP ${response.status}`);
  return response.json();
}

function fileName(path = "") {
  return path.split("/").pop() || "attachment";
}

function getInitials(name = "") {
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "YN";
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join("");
}

function isVideoPath(path = "") {
  return /\.(mp4|webm|mov|m4v|ogg)$/i.test(path);
}

function isImagePath(path = "") {
  return /\.(png|jpe?g|gif|webp|avif)$/i.test(path);
}

function isCsvPath(path = "") {
  return /\.csv$/i.test(path);
}

function isMarkdownPath(path = "") {
  return /\.(md|markdown)$/i.test(path);
}

function isHtmlPath(path = "") {
  return /\.html?$/i.test(path);
}

function isArchivePath(path = "") {
  return /\.(zip|7z|tar|tgz|gz|rar)$/i.test(path);
}

function isBinaryPath(path = "") {
  return /\.(xlsx?|docx?|pptx?|pdf|numbers|pages|key|sqlite|db|bin)$/i.test(path);
}

function videoMime(path = "") {
  const ext = path.split(".").pop()?.toLowerCase();
  if (ext === "webm") return "video/webm";
  if (ext === "ogg" || ext === "ogv") return "video/ogg";
  if (ext === "mov") return "video/quicktime";
  return "video/mp4";
}

function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value = "") {
  return escapeHTML(value);
}

function cssEscape(value = "") {
  if (window.CSS?.escape) return CSS.escape(value);
  return String(value).replace(/["\\]/g, "\\$&");
}

function formatDisplayText(value = "") {
  return escapeHTML(value)
    .split(/\r?\n/)
    .map((line) => `<span class="title-line">${line}</span>`)
    .join("");
}

function parseCSV(text = "") {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell !== "")) rows.push(row);
      row = [];
      value = "";
      continue;
    }

    value += char;
  }

  row.push(value);
  if (row.some((cell) => cell !== "")) rows.push(row);
  return rows;
}

function renderMarkdown(text = "") {
  const lines = String(text).replace(/\r\n?/g, "\n").split("\n");
  const html = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fence = line.match(/^```(\S*)\s*$/);
    if (fence) {
      const code = [];
      index += 1;
      while (index < lines.length && !/^```\s*$/.test(lines[index])) {
        code.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      html.push(`
        <pre class="markdown-code"${fence[1] ? ` data-language="${escapeAttribute(fence[1])}"` : ""}><code>${escapeHTML(code.join("\n"))}</code></pre>`);
      continue;
    }

    if (isMarkdownTable(lines, index)) {
      const tableLines = [lines[index], lines[index + 1]];
      index += 2;
      while (index < lines.length && /^\s*\|?.+\|.+/.test(lines[index])) {
        tableLines.push(lines[index]);
        index += 1;
      }
      html.push(renderMarkdownTable(tableLines));
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      const level = Math.min(4, heading[1].length + 1);
      html.push(`<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^\s{0,3}(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      html.push("<hr />");
      index += 1;
      continue;
    }

    if (/^\s{0,3}>\s?/.test(line)) {
      const quoteLines = [];
      while (index < lines.length && /^\s{0,3}>\s?/.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^\s{0,3}>\s?/, ""));
        index += 1;
      }
      html.push(`<blockquote>${quoteLines.map((item) => `<p>${renderInlineMarkdown(item)}</p>`).join("")}</blockquote>`);
      continue;
    }

    if (/^\s{0,3}[-*+]\s+/.test(line) || /^\s{0,3}\d+[.)]\s+/.test(line)) {
      const ordered = /^\s{0,3}\d+[.)]\s+/.test(line);
      const tag = ordered ? "ol" : "ul";
      const itemPattern = ordered ? /^\s{0,3}\d+[.)]\s+/ : /^\s{0,3}[-*+]\s+/;
      const items = [];
      while (index < lines.length && itemPattern.test(lines[index])) {
        items.push(lines[index].replace(itemPattern, ""));
        index += 1;
      }
      html.push(`<${tag}>${items.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join("")}</${tag}>`);
      continue;
    }

    const paragraph = [line.trim()];
    index += 1;
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^```/.test(lines[index]) &&
      !/^(#{1,4})\s+/.test(lines[index]) &&
      !/^\s{0,3}([-*+]\s+|\d+[.)]\s+|>\s?)/.test(lines[index]) &&
      !isMarkdownTable(lines, index)
    ) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    html.push(`<p>${renderInlineMarkdown(paragraph.join(" "))}</p>`);
  }

  return html.join("");
}

function isMarkdownTable(lines, index) {
  return Boolean(
    lines[index]?.includes("|") &&
    lines[index + 1] &&
    /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[index + 1])
  );
}

function renderMarkdownTable(tableLines = []) {
  const headers = splitMarkdownTableRow(tableLines[0] || "");
  const rows = tableLines.slice(2).map(splitMarkdownTableRow).filter((row) => row.some(Boolean));

  return `
    <div class="markdown-table-wrap">
      <table>
        <thead>
          <tr>${headers.map((header) => `<th>${renderInlineMarkdown(header)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr>${headers.map((_, index) => `<td>${renderInlineMarkdown(row[index] || "")}</td>`).join("")}</tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}

function splitMarkdownTableRow(line = "") {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function renderInlineMarkdown(text = "") {
  const tokens = [];
  const stash = (html) => {
    const token = `\u0000${tokens.length}\u0000`;
    tokens.push(html);
    return token;
  };

  let source = String(text).replace(/`([^`]+)`/g, (_, code) => stash(`<code>${escapeHTML(code)}</code>`));
  source = source.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, label, href) => {
    const safeHref = sanitizeMarkdownHref(href);
    if (!safeHref) return escapeHTML(label);
    return stash(`<a href="${escapeAttribute(safeHref)}" target="_blank" rel="noreferrer">${escapeHTML(label)}</a>`);
  });

  let html = escapeHTML(source)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/\*([^*\s][^*]*?)\*/g, "<em>$1</em>")
    .replace(/_([^_\s][^_]*?)_/g, "<em>$1</em>");

  tokens.forEach((tokenHtml, index) => {
    html = html.replaceAll(`\u0000${index}\u0000`, tokenHtml);
  });

  return html;
}

function sanitizeMarkdownHref(href = "") {
  const value = String(href).trim();
  if (/^(https?:|mailto:)/i.test(value)) return value;
  if (/^[./#][^\s]*$/i.test(value)) return value;
  return "";
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function downloadIcon() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></svg>`;
}

function externalIcon() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" /></svg>`;
}

window.addEventListener("DOMContentLoaded", () => {
  new AIPresentationFramework().init();
});
