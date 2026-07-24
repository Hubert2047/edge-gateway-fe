// app/login/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Lock, AlertCircle } from 'lucide-react'

const loginSchema = z.object({
    username: z.string().min(1, '請輸入帳號'),
    password: z.string().min(1, '請輸入密碼'),
})

type LoginFormValues = z.infer<typeof loginSchema>

const meters = [
    { label: 'CNC 加工機', y: 40 },
    { label: 'EDM 加工機', y: 90 },
    { label: '油壓射出機 1', y: 140 },
    { label: '冰水機', y: 190 },
]

export default function LoginPage() {
    const router = useRouter()
    const [serverError, setServerError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) })

    const onSubmit = async (values: LoginFormValues) => {
        setServerError(null)
        setLoading(true)

        const result = await signIn('credentials', {
            username: values.username,
            password: values.password,
            redirect: false,
        })

        setLoading(false)

        if (result?.error) {
            setServerError(result.error)
            return
        }

        router.push('/')
        router.refresh()
    }

    return (
        <div className='flex min-h-screen'>
            {/* left panel: login form */}
            <div className='flex flex-1 items-center justify-center bg-[#f4f2ec] px-6 py-12'>
                <div className='w-full max-w-sm'>
                    <div className='mb-8 flex items-center gap-2.5'>
                        <div className='flex h-9 w-9 items-center justify-center rounded-md bg-[#0f2b22] text-lg font-bold text-white'>
                            M
                        </div>
                        <span className='text-lg font-semibold tracking-tight text-[#14231c]'>MMold Edge</span>
                    </div>

                    <h2 className='text-2xl font-semibold tracking-tight text-[#14231c]'>登入帳號</h2>
                    <p className='mt-1.5 text-sm text-[#6b7a72]'>請輸入您的帳號密碼以繼續</p>

                    <form onSubmit={handleSubmit(onSubmit)} className='mt-8 space-y-4'>
                        <div className='space-y-1.5'>
                            <label htmlFor='username' className='text-sm font-medium text-[#14231c]'>
                                帳號
                            </label>
                            <div className='relative'>
                                <User className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa59d]' />
                                <input
                                    id='username'
                                    autoComplete='username'
                                    {...register('username')}
                                    className='w-full rounded-md border border-[#e5e1d8] bg-white py-2.5 pl-9 pr-3 text-sm text-[#14231c] outline-none transition-colors placeholder:text-[#9aa59d] focus:border-[#0f2b22] focus:ring-1 focus:ring-[#0f2b22]'
                                    placeholder='輸入帳號'
                                />
                            </div>
                            {errors.username && <p className='text-xs text-[#c2483b]'>{errors.username.message}</p>}
                        </div>

                        <div className='space-y-1.5'>
                            <label htmlFor='password' className='text-sm font-medium text-[#14231c]'>
                                密碼
                            </label>
                            <div className='relative'>
                                <Lock className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa59d]' />
                                <input
                                    id='password'
                                    type='password'
                                    autoComplete='current-password'
                                    {...register('password')}
                                    className='w-full rounded-md border border-[#e5e1d8] bg-white py-2.5 pl-9 pr-3 text-sm text-[#14231c] outline-none transition-colors placeholder:text-[#9aa59d] focus:border-[#0f2b22] focus:ring-1 focus:ring-[#0f2b22]'
                                    placeholder='••••••••'
                                />
                            </div>
                            {errors.password && <p className='text-xs text-[#c2483b]'>{errors.password.message}</p>}
                        </div>

                        {serverError && (
                            <div className='flex items-start gap-2 rounded-md border border-[#f0d4ce] bg-[#fbeeeb] px-3 py-2.5'>
                                <AlertCircle className='mt-0.5 h-4 w-4 shrink-0 text-[#c2483b]' />
                                <p className='text-sm text-[#c2483b]'>{serverError}</p>
                            </div>
                        )}

                        <button
                            type='submit'
                            disabled={loading}
                            className='w-full rounded-md bg-[#0f2b22] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#163a2e] disabled:opacity-60'>
                            {loading ? '登入中...' : '登入'}
                        </button>
                    </form>
                </div>
            </div>

            {/* right panel: meter -> gateway -> cloud data flow */}
            <div className='relative hidden w-[42%] flex-col justify-between overflow-hidden bg-[#0f2b22] px-12 py-10 text-white md:flex'>
                <div
                    className='pointer-events-none absolute inset-0 opacity-[0.06]'
                    style={{
                        backgroundImage:
                            'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
                        backgroundSize: '28px 28px',
                    }}
                />

                <div className='relative'>
                    <p className='font-mono text-xs uppercase tracking-[0.2em] text-white/40'>Data pipeline</p>
                    <h1 className='mt-3 text-2xl font-semibold leading-snug tracking-tight'>
                        智慧勾表數據，
                        <br />
                        即時上傳雲端。
                    </h1>
                </div>

                <div className='relative flex items-center justify-center py-6'>
                    <svg viewBox='0 0 340 240' className='w-full max-w-xs'>
                        {meters.map((m) => (
                            <g key={m.label}>
                                <line
                                    x1='60'
                                    y1={m.y}
                                    x2='170'
                                    y2='115'
                                    stroke='rgba(255,255,255,0.15)'
                                    strokeWidth='1'
                                />
                                <line
                                    x1='60'
                                    y1={m.y}
                                    x2='170'
                                    y2='115'
                                    stroke='#4ade80'
                                    strokeWidth='1.5'
                                    strokeDasharray='4 6'
                                    className='flow-line'
                                />
                                <circle cx='60' cy={m.y} r='4' fill='#f4f2ec' />
                                <text
                                    x='48'
                                    y={m.y}
                                    textAnchor='end'
                                    fontSize='9'
                                    fontFamily='var(--font-mono)'
                                    fill='rgba(255,255,255,0.55)'>
                                    {m.label}
                                </text>
                            </g>
                        ))}

                        <rect
                            x='150'
                            y='95'
                            width='40'
                            height='40'
                            rx='6'
                            fill='#163a2e'
                            stroke='#4ade80'
                            strokeWidth='1.5'
                        />
                        <text
                            x='170'
                            y='119'
                            textAnchor='middle'
                            fontSize='9'
                            fontFamily='var(--font-mono)'
                            fill='#4ade80'>
                            GW
                        </text>

                        <line x1='190' y1='115' x2='290' y2='115' stroke='rgba(255,255,255,0.15)' strokeWidth='1' />
                        <line
                            x1='190'
                            y1='115'
                            x2='290'
                            y2='115'
                            stroke='#4ade80'
                            strokeWidth='1.5'
                            strokeDasharray='4 6'
                            className='flow-line'
                        />

                        <circle cx='305' cy='115' r='16' fill='#163a2e' stroke='#4ade80' strokeWidth='1.5' />
                        <text
                            x='305'
                            y='118'
                            textAnchor='middle'
                            fontSize='8'
                            fontFamily='var(--font-mono)'
                            fill='#4ade80'>
                            雲
                        </text>
                    </svg>
                </div>

                <div className='relative flex items-center gap-2 text-xs text-white/40'>
                    <span className='relative flex h-2 w-2'>
                        <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75' />
                        <span className='relative inline-flex h-2 w-2 rounded-full bg-emerald-400' />
                    </span>
                    <span className='font-mono'>Edge service 連線正常</span>
                </div>

                <style jsx>{`
                    .flow-line {
                        animation: flow 1.4s linear infinite;
                    }
                    @keyframes flow {
                        to {
                            stroke-dashoffset: -20;
                        }
                    }
                `}</style>
            </div>
        </div>
    )
}
