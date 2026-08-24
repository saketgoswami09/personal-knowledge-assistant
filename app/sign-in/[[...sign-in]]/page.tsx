import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F6F4] py-12 px-4 sm:px-6 lg:px-8">
      <SignIn routing="path" path="/sign-in" />
    </div>
  );
}

