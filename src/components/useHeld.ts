import { useEffect, useState } from 'react'

/** True once `condition` has stayed true for `ms`; false again the moment it turns false. */
export function useHeld(condition: boolean, ms: number): boolean {
  const [held, setHeld] = useState(false)

  useEffect(() => {
    if (!condition) return
    const id = setTimeout(() => setHeld(true), ms)
    // Runs when the condition breaks (or on unmount), so the next hold starts from zero.
    return () => {
      clearTimeout(id)
      setHeld(false)
    }
  }, [condition, ms])

  return condition && held
}
