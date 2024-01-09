# Instagram Reels Downloader and Uploader

## Pre-requirements

### Setup the environment

1. Node.js >= 18.1.0
2. yarn >= 1.19.0
3. ffmpeg >= 6.0.0
4. yt-dlp latest. At the time of writing this document, the latest version is `2024.01.02`. You can download it from [here](https://github.com/yt-dlp/yt-dlp/releases).

### Setup Instagram for posting reels videos

https://developers.facebook.com/docs/instagram-api/getting-started

This step is required if you want to post the reels videos to your instagram account.
You need create a instagram pageId and get the access token.

1. Create a instagram creator account or business account.
2. Create a facebook page and link it to your instagram account.
3. Create a facebook business app and enable facebook login.
4. Use facebook graph api explorer to get the pageId and access token.
   1. Select your business app. Which you created in step 3.
   2. Select `Get User Access Token`.
   3. Select `pages_show_list`, `instagram_basic`, `instagram_content_publish`, and `publish_video` permissions.
   4. Click `Generate Access Token`. Keep the access token. We will use it later.
   5. Follow this instruction to get the instagram pageId. https://developers.facebook.com/docs/instagram-api/getting-started#4--get-the-user-s-pages. Keep the pageId. We will use it later.
   6. Convert short-lived access token to long-lived access token. https://developers.facebook.com/docs/instagram-api/getting-started#5--convert-the-short-lived-token-to-a-long-lived-token. Keep the long-lived access token. We will use it later.

## How to install

1. Clone this repo to your local.
2. Run `yarn install` to install the dependencies.

## How to use

1. Create `.env` file in the root directory of this repo.
2. Copy the content of `.env.example` to `.env` and fill the values. You can get the values from the pre-requirements section. Instagram access token and pageId are required if you want to post the reels videos to your instagram account.
4. Use chrome to open the instagram and login your account. This will help `yt-dlp` can re-use the cookies to download the private videos.
5. Run `yarn start` to start the script.

## run on Mac OS

If you are using Mac OS, you can quickly run the script by running `./start.sh` command. It will install the dependencies and start the script.


## How to run the script in the background automatically (Optional)

### Linux

1. Run `crontab -e` to edit the cron jobs.
2. Add the following line to the end of the file. Replace the path with your own path.
   ```
   0 */8 * * * cd /path/to/reel_video_bot && yarn start
   ```
3. Save the file and exit.
4. Run `crontab -l` to check the cron jobs.
5. Run `crontab -r` to remove all the cron jobs.
6. Run `crontab -l` to check the cron jobs again. You should see nothing.
7. Run `crontab -e` to edit the cron jobs again.

### Windows

1. Open the Task Scheduler.
2. Click `Create Task` on the right side.
3. Enter the name and description.
4. Click `Triggers` tab and click `New...` button.
5. Select `Daily` and set the time.
6. Click `Actions` tab and click `New...` button.
7. Enter the path of `start.bat` file in the `Program/script` field.
8. Enter the path of the root directory of this repo in the `Start in (optional)` field.
9. Click `OK` button to save the task.
10. Click `OK` button to exit the Task Scheduler.
11. You can find the task in the `Task Scheduler Library` folder.
12. Right click the task and click `Run` to run the task immediately.
13. You can check the task history in the `History` tab.
14. You can check the task log in the `History` tab. Right click the task and click `Properties`. Click `History` tab and double click the log to open the log file.
