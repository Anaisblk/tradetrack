/**
 * A quote has no device columns, so the device and the reported problem are
 * stored as two lines at the top of the notes field, before the free notes.
 *
 *   Appareil : <type> [<brand>] [<model>]
 *   Problème : <description>
 */

const DEVICE_LINE_REGEX = /^Appareil\s*:\s*(.+)$/m
const PROBLEM_LINE_REGEX = /^Problème\s*:\s*(.+)$/m

/**
 * Example:
 *   serializeQuoteNotes({ deviceType: 'Smartphone', deviceBrand: 'Apple',
 *     deviceModel: 'iPhone 14 Pro', problem: 'Écran cassé', freeNotes: 'Sous garantie' })
 *   => "Appareil : Smartphone Apple iPhone 14 Pro\nProblème : Écran cassé\n\nSous garantie"
 */
export function serializeQuoteNotes({ deviceType, deviceBrand, deviceModel, problem, freeNotes }) {
  const lines = []
  if (deviceType) {
    const deviceParts = [deviceType, deviceBrand, deviceModel].filter(Boolean).join(' ')
    lines.push(`Appareil : ${deviceParts}`)
  }
  if (problem && problem.trim()) {
    lines.push(`Problème : ${problem.trim()}`)
  }
  if (freeNotes && freeNotes.trim()) {
    if (lines.length > 0) lines.push('')  // ligne vide de séparation
    lines.push(freeNotes.trim())
  }
  return lines.join('\n')
}

/**
 * Example:
 *   parseQuoteNotes("Appareil : Smartphone Apple iPhone 14 Pro\nProblème : Écran cassé\n\nSous garantie")
 *   => { deviceInfo: 'Smartphone Apple iPhone 14 Pro', problem: 'Écran cassé', freeNotes: 'Sous garantie' }
 */
export function parseQuoteNotes(notesString) {
  if (!notesString) {
    return { deviceInfo: '', problem: '', freeNotes: '' }
  }
  const deviceMatch = notesString.match(DEVICE_LINE_REGEX)
  const problemMatch = notesString.match(PROBLEM_LINE_REGEX)

  const deviceInfo = deviceMatch ? deviceMatch[1].trim() : ''
  const problem = problemMatch ? problemMatch[1].trim() : ''

  // Free notes are whatever is left after the two structured lines
  let freeNotes = notesString
  if (deviceMatch) freeNotes = freeNotes.replace(deviceMatch[0], '').trim()
  if (problemMatch) freeNotes = freeNotes.replace(problemMatch[0], '').trim()

  return { deviceInfo, problem, freeNotes }
}

/**
 * Splits the "Appareil : X Y Z" line back into type / brand / model.
 * Best-effort: returns only deviceType when the format does not match.
 * Used to prefill NewRepair from a quote.
 *
 * Example:
 *   extractDeviceFields('Smartphone Apple iPhone 14 Pro', DEVICE_TYPES, getBrands)
 *   => { device_type: 'Smartphone', device_brand: 'Apple', device_model: 'iPhone 14 Pro' }
 */
export function extractDeviceFields(deviceInfo, deviceTypes, brandsGetter) {
  if (!deviceInfo) return { device_type: '', device_brand: '', device_model: '' }

  const parts = deviceInfo.split(' ')
  // Looks for a known device type
  let deviceType = ''
  let brandStartIdx = 0
  for (const t of deviceTypes) {
    if (deviceInfo.startsWith(t)) {
      deviceType = t
      brandStartIdx = t.split(' ').length
      break
    }
  }
  if (!deviceType) {
    // Fallback: first word
    deviceType = parts[0] || ''
    brandStartIdx = 1
  }

  // Looks for a known brand for that type
  let deviceBrand = ''
  let modelStartIdx = brandStartIdx
  if (deviceType && brandsGetter) {
    const brands = brandsGetter(deviceType) || []
    for (const b of brands) {
      const remaining = parts.slice(brandStartIdx).join(' ')
      if (remaining.startsWith(b)) {
        deviceBrand = b
        modelStartIdx = brandStartIdx + b.split(' ').length
        break
      }
    }
  }
  if (!deviceBrand) {
    deviceBrand = parts[brandStartIdx] || ''
    modelStartIdx = brandStartIdx + 1
  }

  const deviceModel = parts.slice(modelStartIdx).join(' ')

  return { device_type: deviceType, device_brand: deviceBrand, device_model: deviceModel }
}
