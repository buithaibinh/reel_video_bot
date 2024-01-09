/* eslint-disable no-await-in-loop */
import * as dotenv from 'dotenv';
import Bottleneck from 'bottleneck';
import DownloadQuery from './ytb/DownloadQuery.js';
import Video from './ytb/Video.js';
import { uploadFileToS3, getSignedDownloadUrl } from './lib/s3.js';
import { createLogger } from './logger.js';
import fs from 'fs';
import { readFile } from 'fs/promises';

import { InstagramReelScrapper } from './video_scraper/instagram.js';
import {
  postInstagramReel,
  generateLongLivedAccessToken,
} from './lib/instagram.js';
import db from './lib/db.js';

dotenv.config();

const logger = createLogger('main');

const limiter = new Bottleneck({
  maxConcurrent: 1, // maximum 1 request at a time
  minTime: 333, // maximum 3 requests per second
});

/**
 * use ytb-dl to download video and save to local
 * @param {*} url
 * @returns
 */
const downloadVideo = async (item) => {
  try {
    const { url } = item;
    const video = new Video(url, 'single', item.videoId);
    const downloader = new DownloadQuery(video.url, video);
    const result = await downloader.connect();
    return result;
  } catch (error) {
    logger.error(error);
    throw new Error('Download video failed:' + error.message);
  }
};

/**
 * Upload video to server, return url of video on server.
 * We will use this url to publish video to instagram
 * @param {*} path
 */
const uploadVideoToServer = async (path) => {
  try {
    // TODO, try to upload video to s3 first
    // ask customer to provide s3 bucket name, access key, secret key
    const BUCKET_NAME = process.env.S3_BUCKET_NAME;
    const s3Path = `downloads/${Date.now()}/${path.split('/').pop()}`;
    const fileContent = await readFile(path);

    await uploadFileToS3({
      key: s3Path,
      file: fileContent,
      bucketName: BUCKET_NAME,
      contentType: 'video/mp4',
    });

    logger.info('Uploaded video to s3 successfully');

    // get  signed url of video on s3
    const signedUrl = await getSignedDownloadUrl({
      bucketName: BUCKET_NAME,
      key: s3Path,
    });

    logger.info('Got signed url of video on s3 successfully', signedUrl);

    return signedUrl;
  } catch (error) {
    logger.error(error);
    throw new Error('Upload video to server failed:' + error.message);
  }
};

const processTask = async (video) => {
  const { url, videoId } = video;
  try {
    logger.info('==== START process ====', url);
    // get video info from db
    const { videos } = db.data;
    const videoInfo = videos.find((item) => item.videoId === videoId);

    if (videoInfo && videoInfo.status === 'done') {
      logger.info('Video already processed', url);
      return;
    }

    // save video to db
    await db.update(({ videos }) => {
      const video = videos.find((item) => item.videoId === videoId);
      if (video) {
        video.status = 'processing';
        video.updatedAt = new Date().toISOString();
        return;
      }
      videos.push({
        url,
        videoId,
        status: 'processing',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    // 1. download video
    const { result, path } = await downloadVideo(video);

    if (!result) {
      logger.error('Downloaded video failed', path);
      await db.update(({ videos }) => {
        const video = videos.find((item) => item.videoId === videoId);
        video.status = 'error';
        video.error = 'Downloaded video failed';
        video.updatedAt = new Date().toISOString();
      });
      return;
    }

    logger.info('Downloaded video successfully', path);

    // 2. upload video to server
    const urlOnServer = await uploadVideoToServer(path);
    logger.info('Uploaded video to server successfully', urlOnServer);

    // 3. delete video on local,
    fs.unlinkSync(path);

    const { creationId, permalink: instagramUrl } = await postInstagramReel({
      accessToken: instagramAccessToken,
      pageId: instagramPageId,
      description: 'This is the best real ever #Reels4Real #Reels',
      videoUrl: urlOnServer,
    }).catch((error) => {
      logger.error('Error when publish video to instagram', error);
      throw new Error('Publish video to instagram failed:' + error.message);
    });

    // 5. update video status to db
    await db.update(({ videos }) => {
      const video = videos.find((item) => item.videoId === videoId);
      video.status = 'done';
      video.instagramUrl = instagramUrl;
      video.urlOnServer = urlOnServer;
      video.error = '';
      video.updatedAt = new Date().toISOString();
    });
  } catch (error) {
    logger.error('Error when processing task', error);

    // update video status to db
    await db.update(({ videos }) => {
      const video = videos.find((item) => item.videoId === videoId);
      video.status = 'error';
      video.error = error.message;
      video.updatedAt = new Date().toISOString();
    });
  } finally {
    logger.info('=== END process ===', url);
  }
};

let instagramAccessToken = null;
let instagramPageId = null;
const run = async () => {
  logger.info('=== START ===');
  const apiURL = process.env.APIFY_INSTAGRAM_REEL_URL;
  const scraper = new InstagramReelScrapper([apiURL]);
  // get long lived token from db
  const instagram = db.data.instagram || {};
  const { accessToken } = instagram;
  if (accessToken) {
    console.log('=== Got long lived token from db ===');
    instagramAccessToken = accessToken;
  } else {
    logger.info('=== Generate long lived token based on short lived token ===');
    const res = await generateLongLivedAccessToken({
      accessToken: process.env.INSTAGRAM_ACCESS_TOKEN,
      appId: process.env.FACEBOOK_APP_ID,
      appSecret: process.env.FACEBOOK_APP_SECRET,
    });

    logger.info('Got long lived token successfully', res);
    const { access_token, expires_in } = res || {};
    instagramAccessToken = access_token;
    // get instagram page id and save to db
    instagramPageId = process.env.INSTAGRAM_PAGE_ID;
    logger.info('Got instagram page id successfully', instagramPageId);

    // save long lived token and instagram page id to db
    // in the next time, we will use this token to publish video to instagram
    await db.update(({ instagram = {} }) => {
      instagram.accessToken = instagramAccessToken;
      instagram.expiresIn = expires_in;
      instagram.pageId = instagramPageId;
    });
  }

  const videos = await scraper.start();

  for (const video of videos.splice(0, 1)) {
    await processTask(video);
    // sleep 10s avoid rate limit
    logger.info('Sleep 10s. If not, Instagram will block us :(');
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }
  logger.info('=== END ===');

  // limiter.schedule(() => {
  //   // TODO, for testing, we only process 1 video
  //   const allTasks = videos.map((video) => processTask(video));
  //   return Promise.allSettled(allTasks);
  // });
};

run();
