"use client";

import { useMemo, useState } from "react";

type AnalysisResult = {
  verdict: "legit" | "ghost_job" | "scam" | "suspicious";
  confidence: number;
  reasons: string[];
  red_flags: string[];
  summary: string;
  advice: string;
  hr_translation: {
    original: string;
    meaning: string;
  }[];
  who_should_apply: {
    recommended_roles: string[];
    skill_level: string;
    apply_if: string[];
    do_not_apply_if: string[];
  };
};

type ApiError = {
  message: string;
  details?: string;
  status?: number;
};

const verdictLabels: Record<AnalysisResult["verdict"], string> = {
  legit: "Legit Job",
  ghost_job: "Ghost Job",
  scam: "Scam",
  suspicious: "Suspicious"
};

const sampleText =
  "Paste the full job description here. Include the title, company, responsibilities, requirements, salary, benefits, recruiter message, and application instructions if available.";

export default function Home() {
  const [jobText, setJobText] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [rawResult, setRawResult] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const verdictTone = useMemo(() => {
    if (!result) return "";
    if (result.verdict === "legit") return "toneGood";
    if (result.verdict === "suspicious") return "toneWarn";
    return "toneBad";
  }, [result]);

  async function analyzeJob() {
    const trimmed = jobText.trim();
    if (!trimmed) {
      setError({ message: "Paste a job description before analyzing." });
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setRawResult("");
    setCopied(false);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ jobText: trimmed })
      });

      const payload = await response.json();

      if (!response.ok) {
        throw {
          message: payload.error || "Unable to analyze this job post.",
          details: payload.details,
          status: payload.status
        };
      }

      setResult(payload.result);
      setRawResult(JSON.stringify(payload.result, null, 2));
    } catch (err) {
      const apiError = err as Partial<ApiError>;
      setError({
        message: apiError.message || "Something went wrong.",
        details: apiError.details,
        status: apiError.status
      });
    } finally {
      setLoading(false);
    }
  }

  async function copyResult() {
    if (!rawResult) return;
    await navigator.clipboard.writeText(rawResult);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function resetAnalysis() {
    setJobText("");
    setResult(null);
    setRawResult("");
    setError(null);
    setCopied(false);
  }

  return (
    <main className="pageShell">
      <section className="hero">
        <div>
          <p className="eyebrow">AI HR fraud detector</p>
          <h1>Ghost Job Detector</h1>
          <p className="intro">
            Decode job posts before you waste time applying. Get a verdict,
            hidden HR meaning, red flags, and who should actually apply.
          </p>
        </div>
        <div className="heroStats" aria-label="Features">
          <span>Ghost jobs</span>
          <span>Scams</span>
          <span>HR language</span>
        </div>
      </section>

      <section className="workspace" aria-label="Analyzer">
        <div className="inputPanel">
          <div className="panelHeader">
            <div>
              <p className="sectionLabel">Input</p>
              <h2>Paste the job post</h2>
            </div>
            <span>{jobText.trim().length} chars</span>
          </div>

          <textarea
            id="job-description"
            value={jobText}
            onChange={(event) => setJobText(event.target.value)}
            placeholder={sampleText}
            rows={15}
          />

          <div className="actions">
            <button type="button" onClick={analyzeJob} disabled={loading}>
              {loading ? "Analyzing..." : "Analyze Job"}
            </button>
            {(result || error) && !loading ? (
              <button type="button" className="secondaryButton" onClick={resetAnalysis}>
                Analyze Another Job
              </button>
            ) : null}
          </div>
        </div>

        <aside className="sidePanel" aria-label="What the app checks">
          <p className="sectionLabel">Checks</p>
          <ul>
            <li>Fake urgency, vague company details, payment tricks</li>
            <li>Ghost-job signals like evergreen roles and weak hiring intent</li>
            <li>Corporate phrases that hide workload or chaos</li>
            <li>Real seniority level and candidate fit</li>
          </ul>
        </aside>
      </section>

      {error ? <ErrorPanel error={error} /> : null}
      {loading ? <LoadingSkeleton /> : null}
      {result ? (
        <ResultReport
          result={result}
          rawResult={rawResult}
          verdictTone={verdictTone}
          copied={copied}
          onCopy={copyResult}
          onReset={resetAnalysis}
        />
      ) : null}

      <footer>
        <p>&copy; 2026 Mohammad Ali Abdul Wahed. All rights reserved.</p>
        <div className="socialLinks">
          <a
            href="https://www.linkedin.com/in/mohammad-ali-abd-al-wahed"
            target="_blank"
            rel="noreferrer"
          >
            &#128279; LinkedIn
          </a>
          <a href="https://github.com/aliabdm" target="_blank" rel="noreferrer">
            &#128187; GitHub
          </a>
          <a href="https://medium.com/@aliabdm" target="_blank" rel="noreferrer">
            &#128221; Medium
          </a>
          <a
            href="https://dev.to/maliano63717738"
            target="_blank"
            rel="noreferrer"
          >
            &#9997;&#65039; Dev.to
          </a>
          <a
            href="https://senior-mohammad-ali.vercel.app/"
            target="_blank"
            rel="noreferrer"
          >
            Portfolio
          </a>
        </div>
      </footer>
    </main>
  );
}

function ResultReport({
  result,
  rawResult,
  verdictTone,
  copied,
  onCopy,
  onReset
}: {
  result: AnalysisResult;
  rawResult: string;
  verdictTone: string;
  copied: boolean;
  onCopy: () => void;
  onReset: () => void;
}) {
  return (
    <section className="report" aria-label="Analysis result">
      <div className={`verdictStrip ${verdictTone}`}>
        <div>
          <p className="sectionLabel">Verdict</p>
          <h2>{verdictLabels[result.verdict]}</h2>
          <p>{result.summary || "No summary returned."}</p>
        </div>
        <div className="scoreBlock">
          <strong>{Math.round(result.confidence * 100)}%</strong>
          <span>confidence</span>
          <div className="confidenceTrack" aria-hidden="true">
            <div
              className="confidenceFill"
              style={{
                width: `${Math.max(0, Math.min(1, result.confidence)) * 100}%`
              }}
            />
          </div>
        </div>
      </div>

      <div className="reportToolbar">
        <button type="button" onClick={onCopy}>
          {copied ? "Copied JSON" : "Copy JSON"}
        </button>
        <button type="button" onClick={onReset}>
          Reset
        </button>
      </div>

      <div className="reportGrid">
        <article className="reportCard spanTwo">
          <div className="cardTitle">
            <p className="sectionLabel">Card 1</p>
            <h3>Risk Signals</h3>
          </div>
          <div className="splitList">
            <div>
              <h4>Red flags</h4>
              <BulletList items={result.red_flags} empty="No red flags found." />
            </div>
            <div>
              <h4>Reasoning</h4>
              <BulletList items={result.reasons} empty="No reasons returned." />
            </div>
          </div>
          <div className="adviceBox">
            <span>Advice</span>
            <p>{result.advice || "No advice returned."}</p>
          </div>
        </article>

        <article className="reportCard">
          <div className="cardTitle">
            <p className="sectionLabel">Card 2</p>
            <h3>HR Reality Translator</h3>
          </div>
          {result.hr_translation.length ? (
            <div className="translationList">
              {result.hr_translation.map((item, index) => (
                <div className="translationRow" key={`${item.original}-${index}`}>
                  <span>{item.original}</span>
                  <p>{item.meaning}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="emptyState">No coded HR phrases were obvious.</p>
          )}
        </article>

        <article className="reportCard spanTwo">
          <div className="cardTitle">
            <p className="sectionLabel">Card 3</p>
            <h3>Who Should Apply</h3>
          </div>
          <div className="profileLine">
            <span>Real seniority</span>
            <strong>{result.who_should_apply.skill_level}</strong>
          </div>
          <div className="tagList">
            {result.who_should_apply.recommended_roles.length ? (
              result.who_should_apply.recommended_roles.map((role, index) => (
                <span key={`${role}-${index}`}>{role}</span>
              ))
            ) : (
              <span>Role unclear</span>
            )}
          </div>
          <div className="splitList">
            <div>
              <h4>Apply if</h4>
              <BulletList
                items={result.who_should_apply.apply_if}
                empty="No apply-if guidance returned."
              />
            </div>
            <div>
              <h4>Do not apply if</h4>
              <BulletList
                items={result.who_should_apply.do_not_apply_if}
                empty="No do-not-apply guidance returned."
              />
            </div>
          </div>
        </article>
      </div>

      <details className="jsonDetails">
        <summary>View raw JSON</summary>
        <pre>{rawResult}</pre>
      </details>
    </section>
  );
}

function ErrorPanel({ error }: { error: ApiError }) {
  return (
    <section className="errorPanel" aria-live="polite">
      <div>
        <p className="sectionLabel">Request failed</p>
        <h2>{error.message}</h2>
        {error.status ? <p>Status: {error.status}</p> : null}
        {error.details ? <pre>{error.details}</pre> : null}
      </div>
    </section>
  );
}

function BulletList({
  items,
  empty
}: {
  items: string[];
  empty: string;
}) {
  if (!items.length) {
    return <p className="emptyState">{empty}</p>;
  }

  return (
    <ul className="compactList">
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  );
}

function LoadingSkeleton() {
  return (
    <section className="skeletonPanel" aria-label="Loading analysis">
      <div className="skeletonHero" />
      <div className="skeletonGrid">
        {[0, 1, 2].map((item) => (
          <article className="skeletonCard" key={item}>
            <span />
            <strong />
            <p />
            <p />
            <p />
          </article>
        ))}
      </div>
    </section>
  );
}
