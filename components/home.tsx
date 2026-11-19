"use client";
import { MotionFilm } from "./motion-film";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  ShieldCheck,
  CalendarDays,
  Wallet,
  Camera,
  Tractor,
  HardHat,
  Truck,
  Monitor,
  PartyPopper,
  Search,
  Check,
  Star,
} from "lucide-react";
import { EquipmentCard } from "./equipment-card";
import { categories, type Equipment } from "@/lib/types";
const icons = [HardHat, Camera, Truck, Tractor, Monitor, PartyPopper];
const reviews = [
  {
    name: "Maya",
    comment:
      "Finding the right camera for a weekend project should be this simple.",
  },
  {
    name: "Daniel",
    comment: "Clear rental terms help me plan a project with more confidence.",
  },
  {
    name: "Ayesha",
    comment: "Comparing local equipment in one place saves valuable time.",
  },
  {
    name: "Omar",
    comment: "Flexible rental periods make occasional projects more practical.",
  },
];
export function HomeView({
  items,
  unavailable,
}: {
  items: Equipment[];
  unavailable: boolean;
}) {
  const reduced = useReducedMotion();
  const reveal = {
    initial: { opacity: 1, y: 0 },
    whileInView: { opacity: 1, y: reduced ? 0 : [10, 0] },
    viewport: { once: true },
    transition: { duration: 0.5 },
  };
  return (
    <>
      <section className="hero premium-hero">
        <div className="container hero-grid">
          <motion.div {...reveal} className="hero-copy">
            <p className="eyebrow">
              <span className="tiny-line" /> EQUIPMENT FOR WHAT’S NEXT
            </p>
            <h1>
              Big ideas.
              <br />
              The right <em>equipment.</em>
            </h1>
            <p className="hero-description">
              From a weekend shoot to your next big build. Find equipment
              nearby, rent on your terms, and bring your plans to life.
            </p>
            <p className="demo-note">
              PORTFOLIO PREVIEW | SYNTHETIC DEMONSTRATION INVENTORY
            </p>
            <div className="hero-actions">
              <Link className="btn btn-primary" href="/equipment">
                Find your equipment <ArrowUpRight size={18} />
              </Link>
              <a className="text-link" href="#how-it-works">
                See how it works
              </a>
            </div>
            <div className="hero-assurances">
              <span>
                <Check size={15} /> Flexible rental periods
              </span>
              <span>
                <Check size={15} /> Secure checkout
              </span>
            </div>
          </motion.div>
          <motion.div {...reveal} className="hero-visual">
            <MotionFilm
              name="hero-equipment-orbit"
              title="Orbiting equipment in a sculptural three-dimensional study"
              hero
            />
            <div className="hero-image-label">
              <span className="label-icon">
                <HardHat />
              </span>
              <div>
                <strong>A tool for every ambition.</strong>
                <span>Rent it. Make it happen.</span>
              </div>
              <ArrowUpRight />
            </div>
            <div className="hero-caption">BUILD SOMETHING WORTH SHARING</div>
          </motion.div>
        </div>
      </section>
      <div className="category-strip">
        <div className="container">
          <span>LESS OWNING. MORE DOING.</span>
          <p>For makers. For builders. For the moments that matter.</p>
          <ArrowUpRight />
        </div>
      </div>
      <section className="section container" id="categories">
        <div className="section-heading">
          <div>
            <p className="eyebrow">FIND YOUR STARTING POINT</p>
            <h2>What’s your next project?</h2>
          </div>
          <Link className="text-link" href="/equipment">
            Explore all equipment <ArrowUpRight size={17} />
          </Link>
        </div>
        <motion.div {...reveal} className="category-grid">
          {categories.map((name, i) => {
            const Icon = icons[i];
            return (
              <Link
                href={"/equipment?category=" + encodeURIComponent(name)}
                className="category-tile"
                key={name}
              >
                <Icon size={28} strokeWidth={1.4} />
                <span>{name}</span>
                <ArrowUpRight size={15} />
              </Link>
            );
          })}
        </motion.div>
      </section>
      <section className="section section-soft">
        <div className="container">
          <div className="section-heading">
            <div>
              <p className="eyebrow">READY WHEN YOU ARE</p>
              <h2>Equipment. Possibilities.</h2>
              <p>Browse approved listings for your next rental.</p>
            </div>
            <Link href="/equipment" className="btn btn-outline">
              View all equipment <ArrowUpRight size={17} />
            </Link>
          </div>
          <motion.div {...reveal} className="equipment-grid">
            {items.map((item) => (
              <EquipmentCard item={item} key={item.id} />
            ))}
          </motion.div>
          {!items.length && (
            <div className="empty-state">
              <Search size={30} />
              <h3>
                {unavailable
                  ? "We couldn’t load equipment right now"
                  : "Fresh possibilities are on their way"}
              </h3>
              <p>
                {unavailable
                  ? "Please try again shortly. Your account and existing bookings are unaffected."
                  : "Approved equipment will appear here as owners add their listings."}
              </p>
              <Link href="/equipment" className="text-link">
                Browse equipment <ArrowUpRight size={16} />
              </Link>
            </div>
          )}
        </div>
      </section>
      <section className="section container benefits">
        <div>
          <p className="eyebrow">A BETTER WAY TO RENT</p>
          <h2>
            Less hassle.
            <br />
            More getting things done.
          </h2>
          <p>
            Access equipment without the commitment of buying it. Keep your
            focus on the project ahead.
          </p>
        </div>
        <div className="benefit-grid">
          {[
            [
              Wallet,
              "Pay for what you need",
              "Rental pricing makes occasional equipment easier to access.",
            ],
            [
              ShieldCheck,
              "Owners, clearly identified",
              "Know who you’re renting from and review each listing’s terms.",
            ],
            [
              CalendarDays,
              "Time on your terms",
              "Choose daily, weekly, or monthly rentals to fit your plans.",
            ],
            [
              Check,
              "Secure payments",
              "Complete your rental through Stripe’s hosted checkout.",
            ],
          ].map(([Icon, title, description]) => {
            const I = Icon as typeof Wallet;
            return (
              <article key={String(title)}>
                <I size={25} />
                <h3>{String(title)}</h3>
                <p>{String(description)}</p>
              </article>
            );
          })}
        </div>
      </section>
      <section className="section dark-section" id="how-it-works">
        <div className="container">
          <p className="eyebrow">FROM IDEA TO IN YOUR HANDS</p>
          <h2>Make your next move.</h2>
          <div className="process-composition">
            <MotionFilm
              name="how-it-works"
              title="A three-dimensional study of the rental process"
            />
            <div className="steps-grid">
              {[
                [
                  "01",
                  "Find your fit",
                  "Search by category, location, budget, and rental period.",
                ],
                [
                  "02",
                  "Plan the details",
                  "Check availability, choose your dates, and review the rental terms.",
                ],
                [
                  "03",
                  "Book with confidence",
                  "Complete secure checkout and track the rental in your dashboard.",
                ],
              ].map(([n, title, text]) => (
                <article key={n}>
                  <span className="step-number">{n}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="section container">
        <div className="section-heading">
          <div>
            <p className="eyebrow">A COMMUNITY IN THE MAKING</p>
            <h2>Built around real possibilities.</h2>
          </div>
          <p className="review-disclosure">
            Illustrative community perspectives.
            <br />
            Not verified customer testimonials.
          </p>
        </div>
        <div className="review-grid">
          {reviews.map((r) => (
            <article className="review" key={r.name}>
              <div
                className="stars"
                role="img"
                aria-label="Illustrative rating: 5 out of 5"
              >
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} size={14} fill="currentColor" />
                ))}
              </div>
              <blockquote>“{r.comment}”</blockquote>
              <strong>{r.name}</strong>
              <small>Illustrative reviewer</small>
            </article>
          ))}
        </div>
      </section>
      <section className="section container">
        <div className="owner-callout">
          <MotionFilm
            name="precision-equilibrium"
            title="Equipment balanced in a precision equilibrium sculpture"
          />
          <div>
            <p className="eyebrow">HAVE EQUIPMENT SITTING IDLE?</p>
            <h2>Put it to work.</h2>
            <p>
              Join the community and make your equipment part of someone’s next
              big idea.
            </p>
          </div>
          <Link href="/register" className="btn btn-primary">
            Join Equipora <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>
    </>
  );
}
