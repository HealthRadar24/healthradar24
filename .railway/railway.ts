import { defineRailway, github, preserve, project, service } from "railway/iac";

function seedBundle(name: string, cronSchedule: string) {
  return service(name, {
    source: github("HealthRadar24/healthradar24", { branch: "main" }),
    build: {
      builder: "DOCKERFILE",
      dockerfilePath: "Dockerfile.seed-bundles",
      watchPatterns: ["Dockerfile.seed-bundles", "scripts/**", "shared/**"],
    },
    deploy: {
      cronSchedule,
      restartPolicyType: "NEVER",
      startCommand: `node scripts/${name}.mjs`,
    },
    env: {
      NODE_OPTIONS: "--dns-result-order=ipv4first",
      UPSTASH_REDIS_REST_TOKEN: preserve(),
      UPSTASH_REDIS_REST_URL: preserve(),
    },
  });
}

export default defineRailway(() => {
  const bundles = [
    seedBundle("seed-bundle-ecb-eu", "0 6 * * *"),
    seedBundle("seed-bundle-portwatch", "0 * * * *"),
    seedBundle("seed-bundle-static-ref", "0 3 * * 0"),
    seedBundle("seed-bundle-resilience", "0 */6 * * *"),
    seedBundle("seed-bundle-derived-signals", "*/5 * * * *"),
    seedBundle("seed-bundle-climate", "0 */3 * * *"),
    seedBundle("seed-bundle-energy-sources", "30 7 * * *"),
    seedBundle("seed-bundle-macro", "0 8 * * *"),
    seedBundle("seed-bundle-health", "0 * * * *"),
    seedBundle("seed-bundle-market-backup", "*/5 * * * *"),
    seedBundle("seed-bundle-relay-backup", "*/30 * * * *"),
  ];

  return project("healthradar24", {
    resources: bundles,
  });
});
