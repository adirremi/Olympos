"use client";

import { useState, useTransition } from "react";
import { createBusiness, deleteBusiness, inviteBusinessMember, revokeInvitation } from "./actions";
import type { Business, BusinessInvitation } from "@/types/database";

type BusinessWithInvites = Business & {
  source?: string;
  address?: string | null;
  gmb_location_id?: string | null;
  business_invitations: BusinessInvitation[];
};

export function BusinessManager({
  businesses,
}: {
  businesses: BusinessWithInvites[];
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-8">
      <form
        className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          startTransition(async () => {
            const result = await createBusiness(name);
            if (result.error) {
              setError(result.error);
              return;
            }
            setName("");
          });
        }}
      >
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="New business name"
          className="h-10 flex-1 rounded-lg border border-slate-200 px-3 text-sm"
        />
        <button
          type="submit"
          disabled={isPending}
          className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white disabled:opacity-60"
        >
          Add business
        </button>
      </form>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {businesses.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
          No businesses yet. Add your first one above.
        </p>
      ) : (
        <ul className="space-y-4">
          {businesses.map((business) => (
            <BusinessCard key={business.id} business={business} />
          ))}
        </ul>
      )}
    </div>
  );
}

function BusinessCard({ business }: { business: BusinessWithInvites }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const pendingInvites = (business.business_invitations ?? []).filter(
    (invite) => invite.status === "pending",
  );

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900">{business.name}</h2>
            {business.source === "google" ? (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                Google
              </span>
            ) : null}
          </div>
          {business.address ? (
            <p className="mt-1 text-sm text-slate-600">{business.address}</p>
          ) : null}
          <p className="mt-1 text-xs text-slate-500">
            Created {new Date(business.created_at).toLocaleDateString()}
          </p>
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            if (!confirm(`Delete "${business.name}" and all its check-ins?`)) {
              return;
            }
            startTransition(async () => {
              const result = await deleteBusiness(business.id);
              if (result.error) {
                setError(result.error);
              }
            });
          }}
          className="text-sm text-red-600 hover:text-red-700"
        >
          Delete
        </button>
      </div>

      <div className="mt-5 border-t border-slate-100 pt-5">
        <p className="text-sm font-medium text-slate-900">Invite team member</p>
        <form
          className="mt-2 flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            setMessage(null);
            startTransition(async () => {
              const result = await inviteBusinessMember(business.id, email);
              if (result.error) {
                setError(result.error);
                return;
              }
              setEmail("");
              setMessage(`Invitation saved for ${result.data?.email}.`);
            });
          }}
        >
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="teammate@company.com"
            className="h-10 flex-1 rounded-lg border border-slate-200 px-3 text-sm"
          />
          <button
            type="submit"
            disabled={isPending}
            className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Send invite
          </button>
        </form>

        {message ? <p className="mt-2 text-xs text-green-700">{message}</p> : null}
        {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}

        {pendingInvites.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {pendingInvites.map((invite) => (
              <li
                key={invite.id}
                className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600"
              >
                <span>
                  {invite.email} · expires{" "}
                  {new Date(invite.expires_at).toLocaleDateString()}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    startTransition(async () => {
                      await revokeInvitation(invite.id);
                    });
                  }}
                  className="text-red-600 hover:text-red-700"
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </li>
  );
}
