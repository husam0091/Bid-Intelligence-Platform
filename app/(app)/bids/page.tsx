import { loadPortfolio } from '@/lib/ui/load'
import HistoryView from './HistoryView'

export default async function BidsPage() {
  const { projects } = await loadPortfolio()
  return <HistoryView projects={projects} />
}
