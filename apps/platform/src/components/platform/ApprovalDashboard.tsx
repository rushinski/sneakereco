'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { ApiClientError, apiClient, clearAccessToken, getAccessToken, type RequestSummary } from '../../lib/api-client';

type StatusFilter = 'pending' | 'invited' | 'approved' | 'rejected' | undefined;

const STATUS_TABS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: undefined },
  { label: 'Pending', value: 'pending' },
  { label: 'Invited', value: 'invited' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

export function ApprovalDashboard() {
  const router = useRouter();

  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [requests, setRequests] = useState<RequestSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<StatusFilter>('pending');
  const [page, setPage] = useState(1);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const stored = getAccessToken();
    if (stored) {
      setToken(stored);
      apiClient.getCsrfToken().then((data) => setCsrfToken(data.token)).catch(() => {});
      return;
    }

    // No in-memory token — try to restore session from the httpOnly refresh cookie
    apiClient.getCsrfToken()
      .then((data) => {
        setCsrfToken(data.token);
        return apiClient.refreshAdmin(data.token);
      })
      .then((result) => {
        setAccessToken(result.accessToken);
        setToken(result.accessToken);
      })
      .catch(() => {
        router.push('/login');
      });
  }, [router]);

  useEffect(() => {
    if (!token) return;

    setLoading(true);
    setError(null);

    apiClient
      .listRequests({ status: filter, page, pageSize: 20 }, token)
      .then(({ items, total: t }) => {
        setRequests(items);
        setTotal(t);
      })
      .catch((err) => {
        if (err instanceof ApiClientError && err.status === 401) {
          clearAccessToken();
          router.push('/login');
          return;
        }
        setError(err instanceof ApiClientError ? err.message : 'Failed to load requests.');
      })
      .finally(() => setLoading(false));
  }, [token, filter, page, router]);

  async function handleApprove(tenantId: string) {
    if (!token || !csrfToken) return;
    setActionError(null);
    try {
      await apiClient.approveRequest(tenantId, csrfToken, token);
      setRequests((prev) => prev.filter((r) => r.tenantId !== tenantId));
    } catch (err) {
      setActionError(err instanceof ApiClientError ? err.message : 'Approve failed.');
    }
  }

  async function handleDeny(tenantId: string) {
    if (!token || !csrfToken) return;
    setActionError(null);
    try {
      await apiClient.denyRequest(tenantId, csrfToken, token);
      setRequests((prev) => prev.filter((r) => r.tenantId !== tenantId));
    } catch (err) {
      setActionError(err instanceof ApiClientError ? err.message : 'Deny failed.');
    }
  }

  return (
    <div className="dashboard">
      <header className="dashboard__header">
        <h1>Onboarding Requests</h1>
        <span className="dashboard__total">{total} total</span>
      </header>

      <nav className="dashboard__tabs" aria-label="Filter by status">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.label}
            className={`dashboard__tab${filter === tab.value ? ' dashboard__tab--active' : ''}`}
            onClick={() => {
              setFilter(tab.value);
              setPage(1);
            }}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {actionError ? <p className="form-error">{actionError}</p> : null}

      {loading ? (
        <p className="dashboard__loading">Loading...</p>
      ) : error ? (
        <p className="form-error">{error}</p>
      ) : requests.length === 0 ? (
        <p className="dashboard__empty">No requests found.</p>
      ) : (
        <table className="dashboard__table">
          <thead>
            <tr>
              <th>Business</th>
              <th>Name</th>
              <th>Email</th>
              <th>Instagram</th>
              <th>Submitted</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req) => (
              <tr key={req.tenantId}>
                <td>{req.businessName ?? '—'}</td>
                <td>{req.requestedByName ?? '—'}</td>
                <td>{req.requestedByEmail ?? '—'}</td>
                <td>
                  {req.instagramUrl ? (
                    <a href={req.instagramUrl} rel="noreferrer" target="_blank">
                      {req.instagramUrl}
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
                <td>{new Date(req.createdAt).toLocaleDateString()}</td>
                <td>
                  <span className={`status-badge status-badge--${req.requestStatus}`}>
                    {req.requestStatus}
                  </span>
                </td>
                <td>
                  {req.requestStatus === 'pending' ? (
                    <span className="dashboard__actions">
                      <button
                        className="button button--primary button--sm"
                        onClick={() => void handleApprove(req.tenantId)}
                        type="button"
                      >
                        Approve
                      </button>
                      <button
                        className="button button--danger button--sm"
                        onClick={() => void handleDeny(req.tenantId)}
                        type="button"
                      >
                        Deny
                      </button>
                    </span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {total > 20 ? (
        <div className="dashboard__pagination">
          <button
            className="button button--ghost"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            type="button"
          >
            Previous
          </button>
          <span>Page {page}</span>
          <button
            className="button button--ghost"
            disabled={page * 20 >= total}
            onClick={() => setPage((p) => p + 1)}
            type="button"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
