FROM node:22-slim
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install
COPY . .

COPY entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["entrypoint.sh"]

CMD [ "node", "server.js" ]