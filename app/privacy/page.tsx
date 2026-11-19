import Link from "next/link";
export default function Page() {
  return (
    <article className="container section policy-page">
      <p className="eyebrow">EQUIPORA | DEMO DISCLOSURE</p>
      <h1>Privacy & demonstration data</h1>
      <p>
        This is an Equipora portfolio demonstration. Local accounts, inventory
        and rental examples are synthetic. Authentication data is used for
        sign-in and access control. Images may be served from third-party
        providers; see image credits. Never enter sensitive personal information
        into demonstration forms. Hosted Checkout uses Stripe test mode; do not
        use a real card. These notes describe the demo, not an approved
        production privacy policy.
      </p>
      <Link className="text-link" href="/">
        Back to Equipora
      </Link>
    </article>
  );
}
