import { useState, useEffect } from 'react'

/**
 * Suit l'état d'une media query CSS depuis React.
 *
 * Nécessaire pour les cas que Tailwind ne peut pas couvrir : les composants qui reçoivent
 * leurs dimensions en props JavaScript plutôt qu'en classes CSS (les graphiques Recharts,
 * par exemple), ou une logique conditionnelle dépendant de la taille d'écran.
 *
 * Pour tout le reste, préférer les préfixes Tailwind (`sm:`, `md:`, `lg:`) : ils n'ont
 * aucun coût au rendu.
 *
 * @param {string} query - ex. '(min-width: 1024px)'
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

// Breakpoints Tailwind, pour éviter les chaînes en dur dans les composants.
export const SM = '(min-width: 640px)'
export const MD = '(min-width: 768px)'
export const LG = '(min-width: 1024px)'
