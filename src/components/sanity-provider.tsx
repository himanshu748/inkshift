"use client";

import { useState, type ReactNode } from "react";
import { createSanityInstance } from "@sanity/sdk";
import { SanityInstanceProvider } from "@sanity/sdk-react";
import { Loading } from "./common";

export default function SanityProvider({ children }: { children: ReactNode }) {
  const [instance] = useState(() =>
    createSanityInstance({
      projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? "",
      dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
      perspective: "published",
    }),
  );

  return (
    <SanityInstanceProvider
      instance={instance}
      fallback={<Loading text="Connecting to Sanity App SDK…" />}
    >
      {children}
    </SanityInstanceProvider>
  );
}
