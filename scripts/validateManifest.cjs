const { validate } = require('@forge/manifest');
validate(false).then((result) => {
  const errors = result.errors.filter((entry) => entry.level === 'error');
  for (const entry of result.errors) console.log(`${entry.level}: ${entry.message}`);
  if (errors.length) process.exitCode = 1;
  else console.log('Forge manifest validation passed.');
}).catch((error) => { console.error(error); process.exitCode = 1; });
