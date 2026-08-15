import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { ReactNode } from 'react'

export function OverviewSection({
    title,
    href,
    action,
    canManage,
    titleExtra,
    className,
    children,
}: {
    title: string
    href: string
    action: string
    canManage: boolean
    titleExtra?: ReactNode
    className?: string
    children: ReactNode
}) {
    return (
        <section className={className}>
            <div className='mb-4 flex items-center justify-between gap-3'>
                <div className='flex min-w-0 items-center gap-3'>
                    <h3 className='shrink-0 text-xl font-bold'>{title}</h3>
                    {titleExtra}
                </div>
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
