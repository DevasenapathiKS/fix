import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { PageHeader } from '../../components/layout';
import { Button, Card, Loader, TextField } from '../../components/ui';
import { customerApi } from '../../services/customer-api';
import styles from './ServicesPage.module.css';

export const ServicesPage = () => {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const { data: categories, isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: () => customerApi.listServices()
  });

  const filteredCategories = useMemo(() => {
    if (!keyword) return categories ?? [];
    const lower = keyword.toLowerCase();
    return (
      categories?.map((category) => ({
        ...category,
        services: category.services.filter((service) => service.name.toLowerCase().includes(lower))
      })).filter((category) => category.services.length > 0) ?? []
    );
  }, [categories, keyword]);

  if (isLoading) {
    return <Loader fullscreen label="Loading service catalog" />;
  }

  return (
    <div>
      <PageHeader
        title="Choose a premium service"
        subtitle="Every visit comes with Fixzep's 10-point safety assurance."
        actions={<Button onClick={() => navigate('/booking')}>Book instantly</Button>}
      />

      <div className={styles.searchRow}>
        <TextField label="Search services" placeholder="AC Tune-up, False ceiling, EV charger" value={keyword} onChange={(event) => setKeyword(event.target.value)} fullWidth />
      </div>

      <div className={styles.categoryStack}>
        {filteredCategories.map((category) => (
          <Card key={category._id} elevated header={<div className={styles.categoryHeader}>{category.name}</div>}>
            <p className={styles.categoryDescription}>{category.description}</p>
            <div className={styles.serviceGrid}>
              {category.services.map((service) => (
                <div key={service._id} className={styles.serviceCard}>
                  <div>
                    <p className={styles.serviceName}>{service.name}</p>
                    <p className={styles.serviceMeta}>{service.description}</p>
                  </div>
                  <div className={styles.serviceFooter}>
                    <div className={styles.badge}>
                      <Sparkles size={14} /> {service.badge ?? 'Certified experts'}
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => navigate(`/booking?serviceItem=${service._id}`)}>
                      Schedule
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
