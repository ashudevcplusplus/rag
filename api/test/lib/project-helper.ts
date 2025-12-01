import axios, { AxiosError } from 'axios';
import { API_URL, API_KEY } from '../e2e/config';

export async function createTestProject(
  companyId: string,
  name: string = 'Test Project'
): Promise<string> {
  const slug = `test-project-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  // Use a dummy ownerId for E2E tests (valid MongoDB ObjectId)
  const ownerId = '507f1f77bcf86cd799439011';

  try {
    const res = await axios.post(
      `${API_URL}/v1/companies/${companyId}/projects`,
      {
        name,
        slug,
        description: 'E2E Test Project',
        ownerId,
      },
      {
        headers: {
          'x-api-key': API_KEY,
        },
      }
    );

    return res.data.project._id;
  } catch (error: unknown) {
    if (error instanceof AxiosError) {
      console.error('Failed to create test project:', error.response?.data || error.message);
    } else {
      console.error('Failed to create test project:', error);
    }
    throw error;
  }
}
