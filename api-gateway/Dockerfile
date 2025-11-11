FROM node:20

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE 7070

CMD ["node", "dist/index.js"]

