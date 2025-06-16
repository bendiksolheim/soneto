/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: [
      "api.mapbox.com",
      "a.tiles.mapbox.com",
      "b.tiles.mapbox.com",
      "c.tiles.mapbox.com",
    ],
  },
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://eu-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://eu.i.posthog.com/:path*",
      },
      {
        source: "/ingest/decide",
        destination: "https://eu.i.posthog.com/decide",
      },
    ];
  },
  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
};

// webpack: (config) => {
//   // Support for mapbox-gl which uses worker-loader
//   config.module.rules.push({
//     test: /mapbox-gl/,
//     use: {
//       loader: 'babel-loader',
//       options: {
//         presets: ['@babel/preset-env'],
//       },
//     },
//   });
//   return config;
// },

module.exports = nextConfig;
