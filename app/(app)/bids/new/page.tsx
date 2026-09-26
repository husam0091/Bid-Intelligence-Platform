import { loadPortfolio } from '@/lib/ui/load'
import NewBidView from './NewBidView'

export default async function NewBidPage() {
  const { projects, rules } = await loadPortfolio()
  return <NewBidView projects={projects} rules={rules} />
}
