import { useState, useEffect } from 'react'

/**
 * Tracks a CSS media query from React. Needed for components sized in JS
 * (Recharts). Everywhere else, Tailwind prefixes are enough.
 */
export default function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  )

  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = (e) => setMatches(e.matches)
    setMatches(mq.matches) // resynchronise si `query` change
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])

  return matches
}

// Tailwind breakpoints
export const SM = '(min-width: 640px)'
export const MD = '(min-width: 768px)'
export const LG = '(min-width: 1024px)'
