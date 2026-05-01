FROM php:8.3-fpm-alpine

RUN apk add --no-cache \
    postgresql-dev \
    icu-dev \
    libzip-dev \
    zip \
    unzip \
    git \
    oniguruma-dev \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev

RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
    intl \
    pdo_pgsql \
    zip \
    bcmath \
    gd

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

EXPOSE 9000
CMD ["php-fpm"]
