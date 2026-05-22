/**
 * Date formatting utilities
 */

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const MONTHS_FULL = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

/**
 * Format a date string into various display formats
 * @param {string} dateStr - ISO date string (YYYY-MM-DD)
 * @returns {object} Object with various date formats
 */
export const formatDate = (dateStr) => {
  // Handle invalid or missing date
  if (!dateStr) {
    return {
      dayName: 'Fecha',
      dayShort: 'Fec',
      day: '--',
      month: '---',
      monthFull: '---',
      year: '----',
      short: 'Fecha no definida',
      full: 'Fecha no definida'
    }
  }

  try {
    // Parse the date string - add time to avoid timezone issues
    const date = new Date(dateStr + 'T12:00:00')
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date')
    }

    const dayIndex = date.getDay()
    const monthIndex = date.getMonth()
    const dayOfMonth = date.getDate()
    const year = date.getFullYear()

    return {
      dayName: DAYS[dayIndex],
      dayShort: DAYS[dayIndex].slice(0, 3),
      day: dayOfMonth,
      month: MONTHS_SHORT[monthIndex],
      monthFull: MONTHS_FULL[monthIndex],
      year: year,
      short: `${DAYS[dayIndex].slice(0, 3)} ${dayOfMonth} ${MONTHS_SHORT[monthIndex]}`,
      full: `${DAYS[dayIndex]} ${dayOfMonth} de ${MONTHS_FULL[monthIndex]}, ${year}`
    }
  } catch (error) {
    return {
      dayName: 'Fecha',
      dayShort: 'Fec',
      day: '--',
      month: '---',
      monthFull: '---',
      year: '----',
      short: 'Fecha inválida',
      full: 'Fecha inválida'
    }
  }
}

/**
 * Get today's date as an ISO string (YYYY-MM-DD)
 * @returns {string} Today's date in YYYY-MM-DD format
 */
export const getTodayString = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Get the default match time: the next even hour after now (HH:00).
 * E.g. 2:36 -> "04:00", 6:15 -> "08:00".
 * @returns {string} Time in HH:00 format
 */
export const getDefaultHorario = () => {
  let hour = new Date().getHours() + 1
  if (hour % 2 !== 0) hour += 1
  hour = hour % 24
  return `${String(hour).padStart(2, '0')}:00`
}

/**
 * Check if a date is in the past
 * @param {string} dateStr - ISO date string (YYYY-MM-DD)
 * @returns {boolean} True if date is in the past
 */
export const isDatePast = (dateStr) => {
  if (!dateStr) return false
  
  try {
    const date = new Date(dateStr + 'T23:59:59')
    const now = new Date()
    return date < now
  } catch {
    return false
  }
}

/**
 * Get a human-readable relative time string
 * @param {string} dateStr - ISO date string
 * @returns {string} Relative time string (e.g., "Hace 2 horas")
 */
export const getRelativeTime = (dateStr) => {
  if (!dateStr) return ''
  
  try {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Ahora mismo'
    if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins !== 1 ? 's' : ''}`
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours !== 1 ? 's' : ''}`
    if (diffDays < 7) return `Hace ${diffDays} día${diffDays !== 1 ? 's' : ''}`
    
    return formatDate(dateStr.split('T')[0]).short
  } catch {
    return ''
  }
}
