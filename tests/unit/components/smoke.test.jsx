/**
 * React component tests live under tests/unit/components/.
 * Import popup components via @/ alias; chrome APIs are mocked in vitest.setup.
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

function TestBadge({ label }) {
  return <span data-testid="badge">{label}</span>;
}

describe("component test harness", () => {
  it("renders with Testing Library + happy-dom", () => {
    render(<TestBadge label="Blitz" />);
    expect(screen.getByTestId("badge")).toHaveTextContent("Blitz");
  });
});
