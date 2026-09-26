import { loadPortfolio } from '@/lib/ui/load'
import ExecutiveView from './ExecutiveView'

export default async function ExecutivePage() {
  const { projects, rules } = await loadPortfolio()
  return <ExecutiveView projects={projects} rules={rules} />
}
