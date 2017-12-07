#!/usr/bin/env node

var fs = require('fs'),
    path = require('path'),
    UglifyJS = require('uglify-js'),
    CleanCSS = require('clean-css'),
    imagemin = require('imagemin'),
    imageminSvgo = require('imagemin-svgo'),
    imageminJpegtran = require('imagemin-jpegtran'),
    imageminGifsicle = require('imagemin-gifsicle'),
    imageminOptipng = require('imagemin-optipng'),
    htmlMinify = require('html-minifier').minify,
    cssOptions = {
        keepSpecialComments: 0
    },
    cssMinifier = new CleanCSS(cssOptions),

    rootDir = process.argv[2],
    platformPath = path.join(rootDir, 'platforms'),
    platform = process.env.CORDOVA_PLATFORMS,
    cliCommand = process.env.CORDOVA_CMDLINE,

    debug = false,

    htmlOptions = {
        removeAttributeQuotes: true,
        removeComments: true,
        minifyJS: true,
        minifyCSS: cssOptions,
        collapseWhitespace: true,
        conservativeCollapse: true,
        removeComments: true,
        removeEmptyAttributes: true
    },

    successCounter = 0,
    errorCounter = 0,
    notProcessedCounter = 0,
    pendingCounter = 0,

    hasStartedProcessing = false,
    processRoot = true,
    isRelease = true;
    // isRelease = (cliCommand.indexOf('--release') > -1); // comment the above line and uncomment this line to turn the hook on only for release

if (!isRelease) {
    return;
}

console.log('cordova-minify STARTING - minifying your js, css, html, and images. Sit back and relax!');

function processFiles(dir, _noRecursive) {
    fs.readdir(dir, function (err, list) {
        if (err) {
            // console.error('processFiles - reading directories error: ' + err);
            return;
        }
        list.forEach(function(file) {
            file = path.join(dir, file);
            fs.stat(file, function(err, stat) {
                hasStartedProcessing = true;
                if (stat.isDirectory()) {
                    if (!_noRecursive) processFiles(file);
                } else {
                    compress(file, dir);
                }
            });
        });
    });
}

function compress(file, dir) {
    var ext = path.extname(file);
    switch(ext.toLowerCase()) {
        case '.js':
            (debug) && console.log('Compressing/Uglifying JS File: ' + file);
            var result = UglifyJS.minify(file, {
                compress: {
                    dead_code: true,
                    loops: true,
                    if_return: true,
                    keep_fargs: true,
                    keep_fnames: true
                }
            });
            if (!result || !result.code || result.code.length == 0) {
                errorCounter++;
                console.error('\x1b[31mEncountered an error minifying a file: %s\x1b[0m', file);
            }
            else {
                successCounter++;
                fs.writeFileSync(file, result.code, 'utf8');
                (debug) && console.log('Optimized: ' + file);
            }
            break;
        case '.css':
            (debug) && console.log('Minifying CSS File: ' + file);
            var source = fs.readFileSync(file, 'utf8');
            if (!source || source.length == 0) {
                errorCounter++;
                console.error('Encountered an empty file: ' + file);
            }
            else {
                var result = cssMinifier.minify(source).styles;
                if (!result || result.length == 0) {
                    errorCounter++;
                    console.error('\x1b[31mEncountered an error minifying a file: %s\x1b[0m', file);
                }
                else {
                    successCounter++;
                    fs.writeFileSync(file, result, 'utf8');
                    (debug) && console.log('Optimized: ' + file);
                }
            }
            break;
        // Image options https://github.com/imagemin/imagemin
        case '.svg':
            (debug) && console.log('Minifying SVG File: ' + file);
            pendingCounter++;
            // svgGo options https://www.npmjs.com/package/imagemin-svgo#options
            imagemin([file], dir, {use: [imageminSvgo()]}).then((files) => {
                if (!files || files.length == 0) {
                    errorCounter++;
                    console.error('\x1b[31mEncountered an error minifying a file: %s\x1b[0m', file);
                }
                else {
                    (debug) && console.log('Optimized: ' + file);
                }
                pendingCounter--;
            });
            successCounter++;
            break;
        case '.gif':
            (debug) && console.log('Minifying GIF File: ' + file);
            pendingCounter++;
            // GifSicle options https://www.npmjs.com/package/imagemin-gifsicle#options
            imagemin([file], dir, {use: [imageminGifsicle({interlaced: true})]}).then((files) => {
                if (!files || files.length == 0) {
                    errorCounter++;
                    console.error('\x1b[31mEncountered an error minifying a file: %s\x1b[0m', file);
                }
                else {
                    (debug) && console.log('Optimized: ' + file);
                }
                pendingCounter--;
            });
            successCounter++;
            break;
        case '.png':
            (debug) && console.log('Minifying PNG File: ' + file);
            pendingCounter++;
            // OptiPNG options https://www.npmjs.com/package/imagemin-optipng#options
            imagemin([file], dir, {use: [imageminOptipng({optimizationLevel: 2})]}).then((files) => {
                if (!files || files.length == 0) {
                    errorCounter++;
                    console.error('\x1b[31mEncountered an error minifying a file: %s\x1b[0m', file);
                }
                else {
                    (debug) && console.log('Optimized: ' + file);
                }
                pendingCounter--;
            });
            successCounter++;
            break;
        case '.jpg':
        case '.jpeg':
            (debug) && console.log('Minifying JPEG File: ' + file);
            pendingCounter++;
            // jpegTran options https://www.npmjs.com/package/imagemin-jpegtran#options
            imagemin([file], dir, {use: [imageminJpegtran({progressive: true})]}).then((files) => {
                pendingCounter--;
                (debug) && console.log('Optimized: ' + file);
            });
            successCounter++;
            break;
        case '.html':
            (debug) && console.log('Minifying HTML File: ' + file);
            var source = fs.readFileSync(file, 'utf8');
            if (!source || source.length == 0) {
                errorCounter++;
                console.error('Encountered an empty file: ' + file);
            }
            else {
                var result = htmlMinify(source, htmlOptions);
                if (!result || result.length == 0) {
                    errorCounter++;
                    console.error('\x1b[31mEncountered an error minifying a file: %s\x1b[0m', file);
                }
                else {
                    successCounter++;
                    fs.writeFileSync(file, result, 'utf8');
                    (debug) && console.log('Optimized: ' + file);
                }
            }
            break;
        default:
            console.error('Encountered file with ' + ext + ' extension - not compressing.');
            notProcessedCounter++;
            break;
    }
}

function checkIfFinished() {
    if (hasStartedProcessing && pendingCounter == 0) console.log('\x1b[36m%s %s %s\x1b[0m', successCounter + (successCounter == 1 ? ' file ' : ' files ') + 'minified.', errorCounter + (errorCounter == 1 ? ' file ' : ' files ') + 'had errors.', notProcessedCounter + (notProcessedCounter == 1 ? ' file was ' : ' files were ') + 'not processed.');
    else setTimeout(checkIfFinished, 10);
}


switch (platform) {
    case 'android':
        platformPath = path.join(platformPath, platform, "app", "src", "main", "assets", "www");
        break;
    case 'ios':
        platformPath = path.join(platformPath, platform, "www");
        break;
    default:
        console.error('Hook currently supports only Android and iOS');
        return;
}

var foldersToProcess = ['javascript', 'style', 'media', 'js', 'img', 'css', 'html'];

if (processRoot) processFiles(platformPath, true);

foldersToProcess.forEach(function(folder) {
    processFiles(path.join(platformPath, folder));
});

checkIfFinished();
