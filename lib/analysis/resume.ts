export interface ResumeAnalysis {
  overallScore: number;
  strengths: string[];
  improvements: string[];
  sections: {
    name: string;
    score: number;
    feedback: string;
  }[];
  actionItems: string[];
}

function calculateScore(text: string): number {
  let score = 50; // Base score

  // Check for common resume sections
  const sections = ['experience', 'education', 'skills', 'projects', 'certifications'];
  const foundSections = sections.filter((s) => text.toLowerCase().includes(s));
  score += foundSections.length * 5;

  // Check for action verbs (shows strong resume writing)
  const actionVerbs = [
    'developed',
    'led',
    'managed',
    'designed',
    'implemented',
    'improved',
    'achieved',
    'analyzed',
    'coordinated',
    'pioneered',
  ];
  const verbCount = actionVerbs.filter((v) => text.toLowerCase().includes(v)).length;
  score += Math.min(verbCount * 3, 15);

  // Check for quantifiable results
  if (text.match(/\d+%|\$[\d,]+|[\d,]+\+?/g)) {
    score += 10;
  }

  // Check for bullet points or proper formatting
  if (text.includes('\u2022') || text.includes('-') || text.match(/^\s*-/m)) {
    score += 5;
  }

  // Length check (too short or too long is bad)
  const wordCount = text.split(/\s+/).length;
  if (wordCount < 100) {
    score -= 10;
  } else if (wordCount > 1500) {
    score -= 5;
  }

  return Math.max(0, Math.min(score, 100));
}

export async function analyzeResume(resumeText: string): Promise<ResumeAnalysis> {
  const text = resumeText.trim();

  if (!text || text.length < 50) {
    return {
      overallScore: 0,
      strengths: [],
      improvements: [
        'Resume is too short. Please provide at least 50 characters of content.',
      ],
      sections: [],
      actionItems: ['Expand your resume with more detailed information'],
    };
  }

  const strengths: string[] = [];
  const improvements: string[] = [];
  const actionItems: string[] = [];
  const sections: ResumeAnalysis['sections'] = [];

  // Analyze sections
  const sectionNames = ['experience', 'education', 'skills', 'projects', 'certifications'];
  
  for (const section of sectionNames) {
    const hasSection = text.toLowerCase().includes(section);
    if (hasSection) {
      sections.push({
        name: section.charAt(0).toUpperCase() + section.slice(1),
        score: 80,
        feedback: `Your ${section} section is present.`,
      });
      strengths.push(`Includes dedicated ${section} section`);
    } else if (['experience', 'education', 'skills'].includes(section)) {
      sections.push({
        name: section.charAt(0).toUpperCase() + section.slice(1),
        score: 40,
        feedback: `Missing ${section} section.`,
      });
      improvements.push(`Add a dedicated ${section} section`);
      actionItems.push(
        `Include your ${section === 'experience' ? 'work history' : section === 'education' ? 'degree and certifications' : 'key technical and soft skills'} in a clear format`
      );
    }
  }

  // Check for action verbs
  const actionVerbs = [
    'developed',
    'led',
    'managed',
    'designed',
    'implemented',
    'improved',
    'achieved',
  ];
  const verbsFound = actionVerbs.filter((v) => text.toLowerCase().includes(v));
  if (verbsFound.length >= 3) {
    strengths.push('Uses strong action verbs');
  } else if (verbsFound.length > 0) {
    improvements.push(
      'Consider using more strong action verbs to describe your accomplishments'
    );
    actionItems.push(
      'Replace weak verbs like "responsible for" with stronger action verbs like "led", "managed", or "implemented"'
    );
  } else {
    improvements.push('No strong action verbs detected - your resume may not stand out');
    actionItems.push(
      'Start each bullet point with a strong action verb (led, managed, developed, designed, etc.)'
    );
  }

  // Check for metrics
  if (text.match(/\d+%/) || text.match(/\$[\d,]+/) || text.match(/[\d,]+ users/)) {
    strengths.push('Includes quantifiable results');
  } else {
    improvements.push('Add specific metrics and numbers to show impact');
    actionItems.push(
      'Quantify your achievements: "Led team of 5 people", "Increased efficiency by 30%", "Managed $2M budget"'
    );
  }

  // Check for length
  const wordCount = text.split(/\s+/).length;
  if (wordCount > 500) {
    improvements.push('Resume might be too long - aim for 500-750 words');
    actionItems.push('Trim unnecessary details and focus on most relevant achievements');
  } else if (wordCount < 200) {
    improvements.push('Resume is quite short - consider adding more detail');
    actionItems.push('Expand each role with 2-3 key achievements and responsibilities');
  } else {
    strengths.push('Good length for a resume');
  }

  // ATS compatibility
  if (text.match(/^[A-Z][A-Za-z\s\-]+$/m) || text.match(/[\[\{]/)) {
    improvements.push('Resume may have ATS compatibility issues');
    actionItems.push(
      'Avoid special characters, headers with brackets, and complex formatting that ATS systems cannot parse'
    );
  } else {
    strengths.push('Likely ATS-compatible format');
  }

  const overallScore = calculateScore(text);

  return {
    overallScore,
    strengths: strengths.length > 0 ? strengths : ['Resume has basic structure'],
    improvements:
      improvements.length > 0
        ? improvements
        : ['Overall solid resume - consider minor improvements'],
    sections,
    actionItems:
      actionItems.length > 0
        ? actionItems
        : [
            'Your resume looks good! Keep refining and tailoring it for specific job applications.',
          ],
  };
}

