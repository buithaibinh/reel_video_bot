import { execa } from 'execa';
import UserAgent from 'user-agents';

import Environment from '../config.js';

class Query {
  constructor() {
    this.process = null;
    this.stopped = false;

    this.environment = new Environment({
      // spoof: random user agent, empty: empty user agent, default: default user agent
      userAgent: 'spoof',
      // if set a path to a file, cookies will be used
      cookiePath: null,

      // set authentication to yt-dlp
      // username: null, // username or email
      // password: null, // password
      authentication: null,

      audioOutputFormat: 'none',
    });
  }

  stop() {
    this.stopped = true;
    if (this.process != null) {
      this.process.cancel();
    }
  }
  async start(url, args, cb) {
    if (this.stopped) return 'killed';

    args.push('--no-cache-dir');
    args.push('--ignore-config');

    if (this.environment.settings.userAgent === 'spoof') {
      console.log('spoof');
      args.push('--user-agent'); //Add random user agent to slow down user agent profiling
      args.push(`"${new UserAgent({ deviceCategory: 'desktop' }).toString()}"`);
    } else if (this.environment.settings.userAgent === 'empty') {
      args.push('--user-agent');
      args.push("''"); //Add an empty user agent string to workaround VR video issues
    }

    // TODO
    if (this.environment.settings.cookiePath !== null) {
      //Add cookie arguments if enabled
      args.push('--cookies');
      args.push(this.environment.settings.cookiePath);
    } else if (this.environment.settings.authentication !== null) {
      //Add authentication arguments if enabled
      // https://github.com/yt-dlp/yt-dlp/issues/7328
      console.log('auth with', this.environment.settings.authentication);
      args.push('--username');
      args.push(this.environment.settings.authentication.username);
      args.push('--password');
      args.push(this.environment.settings.authentication.password);
    } else if(this.environment.settings.cookieBrowser) {
      //Add cookie arguments if enabled
      args.push('--cookies-from-browser');
      args.push(this.environment.settings.cookieBrowser);
    }

    args.push(url); //Url must always be added as the final argument

    const command = 'yt-dlp';

    // print out the command
    console.log(command, args.join(' '));
    if (cb == null) {
      //Return the data after the query has completed fully.
      try {
        const { stdout } = await execa(command, args);
        return stdout;
      } catch (e) {
        console.error(e);
        return '{}';
      }
    } else {
      //Return data while the query is running (live)
      //Return "done" when the query has finished
      return await new Promise((resolve) => {
        this.process = execa(command, args);
        this.process.stdout.setEncoding('utf8');
        this.process.stdout.on('data', (data) => {
          cb(data.toString());
        });
        this.process.stdout.on('close', () => {
          if (this.process.killed) {
            cb('killed');
            resolve('killed');
          } else {
            cb('done');
            resolve('done');
          }
        });
        this.process.stderr.on('data', (data) => {
          cb(data.toString());
          console.error(data.toString());
        });
      });
    }
  }
}
export default Query;
