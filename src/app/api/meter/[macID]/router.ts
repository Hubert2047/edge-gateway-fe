import { NextRequest } from 'next/server'
import { handleRoute } from '@/lib/api/route-handler'
import { serverApiFetch } from '@/lib/api/server'
import type { Meter } from '@/types/meter'

interface Params {
  params: { macID: string }
}

export async function GET(_req: NextRequest, { params }: Params) {
  return handleRoute(async () => {
    return serverApiFetch<Meter>(`/meters/${encodeURIComponent(params.macID)}`)
  })
}

export async function PUT(req: NextRequest, { params }: Params) {
  return handleRoute(async () => {
    const body = await req.json()
    return serverApiFetch<Meter>(`/meters/${encodeURIComponent(params.macID)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return handleRoute(async () => {
    return serverApiFetch<void>(`/meters/${encodeURIComponent(params.macID)}`, {
      method: 'DELETE',
    })
  })
}