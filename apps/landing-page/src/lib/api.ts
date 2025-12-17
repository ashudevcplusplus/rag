const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

interface ContactFormData {
  name: string;
  email: string;
  company?: string;
  message: string;
}

interface NewsletterFormData {
  email: string;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || data.message || 'Something went wrong',
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('API request failed:', error);
    return {
      success: false,
      error: 'Network error. Please try again.',
    };
  }
}

export async function submitContactForm(
  formData: ContactFormData
): Promise<ApiResponse<{ message: string; id: string }>> {
  return apiRequest('/api/contact', {
    method: 'POST',
    body: JSON.stringify(formData),
  });
}

export async function subscribeNewsletter(
  formData: NewsletterFormData
): Promise<ApiResponse<{ message: string; email: string }>> {
  return apiRequest('/api/newsletter/subscribe', {
    method: 'POST',
    body: JSON.stringify(formData),
  });
}

export async function unsubscribeNewsletter(
  email: string
): Promise<ApiResponse<{ message: string }>> {
  return apiRequest('/api/newsletter/unsubscribe', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

