'use client'

import { useState } from 'react'
import Card from '@/components/Card'
import Button from '@/components/Button'
import PageHero from '@/components/PageHero'
import { Icon } from '@/components/ui/Icon'

const CHANNELS: { icon: string; label: string; value: string; note: string }[] = [
  {
    icon: 'message',
    label: 'General & support',
    value: 'support@careerheap.ca',
    note: 'Questions about your plan or account.'
  },
  {
    icon: 'shield',
    label: 'Privacy requests',
    value: 'privacy@careerheap.ca',
    note: 'Access, correction, or deletion of your data.'
  },
  {
    icon: 'briefcase',
    label: 'Partnerships & press',
    value: 'hello@careerheap.ca',
    note: 'Collaborations, media, and trade bodies.'
  }
]

const TOPICS = ['General', 'Account & billing', 'Privacy', 'Partnership']

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', topic: 'General', message: '' })
  const [sent, setSent] = useState(false)
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <>
      <PageHero
        badge="Get in touch"
        title="We'd love to hear from you"
        sub="Whether you're stuck on a plan, exercising a privacy right, or exploring a partnership — reach the right inbox below, or send us a note."
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
                  <p className="text-[15px] font-bold">{c.label}</p>
                  <p className="mt-1 text-[14.5px] font-semibold text-accent">{c.value}</p>
                  <p className="mt-1.5 text-[13px] leading-[1.55] text-text-tertiary">{c.note}</p>
                </div>
              </Card>
            ))}
            <Card className="bg-bg-secondary p-[22px] shadow-none">
              <div className="flex items-center gap-2.5">
                <Icon name="clock" size={17} className="text-text-secondary" />
                <p className="text-sm font-semibold">Typical response time</p>
              </div>
              <p className="mt-2 text-[13.5px] leading-[1.6] text-text-secondary">
                We reply to most messages within 1–2 business days, Monday to Friday (ET). Privacy
                requests are handled within 30 days, as required by law.
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
                <h3 className="mt-5 text-[21px] font-bold">Message sent</h3>
                <p className="mx-auto mt-2.5 max-w-[360px] text-[15px] leading-[1.6] text-text-secondary">
                  Thanks{form.name ? `, ${form.name.split(' ')[0]}` : ''} — we&apos;ll get back to you
                  at {form.email || 'your email'} within 1–2 business days.
                </p>
                <Button
                  variant="outline"
                  className="mt-[22px]"
                  onClick={() => {
                    setSent(false)
                    setForm({ name: '', email: '', topic: 'General', message: '' })
                  }}
                >
                  Send another
                </Button>
              </div>
            ) : (
              <>
                <h2 className="text-[21px] font-bold">Send us a message</h2>
                <p className="mb-[22px] mt-1.5 text-sm text-text-secondary">We read every one.</p>
                <div className="grid gap-3.5 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold">Name</span>
                    <input
                      className="w-full rounded-md border border-border bg-surface px-[15px] py-3 text-[15px] focus:border-accent focus:outline-none"
                      value={form.name}
                      onChange={(e) => set('name', e.target.value)}
                      placeholder="Your name"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold">Email</span>
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
                  <span className="mb-2 block text-sm font-semibold">Topic</span>
                  <div className="flex flex-wrap gap-2.5">
                    {TOPICS.map((t) => {
                      const on = form.topic === t
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => set('topic', t)}
                          className={`inline-flex items-center gap-1.5 rounded-pill border px-3.5 py-2 text-sm font-medium transition-colors ${
                            on
                              ? 'border-accent bg-accent text-text-on-dark'
                              : 'border-border bg-surface text-text-secondary hover:border-accent hover:text-accent'
                          }`}
                        >
                          {on && <Icon name="check" size={14} />}
                          {t}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <label className="mt-3.5 block">
                  <span className="mb-2 block text-sm font-semibold">Message</span>
                  <textarea
                    rows={5}
                    className="w-full resize-y rounded-md border border-border bg-surface p-[15px] text-[15px] focus:border-accent focus:outline-none"
                    value={form.message}
                    onChange={(e) => set('message', e.target.value)}
                    placeholder="How can we help?"
                  />
                </label>
                <Button
                  variant="primary"
                  className="mt-[18px] w-full"
                  disabled={!form.email || !form.message}
                  onClick={() => setSent(true)}
                >
                  <Icon name="arrow" size={17} /> Send message
                </Button>
                <p className="mt-3 text-center text-xs leading-[1.5] text-text-tertiary">
                  By sending, you agree to our handling of your message per the Privacy Policy.
                </p>
              </>
            )}
          </Card>
        </div>
      </section>
    </>
  )
}
