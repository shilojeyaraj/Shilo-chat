/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Exclude Node.js modules from client bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };

      // Aggressively exclude onnxruntime-node from client bundle
      config.resolve.alias = {
        ...config.resolve.alias,
        'onnxruntime-node': false,
      };

      // Ignore ALL .node files (native bindings) - MUST be first rule
      config.module.rules = [
        {
          test: /\.node$/,
          use: 'ignore-loader',
        },
        ...config.module.rules,
      ];

      // Replace onnxruntime-node with empty module
      const webpack = require('webpack');
      const path = require('path');
      config.plugins = config.plugins || [];
      
      const emptyModulePath = path.resolve(__dirname, 'lib/utils/empty-module.js');
      
      // Replace onnxruntime-node package
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /^onnxruntime-node$/,
          emptyModulePath
        )
      );
      
      // Replace onnxruntime-node subpaths
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /^onnxruntime-node\//,
          emptyModulePath
        )
      );
    }
    
    return config;
  },
};

module.exports = nextConfig;

