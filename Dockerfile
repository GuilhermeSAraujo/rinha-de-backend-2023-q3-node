FROM node:20.5.1-buster
ENV NODE_ENV=production
# Create app directory
WORKDIR /usr/src/app
# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./
RUN npm install --production
# If you are building your code for production
# RUN npm ci --omit=dev
COPY . .
EXPOSE 8080
CMD [ "node", "index.js" ]