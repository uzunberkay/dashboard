"use client"

import * as React from "react"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type PasswordFieldProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">

export function PasswordField({ className, disabled, ...props }: PasswordFieldProps) {
  const [visible, setVisible] = React.useState(false)

  return (
    <div className="relative">
      <Input
        {...props}
        disabled={disabled}
        type={visible ? "text" : "password"}
        className={cn("pr-12", className)}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled}
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Sifreyi gizle" : "Sifreyi goster"}
        aria-pressed={visible}
        className="absolute right-1.5 top-1.5 h-11 w-11 rounded-2xl text-slate-500 hover:bg-slate-100 hover:text-slate-900"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
    </div>
  )
}
