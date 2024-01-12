class Environment {
  constructor(settings) {
    this.settings = {
      ...settings,
      cookieBrowser: 'chrome',
      // authentication: {
      //   username: process.env.INSTAGRAM_USERNAME,
      //   password: process.env.INSTAGRAM_PASSWORD,
      // }
    };
  }
}

export default Environment;
