FROM python:3.9-alpine
LABEL maintainer="Binh Bui <buthaibinh@gmail.com>"
RUN apk add --update --no-cache --virtual .build-deps gcc musl-dev \
&& pip install --upgrade pip \
&& pip install pycrypto \
&& rm -rf ~/.cache/pip \
&& apk del .build-deps \
&& apk add ffmpeg

# install yt-dlp from download binary file and make it executable
# RUN wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -O /usr/local/bin/yt-dlp
RUN wget https://github.com/yt-dlp/yt-dlp/releases/download/2023.12.30/yt-dlp -O /usr/local/bin/yt-dlp
RUN chmod a+rx /usr/local/bin/yt-dlp

# TODO: update yt-dlp to nightly version
RUN yt-dlp --update-to nightly

WORKDIR /worker

# install nodejs
RUN apk add --update --no-cache nodejs npm

# install yarn for user yt-dlp
RUN npm install --global yarn

# Copy just package.json and package-lock.json
# to speed up the build using Docker layer cache.
COPY package*.json ./

# Install NPM packages, skip optional and development dependencies to
# keep the image small. Avoid logging too much and print the dependency
# tree for debugging
RUN npm --quiet set progress=false \
    && npm install --omit=dev --omit=optional \
    && echo "Installed NPM packages:" \
    && (npm list --omit=dev --all || true) \
    && echo "Node.js version:" \
    && node --version \
    && echo "NPM version:" \
    && npm --version \
    && rm -r ~/.npm

# Copy the rest of the application source code
COPY . .

# Run the image.
CMD npm start --silent
