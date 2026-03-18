import type { ReactNode } from "react"
import { Manrope } from "next/font/google"

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
})

export default function AuthLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className={`${manrope.className} relative min-h-screen overflow-hidden bg-[#ece8df] text-foreground`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.96),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(15,23,42,0.12),_transparent_26%),linear-gradient(145deg,_#f6f2eb_0%,_#efebe2_44%,_#e7e1d7_100%)]" />
      <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(15,23,42,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.2)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(circle_at_center,white,transparent_88%)]" />
      <div className="absolute left-[-8rem] top-[-6rem] h-96 w-96 rounded-full bg-white/70 blur-3xl" />
      <div className="absolute bottom-[-9rem] right-[-6rem] h-[28rem] w-[28rem] rounded-full bg-slate-300/35 blur-3xl" />
      <div className="relative flex min-h-screen items-center justify-center p-4 sm:p-6 lg:p-8">
        {children}
      </div>
    </div>
  )
}
