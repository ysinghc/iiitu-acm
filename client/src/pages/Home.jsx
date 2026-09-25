import React, { useState, useEffect } from 'react';
import HeroCarousel from '../components/HeroCarousel';
import { API } from '../utils/apiURL';
import { useFocusRefresh } from '../utils/useFocusRefresh';

function MessageCard({ msg }) {
  return (
    <div className="bg-card-bg border border-border-color rounded-2xl overflow-hidden flex flex-col card-hover h-full">
      {msg.imageUrl && (
        <div className="h-64 bg-bg-elevated overflow-hidden flex-shrink-0 relative">
          <img
            src={msg.imageUrl}
            alt={msg.name}
            className="w-full h-full object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20" />
        </div>
      )}
      <div className="p-7 md:p-8 flex flex-col gap-4 flex-1">
        <div>
          <span className="acm-tag">{msg.role === 'sponsor' ? 'Faculty Sponsor' : 'Student Chairman'}</span>
          <h2 className="mt-2 text-xl font-bold text-text-primary tracking-tight leading-snug">
            {msg.name}
          </h2>
        </div>
        <p className="text-text-secondary text-sm leading-7 whitespace-pre-line line-clamp-6">
          {msg.content}
        </p>
        <div className="mt-auto pt-4 border-t border-border-subtle">
          <span className="text-[11px] text-text-tertiary">
            {msg.role === 'sponsor' ? 'Indian Institute of Information Technology, Una' : 'IIITU ACM Chapter — 2026–27'}
          </span>
        </div>
      </div>
    </div>
  );
}

function StatBadge({ value, label }) {
  return (
    <div className="text-center">
      <div className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight">{value}</div>
      <div className="text-[11px] text-text-secondary mt-0.5 uppercase tracking-wider font-medium">{label}</div>
    </div>
  );
}

export default function Home() {
  const [slides, setSlides] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = React.useCallback(async () => {
    try {
      const [slidesRes, messagesRes] = await Promise.all([
        fetch(`${API}/public/carousel`),
        fetch(`${API}/public/messages`)
      ]);
      setSlides(await slidesRes.json());
      setMessages(await messagesRes.json());
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useFocusRefresh(fetchData);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px] bg-bg-primary">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 border-2 border-acm-blue border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium text-text-secondary">Loading chapter page…</p>
        </div>
      </div>
    );
  }

  const sponsorMsg = messages.find(m => m.role === 'sponsor');
  const chairmanMsg = messages.find(m => m.role === 'chairman');

  return (
    <div className="bg-bg-primary transition-colors duration-300">
      {/* Full-bleed Hero */}
      <HeroCarousel slides={slides} />


      {/* Message Cards */}
      {(sponsorMsg || chairmanMsg) && (
        <div className="bg-bg-secondary border-t border-border-color">
          <div className="max-w-7xl mx-auto px-6 md:px-8 py-10 md:py-12">
            <span className="acm-tag">About the Chapter</span>
            <h2 className="mt-2 text-3xl md:text-4xl font-bold text-text-primary tracking-tight">
              A Word From Our Leaders
            </h2>
            <p className="mt-2 text-text-secondary text-sm max-w-md leading-relaxed">
              Guidance and vision from the faculty and student leadership.
            </p>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {chairmanMsg && <MessageCard msg={chairmanMsg} />}
              {sponsorMsg && <MessageCard msg={sponsorMsg} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
