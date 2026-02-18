import { defineField, defineType } from 'sanity'

export const calloutType = defineType({
  name: 'callout',
  title: 'Callout',
  type: 'object',
  fields: [
    defineField({
      name: 'variant',
      title: 'Variant',
      type: 'string',
      options: {
        list: [
          { title: 'Info', value: 'info' },
          { title: 'Tip', value: 'tip' },
          { title: 'Warning', value: 'warning' }
        ],
        layout: 'radio'
      },
      initialValue: 'info',
      validation: (rule) =>
        rule.required().error('Select a callout variant.')
    }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) =>
        rule.required().error('Callout title is required.')
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'text',
      rows: 4,
      validation: (rule) =>
        rule.required().error('Callout body text is required.')
    })
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'variant'
    },
    prepare: ({ title, subtitle }) => ({
      title,
      subtitle: subtitle ? `Callout • ${subtitle}` : 'Callout'
    })
  }
})
