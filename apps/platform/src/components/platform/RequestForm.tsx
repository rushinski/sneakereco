'use client';

import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react';

import { ApiClientError, apiClient } from '../../lib/api-client';

interface FormState {
  businessName: string;
  email: string;
  fullName: string;
  instagramHandle: string;
  phoneNumber: string;
}

const INITIAL_STATE: FormState = {
  businessName: '',
  email: '',
  fullName: '',
  instagramHandle: '',
  phoneNumber: '',
};

export function RequestForm() {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>(INITIAL_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void apiClient
      .getCsrfToken()
      .then((response) => {
        if (!cancelled) {
          setCsrfToken(response.token);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Unable to prepare the request form right now.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setFormState((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!csrfToken) {
      setError('The form is still preparing. Try again in a moment.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await apiClient.requestAccount(formState, csrfToken);
      setSubmitted(true);
    } catch (caughtError) {
      if (caughtError instanceof ApiClientError) {
        setError(caughtError.message);
      } else {
        setError('We could not submit your request. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <section className="panel panel--success">
        <p className="eyebrow">Request Received</p>
        <h1>We received your request.</h1>
        <p className="lede">We&apos;ll review the details and be in touch with next steps.</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <p className="eyebrow">Account Request</p>
      <h1>Tell us about your store.</h1>
      <p className="lede">
        This first step gets your business in front of the platform team. Once approved, you&apos;ll
        receive a private setup link.
      </p>
      <form
        className="stack"
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
      >
        <label className="field">
          <span>Full name</span>
          <input
            autoComplete="name"
            name="fullName"
            onChange={handleChange}
            required
            value={formState.fullName}
          />
        </label>
        <label className="field">
          <span>Email</span>
          <input
            autoComplete="email"
            name="email"
            onChange={handleChange}
            required
            type="email"
            value={formState.email}
          />
        </label>
        <label className="field">
          <span>Phone number</span>
          <input
            autoComplete="tel"
            name="phoneNumber"
            onChange={handleChange}
            required
            value={formState.phoneNumber}
          />
        </label>
        <label className="field">
          <span>Business name</span>
          <input
            name="businessName"
            onChange={handleChange}
            required
            value={formState.businessName}
          />
        </label>
        <label className="field">
          <span>Instagram handle</span>
          <input
            name="instagramHandle"
            onChange={handleChange}
            placeholder="@yourstore"
            required
            value={formState.instagramHandle}
          />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <button className="button button--primary" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Sending Request...' : 'Send Request'}
        </button>
      </form>
    </section>
  );
}
