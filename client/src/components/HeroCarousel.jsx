import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function HeroCarousel({ slides }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const goTo = useCallback((idx) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex(idx);
    setTimeout(() => setIsTransitioning(false), 700);
  }, [isTransitioning]);

  useEffect(() => {
    if (!slides || slides.length <= 1) return;
    const timer = setInterval(() => {
      goTo((currentIndex + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides, currentIndex, goTo]);

  if (!slides || slides.length === 0) {
    return (
      <div className="w-full bg-gradient-to-br from-acm-dark via-acm-blue to-acm-dark flex flex-col items-center justify-center text-white relative overflow-hidden" style={{ height: 'calc(100vh - 56px)' }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 25% 50%, white 1px, transparent 1px), radial-gradient(circle at 75% 50%, white 1px, transparent 1px)', backgroundSize: '60px 60px' }}
        />
        <p className="acm-tag text-white/60 mb-4">Association for Computing Machinery</p>
        <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-center px-8">IIITU ACM Student Chapter</h2>
        <p className="mt-4 text-white/60 text-sm">Innovate. Collaborate. Lead.</p>
      </div>
    );
  }

  const prevSlide = () => goTo((currentIndex - 1 + slides.length) % slides.length);
  const nextSlide = () => goTo((currentIndex + 1) % slides.length);

  return (
    <div className="relative w-full overflow-hidden group bg-black" style={{ height: 'calc(100vh - 56px)' }}>
      {slides.map((slide, idx) => (
        <div
          key={slide._id || idx}
          className="absolute inset-0"
          style={{
            opacity: idx === currentIndex ? 1 : 0,
            transition: 'opacity 0.8s cubic-bezier(0.4,0,0.2,1)',
            zIndex: idx === currentIndex ? 1 : 0,
          }}
        >
          <img
            src={slide.imageUrl}
            alt={slide.title}
            className="w-full h-full object-cover"
            style={{
              transform: idx === currentIndex ? 'scale(1.02)' : 'scale(1)',
              transition: 'transform 7s cubic-bezier(0.4,0,0.2,1)',
            }}
            onError={(e) => {
              e.target.src = 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1400&q=80';
            }}
          />
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent" />

          {/* Slide content */}
          <div
            className="absolute inset-0 flex flex-col justify-end pb-12 px-8 md:px-16 max-w-5xl"
            style={{
              opacity: idx === currentIndex ? 1 : 0,
              transform: idx === currentIndex ? 'translateY(0)' : 'translateY(16px)',
              transition: 'opacity 0.9s 0.2s ease, transform 0.9s 0.2s ease',
            }}
          >
            <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight leading-tight mb-3">
              {slide.title}
            </h2>
            {slide.description && (
              <p className="text-sm md:text-base text-white/65 max-w-xl leading-relaxed font-normal">
                {slide.description}
              </p>
            )}
          </div>
        </div>
      ))}

      {/* Navigation */}
      {slides.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white border border-white/10 hover:border-white/20 opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm focus:outline-none"
            aria-label="Previous"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white border border-white/10 hover:border-white/20 opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm focus:outline-none"
            aria-label="Next"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Progress pills */}
          <div className="absolute bottom-5 right-8 md:right-16 z-10 flex items-center gap-1.5">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => goTo(idx)}
                className="h-1 rounded-full transition-all duration-500 focus:outline-none"
                style={{
                  width: idx === currentIndex ? '24px' : '6px',
                  backgroundColor: idx === currentIndex ? '#fff' : 'rgba(255,255,255,0.3)',
                }}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
