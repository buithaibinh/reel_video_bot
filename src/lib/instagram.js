import axios from 'axios';
import { IgApiClient } from 'instagram-private-api';
import { readFile } from 'fs/promises';
import {
  GetUserLongLivedTokenRequest,
  GetLinkedInstagramAccountRequest,
  GetAuthorizedFacebookPagesRequest,
} from 'instagram-graph-api';

const GRAPH_API_VERSION = 'v18.0';
const getStatusOfUpload = async (accessToken, igContainerId) => {
  const response = await axios.get(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${igContainerId}`,
    { params: { access_token: accessToken, fields: 'status_code' } }
  );

  return response.data.status_code;
};

const publishMediaContainer = async (
  accessToken,
  instagramAccountId,
  creationId
) => {
  const response = await axios.post(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${instagramAccountId}/media_publish`,
    { access_token: accessToken, creation_id: creationId }
  );

  return response.data;
};

const fetchPermalink = async (accessToken, mediaId) => {
  const response = await axios.get(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${mediaId}`,
    { params: { access_token: accessToken, fields: 'permalink' } }
  );

  return response.data;
};

const uploadReelsToContainer = async (
  accessToken,
  instagramAccountId,
  caption,
  videoUrl,
  coverUrl
) => {
  console.log('viodeo url', videoUrl);
  const response = await axios.post(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${instagramAccountId}/media`,
    {
      access_token: accessToken,
      caption,
      media_type: 'REELS',
      video_url: videoUrl,
      cover_url: coverUrl,
    }
  );

  return response.data;
};

export const postInstagramReel = async ({
  accessToken,
  pageId,
  description,
  thumbnailUrl,
  videoUrl,
}) => {
  const { id: containerId } = await uploadReelsToContainer(
    accessToken,
    pageId,
    description,
    videoUrl,
    thumbnailUrl
  );

  let status = null;
  while (status !== 'FINISHED') {
    status = await getStatusOfUpload(accessToken, containerId);
    // eslint-disable-next-line no-promise-executor-return
    await new Promise((r) => setTimeout(r, 1000));
  }

  const { id: creationId } = await publishMediaContainer(
    accessToken,
    pageId,
    containerId
  );

  const { permalink } = await fetchPermalink(accessToken, creationId);

  return { creationId, permalink };
};

const ig = new IgApiClient();
const login = async () => {
  // basic login-procedure
  ig.state.generateDevice(process.env.INSTAGRAM_USERNAME);
  await ig.account.login(
    process.env.INSTAGRAM_USERNAME,
    process.env.INSTAGRAM_PASSWORD
  );
};

export const publishVideoByPrivateApi = async ({
  videoPath,
  coverImage,
  caption = 'Demo',
}) => {
  await login();

  console.log('logged in!');
  process.nextTick(async () => await ig.simulate.postLoginFlow());

  const publishResult = await ig.publish.video({
    video: await readFile(videoPath),
    caption,
    coverImage: await readFile(coverImage),
  });

  console.log(publishResult);
};

const getFacebookPageId = async (accessToken) => {
  const request = new GetAuthorizedFacebookPagesRequest(accessToken);
  const pagesResponse = await request.execute();
  const pages = pagesResponse.getAuthorizedFacebookPages();
  if (!pages.length) {
    throw new Error('No pages found. Please authorize your Facebook page.');
  }
  console.log('pages', pages);
  const firstFacebookPage = pages[0].id;
  return firstFacebookPage;
};

export const getInstagramPageId = async (accessToken) => {
  const facebookPageId = await getFacebookPageId(accessToken);
  const request = new GetLinkedInstagramAccountRequest(
    accessToken,
    facebookPageId
  );

  const response = await request.execute();
  console.log('response', response);
  const pageId = response.getInstagramPageId();
  return pageId;
};

export const generateLongLivedAccessToken = async ({
  accessToken,
  appId,
  appSecret,
}) => {
  // const request = new GetUserLongLivedTokenRequest(
  //   accessToken,
  //   appId,
  //   appSecret
  // );
  // const response = await request.execute();
  // console.log('response', response.getData());
  // const data = response.getData();
  // return data;

  const response = await axios.get(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/oauth/access_token`,
    {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: accessToken,
      },
    }
  );
  // const longLivedToken = response.data.access_token;
  return response.data;
};

export const getInstagramPosts = async (accessToken, userId) => {
  const response = await axios.get(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${userId}/media`,
    {
      params: {
        access_token: accessToken,
      },
    }
  );
  return response.data;
}