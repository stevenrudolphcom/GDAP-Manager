/**
 * Centralized Configuration for the GDAP Request Creator.
 * Update these values to match your Azure App Registration and local environment.
 */
export const APP_CONFIG = {
  // App version info for display
  ROOT_VERSION: '1.4.0',
  ROOT_AUTHOR: 'Jarno Kurki',
  SUB_VERSION: '1.5.0',
  SUB_CONTRIBUTOR: 'Steven Rudolph',

  // Azure AD App Registration Details
  AAD_APP_CLIENT_ID: '24dc58f4-876f-4314-baa6-9c7f7510b81b',
  AAD_APP_TENANT_ID: '7ea83b4f-332d-45fa-8f1d-a9d473a22fba',

  // Security Group IDs and Role Assignment Templates used in Management View
  TEMPLATES: {
    CSCT_M365_Billing: {
      roleIds: [
        'b0f54661-2d74-4c50-afa3-1ec803f12efe', // Billing Administrator
        '4d6ac14f-3453-41d0-bef9-a3e0c569773a', // License Administrator
      ],
    },
    CSCT_M365_1stServiceDesk: {
      roleIds: [
        '194ae4cb-b126-40b2-bd5b-6091b380977d', // Authentication Administrator
        '0f971eea-41eb-4569-a71e-57bb8a3eff1e', // Cloud Device Administrator
        '29232cdf-9323-42fd-ade2-1d097af3e4de', // Exchange Recipient Administrator
        'f2ef992c-3afb-46b9-b7cf-a126ee74c451', // Global Reader
        '729827e3-9c14-49f7-bb1b-9608f156bbb8', // Helpdesk Administrator
        '3a2c62db-5318-420d-8d74-23affee5d9d5', // Intune Administrator
        '7be44c8a-adaf-4e2a-84d6-ab2649e08a13', // Privileged Authentication Administrator
        '5d6b6bb7-de71-4623-b4af-96380a352509', // Security Reader
        '4ba39ca4-527c-499a-b93d-d9b492c50246', // Teams Communications Administrator
        'fe930be7-5e62-47db-91af-98c3a49a38b1', // User Administrator
      ],
    },
    CSCT_M365_2ndServiceDesk: {
      roleIds: [
        'c4e39bd9-1100-46d3-8c65-fb160da0071f', // Authentication Administrator
        '158c047a-c907-4556-b7ef-446551a6b5f7', // Cloud Application Administrator
        '7698a772-787b-4ac8-901f-60d6b08affd2', // Cloud Device Administrator
        '29232cdf-9323-42fd-ade2-1d097af3e4de', // Exchange Administrator
        '31392ffb-586c-42d1-9346-e59415a2cc4e', // Exchange Recipient Administrator
        'f2ef992c-3afb-46b9-b7cf-a126ee74c451', // Global Reader
        'fdd7a751-b60b-444a-984c-02652fe8fa1c', // Groups Administrator
        '729827e3-9c14-49f7-bb1b-9608f156bbb8', // Helpdesk Administrator
        '4d6ac14f-3453-41d0-bef9-a3e0c569773a', // License Administrator
        '790c1fb9-7f7d-4f88-86a1-ef1f95c05c1b', // Message Center Reader
        '966707d0-3269-4727-9be2-8c3a10f19b9d', // Password Administrator
        '11648597-926c-4cf3-9c36-bcebb0ba8dcc', // Power Platform Administrator
        '5d6b6bb7-de71-4623-b4af-96380a352509', // Security Reader
        'f28a1f50-f6e7-4571-818b-6a12f2af6b6c', // SharePoint Administrator
        '75941009-915a-4869-abe7-691bff18279e', // Skype for Business Administrator
        'fcf91098-03e3-41a9-b5ba-6f0ec8188a12', // Teams Communications Support Specialist
      ],
    },
    CSCT_M365_3rdServiceDesk: {
      roleIds: [
        '9b895d92-2cd3-44c7-9d02-a6ac2d5ea5c3', // Application Administrator
        'cf1c38e5-3621-4004-a7cb-879624dced7c', // Application Developer
        '9c6df0f2-1e7c-4dc3-b195-66dfbd24aa8f', // Attack Payload Author
        'c430b396-e693-46cc-96f3-db01bf8bb62a', // Attack Simulation Administrator
        'c4e39bd9-1100-46d3-8c65-fb160da0071f', // Authentication Administrator
        '25a516ed-2fa0-40ea-a2d0-12923a21473a', // Authentication Extensibility Administrator
        'e3973bdf-4987-49ae-837a-ba8e231c7286', // Azure DevOps Administrator
        '7495fdc4-34c4-4d15-a289-98788ce399fd', // Azure Information Protection Administrator
        'b0f54661-2d74-4c50-afa3-1ec803f12efe', // Billing Administrator
        '158c047a-c907-4556-b7ef-446551a6b5f7', // Cloud Application Administrator
        '7698a772-787b-4ac8-901f-60d6b08affd2', // Cloud Device Administrator
        '17315797-102d-40b4-93e0-432062caca18', // Compliance Administrator
        'b1be1c3e-b65d-4f19-8427-f6fa0d97feb9', // Conditional Access Administrator
        '38a96431-2bdf-4b4c-8b6e-5d3d8abac1a4', // Desktop Analytics Administrator
        '88d8e3e3-8f55-4a1e-953a-9b9898b8876b', // Directory Readers
        'd29b2b05-8046-44ba-8758-1e26182fcf32', // Directory Synchronization Accounts
        '9360feb5-f418-4baa-8175-e2a00bac4301', // Directory Writers
        '8329153b-31d0-4727-b945-745eb3bc5f31', // Domain Name Administrator
        '44367163-eba1-44c3-98af-f5787879f96a', // Dynamics 365 Administrator
        '29232cdf-9323-42fd-ade2-1d097af3e4de', // Exchange Administrator
        '31392ffb-586c-42d1-9346-e59415a2cc4e', // Exchange Recipient Administrator
        'be2f45a1-457d-42af-a067-6ec1fa63bc45', // External Identity Provider Administrator
        'f2ef992c-3afb-46b9-b7cf-a126ee74c451', // Global Reader
        'fdd7a751-b60b-444a-984c-02652fe8fa1c', // Groups Administrator
        '95e79109-95c0-4d8e-aee3-d01accf2d47b', // Guest Inviter
        '729827e3-9c14-49f7-bb1b-9608f156bbb8', // Helpdesk Administrator
        '8ac3fc64-6eca-42ea-9e69-59f4c7b60eb2', // Hybrid Identity Administrator
        'eb1f4a8d-243a-41f0-9fbd-c7cdf6c5ef7c', // Insights Administrator
        '3a2c62db-5318-420d-8d74-23affee5d9d5', // Intune Administrator
        '4d6ac14f-3453-41d0-bef9-a3e0c569773a', // License Administrator
        'ac16e43d-7b2d-40e0-ac05-243ff356ab5b', // Message Center Privacy Reader
        '790c1fb9-7f7d-4f88-86a1-ef1f95c05c1b', // Message Center Reader
        '9f06204d-73c1-4d4c-880a-6edb90606fd8', // Microsoft Entra Joined Device Local Administrator
        'd37c8bed-0711-4417-ba38-b4abe66ce4c2', // Network Administrator
        '2b745bdf-0803-4d80-aa65-822c4493daac', // Office Apps Administrator
        '966707d0-3269-4727-9be2-8c3a10f19b9d', // Password Administrator
        '11648597-926c-4cf3-9c36-bcebb0ba8dcc', // Power Platform Administrator
        '644ef478-e28f-4e28-b9dc-3fdde9aa0b1f', // Printer Administrator
        'e8cef6f1-e4bd-4ea8-bc07-4b8d950f4477', // Printer Technician
        '7be44c8a-adaf-4e2a-84d6-ab2649e08a13', // Privileged Authentication Administrator
        'e8611ab8-c189-46e8-94e1-60213ab1f814', // Privileged Role Administrator
        '4a5d8f65-41da-4de4-8968-e035b65339cf', // Reports Reader
        '0964bb5e-9bdb-4d7b-ac29-58e794862a40', // Search Administrator
        '8835291a-918c-4fd7-a9ce-faa49f0cf7d9', // Search Editor
        '194ae4cb-b126-40b2-bd5b-6091b380977d', // Security Administrator
        '5f2222b1-57c3-48ba-8ad5-d4759f1fde6f', // Security Operator
        '5d6b6bb7-de71-4623-b4af-96380a352509', // Security Reader
        'f023fd81-a637-4b56-95fd-791ac0226033', // Service Support Administrator
        'f28a1f50-f6e7-4571-818b-6a12f2af6b6c', // SharePoint Administrator
        '75941009-915a-4869-abe7-691bff18279e', // Skype for Business Administrator
        '69091246-20e8-4a56-aa4d-066075b2a7a8', // Teams Administrator
        'baf37b3a-610e-45da-9e62-d9d1e5e8914b', // Teams Communications Administrator
        'f70938a0-fc10-4177-9e90-2178f8765737', // Teams Communications Support Engineer
        'fcf91098-03e3-41a9-b5ba-6f0ec8188a12', // Teams Communications Support Specialist
        '3d762c5a-1b6c-493f-843e-55a3b42923d4', // Teams Devices Administrator
        'aa38014f-0993-46e9-9b45-30501a20909d', // Teams Telephony Administrator
        '112ca1a2-15ad-4102-995e-45b0bc479a6a', // Tenant Creator
        '75934031-6c7e-415a-99d7-48dbd49e875e', // Usage Summary Reports Reader
        'fe930be7-5e62-47db-91af-98c3a49a38b1', // User Administrator
        '11451d60-acb2-45eb-a7d6-43d0f0125c13', // Windows 365 Administrator
      ],
    },
    CSCT_M365_Device: {
      roleIds: [
        '3a2c62db-5318-420d-8d74-23affee5d9d5', // Intune Administrator
      ],
    },
    CSCT_M365_Education: {
      roleIds: [
        'f2ef992c-3afb-46b9-b7cf-a126ee74c451', // Global Reader
      ],
    },
    CSCT_M365_eLearning: {
      roleIds: [
        '95e79109-95c0-4d8e-aee3-d01accf2d47b', // Guest Inviter
        '790c1fb9-7f7d-4f88-86a1-ef1f95c05c1b', // Message Center Reader
        'fe930be7-5e62-47db-91af-98c3a49a38b1', // User Administrator
      ],
    },
    CSCT_M365_Endpoint: {
      roleIds: [
        'f2ef992c-3afb-46b9-b7cf-a126ee74c451', // Global Reader
        'fdd7a751-b60b-444a-984c-02652fe8fa1c', // Groups Administrator
        '729827e3-9c14-49f7-bb1b-9608f156bbb8', // Helpdesk Administrator
        '3a2c62db-5318-420d-8d74-23affee5d9d5', // Intune Administrator
        '9f06204d-73c1-4d4c-880a-6edb90606fd8', // Microsoft Entra Joined Device Local Administrator
        '194ae4cb-b126-40b2-bd5b-6091b380977d', // Security Administrator
        'fe930be7-5e62-47db-91af-98c3a49a38b1', // User Administrator
      ],
    },
    CSCT_AZ_ISB: {
      roleIds: [
        'f2ef992c-3afb-46b9-b7cf-a126ee74c451', // Global Reader
        '790c1fb9-7f7d-4f88-86a1-ef1f95c05c1b', // Message Center Reader
        'ac16e43d-7b2d-40e0-ac05-243ff356ab5b', // Message Center Privacy Reader
        '194ae4cb-b126-40b2-bd5b-6091b380977d', // Security Administrator
      ],
    },
    CSCT_AZ_Desktop: {
      roleIds: [
        '88d8e3e3-8f55-4a1e-953a-9b9898b8876b', // Directory Readers
      ],
    },
    CSCT_AZ_Administration: {
      roleIds: [
        '88d8e3e3-8f55-4a1e-953a-9b9898b8876b', // Directory Readers
      ],
    },
    CSCT_AZ_Database: {
      roleIds: [
        '88d8e3e3-8f55-4a1e-953a-9b9898b8876b', // Directory Readers
      ],
    },
    CSCT_AZ_Network: {
      roleIds: [
        '88d8e3e3-8f55-4a1e-953a-9b9898b8876b', // Directory Readers
      ],
    },
    CSCT_AZ_Onboarding: {
      roleIds: [
        '88d8e3e3-8f55-4a1e-953a-9b9898b8876b', // Directory Readers
      ],
    },
    CSCT_M365_Development: {
      roleIds: [
        '88d8e3e3-8f55-4a1e-953a-9b9898b8876b', // Directory Readers
      ],
    },
    CSCT_M365_Telephony: {
      roleIds: [
        '75941009-915a-4869-abe7-691bff18279e', // Skype for Business Administrator
        '69091246-20e8-4a56-aa4d-066075b2a7a8', // Teams Administrator
        'baf37b3a-610e-45da-9e62-d9d1e5e8914b', // Teams Communications Administrator
        'f70938a0-fc10-4177-9e90-2178f8765737', // Teams Communications Support Engineer
        '3d762c5a-1b6c-493f-843e-55a3b42923d4', // Teams Devices Administrator
      ],
    },
    CSCT_M365_Compliance: {
      roleIds: [
        'f2ef992c-3afb-46b9-b7cf-a126ee74c451', // Global Reader
        '790c1fb9-7f7d-4f88-86a1-ef1f95c05c1b', // Message Center Reader
        'ac16e43d-7b2d-40e0-ac05-243ff356ab5b', // Message Center Privacy Reader
      ],
    }
  }
};
