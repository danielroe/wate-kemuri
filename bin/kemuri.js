#!/usr/bin/env node
import * as fs from 'node:fs';
import { j as jsBuilder } from './lib/js.mjs';
import { c as cssBuilder } from './lib/css.mjs';
import { h as htmlBuilder } from './lib/html.mjs';
import { g as getBrowserSyncOption, r as run } from './lib/browser-sync.mjs';
import { c as configLoader, a as console } from './lib/config.mjs';
import yargs from 'yargs';
import chalk from 'chalk';
import 'node:path';
import './lib/base.mjs';
import 'glob';
import 'chokidar';
import 'rimraf';
import 'editorconfig';
import 'rollup';
import '@rollup/plugin-node-resolve';
import '@rollup/plugin-commonjs';
import '@rollup/plugin-typescript';
import '@rollup/plugin-terser';
import 'js-beautify';
import 'sass';
import 'node:url';
import 'js-yaml';
import 'nunjucks';
import 'gray-matter';
import 'lodash';
import 'browser-sync';
import 'cosmiconfig';
import 'node:console';
import 'dotenv';

const argv = yargs(process.argv.slice(2))
    .options({
    w: { type: 'boolean', default: false, alias: 'watch', description: 'watchモード' },
    m: {
        type: 'string',
        choices: ['develop', 'production'],
        default: 'develop',
        alias: 'mode',
        description: 'ビルド処理のモード指定',
    },
    p: { type: 'boolean', alias: ['prod', 'production'], description: '本番モード指定のショートハンド' },
    d: { type: 'boolean', alias: ['dev', 'develop'], description: '開発モード指定のショートハンド' },
    html: { type: 'boolean', description: 'htmlビルダーを利用する' },
    css: { type: 'boolean', description: 'cssビルダーを利用する' },
    js: { type: 'boolean', description: 'jsビルダーを利用する' },
    server: { type: 'boolean', description: 'browserSyncサーバーを起動する' },
    c: { type: 'string', alias: 'config', description: '設定ファイルを指定する' },
    init: { type: 'boolean', description: 'プロジェクトの初期設定を行う' },
    force: { type: 'boolean', default: false, alias: 'f', description: '設定ファイルを強制的に上書きする' },
    configOnly: { type: 'boolean', default: false, description: '設定ファイルのみを出力する' },
})
    .parseSync();
if (argv.init) {
    if (fs.existsSync('.builderrc.yml')) {
        if (argv.force) {
            configLoader.copyDefaultConfig(argv.force);
            console.log(chalk.green('Configuration file(.builderrc.yml) has been overwritten.'));
        }
        else {
            console.warn('Configuration file(.builderrc.yml) already exists.');
        }
    }
    else {
        configLoader.copyDefaultConfig(argv.force);
        console.log(chalk.green('Configuration file(.builderrc.yml) has been generated.'));
    }
    if (argv.configOnly) {
        process.exit(0);
    }
    const createDirectories = [];
    const htmlBuilderOption = configLoader.getHtmlOption();
    //@ts-ignore
    createDirectories.push(htmlBuilderOption.srcDir !== undefined ? htmlBuilderOption.srcDir : 'src');
    //@ts-ignore
    createDirectories.push(htmlBuilderOption.outputDir !== undefined ? htmlBuilderOption.outputDir : 'public');
    const jsBuilderOption = configLoader.getJsOption();
    //@ts-ignore
    createDirectories.push(jsBuilderOption.srcDir !== undefined ? jsBuilderOption.srcDir : 'src');
    //@ts-ignore
    createDirectories.push(jsBuilderOption.outputDir !== undefined ? jsBuilderOption.outputDir : 'public/assets/js');
    const cssBuilderOption = configLoader.getCssOption();
    //@ts-ignore
    createDirectories.push(cssBuilderOption.srcDir !== undefined ? cssBuilderOption.srcDir : 'src');
    //@ts-ignore
    createDirectories.push(cssBuilderOption.outputDir !== undefined ? cssBuilderOption.outputDir : 'public/assets/css');
    const snippetBuilderOption = configLoader.getSnippetOption();
    //@ts-ignore
    createDirectories.push(snippetBuilderOption.srcDir !== undefined ? snippetBuilderOption.srcDir : 'docs/cheatsheet');
    //@ts-ignore
    createDirectories.push(snippetBuilderOption.outputDir !== undefined ? snippetBuilderOption.outputDir : '.vscode');
    const screenshotOption = configLoader.getScreenshotOption();
    //@ts-ignore
    createDirectories.push(screenshotOption.outputDir !== undefined ? screenshotOption.outputDir : 'screenshots');
    createDirectories
        .reduce((unique, item) => {
        return unique.includes(item) ? unique : [...unique, item];
    }, [])
        .sort()
        .forEach((dir) => {
        if (!fs.existsSync(dir)) {
            console.log(chalk.green('Create directory: ' + dir));
            fs.mkdirSync(dir, { recursive: true });
        }
    });
    process.exit(0);
}
let mode = 'develop';
if (argv.mode !== undefined) {
    mode = String(argv.mode);
}
else if (argv.develop !== undefined) {
    mode = 'develop';
}
else if (argv.production !== undefined) {
    mode = 'production';
}
if (argv.config !== undefined) {
    //@ts-ignore
    configLoader.configFile = argv.config;
}
const builders = [];
if (configLoader.isEnable('js') || argv.js) {
    const jsOrverrideOption = {};
    if (argv.sourcemap !== undefined) {
        jsOrverrideOption.sourcemap = true;
    }
    if (argv.minify !== undefined || mode === 'production') {
        jsOrverrideOption.minify = true;
    }
    const jsBuilderOption = configLoader.getJsOption(jsOrverrideOption);
    console.group(chalk.blue('javaScript Builder Option'));
    console.log(jsBuilderOption);
    console.groupEnd();
    jsBuilder.setOption(jsBuilderOption);
    builders.push(jsBuilder);
}
if (configLoader.isEnable('css') || argv.css) {
    const cssOrverrideOption = {};
    if (argv.sourcemap !== undefined) {
        cssOrverrideOption.sourcemap = true;
    }
    if (argv.minify !== undefined || mode === 'production') {
        cssOrverrideOption.style = 'compressed';
    }
    const cssBuilderOption = configLoader.getCssOption(cssOrverrideOption);
    console.group(chalk.blue('CSS Builder Option'));
    console.log(cssBuilderOption);
    console.groupEnd();
    cssBuilder.setOption(cssBuilderOption);
    builders.push(cssBuilder);
}
if (configLoader.isEnable('html') || argv.html) {
    const htmlBuilderOption = configLoader.getHtmlOption();
    console.group(chalk.blue('HTML Builder Option'));
    console.log(htmlBuilderOption);
    console.groupEnd();
    htmlBuilder.setOption(htmlBuilderOption);
    builders.push(htmlBuilder);
}
if (argv.watch) {
    builders.forEach((builder) => {
        builder.watch();
    });
}
else {
    builders.forEach((builder) => {
        builder.build();
    });
}
if (argv.server) {
    const browserSyncOption = getBrowserSyncOption();
    console.group(chalk.blue('browserSync Server Option'));
    console.log(browserSyncOption);
    console.groupEnd();
    run();
}
