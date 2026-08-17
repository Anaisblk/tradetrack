// Tous les prix saisis dans l'application sont en TTC.
// Pour les biens d'occasion, la TVA s'applique sur la marge (TVM) :
//   marge_ttc = prix_ttc − achat_ttc
//   tva = max(0, marge_ttc) × 20/120
// Pour les produits neufs, la TVA est extraite du TTC : tva = ttc × 20/120

export const TVA_RATE = 20

export const getTvaRate = () => TVA_RATE

const round = (n) => Math.round(n * 100) / 100

// Calcule les sous-totaux d'une ligne de devis ou de réparation.
// `item` : { quantity, unit_price_ht (= prix unitaire TTC saisi), condition, purchase_price (TTC) }
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

  // Neuf : TVA extraite du TTC
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
