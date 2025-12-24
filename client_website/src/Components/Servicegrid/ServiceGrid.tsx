import React, { useState } from 'react';
import './ServiceGrid.css';
import type { ServiceItem } from '../../types/services';
import { customerApi } from '../../services/customerApi';

interface ServicesGridProps {
  title: string;
  description?: string;
  services: ServiceItem[];
  loading?: boolean;
}

const ServicesGrid: React.FC<ServicesGridProps> = ({ title, description, services, loading }) => {
  const isEmpty = !services?.length && !loading;
  const [slotMessage, setSlotMessage] = useState<string | null>(null);
  const [slotLoading, setSlotLoading] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);

  const handleScheduleVisit = async () => {
    setSlotError(null);
    setSlotMessage(null);
    try {
      setSlotLoading(true);
      const slots = await customerApi.listTimeSlots();
      const firstDay = slots?.[0];
      const firstSlot = firstDay?.slots?.[0];
      if (firstDay && firstSlot) {
        setSlotMessage(`Next available: ${firstDay.date} • ${firstSlot.label} (${firstSlot.start} - ${firstSlot.end})`);
      } else {
        setSlotMessage('No live slots returned. Please try again or contact support.');
      }
    } catch (err) {
      setSlotError('Could not fetch available slots. Please login and try again.');
    } finally {
      setSlotLoading(false);
    }
  };

  return (
    <section className="services-wrapper">
      <div className="services-header">
        <div>
          <p className="eyebrow">Recommended</p>
          <h2>{title}</h2>
          {description && <p className="subhead">{description}</p>}
        </div>
        <button className="see-all" onClick={handleScheduleVisit} disabled={slotLoading}>
          {slotLoading ? 'Checking slots...' : 'Schedule a visit'}
        </button>
      </div>

      {loading && (
        <div className="services-grid skeleton-grid">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="service-card skeleton" />
          ))}
        </div>
      )}

      {!loading && services.length > 0 && (
        <div className="services-grid">
          {services.map((item, index) => (
            <article key={item._id ?? `${item.name}-${index}`} className="service-card">
              {item.heroImage && <img src={item.heroImage} alt={item.name} loading="lazy" />}

              <div className="service-info">
                {item.badge && <span className="pill">{item.badge}</span>}
                <p className="title">{item.name}</p>

                {item.description && <p className="meta">{item.description}</p>}

                <div className="rating-price">
                  {item.rating && <span className="rating">* {item.rating}</span>}
                  {item.reviews && <span className="meta">{item.reviews} reviews</span>}
                  <span className="price">{item.basePrice ? `₹${item.basePrice}` : 'Get quote'}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {isEmpty && <div className="empty">No services found. Try a different keyword.</div>}

      {(slotMessage || slotError) && (
        <div className={`slot-banner ${slotError ? 'error' : 'success'}`}>
          {slotError ?? slotMessage}
        </div>
      )}
    </section>
  );
};

export default ServicesGrid;
