import { loadPortfolio } from '@/lib/ui/load'
import PredictorView from './PredictorView'

export default async function PredictorPage({ searchParams }: { searchParams: { id?: string } }) {
  const { projects, rules } = await loadPortfolio()
  return <PredictorView projects={projects} rules={rules} initialId={searchParams.id} />
}
