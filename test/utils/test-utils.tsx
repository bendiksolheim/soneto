import { type RenderOptions, render } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { AuthProvider, type AuthUser } from "@/hooks/use-auth";

interface WrapperProps {
  children: ReactNode;
  user?: AuthUser | null;
}

function AllTheProviders({ children, user = null }: WrapperProps) {
  return <AuthProvider user={user}>{children}</AuthProvider>;
}

interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  user?: AuthUser | null;
}

const customRender = (ui: ReactElement, options?: CustomRenderOptions) => {
  const { user, ...renderOptions } = options || {};
  return render(ui, {
    wrapper: ({ children }) => <AllTheProviders user={user}>{children}</AllTheProviders>,
    ...renderOptions,
  });
};

export * from "@testing-library/react";
export { customRender as render };
