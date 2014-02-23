var gulp = require('gulp'),
    livereload = require('gulp-livereload'),
    nodemon = require('gulp-nodemon'),
    uglify = require('gulp-uglify');

gulp.task('minify', function() {
  gulp.src('src/client/*.js')
    //.pipe(uglify())
    .pipe(gulp.dest('public/js'));
});

gulp.task('watch', function() {
  var server = livereload();
  gulp.watch('src/client/*.js', ['minify']).on('change', function(file) {
      server.changed(file.path);
  });
  //nodemon({script: 'app.js'});
});
