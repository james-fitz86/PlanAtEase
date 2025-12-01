import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/images/planatease_logo.png";

import c1 from "../assets/images/carousel_1.png";
import c2 from "../assets/images/carousel_2.png";
import c3 from "../assets/images/carousel_3.png";

import PageContainer from "../components/base/PageContainer";

/**
  * HeroCarousel
  * Auoplaying carousel used in the home page hero section.
  */

function HeroCarousel({ images = [], intervalMs = 4000 }) {
  // Index of the slide currently visible
  const [index, setIndex] = useState(0);

  // Stores the autoplay time to stop/clear it
  const timerRef = useRef(null);

  // Tracks hover state to pause autoplay when user interacts
  const hoverRef = useRef(false);

  // Used to detect swipe direction on touch devices
  const touchStartX = useRef(null);

  // Move to the next / previous slide
  const next = () => setIndex((i) => (i + 1) % images.length);
  const prev = () => setIndex((i) => (i - 1 + images.length) % images.length);

  // Jump directly to a chosen slide
  const goTo = (i) => setIndex(i);
  
  // Autoplay logic - only runs if images exist
  useEffect(() => {
    if (!images.length) return;

    timerRef.current = setInterval(() => {
      // Only run autoplay when not hoverered
      if (!hoverRef.current) next();
    }, intervalMs);

    // Cleanup on unmount or Update
    return () => clearInterval(timerRef.current);
  }, [images.length, intervalMs]);

  // Pause autoplay when hovering
  const onMouseEnter = () => { hoverRef.current = true; };
  const onMouseLeave = () => { hoverRef.current = false; };

  // Touch start position (for wipe direction)
  const onTouchStart = (e) => {
    touchStartX.current = e.changedTouches[0].clientX;
  };

  // Detect swipe direction on touch end
  const onTouchEnd = (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 30) {
      dx < 0 ? next() : prev();
    }
  };

  return (
    <div
      className="hero-carousel"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      aria-roledescription="carousel"
    >
      {/* Slide Images */}
      <div className="slides-wrap">
        {images.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={`Preview ${i + 1}`}
            className={`slide ${i === index ? "is-active" : "is-hidden"}`}
            draggable="false"
          />
        ))}
      </div>

      {/* Prev / Next arrows */}
      <button
        className="carousel-nav prev"
        onClick={prev}
        aria-label="Previous slide"
        type="button"
      >
        ‹
      </button>
      <button
        className="carousel-nav next"
        onClick={next}
        aria-label="Next slide"
        type="button"
      >
        ›
      </button>

      {/* Slide Indicators */}
      <div className="carousel-dots" role="tablist" aria-label="Select slide">
        {images.map((_, i) => (
          <button
            key={i}
            className={`dot ${i === index ? "is-active" : ""}`}
            onClick={() => goTo(i)}
            role="tab"
            aria-selected={i === index}
            aria-label={`Go to slide ${i + 1}`}
            type="button"
          />
        ))}
      </div>

      {/* Accessible live region for screen readers */}
      <span className="sr-only">Slide {index + 1} of {images.length}</span>
    </div>
  );
}

export default function Home() {
  return (
    <PageContainer className="my-4">
      <section className="home-hero">
        <div className="hero-left">
          <div className="brand-row">
            <img src={logo} alt="PlanAtEase Logo" className="brand-hero" />
          </div>

          <h2 className="hero-subtitle">Your Smart Travel Itinerary Builder</h2>

          <p className="hero-lead">
            Take the stress out of trip planning. Collect flights, stays, food spots,
            activities, and transport into one clear itinerary—kept in sync with
            live weather and interactive maps.
          </p>

          <ul className="hero-points">
            <li>Fast trip setup with Google-powered city & place search</li>
            <li>Easy-to-edit timeline with all your travel plans</li>
            <li>Map previews and local weather at a glance</li>
          </ul>

          <div className="cta-row">
            <Link to="/trips/create" className="btn nebula-pill nebula-solid cta-btn">
              Get started — Create a Trip
            </Link>
            <Link to="/register" className="btn btn-outline-primary nebula-outline cta-btn-ghost">
              Create a free account
            </Link>
          </div>

          <div className="feature-badges">
            <span className="badge-chip">No ads</span>
            <span className="badge-chip">Works on mobile</span>
            <span className="badge-chip">Save & edit anytime</span>
          </div>
        </div>

        <div className="hero-right">
          <div className="preview-card">
            <HeroCarousel images={[c1, c2, c3]} />
          </div>
        </div>
      </section>
    </PageContainer>
  );
}
