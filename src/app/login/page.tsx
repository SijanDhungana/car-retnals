import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in — Fleet Rentals" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white">
            FR
          </div>
          <h1 className="text-xl font-semibold text-slate-900">
            Fleet Rentals
          </h1>
          <p className="mt-1 text-sm text-slate-500">Staff console</p>
        </div>

        <div className="card p-6">
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Internal tool — accounts are issued by an administrator.
        </p>
      </div>
    </main>
  );
}
