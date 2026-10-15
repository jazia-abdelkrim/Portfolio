(() => {
    "use strict";

    const root = document.documentElement;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ======================================================
       1. Nav: active section (blue) + scroll progress bar
       ====================================================== */
    const navEl = document.querySelector(".nav");
    const items = [...document.querySelectorAll('.nav a[href^="#"]')]
        .map((link) => ({ link, target: document.querySelector(link.hash) }))
        .filter((item) => item.target);

    let lockUntil = 0; // ignore scroll-spy briefly after a nav click

    function setActive(link) {
        items.forEach((item) => {
            if (item.link === link) {
                if (item.link.getAttribute("aria-current") !== "page") {
                    item.link.setAttribute("aria-current", "page");
                    keepInView(item.link);
                }
            } else {
                item.link.removeAttribute("aria-current");
            }
        });
    }

    // On small screens the nav scrolls sideways: keep the active link visible
    function keepInView(link) {
        if (!navEl || navEl.scrollWidth <= navEl.clientWidth) return;
        const li = link.closest("li");
        const left = li.offsetLeft - (navEl.clientWidth - li.offsetWidth) / 2;
        navEl.scrollTo({ left, behavior: reduceMotion ? "auto" : "smooth" });
    }

    function updateActive() {
        if (!items.length || Date.now() < lockUntil) return;
        const line = (navEl ? navEl.offsetHeight : 0) + window.innerHeight * 0.25;
        let current = items[0];
        for (const item of items) {
            if (item.target.getBoundingClientRect().top <= line) current = item;
        }
        const atBottom =
            window.innerHeight + window.scrollY >= root.scrollHeight - 4;
        if (atBottom) current = items[items.length - 1];
        setActive(current.link);
    }

    function updateProgress() {
        const max = root.scrollHeight - window.innerHeight;
        const p = max > 0 ? Math.min(Math.max(window.scrollY / max, 0), 1) : 0;
        root.style.setProperty("--progress", p.toFixed(4));
    }

    items.forEach((item) => {
        item.link.addEventListener("click", () => {
            lockUntil = Date.now() + 900;
            setActive(item.link);
            setTimeout(updateActive, 950);
        });
    });

    let ticking = false;
    function onScroll() {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            updateActive();
            updateProgress();
            ticking = false;
        });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    updateActive();
    updateProgress();

    /* ======================================================
       2. "Trusted by" ribbon: infinite marquee moving right
       ====================================================== */
    const logos = document.querySelector(".trusted-logos");
    const track = logos && logos.querySelector(".trusted-track");
    const baseGroup = track && track.querySelector(".trusted-group");

    if (logos && track && baseGroup && !reduceMotion) {
        const SPEED = 70; // pixels per second
        const originals = [...baseGroup.children].map((n) => n.cloneNode(true));
        let lastWidth = 0;

        const imagesReady = (el) =>
            Promise.all(
                [...el.querySelectorAll("img")].map((img) =>
                    img.complete
                        ? Promise.resolve()
                        : new Promise((resolve) => {
                            img.addEventListener("load", resolve, { once: true });
                            img.addEventListener("error", resolve, { once: true });
                        })
                )
            );

        const hideFromAT = (el) => {
            el.setAttribute("aria-hidden", "true");
            el.querySelectorAll("img").forEach((img) => (img.alt = ""));
        };

        async function buildMarquee() {
            track.classList.remove("is-running");
            track.querySelectorAll("[data-clone]").forEach((g) => g.remove());
            baseGroup.replaceChildren(...originals.map((n) => n.cloneNode(true)));
            await imagesReady(baseGroup);

            // Repeat the logos until one group is wider than the screen (no gaps)
            const viewport = logos.clientWidth;
            let guard = 0;
            while (baseGroup.getBoundingClientRect().width < viewport && guard++ < 10) {
                originals.forEach((n) => {
                    const copy = n.cloneNode(true);
                    copy.alt = "";
                    copy.setAttribute("aria-hidden", "true");
                    baseGroup.appendChild(copy);
                });
            }

            // Second identical group -> seamless loop at translateX(-50% -> 0)
            const clone = baseGroup.cloneNode(true);
            clone.dataset.clone = "true";
            hideFromAT(clone);
            track.appendChild(clone);

            const width = baseGroup.getBoundingClientRect().width;
            track.style.setProperty("--marquee-duration", `${(width / SPEED).toFixed(1)}s`);
            track.classList.add("is-running");
            lastWidth = window.innerWidth;
        }

        buildMarquee();

        let resizeTimer;
        window.addEventListener("resize", () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if (window.innerWidth !== lastWidth) buildMarquee();
            }, 250);
        });
    }

    /* ======================================================
       3. Reveal on scroll (staggered)
       ====================================================== */
    const revealTargets = document.querySelectorAll(".section-head, .cards > li");
    revealTargets.forEach((el) => {
        el.classList.add("reveal");
        if (el.parentElement.classList.contains("cards")) {
            const index = [...el.parentElement.children].indexOf(el);
            el.style.setProperty("--delay", `${(index % 3) * 110}ms`);
        }
    });

    if (reduceMotion || !("IntersectionObserver" in window)) {
        revealTargets.forEach((el) => el.classList.add("is-visible"));
    } else {
        const io = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("is-visible");
                        io.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
        );
        revealTargets.forEach((el) => io.observe(el));
    }

    /* ======================================================
       4. Project photos: placeholder if the image is missing
       ====================================================== */
    document.querySelectorAll(".project-media img").forEach((img) => {
        const markMissing = () => img.closest(".project-media").classList.add("is-missing");
        if (img.complete && img.naturalWidth === 0) markMissing();
        img.addEventListener("error", markMissing);
    });

    /* ======================================================
       5. Footer year
       ====================================================== */
    const year = document.getElementById("year");
    if (year) year.textContent = new Date().getFullYear();
})();