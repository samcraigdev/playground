import * as DotEnv from "dotenv";

import * as Instagram from "utils/instagram";
import * as Airtable from "utils/airtable";
import * as Common from "utils/common";

DotEnv.config();

const AirtableClient = new Airtable.ClientFactory("Profiles");
const InstagramClient = new Instagram.ClientFactory();

async function createError(recordId: string, errorCode: Instagram.ErrorCodes) {
  const errorString = InstagramClient.getErrorString(errorCode);
  const errorFieldData = { "Instagram Errors": errorString };
  return await AirtableClient.updateRecordWithFields(recordId, errorFieldData);
}

(async (): Promise<void> => {
  try {
    await InstagramClient.simulateCompleteSessionCreation();
    const records = await AirtableClient.getRecordsForView("DEV_IG_UPDATE_004_2");
    for (let record of records) {
      const url = record.fields["Instagram Profile"];
      if (url) {
        const username = Instagram.getUsernameFromUrl(url);
        if (username) {
          const followers = await InstagramClient.getFollowerCountForUsername(username);
          if (followers) {
            const date = Common.createDateString();
            await AirtableClient.updateRecordWithFields(record.id, {
              "Instagram Followers": followers,
              "Instagram Last Updated": date
            });
            console.info(username, followers, date);
          } else {
            await createError(record.id, "USERNAME_DOES_NOT_EXIST");
          }
        } else {
            await createError(record.id, "PROFILE_URL_IS_INVALID");
        }
      } else {
        await createError(record.id, "PROFILE_URL_DOES_NOT_EXIST");
      }
    }
  } catch (error) {
    console.error(error);
  }
})();
