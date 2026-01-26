import { MapPinIcon } from '@heroicons/react/24/outline'

export const LocationBanner = () => {
  return (
    <div className="bg-primary-700 text-white py-2">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center justify-center gap-2">
            <MapPinIcon className="w-4 h-4" />
            <span>
              Currently serving <strong>OMR (Old Mahabalipuram Road), Chennai</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://fixzep-homeplus-j8g99x7.gamma.site/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-3 py-1 rounded-full border border-white/60 text-[11px] sm:text-xs font-medium text-white/90 hover:bg-white/10 transition-colors"
            >
              Home+
            </a>
            <a
              href="https://fixzep-ops-5gu8q5q.gamma.site/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-3 py-1 rounded-full border border-white/60 text-[11px] sm:text-xs font-medium text-white/90 hover:bg-white/10 transition-colors"
            >
              Ops+
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
