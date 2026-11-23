"use client"

import { useRouter } from "next/navigation"

import type { CandidateConsentsInput } from "@lynx/shared/candidate"

import { ConsentsForm } from "./consents-form"
import { ProfileForm, type ProfileFormValues } from "./profile-form"

/** Onboarding step 2: save the answers, then go to step 3. */
export function OnboardingProfile({ initial }: { initial: ProfileFormValues }) {
  const router = useRouter()
  return (
    <ProfileForm
      initial={initial}
      submitLabel="Continue"
      onSaved={() => router.push("/app/onboarding?step=3")}
    />
  )
}

/** Onboarding step 3: save the choices, finish onboarding, go home. */
export function OnboardingConsents({ initial }: { initial: CandidateConsentsInput }) {
  const router = useRouter()
  return (
    <ConsentsForm
      initial={initial}
      completeOnboarding
      submitLabel="Finish"
      onSaved={() => {
        router.push("/app")
        router.refresh()
      }}
    />
  )
}

/** Profile page: save and stay. */
export function EditProfile({ initial }: { initial: ProfileFormValues }) {
  const router = useRouter()
  return <ProfileForm initial={initial} submitLabel="Save" onSaved={() => router.refresh()} />
}
