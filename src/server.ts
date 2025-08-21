import type { Server } from 'http';
import app from './app.js';

const port = 3000;

async function main() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const server: Server = app.listen(port, () => {
    console.log(`Server running 🚀🚀 on => port  ${port}`);
  });
}

main();
