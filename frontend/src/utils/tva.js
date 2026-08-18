// Every price entered in the app includes VAT.
// Second-hand goods: VAT applies to the margin only:
//   margin = price - purchase price
//   vat = max(0, margin) * 20/120
// New products: VAT is extracted from the price: vat = price * 20/120

export const TVA_RATE = 20

export const getTvaRate = () => TVA_RATE

const round = (n) => Math.round(n * 100) / 100

// Subtotals for one quote or repair line.
// item: { quantity, unit_price_ht (price incl. VAT), condition, purchase_price }
export const computeItemAmounts = (item) => {
  const qty = Number(item.quantity) || 0
  const unitTTC = Number(item.unit_price_ht ?? item.unit_price) || 0

  if (item.condition === 'occasion') {
    const subtotalTTC = round(qty * unitTTC)
    const purchaseTTC = round(qty * (Number(item.purchase_price) || 0))
    const margin = Math.max(0, subtotalTTC - purchaseTTC)
    const subtotalTVA = round(margin * 20 / 120)
    const subtotalHT = round(subtotalTTC - subtotalTVA)
    return { subtotalHT, subtotalTVA, subtotalTTC }
  }

  // New: VAT extracted from the price
  const subtotalTTC = round(qty * unitTTC)
  const subtotalTVA = round(subtotalTTC * 20 / 120)
  const subtotalHT = round(subtotalTTC - subtotalTVA)
  return { subtotalHT, subtotalTVA, subtotalTTC }
}

export const computeSubtotalTTC = (item) => computeItemAmounts(item).subtotalTTC

export const computeTotals = (items) => {
  let totalHT = 0
  let totalTVA = 0
  let totalTTC = 0
  for (const item of items) {
    const { subtotalHT, subtotalTVA, subtotalTTC } = computeItemAmounts(item)
    totalHT += subtotalHT
    totalTVA += subtotalTVA
    totalTTC += subtotalTTC
  }
  return {
    total_ht: round(totalHT),
    tva_amount: round(totalTVA),
    total_ttc: round(totalTTC),
  }
}
