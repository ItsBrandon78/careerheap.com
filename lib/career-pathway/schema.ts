import { z } from 'zod'

const CareerPathwayLinkSchema = z
  .object({
    title: z.string().min(1),
    url: z.string().min(1)
  })
  .strict()

const CareerPathwayRequirementItemSchema = z
  .object({
    type: z.string().min(1),
    name: z.string().min(1),
    details: z.string().min(1)
  })
  .strict()

const CareerPathwayStarterCertItemSchema = z
  .object({
    type: z.string().min(1),
    name: z.string().min(1),
    details: z.string().min(1),
    source_title: z.string().min(1),
    source_url: z.string().min(1),
    provider: z.string().min(1)
  })
  .strict()

const CareerPathwayMilestoneSchema = z
  .object({
    title: z.string().min(1),
    done_when: z.string().min(1)
  })
  .strict()

const CareerPathwayPhaseSchema = z
  .object({
    phase: z.string().min(1),
    duration: z
      .object({
        min_weeks: z.number().int().min(0),
        max_weeks: z.number().int().min(0)
      })
      .strict(),
    milestones: z.array(CareerPathwayMilestoneSchema).min(1)
  })
  .strict()

const CareerPathwayEntryPathSchema = z
  .object({
    path_name: z.string().min(1),
    who_its_for: z.string().min(1),
    steps: z.array(z.string().min(1)).min(1),
    time_to_first_job_weeks: z
      .object({
        min: z.number().int().min(0),
        max: z.number().int().min(0)
      })
      .strict()
  })
  .strict()

export const CareerPathwayProfileSchema = z
  .object({
    meta: z
      .object({
        title: z.string().min(1),
        slug: z.string().min(1),
        jurisdiction: z
          .object({
            country: z.string().min(1),
            region: z.string().optional().nullable()
          })
          .strict(),
        codes: z
          .object({
            noc_2021: z.string().optional().nullable(),
            trade_code: z.string().optional().nullable(),
            onet_soc: z.string().optional().nullable()
          })
          .strict(),
        teer: z.number().int().min(0).max(5).optional().nullable(),
        pathway_type: z
          .enum([
            'trade_apprenticeship',
            'regulated_profession',
            'non_regulated',
            'credential_stack'
          ])
          .optional(),
        regulated: z.boolean(),
        last_verified: z.string().min(1)
      })
      .strict(),
    snapshot: z
      .object({
        one_liner: z.string().min(1),
        what_you_do: z.array(z.string().min(1)).min(1),
        where_you_work: z.array(z.string().min(1)).min(1),
        who_hires: z.array(z.string().min(1)).min(1)
      })
      .strict(),
    entry_paths: z.array(CareerPathwayEntryPathSchema).min(1),
    requirements: z
      .object({
        must_have: z.array(CareerPathwayRequirementItemSchema),
        nice_to_have: z.array(CareerPathwayRequirementItemSchema),
        starter_cert_bundle: z.array(CareerPathwayStarterCertItemSchema).optional(),
        tools_or_gear: z.array(z.string().min(1))
      })
      .strict(),
    timeline: z
      .object({
        time_to_employable: z
          .object({
            min_weeks: z.number().int().min(0),
            max_weeks: z.number().int().min(0)
          })
          .strict(),
        time_to_full_qualification: z
          .object({
            min_months: z.number().int().min(0),
            max_months: z.number().int().min(0)
          })
          .strict(),
        phases: z.array(CareerPathwayPhaseSchema).min(1)
      })
      .strict(),
    progression: z
      .object({
        levels: z.array(
          z
            .object({
              level: z.string().min(1),
              title: z.string().min(1),
              typical_time: z.string().min(1),
              what_changes: z.array(z.string().min(1)).min(1)
            })
            .strict()
        )
      })
      .strict(),
    wages: z
      .object({
        currency: z.string().min(1),
        hourly: z.array(
          z
            .object({
              region: z.string().min(1),
              low: z.number().nullable(),
              median: z.number().nullable(),
              high: z.number().nullable(),
              source: z.string().min(1)
            })
            .strict()
        ),
        notes: z.string().min(1)
      })
      .strict(),
    wages_by_province: z
      .array(
        z
          .object({
            province: z.string().min(1),
            low_hourly_cad: z.number().nullable(),
            median_hourly_cad: z.number().nullable(),
            high_hourly_cad: z.number().nullable(),
            source: z.string().min(1)
          })
          .strict()
      )
      .optional(),
    difficulty: z
      .object({
        overall_1_5: z.number().int().min(1).max(5),
        why: z.array(z.string().min(1)).min(1),
        common_failure_points: z.array(z.string().min(1)).min(1)
      })
      .strict(),
    skills: z
      .object({
        core: z.array(z.string().min(1)).min(1),
        tools_tech: z.array(z.string().min(1)),
        soft_skills: z.array(z.string().min(1))
      })
      .strict(),
    resources: z
      .object({
        official: z.array(CareerPathwayLinkSchema),
        training: z.array(CareerPathwayLinkSchema),
        job_search: z.array(CareerPathwayLinkSchema)
      })
      .strict(),
    sources: z.array(
      z
        .object({
          title: z.string().min(1),
          url: z.string().min(1),
          publisher: z.string().min(1),
          accessed_at: z.string().min(1)
        })
        .strict()
    )
  })
  .strict()

export type CareerPathwayProfile = z.infer<typeof CareerPathwayProfileSchema>
