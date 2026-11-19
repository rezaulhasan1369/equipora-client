import Link from "next/link";
import credits from "@/public/assets/equipment/credits.json";
export default function Page() {
  return (
    <article className="container section policy-page">
      <p className="eyebrow">EQUIPORA | ASSET PROVENANCE</p>
      <h1>Artwork & image credits.</h1>
      <p>
        The footer, symbol and three motion studies were supplied by the owner.
        Equipment photographs below illustrate synthetic demonstration
        inventory; exact model, capacity and availability are not asserted by a
        photo. Photographs were resized, padded and converted to WebP. Each
        source retains its individual license; no endorsement is implied.
      </p>
      <div className="credits-list">
        {credits.map((item) => (
          <section key={item.id}>
            <h2>{item.id}</h2>
            <p>
              {item.author} | {item.license}
            </p>
            <a href={item.source} target="_blank" rel="noreferrer">
              Original image and attribution
            </a>
            {item.licenseUrl && (
              <a href={item.licenseUrl} target="_blank" rel="noreferrer">
                License
              </a>
            )}
          </section>
        ))}
      </div>
      <Link className="text-link" href="/equipment">
        Explore demo equipment
      </Link>
    </article>
  );
}
