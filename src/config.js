class Environment {
  constructor(settings) {
    this.settings = {
      ...settings,
      cookieBrowser: 'chrome',
    };
  }
}

export default Environment;
