/**
 * كتالوج MotoHub Egypt — البيانات الثابتة.
 *
 * المصدر: docs/Vehicle_Price_List_2026.xlsx (ورقة "Price List" — عمودان A/B).
 * الاستخراج مُبرمَج من XML المصنّف مباشرة (systematic parse, zero manual transcription):
 *   - صُفوف الماركات محددة بتنسيق رأس الخلايا الأزرق الفاتح (fill FFD9E1F2 من styles.xml).
 *   - يُدرَج أي موديل يملك سعرًا رقميًا فقط؛ الأسعار التي تبدأ بـ "X" أو الخلايا الفارغة مُستبعدة.
 *   - كتلتا "Spark" مدمجتان تحت ماركة واحدة.
 *   - الأسماء والأسعار كما وردت حرفيًا (بما فيها الفواصل، العربية، الرموز)، بلا أي مواصفات/سنوات/إضافات.
 *
 * المجموع المُتحقَّق منه: 82 موديل في 19 ماركة (كل ماركة بلا موديلات مؤهلة غير مُصدَّرة: JIEDA, TERM, Spark, LONCIN).
 */

export const CATALOG = [
  {
    brand: "SYM",
    models: [
      { name: "Orbit 3 150 CC", price: "69,700" },
      { name: "Jet 4 150 CC", price: "75,000" },
      { name: "WOLF", price: "55,000" },
      { name: "SR 150 CC New 2026", price: "90,000" },
      { name: "ST 200 CC old", price: "92,000" },
      { name: "Jet 14 CA 200 cc", price: "108,000" },
      { name: "JET 14 EVO 150cc 💦", price: "130,000" },
      { name: "Jet X 200 cc", price: "129,000" },
      { name: "Nhx 180cc CBS", price: "102,000" },
      { name: "Cruisym 300cc", price: "274,900" },
      { name: "Husky 200 CC", price: "160,000" },
      { name: "Adv husky 300cc", price: "229000" },
    ],
  },
  {
    brand: "ZONTES",
    models: [
      { name: "G1 155cc ( لون فسفوري عداد ديجيتال قديم )", price: "102,000" },
      { name: "E350", price: "200,000" },
      { name: "G368", price: "235,000" },
      { name: "X150", price: "102,000" },
      { name: "X150 Black", price: "105,000" },
    ],
  },
  {
    brand: "BENELLI",
    models: [
      { name: "VLM 200 cc", price: "68,000" },
      { name: "Benelli VLR 150", price: "58,000" },
      { name: "Benelli VLR 200", price: "60,000" },
      { name: "VLR 200 super sport", price: "62,000" },
    ],
  },
  {
    brand: "KEEWAY",
    models: [
      { name: "Vieste 200 CC", price: "85,000" },
      { name: "SuperLight 200 CC", price: "75,000" },
      { name: "Keeway Xroad Inj 200 CC", price: "65,000" },
      { name: "Keeway Xroad 150 CC", price: "55,000" },
      { name: "C Light 150", price: "41,000" },
      { name: "C Light 150 S", price: "43,000" },
      { name: "XDV 200", price: "89,000" },
      { name: "XDV Evo 200", price: "99,000" },
      { name: "Keeway Keet 150", price: "53,000" },
      { name: "Jumbo 200 CC", price: "75,000" },
      { name: "F25", price: "29,000" },
      { name: "ShipMaster", price: "62,000" },
    ],
  },
  {
    brand: "VIGOREY",
    models: [
      { name: "KTX 250", price: "68,000" },
      { name: "Vigory Keet 150cc", price: "44,000" },
    ],
  },
  {
    brand: "HAWA",
    models: [
      { name: "Dayun Xroad 200cc Ca", price: "58,000" },
      { name: "Dayun D-Max pro 200cc", price: "83,500" },
      { name: "Dayun D-max Tx 250cc", price: "115,000" },
    ],
  },
  {
    brand: "TVS",
    models: [
      { name: "TVS 150 CC 3ada", price: "53,900" },
      { name: "TVS 150 CC Bakem", price: "56,750" },
      { name: "HLX F", price: "59,950" },
      { name: "RTR 160 2v", price: "77,050" },
      { name: "RTR 160 4v", price: "88,150" },
      { name: "RTR 200 4v", price: "103,350" },
      { name: "TVS XL 100", price: "39,000" },
      { name: "TVS XL 100 New", price: "42,500" },
      { name: "TVS HLX Plus", price: "41,100" },
      { name: "Ntorq 125cc", price: "68,750" },
      { name: "Ronin 225cc", price: "125,800" },
      { name: "Raider 125cc", price: "67,850" },
    ],
  },
  {
    brand: "AERO",
    models: [
      { name: "aero milk shake", price: "39,000" },
      { name: "harley", price: "60,000" },
    ],
  },
  {
    brand: "HAWA ELC",
    models: [
      { name: "hamster plus", price: "36,750" },
      { name: "shamo", price: "24,000" },
    ],
  },
  {
    brand: "ELC",
    models: [
      { name: "Segway ninebot", price: "10,000" },
      { name: "Dream Land", price: "20,500" },
    ],
  },
  {
    brand: "KUGOO",
    models: [
      { name: "KUGOO C4", price: "45,000" },
    ],
  },
  {
    brand: "Haojing",
    models: [
      { name: "Haojing NMax", price: "86,500" },
    ],
  },
  {
    brand: "RAYA",
    models: [
      { name: "Raya z 6 seat standard", price: "560,000" },
      { name: "Raya z 6 seat off road", price: "620,000" },
      { name: "Raya z 4 seat offroad", price: "550,000" },
      { name: "Raya e 4 seat off road", price: "580,000" },
      { name: "Raya e 6 seat off road", price: "650,000" },
      { name: "Raya x 4 seat off road", price: "640,000" },
      { name: "Raya x 6 seat off road", price: "710,000" },
      { name: "Raya s 6 seat offroad", price: "545,000" },
      { name: "Raya s 4 seat offroad", price: "475,000" },
    ],
  },
  {
    brand: "Volkan",
    models: [
      { name: "Hammer 200 CC", price: "95,000" },
      { name: "Hammer 230CC", price: "128,000" },
    ],
  },
  {
    brand: "COSWHEEL",
    models: [
      { name: "CosWheel", price: "59,000" },
    ],
  },
  {
    brand: "ADIVA",
    models: [
      { name: "Adi 200", price: "230,000" },
    ],
  },
  {
    brand: "ARIIC",
    models: [
      { name: "Ariic 318 GT", price: "153,000" },
      { name: "Ariic X Gobi 300", price: "125,000" },
    ],
  },
  {
    brand: "LEXWAY",
    models: [
      { name: "Lexgo L10", price: "15,700" },
      { name: "Lexgo L20", price: "16,900" },
      { name: "Lexgo L30", price: "18,950" },
      { name: "Lexgo Velo E-Bike", price: "28,000" },
      { name: "Lexkik G1", price: "15,500" },
      { name: "Lexkik G2", price: "25,500" },
      { name: "Lexkik G3", price: "26,500" },
    ],
  },
  {
    brand: "Gearnova",
    models: [
      { name: "Gearnova ES02", price: "42,000" },
      { name: "Gearnova ES08", price: "42,000" },
    ],
  }
]
