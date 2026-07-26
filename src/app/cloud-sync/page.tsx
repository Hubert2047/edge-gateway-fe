import { CloudTargetList } from '@/components/cloud-sync/cloud-target-list'
import { CloudTarget } from '@/types/cloud-target'
import { serverApiFetch } from '@/lib/api/server'
import { fromBackend } from '@/lib/api/cloud-target.mapper'

export default async function CloudSync() {
    const targets = await serverApiFetch<CloudTarget[]>('/api/cloud-targets')
    return (
        <div className="flex h-full flex-col">
            <CloudTargetList initialTargets={targets.map(item=>fromBackend(item))} />
        </div>
    )
}