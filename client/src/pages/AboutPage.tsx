import { motion } from 'framer-motion'
import {
  AcademicCapIcon,
  ShieldCheckIcon,
  Cog6ToothIcon,
  ArrowTrendingUpIcon,
  BuildingOffice2Icon,
  GlobeAltIcon,
  BoltIcon,
  ChartBarIcon,
  MapIcon,
} from '@heroicons/react/24/outline'

const COMPANY_NAME = 'Your Company'
const PARENT_COMPANY = 'Your Parent Company'

export const AboutPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Container */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        {/* 1. About the Company */}
        <section className="mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 shadow-sm">
            <BoltIcon className="h-4 w-4 text-primary-600" /> India’s First AI-Integrated Workforce Ecosystem
          </div>
          <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">About {COMPANY_NAME}</h1>
          <p className="mt-4 max-w-3xl text-gray-700 text-base sm:text-lg leading-relaxed">
            We enable AI-powered workforce transformation across the full lifecycle — training, certification, deployment, and continuous monitoring.
            Our platform focuses on blue-collar and service professionals, creating structured, scalable, and trustworthy services for enterprises and citizens alike.
          </p>
        </section>

        {/* 2. Our Mission (3-Card Grid) */}
        <section className="mb-12 sm:mb-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: 'Empowering Skills',
                points: ['AI-powered training & certification', 'Continuous upskilling & employment pathways'],
                Icon: AcademicCapIcon,
              },
              {
                title: 'Enabling Trust',
                points: ['Verified professionals', 'Transparency, accountability, and reliability'],
                Icon: ShieldCheckIcon,
              },
              {
                title: 'Building the Future',
                points: ['End-to-end workforce ecosystem', 'Inclusive economic growth'],
                Icon: Cog6ToothIcon,
              },
            ].map(({ title, points, Icon }) => (
              <motion.div key={title} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-primary-50 p-2">
                    <Icon className="h-6 w-6 text-primary-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                </div>
                <ul className="mt-4 space-y-2 text-sm text-gray-700">
                  {points.map((p) => (
                    <li key={p} className="leading-relaxed">{p}</li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </section>

        {/* 3. Integrated Verticals */}
        <section className="mb-12 sm:mb-16">
          <h2 className="text-2xl font-bold text-gray-900">Our Integrated Verticals</h2>
          <p className="mt-2 max-w-3xl text-gray-700">A unified ecosystem where training feeds deployment, deployment drives data, and data refines learning — compounding capability and trust.</p>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { title: 'Academy', desc: 'Training & certification for workforce excellence.' },
              { title: 'On-Demand Marketplace', desc: 'Quality-assured services across cities.' },
              { title: 'Enterprise / FM', desc: 'Facility management with predictive operations.' },
              { title: 'Subscription Home Services', desc: 'Reliable recurring services for households.' },
              { title: 'B2B Project Execution', desc: 'Structured delivery for large-scale projects.' },
            ].map((c) => (
              <div key={c.title} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <h3 className="font-semibold text-gray-900">{c.title}</h3>
                <p className="mt-2 text-sm text-gray-700 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 4. Platform Advantage (Hero Image Section) */}
        <section className="mb-12 sm:mb-16">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col items-center text-center">
            <div className="mb-4 inline-flex items-center justify-center rounded-xl bg-primary-50 p-4">
              <Cog6ToothIcon className="h-10 w-10 text-primary-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">The Platform Advantage</h3>
            <p className="mt-3 max-w-3xl text-gray-700">
              A continuous feedback loop across training → deployment → analytics → retraining builds a durable competitive moat and accelerates operational excellence.
            </p>
            <div className="mt-6 h-40 w-full rounded-xl bg-gradient-to-r from-gray-100 to-gray-200" aria-label="Illustration placeholder" />
          </div>
        </section>

        {/* 5. Supporting National Missions */}
        <section className="mb-12 sm:mb-16">
          <h2 className="text-2xl font-bold text-gray-900">Supporting National Missions</h2>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { title: 'Skill India', desc: 'Large-scale skilling with measurable outcomes.', Icon: AcademicCapIcon },
              { title: 'Digital India', desc: 'AI-first, data-driven workforce infrastructure.', Icon: GlobeAltIcon },
              { title: 'Smart Cities Mission', desc: 'Predictive, transparent city services.', Icon: MapIcon },
              { title: 'Startup India', desc: 'Scale-ready platform with strong moat.', Icon: ArrowTrendingUpIcon },
            ].map(({ title, desc, Icon }) => (
              <div key={title} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary-50 p-2"><Icon className="h-5 w-5 text-primary-600" /></div>
                  <h3 className="font-semibold text-gray-900">{title}</h3>
                </div>
                <p className="mt-2 text-sm text-gray-700 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 6. Impact Metrics */}
        <section className="mb-12 sm:mb-16">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {[
                { k: '5K+', v: 'Jobs Created' },
                { k: '50K+', v: 'National Scale Target' },
                { k: '30%', v: 'Efficiency Gain' },
                { k: '100+', v: 'Market Opportunity' },
              ].map(({ k, v }) => (
                <div key={v} className="flex flex-col items-center">
                  <div className="text-3xl font-extrabold text-gray-900">{k}</div>
                  <div className="mt-1 text-sm text-gray-600">{v}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 7. Technology-Driven Excellence */}
        <section className="mb-12 sm:mb-16">
          <h2 className="text-2xl font-bold text-gray-900">Technology-Driven Excellence</h2>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: 'AI Learning & Certification',
                desc: 'Adaptive learning, proctored assessments, and verifiable credentials at scale.',
                Icon: AcademicCapIcon,
              },
              {
                title: 'AI Predictive Operations',
                desc: 'Demand forecasting, workforce routing, and real-time quality monitoring.',
                Icon: ChartBarIcon,
              },
              {
                title: 'Digital Core Platform',
                desc: 'Secure identity, payments, analytics, and API-first integrations.',
                Icon: BuildingOffice2Icon,
              },
            ].map(({ title, desc, Icon }) => (
              <div key={title} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-primary-50 p-2"><Icon className="h-6 w-6 text-primary-600" /></div>
                  <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                </div>
                <p className="mt-3 text-sm text-gray-700 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 8. Strategic Vision & Growth Roadmap */}
        <section className="mb-12 sm:mb-16">
          <h2 className="text-2xl font-bold text-gray-900">Strategic Vision & Growth Roadmap</h2>
          <div className="mt-6 relative">
            <div className="absolute left-1/2 top-0 -ml-px h-full w-0.5 bg-gray-200 hidden md:block" />
            <div className="space-y-8">
              {[
                { title: 'Foundation & Validation', desc: 'Pilot programs, proof of value, early partnerships.' },
                { title: 'Regional Expansion', desc: 'Multi-city deployment with quality and scale.' },
                { title: 'Tech Enhancement & Diversification', desc: 'Advanced AI features, new service verticals.' },
                { title: 'National Dominance & Ecosystem Maturity', desc: 'Pan-India network with strong flywheel effects.' },
              ].map((item, idx) => (
                <div key={item.title} className={`md:grid md:grid-cols-2 md:items-center md:gap-8`}>
                  <div className={`rounded-xl border border-gray-200 bg-white p-6 shadow-sm ${idx % 2 === 0 ? 'md:col-start-1' : 'md:col-start-2'}`}>
                    <h3 className="font-semibold text-gray-900">{item.title}</h3>
                    <p className="mt-2 text-sm text-gray-700 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 9. Flywheel Model */}
        <section className="mb-12 sm:mb-16">
          <h2 className="text-2xl font-bold text-gray-900">Flywheel Model</h2>
          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col items-center">
            <div className="relative h-64 w-64">
              <svg viewBox="0 0 200 200" className="h-full w-full">
                <circle cx="100" cy="100" r="78" className="fill-none stroke-gray-300" strokeWidth="2" />
                <circle cx="100" cy="100" r="48" className="fill-none stroke-primary-400" strokeWidth="3" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="rounded-full bg-primary-600 text-white px-4 py-2 text-sm font-semibold">Continuous Loop</div>
              </div>
              {[
                'Skilled Workforce',
                'Verified Service',
                'Quality Delivery',
                'Customer Feedback',
                'Data Insights',
                'Enhanced Training',
              ].map((label, i) => {
                const angle = (i / 6) * 2 * Math.PI
                const r = 88
                const x = 100 + r * Math.cos(angle)
                const y = 100 + r * Math.sin(angle)
                return (
                  <div key={label} className="absolute -translate-x-1/2 -translate-y-1/2 text-xs font-medium text-gray-700" style={{ left: `${x}px`, top: `${y}px` }}>
                    {label}
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* 10. Market Opportunity */}
        <section className="mb-12 sm:mb-16">
          <h2 className="text-2xl font-bold text-gray-900">Market Opportunity</h2>
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="grid grid-cols-3 gap-4 text-center">
                {[{k:'$300B+',v:'Market Size'},{k:'15%+',v:'Projected Growth'},{k:'500M+',v:'Workforce Potential'}].map(({k,v}) => (
                  <div key={v}>
                    <div className="text-2xl font-extrabold text-gray-900">{k}</div>
                    <div className="mt-1 text-xs text-gray-600">{v}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="h-48 w-full rounded-lg bg-gradient-to-r from-gray-100 to-gray-200" aria-label="India growth illustration placeholder" />
              <p className="mt-3 text-sm text-gray-700">Expanding across Indian metros and Tier-2/3 cities with AI-enabled supply orchestration and demand aggregation.</p>
            </div>
          </div>
        </section>

        {/* 11. Parent Company / Initiative */}
        <section className="mb-12 sm:mb-16">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900">A {PARENT_COMPANY} Initiative</h2>
            <p className="mt-3 max-w-4xl text-gray-700">We are committed to long-term social and economic impact — empowering livelihoods, elevating service quality, and strengthening India’s workforce infrastructure.</p>
          </div>
        </section>

        {/* 12. Call to Action */}
        <section>
          <div className="rounded-2xl border border-primary-200 bg-primary-50 p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Join Our Mission</h3>
              <p className="mt-2 max-w-2xl text-sm text-gray-700">We invite professionals, businesses, and investors to collaborate in building India’s first AI-integrated workforce ecosystem.</p>
            </div>
            <div className="mt-4 sm:mt-0 inline-flex gap-3">
              <button className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black">For Investors</button>
              <button className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-900 border border-gray-300 hover:bg-gray-50">For Enterprises</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default AboutPage
