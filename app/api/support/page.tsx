// app/support/page.tsx
// ─── Support page ─────────────────────────────────────────────────────────────
// Help articles first — self-serve.
// Issue picker — emoji + locale label, admin always sees English.
// Free text in any language — locale flagged in Discord + support_messages.
// No per-language translation keys needed.
// ─────────────────────────────────────────────────────────────────────────────
'use client';

import { useState, useEffect }   from 'react';
import { useRouter }             from 'next/navigation';
import ArenaNav                  from '../components/ArenaNav';
import ArenaFooter               from '../components/ArenaFooter';
import { clearSessionCookie }    from '../lib/session';
import { getStoredLocale }       from '../lib/locale';
import type { Locale }           from '../lib/i18n/index';
import { createClient }          from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Issue types — emoji-first, near-universal ────────────────────────────────
// Labels shown to user in their locale via ISSUE_LABELS map below.
// Admin always sees the English `en` value — never needs translating.

const ISSUE_TYPES = [
  { key: 'ad_not_live',    emoji: '📢', en: 'My ad is not live'     },
  { key: 'cant_login',     emoji: '🔒', en: 'Can\'t log in'         },
  { key: 'points_missing', emoji: '⚡', en: 'Points missing'        },
  { key: 'ad_rejected',    emoji: '❌', en: 'Ad was rejected'       },
  { key: 'billing',        emoji: '💳', en: 'Billing question'      },
  { key: 'other',          emoji: '💬', en: 'Something else'        },
];

// ─── Locale labels for issue types ───────────────────────────────────────────
// Inline — no translation file needed. Short enough to maintain here.
// Admin never sees these — they see the English `en` value above.

const ISSUE_LABELS: Record<string, Record<string, string>> = {
  ad_not_live:    { en: 'My ad is not live',   ar: 'إعلاني غير نشط',         zh: '我的广告未上线',    es: 'Mi anuncio no está activo', hi: 'मेरा विज्ञापन लाइव नहीं है', pt: 'Meu anúncio não está ativo', fr: 'Mon annonce n\'est pas active', it: 'Il mio annuncio non è attivo', id: 'Iklan saya tidak aktif', vi: 'Quảng cáo chưa hiển thị', tr: 'İlanım yayında değil', ko: '광고가 활성화되지 않음' },
  cant_login:     { en: 'Can\'t log in',        ar: 'لا أستطيع تسجيل الدخول', zh: '无法登录',          es: 'No puedo iniciar sesión',   hi: 'लॉगिन नहीं हो रहा',          pt: 'Não consigo entrar',          fr: 'Je ne peux pas me connecter',   it: 'Non riesco ad accedere',       id: 'Tidak bisa masuk',       vi: 'Không thể đăng nhập',    tr: 'Giriş yapamıyorum',     ko: '로그인 불가'           },
  points_missing: { en: 'Points missing',       ar: 'النقاط مفقودة',           zh: '积分丢失',          es: 'Puntos faltantes',          hi: 'पॉइंट गायब हैं',              pt: 'Pontos faltando',             fr: 'Points manquants',              it: 'Punti mancanti',               id: 'Poin hilang',            vi: 'Điểm bị thiếu',          tr: 'Puanlar eksik',         ko: '포인트 누락'           },
  ad_rejected:    { en: 'Ad was rejected',      ar: 'تم رفض إعلاني',           zh: '广告被拒绝',        es: 'Anuncio rechazado',         hi: 'विज्ञापन अस्वीकृत हुआ',       pt: 'Anúncio rejeitado',           fr: 'Annonce rejetée',               it: 'Annuncio rifiutato',           id: 'Iklan ditolak',          vi: 'Quảng cáo bị từ chối',   tr: 'İlan reddedildi',       ko: '광고 거부됨'           },
  billing:        { en: 'Billing question',     ar: 'سؤال عن الفواتير',        zh: '账单问题',          es: 'Pregunta de facturación',   hi: 'बिलिंग प्रश्न',               pt: 'Dúvida de cobrança',          fr: 'Question de facturation',       it: 'Domanda di fatturazione',      id: 'Pertanyaan tagihan',     vi: 'Câu hỏi thanh toán',     tr: 'Fatura sorusu',         ko: '결제 문의'             },
  other:          { en: 'Something else',       ar: 'شيء آخر',                 zh: '其他问题',          es: 'Otra cosa',                 hi: 'कुछ और',                      pt: 'Outra coisa',                 fr: 'Autre chose',                   it: 'Qualcos\'altro',               id: 'Lainnya',                vi: 'Vấn đề khác',            tr: 'Başka bir şey',         ko: '기타'                  },
};

// ─── Locale display — flag + name shown in Discord to admin ──────────────────
const LOCALE_META: Record<string, { flag: string; name: string }> = {
  en: { flag: '🇬🇧', name: 'English'          },
  ar: { flag: '🇸🇦', name: 'Arabic'           },
  zh: { flag: '🇨🇳', name: 'Chinese'          },
  es: { flag: '🇪🇸', name: 'Spanish'          },
  hi: { flag: '🇮🇳', name: 'Hindi'            },
  pt: { flag: '🇧🇷', name: 'Portuguese'       },
  fr: { flag: '🇫🇷', name: 'French'           },
  it: { flag: '🇮🇹', name: 'Italian'          },
  id: { flag: '🇮🇩', name: 'Bahasa Indonesia' },
  vi: { flag: '🇻🇳', name: 'Vietnamese'       },
  tr: { flag: '🇹🇷', name: 'Turkish'          },
  ko: { flag: '🇰🇷', name: 'Korean'           },
};

// ─── Help articles — self-serve first ────────────────────────────────────────
// English titles — shown as-is. Short enough to be understood cross-language.
const HELP_ARTICLES = [
  { emoji: '📢', title: 'How to create your first ad',    href: '/guide' },
  { emoji: '⚡', title: 'How points and tiers work',      href: '/guide' },
  { emoji: '↗',  title: 'How to share and earn points',   href: '/guide' },
  { emoji: '🔒', title: 'How to sign in to your account', href: '/guide' },
];

type SessionUser = {
  email: string; name: string; brand: string;
  trialStatus: string; role: string;
};

type Ad = {
  id: string; title: string; description: string;
  url: string; brand: string; email: string;
  share_count: number; points: number;
};

export default function SupportPage() {
  const router = useRouter();

  const [locale,      setLocale]      = useState<Locale>('en');
  const [user,        setUser]        = useState<SessionUser | null>(null);
  const [myAd,        setMyAd]        = useState<Ad | null>(null);
  const [step,        setStep]        = useState<'articles' | 'form' | 'sent'>('articles');
  const [issueKey,    setIssueKey]    = useState('');
  const [email,       setEmail]       = useState('');
  const [name,        setName]        = useState('');
  const [message,     setMessage]     = useState('');
  const [sending,     setSending]     = useState(false);
  const [error,       setError]       = useState('');
  const [shared,      setShared]      = useState(false);

  // ── Boot ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    setLocale(getStoredLocale());
    try {
      const stored = localStorage.getItem('arena_user');
      if (stored) {
        const u = JSON.parse(stored);
        setUser(u);
        setEmail(u.email || '');
        setName(u.name   || '');
      }
    } catch {}
  }, []);

  // ── Load user's active ad ─────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.email) return;
    supabase
      .from('ads')
      .select('id, title, description, url, brand, email, share_count, points')
      .eq('email', user.email)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => { if (data?.[0]) setMyAd(data[0]); });
  }, [user]);

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !message.trim() || !issueKey) return;
    setSending(true);
    setError('');

    // Issue type in English — always clean for admin
    const issueEn = ISSUE_TYPES.find(i => i.key === issueKey)?.en || issueKey;

    try {
      const res  = await fetch('/api/support', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name,
          subject:  issueEn,   // English — admin reads this
          message,
          locale,              // stored — admin sees flag + name
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Failed');
      setStep('sent');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong — try again.');
    }
    setSending(false);
  }

  // ── Share ─────────────────────────────────────────────────────────────────
  async function handleShare() {
    if (!myAd) return;
    const text = `${myAd.brand} — ${myAd.title}\n\n${myAd.url}\n\n→ antcpu-ads.vercel.app/arena`;
    if (navigator.share) {
      try { await navigator.share({ title: myAd.title, text, url: myAd.url }); } catch {}
    } else {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setShared(true);
    setTimeout(() => setShared(false), 2500);
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: '#111', border: '1px solid #1a1a1a',
    borderRadius: '14px', padding: '1.5rem', marginBottom: '1rem',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#0a0a0a', border: '1px solid #222',
    borderRadius: '8px', padding: '0.75rem 1rem', color: '#fff',
    fontSize: '0.88rem', outline: 'none',
    fontFamily: 'system-ui, sans-serif', boxSizing: 'border-box',
  };

  const lbl: React.CSSProperties = {
    fontSize: '0.72rem', color: '#555', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.08em',
    display: 'block', marginBottom: '0.4rem',
  };

  const btn = (bg: string, color = '#fff', border = 'none'): React.CSSProperties => ({
    background: bg, border, color, borderRadius: '8px',
    padding: '0.65rem 1.25rem', fontSize: '0.88rem',
    fontWeight: 700, cursor: 'pointer',
  });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: '#0a0a0a', color: '#fff', fontFamily: 'system-ui, sans-serif', minHeight: '100vh' }}>
      <ArenaNav
        role={(user?.role as any) || 'user'}
        userName={user?.name}
        userEmail={user?.email}
        userBrand={user?.brand}
        trialStatus={(user?.trialStatus as any) || 'trial'}
        onLogout={async () => { await clearSessionCookie(); router.push('/'); }}
      />

      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ fontWeight: 800, fontSize: '1.4rem', marginBottom: '0.4rem' }}>🆘 Support</div>
          <div style={{ fontSize: '0.82rem', color: '#555' }}>
            {LOCALE_META[locale]?.flag} {LOCALE_META[locale]?.name}
          </div>
        </div>

        {/* ── STEP 1: Help articles ── */}
        {step === 'articles' && (
          <>
            <div style={card}>
              <div style={{ fontSize: '0.68rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
                📖 Help
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {HELP_ARTICLES.map(a => (
                  <div
                    key={a.href + a.title}
                    onClick={() => router.push(a.href)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '10px', cursor: 'pointer' }}
                  >
                    <span style={{ fontSize: '1.1rem' }}>{a.emoji}</span>
                    <span style={{ fontSize: '0.85rem', color: '#ccc' }}>{a.title}</span>
                    <span style={{ marginLeft: 'auto', color: '#444' }}>→</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ textAlign: 'center', padding: '0.5rem 0 1rem' }}>
              <button
                onClick={() => setStep('form')}
                style={btn('transparent', '#555', '1px solid #333')}
              >
                Still need help? Contact us →
              </button>
            </div>
          </>
        )}

        {/* ── STEP 2: Contact form ── */}
        {step === 'form' && (
          <div style={card}>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

                {/* Issue picker */}
                <div>
                  <label style={lbl}>Issue type</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    {ISSUE_TYPES.map(issue => {
                      const label   = ISSUE_LABELS[issue.key]?.[locale] || issue.en;
                      const selected = issueKey === issue.key;
                      return (
                        <button
                          key={issue.key}
                          type="button"
                          onClick={() => setIssueKey(issue.key)}
                          style={{
                            background:   selected ? '#0070f320' : '#0a0a0a',
                            border:       `1px solid ${selected ? '#0070f3' : '#222'}`,
                            borderRadius: '10px',
                            padding:      '0.75rem',
                            cursor:       'pointer',
                            textAlign:    'left',
                            color:        selected ? '#fff' : '#888',
                            transition:   'all 0.15s',
                          }}
                        >
                          <div style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>{issue.emoji}</div>
                          <div style={{ fontSize: '0.75rem', fontWeight: selected ? 700 : 400, lineHeight: 1.3 }}>{label}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label style={lbl}>Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    style={inputStyle}
                  />
                </div>

                {/* Message — any language */}
                <div>
                  <label style={lbl}>
                    Message
                    {locale !== 'en' && (
                      <span style={{ color: '#444', fontWeight: 400, marginLeft: '0.5rem', textTransform: 'none', letterSpacing: 0 }}>
                        — write in your language
                      </span>
                    )}
                  </label>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="..."
                    required
                    rows={4}
                    style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
                  />
                </div>

                {/* Error */}
                {error && (
                  <div style={{ fontSize: '0.82rem', color: '#ef4444', background: '#ef444410', border: '1px solid #ef444430', borderRadius: '8px', padding: '0.65rem 1rem' }}>
                    {error}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="submit"
                    disabled={sending || !email.trim() || !message.trim() || !issueKey}
                    style={{
                      ...btn(sending ? '#333' : '#0070f3'),
                      opacity: sending || !email.trim() || !message.trim() || !issueKey ? 0.5 : 1,
                      cursor:  sending || !email.trim() || !message.trim() || !issueKey ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {sending ? 'Sending...' : '✉️ Send'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep('articles')}
                    style={btn('transparent', '#555', '1px solid #333')}
                  >
                    ← Back
                  </button>
                </div>

              </div>
            </form>
          </div>
        )}

        {/* ── STEP 3: Sent ── */}
        {step === 'sent' && (
          <>
            <div style={{ ...card, border: '1px solid #22c55e40', background: '#22c55e08' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>✅</div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#22c55e', marginBottom: '0.4rem' }}>
                Message sent
              </div>
              <div style={{ fontSize: '0.82rem', color: '#888', lineHeight: 1.6 }}>
                We'll get back to you at <span style={{ color: '#fff' }}>{email}</span>.
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
                <button onClick={() => router.push('/dashboard/user')} style={btn('#0070f3')}>
                  ← Dashboard
                </button>
                <button onClick={() => router.push('/arena')} style={btn('transparent', '#555', '1px solid #333')}>
                  🏟 Arena
                </button>
              </div>
            </div>

            {/* Share CTA */}
            {myAd && (
              <div style={{ ...card, border: '1px solid #f0883e40', background: '#f0883e08' }}>
                <div style={{ fontSize: '0.68rem', color: '#f0883e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
                  ⚡ While you're here
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.25rem' }}>{myAd.title}</div>
                <div style={{ fontSize: '0.72rem', color: '#555', marginBottom: '1rem' }}>
                  ↗ {myAd.share_count || 0} shares · ⚡ {myAd.points || 0} pts
                </div>
                <button onClick={handleShare} style={btn(shared ? '#22c55e' : '#f0883e', '#000')}>
                  {shared ? '✅ Shared!' : '↗ Share My Ad — Earn Points'}
                </button>
              </div>
            )}

            {!myAd && (
              <div style={{ ...card, border: '1px solid #0070f340', background: '#0070f308' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.4rem' }}>📢 No active ad yet</div>
                <div style={{ fontSize: '0.78rem', color: '#888', marginBottom: '1rem' }}>Create your first ad and get it in front of the Arena.</div>
                <button onClick={() => router.push('/create-ad')} style={btn('#0070f3')}>Create Ad →</button>
              </div>
            )}
          </>
        )}

        <button
          onClick={() => router.push('/dashboard/user')}
          style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '0.78rem', padding: 0, marginTop: '0.5rem', display: 'block' }}
        >
          ← Back to Dashboard
        </button>

      </div>
      <ArenaFooter />
    </div>
  );
}
