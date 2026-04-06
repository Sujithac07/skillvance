// ===== SKILLVANCE TECHNOLOGIES - SHARED INTERACTIONS =====

document.addEventListener('DOMContentLoaded', () => {
 initScrollReveal();
 initNavbar();
 initCustomCursor();
 initPageTransitions();
 initMobileExperience();
 initMagneticButtons();
 initDomainCardLinks();
 initTiltCards();
 if (document.getElementById('particles-canvas')) initParticles();
 if (document.getElementById('heroTyped')) initTypingEffect();
 if (document.querySelectorAll('[data-count]').length) initCounters();
});

// ===== PARTICLES =====
function initParticles() {
 const canvas = document.getElementById('particles-canvas');
 if (!canvas) return;
 const ctx = canvas.getContext('2d');
 let particles = [];
 const colors = ['#7c3aed', '#06b6d4', '#3b82f6', '#a855f7'];
 let mouse = { x: undefined, y: undefined };

 function resize() {
 canvas.width = canvas.parentElement.offsetWidth;
 canvas.height = canvas.parentElement.offsetHeight;
 }
 resize();
 window.addEventListener('resize', resize);
 canvas.addEventListener('mousemove', e => { mouse.x = e.offsetX; mouse.y = e.offsetY; });
 canvas.addEventListener('mouseleave', () => { mouse.x = undefined; mouse.y = undefined; });

 class Particle {
 constructor() { this.reset(); }
 reset() {
 this.x = Math.random() * canvas.width;
 this.y = Math.random() * canvas.height;
 this.size = Math.random() * 2.5 + 0.5;
 this.baseSpeedX = (Math.random() - 0.5) * 0.4;
 this.baseSpeedY = (Math.random() - 0.5) * 0.4;
 this.speedX = this.baseSpeedX;
 this.speedY = this.baseSpeedY;
 this.color = colors[Math.floor(Math.random() * colors.length)];
 this.opacity = Math.random() * 0.4 + 0.08;
 }
 update() {
 if (mouse.x !== undefined) {
 const dx = mouse.x - this.x;
 const dy = mouse.y - this.y;
 const dist = Math.sqrt(dx * dx + dy * dy);
 if (dist < 150) {
 const force = (150 - dist) / 150;
 this.speedX -= (dx / dist) * force * 0.3;
 this.speedY -= (dy / dist) * force * 0.3;
 }
 }
 this.speedX += (this.baseSpeedX - this.speedX) * 0.05;
 this.speedY += (this.baseSpeedY - this.speedY) * 0.05;
 this.x += this.speedX;
 this.y += this.speedY;
 if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
 if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
 }
 draw() {
 ctx.beginPath();
 ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
 ctx.fillStyle = this.color;
 ctx.globalAlpha = this.opacity;
 ctx.fill();
 ctx.globalAlpha = 1;
 }
 }
 const count = Math.min(80, Math.floor(canvas.width * canvas.height / 12000));
 for (let i = 0; i < count; i++) particles.push(new Particle());

 function connectParticles() {
 for (let a = 0; a < particles.length; a++) {
 for (let b = a + 1; b < particles.length; b++) {
 const dx = particles[a].x - particles[b].x;
 const dy = particles[a].y - particles[b].y;
 const dist = Math.sqrt(dx * dx + dy * dy);
 if (dist < 130) {
 ctx.beginPath();
 ctx.strokeStyle = particles[a].color;
 ctx.globalAlpha = 0.06 * (1 - dist / 130);
 ctx.lineWidth = 0.5;
 ctx.moveTo(particles[a].x, particles[a].y);
 ctx.lineTo(particles[b].x, particles[b].y);
 ctx.stroke();
 ctx.globalAlpha = 1;
 }
 }
 }
 }

 function animate() {
 ctx.clearRect(0, 0, canvas.width, canvas.height);
 particles.forEach(p => { p.update(); p.draw(); });
 connectParticles();
 requestAnimationFrame(animate);
 }
 animate();
}

// ===== SCROLL REVEAL =====
function initScrollReveal() {
 const els = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');
 const observer = new IntersectionObserver(entries => {
 entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('active'); });
 }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
 els.forEach(el => observer.observe(el));
}

// ===== NAVBAR =====
function initNavbar() {
 const navbar = document.getElementById('navbar');
 const banner = document.getElementById('topBanner');
 if (!navbar) return;
 window.addEventListener('scroll', () => {
 if (window.scrollY > 60) {
 navbar.classList.add('scrolled');
 navbar.style.top = '0';
 } else {
 navbar.classList.remove('scrolled');
 if (banner && banner.style.display !== 'none') navbar.style.top = '38px';
 }
 });
}

function toggleNav() {
 const navLinks = document.getElementById('navLinks');
 const hamburger = document.getElementById('hamburger');
 const backdrop = document.getElementById('navDrawerBackdrop');
 if (!navLinks || !hamburger) return;

 const isOpen = navLinks.classList.toggle('open');
 hamburger.classList.toggle('active', isOpen);
 if (backdrop) {
 backdrop.classList.toggle('open', isOpen);
 }
 hamburger.setAttribute('aria-expanded', String(isOpen));
 document.body.style.overflow = isOpen ? 'hidden' : '';
}
function closeNav() {
 const navLinks = document.getElementById('navLinks');
 const hamburger = document.getElementById('hamburger');
 const backdrop = document.getElementById('navDrawerBackdrop');
 if (!navLinks || !hamburger) return;

 navLinks.classList.remove('open');
 hamburger.classList.remove('active');
 if (backdrop) {
 backdrop.classList.remove('open');
 }
 hamburger.setAttribute('aria-expanded', 'false');
 document.body.style.overflow = '';
}

document.addEventListener('DOMContentLoaded', () => {
 const navLinks = document.getElementById('navLinks');
 if (navLinks) {
 navLinks.querySelectorAll('a').forEach(link => {
 link.addEventListener('click', () => {
 if (window.matchMedia('(max-width: 768px)').matches) {
 closeNav();
 }
 });
 });
 }

 document.addEventListener('keydown', event => {
 if (event.key === 'Escape') {
 closeNav();
 }
 });

 window.addEventListener('resize', () => {
 if (!window.matchMedia('(max-width: 768px)').matches) {
 closeNav();
 }
 });
});

// ===== CUSTOM CURSOR =====
function initCustomCursor() {
 if (window.innerWidth < 769) return;
 const dot = document.createElement('div');
 const ring = document.createElement('div');
 dot.className = 'cursor-dot';
 ring.className = 'cursor-ring';
 document.body.appendChild(dot);
 document.body.appendChild(ring);

 let mouseX = 0, mouseY = 0, ringX = 0, ringY = 0;
 document.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });

 function moveCursor() {
 dot.style.left = mouseX + 'px';
 dot.style.top = mouseY + 'px';
 ringX += (mouseX - ringX) * 0.12;
 ringY += (mouseY - ringY) * 0.12;
 ring.style.left = ringX + 'px';
 ring.style.top = ringY + 'px';
 requestAnimationFrame(moveCursor);
 }
 moveCursor();

 const hovers = document.querySelectorAll('a, button, .domain-card, .quiz-option, .nav-cta, .glass-card');
 hovers.forEach(el => {
 el.addEventListener('mouseenter', () => { dot.classList.add('hovering'); ring.classList.add('hovering'); });
 el.addEventListener('mouseleave', () => { dot.classList.remove('hovering'); ring.classList.remove('hovering'); });
 });
}

// ===== PAGE TRANSITIONS =====
function initPageTransitions() {
 const overlay = document.createElement('div');
 overlay.className = 'page-transition';
 document.body.appendChild(overlay);

 const staticAsset = /\.(css|js|png|jpe?g|gif|webp|ico|svg|woff2?|ttf|map|json)(\?|$)/i;
 const prefetched = new Set();

 function prefetchPage(href) {
 if (!href || prefetched.has(href)) return;
 prefetched.add(href);

 const link = document.createElement('link');
 link.rel = 'prefetch';
 link.as = 'document';
 link.href = href;
 document.head.appendChild(link);
 }

 document.querySelectorAll('a[href]').forEach(link => {
 const href = link.getAttribute('href');
 if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto') || href.startsWith('tel')) return;
 const pathOnly = href.split('#')[0].split('?')[0];
 const isPage =
 href.endsWith('.html') ||
 (href.startsWith('/') && pathOnly !== '' && !staticAsset.test(pathOnly));
 if (isPage) {
 link.addEventListener('pointerenter', () => prefetchPage(href), { passive: true });
 link.addEventListener('focus', () => prefetchPage(href));
 link.addEventListener('click', e => {
 e.preventDefault();
 overlay.classList.add('active');
 requestAnimationFrame(() => {
 setTimeout(() => { window.location.href = href; }, 60);
 });
 });
 }
 });

 const idlePrefetch = () => {
 document.querySelectorAll('a[href]').forEach(link => {
 const href = link.getAttribute('href');
 if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto') || href.startsWith('tel')) return;
 const pathOnly = href.split('#')[0].split('?')[0];
 const isPage =
 href.endsWith('.html') ||
 (href.startsWith('/') && pathOnly !== '' && !staticAsset.test(pathOnly));
 if (isPage) {
 prefetchPage(href);
 }
 });
 };

 if ('requestIdleCallback' in window) {
 requestIdleCallback(idlePrefetch, { timeout: 1000 });
 } else {
 setTimeout(idlePrefetch, 250);
 }
}

// ===== MOBILE EXPERIENCE =====
function initMobileExperience() {
 const isMobile = window.matchMedia('(max-width: 768px)').matches;
 const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 if (!isMobile) return;

 initScrollProgress();
 initMobileSmoothAnchors();
 initMobileRevealEffects();
 if (!reduceMotion) {
 initMobileParallax();
 }
}

function initScrollProgress() {
 let ticking = false;
 const body = document.body;

 function updateProgress() {
 const max = document.documentElement.scrollHeight - window.innerHeight;
 const progress = max > 0 ? Math.min(1, window.scrollY / max) : 0;
 body.style.setProperty('--scroll-progress', String(progress));
 ticking = false;
 }

 window.addEventListener('scroll', () => {
 if (!ticking) {
 requestAnimationFrame(updateProgress);
 ticking = true;
 }
 }, { passive: true });

 updateProgress();
}

function initMobileSmoothAnchors() {
 const navOffset = 88;

 document.querySelectorAll('a[href^="#"]').forEach(link => {
 link.addEventListener('click', event => {
 const href = link.getAttribute('href');
 if (!href || href === '#') return;

 const target = document.querySelector(href);
 if (!target) return;

 event.preventDefault();
 const top = target.getBoundingClientRect().top + window.scrollY - navOffset;
 window.scrollTo({ top, behavior: 'smooth' });
 });
 });
}

function initMobileRevealEffects() {
 const selectors = [
 '.section-title',
 '.section-subtitle',
 '.glass-card',
 '.feature-card',
 '.domain-card',
 '.program-card',
 '.choose-card',
 '.seat-card',
 '.timeline-item',
 '.contact-info-card',
 '.cta-block'
 ].join(',');

 const elements = document.querySelectorAll(selectors);
 if (!elements.length) return;

 elements.forEach((el, index) => {
 el.classList.add('mobile-reveal');
 el.style.setProperty('--mobile-delay', `${Math.min(index % 6, 5) * 50}ms`);
 });

 const observer = new IntersectionObserver(entries => {
 entries.forEach(entry => {
 if (entry.isIntersecting) {
 entry.target.classList.add('visible');
 observer.unobserve(entry.target);
 }
 });
 }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

 elements.forEach(el => observer.observe(el));
}

function initMobileParallax() {
 const layers = document.querySelectorAll('.hero-blob, .hero-blob-2');
 if (!layers.length) return;

 let ticking = false;
 function updateParallax() {
 const scrolled = Math.min(window.scrollY, 600);
 layers.forEach((layer, index) => {
 const depth = index === 0 ? 0.08 : 0.12;
 layer.style.transform = `translate3d(0, ${scrolled * depth}px, 0)`;
 });
 ticking = false;
 }

 window.addEventListener('scroll', () => {
 if (!ticking) {
 requestAnimationFrame(updateParallax);
 ticking = true;
 }
 }, { passive: true });

 updateParallax();
}

// ===== MAGNETIC BUTTONS =====
function initMagneticButtons() {
 if (window.innerWidth < 769) return;
 document.querySelectorAll('.btn-primary, .btn-secondary, .nav-cta').forEach(btn => {
 btn.addEventListener('mousemove', e => {
 const rect = btn.getBoundingClientRect();
 const x = e.clientX - rect.left - rect.width / 2;
 const y = e.clientY - rect.top - rect.height / 2;
 btn.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
 });
 btn.addEventListener('mouseleave', () => {
 btn.style.transform = '';
 });
 });
}

function initDomainCardLinks() {
 document.querySelectorAll('.domain-card[data-href]').forEach(card => {
 const href = card.dataset.href;
 if (!href) return;

 card.addEventListener('click', event => {
 if (event.target.closest('a, button')) return;
 window.location.href = href;
 });

 card.addEventListener('keydown', event => {
 if (event.key === 'Enter' || event.key === ' ') {
 event.preventDefault();
 window.location.href = href;
 }
 });
 });
}

// ===== TILT CARDS =====
function initTiltCards() {
 if (window.innerWidth < 769) return;
 document.querySelectorAll('.domain-card').forEach(card => {
 card.addEventListener('mousemove', e => {
 const rect = card.getBoundingClientRect();
 const x = (e.clientX - rect.left) / rect.width;
 const y = (e.clientY - rect.top) / rect.height;
 const rotateX = (0.5 - y) * 12;
 const rotateY = (x - 0.5) * 12;
 card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
 });
 card.addEventListener('mouseleave', () => {
 card.style.transform = '';
 });
 });
}

// ===== TYPING EFFECT =====
function initTypingEffect() {
 const el = document.getElementById('heroTyped');
 if (!el) return;
 const phrases = [
 'Join us as an Intern.',
 'Ship real projects.',
 'Work in real teams.',
 'Build your portfolio.',
 'Gain verifiable experience.'
 ];
 let phraseIdx = 0, charIdx = 0, isDeleting = false;
 function type() {
 const current = phrases[phraseIdx];
 el.innerHTML = current.substring(0, isDeleting ? --charIdx : ++charIdx) + '<span class="cursor">|</span>';
 let speed = isDeleting ? 35 : 70;
 if (!isDeleting && charIdx === current.length) { speed = 2200; isDeleting = true; }
 else if (isDeleting && charIdx === 0) { isDeleting = false; phraseIdx = (phraseIdx + 1) % phrases.length; speed = 400; }
 setTimeout(type, speed);
 }
 type();
}

// ===== COUNTERS =====
function initCounters() {
 const counters = document.querySelectorAll('[data-count]');
 const obs = new IntersectionObserver(entries => {
 entries.forEach(e => {
 if (e.isIntersecting) {
 const target = parseInt(e.target.dataset.count);
 e.target.textContent = '0';
 let current = 0; const step = Math.ceil(target / 40);
 const timer = setInterval(() => {
 current += step;
 if (current >= target) { current = target; clearInterval(timer); }
 e.target.textContent = current;
 }, 40);
 obs.unobserve(e.target);
 }
 });
 }, { threshold: 0.5 });
 counters.forEach(c => obs.observe(c));
}
