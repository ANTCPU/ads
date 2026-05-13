'use client';
import React from 'react';
import { useRouter } from 'next/navigation';

export default function PrivacyPage() {
  const router = useRouter();
  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', color: '#0a0a0a' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e5e5', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span onClick={() => router.push('/')} style={{ fontWeight: 800, fontSize: '1.1rem', color: '#f0883e', cursor: 'pointer' }}>⚡ ANTCPU ADS</span>
        <button onClick={() => router.back()} style={{ background: 'none', border: '1px solid #e5e5e5', borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>← Back</button>
      </div>
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '3rem 1.25rem' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#888', letterSpacing: '0.12em', marginBottom: '0.5rem' }}>LEGAL</div>
        <h1 style={{ fontSize: '2rem', fontWeight: 900, margin: '0 0 0.5rem' }}>Privacy Policy</h1>
        <p style={{ fontSize: '0.82rem', color: '#888', marginBottom: '2.5rem' }}>Last updated: May 13, 2026 · Effective worldwide · GDPR + CCPA compliant</p>

        {[
          { title: '1. Introduction', body: 'ANTCPU ADS ("we", "us", "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and protect your personal information when you use our Service, in compliance with applicable privacy laws worldwide including GDPR (EU), CCPA (California), PIPEDA (Canada), and LGPD (Brazil).' },
          { title: '2. Information We Collect', body: 'We collect: (a) Account information — name, email address, brand name provided at signup. (b) Ad content — titles, descriptions, URLs you submit. (c) Usage data — pages visited, clicks, referrals, timestamps. (d) Device data — browser type, IP address, user agent. We do not collect payment card details directly — payments are processed by third-party providers.' },
          { title: '3. How We Use Your Information', body: 'We use your information to: operate and improve the Service, display your ads in the Arena, process referrals and award points, send service-related notifications, prevent fraud and abuse, and comply with legal obligations. We do not sell your personal data to third parties.' },
          { title: '4. Data Storage', body: 'Your data is stored securely using Supabase (PostgreSQL). Data may be stored on servers located in the United States or other jurisdictions. We implement appropriate technical and organizational measures to protect your data.' },
          { title: '5. Cookies and Tracking', body: 'We use session cookies to keep you logged in. We use minimal analytics to track page visits and ad clicks for platform improvement. We do not use third-party advertising trackers. You can disable cookies in your browser settings, though this may affect Service functionality.' },
          { title: '6. Your Rights', body: 'Depending on your location, you may have the right to: access your personal data, correct inaccurate data, request deletion of your data ("right to be forgotten"), object to or restrict processing, data portability, and withdraw consent at any time. To exercise these rights, contact antcpu@gmail.com. We will respond within 30 days.' },
          { title: '7. Data Retention', body: 'We retain your data for as long as your account is active or as needed to provide the Service. If you delete your account, we will delete your personal data within 30 days, except where retention is required by law.' },
          { title: '8. Children\'s Privacy', body: 'The Service is not directed to children under 18. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, contact us immediately at antcpu@gmail.com.' },
          { title: '9. Third-Party Services', body: 'We use Supabase for data storage and Vercel for hosting. These services have their own privacy policies. We are not responsible for the privacy practices of third-party websites linked from ads on our platform.' },
          { title: '10. International Transfers', body: 'Your data may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place for such transfers in accordance with applicable law.' },
          { title: '11. Changes to This Policy', body: 'We may update this Privacy Policy from time to time. We will notify you of significant changes via email or platform notice. Continued use of the Service after changes constitutes acceptance.' },
          { title: '12. Contact & Data Controller', body: 'ANTCPU ADS is the data controller for your personal information. For privacy inquiries, data requests, or complaints, contact us at antcpu@gmail.com. You also have the right to lodge a complaint with your local data protection authority.' },
        ].map(s => (
          <div key={s.title} style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 0.5rem' }}>{s.title}</h2>
            <p style={{ fontSize: '0.88rem', color: '#444', lineHeight: 1.8, margin: 0 }}>{s.body}</p>
          </div>
        ))}

        <div style={{ borderTop: '1px solid #e5e5e5', paddingTop: '2rem', display: 'flex', gap: '1.5rem', fontSize: '0.78rem', color: '#aaa', flexWrap: 'wrap' }}>
          <span>⚡ ANTCPU ADS</span>
          <a href="/tos" style={{ color: '#aaa', textDecoration: 'none' }}>Terms of Service</a>
          <a href="/about" style={{ color: '#aaa', textDecoration: 'none' }}>About</a>
          <a href="mailto:antcpu@gmail.com" style={{ color: '#aaa', textDecoration: 'none' }}>Contact</a>
        </div>
      </div>
    </div>
  );
}
