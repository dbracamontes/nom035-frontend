import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import CompanyForm from "./CompanyForm";

jest.mock("axios", () => ({ post: jest.fn() }));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

describe("CompanyForm contact fields", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    axios.post.mockResolvedValue({ data: { id: 1 } });
  });

  test("sends city, postal code, phone, and email when creating a company", async () => {
    render(<CompanyForm />);

    const fields = [
      [/Nombre de la Empresa/, "Empresa de prueba"],
      [/RFC \/ Tax ID/, "RFC123"],
      [/Folio Mercantil/, "FM-123"],
      ["Ciudad", "Monterrey"],
      ["Código Postal", "64000"],
      ["Teléfono", "8180000000"],
      ["Correo Electrónico", "contacto@example.com"],
    ];

    fields.forEach(([label, value]) => {
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    });
    fireEvent.click(screen.getByRole("button", { name: "Crear Empresa" }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/companies$/),
        expect.objectContaining({
          ciudad: "Monterrey",
          codigoPostal: "64000",
          telefono: "8180000000",
          correoElectronico: "contacto@example.com",
        })
      );
    });
  });
});