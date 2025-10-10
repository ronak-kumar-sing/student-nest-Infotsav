"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { studentSignupSchema } from "@/lib/validation/authSchemas"
import { InputField } from "@/components/forms/InputField"
import { PhoneInputField } from "@/components/forms/PhoneInputField"
import { PasswordInput } from "@/components/forms/PasswordInput"
import { Button } from "@/components/ui/button"
import { OtpModal } from "@/components/forms/OtpModal"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

export default function StudentSignupPage() {
  const router = useRouter()
  const { register, handleSubmit, formState: { errors }, watch } = useForm({
    resolver: zodResolver(studentSignupSchema),
  })

  const [emailVerified, setEmailVerified] = useState(false)
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [otpOpen, setOtpOpen] = useState(false)
  const [otpChannel, setOtpChannel] = useState<"email" | "phone">("email")
  const [loading, setLoading] = useState(false)
  const [sendingOtp, setSendingOtp] = useState(false)

  // Log form errors whenever they change
  console.log("Form errors:", errors)
  console.log("Verification status:", { emailVerified, phoneVerified })

  async function onSubmit(values: Record<string, unknown>) {
    console.log("Submit started with values:", { ...values, password: "[REDACTED]" })

    if (!emailVerified || !phoneVerified) {
      console.log("Verification check failed:", { emailVerified, phoneVerified })
      toast.error("Please verify your email and phone number to continue.")
      return
    }

    console.log("Starting signup API call...")
    setLoading(true)
    try {
      const res = await fetch("/api/auth/student/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })

      console.log("API response status:", res.status, res.statusText)
      const data = await res.json()
      console.log("API response data:", data)

      if (res.ok && data.success) {
        toast.success("Account created successfully! Welcome to Student Nest!")

        // Store user data and redirect to home page
        if (data.data) {
          console.log("Storing token and user data...")
          localStorage.setItem("accessToken", data.data.accessToken)
          localStorage.setItem("user", JSON.stringify({
            ...data.data.user,
            userType: 'student'
          }))
          console.log("Token and user data stored successfully")
        } else {
          console.error("No data.data in response:", data)
        }

        // Redirect to dashboard
        console.log("Redirecting to dashboard in 500ms...")
        setTimeout(() => {
          router.push("/dashboard")
        }, 500)
      } else {
        console.error("Signup failed:", data)
        toast.error(data.error || data.message || "Sign up failed. Please try again.")
      }
    } catch (error) {
      console.error("Signup error:", error)
      toast.error("Network error. Please try again.")
    } finally {
      setLoading(false)
      console.log("Signup process completed")
    }
  }

  // Wrapper to catch validation errors
  const handleFormSubmit = handleSubmit(
    onSubmit,
    (validationErrors) => {
      console.log("Form validation failed:", validationErrors)

      // Create user-friendly field names
      const fieldNames: Record<string, string> = {
        fullName: "Full Name",
        email: "Email",
        phone: "Phone Number",
        password: "Password",
        confirmPassword: "Confirm Password",
        collegeId: "College ID",
        collegeName: "College Name"
      }

      // Collect all error messages
      const errorMessages: string[] = []

      if (validationErrors.fullName) errorMessages.push(`• ${fieldNames.fullName}: ${validationErrors.fullName.message}`)
      if (validationErrors.email) errorMessages.push(`• ${fieldNames.email}: ${validationErrors.email.message}`)
      if (validationErrors.phone) errorMessages.push(`• ${fieldNames.phone}: ${validationErrors.phone.message}`)
      if (validationErrors.password) errorMessages.push(`• ${fieldNames.password}: ${validationErrors.password.message}`)
      if (validationErrors.confirmPassword) errorMessages.push(`• ${fieldNames.confirmPassword}: ${validationErrors.confirmPassword.message}`)
      if (validationErrors.collegeId) errorMessages.push(`• ${fieldNames.collegeId}: ${validationErrors.collegeId.message}`)
      if (validationErrors.collegeName) errorMessages.push(`• ${fieldNames.collegeName}: ${validationErrors.collegeName.message}`)

      if (errorMessages.length > 0) {
        // Show the first error as toast
        const firstErrorField = Object.keys(validationErrors)[0]
        const firstErrorMessage = validationErrors[firstErrorField as keyof typeof validationErrors]?.message
        toast.error(firstErrorMessage || "Please check your input")

        // Log all errors to console for debugging
        console.error("Validation errors:\n" + errorMessages.join("\n"))
      } else {
        toast.error("Please fill in all required fields correctly.")
      }
    }
  )

  async function sendOtp(kind: "email" | "phone") {
    const value = kind === "email" ? watch("email") : watch("phone")
    if (!value) {
      toast.error(`Please enter your ${kind} first.`)
      return
    }

    setSendingOtp(true)
    try {
      const res = await fetch(`/api/otp/${kind}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value })
      })

      const data = await res.json()

      if (res.ok) {
        setOtpChannel(kind)
        setOtpOpen(true)
        toast.success(`OTP sent to your ${kind}.`)
      } else {
        toast.error(data.error || data.message || `Failed to send OTP to ${kind}.`)
      }
    } catch (error) {
      console.error("OTP send error:", error)
      toast.error("Network error. Please try again.")
    } finally {
      setSendingOtp(false)
    }
  }

  async function verifyOtp(code: string) {
    const value = otpChannel === "email" ? watch("email") : watch("phone")
    const res = await fetch(`/api/otp/${otpChannel}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value, code })
    })

    if (res.ok) {
      if (otpChannel === "email") {
        setEmailVerified(true)
        toast.success("Email verified successfully!")
      } else {
        setPhoneVerified(true)
        toast.success("Phone verified successfully!")
      }
    } else {
      throw new Error("Invalid OTP code.")
    }
  }

  async function resendOtp() {
    await sendOtp(otpChannel)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold">Create Student Account</CardTitle>
          <CardDescription>
            Join Student Nest to find your perfect accommodation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleFormSubmit} noValidate>
            <InputField
              id="fullName"
              label="Full Name"
              required
              {...register("fullName")}
              error={errors.fullName?.message as string}
            />

            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="flex-1">
                  <InputField
                    id="email"
                    label="Email"
                    required
                    {...register("email")}
                    error={errors.email?.message as string}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant={emailVerified ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => sendOtp("email")}
                    disabled={emailVerified || sendingOtp}
                    className="whitespace-nowrap"
                  >
                    {sendingOtp && otpChannel === "email" ? (
                      "Sending..."
                    ) : emailVerified ? (
                      <>
                        <Badge variant="secondary" className="mr-1">✓</Badge>
                        Verified
                      </>
                    ) : "Verify"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <PhoneInputField
                    id="phone"
                    label="Phone"
                    required
                    {...register("phone")}
                    error={errors.phone?.message as string}
                  />
                </div>
                <Button
                  type="button"
                  variant={phoneVerified ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => sendOtp("phone")}
                  disabled={phoneVerified || sendingOtp}
                  className="whitespace-nowrap h-8 px-3"
                >
                  {sendingOtp && otpChannel === "phone" ? (
                    "Sending..."
                  ) : phoneVerified ? (
                    <>
                      <Badge variant="secondary" className="mr-1">✓</Badge>
                      Verified
                    </>
                  ) : "Verify"}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Create Password <span className="text-red-600">*</span>
              </label>
              <PasswordInput
                id="password"
                {...register("password")}
                className={errors.password ? "border-red-500" : ""}
                showStrength={true}
              />
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password.message as string}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm Password <span className="text-red-600">*</span>
              </label>
              <PasswordInput
                id="confirmPassword"
                {...register("confirmPassword")}
                className={errors.confirmPassword ? "border-red-500" : ""}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-600">{errors.confirmPassword.message as string}</p>
              )}
            </div>

            <InputField
              id="collegeId"
              label="College ID"
              required
              {...register("collegeId")}
              error={errors.collegeId?.message as string}
            />

            <InputField
              id="collegeName"
              label="College Name"
              required
              {...register("collegeName")}
              error={errors.collegeName?.message as string}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
              onClick={() => console.log("Sign Up button clicked!", { loading, emailVerified, phoneVerified })}
            >
              {loading ? "Creating Account..." : "Sign Up"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link href="/student/login" className="text-blue-600 hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>

      <OtpModal
        open={otpOpen}
        onOpenChange={setOtpOpen}
        channel={otpChannel}
        onVerify={verifyOtp}
        onResend={resendOtp}
      />
    </div>
  )
}
