# AI Risk Manager Frontend

A React frontend for testing the AI Risk Manager fraud detection API.

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
# Copy the example env file
cp .env.example .env

# Edit .env to point to your backend
# For local backend: VITE_API_URL=http://localhost:8000
# For production: VITE_API_URL=https://your-backend.onrender.com
```

3. Start the development server:
```bash
npm run dev
```

4. Open http://localhost:5173 in your browser

## Deployment

### Vercel Deployment

1. Push your code to GitHub
2. Import the project in Vercel
3. Set the `VITE_API_URL` environment variable to your Render backend URL
4. Deploy

The `vercel.json` file is configured for Vercel deployment.

## Features

- Transaction form with all required fields
- Real-time risk analysis visualization
- Color-coded decision badges (ALLOW/FLAG/BLOCK)
- Risk score progress bars
- LLM-generated explanations
- Recommended actions display
- Responsive design

## API Integration

The frontend currently uses a test endpoint (`/test-fraud`) that doesn't require authentication for development purposes. For production:

1. Update the API endpoint in `App.tsx` to use `/v1/fraud/detect`
2. Implement proper authentication (JWT or API key)
3. Add error handling for authentication failures

## Tech Stack

- React 18 with TypeScript
- Vite for build tooling
- Axios for HTTP requests
- CSS3 with modern features