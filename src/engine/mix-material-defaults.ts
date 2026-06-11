import type {
  LatestMaterialRecordsResponse,
  MaterialBindingRole,
  MaterialBindingSourceMode,
  MaterialLog,
  MixMaterialBindingConfig,
} from '@/types/cloud-api'
import { getFieldLabel } from './field-labels'

export function shouldApplyDefaultValue<T>(
  currentValue: T,
  initialValue: T | undefined,
  nextValue: T | undefined | null | ''
) {
  if (nextValue === undefined || nextValue === null || nextValue === '') {
    return false
  }

  if (initialValue !== undefined) {
    return currentValue === initialValue
  }

  return currentValue === '' || currentValue === null || currentValue === undefined
}

export function pickLatestMaterialRecord<T extends Pick<MaterialLog, 'create_date'>>(
  ...records: Array<T | undefined>
) {
  return records
    .filter((item): item is T => Boolean(item))
    .sort((a, b) => Number(b.create_date || 0) - Number(a.create_date || 0))[0]
}

export type MaterialBindingKey = MaterialBindingRole

export interface MaterialBindingStatus {
  key: MaterialBindingKey
  label: string
  found: boolean
  sourceDate: number | null
  sourceMode?: MaterialBindingSourceMode
  summaryApplied: boolean
  keyParamApplied: boolean
  keyParamLabel?: string
  materialLogId?: string
  manualConfirmRequired: boolean
  message: string
}

export interface MaterialBindingSummary {
  identifiedKeyParamCount: number
  pendingConfirmCount: number
  missingCount: number
  failedCount: number
}

export interface MaterialDefaultBindingResult<
  TForm extends Record<string, any>,
  TMeta extends Record<string, any>
> {
  formPatch: Partial<TForm>
  metaPatch: Partial<TMeta>
  status: MaterialBindingStatus[]
}

const MATERIAL_LABELS: Record<MaterialBindingKey, string> = {
  cement: '水泥',
  flyAsh: '粉煤灰',
  slag: '矿粉',
  sand: '砂',
  stone: '石子',
  admixture: '外加剂',
}

const DEFAULT_BINDING_CONFIGS: Record<MaterialBindingKey, MixMaterialBindingConfig> = {
  cement: {
    role: 'cement',
    label: '水泥',
    order: 10,
    material_types: ['水泥'],
    key_param_fields: ['strength28d'],
    density_param_fields: ['apparentDensity'],
    report_fields: [],
    manual_confirm_required: true,
  },
  flyAsh: {
    role: 'flyAsh',
    label: '粉煤灰',
    order: 20,
    material_types: ['粉煤灰', '煤灰'],
    key_param_fields: [],
    density_param_fields: ['apparentDensity'],
    report_fields: [],
    manual_confirm_required: false,
  },
  slag: {
    role: 'slag',
    label: '矿粉',
    order: 30,
    material_types: ['矿粉', '矿渣粉'],
    key_param_fields: [],
    density_param_fields: ['apparentDensity'],
    report_fields: [],
    manual_confirm_required: false,
  },
  sand: {
    role: 'sand',
    label: '砂',
    order: 40,
    material_types: ['机制砂', '砂'],
    key_param_fields: ['finenessModulus'],
    density_param_fields: ['apparentDensity', 'compactedDensity'],
    report_fields: [],
    manual_confirm_required: false,
  },
  stone: {
    role: 'stone',
    label: '石子',
    order: 50,
    material_types: ['石子', '石'],
    key_param_fields: [],
    density_param_fields: ['apparentDensity', 'compactedDensity'],
    report_fields: [],
    manual_confirm_required: false,
  },
  admixture: {
    role: 'admixture',
    label: '外加剂',
    order: 60,
    material_types: ['外加剂'],
    key_param_fields: ['waterReductionRate'],
    density_param_fields: [],
    report_fields: [],
    manual_confirm_required: false,
  },
}

// Historical compatibility layer for older cement records.
// The main line uses `strength28d`, but we still read legacy strength aliases until existing data is cleaned up.
const CEMENT_KEY_PARAM_FALLBACK_FIELDS = ['strength28d', 'fce', 'actualStrength', 'strengthComp28d', 'avgStrength', 'strengthValue']

const MATERIAL_TO_FORM_FIELD_MAP: Record<MaterialBindingKey, Record<string, keyof any>> = {
  cement: {
    apparentDensity: 'cementDensity',
  },
  flyAsh: {},
  slag: {},
  sand: {
    apparentDensity: 'sandDensity',
    compactedDensity: 'sandCompactedDensity',
    finenessModulus: 'sandFinenessModulus',
  },
  stone: {
    apparentDensity: 'stoneApparentDensity',
    compactedDensity: 'stoneBulkDensity',
    bulkDensity: 'stoneBulkDensity',
  },
  admixture: {},
}

function getEffectiveBindingConfig(
  key: MaterialBindingKey,
  configs?: Partial<Record<MaterialBindingKey, MixMaterialBindingConfig>>
) {
  return configs?.[key] || DEFAULT_BINDING_CONFIGS[key]
}

function getKeyParamLabel(key: MaterialBindingKey) {
  if (key === 'cement') {
    return getFieldLabel('strength28d')
  }
  if (key === 'sand') {
    return getFieldLabel('finenessModulus')
  }
  if (key === 'admixture') {
    return getFieldLabel('waterReductionRate')
  }
  return undefined
}

function getRecordData(record?: MaterialLog) {
  return record?.data_content || {}
}

function extractFieldValue(entry: any) {
  if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
    if ('value' in entry) {
      return entry.value
    }
    if ('text' in entry) {
      return entry.text
    }
  }
  return entry
}

function pickFirstPositiveValue(data: Record<string, any>, fields: string[]) {
  const matchedField = fields.find(field => Number(extractFieldValue(data[field])) > 0)
  return {
    matchedField,
    value: matchedField ? extractFieldValue(data[matchedField]) : undefined,
  }
}

function getKeyParamFieldCandidates(
  key: MaterialBindingKey,
  config: MixMaterialBindingConfig
) {
  const configuredFields = Array.isArray(config.key_param_fields)
    ? config.key_param_fields.filter(Boolean)
    : []
  const fallbackFields =
    key === 'cement'
      ? CEMENT_KEY_PARAM_FALLBACK_FIELDS
      : key === 'sand'
        ? ['finenessModulus']
        : key === 'admixture'
          ? ['waterReductionRate', 'reduction']
          : []
  return [...new Set([...configuredFields, ...fallbackFields])]
}

function getDensityFieldCandidates(role: MaterialBindingKey, densityField: string) {
  if (role === 'stone' && densityField === 'compactedDensity') {
    return ['compactedDensity', 'bulkDensity']
  }
  if (role === 'stone' && densityField === 'bulkDensity') {
    return ['bulkDensity', 'compactedDensity']
  }
  return [densityField]
}

function applyKeyParamFieldPatch<TForm extends Record<string, any>>(
  currentForm: TForm,
  snapshots: Partial<TForm>,
  formPatch: Partial<TForm>,
  key: MaterialBindingKey,
  config: MixMaterialBindingConfig,
  data: Record<string, any>
) {
  const { value } = pickFirstPositiveValue(data, getKeyParamFieldCandidates(key, config))
  if (value === undefined) {
    return false
  }
  if (key === 'cement') {
    return applyFormField(currentForm, snapshots, formPatch, 'cementStrength' as keyof TForm, String(value) as TForm[keyof TForm])
  }
  if (key === 'sand') {
    return applyFormField(currentForm, snapshots, formPatch, 'sandFinenessModulus' as keyof TForm, String(value) as TForm[keyof TForm])
  }
  return true
}

function buildSummaryFromConfig(record: MaterialLog, config: MixMaterialBindingConfig) {
  const data = getRecordData(record)
  return formatMaterialSpec([record.material_type, ...config.report_fields.map(field => extractFieldValue(data[field]))])
}

function buildStatus(
  key: MaterialBindingKey,
  record: MaterialLog | undefined,
  summaryApplied: boolean,
  keyParamApplied: boolean,
  sourceMode: MaterialBindingSourceMode,
  manualConfirmRequired: boolean
): MaterialBindingStatus {
  const keyParamLabel = getKeyParamLabel(key)

  if (!record) {
    return {
      key,
      label: MATERIAL_LABELS[key],
      found: false,
      sourceDate: null,
      sourceMode,
      summaryApplied: false,
      keyParamApplied: false,
      keyParamLabel,
      manualConfirmRequired,
      message: '未找到最近检测记录',
    }
  }

  if (keyParamApplied) {
    return {
      key,
      label: MATERIAL_LABELS[key],
      found: true,
      sourceDate: Number(record.create_date || 0),
      sourceMode,
      summaryApplied,
      keyParamApplied: true,
      keyParamLabel,
      materialLogId: record._id,
      manualConfirmRequired,
      message: keyParamLabel
        ? `已识别关键参数 ${keyParamLabel}，并带入当前表单`
        : '已识别关键参数并带入当前表单',
    }
  }

  if (summaryApplied) {
    return {
      key,
      label: MATERIAL_LABELS[key],
      found: true,
      sourceDate: Number(record.create_date || 0),
      sourceMode,
      summaryApplied: true,
      keyParamApplied: false,
      keyParamLabel,
      materialLogId: record._id,
      manualConfirmRequired,
      message: manualConfirmRequired
        ? '已找到记录并带入摘要信息，关键参数仍需人工确认'
        : '已找到记录并带入摘要信息',
    }
  }

  return {
    key,
    label: MATERIAL_LABELS[key],
    found: true,
    sourceDate: Number(record.create_date || 0),
    sourceMode,
    summaryApplied: false,
    keyParamApplied: false,
    keyParamLabel,
    materialLogId: record._id,
    manualConfirmRequired,
    message: manualConfirmRequired
      ? '已找到记录，但未识别到可自动带入的关键参数，仍需人工确认'
      : '已找到记录，但未识别到可自动带入的内容',
  }
}

function getRoleRecords(latestRecords: LatestMaterialRecordsResponse): Record<MaterialBindingKey, MaterialLog | undefined> {
  return {
    cement: latestRecords['水泥'],
    flyAsh: pickLatestMaterialRecord(latestRecords['粉煤灰'], latestRecords['煤灰']),
    slag: pickLatestMaterialRecord(latestRecords['矿粉'], latestRecords['矿渣粉']),
    sand: pickLatestMaterialRecord(latestRecords['机制砂'], latestRecords['砂']),
    stone: pickLatestMaterialRecord(latestRecords['石子'], latestRecords['石']),
    admixture: latestRecords['外加剂'],
  }
}

function applyFormField<TForm extends Record<string, any>, K extends keyof TForm>(
  currentForm: TForm,
  snapshots: Partial<TForm>,
  formPatch: Partial<TForm>,
  key: K,
  nextValue: TForm[K]
) {
  if (shouldApplyDefaultValue(currentForm[key], snapshots[key], nextValue)) {
    formPatch[key] = nextValue
    return true
  }
  return false
}

function applyMetaField<TMeta extends Record<string, any>, K extends keyof TMeta>(
  currentMeta: TMeta,
  snapshots: Partial<TMeta> | undefined,
  metaPatch: Partial<TMeta>,
  key: K,
  nextValue: TMeta[K]
) {
  if (shouldApplyDefaultValue(currentMeta[key], snapshots?.[key], nextValue)) {
    metaPatch[key] = nextValue
    return true
  }
  return false
}

function applyDensityFields<TForm extends Record<string, any>>(
  currentForm: TForm,
  snapshots: Partial<TForm>,
  formPatch: Partial<TForm>,
  data: Record<string, any>,
  config: MixMaterialBindingConfig,
  role: MaterialBindingKey
) {
  const fieldMap = MATERIAL_TO_FORM_FIELD_MAP[role]
  const densityFields = Array.isArray(config.density_param_fields) && config.density_param_fields.length > 0
    ? config.density_param_fields
    : role === 'cement'
      ? ['apparentDensity']
      : []

  let applied = false
  densityFields.forEach((densityField) => {
    const formField = fieldMap[densityField]
    if (!formField) return
    const { value } = pickFirstPositiveValue(data, getDensityFieldCandidates(role, densityField))
    if (Number(value) > 0) {
      const nextValue = String(value) as TForm[keyof TForm]
      if (applyFormField(currentForm, snapshots, formPatch, formField as keyof TForm, nextValue)) {
        applied = true
      }
    }
  })
  return applied
}

export function createFailedMaterialBindingStatus(message = '获取最近检测记录失败，当前未带入默认值'): MaterialBindingStatus[] {
  return (Object.keys(MATERIAL_LABELS) as MaterialBindingKey[]).map((key) => ({
    key,
    label: MATERIAL_LABELS[key],
    found: false,
    sourceDate: null,
    sourceMode: 'unconfirmed',
    summaryApplied: false,
    keyParamApplied: false,
    keyParamLabel: getKeyParamLabel(key),
    manualConfirmRequired: DEFAULT_BINDING_CONFIGS[key].manual_confirm_required,
    message,
  }))
}

export function formatMaterialSpec(parts: Array<string | undefined | null>) {
  const normalized = parts
    .map(item => `${item || ''}`.trim())
    .filter(Boolean)
    .filter((item, index, arr) => arr.indexOf(item) === index)
  return normalized.join(' / ')
}

export function createLatestRecordsFromRoleBindings(recordsByRole: Partial<Record<MaterialBindingKey, MaterialLog | undefined>>): LatestMaterialRecordsResponse {
  const result: LatestMaterialRecordsResponse = {}
  if (recordsByRole.cement) result['水泥'] = recordsByRole.cement
  if (recordsByRole.flyAsh) {
    result['粉煤灰'] = recordsByRole.flyAsh
    result['煤灰'] = recordsByRole.flyAsh
  }
  if (recordsByRole.slag) {
    result['矿粉'] = recordsByRole.slag
    result['矿渣粉'] = recordsByRole.slag
  }
  if (recordsByRole.sand) {
    result['机制砂'] = recordsByRole.sand
    result['砂'] = recordsByRole.sand
  }
  if (recordsByRole.stone) {
    result['石子'] = recordsByRole.stone
    result['石'] = recordsByRole.stone
  }
  if (recordsByRole.admixture) result['外加剂'] = recordsByRole.admixture
  return result
}

export function buildManualMaterialBindingPatch(
  key: MaterialBindingKey,
  record: MaterialLog | undefined,
  configs?: Partial<Record<MaterialBindingKey, MixMaterialBindingConfig>>
) {
  if (!record) {
    return {
      formPatch: {} as Record<string, string>,
      metaPatch: {} as Record<string, string>,
      keyParamApplied: false,
      summaryApplied: false,
    }
  }

  const config = getEffectiveBindingConfig(key, configs)
  const data = getRecordData(record)
  const formPatch: Record<string, string> = {}
  const metaPatch: Record<string, string> = {}
  const summary = buildSummaryFromConfig(record, config)

  if (key === 'cement' && summary) {
    metaPatch.cementSpec = summary
  } else if (key === 'flyAsh' && summary) {
    metaPatch.flyAshSpec = summary
  } else if (key === 'slag' && summary) {
    metaPatch.slagSpec = summary
  } else if (key === 'sand' && summary) {
    metaPatch.sandSpec = summary
  } else if (key === 'stone' && summary) {
    metaPatch.stoneSpec = summary
  } else if (key === 'admixture' && summary) {
    metaPatch.admixtureSpec = summary
  }

  let keyParamApplied = false
  const keyParamValue = pickFirstPositiveValue(data, getKeyParamFieldCandidates(key, config)).value
  if (keyParamValue !== undefined) {
    if (key === 'cement') {
      formPatch.cementStrength = String(keyParamValue)
      keyParamApplied = true
    } else if (key === 'sand') {
      formPatch.sandFinenessModulus = String(keyParamValue)
      keyParamApplied = true
    } else {
      keyParamApplied = true
    }
  }

  if (key === 'cement') {
    const densityValue = pickFirstPositiveValue(data, getDensityFieldCandidates(key, 'apparentDensity')).value
    if (densityValue !== undefined) {
      formPatch.cementDensity = String(densityValue)
      keyParamApplied = true
    }
  } else if (key === 'sand') {
    const apparentDensityValue = pickFirstPositiveValue(data, getDensityFieldCandidates(key, 'apparentDensity')).value
    if (apparentDensityValue !== undefined) formPatch.sandDensity = String(apparentDensityValue)
    const compactedDensityValue = pickFirstPositiveValue(data, getDensityFieldCandidates(key, 'compactedDensity')).value
    if (compactedDensityValue !== undefined) formPatch.sandCompactedDensity = String(compactedDensityValue)
  } else if (key === 'stone') {
    const apparentDensityValue = pickFirstPositiveValue(data, getDensityFieldCandidates(key, 'apparentDensity')).value
    if (apparentDensityValue !== undefined) formPatch.stoneApparentDensity = String(apparentDensityValue)
    const compactedDensityValue = pickFirstPositiveValue(data, getDensityFieldCandidates(key, 'compactedDensity')).value
    if (compactedDensityValue !== undefined) formPatch.stoneBulkDensity = String(compactedDensityValue)
  }

  return {
    formPatch,
    metaPatch,
    keyParamApplied,
    summaryApplied: Object.keys(metaPatch).length > 0,
  }
}

export function resolveMaterialDefaultBindings<
  TForm extends Record<string, any>,
  TMeta extends Record<string, any>
>(
  latestRecords: LatestMaterialRecordsResponse,
  currentForm: TForm,
  currentMeta: TMeta,
  snapshots: {
    form: Partial<TForm>
    meta?: Partial<TMeta>
  },
  configs?: Partial<Record<MaterialBindingKey, MixMaterialBindingConfig>>
): MaterialDefaultBindingResult<TForm, TMeta> {
  const formPatch: Partial<TForm> = {}
  const metaPatch: Partial<TMeta> = {}
  const status: MaterialBindingStatus[] = []

  const roleRecords = getRoleRecords(latestRecords)

  ;(Object.keys(MATERIAL_LABELS) as MaterialBindingKey[]).forEach((key) => {
    const record = roleRecords[key]
    const config = getEffectiveBindingConfig(key, configs)
    const summary = record ? buildSummaryFromConfig(record, config) : ''
    let summaryApplied = false
    let keyParamApplied = false

    if (record && summary) {
      const metaKeyMap: Record<MaterialBindingKey, keyof TMeta> = {
        cement: 'cementSpec' as keyof TMeta,
        flyAsh: 'flyAshSpec' as keyof TMeta,
        slag: 'slagSpec' as keyof TMeta,
        sand: 'sandSpec' as keyof TMeta,
        stone: 'stoneSpec' as keyof TMeta,
        admixture: 'admixtureSpec' as keyof TMeta,
      }
      summaryApplied = applyMetaField(currentMeta, snapshots.meta, metaPatch, metaKeyMap[key], summary as TMeta[keyof TMeta])
    }

    if (record) {
      if (applyKeyParamFieldPatch(currentForm, snapshots.form, formPatch, key, config, getRecordData(record))) {
        keyParamApplied = true
      }
      if (applyDensityFields(currentForm, snapshots.form, formPatch, getRecordData(record), config, key)) {
        keyParamApplied = true
      }
    }

    status.push(
      buildStatus(
        key,
        record,
        summaryApplied,
        keyParamApplied,
        record ? 'fallback_latest' : 'unconfirmed',
        config.manual_confirm_required
      )
    )
  })

  return {
    formPatch,
    metaPatch,
    status,
  }
}

export function shouldWarnUnconfirmedCriticalParams({
  cementStrength,
  defaultCementStrength,
  status,
}: {
  cementStrength: string
  defaultCementStrength: string
  status: MaterialBindingStatus[]
}) {
  const cementBinding = status.find(item => item.key === 'cement')
  const cementNeedsConfirm =
    cementStrength === defaultCementStrength &&
    !!cementBinding?.manualConfirmRequired &&
    !cementBinding?.keyParamApplied

  return {
    cementNeedsConfirm,
    shouldWarn: cementNeedsConfirm,
  }
}

export function summarizeMaterialBindingStatus(status: MaterialBindingStatus[]): MaterialBindingSummary {
  const failedCount = status.filter(item => item.message.includes('获取最近检测记录失败')).length
  const missingCount = status.filter(item => !item.found).length
  const identifiedKeyParamCount = status.filter(item => item.keyParamApplied).length
  const pendingConfirmCount = status.filter(item => item.found && item.manualConfirmRequired && !item.keyParamApplied).length

  return {
    identifiedKeyParamCount,
    pendingConfirmCount,
    missingCount,
    failedCount,
  }
}
