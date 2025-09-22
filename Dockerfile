# Use official Playwright image with all deps
FROM mcr.microsoft.com/playwright:v1.55.0-jammy

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev && npx playwright install --with-deps

COPY . .

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV BROWSER_MODE=headless

EXPOSE 3000

CMD ["npm", "run", "start"]
