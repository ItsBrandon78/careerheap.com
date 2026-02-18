import { defineArrayMember, defineField, defineType } from 'sanity'

export const postType = defineType({
  name: 'post',
  title: 'Post',
  type: 'document',
  groups: [
    { name: 'content', title: 'Content', default: true },
    { name: 'seo', title: 'SEO' }
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'content',
      validation: (rule) =>
        rule.required().error('Title is required before publishing.')
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'content',
      options: {
        source: 'title',
        maxLength: 96
      },
      validation: (rule) =>
        rule.required().error('Slug is required. Click "Generate" from title.')
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      group: 'content',
      rows: 3,
      validation: (rule) =>
        rule
          .required()
          .max(240)
          .error('Excerpt is required and should stay under 240 characters.')
    }),
    defineField({
      name: 'coverImage',
      title: 'Cover image',
      type: 'image',
      group: 'content',
      options: {
        hotspot: true
      },
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt text',
          type: 'string',
          validation: (rule) =>
            rule.required().error('Alt text is required for accessibility/SEO.')
        })
      ],
      validation: (rule) =>
        rule.required().error('Cover image is required for blog cards and social sharing.')
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'reference',
      group: 'content',
      to: [{ type: 'category' }],
      validation: (rule) =>
        rule.required().error('Select a category to publish this post.')
    }),
    defineField({
      name: 'author',
      title: 'Author',
      type: 'reference',
      group: 'content',
      to: [{ type: 'author' }]
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published at',
      type: 'datetime',
      group: 'content',
      description: 'Set a date/time to make this post publicly visible.',
      validation: (rule) =>
        rule.required().error('Set publishedAt so this post can appear on the public blog.')
    }),
    defineField({
      name: 'readTime',
      title: 'Read time (minutes)',
      type: 'number',
      group: 'content',
      validation: (rule) => rule.min(1).max(60).integer()
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      group: 'content',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [
            { title: 'Normal', value: 'normal' },
            { title: 'H2', value: 'h2' },
            { title: 'H3', value: 'h3' },
            { title: 'Quote', value: 'blockquote' }
          ],
          lists: [{ title: 'Bullet', value: 'bullet' }],
          marks: {
            decorators: [
              { title: 'Strong', value: 'strong' },
              { title: 'Emphasis', value: 'em' }
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'Link',
                fields: [
                  defineField({
                    name: 'href',
                    title: 'URL',
                    type: 'url',
                    validation: (rule) =>
                      rule.uri({
                        allowRelative: true,
                        scheme: ['http', 'https', 'mailto', 'tel']
                      })
                  })
                ]
              }
            ]
          }
        }),
        defineArrayMember({
          type: 'callout'
        })
      ],
      validation: (rule) =>
        rule.required().min(1).error('Body content is required.')
    }),
    defineField({
      name: 'seoTitle',
      title: 'SEO title',
      type: 'string',
      group: 'seo',
      validation: (rule) => rule.max(70)
    }),
    defineField({
      name: 'seoDescription',
      title: 'SEO description',
      type: 'text',
      group: 'seo',
      rows: 3,
      validation: (rule) => rule.max(160)
    })
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'publishedAt',
      media: 'coverImage'
    },
    prepare: ({ title, subtitle, media }) => ({
      title,
      subtitle: subtitle ? `Published: ${new Date(subtitle).toLocaleDateString()}` : 'Unpublished',
      media
    })
  },
  orderings: [
    {
      title: 'Published date (newest)',
      name: 'publishedDateDesc',
      by: [{ field: 'publishedAt', direction: 'desc' }]
    }
  ]
})
