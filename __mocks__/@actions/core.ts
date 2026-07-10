// Mock for @actions/core used in unit tests
export const getInput = jest.fn((name: string) => {
  const defaults: Record<string, string> = {
    'github-token': 'test-token',
    'spec-glob': '**/*.{yaml,yml,json}',
    'ruleset': '',
    'fail-on-error': 'true',
    'fail-on-warning': 'false',
  }
  return defaults[name] ?? ''
})
export const setOutput = jest.fn()
export const setFailed = jest.fn()
export const info = jest.fn()
export const warning = jest.fn()
export const notice = jest.fn()
export const error = jest.fn()
export const debug = jest.fn()
