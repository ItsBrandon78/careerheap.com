import { visionTool } from '@sanity/vision'
import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { schemaTypes } from './sanity/schemas'

const projectId = process.env.SANITY_PROJECT_ID || 'your-project-id'
const dataset = process.env.SANITY_DATASET || 'production'

export default defineConfig({
  name: 'careerheap',
  title: 'CareerHeap Studio',
  projectId,
  dataset,
  plugins: [structureTool(), visionTool()],
  schema: {
    types: schemaTypes
  }
})
