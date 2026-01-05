/**
 * Centralized Configuration for the GDAP Request Creator.
 * Update these values to match your Azure App Registration and local environment.
 */
export const APP_CONFIG = {
  // Azure AD App Registration Details
  AAD_APP_CLIENT_ID: 'YOUR_CLIENT_ID_HERE',
  AAD_APP_TENANT_ID: 'YOUR_TENANT_ID_HERE',

  // Default roles for the initial GDAP Request creation form
  DEFAULT_REQUEST_ROLE_IDS: [
    'f2ef992c-3afb-46b9-b7cf-a126ee74c451', // Global Reader
    'fdd7a751-b60b-444a-984c-02652fe8fa1c', // Groups Administrator
    'fe930be7-5e62-47db-91af-98c3a49a38b1', // User Administrator
    '9b895d92-2cd3-44c7-9d02-a6ac2d5ea5c3', // Application Administrator
    'c4e39bd9-1100-46d3-8c65-fb160da0071f', // Authentication Administrator
    '8329153b-31d0-4727-b945-745eb3bc5f31', // Domain Name Administrator
    '29232cdf-9323-42fd-ade2-1d097af3e4de', // Exchange Administrator
    '3a2c62db-5318-420d-8d74-23affee5d9d5', // Intune Administrator
    '9f06204d-73c1-4d4c-880a-6edb90606fd8', // Microsoft Entra Joined Device Local Administrator
    '644ef478-e28f-4e28-b9dc-3fdde9aa0b1f', // Printer Administrator
    'f28a1f50-f6e7-4571-818b-6a12f2af6b6c', // SharePoint Administrator
    '69091246-20e8-4a56-aa4d-066075b2a7a8', // Teams Administrator
    '8ac3fc64-6eca-42ea-9e69-59f4c7b60eb2', // Hybrid Identity Administrator
    'eb1f4a8d-243a-41f0-9fbd-c7cdf6c5ef7c', // Insights Administrator
    '59d46f88-662b-457b-bceb-5c3809e5908f', // Lifecycle Workflows Administrator
    '11648597-926c-4cf3-9c36-bcebb0ba8dcc', // Power Platform Administrator
    '7be44c8a-adaf-4e2a-84d6-ab2649e08a13', // Privileged Authentication Administrator
    'e8611ab8-c189-46e8-94e1-60213ab1f814', // Privileged Role Administrator
    '194ae4cb-b126-40b2-bd5b-6091b380977d', // Security Administrator
  ],

  // Security Group IDs and Role Assignment Templates used in Management View
  TEMPLATES: {
    BASIC: {
      name: 'Production Basic',
      groupId: '93a9f373-a5c2-45bf-938a-589883a8eab6',
      roleIds: [
        'fdd7a751-b60b-444a-984c-02652fe8fa1c', // Groups Administrator
        'fe930be7-5e62-47db-91af-98c3a49a38b1', // User Administrator
        'f2ef992c-3afb-46b9-b7cf-a126ee74c451', // Global Reader
      ],
    },
    ADVANCED: {
      name: 'Production Advanced',
      groupId: '9b8ac96f-acf4-4ba3-8e4e-131030ea7c55',
      roleIds: [
        'fdd7a751-b60b-444a-984c-02652fe8fa1c',
        'fe930be7-5e62-47db-91af-98c3a49a38b1',
        'f2ef992c-3afb-46b9-b7cf-a126ee74c451',
        '9b895d92-2cd3-44c7-9d02-a6ac2d5ea5c3',
        'c4e39bd9-1100-46d3-8c65-fb160da0071f',
        '8329153b-31d0-4727-b945-745eb3bc5f31',
        '29232cdf-9323-42fd-ade2-1d097af3e4de',
        '3a2c62db-5318-420d-8d74-23affee5d9d5',
        '9f06204d-73c1-4d4c-880a-6edb90606fd8',
        '644ef478-e28f-4e28-b9dc-3fdde9aa0b1f',
        'f28a1f50-f6e7-4571-818b-6a12f2af6b6c',
        '69091246-20e8-4a56-aa4d-066075b2a7a8',
      ],
    },
    EXPERT: {
      name: 'Production Expert',
      groupId: '5aa99043-b220-4be8-a5c3-832705db8477',
      roleIds: [
        'fdd7a751-b60b-444a-984c-02652fe8fa1c',
        'fe930be7-5e62-47db-91af-98c3a49a38b1',
        'f2ef992c-3afb-46b9-b7cf-a126ee74c451',
        '9b895d92-2cd3-44c7-9d02-a6ac2d5ea5c3',
        'c4e39bd9-1100-46d3-8c65-fb160da0071f',
        '8329153b-31d0-4727-b945-745eb3bc5f31',
        '29232cdf-9323-42fd-ade2-1d097af3e4de',
        '3a2c62db-5318-420d-8d74-23affee5d9d5',
        '9f06204d-73c1-4d4c-880a-6edb90606fd8',
        '644ef478-e28f-4e28-b9dc-3fdde9aa0b1f',
        'f28a1f50-f6e7-4571-818b-6a12f2af6b6c',
        '69091246-20e8-4a56-aa4d-066075b2a7a8',
        'a9ea8996-122f-4c74-9520-8edcd192826c',
        '8ac3fc64-6eca-42ea-9e69-59f4c7b60eb2',
        'eb1f4a8d-243a-41f0-9fbd-c7cdf6c5ef7c',
        '59d46f88-662b-457b-bceb-5c3809e5908f',
        '11648597-926c-4cf3-9c36-bcebb0ba8dcc',
        '7be44c8a-adaf-4e2a-84d6-ab2649e08a13',
        'e8611ab8-c189-46e8-94e1-60213ab1f814',
        '194ae4cb-b126-40b2-bd5b-6091b380977d',
      ],
    }
  }
};
