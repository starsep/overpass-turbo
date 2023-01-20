FROM node:18

COPY package.json yarn.lock ./
RUN yarn install
COPY . .
RUN yarn run build
EXPOSE 4173
CMD yarn run preview
