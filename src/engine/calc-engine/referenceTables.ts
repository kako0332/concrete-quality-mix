export interface ReferenceTable {
  id: string
  name: string
  sourceSheet: string
  description: string
  fields: string[]
  data: Record<string, any>[]
}

export const REFERENCE_TABLES: Record<string, ReferenceTable> = {
  strengthGrades: {
    id: 'strengthGrades',
    name: '强度等级表',
    sourceSheet: 'RefTable_强度等级',
    description: '混凝土标准强度等级列表',
    fields: ['grade', 'fcu_k', 'label'],
    data: [
      { grade: 'C15', fcu_k: 15, label: 'C15 (15 MPa)' },
      { grade: 'C20', fcu_k: 20, label: 'C20 (20 MPa)' },
      { grade: 'C25', fcu_k: 25, label: 'C25 (25 MPa)' },
      { grade: 'C30', fcu_k: 30, label: 'C30 (30 MPa)' },
      { grade: 'C35', fcu_k: 35, label: 'C35 (35 MPa)' },
      { grade: 'C40', fcu_k: 40, label: 'C40 (40 MPa)' },
      { grade: 'C45', fcu_k: 45, label: 'C45 (45 MPa)' },
      { grade: 'C50', fcu_k: 50, label: 'C50 (50 MPa)' },
      { grade: 'C55', fcu_k: 55, label: 'C55 (55 MPa)' },
      { grade: 'C60', fcu_k: 60, label: 'C60 (60 MPa)' },
    ]
  },

  standardDeviation: {
    id: 'standardDeviation',
    name: '标准差参考表',
    sourceSheet: 'RefTable_标准差',
    description: '根据强度等级确定标准差 σ（金华地方标准）',
    fields: ['fcu_k_min', 'fcu_k_max', 'sigma', 'quality_level'],
    data: [
      { fcu_k_min: 0, fcu_k_max: 20, sigma: 4.0, quality_level: '一般控制 (fcu,k≤20)' },
      { fcu_k_min: 21, fcu_k_max: 40, sigma: 6.0, quality_level: '金华标准 (20<fcu,k≤40)' },
      { fcu_k_min: 41, fcu_k_max: 100, sigma: 8.0, quality_level: '金华标准 (fcu,k>40)' },
    ]
  },

  regressionCoefficients: {
    id: 'regressionCoefficients',
    name: '回归系数表',
    sourceSheet: 'RefTable_回归系数',
    description: '根据骨料类型确定回归系数 αa、αb',
    fields: ['aggregate_type', 'alpha_a', 'alpha_b', 'description'],
    data: [
      { aggregate_type: '碎石', alpha_a: 0.53, alpha_b: 0.20, description: '机碎石混凝土' },
      { aggregate_type: '卵石', alpha_a: 0.49, alpha_b: 0.13, description: '天然卵石混凝土' },
    ]
  },

  waterContent: {
    id: 'waterContent',
    name: '单位用水量参考表',
    sourceSheet: 'RefTable_用水量',
    description: '根据坍落度、骨料类型及最大粒径确定单位用水量 W₀ (kg/m³)（JGJ 55-2011 表5.2.1-1）',
    fields: ['slump_min', 'slump_max', 'aggregate_type', 'max_size_10', 'max_size_20', 'max_size_315', 'max_size_40'],
    data: [
      { slump_min: 10, slump_max: 30, aggregate_type: '碎石', max_size_10: 190, max_size_20: 170, max_size_315: 160, max_size_40: 150 },
      { slump_min: 35, slump_max: 50, aggregate_type: '碎石', max_size_10: 200, max_size_20: 180, max_size_315: 170, max_size_40: 160 },
      { slump_min: 55, slump_max: 70, aggregate_type: '碎石', max_size_10: 210, max_size_20: 190, max_size_315: 180, max_size_40: 170 },
      { slump_min: 75, slump_max: 90, aggregate_type: '碎石', max_size_10: 215, max_size_20: 195, max_size_315: 185, max_size_40: 175 },
      { slump_min: 95, slump_max: 110, aggregate_type: '碎石', max_size_10: 220, max_size_20: 200, max_size_315: 190, max_size_40: 180 },
      { slump_min: 115, slump_max: 150, aggregate_type: '碎石', max_size_10: 230, max_size_20: 215, max_size_315: 205, max_size_40: 195 },
      { slump_min: 10, slump_max: 30, aggregate_type: '卵石', max_size_10: 180, max_size_20: 160, max_size_315: 150, max_size_40: 140 },
      { slump_min: 35, slump_max: 50, aggregate_type: '卵石', max_size_10: 190, max_size_20: 170, max_size_315: 160, max_size_40: 150 },
      { slump_min: 55, slump_max: 70, aggregate_type: '卵石', max_size_10: 200, max_size_20: 180, max_size_315: 170, max_size_40: 160 },
      { slump_min: 75, slump_max: 90, aggregate_type: '卵石', max_size_10: 205, max_size_20: 185, max_size_315: 175, max_size_40: 165 },
      { slump_min: 95, slump_max: 110, aggregate_type: '卵石', max_size_10: 210, max_size_20: 190, max_size_315: 180, max_size_40: 170 },
      { slump_min: 115, slump_max: 150, aggregate_type: '卵石', max_size_10: 220, max_size_20: 205, max_size_315: 195, max_size_40: 185 },
    ]
  },

  flyAshCoefficients: {
    id: 'flyAshCoefficients',
    name: '粉煤灰影响系数表',
    sourceSheet: 'RefTable_粉煤灰影响系数',
    description: '根据粉煤灰替代比例确定 γf',
    fields: ['ratio_min', 'ratio_max', 'gamma_f', 'description'],
    data: [
      { ratio_min: 0, ratio_max: 0.10, gamma_f: 0.95, description: '掺量 0~10%' },
      { ratio_min: 0.10, ratio_max: 0.20, gamma_f: 0.85, description: '掺量 10~20%' },
      { ratio_min: 0.20, ratio_max: 0.30, gamma_f: 0.75, description: '掺量 20~30%' },
      { ratio_min: 0.30, ratio_max: 0.40, gamma_f: 0.65, description: '掺量 30~40%' },
      { ratio_min: 0.40, ratio_max: 0.50, gamma_f: 0.55, description: '掺量 40~50%' },
    ]
  },

  slagCoefficients: {
    id: 'slagCoefficients',
    name: '矿粉影响系数表',
    sourceSheet: 'RefTable_矿粉影响系数',
    description: '根据矿粉替代比例确定 γs',
    fields: ['ratio_min', 'ratio_max', 'gamma_s', 'description'],
    data: [
      { ratio_min: 0, ratio_max: 0.30, gamma_s: 1.00, description: '掺量 0~30%' },
      { ratio_min: 0.30, ratio_max: 0.40, gamma_s: 0.90, description: '掺量 30~40%' },
      { ratio_min: 0.40, ratio_max: 0.50, gamma_s: 0.85, description: '掺量 40~50%' },
    ]
  },

  exposureConditions: {
    id: 'exposureConditions',
    name: '暴露条件表',
    sourceSheet: 'RefTable_暴露条件',
    description: '暴露条件及对应最大水胶比',
    fields: ['condition', 'label', 'max_WB'],
    data: [
      { condition: '室内正常', label: '室内正常环境', max_WB: 0.60 },
      { condition: '室内潮湿', label: '室内潮湿环境', max_WB: 0.55 },
      { condition: '室外', label: '室外露天环境', max_WB: 0.50 },
      { condition: '严寒冻融', label: '严寒/寒冷冻融环境', max_WB: 0.45 },
      { condition: '化学侵蚀', label: '化学侵蚀环境', max_WB: 0.45 },
    ]
  },

  concreteTypes: {
    id: 'concreteTypes',
    name: '混凝土类型表',
    sourceSheet: 'RefTable_混凝土类型',
    description: '混凝土结构类型',
    fields: ['type', 'label'],
    data: [
      { type: '素混凝土', label: '素混凝土（无钢筋）' },
      { type: '钢筋混凝土', label: '钢筋混凝土' },
      { type: '预应力混凝土', label: '预应力混凝土' },
    ]
  },

  durabilityLimits: {
    id: 'durabilityLimits',
    name: '耐久性限制表',
    sourceSheet: 'RefTable_耐久性',
    description: '不同暴露条件和混凝土类型下的最大水胶比和最小胶凝材料用量',
    fields: ['exposure_condition', 'concrete_type', 'max_WB', 'min_binder', 'description'],
    data: [
      { exposure_condition: '室内正常', concrete_type: '素混凝土', max_WB: 0.60, min_binder: 250, description: '室内正常/素混凝土' },
      { exposure_condition: '室内正常', concrete_type: '钢筋混凝土', max_WB: 0.60, min_binder: 280, description: '室内正常/钢筋混凝土' },
      { exposure_condition: '室内正常', concrete_type: '预应力混凝土', max_WB: 0.60, min_binder: 300, description: '室内正常/预应力混凝土' },
      { exposure_condition: '室内潮湿', concrete_type: '素混凝土', max_WB: 0.55, min_binder: 280, description: '室内潮湿/素混凝土' },
      { exposure_condition: '室内潮湿', concrete_type: '钢筋混凝土', max_WB: 0.55, min_binder: 300, description: '室内潮湿/钢筋混凝土' },
      { exposure_condition: '室内潮湿', concrete_type: '预应力混凝土', max_WB: 0.55, min_binder: 300, description: '室内潮湿/预应力混凝土' },
      { exposure_condition: '室外', concrete_type: '素混凝土', max_WB: 0.50, min_binder: 320, description: '室外/素混凝土' },
      { exposure_condition: '室外', concrete_type: '钢筋混凝土', max_WB: 0.50, min_binder: 320, description: '室外/钢筋混凝土' },
      { exposure_condition: '室外', concrete_type: '预应力混凝土', max_WB: 0.50, min_binder: 320, description: '室外/预应力混凝土' },
      { exposure_condition: '严寒冻融', concrete_type: '素混凝土', max_WB: 0.45, min_binder: 330, description: '严寒冻融/素混凝土' },
      { exposure_condition: '严寒冻融', concrete_type: '钢筋混凝土', max_WB: 0.45, min_binder: 330, description: '严寒冻融/钢筋混凝土' },
      { exposure_condition: '严寒冻融', concrete_type: '预应力混凝土', max_WB: 0.45, min_binder: 330, description: '严寒冻融/预应力混凝土' },
      { exposure_condition: '化学侵蚀', concrete_type: '素混凝土', max_WB: 0.45, min_binder: 330, description: '化学侵蚀/素混凝土' },
      { exposure_condition: '化学侵蚀', concrete_type: '钢筋混凝土', max_WB: 0.45, min_binder: 330, description: '化学侵蚀/钢筋混凝土' },
      { exposure_condition: '化学侵蚀', concrete_type: '预应力混凝土', max_WB: 0.45, min_binder: 330, description: '化学侵蚀/预应力混凝土' },
    ]
  },

  aggregateTypes: {
    id: 'aggregateTypes',
    name: '骨料类型表',
    sourceSheet: 'RefTable_骨料类型',
    description: '粗骨料种类选项及默认表观密度',
    fields: ['type', 'label', 'default_density'],
    data: [
      { type: '碎石', label: '碎石（机碎石）', default_density: 2560 },
      { type: '卵石', label: '卵石（天然砾石）', default_density: 2650 },
    ]
  },

  aggregateSizes: {
    id: 'aggregateSizes',
    name: '骨料最大粒径表',
    sourceSheet: 'RefTable_粒径',
    description: '粗骨料最大公称粒径选项',
    fields: ['size', 'label', 'size_key'],
    data: [
      { size: 10, label: '10 mm', size_key: 'max_size_10' },
      { size: 20, label: '20 mm', size_key: 'max_size_20' },
      { size: 31.5, label: '31.5 mm', size_key: 'max_size_315' },
      { size: 40, label: '40 mm', size_key: 'max_size_40' },
    ]
  },

  sandRatio: {
    id: 'sandRatio',
    name: '砂率参考表',
    sourceSheet: 'RefTable_砂率',
    description: '根据水胶比、骨料类型及最大粒径确定砂率（JGJ 55-2011 表5.4.2）',
    fields: ['WC_ratio', 'aggregate_type', 'max_size_10', 'max_size_20', 'max_size_40'],
    data: [
      { WC_ratio: 0.40, aggregate_type: '碎石', max_size_10: 29, max_size_20: 28, max_size_40: 27 },
      { WC_ratio: 0.50, aggregate_type: '碎石', max_size_10: 32.5, max_size_20: 31.5, max_size_40: 30.5 },
      { WC_ratio: 0.60, aggregate_type: '碎石', max_size_10: 35.5, max_size_20: 34.5, max_size_40: 33.5 },
      { WC_ratio: 0.70, aggregate_type: '碎石', max_size_10: 38.5, max_size_20: 37.5, max_size_40: 36.5 },
      { WC_ratio: 0.40, aggregate_type: '卵石', max_size_10: 27, max_size_20: 26, max_size_40: 25 },
      { WC_ratio: 0.50, aggregate_type: '卵石', max_size_10: 30, max_size_20: 29, max_size_40: 28 },
      { WC_ratio: 0.60, aggregate_type: '卵石', max_size_10: 33, max_size_20: 32, max_size_40: 31 },
      { WC_ratio: 0.70, aggregate_type: '卵石', max_size_10: 36, max_size_20: 35, max_size_40: 34 },
    ]
  },

  idealPasteVolume: {
    id: 'idealPasteVolume',
    name: '理想浆体体积表',
    sourceSheet: 'RefTable_理想浆体体积',
    description: '根据砂细度模数确定理想浆体体积',
    fields: ['fineness_min', 'fineness_max', 'ideal_paste_volume', 'description'],
    data: [
      { fineness_min: 2.65, fineness_max: 2.74, ideal_paste_volume: 305, description: '细度模数 ≈2.7' },
      { fineness_min: 2.75, fineness_max: 2.84, ideal_paste_volume: 310, description: '细度模数 ≈2.8' },
      { fineness_min: 2.85, fineness_max: 2.94, ideal_paste_volume: 315, description: '细度模数 ≈2.9' },
      { fineness_min: 2.95, fineness_max: 3.04, ideal_paste_volume: 320, description: '细度模数 ≈3.0' },
      { fineness_min: 3.05, fineness_max: 3.14, ideal_paste_volume: 325, description: '细度模数 ≈3.1' },
      { fineness_min: 3.15, fineness_max: 3.25, ideal_paste_volume: 330, description: '细度模数 ≈3.2' },
    ]
  },
}
