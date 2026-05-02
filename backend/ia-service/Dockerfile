FROM node:20

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    && pip3 install vosk --break-system-packages

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

EXPOSE 3003
CMD ["node", "src/server.js"]