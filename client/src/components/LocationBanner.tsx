import { MapPinIcon } from '@heroicons/react/24/outline'

export const LocationBanner = () => {
  return (
    <div className="bg-primary-700 text-white py-2">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center gap-2 text-sm">
          <MapPinIcon className="w-4 h-4" />
          <span>
            Currently serving <strong>OMR (Old Mahabalipuram Road), Chennai</strong>
          </span>
        </div>
      </div>
    </div>
  )
}
