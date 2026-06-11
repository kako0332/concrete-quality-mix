export interface ParameterDef {
  id: string
  name: string
  sheet: string
  unit: string
  type: 'input' | 'calculated' | 'result'
  defaultValue: number | string | null
  editable: boolean
  required: boolean
  range: { min: number; max: number } | null
  formulaStr: string | null
  dependencies: string[]
  formula: ((p: Record<string, any>, tq: any) => any) | null
  currentValue: any
  description: string
  excelRef?: string | null
  crossSheetDeps?: { param: string; fromSheet: string }[]
  inputWidget?: string
  selectRef?: string
  selectValueField?: string
  selectLabelField?: string
  step?: string | number
  hidden?: boolean
}

export interface CalculationStep {
  id: string
  name: string
  sheet: string
  type: string
  unit: string | null
  value: any
  formulaStr: string | null
  inputValues: Record<string, any>
  crossSheetDeps: { param: string; fromSheet: string }[]
  source: string
  description: string
  excelRef: string | null
}

export interface CalculationResult {
  success: boolean
  values: Record<string, any>
  steps: CalculationStep[]
  errors: { type: string; message: string; [key: string]: any }[]
  warnings: { type: string; message: string; [key: string]: any }[]
  executionOrder: string[]
}
