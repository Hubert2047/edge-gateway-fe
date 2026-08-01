import { ROUTES } from '@/constances/route'
import { redirect } from 'next/navigation'

export default function Home() {
    redirect(ROUTES.overview)
}
