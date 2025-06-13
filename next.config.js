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
