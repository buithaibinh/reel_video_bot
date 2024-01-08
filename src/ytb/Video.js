import Utils from './Utils.js';
import path from 'path';

class Video {
  constructor(url, type, identifier) {
    this.url = url;
    this.type = type;
    this.audioQuality = 'best';
    this.audioOnly = false;
    this.videoOnly = false;
    this.videoOnlySizeCache = [];
    this.downloadSubs = false;
    this.subLanguages = [];
    this.selectedSubs = [];
    this.downloadingAudio = false;
    this.webpage_url = this.url;
    this.hasMetadata = false;
    this.downloaded = false;
    this.error = false;
    this.filename = null;
    this.identifier = identifier || Utils.getRandomID(32);
  }

  setFilename(liveData) {
    if (liveData.includes('[download] Destination: ')) {
      const replaced = liveData.replace('[download] Destination: ', '');
      this.filename = path.basename(replaced);
    } else if (liveData.includes('[ffmpeg] Merging formats into "')) {
      const noPrefix = liveData.replace('[ffmpeg] Merging formats into "', '');
      this.filename = path.basename(noPrefix.trim().slice(0, -1));
    } else if (liveData.includes("[ffmpeg] Adding metadata to '")) {
      const noPrefix = liveData.replace("[ffmpeg] Adding metadata to '", '');
      this.filename = path.basename(noPrefix.trim().slice(0, -1));
    }
  }

  serialize() {
    let formats = [];
    for (const format of this.formats) {
      formats.push(format.serialize());
    }
    return {
      like_count: Utils.numberFormatter(this.like_count, 2),
      dislike_count: Utils.numberFormatter(this.dislike_count, 2),
      description: this.description,
      view_count: Utils.numberFormatter(this.view_count, 2),
      title: this.title,
      tags: this.tags,
      duration: this.duration,
      extractor: this.extractor,
      thumbnail: this.thumbnail,
      uploader: this.uploader,
      average_rating: this.average_rating,
      url: this.url,
      formats: formats,
    };
  }

  selectHighestQuality() {
    this.formats.sort((a, b) => {
      return (
        parseInt(b.height, 10) - parseInt(a.height, 10) ||
        (a.fps == null) - (b.fps == null) ||
        parseInt(b.fps, 10) - parseInt(a.fps, 10)
      );
    });
    return 0;
  }

  getFormatFromLabel(formatLabel) {
    for (const format of this.formats) {
      if (format.getDisplayName() === formatLabel) {
        return format;
      }
    }
  }
}

export default Video;
