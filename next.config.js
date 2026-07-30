const { PHASE_DEVELOPMENT_SERVER } = require('next/constants');

module.exports = (phase) => ({
  // Keep dev and production artifacts separate. This allows a local development
  // server and the receptionist's stable iPad test server to run without
  // overwriting each other's webpack files.
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next',
});
