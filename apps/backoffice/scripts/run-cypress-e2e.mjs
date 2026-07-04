import { spawn } from 'node:child_process';

const port = 4300;
const host = '127.0.0.1';
const origin = `http://${host}:${port}`;

const serve = spawn('npx', ['ng', 'serve', '--host', host, '--port', String(port)], {
  stdio: 'inherit',
  shell: process.platform === 'win32'
});

const waitForServer = async () => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 60_000) {
    try {
      const response = await fetch(origin);
      if (response.ok) {
        return;
      }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  throw new Error(`Timed out waiting for ${origin}`);
};

const run = (command, args) =>
  new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32'
    });
    child.on('close', (code) => resolve(code ?? 1));
  });

try {
  await waitForServer();
  const code = await run('npx', ['cypress', 'run']);
  serve.kill('SIGTERM');
  process.exit(code);
} catch (error) {
  serve.kill('SIGTERM');
  console.error(error);
  process.exit(1);
}
