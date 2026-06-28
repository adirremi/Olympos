export type GmbLocation = {
  accountId: string;
  accountName: string;
  locationId: string;
  locationName: string;
  address: string | null;
  placeId: string | null;
};

type GoogleAccount = {
  name: string;
  accountName?: string;
};

type GoogleLocation = {
  name: string;
  title?: string;
  storefrontAddress?: {
    addressLines?: string[];
    locality?: string;
    administrativeArea?: string;
    postalCode?: string;
  };
  metadata?: {
    placeId?: string;
  };
};

function formatAddress(location: GoogleLocation): string | null {
  const address = location.storefrontAddress;
  if (!address) {
    return null;
  }

  return [
    ...(address.addressLines ?? []),
    address.locality,
    address.administrativeArea,
    address.postalCode,
  ]
    .filter(Boolean)
    .join(", ");
}

export async function fetchGoogleBusinessLocations(
  accessToken: string,
): Promise<GmbLocation[]> {
  const accountsResponse = await fetch(
    "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  const accountsPayload = (await accountsResponse.json()) as {
    accounts?: GoogleAccount[];
    error?: { message?: string };
  };

  if (!accountsResponse.ok) {
    throw new Error(
      accountsPayload.error?.message ?? "Failed to load Google Business accounts.",
    );
  }

  const accounts = accountsPayload.accounts ?? [];
  const locations: GmbLocation[] = [];

  for (const account of accounts) {
    const accountId = account.name.replace("accounts/", "");
    const locationsResponse = await fetch(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations?readMask=name,title,storefrontAddress,metadata`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    const locationsPayload = (await locationsResponse.json()) as {
      locations?: GoogleLocation[];
      error?: { message?: string };
    };

    if (!locationsResponse.ok) {
      throw new Error(
        locationsPayload.error?.message ??
          `Failed to load locations for ${account.accountName ?? accountId}.`,
      );
    }

    for (const location of locationsPayload.locations ?? []) {
      const locationId = location.name.replace(/^.*\/locations\//, "locations/");
      locations.push({
        accountId,
        accountName: account.accountName ?? accountId,
        locationId: location.name,
        locationName: location.title ?? "Untitled location",
        address: formatAddress(location),
        placeId: location.metadata?.placeId ?? null,
      });
    }
  }

  return locations;
}
