import Link from "next/link";
export default function Page() {
  return (
    <article className="container section policy-page">
      <p className="eyebrow">EQUIPORA | DEMO DISCLOSURE</p>
      <h1>Rental & demonstration terms</h1>
      <p>
        Demonstration inventory is not a real offer of equipment or guaranteed
        availability. Descriptions, quantities, locations and rates are
        illustrative. Rental duration and quantity are validated on the server;
        listing-specific terms appear on equipment details. Payments are
        simulated in Stripe test mode. No genuine booking or commercial service
        is offered by this portfolio preview. Production terms require owner
        review before publication.
      </p>
      <Link className="text-link" href="/">
        Back to Equipora
      </Link>
    </article>
  );
}
