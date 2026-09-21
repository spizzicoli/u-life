const config = {
  appId: 'com.taccuino.app',
  appName: 'U-Life',
  webDir: 'www',
  backgroundColor: '#EBF8FF',
  server: {
    // url: 'http://TUO-IP-LOCALE:5173',
    // cleartext: true
  },
  ios: {
    contentInset: 'never'
  },
  android: {
    allowMixedContent: false
  },
  plugins: {
    LocalNotifications: {
      iconColor: '#0582CA',
      sound: 'default'
    }
  }
};

module.exports = config;
