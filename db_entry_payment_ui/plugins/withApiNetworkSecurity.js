const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Team-test APKs may use an HTTP IP endpoint. Allow cleartext only for the
// configured API host; HTTPS builds retain Android's default secure policy.
module.exports = function withApiNetworkSecurity(config) {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!apiUrl) return config;
  const endpoint = new URL(apiUrl);
  if (!['http:', 'https:'].includes(endpoint.protocol)) {
    throw new Error('EXPO_PUBLIC_API_URL must use HTTP or HTTPS.');
  }
  if (endpoint.protocol === 'https:') return config;
  if (!/^[a-zA-Z0-9.-]+$/.test(endpoint.hostname)) {
    throw new Error('Unsupported API hostname.');
  }
  config = withAndroidManifest(config, (mod) => {
    const app = mod.modResults.manifest.application[0];
    app.$['android:networkSecurityConfig'] = '@xml/api_network_security';
    return mod;
  });
  return withDangerousMod(config, ['android', async (mod) => {
    const resourceDir = path.join(mod.modRequest.platformProjectRoot, 'app/src/main/res/xml');
    fs.mkdirSync(resourceDir, { recursive: true });
    fs.writeFileSync(path.join(resourceDir, 'api_network_security.xml'),
      `<?xml version="1.0" encoding="utf-8"?>\n<network-security-config>\n  <base-config cleartextTrafficPermitted="false" />\n  <domain-config cleartextTrafficPermitted="true">\n    <domain includeSubdomains="false">${endpoint.hostname}</domain>\n  </domain-config>\n</network-security-config>\n`);
    return mod;
  }]);
};
