import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthBootstrap } from "@/features/auth/auth-bootstrap";
import { AuthStoreProvider, useAuthStore } from "@/features/auth/auth-store";
import { AuthUserHydrator } from "@/features/auth/auth-user-hydrator";

const user = {
  id: "447a6484-d0a7-4e5b-8f31-8872a563d9b1",
  displayName: "해뜸 여행자",
  profileImageUrl: null,
  provider: "KAKAO" as const,
};

const previousApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

function StateProbe({ label }: { label: string }) {
  const status = useAuthStore((state) => state.status);
  const userId = useAuthStore((state) => state.user?.id ?? null);

  return <output data-testid={label}>{`${status}:${userId ?? "null"}`}</output>;
}

function AuthenticateButton({ label }: { label: string }) {
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);

  return (
    <button type="button" onClick={() => setAuthenticated(user)}>
      {label}
    </button>
  );
}

function AnonymousButton() {
  const setAnonymous = useAuthStore((state) => state.setAnonymous);

  return (
    <button type="button" onClick={setAnonymous}>
      set anonymous
    </button>
  );
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000/api/v1";
});

afterEach(() => {
  vi.unstubAllGlobals();
  if (previousApiBaseUrl === undefined) {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
  } else {
    process.env.NEXT_PUBLIC_API_BASE_URL = previousApiBaseUrl;
  }
});

describe("AuthStoreProvider", () => {
  it("starts with an exact unknown and null state", () => {
    render(
      <AuthStoreProvider>
        <StateProbe label="state" />
      </AuthStoreProvider>,
    );

    expect(screen.getByTestId("state")).toHaveTextContent("unknown:null");
  });

  it("moves to authenticated with a non-null user", () => {
    render(
      <AuthStoreProvider>
        <AuthenticateButton label="authenticate" />
        <StateProbe label="state" />
      </AuthStoreProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "authenticate" }));

    expect(screen.getByTestId("state")).toHaveTextContent(
      "authenticated:447a6484-d0a7-4e5b-8f31-8872a563d9b1",
    );
  });

  it("clears an authenticated user when setting anonymous", () => {
    render(
      <AuthStoreProvider>
        <AuthenticateButton label="authenticate" />
        <AnonymousButton />
        <StateProbe label="state" />
      </AuthStoreProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "authenticate" }));
    fireEvent.click(screen.getByRole("button", { name: "set anonymous" }));

    expect(screen.getByTestId("state")).toHaveTextContent("anonymous:null");
  });

  it("keeps state isolated between separate providers", () => {
    render(
      <>
        <section aria-label="first provider">
          <AuthStoreProvider>
            <AuthenticateButton label="authenticate first" />
            <StateProbe label="first-state" />
          </AuthStoreProvider>
        </section>
        <section aria-label="second provider">
          <AuthStoreProvider>
            <StateProbe label="second-state" />
          </AuthStoreProvider>
        </section>
      </>,
    );

    fireEvent.click(
      within(screen.getByRole("region", { name: "first provider" })).getByRole(
        "button",
        { name: "authenticate first" },
      ),
    );

    expect(screen.getByTestId("first-state")).toHaveTextContent(
      "authenticated:447a6484-d0a7-4e5b-8f31-8872a563d9b1",
    );
    expect(screen.getByTestId("second-state")).toHaveTextContent("unknown:null");
  });

  it("does not access browser storage while creating an in-memory store", () => {
    const localStorage = Object.getOwnPropertyDescriptor(window, "localStorage");
    const sessionStorage = Object.getOwnPropertyDescriptor(window, "sessionStorage");
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get: () => {
        throw new Error("local storage must not be read");
      },
    });
    Object.defineProperty(window, "sessionStorage", {
      configurable: true,
      get: () => {
        throw new Error("session storage must not be read");
      },
    });

    try {
      render(
        <AuthStoreProvider>
          <StateProbe label="state" />
        </AuthStoreProvider>,
      );
      expect(screen.getByTestId("state")).toHaveTextContent("unknown:null");
    } finally {
      if (localStorage) Object.defineProperty(window, "localStorage", localStorage);
      if (sessionStorage) Object.defineProperty(window, "sessionStorage", sessionStorage);
    }
  });
});

describe("AuthBootstrap", () => {
  it("marks the store authenticated after the current-user endpoint succeeds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify(user), { status: 200 }),
      ),
    );

    render(
      <AuthStoreProvider>
        <AuthBootstrap />
        <StateProbe label="state" />
      </AuthStoreProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("state")).toHaveTextContent(
        "authenticated:447a6484-d0a7-4e5b-8f31-8872a563d9b1",
      );
    });
  });

  it("marks the store anonymous after the current-user endpoint returns 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 401 })),
    );

    render(
      <AuthStoreProvider>
        <AuthBootstrap />
        <StateProbe label="state" />
      </AuthStoreProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("state")).toHaveTextContent("anonymous:null");
    });
  });

  it.each([
    {
      label: "network failure",
      configure: () =>
        vi.stubGlobal(
          "fetch",
          vi.fn<typeof fetch>().mockRejectedValue(new Error("connection reset")),
        ),
    },
    {
      label: "server failure",
      configure: () =>
        vi.stubGlobal(
          "fetch",
          vi
            .fn<typeof fetch>()
            .mockResolvedValue(new Response("upstream failure", { status: 503 })),
        ),
    },
    {
      label: "missing API configuration",
      configure: () => {
        delete process.env.NEXT_PUBLIC_API_BASE_URL;
      },
    },
    {
      label: "malformed current-user response",
      configure: () =>
        vi.stubGlobal(
          "fetch",
          vi
            .fn<typeof fetch>()
            .mockResolvedValue(new Response(JSON.stringify({ id: user.id }), { status: 200 })),
        ),
    },
  ])("settles to anonymous after a $label", async ({ configure }) => {
    configure();

    render(
      <AuthStoreProvider>
        <AuthBootstrap />
        <StateProbe label="state" />
      </AuthStoreProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("state")).toHaveTextContent("anonymous:null");
    });
  });
});

describe("AuthUserHydrator", () => {
  it("applies a user already verified by a protected server component", async () => {
    render(
      <AuthStoreProvider>
        <AuthUserHydrator user={user} />
        <StateProbe label="state" />
      </AuthStoreProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("state")).toHaveTextContent(
        "authenticated:447a6484-d0a7-4e5b-8f31-8872a563d9b1",
      );
    });
  });
});
