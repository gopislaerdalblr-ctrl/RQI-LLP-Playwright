module.exports = {
  default: {
    paths: ["src/features/**/*.feature"],
    requireModule: ["ts-node/register"],

    // ✅ Only glue code (steps + support)
    require: ["src/support/**/*.ts", "src/steps/**/*.ts"],

    publishQuiet: true,
    timeout: 120000,

    // ✅ Parallel-safe: each worker writes its own json file
    format: [
      "progress-bar",
      `json:reports/_tmp/cucumber-worker-${process.env.CUCUMBER_WORKER_ID || 0}.json`,
    ],
  },
};
