import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { notFound } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const NODE_MAP: Record<string, { name: string; color: string; emoji: string }> = {
  'node-1': { name: 'Alpha',  color: '#ff4d00', emoji: '🔴' },
  'node-2': { name: 'Beta',   color: '#00d4ff', emoji: '🔵' },
  'node-3': { name: 'Gamma',  color: '#ffd700', emoji: '🟡' },
  'node-4': { name: 'Delta',  color: '#00ff88', emoji: '🟢' },
}

export async function generateMetadata({ params }: { params: Promise<{ node: string }> }) {
  const { node: nodeParam } = await params
  const n = NODE_MAP[nodeParam]
  if (!n) return { title: 'Squad — antcpu' }
  return {
    title: `${n.emoji} Node ${nodeParam.split('-')[1].toUpperCase()} — ${n.name} Squad · antcpu`,
    description: `Meet the ${n.name} node team in the antcpu internship challenge.`,
  }
}

export default async function SquadPage({ params }: { params: Promise<{ node: string }> }) {
  const { node: nodeParam } = await params
  const node = NODE_MAP[nodeParam]
  if (!node) notFound()

  const { data: members, error } = await supabase
    .from('challengers')
    .select('handle, name, initials, track, country, progress_pct, role_title, is_captain, flag')
    .eq('team_id', nodeParam)
    .eq('status', 'active')
    .order('is_captain', { ascending: false })
    .order('progress_pct', { ascending: false })

  if (error || !members) notFound()

  const nodeNum = nodeParam.split('-')[1].toUpperCase()
  const marketers = members.filter(m => m.track === 'marketing')
  const devs      = members.filter(m => m.track === 'dev')

  return (
    <main
      className="min-h-screen py-10 px-4"
      style={{ background: '#0a0a0a', color: '#f0f0f0', fontFamily: 'monospace' }}
    >
      {/* Header */}
      <div className="max-w-xl mx-auto mb-8">
        <Link
          href="/"
          className="text-xs opacity-40 hover:opacity-70 transition-opacity mb-6 block"
          style={{ color: node.color }}
        >
          ← antcpu Arena
        </Link>

        <div
          className="rounded-xl p-6"
          style={{ border: `1px solid ${node.color}44`, background: `${node.color}08` }}
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">{node.emoji}</span>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest opacity-50">
                Node {nodeNum}
              </p>
              <h1 className="text-2xl font-black tracking-tight" style={{ color: node.color }}>
                {node.name.toUpperCase()}
              </h1>
            </div>
          </div>
          <div className="flex gap-4 mt-3 text-xs opacity-60">
            <span>👥 {members.length} members</span>
            <span>💻 {devs.length} devs</span>
            <span>📣 {marketers.length} marketers</span>
          </div>
        </div>
      </div>

      {/* Member list */}
      <div className="max-w-xl mx-auto space-y-3">
        {members.map((m) => (
          <Link
            key={m.handle}
            href={`/office/${m.handle}`}
            className="block rounded-lg p-4 transition-opacity hover:opacity-80"
            style={{
              border: `1px solid ${m.is_captain ? node.color : '#ffffff18'}`,
              background: m.is_captain ? `${node.color}10` : 'rgba(255,255,255,0.02)',
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div
                className="rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
                style={{
                  width: 40, height: 40,
                  background: m.is_captain ? node.color : `${node.color}33`,
                  color: m.is_captain ? '#000' : node.color,
                }}
              >
                {m.initials ?? m.name?.slice(0, 2).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm">{m.name}</span>
                  {m.is_captain && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded font-bold"
                      style={{ background: node.color, color: '#000' }}
                    >
                      👑 Captain
                    </span>
                  )}
                  <span className="text-xs opacity-50">
                    {m.track === 'marketing' ? '📣' : '💻'} {m.flag ?? ''} {m.country}
                  </span>
                </div>
                <p className="text-xs opacity-40 mt-0.5">{m.role_title}</p>
              </div>

              {/* Progress */}
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold" style={{ color: node.color }}>
                  {m.progress_pct}%
                </p>
                <div
                  className="rounded-full mt-1"
                  style={{ width: 48, height: 4, background: '#ffffff18' }}
                >
                  <div
                    className="rounded-full h-full"
                    style={{ width: `${m.progress_pct}%`, background: node.color }}
                  />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Footer nav — all nodes */}
      <div className="max-w-xl mx-auto mt-10">
        <p className="text-xs opacity-30 mb-3 text-center uppercase tracking-widest">All Nodes</p>
        <div className="flex gap-2 justify-center flex-wrap">
          {Object.entries(NODE_MAP).map(([key, n]) => (
            <Link
              key={key}
              href={`/squad/${key}`}
              className="text-xs px-3 py-1.5 rounded font-bold transition-opacity hover:opacity-80"
              style={{
                background: key === nodeParam ? n.color : `${n.color}22`,
                color: key === nodeParam ? '#000' : n.color,
                border: `1px solid ${n.color}44`,
                textDecoration: 'none',
              }}
            >
              {n.emoji} {n.name}
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
