import { loadPortfolio } from '@/lib/ui/load'
import AnalyticsView from './AnalyticsView'

export default async function AnalyticsPage() {
  const { projects } = await loadPortfolio()
  return <AnalyticsView projects={projects} />
}
