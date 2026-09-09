import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { Card } from "@/components/ui/Card";

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Admin sign in</h1>
          <p className="mt-1 text-sm text-slate-600">Manage events, approvals and check-in.</p>
        </div>
        <Card className="p-6">
          <Suspense>
            <LoginForm />
          </Suspense>
        </Card>
      </div>
    </div>
  );
}
