import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { ReactNode } from 'react'

export function OverviewSection({
    title,
    href,
    action,
    canManage,
    className,
    children,
}: {
    title: string
    href: string
    action: string
    canManage: boolean
    className?: string
    children: ReactNode
}) {
    return (
        <section className={className}>
            <div className='mb-4 flex items-center justify-between'>
                <h2 className='text-2xl font-bold'>{title}</h2>
                {canManage && (
                    <Link
                        href={href}
                        className='flex items-center gap-1 text-sm font-medium text-[#438466] hover:underline'>
                        {action}
                        <ArrowRight className='h-4 w-4' />
                    </Link>
                )}
            </div>
            {children}
        </section>
    )
}
