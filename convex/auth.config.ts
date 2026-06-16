// WorkOS AuthKit JWT validation. Requires WORKOS_CLIENT_ID on the deployment
// (set automatically by AuthKit auto-provisioning, see convex.json).
const clientId = process.env.WORKOS_CLIENT_ID;

export default {
  providers: [
    {
      type: "customJwt",
      issuer: "https://api.workos.com/",
      algorithm: "RS256",
      jwks: `https://api.workos.com/sso/jwks/${clientId}`,
      applicationID: clientId,
    },
    {
      type: "customJwt",
      issuer: `https://api.workos.com/user_management/${clientId}`,
      algorithm: "RS256",
      jwks: `https://api.workos.com/sso/jwks/${clientId}`,
    },
  ],
};
