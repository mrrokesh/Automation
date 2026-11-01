import { config } from './config.js'
import { createApp } from './app.js'

const server = createApp().listen(config.port, () => console.log(`API listening on http://localhost:${config.port}`))

// Let the hosting platform stop the process cleanly.
for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => server.close(() => process.exit(0)))
