import { REFERENCE_TABLES } from './referenceTables'

const EXPOSURE_CONDITION_ALIASES: Record<string, string> = {
  '室内正常环境': '室内正常',
  '室内潮湿环境': '室内潮湿',
  '室外露天环境': '室外',
  '严寒/寒冷冻融环境': '严寒冻融',
  '化学侵蚀环境': '化学侵蚀',
}

const DEFAULT_EXPOSURE_CONDITION = '室内正常'
const DEFAULT_CONCRETE_TYPE = '钢筋混凝土'

function normalizeLookupText(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value
  }
  return value.normalize('NFKC').trim()
}

function resolveLookupKey(tableId: string, keyField: string, keyValue: unknown): unknown {
  const normalizedValue = normalizeLookupText(keyValue)
  if (tableId === 'exposureConditions' && keyField === 'condition' && typeof normalizedValue === 'string') {
    const resolvedValue = normalizedValue || DEFAULT_EXPOSURE_CONDITION
    return EXPOSURE_CONDITION_ALIASES[resolvedValue] || resolvedValue
  }
  return normalizedValue
}

function matchesLookupValue(left: unknown, right: unknown) {
  return normalizeLookupText(left) === normalizeLookupText(right)
}

export function lookupExact(tableId: string, keyField: string, keyValue: any, resultField: string): any {
  const table = REFERENCE_TABLES[tableId]
  if (!table) throw new Error(`参考表 "${tableId}" 不存在`)
  const resolvedKeyValue = resolveLookupKey(tableId, keyField, keyValue)
  const row = table.data.find(r => matchesLookupValue(r[keyField], resolvedKeyValue))
  if (row === undefined) throw new Error(`在表 "${table.name}" 中未找到 ${keyField}="${keyValue}"`)
  if (!(resultField in row)) throw new Error(`表 "${table.name}" 中不存在字段 "${resultField}"`)
  return row[resultField]
}

export function lookupRange(tableId: string, minField: string, maxField: string, value: number, resultField: string): any {
  const table = REFERENCE_TABLES[tableId]
  if (!table) throw new Error(`参考表 "${tableId}" 不存在`)
  const row = table.data.find(r => value >= r[minField] && value <= r[maxField])
  if (!row) throw new Error(`在表 "${table.name}" 中未找到包含 ${value} 的区间`)
  return row[resultField]
}

function linearInterpolate(x0: number, y0: number, x1: number, y1: number, x: number): number {
  if (x1 === x0) return y0
  return y0 + (y1 - y0) * (x - x0) / (x1 - x0)
}

function sizeToField(size: number): string {
  const map: Record<number, string> = { 10: 'max_size_10', 20: 'max_size_20', 31.5: 'max_size_315', 40: 'max_size_40' }
  if (map[size]) return map[size]
  const sizes = [10, 20, 31.5, 40]
  const nearest = sizes.reduce((a, b) => Math.abs(b - size) < Math.abs(a - size) ? b : a)
  return map[nearest]
}

export function interpolateSandRatio(WC_ratio: number, aggregateType: string, maxAggregateSize: number): number {
  const table = REFERENCE_TABLES.sandRatio
  const AVAIL_SIZES = [
    { size: 10, col: 'max_size_10' },
    { size: 20, col: 'max_size_20' },
    { size: 40, col: 'max_size_40' },
  ]

  function getValueForSize(row: Record<string, any>): number {
    const exact = AVAIL_SIZES.find(s => s.size === maxAggregateSize)
    if (exact) return row[exact.col]
    const lo = [...AVAIL_SIZES].reverse().find(s => s.size <= maxAggregateSize)
    const hi = AVAIL_SIZES.find(s => s.size >= maxAggregateSize)
    if (!lo) return row[hi!.col]
    if (!hi) return row[lo.col]
    return linearInterpolate(lo.size, row[lo.col], hi.size, row[hi.col], maxAggregateSize)
  }

  const rows = table.data
    .filter(r => r.aggregate_type === aggregateType)
    .sort((a, b) => a.WC_ratio - b.WC_ratio)

  if (rows.length === 0) throw new Error(`砂率表中无 "${aggregateType}" 类型骨料数据`)
  if (WC_ratio <= rows[0].WC_ratio) return getValueForSize(rows[0])
  if (WC_ratio >= rows[rows.length - 1].WC_ratio) return getValueForSize(rows[rows.length - 1])

  for (let i = 0; i < rows.length - 1; i++) {
    const lo = rows[i], hi = rows[i + 1]
    if (WC_ratio >= lo.WC_ratio && WC_ratio <= hi.WC_ratio) {
      return linearInterpolate(lo.WC_ratio, getValueForSize(lo), hi.WC_ratio, getValueForSize(hi), WC_ratio)
    }
  }
  return getValueForSize(rows[rows.length - 1])
}

export function lookupWaterContent(slump: number, aggregateType: string, maxAggregateSize: number): number {
  const table = REFERENCE_TABLES.waterContent
  const rows = table.data.filter(r => r.aggregate_type === aggregateType)
  if (rows.length === 0) throw new Error(`用水量表中无 "${aggregateType}" 类型骨料数据`)

  const row = rows.find(r => slump >= r.slump_min && slump <= r.slump_max)
  if (!row) {
    const sorted = [...rows].sort((a, b) => a.slump_min - b.slump_min)
    const target = sorted.filter(r => r.slump_min <= slump).pop() || sorted[0]
    const col = sizeToField(maxAggregateSize)
    return target[col]
  }

  const col = sizeToField(maxAggregateSize)
  if (!(col in row)) throw new Error(`用水量表中无粒径 ${maxAggregateSize}mm 列`)
  return row[col]
}

export function lookupMaxWB(exposureCondition: string): number {
  return lookupExact('exposureConditions', 'condition', exposureCondition, 'max_WB')
}

export function lookupMinBinder(exposureCondition: string, concreteType: string): number {
  const table = REFERENCE_TABLES.durabilityLimits
  const resolvedExposureCondition = resolveLookupKey('exposureConditions', 'condition', exposureCondition)
  const normalizedConcreteType = normalizeLookupText(concreteType)
  const resolvedConcreteType =
    typeof normalizedConcreteType === 'string' && normalizedConcreteType
      ? normalizedConcreteType
      : DEFAULT_CONCRETE_TYPE
  const row = table.data.find(
    r => matchesLookupValue(r.exposure_condition, resolvedExposureCondition) &&
      matchesLookupValue(r.concrete_type, resolvedConcreteType)
  )
  if (!row) throw new Error(`耐久性表中未找到：暴露条件"${exposureCondition}", 混凝土类型"${concreteType}"`)
  return row.min_binder
}

export const TABLE_QUERY = {
  lookupExact,
  lookupRange,
  lookupWaterContent,
  interpolateSandRatio,
  lookupMaxWB,
  lookupMinBinder,
}
