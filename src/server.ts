import http, { type Server } from "http";
import app from "./app.js";
import config from "./config/index.js";
import { initSocket } from "./socket/index.js";

const port = config.port || 5000;

/**
 * Main entry point for the server. This function starts the server and
 * sets up error handling. The server will listen on the port specified
 * in the config object, or port 5000 if no port is specified.
 *
 * If an error is encountered while starting the server, the server will
 * log the error to the console and exit with a non-zero status code.
 *
 * This function should be called once the config object has been loaded.
 */

async function main() {
  const server: Server = http.createServer(app);
  initSocket(server);

  server.listen(Number(port), "0.0.0.0", () => {
    console.log(`Server running 🚀🚀 on => port  ${port}`);
  });

  server.on("error", (error: Error) => {
    console.log("Server error => ", error.message);
    process.exit(1);
  });
}

if (process.env.NODE_ENV !== "production") {
  main();
}

export default app;
