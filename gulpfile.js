'use strict'

const gulp        = require('gulp'),                       //Сам gulp
      uglify      = require('gulp-uglify'),                //Плагин для минификации js файлов
      pug         = require('gulp-pug'),                   //Плагин для компиляции pug в html
      cssmin      = require('gulp-clean-css'),             //Плагин для минификации css
      sass        = require('gulp-sass'),                  //Плагин для компиляции sass в css
      concat      = require('gulp-concat'),                //Плагин для объединения файлов
      plumber     = require('gulp-plumber'),               //Плагин для продолжения работы gulp, если вызвана ошибка
      rimraf      = require('rimraf'),                     //Модуль удаления директорий
      cache       = require('gulp-cache'),                 //Модуль для работы с кешом
      mmq         = require('gulp-merge-media-queries'),   //Плагин для обхединения media-queries
      prefix      = require('gulp-autoprefixer'),          //Плагин для автоматической расстановки вендорных префиксов
      rename      = require('gulp-rename'),                //Плагин для переименовывания файлов
      imagemin    = require('gulp-imagemin'),              //Плагин для скижитя графики
      eslint      = require('gulp-eslint'),                //Плагин для линтинга js-кода
      browserSync = require('browser-sync').create(),      //Плагин для запуска локального сервера
      notify      = require('gulp-notify'),                //Плагин для оповещения об ошибках
      importFile  = require('gulp-file-include');          //Плагин для импорта файлов

var paths = {
  devDir: 'app/',          //Путь где производится разработка
  outputDir: 'dist/'       //Путь для конечной сборки
}

/********************
      Dev Tasks      
********************/

//Компиляция pug в html
gulp.task('pug', function() {
  return gulp.src(paths.devDir + 'pug/page/*.pug')
    .pipe(plumber({
      errorHandler: notify.onError(function(err) {
        return {
          title: 'Pug',
          message: err.message
        };
      })
    }))
    .pipe(pug({
      pretty: true
    }))
    .pipe(gulp.dest(paths.devDir))
    .pipe(browserSync.stream());
});

//Компиляция sass в css
gulp.task('sass', function() {
  return gulp.src(paths.devDir + 'sass/main.sass')
    .pipe(plumber({
      errorHandler: notify.onError(function(err) {
        return {
          title: 'Sass',
          message: err.message
        };
      })
    }))
    .pipe(sass())
    .pipe(prefix({
      browsers: ['last 10 versions']
    }))
    .pipe(gulp.dest(paths.devDir + 'css/'))
    .pipe(browserSync.stream());
})

//Минификация css после компиляции sass
gulp.task('css', ['sass'], function() {
  return gulp.src(paths.devDir + 'css/main.css')
    .pipe(mmq())
    .pipe(cssmin())
    .pipe(rename({
        suffix: '.min'
    }))
    .pipe(gulp.dest(paths.devDir + 'css'))
    .pipe(browserSync.stream());
});

//Подключение, конкатинация и минификация JS библиотек из директирии 'app/libs/', установленных bower'ом
gulp.task('scripts', function() {
  return gulp.src(paths.devDir + 'js/libs.js')   // файл, в который нужно импортировать JS библиотеки
    .pipe(importFile({
        prefix: '@@',
        basepath: '@file'
    }))
    .pipe(uglify())
    .pipe(rename({
        suffix: '.min'
    }))
    .pipe(gulp.dest(paths.devDir + 'js'));
});

//Линтинг JS-кода
gulp.task('eslint', function() {
    return gulp.src([paths.devDir + 'js/*.js', '!' + paths.devDir + 'js/*.min.js', '!' + paths.devDir + 'js/libs.js'])
    .pipe(plumber({
      errorHandler: notify.onError(function(err) {
        return {
          title: 'Js',
          message: err.message
        };
      })
    }))
    .pipe(eslint({
        fix: true,
        rules: {
            'no-undef': 0       //делаем так, чтобы ESLint не ругался на непоределённые переменные (в т.ч. глобальные, библиотек)
        },
        globals: ['$']          //определяем глобальные переменные (самое распространённое - jQuery)
    }))
    .pipe(eslint.format());
});

//Минификация кастомных скриптов JS
gulp.task('js:min', ['eslint'], function() {
  return gulp.src([paths.devDir + 'js/*.js', '!' + paths.devDir + 'js/*.min.js', '!' + paths.devDir + 'js/libs.js'])
    .pipe(uglify())
    .pipe(rename({
        suffix: '.min'
    }))
    .pipe(gulp.dest(paths.devDir + 'js'))
    .pipe(browserSync.stream());
});

//Запуск локального сервера из директории 'app'
gulp.task('browser-sync', function() {
  browserSync.init({
    server: {
      baseDir: paths.devDir
    }
  })
});

//Слежение за изменениями в файлах и перезагрузка страницы
gulp.task('default', ['css', 'pug', 'scripts', 'js:min', 'browser-sync'], function() {
  gulp.watch(paths.devDir + 'pug/**/*.pug', ['pug']);
  gulp.watch(paths.devDir + 'sass/**/*.sass', function(event, cb) {
    setTimeout(function(){gulp.start('css');}, 100)
  });
  gulp.watch([paths.devDir + 'js/*.js', '!'+ paths.devDir +'js/*.min.js'], ['js:min']);
  gulp.watch(paths.devDir + '*.html', browserSync.reload);
});

/********************
     Prod Tasks      
********************/

//Оптимизируем изображения и кидаем их в кэш
gulp.task('img', function() {
  return gulp.src(paths.devDir + 'img/**/*')
    .pipe(cache(imagemin([imagemin.gifsicle(), imagemin.jpegtran(), imagemin.optipng()])))
    .pipe(gulp.dest(paths.outputDir + 'img'));
});

//Очистка папки конечной сборки
gulp.task('clean', function(cb) {
  rimraf(paths.outputDir, cb);
});

//Чистим кэш
gulp.task('clear', function() {
    return cache.clearAll();
});

//Собираем наш проект в директорию dist
gulp.task('build', ['clean', 'img', 'css', 'pug', 'scripts', 'js:min', 'eslint'], function() {

    //Собираем CSS
    var buildCss = gulp.src(paths.devDir + 'css/main.min.css')
    .pipe(gulp.dest(paths.outputDir + 'css'));

    //Собираем шрифты
    var buildFonts = gulp.src(paths.devDir + 'fonts/**/*')
    .pipe(gulp.dest(paths.outputDir + 'fonts'));

    //Собираем JS
    var buildJs = gulp.src(paths.devDir + 'js/*.min.js')
    .pipe(gulp.dest(paths.outputDir + 'js'));

    //Собираем HTML
    var buildHtml = gulp.src(paths.devDir + '*.html')
    .pipe(gulp.dest(paths.outputDir));
});