// Shared interaction harness exercises each type independently in mouse/touch contexts.
require('./link-bar.cjs')('weld').catch(e=>{console.error(e);process.exitCode=1});
