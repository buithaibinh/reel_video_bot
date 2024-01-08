import Query from './Query.js';

/**
 * This class is responsible for downloading a video.
 */
class DownloadQuery extends Query {
  constructor(url, video = {}, options = {}) {
    super();
    this.url = url;
    this.video = video;
    this.options = options;
  }

  cancel() {
    super.stop();
  }

  async connect() {
    // if download audio only
    let args = [];
    if (this.options.audioOnly) {
      // args.push('-x');
      // args.push('--audio-format');
      // args.push('mp3');
      console.log('DownloadQuery: audio only');

      // Download the best audio-only format
      args.push('-f');
      args.push('bestaudio[ext=m4a]');
    } else {
      const height = this.options.height || 720;
      const fps = this.options.fps || 30;
      const encoding = this.options.encoding || '';
      // video only
      // Download the best video available but no better than height(),
      // or the worst video if there is no video under 720p
      if (this.options.videoOnly) {
        console.log('DownloadQuery: video only');
        // download video only (no audio) but no better than height()
        args.push('-f');
        // args.push('bv');
        args.push(`bv[height<=${height}]`);
      } else {
        console.log('DownloadQuery: video and audio');
        // Download the best video available but no better than height(),
        // or the worst video if there is no video under 720p
        args.push('-f');
        args.push(`bv*[height<=${height}]+ba[ext=m4a]/b[ext=mp4] / bv*+ba/b`);
      }
    }

    // trim video
    if (this.options.trim) {
      // add downloader
      args.push('--downloader');
      args.push('ffmpeg');

      // add trim
      args.push('--downloader-args');
      args.push(
        `ffmpeg_i:-ss ${this.options.trim.start} -to ${this.options.trim.end}`
      );
    }

    // set output
    args.push('-o');
    args.push(`./videos/%(id)s.%(ext)s`);

    let result = null;
    try {
      // print the command
      result = await this.start(this.url, args, (liveData) => {
        const perLine = liveData.split('\n');
        for (const line of perLine) {
          this.video.setFilename(line);
          if (line.lastIndexOf('[download]') !== line.indexOf('[download]')) {
            const splitLines = line.split('[');
            for (const splitLine of splitLines) {
              if (splitLine.trim() !== '') {
                console.log(this.video.identifier, '[' + splitLine.trim());
              }
            }
          } else {
            console.log(this.video.identifier, line);
          }
        }
        if (!liveData.includes('[download]')) return;

        let liveDataArray = liveData.split(' ').filter((el) => {
          return el !== '';
        });
        if (liveDataArray.length > 10) return;
        liveDataArray = liveDataArray.filter((el) => {
          return el !== '\n';
        });
        let percentage = liveDataArray[1];
        let speed = liveDataArray[5];
        let eta = liveDataArray[7];
      });
    } catch (exception) {
      console.error(exception);
      return exception;
    }

    // console.log('DownloadQuery: result', this.video);
    // sometimes the filename like this: C1SA1AZLy9a.fdash-1564340170996618ad.m4a
    // we need to remove the `fdash-1564340170996618ad` part
    const dots = this.video.filename?.split('.');
    if (dots?.length > 2) {
      this.video.filename = `${dots[0]}.${dots[2]}`;
    }
    return {
      result: !!this.video.filename,
      path: `./videos/${this.video.identifier}.mp4`,
    };
  }
}
export default DownloadQuery;
