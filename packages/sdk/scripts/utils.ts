/**
 * Get the scope and module name from the module string
 * @param module - The module string
 * @returns The scope and module name
 * e.g. 'moar_pool' -> ['moar', 'pool'], 'moarStrategy_router' -> ['moarStrategy', 'router']
 */
export function getScopeWithModule(module: string) {
  const parts = module.split('_')
  const scope = parts[0] as string
  const moduleName = parts.slice(1).join('_') as string
  return [scope, moduleName]
}
