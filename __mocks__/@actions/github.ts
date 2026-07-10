// Mock for @actions/github used in unit tests
export const context = {
  repo: { owner: 'test-owner', repo: 'test-repo' },
  payload: { pull_request: { number: 42 } },
  eventName: 'pull_request',
  sha: 'abc123',
  ref: 'refs/heads/main',
  workflow: 'test',
  action: 'test',
  actor: 'test',
  runNumber: 1,
  runId: 1,
}

export const getOctokit = jest.fn(() => ({
  rest: {
    pulls: {
      listFiles: jest.fn().mockResolvedValue({ data: [] }),
    },
    issues: {
      listComments: jest.fn().mockResolvedValue({ data: [] }),
      createComment: jest.fn().mockResolvedValue({}),
      updateComment: jest.fn().mockResolvedValue({}),
    },
  },
}))
