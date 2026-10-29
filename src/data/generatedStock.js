/**
 * ملف مُولَّد آليًا — لا تعدّل يدويًا. المصدر: IRIDE Stock.xlsx عبر scripts/sync-stock.js
 * القاعدة المعتمدة: أولوية السعر Stock ← قائمة الأسعار (A/B) ← الكتالوج مع مراجعة؛
 * مؤشر «متاح» فقط عند سجل Stock مُطابَق بوحدات مسجّلة > 0؛ موديل بلا سجل Stock يظهر تحذير
 */

export const AVAILABILITY_NOTE = 'متاح'
export const LAST_RECORDED_PRICE_NOTE = 'ده آخر سعر مسجل، يُرجى التواصل مع الفرع للتأكد من التوفر والسعر الحالي'

export const MODELS = [
  {
    brand: "SYM", name: "Orbit 3 150 CC", source: 'stock', price: "69700", stockUnits: 1, availabilityNote: AVAILABILITY_NOTE
  },
  {
    brand: "SYM", name: "Jet 4 150 CC", source: 'price-list', price: "75000", lastPriceNote: LAST_RECORDED_PRICE_NOTE
  },
  {
    brand: "SYM", name: "WOLF", source: 'stock', price: "55000", stockUnits: 4, availabilityNote: AVAILABILITY_NOTE
  },
  {
    brand: "SYM", name: "SR 150 CC New 2026", source: 'stock', price: "90000", stockUnits: 15, availabilityNote: AVAILABILITY_NOTE
  },
  {
    brand: "SYM", name: "ST 200 CC old", source: 'stock', price: "92000", stockUnits: 3, availabilityNote: AVAILABILITY_NOTE
  },
  {
    brand: "SYM", name: "Jet 14 CA 200 cc", source: 'stock', price: "108000", stockUnits: 23, availabilityNote: AVAILABILITY_NOTE
  },
  {
    brand: "SYM", name: "JET 14 EVO 150cc 💦", source: 'stock', price: "130000", stockUnits: 2, availabilityNote: AVAILABILITY_NOTE
  },
  {
    brand: "SYM", name: "Jet X 200 cc", source: 'stock', price: "129000", stockUnits: 7, availabilityNote: AVAILABILITY_NOTE
  },
  {
    brand: "SYM", name: "Nhx 180cc CBS", source: 'price-list', price: "102000", lastPriceNote: LAST_RECORDED_PRICE_NOTE
  },
  {
    brand: "SYM", name: "Cruisym 300cc", source: 'stock', price: "274900", stockUnits: 1, availabilityNote: AVAILABILITY_NOTE
  },
  {
    brand: "SYM", name: "Husky 200 CC", source: 'stock', price: "160000", stockUnits: 3, availabilityNote: AVAILABILITY_NOTE
  },
  {
    brand: "SYM", name: "Adv husky 300cc", source: 'stock', price: "229000", stockUnits: 2, availabilityNote: AVAILABILITY_NOTE
  },
  {
    brand: "ZONTES", name: "G1 155cc ( لون فسفوري عداد ديجيتال قديم )", source: 'stock', price: "102000", stockUnits: 1, availabilityNote: AVAILABILITY_NOTE
  },
  {
    brand: "ZONTES", name: "E350", source: 'stock', price: "200000", stockUnits: 1, availabilityNote: AVAILABILITY_NOTE
  },
  {
    brand: "ZONTES", name: "G368", source: 'price-list', price: "235000", lastPriceNote: LAST_RECORDED_PRICE_NOTE
  },
  {
    brand: "ZONTES", name: "X150", source: 'stock', price: "103000", stockUnits: 11, availabilityNote: AVAILABILITY_NOTE
  },
  {
    brand: "ZONTES", name: "X150 Black", source: 'stock', price: "105000", stockUnits: 3, availabilityNote: AVAILABILITY_NOTE
  },
  {
    brand: "BENELLI", name: "VLM 200 cc", source: 'stock', price: "75000", stockUnits: 1, availabilityNote: AVAILABILITY_NOTE
  },
  {
    brand: "BENELLI", name: "Benelli VLR 150", source: 'stock', price: "60000", stockUnits: 2, availabilityNote: AVAILABILITY_NOTE
  },
  {
    brand: "BENELLI", name: "Benelli VLR 200", source: 'price-list', price: "62000", lastPriceNote: LAST_RECORDED_PRICE_NOTE
  },
  {
    brand: "BENELLI", name: "VLR 200 super sport", source: 'price-list', price: "64000", lastPriceNote: LAST_RECORDED_PRICE_NOTE
  },
  {
    brand: "KEEWAY", name: "Vieste 200 CC", source: 'stock', price: "86000", stockUnits: 6, availabilityNote: AVAILABILITY_NOTE
  },
  {
    brand: "KEEWAY", name: "SuperLight 200 CC", source: 'stock', price: "76500", stockUnits: 2, availabilityNote: AVAILABILITY_NOTE
  },
  {
    brand: "KEEWAY", name: "Keeway Xroad Inj 200 CC", source: 'stock', price: "65000", stockUnits: 3, availabilityNote: AVAILABILITY_NOTE
  },
  {
    brand: "KEEWAY", name: "Keeway Xroad 150 CC", source: 'stock', price: "56000", stockUnits: 2, availabilityNote: AVAILABILITY_NOTE
  },
  {
    brand: "KEEWAY", name: "C Light 150", source: 'catalog', price: "41,000", lastPriceNote: LAST_RECORDED_PRICE_NOTE, needsReview: true
  },
  {
    brand: "KEEWAY", name: "C Light 150 S", source: 'catalog', price: "43,000", stockUnits: 1, availabilityNote: AVAILABILITY_NOTE, needsReview: true
  },
  {
    brand: "KEEWAY", name: "XDV 200", source: 'stock', price: "90000", stockUnits: 2, availabilityNote: AVAILABILITY_NOTE
  },
  {
    brand: "KEEWAY", name: "XDV Evo 200", source: 'stock', price: "99000", stockUnits: 4, availabilityNote: AVAILABILITY_NOTE
  },
  {
    brand: "KEEWAY", name: "Keeway Keet 150", source: 'price-list', price: "53000", lastPriceNote: LAST_RECORDED_PRICE_NOTE
  },
  {
    brand: "KEEWAY", name: "Jumbo 200 CC", source: 'stock', price: "75000", stockUnits: 10, availabilityNote: AVAILABILITY_NOTE
  },
  {
    brand: "KEEWAY", name: "F25", source: 'price-list', price: "29000", lastPriceNote: LAST_RECORDED_PRICE_NOTE
  },
  {
    brand: "KEEWAY", name: "ShipMaster", source: 'stock', price: "62000", stockUnits: 4, availabilityNote: AVAILABILITY_NOTE
  },
  {
    brand: "VIGOREY", name: "KTX 250", source: 'stock', price: "68000", stockUnits: 10, availabilityNote: AVAILABILITY_NOTE
  },
  {
    brand: "VIGOREY", name: "Vigory Keet 150cc", source: 'stock', price: "44000", stockUnits: 1, availabilityNote: AVAILABILITY_NOTE
  },
  {
    brand: "HAWA", name: "Dayun Xroad 200cc Ca", source: 'stock', price: "61000", stockUnits: 1, availabilityNote: AVAILABILITY_NOTE
  },
  {
    brand: "HAWA", name: "Dayun D-Max pro 200cc", source: 'stock', price: "83500", stockUnits: 6, availabilityNote: AVAILABILITY_NOTE
  },
  {
    brand: "HAWA", name: "Dayun D-max Tx 250cc", source: 'stock', price: "115000", stockUnits: 3, availabilityNote: AVAILABILITY_NOTE
  },
  {
    brand: "TVS", name: "TVS 150 CC 3ada", source: 'price-list', price: "53900", lastPriceNote: LAST_RECORDED_PRICE_NOTE
  },
  {
    brand: "TVS", name: "TVS 150 CC Bakem", source: 'price-list', price: "56750", lastPriceNote: LAST_RECORDED_PRICE_NOTE
  },
  {
    brand: "TVS", name: "HLX F", source: 'stock', price: "59950", stockUnits: 1, availabilityNote: AVAILABILITY_NOTE
  },
  {
    brand: "TVS", name: "RTR 160 2v", source: 'stock', price: "77050", stockUnits: 3, availabilityNote: AVAILABILITY_NOTE
  },
  {
    brand: "TVS", name: "RTR 160 4v", source: 'price-list', price: "88150", lastPriceNote: LAST_RECORDED_PRICE_NOTE
  },
  {
    brand: "TVS", name: "RTR 200 4v", source: 'stock', price: "103350", stockUnits: 1, availabilityNote: AVAILABILITY_NOTE
  },
  {
    brand: "TVS", name: "TVS XL 100", source: 'stock', price: "39000", stockUnits: 6, availabilityNote: AVAILABILITY_NOTE
  },
  {
    brand: "TVS", name: "TVS XL 100 New", source: 'stock', price: "42500", stockUnits: 3, availabilityNote: AVAILABILITY_NOTE
  },
  {
    brand: "TVS", name: "TVS HLX Plus", source: 'price-list', price: "41100", lastPriceNote: LAST_RECORDED_PRICE_NOTE
  },
  {
    brand: "TVS", name: "Ntorq 125cc", source: 'stock', price: "68750", stockUnits: 10, availabilityNote: AVAILABILITY_NOTE
  },
  {
    brand: "TVS", name: "Ronin 225cc", source: 'stock', price: "125800", stockUnits: 3, availabilityNote: AVAILABILITY_NOTE
  },
  {
    brand: "TVS", name: "Raider 125cc", source: 'price-list', price: "67850", lastPriceNote: LAST_RECORDED_PRICE_NOTE
  },
  {
    brand: "AERO", name: "aero milk shake", source: 'stock', price: "39000", stockUnits: 1, availabilityNote: AVAILABILITY_NOTE
  },
  {
    brand: "AERO", name: "harley", source: 'stock', price: "60000", stockUnits: 1, availabilityNote: AVAILABILITY_NOTE
  },
  {
    brand: "HAWA ELC", name: "hamster plus", source: 'stock', price: "36750", stockUnits: 1, availabilityNote: AVAILABILITY_NOTE
  },
  {
    brand: "HAWA ELC", name: "shamo", source: 'stock', price: "24000", stockUnits: 1, availabilityNote: AVAILABILITY_NOTE
  },
  {
    brand: "ELC", name: "Segway ninebot", source: 'stock', price: "10000", stockUnits: 2, availabilityNote: AVAILABILITY_NOTE
  },
  {
    brand: "ELC", name: "Dream Land", source: 'price-list', price: "20500", lastPriceNote: LAST_RECORDED_PRICE_NOTE
  },
  {
    brand: "KUGOO", name: "KUGOO C4", source: 'price-list', price: "45000", lastPriceNote: LAST_RECORDED_PRICE_NOTE
  },
  {
    brand: "Haojing", name: "Haojing NMax", source: 'stock', price: "86500", stockUnits: 3, availabilityNote: AVAILABILITY_NOTE
  },
  {
    brand: "RAYA", name: "Raya z 6 seat standard", source: 'price-list', price: "560000", lastPriceNote: LAST_RECORDED_PRICE_NOTE
  },
  {
    brand: "RAYA", name: "Raya z 6 seat off road", source: 'price-list', price: "620000", lastPriceNote: LAST_RECORDED_PRICE_NOTE
  },
  {
    brand: "RAYA", name: "Raya z 4 seat offroad", source: 'price-list', price: "550000", lastPriceNote: LAST_RECORDED_PRICE_NOTE
  },
  {
    brand: "RAYA", name: "Raya e 4 seat off road", source: 'price-list', price: "580000", lastPriceNote: LAST_RECORDED_PRICE_NOTE
  },
  {
    brand: "RAYA", name: "Raya e 6 seat off road", source: 'price-list', price: "650000", lastPriceNote: LAST_RECORDED_PRICE_NOTE
  },
  {
    brand: "RAYA", name: "Raya x 4 seat off road", source: 'price-list', price: "640000", lastPriceNote: LAST_RECORDED_PRICE_NOTE
  },
  {
    brand: "RAYA", name: "Raya x 6 seat off road", source: 'price-list', price: "710000", lastPriceNote: LAST_RECORDED_PRICE_NOTE
  },
  {
    brand: "RAYA", name: "Raya s 6 seat offroad", source: 'price-list', price: "545000", lastPriceNote: LAST_RECORDED_PRICE_NOTE
  },
  {
    brand: "RAYA", name: "Raya s 4 seat offroad", source: 'price-list', price: "475000", lastPriceNote: LAST_RECORDED_PRICE_NOTE
  },
  {
    brand: "Volkan", name: "Hammer 200 CC", source: 'stock', price: "95000", stockUnits: 3, availabilityNote: AVAILABILITY_NOTE
  },
  {
    brand: "Volkan", name: "Hammer 230CC", source: 'stock', price: "128000", stockUnits: 1, availabilityNote: AVAILABILITY_NOTE
  },
  {
    brand: "COSWHEEL", name: "CosWheel", source: 'catalog', price: "59,000", lastPriceNote: LAST_RECORDED_PRICE_NOTE, needsReview: true
  },
  {
    brand: "ADIVA", name: "Adi 200", source: 'stock', price: "230000", stockUnits: 5, availabilityNote: AVAILABILITY_NOTE
  },
  {
    brand: "ARIIC", name: "Ariic 318 GT", source: 'catalog', price: "153,000", lastPriceNote: LAST_RECORDED_PRICE_NOTE, needsReview: true
  },
  {
    brand: "ARIIC", name: "Ariic X Gobi 300", source: 'stock', price: "125000", stockUnits: 4, availabilityNote: AVAILABILITY_NOTE
  },
  {
    brand: "LEXWAY", name: "Lexgo L10", source: 'price-list', price: "15700", lastPriceNote: LAST_RECORDED_PRICE_NOTE
  },
  {
    brand: "LEXWAY", name: "Lexgo L20", source: 'price-list', price: "16900", lastPriceNote: LAST_RECORDED_PRICE_NOTE
  },
  {
    brand: "LEXWAY", name: "Lexgo L30", source: 'price-list', price: "18950", lastPriceNote: LAST_RECORDED_PRICE_NOTE
  },
  {
    brand: "LEXWAY", name: "Lexgo Velo E-Bike", source: 'stock', price: "28000", stockUnits: 11, availabilityNote: AVAILABILITY_NOTE
  },
  {
    brand: "LEXWAY", name: "Lexkik G1", source: 'stock', price: "15500", stockUnits: 1, availabilityNote: AVAILABILITY_NOTE
  },
  {
    brand: "LEXWAY", name: "Lexkik G2", source: 'price-list', price: "25500", lastPriceNote: LAST_RECORDED_PRICE_NOTE
  },
  {
    brand: "LEXWAY", name: "Lexkik G3", source: 'price-list', price: "26500", lastPriceNote: LAST_RECORDED_PRICE_NOTE
  },
  {
    brand: "Gearnova", name: "Gearnova ES02", source: 'stock', price: "42000", stockUnits: 4, availabilityNote: AVAILABILITY_NOTE
  },
  {
    brand: "Gearnova", name: "Gearnova ES08", source: 'stock', price: "42000", stockUnits: 1, availabilityNote: AVAILABILITY_NOTE
  },
]

export const META = {
  "generatedAt": "2026-10-27T01:30:39.796Z",
  "workbook": "IRIDE Stock.xlsx",
  "siteModels": 82,
  "priceSources": {
    "stock": 50,
    "priceList": 28,
    "catalogReview": 4
  },
  "stockUnitsRecorded": 209,
  "stockKeysTotal": 59,
  "stockKeysUnpublished": 8,
  "priceList": {
    "brandHeaders": 25,
    "pricedPairs": 79,
    "unpricedX": 171,
    "nameOnlyRows": 3
  },
  "availabilityNote": "متاح",
  "lastRecordedPriceNote": "ده آخر سعر مسجل، يُرجى التواصل مع الفرع للتأكد من التوفر والسعر الحالي"
}
