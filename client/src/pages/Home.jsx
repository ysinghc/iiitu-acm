import React, { useState, useEffect } from 'react';
import HeroCarousel from '../components/HeroCarousel';
import { API } from '../utils/apiURL';

function MessageCard({ msg, reversed = false }) {
  return (
    <div className={`bg-card-bg border border-border-color rounded-2xl overflow-hidden flex flex-col md:flex-row ${reversed ? 'md:flex-row-reverse' : ''} card-hover`}>
      {msg.imageUrl && (
        <div className="w-full md:w-2/5 min-h-[240px] relative flex-shrink-0 bg-bg-elevated overflow-hidden">
          <img
            src={msg.imageUrl}
            alt={msg.name}
            className="w-full h-full object-cover object-top"
            style={{ minHeight: '240px' }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20" />
        </div>
      )}
      <div className="p-8 md:p-10 flex flex-col justify-center gap-4 flex-1">
        <div>
          <span className="acm-tag">{msg.role === 'sponsor' ? 'Faculty Sponsor' : 'Student Chairman'}</span>
          <h2 className="mt-2 text-xl md:text-2xl font-bold text-text-primary tracking-tight leading-snug">
            {msg.name}
          </h2>
        </div>
        <p className="text-text-secondary text-sm leading-7 whitespace-pre-line">
          {msg.content}
        </p>
        <div className="pt-2 border-t border-border-subtle">
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

  useEffect(() => {
    const fetchData = async () => {
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
    };
    fetchData();
  }, []);

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
        <div className="max-w-6xl mx-auto px-6 py-16 space-y-8">
          <div className="mb-10">
            <span className="acm-tag">About the Chapter</span>
            <h2 className="mt-2 text-2xl md:text-3xl font-bold text-text-primary tracking-tight">
              A Word From Our Leaders
            </h2>
          </div>

          {chairmanMsg && <MessageCard msg={chairmanMsg} reversed />}
          {sponsorMsg && <MessageCard msg={sponsorMsg} />}
        </div>
      )}
    </div>
  );
}
