import { useState, useRef, useEffect, useCallback } from 'react'
import { X, MapPin } from 'lucide-react'
import { regionData } from '@/data/regions'
import type { RegionValue, RegionData } from '@/types'

interface Props {
  value: RegionValue
  onChange: (value: RegionValue) => void
  required?: boolean
  disabled?: boolean
}

const MUNICIPALITY_CODES = ['110000', '120000', '310000', '500000']

export default function RegionSelector({ value, onChange, disabled = false }: Props) {
  const [open, setOpen] = useState(false)
  const [selectedProvince, setSelectedProvince] = useState<RegionData | null>(null)
  const [selectedCity, setSelectedCity] = useState<RegionData | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleProvinceClick = useCallback((province: RegionData) => {
    setSelectedProvince(province)
    setSelectedCity(null)
    // For municipalities, auto-set city = province
    if (MUNICIPALITY_CODES.includes(province.code)) {
      const city = province.children?.[0] || null
      setSelectedCity(city)
    }
  }, [])

  const handleCityClick = useCallback((city: RegionData) => {
    setSelectedCity(city)
  }, [])

  const handleDistrictClick = useCallback((district: RegionData) => {
    if (!selectedProvince || !selectedCity) return
    const provName = selectedProvince.name
    const cityName = MUNICIPALITY_CODES.includes(selectedProvince.code)
      ? selectedProvince.name
      : selectedCity.name

    onChange({
      provinceCode: selectedProvince.code,
      provinceName: provName,
      cityCode: selectedCity.code,
      cityName,
      districtCode: district.code,
      districtName: district.name,
    })
    setOpen(false)
  }, [selectedProvince, selectedCity, onChange])

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onChange({})
    setSelectedProvince(null)
    setSelectedCity(null)
  }, [onChange])

  const displayText = value.districtName
    ? `${value.provinceName} ${value.cityName} ${value.districtName}`
    : value.provinceName
      ? `${value.provinceName} ${value.cityName || ''}`
      : ''

  const cities = selectedProvince?.children || []
  const districts = selectedCity?.children || []

  return (
    <div ref={containerRef} className={`relative ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>
      {/* Display input */}
      <div
        onClick={() => !disabled && setOpen(!open)}
        className={`input-glass w-full text-xs flex items-center gap-1.5 cursor-pointer min-h-[36px] ${!displayText ? 'text-slate-400' : 'text-slate-700'}`}
      >
        <MapPin size={12} className="text-slate-400 shrink-0" />
        <span className="flex-1 truncate">{displayText || '请选择省 / 市 / 区'}</span>
        {displayText && (
          <button
            onClick={handleClear}
            className="p-0.5 text-slate-300 hover:text-red-400 shrink-0"
            title="清空"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 glass-card rounded-lg shadow-lg z-50 flex border border-white/80">
          {/* Province column */}
          <div className="w-36 max-h-56 overflow-y-auto scrollbar-hide border-r border-black/5 flex-shrink-0 bg-white rounded-l-lg">
            {regionData.map(prov => (
              <button
                key={prov.code}
                onClick={() => handleProvinceClick(prov)}
                className={`w-full text-left px-3 py-1.5 text-xs transition-colors truncate ${
                  selectedProvince?.code === prov.code
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {prov.name}
              </button>
            ))}
          </div>

          {/* City column */}
          <div className="w-36 max-h-56 overflow-y-auto scrollbar-hide border-r border-black/5 flex-shrink-0 bg-white">
            {cities.length > 0 ? cities.map(city => (
              <button
                key={city.code}
                onClick={() => handleCityClick(city)}
                className={`w-full text-left px-3 py-1.5 text-xs transition-colors truncate ${
                  selectedCity?.code === city.code
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {city.name}
              </button>
            )) : (
              <p className="px-3 py-4 text-[10px] text-slate-400 text-center">
                {selectedProvince ? '加载中...' : '请先选择省份'}
              </p>
            )}
          </div>

          {/* District column */}
          <div className="w-36 max-h-56 overflow-y-auto scrollbar-hide flex-shrink-0 bg-white rounded-r-lg">
            {districts.length > 0 ? districts.map(dist => (
              <button
                key={dist.code}
                onClick={() => handleDistrictClick(dist)}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-colors truncate"
              >
                {dist.name}
              </button>
            )) : (
              <p className="px-3 py-4 text-[10px] text-slate-400 text-center">
                {selectedCity ? '加载中...' : selectedProvince ? '请选择城市' : '请先选择省份'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
