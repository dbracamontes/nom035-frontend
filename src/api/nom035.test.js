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

import axios from 'axios';
import { uploadMedicaLebenDocs } from './nom035';

describe('uploadMedicaLebenDocs', () => {
  test('sends the file under compatible field names so the backend accepts it', async () => {
    const file = new File(['hello'], 'acta.pdf', { type: 'application/pdf' });
    axios.post.mockResolvedValue({ data: { ok: true } });

    await uploadMedicaLebenDocs(7, { actaConstitutiva: file });

    const [url, formData, config] = axios.post.mock.calls[0];
    expect(url).toBe('http://localhost:8080/api/companies/7/medica-leben/docs');
    expect(formData.get('acta_constitutiva')).toBe(file);
    expect(formData.get('actaConstitutiva')).toBe(file);
    expect(config.headers['Content-Type']).toContain('multipart/form-data');
  });
});
