import fs from 'fs';
import readline from 'readline';
import converter from 'json-2-csv';
import { google as Google } from 'googleapis';
import { OAuth2Client } from 'googleapis-common';
import { TokenPayload } from 'google-auth-library/build/src/auth/loginticket';

import * as Helpers from './helpers/index';
import { Credentials } from 'google-auth-library';
import { GaxiosError } from 'gaxios';

const { OAuth2 } = Google.auth;

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/youtube-nodejs-quickstart.json
var SCOPES = ['https://www.Googleapis.com/auth/youtube.readonly'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
  process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + './config/client-secret.json';

// Load client secrets from a local file.
fs.readFile('client_secret.json', function processClientSecrets(err, content) {
  if (err) {
    console.log('Error loading client secret file: ' + err);
    return;
  }
  // Authorize a client with the loaded credentials, then call the YouTube API.
  authorize(JSON.parse(String(content)), getUploads);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials: any , callback: Function) {
  var clientSecret = credentials.installed.client_secret;
  var clientId = credentials.installed.client_id;
  var redirectUrl = credentials.installed.redirect_uris[0];
  var oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);

  var YT = Google.youtube('v3');
  var YTAnalytics = Google.youtubeAnalytics('v2');

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, function (err, token) {
    if (err) {
      getNewToken(oauth2Client, callback);
    } else {
      oauth2Client.credentials = JSON.parse(String(token));
      callback(YT, oauth2Client);
    }
  });
}
/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {Google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client: OAuth2Client, callback: Function) {
  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  console.log('Authorize this app by visiting this url: ', authUrl);
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Enter the code from that page here: ', function (code: string) {
    rl.close();
    oauth2Client.getToken(code, (err, token: any) => {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      oauth2Client.credentials = token;
      storeToken(token);
      callback(oauth2Client);
    });
  });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token: any) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code != 'EEXIST') {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
    if (err) throw err;
    console.log('Token stored to ' + TOKEN_PATH);
  });
  console.log('Token stored to ' + TOKEN_PATH);
}

/**
 * Lists the names and IDs of up to 10 files.
 *
 * @param {Google.auth.OAuth2} auth An authorized OAuth2 client.
 */
const getUploads = async (service: any, auth: any) => {
  const playlistId = 'UUctXZhXmG-kf3tlIXgVZUlw';
  let videos: any[] = [];
  let more = true;
  let pageToken;
  while (more) {
    const response: any = await getUploadBatchForPageToken(service, auth, playlistId, pageToken);
    const { items, nextPageToken } = response;
    videos = [...videos, ...items];
    pageToken = nextPageToken;
    console.log(pageToken);
    await new Promise(r => setTimeout(r, 1000));
    if (!nextPageToken) {
      more = false;
      const data = extractDesiredDataPointsForOutline(videos);
      saveVideosToCSV(data);
    }
  }
}

const getUploadBatchForPageToken = async (service: any, auth: any, playlistId: any, pakeToken: any) => {
  const payload = await service.playlistItems.list({
    auth: auth,
    part: 'snippet',
    playlistId: playlistId,
    maxResults: 50,
    pageToken: pakeToken
  });
  const { items, nextPageToken } = payload.data;
  const videos = await getDataForVideoPayload(service, auth, items);
  return { items: videos, nextPageToken };
}

const getDataForVideoPayload = async (service: any, auth: any, items: any) => {
  const ids = items.map((video: any) => video.snippet.resourceId.videoId);
  const idString = ids.join(',');
  const videos = await getDetailsForVideoIds(service, auth, idString);
  return videos;
}

const getDetailsForVideoIds = async (service: any, auth: any, idString: any) => {
  const payload = await service.videos.list({
    auth: auth,
    part: 'snippet,statistics,contentDetails',
    id: idString,
  })
  return payload.data.items;
}

const extractDesiredDataPointsForOutline = (videos: any[]) => videos.map(video => {
  let { snippet, statistics, contentDetails } = video;
  const data = deconstructDeepValues({
    ...snippet,
    ...statistics,
    ...contentDetails
  });
  return data;
});

const deconstructDeepValues = (data: any) => {
  let entries = Object.entries(data);
  return entries.reduce((acc: any, entry) => {
    let [key, value]: [any, any] = entry;
    value = adjustValue(value);
    if (value !== undefined && isValidKey(key)) {
      acc[key] = value;
    }
    return acc
  }, {})
}

const isValidKey = (key: string) => {
  const invalid = ['description'];
  return !(invalid.find(invalid => invalid === key))
}

const adjustValue = (value: any) => {
  value = adjustValueForType(value);
  value = adjustValueForKey(value);
  return value;
}

const adjustValueForType = (value: any) => {
  switch (typeof value) {
    case 'string':
      return value;
    case 'object':
      if (value.length) {
        return value.join(',')
      }
    default:
      return undefined;
  }
}

const adjustValueForKey = (value: string) => {
  switch (value) {
    case 'duration':
      return Helpers.transformISOTimestampToSeconds(value)
    default: 
      return value;  
  }
}

const metrics = [
  'views', 'redViews', 'comments', 'likes', 'dislikes', 'videosAddedToPlaylists', 'videosRemovedFromPlaylists', 'shares', 'estimatedMinutesWatched', 'estimatedRedMinutesWatched', 'averageViewDuration', 'averageViewPercentage', 'annotationClickThroughRate', 'annotationCloseRate', 'annotationImpressions', 'annotationClickableImpressions', 'annotationClosableImpressions', 'annotationClicks', 'annotationCloses', 'cardClickRate', 'cardTeaserClickRate', 'cardImpressions', 'cardTeaserImpressions', 'cardClicks', 'cardTeaserClicks', 'subscribersGained', 'subscribersLost', 'estimatedRevenue', 'estimatedAdRevenue', 'grossRevenue', 'estimatedRedPartnerRevenue', 'monetizedPlaybacks', 'playbackBasedCpm', 'adImpressions', 'cpm'
]

const saveVideosToCSV = async (data: any) => {
  const csv = await converter.json2csvAsync(data);
  fs.writeFileSync('videos.csv', csv, 'utf8');
}
