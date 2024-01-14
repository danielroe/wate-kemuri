イレギュラー系テストケース
=====================

変則的なテストケースを記述する

test-no-lang
---------------------

コードブロックに言語指定がない

```
言語指定がないグローバルなコードブロック(test-no-lang)
```

### 想定値

* `test-no-lang`というスニペットが出力される
    * `body`にソースコードブロックの内容が設定されている
    * `prefix`に`test-no-lang`が設定されている
    * `scope`が出力されていない
        * すべての言語で利用できるスニペットとして出力される
    * `description`に`ソースコードブロックに言語指定がない`出力されていない

test-lang-global
---------------------

コードブロックの言語指定にglobalが設定されている

```global
言語指定がないグローバルなコードブロック(test-lang-global)
```

### 想定値

* `test-lang-global`というスニペットが出力される
    * `body`にソースコードブロックの内容が設定されている
    * `prefix`に`test-lang-global`が設定されている
    * `scope`が出力されていない
        * すべての言語で利用できるスニペットとして出力される
    * `description`に`コードブロックの言語指定にglobalが設定されている`出力されていない