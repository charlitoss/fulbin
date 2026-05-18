import { useState, useEffect, useRef } from 'react'

function Countdown({ targetDate, targetTime, onComplete }) {
  const [timeLeft, setTimeLeft] = useState(null)
  const completedRef = useRef(false)

  useEffect(() => {
    completedRef.current = false
  }, [targetDate, targetTime])

  useEffect(() => {
    const calculateTimeLeft = () => {
      // Validate inputs
      if (!targetDate || !targetTime) {
        return null
      }
      
      try {
        // Parse target date and time
        const [year, month, day] = targetDate.split('-').map(Number)
        const [hours, minutes] = targetTime.split(':').map(Number)
        
        // Validate parsed values
        if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hours) || isNaN(minutes)) {
          return null
        }
        
        const target = new Date(year, month - 1, day, hours, minutes, 0)
        const now = new Date()
        const difference = target - now
        
        if (difference <= 0) {
          return null // Match has started or passed
        }
        
        const days = Math.floor(difference / (1000 * 60 * 60 * 24))
        const hoursLeft = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutesLeft = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
        const secondsLeft = Math.floor((difference % (1000 * 60)) / 1000)
        
        return { days, hours: hoursLeft, minutes: minutesLeft, seconds: secondsLeft }
      } catch (e) {
        return null
      }
    }
    
    const tick = () => {
      const next = calculateTimeLeft()
      setTimeLeft(next)
      if (next === null && !completedRef.current) {
        completedRef.current = true
        onComplete?.()
      }
    }

    tick()
    const timer = setInterval(tick, 1000)

    return () => clearInterval(timer)
  }, [targetDate, targetTime, onComplete])
  
  if (!timeLeft) {
    return null // Don't show countdown if match has passed
  }
  
  const { days, hours, minutes } = timeLeft
  const minutesPart = minutes.toString().padStart(2, '0')

  return (
    <div className="info-item countdown-inline">
      <span className="countdown-text">
        Falta {days > 0 ? `${days}d ` : ''}{hours}h<span className="blink-colon">:</span>{minutesPart}m
      </span>
    </div>
  )
}

export default Countdown
