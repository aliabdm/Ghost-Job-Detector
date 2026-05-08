# Ghost Job Detector

Ghost Job Detector is a production-ready Next.js web app that helps job seekers analyze job posts before applying.

Users paste a job description, and the app uses OpenRouter Gemma models to classify the post as:

- `legit`
- `ghost_job`
- `scam`
- `suspicious`

It also explains the reasoning, highlights red flags, translates corporate HR language into plain meaning, and suggests who should or should not apply.

## What The App Does

- Detects ghost-job patterns, scams, and suspicious job postings.
- Flags vague company details, unrealistic expectations, payment tricks, fake urgency, and weak hiring intent.
- Translates HR phrases like "fast-paced environment" or "wear many hats" into real-world meaning.
- Infers the real seniority level and actual candidate fit.
- Shows a confidence score and structured JSON output.
- Includes copy-to-clipboard, loading skeletons, reset flow, and mobile-responsive UI.
- Requires no database, authentication, or separate backend service.

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Vanilla CSS
- OpenRouter API
- Docker for optional local containerized runs
- Vercel-ready deployment

## AI Models

The app uses OpenRouter with Gemma models only.

Primary model:

```text
google/gemma-4-26b-a4b-it:free
```

Fallback order:

```text
google/gemma-4-26b-a4b-it:free
google/gemma-4-31b-it:free
```

If a model is rate-limited or fails, the API silently retries once after 2 seconds, then moves to the next Gemma 4 model. If all Gemma 4 models fail, the user sees a clean busy message.

## Environment Variables

Create `.env.local` for local development:

```bash
OPENROUTER_KEY=sk-or-v1-your-key-here
```

For Vercel, add the same variable in:

```text
Project Settings > Environment Variables
```

Never commit `.env.local`.

## Run Locally Without Docker

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Production build:

```bash
npm run build
npm run start
```

## Run Locally With Docker

Build the image:

```bash
docker build -t ghost-job-detector .
```

Run using `.env.local`:

```bash
docker run --rm -p 3000:3000 --env-file .env.local ghost-job-detector
```

Run by passing the key directly:

```bash
docker run --rm -p 3000:3000 -e OPENROUTER_KEY=sk-or-v1-your-key-here ghost-job-detector
```

Open:

```text
http://localhost:3000
```

## Docker Compose

PowerShell:

```powershell
$env:OPENROUTER_KEY="sk-or-v1-your-key-here"
docker compose up --build
```

Bash:

```bash
OPENROUTER_KEY=sk-or-v1-your-key-here docker compose up --build
```

Stop Docker Compose:

```bash
docker compose down
```

## Restart Local Docker App

If an old container is already using port `3000`, check running containers:

```bash
docker ps
```

Stop the current app container:

```bash
docker stop ghost-job-detector-live
```

Rebuild and run the latest code:

```bash
docker build -t ghost-job-detector .
docker run --rm -d --name ghost-job-detector-live -p 3000:3000 --env-file .env.local ghost-job-detector
```

View logs:

```bash
docker logs -f ghost-job-detector-live
```

Stop it:

```bash
docker stop ghost-job-detector-live
```

## Pull Latest Changes

If the project is already connected to GitHub:

```bash
git pull origin master
```

Then rebuild and restart Docker:

```bash
docker stop ghost-job-detector-live
docker build -t ghost-job-detector .
docker run --rm -d --name ghost-job-detector-live -p 3000:3000 --env-file .env.local ghost-job-detector
```

## Git Commands

Check status:

```bash
git status
```

Add all project files:

```bash
git add .
```

Commit:

```bash
git commit -m "Build Ghost Job Detector"
```

Add a GitHub remote:

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
```

Push to GitHub:

```bash
git push -u origin master
```

## Deploy To Vercel

1. Push the project to GitHub.
2. Import the GitHub repository into Vercel.
3. Add this environment variable in Vercel:

```text
OPENROUTER_KEY
```

4. Deploy.

Vercel will detect Next.js automatically. No Docker is needed on Vercel.

## API Route

The app uses:

```text
POST /api/analyze
```

Request body:

```json
{
  "jobText": "Paste job description here"
}
```

Response shape:

```json
{
  "result": {
    "verdict": "legit | ghost_job | scam | suspicious",
    "confidence": 0.8,
    "reasons": [],
    "red_flags": [],
    "summary": "",
    "advice": "",
    "hr_translation": [],
    "who_should_apply": {
      "recommended_roles": [],
      "skill_level": "",
      "apply_if": [],
      "do_not_apply_if": []
    }
  }
}
```
