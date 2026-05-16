import { useEffect } from 'react'

function CrtEffect({ params }) {
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--crt-scanline-intensity', params.scanlineIntensity)
    root.style.setProperty('--crt-scanline-size', `${params.scanlineSize}px`)
    root.style.setProperty('--crt-subpixel', params.rgbSubpixel)
    root.style.setProperty('--crt-brightness', params.brightness)
    root.style.setProperty('--crt-contrast', params.contrast)
    root.style.setProperty('--crt-saturation', params.saturation)
    root.style.setProperty('--crt-vignette', params.vignetteStrength)
    root.style.setProperty('--crt-flicker', params.flickerStrength)
    root.style.setProperty('--crt-flicker-speed', `${params.flickerSpeed}ms`)
  }, [params])

  const shift = params.rgbShift

  return (
    <>
      <svg className="crt-svg-defs" aria-hidden="true" focusable="false">
        <defs>
          <filter id="crt-rgb-shift" x="-2%" y="-2%" width="104%" height="104%">
            <feOffset in="SourceGraphic" dx={-shift} dy="0" result="r-shift" />
            <feColorMatrix
              in="r-shift"
              type="matrix"
              values="1 0 0 0 0
                      0 0 0 0 0
                      0 0 0 0 0
                      0 0 0 1 0"
              result="r"
            />
            <feOffset in="SourceGraphic" dx={shift} dy="0" result="b-shift" />
            <feColorMatrix
              in="b-shift"
              type="matrix"
              values="0 0 0 0 0
                      0 0 0 0 0
                      0 0 1 0 0
                      0 0 0 1 0"
              result="b"
            />
            <feColorMatrix
              in="SourceGraphic"
              type="matrix"
              values="0 0 0 0 0
                      0 1 0 0 0
                      0 0 0 0 0
                      0 0 0 1 0"
              result="g"
            />
            <feBlend in="r" in2="g" mode="screen" result="rg" />
            <feBlend in="rg" in2="b" mode="screen" />
          </filter>
        </defs>
      </svg>
      <div className="crt-overlay" aria-hidden="true">
        <div className="crt-overlay__scanlines" />
        <div className="crt-overlay__flicker" />
        <div className="crt-overlay__vignette" />
      </div>
    </>
  )
}

export default CrtEffect
