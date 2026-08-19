/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  // 只测不依赖 @raycast/api 的纯逻辑模块（该包在 Node 下无法直接 require）
  testMatch: ["<rootDir>/src/**/*.test.ts"],
  passWithNoTests: true,
};
