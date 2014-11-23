var gulp = require('gulp'),
    livereload = require('gulp-livereload'),
    nodemon = require('gulp-nodemon'),
    uglify = require('gulp-uglify'),
    concat = require('gulp-concat');

gulp.task('minify', function() {
 gulp.src('src/client/stream/*.js')
    .pipe(concat('stream_deps.js'))
    .pipe(gulp.dest('public/js'));

  gulp.src('src/client/*.js')
    //.pipe(uglify())
    .pipe(gulp.dest('public/js'));
});

gulp.task('watch', function() {
  var server = livereload();
  gulp.watch('src/client/**', ['minify']).on('change', function(file) {
      server.changed(file.path);
  });
  //nodemon({script: 'app.js'});
});
