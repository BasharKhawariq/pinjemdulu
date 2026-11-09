FROM php:8.2-apache
# 1. Install ekstensi sistem yang dibutuhkan untuk PostgreSQL & File Upload
RUN apt-get update && apt-get install -y \
    libpq-dev \
    libpng-dev \
    libzip-dev \
    && docker-php-ext-install pdo pdo_pgsql fileinfo \
    && apt-get clean && rm -rf /var/lib/apt/lists/*
# 2. Aktifkan mod_rewrite Apache
RUN a2enmod rewrite
# 3. Ubah DocumentRoot Apache agar mengarah ke folder public/
ENV APACHE_DOCUMENT_ROOT /var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf
RUN sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf
# 4. Beri izin AllowOverride All agar .htaccess di folder public/ aktif
RUN echo '<Directory /var/www/html/public>\n\
    Options -Indexes +FollowSymLinks\n\
    AllowOverride All\n\
    Require all granted\n\
</Directory>' > /etc/apache2/conf-available/override.conf \
    && a2enconf override
# 5. Salin kode aplikasi ke dalam container
WORKDIR /var/www/html
COPY . /var/www/html
# 6. Pastikan permission folder storage bisa ditulis
RUN chown -R www-data:www-data /var/www/html/storage \
    && chmod -R 775 /var/www/html/storage
# 7. Expose port 80
EXPOSE 80
# 8. Script startup: sesuaikan port jika Render menyuntikkan variabel $PORT dinamis
CMD ["sh", "-c", "sed -i \"s/Listen 80/Listen ${PORT:-80}/g\" /etc/apache2/ports.conf && sed -i \"s/:80/:${PORT:-80}/g\" /etc/apache2/sites-available/*.conf && apache2-foreground"]