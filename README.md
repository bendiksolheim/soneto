# Soneto

A web application for runners to plan their routes ahead of running. Place markers on a map to design your route, visualize elevation changes, and export your planned route as a GPX file.

## Tech Stack

- Next.js with React and Tailwind CSS
- Mapbox for interactive maps
- Recharts for elevation visualizations
- Node.js v22+

## Getting Started

### Prerequisites

- Node.js v22 or higher
- pnpm (or npm/yarn)
- A Mapbox API key

### Installation

1. Clone the repository:
```bash
git clone git@github.com:bendiksolheim/soneto.git
cd soneto
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:

Create a `.env.local` file in the root directory and add your Mapbox access token:

```env
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token_here
```

To get a Mapbox access token, follow the [Mapbox documentation on creating access tokens](https://docs.mapbox.com/help/getting-started/access-tokens/).

4. Start the development server:
```bash
pnpm dev
```

The application will be available at `http://localhost:3000`.

## Development

- `pnpm dev` - Start the development server
- `pnpm build` - Build the production version
- `pnpm lint` - Run ESLint to check code style
