import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { ThemeToggle } from "@/components/ThemeToggle";
import { saveSettings, changePassword, uploadLogo, removeLogo } from "./actions";

export const dynamic = "force-dynamic";

const PROVINCES = [
  "Alberta", "British Columbia", "Manitoba", "New Brunswick",
  "Newfoundland and Labrador", "Northwest Territories", "Nova Scotia",
  "Nunavut", "Ontario", "Prince Edward Island", "Quebec", "Saskatchewan", "Yukon",
];

export default async function SettingsPage() {
  const s = await prisma.businessSettings.findUnique({ where: { id: "singleton" } });
  const hasLogo = Boolean(s?.logoStorageKey);

  return (
    <>
      <PageHeader
        title="Settings"
        description="Business profile, branding, tax configuration, and account."
      />

      <section className="card mb-6 max-w-2xl p-5">
        <h2 className="mb-1 text-base font-semibold">Appearance</h2>
        <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
          Choose how the app looks. "System" follows your device setting.
        </p>
        <ThemeToggle />
      </section>

      <section className="card mb-6 max-w-2xl p-5">
        <h2 className="mb-1 text-base font-semibold">Logo</h2>
        <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
          Shown in the sidebar and mobile top bar. Square images work best.
        </p>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200 dark:bg-slate-700 dark:ring-slate-600">
            {hasLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/logo?ts=${s?.updatedAt?.getTime() ?? ""}`} alt="Current logo" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs text-slate-400">No logo</span>
            )}
          </div>
          <form action={uploadLogo} className="flex flex-1 items-center gap-2">
            <input
              type="file"
              name="logo"
              accept="image/*"
              required
              className="input flex-1"
            />
            <button type="submit" className="btn-primary">Upload</button>
          </form>
        </div>
        {hasLogo && (
          <form action={removeLogo} className="mt-3">
            <button type="submit" className="btn-ghost text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" formNoValidate>
              Remove logo
            </button>
          </form>
        )}
      </section>

      <section className="card max-w-2xl p-5">
        <h2 className="mb-3 text-base font-semibold">Business profile</h2>
        <form action={saveSettings} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Business name</label>
            <input name="businessName" defaultValue={s?.businessName ?? "My Business"} className="input" />
          </div>
          <div>
            <label className="label">Country</label>
            <input name="country" defaultValue={s?.country ?? "Canada"} className="input" />
          </div>
          <div>
            <label className="label">Province / region</label>
            <select name="province" defaultValue={s?.province ?? "Nova Scotia"} className="input">
              {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Currency</label>
            <input name="currency" defaultValue={s?.currency ?? "CAD"} className="input" />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">3-letter code (CAD, USD, EUR…).</p>
          </div>

          <fieldset className="sm:col-span-2 mt-2 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Tax tracking</legend>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="taxRegistered" defaultChecked={s?.taxRegistered ?? false} />
              I am registered to collect tax
            </label>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              When off, tax fields are hidden on income/expense forms. Switching this on later will not affect existing data.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Tax type</label>
                <select name="taxType" defaultValue={s?.taxType ?? "HST"} className="input">
                  <option value="HST">HST</option>
                  <option value="GST">GST</option>
                  <option value="PST">PST</option>
                  <option value="GST_PST">GST + PST</option>
                  <option value="CUSTOM">Custom</option>
                </select>
              </div>
              <div>
                <label className="label">Default tax rate (e.g. 0.15)</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  max="1"
                  name="defaultTaxRate"
                  defaultValue={s?.defaultTaxRate ?? ""}
                  placeholder="0.15"
                  className="input"
                />
              </div>
            </div>
          </fieldset>

          <div className="sm:col-span-2 flex justify-end">
            <button type="submit" className="btn-primary">Save settings</button>
          </div>
        </form>
      </section>

      <section className="card mt-6 max-w-md p-5">
        <h2 className="mb-3 text-base font-semibold">Change password</h2>
        <form action={changePassword} className="space-y-3">
          <div>
            <label className="label">New password</label>
            <input name="newPassword" type="password" minLength={8} required className="input" />
          </div>
          <div>
            <label className="label">Confirm new password</label>
            <input name="confirmPassword" type="password" minLength={8} required className="input" />
          </div>
          <div className="flex justify-end">
            <button type="submit" className="btn-primary">Update password</button>
          </div>
        </form>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          You'll stay signed in. The next sign-in will require the new password.
        </p>
      </section>
    </>
  );
}
