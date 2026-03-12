/**
 * RENTMS ELITE — CORE JAVASCRIPT  v2
 * Handles: Sticky Header, Scroll Animations, Mobile Nav,
 *          Smooth Scroll, Scroll-Spy, Contact Form
 * Dark mode locked — no theme toggle logic
 * Requires: api.js loaded before this script
 */

document.addEventListener("DOMContentLoaded", () => {
  /* ── Selectors ── */
  const body = document.body;
  const header = document.getElementById("main-header");
  const mobileToggle = document.querySelector(".mobile-nav-toggle");
  const navLinksContainer = document.querySelector(".nav-links");
  const reveals = document.querySelectorAll(".reveal");
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  /* ══════════════════════════════════════════════
     1. MOBILE MENU TOGGLE
  ══════════════════════════════════════════════ */
  if (mobileToggle && navLinksContainer) {
    function closeMobileMenu() {
      navLinksContainer.classList.remove("active");
      mobileToggle.classList.remove("open");
      mobileToggle.setAttribute("aria-expanded", "false");
      body.style.overflow = "";
    }

    mobileToggle.addEventListener("click", () => {
      const isOpen = navLinksContainer.classList.toggle("active");
      mobileToggle.classList.toggle("open", isOpen);
      body.style.overflow = isOpen ? "hidden" : "";
      mobileToggle.setAttribute("aria-expanded", String(isOpen));
    });

    /* Close on nav link click */
    navLinksContainer.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeMobileMenu);
    });

    /* Close on outside click */
    document.addEventListener("click", (e) => {
      if (
        navLinksContainer.classList.contains("active") &&
        !navLinksContainer.contains(e.target) &&
        !mobileToggle.contains(e.target)
      ) {
        closeMobileMenu();
      }
    });

    /* Close on Escape key */
    document.addEventListener("keydown", (e) => {
      if (
        e.key === "Escape" &&
        navLinksContainer.classList.contains("active")
      ) {
        closeMobileMenu();
        mobileToggle.focus();
      }
    });
  }

  /* ══════════════════════════════════════════════
     2. STICKY HEADER — glassmorphism on scroll
  ══════════════════════════════════════════════ */
  if (header) {
    const onScroll = () =>
      header.classList.toggle("header-scrolled", window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ══════════════════════════════════════════════
     3. SCROLL REVEAL ANIMATION
     Skipped entirely if user prefers reduced motion
  ══════════════════════════════════════════════ */
  if (reveals.length) {
    if (reducedMotion) {
      /* Instantly show all reveal elements — no animation */
      reveals.forEach((el) => el.classList.add("active"));
    } else {
      const revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("active");
              revealObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.15, rootMargin: "0px 0px -50px 0px" },
      );
      reveals.forEach((el) => revealObserver.observe(el));
    }
  }

  /* ══════════════════════════════════════════════
     4. SMOOTH SCROLL FOR ANCHOR LINKS
     Falls back to instant jump if reduced motion
  ══════════════════════════════════════════════ */
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      const targetId = this.getAttribute("href");
      if (targetId === "#") return;
      const target = document.querySelector(targetId);
      if (!target) return;
      e.preventDefault();
      const offset = (header ? header.offsetHeight : 0) + 16;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: reducedMotion ? "auto" : "smooth" });
    });
  });

  /* ══════════════════════════════════════════════
     5. SCROLL-SPY — highlight active nav link
     Matches nav links to section IDs as user scrolls
  ══════════════════════════════════════════════ */
  const navAnchors = navLinksContainer
    ? [...navLinksContainer.querySelectorAll('a[href^="#"]')]
    : [];

  if (navAnchors.length) {
    const sections = navAnchors
      .map((a) => document.querySelector(a.getAttribute("href")))
      .filter(Boolean);

    function updateActiveNav() {
      const scrollY = window.scrollY;
      const headerH = header ? header.offsetHeight : 0;
      const threshold = headerH + 40;
      let activeSection = sections[0];

      sections.forEach((section) => {
        if (
          section.getBoundingClientRect().top + window.scrollY - threshold <=
          scrollY
        ) {
          activeSection = section;
        }
      });

      navAnchors.forEach((a) => {
        const isActive = a.getAttribute("href") === "#" + activeSection?.id;
        a.classList.toggle("active", isActive);
        a.setAttribute("aria-current", isActive ? "true" : "false");
      });
    }

    window.addEventListener("scroll", updateActiveNav, { passive: true });
    updateActiveNav();
  }

  /* ══════════════════════════════════════════════
     6. CONTACT FORM
     Uses API.Email.sendContact() from api.js
     Shows proper success and error states
  ══════════════════════════════════════════════ */
  const contactForm = document.querySelector(".contact-form");
  if (contactForm) {
    contactForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const btn = contactForm.querySelector("button[type='submit']");
      const origText = btn.textContent;
      btn.textContent = "Sending…";
      btn.disabled = true;

      /* Read by name attribute — safe if more inputs are added later */
      const formData = Object.fromEntries(new FormData(contactForm));
      const data = {
        name: (formData.name || "").trim(),
        email: (formData.email || "").trim(),
        message: (formData.message || "").trim(),
      };

      let success = false;

      try {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        success = res.ok;
      } catch {
        success = false;
      }

      if (success) {
        btn.textContent = "✓ Message Sent!";
        btn.style.background = "rgba(16,185,129,0.2)";
        btn.style.borderColor = "rgba(16,185,129,0.5)";
        contactForm.reset();
        setTimeout(() => {
          btn.textContent = origText;
          btn.disabled = false;
          btn.style.background = "";
          btn.style.borderColor = "";
        }, 3000);
      } else {
        btn.textContent = "✗ Failed — try again";
        btn.style.background = "rgba(239,68,68,0.15)";
        btn.style.borderColor = "rgba(239,68,68,0.4)";
        btn.disabled = false;
        setTimeout(() => {
          btn.textContent = origText;
          btn.style.background = "";
          btn.style.borderColor = "";
        }, 3500);
      }
    });
  }
});
