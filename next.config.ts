import type { NextConfig } from 'next';

// GitHub Actions sets GITHUB_ACTIONS=true automatically.
// We need basePath so assets resolve correctly under /spladeviz/.
const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';

const nextConfig: NextConfig = {
  output: 'export',
  basePath: isGitHubActions ? '/spladeviz' : '',
  assetPrefix: isGitHubActions ? '/spladeviz/' : '',
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'sharp$': false,
        'onnxruntime-node$': false,
      };
    }
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource',
    });
    return config;
  },
};

export default nextConfig;
