import * as core from '@actions/core'
import * as github from '@actions/github'
import * as fs from 'fs'
import * as path from 'path'

export interface ValidationIssue {
  code: string | number
  message: string
  severity: 0 | 1 | 2 | 3
  path: string[]
  range?: {
    start: { line: number; character: number }
    end: { line: number; character: number }
  }
  source?: string
}

export interface ValidationResult {
  file: string
  issues: ValidationIssue[]
  errorCount: number
  warningCount: number
}

/** Severity levels matching Spectral's DiagnosticSeverity */
export const Severity = {
  Error: 0,
  Warning: 1,
  Information: 2,
  Hint: 3,
} as const

/**
 * Retrieves the list of changed files in the current pull request.
 * Returns an empty array when not running in a PR context.
 */
export async function getChangedFiles(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string,
  pullNumber: number
): Promise<string[]> {
  const files: string[] = []
  let page = 1

  while (true) {
    const { data } = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: pullNumber,
      per_page: 100,
      page,
    })
    for (const f of data) {
      if (f.status !== 'removed') {
        files.push(f.filename)
      }
    }
    if (data.length < 100) break
    page++
  }

  return files
}

/**
 * Filters a list of file paths to only those matching OpenAPI spec patterns.
 * A file is considered a spec candidate if it ends with .yaml, .yml, or .json
 * and is matched by the provided glob pattern.
 */
export function filterSpecFiles(
  files: string[],
  specGlob: string
): string[] {
  // Simple glob-to-regex conversion for the common patterns used in OpenAPI repos.
  // Supports * (any chars except /) and ** (any chars including /)
  const specExtensions = ['.yaml', '.yml', '.json']
  return files.filter(f => {
    const ext = path.extname(f).toLowerCase()
    return specExtensions.includes(ext) && matchesGlob(f, specGlob)
  })
}

/**
 * Minimal glob matcher supporting * and ** wildcards.
 */
export function matchesGlob(filePath: string, pattern: string): boolean {
  // Handle brace expansion: **/*.{yaml,yml,json}
  const braceMatch = pattern.match(/^(.*)\{([^}]+)\}(.*)$/)
  if (braceMatch) {
    const [, prefix, alternatives, suffix] = braceMatch
    return alternatives.split(',').some(alt => matchesGlob(filePath, `${prefix}${alt.trim()}${suffix}`))
  }

  // Escape regex special characters that are not glob metacharacters.
  // We handle `*` (globstar and single-star) ourselves, so only escape the rest.
  // Backslash is escaped first to prevent escaping the escape sequences added below.
  const escaped = pattern
    .replace(/\\/g, '\\\\')          // escape literal backslash before adding any new backslashes
    .replace(/\^/g, '\\^')
    .replace(/\$/g, '\\$')
    .replace(/\+/g, '\\+')
    .replace(/\./g, '\\.')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\|/g, '\\|')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')

  const regexStr = escaped
    .replace(/\*\*/g, '__GLOBSTAR__')
    .replace(/\*/g, '[^/]*')
    .replace(/__GLOBSTAR__\//g, '(?:.*/)?')
    .replace(/__GLOBSTAR__/g, '.*')

  const regex = new RegExp(`^${regexStr}$`)
  return regex.test(filePath)
}

/**
 * Validates a single OpenAPI spec file using Spectral.
 * Loads the Spectral OAS ruleset (or a custom ruleset if provided).
 */
export async function validateSpecFile(
  filePath: string,
  customRuleset?: string
): Promise<ValidationResult> {
  const issues: ValidationIssue[] = []

  // Dynamically import Spectral to allow Jest to mock it in tests
  const { Spectral, Ruleset } = await import('@stoplight/spectral-core')
  const { oas } = await import('@stoplight/spectral-rulesets')
  const spectral = new Spectral()

  // Always load the OAS ruleset as the base. Custom rulesets are read from disk
  // as YAML/JSON and parsed manually so we avoid depending on Spectral's internal
  // bundler API (which is not part of the public contract).
  spectral.setRuleset(new Ruleset(oas))

  try {
    if (customRuleset && fs.existsSync(customRuleset)) {
      // Parse and apply the custom ruleset file on top of the OAS base.
      // We load the file as an object and pass it directly to Ruleset.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const rulesetContent = JSON.parse(
        fs.readFileSync(path.resolve(customRuleset), 'utf8')
      )
      spectral.setRuleset(new Ruleset(rulesetContent))
    }

    const content = fs.readFileSync(filePath, 'utf8')
    const results = await spectral.run(content)

    for (const result of results) {
      issues.push({
        code: result.code,
        message: result.message,
        severity: result.severity as 0 | 1 | 2 | 3,
        path: result.path.map(String),
        range: result.range,
        source: filePath,
      })
    }
  } catch (error) {
    issues.push({
      code: 'parse-error',
      message: error instanceof Error ? error.message : 'Failed to parse file',
      severity: Severity.Error,
      path: [],
      source: filePath,
    })
  }

  return {
    file: filePath,
    issues,
    errorCount: issues.filter(i => i.severity === Severity.Error).length,
    warningCount: issues.filter(i => i.severity === Severity.Warning).length,
  }
}

/**
 * Formats validation results as a Markdown comment for posting to a PR.
 */
export function formatComment(results: ValidationResult[]): string {
  const totalErrors = results.reduce((sum, r) => sum + r.errorCount, 0)
  const totalWarnings = results.reduce((sum, r) => sum + r.warningCount, 0)

  const statusEmoji =
    totalErrors > 0 ? '❌' : totalWarnings > 0 ? '⚠️' : '✅'
  const statusText =
    totalErrors > 0
      ? 'Validation failed'
      : totalWarnings > 0
        ? 'Validation passed with warnings'
        : 'Validation passed'

  const lines: string[] = [
    `## ${statusEmoji} OpenSpec PR Action — ${statusText}`,
    '',
    `**${totalErrors} error(s)** and **${totalWarnings} warning(s)** found across **${results.length} spec file(s)**.`,
    '',
  ]

  for (const result of results) {
    lines.push(`### \`${result.file}\``)
    if (result.issues.length === 0) {
      lines.push('✅ No issues found.')
    } else {
      lines.push(
        '| Severity | Code | Message | Path |',
        '|----------|------|---------|------|'
      )
      for (const issue of result.issues) {
        const severity =
          issue.severity === Severity.Error
            ? '❌ Error'
            : issue.severity === Severity.Warning
              ? '⚠️ Warning'
              : 'ℹ️ Info'
        const codePath = issue.path.length > 0 ? `\`${issue.path.join('.')}\`` : '—'
        const location =
          issue.range
            ? ` (line ${issue.range.start.line + 1})`
            : ''
        lines.push(
          `| ${severity} | \`${issue.code}\` | ${issue.message}${location} | ${codePath} |`
        )
      }
    }
    lines.push('')
  }

  lines.push(
    '<sub>Generated by [openspec-pr-action](https://github.com/acatl/openspec-pr-action)</sub>'
  )

  return lines.join('\n')
}

/**
 * Finds or creates the action's comment on a PR and updates it.
 */
export async function upsertComment(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string,
  issueNumber: number,
  body: string
): Promise<void> {
  const marker = '<!-- openspec-pr-action -->'
  const commentBody = `${marker}\n${body}`

  // Look for an existing comment from this action
  const { data: comments } = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: issueNumber,
  })

  const existing = comments.find((c: { id: number; body?: string | null }) => c.body?.includes(marker))

  if (existing) {
    await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existing.id,
      body: commentBody,
    })
  } else {
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body: commentBody,
    })
  }
}

/**
 * Main entry point for the GitHub Action.
 */
export async function run(): Promise<void> {
  const token = core.getInput('github-token', { required: true })
  const specGlob = core.getInput('spec-glob') || '**/*.{yaml,yml,json}'
  const ruleset = core.getInput('ruleset')
  const failOnError = core.getInput('fail-on-error') !== 'false'
  const failOnWarning = core.getInput('fail-on-warning') === 'true'

  const context = github.context
  const octokit = github.getOctokit(token)

  // Only run on pull_request events
  if (!context.payload.pull_request) {
    core.info('Not a pull request event — skipping OpenSpec validation.')
    return
  }

  const { number: pullNumber } = context.payload.pull_request
  const { owner, repo } = context.repo

  core.info(`Checking changed files in PR #${pullNumber}…`)

  const changedFiles = await getChangedFiles(octokit, owner, repo, pullNumber)
  const specFiles = filterSpecFiles(changedFiles, specGlob)

  if (specFiles.length === 0) {
    core.info('No OpenAPI spec files found in the changed files. Skipping validation.')
    core.setOutput('result', 'passed')
    core.setOutput('error-count', '0')
    core.setOutput('warning-count', '0')
    return
  }

  core.info(`Found ${specFiles.length} spec file(s) to validate: ${specFiles.join(', ')}`)

  const results: ValidationResult[] = []
  for (const file of specFiles) {
    core.info(`Validating ${file}…`)
    const result = await validateSpecFile(file, ruleset)
    results.push(result)
    if (result.errorCount > 0) {
      core.warning(`${file}: ${result.errorCount} error(s), ${result.warningCount} warning(s)`)
    } else if (result.warningCount > 0) {
      core.notice(`${file}: ${result.warningCount} warning(s)`)
    } else {
      core.info(`${file}: ✅ passed`)
    }
  }

  const totalErrors = results.reduce((sum, r) => sum + r.errorCount, 0)
  const totalWarnings = results.reduce((sum, r) => sum + r.warningCount, 0)

  const overallResult =
    totalErrors > 0 ? 'failed' : totalWarnings > 0 ? 'warnings' : 'passed'

  core.setOutput('result', overallResult)
  core.setOutput('error-count', String(totalErrors))
  core.setOutput('warning-count', String(totalWarnings))

  // Post a comment on the PR
  const comment = formatComment(results)
  await upsertComment(octokit, owner, repo, pullNumber, comment)

  if (failOnError && totalErrors > 0) {
    core.setFailed(`OpenSpec validation failed with ${totalErrors} error(s).`)
  } else if (failOnWarning && totalWarnings > 0) {
    core.setFailed(`OpenSpec validation found ${totalWarnings} warning(s).`)
  }
}
