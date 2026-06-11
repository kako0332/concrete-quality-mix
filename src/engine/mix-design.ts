import type { CalculationResult, CalculationStep } from './calc-engine/types'
import {
  interpolateSandRatio,
  lookupExact,
  lookupMaxWB,
  lookupMinBinder,
  lookupRange,
} from './calc-engine/tableQuery'

export type AggregateType = 'crushed' | 'rounded'

export interface MixCalculationInput {
  strengthGrade: string
  sigma?: number
  cementStrength: number
  cementGradeFactor?: number
  aggregateType: AggregateType
  slump: number | string
  flyAshRatio?: number
  slagRatio?: number
  admixtureDosage: number | string
  exposureCondition?: string
  concreteType?: string
  maxAggregateSize?: number
  cementDensity?: number
  sandDensity?: number
  aggregateDensity?: number
  stoneApparentDensity?: number
  stoneBulkDensity?: number
  sandCompactedDensity?: number
  sandFinenessModulus?: number
  airContent?: number
}

export interface MixBinderDistribution {
  cement: number
  flyAsh: number
  slag: number
}

export interface MixCalculationResult {
  targetStrength: number
  sigma: number
  fcu0: number
  alphaA: number
  alphaB: number
  gammaF: number
  gammaS: number
  fb: number
  adjustedWater: number
  waterBinderRatio: number
  totalBinder: number
  binderDistribution: MixBinderDistribution
  sandWeight?: number
  stoneWeight?: number
  admixtureWeight?: number
  totalVolume?: number
  fillerWeight?: number
  totalMass?: number
  sandRatioAuto?: number
  waterContentAuto?: number
  wcRatioLimited?: number
  step1SandPacking?: number
  step2FillerMass?: number
  step3CorrectedSand?: number
  step3CorrectedStone?: number
  trialWeights?: {
    cement: number
    flyAsh: number
    slag: number
    water: number
    sand: number
    stone: number
    admixture: number
  }
  engineResult?: CalculationResult
}

export interface MixReportMeta {
  reportNo: string
  testDate: string
  designer: string
  projectName: string
  strengthGrade: string
  slump: string
  otherRequirements: string
  cementSpec: string
  flyAshSpec: string
  slagSpec: string
  stoneSpec: string
  sandSpec: string
  admixtureSpec: string
}

export interface MixReportPlan {
  key: 'avg30d' | 'batch' | 'manual'
  label: string
  sourceLabel?: string
  input: MixCalculationInput
  result: MixCalculationResult
}

export interface MixReportPayload {
  meta: MixReportMeta
  input: MixCalculationInput
  result: MixCalculationResult
  plans?: MixReportPlan[]
  activePlanKey?: MixReportPlan['key']
  plantId?: string
  bindingSnapshotVersion?: string
  bindingSnapshotUpdatedAt?: number
}

// Jinhua reference formula constants.
const CONSTANTS = {
  jinhuaWaterReductionCoeff: 0.22,
  jinhuaStrengthWaterAdjustmentPerMpa: 0.5,
  flyAshDensity: 2200,
  slagDensity: 2800,
  fillerDensity: 2600,
  initialSandRatio: 0.5,
  sandStoneContent: 0.0130165289256198,
  sandPowderContent: 0.0435950413223141,
}

const JINHUA_WATER_ADJUSTMENT = [
  { size: 10, adjustment: 575 },
  { size: 16, adjustment: 548 },
  { size: 20, adjustment: 530 },
  { size: 25, adjustment: 519 },
  { size: 31.5, adjustment: 504 },
  { size: 40, adjustment: 485 },
]

function getJinhuaWaterAdjustment(maxAggregateSize: number): number {
  const exact = JINHUA_WATER_ADJUSTMENT.find(row => row.size === maxAggregateSize)
  if (exact) return exact.adjustment
  const nearest = JINHUA_WATER_ADJUSTMENT.reduce((best, row) =>
    Math.abs(row.size - maxAggregateSize) < Math.abs(best.size - maxAggregateSize) ? row : best
  )
  return nearest.adjustment
}

function round(value: number, digits = 2): number {
  if (!Number.isFinite(value)) return 0
  const factor = 10 ** digits
  return Math.round((value + Number.EPSILON) * factor) / factor
}

function toNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined || value === '') return fallback
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value))
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeRatio(value: unknown, fallback = 0): number {
  const numeric = toNumber(value, fallback)
  if (numeric < 0) return fallback
  return numeric > 1 ? numeric / 100 : numeric
}

function normalizeChoice(value: unknown, fallback: string): string {
  if (typeof value !== 'string') {
    return fallback
  }
  const normalized = value.normalize('NFKC').trim()
  return normalized || fallback
}

function aggregateTypeToTableValue(type: AggregateType | string): string {
  if (type === 'crushed' || type === '碎石') return '碎石'
  if (type === 'rounded' || type === '卵石') return '卵石'
  return '碎石'
}

function parseStrengthGrade(strengthGrade: string): number {
  const match = `${strengthGrade || ''}`.match(/C(\d+(?:\.\d+)?)/i)
  if (!match) {
    throw new Error('强度等级格式无效')
  }
  return Number(match[1])
}

export { parseStrengthGrade }

export function getDefaultSigma(strengthGrade: string): number {
  const grade = parseStrengthGrade(strengthGrade)
  if (grade <= 20) return 4
  if (grade <= 40) return 6
  return 8
}

function createCalculationStep(
  id: string,
  name: string,
  sheet: string,
  value: any,
  inputValues: Record<string, any>,
  formulaStr: string,
  description: string
): CalculationStep {
  return {
    id,
    name,
    sheet,
    type: 'calculated',
    unit: null,
    value,
    formulaStr,
    inputValues,
    crossSheetDeps: [],
    source: 'reference_formula',
    description,
    excelRef: null,
  }
}

function buildEngineResult(values: Record<string, any>, steps: CalculationStep[]): CalculationResult {
  return {
    success: true,
    values,
    steps,
    errors: [],
    warnings: [],
    executionOrder: steps.map(step => step.id),
  }
}

export function calculateFullDesign(input: MixCalculationInput): MixCalculationResult {
  const fcu_k = parseStrengthGrade(input.strengthGrade)
  const aggregateType = aggregateTypeToTableValue(input.aggregateType)
  const slump = toNumber(input.slump, 150)
  const maxAggregateSize = toNumber(input.maxAggregateSize, 31.5)
  const exposureCondition = normalizeChoice(input.exposureCondition, '室内正常')
  const concreteType = normalizeChoice(input.concreteType, '钢筋混凝土')
  const cementStrength = toNumber(input.cementStrength, 0)
  const cementGradeFactor = toNumber(input.cementGradeFactor, 1)
  const cementDensity = toNumber(input.cementDensity, 3100)
  const sandDensity = toNumber(input.sandDensity, 2550)
  const aggregateDensity = toNumber(input.aggregateDensity, 2560)
  const stoneApparentDensity = toNumber(input.stoneApparentDensity, 2600)
  const stoneBulkDensity = toNumber(input.stoneBulkDensity, 1340)
  const sandCompactedDensity = toNumber(input.sandCompactedDensity, 1620)
  const sandFinenessModulus = toNumber(input.sandFinenessModulus, 2.9)
  const airContent = toNumber(input.airContent, 1.5)
  const flyAshRatio = normalizeRatio(input.flyAshRatio, 0)
  const slagRatio = normalizeRatio(input.slagRatio, 0)
  const admixtureDosage = normalizeRatio(input.admixtureDosage, 0)
  const sigmaFromTable = lookupRange('standardDeviation', 'fcu_k_min', 'fcu_k_max', fcu_k, 'sigma')
  const sigma = Number.isFinite(input.sigma ?? NaN) && Number(input.sigma) > 0
    ? Number(input.sigma)
    : sigmaFromTable

  if (flyAshRatio + slagRatio > 1) {
    throw new Error('粉煤灰和矿粉掺量之和不能超过 100%')
  }
  if (admixtureDosage < 0) {
    throw new Error('外加剂掺量不能为负')
  }

  const alphaA = lookupExact('regressionCoefficients', 'aggregate_type', aggregateType, 'alpha_a')
  const alphaB = lookupExact('regressionCoefficients', 'aggregate_type', aggregateType, 'alpha_b')
  const fce = cementStrength * cementGradeFactor
  const flyAshCoeff = flyAshRatio > 0
    ? lookupRange('flyAshCoefficients', 'ratio_min', 'ratio_max', flyAshRatio, 'gamma_f')
    : 1
  const slagCoeff = slagRatio > 0
    ? lookupRange('slagCoefficients', 'ratio_min', 'ratio_max', slagRatio, 'gamma_s')
    : 1
  const fcu0 = fcu_k + 1.645 * sigma
  const effectiveFce = fce * flyAshCoeff * slagCoeff
  const wcRatio = (alphaA * effectiveFce) / (fcu0 + alphaA * alphaB * effectiveFce)
  const wcRatioLimited = Math.min(wcRatio, lookupMaxWB(exposureCondition))
  const baseAdjustment = getJinhuaWaterAdjustment(maxAggregateSize)
  const standardWater = (slump + baseAdjustment) / 3
  const waterContent = standardWater * (1 - CONSTANTS.jinhuaWaterReductionCoeff) -
    (fcu_k - 30) * CONSTANTS.jinhuaStrengthWaterAdjustmentPerMpa
  const totalBinderContent = waterContent / wcRatioLimited
  const minBinder = lookupMinBinder(exposureCondition, concreteType)
  const binderContentChecked = Math.max(totalBinderContent, minBinder)
  const flyAshContent = binderContentChecked * flyAshRatio
  const slagContent = binderContentChecked * slagRatio
  const cementContent = binderContentChecked * (1 - flyAshRatio - slagRatio)
  const admixtureContent = binderContentChecked * admixtureDosage
  const sandRatio = aggregateType === '碎石'
    ? (() => {
        if (wcRatioLimited < 0.35) return 42
        if (wcRatioLimited < 0.4) return 43
        if (wcRatioLimited < 0.5) return 46
        if (wcRatioLimited < 0.6) return 48
        if (wcRatioLimited < 0.7) return 50
        return 51
      })()
    : interpolateSandRatio(wcRatioLimited, aggregateType, maxAggregateSize)
  const idealPasteVolume = lookupRange(
    'idealPasteVolume',
    'fineness_min',
    'fineness_max',
    sandFinenessModulus,
    'ideal_paste_volume'
  )
  const cementVolume = cementContent / cementDensity * 1000
  const flyAshVolume = flyAshContent / CONSTANTS.flyAshDensity * 1000
  const slagVolume = slagContent / CONSTANTS.slagDensity * 1000
  const airVolume = airContent * 10
  const aggregateVolume = 1000 - cementVolume - waterContent - flyAshVolume - slagVolume - airVolume
  const step1InitialAggregateMass = aggregateVolume / (
    CONSTANTS.initialSandRatio / (sandDensity / 1000) +
    (1 - CONSTANTS.initialSandRatio) / (aggregateDensity / 1000)
  )
  const step1SandForStonePacking = sandCompactedDensity * (
    1 - stoneBulkDensity / stoneApparentDensity + 0.02 + CONSTANTS.sandStoneContent
  )
  const step1StoneAfterPacking = step1InitialAggregateMass - step1SandForStonePacking
  const step2FillerRawVolume = Math.max(idealPasteVolume - waterContent - cementVolume - flyAshVolume - slagVolume, 0)
  const step2FillerRawMass = CONSTANTS.fillerDensity / 1000 * step2FillerRawVolume
  const step2SandAfterFiller = step1SandForStonePacking - step2FillerRawMass
  const fillerContent = Math.max(step2FillerRawMass - step2SandAfterFiller * CONSTANTS.sandPowderContent, 0)
  const step3CorrectedSand = step2SandAfterFiller / (1 - CONSTANTS.sandStoneContent - CONSTANTS.sandPowderContent)
  const step3CorrectedStone = step1StoneAfterPacking - step2SandAfterFiller * CONSTANTS.sandStoneContent
  const step3CorrectedAggregateMass = step3CorrectedSand + step3CorrectedStone
  const totalAggregateMass = step3CorrectedAggregateMass
  const sandContent = totalAggregateMass * (sandRatio / 100)
  const coarseAggregateContent = totalAggregateMass * (1 - sandRatio / 100)
  const totalMass = cementContent + flyAshContent + slagContent + fillerContent + waterContent + admixtureContent + sandContent + coarseAggregateContent
  const trialScale = 0.025

  const values: Record<string, any> = {
    fcu_k,
    sigma,
    sigma_from_table: sigmaFromTable,
    alpha_a: alphaA,
    alpha_b: alphaB,
    cement_grade: cementStrength,
    cement_grade_factor: cementGradeFactor,
    fce,
    fly_ash_coeff: flyAshCoeff,
    slag_coeff: slagCoeff,
    fcu_0: fcu0,
    WC_ratio: wcRatio,
    WC_ratio_limited: wcRatioLimited,
    water_content: waterContent,
    total_binder_content: totalBinderContent,
    binder_content_checked: binderContentChecked,
    fly_ash_content: flyAshContent,
    slag_content: slagContent,
    cement_content: cementContent,
    admixture_content: admixtureContent,
    sand_ratio: sandRatio,
    ideal_paste_volume: idealPasteVolume,
    aggregate_volume: aggregateVolume,
    step1_initial_aggregate_mass: step1InitialAggregateMass,
    step1_sand_for_stone_packing: step1SandForStonePacking,
    step1_stone_after_packing: step1StoneAfterPacking,
    step2_filler_raw_volume: step2FillerRawVolume,
    step2_filler_raw_mass: step2FillerRawMass,
    step2_sand_after_filler: step2SandAfterFiller,
    filler_content: fillerContent,
    step3_corrected_sand: step3CorrectedSand,
    step3_corrected_stone: step3CorrectedStone,
    step3_corrected_aggregate_mass: step3CorrectedAggregateMass,
    total_aggregate_mass: totalAggregateMass,
    sand_content: sandContent,
    coarse_aggregate_content: coarseAggregateContent,
    total_mass: totalMass,
  }

  const steps: CalculationStep[] = [
    createCalculationStep(
      'basic_params',
      '基础参数',
      'Sheet1',
      {
        strengthGrade: input.strengthGrade,
        fcu_k,
        sigma,
        aggregateType,
        maxAggregateSize,
        slump,
        exposureCondition,
        concreteType,
      },
      {
        strengthGrade: input.strengthGrade,
        sigma: input.sigma,
        aggregateType: input.aggregateType,
        maxAggregateSize: input.maxAggregateSize,
        slump: input.slump,
        exposureCondition,
        concreteType,
      },
      'fcu,k / σ / 坍落度 / 暴露条件 / 混凝土类型',
      '设计目标与约束条件'
    ),
    createCalculationStep(
      'material_params',
      '材料参数',
      'Sheet2',
      {
        cement_grade: cementStrength,
        cement_grade_factor: cementGradeFactor,
        cement_density: cementDensity,
        sand_density: sandDensity,
        aggregate_density: aggregateDensity,
        stone_apparent_density: stoneApparentDensity,
        stone_bulk_density: stoneBulkDensity,
        sand_compacted_density: sandCompactedDensity,
        sand_fineness_modulus: sandFinenessModulus,
        air_content: airContent,
        fly_ash_ratio: flyAshRatio,
        slag_ratio: slagRatio,
        admixture_dosage: admixtureDosage,
      },
      {
        cementStrength: input.cementStrength,
        cementGradeFactor: input.cementGradeFactor,
        cementDensity: input.cementDensity,
        sandDensity: input.sandDensity,
        aggregateDensity: input.aggregateDensity,
        stoneApparentDensity: input.stoneApparentDensity,
        stoneBulkDensity: input.stoneBulkDensity,
        sandCompactedDensity: input.sandCompactedDensity,
        sandFinenessModulus: input.sandFinenessModulus,
        airContent: input.airContent,
        flyAshRatio: input.flyAshRatio,
        slagRatio: input.slagRatio,
        admixtureDosage: input.admixtureDosage,
      },
      '材料参数取值',
      '水泥、骨料、掺合料与外加剂参数'
    ),
    createCalculationStep(
      'strength_calc',
      '强度计算',
      'Sheet3',
      {
        sigma: sigmaFromTable,
        fcu_0: fcu0,
        alpha_a: alphaA,
        alpha_b: alphaB,
        fce,
        fly_ash_coeff: flyAshCoeff,
        slag_coeff: slagCoeff,
        WC_ratio: wcRatio,
        WC_ratio_limited: wcRatioLimited,
        water_content: waterContent,
      },
      {
        fcu_k,
        sigma,
        cement_grade: cementStrength,
        cement_grade_factor: cementGradeFactor,
        fly_ash_ratio: flyAshRatio,
        slag_ratio: slagRatio,
      },
      'fcu,0 / αa / αb / fce / W/B',
      '强度控制与水胶比确定'
    ),
    createCalculationStep(
      'mix_ratio_calc',
      '配合比计算',
      'Sheet4',
      {
        total_binder_content: totalBinderContent,
        binder_content_checked: binderContentChecked,
        fly_ash_content: flyAshContent,
        slag_content: slagContent,
        cement_content: cementContent,
        admixture_content: admixtureContent,
        sand_ratio: sandRatio,
      },
      {
        water_content: waterContent,
        WC_ratio_limited: wcRatioLimited,
        exposureCondition,
        concreteType,
        flyAshRatio,
        slagRatio,
        admixtureDosage,
      },
      'B = W / (W/B) / min_binder',
      '胶凝材料总量与胶材分配'
    ),
    createCalculationStep(
      'aggregate_calc',
      '骨料计算',
      'Sheet5',
      {
        ideal_paste_volume: idealPasteVolume,
        aggregate_volume: aggregateVolume,
        step1_initial_aggregate_mass: step1InitialAggregateMass,
        step1_sand_for_stone_packing: step1SandForStonePacking,
        step1_stone_after_packing: step1StoneAfterPacking,
        step2_filler_raw_volume: step2FillerRawVolume,
        step2_filler_raw_mass: step2FillerRawMass,
        step2_sand_after_filler: step2SandAfterFiller,
        filler_content: fillerContent,
        step3_corrected_sand: step3CorrectedSand,
        step3_corrected_stone: step3CorrectedStone,
        step3_corrected_aggregate_mass: step3CorrectedAggregateMass,
        total_aggregate_mass: totalAggregateMass,
        sand_content: sandContent,
        coarse_aggregate_content: coarseAggregateContent,
        total_mass: totalMass,
      },
      {
        cement_content: cementContent,
        fly_ash_content: flyAshContent,
        slag_content: slagContent,
        water_content: waterContent,
        air_content: airContent,
        cement_density: cementDensity,
        sand_density: sandDensity,
        aggregate_density: aggregateDensity,
        stone_apparent_density: stoneApparentDensity,
        stone_bulk_density: stoneBulkDensity,
        sand_compacted_density: sandCompactedDensity,
        sand_fineness_modulus: sandFinenessModulus,
      },
      '理想浆体体积 / 骨料体积 / 砂率修正',
      '骨料试配与总质量'
    ),
    createCalculationStep(
      'trial_batch',
      '试拌用量',
      'Sheet5',
      {
        cement: cementContent * trialScale,
        flyAsh: flyAshContent * trialScale,
        slag: slagContent * trialScale,
        water: waterContent * trialScale,
        sand: sandContent * trialScale,
        stone: coarseAggregateContent * trialScale,
        admixture: admixtureContent * trialScale,
      },
      {
        trialScale,
      },
      '25L 试拌比例',
      '试配展示用的 25L 试拌量'
    ),
  ]

  const engineResult = buildEngineResult(values, steps)

  return {
    targetStrength: fcu_k,
    sigma: round(sigma, 2),
    fcu0: round(fcu0, 2),
    alphaA: round(alphaA, 4),
    alphaB: round(alphaB, 4),
    gammaF: round(flyAshCoeff, 4),
    gammaS: round(slagCoeff, 4),
    fb: round(effectiveFce, 2),
    adjustedWater: round(waterContent, 2),
    waterBinderRatio: round(wcRatioLimited, 3),
    totalBinder: round(binderContentChecked, 2),
    binderDistribution: {
      cement: round(cementContent, 2),
      flyAsh: round(flyAshContent, 2),
      slag: round(slagContent, 2),
    },
    sandWeight: round(sandContent, 2),
    stoneWeight: round(coarseAggregateContent, 2),
    admixtureWeight: round(admixtureContent, 2),
    totalVolume: round((aggregateVolume + cementVolume + waterContent + flyAshVolume + slagVolume + airVolume) / 1000, 4),
    fillerWeight: round(fillerContent, 2),
    totalMass: round(totalMass, 2),
    sandRatioAuto: round(sandRatio, 2),
    waterContentAuto: round(waterContent, 2),
    wcRatioLimited: round(wcRatioLimited, 3),
    step1SandPacking: round(step1SandForStonePacking, 2),
    step2FillerMass: round(step2FillerRawMass, 2),
    step3CorrectedSand: round(step3CorrectedSand, 2),
    step3CorrectedStone: round(step3CorrectedStone, 2),
    trialWeights: {
      cement: round(cementContent * trialScale, 3),
      flyAsh: round(flyAshContent * trialScale, 3),
      slag: round(slagContent * trialScale, 3),
      water: round(waterContent * trialScale, 3),
      sand: round(sandContent * trialScale, 3),
      stone: round(coarseAggregateContent * trialScale, 3),
      admixture: round(admixtureContent * trialScale, 3),
    },
    engineResult,
  }
}

export function generateDefaultReportNo(date = new Date()): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const suffix = `${date.getHours()}${date.getMinutes()}`.padStart(4, '0')
  return `${year}${month}${day}${suffix}`
}

export function createDefaultMixReportMeta(strengthGrade = 'C30'): MixReportMeta {
  const now = new Date()
  const dateText = `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}-${`${now.getDate()}`.padStart(2, '0')}`
  return {
    reportNo: generateDefaultReportNo(now),
    testDate: dateText,
    designer: '',
    projectName: '',
    strengthGrade,
    slump: '150±30',
    otherRequirements: '',
    cementSpec: '',
    flyAshSpec: '',
    slagSpec: '',
    stoneSpec: '',
    sandSpec: '',
    admixtureSpec: ''
  }
}
