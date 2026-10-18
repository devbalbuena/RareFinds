import type { Metadata } from "next";
import { SignUpForm } from "@/components/auth/SignUpForm";

export const metadata: Metadata = {
  title: "Create Account | RareFinds Vault",
  description: "Create your RareFinds account to reserve sneakers and manage orders.",
};

interface SignUpPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SignUpPage(props: SignUpPageProps) {
  const searchParams = await props.searchParams;
  const callbackUrl =
    typeof searchParams.callbackUrl === "string"
      ? searchParams.callbackUrl
      : "/account";

  return <SignUpForm callbackUrl={callbackUrl} />;
}
