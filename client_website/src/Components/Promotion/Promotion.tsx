import React, { type CSSProperties } from 'react';
import './promotions.css';

/* ---------- Types ---------- */
interface PromoBanner {
  tag?: string;
  title: string;
  subtitle?: string;
  button: string;
  bg: string;
  textLight?: boolean;
  image: string;
}

interface NewItem {
  name: string;
  image: string;
}

/* ---------- Data ---------- */
const promoBanners: PromoBanner[] = [
  {
    tag: "2X COOLING",
    title: "Deep clean, zero hassle",
    subtitle: "Foam jet AC service",
    button: "Book now",
    bg: "#f5f5f5",
    image:
      "https://images.unsplash.com/photo-1581578731548-c64695cc6952",
  },
  {
    title: "Elevate your home this festive season",
    subtitle: "Home painting",
    button: "Book now",
    bg: "#6b4a3a",
    textLight: true,
    image:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c",
  },
  {
    tag: "Sale live",
    title: "NATIVE RO Water Purifiers",
    button: "Buy now",
    bg: "#000",
    textLight: true,
    image:
      "https://images.unsplash.com/photo-1580910051074-7bda3b11b17d",
  },
];

const newItems: NewItem[] = [
  {
    name: "Native Water Purifier",
    image:
      "https://images.unsplash.com/photo-1580910051074-7bda3b11b17d",
  },
  {
    name: "Native Smart Locks",
    image:
      "https://images.unsplash.com/photo-1616594039964-ae9021a400a0",
  },
  {
    name: "Laptop",
    image:
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8",
  },
  {
    name: "AC",
    image:
      "https://images.unsplash.com/photo-1581578731548-c64695cc6952",
  },
];

/* ---------- Component ---------- */
const PromoSection: React.FC = () => {
  return (
    <section className="promo-wrapper">
      {/* Promo Banners */}
      <div className="promo-row">
        {promoBanners.map((item, index) => (
          <div
            key={index}
            className={`promo-card ${item.textLight ? 'light' : ''}`}
            style={{ '--promo-bg': item.bg } as CSSProperties}
          >
            <div className="promo-content">
              {item.tag && <span className="promo-tag">{item.tag}</span>}
              <h3>{item.title}</h3>
              {item.subtitle && <p>{item.subtitle}</p>}
              <button>{item.button}</button>
            </div>

            <img src={item.image} alt={item.title} />
          </div>
        ))}
      </div>

      {/* New & Noteworthy */}
      <h2 className="section-title">New and noteworthy</h2>

      <div className="new-grid">
        {newItems.map((item, index) => (
          <div key={index} className="new-card">
            <img src={item.image} alt={item.name} />
            <p>{item.name}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default PromoSection;
