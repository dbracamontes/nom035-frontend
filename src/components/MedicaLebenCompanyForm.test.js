import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MedicaLebenCompanyForm from './MedicaLebenCompanyForm';
import {
  getMedicaLebenDocs,
  getMedicaLebenPhotos,
} from '../api/nom035';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  },
}));

jest.mock('../api/nom035', () => ({
  getMedicaLebenDocs: jest.fn(),
  getMedicaLebenPhotos: jest.fn(),
  uploadMedicaLebenDocs: jest.fn(),
  uploadMedicaLebenPhoto: jest.fn(),
  updateCompany: jest.fn(),
  deleteMedicaLebenDoc: jest.fn(),
  deleteMedicaLebenPhoto: jest.fn(),
}));

beforeEach(() => {
  getMedicaLebenDocs.mockResolvedValue({ data: null });
  getMedicaLebenPhotos.mockResolvedValue({ data: [] });
});

describe('MedicaLebenCompanyForm', () => {
  test('shows the save button after selecting a file in a required document', async () => {
    render(
      <MedicaLebenCompanyForm
        company={{ id: 7, name: 'Acme', taxId: 'ABC123', folioMercantil: 'F-001' }}
        isNewCompany={false}
        onClose={jest.fn()}
      />
    );

    const documentItem = (await screen.findByText('Acta constitutiva')).closest('li');
    const actaInput = documentItem.querySelector('input[type="file"]');

    expect(actaInput).not.toBeNull();

    const file = new File(['hello'], 'acta.pdf', { type: 'application/pdf' });
    fireEvent.change(actaInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('Listo para subir')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /^Guardar$/i })).toBeInTheDocument();
  });
});