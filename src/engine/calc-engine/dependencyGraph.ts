import type { ParameterDef } from './types'

export function topologicalSort(parameters: Record<string, ParameterDef>): {
  order: string[]
  hasCycle: boolean
  cycleNodes: string[]
} {
  const paramList = Object.values(parameters)
  const nodeIds = paramList.map(p => p.id)

  const adjacency = new Map<string, string[]>()
  const inDegree = new Map<string, number>()

  for (const id of nodeIds) {
    adjacency.set(id, [])
    inDegree.set(id, 0)
  }

  for (const param of paramList) {
    for (const depId of (param.dependencies || [])) {
      if (!adjacency.has(depId)) continue
      adjacency.get(depId)!.push(param.id)
      inDegree.set(param.id, (inDegree.get(param.id) || 0) + 1)
    }
  }

  const degree = new Map(inDegree)
  const queue: string[] = []
  const order: string[] = []

  for (const id of nodeIds) {
    if (degree.get(id) === 0) queue.push(id)
  }

  while (queue.length > 0) {
    const current = queue.shift()!
    order.push(current)
    for (const neighbor of adjacency.get(current) || []) {
      const newDeg = degree.get(neighbor)! - 1
      degree.set(neighbor, newDeg)
      if (newDeg === 0) queue.push(neighbor)
    }
  }

  const hasCycle = order.length < nodeIds.length
  const cycleNodes = hasCycle ? nodeIds.filter(id => !order.includes(id)) : []
  return { order, hasCycle, cycleNodes }
}
