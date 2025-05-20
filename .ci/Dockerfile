FROM nginx:stable-alpine-slim
EXPOSE 80

COPY dist /usr/share/nginx/html/
COPY .ci/nginx.conf /etc/nginx/conf.d/default.conf
