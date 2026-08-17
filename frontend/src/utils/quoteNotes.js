/**
 * Sérialisation/parsing des méta-données appareil dans le champ notes
 * d'un devis autonome.
 *
 * Le champ notes d'un devis peut contenir des méta-données structurées
 * (appareil concerné, problème signalé) en tête, suivies des notes
 * libres du technicien. Cette approche évite d'ajouter des colonnes
 * dédiées au modèle Quote.
 *
 * Format standard :
 *   Appareil : <type> [<marque>] [<modèle>]
 *   Problème : <description>
 *
 *   <notes libres>
 */

const DEVICE_LINE_REGEX = /^Appareil\s*:\s*(.+)$/m
const PROBLEM_LINE_REGEX = /^Problème\s*:\s*(.+)$/m

/**
 * Exemple :
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
 * Exemple :
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

  // Extraire les notes libres = tout ce qui reste après les 2 lignes
  // structurées + une ligne vide de séparation
  let freeNotes = notesString
  if (deviceMatch) freeNotes = freeNotes.replace(deviceMatch[0], '').trim()
  if (problemMatch) freeNotes = freeNotes.replace(problemMatch[0], '').trim()

  return { deviceInfo, problem, freeNotes }
}

/**
 * Extrait juste les champs individuels du bloc "Appareil : X Y Z" en
 * essayant de reconnaître type/brand/model. Best-effort : renvoie
 * uniquement deviceType si le format ne matche pas.
 *
 * Utile pour préremplir NewRepair depuis la passerelle.
 *
 * Exemple :
 *   extractDeviceFields('Smartphone Apple iPhone 14 Pro', DEVICE_TYPES, getBrands)
 *   => { device_type: 'Smartphone', device_brand: 'Apple', device_model: 'iPhone 14 Pro' }
 */
export function extractDeviceFields(deviceInfo, deviceTypes, brandsGetter) {
  if (!deviceInfo) return { device_type: '', device_brand: '', device_model: '' }

  const parts = deviceInfo.split(' ')
  // Cherche le premier match parmi les DEVICE_TYPES connus
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
    // Fallback : premier mot
    deviceType = parts[0] || ''
    brandStartIdx = 1
  }

  // Cherche la marque parmi celles connues pour ce type
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
