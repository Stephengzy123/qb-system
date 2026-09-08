import path from "node:path";
const config = {outputFileTracingRoot:path.resolve(import.meta.dirname, "../.."),devIndicators:false as const,agentRules:false};
export default config;
