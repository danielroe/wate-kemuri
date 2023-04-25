#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

//Sassファイルのディレクトリ
let srcDir = process.cwd();
//インデックスファイル名
let indexFileName = '_index.scss';
//抽出対象ファイルの拡張子
let fileExtensions = ['scss', 'sass'];
//抽出対象のファイル名パターン(接頭語)
let includePrefix = '_';
//抽出樹外対象のファイル名パターン(接尾語)
let excludeSuffix = '-bk';
//メイン出力ファイル名
let mainFileName = null;
//CSS出力先ディレクトリ
let destDir = null;

/**
 * ターゲットディレクトリの設定およびチェック
 */
if (process.env.BUILD_CSS_TARGET_DIR) {
  const realPath = path.resolve(process.cwd(), process.env.BUILD_CSS_TARGET_DIR);
  if (!realPath.startsWith(process.cwd())) {
    //作業ディレクトリ以下のディレクトリではなかった場合はエラー扱いで終了
    throw new Exception('対象ディレクトリの指定が不正です');
  }
  targetDir = realPath;
}

/**
 * 生成したインデックスファイルの一覧
 */
const generatedIndexFiles = [];

/**
 * 正規表現文字をクオートする
 *
 * @param {String} str 正規表現文字列
 * @param {String} delimiter デリミタ文字列
 * @return {String}
 */
function regexpQuote(regexpStr, delimiter) {
  const metaChars = ['$', '^', '*', '\\', '/', '.', '[', ']', '|', '?', '+', '{', '}', '(', ')'];
  delimiter = delimiter || '/';
  const escapedChars = metaChars.map(function (char) {
    return '\\' + char;
  }).join('');
  return regexpStr.replace(new RegExp('[' + escapedChars + ']', 'g'), '\\$&');
}

/**
 * インデックスファイルの生成処理
 *
 * @param {string} scanTargetDir 対象ディレクトリ
 * @param {Object} findFileOption 抽出条件
 * @returns {Array}
 */
function generateIndexFile(scanTargetDir, findFileOption = {}) {
  const includePrefix = findFileOption.includePrefix || '_';
  const excludeSuffix = findFileOption.excludeSuffix || '-bk';
  const indexName = findFileOption.indexName || '_index.scss';
  let allowExts = findFileOption.allowExts || ['scss', 'sass'];
  allowExts = allowExts.map((ext) => ext.toLowerCase());
  //対象ディレクトリのファイルの一覧を抽出
  const allItems = fs.readdirSync(scanTargetDir);
  //インデックス対象ファイルの一覧
  const indexTargetFiles = [];
  allItems.forEach(item => {
    const fullPath = path.join(scanTargetDir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      generateIndexFile(fullPath, findFileOption);
    } else if (fs.statSync(fullPath).isFile()) {
      const fileName = path.basename(item, path.extname(item));
      const fileExt = path.extname(item).toLowerCase().slice(1);
      const includeRegExp = new RegExp('^' + regexpQuote(includePrefix));
      const excludeRegExp = new RegExp(regexpQuote(excludeSuffix) + '$');
      if (
        //インデックファイルではない
        path.basename(item) !== indexName
        &&
        //ファイルの拡張子が抽出対象の拡張子に一致する
        allowExts.includes(fileExt)
        &&
        //ファイル名が抽出対象パターンに一致する
        fileName.match(includeRegExp)
        &&
        //ファイル名が抽出除外対象パターンに一致しない
        !fileName.match(excludeRegExp)
      ) {
        indexTargetFiles.push(item);
      }
    }
  });
  if (indexTargetFiles.length > 0) {
    const indexFileContents = indexTargetFiles.map((item) => {
      /**
       * @todo ファイルからメタ情報を抽出してインデックスファイルに付与する
       */
      return '@forward "' + item + '";';
    });
    const indexFilePath = path.join(scanTargetDir, indexName);
    //先頭に編集不可の注記を記載
    indexFileContents.unshift('// ===============================');
    indexFileContents.unshift('// Auto generated by ' + path.basename(__filename));
    indexFileContents.unshift('// Do not edit this file!');
    indexFileContents.unshift('// ===============================');
    fs.writeFileSync(indexFilePath, indexFileContents.join("\n"));

    indexFileContents.join("\n");
    //インデックスファイル
    generatedIndexFiles.push(indexFilePath);
  }
}
//インデックスファイル生成オプション
findFileOption = {
  'indexName': indexFileName,
  'allowExts': fileExtensions,
  'includePrefix': includePrefix,
  'excludeSuffix': excludeSuffix
}
//インデックスファイルの生成処理を実行
generateIndexFile(srcDir, findFileOption);

//メインファイルを生成
if (mainFileName && generatedIndexFiles.length > 0) {
  const mainFileContents = generatedIndexFiles.map((indexFile) => {
    return '@forward "' + path.relative(targetDir, indexFile) + '";';
  });
  //先頭に編集不可の注記を記載
  mainFileContents.unshift('// ===============================');
  mainFileContents.unshift('// Auto generated by ' + path.basename(__filename));
  mainFileContents.unshift('// Do not edit this file!');
  mainFileContents.unshift('// ===============================');
  fs.writeFileSync(path.join(targetDir, mainFileName), mainFileContents.join("\n"));
}
/**
 * @todo Sassファイルのコンパイル処理
 */
