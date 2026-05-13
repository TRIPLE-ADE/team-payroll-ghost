"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useAuth } from "@/contexts/auth-context";
import { getApiErrorMessage } from "@/lib/axios-error";
import { loginRequest } from "@/services/auth-api";
import type { LoginRequest } from "@/services/auth-api";

export function useLoginMutation() {
  const router = useRouter();
  const { setAccessToken } = useAuth();

  return useMutation({
    mutationKey: ["auth", "login"] as const,
    mutationFn: async (body: LoginRequest) => {
      return loginRequest(body);
    },
    onSuccess: (data) => {
      setAccessToken(data.accessToken);
      toast.success("Signed in successfully.");
      router.push("/dashboard");
      router.refresh();
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });
}
