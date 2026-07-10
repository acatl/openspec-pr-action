import { filterSpecFiles, matchesGlob, formatComment, Severity } from '../src/main'
import type { ValidationResult } from '../src/main'

describe('matchesGlob', () => {
  it('matches a simple wildcard pattern', () => {
    expect(matchesGlob('openapi.yaml', '*.yaml')).toBe(true)
    expect(matchesGlob('openapi.json', '*.yaml')).toBe(false)
  })

  it('matches a globstar pattern', () => {
    expect(matchesGlob('api/v1/openapi.yaml', '**/*.yaml')).toBe(true)
    // ** includes the root level in standard glob semantics
    expect(matchesGlob('openapi.yaml', '**/*.yaml')).toBe(true)
    expect(matchesGlob('openapi.json', '**/*.yaml')).toBe(false)
  })

  it('matches brace expansion patterns', () => {
    expect(matchesGlob('openapi.yaml', '**/*.{yaml,yml,json}')).toBe(true)
    expect(matchesGlob('openapi.yml', '**/*.{yaml,yml,json}')).toBe(true)
    expect(matchesGlob('openapi.json', '**/*.{yaml,yml,json}')).toBe(true)
    expect(matchesGlob('openapi.ts', '**/*.{yaml,yml,json}')).toBe(false)
  })

  it('matches a file with an uppercase name using a lowercase extension pattern', () => {
    // The glob pattern matches based on the extension literal; filenames are not case-folded
    expect(matchesGlob('API.yaml', '**/*.yaml')).toBe(true)
  })
})

describe('filterSpecFiles', () => {
  const files = [
    'src/main.ts',
    'api/openapi.yaml',
    'api/v2/spec.yml',
    'config/settings.json',
    'docs/openapi.json',
    'README.md',
    'package.json',
  ]

  it('filters to spec files matching the default glob', () => {
    const result = filterSpecFiles(files, '**/*.{yaml,yml,json}')
    expect(result).toEqual([
      'api/openapi.yaml',
      'api/v2/spec.yml',
      'config/settings.json',
      'docs/openapi.json',
      'package.json',
    ])
  })

  it('filters to only yaml files', () => {
    const result = filterSpecFiles(files, '**/*.yaml')
    expect(result).toEqual(['api/openapi.yaml'])
  })

  it('filters files within a specific directory', () => {
    const result = filterSpecFiles(files, 'api/**/*.{yaml,yml}')
    expect(result).toEqual(['api/openapi.yaml', 'api/v2/spec.yml'])
  })

  it('returns an empty array when nothing matches', () => {
    const result = filterSpecFiles(['README.md', 'src/main.ts'], '**/*.{yaml,yml,json}')
    expect(result).toEqual([])
  })
})

describe('formatComment', () => {
  it('shows a passing status when there are no issues', () => {
    const results: ValidationResult[] = [
      { file: 'api/openapi.yaml', issues: [], errorCount: 0, warningCount: 0 },
    ]
    const comment = formatComment(results)
    expect(comment).toContain('✅')
    expect(comment).toContain('Validation passed')
    expect(comment).toContain('0 error(s)')
    expect(comment).toContain('0 warning(s)')
    expect(comment).toContain('No issues found')
  })

  it('shows a failure status when there are errors', () => {
    const results: ValidationResult[] = [
      {
        file: 'api/openapi.yaml',
        issues: [
          {
            code: 'oas3-schema',
            message: 'Missing required field "info"',
            severity: Severity.Error,
            path: ['info'],
            source: 'api/openapi.yaml',
          },
        ],
        errorCount: 1,
        warningCount: 0,
      },
    ]
    const comment = formatComment(results)
    expect(comment).toContain('❌')
    expect(comment).toContain('Validation failed')
    expect(comment).toContain('1 error(s)')
    expect(comment).toContain('oas3-schema')
    expect(comment).toContain('Missing required field "info"')
  })

  it('shows a warning status when there are only warnings', () => {
    const results: ValidationResult[] = [
      {
        file: 'api/openapi.yaml',
        issues: [
          {
            code: 'operation-description',
            message: 'Operation must have a description',
            severity: Severity.Warning,
            path: ['paths', '/users', 'get'],
            source: 'api/openapi.yaml',
          },
        ],
        errorCount: 0,
        warningCount: 1,
      },
    ]
    const comment = formatComment(results)
    expect(comment).toContain('⚠️')
    expect(comment).toContain('Validation passed with warnings')
    expect(comment).toContain('1 warning(s)')
  })

  it('includes line numbers when a range is provided', () => {
    const results: ValidationResult[] = [
      {
        file: 'api/openapi.yaml',
        issues: [
          {
            code: 'oas3-schema',
            message: 'Invalid value',
            severity: Severity.Error,
            path: ['info', 'title'],
            range: {
              start: { line: 4, character: 0 },
              end: { line: 4, character: 20 },
            },
            source: 'api/openapi.yaml',
          },
        ],
        errorCount: 1,
        warningCount: 0,
      },
    ]
    const comment = formatComment(results)
    expect(comment).toContain('line 5')
  })

  it('handles multiple files in the comment', () => {
    const results: ValidationResult[] = [
      { file: 'api/v1/openapi.yaml', issues: [], errorCount: 0, warningCount: 0 },
      { file: 'api/v2/openapi.yaml', issues: [], errorCount: 0, warningCount: 0 },
    ]
    const comment = formatComment(results)
    expect(comment).toContain('api/v1/openapi.yaml')
    expect(comment).toContain('api/v2/openapi.yaml')
    expect(comment).toContain('2 spec file(s)')
  })

  it('includes the action attribution footer', () => {
    const comment = formatComment([])
    expect(comment).toContain('openspec-pr-action')
  })
})
