import { Actor } from 'apify';
import { CheerioCrawler } from 'crawlee';
import { VideoScrapper } from './scrapper.js';

export class InstagramReelScrapper extends VideoScrapper {
  constructor(urls) {
    super(urls);
  }

  async start() {
    const dataset = [];
    const initializeStartUrls = this.urls.map((url) => {
      return {
        url,
        userData: {
          label: 'START',
        },
      };
    });

    const crawler = new CheerioCrawler({
      requestHandler: async ({ request, json }) => {
        const videos = (json || []).map((video) => {
          return {
            ...video,
            videoId: video.shortCode,
          };
        });
        dataset.push(...videos);
      },
      maxConcurrency: 5,
      useSessionPool: true,
      persistCookiesPerSession: true,
      requestHandlerTimeoutSecs: 120,
    });

    await crawler.run(initializeStartUrls);

    return dataset.sort((a, b) => {
      // sort by timestamp (2023-12-25T15:44:18.000Z format)
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
  }

  async stop() {
    console.log('Stopping...');
  }
}
