"use client";

// Context يكشف ما إذا كانت الجلسة الحالية انتحالاً (للقراءة فقط)
// يُستخدم في النماذج والأزرار الخطيرة لتعطيلها بصرياً ووظيفياً
import { createContext, useContext, type ReactNode } from "react";
import { useSession } from "next-auth/react";

interface ImpersonationContextValue {
  isImpersonating: boolean;
  isReadOnly: boolean;
  impersonatorId?: string;
}

const Ctx = createContext<ImpersonationContextValue>({
  isImpersonating: false,
  isReadOnly: false,
});

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const impersonator = session?.impersonator;
  const value: ImpersonationContextValue = {
    isImpersonating: !!impersonator,
    isReadOnly: !!impersonator,
    impersonatorId: impersonator?.id,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** خطّاف للوصول لحالة الانتحال — false ما لم يكن هناك انتحال نشط */
export function useImpersonation(): ImpersonationContextValue {
  return useContext(Ctx);
}

/** اختصار شائع — هل الجلسة في وضع القراءة فقط (انتحال نشط)؟ */
export function useIsReadOnly(): boolean {
  return useContext(Ctx).isReadOnly;
}
