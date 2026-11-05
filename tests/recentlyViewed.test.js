/**
 * اختبارات «شوهد مؤخرًا» — المخزن النقي فقط (node --test).
 * النمط نفسه باقي اختبارات المخازن: localStorage مُزوَّر قبل استيراد الوحدة،
 * ومفاتيح صالحة تؤخذ من CATALOG نفسه (بلا اختراع موديلات).
 */
import test from 'node:test'
import assert from 'node:assert/strict'

function fakeStorage() {
  const map = new Map()
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    clear: () => map.clear(),
  }
}

globalThis.localStorage = fakeStorage()
globalThis.window = { dispatchEvent: () => true }

const {
  RECENTLY_VIEWED_STORAGE_KEY,
  MAX_RECENT,
  readRecentlyViewed,
  recordModelView,
  removeRecentlyViewed,
  clearRecentlyViewed,
} = await import('../src/data/recentlyViewedStore.js')

const { CATALOG } = await import('../src/data/catalog.js')

/** أوّل (count) مفتاحًا صالحًا من الكتالوج المُجمَّد — بلا اختراع */
function firstCatalogKeys(count) {
  const keys = []
  for (const group of CATALOG) {
    for (const model of group.models) {
      keys.push({ brand: group.brand, name: model.name })
      if (keys.length >= count) return keys
    }
  }
  return keys
}

/** تعبئة مفتاح التخزين بقيمة خام مباشرة (لمحاكاة تلف/بيانات قديمة) */
function seed(raw) {
  localStorage.setItem(RECENTLY_VIEWED_STORAGE_KEY, typeof raw === 'string' ? raw : JSON.stringify(raw))
}

test('يبدأ فارغًا بلا تخزين', () => {
  localStorage.clear()
  assert.deepEqual(readRecentlyViewed(), [])
})

test('تسجيل موديل صالح يضيفه في الأعلى', () => {
  localStorage.clear()
  recordModelView('SYM', 'WOLF')
  assert.deepEqual(readRecentlyViewed(), [{ brand: 'SYM', name: 'WOLF' }])
})

test('موديل غير موجود في الكتالوج لا يُسجَّل أبدًا', () => {
  localStorage.clear()
  recordModelView('SYM', 'موديل-غير-موجود')
  recordModelView('ماركة-غير-موجودة', 'X')
  assert.deepEqual(readRecentlyViewed(), [])
})

test('الوسائط غير النصية ترفض بصمت', () => {
  localStorage.clear()
  recordModelView(null, 'WOLF')
  recordModelView('SYM', 42)
  assert.deepEqual(readRecentlyViewed(), [])
})

test('الفتح المُكرَّر يُنقل إلى الأعلى بلا تكرار', () => {
  localStorage.clear()
  recordModelView('SYM', 'WOLF')
  recordModelView('KEEWAY', 'F25')
  recordModelView('BENELLI', 'Benelli VLR 150')
  recordModelView('SYM', 'WOLF')
  const list = readRecentlyViewed()
  assert.equal(list.length, 3)
  assert.deepEqual(list.map((i) => i.name), ['WOLF', 'Benelli VLR 150', 'F25'])
})

test('سقف 10 يُطبَّق على مفاتيح كتالوج حقيقية — الأقدم يُقص أولًا', () => {
  localStorage.clear()
  const keys = firstCatalogKeys(MAX_RECENT + 2) // 12 مفتاحًا صالحًا
  assert.equal(keys.length, MAX_RECENT + 2) // الكتالوح يوفرها فعلًا
  for (const { brand, name } of keys) recordModelView(brand, name)
  const list = readRecentlyViewed()
  assert.equal(list.length, MAX_RECENT)
  // الأحدث 10 = المفاتيح من 11 إلى 2 (index 10 → 1) بهذا الترتيب
  assert.deepEqual(list[0], keys[11])
  assert.deepEqual(list[list.length - 1], keys[2])
  assert.equal(list.some((i) => i.name === keys[0].name), false)
  assert.equal(list.some((i) => i.name === keys[1].name), false)
})

test('سجل RAW بأي قيم فاسدة تُسقَط ويُبقى على السليمة', () => {
  localStorage.clear()
  recordModelView('SYM', 'WOLF')
  seed([
    { brand: 'SYM', name: 'WOLF' },   // سليمة
    { brand: 'SYM' },                  // ناقصة
    { name: 'WOLF' },                  // ناقصة
    null,                              // فاسدة
    'نص',                              // فاسدة
    { brand: 'KEEWAY', name: 'F25' },  // سليمة
  ])
  const list = readRecentlyViewed()
  assert.equal(list.length, 2)
  assert.deepEqual(list, [
    { brand: 'SYM', name: 'WOLF' },
    { brand: 'KEEWAY', name: 'F25' },
  ])
})

test('مفاتيح موجودة في السجل لكن غير موجودة في الكتالوج تُسقَط عند القراءة', () => {
  seed([{ brand: 'DELETED-BRAND', name: 'old-model' }, { brand: 'KEEWAY', name: 'F25' }])
  assert.deepEqual(readRecentlyViewed(), [{ brand: 'KEEWAY', name: 'F25' }])
})

test('التكرار داخل السجل يُزال ويُبقى على أول تكرار فقط', () => {
  seed([
    { brand: 'SYM', name: 'WOLF' },
    { brand: 'KEEWAY', name: 'F25' },
    { brand: 'SYM', name: 'WOLF' },
  ])
  const list = readRecentlyViewed()
  assert.equal(list.length, 2)
})

test('تلف JSON يُرجع قائمة فاضية بلا أخطاء', () => {
  seed('{json غير صالح')
  assert.deepEqual(readRecentlyViewed(), [])
})

test('بيانات غير مصفوفة (كائن/نص/عدد) تُرجع قائمة فاضية', () => {
  seed({ not: 'array' })
  assert.deepEqual(readRecentlyViewed(), [])
  seed('"نص"')
  assert.deepEqual(readRecentlyViewed(), [])
  seed('42')
  assert.deepEqual(readRecentlyViewed(), [])
})

test('إزالة موديل واحد لا تمس البقية', () => {
  localStorage.clear()
  recordModelView('SYM', 'WOLF')
  recordModelView('KEEWAY', 'F25')
  removeRecentlyViewed('SYM', 'WOLF')
  assert.deepEqual(readRecentlyViewed(), [{ brand: 'KEEWAY', name: 'F25' }])
})

test('إزالة مفتاح غير موجود لا تُغيّر شيئًا ولا تُرمي خطأ', () => {
  removeRecentlyViewed('ماركة-غير-موجودة', 'موديل')
  assert.deepEqual(readRecentlyViewed(), [{ brand: 'KEEWAY', name: 'F25' }])
})

test('التفريغ يمحو كل شيء', () => {
  localStorage.clear()
  recordModelView('SYM', 'WOLF')
  clearRecentlyViewed()
  assert.deepEqual(readRecentlyViewed(), [])
})

test('التفريغ بعد تخزين فاسد لا يرمي خطأ ويُخلي القائمة', () => {
  seed('###')
  clearRecentlyViewed()
  assert.deepEqual(readRecentlyViewed(), [])
})
