// Device catalog used to autocomplete repairs and quotes.
// The lists are not exhaustive: a free name can always be typed.

export const DEVICE_TYPES = [
  'Smartphone',
  'Tablette',
  'PC portable',
  'PC fixe',
  'Console de jeu',
  'Montre connectée',
  'Écouteurs / Casque',
  'Téléviseur',
  'Imprimante',
  'Autre',
]

export const BRANDS_BY_TYPE = {
  'Smartphone': ['Apple', 'Samsung', 'Xiaomi', 'Redmi', 'Google', 'OnePlus', 'Oppo', 'Honor', 'Huawei', 'Realme', 'Sony', 'Nokia', 'Motorola', 'Fairphone'],
  'Tablette': ['Apple', 'Samsung', 'Lenovo', 'Microsoft', 'Huawei', 'Xiaomi', 'Amazon', 'Asus'],
  'PC portable': ['Apple', 'Asus', 'Dell', 'HP', 'Lenovo', 'Acer', 'MSI', 'Microsoft', 'Razer', 'Toshiba', 'Samsung', 'LG', 'Huawei'],
  'PC fixe': ['Custom', 'HP', 'Dell', 'Lenovo', 'Acer', 'Asus', 'Apple', 'MSI'],
  'Console de jeu': ['Sony', 'Microsoft', 'Nintendo', 'Valve', 'Asus', 'Lenovo'],
  'Montre connectée': ['Apple', 'Samsung', 'Garmin', 'Huawei', 'Fitbit', 'Xiaomi', 'Withings', 'Polar', 'Amazfit'],
  'Écouteurs / Casque': ['Apple', 'Sony', 'Bose', 'Samsung', 'JBL', 'Sennheiser', 'Beats', 'Xiaomi', 'Huawei', 'Jabra'],
  'Téléviseur': ['Samsung', 'LG', 'Sony', 'TCL', 'Hisense', 'Philips', 'Panasonic'],
  'Imprimante': ['HP', 'Canon', 'Epson', 'Brother', 'Xerox'],
  'Autre': [],
}

// Key: "<Brand>|<Type>"
export const MODELS_BY_BRAND_TYPE = {
  // === Apple - Smartphone ===
  'Apple|Smartphone': [
    'iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15 Plus', 'iPhone 15',
    'iPhone 14 Pro Max', 'iPhone 14 Pro', 'iPhone 14 Plus', 'iPhone 14',
    'iPhone 13 Pro Max', 'iPhone 13 Pro', 'iPhone 13', 'iPhone 13 mini',
    'iPhone 12 Pro Max', 'iPhone 12 Pro', 'iPhone 12', 'iPhone 12 mini',
    'iPhone SE (3e gen)', 'iPhone SE (2e gen)',
    'iPhone 11 Pro Max', 'iPhone 11 Pro', 'iPhone 11',
    'iPhone XS Max', 'iPhone XS', 'iPhone XR', 'iPhone X',
    'iPhone 8 Plus', 'iPhone 8', 'iPhone 7 Plus', 'iPhone 7',
  ],
  // === Apple - Tablet ===
  'Apple|Tablette': [
    'iPad Pro 12.9 (6e gen)', 'iPad Pro 11 (4e gen)',
    'iPad Pro 12.9 (5e gen)', 'iPad Pro 11 (3e gen)',
    'iPad Air (5e gen)', 'iPad Air (4e gen)',
    'iPad (10e gen)', 'iPad (9e gen)', 'iPad (8e gen)',
    'iPad mini (6e gen)', 'iPad mini (5e gen)',
  ],
  // === Apple - Laptop ===
  'Apple|PC portable': [
    'MacBook Pro 16" M3 Max', 'MacBook Pro 14" M3 Pro', 'MacBook Pro 13" M2',
    'MacBook Pro 16" M2 Max', 'MacBook Pro 14" M2 Pro',
    'MacBook Pro 16" M1 Max', 'MacBook Pro 14" M1 Pro', 'MacBook Pro 13" M1',
    'MacBook Air 15" M2', 'MacBook Air 13" M2', 'MacBook Air 13" M1',
  ],
  'Apple|PC fixe': ['iMac 24" M3', 'iMac 24" M1', 'Mac mini M2 Pro', 'Mac mini M2', 'Mac Studio M2 Ultra', 'Mac Studio M2 Max', 'Mac Pro M2 Ultra'],
  'Apple|Montre connectée': ['Apple Watch Ultra 2', 'Apple Watch Ultra', 'Apple Watch Series 9', 'Apple Watch Series 8', 'Apple Watch Series 7', 'Apple Watch SE (2e gen)', 'Apple Watch SE'],
  'Apple|Écouteurs / Casque': ['AirPods Pro (2e gen)', 'AirPods Pro', 'AirPods (3e gen)', 'AirPods (2e gen)', 'AirPods Max'],

  // === Samsung - Smartphone ===
  'Samsung|Smartphone': [
    'Galaxy S24 Ultra', 'Galaxy S24+', 'Galaxy S24',
    'Galaxy S23 Ultra', 'Galaxy S23+', 'Galaxy S23',
    'Galaxy S22 Ultra', 'Galaxy S22+', 'Galaxy S22',
    'Galaxy S21 Ultra', 'Galaxy S21+', 'Galaxy S21',
    'Galaxy Z Fold 5', 'Galaxy Z Flip 5', 'Galaxy Z Fold 4', 'Galaxy Z Flip 4',
    'Galaxy A54', 'Galaxy A34', 'Galaxy A24', 'Galaxy A14',
    'Galaxy A53', 'Galaxy A33', 'Galaxy A52', 'Galaxy A32',
    'Galaxy Note 20 Ultra', 'Galaxy Note 20', 'Galaxy Note 10+', 'Galaxy Note 10',
  ],
  'Samsung|Tablette': ['Galaxy Tab S9 Ultra', 'Galaxy Tab S9+', 'Galaxy Tab S9', 'Galaxy Tab S8 Ultra', 'Galaxy Tab S8+', 'Galaxy Tab S8', 'Galaxy Tab A9', 'Galaxy Tab A8'],
  'Samsung|PC portable': ['Galaxy Book 4 Pro', 'Galaxy Book 3 Pro', 'Galaxy Book 3'],
  'Samsung|Montre connectée': ['Galaxy Watch 6 Classic', 'Galaxy Watch 6', 'Galaxy Watch 5 Pro', 'Galaxy Watch 5', 'Galaxy Watch 4 Classic', 'Galaxy Watch 4'],
  'Samsung|Écouteurs / Casque': ['Galaxy Buds 2 Pro', 'Galaxy Buds 2', 'Galaxy Buds Pro', 'Galaxy Buds Live'],
  'Samsung|Téléviseur': ['Neo QLED 8K QN900C', 'Neo QLED 4K QN95C', 'QLED Q80C', 'Frame LS03B', 'OLED S95C', 'Crystal UHD CU8000'],

  // === Xiaomi / Redmi ===
  'Xiaomi|Smartphone': ['Xiaomi 14 Ultra', 'Xiaomi 14 Pro', 'Xiaomi 14', 'Xiaomi 13 Ultra', 'Xiaomi 13 Pro', 'Xiaomi 13', 'Xiaomi 12 Pro', 'Xiaomi 12', 'Xiaomi 11T Pro', 'Xiaomi 11T'],
  'Redmi|Smartphone': ['Redmi Note 13 Pro+', 'Redmi Note 13 Pro', 'Redmi Note 13', 'Redmi Note 12 Pro+', 'Redmi Note 12 Pro', 'Redmi Note 12', 'Redmi Note 11 Pro', 'Redmi Note 11', 'Redmi 12', 'Redmi 12C', 'Redmi 10'],
  'Xiaomi|Tablette': ['Pad 6 Pro', 'Pad 6', 'Pad 5 Pro', 'Pad 5'],
  'Xiaomi|Montre connectée': ['Watch S3', 'Watch S1 Pro', 'Watch S1', 'Mi Band 8', 'Mi Band 7'],

  // === Google ===
  'Google|Smartphone': ['Pixel 8 Pro', 'Pixel 8', 'Pixel 7 Pro', 'Pixel 7', 'Pixel 7a', 'Pixel 6 Pro', 'Pixel 6', 'Pixel 6a', 'Pixel 5', 'Pixel 4a'],

  // === OnePlus ===
  'OnePlus|Smartphone': ['OnePlus 12', 'OnePlus 11', 'OnePlus 10 Pro', 'OnePlus 10T', 'OnePlus 9 Pro', 'OnePlus 9', 'OnePlus Nord 3', 'OnePlus Nord CE 3'],

  // === Honor / Huawei ===
  'Honor|Smartphone': ['Magic 6 Pro', 'Magic 6', 'Magic 5 Pro', 'Magic 5', '90', '70', 'X8'],
  'Huawei|Smartphone': ['P60 Pro', 'P50 Pro', 'P40 Pro', 'P30 Pro', 'Mate 50 Pro', 'Nova 11'],
  'Huawei|Tablette': ['MatePad Pro 13.2', 'MatePad Pro 11', 'MatePad 11.5'],

  // === Oppo / Realme ===
  'Oppo|Smartphone': ['Find X7 Ultra', 'Find X6 Pro', 'Find X5 Pro', 'Reno 11', 'Reno 10', 'A98', 'A78'],
  'Realme|Smartphone': ['GT 5 Pro', 'GT Neo 5', '11 Pro+', '10 Pro+'],

  // === Sony - Smartphone, TV, audio ===
  'Sony|Smartphone': ['Xperia 1 V', 'Xperia 1 IV', 'Xperia 5 V', 'Xperia 5 IV', 'Xperia 10 V'],
  'Sony|Téléviseur': ['Bravia XR A95L (OLED)', 'Bravia XR A80L (OLED)', 'Bravia XR X95L', 'Bravia XR X90L'],
  'Sony|Écouteurs / Casque': ['WH-1000XM5', 'WH-1000XM4', 'WF-1000XM5', 'WF-1000XM4', 'LinkBuds S'],

  // === Game consoles ===
  'Sony|Console de jeu': ['PlayStation 5 Pro', 'PlayStation 5', 'PlayStation 5 Slim', 'PlayStation 4 Pro', 'PlayStation 4', 'PlayStation 4 Slim', 'PS Vita'],
  'Microsoft|Console de jeu': ['Xbox Series X', 'Xbox Series S', 'Xbox One X', 'Xbox One S', 'Xbox One'],
  'Nintendo|Console de jeu': ['Switch OLED', 'Switch (modèle 2019)', 'Switch (lancement)', 'Switch Lite', '3DS', '3DS XL', '2DS'],
  'Valve|Console de jeu': ['Steam Deck OLED', 'Steam Deck'],
  'Asus|Console de jeu': ['ROG Ally', 'ROG Ally X'],
  'Lenovo|Console de jeu': ['Legion Go'],
  'Microsoft|PC portable': ['Surface Laptop 5', 'Surface Laptop 4', 'Surface Laptop Studio', 'Surface Book 3', 'Surface Pro 9', 'Surface Pro 8'],

  // === Laptops ===
  'Asus|PC portable': ['ZenBook 14 OLED', 'ZenBook Pro 14', 'VivoBook 15', 'VivoBook S 14', 'ROG Strix G15', 'ROG Strix G16', 'ROG Zephyrus G14', 'ROG Zephyrus G16', 'TUF Gaming A15', 'TUF Gaming F15'],
  'Dell|PC portable': ['XPS 13', 'XPS 15', 'XPS 17', 'Inspiron 14', 'Inspiron 15', 'Inspiron 16', 'Latitude 7440', 'Latitude 5440', 'Alienware m16', 'Alienware m18'],
  'HP|PC portable': ['Spectre x360 14', 'Spectre x360 16', 'EliteBook 840', 'EliteBook 1040', 'Pavilion 15', 'Pavilion x360', 'Omen 16', 'Omen 17', 'Victus 15', 'Victus 16'],
  'Lenovo|PC portable': ['ThinkPad X1 Carbon', 'ThinkPad T14', 'ThinkPad T16', 'ThinkPad P14s', 'IdeaPad 5', 'IdeaPad 3', 'Yoga Slim 7', 'Yoga 9i', 'Legion 5 Pro', 'Legion Pro 7'],
  'Acer|PC portable': ['Swift 3', 'Swift 5', 'Aspire 5', 'Aspire 7', 'Predator Helios 16', 'Predator Helios 18', 'Nitro 5', 'Nitro 16', 'Nitro 17'],
  'MSI|PC portable': ['Stealth 14', 'Stealth 16', 'Raider GE78', 'Raider GE68', 'Vector GP68', 'Cyborg 15', 'Katana 15', 'Modern 14'],
  'Razer|PC portable': ['Blade 14', 'Blade 15', 'Blade 16', 'Blade 18'],
  'Huawei|PC portable': ['MateBook X Pro', 'MateBook 14', 'MateBook 16s', 'MateBook D 14', 'MateBook D 16'],
  'LG|PC portable': ['Gram 14', 'Gram 15', 'Gram 16', 'Gram 17'],

  // === Printers ===
  'HP|Imprimante': ['OfficeJet Pro 9015e', 'Envy 6055e', 'LaserJet Pro M404', 'DeskJet 2710e'],
  'Canon|Imprimante': ['PIXMA TS5350a', 'PIXMA TR4650', 'i-SENSYS LBP6030B', 'MAXIFY GX4050'],
  'Epson|Imprimante': ['EcoTank ET-2820', 'EcoTank ET-2850', 'WorkForce WF-2950', 'Expression Home XP-3200'],
  'Brother|Imprimante': ['DCP-L2530DW', 'MFC-J491DW', 'HL-L2350DW'],

  // === Smartwatches ===
  'Garmin|Montre connectée': ['Fenix 7 Pro', 'Fenix 7', 'Forerunner 965', 'Forerunner 265', 'Forerunner 255', 'Venu 3', 'Venu 2', 'Epix Pro', 'Instinct 2'],
  'Huawei|Montre connectée': ['Watch GT 4', 'Watch GT 3 Pro', 'Watch GT 3', 'Watch 4 Pro', 'Watch Ultimate'],
  'Fitbit|Montre connectée': ['Versa 4', 'Sense 2', 'Charge 6', 'Charge 5', 'Inspire 3'],
  'Withings|Montre connectée': ['ScanWatch 2', 'ScanWatch Light', 'Steel HR'],

  // === Earphones / Headphones ===
  'Bose|Écouteurs / Casque': ['QuietComfort Ultra Headphones', 'QuietComfort 45', 'QuietComfort Ultra Earbuds', 'QuietComfort Earbuds II'],
  'JBL|Écouteurs / Casque': ['Tour One M2', 'Tour Pro 2', 'Live 770NC', 'Tune 770NC'],
  'Sennheiser|Écouteurs / Casque': ['Momentum 4', 'Momentum True Wireless 3', 'HD 660S2', 'Accentum'],
  'Beats|Écouteurs / Casque': ['Studio Pro', 'Solo 3 Wireless', 'Studio Buds +', 'Fit Pro'],
  'Jabra|Écouteurs / Casque': ['Elite 10', 'Elite 8 Active', 'Elite 5', 'Evolve2 75'],

  // === TVs ===
  'LG|Téléviseur': ['OLED G3', 'OLED C3', 'OLED B3', 'QNED 99', 'QNED 91', 'NanoCell 81'],
  'TCL|Téléviseur': ['C845', 'C745', 'C645', 'P745'],
  'Hisense|Téléviseur': ['U8K', 'U7K', 'A6K'],
  'Philips|Téléviseur': ['OLED+908', 'OLED807', 'The One PUS 8808'],
  'Panasonic|Téléviseur': ['MZ2000', 'MZ1500', 'LX940'],
}

export const getBrands = (deviceType) => BRANDS_BY_TYPE[deviceType] || []

export const getModels = (brand, deviceType) => {
  if (!brand || !deviceType) return []
  return MODELS_BY_BRAND_TYPE[`${brand}|${deviceType}`] || []
}
