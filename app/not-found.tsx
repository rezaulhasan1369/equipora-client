import Link from "next/link";
export default function NotFound() {
  return (
    <div className="container section empty-state">
      <p className="eyebrow">404</p>
      <h1>This page isn’t available.</h1>
      <p>Let’s get you back to your next project.</p>
      <Link href="/equipment" className="btn btn-primary">
        Explore equipment
      </Link>
    </div>
  );
}
