"use strict";
let gulp = require('gulp'),
    exec = require('gulp-exec'),
    cp_exec = require('child_process').exec;

gulp.task('jekyll', (cb) => {
    cp_exec('jekyll build', (err) => {
        cb(err);
    });
});

gulp.task('webp-png', ['png-crush'], () => {
    return gulp.src('./_site/images/**/*.png')
            .pipe(exec('cwebp -lossless "<%= file.path %>" -o "<%= file.path %>.webp"'));
});

gulp.task('webp-jpeg', ['exif-tool'], () => {
    const quality = 80;
    return gulp.src(['./_site/images/**/*.jpg', './_site/images/**/*.jpeg'])
            .pipe(exec(`cwebp -q ${quality} "<%= file.path %>" -o "<%= file.path %>.webp"`));
});

gulp.task('exif-tool', ['jekyll'], (cb) => {
    cp_exec('exiftool -overwrite_original -r -all= ./_site/images/', (err) => {
        cb(err);
    });
});

gulp.task('png-crush', ['exif-tool'], () => {
    return gulp.src('./_site/images/**/*.png')
            .pipe(exec('pngcrush -ow "<%= file.path %>"'));
});

gulp.task('gzip', ['jekyll'], () => {
    return gulp.src(['./_site/**/*.html', './_site/**/*.css', './_site/**/*.xml', './_site/robots.txt'])
            .pipe(exec('gzip --keep -9 "<%= file.path %>"'));
});

gulp.task('brotli', ['jekyll'], () => {
    return gulp.src(['./_site/**/*.html', './_site/**/*.css', './_site/**/*.xml', './_site/robots.txt'])
            .pipe(exec('cat "<%= file.path %>" | /usr/local/bin/bro --quality 11 > "<%= file.path %>.br"'));
});

gulp.task('default', ['jekyll', 'webp-png', 'webp-jpeg', 'png-crush', 'gzip', 'brotli', 'exif-tool'], () => {});