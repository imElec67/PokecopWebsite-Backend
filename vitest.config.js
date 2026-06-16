import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    // mongodb-memory-server can take a few seconds to download/start
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false, // share one in-memory mongo cleanly across files
  },
})
