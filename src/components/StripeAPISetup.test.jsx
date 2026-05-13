/**
 * PR-S1.5 frontend regression — StripeAPISetup Test Connection button.
 *
 * Pre-fix, handleTestConnection used `await stripeAPI.testConnection()` inside
 * a try/catch and showed the success modal whenever no exception was thrown.
 * The backend returns HTTP 200 with `{ connected: false, error: '...' }`
 * when there are no Stripe credentials saved (the typical post-disconnect
 * state), so the user would see "Connection Test Successful!" despite the
 * tenant having no Stripe configured.
 *
 * Fix: the modal must inspect `result.connected === true` before showing
 * success; falsy or missing → failure modal with the backend's error message.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the api module. checkConnectionStatus runs on mount and we want it
// to resolve with `connected: false` so the form (with the Test Connection
// button) renders rather than the "Connected" view.
jest.mock('../services/api', () => ({
  stripeAPI: {
    testConnection: jest.fn(),
    setupCredentials: jest.fn(),
    disconnect: jest.fn(),
  },
}));

const { stripeAPI } = require('../services/api');
const StripeAPISetup = require('./StripeAPISetup').default;

describe('StripeAPISetup — Test Connection button', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('shows FAILURE modal when backend returns { connected: false }', async () => {
    // Mount-time call AND the button-click call both return connected:false.
    stripeAPI.testConnection.mockResolvedValue({
      connected: false,
      error: 'No Stripe key found',
    });

    render(<StripeAPISetup />);

    // Wait for checkConnectionStatus to settle and form to render.
    const testBtn = await screen.findByRole('button', { name: /test connection/i });
    await userEvent.click(testBtn);

    await waitFor(() => {
      expect(screen.getByText(/connection test failed/i)).toBeInTheDocument();
    });
    // Backend's error string is surfaced.
    expect(screen.getByText(/no stripe key found/i)).toBeInTheDocument();
    // Must NOT show success copy.
    expect(screen.queryByText(/connection test successful/i)).not.toBeInTheDocument();
  });

  test('shows FAILURE modal when backend returns 200 with empty body', async () => {
    stripeAPI.testConnection.mockResolvedValue({});

    render(<StripeAPISetup />);
    const testBtn = await screen.findByRole('button', { name: /test connection/i });
    await userEvent.click(testBtn);

    await waitFor(() => {
      expect(screen.getByText(/connection test failed/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/connection test successful/i)).not.toBeInTheDocument();
  });

  test('shows SUCCESS modal only when backend returns { connected: true }', async () => {
    // Use mockImplementation so the FIRST call (mount-time checkConnectionStatus)
    // returns connected:false (form view renders), and the SECOND call (the
    // button click) returns connected:true. Swapping with mockResolvedValue
    // after render() races against React's effect scheduling.
    let calls = 0;
    stripeAPI.testConnection.mockImplementation(async () => {
      calls += 1;
      return calls === 1 ? { connected: false } : { connected: true, account_id: 'acct_x' };
    });

    render(<StripeAPISetup />);
    const testBtn = await screen.findByRole('button', { name: /test connection/i });
    await userEvent.click(testBtn);

    // The regex matches both the modal title and the longer success message,
    // so target the heading specifically to avoid multi-match errors.
    expect(await screen.findByRole('heading', { name: /connection test successful/i })).toBeInTheDocument();
    expect(calls).toBe(2);
  });

  test('shows FAILURE modal when the request itself throws', async () => {
    stripeAPI.testConnection.mockResolvedValue({ connected: false });
    render(<StripeAPISetup />);
    const testBtn = await screen.findByRole('button', { name: /test connection/i });

    stripeAPI.testConnection.mockRejectedValue(Object.assign(new Error('network'), {
      response: { data: { error: 'network down' } },
    }));
    await userEvent.click(testBtn);

    await waitFor(() => {
      expect(screen.getByText(/connection test failed/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/network down/i)).toBeInTheDocument();
  });
});
