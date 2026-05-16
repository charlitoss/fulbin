export const CRT_DEFAULTS = {
  scanlineIntensity: 0.35,
  scanlineSize: 3,
  rgbSubpixel: 0.5,
  brightness: 1.02,
  contrast: 1.05,
  saturation: 1.1,
  rgbShift: 0.6,
  vignetteStrength: 0.35,
  flickerStrength: 0.08,
  flickerSpeed: 110,
}

export const CRT_PARAM_META = {
  scanlineIntensity: { label: 'Intensity', min: 0, max: 1, step: 0.01, group: 'Scanlines' },
  scanlineSize:      { label: 'Size (px)', min: 2, max: 10, step: 1, group: 'Scanlines' },
  rgbSubpixel:       { label: 'Sub-pixel', min: 0, max: 1, step: 0.01, group: 'Scanlines' },
  brightness:        { label: 'Brightness', min: 0.6, max: 1.8, step: 0.01, group: 'Color' },
  contrast:          { label: 'Contrast',   min: 0.6, max: 1.8, step: 0.01, group: 'Color' },
  saturation:        { label: 'Saturation', min: 0,   max: 2,   step: 0.01, group: 'Color' },
  rgbShift:          { label: 'RGB Shift (px)', min: 0, max: 3, step: 0.1, group: 'Glow' },
  vignetteStrength:  { label: 'Vignette', min: 0, max: 1, step: 0.01, group: 'Framing' },
  flickerStrength:   { label: 'Flicker', min: 0, max: 0.3, step: 0.01, group: 'Framing' },
  flickerSpeed:      { label: 'Flicker speed (ms)', min: 40, max: 400, step: 10, group: 'Framing' },
}

const STORAGE_KEY = 'fulbin:crt-params'

export function loadCrtParams() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...CRT_DEFAULTS }
    const parsed = JSON.parse(raw)
    return { ...CRT_DEFAULTS, ...parsed }
  } catch {
    return { ...CRT_DEFAULTS }
  }
}

export function saveCrtParams(params) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(params))
  } catch {}
}
