'use client'

import { useState } from 'react'
import Card from '@/components/Card'
import Button from '@/components/Button'
import PageHero from '@/components/PageHero'
import { Icon } from '@/components/ui/Icon'
import { useT } from '@/lib/i18n/LocaleProvider'

const CHANNELS: { icon: string; label: string; labelFr: string; value: string; note: string; noteFr: string }[] = [
  {
    icon: 'message',
    label: 'General & support',
    labelFr: 'Général et soutien',
    value: 'support@careerheap.ca',
    note: 'Questions about your plan or account.',
    noteFr: 'Questions sur votre plan ou votre compte.'
  },
  {
    icon: 'shield',
    label: 'Privacy requests',
    labelFr: 'Demandes de confidentialité',
    value: 'privacy@careerheap.ca',
    note: 'Access, correction, or deletion of your data.',
    noteFr: 'Accès, correction ou suppression de vos données.'
  },
  {
    icon: 'briefcase',
    label: 'Partnerships & press',
    labelFr: 'Partenariats et presse',
    value: 'hello@careerheap.ca',
    note: 'Collaborations, media, and trade bodies.',
    noteFr: 'Collaborations, médias et organismes professionnels.'
  }
]

const TOPICS: [string, string][] = [
  ['General', 'Général'],
  ['Account & billing', 'Compte et facturation'],
  ['Privacy', 'Confidentialité'],
  ['Partnership', 'Partenariat']
]

export default function ContactPage() {
  const t = useT()
  const [form, setForm] = useState({ name: '', email: '', topic: 'General', message: '' })
  const [sent, setSent] = useState(false)
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const namePart = form.name ? `, ${form.name.split(' ')[0]}` : ''
  const emailPart = form.email || (t('your email', 'votre courriel') as string)

  return (
    <>
      <PageHero
        badge={t('Get in touch', 'Contactez-nous')}
        title={t("We'd love to hear from you", 'Nous aimerions vous entendre')}
        sub={t(
          "Whether you're stuck on a plan, exercising a privacy right, or exploring a partnership — reach the right inbox below, or send us a note.",
          'Que vous soyez bloqué sur un plan, que vous exerciez un droit à la vie privée ou que vous exploriez un partenariat — écrivez à la bonne boîte ci-dessous, ou envoyez-nous un mot.'
        )}
      />

      <section className="mx-auto max-w-content px-4 pb-20 pt-12 sm:px-6">
        <div className="grid items-start gap-8 md:grid-cols-[1fr_1.2fr]">
          {/* channels */}
          <div className="flex flex-col gap-3.5">
            {CHANNELS.map((c) => (
              <Card key={c.value} className="flex items-start gap-4 p-[22px]">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-accent-light text-accent">
                  <Icon name={c.icon} size={21} />
                </span>
                <div>
                  <p className="text-[15px] font-bold">{t(c.label, c.labelFr)}</p>
                  <p className="mt-1 text-[14.5px] font-semibold text-accent">{c.value}</p>
                  <p className="mt-1.5 text-[13px] leading-[1.55] text-text-tertiary">{t(c.note, c.noteFr)}</p>
                </div>
              </Card>
            ))}
            <Card className="bg-bg-secondary p-[22px] shadow-none">
              <div className="flex items-center gap-2.5">
                <Icon name="clock" size={17} className="text-text-secondary" />
                <p className="text-sm font-semibold">{t('Typical response time', 'Délai de réponse habituel')}</p>
              </div>
              <p className="mt-2 text-[13.5px] leading-[1.6] text-text-secondary">
                {t(
                  'We reply to most messages within 1–2 business days, Monday to Friday (ET). Privacy requests are handled within 30 days, as required by law.',
                  "Nous répondons à la plupart des messages en 1 à 2 jours ouvrables, du lundi au vendredi (HE). Les demandes de confidentialité sont traitées dans les 30 jours, comme l'exige la loi."
                )}
              </p>
            </Card>
          </div>

          {/* form */}
          <Card className="p-6 md:p-[34px]">
            {sent ? (
              <div className="px-3 py-10 text-center">
                <span className="mx-auto grid h-[60px] w-[60px] place-items-center rounded-pill bg-success-light text-success">
                  <Icon name="check" size={30} stroke={2.5} />
                </span>
                <h3 className="mt-5 text-[21px] font-bold">{t('Message sent', 'Message envoyé')}</h3>
                <p className="mx-auto mt-2.5 max-w-[360px] text-[15px] leading-[1.6] text-text-secondary">
                  {t(
                    `Thanks${namePart} — we'll get back to you at ${emailPart} within 1–2 business days.`,
                    `Merci${namePart} — nous vous répondrons à ${emailPart} dans un délai de 1 à 2 jours ouvrables.`
                  )}
                </p>
                <Button
                  variant="outline"
                  className="mt-[22px]"
                  onClick={() => {
                    setSent(false)
                    setForm({ name: '', email: '', topic: 'General', message: '' })
                  }}
                >
                  {t('Send another', 'Envoyer un autre')}
                </Button>
              </div>
            ) : (
              <>
                <h2 className="text-[21px] font-bold">{t('Send us a message', 'Envoyez-nous un message')}</h2>
                <p className="mb-[22px] mt-1.5 text-sm text-text-secondary">{t('We read every one.', 'Nous les lisons tous.')}</p>
                <div className="grid gap-3.5 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold">{t('Name', 'Nom')}</span>
                    <input
                      className="w-full rounded-md border border-border bg-surface px-[15px] py-3 text-[15px] focus:border-accent focus:outline-none"
                      value={form.name}
                      onChange={(e) => set('name', e.target.value)}
                      placeholder={t('Your name', 'Votre nom')}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold">{t('Email', 'Courriel')}</span>
                    <input
                      type="email"
                      className="w-full rounded-md border border-border bg-surface px-[15px] py-3 text-[15px] focus:border-accent focus:outline-none"
                      value={form.email}
                      onChange={(e) => set('email', e.target.value)}
                      placeholder="you@email.com"
                    />
                  </label>
                </div>
                <div className="mt-3.5">
                  <span className="mb-2 block text-sm font-semibold">{t('Topic', 'Sujet')}</span>
                  <div className="flex flex-wrap gap-2.5">
                    {TOPICS.map(([topic, topicFr]) => {
                      const on = form.topic === topic
                      return (
                        <button
                          key={topic}
                          type="button"
                          onClick={() => set('topic', topic)}
                          className={`inline-flex items-center gap-1.5 rounded-pill border px-3.5 py-2 text-sm font-medium transition-colors ${
                            on
                              ? 'border-accent bg-accent text-text-on-dark'
                              : 'border-border bg-surface text-text-secondary hover:border-accent hover:text-accent'
                          }`}
                        >
                          {on && <Icon name="check" size={14} />}
                          {t(topic, topicFr)}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <label className="mt-3.5 block">
                  <span className="mb-2 block text-sm font-semibold">{t('Message', 'Message')}</span>
                  <textarea
                    rows={5}
                    className="w-full resize-y rounded-md border border-border bg-surface p-[15px] text-[15px] focus:border-accent focus:outline-none"
                    value={form.message}
                    onChange={(e) => set('message', e.target.value)}
                    placeholder={t('How can we help?', 'Comment pouvons-nous aider?')}
                  />
                </label>
                <Button
                  variant="primary"
                  className="mt-[18px] w-full"
                  disabled={!form.email || !form.message}
                  onClick={() => setSent(true)}
                >
                  <Icon name="arrow" size={17} /> {t('Send message', 'Envoyer le message')}
                </Button>
                <p className="mt-3 text-center text-xs leading-[1.5] text-text-tertiary">
                  {t(
                    'By sending, you agree to our handling of your message per the Privacy Policy.',
                    'En envoyant, vous acceptez que nous traitions votre message conformément à la politique de confidentialité.'
                  )}
                </p>
              </>
            )}
          </Card>
        </div>
      </section>
    </>
  )
}
