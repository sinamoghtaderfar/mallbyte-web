import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AddressManager } from "../address-manager";
import {
  createAddress,
  deleteAddress,
  getAddresses,
  setDefaultAddress,
} from "../../api";
import type { Address } from "../../types";

vi.mock("../../api", () => ({
  getAddresses: vi.fn(),
  createAddress: vi.fn(),
  deleteAddress: vi.fn(),
  setDefaultAddress: vi.fn(),
}));

const mockedGetAddresses = vi.mocked(getAddresses);
const mockedCreateAddress = vi.mocked(createAddress);
const mockedDeleteAddress = vi.mocked(deleteAddress);
const mockedSetDefaultAddress = vi.mocked(setDefaultAddress);

const address: Address = {
  id: 1,
  user: 1,
  title: "Home",
  province: "Bayern",
  city: "Bamberg",
  street: "Pestalozzistraße",
  alley: "",
  building_number: "9A",
  floor: "",
  unit: "",
  postal_code: "96052",
  receiver_name: "Sina Moghtaderfar",
  receiver_phone: "+989222222222",
  is_default: true,
  created_at: "2026-08-21T00:00:00Z",
  updated_at: "2026-08-21T00:00:00Z",
};

describe("AddressManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks backend-required address fields as required", async () => {
    mockedGetAddresses.mockResolvedValue([]);

    render(<AddressManager />);

    await waitFor(() => {
      expect(mockedGetAddresses).toHaveBeenCalled();
    });

    expect(screen.getByLabelText(/title/i)).toBeRequired();
    expect(screen.getByLabelText(/province/i)).toBeRequired();
    expect(screen.getByLabelText(/city/i)).toBeRequired();
    expect(screen.getByLabelText(/street/i)).toBeRequired();
    expect(screen.getByLabelText(/building \/ plate number/i)).toBeRequired();
    expect(screen.getByLabelText(/postal code/i)).toBeRequired();
    expect(screen.getByLabelText(/receiver name/i)).toBeRequired();
    expect(screen.getByLabelText(/receiver phone/i)).toBeRequired();
  });

  it("keeps optional address fields optional", async () => {
    mockedGetAddresses.mockResolvedValue([]);

    render(<AddressManager />);

    await waitFor(() => {
      expect(mockedGetAddresses).toHaveBeenCalled();
    });

    expect(screen.getByLabelText(/alley/i)).not.toBeRequired();
    expect(screen.getByLabelText(/floor/i)).not.toBeRequired();
    expect(screen.getByLabelText(/unit/i)).not.toBeRequired();
    expect(screen.getByLabelText(/set as default address/i)).not.toBeRequired();
  });

  it("adds frontend validation hints for city, province, and postal code", async () => {
    mockedGetAddresses.mockResolvedValue([]);

    render(<AddressManager />);

    await waitFor(() => {
      expect(mockedGetAddresses).toHaveBeenCalled();
    });

    expect(screen.getByLabelText(/province/i)).toHaveAttribute(
      "pattern",
      "[^0-9]*",
    );
    expect(screen.getByLabelText(/city/i)).toHaveAttribute(
      "pattern",
      "[^0-9]*",
    );
    expect(screen.getByLabelText(/postal code/i)).toHaveAttribute(
      "pattern",
      "[0-9]{4,10}",
    );
    expect(screen.getByLabelText(/postal code/i)).toHaveAttribute(
      "inputmode",
      "numeric",
    );
  });

  it("renders saved addresses", async () => {
    mockedGetAddresses.mockResolvedValue([address]);

    render(<AddressManager />);

    expect(await screen.findByText("Home")).toBeInTheDocument();
    expect(screen.getByText(/Bayern, Bamberg/i)).toBeInTheDocument();
    expect(screen.getByText(/Building 9A/i)).toBeInTheDocument();
    expect(screen.getByText(/Postal code: 96052/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Receiver: Sina Moghtaderfar · \+989222222222/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Default")).toBeInTheDocument();
  });

  it("creates an address with required and optional fields", async () => {
    const user = userEvent.setup();

    mockedGetAddresses.mockResolvedValue([]);
    mockedCreateAddress.mockResolvedValue(address);

    render(<AddressManager />);

    await waitFor(() => {
      expect(mockedGetAddresses).toHaveBeenCalledTimes(1);
    });

    await user.type(screen.getByLabelText(/title/i), "Home");
    await user.type(screen.getByLabelText(/province/i), "Bayern");
    await user.type(screen.getByLabelText(/city/i), "Bamberg");
    await user.type(screen.getByLabelText(/street/i), "Pestalozzistraße");
    await user.type(screen.getByLabelText(/building \/ plate number/i), "9A");
    await user.type(screen.getByLabelText(/postal code/i), "96052");
    await user.type(
      screen.getByLabelText(/receiver name/i),
      "Sina Moghtaderfar",
    );
    await user.type(screen.getByLabelText(/receiver phone/i), "+989222222222");

    await user.click(screen.getByRole("button", { name: /save address/i }));

    await waitFor(() => {
      expect(mockedCreateAddress).toHaveBeenCalledWith({
        title: "Home",
        province: "Bayern",
        city: "Bamberg",
        street: "Pestalozzistraße",
        alley: "",
        building_number: "9A",
        floor: "",
        unit: "",
        postal_code: "96052",
        receiver_name: "Sina Moghtaderfar",
        receiver_phone: "+989222222222",
        is_default: false,
      });
    });

    expect(mockedGetAddresses).toHaveBeenCalledTimes(2);
  });

  it("sets default address and deletes address", async () => {
    const user = userEvent.setup();

    mockedGetAddresses.mockResolvedValue([
      {
        ...address,
        is_default: false,
      },
    ]);
    mockedSetDefaultAddress.mockResolvedValue(undefined);
    mockedDeleteAddress.mockResolvedValue(undefined);

    render(<AddressManager />);

    expect(await screen.findByText("Home")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /set default/i }));

    await waitFor(() => {
      expect(mockedSetDefaultAddress).toHaveBeenCalledWith(1);
    });

    await user.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() => {
      expect(mockedDeleteAddress).toHaveBeenCalledWith(1);
    });
  });

  it("shows API errors from address actions", async () => {
    const user = userEvent.setup();

    mockedGetAddresses.mockResolvedValue([]);
    mockedCreateAddress.mockRejectedValue(new Error("Postal code is invalid."));

    render(<AddressManager />);

    await waitFor(() => {
      expect(mockedGetAddresses).toHaveBeenCalledTimes(1);
    });

    await user.type(screen.getByLabelText(/title/i), "Home");
    await user.type(screen.getByLabelText(/province/i), "Bayern");
    await user.type(screen.getByLabelText(/city/i), "Bamberg");
    await user.type(screen.getByLabelText(/street/i), "Pestalozzistraße");
    await user.type(screen.getByLabelText(/building \/ plate number/i), "9A");
    await user.type(screen.getByLabelText(/postal code/i), "96052");
    await user.type(
      screen.getByLabelText(/receiver name/i),
      "Sina Moghtaderfar",
    );
    await user.type(screen.getByLabelText(/receiver phone/i), "+989222222222");

    await user.click(screen.getByRole("button", { name: /save address/i }));

    expect(
      await screen.findByText("Postal code is invalid."),
    ).toBeInTheDocument();
  });
});
