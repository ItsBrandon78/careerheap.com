import { ResumeAnalysis } from '@/lib/analysis/resume';

interface ResumeResultsProps {
  analysis: ResumeAnalysis;
  className?: string;
}

const getScoreColor = (score: number) => {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 60) return 'text-amber-600';
  return 'text-red-600';
};

const getScoreBgColor = (score: number) => {
  if (score >= 80) return 'bg-emerald-50';
  if (score >= 60) return 'bg-amber-50';
  return 'bg-red-50';
};

export default function ResumeResults({ analysis, className = '' }: ResumeResultsProps) {
  return (
    <div className={`space-y-8 ${className}`}>
      {/* Overall Score */}
      <div className={`rounded-lg p-8 ${getScoreBgColor(analysis.overallScore)}`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Resume Score</h2>
            <p className="mt-1 text-gray-600">Overall assessment of your resume quality</p>
          </div>
          <div className="text-center">
            <div className={`text-6xl font-bold ${getScoreColor(analysis.overallScore)}`}>
              {analysis.overallScore}
            </div>
            <div className="mt-2 text-sm font-medium text-gray-600">/100</div>
          </div>
        </div>

        {/* Score Bar */}
        <div className="mt-6 h-3 w-full rounded-full bg-gray-200 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              analysis.overallScore >= 80
                ? 'bg-emerald-600'
                : analysis.overallScore >= 60
                  ? 'bg-amber-600'
                  : 'bg-red-600'
            }`}
            style={{ width: `${analysis.overallScore}%` }}
          />
        </div>
      </div>

      {/* Strengths */}
      {analysis.strengths.length > 0 && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6">
          <h3 className="text-lg font-semibold text-emerald-900 flex items-center">
            <span className="mr-2 text-2xl">✓</span>
            Strengths
          </h3>
          <ul className="mt-4 space-y-2">
            {analysis.strengths.map((strength, index) => (
              <li key={index} className="flex items-start text-emerald-800">
                <span className="mr-3 mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white shrink-0">
                  ✓
                </span>
                <span>{strength}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Improvements */}
      {analysis.improvements.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
          <h3 className="text-lg font-semibold text-amber-900 flex items-center">
            <span className="mr-2 text-2xl">⚠️</span>
            Areas for Improvement
          </h3>
          <ul className="mt-4 space-y-2">
            {analysis.improvements.map((improvement, index) => (
              <li key={index} className="flex items-start text-amber-800">
                <span className="mr-3 mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-xs font-bold text-white shrink-0">
                  !
                </span>
                <span>{improvement}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Items */}
      {analysis.actionItems.length > 0 && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 p-6">
          <h3 className="text-lg font-semibold text-sky-900 flex items-center">
            <span className="mr-2 text-2xl">💡</span>
            Action Items
          </h3>
          <ol className="mt-4 space-y-2">
            {analysis.actionItems.map((item, index) => (
              <li key={index} className="flex items-start text-sky-800">
                <span className="mr-3 mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-600 text-xs font-bold text-white shrink-0">
                  {index + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Section Breakdown */}
      {analysis.sections.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Section Analysis</h3>
          <div className="space-y-4">
            {analysis.sections.map((section, index) => (
              <div key={index} className="border-t border-gray-200 pt-4 first:border-t-0 first:pt-0">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{section.name}</h4>
                  <span className="text-sm font-semibold text-gray-600">{section.score}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className="h-full bg-sky-600 rounded-full transition-all"
                    style={{ width: `${section.score}%` }}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-600">{section.feedback}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

