// @vitest-environment jsdom
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { Auth } from "../client/main.js";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe("Identity interface", () => {
  it("labels inputs and reports server authentication errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Email or password is incorrect." }),
      }),
    );
    render(React.createElement(MemoryRouter, null, React.createElement(Auth)));
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "demo@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "incorrect-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in →" }));
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Email or password is incorrect.",
    );
  });
  it("exposes registration and recovery forms", () => {
    render(React.createElement(MemoryRouter, null, React.createElement(Auth)));
    fireEvent.click(screen.getByText("Create an account"));
    expect(screen.getByLabelText("Business name")).toBeTruthy();
    fireEvent.click(screen.getByText("Back to sign in"));
    fireEvent.click(screen.getByText("Forgot password?"));
    expect(
      screen.getByRole("button", { name: "Send reset link" }),
    ).toBeTruthy();
    expect(screen.queryByLabelText("Password")).toBeNull();
  });
  it("shows the generic local recovery confirmation", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          message: "If this account exists, a reset link has been sent.",
        }),
      });
    vi.stubGlobal("fetch", fetchMock);
    render(React.createElement(MemoryRouter, null, React.createElement(Auth)));
    fireEvent.click(screen.getByText("Forgot password?"));
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "fictional@example.invalid" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));
    expect((await screen.findByRole("status")).textContent).toBe(
      "If this account exists, a reset link has been sent.",
    );
    expect(fetchMock.mock.calls[0][0]).toBe("/api/auth/forgot");
  });
});
