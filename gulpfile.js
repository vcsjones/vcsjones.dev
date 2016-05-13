"use strict";
let gulp = require('gulp'),
    exec = require('gulp-exec');

gulp.task('webp-png', () => {
    gulp.src('./images/**/*.png')
    .pipe(exec('cwebp -lossless "<%= file.path %>" -o "<%= file.path %>.webp"'));
});

gulp.task('webp-jpeg', () => {
    const quality = 80;
    gulp.src(['./images/**/*.jpg', './images/**/*.jpeg'])
    .pipe(exec(`cwebp -q ${quality} "<%= file.path %>" -o "<%= file.path %>.webp"`));
});

gulp.task('default', ['webp-png', 'webp-jpeg'], () => {});