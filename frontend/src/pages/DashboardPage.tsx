import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowTopRightOnSquareIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { OrdersAPI, TechniciansAPI } from '../services/adminApi';
import type { Order, TechnicianSummary } from '../types';
import { formatDateTime } from '../utils/format';

const CLOSED_STATUSES = new Set(['completed', 'cancelled']);

export const DashboardPage = () => {
  const { data: orders = [], isLoading: loadingOrders } = useQuery<Order[]>({
    queryKey: ['orders', 'dashboard'],
    queryFn: () => OrdersAPI.list()
  });

  const { data: technicians = [], isLoading: loadingTechnicians } = useQuery<TechnicianSummary[]>({
    queryKey: ['technicians', 'dashboard'],
    queryFn: () => TechniciansAPI.list()
  });

  const metrics = useMemo(() => {
    const openOrders = loadingOrders ? null : orders.filter((order) => !CLOSED_STATUSES.has(order.status));
    const pendingAssignments = openOrders ? openOrders.filter((order) => order.status === 'pending_assignment') : null;
    const activeTechnicians = loadingTechnicians ? null : technicians.filter((tech) => tech.todayAttendance?.status === 'present');

    return [
      {
        label: 'Open Orders',
        value: openOrders?.length.toString() ?? '—',
        delta: pendingAssignments ? `${pendingAssignments.length} awaiting assignment` : 'fetching',
        accent: openOrders ? 'text-slate-900' : 'text-slate-400',
        link: '/orders'
      },
      {
        label: 'Pending Assignments',
        value: pendingAssignments?.length.toString() ?? '—',
        delta:
          openOrders && pendingAssignments ? `${openOrders.length - pendingAssignments.length} already scheduled` : 'fetching',
        accent: pendingAssignments ? (pendingAssignments.length ? 'text-amber-600' : 'text-emerald-600') : 'text-slate-400',
        link: '/orders?status=pending_assignment'
      },
      {
        label: 'Technicians Active',
        value: activeTechnicians?.length.toString() ?? '—',
        delta: activeTechnicians ? `${technicians.length} on roster` : 'fetching',
        accent: activeTechnicians ? (activeTechnicians.length ? 'text-emerald-600' : 'text-rose-600') : 'text-slate-400',
        link: '/technicians'
      }
    ];
  }, [orders, technicians, loadingOrders, loadingTechnicians]);

  const overdueAssignments = useMemo(
    () =>
      orders
        .filter((order) => order.status === 'pending_assignment' && new Date(order.timeWindowStart).getTime() < Date.now())
        .sort((a, b) => new Date(a.timeWindowStart).getTime() - new Date(b.timeWindowStart).getTime()),
    [orders]
  );

  const needsReschedule = useMemo(
    () => orders.filter((order) => order.status === 'rescheduled' || order.status === 'awaiting_customer_approval'),
    [orders]
  );

  const inactiveTechnicians = useMemo(
    () => technicians.filter((tech) => !tech.todayAttendance || tech.todayAttendance.status !== 'present'),
    [technicians]
  );

  const alerts = [
    ...overdueAssignments.slice(0, 3).map((order) => ({
      id: order._id,
      text: `${formatOrderLabel(order)} missed ${formatDateTime(order.timeWindowStart)} without technician assigned.`,
      link: `/orders?selected=${order._id}`
    })),
    ...needsReschedule.slice(0, 2).map((order) => ({
      id: `${order._id}-reschedule`,
      text: `${formatOrderLabel(order)} awaiting reschedule confirmation.`,
      link: `/orders?selected=${order._id}`
    }))
  ];

  const nextActions = [
    overdueAssignments[0]
      ? {
          text: pendingActionText(overdueAssignments[0], 'Assign technician'),
          link: `/orders?selected=${overdueAssignments[0]._id}`
        }
      : null,
    inactiveTechnicians.length
      ? {
          text: `Mark attendance for ${inactiveTechnicians[0].name} to include them in assignments.`,
          link: `/technicians?selected=${inactiveTechnicians[0].id}`
        }
      : null,
    needsReschedule.length
      ? {
          text: `Confirm reschedule for ${needsReschedule[0].customer.name} (${needsReschedule[0].serviceItem?.name}).`,
          link: `/orders?selected=${needsReschedule[0]._id}`
        }
      : null
  ].filter(Boolean) as { text: string; link: string }[];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.5em] text-slate-400">Mission Control</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Realtime Ops Snapshot</h1>
        </div>
        <Link
          to="/orders"
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-card"
        >
          Review Orders
          <ArrowTopRightOnSquareIcon className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {metrics.map((metric) => (
          <Link key={metric.label} to={metric.link} className="group">
            <Card className="transition-all duration-200 group-hover:shadow-lg group-hover:border-slate-200 group-hover:-translate-y-0.5">
              <div className="flex items-start justify-between">
                <p className="text-sm font-medium text-slate-500">{metric.label}</p>
                <ArrowRightIcon className="h-4 w-4 text-slate-300 transition-colors group-hover:text-slate-500" />
              </div>
              <p className={`mt-3 text-3xl font-semibold ${metric.accent}`}>{metric.value}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.3em] text-slate-400">{metric.delta}</p>
            </Card>
          </Link>
        ))}
      </div>

      <Card title="Operations Heatmap">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-600">Critical Alerts</p>
              {alerts.length > 0 && (
                <Link to="/orders" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
                  View all →
                </Link>
              )}
            </div>
            <ul className="mt-4 space-y-3 text-sm">
              {alerts.length === 0 && <li className="text-slate-400">All clear. No SLA breaches detected.</li>}
              {alerts.map((alert) => (
                <li key={alert.id}>
                  <Link
                    to={alert.link}
                    className="text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  >
                    • {alert.text}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-100 p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-600">Next Best Actions</p>
              {nextActions.length > 0 && (
                <Link to="/orders" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
                  View all →
                </Link>
              )}
            </div>
            <ol className="mt-4 space-y-3 text-sm">
              {nextActions.length === 0 && <li className="text-slate-400">You're fully caught up for now.</li>}
              {nextActions.map((action, idx) => (
                <li key={action.text}>
                  <Link
                    to={action.link}
                    className="text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  >
                    {idx + 1}. {action.text}
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Card>
    </div>
  );
};

const pendingActionText = (order?: Order, prefix = 'Update order') => {
  if (!order) return null;
  return `${prefix} for ${formatOrderLabel(order)} scheduled ${formatDateTime(order.timeWindowStart)}.`;
};

const formatOrderLabel = (order: Order) => {
  const customerName = order.customer?.name ?? 'Customer';
  const serviceName = order.serviceItem?.name ?? 'Service';
  return `${customerName} (${serviceName})`;
};
