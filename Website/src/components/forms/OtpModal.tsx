"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Button } from "@/components/ui/button"

interface OtpModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  channel: "email" | "phone"
  onVerify: (code: string) => Promise<void>
  onResend: () => Promise<void>
}

export function OtpModal({ open, onOpenChange, channel, onVerify, onResend }: OtpModalProps) {
  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Clear OTP when modal opens or channel changes
  useEffect(() => {
    if (open) {
      setOtp("")
      setError(null)
    }
  }, [open, channel])

  async function handleVerify() {
    setLoading(true)
    setError(null)
    try {
      await onVerify(otp)
      setOtp("") // Clear on successful verification
      onOpenChange(false)
    } catch (e: any) {
      setError(e?.message ?? "Verification failed. Try again.")
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setError(null)
    setOtp("") // Clear OTP input when resending
    try {
      await onResend()
    } catch (e: any) {
      setError(e?.message ?? "Failed to resend code.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="otp-desc" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Verify {channel === "email" ? "Email" : "Phone"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p id="otp-desc" className="text-sm text-muted-foreground">
            Enter the 6-digit code we sent to your {channel}.
          </p>
          <div className="flex justify-center">
            <InputOTP maxLength={6} value={otp} onChange={setOtp} aria-label="One-time password">
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot key={i} index={i} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
          {error ? <p role="alert" className="text-sm text-red-600 text-center">{error}</p> : null}
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={handleResend} disabled={loading}>
              Resend Code
            </Button>
            <Button onClick={handleVerify} disabled={loading || otp.length !== 6}>
              {loading ? "Verifying..." : "Verify"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
