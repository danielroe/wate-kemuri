#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const sass = require('sass');
require('dotenv').config();

//Sassファイルのディレクトリ
let srcDir = 'scss';
//CSS出力先ディレクトリ
const distDir = process.env.OUTPUT_CSS_DIR || 'css';
//マスターSassファイル名
const mainFileName = process.env.SCSS_MAIN_FILE || 'style.scss';

/**
 * ターゲットディレクトリの設定およびチェック
 */
if (process.env.SOURCE_SCSS_DIR) {
  const realPath = path.resolve(process.cwd(), process.env.SOURCE_SCSS_DIR);
  if (!realPath.startsWith(process.cwd())) {
    //作業ディレクトリ以下のディレクトリではなかった場合はエラー扱いで終了
    throw new Exception('対象ディレクトリの指定が不正です');
  }
  srcDir = realPath;
}
//インデックスファイル名
const indexFileName = process.env.SCSS_INDEX_FILE_NAME || '_index.scss';
//抽出対象ファイルの拡張子
let fileExtensions = ['scss', 'sass'];
if (process.env.SCSS_FILE_EXTENSIONS) {
  fileExtensions = process.env.SCSS_FILE_EXTENSIONS.toLowerCase().split(',');
}
//ファイル名の抽出パターン(接頭語)
const includeFilePrefix = process.env.SCSS_INCLUDE_FILE_PREFIX || '_';
//ファイル名の除外パターン(接尾語)
const excludeFileSuffix = process.env.SCSS_EXCLUDE_FILE_SUFFIX || '-bk';
//インデックスファイル用コメントタグ
const indexCommentTag = process.env.SCSS_INDEX_COMMENT_TAG || '@package';
//インデックスファイルのコメント継承
// const inheritIndexComment = false;

/**
 * 正規表現文字をクオートする
 *
 * @param {String} str 正規表現文字列
 * @return {String}
 */
function regexpQuote(regexpStr) {
  const metaChars = ['$', '^', '*', '\\', '/', '.', '[', ']', '|', '?', '+', '{', '}', '(', ')'];
  const escapedChars = metaChars.map((char) => '\\' + char).join('');
  return regexpStr.replace(new RegExp('[' + escapedChars + ']', 'g'), '\\$&');
}

/**
 * 生成するインデックスファイルの情報
 */
const generateIndexFiles = {};

/**
 * インデックスファイルの生成処理
 *
 * @param {string} scanTargetDir 対象ディレクトリ
 * @param {Object} findFileOption 抽出条件
 * @returns {Array}
 */
function findPartialFiles(scanTargetDir, findFileOption = {}) {
  const includeFilePrefix = findFileOption.includeFilePrefix || '_';
  const excludeFileSuffix = findFileOption.excludeFileSuffix || '-bk';
  const indexName = findFileOption.indexName || '_index.scss';
  let allowExts = findFileOption.allowExts || ['scss', 'sass'];
  allowExts = allowExts.map((ext) => ext.toLowerCase());

  //インデックスファイルのパス
  const indexPath = path.join(scanTargetDir, indexName);
  if (!generateIndexFiles[indexPath]) {
    generateIndexFiles[indexPath] = [];
  }
  //抽出ファイル名パターン
  const includeFilePattern = new RegExp('^' + regexpQuote(includeFilePrefix));
  //除外ファイル名パターン
  const excludeFilePattern = new RegExp(regexpQuote(excludeFileSuffix) + '$');
  //インデックスファイル用コメントタグパターン
  const indexCommentTagPattern = '^' + regexpQuote('//') + '\\s+' + regexpQuote(indexCommentTag) + '\\s+(.+)';
  //対象ディレクトリのファイルの一覧を抽出
  const allItems = fs.readdirSync(scanTargetDir);
  allItems.forEach(item => {
    const fullPath = path.join(scanTargetDir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      /**
       * @todo ディレクトリを除外できるようにする
       */
      findPartialFiles(fullPath, findFileOption);
      const childDirIndexPath = fullPath + path.sep + indexName;
      const childDirIndexName = item + path.sep + indexName;
      if (
        generateIndexFiles[childDirIndexPath].length > 0
        &&
        !generateIndexFiles[indexPath].includes(childDirIndexName)
      ) {
        let indexComments = [];
        // if (inheritIndexComment) {
        //   const inheritIndexComments = generateIndexFiles[childDirIndexPath]
        //     .forEach(comments => {
        //       if (comments && comments.length) {
        //         indexComments.push(comments);
        //       }
        //     })
        // }
        const indexFileEntry = {
          comments: indexComments,
          file: childDirIndexName
        };
        generateIndexFiles[indexPath].unshift(indexFileEntry);
      }
    } else if (fs.statSync(fullPath).isFile()) {
      const fileName = path.basename(item, path.extname(item));
      const fileExt = path.extname(item).toLowerCase().slice(1);
      if (
        //インデックファイルではない
        path.basename(item) !== indexName
        &&
        //ファイルの拡張子が抽出対象の拡張子に一致する
        allowExts.includes(fileExt)
        &&
        //ファイル名が抽出パターンに一致する
        fileName.match(includeFilePattern)
        &&
        //ファイル名が除外パターンに一致しない
        !fileName.match(excludeFilePattern)
      ) {
        //アノテーションの抽出
        const indexCommentMatch = fs.readFileSync(fullPath)
          .toString()
          .match(new RegExp(indexCommentTagPattern, 'm'));
        const indexFileEntry = {
          file: item,
          comments: indexCommentMatch ? [indexCommentMatch[1]] : null,
        };
        generateIndexFiles[indexPath].push(indexFileEntry)
      }
    }
  });
}
/**
 * インデックスファイルの生成処理
 *
 * @param {String} indexFilePath
 * @param {Array} forwardFiles
 */
function generateIndex(indexFilePath, forwardFiles = []) {
  const indexFileContents = forwardFiles.map(item => {
    let indexEntryString = '';
    if (item.comments && item.comments.length) {
      indexEntryString += item.comments
        .map(comment => '// ' + indexCommentTag + ' ' + comment)
        .join("\n");
      indexEntryString += "\n"
    }
    indexEntryString += '@forward "' + item.file + '";'
    return indexEntryString;
  });
  let indexFileContent = "// ===============================\n";
  indexFileContent += "// Auto generated by " + path.basename(__filename) + "\n";
  indexFileContent += "// Do not edit this file!\n";
  indexFileContent += "// ===============================\n\n";
  indexFileContent += indexFileContents.join("\n\n");
  fs.writeFileSync(indexFilePath, indexFileContent);
}

/**
 * 対象ディレクトリの再起スキャンし、
 * 生成するインデックスファイルの情報を生成
 */
//インデックスファイル生成オプション
findFileOption = {
  indexName: indexFileName,
  allowExts: fileExtensions,
  includeFilePrefix: includeFilePrefix,
  excludeFileSuffix: excludeFileSuffix
}
findPartialFiles(srcDir, findFileOption);

/**
 * メインファイルに記載する内容を専用の変数に格納し、
 * ルートディレクトリ直下のインデックスファイルのエントリーを削除
 */
const mainFileEntries = generateIndexFiles[path.join(srcDir, indexFileName)]
delete generateIndexFiles[path.join(srcDir, indexFileName)];

/**
 * 各ディレクトリにインデックスファイルを生成、
 * または、不要なインデックスファイルの削除
 */
Object.keys(generateIndexFiles).forEach((indexFilePath) => {
  if (generateIndexFiles[indexFilePath].length > 0) {
    //インデックスファイルの生成
    generateIndex(indexFilePath, generateIndexFiles[indexFilePath]);
  } else {
    if (fs.existsSync(indexFilePath)) {
      fs.unlinkSync(indexFilePath);
    }
    delete generateIndexFiles[indexFilePath];
  }
});
//メインファイルを生成
if (mainFileName && mainFileEntries.length > 0) {
  generateIndex(path.join(srcDir, mainFileName), mainFileEntries);
}
/**
 * @todo Sassのコンパイル
 */
const sassLoadPaths = [
  srcDir,
  process.cwd() + path.sep + 'node_modules'
];
let sassCompileOption = {
  loadPaths: sassLoadPaths,
  style: 'expanded',
  sourceMap: true,
  charset: true,
};
const isProduction = process.argv.slice(2).includes('--production');
if (isProduction) {
  sassCompileOption = {
    loadPaths: sassLoadPaths,
    style: 'compressed',
    sourceMap: false,
  };
}
// const result = sass.compile("style.scss", sassCompileOption);
// console.log(result.css);
