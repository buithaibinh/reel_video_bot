import { JSONFilePreset } from 'lowdb/node';

const defaultData = {
  videos: [],
  instagram: {
    accessToken: '',
    expiresIn: 0,
    pageId: '',
  },
};
const db = await JSONFilePreset('db.json', defaultData);

export default db;
