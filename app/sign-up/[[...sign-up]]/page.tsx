import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F6F4] py-12 px-4 sm:px-6 lg:px-8">
      <SignUp routing="path" path="/sign-up" />
    </div>
  );
}

