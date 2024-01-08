import { getInstagramPosts } from './lib/instagram.js';

(async () => {
  console.log('Hello world');
  const posts = await getInstagramPosts(
    process.env.INSTAGRAM_ACCESS_TOKEN,
    'minokapi'
  );
  console.log(posts);
})();
