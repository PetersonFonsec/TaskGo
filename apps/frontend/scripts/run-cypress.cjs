const { spawnSync } = require('node:child_process');
const { dirname, resolve } = require('node:path');

const packagePath = require.resolve('cypress/package.json');
const cypressPackage = require(packagePath);
const cypressCli = resolve(dirname(packagePath), cypressPackage.bin.cypress);
const environment = { ...process.env };

delete environment.ELECTRON_RUN_AS_NODE;
delete environment.NODE_OPTIONS;

const result = spawnSync(process.execPath, [cypressCli, ...process.argv.slice(2)], {
  env: environment,
  stdio: 'inherit',
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
