import type { ParameterDef, CalculationResult, CalculationStep } from './types'
import { topologicalSort } from './dependencyGraph'
import { TABLE_QUERY } from './tableQuery'

// Jinhua reference formula constants.
const INTERNAL_CONSTANTS = {
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

const tq = TABLE_QUERY

export const PARAMETERS: Record<string, ParameterDef> = {
  fcu_k: {
    id: 'fcu_k', name: '混凝土强度等级特征值', sheet: 'Sheet1', unit: 'MPa',
    type: 'input', defaultValue: 30, editable: true, required: true,
    range: { min: 15, max: 80 }, formulaStr: null, dependencies: [], formula: null,
    currentValue: null, description: '混凝土抗压强度标准值 fcu,k',
  },
  aggregate_type: {
    id: 'aggregate_type', name: '粗骨料类型', sheet: 'Sheet1', unit: '-',
    type: 'input', defaultValue: '碎石', editable: true, required: true,
    range: null, formulaStr: null, dependencies: [], formula: null,
    currentValue: null, description: '碎石或卵石',
  },
  max_aggregate_size: {
    id: 'max_aggregate_size', name: '粗骨料最大公称粒径', sheet: 'Sheet1', unit: 'mm',
    type: 'input', defaultValue: 31.5, editable: true, required: true,
    range: null, formulaStr: null, dependencies: [], formula: null,
    currentValue: null, description: '影响用水量查表',
  },
  slump: {
    id: 'slump', name: '坍落度', sheet: 'Sheet1', unit: 'mm',
    type: 'input', defaultValue: 150, editable: true, required: true,
    range: { min: 10, max: 180 }, formulaStr: null, dependencies: [], formula: null,
    currentValue: null, description: '新拌混凝土工作性指标',
  },
  exposure_condition: {
    id: 'exposure_condition', name: '暴露条件', sheet: 'Sheet1', unit: '-',
    type: 'input', defaultValue: '室内正常', editable: true, required: true,
    range: null, formulaStr: null, dependencies: [], formula: null,
    currentValue: null, description: '环境类别，决定最大水胶比限值',
  },
  concrete_type: {
    id: 'concrete_type', name: '混凝土结构类型', sheet: 'Sheet1', unit: '-',
    type: 'input', defaultValue: '钢筋混凝土', editable: true, required: true,
    range: null, formulaStr: null, dependencies: [], formula: null,
    currentValue: null, description: '素/钢筋/预应力',
  },
  cement_grade: {
    id: 'cement_grade', name: '水泥实际强度 fce', sheet: 'Sheet2', unit: 'MPa',
    type: 'input', defaultValue: 47, editable: true, required: true,
    range: { min: 10, max: 100 }, formulaStr: null, dependencies: [], formula: null,
    currentValue: null, description: '水泥实际强度',
  },
  cement_grade_factor: {
    id: 'cement_grade_factor', name: '水泥强度富余系数 γc', sheet: 'Sheet2', unit: '-',
    type: 'input', defaultValue: 1, editable: true, required: false,
    range: { min: 0.8, max: 1.3 }, formulaStr: null, dependencies: [], formula: null,
    currentValue: null, description: '富余系数', hidden: true,
  },
  cement_density: {
    id: 'cement_density', name: '水泥表观密度 ρc', sheet: 'Sheet2', unit: 'kg/m³',
    type: 'input', defaultValue: 3100, editable: true, required: true,
    range: { min: 2900, max: 3200 }, formulaStr: null, dependencies: [], formula: null,
    currentValue: null, description: '水泥表观密度',
  },
  sand_density: {
    id: 'sand_density', name: '砂表观密度 ρs', sheet: 'Sheet2', unit: 'kg/m³',
    type: 'input', defaultValue: 2550, editable: true, required: true,
    range: { min: 2400, max: 2800 }, formulaStr: null, dependencies: [], formula: null,
    currentValue: null, description: '细骨料表观密度',
  },
  aggregate_density: {
    id: 'aggregate_density', name: '粗骨料表观密度 ρg', sheet: 'Sheet2', unit: 'kg/m³',
    type: 'input', defaultValue: 2560, editable: true, required: true,
    range: { min: 2400, max: 2900 }, formulaStr: null, dependencies: [], formula: null,
    currentValue: null, description: '粗骨料表观密度',
  },
  air_content: {
    id: 'air_content', name: '含气量 α', sheet: 'Sheet2', unit: '%',
    type: 'input', defaultValue: 1.5, editable: true, required: true,
    range: { min: 0, max: 8 }, formulaStr: null, dependencies: [], formula: null,
    currentValue: null, description: '含气量百分比',
  },
  fly_ash_ratio: {
    id: 'fly_ash_ratio', name: '粉煤灰替代比例', sheet: 'Sheet2', unit: '-',
    type: 'input', defaultValue: 0.15, editable: true, required: true,
    range: { min: 0, max: 0.40 }, formulaStr: null, dependencies: [], formula: null,
    currentValue: null, description: '粉煤灰占总胶凝材料比例',
  },
  slag_ratio: {
    id: 'slag_ratio', name: '矿粉替代比例', sheet: 'Sheet2', unit: '-',
    type: 'input', defaultValue: 0.195, editable: true, required: true,
    range: { min: 0, max: 0.50 }, formulaStr: null, dependencies: [], formula: null,
    currentValue: null, description: '矿粉占总胶凝材料比例',
  },
  admixture_dosage: {
    id: 'admixture_dosage', name: '外加剂掺量', sheet: 'Sheet2', unit: '-',
    type: 'input', defaultValue: 0.019, editable: true, required: true,
    range: { min: 0, max: 0.05 }, formulaStr: null, dependencies: [], formula: null,
    currentValue: null, description: '外加剂占总胶凝材料掺量',
  },
  stone_apparent_density: {
    id: 'stone_apparent_density', name: '石子表观密度', sheet: 'Sheet2', unit: 'kg/m³',
    type: 'input', defaultValue: 2600, editable: true, required: true,
    range: { min: 2400, max: 2900 }, formulaStr: null, dependencies: [], formula: null,
    currentValue: null, description: '石子表观密度（四步校正用）',
  },
  stone_bulk_density: {
    id: 'stone_bulk_density', name: '石子堆积密度', sheet: 'Sheet2', unit: 'kg/m³',
    type: 'input', defaultValue: 1340, editable: true, required: true,
    range: { min: 1000, max: 1800 }, formulaStr: null, dependencies: [], formula: null,
    currentValue: null, description: '石子堆积密度（四步校正用）',
  },
  sand_compacted_density: {
    id: 'sand_compacted_density', name: '砂紧密堆积密度', sheet: 'Sheet2', unit: 'kg/m³',
    type: 'input', defaultValue: 1620, editable: true, required: true,
    range: { min: 1400, max: 1900 }, formulaStr: null, dependencies: [], formula: null,
    currentValue: null, description: '砂紧密堆积密度（四步校正用）',
  },
  sand_fineness_modulus: {
    id: 'sand_fineness_modulus', name: '砂细度模数', sheet: 'Sheet2', unit: '-',
    type: 'input', defaultValue: 2.9, editable: true, required: true,
    range: { min: 2.0, max: 3.5 }, formulaStr: null, dependencies: [], formula: null,
    currentValue: null, description: '砂细度模数',
  },
  fly_ash_coeff: {
    id: 'fly_ash_coeff', name: '粉煤灰影响系数 γf', sheet: 'Sheet3', unit: '-',
    type: 'calculated', defaultValue: null, editable: false, required: false,
    range: null, formulaStr: 'LOOKUP(fly_ash_ratio → flyAshCoefficients)', dependencies: ['fly_ash_ratio'],
    formula: (p: any) => tq.lookupRange('flyAshCoefficients', 'ratio_min', 'ratio_max', p.fly_ash_ratio, 'gamma_f'),
    currentValue: null, description: '粉煤灰影响系数 γf',
  },
  slag_coeff: {
    id: 'slag_coeff', name: '矿粉影响系数 γs', sheet: 'Sheet3', unit: '-',
    type: 'calculated', defaultValue: null, editable: false, required: false,
    range: null, formulaStr: 'LOOKUP(slag_ratio → slagCoefficients)', dependencies: ['slag_ratio'],
    formula: (p: any) => tq.lookupRange('slagCoefficients', 'ratio_min', 'ratio_max', p.slag_ratio, 'gamma_s'),
    currentValue: null, description: '矿粉影响系数 γs',
  },
  sigma: {
    id: 'sigma', name: '强度标准差 σ', sheet: 'Sheet3', unit: 'MPa',
    type: 'calculated', defaultValue: null, editable: false, required: false,
    range: null, formulaStr: '金华标准', dependencies: ['fcu_k'],
    formula: (p: any) => tq.lookupRange('standardDeviation', 'fcu_k_min', 'fcu_k_max', p.fcu_k, 'sigma'),
    currentValue: null, description: '强度标准差 σ（金华标准）',
  },
  fce: {
    id: 'fce', name: '水泥实际强度 fce', sheet: 'Sheet3', unit: 'MPa',
    type: 'calculated', defaultValue: null, editable: false, required: false,
    range: null, formulaStr: 'fce = cement_grade × γc', dependencies: ['cement_grade', 'cement_grade_factor'],
    formula: (p: any) => p.cement_grade * (p.cement_grade_factor ?? 1),
    currentValue: null, description: '水泥实际强度',
  },
  fcu_0: {
    id: 'fcu_0', name: '配制强度 fcu,0', sheet: 'Sheet3', unit: 'MPa',
    type: 'calculated', defaultValue: null, editable: false, required: false,
    range: null, formulaStr: 'fcu,0 = fcu,k + 1.645 × σ', dependencies: ['fcu_k', 'sigma'],
    formula: (p: any) => p.fcu_k + 1.645 * p.sigma,
    currentValue: null, description: '混凝土配制强度',
  },
  alpha_a: {
    id: 'alpha_a', name: '回归系数 αa', sheet: 'Sheet4', unit: '-',
    type: 'calculated', defaultValue: null, editable: false, required: false,
    range: null, formulaStr: 'LOOKUP(regressionCoefficients)', dependencies: ['aggregate_type'],
    formula: (p: any) => tq.lookupExact('regressionCoefficients', 'aggregate_type', p.aggregate_type, 'alpha_a'),
    currentValue: null, description: '回归系数 αa',
  },
  alpha_b: {
    id: 'alpha_b', name: '回归系数 αb', sheet: 'Sheet4', unit: '-',
    type: 'calculated', defaultValue: null, editable: false, required: false,
    range: null, formulaStr: 'LOOKUP(regressionCoefficients)', dependencies: ['aggregate_type'],
    formula: (p: any) => tq.lookupExact('regressionCoefficients', 'aggregate_type', p.aggregate_type, 'alpha_b'),
    currentValue: null, description: '回归系数 αb',
  },
  WC_ratio: {
    id: 'WC_ratio', name: '计算水胶比 W/B', sheet: 'Sheet4', unit: '-',
    type: 'calculated', defaultValue: null, editable: false, required: false,
    range: null,
    formulaStr: 'W/B = (αa × fce × γf × γs) / (fcu,0 + αa × αb × fce × γf × γs)',
    dependencies: ['alpha_a', 'alpha_b', 'fcu_0', 'fce', 'fly_ash_coeff', 'slag_coeff'],
    formula: (p: any) => {
      const effFce = p.fce * p.fly_ash_coeff * p.slag_coeff
      const numerator = p.alpha_a * effFce
      const denominator = p.fcu_0 + p.alpha_a * p.alpha_b * effFce
      if (denominator === 0) throw new Error('水胶比计算分母为零')
      return numerator / denominator
    },
    currentValue: null, description: '计算水胶比',
  },
  WC_ratio_limited: {
    id: 'WC_ratio_limited', name: '设计水胶比（耐久性限制后）', sheet: 'Sheet4', unit: '-',
    type: 'calculated', defaultValue: null, editable: false, required: false,
    range: null, formulaStr: 'MIN(W/B, max_WB)', dependencies: ['WC_ratio', 'exposure_condition'],
    formula: (p: any) => Math.min(p.WC_ratio, tq.lookupMaxWB(p.exposure_condition)),
    currentValue: null, description: '设计水胶比',
  },
  water_content: {
    id: 'water_content', name: '单位用水量 W₀', sheet: 'Sheet4', unit: 'kg/m³',
    type: 'calculated', defaultValue: null, editable: false, required: false,
    range: null,
    formulaStr: '金华标准用水量公式',
    dependencies: ['slump', 'max_aggregate_size', 'fcu_k'],
    formula: (p: any) => {
      const baseAdjustment = getJinhuaWaterAdjustment(p.max_aggregate_size)
      const standardWater = (p.slump + baseAdjustment) / 3
      return standardWater * (1 - INTERNAL_CONSTANTS.jinhuaWaterReductionCoeff) -
        (p.fcu_k - 30) * INTERNAL_CONSTANTS.jinhuaStrengthWaterAdjustmentPerMpa
    },
    currentValue: null, description: '单位用水量（金华标准）',
  },
  total_binder_content: {
    id: 'total_binder_content', name: '胶凝材料总用量 B', sheet: 'Sheet4', unit: 'kg/m³',
    type: 'calculated', defaultValue: null, editable: false, required: false,
    range: null, formulaStr: 'B = W₀ / (W/B)', dependencies: ['water_content', 'WC_ratio_limited'],
    formula: (p: any) => {
      if (p.WC_ratio_limited === 0) throw new Error('水胶比为零')
      return p.water_content / p.WC_ratio_limited
    },
    currentValue: null, description: '胶凝材料总用量',
  },
  binder_content_checked: {
    id: 'binder_content_checked', name: '设计胶凝材料总量（耐久性校核后）', sheet: 'Sheet4', unit: 'kg/m³',
    type: 'calculated', defaultValue: null, editable: false, required: false,
    range: null, formulaStr: 'MAX(B, min_binder)', dependencies: ['total_binder_content', 'exposure_condition', 'concrete_type'],
    formula: (p: any) => Math.max(p.total_binder_content, tq.lookupMinBinder(p.exposure_condition, p.concrete_type)),
    currentValue: null, description: '耐久性校核后胶凝材料总量',
  },
  fly_ash_content: {
    id: 'fly_ash_content', name: '粉煤灰用量 FA', sheet: 'Sheet4', unit: 'kg/m³',
    type: 'calculated', defaultValue: null, editable: false, required: false,
    range: null, formulaStr: 'FA = B × fly_ash_ratio', dependencies: ['binder_content_checked', 'fly_ash_ratio'],
    formula: (p: any) => p.binder_content_checked * p.fly_ash_ratio,
    currentValue: null, description: '粉煤灰用量',
  },
  slag_content: {
    id: 'slag_content', name: '矿粉用量 SL', sheet: 'Sheet4', unit: 'kg/m³',
    type: 'calculated', defaultValue: null, editable: false, required: false,
    range: null, formulaStr: 'SL = B × slag_ratio', dependencies: ['binder_content_checked', 'slag_ratio'],
    formula: (p: any) => p.binder_content_checked * p.slag_ratio,
    currentValue: null, description: '矿粉用量',
  },
  cement_content: {
    id: 'cement_content', name: '纯水泥用量 C', sheet: 'Sheet4', unit: 'kg/m³',
    type: 'calculated', defaultValue: null, editable: false, required: false,
    range: null, formulaStr: 'C = B × (1 - fly_ash_ratio - slag_ratio)', dependencies: ['binder_content_checked', 'fly_ash_ratio', 'slag_ratio'],
    formula: (p: any) => p.binder_content_checked * (1 - p.fly_ash_ratio - p.slag_ratio),
    currentValue: null, description: '纯水泥用量',
  },
  admixture_content: {
    id: 'admixture_content', name: '外加剂用量 AD', sheet: 'Sheet4', unit: 'kg/m³',
    type: 'calculated', defaultValue: null, editable: false, required: false,
    range: null, formulaStr: 'AD = B × admixture_dosage', dependencies: ['binder_content_checked', 'admixture_dosage'],
    formula: (p: any) => p.binder_content_checked * p.admixture_dosage,
    currentValue: null, description: '外加剂用量',
  },
  sand_ratio: {
    id: 'sand_ratio', name: '砂率 βs', sheet: 'Sheet4', unit: '%',
    type: 'calculated', defaultValue: null, editable: false, required: false,
    range: null, formulaStr: '金华阶跃函数/JGJ插值', dependencies: ['WC_ratio_limited', 'aggregate_type', 'max_aggregate_size'],
    formula: (p: any) => {
      const wb = p.WC_ratio_limited
      if (p.aggregate_type === '碎石') {
        if (wb < 0.35) return 42
        if (wb < 0.40) return 43
        if (wb < 0.50) return 46
        if (wb < 0.60) return 48
        if (wb < 0.70) return 50
        return 51
      }
      return tq.interpolateSandRatio(wb, p.aggregate_type, p.max_aggregate_size)
    },
    currentValue: null, description: '砂率',
  },
  ideal_paste_volume: {
    id: 'ideal_paste_volume', name: '理想浆体体积', sheet: 'Sheet5', unit: 'L/m³',
    type: 'calculated', defaultValue: null, editable: false, required: false,
    range: null, formulaStr: 'LOOKUP(sand_fineness_modulus)', dependencies: ['sand_fineness_modulus'],
    formula: (p: any) => tq.lookupRange('idealPasteVolume', 'fineness_min', 'fineness_max', p.sand_fineness_modulus, 'ideal_paste_volume'),
    currentValue: null, description: '理想浆体体积',
  },
  aggregate_volume: {
    id: 'aggregate_volume', name: '骨料总体积', sheet: 'Sheet5', unit: 'L/m³',
    type: 'calculated', defaultValue: null, editable: false, required: false,
    range: null,
    formulaStr: 'Va = 1000 − Vc − Vfa − Vsl − W₀ − Vair',
    dependencies: ['cement_content', 'fly_ash_content', 'slag_content', 'water_content', 'air_content', 'cement_density'],
    formula: (p: any) => {
      const cementVol = p.cement_content / p.cement_density * 1000
      const flyAshVol = p.fly_ash_content / INTERNAL_CONSTANTS.flyAshDensity * 1000
      const slagVol = p.slag_content / INTERNAL_CONSTANTS.slagDensity * 1000
      const airVol = p.air_content * 10
      return 1000 - cementVol - p.water_content - flyAshVol - slagVol - airVol
    },
    currentValue: null, description: '骨料总体积',
  },
  step1_initial_aggregate_mass: {
    id: 'step1_initial_aggregate_mass', name: '①初始骨料总质量', sheet: 'Sheet5', unit: 'kg/m³',
    type: 'calculated', defaultValue: null, editable: false, required: false,
    range: null, formulaStr: 'M0 = Va / (βs0/(ρs/1000) + (1-βs0)/(ρg/1000))', dependencies: ['aggregate_volume', 'sand_density', 'aggregate_density'],
    formula: (p: any) => {
      const βs0 = INTERNAL_CONSTANTS.initialSandRatio
      return p.aggregate_volume / (βs0 / (p.sand_density / 1000) + (1 - βs0) / (p.aggregate_density / 1000))
    },
    currentValue: null, description: '初始骨料总质量',
  },
  step1_sand_for_stone_packing: {
    id: 'step1_sand_for_stone_packing', name: '①砂填石孔隙量', sheet: 'Sheet5', unit: 'kg/m³',
    type: 'calculated', defaultValue: null, editable: false, required: false,
    range: null, formulaStr: 'Qs = ρs_compacted × (1 − ρg_bulk/ρg_apparent + 0.02 + 含石率)',
    dependencies: ['sand_compacted_density', 'stone_bulk_density', 'stone_apparent_density'],
    formula: (p: any) => {
      return p.sand_compacted_density * (1 - p.stone_bulk_density / p.stone_apparent_density + 0.02 + INTERNAL_CONSTANTS.sandStoneContent)
    },
    currentValue: null, description: '砂填石孔隙量',
  },
  step1_stone_after_packing: {
    id: 'step1_stone_after_packing', name: '①扣除砂填后石子量', sheet: 'Sheet5', unit: 'kg/m³',
    type: 'calculated', defaultValue: null, editable: false, required: false,
    range: null, formulaStr: 'G1 = M0 − Qs', dependencies: ['step1_initial_aggregate_mass', 'step1_sand_for_stone_packing'],
    formula: (p: any) => p.step1_initial_aggregate_mass - p.step1_sand_for_stone_packing,
    currentValue: null, description: '扣除砂填后石子量',
  },
  step2_filler_raw_volume: {
    id: 'step2_filler_raw_volume', name: '②填充粉料毛体积', sheet: 'Sheet5', unit: 'L/m³',
    type: 'calculated', defaultValue: null, editable: false, required: false,
    range: null, formulaStr: 'Vf = Vpaste_ideal − W − Vc − Vsl − Vfa',
    dependencies: ['ideal_paste_volume', 'water_content', 'cement_content', 'cement_density', 'slag_content', 'fly_ash_content'],
    formula: (p: any) => {
      const cementVol = p.cement_content / p.cement_density * 1000
      const flyAshVol = p.fly_ash_content / INTERNAL_CONSTANTS.flyAshDensity * 1000
      const slagVol = p.slag_content / INTERNAL_CONSTANTS.slagDensity * 1000
      return Math.max(p.ideal_paste_volume - p.water_content - cementVol - slagVol - flyAshVol, 0)
    },
    currentValue: null, description: '填充粉料毛体积',
  },
  step2_filler_raw_mass: {
    id: 'step2_filler_raw_mass', name: '②填充粉料毛质量', sheet: 'Sheet5', unit: 'kg/m³',
    type: 'calculated', defaultValue: null, editable: false, required: false,
    range: null, formulaStr: 'Mf = ρf/1000 × Vf', dependencies: ['step2_filler_raw_volume'],
    formula: (p: any) => INTERNAL_CONSTANTS.fillerDensity / 1000 * p.step2_filler_raw_volume,
    currentValue: null, description: '填充粉料毛质量',
  },
  step2_sand_after_filler: {
    id: 'step2_sand_after_filler', name: '②扣除填充料后砂量', sheet: 'Sheet5', unit: 'kg/m³',
    type: 'calculated', defaultValue: null, editable: false, required: false,
    range: null, formulaStr: 'Qs2 = Qs − Mf', dependencies: ['step1_sand_for_stone_packing', 'step2_filler_raw_mass'],
    formula: (p: any) => p.step1_sand_for_stone_packing - p.step2_filler_raw_mass,
    currentValue: null, description: '扣除填充料后砂量',
  },
  filler_content: {
    id: 'filler_content', name: '填充粉料（石粉）用量', sheet: 'Sheet5', unit: 'kg/m³',
    type: 'result', defaultValue: null, editable: false, required: false,
    range: null, formulaStr: '石粉 = Mf − Qs2 × 含粉率', dependencies: ['step2_filler_raw_mass', 'step2_sand_after_filler'],
    formula: (p: any) => Math.max(p.step2_filler_raw_mass - p.step2_sand_after_filler * INTERNAL_CONSTANTS.sandPowderContent, 0),
    currentValue: null, description: '石粉用量',
  },
  step3_corrected_sand: {
    id: 'step3_corrected_sand', name: '③含石含粉校正后砂量', sheet: 'Sheet5', unit: 'kg/m³',
    type: 'calculated', defaultValue: null, editable: false, required: false,
    range: null, formulaStr: 'S3 = Qs2 / (1 − 含石率 − 含粉率)', dependencies: ['step2_sand_after_filler'],
    formula: (p: any) => p.step2_sand_after_filler / (1 - INTERNAL_CONSTANTS.sandStoneContent - INTERNAL_CONSTANTS.sandPowderContent),
    currentValue: null, description: '含石含粉校正后砂量',
  },
  step3_corrected_stone: {
    id: 'step3_corrected_stone', name: '③含石含粉校正后石子量', sheet: 'Sheet5', unit: 'kg/m³',
    type: 'calculated', defaultValue: null, editable: false, required: false,
    range: null, formulaStr: 'G3 = G1 − Qs2 × 含石率', dependencies: ['step1_stone_after_packing', 'step2_sand_after_filler'],
    formula: (p: any) => p.step1_stone_after_packing - p.step2_sand_after_filler * INTERNAL_CONSTANTS.sandStoneContent,
    currentValue: null, description: '含石含粉校正后石子量',
  },
  step3_corrected_aggregate_mass: {
    id: 'step3_corrected_aggregate_mass', name: '③校正后骨料总质量', sheet: 'Sheet5', unit: 'kg/m³',
    type: 'calculated', defaultValue: null, editable: false, required: false,
    range: null, formulaStr: 'M3 = S3 + G3', dependencies: ['step3_corrected_sand', 'step3_corrected_stone'],
    formula: (p: any) => p.step3_corrected_sand + p.step3_corrected_stone,
    currentValue: null, description: '校正后骨料总质量',
  },
  total_aggregate_mass: {
    id: 'total_aggregate_mass', name: '骨料总质量 (S+G)', sheet: 'Sheet5', unit: 'kg/m³',
    type: 'calculated', defaultValue: null, editable: false, required: false,
    range: null, formulaStr: 'M = M3', dependencies: ['step3_corrected_aggregate_mass'],
    formula: (p: any) => p.step3_corrected_aggregate_mass,
    currentValue: null, description: '骨料总质量',
  },
  sand_content: {
    id: 'sand_content', name: '细骨料用量 S', sheet: 'Sheet5', unit: 'kg/m³',
    type: 'result', defaultValue: null, editable: false, required: false,
    range: null, formulaStr: 'S = M3 × βs/100', dependencies: ['step3_corrected_aggregate_mass', 'sand_ratio'],
    formula: (p: any) => p.step3_corrected_aggregate_mass * (p.sand_ratio / 100),
    currentValue: null, description: '最终砂用量',
  },
  coarse_aggregate_content: {
    id: 'coarse_aggregate_content', name: '粗骨料用量 G', sheet: 'Sheet5', unit: 'kg/m³',
    type: 'result', defaultValue: null, editable: false, required: false,
    range: null, formulaStr: 'G = M3 × (1 − βs/100)', dependencies: ['step3_corrected_aggregate_mass', 'sand_ratio'],
    formula: (p: any) => p.step3_corrected_aggregate_mass * (1 - p.sand_ratio / 100),
    currentValue: null, description: '最终石子用量',
  },
  total_mass: {
    id: 'total_mass', name: '每方混凝土总质量', sheet: 'Sheet5', unit: 'kg/m³',
    type: 'result', defaultValue: null, editable: false, required: false,
    range: null, formulaStr: 'M_total = C + FA + SL + 石粉 + W₀ + AD + S + G',
    dependencies: ['cement_content', 'fly_ash_content', 'slag_content', 'filler_content', 'water_content', 'admixture_content', 'sand_content', 'coarse_aggregate_content'],
    formula: (p: any) =>
      p.cement_content + p.fly_ash_content + p.slag_content +
      p.filler_content + p.water_content + p.admixture_content +
      p.sand_content + p.coarse_aggregate_content,
    currentValue: null, description: '每方混凝土总质量',
  },
}

function _buildStep(param: ParameterDef, value: any, inputSnapshot: Record<string, any>, source: string): CalculationStep {
  return {
    id: param.id,
    name: param.name,
    sheet: param.sheet,
    type: param.type,
    unit: param.unit,
    value,
    formulaStr: param.formulaStr,
    inputValues: inputSnapshot,
    crossSheetDeps: param.crossSheetDeps || [],
    source,
    description: param.description,
    excelRef: param.excelRef || null,
  }
}

export function calculate(userInputs: Record<string, any>): CalculationResult {
  const result: CalculationResult = {
    success: false,
    values: {},
    steps: [],
    errors: [],
    warnings: [],
    executionOrder: [],
  }

  const { order, hasCycle, cycleNodes } = topologicalSort(PARAMETERS)
  if (hasCycle) {
    result.errors.push({ type: 'CIRCULAR_DEPENDENCY', message: `循环依赖：${cycleNodes.join(', ')}` })
    return result
  }
  result.executionOrder = order

  const values: Record<string, any> = {}
  for (const [id, rawVal] of Object.entries(userInputs)) {
    const param = PARAMETERS[id]
    if (!param) {
      result.warnings.push({ type: 'UNKNOWN_INPUT', message: `未知参数 ID: "${id}"` })
      continue
    }
    if (param.type === 'input' && typeof rawVal === 'string') {
      const parsed = parseFloat(rawVal)
      values[id] = isNaN(parsed) ? rawVal : parsed
    } else {
      values[id] = rawVal
    }
  }

  for (const param of Object.values(PARAMETERS)) {
    if (param.type === 'input' && param.required && !(param.id in values)) {
      result.errors.push({ type: 'MISSING_INPUT', message: `缺少必填参数：${param.name}`, paramId: param.id })
    }
  }
  if (result.errors.length > 0) return result

  for (const id of order) {
    const param = PARAMETERS[id]
    if (!param) continue

    if (param.type === 'input') {
      if (!(id in values)) values[id] = param.defaultValue
      result.steps.push(_buildStep(param, values[id], {}, '用户输入'))
      continue
    }

    if (!param.formula) {
      values[id] = param.defaultValue
      continue
    }

    const inputSnapshot: Record<string, any> = {}
    let missingDep = false
    for (const depId of (param.dependencies || [])) {
      if (!(depId in values) || values[depId] === null || values[depId] === undefined) {
        result.errors.push({ type: 'MISSING_DEPENDENCY', message: `"${param.name}" 的依赖 "${depId}" 缺失`, paramId: id })
        missingDep = true
        break
      }
      inputSnapshot[depId] = values[depId]
    }
    if (missingDep) continue

    try {
      const computed = param.formula(values, tq)
      if (computed === null || computed === undefined || (typeof computed === 'number' && isNaN(computed))) {
        throw new Error('公式返回无效值')
      }
      if (typeof computed === 'number' && !isFinite(computed)) {
        throw new Error('公式返回无穷大')
      }
      values[id] = computed
      result.steps.push(_buildStep(param, computed, inputSnapshot, '公式计算'))
    } catch (err: any) {
      result.errors.push({ type: 'CALCULATION_ERROR', message: `计算 "${param.name}" 时出错：${err.message}`, paramId: id })
      values[id] = null
    }
  }

  result.values = values
  result.success = result.errors.length === 0
  return result
}
