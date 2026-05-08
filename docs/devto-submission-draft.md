*This is a submission for the [Gemma 4 Challenge: Build with Gemma 4](https://dev.to/challenges/google-gemma-2026-05-06)*

## What I Built

I built **Ghost Job Detector**, a web app that helps job seekers evaluate job postings before applying.

Users paste a job description, and the app analyzes whether the post looks like a legitimate job, ghost job, scam, or suspicious posting. It also highlights red flags, explains the reasoning, translates vague HR language into plain meaning, and suggests who should or should not apply.

The problem it solves is simple: job seekers waste time and expose personal data on unclear, recycled, or suspicious job posts. Ghost Job Detector gives them a fast second opinion before they apply.

Core features:

- Job verdict: legit, ghost job, scam, or suspicious
- Confidence score
- Red flags and reasoning
- HR Reality Translator for phrases like "fast-paced environment" and "wear many hats"
- Who Should Apply section with real seniority and candidate fit
- Copyable structured JSON output
- Clean responsive UI
- Vercel-ready deployment

## Demo

Live demo:

<!-- Add your Vercel URL here -->

Video walkthrough:

<!-- Upload or embed the generated demo video here -->

Screenshots:

<!-- Add cover image or screenshots from docs/promo-success -->

## Code

GitHub repository:

https://github.com/aliabdm/Ghost-Job-Detector

## How I Used Gemma 4

Gemma 4 is the core reasoning engine of Ghost Job Detector.

I used:

- `google/gemma-4-26b-a4b-it:free` as the primary model
- `google/gemma-4-31b-it:free` as the fallback model

I chose the 26B MoE model as the primary model because the app needs strong reasoning, structured analysis, and fast enough response quality for user-facing job evaluation. The task is not just classification; the model has to read subtle hiring language, identify weak signals, infer intent, and return a consistent JSON structure.

The 31B Dense model is used as a fallback when the primary Gemma 4 model is rate-limited or temporarily unavailable. This keeps the project within the Gemma 4 ecosystem while making the app more resilient.

Gemma 4 powers:

- Classification of the job post
- Fraud and ghost-job signal detection
- Explanation of red flags
- HR language translation
- Candidate-fit reasoning
- Consistent structured JSON generation

The model returns a normalized schema:

```json
{
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
```

This made Gemma 4 a good fit because the app needs practical reasoning, careful text interpretation, and reliable structured output rather than simple keyword matching.

<!-- Don't forget to add a cover image if you want! -->
