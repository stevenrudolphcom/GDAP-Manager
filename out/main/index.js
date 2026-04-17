"use strict";
const electron = require("electron");
const path = require("path");
const fs = require("fs");
const url = require("url");
const process$1 = require("process");
const http = require("http");
const https = require("https");
const crypto = require("crypto");
const require$$0 = require("buffer");
const require$$3 = require("stream");
const require$$5 = require("util");
const msalNodeExtensions = require("@azure/msal-node-extensions");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const path__namespace = /* @__PURE__ */ _interopNamespaceDefault(path);
const fs__namespace = /* @__PURE__ */ _interopNamespaceDefault(fs);
class Serializer {
  /**
   * serialize the JSON blob
   * @param data - JSON blob cache
   */
  static serializeJSONBlob(data) {
    return JSON.stringify(data);
  }
  /**
   * Serialize Accounts
   * @param accCache - cache of accounts
   */
  static serializeAccounts(accCache) {
    const accounts = {};
    Object.keys(accCache).map(function(key) {
      const accountEntity = accCache[key];
      accounts[key] = {
        home_account_id: accountEntity.homeAccountId,
        environment: accountEntity.environment,
        realm: accountEntity.realm,
        local_account_id: accountEntity.localAccountId,
        username: accountEntity.username,
        authority_type: accountEntity.authorityType,
        name: accountEntity.name,
        client_info: accountEntity.clientInfo,
        last_modification_time: accountEntity.lastModificationTime,
        last_modification_app: accountEntity.lastModificationApp,
        tenantProfiles: accountEntity.tenantProfiles?.map((tenantProfile) => {
          return JSON.stringify(tenantProfile);
        })
      };
    });
    return accounts;
  }
  /**
   * Serialize IdTokens
   * @param idTCache - cache of ID tokens
   */
  static serializeIdTokens(idTCache) {
    const idTokens = {};
    Object.keys(idTCache).map(function(key) {
      const idTEntity = idTCache[key];
      idTokens[key] = {
        home_account_id: idTEntity.homeAccountId,
        environment: idTEntity.environment,
        credential_type: idTEntity.credentialType,
        client_id: idTEntity.clientId,
        secret: idTEntity.secret,
        realm: idTEntity.realm
      };
    });
    return idTokens;
  }
  /**
   * Serializes AccessTokens
   * @param atCache - cache of access tokens
   */
  static serializeAccessTokens(atCache) {
    const accessTokens = {};
    Object.keys(atCache).map(function(key) {
      const atEntity = atCache[key];
      accessTokens[key] = {
        home_account_id: atEntity.homeAccountId,
        environment: atEntity.environment,
        credential_type: atEntity.credentialType,
        client_id: atEntity.clientId,
        secret: atEntity.secret,
        realm: atEntity.realm,
        target: atEntity.target,
        cached_at: atEntity.cachedAt,
        expires_on: atEntity.expiresOn,
        extended_expires_on: atEntity.extendedExpiresOn,
        refresh_on: atEntity.refreshOn,
        key_id: atEntity.keyId,
        token_type: atEntity.tokenType,
        requestedClaims: atEntity.requestedClaims,
        requestedClaimsHash: atEntity.requestedClaimsHash,
        userAssertionHash: atEntity.userAssertionHash
      };
    });
    return accessTokens;
  }
  /**
   * Serialize refreshTokens
   * @param rtCache - cache of refresh tokens
   */
  static serializeRefreshTokens(rtCache) {
    const refreshTokens = {};
    Object.keys(rtCache).map(function(key) {
      const rtEntity = rtCache[key];
      refreshTokens[key] = {
        home_account_id: rtEntity.homeAccountId,
        environment: rtEntity.environment,
        credential_type: rtEntity.credentialType,
        client_id: rtEntity.clientId,
        secret: rtEntity.secret,
        family_id: rtEntity.familyId,
        target: rtEntity.target,
        realm: rtEntity.realm
      };
    });
    return refreshTokens;
  }
  /**
   * Serialize amdtCache
   * @param amdtCache - cache of app metadata
   */
  static serializeAppMetadata(amdtCache) {
    const appMetadata = {};
    Object.keys(amdtCache).map(function(key) {
      const amdtEntity = amdtCache[key];
      appMetadata[key] = {
        client_id: amdtEntity.clientId,
        environment: amdtEntity.environment,
        family_id: amdtEntity.familyId
      };
    });
    return appMetadata;
  }
  /**
   * Serialize the cache
   * @param inMemCache - itemised cache read from the JSON
   */
  static serializeAllCache(inMemCache) {
    return {
      Account: this.serializeAccounts(inMemCache.accounts),
      IdToken: this.serializeIdTokens(inMemCache.idTokens),
      AccessToken: this.serializeAccessTokens(inMemCache.accessTokens),
      RefreshToken: this.serializeRefreshTokens(inMemCache.refreshTokens),
      AppMetadata: this.serializeAppMetadata(inMemCache.appMetadata)
    };
  }
}
const Constants$1 = {
  LIBRARY_NAME: "MSAL.JS",
  SKU: "msal.js.common",
  // default authority
  DEFAULT_AUTHORITY: "https://login.microsoftonline.com/common/",
  DEFAULT_AUTHORITY_HOST: "login.microsoftonline.com",
  DEFAULT_COMMON_TENANT: "common",
  // ADFS String
  ADFS: "adfs",
  DSTS: "dstsv2",
  // Default AAD Instance Discovery Endpoint
  AAD_INSTANCE_DISCOVERY_ENDPT: "https://login.microsoftonline.com/common/discovery/instance?api-version=1.1&authorization_endpoint=",
  // CIAM URL
  CIAM_AUTH_URL: ".ciamlogin.com",
  AAD_TENANT_DOMAIN_SUFFIX: ".onmicrosoft.com",
  // Resource delimiter - used for certain cache entries
  RESOURCE_DELIM: "|",
  // Placeholder for non-existent account ids/objects
  NO_ACCOUNT: "NO_ACCOUNT",
  // Claims
  CLAIMS: "claims",
  // Consumer UTID
  CONSUMER_UTID: "9188040d-6c67-4c5b-b112-36a304b66dad",
  // Default scopes
  OPENID_SCOPE: "openid",
  PROFILE_SCOPE: "profile",
  OFFLINE_ACCESS_SCOPE: "offline_access",
  EMAIL_SCOPE: "email",
  CODE_GRANT_TYPE: "authorization_code",
  RT_GRANT_TYPE: "refresh_token",
  S256_CODE_CHALLENGE_METHOD: "S256",
  URL_FORM_CONTENT_TYPE: "application/x-www-form-urlencoded;charset=utf-8",
  AUTHORIZATION_PENDING: "authorization_pending",
  NOT_DEFINED: "not_defined",
  EMPTY_STRING: "",
  NOT_APPLICABLE: "N/A",
  NOT_AVAILABLE: "Not Available",
  FORWARD_SLASH: "/",
  IMDS_ENDPOINT: "http://169.254.169.254/metadata/instance/compute/location",
  IMDS_VERSION: "2020-06-01",
  IMDS_TIMEOUT: 2e3,
  AZURE_REGION_AUTO_DISCOVER_FLAG: "TryAutoDetect",
  REGIONAL_AUTH_PUBLIC_CLOUD_SUFFIX: "login.microsoft.com",
  KNOWN_PUBLIC_CLOUDS: [
    "login.microsoftonline.com",
    "login.windows.net",
    "login.microsoft.com",
    "sts.windows.net"
  ],
  SHR_NONCE_VALIDITY: 240,
  INVALID_INSTANCE: "invalid_instance"
};
const HttpStatus = {
  SUCCESS: 200,
  SUCCESS_RANGE_START: 200,
  SUCCESS_RANGE_END: 299,
  REDIRECT: 302,
  CLIENT_ERROR: 400,
  CLIENT_ERROR_RANGE_START: 400,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  REQUEST_TIMEOUT: 408,
  GONE: 410,
  TOO_MANY_REQUESTS: 429,
  CLIENT_ERROR_RANGE_END: 499,
  SERVER_ERROR: 500,
  SERVER_ERROR_RANGE_START: 500,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
  SERVER_ERROR_RANGE_END: 599,
  MULTI_SIDED_ERROR: 600
};
const OIDC_DEFAULT_SCOPES = [
  Constants$1.OPENID_SCOPE,
  Constants$1.PROFILE_SCOPE,
  Constants$1.OFFLINE_ACCESS_SCOPE
];
const OIDC_SCOPES = [...OIDC_DEFAULT_SCOPES, Constants$1.EMAIL_SCOPE];
const HeaderNames = {
  CONTENT_TYPE: "Content-Type",
  CONTENT_LENGTH: "Content-Length",
  RETRY_AFTER: "Retry-After",
  CCS_HEADER: "X-AnchorMailbox",
  WWWAuthenticate: "WWW-Authenticate",
  AuthenticationInfo: "Authentication-Info",
  X_MS_REQUEST_ID: "x-ms-request-id",
  X_MS_HTTP_VERSION: "x-ms-httpver"
};
const AADAuthorityConstants = {
  COMMON: "common",
  ORGANIZATIONS: "organizations",
  CONSUMERS: "consumers"
};
const ClaimsRequestKeys = {
  ACCESS_TOKEN: "access_token",
  XMS_CC: "xms_cc"
};
const PromptValue = {
  SELECT_ACCOUNT: "select_account",
  NONE: "none"
};
const CodeChallengeMethodValues = {
  PLAIN: "plain",
  S256: "S256"
};
const OAuthResponseType = {
  CODE: "code",
  IDTOKEN_TOKEN: "id_token token"
};
const ResponseMode = {
  QUERY: "query",
  FRAGMENT: "fragment",
  FORM_POST: "form_post"
};
const GrantType = {
  AUTHORIZATION_CODE_GRANT: "authorization_code",
  RESOURCE_OWNER_PASSWORD_GRANT: "password",
  REFRESH_TOKEN_GRANT: "refresh_token",
  DEVICE_CODE_GRANT: "device_code"
};
const CacheAccountType = {
  MSSTS_ACCOUNT_TYPE: "MSSTS",
  ADFS_ACCOUNT_TYPE: "ADFS",
  GENERIC_ACCOUNT_TYPE: "Generic"
  // NTLM, Kerberos, FBA, Basic etc
};
const Separators = {
  CACHE_KEY_SEPARATOR: "-",
  CLIENT_INFO_SEPARATOR: "."
};
const CredentialType = {
  ID_TOKEN: "IdToken",
  ACCESS_TOKEN: "AccessToken",
  ACCESS_TOKEN_WITH_AUTH_SCHEME: "AccessToken_With_AuthScheme",
  REFRESH_TOKEN: "RefreshToken"
};
const APP_METADATA = "appmetadata";
const CLIENT_INFO = "client_info";
const THE_FAMILY_ID = "1";
const AUTHORITY_METADATA_CONSTANTS = {
  CACHE_KEY: "authority-metadata",
  REFRESH_TIME_SECONDS: 3600 * 24
  // 24 Hours
};
const AuthorityMetadataSource = {
  CONFIG: "config",
  CACHE: "cache",
  NETWORK: "network",
  HARDCODED_VALUES: "hardcoded_values"
};
const SERVER_TELEM_CONSTANTS = {
  SCHEMA_VERSION: 5,
  MAX_LAST_HEADER_BYTES: 330,
  MAX_CACHED_ERRORS: 50,
  CACHE_KEY: "server-telemetry",
  CATEGORY_SEPARATOR: "|",
  VALUE_SEPARATOR: ",",
  OVERFLOW_TRUE: "1",
  OVERFLOW_FALSE: "0",
  UNKNOWN_ERROR: "unknown_error"
};
const AuthenticationScheme = {
  BEARER: "Bearer",
  POP: "pop",
  SSH: "ssh-cert"
};
const ThrottlingConstants = {
  // Default time to throttle RequestThumbprint in seconds
  DEFAULT_THROTTLE_TIME_SECONDS: 60,
  // Default maximum time to throttle in seconds, overrides what the server sends back
  DEFAULT_MAX_THROTTLE_TIME_SECONDS: 3600,
  // Prefix for storing throttling entries
  THROTTLING_PREFIX: "throttling",
  // Value assigned to the x-ms-lib-capability header to indicate to the server the library supports throttling
  X_MS_LIB_CAPABILITY_VALUE: "retry-after, h429"
};
const Errors = {
  INVALID_GRANT_ERROR: "invalid_grant",
  CLIENT_MISMATCH_ERROR: "client_mismatch"
};
const PasswordGrantConstants = {
  username: "username",
  password: "password"
};
const RegionDiscoverySources = {
  FAILED_AUTO_DETECTION: "1",
  INTERNAL_CACHE: "2",
  ENVIRONMENT_VARIABLE: "3",
  IMDS: "4"
};
const RegionDiscoveryOutcomes = {
  CONFIGURED_NO_AUTO_DETECTION: "2",
  AUTO_DETECTION_REQUESTED_SUCCESSFUL: "4",
  AUTO_DETECTION_REQUESTED_FAILED: "5"
};
const CacheOutcome = {
  // When a token is found in the cache or the cache is not supposed to be hit when making the request
  NOT_APPLICABLE: "0",
  // When the token request goes to the identity provider because force_refresh was set to true. Also occurs if claims were requested
  FORCE_REFRESH_OR_CLAIMS: "1",
  // When the token request goes to the identity provider because no cached access token exists
  NO_CACHED_ACCESS_TOKEN: "2",
  // When the token request goes to the identity provider because cached access token expired
  CACHED_ACCESS_TOKEN_EXPIRED: "3",
  // When the token request goes to the identity provider because refresh_in was used and the existing token needs to be refreshed
  PROACTIVELY_REFRESHED: "4"
};
const DEFAULT_TOKEN_RENEWAL_OFFSET_SEC = 300;
const EncodingTypes = {
  BASE64: "base64",
  HEX: "hex"
};
const unexpectedError = "unexpected_error";
const postRequestFailed = "post_request_failed";
const AuthErrorMessages = {
  [unexpectedError]: "Unexpected error in authentication.",
  [postRequestFailed]: "Post request failed from the network, could be a 4xx/5xx or a network unavailability. Please check the exact error code for details."
};
class AuthError extends Error {
  constructor(errorCode, errorMessage, suberror) {
    const errorString = errorMessage ? `${errorCode}: ${errorMessage}` : errorCode;
    super(errorString);
    Object.setPrototypeOf(this, AuthError.prototype);
    this.errorCode = errorCode || Constants$1.EMPTY_STRING;
    this.errorMessage = errorMessage || Constants$1.EMPTY_STRING;
    this.subError = suberror || Constants$1.EMPTY_STRING;
    this.name = "AuthError";
  }
  setCorrelationId(correlationId) {
    this.correlationId = correlationId;
  }
}
function createAuthError(code, additionalMessage) {
  return new AuthError(code, additionalMessage ? `${AuthErrorMessages[code]} ${additionalMessage}` : AuthErrorMessages[code]);
}
const clientInfoDecodingError = "client_info_decoding_error";
const clientInfoEmptyError = "client_info_empty_error";
const tokenParsingError = "token_parsing_error";
const nullOrEmptyToken = "null_or_empty_token";
const endpointResolutionError = "endpoints_resolution_error";
const networkError = "network_error";
const openIdConfigError = "openid_config_error";
const hashNotDeserialized = "hash_not_deserialized";
const invalidState = "invalid_state";
const stateMismatch = "state_mismatch";
const stateNotFound = "state_not_found";
const nonceMismatch = "nonce_mismatch";
const authTimeNotFound = "auth_time_not_found";
const maxAgeTranspired = "max_age_transpired";
const multipleMatchingTokens = "multiple_matching_tokens";
const multipleMatchingAccounts = "multiple_matching_accounts";
const multipleMatchingAppMetadata = "multiple_matching_appMetadata";
const requestCannotBeMade = "request_cannot_be_made";
const cannotRemoveEmptyScope = "cannot_remove_empty_scope";
const cannotAppendScopeSet = "cannot_append_scopeset";
const emptyInputScopeSet = "empty_input_scopeset";
const deviceCodePollingCancelled = "device_code_polling_cancelled";
const deviceCodeExpired = "device_code_expired";
const deviceCodeUnknownError = "device_code_unknown_error";
const noAccountInSilentRequest = "no_account_in_silent_request";
const invalidCacheRecord = "invalid_cache_record";
const invalidCacheEnvironment = "invalid_cache_environment";
const noAccountFound = "no_account_found";
const noCryptoObject = "no_crypto_object";
const unexpectedCredentialType = "unexpected_credential_type";
const invalidAssertion = "invalid_assertion";
const invalidClientCredential = "invalid_client_credential";
const tokenRefreshRequired = "token_refresh_required";
const userTimeoutReached = "user_timeout_reached";
const tokenClaimsCnfRequiredForSignedJwt = "token_claims_cnf_required_for_signedjwt";
const authorizationCodeMissingFromServerResponse = "authorization_code_missing_from_server_response";
const bindingKeyNotRemoved = "binding_key_not_removed";
const endSessionEndpointNotSupported = "end_session_endpoint_not_supported";
const keyIdMissing = "key_id_missing";
const noNetworkConnectivity = "no_network_connectivity";
const userCanceled = "user_canceled";
const missingTenantIdError = "missing_tenant_id_error";
const methodNotImplemented = "method_not_implemented";
const nestedAppAuthBridgeDisabled = "nested_app_auth_bridge_disabled";
const platformBrokerError = "platform_broker_error";
const ClientAuthErrorMessages = {
  [clientInfoDecodingError]: "The client info could not be parsed/decoded correctly",
  [clientInfoEmptyError]: "The client info was empty",
  [tokenParsingError]: "Token cannot be parsed",
  [nullOrEmptyToken]: "The token is null or empty",
  [endpointResolutionError]: "Endpoints cannot be resolved",
  [networkError]: "Network request failed",
  [openIdConfigError]: "Could not retrieve endpoints. Check your authority and verify the .well-known/openid-configuration endpoint returns the required endpoints.",
  [hashNotDeserialized]: "The hash parameters could not be deserialized",
  [invalidState]: "State was not the expected format",
  [stateMismatch]: "State mismatch error",
  [stateNotFound]: "State not found",
  [nonceMismatch]: "Nonce mismatch error",
  [authTimeNotFound]: "Max Age was requested and the ID token is missing the auth_time variable. auth_time is an optional claim and is not enabled by default - it must be enabled. See https://aka.ms/msaljs/optional-claims for more information.",
  [maxAgeTranspired]: "Max Age is set to 0, or too much time has elapsed since the last end-user authentication.",
  [multipleMatchingTokens]: "The cache contains multiple tokens satisfying the requirements. Call AcquireToken again providing more requirements such as authority or account.",
  [multipleMatchingAccounts]: "The cache contains multiple accounts satisfying the given parameters. Please pass more info to obtain the correct account",
  [multipleMatchingAppMetadata]: "The cache contains multiple appMetadata satisfying the given parameters. Please pass more info to obtain the correct appMetadata",
  [requestCannotBeMade]: "Token request cannot be made without authorization code or refresh token.",
  [cannotRemoveEmptyScope]: "Cannot remove null or empty scope from ScopeSet",
  [cannotAppendScopeSet]: "Cannot append ScopeSet",
  [emptyInputScopeSet]: "Empty input ScopeSet cannot be processed",
  [deviceCodePollingCancelled]: "Caller has cancelled token endpoint polling during device code flow by setting DeviceCodeRequest.cancel = true.",
  [deviceCodeExpired]: "Device code is expired.",
  [deviceCodeUnknownError]: "Device code stopped polling for unknown reasons.",
  [noAccountInSilentRequest]: "Please pass an account object, silent flow is not supported without account information",
  [invalidCacheRecord]: "Cache record object was null or undefined.",
  [invalidCacheEnvironment]: "Invalid environment when attempting to create cache entry",
  [noAccountFound]: "No account found in cache for given key.",
  [noCryptoObject]: "No crypto object detected.",
  [unexpectedCredentialType]: "Unexpected credential type.",
  [invalidAssertion]: "Client assertion must meet requirements described in https://tools.ietf.org/html/rfc7515",
  [invalidClientCredential]: "Client credential (secret, certificate, or assertion) must not be empty when creating a confidential client. An application should at most have one credential",
  [tokenRefreshRequired]: "Cannot return token from cache because it must be refreshed. This may be due to one of the following reasons: forceRefresh parameter is set to true, claims have been requested, there is no cached access token or it is expired.",
  [userTimeoutReached]: "User defined timeout for device code polling reached",
  [tokenClaimsCnfRequiredForSignedJwt]: "Cannot generate a POP jwt if the token_claims are not populated",
  [authorizationCodeMissingFromServerResponse]: "Server response does not contain an authorization code to proceed",
  [bindingKeyNotRemoved]: "Could not remove the credential's binding key from storage.",
  [endSessionEndpointNotSupported]: "The provided authority does not support logout",
  [keyIdMissing]: "A keyId value is missing from the requested bound token's cache record and is required to match the token to it's stored binding key.",
  [noNetworkConnectivity]: "No network connectivity. Check your internet connection.",
  [userCanceled]: "User cancelled the flow.",
  [missingTenantIdError]: "A tenant id - not common, organizations, or consumers - must be specified when using the client_credentials flow.",
  [methodNotImplemented]: "This method has not been implemented",
  [nestedAppAuthBridgeDisabled]: "The nested app auth bridge is disabled",
  [platformBrokerError]: "An error occurred in the native broker. See the platformBrokerError property for details."
};
class ClientAuthError extends AuthError {
  constructor(errorCode, additionalMessage) {
    super(errorCode, additionalMessage ? `${ClientAuthErrorMessages[errorCode]}: ${additionalMessage}` : ClientAuthErrorMessages[errorCode]);
    this.name = "ClientAuthError";
    Object.setPrototypeOf(this, ClientAuthError.prototype);
  }
}
function createClientAuthError(errorCode, additionalMessage) {
  return new ClientAuthError(errorCode, additionalMessage);
}
const DEFAULT_CRYPTO_IMPLEMENTATION = {
  createNewGuid: () => {
    throw createClientAuthError(methodNotImplemented);
  },
  base64Decode: () => {
    throw createClientAuthError(methodNotImplemented);
  },
  base64Encode: () => {
    throw createClientAuthError(methodNotImplemented);
  },
  base64UrlEncode: () => {
    throw createClientAuthError(methodNotImplemented);
  },
  encodeKid: () => {
    throw createClientAuthError(methodNotImplemented);
  },
  async getPublicKeyThumbprint() {
    throw createClientAuthError(methodNotImplemented);
  },
  async removeTokenBindingKey() {
    throw createClientAuthError(methodNotImplemented);
  },
  async clearKeystore() {
    throw createClientAuthError(methodNotImplemented);
  },
  async signJwt() {
    throw createClientAuthError(methodNotImplemented);
  },
  async hashString() {
    throw createClientAuthError(methodNotImplemented);
  }
};
var LogLevel;
(function(LogLevel2) {
  LogLevel2[LogLevel2["Error"] = 0] = "Error";
  LogLevel2[LogLevel2["Warning"] = 1] = "Warning";
  LogLevel2[LogLevel2["Info"] = 2] = "Info";
  LogLevel2[LogLevel2["Verbose"] = 3] = "Verbose";
  LogLevel2[LogLevel2["Trace"] = 4] = "Trace";
})(LogLevel || (LogLevel = {}));
class Logger {
  constructor(loggerOptions, packageName, packageVersion) {
    this.level = LogLevel.Info;
    const defaultLoggerCallback = () => {
      return;
    };
    const setLoggerOptions = loggerOptions || Logger.createDefaultLoggerOptions();
    this.localCallback = setLoggerOptions.loggerCallback || defaultLoggerCallback;
    this.piiLoggingEnabled = setLoggerOptions.piiLoggingEnabled || false;
    this.level = typeof setLoggerOptions.logLevel === "number" ? setLoggerOptions.logLevel : LogLevel.Info;
    this.correlationId = setLoggerOptions.correlationId || Constants$1.EMPTY_STRING;
    this.packageName = packageName || Constants$1.EMPTY_STRING;
    this.packageVersion = packageVersion || Constants$1.EMPTY_STRING;
  }
  static createDefaultLoggerOptions() {
    return {
      loggerCallback: () => {
      },
      piiLoggingEnabled: false,
      logLevel: LogLevel.Info
    };
  }
  /**
   * Create new Logger with existing configurations.
   */
  clone(packageName, packageVersion, correlationId) {
    return new Logger({
      loggerCallback: this.localCallback,
      piiLoggingEnabled: this.piiLoggingEnabled,
      logLevel: this.level,
      correlationId: correlationId || this.correlationId
    }, packageName, packageVersion);
  }
  /**
   * Log message with required options.
   */
  logMessage(logMessage, options) {
    if (options.logLevel > this.level || !this.piiLoggingEnabled && options.containsPii) {
      return;
    }
    const timestamp = (/* @__PURE__ */ new Date()).toUTCString();
    const logHeader = `[${timestamp}] : [${options.correlationId || this.correlationId || ""}]`;
    const log = `${logHeader} : ${this.packageName}@${this.packageVersion} : ${LogLevel[options.logLevel]} - ${logMessage}`;
    this.executeCallback(options.logLevel, log, options.containsPii || false);
  }
  /**
   * Execute callback with message.
   */
  executeCallback(level, message, containsPii) {
    if (this.localCallback) {
      this.localCallback(level, message, containsPii);
    }
  }
  /**
   * Logs error messages.
   */
  error(message, correlationId) {
    this.logMessage(message, {
      logLevel: LogLevel.Error,
      containsPii: false,
      correlationId: correlationId || Constants$1.EMPTY_STRING
    });
  }
  /**
   * Logs error messages with PII.
   */
  errorPii(message, correlationId) {
    this.logMessage(message, {
      logLevel: LogLevel.Error,
      containsPii: true,
      correlationId: correlationId || Constants$1.EMPTY_STRING
    });
  }
  /**
   * Logs warning messages.
   */
  warning(message, correlationId) {
    this.logMessage(message, {
      logLevel: LogLevel.Warning,
      containsPii: false,
      correlationId: correlationId || Constants$1.EMPTY_STRING
    });
  }
  /**
   * Logs warning messages with PII.
   */
  warningPii(message, correlationId) {
    this.logMessage(message, {
      logLevel: LogLevel.Warning,
      containsPii: true,
      correlationId: correlationId || Constants$1.EMPTY_STRING
    });
  }
  /**
   * Logs info messages.
   */
  info(message, correlationId) {
    this.logMessage(message, {
      logLevel: LogLevel.Info,
      containsPii: false,
      correlationId: correlationId || Constants$1.EMPTY_STRING
    });
  }
  /**
   * Logs info messages with PII.
   */
  infoPii(message, correlationId) {
    this.logMessage(message, {
      logLevel: LogLevel.Info,
      containsPii: true,
      correlationId: correlationId || Constants$1.EMPTY_STRING
    });
  }
  /**
   * Logs verbose messages.
   */
  verbose(message, correlationId) {
    this.logMessage(message, {
      logLevel: LogLevel.Verbose,
      containsPii: false,
      correlationId: correlationId || Constants$1.EMPTY_STRING
    });
  }
  /**
   * Logs verbose messages with PII.
   */
  verbosePii(message, correlationId) {
    this.logMessage(message, {
      logLevel: LogLevel.Verbose,
      containsPii: true,
      correlationId: correlationId || Constants$1.EMPTY_STRING
    });
  }
  /**
   * Logs trace messages.
   */
  trace(message, correlationId) {
    this.logMessage(message, {
      logLevel: LogLevel.Trace,
      containsPii: false,
      correlationId: correlationId || Constants$1.EMPTY_STRING
    });
  }
  /**
   * Logs trace messages with PII.
   */
  tracePii(message, correlationId) {
    this.logMessage(message, {
      logLevel: LogLevel.Trace,
      containsPii: true,
      correlationId: correlationId || Constants$1.EMPTY_STRING
    });
  }
  /**
   * Returns whether PII Logging is enabled or not.
   */
  isPiiLoggingEnabled() {
    return this.piiLoggingEnabled || false;
  }
}
const name$1 = "@azure/msal-common";
const version$1 = "15.17.0";
const AzureCloudInstance = {
  // AzureCloudInstance is not specified.
  None: "none"
};
const redirectUriEmpty = "redirect_uri_empty";
const claimsRequestParsingError = "claims_request_parsing_error";
const authorityUriInsecure = "authority_uri_insecure";
const urlParseError = "url_parse_error";
const urlEmptyError = "empty_url_error";
const emptyInputScopesError = "empty_input_scopes_error";
const invalidClaims = "invalid_claims";
const tokenRequestEmpty = "token_request_empty";
const logoutRequestEmpty = "logout_request_empty";
const invalidCodeChallengeMethod = "invalid_code_challenge_method";
const pkceParamsMissing = "pkce_params_missing";
const invalidCloudDiscoveryMetadata = "invalid_cloud_discovery_metadata";
const invalidAuthorityMetadata = "invalid_authority_metadata";
const untrustedAuthority = "untrusted_authority";
const missingSshJwk = "missing_ssh_jwk";
const missingSshKid = "missing_ssh_kid";
const missingNonceAuthenticationHeader = "missing_nonce_authentication_header";
const invalidAuthenticationHeader = "invalid_authentication_header";
const cannotSetOIDCOptions = "cannot_set_OIDCOptions";
const cannotAllowPlatformBroker = "cannot_allow_platform_broker";
const authorityMismatch = "authority_mismatch";
const invalidRequestMethodForEAR = "invalid_request_method_for_EAR";
const invalidAuthorizePostBodyParameters = "invalid_authorize_post_body_parameters";
const invalidPlatformBrokerConfiguration = "invalid_platform_broker_configuration";
const ClientConfigurationErrorMessages = {
  [redirectUriEmpty]: "A redirect URI is required for all calls, and none has been set.",
  [claimsRequestParsingError]: "Could not parse the given claims request object.",
  [authorityUriInsecure]: "Authority URIs must use https.  Please see here for valid authority configuration options: https://docs.microsoft.com/en-us/azure/active-directory/develop/msal-js-initializing-client-applications#configuration-options",
  [urlParseError]: "URL could not be parsed into appropriate segments.",
  [urlEmptyError]: "URL was empty or null.",
  [emptyInputScopesError]: "Scopes cannot be passed as null, undefined or empty array because they are required to obtain an access token.",
  [invalidClaims]: "Given claims parameter must be a stringified JSON object.",
  [tokenRequestEmpty]: "Token request was empty and not found in cache.",
  [logoutRequestEmpty]: "The logout request was null or undefined.",
  [invalidCodeChallengeMethod]: 'code_challenge_method passed is invalid. Valid values are "plain" and "S256".',
  [pkceParamsMissing]: "Both params: code_challenge and code_challenge_method are to be passed if to be sent in the request",
  [invalidCloudDiscoveryMetadata]: "Invalid cloudDiscoveryMetadata provided. Must be a stringified JSON object containing tenant_discovery_endpoint and metadata fields",
  [invalidAuthorityMetadata]: "Invalid authorityMetadata provided. Must by a stringified JSON object containing authorization_endpoint, token_endpoint, issuer fields.",
  [untrustedAuthority]: "The provided authority is not a trusted authority. Please include this authority in the knownAuthorities config parameter.",
  [missingSshJwk]: "Missing sshJwk in SSH certificate request. A stringified JSON Web Key is required when using the SSH authentication scheme.",
  [missingSshKid]: "Missing sshKid in SSH certificate request. A string that uniquely identifies the public SSH key is required when using the SSH authentication scheme.",
  [missingNonceAuthenticationHeader]: "Unable to find an authentication header containing server nonce. Either the Authentication-Info or WWW-Authenticate headers must be present in order to obtain a server nonce.",
  [invalidAuthenticationHeader]: "Invalid authentication header provided",
  [cannotSetOIDCOptions]: "Cannot set OIDCOptions parameter. Please change the protocol mode to OIDC or use a non-Microsoft authority.",
  [cannotAllowPlatformBroker]: "Cannot set allowPlatformBroker parameter to true when not in AAD protocol mode.",
  [authorityMismatch]: "Authority mismatch error. Authority provided in login request or PublicClientApplication config does not match the environment of the provided account. Please use a matching account or make an interactive request to login to this authority.",
  [invalidAuthorizePostBodyParameters]: "Invalid authorize post body parameters provided. If you are using authorizePostBodyParameters, the request method must be POST. Please check the request method and parameters.",
  [invalidRequestMethodForEAR]: "Invalid request method for EAR protocol mode. The request method cannot be GET when using EAR protocol mode. Please change the request method to POST.",
  [invalidPlatformBrokerConfiguration]: "Invalid platform broker configuration. `allowPlatformBrokerWithDOM` can only be enabled when `allowPlatformBroker` is enabled."
};
class ClientConfigurationError extends AuthError {
  constructor(errorCode) {
    super(errorCode, ClientConfigurationErrorMessages[errorCode]);
    this.name = "ClientConfigurationError";
    Object.setPrototypeOf(this, ClientConfigurationError.prototype);
  }
}
function createClientConfigurationError(errorCode) {
  return new ClientConfigurationError(errorCode);
}
class StringUtils {
  /**
   * Check if stringified object is empty
   * @param strObj
   */
  static isEmptyObj(strObj) {
    if (strObj) {
      try {
        const obj = JSON.parse(strObj);
        return Object.keys(obj).length === 0;
      } catch (e) {
      }
    }
    return true;
  }
  static startsWith(str, search) {
    return str.indexOf(search) === 0;
  }
  static endsWith(str, search) {
    return str.length >= search.length && str.lastIndexOf(search) === str.length - search.length;
  }
  /**
   * Parses string into an object.
   *
   * @param query
   */
  static queryStringToObject(query) {
    const obj = {};
    const params = query.split("&");
    const decode2 = (s) => decodeURIComponent(s.replace(/\+/g, " "));
    params.forEach((pair) => {
      if (pair.trim()) {
        const [key, value] = pair.split(/=(.+)/g, 2);
        if (key && value) {
          obj[decode2(key)] = decode2(value);
        }
      }
    });
    return obj;
  }
  /**
   * Trims entries in an array.
   *
   * @param arr
   */
  static trimArrayEntries(arr) {
    return arr.map((entry) => entry.trim());
  }
  /**
   * Removes empty strings from array
   * @param arr
   */
  static removeEmptyStringsFromArray(arr) {
    return arr.filter((entry) => {
      return !!entry;
    });
  }
  /**
   * Attempts to parse a string into JSON
   * @param str
   */
  static jsonParseHelper(str) {
    try {
      return JSON.parse(str);
    } catch (e) {
      return null;
    }
  }
  /**
   * Tests if a given string matches a given pattern, with support for wildcards and queries.
   * @param pattern Wildcard pattern to string match. Supports "*" for wildcards and "?" for queries
   * @param input String to match against
   */
  static matchPattern(pattern, input) {
    const regex = new RegExp(pattern.replace(/\\/g, "\\\\").replace(/\*/g, "[^ ]*").replace(/\?/g, "\\?"));
    return regex.test(input);
  }
  /**
   * Tests if a given string matches a given pattern using stricter, anchored matching semantics.
   *
   * Differences from `matchPattern` (legacy):
   * - All regex metacharacters (including `.`) in the pattern are treated as literals,
   *   so `example.com` matches only `example.com` and not `exampleXcom`.
   * - The generated regex is anchored with `^` and `$` so partial/substring matches
   *   are not allowed.
   * - `*` is the only supported wildcard. Its behaviour depends on the URL component:
   *   - `host` component: `*` matches any sequence of characters that does NOT include
   *     a dot (`.`), keeping wildcards within a single DNS label boundary.
   *   - All other components: `*` matches any sequence of characters (including `/`).
   *
   * @param pattern - The `protectedResourceMap` key pattern to match against. `*` is a
   *   multi-character wildcard; all other characters are treated as literals.
   * @param input - The URL component value (e.g. host, pathname) extracted from the
   *   outgoing request URL to test against the pattern.
   * @param options - Optional. Provide `component` to enable component-aware wildcard
   *   semantics. Accepted values: `"host"`, `"path"`, `"protocol"`, `"search"`,
   *   `"hash"`. Defaults to path-style (permissive) matching when omitted.
   * @returns `true` if the full input string matches the pattern; `false` otherwise.
   */
  static matchPatternStrict(pattern, input, options) {
    const component = options?.component;
    let regexBody = pattern.replace(/[.+^${}()|[\]\\*?]/g, "\\$&");
    if (component === "host") {
      regexBody = regexBody.replace(/\\\*/g, "[^.]*");
    } else {
      regexBody = regexBody.replace(/\\\*/g, ".*");
    }
    const regex = new RegExp(`^${regexBody}$`);
    return regex.test(input);
  }
}
class ScopeSet {
  constructor(inputScopes) {
    const scopeArr = inputScopes ? StringUtils.trimArrayEntries([...inputScopes]) : [];
    const filteredInput = scopeArr ? StringUtils.removeEmptyStringsFromArray(scopeArr) : [];
    if (!filteredInput || !filteredInput.length) {
      throw createClientConfigurationError(emptyInputScopesError);
    }
    this.scopes = /* @__PURE__ */ new Set();
    filteredInput.forEach((scope) => this.scopes.add(scope));
  }
  /**
   * Factory method to create ScopeSet from space-delimited string
   * @param inputScopeString
   * @param appClientId
   * @param scopesRequired
   */
  static fromString(inputScopeString) {
    const scopeString = inputScopeString || Constants$1.EMPTY_STRING;
    const inputScopes = scopeString.split(" ");
    return new ScopeSet(inputScopes);
  }
  /**
   * Creates the set of scopes to search for in cache lookups
   * @param inputScopeString
   * @returns
   */
  static createSearchScopes(inputScopeString) {
    const scopesToUse = inputScopeString && inputScopeString.length > 0 ? inputScopeString : [...OIDC_DEFAULT_SCOPES];
    const scopeSet = new ScopeSet(scopesToUse);
    if (!scopeSet.containsOnlyOIDCScopes()) {
      scopeSet.removeOIDCScopes();
    } else {
      scopeSet.removeScope(Constants$1.OFFLINE_ACCESS_SCOPE);
    }
    return scopeSet;
  }
  /**
   * Check if a given scope is present in this set of scopes.
   * @param scope
   */
  containsScope(scope) {
    const lowerCaseScopes = this.printScopesLowerCase().split(" ");
    const lowerCaseScopesSet = new ScopeSet(lowerCaseScopes);
    return scope ? lowerCaseScopesSet.scopes.has(scope.toLowerCase()) : false;
  }
  /**
   * Check if a set of scopes is present in this set of scopes.
   * @param scopeSet
   */
  containsScopeSet(scopeSet) {
    if (!scopeSet || scopeSet.scopes.size <= 0) {
      return false;
    }
    return this.scopes.size >= scopeSet.scopes.size && scopeSet.asArray().every((scope) => this.containsScope(scope));
  }
  /**
   * Check if set of scopes contains only the defaults
   */
  containsOnlyOIDCScopes() {
    let defaultScopeCount = 0;
    OIDC_SCOPES.forEach((defaultScope) => {
      if (this.containsScope(defaultScope)) {
        defaultScopeCount += 1;
      }
    });
    return this.scopes.size === defaultScopeCount;
  }
  /**
   * Appends single scope if passed
   * @param newScope
   */
  appendScope(newScope) {
    if (newScope) {
      this.scopes.add(newScope.trim());
    }
  }
  /**
   * Appends multiple scopes if passed
   * @param newScopes
   */
  appendScopes(newScopes) {
    try {
      newScopes.forEach((newScope) => this.appendScope(newScope));
    } catch (e) {
      throw createClientAuthError(cannotAppendScopeSet);
    }
  }
  /**
   * Removes element from set of scopes.
   * @param scope
   */
  removeScope(scope) {
    if (!scope) {
      throw createClientAuthError(cannotRemoveEmptyScope);
    }
    this.scopes.delete(scope.trim());
  }
  /**
   * Removes default scopes from set of scopes
   * Primarily used to prevent cache misses if the default scopes are not returned from the server
   */
  removeOIDCScopes() {
    OIDC_SCOPES.forEach((defaultScope) => {
      this.scopes.delete(defaultScope);
    });
  }
  /**
   * Combines an array of scopes with the current set of scopes.
   * @param otherScopes
   */
  unionScopeSets(otherScopes) {
    if (!otherScopes) {
      throw createClientAuthError(emptyInputScopeSet);
    }
    const unionScopes = /* @__PURE__ */ new Set();
    otherScopes.scopes.forEach((scope) => unionScopes.add(scope.toLowerCase()));
    this.scopes.forEach((scope) => unionScopes.add(scope.toLowerCase()));
    return unionScopes;
  }
  /**
   * Check if scopes intersect between this set and another.
   * @param otherScopes
   */
  intersectingScopeSets(otherScopes) {
    if (!otherScopes) {
      throw createClientAuthError(emptyInputScopeSet);
    }
    if (!otherScopes.containsOnlyOIDCScopes()) {
      otherScopes.removeOIDCScopes();
    }
    const unionScopes = this.unionScopeSets(otherScopes);
    const sizeOtherScopes = otherScopes.getScopeCount();
    const sizeThisScopes = this.getScopeCount();
    const sizeUnionScopes = unionScopes.size;
    return sizeUnionScopes < sizeThisScopes + sizeOtherScopes;
  }
  /**
   * Returns size of set of scopes.
   */
  getScopeCount() {
    return this.scopes.size;
  }
  /**
   * Returns the scopes as an array of string values
   */
  asArray() {
    const array = [];
    this.scopes.forEach((val) => array.push(val));
    return array;
  }
  /**
   * Prints scopes into a space-delimited string
   */
  printScopes() {
    if (this.scopes) {
      const scopeArr = this.asArray();
      return scopeArr.join(" ");
    }
    return Constants$1.EMPTY_STRING;
  }
  /**
   * Prints scopes into a space-delimited lower-case string (used for caching)
   */
  printScopesLowerCase() {
    return this.printScopes().toLowerCase();
  }
}
function buildClientInfo(rawClientInfo, base64Decode) {
  if (!rawClientInfo) {
    throw createClientAuthError(clientInfoEmptyError);
  }
  try {
    const decodedClientInfo = base64Decode(rawClientInfo);
    return JSON.parse(decodedClientInfo);
  } catch (e) {
    throw createClientAuthError(clientInfoDecodingError);
  }
}
function buildClientInfoFromHomeAccountId(homeAccountId) {
  if (!homeAccountId) {
    throw createClientAuthError(clientInfoDecodingError);
  }
  const clientInfoParts = homeAccountId.split(Separators.CLIENT_INFO_SEPARATOR, 2);
  return {
    uid: clientInfoParts[0],
    utid: clientInfoParts.length < 2 ? Constants$1.EMPTY_STRING : clientInfoParts[1]
  };
}
function tenantIdMatchesHomeTenant(tenantId, homeAccountId) {
  return !!tenantId && !!homeAccountId && tenantId === homeAccountId.split(".")[1];
}
function buildTenantProfile(homeAccountId, localAccountId, tenantId, idTokenClaims) {
  if (idTokenClaims) {
    const { oid, sub, tid, name: name2, tfp, acr, preferred_username, upn, login_hint } = idTokenClaims;
    const tenantId2 = tid || tfp || acr || "";
    return {
      tenantId: tenantId2,
      localAccountId: oid || sub || "",
      name: name2,
      username: preferred_username || upn || "",
      loginHint: login_hint,
      isHomeTenant: tenantIdMatchesHomeTenant(tenantId2, homeAccountId)
    };
  } else {
    return {
      tenantId,
      localAccountId,
      username: "",
      isHomeTenant: tenantIdMatchesHomeTenant(tenantId, homeAccountId)
    };
  }
}
function updateAccountTenantProfileData(baseAccountInfo, tenantProfile, idTokenClaims, idTokenSecret) {
  let updatedAccountInfo = baseAccountInfo;
  if (tenantProfile) {
    const { isHomeTenant, ...tenantProfileOverride } = tenantProfile;
    updatedAccountInfo = { ...baseAccountInfo, ...tenantProfileOverride };
  }
  if (idTokenClaims) {
    const { isHomeTenant, ...claimsSourcedTenantProfile } = buildTenantProfile(baseAccountInfo.homeAccountId, baseAccountInfo.localAccountId, baseAccountInfo.tenantId, idTokenClaims);
    updatedAccountInfo = {
      ...updatedAccountInfo,
      ...claimsSourcedTenantProfile,
      idTokenClaims,
      idToken: idTokenSecret
    };
    return updatedAccountInfo;
  }
  return updatedAccountInfo;
}
const AuthorityType = {
  Default: 0,
  Adfs: 1,
  Dsts: 2,
  Ciam: 3
};
function getTenantIdFromIdTokenClaims(idTokenClaims) {
  if (idTokenClaims) {
    const tenantId = idTokenClaims.tid || idTokenClaims.tfp || idTokenClaims.acr;
    return tenantId || null;
  }
  return null;
}
const ProtocolMode = {
  /**
   * Auth Code + PKCE with Entra ID (formerly AAD) specific optimizations and features
   */
  AAD: "AAD",
  /**
   * Auth Code + PKCE without Entra ID specific optimizations and features. For use only with non-Microsoft owned authorities.
   * Support is limited for this mode.
   */
  OIDC: "OIDC"
};
class AccountEntity {
  /**
   * Returns the AccountInfo interface for this account.
   */
  static getAccountInfo(accountEntity) {
    const tenantProfiles = accountEntity.tenantProfiles || [];
    if (tenantProfiles.length === 0 && accountEntity.realm && accountEntity.localAccountId) {
      tenantProfiles.push(buildTenantProfile(accountEntity.homeAccountId, accountEntity.localAccountId, accountEntity.realm));
    }
    return {
      homeAccountId: accountEntity.homeAccountId,
      environment: accountEntity.environment,
      tenantId: accountEntity.realm,
      username: accountEntity.username,
      localAccountId: accountEntity.localAccountId,
      loginHint: accountEntity.loginHint,
      name: accountEntity.name,
      nativeAccountId: accountEntity.nativeAccountId,
      authorityType: accountEntity.authorityType,
      // Deserialize tenant profiles array into a Map
      tenantProfiles: new Map(tenantProfiles.map((tenantProfile) => {
        return [tenantProfile.tenantId, tenantProfile];
      })),
      dataBoundary: accountEntity.dataBoundary
    };
  }
  /**
   * Returns true if the account entity is in single tenant format (outdated), false otherwise
   */
  isSingleTenant() {
    return !this.tenantProfiles;
  }
  /**
   * Build Account cache from IdToken, clientInfo and authority/policy. Associated with AAD.
   * @param accountDetails
   */
  static createAccount(accountDetails, authority, base64Decode) {
    const account = new AccountEntity();
    if (authority.authorityType === AuthorityType.Adfs) {
      account.authorityType = CacheAccountType.ADFS_ACCOUNT_TYPE;
    } else if (authority.protocolMode === ProtocolMode.OIDC) {
      account.authorityType = CacheAccountType.GENERIC_ACCOUNT_TYPE;
    } else {
      account.authorityType = CacheAccountType.MSSTS_ACCOUNT_TYPE;
    }
    let clientInfo;
    if (accountDetails.clientInfo && base64Decode) {
      clientInfo = buildClientInfo(accountDetails.clientInfo, base64Decode);
      if (clientInfo.xms_tdbr) {
        account.dataBoundary = clientInfo.xms_tdbr === "EU" ? "EU" : "None";
      }
    }
    account.clientInfo = accountDetails.clientInfo;
    account.homeAccountId = accountDetails.homeAccountId;
    account.nativeAccountId = accountDetails.nativeAccountId;
    const env = accountDetails.environment || authority && authority.getPreferredCache();
    if (!env) {
      throw createClientAuthError(invalidCacheEnvironment);
    }
    account.environment = env;
    account.realm = clientInfo?.utid || getTenantIdFromIdTokenClaims(accountDetails.idTokenClaims) || "";
    account.localAccountId = clientInfo?.uid || accountDetails.idTokenClaims?.oid || accountDetails.idTokenClaims?.sub || "";
    const preferredUsername = accountDetails.idTokenClaims?.preferred_username || accountDetails.idTokenClaims?.upn;
    const email = accountDetails.idTokenClaims?.emails ? accountDetails.idTokenClaims.emails[0] : null;
    account.username = preferredUsername || email || "";
    account.loginHint = accountDetails.idTokenClaims?.login_hint;
    account.name = accountDetails.idTokenClaims?.name || "";
    account.cloudGraphHostName = accountDetails.cloudGraphHostName;
    account.msGraphHost = accountDetails.msGraphHost;
    if (accountDetails.tenantProfiles) {
      account.tenantProfiles = accountDetails.tenantProfiles;
    } else {
      const tenantProfile = buildTenantProfile(accountDetails.homeAccountId, account.localAccountId, account.realm, accountDetails.idTokenClaims);
      account.tenantProfiles = [tenantProfile];
    }
    return account;
  }
  /**
   * Creates an AccountEntity object from AccountInfo
   * @param accountInfo
   * @param cloudGraphHostName
   * @param msGraphHost
   * @returns
   */
  static createFromAccountInfo(accountInfo, cloudGraphHostName, msGraphHost) {
    const account = new AccountEntity();
    account.authorityType = accountInfo.authorityType || CacheAccountType.GENERIC_ACCOUNT_TYPE;
    account.homeAccountId = accountInfo.homeAccountId;
    account.localAccountId = accountInfo.localAccountId;
    account.nativeAccountId = accountInfo.nativeAccountId;
    account.realm = accountInfo.tenantId;
    account.environment = accountInfo.environment;
    account.username = accountInfo.username;
    account.name = accountInfo.name;
    account.loginHint = accountInfo.loginHint;
    account.cloudGraphHostName = cloudGraphHostName;
    account.msGraphHost = msGraphHost;
    const tenantProfiles = Array.from(accountInfo.tenantProfiles?.values() || []);
    if (tenantProfiles.length === 0 && accountInfo.tenantId && accountInfo.localAccountId) {
      tenantProfiles.push(buildTenantProfile(accountInfo.homeAccountId, accountInfo.localAccountId, accountInfo.tenantId, accountInfo.idTokenClaims));
    }
    account.tenantProfiles = tenantProfiles;
    account.dataBoundary = accountInfo.dataBoundary;
    return account;
  }
  /**
   * Generate HomeAccountId from server response
   * @param serverClientInfo
   * @param authType
   */
  static generateHomeAccountId(serverClientInfo, authType, logger, cryptoObj, idTokenClaims) {
    if (!(authType === AuthorityType.Adfs || authType === AuthorityType.Dsts)) {
      if (serverClientInfo) {
        try {
          const clientInfo = buildClientInfo(serverClientInfo, cryptoObj.base64Decode);
          if (clientInfo.uid && clientInfo.utid) {
            return `${clientInfo.uid}.${clientInfo.utid}`;
          }
        } catch (e) {
        }
      }
      logger.warning("No client info in response");
    }
    return idTokenClaims?.sub || "";
  }
  /**
   * Validates an entity: checks for all expected params
   * @param entity
   */
  static isAccountEntity(entity) {
    if (!entity) {
      return false;
    }
    return entity.hasOwnProperty("homeAccountId") && entity.hasOwnProperty("environment") && entity.hasOwnProperty("realm") && entity.hasOwnProperty("localAccountId") && entity.hasOwnProperty("username") && entity.hasOwnProperty("authorityType");
  }
  /**
   * Helper function to determine whether 2 accountInfo objects represent the same account
   * @param accountA
   * @param accountB
   * @param compareClaims - If set to true idTokenClaims will also be compared to determine account equality
   */
  static accountInfoIsEqual(accountA, accountB, compareClaims) {
    if (!accountA || !accountB) {
      return false;
    }
    let claimsMatch = true;
    if (compareClaims) {
      const accountAClaims = accountA.idTokenClaims || {};
      const accountBClaims = accountB.idTokenClaims || {};
      claimsMatch = accountAClaims.iat === accountBClaims.iat && accountAClaims.nonce === accountBClaims.nonce;
    }
    return accountA.homeAccountId === accountB.homeAccountId && accountA.localAccountId === accountB.localAccountId && accountA.username === accountB.username && accountA.tenantId === accountB.tenantId && accountA.loginHint === accountB.loginHint && accountA.environment === accountB.environment && accountA.nativeAccountId === accountB.nativeAccountId && claimsMatch;
  }
}
function extractTokenClaims(encodedToken, base64Decode) {
  const jswPayload = getJWSPayload(encodedToken);
  try {
    const base64Decoded = base64Decode(jswPayload);
    return JSON.parse(base64Decoded);
  } catch (err) {
    throw createClientAuthError(tokenParsingError);
  }
}
function isKmsi(idTokenClaims) {
  if (!idTokenClaims.signin_state) {
    return false;
  }
  const kmsiClaims = ["kmsi", "dvc_dmjd"];
  const kmsi = idTokenClaims.signin_state.some((value) => kmsiClaims.includes(value.trim().toLowerCase()));
  return kmsi;
}
function getJWSPayload(authToken) {
  if (!authToken) {
    throw createClientAuthError(nullOrEmptyToken);
  }
  const tokenPartsRegex = /^([^\.\s]*)\.([^\.\s]+)\.([^\.\s]*)$/;
  const matches = tokenPartsRegex.exec(authToken);
  if (!matches || matches.length < 4) {
    throw createClientAuthError(tokenParsingError);
  }
  return matches[2];
}
function checkMaxAge(authTime, maxAge) {
  const fiveMinuteSkew = 3e5;
  if (maxAge === 0 || Date.now() - fiveMinuteSkew > authTime + maxAge) {
    throw createClientAuthError(maxAgeTranspired);
  }
}
function stripLeadingHashOrQuery(responseString) {
  if (responseString.startsWith("#/")) {
    return responseString.substring(2);
  } else if (responseString.startsWith("#") || responseString.startsWith("?")) {
    return responseString.substring(1);
  }
  return responseString;
}
function getDeserializedResponse(responseString) {
  if (!responseString || responseString.indexOf("=") < 0) {
    return null;
  }
  try {
    const normalizedResponse = stripLeadingHashOrQuery(responseString);
    const deserializedHash = Object.fromEntries(new URLSearchParams(normalizedResponse));
    if (deserializedHash.code || deserializedHash.ear_jwe || deserializedHash.error || deserializedHash.error_description || deserializedHash.state) {
      return deserializedHash;
    }
  } catch (e) {
    throw createClientAuthError(hashNotDeserialized);
  }
  return null;
}
function mapToQueryString(parameters, encodeExtraParams = true, extraQueryParameters) {
  const queryParameterArray = new Array();
  parameters.forEach((value, key) => {
    if (!encodeExtraParams && extraQueryParameters && key in extraQueryParameters) {
      queryParameterArray.push(`${key}=${value}`);
    } else {
      queryParameterArray.push(`${key}=${encodeURIComponent(value)}`);
    }
  });
  return queryParameterArray.join("&");
}
class UrlString {
  get urlString() {
    return this._urlString;
  }
  constructor(url2) {
    this._urlString = url2;
    if (!this._urlString) {
      throw createClientConfigurationError(urlEmptyError);
    }
    if (!url2.includes("#")) {
      this._urlString = UrlString.canonicalizeUri(url2);
    }
  }
  /**
   * Ensure urls are lower case and end with a / character.
   * @param url
   */
  static canonicalizeUri(url2) {
    if (url2) {
      let lowerCaseUrl = url2.toLowerCase();
      if (StringUtils.endsWith(lowerCaseUrl, "?")) {
        lowerCaseUrl = lowerCaseUrl.slice(0, -1);
      } else if (StringUtils.endsWith(lowerCaseUrl, "?/")) {
        lowerCaseUrl = lowerCaseUrl.slice(0, -2);
      }
      if (!StringUtils.endsWith(lowerCaseUrl, "/")) {
        lowerCaseUrl += "/";
      }
      return lowerCaseUrl;
    }
    return url2;
  }
  /**
   * Throws if urlString passed is not a valid authority URI string.
   */
  validateAsUri() {
    let components;
    try {
      components = this.getUrlComponents();
    } catch (e) {
      throw createClientConfigurationError(urlParseError);
    }
    if (!components.HostNameAndPort || !components.PathSegments) {
      throw createClientConfigurationError(urlParseError);
    }
    if (!components.Protocol || components.Protocol.toLowerCase() !== "https:") {
      throw createClientConfigurationError(authorityUriInsecure);
    }
  }
  /**
   * Given a url and a query string return the url with provided query string appended
   * @param url
   * @param queryString
   */
  static appendQueryString(url2, queryString) {
    if (!queryString) {
      return url2;
    }
    return url2.indexOf("?") < 0 ? `${url2}?${queryString}` : `${url2}&${queryString}`;
  }
  /**
   * Returns a url with the hash removed
   * @param url
   */
  static removeHashFromUrl(url2) {
    return UrlString.canonicalizeUri(url2.split("#")[0]);
  }
  /**
   * Given a url like https://a:b/common/d?e=f#g, and a tenantId, returns https://a:b/tenantId/d
   * @param href The url
   * @param tenantId The tenant id to replace
   */
  replaceTenantPath(tenantId) {
    const urlObject = this.getUrlComponents();
    const pathArray = urlObject.PathSegments;
    if (tenantId && pathArray.length !== 0 && (pathArray[0] === AADAuthorityConstants.COMMON || pathArray[0] === AADAuthorityConstants.ORGANIZATIONS)) {
      pathArray[0] = tenantId;
    }
    return UrlString.constructAuthorityUriFromObject(urlObject);
  }
  /**
   * Parses out the components from a url string.
   * @returns An object with the various components. Please cache this value insted of calling this multiple times on the same url.
   */
  getUrlComponents() {
    const regEx = RegExp("^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?");
    const match = this.urlString.match(regEx);
    if (!match) {
      throw createClientConfigurationError(urlParseError);
    }
    const urlComponents = {
      Protocol: match[1],
      HostNameAndPort: match[4],
      AbsolutePath: match[5],
      QueryString: match[7]
    };
    let pathSegments = urlComponents.AbsolutePath.split("/");
    pathSegments = pathSegments.filter((val) => val && val.length > 0);
    urlComponents.PathSegments = pathSegments;
    if (urlComponents.QueryString && urlComponents.QueryString.endsWith("/")) {
      urlComponents.QueryString = urlComponents.QueryString.substring(0, urlComponents.QueryString.length - 1);
    }
    return urlComponents;
  }
  static getDomainFromUrl(url2) {
    const regEx = RegExp("^([^:/?#]+://)?([^/?#]*)");
    const match = url2.match(regEx);
    if (!match) {
      throw createClientConfigurationError(urlParseError);
    }
    return match[2];
  }
  static getAbsoluteUrl(relativeUrl, baseUrl) {
    if (relativeUrl[0] === Constants$1.FORWARD_SLASH) {
      const url2 = new UrlString(baseUrl);
      const baseComponents = url2.getUrlComponents();
      return baseComponents.Protocol + "//" + baseComponents.HostNameAndPort + relativeUrl;
    }
    return relativeUrl;
  }
  static constructAuthorityUriFromObject(urlObject) {
    return new UrlString(urlObject.Protocol + "//" + urlObject.HostNameAndPort + "/" + urlObject.PathSegments.join("/"));
  }
  /**
   * Check if the hash of the URL string contains known properties
   * @deprecated This API will be removed in a future version
   */
  static hashContainsKnownProperties(response) {
    return !!getDeserializedResponse(response);
  }
}
const rawMetdataJSON = {
  endpointMetadata: {
    "login.microsoftonline.com": {
      token_endpoint: "https://login.microsoftonline.com/{tenantid}/oauth2/v2.0/token",
      jwks_uri: "https://login.microsoftonline.com/{tenantid}/discovery/v2.0/keys",
      issuer: "https://login.microsoftonline.com/{tenantid}/v2.0",
      authorization_endpoint: "https://login.microsoftonline.com/{tenantid}/oauth2/v2.0/authorize",
      end_session_endpoint: "https://login.microsoftonline.com/{tenantid}/oauth2/v2.0/logout"
    },
    "login.chinacloudapi.cn": {
      token_endpoint: "https://login.chinacloudapi.cn/{tenantid}/oauth2/v2.0/token",
      jwks_uri: "https://login.chinacloudapi.cn/{tenantid}/discovery/v2.0/keys",
      issuer: "https://login.partner.microsoftonline.cn/{tenantid}/v2.0",
      authorization_endpoint: "https://login.chinacloudapi.cn/{tenantid}/oauth2/v2.0/authorize",
      end_session_endpoint: "https://login.chinacloudapi.cn/{tenantid}/oauth2/v2.0/logout"
    },
    "login.microsoftonline.us": {
      token_endpoint: "https://login.microsoftonline.us/{tenantid}/oauth2/v2.0/token",
      jwks_uri: "https://login.microsoftonline.us/{tenantid}/discovery/v2.0/keys",
      issuer: "https://login.microsoftonline.us/{tenantid}/v2.0",
      authorization_endpoint: "https://login.microsoftonline.us/{tenantid}/oauth2/v2.0/authorize",
      end_session_endpoint: "https://login.microsoftonline.us/{tenantid}/oauth2/v2.0/logout"
    },
    "login.sovcloud-identity.fr": {
      token_endpoint: "https://login.sovcloud-identity.fr/{tenantid}/oauth2/v2.0/token",
      jwks_uri: "https://login.sovcloud-identity.fr/{tenantid}/discovery/v2.0/keys",
      issuer: "https://login.sovcloud-identity.fr/{tenantid}/v2.0",
      authorization_endpoint: "https://login.sovcloud-identity.fr/{tenantid}/oauth2/v2.0/authorize",
      end_session_endpoint: "https://login.sovcloud-identity.fr/{tenantid}/oauth2/v2.0/logout"
    },
    "login.sovcloud-identity.de": {
      token_endpoint: "https://login.sovcloud-identity.de/{tenantid}/oauth2/v2.0/token",
      jwks_uri: "https://login.sovcloud-identity.de/{tenantid}/discovery/v2.0/keys",
      issuer: "https://login.sovcloud-identity.de/{tenantid}/v2.0",
      authorization_endpoint: "https://login.sovcloud-identity.de/{tenantid}/oauth2/v2.0/authorize",
      end_session_endpoint: "https://login.sovcloud-identity.de/{tenantid}/oauth2/v2.0/logout"
    },
    "login.sovcloud-identity.sg": {
      token_endpoint: "https://login.sovcloud-identity.sg/common/oauth2/v2.0/token",
      jwks_uri: "https://login.sovcloud-identity.sg/common/discovery/v2.0/keys",
      issuer: "https://login.sovcloud-identity.sg/{tenantid}/v2.0",
      authorization_endpoint: "https://login.sovcloud-identity.sg/common/oauth2/v2.0/authorize",
      end_session_endpoint: "https://login.sovcloud-identity.sg/common/oauth2/v2.0/logout"
    }
  },
  instanceDiscoveryMetadata: {
    metadata: [
      {
        preferred_network: "login.microsoftonline.com",
        preferred_cache: "login.windows.net",
        aliases: [
          "login.microsoftonline.com",
          "login.windows.net",
          "login.microsoft.com",
          "sts.windows.net"
        ]
      },
      {
        preferred_network: "login.partner.microsoftonline.cn",
        preferred_cache: "login.partner.microsoftonline.cn",
        aliases: [
          "login.partner.microsoftonline.cn",
          "login.chinacloudapi.cn"
        ]
      },
      {
        preferred_network: "login.microsoftonline.de",
        preferred_cache: "login.microsoftonline.de",
        aliases: ["login.microsoftonline.de"]
      },
      {
        preferred_network: "login.microsoftonline.us",
        preferred_cache: "login.microsoftonline.us",
        aliases: [
          "login.microsoftonline.us",
          "login.usgovcloudapi.net"
        ]
      },
      {
        preferred_network: "login-us.microsoftonline.com",
        preferred_cache: "login-us.microsoftonline.com",
        aliases: ["login-us.microsoftonline.com"]
      },
      {
        preferred_network: "login.sovcloud-identity.fr",
        preferred_cache: "login.sovcloud-identity.fr",
        aliases: ["login.sovcloud-identity.fr"]
      },
      {
        preferred_network: "login.sovcloud-identity.de",
        preferred_cache: "login.sovcloud-identity.de",
        aliases: ["login.sovcloud-identity.de"]
      },
      {
        preferred_network: "login.sovcloud-identity.sg",
        preferred_cache: "login.sovcloud-identity.sg",
        aliases: ["login.sovcloud-identity.sg"]
      }
    ]
  }
};
const EndpointMetadata = rawMetdataJSON.endpointMetadata;
const InstanceDiscoveryMetadata = rawMetdataJSON.instanceDiscoveryMetadata;
const InstanceDiscoveryMetadataAliases = /* @__PURE__ */ new Set();
InstanceDiscoveryMetadata.metadata.forEach((metadataEntry) => {
  metadataEntry.aliases.forEach((alias) => {
    InstanceDiscoveryMetadataAliases.add(alias);
  });
});
function getAliasesFromStaticSources(staticAuthorityOptions, logger) {
  let staticAliases;
  const canonicalAuthority = staticAuthorityOptions.canonicalAuthority;
  if (canonicalAuthority) {
    const authorityHost = new UrlString(canonicalAuthority).getUrlComponents().HostNameAndPort;
    staticAliases = getAliasesFromMetadata(authorityHost, staticAuthorityOptions.cloudDiscoveryMetadata?.metadata, AuthorityMetadataSource.CONFIG, logger) || getAliasesFromMetadata(authorityHost, InstanceDiscoveryMetadata.metadata, AuthorityMetadataSource.HARDCODED_VALUES, logger) || staticAuthorityOptions.knownAuthorities;
  }
  return staticAliases || [];
}
function getAliasesFromMetadata(authorityHost, cloudDiscoveryMetadata, source, logger) {
  logger?.trace(`getAliasesFromMetadata called with source: ${source}`);
  if (authorityHost && cloudDiscoveryMetadata) {
    const metadata = getCloudDiscoveryMetadataFromNetworkResponse(cloudDiscoveryMetadata, authorityHost);
    if (metadata) {
      logger?.trace(`getAliasesFromMetadata: found cloud discovery metadata in ${source}, returning aliases`);
      return metadata.aliases;
    } else {
      logger?.trace(`getAliasesFromMetadata: did not find cloud discovery metadata in ${source}`);
    }
  }
  return null;
}
function getCloudDiscoveryMetadataFromHardcodedValues(authorityHost) {
  const metadata = getCloudDiscoveryMetadataFromNetworkResponse(InstanceDiscoveryMetadata.metadata, authorityHost);
  return metadata;
}
function getCloudDiscoveryMetadataFromNetworkResponse(response, authorityHost) {
  for (let i = 0; i < response.length; i++) {
    const metadata = response[i];
    if (metadata.aliases.includes(authorityHost)) {
      return metadata;
    }
  }
  return null;
}
const cacheQuotaExceeded = "cache_quota_exceeded";
const cacheErrorUnknown = "cache_error_unknown";
const CacheErrorMessages = {
  [cacheQuotaExceeded]: "Exceeded cache storage capacity.",
  [cacheErrorUnknown]: "Unexpected error occurred when using cache storage."
};
class CacheError extends AuthError {
  constructor(errorCode, errorMessage) {
    const message = errorMessage || (CacheErrorMessages[errorCode] ? CacheErrorMessages[errorCode] : CacheErrorMessages[cacheErrorUnknown]);
    super(`${errorCode}: ${message}`);
    Object.setPrototypeOf(this, CacheError.prototype);
    this.name = "CacheError";
    this.errorCode = errorCode;
    this.errorMessage = message;
  }
}
function createCacheError(e) {
  if (!(e instanceof Error)) {
    return new CacheError(cacheErrorUnknown);
  }
  if (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED" || e.message.includes("exceeded the quota")) {
    return new CacheError(cacheQuotaExceeded);
  } else {
    return new CacheError(e.name, e.message);
  }
}
class CacheManager {
  constructor(clientId, cryptoImpl, logger, performanceClient, staticAuthorityOptions) {
    this.clientId = clientId;
    this.cryptoImpl = cryptoImpl;
    this.commonLogger = logger.clone(name$1, version$1);
    this.staticAuthorityOptions = staticAuthorityOptions;
    this.performanceClient = performanceClient;
  }
  /**
   * Returns all the accounts in the cache that match the optional filter. If no filter is provided, all accounts are returned.
   * @param accountFilter - (Optional) filter to narrow down the accounts returned
   * @returns Array of AccountInfo objects in cache
   */
  getAllAccounts(accountFilter, correlationId) {
    return this.buildTenantProfiles(this.getAccountsFilteredBy(accountFilter, correlationId), correlationId, accountFilter);
  }
  /**
   * Gets first tenanted AccountInfo object found based on provided filters
   */
  getAccountInfoFilteredBy(accountFilter, correlationId) {
    if (Object.keys(accountFilter).length === 0 || Object.values(accountFilter).every((value) => !value)) {
      this.commonLogger.warning("getAccountInfoFilteredBy: Account filter is empty or invalid, returning null");
      return null;
    }
    const allAccounts = this.getAllAccounts(accountFilter, correlationId);
    if (allAccounts.length > 1) {
      const sortedAccounts = allAccounts.sort((account) => {
        return account.idTokenClaims ? -1 : 1;
      });
      return sortedAccounts[0];
    } else if (allAccounts.length === 1) {
      return allAccounts[0];
    } else {
      return null;
    }
  }
  /**
   * Returns a single matching
   * @param accountFilter
   * @returns
   */
  getBaseAccountInfo(accountFilter, correlationId) {
    const accountEntities = this.getAccountsFilteredBy(accountFilter, correlationId);
    if (accountEntities.length > 0) {
      return AccountEntity.getAccountInfo(accountEntities[0]);
    } else {
      return null;
    }
  }
  /**
   * Matches filtered account entities with cached ID tokens that match the tenant profile-specific account filters
   * and builds the account info objects from the matching ID token's claims
   * @param cachedAccounts
   * @param accountFilter
   * @returns Array of AccountInfo objects that match account and tenant profile filters
   */
  buildTenantProfiles(cachedAccounts, correlationId, accountFilter) {
    return cachedAccounts.flatMap((accountEntity) => {
      return this.getTenantProfilesFromAccountEntity(accountEntity, correlationId, accountFilter?.tenantId, accountFilter);
    });
  }
  getTenantedAccountInfoByFilter(accountInfo, tokenKeys, tenantProfile, correlationId, tenantProfileFilter) {
    let tenantedAccountInfo = null;
    let idTokenClaims;
    if (tenantProfileFilter) {
      if (!this.tenantProfileMatchesFilter(tenantProfile, tenantProfileFilter)) {
        return null;
      }
    }
    const idToken = this.getIdToken(accountInfo, correlationId, tokenKeys, tenantProfile.tenantId);
    if (idToken) {
      idTokenClaims = extractTokenClaims(idToken.secret, this.cryptoImpl.base64Decode);
      if (!this.idTokenClaimsMatchTenantProfileFilter(idTokenClaims, tenantProfileFilter)) {
        return null;
      }
    }
    tenantedAccountInfo = updateAccountTenantProfileData(accountInfo, tenantProfile, idTokenClaims, idToken?.secret);
    return tenantedAccountInfo;
  }
  getTenantProfilesFromAccountEntity(accountEntity, correlationId, targetTenantId, tenantProfileFilter) {
    const accountInfo = AccountEntity.getAccountInfo(accountEntity);
    let searchTenantProfiles = accountInfo.tenantProfiles || /* @__PURE__ */ new Map();
    const tokenKeys = this.getTokenKeys();
    if (targetTenantId) {
      const tenantProfile = searchTenantProfiles.get(targetTenantId);
      if (tenantProfile) {
        searchTenantProfiles = /* @__PURE__ */ new Map([
          [targetTenantId, tenantProfile]
        ]);
      } else {
        return [];
      }
    }
    const matchingTenantProfiles = [];
    searchTenantProfiles.forEach((tenantProfile) => {
      const tenantedAccountInfo = this.getTenantedAccountInfoByFilter(accountInfo, tokenKeys, tenantProfile, correlationId, tenantProfileFilter);
      if (tenantedAccountInfo) {
        matchingTenantProfiles.push(tenantedAccountInfo);
      }
    });
    return matchingTenantProfiles;
  }
  tenantProfileMatchesFilter(tenantProfile, tenantProfileFilter) {
    if (!!tenantProfileFilter.localAccountId && !this.matchLocalAccountIdFromTenantProfile(tenantProfile, tenantProfileFilter.localAccountId)) {
      return false;
    }
    if (!!tenantProfileFilter.name && !(tenantProfile.name === tenantProfileFilter.name)) {
      return false;
    }
    if (tenantProfileFilter.isHomeTenant !== void 0 && !(tenantProfile.isHomeTenant === tenantProfileFilter.isHomeTenant)) {
      return false;
    }
    return true;
  }
  idTokenClaimsMatchTenantProfileFilter(idTokenClaims, tenantProfileFilter) {
    if (tenantProfileFilter) {
      if (!!tenantProfileFilter.localAccountId && !this.matchLocalAccountIdFromTokenClaims(idTokenClaims, tenantProfileFilter.localAccountId)) {
        return false;
      }
      if (!!tenantProfileFilter.loginHint && !this.matchLoginHintFromTokenClaims(idTokenClaims, tenantProfileFilter.loginHint)) {
        return false;
      }
      if (!!tenantProfileFilter.username && !this.matchUsername(idTokenClaims.preferred_username, tenantProfileFilter.username)) {
        return false;
      }
      if (!!tenantProfileFilter.name && !this.matchName(idTokenClaims, tenantProfileFilter.name)) {
        return false;
      }
      if (!!tenantProfileFilter.sid && !this.matchSid(idTokenClaims, tenantProfileFilter.sid)) {
        return false;
      }
    }
    return true;
  }
  /**
   * saves a cache record
   * @param cacheRecord {CacheRecord}
   * @param correlationId {?string} correlation id
   * @param kmsi - Keep Me Signed In
   * @param apiId - API identifier for telemetry tracking
   * @param storeInCache {?StoreInCache}
   */
  async saveCacheRecord(cacheRecord, correlationId, kmsi, apiId, storeInCache) {
    if (!cacheRecord) {
      throw createClientAuthError(invalidCacheRecord);
    }
    try {
      if (!!cacheRecord.account) {
        await this.setAccount(cacheRecord.account, correlationId, kmsi, apiId);
      }
      if (!!cacheRecord.idToken && storeInCache?.idToken !== false) {
        await this.setIdTokenCredential(cacheRecord.idToken, correlationId, kmsi);
      }
      if (!!cacheRecord.accessToken && storeInCache?.accessToken !== false) {
        await this.saveAccessToken(cacheRecord.accessToken, correlationId, kmsi);
      }
      if (!!cacheRecord.refreshToken && storeInCache?.refreshToken !== false) {
        await this.setRefreshTokenCredential(cacheRecord.refreshToken, correlationId, kmsi);
      }
      if (!!cacheRecord.appMetadata) {
        this.setAppMetadata(cacheRecord.appMetadata, correlationId);
      }
    } catch (e) {
      this.commonLogger?.error(`CacheManager.saveCacheRecord: failed`);
      if (e instanceof AuthError) {
        throw e;
      } else {
        throw createCacheError(e);
      }
    }
  }
  /**
   * saves access token credential
   * @param credential
   */
  async saveAccessToken(credential, correlationId, kmsi) {
    const accessTokenFilter = {
      clientId: credential.clientId,
      credentialType: credential.credentialType,
      environment: credential.environment,
      homeAccountId: credential.homeAccountId,
      realm: credential.realm,
      tokenType: credential.tokenType,
      requestedClaimsHash: credential.requestedClaimsHash
    };
    const tokenKeys = this.getTokenKeys();
    const currentScopes = ScopeSet.fromString(credential.target);
    tokenKeys.accessToken.forEach((key) => {
      if (!this.accessTokenKeyMatchesFilter(key, accessTokenFilter, false)) {
        return;
      }
      const tokenEntity = this.getAccessTokenCredential(key, correlationId);
      if (tokenEntity && this.credentialMatchesFilter(tokenEntity, accessTokenFilter)) {
        const tokenScopeSet = ScopeSet.fromString(tokenEntity.target);
        if (tokenScopeSet.intersectingScopeSets(currentScopes)) {
          this.removeAccessToken(key, correlationId);
        }
      }
    });
    await this.setAccessTokenCredential(credential, correlationId, kmsi);
  }
  /**
   * Retrieve account entities matching all provided tenant-agnostic filters; if no filter is set, get all account entities in the cache
   * Not checking for casing as keys are all generated in lower case, remember to convert to lower case if object properties are compared
   * @param accountFilter - An object containing Account properties to filter by
   */
  getAccountsFilteredBy(accountFilter, correlationId) {
    const allAccountKeys = this.getAccountKeys();
    const matchingAccounts = [];
    allAccountKeys.forEach((cacheKey) => {
      const entity = this.getAccount(cacheKey, correlationId);
      if (!entity) {
        return;
      }
      if (!!accountFilter.homeAccountId && !this.matchHomeAccountId(entity, accountFilter.homeAccountId)) {
        return;
      }
      if (!!accountFilter.username && !this.matchUsername(entity.username, accountFilter.username)) {
        return;
      }
      if (!!accountFilter.environment && !this.matchEnvironment(entity, accountFilter.environment)) {
        return;
      }
      if (!!accountFilter.realm && !this.matchRealm(entity, accountFilter.realm)) {
        return;
      }
      if (!!accountFilter.nativeAccountId && !this.matchNativeAccountId(entity, accountFilter.nativeAccountId)) {
        return;
      }
      if (!!accountFilter.authorityType && !this.matchAuthorityType(entity, accountFilter.authorityType)) {
        return;
      }
      const tenantProfileFilter = {
        localAccountId: accountFilter?.localAccountId,
        name: accountFilter?.name
      };
      const matchingTenantProfiles = entity.tenantProfiles?.filter((tenantProfile) => {
        return this.tenantProfileMatchesFilter(tenantProfile, tenantProfileFilter);
      });
      if (matchingTenantProfiles && matchingTenantProfiles.length === 0) {
        return;
      }
      matchingAccounts.push(entity);
    });
    return matchingAccounts;
  }
  /**
   * Returns whether or not the given credential entity matches the filter
   * @param entity
   * @param filter
   * @returns
   */
  credentialMatchesFilter(entity, filter) {
    if (!!filter.clientId && !this.matchClientId(entity, filter.clientId)) {
      return false;
    }
    if (!!filter.userAssertionHash && !this.matchUserAssertionHash(entity, filter.userAssertionHash)) {
      return false;
    }
    if (typeof filter.homeAccountId === "string" && !this.matchHomeAccountId(entity, filter.homeAccountId)) {
      return false;
    }
    if (!!filter.environment && !this.matchEnvironment(entity, filter.environment)) {
      return false;
    }
    if (!!filter.realm && !this.matchRealm(entity, filter.realm)) {
      return false;
    }
    if (!!filter.credentialType && !this.matchCredentialType(entity, filter.credentialType)) {
      return false;
    }
    if (!!filter.familyId && !this.matchFamilyId(entity, filter.familyId)) {
      return false;
    }
    if (!!filter.target && !this.matchTarget(entity, filter.target)) {
      return false;
    }
    if (filter.requestedClaimsHash || entity.requestedClaimsHash) {
      if (entity.requestedClaimsHash !== filter.requestedClaimsHash) {
        return false;
      }
    }
    if (entity.credentialType === CredentialType.ACCESS_TOKEN_WITH_AUTH_SCHEME) {
      if (!!filter.tokenType && !this.matchTokenType(entity, filter.tokenType)) {
        return false;
      }
      if (filter.tokenType === AuthenticationScheme.SSH) {
        if (filter.keyId && !this.matchKeyId(entity, filter.keyId)) {
          return false;
        }
      }
    }
    return true;
  }
  /**
   * retrieve appMetadata matching all provided filters; if no filter is set, get all appMetadata
   * @param filter
   */
  getAppMetadataFilteredBy(filter) {
    const allCacheKeys = this.getKeys();
    const matchingAppMetadata = {};
    allCacheKeys.forEach((cacheKey) => {
      if (!this.isAppMetadata(cacheKey)) {
        return;
      }
      const entity = this.getAppMetadata(cacheKey);
      if (!entity) {
        return;
      }
      if (!!filter.environment && !this.matchEnvironment(entity, filter.environment)) {
        return;
      }
      if (!!filter.clientId && !this.matchClientId(entity, filter.clientId)) {
        return;
      }
      matchingAppMetadata[cacheKey] = entity;
    });
    return matchingAppMetadata;
  }
  /**
   * retrieve authorityMetadata that contains a matching alias
   * @param filter
   */
  getAuthorityMetadataByAlias(host) {
    const allCacheKeys = this.getAuthorityMetadataKeys();
    let matchedEntity = null;
    allCacheKeys.forEach((cacheKey) => {
      if (!this.isAuthorityMetadata(cacheKey) || cacheKey.indexOf(this.clientId) === -1) {
        return;
      }
      const entity = this.getAuthorityMetadata(cacheKey);
      if (!entity) {
        return;
      }
      if (entity.aliases.indexOf(host) === -1) {
        return;
      }
      matchedEntity = entity;
    });
    return matchedEntity;
  }
  /**
   * Removes all accounts and related tokens from cache.
   */
  removeAllAccounts(correlationId) {
    const accounts = this.getAllAccounts({}, correlationId);
    accounts.forEach((account) => {
      this.removeAccount(account, correlationId);
    });
  }
  /**
   * Removes the account and related tokens for a given account key
   * @param account
   */
  removeAccount(account, correlationId) {
    this.removeAccountContext(account, correlationId);
    const accountKeys = this.getAccountKeys();
    const keyFilter = (key) => {
      return key.includes(account.homeAccountId) && key.includes(account.environment);
    };
    accountKeys.filter(keyFilter).forEach((key) => {
      this.removeItem(key, correlationId);
      this.performanceClient.incrementFields({ accountsRemoved: 1 }, correlationId);
    });
  }
  /**
   * Removes credentials associated with the provided account
   * @param account
   */
  removeAccountContext(account, correlationId) {
    const allTokenKeys = this.getTokenKeys();
    const keyFilter = (key) => {
      return key.includes(account.homeAccountId) && key.includes(account.environment);
    };
    allTokenKeys.idToken.filter(keyFilter).forEach((key) => {
      this.removeIdToken(key, correlationId);
    });
    allTokenKeys.accessToken.filter(keyFilter).forEach((key) => {
      this.removeAccessToken(key, correlationId);
    });
    allTokenKeys.refreshToken.filter(keyFilter).forEach((key) => {
      this.removeRefreshToken(key, correlationId);
    });
  }
  /**
   * Removes accessToken from the cache
   * @param key
   * @param correlationId
   */
  removeAccessToken(key, correlationId) {
    const credential = this.getAccessTokenCredential(key, correlationId);
    this.removeItem(key, correlationId);
    this.performanceClient.incrementFields({ accessTokensRemoved: 1 }, correlationId);
    if (!credential || credential.credentialType.toLowerCase() !== CredentialType.ACCESS_TOKEN_WITH_AUTH_SCHEME.toLowerCase() || credential.tokenType !== AuthenticationScheme.POP) {
      return;
    }
    const kid = credential.keyId;
    if (kid) {
      void this.cryptoImpl.removeTokenBindingKey(kid).catch(() => {
        this.commonLogger.error(`Failed to remove token binding key ${kid}`, correlationId);
        this.performanceClient?.incrementFields({ removeTokenBindingKeyFailure: 1 }, correlationId);
      });
    }
  }
  /**
   * Removes all app metadata objects from cache.
   */
  removeAppMetadata(correlationId) {
    const allCacheKeys = this.getKeys();
    allCacheKeys.forEach((cacheKey) => {
      if (this.isAppMetadata(cacheKey)) {
        this.removeItem(cacheKey, correlationId);
      }
    });
    return true;
  }
  /**
   * Retrieve IdTokenEntity from cache
   * @param account {AccountInfo}
   * @param tokenKeys {?TokenKeys}
   * @param targetRealm {?string}
   * @param performanceClient {?IPerformanceClient}
   * @param correlationId {?string}
   */
  getIdToken(account, correlationId, tokenKeys, targetRealm, performanceClient) {
    this.commonLogger.trace("CacheManager - getIdToken called");
    const idTokenFilter = {
      homeAccountId: account.homeAccountId,
      environment: account.environment,
      credentialType: CredentialType.ID_TOKEN,
      clientId: this.clientId,
      realm: targetRealm
    };
    const idTokenMap = this.getIdTokensByFilter(idTokenFilter, correlationId, tokenKeys);
    const numIdTokens = idTokenMap.size;
    if (numIdTokens < 1) {
      this.commonLogger.info("CacheManager:getIdToken - No token found");
      return null;
    } else if (numIdTokens > 1) {
      let tokensToBeRemoved = idTokenMap;
      if (!targetRealm) {
        const homeIdTokenMap = /* @__PURE__ */ new Map();
        idTokenMap.forEach((idToken, key) => {
          if (idToken.realm === account.tenantId) {
            homeIdTokenMap.set(key, idToken);
          }
        });
        const numHomeIdTokens = homeIdTokenMap.size;
        if (numHomeIdTokens < 1) {
          this.commonLogger.info("CacheManager:getIdToken - Multiple ID tokens found for account but none match account entity tenant id, returning first result");
          return idTokenMap.values().next().value;
        } else if (numHomeIdTokens === 1) {
          this.commonLogger.info("CacheManager:getIdToken - Multiple ID tokens found for account, defaulting to home tenant profile");
          return homeIdTokenMap.values().next().value;
        } else {
          tokensToBeRemoved = homeIdTokenMap;
        }
      }
      this.commonLogger.info("CacheManager:getIdToken - Multiple matching ID tokens found, clearing them");
      tokensToBeRemoved.forEach((idToken, key) => {
        this.removeIdToken(key, correlationId);
      });
      if (performanceClient && correlationId) {
        performanceClient.addFields({ multiMatchedID: idTokenMap.size }, correlationId);
      }
      return null;
    }
    this.commonLogger.info("CacheManager:getIdToken - Returning ID token");
    return idTokenMap.values().next().value;
  }
  /**
   * Gets all idTokens matching the given filter
   * @param filter
   * @returns
   */
  getIdTokensByFilter(filter, correlationId, tokenKeys) {
    const idTokenKeys = tokenKeys && tokenKeys.idToken || this.getTokenKeys().idToken;
    const idTokens = /* @__PURE__ */ new Map();
    idTokenKeys.forEach((key) => {
      if (!this.idTokenKeyMatchesFilter(key, {
        clientId: this.clientId,
        ...filter
      })) {
        return;
      }
      const idToken = this.getIdTokenCredential(key, correlationId);
      if (idToken && this.credentialMatchesFilter(idToken, filter)) {
        idTokens.set(key, idToken);
      }
    });
    return idTokens;
  }
  /**
   * Validate the cache key against filter before retrieving and parsing cache value
   * @param key
   * @param filter
   * @returns
   */
  idTokenKeyMatchesFilter(inputKey, filter) {
    const key = inputKey.toLowerCase();
    if (filter.clientId && key.indexOf(filter.clientId.toLowerCase()) === -1) {
      return false;
    }
    if (filter.homeAccountId && key.indexOf(filter.homeAccountId.toLowerCase()) === -1) {
      return false;
    }
    return true;
  }
  /**
   * Removes idToken from the cache
   * @param key
   */
  removeIdToken(key, correlationId) {
    this.removeItem(key, correlationId);
  }
  /**
   * Removes refresh token from the cache
   * @param key
   */
  removeRefreshToken(key, correlationId) {
    this.removeItem(key, correlationId);
  }
  /**
   * Retrieve AccessTokenEntity from cache
   * @param account {AccountInfo}
   * @param request {BaseAuthRequest}
   * @param correlationId {?string}
   * @param tokenKeys {?TokenKeys}
   * @param performanceClient {?IPerformanceClient}
   */
  getAccessToken(account, request, tokenKeys, targetRealm) {
    const correlationId = request.correlationId;
    this.commonLogger.trace("CacheManager - getAccessToken called", correlationId);
    const scopes2 = ScopeSet.createSearchScopes(request.scopes);
    const authScheme = request.authenticationScheme || AuthenticationScheme.BEARER;
    const credentialType = authScheme.toLowerCase() !== AuthenticationScheme.BEARER.toLowerCase() ? CredentialType.ACCESS_TOKEN_WITH_AUTH_SCHEME : CredentialType.ACCESS_TOKEN;
    const accessTokenFilter = {
      homeAccountId: account.homeAccountId,
      environment: account.environment,
      credentialType,
      clientId: this.clientId,
      realm: targetRealm || account.tenantId,
      target: scopes2,
      tokenType: authScheme,
      keyId: request.sshKid,
      requestedClaimsHash: request.requestedClaimsHash
    };
    const accessTokenKeys = tokenKeys && tokenKeys.accessToken || this.getTokenKeys().accessToken;
    const accessTokens = [];
    accessTokenKeys.forEach((key) => {
      if (this.accessTokenKeyMatchesFilter(key, accessTokenFilter, true)) {
        const accessToken = this.getAccessTokenCredential(key, correlationId);
        if (accessToken && this.credentialMatchesFilter(accessToken, accessTokenFilter)) {
          accessTokens.push(accessToken);
        }
      }
    });
    const numAccessTokens = accessTokens.length;
    if (numAccessTokens < 1) {
      this.commonLogger.info("CacheManager:getAccessToken - No token found", correlationId);
      return null;
    } else if (numAccessTokens > 1) {
      this.commonLogger.info("CacheManager:getAccessToken - Multiple access tokens found, clearing them", correlationId);
      accessTokens.forEach((accessToken) => {
        this.removeAccessToken(this.generateCredentialKey(accessToken), correlationId);
      });
      this.performanceClient.addFields({ multiMatchedAT: accessTokens.length }, correlationId);
      return null;
    }
    this.commonLogger.info("CacheManager:getAccessToken - Returning access token", correlationId);
    return accessTokens[0];
  }
  /**
   * Validate the cache key against filter before retrieving and parsing cache value
   * @param key
   * @param filter
   * @param keyMustContainAllScopes
   * @returns
   */
  accessTokenKeyMatchesFilter(inputKey, filter, keyMustContainAllScopes) {
    const key = inputKey.toLowerCase();
    if (filter.clientId && key.indexOf(filter.clientId.toLowerCase()) === -1) {
      return false;
    }
    if (filter.homeAccountId && key.indexOf(filter.homeAccountId.toLowerCase()) === -1) {
      return false;
    }
    if (filter.realm && key.indexOf(filter.realm.toLowerCase()) === -1) {
      return false;
    }
    if (filter.requestedClaimsHash && key.indexOf(filter.requestedClaimsHash.toLowerCase()) === -1) {
      return false;
    }
    if (filter.target) {
      const scopes2 = filter.target.asArray();
      for (let i = 0; i < scopes2.length; i++) {
        if (keyMustContainAllScopes && !key.includes(scopes2[i].toLowerCase())) {
          return false;
        } else if (!keyMustContainAllScopes && key.includes(scopes2[i].toLowerCase())) {
          return true;
        }
      }
    }
    return true;
  }
  /**
   * Gets all access tokens matching the filter
   * @param filter
   * @returns
   */
  getAccessTokensByFilter(filter, correlationId) {
    const tokenKeys = this.getTokenKeys();
    const accessTokens = [];
    tokenKeys.accessToken.forEach((key) => {
      if (!this.accessTokenKeyMatchesFilter(key, filter, true)) {
        return;
      }
      const accessToken = this.getAccessTokenCredential(key, correlationId);
      if (accessToken && this.credentialMatchesFilter(accessToken, filter)) {
        accessTokens.push(accessToken);
      }
    });
    return accessTokens;
  }
  /**
   * Helper to retrieve the appropriate refresh token from cache
   * @param account {AccountInfo}
   * @param familyRT {boolean}
   * @param correlationId {?string}
   * @param tokenKeys {?TokenKeys}
   * @param performanceClient {?IPerformanceClient}
   */
  getRefreshToken(account, familyRT, correlationId, tokenKeys, performanceClient) {
    this.commonLogger.trace("CacheManager - getRefreshToken called");
    const id = familyRT ? THE_FAMILY_ID : void 0;
    const refreshTokenFilter = {
      homeAccountId: account.homeAccountId,
      environment: account.environment,
      credentialType: CredentialType.REFRESH_TOKEN,
      clientId: this.clientId,
      familyId: id
    };
    const refreshTokenKeys = tokenKeys && tokenKeys.refreshToken || this.getTokenKeys().refreshToken;
    const refreshTokens = [];
    refreshTokenKeys.forEach((key) => {
      if (this.refreshTokenKeyMatchesFilter(key, refreshTokenFilter)) {
        const refreshToken = this.getRefreshTokenCredential(key, correlationId);
        if (refreshToken && this.credentialMatchesFilter(refreshToken, refreshTokenFilter)) {
          refreshTokens.push(refreshToken);
        }
      }
    });
    const numRefreshTokens = refreshTokens.length;
    if (numRefreshTokens < 1) {
      this.commonLogger.info("CacheManager:getRefreshToken - No refresh token found.");
      return null;
    }
    if (numRefreshTokens > 1 && performanceClient && correlationId) {
      performanceClient.addFields({ multiMatchedRT: numRefreshTokens }, correlationId);
    }
    this.commonLogger.info("CacheManager:getRefreshToken - returning refresh token");
    return refreshTokens[0];
  }
  /**
   * Validate the cache key against filter before retrieving and parsing cache value
   * @param key
   * @param filter
   */
  refreshTokenKeyMatchesFilter(inputKey, filter) {
    const key = inputKey.toLowerCase();
    if (filter.familyId && key.indexOf(filter.familyId.toLowerCase()) === -1) {
      return false;
    }
    if (!filter.familyId && filter.clientId && key.indexOf(filter.clientId.toLowerCase()) === -1) {
      return false;
    }
    if (filter.homeAccountId && key.indexOf(filter.homeAccountId.toLowerCase()) === -1) {
      return false;
    }
    return true;
  }
  /**
   * Retrieve AppMetadataEntity from cache
   */
  readAppMetadataFromCache(environment) {
    const appMetadataFilter = {
      environment,
      clientId: this.clientId
    };
    const appMetadata = this.getAppMetadataFilteredBy(appMetadataFilter);
    const appMetadataEntries = Object.keys(appMetadata).map((key) => appMetadata[key]);
    const numAppMetadata = appMetadataEntries.length;
    if (numAppMetadata < 1) {
      return null;
    } else if (numAppMetadata > 1) {
      throw createClientAuthError(multipleMatchingAppMetadata);
    }
    return appMetadataEntries[0];
  }
  /**
   * Return the family_id value associated  with FOCI
   * @param environment
   * @param clientId
   */
  isAppMetadataFOCI(environment) {
    const appMetadata = this.readAppMetadataFromCache(environment);
    return !!(appMetadata && appMetadata.familyId === THE_FAMILY_ID);
  }
  /**
   * helper to match account ids
   * @param value
   * @param homeAccountId
   */
  matchHomeAccountId(entity, homeAccountId) {
    return !!(typeof entity.homeAccountId === "string" && homeAccountId === entity.homeAccountId);
  }
  /**
   * helper to match account ids
   * @param entity
   * @param localAccountId
   * @returns
   */
  matchLocalAccountIdFromTokenClaims(tokenClaims, localAccountId) {
    const idTokenLocalAccountId = tokenClaims.oid || tokenClaims.sub;
    return localAccountId === idTokenLocalAccountId;
  }
  matchLocalAccountIdFromTenantProfile(tenantProfile, localAccountId) {
    return tenantProfile.localAccountId === localAccountId;
  }
  /**
   * helper to match names
   * @param entity
   * @param name
   * @returns true if the downcased name properties are present and match in the filter and the entity
   */
  matchName(claims, name2) {
    return !!(name2.toLowerCase() === claims.name?.toLowerCase());
  }
  /**
   * helper to match usernames
   * @param entity
   * @param username
   * @returns
   */
  matchUsername(cachedUsername, filterUsername) {
    return !!(cachedUsername && typeof cachedUsername === "string" && filterUsername?.toLowerCase() === cachedUsername.toLowerCase());
  }
  /**
   * helper to match assertion
   * @param value
   * @param oboAssertion
   */
  matchUserAssertionHash(entity, userAssertionHash) {
    return !!(entity.userAssertionHash && userAssertionHash === entity.userAssertionHash);
  }
  /**
   * helper to match environment
   * @param value
   * @param environment
   */
  matchEnvironment(entity, environment) {
    if (this.staticAuthorityOptions) {
      const staticAliases = getAliasesFromStaticSources(this.staticAuthorityOptions, this.commonLogger);
      if (staticAliases.includes(environment) && staticAliases.includes(entity.environment)) {
        return true;
      }
    }
    const cloudMetadata = this.getAuthorityMetadataByAlias(environment);
    if (cloudMetadata && cloudMetadata.aliases.indexOf(entity.environment) > -1) {
      return true;
    }
    return false;
  }
  /**
   * helper to match credential type
   * @param entity
   * @param credentialType
   */
  matchCredentialType(entity, credentialType) {
    return entity.credentialType && credentialType.toLowerCase() === entity.credentialType.toLowerCase();
  }
  /**
   * helper to match client ids
   * @param entity
   * @param clientId
   */
  matchClientId(entity, clientId) {
    return !!(entity.clientId && clientId === entity.clientId);
  }
  /**
   * helper to match family ids
   * @param entity
   * @param familyId
   */
  matchFamilyId(entity, familyId) {
    return !!(entity.familyId && familyId === entity.familyId);
  }
  /**
   * helper to match realm
   * @param entity
   * @param realm
   */
  matchRealm(entity, realm) {
    return !!(entity.realm?.toLowerCase() === realm.toLowerCase());
  }
  /**
   * helper to match nativeAccountId
   * @param entity
   * @param nativeAccountId
   * @returns boolean indicating the match result
   */
  matchNativeAccountId(entity, nativeAccountId) {
    return !!(entity.nativeAccountId && nativeAccountId === entity.nativeAccountId);
  }
  /**
   * helper to match loginHint which can be either:
   * 1. login_hint ID token claim
   * 2. username in cached account object
   * 3. upn in ID token claims
   * @param entity
   * @param loginHint
   * @returns
   */
  matchLoginHintFromTokenClaims(tokenClaims, loginHint) {
    if (tokenClaims.login_hint === loginHint) {
      return true;
    }
    if (tokenClaims.preferred_username === loginHint) {
      return true;
    }
    if (tokenClaims.upn === loginHint) {
      return true;
    }
    return false;
  }
  /**
   * Helper to match sid
   * @param entity
   * @param sid
   * @returns true if the sid claim is present and matches the filter
   */
  matchSid(idTokenClaims, sid) {
    return idTokenClaims.sid === sid;
  }
  matchAuthorityType(entity, authorityType) {
    return !!(entity.authorityType && authorityType.toLowerCase() === entity.authorityType.toLowerCase());
  }
  /**
   * Returns true if the target scopes are a subset of the current entity's scopes, false otherwise.
   * @param entity
   * @param target
   */
  matchTarget(entity, target) {
    const isNotAccessTokenCredential = entity.credentialType !== CredentialType.ACCESS_TOKEN && entity.credentialType !== CredentialType.ACCESS_TOKEN_WITH_AUTH_SCHEME;
    if (isNotAccessTokenCredential || !entity.target) {
      return false;
    }
    const entityScopeSet = ScopeSet.fromString(entity.target);
    return entityScopeSet.containsScopeSet(target);
  }
  /**
   * Returns true if the credential's tokenType or Authentication Scheme matches the one in the request, false otherwise
   * @param entity
   * @param tokenType
   */
  matchTokenType(entity, tokenType) {
    return !!(entity.tokenType && entity.tokenType === tokenType);
  }
  /**
   * Returns true if the credential's keyId matches the one in the request, false otherwise
   * @param entity
   * @param keyId
   */
  matchKeyId(entity, keyId) {
    return !!(entity.keyId && entity.keyId === keyId);
  }
  /**
   * returns if a given cache entity is of the type appmetadata
   * @param key
   */
  isAppMetadata(key) {
    return key.indexOf(APP_METADATA) !== -1;
  }
  /**
   * returns if a given cache entity is of the type authoritymetadata
   * @param key
   */
  isAuthorityMetadata(key) {
    return key.indexOf(AUTHORITY_METADATA_CONSTANTS.CACHE_KEY) !== -1;
  }
  /**
   * returns cache key used for cloud instance metadata
   */
  generateAuthorityMetadataCacheKey(authority) {
    return `${AUTHORITY_METADATA_CONSTANTS.CACHE_KEY}-${this.clientId}-${authority}`;
  }
  /**
   * Helper to convert serialized data to object
   * @param obj
   * @param json
   */
  static toObject(obj, json) {
    for (const propertyName in json) {
      obj[propertyName] = json[propertyName];
    }
    return obj;
  }
}
class DefaultStorageClass extends CacheManager {
  async setAccount() {
    throw createClientAuthError(methodNotImplemented);
  }
  getAccount() {
    throw createClientAuthError(methodNotImplemented);
  }
  async setIdTokenCredential() {
    throw createClientAuthError(methodNotImplemented);
  }
  getIdTokenCredential() {
    throw createClientAuthError(methodNotImplemented);
  }
  async setAccessTokenCredential() {
    throw createClientAuthError(methodNotImplemented);
  }
  getAccessTokenCredential() {
    throw createClientAuthError(methodNotImplemented);
  }
  async setRefreshTokenCredential() {
    throw createClientAuthError(methodNotImplemented);
  }
  getRefreshTokenCredential() {
    throw createClientAuthError(methodNotImplemented);
  }
  setAppMetadata() {
    throw createClientAuthError(methodNotImplemented);
  }
  getAppMetadata() {
    throw createClientAuthError(methodNotImplemented);
  }
  setServerTelemetry() {
    throw createClientAuthError(methodNotImplemented);
  }
  getServerTelemetry() {
    throw createClientAuthError(methodNotImplemented);
  }
  setAuthorityMetadata() {
    throw createClientAuthError(methodNotImplemented);
  }
  getAuthorityMetadata() {
    throw createClientAuthError(methodNotImplemented);
  }
  getAuthorityMetadataKeys() {
    throw createClientAuthError(methodNotImplemented);
  }
  setThrottlingCache() {
    throw createClientAuthError(methodNotImplemented);
  }
  getThrottlingCache() {
    throw createClientAuthError(methodNotImplemented);
  }
  removeItem() {
    throw createClientAuthError(methodNotImplemented);
  }
  getKeys() {
    throw createClientAuthError(methodNotImplemented);
  }
  getAccountKeys() {
    throw createClientAuthError(methodNotImplemented);
  }
  getTokenKeys() {
    throw createClientAuthError(methodNotImplemented);
  }
  generateCredentialKey() {
    throw createClientAuthError(methodNotImplemented);
  }
  generateAccountKey() {
    throw createClientAuthError(methodNotImplemented);
  }
}
const PerformanceEvents = {
  /**
   * acquireTokenByCode API (msal-browser and msal-node).
   * Used to acquire tokens by trading an authorization code against the token endpoint.
   */
  AcquireTokenByCode: "acquireTokenByCode",
  /**
   * acquireTokenByRefreshToken API (msal-browser and msal-node).
   * Used to renew an access token using a refresh token against the token endpoint.
   */
  AcquireTokenByRefreshToken: "acquireTokenByRefreshToken",
  /**
   * acquireTokenSilent API (msal-browser and msal-node).
   * Used to silently acquire a new access token (from the cache or the network).
   */
  AcquireTokenSilent: "acquireTokenSilent",
  /**
   * acquireTokenSilentAsync (msal-browser).
   * Internal API for acquireTokenSilent.
   */
  AcquireTokenSilentAsync: "acquireTokenSilentAsync",
  /**
   * acquireTokenPopup (msal-browser).
   * Used to acquire a new access token interactively through pop ups
   */
  AcquireTokenPopup: "acquireTokenPopup",
  /**
   * acquireTokenPreRedirect (msal-browser).
   * First part of the redirect flow.
   * Used to acquire a new access token interactively through redirects.
   */
  AcquireTokenPreRedirect: "acquireTokenPreRedirect",
  /**
   * acquireTokenRedirect (msal-browser).
   * Second part of the redirect flow.
   * Used to acquire a new access token interactively through redirects.
   */
  AcquireTokenRedirect: "acquireTokenRedirect",
  /**
   * getPublicKeyThumbprint API in CryptoOpts class (msal-browser).
   * Used to generate a public/private keypair and generate a public key thumbprint for pop requests.
   */
  CryptoOptsGetPublicKeyThumbprint: "cryptoOptsGetPublicKeyThumbprint",
  /**
   * signJwt API in CryptoOpts class (msal-browser).
   * Used to signed a pop token.
   */
  CryptoOptsSignJwt: "cryptoOptsSignJwt",
  /**
   * acquireToken API in the SilentCacheClient class (msal-browser).
   * Used to read access tokens from the cache.
   */
  SilentCacheClientAcquireToken: "silentCacheClientAcquireToken",
  /**
   * acquireToken API in the SilentIframeClient class (msal-browser).
   * Used to acquire a new set of tokens from the authorize endpoint in a hidden iframe.
   */
  SilentIframeClientAcquireToken: "silentIframeClientAcquireToken",
  AwaitConcurrentIframe: "awaitConcurrentIframe",
  /**
   * acquireToken API in SilentRereshClient (msal-browser).
   * Used to acquire a new set of tokens from the token endpoint using a refresh token.
   */
  SilentRefreshClientAcquireToken: "silentRefreshClientAcquireToken",
  /**
   * ssoSilent API (msal-browser).
   * Used to silently acquire an authorization code and set of tokens using a hidden iframe.
   */
  SsoSilent: "ssoSilent",
  /**
   * getDiscoveredAuthority API in StandardInteractionClient class (msal-browser).
   * Used to load authority metadata for a request.
   */
  StandardInteractionClientGetDiscoveredAuthority: "standardInteractionClientGetDiscoveredAuthority",
  /**
   * acquireToken APIs in msal-browser.
   * Used to make an /authorize endpoint call with native brokering enabled.
   */
  FetchAccountIdWithNativeBroker: "fetchAccountIdWithNativeBroker",
  /**
   * acquireToken API in NativeInteractionClient class (msal-browser).
   * Used to acquire a token from Native component when native brokering is enabled.
   */
  NativeInteractionClientAcquireToken: "nativeInteractionClientAcquireToken",
  /**
   * Time spent creating default headers for requests to token endpoint
   */
  BaseClientCreateTokenRequestHeaders: "baseClientCreateTokenRequestHeaders",
  /**
   * Time spent sending/waiting for the response of a request to the token endpoint
   */
  NetworkClientSendPostRequestAsync: "networkClientSendPostRequestAsync",
  RefreshTokenClientExecutePostToTokenEndpoint: "refreshTokenClientExecutePostToTokenEndpoint",
  AuthorizationCodeClientExecutePostToTokenEndpoint: "authorizationCodeClientExecutePostToTokenEndpoint",
  /**
   * Used to measure the time taken for completing embedded-broker handshake (PW-Broker).
   */
  BrokerHandhshake: "brokerHandshake",
  /**
   * acquireTokenByRefreshToken API in BrokerClientApplication (PW-Broker) .
   */
  AcquireTokenByRefreshTokenInBroker: "acquireTokenByRefreshTokenInBroker",
  /**
   * Time taken for token acquisition by broker
   */
  AcquireTokenByBroker: "acquireTokenByBroker",
  /**
   * Time spent on the network for refresh token acquisition
   */
  RefreshTokenClientExecuteTokenRequest: "refreshTokenClientExecuteTokenRequest",
  /**
   * Time taken for acquiring refresh token , records RT size
   */
  RefreshTokenClientAcquireToken: "refreshTokenClientAcquireToken",
  /**
   * Time taken for acquiring cached refresh token
   */
  RefreshTokenClientAcquireTokenWithCachedRefreshToken: "refreshTokenClientAcquireTokenWithCachedRefreshToken",
  /**
   * acquireTokenByRefreshToken API in RefreshTokenClient (msal-common).
   */
  RefreshTokenClientAcquireTokenByRefreshToken: "refreshTokenClientAcquireTokenByRefreshToken",
  /**
   * Helper function to create token request body in RefreshTokenClient (msal-common).
   */
  RefreshTokenClientCreateTokenRequestBody: "refreshTokenClientCreateTokenRequestBody",
  /**
   * acquireTokenFromCache (msal-browser).
   * Internal API for acquiring token from cache
   */
  AcquireTokenFromCache: "acquireTokenFromCache",
  SilentFlowClientAcquireCachedToken: "silentFlowClientAcquireCachedToken",
  SilentFlowClientGenerateResultFromCacheRecord: "silentFlowClientGenerateResultFromCacheRecord",
  /**
   * acquireTokenBySilentIframe (msal-browser).
   * Internal API for acquiring token by silent Iframe
   */
  AcquireTokenBySilentIframe: "acquireTokenBySilentIframe",
  /**
   * Internal API for initializing base request in BaseInteractionClient (msal-browser)
   */
  InitializeBaseRequest: "initializeBaseRequest",
  /**
   * Internal API for initializing silent request in SilentCacheClient (msal-browser)
   */
  InitializeSilentRequest: "initializeSilentRequest",
  InitializeClientApplication: "initializeClientApplication",
  InitializeCache: "initializeCache",
  /**
   * Helper function in SilentIframeClient class (msal-browser).
   */
  SilentIframeClientTokenHelper: "silentIframeClientTokenHelper",
  /**
   * SilentHandler
   */
  SilentHandlerInitiateAuthRequest: "silentHandlerInitiateAuthRequest",
  SilentHandlerMonitorIframeForHash: "silentHandlerMonitorIframeForHash",
  SilentHandlerLoadFrame: "silentHandlerLoadFrame",
  SilentHandlerLoadFrameSync: "silentHandlerLoadFrameSync",
  /**
   * Helper functions in StandardInteractionClient class (msal-browser)
   */
  StandardInteractionClientCreateAuthCodeClient: "standardInteractionClientCreateAuthCodeClient",
  StandardInteractionClientGetClientConfiguration: "standardInteractionClientGetClientConfiguration",
  StandardInteractionClientInitializeAuthorizationRequest: "standardInteractionClientInitializeAuthorizationRequest",
  /**
   * getAuthCodeUrl API (msal-browser and msal-node).
   */
  GetAuthCodeUrl: "getAuthCodeUrl",
  GetStandardParams: "getStandardParams",
  /**
   * Functions from InteractionHandler (msal-browser)
   */
  HandleCodeResponseFromServer: "handleCodeResponseFromServer",
  HandleCodeResponse: "handleCodeResponse",
  HandleResponseEar: "handleResponseEar",
  HandleResponsePlatformBroker: "handleResponsePlatformBroker",
  HandleResponseCode: "handleResponseCode",
  UpdateTokenEndpointAuthority: "updateTokenEndpointAuthority",
  /**
   * APIs in Authorization Code Client (msal-common)
   */
  AuthClientAcquireToken: "authClientAcquireToken",
  AuthClientExecuteTokenRequest: "authClientExecuteTokenRequest",
  AuthClientCreateTokenRequestBody: "authClientCreateTokenRequestBody",
  /**
   * Generate functions in PopTokenGenerator (msal-common)
   */
  PopTokenGenerateCnf: "popTokenGenerateCnf",
  PopTokenGenerateKid: "popTokenGenerateKid",
  /**
   * handleServerTokenResponse API in ResponseHandler (msal-common)
   */
  HandleServerTokenResponse: "handleServerTokenResponse",
  DeserializeResponse: "deserializeResponse",
  /**
   * Authority functions
   */
  AuthorityFactoryCreateDiscoveredInstance: "authorityFactoryCreateDiscoveredInstance",
  AuthorityResolveEndpointsAsync: "authorityResolveEndpointsAsync",
  AuthorityResolveEndpointsFromLocalSources: "authorityResolveEndpointsFromLocalSources",
  AuthorityGetCloudDiscoveryMetadataFromNetwork: "authorityGetCloudDiscoveryMetadataFromNetwork",
  AuthorityUpdateCloudDiscoveryMetadata: "authorityUpdateCloudDiscoveryMetadata",
  AuthorityGetEndpointMetadataFromNetwork: "authorityGetEndpointMetadataFromNetwork",
  AuthorityUpdateEndpointMetadata: "authorityUpdateEndpointMetadata",
  AuthorityUpdateMetadataWithRegionalInformation: "authorityUpdateMetadataWithRegionalInformation",
  /**
   * Region Discovery functions
   */
  RegionDiscoveryDetectRegion: "regionDiscoveryDetectRegion",
  RegionDiscoveryGetRegionFromIMDS: "regionDiscoveryGetRegionFromIMDS",
  RegionDiscoveryGetCurrentVersion: "regionDiscoveryGetCurrentVersion",
  AcquireTokenByCodeAsync: "acquireTokenByCodeAsync",
  GetEndpointMetadataFromNetwork: "getEndpointMetadataFromNetwork",
  GetCloudDiscoveryMetadataFromNetworkMeasurement: "getCloudDiscoveryMetadataFromNetworkMeasurement",
  HandleRedirectPromiseMeasurement: "handleRedirectPromise",
  HandleNativeRedirectPromiseMeasurement: "handleNativeRedirectPromise",
  UpdateCloudDiscoveryMetadataMeasurement: "updateCloudDiscoveryMetadataMeasurement",
  UsernamePasswordClientAcquireToken: "usernamePasswordClientAcquireToken",
  NativeMessageHandlerHandshake: "nativeMessageHandlerHandshake",
  NativeGenerateAuthResult: "nativeGenerateAuthResult",
  RemoveHiddenIframe: "removeHiddenIframe",
  /**
   * Cache operations
   */
  ClearTokensAndKeysWithClaims: "clearTokensAndKeysWithClaims",
  CacheManagerGetRefreshToken: "cacheManagerGetRefreshToken",
  ImportExistingCache: "importExistingCache",
  SetUserData: "setUserData",
  LocalStorageUpdated: "localStorageUpdated",
  /**
   * Crypto Operations
   */
  GeneratePkceCodes: "generatePkceCodes",
  GenerateCodeVerifier: "generateCodeVerifier",
  GenerateCodeChallengeFromVerifier: "generateCodeChallengeFromVerifier",
  Sha256Digest: "sha256Digest",
  GetRandomValues: "getRandomValues",
  GenerateHKDF: "generateHKDF",
  GenerateBaseKey: "generateBaseKey",
  Base64Decode: "base64Decode",
  UrlEncodeArr: "urlEncodeArr",
  Encrypt: "encrypt",
  Decrypt: "decrypt",
  GenerateEarKey: "generateEarKey",
  DecryptEarResponse: "decryptEarResponse",
  LoadExternalTokens: "LoadExternalTokens",
  LoadAccount: "loadAccount",
  LoadIdToken: "loadIdToken",
  LoadAccessToken: "loadAccessToken",
  LoadRefreshToken: "loadRefreshToken",
  /**
   * SSO capability verification call (msal-browser).
   * Fire-and-forget SSO verification call made after interactive authentication completes.
   */
  SsoCapable: "ssoCapable"
};
const PerformanceEventStatus = {
  InProgress: 1
};
class StubPerformanceMeasurement {
  startMeasurement() {
    return;
  }
  endMeasurement() {
    return;
  }
  flushMeasurement() {
    return null;
  }
}
class StubPerformanceClient {
  generateId() {
    return "callback-id";
  }
  startMeasurement(measureName, correlationId) {
    return {
      end: () => null,
      discard: () => {
      },
      add: () => {
      },
      increment: () => {
      },
      event: {
        eventId: this.generateId(),
        status: PerformanceEventStatus.InProgress,
        authority: "",
        libraryName: "",
        libraryVersion: "",
        clientId: "",
        name: measureName,
        startTimeMs: Date.now(),
        correlationId: correlationId || ""
      },
      measurement: new StubPerformanceMeasurement()
    };
  }
  startPerformanceMeasurement() {
    return new StubPerformanceMeasurement();
  }
  calculateQueuedTime() {
    return 0;
  }
  addQueueMeasurement() {
    return;
  }
  setPreQueueTime() {
    return;
  }
  endMeasurement() {
    return null;
  }
  discardMeasurements() {
    return;
  }
  removePerformanceCallback() {
    return true;
  }
  addPerformanceCallback() {
    return "";
  }
  emitEvents() {
    return;
  }
  addFields() {
    return;
  }
  incrementFields() {
    return;
  }
  cacheEventByCorrelationId() {
    return;
  }
}
const DEFAULT_SYSTEM_OPTIONS$1 = {
  tokenRenewalOffsetSeconds: DEFAULT_TOKEN_RENEWAL_OFFSET_SEC,
  preventCorsPreflight: false
};
const DEFAULT_LOGGER_IMPLEMENTATION = {
  loggerCallback: () => {
  },
  piiLoggingEnabled: false,
  logLevel: LogLevel.Info,
  correlationId: Constants$1.EMPTY_STRING
};
const DEFAULT_CACHE_OPTIONS$1 = {
  claimsBasedCachingEnabled: false
};
const DEFAULT_NETWORK_IMPLEMENTATION = {
  async sendGetRequestAsync() {
    throw createClientAuthError(methodNotImplemented);
  },
  async sendPostRequestAsync() {
    throw createClientAuthError(methodNotImplemented);
  }
};
const DEFAULT_LIBRARY_INFO = {
  sku: Constants$1.SKU,
  version: version$1,
  cpu: Constants$1.EMPTY_STRING,
  os: Constants$1.EMPTY_STRING
};
const DEFAULT_CLIENT_CREDENTIALS = {
  clientSecret: Constants$1.EMPTY_STRING,
  clientAssertion: void 0
};
const DEFAULT_AZURE_CLOUD_OPTIONS = {
  azureCloudInstance: AzureCloudInstance.None,
  tenant: `${Constants$1.DEFAULT_COMMON_TENANT}`
};
const DEFAULT_TELEMETRY_OPTIONS$1 = {
  application: {
    appName: "",
    appVersion: ""
  }
};
function buildClientConfiguration({ authOptions: userAuthOptions, systemOptions: userSystemOptions, loggerOptions: userLoggerOption, cacheOptions: userCacheOptions, storageInterface: storageImplementation, networkInterface: networkImplementation, cryptoInterface: cryptoImplementation, clientCredentials, libraryInfo, telemetry, serverTelemetryManager, persistencePlugin, serializableCache }) {
  const loggerOptions = {
    ...DEFAULT_LOGGER_IMPLEMENTATION,
    ...userLoggerOption
  };
  return {
    authOptions: buildAuthOptions(userAuthOptions),
    systemOptions: { ...DEFAULT_SYSTEM_OPTIONS$1, ...userSystemOptions },
    loggerOptions,
    cacheOptions: { ...DEFAULT_CACHE_OPTIONS$1, ...userCacheOptions },
    storageInterface: storageImplementation || new DefaultStorageClass(userAuthOptions.clientId, DEFAULT_CRYPTO_IMPLEMENTATION, new Logger(loggerOptions), new StubPerformanceClient()),
    networkInterface: networkImplementation || DEFAULT_NETWORK_IMPLEMENTATION,
    cryptoInterface: cryptoImplementation || DEFAULT_CRYPTO_IMPLEMENTATION,
    clientCredentials: clientCredentials || DEFAULT_CLIENT_CREDENTIALS,
    libraryInfo: { ...DEFAULT_LIBRARY_INFO, ...libraryInfo },
    telemetry: { ...DEFAULT_TELEMETRY_OPTIONS$1, ...telemetry },
    serverTelemetryManager: serverTelemetryManager || null,
    persistencePlugin: persistencePlugin || null,
    serializableCache: serializableCache || null
  };
}
function buildAuthOptions(authOptions) {
  return {
    clientCapabilities: [],
    azureCloudOptions: DEFAULT_AZURE_CLOUD_OPTIONS,
    skipAuthorityMetadataCache: false,
    instanceAware: false,
    encodeExtraQueryParams: false,
    ...authOptions
  };
}
function isOidcProtocolMode(config) {
  return config.authOptions.authority.options.protocolMode === ProtocolMode.OIDC;
}
const CcsCredentialType = {
  HOME_ACCOUNT_ID: "home_account_id",
  UPN: "UPN"
};
const CLIENT_ID = "client_id";
const REDIRECT_URI = "redirect_uri";
const RESPONSE_TYPE = "response_type";
const RESPONSE_MODE = "response_mode";
const GRANT_TYPE = "grant_type";
const CLAIMS = "claims";
const SCOPE = "scope";
const REFRESH_TOKEN = "refresh_token";
const STATE = "state";
const NONCE = "nonce";
const PROMPT = "prompt";
const CODE = "code";
const CODE_CHALLENGE = "code_challenge";
const CODE_CHALLENGE_METHOD = "code_challenge_method";
const CODE_VERIFIER = "code_verifier";
const CLIENT_REQUEST_ID = "client-request-id";
const X_CLIENT_SKU = "x-client-SKU";
const X_CLIENT_VER = "x-client-VER";
const X_CLIENT_OS = "x-client-OS";
const X_CLIENT_CPU = "x-client-CPU";
const X_CLIENT_CURR_TELEM = "x-client-current-telemetry";
const X_CLIENT_LAST_TELEM = "x-client-last-telemetry";
const X_MS_LIB_CAPABILITY = "x-ms-lib-capability";
const X_APP_NAME = "x-app-name";
const X_APP_VER = "x-app-ver";
const POST_LOGOUT_URI = "post_logout_redirect_uri";
const ID_TOKEN_HINT = "id_token_hint";
const DEVICE_CODE = "device_code";
const CLIENT_SECRET = "client_secret";
const CLIENT_ASSERTION = "client_assertion";
const CLIENT_ASSERTION_TYPE = "client_assertion_type";
const TOKEN_TYPE = "token_type";
const REQ_CNF = "req_cnf";
const RETURN_SPA_CODE = "return_spa_code";
const LOGOUT_HINT = "logout_hint";
const SID = "sid";
const LOGIN_HINT = "login_hint";
const DOMAIN_HINT = "domain_hint";
const X_CLIENT_EXTRA_SKU = "x-client-xtra-sku";
const BROKER_CLIENT_ID = "brk_client_id";
const BROKER_REDIRECT_URI = "brk_redirect_uri";
const INSTANCE_AWARE = "instance_aware";
const CLI_DATA = "clidata";
function instrumentBrokerParams(parameters, correlationId, performanceClient) {
  if (!correlationId) {
    return;
  }
  const clientId = parameters.get(CLIENT_ID);
  if (clientId && parameters.has(BROKER_CLIENT_ID)) {
    performanceClient?.addFields({
      embeddedClientId: clientId,
      embeddedRedirectUri: parameters.get(REDIRECT_URI)
    }, correlationId);
  }
}
function addResponseType(parameters, responseType) {
  parameters.set(RESPONSE_TYPE, responseType);
}
function addResponseMode(parameters, responseMode) {
  parameters.set(RESPONSE_MODE, responseMode ? responseMode : ResponseMode.QUERY);
}
function addScopes(parameters, scopes2, addOidcScopes = true, defaultScopes = OIDC_DEFAULT_SCOPES) {
  if (addOidcScopes && !defaultScopes.includes("openid") && !scopes2.includes("openid")) {
    defaultScopes.push("openid");
  }
  const requestScopes = addOidcScopes ? [...scopes2 || [], ...defaultScopes] : scopes2 || [];
  const scopeSet = new ScopeSet(requestScopes);
  parameters.set(SCOPE, scopeSet.printScopes());
}
function addClientId(parameters, clientId) {
  parameters.set(CLIENT_ID, clientId);
}
function addRedirectUri(parameters, redirectUri) {
  parameters.set(REDIRECT_URI, redirectUri);
}
function addPostLogoutRedirectUri(parameters, redirectUri) {
  parameters.set(POST_LOGOUT_URI, redirectUri);
}
function addIdTokenHint(parameters, idTokenHint) {
  parameters.set(ID_TOKEN_HINT, idTokenHint);
}
function addDomainHint(parameters, domainHint) {
  parameters.set(DOMAIN_HINT, domainHint);
}
function addLoginHint(parameters, loginHint) {
  parameters.set(LOGIN_HINT, loginHint);
}
function addCcsUpn(parameters, loginHint) {
  parameters.set(HeaderNames.CCS_HEADER, `UPN:${loginHint}`);
}
function addCcsOid(parameters, clientInfo) {
  parameters.set(HeaderNames.CCS_HEADER, `Oid:${clientInfo.uid}@${clientInfo.utid}`);
}
function addSid(parameters, sid) {
  parameters.set(SID, sid);
}
function addClaims(parameters, claims, clientCapabilities) {
  const mergedClaims = addClientCapabilitiesToClaims(claims, clientCapabilities);
  try {
    JSON.parse(mergedClaims);
  } catch (e) {
    throw createClientConfigurationError(invalidClaims);
  }
  parameters.set(CLAIMS, mergedClaims);
}
function addCorrelationId(parameters, correlationId) {
  parameters.set(CLIENT_REQUEST_ID, correlationId);
}
function addLibraryInfo(parameters, libraryInfo) {
  parameters.set(X_CLIENT_SKU, libraryInfo.sku);
  parameters.set(X_CLIENT_VER, libraryInfo.version);
  if (libraryInfo.os) {
    parameters.set(X_CLIENT_OS, libraryInfo.os);
  }
  if (libraryInfo.cpu) {
    parameters.set(X_CLIENT_CPU, libraryInfo.cpu);
  }
}
function addApplicationTelemetry(parameters, appTelemetry) {
  if (appTelemetry?.appName) {
    parameters.set(X_APP_NAME, appTelemetry.appName);
  }
  if (appTelemetry?.appVersion) {
    parameters.set(X_APP_VER, appTelemetry.appVersion);
  }
}
function addPrompt(parameters, prompt) {
  parameters.set(PROMPT, prompt);
}
function addState(parameters, state) {
  if (state) {
    parameters.set(STATE, state);
  }
}
function addNonce(parameters, nonce) {
  parameters.set(NONCE, nonce);
}
function addCodeChallengeParams(parameters, codeChallenge, codeChallengeMethod) {
  if (codeChallenge && codeChallengeMethod) {
    parameters.set(CODE_CHALLENGE, codeChallenge);
    parameters.set(CODE_CHALLENGE_METHOD, codeChallengeMethod);
  } else {
    throw createClientConfigurationError(pkceParamsMissing);
  }
}
function addAuthorizationCode(parameters, code) {
  parameters.set(CODE, code);
}
function addDeviceCode(parameters, code) {
  parameters.set(DEVICE_CODE, code);
}
function addRefreshToken(parameters, refreshToken) {
  parameters.set(REFRESH_TOKEN, refreshToken);
}
function addCodeVerifier(parameters, codeVerifier) {
  parameters.set(CODE_VERIFIER, codeVerifier);
}
function addClientSecret(parameters, clientSecret) {
  parameters.set(CLIENT_SECRET, clientSecret);
}
function addClientAssertion(parameters, clientAssertion) {
  if (clientAssertion) {
    parameters.set(CLIENT_ASSERTION, clientAssertion);
  }
}
function addClientAssertionType(parameters, clientAssertionType) {
  if (clientAssertionType) {
    parameters.set(CLIENT_ASSERTION_TYPE, clientAssertionType);
  }
}
function addGrantType(parameters, grantType) {
  parameters.set(GRANT_TYPE, grantType);
}
function addClientInfo(parameters) {
  parameters.set(CLIENT_INFO, "1");
}
function addCliData(parameters) {
  parameters.set(CLI_DATA, "1");
}
function addInstanceAware(parameters) {
  if (!parameters.has(INSTANCE_AWARE)) {
    parameters.set(INSTANCE_AWARE, "true");
  }
}
function addExtraQueryParameters(parameters, eQParams) {
  Object.entries(eQParams).forEach(([key, value]) => {
    if (!parameters.has(key) && value) {
      parameters.set(key, value);
    }
  });
}
function addClientCapabilitiesToClaims(claims, clientCapabilities) {
  let mergedClaims;
  if (!claims) {
    mergedClaims = {};
  } else {
    try {
      mergedClaims = JSON.parse(claims);
    } catch (e) {
      throw createClientConfigurationError(invalidClaims);
    }
  }
  if (clientCapabilities && clientCapabilities.length > 0) {
    if (!mergedClaims.hasOwnProperty(ClaimsRequestKeys.ACCESS_TOKEN)) {
      mergedClaims[ClaimsRequestKeys.ACCESS_TOKEN] = {};
    }
    mergedClaims[ClaimsRequestKeys.ACCESS_TOKEN][ClaimsRequestKeys.XMS_CC] = {
      values: clientCapabilities
    };
  }
  return JSON.stringify(mergedClaims);
}
function addUsername(parameters, username) {
  parameters.set(PasswordGrantConstants.username, username);
}
function addPassword(parameters, password) {
  parameters.set(PasswordGrantConstants.password, password);
}
function addPopToken(parameters, cnfString) {
  if (cnfString) {
    parameters.set(TOKEN_TYPE, AuthenticationScheme.POP);
    parameters.set(REQ_CNF, cnfString);
  }
}
function addSshJwk(parameters, sshJwkString) {
  if (sshJwkString) {
    parameters.set(TOKEN_TYPE, AuthenticationScheme.SSH);
    parameters.set(REQ_CNF, sshJwkString);
  }
}
function addServerTelemetry(parameters, serverTelemetryManager) {
  parameters.set(X_CLIENT_CURR_TELEM, serverTelemetryManager.generateCurrentRequestHeaderValue());
  parameters.set(X_CLIENT_LAST_TELEM, serverTelemetryManager.generateLastRequestHeaderValue());
}
function addThrottling(parameters) {
  parameters.set(X_MS_LIB_CAPABILITY, ThrottlingConstants.X_MS_LIB_CAPABILITY_VALUE);
}
function addLogoutHint(parameters, logoutHint) {
  parameters.set(LOGOUT_HINT, logoutHint);
}
function addBrokerParameters(parameters, brokerClientId, brokerRedirectUri) {
  if (!parameters.has(BROKER_CLIENT_ID)) {
    parameters.set(BROKER_CLIENT_ID, brokerClientId);
  }
  if (!parameters.has(BROKER_REDIRECT_URI)) {
    parameters.set(BROKER_REDIRECT_URI, brokerRedirectUri);
  }
}
function isOpenIdConfigResponse(response) {
  return response.hasOwnProperty("authorization_endpoint") && response.hasOwnProperty("token_endpoint") && response.hasOwnProperty("issuer") && response.hasOwnProperty("jwks_uri");
}
function isCloudInstanceDiscoveryResponse(response) {
  return response.hasOwnProperty("tenant_discovery_endpoint") && response.hasOwnProperty("metadata");
}
function isCloudInstanceDiscoveryErrorResponse(response) {
  return response.hasOwnProperty("error") && response.hasOwnProperty("error_description");
}
const invoke = (callback, eventName, logger, telemetryClient, correlationId) => {
  return (...args) => {
    logger.trace(`Executing function ${eventName}`);
    const inProgressEvent = telemetryClient?.startMeasurement(eventName, correlationId);
    if (correlationId) {
      const eventCount = eventName + "CallCount";
      telemetryClient?.incrementFields({ [eventCount]: 1 }, correlationId);
    }
    try {
      const result = callback(...args);
      inProgressEvent?.end({
        success: true
      });
      logger.trace(`Returning result from ${eventName}`);
      return result;
    } catch (e) {
      logger.trace(`Error occurred in ${eventName}`);
      try {
        logger.trace(JSON.stringify(e));
      } catch (e2) {
        logger.trace("Unable to print error message.");
      }
      inProgressEvent?.end({
        success: false
      }, e);
      throw e;
    }
  };
};
const invokeAsync = (callback, eventName, logger, telemetryClient, correlationId) => {
  return (...args) => {
    logger.trace(`Executing function ${eventName}`);
    const inProgressEvent = telemetryClient?.startMeasurement(eventName, correlationId);
    if (correlationId) {
      const eventCount = eventName + "CallCount";
      telemetryClient?.incrementFields({ [eventCount]: 1 }, correlationId);
    }
    telemetryClient?.setPreQueueTime(eventName, correlationId);
    return callback(...args).then((response) => {
      logger.trace(`Returning result from ${eventName}`);
      inProgressEvent?.end({
        success: true
      });
      return response;
    }).catch((e) => {
      logger.trace(`Error occurred in ${eventName}`);
      try {
        logger.trace(JSON.stringify(e));
      } catch (e2) {
        logger.trace("Unable to print error message.");
      }
      inProgressEvent?.end({
        success: false
      }, e);
      throw e;
    });
  };
};
class RegionDiscovery {
  constructor(networkInterface, logger, performanceClient, correlationId) {
    this.networkInterface = networkInterface;
    this.logger = logger;
    this.performanceClient = performanceClient;
    this.correlationId = correlationId;
  }
  /**
   * Detect the region from the application's environment.
   *
   * @returns Promise<string | null>
   */
  async detectRegion(environmentRegion, regionDiscoveryMetadata) {
    this.performanceClient?.addQueueMeasurement(PerformanceEvents.RegionDiscoveryDetectRegion, this.correlationId);
    let autodetectedRegionName = environmentRegion;
    if (!autodetectedRegionName) {
      const options = RegionDiscovery.IMDS_OPTIONS;
      try {
        const localIMDSVersionResponse = await invokeAsync(this.getRegionFromIMDS.bind(this), PerformanceEvents.RegionDiscoveryGetRegionFromIMDS, this.logger, this.performanceClient, this.correlationId)(Constants$1.IMDS_VERSION, options);
        if (localIMDSVersionResponse.status === HttpStatus.SUCCESS) {
          autodetectedRegionName = localIMDSVersionResponse.body;
          regionDiscoveryMetadata.region_source = RegionDiscoverySources.IMDS;
        }
        if (localIMDSVersionResponse.status === HttpStatus.BAD_REQUEST) {
          const currentIMDSVersion = await invokeAsync(this.getCurrentVersion.bind(this), PerformanceEvents.RegionDiscoveryGetCurrentVersion, this.logger, this.performanceClient, this.correlationId)(options);
          if (!currentIMDSVersion) {
            regionDiscoveryMetadata.region_source = RegionDiscoverySources.FAILED_AUTO_DETECTION;
            return null;
          }
          const currentIMDSVersionResponse = await invokeAsync(this.getRegionFromIMDS.bind(this), PerformanceEvents.RegionDiscoveryGetRegionFromIMDS, this.logger, this.performanceClient, this.correlationId)(currentIMDSVersion, options);
          if (currentIMDSVersionResponse.status === HttpStatus.SUCCESS) {
            autodetectedRegionName = currentIMDSVersionResponse.body;
            regionDiscoveryMetadata.region_source = RegionDiscoverySources.IMDS;
          }
        }
      } catch (e) {
        regionDiscoveryMetadata.region_source = RegionDiscoverySources.FAILED_AUTO_DETECTION;
        return null;
      }
    } else {
      regionDiscoveryMetadata.region_source = RegionDiscoverySources.ENVIRONMENT_VARIABLE;
    }
    if (!autodetectedRegionName) {
      regionDiscoveryMetadata.region_source = RegionDiscoverySources.FAILED_AUTO_DETECTION;
    }
    return autodetectedRegionName || null;
  }
  /**
   * Make the call to the IMDS endpoint
   *
   * @param imdsEndpointUrl
   * @returns Promise<NetworkResponse<string>>
   */
  async getRegionFromIMDS(version2, options) {
    this.performanceClient?.addQueueMeasurement(PerformanceEvents.RegionDiscoveryGetRegionFromIMDS, this.correlationId);
    return this.networkInterface.sendGetRequestAsync(`${Constants$1.IMDS_ENDPOINT}?api-version=${version2}&format=text`, options, Constants$1.IMDS_TIMEOUT);
  }
  /**
   * Get the most recent version of the IMDS endpoint available
   *
   * @returns Promise<string | null>
   */
  async getCurrentVersion(options) {
    this.performanceClient?.addQueueMeasurement(PerformanceEvents.RegionDiscoveryGetCurrentVersion, this.correlationId);
    try {
      const response = await this.networkInterface.sendGetRequestAsync(`${Constants$1.IMDS_ENDPOINT}?format=json`, options);
      if (response.status === HttpStatus.BAD_REQUEST && response.body && response.body["newest-versions"] && response.body["newest-versions"].length > 0) {
        return response.body["newest-versions"][0];
      }
      return null;
    } catch (e) {
      return null;
    }
  }
}
RegionDiscovery.IMDS_OPTIONS = {
  headers: {
    Metadata: "true"
  }
};
function nowSeconds() {
  return Math.round((/* @__PURE__ */ new Date()).getTime() / 1e3);
}
function toDateFromSeconds(seconds) {
  if (seconds) {
    return new Date(Number(seconds) * 1e3);
  }
  return /* @__PURE__ */ new Date();
}
function isTokenExpired(expiresOn, offset) {
  const expirationSec = Number(expiresOn) || 0;
  const offsetCurrentTimeSec = nowSeconds() + offset;
  return offsetCurrentTimeSec > expirationSec;
}
function wasClockTurnedBack(cachedAt) {
  const cachedAtSec = Number(cachedAt);
  return cachedAtSec > nowSeconds();
}
function delay(t, value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), t));
}
function createIdTokenEntity(homeAccountId, environment, idToken, clientId, tenantId) {
  const idTokenEntity = {
    credentialType: CredentialType.ID_TOKEN,
    homeAccountId,
    environment,
    clientId,
    secret: idToken,
    realm: tenantId,
    lastUpdatedAt: Date.now().toString()
    // Set the last updated time to now
  };
  return idTokenEntity;
}
function createAccessTokenEntity(homeAccountId, environment, accessToken, clientId, tenantId, scopes2, expiresOn, extExpiresOn, base64Decode, refreshOn, tokenType, userAssertionHash, keyId, requestedClaims, requestedClaimsHash) {
  const atEntity = {
    homeAccountId,
    credentialType: CredentialType.ACCESS_TOKEN,
    secret: accessToken,
    cachedAt: nowSeconds().toString(),
    expiresOn: expiresOn.toString(),
    extendedExpiresOn: extExpiresOn.toString(),
    environment,
    clientId,
    realm: tenantId,
    target: scopes2,
    tokenType: tokenType || AuthenticationScheme.BEARER,
    lastUpdatedAt: Date.now().toString()
    // Set the last updated time to now
  };
  if (userAssertionHash) {
    atEntity.userAssertionHash = userAssertionHash;
  }
  if (refreshOn) {
    atEntity.refreshOn = refreshOn.toString();
  }
  if (requestedClaims) {
    atEntity.requestedClaims = requestedClaims;
    atEntity.requestedClaimsHash = requestedClaimsHash;
  }
  if (atEntity.tokenType?.toLowerCase() !== AuthenticationScheme.BEARER.toLowerCase()) {
    atEntity.credentialType = CredentialType.ACCESS_TOKEN_WITH_AUTH_SCHEME;
    switch (atEntity.tokenType) {
      case AuthenticationScheme.POP:
        const tokenClaims = extractTokenClaims(accessToken, base64Decode);
        if (!tokenClaims?.cnf?.kid) {
          throw createClientAuthError(tokenClaimsCnfRequiredForSignedJwt);
        }
        atEntity.keyId = tokenClaims.cnf.kid;
        break;
      case AuthenticationScheme.SSH:
        atEntity.keyId = keyId;
    }
  }
  return atEntity;
}
function createRefreshTokenEntity(homeAccountId, environment, refreshToken, clientId, familyId, userAssertionHash, expiresOn) {
  const rtEntity = {
    credentialType: CredentialType.REFRESH_TOKEN,
    homeAccountId,
    environment,
    clientId,
    secret: refreshToken,
    lastUpdatedAt: Date.now().toString()
  };
  if (userAssertionHash) {
    rtEntity.userAssertionHash = userAssertionHash;
  }
  if (familyId) {
    rtEntity.familyId = familyId;
  }
  if (expiresOn) {
    rtEntity.expiresOn = expiresOn.toString();
  }
  return rtEntity;
}
function isCredentialEntity(entity) {
  return entity.hasOwnProperty("homeAccountId") && entity.hasOwnProperty("environment") && entity.hasOwnProperty("credentialType") && entity.hasOwnProperty("clientId") && entity.hasOwnProperty("secret");
}
function isAccessTokenEntity(entity) {
  if (!entity) {
    return false;
  }
  return isCredentialEntity(entity) && entity.hasOwnProperty("realm") && entity.hasOwnProperty("target") && (entity["credentialType"] === CredentialType.ACCESS_TOKEN || entity["credentialType"] === CredentialType.ACCESS_TOKEN_WITH_AUTH_SCHEME);
}
function isIdTokenEntity(entity) {
  if (!entity) {
    return false;
  }
  return isCredentialEntity(entity) && entity.hasOwnProperty("realm") && entity["credentialType"] === CredentialType.ID_TOKEN;
}
function isRefreshTokenEntity(entity) {
  if (!entity) {
    return false;
  }
  return isCredentialEntity(entity) && entity["credentialType"] === CredentialType.REFRESH_TOKEN;
}
function isServerTelemetryEntity(key, entity) {
  const validateKey = key.indexOf(SERVER_TELEM_CONSTANTS.CACHE_KEY) === 0;
  let validateEntity = true;
  if (entity) {
    validateEntity = entity.hasOwnProperty("failedRequests") && entity.hasOwnProperty("errors") && entity.hasOwnProperty("cacheHits");
  }
  return validateKey && validateEntity;
}
function isThrottlingEntity(key, entity) {
  let validateKey = false;
  if (key) {
    validateKey = key.indexOf(ThrottlingConstants.THROTTLING_PREFIX) === 0;
  }
  let validateEntity = true;
  if (entity) {
    validateEntity = entity.hasOwnProperty("throttleTime");
  }
  return validateKey && validateEntity;
}
function generateAppMetadataKey({ environment, clientId }) {
  const appMetaDataKeyArray = [
    APP_METADATA,
    environment,
    clientId
  ];
  return appMetaDataKeyArray.join(Separators.CACHE_KEY_SEPARATOR).toLowerCase();
}
function isAppMetadataEntity(key, entity) {
  if (!entity) {
    return false;
  }
  return key.indexOf(APP_METADATA) === 0 && entity.hasOwnProperty("clientId") && entity.hasOwnProperty("environment");
}
function isAuthorityMetadataEntity(key, entity) {
  if (!entity) {
    return false;
  }
  return key.indexOf(AUTHORITY_METADATA_CONSTANTS.CACHE_KEY) === 0 && entity.hasOwnProperty("aliases") && entity.hasOwnProperty("preferred_cache") && entity.hasOwnProperty("preferred_network") && entity.hasOwnProperty("canonical_authority") && entity.hasOwnProperty("authorization_endpoint") && entity.hasOwnProperty("token_endpoint") && entity.hasOwnProperty("issuer") && entity.hasOwnProperty("aliasesFromNetwork") && entity.hasOwnProperty("endpointsFromNetwork") && entity.hasOwnProperty("expiresAt") && entity.hasOwnProperty("jwks_uri");
}
function generateAuthorityMetadataExpiresAt() {
  return nowSeconds() + AUTHORITY_METADATA_CONSTANTS.REFRESH_TIME_SECONDS;
}
function updateAuthorityEndpointMetadata(authorityMetadata, updatedValues, fromNetwork) {
  authorityMetadata.authorization_endpoint = updatedValues.authorization_endpoint;
  authorityMetadata.token_endpoint = updatedValues.token_endpoint;
  authorityMetadata.end_session_endpoint = updatedValues.end_session_endpoint;
  authorityMetadata.issuer = updatedValues.issuer;
  authorityMetadata.endpointsFromNetwork = fromNetwork;
  authorityMetadata.jwks_uri = updatedValues.jwks_uri;
}
function updateCloudDiscoveryMetadata(authorityMetadata, updatedValues, fromNetwork) {
  authorityMetadata.aliases = updatedValues.aliases;
  authorityMetadata.preferred_cache = updatedValues.preferred_cache;
  authorityMetadata.preferred_network = updatedValues.preferred_network;
  authorityMetadata.aliasesFromNetwork = fromNetwork;
}
function isAuthorityMetadataExpired(metadata) {
  return metadata.expiresAt <= nowSeconds();
}
class Authority {
  constructor(authority, networkInterface, cacheManager, authorityOptions, logger, correlationId, performanceClient, managedIdentity) {
    this.canonicalAuthority = authority;
    this._canonicalAuthority.validateAsUri();
    this.networkInterface = networkInterface;
    this.cacheManager = cacheManager;
    this.authorityOptions = authorityOptions;
    this.regionDiscoveryMetadata = {
      region_used: void 0,
      region_source: void 0,
      region_outcome: void 0
    };
    this.logger = logger;
    this.performanceClient = performanceClient;
    this.correlationId = correlationId;
    this.managedIdentity = managedIdentity || false;
    this.regionDiscovery = new RegionDiscovery(networkInterface, this.logger, this.performanceClient, this.correlationId);
  }
  /**
   * Get {@link AuthorityType}
   * @param authorityUri {@link IUri}
   * @private
   */
  getAuthorityType(authorityUri) {
    if (authorityUri.HostNameAndPort.endsWith(Constants$1.CIAM_AUTH_URL)) {
      return AuthorityType.Ciam;
    }
    const pathSegments = authorityUri.PathSegments;
    if (pathSegments.length) {
      switch (pathSegments[0].toLowerCase()) {
        case Constants$1.ADFS:
          return AuthorityType.Adfs;
        case Constants$1.DSTS:
          return AuthorityType.Dsts;
      }
    }
    return AuthorityType.Default;
  }
  // See above for AuthorityType
  get authorityType() {
    return this.getAuthorityType(this.canonicalAuthorityUrlComponents);
  }
  /**
   * ProtocolMode enum representing the way endpoints are constructed.
   */
  get protocolMode() {
    return this.authorityOptions.protocolMode;
  }
  /**
   * Returns authorityOptions which can be used to reinstantiate a new authority instance
   */
  get options() {
    return this.authorityOptions;
  }
  /**
   * A URL that is the authority set by the developer
   */
  get canonicalAuthority() {
    return this._canonicalAuthority.urlString;
  }
  /**
   * Sets canonical authority.
   */
  set canonicalAuthority(url2) {
    this._canonicalAuthority = new UrlString(url2);
    this._canonicalAuthority.validateAsUri();
    this._canonicalAuthorityUrlComponents = null;
  }
  /**
   * Get authority components.
   */
  get canonicalAuthorityUrlComponents() {
    if (!this._canonicalAuthorityUrlComponents) {
      this._canonicalAuthorityUrlComponents = this._canonicalAuthority.getUrlComponents();
    }
    return this._canonicalAuthorityUrlComponents;
  }
  /**
   * Get hostname and port i.e. login.microsoftonline.com
   */
  get hostnameAndPort() {
    return this.canonicalAuthorityUrlComponents.HostNameAndPort.toLowerCase();
  }
  /**
   * Get tenant for authority.
   */
  get tenant() {
    return this.canonicalAuthorityUrlComponents.PathSegments[0];
  }
  /**
   * OAuth /authorize endpoint for requests
   */
  get authorizationEndpoint() {
    if (this.discoveryComplete()) {
      return this.replacePath(this.metadata.authorization_endpoint);
    } else {
      throw createClientAuthError(endpointResolutionError);
    }
  }
  /**
   * OAuth /token endpoint for requests
   */
  get tokenEndpoint() {
    if (this.discoveryComplete()) {
      return this.replacePath(this.metadata.token_endpoint);
    } else {
      throw createClientAuthError(endpointResolutionError);
    }
  }
  get deviceCodeEndpoint() {
    if (this.discoveryComplete()) {
      return this.replacePath(this.metadata.token_endpoint.replace("/token", "/devicecode"));
    } else {
      throw createClientAuthError(endpointResolutionError);
    }
  }
  /**
   * OAuth logout endpoint for requests
   */
  get endSessionEndpoint() {
    if (this.discoveryComplete()) {
      if (!this.metadata.end_session_endpoint) {
        throw createClientAuthError(endSessionEndpointNotSupported);
      }
      return this.replacePath(this.metadata.end_session_endpoint);
    } else {
      throw createClientAuthError(endpointResolutionError);
    }
  }
  /**
   * OAuth issuer for requests
   */
  get selfSignedJwtAudience() {
    if (this.discoveryComplete()) {
      return this.replacePath(this.metadata.issuer);
    } else {
      throw createClientAuthError(endpointResolutionError);
    }
  }
  /**
   * Jwks_uri for token signing keys
   */
  get jwksUri() {
    if (this.discoveryComplete()) {
      return this.replacePath(this.metadata.jwks_uri);
    } else {
      throw createClientAuthError(endpointResolutionError);
    }
  }
  /**
   * Returns a flag indicating that tenant name can be replaced in authority {@link IUri}
   * @param authorityUri {@link IUri}
   * @private
   */
  canReplaceTenant(authorityUri) {
    return authorityUri.PathSegments.length === 1 && !Authority.reservedTenantDomains.has(authorityUri.PathSegments[0]) && this.getAuthorityType(authorityUri) === AuthorityType.Default && this.protocolMode !== ProtocolMode.OIDC;
  }
  /**
   * Replaces tenant in url path with current tenant. Defaults to common.
   * @param urlString
   */
  replaceTenant(urlString) {
    return urlString.replace(/{tenant}|{tenantid}/g, this.tenant);
  }
  /**
   * Replaces path such as tenant or policy with the current tenant or policy.
   * @param urlString
   */
  replacePath(urlString) {
    let endpoint = urlString;
    const cachedAuthorityUrl = new UrlString(this.metadata.canonical_authority);
    const cachedAuthorityUrlComponents = cachedAuthorityUrl.getUrlComponents();
    const cachedAuthorityParts = cachedAuthorityUrlComponents.PathSegments;
    const currentAuthorityParts = this.canonicalAuthorityUrlComponents.PathSegments;
    currentAuthorityParts.forEach((currentPart, index) => {
      let cachedPart = cachedAuthorityParts[index];
      if (index === 0 && this.canReplaceTenant(cachedAuthorityUrlComponents)) {
        const tenantId = new UrlString(this.metadata.authorization_endpoint).getUrlComponents().PathSegments[0];
        if (cachedPart !== tenantId) {
          this.logger.verbose(`Replacing tenant domain name ${cachedPart} with id ${tenantId}`);
          cachedPart = tenantId;
        }
      }
      if (currentPart !== cachedPart) {
        endpoint = endpoint.replace(`/${cachedPart}/`, `/${currentPart}/`);
      }
    });
    return this.replaceTenant(endpoint);
  }
  /**
   * The default open id configuration endpoint for any canonical authority.
   */
  get defaultOpenIdConfigurationEndpoint() {
    const canonicalAuthorityHost = this.hostnameAndPort;
    if (this.canonicalAuthority.endsWith("v2.0/") || this.authorityType === AuthorityType.Adfs || this.protocolMode === ProtocolMode.OIDC && !this.isAliasOfKnownMicrosoftAuthority(canonicalAuthorityHost)) {
      return `${this.canonicalAuthority}.well-known/openid-configuration`;
    }
    return `${this.canonicalAuthority}v2.0/.well-known/openid-configuration`;
  }
  /**
   * Boolean that returns whether or not tenant discovery has been completed.
   */
  discoveryComplete() {
    return !!this.metadata;
  }
  /**
   * Perform endpoint discovery to discover aliases, preferred_cache, preferred_network
   * and the /authorize, /token and logout endpoints.
   */
  async resolveEndpointsAsync() {
    this.performanceClient?.addQueueMeasurement(PerformanceEvents.AuthorityResolveEndpointsAsync, this.correlationId);
    const metadataEntity = this.getCurrentMetadataEntity();
    const cloudDiscoverySource = await invokeAsync(this.updateCloudDiscoveryMetadata.bind(this), PerformanceEvents.AuthorityUpdateCloudDiscoveryMetadata, this.logger, this.performanceClient, this.correlationId)(metadataEntity);
    this.canonicalAuthority = this.canonicalAuthority.replace(this.hostnameAndPort, metadataEntity.preferred_network);
    const endpointSource = await invokeAsync(this.updateEndpointMetadata.bind(this), PerformanceEvents.AuthorityUpdateEndpointMetadata, this.logger, this.performanceClient, this.correlationId)(metadataEntity);
    this.updateCachedMetadata(metadataEntity, cloudDiscoverySource, {
      source: endpointSource
    });
    this.performanceClient?.addFields({
      cloudDiscoverySource,
      authorityEndpointSource: endpointSource
    }, this.correlationId);
  }
  /**
   * Returns metadata entity from cache if it exists, otherwiser returns a new metadata entity built
   * from the configured canonical authority
   * @returns
   */
  getCurrentMetadataEntity() {
    let metadataEntity = this.cacheManager.getAuthorityMetadataByAlias(this.hostnameAndPort);
    if (!metadataEntity) {
      metadataEntity = {
        aliases: [],
        preferred_cache: this.hostnameAndPort,
        preferred_network: this.hostnameAndPort,
        canonical_authority: this.canonicalAuthority,
        authorization_endpoint: "",
        token_endpoint: "",
        end_session_endpoint: "",
        issuer: "",
        aliasesFromNetwork: false,
        endpointsFromNetwork: false,
        expiresAt: generateAuthorityMetadataExpiresAt(),
        jwks_uri: ""
      };
    }
    return metadataEntity;
  }
  /**
   * Updates cached metadata based on metadata source and sets the instance's metadata
   * property to the same value
   * @param metadataEntity
   * @param cloudDiscoverySource
   * @param endpointMetadataResult
   */
  updateCachedMetadata(metadataEntity, cloudDiscoverySource, endpointMetadataResult) {
    if (cloudDiscoverySource !== AuthorityMetadataSource.CACHE && endpointMetadataResult?.source !== AuthorityMetadataSource.CACHE) {
      metadataEntity.expiresAt = generateAuthorityMetadataExpiresAt();
      metadataEntity.canonical_authority = this.canonicalAuthority;
    }
    const cacheKey = this.cacheManager.generateAuthorityMetadataCacheKey(metadataEntity.preferred_cache);
    this.cacheManager.setAuthorityMetadata(cacheKey, metadataEntity);
    this.metadata = metadataEntity;
  }
  /**
   * Update AuthorityMetadataEntity with new endpoints and return where the information came from
   * @param metadataEntity
   */
  async updateEndpointMetadata(metadataEntity) {
    this.performanceClient?.addQueueMeasurement(PerformanceEvents.AuthorityUpdateEndpointMetadata, this.correlationId);
    const localMetadata = this.updateEndpointMetadataFromLocalSources(metadataEntity);
    if (localMetadata) {
      if (localMetadata.source === AuthorityMetadataSource.HARDCODED_VALUES) {
        if (this.authorityOptions.azureRegionConfiguration?.azureRegion) {
          if (localMetadata.metadata) {
            const hardcodedMetadata = await invokeAsync(this.updateMetadataWithRegionalInformation.bind(this), PerformanceEvents.AuthorityUpdateMetadataWithRegionalInformation, this.logger, this.performanceClient, this.correlationId)(localMetadata.metadata);
            updateAuthorityEndpointMetadata(metadataEntity, hardcodedMetadata, false);
            metadataEntity.canonical_authority = this.canonicalAuthority;
          }
        }
      }
      return localMetadata.source;
    }
    let metadata = await invokeAsync(this.getEndpointMetadataFromNetwork.bind(this), PerformanceEvents.AuthorityGetEndpointMetadataFromNetwork, this.logger, this.performanceClient, this.correlationId)();
    if (metadata) {
      if (this.authorityOptions.azureRegionConfiguration?.azureRegion) {
        metadata = await invokeAsync(this.updateMetadataWithRegionalInformation.bind(this), PerformanceEvents.AuthorityUpdateMetadataWithRegionalInformation, this.logger, this.performanceClient, this.correlationId)(metadata);
      }
      updateAuthorityEndpointMetadata(metadataEntity, metadata, true);
      return AuthorityMetadataSource.NETWORK;
    } else {
      throw createClientAuthError(openIdConfigError, this.defaultOpenIdConfigurationEndpoint);
    }
  }
  /**
   * Updates endpoint metadata from local sources and returns where the information was retrieved from and the metadata config
   * response if the source is hardcoded metadata
   * @param metadataEntity
   * @returns
   */
  updateEndpointMetadataFromLocalSources(metadataEntity) {
    this.logger.verbose("Attempting to get endpoint metadata from authority configuration");
    const configMetadata = this.getEndpointMetadataFromConfig();
    if (configMetadata) {
      this.logger.verbose("Found endpoint metadata in authority configuration");
      updateAuthorityEndpointMetadata(metadataEntity, configMetadata, false);
      return {
        source: AuthorityMetadataSource.CONFIG
      };
    }
    this.logger.verbose("Did not find endpoint metadata in the config... Attempting to get endpoint metadata from the hardcoded values.");
    if (this.authorityOptions.skipAuthorityMetadataCache) {
      this.logger.verbose("Skipping hardcoded metadata cache since skipAuthorityMetadataCache is set to true. Attempting to get endpoint metadata from the network metadata cache.");
    } else {
      const hardcodedMetadata = this.getEndpointMetadataFromHardcodedValues();
      if (hardcodedMetadata) {
        updateAuthorityEndpointMetadata(metadataEntity, hardcodedMetadata, false);
        return {
          source: AuthorityMetadataSource.HARDCODED_VALUES,
          metadata: hardcodedMetadata
        };
      } else {
        this.logger.verbose("Did not find endpoint metadata in hardcoded values... Attempting to get endpoint metadata from the network metadata cache.");
      }
    }
    const metadataEntityExpired = isAuthorityMetadataExpired(metadataEntity);
    if (this.isAuthoritySameType(metadataEntity) && metadataEntity.endpointsFromNetwork && !metadataEntityExpired) {
      this.logger.verbose("Found endpoint metadata in the cache.");
      return { source: AuthorityMetadataSource.CACHE };
    } else if (metadataEntityExpired) {
      this.logger.verbose("The metadata entity is expired.");
    }
    return null;
  }
  /**
   * Compares the number of url components after the domain to determine if the cached
   * authority metadata can be used for the requested authority. Protects against same domain different
   * authority such as login.microsoftonline.com/tenant and login.microsoftonline.com/tfp/tenant/policy
   * @param metadataEntity
   */
  isAuthoritySameType(metadataEntity) {
    const cachedAuthorityUrl = new UrlString(metadataEntity.canonical_authority);
    const cachedParts = cachedAuthorityUrl.getUrlComponents().PathSegments;
    return cachedParts.length === this.canonicalAuthorityUrlComponents.PathSegments.length;
  }
  /**
   * Parse authorityMetadata config option
   */
  getEndpointMetadataFromConfig() {
    if (this.authorityOptions.authorityMetadata) {
      try {
        return JSON.parse(this.authorityOptions.authorityMetadata);
      } catch (e) {
        throw createClientConfigurationError(invalidAuthorityMetadata);
      }
    }
    return null;
  }
  /**
   * Gets OAuth endpoints from the given OpenID configuration endpoint.
   *
   * @param hasHardcodedMetadata boolean
   */
  async getEndpointMetadataFromNetwork() {
    this.performanceClient?.addQueueMeasurement(PerformanceEvents.AuthorityGetEndpointMetadataFromNetwork, this.correlationId);
    const options = {};
    const openIdConfigurationEndpoint = this.defaultOpenIdConfigurationEndpoint;
    this.logger.verbose(`Authority.getEndpointMetadataFromNetwork: attempting to retrieve OAuth endpoints from ${openIdConfigurationEndpoint}`);
    try {
      const response = await this.networkInterface.sendGetRequestAsync(openIdConfigurationEndpoint, options);
      const isValidResponse = isOpenIdConfigResponse(response.body);
      if (isValidResponse) {
        return response.body;
      } else {
        this.logger.verbose(`Authority.getEndpointMetadataFromNetwork: could not parse response as OpenID configuration`);
        return null;
      }
    } catch (e) {
      this.logger.verbose(`Authority.getEndpointMetadataFromNetwork: ${e}`);
      return null;
    }
  }
  /**
   * Get OAuth endpoints for common authorities.
   */
  getEndpointMetadataFromHardcodedValues() {
    if (this.hostnameAndPort in EndpointMetadata) {
      return EndpointMetadata[this.hostnameAndPort];
    }
    return null;
  }
  /**
   * Update the retrieved metadata with regional information.
   * User selected Azure region will be used if configured.
   */
  async updateMetadataWithRegionalInformation(metadata) {
    this.performanceClient?.addQueueMeasurement(PerformanceEvents.AuthorityUpdateMetadataWithRegionalInformation, this.correlationId);
    const userConfiguredAzureRegion = this.authorityOptions.azureRegionConfiguration?.azureRegion;
    if (userConfiguredAzureRegion) {
      if (userConfiguredAzureRegion !== Constants$1.AZURE_REGION_AUTO_DISCOVER_FLAG) {
        this.regionDiscoveryMetadata.region_outcome = RegionDiscoveryOutcomes.CONFIGURED_NO_AUTO_DETECTION;
        this.regionDiscoveryMetadata.region_used = userConfiguredAzureRegion;
        return Authority.replaceWithRegionalInformation(metadata, userConfiguredAzureRegion);
      }
      const autodetectedRegionName = await invokeAsync(this.regionDiscovery.detectRegion.bind(this.regionDiscovery), PerformanceEvents.RegionDiscoveryDetectRegion, this.logger, this.performanceClient, this.correlationId)(this.authorityOptions.azureRegionConfiguration?.environmentRegion, this.regionDiscoveryMetadata);
      if (autodetectedRegionName) {
        this.regionDiscoveryMetadata.region_outcome = RegionDiscoveryOutcomes.AUTO_DETECTION_REQUESTED_SUCCESSFUL;
        this.regionDiscoveryMetadata.region_used = autodetectedRegionName;
        return Authority.replaceWithRegionalInformation(metadata, autodetectedRegionName);
      }
      this.regionDiscoveryMetadata.region_outcome = RegionDiscoveryOutcomes.AUTO_DETECTION_REQUESTED_FAILED;
    }
    return metadata;
  }
  /**
   * Updates the AuthorityMetadataEntity with new aliases, preferred_network and preferred_cache
   * and returns where the information was retrieved from
   * @param metadataEntity
   * @returns AuthorityMetadataSource
   */
  async updateCloudDiscoveryMetadata(metadataEntity) {
    this.performanceClient?.addQueueMeasurement(PerformanceEvents.AuthorityUpdateCloudDiscoveryMetadata, this.correlationId);
    const localMetadataSource = this.updateCloudDiscoveryMetadataFromLocalSources(metadataEntity);
    if (localMetadataSource) {
      return localMetadataSource;
    }
    const metadata = await invokeAsync(this.getCloudDiscoveryMetadataFromNetwork.bind(this), PerformanceEvents.AuthorityGetCloudDiscoveryMetadataFromNetwork, this.logger, this.performanceClient, this.correlationId)();
    if (metadata) {
      updateCloudDiscoveryMetadata(metadataEntity, metadata, true);
      return AuthorityMetadataSource.NETWORK;
    }
    throw createClientConfigurationError(untrustedAuthority);
  }
  updateCloudDiscoveryMetadataFromLocalSources(metadataEntity) {
    this.logger.verbose("Attempting to get cloud discovery metadata  from authority configuration");
    this.logger.verbosePii(`Known Authorities: ${this.authorityOptions.knownAuthorities || Constants$1.NOT_APPLICABLE}`);
    this.logger.verbosePii(`Authority Metadata: ${this.authorityOptions.authorityMetadata || Constants$1.NOT_APPLICABLE}`);
    this.logger.verbosePii(`Canonical Authority: ${metadataEntity.canonical_authority || Constants$1.NOT_APPLICABLE}`);
    const metadata = this.getCloudDiscoveryMetadataFromConfig();
    if (metadata) {
      this.logger.verbose("Found cloud discovery metadata in authority configuration");
      updateCloudDiscoveryMetadata(metadataEntity, metadata, false);
      return AuthorityMetadataSource.CONFIG;
    }
    this.logger.verbose("Did not find cloud discovery metadata in the config... Attempting to get cloud discovery metadata from the hardcoded values.");
    if (this.options.skipAuthorityMetadataCache) {
      this.logger.verbose("Skipping hardcoded cloud discovery metadata cache since skipAuthorityMetadataCache is set to true. Attempting to get cloud discovery metadata from the network metadata cache.");
    } else {
      const hardcodedMetadata = getCloudDiscoveryMetadataFromHardcodedValues(this.hostnameAndPort);
      if (hardcodedMetadata) {
        this.logger.verbose("Found cloud discovery metadata from hardcoded values.");
        updateCloudDiscoveryMetadata(metadataEntity, hardcodedMetadata, false);
        return AuthorityMetadataSource.HARDCODED_VALUES;
      }
      this.logger.verbose("Did not find cloud discovery metadata in hardcoded values... Attempting to get cloud discovery metadata from the network metadata cache.");
    }
    const metadataEntityExpired = isAuthorityMetadataExpired(metadataEntity);
    if (this.isAuthoritySameType(metadataEntity) && metadataEntity.aliasesFromNetwork && !metadataEntityExpired) {
      this.logger.verbose("Found cloud discovery metadata in the cache.");
      return AuthorityMetadataSource.CACHE;
    } else if (metadataEntityExpired) {
      this.logger.verbose("The metadata entity is expired.");
    }
    return null;
  }
  /**
   * Parse cloudDiscoveryMetadata config or check knownAuthorities
   */
  getCloudDiscoveryMetadataFromConfig() {
    if (this.authorityType === AuthorityType.Ciam) {
      this.logger.verbose("CIAM authorities do not support cloud discovery metadata, generate the aliases from authority host.");
      return Authority.createCloudDiscoveryMetadataFromHost(this.hostnameAndPort);
    }
    if (this.authorityOptions.cloudDiscoveryMetadata) {
      this.logger.verbose("The cloud discovery metadata has been provided as a network response, in the config.");
      try {
        this.logger.verbose("Attempting to parse the cloud discovery metadata.");
        const parsedResponse = JSON.parse(this.authorityOptions.cloudDiscoveryMetadata);
        const metadata = getCloudDiscoveryMetadataFromNetworkResponse(parsedResponse.metadata, this.hostnameAndPort);
        this.logger.verbose("Parsed the cloud discovery metadata.");
        if (metadata) {
          this.logger.verbose("There is returnable metadata attached to the parsed cloud discovery metadata.");
          return metadata;
        } else {
          this.logger.verbose("There is no metadata attached to the parsed cloud discovery metadata.");
        }
      } catch (e) {
        this.logger.verbose("Unable to parse the cloud discovery metadata. Throwing Invalid Cloud Discovery Metadata Error.");
        throw createClientConfigurationError(invalidCloudDiscoveryMetadata);
      }
    }
    if (this.isInKnownAuthorities()) {
      this.logger.verbose("The host is included in knownAuthorities. Creating new cloud discovery metadata from the host.");
      return Authority.createCloudDiscoveryMetadataFromHost(this.hostnameAndPort);
    }
    return null;
  }
  /**
   * Called to get metadata from network if CloudDiscoveryMetadata was not populated by config
   *
   * @param hasHardcodedMetadata boolean
   */
  async getCloudDiscoveryMetadataFromNetwork() {
    this.performanceClient?.addQueueMeasurement(PerformanceEvents.AuthorityGetCloudDiscoveryMetadataFromNetwork, this.correlationId);
    const instanceDiscoveryEndpoint = `${Constants$1.AAD_INSTANCE_DISCOVERY_ENDPT}${this.canonicalAuthority}oauth2/v2.0/authorize`;
    const options = {};
    let match = null;
    try {
      const response = await this.networkInterface.sendGetRequestAsync(instanceDiscoveryEndpoint, options);
      let typedResponseBody;
      let metadata;
      if (isCloudInstanceDiscoveryResponse(response.body)) {
        typedResponseBody = response.body;
        metadata = typedResponseBody.metadata;
        this.logger.verbosePii(`tenant_discovery_endpoint is: ${typedResponseBody.tenant_discovery_endpoint}`);
      } else if (isCloudInstanceDiscoveryErrorResponse(response.body)) {
        this.logger.warning(`A CloudInstanceDiscoveryErrorResponse was returned. The cloud instance discovery network request's status code is: ${response.status}`);
        typedResponseBody = response.body;
        if (typedResponseBody.error === Constants$1.INVALID_INSTANCE) {
          this.logger.error("The CloudInstanceDiscoveryErrorResponse error is invalid_instance.");
          return null;
        }
        this.logger.warning(`The CloudInstanceDiscoveryErrorResponse error is ${typedResponseBody.error}`);
        this.logger.warning(`The CloudInstanceDiscoveryErrorResponse error description is ${typedResponseBody.error_description}`);
        this.logger.warning("Setting the value of the CloudInstanceDiscoveryMetadata (returned from the network) to []");
        metadata = [];
      } else {
        this.logger.error("AAD did not return a CloudInstanceDiscoveryResponse or CloudInstanceDiscoveryErrorResponse");
        return null;
      }
      this.logger.verbose("Attempting to find a match between the developer's authority and the CloudInstanceDiscoveryMetadata returned from the network request.");
      match = getCloudDiscoveryMetadataFromNetworkResponse(metadata, this.hostnameAndPort);
    } catch (error) {
      if (error instanceof AuthError) {
        this.logger.error(`There was a network error while attempting to get the cloud discovery instance metadata.
Error: ${error.errorCode}
Error Description: ${error.errorMessage}`);
      } else {
        const typedError = error;
        this.logger.error(`A non-MSALJS error was thrown while attempting to get the cloud instance discovery metadata.
Error: ${typedError.name}
Error Description: ${typedError.message}`);
      }
      return null;
    }
    if (!match) {
      this.logger.warning("The developer's authority was not found within the CloudInstanceDiscoveryMetadata returned from the network request.");
      this.logger.verbose("Creating custom Authority for custom domain scenario.");
      match = Authority.createCloudDiscoveryMetadataFromHost(this.hostnameAndPort);
    }
    return match;
  }
  /**
   * Helper function to determine if this host is included in the knownAuthorities config option
   */
  isInKnownAuthorities() {
    const matches = this.authorityOptions.knownAuthorities.filter((authority) => {
      return authority && UrlString.getDomainFromUrl(authority).toLowerCase() === this.hostnameAndPort;
    });
    return matches.length > 0;
  }
  /**
   * helper function to populate the authority based on azureCloudOptions
   * @param authorityString
   * @param azureCloudOptions
   */
  static generateAuthority(authorityString, azureCloudOptions) {
    let authorityAzureCloudInstance;
    if (azureCloudOptions && azureCloudOptions.azureCloudInstance !== AzureCloudInstance.None) {
      const tenant = azureCloudOptions.tenant ? azureCloudOptions.tenant : Constants$1.DEFAULT_COMMON_TENANT;
      authorityAzureCloudInstance = `${azureCloudOptions.azureCloudInstance}/${tenant}/`;
    }
    return authorityAzureCloudInstance ? authorityAzureCloudInstance : authorityString;
  }
  /**
   * Creates cloud discovery metadata object from a given host
   * @param host
   */
  static createCloudDiscoveryMetadataFromHost(host) {
    return {
      preferred_network: host,
      preferred_cache: host,
      aliases: [host]
    };
  }
  /**
   * helper function to generate environment from authority object
   */
  getPreferredCache() {
    if (this.managedIdentity) {
      return Constants$1.DEFAULT_AUTHORITY_HOST;
    } else if (this.discoveryComplete()) {
      return this.metadata.preferred_cache;
    } else {
      throw createClientAuthError(endpointResolutionError);
    }
  }
  /**
   * Returns whether or not the provided host is an alias of this authority instance
   * @param host
   */
  isAlias(host) {
    return this.metadata.aliases.indexOf(host) > -1;
  }
  /**
   * Returns whether or not the provided host is an alias of a known Microsoft authority for purposes of endpoint discovery
   * @param host
   */
  isAliasOfKnownMicrosoftAuthority(host) {
    return InstanceDiscoveryMetadataAliases.has(host);
  }
  /**
   * Checks whether the provided host is that of a public cloud authority
   *
   * @param authority string
   * @returns bool
   */
  static isPublicCloudAuthority(host) {
    return Constants$1.KNOWN_PUBLIC_CLOUDS.indexOf(host) >= 0;
  }
  /**
   * Rebuild the authority string with the region
   *
   * @param host string
   * @param region string
   */
  static buildRegionalAuthorityString(host, region, queryString) {
    const authorityUrlInstance = new UrlString(host);
    authorityUrlInstance.validateAsUri();
    const authorityUrlParts = authorityUrlInstance.getUrlComponents();
    let hostNameAndPort = `${region}.${authorityUrlParts.HostNameAndPort}`;
    if (this.isPublicCloudAuthority(authorityUrlParts.HostNameAndPort)) {
      hostNameAndPort = `${region}.${Constants$1.REGIONAL_AUTH_PUBLIC_CLOUD_SUFFIX}`;
    }
    const url2 = UrlString.constructAuthorityUriFromObject({
      ...authorityUrlInstance.getUrlComponents(),
      HostNameAndPort: hostNameAndPort
    }).urlString;
    if (queryString)
      return `${url2}?${queryString}`;
    return url2;
  }
  /**
   * Replace the endpoints in the metadata object with their regional equivalents.
   *
   * @param metadata OpenIdConfigResponse
   * @param azureRegion string
   */
  static replaceWithRegionalInformation(metadata, azureRegion) {
    const regionalMetadata = { ...metadata };
    regionalMetadata.authorization_endpoint = Authority.buildRegionalAuthorityString(regionalMetadata.authorization_endpoint, azureRegion);
    regionalMetadata.token_endpoint = Authority.buildRegionalAuthorityString(regionalMetadata.token_endpoint, azureRegion);
    if (regionalMetadata.end_session_endpoint) {
      regionalMetadata.end_session_endpoint = Authority.buildRegionalAuthorityString(regionalMetadata.end_session_endpoint, azureRegion);
    }
    return regionalMetadata;
  }
  /**
   * Transform CIAM_AUTHORIY as per the below rules:
   * If no path segments found and it is a CIAM authority (hostname ends with .ciamlogin.com), then transform it
   *
   * NOTE: The transformation path should go away once STS supports CIAM with the format: `tenantIdorDomain.ciamlogin.com`
   * `ciamlogin.com` can also change in the future and we should accommodate the same
   *
   * @param authority
   */
  static transformCIAMAuthority(authority) {
    let ciamAuthority = authority;
    const authorityUrl = new UrlString(authority);
    const authorityUrlComponents = authorityUrl.getUrlComponents();
    if (authorityUrlComponents.PathSegments.length === 0 && authorityUrlComponents.HostNameAndPort.endsWith(Constants$1.CIAM_AUTH_URL)) {
      const tenantIdOrDomain = authorityUrlComponents.HostNameAndPort.split(".")[0];
      ciamAuthority = `${ciamAuthority}${tenantIdOrDomain}${Constants$1.AAD_TENANT_DOMAIN_SUFFIX}`;
    }
    return ciamAuthority;
  }
}
Authority.reservedTenantDomains = /* @__PURE__ */ new Set([
  "{tenant}",
  "{tenantid}",
  AADAuthorityConstants.COMMON,
  AADAuthorityConstants.CONSUMERS,
  AADAuthorityConstants.ORGANIZATIONS
]);
function getTenantFromAuthorityString(authority) {
  const authorityUrl = new UrlString(authority);
  const authorityUrlComponents = authorityUrl.getUrlComponents();
  const tenantId = authorityUrlComponents.PathSegments.slice(-1)[0]?.toLowerCase();
  switch (tenantId) {
    case AADAuthorityConstants.COMMON:
    case AADAuthorityConstants.ORGANIZATIONS:
    case AADAuthorityConstants.CONSUMERS:
      return void 0;
    default:
      return tenantId;
  }
}
function formatAuthorityUri(authorityUri) {
  return authorityUri.endsWith(Constants$1.FORWARD_SLASH) ? authorityUri : `${authorityUri}${Constants$1.FORWARD_SLASH}`;
}
function buildStaticAuthorityOptions(authOptions) {
  const rawCloudDiscoveryMetadata = authOptions.cloudDiscoveryMetadata;
  let cloudDiscoveryMetadata = void 0;
  if (rawCloudDiscoveryMetadata) {
    try {
      cloudDiscoveryMetadata = JSON.parse(rawCloudDiscoveryMetadata);
    } catch (e) {
      throw createClientConfigurationError(invalidCloudDiscoveryMetadata);
    }
  }
  return {
    canonicalAuthority: authOptions.authority ? formatAuthorityUri(authOptions.authority) : void 0,
    knownAuthorities: authOptions.knownAuthorities,
    cloudDiscoveryMetadata
  };
}
async function createDiscoveredInstance(authorityUri, networkClient, cacheManager, authorityOptions, logger, correlationId, performanceClient) {
  performanceClient?.addQueueMeasurement(PerformanceEvents.AuthorityFactoryCreateDiscoveredInstance, correlationId);
  const authorityUriFinal = Authority.transformCIAMAuthority(formatAuthorityUri(authorityUri));
  const acquireTokenAuthority = new Authority(authorityUriFinal, networkClient, cacheManager, authorityOptions, logger, correlationId, performanceClient);
  try {
    await invokeAsync(acquireTokenAuthority.resolveEndpointsAsync.bind(acquireTokenAuthority), PerformanceEvents.AuthorityResolveEndpointsAsync, logger, performanceClient, correlationId)();
    return acquireTokenAuthority;
  } catch (e) {
    throw createClientAuthError(endpointResolutionError);
  }
}
class ServerError extends AuthError {
  constructor(errorCode, errorMessage, subError, errorNo, status) {
    super(errorCode, errorMessage, subError);
    this.name = "ServerError";
    this.errorNo = errorNo;
    this.status = status;
    Object.setPrototypeOf(this, ServerError.prototype);
  }
}
function getRequestThumbprint(clientId, request, homeAccountId) {
  return {
    clientId,
    authority: request.authority,
    scopes: request.scopes,
    homeAccountIdentifier: homeAccountId,
    claims: request.claims,
    authenticationScheme: request.authenticationScheme,
    resourceRequestMethod: request.resourceRequestMethod,
    resourceRequestUri: request.resourceRequestUri,
    shrClaims: request.shrClaims,
    sshKid: request.sshKid,
    embeddedClientId: request.embeddedClientId || request.tokenBodyParameters?.clientId
  };
}
class ThrottlingUtils {
  /**
   * Prepares a RequestThumbprint to be stored as a key.
   * @param thumbprint
   */
  static generateThrottlingStorageKey(thumbprint) {
    return `${ThrottlingConstants.THROTTLING_PREFIX}.${JSON.stringify(thumbprint)}`;
  }
  /**
   * Performs necessary throttling checks before a network request.
   * @param cacheManager
   * @param thumbprint
   */
  static preProcess(cacheManager, thumbprint, correlationId) {
    const key = ThrottlingUtils.generateThrottlingStorageKey(thumbprint);
    const value = cacheManager.getThrottlingCache(key);
    if (value) {
      if (value.throttleTime < Date.now()) {
        cacheManager.removeItem(key, correlationId);
        return;
      }
      throw new ServerError(value.errorCodes?.join(" ") || Constants$1.EMPTY_STRING, value.errorMessage, value.subError);
    }
  }
  /**
   * Performs necessary throttling checks after a network request.
   * @param cacheManager
   * @param thumbprint
   * @param response
   */
  static postProcess(cacheManager, thumbprint, response, correlationId) {
    if (ThrottlingUtils.checkResponseStatus(response) || ThrottlingUtils.checkResponseForRetryAfter(response)) {
      const thumbprintValue = {
        throttleTime: ThrottlingUtils.calculateThrottleTime(parseInt(response.headers[HeaderNames.RETRY_AFTER])),
        error: response.body.error,
        errorCodes: response.body.error_codes,
        errorMessage: response.body.error_description,
        subError: response.body.suberror
      };
      cacheManager.setThrottlingCache(ThrottlingUtils.generateThrottlingStorageKey(thumbprint), thumbprintValue, correlationId);
    }
  }
  /**
   * Checks a NetworkResponse object's status codes against 429 or 5xx
   * @param response
   */
  static checkResponseStatus(response) {
    return response.status === 429 || response.status >= 500 && response.status < 600;
  }
  /**
   * Checks a NetworkResponse object's RetryAfter header
   * @param response
   */
  static checkResponseForRetryAfter(response) {
    if (response.headers) {
      return response.headers.hasOwnProperty(HeaderNames.RETRY_AFTER) && (response.status < 200 || response.status >= 300);
    }
    return false;
  }
  /**
   * Calculates the Unix-time value for a throttle to expire given throttleTime in seconds.
   * @param throttleTime
   */
  static calculateThrottleTime(throttleTime) {
    const time = throttleTime <= 0 ? 0 : throttleTime;
    const currentSeconds = Date.now() / 1e3;
    return Math.floor(Math.min(currentSeconds + (time || ThrottlingConstants.DEFAULT_THROTTLE_TIME_SECONDS), currentSeconds + ThrottlingConstants.DEFAULT_MAX_THROTTLE_TIME_SECONDS) * 1e3);
  }
  static removeThrottle(cacheManager, clientId, request, homeAccountIdentifier) {
    const thumbprint = getRequestThumbprint(clientId, request, homeAccountIdentifier);
    const key = this.generateThrottlingStorageKey(thumbprint);
    cacheManager.removeItem(key, request.correlationId);
  }
}
class NetworkError extends AuthError {
  constructor(error, httpStatus, responseHeaders) {
    super(error.errorCode, error.errorMessage, error.subError);
    Object.setPrototypeOf(this, NetworkError.prototype);
    this.name = "NetworkError";
    this.error = error;
    this.httpStatus = httpStatus;
    this.responseHeaders = responseHeaders;
  }
}
class BaseClient {
  constructor(configuration, performanceClient) {
    this.config = buildClientConfiguration(configuration);
    this.logger = new Logger(this.config.loggerOptions, name$1, version$1);
    this.cryptoUtils = this.config.cryptoInterface;
    this.cacheManager = this.config.storageInterface;
    this.networkClient = this.config.networkInterface;
    this.serverTelemetryManager = this.config.serverTelemetryManager;
    this.authority = this.config.authOptions.authority;
    this.performanceClient = performanceClient;
  }
  /**
   * Creates default headers for requests to token endpoint
   */
  createTokenRequestHeaders(ccsCred) {
    const headers = {};
    headers[HeaderNames.CONTENT_TYPE] = Constants$1.URL_FORM_CONTENT_TYPE;
    if (!this.config.systemOptions.preventCorsPreflight && ccsCred) {
      switch (ccsCred.type) {
        case CcsCredentialType.HOME_ACCOUNT_ID:
          try {
            const clientInfo = buildClientInfoFromHomeAccountId(ccsCred.credential);
            headers[HeaderNames.CCS_HEADER] = `Oid:${clientInfo.uid}@${clientInfo.utid}`;
          } catch (e) {
            this.logger.verbose("Could not parse home account ID for CCS Header: " + e);
          }
          break;
        case CcsCredentialType.UPN:
          headers[HeaderNames.CCS_HEADER] = `UPN: ${ccsCred.credential}`;
          break;
      }
    }
    return headers;
  }
  /**
   * Http post to token endpoint
   * @param tokenEndpoint
   * @param queryString
   * @param headers
   * @param thumbprint
   */
  async executePostToTokenEndpoint(tokenEndpoint, queryString, headers, thumbprint, correlationId, queuedEvent) {
    if (queuedEvent) {
      this.performanceClient?.addQueueMeasurement(queuedEvent, correlationId);
    }
    const response = await this.sendPostRequest(thumbprint, tokenEndpoint, { body: queryString, headers }, correlationId);
    if (this.config.serverTelemetryManager && response.status < 500 && response.status !== 429) {
      this.config.serverTelemetryManager.clearTelemetryCache();
    }
    return response;
  }
  /**
   * Wraps sendPostRequestAsync with necessary preflight and postflight logic
   * @param thumbprint - Request thumbprint for throttling
   * @param tokenEndpoint - Endpoint to make the POST to
   * @param options - Body and Headers to include on the POST request
   * @param correlationId - CorrelationId for telemetry
   */
  async sendPostRequest(thumbprint, tokenEndpoint, options, correlationId) {
    ThrottlingUtils.preProcess(this.cacheManager, thumbprint, correlationId);
    let response;
    try {
      response = await invokeAsync(this.networkClient.sendPostRequestAsync.bind(this.networkClient), PerformanceEvents.NetworkClientSendPostRequestAsync, this.logger, this.performanceClient, correlationId)(tokenEndpoint, options);
      const responseHeaders = response.headers || {};
      this.performanceClient?.addFields({
        refreshTokenSize: response.body.refresh_token?.length || 0,
        httpVerToken: responseHeaders[HeaderNames.X_MS_HTTP_VERSION] || "",
        requestId: responseHeaders[HeaderNames.X_MS_REQUEST_ID] || ""
      }, correlationId);
    } catch (e) {
      if (e instanceof NetworkError) {
        const responseHeaders = e.responseHeaders;
        if (responseHeaders) {
          this.performanceClient?.addFields({
            httpVerToken: responseHeaders[HeaderNames.X_MS_HTTP_VERSION] || "",
            requestId: responseHeaders[HeaderNames.X_MS_REQUEST_ID] || "",
            contentTypeHeader: responseHeaders[HeaderNames.CONTENT_TYPE] || void 0,
            contentLengthHeader: responseHeaders[HeaderNames.CONTENT_LENGTH] || void 0,
            httpStatus: e.httpStatus
          }, correlationId);
        }
        throw e.error;
      }
      if (e instanceof AuthError) {
        throw e;
      } else {
        throw createClientAuthError(networkError);
      }
    }
    ThrottlingUtils.postProcess(this.cacheManager, thumbprint, response, correlationId);
    return response;
  }
  /**
   * Updates the authority object of the client. Endpoint discovery must be completed.
   * @param updatedAuthority
   */
  async updateAuthority(cloudInstanceHostname, correlationId) {
    this.performanceClient?.addQueueMeasurement(PerformanceEvents.UpdateTokenEndpointAuthority, correlationId);
    const cloudInstanceAuthorityUri = `https://${cloudInstanceHostname}/${this.authority.tenant}/`;
    const cloudInstanceAuthority = await createDiscoveredInstance(cloudInstanceAuthorityUri, this.networkClient, this.cacheManager, this.authority.options, this.logger, correlationId, this.performanceClient);
    this.authority = cloudInstanceAuthority;
  }
  /**
   * Creates query string for the /token request
   * @param request
   */
  createTokenQueryParameters(request) {
    const parameters = /* @__PURE__ */ new Map();
    if (request.embeddedClientId) {
      addBrokerParameters(parameters, this.config.authOptions.clientId, this.config.authOptions.redirectUri);
    }
    if (request.tokenQueryParameters) {
      addExtraQueryParameters(parameters, request.tokenQueryParameters);
    }
    addCorrelationId(parameters, request.correlationId);
    instrumentBrokerParams(parameters, request.correlationId, this.performanceClient);
    return mapToQueryString(parameters);
  }
}
const noTokensFound = "no_tokens_found";
const nativeAccountUnavailable = "native_account_unavailable";
const refreshTokenExpired = "refresh_token_expired";
const uxNotAllowed = "ux_not_allowed";
const interactionRequired = "interaction_required";
const consentRequired = "consent_required";
const loginRequired = "login_required";
const badToken = "bad_token";
const interruptedUser = "interrupted_user";
const InteractionRequiredServerErrorMessage = [
  interactionRequired,
  consentRequired,
  loginRequired,
  badToken,
  uxNotAllowed,
  interruptedUser
];
const InteractionRequiredAuthSubErrorMessage = [
  "message_only",
  "additional_action",
  "basic_action",
  "user_password_expired",
  "consent_required",
  "bad_token",
  "interrupted_user"
];
const InteractionRequiredAuthErrorMessages = {
  [noTokensFound]: "No refresh token found in the cache. Please sign-in.",
  [nativeAccountUnavailable]: "The requested account is not available in the native broker. It may have been deleted or logged out. Please sign-in again using an interactive API.",
  [refreshTokenExpired]: "Refresh token has expired.",
  [badToken]: "Identity provider returned bad_token due to an expired or invalid refresh token. Please invoke an interactive API to resolve.",
  [uxNotAllowed]: "`canShowUI` flag in Edge was set to false. User interaction required on web page. Please invoke an interactive API to resolve.",
  [interruptedUser]: "The user could not be authenticated due to an interrupted state. Please invoke an interactive API to resolve."
};
class InteractionRequiredAuthError extends AuthError {
  constructor(errorCode, errorMessage, subError, timestamp, traceId, correlationId, claims, errorNo) {
    super(errorCode, errorMessage, subError);
    Object.setPrototypeOf(this, InteractionRequiredAuthError.prototype);
    this.timestamp = timestamp || Constants$1.EMPTY_STRING;
    this.traceId = traceId || Constants$1.EMPTY_STRING;
    this.correlationId = correlationId || Constants$1.EMPTY_STRING;
    this.claims = claims || Constants$1.EMPTY_STRING;
    this.name = "InteractionRequiredAuthError";
    this.errorNo = errorNo;
  }
}
function isInteractionRequiredError(errorCode, errorString, subError) {
  const isInteractionRequiredErrorCode = !!errorCode && InteractionRequiredServerErrorMessage.indexOf(errorCode) > -1;
  const isInteractionRequiredSubError = !!subError && InteractionRequiredAuthSubErrorMessage.indexOf(subError) > -1;
  const isInteractionRequiredErrorDesc = !!errorString && InteractionRequiredServerErrorMessage.some((irErrorCode) => {
    return errorString.indexOf(irErrorCode) > -1;
  });
  return isInteractionRequiredErrorCode || isInteractionRequiredErrorDesc || isInteractionRequiredSubError;
}
function createInteractionRequiredAuthError(errorCode) {
  return new InteractionRequiredAuthError(errorCode, InteractionRequiredAuthErrorMessages[errorCode]);
}
class ProtocolUtils {
  /**
   * Appends user state with random guid, or returns random guid.
   * @param userState
   * @param randomGuid
   */
  static setRequestState(cryptoObj, userState, meta) {
    const libraryState = ProtocolUtils.generateLibraryState(cryptoObj, meta);
    return userState ? `${libraryState}${Constants$1.RESOURCE_DELIM}${userState}` : libraryState;
  }
  /**
   * Generates the state value used by the common library.
   * @param randomGuid
   * @param cryptoObj
   */
  static generateLibraryState(cryptoObj, meta) {
    if (!cryptoObj) {
      throw createClientAuthError(noCryptoObject);
    }
    const stateObj = {
      id: cryptoObj.createNewGuid()
    };
    if (meta) {
      stateObj.meta = meta;
    }
    const stateString = JSON.stringify(stateObj);
    return cryptoObj.base64Encode(stateString);
  }
  /**
   * Parses the state into the RequestStateObject, which contains the LibraryState info and the state passed by the user.
   * @param state
   * @param cryptoObj
   */
  static parseRequestState(cryptoObj, state) {
    if (!cryptoObj) {
      throw createClientAuthError(noCryptoObject);
    }
    if (!state) {
      throw createClientAuthError(invalidState);
    }
    try {
      const splitState = state.split(Constants$1.RESOURCE_DELIM);
      const libraryState = splitState[0];
      const userState = splitState.length > 1 ? splitState.slice(1).join(Constants$1.RESOURCE_DELIM) : Constants$1.EMPTY_STRING;
      const libraryStateString = cryptoObj.base64Decode(libraryState);
      const libraryStateObj = JSON.parse(libraryStateString);
      return {
        userRequestState: userState || Constants$1.EMPTY_STRING,
        libraryState: libraryStateObj
      };
    } catch (e) {
      throw createClientAuthError(invalidState);
    }
  }
}
const KeyLocation = {
  SW: "sw"
};
class PopTokenGenerator {
  constructor(cryptoUtils, performanceClient) {
    this.cryptoUtils = cryptoUtils;
    this.performanceClient = performanceClient;
  }
  /**
   * Generates the req_cnf validated at the RP in the POP protocol for SHR parameters
   * and returns an object containing the keyid, the full req_cnf string and the req_cnf string hash
   * @param request
   * @returns
   */
  async generateCnf(request, logger) {
    this.performanceClient?.addQueueMeasurement(PerformanceEvents.PopTokenGenerateCnf, request.correlationId);
    const reqCnf = await invokeAsync(this.generateKid.bind(this), PerformanceEvents.PopTokenGenerateCnf, logger, this.performanceClient, request.correlationId)(request);
    const reqCnfString = this.cryptoUtils.base64UrlEncode(JSON.stringify(reqCnf));
    return {
      kid: reqCnf.kid,
      reqCnfString
    };
  }
  /**
   * Generates key_id for a SHR token request
   * @param request
   * @returns
   */
  async generateKid(request) {
    this.performanceClient?.addQueueMeasurement(PerformanceEvents.PopTokenGenerateKid, request.correlationId);
    const kidThumbprint = await this.cryptoUtils.getPublicKeyThumbprint(request);
    return {
      kid: kidThumbprint,
      xms_ksl: KeyLocation.SW
    };
  }
  /**
   * Signs the POP access_token with the local generated key-pair
   * @param accessToken
   * @param request
   * @returns
   */
  async signPopToken(accessToken, keyId, request) {
    return this.signPayload(accessToken, keyId, request);
  }
  /**
   * Utility function to generate the signed JWT for an access_token
   * @param payload
   * @param kid
   * @param request
   * @param claims
   * @returns
   */
  async signPayload(payload, keyId, request, claims) {
    const { resourceRequestMethod, resourceRequestUri, shrClaims, shrNonce, shrOptions } = request;
    const resourceUrlString = resourceRequestUri ? new UrlString(resourceRequestUri) : void 0;
    const resourceUrlComponents = resourceUrlString?.getUrlComponents();
    return this.cryptoUtils.signJwt({
      at: payload,
      ts: nowSeconds(),
      m: resourceRequestMethod?.toUpperCase(),
      u: resourceUrlComponents?.HostNameAndPort,
      nonce: shrNonce || this.cryptoUtils.createNewGuid(),
      p: resourceUrlComponents?.AbsolutePath,
      q: resourceUrlComponents?.QueryString ? [[], resourceUrlComponents.QueryString] : void 0,
      client_claims: shrClaims || void 0,
      ...claims
    }, keyId, shrOptions, request.correlationId);
  }
}
class TokenCacheContext {
  constructor(tokenCache, hasChanged) {
    this.cache = tokenCache;
    this.hasChanged = hasChanged;
  }
  /**
   * boolean which indicates the changes in cache
   */
  get cacheHasChanged() {
    return this.hasChanged;
  }
  /**
   * function to retrieve the token cache
   */
  get tokenCache() {
    return this.cache;
  }
}
class ResponseHandler {
  constructor(clientId, cacheStorage, cryptoObj, logger, serializableCache, persistencePlugin, performanceClient) {
    this.clientId = clientId;
    this.cacheStorage = cacheStorage;
    this.cryptoObj = cryptoObj;
    this.logger = logger;
    this.serializableCache = serializableCache;
    this.persistencePlugin = persistencePlugin;
    this.performanceClient = performanceClient;
  }
  /**
   * Function which validates server authorization token response.
   * @param serverResponse
   * @param refreshAccessToken
   */
  validateTokenResponse(serverResponse, refreshAccessToken) {
    if (serverResponse.error || serverResponse.error_description || serverResponse.suberror) {
      const errString = `Error(s): ${serverResponse.error_codes || Constants$1.NOT_AVAILABLE} - Timestamp: ${serverResponse.timestamp || Constants$1.NOT_AVAILABLE} - Description: ${serverResponse.error_description || Constants$1.NOT_AVAILABLE} - Correlation ID: ${serverResponse.correlation_id || Constants$1.NOT_AVAILABLE} - Trace ID: ${serverResponse.trace_id || Constants$1.NOT_AVAILABLE}`;
      const serverErrorNo = serverResponse.error_codes?.length ? serverResponse.error_codes[0] : void 0;
      const serverError = new ServerError(serverResponse.error, errString, serverResponse.suberror, serverErrorNo, serverResponse.status);
      if (refreshAccessToken && serverResponse.status && serverResponse.status >= HttpStatus.SERVER_ERROR_RANGE_START && serverResponse.status <= HttpStatus.SERVER_ERROR_RANGE_END) {
        this.logger.warning(`executeTokenRequest:validateTokenResponse - AAD is currently unavailable and the access token is unable to be refreshed.
${serverError}`);
        return;
      } else if (refreshAccessToken && serverResponse.status && serverResponse.status >= HttpStatus.CLIENT_ERROR_RANGE_START && serverResponse.status <= HttpStatus.CLIENT_ERROR_RANGE_END) {
        this.logger.warning(`executeTokenRequest:validateTokenResponse - AAD is currently available but is unable to refresh the access token.
${serverError}`);
        return;
      }
      if (isInteractionRequiredError(serverResponse.error, serverResponse.error_description, serverResponse.suberror)) {
        throw new InteractionRequiredAuthError(serverResponse.error, serverResponse.error_description, serverResponse.suberror, serverResponse.timestamp || Constants$1.EMPTY_STRING, serverResponse.trace_id || Constants$1.EMPTY_STRING, serverResponse.correlation_id || Constants$1.EMPTY_STRING, serverResponse.claims || Constants$1.EMPTY_STRING, serverErrorNo);
      }
      throw serverError;
    }
  }
  /**
   * Returns a constructed token response based on given string. Also manages the cache updates and cleanups.
   * @param serverTokenResponse
   * @param authority
   */
  async handleServerTokenResponse(serverTokenResponse, authority, reqTimestamp, request, apiId, authCodePayload, userAssertionHash, handlingRefreshTokenResponse, forceCacheRefreshTokenResponse, serverRequestId) {
    this.performanceClient?.addQueueMeasurement(PerformanceEvents.HandleServerTokenResponse, serverTokenResponse.correlation_id);
    let idTokenClaims;
    if (serverTokenResponse.id_token) {
      idTokenClaims = extractTokenClaims(serverTokenResponse.id_token || Constants$1.EMPTY_STRING, this.cryptoObj.base64Decode);
      if (authCodePayload && authCodePayload.nonce) {
        if (idTokenClaims.nonce !== authCodePayload.nonce) {
          throw createClientAuthError(nonceMismatch);
        }
      }
      if (request.maxAge || request.maxAge === 0) {
        const authTime = idTokenClaims.auth_time;
        if (!authTime) {
          throw createClientAuthError(authTimeNotFound);
        }
        checkMaxAge(authTime, request.maxAge);
      }
    }
    this.homeAccountIdentifier = AccountEntity.generateHomeAccountId(serverTokenResponse.client_info || Constants$1.EMPTY_STRING, authority.authorityType, this.logger, this.cryptoObj, idTokenClaims);
    let requestStateObj;
    if (!!authCodePayload && !!authCodePayload.state) {
      requestStateObj = ProtocolUtils.parseRequestState(this.cryptoObj, authCodePayload.state);
    }
    serverTokenResponse.key_id = serverTokenResponse.key_id || request.sshKid || void 0;
    const cacheRecord = this.generateCacheRecord(serverTokenResponse, authority, reqTimestamp, request, idTokenClaims, userAssertionHash, authCodePayload);
    let cacheContext;
    try {
      if (this.persistencePlugin && this.serializableCache) {
        this.logger.verbose("Persistence enabled, calling beforeCacheAccess");
        cacheContext = new TokenCacheContext(this.serializableCache, true);
        await this.persistencePlugin.beforeCacheAccess(cacheContext);
      }
      if (handlingRefreshTokenResponse && !forceCacheRefreshTokenResponse && cacheRecord.account) {
        const cachedAccounts = this.cacheStorage.getAllAccounts({
          homeAccountId: cacheRecord.account.homeAccountId,
          environment: cacheRecord.account.environment
        }, request.correlationId);
        if (cachedAccounts.length < 1) {
          this.logger.warning("Account used to refresh tokens not in persistence, refreshed tokens will not be stored in the cache");
          this.performanceClient?.addFields({
            acntLoggedOut: true
          }, request.correlationId);
          return await ResponseHandler.generateAuthenticationResult(this.cryptoObj, authority, cacheRecord, false, request, idTokenClaims, requestStateObj, void 0, serverRequestId);
        }
      }
      await this.cacheStorage.saveCacheRecord(cacheRecord, request.correlationId, isKmsi(idTokenClaims || {}), apiId, request.storeInCache);
    } finally {
      if (this.persistencePlugin && this.serializableCache && cacheContext) {
        this.logger.verbose("Persistence enabled, calling afterCacheAccess");
        await this.persistencePlugin.afterCacheAccess(cacheContext);
      }
    }
    return ResponseHandler.generateAuthenticationResult(this.cryptoObj, authority, cacheRecord, false, request, idTokenClaims, requestStateObj, serverTokenResponse, serverRequestId);
  }
  /**
   * Generates CacheRecord
   * @param serverTokenResponse
   * @param idTokenObj
   * @param authority
   */
  generateCacheRecord(serverTokenResponse, authority, reqTimestamp, request, idTokenClaims, userAssertionHash, authCodePayload) {
    const env = authority.getPreferredCache();
    if (!env) {
      throw createClientAuthError(invalidCacheEnvironment);
    }
    const claimsTenantId = getTenantIdFromIdTokenClaims(idTokenClaims);
    let cachedIdToken;
    let cachedAccount;
    if (serverTokenResponse.id_token && !!idTokenClaims) {
      cachedIdToken = createIdTokenEntity(this.homeAccountIdentifier, env, serverTokenResponse.id_token, this.clientId, claimsTenantId || "");
      cachedAccount = buildAccountToCache(
        this.cacheStorage,
        authority,
        this.homeAccountIdentifier,
        this.cryptoObj.base64Decode,
        request.correlationId,
        idTokenClaims,
        serverTokenResponse.client_info,
        env,
        claimsTenantId,
        authCodePayload,
        void 0,
        // nativeAccountId
        this.logger
      );
    }
    let cachedAccessToken = null;
    if (serverTokenResponse.access_token) {
      const responseScopes = serverTokenResponse.scope ? ScopeSet.fromString(serverTokenResponse.scope) : new ScopeSet(request.scopes || []);
      const expiresIn = (typeof serverTokenResponse.expires_in === "string" ? parseInt(serverTokenResponse.expires_in, 10) : serverTokenResponse.expires_in) || 0;
      const extExpiresIn = (typeof serverTokenResponse.ext_expires_in === "string" ? parseInt(serverTokenResponse.ext_expires_in, 10) : serverTokenResponse.ext_expires_in) || 0;
      const refreshIn = (typeof serverTokenResponse.refresh_in === "string" ? parseInt(serverTokenResponse.refresh_in, 10) : serverTokenResponse.refresh_in) || void 0;
      const tokenExpirationSeconds = reqTimestamp + expiresIn;
      const extendedTokenExpirationSeconds = tokenExpirationSeconds + extExpiresIn;
      const refreshOnSeconds = refreshIn && refreshIn > 0 ? reqTimestamp + refreshIn : void 0;
      cachedAccessToken = createAccessTokenEntity(this.homeAccountIdentifier, env, serverTokenResponse.access_token, this.clientId, claimsTenantId || authority.tenant || "", responseScopes.printScopes(), tokenExpirationSeconds, extendedTokenExpirationSeconds, this.cryptoObj.base64Decode, refreshOnSeconds, serverTokenResponse.token_type, userAssertionHash, serverTokenResponse.key_id, request.claims, request.requestedClaimsHash);
    }
    let cachedRefreshToken = null;
    if (serverTokenResponse.refresh_token) {
      let rtExpiresOn;
      if (serverTokenResponse.refresh_token_expires_in) {
        const rtExpiresIn = typeof serverTokenResponse.refresh_token_expires_in === "string" ? parseInt(serverTokenResponse.refresh_token_expires_in, 10) : serverTokenResponse.refresh_token_expires_in;
        rtExpiresOn = reqTimestamp + rtExpiresIn;
        this.performanceClient?.addFields({
          ntwkRtExpiresOnSeconds: rtExpiresOn
        }, request.correlationId);
      }
      cachedRefreshToken = createRefreshTokenEntity(this.homeAccountIdentifier, env, serverTokenResponse.refresh_token, this.clientId, serverTokenResponse.foci, userAssertionHash, rtExpiresOn);
    }
    let cachedAppMetadata = null;
    if (serverTokenResponse.foci) {
      cachedAppMetadata = {
        clientId: this.clientId,
        environment: env,
        familyId: serverTokenResponse.foci
      };
    }
    return {
      account: cachedAccount,
      idToken: cachedIdToken,
      accessToken: cachedAccessToken,
      refreshToken: cachedRefreshToken,
      appMetadata: cachedAppMetadata
    };
  }
  /**
   * Creates an @AuthenticationResult from @CacheRecord , @IdToken , and a boolean that states whether or not the result is from cache.
   *
   * Optionally takes a state string that is set as-is in the response.
   *
   * @param cacheRecord
   * @param idTokenObj
   * @param fromTokenCache
   * @param stateString
   */
  static async generateAuthenticationResult(cryptoObj, authority, cacheRecord, fromTokenCache, request, idTokenClaims, requestState, serverTokenResponse, requestId) {
    let accessToken = Constants$1.EMPTY_STRING;
    let responseScopes = [];
    let expiresOn = null;
    let extExpiresOn;
    let refreshOn;
    let familyId = Constants$1.EMPTY_STRING;
    if (cacheRecord.accessToken) {
      if (cacheRecord.accessToken.tokenType === AuthenticationScheme.POP && !request.popKid) {
        const popTokenGenerator = new PopTokenGenerator(cryptoObj);
        const { secret, keyId } = cacheRecord.accessToken;
        if (!keyId) {
          throw createClientAuthError(keyIdMissing);
        }
        accessToken = await popTokenGenerator.signPopToken(secret, keyId, request);
      } else {
        accessToken = cacheRecord.accessToken.secret;
      }
      responseScopes = ScopeSet.fromString(cacheRecord.accessToken.target).asArray();
      expiresOn = toDateFromSeconds(cacheRecord.accessToken.expiresOn);
      extExpiresOn = toDateFromSeconds(cacheRecord.accessToken.extendedExpiresOn);
      if (cacheRecord.accessToken.refreshOn) {
        refreshOn = toDateFromSeconds(cacheRecord.accessToken.refreshOn);
      }
    }
    if (cacheRecord.appMetadata) {
      familyId = cacheRecord.appMetadata.familyId === THE_FAMILY_ID ? THE_FAMILY_ID : "";
    }
    const uid = idTokenClaims?.oid || idTokenClaims?.sub || "";
    const tid = idTokenClaims?.tid || "";
    if (serverTokenResponse?.spa_accountid && !!cacheRecord.account) {
      cacheRecord.account.nativeAccountId = serverTokenResponse?.spa_accountid;
    }
    const accountInfo = cacheRecord.account ? updateAccountTenantProfileData(
      AccountEntity.getAccountInfo(cacheRecord.account),
      void 0,
      // tenantProfile optional
      idTokenClaims,
      cacheRecord.idToken?.secret
    ) : null;
    return {
      authority: authority.canonicalAuthority,
      uniqueId: uid,
      tenantId: tid,
      scopes: responseScopes,
      account: accountInfo,
      idToken: cacheRecord?.idToken?.secret || "",
      idTokenClaims: idTokenClaims || {},
      accessToken,
      fromCache: fromTokenCache,
      expiresOn,
      extExpiresOn,
      refreshOn,
      correlationId: request.correlationId,
      requestId: requestId || Constants$1.EMPTY_STRING,
      familyId,
      tokenType: cacheRecord.accessToken?.tokenType || Constants$1.EMPTY_STRING,
      state: requestState ? requestState.userRequestState : Constants$1.EMPTY_STRING,
      cloudGraphHostName: cacheRecord.account?.cloudGraphHostName || Constants$1.EMPTY_STRING,
      msGraphHost: cacheRecord.account?.msGraphHost || Constants$1.EMPTY_STRING,
      code: serverTokenResponse?.spa_code,
      fromNativeBroker: false
    };
  }
}
function buildAccountToCache(cacheStorage, authority, homeAccountId, base64Decode, correlationId, idTokenClaims, clientInfo, environment, claimsTenantId, authCodePayload, nativeAccountId, logger) {
  logger?.verbose("setCachedAccount called");
  const accountKeys = cacheStorage.getAccountKeys();
  const baseAccountKey = accountKeys.find((accountKey) => {
    return accountKey.startsWith(homeAccountId);
  });
  let cachedAccount = null;
  if (baseAccountKey) {
    cachedAccount = cacheStorage.getAccount(baseAccountKey, correlationId);
  }
  const baseAccount = cachedAccount || AccountEntity.createAccount({
    homeAccountId,
    idTokenClaims,
    clientInfo,
    environment,
    cloudGraphHostName: authCodePayload?.cloud_graph_host_name,
    msGraphHost: authCodePayload?.msgraph_host,
    nativeAccountId
  }, authority, base64Decode);
  const tenantProfiles = baseAccount.tenantProfiles || [];
  const tenantId = claimsTenantId || baseAccount.realm;
  if (tenantId && !tenantProfiles.find((tenantProfile) => {
    return tenantProfile.tenantId === tenantId;
  })) {
    const newTenantProfile = buildTenantProfile(homeAccountId, baseAccount.localAccountId, tenantId, idTokenClaims);
    tenantProfiles.push(newTenantProfile);
  }
  baseAccount.tenantProfiles = tenantProfiles;
  return baseAccount;
}
async function getClientAssertion(clientAssertion, clientId, tokenEndpoint) {
  if (typeof clientAssertion === "string") {
    return clientAssertion;
  } else {
    const config = {
      clientId,
      tokenEndpoint
    };
    return clientAssertion(config);
  }
}
class AuthorizationCodeClient extends BaseClient {
  constructor(configuration, performanceClient) {
    super(configuration, performanceClient);
    this.includeRedirectUri = true;
    this.oidcDefaultScopes = this.config.authOptions.authority.options.OIDCOptions?.defaultScopes;
  }
  /**
   * API to acquire a token in exchange of 'authorization_code` acquired by the user in the first leg of the
   * authorization_code_grant
   * @param request
   * @param apiId - API identifier for telemetry tracking
   */
  async acquireToken(request, apiId, authCodePayload) {
    this.performanceClient?.addQueueMeasurement(PerformanceEvents.AuthClientAcquireToken, request.correlationId);
    if (!request.code) {
      throw createClientAuthError(requestCannotBeMade);
    }
    const reqTimestamp = nowSeconds();
    const response = await invokeAsync(this.executeTokenRequest.bind(this), PerformanceEvents.AuthClientExecuteTokenRequest, this.logger, this.performanceClient, request.correlationId)(this.authority, request);
    const requestId = response.headers?.[HeaderNames.X_MS_REQUEST_ID];
    const responseHandler = new ResponseHandler(this.config.authOptions.clientId, this.cacheManager, this.cryptoUtils, this.logger, this.config.serializableCache, this.config.persistencePlugin, this.performanceClient);
    responseHandler.validateTokenResponse(response.body);
    return invokeAsync(responseHandler.handleServerTokenResponse.bind(responseHandler), PerformanceEvents.HandleServerTokenResponse, this.logger, this.performanceClient, request.correlationId)(response.body, this.authority, reqTimestamp, request, apiId, authCodePayload, void 0, void 0, void 0, requestId);
  }
  /**
   * Used to log out the current user, and redirect the user to the postLogoutRedirectUri.
   * Default behaviour is to redirect the user to `window.location.href`.
   * @param authorityUri
   */
  getLogoutUri(logoutRequest) {
    if (!logoutRequest) {
      throw createClientConfigurationError(logoutRequestEmpty);
    }
    const queryString = this.createLogoutUrlQueryString(logoutRequest);
    return UrlString.appendQueryString(this.authority.endSessionEndpoint, queryString);
  }
  /**
   * Executes POST request to token endpoint
   * @param authority
   * @param request
   */
  async executeTokenRequest(authority, request) {
    this.performanceClient?.addQueueMeasurement(PerformanceEvents.AuthClientExecuteTokenRequest, request.correlationId);
    const queryParametersString = this.createTokenQueryParameters(request);
    const endpoint = UrlString.appendQueryString(authority.tokenEndpoint, queryParametersString);
    const requestBody = await invokeAsync(this.createTokenRequestBody.bind(this), PerformanceEvents.AuthClientCreateTokenRequestBody, this.logger, this.performanceClient, request.correlationId)(request);
    let ccsCredential = void 0;
    if (request.clientInfo) {
      try {
        const clientInfo = buildClientInfo(request.clientInfo, this.cryptoUtils.base64Decode);
        ccsCredential = {
          credential: `${clientInfo.uid}${Separators.CLIENT_INFO_SEPARATOR}${clientInfo.utid}`,
          type: CcsCredentialType.HOME_ACCOUNT_ID
        };
      } catch (e) {
        this.logger.verbose("Could not parse client info for CCS Header: " + e);
      }
    }
    const headers = this.createTokenRequestHeaders(ccsCredential || request.ccsCredential);
    const thumbprint = getRequestThumbprint(this.config.authOptions.clientId, request);
    return invokeAsync(this.executePostToTokenEndpoint.bind(this), PerformanceEvents.AuthorizationCodeClientExecutePostToTokenEndpoint, this.logger, this.performanceClient, request.correlationId)(endpoint, requestBody, headers, thumbprint, request.correlationId, PerformanceEvents.AuthorizationCodeClientExecutePostToTokenEndpoint);
  }
  /**
   * Generates a map for all the params to be sent to the service
   * @param request
   */
  async createTokenRequestBody(request) {
    this.performanceClient?.addQueueMeasurement(PerformanceEvents.AuthClientCreateTokenRequestBody, request.correlationId);
    const parameters = /* @__PURE__ */ new Map();
    addClientId(parameters, request.embeddedClientId || request.tokenBodyParameters?.[CLIENT_ID] || this.config.authOptions.clientId);
    if (!this.includeRedirectUri) {
      if (!request.redirectUri) {
        throw createClientConfigurationError(redirectUriEmpty);
      }
    } else {
      addRedirectUri(parameters, request.redirectUri);
    }
    addScopes(parameters, request.scopes, true, this.oidcDefaultScopes);
    addAuthorizationCode(parameters, request.code);
    addLibraryInfo(parameters, this.config.libraryInfo);
    addApplicationTelemetry(parameters, this.config.telemetry.application);
    addThrottling(parameters);
    if (this.serverTelemetryManager && !isOidcProtocolMode(this.config)) {
      addServerTelemetry(parameters, this.serverTelemetryManager);
    }
    if (request.codeVerifier) {
      addCodeVerifier(parameters, request.codeVerifier);
    }
    if (this.config.clientCredentials.clientSecret) {
      addClientSecret(parameters, this.config.clientCredentials.clientSecret);
    }
    if (this.config.clientCredentials.clientAssertion) {
      const clientAssertion = this.config.clientCredentials.clientAssertion;
      addClientAssertion(parameters, await getClientAssertion(clientAssertion.assertion, this.config.authOptions.clientId, request.resourceRequestUri));
      addClientAssertionType(parameters, clientAssertion.assertionType);
    }
    addGrantType(parameters, GrantType.AUTHORIZATION_CODE_GRANT);
    addClientInfo(parameters);
    if (request.authenticationScheme === AuthenticationScheme.POP) {
      const popTokenGenerator = new PopTokenGenerator(this.cryptoUtils, this.performanceClient);
      let reqCnfData;
      if (!request.popKid) {
        const generatedReqCnfData = await invokeAsync(popTokenGenerator.generateCnf.bind(popTokenGenerator), PerformanceEvents.PopTokenGenerateCnf, this.logger, this.performanceClient, request.correlationId)(request, this.logger);
        reqCnfData = generatedReqCnfData.reqCnfString;
      } else {
        reqCnfData = this.cryptoUtils.encodeKid(request.popKid);
      }
      addPopToken(parameters, reqCnfData);
    } else if (request.authenticationScheme === AuthenticationScheme.SSH) {
      if (request.sshJwk) {
        addSshJwk(parameters, request.sshJwk);
      } else {
        throw createClientConfigurationError(missingSshJwk);
      }
    }
    let ccsCred = void 0;
    if (request.clientInfo) {
      try {
        const clientInfo = buildClientInfo(request.clientInfo, this.cryptoUtils.base64Decode);
        ccsCred = {
          credential: `${clientInfo.uid}${Separators.CLIENT_INFO_SEPARATOR}${clientInfo.utid}`,
          type: CcsCredentialType.HOME_ACCOUNT_ID
        };
      } catch (e) {
        this.logger.verbose("Could not parse client info for CCS Header: " + e);
      }
    } else {
      ccsCred = request.ccsCredential;
    }
    if (this.config.systemOptions.preventCorsPreflight && ccsCred) {
      switch (ccsCred.type) {
        case CcsCredentialType.HOME_ACCOUNT_ID:
          try {
            const clientInfo = buildClientInfoFromHomeAccountId(ccsCred.credential);
            addCcsOid(parameters, clientInfo);
          } catch (e) {
            this.logger.verbose("Could not parse home account ID for CCS Header: " + e);
          }
          break;
        case CcsCredentialType.UPN:
          addCcsUpn(parameters, ccsCred.credential);
          break;
      }
    }
    if (request.embeddedClientId) {
      addBrokerParameters(parameters, this.config.authOptions.clientId, this.config.authOptions.redirectUri);
    }
    if (request.tokenBodyParameters) {
      addExtraQueryParameters(parameters, request.tokenBodyParameters);
    }
    if (request.enableSpaAuthorizationCode && (!request.tokenBodyParameters || !request.tokenBodyParameters[RETURN_SPA_CODE])) {
      addExtraQueryParameters(parameters, {
        [RETURN_SPA_CODE]: "1"
      });
    }
    instrumentBrokerParams(parameters, request.correlationId, this.performanceClient);
    const configClaims = request.skipBrokerClaims && parameters.has(BROKER_CLIENT_ID) ? void 0 : this.config.authOptions.clientCapabilities;
    if (!StringUtils.isEmptyObj(request.claims) || configClaims && configClaims.length > 0) {
      addClaims(parameters, request.claims, configClaims);
    }
    return mapToQueryString(parameters);
  }
  /**
   * This API validates the `EndSessionRequest` and creates a URL
   * @param request
   */
  createLogoutUrlQueryString(request) {
    const parameters = /* @__PURE__ */ new Map();
    if (request.postLogoutRedirectUri) {
      addPostLogoutRedirectUri(parameters, request.postLogoutRedirectUri);
    }
    if (request.correlationId) {
      addCorrelationId(parameters, request.correlationId);
    }
    if (request.idTokenHint) {
      addIdTokenHint(parameters, request.idTokenHint);
    }
    if (request.state) {
      addState(parameters, request.state);
    }
    if (request.logoutHint) {
      addLogoutHint(parameters, request.logoutHint);
    }
    if (request.extraQueryParameters) {
      addExtraQueryParameters(parameters, request.extraQueryParameters);
    }
    if (this.config.authOptions.instanceAware) {
      addInstanceAware(parameters);
    }
    return mapToQueryString(parameters, this.config.authOptions.encodeExtraQueryParams, request.extraQueryParameters);
  }
}
const DEFAULT_REFRESH_TOKEN_EXPIRATION_OFFSET_SECONDS = 300;
class RefreshTokenClient extends BaseClient {
  constructor(configuration, performanceClient) {
    super(configuration, performanceClient);
  }
  async acquireToken(request, apiId) {
    this.performanceClient?.addQueueMeasurement(PerformanceEvents.RefreshTokenClientAcquireToken, request.correlationId);
    const reqTimestamp = nowSeconds();
    const response = await invokeAsync(this.executeTokenRequest.bind(this), PerformanceEvents.RefreshTokenClientExecuteTokenRequest, this.logger, this.performanceClient, request.correlationId)(request, this.authority);
    const requestId = response.headers?.[HeaderNames.X_MS_REQUEST_ID];
    const responseHandler = new ResponseHandler(this.config.authOptions.clientId, this.cacheManager, this.cryptoUtils, this.logger, this.config.serializableCache, this.config.persistencePlugin);
    responseHandler.validateTokenResponse(response.body);
    return invokeAsync(responseHandler.handleServerTokenResponse.bind(responseHandler), PerformanceEvents.HandleServerTokenResponse, this.logger, this.performanceClient, request.correlationId)(response.body, this.authority, reqTimestamp, request, apiId, void 0, void 0, true, request.forceCache, requestId);
  }
  /**
   * Gets cached refresh token and attaches to request, then calls acquireToken API
   * @param request
   */
  async acquireTokenByRefreshToken(request, apiId) {
    if (!request) {
      throw createClientConfigurationError(tokenRequestEmpty);
    }
    this.performanceClient?.addQueueMeasurement(PerformanceEvents.RefreshTokenClientAcquireTokenByRefreshToken, request.correlationId);
    if (!request.account) {
      throw createClientAuthError(noAccountInSilentRequest);
    }
    const isFOCI = this.cacheManager.isAppMetadataFOCI(request.account.environment);
    if (isFOCI) {
      try {
        return await invokeAsync(this.acquireTokenWithCachedRefreshToken.bind(this), PerformanceEvents.RefreshTokenClientAcquireTokenWithCachedRefreshToken, this.logger, this.performanceClient, request.correlationId)(request, true, apiId);
      } catch (e) {
        const noFamilyRTInCache = e instanceof InteractionRequiredAuthError && e.errorCode === noTokensFound;
        const clientMismatchErrorWithFamilyRT = e instanceof ServerError && e.errorCode === Errors.INVALID_GRANT_ERROR && e.subError === Errors.CLIENT_MISMATCH_ERROR;
        if (noFamilyRTInCache || clientMismatchErrorWithFamilyRT) {
          return invokeAsync(this.acquireTokenWithCachedRefreshToken.bind(this), PerformanceEvents.RefreshTokenClientAcquireTokenWithCachedRefreshToken, this.logger, this.performanceClient, request.correlationId)(request, false, apiId);
        } else {
          throw e;
        }
      }
    }
    return invokeAsync(this.acquireTokenWithCachedRefreshToken.bind(this), PerformanceEvents.RefreshTokenClientAcquireTokenWithCachedRefreshToken, this.logger, this.performanceClient, request.correlationId)(request, false, apiId);
  }
  /**
   * makes a network call to acquire tokens by exchanging RefreshToken available in userCache; throws if refresh token is not cached
   * @param request
   */
  async acquireTokenWithCachedRefreshToken(request, foci, apiId) {
    this.performanceClient?.addQueueMeasurement(PerformanceEvents.RefreshTokenClientAcquireTokenWithCachedRefreshToken, request.correlationId);
    const refreshToken = invoke(this.cacheManager.getRefreshToken.bind(this.cacheManager), PerformanceEvents.CacheManagerGetRefreshToken, this.logger, this.performanceClient, request.correlationId)(request.account, foci, request.correlationId, void 0, this.performanceClient);
    if (!refreshToken) {
      throw createInteractionRequiredAuthError(noTokensFound);
    }
    if (refreshToken.expiresOn) {
      const offset = request.refreshTokenExpirationOffsetSeconds || DEFAULT_REFRESH_TOKEN_EXPIRATION_OFFSET_SECONDS;
      this.performanceClient?.addFields({
        cacheRtExpiresOnSeconds: Number(refreshToken.expiresOn),
        rtOffsetSeconds: offset
      }, request.correlationId);
      if (isTokenExpired(refreshToken.expiresOn, offset)) {
        throw createInteractionRequiredAuthError(refreshTokenExpired);
      }
    }
    const refreshTokenRequest = {
      ...request,
      refreshToken: refreshToken.secret,
      authenticationScheme: request.authenticationScheme || AuthenticationScheme.BEARER,
      ccsCredential: {
        credential: request.account.homeAccountId,
        type: CcsCredentialType.HOME_ACCOUNT_ID
      }
    };
    try {
      return await invokeAsync(this.acquireToken.bind(this), PerformanceEvents.RefreshTokenClientAcquireToken, this.logger, this.performanceClient, request.correlationId)(refreshTokenRequest, apiId);
    } catch (e) {
      if (e instanceof InteractionRequiredAuthError) {
        if (e.subError === badToken) {
          this.logger.verbose("acquireTokenWithRefreshToken: bad refresh token, removing from cache");
          const badRefreshTokenKey = this.cacheManager.generateCredentialKey(refreshToken);
          this.cacheManager.removeRefreshToken(badRefreshTokenKey, request.correlationId);
        }
      }
      throw e;
    }
  }
  /**
   * Constructs the network message and makes a NW call to the underlying secure token service
   * @param request
   * @param authority
   */
  async executeTokenRequest(request, authority) {
    this.performanceClient?.addQueueMeasurement(PerformanceEvents.RefreshTokenClientExecuteTokenRequest, request.correlationId);
    const queryParametersString = this.createTokenQueryParameters(request);
    const endpoint = UrlString.appendQueryString(authority.tokenEndpoint, queryParametersString);
    const requestBody = await invokeAsync(this.createTokenRequestBody.bind(this), PerformanceEvents.RefreshTokenClientCreateTokenRequestBody, this.logger, this.performanceClient, request.correlationId)(request);
    const headers = this.createTokenRequestHeaders(request.ccsCredential);
    const thumbprint = getRequestThumbprint(this.config.authOptions.clientId, request);
    return invokeAsync(this.executePostToTokenEndpoint.bind(this), PerformanceEvents.RefreshTokenClientExecutePostToTokenEndpoint, this.logger, this.performanceClient, request.correlationId)(endpoint, requestBody, headers, thumbprint, request.correlationId, PerformanceEvents.RefreshTokenClientExecutePostToTokenEndpoint);
  }
  /**
   * Helper function to create the token request body
   * @param request
   */
  async createTokenRequestBody(request) {
    this.performanceClient?.addQueueMeasurement(PerformanceEvents.RefreshTokenClientCreateTokenRequestBody, request.correlationId);
    const parameters = /* @__PURE__ */ new Map();
    addClientId(parameters, request.embeddedClientId || request.tokenBodyParameters?.[CLIENT_ID] || this.config.authOptions.clientId);
    if (request.redirectUri) {
      addRedirectUri(parameters, request.redirectUri);
    }
    addScopes(parameters, request.scopes, true, this.config.authOptions.authority.options.OIDCOptions?.defaultScopes);
    addGrantType(parameters, GrantType.REFRESH_TOKEN_GRANT);
    addClientInfo(parameters);
    addLibraryInfo(parameters, this.config.libraryInfo);
    addApplicationTelemetry(parameters, this.config.telemetry.application);
    addThrottling(parameters);
    if (this.serverTelemetryManager && !isOidcProtocolMode(this.config)) {
      addServerTelemetry(parameters, this.serverTelemetryManager);
    }
    addRefreshToken(parameters, request.refreshToken);
    if (this.config.clientCredentials.clientSecret) {
      addClientSecret(parameters, this.config.clientCredentials.clientSecret);
    }
    if (this.config.clientCredentials.clientAssertion) {
      const clientAssertion = this.config.clientCredentials.clientAssertion;
      addClientAssertion(parameters, await getClientAssertion(clientAssertion.assertion, this.config.authOptions.clientId, request.resourceRequestUri));
      addClientAssertionType(parameters, clientAssertion.assertionType);
    }
    if (request.authenticationScheme === AuthenticationScheme.POP) {
      const popTokenGenerator = new PopTokenGenerator(this.cryptoUtils, this.performanceClient);
      let reqCnfData;
      if (!request.popKid) {
        const generatedReqCnfData = await invokeAsync(popTokenGenerator.generateCnf.bind(popTokenGenerator), PerformanceEvents.PopTokenGenerateCnf, this.logger, this.performanceClient, request.correlationId)(request, this.logger);
        reqCnfData = generatedReqCnfData.reqCnfString;
      } else {
        reqCnfData = this.cryptoUtils.encodeKid(request.popKid);
      }
      addPopToken(parameters, reqCnfData);
    } else if (request.authenticationScheme === AuthenticationScheme.SSH) {
      if (request.sshJwk) {
        addSshJwk(parameters, request.sshJwk);
      } else {
        throw createClientConfigurationError(missingSshJwk);
      }
    }
    if (this.config.systemOptions.preventCorsPreflight && request.ccsCredential) {
      switch (request.ccsCredential.type) {
        case CcsCredentialType.HOME_ACCOUNT_ID:
          try {
            const clientInfo = buildClientInfoFromHomeAccountId(request.ccsCredential.credential);
            addCcsOid(parameters, clientInfo);
          } catch (e) {
            this.logger.verbose("Could not parse home account ID for CCS Header: " + e);
          }
          break;
        case CcsCredentialType.UPN:
          addCcsUpn(parameters, request.ccsCredential.credential);
          break;
      }
    }
    if (request.embeddedClientId) {
      addBrokerParameters(parameters, this.config.authOptions.clientId, this.config.authOptions.redirectUri);
    }
    if (request.tokenBodyParameters) {
      addExtraQueryParameters(parameters, request.tokenBodyParameters);
    }
    instrumentBrokerParams(parameters, request.correlationId, this.performanceClient);
    const configClaims = request.skipBrokerClaims && parameters.has(BROKER_CLIENT_ID) ? void 0 : this.config.authOptions.clientCapabilities;
    if (!StringUtils.isEmptyObj(request.claims) || configClaims && configClaims.length > 0) {
      addClaims(parameters, request.claims, configClaims);
    }
    return mapToQueryString(parameters);
  }
}
class SilentFlowClient extends BaseClient {
  constructor(configuration, performanceClient) {
    super(configuration, performanceClient);
  }
  /**
   * Retrieves token from cache or throws an error if it must be refreshed.
   * @param request
   */
  async acquireCachedToken(request) {
    this.performanceClient?.addQueueMeasurement(PerformanceEvents.SilentFlowClientAcquireCachedToken, request.correlationId);
    let lastCacheOutcome = CacheOutcome.NOT_APPLICABLE;
    if (request.forceRefresh || !this.config.cacheOptions.claimsBasedCachingEnabled && !StringUtils.isEmptyObj(request.claims)) {
      this.setCacheOutcome(CacheOutcome.FORCE_REFRESH_OR_CLAIMS, request.correlationId);
      throw createClientAuthError(tokenRefreshRequired);
    }
    if (!request.account) {
      throw createClientAuthError(noAccountInSilentRequest);
    }
    const requestTenantId = request.account.tenantId || getTenantFromAuthorityString(request.authority);
    const tokenKeys = this.cacheManager.getTokenKeys();
    const cachedAccessToken = this.cacheManager.getAccessToken(request.account, request, tokenKeys, requestTenantId);
    if (!cachedAccessToken) {
      this.setCacheOutcome(CacheOutcome.NO_CACHED_ACCESS_TOKEN, request.correlationId);
      throw createClientAuthError(tokenRefreshRequired);
    } else if (wasClockTurnedBack(cachedAccessToken.cachedAt) || isTokenExpired(cachedAccessToken.expiresOn, this.config.systemOptions.tokenRenewalOffsetSeconds)) {
      this.setCacheOutcome(CacheOutcome.CACHED_ACCESS_TOKEN_EXPIRED, request.correlationId);
      throw createClientAuthError(tokenRefreshRequired);
    } else if (cachedAccessToken.refreshOn && isTokenExpired(cachedAccessToken.refreshOn, 0)) {
      lastCacheOutcome = CacheOutcome.PROACTIVELY_REFRESHED;
    }
    const environment = request.authority || this.authority.getPreferredCache();
    const cacheRecord = {
      account: this.cacheManager.getAccount(this.cacheManager.generateAccountKey(request.account), request.correlationId),
      accessToken: cachedAccessToken,
      idToken: this.cacheManager.getIdToken(request.account, request.correlationId, tokenKeys, requestTenantId, this.performanceClient),
      refreshToken: null,
      appMetadata: this.cacheManager.readAppMetadataFromCache(environment)
    };
    this.setCacheOutcome(lastCacheOutcome, request.correlationId);
    if (this.config.serverTelemetryManager) {
      this.config.serverTelemetryManager.incrementCacheHits();
    }
    return [
      await invokeAsync(this.generateResultFromCacheRecord.bind(this), PerformanceEvents.SilentFlowClientGenerateResultFromCacheRecord, this.logger, this.performanceClient, request.correlationId)(cacheRecord, request),
      lastCacheOutcome
    ];
  }
  setCacheOutcome(cacheOutcome, correlationId) {
    this.serverTelemetryManager?.setCacheOutcome(cacheOutcome);
    this.performanceClient?.addFields({
      cacheOutcome
    }, correlationId);
    if (cacheOutcome !== CacheOutcome.NOT_APPLICABLE) {
      this.logger.info(`Token refresh is required due to cache outcome: ${cacheOutcome}`);
    }
  }
  /**
   * Helper function to build response object from the CacheRecord
   * @param cacheRecord
   */
  async generateResultFromCacheRecord(cacheRecord, request) {
    this.performanceClient?.addQueueMeasurement(PerformanceEvents.SilentFlowClientGenerateResultFromCacheRecord, request.correlationId);
    let idTokenClaims;
    if (cacheRecord.idToken) {
      idTokenClaims = extractTokenClaims(cacheRecord.idToken.secret, this.config.cryptoInterface.base64Decode);
    }
    if (request.maxAge || request.maxAge === 0) {
      const authTime = idTokenClaims?.auth_time;
      if (!authTime) {
        throw createClientAuthError(authTimeNotFound);
      }
      checkMaxAge(authTime, request.maxAge);
    }
    return ResponseHandler.generateAuthenticationResult(this.cryptoUtils, this.authority, cacheRecord, true, request, idTokenClaims);
  }
}
function getStandardAuthorizeRequestParameters(authOptions, request, logger, performanceClient) {
  const correlationId = request.correlationId;
  const parameters = /* @__PURE__ */ new Map();
  addClientId(parameters, request.embeddedClientId || request.extraQueryParameters?.[CLIENT_ID] || authOptions.clientId);
  const requestScopes = [
    ...request.scopes || [],
    ...request.extraScopesToConsent || []
  ];
  addScopes(parameters, requestScopes, true, authOptions.authority.options.OIDCOptions?.defaultScopes);
  addRedirectUri(parameters, request.redirectUri);
  addCorrelationId(parameters, correlationId);
  addResponseMode(parameters, request.responseMode);
  addClientInfo(parameters);
  addCliData(parameters);
  if (request.prompt) {
    addPrompt(parameters, request.prompt);
  }
  if (request.domainHint) {
    addDomainHint(parameters, request.domainHint);
  }
  if (request.prompt !== PromptValue.SELECT_ACCOUNT) {
    if (request.sid && request.prompt === PromptValue.NONE) {
      logger.verbose("createAuthCodeUrlQueryString: Prompt is none, adding sid from request");
      addSid(parameters, request.sid);
    } else if (request.account) {
      const accountSid = extractAccountSid(request.account);
      let accountLoginHintClaim = extractLoginHint(request.account);
      if (accountLoginHintClaim && request.domainHint) {
        logger.warning(`AuthorizationCodeClient.createAuthCodeUrlQueryString: "domainHint" param is set, skipping opaque "login_hint" claim. Please consider not passing domainHint`);
        accountLoginHintClaim = null;
      }
      if (accountLoginHintClaim) {
        logger.verbose("createAuthCodeUrlQueryString: login_hint claim present on account");
        addLoginHint(parameters, accountLoginHintClaim);
        try {
          const clientInfo = buildClientInfoFromHomeAccountId(request.account.homeAccountId);
          addCcsOid(parameters, clientInfo);
        } catch (e) {
          logger.verbose("createAuthCodeUrlQueryString: Could not parse home account ID for CCS Header");
        }
      } else if (accountSid && request.prompt === PromptValue.NONE) {
        logger.verbose("createAuthCodeUrlQueryString: Prompt is none, adding sid from account");
        addSid(parameters, accountSid);
        try {
          const clientInfo = buildClientInfoFromHomeAccountId(request.account.homeAccountId);
          addCcsOid(parameters, clientInfo);
        } catch (e) {
          logger.verbose("createAuthCodeUrlQueryString: Could not parse home account ID for CCS Header");
        }
      } else if (request.loginHint) {
        logger.verbose("createAuthCodeUrlQueryString: Adding login_hint from request");
        addLoginHint(parameters, request.loginHint);
        addCcsUpn(parameters, request.loginHint);
      } else if (request.account.username) {
        logger.verbose("createAuthCodeUrlQueryString: Adding login_hint from account");
        addLoginHint(parameters, request.account.username);
        try {
          const clientInfo = buildClientInfoFromHomeAccountId(request.account.homeAccountId);
          addCcsOid(parameters, clientInfo);
        } catch (e) {
          logger.verbose("createAuthCodeUrlQueryString: Could not parse home account ID for CCS Header");
        }
      }
    } else if (request.loginHint) {
      logger.verbose("createAuthCodeUrlQueryString: No account, adding login_hint from request");
      addLoginHint(parameters, request.loginHint);
      addCcsUpn(parameters, request.loginHint);
    }
  } else {
    logger.verbose("createAuthCodeUrlQueryString: Prompt is select_account, ignoring account hints");
  }
  if (request.nonce) {
    addNonce(parameters, request.nonce);
  }
  if (request.state) {
    addState(parameters, request.state);
  }
  if (request.embeddedClientId) {
    addBrokerParameters(parameters, authOptions.clientId, authOptions.redirectUri);
  }
  const configClaims = request.skipBrokerClaims && parameters.has(BROKER_CLIENT_ID) ? void 0 : authOptions.clientCapabilities;
  if (request.claims || configClaims && configClaims.length > 0) {
    addClaims(parameters, request.claims, configClaims);
  }
  if (authOptions.instanceAware && (!request.extraQueryParameters || !Object.keys(request.extraQueryParameters).includes(INSTANCE_AWARE))) {
    addInstanceAware(parameters);
  }
  return parameters;
}
function getAuthorizeUrl(authority, requestParameters, encodeParams, extraQueryParameters) {
  const queryString = mapToQueryString(requestParameters, encodeParams, extraQueryParameters);
  return UrlString.appendQueryString(authority.authorizationEndpoint, queryString);
}
function extractAccountSid(account) {
  return account.idTokenClaims?.sid || null;
}
function extractLoginHint(account) {
  return account.loginHint || account.idTokenClaims?.login_hint || null;
}
const skuGroupSeparator = ",";
const skuValueSeparator = "|";
function makeExtraSkuString(params) {
  const { skus, libraryName, libraryVersion, extensionName, extensionVersion } = params;
  const skuMap = /* @__PURE__ */ new Map([
    [0, [libraryName, libraryVersion]],
    [2, [extensionName, extensionVersion]]
  ]);
  let skuArr = [];
  if (skus?.length) {
    skuArr = skus.split(skuGroupSeparator);
    if (skuArr.length < 4) {
      return skus;
    }
  } else {
    skuArr = Array.from({ length: 4 }, () => skuValueSeparator);
  }
  skuMap.forEach((value, key) => {
    if (value.length === 2 && value[0]?.length && value[1]?.length) {
      setSku({
        skuArr,
        index: key,
        skuName: value[0],
        skuVersion: value[1]
      });
    }
  });
  return skuArr.join(skuGroupSeparator);
}
function setSku(params) {
  const { skuArr, index, skuName, skuVersion } = params;
  if (index >= skuArr.length) {
    return;
  }
  skuArr[index] = [skuName, skuVersion].join(skuValueSeparator);
}
class ServerTelemetryManager {
  constructor(telemetryRequest, cacheManager) {
    this.cacheOutcome = CacheOutcome.NOT_APPLICABLE;
    this.cacheManager = cacheManager;
    this.apiId = telemetryRequest.apiId;
    this.correlationId = telemetryRequest.correlationId;
    this.wrapperSKU = telemetryRequest.wrapperSKU || Constants$1.EMPTY_STRING;
    this.wrapperVer = telemetryRequest.wrapperVer || Constants$1.EMPTY_STRING;
    this.telemetryCacheKey = SERVER_TELEM_CONSTANTS.CACHE_KEY + Separators.CACHE_KEY_SEPARATOR + telemetryRequest.clientId;
  }
  /**
   * API to add MSER Telemetry to request
   */
  generateCurrentRequestHeaderValue() {
    const request = `${this.apiId}${SERVER_TELEM_CONSTANTS.VALUE_SEPARATOR}${this.cacheOutcome}`;
    const platformFieldsArr = [this.wrapperSKU, this.wrapperVer];
    const nativeBrokerErrorCode = this.getNativeBrokerErrorCode();
    if (nativeBrokerErrorCode?.length) {
      platformFieldsArr.push(`broker_error=${nativeBrokerErrorCode}`);
    }
    const platformFields = platformFieldsArr.join(SERVER_TELEM_CONSTANTS.VALUE_SEPARATOR);
    const regionDiscoveryFields = this.getRegionDiscoveryFields();
    const requestWithRegionDiscoveryFields = [
      request,
      regionDiscoveryFields
    ].join(SERVER_TELEM_CONSTANTS.VALUE_SEPARATOR);
    return [
      SERVER_TELEM_CONSTANTS.SCHEMA_VERSION,
      requestWithRegionDiscoveryFields,
      platformFields
    ].join(SERVER_TELEM_CONSTANTS.CATEGORY_SEPARATOR);
  }
  /**
   * API to add MSER Telemetry for the last failed request
   */
  generateLastRequestHeaderValue() {
    const lastRequests = this.getLastRequests();
    const maxErrors = ServerTelemetryManager.maxErrorsToSend(lastRequests);
    const failedRequests = lastRequests.failedRequests.slice(0, 2 * maxErrors).join(SERVER_TELEM_CONSTANTS.VALUE_SEPARATOR);
    const errors = lastRequests.errors.slice(0, maxErrors).join(SERVER_TELEM_CONSTANTS.VALUE_SEPARATOR);
    const errorCount = lastRequests.errors.length;
    const overflow = maxErrors < errorCount ? SERVER_TELEM_CONSTANTS.OVERFLOW_TRUE : SERVER_TELEM_CONSTANTS.OVERFLOW_FALSE;
    const platformFields = [errorCount, overflow].join(SERVER_TELEM_CONSTANTS.VALUE_SEPARATOR);
    return [
      SERVER_TELEM_CONSTANTS.SCHEMA_VERSION,
      lastRequests.cacheHits,
      failedRequests,
      errors,
      platformFields
    ].join(SERVER_TELEM_CONSTANTS.CATEGORY_SEPARATOR);
  }
  /**
   * API to cache token failures for MSER data capture
   * @param error
   */
  cacheFailedRequest(error) {
    const lastRequests = this.getLastRequests();
    if (lastRequests.errors.length >= SERVER_TELEM_CONSTANTS.MAX_CACHED_ERRORS) {
      lastRequests.failedRequests.shift();
      lastRequests.failedRequests.shift();
      lastRequests.errors.shift();
    }
    lastRequests.failedRequests.push(this.apiId, this.correlationId);
    if (error instanceof Error && !!error && error.toString()) {
      if (error instanceof AuthError) {
        if (error.subError) {
          lastRequests.errors.push(error.subError);
        } else if (error.errorCode) {
          lastRequests.errors.push(error.errorCode);
        } else {
          lastRequests.errors.push(error.toString());
        }
      } else {
        lastRequests.errors.push(error.toString());
      }
    } else {
      lastRequests.errors.push(SERVER_TELEM_CONSTANTS.UNKNOWN_ERROR);
    }
    this.cacheManager.setServerTelemetry(this.telemetryCacheKey, lastRequests, this.correlationId);
    return;
  }
  /**
   * Update server telemetry cache entry by incrementing cache hit counter
   */
  incrementCacheHits() {
    const lastRequests = this.getLastRequests();
    lastRequests.cacheHits += 1;
    this.cacheManager.setServerTelemetry(this.telemetryCacheKey, lastRequests, this.correlationId);
    return lastRequests.cacheHits;
  }
  /**
   * Get the server telemetry entity from cache or initialize a new one
   */
  getLastRequests() {
    const initialValue = {
      failedRequests: [],
      errors: [],
      cacheHits: 0
    };
    const lastRequests = this.cacheManager.getServerTelemetry(this.telemetryCacheKey);
    return lastRequests || initialValue;
  }
  /**
   * Remove server telemetry cache entry
   */
  clearTelemetryCache() {
    const lastRequests = this.getLastRequests();
    const numErrorsFlushed = ServerTelemetryManager.maxErrorsToSend(lastRequests);
    const errorCount = lastRequests.errors.length;
    if (numErrorsFlushed === errorCount) {
      this.cacheManager.removeItem(this.telemetryCacheKey, this.correlationId);
    } else {
      const serverTelemEntity = {
        failedRequests: lastRequests.failedRequests.slice(numErrorsFlushed * 2),
        errors: lastRequests.errors.slice(numErrorsFlushed),
        cacheHits: 0
      };
      this.cacheManager.setServerTelemetry(this.telemetryCacheKey, serverTelemEntity, this.correlationId);
    }
  }
  /**
   * Returns the maximum number of errors that can be flushed to the server in the next network request
   * @param serverTelemetryEntity
   */
  static maxErrorsToSend(serverTelemetryEntity) {
    let i;
    let maxErrors = 0;
    let dataSize = 0;
    const errorCount = serverTelemetryEntity.errors.length;
    for (i = 0; i < errorCount; i++) {
      const apiId = serverTelemetryEntity.failedRequests[2 * i] || Constants$1.EMPTY_STRING;
      const correlationId = serverTelemetryEntity.failedRequests[2 * i + 1] || Constants$1.EMPTY_STRING;
      const errorCode = serverTelemetryEntity.errors[i] || Constants$1.EMPTY_STRING;
      dataSize += apiId.toString().length + correlationId.toString().length + errorCode.length + 3;
      if (dataSize < SERVER_TELEM_CONSTANTS.MAX_LAST_HEADER_BYTES) {
        maxErrors += 1;
      } else {
        break;
      }
    }
    return maxErrors;
  }
  /**
   * Get the region discovery fields
   *
   * @returns string
   */
  getRegionDiscoveryFields() {
    const regionDiscoveryFields = [];
    regionDiscoveryFields.push(this.regionUsed || Constants$1.EMPTY_STRING);
    regionDiscoveryFields.push(this.regionSource || Constants$1.EMPTY_STRING);
    regionDiscoveryFields.push(this.regionOutcome || Constants$1.EMPTY_STRING);
    return regionDiscoveryFields.join(",");
  }
  /**
   * Update the region discovery metadata
   *
   * @param regionDiscoveryMetadata
   * @returns void
   */
  updateRegionDiscoveryMetadata(regionDiscoveryMetadata) {
    this.regionUsed = regionDiscoveryMetadata.region_used;
    this.regionSource = regionDiscoveryMetadata.region_source;
    this.regionOutcome = regionDiscoveryMetadata.region_outcome;
  }
  /**
   * Set cache outcome
   */
  setCacheOutcome(cacheOutcome) {
    this.cacheOutcome = cacheOutcome;
  }
  setNativeBrokerErrorCode(errorCode) {
    const lastRequests = this.getLastRequests();
    lastRequests.nativeBrokerErrorCode = errorCode;
    this.cacheManager.setServerTelemetry(this.telemetryCacheKey, lastRequests, this.correlationId);
  }
  getNativeBrokerErrorCode() {
    return this.getLastRequests().nativeBrokerErrorCode;
  }
  clearNativeBrokerErrorCode() {
    const lastRequests = this.getLastRequests();
    delete lastRequests.nativeBrokerErrorCode;
    this.cacheManager.setServerTelemetry(this.telemetryCacheKey, lastRequests, this.correlationId);
  }
  static makeExtraSkuString(params) {
    return makeExtraSkuString(params);
  }
}
class Deserializer {
  /**
   * Parse the JSON blob in memory and deserialize the content
   * @param cachedJson - JSON blob cache
   */
  static deserializeJSONBlob(jsonFile) {
    const deserializedCache = !jsonFile ? {} : JSON.parse(jsonFile);
    return deserializedCache;
  }
  /**
   * Deserializes accounts to AccountEntity objects
   * @param accounts - accounts of type SerializedAccountEntity
   */
  static deserializeAccounts(accounts) {
    const accountObjects = {};
    if (accounts) {
      Object.keys(accounts).map(function(key) {
        const serializedAcc = accounts[key];
        const mappedAcc = {
          homeAccountId: serializedAcc.home_account_id,
          environment: serializedAcc.environment,
          realm: serializedAcc.realm,
          localAccountId: serializedAcc.local_account_id,
          username: serializedAcc.username,
          authorityType: serializedAcc.authority_type,
          name: serializedAcc.name,
          clientInfo: serializedAcc.client_info,
          lastModificationTime: serializedAcc.last_modification_time,
          lastModificationApp: serializedAcc.last_modification_app,
          tenantProfiles: serializedAcc.tenantProfiles?.map((serializedTenantProfile) => {
            return JSON.parse(serializedTenantProfile);
          }),
          lastUpdatedAt: Date.now().toString()
        };
        const account = new AccountEntity();
        CacheManager.toObject(account, mappedAcc);
        accountObjects[key] = account;
      });
    }
    return accountObjects;
  }
  /**
   * Deserializes id tokens to IdTokenEntity objects
   * @param idTokens - credentials of type SerializedIdTokenEntity
   */
  static deserializeIdTokens(idTokens) {
    const idObjects = {};
    if (idTokens) {
      Object.keys(idTokens).map(function(key) {
        const serializedIdT = idTokens[key];
        const idToken = {
          homeAccountId: serializedIdT.home_account_id,
          environment: serializedIdT.environment,
          credentialType: serializedIdT.credential_type,
          clientId: serializedIdT.client_id,
          secret: serializedIdT.secret,
          realm: serializedIdT.realm,
          lastUpdatedAt: Date.now().toString()
        };
        idObjects[key] = idToken;
      });
    }
    return idObjects;
  }
  /**
   * Deserializes access tokens to AccessTokenEntity objects
   * @param accessTokens - access tokens of type SerializedAccessTokenEntity
   */
  static deserializeAccessTokens(accessTokens) {
    const atObjects = {};
    if (accessTokens) {
      Object.keys(accessTokens).map(function(key) {
        const serializedAT = accessTokens[key];
        const accessToken = {
          homeAccountId: serializedAT.home_account_id,
          environment: serializedAT.environment,
          credentialType: serializedAT.credential_type,
          clientId: serializedAT.client_id,
          secret: serializedAT.secret,
          realm: serializedAT.realm,
          target: serializedAT.target,
          cachedAt: serializedAT.cached_at,
          expiresOn: serializedAT.expires_on,
          extendedExpiresOn: serializedAT.extended_expires_on,
          refreshOn: serializedAT.refresh_on,
          keyId: serializedAT.key_id,
          tokenType: serializedAT.token_type,
          requestedClaims: serializedAT.requestedClaims,
          requestedClaimsHash: serializedAT.requestedClaimsHash,
          userAssertionHash: serializedAT.userAssertionHash,
          lastUpdatedAt: Date.now().toString()
        };
        atObjects[key] = accessToken;
      });
    }
    return atObjects;
  }
  /**
   * Deserializes refresh tokens to RefreshTokenEntity objects
   * @param refreshTokens - refresh tokens of type SerializedRefreshTokenEntity
   */
  static deserializeRefreshTokens(refreshTokens) {
    const rtObjects = {};
    if (refreshTokens) {
      Object.keys(refreshTokens).map(function(key) {
        const serializedRT = refreshTokens[key];
        const refreshToken = {
          homeAccountId: serializedRT.home_account_id,
          environment: serializedRT.environment,
          credentialType: serializedRT.credential_type,
          clientId: serializedRT.client_id,
          secret: serializedRT.secret,
          familyId: serializedRT.family_id,
          target: serializedRT.target,
          realm: serializedRT.realm,
          lastUpdatedAt: Date.now().toString()
        };
        rtObjects[key] = refreshToken;
      });
    }
    return rtObjects;
  }
  /**
   * Deserializes appMetadata to AppMetaData objects
   * @param appMetadata - app metadata of type SerializedAppMetadataEntity
   */
  static deserializeAppMetadata(appMetadata) {
    const appMetadataObjects = {};
    if (appMetadata) {
      Object.keys(appMetadata).map(function(key) {
        const serializedAmdt = appMetadata[key];
        appMetadataObjects[key] = {
          clientId: serializedAmdt.client_id,
          environment: serializedAmdt.environment,
          familyId: serializedAmdt.family_id
        };
      });
    }
    return appMetadataObjects;
  }
  /**
   * Deserialize an inMemory Cache
   * @param jsonCache - JSON blob cache
   */
  static deserializeAllCache(jsonCache) {
    return {
      accounts: jsonCache.Account ? this.deserializeAccounts(jsonCache.Account) : {},
      idTokens: jsonCache.IdToken ? this.deserializeIdTokens(jsonCache.IdToken) : {},
      accessTokens: jsonCache.AccessToken ? this.deserializeAccessTokens(jsonCache.AccessToken) : {},
      refreshTokens: jsonCache.RefreshToken ? this.deserializeRefreshTokens(jsonCache.RefreshToken) : {},
      appMetadata: jsonCache.AppMetadata ? this.deserializeAppMetadata(jsonCache.AppMetadata) : {}
    };
  }
}
const HttpMethod = {
  GET: "get",
  POST: "post"
};
const ProxyStatus = {
  SUCCESS_RANGE_START: HttpStatus.SUCCESS_RANGE_START,
  SUCCESS_RANGE_END: HttpStatus.SUCCESS_RANGE_END,
  SERVER_ERROR: HttpStatus.SERVER_ERROR
};
const RANDOM_OCTET_SIZE = 32;
const Hash = {
  SHA256: "sha256"
};
const CharSet = {
  CV_CHARSET: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~"
};
const CACHE = {
  KEY_SEPARATOR: "-"
};
const Constants = {
  MSAL_SKU: "msal.js.node",
  JWT_BEARER_ASSERTION_TYPE: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
  AUTHORIZATION_PENDING: "authorization_pending",
  HTTP_PROTOCOL: "http://",
  LOCALHOST: "localhost"
};
const ApiId = {
  acquireTokenSilent: 62,
  acquireTokenByUsernamePassword: 371,
  acquireTokenByDeviceCode: 671,
  acquireTokenByClientCredential: 771,
  acquireTokenByOBO: 772,
  acquireTokenWithManagedIdentity: 773,
  acquireTokenByCode: 871,
  acquireTokenByRefreshToken: 872
};
const JwtConstants = {
  RSA_256: "RS256",
  PSS_256: "PS256",
  X5T_256: "x5t#S256",
  X5T: "x5t",
  X5C: "x5c",
  AUDIENCE: "aud",
  EXPIRATION_TIME: "exp",
  ISSUER: "iss",
  SUBJECT: "sub",
  NOT_BEFORE: "nbf",
  JWT_ID: "jti"
};
const LOOPBACK_SERVER_CONSTANTS = {
  INTERVAL_MS: 100,
  TIMEOUT_MS: 5e3
};
class NetworkUtils {
  static getNetworkResponse(headers, body, statusCode) {
    return {
      headers,
      body,
      status: statusCode
    };
  }
  /*
   * Utility function that converts a URL object into an ordinary options object as expected by the
   * http.request and https.request APIs.
   * https://github.com/nodejs/node/blob/main/lib/internal/url.js#L1090
   */
  static urlToHttpOptions(url2) {
    const options = {
      protocol: url2.protocol,
      hostname: url2.hostname && url2.hostname.startsWith("[") ? url2.hostname.slice(1, -1) : url2.hostname,
      hash: url2.hash,
      search: url2.search,
      pathname: url2.pathname,
      path: `${url2.pathname || ""}${url2.search || ""}`,
      href: url2.href
    };
    if (url2.port !== "") {
      options.port = Number(url2.port);
    }
    if (url2.username || url2.password) {
      options.auth = `${decodeURIComponent(url2.username)}:${decodeURIComponent(url2.password)}`;
    }
    return options;
  }
}
const name = "@azure/msal-node";
const version = "3.8.10";
class HttpClient {
  constructor(proxyUrl, customAgentOptions, loggerOptions) {
    this.networkRequestViaProxy = (httpMethod, destinationUrlString, options, timeout) => {
      const destinationUrl = new URL(destinationUrlString);
      const proxyUrl2 = new URL(this.proxyUrl);
      const headers = options?.headers || {};
      const tunnelRequestOptions = {
        host: proxyUrl2.hostname,
        port: proxyUrl2.port,
        method: "CONNECT",
        path: destinationUrl.hostname,
        headers
      };
      if (this.customAgentOptions && Object.keys(this.customAgentOptions).length) {
        tunnelRequestOptions.agent = new http.Agent(this.customAgentOptions);
      }
      let postRequestStringContent = "";
      if (httpMethod === HttpMethod.POST) {
        const body = options?.body || "";
        postRequestStringContent = `Content-Type: application/x-www-form-urlencoded\r
Content-Length: ${body.length}\r
\r
${body}`;
      } else {
        if (timeout) {
          tunnelRequestOptions.timeout = timeout;
        }
      }
      const outgoingRequestString = `${httpMethod.toUpperCase()} ${destinationUrl.href} HTTP/1.1\r
Host: ${destinationUrl.host}\r
Connection: close\r
` + postRequestStringContent + "\r\n";
      return new Promise((resolve, reject) => {
        const request = http.request(tunnelRequestOptions);
        if (timeout) {
          request.on("timeout", () => {
            this.logUrlWithPiiAwareness(`Request timeout after ${timeout}ms for URL`, destinationUrlString);
            request.destroy();
            reject(new Error(`Request time out after ${timeout}ms`));
          });
        }
        request.end();
        request.on("connect", (response, socket) => {
          const proxyStatusCode = response?.statusCode || ProxyStatus.SERVER_ERROR;
          if (proxyStatusCode < ProxyStatus.SUCCESS_RANGE_START || proxyStatusCode > ProxyStatus.SUCCESS_RANGE_END) {
            request.destroy();
            socket.destroy();
            reject(new Error(`Error connecting to proxy. Http status code: ${response.statusCode}. Http status message: ${response?.statusMessage || "Unknown"}`));
          }
          socket.write(outgoingRequestString);
          const data = [];
          socket.on("data", (chunk) => {
            data.push(chunk);
          });
          socket.on("end", () => {
            const dataString = Buffer.concat([...data]).toString();
            const dataStringArray = dataString.split("\r\n");
            const httpStatusCode = parseInt(dataStringArray[0].split(" ")[1]);
            const statusMessage = dataStringArray[0].split(" ").slice(2).join(" ");
            const body = dataStringArray[dataStringArray.length - 1];
            const headersArray = dataStringArray.slice(1, dataStringArray.length - 2);
            const entries = /* @__PURE__ */ new Map();
            headersArray.forEach((header) => {
              const headerKeyValue = header.split(new RegExp(/:\s(.*)/s));
              const headerKey = headerKeyValue[0];
              let headerValue = headerKeyValue[1];
              try {
                const object = JSON.parse(headerValue);
                if (object && typeof object === "object") {
                  headerValue = object;
                }
              } catch (e) {
              }
              entries.set(headerKey, headerValue);
            });
            const headers2 = Object.fromEntries(entries);
            const parsedHeaders = headers2;
            const networkResponse = NetworkUtils.getNetworkResponse(parsedHeaders, this.parseBody(httpStatusCode, statusMessage, parsedHeaders, body), httpStatusCode);
            if (this.shouldDestroyRequest(httpStatusCode, networkResponse)) {
              request.destroy();
            }
            resolve(networkResponse);
          });
          socket.on("error", (chunk) => {
            request.destroy();
            socket.destroy();
            reject(new Error(chunk.toString()));
          });
        });
        request.on("error", (chunk) => {
          this.logger.error(`HttpClient - Proxy request error: ${chunk.toString()}`, "");
          this.logUrlWithPiiAwareness("Destination URL", destinationUrlString);
          this.logUrlWithPiiAwareness("Proxy URL", this.proxyUrl);
          this.logger.error(`HttpClient - Method: ${httpMethod}`, "");
          this.logger.errorPii(`HttpClient - Headers: ${JSON.stringify(headers)}`, "");
          request.destroy();
          reject(new Error(chunk.toString()));
        });
      });
    };
    this.networkRequestViaHttps = (httpMethod, urlString, options, timeout) => {
      const isPostRequest = httpMethod === HttpMethod.POST;
      const body = options?.body || "";
      const url2 = new URL(urlString);
      const headers = options?.headers || {};
      const customOptions = {
        method: httpMethod,
        headers,
        ...NetworkUtils.urlToHttpOptions(url2)
      };
      if (this.customAgentOptions && Object.keys(this.customAgentOptions).length) {
        customOptions.agent = new https.Agent(this.customAgentOptions);
      }
      if (isPostRequest) {
        customOptions.headers = {
          ...customOptions.headers,
          "Content-Length": body.length
        };
      } else {
        if (timeout) {
          customOptions.timeout = timeout;
        }
      }
      return new Promise((resolve, reject) => {
        let request;
        if (customOptions.protocol === "http:") {
          request = http.request(customOptions);
        } else {
          request = https.request(customOptions);
        }
        if (isPostRequest) {
          request.write(body);
        }
        if (timeout) {
          request.on("timeout", () => {
            this.logUrlWithPiiAwareness(`HTTPS request timeout after ${timeout}ms for URL`, urlString);
            request.destroy();
            reject(new Error(`Request time out after ${timeout}ms`));
          });
        }
        request.end();
        request.on("response", (response) => {
          const headers2 = response.headers;
          const statusCode = response.statusCode;
          const statusMessage = response.statusMessage;
          const data = [];
          response.on("data", (chunk) => {
            data.push(chunk);
          });
          response.on("end", () => {
            const body2 = Buffer.concat([...data]).toString();
            const parsedHeaders = headers2;
            const networkResponse = NetworkUtils.getNetworkResponse(parsedHeaders, this.parseBody(statusCode, statusMessage, parsedHeaders, body2), statusCode);
            if (this.shouldDestroyRequest(statusCode, networkResponse)) {
              request.destroy();
            }
            resolve(networkResponse);
          });
        });
        request.on("error", (chunk) => {
          this.logger.error(`HttpClient - HTTPS request error: ${chunk.toString()}`, "");
          this.logUrlWithPiiAwareness("URL", urlString);
          this.logger.error(`HttpClient - Method: ${httpMethod}`, "");
          this.logger.errorPii(`HttpClient - Headers: ${JSON.stringify(headers)}`, "");
          request.destroy();
          reject(new Error(chunk.toString()));
        });
      });
    };
    this.parseBody = (statusCode, statusMessage, headers, body) => {
      let parsedBody;
      try {
        parsedBody = JSON.parse(body);
      } catch (error) {
        let errorType;
        let errorDescriptionHelper;
        if (statusCode >= HttpStatus.CLIENT_ERROR_RANGE_START && statusCode <= HttpStatus.CLIENT_ERROR_RANGE_END) {
          errorType = "client_error";
          errorDescriptionHelper = "A client";
        } else if (statusCode >= HttpStatus.SERVER_ERROR_RANGE_START && statusCode <= HttpStatus.SERVER_ERROR_RANGE_END) {
          errorType = "server_error";
          errorDescriptionHelper = "A server";
        } else {
          errorType = "unknown_error";
          errorDescriptionHelper = "An unknown";
        }
        parsedBody = {
          error: errorType,
          error_description: `${errorDescriptionHelper} error occured.
Http status code: ${statusCode}
Http status message: ${statusMessage || "Unknown"}
Headers: ${JSON.stringify(headers)}`
        };
      }
      return parsedBody;
    };
    this.logUrlWithPiiAwareness = (label, urlString) => {
      if (this.isPiiEnabled) {
        this.logger.errorPii(`HttpClient - ${label}: ${urlString}`, "");
      } else {
        let urlHelper;
        try {
          const url2 = new URL(urlString);
          urlHelper = `${url2.protocol}//${url2.host}${url2.pathname}`;
        } catch {
          urlHelper = urlString.split("?")[0] || "unknown";
        }
        this.logger.error(`HttpClient - ${label}: ${urlHelper} [Enable PII logging to see additional details]`, "");
      }
    };
    this.shouldDestroyRequest = (statusCode, networkResponse) => {
      return (statusCode < HttpStatus.SUCCESS_RANGE_START || statusCode > HttpStatus.SUCCESS_RANGE_END) && // do not destroy the request for the device code flow
      !(networkResponse.body && typeof networkResponse.body === "object" && "error" in networkResponse.body && networkResponse.body.error === Constants.AUTHORIZATION_PENDING);
    };
    this.proxyUrl = proxyUrl || "";
    this.customAgentOptions = customAgentOptions || {};
    this.logger = new Logger(loggerOptions || {}, name, version);
    this.isPiiEnabled = this.logger.isPiiLoggingEnabled();
  }
  /**
   * Http Get request
   * @param url
   * @param options
   */
  async sendGetRequestAsync(url2, options, timeout) {
    if (this.proxyUrl) {
      return this.networkRequestViaProxy(HttpMethod.GET, url2, options, timeout);
    } else {
      return this.networkRequestViaHttps(HttpMethod.GET, url2, options, timeout);
    }
  }
  /**
   * Http Post request
   * @param url
   * @param options
   */
  async sendPostRequestAsync(url2, options) {
    if (this.proxyUrl) {
      return this.networkRequestViaProxy(HttpMethod.POST, url2, options);
    } else {
      return this.networkRequestViaHttps(HttpMethod.POST, url2, options);
    }
  }
}
const NodeAuthErrorMessage = {
  invalidLoopbackAddressType: {
    code: "invalid_loopback_server_address_type",
    desc: "Loopback server address is not type string. This is unexpected."
  },
  unableToLoadRedirectUri: {
    code: "unable_to_load_redirectUrl",
    desc: "Loopback server callback was invoked without a url. This is unexpected."
  },
  noAuthCodeInResponse: {
    code: "no_auth_code_in_response",
    desc: "No auth code found in the server response. Please check your network trace to determine what happened."
  },
  noLoopbackServerExists: {
    code: "no_loopback_server_exists",
    desc: "No loopback server exists yet."
  },
  loopbackServerAlreadyExists: {
    code: "loopback_server_already_exists",
    desc: "Loopback server already exists. Cannot create another."
  },
  loopbackServerTimeout: {
    code: "loopback_server_timeout",
    desc: "Timed out waiting for auth code listener to be registered."
  },
  stateNotFoundError: {
    code: "state_not_found",
    desc: "State not found. Please verify that the request originated from msal."
  },
  thumbprintMissing: {
    code: "thumbprint_missing_from_client_certificate",
    desc: "Client certificate does not contain a SHA-1 or SHA-256 thumbprint."
  },
  redirectUriNotSupported: {
    code: "redirect_uri_not_supported",
    desc: "RedirectUri is not supported in this scenario. Please remove redirectUri from the request."
  }
};
class NodeAuthError extends AuthError {
  constructor(errorCode, errorMessage) {
    super(errorCode, errorMessage);
    this.name = "NodeAuthError";
  }
  /**
   * Creates an error thrown if loopback server address is of type string.
   */
  static createInvalidLoopbackAddressTypeError() {
    return new NodeAuthError(NodeAuthErrorMessage.invalidLoopbackAddressType.code, `${NodeAuthErrorMessage.invalidLoopbackAddressType.desc}`);
  }
  /**
   * Creates an error thrown if the loopback server is unable to get a url.
   */
  static createUnableToLoadRedirectUrlError() {
    return new NodeAuthError(NodeAuthErrorMessage.unableToLoadRedirectUri.code, `${NodeAuthErrorMessage.unableToLoadRedirectUri.desc}`);
  }
  /**
   * Creates an error thrown if the server response does not contain an auth code.
   */
  static createNoAuthCodeInResponseError() {
    return new NodeAuthError(NodeAuthErrorMessage.noAuthCodeInResponse.code, `${NodeAuthErrorMessage.noAuthCodeInResponse.desc}`);
  }
  /**
   * Creates an error thrown if the loopback server has not been spun up yet.
   */
  static createNoLoopbackServerExistsError() {
    return new NodeAuthError(NodeAuthErrorMessage.noLoopbackServerExists.code, `${NodeAuthErrorMessage.noLoopbackServerExists.desc}`);
  }
  /**
   * Creates an error thrown if a loopback server already exists when attempting to create another one.
   */
  static createLoopbackServerAlreadyExistsError() {
    return new NodeAuthError(NodeAuthErrorMessage.loopbackServerAlreadyExists.code, `${NodeAuthErrorMessage.loopbackServerAlreadyExists.desc}`);
  }
  /**
   * Creates an error thrown if the loopback server times out registering the auth code listener.
   */
  static createLoopbackServerTimeoutError() {
    return new NodeAuthError(NodeAuthErrorMessage.loopbackServerTimeout.code, `${NodeAuthErrorMessage.loopbackServerTimeout.desc}`);
  }
  /**
   * Creates an error thrown when the state is not present.
   */
  static createStateNotFoundError() {
    return new NodeAuthError(NodeAuthErrorMessage.stateNotFoundError.code, NodeAuthErrorMessage.stateNotFoundError.desc);
  }
  /**
   * Creates an error thrown when client certificate was provided, but neither the SHA-1 or SHA-256 thumbprints were provided
   */
  static createThumbprintMissingError() {
    return new NodeAuthError(NodeAuthErrorMessage.thumbprintMissing.code, NodeAuthErrorMessage.thumbprintMissing.desc);
  }
  /**
   * Creates an error thrown when redirectUri is provided in an unsupported scenario
   */
  static createRedirectUriNotSupportedError() {
    return new NodeAuthError(NodeAuthErrorMessage.redirectUriNotSupported.code, NodeAuthErrorMessage.redirectUriNotSupported.desc);
  }
}
const DEFAULT_AUTH_OPTIONS = {
  clientId: Constants$1.EMPTY_STRING,
  authority: Constants$1.DEFAULT_AUTHORITY,
  clientSecret: Constants$1.EMPTY_STRING,
  clientAssertion: Constants$1.EMPTY_STRING,
  clientCertificate: {
    thumbprint: Constants$1.EMPTY_STRING,
    thumbprintSha256: Constants$1.EMPTY_STRING,
    privateKey: Constants$1.EMPTY_STRING,
    x5c: Constants$1.EMPTY_STRING
  },
  knownAuthorities: [],
  cloudDiscoveryMetadata: Constants$1.EMPTY_STRING,
  authorityMetadata: Constants$1.EMPTY_STRING,
  clientCapabilities: [],
  protocolMode: ProtocolMode.AAD,
  azureCloudOptions: {
    azureCloudInstance: AzureCloudInstance.None,
    tenant: Constants$1.EMPTY_STRING
  },
  skipAuthorityMetadataCache: false,
  encodeExtraQueryParams: false
};
const DEFAULT_CACHE_OPTIONS = {
  claimsBasedCachingEnabled: false
};
const DEFAULT_LOGGER_OPTIONS = {
  loggerCallback: () => {
  },
  piiLoggingEnabled: false,
  logLevel: LogLevel.Info
};
const DEFAULT_SYSTEM_OPTIONS = {
  loggerOptions: DEFAULT_LOGGER_OPTIONS,
  networkClient: new HttpClient(),
  proxyUrl: Constants$1.EMPTY_STRING,
  customAgentOptions: {},
  disableInternalRetries: false
};
const DEFAULT_TELEMETRY_OPTIONS = {
  application: {
    appName: Constants$1.EMPTY_STRING,
    appVersion: Constants$1.EMPTY_STRING
  }
};
function buildAppConfiguration({ auth, broker, cache, system, telemetry }) {
  const systemOptions = {
    ...DEFAULT_SYSTEM_OPTIONS,
    networkClient: new HttpClient(system?.proxyUrl, system?.customAgentOptions),
    loggerOptions: system?.loggerOptions || DEFAULT_LOGGER_OPTIONS,
    disableInternalRetries: system?.disableInternalRetries || false
  };
  if (!!auth.clientCertificate && !!!auth.clientCertificate.thumbprint && !!!auth.clientCertificate.thumbprintSha256) {
    throw NodeAuthError.createStateNotFoundError();
  }
  return {
    auth: { ...DEFAULT_AUTH_OPTIONS, ...auth },
    broker: { ...broker },
    cache: { ...DEFAULT_CACHE_OPTIONS, ...cache },
    system: { ...systemOptions, ...system },
    telemetry: { ...DEFAULT_TELEMETRY_OPTIONS, ...telemetry }
  };
}
const rnds8Pool = new Uint8Array(256);
let poolPtr = rnds8Pool.length;
function rng() {
  if (poolPtr > rnds8Pool.length - 16) {
    crypto.randomFillSync(rnds8Pool);
    poolPtr = 0;
  }
  return rnds8Pool.slice(poolPtr, poolPtr += 16);
}
const REGEX = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i;
function validate(uuid) {
  return typeof uuid === "string" && REGEX.test(uuid);
}
const byteToHex = [];
for (let i = 0; i < 256; ++i) {
  byteToHex.push((i + 256).toString(16).substr(1));
}
function stringify(arr, offset = 0) {
  const uuid = (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase();
  if (!validate(uuid)) {
    throw TypeError("Stringified UUID is invalid");
  }
  return uuid;
}
function v4(options, buf, offset) {
  options = options || {};
  const rnds = options.random || (options.rng || rng)();
  rnds[6] = rnds[6] & 15 | 64;
  rnds[8] = rnds[8] & 63 | 128;
  return stringify(rnds);
}
class GuidGenerator {
  /**
   *
   * RFC4122: The version 4 UUID is meant for generating UUIDs from truly-random or pseudo-random numbers.
   * uuidv4 generates guids from cryprtographically-string random
   */
  generateGuid() {
    return v4();
  }
  /**
   * verifies if a string is  GUID
   * @param guid
   */
  isGuid(guid) {
    const regexGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return regexGuid.test(guid);
  }
}
class EncodingUtils {
  /**
   * 'utf8': Multibyte encoded Unicode characters. Many web pages and other document formats use UTF-8.
   * 'base64': Base64 encoding.
   *
   * @param str text
   */
  static base64Encode(str, encoding) {
    return Buffer.from(str, encoding).toString(EncodingTypes.BASE64);
  }
  /**
   * encode a URL
   * @param str
   */
  static base64EncodeUrl(str, encoding) {
    return EncodingUtils.base64Encode(str, encoding).replace(/=/g, Constants$1.EMPTY_STRING).replace(/\+/g, "-").replace(/\//g, "_");
  }
  /**
   * 'utf8': Multibyte encoded Unicode characters. Many web pages and other document formats use UTF-8.
   * 'base64': Base64 encoding.
   *
   * @param base64Str Base64 encoded text
   */
  static base64Decode(base64Str) {
    return Buffer.from(base64Str, EncodingTypes.BASE64).toString("utf8");
  }
  /**
   * @param base64Str Base64 encoded Url
   */
  static base64DecodeUrl(base64Str) {
    let str = base64Str.replace(/-/g, "+").replace(/_/g, "/");
    while (str.length % 4) {
      str += "=";
    }
    return EncodingUtils.base64Decode(str);
  }
}
class HashUtils {
  /**
   * generate 'SHA256' hash
   * @param buffer
   */
  sha256(buffer) {
    return crypto.createHash(Hash.SHA256).update(buffer).digest();
  }
}
class PkceGenerator {
  constructor() {
    this.hashUtils = new HashUtils();
  }
  /**
   * generates the codeVerfier and the challenge from the codeVerfier
   * reference: https://tools.ietf.org/html/rfc7636#section-4.1 and https://tools.ietf.org/html/rfc7636#section-4.2
   */
  async generatePkceCodes() {
    const verifier = this.generateCodeVerifier();
    const challenge = this.generateCodeChallengeFromVerifier(verifier);
    return { verifier, challenge };
  }
  /**
   * generates the codeVerfier; reference: https://tools.ietf.org/html/rfc7636#section-4.1
   */
  generateCodeVerifier() {
    const charArr = [];
    const maxNumber = 256 - 256 % CharSet.CV_CHARSET.length;
    while (charArr.length <= RANDOM_OCTET_SIZE) {
      const byte = crypto.randomBytes(1)[0];
      if (byte >= maxNumber) {
        continue;
      }
      const index = byte % CharSet.CV_CHARSET.length;
      charArr.push(CharSet.CV_CHARSET[index]);
    }
    const verifier = charArr.join(Constants$1.EMPTY_STRING);
    return EncodingUtils.base64EncodeUrl(verifier);
  }
  /**
   * generate the challenge from the codeVerfier; reference: https://tools.ietf.org/html/rfc7636#section-4.2
   * @param codeVerifier
   */
  generateCodeChallengeFromVerifier(codeVerifier) {
    return EncodingUtils.base64EncodeUrl(this.hashUtils.sha256(codeVerifier).toString(EncodingTypes.BASE64), EncodingTypes.BASE64);
  }
}
class CryptoProvider {
  constructor() {
    this.pkceGenerator = new PkceGenerator();
    this.guidGenerator = new GuidGenerator();
    this.hashUtils = new HashUtils();
  }
  /**
   * base64 URL safe encoded string
   */
  base64UrlEncode() {
    throw new Error("Method not implemented.");
  }
  /**
   * Stringifies and base64Url encodes input public key
   * @param inputKid - public key id
   * @returns Base64Url encoded public key
   */
  encodeKid() {
    throw new Error("Method not implemented.");
  }
  /**
   * Creates a new random GUID - used to populate state and nonce.
   * @returns string (GUID)
   */
  createNewGuid() {
    return this.guidGenerator.generateGuid();
  }
  /**
   * Encodes input string to base64.
   * @param input - string to be encoded
   */
  base64Encode(input) {
    return EncodingUtils.base64Encode(input);
  }
  /**
   * Decodes input string from base64.
   * @param input - string to be decoded
   */
  base64Decode(input) {
    return EncodingUtils.base64Decode(input);
  }
  /**
   * Generates PKCE codes used in Authorization Code Flow.
   */
  generatePkceCodes() {
    return this.pkceGenerator.generatePkceCodes();
  }
  /**
   * Generates a keypair, stores it and returns a thumbprint - not yet implemented for node
   */
  getPublicKeyThumbprint() {
    throw new Error("Method not implemented.");
  }
  /**
   * Removes cryptographic keypair from key store matching the keyId passed in
   * @param kid - public key id
   */
  removeTokenBindingKey() {
    throw new Error("Method not implemented.");
  }
  /**
   * Removes all cryptographic keys from Keystore
   */
  clearKeystore() {
    throw new Error("Method not implemented.");
  }
  /**
   * Signs the given object as a jwt payload with private key retrieved by given kid - currently not implemented for node
   */
  signJwt() {
    throw new Error("Method not implemented.");
  }
  /**
   * Returns the SHA-256 hash of an input string
   */
  async hashString(plainText) {
    return EncodingUtils.base64EncodeUrl(this.hashUtils.sha256(plainText).toString(EncodingTypes.BASE64), EncodingTypes.BASE64);
  }
}
function generateCredentialKey(credential) {
  const familyId = credential.credentialType === CredentialType.REFRESH_TOKEN && credential.familyId || credential.clientId;
  const scheme = credential.tokenType && credential.tokenType.toLowerCase() !== AuthenticationScheme.BEARER.toLowerCase() ? credential.tokenType.toLowerCase() : "";
  const credentialKey = [
    credential.homeAccountId,
    credential.environment,
    credential.credentialType,
    familyId,
    credential.realm || "",
    credential.target || "",
    credential.requestedClaimsHash || "",
    scheme
  ];
  return credentialKey.join(CACHE.KEY_SEPARATOR).toLowerCase();
}
function generateAccountKey(account) {
  const homeTenantId = account.homeAccountId.split(".")[1];
  const accountKey = [
    account.homeAccountId,
    account.environment,
    homeTenantId || account.tenantId || ""
  ];
  return accountKey.join(CACHE.KEY_SEPARATOR).toLowerCase();
}
class NodeStorage extends CacheManager {
  constructor(logger, clientId, cryptoImpl, staticAuthorityOptions) {
    super(clientId, cryptoImpl, logger, new StubPerformanceClient(), staticAuthorityOptions);
    this.cache = {};
    this.changeEmitters = [];
    this.logger = logger;
  }
  /**
   * Queue up callbacks
   * @param func - a callback function for cache change indication
   */
  registerChangeEmitter(func) {
    this.changeEmitters.push(func);
  }
  /**
   * Invoke the callback when cache changes
   */
  emitChange() {
    this.changeEmitters.forEach((func) => func.call(null));
  }
  /**
   * Converts cacheKVStore to InMemoryCache
   * @param cache - key value store
   */
  cacheToInMemoryCache(cache) {
    const inMemoryCache = {
      accounts: {},
      idTokens: {},
      accessTokens: {},
      refreshTokens: {},
      appMetadata: {}
    };
    for (const key in cache) {
      const value = cache[key];
      if (typeof value !== "object") {
        continue;
      }
      if (value instanceof AccountEntity) {
        inMemoryCache.accounts[key] = value;
      } else if (isIdTokenEntity(value)) {
        inMemoryCache.idTokens[key] = value;
      } else if (isAccessTokenEntity(value)) {
        inMemoryCache.accessTokens[key] = value;
      } else if (isRefreshTokenEntity(value)) {
        inMemoryCache.refreshTokens[key] = value;
      } else if (isAppMetadataEntity(key, value)) {
        inMemoryCache.appMetadata[key] = value;
      } else {
        continue;
      }
    }
    return inMemoryCache;
  }
  /**
   * converts inMemoryCache to CacheKVStore
   * @param inMemoryCache - kvstore map for inmemory
   */
  inMemoryCacheToCache(inMemoryCache) {
    let cache = this.getCache();
    cache = {
      ...cache,
      ...inMemoryCache.accounts,
      ...inMemoryCache.idTokens,
      ...inMemoryCache.accessTokens,
      ...inMemoryCache.refreshTokens,
      ...inMemoryCache.appMetadata
    };
    return cache;
  }
  /**
   * gets the current in memory cache for the client
   */
  getInMemoryCache() {
    this.logger.trace("Getting in-memory cache");
    const inMemoryCache = this.cacheToInMemoryCache(this.getCache());
    return inMemoryCache;
  }
  /**
   * sets the current in memory cache for the client
   * @param inMemoryCache - key value map in memory
   */
  setInMemoryCache(inMemoryCache) {
    this.logger.trace("Setting in-memory cache");
    const cache = this.inMemoryCacheToCache(inMemoryCache);
    this.setCache(cache);
    this.emitChange();
  }
  /**
   * get the current cache key-value store
   */
  getCache() {
    this.logger.trace("Getting cache key-value store");
    return this.cache;
  }
  /**
   * sets the current cache (key value store)
   * @param cacheMap - key value map
   */
  setCache(cache) {
    this.logger.trace("Setting cache key value store");
    this.cache = cache;
    this.emitChange();
  }
  /**
   * Gets cache item with given key.
   * @param key - lookup key for the cache entry
   */
  getItem(key) {
    this.logger.tracePii(`Item key: ${key}`);
    const cache = this.getCache();
    return cache[key];
  }
  /**
   * Gets cache item with given key-value
   * @param key - lookup key for the cache entry
   * @param value - value of the cache entry
   */
  setItem(key, value) {
    this.logger.tracePii(`Item key: ${key}`);
    const cache = this.getCache();
    cache[key] = value;
    this.setCache(cache);
  }
  generateCredentialKey(credential) {
    return generateCredentialKey(credential);
  }
  generateAccountKey(account) {
    return generateAccountKey(account);
  }
  getAccountKeys() {
    const inMemoryCache = this.getInMemoryCache();
    const accountKeys = Object.keys(inMemoryCache.accounts);
    return accountKeys;
  }
  getTokenKeys() {
    const inMemoryCache = this.getInMemoryCache();
    const tokenKeys = {
      idToken: Object.keys(inMemoryCache.idTokens),
      accessToken: Object.keys(inMemoryCache.accessTokens),
      refreshToken: Object.keys(inMemoryCache.refreshTokens)
    };
    return tokenKeys;
  }
  /**
   * Reads account from cache, builds it into an account entity and returns it.
   * @param accountKey - lookup key to fetch cache type AccountEntity
   * @returns
   */
  getAccount(accountKey) {
    const cachedAccount = this.getItem(accountKey);
    return cachedAccount ? Object.assign(new AccountEntity(), this.getItem(accountKey)) : null;
  }
  /**
   * set account entity
   * @param account - cache value to be set of type AccountEntity
   */
  async setAccount(account) {
    const accountKey = this.generateAccountKey(AccountEntity.getAccountInfo(account));
    this.setItem(accountKey, account);
  }
  /**
   * fetch the idToken credential
   * @param idTokenKey - lookup key to fetch cache type IdTokenEntity
   */
  getIdTokenCredential(idTokenKey) {
    const idToken = this.getItem(idTokenKey);
    if (isIdTokenEntity(idToken)) {
      return idToken;
    }
    return null;
  }
  /**
   * set idToken credential
   * @param idToken - cache value to be set of type IdTokenEntity
   */
  async setIdTokenCredential(idToken) {
    const idTokenKey = this.generateCredentialKey(idToken);
    this.setItem(idTokenKey, idToken);
  }
  /**
   * fetch the accessToken credential
   * @param accessTokenKey - lookup key to fetch cache type AccessTokenEntity
   */
  getAccessTokenCredential(accessTokenKey) {
    const accessToken = this.getItem(accessTokenKey);
    if (isAccessTokenEntity(accessToken)) {
      return accessToken;
    }
    return null;
  }
  /**
   * set accessToken credential
   * @param accessToken -  cache value to be set of type AccessTokenEntity
   */
  async setAccessTokenCredential(accessToken) {
    const accessTokenKey = this.generateCredentialKey(accessToken);
    this.setItem(accessTokenKey, accessToken);
  }
  /**
   * fetch the refreshToken credential
   * @param refreshTokenKey - lookup key to fetch cache type RefreshTokenEntity
   */
  getRefreshTokenCredential(refreshTokenKey) {
    const refreshToken = this.getItem(refreshTokenKey);
    if (isRefreshTokenEntity(refreshToken)) {
      return refreshToken;
    }
    return null;
  }
  /**
   * set refreshToken credential
   * @param refreshToken - cache value to be set of type RefreshTokenEntity
   */
  async setRefreshTokenCredential(refreshToken) {
    const refreshTokenKey = this.generateCredentialKey(refreshToken);
    this.setItem(refreshTokenKey, refreshToken);
  }
  /**
   * fetch appMetadata entity from the platform cache
   * @param appMetadataKey - lookup key to fetch cache type AppMetadataEntity
   */
  getAppMetadata(appMetadataKey) {
    const appMetadata = this.getItem(appMetadataKey);
    if (isAppMetadataEntity(appMetadataKey, appMetadata)) {
      return appMetadata;
    }
    return null;
  }
  /**
   * set appMetadata entity to the platform cache
   * @param appMetadata - cache value to be set of type AppMetadataEntity
   */
  setAppMetadata(appMetadata) {
    const appMetadataKey = generateAppMetadataKey(appMetadata);
    this.setItem(appMetadataKey, appMetadata);
  }
  /**
   * fetch server telemetry entity from the platform cache
   * @param serverTelemetrykey - lookup key to fetch cache type ServerTelemetryEntity
   */
  getServerTelemetry(serverTelemetrykey) {
    const serverTelemetryEntity = this.getItem(serverTelemetrykey);
    if (serverTelemetryEntity && isServerTelemetryEntity(serverTelemetrykey, serverTelemetryEntity)) {
      return serverTelemetryEntity;
    }
    return null;
  }
  /**
   * set server telemetry entity to the platform cache
   * @param serverTelemetryKey - lookup key to fetch cache type ServerTelemetryEntity
   * @param serverTelemetry - cache value to be set of type ServerTelemetryEntity
   */
  setServerTelemetry(serverTelemetryKey, serverTelemetry) {
    this.setItem(serverTelemetryKey, serverTelemetry);
  }
  /**
   * fetch authority metadata entity from the platform cache
   * @param key - lookup key to fetch cache type AuthorityMetadataEntity
   */
  getAuthorityMetadata(key) {
    const authorityMetadataEntity = this.getItem(key);
    if (authorityMetadataEntity && isAuthorityMetadataEntity(key, authorityMetadataEntity)) {
      return authorityMetadataEntity;
    }
    return null;
  }
  /**
   * Get all authority metadata keys
   */
  getAuthorityMetadataKeys() {
    return this.getKeys().filter((key) => {
      return this.isAuthorityMetadata(key);
    });
  }
  /**
   * set authority metadata entity to the platform cache
   * @param key - lookup key to fetch cache type AuthorityMetadataEntity
   * @param metadata - cache value to be set of type AuthorityMetadataEntity
   */
  setAuthorityMetadata(key, metadata) {
    this.setItem(key, metadata);
  }
  /**
   * fetch throttling entity from the platform cache
   * @param throttlingCacheKey - lookup key to fetch cache type ThrottlingEntity
   */
  getThrottlingCache(throttlingCacheKey) {
    const throttlingCache = this.getItem(throttlingCacheKey);
    if (throttlingCache && isThrottlingEntity(throttlingCacheKey, throttlingCache)) {
      return throttlingCache;
    }
    return null;
  }
  /**
   * set throttling entity to the platform cache
   * @param throttlingCacheKey - lookup key to fetch cache type ThrottlingEntity
   * @param throttlingCache - cache value to be set of type ThrottlingEntity
   */
  setThrottlingCache(throttlingCacheKey, throttlingCache) {
    this.setItem(throttlingCacheKey, throttlingCache);
  }
  /**
   * Removes the cache item from memory with the given key.
   * @param key - lookup key to remove a cache entity
   * @param inMemory - key value map of the cache
   */
  removeItem(key) {
    this.logger.tracePii(`Item key: ${key}`);
    let result = false;
    const cache = this.getCache();
    if (!!cache[key]) {
      delete cache[key];
      result = true;
    }
    if (result) {
      this.setCache(cache);
      this.emitChange();
    }
    return result;
  }
  /**
   * Remove account entity from the platform cache if it's outdated
   * @param accountKey - lookup key to fetch cache type AccountEntity
   */
  removeOutdatedAccount(accountKey) {
    this.removeItem(accountKey);
  }
  /**
   * Checks whether key is in cache.
   * @param key - look up key for a cache entity
   */
  containsKey(key) {
    return this.getKeys().includes(key);
  }
  /**
   * Gets all keys in window.
   */
  getKeys() {
    this.logger.trace("Retrieving all cache keys");
    const cache = this.getCache();
    return [...Object.keys(cache)];
  }
  /**
   * Clears all cache entries created by MSAL (except tokens).
   */
  clear() {
    this.logger.trace("Clearing cache entries created by MSAL");
    const cacheKeys = this.getKeys();
    cacheKeys.forEach((key) => {
      this.removeItem(key);
    });
    this.emitChange();
  }
  /**
   * Initialize in memory cache from an exisiting cache vault
   * @param cache - blob formatted cache (JSON)
   */
  static generateInMemoryCache(cache) {
    return Deserializer.deserializeAllCache(Deserializer.deserializeJSONBlob(cache));
  }
  /**
   * retrieves the final JSON
   * @param inMemoryCache - itemised cache read from the JSON
   */
  static generateJsonCache(inMemoryCache) {
    return Serializer.serializeAllCache(inMemoryCache);
  }
  /**
   * Updates a credential's cache key if the current cache key is outdated
   */
  updateCredentialCacheKey(currentCacheKey, credential) {
    const updatedCacheKey = this.generateCredentialKey(credential);
    if (currentCacheKey !== updatedCacheKey) {
      const cacheItem = this.getItem(currentCacheKey);
      if (cacheItem) {
        this.removeItem(currentCacheKey);
        this.setItem(updatedCacheKey, cacheItem);
        this.logger.verbose(`Updated an outdated ${credential.credentialType} cache key`);
        return updatedCacheKey;
      } else {
        this.logger.error(`Attempted to update an outdated ${credential.credentialType} cache key but no item matching the outdated key was found in storage`);
      }
    }
    return currentCacheKey;
  }
}
const defaultSerializedCache = {
  Account: {},
  IdToken: {},
  AccessToken: {},
  RefreshToken: {},
  AppMetadata: {}
};
class TokenCache {
  constructor(storage, logger, cachePlugin) {
    this.cacheHasChanged = false;
    this.storage = storage;
    this.storage.registerChangeEmitter(this.handleChangeEvent.bind(this));
    if (cachePlugin) {
      this.persistence = cachePlugin;
    }
    this.logger = logger;
  }
  /**
   * Set to true if cache state has changed since last time serialize or writeToPersistence was called
   */
  hasChanged() {
    return this.cacheHasChanged;
  }
  /**
   * Serializes in memory cache to JSON
   */
  serialize() {
    this.logger.trace("Serializing in-memory cache");
    let finalState = Serializer.serializeAllCache(this.storage.getInMemoryCache());
    if (this.cacheSnapshot) {
      this.logger.trace("Reading cache snapshot from disk");
      finalState = this.mergeState(JSON.parse(this.cacheSnapshot), finalState);
    } else {
      this.logger.trace("No cache snapshot to merge");
    }
    this.cacheHasChanged = false;
    return JSON.stringify(finalState);
  }
  /**
   * Deserializes JSON to in-memory cache. JSON should be in MSAL cache schema format
   * @param cache - blob formatted cache
   */
  deserialize(cache) {
    this.logger.trace("Deserializing JSON to in-memory cache");
    this.cacheSnapshot = cache;
    if (this.cacheSnapshot) {
      this.logger.trace("Reading cache snapshot from disk");
      const deserializedCache = Deserializer.deserializeAllCache(this.overlayDefaults(JSON.parse(this.cacheSnapshot)));
      this.storage.setInMemoryCache(deserializedCache);
    } else {
      this.logger.trace("No cache snapshot to deserialize");
    }
  }
  /**
   * Fetches the cache key-value map
   */
  getKVStore() {
    return this.storage.getCache();
  }
  /**
   * Gets cache snapshot in CacheKVStore format
   */
  getCacheSnapshot() {
    const deserializedPersistentStorage = NodeStorage.generateInMemoryCache(this.cacheSnapshot);
    return this.storage.inMemoryCacheToCache(deserializedPersistentStorage);
  }
  /**
   * API that retrieves all accounts currently in cache to the user
   */
  async getAllAccounts(correlationId = new CryptoProvider().createNewGuid()) {
    this.logger.trace("getAllAccounts called");
    let cacheContext;
    try {
      if (this.persistence) {
        cacheContext = new TokenCacheContext(this, false);
        await this.persistence.beforeCacheAccess(cacheContext);
      }
      return this.storage.getAllAccounts({}, correlationId);
    } finally {
      if (this.persistence && cacheContext) {
        await this.persistence.afterCacheAccess(cacheContext);
      }
    }
  }
  /**
   * Returns the signed in account matching homeAccountId.
   * (the account object is created at the time of successful login)
   * or null when no matching account is found
   * @param homeAccountId - unique identifier for an account (uid.utid)
   */
  async getAccountByHomeId(homeAccountId) {
    const allAccounts = await this.getAllAccounts();
    if (homeAccountId && allAccounts && allAccounts.length) {
      return allAccounts.filter((accountObj) => accountObj.homeAccountId === homeAccountId)[0] || null;
    } else {
      return null;
    }
  }
  /**
   * Returns the signed in account matching localAccountId.
   * (the account object is created at the time of successful login)
   * or null when no matching account is found
   * @param localAccountId - unique identifier of an account (sub/obj when homeAccountId cannot be populated)
   */
  async getAccountByLocalId(localAccountId) {
    const allAccounts = await this.getAllAccounts();
    if (localAccountId && allAccounts && allAccounts.length) {
      return allAccounts.filter((accountObj) => accountObj.localAccountId === localAccountId)[0] || null;
    } else {
      return null;
    }
  }
  /**
   * API to remove a specific account and the relevant data from cache
   * @param account - AccountInfo passed by the user
   */
  async removeAccount(account, correlationId) {
    this.logger.trace("removeAccount called");
    let cacheContext;
    try {
      if (this.persistence) {
        cacheContext = new TokenCacheContext(this, true);
        await this.persistence.beforeCacheAccess(cacheContext);
      }
      this.storage.removeAccount(account, correlationId || new GuidGenerator().generateGuid());
    } finally {
      if (this.persistence && cacheContext) {
        await this.persistence.afterCacheAccess(cacheContext);
      }
    }
  }
  /**
   * Overwrites in-memory cache with persistent cache
   */
  async overwriteCache() {
    if (!this.persistence) {
      this.logger.info("No persistence layer specified, cache cannot be overwritten");
      return;
    }
    this.logger.info("Overwriting in-memory cache with persistent cache");
    this.storage.clear();
    const cacheContext = new TokenCacheContext(this, false);
    await this.persistence.beforeCacheAccess(cacheContext);
    const cacheSnapshot = this.getCacheSnapshot();
    this.storage.setCache(cacheSnapshot);
    await this.persistence.afterCacheAccess(cacheContext);
  }
  /**
   * Called when the cache has changed state.
   */
  handleChangeEvent() {
    this.cacheHasChanged = true;
  }
  /**
   * Merge in memory cache with the cache snapshot.
   * @param oldState - cache before changes
   * @param currentState - current cache state in the library
   */
  mergeState(oldState, currentState) {
    this.logger.trace("Merging in-memory cache with cache snapshot");
    const stateAfterRemoval = this.mergeRemovals(oldState, currentState);
    return this.mergeUpdates(stateAfterRemoval, currentState);
  }
  /**
   * Deep update of oldState based on newState values
   * @param oldState - cache before changes
   * @param newState - updated cache
   */
  mergeUpdates(oldState, newState) {
    Object.keys(newState).forEach((newKey) => {
      const newValue = newState[newKey];
      if (!oldState.hasOwnProperty(newKey)) {
        if (newValue !== null) {
          oldState[newKey] = newValue;
        }
      } else {
        const newValueNotNull = newValue !== null;
        const newValueIsObject = typeof newValue === "object";
        const newValueIsNotArray = !Array.isArray(newValue);
        const oldStateNotUndefinedOrNull = typeof oldState[newKey] !== "undefined" && oldState[newKey] !== null;
        if (newValueNotNull && newValueIsObject && newValueIsNotArray && oldStateNotUndefinedOrNull) {
          this.mergeUpdates(oldState[newKey], newValue);
        } else {
          oldState[newKey] = newValue;
        }
      }
    });
    return oldState;
  }
  /**
   * Removes entities in oldState that the were removed from newState. If there are any unknown values in root of
   * oldState that are not recognized, they are left untouched.
   * @param oldState - cache before changes
   * @param newState - updated cache
   */
  mergeRemovals(oldState, newState) {
    this.logger.trace("Remove updated entries in cache");
    const accounts = oldState.Account ? this.mergeRemovalsDict(oldState.Account, newState.Account) : oldState.Account;
    const accessTokens = oldState.AccessToken ? this.mergeRemovalsDict(oldState.AccessToken, newState.AccessToken) : oldState.AccessToken;
    const refreshTokens = oldState.RefreshToken ? this.mergeRemovalsDict(oldState.RefreshToken, newState.RefreshToken) : oldState.RefreshToken;
    const idTokens = oldState.IdToken ? this.mergeRemovalsDict(oldState.IdToken, newState.IdToken) : oldState.IdToken;
    const appMetadata = oldState.AppMetadata ? this.mergeRemovalsDict(oldState.AppMetadata, newState.AppMetadata) : oldState.AppMetadata;
    return {
      ...oldState,
      Account: accounts,
      AccessToken: accessTokens,
      RefreshToken: refreshTokens,
      IdToken: idTokens,
      AppMetadata: appMetadata
    };
  }
  /**
   * Helper to merge new cache with the old one
   * @param oldState - cache before changes
   * @param newState - updated cache
   */
  mergeRemovalsDict(oldState, newState) {
    const finalState = { ...oldState };
    Object.keys(oldState).forEach((oldKey) => {
      if (!newState || !newState.hasOwnProperty(oldKey)) {
        delete finalState[oldKey];
      }
    });
    return finalState;
  }
  /**
   * Helper to overlay as a part of cache merge
   * @param passedInCache - cache read from the blob
   */
  overlayDefaults(passedInCache) {
    this.logger.trace("Overlaying input cache with the default cache");
    return {
      Account: {
        ...defaultSerializedCache.Account,
        ...passedInCache.Account
      },
      IdToken: {
        ...defaultSerializedCache.IdToken,
        ...passedInCache.IdToken
      },
      AccessToken: {
        ...defaultSerializedCache.AccessToken,
        ...passedInCache.AccessToken
      },
      RefreshToken: {
        ...defaultSerializedCache.RefreshToken,
        ...passedInCache.RefreshToken
      },
      AppMetadata: {
        ...defaultSerializedCache.AppMetadata,
        ...passedInCache.AppMetadata
      }
    };
  }
}
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
var jws = {};
var safeBuffer = { exports: {} };
var hasRequiredSafeBuffer;
function requireSafeBuffer() {
  if (hasRequiredSafeBuffer) return safeBuffer.exports;
  hasRequiredSafeBuffer = 1;
  (function(module, exports$1) {
    var buffer = require$$0;
    var Buffer2 = buffer.Buffer;
    function copyProps(src, dst) {
      for (var key in src) {
        dst[key] = src[key];
      }
    }
    if (Buffer2.from && Buffer2.alloc && Buffer2.allocUnsafe && Buffer2.allocUnsafeSlow) {
      module.exports = buffer;
    } else {
      copyProps(buffer, exports$1);
      exports$1.Buffer = SafeBuffer;
    }
    function SafeBuffer(arg, encodingOrOffset, length) {
      return Buffer2(arg, encodingOrOffset, length);
    }
    SafeBuffer.prototype = Object.create(Buffer2.prototype);
    copyProps(Buffer2, SafeBuffer);
    SafeBuffer.from = function(arg, encodingOrOffset, length) {
      if (typeof arg === "number") {
        throw new TypeError("Argument must not be a number");
      }
      return Buffer2(arg, encodingOrOffset, length);
    };
    SafeBuffer.alloc = function(size, fill, encoding) {
      if (typeof size !== "number") {
        throw new TypeError("Argument must be a number");
      }
      var buf = Buffer2(size);
      if (fill !== void 0) {
        if (typeof encoding === "string") {
          buf.fill(fill, encoding);
        } else {
          buf.fill(fill);
        }
      } else {
        buf.fill(0);
      }
      return buf;
    };
    SafeBuffer.allocUnsafe = function(size) {
      if (typeof size !== "number") {
        throw new TypeError("Argument must be a number");
      }
      return Buffer2(size);
    };
    SafeBuffer.allocUnsafeSlow = function(size) {
      if (typeof size !== "number") {
        throw new TypeError("Argument must be a number");
      }
      return buffer.SlowBuffer(size);
    };
  })(safeBuffer, safeBuffer.exports);
  return safeBuffer.exports;
}
var dataStream;
var hasRequiredDataStream;
function requireDataStream() {
  if (hasRequiredDataStream) return dataStream;
  hasRequiredDataStream = 1;
  var Buffer2 = requireSafeBuffer().Buffer;
  var Stream = require$$3;
  var util = require$$5;
  function DataStream(data) {
    this.buffer = null;
    this.writable = true;
    this.readable = true;
    if (!data) {
      this.buffer = Buffer2.alloc(0);
      return this;
    }
    if (typeof data.pipe === "function") {
      this.buffer = Buffer2.alloc(0);
      data.pipe(this);
      return this;
    }
    if (data.length || typeof data === "object") {
      this.buffer = data;
      this.writable = false;
      process.nextTick(function() {
        this.emit("end", data);
        this.readable = false;
        this.emit("close");
      }.bind(this));
      return this;
    }
    throw new TypeError("Unexpected data type (" + typeof data + ")");
  }
  util.inherits(DataStream, Stream);
  DataStream.prototype.write = function write(data) {
    this.buffer = Buffer2.concat([this.buffer, Buffer2.from(data)]);
    this.emit("data", data);
  };
  DataStream.prototype.end = function end(data) {
    if (data)
      this.write(data);
    this.emit("end", data);
    this.emit("close");
    this.writable = false;
    this.readable = false;
  };
  dataStream = DataStream;
  return dataStream;
}
var paramBytesForAlg_1;
var hasRequiredParamBytesForAlg;
function requireParamBytesForAlg() {
  if (hasRequiredParamBytesForAlg) return paramBytesForAlg_1;
  hasRequiredParamBytesForAlg = 1;
  function getParamSize(keySize) {
    var result = (keySize / 8 | 0) + (keySize % 8 === 0 ? 0 : 1);
    return result;
  }
  var paramBytesForAlg = {
    ES256: getParamSize(256),
    ES384: getParamSize(384),
    ES512: getParamSize(521)
  };
  function getParamBytesForAlg(alg) {
    var paramBytes = paramBytesForAlg[alg];
    if (paramBytes) {
      return paramBytes;
    }
    throw new Error('Unknown algorithm "' + alg + '"');
  }
  paramBytesForAlg_1 = getParamBytesForAlg;
  return paramBytesForAlg_1;
}
var ecdsaSigFormatter;
var hasRequiredEcdsaSigFormatter;
function requireEcdsaSigFormatter() {
  if (hasRequiredEcdsaSigFormatter) return ecdsaSigFormatter;
  hasRequiredEcdsaSigFormatter = 1;
  var Buffer2 = requireSafeBuffer().Buffer;
  var getParamBytesForAlg = requireParamBytesForAlg();
  var MAX_OCTET = 128, CLASS_UNIVERSAL = 0, PRIMITIVE_BIT = 32, TAG_SEQ = 16, TAG_INT = 2, ENCODED_TAG_SEQ = TAG_SEQ | PRIMITIVE_BIT | CLASS_UNIVERSAL << 6, ENCODED_TAG_INT = TAG_INT | CLASS_UNIVERSAL << 6;
  function base64Url(base64) {
    return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  }
  function signatureAsBuffer(signature) {
    if (Buffer2.isBuffer(signature)) {
      return signature;
    } else if ("string" === typeof signature) {
      return Buffer2.from(signature, "base64");
    }
    throw new TypeError("ECDSA signature must be a Base64 string or a Buffer");
  }
  function derToJose(signature, alg) {
    signature = signatureAsBuffer(signature);
    var paramBytes = getParamBytesForAlg(alg);
    var maxEncodedParamLength = paramBytes + 1;
    var inputLength = signature.length;
    var offset = 0;
    if (signature[offset++] !== ENCODED_TAG_SEQ) {
      throw new Error('Could not find expected "seq"');
    }
    var seqLength = signature[offset++];
    if (seqLength === (MAX_OCTET | 1)) {
      seqLength = signature[offset++];
    }
    if (inputLength - offset < seqLength) {
      throw new Error('"seq" specified length of "' + seqLength + '", only "' + (inputLength - offset) + '" remaining');
    }
    if (signature[offset++] !== ENCODED_TAG_INT) {
      throw new Error('Could not find expected "int" for "r"');
    }
    var rLength = signature[offset++];
    if (inputLength - offset - 2 < rLength) {
      throw new Error('"r" specified length of "' + rLength + '", only "' + (inputLength - offset - 2) + '" available');
    }
    if (maxEncodedParamLength < rLength) {
      throw new Error('"r" specified length of "' + rLength + '", max of "' + maxEncodedParamLength + '" is acceptable');
    }
    var rOffset = offset;
    offset += rLength;
    if (signature[offset++] !== ENCODED_TAG_INT) {
      throw new Error('Could not find expected "int" for "s"');
    }
    var sLength = signature[offset++];
    if (inputLength - offset !== sLength) {
      throw new Error('"s" specified length of "' + sLength + '", expected "' + (inputLength - offset) + '"');
    }
    if (maxEncodedParamLength < sLength) {
      throw new Error('"s" specified length of "' + sLength + '", max of "' + maxEncodedParamLength + '" is acceptable');
    }
    var sOffset = offset;
    offset += sLength;
    if (offset !== inputLength) {
      throw new Error('Expected to consume entire buffer, but "' + (inputLength - offset) + '" bytes remain');
    }
    var rPadding = paramBytes - rLength, sPadding = paramBytes - sLength;
    var dst = Buffer2.allocUnsafe(rPadding + rLength + sPadding + sLength);
    for (offset = 0; offset < rPadding; ++offset) {
      dst[offset] = 0;
    }
    signature.copy(dst, offset, rOffset + Math.max(-rPadding, 0), rOffset + rLength);
    offset = paramBytes;
    for (var o = offset; offset < o + sPadding; ++offset) {
      dst[offset] = 0;
    }
    signature.copy(dst, offset, sOffset + Math.max(-sPadding, 0), sOffset + sLength);
    dst = dst.toString("base64");
    dst = base64Url(dst);
    return dst;
  }
  function countPadding(buf, start, stop) {
    var padding = 0;
    while (start + padding < stop && buf[start + padding] === 0) {
      ++padding;
    }
    var needsSign = buf[start + padding] >= MAX_OCTET;
    if (needsSign) {
      --padding;
    }
    return padding;
  }
  function joseToDer(signature, alg) {
    signature = signatureAsBuffer(signature);
    var paramBytes = getParamBytesForAlg(alg);
    var signatureBytes = signature.length;
    if (signatureBytes !== paramBytes * 2) {
      throw new TypeError('"' + alg + '" signatures must be "' + paramBytes * 2 + '" bytes, saw "' + signatureBytes + '"');
    }
    var rPadding = countPadding(signature, 0, paramBytes);
    var sPadding = countPadding(signature, paramBytes, signature.length);
    var rLength = paramBytes - rPadding;
    var sLength = paramBytes - sPadding;
    var rsBytes = 1 + 1 + rLength + 1 + 1 + sLength;
    var shortLength = rsBytes < MAX_OCTET;
    var dst = Buffer2.allocUnsafe((shortLength ? 2 : 3) + rsBytes);
    var offset = 0;
    dst[offset++] = ENCODED_TAG_SEQ;
    if (shortLength) {
      dst[offset++] = rsBytes;
    } else {
      dst[offset++] = MAX_OCTET | 1;
      dst[offset++] = rsBytes & 255;
    }
    dst[offset++] = ENCODED_TAG_INT;
    dst[offset++] = rLength;
    if (rPadding < 0) {
      dst[offset++] = 0;
      offset += signature.copy(dst, offset, 0, paramBytes);
    } else {
      offset += signature.copy(dst, offset, rPadding, paramBytes);
    }
    dst[offset++] = ENCODED_TAG_INT;
    dst[offset++] = sLength;
    if (sPadding < 0) {
      dst[offset++] = 0;
      signature.copy(dst, offset, paramBytes);
    } else {
      signature.copy(dst, offset, paramBytes + sPadding);
    }
    return dst;
  }
  ecdsaSigFormatter = {
    derToJose,
    joseToDer
  };
  return ecdsaSigFormatter;
}
var bufferEqualConstantTime;
var hasRequiredBufferEqualConstantTime;
function requireBufferEqualConstantTime() {
  if (hasRequiredBufferEqualConstantTime) return bufferEqualConstantTime;
  hasRequiredBufferEqualConstantTime = 1;
  var Buffer2 = require$$0.Buffer;
  var SlowBuffer = require$$0.SlowBuffer;
  bufferEqualConstantTime = bufferEq;
  function bufferEq(a, b) {
    if (!Buffer2.isBuffer(a) || !Buffer2.isBuffer(b)) {
      return false;
    }
    if (a.length !== b.length) {
      return false;
    }
    var c = 0;
    for (var i = 0; i < a.length; i++) {
      c |= a[i] ^ b[i];
    }
    return c === 0;
  }
  bufferEq.install = function() {
    Buffer2.prototype.equal = SlowBuffer.prototype.equal = function equal(that) {
      return bufferEq(this, that);
    };
  };
  var origBufEqual = Buffer2.prototype.equal;
  var origSlowBufEqual = SlowBuffer.prototype.equal;
  bufferEq.restore = function() {
    Buffer2.prototype.equal = origBufEqual;
    SlowBuffer.prototype.equal = origSlowBufEqual;
  };
  return bufferEqualConstantTime;
}
var jwa;
var hasRequiredJwa;
function requireJwa() {
  if (hasRequiredJwa) return jwa;
  hasRequiredJwa = 1;
  var Buffer2 = requireSafeBuffer().Buffer;
  var crypto$1 = crypto;
  var formatEcdsa = requireEcdsaSigFormatter();
  var util = require$$5;
  var MSG_INVALID_ALGORITHM = '"%s" is not a valid algorithm.\n  Supported algorithms are:\n  "HS256", "HS384", "HS512", "RS256", "RS384", "RS512", "PS256", "PS384", "PS512", "ES256", "ES384", "ES512" and "none".';
  var MSG_INVALID_SECRET = "secret must be a string or buffer";
  var MSG_INVALID_VERIFIER_KEY = "key must be a string or a buffer";
  var MSG_INVALID_SIGNER_KEY = "key must be a string, a buffer or an object";
  var supportsKeyObjects = typeof crypto$1.createPublicKey === "function";
  if (supportsKeyObjects) {
    MSG_INVALID_VERIFIER_KEY += " or a KeyObject";
    MSG_INVALID_SECRET += "or a KeyObject";
  }
  function checkIsPublicKey(key) {
    if (Buffer2.isBuffer(key)) {
      return;
    }
    if (typeof key === "string") {
      return;
    }
    if (!supportsKeyObjects) {
      throw typeError(MSG_INVALID_VERIFIER_KEY);
    }
    if (typeof key !== "object") {
      throw typeError(MSG_INVALID_VERIFIER_KEY);
    }
    if (typeof key.type !== "string") {
      throw typeError(MSG_INVALID_VERIFIER_KEY);
    }
    if (typeof key.asymmetricKeyType !== "string") {
      throw typeError(MSG_INVALID_VERIFIER_KEY);
    }
    if (typeof key.export !== "function") {
      throw typeError(MSG_INVALID_VERIFIER_KEY);
    }
  }
  function checkIsPrivateKey(key) {
    if (Buffer2.isBuffer(key)) {
      return;
    }
    if (typeof key === "string") {
      return;
    }
    if (typeof key === "object") {
      return;
    }
    throw typeError(MSG_INVALID_SIGNER_KEY);
  }
  function checkIsSecretKey(key) {
    if (Buffer2.isBuffer(key)) {
      return;
    }
    if (typeof key === "string") {
      return key;
    }
    if (!supportsKeyObjects) {
      throw typeError(MSG_INVALID_SECRET);
    }
    if (typeof key !== "object") {
      throw typeError(MSG_INVALID_SECRET);
    }
    if (key.type !== "secret") {
      throw typeError(MSG_INVALID_SECRET);
    }
    if (typeof key.export !== "function") {
      throw typeError(MSG_INVALID_SECRET);
    }
  }
  function fromBase64(base64) {
    return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  }
  function toBase64(base64url) {
    base64url = base64url.toString();
    var padding = 4 - base64url.length % 4;
    if (padding !== 4) {
      for (var i = 0; i < padding; ++i) {
        base64url += "=";
      }
    }
    return base64url.replace(/\-/g, "+").replace(/_/g, "/");
  }
  function typeError(template) {
    var args = [].slice.call(arguments, 1);
    var errMsg = util.format.bind(util, template).apply(null, args);
    return new TypeError(errMsg);
  }
  function bufferOrString(obj) {
    return Buffer2.isBuffer(obj) || typeof obj === "string";
  }
  function normalizeInput(thing) {
    if (!bufferOrString(thing))
      thing = JSON.stringify(thing);
    return thing;
  }
  function createHmacSigner(bits) {
    return function sign2(thing, secret) {
      checkIsSecretKey(secret);
      thing = normalizeInput(thing);
      var hmac = crypto$1.createHmac("sha" + bits, secret);
      var sig = (hmac.update(thing), hmac.digest("base64"));
      return fromBase64(sig);
    };
  }
  var bufferEqual;
  var timingSafeEqual = "timingSafeEqual" in crypto$1 ? function timingSafeEqual2(a, b) {
    if (a.byteLength !== b.byteLength) {
      return false;
    }
    return crypto$1.timingSafeEqual(a, b);
  } : function timingSafeEqual2(a, b) {
    if (!bufferEqual) {
      bufferEqual = requireBufferEqualConstantTime();
    }
    return bufferEqual(a, b);
  };
  function createHmacVerifier(bits) {
    return function verify2(thing, signature, secret) {
      var computedSig = createHmacSigner(bits)(thing, secret);
      return timingSafeEqual(Buffer2.from(signature), Buffer2.from(computedSig));
    };
  }
  function createKeySigner(bits) {
    return function sign2(thing, privateKey) {
      checkIsPrivateKey(privateKey);
      thing = normalizeInput(thing);
      var signer = crypto$1.createSign("RSA-SHA" + bits);
      var sig = (signer.update(thing), signer.sign(privateKey, "base64"));
      return fromBase64(sig);
    };
  }
  function createKeyVerifier(bits) {
    return function verify2(thing, signature, publicKey) {
      checkIsPublicKey(publicKey);
      thing = normalizeInput(thing);
      signature = toBase64(signature);
      var verifier = crypto$1.createVerify("RSA-SHA" + bits);
      verifier.update(thing);
      return verifier.verify(publicKey, signature, "base64");
    };
  }
  function createPSSKeySigner(bits) {
    return function sign2(thing, privateKey) {
      checkIsPrivateKey(privateKey);
      thing = normalizeInput(thing);
      var signer = crypto$1.createSign("RSA-SHA" + bits);
      var sig = (signer.update(thing), signer.sign({
        key: privateKey,
        padding: crypto$1.constants.RSA_PKCS1_PSS_PADDING,
        saltLength: crypto$1.constants.RSA_PSS_SALTLEN_DIGEST
      }, "base64"));
      return fromBase64(sig);
    };
  }
  function createPSSKeyVerifier(bits) {
    return function verify2(thing, signature, publicKey) {
      checkIsPublicKey(publicKey);
      thing = normalizeInput(thing);
      signature = toBase64(signature);
      var verifier = crypto$1.createVerify("RSA-SHA" + bits);
      verifier.update(thing);
      return verifier.verify({
        key: publicKey,
        padding: crypto$1.constants.RSA_PKCS1_PSS_PADDING,
        saltLength: crypto$1.constants.RSA_PSS_SALTLEN_DIGEST
      }, signature, "base64");
    };
  }
  function createECDSASigner(bits) {
    var inner = createKeySigner(bits);
    return function sign2() {
      var signature = inner.apply(null, arguments);
      signature = formatEcdsa.derToJose(signature, "ES" + bits);
      return signature;
    };
  }
  function createECDSAVerifer(bits) {
    var inner = createKeyVerifier(bits);
    return function verify2(thing, signature, publicKey) {
      signature = formatEcdsa.joseToDer(signature, "ES" + bits).toString("base64");
      var result = inner(thing, signature, publicKey);
      return result;
    };
  }
  function createNoneSigner() {
    return function sign2() {
      return "";
    };
  }
  function createNoneVerifier() {
    return function verify2(thing, signature) {
      return signature === "";
    };
  }
  jwa = function jwa2(algorithm) {
    var signerFactories = {
      hs: createHmacSigner,
      rs: createKeySigner,
      ps: createPSSKeySigner,
      es: createECDSASigner,
      none: createNoneSigner
    };
    var verifierFactories = {
      hs: createHmacVerifier,
      rs: createKeyVerifier,
      ps: createPSSKeyVerifier,
      es: createECDSAVerifer,
      none: createNoneVerifier
    };
    var match = algorithm.match(/^(RS|PS|ES|HS)(256|384|512)$|^(none)$/);
    if (!match)
      throw typeError(MSG_INVALID_ALGORITHM, algorithm);
    var algo = (match[1] || match[3]).toLowerCase();
    var bits = match[2];
    return {
      sign: signerFactories[algo](bits),
      verify: verifierFactories[algo](bits)
    };
  };
  return jwa;
}
var tostring;
var hasRequiredTostring;
function requireTostring() {
  if (hasRequiredTostring) return tostring;
  hasRequiredTostring = 1;
  var Buffer2 = require$$0.Buffer;
  tostring = function toString(obj) {
    if (typeof obj === "string")
      return obj;
    if (typeof obj === "number" || Buffer2.isBuffer(obj))
      return obj.toString();
    return JSON.stringify(obj);
  };
  return tostring;
}
var signStream;
var hasRequiredSignStream;
function requireSignStream() {
  if (hasRequiredSignStream) return signStream;
  hasRequiredSignStream = 1;
  var Buffer2 = requireSafeBuffer().Buffer;
  var DataStream = requireDataStream();
  var jwa2 = requireJwa();
  var Stream = require$$3;
  var toString = requireTostring();
  var util = require$$5;
  function base64url(string, encoding) {
    return Buffer2.from(string, encoding).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  }
  function jwsSecuredInput(header, payload, encoding) {
    encoding = encoding || "utf8";
    var encodedHeader = base64url(toString(header), "binary");
    var encodedPayload = base64url(toString(payload), encoding);
    return util.format("%s.%s", encodedHeader, encodedPayload);
  }
  function jwsSign(opts) {
    var header = opts.header;
    var payload = opts.payload;
    var secretOrKey = opts.secret || opts.privateKey;
    var encoding = opts.encoding;
    var algo = jwa2(header.alg);
    var securedInput = jwsSecuredInput(header, payload, encoding);
    var signature = algo.sign(securedInput, secretOrKey);
    return util.format("%s.%s", securedInput, signature);
  }
  function SignStream(opts) {
    var secret = opts.secret;
    secret = secret == null ? opts.privateKey : secret;
    secret = secret == null ? opts.key : secret;
    if (/^hs/i.test(opts.header.alg) === true && secret == null) {
      throw new TypeError("secret must be a string or buffer or a KeyObject");
    }
    var secretStream = new DataStream(secret);
    this.readable = true;
    this.header = opts.header;
    this.encoding = opts.encoding;
    this.secret = this.privateKey = this.key = secretStream;
    this.payload = new DataStream(opts.payload);
    this.secret.once("close", function() {
      if (!this.payload.writable && this.readable)
        this.sign();
    }.bind(this));
    this.payload.once("close", function() {
      if (!this.secret.writable && this.readable)
        this.sign();
    }.bind(this));
  }
  util.inherits(SignStream, Stream);
  SignStream.prototype.sign = function sign2() {
    try {
      var signature = jwsSign({
        header: this.header,
        payload: this.payload.buffer,
        secret: this.secret.buffer,
        encoding: this.encoding
      });
      this.emit("done", signature);
      this.emit("data", signature);
      this.emit("end");
      this.readable = false;
      return signature;
    } catch (e) {
      this.readable = false;
      this.emit("error", e);
      this.emit("close");
    }
  };
  SignStream.sign = jwsSign;
  signStream = SignStream;
  return signStream;
}
var verifyStream;
var hasRequiredVerifyStream;
function requireVerifyStream() {
  if (hasRequiredVerifyStream) return verifyStream;
  hasRequiredVerifyStream = 1;
  var Buffer2 = requireSafeBuffer().Buffer;
  var DataStream = requireDataStream();
  var jwa2 = requireJwa();
  var Stream = require$$3;
  var toString = requireTostring();
  var util = require$$5;
  var JWS_REGEX = /^[a-zA-Z0-9\-_]+?\.[a-zA-Z0-9\-_]+?\.([a-zA-Z0-9\-_]+)?$/;
  function isObject(thing) {
    return Object.prototype.toString.call(thing) === "[object Object]";
  }
  function safeJsonParse(thing) {
    if (isObject(thing))
      return thing;
    try {
      return JSON.parse(thing);
    } catch (e) {
      return void 0;
    }
  }
  function headerFromJWS(jwsSig) {
    var encodedHeader = jwsSig.split(".", 1)[0];
    return safeJsonParse(Buffer2.from(encodedHeader, "base64").toString("binary"));
  }
  function securedInputFromJWS(jwsSig) {
    return jwsSig.split(".", 2).join(".");
  }
  function signatureFromJWS(jwsSig) {
    return jwsSig.split(".")[2];
  }
  function payloadFromJWS(jwsSig, encoding) {
    encoding = encoding || "utf8";
    var payload = jwsSig.split(".")[1];
    return Buffer2.from(payload, "base64").toString(encoding);
  }
  function isValidJws(string) {
    return JWS_REGEX.test(string) && !!headerFromJWS(string);
  }
  function jwsVerify(jwsSig, algorithm, secretOrKey) {
    if (!algorithm) {
      var err = new Error("Missing algorithm parameter for jws.verify");
      err.code = "MISSING_ALGORITHM";
      throw err;
    }
    jwsSig = toString(jwsSig);
    var signature = signatureFromJWS(jwsSig);
    var securedInput = securedInputFromJWS(jwsSig);
    var algo = jwa2(algorithm);
    return algo.verify(securedInput, signature, secretOrKey);
  }
  function jwsDecode(jwsSig, opts) {
    opts = opts || {};
    jwsSig = toString(jwsSig);
    if (!isValidJws(jwsSig))
      return null;
    var header = headerFromJWS(jwsSig);
    if (!header)
      return null;
    var payload = payloadFromJWS(jwsSig);
    if (header.typ === "JWT" || opts.json)
      payload = JSON.parse(payload, opts.encoding);
    return {
      header,
      payload,
      signature: signatureFromJWS(jwsSig)
    };
  }
  function VerifyStream(opts) {
    opts = opts || {};
    var secretOrKey = opts.secret;
    secretOrKey = secretOrKey == null ? opts.publicKey : secretOrKey;
    secretOrKey = secretOrKey == null ? opts.key : secretOrKey;
    if (/^hs/i.test(opts.algorithm) === true && secretOrKey == null) {
      throw new TypeError("secret must be a string or buffer or a KeyObject");
    }
    var secretStream = new DataStream(secretOrKey);
    this.readable = true;
    this.algorithm = opts.algorithm;
    this.encoding = opts.encoding;
    this.secret = this.publicKey = this.key = secretStream;
    this.signature = new DataStream(opts.signature);
    this.secret.once("close", function() {
      if (!this.signature.writable && this.readable)
        this.verify();
    }.bind(this));
    this.signature.once("close", function() {
      if (!this.secret.writable && this.readable)
        this.verify();
    }.bind(this));
  }
  util.inherits(VerifyStream, Stream);
  VerifyStream.prototype.verify = function verify2() {
    try {
      var valid2 = jwsVerify(this.signature.buffer, this.algorithm, this.key.buffer);
      var obj = jwsDecode(this.signature.buffer, this.encoding);
      this.emit("done", valid2, obj);
      this.emit("data", valid2);
      this.emit("end");
      this.readable = false;
      return valid2;
    } catch (e) {
      this.readable = false;
      this.emit("error", e);
      this.emit("close");
    }
  };
  VerifyStream.decode = jwsDecode;
  VerifyStream.isValid = isValidJws;
  VerifyStream.verify = jwsVerify;
  verifyStream = VerifyStream;
  return verifyStream;
}
var hasRequiredJws;
function requireJws() {
  if (hasRequiredJws) return jws;
  hasRequiredJws = 1;
  var SignStream = requireSignStream();
  var VerifyStream = requireVerifyStream();
  var ALGORITHMS = [
    "HS256",
    "HS384",
    "HS512",
    "RS256",
    "RS384",
    "RS512",
    "PS256",
    "PS384",
    "PS512",
    "ES256",
    "ES384",
    "ES512"
  ];
  jws.ALGORITHMS = ALGORITHMS;
  jws.sign = SignStream.sign;
  jws.verify = VerifyStream.verify;
  jws.decode = VerifyStream.decode;
  jws.isValid = VerifyStream.isValid;
  jws.createSign = function createSign(opts) {
    return new SignStream(opts);
  };
  jws.createVerify = function createVerify(opts) {
    return new VerifyStream(opts);
  };
  return jws;
}
var decode;
var hasRequiredDecode;
function requireDecode() {
  if (hasRequiredDecode) return decode;
  hasRequiredDecode = 1;
  var jws2 = requireJws();
  decode = function(jwt2, options) {
    options = options || {};
    var decoded = jws2.decode(jwt2, options);
    if (!decoded) {
      return null;
    }
    var payload = decoded.payload;
    if (typeof payload === "string") {
      try {
        var obj = JSON.parse(payload);
        if (obj !== null && typeof obj === "object") {
          payload = obj;
        }
      } catch (e) {
      }
    }
    if (options.complete === true) {
      return {
        header: decoded.header,
        payload,
        signature: decoded.signature
      };
    }
    return payload;
  };
  return decode;
}
var JsonWebTokenError_1;
var hasRequiredJsonWebTokenError;
function requireJsonWebTokenError() {
  if (hasRequiredJsonWebTokenError) return JsonWebTokenError_1;
  hasRequiredJsonWebTokenError = 1;
  var JsonWebTokenError = function(message, error) {
    Error.call(this, message);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
    this.name = "JsonWebTokenError";
    this.message = message;
    if (error) this.inner = error;
  };
  JsonWebTokenError.prototype = Object.create(Error.prototype);
  JsonWebTokenError.prototype.constructor = JsonWebTokenError;
  JsonWebTokenError_1 = JsonWebTokenError;
  return JsonWebTokenError_1;
}
var NotBeforeError_1;
var hasRequiredNotBeforeError;
function requireNotBeforeError() {
  if (hasRequiredNotBeforeError) return NotBeforeError_1;
  hasRequiredNotBeforeError = 1;
  var JsonWebTokenError = requireJsonWebTokenError();
  var NotBeforeError = function(message, date) {
    JsonWebTokenError.call(this, message);
    this.name = "NotBeforeError";
    this.date = date;
  };
  NotBeforeError.prototype = Object.create(JsonWebTokenError.prototype);
  NotBeforeError.prototype.constructor = NotBeforeError;
  NotBeforeError_1 = NotBeforeError;
  return NotBeforeError_1;
}
var TokenExpiredError_1;
var hasRequiredTokenExpiredError;
function requireTokenExpiredError() {
  if (hasRequiredTokenExpiredError) return TokenExpiredError_1;
  hasRequiredTokenExpiredError = 1;
  var JsonWebTokenError = requireJsonWebTokenError();
  var TokenExpiredError = function(message, expiredAt) {
    JsonWebTokenError.call(this, message);
    this.name = "TokenExpiredError";
    this.expiredAt = expiredAt;
  };
  TokenExpiredError.prototype = Object.create(JsonWebTokenError.prototype);
  TokenExpiredError.prototype.constructor = TokenExpiredError;
  TokenExpiredError_1 = TokenExpiredError;
  return TokenExpiredError_1;
}
var ms;
var hasRequiredMs;
function requireMs() {
  if (hasRequiredMs) return ms;
  hasRequiredMs = 1;
  var s = 1e3;
  var m = s * 60;
  var h = m * 60;
  var d = h * 24;
  var w = d * 7;
  var y = d * 365.25;
  ms = function(val, options) {
    options = options || {};
    var type = typeof val;
    if (type === "string" && val.length > 0) {
      return parse(val);
    } else if (type === "number" && isFinite(val)) {
      return options.long ? fmtLong(val) : fmtShort(val);
    }
    throw new Error(
      "val is not a non-empty string or a valid number. val=" + JSON.stringify(val)
    );
  };
  function parse(str) {
    str = String(str);
    if (str.length > 100) {
      return;
    }
    var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
      str
    );
    if (!match) {
      return;
    }
    var n = parseFloat(match[1]);
    var type = (match[2] || "ms").toLowerCase();
    switch (type) {
      case "years":
      case "year":
      case "yrs":
      case "yr":
      case "y":
        return n * y;
      case "weeks":
      case "week":
      case "w":
        return n * w;
      case "days":
      case "day":
      case "d":
        return n * d;
      case "hours":
      case "hour":
      case "hrs":
      case "hr":
      case "h":
        return n * h;
      case "minutes":
      case "minute":
      case "mins":
      case "min":
      case "m":
        return n * m;
      case "seconds":
      case "second":
      case "secs":
      case "sec":
      case "s":
        return n * s;
      case "milliseconds":
      case "millisecond":
      case "msecs":
      case "msec":
      case "ms":
        return n;
      default:
        return void 0;
    }
  }
  function fmtShort(ms2) {
    var msAbs = Math.abs(ms2);
    if (msAbs >= d) {
      return Math.round(ms2 / d) + "d";
    }
    if (msAbs >= h) {
      return Math.round(ms2 / h) + "h";
    }
    if (msAbs >= m) {
      return Math.round(ms2 / m) + "m";
    }
    if (msAbs >= s) {
      return Math.round(ms2 / s) + "s";
    }
    return ms2 + "ms";
  }
  function fmtLong(ms2) {
    var msAbs = Math.abs(ms2);
    if (msAbs >= d) {
      return plural(ms2, msAbs, d, "day");
    }
    if (msAbs >= h) {
      return plural(ms2, msAbs, h, "hour");
    }
    if (msAbs >= m) {
      return plural(ms2, msAbs, m, "minute");
    }
    if (msAbs >= s) {
      return plural(ms2, msAbs, s, "second");
    }
    return ms2 + " ms";
  }
  function plural(ms2, msAbs, n, name2) {
    var isPlural = msAbs >= n * 1.5;
    return Math.round(ms2 / n) + " " + name2 + (isPlural ? "s" : "");
  }
  return ms;
}
var timespan;
var hasRequiredTimespan;
function requireTimespan() {
  if (hasRequiredTimespan) return timespan;
  hasRequiredTimespan = 1;
  var ms2 = requireMs();
  timespan = function(time, iat) {
    var timestamp = iat || Math.floor(Date.now() / 1e3);
    if (typeof time === "string") {
      var milliseconds = ms2(time);
      if (typeof milliseconds === "undefined") {
        return;
      }
      return Math.floor(timestamp + milliseconds / 1e3);
    } else if (typeof time === "number") {
      return timestamp + time;
    } else {
      return;
    }
  };
  return timespan;
}
var re = { exports: {} };
var constants;
var hasRequiredConstants;
function requireConstants() {
  if (hasRequiredConstants) return constants;
  hasRequiredConstants = 1;
  const SEMVER_SPEC_VERSION = "2.0.0";
  const MAX_LENGTH = 256;
  const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || /* istanbul ignore next */
  9007199254740991;
  const MAX_SAFE_COMPONENT_LENGTH = 16;
  const MAX_SAFE_BUILD_LENGTH = MAX_LENGTH - 6;
  const RELEASE_TYPES = [
    "major",
    "premajor",
    "minor",
    "preminor",
    "patch",
    "prepatch",
    "prerelease"
  ];
  constants = {
    MAX_LENGTH,
    MAX_SAFE_COMPONENT_LENGTH,
    MAX_SAFE_BUILD_LENGTH,
    MAX_SAFE_INTEGER,
    RELEASE_TYPES,
    SEMVER_SPEC_VERSION,
    FLAG_INCLUDE_PRERELEASE: 1,
    FLAG_LOOSE: 2
  };
  return constants;
}
var debug_1;
var hasRequiredDebug;
function requireDebug() {
  if (hasRequiredDebug) return debug_1;
  hasRequiredDebug = 1;
  const debug = typeof process === "object" && process.env && process.env.NODE_DEBUG && /\bsemver\b/i.test(process.env.NODE_DEBUG) ? (...args) => console.error("SEMVER", ...args) : () => {
  };
  debug_1 = debug;
  return debug_1;
}
var hasRequiredRe;
function requireRe() {
  if (hasRequiredRe) return re.exports;
  hasRequiredRe = 1;
  (function(module, exports$1) {
    const {
      MAX_SAFE_COMPONENT_LENGTH,
      MAX_SAFE_BUILD_LENGTH,
      MAX_LENGTH
    } = requireConstants();
    const debug = requireDebug();
    exports$1 = module.exports = {};
    const re2 = exports$1.re = [];
    const safeRe = exports$1.safeRe = [];
    const src = exports$1.src = [];
    const safeSrc = exports$1.safeSrc = [];
    const t = exports$1.t = {};
    let R = 0;
    const LETTERDASHNUMBER = "[a-zA-Z0-9-]";
    const safeRegexReplacements = [
      ["\\s", 1],
      ["\\d", MAX_LENGTH],
      [LETTERDASHNUMBER, MAX_SAFE_BUILD_LENGTH]
    ];
    const makeSafeRegex = (value) => {
      for (const [token, max] of safeRegexReplacements) {
        value = value.split(`${token}*`).join(`${token}{0,${max}}`).split(`${token}+`).join(`${token}{1,${max}}`);
      }
      return value;
    };
    const createToken = (name2, value, isGlobal) => {
      const safe = makeSafeRegex(value);
      const index = R++;
      debug(name2, index, value);
      t[name2] = index;
      src[index] = value;
      safeSrc[index] = safe;
      re2[index] = new RegExp(value, isGlobal ? "g" : void 0);
      safeRe[index] = new RegExp(safe, isGlobal ? "g" : void 0);
    };
    createToken("NUMERICIDENTIFIER", "0|[1-9]\\d*");
    createToken("NUMERICIDENTIFIERLOOSE", "\\d+");
    createToken("NONNUMERICIDENTIFIER", `\\d*[a-zA-Z-]${LETTERDASHNUMBER}*`);
    createToken("MAINVERSION", `(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})`);
    createToken("MAINVERSIONLOOSE", `(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})`);
    createToken("PRERELEASEIDENTIFIER", `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIER]})`);
    createToken("PRERELEASEIDENTIFIERLOOSE", `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIERLOOSE]})`);
    createToken("PRERELEASE", `(?:-(${src[t.PRERELEASEIDENTIFIER]}(?:\\.${src[t.PRERELEASEIDENTIFIER]})*))`);
    createToken("PRERELEASELOOSE", `(?:-?(${src[t.PRERELEASEIDENTIFIERLOOSE]}(?:\\.${src[t.PRERELEASEIDENTIFIERLOOSE]})*))`);
    createToken("BUILDIDENTIFIER", `${LETTERDASHNUMBER}+`);
    createToken("BUILD", `(?:\\+(${src[t.BUILDIDENTIFIER]}(?:\\.${src[t.BUILDIDENTIFIER]})*))`);
    createToken("FULLPLAIN", `v?${src[t.MAINVERSION]}${src[t.PRERELEASE]}?${src[t.BUILD]}?`);
    createToken("FULL", `^${src[t.FULLPLAIN]}$`);
    createToken("LOOSEPLAIN", `[v=\\s]*${src[t.MAINVERSIONLOOSE]}${src[t.PRERELEASELOOSE]}?${src[t.BUILD]}?`);
    createToken("LOOSE", `^${src[t.LOOSEPLAIN]}$`);
    createToken("GTLT", "((?:<|>)?=?)");
    createToken("XRANGEIDENTIFIERLOOSE", `${src[t.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`);
    createToken("XRANGEIDENTIFIER", `${src[t.NUMERICIDENTIFIER]}|x|X|\\*`);
    createToken("XRANGEPLAIN", `[v=\\s]*(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:${src[t.PRERELEASE]})?${src[t.BUILD]}?)?)?`);
    createToken("XRANGEPLAINLOOSE", `[v=\\s]*(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:${src[t.PRERELEASELOOSE]})?${src[t.BUILD]}?)?)?`);
    createToken("XRANGE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAIN]}$`);
    createToken("XRANGELOOSE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("COERCEPLAIN", `${"(^|[^\\d])(\\d{1,"}${MAX_SAFE_COMPONENT_LENGTH}})(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?`);
    createToken("COERCE", `${src[t.COERCEPLAIN]}(?:$|[^\\d])`);
    createToken("COERCEFULL", src[t.COERCEPLAIN] + `(?:${src[t.PRERELEASE]})?(?:${src[t.BUILD]})?(?:$|[^\\d])`);
    createToken("COERCERTL", src[t.COERCE], true);
    createToken("COERCERTLFULL", src[t.COERCEFULL], true);
    createToken("LONETILDE", "(?:~>?)");
    createToken("TILDETRIM", `(\\s*)${src[t.LONETILDE]}\\s+`, true);
    exports$1.tildeTrimReplace = "$1~";
    createToken("TILDE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAIN]}$`);
    createToken("TILDELOOSE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("LONECARET", "(?:\\^)");
    createToken("CARETTRIM", `(\\s*)${src[t.LONECARET]}\\s+`, true);
    exports$1.caretTrimReplace = "$1^";
    createToken("CARET", `^${src[t.LONECARET]}${src[t.XRANGEPLAIN]}$`);
    createToken("CARETLOOSE", `^${src[t.LONECARET]}${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("COMPARATORLOOSE", `^${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]})$|^$`);
    createToken("COMPARATOR", `^${src[t.GTLT]}\\s*(${src[t.FULLPLAIN]})$|^$`);
    createToken("COMPARATORTRIM", `(\\s*)${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]}|${src[t.XRANGEPLAIN]})`, true);
    exports$1.comparatorTrimReplace = "$1$2$3";
    createToken("HYPHENRANGE", `^\\s*(${src[t.XRANGEPLAIN]})\\s+-\\s+(${src[t.XRANGEPLAIN]})\\s*$`);
    createToken("HYPHENRANGELOOSE", `^\\s*(${src[t.XRANGEPLAINLOOSE]})\\s+-\\s+(${src[t.XRANGEPLAINLOOSE]})\\s*$`);
    createToken("STAR", "(<|>)?=?\\s*\\*");
    createToken("GTE0", "^\\s*>=\\s*0\\.0\\.0\\s*$");
    createToken("GTE0PRE", "^\\s*>=\\s*0\\.0\\.0-0\\s*$");
  })(re, re.exports);
  return re.exports;
}
var parseOptions_1;
var hasRequiredParseOptions;
function requireParseOptions() {
  if (hasRequiredParseOptions) return parseOptions_1;
  hasRequiredParseOptions = 1;
  const looseOption = Object.freeze({ loose: true });
  const emptyOpts = Object.freeze({});
  const parseOptions = (options) => {
    if (!options) {
      return emptyOpts;
    }
    if (typeof options !== "object") {
      return looseOption;
    }
    return options;
  };
  parseOptions_1 = parseOptions;
  return parseOptions_1;
}
var identifiers;
var hasRequiredIdentifiers;
function requireIdentifiers() {
  if (hasRequiredIdentifiers) return identifiers;
  hasRequiredIdentifiers = 1;
  const numeric = /^[0-9]+$/;
  const compareIdentifiers = (a, b) => {
    if (typeof a === "number" && typeof b === "number") {
      return a === b ? 0 : a < b ? -1 : 1;
    }
    const anum = numeric.test(a);
    const bnum = numeric.test(b);
    if (anum && bnum) {
      a = +a;
      b = +b;
    }
    return a === b ? 0 : anum && !bnum ? -1 : bnum && !anum ? 1 : a < b ? -1 : 1;
  };
  const rcompareIdentifiers = (a, b) => compareIdentifiers(b, a);
  identifiers = {
    compareIdentifiers,
    rcompareIdentifiers
  };
  return identifiers;
}
var semver$1;
var hasRequiredSemver$1;
function requireSemver$1() {
  if (hasRequiredSemver$1) return semver$1;
  hasRequiredSemver$1 = 1;
  const debug = requireDebug();
  const { MAX_LENGTH, MAX_SAFE_INTEGER } = requireConstants();
  const { safeRe: re2, t } = requireRe();
  const parseOptions = requireParseOptions();
  const { compareIdentifiers } = requireIdentifiers();
  class SemVer {
    constructor(version2, options) {
      options = parseOptions(options);
      if (version2 instanceof SemVer) {
        if (version2.loose === !!options.loose && version2.includePrerelease === !!options.includePrerelease) {
          return version2;
        } else {
          version2 = version2.version;
        }
      } else if (typeof version2 !== "string") {
        throw new TypeError(`Invalid version. Must be a string. Got type "${typeof version2}".`);
      }
      if (version2.length > MAX_LENGTH) {
        throw new TypeError(
          `version is longer than ${MAX_LENGTH} characters`
        );
      }
      debug("SemVer", version2, options);
      this.options = options;
      this.loose = !!options.loose;
      this.includePrerelease = !!options.includePrerelease;
      const m = version2.trim().match(options.loose ? re2[t.LOOSE] : re2[t.FULL]);
      if (!m) {
        throw new TypeError(`Invalid Version: ${version2}`);
      }
      this.raw = version2;
      this.major = +m[1];
      this.minor = +m[2];
      this.patch = +m[3];
      if (this.major > MAX_SAFE_INTEGER || this.major < 0) {
        throw new TypeError("Invalid major version");
      }
      if (this.minor > MAX_SAFE_INTEGER || this.minor < 0) {
        throw new TypeError("Invalid minor version");
      }
      if (this.patch > MAX_SAFE_INTEGER || this.patch < 0) {
        throw new TypeError("Invalid patch version");
      }
      if (!m[4]) {
        this.prerelease = [];
      } else {
        this.prerelease = m[4].split(".").map((id) => {
          if (/^[0-9]+$/.test(id)) {
            const num = +id;
            if (num >= 0 && num < MAX_SAFE_INTEGER) {
              return num;
            }
          }
          return id;
        });
      }
      this.build = m[5] ? m[5].split(".") : [];
      this.format();
    }
    format() {
      this.version = `${this.major}.${this.minor}.${this.patch}`;
      if (this.prerelease.length) {
        this.version += `-${this.prerelease.join(".")}`;
      }
      return this.version;
    }
    toString() {
      return this.version;
    }
    compare(other) {
      debug("SemVer.compare", this.version, this.options, other);
      if (!(other instanceof SemVer)) {
        if (typeof other === "string" && other === this.version) {
          return 0;
        }
        other = new SemVer(other, this.options);
      }
      if (other.version === this.version) {
        return 0;
      }
      return this.compareMain(other) || this.comparePre(other);
    }
    compareMain(other) {
      if (!(other instanceof SemVer)) {
        other = new SemVer(other, this.options);
      }
      if (this.major < other.major) {
        return -1;
      }
      if (this.major > other.major) {
        return 1;
      }
      if (this.minor < other.minor) {
        return -1;
      }
      if (this.minor > other.minor) {
        return 1;
      }
      if (this.patch < other.patch) {
        return -1;
      }
      if (this.patch > other.patch) {
        return 1;
      }
      return 0;
    }
    comparePre(other) {
      if (!(other instanceof SemVer)) {
        other = new SemVer(other, this.options);
      }
      if (this.prerelease.length && !other.prerelease.length) {
        return -1;
      } else if (!this.prerelease.length && other.prerelease.length) {
        return 1;
      } else if (!this.prerelease.length && !other.prerelease.length) {
        return 0;
      }
      let i = 0;
      do {
        const a = this.prerelease[i];
        const b = other.prerelease[i];
        debug("prerelease compare", i, a, b);
        if (a === void 0 && b === void 0) {
          return 0;
        } else if (b === void 0) {
          return 1;
        } else if (a === void 0) {
          return -1;
        } else if (a === b) {
          continue;
        } else {
          return compareIdentifiers(a, b);
        }
      } while (++i);
    }
    compareBuild(other) {
      if (!(other instanceof SemVer)) {
        other = new SemVer(other, this.options);
      }
      let i = 0;
      do {
        const a = this.build[i];
        const b = other.build[i];
        debug("build compare", i, a, b);
        if (a === void 0 && b === void 0) {
          return 0;
        } else if (b === void 0) {
          return 1;
        } else if (a === void 0) {
          return -1;
        } else if (a === b) {
          continue;
        } else {
          return compareIdentifiers(a, b);
        }
      } while (++i);
    }
    // preminor will bump the version up to the next minor release, and immediately
    // down to pre-release. premajor and prepatch work the same way.
    inc(release, identifier, identifierBase) {
      if (release.startsWith("pre")) {
        if (!identifier && identifierBase === false) {
          throw new Error("invalid increment argument: identifier is empty");
        }
        if (identifier) {
          const match = `-${identifier}`.match(this.options.loose ? re2[t.PRERELEASELOOSE] : re2[t.PRERELEASE]);
          if (!match || match[1] !== identifier) {
            throw new Error(`invalid identifier: ${identifier}`);
          }
        }
      }
      switch (release) {
        case "premajor":
          this.prerelease.length = 0;
          this.patch = 0;
          this.minor = 0;
          this.major++;
          this.inc("pre", identifier, identifierBase);
          break;
        case "preminor":
          this.prerelease.length = 0;
          this.patch = 0;
          this.minor++;
          this.inc("pre", identifier, identifierBase);
          break;
        case "prepatch":
          this.prerelease.length = 0;
          this.inc("patch", identifier, identifierBase);
          this.inc("pre", identifier, identifierBase);
          break;
        // If the input is a non-prerelease version, this acts the same as
        // prepatch.
        case "prerelease":
          if (this.prerelease.length === 0) {
            this.inc("patch", identifier, identifierBase);
          }
          this.inc("pre", identifier, identifierBase);
          break;
        case "release":
          if (this.prerelease.length === 0) {
            throw new Error(`version ${this.raw} is not a prerelease`);
          }
          this.prerelease.length = 0;
          break;
        case "major":
          if (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) {
            this.major++;
          }
          this.minor = 0;
          this.patch = 0;
          this.prerelease = [];
          break;
        case "minor":
          if (this.patch !== 0 || this.prerelease.length === 0) {
            this.minor++;
          }
          this.patch = 0;
          this.prerelease = [];
          break;
        case "patch":
          if (this.prerelease.length === 0) {
            this.patch++;
          }
          this.prerelease = [];
          break;
        // This probably shouldn't be used publicly.
        // 1.0.0 'pre' would become 1.0.0-0 which is the wrong direction.
        case "pre": {
          const base = Number(identifierBase) ? 1 : 0;
          if (this.prerelease.length === 0) {
            this.prerelease = [base];
          } else {
            let i = this.prerelease.length;
            while (--i >= 0) {
              if (typeof this.prerelease[i] === "number") {
                this.prerelease[i]++;
                i = -2;
              }
            }
            if (i === -1) {
              if (identifier === this.prerelease.join(".") && identifierBase === false) {
                throw new Error("invalid increment argument: identifier already exists");
              }
              this.prerelease.push(base);
            }
          }
          if (identifier) {
            let prerelease = [identifier, base];
            if (identifierBase === false) {
              prerelease = [identifier];
            }
            if (compareIdentifiers(this.prerelease[0], identifier) === 0) {
              if (isNaN(this.prerelease[1])) {
                this.prerelease = prerelease;
              }
            } else {
              this.prerelease = prerelease;
            }
          }
          break;
        }
        default:
          throw new Error(`invalid increment argument: ${release}`);
      }
      this.raw = this.format();
      if (this.build.length) {
        this.raw += `+${this.build.join(".")}`;
      }
      return this;
    }
  }
  semver$1 = SemVer;
  return semver$1;
}
var parse_1;
var hasRequiredParse;
function requireParse() {
  if (hasRequiredParse) return parse_1;
  hasRequiredParse = 1;
  const SemVer = requireSemver$1();
  const parse = (version2, options, throwErrors = false) => {
    if (version2 instanceof SemVer) {
      return version2;
    }
    try {
      return new SemVer(version2, options);
    } catch (er) {
      if (!throwErrors) {
        return null;
      }
      throw er;
    }
  };
  parse_1 = parse;
  return parse_1;
}
var valid_1;
var hasRequiredValid$1;
function requireValid$1() {
  if (hasRequiredValid$1) return valid_1;
  hasRequiredValid$1 = 1;
  const parse = requireParse();
  const valid2 = (version2, options) => {
    const v = parse(version2, options);
    return v ? v.version : null;
  };
  valid_1 = valid2;
  return valid_1;
}
var clean_1;
var hasRequiredClean;
function requireClean() {
  if (hasRequiredClean) return clean_1;
  hasRequiredClean = 1;
  const parse = requireParse();
  const clean = (version2, options) => {
    const s = parse(version2.trim().replace(/^[=v]+/, ""), options);
    return s ? s.version : null;
  };
  clean_1 = clean;
  return clean_1;
}
var inc_1;
var hasRequiredInc;
function requireInc() {
  if (hasRequiredInc) return inc_1;
  hasRequiredInc = 1;
  const SemVer = requireSemver$1();
  const inc = (version2, release, options, identifier, identifierBase) => {
    if (typeof options === "string") {
      identifierBase = identifier;
      identifier = options;
      options = void 0;
    }
    try {
      return new SemVer(
        version2 instanceof SemVer ? version2.version : version2,
        options
      ).inc(release, identifier, identifierBase).version;
    } catch (er) {
      return null;
    }
  };
  inc_1 = inc;
  return inc_1;
}
var diff_1;
var hasRequiredDiff;
function requireDiff() {
  if (hasRequiredDiff) return diff_1;
  hasRequiredDiff = 1;
  const parse = requireParse();
  const diff = (version1, version2) => {
    const v1 = parse(version1, null, true);
    const v2 = parse(version2, null, true);
    const comparison = v1.compare(v2);
    if (comparison === 0) {
      return null;
    }
    const v1Higher = comparison > 0;
    const highVersion = v1Higher ? v1 : v2;
    const lowVersion = v1Higher ? v2 : v1;
    const highHasPre = !!highVersion.prerelease.length;
    const lowHasPre = !!lowVersion.prerelease.length;
    if (lowHasPre && !highHasPre) {
      if (!lowVersion.patch && !lowVersion.minor) {
        return "major";
      }
      if (lowVersion.compareMain(highVersion) === 0) {
        if (lowVersion.minor && !lowVersion.patch) {
          return "minor";
        }
        return "patch";
      }
    }
    const prefix = highHasPre ? "pre" : "";
    if (v1.major !== v2.major) {
      return prefix + "major";
    }
    if (v1.minor !== v2.minor) {
      return prefix + "minor";
    }
    if (v1.patch !== v2.patch) {
      return prefix + "patch";
    }
    return "prerelease";
  };
  diff_1 = diff;
  return diff_1;
}
var major_1;
var hasRequiredMajor;
function requireMajor() {
  if (hasRequiredMajor) return major_1;
  hasRequiredMajor = 1;
  const SemVer = requireSemver$1();
  const major = (a, loose) => new SemVer(a, loose).major;
  major_1 = major;
  return major_1;
}
var minor_1;
var hasRequiredMinor;
function requireMinor() {
  if (hasRequiredMinor) return minor_1;
  hasRequiredMinor = 1;
  const SemVer = requireSemver$1();
  const minor = (a, loose) => new SemVer(a, loose).minor;
  minor_1 = minor;
  return minor_1;
}
var patch_1;
var hasRequiredPatch;
function requirePatch() {
  if (hasRequiredPatch) return patch_1;
  hasRequiredPatch = 1;
  const SemVer = requireSemver$1();
  const patch = (a, loose) => new SemVer(a, loose).patch;
  patch_1 = patch;
  return patch_1;
}
var prerelease_1;
var hasRequiredPrerelease;
function requirePrerelease() {
  if (hasRequiredPrerelease) return prerelease_1;
  hasRequiredPrerelease = 1;
  const parse = requireParse();
  const prerelease = (version2, options) => {
    const parsed = parse(version2, options);
    return parsed && parsed.prerelease.length ? parsed.prerelease : null;
  };
  prerelease_1 = prerelease;
  return prerelease_1;
}
var compare_1;
var hasRequiredCompare;
function requireCompare() {
  if (hasRequiredCompare) return compare_1;
  hasRequiredCompare = 1;
  const SemVer = requireSemver$1();
  const compare = (a, b, loose) => new SemVer(a, loose).compare(new SemVer(b, loose));
  compare_1 = compare;
  return compare_1;
}
var rcompare_1;
var hasRequiredRcompare;
function requireRcompare() {
  if (hasRequiredRcompare) return rcompare_1;
  hasRequiredRcompare = 1;
  const compare = requireCompare();
  const rcompare = (a, b, loose) => compare(b, a, loose);
  rcompare_1 = rcompare;
  return rcompare_1;
}
var compareLoose_1;
var hasRequiredCompareLoose;
function requireCompareLoose() {
  if (hasRequiredCompareLoose) return compareLoose_1;
  hasRequiredCompareLoose = 1;
  const compare = requireCompare();
  const compareLoose = (a, b) => compare(a, b, true);
  compareLoose_1 = compareLoose;
  return compareLoose_1;
}
var compareBuild_1;
var hasRequiredCompareBuild;
function requireCompareBuild() {
  if (hasRequiredCompareBuild) return compareBuild_1;
  hasRequiredCompareBuild = 1;
  const SemVer = requireSemver$1();
  const compareBuild = (a, b, loose) => {
    const versionA = new SemVer(a, loose);
    const versionB = new SemVer(b, loose);
    return versionA.compare(versionB) || versionA.compareBuild(versionB);
  };
  compareBuild_1 = compareBuild;
  return compareBuild_1;
}
var sort_1;
var hasRequiredSort;
function requireSort() {
  if (hasRequiredSort) return sort_1;
  hasRequiredSort = 1;
  const compareBuild = requireCompareBuild();
  const sort = (list, loose) => list.sort((a, b) => compareBuild(a, b, loose));
  sort_1 = sort;
  return sort_1;
}
var rsort_1;
var hasRequiredRsort;
function requireRsort() {
  if (hasRequiredRsort) return rsort_1;
  hasRequiredRsort = 1;
  const compareBuild = requireCompareBuild();
  const rsort = (list, loose) => list.sort((a, b) => compareBuild(b, a, loose));
  rsort_1 = rsort;
  return rsort_1;
}
var gt_1;
var hasRequiredGt;
function requireGt() {
  if (hasRequiredGt) return gt_1;
  hasRequiredGt = 1;
  const compare = requireCompare();
  const gt = (a, b, loose) => compare(a, b, loose) > 0;
  gt_1 = gt;
  return gt_1;
}
var lt_1;
var hasRequiredLt;
function requireLt() {
  if (hasRequiredLt) return lt_1;
  hasRequiredLt = 1;
  const compare = requireCompare();
  const lt = (a, b, loose) => compare(a, b, loose) < 0;
  lt_1 = lt;
  return lt_1;
}
var eq_1;
var hasRequiredEq;
function requireEq() {
  if (hasRequiredEq) return eq_1;
  hasRequiredEq = 1;
  const compare = requireCompare();
  const eq = (a, b, loose) => compare(a, b, loose) === 0;
  eq_1 = eq;
  return eq_1;
}
var neq_1;
var hasRequiredNeq;
function requireNeq() {
  if (hasRequiredNeq) return neq_1;
  hasRequiredNeq = 1;
  const compare = requireCompare();
  const neq = (a, b, loose) => compare(a, b, loose) !== 0;
  neq_1 = neq;
  return neq_1;
}
var gte_1;
var hasRequiredGte;
function requireGte() {
  if (hasRequiredGte) return gte_1;
  hasRequiredGte = 1;
  const compare = requireCompare();
  const gte = (a, b, loose) => compare(a, b, loose) >= 0;
  gte_1 = gte;
  return gte_1;
}
var lte_1;
var hasRequiredLte;
function requireLte() {
  if (hasRequiredLte) return lte_1;
  hasRequiredLte = 1;
  const compare = requireCompare();
  const lte = (a, b, loose) => compare(a, b, loose) <= 0;
  lte_1 = lte;
  return lte_1;
}
var cmp_1;
var hasRequiredCmp;
function requireCmp() {
  if (hasRequiredCmp) return cmp_1;
  hasRequiredCmp = 1;
  const eq = requireEq();
  const neq = requireNeq();
  const gt = requireGt();
  const gte = requireGte();
  const lt = requireLt();
  const lte = requireLte();
  const cmp = (a, op, b, loose) => {
    switch (op) {
      case "===":
        if (typeof a === "object") {
          a = a.version;
        }
        if (typeof b === "object") {
          b = b.version;
        }
        return a === b;
      case "!==":
        if (typeof a === "object") {
          a = a.version;
        }
        if (typeof b === "object") {
          b = b.version;
        }
        return a !== b;
      case "":
      case "=":
      case "==":
        return eq(a, b, loose);
      case "!=":
        return neq(a, b, loose);
      case ">":
        return gt(a, b, loose);
      case ">=":
        return gte(a, b, loose);
      case "<":
        return lt(a, b, loose);
      case "<=":
        return lte(a, b, loose);
      default:
        throw new TypeError(`Invalid operator: ${op}`);
    }
  };
  cmp_1 = cmp;
  return cmp_1;
}
var coerce_1;
var hasRequiredCoerce;
function requireCoerce() {
  if (hasRequiredCoerce) return coerce_1;
  hasRequiredCoerce = 1;
  const SemVer = requireSemver$1();
  const parse = requireParse();
  const { safeRe: re2, t } = requireRe();
  const coerce = (version2, options) => {
    if (version2 instanceof SemVer) {
      return version2;
    }
    if (typeof version2 === "number") {
      version2 = String(version2);
    }
    if (typeof version2 !== "string") {
      return null;
    }
    options = options || {};
    let match = null;
    if (!options.rtl) {
      match = version2.match(options.includePrerelease ? re2[t.COERCEFULL] : re2[t.COERCE]);
    } else {
      const coerceRtlRegex = options.includePrerelease ? re2[t.COERCERTLFULL] : re2[t.COERCERTL];
      let next;
      while ((next = coerceRtlRegex.exec(version2)) && (!match || match.index + match[0].length !== version2.length)) {
        if (!match || next.index + next[0].length !== match.index + match[0].length) {
          match = next;
        }
        coerceRtlRegex.lastIndex = next.index + next[1].length + next[2].length;
      }
      coerceRtlRegex.lastIndex = -1;
    }
    if (match === null) {
      return null;
    }
    const major = match[2];
    const minor = match[3] || "0";
    const patch = match[4] || "0";
    const prerelease = options.includePrerelease && match[5] ? `-${match[5]}` : "";
    const build = options.includePrerelease && match[6] ? `+${match[6]}` : "";
    return parse(`${major}.${minor}.${patch}${prerelease}${build}`, options);
  };
  coerce_1 = coerce;
  return coerce_1;
}
var lrucache;
var hasRequiredLrucache;
function requireLrucache() {
  if (hasRequiredLrucache) return lrucache;
  hasRequiredLrucache = 1;
  class LRUCache {
    constructor() {
      this.max = 1e3;
      this.map = /* @__PURE__ */ new Map();
    }
    get(key) {
      const value = this.map.get(key);
      if (value === void 0) {
        return void 0;
      } else {
        this.map.delete(key);
        this.map.set(key, value);
        return value;
      }
    }
    delete(key) {
      return this.map.delete(key);
    }
    set(key, value) {
      const deleted = this.delete(key);
      if (!deleted && value !== void 0) {
        if (this.map.size >= this.max) {
          const firstKey = this.map.keys().next().value;
          this.delete(firstKey);
        }
        this.map.set(key, value);
      }
      return this;
    }
  }
  lrucache = LRUCache;
  return lrucache;
}
var range;
var hasRequiredRange;
function requireRange() {
  if (hasRequiredRange) return range;
  hasRequiredRange = 1;
  const SPACE_CHARACTERS = /\s+/g;
  class Range {
    constructor(range2, options) {
      options = parseOptions(options);
      if (range2 instanceof Range) {
        if (range2.loose === !!options.loose && range2.includePrerelease === !!options.includePrerelease) {
          return range2;
        } else {
          return new Range(range2.raw, options);
        }
      }
      if (range2 instanceof Comparator) {
        this.raw = range2.value;
        this.set = [[range2]];
        this.formatted = void 0;
        return this;
      }
      this.options = options;
      this.loose = !!options.loose;
      this.includePrerelease = !!options.includePrerelease;
      this.raw = range2.trim().replace(SPACE_CHARACTERS, " ");
      this.set = this.raw.split("||").map((r) => this.parseRange(r.trim())).filter((c) => c.length);
      if (!this.set.length) {
        throw new TypeError(`Invalid SemVer Range: ${this.raw}`);
      }
      if (this.set.length > 1) {
        const first = this.set[0];
        this.set = this.set.filter((c) => !isNullSet(c[0]));
        if (this.set.length === 0) {
          this.set = [first];
        } else if (this.set.length > 1) {
          for (const c of this.set) {
            if (c.length === 1 && isAny(c[0])) {
              this.set = [c];
              break;
            }
          }
        }
      }
      this.formatted = void 0;
    }
    get range() {
      if (this.formatted === void 0) {
        this.formatted = "";
        for (let i = 0; i < this.set.length; i++) {
          if (i > 0) {
            this.formatted += "||";
          }
          const comps = this.set[i];
          for (let k = 0; k < comps.length; k++) {
            if (k > 0) {
              this.formatted += " ";
            }
            this.formatted += comps[k].toString().trim();
          }
        }
      }
      return this.formatted;
    }
    format() {
      return this.range;
    }
    toString() {
      return this.range;
    }
    parseRange(range2) {
      const memoOpts = (this.options.includePrerelease && FLAG_INCLUDE_PRERELEASE) | (this.options.loose && FLAG_LOOSE);
      const memoKey = memoOpts + ":" + range2;
      const cached = cache.get(memoKey);
      if (cached) {
        return cached;
      }
      const loose = this.options.loose;
      const hr = loose ? re2[t.HYPHENRANGELOOSE] : re2[t.HYPHENRANGE];
      range2 = range2.replace(hr, hyphenReplace(this.options.includePrerelease));
      debug("hyphen replace", range2);
      range2 = range2.replace(re2[t.COMPARATORTRIM], comparatorTrimReplace);
      debug("comparator trim", range2);
      range2 = range2.replace(re2[t.TILDETRIM], tildeTrimReplace);
      debug("tilde trim", range2);
      range2 = range2.replace(re2[t.CARETTRIM], caretTrimReplace);
      debug("caret trim", range2);
      let rangeList = range2.split(" ").map((comp) => parseComparator(comp, this.options)).join(" ").split(/\s+/).map((comp) => replaceGTE0(comp, this.options));
      if (loose) {
        rangeList = rangeList.filter((comp) => {
          debug("loose invalid filter", comp, this.options);
          return !!comp.match(re2[t.COMPARATORLOOSE]);
        });
      }
      debug("range list", rangeList);
      const rangeMap = /* @__PURE__ */ new Map();
      const comparators = rangeList.map((comp) => new Comparator(comp, this.options));
      for (const comp of comparators) {
        if (isNullSet(comp)) {
          return [comp];
        }
        rangeMap.set(comp.value, comp);
      }
      if (rangeMap.size > 1 && rangeMap.has("")) {
        rangeMap.delete("");
      }
      const result = [...rangeMap.values()];
      cache.set(memoKey, result);
      return result;
    }
    intersects(range2, options) {
      if (!(range2 instanceof Range)) {
        throw new TypeError("a Range is required");
      }
      return this.set.some((thisComparators) => {
        return isSatisfiable(thisComparators, options) && range2.set.some((rangeComparators) => {
          return isSatisfiable(rangeComparators, options) && thisComparators.every((thisComparator) => {
            return rangeComparators.every((rangeComparator) => {
              return thisComparator.intersects(rangeComparator, options);
            });
          });
        });
      });
    }
    // if ANY of the sets match ALL of its comparators, then pass
    test(version2) {
      if (!version2) {
        return false;
      }
      if (typeof version2 === "string") {
        try {
          version2 = new SemVer(version2, this.options);
        } catch (er) {
          return false;
        }
      }
      for (let i = 0; i < this.set.length; i++) {
        if (testSet(this.set[i], version2, this.options)) {
          return true;
        }
      }
      return false;
    }
  }
  range = Range;
  const LRU = requireLrucache();
  const cache = new LRU();
  const parseOptions = requireParseOptions();
  const Comparator = requireComparator();
  const debug = requireDebug();
  const SemVer = requireSemver$1();
  const {
    safeRe: re2,
    t,
    comparatorTrimReplace,
    tildeTrimReplace,
    caretTrimReplace
  } = requireRe();
  const { FLAG_INCLUDE_PRERELEASE, FLAG_LOOSE } = requireConstants();
  const isNullSet = (c) => c.value === "<0.0.0-0";
  const isAny = (c) => c.value === "";
  const isSatisfiable = (comparators, options) => {
    let result = true;
    const remainingComparators = comparators.slice();
    let testComparator = remainingComparators.pop();
    while (result && remainingComparators.length) {
      result = remainingComparators.every((otherComparator) => {
        return testComparator.intersects(otherComparator, options);
      });
      testComparator = remainingComparators.pop();
    }
    return result;
  };
  const parseComparator = (comp, options) => {
    comp = comp.replace(re2[t.BUILD], "");
    debug("comp", comp, options);
    comp = replaceCarets(comp, options);
    debug("caret", comp);
    comp = replaceTildes(comp, options);
    debug("tildes", comp);
    comp = replaceXRanges(comp, options);
    debug("xrange", comp);
    comp = replaceStars(comp, options);
    debug("stars", comp);
    return comp;
  };
  const isX = (id) => !id || id.toLowerCase() === "x" || id === "*";
  const replaceTildes = (comp, options) => {
    return comp.trim().split(/\s+/).map((c) => replaceTilde(c, options)).join(" ");
  };
  const replaceTilde = (comp, options) => {
    const r = options.loose ? re2[t.TILDELOOSE] : re2[t.TILDE];
    return comp.replace(r, (_, M, m, p, pr) => {
      debug("tilde", comp, _, M, m, p, pr);
      let ret;
      if (isX(M)) {
        ret = "";
      } else if (isX(m)) {
        ret = `>=${M}.0.0 <${+M + 1}.0.0-0`;
      } else if (isX(p)) {
        ret = `>=${M}.${m}.0 <${M}.${+m + 1}.0-0`;
      } else if (pr) {
        debug("replaceTilde pr", pr);
        ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
      } else {
        ret = `>=${M}.${m}.${p} <${M}.${+m + 1}.0-0`;
      }
      debug("tilde return", ret);
      return ret;
    });
  };
  const replaceCarets = (comp, options) => {
    return comp.trim().split(/\s+/).map((c) => replaceCaret(c, options)).join(" ");
  };
  const replaceCaret = (comp, options) => {
    debug("caret", comp, options);
    const r = options.loose ? re2[t.CARETLOOSE] : re2[t.CARET];
    const z = options.includePrerelease ? "-0" : "";
    return comp.replace(r, (_, M, m, p, pr) => {
      debug("caret", comp, _, M, m, p, pr);
      let ret;
      if (isX(M)) {
        ret = "";
      } else if (isX(m)) {
        ret = `>=${M}.0.0${z} <${+M + 1}.0.0-0`;
      } else if (isX(p)) {
        if (M === "0") {
          ret = `>=${M}.${m}.0${z} <${M}.${+m + 1}.0-0`;
        } else {
          ret = `>=${M}.${m}.0${z} <${+M + 1}.0.0-0`;
        }
      } else if (pr) {
        debug("replaceCaret pr", pr);
        if (M === "0") {
          if (m === "0") {
            ret = `>=${M}.${m}.${p}-${pr} <${M}.${m}.${+p + 1}-0`;
          } else {
            ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
          }
        } else {
          ret = `>=${M}.${m}.${p}-${pr} <${+M + 1}.0.0-0`;
        }
      } else {
        debug("no pr");
        if (M === "0") {
          if (m === "0") {
            ret = `>=${M}.${m}.${p}${z} <${M}.${m}.${+p + 1}-0`;
          } else {
            ret = `>=${M}.${m}.${p}${z} <${M}.${+m + 1}.0-0`;
          }
        } else {
          ret = `>=${M}.${m}.${p} <${+M + 1}.0.0-0`;
        }
      }
      debug("caret return", ret);
      return ret;
    });
  };
  const replaceXRanges = (comp, options) => {
    debug("replaceXRanges", comp, options);
    return comp.split(/\s+/).map((c) => replaceXRange(c, options)).join(" ");
  };
  const replaceXRange = (comp, options) => {
    comp = comp.trim();
    const r = options.loose ? re2[t.XRANGELOOSE] : re2[t.XRANGE];
    return comp.replace(r, (ret, gtlt, M, m, p, pr) => {
      debug("xRange", comp, ret, gtlt, M, m, p, pr);
      const xM = isX(M);
      const xm = xM || isX(m);
      const xp = xm || isX(p);
      const anyX = xp;
      if (gtlt === "=" && anyX) {
        gtlt = "";
      }
      pr = options.includePrerelease ? "-0" : "";
      if (xM) {
        if (gtlt === ">" || gtlt === "<") {
          ret = "<0.0.0-0";
        } else {
          ret = "*";
        }
      } else if (gtlt && anyX) {
        if (xm) {
          m = 0;
        }
        p = 0;
        if (gtlt === ">") {
          gtlt = ">=";
          if (xm) {
            M = +M + 1;
            m = 0;
            p = 0;
          } else {
            m = +m + 1;
            p = 0;
          }
        } else if (gtlt === "<=") {
          gtlt = "<";
          if (xm) {
            M = +M + 1;
          } else {
            m = +m + 1;
          }
        }
        if (gtlt === "<") {
          pr = "-0";
        }
        ret = `${gtlt + M}.${m}.${p}${pr}`;
      } else if (xm) {
        ret = `>=${M}.0.0${pr} <${+M + 1}.0.0-0`;
      } else if (xp) {
        ret = `>=${M}.${m}.0${pr} <${M}.${+m + 1}.0-0`;
      }
      debug("xRange return", ret);
      return ret;
    });
  };
  const replaceStars = (comp, options) => {
    debug("replaceStars", comp, options);
    return comp.trim().replace(re2[t.STAR], "");
  };
  const replaceGTE0 = (comp, options) => {
    debug("replaceGTE0", comp, options);
    return comp.trim().replace(re2[options.includePrerelease ? t.GTE0PRE : t.GTE0], "");
  };
  const hyphenReplace = (incPr) => ($0, from, fM, fm, fp, fpr, fb, to, tM, tm, tp, tpr) => {
    if (isX(fM)) {
      from = "";
    } else if (isX(fm)) {
      from = `>=${fM}.0.0${incPr ? "-0" : ""}`;
    } else if (isX(fp)) {
      from = `>=${fM}.${fm}.0${incPr ? "-0" : ""}`;
    } else if (fpr) {
      from = `>=${from}`;
    } else {
      from = `>=${from}${incPr ? "-0" : ""}`;
    }
    if (isX(tM)) {
      to = "";
    } else if (isX(tm)) {
      to = `<${+tM + 1}.0.0-0`;
    } else if (isX(tp)) {
      to = `<${tM}.${+tm + 1}.0-0`;
    } else if (tpr) {
      to = `<=${tM}.${tm}.${tp}-${tpr}`;
    } else if (incPr) {
      to = `<${tM}.${tm}.${+tp + 1}-0`;
    } else {
      to = `<=${to}`;
    }
    return `${from} ${to}`.trim();
  };
  const testSet = (set, version2, options) => {
    for (let i = 0; i < set.length; i++) {
      if (!set[i].test(version2)) {
        return false;
      }
    }
    if (version2.prerelease.length && !options.includePrerelease) {
      for (let i = 0; i < set.length; i++) {
        debug(set[i].semver);
        if (set[i].semver === Comparator.ANY) {
          continue;
        }
        if (set[i].semver.prerelease.length > 0) {
          const allowed = set[i].semver;
          if (allowed.major === version2.major && allowed.minor === version2.minor && allowed.patch === version2.patch) {
            return true;
          }
        }
      }
      return false;
    }
    return true;
  };
  return range;
}
var comparator;
var hasRequiredComparator;
function requireComparator() {
  if (hasRequiredComparator) return comparator;
  hasRequiredComparator = 1;
  const ANY = /* @__PURE__ */ Symbol("SemVer ANY");
  class Comparator {
    static get ANY() {
      return ANY;
    }
    constructor(comp, options) {
      options = parseOptions(options);
      if (comp instanceof Comparator) {
        if (comp.loose === !!options.loose) {
          return comp;
        } else {
          comp = comp.value;
        }
      }
      comp = comp.trim().split(/\s+/).join(" ");
      debug("comparator", comp, options);
      this.options = options;
      this.loose = !!options.loose;
      this.parse(comp);
      if (this.semver === ANY) {
        this.value = "";
      } else {
        this.value = this.operator + this.semver.version;
      }
      debug("comp", this);
    }
    parse(comp) {
      const r = this.options.loose ? re2[t.COMPARATORLOOSE] : re2[t.COMPARATOR];
      const m = comp.match(r);
      if (!m) {
        throw new TypeError(`Invalid comparator: ${comp}`);
      }
      this.operator = m[1] !== void 0 ? m[1] : "";
      if (this.operator === "=") {
        this.operator = "";
      }
      if (!m[2]) {
        this.semver = ANY;
      } else {
        this.semver = new SemVer(m[2], this.options.loose);
      }
    }
    toString() {
      return this.value;
    }
    test(version2) {
      debug("Comparator.test", version2, this.options.loose);
      if (this.semver === ANY || version2 === ANY) {
        return true;
      }
      if (typeof version2 === "string") {
        try {
          version2 = new SemVer(version2, this.options);
        } catch (er) {
          return false;
        }
      }
      return cmp(version2, this.operator, this.semver, this.options);
    }
    intersects(comp, options) {
      if (!(comp instanceof Comparator)) {
        throw new TypeError("a Comparator is required");
      }
      if (this.operator === "") {
        if (this.value === "") {
          return true;
        }
        return new Range(comp.value, options).test(this.value);
      } else if (comp.operator === "") {
        if (comp.value === "") {
          return true;
        }
        return new Range(this.value, options).test(comp.semver);
      }
      options = parseOptions(options);
      if (options.includePrerelease && (this.value === "<0.0.0-0" || comp.value === "<0.0.0-0")) {
        return false;
      }
      if (!options.includePrerelease && (this.value.startsWith("<0.0.0") || comp.value.startsWith("<0.0.0"))) {
        return false;
      }
      if (this.operator.startsWith(">") && comp.operator.startsWith(">")) {
        return true;
      }
      if (this.operator.startsWith("<") && comp.operator.startsWith("<")) {
        return true;
      }
      if (this.semver.version === comp.semver.version && this.operator.includes("=") && comp.operator.includes("=")) {
        return true;
      }
      if (cmp(this.semver, "<", comp.semver, options) && this.operator.startsWith(">") && comp.operator.startsWith("<")) {
        return true;
      }
      if (cmp(this.semver, ">", comp.semver, options) && this.operator.startsWith("<") && comp.operator.startsWith(">")) {
        return true;
      }
      return false;
    }
  }
  comparator = Comparator;
  const parseOptions = requireParseOptions();
  const { safeRe: re2, t } = requireRe();
  const cmp = requireCmp();
  const debug = requireDebug();
  const SemVer = requireSemver$1();
  const Range = requireRange();
  return comparator;
}
var satisfies_1;
var hasRequiredSatisfies;
function requireSatisfies() {
  if (hasRequiredSatisfies) return satisfies_1;
  hasRequiredSatisfies = 1;
  const Range = requireRange();
  const satisfies = (version2, range2, options) => {
    try {
      range2 = new Range(range2, options);
    } catch (er) {
      return false;
    }
    return range2.test(version2);
  };
  satisfies_1 = satisfies;
  return satisfies_1;
}
var toComparators_1;
var hasRequiredToComparators;
function requireToComparators() {
  if (hasRequiredToComparators) return toComparators_1;
  hasRequiredToComparators = 1;
  const Range = requireRange();
  const toComparators = (range2, options) => new Range(range2, options).set.map((comp) => comp.map((c) => c.value).join(" ").trim().split(" "));
  toComparators_1 = toComparators;
  return toComparators_1;
}
var maxSatisfying_1;
var hasRequiredMaxSatisfying;
function requireMaxSatisfying() {
  if (hasRequiredMaxSatisfying) return maxSatisfying_1;
  hasRequiredMaxSatisfying = 1;
  const SemVer = requireSemver$1();
  const Range = requireRange();
  const maxSatisfying = (versions, range2, options) => {
    let max = null;
    let maxSV = null;
    let rangeObj = null;
    try {
      rangeObj = new Range(range2, options);
    } catch (er) {
      return null;
    }
    versions.forEach((v) => {
      if (rangeObj.test(v)) {
        if (!max || maxSV.compare(v) === -1) {
          max = v;
          maxSV = new SemVer(max, options);
        }
      }
    });
    return max;
  };
  maxSatisfying_1 = maxSatisfying;
  return maxSatisfying_1;
}
var minSatisfying_1;
var hasRequiredMinSatisfying;
function requireMinSatisfying() {
  if (hasRequiredMinSatisfying) return minSatisfying_1;
  hasRequiredMinSatisfying = 1;
  const SemVer = requireSemver$1();
  const Range = requireRange();
  const minSatisfying = (versions, range2, options) => {
    let min = null;
    let minSV = null;
    let rangeObj = null;
    try {
      rangeObj = new Range(range2, options);
    } catch (er) {
      return null;
    }
    versions.forEach((v) => {
      if (rangeObj.test(v)) {
        if (!min || minSV.compare(v) === 1) {
          min = v;
          minSV = new SemVer(min, options);
        }
      }
    });
    return min;
  };
  minSatisfying_1 = minSatisfying;
  return minSatisfying_1;
}
var minVersion_1;
var hasRequiredMinVersion;
function requireMinVersion() {
  if (hasRequiredMinVersion) return minVersion_1;
  hasRequiredMinVersion = 1;
  const SemVer = requireSemver$1();
  const Range = requireRange();
  const gt = requireGt();
  const minVersion = (range2, loose) => {
    range2 = new Range(range2, loose);
    let minver = new SemVer("0.0.0");
    if (range2.test(minver)) {
      return minver;
    }
    minver = new SemVer("0.0.0-0");
    if (range2.test(minver)) {
      return minver;
    }
    minver = null;
    for (let i = 0; i < range2.set.length; ++i) {
      const comparators = range2.set[i];
      let setMin = null;
      comparators.forEach((comparator2) => {
        const compver = new SemVer(comparator2.semver.version);
        switch (comparator2.operator) {
          case ">":
            if (compver.prerelease.length === 0) {
              compver.patch++;
            } else {
              compver.prerelease.push(0);
            }
            compver.raw = compver.format();
          /* fallthrough */
          case "":
          case ">=":
            if (!setMin || gt(compver, setMin)) {
              setMin = compver;
            }
            break;
          case "<":
          case "<=":
            break;
          /* istanbul ignore next */
          default:
            throw new Error(`Unexpected operation: ${comparator2.operator}`);
        }
      });
      if (setMin && (!minver || gt(minver, setMin))) {
        minver = setMin;
      }
    }
    if (minver && range2.test(minver)) {
      return minver;
    }
    return null;
  };
  minVersion_1 = minVersion;
  return minVersion_1;
}
var valid;
var hasRequiredValid;
function requireValid() {
  if (hasRequiredValid) return valid;
  hasRequiredValid = 1;
  const Range = requireRange();
  const validRange = (range2, options) => {
    try {
      return new Range(range2, options).range || "*";
    } catch (er) {
      return null;
    }
  };
  valid = validRange;
  return valid;
}
var outside_1;
var hasRequiredOutside;
function requireOutside() {
  if (hasRequiredOutside) return outside_1;
  hasRequiredOutside = 1;
  const SemVer = requireSemver$1();
  const Comparator = requireComparator();
  const { ANY } = Comparator;
  const Range = requireRange();
  const satisfies = requireSatisfies();
  const gt = requireGt();
  const lt = requireLt();
  const lte = requireLte();
  const gte = requireGte();
  const outside = (version2, range2, hilo, options) => {
    version2 = new SemVer(version2, options);
    range2 = new Range(range2, options);
    let gtfn, ltefn, ltfn, comp, ecomp;
    switch (hilo) {
      case ">":
        gtfn = gt;
        ltefn = lte;
        ltfn = lt;
        comp = ">";
        ecomp = ">=";
        break;
      case "<":
        gtfn = lt;
        ltefn = gte;
        ltfn = gt;
        comp = "<";
        ecomp = "<=";
        break;
      default:
        throw new TypeError('Must provide a hilo val of "<" or ">"');
    }
    if (satisfies(version2, range2, options)) {
      return false;
    }
    for (let i = 0; i < range2.set.length; ++i) {
      const comparators = range2.set[i];
      let high = null;
      let low = null;
      comparators.forEach((comparator2) => {
        if (comparator2.semver === ANY) {
          comparator2 = new Comparator(">=0.0.0");
        }
        high = high || comparator2;
        low = low || comparator2;
        if (gtfn(comparator2.semver, high.semver, options)) {
          high = comparator2;
        } else if (ltfn(comparator2.semver, low.semver, options)) {
          low = comparator2;
        }
      });
      if (high.operator === comp || high.operator === ecomp) {
        return false;
      }
      if ((!low.operator || low.operator === comp) && ltefn(version2, low.semver)) {
        return false;
      } else if (low.operator === ecomp && ltfn(version2, low.semver)) {
        return false;
      }
    }
    return true;
  };
  outside_1 = outside;
  return outside_1;
}
var gtr_1;
var hasRequiredGtr;
function requireGtr() {
  if (hasRequiredGtr) return gtr_1;
  hasRequiredGtr = 1;
  const outside = requireOutside();
  const gtr = (version2, range2, options) => outside(version2, range2, ">", options);
  gtr_1 = gtr;
  return gtr_1;
}
var ltr_1;
var hasRequiredLtr;
function requireLtr() {
  if (hasRequiredLtr) return ltr_1;
  hasRequiredLtr = 1;
  const outside = requireOutside();
  const ltr = (version2, range2, options) => outside(version2, range2, "<", options);
  ltr_1 = ltr;
  return ltr_1;
}
var intersects_1;
var hasRequiredIntersects;
function requireIntersects() {
  if (hasRequiredIntersects) return intersects_1;
  hasRequiredIntersects = 1;
  const Range = requireRange();
  const intersects = (r1, r2, options) => {
    r1 = new Range(r1, options);
    r2 = new Range(r2, options);
    return r1.intersects(r2, options);
  };
  intersects_1 = intersects;
  return intersects_1;
}
var simplify;
var hasRequiredSimplify;
function requireSimplify() {
  if (hasRequiredSimplify) return simplify;
  hasRequiredSimplify = 1;
  const satisfies = requireSatisfies();
  const compare = requireCompare();
  simplify = (versions, range2, options) => {
    const set = [];
    let first = null;
    let prev = null;
    const v = versions.sort((a, b) => compare(a, b, options));
    for (const version2 of v) {
      const included = satisfies(version2, range2, options);
      if (included) {
        prev = version2;
        if (!first) {
          first = version2;
        }
      } else {
        if (prev) {
          set.push([first, prev]);
        }
        prev = null;
        first = null;
      }
    }
    if (first) {
      set.push([first, null]);
    }
    const ranges = [];
    for (const [min, max] of set) {
      if (min === max) {
        ranges.push(min);
      } else if (!max && min === v[0]) {
        ranges.push("*");
      } else if (!max) {
        ranges.push(`>=${min}`);
      } else if (min === v[0]) {
        ranges.push(`<=${max}`);
      } else {
        ranges.push(`${min} - ${max}`);
      }
    }
    const simplified = ranges.join(" || ");
    const original = typeof range2.raw === "string" ? range2.raw : String(range2);
    return simplified.length < original.length ? simplified : range2;
  };
  return simplify;
}
var subset_1;
var hasRequiredSubset;
function requireSubset() {
  if (hasRequiredSubset) return subset_1;
  hasRequiredSubset = 1;
  const Range = requireRange();
  const Comparator = requireComparator();
  const { ANY } = Comparator;
  const satisfies = requireSatisfies();
  const compare = requireCompare();
  const subset = (sub, dom, options = {}) => {
    if (sub === dom) {
      return true;
    }
    sub = new Range(sub, options);
    dom = new Range(dom, options);
    let sawNonNull = false;
    OUTER: for (const simpleSub of sub.set) {
      for (const simpleDom of dom.set) {
        const isSub = simpleSubset(simpleSub, simpleDom, options);
        sawNonNull = sawNonNull || isSub !== null;
        if (isSub) {
          continue OUTER;
        }
      }
      if (sawNonNull) {
        return false;
      }
    }
    return true;
  };
  const minimumVersionWithPreRelease = [new Comparator(">=0.0.0-0")];
  const minimumVersion = [new Comparator(">=0.0.0")];
  const simpleSubset = (sub, dom, options) => {
    if (sub === dom) {
      return true;
    }
    if (sub.length === 1 && sub[0].semver === ANY) {
      if (dom.length === 1 && dom[0].semver === ANY) {
        return true;
      } else if (options.includePrerelease) {
        sub = minimumVersionWithPreRelease;
      } else {
        sub = minimumVersion;
      }
    }
    if (dom.length === 1 && dom[0].semver === ANY) {
      if (options.includePrerelease) {
        return true;
      } else {
        dom = minimumVersion;
      }
    }
    const eqSet = /* @__PURE__ */ new Set();
    let gt, lt;
    for (const c of sub) {
      if (c.operator === ">" || c.operator === ">=") {
        gt = higherGT(gt, c, options);
      } else if (c.operator === "<" || c.operator === "<=") {
        lt = lowerLT(lt, c, options);
      } else {
        eqSet.add(c.semver);
      }
    }
    if (eqSet.size > 1) {
      return null;
    }
    let gtltComp;
    if (gt && lt) {
      gtltComp = compare(gt.semver, lt.semver, options);
      if (gtltComp > 0) {
        return null;
      } else if (gtltComp === 0 && (gt.operator !== ">=" || lt.operator !== "<=")) {
        return null;
      }
    }
    for (const eq of eqSet) {
      if (gt && !satisfies(eq, String(gt), options)) {
        return null;
      }
      if (lt && !satisfies(eq, String(lt), options)) {
        return null;
      }
      for (const c of dom) {
        if (!satisfies(eq, String(c), options)) {
          return false;
        }
      }
      return true;
    }
    let higher, lower;
    let hasDomLT, hasDomGT;
    let needDomLTPre = lt && !options.includePrerelease && lt.semver.prerelease.length ? lt.semver : false;
    let needDomGTPre = gt && !options.includePrerelease && gt.semver.prerelease.length ? gt.semver : false;
    if (needDomLTPre && needDomLTPre.prerelease.length === 1 && lt.operator === "<" && needDomLTPre.prerelease[0] === 0) {
      needDomLTPre = false;
    }
    for (const c of dom) {
      hasDomGT = hasDomGT || c.operator === ">" || c.operator === ">=";
      hasDomLT = hasDomLT || c.operator === "<" || c.operator === "<=";
      if (gt) {
        if (needDomGTPre) {
          if (c.semver.prerelease && c.semver.prerelease.length && c.semver.major === needDomGTPre.major && c.semver.minor === needDomGTPre.minor && c.semver.patch === needDomGTPre.patch) {
            needDomGTPre = false;
          }
        }
        if (c.operator === ">" || c.operator === ">=") {
          higher = higherGT(gt, c, options);
          if (higher === c && higher !== gt) {
            return false;
          }
        } else if (gt.operator === ">=" && !satisfies(gt.semver, String(c), options)) {
          return false;
        }
      }
      if (lt) {
        if (needDomLTPre) {
          if (c.semver.prerelease && c.semver.prerelease.length && c.semver.major === needDomLTPre.major && c.semver.minor === needDomLTPre.minor && c.semver.patch === needDomLTPre.patch) {
            needDomLTPre = false;
          }
        }
        if (c.operator === "<" || c.operator === "<=") {
          lower = lowerLT(lt, c, options);
          if (lower === c && lower !== lt) {
            return false;
          }
        } else if (lt.operator === "<=" && !satisfies(lt.semver, String(c), options)) {
          return false;
        }
      }
      if (!c.operator && (lt || gt) && gtltComp !== 0) {
        return false;
      }
    }
    if (gt && hasDomLT && !lt && gtltComp !== 0) {
      return false;
    }
    if (lt && hasDomGT && !gt && gtltComp !== 0) {
      return false;
    }
    if (needDomGTPre || needDomLTPre) {
      return false;
    }
    return true;
  };
  const higherGT = (a, b, options) => {
    if (!a) {
      return b;
    }
    const comp = compare(a.semver, b.semver, options);
    return comp > 0 ? a : comp < 0 ? b : b.operator === ">" && a.operator === ">=" ? b : a;
  };
  const lowerLT = (a, b, options) => {
    if (!a) {
      return b;
    }
    const comp = compare(a.semver, b.semver, options);
    return comp < 0 ? a : comp > 0 ? b : b.operator === "<" && a.operator === "<=" ? b : a;
  };
  subset_1 = subset;
  return subset_1;
}
var semver;
var hasRequiredSemver;
function requireSemver() {
  if (hasRequiredSemver) return semver;
  hasRequiredSemver = 1;
  const internalRe = requireRe();
  const constants2 = requireConstants();
  const SemVer = requireSemver$1();
  const identifiers2 = requireIdentifiers();
  const parse = requireParse();
  const valid2 = requireValid$1();
  const clean = requireClean();
  const inc = requireInc();
  const diff = requireDiff();
  const major = requireMajor();
  const minor = requireMinor();
  const patch = requirePatch();
  const prerelease = requirePrerelease();
  const compare = requireCompare();
  const rcompare = requireRcompare();
  const compareLoose = requireCompareLoose();
  const compareBuild = requireCompareBuild();
  const sort = requireSort();
  const rsort = requireRsort();
  const gt = requireGt();
  const lt = requireLt();
  const eq = requireEq();
  const neq = requireNeq();
  const gte = requireGte();
  const lte = requireLte();
  const cmp = requireCmp();
  const coerce = requireCoerce();
  const Comparator = requireComparator();
  const Range = requireRange();
  const satisfies = requireSatisfies();
  const toComparators = requireToComparators();
  const maxSatisfying = requireMaxSatisfying();
  const minSatisfying = requireMinSatisfying();
  const minVersion = requireMinVersion();
  const validRange = requireValid();
  const outside = requireOutside();
  const gtr = requireGtr();
  const ltr = requireLtr();
  const intersects = requireIntersects();
  const simplifyRange = requireSimplify();
  const subset = requireSubset();
  semver = {
    parse,
    valid: valid2,
    clean,
    inc,
    diff,
    major,
    minor,
    patch,
    prerelease,
    compare,
    rcompare,
    compareLoose,
    compareBuild,
    sort,
    rsort,
    gt,
    lt,
    eq,
    neq,
    gte,
    lte,
    cmp,
    coerce,
    Comparator,
    Range,
    satisfies,
    toComparators,
    maxSatisfying,
    minSatisfying,
    minVersion,
    validRange,
    outside,
    gtr,
    ltr,
    intersects,
    simplifyRange,
    subset,
    SemVer,
    re: internalRe.re,
    src: internalRe.src,
    tokens: internalRe.t,
    SEMVER_SPEC_VERSION: constants2.SEMVER_SPEC_VERSION,
    RELEASE_TYPES: constants2.RELEASE_TYPES,
    compareIdentifiers: identifiers2.compareIdentifiers,
    rcompareIdentifiers: identifiers2.rcompareIdentifiers
  };
  return semver;
}
var asymmetricKeyDetailsSupported;
var hasRequiredAsymmetricKeyDetailsSupported;
function requireAsymmetricKeyDetailsSupported() {
  if (hasRequiredAsymmetricKeyDetailsSupported) return asymmetricKeyDetailsSupported;
  hasRequiredAsymmetricKeyDetailsSupported = 1;
  const semver2 = requireSemver();
  asymmetricKeyDetailsSupported = semver2.satisfies(process.version, ">=15.7.0");
  return asymmetricKeyDetailsSupported;
}
var rsaPssKeyDetailsSupported;
var hasRequiredRsaPssKeyDetailsSupported;
function requireRsaPssKeyDetailsSupported() {
  if (hasRequiredRsaPssKeyDetailsSupported) return rsaPssKeyDetailsSupported;
  hasRequiredRsaPssKeyDetailsSupported = 1;
  const semver2 = requireSemver();
  rsaPssKeyDetailsSupported = semver2.satisfies(process.version, ">=16.9.0");
  return rsaPssKeyDetailsSupported;
}
var validateAsymmetricKey;
var hasRequiredValidateAsymmetricKey;
function requireValidateAsymmetricKey() {
  if (hasRequiredValidateAsymmetricKey) return validateAsymmetricKey;
  hasRequiredValidateAsymmetricKey = 1;
  const ASYMMETRIC_KEY_DETAILS_SUPPORTED = requireAsymmetricKeyDetailsSupported();
  const RSA_PSS_KEY_DETAILS_SUPPORTED = requireRsaPssKeyDetailsSupported();
  const allowedAlgorithmsForKeys = {
    "ec": ["ES256", "ES384", "ES512"],
    "rsa": ["RS256", "PS256", "RS384", "PS384", "RS512", "PS512"],
    "rsa-pss": ["PS256", "PS384", "PS512"]
  };
  const allowedCurves = {
    ES256: "prime256v1",
    ES384: "secp384r1",
    ES512: "secp521r1"
  };
  validateAsymmetricKey = function(algorithm, key) {
    if (!algorithm || !key) return;
    const keyType = key.asymmetricKeyType;
    if (!keyType) return;
    const allowedAlgorithms = allowedAlgorithmsForKeys[keyType];
    if (!allowedAlgorithms) {
      throw new Error(`Unknown key type "${keyType}".`);
    }
    if (!allowedAlgorithms.includes(algorithm)) {
      throw new Error(`"alg" parameter for "${keyType}" key type must be one of: ${allowedAlgorithms.join(", ")}.`);
    }
    if (ASYMMETRIC_KEY_DETAILS_SUPPORTED) {
      switch (keyType) {
        case "ec":
          const keyCurve = key.asymmetricKeyDetails.namedCurve;
          const allowedCurve = allowedCurves[algorithm];
          if (keyCurve !== allowedCurve) {
            throw new Error(`"alg" parameter "${algorithm}" requires curve "${allowedCurve}".`);
          }
          break;
        case "rsa-pss":
          if (RSA_PSS_KEY_DETAILS_SUPPORTED) {
            const length = parseInt(algorithm.slice(-3), 10);
            const { hashAlgorithm, mgf1HashAlgorithm, saltLength } = key.asymmetricKeyDetails;
            if (hashAlgorithm !== `sha${length}` || mgf1HashAlgorithm !== hashAlgorithm) {
              throw new Error(`Invalid key for this operation, its RSA-PSS parameters do not meet the requirements of "alg" ${algorithm}.`);
            }
            if (saltLength !== void 0 && saltLength > length >> 3) {
              throw new Error(`Invalid key for this operation, its RSA-PSS parameter saltLength does not meet the requirements of "alg" ${algorithm}.`);
            }
          }
          break;
      }
    }
  };
  return validateAsymmetricKey;
}
var psSupported;
var hasRequiredPsSupported;
function requirePsSupported() {
  if (hasRequiredPsSupported) return psSupported;
  hasRequiredPsSupported = 1;
  var semver2 = requireSemver();
  psSupported = semver2.satisfies(process.version, "^6.12.0 || >=8.0.0");
  return psSupported;
}
var verify;
var hasRequiredVerify;
function requireVerify() {
  if (hasRequiredVerify) return verify;
  hasRequiredVerify = 1;
  const JsonWebTokenError = requireJsonWebTokenError();
  const NotBeforeError = requireNotBeforeError();
  const TokenExpiredError = requireTokenExpiredError();
  const decode2 = requireDecode();
  const timespan2 = requireTimespan();
  const validateAsymmetricKey2 = requireValidateAsymmetricKey();
  const PS_SUPPORTED = requirePsSupported();
  const jws2 = requireJws();
  const { KeyObject, createSecretKey, createPublicKey } = crypto;
  const PUB_KEY_ALGS = ["RS256", "RS384", "RS512"];
  const EC_KEY_ALGS = ["ES256", "ES384", "ES512"];
  const RSA_KEY_ALGS = ["RS256", "RS384", "RS512"];
  const HS_ALGS = ["HS256", "HS384", "HS512"];
  if (PS_SUPPORTED) {
    PUB_KEY_ALGS.splice(PUB_KEY_ALGS.length, 0, "PS256", "PS384", "PS512");
    RSA_KEY_ALGS.splice(RSA_KEY_ALGS.length, 0, "PS256", "PS384", "PS512");
  }
  verify = function(jwtString, secretOrPublicKey, options, callback) {
    if (typeof options === "function" && !callback) {
      callback = options;
      options = {};
    }
    if (!options) {
      options = {};
    }
    options = Object.assign({}, options);
    let done;
    if (callback) {
      done = callback;
    } else {
      done = function(err, data) {
        if (err) throw err;
        return data;
      };
    }
    if (options.clockTimestamp && typeof options.clockTimestamp !== "number") {
      return done(new JsonWebTokenError("clockTimestamp must be a number"));
    }
    if (options.nonce !== void 0 && (typeof options.nonce !== "string" || options.nonce.trim() === "")) {
      return done(new JsonWebTokenError("nonce must be a non-empty string"));
    }
    if (options.allowInvalidAsymmetricKeyTypes !== void 0 && typeof options.allowInvalidAsymmetricKeyTypes !== "boolean") {
      return done(new JsonWebTokenError("allowInvalidAsymmetricKeyTypes must be a boolean"));
    }
    const clockTimestamp = options.clockTimestamp || Math.floor(Date.now() / 1e3);
    if (!jwtString) {
      return done(new JsonWebTokenError("jwt must be provided"));
    }
    if (typeof jwtString !== "string") {
      return done(new JsonWebTokenError("jwt must be a string"));
    }
    const parts = jwtString.split(".");
    if (parts.length !== 3) {
      return done(new JsonWebTokenError("jwt malformed"));
    }
    let decodedToken;
    try {
      decodedToken = decode2(jwtString, { complete: true });
    } catch (err) {
      return done(err);
    }
    if (!decodedToken) {
      return done(new JsonWebTokenError("invalid token"));
    }
    const header = decodedToken.header;
    let getSecret;
    if (typeof secretOrPublicKey === "function") {
      if (!callback) {
        return done(new JsonWebTokenError("verify must be called asynchronous if secret or public key is provided as a callback"));
      }
      getSecret = secretOrPublicKey;
    } else {
      getSecret = function(header2, secretCallback) {
        return secretCallback(null, secretOrPublicKey);
      };
    }
    return getSecret(header, function(err, secretOrPublicKey2) {
      if (err) {
        return done(new JsonWebTokenError("error in secret or public key callback: " + err.message));
      }
      const hasSignature = parts[2].trim() !== "";
      if (!hasSignature && secretOrPublicKey2) {
        return done(new JsonWebTokenError("jwt signature is required"));
      }
      if (hasSignature && !secretOrPublicKey2) {
        return done(new JsonWebTokenError("secret or public key must be provided"));
      }
      if (!hasSignature && !options.algorithms) {
        return done(new JsonWebTokenError('please specify "none" in "algorithms" to verify unsigned tokens'));
      }
      if (secretOrPublicKey2 != null && !(secretOrPublicKey2 instanceof KeyObject)) {
        try {
          secretOrPublicKey2 = createPublicKey(secretOrPublicKey2);
        } catch (_) {
          try {
            secretOrPublicKey2 = createSecretKey(typeof secretOrPublicKey2 === "string" ? Buffer.from(secretOrPublicKey2) : secretOrPublicKey2);
          } catch (_2) {
            return done(new JsonWebTokenError("secretOrPublicKey is not valid key material"));
          }
        }
      }
      if (!options.algorithms) {
        if (secretOrPublicKey2.type === "secret") {
          options.algorithms = HS_ALGS;
        } else if (["rsa", "rsa-pss"].includes(secretOrPublicKey2.asymmetricKeyType)) {
          options.algorithms = RSA_KEY_ALGS;
        } else if (secretOrPublicKey2.asymmetricKeyType === "ec") {
          options.algorithms = EC_KEY_ALGS;
        } else {
          options.algorithms = PUB_KEY_ALGS;
        }
      }
      if (options.algorithms.indexOf(decodedToken.header.alg) === -1) {
        return done(new JsonWebTokenError("invalid algorithm"));
      }
      if (header.alg.startsWith("HS") && secretOrPublicKey2.type !== "secret") {
        return done(new JsonWebTokenError(`secretOrPublicKey must be a symmetric key when using ${header.alg}`));
      } else if (/^(?:RS|PS|ES)/.test(header.alg) && secretOrPublicKey2.type !== "public") {
        return done(new JsonWebTokenError(`secretOrPublicKey must be an asymmetric key when using ${header.alg}`));
      }
      if (!options.allowInvalidAsymmetricKeyTypes) {
        try {
          validateAsymmetricKey2(header.alg, secretOrPublicKey2);
        } catch (e) {
          return done(e);
        }
      }
      let valid2;
      try {
        valid2 = jws2.verify(jwtString, decodedToken.header.alg, secretOrPublicKey2);
      } catch (e) {
        return done(e);
      }
      if (!valid2) {
        return done(new JsonWebTokenError("invalid signature"));
      }
      const payload = decodedToken.payload;
      if (typeof payload.nbf !== "undefined" && !options.ignoreNotBefore) {
        if (typeof payload.nbf !== "number") {
          return done(new JsonWebTokenError("invalid nbf value"));
        }
        if (payload.nbf > clockTimestamp + (options.clockTolerance || 0)) {
          return done(new NotBeforeError("jwt not active", new Date(payload.nbf * 1e3)));
        }
      }
      if (typeof payload.exp !== "undefined" && !options.ignoreExpiration) {
        if (typeof payload.exp !== "number") {
          return done(new JsonWebTokenError("invalid exp value"));
        }
        if (clockTimestamp >= payload.exp + (options.clockTolerance || 0)) {
          return done(new TokenExpiredError("jwt expired", new Date(payload.exp * 1e3)));
        }
      }
      if (options.audience) {
        const audiences = Array.isArray(options.audience) ? options.audience : [options.audience];
        const target = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
        const match = target.some(function(targetAudience) {
          return audiences.some(function(audience) {
            return audience instanceof RegExp ? audience.test(targetAudience) : audience === targetAudience;
          });
        });
        if (!match) {
          return done(new JsonWebTokenError("jwt audience invalid. expected: " + audiences.join(" or ")));
        }
      }
      if (options.issuer) {
        const invalid_issuer = typeof options.issuer === "string" && payload.iss !== options.issuer || Array.isArray(options.issuer) && options.issuer.indexOf(payload.iss) === -1;
        if (invalid_issuer) {
          return done(new JsonWebTokenError("jwt issuer invalid. expected: " + options.issuer));
        }
      }
      if (options.subject) {
        if (payload.sub !== options.subject) {
          return done(new JsonWebTokenError("jwt subject invalid. expected: " + options.subject));
        }
      }
      if (options.jwtid) {
        if (payload.jti !== options.jwtid) {
          return done(new JsonWebTokenError("jwt jwtid invalid. expected: " + options.jwtid));
        }
      }
      if (options.nonce) {
        if (payload.nonce !== options.nonce) {
          return done(new JsonWebTokenError("jwt nonce invalid. expected: " + options.nonce));
        }
      }
      if (options.maxAge) {
        if (typeof payload.iat !== "number") {
          return done(new JsonWebTokenError("iat required when maxAge is specified"));
        }
        const maxAgeTimestamp = timespan2(options.maxAge, payload.iat);
        if (typeof maxAgeTimestamp === "undefined") {
          return done(new JsonWebTokenError('"maxAge" should be a number of seconds or string representing a timespan eg: "1d", "20h", 60'));
        }
        if (clockTimestamp >= maxAgeTimestamp + (options.clockTolerance || 0)) {
          return done(new TokenExpiredError("maxAge exceeded", new Date(maxAgeTimestamp * 1e3)));
        }
      }
      if (options.complete === true) {
        const signature = decodedToken.signature;
        return done(null, {
          header,
          payload,
          signature
        });
      }
      return done(null, payload);
    });
  };
  return verify;
}
var lodash_includes;
var hasRequiredLodash_includes;
function requireLodash_includes() {
  if (hasRequiredLodash_includes) return lodash_includes;
  hasRequiredLodash_includes = 1;
  var INFINITY = 1 / 0, MAX_SAFE_INTEGER = 9007199254740991, MAX_INTEGER = 17976931348623157e292, NAN = 0 / 0;
  var argsTag = "[object Arguments]", funcTag = "[object Function]", genTag = "[object GeneratorFunction]", stringTag = "[object String]", symbolTag = "[object Symbol]";
  var reTrim = /^\s+|\s+$/g;
  var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;
  var reIsBinary = /^0b[01]+$/i;
  var reIsOctal = /^0o[0-7]+$/i;
  var reIsUint = /^(?:0|[1-9]\d*)$/;
  var freeParseInt = parseInt;
  function arrayMap(array, iteratee) {
    var index = -1, length = array ? array.length : 0, result = Array(length);
    while (++index < length) {
      result[index] = iteratee(array[index], index, array);
    }
    return result;
  }
  function baseFindIndex(array, predicate, fromIndex, fromRight) {
    var length = array.length, index = fromIndex + -1;
    while (++index < length) {
      if (predicate(array[index], index, array)) {
        return index;
      }
    }
    return -1;
  }
  function baseIndexOf(array, value, fromIndex) {
    if (value !== value) {
      return baseFindIndex(array, baseIsNaN, fromIndex);
    }
    var index = fromIndex - 1, length = array.length;
    while (++index < length) {
      if (array[index] === value) {
        return index;
      }
    }
    return -1;
  }
  function baseIsNaN(value) {
    return value !== value;
  }
  function baseTimes(n, iteratee) {
    var index = -1, result = Array(n);
    while (++index < n) {
      result[index] = iteratee(index);
    }
    return result;
  }
  function baseValues(object, props) {
    return arrayMap(props, function(key) {
      return object[key];
    });
  }
  function overArg(func, transform) {
    return function(arg) {
      return func(transform(arg));
    };
  }
  var objectProto = Object.prototype;
  var hasOwnProperty = objectProto.hasOwnProperty;
  var objectToString = objectProto.toString;
  var propertyIsEnumerable = objectProto.propertyIsEnumerable;
  var nativeKeys = overArg(Object.keys, Object), nativeMax = Math.max;
  function arrayLikeKeys(value, inherited) {
    var result = isArray(value) || isArguments(value) ? baseTimes(value.length, String) : [];
    var length = result.length, skipIndexes = !!length;
    for (var key in value) {
      if (hasOwnProperty.call(value, key) && !(skipIndexes && (key == "length" || isIndex(key, length)))) {
        result.push(key);
      }
    }
    return result;
  }
  function baseKeys(object) {
    if (!isPrototype(object)) {
      return nativeKeys(object);
    }
    var result = [];
    for (var key in Object(object)) {
      if (hasOwnProperty.call(object, key) && key != "constructor") {
        result.push(key);
      }
    }
    return result;
  }
  function isIndex(value, length) {
    length = length == null ? MAX_SAFE_INTEGER : length;
    return !!length && (typeof value == "number" || reIsUint.test(value)) && (value > -1 && value % 1 == 0 && value < length);
  }
  function isPrototype(value) {
    var Ctor = value && value.constructor, proto = typeof Ctor == "function" && Ctor.prototype || objectProto;
    return value === proto;
  }
  function includes(collection, value, fromIndex, guard) {
    collection = isArrayLike(collection) ? collection : values(collection);
    fromIndex = fromIndex && !guard ? toInteger(fromIndex) : 0;
    var length = collection.length;
    if (fromIndex < 0) {
      fromIndex = nativeMax(length + fromIndex, 0);
    }
    return isString(collection) ? fromIndex <= length && collection.indexOf(value, fromIndex) > -1 : !!length && baseIndexOf(collection, value, fromIndex) > -1;
  }
  function isArguments(value) {
    return isArrayLikeObject(value) && hasOwnProperty.call(value, "callee") && (!propertyIsEnumerable.call(value, "callee") || objectToString.call(value) == argsTag);
  }
  var isArray = Array.isArray;
  function isArrayLike(value) {
    return value != null && isLength(value.length) && !isFunction(value);
  }
  function isArrayLikeObject(value) {
    return isObjectLike(value) && isArrayLike(value);
  }
  function isFunction(value) {
    var tag = isObject(value) ? objectToString.call(value) : "";
    return tag == funcTag || tag == genTag;
  }
  function isLength(value) {
    return typeof value == "number" && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
  }
  function isObject(value) {
    var type = typeof value;
    return !!value && (type == "object" || type == "function");
  }
  function isObjectLike(value) {
    return !!value && typeof value == "object";
  }
  function isString(value) {
    return typeof value == "string" || !isArray(value) && isObjectLike(value) && objectToString.call(value) == stringTag;
  }
  function isSymbol(value) {
    return typeof value == "symbol" || isObjectLike(value) && objectToString.call(value) == symbolTag;
  }
  function toFinite(value) {
    if (!value) {
      return value === 0 ? value : 0;
    }
    value = toNumber(value);
    if (value === INFINITY || value === -INFINITY) {
      var sign2 = value < 0 ? -1 : 1;
      return sign2 * MAX_INTEGER;
    }
    return value === value ? value : 0;
  }
  function toInteger(value) {
    var result = toFinite(value), remainder = result % 1;
    return result === result ? remainder ? result - remainder : result : 0;
  }
  function toNumber(value) {
    if (typeof value == "number") {
      return value;
    }
    if (isSymbol(value)) {
      return NAN;
    }
    if (isObject(value)) {
      var other = typeof value.valueOf == "function" ? value.valueOf() : value;
      value = isObject(other) ? other + "" : other;
    }
    if (typeof value != "string") {
      return value === 0 ? value : +value;
    }
    value = value.replace(reTrim, "");
    var isBinary = reIsBinary.test(value);
    return isBinary || reIsOctal.test(value) ? freeParseInt(value.slice(2), isBinary ? 2 : 8) : reIsBadHex.test(value) ? NAN : +value;
  }
  function keys(object) {
    return isArrayLike(object) ? arrayLikeKeys(object) : baseKeys(object);
  }
  function values(object) {
    return object ? baseValues(object, keys(object)) : [];
  }
  lodash_includes = includes;
  return lodash_includes;
}
var lodash_isboolean;
var hasRequiredLodash_isboolean;
function requireLodash_isboolean() {
  if (hasRequiredLodash_isboolean) return lodash_isboolean;
  hasRequiredLodash_isboolean = 1;
  var boolTag = "[object Boolean]";
  var objectProto = Object.prototype;
  var objectToString = objectProto.toString;
  function isBoolean(value) {
    return value === true || value === false || isObjectLike(value) && objectToString.call(value) == boolTag;
  }
  function isObjectLike(value) {
    return !!value && typeof value == "object";
  }
  lodash_isboolean = isBoolean;
  return lodash_isboolean;
}
var lodash_isinteger;
var hasRequiredLodash_isinteger;
function requireLodash_isinteger() {
  if (hasRequiredLodash_isinteger) return lodash_isinteger;
  hasRequiredLodash_isinteger = 1;
  var INFINITY = 1 / 0, MAX_INTEGER = 17976931348623157e292, NAN = 0 / 0;
  var symbolTag = "[object Symbol]";
  var reTrim = /^\s+|\s+$/g;
  var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;
  var reIsBinary = /^0b[01]+$/i;
  var reIsOctal = /^0o[0-7]+$/i;
  var freeParseInt = parseInt;
  var objectProto = Object.prototype;
  var objectToString = objectProto.toString;
  function isInteger(value) {
    return typeof value == "number" && value == toInteger(value);
  }
  function isObject(value) {
    var type = typeof value;
    return !!value && (type == "object" || type == "function");
  }
  function isObjectLike(value) {
    return !!value && typeof value == "object";
  }
  function isSymbol(value) {
    return typeof value == "symbol" || isObjectLike(value) && objectToString.call(value) == symbolTag;
  }
  function toFinite(value) {
    if (!value) {
      return value === 0 ? value : 0;
    }
    value = toNumber(value);
    if (value === INFINITY || value === -INFINITY) {
      var sign2 = value < 0 ? -1 : 1;
      return sign2 * MAX_INTEGER;
    }
    return value === value ? value : 0;
  }
  function toInteger(value) {
    var result = toFinite(value), remainder = result % 1;
    return result === result ? remainder ? result - remainder : result : 0;
  }
  function toNumber(value) {
    if (typeof value == "number") {
      return value;
    }
    if (isSymbol(value)) {
      return NAN;
    }
    if (isObject(value)) {
      var other = typeof value.valueOf == "function" ? value.valueOf() : value;
      value = isObject(other) ? other + "" : other;
    }
    if (typeof value != "string") {
      return value === 0 ? value : +value;
    }
    value = value.replace(reTrim, "");
    var isBinary = reIsBinary.test(value);
    return isBinary || reIsOctal.test(value) ? freeParseInt(value.slice(2), isBinary ? 2 : 8) : reIsBadHex.test(value) ? NAN : +value;
  }
  lodash_isinteger = isInteger;
  return lodash_isinteger;
}
var lodash_isnumber;
var hasRequiredLodash_isnumber;
function requireLodash_isnumber() {
  if (hasRequiredLodash_isnumber) return lodash_isnumber;
  hasRequiredLodash_isnumber = 1;
  var numberTag = "[object Number]";
  var objectProto = Object.prototype;
  var objectToString = objectProto.toString;
  function isObjectLike(value) {
    return !!value && typeof value == "object";
  }
  function isNumber(value) {
    return typeof value == "number" || isObjectLike(value) && objectToString.call(value) == numberTag;
  }
  lodash_isnumber = isNumber;
  return lodash_isnumber;
}
var lodash_isplainobject;
var hasRequiredLodash_isplainobject;
function requireLodash_isplainobject() {
  if (hasRequiredLodash_isplainobject) return lodash_isplainobject;
  hasRequiredLodash_isplainobject = 1;
  var objectTag = "[object Object]";
  function isHostObject(value) {
    var result = false;
    if (value != null && typeof value.toString != "function") {
      try {
        result = !!(value + "");
      } catch (e) {
      }
    }
    return result;
  }
  function overArg(func, transform) {
    return function(arg) {
      return func(transform(arg));
    };
  }
  var funcProto = Function.prototype, objectProto = Object.prototype;
  var funcToString = funcProto.toString;
  var hasOwnProperty = objectProto.hasOwnProperty;
  var objectCtorString = funcToString.call(Object);
  var objectToString = objectProto.toString;
  var getPrototype = overArg(Object.getPrototypeOf, Object);
  function isObjectLike(value) {
    return !!value && typeof value == "object";
  }
  function isPlainObject(value) {
    if (!isObjectLike(value) || objectToString.call(value) != objectTag || isHostObject(value)) {
      return false;
    }
    var proto = getPrototype(value);
    if (proto === null) {
      return true;
    }
    var Ctor = hasOwnProperty.call(proto, "constructor") && proto.constructor;
    return typeof Ctor == "function" && Ctor instanceof Ctor && funcToString.call(Ctor) == objectCtorString;
  }
  lodash_isplainobject = isPlainObject;
  return lodash_isplainobject;
}
var lodash_isstring;
var hasRequiredLodash_isstring;
function requireLodash_isstring() {
  if (hasRequiredLodash_isstring) return lodash_isstring;
  hasRequiredLodash_isstring = 1;
  var stringTag = "[object String]";
  var objectProto = Object.prototype;
  var objectToString = objectProto.toString;
  var isArray = Array.isArray;
  function isObjectLike(value) {
    return !!value && typeof value == "object";
  }
  function isString(value) {
    return typeof value == "string" || !isArray(value) && isObjectLike(value) && objectToString.call(value) == stringTag;
  }
  lodash_isstring = isString;
  return lodash_isstring;
}
var lodash_once;
var hasRequiredLodash_once;
function requireLodash_once() {
  if (hasRequiredLodash_once) return lodash_once;
  hasRequiredLodash_once = 1;
  var FUNC_ERROR_TEXT = "Expected a function";
  var INFINITY = 1 / 0, MAX_INTEGER = 17976931348623157e292, NAN = 0 / 0;
  var symbolTag = "[object Symbol]";
  var reTrim = /^\s+|\s+$/g;
  var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;
  var reIsBinary = /^0b[01]+$/i;
  var reIsOctal = /^0o[0-7]+$/i;
  var freeParseInt = parseInt;
  var objectProto = Object.prototype;
  var objectToString = objectProto.toString;
  function before(n, func) {
    var result;
    if (typeof func != "function") {
      throw new TypeError(FUNC_ERROR_TEXT);
    }
    n = toInteger(n);
    return function() {
      if (--n > 0) {
        result = func.apply(this, arguments);
      }
      if (n <= 1) {
        func = void 0;
      }
      return result;
    };
  }
  function once(func) {
    return before(2, func);
  }
  function isObject(value) {
    var type = typeof value;
    return !!value && (type == "object" || type == "function");
  }
  function isObjectLike(value) {
    return !!value && typeof value == "object";
  }
  function isSymbol(value) {
    return typeof value == "symbol" || isObjectLike(value) && objectToString.call(value) == symbolTag;
  }
  function toFinite(value) {
    if (!value) {
      return value === 0 ? value : 0;
    }
    value = toNumber(value);
    if (value === INFINITY || value === -INFINITY) {
      var sign2 = value < 0 ? -1 : 1;
      return sign2 * MAX_INTEGER;
    }
    return value === value ? value : 0;
  }
  function toInteger(value) {
    var result = toFinite(value), remainder = result % 1;
    return result === result ? remainder ? result - remainder : result : 0;
  }
  function toNumber(value) {
    if (typeof value == "number") {
      return value;
    }
    if (isSymbol(value)) {
      return NAN;
    }
    if (isObject(value)) {
      var other = typeof value.valueOf == "function" ? value.valueOf() : value;
      value = isObject(other) ? other + "" : other;
    }
    if (typeof value != "string") {
      return value === 0 ? value : +value;
    }
    value = value.replace(reTrim, "");
    var isBinary = reIsBinary.test(value);
    return isBinary || reIsOctal.test(value) ? freeParseInt(value.slice(2), isBinary ? 2 : 8) : reIsBadHex.test(value) ? NAN : +value;
  }
  lodash_once = once;
  return lodash_once;
}
var sign;
var hasRequiredSign;
function requireSign() {
  if (hasRequiredSign) return sign;
  hasRequiredSign = 1;
  const timespan2 = requireTimespan();
  const PS_SUPPORTED = requirePsSupported();
  const validateAsymmetricKey2 = requireValidateAsymmetricKey();
  const jws2 = requireJws();
  const includes = requireLodash_includes();
  const isBoolean = requireLodash_isboolean();
  const isInteger = requireLodash_isinteger();
  const isNumber = requireLodash_isnumber();
  const isPlainObject = requireLodash_isplainobject();
  const isString = requireLodash_isstring();
  const once = requireLodash_once();
  const { KeyObject, createSecretKey, createPrivateKey } = crypto;
  const SUPPORTED_ALGS = ["RS256", "RS384", "RS512", "ES256", "ES384", "ES512", "HS256", "HS384", "HS512", "none"];
  if (PS_SUPPORTED) {
    SUPPORTED_ALGS.splice(3, 0, "PS256", "PS384", "PS512");
  }
  const sign_options_schema = {
    expiresIn: { isValid: function(value) {
      return isInteger(value) || isString(value) && value;
    }, message: '"expiresIn" should be a number of seconds or string representing a timespan' },
    notBefore: { isValid: function(value) {
      return isInteger(value) || isString(value) && value;
    }, message: '"notBefore" should be a number of seconds or string representing a timespan' },
    audience: { isValid: function(value) {
      return isString(value) || Array.isArray(value);
    }, message: '"audience" must be a string or array' },
    algorithm: { isValid: includes.bind(null, SUPPORTED_ALGS), message: '"algorithm" must be a valid string enum value' },
    header: { isValid: isPlainObject, message: '"header" must be an object' },
    encoding: { isValid: isString, message: '"encoding" must be a string' },
    issuer: { isValid: isString, message: '"issuer" must be a string' },
    subject: { isValid: isString, message: '"subject" must be a string' },
    jwtid: { isValid: isString, message: '"jwtid" must be a string' },
    noTimestamp: { isValid: isBoolean, message: '"noTimestamp" must be a boolean' },
    keyid: { isValid: isString, message: '"keyid" must be a string' },
    mutatePayload: { isValid: isBoolean, message: '"mutatePayload" must be a boolean' },
    allowInsecureKeySizes: { isValid: isBoolean, message: '"allowInsecureKeySizes" must be a boolean' },
    allowInvalidAsymmetricKeyTypes: { isValid: isBoolean, message: '"allowInvalidAsymmetricKeyTypes" must be a boolean' }
  };
  const registered_claims_schema = {
    iat: { isValid: isNumber, message: '"iat" should be a number of seconds' },
    exp: { isValid: isNumber, message: '"exp" should be a number of seconds' },
    nbf: { isValid: isNumber, message: '"nbf" should be a number of seconds' }
  };
  function validate2(schema, allowUnknown, object, parameterName) {
    if (!isPlainObject(object)) {
      throw new Error('Expected "' + parameterName + '" to be a plain object.');
    }
    Object.keys(object).forEach(function(key) {
      const validator = schema[key];
      if (!validator) {
        if (!allowUnknown) {
          throw new Error('"' + key + '" is not allowed in "' + parameterName + '"');
        }
        return;
      }
      if (!validator.isValid(object[key])) {
        throw new Error(validator.message);
      }
    });
  }
  function validateOptions(options) {
    return validate2(sign_options_schema, false, options, "options");
  }
  function validatePayload(payload) {
    return validate2(registered_claims_schema, true, payload, "payload");
  }
  const options_to_payload = {
    "audience": "aud",
    "issuer": "iss",
    "subject": "sub",
    "jwtid": "jti"
  };
  const options_for_objects = [
    "expiresIn",
    "notBefore",
    "noTimestamp",
    "audience",
    "issuer",
    "subject",
    "jwtid"
  ];
  sign = function(payload, secretOrPrivateKey, options, callback) {
    if (typeof options === "function") {
      callback = options;
      options = {};
    } else {
      options = options || {};
    }
    const isObjectPayload = typeof payload === "object" && !Buffer.isBuffer(payload);
    const header = Object.assign({
      alg: options.algorithm || "HS256",
      typ: isObjectPayload ? "JWT" : void 0,
      kid: options.keyid
    }, options.header);
    function failure(err) {
      if (callback) {
        return callback(err);
      }
      throw err;
    }
    if (!secretOrPrivateKey && options.algorithm !== "none") {
      return failure(new Error("secretOrPrivateKey must have a value"));
    }
    if (secretOrPrivateKey != null && !(secretOrPrivateKey instanceof KeyObject)) {
      try {
        secretOrPrivateKey = createPrivateKey(secretOrPrivateKey);
      } catch (_) {
        try {
          secretOrPrivateKey = createSecretKey(typeof secretOrPrivateKey === "string" ? Buffer.from(secretOrPrivateKey) : secretOrPrivateKey);
        } catch (_2) {
          return failure(new Error("secretOrPrivateKey is not valid key material"));
        }
      }
    }
    if (header.alg.startsWith("HS") && secretOrPrivateKey.type !== "secret") {
      return failure(new Error(`secretOrPrivateKey must be a symmetric key when using ${header.alg}`));
    } else if (/^(?:RS|PS|ES)/.test(header.alg)) {
      if (secretOrPrivateKey.type !== "private") {
        return failure(new Error(`secretOrPrivateKey must be an asymmetric key when using ${header.alg}`));
      }
      if (!options.allowInsecureKeySizes && !header.alg.startsWith("ES") && secretOrPrivateKey.asymmetricKeyDetails !== void 0 && //KeyObject.asymmetricKeyDetails is supported in Node 15+
      secretOrPrivateKey.asymmetricKeyDetails.modulusLength < 2048) {
        return failure(new Error(`secretOrPrivateKey has a minimum key size of 2048 bits for ${header.alg}`));
      }
    }
    if (typeof payload === "undefined") {
      return failure(new Error("payload is required"));
    } else if (isObjectPayload) {
      try {
        validatePayload(payload);
      } catch (error) {
        return failure(error);
      }
      if (!options.mutatePayload) {
        payload = Object.assign({}, payload);
      }
    } else {
      const invalid_options = options_for_objects.filter(function(opt) {
        return typeof options[opt] !== "undefined";
      });
      if (invalid_options.length > 0) {
        return failure(new Error("invalid " + invalid_options.join(",") + " option for " + typeof payload + " payload"));
      }
    }
    if (typeof payload.exp !== "undefined" && typeof options.expiresIn !== "undefined") {
      return failure(new Error('Bad "options.expiresIn" option the payload already has an "exp" property.'));
    }
    if (typeof payload.nbf !== "undefined" && typeof options.notBefore !== "undefined") {
      return failure(new Error('Bad "options.notBefore" option the payload already has an "nbf" property.'));
    }
    try {
      validateOptions(options);
    } catch (error) {
      return failure(error);
    }
    if (!options.allowInvalidAsymmetricKeyTypes) {
      try {
        validateAsymmetricKey2(header.alg, secretOrPrivateKey);
      } catch (error) {
        return failure(error);
      }
    }
    const timestamp = payload.iat || Math.floor(Date.now() / 1e3);
    if (options.noTimestamp) {
      delete payload.iat;
    } else if (isObjectPayload) {
      payload.iat = timestamp;
    }
    if (typeof options.notBefore !== "undefined") {
      try {
        payload.nbf = timespan2(options.notBefore, timestamp);
      } catch (err) {
        return failure(err);
      }
      if (typeof payload.nbf === "undefined") {
        return failure(new Error('"notBefore" should be a number of seconds or string representing a timespan eg: "1d", "20h", 60'));
      }
    }
    if (typeof options.expiresIn !== "undefined" && typeof payload === "object") {
      try {
        payload.exp = timespan2(options.expiresIn, timestamp);
      } catch (err) {
        return failure(err);
      }
      if (typeof payload.exp === "undefined") {
        return failure(new Error('"expiresIn" should be a number of seconds or string representing a timespan eg: "1d", "20h", 60'));
      }
    }
    Object.keys(options_to_payload).forEach(function(key) {
      const claim = options_to_payload[key];
      if (typeof options[key] !== "undefined") {
        if (typeof payload[claim] !== "undefined") {
          return failure(new Error('Bad "options.' + key + '" option. The payload already has an "' + claim + '" property.'));
        }
        payload[claim] = options[key];
      }
    });
    const encoding = options.encoding || "utf8";
    if (typeof callback === "function") {
      callback = callback && once(callback);
      jws2.createSign({
        header,
        privateKey: secretOrPrivateKey,
        payload,
        encoding
      }).once("error", callback).once("done", function(signature) {
        if (!options.allowInsecureKeySizes && /^(?:RS|PS)/.test(header.alg) && signature.length < 256) {
          return callback(new Error(`secretOrPrivateKey has a minimum key size of 2048 bits for ${header.alg}`));
        }
        callback(null, signature);
      });
    } else {
      let signature = jws2.sign({ header, payload, secret: secretOrPrivateKey, encoding });
      if (!options.allowInsecureKeySizes && /^(?:RS|PS)/.test(header.alg) && signature.length < 256) {
        throw new Error(`secretOrPrivateKey has a minimum key size of 2048 bits for ${header.alg}`);
      }
      return signature;
    }
  };
  return sign;
}
var jsonwebtoken;
var hasRequiredJsonwebtoken;
function requireJsonwebtoken() {
  if (hasRequiredJsonwebtoken) return jsonwebtoken;
  hasRequiredJsonwebtoken = 1;
  jsonwebtoken = {
    decode: requireDecode(),
    verify: requireVerify(),
    sign: requireSign(),
    JsonWebTokenError: requireJsonWebTokenError(),
    NotBeforeError: requireNotBeforeError(),
    TokenExpiredError: requireTokenExpiredError()
  };
  return jsonwebtoken;
}
var jsonwebtokenExports = requireJsonwebtoken();
const jwt = /* @__PURE__ */ getDefaultExportFromCjs(jsonwebtokenExports);
class ClientAssertion {
  /**
   * Initialize the ClientAssertion class from the clientAssertion passed by the user
   * @param assertion - refer https://tools.ietf.org/html/rfc7521
   */
  static fromAssertion(assertion) {
    const clientAssertion = new ClientAssertion();
    clientAssertion.jwt = assertion;
    return clientAssertion;
  }
  /**
   * @deprecated Use fromCertificateWithSha256Thumbprint instead, with a SHA-256 thumprint
   * Initialize the ClientAssertion class from the certificate passed by the user
   * @param thumbprint - identifier of a certificate
   * @param privateKey - secret key
   * @param publicCertificate - electronic document provided to prove the ownership of the public key
   */
  static fromCertificate(thumbprint, privateKey, publicCertificate) {
    const clientAssertion = new ClientAssertion();
    clientAssertion.privateKey = privateKey;
    clientAssertion.thumbprint = thumbprint;
    clientAssertion.useSha256 = false;
    if (publicCertificate) {
      clientAssertion.publicCertificate = this.parseCertificate(publicCertificate);
    }
    return clientAssertion;
  }
  /**
   * Initialize the ClientAssertion class from the certificate passed by the user
   * @param thumbprint - identifier of a certificate
   * @param privateKey - secret key
   * @param publicCertificate - electronic document provided to prove the ownership of the public key
   */
  static fromCertificateWithSha256Thumbprint(thumbprint, privateKey, publicCertificate) {
    const clientAssertion = new ClientAssertion();
    clientAssertion.privateKey = privateKey;
    clientAssertion.thumbprint = thumbprint;
    clientAssertion.useSha256 = true;
    if (publicCertificate) {
      clientAssertion.publicCertificate = this.parseCertificate(publicCertificate);
    }
    return clientAssertion;
  }
  /**
   * Update JWT for certificate based clientAssertion, if passed by the user, uses it as is
   * @param cryptoProvider - library's crypto helper
   * @param issuer - iss claim
   * @param jwtAudience - aud claim
   */
  getJwt(cryptoProvider, issuer, jwtAudience) {
    if (this.privateKey && this.thumbprint) {
      if (this.jwt && !this.isExpired() && issuer === this.issuer && jwtAudience === this.jwtAudience) {
        return this.jwt;
      }
      return this.createJwt(cryptoProvider, issuer, jwtAudience);
    }
    if (this.jwt) {
      return this.jwt;
    }
    throw createClientAuthError(invalidAssertion);
  }
  /**
   * JWT format and required claims specified: https://tools.ietf.org/html/rfc7523#section-3
   */
  createJwt(cryptoProvider, issuer, jwtAudience) {
    this.issuer = issuer;
    this.jwtAudience = jwtAudience;
    const issuedAt = nowSeconds();
    this.expirationTime = issuedAt + 600;
    const algorithm = this.useSha256 ? JwtConstants.PSS_256 : JwtConstants.RSA_256;
    const header = {
      alg: algorithm
    };
    const thumbprintHeader = this.useSha256 ? JwtConstants.X5T_256 : JwtConstants.X5T;
    Object.assign(header, {
      [thumbprintHeader]: EncodingUtils.base64EncodeUrl(this.thumbprint, EncodingTypes.HEX)
    });
    if (this.publicCertificate) {
      Object.assign(header, {
        [JwtConstants.X5C]: this.publicCertificate
      });
    }
    const payload = {
      [JwtConstants.AUDIENCE]: this.jwtAudience,
      [JwtConstants.EXPIRATION_TIME]: this.expirationTime,
      [JwtConstants.ISSUER]: this.issuer,
      [JwtConstants.SUBJECT]: this.issuer,
      [JwtConstants.NOT_BEFORE]: issuedAt,
      [JwtConstants.JWT_ID]: cryptoProvider.createNewGuid()
    };
    this.jwt = jwt.sign(payload, this.privateKey, { header });
    return this.jwt;
  }
  /**
   * Utility API to check expiration
   */
  isExpired() {
    return this.expirationTime < nowSeconds();
  }
  /**
   * Extracts the raw certs from a given certificate string and returns them in an array.
   * @param publicCertificate - electronic document provided to prove the ownership of the public key
   */
  static parseCertificate(publicCertificate) {
    const regexToFindCerts = /-----BEGIN CERTIFICATE-----\r*\n(.+?)\r*\n-----END CERTIFICATE-----/gs;
    const certs = [];
    let matches;
    while ((matches = regexToFindCerts.exec(publicCertificate)) !== null) {
      certs.push(matches[1].replace(/\r*\n/g, Constants$1.EMPTY_STRING));
    }
    return certs;
  }
}
class UsernamePasswordClient extends BaseClient {
  constructor(configuration) {
    super(configuration);
  }
  /**
   * API to acquire a token by passing the username and password to the service in exchage of credentials
   * password_grant
   * @param request - CommonUsernamePasswordRequest
   */
  async acquireToken(request) {
    this.logger.info("in acquireToken call in username-password client");
    const reqTimestamp = nowSeconds();
    const response = await this.executeTokenRequest(this.authority, request);
    const responseHandler = new ResponseHandler(this.config.authOptions.clientId, this.cacheManager, this.cryptoUtils, this.logger, this.config.serializableCache, this.config.persistencePlugin);
    responseHandler.validateTokenResponse(response.body);
    const tokenResponse = responseHandler.handleServerTokenResponse(response.body, this.authority, reqTimestamp, request, ApiId.acquireTokenByUsernamePassword);
    return tokenResponse;
  }
  /**
   * Executes POST request to token endpoint
   * @param authority - authority object
   * @param request - CommonUsernamePasswordRequest provided by the developer
   */
  async executeTokenRequest(authority, request) {
    const queryParametersString = this.createTokenQueryParameters(request);
    const endpoint = UrlString.appendQueryString(authority.tokenEndpoint, queryParametersString);
    const requestBody = await this.createTokenRequestBody(request);
    const headers = this.createTokenRequestHeaders({
      credential: request.username,
      type: CcsCredentialType.UPN
    });
    const thumbprint = {
      clientId: this.config.authOptions.clientId,
      authority: authority.canonicalAuthority,
      scopes: request.scopes,
      claims: request.claims,
      authenticationScheme: request.authenticationScheme,
      resourceRequestMethod: request.resourceRequestMethod,
      resourceRequestUri: request.resourceRequestUri,
      shrClaims: request.shrClaims,
      sshKid: request.sshKid
    };
    return this.executePostToTokenEndpoint(endpoint, requestBody, headers, thumbprint, request.correlationId);
  }
  /**
   * Generates a map for all the params to be sent to the service
   * @param request - CommonUsernamePasswordRequest provided by the developer
   */
  async createTokenRequestBody(request) {
    const parameters = /* @__PURE__ */ new Map();
    addClientId(parameters, this.config.authOptions.clientId);
    addUsername(parameters, request.username);
    addPassword(parameters, request.password);
    addScopes(parameters, request.scopes);
    addResponseType(parameters, OAuthResponseType.IDTOKEN_TOKEN);
    addGrantType(parameters, GrantType.RESOURCE_OWNER_PASSWORD_GRANT);
    addClientInfo(parameters);
    addLibraryInfo(parameters, this.config.libraryInfo);
    addApplicationTelemetry(parameters, this.config.telemetry.application);
    addThrottling(parameters);
    if (this.serverTelemetryManager) {
      addServerTelemetry(parameters, this.serverTelemetryManager);
    }
    const correlationId = request.correlationId || this.config.cryptoInterface.createNewGuid();
    addCorrelationId(parameters, correlationId);
    if (this.config.clientCredentials.clientSecret) {
      addClientSecret(parameters, this.config.clientCredentials.clientSecret);
    }
    const clientAssertion = this.config.clientCredentials.clientAssertion;
    if (clientAssertion) {
      addClientAssertion(parameters, await getClientAssertion(clientAssertion.assertion, this.config.authOptions.clientId, request.resourceRequestUri));
      addClientAssertionType(parameters, clientAssertion.assertionType);
    }
    if (!StringUtils.isEmptyObj(request.claims) || this.config.authOptions.clientCapabilities && this.config.authOptions.clientCapabilities.length > 0) {
      addClaims(parameters, request.claims, this.config.authOptions.clientCapabilities);
    }
    if (this.config.systemOptions.preventCorsPreflight && request.username) {
      addCcsUpn(parameters, request.username);
    }
    return mapToQueryString(parameters);
  }
}
function getAuthCodeRequestUrl(config, authority, request, logger) {
  const parameters = getStandardAuthorizeRequestParameters({
    ...config.auth,
    authority,
    redirectUri: request.redirectUri || ""
  }, request, logger);
  addLibraryInfo(parameters, {
    sku: Constants.MSAL_SKU,
    version,
    cpu: process.arch || "",
    os: process.platform || ""
  });
  if (config.auth.protocolMode !== ProtocolMode.OIDC) {
    addApplicationTelemetry(parameters, config.telemetry.application);
  }
  addResponseType(parameters, OAuthResponseType.CODE);
  if (request.codeChallenge && request.codeChallengeMethod) {
    addCodeChallengeParams(parameters, request.codeChallenge, request.codeChallengeMethod);
  }
  addExtraQueryParameters(parameters, request.extraQueryParameters || {});
  return getAuthorizeUrl(authority, parameters, config.auth.encodeExtraQueryParams, request.extraQueryParameters);
}
class ClientApplication {
  /**
   * Constructor for the ClientApplication
   */
  constructor(configuration) {
    this.config = buildAppConfiguration(configuration);
    this.cryptoProvider = new CryptoProvider();
    this.logger = new Logger(this.config.system.loggerOptions, name, version);
    this.storage = new NodeStorage(this.logger, this.config.auth.clientId, this.cryptoProvider, buildStaticAuthorityOptions(this.config.auth));
    this.tokenCache = new TokenCache(this.storage, this.logger, this.config.cache.cachePlugin);
  }
  /**
   * Creates the URL of the authorization request, letting the user input credentials and consent to the
   * application. The URL targets the /authorize endpoint of the authority configured in the
   * application object.
   *
   * Once the user inputs their credentials and consents, the authority will send a response to the redirect URI
   * sent in the request and should contain an authorization code, which can then be used to acquire tokens via
   * `acquireTokenByCode(AuthorizationCodeRequest)`.
   */
  async getAuthCodeUrl(request) {
    this.logger.info("getAuthCodeUrl called", request.correlationId);
    const validRequest = {
      ...request,
      ...await this.initializeBaseRequest(request),
      responseMode: request.responseMode || ResponseMode.QUERY,
      authenticationScheme: AuthenticationScheme.BEARER,
      state: request.state || "",
      nonce: request.nonce || ""
    };
    const discoveredAuthority = await this.createAuthority(validRequest.authority, validRequest.correlationId, void 0, request.azureCloudOptions);
    return getAuthCodeRequestUrl(this.config, discoveredAuthority, validRequest, this.logger);
  }
  /**
   * Acquires a token by exchanging the Authorization Code received from the first step of OAuth2.0
   * Authorization Code flow.
   *
   * `getAuthCodeUrl(AuthorizationCodeUrlRequest)` can be used to create the URL for the first step of OAuth2.0
   * Authorization Code flow. Ensure that values for redirectUri and scopes in AuthorizationCodeUrlRequest and
   * AuthorizationCodeRequest are the same.
   */
  async acquireTokenByCode(request, authCodePayLoad) {
    this.logger.info("acquireTokenByCode called");
    if (request.state && authCodePayLoad) {
      this.logger.info("acquireTokenByCode - validating state");
      this.validateState(request.state, authCodePayLoad.state || "");
      authCodePayLoad = { ...authCodePayLoad, state: "" };
    }
    const validRequest = {
      ...request,
      ...await this.initializeBaseRequest(request),
      authenticationScheme: AuthenticationScheme.BEARER
    };
    const serverTelemetryManager = this.initializeServerTelemetryManager(ApiId.acquireTokenByCode, validRequest.correlationId);
    try {
      const discoveredAuthority = await this.createAuthority(validRequest.authority, validRequest.correlationId, void 0, request.azureCloudOptions);
      const authClientConfig = await this.buildOauthClientConfiguration(discoveredAuthority, validRequest.correlationId, validRequest.redirectUri, serverTelemetryManager);
      const authorizationCodeClient = new AuthorizationCodeClient(authClientConfig);
      this.logger.verbose("Auth code client created", validRequest.correlationId);
      return await authorizationCodeClient.acquireToken(validRequest, ApiId.acquireTokenByCode, authCodePayLoad);
    } catch (e) {
      if (e instanceof AuthError) {
        e.setCorrelationId(validRequest.correlationId);
      }
      serverTelemetryManager.cacheFailedRequest(e);
      throw e;
    }
  }
  /**
   * Acquires a token by exchanging the refresh token provided for a new set of tokens.
   *
   * This API is provided only for scenarios where you would like to migrate from ADAL to MSAL. Otherwise, it is
   * recommended that you use `acquireTokenSilent()` for silent scenarios. When using `acquireTokenSilent()`, MSAL will
   * handle the caching and refreshing of tokens automatically.
   */
  async acquireTokenByRefreshToken(request) {
    this.logger.info("acquireTokenByRefreshToken called", request.correlationId);
    const validRequest = {
      ...request,
      ...await this.initializeBaseRequest(request),
      authenticationScheme: AuthenticationScheme.BEARER
    };
    const serverTelemetryManager = this.initializeServerTelemetryManager(ApiId.acquireTokenByRefreshToken, validRequest.correlationId);
    try {
      const discoveredAuthority = await this.createAuthority(validRequest.authority, validRequest.correlationId, void 0, request.azureCloudOptions);
      const refreshTokenClientConfig = await this.buildOauthClientConfiguration(discoveredAuthority, validRequest.correlationId, validRequest.redirectUri || "", serverTelemetryManager);
      const refreshTokenClient = new RefreshTokenClient(refreshTokenClientConfig);
      this.logger.verbose("Refresh token client created", validRequest.correlationId);
      return await refreshTokenClient.acquireToken(validRequest, ApiId.acquireTokenByRefreshToken);
    } catch (e) {
      if (e instanceof AuthError) {
        e.setCorrelationId(validRequest.correlationId);
      }
      serverTelemetryManager.cacheFailedRequest(e);
      throw e;
    }
  }
  /**
   * Acquires a token silently when a user specifies the account the token is requested for.
   *
   * This API expects the user to provide an account object and looks into the cache to retrieve the token if present.
   * There is also an optional "forceRefresh" boolean the user can send to bypass the cache for access_token and id_token.
   * In case the refresh_token is expired or not found, an error is thrown
   * and the guidance is for the user to call any interactive token acquisition API (eg: `acquireTokenByCode()`).
   */
  async acquireTokenSilent(request) {
    const validRequest = {
      ...request,
      ...await this.initializeBaseRequest(request),
      forceRefresh: request.forceRefresh || false
    };
    const serverTelemetryManager = this.initializeServerTelemetryManager(ApiId.acquireTokenSilent, validRequest.correlationId, validRequest.forceRefresh);
    try {
      const discoveredAuthority = await this.createAuthority(validRequest.authority, validRequest.correlationId, void 0, request.azureCloudOptions);
      const clientConfiguration = await this.buildOauthClientConfiguration(discoveredAuthority, validRequest.correlationId, validRequest.redirectUri || "", serverTelemetryManager);
      const silentFlowClient = new SilentFlowClient(clientConfiguration);
      this.logger.verbose("Silent flow client created", validRequest.correlationId);
      try {
        await this.tokenCache.overwriteCache();
        return await this.acquireCachedTokenSilent(validRequest, silentFlowClient, clientConfiguration);
      } catch (error) {
        if (error instanceof ClientAuthError && error.errorCode === tokenRefreshRequired) {
          const refreshTokenClient = new RefreshTokenClient(clientConfiguration);
          return refreshTokenClient.acquireTokenByRefreshToken(validRequest, ApiId.acquireTokenSilent);
        }
        throw error;
      }
    } catch (error) {
      if (error instanceof AuthError) {
        error.setCorrelationId(validRequest.correlationId);
      }
      serverTelemetryManager.cacheFailedRequest(error);
      throw error;
    }
  }
  async acquireCachedTokenSilent(validRequest, silentFlowClient, clientConfiguration) {
    const [authResponse, cacheOutcome] = await silentFlowClient.acquireCachedToken({
      ...validRequest,
      scopes: validRequest.scopes?.length ? validRequest.scopes : [...OIDC_DEFAULT_SCOPES]
    });
    if (cacheOutcome === CacheOutcome.PROACTIVELY_REFRESHED) {
      this.logger.info("ClientApplication:acquireCachedTokenSilent - Cached access token's refreshOn property has been exceeded'. It's not expired, but must be refreshed.");
      const refreshTokenClient = new RefreshTokenClient(clientConfiguration);
      try {
        await refreshTokenClient.acquireTokenByRefreshToken(validRequest, ApiId.acquireTokenSilent);
      } catch {
      }
    }
    return authResponse;
  }
  /**
   * Acquires tokens with password grant by exchanging client applications username and password for credentials
   *
   * The latest OAuth 2.0 Security Best Current Practice disallows the password grant entirely.
   * More details on this recommendation at https://tools.ietf.org/html/draft-ietf-oauth-security-topics-13#section-3.4
   * Microsoft's documentation and recommendations are at:
   * https://docs.microsoft.com/en-us/azure/active-directory/develop/msal-authentication-flows#usernamepassword
   *
   * @param request - UsenamePasswordRequest
   * @deprecated - Use a more secure flow instead
   */
  async acquireTokenByUsernamePassword(request) {
    this.logger.info("acquireTokenByUsernamePassword called", request.correlationId);
    const validRequest = {
      ...request,
      ...await this.initializeBaseRequest(request)
    };
    const serverTelemetryManager = this.initializeServerTelemetryManager(ApiId.acquireTokenByUsernamePassword, validRequest.correlationId);
    try {
      const discoveredAuthority = await this.createAuthority(validRequest.authority, validRequest.correlationId, void 0, request.azureCloudOptions);
      const usernamePasswordClientConfig = await this.buildOauthClientConfiguration(discoveredAuthority, validRequest.correlationId, "", serverTelemetryManager);
      const usernamePasswordClient = new UsernamePasswordClient(usernamePasswordClientConfig);
      this.logger.verbose("Username password client created", validRequest.correlationId);
      return await usernamePasswordClient.acquireToken(validRequest);
    } catch (e) {
      if (e instanceof AuthError) {
        e.setCorrelationId(validRequest.correlationId);
      }
      serverTelemetryManager.cacheFailedRequest(e);
      throw e;
    }
  }
  /**
   * Gets the token cache for the application.
   */
  getTokenCache() {
    this.logger.info("getTokenCache called");
    return this.tokenCache;
  }
  /**
   * Validates OIDC state by comparing the user cached state with the state received from the server.
   *
   * This API is provided for scenarios where you would use OAuth2.0 state parameter to mitigate against
   * CSRF attacks.
   * For more information about state, visit https://datatracker.ietf.org/doc/html/rfc6819#section-3.6.
   * @param state - Unique GUID generated by the user that is cached by the user and sent to the server during the first leg of the flow
   * @param cachedState - This string is sent back by the server with the authorization code
   */
  validateState(state, cachedState) {
    if (!state) {
      throw NodeAuthError.createStateNotFoundError();
    }
    if (state !== cachedState) {
      throw createClientAuthError(stateMismatch);
    }
  }
  /**
   * Returns the logger instance
   */
  getLogger() {
    return this.logger;
  }
  /**
   * Replaces the default logger set in configurations with new Logger with new configurations
   * @param logger - Logger instance
   */
  setLogger(logger) {
    this.logger = logger;
  }
  /**
   * Builds the common configuration to be passed to the common component based on the platform configurarion
   * @param authority - user passed authority in configuration
   * @param serverTelemetryManager - initializes servertelemetry if passed
   */
  async buildOauthClientConfiguration(discoveredAuthority, requestCorrelationId, redirectUri, serverTelemetryManager) {
    this.logger.verbose("buildOauthClientConfiguration called", requestCorrelationId);
    this.logger.info(`Building oauth client configuration with the following authority: ${discoveredAuthority.tokenEndpoint}.`, requestCorrelationId);
    serverTelemetryManager?.updateRegionDiscoveryMetadata(discoveredAuthority.regionDiscoveryMetadata);
    const clientConfiguration = {
      authOptions: {
        clientId: this.config.auth.clientId,
        authority: discoveredAuthority,
        clientCapabilities: this.config.auth.clientCapabilities,
        redirectUri
      },
      loggerOptions: {
        logLevel: this.config.system.loggerOptions.logLevel,
        loggerCallback: this.config.system.loggerOptions.loggerCallback,
        piiLoggingEnabled: this.config.system.loggerOptions.piiLoggingEnabled,
        correlationId: requestCorrelationId
      },
      cacheOptions: {
        claimsBasedCachingEnabled: this.config.cache.claimsBasedCachingEnabled
      },
      cryptoInterface: this.cryptoProvider,
      networkInterface: this.config.system.networkClient,
      storageInterface: this.storage,
      serverTelemetryManager,
      clientCredentials: {
        clientSecret: this.clientSecret,
        clientAssertion: await this.getClientAssertion(discoveredAuthority)
      },
      libraryInfo: {
        sku: Constants.MSAL_SKU,
        version,
        cpu: process.arch || Constants$1.EMPTY_STRING,
        os: process.platform || Constants$1.EMPTY_STRING
      },
      telemetry: this.config.telemetry,
      persistencePlugin: this.config.cache.cachePlugin,
      serializableCache: this.tokenCache
    };
    return clientConfiguration;
  }
  async getClientAssertion(authority) {
    if (this.developerProvidedClientAssertion) {
      this.clientAssertion = ClientAssertion.fromAssertion(await getClientAssertion(this.developerProvidedClientAssertion, this.config.auth.clientId, authority.tokenEndpoint));
    }
    return this.clientAssertion && {
      assertion: this.clientAssertion.getJwt(this.cryptoProvider, this.config.auth.clientId, authority.tokenEndpoint),
      assertionType: Constants.JWT_BEARER_ASSERTION_TYPE
    };
  }
  /**
   * Generates a request with the default scopes & generates a correlationId.
   * @param authRequest - BaseAuthRequest for initialization
   */
  async initializeBaseRequest(authRequest) {
    this.logger.verbose("initializeRequestScopes called", authRequest.correlationId);
    if (authRequest.authenticationScheme && authRequest.authenticationScheme === AuthenticationScheme.POP) {
      this.logger.verbose("Authentication Scheme 'pop' is not supported yet, setting Authentication Scheme to 'Bearer' for request", authRequest.correlationId);
    }
    authRequest.authenticationScheme = AuthenticationScheme.BEARER;
    if (this.config.cache.claimsBasedCachingEnabled && authRequest.claims && // Checks for empty stringified object "{}" which doesn't qualify as requested claims
    !StringUtils.isEmptyObj(authRequest.claims)) {
      authRequest.requestedClaimsHash = await this.cryptoProvider.hashString(authRequest.claims);
    }
    return {
      ...authRequest,
      scopes: [
        ...authRequest && authRequest.scopes || [],
        ...OIDC_DEFAULT_SCOPES
      ],
      correlationId: authRequest && authRequest.correlationId || this.cryptoProvider.createNewGuid(),
      authority: authRequest.authority || this.config.auth.authority
    };
  }
  /**
   * Initializes the server telemetry payload
   * @param apiId - Id for a specific request
   * @param correlationId - GUID
   * @param forceRefresh - boolean to indicate network call
   */
  initializeServerTelemetryManager(apiId, correlationId, forceRefresh) {
    const telemetryPayload = {
      clientId: this.config.auth.clientId,
      correlationId,
      apiId,
      forceRefresh: forceRefresh || false
    };
    return new ServerTelemetryManager(telemetryPayload, this.storage);
  }
  /**
   * Create authority instance. If authority not passed in request, default to authority set on the application
   * object. If no authority set in application object, then default to common authority.
   * @param authorityString - authority from user configuration
   */
  async createAuthority(authorityString, requestCorrelationId, azureRegionConfiguration, azureCloudOptions) {
    this.logger.verbose("createAuthority called", requestCorrelationId);
    const authorityUrl = Authority.generateAuthority(authorityString, azureCloudOptions || this.config.auth.azureCloudOptions);
    const authorityOptions = {
      protocolMode: this.config.auth.protocolMode,
      knownAuthorities: this.config.auth.knownAuthorities,
      cloudDiscoveryMetadata: this.config.auth.cloudDiscoveryMetadata,
      authorityMetadata: this.config.auth.authorityMetadata,
      azureRegionConfiguration,
      skipAuthorityMetadataCache: this.config.auth.skipAuthorityMetadataCache
    };
    return createDiscoveredInstance(authorityUrl, this.config.system.networkClient, this.storage, authorityOptions, this.logger, requestCorrelationId);
  }
  /**
   * Clear the cache
   */
  clearCache() {
    this.storage.clear();
  }
}
class LoopbackClient {
  /**
   * Spins up a loopback server which returns the server response when the localhost redirectUri is hit
   * @param successTemplate
   * @param errorTemplate
   * @returns
   */
  async listenForAuthCode(successTemplate, errorTemplate) {
    if (this.server) {
      throw NodeAuthError.createLoopbackServerAlreadyExistsError();
    }
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        const url2 = req.url;
        if (!url2) {
          res.end(errorTemplate || "Error occurred loading redirectUrl");
          reject(NodeAuthError.createUnableToLoadRedirectUrlError());
          return;
        } else if (url2 === Constants$1.FORWARD_SLASH) {
          res.end(successTemplate || "Auth code was successfully acquired. You can close this window now.");
          return;
        }
        const redirectUri = this.getRedirectUri();
        const parsedUrl = new URL(url2, redirectUri);
        const authCodeResponse = getDeserializedResponse(parsedUrl.search) || {};
        if (authCodeResponse.code) {
          res.writeHead(HttpStatus.REDIRECT, {
            location: redirectUri
          });
          res.end();
        }
        if (authCodeResponse.error) {
          res.end(errorTemplate || `Error occurred: ${authCodeResponse.error}`);
        }
        resolve(authCodeResponse);
      });
      this.server.listen(0, "127.0.0.1");
    });
  }
  /**
   * Get the port that the loopback server is running on
   * @returns
   */
  getRedirectUri() {
    if (!this.server || !this.server.listening) {
      throw NodeAuthError.createNoLoopbackServerExistsError();
    }
    const address = this.server.address();
    if (!address || typeof address === "string" || !address.port) {
      this.closeServer();
      throw NodeAuthError.createInvalidLoopbackAddressTypeError();
    }
    const port = address && address.port;
    return `${Constants.HTTP_PROTOCOL}${Constants.LOCALHOST}:${port}`;
  }
  /**
   * Close the loopback server
   */
  closeServer() {
    if (this.server) {
      this.server.close();
      if (typeof this.server.closeAllConnections === "function") {
        this.server.closeAllConnections();
      }
      this.server.unref();
      this.server = void 0;
    }
  }
}
class DeviceCodeClient extends BaseClient {
  constructor(configuration) {
    super(configuration);
  }
  /**
   * Gets device code from device code endpoint, calls back to with device code response, and
   * polls token endpoint to exchange device code for tokens
   * @param request - developer provided CommonDeviceCodeRequest
   */
  async acquireToken(request) {
    const deviceCodeResponse = await this.getDeviceCode(request);
    request.deviceCodeCallback(deviceCodeResponse);
    const reqTimestamp = nowSeconds();
    const response = await this.acquireTokenWithDeviceCode(request, deviceCodeResponse);
    const responseHandler = new ResponseHandler(this.config.authOptions.clientId, this.cacheManager, this.cryptoUtils, this.logger, this.config.serializableCache, this.config.persistencePlugin);
    responseHandler.validateTokenResponse(response);
    return responseHandler.handleServerTokenResponse(response, this.authority, reqTimestamp, request, ApiId.acquireTokenByDeviceCode);
  }
  /**
   * Creates device code request and executes http GET
   * @param request - developer provided CommonDeviceCodeRequest
   */
  async getDeviceCode(request) {
    const queryParametersString = this.createExtraQueryParameters(request);
    const endpoint = UrlString.appendQueryString(this.authority.deviceCodeEndpoint, queryParametersString);
    const queryString = this.createQueryString(request);
    const headers = this.createTokenRequestHeaders();
    const thumbprint = {
      clientId: this.config.authOptions.clientId,
      authority: request.authority,
      scopes: request.scopes,
      claims: request.claims,
      authenticationScheme: request.authenticationScheme,
      resourceRequestMethod: request.resourceRequestMethod,
      resourceRequestUri: request.resourceRequestUri,
      shrClaims: request.shrClaims,
      sshKid: request.sshKid
    };
    return this.executePostRequestToDeviceCodeEndpoint(endpoint, queryString, headers, thumbprint, request.correlationId);
  }
  /**
   * Creates query string for the device code request
   * @param request - developer provided CommonDeviceCodeRequest
   */
  createExtraQueryParameters(request) {
    const parameters = /* @__PURE__ */ new Map();
    if (request.extraQueryParameters) {
      addExtraQueryParameters(parameters, request.extraQueryParameters);
    }
    return mapToQueryString(parameters);
  }
  /**
   * Executes POST request to device code endpoint
   * @param deviceCodeEndpoint - token endpoint
   * @param queryString - string to be used in the body of the request
   * @param headers - headers for the request
   * @param thumbprint - unique request thumbprint
   * @param correlationId - correlation id to be used in the request
   */
  async executePostRequestToDeviceCodeEndpoint(deviceCodeEndpoint, queryString, headers, thumbprint, correlationId) {
    const { body: { user_code: userCode, device_code: deviceCode, verification_uri: verificationUri, expires_in: expiresIn, interval, message } } = await this.sendPostRequest(thumbprint, deviceCodeEndpoint, {
      body: queryString,
      headers
    }, correlationId);
    return {
      userCode,
      deviceCode,
      verificationUri,
      expiresIn,
      interval,
      message
    };
  }
  /**
   * Create device code endpoint query parameters and returns string
   * @param request - developer provided CommonDeviceCodeRequest
   */
  createQueryString(request) {
    const parameters = /* @__PURE__ */ new Map();
    addScopes(parameters, request.scopes);
    addClientId(parameters, this.config.authOptions.clientId);
    if (request.extraQueryParameters) {
      addExtraQueryParameters(parameters, request.extraQueryParameters);
    }
    if (request.claims || this.config.authOptions.clientCapabilities && this.config.authOptions.clientCapabilities.length > 0) {
      addClaims(parameters, request.claims, this.config.authOptions.clientCapabilities);
    }
    return mapToQueryString(parameters);
  }
  /**
   * Breaks the polling with specific conditions
   * @param deviceCodeExpirationTime - expiration time for the device code request
   * @param userSpecifiedTimeout - developer provided timeout, to be compared against deviceCodeExpirationTime
   * @param userSpecifiedCancelFlag - boolean indicating the developer would like to cancel the request
   */
  continuePolling(deviceCodeExpirationTime, userSpecifiedTimeout, userSpecifiedCancelFlag) {
    if (userSpecifiedCancelFlag) {
      this.logger.error("Token request cancelled by setting DeviceCodeRequest.cancel = true");
      throw createClientAuthError(deviceCodePollingCancelled);
    } else if (userSpecifiedTimeout && userSpecifiedTimeout < deviceCodeExpirationTime && nowSeconds() > userSpecifiedTimeout) {
      this.logger.error(`User defined timeout for device code polling reached. The timeout was set for ${userSpecifiedTimeout}`);
      throw createClientAuthError(userTimeoutReached);
    } else if (nowSeconds() > deviceCodeExpirationTime) {
      if (userSpecifiedTimeout) {
        this.logger.verbose(`User specified timeout ignored as the device code has expired before the timeout elapsed. The user specified timeout was set for ${userSpecifiedTimeout}`);
      }
      this.logger.error(`Device code expired. Expiration time of device code was ${deviceCodeExpirationTime}`);
      throw createClientAuthError(deviceCodeExpired);
    }
    return true;
  }
  /**
   * Creates token request with device code response and polls token endpoint at interval set by the device code response
   * @param request - developer provided CommonDeviceCodeRequest
   * @param deviceCodeResponse - DeviceCodeResponse returned by the security token service device code endpoint
   */
  async acquireTokenWithDeviceCode(request, deviceCodeResponse) {
    const queryParametersString = this.createTokenQueryParameters(request);
    const endpoint = UrlString.appendQueryString(this.authority.tokenEndpoint, queryParametersString);
    const requestBody = this.createTokenRequestBody(request, deviceCodeResponse);
    const headers = this.createTokenRequestHeaders();
    const userSpecifiedTimeout = request.timeout ? nowSeconds() + request.timeout : void 0;
    const deviceCodeExpirationTime = nowSeconds() + deviceCodeResponse.expiresIn;
    const pollingIntervalMilli = deviceCodeResponse.interval * 1e3;
    while (this.continuePolling(deviceCodeExpirationTime, userSpecifiedTimeout, request.cancel)) {
      const thumbprint = {
        clientId: this.config.authOptions.clientId,
        authority: request.authority,
        scopes: request.scopes,
        claims: request.claims,
        authenticationScheme: request.authenticationScheme,
        resourceRequestMethod: request.resourceRequestMethod,
        resourceRequestUri: request.resourceRequestUri,
        shrClaims: request.shrClaims,
        sshKid: request.sshKid
      };
      const response = await this.executePostToTokenEndpoint(endpoint, requestBody, headers, thumbprint, request.correlationId);
      if (response.body && response.body.error) {
        if (response.body.error === Constants$1.AUTHORIZATION_PENDING) {
          this.logger.info("Authorization pending. Continue polling.");
          await delay(pollingIntervalMilli);
        } else {
          this.logger.info("Unexpected error in polling from the server");
          throw createAuthError(postRequestFailed, response.body.error);
        }
      } else {
        this.logger.verbose("Authorization completed successfully. Polling stopped.");
        return response.body;
      }
    }
    this.logger.error("Polling stopped for unknown reasons.");
    throw createClientAuthError(deviceCodeUnknownError);
  }
  /**
   * Creates query parameters and converts to string.
   * @param request - developer provided CommonDeviceCodeRequest
   * @param deviceCodeResponse - DeviceCodeResponse returned by the security token service device code endpoint
   */
  createTokenRequestBody(request, deviceCodeResponse) {
    const parameters = /* @__PURE__ */ new Map();
    addScopes(parameters, request.scopes);
    addClientId(parameters, this.config.authOptions.clientId);
    addGrantType(parameters, GrantType.DEVICE_CODE_GRANT);
    addDeviceCode(parameters, deviceCodeResponse.deviceCode);
    const correlationId = request.correlationId || this.config.cryptoInterface.createNewGuid();
    addCorrelationId(parameters, correlationId);
    addClientInfo(parameters);
    addLibraryInfo(parameters, this.config.libraryInfo);
    addApplicationTelemetry(parameters, this.config.telemetry.application);
    addThrottling(parameters);
    if (this.serverTelemetryManager) {
      addServerTelemetry(parameters, this.serverTelemetryManager);
    }
    if (!StringUtils.isEmptyObj(request.claims) || this.config.authOptions.clientCapabilities && this.config.authOptions.clientCapabilities.length > 0) {
      addClaims(parameters, request.claims, this.config.authOptions.clientCapabilities);
    }
    return mapToQueryString(parameters);
  }
}
class PublicClientApplication extends ClientApplication {
  /**
   * Important attributes in the Configuration object for auth are:
   * - clientID: the application ID of your application. You can obtain one by registering your application with our Application registration portal.
   * - authority: the authority URL for your application.
   *
   * AAD authorities are of the form https://login.microsoftonline.com/\{Enter_the_Tenant_Info_Here\}.
   * - If your application supports Accounts in one organizational directory, replace "Enter_the_Tenant_Info_Here" value with the Tenant Id or Tenant name (for example, contoso.microsoft.com).
   * - If your application supports Accounts in any organizational directory, replace "Enter_the_Tenant_Info_Here" value with organizations.
   * - If your application supports Accounts in any organizational directory and personal Microsoft accounts, replace "Enter_the_Tenant_Info_Here" value with common.
   * - To restrict support to Personal Microsoft accounts only, replace "Enter_the_Tenant_Info_Here" value with consumers.
   *
   * Azure B2C authorities are of the form https://\{instance\}/\{tenant\}/\{policy\}. Each policy is considered
   * its own authority. You will have to set the all of the knownAuthorities at the time of the client application
   * construction.
   *
   * ADFS authorities are of the form https://\{instance\}/adfs.
   */
  constructor(configuration) {
    super(configuration);
    if (this.config.broker.nativeBrokerPlugin) {
      if (this.config.broker.nativeBrokerPlugin.isBrokerAvailable) {
        this.nativeBrokerPlugin = this.config.broker.nativeBrokerPlugin;
        this.nativeBrokerPlugin.setLogger(this.config.system.loggerOptions);
      } else {
        this.logger.warning("NativeBroker implementation was provided but the broker is unavailable.");
      }
    }
    this.skus = ServerTelemetryManager.makeExtraSkuString({
      libraryName: Constants.MSAL_SKU,
      libraryVersion: version
    });
  }
  /**
   * Acquires a token from the authority using OAuth2.0 device code flow.
   * This flow is designed for devices that do not have access to a browser or have input constraints.
   * The authorization server issues a DeviceCode object with a verification code, an end-user code,
   * and the end-user verification URI. The DeviceCode object is provided through a callback, and the end-user should be
   * instructed to use another device to navigate to the verification URI to input credentials.
   * Since the client cannot receive incoming requests, it polls the authorization server repeatedly
   * until the end-user completes input of credentials.
   */
  async acquireTokenByDeviceCode(request) {
    this.logger.info("acquireTokenByDeviceCode called", request.correlationId);
    const validRequest = Object.assign(request, await this.initializeBaseRequest(request));
    const serverTelemetryManager = this.initializeServerTelemetryManager(ApiId.acquireTokenByDeviceCode, validRequest.correlationId);
    try {
      const discoveredAuthority = await this.createAuthority(validRequest.authority, validRequest.correlationId, void 0, request.azureCloudOptions);
      const deviceCodeConfig = await this.buildOauthClientConfiguration(discoveredAuthority, validRequest.correlationId, "", serverTelemetryManager);
      const deviceCodeClient = new DeviceCodeClient(deviceCodeConfig);
      this.logger.verbose("Device code client created", validRequest.correlationId);
      return await deviceCodeClient.acquireToken(validRequest);
    } catch (e) {
      if (e instanceof AuthError) {
        e.setCorrelationId(validRequest.correlationId);
      }
      serverTelemetryManager.cacheFailedRequest(e);
      throw e;
    }
  }
  /**
   * Acquires a token interactively via the browser by requesting an authorization code then exchanging it for a token.
   */
  async acquireTokenInteractive(request) {
    const correlationId = request.correlationId || this.cryptoProvider.createNewGuid();
    this.logger.trace("acquireTokenInteractive called", correlationId);
    const { openBrowser, successTemplate, errorTemplate, windowHandle, loopbackClient: customLoopbackClient, ...remainingProperties } = request;
    if (this.nativeBrokerPlugin) {
      const brokerRequest = {
        ...remainingProperties,
        clientId: this.config.auth.clientId,
        scopes: request.scopes || OIDC_DEFAULT_SCOPES,
        redirectUri: request.redirectUri || "",
        authority: request.authority || this.config.auth.authority,
        correlationId,
        extraParameters: {
          ...remainingProperties.extraQueryParameters,
          ...remainingProperties.tokenQueryParameters,
          [X_CLIENT_EXTRA_SKU]: this.skus
        },
        accountId: remainingProperties.account?.nativeAccountId
      };
      return this.nativeBrokerPlugin.acquireTokenInteractive(brokerRequest, windowHandle);
    }
    if (request.redirectUri) {
      if (!this.config.broker.nativeBrokerPlugin) {
        throw NodeAuthError.createRedirectUriNotSupportedError();
      }
      request.redirectUri = "";
    }
    const { verifier, challenge } = await this.cryptoProvider.generatePkceCodes();
    const loopbackClient = customLoopbackClient || new LoopbackClient();
    let authCodeResponse = {};
    let authCodeListenerError = null;
    try {
      const authCodeListener = loopbackClient.listenForAuthCode(successTemplate, errorTemplate).then((response) => {
        authCodeResponse = response;
      }).catch((e) => {
        authCodeListenerError = e;
      });
      const redirectUri = await this.waitForRedirectUri(loopbackClient);
      const validRequest = {
        ...remainingProperties,
        correlationId,
        scopes: request.scopes || OIDC_DEFAULT_SCOPES,
        redirectUri,
        responseMode: ResponseMode.QUERY,
        codeChallenge: challenge,
        codeChallengeMethod: CodeChallengeMethodValues.S256
      };
      const authCodeUrl = await this.getAuthCodeUrl(validRequest);
      await openBrowser(authCodeUrl);
      await authCodeListener;
      if (authCodeListenerError) {
        throw authCodeListenerError;
      }
      if (authCodeResponse.error) {
        throw new ServerError(authCodeResponse.error, authCodeResponse.error_description, authCodeResponse.suberror);
      } else if (!authCodeResponse.code) {
        throw NodeAuthError.createNoAuthCodeInResponseError();
      }
      const clientInfo = authCodeResponse.client_info;
      const tokenRequest = {
        code: authCodeResponse.code,
        codeVerifier: verifier,
        clientInfo: clientInfo || Constants$1.EMPTY_STRING,
        ...validRequest
      };
      return await this.acquireTokenByCode(tokenRequest);
    } finally {
      loopbackClient.closeServer();
    }
  }
  /**
   * Returns a token retrieved either from the cache or by exchanging the refresh token for a fresh access token. If brokering is enabled the token request will be serviced by the broker.
   * @param request - developer provided SilentFlowRequest
   * @returns
   */
  async acquireTokenSilent(request) {
    const correlationId = request.correlationId || this.cryptoProvider.createNewGuid();
    this.logger.trace("acquireTokenSilent called", correlationId);
    if (this.nativeBrokerPlugin) {
      const brokerRequest = {
        ...request,
        clientId: this.config.auth.clientId,
        scopes: request.scopes || OIDC_DEFAULT_SCOPES,
        redirectUri: request.redirectUri || "",
        authority: request.authority || this.config.auth.authority,
        correlationId,
        extraParameters: {
          ...request.tokenQueryParameters,
          [X_CLIENT_EXTRA_SKU]: this.skus
        },
        accountId: request.account.nativeAccountId,
        forceRefresh: request.forceRefresh || false
      };
      return this.nativeBrokerPlugin.acquireTokenSilent(brokerRequest);
    }
    if (request.redirectUri) {
      if (!this.config.broker.nativeBrokerPlugin) {
        throw NodeAuthError.createRedirectUriNotSupportedError();
      }
      request.redirectUri = "";
    }
    return super.acquireTokenSilent(request);
  }
  /**
   * Removes cache artifacts associated with the given account
   * @param request - developer provided SignOutRequest
   * @returns
   */
  async signOut(request) {
    if (this.nativeBrokerPlugin && request.account.nativeAccountId) {
      const signoutRequest = {
        clientId: this.config.auth.clientId,
        accountId: request.account.nativeAccountId,
        correlationId: request.correlationId || this.cryptoProvider.createNewGuid()
      };
      await this.nativeBrokerPlugin.signOut(signoutRequest);
    }
    await this.getTokenCache().removeAccount(request.account, request.correlationId);
  }
  /**
   * Returns all cached accounts for this application. If brokering is enabled this request will be serviced by the broker.
   * @returns
   */
  async getAllAccounts() {
    if (this.nativeBrokerPlugin) {
      const correlationId = this.cryptoProvider.createNewGuid();
      return this.nativeBrokerPlugin.getAllAccounts(this.config.auth.clientId, correlationId);
    }
    return this.getTokenCache().getAllAccounts();
  }
  /**
   * Attempts to retrieve the redirectUri from the loopback server. If the loopback server does not start listening for requests within the timeout this will throw.
   * @param loopbackClient - developer provided custom loopback server implementation
   * @returns
   */
  async waitForRedirectUri(loopbackClient) {
    return new Promise((resolve, reject) => {
      let ticks = 0;
      const id = setInterval(() => {
        if (LOOPBACK_SERVER_CONSTANTS.TIMEOUT_MS / LOOPBACK_SERVER_CONSTANTS.INTERVAL_MS < ticks) {
          clearInterval(id);
          reject(NodeAuthError.createLoopbackServerTimeoutError());
          return;
        }
        try {
          const r = loopbackClient.getRedirectUri();
          clearInterval(id);
          resolve(r);
          return;
        } catch (e) {
          if (e instanceof AuthError && e.errorCode === NodeAuthErrorMessage.noLoopbackServerExists.code) {
            ticks++;
            return;
          }
          clearInterval(id);
          reject(e);
          return;
        }
      }, LOOPBACK_SERVER_CONSTANTS.INTERVAL_MS);
    });
  }
}
({
  win32: `${process.env["ProgramData"]}\\AzureConnectedMachineAgent\\Tokens\\`
});
({
  win32: `${process.env["ProgramFiles"]}\\AzureConnectedMachineAgent\\himds.exe`
});
const is = {
  dev: !electron.app.isPackaged
};
({
  isWindows: process.platform === "win32",
  isMacOS: process.platform === "darwin",
  isLinux: process.platform === "linux"
});
const APP_CONFIG = {
  // Azure AD App Registration Details
  AAD_APP_CLIENT_ID: "24dc58f4-876f-4314-baa6-9c7f7510b81b",
  AAD_APP_TENANT_ID: "7ea83b4f-332d-45fa-8f1d-a9d473a22fba"
};
const __dirname$1 = path__namespace.dirname(url.fileURLToPath(require("url").pathToFileURL(__filename).href));
const AAD_APP_CLIENT_ID = APP_CONFIG.AAD_APP_CLIENT_ID;
const AAD_APP_TENANT_ID = APP_CONFIG.AAD_APP_TENANT_ID;
let mainWindow = null;
let pca;
const scopes = [
  "openid",
  "profile",
  "offline_access",
  "User.Read",
  "DelegatedAdminRelationship.ReadWrite.All",
  "Group.Read.All"
];
function createWindow() {
  mainWindow = new electron.BrowserWindow({
    width: 1400,
    height: 800,
    minWidth: 1400,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path__namespace.join(__dirname$1, "../preload/index.js"),
      contextIsolation: true,
      sandbox: false
    }
  });
  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(path__namespace.join(__dirname$1, "../renderer/index.html"));
  }
  if (is.dev) {
    mainWindow.webContents.openDevTools();
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
function validateConfig() {
  if (AAD_APP_CLIENT_ID.includes("YOUR_CLIENT_ID_HERE")) {
    throw new Error("MSAL config error: Set AAD_APP_CLIENT_ID in src/appConfig.ts");
  }
  if (AAD_APP_TENANT_ID.includes("YOUR_TENANT_ID_HERE")) {
    throw new Error("MSAL config error: Set AAD_APP_TENANT_ID in src/appConfig.ts");
  }
}
function getMsal() {
  if (!pca) {
    throw new Error("MSAL not initialized yet. Try again in a moment.");
  }
  return pca;
}
async function setupMsal() {
  validateConfig();
  const cachePath = path__namespace.join(electron.app.getPath("userData"), "msal.cache");
  const persistence = await msalNodeExtensions.PersistenceCreator.createPersistence({
    cachePath,
    dataProtectionScope: msalNodeExtensions.DataProtectionScope.CurrentUser,
    serviceName: "com.gdap.requestcreator",
    accountName: "msal-cache"
  });
  const cachePlugin = new msalNodeExtensions.PersistenceCachePlugin(persistence);
  const msalConfig = {
    auth: {
      clientId: AAD_APP_CLIENT_ID,
      authority: `https://login.microsoftonline.com/${AAD_APP_TENANT_ID}`
    },
    cache: {
      cachePlugin
    },
    system: {
      loggerOptions: {
        loggerCallback: (level, message, containsPii) => {
          if (!containsPii) console.log(`MSAL: ${message}`);
        },
        piiLoggingEnabled: false,
        logLevel: LogLevel.Info
      }
    }
  };
  pca = new PublicClientApplication(msalConfig);
}
async function getFirstAccount(msal) {
  const accounts = await msal.getTokenCache().getAllAccounts();
  return accounts.length > 0 ? accounts[0] : null;
}
if (!electron.app.requestSingleInstanceLock()) {
  electron.app.quit();
} else {
  electron.app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
  electron.app.whenReady().then(async () => {
    try {
      await setupMsal();
      createWindow();
    } catch (error) {
      console.error("Application startup failed:", error.message);
      electron.dialog.showErrorBox(
        "Configuration Error",
        `${error.message}

Please add your Azure App IDs to src/appConfig.ts and restart the application.`
      );
      electron.app.quit();
    }
  });
}
electron.app.on("window-all-closed", () => {
  if (process$1.platform !== "darwin") electron.app.quit();
});
electron.app.on("activate", () => {
  if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
});
electron.ipcMain.handle("login", async () => {
  try {
    const msal = getMsal();
    const result = await msal.acquireTokenInteractive({
      scopes,
      openBrowser: async (url2) => {
        await electron.shell.openExternal(url2);
      }
    });
    return result;
  } catch (error) {
    if (error?.errorCode === "authentication_canceled") {
      console.log("User canceled login.");
      return null;
    }
    console.error("Login failed:", error);
    electron.dialog.showErrorBox("Login Error", error?.message || "Login failed.");
    return null;
  }
});
electron.ipcMain.handle("logout", async () => {
  try {
    const msal = getMsal();
    const accounts = await msal.getTokenCache().getAllAccounts();
    for (const acc of accounts) {
      await msal.getTokenCache().removeAccount(acc);
    }
    return { success: true };
  } catch (error) {
    console.error("Logout error:", error);
    return { success: false, error: error?.message };
  }
});
electron.ipcMain.handle("get-token", async () => {
  try {
    const msal = getMsal();
    let account = await getFirstAccount(msal);
    if (!account) {
      const interactive = await msal.acquireTokenInteractive({
        scopes,
        openBrowser: async (url2) => {
          await electron.shell.openExternal(url2);
        }
      });
      account = interactive.account ?? null;
      if (!account) {
        electron.dialog.showErrorBox("Token Error", "No account returned from interactive login.");
        return null;
      }
    }
    let authResult = null;
    try {
      authResult = await msal.acquireTokenSilent({ account, scopes });
    } catch {
      authResult = await msal.acquireTokenInteractive({
        scopes,
        openBrowser: async (url2) => {
          await electron.shell.openExternal(url2);
        }
      });
    }
    if (authResult?.accessToken) {
      return { accessToken: authResult.accessToken };
    }
    electron.dialog.showErrorBox("Token Error", "No access token was returned.");
    return null;
  } catch (err) {
    electron.dialog.showErrorBox("Token Error", err?.message || "Unable to acquire token.");
    return null;
  }
});
electron.ipcMain.handle("get-account", async () => {
  try {
    const msal = getMsal();
    const acc = await getFirstAccount(msal);
    return acc ? {
      homeAccountId: acc.homeAccountId,
      username: acc.username,
      environment: acc.environment,
      tenantId: acc.tenantId,
      name: acc.name
    } : null;
  } catch {
    return null;
  }
});
const defaultsFilePath = path__namespace.join(electron.app.getPath("userData"), "user-default-roles.json");
electron.ipcMain.handle("load-default-roles", async () => {
  try {
    if (fs__namespace.existsSync(defaultsFilePath)) {
      const data = fs__namespace.readFileSync(defaultsFilePath, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error loading default roles:", error);
  }
  return null;
});
electron.ipcMain.handle("save-default-roles", async (_event, roleIds) => {
  try {
    fs__namespace.writeFileSync(defaultsFilePath, JSON.stringify(roleIds, null, 2));
    return { success: true };
  } catch (error) {
    console.error("Error saving default roles:", error);
    return { success: false, error: error?.message };
  }
});
electron.ipcMain.handle("reset-default-roles", async () => {
  try {
    if (fs__namespace.existsSync(defaultsFilePath)) {
      fs__namespace.unlinkSync(defaultsFilePath);
    }
    return { success: true };
  } catch (error) {
    console.error("Error resetting default roles:", error);
    return { success: false, error: error?.message };
  }
});
