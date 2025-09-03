import path from 'node:path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Ensure Next doesn't infer a parent workspace root when multiple lockfiles exist
  outputFileTracingRoot: path.join(process.cwd()),
};
export default nextConfig;
