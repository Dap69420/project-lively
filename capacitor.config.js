const liveUrl = process.env.CAPACITOR_SERVER_URL || '';

module.exports = {
  appId: 'com.dapmedia.vektra',
  appName: 'Vektra',
  webDir: 'public',
  bundledWebRuntime: false,
  server: Object.assign(
    { androidScheme: 'https' },
    liveUrl ? { url: liveUrl, cleartext: false } : {}
  )
};
