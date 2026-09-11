import { GraphApiGDAPRequest, DelegatedAdminRelationship, DelegatedAdminAccessAssignment, SecurityGroupSearchResult } from '../types';
import { graphEndpoints } from '../auth/authConfig';
import { DEFAULT_ROLE_IDS } from '../constants';

const GRAPH_BATCH_ENDPOINT = 'https://graph.microsoft.com/v1.0/$batch';
const GRAPH_BATCH_LIMIT = 20;
const GRAPH_MAX_RETRIES = 5;
const GRAPH_FALLBACK_RETRY_MS = 2_000;

export interface GDAPRelationshipsSnapshot {
  relationships: DelegatedAdminRelationship[];
  assignmentsByRelationshipId: Record<string, DelegatedAdminAccessAssignment[]>;
  groupNamesByRelationshipId: Record<string, string[]>;
}

export interface GDAPSnapshotProgress {
  current: number;
  total: number;
  message: string;
}

let gdapSnapshotCache = new Map<string, GDAPRelationshipsSnapshot>();
let gdapSnapshotPromises = new Map<string, Promise<GDAPRelationshipsSnapshot>>();

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function getRetryDelayMs(headers: Headers, attempt: number): number {
  const retryAfter = headers.get('Retry-After') || headers.get('retry-after');
  if (retryAfter) {
    const retryAfterSeconds = Number(retryAfter);
    if (Number.isFinite(retryAfterSeconds)) {
      return Math.max(0, retryAfterSeconds * 1_000);
    }

    const retryAfterDateMs = Date.parse(retryAfter);
    if (!Number.isNaN(retryAfterDateMs)) {
      return Math.max(0, retryAfterDateMs - Date.now());
    }
  }

  return GRAPH_FALLBACK_RETRY_MS * Math.pow(2, attempt);
}

function getBatchRetryDelayMs(responseHeaders: Record<string, string> | undefined, attempt: number): number {
  const headers = new Headers(responseHeaders || {});
  return getRetryDelayMs(headers, attempt);
}

function isTransientGraphStatus(status: number): boolean {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

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

  let response: Response;
  for (let attempt = 0; ; attempt += 1) {
    response = await fetch(endpoint, finalOptions);
    if (!isTransientGraphStatus(response.status) || attempt >= GRAPH_MAX_RETRIES) {
      break;
    }

    await delay(getRetryDelayMs(response.headers, attempt));
  }

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

const cloneAssignment = (assignment: DelegatedAdminAccessAssignment): DelegatedAdminAccessAssignment => ({
  ...assignment,
  accessContainer: { ...assignment.accessContainer },
  accessDetails: {
    ...assignment.accessDetails,
    unifiedRoles: assignment.accessDetails.unifiedRoles.map((role) => ({ ...role })),
  },
});

const cloneSnapshot = (snapshot: GDAPRelationshipsSnapshot): GDAPRelationshipsSnapshot => ({
  relationships: snapshot.relationships.map((relationship) => ({ ...relationship })),
  assignmentsByRelationshipId: Object.fromEntries(
    Object.entries(snapshot.assignmentsByRelationshipId).map(([relationshipId, assignments]) => [
      relationshipId,
      assignments.map(cloneAssignment),
    ])
  ),
  groupNamesByRelationshipId: Object.fromEntries(
    Object.entries(snapshot.groupNamesByRelationshipId).map(([relationshipId, groupNames]) => [
      relationshipId,
      [...groupNames],
    ])
  ),
});

const chunkArray = <T,>(items: T[], chunkSize: number): T[][] => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
};

const getGraphRelativePath = (absoluteUrl: string): string => {
  const url = new URL(absoluteUrl);
  return `${url.pathname.replace(/^\/v1\.0/, '')}${url.search}`;
};

const runGraphBatchRequests = async <T>(
  accessToken: string,
  requests: Array<{ id: string; method: 'GET'; url: string }>,
  onProgress?: (processed: number, total: number) => void
): Promise<Array<{ id: string; status: number; headers?: Record<string, string>; body?: T }>> => {
  const responses: Array<{ id: string; status: number; headers?: Record<string, string>; body?: T }> = [];
  let processed = 0;

  for (const requestChunk of chunkArray(requests, GRAPH_BATCH_LIMIT)) {
    let pendingRequests = requestChunk;
    let attempt = 0;

    while (pendingRequests.length > 0) {
      const batchResponse = await callGraphApi(accessToken, GRAPH_BATCH_ENDPOINT, {
        method: 'POST',
        body: JSON.stringify({ requests: pendingRequests }),
      });

      const batchResponses = Array.isArray(batchResponse?.responses) ? batchResponse.responses : [];
      const retryRequests: Array<{ id: string; method: 'GET'; url: string }> = [];
      let retryDelayMs = 0;

      for (const response of batchResponses) {
        if (isTransientGraphStatus(response.status) && attempt < GRAPH_MAX_RETRIES) {
          const originalRequest = pendingRequests.find((request) => request.id === response.id);
          if (originalRequest) {
            retryRequests.push(originalRequest);
            retryDelayMs = Math.max(retryDelayMs, getBatchRetryDelayMs(response.headers, attempt));
          }
          continue;
        }

        responses.push(response);
      }

      processed += pendingRequests.length - retryRequests.length;
      onProgress?.(processed, requests.length);

      pendingRequests = retryRequests;
      if (pendingRequests.length > 0) {
        await delay(retryDelayMs || GRAPH_FALLBACK_RETRY_MS);
        attempt += 1;
      }
    }
  }

  return responses;
};

export const invalidateGDAPSnapshotCache = () => {
  gdapSnapshotCache = new Map<string, GDAPRelationshipsSnapshot>();
  gdapSnapshotPromises = new Map<string, Promise<GDAPRelationshipsSnapshot>>();
};

const buildSnapshot = async (
  accessToken: string,
  onProgress?: (progress: GDAPSnapshotProgress) => void
): Promise<GDAPRelationshipsSnapshot> => {
  const relationships = await getGDAPRelationships(accessToken);
  const emptySnapshot: GDAPRelationshipsSnapshot = {
    relationships,
    assignmentsByRelationshipId: {},
    groupNamesByRelationshipId: {},
  };

  onProgress?.({
    current: 0,
    total: relationships.length,
    message: 'Collecting active role assignments',
  });

  if (relationships.length === 0) {
    return emptySnapshot;
  }

  const assignmentResponses = await runGraphBatchRequests<{ value?: DelegatedAdminAccessAssignment[] }>(
    accessToken,
    relationships.map((relationship) => ({
      id: relationship.id,
      method: 'GET',
      url: `${getGraphRelativePath(graphEndpoints.graphApi)}/${relationship.id}/accessAssignments`,
    })),
    (processed, total) => {
      onProgress?.({
        current: processed,
        total,
        message: 'Collecting active role assignments',
      });
    }
  );

  const assignmentsByRelationshipId: Record<string, DelegatedAdminAccessAssignment[]> = {};
  const uniqueGroupIds = new Set<string>();

  for (const response of assignmentResponses) {
    const assignments = (response.body?.value || []).filter(
      (assignment) => assignment.status !== 'deleted' && assignment.status !== 'deleting'
    );
    assignmentsByRelationshipId[response.id] = assignments;

    for (const assignment of assignments) {
      uniqueGroupIds.add(assignment.accessContainer.accessContainerId);
    }
  }

  const groupNameMap = new Map<string, string>();
  if (uniqueGroupIds.size > 0) {
    const totalWork = relationships.length + uniqueGroupIds.size;
    onProgress?.({
      current: relationships.length,
      total: totalWork,
      message: 'Resolving security group names',
    });

    const groupResponses = await runGraphBatchRequests<{ id?: string; displayName?: string }>(
      accessToken,
      [...uniqueGroupIds].map((groupId) => ({
        id: groupId,
        method: 'GET',
        url: `/groups/${groupId}?$select=id,displayName`,
      })),
      (processed, total) => {
        onProgress?.({
          current: relationships.length + processed,
          total: relationships.length + total,
          message: 'Resolving security group names',
        });
      }
    );

    for (const response of groupResponses) {
      if (response.status === 200 && response.body?.id && response.body.displayName) {
        groupNameMap.set(response.body.id, response.body.displayName);
      }
    }
  }

  const groupNamesByRelationshipId: Record<string, string[]> = {};
  for (const relationship of relationships) {
    const assignments = assignmentsByRelationshipId[relationship.id] || [];
    const hydratedAssignments = assignments.map((assignment) => ({
      ...assignment,
      accessContainer: {
        ...assignment.accessContainer,
        displayName: groupNameMap.get(assignment.accessContainer.accessContainerId) || 'Name not found',
      },
    }));
    const groupNames = hydratedAssignments
      .map((assignment) => assignment.accessContainer.displayName)
      .filter((name): name is string => !!name && name !== 'Name not found');

    assignmentsByRelationshipId[relationship.id] = hydratedAssignments;
    groupNamesByRelationshipId[relationship.id] = [...new Set(groupNames)].sort((a, b) =>
      a.localeCompare(b, 'de', { sensitivity: 'base' })
    );
  }

  return {
    relationships,
    assignmentsByRelationshipId,
    groupNamesByRelationshipId,
  };
};

export const getGDAPRelationshipsSnapshot = async (
  accessToken: string,
  options?: { forceRefresh?: boolean; onProgress?: (progress: GDAPSnapshotProgress) => void }
): Promise<GDAPRelationshipsSnapshot> => {
  const cacheKey = accessToken;
  if (options?.forceRefresh) {
    gdapSnapshotCache.delete(cacheKey);
    gdapSnapshotPromises.delete(cacheKey);
  }

  const cached = gdapSnapshotCache.get(cacheKey);
  if (cached) {
    return cloneSnapshot(cached);
  }

  const pending = gdapSnapshotPromises.get(cacheKey);
  if (pending) {
    return cloneSnapshot(await pending);
  }

  const promise = buildSnapshot(accessToken, options?.onProgress)
    .then((snapshot) => {
      gdapSnapshotCache.set(cacheKey, snapshot);
      gdapSnapshotPromises.delete(cacheKey);
      return snapshot;
    })
    .catch((error) => {
      gdapSnapshotPromises.delete(cacheKey);
      throw error;
    });

  gdapSnapshotPromises.set(cacheKey, promise);
  return cloneSnapshot(await promise);
};

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
    invalidateGDAPSnapshotCache();
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
  const cachedSnapshot = gdapSnapshotCache.get(accessToken);
  if (cachedSnapshot?.assignmentsByRelationshipId[relationshipId]) {
    return cachedSnapshot.assignmentsByRelationshipId[relationshipId].map(cloneAssignment);
  }
    const endpoint = `${graphEndpoints.graphApi}/${relationshipId}/accessAssignments`;
    const response = await callGraphApi(accessToken, endpoint);
    const assignments = response.value || [];
    return assignments.filter((a: DelegatedAdminAccessAssignment) => a.status !== 'deleted' && a.status !== 'deleting');
};

export const getGDAPAssignmentsWithGroupDisplayNames = async (relationshipId: string, accessToken: string): Promise<DelegatedAdminAccessAssignment[]> => {
  const cachedSnapshot = gdapSnapshotCache.get(accessToken);
  if (cachedSnapshot?.assignmentsByRelationshipId[relationshipId]) {
    return cachedSnapshot.assignmentsByRelationshipId[relationshipId].map(cloneAssignment);
  }

  const pendingSnapshot = gdapSnapshotPromises.get(accessToken);
  if (pendingSnapshot) {
    const snapshot = await pendingSnapshot;
    const cachedAssignments = snapshot.assignmentsByRelationshipId[relationshipId];
    if (cachedAssignments) {
      return cachedAssignments.map(cloneAssignment);
    }
  }

    const assignments = await getGDAPRelationshipAccessAssignments(relationshipId, accessToken);
    if (!assignments || assignments.length === 0) return [];
    const groupIds = [...new Set(assignments.map(a => a.accessContainer.accessContainerId))];
    const groupNameMap = new Map<string, string>();
  const batchResponses = await runGraphBatchRequests<{ id?: string; displayName?: string }>(
    accessToken,
    groupIds.map((id) => ({
      id,
      method: 'GET',
      url: `/groups/${id}?$select=id,displayName`,
    }))
  );
  for (const response of batchResponses) {
    if (response.status === 200 && response.body?.id && response.body.displayName) {
      groupNameMap.set(response.body.id, response.body.displayName);
    }
    }
    return assignments.map(a => ({
        ...a,
        accessContainer: { ...a.accessContainer, displayName: groupNameMap.get(a.accessContainer.accessContainerId) || 'Name not found' },
    }));
};

export const createGDAPAccessAssignment = async (relationshipId: string, securityGroupId: string, roleIds: string[], accessToken: string) => {
  invalidateGDAPSnapshotCache();
  const endpoint = `${graphEndpoints.graphApi}/${relationshipId}/accessAssignments`;
  const payload = {
    accessContainer: { accessContainerId: securityGroupId, accessContainerType: 'securityGroup' },
    accessDetails: { unifiedRoles: roleIds.map((id) => ({ roleDefinitionId: id })) },
  };
  return await callGraphApi(accessToken, endpoint, { method: 'POST', body: JSON.stringify(payload) });
};

export const updateGDAPAccessAssignment = async (relationshipId: string, assignmentId: string, roleIds: string[], etag: string, accessToken: string): Promise<DelegatedAdminAccessAssignment> => {
  invalidateGDAPSnapshotCache();
    const endpoint = `${graphEndpoints.graphApi}/${relationshipId}/accessAssignments/${assignmentId}`;
    const payload = { accessDetails: { unifiedRoles: roleIds.map(id => ({ roleDefinitionId: id })) } };
    await callGraphApi(accessToken, endpoint, { method: 'PATCH', headers: new Headers({ 'If-Match': etag }), body: JSON.stringify(payload) });
    return await callGraphApi(accessToken, endpoint);
};

export const deleteGDAPAccessAssignment = async (relationshipId: string, assignmentId: string, etag: string, accessToken: string): Promise<void> => {
  invalidateGDAPSnapshotCache();
    const endpoint = `${graphEndpoints.graphApi}/${relationshipId}/accessAssignments/${assignmentId}`;
    await callGraphApi(accessToken, endpoint, { method: 'DELETE', headers: new Headers({ 'If-Match': etag }) });
};

export const searchSecurityGroups = async (
  searchTerm: string,
  accessToken: string
): Promise<SecurityGroupSearchResult[]> => {
  const trimmed = searchTerm.trim();

  // Graph API returns max 999 per page — paginate through all pages
  const PAGE_SIZE = 999;

  let firstEndpoint: string;
  let requestOptions: RequestInit | undefined;

  if (trimmed) {
    const searchValue = trimmed.replace(/"/g, '\\"');
    firstEndpoint = `https://graph.microsoft.com/v1.0/groups?$select=id,displayName&$filter=securityEnabled eq true&$search="displayName:${searchValue}"&$top=${PAGE_SIZE}`;
    requestOptions = { headers: new Headers({ ConsistencyLevel: 'eventual' }) };
  } else {
    firstEndpoint = `https://graph.microsoft.com/v1.0/groups?$select=id,displayName&$filter=securityEnabled eq true&$top=${PAGE_SIZE}`;
  }

  const allGroups: any[] = [];
  let nextLink: string | undefined = firstEndpoint;

  while (nextLink) {
    const response = await callGraphApi(accessToken, nextLink, requestOptions);
    const page: any[] = response?.value || [];
    allGroups.push(...page);
    nextLink = response?.['@odata.nextLink'];
  }

  const normalizedSearch = trimmed.toLowerCase();

  return allGroups
    .filter((g: any) => typeof g?.id === 'string')
    .map((g: any) => ({
      id: g.id,
      displayName: g.displayName || g.id,
    }))
    .filter((g: SecurityGroupSearchResult) => {
      if (!normalizedSearch) return true;
      return g.displayName.toLowerCase().includes(normalizedSearch);
    })
    .sort((a: SecurityGroupSearchResult, b: SecurityGroupSearchResult) => a.displayName.localeCompare(b.displayName));
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
  invalidateGDAPSnapshotCache();
  const endpoint = `${graphEndpoints.graphApi}/${relationshipId}`;
  const autoExtendDuration = isEnabled ? 'P180D' : 'PT0S';
  
  await callGraphApi(accessToken, endpoint, {
    method: 'PATCH',
    headers: new Headers({ 'If-Match': etag }),
    body: JSON.stringify({ autoExtendDuration }),
  });

  return await callGraphApi(accessToken, endpoint);
};
