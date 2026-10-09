# Stage 1: Build the Angular application
FROM node:22-alpine AS build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the application in production mode
RUN npm run build

# L'URL de l'API est figée dans le bundle (environment*.ts). API_URL permet de la
# remplacer au build sans toucher les sources — utilisé par le docker-compose du backend
# pour pointer vers la passerelle locale. Sans argument, le build reste inchangé.
ARG API_URL=https://api-gateway.test.qualisira.com
RUN if [ "$API_URL" != "https://api-gateway.test.qualisira.com" ]; then \
      find /app/dist/qualisira/browser -name '*.js' -type f \
        -exec sed -i "s#https://api-gateway\.test\.qualisira\.com#${API_URL}#g" {} + ; \
    fi

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

# Copy the build output to the Nginx html directory
# Note: Angular 17+ 'application' builder outputs to dist/[project-name]/browser
COPY --from=build /app/dist/qualisira/browser /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
