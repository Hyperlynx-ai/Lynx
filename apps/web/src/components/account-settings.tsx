import { Headline } from "@lynx/ui/components/headline"
import { Panel } from "@lynx/ui/components/panel"

import { DeleteAccount } from "@/components/delete-account"
import { NewPasswordForm } from "@/components/auth/password-forms"

/**
 * Account settings shared by every role: email, password, delete account.
 * Role-specific panels go in `children` (shown before "Delete account").
 */
export function AccountSettings({
  email,
  children,
}: {
  email: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex max-w-3xl flex-col gap-gap-md">
      <Headline as="h1" size="title" lead="Settings." muted="Your login and your account." />
      <Panel>
        <h2 className="text-label text-text-primary">Email</h2>
        <p className="mt-2 font-mono text-mono text-text-secondary">{email}</p>
      </Panel>
      <Panel className="flex flex-col gap-gap-md">
        <div>
          <h2 className="text-label text-text-primary">Change password</h2>
          <p className="mt-1 text-body text-text-secondary">
            Signed in with Google? Setting a password also lets you log in with your email.
          </p>
        </div>
        <NewPasswordForm mode="change" />
      </Panel>
      {children}
      <Panel className="flex flex-col gap-gap-md">
        <div>
          <h2 className="text-label text-text-primary">Delete account</h2>
          <p className="mt-1 text-body text-text-secondary">
            Permanently deletes your account and everything stored with it. This can&apos;t be
            undone.
          </p>
        </div>
        <DeleteAccount />
      </Panel>
    </div>
  )
}
