import { defineRailway, github, project, service } from "railway/iac";

// New Railway services ignore railway.json. This file is what creates the
// service and keeps the build that DEPLOY.md already verified.
export default defineRailway(() => {
  const web = service("coral", {
    source: github("gogsgo/CORAL", { branch: "main" }),
    build:
      "corepack enable && pnpm install --frozen-lockfile && pnpm --filter @coral/web build",
    start: "pnpm --filter @coral/web start",
    healthcheck: "/",
    healthcheckTimeout: 120,
  });

  return project("coral", {
    resources: [web],
  });
});
