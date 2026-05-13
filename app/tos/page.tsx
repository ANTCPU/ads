'use client';
import React from 'react';
import { useRouter } from 'next/navigation';

export default function TosPage() {
  const router = useRouter();
  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', color: '#0a0a0a' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e5e5', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span onClick={() => router.push('/')} style={{ fontWeight: 800, fontSize: '1.1rem', color: '#f0883e', cursor: 'pointer' }}>⚡ ANTCPU ADS</span>
        <button onClick={() => router.back()} style={{ background: 'none', border: '1px solid #e5e5e5', borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>← Back</button>
      </div>
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '3rem 1.25rem' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#888', letterSpacing: '0.12em', marginBottom: '0.5rem' }}>LEGAL</div>
        <h1 style={{ fontSize: '2rem', fontWeight: 900, margin: '0 0 0.5rem' }}>Terms of Service</h1>
        <p style={{ fontSize: '0.82rem', color: '#888', marginBottom: '2.5rem' }}>Last updated: May 13, 2026 · Effective worldwide</p>

        {[
          { title: '1. Acceptance of Terms', body: 'By accessing or using ANTCPU ADS ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service. These terms apply to all users worldwide.' },
          { title: '2. Description of Service', body: 'ANTCPU ADS is a competitive advertising platform that allows users to create, publish, and promote text-based advertisements within the Arena network. The Service includes ad creation tools, promo code referral systems, and brand dashboard features.' },
          { title: '3. Eligibility', body: 'You must be at least 18 years of age to use this Service. By using the Service, you represent that you meet this requirement and that all information you provide is accurate and complete.' },
          { title: '4. User Accounts', body: 'You are responsible for maintaining the confidentiality of your account credentials. You are responsible for all activity that occurs under your account. Notify us immediately at antcpu@gmail.com if you suspect unauthorized access.' },
          { title: '5. Acceptable Use', body: 'You agree not to use the Service to post content that is illegal, harmful, deceptive, or violates the rights of others. ANTCPU ADS reserves the right to remove any content and suspend any account that violates these terms without notice.' },
          { title: '6. Ad Content', body: 'You are solely responsible for the content of your advertisements. By submitting an ad, you represent that you have the right to use all content included and that it does not infringe any third-party rights. ANTCPU ADS does not endorse any advertised products or services.' },
          { title: '7. Subscription and Billing', body: 'The Service offers a free 3-day trial followed by a paid subscription at $9.99/month. Subscriptions renew automatically unless cancelled. Refunds are handled on a case-by-case basis. Contact antcpu@gmail.com for billing inquiries.' },
          { title: '8. Promo Codes and Referrals', body: 'Promo codes are issued to registered users for referral purposes. Points earned through referrals have no cash value and cannot be transferred. ANTCPU ADS reserves the right to modify or terminate the referral program at any time.' },
          { title: '9. Intellectual Property', body: 'All platform content, design, and code is the property of ANTCPU ADS. You retain ownership of your ad content but grant ANTCPU ADS a non-exclusive license to display it within the Service.' },
          { title: '10. Limitation of Liability', body: 'ANTCPU ADS is provided "as is" without warranties of any kind. To the fullest extent permitted by law, ANTCPU ADS shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Service.' },
          { title: '11. Termination', body: 'We reserve the right to suspend or terminate your account at any time for violation of these terms. You may cancel your account at any time by contacting antcpu@gmail.com.' },
          { title: '12. Governing Law', body: 'These terms are governed by the laws of the jurisdiction in which ANTCPU ADS operates. For users outside this jurisdiction, local consumer protection laws may also apply.' },
          { title: '13. Changes to Terms', body: 'We may update these terms at any time. Continued use of the Service after changes constitutes acceptance of the new terms. We will notify users of material changes via email or platform notice.' },
          { title: '14. Contact', body: 'For questions about these terms, contact us at antcpu@gmail.com.' },
        ].map(s => (
          <div key={s.title} style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 0.5rem' }}>{s.title}</h2>
            <p style={{ fontSize: '0.88rem', color: '#444', lineHeight: 1.8, margin: 0 }}>{s.body}</p>
          </div>
        ))}

        <div style={{ borderTop: '1px solid #e5e5e5', paddingTop: '2rem', display: 'flex', gap: '1.5rem', fontSize: '0.78rem', color: '#aaa', flexWrap: 'wrap' }}>
          <span>⚡ ANTCPU ADS</span>
          <a href="/privacy" style={{ color: '#aaa', textDecoration: 'none' }}>Privacy Policy</a>
          <a href="/about" style={{ color: '#aaa', textDecoration: 'none' }}>About</a>
          <a href="mailto:antcpu@gmail.com" style={{ color: '#aaa', textDecoration: 'none' }}>Contact</a>
        </div>
      </div>
    </div>
  );
}
