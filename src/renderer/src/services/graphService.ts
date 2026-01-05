import { GraphApiGDAPRequest, DelegatedAdminRelationship, DelegatedAdminAccessAssignment } from '../types';
import { graphEndpoints } from '../auth/authConfig';
import { DEFAULT_ROLE_IDS } from '../constants';

/**
 * Generic Graph fetch wrapper
 */
export const callGraphApi = async (
  accessToken: string,
  endpoint: string,
  options?: RequestInit
): Promise<any> => {
  if (!accessToken) {
    throw new Error('Access token is empty.');
  }

  const baseHeaders = new Headers({
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  });

  let finalHeaders = baseHeaders;
  if (options?.headers) {
    const incoming = new Headers(options.headers as any);
    incoming.forEach((value, key) => {
      finalHeaders.set(key, value);
    });
  }

  const finalOptions: RequestInit = {
    method: options?.method || 'GET',
    ...options,
    headers: finalHeaders,
  };

  const response = await fetch(endpoint, finalOptions);

  if (!response.ok) {
    const requestId = response.headers.get('request-id') || response.headers.get('x-ms-request-id');
    const date = response.headers.get('Date');

    let message = `Request failed with status ${response.status}`;
    let errorDetails: any = null;
    try {
      const error = await response.json();
      message = error?.error?.message || message;
      errorDetails = error;
    } catch {
      try {
        const text = await response.text();
        if (text) message = `${message}: ${text}`;
      } catch { }
    }

    if (requestId || date) {
      console.error(`Graph diagnostics: request-id=${requestId ?? 'n/a'}, date=${date ?? 'n/a'}`);
    }

    const customError: any = new Error(message);
    customError.details = errorDetails;
    throw customError;
  }

  if (response.status === 204) return null;

  try {
    return await response.json();
  } catch {
    return null;
  }
};

function escapeODataString(value: string) {
  return value.replace(/'/g, "''");
}

function normalizeDurationDaysOnly(input: string): string {
  if (!input) throw new Error('duration is required');
  if (/^P\d+D$/i.test(input)) return input.toUpperCase();
  if (/^PT0S$/i.test(input) || /^P0D$/i.test(input)) return 'P0D';
  const m = input.match(/^(\d+)\s*d?$/i);
  if (m) return `P${m[1]}D`;
  throw new Error(`Invalid duration "${input}". Use an ISO-8601 days period like "P180D".`);
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function buildCreatePayload(req: GraphApiGDAPRequest): {
  displayName: string;
  duration: string;
  customer: { tenantId: string };
  accessDetails: { unifiedRoles: Array<{ roleDefinitionId: string }> };
} {
  const r: any = req as any;
  const displayName: string = r.displayName;
  if (!displayName) throw new Error('displayName is required');

  const duration: string = normalizeDurationDaysOnly(
    r.duration ?? r.relationshipDuration ?? r.validityPeriod
  );

  const customerTenantId: string =
    r.customer?.tenantId ??
    r.customerTenantId ??
    r.tenantId ??
    '';

  if (!customerTenantId) throw new Error('customer tenant id is required');

  let unifiedRoles: Array<{ roleDefinitionId: string }> = [];
  if (Array.isArray(r.accessDetails?.unifiedRoles)) {
    unifiedRoles = r.accessDetails.unifiedRoles
      .filter((u: any) => typeof u?.roleDefinitionId === 'string' && u.roleDefinitionId.length > 0)
      .map((u: any) => ({ roleDefinitionId: u.roleDefinitionId }));
  }

  if (unifiedRoles.length === 0) {
    unifiedRoles = DEFAULT_ROLE_IDS.map((id) => ({ roleDefinitionId: id }));
  }

  return {
    displayName,
    duration,
    customer: { tenantId: customerTenantId },
    accessDetails: { unifiedRoles },
  };
}

export const checkNameAvailability = async (
  name: string,
  accessToken: string
): Promise<boolean> => {
  try {
    const filter = `displayName eq '${escapeODataString(name)}'`;
    const endpoint = `${graphEndpoints.graphApi}?$filter=${encodeURIComponent(filter)}&$count=true&$top=1`;
    const headers = new Headers({ 'ConsistencyLevel': 'eventual' });
    const response = await callGraphApi(accessToken, endpoint, { headers });
    return !!response && response['@odata.count'] === 0;
  } catch {
    return false;
  }
};

async function lockGdapForApproval(accessToken: string, relationshipId: string, notes?: string): Promise<void> {
  const url = `${graphEndpoints.graphApi}/${relationshipId}/requests`;
  const body = { action: 'lockForApproval', ...(notes ? { notes } : {}) };
  await callGraphApi(accessToken, url, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

async function waitForStatus(
  accessToken: string,
  relationshipId: string,
  targetStatuses: string[] = ['approvalPending'],
  { timeoutMs = 120_000, intervalMs = 3_000 } = {}
): Promise<{ status?: string }> {
  const start = Date.now();
  const url = `${graphEndpoints.graphApi}/${relationshipId}?$select=status`;
  while (Date.now() - start < timeoutMs) {
    const entity = await callGraphApi(accessToken, url);
    const status: string | undefined = entity?.status;
    if (status && targetStatuses.includes(status)) return { status };
    await delay(intervalMs);
  }
  return { status: undefined };
}

export const createGDAPRequest = async (
  request: GraphApiGDAPRequest,
  accessToken: string
): Promise<{ success: boolean; message: string; data?: any; status?: string }> => {
  try {
    const payload = buildCreatePayload(request);
    const createHeaders = new Headers({ Prefer: 'return=representation' });
    const created = await callGraphApi(accessToken, graphEndpoints.graphApi, {
      method: 'POST',
      headers: createHeaders,
      body: JSON.stringify(payload),
    });

    let relationship = created;
    if (!relationship?.id) {
      const filter = `displayName eq '${escapeODataString(payload.displayName)}'`;
      const endpoint = `${graphEndpoints.graphApi}?$filter=${encodeURIComponent(filter)}&$top=1`;
      const fetched = await callGraphApi(accessToken, endpoint);
      relationship = fetched?.value?.[0];
      if (!relationship?.id) throw new Error('Created relationship could not be resolved.');
    }

    const r: any = request as any;
    const auto = r.autoExtendDuration;
    if (auto && auto !== 'PT0S' && auto !== 'P0D') {
      const normalizedAuto = normalizeDurationDaysOnly(auto);
      const updateEndpoint = `${graphEndpoints.graphApi}/${relationship.id}`;
      const patchHeaders = new Headers({
        'If-Match': relationship?.['@odata.etag'] ?? '*',
        'Prefer': 'return=representation',
      });
      await callGraphApi(accessToken, updateEndpoint, {
        method: 'PATCH',
        headers: patchHeaders,
        body: JSON.stringify({ autoExtendDuration: normalizedAuto }),
      });
      relationship = await callGraphApi(accessToken, updateEndpoint);
    }

    await lockGdapForApproval(accessToken, relationship.id, 'Finalize GDAP draft');
    const { status } = await waitForStatus(accessToken, relationship.id, ['approvalPending']);
    const latest = await callGraphApi(accessToken, `${graphEndpoints.graphApi}/${relationship.id}`);

    return {
      success: true,
      message: status === 'approvalPending' 
        ? `GDAP "${payload.displayName}" is now awaiting customer approval.` 
        : `GDAP "${payload.displayName}" finalized. Check portal for status.`,
      data: latest ?? relationship,
      status: latest?.status,
    };
  } catch (error: any) {
    return { success: false, message: error?.message || 'An unknown error occurred.' };
  }
};

export const getGDAPRelationships = async (accessToken: string): Promise<DelegatedAdminRelationship[]> => {
    const response = await callGraphApi(accessToken, graphEndpoints.graphApi);
    return response.value || [];
};

export const getGDAPRelationshipAccessAssignments = async (relationshipId: string, accessToken: string): Promise<DelegatedAdminAccessAssignment[]> => {
    const endpoint = `${graphEndpoints.graphApi}/${relationshipId}/accessAssignments`;
    const response = await callGraphApi(accessToken, endpoint);
    const assignments = response.value || [];
    return assignments.filter((a: DelegatedAdminAccessAssignment) => a.status !== 'deleted' && a.status !== 'deleting');
};

export const getGDAPAssignmentsWithGroupDisplayNames = async (relationshipId: string, accessToken: string): Promise<DelegatedAdminAccessAssignment[]> => {
    const assignments = await getGDAPRelationshipAccessAssignments(relationshipId, accessToken);
    if (!assignments || assignments.length === 0) return [];
    const groupIds = [...new Set(assignments.map(a => a.accessContainer.accessContainerId))];
    const batchRequest = {
        requests: groupIds.map((id, index) => ({
            id: `${index + 1}`,
            method: 'GET',
            url: `/groups/${id}?$select=id,displayName`,
        })),
    };
    const batchEndpoint = 'https://graph.microsoft.com/v1.0/$batch';
    const batchResponse = await callGraphApi(accessToken, batchEndpoint, { method: 'POST', body: JSON.stringify(batchRequest) });
    const groupNameMap = new Map<string, string>();
    if (batchResponse?.responses) {
        for (const response of batchResponse.responses) {
            if (response.status === 200 && response.body?.id && response.body?.displayName) {
                groupNameMap.set(response.body.id, response.body.displayName);
            }
        }
    }
    return assignments.map(a => ({
        ...a,
        accessContainer: { ...a.accessContainer, displayName: groupNameMap.get(a.accessContainer.accessContainerId) || 'Name not found' },
    }));
};

export const createGDAPAccessAssignment = async (relationshipId: string, securityGroupId: string, roleIds: string[], accessToken: string) => {
  const endpoint = `${graphEndpoints.graphApi}/${relationshipId}/accessAssignments`;
  const payload = {
    accessContainer: { accessContainerId: securityGroupId, accessContainerType: 'securityGroup' },
    accessDetails: { unifiedRoles: roleIds.map((id) => ({ roleDefinitionId: id })) },
  };
  return await callGraphApi(accessToken, endpoint, { method: 'POST', body: JSON.stringify(payload) });
};

export const updateGDAPAccessAssignment = async (relationshipId: string, assignmentId: string, roleIds: string[], etag: string, accessToken: string): Promise<DelegatedAdminAccessAssignment> => {
    const endpoint = `${graphEndpoints.graphApi}/${relationshipId}/accessAssignments/${assignmentId}`;
    const payload = { accessDetails: { unifiedRoles: roleIds.map(id => ({ roleDefinitionId: id })) } };
    await callGraphApi(accessToken, endpoint, { method: 'PATCH', headers: new Headers({ 'If-Match': etag }), body: JSON.stringify(payload) });
    return await callGraphApi(accessToken, endpoint);
};

export const deleteGDAPAccessAssignment = async (relationshipId: string, assignmentId: string, etag: string, accessToken: string): Promise<void> => {
    const endpoint = `${graphEndpoints.graphApi}/${relationshipId}/accessAssignments/${assignmentId}`;
    await callGraphApi(accessToken, endpoint, { method: 'DELETE', headers: new Headers({ 'If-Match': etag }) });
};

/**
 * Update auto-extend status for an existing relationship.
 */
export const updateGDAPRelationshipAutoExtend = async (
  relationshipId: string,
  isEnabled: boolean,
  etag: string,
  accessToken: string
): Promise<DelegatedAdminRelationship> => {
  const endpoint = `${graphEndpoints.graphApi}/${relationshipId}`;
  const autoExtendDuration = isEnabled ? 'P180D' : 'PT0S';
  
  await callGraphApi(accessToken, endpoint, {
    method: 'PATCH',
    headers: new Headers({ 'If-Match': etag }),
    body: JSON.stringify({ autoExtendDuration }),
  });

  return await callGraphApi(accessToken, endpoint);
};
