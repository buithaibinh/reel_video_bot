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
import { postInstagramReel } from './lib/instagram.js';
import db from './lib/db.js';
import config from './config.js';

dotenv.config();

const logger = createLogger('main');

const limiter = new Bottleneck({
  maxConcurrent: 1, // maximum 1 request at a time
  minTime: 333, // maximum 3 requests per second
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
  const { url, videoId, caption = '', hashtags = [], ownerUsername } = video;
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

    //
    const description = `${caption}\n\nCredit: @${ownerUsername}\n\n${config.hashtags.join(
      ' '
    )}`;
    const { creationId, permalink: instagramUrl } = await postInstagramReel({
      accessToken: instagramAccessToken,
      pageId: instagramPageId,
      description: description,
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
      video.creationId = creationId;
      video.originalHashtags = hashtags;
      video.ownerUsername = ownerUsername;
      video.originalDescription = caption;
      video.description = description;
      video.hashtags = config.hashtags;
      video.error = '';
      video.updatedAt = new Date().toISOString();
    });

    // sleep 10s avoid rate limit
    logger.info('Posted video to instagram successfully', instagramUrl);
    logger.info('Sleep 10s to avoid rate limit');
    await sleep(10000);
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

let instagramAccessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
let instagramPageId = process.env.INSTAGRAM_PAGE_ID;
const run = async () => {
  logger.info('=== START ===');
  const apiURL = process.env.APIFY_INSTAGRAM_REEL_URL;
  const scraper = new InstagramReelScrapper([apiURL]);
  let videos = await scraper.start();
  logger.info('Got total videos from instagram', videos.length);
  videos = videos.splice(0, config.maxNumberOfVideos)
  logger.info('Got total videos from instagram after filter', videos.length);
  for (const video of videos) {
    await processTask(video);
  }
  logger.info('=== END ===');
};

run();
