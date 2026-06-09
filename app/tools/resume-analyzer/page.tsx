'use client'

import { Suspense, useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import {
  FreeMeter,
  GeneratingCard,
  LockedItem,
  ScoreRing,
  ToolHero,
  ToolPaywall,
  ToolTopBar,
  useToolRun
} from '@/components/tools/ToolKit'
import { useT } from '@/lib/i18n/LocaleProvider'
import type { ResumeAnalysis } from '@/lib/server/toolGeneration'

const SAMPLE_RESUME = `MAYA PATEL — Toronto, ON · maya@email.com · portfolio link

EXPERIENCE
Sales Associate, Retail Co (2024–2026)
- Responsible for handling customer transactions and resolving issues.
- Helped with store displays and inventory counts.

Treasurer, Campus Business Club (2025)
- Responsible for the club budget and reimbursements.

EDUCATION
Bachelor of Commerce (in progress), expected 2027

SKILLS
Excel, customer service, teamwork, communication`

function findingIcon(type: 'good' | 'improve') {
  if (type === 'good') return { name: 'checkCircle', color: 'var(--success)', bg: 'var(--success-light)' }
  return { name: 'lightbulb', color: 'var(--warning)', bg: 'var(--warning-light)' }
}

function ResumeAnalyzerInner() {
  const t = useT()
  const { stage, setStage, result, isPro, usesRemaining, error, locked, run, signedIn } =
    useToolRun<ResumeAnalysis>('resume-analyzer')
  const [text, setText] = useState('')
  const [targetRole, setTargetRole] = useState('')
  const analysisLabel = t('résumé analysis', "l'analyse de CV")

  const a = result
  const freeFindings = a ? a.findings.slice(0, 2) : []
  const lockedFindings = a ? a.findings.slice(2) : []
  const visibleFindings = isPro ? a?.findings ?? [] : freeFindings

  return (
    <div className="proto" style={{ minHeight: '100vh', background: 'var(--bg-secondary)', paddingBottom: 60 }}>
      <ToolTopBar />
      <div className="wrap wrap-tool" style={{ paddingTop: 40 }}>
        <ToolHero
          icon="award"
          badge={t('Résumé Analyzer', 'Analyseur de CV')}
          title={t('See your résumé the way a recruiter does', 'Voyez votre CV comme un recruteur')}
          sub={t(
            'Paste your résumé and get an honest score, the keywords you’re missing, and the exact lines to rewrite.',
            'Collez votre CV et obtenez un score honnête, les mots-clés manquants et les lignes exactes à réécrire.'
          )}
        />

        {stage === 'input' && (
          <div className="card anim-up" style={{ marginTop: 28, padding: 'clamp(20px,4vw,30px)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <span className="label">{t('Target role (optional)', 'Rôle cible (optionnel)')}</span>
                <input
                  className="field"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder={t('e.g. Junior Data Analyst', 'p. ex. Analyste de données junior')}
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
              <span className="label" style={{ marginBottom: 0 }}>{t('Paste your résumé text', 'Collez le texte de votre CV')}</span>
              <button
                onClick={() => setText(SAMPLE_RESUME)}
                style={{ background: 'none', border: 'none', padding: 0, color: 'var(--accent)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
              >
                {t('Use a sample', 'Utiliser un exemple')}
              </button>
            </div>
            <textarea
              className="field"
              rows={10}
              style={{ resize: 'vertical', fontSize: 14, lineHeight: 1.6 }}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('Paste the full text of your résumé here…', 'Collez le texte complet de votre CV ici…')}
            />
            {error && (
              <p className="mt-3 rounded-md border border-error bg-error-light px-3 py-2 text-sm text-error">{error}</p>
            )}
            {locked && <div style={{ marginTop: 14 }}><ToolPaywall count={1} label={analysisLabel} /></div>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                disabled={text.trim().length < 30}
                onClick={() => run({ resumeText: text, targetRole })}
              >
                <Icon name="zap" size={17} /> {signedIn ? t('Analyze my résumé', 'Analyser mon CV') : t('Sign in to analyze', 'Connectez-vous pour analyser')}
              </button>
              <span style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>
                {isPro ? t('Pro · unlimited runs', 'Pro · essais illimités') : t('Honest score · preview results', 'Score honnête · aperçu des résultats')}
              </span>
            </div>
          </div>
        )}

        {stage === 'loading' && (
          <GeneratingCard
            title={t('Reading your résumé…', 'Lecture de votre CV…')}
            detail={t('Scoring impact, scanning for keywords, checking ATS formatting.', "Évaluation de l'impact, recherche de mots-clés, vérification du format ATS.")}
          />
        )}

        {stage === 'result' && a && (
          <div className="anim-up" style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
            {!isPro && <FreeMeter usesRemaining={usesRemaining} />}

            <div className="card" style={{ padding: 24, display: 'flex', gap: 22, alignItems: 'center', flexWrap: 'wrap' }}>
              <ScoreRing value={a.score} color={a.score >= 75 ? 'var(--success)' : 'var(--warning)'} />
              <div style={{ flex: 1, minWidth: 220 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{t('Résumé score', 'Score du CV')}</p>
                <h2 style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{a.band}</h2>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.6 }}>{a.summary}</p>
              </div>
            </div>

            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>{t('Keyword match', 'Correspondance des mots-clés')}</h3>
              <p style={{ fontSize: 12.5, color: 'var(--text-tertiary)', marginTop: 4 }}>{t('Found in your résumé', 'Trouvés dans votre CV')}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                {a.keywords.matched.map((k) => (
                  <span key={k} className="badge badge-success" style={{ fontSize: 12.5 }}>
                    <Icon name="check" size={12} /> {k}
                  </span>
                ))}
              </div>
              <p style={{ fontSize: 12.5, color: 'var(--text-tertiary)', marginTop: 16 }}>{t('Missing — add these', 'Manquants — ajoutez ceux-ci')}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10, alignItems: 'center' }}>
                {(isPro ? a.keywords.missing : a.keywords.missing.slice(0, 2)).map((k) => (
                  <span key={k} className="badge badge-warn" style={{ fontSize: 12.5 }}>
                    <Icon name="plus" size={12} /> {k}
                  </span>
                ))}
                {!isPro && a.keywords.missing.length > 2 && (
                  <span className="badge" style={{ fontSize: 12.5 }}>
                    <Icon name="lock" size={11} /> {t(`+${a.keywords.missing.length - 2} more`, `+${a.keywords.missing.length - 2} de plus`)}
                  </span>
                )}
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>{t('What to fix', 'Quoi corriger')}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {visibleFindings.map((f, i) => {
                  const ic = findingIcon(f.type)
                  return (
                    <div key={i} className="card-flat" style={{ padding: 18, border: '1px solid var(--border-light)', display: 'flex', gap: 14 }}>
                      <span style={{ width: 34, height: 34, borderRadius: 9, background: ic.bg, color: ic.color, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                        <Icon name={ic.name} size={18} />
                      </span>
                      <div>
                        <p style={{ fontSize: 14.5, fontWeight: 700 }}>{f.title}</p>
                        <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginTop: 5, lineHeight: 1.6 }}>{f.detail}</p>
                      </div>
                    </div>
                  )
                })}
                {!isPro && lockedFindings.map((f, i) => <LockedItem key={i} title={f.title} />)}
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>{t('Line-by-line rewrites', 'Réécritures ligne par ligne')}</h3>
              {isPro ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {a.rewrites.map((r, i) => (
                    <div key={i} className="card" style={{ padding: 18 }}>
                      <p style={{ fontSize: 12.5, color: 'var(--error)', fontWeight: 600 }}>{t('Before', 'Avant')}</p>
                      <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginTop: 4, textDecoration: 'line-through', opacity: 0.7 }}>{r.before}</p>
                      <p style={{ fontSize: 12.5, color: 'var(--success)', fontWeight: 600, marginTop: 12 }}>{t('After', 'Après')}</p>
                      <p style={{ fontSize: 14, color: 'var(--text-primary)', marginTop: 4, lineHeight: 1.55 }}>{r.after}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <ToolPaywall count={a.rewrites.length + lockedFindings.length} label={analysisLabel} />
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn btn-outline" onClick={() => setStage('input')}>
                <Icon name="refresh" size={16} /> {t('Analyze another', 'Analyser un autre')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ResumeAnalyzerPage() {
  return (
    <Suspense fallback={null}>
      <ResumeAnalyzerInner />
    </Suspense>
  )
}
