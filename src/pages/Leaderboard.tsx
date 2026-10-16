import { useEffect, useMemo, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { LeaderboardEntry } from '../lib/types'
import { TRACK_LABEL, TRACK_POOL_SIZE } from '../lib/cases'

export function Leaderboard() {
  const [rows, setRows] = useState<LeaderboardEntry[]>([])

  const load = async () => {
    if (!isSupabaseConfigured) {
      setRows([])
      return
    }

    try {
      const { data, error } = await supabase
        .from('leaderboard_public')
        .select('*')
        .order('cases_solved', { ascending: false })
        .order('score', { ascending: false })
        .order('completion_time', { ascending: true, nullsFirst: false })
        .order('updated_at', { ascending: true })
        .order('team_name', { ascending: true })

      if (error || !data) {
        setRows([])
        return
      }
      setRows(data as LeaderboardEntry[])
    } catch {
      setRows([])
    }
  }

  useEffect(() => {
    load()
    if (!isSupabaseConfigured) return
    const ch = supabase
      .channel('leaderboard-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'results' },
        () => load(),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [])

  // Guarantee exactly 7 row slots matching the reference image layout
  const displayRows = useMemo(() => {
    const totalSlots = Math.max(7, rows.length)
    const list: (LeaderboardEntry | null)[] = []
    for (let i = 0; i < totalSlots; i++) {
      list.push(rows[i] || null)
    }
    return list
  }, [rows])

  return (
    <div className="relative min-h-screen w-full bg-[#02050f] text-white flex flex-col items-center justify-center overflow-x-hidden select-none py-4 font-sans">
      {/* ────── BACKGROUND ARENA & ATMOSPHERIC LIGHTING ────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Deep arena gradient */}
        <div className="absolute inset-0 bg-radial-[circle_at_50%_35%] from-[#061432]/45 via-[#02050f] to-[#010206]" />

        {/* Vertical bokeh light pillars matching reference */}
        {/* Left gold pillar behind Medal 1 */}
        <div className="absolute left-[6%] top-0 bottom-0 w-48 bg-gradient-to-b from-amber-500/22 via-amber-500/8 to-amber-500/25 blur-3xl" />
        {/* Center blue/cyan background beams */}
        <div className="absolute left-[26%] top-0 bottom-0 w-24 bg-gradient-to-b from-cyan-500/18 via-blue-500/5 to-transparent blur-2xl" />
        <div className="absolute right-[28%] top-0 bottom-0 w-24 bg-gradient-to-b from-cyan-500/18 via-blue-500/5 to-transparent blur-2xl" />
        {/* Right copper/orange pillar behind Medal 3 */}
        <div className="absolute right-[4%] top-0 bottom-0 w-48 bg-gradient-to-b from-orange-500/22 via-orange-500/8 to-orange-500/25 blur-3xl" />

        {/* Ambient cyber particle / circuit grid texture */}
        <div
          className="absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(0, 240, 255, 0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 240, 255, 0.12) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            maskImage: 'radial-gradient(ellipse at 50% 45%, black 45%, transparent 85%)',
          }}
        />

        {/* Ambient top dark vignette */}
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-black/95 to-transparent" />
      </div>

      {/* ────── MAIN STAGE CONTENT (1600x900 PROPORTIONS) ────── */}
      <div className="relative w-full max-w-[1440px] mx-auto px-4 z-10 flex flex-col items-center">
        {/* ── SUSPENDED MEDALS (EXACT REFERENCE POSITIONING) ── */}

        {/* Medal #1: Gold (Upper Left, aligned with Header/Table top) */}
        <div className="hidden lg:block absolute left-4 xl:left-8 top-0 z-30 pointer-events-none">
          <OrbitalMedal
            rank={1}
            tier="gold"
            number="1"
            orbitAngle={-28}
            ribbonLength={90}
          />
        </div>

        {/* Medal #2: Silver (Upper Right, placed higher above table corner) */}
        <div className="hidden lg:block absolute right-[80px] xl:right-[110px] -top-6 z-30 pointer-events-none">
          <OrbitalMedal
            rank={2}
            tier="silver"
            number="2"
            orbitAngle={-24}
            ribbonLength={75}
          />
        </div>

        {/* Medal #3: Bronze (Far Right, lower beside rows 2-5) */}
        <div className="hidden lg:block absolute right-2 xl:right-6 top-[220px] z-30 pointer-events-none">
          <OrbitalMedal
            rank={3}
            tier="bronze"
            number="3"
            orbitAngle={26}
            ribbonLength={85}
          />
        </div>

        {/* ── TOP HEADER: CYBER HUD BANNER WITH TROPHY ── */}
        <div className="relative w-full max-w-[700px] flex flex-col items-center mb-3">
          {/* Top Notch Peak with Trophy Cup */}
          <div className="relative flex items-center justify-center gap-3 mb-1">
            {/* Left Bracket Line with Dot & Tick */}
            <div className="flex items-center gap-1.5">
              <div className="w-24 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 to-[#00f0ff]" />
              <div className="w-2.5 h-[2px] bg-[#00f0ff]" />
              <div className="w-1.5 h-1.5 rounded-full bg-[#00f0ff] shadow-[0_0_8px_#00f0ff]" />
            </div>

            {/* Glowing Trophy Cup Icon with Embossed Star */}
            <div className="relative drop-shadow-[0_0_20px_rgba(0,240,255,0.95)]">
              <svg width="44" height="42" viewBox="0 0 44 42" fill="none">
                {/* Trophy Handles */}
                <path
                  d="M10 9H6C4.8 9 3.8 10 3.8 11.2V15C3.8 19.8 7.6 23.6 12.4 23.6H13.2M34 9H38C39.2 9 40.2 10 40.2 11.2V15C40.2 19.8 36.4 23.6 31.6 23.6H30.8"
                  stroke="#38bdf8"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
                {/* Trophy Body */}
                <path
                  d="M11.5 7H32.5V19C32.5 24.8 27.8 29.5 22 29.5C16.2 29.5 11.5 24.8 11.5 19V7Z"
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                  fill="rgba(3, 16, 38, 0.95)"
                />
                {/* Star on Trophy */}
                <polygon
                  points="22,11.5 23.9,15.5 28.2,16.1 25.1,19.1 25.8,23.3 22,21.3 18.2,23.3 18.9,19.1 15.8,16.1 20.1,15.5"
                  fill="#ffffff"
                  stroke="#38bdf8"
                  strokeWidth="0.6"
                />
                {/* Trophy Base */}
                <path d="M22 29.5V34.5" stroke="#38bdf8" strokeWidth="2.8" />
                <path d="M14 36.5H30" stroke="#38bdf8" strokeWidth="3.2" strokeLinecap="round" />
              </svg>
            </div>

            {/* Right Bracket Line with Dot & Tick */}
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00f0ff] shadow-[0_0_8px_#00f0ff]" />
              <div className="w-2.5 h-[2px] bg-[#00f0ff]" />
              <div className="w-24 h-[2px] bg-gradient-to-l from-transparent via-cyan-400/50 to-[#00f0ff]" />
            </div>
          </div>

          {/* Stepped Cyber Banner Housing "LEADERBOARD" */}
          <div
            className="relative w-full py-2.5 px-10 text-center flex items-center justify-center"
            style={{
              background:
                'linear-gradient(180deg, rgba(6, 24, 56, 0.96) 0%, rgba(2, 9, 22, 0.98) 100%)',
              clipPath:
                'polygon(7% 0%, 93% 0%, 100% 32%, 95% 100%, 5% 100%, 0% 32%)',
              border: '2px solid rgba(56, 189, 248, 0.95)',
              boxShadow:
                '0 0 32px rgba(0, 240, 255, 0.6), inset 0 0 25px rgba(0, 240, 255, 0.28)',
            }}
          >
            {/* Inner Cyber Glow Rim */}
            <div
              className="absolute inset-1 pointer-events-none"
              style={{
                border: '1px solid rgba(56, 189, 248, 0.45)',
                clipPath:
                  'polygon(7% 0%, 93% 0%, 99% 32%, 94% 98%, 6% 98%, 1% 32%)',
              }}
            />

            {/* All-Caps Glowing Title (Orbitron Font) */}
            <h1
              className="font-display font-black text-3xl sm:text-4xl md:text-[44px] tracking-[0.16em] uppercase relative z-10"
              style={{
                fontFamily: "'Orbitron', sans-serif",
                color: '#ffffff',
                textShadow:
                  '0 0 10px rgba(255, 255, 255, 0.9), 0 0 22px rgba(56, 189, 248, 0.95), 0 0 45px rgba(0, 240, 255, 0.8)',
              }}
            >
              LEADERBOARD
            </h1>
          </div>

          {/* Horizontal Accent Line under Banner with Center Glow */}
          <div className="w-[85%] h-[2px] bg-gradient-to-r from-transparent via-cyan-400/90 to-transparent mt-2 shadow-[0_0_12px_#00f0ff]" />
        </div>

        {/* ── MAIN CONSOLE TABLE: SCI-FI HUD FRAME ── */}
        <div className="relative w-full max-w-[1020px]">
          {/* Cyber HUD Table Box */}
          <div
            className="relative w-full rounded-2xl border-2 border-[#00d4ff]/85 bg-[#030919]/92 backdrop-blur-xl shadow-[0_0_35px_rgba(0,212,255,0.28),inset_0_0_30px_rgba(0,212,255,0.06)] overflow-hidden"
            style={{
              clipPath:
                'polygon(0 14px, 14px 0, calc(100% - 14px) 0, 100% 14px, 100% calc(100% - 14px), calc(100% - 14px) 100%, 14px 100%, 0 calc(100% - 14px))',
            }}
          >
            {/* Tech Corner Markings (// 01 and 02 //) */}
            <div className="absolute top-1.5 left-3 text-[#38bdf8]/75 text-[9px] font-mono tracking-widest select-none pointer-events-none">
              // 01
            </div>
            <div className="absolute top-1.5 right-3 text-[#38bdf8]/75 text-[9px] font-mono tracking-widest select-none pointer-events-none">
              02 //
            </div>

            {/* Table Container (Fixed Column Widths Spread Across Full Table).
                Allow horizontal scroll on sub-520px viewports so columns stay
                legible rather than squeezing to nothing. */}
            <div className="w-full overflow-x-auto">
              <table className="w-full table-fixed border-collapse text-left min-w-[520px]">
                {/* Column Headers */}
                <thead>
                  <tr className="border-b border-cyan-400/35 bg-cyan-950/25 text-[#38bdf8] font-mono font-bold text-[10px] sm:text-[12px] tracking-[0.08em] sm:tracking-[0.12em] uppercase">
                    <th className="py-3 px-2 w-[11%] text-center">RANK</th>
                    <th className="py-3 px-2 sm:px-4 w-[24%] text-center">TEAM</th>
                    <th className="py-3 px-2 sm:px-3 w-[18%] text-center">TRACK</th>
                    <th className="py-3 px-2 sm:px-3 w-[16%] text-center">CASES</th>
                    <th className="py-3 px-2 sm:px-3 w-[14%] text-center">SCORE</th>
                    <th className="py-3 px-2 sm:px-4 w-[17%] text-center">TIME</th>
                  </tr>
                </thead>

                {/* Table Data Rows (7 Guaranteed Slots) */}
                <tbody>
                  {displayRows.map((entry, index) => {
                    const rank = index + 1
                    return (
                      <tr
                        key={entry?.id || `slot-${rank}`}
                        className="border-b border-cyan-500/10 hover:bg-cyan-500/[0.04] transition-colors h-[46px]"
                      >
                        {/* 1. RANK: Hexagonal Cyber Badge */}
                        <td className="py-2 px-2 text-center">
                          <div className="flex justify-center">
                            <HexRankBadge rank={rank} />
                          </div>
                        </td>

                        {/* 2. TEAM NAME */}
                        <td className="py-2 px-4 text-center font-display font-bold text-white text-xs sm:text-sm tracking-wide truncate">
                          {entry?.team_name ? (
                            <span>{entry.team_name}</span>
                          ) : (
                            <span className="text-slate-500/70 font-mono text-sm">—</span>
                          )}
                        </td>

                        {/* 3. TRACK */}
                        <td className="py-2 px-3 text-center font-mono text-xs text-cyan-300 truncate">
                          {entry?.track ? (
                            <span>{TRACK_LABEL[entry.track]}</span>
                          ) : (
                            <span className="text-slate-500/70 font-mono text-sm">—</span>
                          )}
                        </td>

                        {/* 4. CASES SOLVED — denominator is the team's own
                             pool size (junior: 5 easy, senior: 2 hard). */}
                        <td className="py-2 px-3 text-center font-mono font-bold text-xs text-cyan-400">
                          {entry ? (
                            <span>
                              {entry.cases_solved} / {TRACK_POOL_SIZE[entry.track]}
                            </span>
                          ) : (
                            <span className="text-slate-500/70 font-mono text-sm">—</span>
                          )}
                        </td>

                        {/* 5. SCORE */}
                        <td className="py-2 px-3 text-center font-mono font-bold text-xs text-cyan-300">
                          {entry ? (
                            <span>{entry.score}</span>
                          ) : (
                            <span className="text-slate-500/70 font-mono text-sm">—</span>
                          )}
                        </td>

                        {/* 6. COMPLETION TIME */}
                        <td className="py-2 px-4 text-center font-mono text-xs text-slate-300">
                          {entry?.completion_time ? (
                            <span>{formatTime(entry.completion_time)}</span>
                          ) : (
                            <span className="text-slate-500/70 font-mono text-sm">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Under-table Bright Cyan Glow Bar */}
          <div className="w-full h-[3px] bg-gradient-to-r from-transparent via-[#00f0ff] to-transparent shadow-[0_0_18px_#00f0ff] -mt-[1px]" />
        </div>

        {/* Ranking rubric — visible so teams know exactly how they're graded */}
        <div className="relative w-full max-w-[1020px] mt-6 px-2 sm:px-4">
          <div className="rounded-lg border border-cyan-500/30 bg-cyan-950/20 px-4 py-3 sm:px-5 sm:py-4">
            <div className="font-mono text-[0.55rem] sm:text-[0.6rem] tracking-[0.3em] uppercase text-cyan-300 mb-2 text-center">
              // Ranking rubric
            </div>
            <ol className="flex flex-wrap justify-center items-center gap-x-3 sm:gap-x-5 gap-y-2 text-[11px] sm:text-xs text-slate-200">
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full border border-cyan-400 text-cyan-300 font-mono text-[10px] grid place-items-center">
                  1
                </span>
                <span>More cases solved</span>
              </li>
              <li className="text-slate-600 hidden sm:inline">→</li>
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full border border-cyan-400 text-cyan-300 font-mono text-[10px] grid place-items-center">
                  2
                </span>
                <span>Higher report score</span>
              </li>
              <li className="text-slate-600 hidden sm:inline">→</li>
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full border border-cyan-400 text-cyan-300 font-mono text-[10px] grid place-items-center">
                  3
                </span>
                <span>Submitted earliest</span>
              </li>
            </ol>
          </div>
        </div>

        {/* ── BOTTOM STAGE: PERSPECTIVE CYBER DAIS & REFLECTIONS ── */}
        <div className="relative w-full max-w-[960px] flex flex-col items-center pointer-events-none -mt-3">
          {/* Concentric 3D Holographic Dais Rings — fluid widths so they
              never cause horizontal overflow on narrow viewports. */}
          <div className="relative w-full max-w-[760px] h-[60px] flex items-center justify-center">
            {/* Outer Elliptical Neon Ring */}
            <div
              className="absolute w-[95%] h-[32px] rounded-[50%] border-2 border-cyan-400/90 bg-cyan-400/10"
              style={{
                boxShadow:
                  '0 0 28px rgba(0, 240, 255, 0.8), inset 0 0 20px rgba(0, 240, 255, 0.5)',
              }}
            />
            {/* Inner Concentric Neon Ring */}
            <div
              className="absolute w-[74%] h-[20px] rounded-[50%] border border-cyan-300/80"
              style={{
                boxShadow: '0 0 16px rgba(56, 189, 248, 0.75)',
              }}
            />
            {/* Center Glowing Pool */}
            <div className="w-[55%] h-[10px] rounded-[50%] bg-cyan-400/40 blur-md" />
          </div>

          {/* Glossy Floor Vertical Light Streak Reflections */}
          <div className="w-full flex justify-between px-6 sm:px-16 -mt-3">
            {/* Gold streak on left */}
            <div className="w-20 sm:w-40 h-14 bg-gradient-to-b from-amber-500/40 via-amber-500/15 to-transparent blur-xl" />
            {/* Cyan streak in center */}
            <div className="w-32 sm:w-72 h-18 bg-gradient-to-b from-cyan-400/55 via-cyan-400/20 to-transparent blur-xl" />
            {/* Copper/orange streak on right */}
            <div className="w-20 sm:w-40 h-14 bg-gradient-to-b from-orange-500/40 via-orange-500/15 to-transparent blur-xl" />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
 * HEXAGONAL RANK BADGES (RANKS 1 TO 7+)
 * ────────────────────────────────────────────────────────────────────────── */

function HexRankBadge({ rank }: { rank: number }) {
  const colors = {
    1: {
      stroke: '#facc15',
      fill: 'rgba(250, 204, 21, 0.15)',
      text: '#fde047',
      glow: '0 0 10px rgba(250, 204, 21, 0.95)',
    },
    2: {
      stroke: '#38bdf8',
      fill: 'rgba(56, 189, 248, 0.15)',
      text: '#7dd3fc',
      glow: '0 0 10px rgba(56, 189, 248, 0.95)',
    },
    3: {
      stroke: '#f97316',
      fill: 'rgba(249, 115, 22, 0.15)',
      text: '#fdba74',
      glow: '0 0 10px rgba(249, 115, 22, 0.95)',
    },
  }[rank] || {
    stroke: 'rgba(56, 189, 248, 0.45)',
    fill: 'rgba(4, 14, 30, 0.8)',
    text: '#94a3b8',
    glow: '0 0 5px rgba(56, 189, 248, 0.25)',
  }

  return (
    <div className="relative w-7 h-8 flex items-center justify-center">
      <svg width="26" height="30" viewBox="0 0 28 32" className="absolute inset-0">
        <polygon
          points="14,1 26,7.5 26,24.5 14,31 2,24.5 2,7.5"
          stroke={colors.stroke}
          strokeWidth="1.8"
          fill={colors.fill}
        />
      </svg>
      <span
        className="font-display font-black text-xs relative z-10"
        style={{
          fontFamily: "'Orbitron', sans-serif",
          color: colors.text,
          textShadow: colors.glow,
        }}
      >
        {rank}
      </span>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
 * 3D ORBITAL SUSPENDED MEDALS (GOLD, SILVER, BRONZE)
 * ────────────────────────────────────────────────────────────────────────── */

interface OrbitalMedalProps {
  rank: 1 | 2 | 3
  tier: 'gold' | 'silver' | 'bronze'
  number: string
  orbitAngle: number
  ribbonLength: number
}

function OrbitalMedal({
  rank,
  tier,
  number,
  orbitAngle,
  ribbonLength,
}: OrbitalMedalProps) {
  const meta = {
    gold: {
      glow: 'rgba(250, 204, 21, 0.88)',
      rimColor: '#fbbf24',
      sparkleColor: '#fef08a',
      grad: ['#fffbeb', '#fef08a', '#f59e0b', '#b45309', '#78350f'],
      numeralColor: '#78350f',
      ribbonBorder: '#eab308',
      size: 132,
    },
    silver: {
      glow: 'rgba(56, 189, 248, 0.88)',
      rimColor: '#38bdf8',
      sparkleColor: '#e0f2fe',
      grad: ['#ffffff', '#f1f5f9', '#94a3b8', '#475569', '#1e293b'],
      numeralColor: '#1e293b',
      ribbonBorder: '#38bdf8',
      size: 120,
    },
    bronze: {
      glow: 'rgba(249, 115, 22, 0.88)',
      rimColor: '#f97316',
      sparkleColor: '#ffedd5',
      grad: ['#fff7ed', '#fed7aa', '#ea580c', '#9a3412', '#451a03'],
      numeralColor: '#451a03',
      ribbonBorder: '#ea580c',
      size: 120,
    },
  }[tier]

  return (
    <div className="relative flex flex-col items-center select-none">
      {/* ── Dark Hanging Ribbon with Metallic Border Piping ── */}
      <div
        className="w-20 -mb-4 overflow-hidden z-10 flex justify-center"
        style={{ height: `${ribbonLength}px` }}
      >
        <svg viewBox="0 0 80 120" className="w-full h-full drop-shadow-xl">
          {/* Left Ribbon Strap */}
          <polygon points="16,0 36,0 44,95 24,95" fill="#060913" />
          <polygon points="18,0 22,0 30,95 26,95" fill={meta.ribbonBorder} />
          {/* Right Ribbon Strap */}
          <polygon points="44,0 64,0 56,95 36,95" fill="#060913" />
          <polygon points="58,0 62,0 54,95 50,95" fill={meta.ribbonBorder} />
          {/* Metallic Clasp */}
          <polygon
            points="22,93 58,93 40,112"
            fill="#475569"
            stroke="#94a3b8"
            strokeWidth="1.6"
          />
          <polygon points="28,95 52,95 40,107" fill="#0f172a" />
          <circle cx="40" cy="113" r="3" fill="#cbd5e1" />
        </svg>
      </div>

      {/* ── Medal with 3D Swirling Orbital Rings ── */}
      <div className="relative flex items-center justify-center">
        {/* Swirling 3D Orbital Light Ring */}
        <div
          className="absolute w-[220px] h-[98px] rounded-full pointer-events-none"
          style={{
            border: `2.2px solid ${meta.rimColor}`,
            boxShadow: `0 0 24px ${meta.rimColor}, inset 0 0 16px ${meta.rimColor}`,
            transform: `rotate(${orbitAngle}deg)`,
            opacity: 0.92,
          }}
        >
          {/* Orbit Sparkles */}
          <div
            className="absolute top-1 left-9 w-2 h-2 rounded-full"
            style={{
              background: meta.sparkleColor,
              boxShadow: `0 0 8px ${meta.sparkleColor}, 0 0 16px ${meta.rimColor}`,
            }}
          />
          <div
            className="absolute bottom-2 right-12 w-2.5 h-2.5 rounded-full"
            style={{
              background: meta.sparkleColor,
              boxShadow: `0 0 10px ${meta.sparkleColor}, 0 0 20px ${meta.rimColor}`,
            }}
          />
          <div
            className="absolute top-10 right-2 w-1.5 h-1.5 rounded-full"
            style={{
              background: '#ffffff',
              boxShadow: `0 0 6px #ffffff`,
            }}
          />
        </div>

        {/* Soft Radial Ambient Glow Aura */}
        <div
          className="absolute w-44 h-44 rounded-full blur-2xl pointer-events-none opacity-85"
          style={{ background: meta.glow }}
        />

        {/* ── 3D Embossed Metallic Medallion ── */}
        <div
          className="relative z-10"
          style={{ filter: `drop-shadow(0 0 26px ${meta.glow})` }}
        >
          <svg width={meta.size} height={meta.size} viewBox="0 0 100 100">
            <defs>
              <radialGradient id={`medalGrad_${rank}`} cx="32%" cy="28%" r="72%">
                <stop offset="0%" stopColor={meta.grad[0]} />
                <stop offset="25%" stopColor={meta.grad[1]} />
                <stop offset="60%" stopColor={meta.grad[2]} />
                <stop offset="85%" stopColor={meta.grad[3]} />
                <stop offset="100%" stopColor={meta.grad[4]} />
              </radialGradient>
              <filter id={`embossEffect_${rank}`}>
                <feDropShadow
                  dx="0"
                  dy="1.8"
                  stdDeviation="0.6"
                  floodColor="#ffffff"
                  floodOpacity="0.75"
                />
                <feDropShadow
                  dx="0"
                  dy="-1.8"
                  stdDeviation="0.6"
                  floodColor="#000000"
                  floodOpacity="0.7"
                />
              </filter>
            </defs>

            {/* Outer Beveled Metallic Rim */}
            <circle
              cx="50"
              cy="50"
              r="48"
              fill={`url(#medalGrad_${rank})`}
              stroke="#ffffff"
              strokeWidth="1.2"
              strokeOpacity="0.6"
            />
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke="#000000"
              strokeWidth="1.5"
              strokeOpacity="0.4"
              strokeDasharray="2.5,2.5"
            />
            <circle cx="50" cy="50" r="41" fill={`url(#medalGrad_${rank})`} />

            {/* Embossed Laurel Wreath */}
            <path
              d="M 28 70 C 18 56, 18 36, 30 24 C 32 28, 36 32, 33 40 C 26 50, 30 62, 32 68 Z"
              fill="#ffffff"
              fillOpacity="0.45"
            />
            <path
              d="M 72 70 C 82 56, 82 36, 70 24 C 68 28, 64 32, 67 40 C 74 50, 70 62, 68 68 Z"
              fill="#ffffff"
              fillOpacity="0.45"
            />

            {/* Star Above Numeral for Medals 2 and 3 */}
            {rank !== 1 && (
              <polygon
                points="50,21 52.2,25.5 56.5,25.5 53,28 54.5,32.5 50,29.8 45.5,32.5 47,28 43.5,25.5 47.8,25.5"
                fill="#ffffff"
                fillOpacity="0.85"
              />
            )}

            {/* Bold 3D Numeral */}
            <text
              x="50"
              y={rank === 1 ? '63' : '65'}
              textAnchor="middle"
              fontFamily="'Orbitron', sans-serif"
              fontWeight="900"
              fontSize={rank === 1 ? '40' : '36'}
              fill={meta.numeralColor}
              filter={`url(#embossEffect_${rank})`}
            >
              {number}
            </text>
          </svg>
        </div>
      </div>
    </div>
  )
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(iso.trim())) return iso.trim()
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const h = String(d.getUTCHours()).padStart(2, '0')
  const m = String(d.getUTCMinutes()).padStart(2, '0')
  const s = String(d.getUTCSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
}
