/**
 * Ability Academy · interacciones y animaciones.
 * GSAP 3.13 (+ScrollTrigger, SplitText) y Lenis. Se activan mediante clases ab-* que se ponen
 * en Elementor › Avanzado › Clases CSS. En el editor de Elementor no se ejecuta nada pesado.
 */
(function () {
	'use strict';

	var d = document;
	var root = d.documentElement;
	var body = d.body;
	var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
	var inEditor = body.classList.contains('elementor-editor-active') || /elementor-preview/.test(location.search);
	var $ = function (s, c) { return (c || d).querySelector(s); };
	var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };

	/* ------------------------------------------------------------------ *
	 * Utilidades sin dependencia de GSAP (siempre activas)
	 * ------------------------------------------------------------------ */

	// Cabecera clara/oscura según el primer bloque de la página.
	var firstHero = $('.ab-main .ab-hero, .ab-main .ab-pagehero, .ab-main .ab-webinar');
	if (firstHero && firstHero.getBoundingClientRect().top < 200) body.classList.add('ab-dark-top');

	// Menú móvil.
	var burger = $('.ab-burger');
	var overlay = $('#ab-overlay');
	function toggleMenu(open) {
		var isOpen = typeof open === 'boolean' ? open : !body.classList.contains('ab-menu-open');
		body.classList.toggle('ab-menu-open', isOpen);
		if (burger) burger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
		if (overlay) overlay.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
		if (window.abLenis) isOpen ? window.abLenis.stop() : window.abLenis.start();
	}
	if (burger) burger.addEventListener('click', function () { toggleMenu(); });
	$$('#ab-overlay a').forEach(function (a) { a.addEventListener('click', function () { toggleMenu(false); }); });
	d.addEventListener('keydown', function (e) { if (e.key === 'Escape') toggleMenu(false); });

	// Formulario webinar.
	initForms();

	if (inEditor || reduce || typeof window.gsap === 'undefined') {
		root.classList.remove('ab-anim');
		body.classList.add('ab-loaded', 'ab-ready');
		simpleHeader();
		return;
	}

	/* ------------------------------------------------------------------ *
	 * GSAP
	 * ------------------------------------------------------------------ */
	var gsap = window.gsap;
	gsap.registerPlugin(window.ScrollTrigger, window.SplitText);
	var ST = window.ScrollTrigger;
	var ease = 'expo.out';

	// Scroll suave.
	var lenis = null;
	if (window.Lenis) {
		lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 1 });
		window.abLenis = lenis;
		lenis.on('scroll', ST.update);
		gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
		gsap.ticker.lagSmoothing(0);
		$$('a[href^="#"]').forEach(function (a) {
			a.addEventListener('click', function (e) {
				var id = a.getAttribute('href');
				if (id.length < 2) return;
				var target = d.getElementById(id.slice(1));
				if (!target) return;
				e.preventDefault();
				lenis.scrollTo(target, { offset: -90, duration: 1.4 });
			});
		});
	}
	$$('.ab-totop').forEach(function (b) {
		b.addEventListener('click', function () { lenis ? lenis.scrollTo(0, { duration: 1.8 }) : window.scrollTo({ top: 0, behavior: 'smooth' }); });
	});

	// Cabecera: se esconde al bajar y aparece al subir; fondo cristal tras el hero.
	var header = $('#ab-header');
	var lastY = 0;
	ST.create({
		start: 0, end: 'max',
		onUpdate: function (self) {
			var y = self.scroll();
			if (!header) return;
			header.classList.toggle('is-scrolled', y > 60);
			if (!body.classList.contains('ab-menu-open')) header.classList.toggle('is-hidden', y > 400 && y > lastY);
			lastY = y;
		}
	});

	// Barra de progreso.
	gsap.to('.ab-progress i', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });

	/* ---------- Estados iniciales ---------- */
	var splits = [];
	$$('.ab-split').forEach(function (w) {
		var el = w.querySelector('.elementor-heading-title') || w;
		var s = new window.SplitText(el, { type: 'lines,words', linesClass: 'ab-split-line', mask: 'lines' });
		gsap.set(s.words, { yPercent: 115, rotate: 4 });
		gsap.set(w, { autoAlpha: 1 });
		splits.push({ wrap: w, split: s, hero: !!w.closest('.ab-hero, .ab-pagehero') });
	});
	$$('.ab-fade').forEach(function (el) { gsap.set(el, { autoAlpha: 0, y: 34 }); });
	body.classList.add('ab-ready');

	/* ---------- Loader ---------- */
	var loader = $('.ab-loader');
	var seen = false;
	try { seen = sessionStorage.getItem('ab-seen') === '1'; sessionStorage.setItem('ab-seen', '1'); } catch (e) {}
	var intro = gsap.timeline({ onComplete: function () { body.classList.add('ab-loaded'); ST.refresh(); } });
	if (loader) {
		loader.style.animation = 'none';
		if (seen) {
			intro.to(loader, { autoAlpha: 0, duration: 0.45, ease: 'power2.out' });
		} else {
			intro
				.from('.ab-loader__logo', { autoAlpha: 0, scale: .6, rotate: -8, duration: 1, ease: 'back.out(1.7)' })
				.from('.ab-loader__word', { yPercent: 120, duration: 1, stagger: 0.12, ease: ease }, '-=.6')
				.to('.ab-loader__bar i', { scaleX: 1, duration: 0.9, ease: 'power3.inOut' }, '-=.5')
				.to('.ab-loader__inner', { yPercent: -30, autoAlpha: 0, duration: 0.6, ease: 'power3.in' })
				.to(loader, { clipPath: 'inset(0 0 100% 0)', duration: 0.9, ease: 'expo.inOut' }, '-=.2');
		}
	}
	// Hero: entra al terminar el loader.
	var heroTl = gsap.timeline({ paused: true });
	splits.filter(function (s) { return s.hero; }).forEach(function (s, i) {
		heroTl.to(s.split.words, { yPercent: 0, rotate: 0, duration: 1.3, stagger: 0.045, ease: ease }, i * 0.1);
	});
	var heroFades = $$('.ab-hero .ab-fade, .ab-pagehero .ab-fade, .ab-hero .ab-eyebrow, .ab-pagehero .ab-eyebrow, .ab-hero .ab-scrollhint-widget');
	if (heroFades.length) heroTl.fromTo(heroFades, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.09, ease: ease }, 0.35);
	var heroBg = $$('.ab-hero .elementor-background-video-container, .ab-pagehero__media');
	if (heroBg.length) heroTl.from(heroBg, { scale: 1.18, duration: 2.2, ease: 'expo.out' }, 0);
	intro.call(function () { heroTl.play(); }, null, Math.max(0, intro.duration() - 0.5));

	/* ---------- Titulares por scroll ---------- */
	splits.filter(function (s) { return !s.hero; }).forEach(function (s) {
		gsap.to(s.split.words, {
			yPercent: 0, rotate: 0, duration: 1.2, stagger: 0.04, ease: ease,
			scrollTrigger: { trigger: s.wrap, start: 'top 88%', once: true }
		});
	});

	/* ---------- Fade genérico ---------- */
	ST.batch($$('.ab-fade').filter(function (el) { return !el.closest('.ab-hero, .ab-pagehero'); }), {
		start: 'top 90%', once: true,
		onEnter: function (els) { gsap.to(els, { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.1, ease: ease }); }
	});

	/* ---------- Tarjetas e icon-box en cascada ---------- */
	var cascade = $$('.ab-tile, .ab-pillar, .ab-mini, .ab-person, .ab-contact__card, .ab-area, .ab-card, .ab-counter, .ab-list .elementor-icon-list-item, .ab-faq .elementor-toggle-item');
	gsap.set(cascade, { autoAlpha: 0, y: 50 });
	ST.batch(cascade, {
		start: 'top 92%', once: true,
		onEnter: function (els) { gsap.to(els, { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.08, ease: ease, clearProps: 'transform' }); }
	});

	/* ---------- Imágenes: revelado con máscara ---------- */
	$$('.ab-reveal').forEach(function (w) {
		var img = w.querySelector('img');
		if (!img || w.closest('.ab-hscroll__track')) return;
		gsap.set(w, { clipPath: 'inset(100% 0% 0% 0%)' });
		var tl = gsap.timeline({ scrollTrigger: { trigger: w, start: 'top 88%', once: true } });
		tl.to(w, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.inOut' })
			.from(img, { scale: 1.35, duration: 1.8, ease: ease }, 0);
	});

	/* ---------- Parallax ---------- */
	function parallax(sel, amount) {
		$$(sel).forEach(function (w) {
			var target = w.querySelector('img') || w;
			if (target === w && w.classList.contains('ab-pagehero__media')) target = w;
			gsap.fromTo(target, { yPercent: -amount, scale: 1 + amount / 50 }, {
				yPercent: amount, ease: 'none',
				scrollTrigger: { trigger: w.closest('.e-con, .ab-pagehero') || w, start: 'top bottom', end: 'bottom top', scrub: true }
			});
		});
	}
	parallax('.ab-parallax', 7);
	parallax('.ab-parallax-fast', 14);
	gsap.to('.ab-pagehero__media', { yPercent: 18, ease: 'none', scrollTrigger: { trigger: '.ab-pagehero', start: 'top top', end: 'bottom top', scrub: true } });
	// Hero de Elementor: el contenido se aleja al hacer scroll.
	$$('.ab-hero').forEach(function (h) {
		var inner = h.querySelector('.ab-hero__inner');
		if (!inner) return;
		gsap.to(inner, { yPercent: -25, autoAlpha: 0.2, ease: 'none', scrollTrigger: { trigger: h, start: 'top top', end: 'bottom top', scrub: true } });
	});

	/* ---------- Texto que se "enciende" palabra a palabra ---------- */
	$$('.ab-scrub').forEach(function (w) {
		var p = w.querySelector('p') || w;
		var s = new window.SplitText(p, { type: 'words', wordsClass: 'ab-word' });
		gsap.fromTo(s.words, { opacity: 0.14 }, {
			opacity: 1, stagger: 0.08, ease: 'none',
			scrollTrigger: { trigger: w, start: 'top 80%', end: 'bottom 45%', scrub: true }
		});
	});

	/* ---------- Tarjetas apiladas (servicios) ---------- */
	var cards = $$('.ab-stack__card');
	if (window.innerWidth > 767) {
		cards.forEach(function (card, i) {
			if (i === cards.length - 1) return;
			gsap.to(card, {
				scale: 0.92 + i * 0.02, filter: 'brightness(.82)', ease: 'none',
				scrollTrigger: { trigger: cards[i + 1], start: 'top bottom', end: 'top 20%', scrub: true }
			});
		});
	}

	/* ---------- Galería horizontal fijada ---------- */
	var mm = gsap.matchMedia();
	mm.add('(min-width: 768px)', function () {
		$$('.ab-hscroll').forEach(function (sec) {
			var track = sec.querySelector('.ab-hscroll__track');
			if (!track) return;
			var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
			gsap.to(track, {
				x: function () { return -dist(); }, ease: 'none',
				scrollTrigger: { trigger: sec, start: 'top top', end: function () { return '+=' + dist(); }, pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1 }
			});
			$$('img', track).forEach(function (img, i) {
				gsap.fromTo(img, { scale: 1.15 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: sec, start: 'top top', end: function () { return '+=' + dist(); }, scrub: true } });
			});
		});
	});

	/* ---------- Marquee reactivo a la velocidad de scroll ---------- */
	var marquees = $$('.ab-marquee__track');
	if (marquees.length) {
		var skew = gsap.quickTo(marquees, 'skewX', { duration: 0.5, ease: 'power3' });
		ST.create({
			onUpdate: function (self) {
				var v = gsap.utils.clamp(-12, 12, self.getVelocity() / -300);
				skew(v);
				marquees.forEach(function (m) { m.getAnimations().forEach(function (a) { a.playbackRate = 1 + Math.abs(v) / 2.5; }); });
			}
		});
	}

	/* ---------- Footer ---------- */
	gsap.from('.ab-footer__marquee', { xPercent: 10, ease: 'none', scrollTrigger: { trigger: '.ab-footer', start: 'top bottom', end: 'bottom bottom', scrub: true } });

	/* ---------- Puntero: cursor, botones magnéticos y tilt ---------- */
	if (finePointer) {
		var cursor = $('.ab-cursor');
		var label = $('.ab-cursor__label');
		if (cursor) {
			var cx = gsap.quickTo(cursor, 'x', { duration: 0.35, ease: 'power3' });
			var cy = gsap.quickTo(cursor, 'y', { duration: 0.35, ease: 'power3' });
			window.addEventListener('mousemove', function (e) { cx(e.clientX); cy(e.clientY); cursor.classList.add('is-on'); }, { passive: true });
			d.addEventListener('mouseleave', function () { cursor.classList.remove('is-on'); });
			var labelled = [
				['.ab-video', 'Play'], ['.ab-hscroll__track', 'Scroll'], ['[data-cursor]', null]
			];
			labelled.forEach(function (pair) {
				$$(pair[0]).forEach(function (el) {
					el.addEventListener('mouseenter', function () { label.textContent = pair[1] || el.getAttribute('data-cursor'); cursor.classList.add('is-label'); });
					el.addEventListener('mouseleave', function () { cursor.classList.remove('is-label'); });
				});
			});
			$$('a, button, .elementor-tab-title, .ab-chip').forEach(function (el) {
				el.addEventListener('mouseenter', function () { cursor.classList.add('is-link'); });
				el.addEventListener('mouseleave', function () { cursor.classList.remove('is-link'); });
			});
		}

		$$('.ab-magnetic').forEach(function (w) {
			var el = w.querySelector('.elementor-button') || w;
			var mx = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1,.4)' });
			var my = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1,.4)' });
			el.addEventListener('mousemove', function (e) {
				var r = el.getBoundingClientRect();
				mx((e.clientX - r.left - r.width / 2) * 0.3);
				my((e.clientY - r.top - r.height / 2) * 0.4);
			});
			el.addEventListener('mouseleave', function () { mx(0); my(0); });
		});

		$$('.ab-tilt').forEach(function (el) {
			gsap.set(el, { transformPerspective: 900 });
			var rx = gsap.quickTo(el, 'rotationX', { duration: 0.8, ease: 'power3' });
			var ry = gsap.quickTo(el, 'rotationY', { duration: 0.8, ease: 'power3' });
			el.addEventListener('mousemove', function (e) {
				var r = el.getBoundingClientRect();
				ry(((e.clientX - r.left) / r.width - 0.5) * 8);
				rx(-((e.clientY - r.top) / r.height - 0.5) * 8);
			});
			el.addEventListener('mouseleave', function () { rx(0); ry(0); });
		});
	}

	// Recalcular cuando cargan imágenes/fuentes.
	window.addEventListener('load', function () { ST.refresh(); });
	if (d.fonts && d.fonts.ready) d.fonts.ready.then(function () { ST.refresh(); });

	/* ------------------------------------------------------------------ */
	function simpleHeader() {
		var h = $('#ab-header');
		if (!h) return;
		var onScroll = function () { h.classList.toggle('is-scrolled', window.scrollY > 60); };
		window.addEventListener('scroll', onScroll, { passive: true });
		onScroll();
	}

	function initForms() {
		$$('[data-ab-form]').forEach(function (form) {
			var msg = form.querySelector('.ab-form__msg');
			form.addEventListener('submit', function (e) {
				e.preventDefault();
				var ok = true;
				$$('.is-invalid', form).forEach(function (el) { el.classList.remove('is-invalid'); });
				$$('input[required]', form).forEach(function (input) {
					var valid = input.type === 'radio' ? !!form.querySelector('input[name="' + input.name + '"]:checked') : input.type === 'checkbox' ? input.checked : input.checkValidity();
					if (!valid) { ok = false; (input.closest('.ab-field, .ab-chips, .ab-check') || input).classList.add('is-invalid'); }
				});
				if (!ok) { msg.textContent = 'Revisa los campos marcados.'; msg.classList.add('is-error'); return; }
				if (!window.AbilityCfg) return;
				if (window.AbilityCfg.demo) { // Versión HTML de demostración: no hay servidor que reciba el lead.
					form.classList.add('is-loading');
					setTimeout(function () {
						form.classList.remove('is-loading');
						form.classList.add('is-done');
						msg.textContent = '¡Gracias, ' + (form.nombre.value || '') + '! (Vista previa: en la web WordPress este mensaje llega a ' + window.AbilityCfg.demo + ')';
						confetti(form);
					}, 900);
					return;
				}
				var data = new FormData(form);
				data.append('action', form.getAttribute('data-action') || 'ability_webinar');
				data.append('nonce', window.AbilityCfg.nonce);
				form.classList.add('is-loading');
				msg.textContent = '';
				msg.classList.remove('is-error');
				fetch(window.AbilityCfg.ajax, { method: 'POST', body: data, credentials: 'same-origin' })
					.then(function (r) { return r.json(); })
					.then(function (res) {
						form.classList.remove('is-loading');
						msg.textContent = (res.data && res.data.message) || 'Gracias.';
						if (res.success) { form.classList.add('is-done'); confetti(form); }
						else msg.classList.add('is-error');
					})
					.catch(function () {
						form.classList.remove('is-loading');
						msg.textContent = 'No se ha podido enviar. Escríbenos por WhatsApp y te atendemos.';
						msg.classList.add('is-error');
					});
			});
		});
	}

	function confetti(origin) {
		if (!window.gsap || reduce) return;
		var r = origin.getBoundingClientRect();
		var colors = ['#4F7E72', '#CCC2E8', '#A5C9B5', '#1E2B27', '#FDF9F7'];
		for (var i = 0; i < 70; i++) {
			var p = d.createElement('i');
			p.className = 'ab-confetti';
			p.style.background = colors[i % colors.length];
			p.style.left = (r.left + r.width / 2) + 'px';
			p.style.top = (r.top + r.height / 3) + 'px';
			body.appendChild(p);
			window.gsap.to(p, {
				x: (Math.random() - 0.5) * 700, y: (Math.random() - 0.9) * 500, rotation: Math.random() * 720,
				opacity: 0, duration: 1.6 + Math.random(), ease: 'power3.out',
				onComplete: (function (el) { return function () { el.remove(); }; })(p)
			});
		}
	}
})();
