"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="container section empty-state" role="alert">
      <p className="eyebrow">LET’S TRY THAT AGAIN</p>
      <h1>Something didn’t load.</h1>
      <p>
        Please try again. You can review confirmed rentals in your dashboard.
      </p>
      <button className="btn btn-primary" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
