import http from "node:http";
import { createServer as createViteServer } from "vite";
import { handleTeachApiRequest, loadLocalEnv } from "./teachApi.mjs";
import { handleWatchPixApiRequest } from "./watchPixApi.mjs";

loadLocalEnv();

const host = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT || 5173);

let vite;
const server = http.createServer(async (request, response) => {
  if (request.url?.startsWith("/api/teach/")) {
    await handleTeachApiRequest(request, response);
    return;
  }

  if (request.url?.startsWith("/api/watch/")) {
    await handleWatchPixApiRequest(request, response);
    return;
  }

  vite.middlewares(request, response);
});

vite = await createViteServer({
  appType: "spa",
  server: {
    host,
    middlewareMode: true,
    hmr: { server },
  },
});

server.listen(port, host, () => {
  console.log(`ENGLANTIS dev server running at http://localhost:${port}`);
  console.log("TeachAI API routes are available under /api/teach/*");
  console.log("Watch Pix API route is available at /api/watch/pix");
});
