import { loadPortfolio } from '@/lib/ui/load'
import PipelineView from './PipelineView'

export default async function DashboardPage() {
  const { projects, rules } = await loadPortfolio()
  return <PipelineView projects={projects} rules={rules} />
}
